export type SupportedSite = "whatsapp" | "gmail" | "slack";

export interface AdapterConfig {
  site: SupportedSite;
  selectors: string[];
  sendSelectors: string[];
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

export function resolveComposerFromTarget(
  site: SupportedSite,
  target: EventTarget | null,
): HTMLElement | null {
  const element = target instanceof Element ? target : null;
  const directMatch = findEditableAncestor(element);
  if (directMatch) {
    return directMatch;
  }

  return resolveActiveComposer(site);
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

export function resolveSendTriggerFromTarget(
  site: SupportedSite,
  target: EventTarget | null,
): HTMLElement | null {
  const element = target instanceof Element ? target : null;
  if (!element) {
    return null;
  }

  const adapter = getAdapter(site);
  return findMatchingAncestor(element, adapter.sendSelectors);
}
