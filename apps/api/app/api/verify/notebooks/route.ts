import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { optimizeDocxText, getOptimizationStats } from "@/src/lib/docx-optimizer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notebookPaths, modelCardPath, repoPath } = body;

    if (!notebookPaths || !Array.isArray(notebookPaths) || notebookPaths.length === 0) {
      return new Response(
        JSON.stringify({ error: "notebookPaths array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
        console.log(`[VERIFY-NB] After reading model card: rss=${(mu.rss/(1024*1024)).toFixed(1)}MB heapUsed=${(mu.heapUsed/(1024*1024)).toFixed(1)}MB len=${modelCardText.length}`);
      } catch {}
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Failed to read model card: ${error}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call CodeAct agent API streaming endpoint
    const codeactUrl = process.env.CODEACT_API_URL || "http://localhost:8001";
    
    const response = await fetch(`${codeactUrl}/verify/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_card_text: modelCardText,
        repo_path: repoPath,
        runtime_enabled: false,
        sg_binary: "sg",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: errorText || "Verification failed" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the SSE events and inject notebook metadata
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
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  // If this is the complete event, add discrepancies
                  if (data.type === 'complete' && data.report) {
                    const discrepancies = extractDiscrepancies(data.report, notebookPaths);
                    data.discrepancies = discrepancies;
                    data.notebookPaths = notebookPaths;
                    data.modelCardPath = modelCardPath;
                    
                    // Re-encode with added data
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                  } else {
                    // Forward as-is
                    controller.enqueue(encoder.encode(line + '\n'));
                  }
                  eventCount++;
                  if (eventCount % 20 === 0) {
                    try {
                      const mu = process.memoryUsage();
                      console.log(`[VERIFY-NB] SSE forwarded #${eventCount}, rss=${(mu.rss/(1024*1024)).toFixed(1)}MB, heapUsed=${(mu.heapUsed/(1024*1024)).toFixed(1)}MB, lineBytes=${Buffer.byteLength(line, 'utf8')}`);
                    } catch {}
                  }
                } catch {
                  // Forward unparseable lines as-is
                  controller.enqueue(encoder.encode(line + '\n'));
                }
              } else if (line.trim()) {
                controller.enqueue(encoder.encode(line + '\n'));
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
    console.error("Notebook verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function extractDiscrepancies(report: any, notebookPaths: string[]) {
  const discrepancies: {
    notebookPath: string;
    issues: Array<{
      type: string;
      line?: number;
      message: string;
      severity: "error" | "warning";
      codeSnippet?: string;
    }>;
  }[] = [];

  // Extract issues from evidence table
  const evidenceTable = report?.evidence_table || {};
  
  for (const notebookPath of notebookPaths) {
    const issues: any[] = [];
    
    // Check each category of evidence
    for (const [category, matches] of Object.entries(evidenceTable)) {
      if (Array.isArray(matches)) {
        for (const match of matches) {
          // Check if this match is in the current notebook
          const file = match.file || match.path || "";
          if (file.includes(notebookPath) || notebookPath.includes(file)) {
            issues.push({
              type: category,
              line: match.line || match.start?.line,
              message: match.message || match.text || `${category} issue detected`,
              severity: category === "leakage" ? "error" : "warning",
              codeSnippet: match.text || match.matched || "",
            });
          }
        }
      }
    }
    
    if (issues.length > 0) {
      discrepancies.push({
        notebookPath,
        issues,
      });
    }
  }
  
  return discrepancies;
}
