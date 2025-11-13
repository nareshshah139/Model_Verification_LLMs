import { prisma } from "./prisma";
import { compareFacts } from "./rules";
import type { CodeFacts, CardFacts } from "@shared/index";
import { generateText } from "ai";
import { runLLMAnalysisWithAstGrep } from "./llm-analysis";
import { getLLMModel } from "./llm-config";
import os from "os";
import path from "path";
import fs from "fs/promises";
import simpleGit from "simple-git";

/**
 * Run analysis with both rule-based and LLM-based (with ast-grep tools) detection.
 */
export async function runAnalysisAndPersist(
  modelVersionId: string,
  modelCardId: string,
  options?: { useAstGrep?: boolean }
) {
  const codeExtraction = await prisma.extraction.findFirst({
    where: { modelVersionId, subject: "code" },
    orderBy: { createdAt: "desc" },
  });
  const cardExtraction = await prisma.extraction.findFirst({
    where: { modelCardId, subject: "card" },
    orderBy: { createdAt: "desc" },
  });
  const codeFacts = (codeExtraction?.facts ?? {}) as CodeFacts;
  const cardFacts = (cardExtraction?.facts ?? {}) as CardFacts;

  // Get model version and model info for repo URL
  const version = await prisma.modelVersion.findUnique({
    where: { id: modelVersionId },
    include: { model: true },
  });

  const ruleFindings = compareFacts(codeFacts, cardFacts);

  let llmFindings: any[] = [];
  let llmReport: any = null;

  // Use LLM with ast-grep tools if enabled and repo URL is available
  if (options?.useAstGrep && version?.model?.repoUrl) {
    try {
      // Clone repo temporarily for ast-grep analysis
      const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "astgrep-analysis-"));
      const git = simpleGit();
      await git.clone(version.model.repoUrl, workdir, [
        "--depth",
        "1",
        "--branch",
        version.model.defaultBranch || "main",
      ]);

      const result = await runLLMAnalysisWithAstGrep(
        modelVersionId,
        modelCardId,
        workdir,
        codeFacts,
        cardFacts
      );

      llmFindings = result.discrepancies;
      llmReport = result.report;

      // Cleanup temp directory
      await fs.rm(workdir, { recursive: true, force: true });
    } catch (error) {
      console.error("Error running LLM analysis with ast-grep:", error);
      // Fallback to basic LLM analysis
      const model = getLLMModel();
      const { text } = await generateText({
        model,
        system: "You are a strict discrepancy detector for trading models.",
        prompt: JSON.stringify({ codeFacts, cardFacts, ruleFindings }),
      });

      try {
        llmFindings = JSON.parse(text);
      } catch {
        llmFindings = [];
      }
    }
  } else {
    // Basic LLM analysis without ast-grep tools
    const model = getLLMModel();
    const { text } = await generateText({
      model,
      system: "You are a strict discrepancy detector for trading models.",
      prompt: JSON.stringify({ codeFacts, cardFacts, ruleFindings }),
    });

    try {
      llmFindings = JSON.parse(text);
    } catch {
      llmFindings = [];
    }
  }

  // persist
  if (ruleFindings.length) {
    await prisma.discrepancy.createMany({
      data: ruleFindings.map((d) => ({
        modelVersionId,
        modelCardId,
        category: d.category,
        severity: d.severity,
        description: d.description,
        evidence: d.evidence ?? {},
        source: "rule",
      })),
    });
  }

  if (llmFindings.length) {
    await prisma.discrepancy.createMany({
      data: llmFindings.map((d) => ({
        modelVersionId,
        modelCardId,
        category: String(d.category ?? "llm"),
        severity: (d.severity ?? "med") as any,
        description: String(d.description ?? ""),
        evidence: d.evidence ?? {},
        source: "llm",
      })),
    });
  }

  return {
    ruleCount: ruleFindings.length,
    llmCount: llmFindings.length,
    llmReport,
  };
}

