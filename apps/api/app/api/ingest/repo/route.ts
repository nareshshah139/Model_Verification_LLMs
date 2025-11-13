import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { analyzeCodeFiles } from "@/src/lib/inspector";
import { runAnalysisAndPersist } from "@/src/lib/analysis";
import { notebookCodeToPythonScript, extractPythonFromNotebook } from "@/src/lib/notebook";
import simpleGit from "simple-git";
import os from "os";
import path from "path";
import fs from "fs/promises";

export async function POST(req: Request) {
  const body = await req.json();
  const { repoUrl, branch = "main", name } = body ?? {};
  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-"));
  const git = simpleGit();
  await git.clone(repoUrl, workdir, ["--depth", "1", "--branch", branch]);
  const repo = simpleGit(workdir);
  const log = await repo.log({ n: 1 });
  const sha = log.latest?.hash ?? null;

  async function* walk(dir: string): AsyncGenerator<string> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(full);
      else yield full;
    }
  }

  const files: string[] = [];
  for await (const f of walk(workdir)) files.push(f);

  const pyFiles = files.filter((f) => f.endsWith(".py"));
  const notebookFiles = files.filter((f) => f.endsWith(".ipynb"));
  const mdFiles = files.filter((f) => f.toLowerCase().endsWith(".md") || f.toLowerCase().endsWith(".markdown"));
  const yamlFiles = files.filter((f) => f.toLowerCase().endsWith(".yaml") || f.toLowerCase().endsWith(".yml"));

  const modelName = name ?? repoUrl.split("/").pop()?.replace(/\.git$/, "") ?? "Repo Model";
  const model = await prisma.model.create({ data: { name: modelName, repoUrl, defaultBranch: branch } });
  const version = await prisma.modelVersion.create({ data: { modelId: model.id, gitCommitSha: sha ?? undefined } });

  // Persist code files (including notebooks - preserve notebook structure)
  const allBlobs: Array<{ path: string; content: string; isNotebook?: boolean; notebookJson?: any }> = [];
  const analysisBlobs: Array<{ path: string; content: string }> = [];
  
  // Regular Python files
  for (const pyPath of pyFiles) {
    const content = await fs.readFile(pyPath, "utf8");
    const relPath = path.relative(workdir, pyPath);
    allBlobs.push({ path: relPath, content });
    analysisBlobs.push({ path: relPath, content });
  }
  
  // Notebooks - preserve structure and extract code for analysis
  for (const nbPath of notebookFiles) {
    const nbJson = JSON.parse(await fs.readFile(nbPath, "utf8"));
    const relPath = path.relative(workdir, nbPath);
    const codeScript = notebookCodeToPythonScript(nbJson, relPath);
    
    // Store notebook with full structure
    allBlobs.push({ 
      path: relPath, 
      content: JSON.stringify(nbJson, null, 2), // Store as formatted JSON
      isNotebook: true,
      notebookJson: nbJson
    });
    
    // Add code cells for analysis
    analysisBlobs.push({ path: relPath.replace(/\.ipynb$/, ".py"), content: codeScript });
  }
  
  // Persist all files (notebooks with structure, regular files as text)
  await prisma.fileBlob.createMany({
    data: allBlobs.map((b) => ({
      modelVersionId: version.id,
      path: b.path,
      contentText: b.content,
      lang: b.isNotebook ? "jupyter" : "python",
      isNotebook: b.isNotebook ?? false,
      notebookJson: b.notebookJson ?? null,
    })),
  });
  
  // Analyze code (from both .py files and notebook code cells)
  if (analysisBlobs.length) {
    const codeFacts = await analyzeCodeFiles(analysisBlobs);
    await prisma.extraction.create({ data: { subject: "code", modelVersionId: version.id, facts: codeFacts as any } });
  }

  // Persist model card (pick model_card.md else README.md else first md/yaml)
  let cardText = "";
  const preferred = mdFiles.find((f) => path.basename(f).toLowerCase() === "model_card.md")
    || mdFiles.find((f) => path.basename(f).toLowerCase() === "readme.md")
    || mdFiles[0]
    || yamlFiles[0];
  if (preferred) cardText = await fs.readFile(preferred, "utf8");
  const card = await prisma.modelCard.create({ data: { modelId: model.id, sourceType: "repo", path: preferred ? path.relative(workdir, preferred) : undefined, rawText: cardText } });
  await prisma.extraction.create({ data: { subject: "card", modelCardId: card.id, facts: {} } });

  // Run analysis and persist discrepancies
  await runAnalysisAndPersist(version.id, card.id);

  return NextResponse.json({ status: "ok", modelId: model.id, modelVersionId: version.id, modelCardId: card.id });
}

