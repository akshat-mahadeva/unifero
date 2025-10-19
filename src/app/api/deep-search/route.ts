// app/api/deep-search/route.ts
import {
  getOrCreateDeepSearchSessionById,
  saveDeepSearchMessagesToSession,
  createAssistantMessage,
  updateAssistantMessageContent,
  updateActiveStreamId,
} from "@/actions/deep-search.actions";

import {
  generateId,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { DeepSearchUIMessage } from "@/types/deep-search";
import { openai } from "@ai-sdk/openai";
import { extractTextFromMessage, sanitizeMessages } from "@/lib/safe-messages";
import { getTools } from "@/lib/agent/deep-search";

export async function POST(req: Request) {
  try {
    const { model, sessionId, prompt } = await req.json();

    if (!sessionId || !model || !prompt) {
      return new Response("Missing required fields", { status: 400 });
    }

    const currentSession = await getOrCreateDeepSearchSessionById(
      sessionId,
      prompt.slice(0, 20)
    );

    await saveDeepSearchMessagesToSession(sessionId, [
      {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ]);

    const assistantMessage = await createAssistantMessage(sessionId, false);

    const assistantMessageId = assistantMessage.id;

    const safeMessages = sanitizeMessages(currentSession.messages ?? []);
    const convertedMessages = convertToModelMessages(safeMessages);

    const streamId = generateId();

    await updateActiveStreamId(sessionId, streamId);

    const stream = createUIMessageStream<DeepSearchUIMessage>({
      generateId: () => assistantMessageId,
      execute: async ({ writer }) => {
        const codeAgent = streamText({
          model: openai("gpt-4o-mini"),
          messages: convertedMessages,
          tools: getTools(writer, assistantMessageId),
          onStepFinish: ({ toolCalls }) => {
            for (const toolCall of toolCalls) {
              if (toolCall.toolName === "") {
                console.log("Deep search tool output:", toolCall.input);
              }
            }
          },
        });

        writer.merge(codeAgent.toUIMessageStream());
      },
      onFinish: async ({ messages }) => {
        const assistantMessages = messages.filter(
          (m) => m.role === "assistant"
        );

        if (assistantMessages.length > 0) {
          const textContent = extractTextFromMessage(assistantMessages[0]);

          await updateAssistantMessageContent(assistantMessageId, textContent);
        }

        await updateActiveStreamId(sessionId, null);
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream }) {
        try {
          const streamContext = createResumableStreamContext({
            waitUntil: after,
          });

          await streamContext.createNewResumableStream(streamId, () => stream);
        } catch (error) {
          console.error("Error in consumeSseStream:", error);
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
