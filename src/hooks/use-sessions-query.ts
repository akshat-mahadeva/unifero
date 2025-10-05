"use client";

import {
  getSessions,
  deleteSession,
  updateSessionTitle,
  getSessionById,
} from "@/actions/chat.actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

export type SessionWithMessages = Awaited<ReturnType<typeof getSessions>>[0];
export type SessionDetail = Awaited<ReturnType<typeof getSessionById>>;

// Query Keys
export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
};

// Hook for fetching all sessions
export function useSessions() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: sessions = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: getSessions,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (result, deletedSessionId) => {
      // Remove from cache
      queryClient.setQueryData(
        sessionKeys.lists(),
        (old: SessionWithMessages[] = []) =>
          old.filter((s) => s.id !== deletedSessionId)
      );

      // Invalidate session detail cache
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(deletedSessionId),
      });

      // Also invalidate all sessions to ensure consistency
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });

      toast.success("Chat deleted successfully");

      // Dispatch event to notify other components
      window.dispatchEvent(
        new CustomEvent("session-deleted", {
          detail: { sessionId: deletedSessionId },
        })
      );

      // If we're currently on this session page, redirect to home
      if (window.location.pathname === `/${deletedSessionId}`) {
        router.push("/");
      }
    },
    onError: (error) => {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete chat");
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateSessionTitle(sessionId, title),
    onSuccess: (result, { sessionId, title }) => {
      // Update sessions list cache
      queryClient.setQueryData(
        sessionKeys.lists(),
        (old: SessionWithMessages[] = []) =>
          old.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );

      // Update session detail cache if it exists
      queryClient.setQueryData(
        sessionKeys.detail(sessionId),
        (old: SessionDetail | undefined) => (old ? { ...old, title } : old)
      );

      toast.success("Chat title updated");
    },
    onError: (error) => {
      console.error("Failed to update session title:", error);
      toast.error("Failed to update chat title");
    },
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
  }, [queryClient]);

  // Listen for chat history updates (when new chats are created)
  useEffect(() => {
    const handleChatHistoryUpdate = () => {
      refetch();
    };

    window.addEventListener("chat-history-updated", handleChatHistoryUpdate);
    return () => {
      window.removeEventListener(
        "chat-history-updated",
        handleChatHistoryUpdate
      );
    };
  }, [refetch]);

  return {
    sessions,
    loading,
    error,
    deleteSession: deleteSessionMutation.mutate,
    updateTitle: updateTitleMutation.mutate,
    refetch,
    isDeleting: deleteSessionMutation.isPending,
    isUpdatingTitle: updateTitleMutation.isPending,
  };
}

// Hook for fetching a single session
export function useSession(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: session,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: sessionKeys.detail(sessionId!),
    queryFn: () => getSessionById(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if session is not found (it might have been deleted)
      if (error && error.message?.includes("Session not found")) {
        return false;
      }
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
  });

  // Listen for chat history updates to refresh session data
  useEffect(() => {
    const handleChatHistoryUpdate = () => {
      // Invalidate current session cache to get fresh data
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: sessionKeys.detail(sessionId),
        });
      }
    };

    window.addEventListener("chat-history-updated", handleChatHistoryUpdate);
    return () => {
      window.removeEventListener(
        "chat-history-updated",
        handleChatHistoryUpdate
      );
    };
  }, [sessionId, queryClient]);

  const updateTitleMutation = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateSessionTitle(sessionId, title),
    onSuccess: (result, { sessionId, title }) => {
      // Update session detail cache
      queryClient.setQueryData(
        sessionKeys.detail(sessionId),
        (old: SessionDetail | undefined) => (old ? { ...old, title } : old)
      );

      // Update sessions list cache
      queryClient.setQueryData(
        sessionKeys.lists(),
        (old: SessionWithMessages[] = []) =>
          old.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );

      toast.success("Chat title updated");
    },
    onError: (error) => {
      console.error("Failed to update session title:", error);
      toast.error("Failed to update chat title");
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (result, deletedSessionId) => {
      // Remove from caches
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(deletedSessionId),
      });
      queryClient.setQueryData(
        sessionKeys.lists(),
        (old: SessionWithMessages[] = []) =>
          old.filter((s) => s.id !== deletedSessionId)
      );

      // Also invalidate all sessions to ensure consistency
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });

      toast.success("Chat deleted successfully");

      // Dispatch event to notify other components
      window.dispatchEvent(
        new CustomEvent("session-deleted", {
          detail: { sessionId: deletedSessionId },
        })
      );

      // If we're currently on this session page, redirect to home
      if (window.location.pathname === `/${deletedSessionId}`) {
        router.push("/");
      }
    },
    onError: (error) => {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete chat");
    },
  });

  return {
    session,
    loading,
    error,
    updateTitle: updateTitleMutation.mutate,
    deleteSession: deleteSessionMutation.mutate,
    isUpdatingTitle: updateTitleMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
  };
}
