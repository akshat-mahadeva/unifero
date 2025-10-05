import { ToolResultPart } from "ai";

export type AssistantToolResult = {
  toolName: string;
  input: unknown | null;
  output: unknown | null;
  isExecuted?: boolean;
  textPreview?: string | null;
  primaryPreview?: unknown | null;
  objectsCount?: number | null;
  toolCallId?: string | null;
};

// Type for tool calls structure in AI SDK v5
type ToolCall = {
  toolCallId?: string;
  id?: string;
  toolName?: string;
  args?: unknown;
  input?: unknown;
  inputs?: unknown;
};

// Type for websearch output structure
type WebSearchSource = {
  title: string;
  url: string;
  text: string;
  image?: string;
};

type WebSearchResult = {
  sources: WebSearchSource[];
};

type WebSearchOutput = {
  results: WebSearchResult[];
};

export const collectToolResult = (
  tr: ToolResultPart,
  toolCalls: Array<unknown>,
  collector: AssistantToolResult[]
) => {
  // Extract tool name from ToolResultPart
  const toolName = tr?.toolName ?? null;
  if (!toolName) return;

  // Get the tool output - in AI SDK v5, this is structured differently
  const output = tr?.output ?? null;
  const isExecuted = Boolean(output);

  // Find the matching tool call using toolCallId
  const matchingCall = toolCalls.find((call: unknown) => {
    const toolCall = call as ToolCall;
    return (
      toolCall?.toolCallId === tr?.toolCallId || toolCall?.id === tr?.toolCallId
    );
  }) as ToolCall | undefined;

  const input =
    matchingCall?.args ?? matchingCall?.input ?? matchingCall?.inputs ?? null;

  // Extract meaningful data for UI display based on tool type
  let textPreview: string | null = null;
  let primaryPreview: unknown | null = null;
  let objectsCount: number | null = null;

  // Handle the structured output from different tools
  if (output && typeof output === "object") {
    try {
      // In AI SDK v5, tool output can be different structures
      // Check if it's a JSON type output which contains our tool results
      let actualOutput: unknown = null;

      if ("type" in output) {
        // Handle LanguageModelV2ToolResultOutput structure
        if (output.type === "json" && "value" in output) {
          actualOutput = output.value;
        } else if (output.type === "text" && "value" in output) {
          textPreview = output.value as string;
          actualOutput = null;
        }
      } else {
        // Direct output structure
        actualOutput = output;
      }

      // Handle specific tool types
      if (
        String(toolName).toLowerCase() === "websearch" ||
        String(toolName) === "webSearch"
      ) {
        // Handle websearch output structure
        if (actualOutput && typeof actualOutput === "object") {
          const webSearchOutput = actualOutput as unknown as WebSearchOutput;
          const results = webSearchOutput?.results;

          if (Array.isArray(results)) {
            objectsCount = results.length;

            // Extract sources for preview
            const allSources = results.flatMap(
              (result: WebSearchResult) => result.sources || []
            );
            if (allSources.length > 0) {
              objectsCount = allSources.length;
              primaryPreview = allSources;

              // Create a text preview from the first few sources
              const sourceTitles = allSources
                .slice(0, 3)
                .map((source: WebSearchSource) => source.title)
                .filter(Boolean);

              if (sourceTitles.length > 0) {
                textPreview = `Found ${
                  allSources.length
                } result(s): ${sourceTitles.join(", ")}`;
              }
            }
          }
        }
      } else {
        // Handle other tool types generically
        if (actualOutput) {
          primaryPreview = actualOutput;

          // Try to create a meaningful text preview for any tool
          if (Array.isArray(actualOutput)) {
            objectsCount = actualOutput.length;
            textPreview = `Tool executed successfully with ${actualOutput.length} result(s)`;
          } else if (typeof actualOutput === "object") {
            const keys = Object.keys(actualOutput);
            textPreview = `Tool executed successfully with ${keys.length} properties`;
          } else {
            textPreview = `Tool executed successfully`;
          }
        } else if (textPreview) {
          // Already set from text output above
        } else {
          textPreview = `Tool ${toolName} executed successfully`;
        }
      }
    } catch (e) {
      console.warn(`Error parsing ${toolName} output:`, e);
      textPreview = `${toolName} completed`;
    }
  } else {
    // Handle non-object outputs
    textPreview = `${toolName} executed successfully`;
  }

  // Add to collector
  collector.push({
    toolCallId: tr?.toolCallId ?? null,
    toolName: String(toolName),
    input,
    output,
    isExecuted,
    textPreview,
    primaryPreview,
    objectsCount,
  });
};

// Export alias for backward compatibility
export const collectWebSearchResult = collectToolResult;

/**
 * Utility function to convert database tool snapshots back to UI format
 */
export const convertToolSnapshotToUIFormat = (toolSnapshot: {
  toolName: string;
  input: unknown;
  output: unknown;
  isExecuted: boolean;
}) => {
  // Convert the database format back to the UI format expected by components
  return {
    toolName: toolSnapshot.toolName,
    input: toolSnapshot.input,
    output: toolSnapshot.output,
    isExecuted: toolSnapshot.isExecuted,
  };
};

/**
 * Helper to create a mock ToolUIPart for rendering websearch results
 */
export const createWebSearchUIPartFromSnapshot = (
  toolSnapshot: {
    toolName: string;
    input: unknown;
    output: unknown;
    isExecuted: boolean;
  },
  toolCallId: string = "mock-call-id"
) => {
  // Create the part with the correct type expected by your WebSearchUIRenderer
  const webSearchPart = {
    type: "tool-web_search" as const,
    toolCallId,
    state: toolSnapshot.isExecuted
      ? ("output-available" as const)
      : ("input-available" as const),
    input: toolSnapshot.input as { query: string },
    output: toolSnapshot.output as WebSearchOutput,
  };

  return webSearchPart;
};
