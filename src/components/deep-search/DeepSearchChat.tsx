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
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Fragment, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { CopyIcon } from "lucide-react";
import { Action, Actions } from "@/components/ai-elements/actions";
import { models } from "@/lib/models";
import Image from "next/image";

import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import ChatHeader from "./DeepSearchHeader";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { useQueryClient } from "@tanstack/react-query";
import { sessionKeys } from "@/hooks/use-sessions-query";
import { usePathname } from "next/navigation";
import { getRandomDeepSearchSuggestions } from "@/lib/get-suggestions";
import { LoaderOne } from "../ui/loaders";
import { ChatSDKError } from "@/lib/errors";
import { Card, CardHeader } from "../ui/card";
import { Progress } from "../ui/progress";
import { DeepSearchUIMessage } from "@/types/deep-search";
import { Separator } from "../ui/separator";

const DeepSearchChat = ({
  sessionId,
  initialMessages = [],
  sessionTitle,
}: {
  sessionId: string;
  initialMessages?: DeepSearchUIMessage[];
  sessionTitle?: string;
}) => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [hasOpengingDeepSearch] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    try {
      bottomRef.current?.scrollIntoView({ behavior });
    } catch (err) {
      console.debug(err);
    }
  };

  // Dynamically determine if we're on the home page
  const isHomePage = pathname === "/" || pathname === "/deep-search";

  // Initialize suggestions only on client side to avoid hydration mismatch
  useEffect(() => {
    if (isHomePage && initialMessages.length === 0) {
      setSuggestions(getRandomDeepSearchSuggestions(5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [isHomePage, initialMessages.length]);

  const { messages, sendMessage, status } = useChat<DeepSearchUIMessage>({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "/api/deep-search",
      prepareSendMessagesRequest: (request) => {
        const lastMessage = request.messages[request.messages.length - 1];
        const prompt =
          lastMessage?.parts?.[0]?.type === "text"
            ? lastMessage.parts[0].text
            : "";

        if (
          window.location.pathname === "/" ||
          window.location.pathname === "/deep-search"
        ) {
          window.history.replaceState({}, "", `/deep-search/${sessionId}`);
          setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: sessionKeys.detail(sessionId),
            });
          }, 100);
        }
        window.dispatchEvent(new CustomEvent("chat-history-updated"));

        return {
          body: {
            prompt,
            sessionId,
            model,
          },
        };
      },

      prepareReconnectToStreamRequest: ({ id }) => {
        console.log(`Attempting to reconnect to stream for session: ${id}`);
        return {
          api: `/api/deep-search/${id}/stream`,
          credentials: "include",
        };
      },
    }),
    messages: initialMessages,
    resume: !isHomePage, // Always enable resume (removed condition)
    onData: (dataPart) => {
      // Clear suggestions when user starts receiving data
      if (showSuggestions) {
        setShowSuggestions(false);
      }

      // Debug log all streaming data
      console.log("Streaming data received:", dataPart);
    },
    onFinish: () => {
      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/deep-search"
      ) {
        window.history.replaceState({}, "", `/deep-search/${sessionId}`);
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: sessionKeys.detail(sessionId),
          });
        }, 100);
      }
      window.dispatchEvent(new CustomEvent("chat-history-updated"));
    },

    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    },
  });

  // Auto-scroll when messages change or when status updates
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, status]);

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
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({
      text: suggestion,
      files: [],
    });
    setInput("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full flex flex-col flex-1 overflow-hidden">
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
                    width={160}
                    height={160}
                    className="mb-2"
                  />
                }
                title={
                  <TextGenerateEffect
                    words={"Welcome to Unifero Deep Search"}
                    className="text-2xl"
                  />
                }
                description=""
              />
            ) : (
              <>
                {/* Render actual messages */}
                {messages.map((message) => {
                  return (
                    <div key={message.id}>
                      <Message
                        from={message.role}
                        className="flex items-center gap-2 w-full"
                      >
                        <MessageContent>
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case "data-deep-search-progress":
                                const progressData = part.data as {
                                  progress: number;
                                  messageId: string;
                                  isDeepSearchInitiated: boolean;
                                };
                                if (message.role !== "assistant") return null;
                                return (
                                  <Card
                                    className="py-4 rounded-sm bg-transparent mb-4"
                                    key={`${message.id}-progress-card`}
                                  >
                                    <CardHeader>
                                      <div className="flex items-center gap-2 justify-between">
                                        <div className="text-sm">
                                          {progressData.progress === 100
                                            ? "Deep search completed"
                                            : "Running deep search..."}
                                          <span className="ml-2 font-medium">
                                            {progressData.progress}%{" "}
                                          </span>
                                        </div>
                                      </div>
                                      <Separator className="my-2" />
                                      <Progress
                                        value={progressData.progress}
                                        className="mt-2"
                                      />
                                    </CardHeader>
                                  </Card>
                                );
                              case "text":
                                return (
                                  <Response key={`${message.id}-${i}`}>
                                    {part.text}
                                  </Response>
                                );
                            }
                          })}

                          {message.role === "assistant" && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    message.parts
                                      .filter((part) => part.type === "text")
                                      .map((part) => part.text)
                                      .join("\n")
                                  )
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                        </MessageContent>
                      </Message>
                    </div>
                  );
                })}
              </>
            )}
            {status === "submitted" && (
              <div className="flex items-center text-sm gap-2">
                <LoaderOne />
              </div>
            )}
            <div ref={bottomRef} />
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {isHomePage &&
          messages.length === 0 &&
          showSuggestions &&
          suggestions.length > 0 && (
            <div className="mb-4">
              <Suggestions>
                {suggestions.map((suggestion, index) => (
                  <Suggestion
                    key={`${suggestion}-${index}`}
                    suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    className="whitespace-nowrap bg-transparent border text-sm "
                  />
                ))}
              </Suggestions>
            </div>
          )}

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4 p-1 border shadow-none rounded-sm"
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
            <PromptInputSubmit
              className="rounded-sm"
              disabled={!input || hasOpengingDeepSearch} // 🔥 Disable during deep search
              status={status}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default DeepSearchChat;
