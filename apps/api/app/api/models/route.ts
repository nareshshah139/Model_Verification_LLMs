import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";

export async function GET() {
  const models = await prisma.model.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, repoUrl: true, createdAt: true },
  });
  return NextResponse.json({ models });
}

