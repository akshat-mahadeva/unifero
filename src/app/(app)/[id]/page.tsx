import { notFound } from "next/navigation";

import Chat from "@/components/chat/Chat";
import { getSessionById } from "@/actions/chat.actions";
import { UIMessage } from "ai";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const chat = await getSessionById(id);

  if (!chat) {
    notFound();
  }

  const uiMessages = chat.messages.map((m) => ({
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
        text: m.content ?? "" + m.toolSnapshots.toString(),
      },
    ],
  })) as UIMessage[];

  return (
    <>
      <Chat
        sessionId={chat.id}
        sessionTitle={chat.title || undefined}
        initialMessages={uiMessages}
      />
    </>
  );
}
