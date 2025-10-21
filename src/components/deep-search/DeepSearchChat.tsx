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
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { Check, CopyIcon, Loader2 } from "lucide-react";
import { Action, Actions } from "@/components/ai-elements/actions";
import { models } from "@/lib/models";
import Image from "next/image";

import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import ChatHeader from "./DeepSearchHeader";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { useQueryClient } from "@tanstack/react-query";
import { deepSearchSessionKeys } from "@/hooks/use-deep-search-sessions";
import { usePathname } from "next/navigation";
import { getRandomDeepSearchSuggestions } from "@/lib/get-suggestions";
import { LoaderOne } from "../ui/loaders";
import { ChatSDKError } from "@/lib/errors";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Progress } from "../ui/progress";
import { DeepSearchUIMessage } from "@/types/deep-search";
import { Separator } from "../ui/separator";
import DeepSearchCanvas from "./DeepSearchCanvas";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

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

  // State to track which message's sheet should be open
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    try {
      bottomRef.current?.scrollIntoView({ behavior });
    } catch (err) {
      console.debug(err);
    }
  };

  const isHomePage = pathname === "/" || pathname === "/deep-search";

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
              queryKey: deepSearchSessionKeys.detail(sessionId),
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
    resume: !isHomePage,
    onFinish: () => {
      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/deep-search"
      ) {
        window.history.replaceState({}, "", `/deep-search/${sessionId}`);
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: deepSearchSessionKeys.detail(sessionId),
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
    onData: (dataPart) => {
      // Handle incoming data parts in real-time
      console.log("Received data part:", dataPart);

      // Specifically handle deep search progress parts
      if (dataPart.type === "data-deepSearchDataPart") {
        console.log("Deep search progress update:", dataPart.data);

        // Auto-open the sheet when deep search progress starts (first progress event)
        setOpenSheetId(dataPart.data.messageId);
      }
    },
  });

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
      // files: message.files,
    });
    setInput("");
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({
      text: suggestion,
      // files: [],
    });
    setInput("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full flex flex-col h-screen">
      <ChatHeader
        isHomePage={isHomePage}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
      />
      <div
        className={`flex flex-1 max-w-4xl w-full mx-auto flex-col overflow-hidden p-4`}
      >
        <Conversation className="flex-1 w-full overflow-hidden">
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
                {messages.map((message) => {
                  return (
                    <div key={message.id}>
                      <Message
                        from={message.role}
                        className="flex items-center gap-2 w-full"
                      >
                        <MessageContent>
                          {(() => {
                            const progressParts = message.parts.filter(
                              (p) => p.type === "data-deepSearchDataPart"
                            );
                            const latestProgressPart =
                              progressParts[progressParts.length - 1];
                            const latestProgress =
                              progressParts.length > 0
                                ? progressParts[progressParts.length - 1]
                                : null;

                            return (
                              <>
                                {latestProgress &&
                                  message.role === "assistant" && (
                                    <Card
                                      className="py-4 rounded-sm bg-transparent mb-4"
                                      key={`${message.id}-progress-card`}
                                    >
                                      <CardHeader>
                                        <div className="flex items-center gap-2 justify-between">
                                          <div className="flex items-center gap-2">
                                            <div>
                                              {latestProgress.data.progress ===
                                              100 ? (
                                                <Check className="h-4 w-4 text-primary" />
                                              ) : (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                              )}
                                            </div>
                                            <div className="text-sm">
                                              {latestProgress.data.progress ===
                                              100
                                                ? "Deep search completed"
                                                : "Running deep search..."}
                                              <span className="ml-2 font-medium">
                                                {latestProgress.data.progress}%
                                              </span>
                                            </div>

                                            {/* Showing the copy report button */}
                                            {latestProgress.data.progress ===
                                              100 && (
                                              <Button
                                                size={"sm"}
                                                variant={"outline"}
                                                onClick={() =>
                                                  navigator.clipboard.writeText(
                                                    message.parts
                                                      .filter(
                                                        (part) =>
                                                          part.type ===
                                                          "data-deepSearchReportPart"
                                                      )
                                                      .map(
                                                        (part) =>
                                                          part.data.reportText
                                                      )
                                                      .join("\n")
                                                  )
                                                }
                                              >
                                                <CopyIcon className="size-3" />
                                                <span>Copy Report</span>
                                              </Button>
                                            )}
                                          </div>

                                          <Sheet
                                            defaultOpen={
                                              openSheetId === message.id
                                            }
                                          >
                                            <SheetTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                              >
                                                View Activity
                                              </Button>
                                            </SheetTrigger>

                                            <SheetContent
                                              side="right"
                                              className="w-full sm:max-w-lg"
                                            >
                                              <SheetHeader>
                                                <SheetTitle>
                                                  Deep Search Activity
                                                </SheetTitle>
                                              </SheetHeader>
                                              <DeepSearchCanvas
                                                messageId={message.id}
                                                reasoningParts={message.parts
                                                  .filter(
                                                    (part) =>
                                                      part.type ===
                                                      "data-deepSearchReasoningPart"
                                                  )
                                                  .map((part) => part.data)}
                                                sourceParts={message.parts
                                                  .filter(
                                                    (part) =>
                                                      part.type ===
                                                      "data-deepSearchSourcePart"
                                                  )
                                                  .map((part) => ({
                                                    id: part.id,
                                                    source: {
                                                      name: part.data.name,
                                                      url: part.data.url,
                                                      content:
                                                        part.data.content,
                                                      favicon:
                                                        part.data.favicon,
                                                      images: part.data.images,
                                                    },
                                                  }))}
                                                initialTab="reasoning"
                                              />
                                            </SheetContent>
                                          </Sheet>
                                        </div>
                                        <Separator className="my-2" />
                                        <Progress
                                          value={latestProgress.data.progress}
                                          className="mt-2"
                                        />
                                      </CardHeader>
                                      <CardContent>
                                        {latestProgressPart?.data
                                          ?.isDeepSearchInitiated &&
                                          !(
                                            latestProgress.data.progress === 100
                                          ) && (
                                            <Response className="text-sm text-muted-foreground animate-pulse">
                                              {latestProgressPart.data.text}
                                            </Response>
                                          )}

                                        {/* If any of the parts are data-deepSearchReportPart */}
                                        {message.parts.some(
                                          (part) =>
                                            part.type ===
                                            "data-deepSearchReportPart"
                                        ) && <Separator className="my-2" />}

                                        {message.parts.map((part, i) => {
                                          if (
                                            part.type ===
                                            "data-deepSearchReportPart"
                                          ) {
                                            return (
                                              <Response
                                                key={`${message.id}-${i}`}
                                              >
                                                {part.data.reportText}
                                              </Response>
                                            );
                                          }
                                          return null;
                                        })}
                                      </CardContent>
                                    </Card>
                                  )}
                                {message.parts.map((part, i) => {
                                  if (part.type === "text") {
                                    return (
                                      <Response key={`${message.id}-${i}`}>
                                        {part.text}
                                      </Response>
                                    );
                                  }
                                  return null;
                                })}
                              </>
                            );
                          })()}

                          {message.role === "assistant" && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    message.parts
                                      .filter(
                                        (part) =>
                                          part.type === "text" ||
                                          part.type ===
                                            "data-deepSearchReportPart"
                                      )
                                      .map((part) =>
                                        part.type === "text"
                                          ? part.text
                                          : part.data.reportText
                                      )
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
                    className="whitespace-nowrap bg-transparent border text-xs "
                  />
                ))}
              </Suggestions>
            </div>
          )}

        <PromptInput
          onSubmit={handleSubmit}
          className=" p-1 border shadow-none rounded-sm"
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
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default DeepSearchChat;
