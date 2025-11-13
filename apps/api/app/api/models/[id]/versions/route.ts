import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const versions = await prisma.modelVersion.findMany({
    where: { modelId: params.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, gitCommitSha: true, tag: true, createdAt: true },
  });
  return NextResponse.json({ versions });
}

