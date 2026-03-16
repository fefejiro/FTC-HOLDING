import type { PreflightResponse } from "@ftc/peacepad-sdk";
import {
  detectSendAttempt,
  detectSupportedSite,
  focusComposerForEditing,
  getAdapter,
  getComposerText,
  getLinkedInSendHintSnapshot,
  preventSend,
  replaceComposerText,
  resumeSend,
  resolveComposerFromTarget,
  type SupportedSite,
} from "./adapters";
import {
  getApprovedActionLabel,
  getEffectivePreflightIntent,
  getGuardianModalCopy,
  getGuardianInterpretationLine,
  getPreflightExplanation,
  getRiskBadgeTheme,
  resolveInFlightSendAction,
  shouldSuppressSendOriginalLoop,
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
const SEND_ORIGINAL_LOOP_SUPPRESSION_MS = 15000;
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
// Adapter note: WhatsApp-specific guarded handoff and paste detection live here.
// TODO(core/engine): Extract shared composer monitoring + send gating into a universal web composer engine.
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
let sendOriginalLoopSuppression:
  | {
      fingerprint: string;
      until: number;
    }
  | null = null;

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
      // Demo mode stabilization: only run Guardian on explicit send attempts.
      return;
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

  if (shouldBypassSendOriginalLoop(draftFingerprint)) {
    log("send original loop suppression active", {
      site: currentSite,
      reason: "background_same_draft",
      chars: text.length,
    });
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
      if (Date.now() < suppressAutoUntil) {
        return;
      }

      if (isPeacePadUiTarget(event.target)) {
        return;
      }

      const attempt = detectSendAttempt(currentSite, event);
      if (currentSite === "linkedin" && event.key === "Enter" && !event.isComposing) {
        const targetElement = event.target instanceof Element ? event.target : null;
        const activeElement = document.activeElement instanceof Element ? document.activeElement : null;
        const composerForHint = attempt?.composer || resolveComposerFromTarget(currentSite, event.target);
        const composerSnapshot = getLinkedInComposerSnapshot();
        const hintSnapshot = getLinkedInSendHintSnapshot(composerForHint);
        log("linkedin send hint", {
          site: currentSite,
          source: "enter_key",
          composerFound: Boolean(composerForHint),
          candidateCount: composerSnapshot.count,
          candidateSample: composerSnapshot.sample,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          targetTag: targetElement?.tagName?.toLowerCase() || "unknown",
          targetRole: targetElement?.getAttribute?.("role") || "",
          targetEditable: targetElement?.getAttribute?.("contenteditable") || "",
          activeTag: activeElement?.tagName?.toLowerCase() || "unknown",
          activeRole: activeElement?.getAttribute?.("role") || "",
          activeEditable: activeElement?.getAttribute?.("contenteditable") || "",
          ...hintSnapshot,
        });
      }

      if (!attempt || attempt.source !== "enter_key") {
        return;
      }

      if (sendReleaseInFlight) {
        preventSend(event);
        log("send blocked while release is in progress", { site: currentSite, source: "enter_key" });
        return;
      }

      const composer = attempt.composer;

      const text = getComposerText(composer).trim();
      if (!text || text.length < MIN_CHARS_FOR_SEND_GATE) {
        return;
      }

      const draftFingerprint = fingerprint(text);
      if (shouldBypassSendOriginalLoop(draftFingerprint)) {
        log("send original loop suppression active", {
          site: currentSite,
          source: "enter_key",
          chars: text.length,
        });
        return;
      }

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
        preventSend(event);
        log("send blocked while modal is unresolved", { site: currentSite, source: "enter_key" });
        return;
      }

      preventSend(event);
      log("draft intercepted", { site: currentSite, source: "enter_key", chars: text.length });
      void runPreflight(composer, currentSite, "send_gate", "enter_key");
    },
    true,
  );
}

function getLinkedInComposerSnapshot(): { count: number; sample: string[] } {
  try {
    const adapter = getAdapter("linkedin");
    const seen = new Set<Element>();
    const sample: string[] = [];
    for (const selector of adapter.selectors) {
      const matches = document.querySelectorAll(selector);
      matches.forEach((element) => {
        if (seen.has(element)) {
          return;
        }
        seen.add(element);
        if (sample.length < 3) {
          const role = element.getAttribute("role") || "";
          const editable = element.getAttribute("contenteditable") || "";
          const classes = element.getAttribute("class") || "";
          sample.push(`${element.tagName.toLowerCase()} role=${role} editable=${editable} class=${classes}`.trim());
        }
      });
    }
    return { count: seen.size, sample };
  } catch {
    return { count: 0, sample: [] };
  }
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

      const attempt = detectSendAttempt(currentSite, event);
      if (!attempt || attempt.source !== "send_button_click") {
        return;
      }

      if (currentSite === "linkedin") {
        const hintSnapshot = getLinkedInSendHintSnapshot(attempt.composer);
        log("linkedin send hint", {
          site: currentSite,
          source: attempt.source,
          ...hintSnapshot,
        });
      }

      if (sendReleaseInFlight) {
        preventSend(event);
        log("send blocked while release is in progress", { site: currentSite, source: "send_button_click" });
        return;
      }

      const composer = attempt.composer;
      if (!composer) {
        log("send trigger found without composer", { site: currentSite, source: "send_button_click" });
        return;
      }

      const text = getComposerText(composer).trim();
      if (!text || text.length < MIN_CHARS_FOR_SEND_GATE) {
        return;
      }

      const draftFingerprint = fingerprint(text);
      if (shouldBypassSendOriginalLoop(draftFingerprint)) {
        log("send original loop suppression active", {
          site: currentSite,
          source: "send_button_click",
          chars: text.length,
        });
        return;
      }

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
        preventSend(event);
        log("send blocked while modal is unresolved", { site: currentSite, source: "send_button_click" });
        return;
      }

      preventSend(event);
      log("draft intercepted", { site: currentSite, source: "send_button_click", chars: text.length });
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

    log("trigger matched", {
      site: currentSite,
      source,
      risk: preflight.risk_level,
      score: preflight.conflict_score,
      recommendation: preflight.recommendation,
      chars: text.length,
      ruleset: preflight.model_or_ruleset_version.escalation_ruleset,
    });

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
    armSendOriginalLoopSuppression(current.blockedOriginalFingerprint);
    lastDismissedFingerprint = current.blockedOriginalFingerprint;
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
    preventSend(event);
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

  const modalRoot = document.createElement("div");
  modalRoot.id = "peacepad-preflight-modal";
  modalRoot.style.position = "fixed";
  modalRoot.style.inset = "0";
  modalRoot.style.zIndex = "2147483647";
  modalRoot.style.display = "flex";
  modalRoot.style.justifyContent = "center";
  modalRoot.style.alignItems = "flex-end";
  modalRoot.style.padding = "14px";
  modalRoot.style.background = "rgba(0, 0, 0, 0.25)";
  modalRoot.style.backdropFilter = "blur(4px)";
  modalRoot.style.setProperty("-webkit-backdrop-filter", "blur(4px)");

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "min(356px, calc(100vw - 28px))";
  wrapper.style.opacity = "0";
  wrapper.style.transform = "translateY(18px) scale(0.985)";
  wrapper.style.transition = "transform 200ms ease-out, opacity 200ms ease-out, box-shadow 200ms ease-out";
  wrapper.style.maxWidth = "420px";
  wrapper.style.maxHeight = "min(70vh, calc(100vh - 28px))";
  wrapper.style.overflowY = "auto";
  wrapper.style.overflowX = "hidden";
  wrapper.style.background =
    "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(240,255,247,0.64) 100%)";
  wrapper.style.border = "1px solid rgba(255,255,255,0.48)";
  wrapper.style.borderRadius = "26px";
  modalRoot.style.opacity = "0";
  modalRoot.style.transition = "opacity 200ms ease-out, backdrop-filter 200ms ease-out";

  wrapper.style.boxShadow =
    "0 26px 72px rgba(2, 22, 19, 0.34), inset 0 1px 0 rgba(255,255,255,0.52)";
  wrapper.style.backdropFilter = "blur(24px) saturate(180%)";
  wrapper.style.setProperty("-webkit-backdrop-filter", "blur(24px) saturate(180%)");
  wrapper.style.padding = "10px 10px 11px";
  wrapper.style.fontFamily = "\"SF Pro Text\", \"Segoe UI Variable\", \"Segoe UI\", system-ui, sans-serif";
  wrapper.style.color = "#06281f";
  wrapper.style.pointerEvents = "auto";

  const formatRiskLabel = (riskLevel: PreflightResponse["risk_level"]): string => {
    if (riskLevel === "critical") {
      return "High";
    }
    const normalized = String(riskLevel || "low");
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  };

  const riskLabel = formatRiskLabel(preflight.risk_level);
  const riskTheme = getRiskBadgeTheme(preflight.risk_level);
  const modalCopy = getGuardianModalCopy(currentSite, preflight.recommendation);
  const modalOpenedAt = performance.now();
  const suggestionText = initialApprovedText?.trim() || preflight.calm_version?.trim() || originalDraft;
  const suggestionLoadMs = Math.round(performance.now() - modalOpenedAt);
  const originalNormalized = normalizeDraft(originalDraft);
  const suggestionNormalized = normalizeDraft(suggestionText);

  const waitFor = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const closeModalImmediately = () => {
    modalRoot.removeEventListener("keydown", handleKeyDown);
    if (activeModal?.fingerprint === draftFingerprint) {
      activeModal = null;
    }
    modalRoot.remove();
  };

  let modalClosing = false;
  const closeModal = () => {
    closeModalImmediately();
  };

  const closeModalWithAnimation = async (): Promise<void> => {
    if (modalClosing) {
      return;
    }

    modalClosing = true;
    modalRoot.style.opacity = "0";
    wrapper.style.opacity = "0";
    wrapper.style.transform = "translateY(10px) scale(0.992)";
    await waitFor(180);
    closeModalImmediately();
  };

  const focusComposer = () => {
    window.setTimeout(() => {
      const liveComposer =
        "isConnected" in composer && typeof composer.isConnected === "boolean" && !composer.isConnected
          ? (resolveActiveComposer(currentSite) || composer)
          : composer;
      focusComposerForEditing(liveComposer);
    }, 0);
  };

  const flashComposerInsertion = (targetComposer: HTMLElement): void => {
    const previousTransition = targetComposer.style.transition;
    const previousBackground = targetComposer.style.backgroundColor;
    const previousBoxShadow = targetComposer.style.boxShadow;

    targetComposer.style.transition = [
      previousTransition,
      "background-color 500ms ease, box-shadow 500ms ease",
    ]
      .filter(Boolean)
      .join(", ");
    targetComposer.style.backgroundColor = "rgba(34, 197, 94, 0.15)";
    targetComposer.style.boxShadow = "0 0 0 2px rgba(34, 197, 94, 0.2)";

    window.setTimeout(() => {
      targetComposer.style.backgroundColor = previousBackground;
      targetComposer.style.boxShadow = previousBoxShadow;
      window.setTimeout(() => {
        targetComposer.style.transition = previousTransition;
      }, 520);
    }, 40);
  };

  const applyButtonTheme = (
    button: HTMLButtonElement,
    theme: {
      height: string;
      border: string;
      borderRadius: string;
      fontSize: string;
      fontWeight: string;
      background: string;
      color: string;
      restShadow: string;
      hoverShadow: string;
      pressShadow: string;
      focusShadow: string;
    },
  ): void => {
    button.style.height = theme.height;
    button.style.border = theme.border;
    button.style.borderRadius = theme.borderRadius;
    button.style.fontSize = theme.fontSize;
    button.style.fontWeight = theme.fontWeight;
    button.style.background = theme.background;
    button.style.color = theme.color;
    button.style.boxShadow = theme.restShadow;
    button.dataset.restShadow = theme.restShadow;
    button.dataset.hoverShadow = theme.hoverShadow;
    button.dataset.pressShadow = theme.pressShadow;
    button.dataset.focusShadow = theme.focusShadow;
  };

  const createCompactPreviewSection = (
    label: string,
    value: string,
    tone: "neutral" | "accent" = "neutral",
  ): HTMLDivElement => {
    const section = document.createElement("div");
    section.style.marginBottom = "6px";

    const card = document.createElement("div");
    card.style.padding = "9px 11px";
    card.style.borderRadius = "18px";
    card.style.border =
      tone === "accent"
        ? "1px solid rgba(16,185,129,0.22)"
        : "1px solid rgba(0,0,0,0.05)";
    card.style.background =
      tone === "accent"
        ? "linear-gradient(180deg, rgba(221,252,236,0.76) 0%, rgba(255,255,255,0.44) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(248,250,252,0.42) 100%)";
    card.style.boxShadow = "0 10px 24px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.5)";
    card.style.backdropFilter = "blur(12px)";
    card.style.setProperty("-webkit-backdrop-filter", "blur(12px)");

    const heading = document.createElement("div");
    heading.textContent = label;
    heading.style.fontSize = "10px";
    heading.style.fontWeight = "700";
    heading.style.letterSpacing = "0.02em";
    heading.style.marginBottom = "4px";
    heading.style.color = tone === "accent" ? "#0f766e" : "#27453d";
    card.appendChild(heading);

    const preview = document.createElement("div");
    preview.textContent = value;
    preview.style.fontSize = "11.5px";
    preview.style.lineHeight = "1.5";
    preview.style.color = "#06281f";
    preview.style.display = "-webkit-box";
    preview.style.webkitBoxOrient = "vertical";
    preview.style.webkitLineClamp = "2";
    preview.style.overflow = "hidden";
    preview.style.wordBreak = "break-word";
    card.appendChild(preview);

    section.appendChild(card);
    return section;
  };

  const createSection = (
    label: string,
    value: string,
    editable = false,
    tone: "neutral" | "accent" | "editable" = editable ? "editable" : "neutral",
  ): HTMLDivElement => {
    const section = document.createElement("div");
    section.style.marginBottom = "6px";

    const heading = document.createElement("div");
    heading.textContent = label;
    heading.style.fontSize = "10px";
    heading.style.fontWeight = "700";
    heading.style.letterSpacing = "0.02em";
    heading.style.color = tone === "accent" ? "#0f766e" : "#27453d";
    heading.style.marginBottom = "4px";
    section.appendChild(heading);

    const body = editable ? document.createElement("textarea") : document.createElement("div");
    body.style.width = "100%";
    body.style.boxSizing = "border-box";
    body.style.fontSize = editable ? "12.5px" : "11.5px";
    body.style.lineHeight = "1.55";
    body.style.background =
      tone === "accent"
        ? "linear-gradient(180deg, rgba(220,252,231,0.66) 0%, rgba(255,255,255,0.48) 100%)"
        : tone === "editable"
          ? "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(243,255,248,0.82) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(248,250,252,0.48) 100%)";
    body.style.border =
      tone === "accent"
        ? "1px solid rgba(16,185,129,0.18)"
        : tone === "editable"
          ? "1px solid rgba(16,185,129,0.22)"
          : "1px solid rgba(148,163,184,0.20)";
    body.style.borderRadius = "16px";
    body.style.padding = editable ? "10px 11px" : "8px 10px";
    body.style.color = "#06281f";
    body.style.wordBreak = "break-word";
    body.style.boxShadow =
      tone === "editable"
        ? "0 14px 32px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.6)"
        : "0 8px 20px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.5)";
    body.style.backdropFilter = "blur(14px)";
    body.style.setProperty("-webkit-backdrop-filter", "blur(14px)");

    if (body instanceof HTMLTextAreaElement) {
      body.value = value;
      body.rows = 2;
      body.style.resize = "vertical";
      body.style.minHeight = "62px";
      body.style.maxHeight = "108px";
      body.style.outline = "none";
      body.addEventListener("focus", () => {
        body.style.border = "1px solid rgba(16,185,129,0.42)";
        body.style.boxShadow =
          "0 0 0 3px rgba(16,185,129,0.14), inset 0 1px 0 rgba(255,255,255,0.52)";
      });
      body.addEventListener("blur", () => {
        body.style.border = "1px solid rgba(16,185,129,0.22)";
        body.style.boxShadow = "0 14px 32px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.6)";
      });
    } else {
      body.textContent = value;
      body.style.whiteSpace = "pre-wrap";
      body.style.maxHeight = "58px";
      body.style.overflowY = "auto";
    }

    section.appendChild(body);
    return section;
  };

  const summary = document.createElement("div");
  summary.style.marginBottom = "8px";
  summary.style.padding = "12px 12px 10px";
  summary.style.borderRadius = "20px";
  summary.style.border = "1px solid rgba(255,255,255,0.42)";
  summary.style.background =
    "linear-gradient(135deg, rgba(18,140,126,0.20) 0%, rgba(255,255,255,0.30) 52%, rgba(37,211,102,0.14) 100%)";
  summary.style.boxShadow = "0 12px 28px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.42)";
  summary.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div style="min-width:0;">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#0f766e;opacity:0.6;">Protected Send Review</div>
        <strong style="display:block;margin-top:8px;font-size:22px;font-weight:900;line-height:1.02;color:#06281f;">SendSmart Guardian</strong>
        <div style="margin-top:12px;display:inline-flex;align-items:center;gap:8px;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,0.48);border:1px solid rgba(255,255,255,0.34);font-size:11px;line-height:1.3;color:#134e4a;box-shadow:0 8px 18px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.42);">
          <span style="display:inline-block;width:7px;height:7px;border-radius:999px;background:#25d366;box-shadow:0 0 0 5px rgba(37,211,102,0.12);"></span>
          <span style="color:#06281f;">Pause recommended before sending</span>
        </div>
      </div>
      <span style="font-size:8.5px;padding:4px 8px;border-radius:999px;background:rgba(248,113,113,0.08);color:#d96a6a;border:1px solid rgba(248,113,113,0.18);font-weight:700;letter-spacing:0.04em;box-shadow:inset 0 1px 0 rgba(255,255,255,0.42);">${riskLabel}</span>
    </div>
  `;
  wrapper.appendChild(summary);
  log("guardian triggered", {
    site: currentSite,
    risk: preflight.risk_level,
    score: preflight.conflict_score,
    recommendation: preflight.recommendation,
    suggestionLoadMs,
  });

  const interpretationLine = getGuardianInterpretationLine(preflight);
  const interpretation = document.createElement("div");
  interpretation.textContent = interpretationLine;
  interpretation.style.fontSize = "12px";
  interpretation.style.fontWeight = "600";
  interpretation.style.lineHeight = "1.45";
  interpretation.style.color = "#0b3b2f";
  interpretation.style.padding = "8px 10px";
  interpretation.style.margin = "0 0 6px 0";
  interpretation.style.borderRadius = "14px";
  interpretation.style.background = "rgba(255,255,255,0.56)";
  interpretation.style.border = "1px solid rgba(255,255,255,0.44)";
  interpretation.style.boxShadow = "0 6px 16px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.48)";
  wrapper.appendChild(interpretation);

  wrapper.appendChild(createCompactPreviewSection(modalCopy.originalLabel, originalDraft, "neutral"));

  if (preflight.calm_version) {
    wrapper.appendChild(createCompactPreviewSection(modalCopy.suggestedLabel, preflight.calm_version, "accent"));
  }

  const finalMessageSection = createSection(modalCopy.editableLabel, suggestionText, true, "editable");
  const finalMessageInput = finalMessageSection.querySelector("textarea") as HTMLTextAreaElement;
  let suggestionEdited = false;
  finalMessageInput.addEventListener("input", () => {
    if (suggestionEdited) {
      return;
    }

    const normalized = normalizeDraft(finalMessageInput.value);
    if (!normalized || normalized === suggestionNormalized) {
      return;
    }

    suggestionEdited = true;
    log("suggestion edited", {
      site: currentSite,
      chars: finalMessageInput.value.trim().length,
      sameAsOriginal: normalized === originalNormalized,
    });
  });
  wrapper.appendChild(finalMessageSection);

  const explanation = getPreflightExplanation(preflight);
  if (explanation.flaggedFor.length > 0 || explanation.saferBecause.length > 0 || modalCopy.helperNote) {
    const detailsWrap = document.createElement("div");
    detailsWrap.style.margin = "2px 0 8px 0";

    const detailsToggle = document.createElement("button");
    detailsToggle.type = "button";
    detailsToggle.style.width = "100%";
    detailsToggle.style.display = "flex";
    detailsToggle.style.alignItems = "center";
    detailsToggle.style.justifyContent = "space-between";
    detailsToggle.style.gap = "10px";
    detailsToggle.style.padding = "9px 11px";
    detailsToggle.style.borderRadius = "16px";
    detailsToggle.style.border = "1px solid rgba(255,255,255,0.40)";
    detailsToggle.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(240,255,247,0.38) 100%)";
    detailsToggle.style.color = "#0f766e";
    detailsToggle.style.fontSize = "11px";
    detailsToggle.style.fontWeight = "700";
    detailsToggle.style.cursor = "pointer";
    detailsToggle.style.boxShadow = "0 8px 18px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.36)";
    detailsToggle.setAttribute("aria-expanded", "false");

    const detailsLabel = document.createElement("span");
    detailsLabel.textContent = "Why this was flagged";
    detailsToggle.appendChild(detailsLabel);

    const detailsChevron = document.createElement("span");
    detailsChevron.innerHTML = '&#9662;'; // Down arrow
    detailsChevron.style.fontSize = "10px";
    detailsChevron.style.fontWeight = "700";
    detailsChevron.style.color = "#4b635c";
    detailsChevron.style.transition = "transform 150ms ease";
    detailsToggle.appendChild(detailsChevron);

    const detailsPanel = document.createElement("div");
    detailsPanel.style.maxHeight = "0px";
    detailsPanel.style.opacity = "0";
    detailsPanel.style.overflow = "hidden";
    detailsPanel.style.marginTop = "0";
    detailsPanel.style.transform = "translateY(-4px)";
    detailsPanel.style.transition = "max-height 150ms ease, opacity 150ms ease, transform 150ms ease, margin-top 150ms ease";

    let detailsExpanded = false;
    const setDetailsExpanded = (open: boolean): void => {
      detailsExpanded = open;
      detailsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      detailsChevron.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
      if (open) {
        detailsPanel.style.maxHeight = `${detailsPanel.scrollHeight + 8}px`;
        detailsPanel.style.opacity = "1";
        detailsPanel.style.transform = "translateY(0)";
        detailsPanel.style.marginTop = "7px";
      } else {
        detailsPanel.style.maxHeight = "0px";
        detailsPanel.style.opacity = "0";
        detailsPanel.style.transform = "translateY(-4px)";
        detailsPanel.style.marginTop = "0";
      }
    };

    detailsToggle.addEventListener("click", () => {
      setDetailsExpanded(!detailsExpanded);
    });

    const explanationCard = document.createElement("div");
    explanationCard.style.margin = "0";
    explanationCard.style.padding = "8px 9px";
    explanationCard.style.borderRadius = "18px";
    explanationCard.style.border = "1px solid rgba(255,255,255,0.38)";
    explanationCard.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.46) 0%, rgba(240,255,247,0.40) 100%)";
    explanationCard.style.display = "flex";
    explanationCard.style.flexDirection = "column";
    explanationCard.style.gap = "5px";
    explanationCard.style.boxShadow = "0 8px 18px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.36)";

    const createExplanationRow = (
      label: string,
      values: string[],
      tone: "flagged" | "safer",
    ): HTMLDivElement => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "flex-start";
      row.style.gap = "6px";
      row.style.flexWrap = "wrap";

      const title = document.createElement("span");
      title.textContent = `${label}:`;
      title.style.fontSize = "10px";
      title.style.fontWeight = "700";
      title.style.color = tone === "flagged" ? "#7f1d1d" : "#065f46";
      title.style.minWidth = "66px";
      row.appendChild(title);

      const chips = document.createElement("div");
      chips.style.display = "flex";
      chips.style.flexWrap = "wrap";
      chips.style.gap = "6px";
      chips.style.flex = "1";

      for (const value of values) {
        const chip = document.createElement("span");
        chip.textContent = value;
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.padding = "3px 8px";
        chip.style.borderRadius = "999px";
        chip.style.fontSize = "10px";
        chip.style.fontWeight = "600";
        chip.style.lineHeight = "1.2";
        chip.style.border = tone === "flagged" ? "1px solid rgba(248,113,113,0.26)" : "1px solid rgba(74,222,128,0.24)";
        chip.style.background = tone === "flagged" ? "rgba(255,241,242,0.82)" : "rgba(236,253,245,0.82)";
        chip.style.color = tone === "flagged" ? "#b91c1c" : "#047857";
        chips.appendChild(chip);
      }

      row.appendChild(chips);
      return row;
    };

    if (explanation.flaggedFor.length > 0) {
      explanationCard.appendChild(createExplanationRow(modalCopy.flaggedLabel, explanation.flaggedFor, "flagged"));
    }

    if (explanation.saferBecause.length > 0) {
      explanationCard.appendChild(createExplanationRow(modalCopy.saferLabel, explanation.saferBecause, "safer"));
    }

    detailsPanel.appendChild(explanationCard);

    const reviewNote = document.createElement("p");
    reviewNote.style.margin = "6px 2px 0 2px";
    reviewNote.style.padding = "0";
    reviewNote.style.fontSize = "10.5px";
    reviewNote.style.lineHeight = "1.35";
    reviewNote.style.color = "#4b635c";
    reviewNote.textContent = modalCopy.helperNote;
    detailsPanel.appendChild(reviewNote);

    detailsWrap.appendChild(detailsToggle);
    detailsWrap.appendChild(detailsPanel);
    wrapper.appendChild(detailsWrap);
  }

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "grid";
  buttonRow.style.gridTemplateColumns = "1fr 1fr";
  buttonRow.style.gap = "7px";
  buttonRow.style.marginTop = "1px";

  let approvalInFlight = false;
  let sendOriginal: HTMLButtonElement;
  let cancel: HTMLButtonElement;
  let sendApproved: HTMLButtonElement;
  const approvedActionLabel = getApprovedActionLabel(currentSite);

  const setModalInteractionEnabled = (enabled: boolean): void => {
    finalMessageInput.readOnly = !enabled;
    const controls = [sendApproved, sendOriginal, cancel].filter(Boolean);
    for (const control of controls) {
      control.disabled = !enabled;
      control.style.pointerEvents = enabled ? "auto" : "none";
      control.style.opacity = enabled ? "1" : "0.82";
    }
  };

  const playSuggestionAcceptedAnimation = async (): Promise<void> => {
    sendApproved.style.transform = "translateY(0) scale(0.99)";
    sendApproved.style.boxShadow = sendApproved.dataset.pressShadow || "0 7px 16px rgba(18,140,126,0.20)";
    await waitFor(120);
    sendApproved.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><span>Inserted</span><span data-guardian-check style="display:inline-block;opacity:0;transform:scale(0.8);transition:opacity 100ms ease, transform 100ms ease;">✓</span></span>';
    const check = sendApproved.querySelector("[data-guardian-check]") as HTMLElement | null;
    if (check) {
      window.requestAnimationFrame(() => {
        check.style.opacity = "1";
        check.style.transform = "scale(1)";
      });
    }
    await waitFor(100);
  };

  const resetSuggestionActionState = (): void => {
    sendApproved.innerHTML = approvedActionLabel;
    sendApproved.style.transform = "translateY(0)";
    sendApproved.style.boxShadow = sendApproved.dataset.restShadow || "0 12px 24px rgba(18,140,126,0.20)";
  };

  sendApproved = makeButton(
    approvedActionLabel,
    "linear-gradient(135deg, #169b74 0%, #24c86b 100%)",
    "#ffffff",
    () => {
    void (async () => {
      if (approvalInFlight) {
        return;
      }

      const approvedText = finalMessageInput.value.trim();
      if (!approvedText) {
        showToastThrottled("Add the final message you want to send first.");
        finalMessageInput.focus();
        return;
      }

      approvalInFlight = true;
      setModalInteractionEnabled(false);

      log("suggestion accepted", {
        site: currentSite,
        source: "manual_after_apply",
        chars: approvedText.length,
        sameAsOriginal: normalizeDraft(approvedText) === originalNormalized,
        sameAsSuggestion: normalizeDraft(approvedText) === suggestionNormalized,
      });

      log("suggestion used", {
        site: currentSite,
        source: "manual_after_apply",
        chars: approvedText.length,
        edited: suggestionEdited,
      });

      await playSuggestionAcceptedAnimation();
      
      const liveComposer = ("isConnected" in composer && typeof composer.isConnected === "boolean" && !composer.isConnected)
            ? (resolveActiveComposer(currentSite) || composer)
            : composer;

      const replacement = await replaceComposerText(currentSite, liveComposer, approvedText);

      if (!replacement.success) {
        log("replacement verification failed", {
          site: currentSite,
          source: "manual_after_apply",
          action: "approved_send",
          expected: approvedText,
          actual: replacement.settledText || replacement.actualText,
          method: replacement.method,
          settledText: replacement.settledText,
          reacquired: replacement.reacquired,
        });

        const copied = await copyTextToClipboard(approvedText);
        if (currentSite === "whatsapp") {
          if (copied) {
              const fallbackBlockedText = getComposerText(liveComposer).trim() || originalDraft;
              const fallbackBlockedFingerprint = fingerprint(fallbackBlockedText) || draftFingerprint;
              armWhatsappApprovedHandoff(
                liveComposer,
                preflight,
                fallbackBlockedFingerprint,
                fallbackBlockedText,
                approvedText,
              );
              prepareWhatsappComposerForPaste(liveComposer, "manual_after_apply", "approved_action");
              showToastThrottled("Suggestion copied. Press Ctrl+V to replace.");
          } else {
              showToastThrottled("Could not replace or copy the suggestion.");
          }
        } else {
            if(copied) {
                showToastThrottled("Suggestion copied. Paste it to send.");
            } else {
                showToastThrottled("Could not copy suggestion.");
            }
        }
        
        await closeModalWithAnimation();
        focusComposer();
        if(replacement.reacquired) {
            flashComposerInsertion(liveComposer);
        }
        approvalInFlight = false;
        setModalInteractionEnabled(true);
        resetSuggestionActionState();
        return;
      }
      
      lastSafeFingerprint = fingerprint(replacement.settledText || replacement.actualText);
      lastDismissedFingerprint = "";

      await closeModalWithAnimation();
      focusComposer();
      flashComposerInsertion(liveComposer);
      
      if (currentSite !== "whatsapp") {
          sendReleaseInFlight = true;
          suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
          window.setTimeout(() => {
            releaseSend(composer, currentSite, "approved_message_release", approvedText, 1);
          }, SEND_RELEASE_SETTLE_MS);
      }
    })();
  });
  applyButtonTheme(sendApproved, {
    height: "42px",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "16px",
    fontSize: "13px",
    fontWeight: "700",
    background: "linear-gradient(135deg, #149a74 0%, #24c96c 100%)",
    color: "#ffffff",
    restShadow: "0 12px 24px rgba(18,140,126,0.20), inset 0 1px 0 rgba(255,255,255,0.18)",
    hoverShadow: "0 16px 28px rgba(18,140,126,0.24), inset 0 1px 0 rgba(255,255,255,0.22)",
    pressShadow: "0 7px 16px rgba(18,140,126,0.20), inset 0 1px 0 rgba(255,255,255,0.16)",
    focusShadow: "0 0 0 3px rgba(37,211,102,0.16), 0 12px 24px rgba(18,140,126,0.20)",
  });
  sendApproved.style.gridColumn = "1 / span 2";
  buttonRow.appendChild(sendApproved);

  sendOriginal = makeButton("Send Original", "rgba(255,255,255,0.72)", "#0b3b2f", () => {
    log("send original clicked", { site: currentSite, source: "manual_after_apply", entry: "modal" });
    log("original sent", { site: currentSite, source: "manual_after_apply" });
    if (currentSite === "whatsapp") {
      clearWhatsappApprovedHandoff("explicit_original_release", {
        site: currentSite,
        source: "manual_after_apply",
        entry: "modal",
      });
    }
    armSendOriginalLoopSuppression(draftFingerprint);
    lastDismissedFingerprint = draftFingerprint;
    closeModal();
    sendReleaseInFlight = true;
    suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
    releaseSend(composer, currentSite, "send_original_release", originalDraft, 1);
  });
  applyButtonTheme(sendOriginal, {
    height: "40px",
    border: "1px solid rgba(255,255,255,0.44)",
    borderRadius: "16px",
    fontSize: "12.5px",
    fontWeight: "600",
    background: "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(242,255,248,0.64) 100%)",
    color: "#0b3b2f",
    restShadow: "0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.30)",
    hoverShadow: "0 14px 24px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.32)",
    pressShadow: "0 6px 14px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.28)",
    focusShadow: "0 0 0 3px rgba(16,185,129,0.12), 0 10px 22px rgba(15,23,42,0.10)",
  });
  buttonRow.appendChild(sendOriginal);

  cancel = makeButton("Cancel", "rgba(255,255,255,0.72)", "#334155", () => {
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
  applyButtonTheme(cancel, {
    height: "40px",
    border: "1px solid rgba(255,255,255,0.44)",
    borderRadius: "16px",
    fontSize: "12.5px",
    fontWeight: "600",
    background: "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(248,250,252,0.60) 100%)",
    color: "#334155",
    restShadow: "0 10px 22px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.28)",
    hoverShadow: "0 14px 24px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.30)",
    pressShadow: "0 6px 14px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.26)",
    focusShadow: "0 0 0 3px rgba(148,163,184,0.14), 0 10px 22px rgba(15,23,42,0.08)",
  });
  buttonRow.appendChild(cancel);

  wrapper.appendChild(buttonRow);

  const reassurance = document.createElement("p");
  reassurance.textContent = "You remain in control of the final message.";
  reassurance.style.margin = "8px 2px 2px";
  reassurance.style.fontSize = "10.5px";
  reassurance.style.lineHeight = "1.35";
  reassurance.style.textAlign = "center";
  reassurance.style.color = "#4b635c";
  wrapper.appendChild(reassurance);

  modalRoot.appendChild(wrapper);
  modalRoot.addEventListener("click", (event) => {
    if (event.target !== modalRoot) {
      return;
    }
    cancel.click();
  });
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (approvalInFlight) {
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancel.click();
      return;
    }

    if (event.key === "Enter") {
      if (event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      sendApproved.click();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      wrapper.querySelectorAll<HTMLElement>("button:not([disabled]), textarea:not([disabled])"),
    ).filter((element) => {
      const computed = window.getComputedStyle(element);
      return computed.display !== "none" && computed.visibility !== "hidden";
    });

    if (!focusableElements.length) {
      return;
    }

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1)
      : (currentIndex === -1 || currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1);

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  };

  modalRoot.addEventListener("keydown", handleKeyDown);

  document.body.appendChild(modalRoot);
  window.requestAnimationFrame(() => {
    modalRoot.style.opacity = "1";
    wrapper.style.opacity = "1";
    wrapper.style.transform = "translateY(0) scale(1)";
    finalMessageInput.focus();
    finalMessageInput.setSelectionRange(finalMessageInput.value.length, finalMessageInput.value.length);
  });
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
  button.dataset.restShadow = "0 1px 2px rgba(15, 23, 42, 0.10)";
  button.dataset.hoverShadow = "0 10px 22px rgba(15, 23, 42, 0.18)";
  button.dataset.pressShadow = "0 4px 10px rgba(15, 23, 42, 0.16)";
  button.dataset.focusShadow =
    "0 0 0 3px rgba(59, 130, 246, 0.20), 0 8px 18px rgba(15, 23, 42, 0.14)";
  button.style.transition =
    "transform 120ms ease, box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease, filter 140ms ease";
  button.style.outline = "none";
  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-1px)";
    button.style.boxShadow = button.dataset.hoverShadow || "0 10px 22px rgba(15, 23, 42, 0.18)";
    button.style.filter = background === "#ffffff" ? "brightness(0.99)" : "brightness(1.03)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = button.dataset.restShadow || "0 1px 2px rgba(15, 23, 42, 0.10)";
    button.style.filter = "none";
  });
  button.addEventListener("mousedown", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = button.dataset.pressShadow || "0 4px 10px rgba(15, 23, 42, 0.16)";
  });
  button.addEventListener("focus", () => {
    button.style.boxShadow =
      button.dataset.focusShadow || "0 0 0 3px rgba(59, 130, 246, 0.20), 0 8px 18px rgba(15, 23, 42, 0.14)";
  });
  button.addEventListener("blur", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = button.dataset.restShadow || "0 1px 2px rgba(15, 23, 42, 0.10)";
    button.style.filter = "none";
  });
  button.addEventListener("click", onClick);
  return button;
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

async function releaseSend(
  composer: HTMLElement,
  currentSite: SupportedSite,
  reason: string,
  expectedText?: string,
  attemptsRemaining = 1,
): Promise<void> {
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
        const retryResult = await replaceComposerText(currentSite, composer, expectedText);
        log("composer replacement retry", {
          site: currentSite,
          reason,
          success: retryResult.success,
          method: retryResult.method,
          actual: retryResult.settledText || retryResult.actualText,
          settledText: retryResult.settledText,
          reacquired: retryResult.reacquired,
        });
        window.setTimeout(() => {
          void releaseSend(composer, currentSite, reason, expectedText, attemptsRemaining - 1);
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
  const sendResult = resumeSend(currentSite, composer);
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
    "draft intercepted": "send_gate_intercepted",
    "send gate intercepted": "send_gate_intercepted",
    "send blocked while modal is unresolved": "send_blocked_modal_open",
    "preflight request sent": "preflight_requested",
    "local preflight result received": "preflight_result_local",
    "api preflight result received": "preflight_result_api",
    "intervention decision returned": "intervention_decision",
    "trigger matched": "trigger_matched",
    "guardian triggered": "guardian_triggered",
    "linkedin send hint": "linkedin_send_hint",
    "showing intervention modal": "modal_opened",
    "apply suggested clicked": "apply_suggested_clicked",
    "suggestion used": "suggestion_used",
    "suggestion edited": "suggestion_edited",
    "original sent": "original_sent",
    "suggestion accepted": "suggestion_accepted",
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
    "replacement attempted": "replacement_attempted",
    "composer replacement retry": "composer_replace_retry",
    "replacement verification success": "composer_replace_verified",
    "replacement succeeded": "replacement_succeeded",
    "replacement verification failed": "composer_replace_failed",
    "replacement fallback used": "replacement_fallback_used",
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

function armSendOriginalLoopSuppression(draftFingerprint: string): void {
  if (!draftFingerprint) {
    sendOriginalLoopSuppression = null;
    return;
  }

  sendOriginalLoopSuppression = {
    fingerprint: draftFingerprint,
    until: Date.now() + SEND_ORIGINAL_LOOP_SUPPRESSION_MS,
  };
}

function clearSendOriginalLoopSuppressionIfChanged(draftFingerprint: string): void {
  if (!sendOriginalLoopSuppression) {
    return;
  }

  if (!shouldSuppressSendOriginalLoop(draftFingerprint, sendOriginalLoopSuppression)) {
    sendOriginalLoopSuppression = null;
  }
}

function shouldBypassSendOriginalLoop(draftFingerprint: string): boolean {
  const bypass = shouldSuppressSendOriginalLoop(draftFingerprint, sendOriginalLoopSuppression);
  if (!bypass) {
    clearSendOriginalLoopSuppressionIfChanged(draftFingerprint);
  }
  return bypass;
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






