import React from "react";
import { Button, Text } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import { PeacePadApiError } from "../api/PeacePadApiClient";
import { createWriteContext, type MessageCheckPreference } from "../domain/v2";
import type { MessageOutboxStore, QueuedMessage } from "../messaging/secureMessageOutbox";
import { CoordinationStateProvider, type CoordinationRuntime, useCoordinationState } from "./CoordinationState";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const FAMILY = "33333333-3333-4333-8333-333333333333";
const CONVERSATION = "44444444-4444-4444-8444-444444444444";
const GRANT = "55555555-5555-4555-8555-555555555555";

const runtime: CoordinationRuntime = {
  actorIdentityId: ACTOR,
  identityVersion: 1,
  sessionId: SESSION,
  familyCircleId: FAMILY,
  participantGrantId: GRANT,
  conversationId: CONVERSATION,
  region: "ca"
};

const preference: MessageCheckPreference = {
  aiAssistanceEnabled: false,
  conversationId: CONVERSATION,
  enabled: true,
  id: "66666666-6666-4666-8666-666666666666",
  identityId: ACTOR,
  provenance: {
    createdAt: "2026-08-09T12:00:00.000Z",
    createdBy: { identityId: ACTOR, sessionId: SESSION },
    source: "app"
  },
  region: "ca",
  schemaVersion: "2.0",
  version: 1
};

class MemoryOutbox implements MessageOutboxStore {
  values: QueuedMessage[];
  constructor(values: QueuedMessage[] = []) { this.values = values; }
  async list() { return this.values; }
  async enqueue(value: QueuedMessage) { this.values.push(value); }
  async replace(value: QueuedMessage) { this.values = this.values.map((item) => item.id === value.id ? value : item); }
  async remove(id: string) { this.values = this.values.filter((item) => item.id !== id); }
  async clear() { this.values = []; }
}

function queued(sessionId = SESSION): QueuedMessage {
  return {
    id: "outbox_12345678",
    input: { familyCircleId: FAMILY, conversationId: CONVERSATION, body: "Clear suggested message." },
    originalBody: "Angry original draft.",
    context: createWriteContext({
      actor: { identityId: ACTOR, sessionId },
      idempotencyKey: "offline-proof-123",
      region: "ca"
    }),
    queuedAt: "2026-08-09T12:00:00.000Z",
    nextAttemptAt: "2026-08-09T12:00:00.000Z",
    attempts: 0,
    status: "waiting"
  };
}

function api(overrides: Partial<PeacePadCoordinationApi> = {}) {
  return {
    listCalendarLayers: jest.fn(async () => []),
    listScheduleEvents: jest.fn(async () => []),
    listMessages: jest.fn(async () => []),
    getMessageCheckPreference: jest.fn(async () => preference),
    previewMessage: jest.fn(async () => ({
      originalMessage: "Angry original draft.",
      rewordingSuggestion: "Clear suggested message.",
      tone: { label: "direct", score: 0.5 },
      flags: [],
      ruleBasedOnly: true
    })),
    sendMessage: jest.fn(async () => ({ id: "77777777-7777-4777-8777-777777777777" })),
    ...overrides
  } as unknown as PeacePadCoordinationApi;
}

function Probe() {
  const state = useCoordinationState();
  return (
    <>
      <Text testID="hydrated">{String(state.coordinationHydrated)}</Text>
      <Text testID="messages">{state.sentMessages.map((message) => `${message.originalBody}|${message.sentBody}|${message.status}`).join(";")}</Text>
      <Text testID="preview">{state.messagePreview?.rewordingSuggestion ?? ""}</Text>
      <Button title="draft" onPress={() => state.setMessageDraft("Angry original draft.")} />
      <Button title="check" onPress={() => void state.checkMessage()} />
      <Button title="send suggestion" onPress={() => void state.sendMessage(true)} />
    </>
  );
}

describe("authenticated offline message recovery", () => {
  it("retries an exact-session intent once and removes it after success", async () => {
    const outbox = new MemoryOutbox([queued()]);
    const coordinationApi = api();
    const view = render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    expect(coordinationApi.sendMessage).toHaveBeenCalledTimes(1);
    expect(outbox.values).toEqual([]);

    view.rerender(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={{ ...runtime }}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    expect(coordinationApi.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("never displays or retries a message owned by an earlier session", async () => {
    const stale = queued("88888888-8888-4888-8888-888888888888");
    const outbox = new MemoryOutbox([stale]);
    const coordinationApi = api();
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    expect(coordinationApi.sendMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId("messages")).toHaveTextContent("");
    expect(outbox.values).toEqual([stale]);
  });

  it("queues a suggested message while preserving the original draft", async () => {
    const outbox = new MemoryOutbox();
    const coordinationApi = api({ sendMessage: jest.fn(async () => { throw new PeacePadApiError("offline", "network"); }) });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "draft" }));
    fireEvent.press(screen.getByRole("button", { name: "check" }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Clear suggested message."));
    fireEvent.press(screen.getByRole("button", { name: "send suggestion" }));

    await waitFor(() => expect(outbox.values).toHaveLength(1));
    expect(outbox.values[0]).toMatchObject({
      originalBody: "Angry original draft.",
      input: { body: "Clear suggested message." },
      status: "waiting"
    });
    expect(screen.getByTestId("messages")).toHaveTextContent("Angry original draft.|Clear suggested message.|waiting");
  });
});
