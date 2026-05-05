import crypto from "crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  ppV2ConversationMessages,
  ppV2ConversationSessions,
  ppV2ModuleRuns,
} from "@shared/schema";

type ConversationMode = "narration" | "task";
type ConversationRole = "user" | "assistant";

export interface ResolvedConversationSession {
  sessionId: string;
  isNew: boolean;
  userId: string | null;
}

interface MemorySessionRecord {
  sessionId: string;
  userId: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

interface MemoryMessageRecord {
  id: string;
  sessionId: string;
  role: ConversationRole;
  text: string;
  mode: ConversationMode;
  intentId: string | null;
  createdAt: Date;
}

const memorySessions = new Map<string, MemorySessionRecord>();
const memoryMessages: MemoryMessageRecord[] = [];

let storeAvailable: boolean | null = null;
let missingTableWarningShown = false;

function createSessionId(): string {
  return crypto.randomUUID();
}

function toMissingTable(error: unknown): boolean {
  const dbError = error as { code?: string };
  return dbError.code === "42P01";
}

function markUnavailableWarningOnce() {
  if (!missingTableWarningShown) {
    console.warn(
      "[v2][conversation-store] conversation tables missing; using in-memory fallback. Run v2 migrations.",
    );
    missingTableWarningShown = true;
  }
}

async function resolveSessionFromMemory(input: {
  sessionId: string | null;
  userId: string | null;
}): Promise<ResolvedConversationSession> {
  const now = new Date();
  const existing = input.sessionId ? memorySessions.get(input.sessionId) : undefined;
  if (existing) {
    existing.lastActiveAt = now;
    return {
      sessionId: existing.sessionId,
      isNew: false,
      userId: existing.userId ?? input.userId ?? null,
    };
  }

  const sessionId = input.sessionId ?? createSessionId();
  memorySessions.set(sessionId, {
    sessionId,
    userId: input.userId,
    createdAt: now,
    lastActiveAt: now,
  });
  return {
    sessionId,
    isNew: true,
    userId: input.userId,
  };
}

export async function resolveConversationSession(input: {
  sessionId: string | null;
  userId: string | null;
}): Promise<ResolvedConversationSession> {
  if (storeAvailable === false) {
    return resolveSessionFromMemory(input);
  }

  try {
    if (input.sessionId) {
      const [existing] = await db
        .select({
          sessionId: ppV2ConversationSessions.sessionId,
          userId: ppV2ConversationSessions.userId,
        })
        .from(ppV2ConversationSessions)
        .where(eq(ppV2ConversationSessions.sessionId, input.sessionId))
        .limit(1);

      if (existing) {
        await db
          .update(ppV2ConversationSessions)
          .set({
            lastActiveAt: new Date(),
          })
          .where(eq(ppV2ConversationSessions.sessionId, input.sessionId));

        storeAvailable = true;
        return {
          sessionId: existing.sessionId,
          isNew: false,
          userId: existing.userId ?? input.userId ?? null,
        };
      }
    }

    const [created] = await db
      .insert(ppV2ConversationSessions)
      .values({
        sessionId: input.sessionId ?? createSessionId(),
        userId: input.userId,
      })
      .returning({
        sessionId: ppV2ConversationSessions.sessionId,
        userId: ppV2ConversationSessions.userId,
      });

    storeAvailable = true;
    return {
      sessionId: created.sessionId,
      isNew: true,
      userId: created.userId ?? input.userId ?? null,
    };
  } catch (error) {
    if (toMissingTable(error)) {
      storeAvailable = false;
      markUnavailableWarningOnce();
      return resolveSessionFromMemory(input);
    }
    console.warn("[v2][conversation-store] resolve session failed; using in-memory fallback.", error);
    return resolveSessionFromMemory(input);
  }
}

export async function persistConversationMessage(input: {
  sessionId: string;
  role: ConversationRole;
  text: string;
  mode: ConversationMode;
  intentId?: string | null;
}): Promise<void> {
  if (storeAvailable === false) {
    memoryMessages.push({
      id: createSessionId(),
      sessionId: input.sessionId,
      role: input.role,
      text: input.text,
      mode: input.mode,
      intentId: input.intentId ?? null,
      createdAt: new Date(),
    });
    return;
  }

  try {
    await db.insert(ppV2ConversationMessages).values({
      sessionId: input.sessionId,
      role: input.role,
      text: input.text,
      mode: input.mode,
      intentId: input.intentId ?? null,
    });
    await db
      .update(ppV2ConversationSessions)
      .set({
        lastActiveAt: new Date(),
      })
      .where(eq(ppV2ConversationSessions.sessionId, input.sessionId));
  } catch (error) {
    if (toMissingTable(error)) {
      storeAvailable = false;
      markUnavailableWarningOnce();
      memoryMessages.push({
        id: createSessionId(),
        sessionId: input.sessionId,
        role: input.role,
        text: input.text,
        mode: input.mode,
        intentId: input.intentId ?? null,
        createdAt: new Date(),
      });
      return;
    }
    console.warn("[v2][conversation-store] persist message failed", error);
  }
}

export async function loadRecentConversationMessages(
  sessionId: string,
  limit = 6,
): Promise<string[]> {
  if (storeAvailable === false) {
    return memoryMessages
      .filter((message) => message.sessionId === sessionId && message.role === "user")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((message) => message.text)
      .reverse();
  }

  try {
    const records = await db
      .select({
        text: ppV2ConversationMessages.text,
      })
      .from(ppV2ConversationMessages)
      .where(
        and(
          eq(ppV2ConversationMessages.sessionId, sessionId),
          eq(ppV2ConversationMessages.role, "user"),
        ),
      )
      .orderBy(desc(ppV2ConversationMessages.createdAt))
      .limit(limit);
    return records.map((record) => record.text).reverse();
  } catch (error) {
    if (toMissingTable(error)) {
      storeAvailable = false;
      markUnavailableWarningOnce();
      return loadRecentConversationMessages(sessionId, limit);
    }
    console.warn("[v2][conversation-store] load recent messages failed", error);
    return [];
  }
}

export async function hasConversationHistory(sessionId: string): Promise<boolean> {
  if (storeAvailable === false) {
    const hasMessageHistory = memoryMessages.some(
      (message) => message.sessionId === sessionId && message.role === "user",
    );
    return hasMessageHistory;
  }

  try {
    const [messageCount] = await db
      .select({
        value: count(ppV2ConversationMessages.id),
      })
      .from(ppV2ConversationMessages)
      .where(
        and(
          eq(ppV2ConversationMessages.sessionId, sessionId),
          eq(ppV2ConversationMessages.role, "user"),
        ),
      );

    const [runCount] = await db
      .select({
        value: count(ppV2ModuleRuns.id),
      })
      .from(ppV2ModuleRuns)
      .where(eq(ppV2ModuleRuns.sessionId, sessionId));

    return (messageCount?.value ?? 0) > 0 || (runCount?.value ?? 0) > 0;
  } catch (error) {
    if (toMissingTable(error)) {
      storeAvailable = false;
      markUnavailableWarningOnce();
      return hasConversationHistory(sessionId);
    }
    console.warn("[v2][conversation-store] history check failed", error);
    return false;
  }
}
