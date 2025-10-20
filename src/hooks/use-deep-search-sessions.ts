"use client";

import {
  getDeepSearchSessions,
  deleteDeepSearchSession,
  updateDeepSearchSession,
  getDeepSearchSessionById,
} from "@/actions/deep-search.actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

export type DeepSearchSessionWithMessages = Awaited<
  ReturnType<typeof getDeepSearchSessions>
>[0];
export type DeepSearchSessionDetail = Awaited<
  ReturnType<typeof getDeepSearchSessionById>
>;

// Query Keys
export const deepSearchSessionKeys = {
  all: ["deep-search-sessions"] as const,
  lists: () => [...deepSearchSessionKeys.all, "list"] as const,
  detail: (id: string) => [...deepSearchSessionKeys.all, "detail", id] as const,
};

// Hook for fetching all deep search sessions
export function useDeepSearchSessions() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: sessions = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: deepSearchSessionKeys.lists(),
    queryFn: getDeepSearchSessions,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteDeepSearchSession,
    onSuccess: (result, deletedSessionId) => {
      // Remove from cache
      queryClient.setQueryData(
        deepSearchSessionKeys.lists(),
        (old: DeepSearchSessionWithMessages[] = []) =>
          old.filter((s) => s.id !== deletedSessionId)
      );

      // Invalidate session detail cache
      queryClient.removeQueries({
        queryKey: deepSearchSessionKeys.detail(deletedSessionId),
      });

      // Also invalidate all sessions to ensure consistency
      queryClient.invalidateQueries({
        queryKey: deepSearchSessionKeys.lists(),
      });

      toast.success("Deep search deleted successfully");

      // Dispatch event to notify other components
      window.dispatchEvent(
        new CustomEvent("deep-search-deleted", {
          detail: { sessionId: deletedSessionId },
        })
      );

      // If we're currently on this session page, redirect to home
      if (window.location.pathname === `/deep-search/${deletedSessionId}`) {
        router.push("/deep-search");
      }
    },
    onError: (error) => {
      console.error("Failed to delete deep search session:", error);
      toast.error("Failed to delete deep search");
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateDeepSearchSession(sessionId, { title }),
    onSuccess: (result, { sessionId, title }) => {
      // Update sessions list cache
      queryClient.setQueryData(
        deepSearchSessionKeys.lists(),
        (old: DeepSearchSessionWithMessages[] = []) =>
          old.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );

      // Update session detail cache if it exists
      queryClient.setQueryData(
        deepSearchSessionKeys.detail(sessionId),
        (old: DeepSearchSessionDetail | undefined) =>
          old ? { ...old, title } : old
      );

      toast.success("Deep search title updated");
    },
    onError: (error) => {
      console.error("Failed to update deep search session title:", error);
      toast.error("Failed to update deep search title");
    },
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: deepSearchSessionKeys.lists() });
  }, [queryClient]);

  // Listen for deep search history updates (when new deep searches are created)
  useEffect(() => {
    const handleDeepSearchHistoryUpdate = () => {
      refetch();
    };

    window.addEventListener(
      "deep-search-history-updated",
      handleDeepSearchHistoryUpdate
    );
    return () => {
      window.removeEventListener(
        "deep-search-history-updated",
        handleDeepSearchHistoryUpdate
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

// Hook for fetching a single deep search session
export function useDeepSearchSession(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: session,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: deepSearchSessionKeys.detail(sessionId!),
    queryFn: () => getDeepSearchSessionById(sessionId!),
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

  // Listen for deep search history updates to refresh session data
  useEffect(() => {
    const handleDeepSearchHistoryUpdate = () => {
      // Invalidate current session cache to get fresh data
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: deepSearchSessionKeys.detail(sessionId),
        });
      }
    };

    window.addEventListener(
      "deep-search-history-updated",
      handleDeepSearchHistoryUpdate
    );
    return () => {
      window.removeEventListener(
        "deep-search-history-updated",
        handleDeepSearchHistoryUpdate
      );
    };
  }, [sessionId, queryClient]);

  const updateTitleMutation = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateDeepSearchSession(sessionId, { title }),
    onSuccess: (result, { sessionId, title }) => {
      // Update session detail cache
      queryClient.setQueryData(
        deepSearchSessionKeys.detail(sessionId),
        (old: DeepSearchSessionDetail | undefined) =>
          old ? { ...old, title } : old
      );

      // Update sessions list cache
      queryClient.setQueryData(
        deepSearchSessionKeys.lists(),
        (old: DeepSearchSessionWithMessages[] = []) =>
          old.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );

      toast.success("Deep search title updated");
    },
    onError: (error) => {
      console.error("Failed to update deep search session title:", error);
      toast.error("Failed to update deep search title");
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteDeepSearchSession,
    onSuccess: (result, deletedSessionId) => {
      // Remove from caches
      queryClient.removeQueries({
        queryKey: deepSearchSessionKeys.detail(deletedSessionId),
      });
      queryClient.setQueryData(
        deepSearchSessionKeys.lists(),
        (old: DeepSearchSessionWithMessages[] = []) =>
          old.filter((s) => s.id !== deletedSessionId)
      );

      // Also invalidate all sessions to ensure consistency
      queryClient.invalidateQueries({
        queryKey: deepSearchSessionKeys.lists(),
      });

      toast.success("Deep search deleted successfully");

      // Dispatch event to notify other components
      window.dispatchEvent(
        new CustomEvent("deep-search-deleted", {
          detail: { sessionId: deletedSessionId },
        })
      );

      // If we're currently on this session page, redirect to home
      if (window.location.pathname === `/deep-search/${deletedSessionId}`) {
        router.push("/deep-search");
      }
    },
    onError: (error) => {
      console.error("Failed to delete deep search session:", error);
      toast.error("Failed to delete deep search");
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
