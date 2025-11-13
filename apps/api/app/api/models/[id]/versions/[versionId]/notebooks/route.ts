import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { versionId: string } }
) {
  const files = await prisma.fileBlob.findMany({
    where: { 
      modelVersionId: params.versionId,
      isNotebook: true,
    },
    select: {
      id: true,
      path: true,
      notebookJson: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ notebooks: files });
}

