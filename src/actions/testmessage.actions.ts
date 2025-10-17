"use server";

import prisma from "@/lib/db";

export async function createMessage(sessionId: string, text: string) {
  const running = await prisma.testMessage.findFirst({
    where: { sessionId, status: "running" },
  });

  if (running) throw new Error("A message is already running.");

  const message = await prisma.testMessage.create({
    data: { sessionId, text },
  });

  simulateDeepSearch(message.id).catch(console.error);
  return message.id;
}

export async function terminateMessage(id: string) {
  await prisma.testMessage.update({
    where: { id },
    data: { status: "terminated" },
  });
}

export async function keepAliveMessage(id: string) {
  await prisma.testMessage.update({
    where: { id },
    data: { reasoning: "\n[Keep alive triggered]" },
  });
}

async function simulateDeepSearch(messageId: string) {
  const totalSteps = 30; // ~5 minutes = 30 steps * 10s
  for (let i = 1; i <= totalSteps; i++) {
    await new Promise((r) => setTimeout(r, 10_000)); // every 10s

    const message = await prisma.testMessage.findUnique({
      where: { id: messageId },
      select: { status: true },
    });

    if (!message || message.status === "terminated") break;

    const progress = Math.floor((i / totalSteps) * 100);
    const reasoning = `Step ${i}: Analyzing deeper layers of context...`;

    await prisma.testMessage.update({
      where: { id: messageId },
      data: { progress, reasoning },
    });
  }

  await prisma.testMessage.update({
    where: { id: messageId },
    data: { status: "completed" },
  });
}
