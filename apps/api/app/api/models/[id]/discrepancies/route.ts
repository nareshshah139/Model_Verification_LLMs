import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const versionParam = url.searchParams.get("version");

  let modelVersionId: string | null = null;
  if (versionParam === "latest" || versionParam === null) {
    const latest = await prisma.modelVersion.findFirst({
      where: { modelId: params.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    modelVersionId = latest?.id ?? null;
  } else {
    modelVersionId = versionParam;
  }

  const where = modelVersionId
    ? { modelVersionId }
    : { modelCard: { modelId: params.id } };

  const discrepancies = await prisma.discrepancy.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, category: true, severity: true, description: true, createdAt: true },
  });

  return NextResponse.json({ discrepancies });
}

