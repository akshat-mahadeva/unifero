// app/api/deep-search/route.ts
import {
  getOrCreateDeepSearchSessionById,
  saveDeepSearchMessagesToSession,
  createAssistantMessage,
  updateAssistantMessageContent,
  updateActiveStreamId,
  updateDeepSearchMessageProgress,
} from "@/actions/deep-search.actions";

import {
  generateId,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  stepCountIs,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { DeepSearchUIMessage } from "@/types/deep-search";
import { openai } from "@ai-sdk/openai";
import { sanitizeMessages } from "@/lib/safe-messages";
import { getTools, ProgressCalculator } from "@/lib/agent/deep-search";

export async function POST(req: Request) {
  try {
    const { model, sessionId, prompt } = await req.json();

    if (!sessionId || !model || !prompt) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Get or create session first
    await getOrCreateDeepSearchSessionById(sessionId, prompt.slice(0, 50));

    // Save user message first
    await saveDeepSearchMessagesToSession(sessionId, [
      {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ]);

    const assistantMessage = await createAssistantMessage(sessionId, false);
    const assistantMessageId = assistantMessage.id;

    // Re-fetch session to get the latest messages including the one we just saved
    const updatedSession = await getOrCreateDeepSearchSessionById(sessionId);
    const safeMessages = sanitizeMessages(updatedSession.messages ?? []);
    const convertedMessages = convertToModelMessages(safeMessages);

    const streamId = generateId();

    await updateActiveStreamId(sessionId, streamId);

    const stream = createUIMessageStream<DeepSearchUIMessage>({
      generateId: () => assistantMessageId,
      execute: async ({ writer }) => {
        // Initialize progress calculator
        const progressCalc = new ProgressCalculator();

        // Track execution state
        let isDeepSearch = false;
        let totalSteps = 0;
        let completedSteps = 0;

        const agent = streamText({
          model: openai("gpt-4o-mini"),
          messages: [
            {
              role: "system",
              content: `
You are an intelligent research assistant.

WORKFLOW:
1. ALWAYS call analyzeQueryTool first to assess the query
2. Based on analysis:
   - If needsDeepSearch = false: Answer directly using your knowledge
   - If needsDeepSearch = true: Execute this sequence:
     a) Call searchWebTool for each suggested search query (usually 2-3)
     b) Call synthesizeTool once to analyze findings
     c) Call generateReportTool once for final response

RULES:
- analyzeQueryTool: Required first call and only call once
- searchWebTool: Only if deep search needed, pass originalQuery for context
- synthesizeTool: Only after all searches complete
- generateReportTool: Only after synthesis
- If no deep search needed, just provide a helpful direct answer

Do not call unnecessary tools. Be efficient.
`,
            },
            ...convertedMessages,
          ],
          tools: getTools(writer, sessionId, assistantMessageId, progressCalc),
          stopWhen: stepCountIs(10),
          onStepFinish: async ({ toolCalls, toolResults, finishReason }) => {
            completedSteps++;

            console.log(
              `[STEP ${completedSteps}] Finished - Reason: ${finishReason}`
            );

            for (const toolCall of toolCalls) {
              console.log(`  Tool: ${toolCall.toolName}`);

              // Check if this was the analysis tool
              if (toolCall.toolName === "analyzeQueryTool") {
                const result = toolResults.find(
                  (r) => r.toolCallId === toolCall.toolCallId
                );

                if (result?.output) {
                  const analysisResult = result.output as {
                    needsDeepSearch: boolean;
                    searchQueries?: string[];
                  };

                  isDeepSearch = analysisResult.needsDeepSearch;

                  if (isDeepSearch) {
                    // Calculate total steps: analysis + searches + synthesis + report
                    const searchCount =
                      analysisResult.searchQueries?.length || 1;
                    totalSteps = 1 + searchCount + 2; // 1 analysis + N searches + 1 synthesis + 1 report

                    console.log(
                      `[PLANNING] Deep search with ${searchCount} searches (${totalSteps} total steps)`
                    );
                  } else {
                    // Simple response - just analysis + direct answer
                    totalSteps = 1;
                    console.log("[PLANNING] Simple response - no deep search");

                    // Mark as complete immediately
                    await updateDeepSearchMessageProgress(
                      sessionId,
                      assistantMessageId,
                      100,
                      true
                    );
                  }
                }
              }
            }

            // Log progress
            if (totalSteps > 0 && isDeepSearch) {
              const estimatedProgress = Math.min(
                95,
                Math.floor((completedSteps / totalSteps) * 100)
              );
              console.log(
                `[PROGRESS] ${estimatedProgress}% (${completedSteps}/${totalSteps} steps)`
              );
            }
          },

          onFinish: async ({ text, toolCalls, finishReason }) => {
            console.log(
              `[FINISH] Reason: ${finishReason}, Tool calls: ${toolCalls.length}`
            );

            // Save final text content
            if (text) {
              await updateAssistantMessageContent(assistantMessageId, text);
            }

            // Ensure 100% completion
            if (isDeepSearch) {
              await updateDeepSearchMessageProgress(
                sessionId,
                assistantMessageId,
                100,
                true
              );

              // Send final completion event
              writer.write({
                type: "data-deepSearchDataPart",
                id: `final-${Date.now()}`,
                data: {
                  progress: 100,
                  messageId: assistantMessageId,
                  text: "Complete",
                  state: "done",
                  isDeepSearchInitiated: true,
                  type: "deep-search",
                  id: "",
                },
              });
            }
          },
        });

        writer.merge(agent.toUIMessageStream());
      },

      onFinish: async ({ messages }) => {
        console.log("[STREAM] Complete - Messages:", messages.length);
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
