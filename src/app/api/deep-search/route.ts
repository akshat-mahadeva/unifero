// app/api/deep-search/route.ts
import {
  getOrCreateDeepSearchSessionById,
  saveDeepSearchMessagesToSession,
  createAssistantMessage,
  updateAssistantMessageContent,
  updateActiveStreamId,
  updateDeepSearchMessageProgress,
  calculateMessageProgress,
  syncMessageProgress,
} from "@/actions/deep-search.actions";

import {
  generateId,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  stepCountIs,
  smoothStream,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";
import { DeepSearchUIMessage } from "@/types/deep-search";
import { openai } from "@ai-sdk/openai";
import { getTools, ProgressCalculator } from "@/lib/agent/deep-search";
import { convertToDeepSearchUIMessages } from "@/lib/convertToUIMessage";

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
    const safeMessages = convertToDeepSearchUIMessages(
      updatedSession.messages ?? []
    );
    const convertedMessages = convertToModelMessages(safeMessages);

    const streamId = generateId();

    const userStopSignal = new AbortController();

    await updateActiveStreamId(sessionId, streamId);

    const stream = createUIMessageStream<DeepSearchUIMessage>({
      generateId: () => assistantMessageId,
      execute: async ({ writer }) => {
        // Initialize progress calculator
        const progressCalc = new ProgressCalculator();

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
- If the report is generated no need to repeat the information in the final answer just summarize

Do not call unnecessary tools. Be efficient.
`,
            },
            ...convertedMessages,
          ],
          tools: getTools(writer, sessionId, assistantMessageId, progressCalc),
          abortSignal: userStopSignal.signal,
          experimental_transform: smoothStream({
            delayInMs: 2, // optional: defaults to 0 (no delay)
            chunking: "word", // optional: defaults to 'word'
          }),
          onAbort: async () => {
            console.log(
              `Deep search for session ${sessionId} aborted by user.`
            );
            await updateActiveStreamId(sessionId, null);
          },
          stopWhen: stepCountIs(10),
          onStepFinish: async ({ toolCalls, toolResults, finishReason }) => {
            // Get current progress from database
            const progressData = await calculateMessageProgress(
              assistantMessageId
            );
            const currentStep = progressData
              ? progressData.completedSteps + 1
              : 1;

            console.log(
              `[STEP ${currentStep}] Finished - Reason: ${finishReason}`
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

                  if (analysisResult.needsDeepSearch) {
                    // Enable deep search for this message
                    await updateDeepSearchMessageProgress(
                      sessionId,
                      assistantMessageId,
                      0,
                      false,
                      true
                    );

                    // Calculate expected total steps for planning log
                    const searchCount =
                      analysisResult.searchQueries?.length || 1;
                    const expectedTotalSteps = 1 + searchCount + 2; // 1 analysis + N searches + 1 synthesis + 1 report

                    console.log(
                      `[PLANNING] Deep search with ${searchCount} searches (${expectedTotalSteps} expected steps)`
                    );
                  } else {
                    // Simple response - no deep search needed
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

            // Sync progress based on current database state
            const syncedProgress = await syncMessageProgress(
              assistantMessageId
            );

            if (syncedProgress && syncedProgress.isDeepSearch) {
              console.log(
                `[PROGRESS] ${syncedProgress.progress}% (${syncedProgress.completedSteps}/${syncedProgress.totalSteps} steps)`
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

            // Get current progress to check if this is a deep search
            const progressData = await calculateMessageProgress(
              assistantMessageId
            );

            if (progressData && progressData.isDeepSearch) {
              // Ensure 100% completion for deep search
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

        writer.merge(
          agent.toUIMessageStream({
            originalMessages: safeMessages,
            generateMessageId: () => assistantMessageId,
          })
        );
      },
      originalMessages: safeMessages,

      onFinish: async ({ messages }) => {
        console.log("[STREAM] Complete - Messages:", messages.length);
        await updateActiveStreamId(sessionId, null);
      },
    });

    return createUIMessageStreamResponse({
      stream,

      async consumeSseStream({ stream }) {
        const streamContext = createResumableStreamContext({
          waitUntil: after,
        });

        try {
          // 1) create/reserve the stream in Redis (publisher side)
          await streamContext.createNewResumableStream(streamId, () => stream);

          // 2) after the stream is created in Redis, persist it so resume won't race
          await updateActiveStreamId(sessionId, streamId);

          console.log(
            `Resumable stream ${streamId} created and saved for session ${sessionId}`
          );
        } catch (err) {
          console.error("Error creating resumable stream:", err);
          // ensure no stale activeStreamId if something partially succeeded
          await updateActiveStreamId(sessionId, null);
          throw err; // let createUIMessageStreamResponse surface the error
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
