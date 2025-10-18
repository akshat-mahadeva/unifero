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
  generateObject,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { DeepSearchUIMessage } from "@/types/deep-search";

// Define the Zod schema for the evaluation output
import { z } from "zod";

export const EvaluationSchema = z.object({
  // Sentiment classification
  sentiment: z
    .enum(["positive", "neutral", "negative"])
    .describe("Overall sentiment of the user query."),
  // The crucial routing decision
  isDeepSearchRequired: z
    .boolean()
    .describe(
      "True if the query requires external research (e.g., questions about current events, detailed analysis, comparisons). False if it is a simple chat, joke, or direct question."
    ),
  // A brief summary of the user's intent for logging
  intentSummary: z
    .string()
    .describe("A one-sentence summary of the user's goal or question."),
  normalReply: z
    .string()
    .describe(
      "A normal reply to the user's prompt if deep search is not required or ask for more information to deep search."
    ),
});

export type EvaluationResult = z.infer<typeof EvaluationSchema>;

// Background worker that updates progress and streams to client
async function runProgressUpdater(
  sessionId: string,
  messageId: string,
  writer: Parameters<
    Parameters<typeof createUIMessageStream>[0]["execute"]
  >[0]["writer"]
) {
  const totalDuration = 2 * 60 * 1000; // 2 minutes
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
        false
      );

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
}

export async function POST(req: Request) {
  try {
    const { model, sessionId, prompt } = await req.json();

    if (!sessionId || !model || !prompt) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Get or create session
    const currentSession = await getOrCreateDeepSearchSessionById(
      sessionId,
      prompt.slice(0, 20)
    );

    await updateActiveStreamId(sessionId, null);

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
      false // isDeepSearchInitiated = false
    );

    const assistantMessageId = assistantMessage.id;

    // Convert messages for LLM
    const safeMessages = sanitizeMessages(currentSession.messages ?? []);
    const convertedMessages = convertToModelMessages(safeMessages);

    // Generate unique stream ID BEFORE creating the stream
    const streamId = generateId();

    // Save stream ID to database BEFORE streaming starts
    await updateActiveStreamId(sessionId, streamId);

    // Create UI Message Stream with custom data streaming
    const stream = createUIMessageStream<DeepSearchUIMessage>({
      generateId: () => assistantMessageId,
      execute: async ({ writer }) => {
        const { object: evaluation } = await generateObject({
          model: openai("gpt-4o-mini"), // Use a cheap model for fast routing
          system: `Analyze the user prompt to determine if external deep research is required and classify its sentiment.`,
          prompt: prompt,
          schema: EvaluationSchema,
        });

        const needsDeepSearch = evaluation.isDeepSearchRequired;

        // Quick exit if deep search is not needed
        if (!needsDeepSearch) {
          writer.write({
            type: "text-start",
            id: assistantMessageId,
          });
          writer.write({
            type: "text-delta",
            id: assistantMessageId,
            delta: evaluation.normalReply,
          });
          writer.write({ type: "text-end", id: assistantMessageId });
          return;
        }

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

        // update the assistant message to indicate deep search has started
        await updateDeepSearchMessageProgress(
          sessionId,
          assistantMessageId,
          0,
          false,
          true // isDeepSearchInitiated = true
        );

        // 🔥 WAIT for progress updater to complete FIRST (reaches 100%)
        try {
          await runProgressUpdater(sessionId, assistantMessageId, writer);
        } catch (err) {
          console.error("Progress updater failed:", err);
        }

        // 🔥 ONLY AFTER progress is 100%, start LLM streaming
        const result = streamText({
          system: `Don't respond to query just do call reply a 1 line for each query joke that's it.`,
          model: openai(model),
          messages: [...convertedMessages, { role: "user", content: prompt }],
        });

        // 🔥 Manually stream text deltas to ensure correct message ID
        let isFirstChunk = true;
        for await (const chunk of result.textStream) {
          if (isFirstChunk) {
            writer.write({
              type: "text-start",
              id: assistantMessageId,
            });
            isFirstChunk = false;
          }

          writer.write({
            type: "text-delta",
            id: assistantMessageId,
            delta: chunk,
          });
        }

        // End the text stream
        writer.write({
          type: "text-end",
          id: assistantMessageId,
        });
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
          // CREATE RESUMABLE STREAM using the streamId we already saved
          const streamContext = createResumableStreamContext({
            waitUntil: after,
          });

          await streamContext.createNewResumableStream(streamId, () => stream);
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
