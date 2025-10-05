"use client";

import {
  getSessions,
  deleteSession,
  updateSessionTitle,
} from "@/actions/chat.actions";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type SessionWithMessages = Awaited<ReturnType<typeof getSessions>>[0];

export function useSessions() {
  const [sessions, setSessions] = useState<SessionWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSessionById = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success("Chat deleted successfully");

        // If we're currently on this session page, redirect to home
        if (window.location.pathname === `/${sessionId}`) {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
        toast.error("Failed to delete chat");
      }
    },
    [router]
  );

  const updateTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      await updateSessionTitle(sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
      toast.success("Chat title updated");
    } catch (error) {
      console.error("Failed to update session title:", error);
      toast.error("Failed to update chat title");
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Listen for chat history updates
  useEffect(() => {
    const handleChatHistoryUpdate = () => {
      fetchSessions();
    };

    window.addEventListener("chat-history-updated", handleChatHistoryUpdate);
    return () => {
      window.removeEventListener(
        "chat-history-updated",
        handleChatHistoryUpdate
      );
    };
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    deleteSession: deleteSessionById,
    updateTitle,
    refetch: fetchSessions,
  };
}
