import { DeepSearchDBMessage, DeepSearchUIMessage } from "@/types/deep-search";
import { UIMessage } from "ai";

/**
 * Interface for the message structure from the database
 */
interface DatabaseMessage {
  id: string;
  role: string;
  content?: string;
  toolSnapshots?: Array<{
    toolName: string;
    isExecuted: boolean;
    input: unknown;
    output: unknown;
  }>;
}

/**
 * Convert database messages to UIMessage format
 * @param messages Array of database messages
 * @returns Array of UIMessage objects
 */
export const convertToUIMessages = (
  messages: DatabaseMessage[]
): UIMessage[] => {
  return messages.map((m) => ({
    id: m.id,
    role: (["system", "user", "assistant"].includes(m.role)
      ? (m.role as "system" | "user" | "assistant")
      : "user") as "system" | "user" | "assistant",
    parts: [
      ...(m.toolSnapshots ?? []).map((ts) => ({
        type: "tool-" + ts.toolName,
        state: ts.isExecuted ? "output-available" : "output-error",
        input: ts.input,
        output: ts.output,
      })),
      {
        type: "text",
        text: m.content ?? "" + m.toolSnapshots?.toString(),
      },
    ],
  })) as UIMessage[];
};

/**
 * Convert a single database message to UIMessage format
 * @param message Single database message
 * @returns UIMessage object
 */
export const convertSingleToUIMessage = (
  message: DatabaseMessage
): UIMessage => {
  return {
    id: message.id,
    role: (["system", "user", "assistant"].includes(message.role)
      ? (message.role as "system" | "user" | "assistant")
      : "user") as "system" | "user" | "assistant",
    parts: [
      ...(message.toolSnapshots ?? []).map((ts) => ({
        type: "tool-" + ts.toolName,
        state: ts.isExecuted ? "output-available" : "output-error",
        input: ts.input,
        output: ts.output,
      })),
      {
        type: "text",
        text: message.content ?? "" + message.toolSnapshots?.toString(),
      },
    ],
  } as UIMessage;
};

// lib/convertToUIMessage.ts
export const convertToDeepSearchUIMessages = (
  messages: DeepSearchDBMessage[]
): DeepSearchUIMessage[] => {
  return messages.map((m) => ({
    id: m.id!,
    role: ["system", "user", "assistant"].includes(m.role)
      ? (m.role as "system" | "user" | "assistant")
      : "user",
    metadata: {
      progress: m.progress ?? 0,
      isDeepSearchInitiated: m.isDeepSearchInitiated ?? false,
    },
    parts: [
      ...(m.isDeepSearchInitiated
        ? [
            {
              type: "data-deep-search-progress",
              data: {
                progress: m.progress ?? 0,
                isDeepSearchInitiated: m.isDeepSearchInitiated ?? false,
              },
            },
          ]
        : []),
      {
        type: "text" as const,
        text: m.content ?? "",
      },
    ],
  })) as DeepSearchUIMessage[];
};
