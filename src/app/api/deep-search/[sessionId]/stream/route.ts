// app/api/deep-search/[sessionId]/stream/route.ts
import { getDeepSearchSessionById } from "@/actions/deep-search.actions";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";

// GET - Resume existing stream
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  console.log(
    `GET /api/deep-search/${sessionId}/stream - Attempting to resume stream`
  );

  // Load session data
  const session = await getDeepSearchSessionById(sessionId);
  console.log(`Session loaded:`, {
    sessionId,
    activeStreamId: session.activeStreamId,
    hasMessages: !!session.messages?.length,
  });

  // No active stream to resume
  if (!session.activeStreamId) {
    console.log(`No active stream for session ${sessionId} - returning 204`);
    return new Response(null, { status: 204 });
  }

  console.log(
    `Resuming stream ${session.activeStreamId} for session ${sessionId}`
  );

  // Create resumable stream context
  const streamContext = createResumableStreamContext({
    waitUntil: after,
  });

  // Resume the existing stream from Redis with error handling for benign issues
  const resumedStream = await streamContext.resumeExistingStream(
    session.activeStreamId
  );

  return new Response(resumedStream, {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}
