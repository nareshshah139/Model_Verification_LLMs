import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

const CARDCHECK_API_URL = process.env.CARDCHECK_API_URL || "http://localhost:8001";

/**
 * Analyze model version using CodeAct CardCheck service (ast-grep based, no LLM).
 * For LLM-powered analysis with ast-grep tools, use /api/analyze/[modelVersionId]/llm-astgrep
 */

export async function POST(
  _req: Request,
  { params }: { params: { modelVersionId: string } }
) {
  const { modelVersionId } = params;
  
  try {
    // Get model version and related data
    const version = await prisma.modelVersion.findUnique({ 
      where: { id: modelVersionId },
      include: { model: true }
    });
    if (!version) {
      return NextResponse.json({ error: "Model version not found" }, { status: 404 });
    }

    // Get model card
    const card = await prisma.modelCard.findFirst({ 
      where: { modelId: version.modelId }, 
      orderBy: { createdAt: "desc" } 
    });
    
    if (!card) {
      return NextResponse.json({ error: "Model card not found" }, { status: 404 });
    }

    if (!version.model.repoUrl) {
      return NextResponse.json({ error: "Repository URL not found" }, { status: 400 });
    }

    // Call FastAPI SSE endpoint
    const cardcheckResponse = await fetch(`${CARDCHECK_API_URL}/verify/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_card_text: card.rawText,
        repo_url: version.model.repoUrl,
        runtime_enabled: false,
      }),
    });

    if (!cardcheckResponse.ok) {
      const errorText = await cardcheckResponse.text();
      return NextResponse.json(
        { error: `CardCheck API error: ${errorText}` },
        { status: cardcheckResponse.status }
      );
    }

    // Create a readable stream to proxy SSE
    const stream = new ReadableStream({
      async start(controller) {
        const reader = cardcheckResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // Return SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Error in analyze route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

