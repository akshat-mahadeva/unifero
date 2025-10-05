import Chat from "@/components/chat/Chat";
import { generateId } from "ai";
import React from "react";

const page = () => {
  const id = generateId();
  return <Chat sessionId={id} />;
};

export default page;
