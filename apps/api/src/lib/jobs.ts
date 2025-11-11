import { prisma } from "./prisma";

export async function queueIngestionJob(
  type: "git" | "upload",
  payload: Record<string, unknown>
) {
  const job = await prisma.ingestionJob.create({
    data: {
      type,
      status: "pending",
      payload,
    },
  });
  return job;
}

