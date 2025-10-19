import { UIMessage } from "ai";
import { DBMessage } from "@/types/dbmessage";

export function sanitizeMessages(messages: DBMessage[]) {
  const safeMessages: UIMessage[] = (messages ?? [])
    .slice(-10)
    .map((m, idx) => ({
      id: m.id ?? `msg-${idx}`,
      role: (["system", "user", "assistant"].includes(m.role)
        ? (m.role as "system" | "user" | "assistant")
        : "user") as "system" | "user" | "assistant",
      parts: [
        {
          type: "text",
          // If toolSnapshots exist, stringify them to a compact JSON string
          text:
            m.content ??
            (m.toolSnapshots ? JSON.stringify(m.toolSnapshots) : ""),
        },
      ],
    })) as UIMessage[];
  return safeMessages;
}

export const extractTextFromMessage = (message: UIMessage): string => {
  return message.parts
    .map((part) => {
      if (part.type === "text" && "text" in part) {
        return part.text;
      }
      return "";
    })
    .join("\n");
};
