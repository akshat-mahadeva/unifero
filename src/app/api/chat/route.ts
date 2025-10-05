import {
  getOrCreateSessionById,
  saveMessagesToSession,
} from "@/actions/chat.actions";
import { AssistantToolResult, collectToolResult } from "@/lib/helpers";
import { tools } from "@/lib/tools";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  convertToModelMessages,
  UIMessage,
  ToolResultPart,
} from "ai";

type StreamStep = {
  toolResults?: unknown[];
  toolCalls?: unknown[];
};

export async function POST(req: Request) {
  try {
    const { model, sessionId, prompt, webSearch } = await req.json();

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

    // Convert stored messages to CoreMessage forma
    const safeMessages: UIMessage[] = (currentSession.messages ?? [])
      .slice(-10)
      .map((m, idx) => ({
        id: m.id ?? `msg-${idx}`,
        role: (["system", "user", "assistant"].includes(m.role)
          ? (m.role as "system" | "user" | "assistant")
          : "user") as "system" | "user" | "assistant",
        parts: [
          {
            type: "text",
            text: m.content ?? "" + m.toolSnapshots.toString(),
          },
        ],
      })) as UIMessage[];

    // Compute converted messages once and log a compact preview so logs stay small.
    const convertedMessages = convertToModelMessages(safeMessages);

    const stream = createUIMessageStream({
      async execute({ writer }) {
        const result = streamText({
          system: `You are Unifero, an intelligent AI assistant designed to provide comprehensive, accurate, and helpful responses. You have access to real-time web search capabilities to ensure your information is current and factual.

## Core Principles:
- **Accuracy First**: Always prioritize factual correctness over speed
- **Current Information**: Use web search when information might be outdated or when users ask about recent events
- **Comprehensive Responses**: Provide detailed, well-structured answers that fully address the user's question
- **Source Attribution**: When using web search results, clearly cite sources and provide links
- **Transparency**: Be clear about when you're using web search vs. your training knowledge

## When to Use Web Search:
- Recent events, news, or current affairs (anything from 2023 onwards)
- Stock prices, market data, or financial information
- Company updates, product launches, or business news
- Sports scores, schedules, or recent match results
- Weather, traffic, or real-time conditions
- Website information, documentation, or online resources
- Verification of facts that might have changed
- User explicitly asks for "latest", "current", "recent", or "up-to-date" information

## Response Guidelines:
- **Structure**: Use clear headings, bullet points, and formatting for readability
- **Context**: Provide background information when necessary
- **Balanced**: Present multiple perspectives when relevant
- **Actionable**: Include next steps or recommendations when appropriate
- **Concise but Complete**: Be thorough but avoid unnecessary verbosity

## Source Handling:
- When citing web sources, format as: "[Source Title](URL)"
- Summarize key information from multiple sources
- Cross-reference information when possible
- Note if sources conflict or information is uncertain

${
  webSearch
    ? "🌐 **Web Search is ENABLED** - You have access to real-time web search. Use it proactively for current information."
    : "📚 **Web Search is DISABLED** - Rely on your training knowledge. If you believe current information would be beneficial, suggest the user enable web search."
}

Remember: You're not just answering questions—you're helping users understand complex topics, make informed decisions, and discover new information. Be helpful, insightful, and trustworthy.`,
          model: openai(model),
          messages: [...convertedMessages, { role: "user", content: prompt }],
          tools: webSearch ? tools : {}, // Only provide tools if web search is enabled
          experimental_transform: smoothStream({
            delayInMs: 10,
            chunking: "line",
          }),
          stopWhen: stepCountIs(2),
          onStepFinish: async (step: StreamStep) => {
            const toolResults = step?.toolResults ?? [];
            const toolCalls = step?.toolCalls ?? [];
            if (!toolResults.length) return;

            console.log(`Processing ${toolResults.length} tool results`);

            for (const tr of toolResults) {
              try {
                collectToolResult(
                  tr as ToolResultPart,
                  toolCalls,
                  assistantToolResults
                );
                console.log(
                  `Collected tool result: ${(tr as ToolResultPart)?.toolName}`
                );
              } catch (e: unknown) {
                console.error("Error collecting tool result:", e);
              }
            }

            console.log(
              `Total collected tool results: ${assistantToolResults.length}`
            );
          },
          onFinish: async ({ text, toolCalls, finishReason }) => {
            console.log("Generation finished:", {
              finishReason,
              toolCallsCount: toolCalls?.length || 0,
              textLength: text?.length || 0,
            });
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
        console.log(`Stream finished with ${messages.length} messages`);
        console.log(
          "Messages received:",
          messages.map((m) => ({
            id: m.id,
            role: m.role,
            type: m.parts?.[0]?.type,
          }))
        );

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
          console.log("Added user message to save to database");
        }

        // Save all messages including the user's input and assistant response with tool results
        try {
          await saveMessagesToSession(
            sessionId,
            allMessages,
            assistantToolResults.length > 0 ? assistantToolResults : undefined
          );
          console.log(
            `Saved ${allMessages.length} messages and ${assistantToolResults.length} tool results to database`
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
