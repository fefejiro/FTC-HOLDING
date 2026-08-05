import * as SecureStore from "expo-secure-store";
import type { PeacePadCoordinationApi, SendMessageInput } from "../api/CoordinationApi";
import { PeacePadApiError } from "../api/PeacePadApiClient";
import type { WriteContext } from "../domain/v2";

const INDEX_KEY = "peacepad.native.message-outbox.index.v1";
const ENTRY_PREFIX = "peacepad.native.message-outbox.entry.v1.";
export const MAX_OUTBOX_ENTRIES = 5;
export const MAX_OUTBOX_BODY_LENGTH = 800;
export const MAX_OUTBOX_ATTEMPTS = 5;

export type QueuedMessage = Readonly<{
  id: string;
  input: SendMessageInput;
  context: WriteContext;
  queuedAt: string;
  attempts: number;
}>;

export interface MessageOutboxStore {
  list(): Promise<readonly QueuedMessage[]>;
  enqueue(value: QueuedMessage): Promise<void>;
  replace(value: QueuedMessage): Promise<void>;
  remove(id: string): Promise<void>;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,96}$/.test(value);
}

function validQueuedMessage(value: unknown): value is QueuedMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QueuedMessage>;
  return validId(item.id)
    && typeof item.input?.familyCircleId === "string"
    && typeof item.input?.conversationId === "string"
    && typeof item.input?.body === "string"
    && item.input.body.trim().length > 0
    && item.input.body.length <= MAX_OUTBOX_BODY_LENGTH
    && typeof item.context?.idempotencyKey === "string"
    && item.context.idempotencyKey.trim().length > 0
    && item.context.schemaVersion === "2.0"
    && (item.context.region === "ca" || item.context.region === "us")
    && typeof item.context.actor?.identityId === "string"
    && typeof item.context.actor?.sessionId === "string"
    && typeof item.queuedAt === "string"
    && Number.isFinite(Date.parse(item.queuedAt))
    && Number.isInteger(item.attempts)
    && (item.attempts ?? -1) >= 0
    && (item.attempts ?? MAX_OUTBOX_ATTEMPTS + 1) <= MAX_OUTBOX_ATTEMPTS;
}

async function readIndex(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length <= MAX_OUTBOX_ENTRIES && parsed.every(validId)) return [...new Set(parsed)];
  } catch {
    // Invalid secure data is cleared below.
  }
  await SecureStore.deleteItemAsync(INDEX_KEY);
  return [];
}

async function writeIndex(ids: readonly string[]) {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(ids), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export const secureMessageOutboxStore: MessageOutboxStore = {
  async list() {
    const ids = await readIndex();
    const result: QueuedMessage[] = [];
    const retained: string[] = [];
    for (const id of ids) {
      const key = `${ENTRY_PREFIX}${id}`;
      const raw = await SecureStore.getItemAsync(key);
      try {
        const parsed = raw ? JSON.parse(raw) as unknown : null;
        if (validQueuedMessage(parsed)) {
          result.push(parsed);
          retained.push(id);
          continue;
        }
      } catch {
        // Invalid secure data is cleared below.
      }
      await SecureStore.deleteItemAsync(key);
    }
    if (retained.length !== ids.length) await writeIndex(retained);
    return result;
  },
  async enqueue(value) {
    if (!validQueuedMessage(value)) throw new Error("Refusing to queue an invalid PeacePad message.");
    const ids = await readIndex();
    if (ids.includes(value.id)) return;
    if (ids.length >= MAX_OUTBOX_ENTRIES) throw new Error("The secure message outbox is full. Try again when connected.");
    await SecureStore.setItemAsync(`${ENTRY_PREFIX}${value.id}`, JSON.stringify(value), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
    try {
      await writeIndex([...ids, value.id]);
    } catch (error) {
      await SecureStore.deleteItemAsync(`${ENTRY_PREFIX}${value.id}`);
      throw error;
    }
  },
  async replace(value) {
    if (!validQueuedMessage(value)) throw new Error("Refusing to update an invalid PeacePad message.");
    const ids = await readIndex();
    if (!ids.includes(value.id)) throw new Error("Queued message not found.");
    await SecureStore.setItemAsync(`${ENTRY_PREFIX}${value.id}`, JSON.stringify(value), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  },
  async remove(id) {
    if (!validId(id)) return;
    const ids = await readIndex();
    await SecureStore.deleteItemAsync(`${ENTRY_PREFIX}${id}`);
    await writeIndex(ids.filter((value) => value !== id));
  }
};

export function isTransientMessageError(error: unknown) {
  return error instanceof PeacePadApiError && (error.kind === "network" || error.kind === "timeout");
}

function isAuthenticationPause(error: unknown) {
  return error instanceof PeacePadApiError && error.kind === "auth-required";
}

export async function retryQueuedMessages(api: PeacePadCoordinationApi, store: MessageOutboxStore) {
  const summary = { sent: 0, retained: 0, discarded: 0 };
  for (const queued of await store.list()) {
    if (queued.attempts >= MAX_OUTBOX_ATTEMPTS) {
      await store.remove(queued.id);
      summary.discarded += 1;
      continue;
    }
    try {
      await api.sendMessage(queued.input, queued.context);
      await store.remove(queued.id);
      summary.sent += 1;
    } catch (error) {
      if (isAuthenticationPause(error)) {
        summary.retained += 1;
        continue;
      }
      if (!isTransientMessageError(error)) {
        await store.remove(queued.id);
        summary.discarded += 1;
        continue;
      }
      await store.replace({ ...queued, attempts: queued.attempts + 1 });
      summary.retained += 1;
    }
  }
  return summary;
}
