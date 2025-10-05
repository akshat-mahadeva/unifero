"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Fragment, useState } from "react";
import { UIMessage, useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import { Loader } from "@/components/ai-elements/loader";
import { Action, Actions } from "@/components/ai-elements/actions";
import { models } from "@/lib/models";
import Image from "next/image";
import {
  WebSearchToolUIPart,
  WebSearchUIRenderer,
} from "./parts/WebsearchPart";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import ChatHeader from "./ChatHeader";
import { useQueryClient } from "@tanstack/react-query";
import { sessionKeys } from "@/hooks/use-sessions-query";
import { usePathname } from "next/navigation";

const Chat = ({
  sessionId,
  initialMessages = [],
  sessionTitle,
}: {
  sessionId: string;
  initialMessages?: UIMessage[];
  sessionTitle?: string;
}) => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const queryClient = useQueryClient();
  const pathname = usePathname();

  // Dynamically determine if we're on the home page
  const isHomePage = pathname === "/";
  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: (request) => {
        // Get the prompt from the message being sent
        const lastMessage = request.messages[request.messages.length - 1];
        const prompt =
          lastMessage?.parts?.[0]?.type === "text"
            ? lastMessage.parts[0].text
            : "";

        const requestBody = {
          prompt: prompt,
          sessionId: sessionId,
          webSearch: webSearch,
          model: model,
        };
        return {
          body: requestBody,
        };
      },
    }),
    messages: initialMessages,
    onFinish: () => {
      // Only update URL if we're on the home page (new chat)
      // Don't update if we're already on a search page to avoid hijacking navigation
      if (window.location.pathname === "/") {
        window.history.replaceState({}, "", `/${sessionId}`);
        // Add a small delay to ensure the session is saved before invalidating
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: sessionKeys.detail(sessionId),
          });
        }, 100);
      }
      window.dispatchEvent(new CustomEvent("chat-history-updated"));
    },
    onError: (error) => {
      console.log("[stream_error]:", error);
      toast.error(`Error in chat: ${error.message}`);
    },
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });
    setInput("");
  };

  return (
    <div className=" relative w-full flex flex-col flex-1 overflow-hidden">
      <ChatHeader
        isHomePage={isHomePage}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
      />
      <div className="flex flex-col flex-1 overflow-hidden max-w-4xl w-full mx-auto p-4">
        <Conversation className="flex-1 w-full">
          <ConversationContent className="w-full">
            {messages.length === 0 && isHomePage ? (
              <ConversationEmptyState
                className="my-auto"
                icon={
                  <Image
                    src={"/unifero.png"}
                    alt="Unifero Logo"
                    width={200}
                    height={200}
                    className=" mb-2"
                  />
                }
                title="Ask Anything to Start Chat"
                description=""
              />
            ) : (
              messages.map((message) => (
                <div key={message.id}>
                  <Fragment>
                    <Message
                      from={message.role}
                      className="flex items-center gap-2 w-full"
                    >
                      <MessageContent>
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "tool-webSearchTool":
                              const webSearchPart = part as WebSearchToolUIPart;

                              return (
                                <WebSearchUIRenderer
                                  key={`${message.id}-${i}`}
                                  part={webSearchPart}
                                />
                              );
                            case "text":
                              return (
                                <Fragment key={`${message.id}-${i}`}>
                                  <Response>{part.text}</Response>

                                  {message.role === "assistant" &&
                                    i === messages.length - 1 && (
                                      <Actions className="mt-2">
                                        <Action
                                          onClick={() => regenerate()}
                                          label="Retry"
                                        >
                                          <RefreshCcwIcon className="size-3" />
                                        </Action>
                                        <Action
                                          onClick={() =>
                                            navigator.clipboard.writeText(
                                              part.text
                                            )
                                          }
                                          label="Copy"
                                        >
                                          <CopyIcon className="size-3" />
                                        </Action>
                                      </Actions>
                                    )}
                                </Fragment>
                              );
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  </Fragment>
                </div>
              ))
            )}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4"
          globalDrop
          multiple
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton
                variant={webSearch ? "default" : "ghost"}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem
                      key={model.value}
                      value={model.value}
                    >
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default Chat;
