import { generateText, tool } from "ai";
import { z } from "zod";
import type { CodeFacts, CardFacts, Discrepancy } from "@shared/index";
import { getLLMModel, getLLMConfig } from "./llm-config";

const CARDCHECK_API_URL = process.env.CARDCHECK_API_URL || "http://localhost:8001";

/**
 * LLM-powered analysis using ast-grep as a tool.
 * The LLM can call ast-grep to check code patterns and generate a comprehensive report.
 */
export async function runLLMAnalysisWithAstGrep(
  modelVersionId: string,
  modelCardId: string,
  repoPath: string,
  codeFacts: CodeFacts,
  cardFacts: CardFacts
): Promise<{ discrepancies: Discrepancy[]; report: any }> {
  // Define ast-grep tools for the LLM to use
  const astGrepScanTool = tool({
    description: `Scan code using an ast-grep rulepack. Rulepacks are YAML files that define patterns to search for in code (e.g., algorithms.yaml, leakage.yaml, splits.yaml, metrics.yaml, preprocessing.yaml, packaging.yaml). Use this to check if code matches model card claims.`,
    parameters: z.object({
      rulepack: z.string().describe("Name of the rulepack file (e.g., 'algorithms.yaml', 'leakage.yaml')"),
      paths: z.array(z.string()).optional().describe("Specific file paths to scan (optional, defaults to all Python files)"),
    }),
    execute: async ({ rulepack, paths }) => {
      try {
        const response = await fetch(`${CARDCHECK_API_URL}/astgrep/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rulepack,
            paths: paths || undefined,
            repo_path: repoPath,
            json_output: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error, matches: [] };
        }

        const data = await response.json();
        return { success: data.success, matches: data.matches || [], error: data.error };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          matches: [],
        };
      }
    },
  });

  const astGrepRunTool = tool({
    description: `Run an ad-hoc ast-grep pattern search. Use this when you need to search for specific code patterns that aren't covered by rulepacks.`,
    parameters: z.object({
      pattern: z.string().describe("AST pattern to search for (e.g., 'LogisticRegression($$$ARGS)', 'LinearRegression($$$ARGS)')"),
      lang: z.string().default("python").describe("Programming language (default: python)"),
      paths: z.array(z.string()).optional().describe("Specific file paths to scan (optional)"),
    }),
    execute: async ({ pattern, lang, paths }) => {
      try {
        const response = await fetch(`${CARDCHECK_API_URL}/astgrep/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pattern,
            lang,
            paths: paths || undefined,
            repo_path: repoPath,
            json_output: true,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error, matches: [] };
        }

        const data = await response.json();
        return { success: data.success, matches: data.matches || [], error: data.error };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          matches: [],
        };
      }
    },
  });

  const listRulepacksTool = tool({
    description: `List available ast-grep rulepack files. Use this to see what rulepacks are available before scanning.`,
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await fetch(`${CARDCHECK_API_URL}/astgrep/rulepacks`);
        if (!response.ok) {
          return { success: false, rulepacks: [] };
        }
        const data = await response.json();
        return { success: true, rulepacks: data.rulepacks || [] };
      } catch (error) {
        return { success: false, rulepacks: [] };
      }
    },
  });

  // Get available rulepacks first
  const rulepacksResponse = await fetch(`${CARDCHECK_API_URL}/astgrep/rulepacks`);
  const rulepacksData = rulepacksResponse.ok ? await rulepacksResponse.json() : { rulepacks: [] };
  const availableRulepacks = rulepacksData.rulepacks || [];

  // System prompt for the LLM
  const systemPrompt = `You are an expert model card discrepancy detector for trading models. Your job is to compare model card claims against actual code implementation.

You have access to ast-grep tools that can scan code for specific patterns. Use these tools strategically:

1. **astGrepScan**: Use rulepacks (algorithms.yaml, leakage.yaml, splits.yaml, metrics.yaml, preprocessing.yaml, packaging.yaml) to check for common patterns
2. **astGrepRun**: Use for custom pattern searches when rulepacks don't cover what you need
3. **listRulepacks**: Check available rulepacks first

Available rulepacks: ${availableRulepacks.join(", ")}

**Your workflow:**
1. Analyze the model card claims (cardFacts) to understand what the model claims to do
2. Use ast-grep tools to verify these claims in the code
3. Compare codeFacts (extracted from AST analysis) with cardFacts
4. Generate a comprehensive list of discrepancies

**For each discrepancy, provide:**
- category: The type of discrepancy (e.g., "algorithm", "preprocessing", "leakage", "splits", "metrics", "bounds")
- severity: "low", "med", or "high"
- description: Clear explanation of the discrepancy
- evidence: Object with file paths, line numbers, and code snippets that support your finding

**Be thorough:** Use multiple ast-grep scans to verify different aspects of the model card claims.`;

  const userPrompt = `Analyze the following model card and code facts to detect discrepancies:

**Model Card Facts (Claims):**
${JSON.stringify(cardFacts, null, 2)}

**Code Facts (Extracted from AST):**
${JSON.stringify(codeFacts, null, 2)}

**Repository Path:** ${repoPath}

Use the ast-grep tools to verify the model card claims against the actual code. Generate a comprehensive discrepancy report.`;

  // Get configured LLM model
  const model = getLLMModel();
  const config = getLLMConfig();

  // Run LLM with tools
  const { text, toolCalls, toolResults } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    tools: {
      astGrepScan: astGrepScanTool,
      astGrepRun: astGrepRunTool,
      listRulepacks: listRulepacksTool,
    },
    maxSteps: 10, // Allow multiple tool calls
  });

  // Parse the final response
  let discrepancies: Discrepancy[] = [];
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      discrepancies = parsed;
    } else if (parsed.discrepancies && Array.isArray(parsed.discrepancies)) {
      discrepancies = parsed.discrepancies;
    } else if (parsed.findings && Array.isArray(parsed.findings)) {
      discrepancies = parsed.findings;
    }
  } catch {
    // If not JSON, try to extract from text
    // Look for JSON-like structures in the text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        discrepancies = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback: create a single discrepancy from the text
        discrepancies = [
          {
            category: "llm-analysis",
            severity: "med" as const,
            description: text,
            evidence: { toolCalls, toolResults },
            source: "llm",
          },
        ];
      }
    } else {
      // Fallback: create a single discrepancy from the text
      discrepancies = [
        {
          category: "llm-analysis",
          severity: "med" as const,
          description: text,
          evidence: { toolCalls, toolResults },
          source: "llm",
        },
      ];
    }
  }

  // Normalize discrepancies
  const normalizedDiscrepancies: Discrepancy[] = discrepancies.map((d: any) => ({
    category: String(d.category || "llm-analysis"),
    severity: (d.severity === "low" || d.severity === "med" || d.severity === "high" 
      ? d.severity 
      : "med") as "low" | "med" | "high",
    description: String(d.description || text || "LLM analysis completed"),
    evidence: d.evidence || { toolCalls, toolResults },
    source: "llm",
  }));

  return {
    discrepancies: normalizedDiscrepancies,
    report: {
      text,
      toolCalls,
      toolResults,
      discrepancies: normalizedDiscrepancies,
      provider: config.provider,
      model: config.model,
    },
  };
}

