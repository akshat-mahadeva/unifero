import Chat from "@/components/chat/Chat";
import { generateId } from "ai";

export default async function Page() {
  const id = generateId();
  if (!id) {
    // Throw to let Next.js render the nearest error boundary (src/app/(app)/error.tsx)
    throw new Error("Error generating session ID");
  }

  return <Chat sessionId={id} />;
}
