import prisma from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js may provide `params` as a promise for dynamic routes in edge/runtime.
  // Await it before accessing properties to satisfy the runtime check.
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastData = "";

      while (true) {
        const messages = await prisma.testMessage.findMany({
          where: { sessionId: id },
          orderBy: { createdAt: "asc" },
        });

        const payload = JSON.stringify(messages);
        if (payload !== lastData) {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          lastData = payload;
        }

        const allDone = messages.every(
          (m) => m.status === "completed" || m.status === "terminated"
        );
        if (allDone && messages.length > 0) break;

        await new Promise((r) => setTimeout(r, 2000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
