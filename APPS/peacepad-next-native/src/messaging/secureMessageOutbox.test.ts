import * as SecureStore from "expo-secure-store";
import { PeacePadApiError } from "../api/PeacePadApiClient";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import { createWriteContext } from "../domain/v2";
import {
  MAX_OUTBOX_ATTEMPTS,
  MAX_OUTBOX_BODY_LENGTH,
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
  context,
  queuedAt: "2026-08-05T12:00:00.000Z",
  attempts: 0,
  ...overrides
});

class MemoryOutbox implements MessageOutboxStore {
  values: QueuedMessage[];
  constructor(values: QueuedMessage[]) { this.values = values; }
  async list() { return this.values; }
  async enqueue(value: QueuedMessage) { this.values.push(value); }
  async replace(value: QueuedMessage) { this.values = this.values.map((item) => item.id === value.id ? value : item); }
  async remove(id: string) { this.values = this.values.filter((item) => item.id !== id); }
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
    await expect(retryQueuedMessages(api, store)).resolves.toEqual({ sent: 0, retained: 1, discarded: 0 });
    expect(store.values[0]).toMatchObject({ attempts: 1, context: { idempotencyKey: "message-intent-123" } });
  });

  it("removes successful, permanent, and exhausted entries without duplicate sends", async () => {
    const success = queued();
    const permanent = queued({ id: "outbox_87654321" });
    const exhausted = queued({ id: "outbox_abcdefgh", attempts: MAX_OUTBOX_ATTEMPTS });
    const store = new MemoryOutbox([success, permanent, exhausted]);
    const api = { sendMessage: jest.fn()
      .mockResolvedValueOnce({ id: "message-1" })
      .mockRejectedValueOnce(new PeacePadApiError("forbidden", "http", 403)) } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store)).resolves.toEqual({ sent: 1, retained: 0, discarded: 2 });
    expect(store.values).toHaveLength(0);
    expect(api.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("retains queued intent without consuming an attempt while authentication is unavailable", async () => {
    const store = new MemoryOutbox([queued()]);
    const api = { sendMessage: jest.fn().mockRejectedValue(new PeacePadApiError("sign in", "auth-required", 401)) } as unknown as PeacePadCoordinationApi;
    await expect(retryQueuedMessages(api, store)).resolves.toEqual({ sent: 0, retained: 1, discarded: 0 });
    expect(store.values).toEqual([queued()]);
  });
});
