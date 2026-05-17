import type { JobSource, RawJob } from "../types.js";
import type { HuntConfig } from "../config_loader.js";

/**
 * Source adapter contract. Each implementation pulls raw job postings from
 * one external surface (ATS feed, gmail alert mailbox, manual paste, etc.)
 * and normalizes them into `RawJob[]`. Adapters MUST be idempotent and MUST
 * NOT write to the database directly — the orchestrator handles persistence.
 */
export interface SourceAdapter {
  /** Stable JobSource enum value */
  readonly source: JobSource;
  /** Human-readable name for logs */
  readonly name: string;
  /** Whether the adapter has the credentials/config it needs to run */
  isEnabled(config: HuntConfig): boolean;
  /** Fetch and normalize raw jobs */
  fetch(config: HuntConfig): Promise<RawJob[]>;
}

export interface SourceRunResult {
  source: JobSource;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}
