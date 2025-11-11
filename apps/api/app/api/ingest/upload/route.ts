import { NextResponse } from "next/server";
import { queueIngestionJob } from "../../../../src/lib/jobs";
import JSZip from "jszip";
import { prisma } from "../../../../src/lib/prisma";
import { analyzeCodeFiles } from "../../../../src/lib/inspector";
import { runAnalysisAndPersist } from "../../../../src/lib/analysis";
import { notebookCodeToPythonScript } from "../../../../src/lib/notebook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const modelCard = form.get("modelCard");
  if (!modelCard || !(modelCard instanceof Blob)) {
    return NextResponse.json({ error: "modelCard file is required" }, { status: 400 });
  }
  const codeZip = form.get("codeZip");
  const modelName = form.get("name")?.toString() ?? "Uploaded Model";

  // Persist model + version
  const model = await prisma.model.create({ data: { name: modelName } });
  const version = await prisma.modelVersion.create({ data: { modelId: model.id } });

  // Persist model card
  const cardText = await (modelCard as Blob).text();
  const card = await prisma.modelCard.create({
    data: { modelId: model.id, sourceType: "file", rawText: cardText },
  });

  // Extract code files if provided (including notebooks - preserve notebook structure)
  const allBlobs: Array<{ path: string; content: string; isNotebook?: boolean; notebookJson?: any }> = [];
  const analysisBlobs: Array<{ path: string; content: string }> = [];
  
  if (codeZip && codeZip instanceof Blob) {
    const zip = await JSZip.loadAsync(Buffer.from(await codeZip.arrayBuffer()));
    const pyEntries = Object.values(zip.files).filter((f) => !f.dir && f.name.endsWith(".py"));
    const nbEntries = Object.values(zip.files).filter((f) => !f.dir && f.name.endsWith(".ipynb"));
    
    // Regular Python files
    for (const entry of pyEntries) {
      const content = await entry.async("text");
      allBlobs.push({ path: entry.name, content });
      analysisBlobs.push({ path: entry.name, content });
    }
    
    // Notebooks - preserve structure and extract code for analysis
    for (const entry of nbEntries) {
      const nbJson = JSON.parse(await entry.async("text"));
      const codeScript = notebookCodeToPythonScript(nbJson, entry.name);
      
      // Store notebook with full structure
      allBlobs.push({
        path: entry.name,
        content: JSON.stringify(nbJson, null, 2),
        isNotebook: true,
        notebookJson: nbJson,
      });
      
      // Add code cells for analysis
      analysisBlobs.push({ path: entry.name.replace(/\.ipynb$/, ".py"), content: codeScript });
    }
  }

  // Persist file blobs (notebooks with structure, regular files as text)
  if (allBlobs.length) {
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
  }

  // Analyze code (from both .py files and notebook code cells)
  if (analysisBlobs.length) {
    const codeFacts = await analyzeCodeFiles(analysisBlobs);
    await prisma.extraction.create({
      data: {
        subject: "code",
        modelVersionId: version.id,
        facts: codeFacts as any,
      },
    });
  }

  // Naive card facts placeholder (LLM parsing can be added later)
  await prisma.extraction.create({
    data: {
      subject: "card",
      modelCardId: card.id,
      facts: {},
    },
  });

  const payload: Record<string, unknown> = { modelId: model.id, modelVersionId: version.id, modelCardId: card.id };
  const job = await queueIngestionJob("upload", payload);
  await runAnalysisAndPersist(version.id, card.id);
  return NextResponse.json({ status: "ok", jobId: job.id, modelId: model.id });
}

