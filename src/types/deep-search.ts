import { UIMessage } from "ai";
import z from "zod";

export type DeepSearchSource = {
  id?: string | number;
  name: string;
  url: string;
  favicon?: string;
  content?: string;
  images?: string[];
};

export type DeepSearchReasoningStep = {
  id: number | string;
  step: string;
  reasoning?: string;
  content?: string;
  sources?: string; // comma-separated names or similar
  progress?: number;
};

export type DeepSearchToolResult = {
  toolName: string;
  input?: unknown;
  output?: unknown;
  isExecuted?: boolean;
};

// Tool snapshot persisted in DB (lightweight)
export type DeepSearchToolSnapshot = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  toolName: string;
  input?: unknown;
  output?: unknown;
  isExecuted?: boolean;
  messageId?: string;
};

export enum DeepSearchStepStatus {
  started = "started",
  completed = "completed",
  failed = "failed",
}

export enum DeepSearchStepType {
  search = "search",
  analyze = "analyze",
  evaluate = "evaluate",
  report = "report",
}

export enum DeepSearchRole {
  user = "user",
  assistant = "assistant",
  system = "system",
}

export type DeepSearchSession = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  title?: string;
  activeStreamId?: string;
  canceledAt?: Date;
  messages: DeepSearchMessage[];
};

export type DeepSearchMessage = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  role: DeepSearchRole;
  content: string;
  progress: number;
  sessionId: string;
  isDeepSearchInitiated: boolean;
  completed: boolean;
  session: DeepSearchSession;
  DeepSearchToolSnapshot: DeepSearchToolSnapshot[];
  DeepSearchStep: DeepSearchStep[];
};

export type DeepSearchStep = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  stepName: string;
  isExecuted: boolean;
  input: unknown;
  output: unknown;
  type: DeepSearchStepType;
  deepSearchMsgId: string;
  deepSearchMessage: DeepSearchMessage;
};

// DB-level message structure for deep search sessions
export type DeepSearchDBMessage = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role: DeepSearchRole;
  content: string;
  progress: number;
  sessionId: string;
  isDeepSearchInitiated: boolean;
  completed: boolean;
  DeepSearchToolSnapshot?: DeepSearchToolSnapshot[];
  DeepSearchStep?: DeepSearchStep[];
};

export type MyMetadata = {
  progress?: number;
  isDeepSearchInitiated?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dataPartSchema = z.object({
  deepSearchDataPart: z.object({
    type: z.literal("deep-search"),
    id: z.string(),
    progress: z.number(),
    text: z.string(),
    state: z.union([z.literal("streaming"), z.literal("done")]).optional(),
  }),
  deepSearchReasoningPart: z.object({
    type: z.literal("deep-search-reasoning"),
    reasoningText: z.string(),
    id: z.string(),
    reasoningType: z
      .enum(["analysis", "search", "evaluation", "report"])
      .default("analysis"),
    search: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        favicon: z.string(),
      })
    ),
  }),
  deepSearchSourcePart: z.object({
    type: z.literal("deep-search-source"),
    id: z.string(),
    source: z.object({
      id: z.string().optional(),
      name: z.string(),
      url: z.string(),
      favicon: z.string().optional(),
      content: z.string().optional(),
      images: z.array(z.string()).optional(),
    }),
  }),

  deepSearchReportPart: z.object({
    type: z.literal("deep-search-report"),
    id: z.string(),
    reportText: z.string(),
  }),
});

type MyDataPart = z.infer<typeof dataPartSchema>;

export type DeepSearchUIMessage = UIMessage<MyMetadata, MyDataPart>;
