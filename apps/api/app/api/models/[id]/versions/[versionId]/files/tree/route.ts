import { NextResponse } from "next/server";
import { prisma } from "../../../../../../src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { versionId: string } }
) {
  const files = await prisma.fileBlob.findMany({
    where: { modelVersionId: params.versionId },
    select: {
      id: true,
      path: true,
      lang: true,
      isNotebook: true,
      createdAt: true,
    },
    orderBy: { path: "asc" },
  });
  
  // Build folder structure
  const tree: Record<string, any> = {};
  
  for (const file of files) {
    const parts = file.path.split("/");
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (isFile) {
        current[part] = {
          type: "file",
          id: file.id,
          path: file.path,
          lang: file.lang,
          isNotebook: file.isNotebook,
        };
      } else {
        if (!current[part]) {
          current[part] = { type: "folder", children: {} };
        }
        current = current[part].children;
      }
    }
  }
  
  return NextResponse.json({ tree });
}

