import {
  getOrCreateSessionById,
  saveMessagesToSession,
} from "@/actions/chat.actions";
import { AssistantToolResult, collectToolResult } from "@/lib/helpers";
import { sanitizeMessages } from "@/lib/safe-messages";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  convertToModelMessages,
  UIMessage,
  ToolResultPart,
} from "ai";

type StreamStep = {
  toolResults?: unknown[];
  toolCalls?: unknown[];
};

// I am creating a tool that sends progress for 1 minute
export async function POST(req: Request) {
  try {
    const { model, sessionId, prompt } = await req.json();

    const assistantToolResults: AssistantToolResult[] = [];

    // Validate required fields
    if (!sessionId) {
      return new Response("sessionId is required", { status: 400 });
    }

    if (!model) {
      return new Response("model is required", { status: 400 });
    }

    if (!prompt) {
      return new Response("prompt is required", { status: 400 });
    }

    // Get or create session with messages
    const currentSession = await getOrCreateSessionById(
      sessionId,
      prompt.slice(0, 20)
    );

    // Convert stored messages to UIMessage using shared sanitizer
    const safeMessages = sanitizeMessages(currentSession.messages ?? []);

    // Compute converted messages once and log a compact preview so logs stay small.
    const convertedMessages = convertToModelMessages(safeMessages);

    const stream = createUIMessageStream({
      async execute({ writer }) {
        const result = streamText({
          system: `
          You are Unifero, a web search-powered AI assistant specialized in finding and delivering current, 
          accurate information from the internet. Your primary strength is real-time web search - use it frequently to provide the most up-to-date and comprehensive answers.
          `,
          model: openai(model),
          messages: [...convertedMessages, { role: "user", content: prompt }],
          stopWhen: stepCountIs(2),
          onStepFinish: async (step: StreamStep) => {
            const toolResults = step?.toolResults ?? [];
            const toolCalls = step?.toolCalls ?? [];
            if (!toolResults.length) return;

            for (const tr of toolResults) {
              try {
                collectToolResult(
                  tr as ToolResultPart,
                  toolCalls,
                  assistantToolResults
                );
              } catch (e: unknown) {
                console.error("Error collecting tool result:", e);
              }
            }
          },
        });

        writer.merge(result.toUIMessageStream({ sendReasoning: true }));
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Stream error:", error);
        return `Error: ${message}`;
      },
      onFinish: async ({ messages }) => {
        // Check if user message is already included
        const hasUserMessage = messages.some((m) => m.role === "user");

        let allMessages = messages;

        // If user message is not included, add it
        if (!hasUserMessage) {
          const userMessage: UIMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            parts: [
              {
                type: "text",
                text: prompt,
              },
            ],
          };
          allMessages = [userMessage, ...messages];
        }

        try {
          await saveMessagesToSession(
            sessionId,
            allMessages,
            assistantToolResults.length > 0 ? assistantToolResults : undefined
          );
        } catch (error) {
          console.error("Error saving messages to database:", error);
        }
      },
    });

    return createUIMessageStreamResponse({
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      stream,
    });
  } catch (error) {
    console.error("❌ API route error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
