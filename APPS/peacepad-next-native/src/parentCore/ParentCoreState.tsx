import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  CreateChildUpdateInput,
  PeacePadCoordinationApi
} from "../api/CoordinationApi";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import type { CoordinationRuntime } from "../coordination/CoordinationState";
import { createWriteContext, type ChildProfile, type EntityId } from "../domain/v2";
import type {
  ChildUpdate,
  ConchSession,
  ConchReaction,
  ConchTurn,
  ExpenseSettlement,
  FamilyBalance,
  FamilyExpense,
  ScheduledCall,
  SupportResource
} from "../domain/parentCore";

const DEMO_RUNTIME: CoordinationRuntime = {
  actorIdentityId: "11111111-1111-4111-8111-111111111111",
  identityVersion: 1,
  sessionId: "22222222-2222-4222-8222-222222222222",
  familyCircleId: "33333333-3333-4333-8333-333333333333",
  participantGrantId: "44444444-4444-4444-8444-444444444444",
  participantGrantVersion: 1,
  conversationId: "55555555-5555-4555-8555-555555555555",
  region: "ca"
};

type ExpenseDraft = Readonly<{
  title: string;
  amountMinor: number;
  category: FamilyExpense["category"];
  childProfileIds?: readonly EntityId[];
  description?: string;
  receipt?: Readonly<{
    originalFileName: string;
    mediaType: "image/jpeg" | "image/png" | "application/pdf";
    bytes: ArrayBuffer;
  }>;
}>;

type ParentCoreStateValue = Readonly<{
  actorIdentityId: EntityId;
  hydrated: boolean;
  busy: boolean;
  error?: string;
  children: readonly ChildProfile[];
  updates: readonly ChildUpdate[];
  expenses: readonly FamilyExpense[];
  settlements: readonly ExpenseSettlement[];
  balance?: FamilyBalance;
  scheduledCalls: readonly ScheduledCall[];
  supportResources: readonly SupportResource[];
  supportQuery: string;
  otherParentIdentityId?: EntityId;
  conchSession: ConchSession | null;
  conchTurn: ConchTurn | null;
  turnSecondsRemaining: number;
  reload: () => Promise<void>;
  createChild: (displayName: string) => Promise<void>;
  createChildUpdate: (childProfileId: EntityId, title: string, body: string, kind?: CreateChildUpdateInput["kind"]) => Promise<void>;
  createExpense: (draft: ExpenseDraft) => Promise<void>;
  openExpenseReceipt: (receiptAttachmentId: EntityId) => Promise<string>;
  requestSettlement: (expense: FamilyExpense) => Promise<void>;
  resolveSettlement: (settlement: ExpenseSettlement, resolution: "confirmed" | "disputed" | "cancelled") => Promise<void>;
  searchSupport: (query: string, kind?: SupportResource["kind"]) => Promise<void>;
  scheduleCall: (startsAt: string, mediaType: "audio" | "video", note?: string) => Promise<void>;
  cancelScheduledCall: (call: ScheduledCall) => Promise<void>;
  createConch: (mediaType: "audio" | "video") => Promise<void>;
  acceptConch: () => Promise<void>;
  setConchSummaryConsent: (consent: boolean) => Promise<void>;
  reactToConch: (reaction: ConchReaction) => Promise<void>;
  passConch: () => Promise<void>;
  endConch: () => Promise<void>;
}>;

const ParentCoreStateContext = createContext<ParentCoreStateValue | undefined>(undefined);

function context(runtime: CoordinationRuntime, expectedVersion: number | null = null) {
  return createWriteContext({
    idempotencyKey: `parent-core-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    expectedVersion,
    region: runtime.region,
    actor: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId }
  });
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "PeacePad could not finish that action. Try again.";
}

export function ParentCoreStateProvider({
  api,
  children,
  runtime
}: {
  api?: PeacePadCoordinationApi;
  children: ReactNode;
  runtime?: CoordinationRuntime;
}) {
  const resolvedApi = useMemo(() => api ?? new SyntheticCoordinationApi(), [api]);
  const activeRuntime = runtime ?? DEMO_RUNTIME;
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [childrenState, setChildren] = useState<readonly ChildProfile[]>([]);
  const [updates, setUpdates] = useState<readonly ChildUpdate[]>([]);
  const [expenses, setExpenses] = useState<readonly FamilyExpense[]>([]);
  const [settlements, setSettlements] = useState<readonly ExpenseSettlement[]>([]);
  const [balance, setBalance] = useState<FamilyBalance>();
  const [scheduledCalls, setScheduledCalls] = useState<readonly ScheduledCall[]>([]);
  const [supportResources, setSupportResources] = useState<readonly SupportResource[]>([]);
  const [supportQuery, setSupportQuery] = useState("");
  const [otherParentIdentityId, setOtherParentIdentityId] = useState<EntityId>();
  const [conchSession, setConchSession] = useState<ConchSession | null>(null);
  const [conchTurn, setConchTurn] = useState<ConchTurn | null>(null);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState(0);

  const reload = useCallback(async () => {
    setError(undefined);
    const conversationId = activeRuntime.conversationId;
    const [nextChildren, nextUpdates, nextExpenses, nextSettlements, nextBalance, nextCalls, conversations, nextConch] = await Promise.all([
      resolvedApi.listChildProfiles(activeRuntime.familyCircleId),
      resolvedApi.listChildUpdates(activeRuntime.familyCircleId),
      resolvedApi.listExpenses(activeRuntime.familyCircleId),
      resolvedApi.listSettlements(activeRuntime.familyCircleId),
      resolvedApi.getFamilyBalance(activeRuntime.familyCircleId),
      resolvedApi.listScheduledCalls(activeRuntime.familyCircleId),
      resolvedApi.listConversations(activeRuntime.familyCircleId),
      conversationId ? resolvedApi.getCurrentConchSession(conversationId) : Promise.resolve(null)
    ]);
    setChildren(nextChildren);
    setUpdates(nextUpdates);
    setExpenses(nextExpenses);
    setSettlements(nextSettlements);
    setBalance(nextBalance);
    setScheduledCalls(nextCalls);
    setOtherParentIdentityId(conversations.flatMap((item) => item.participantIdentityIds).find((id) => id !== activeRuntime.actorIdentityId));
    setConchSession(nextConch);
    setConchTurn(nextConch?.status === "active" ? await resolvedApi.getCurrentConchTurn(nextConch.id) : null);
  }, [activeRuntime.actorIdentityId, activeRuntime.conversationId, activeRuntime.familyCircleId, resolvedApi]);

  useEffect(() => {
    if (conchSession?.status !== "active" || !conchSession.turnStartedAt) {
      setTurnSecondsRemaining(0);
      return;
    }
    const update = () => setTurnSecondsRemaining(Math.max(0, conchSession.turnDurationSeconds - Math.floor((Date.now() - Date.parse(conchSession.turnStartedAt!)) / 1_000)));
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [conchSession?.id, conchSession?.status, conchSession?.turnDurationSeconds, conchSession?.turnStartedAt]);

  const run = useCallback(async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await operation();
    } catch (cause) {
      setError(messageFor(cause));
      throw cause;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<ParentCoreStateValue>(() => ({
    actorIdentityId: activeRuntime.actorIdentityId,
    hydrated,
    busy,
    error,
    children: childrenState,
    updates,
    expenses,
    settlements,
    balance,
    scheduledCalls,
    supportResources,
    supportQuery,
    otherParentIdentityId,
    conchSession,
    conchTurn,
    turnSecondsRemaining,
    reload: async () => {
      try {
        await run(reload);
      } finally {
        setHydrated(true);
      }
    },
    createChild: (displayName) => run(async () => {
      const child = await resolvedApi.createChildProfile({ familyCircleId: activeRuntime.familyCircleId, displayName }, context(activeRuntime));
      setChildren((current) => [...current, child]);
    }),
    createChildUpdate: (childProfileId, title, body, kind = "general") => run(async () => {
      const update = await resolvedApi.createChildUpdate({
        familyCircleId: activeRuntime.familyCircleId,
        childProfileId,
        kind,
        title,
        body,
        occurredAt: new Date().toISOString(),
        visibility: { scope: otherParentIdentityId ? "family" : "private" }
      }, context(activeRuntime));
      setUpdates((current) => [update, ...current]);
    }),
    createExpense: (draft) => run(async () => {
      const participants = otherParentIdentityId
        ? [
          { identityId: activeRuntime.actorIdentityId, shareType: "percentage" as const, shareValue: 50 },
          { identityId: otherParentIdentityId, shareType: "percentage" as const, shareValue: 50 }
        ]
        : [{ identityId: activeRuntime.actorIdentityId, shareType: "percentage" as const, shareValue: 100 }];
      const receipt = draft.receipt ? await (async () => {
        const intent = await resolvedApi.createAttachmentUploadIntent({
          familyCircleId: activeRuntime.familyCircleId,
          target: { kind: "expense-receipt" },
          originalFileName: draft.receipt!.originalFileName,
          mediaType: draft.receipt!.mediaType,
          byteLength: draft.receipt!.bytes.byteLength
        }, context(activeRuntime));
        await resolvedApi.uploadPrivateAttachment(intent, draft.receipt!.bytes);
        return resolvedApi.completeExpenseReceipt(intent.id, context(activeRuntime));
      })() : null;
      const expense = await resolvedApi.createExpense({
        familyCircleId: activeRuntime.familyCircleId,
        childProfileIds: draft.childProfileIds ?? [],
        title: draft.title,
        description: draft.description ?? null,
        category: draft.category,
        amountMinor: draft.amountMinor,
        currency: "CAD",
        incurredAt: new Date().toISOString(),
        splits: participants,
        receiptAttachmentId: receipt?.id ?? null
      }, context(activeRuntime));
      setExpenses((current) => [expense, ...current]);
    }),
    openExpenseReceipt: async (receiptAttachmentId) => {
      const download = await resolvedApi.getExpenseReceiptDownload(receiptAttachmentId);
      return download.downloadUrl;
    },
    requestSettlement: (expense) => run(async () => {
      if (!otherParentIdentityId) throw new Error("Connect another parent before requesting a settlement.");
      const split = expense.splits.find((item) => item.identityId === otherParentIdentityId);
      const amountMinor = split?.shareType === "fixed"
        ? split.shareValue
        : Math.round(expense.amountMinor * ((split?.shareValue ?? 50) / 100));
      const settlement = await resolvedApi.requestSettlement({
        familyCircleId: activeRuntime.familyCircleId,
        expenseId: expense.id,
        requestedFromIdentityId: otherParentIdentityId,
        amountMinor,
        currency: expense.currency
      }, context(activeRuntime));
      setSettlements((current) => [settlement, ...current]);
      await reload();
    }),
    resolveSettlement: (settlement, resolution) => run(async () => {
      const updated = await resolvedApi.resolveSettlement(settlement.id, resolution, context(activeRuntime, settlement.version));
      setSettlements((current) => current.map((item) => item.id === updated.id ? updated : item));
      await reload();
    }),
    searchSupport: (query, kind) => run(async () => {
      setSupportQuery(query);
      const resources = await resolvedApi.searchSupport({ query, country: activeRuntime.region === "ca" ? "CA" : "US", kind });
      setSupportResources(resources);
    }),
    scheduleCall: (startsAt, mediaType, note) => run(async () => {
      if (!activeRuntime.conversationId || !otherParentIdentityId) throw new Error("Connect another parent before scheduling a call.");
      const call = await resolvedApi.createScheduledCall({
        familyCircleId: activeRuntime.familyCircleId,
        conversationId: activeRuntime.conversationId,
        participantIdentityIds: [activeRuntime.actorIdentityId, otherParentIdentityId],
        mediaType,
        startsAt,
        durationMinutes: 30,
        note: note?.trim() || null
      }, context(activeRuntime));
      setScheduledCalls((current) => [call, ...current]);
    }),
    cancelScheduledCall: (call) => run(async () => {
      const updated = await resolvedApi.cancelScheduledCall(call.id, context(activeRuntime, call.version));
      setScheduledCalls((current) => current.map((item) => item.id === updated.id ? updated : item));
    }),
    createConch: (mediaType) => run(async () => {
      if (!activeRuntime.conversationId) throw new Error("Connect another parent before starting Conch.");
      setConchSession(await resolvedApi.createConchSession({
        familyCircleId: activeRuntime.familyCircleId,
        conversationId: activeRuntime.conversationId,
        mediaType,
        turnDurationSeconds: 120
      }, context(activeRuntime)));
    }),
    acceptConch: () => run(async () => {
      if (!conchSession) return;
      const accepted = await resolvedApi.respondToConchSession(conchSession.id, "accept", context(activeRuntime, conchSession.version));
      setConchSession(accepted);
      setConchTurn(await resolvedApi.getCurrentConchTurn(accepted.id));
    }),
    setConchSummaryConsent: (consent) => run(async () => {
      if (!conchSession) return;
      setConchSession(await resolvedApi.consentToConchSession(conchSession.id, consent, context(activeRuntime, conchSession.version)));
    }),
    reactToConch: (reaction) => run(async () => {
      if (!conchSession || !conchTurn) throw new Error("The current Conch turn is not ready yet.");
      setConchTurn(await resolvedApi.reactToConchTurn(conchSession.id, conchTurn.id, reaction, context(activeRuntime, conchSession.version)));
    }),
    passConch: () => run(async () => {
      if (!conchSession) return;
      const result = await resolvedApi.passConchTurn(conchSession.id, context(activeRuntime, conchSession.version));
      setConchSession(result.session);
      setConchTurn(await resolvedApi.getCurrentConchTurn(result.session.id));
    }),
    endConch: () => run(async () => {
      if (!conchSession) return;
      setConchSession(await resolvedApi.endConchSession(conchSession.id, context(activeRuntime, conchSession.version)));
      setConchTurn(null);
    })
  }), [activeRuntime, balance, busy, childrenState, conchSession, conchTurn, error, expenses, hydrated, otherParentIdentityId, reload, resolvedApi, run, scheduledCalls, settlements, supportQuery, supportResources, turnSecondsRemaining, updates]);

  return <ParentCoreStateContext.Provider value={value}>{children}</ParentCoreStateContext.Provider>;
}

export function useParentCoreState(): ParentCoreStateValue {
  const value = useContext(ParentCoreStateContext);
  if (!value) throw new Error("ParentCoreStateProvider is required.");
  return value;
}
