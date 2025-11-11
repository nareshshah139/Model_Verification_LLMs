import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const model = await prisma.model.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, repoUrl: true, createdAt: true },
  });
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ model });
}

