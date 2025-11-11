import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cards = await prisma.modelCard.findMany({
    where: { modelId: params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rawText: true,
      path: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ cards });
}

