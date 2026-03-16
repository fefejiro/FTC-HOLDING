export type SupportedSite = "whatsapp" | "gmail" | "slack";

export interface AdapterConfig {
  site: SupportedSite;
  selectors: string[];
  sendSelectors: string[];
}

export interface ComposerReplacementResult {
  success: boolean;
  actualText: string;
  method: "input_value" | "dom_replace" | "range_insert" | "exec_command" | "text_content";
}

export interface TriggerSendResult {
  success: boolean;
  method: "send_button_click" | "enter_key";
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
];

export function detectSupportedSite(hostname: string): SupportedSite | null {
  const host = hostname.toLowerCase();
  if (host.includes("web.whatsapp.com")) return "whatsapp";
  if (host.includes("mail.google.com")) return "gmail";
  if (host.includes("app.slack.com")) return "slack";
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

function normalizeComposerText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function replaceContentWithDomReset(element: HTMLElement, value: string): ComposerReplacementResult {
  const doc = element.ownerDocument;
  if (typeof (element as HTMLElement & { replaceChildren?: (...nodes: Node[]) => void }).replaceChildren === "function") {
    (element as HTMLElement & { replaceChildren: (...nodes: Node[]) => void }).replaceChildren(doc.createTextNode(value));
  } else {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.appendChild(doc.createTextNode(value));
  }

  focusComposerForEditing(element);
  element.dispatchEvent(createInputLikeEvent("input", value, false));
  element.dispatchEvent(new Event("change", { bubbles: true }));

  const actualText = getComposerText(element);
  return {
    success: normalizeComposerText(actualText) === normalizeComposerText(value),
    actualText,
    method: "dom_replace",
  };
}

function replaceContentEditableText(site: SupportedSite, element: HTMLElement, value: string): ComposerReplacementResult {
  focusComposerForEditing(element);
  element.dispatchEvent(createInputLikeEvent("beforeinput", value, true));

  if (site === "whatsapp") {
    return replaceContentWithDomReset(element, value);
  }

  let method: ComposerReplacementResult["method"] = "range_insert";
  let actualText = getComposerText(element);
  const doc = element.ownerDocument as Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
  };

  if (typeof doc.execCommand === "function") {
    method = "exec_command";
    element.focus();
    selectNodeContents(element);
    doc.execCommand("insertText", false, value);
    actualText = getComposerText(element);
  }

  if (normalizeComposerText(actualText) !== normalizeComposerText(value)) {
    const selection = selectNodeContents(element);
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(element.ownerDocument.createTextNode(value));
      selection.removeAllRanges();
      focusComposerForEditing(element);
      method = "range_insert";
    } else {
      element.textContent = value;
      method = "text_content";
    }
  }

  element.dispatchEvent(createInputLikeEvent("input", value, false));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  actualText = getComposerText(element);

  return {
    success: normalizeComposerText(actualText) === normalizeComposerText(value),
    actualText,
    method,
  };
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
  const active = document.activeElement;
  const activeComposer = findEditableAncestor(active);
  if (activeComposer) {
    return activeComposer;
  }

  const adapter = getAdapter(site);
  for (const selector of adapter.selectors) {
    const candidate = document.querySelector(selector);
    if (isEditableComposer(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function replaceComposerText(
  site: SupportedSite,
  element: HTMLElement,
  value: string,
): ComposerReplacementResult {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    focusComposerForEditing(element);
    element.dispatchEvent(createInputLikeEvent("beforeinput", value, true));
    element.value = value;
    focusComposerForEditing(element);
    element.dispatchEvent(createInputLikeEvent("input", value, false));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    const actualText = getComposerText(element);
    return {
      success: normalizeComposerText(actualText) === normalizeComposerText(value),
      actualText,
      method: "input_value",
    };
  }

  return replaceContentEditableText(site, element, value);
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
