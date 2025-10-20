"use server";

import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma";
import { DeepSearchToolResult, DeepSearchStepType } from "@/types/deep-search";
import { UIMessage } from "ai";

// ==================== HELPER FUNCTIONS ====================

// Get authenticated user ID
async function getUserIdOrThrow(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Error handler
function handleError(fnName: string, err: unknown): never {
  console.error(`[${fnName}]`, err);
  throw err instanceof Error ? err : new Error(String(err));
}

// Verify session ownership (reusable)
async function verifySessionOwnership(sessionId: string, userId: string) {
  const session = await prisma.deepSearchSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (!session) throw new Error("Session not found");
  if (session.userId !== userId) throw new Error("Not authorized");
}

// Extract text content from UI message parts
function extractTextContent(parts: UIMessage["parts"]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" && "text" in part ? part.text : ""))
    .join("\n");
}

// ==================== READ OPERATIONS ====================

export async function getDeepSearchSessions() {
  try {
    const userId = await getUserIdOrThrow();
    return await prisma.deepSearchSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
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
            DeepSearchStep: true,
            DeepSearchSource: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) throw new Error("Session not found or access denied");
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

    const includeMessages = {
      messages: {
        include: {
          DeepSearchToolSnapshot: true,
          DeepSearchStep: true,
          DeepSearchSource: true,
        },
        orderBy: { createdAt: "asc" as const },
      },
    };

    // Try to find existing session
    const existingSession = await prisma.deepSearchSession.findUnique({
      where: { id: sessionId },
      include: includeMessages,
    });

    if (existingSession) {
      if (existingSession.userId !== userId) throw new Error("Not authorized");
      return existingSession;
    }

    // Create new session
    return await prisma.deepSearchSession.create({
      data: {
        id: sessionId,
        userId,
        title: title || "New Deep Search",
      },
      include: includeMessages,
    });
  } catch (err) {
    handleError("getOrCreateDeepSearchSessionById", err);
  }
}

// ==================== CREATE OPERATIONS ====================

export async function createDeepSearchSession(opts: { title?: string } = {}) {
  try {
    const userId = await getUserIdOrThrow();
    return await prisma.deepSearchSession.create({
      data: {
        userId,
        title: opts.title || "New Deep Search",
      },
    });
  } catch (err) {
    handleError("createDeepSearchSession", err);
  }
}

// ==================== UPDATE OPERATIONS ====================

// Combined update function (replaces updateDeepSearchSessionTitle)
export async function updateDeepSearchSession(
  sessionId: string,
  data: { title?: string }
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

    return await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: data as Prisma.DeepSearchSessionUpdateInput,
    });
  } catch (err) {
    handleError("updateDeepSearchSession", err);
  }
}

// ==================== DELETE OPERATIONS ====================

export async function deleteDeepSearchSession(sessionId: string) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

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

// ==================== MESSAGE OPERATIONS ====================

export async function getDeepSearchSessionMessages(sessionId: string) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

    return await prisma.deepSearchMessage.findMany({
      where: { sessionId },
      include: {
        DeepSearchToolSnapshot: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  } catch (err) {
    handleError("getDeepSearchSessionMessages", err);
  }
}

export async function getDeepSearchMessageById(messageId: string) {
  try {
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

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

    if (!message) throw new Error("Message not found");
    if (message.session.userId !== userId) throw new Error("Not authorized");

    return message;
  } catch (err) {
    handleError("getDeepSearchMessageById", err);
  }
}

export async function deleteDeepSearchMessage(messageId: string) {
  try {
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

    const existing = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!existing) throw new Error("Message not found");
    if (existing.session.userId !== userId) throw new Error("Not authorized");

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
    await verifySessionOwnership(sessionId, userId);

    const result = await prisma.deepSearchMessage.deleteMany({
      where: { sessionId },
    });

    return { success: true, count: result.count };
  } catch (err) {
    handleError("deleteDeepSearchSessionMessages", err);
  }
}

export async function saveDeepSearchMessagesToSession(
  sessionId: string,
  messages: UIMessage[],
  toolResults?: DeepSearchToolResult[],
  assistantMessageId?: string
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");

    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

    // Update session's updatedAt
    await prisma.deepSearchSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    let messageIdForToolSnapshots: string | null = assistantMessageId || null;

    // Save messages
    for (const message of messages) {
      const existingMessage = await prisma.deepSearchMessage.findUnique({
        where: { id: message.id },
      });

      if (!existingMessage) {
        const textContent = extractTextContent(message.parts);

        const savedMessage = await prisma.deepSearchMessage.create({
          data: {
            id: message.id,
            role: message.role,
            content: textContent,
            sessionId,
          },
        });

        if (message.role === "assistant" && !messageIdForToolSnapshots) {
          messageIdForToolSnapshots = savedMessage.id;
        }
      } else {
        // Update existing assistant message content
        if (message.role === "assistant" && message.id === assistantMessageId) {
          const textContent = extractTextContent(message.parts);

          await prisma.deepSearchMessage.update({
            where: { id: message.id },
            data: { content: textContent, updatedAt: new Date() },
          });
        }

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

export async function updateDeepSearchMessageProgress(
  sessionId: string,
  messageId: string,
  progress: number,
  completed?: boolean,
  enableDeepSearch?: boolean
) {
  try {
    if (!sessionId) throw new Error("sessionId is required");
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

    const clamped = Math.max(0, Math.min(100, Math.floor(progress)));

    const updated = await prisma.deepSearchMessage.update({
      where: { id: messageId },
      data: {
        progress: clamped,
        completed: typeof completed === "boolean" ? completed : undefined,
        updatedAt: new Date(),
        isDeepSearchInitiated: enableDeepSearch ? true : undefined,
      },
    });

    return { success: true, message: updated };
  } catch (err) {
    handleError("updateDeepSearchMessageProgress", err);
  }
}

export async function updateAssistantMessageContent(
  messageId: string,
  content: string
) {
  try {
    if (!messageId) throw new Error("messageId is required");

    const userId = await getUserIdOrThrow();

    const existing = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!existing) throw new Error("Message not found");
    if (existing.session.userId !== userId) throw new Error("Not authorized");

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

// ==================== STREAM OPERATIONS ====================

export async function updateActiveStreamId(
  sessionId: string,
  activeStreamId: string | null
) {
  try {
    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

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

export async function cancelDeepSearchStream(sessionId: string) {
  try {
    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

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

export const createDeepSearchStep = async ({
  sessionId,
  messageId,
  stepType,
  reasoningText,
  executed,
  input,
  output,
}: {
  sessionId: string;
  messageId: string;
  stepType: DeepSearchStepType;
  reasoningText?: string;
  executed: boolean;
  input?: Prisma.InputJsonValue;
  output?: Prisma.InputJsonValue;
}) => {
  try {
    const userId = await getUserIdOrThrow();
    await verifySessionOwnership(sessionId, userId);

    // Verify message exists
    const message = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId, sessionId },
    });

    if (!message) throw new Error("Message not found");

    return await prisma.deepSearchStep.create({
      data: {
        stepName: reasoningText || stepType,
        isExecuted: executed,
        input: input ?? Prisma.JsonNull,
        output: output ?? Prisma.JsonNull,
        type: stepType,
        deepSearchMsgId: messageId,
      },
    });
  } catch (err) {
    handleError("createDeepSearchStep", err);
  }
};

export const updateDeepSearchStepExecution = async (
  stepId: string,
  executed: boolean
) => {
  try {
    const step = await prisma.deepSearchStep.findUnique({
      where: { id: stepId },
      include: {
        deepSearchMessage: {
          include: {
            session: true,
          },
        },
      },
    });

    if (!step) throw new Error("Step not found");

    const userId = await getUserIdOrThrow();
    if (step.deepSearchMessage.session.userId !== userId)
      throw new Error("Not authorized");

    return await prisma.deepSearchStep.update({
      where: { id: stepId },
      data: { isExecuted: executed, updatedAt: new Date() },
    });
  } catch (err) {
    handleError("updateDeepSearchStepExecution", err);
  }
};

export const saveDeepSearchSources = async (
  messageId: string,
  sources: {
    name: string;
    url: string;
    favicon?: string;
    content?: string;
    images?: unknown;
    publishedDate?: Date;
  }[],
  stepId?: string
) => {
  try {
    if (!messageId) throw new Error("Message ID is required");

    const userId = await getUserIdOrThrow();
    const message = await prisma.deepSearchMessage.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!message) throw new Error("Message not found");
    if (message.session.userId !== userId) throw new Error("Not authorized");

    // Verify step exists if stepId is provided
    if (stepId) {
      const step = await prisma.deepSearchStep.findUnique({
        where: { id: stepId },
      });
      if (!step) throw new Error("Step not found");
    }

    console.log(
      `Saving ${sources.length} sources for message ${messageId}${
        stepId ? ` (step: ${stepId})` : ""
      }`
    );

    // Use upsert to prevent duplicates based on url and stepId
    const savedSources = [];
    for (const source of sources) {
      try {
        // For upsert with composite unique constraint, both fields must match
        // If stepId is provided, check for duplicates with that stepId
        // If not provided, we'll just create (can't use unique constraint with null)
        const existingSource = stepId
          ? await prisma.deepSearchSource.findFirst({
              where: {
                url: source.url,
                stepId: stepId,
              },
            })
          : null;

        let saved;
        if (existingSource) {
          // Update existing
          saved = await prisma.deepSearchSource.update({
            where: { id: existingSource.id },
            data: {
              name: source.name,
              favicon: source.favicon,
              content: source.content,
              images: source.images
                ? (source.images as Prisma.InputJsonValue)
                : undefined,
              publishedDate: source.publishedDate,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new
          saved = await prisma.deepSearchSource.create({
            data: {
              name: source.name,
              url: source.url,
              favicon: source.favicon,
              content: source.content,
              images: source.images
                ? (source.images as Prisma.InputJsonValue)
                : undefined,
              publishedDate: source.publishedDate,
              messageId,
              stepId: stepId ?? undefined,
            },
          });
        }
        savedSources.push(saved);
      } catch (sourceError) {
        console.error(`Error saving source ${source.url}:`, sourceError);
      }
    }

    return { count: savedSources.length, sources: savedSources };
  } catch (err) {
    handleError("saveDeepSearchSources", err);
  }
};

export const updateDeepSearchStepReasoning = async (
  stepId: string,
  reasoningText: string
) => {
  try {
    if (!stepId) throw new Error("Step ID is required");

    const userId = await getUserIdOrThrow();
    const step = await prisma.deepSearchStep.findUnique({
      where: { id: stepId },
      include: { deepSearchMessage: { include: { session: true } } },
    });

    if (!step) throw new Error("Step not found");
    if (step.deepSearchMessage.session.userId !== userId)
      throw new Error("Not authorized");

    console.log(`Saving reasoning for step ${stepId}: ${reasoningText}`);

    return await prisma.deepSearchStep.update({
      where: { id: stepId },
      data: { reasoningText, updatedAt: new Date() },
    });
  } catch (err) {
    handleError("updateDeepSearchStepReasoning", err);
  }
};
