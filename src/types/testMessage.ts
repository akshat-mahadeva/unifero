export type TestMessageStatus = "running" | "completed" | "terminated";

export interface TestMessage {
  id: string;
  sessionId: string;
  text: string;
  progress: number;
  reasoning: string | null;
  status: TestMessageStatus;
  createdAt: string;
  updatedAt: string;
}
