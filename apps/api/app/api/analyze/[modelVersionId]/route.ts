import { NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { compareFacts } from "../../../../src/lib/rules";
import { prisma } from "../../../../src/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { modelVersionId: string } }
) {
  const { modelVersionId } = params;
  const version = await prisma.modelVersion.findUnique({ where: { id: modelVersionId } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const card = await prisma.modelCard.findFirst({ where: { modelId: version.modelId }, orderBy: { createdAt: "desc" } });
  const codeExtraction = await prisma.extraction.findFirst({ where: { modelVersionId, subject: "code" }, orderBy: { createdAt: "desc" } });
  const cardExtraction = card ? await prisma.extraction.findFirst({ where: { modelCardId: card.id, subject: "card" }, orderBy: { createdAt: "desc" } }) : null;
  const codeFacts = (codeExtraction?.facts ?? {}) as any;
  const cardFacts = (cardExtraction?.facts ?? {}) as any;
  const ruleFindings = compareFacts(codeFacts, cardFacts);
  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: "You are a strict discrepancy detector for trading models.",
    prompt: JSON.stringify({ codeFacts, cardFacts, ruleFindings }),
  });
  return result.toAIStreamResponse();
}

