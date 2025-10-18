// This File is just for UI Reference of Deep Search Chat Component Restrictly don't edit anything in this file

"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Check, Dot, Search, X } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";
import { Badge } from "../ui/badge";
import { useIsMobile } from "../../hooks/use-mobile";

interface ReasoningStep {
  id: number;
  step: string;
  reasoning?: string;
  evolution?: string;
  sources?: string;
  progress: number;
}

interface Source {
  id: number;
  name: string;
  url: string;
  favicon: string;
  content: string;
  images: string[];
}

const DeepSearchCanvasUI = ({
  reasoningSteps,
  sources,
  onClose,
  initialTab,
}: {
  reasoningSteps: ReasoningStep[];
  sources: Source[];
  onClose?: () => void;
  initialTab?: "reasoning" | "sources";
}) => {
  const [activeTab, setActiveTab] = useState<"reasoning" | "sources">(
    initialTab || "reasoning"
  );

  const isMobile = useIsMobile();

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-dvh">
      <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("reasoning")}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === "reasoning"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            Reasoning
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === "sources"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            Sources
          </button>
        </div>

        <div className="ml-auto">
          {!isMobile && (
            <Button size={"icon"} onClick={onClose} variant={"outline"}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "reasoning" && (
          <div className="space-y-4">
            {reasoningSteps.map((step) => {
              const icon =
                step.id === 3 ? (
                  <Search className="h-4 w-4" />
                ) : step.id === 4 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Dot className="h-4 w-4" />
                );
              return (
                <div key={step.id} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="font-medium">{step.step}</span>
                  </div>
                  {step.reasoning && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {step.reasoning}
                    </p>
                  )}
                  {step.sources && (
                    <div className="text-sm mb-2">
                      <div className="flex flex-wrap gap-2 mt-1">
                        {step.sources.split(", ").map((name, i) => {
                          const source = sources.find((s) => s.name === name);
                          return source ? (
                            <Badge key={i} className="flex items-center gap-1">
                              {source.favicon && (
                                <ImageWithFallback
                                  src={source.favicon}
                                  alt={source.name}
                                  width={16}
                                  height={16}
                                  className="w-3 h-3"
                                />
                              )}
                              <span>{source.name}</span>
                            </Badge>
                          ) : (
                            <Badge key={i}>{name}</Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === "sources" && (
          <div className="space-y-4">
            {sources.map((source) => (
              <div key={source.id} className="border rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  {source.favicon ? (
                    <ImageWithFallback
                      src={source.favicon}
                      alt={source.name}
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                  ) : null}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {source.name}
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">
                  {source.content}
                </p>
                {source.images.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {source.images.map((img: string, i: number) => (
                      <ImageWithFallback
                        key={i}
                        src={img}
                        alt=""
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepSearchCanvasUI;
