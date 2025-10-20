import { UIMessage } from "ai";
import z from "zod";
import { DeepSearchRole, DeepSearchStepType } from "@/generated/prisma";

export { DeepSearchRole, DeepSearchStepType };

export type DeepSearchSource = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  url: string;
  favicon?: string | null;
  content?: string | null;
  images?: unknown;
  publishedDate?: Date | null;
  messageId: string;
  stepId?: string | null;
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
  DeepSearchSource: DeepSearchSource[];
};

export type DeepSearchStep = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  stepName: string;
  isExecuted: boolean;
  input: unknown;
  output: unknown;
  reasoningText?: string | null;
  type: DeepSearchStepType;
  deepSearchMsgId: string;
  deepSearchMessage?: DeepSearchMessage;
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
  toolSnapshots?: DeepSearchToolSnapshot[];
  deepSearchSteps?: DeepSearchStep[];
  deepSearchSources?: DeepSearchSource[];
  // Prisma returns capitalized property names
  DeepSearchStep?: DeepSearchStep[];
  DeepSearchSource?: DeepSearchSource[];
  DeepSearchToolSnapshot?: DeepSearchToolSnapshot[];
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
    messageId: z.string(),
    text: z.string(),
    state: z.union([z.literal("streaming"), z.literal("done")]).optional(),
    isDeepSearchInitiated: z.boolean().optional(),
  }),
  deepSearchReasoningPart: z.object({
    type: z.literal("deep-search-reasoning"),
    stepId: z.string().optional(),
    reasoningText: z.string(),
    reasoningType: z
      .enum(["analysis", "search", "evaluation", "report"])
      .default("analysis"),
    search: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          favicon: z.string(),
        })
      )
      .optional(),
  }),
  deepSearchSourcePart: z.object({
    type: z.literal("deep-search-source"),
    stepId: z.string().optional(),
    name: z.string(),
    url: z.string(),
    content: z.string().optional(),
    favicon: z.string().optional(),
    images: z.array(z.string()).optional(),
  }),

  deepSearchReportPart: z.object({
    type: z.literal("deep-search-report"),
    id: z.string(),
    reportText: z.string(),
  }),
});

type MyDataPart = z.infer<typeof dataPartSchema>;

export type DeepSearchUIMessage = UIMessage<MyMetadata, MyDataPart>;
