import type { CodeFacts } from "@shared/index";

export async function analyzeCodeFiles(
  files: Array<{ path: string; content: string }>
): Promise<CodeFacts> {
  const url = process.env.INSPECTOR_URL;
  if (!url) throw new Error("INSPECTOR_URL not set");
  const res = await fetch(`${url}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`Inspector error: ${res.status}`);
  const json = (await res.json()) as { code_facts: CodeFacts };
  return json.code_facts ?? {};
}

