// app/api/deep-search/route.ts
import {
  getOrCreateDeepSearchSessionById,
  saveDeepSearchMessagesToSession,
  createAssistantMessage,
  updateDeepSearchMessageProgress,
  updateAssistantMessageContent,
  updateActiveStreamId,
} from "@/actions/deep-search.actions";
import { sanitizeMessages } from "@/lib/safe-messages";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  generateId,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { DeepSearchUIMessage } from "@/types/deep-search";

// Background worker that updates progress and streams to client
async function runProgressUpdater(
  sessionId: string,
  messageId: string,
  writer: Parameters<
    Parameters<typeof createUIMessageStream>[0]["execute"]
  >[0]["writer"]
) {
  const totalDuration = 10 * 60 * 1000; // 10 minutes
  const updateInterval = 10 * 1000; // 10 seconds
  const steps = Math.floor(totalDuration / updateInterval);

  for (let i = 1; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, updateInterval));

    const progress = Math.min(99, Math.floor((i / steps) * 100));

    try {
      // Update database
      await updateDeepSearchMessageProgress(
        sessionId,
        messageId,
        progress,
        false // not completed
      );

      console.log(`Database updated: ${progress}% for message ${messageId}`);

      // Stream progress update to client
      writer.write({
        type: "data-deep-search-progress",
        id: `progress-${messageId}`,
        data: {
          progress,
          messageId,
          isDeepSearchInitiated: true,
        },
      });

      console.log(`Progress streamed: ${progress}% for message ${messageId}`);
    } catch (err) {
      console.error("Failed to update progress:", err);
      break; // Stop on error
    }
  }

  // Mark as completed
  await updateDeepSearchMessageProgress(sessionId, messageId, 100, true);

  // Send final completion update
  writer.write({
    type: "data-deep-search-progress",
    id: `progress-${messageId}`,
    data: {
      progress: 100,
      messageId,
      isDeepSearchInitiated: true,
    },
  });

  console.log(`Progress completed: 100% for message ${messageId}`);
}

export async function POST(req: Request) {
  try {
    const { model, sessionId, prompt } = await req.json();
    console.log(
      `🚀 POST /api/deep-search - sessionId: ${sessionId}, prompt: ${prompt.slice(
        0,
        50
      )}...`
    );

    if (!sessionId || !model || !prompt) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Get or create session
    const currentSession = await getOrCreateDeepSearchSessionById(
      sessionId,
      prompt.slice(0, 20)
    );

    // 🔥 Clear any previous active stream to prevent race conditions
    await updateActiveStreamId(sessionId, null);

    // 🔥 SAVE USER MESSAGE FIRST
    await saveDeepSearchMessagesToSession(sessionId, [
      {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ]);

    // Create assistant message SECOND (so we have a DB ID)
    const assistantMessage = await createAssistantMessage(
      sessionId,
      true // isDeepSearchInitiated = true
    );

    const assistantMessageId = assistantMessage.id;

    // Convert messages for LLM
    const safeMessages = sanitizeMessages(currentSession.messages ?? []);
    const convertedMessages = convertToModelMessages(safeMessages);

    // Generate unique stream ID BEFORE creating the stream
    const streamId = generateId();
    console.log(`Generated stream ID: ${streamId} for session: ${sessionId}`);

    // Save stream ID to database BEFORE streaming starts
    await updateActiveStreamId(sessionId, streamId);
    console.log(`Saved activeStreamId ${streamId} to session ${sessionId}`);

    // Create UI Message Stream with custom data streaming
    const stream = createUIMessageStream<DeepSearchUIMessage>({
      generateId: () => assistantMessageId,
      execute: async ({ writer }) => {
        // Send initial progress update
        writer.write({
          type: "data-deep-search-progress",
          id: `progress-${assistantMessageId}`,
          data: {
            progress: 0,
            messageId: assistantMessageId,
            isDeepSearchInitiated: true,
          },
        });

        // 🔥 WAIT for progress updater to complete FIRST (reaches 100%)
        try {
          console.log("Starting progress updater...");
          await runProgressUpdater(sessionId, assistantMessageId, writer);
          console.log(
            "Progress updater completed at 100%, now starting LLM streaming..."
          );
        } catch (err) {
          console.error("Progress updater failed:", err);
        }

        // 🔥 ONLY AFTER progress is 100%, start LLM streaming
        const result = streamText({
          system: `Don't respond to query just do call reply a 1 line for each query joke that's it.`,
          model: openai(model),
          messages: [...convertedMessages, { role: "user", content: prompt }],
        });

        // Merge LLM stream with our custom stream
        writer.merge(result.toUIMessageStream());
      },
      onFinish: async ({ messages }) => {
        // Extract assistant text content
        const assistantMessages = messages.filter(
          (m) => m.role === "assistant"
        );

        if (assistantMessages.length > 0) {
          const textContent = assistantMessages[0].parts
            .filter((part) => part.type === "text")
            .map((part) => {
              if (part.type === "text" && "text" in part) {
                return part.text;
              }
              return "";
            })
            .join("\n");

          // Update the existing assistant message content
          await updateAssistantMessageContent(assistantMessageId, textContent);
        }

        // Clear the active stream when finished
        await updateActiveStreamId(sessionId, null);
      },
    });

    // Return response with resumable stream support
    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream }) {
        try {
          console.log(
            `consumeSseStream called for session: ${sessionId} with streamId: ${streamId}`
          );

          // CREATE RESUMABLE STREAM using the streamId we already saved
          const streamContext = createResumableStreamContext({
            waitUntil: after,
          });

          await streamContext.createNewResumableStream(streamId, () => stream);
          console.log(
            `Resumable stream created successfully with ID: ${streamId}`
          );
        } catch (error) {
          console.error("Error in consumeSseStream:", error);
          // Clear the activeStreamId if stream creation fails
          await updateActiveStreamId(sessionId, null);
          throw error;
        }
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
