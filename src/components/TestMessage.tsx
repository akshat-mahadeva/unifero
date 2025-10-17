"use client";

import { useEffect, useState } from "react";
import type { TestMessage } from "@/types/testMessage";
import {
  createMessage,
  terminateMessage,
  keepAliveMessage,
} from "@/actions/testmessage.actions";
import { Button } from "./ui/button";

const SESSION_ID = "default-session";

export default function Page() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await createMessage(SESSION_ID, newText || "New deep search");
      setNewText("");
    } catch (err) {
      alert(err);
    }
    setLoading(false);
  }

  async function handleTerminate(id: string) {
    await terminateMessage(id);
  }

  async function handleKeepAlive(id: string) {
    await keepAliveMessage(id);
  }

  useEffect(() => {
    const evt = new EventSource(`/api/stream/${SESSION_ID}`);

    evt.onmessage = (e) => {
      if (e.data) {
        const data = JSON.parse(e.data) as TestMessage[];
        setMessages(data);
      }
    };

    return () => evt.close();
  }, []);

  const running = messages.some((m) => m.status === "running");

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Enter message text..."
          className="border rounded px-3 py-2 flex-1"
        />
        <Button onClick={handleSend} disabled={loading || running}>
          {running ? "Wait for previous..." : "Send"}
        </Button>
      </div>

      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="border rounded-lg p-4 flex flex-col gap-2 "
          >
            <div className="flex justify-between items-center">
              <p className="font-medium">{msg.text}</p>
              <p
                className={`text-sm ${
                  msg.status === "completed"
                    ? "text-green-600"
                    : msg.status === "terminated"
                    ? "text-red-600"
                    : "text-blue-600"
                }`}
              >
                {msg.status}
              </p>
            </div>

            <div className="h-3 w-full bg-card rounded">
              <div
                className={`h-full rounded ${
                  msg.status === "terminated" ? "bg-red-400" : "bg-blue-500"
                }`}
                style={{ width: `${msg.progress}%` }}
              ></div>
            </div>

            <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
              {msg.reasoning}
            </pre>

            {msg.status === "running" && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleKeepAlive(msg.id)}
                  className="text-blue-600 text-sm underline"
                >
                  Keep Alive
                </button>
                <button
                  onClick={() => handleTerminate(msg.id)}
                  className="text-red-600 text-sm underline"
                >
                  Terminate
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
