import { notFound } from "next/navigation";

import { convertToDeepSearchUIMessages } from "@/lib/convertToUIMessage";
import DeepSearchChat from "@/components/deep-search/DeepSearchChat";
import { getDeepSearchSessionById } from "@/actions/deep-search.actions";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const chat = await getDeepSearchSessionById(id);

  if (!chat) {
    return notFound();
  }

  // console.log("Deep Search Chat Messages:", chat.messages.length);

  const uiMessages = convertToDeepSearchUIMessages(chat.messages);

  return (
    <>
      <DeepSearchChat sessionId={chat.id} initialMessages={uiMessages} />
    </>
  );
}
