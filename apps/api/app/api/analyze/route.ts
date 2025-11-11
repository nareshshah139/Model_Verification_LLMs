import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { codeFacts, cardFacts } = await req.json();
  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: "You are a strict discrepancy detector for trading models.",
    prompt: JSON.stringify({ codeFacts, cardFacts }),
  });
  return result.toAIStreamResponse();
}

