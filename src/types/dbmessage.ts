// Types that correspond to the Prisma models for ease-of-use in the app code
// We intentionally keep these lightweight and optional on some fields to match
// what callers often have available (e.g. before DB relations are loaded).

export type ToolSnapshot = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  toolName: string;
  input?: unknown;
  isExecuted?: boolean;
  output?: unknown;
  messageId?: string;
};

export type DBMessage = {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role: "user" | "assistant" | "system" | string;
  content?: string | null;
  sessionId?: string;
  // This matches the Prisma relation field name `toolSnapshots` used in the code
  toolSnapshots?: ToolSnapshot[] | null;
};
