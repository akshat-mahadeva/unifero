// This File is just for UI Reference of Deep Search Chat Component Restrictly don't edit anything in this file
"use client";
import React, { useState } from "react";
import { Separator } from "../ui/separator";
import { Card, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronRight, ThumbsUpIcon, ThumbsDown, Copy } from "lucide-react";
import { Progress } from "../ui/progress";
import { Response } from "../ai-elements/response";
import { Badge } from "../ui/badge";
import DeepSearchCanvas from "./DeepSearchCanvasUI";
import ImageWithFallback from "./ImageWithFallback";
import { useIsMobile } from "../../hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { messages } from "../../lib/messages";
import { UIMessage } from "ai";

const DeepSearchChatUI = ({
  sessionId,
  initialMessages,
  isHomePage,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  isHomePage: boolean;
}) => {
  const isMobile = useIsMobile();
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(
    null
  );
  const [initialTab, setInitialTab] = useState<"reasoning" | "sources">(
    "reasoning"
  );

  const messagesJSX = (
    <div
      className={`flex-1 w-full max-w-4xl mx-auto flex flex-col ${
        isMobile ? "gap-7" : "gap-8 p-5"
      } overflow-y-auto min-h-0`}
    >
      {messages.map((msg, index) => (
        <div key={index} className="flex flex-col gap-4">
          {msg.role === "user" && (
            <h1 className="text-2xl font-medium font-sans">{msg.content}</h1>
          )}
          {msg.role === "assistant" && (
            <>
              <Separator />
              <div
                className={`flex flex-col gap-4 ${!isMobile ? "flex-1" : ""}`}
              >
                {msg.deepSearch && (
                  <Card
                    className={`py-4 ${
                      isMobile ? "" : "bg-transparent"
                    } rounded-sm`}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2 justify-between">
                        <div className="text-sm">
                          Running Deep Search... <span>({msg.progress}%)</span>
                        </div>
                        <Button
                          size={"sm"}
                          variant={"ghost"}
                          onClick={() => {
                            setInitialTab("reasoning");
                            setActiveMessageIndex(index);
                          }}
                        >
                          steps <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <Separator />
                      <Progress value={msg.progress} className="mt-2" />
                    </CardHeader>
                  </Card>
                )}
                <div className={`text-sm ${!isMobile ? "flex-1" : ""}`}>
                  <Response>{msg.content}</Response>
                </div>
                {msg.deepSearch && (
                  <div className="flex flex-col gap-2 text-sm">
                    <h1>Used Sources:</h1>
                    <div className="flex gap-2 flex-wrap">
                      {msg.sources?.map((source, i) => {
                        const sourceData = msg.sourcesData?.find(
                          (s) => s.name === source
                        );
                        return (
                          <Badge key={i} className="flex items-center gap-1">
                            {sourceData && (
                              <ImageWithFallback
                                src={sourceData.favicon}
                                alt={sourceData.name}
                                width={16}
                                height={16}
                                className="w-3 h-3"
                              />
                            )}
                            <span>{source}</span>
                          </Badge>
                        );
                      })}
                      <Button
                        size={"sm"}
                        variant={"ghost"}
                        className="text-xs"
                        onClick={() => {
                          setInitialTab("sources");
                          setActiveMessageIndex(index);
                        }}
                      >
                        Show More <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="ghost">
                        <ThumbsUpIcon className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigator.clipboard.writeText(msg.content)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  if (!isMobile) {
    return (
      <div className="flex gap-4 h-dvh w-full">
        {messagesJSX}
        {activeMessageIndex !== null && (
          <div className=" flex-1 border-l min-h-0">
            <DeepSearchCanvas
              reasoningSteps={
                messages[activeMessageIndex]?.reasoningSteps || []
              }
              sources={messages[activeMessageIndex]?.sourcesData || []}
              onClose={() => setActiveMessageIndex(null)}
              initialTab={initialTab}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col  h-dvh p-5 w-full bg-card">
        {messagesJSX}
      </div>
      <Sheet
        open={activeMessageIndex !== null}
        onOpenChange={(open) =>
          setActiveMessageIndex(open ? activeMessageIndex : null)
        }
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Deep Search Canvas</SheetTitle>
          </SheetHeader>
          <DeepSearchCanvas
            reasoningSteps={messages[activeMessageIndex!]?.reasoningSteps || []}
            sources={messages[activeMessageIndex!]?.sourcesData || []}
            onClose={() => setActiveMessageIndex(null)}
            initialTab={initialTab}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DeepSearchChatUI;
