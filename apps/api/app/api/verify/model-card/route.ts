import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getLLMConfig } from "@/src/lib/llm-config";
import mammoth from "mammoth";
import { optimizeDocxText, getOptimizationStats } from "@/src/lib/docx-optimizer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelCardPath, repoPath, llmProvider: requestedProvider } = body;

    if (!modelCardPath || !repoPath) {
      return new Response(
        JSON.stringify({ error: "modelCardPath and repoPath are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Read model card content
    let modelCardText: string;
    try {
      const absolutePath = path.isAbsolute(modelCardPath)
        ? modelCardPath
        : path.join(process.cwd(), modelCardPath);
      
      // Check if it's a DOCX file
      if (absolutePath.toLowerCase().endsWith('.docx')) {
        // Extract text from DOCX using mammoth
        const buffer = await fs.readFile(absolutePath);
        const result = await mammoth.extractRawText({ buffer });
        const rawText = result.value;
        
        // Optimize the extracted text to reduce token count
        modelCardText = optimizeDocxText(rawText);
        
        // Log optimization stats for debugging
        const stats = getOptimizationStats(rawText, modelCardText);
        console.log(`DOCX optimization: ${stats.originalTokens} → ${stats.optimizedTokens} tokens (${stats.reductionPercent} reduction)`);
        
        if (result.messages && result.messages.length > 0) {
          console.warn("DOCX extraction warnings:", result.messages);
        }
      } else {
        // For markdown or text files, read as UTF-8
        modelCardText = await fs.readFile(absolutePath, "utf-8");
      }
      try {
        const mu = process.memoryUsage();
        console.log(`[VERIFY-MC] After reading model card: rss=${(mu.rss/(1024*1024)).toFixed(1)}MB heapUsed=${(mu.heapUsed/(1024*1024)).toFixed(1)}MB len=${modelCardText.length}`);
      } catch {}
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Failed to read model card: ${error}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get LLM configuration (includes API key)
    let llmConfig;
    try {
      llmConfig = getLLMConfig();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: `LLM configuration error: ${error instanceof Error ? error.message : 'Unknown error'}. Please configure API keys in LLM Settings.` 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use requested provider if provided, otherwise use configured provider
    const llmProvider = requestedProvider || llmConfig.provider;
    const llmModel = llmConfig.model;
    
    // Get the appropriate API key (support OpenRouter as well)
    const apiKey =
      llmProvider === "openai"
        ? process.env.OPENAI_API_KEY
        : llmProvider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: `${
            llmProvider === "openai"
              ? "OPENAI_API_KEY"
              : llmProvider === "anthropic"
              ? "ANTHROPIC_API_KEY"
              : "OPENROUTER_API_KEY"
          } not configured. Please set it in LLM Settings or environment variables.` 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call CodeAct agent API streaming endpoint (dynamic, model-card-driven mode)
    const codeactUrl = process.env.CODEACT_API_URL || "http://localhost:8001";
    
    const response = await fetch(`${codeactUrl}/verify/codeact/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass API key to CodeAct service via header
        "X-API-Key": apiKey,
        "X-LLM-Provider": llmProvider,
        "X-LLM-Model": llmModel,
      },
      body: JSON.stringify({
        model_card_text: modelCardText,
        repo_path: repoPath,
        runtime_enabled: false,
        sg_binary: "sg",
        llm_provider: llmProvider,
        llm_model: llmModel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: errorText || "Verification failed" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the SSE events from CodeAct API to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'No response body' })}\n\n`));
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';
          let eventCount = 0;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim()) {
                // Forward SSE line to client
                controller.enqueue(encoder.encode(line + '\n'));
                eventCount++;
                if (eventCount % 20 === 0) {
                  try {
                    const mu = process.memoryUsage();
                    console.log(`[VERIFY-MC] SSE forwarded #${eventCount}, rss=${(mu.rss/(1024*1024)).toFixed(1)}MB, heapUsed=${(mu.heapUsed/(1024*1024)).toFixed(1)}MB, lineBytes=${Buffer.byteLength(line, 'utf8')}`);
                  } catch {}
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

