import { streamText } from "ai";
import { getLLMModel } from "@/src/lib/llm-config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { codeFacts, cardFacts } = await req.json();
  const model = getLLMModel();
  const result = await streamText({
    model,
    system: "You are a strict discrepancy detector for trading models.",
    prompt: JSON.stringify({ codeFacts, cardFacts }),
  });
  return result.toAIStreamResponse();
}

