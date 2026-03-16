import type { SupportedSite } from "./adapters";

// Placeholder: Universal Web Composer Engine (not yet wired).
// This module will eventually own shared browser messaging mechanics across platforms.

export interface ComposerEngineSiteProfile {
  site: SupportedSite;
  selectors: string[];
  sendSelectors: string[];
  sendShortcut?: "Enter" | "Ctrl+Enter" | string;
  insertionStrategy?: "auto" | "manual";
}

export type ComposerEngineResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export const UNIVERSAL_COMPOSER_ENGINE_STATE = {
  status: "draft" as const,
  notes: "Placeholder module for future extraction from content/adapters.",
};
