import type { PreflightResponse } from "@ftc/peacepad-sdk";
import {
  detectSupportedSite,
  getComposerText,
  resolveComposerFromTarget,
  resolveSendTriggerFromTarget,
  setComposerText,
  type SupportedSite,
} from "./adapters";
import { canUseAuto, getSettings } from "./storage";

const site = detectSupportedSite(window.location.hostname);
const LOG_PREFIX = "[PeacePad]";
const CONTENT_SENTINEL = "__peacepadPreSendContentLoaded__";

const MIN_CHARS_FOR_BACKGROUND_ANALYSIS = 18;
const MIN_CHARS_FOR_SEND_GATE = 5;
const BACKGROUND_DEBOUNCE_MS = 900;
const SUPPRESS_AFTER_SEND_MS = 1200;

let suppressAutoUntil = 0;
let debounceHandle: number | null = null;
let pendingComposer: HTMLElement | null = null;
let analysisInFlight = false;
let pendingSendGate:
  | {
      composer: HTMLElement;
      site: SupportedSite;
      fingerprint: string;
    }
  | null = null;

let lastAnalyzedFingerprint = "";
let lastSafeFingerprint = "";
let lastIntervenedFingerprint = "";
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
  installSendGate(currentSite);
  installClickSendGate(currentSite);
}

function installPassiveWatcher(currentSite: SupportedSite): void {
  document.addEventListener(
    "input",
    (event) => {
      if (Date.now() < suppressAutoUntil) {
        return;
      }

      const composer = resolveComposerFromTarget(currentSite, event.target);
      if (!composer) {
        return;
      }

      log("draft detected", {
        site: currentSite,
        chars: getComposerText(composer).trim().length,
      });
      scheduleBackgroundCheck(composer, currentSite);
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

  if (!composer || analysisInFlight) {
    return;
  }

  const settings = await getSettings();
  if (!canUseAuto(settings, currentSite)) {
    log("background check skipped", { site: currentSite, reason: "auto_disabled" });
    return;
  }

  const text = getComposerText(composer).trim();
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
  await runPreflight(composer, currentSite, "background");
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

      const composer = resolveComposerFromTarget(currentSite, event.target);
      if (!composer) {
        return;
      }

      const text = getComposerText(composer).trim();
      if (!text || text.length < MIN_CHARS_FOR_SEND_GATE) {
        return;
      }

      const draftFingerprint = fingerprint(text);
      if (draftFingerprint === lastSafeFingerprint) {
        log("send gate bypassed", { site: currentSite, reason: "already_cleared", chars: text.length });
        return;
      }

      log("send gate intercepted", { site: currentSite, source: "enter_key", chars: text.length });
      blockSendEvent(event, currentSite, "enter_key");
      void runPreflight(composer, currentSite, "send_gate");
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
      if (draftFingerprint === lastSafeFingerprint) {
        log("send click bypassed", { site: currentSite, reason: "already_cleared", chars: text.length });
        return;
      }

      log("send gate intercepted", { site: currentSite, source: "send_button_click", chars: text.length });
      blockSendEvent(event, currentSite, "send_button_click");
      void runPreflight(composer, currentSite, "send_gate");
    },
    true,
  );
}

async function runPreflight(
  composer: HTMLElement,
  currentSite: SupportedSite,
  intent: "background" | "send_gate",
): Promise<void> {
  const initialText = getComposerText(composer).trim();
  const initialFingerprint = fingerprint(initialText);

  if (analysisInFlight) {
    if (intent === "send_gate") {
      pendingSendGate = {
        composer,
        site: currentSite,
        fingerprint: initialFingerprint,
      };
      log("send gate queued while analysis is in flight", {
        site: currentSite,
        chars: initialText.length,
      });
    }
    return;
  }

  const text = getComposerText(composer).trim();
  if (!text) {
    if (intent === "send_gate") {
      triggerSend(composer);
    }
    return;
  }

  const settings = await getSettings();
  if (!canUseAuto(settings, currentSite)) {
    log("preflight skipped", { site: currentSite, intent, reason: "auto_disabled" });
    if (intent === "send_gate") {
      triggerSend(composer);
    }
    return;
  }

  const draftFingerprint = fingerprint(text);
  const pendingMatchesCurrentDraft =
    Boolean(pendingSendGate) &&
    pendingSendGate?.composer === composer &&
    pendingSendGate?.fingerprint === draftFingerprint;
  const effectiveIntent: "background" | "send_gate" = pendingMatchesCurrentDraft ? "send_gate" : intent;
  if (pendingMatchesCurrentDraft && intent === "background") {
    log("background analysis promoted to send gate", {
      site: currentSite,
      chars: text.length,
    });
  }

  log("preflight triggered", {
    site: currentSite,
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
      },
    });

    if (!response.ok) {
      log("preflight failed", {
        site: currentSite,
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
        triggerSend(composer);
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
      intent: effectiveIntent,
      risk: preflight.risk_level,
      score: preflight.conflict_score,
      intervene,
    });
    if (!intervene) {
      lastSafeFingerprint = draftFingerprint;
      if (effectiveIntent === "send_gate") {
        suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
        triggerSend(composer);
      }
      return;
    }

    if (
      !hasMaterialChange(draftFingerprint, lastIntervenedFingerprint) ||
      !hasMaterialChange(draftFingerprint, lastDismissedFingerprint)
    ) {
      if (effectiveIntent === "send_gate") {
        suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
        triggerSend(composer);
      }
      return;
    }

    lastIntervenedFingerprint = draftFingerprint;
    log("showing intervention modal", { site: currentSite, intent: effectiveIntent });
    showPreflightModal(preflight, composer, draftFingerprint);
  } finally {
    analysisInFlight = false;
    if (pendingMatchesCurrentDraft) {
      pendingSendGate = null;
      return;
    }

    const queuedSendGate = pendingSendGate;
    if (queuedSendGate) {
      pendingSendGate = null;
      void runPreflight(queuedSendGate.composer, queuedSendGate.site, "send_gate");
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
        resolve(response as any);
      },
    );
  });
}

function showPreflightModal(preflight: PreflightResponse, composer: HTMLElement, draftFingerprint: string): void {
  const existing = document.getElementById("peacepad-preflight-modal");
  if (existing) {
    existing.remove();
  }

  const wrapper = document.createElement("div");
  wrapper.id = "peacepad-preflight-modal";
  wrapper.style.position = "fixed";
  wrapper.style.top = "20px";
  wrapper.style.right = "20px";
  wrapper.style.zIndex = "2147483647";
  wrapper.style.width = "360px";
  wrapper.style.maxWidth = "90vw";
  wrapper.style.background = "#ffffff";
  wrapper.style.border = "1px solid #cbd5e1";
  wrapper.style.borderRadius = "14px";
  wrapper.style.boxShadow = "0 16px 40px rgba(15, 23, 42, 0.25)";
  wrapper.style.padding = "14px";
  wrapper.style.fontFamily = "Arial, sans-serif";
  wrapper.style.color = "#0f172a";

  const riskLabel = preflight.risk_level.toUpperCase();
  const summary = document.createElement("div");
  summary.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <strong>PeacePad Pre-Send Check</strong>
      <span style="font-size:11px;padding:4px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">${riskLabel}</span>
    </div>
    <p style="margin:8px 0 4px 0;font-size:12px;line-height:1.4;">
      Recommendation: <strong>${preflight.recommendation.replace(/_/g, " ")}</strong>
    </p>
    <p style="margin:0 0 10px 0;font-size:12px;line-height:1.4;">
      Conflict score: <strong>${preflight.conflict_score}</strong>
    </p>
  `;
  wrapper.appendChild(summary);

  if (preflight.calm_version) {
    const suggestion = document.createElement("div");
    suggestion.style.fontSize = "12px";
    suggestion.style.lineHeight = "1.4";
    suggestion.style.background = "#f8fafc";
    suggestion.style.border = "1px solid #e2e8f0";
    suggestion.style.borderRadius = "10px";
    suggestion.style.padding = "10px";
    suggestion.style.marginBottom = "10px";
    suggestion.textContent = `Calmer version: ${preflight.calm_version}`;
    wrapper.appendChild(suggestion);
  }

  const signalText = preflight.signals.slice(0, 3).map((item) => item.code.replace(/_/g, " "));
  if (signalText.length > 0) {
    const signals = document.createElement("p");
    signals.style.margin = "0 0 10px 0";
    signals.style.fontSize = "11px";
    signals.style.color = "#334155";
    signals.textContent = `Signals: ${signalText.join(", ")}`;
    wrapper.appendChild(signals);
  }

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "grid";
  buttonRow.style.gridTemplateColumns = "1fr 1fr";
  buttonRow.style.gap = "8px";

  const closeModal = () => wrapper.remove();

  if (preflight.calm_version) {
    const useSuggested = makeButton("Use Suggested", "#1d4ed8", "#ffffff", () => {
      setComposerText(composer, preflight.calm_version as string);
      lastSafeFingerprint = fingerprint(preflight.calm_version as string);
      suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
      triggerSend(composer);
      closeModal();
    });

    const editSuggested = makeButton("Edit Suggested", "#0f172a", "#ffffff", () => {
      setComposerText(composer, preflight.calm_version as string);
      suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
      closeModal();
      composer.focus();
    });

    buttonRow.appendChild(useSuggested);
    buttonRow.appendChild(editSuggested);
  }

  const sendOriginal = makeButton("Send Original", "#ffffff", "#0f172a", () => {
    suppressAutoUntil = Date.now() + SUPPRESS_AFTER_SEND_MS;
    lastDismissedFingerprint = "";
    triggerSend(composer);
    closeModal();
  });
  sendOriginal.style.border = "1px solid #cbd5e1";

  const cancel = makeButton("Cancel", "#ffffff", "#0f172a", () => {
    lastDismissedFingerprint = draftFingerprint;
    closeModal();
  });
  cancel.style.border = "1px solid #cbd5e1";

  buttonRow.appendChild(sendOriginal);
  buttonRow.appendChild(cancel);

  wrapper.appendChild(buttonRow);
  document.body.appendChild(wrapper);
}

function makeButton(label: string, background: string, color: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.height = "34px";
  button.style.border = "none";
  button.style.borderRadius = "8px";
  button.style.fontSize = "12px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.style.background = background;
  button.style.color = color;
  button.addEventListener("click", onClick);
  return button;
}

function triggerSend(composer: HTMLElement): void {
  composer.focus();

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    const form = composer.closest("form");
    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }

  composer.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );

  composer.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
}

function blockSendEvent(event: Event, currentSite: SupportedSite, source: string): void {
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
    return;
  }

  console.debug(LOG_PREFIX, message);
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
