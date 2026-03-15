import type { PreflightResponse } from "@ftc/peacepad-sdk";
import {
  detectSupportedSite,
  getComposerText,
  replaceComposerText,
  resolveComposerFromTarget,
  resolveSendTriggerFromTarget,
  triggerSend,
  type SupportedSite,
} from "./adapters";
import {
  getApprovedActionLabel,
  getEffectivePreflightIntent,
  getReviewNote,
  getRiskBadgeTheme,
  resolveInFlightSendAction,
  resolveWhatsappHandoffDecision,
} from "./contentHelpers";
import { canUseAuto, getSettings } from "./storage";

const site = detectSupportedSite(window.location.hostname);
const LOG_PREFIX = "[PeacePad]";
const CONTENT_SENTINEL = "__peacepadPreSendContentLoaded__";

const MIN_CHARS_FOR_BACKGROUND_ANALYSIS = 18;
const MIN_CHARS_FOR_SEND_GATE = 5;
const BACKGROUND_DEBOUNCE_MS = 900;
const SUPPRESS_AFTER_SEND_MS = 1200;
const SEND_RELEASE_SETTLE_MS = 120;
const MAX_SUGGESTED_SEND_ATTEMPTS = 3;

type SendSource = "enter_key" | "send_button_click" | "manual_after_apply";
type WhatsappHandoffState = "blocked" | "ready";

let suppressAutoUntil = 0;
let debounceHandle: number | null = null;
let pendingComposer: HTMLElement | null = null;
let analysisInFlight = false;
let sendReleaseInFlight = false;
let pendingSendGate:
  | {
      composer: HTMLElement;
      site: SupportedSite;
      fingerprint: string;
      source: SendSource;
    }
  | null = null;
let activeModal:
  | {
      composer: HTMLElement;
      fingerprint: string;
    }
  | null = null;
let whatsappApprovedHandoff:
  | {
      composer: HTMLElement;
      blockedOriginalFingerprint: string;
      blockedOriginalText: string;
      approvedText: string;
      approvedFingerprint: string;
      preflight: PreflightResponse;
      state: WhatsappHandoffState;
      readyBannerCollapsed: boolean;
      readyBannerPinned: boolean;
      createdAt: number;
    }
  | null = null;
let activeHandoffBanner: HTMLDivElement | null = null;
let whatsappApprovedHandoffObserver: MutationObserver | null = null;
let whatsappApprovedHandoffEvaluationHandle: number | null = null;
let whatsappReadyBannerCollapseHandle: number | null = null;
let whatsappLastPasteSignalAt = 0;

let lastAnalyzedFingerprint = "";
let lastSafeFingerprint = "";
let lastDismissedFingerprint = "";
let lastErrorToastAt = 0;

if (site) {
  const bootstrapState = window as typeof window & { [CONTENT_SENTINEL]?: boolean };
  if (bootstrapState[CONTENT_SENTINEL]) {
    log("content script already active", { site, host: window.location.hostname });
  } else {
    bootstrapState[CONTENT_SENTINEL] = true;
    log("content script loaded", { site, host: window.location.hostname });
    bootstrap(site);
  }
}

function bootstrap(currentSite: SupportedSite): void {
  log("bootstrapping monitor", { site: currentSite });
  installPassiveWatcher(currentSite);
  installWhatsappPasteWatcher(currentSite);
  installSendGate(currentSite);
  installClickSendGate(currentSite);
  installViewportPolish(currentSite);
}

function isPeacePadUiTarget(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null;
  return Boolean(element?.closest("#peacepad-preflight-modal"));
}

function installPassiveWatcher(currentSite: SupportedSite): void {
  document.addEventListener(
    "input",
    (event) => {
      if (Date.now() < suppressAutoUntil) {
        return;
      }

      if (isPeacePadUiTarget(event.target)) {
        return;
      }

      const composer = resolveComposerFromTarget(currentSite, event.target);
      if (!composer) {
        return;
      }

      const currentText = getComposerText(composer).trim();
      if (getWhatsappApprovedHandoffForComposer(currentSite, composer)) {
        const handoffHandled = handleWhatsappApprovedHandoffInput(currentSite, composer, currentText);
        if (handoffHandled) {
          return;
        }
      }

      log("draft detected", {
        site: currentSite,
        chars: currentText.length,
      });
      scheduleBackgroundCheck(composer, currentSite);
    },
    true,
  );
}

function installWhatsappPasteWatcher(currentSite: SupportedSite): void {
  if (currentSite !== "whatsapp") {
    return;
  }

  document.addEventListener(
    "paste",
    (event) => {
      const composer = resolveComposerFromTarget(currentSite, event.target);
      if (!composer) {
        return;
      }

      const handoff = getWhatsappApprovedHandoffForComposer(currentSite, composer);
      if (!handoff) {
        return;
      }

      whatsappLastPasteSignalAt = Date.now();
      log("paste detected", {
        site: currentSite,
        source: "manual_after_apply",
        method: "paste_event",
        charsBefore: getComposerText(composer).trim().length,
      });

      scheduleWhatsappApprovedHandoffEvaluation(composer, "manual_after_apply", "paste_event");
    },
    true,
  );
}

function scheduleBackgroundCheck(composer: HTMLElement, currentSite: SupportedSite): void {
  pendingComposer = composer;

  if (debounceHandle !== null) {
    window.clearTimeout(debounceHandle);
  }

  debounceHandle = window.setTimeout(() => {
    void runBackgroundCheck(currentSite);
  }, BACKGROUND_DEBOUNCE_MS);
}

async function runBackgroundCheck(currentSite: SupportedSite): Promise<void> {
  const composer = pendingComposer;
  pendingComposer = null;
  debounceHandle = null;

  if (!composer || analysisInFlight || isComposerBlockedByModal(composer)) {
    return;
  }

  const settings = await getSettings();
  if (!canUseAuto(settings, currentSite)) {
    log("background check skipped", { site: currentSite, reason: "auto_disabled" });
    return;
  }

  const text = getComposerText(composer).trim();
  if (handleWhatsappApprovedHandoffInput(currentSite, composer, text)) {
    return;
  }

  if (text.length < MIN_CHARS_FOR_BACKGROUND_ANALYSIS) {
    log("background check skipped", { site: currentSite, reason: "too_short", chars: text.length });
    return;
  }

  const draftFingerprint = fingerprint(text);
  if (!draftFingerprint || draftFingerprint === lastAnalyzedFingerprint) {
    return;
  }

  if (!hasMaterialChange(draftFingerprint, lastDismissedFingerprint)) {
    return;
  }

  lastAnalyzedFingerprint = draftFingerprint;
  await runPreflight(composer, currentSite, "background", "enter_key");
}

function installSendGate(currentSite: SupportedSite): void {
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }

      if (Date.now() < suppressAutoUntil) {
        return;
      }

      if (isPeacePadUiTarget(event.target)) {
        return;
      }

      if (sendReleaseInFlight) {
        blockSendEvent(event, currentSite, "enter_key");
        log("send blocked while release is in progress", { site: currentSite, source: "enter_key" });
        return;
      }

      const composer = resolveComposerFromTarget(currentSite, event.target);
      if (!composer) {
        return;
      }

      const text = getComposerText(composer).trim();
      if (!text || text.length < MIN_CHARS_FOR_SEND_GATE) {
        return;
      }

      const draftFingerprint = fingerprint(text);
      if (handleWhatsappApprovedHandoffBeforeSend(event, currentSite, composer, draftFingerprint, "enter_key", text.length)) {
        return;
      }

      if (draftFingerprint === lastSafeFingerprint) {
        log("send gate bypassed", {
          site: currentSite,
          source: "enter_key",
          reason: "already_cleared",
          chars: text.length,
        });
        return;
      }

      if (isComposerBlockedByModal(composer, draftFingerprint)) {
        blockSendEvent(event, currentSite, "enter_key");
        log("send blocked while modal is unresolved", { site: currentSite, source: "enter_key" });
        return;
      }

      blockSendEvent(event, currentSite, "enter_key");
      log("send gate intercepted", { site: currentSite, source: "enter_key", chars: text.length });
      void runPreflight(composer, currentSite, "send_gate", "enter_key");
    },
    true,
  );
}

function installClickSendGate(currentSite: SupportedSite): void {
  document.addEventListener(
    "click",
    (event) => {
      if (Date.now() < suppressAutoUntil) {
        return;
      }

      if (isPeacePadUiTarget(event.target)) {
        return;
      }

      if (sendReleaseInFlight) {
        blockSendEvent(event, currentSite, "send_button_click");
        log("send blocked while release is in progress", { site: currentSite, source: "send_button_click" });
        return;
      }

      const sendTrigger = resolveSendTriggerFromTarget(currentSite, event.target);
      if (!sendTrigger) {
        return;
      }

      const composer = resolveComposerFromTarget(currentSite, event.target);
      if (!composer) {
        log("send trigger found without composer", { site: currentSite, source: "send_button_click" });
        return;
      }

      const text = getComposerText(composer).trim();
      if (!text || text.length < MIN_CHARS_FOR_SEND_GATE) {
        return;
      }

      const draftFingerprint = fingerprint(text);
      if (handleWhatsappApprovedHandoffBeforeSend(event, currentSite, composer, draftFingerprint, "send_button_click", text.length)) {
        return;
      }

      if (draftFingerprint === lastSafeFingerprint) {
        log("send gate bypassed", {
          site: currentSite,
          source: "send_button_click",
          reason: "already_cleared",
          chars: text.length,
        });
        return;
      }

      if (isComposerBlockedByModal(composer, draftFingerprint)) {
        blockSendEvent(event, currentSite, "send_button_click");
        log("send blocked while modal is unresolved", { site: currentSite, source: "send_button_click" });
        return;
      }

      blockSendEvent(event, currentSite, "send_button_click");
      log("send gate intercepted", { site: currentSite, source: "send_button_click", chars: text.length });
      void runPreflight(composer, currentSite, "send_gate", "send_button_click");
    },
    true,
  );
}

async function runPreflight(
  composer: HTMLElement,
  currentSite: SupportedSite,
  intent: "background" | "send_gate",
  source: SendSource,
): Promise<void> {
  const initialText = getComposerText(composer).trim();
  const initialFingerprint = fingerprint(initialText);

  if (analysisInFlight) {
    const inFlightResolution = resolveInFlightSendAction(intent);
    if (inFlightResolution.queueSendGate) {
      pendingSendGate = {
        composer,
        site: currentSite,
        fingerprint: initialFingerprint,
        source,
      };
      log("send gate queued while analysis is in flight", {
        site: currentSite,
        source,
        chars: initialText.length,
      });
    }
    return;
  }

  const text = getComposerText(composer).trim();
  if (!text) {
    if (intent === "send_gate") {
      releaseSend(composer, currentSite, "empty_draft_release");
    }
    return;
  }

  const settings = await getSettings();
  if (!canUseAuto(settings, currentSite)) {
    log("preflight skipped", { site: currentSite, intent, reason: "auto_disabled" });
    if (intent === "send_gate") {
      releaseSend(composer, currentSite, "auto_disabled_release", text);
    }
    return;
  }

  const draftFingerprint = fingerprint(text);
  const pendingMatchesCurrentDraft =
    Boolean(pendingSendGate) &&
    pendingSendGate?.composer === composer &&
    pendingSendGate?.fingerprint === draftFingerprint;
  const effectiveIntent = getEffectivePreflightIntent(intent, pendingMatchesCurrentDraft);
  if (pendingMatchesCurrentDraft && intent === "background") {
    log("background analysis promoted to send gate", {
      site: currentSite,
      chars: text.length,
    });
  }

  log("preflight triggered", {
    site: currentSite,
    source,
    intent: effectiveIntent,
    chars: text.length,
  });
  analysisInFlight = true;
  try {
    const response = await requestPreflight({
      text,
      channel: currentSite,
      mode: effectiveIntent === "background" ? "auto_background" : "auto_send_gate",
      metadata: {
        site: currentSite,
        path: window.location.pathname,
        host: window.location.hostname,
        send_source: source,
      },
    });

    if (!response.ok) {
      log("preflight failed", {
        site: currentSite,
        source,
        intent: effectiveIntent,
        status: response.error?.status ?? null,
        message: response.error?.message ?? "unknown_error",
      });
      if (response.error?.status === 401) {
        showToastThrottled("Please sign in to PeacePad first.");
      } else {
        showToastThrottled(response.error?.message || "Preflight failed.");
      }
      if (effectiveIntent === "send_gate") {
        releaseSend(composer, currentSite, "preflight_failed_release", text);
      }
      return;
    }

    const preflight = response.data;
    const localRulesResult = preflight.model_or_ruleset_version.escalation_ruleset.startsWith("extension-local-rules");
    log(localRulesResult ? "local preflight result received" : "api preflight result received", {
      site: currentSite,
      intent: effectiveIntent,
      ruleset: preflight.model_or_ruleset_version.escalation_ruleset,
      summary: preflight.source.summary,
    });

    const intervene = shouldIntervene(preflight);
    log("intervention decision returned", {
      site: currentSite,
      source,
      intent: effectiveIntent,
      risk: preflight.risk_level,
      score: preflight.conflict_score,
      recommendation: preflight.recommendation,
      intervene,
    });
    if (!intervene) {
      lastSafeFingerprint = draftFingerprint;
      if (effectiveIntent === "send_gate") {
        releaseSend(composer, currentSite, "preflight_cleared_release", text);
      }
      return;
    }

    if (!hasMaterialChange(draftFingerprint, lastDismissedFingerprint) && effectiveIntent === "background") {
      return;
    }

    log("showing intervention modal", {
      site: currentSite,
      source,
      risk: preflight.risk_level,
    });
    showPreflightModal(currentSite, preflight, composer, draftFingerprint, text);
  } finally {
    analysisInFlight = false;
    if (pendingMatchesCurrentDraft) {
      pendingSendGate = null;
      return;
    }

    const queuedSendGate = pendingSendGate;
    if (queuedSendGate) {
      pendingSendGate = null;
      void runPreflight(queuedSendGate.composer, queuedSendGate.site, "send_gate", queuedSendGate.source);
    }
  }
}

function shouldIntervene(preflight: PreflightResponse): boolean {
  if (preflight.send_policy.requires_acknowledgement) return true;
  if (preflight.risk_level === "critical" || preflight.risk_level === "high") return true;
  if (preflight.moderation_flags.length > 0) return true;
  if (preflight.recommendation === "pause_before_send" || preflight.recommendation === "review_and_rewrite") {
    return true;
  }
  if (preflight.risk_level === "medium" && preflight.signals.length >= 2) {
    return true;
  }
  return false;
}

async function requestPreflight(payload: {
  text: string;
  channel: string;
  mode: string;
  metadata: Record<string, unknown>;
}): Promise<
  | { ok: true; data: PreflightResponse }
  | { ok: false; error?: { message?: string; status?: number } }
> {
  return new Promise((resolve) => {
    log("preflight request sent", {
      site: payload.channel,
      channel: payload.channel,
      mode: payload.mode,
      chars: payload.text.length,
    });
    chrome.runtime.sendMessage(
      {
        type: "PEACEPAD_PREFLIGHT",
        payload,
      },
      (response) => {
        if (!response) {
          resolve({ ok: false, error: { message: "No response from background worker." } });
          return;
        }
        resolve(
          response as { ok: true; data: PreflightResponse } | { ok: false; error?: { message?: string; status?: number } },
        );
      },
    );
  });
}

function getWhatsappApprovedHandoffForComposer(
  currentSite: SupportedSite,
  composer: HTMLElement,
): typeof whatsappApprovedHandoff {
  if (currentSite !== "whatsapp" || !whatsappApprovedHandoff) {
    return null;
  }

  return whatsappApprovedHandoff.composer === composer ? whatsappApprovedHandoff : null;
}

function removeWhatsappApprovedHandoffBanner(): void {
  clearWhatsappReadyBannerCollapse();
  if (activeHandoffBanner) {
    activeHandoffBanner.remove();
    activeHandoffBanner = null;
  }
}

function disconnectWhatsappApprovedHandoffObserver(): void {
  if (whatsappApprovedHandoffObserver) {
    whatsappApprovedHandoffObserver.disconnect();
    whatsappApprovedHandoffObserver = null;
  }

  if (whatsappApprovedHandoffEvaluationHandle !== null) {
    window.clearTimeout(whatsappApprovedHandoffEvaluationHandle);
    whatsappApprovedHandoffEvaluationHandle = null;
  }
}

function clearWhatsappReadyBannerCollapse(): void {
  if (whatsappReadyBannerCollapseHandle !== null) {
    window.clearTimeout(whatsappReadyBannerCollapseHandle);
    whatsappReadyBannerCollapseHandle = null;
  }
}

function scheduleWhatsappReadyBannerCollapse(): void {
  const handoff = whatsappApprovedHandoff;
  if (!handoff || handoff.state !== "ready" || handoff.readyBannerCollapsed || handoff.readyBannerPinned) {
    return;
  }

  clearWhatsappReadyBannerCollapse();
  whatsappReadyBannerCollapseHandle = window.setTimeout(() => {
    whatsappReadyBannerCollapseHandle = null;

    if (!whatsappApprovedHandoff || whatsappApprovedHandoff !== handoff || handoff.state !== "ready" || handoff.readyBannerPinned) {
      return;
    }

    handoff.readyBannerCollapsed = true;
    showWhatsappApprovedHandoffBanner();
  }, 2600);
}

function scheduleWhatsappApprovedHandoffEvaluation(
  composer: HTMLElement,
  source: SendSource,
  method: "paste_event" | "mutation_observer",
): void {
  if (whatsappApprovedHandoffEvaluationHandle !== null) {
    window.clearTimeout(whatsappApprovedHandoffEvaluationHandle);
  }

  whatsappApprovedHandoffEvaluationHandle = window.setTimeout(() => {
    whatsappApprovedHandoffEvaluationHandle = null;
    const handoff = getWhatsappApprovedHandoffForComposer("whatsapp", composer);
    if (!handoff) {
      return;
    }

    const text = getComposerText(composer).trim();
    const currentFingerprint = fingerprint(text);
    if (!text || currentFingerprint === handoff.blockedOriginalFingerprint) {
      return;
    }

    if (method === "mutation_observer" && Date.now() - whatsappLastPasteSignalAt < 500) {
      void handleWhatsappApprovedHandoffInput("whatsapp", composer, text);
      return;
    }

    log("paste detected", {
      site: "whatsapp",
      source,
      method,
      charsAfter: text.length,
      sameAsApproved: currentFingerprint === handoff.approvedFingerprint,
    });
    void handleWhatsappApprovedHandoffInput("whatsapp", composer, text);
  }, 30);
}

function ensureWhatsappApprovedHandoffObserver(composer: HTMLElement): void {
  disconnectWhatsappApprovedHandoffObserver();
  whatsappApprovedHandoffObserver = new MutationObserver(() => {
    scheduleWhatsappApprovedHandoffEvaluation(composer, "manual_after_apply", "mutation_observer");
  });
  whatsappApprovedHandoffObserver.observe(composer, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

function applyWhatsappComposerLock(composer: HTMLElement, state: WhatsappHandoffState = "blocked"): void {
  if (composer.dataset.peacepadHandoffLocked !== "true") {
    composer.dataset.peacepadHandoffLocked = "true";
    composer.dataset.peacepadPrevOutline = composer.style.outline;
    composer.dataset.peacepadPrevOutlineOffset = composer.style.outlineOffset;
    composer.dataset.peacepadPrevBoxShadow = composer.style.boxShadow;
    composer.dataset.peacepadPrevBorderRadius = composer.style.borderRadius;
    composer.dataset.peacepadPrevTransition = composer.style.transition;
  }

  composer.dataset.peacepadHandoffState = state;
  composer.style.transition = "outline-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease";

  if (state === "ready") {
    composer.style.outline = "2px solid #16a34a";
    composer.style.outlineOffset = "2px";
    composer.style.boxShadow = "0 0 0 4px rgba(34, 197, 94, 0.20)";
  } else {
    composer.style.outline = "2px solid #2563eb";
    composer.style.outlineOffset = "2px";
    composer.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.18)";
  }

  composer.style.borderRadius = "12px";
}

function removeWhatsappComposerLock(composer?: HTMLElement | null): void {
  if (!composer || composer.dataset.peacepadHandoffLocked !== "true") {
    return;
  }

  composer.style.outline = composer.dataset.peacepadPrevOutline ?? "";
  composer.style.outlineOffset = composer.dataset.peacepadPrevOutlineOffset ?? "";
  composer.style.boxShadow = composer.dataset.peacepadPrevBoxShadow ?? "";
  composer.style.borderRadius = composer.dataset.peacepadPrevBorderRadius ?? "";
  composer.style.transition = composer.dataset.peacepadPrevTransition ?? "";

  delete composer.dataset.peacepadHandoffLocked;
  delete composer.dataset.peacepadPrevOutline;
  delete composer.dataset.peacepadPrevOutlineOffset;
  delete composer.dataset.peacepadPrevBoxShadow;
  delete composer.dataset.peacepadPrevBorderRadius;
  delete composer.dataset.peacepadPrevTransition;
  delete composer.dataset.peacepadHandoffState;
}

function installViewportPolish(currentSite: SupportedSite): void {
  window.addEventListener(
    "resize",
    () => {
      if (currentSite !== "whatsapp" || !activeHandoffBanner || !whatsappApprovedHandoff) {
        return;
      }

      positionWhatsappApprovedHandoffBanner(activeHandoffBanner, whatsappApprovedHandoff.composer);
    },
    { passive: true },
  );
}

function positionWhatsappApprovedHandoffBanner(banner: HTMLDivElement, composer: HTMLElement): void {
  const viewportMargin = 16;
  const gap = 14;
  const composerRect = composer.getBoundingClientRect();
  const maxWidth = Math.min(520, Math.max(320, window.innerWidth - viewportMargin * 2));
  const preferredWidth = Math.min(maxWidth, Math.max(360, composerRect.width - 24));

  banner.style.width = `${preferredWidth}px`;
  banner.style.maxWidth = `${window.innerWidth - viewportMargin * 2}px`;

  const left = Math.min(
    Math.max(composerRect.left + composerRect.width / 2 - preferredWidth / 2, viewportMargin),
    window.innerWidth - viewportMargin - preferredWidth,
  );
  const top = Math.max(viewportMargin, composerRect.top - banner.offsetHeight - gap);

  banner.style.left = `${left}px`;
  banner.style.top = `${top}px`;
  banner.style.bottom = "auto";
  banner.style.transform = "none";
}

function prepareWhatsappComposerForPaste(
  composer: HTMLElement,
  source: SendSource,
  entry: "approved_action" | "handoff_banner" | "send_blocked",
): { method: string; selected: boolean } {
  composer.scrollIntoView({ block: "nearest", inline: "nearest" });
  composer.focus();

  let method = "focus_only";
  let selected = false;

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    composer.setSelectionRange(0, composer.value.length);
    method = "input_select_all";
    selected = true;
  } else {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.removeAllRanges();
      selection.addRange(range);
      method = "contenteditable_select_all";
      selected = true;
    }
  }

  log("approved handoff paste prepared", {
    site: "whatsapp",
    source,
    entry,
    method,
    selected,
    chars: getComposerText(composer).trim().length,
  });

  log("blocked draft selected", {
    site: "whatsapp",
    source,
    entry,
    method,
    selected,
    chars: getComposerText(composer).trim().length,
  });

  return { method, selected };
}

function clearWhatsappApprovedHandoff(reason: string, data: Record<string, unknown> = {}): void {
  const handoff = whatsappApprovedHandoff;
  removeWhatsappApprovedHandoffBanner();
  whatsappApprovedHandoff = null;

  if (!handoff) {
    return;
  }

  disconnectWhatsappApprovedHandoffObserver();
  removeWhatsappComposerLock(handoff.composer);

  log("approved handoff cleared", {
    site: "whatsapp",
    source: typeof data.source === "string" ? data.source : "manual_after_apply",
    reason,
    blockedChars: handoff.blockedOriginalText.length,
    approvedChars: handoff.approvedText.length,
    ...data,
  });
}

function armWhatsappApprovedHandoff(
  composer: HTMLElement,
  preflight: PreflightResponse,
  draftFingerprint: string,
  originalDraft: string,
  approvedText: string,
): void {
  if (whatsappApprovedHandoff && whatsappApprovedHandoff.composer !== composer) {
    clearWhatsappApprovedHandoff("composer_replaced", { source: "manual_after_apply" });
  } else {
    removeWhatsappApprovedHandoffBanner();
  }

  const trimmedApprovedText = approvedText.trim();
  whatsappApprovedHandoff = {
    composer,
    blockedOriginalFingerprint: draftFingerprint,
    blockedOriginalText: originalDraft,
    approvedText: trimmedApprovedText,
    approvedFingerprint: fingerprint(trimmedApprovedText),
    preflight,
    state: "blocked",
    readyBannerCollapsed: false,
    readyBannerPinned: false,
    createdAt: Date.now(),
  };

  log("approved handoff armed", {
    site: "whatsapp",
    source: "manual_after_apply",
    blockedChars: originalDraft.length,
    approvedChars: trimmedApprovedText.length,
  });
  ensureWhatsappApprovedHandoffObserver(composer);
  showWhatsappApprovedHandoffBanner();
}

function showWhatsappApprovedHandoffBanner(): void {
  const handoff = whatsappApprovedHandoff;
  if (!handoff) {
    return;
  }

  const isReady = handoff.state === "ready";
  const isCollapsedReady = isReady && handoff.readyBannerCollapsed;

  let banner = activeHandoffBanner;
  if (!banner || !banner.isConnected) {
    banner = document.createElement("div");
    banner.id = "peacepad-approved-handoff-banner";
    banner.style.position = "fixed";
    banner.style.zIndex = "2147483646";
    banner.style.width = "520px";
    banner.style.maxWidth = "calc(100vw - 32px)";
    banner.style.borderRadius = "16px";
    banner.style.padding = "14px";
    banner.style.fontFamily = "\"Segoe UI\", Arial, sans-serif";
    banner.style.boxShadow = "0 18px 42px rgba(15, 23, 42, 0.28)";
    banner.style.backdropFilter = "blur(14px)";
    banner.style.transition = "border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, opacity 160ms ease";
    banner.style.opacity = "1";
    banner.style.pointerEvents = "auto";
    document.body.appendChild(banner);
    activeHandoffBanner = banner;
  }

  banner.replaceChildren();
  banner.style.width = "520px";
  banner.style.padding = "14px";
  banner.style.borderRadius = "16px";
  banner.style.background = isReady
    ? "linear-gradient(180deg, rgba(6, 78, 59, 0.96), rgba(15, 23, 42, 0.96))"
    : "linear-gradient(180deg, rgba(15, 23, 42, 0.97), rgba(30, 41, 59, 0.96))";
  banner.style.color = "#fff";
  banner.style.border = isReady ? "1px solid rgba(74, 222, 128, 0.45)" : "1px solid rgba(147, 197, 253, 0.42)";
  banner.style.boxShadow = isReady
    ? "0 18px 42px rgba(5, 46, 22, 0.28)"
    : "0 18px 42px rgba(15, 23, 42, 0.28)";

  if (isCollapsedReady) {
    banner.style.width = "340px";
    banner.style.padding = "10px 12px";
    banner.style.borderRadius = "999px";
  }

  if (isCollapsedReady) {
    const collapsedRow = document.createElement("div");
    collapsedRow.style.display = "flex";
    collapsedRow.style.alignItems = "center";
    collapsedRow.style.justifyContent = "space-between";
    collapsedRow.style.gap = "10px";

    const info = document.createElement("div");
    info.style.display = "flex";
    info.style.alignItems = "center";
    info.style.gap = "10px";
    info.style.minWidth = "0";

    const readyDot = document.createElement("span");
    readyDot.style.width = "10px";
    readyDot.style.height = "10px";
    readyDot.style.flex = "0 0 auto";
    readyDot.style.borderRadius = "999px";
    readyDot.style.background = "#4ade80";
    readyDot.style.boxShadow = "0 0 0 6px rgba(74, 222, 128, 0.12)";
    info.appendChild(readyDot);

    const collapsedText = document.createElement("div");
    collapsedText.textContent = "Approved text ready. Press send.";
    collapsedText.style.fontSize = "13px";
    collapsedText.style.fontWeight = "600";
    collapsedText.style.lineHeight = "1.35";
    collapsedText.style.color = "#ecfdf5";
    collapsedText.style.whiteSpace = "nowrap";
    collapsedText.style.overflow = "hidden";
    collapsedText.style.textOverflow = "ellipsis";
    info.appendChild(collapsedText);

    const detailsButton = makeButton("Details", "rgba(255, 255, 255, 0.94)", "#065f46", () => {
      const current = whatsappApprovedHandoff;
      if (!current) {
        return;
      }

      current.readyBannerCollapsed = false;
      current.readyBannerPinned = true;
      showWhatsappApprovedHandoffBanner();
    });
    detailsButton.style.height = "32px";
    detailsButton.style.padding = "0 12px";
    detailsButton.style.border = "1px solid rgba(209, 250, 229, 0.55)";

    collapsedRow.appendChild(info);
    collapsedRow.appendChild(detailsButton);
    banner.appendChild(collapsedRow);
    document.body.appendChild(banner);
    activeHandoffBanner = banner;
    positionWhatsappApprovedHandoffBanner(banner, handoff.composer);

    applyWhatsappComposerLock(handoff.composer, handoff.state);
    clearWhatsappReadyBannerCollapse();

    log("approved handoff banner shown", {
      site: "whatsapp",
      source: "manual_after_apply",
      state: handoff.state,
      collapsed: true,
      blockedChars: handoff.blockedOriginalText.length,
      approvedChars: handoff.approvedText.length,
    });
    return;
  }

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";
  header.style.marginBottom = "10px";

  const title = document.createElement("div");
  title.textContent = "WhatsApp Review Handoff";
  title.style.fontSize = "13px";
  title.style.fontWeight = "700";
  title.style.letterSpacing = "0.01em";
  header.appendChild(title);

  const statusPill = document.createElement("span");
  statusPill.textContent = isReady ? "Ready" : "Blocked";
  statusPill.style.display = "inline-flex";
  statusPill.style.alignItems = "center";
  statusPill.style.justifyContent = "center";
  statusPill.style.padding = "5px 10px";
  statusPill.style.borderRadius = "999px";
  statusPill.style.fontSize = "11px";
  statusPill.style.fontWeight = "700";
  statusPill.style.letterSpacing = "0.03em";
  statusPill.style.background = isReady ? "rgba(134, 239, 172, 0.16)" : "rgba(147, 197, 253, 0.14)";
  statusPill.style.border = isReady ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid rgba(147, 197, 253, 0.34)";
  statusPill.style.color = isReady ? "#bbf7d0" : "#dbeafe";
  header.appendChild(statusPill);

  banner.appendChild(header);

  const message = document.createElement("div");
  message.textContent = isReady
    ? "Approved text detected. Press send."
    : "Blocked draft selected. Press Ctrl+V to replace it.";
  message.style.fontSize = "14px";
  message.style.fontWeight = "600";
  message.style.lineHeight = "1.45";
  message.style.marginBottom = "8px";
  banner.appendChild(message);

  const support = document.createElement("div");
  support.textContent = isReady
    ? "Your approved message is in place. Send from WhatsApp when you're ready."
    : "We copied your approved message and selected the blocked draft for a clean replace.";
  support.style.fontSize = "12px";
  support.style.lineHeight = "1.45";
  support.style.color = isReady ? "rgba(220, 252, 231, 0.92)" : "rgba(226, 232, 240, 0.92)";
  support.style.marginBottom = "10px";
  banner.appendChild(support);

  const helperRow = document.createElement("div");
  helperRow.style.display = "flex";
  helperRow.style.alignItems = "center";
  helperRow.style.gap = "8px";
  helperRow.style.flexWrap = "wrap";
  helperRow.style.marginBottom = "12px";

  if (!isReady) {
    const keycap = document.createElement("span");
    keycap.textContent = "Ctrl+V";
    keycap.style.display = "inline-flex";
    keycap.style.alignItems = "center";
    keycap.style.justifyContent = "center";
    keycap.style.height = "26px";
    keycap.style.padding = "0 10px";
    keycap.style.borderRadius = "10px";
    keycap.style.background = "rgba(255, 255, 255, 0.08)";
    keycap.style.border = "1px solid rgba(255, 255, 255, 0.14)";
    keycap.style.fontSize = "11px";
    keycap.style.fontWeight = "700";
    keycap.style.letterSpacing = "0.03em";
    helperRow.appendChild(keycap);

    const helperText = document.createElement("div");
    helperText.textContent = "Press to replace the selected draft.";
    helperText.style.fontSize = "11px";
    helperText.style.color = "rgba(226, 232, 240, 0.88)";
    helperRow.appendChild(helperText);
  } else {
    const readyDot = document.createElement("span");
    readyDot.style.width = "10px";
    readyDot.style.height = "10px";
    readyDot.style.borderRadius = "999px";
    readyDot.style.background = "#4ade80";
    readyDot.style.boxShadow = "0 0 0 6px rgba(74, 222, 128, 0.12)";
    helperRow.appendChild(readyDot);

    const helperText = document.createElement("div");
    helperText.textContent = "Approved message is in place.";
    helperText.style.fontSize = "11px";
    helperText.style.color = "rgba(220, 252, 231, 0.9)";
    helperRow.appendChild(helperText);
  }

  banner.appendChild(helperRow);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.alignItems = "center";
  actions.style.flexWrap = "wrap";
  actions.style.gap = "8px";

  const reviewAgain = makeButton("Review Again", "#eff6ff", "#1d4ed8", () => {
    const current = whatsappApprovedHandoff;
    if (!current) {
      return;
    }

    removeWhatsappApprovedHandoffBanner();
    log("approved handoff reopened", {
      site: "whatsapp",
      source: "manual_after_apply",
      blockedChars: current.blockedOriginalText.length,
      approvedChars: current.approvedText.length,
    });
    showPreflightModal(
      "whatsapp",
      current.preflight,
      current.composer,
      current.blockedOriginalFingerprint,
      current.blockedOriginalText,
      current.approvedText,
    );
  });
  reviewAgain.style.border = "1px solid #bfdbfe";
  actions.appendChild(reviewAgain);

  if (!isReady) {
    const pasteApprovedHere = makeButton("Paste Approved Here", "#2563eb", "#ffffff", () => {
      const current = whatsappApprovedHandoff;
      if (!current) {
        return;
      }

      const currentText = getComposerText(current.composer).trim();
      if (handleWhatsappApprovedHandoffInput("whatsapp", current.composer, currentText) && current.state === "ready") {
        showToastThrottled("Approved text detected. Press send.");
        return;
      }

      current.state = "blocked";
      applyWhatsappComposerLock(current.composer, "blocked");
      const prepareResult = prepareWhatsappComposerForPaste(current.composer, "manual_after_apply", "handoff_banner");
      showWhatsappApprovedHandoffBanner();
      showToastThrottled(
        prepareResult.selected
          ? "Press Ctrl+V to replace."
          : "Composer focused. Press Ctrl+V to replace.",
      );
    });
    pasteApprovedHere.style.border = "1px solid rgba(147, 197, 253, 0.45)";
    actions.appendChild(pasteApprovedHere);
  }

  const sendOriginalFromBanner = makeButton("Send Original", "#ffffff", "#0f172a", () => {
    const current = whatsappApprovedHandoff;
    if (!current) {
      return;
    }

    log("send original clicked", {
      site: "whatsapp",
      source: "manual_after_apply",
      entry: "handoff_banner",
    });
    clearWhatsappApprovedHandoff("explicit_original_release", {
      source: "manual_after_apply",
      entry: "handoff_banner",
    });
    lastDismissedFingerprint = "";
    sendReleaseInFlight = true;
    suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
    releaseSend(current.composer, "whatsapp", "approved_handoff_send_original_release", current.blockedOriginalText, 1);
  });
  sendOriginalFromBanner.style.border = "1px solid #cbd5e1";
  actions.appendChild(sendOriginalFromBanner);

  banner.appendChild(actions);
  document.body.appendChild(banner);
  activeHandoffBanner = banner;
  positionWhatsappApprovedHandoffBanner(banner, handoff.composer);

  applyWhatsappComposerLock(handoff.composer, handoff.state);
  if (isReady) {
    scheduleWhatsappReadyBannerCollapse();
  } else {
    clearWhatsappReadyBannerCollapse();
  }

  log("approved handoff banner shown", {
    site: "whatsapp",
    source: "manual_after_apply",
    state: handoff.state,
    collapsed: false,
    blockedChars: handoff.blockedOriginalText.length,
    approvedChars: handoff.approvedText.length,
  });
}

function handleWhatsappApprovedHandoffInput(
  currentSite: SupportedSite,
  composer: HTMLElement,
  text: string,
): boolean {
  const handoff = getWhatsappApprovedHandoffForComposer(currentSite, composer);
  if (!handoff) {
    return false;
  }

  const draftFingerprint = fingerprint(text);
  const decision = resolveWhatsappHandoffDecision(currentSite, {
    blockedOriginalFingerprint: handoff.blockedOriginalFingerprint,
    approvedFingerprint: handoff.approvedFingerprint,
  }, draftFingerprint);

  if (decision === "block_original") {
    handoff.state = "blocked";
    handoff.readyBannerCollapsed = false;
    handoff.readyBannerPinned = false;
    applyWhatsappComposerLock(composer, "blocked");
    showWhatsappApprovedHandoffBanner();
    return true;
  }

  if (decision === "allow_approved") {
    if (handoff.state !== "ready") {
      handoff.state = "ready";
      handoff.readyBannerCollapsed = false;
      handoff.readyBannerPinned = false;
      applyWhatsappComposerLock(composer, "ready");
      log("approved text detected", {
        site: currentSite,
        source: "manual_after_apply",
        chars: text.length,
        normalizedMatch: normalizeDraft(text) === normalizeDraft(handoff.approvedText),
      });
      log("ready to send state entered", {
        site: currentSite,
        source: "manual_after_apply",
        chars: text.length,
      });
    }

    showWhatsappApprovedHandoffBanner();
    return true;
  }

  if (decision === "changed_message") {
    clearWhatsappApprovedHandoff("composer_changed", {
      source: "manual_after_apply",
      chars: text.length,
    });
  }

  return false;
}

function handleWhatsappApprovedHandoffBeforeSend(
  event: Event,
  currentSite: SupportedSite,
  composer: HTMLElement,
  draftFingerprint: string,
  source: SendSource,
  chars: number,
): boolean {
  const handoff = getWhatsappApprovedHandoffForComposer(currentSite, composer);
  if (!handoff) {
    return false;
  }

  const decision = resolveWhatsappHandoffDecision(currentSite, {
    blockedOriginalFingerprint: handoff.blockedOriginalFingerprint,
    approvedFingerprint: handoff.approvedFingerprint,
  }, draftFingerprint);

  if (decision === "block_original") {
    blockSendEvent(event, currentSite, source);
    handoff.state = "blocked";
    handoff.readyBannerCollapsed = false;
    handoff.readyBannerPinned = false;
    applyWhatsappComposerLock(composer, "blocked");
    const prepareResult = prepareWhatsappComposerForPaste(composer, source, "send_blocked");
    showWhatsappApprovedHandoffBanner();
    log("blocked send while original draft still present", {
      site: currentSite,
      source,
      chars,
      prepareMethod: prepareResult.method,
      selected: prepareResult.selected,
    });
    showToastThrottled("Paste first, then send.");
    return true;
  }

  if (decision === "allow_approved") {
    if (handoff.state !== "ready") {
      handoff.state = "ready";
      handoff.readyBannerCollapsed = false;
      handoff.readyBannerPinned = false;
      applyWhatsappComposerLock(composer, "ready");
      log("approved text detected", {
        site: currentSite,
        source,
        chars,
        normalizedMatch: true,
      });
      log("ready to send state entered", {
        site: currentSite,
        source,
        chars,
      });
    }

    log("final send allowed", {
      site: currentSite,
      source,
      chars,
    });
    lastSafeFingerprint = draftFingerprint;
    lastDismissedFingerprint = "";
    suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
    log("manual send after apply detected", {
      site: currentSite,
      source,
      chars,
    });
    clearWhatsappApprovedHandoff("approved_message_allowed", {
      source,
      chars,
    });
    return true;
  }

  if (decision === "changed_message") {
    clearWhatsappApprovedHandoff("composer_changed", {
      source,
      chars,
    });
  }

  return false;
}

function showPreflightModal(
  currentSite: SupportedSite,
  preflight: PreflightResponse,
  composer: HTMLElement,
  draftFingerprint: string,
  originalDraft: string,
  initialApprovedText?: string,
): void {
  const existing = document.getElementById("peacepad-preflight-modal");
  if (existing) {
    existing.remove();
  }

  activeModal = {
    composer,
    fingerprint: draftFingerprint,
  };

  const wrapper = document.createElement("div");
  wrapper.id = "peacepad-preflight-modal";
  wrapper.style.position = "fixed";
  wrapper.style.top = "20px";
  wrapper.style.right = "20px";
  wrapper.style.zIndex = "2147483647";
  wrapper.style.width = "420px";
  wrapper.style.maxWidth = "92vw";
  wrapper.style.maxHeight = "calc(100vh - 40px)";
  wrapper.style.overflowY = "auto";
  wrapper.style.background = "#ffffff";
  wrapper.style.border = "1px solid #cbd5e1";
  wrapper.style.borderRadius = "14px";
  wrapper.style.boxShadow = "0 16px 40px rgba(15, 23, 42, 0.25)";
  wrapper.style.padding = "16px";
  wrapper.style.fontFamily = "Arial, sans-serif";
  wrapper.style.color = "#0f172a";

  const riskLabel = preflight.risk_level.toUpperCase();
  const riskTheme = getRiskBadgeTheme(preflight.risk_level);
  const suggestionText = initialApprovedText?.trim() || preflight.calm_version?.trim() || originalDraft;
  const originalNormalized = normalizeDraft(originalDraft);
  const suggestionNormalized = normalizeDraft(suggestionText);

  const closeModal = () => {
    if (activeModal?.fingerprint === draftFingerprint) {
      activeModal = null;
    }
    wrapper.remove();
  };

  const focusComposer = () => {
    window.setTimeout(() => composer.focus(), 0);
  };

  const createSection = (label: string, value: string, editable = false): HTMLDivElement => {
    const section = document.createElement("div");
    section.style.marginBottom = "10px";

    const heading = document.createElement("div");
    heading.textContent = label;
    heading.style.fontSize = "11px";
    heading.style.fontWeight = "700";
    heading.style.color = "#334155";
    heading.style.marginBottom = "4px";
    section.appendChild(heading);

    const body = editable ? document.createElement("textarea") : document.createElement("div");
    body.style.width = "100%";
    body.style.boxSizing = "border-box";
    body.style.fontSize = "12px";
    body.style.lineHeight = "1.45";
    body.style.background = editable ? "#ffffff" : "#f8fafc";
    body.style.border = "1px solid #e2e8f0";
    body.style.borderRadius = "10px";
    body.style.padding = "10px";
    body.style.color = "#0f172a";
    body.style.wordBreak = "break-word";

    if (body instanceof HTMLTextAreaElement) {
      body.value = value;
      body.rows = 5;
      body.style.resize = "vertical";
      body.style.minHeight = "110px";
    } else {
      body.textContent = value;
      body.style.whiteSpace = "pre-wrap";
    }

    section.appendChild(body);
    return section;
  };

  const summary = document.createElement("div");
  summary.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <strong>PeacePad Pre-Send Check</strong>
      <span style="font-size:11px;padding:4px 8px;border-radius:999px;background:${riskTheme.background};color:${riskTheme.text};border:1px solid ${riskTheme.border};font-weight:700;">${riskLabel}</span>
    </div>
    <p style="margin:8px 0 4px 0;font-size:12px;line-height:1.4;">
      Recommendation: <strong>${preflight.recommendation.replace(/_/g, " ")}</strong>
    </p>
    <p style="margin:0 0 10px 0;font-size:12px;line-height:1.4;">
      Conflict score: <strong>${preflight.conflict_score}</strong>
    </p>
  `;
  wrapper.appendChild(summary);

  wrapper.appendChild(createSection("Original message", originalDraft));

  if (preflight.calm_version) {
    wrapper.appendChild(createSection("Suggested calmer version", preflight.calm_version));
  }

  const finalMessageSection = createSection("Final message to send", suggestionText, true);
  const finalMessageInput = finalMessageSection.querySelector("textarea") as HTMLTextAreaElement;
  wrapper.appendChild(finalMessageSection);

  const signalText = preflight.signals.slice(0, 3).map((item) => item.code.replace(/_/g, " "));
  if (signalText.length > 0) {
    const signals = document.createElement("p");
    signals.style.margin = "0 0 10px 0";
    signals.style.fontSize = "11px";
    signals.style.color = "#334155";
    signals.textContent = `Signals: ${signalText.join(", ")}`;
    wrapper.appendChild(signals);
  }

  const reviewNote = document.createElement("p");
  reviewNote.style.margin = "0 0 12px 0";
  reviewNote.style.fontSize = "11px";
  reviewNote.style.color = "#475569";
  reviewNote.textContent = getReviewNote(currentSite);
  wrapper.appendChild(reviewNote);

  const selectionRow = document.createElement("div");
  selectionRow.style.display = "flex";
  selectionRow.style.flexWrap = "wrap";
  selectionRow.style.gap = "8px";
  selectionRow.style.marginBottom = "12px";

  const syncFinalMessage = (nextValue: string, selection: string): void => {
    finalMessageInput.value = nextValue;
    log("approved text selected", {
      site: currentSite,
      source: "manual_after_apply",
      selection,
      chars: nextValue.length,
      sameAsOriginal: normalizeDraft(nextValue) === originalNormalized,
      sameAsSuggestion: normalizeDraft(nextValue) === suggestionNormalized,
    });
    finalMessageInput.focus();
    finalMessageInput.setSelectionRange(finalMessageInput.value.length, finalMessageInput.value.length);
  };

  const keepOriginal = makeButton("Keep Original", "#ffffff", "#0f172a", () => {
    syncFinalMessage(originalDraft, "original");
  });
  keepOriginal.style.border = "1px solid #cbd5e1";
  selectionRow.appendChild(keepOriginal);

  if (preflight.calm_version) {
    const acceptSuggestion = makeButton("Accept Suggestion", "#eff6ff", "#1d4ed8", () => {
      syncFinalMessage(preflight.calm_version as string, "suggestion");
    });
    acceptSuggestion.style.border = "1px solid #bfdbfe";
    selectionRow.appendChild(acceptSuggestion);
  }

  wrapper.appendChild(selectionRow);

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "grid";
  buttonRow.style.gridTemplateColumns = "1fr 1fr";
  buttonRow.style.gap = "8px";

  const sendApproved = makeButton(getApprovedActionLabel(currentSite), "#1d4ed8", "#ffffff", () => {
    void (async () => {
      const approvedText = finalMessageInput.value.trim();
      if (!approvedText) {
        showToastThrottled("Add the final message you want to send first.");
        finalMessageInput.focus();
        return;
      }

      log("approved send attempted", {
        site: currentSite,
        source: "manual_after_apply",
        chars: approvedText.length,
        mode: currentSite === "whatsapp" ? "whatsapp_guarded_handoff" : "direct_then_fallback",
        sameAsOriginal: normalizeDraft(approvedText) === originalNormalized,
        sameAsSuggestion: normalizeDraft(approvedText) === suggestionNormalized,
      });

      if (currentSite === "whatsapp") {
        const copied = await copyTextToClipboard(approvedText);
        if (!copied) {
          log("approved send fallback", {
            site: currentSite,
            source: "manual_after_apply",
            action: "approved_send",
            fallback: "clipboard_copy_failed",
            success: false,
            reason: "whatsapp_guarded_handoff",
          });
          showToastThrottled("Could not copy the approved message. Review it in the modal and try again.");
          finalMessageInput.focus();
          return;
        }

        closeModal();
        armWhatsappApprovedHandoff(composer, preflight, draftFingerprint, originalDraft, approvedText);
        const prepareResult = prepareWhatsappComposerForPaste(composer, "manual_after_apply", "approved_action");
        log("approved send result", {
          site: currentSite,
          source: "manual_after_apply",
          success: true,
          path: "guarded_handoff_copy",
          mode: "whatsapp_guarded_handoff",
          prepareMethod: prepareResult.method,
          selected: prepareResult.selected,
        });
        showToastThrottled(
          prepareResult.selected
            ? "Approved message copied. Press Ctrl+V to replace."
            : "Approved message copied. Composer focused. Press Ctrl+V to replace.",
        );
        return;
      }

      log("composer replacement start", {
        site: currentSite,
        source: "manual_after_apply",
        action: "approved_send",
        chars: approvedText.length,
        mode: "review_surface",
      });
      const replacement = replaceComposerText(currentSite, composer, approvedText);

      if (!replacement.success) {
        log("replacement verification failed", {
          site: currentSite,
          source: "manual_after_apply",
          action: "approved_send",
          expected: approvedText,
          actual: replacement.actualText,
          method: replacement.method,
        });

        const copied = await copyTextToClipboard(approvedText);
        log("approved send fallback", {
          site: currentSite,
          source: "manual_after_apply",
          action: "approved_send",
          method: replacement.method,
          fallback: copied ? "clipboard_copy" : "clipboard_copy_failed",
          success: copied,
        });

        if (!copied) {
          showToastThrottled("Could not safely send or copy the approved message. Review it in the modal and try again.");
          finalMessageInput.focus();
          return;
        }

        lastDismissedFingerprint = draftFingerprint;
        closeModal();
        suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
        showToastThrottled("Approved message copied. Clear the WhatsApp draft, paste the approved text, review it, then send.");
        focusComposer();
        return;
      }

      log("replacement verification success", {
        site: currentSite,
        source: "manual_after_apply",
        action: "approved_send",
        actual: replacement.actualText,
        method: replacement.method,
      });

      lastSafeFingerprint = fingerprint(replacement.actualText);
      lastDismissedFingerprint = "";
      closeModal();
      sendReleaseInFlight = true;
      suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
      log("approved send result", {
        site: currentSite,
        source: "manual_after_apply",
        method: replacement.method,
        success: true,
        path: "direct_send",
      });
      window.setTimeout(() => {
        releaseSend(composer, currentSite, "approved_message_release", approvedText, 1);
      }, SEND_RELEASE_SETTLE_MS);
    })();
  });
  sendApproved.style.gridColumn = "1 / span 2";
  buttonRow.appendChild(sendApproved);

  const sendOriginal = makeButton("Send Original", "#ffffff", "#0f172a", () => {
    log("send original clicked", { site: currentSite, source: "manual_after_apply", entry: "modal" });
    if (currentSite === "whatsapp") {
      clearWhatsappApprovedHandoff("explicit_original_release", {
        site: currentSite,
        source: "manual_after_apply",
        entry: "modal",
      });
    }
    lastDismissedFingerprint = "";
    closeModal();
    sendReleaseInFlight = true;
    suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
    releaseSend(composer, currentSite, "send_original_release", originalDraft, 1);
  });
  sendOriginal.style.border = "1px solid #cbd5e1";
  buttonRow.appendChild(sendOriginal);

  const cancel = makeButton("Cancel", "#ffffff", "#0f172a", () => {
    log("cancel clicked", { site: currentSite, source: "manual_after_apply" });
    const activeHandoff = getWhatsappApprovedHandoffForComposer(currentSite, composer);
    if (activeHandoff && activeHandoff.blockedOriginalFingerprint === draftFingerprint) {
      closeModal();
      showWhatsappApprovedHandoffBanner();
      sendReleaseInFlight = false;
      focusComposer();
      return;
    }

    lastDismissedFingerprint = draftFingerprint;
    closeModal();
    sendReleaseInFlight = false;
    focusComposer();
  });
  cancel.style.border = "1px solid #cbd5e1";
  buttonRow.appendChild(cancel);

  wrapper.appendChild(buttonRow);
  document.body.appendChild(wrapper);

  const initialApprovedNormalized = initialApprovedText ? normalizeDraft(initialApprovedText) : "";
  const initialFinalNormalized = normalizeDraft(finalMessageInput.value);
  const initialSelection =
    initialFinalNormalized === originalNormalized
      ? "original_prefill"
      : initialApprovedNormalized && initialFinalNormalized === initialApprovedNormalized
        ? "approved_prefill"
        : initialFinalNormalized === suggestionNormalized
          ? "suggestion_prefill"
          : "approved_prefill";

  log("approved text selected", {
    site: currentSite,
    source: "manual_after_apply",
    selection: initialSelection,
    chars: finalMessageInput.value.length,
    sameAsOriginal: initialFinalNormalized === originalNormalized,
    sameAsSuggestion: initialFinalNormalized === suggestionNormalized,
  });

  finalMessageInput.focus();
  finalMessageInput.setSelectionRange(finalMessageInput.value.length, finalMessageInput.value.length);
}
function makeButton(label: string, background: string, color: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.height = "38px";
  button.style.padding = "0 14px";
  button.style.border = "1px solid transparent";
  button.style.borderRadius = "10px";
  button.style.fontSize = "12px";
  button.style.fontWeight = "600";
  button.style.letterSpacing = "0.01em";
  button.style.cursor = "pointer";
  button.style.background = background;
  button.style.color = color;
  button.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.10)";
  button.style.transition =
    "transform 120ms ease, box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease, filter 140ms ease";
  button.style.outline = "none";
  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-1px)";
    button.style.boxShadow = "0 10px 22px rgba(15, 23, 42, 0.18)";
    button.style.filter = background === "#ffffff" ? "brightness(0.99)" : "brightness(1.03)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.10)";
    button.style.filter = "none";
  });
  button.addEventListener("mousedown", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.16)";
  });
  button.addEventListener("focus", () => {
    button.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.20), 0 8px 18px rgba(15, 23, 42, 0.14)";
  });
  button.addEventListener("blur", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.10)";
    button.style.filter = "none";
  });
  button.addEventListener("click", onClick);
  return button;
}

function blockSendEvent(event: Event, currentSite: SupportedSite, source: SendSource): void {
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }

  const mutableEvent = event as Event & {
    cancelBubble?: boolean;
    returnValue?: boolean;
  };
  mutableEvent.cancelBubble = true;
  mutableEvent.returnValue = false;

  log("send event blocked", {
    site: currentSite,
    source,
    type: event.type,
  });
}

function isComposerBlockedByModal(composer: HTMLElement, draftFingerprint?: string): boolean {
  if (!activeModal) {
    return false;
  }

  if (activeModal.composer !== composer) {
    return false;
  }

  if (!draftFingerprint) {
    return true;
  }

  return activeModal.fingerprint === draftFingerprint;
}

function releaseSend(
  composer: HTMLElement,
  currentSite: SupportedSite,
  reason: string,
  expectedText?: string,
  attemptsRemaining = 1,
): void {
  if (expectedText) {
    const currentText = getComposerText(composer).trim();
    if (normalizeDraft(currentText) !== normalizeDraft(expectedText)) {
      if (attemptsRemaining > 1) {
        log("final send waiting for verified composer state", {
          site: currentSite,
          reason,
          attemptsRemaining,
          expected: expectedText,
          actual: currentText,
        });
        const retryResult = replaceComposerText(currentSite, composer, expectedText);
        log("composer replacement retry", {
          site: currentSite,
          reason,
          success: retryResult.success,
          method: retryResult.method,
          actual: retryResult.actualText,
        });
        window.setTimeout(() => {
          releaseSend(composer, currentSite, reason, expectedText, attemptsRemaining - 1);
        }, SEND_RELEASE_SETTLE_MS);
        return;
      }

      sendReleaseInFlight = false;
      log("final send verification failed", {
        site: currentSite,
        reason,
        expected: expectedText,
        actual: currentText,
      });
      showToastThrottled("Draft changed before send. Review it again before sending.");
      composer.focus();
      return;
    }
  }

  suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
  const sendResult = triggerSend(currentSite, composer);
  sendReleaseInFlight = false;
  log("final send release", {
    site: currentSite,
    reason,
    method: sendResult.method,
    success: sendResult.success,
  });
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const doc = document as Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
  };

  try {
    return Boolean(doc.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function showToastThrottled(message: string): void {
  const now = Date.now();
  if (now - lastErrorToastAt < 3500) {
    return;
  }
  lastErrorToastAt = now;
  showToast(message);
}

function showToast(message: string): void {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "72px";
  toast.style.right = "20px";
  toast.style.zIndex = "2147483647";
  toast.style.background = "#0f172a";
  toast.style.color = "#fff";
  toast.style.padding = "8px 12px";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "12px";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.25)";

  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

function log(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.debug(LOG_PREFIX, message, data);
  } else {
    console.debug(LOG_PREFIX, message);
  }

  const eventMap: Record<string, string> = {
    "content script loaded": "content_loaded",
    "content script already active": "content_loaded",
    "draft detected": "draft_detected",
    "background check skipped": "background_check_scheduled",
    "send gate intercepted": "send_gate_intercepted",
    "send blocked while modal is unresolved": "send_blocked_modal_open",
    "preflight request sent": "preflight_requested",
    "local preflight result received": "preflight_result_local",
    "api preflight result received": "preflight_result_api",
    "intervention decision returned": "intervention_decision",
    "showing intervention modal": "modal_opened",
    "apply suggested clicked": "apply_suggested_clicked",
    "approved text selected": "approved_text_selected",
    "approved send attempted": "approved_send_attempted",
    "approved send result": "approved_send_result",
    "approved send fallback": "approved_send_fallback",
    "approved handoff armed": "approved_handoff_armed",
    "approved handoff banner shown": "approved_handoff_banner_shown",
    "blocked draft selected": "approved_handoff_blocked_selected",
    "paste detected": "approved_handoff_paste_detected",
    "approved text detected": "approved_handoff_approved_detected",
    "approved handoff paste prepared": "approved_handoff_paste_prepared",
    "ready to send state entered": "approved_handoff_ready",
    "approved handoff send blocked": "approved_handoff_send_blocked",
    "blocked send while original draft still present": "approved_handoff_send_blocked",
    "approved handoff reopened": "approved_handoff_reopened",
    "final send allowed": "approved_handoff_send_allowed",
    "approved handoff cleared": "approved_handoff_cleared",
    "composer replacement start": "composer_replace_started",
    "composer replacement retry": "composer_replace_retry",
    "replacement verification success": "composer_replace_verified",
    "replacement verification failed": "composer_replace_failed",
    "manual send after apply detected": "manual_send_after_apply_detected",
    "send original clicked": "send_original_clicked",
    "cancel clicked": "cancel_clicked",
  };

  const event = eventMap[message];
  if (!event) {
    return;
  }

  const payload: Record<string, unknown> = {
    source: "content",
    event,
    status: data?.status ?? "ok",
  };

  if (typeof data?.site === "string") payload.site = data.site;
  if (typeof data?.source === "string") payload.sendSource = data.source;
  if (typeof data?.risk === "string") payload.riskLevel = data.risk;
  if (typeof data?.score === "number") payload.conflictScore = data.score;
  if (typeof data?.recommendation === "string") payload.recommendation = data.recommendation;
  if (typeof data?.expected === "string") payload.expectedSuggestionPreview = data.expected;
  if (typeof data?.actual === "string") payload.actualComposerPreview = data.actual;
  if (typeof data?.message === "string") payload.error = data.message;

  const reservedKeys = new Set(["site", "source", "risk", "score", "recommendation", "expected", "actual", "message", "status"]);
  const extraEntries = Object.entries(data ?? {}).filter(([key, value]) => !reservedKeys.has(key) && value !== undefined);
  if (extraEntries.length > 0) {
    payload.details = Object.fromEntries(extraEntries);
  }
  if (typeof data?.status === "number") {
    payload.details = {
      ...(payload.details ?? {}),
      statusCode: data.status,
    };
  }

  try {
    chrome.runtime.sendMessage({
      type: "PEACEPAD_TRACE_EVENT",
      payload,
    });
  } catch {
    // no-op
  }
}

function normalizeDraft(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function fingerprint(text: string): string {
  return normalizeDraft(text).slice(0, 600);
}

function hasMaterialChange(current: string, previous: string): boolean {
  if (!previous) return true;
  if (current === previous) return false;

  const lenDelta = Math.abs(current.length - previous.length);
  if (lenDelta >= 12) return true;

  const currentTokens = current.split(" ").filter(Boolean);
  const previousTokens = previous.split(" ").filter(Boolean);
  const previousSet = new Set(previousTokens);
  let overlap = 0;

  for (const token of currentTokens) {
    if (previousSet.has(token)) {
      overlap += 1;
    }
  }

  const denominator = Math.max(currentTokens.length, previousTokens.length, 1);
  const overlapRatio = overlap / denominator;
  return overlapRatio < 0.9;
}




