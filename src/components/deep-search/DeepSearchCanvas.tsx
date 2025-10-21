"use client";
import React, { useState } from "react";
import { BrainCog, Check, Search, Webhook } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";
import { Badge } from "../ui/badge";
import { Response } from "../ai-elements/response";
import Link from "next/link";

const DeepSearchCanvas = ({
  reasoningParts,
  sourceParts,
  initialTab,
}: {
  messageId: string;
  reasoningParts: Array<{
    reasoningText: string;
    reasoningType: string;
    search?: Array<{ title: string; url: string; favicon: string }>;
  }>;
  sourceParts: Array<{
    id?: string;
    source: {
      name: string;
      url: string;
      content?: string;
      favicon?: string;
      images?: string[];
    };
  }>;
  initialTab?: "reasoning" | "sources";
}) => {
  const [activeTab, setActiveTab] = useState<"reasoning" | "sources">(
    initialTab || "reasoning"
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
        <button
          onClick={() => setActiveTab("reasoning")}
          className={`px-3 py-1 text-sm rounded ${
            activeTab === "reasoning"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          Reasoning ({reasoningParts.length})
        </button>
        <button
          onClick={() => setActiveTab("sources")}
          className={`px-3 py-1 text-sm rounded ${
            activeTab === "sources"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          Sources ({sourceParts.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* <p>Message ID: {messageId}</p> */}
        {activeTab === "reasoning" && (
          <div className="space-y-4">
            {reasoningParts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reasoning steps yet.
              </p>
            ) : (
              reasoningParts.map((part, index) => {
                const icon =
                  part.reasoningType === "search" ? (
                    <Search className="h-4 w-4" />
                  ) : part.reasoningType === "report" ? (
                    <Check className="h-4 w-4" />
                  ) : part.reasoningType === "evaluate" ? (
                    <Webhook className="h-4 w-4 " />
                  ) : (
                    <BrainCog className="h-4 w-4" />
                  );
                return (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className=" text-primary">{icon}</span>
                      <span className="font-medium capitalize">
                        {part.reasoningType}
                      </span>
                    </div>
                    {part.reasoningText && (
                      <Response className=" text-muted-foreground text-sm">
                        {part.reasoningText}
                      </Response>
                    )}
                    {part.search && part.search.length > 0 && (
                      <div className="text-sm mb-2">
                        <div className="flex flex-wrap gap-2 mt-1">
                          {part.search.map((item, i) => (
                            <Link key={i} href={item.url}>
                              <Badge className="flex items-center bg-accent hover:text-primary gap-1 hover:bg-secondary">
                                {item.favicon && (
                                  <ImageWithFallback
                                    src={item.favicon}
                                    alt={item.title}
                                    width={16}
                                    height={16}
                                    className="w-3 h-3"
                                  />
                                )}
                                <span className="text-xs">{item.title}</span>
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "sources" && (
          <div className="space-y-4">
            {sourceParts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sources yet.</p>
            ) : (
              sourceParts.map((part, index) => {
                const source = part.source;
                return (
                  <div key={part.id || index} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {source.favicon && (
                        <ImageWithFallback
                          src={source.favicon}
                          alt={source.name}
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      )}
                      <div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {source.name}
                        </a>
                      </div>
                    </div>
                    {source.content && (
                      <p className="text-sm text-muted-foreground">
                        {source.content.slice(0, 100)}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepSearchCanvas;
