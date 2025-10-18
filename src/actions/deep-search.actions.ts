"use server";

import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma";
import { DeepSearchToolResult } from "@/types/deep-search";
import { UIMessage } from "ai";

// Helper function to get authenticated user ID
async function getUserIdOrThrow() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Helper function for error handling
function handleError(fnName: string, err: unknown): never {
  console.error(`${fnName} error:`, err);
  if (err instanceof Error) throw err;
  throw new Error(String(err));
}

// ==================== SESSION ACTIONS ====================

export async function getDeepSearchSessions() {
  try {
    const userId = await getUserIdOrThrow();
    const sessions = await prisma.deepSearchSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return sessions;
  } catch (err) {
    handleError("getDeepSearchSessions", err);
  }
}

export async function getDeepSearchSessionById(sessionId: string) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();
    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId, userId },
      include: {
        messages: {
          include: {
            DeepSearchToolSnapshot: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found or access denied");
    }

    return session;
  } catch (err) {
    handleError("getDeepSearchSessionById", err);
  }
}

export async function getOrCreateDeepSearchSessionById(
  sessionId: string,
  title?: string
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();

    let session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          include: {
            DeepSearchToolSnapshot: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (session) {
      // Verify ownership
      if (session.userId !== userId) {
        throw new Error("Not authorized to access this session");
      }
      return session;
    }

    // Create new session
    session = await prisma.deepSearchSession.create({
      data: {
        id: sessionId,
        userId,
        title: title || "New Deep Search",
      },
      include: {
        messages: {
          include: {
            DeepSearchToolSnapshot: true,
          },
        },
      },
    });

    return session;
  } catch (err) {
    handleError("getOrCreateDeepSearchSessionById", err);
  }
}

export async function createDeepSearchSession(opts: { title?: string } = {}) {
  try {
    const userId = await getUserIdOrThrow();

    const session = await prisma.deepSearchSession.create({
      data: {
        userId,
        title: opts.title || "New Deep Search",
      },
    });

    return session;
  } catch (err) {
    handleError("createDeepSearchSession", err);
  }
}

export async function updateDeepSearchSessionTitle(
  sessionId: string,
  title: string
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");
    if (!title) throw new Error("title is required");

    const userId = await getUserIdOrThrow();

    // Verify ownership
    const existing = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!existing) {
      throw new Error("Session not found");
    }

    if (existing.userId !== userId) {
      throw new Error("Not authorized to update this session");
    }

    const session = await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: { title },
    });

    return session;
  } catch (err) {
    handleError("updateDeepSearchSessionTitle", err);
  }
}

export async function updateDeepSearchSession(
  sessionId: string,
  data: { title?: string }
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();

    // Verify ownership
    const existing = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!existing) {
      throw new Error("Session not found");
    }

    if (existing.userId !== userId) {
      throw new Error("Not authorized to update this session");
    }

    const session = await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: data as Prisma.DeepSearchSessionUpdateInput,
    });

    return session;
  } catch (err) {
    handleError("updateDeepSearchSession", err);
  }
}

export async function deleteDeepSearchSession(sessionId: string) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();

    // Verify ownership
    const existing = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!existing) {
      throw new Error("Session not found");
    }

    if (existing.userId !== userId) {
      throw new Error("Not authorized to delete this session");
    }

    await prisma.deepSearchSession.delete({
      where: { id: sessionId },
    });

    return { success: true, id: sessionId };
  } catch (err) {
    handleError("deleteDeepSearchSession", err);
  }
}

export async function deleteAllDeepSearchSessions() {
  try {
    const userId = await getUserIdOrThrow();

    const result = await prisma.deepSearchSession.deleteMany({
      where: { userId },
    });

    return { success: true, count: result.count };
  } catch (err) {
    handleError("deleteAllDeepSearchSessions", err);
  }
}

// ==================== MESSAGE ACTIONS ====================

export async function getDeepSearchSessionMessages(sessionId: string) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();

    // Verify session ownership
    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Not authorized to access this session");
    }

    const messages = await prisma.deepSearchMessage.findMany({
      where: { sessionId },
      include: {
        DeepSearchToolSnapshot: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return messages;
  } catch (err) {
    handleError("getDeepSearchSessionMessages", err);
  }
}

export async function getDeepSearchMessageById(messageId: string) {
  try {
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

    // Get message with session and all session messages to verify ownership
    const message = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId },
      include: {
        session: {
          include: {
            messages: {
              include: {
                DeepSearchToolSnapshot: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
        DeepSearchToolSnapshot: true,
      },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.session.userId !== userId) {
      throw new Error("Not authorized to access this message");
    }

    return message;
  } catch (err) {
    handleError("getDeepSearchMessageById", err);
  }
}

export async function deleteDeepSearchMessage(messageId: string) {
  try {
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

    // Verify message ownership via session
    const existing = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!existing) {
      throw new Error("Message not found");
    }

    if (existing.session.userId !== userId) {
      throw new Error("Not authorized to delete this message");
    }

    await prisma.deepSearchMessage.delete({
      where: { id: messageId },
    });

    return { success: true, id: messageId };
  } catch (err) {
    handleError("deleteDeepSearchMessage", err);
  }
}

export async function deleteDeepSearchSessionMessages(sessionId: string) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();

    // Verify session ownership
    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Not authorized to delete messages from this session");
    }

    const result = await prisma.deepSearchMessage.deleteMany({
      where: { sessionId },
    });

    return { success: true, count: result.count };
  } catch (err) {
    handleError("deleteDeepSearchSessionMessages", err);
  }
}

// actions/deep-search.actions.ts

export async function saveDeepSearchMessagesToSession(
  sessionId: string,
  messages: UIMessage[],
  toolResults?: DeepSearchToolResult[],
  assistantMessageId?: string // Add this parameter
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();

    // Verify session ownership
    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Not authorized to save messages to this session");
    }

    // Update session's updatedAt
    await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    let messageIdForToolSnapshots: string | null = assistantMessageId || null;

    // Save messages
    for (const message of messages) {
      // Check if message already exists
      const existingMessage = await prisma.deepSearchMessage.findUnique({
        where: { id: message.id },
      });

      if (!existingMessage) {
        // Extract text content from message parts
        const textContent = message.parts
          .filter((part) => part.type === "text")
          .map((part) => {
            if (part.type === "text" && "text" in part) {
              return part.text;
            }
            return "";
          })
          .join("\n");

        // Create new message
        const savedMessage = await prisma.deepSearchMessage.create({
          data: {
            id: message.id,
            role: message.role,
            content: textContent,
            sessionId,
          },
        });

        // Keep track of the assistant message ID for tool snapshots
        if (message.role === "assistant" && !messageIdForToolSnapshots) {
          messageIdForToolSnapshots = savedMessage.id;
        }
      } else {
        // Update existing message content if it's the assistant message we created earlier
        if (message.role === "assistant" && message.id === assistantMessageId) {
          const textContent = message.parts
            .filter((part) => part.type === "text")
            .map((part) => {
              if (part.type === "text" && "text" in part) {
                return part.text;
              }
              return "";
            })
            .join("\n");

          await prisma.deepSearchMessage.update({
            where: { id: message.id },
            data: { content: textContent, updatedAt: new Date() },
          });
        }

        // If this is an existing assistant message, we can still use it for tool snapshots
        if (
          existingMessage.role === "assistant" &&
          !messageIdForToolSnapshots
        ) {
          messageIdForToolSnapshots = existingMessage.id;
        }
      }
    }

    // Save tool snapshots - associate them with the assistant message
    if (messageIdForToolSnapshots && toolResults && toolResults.length > 0) {
      for (const toolResult of toolResults) {
        try {
          // Check if this tool snapshot already exists
          const existingSnapshot =
            await prisma.deepSearchToolSnapshot.findFirst({
              where: {
                messageId: messageIdForToolSnapshots,
                toolName: toolResult.toolName,
              },
            });

          if (!existingSnapshot) {
            await prisma.deepSearchToolSnapshot.create({
              data: {
                toolName: toolResult.toolName,
                input: (toolResult.input ?? null) as Prisma.InputJsonValue,
                output: (toolResult.output ?? null) as Prisma.InputJsonValue,
                isExecuted: toolResult.isExecuted ?? true,
                messageId: messageIdForToolSnapshots,
              },
            });
          }
        } catch (toolError) {
          console.error(
            `Error saving deep-search tool snapshot ${toolResult.toolName}:`,
            toolError
          );
        }
      }
    }

    return { success: true };
  } catch (err) {
    handleError("saveDeepSearchMessagesToSession", err);
  }
}

export async function createAssistantMessage(
  sessionId: string,
  isDeepSearchInitiated: boolean
) {
  return await prisma.deepSearchMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: "", // Empty initially
      progress: 0,
      completed: false,
      isDeepSearchInitiated,
    },
  });
}

// Update progress for a DeepSearchMessage (percentage 0-100).
// Ensures the caller is authenticated and owns the session.
export async function updateDeepSearchMessageProgress(
  sessionId: string,
  messageId: string,
  progress: number,
  completed?: boolean
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

    // Verify session ownership
    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Not authorized to update messages in this session");
    }

    // Clamp progress
    const clamped = Math.max(0, Math.min(100, Math.floor(progress)));

    const updated = await prisma.deepSearchMessage.update({
      where: { id: messageId },
      data: {
        progress: clamped,
        completed: typeof completed === "boolean" ? completed : undefined,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: updated };
  } catch (err) {
    handleError("updateDeepSearchMessageProgress", err);
  }
}

// actions/deep-search.actions.ts (add this function)

export async function updateAssistantMessageContent(
  messageId: string,
  content: string
) {
  try {
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

    // Verify message ownership via session
    const existing = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!existing) {
      throw new Error("Message not found");
    }

    if (existing.session.userId !== userId) {
      throw new Error("Not authorized to update this message");
    }

    const updated = await prisma.deepSearchMessage.update({
      where: { id: messageId },
      data: {
        content,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: updated };
  } catch (err) {
    handleError("updateAssistantMessageContent", err);
  }
}

// Save active stream ID when starting deep search
export async function updateActiveStreamId(
  sessionId: string,
  activeStreamId: string | null
) {
  try {
    const userId = await getUserIdOrThrow();

    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new Error("Not authorized");
    }

    await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: {
        activeStreamId,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    handleError("updateActiveStreamId", err);
  }
}

// Mark stream as canceled
export async function cancelDeepSearchStream(sessionId: string) {
  try {
    const userId = await getUserIdOrThrow();

    const session = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new Error("Not authorized");
    }

    await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: {
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    handleError("cancelDeepSearchStream", err);
  }
}
