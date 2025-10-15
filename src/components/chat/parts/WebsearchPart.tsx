"use client";

import {
  Tool,
  ToolHeader,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ToolOutput,
  // ToolInput,
  // ToolOutput,
} from "@/components/ai-elements/tool";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ToolUIPart } from "ai";
import { Search } from "lucide-react";
import Link from "next/link";

export type WebSearchToolInput = {
  query: string;
};

export type WebSearchSource = {
  title: string;
  url: string;
  text: string;
  image?: string;
};

export type WebSearchResult = {
  sources: WebSearchSource[];
};

export type WebSearchToolOutput = {
  results: WebSearchResult[];
};

export type WebSearchToolUIPart = ToolUIPart<{
  web_search: {
    input: WebSearchToolInput;
    output: WebSearchToolOutput;
  };
}>;

export const WebSearchUIRenderer = ({
  part,
}: {
  part: WebSearchToolUIPart;
}) => {
  return (
    <Tool className="w-full">
      <ToolHeader
        icon={<Search className="h-4 w-4 text-muted-foreground" />}
        title="Web Search"
        type={part.type}
        state={part.state}
      />
      <div className="py-2 w-full ">
        {/* <ToolInput input={part.input} /> */}
        {/* <ToolOutput
          output={part.output}
          errorText={part.errorText || undefined}
        /> */}
        {part.errorText && (
          <p className="text-sm text-destructive">{part.errorText}</p>
        )}

        <div className="flex flex-col w-full gap-2">
          {part?.output?.results &&
            part.output.results.map((result: WebSearchResult, rIndex: number) =>
              result.sources?.map((source: WebSearchSource, sIndex: number) => (
                <Card
                  key={`${rIndex}-${sIndex}`}
                  className="p-3 flex flex-row items-center gap-3 bg-transparent"
                >
                  <Avatar className="h-18 w-18 flex-shrink-0 rounded-md">
                    <AvatarImage
                      src={source.image}
                      alt={source.title}
                      className="rounded-md object-cover"
                    />
                    <AvatarFallback className="rounded-md">
                      {source.title.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={source.url}>
                      <CardTitle className=" text-sm">{source.title}</CardTitle>
                    </Link>
                    <CardDescription>
                      {source.text.slice(0, 200)}
                      {source.text.length > 200 ? "..." : ""}
                    </CardDescription>
                  </div>
                </Card>
              ))
            )}
        </div>
      </div>
    </Tool>
  );
};
