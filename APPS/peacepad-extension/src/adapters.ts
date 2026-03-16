export type SupportedSite = "whatsapp" | "gmail" | "slack" | "linkedin";

export interface AdapterConfig {
  site: SupportedSite;
  selectors: string[];
  sendSelectors: string[];
  sendShortcut?: "Enter" | "Ctrl+Enter" | "detect";
}

// Site profiles for the universal composer engine. Keep platform selectors here.
export type SiteProfile = AdapterConfig;

export interface ComposerReplacementResult {
  success: boolean;
  actualText: string;
  settledText: string;
  reacquired: boolean;
  method: "input_value" | "dom_replace" | "range_insert" | "exec_command" | "text_content";
}

export interface TriggerSendResult {
  success: boolean;
  method: "send_button_click" | "enter_key";
}

export interface SendAttempt {
  composer: HTMLElement;
  source: TriggerSendResult["method"];
  trigger?: HTMLElement | null;
}

const ADAPTERS: AdapterConfig[] = [
  {
    site: "whatsapp",
    selectors: [
      "div[contenteditable='true'][data-tab='10']",
      "div[contenteditable='true'][role='textbox']",
    ],
    sendSelectors: [
      "button[aria-label='Send']",
      "div[role='button'][aria-label='Send']",
      "span[data-icon='send']",
      "span[data-icon='send-filled']",
    ],
  },
  {
    site: "gmail",
    selectors: [
      "div[role='textbox'][g_editable='true']",
      "div[aria-label='Message Body'][role='textbox']",
    ],
    sendSelectors: [
      "div[role='button'][aria-label*='Send']",
      "button[aria-label*='Send']",
    ],
    sendShortcut: "Ctrl+Enter",
  },
  {
    site: "slack",
    selectors: [
      "div[data-qa='message_input'] div[contenteditable='true']",
      "div[contenteditable='true'][data-qa='message_input']",
    ],
    sendSelectors: [
      "button[data-qa='texty_send_button']",
      "button[aria-label*='Send message']",
    ],
  },
  {
    site: "linkedin",
    selectors: [
      "div.msg-form__contenteditable[contenteditable='true']",
      "div.msg-form__msg-content-container [role='textbox'][contenteditable='true']",
    ],
    sendSelectors: [
      "button.msg-form__send-button",
      "button[aria-label*='Send']",
    ],
    sendShortcut: "detect",
  },
];

export const SITE_PROFILES: SiteProfile[] = ADAPTERS;

export function detectSupportedSite(hostname: string): SupportedSite | null {
  const host = hostname.toLowerCase();
  if (host.includes("web.whatsapp.com")) return "whatsapp";
  if (host.includes("mail.google.com")) return "gmail";
  if (host.includes("app.slack.com")) return "slack";
  if (host.includes("linkedin.com")) return "linkedin";
  return null;
}

export function getAdapter(site: SupportedSite): AdapterConfig {
  const adapter = ADAPTERS.find((item) => item.site === site);
  if (!adapter) {
    throw new Error(`Unsupported site: ${site}`);
  }
  return adapter;
}

export function isEditableComposer(element: Element | null): element is HTMLElement {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return true;
  }

  return element.isContentEditable || element.getAttribute("contenteditable") === "true";
}

function findEditableAncestor(element: Element | null): HTMLElement | null {
  if (!element) {
    return null;
  }

  if (isEditableComposer(element)) {
    return element;
  }

  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const contentEditableAncestor = element.closest("[contenteditable='true']");
  if (isEditableComposer(contentEditableAncestor)) {
    return contentEditableAncestor;
  }

  const textboxAncestor = element.closest("[role='textbox'], textarea, input");
  if (isEditableComposer(textboxAncestor)) {
    return textboxAncestor;
  }

  return null;
}

function findMatchingAncestor(element: Element | null, selectors: string[]): HTMLElement | null {
  if (!element || !(element instanceof HTMLElement)) {
    return null;
  }

  for (const selector of selectors) {
    if (element.matches(selector)) {
      return element;
    }

    const ancestor = element.closest(selector);
    if (ancestor instanceof HTMLElement) {
      return ancestor;
    }
  }

  return null;
}

function createInputLikeEvent(
  type: "beforeinput" | "input",
  value: string,
  cancelable: boolean,
): Event {
  if (typeof InputEvent !== "undefined") {
    return new InputEvent(type, {
      bubbles: true,
      cancelable,
      data: value,
      inputType: "insertReplacementText",
    });
  }

  return new Event(type, {
    bubbles: true,
    cancelable,
  });
}

function createPlainInputEvent(): Event {
  return new Event("input", {
    bubbles: true,
    cancelable: false,
  });
}

function normalizeComposerText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function waitForComposerSettle(delayMs = 45): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function selectNodeContents(element: HTMLElement): Selection | null {
  const selection = element.ownerDocument.defaultView?.getSelection() || null;
  if (!selection) {
    return null;
  }

  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

function collapseSelectionToEnd(element: HTMLElement): void {
  const selection = element.ownerDocument.defaultView?.getSelection() || null;
  if (!selection) {
    return;
  }

  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function focusComposerForEditing(element: HTMLElement): void {
  element.focus();

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const end = element.value.length;
    element.setSelectionRange(end, end);
    return;
  }

  collapseSelectionToEnd(element);
}

function isConnectedComposer(element: HTMLElement): boolean {
  if ("isConnected" in element && typeof element.isConnected === "boolean") {
    return element.isConnected;
  }

  return true;
}

function resolveLiveComposer(
  site: SupportedSite,
  element: HTMLElement,
): { composer: HTMLElement; reacquired: boolean } {
  if (site !== "whatsapp" || isConnectedComposer(element)) {
    return {
      composer: element,
      reacquired: false,
    };
  }

  const resolved = resolveActiveComposer(site);
  if (resolved) {
    return {
      composer: resolved,
      reacquired: true,
    };
  }

  return {
    composer: element,
    reacquired: false,
  };
}

function selectAllForReplacement(element: HTMLElement): void {
  element.focus();

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.setSelectionRange(0, element.value.length);
    return;
  }

  selectNodeContents(element);
}

function dispatchComposerChangeEvents(
  site: SupportedSite,
  element: HTMLElement,
  value: string,
  method: ComposerReplacementResult["method"],
): void {
  const inputEvent = site === "whatsapp" && method === "range_insert"
    ? createPlainInputEvent()
    : createInputLikeEvent("input", value, false);

  element.dispatchEvent(inputEvent);
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function finalizeReplacementAttempt(
  site: SupportedSite,
  element: HTMLElement,
  method: ComposerReplacementResult["method"],
  value: string,
): Promise<ComposerReplacementResult> {
  const actualText = getComposerText(element);

  await waitForComposerSettle();
  const { composer: settledComposer, reacquired } = resolveLiveComposer(site, element);
  const settledText = getComposerText(settledComposer);
  const success = normalizeComposerText(settledText) === normalizeComposerText(value);

  if (success) {
    focusComposerForEditing(settledComposer);
  }

  return {
    success,
    actualText,
    settledText,
    reacquired,
    method,
  };
}

async function attemptExecCommandReplacement(
  site: SupportedSite,
  element: HTMLElement,
  value: string,
): Promise<ComposerReplacementResult | null> {
  const doc = element.ownerDocument as Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
  };

  if (typeof doc.execCommand !== "function") {
    return null;
  }

  selectAllForReplacement(element);
  element.dispatchEvent(createInputLikeEvent("beforeinput", value, true));
  doc.execCommand("insertText", false, value);

  return finalizeReplacementAttempt(site, element, "exec_command", value);
}

async function attemptRangeReplacement(
  site: SupportedSite,
  element: HTMLElement,
  value: string,
): Promise<ComposerReplacementResult> {
  selectAllForReplacement(element);
  element.dispatchEvent(createInputLikeEvent("beforeinput", value, true));

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = value;
    dispatchComposerChangeEvents(site, element, value, "input_value");
    return finalizeReplacementAttempt(site, element, "input_value", value);
  }

  const selection = selectNodeContents(element);
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(element.ownerDocument.createTextNode(value));
    selection.removeAllRanges();
    focusComposerForEditing(element);
    dispatchComposerChangeEvents(site, element, value, "range_insert");
    return finalizeReplacementAttempt(site, element, "range_insert", value);
  }

  element.textContent = value;
  dispatchComposerChangeEvents(site, element, value, "text_content");
  return finalizeReplacementAttempt(site, element, "text_content", value);
}

function findSendTriggerWithin(scope: ParentNode, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const candidate = scope.querySelector(selector);
    if (candidate instanceof HTMLElement) {
      return candidate;
    }
  }

  return null;
}

export function getComposerText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent || "";
}

export function setComposerText(element: HTMLElement, value: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  element.textContent = value;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
}

export function resolveComposerFromTarget(site: SupportedSite, target: EventTarget | null): HTMLElement | null {
  const element = target instanceof Element ? target : null;
  const directMatch = findEditableAncestor(element);
  if (directMatch) {
    return directMatch;
  }

  return resolveActiveComposer(site);
}

export function resolveSendTriggerFromTarget(site: SupportedSite, target: EventTarget | null): HTMLElement | null {
  const element = target instanceof Element ? target : null;
  if (!element) {
    return null;
  }

  const adapter = getAdapter(site);
  return findMatchingAncestor(element, adapter.sendSelectors);
}

export function resolveActiveComposer(site: SupportedSite): HTMLElement | null {
  const adapter = getAdapter(site);
  for (const selector of adapter.selectors) {
    const candidate = document.querySelector(selector);
    if (isEditableComposer(candidate)) {
      return candidate;
    }
  }

  const active = document.activeElement;
  const activeComposer = findEditableAncestor(active);
  if (activeComposer) {
    return activeComposer;
  }

  return null;
}

function detectLinkedInSendOnEnter(composer: HTMLElement | null): boolean | null {
  if (!composer) {
    return null;
  }

  const datasetValue = composer.getAttribute("data-send-on-enter");
  if (datasetValue === "true") {
    return true;
  }
  if (datasetValue === "false") {
    return false;
  }

  const container = composer.closest(".msg-form__contenteditable, .msg-form__msg-content-container") || composer.parentElement;
  if (container instanceof HTMLElement) {
    const ariaHint = container.getAttribute("aria-label") || "";
    if (/press\s+enter\s+to\s+send/i.test(ariaHint)) {
      return true;
    }
  }

  const hint = composer.closest(".msg-form__msg-content-container")?.querySelector(
    ".msg-form__hint-text, .msg-form__footer-hint-text, [data-control-name='message_send_on_enter']",
  );
  if (hint instanceof HTMLElement) {
    const text = hint.textContent || "";
    if (/press\s+enter\s+to\s+send/i.test(text)) {
      return true;
    }
    if (/enter\s+to\s+send/i.test(text)) {
      return true;
    }
  }

  return null;
}

export function resolveSendShortcut(site: SupportedSite, composer: HTMLElement | null): "Enter" | "Ctrl+Enter" | "click-only" {
  const adapter = getAdapter(site);
  const shortcut = adapter.sendShortcut;

  if (site === "gmail") {
    return "Ctrl+Enter";
  }

  if (!shortcut || shortcut === "Enter") {
    return "Enter";
  }

  if (shortcut === "Ctrl+Enter") {
    return "Ctrl+Enter";
  }

  if (site === "linkedin") {
    const detected = detectLinkedInSendOnEnter(composer);
    if (detected === true) {
      return "Enter";
    }
    return "click-only";
  }

  return "click-only";
}

export async function replaceComposerText(
  site: SupportedSite,
  element: HTMLElement,
  value: string,
): Promise<ComposerReplacementResult> {
  const { composer, reacquired } = resolveLiveComposer(site, element);

  if (site === "whatsapp") {
    const execCommandResult = await attemptExecCommandReplacement(site, composer, value);
    if (execCommandResult?.success) {
      return {
        ...execCommandResult,
        reacquired: execCommandResult.reacquired || reacquired,
      };
    }

    const rangeResult = await attemptRangeReplacement(site, composer, value);
    return {
      ...rangeResult,
      reacquired: rangeResult.reacquired || reacquired,
    };
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return attemptRangeReplacement(site, element, value);
  }

  const execCommandResult = await attemptExecCommandReplacement(site, composer, value);
  if (execCommandResult?.success) {
    return {
      ...execCommandResult,
      reacquired: execCommandResult.reacquired || reacquired,
    };
  }

  const rangeResult = await attemptRangeReplacement(site, composer, value);
  return {
    ...rangeResult,
    reacquired: rangeResult.reacquired || reacquired,
  };
}

export function triggerSend(site: SupportedSite, composer: HTMLElement): TriggerSendResult {
  composer.focus();

  const adapter = getAdapter(site);
  const scopes: ParentNode[] = [];
  const footer = composer.closest("footer");
  if (footer) {
    scopes.push(footer);
  }
  if (composer.parentElement) {
    scopes.push(composer.parentElement);
  }
  scopes.push(document);

  for (const scope of scopes) {
    const sendTrigger = findSendTriggerWithin(scope, adapter.sendSelectors);
    if (sendTrigger) {
      sendTrigger.click();
      return { success: true, method: "send_button_click" };
    }
  }

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

  return { success: true, method: "enter_key" };
}

export function detectSendAttempt(site: SupportedSite, event: Event): SendAttempt | null {
  if (event instanceof KeyboardEvent) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
      return null;
    }
    const composer = resolveComposerFromTarget(site, event.target);
    if (!composer) {
      return null;
    }

    const shortcut = resolveSendShortcut(site, composer);
    if (event.ctrlKey || event.metaKey) {
      return { composer, source: "enter_key" };
    }
    if (shortcut === "Ctrl+Enter") {
      return null;
    }

    if (shortcut === "Enter") {
      return { composer, source: "enter_key" };
    }
    return null;
  }

  if (event.type === "click") {
    const trigger = resolveSendTriggerFromTarget(site, event.target);
    if (!trigger) {
      return null;
    }
    const composer = resolveComposerFromTarget(site, event.target) || resolveActiveComposer(site);
    if (!composer) {
      return null;
    }
    return { composer, source: "send_button_click", trigger };
  }

  return null;
}

export function preventSend(event: Event): void {
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
}

export function resumeSend(site: SupportedSite, composer: HTMLElement): TriggerSendResult {
  return triggerSend(site, composer);
}
