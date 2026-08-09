import React from "react";
import { Button, Text } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PeacePadCoordinationApi } from "../api/CoordinationApi";
import type { MessageCheckPreference } from "../domain/v2";
import {
  CoordinationStateProvider,
  type CoordinationRuntime,
  useCoordinationState
} from "./CoordinationState";

const ACTOR_A = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_A = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_B = "33333333-3333-4333-8333-333333333333";
const FAMILY_A = "44444444-4444-4444-8444-444444444444";
const SESSION_A = "55555555-5555-4555-8555-555555555555";
const GRANT_A = "66666666-6666-4666-8666-666666666666";

const runtime = (conversationId = CONVERSATION_A): CoordinationRuntime => ({
  actorIdentityId: ACTOR_A,
  identityVersion: 1,
  conversationId,
  familyCircleId: FAMILY_A,
  participantGrantId: GRANT_A,
  region: "ca",
  sessionId: SESSION_A
});

const preference = (
  conversationId: string,
  enabled: boolean,
  version: number
): MessageCheckPreference => ({
  aiAssistanceEnabled: false,
  conversationId,
  enabled,
  id: `preference-${conversationId}`,
  identityId: ACTOR_A,
  provenance: {
    createdAt: "2026-08-09T12:00:00.000Z",
    createdBy: { identityId: ACTOR_A, sessionId: SESSION_A },
    source: "app"
  },
  region: "ca",
  schemaVersion: "2.0",
  version
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function apiWithMessageCheck(overrides: Partial<PeacePadCoordinationApi> = {}) {
  return {
    listCalendarLayers: jest.fn(async () => []),
    listScheduleEvents: jest.fn(async () => []),
    listMessages: jest.fn(async () => []),
    getMessageCheckPreference: jest.fn(async (conversationId: string) => preference(conversationId, false, 0)),
    setMessageCheckPreference: jest.fn(async (conversationId: string, enabled: boolean) => preference(conversationId, enabled, 1)),
    previewMessage: jest.fn(),
    ...overrides
  } as unknown as PeacePadCoordinationApi;
}

function Probe() {
  const state = useCoordinationState();
  return (
    <>
      <Text testID="hydrated">{String(state.messageCheckHydrated)}</Text>
      <Text testID="enabled">{String(state.messageCheckEnabled)}</Text>
      <Button
        disabled={!state.messageCheckHydrated}
        onPress={() => void state.setMessageCheckEnabled(!state.messageCheckEnabled)}
        title="toggle"
      />
    </>
  );
}

function renderProbe(api: PeacePadCoordinationApi, coordinationRuntime?: CoordinationRuntime | null) {
  return render(
    <CoordinationStateProvider api={api} runtime={coordinationRuntime}>
      <Probe />
    </CoordinationStateProvider>
  );
}

describe("persisted Message Check runtime", () => {
  it("hydrates with the authenticated conversation UUID", async () => {
    const api = apiWithMessageCheck({
      getMessageCheckPreference: jest.fn(async () => preference(CONVERSATION_A, true, 7))
    });
    renderProbe(api, runtime());

    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"), { timeout: 10_000 });
    expect(screen.getByTestId("enabled")).toHaveTextContent("true");
    expect(api.getMessageCheckPreference).toHaveBeenCalledTimes(1);
    expect(api.getMessageCheckPreference).toHaveBeenCalledWith(CONVERSATION_A);
    expect(JSON.stringify((api.getMessageCheckPreference as jest.Mock).mock.calls)).not.toMatch(/conversation-primary|identity-current|family-current/);
  });

  it("does not allow a toggle before hydration completes", async () => {
    const pending = deferred<MessageCheckPreference>();
    const api = apiWithMessageCheck({ getMessageCheckPreference: jest.fn(() => pending.promise) });
    renderProbe(api, runtime());

    expect(screen.getByText("Loading your family space")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "toggle" })).toBeNull();
    expect(api.setMessageCheckPreference).not.toHaveBeenCalled();

    await act(async () => pending.resolve(preference(CONVERSATION_A, true, 3)));
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    expect(screen.getByRole("button", { name: "toggle" })).toBeEnabled();
  });

  it("rehydrates on conversation change and ignores the stale result", async () => {
    const pendingA = deferred<MessageCheckPreference>();
    const pendingB = deferred<MessageCheckPreference>();
    const get = jest.fn((conversationId: string) => conversationId === CONVERSATION_A ? pendingA.promise : pendingB.promise);
    const api = apiWithMessageCheck({ getMessageCheckPreference: get });
    const view = renderProbe(api, runtime(CONVERSATION_A));

    view.rerender(
      <CoordinationStateProvider api={api} runtime={runtime(CONVERSATION_B)}>
        <Probe />
      </CoordinationStateProvider>
    );
    await waitFor(() => expect(get).toHaveBeenCalledWith(CONVERSATION_B));
    await act(async () => pendingB.resolve(preference(CONVERSATION_B, false, 0)));
    await waitFor(() => expect(screen.getByTestId("hydrated")).toHaveTextContent("true"));
    expect(screen.getByTestId("enabled")).toHaveTextContent("false");

    await act(async () => pendingA.resolve(preference(CONVERSATION_A, true, 8)));
    expect(screen.getByTestId("enabled")).toHaveTextContent("false");
  });

  it("clears state on sign-out and ignores an in-flight hydration", async () => {
    const pending = deferred<MessageCheckPreference>();
    const api = apiWithMessageCheck({ getMessageCheckPreference: jest.fn(() => pending.promise) });
    const view = renderProbe(api, runtime());

    view.rerender(
      <CoordinationStateProvider api={api} runtime={null}>
        <Probe />
      </CoordinationStateProvider>
    );
    expect(screen.getByText("Loading your family space")).toBeTruthy();
    expect(screen.queryByTestId("enabled")).toBeNull();

    await act(async () => pending.resolve(preference(CONVERSATION_A, true, 4)));
    expect(screen.queryByTestId("enabled")).toBeNull();
    expect(api.setMessageCheckPreference).not.toHaveBeenCalled();
  });

  it("uses each returned version for the next optimistic write", async () => {
    const set = jest.fn()
      .mockResolvedValueOnce(preference(CONVERSATION_A, false, 8))
      .mockResolvedValueOnce(preference(CONVERSATION_A, true, 9));
    const api = apiWithMessageCheck({
      getMessageCheckPreference: jest.fn(async () => preference(CONVERSATION_A, true, 7)),
      setMessageCheckPreference: set
    });
    renderProbe(api, runtime());
    await waitFor(() => expect(screen.getByTestId("enabled")).toHaveTextContent("true"));

    fireEvent.press(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() => expect(screen.getByTestId("enabled")).toHaveTextContent("false"));
    expect(set.mock.calls[0][2]).toMatchObject({
      actor: { identityId: ACTOR_A, sessionId: SESSION_A },
      expectedVersion: 7,
      region: "ca"
    });

    fireEvent.press(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() => expect(screen.getByTestId("enabled")).toHaveTextContent("true"));
    expect(set.mock.calls[1][2]).toMatchObject({ expectedVersion: 8 });
  });

  it("fails closed without a valid authenticated runtime", async () => {
    const api = apiWithMessageCheck();
    renderProbe(api, {
      actorIdentityId: "identity-current",
      identityVersion: 1,
      conversationId: "conversation-primary",
      familyCircleId: "family-current",
      participantGrantId: "grant-current",
      region: "ca",
      sessionId: "device-session"
    });

    expect(screen.getByText("Loading your family space")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "toggle" })).toBeNull();
    expect(api.getMessageCheckPreference).not.toHaveBeenCalled();
    expect(api.setMessageCheckPreference).not.toHaveBeenCalled();
  });
});
