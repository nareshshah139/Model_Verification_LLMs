import { prisma } from "./prisma";
import { compareFacts } from "./rules";
import type { CodeFacts, CardFacts } from "@shared/index";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function runAnalysisAndPersist(
  modelVersionId: string,
  modelCardId: string
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

  const ruleFindings = compareFacts(codeFacts, cardFacts);

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: "You are a strict discrepancy detector for trading models.",
    prompt: JSON.stringify({ codeFacts, cardFacts, ruleFindings }),
  });

  let llmFindings: any[] = [];
  try {
    llmFindings = JSON.parse(text);
  } catch {
    llmFindings = [];
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

  return { ruleCount: ruleFindings.length, llmCount: llmFindings.length };
}

