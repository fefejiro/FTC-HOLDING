import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectSupportedSite,
  getComposerText,
  replaceComposerText,
  resolveComposerFromTarget,
  resolveSendTriggerFromTarget,
  triggerSend,
} from "../src/adapters";
import { canEnableAuto, canUseAuto } from "../src/storage";

type AttributeMatcher = {
  name: string;
  operator: "=" | "*=" | null;
  value: string | null;
};

class MockEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented = false;
  data?: string;
  inputType?: string;

  constructor(type: string, init: { bubbles?: boolean; cancelable?: boolean; data?: string; inputType?: string } = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.data = init.data;
    this.inputType = init.inputType;
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  stopPropagation(): void {}

  stopImmediatePropagation(): void {}
}

class MockKeyboardEvent extends MockEvent {
  key: string;
  code: string;

  constructor(
    type: string,
    init: { key?: string; code?: string; bubbles?: boolean; cancelable?: boolean } = {},
  ) {
    super(type, init);
    this.key = init.key || "";
    this.code = init.code || "";
  }
}

class MockInputEvent extends MockEvent {}

class MockTextNode {
  textContent: string;

  constructor(textContent: string) {
    this.textContent = textContent;
  }
}

class MockRange {
  private target: MockElement | null = null;

  selectNodeContents(node: MockElement): void {
    this.target = node;
  }

  deleteContents(): void {
    if (this.target) {
      this.target.textContent = "";
      this.target.children = [];
    }
  }

  insertNode(node: MockTextNode): void {
    if (this.target) {
      this.target.textContent = node.textContent;
      this.target.children = [];
    }
  }

  collapse(_toStart: boolean): void {}

  getTarget(): MockElement | null {
    return this.target;
  }
}

class MockSelection {
  private range: MockRange | null = null;

  get rangeCount(): number {
    return this.range ? 1 : 0;
  }

  getRangeAt(_index: number): MockRange {
    if (!this.range) {
      throw new Error("No range available");
    }
    return this.range;
  }

  removeAllRanges(): void {
    this.range = null;
  }

  addRange(range: MockRange): void {
    this.range = range;
  }

  getTarget(): MockElement | null {
    return this.range?.getTarget() || null;
  }
}

class MockElement {
  tagName: string;
  ownerDocument: MockDocument;
  parentElement: MockElement | null = null;
  children: MockElement[] = [];
  textContent = "";
  isContentEditable = false;
  clickCount = 0;
  dispatchedEvents: string[] = [];
  private attributes = new Map<string, string>();

  constructor(tagName: string, ownerDocument: MockDocument) {
    this.tagName = tagName.toLowerCase();
    this.ownerDocument = ownerDocument;
  }

  get firstChild(): MockElement | MockTextNode | null {
    return this.children[0] || (this.textContent ? new MockTextNode(this.textContent) : null);
  }

  appendChild(child: MockElement | MockTextNode): MockElement | MockTextNode {
    if (child instanceof MockElement) {
      child.parentElement = this;
      child.ownerDocument = this.ownerDocument;
      this.children.push(child);
    }
    if (child instanceof MockTextNode) {
      this.textContent = child.textContent;
      this.children = [];
    }
    return child;
  }

  removeChild(_child: MockElement | MockTextNode): MockElement | MockTextNode {
    this.children = [];
    this.textContent = "";
    return _child;
  }

  replaceChildren(...nodes: (MockElement | MockTextNode)[]): void {
    this.children = [];
    this.textContent = "";
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === "contenteditable") {
      this.isContentEditable = value === "true";
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  focus(): void {
    this.ownerDocument.activeElement = this;
  }

  dispatchEvent(event: MockEvent): boolean {
    this.dispatchedEvents.push(event.type);
    return !event.defaultPrevented;
  }

  click(): void {
    this.clickCount += 1;
  }

  matches(selector: string): boolean {
    return selector
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .some((item) => this.matchesSingleSelector(item));
  }

  closest(selector: string): MockElement | null {
    let current: MockElement | null = this;
    while (current) {
      if (current.matches(selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  querySelector(selector: string): MockElement | null {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child;
      }

      const nested = child.querySelector(selector);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private matchesSingleSelector(selector: string): boolean {
    const tagMatch = selector.match(/^[a-z]+/i);
    const tagName = tagMatch?.[0]?.toLowerCase() || null;
    if (tagName && this.tagName !== tagName) {
      return false;
    }

    const attributeMatchers = parseAttributeMatchers(selector);
    for (const matcher of attributeMatchers) {
      const actual = this.getAttribute(matcher.name);
      if (matcher.operator === "=") {
        if (actual !== matcher.value) {
          return false;
        }
        continue;
      }

      if (matcher.operator === "*=") {
        if (!actual || !matcher.value || !actual.includes(matcher.value)) {
          return false;
        }
        continue;
      }

      if (actual === null) {
        return false;
      }
    }

    return true;
  }
}

class MockInputElement extends MockElement {
  value = "";
}

class MockTextAreaElement extends MockElement {
  value = "";
}

class MockDocument {
  body: MockElement;
  activeElement: MockElement | null = null;
  private readonly selection = new MockSelection();
  defaultView: { getSelection: () => MockSelection };

  constructor() {
    this.body = new MockElement("body", this);
    this.defaultView = {
      getSelection: () => this.selection,
    };
  }

  querySelector(selector: string): MockElement | null {
    return this.body.querySelector(selector);
  }

  createElement(tagName: string): MockElement {
    return createMockElement(tagName, this);
  }

  createTextNode(textContent: string): MockTextNode {
    return new MockTextNode(textContent);
  }

  createRange(): MockRange {
    return new MockRange();
  }

  execCommand(commandId: string, _showUi?: boolean, value?: string): boolean {
    if (commandId !== "insertText") {
      return false;
    }

    const target = this.selection.getTarget();
    if (!target) {
      return false;
    }

    target.textContent = value || "";
    target.children = [];
    return true;
  }
}

function parseAttributeMatchers(selector: string): AttributeMatcher[] {
  const matches = selector.match(/\[[^\]]+\]/g) || [];
  return matches.map((segment) => {
    const content = segment.slice(1, -1);
    const containsIndex = content.indexOf("*=");
    if (containsIndex >= 0) {
      return {
        name: content.slice(0, containsIndex).trim(),
        operator: "*=" as const,
        value: stripQuotes(content.slice(containsIndex + 2).trim()),
      };
    }

    const equalsIndex = content.indexOf("=");
    if (equalsIndex >= 0) {
      return {
        name: content.slice(0, equalsIndex).trim(),
        operator: "=" as const,
        value: stripQuotes(content.slice(equalsIndex + 1).trim()),
      };
    }

    return {
      name: content.trim(),
      operator: null,
      value: null,
    };
  });
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

function createMockElement(tagName: string, document: MockDocument): MockElement {
  if (tagName.toLowerCase() === "input") {
    return new MockInputElement(tagName, document);
  }

  if (tagName.toLowerCase() === "textarea") {
    return new MockTextAreaElement(tagName, document);
  }

  return new MockElement(tagName, document);
}

const originalGlobals = {
  document: globalThis.document,
  Element: globalThis.Element,
  HTMLElement: globalThis.HTMLElement,
  HTMLInputElement: globalThis.HTMLInputElement,
  HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
  Event: globalThis.Event,
  InputEvent: globalThis.InputEvent,
  KeyboardEvent: globalThis.KeyboardEvent,
};

beforeEach(() => {
  const document = new MockDocument();
  const globalObject = globalThis as typeof globalThis & Record<string, unknown>;
  globalObject.document = document as unknown as Document;
  globalObject.Element = MockElement as unknown as typeof Element;
  globalObject.HTMLElement = MockElement as unknown as typeof HTMLElement;
  globalObject.HTMLInputElement = MockInputElement as unknown as typeof HTMLInputElement;
  globalObject.HTMLTextAreaElement = MockTextAreaElement as unknown as typeof HTMLTextAreaElement;
  globalObject.Event = MockEvent as unknown as typeof Event;
  globalObject.InputEvent = MockInputEvent as unknown as typeof InputEvent;
  globalObject.KeyboardEvent = MockKeyboardEvent as unknown as typeof KeyboardEvent;
});

afterEach(() => {
  const globalObject = globalThis as typeof globalThis & Record<string, unknown>;
  globalObject.document = originalGlobals.document;
  globalObject.Element = originalGlobals.Element;
  globalObject.HTMLElement = originalGlobals.HTMLElement;
  globalObject.HTMLInputElement = originalGlobals.HTMLInputElement;
  globalObject.HTMLTextAreaElement = originalGlobals.HTMLTextAreaElement;
  globalObject.Event = originalGlobals.Event;
  globalObject.InputEvent = originalGlobals.InputEvent;
  globalObject.KeyboardEvent = originalGlobals.KeyboardEvent;
});

describe("site adapter detection", () => {
  it("detects whatsapp host", () => {
    expect(detectSupportedSite("web.whatsapp.com")).toBe("whatsapp");
  });

  it("detects gmail host", () => {
    expect(detectSupportedSite("mail.google.com")).toBe("gmail");
  });

  it("detects slack host", () => {
    expect(detectSupportedSite("app.slack.com")).toBe("slack");
  });

  it("returns null for unsupported host", () => {
    expect(detectSupportedSite("example.com")).toBeNull();
  });
});

describe("auto-check gating", () => {
  it("allows auto toggle controls without priming", () => {
    const settings = {
      apiBaseUrl: "https://api.peacepad.ca",
      apiKey: "",
      autoBySite: { whatsapp: true },
    };

    expect(canEnableAuto(settings, "whatsapp")).toBe(true);
    expect(canUseAuto(settings, "whatsapp")).toBe(true);
  });

  it("disables auto checks when site toggle is off", () => {
    const settings = {
      apiBaseUrl: "https://api.peacepad.ca",
      apiKey: "",
      autoBySite: { gmail: false },
    };

    expect(canEnableAuto(settings, "gmail")).toBe(true);
    expect(canUseAuto(settings, "gmail")).toBe(false);
  });
});

describe("whatsapp adapter helpers", () => {
  it("resolves a nested target inside the whatsapp composer", () => {
    const document = globalThis.document as unknown as MockDocument;
    const footer = document.createElement("footer");
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("data-tab", "10");
    const nestedTarget = document.createElement("span");

    composer.appendChild(nestedTarget);
    footer.appendChild(composer);
    document.body.appendChild(footer);

    expect(resolveComposerFromTarget("whatsapp", nestedTarget)).toBe(composer);
  });

  it("resolves a nested target inside the whatsapp send button", () => {
    const document = globalThis.document as unknown as MockDocument;
    const footer = document.createElement("footer");
    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send");
    const icon = document.createElement("span");
    icon.setAttribute("data-icon", "send");

    sendButton.appendChild(icon);
    footer.appendChild(sendButton);
    document.body.appendChild(footer);

    expect(resolveSendTriggerFromTarget("whatsapp", icon)).toBe(sendButton);
  });

  it("replaces contenteditable composer text and verifies the result", () => {
    const document = globalThis.document as unknown as MockDocument;
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.setAttribute("role", "textbox");
    composer.textContent = "Fuck you.";
    document.body.appendChild(composer);

    const result = replaceComposerText(
      "whatsapp",
      composer as unknown as HTMLElement,
      "Pickup has been running late recently.",
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe("dom_replace");
    expect(getComposerText(composer as unknown as HTMLElement)).toBe("Pickup has been running late recently.");
  });

  it("prefers the real send button when releasing the send action", () => {
    const document = globalThis.document as unknown as MockDocument;
    const footer = document.createElement("footer");
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.setAttribute("role", "textbox");
    composer.textContent = "Pickup has been running late recently.";
    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send");

    footer.appendChild(composer);
    footer.appendChild(sendButton);
    document.body.appendChild(footer);

    const result = triggerSend("whatsapp", composer as unknown as HTMLElement);

    expect(result).toEqual({
      success: true,
      method: "send_button_click",
    });
    expect(sendButton.clickCount).toBe(1);
  });
});
