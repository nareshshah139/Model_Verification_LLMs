import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../../src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { versionId: string } }
) {
  const url = new URL(_req.url);
  const filePath = url.searchParams.get("path");
  
  if (!filePath) {
    return NextResponse.json({ error: "path parameter required" }, { status: 400 });
  }
  
  const file = await prisma.fileBlob.findFirst({
    where: {
      modelVersionId: params.versionId,
      path: filePath,
    },
    select: {
      id: true,
      path: true,
      contentText: true,
      lang: true,
      isNotebook: true,
      notebookJson: true,
    },
  });
  
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  
  return NextResponse.json({ file });
}

