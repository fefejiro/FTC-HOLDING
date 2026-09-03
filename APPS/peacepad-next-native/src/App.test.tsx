import React from "react";
import { getStateFromPath } from "@react-navigation/native";
import { Share } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PeacePadCoordinationApp, peacePadLinking, resolveStartScreen } from "./App";
import type { PeacePadCoordinationApi } from "./api/CoordinationApi";
import { SyntheticCoordinationApi } from "./api/SyntheticCoordinationApi";
import { CoordinationStateProvider, resolveCalendarStartView, type CoordinationRuntime } from "./coordination/CoordinationState";
import { PendingStagingInvitationProvider } from "./runtime/PeacePadStagingRuntime";

const currentCalendarMonth = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC", year: "numeric" }).format(new Date());

function createTestApi() {
  return new SyntheticCoordinationApi([{
    code: "CALM26",
    preview: {
      invitationId: "invitation-test",
      version: 1,
      inviterDisplayName: "Jordan",
      familyDisplayName: "Shared parenting space",
      invitedRole: "parent",
      permissions: ["messages", "calendar"],
      expiresAt: "2099-01-01T00:00:00.000Z"
    }
  }]);
}

function renderApp(
  startScreen = "home",
  initialCalendarView?: "month" | "week" | "day",
  api: PeacePadCoordinationApi = createTestApi(),
  runtime?: CoordinationRuntime
) {
  return render(
    <CoordinationStateProvider api={api} initialCalendarView={initialCalendarView} runtime={runtime}>
      <PeacePadCoordinationApp startScreen={startScreen} />
    </CoordinationStateProvider>
  );
}

describe("PeacePad coordination shell", () => {
  it("starts safely and rejects unsupported routes", () => {
    expect(resolveStartScreen()).toBe("foundation");
    expect(resolveStartScreen("home")).toBe("home");
    expect(resolveStartScreen("coach")).toBe("coach");
    expect(resolveStartScreen("conch")).toBe("conch");
    expect(resolveStartScreen("evidence-detail")).toBe("foundation");
    expect(resolveStartScreen("production-admin")).toBe("foundation");
  });

  it("makes consent-based Conch mode directly discoverable from More", () => {
    renderApp("more");
    expect(screen.getByLabelText("Open Conch mode")).toBeOnTheScreen();
    expect(screen.getByText("Conch mode")).toBeOnTheScreen();
  });

  it("shows a quiet state-derived Home without internal language", () => {
    renderApp();
    expect(screen.getByRole("header", { name: "Ready for today?" })).toBeOnTheScreen();
    expect(screen.getByText("Small steps. Kind words. Big impact—for your kids.")).toBeOnTheScreen();
    expect(screen.getByText("Upcoming events")).toBeOnTheScreen();
    for (const phrase of ["Premium because", "Gate 1", "Lab-only", "prototype", "mock", "synthetic"]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeOnTheScreen();
    }
  });

  it("keeps PeaceBot Coach reachable before a co-parent connects", () => {
    renderApp();
    fireEvent.press(screen.getByRole("button", { name: "Open PeaceBot Coach" }));
    expect(screen.getByRole("header", { name: "PeaceBot Coach" })).toBeOnTheScreen();
    expect(screen.getByText(/nothing is shared until you choose it/i)).toBeOnTheScreen();
    expect(screen.queryByText("Connect another parent first")).not.toBeOnTheScreen();
  });

  it("keeps internal reconstruction language off the welcome screen", async () => {
    renderApp("foundation");
    expect(await screen.findByText("A calmer way through hard co-parenting moments.")).toBeOnTheScreen();
    for (const phrase of ["Gate 1", "native lab", "synthetic", "staging gate", "Premium lab"]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeOnTheScreen();
    }
  });

  it.each([
    ["Messages", "Get suggestions for clarity and tone before you send. You choose what changes."],
    ["Calendar", currentCalendarMonth],
    ["Records", "Create a Case Binder"],
    ["More", "Family connection"]
  ] as const)("opens %s from primary navigation", (label, expected) => {
    renderApp();
    fireEvent.press(screen.getByLabelText(label));
    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it("routes a deep link to invitation review without accepting it", () => {
    const state = getStateFromPath("invite/CALM26", peacePadLinking.config);
    expect(state?.routes[0]).toMatchObject({ name: "invite", params: { code: "CALM26" } });
  });

  it("opens an authenticated incoming invitation for explicit review", async () => {
    const consume = jest.fn();
    render(
      <PendingStagingInvitationProvider code="CALM26" onConsumed={consume}>
        <CoordinationStateProvider api={createTestApi()}>
          <PeacePadCoordinationApp startScreen="home" />
        </CoordinationStateProvider>
      </PendingStagingInvitationProvider>
    );
    expect(await screen.findByDisplayValue("CALM26")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review invitation" })).toBeOnTheScreen();
    expect(screen.queryByText("Jordan invited you")).not.toBeOnTheScreen();
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it("blocks connected accounts from accepting a second family before family switching exists", async () => {
    const synthetic = createTestApi();
    const connectedApi = new Proxy({
      listCalendarLayers: async () => [],
      listScheduleEvents: async () => [],
      listMessages: async () => [],
      getMessageCheckPreference: async () => synthetic.getMessageCheckPreference("conversation-primary")
    } as unknown as PeacePadCoordinationApi, {
      get: (target, property) => {
        const override = (target as unknown as Record<PropertyKey, unknown>)[property];
        if (override !== undefined) return override;
        const value = (synthetic as unknown as Record<PropertyKey, unknown>)[property];
        return typeof value === "function" ? value.bind(synthetic) : value;
      }
    });
    const runtime: CoordinationRuntime = {
      actorIdentityId: "10000000-0000-4000-8000-000000000001",
      identityVersion: 1,
      sessionId: "10000000-0000-4000-8000-000000000002",
      familyCircleId: "10000000-0000-4000-8000-000000000003",
      participantGrantId: "10000000-0000-4000-8000-000000000004",
      participantGrantVersion: 1,
      conversationId: "10000000-0000-4000-8000-000000000005",
      region: "ca"
    };
    render(
      <CoordinationStateProvider api={connectedApi} runtime={runtime}>
        <PeacePadCoordinationApp startScreen="invite" />
      </CoordinationStateProvider>
    );
    fireEvent.press(await screen.findByRole("tab", { name: "Enter a code" }));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "CALM26");
    fireEvent.press(screen.getByRole("button", { name: "Review invitation" }));
    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    expect(screen.getByText(/already connected to a family/i)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeOnTheScreen();
  });

  it("exposes one selected task tab and routes Home actions", () => {
    renderApp();
    const tabs = screen.getAllByRole("tab").filter((tab) => ["Home", "Messages", "Calendar", "Records", "More"].includes(tab.props.accessibilityLabel));
    expect(tabs.filter((tab) => tab.props.accessibilityState?.selected)).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Send a message" }));
    expect(screen.getByText("Message Check")).toBeOnTheScreen();
  });

  it.each([
    ["Tasks", "Keep small parenting commitments clear and in one place."],
    ["Add a record", "Create a Case Binder"],
    ["Invite co-parent", "Family connection"]
  ] as const)("routes the %s Home action", (action, expected) => {
    renderApp();
    fireEvent.press(screen.getByRole("button", { name: action }));
    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it("opens the ported activity library and keeps location use explicit", () => {
    renderApp();
    fireEvent.press(screen.getByRole("button", { name: "Activity ideas" }));
    expect(screen.getByRole("header", { name: "Activity ideas" })).toBeOnTheScreen();
    expect(screen.getByText(/does not use your location automatically/i)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("radio", { name: "Rainy" }));
    expect(screen.getByText("Indoor Fort Building")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Plan Indoor Fort Building in calendar" }));
    expect(screen.getByLabelText("month calendar")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Indoor Fort Building")).toBeOnTheScreen();
  });

  it("exposes an accessible language choice and updates supported shell text", () => {
    renderApp("more");
    expect(screen.getByRole("radio", { name: "English" }).props.accessibilityState).toEqual({ checked: true });
    fireEvent.press(screen.getByRole("radio", { name: "Français" }));
    expect(screen.getByRole("radio", { name: "Français" }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole("tab", { name: "Accueil" })).toBeOnTheScreen();
    expect(screen.getByText("Confidentialité et consentement")).toBeOnTheScreen();
  });

  it.each([
    ["Français", "Lien familial", "Inviter quelqu’un", "Saisir un code"],
    ["Español", "Conexión familiar", "Invitar a alguien", "Introducir un código"]
  ])("localizes the core family invitation route after selecting %s", (language, familyTitle, createTab, joinTab) => {
    renderApp("more");
    fireEvent.press(screen.getByRole("radio", { name: language }));
    fireEvent.press(screen.getByText(familyTitle));
    expect(screen.getByRole("header", { name: familyTitle })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: createTab })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: joinTab })).toBeOnTheScreen();
  });

  it.each([
    ["Français", "Messages", "Écrivez à votre coparent. PeacePad n’envoie jamais sans votre confirmation.", "Vérification du message", "Activer"],
    ["Español", "Mensajes", "Escribe a tu copadre. PeacePad nunca envía nada sin tu confirmación.", "Revisión del mensaje", "Activar"]
  ])("localizes the default-off Message Check surface after selecting %s", (language, messagesTab, body, checkTitle, turnOn) => {
    renderApp("more");
    fireEvent.press(screen.getByRole("radio", { name: language }));
    fireEvent.press(screen.getByRole("tab", { name: messagesTab }));
    expect(screen.getByText(body)).toBeOnTheScreen();
    expect(screen.getByText(checkTitle)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: turnOn })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /vérifier le message|revisar mensaje/i })).not.toBeOnTheScreen();
  });

  it.each([
    ["Français", "Calendrier", "Partager Parenting Time", "Dossiers", "Créer un classeur", "Nom du classeur"],
    ["Español", "Calendario", "Compartir Parenting Time", "Registros", "Crear un archivador", "Nombre del archivador"]
  ])("localizes Calendar and Records actions while preserving domain layer names in %s", (language, calendarTab, shareLayer, recordsTab, createBinder, binderName) => {
    renderApp("more");
    fireEvent.press(screen.getByRole("radio", { name: language }));
    fireEvent.press(screen.getByRole("tab", { name: calendarTab }));
    expect(screen.getByRole("button", { name: shareLayer })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("tab", { name: recordsTab }));
    expect(screen.getByRole("header", { name: recordsTab })).toBeOnTheScreen();
    expect(screen.getByText(createBinder)).toBeOnTheScreen();
    expect(screen.getByLabelText(binderName)).toBeOnTheScreen();
  });

  it.each([
    ["Français", "Accueil", "Que souhaitez-vous faire?", "Envoyer un message", "Aujourd’hui", "Non connecté"],
    ["Español", "Inicio", "¿Qué te gustaría hacer?", "Enviar un mensaje", "Hoy", "Sin conexión"]
  ])("localizes Home tasks and state summaries with semantic headings in %s", (language, homeTab, _legacyTitle, sendAction, today, disconnected) => {
    renderApp("more");
    fireEvent.press(screen.getByRole("radio", { name: language }));
    fireEvent.press(screen.getByRole("tab", { name: homeTab }));
    expect(screen.getByRole("header", { name: /Prêt pour aujourd’hui\?|¿Listo para hoy\?/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: sendAction })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: today })).toBeOnTheScreen();
    expect(screen.getByText(disconnected)).toBeOnTheScreen();
  });
});

describe("private records", () => {
  it("creates a Case Binder and presents the private file picker", () => {
    renderApp("records");
    fireEvent.changeText(screen.getByLabelText("Binder name"), "School records");
    fireEvent.changeText(screen.getByLabelText("Child label"), "Child A");
    fireEvent.press(screen.getByText("Create Case Binder"));
    expect(screen.getByText("School records")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Choose a file" })).toBeOnTheScreen();
    expect(screen.getByText("Only you can open files in this Case Binder.")).toBeOnTheScreen();
  });

  it("shows validation errors without creating records", () => {
    renderApp("records");
    fireEvent.press(screen.getByText("Create Case Binder"));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a Case Binder name.");
  });
});

describe("secure invitation flow", () => {
  it("previews identity and permissions before explicit acceptance", async () => {
    renderApp("invite");
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "calm26");
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    expect(screen.getByText("Nothing is shared until you accept.")).toBeOnTheScreen();
    expect(screen.queryByText("You’re connected")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Accept invitation"));
    expect(await screen.findByText("You’re connected")).toBeOnTheScreen();
  });

  it("reports invalid codes without exposing family data", async () => {
    renderApp("invite");
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "ABC123");
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Check the code and try again.")).toBeOnTheScreen();
    expect(screen.queryByText("Shared parenting space")).not.toBeOnTheScreen();
  });

  it("creates, shares, and revokes an invitation without connecting anyone", async () => {
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
    renderApp("invite");
    fireEvent.press(screen.getByText("Create invitation"));
    expect(await screen.findByLabelText("Invitation ready")).toBeOnTheScreen();
    expect(screen.getByText("P00001")).toBeOnTheScreen();
    expect(screen.getByLabelText("Scannable invitation QR")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Share invitation"));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledWith({ message: expect.stringContaining("Code: P00001") }));
    fireEvent.press(screen.getByText("Cancel invitation"));
    await waitFor(() => expect(screen.queryByLabelText("Invitation ready")).not.toBeOnTheScreen());
    shareSpy.mockRestore();
  });

  it("declines a preview and clears it without creating a grant", async () => {
    renderApp("invite");
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "calm-26-extra");
    expect(screen.getByDisplayValue("CALM26")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Decline"));
    await waitFor(() => expect(screen.queryByText("Jordan invited you")).not.toBeOnTheScreen());
    expect(screen.queryByText("You’re connected")).not.toBeOnTheScreen();
  });
  it("keeps a failed decline reviewable and reports the error", async () => {
    const api = createTestApi();
    jest.spyOn(api, "declineInvitation").mockRejectedValue(new Error("offline"));
    renderApp("invite", undefined, api);
    fireEvent.press(screen.getByText("Enter a code"));
    fireEvent.changeText(screen.getByLabelText("Invitation code"), "CALM26");
    fireEvent.press(screen.getByText("Review invitation"));
    expect(await screen.findByText("Jordan invited you")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Decline"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not verify/i);
    expect(screen.getByText("Jordan invited you")).toBeOnTheScreen();
  });
});

describe("layered calendar", () => {
  const connectedRuntime: CoordinationRuntime = {
    actorIdentityId: "11111111-1111-4111-8111-111111111111",
    identityVersion: 1,
    sessionId: "10000000-0000-4000-8000-000000000002",
    familyCircleId: "33333333-3333-4333-8333-333333333333",
    participantGrantId: "10000000-0000-4000-8000-000000000004",
    participantGrantVersion: 1,
    conversationId: "55555555-5555-4555-8555-555555555555",
    region: "ca"
  };

  it("lets a connected parent submit a schedule-change request with an awaiting-response state", async () => {
    const synthetic = new SyntheticCoordinationApi();
    const api = new Proxy({} as unknown as PeacePadCoordinationApi, {
      get(target, property) {
        const value = (target as unknown as Record<PropertyKey, unknown>)[property];
        if (value !== undefined) return value;
        const syntheticValue = (synthetic as unknown as Record<PropertyKey, unknown>)[property];
        return typeof syntheticValue === "function" ? syntheticValue.bind(synthetic) : syntheticValue;
      }
    });
    renderApp("calendar", undefined, api, connectedRuntime);
    expect(await screen.findByRole("tab", { name: "Request a schedule change" })).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Event title"), "Weekend visit");
    fireEvent.press(screen.getByRole("tab", { name: "Request a schedule change" }));
    fireEvent.press(screen.getByRole("button", { name: "Save event" }));
    expect((await screen.findAllByText("Weekend visit")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Awaiting response/)).toBeOnTheScreen();
  });

  it("starts private, confirms sharing, switches views, and creates an event", async () => {
    renderApp("calendar");
    expect(screen.getByLabelText("month calendar")).toBeOnTheScreen();
    expect(screen.getAllByText("Private")).toHaveLength(4);
    fireEvent.press(screen.getByLabelText("Share Parenting Time"));
    expect(screen.getByText("Share this calendar?")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Confirm sharing"));
    expect(await screen.findByText("Shared with family")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Week"));
    expect(screen.getByLabelText("week calendar")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Day"));
    expect(screen.getByLabelText("day calendar")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Event title"), "School pickup");
    fireEvent.press(screen.getByText("Save event"));
    expect((await screen.findAllByText("School pickup")).length).toBeGreaterThanOrEqual(2);
  });

  it("uses deterministic calendar proof starts with a safe fallback", () => {
    expect(resolveCalendarStartView("week")).toBe("week");
    expect(resolveCalendarStartView("day")).toBe("day");
    expect(resolveCalendarStartView("unsupported")).toBe("month");
  });

  it("uses named controls so colour is never the only layer signal", () => {
    renderApp("calendar", "week");
    expect(screen.getByLabelText("week calendar")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Hide Parenting Time" })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("checkbox", { name: "Hide Parenting Time" }));
    expect(screen.getByRole("checkbox", { name: "Show Parenting Time" })).toBeOnTheScreen();
  });

  it("cancels expanded sharing and deletes an explicitly created event", async () => {
    renderApp("calendar");
    fireEvent.press(screen.getByLabelText("Share Parenting Time"));
    fireEvent.press(screen.getByText("Keep private"));
    expect(screen.getAllByText("Private").length).toBeGreaterThan(0);
    fireEvent.changeText(screen.getByLabelText("Event title"), "Dentist appointment");
    fireEvent.press(screen.getByText("Save event"));
    expect((await screen.findAllByText("Dentist appointment")).length).toBeGreaterThanOrEqual(2);
    fireEvent.press(screen.getByText("Delete event"));
    expect(screen.getByText("Delete this event? Shared participants may lose access to it.")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Confirm delete"));
    await waitFor(() => expect(screen.queryByText("Dentist appointment")).not.toBeOnTheScreen());
  });

  it("uses entered dates, rejects an invalid time range, and lets a parent return to today", async () => {
    renderApp("calendar");
    const thisMonth = currentCalendarMonth;
    fireEvent.press(screen.getByRole("button", { name: "Previous" }));
    expect(screen.queryByText(thisMonth)).not.toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText(thisMonth)).toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText("Event title"), "Parenting time request");
    fireEvent.changeText(screen.getByLabelText("Starts"), "2026-08-15 14:00");
    fireEvent.changeText(screen.getByLabelText("Ends"), "2026-08-15 13:00");
    fireEvent.press(screen.getByRole("button", { name: "Save event" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid end time after the start time.");
    expect(screen.queryByText("Parenting time request")).not.toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText("Ends"), "2026-08-15 15:00");
    fireEvent.press(screen.getByRole("button", { name: "Save event" }));
    expect((await screen.findAllByText("Parenting time request")).length).toBeGreaterThanOrEqual(1);
  });
});

describe("per-chat Message Check", () => {
  it("is off by default and requires an explicit send", async () => {
    renderApp("messages");
    expect(screen.queryByText("Check message")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Turn on"));
    await waitFor(() => expect(screen.getByText("Message Check on")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Message draft"), "You never confirm anything!!");
    fireEvent.press(screen.getByText("Check message"));
    expect(await screen.findByText("Please confirm the practical details when you can.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Sent message")).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText("Send original"));
    await waitFor(() => expect(screen.getByText("You never confirm anything!!")).toBeOnTheScreen());
  });

  it("searches only after an explicit send", async () => {
    renderApp("messages");
    fireEvent.changeText(screen.getByLabelText("Message draft"), "School pickup is at 6 PM.");
    fireEvent.press(screen.getByText("Send message"));
    await waitFor(() => expect(screen.getByText("School pickup is at 6 PM.")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Search messages"), "pickup");
    fireEvent.press(screen.getByText("Search"));
    expect(await screen.findByLabelText("Message search result")).toHaveTextContent("School pickup is at 6 PM.");
  });

  it("explains opt-in and preserves the original when a correction is saved", async () => {
    renderApp("messages");
    const disclosure = screen.getByRole("button", { name: "How Message Check works" });
    expect(disclosure.props.accessibilityState).toEqual({ expanded: false });
    fireEvent.press(disclosure);
    expect(screen.getByRole("button", { name: "How Message Check works" }).props.accessibilityState).toEqual({ expanded: true });
    fireEvent.changeText(screen.getByLabelText("Message draft"), "Pickup is at 5 PM.");
    fireEvent.press(screen.getByText("Send message"));
    await waitFor(() => expect(screen.getByText("Pickup is at 5 PM.")).toBeOnTheScreen());
    fireEvent.press(screen.getByText("Correct message"));
    expect(screen.getByText("The original remains in the record.")).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText("Correction wording"), "Pickup is at 6 PM.");
    fireEvent.press(screen.getByText("Save correction"));
    await waitFor(() => expect(screen.getByText("Pickup is at 6 PM.")).toBeOnTheScreen());
  });

  it("supports explicit opt-out and validates short searches", async () => {
    renderApp("messages");
    fireEvent.press(screen.getByText("Turn on"));
    expect(await screen.findByText("Message Check on")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Turn off Message Check" }));
    await waitFor(() => expect(screen.queryByText("Message Check on")).not.toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Search messages"), "x");
    expect(screen.getByRole("button", { name: "Search" }).props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("Search messages"), "");
    expect(screen.queryByLabelText("Message search result")).not.toBeOnTheScreen();
  });

  it("never sends when preview generation fails", async () => {
    const api = createTestApi();
    jest.spyOn(api, "previewMessage").mockRejectedValueOnce(new Error("Preview unavailable."));
    renderApp("messages", undefined, api);
    fireEvent.press(screen.getByText("Turn on"));
    await waitFor(() => expect(screen.getByText("Message Check on")).toBeOnTheScreen());
    fireEvent.changeText(screen.getByLabelText("Message draft"), "Please confirm pickup.");
    fireEvent.press(screen.getByText("Check message"));
    expect(await screen.findByText("Preview unavailable.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Sent message")).not.toBeOnTheScreen();
  });
});
