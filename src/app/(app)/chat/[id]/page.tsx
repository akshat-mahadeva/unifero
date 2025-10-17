import { notFound } from "next/navigation";

import Chat from "@/components/chat/Chat";
import { getSessionById } from "@/actions/chat.actions";
import { convertToUIMessages } from "@/lib/convertToUIMessage";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const chat = await getSessionById(id);

  if (!chat) {
    return notFound();
  }

  const uiMessages = convertToUIMessages(chat.messages);

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
