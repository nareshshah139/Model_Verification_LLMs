import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { runLLMAnalysisWithAstGrep } from "@/src/lib/llm-analysis";
import os from "os";
import path from "path";
import fs from "fs/promises";
import simpleGit from "simple-git";

const CARDCHECK_API_URL = process.env.CARDCHECK_API_URL || "http://localhost:8001";

/**
 * API endpoint for LLM-powered analysis using ast-grep tools.
 * This allows the LLM to call ast-grep to check code patterns.
 */
export async function POST(
  req: Request,
  { params }: { params: { modelVersionId: string } }
) {
  const { modelVersionId } = params;

  try {
    // Get model version and related data
    const version = await prisma.modelVersion.findUnique({
      where: { id: modelVersionId },
      include: { model: true },
    });

    if (!version) {
      return NextResponse.json({ error: "Model version not found" }, { status: 404 });
    }

    if (!version.model.repoUrl) {
      return NextResponse.json(
        { error: "Repository URL not found" },
        { status: 400 }
      );
    }

    // Get code and card facts
    const codeExtraction = await prisma.extraction.findFirst({
      where: { modelVersionId, subject: "code" },
      orderBy: { createdAt: "desc" },
    });

    const card = await prisma.modelCard.findFirst({
      where: { modelId: version.modelId },
      orderBy: { createdAt: "desc" },
    });

    if (!card) {
      return NextResponse.json({ error: "Model card not found" }, { status: 404 });
    }

    const cardExtraction = await prisma.extraction.findFirst({
      where: { modelCardId: card.id, subject: "card" },
      orderBy: { createdAt: "desc" },
    });

    if (!codeExtraction || !cardExtraction) {
      return NextResponse.json(
        { error: "Code or card extraction not found" },
        { status: 404 }
      );
    }

    const codeFacts = (codeExtraction.facts ?? {}) as any;
    const cardFacts = (cardExtraction.facts ?? {}) as any;

    // Clone repo temporarily for ast-grep analysis
    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "astgrep-llm-"));
    const git = simpleGit();
    await git.clone(version.model.repoUrl, workdir, [
      "--depth",
      "1",
      "--branch",
      version.model.defaultBranch || "main",
    ]);

    try {
      // Run LLM analysis with ast-grep tools
      const result = await runLLMAnalysisWithAstGrep(
        modelVersionId,
        card.id,
        workdir,
        codeFacts,
        cardFacts
      );

      // Persist discrepancies
      if (result.discrepancies.length > 0) {
        await prisma.discrepancy.createMany({
          data: result.discrepancies.map((d) => ({
            modelVersionId,
            modelCardId: card.id,
            category: d.category,
            severity: d.severity,
            description: d.description,
            evidence: d.evidence ?? {},
            source: "llm",
          })),
        });
      }

      return NextResponse.json({
        success: true,
        discrepancies: result.discrepancies,
        report: result.report,
        count: result.discrepancies.length,
      });
    } finally {
      // Cleanup temp directory
      await fs.rm(workdir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error in LLM ast-grep analysis:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

