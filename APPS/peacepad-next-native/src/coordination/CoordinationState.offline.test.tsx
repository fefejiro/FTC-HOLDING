import React from "react";
import { Button, Text } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import { PeacePadApiError } from "../api/PeacePadApiClient";
import { createWriteContext, type MessageCheckPreference, type MessageEvent } from "../domain/v2";
import type { MessageOutboxStore, QueuedMessage } from "../messaging/secureMessageOutbox";
import type { ConnectivityMonitor, ConnectivitySnapshot } from "../connectivity/ConnectivityMonitor";
import { MessagesScreen } from "./CoordinationScreens";
import { CoordinationStateProvider, type CoordinationRuntime, useCoordinationState, visibleMessages } from "./CoordinationState";

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
  participantGrantVersion: 1,
  conversationId: CONVERSATION,
  region: "ca"
};
const runtimeB: CoordinationRuntime = {
  actorIdentityId: "88888888-8888-4888-8888-888888888888",
  identityVersion: 1,
  sessionId: "99999999-9999-4999-8999-999999999999",
  familyCircleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  participantGrantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  participantGrantVersion: 1,
  conversationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
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

function queued(sessionId = SESSION, overrides: Partial<QueuedMessage> = {}): QueuedMessage {
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
    status: "waiting",
    ...overrides
  };
}

const canonicalMessage: MessageEvent = {
  id: "77777777-7777-4777-8777-777777777777",
  schemaVersion: "2.0",
  version: 1,
  region: "ca",
  provenance: {
    createdAt: "2026-08-09T12:02:00.000Z",
    createdBy: { identityId: ACTOR, sessionId: SESSION },
    source: "app"
  },
  familyCircleId: FAMILY,
  conversationId: CONVERSATION,
  eventType: "sent",
  originalMessageEventId: null,
  body: "Clear suggested message.",
  occurredAt: "2026-08-09T12:02:00.000Z"
};

class TestConnectivityMonitor implements ConnectivityMonitor {
  private listener?: (snapshot: ConnectivitySnapshot) => void;
  constructor(private snapshot: ConnectivitySnapshot) {}
  async getCurrent() { return this.snapshot; }
  subscribe(listener: (snapshot: ConnectivitySnapshot) => void) {
    this.listener = listener;
    return { remove: () => { this.listener = undefined; } };
  }
  emit(snapshot: ConnectivitySnapshot) {
    this.snapshot = snapshot;
    this.listener?.(snapshot);
  }
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
      <Text testID="queue-error">{state.queuedActionError ?? ""}</Text>
      <Text testID="preview">{state.messagePreview?.rewordingSuggestion ?? ""}</Text>
      <Button title="draft" onPress={() => state.setMessageDraft("Angry original draft.")} />
      <Button title="check" onPress={() => void state.checkMessage()} />
      <Button title="send suggestion" onPress={() => void state.sendMessage(true)} />
      <Button title="retry queued" onPress={() => void state.retryQueuedMessage("outbox_12345678")} />
      <Button title="remove queued" onPress={() => void state.removeQueuedMessage("outbox_12345678")} />
    </>
  );
}

describe("authenticated offline message recovery", () => {
  it("marks incoming and outgoing bubbles from the canonical actor identity", () => {
    const incoming: MessageEvent = {
      ...canonicalMessage,
      id: "88888888-8888-4888-8888-888888888888",
      body: "A reply from the other parent.",
      provenance: {
        ...canonicalMessage.provenance,
        createdBy: { identityId: "99999999-9999-4999-8999-999999999999", sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
      }
    };
    expect(visibleMessages([canonicalMessage, incoming], ACTOR)).toEqual(expect.arrayContaining([
      expect.objectContaining({ sentBody: "Clear suggested message.", isMine: true, canCorrect: true }),
      expect.objectContaining({ sentBody: "A reply from the other parent.", isMine: false, canCorrect: false })
    ]));
  });

  it("does not spend a retry while offline and resumes the exact queue after reconnect", async () => {
    const connectivity = new TestConnectivityMonitor({ isConnected: false, isInternetReachable: false });
    const outbox = new MemoryOutbox([queued()]);
    const sendMessage = jest.fn(async () => canonicalMessage);
    const coordinationApi = api({
      sendMessage,
      listMessages: jest.fn(async () => sendMessage.mock.calls.length ? [canonicalMessage] : [])
    });
    render(
      <CoordinationStateProvider api={coordinationApi} connectivity={connectivity} outbox={outbox} runtime={runtime}>
        <Probe />
      </CoordinationStateProvider>
    );

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    expect(sendMessage).not.toHaveBeenCalled();
    expect(outbox.values).toHaveLength(1);

    act(() => connectivity.emit({ isConnected: true, isInternetReachable: true }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(outbox.values).toEqual([]));
    expect(screen.getByTestId("messages")).toHaveTextContent("Clear suggested message.|Clear suggested message.|sent");
  });

  it("stops the initial retry batch after the provider unmounts", async () => {
    let resolveFirst: ((message: MessageEvent) => void) | undefined;
    const firstSend = new Promise<MessageEvent>((resolve) => { resolveFirst = resolve; });
    const outbox = new MemoryOutbox([
      queued(SESSION, { id: "outbox_first" }),
      queued(SESSION, {
        id: "outbox_second",
        context: createWriteContext({
          actor: { identityId: ACTOR, sessionId: SESSION },
          idempotencyKey: "offline-proof-second",
          region: "ca"
        })
      })
    ]);
    const sendMessage = jest.fn()
      .mockImplementationOnce(async () => firstSend)
      .mockResolvedValue(canonicalMessage);
    const coordinationApi = api({ sendMessage });
    const view = render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => { resolveFirst?.(canonicalMessage); });
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(outbox.values.map((item) => item.id)).toEqual(["outbox_second"]);
  });

  it("automatically retries a message queued after hydration without remounting", async () => {
    const outbox = new MemoryOutbox();
    const sendMessage = jest.fn()
      .mockRejectedValueOnce(new PeacePadApiError("offline", "network"))
      .mockResolvedValueOnce(canonicalMessage);
    const coordinationApi = api({
      sendMessage,
      listMessages: jest.fn(async () => sendMessage.mock.calls.length >= 2 ? [canonicalMessage] : [])
    });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    fireEvent.press(screen.getByRole("button", { name: "draft" }));
    fireEvent.press(screen.getByRole("button", { name: "check" }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Clear suggested message."));
    fireEvent.press(screen.getByRole("button", { name: "send suggestion" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(outbox.values).toEqual([]));
    expect(sendMessage.mock.calls[1][1]).toEqual(sendMessage.mock.calls[0][1]);
    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("Clear suggested message.|Clear suggested message.|sent"));
  });

  it("does not tight-loop when secure storage fails after a scheduled send", async () => {
    class FailingRemoveOutbox extends MemoryOutbox {
      async remove() { throw new Error("secure storage unavailable"); }
    }
    const outbox = new FailingRemoveOutbox();
    const sendMessage = jest.fn()
      .mockRejectedValueOnce(new PeacePadApiError("offline", "network"))
      .mockResolvedValue(canonicalMessage);
    const coordinationApi = api({ sendMessage });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    fireEvent.press(screen.getByRole("button", { name: "draft" }));
    fireEvent.press(screen.getByRole("button", { name: "check" }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Clear suggested message."));
    fireEvent.press(screen.getByRole("button", { name: "send suggestion" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(outbox.values).toHaveLength(1);
  });

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

  it("manually retries once, reuses the stored context, and reloads the canonical server event", async () => {
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    const coordinationApi = api({
      listMessages: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([canonicalMessage])
    });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "retry queued" }));

    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("Clear suggested message.|Clear suggested message.|sent"));
    expect(coordinationApi.sendMessage).toHaveBeenCalledTimes(1);
    expect(coordinationApi.sendMessage).toHaveBeenCalledWith(pending.input, pending.context);
    expect(outbox.values).toEqual([]);
  });

  it("uses a synchronous lock so two immediate manual retries produce one request", async () => {
    let finish!: (value: MessageEvent) => void;
    const send = jest.fn(() => new Promise<MessageEvent>((resolve) => { finish = resolve; }));
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    const coordinationApi = api({ sendMessage: send });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "retry queued" }));
    fireEvent.press(screen.getByRole("button", { name: "retry queued" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    await act(async () => finish(canonicalMessage));
    await waitFor(() => expect(outbox.values).toEqual([]));
  });

  it("removes only an exact-scope needs-action message", async () => {
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    render(<CoordinationStateProvider api={api()} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "remove queued" }));
    await waitFor(() => expect(outbox.values).toEqual([]));
    expect(screen.getByTestId("messages")).toHaveTextContent("");
  });

  it("requires confirmation and explains that device removal does not recall a message", async () => {
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    render(<CoordinationStateProvider api={api()} outbox={outbox} runtime={runtime}><MessagesScreen /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByText("Needs attention")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "Remove from this device" }));
    expect(screen.getByText(/stops this device from retrying/i)).toBeTruthy();
    expect(screen.getByText(/does not recall a message/i)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Keep message" }));
    expect(outbox.values).toEqual([pending]);

    fireEvent.press(screen.getByRole("button", { name: "Remove from this device" }));
    fireEvent.press(screen.getByRole("button", { name: "Remove from this device" }));
    await waitFor(() => expect(outbox.values).toEqual([]));
    expect(screen.queryByText("Needs attention")).toBeNull();
  });

  it("does not claim a successful retry remains queued when canonical refresh fails", async () => {
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    const coordinationApi = api({
      listMessages: jest.fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error("refresh unavailable"))
    });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "retry queued" }));
    await waitFor(() => expect(screen.getByTestId("queue-error")).toHaveTextContent("Message sent. PeacePad could not refresh this conversation yet."));
    expect(screen.getByTestId("messages")).toHaveTextContent("");
    expect(outbox.values).toEqual([]);
    expect(screen.getByTestId("queue-error")).not.toHaveTextContent("remains");
  });

  it("reloads canonical messages after removing a device copy from an ambiguous timeout", async () => {
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    const coordinationApi = api({
      listMessages: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([canonicalMessage])
    });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "remove queued" }));
    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("Clear suggested message.|Clear suggested message.|sent"));
    expect(outbox.values).toEqual([]);
  });

  it("does not claim removal failed when post-removal refresh is unavailable", async () => {
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    const coordinationApi = api({
      listMessages: jest.fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error("refresh unavailable"))
    });
    render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "remove queued" }));
    await waitFor(() => expect(screen.getByTestId("queue-error")).toHaveTextContent("Removed from this device. PeacePad could not refresh this conversation yet."));
    expect(screen.getByTestId("messages")).toHaveTextContent("");
    expect(outbox.values).toEqual([]);
    expect(screen.getByTestId("queue-error")).not.toHaveTextContent("could not remove");
  });

  it("does not surface an in-flight retry result after the authenticated runtime switches", async () => {
    let finish!: (value: MessageEvent) => void;
    const send = jest.fn(() => new Promise<MessageEvent>((resolve) => { finish = resolve; }));
    const pending = queued(SESSION, { status: "needs-action", lastErrorKind: "network" });
    const outbox = new MemoryOutbox([pending]);
    const coordinationApi = api({ sendMessage: send });
    const view = render(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtime}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    fireEvent.press(screen.getByRole("button", { name: "retry queued" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));

    view.rerender(<CoordinationStateProvider api={coordinationApi} outbox={outbox} runtime={runtimeB}><Probe /></CoordinationStateProvider>);
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    await act(async () => finish(canonicalMessage));

    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent(""));
    expect(screen.getByTestId("queue-error")).toHaveTextContent("");
  });
});
