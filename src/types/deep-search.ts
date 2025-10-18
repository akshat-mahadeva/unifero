import { UIMessage } from "ai";

// A single source returned/used by deep search
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
  evolution?: string;
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

// DB-level message structure for deep search sessions
export type DeepSearchDBMessage = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role: "user" | "assistant" | "system";
  content?: string | null;
  sessionId?: string;
  completed?: boolean;
  progress?: number;
  // human-readable list of source names
  sources?: string[];
  isDeepSearchInitiated?: boolean;
  // richer source data
  sourcesData?: DeepSearchSource[];
  reasoningSteps?: DeepSearchReasoningStep[];
  toolSnapshots?: DeepSearchToolSnapshot[] | null;
};

// UI message used by components; extends the generic UIMessage with optional deep-search metadata

type MyMetadata = {
  progress?: number;
  isDeepSearchInitiated?: boolean;
};

export type DeepSearchUIMessage = UIMessage<MyMetadata>; // your metadata
