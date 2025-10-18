import messagesData from "./messages.json";

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

interface Message {
  role: "user" | "assistant";
  content: string;
  deepSearch?: boolean;
  progress?: number;
  sources?: string[];
  reasoningSteps?: ReasoningStep[];
  sourcesData?: Source[];
}

export const messages = messagesData as Message[];
