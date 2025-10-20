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

  // logging last message

  // const lastMessage = chat.messages[chat.messages.length - 1];
  // console.log(
  //   "lastMessage",
  //   lastMessage.DeepSearchStep.find((step) => step.type === "report")?.output
  // );

  const uiMessages = convertToDeepSearchUIMessages(chat.messages);

  return (
    <>
      <DeepSearchChat sessionId={chat.id} initialMessages={uiMessages} />
    </>
  );
}
