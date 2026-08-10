import * as SecureStore from "expo-secure-store";
import { PeacePadApiError } from "../api/PeacePadApiClient";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import { createWriteContext } from "../domain/v2";
import {
  MAX_OUTBOX_ATTEMPTS,
  MAX_OUTBOX_BODY_LENGTH,
  isQueuedMessageInScope,
  removeQueuedMessage,
  retryQueuedMessage,
  retryQueuedMessages,
  secureMessageOutboxStore,
  type MessageOutboxStore,
  type QueuedMessage
} from "./secureMessageOutbox";

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const context = createWriteContext({
  idempotencyKey: "message-intent-123",
  region: "ca",
  actor: { identityId: "parent-a", sessionId: "session-a" }
});
const queued = (overrides: Partial<QueuedMessage> = {}): QueuedMessage => ({
  id: "outbox_12345678",
  input: { familyCircleId: "family", conversationId: "conversation", body: "Pickup at 5." },
  originalBody: "Pickup at 5.",
  context,
  queuedAt: "2026-08-05T12:00:00.000Z",
  nextAttemptAt: "2026-08-05T12:00:00.000Z",
  attempts: 0,
  status: "waiting",
  ...overrides
});
const scope = {
  actorIdentityId: "parent-a",
  sessionId: "current-session-a",
  familyCircleId: "family",
  conversationId: "conversation",
  region: "ca" as const
};
const now = () => new Date("2026-08-05T12:01:00.000Z");

class MemoryOutbox implements MessageOutboxStore {
  values: QueuedMessage[];
  constructor(values: QueuedMessage[]) { this.values = values; }
  async list() { return this.values; }
  async enqueue(value: QueuedMessage) { this.values.push(value); }
  async replace(value: QueuedMessage) { this.values = this.values.map((item) => item.id === value.id ? value : item); }
  async remove(id: string) { this.values = this.values.filter((item) => item.id !== id); }
  async clear() { this.values = []; }
}

describe("secure message outbox", () => {
  let stored: Map<string, string>;
  beforeEach(() => {
    jest.clearAllMocks();
    stored = new Map();
    secureStore.getItemAsync.mockImplementation(async (key) => stored.get(key) ?? null);
    secureStore.setItemAsync.mockImplementation(async (key, value) => { stored.set(key, value); });
    secureStore.deleteItemAsync.mockImplementation(async (key) => { stored.delete(key); });
  });

  it("stores bounded entries separately with device-only protection", async () => {
    await secureMessageOutboxStore.enqueue(queued());
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "peacepad.native.message-outbox.entry.v1.outbox_12345678",
      JSON.stringify(queued()),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "peacepad.native.message-outbox.index.v1",
      JSON.stringify(["outbox_12345678"]),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
  });

  it("restores, replaces, and removes valid entries", async () => {
    await secureMessageOutboxStore.enqueue(queued());
    await expect(secureMessageOutboxStore.list()).resolves.toEqual([queued()]);
    await secureMessageOutboxStore.replace(queued({ attempts: 1 }));
    await expect(secureMessageOutboxStore.list()).resolves.toEqual([queued({ attempts: 1 })]);
    await secureMessageOutboxStore.remove(queued().id);
    await expect(secureMessageOutboxStore.list()).resolves.toEqual([]);
    await secureMessageOutboxStore.enqueue(queued());
    await secureMessageOutboxStore.clear();
    await expect(secureMessageOutboxStore.list()).resolves.toEqual([]);
  });

  it("clears malformed index and entry data", async () => {
    stored.set("peacepad.native.message-outbox.index.v1", "not-json");
    await expect(secureMessageOutboxStore.list()).resolves.toEqual([]);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.native.message-outbox.index.v1");

    stored.set("peacepad.native.message-outbox.index.v1", JSON.stringify([queued().id]));
    stored.set(`peacepad.native.message-outbox.entry.v1.${queued().id}`, JSON.stringify({ ...queued(), attempts: 99 }));
    await expect(secureMessageOutboxStore.list()).resolves.toEqual([]);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(`peacepad.native.message-outbox.entry.v1.${queued().id}`);
  });

  it("bounds the queue and treats duplicate intent IDs idempotently", async () => {
    await secureMessageOutboxStore.enqueue(queued());
    await secureMessageOutboxStore.enqueue(queued());
    for (let index = 1; index < 5; index += 1) {
      await secureMessageOutboxStore.enqueue(queued({ id: `outbox_item000${index}` }));
    }
    await expect(secureMessageOutboxStore.enqueue(queued({ id: "outbox_overflow" }))).rejects.toThrow("outbox is full");
    await expect(secureMessageOutboxStore.list()).resolves.toHaveLength(5);
  });

  it("removes a newly written entry if indexing fails", async () => {
    secureStore.setItemAsync.mockImplementation(async (key, value) => {
      if (key === "peacepad.native.message-outbox.index.v1") throw new Error("secure index unavailable");
      stored.set(key, value);
    });
    await expect(secureMessageOutboxStore.enqueue(queued())).rejects.toThrow("secure index unavailable");
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.native.message-outbox.entry.v1.outbox_12345678");
  });

  it("rejects oversized message bodies instead of overfilling secure storage", async () => {
    await expect(secureMessageOutboxStore.enqueue(queued({
      input: { ...queued().input, body: "x".repeat(MAX_OUTBOX_BODY_LENGTH + 1) }
    }))).rejects.toThrow("invalid PeacePad message");
  });

  it("retries transient failures with the original idempotency key", async () => {
    const store = new MemoryOutbox([queued()]);
    const api = { sendMessage: jest.fn().mockRejectedValue(new PeacePadApiError("offline", "network")) } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, { ...scope, sessionId: "session-a" }, now)).resolves.toEqual({ sent: 0, retained: 1, needsAction: 0 });
    expect(store.values[0]).toMatchObject({ attempts: 1, nextAttemptAt: "2026-08-05T12:01:30.000Z", context: { idempotencyKey: "message-intent-123" } });
  });

  it("removes only successful entries and retains permanent or exhausted entries for user action", async () => {
    const success = queued();
    const permanent = queued({ id: "outbox_87654321" });
    const exhausted = queued({ id: "outbox_abcdefgh", attempts: MAX_OUTBOX_ATTEMPTS });
    const store = new MemoryOutbox([success, permanent, exhausted]);
    const api = { sendMessage: jest.fn()
      .mockResolvedValueOnce({ id: "message-1" })
      .mockRejectedValueOnce(new PeacePadApiError("forbidden", "http", 403)) } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, { ...scope, sessionId: "session-a" }, now)).resolves.toEqual({ sent: 1, retained: 0, needsAction: 2 });
    expect(store.values).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: permanent.id, status: "needs-action", lastErrorKind: "rejected" }),
      expect.objectContaining({ id: exhausted.id, status: "needs-action", lastErrorKind: "exhausted" })
    ]));
    expect(api.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("retains queued intent without consuming an attempt while authentication is unavailable", async () => {
    const store = new MemoryOutbox([queued()]);
    const api = { sendMessage: jest.fn().mockRejectedValue(new PeacePadApiError("sign in", "auth-required", 401)) } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, { ...scope, sessionId: "session-a" }, now)).resolves.toEqual({ sent: 0, retained: 0, needsAction: 1 });
    expect(store.values).toEqual([expect.objectContaining({ status: "needs-action", lastErrorKind: "authentication" })]);
  });

  it("retains another identity's queued body without displaying or sending it", async () => {
    const store = new MemoryOutbox([queued({
      context: createWriteContext({
        idempotencyKey: "message-intent-other",
        region: "ca",
        actor: { identityId: "parent-b", sessionId: "session-b" }
      })
    })]);
    const api = { sendMessage: jest.fn() } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, scope, now)).resolves.toEqual({ sent: 0, retained: 1, needsAction: 0 });
    expect(store.values).toHaveLength(1);
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it("retains another authorized family queue without retrying it in the active family", async () => {
    const otherFamily = queued({ input: { familyCircleId: "family-other", conversationId: "conversation-other", body: "Other plan" } });
    const store = new MemoryOutbox([otherFamily]);
    const api = { sendMessage: jest.fn() } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, scope, now)).resolves.toEqual({ sent: 0, retained: 1, needsAction: 0 });
    expect(store.values).toEqual([otherFamily]);
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it("honours retry backoff without changing the original authenticated session", async () => {
    const waiting = queued({ nextAttemptAt: "2026-08-05T12:02:00.000Z" });
    const store = new MemoryOutbox([waiting]);
    const api = { sendMessage: jest.fn().mockResolvedValue({ id: "message-1" }) } as unknown as PeacePadCoordinationApi;
    const exactScope = { ...scope, sessionId: "session-a" };
    await expect(retryQueuedMessages(api, store, exactScope, now)).resolves.toEqual({ sent: 0, retained: 1, needsAction: 0 });
    expect(api.sendMessage).not.toHaveBeenCalled();

    await retryQueuedMessages(api, store, exactScope, () => new Date("2026-08-05T12:03:00.000Z"));
    expect(api.sendMessage).toHaveBeenCalledWith(waiting.input, expect.objectContaining({
      idempotencyKey: "message-intent-123",
      actor: { identityId: "parent-a", sessionId: "session-a" }
    }));
    expect(store.values).toEqual([]);
    expect(isQueuedMessageInScope(waiting, exactScope)).toBe(true);
  });

  it("never retries a queued message after the authenticated session changes", async () => {
    const store = new MemoryOutbox([queued()]);
    const api = { sendMessage: jest.fn() } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, scope, now)).resolves.toEqual({ sent: 0, retained: 1, needsAction: 0 });
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.values).toEqual([queued()]);
    expect(isQueuedMessageInScope(queued(), scope)).toBe(false);
  });

  it("retains concurrency conflicts for explicit user action", async () => {
    const store = new MemoryOutbox([queued()]);
    const api = { sendMessage: jest.fn().mockRejectedValue(new PeacePadApiError("changed", "http", 409)) } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store, { ...scope, sessionId: "session-a" }, now)).resolves.toEqual({ sent: 0, retained: 0, needsAction: 1 });
    expect(store.values[0]).toMatchObject({ status: "needs-action", lastErrorKind: "conflict" });
  });

  it("manually retries only a needs-action entry with its exact stored context and idempotency key", async () => {
    const pending = queued({ status: "needs-action", lastErrorKind: "network", attempts: 1 });
    const store = new MemoryOutbox([pending]);
    const api = { sendMessage: jest.fn().mockResolvedValue({ id: "message-1" }) } as unknown as PeacePadCoordinationApi;

    await expect(retryQueuedMessage(api, store, { ...scope, sessionId: "session-a" }, pending.id)).resolves.toBe("sent");
    expect(api.sendMessage).toHaveBeenCalledWith(pending.input, pending.context);
    expect(store.values).toEqual([]);
  });

  it("does not manually retry a waiting entry", async () => {
    const pending = queued({ status: "waiting" });
    const store = new MemoryOutbox([pending]);
    const api = { sendMessage: jest.fn() } as unknown as PeacePadCoordinationApi;

    await expect(retryQueuedMessage(api, store, { ...scope, sessionId: "session-a" }, pending.id)).resolves.toBe("retained");
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.values).toEqual([pending]);
  });

  it("does not remove an exact-scope waiting entry", async () => {
    const pending = queued({ status: "waiting" });
    const store = new MemoryOutbox([pending]);

    await expect(removeQueuedMessage(store, { ...scope, sessionId: "session-a" }, pending.id)).resolves.toBe(false);
    expect(store.values).toEqual([pending]);
  });

  it.each([
    ["identity", { actorIdentityId: "parent-b" }],
    ["session", { sessionId: "session-b" }],
    ["region", { region: "us" as const }],
    ["family", { familyCircleId: "family-b" }],
    ["conversation", { conversationId: "conversation-b" }]
  ])("prevents manual retry and removal across a mismatched %s scope", async (_label, mismatch) => {
    const pending = queued({ status: "needs-action", lastErrorKind: "network" });
    const store = new MemoryOutbox([pending]);
    const api = { sendMessage: jest.fn() } as unknown as PeacePadCoordinationApi;
    const exactScope = { ...scope, sessionId: "session-a" };
    const wrongScope = { ...exactScope, ...mismatch };

    await expect(retryQueuedMessage(api, store, wrongScope, pending.id)).resolves.toBe("retained");
    await expect(removeQueuedMessage(store, wrongScope, pending.id)).resolves.toBe(false);
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(store.values).toEqual([pending]);
  });

  it("retains a failed manual retry without exceeding the attempt limit", async () => {
    const pending = queued({ status: "needs-action", lastErrorKind: "exhausted", attempts: MAX_OUTBOX_ATTEMPTS });
    const store = new MemoryOutbox([pending]);
    const api = { sendMessage: jest.fn().mockRejectedValue(new PeacePadApiError("offline", "network")) } as unknown as PeacePadCoordinationApi;

    await expect(retryQueuedMessage(api, store, { ...scope, sessionId: "session-a" }, pending.id)).resolves.toBe("retained");
    expect(store.values[0]).toMatchObject({ attempts: MAX_OUTBOX_ATTEMPTS, status: "needs-action", lastErrorKind: "network" });
  });

  it("removes only the selected exact-scope entry from this device", async () => {
    const pending = queued({ status: "needs-action", lastErrorKind: "network" });
    const other = queued({ id: "outbox_other123", status: "needs-action", lastErrorKind: "network" });
    const store = new MemoryOutbox([pending, other]);

    await expect(removeQueuedMessage(store, { ...scope, sessionId: "session-a" }, pending.id)).resolves.toBe(true);
    expect(store.values).toEqual([other]);
  });
});
