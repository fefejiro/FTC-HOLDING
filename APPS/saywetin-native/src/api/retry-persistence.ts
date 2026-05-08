/**
 * Offline Retry Persistence Layer
 * 
 * Stores failed section fetch attempts to AsyncStorage and provides:
 * - Automatic retry on network recovery
 * - Retry attempt tracking and exponential backoff
 * - Per-track, per-section retry queues
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLyricSection, fetchMeaningSection, isSectionError } from './result-sections';
import type { LyricSectionResult, MeaningSectionResult, SectionError } from './result-sections';

export type SectionType = 'lyrics' | 'meaning' | 'cultural_analysis';

export interface RetryQueueItem {
  trackId: string;
  sectionType: SectionType;
  attemptCount: number;
  lastAttemptAtMs: number;
  nextRetryAtMs: number;
  error: string;
}

export interface RetryQueueState {
  items: RetryQueueItem[];
  lastSyncAtMs: number;
}

const STORAGE_KEY = '@saywetin/retry-queue';
const INITIAL_RETRY_DELAY_MS = 2000; // 2 seconds
const MAX_RETRY_DELAY_MS = 60000; // 60 seconds
const MAX_RETRY_ATTEMPTS = 10;
const BACKOFF_MULTIPLIER = 1.5;

export class RetryPersistence {
  private static instance: RetryPersistence | null = null;
  private queue: Map<string, RetryQueueItem> = new Map();
  private isInitialized = false;
  private syncInProgress = false;
  private networkMonitorUnsubscribe: (() => void) | null = null;

  private constructor() {}

  static getInstance(): RetryPersistence {
    if (!RetryPersistence.instance) {
      RetryPersistence.instance = new RetryPersistence();
    }
    return RetryPersistence.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state: RetryQueueState = JSON.parse(stored);
        state.items.forEach((item) => {
          this.queue.set(this.getQueueKey(item.trackId, item.sectionType), item);
        });
        console.log('[retry-persistence] initialized from storage', {
          itemCount: state.items.length,
          lastSyncAtMs: state.lastSyncAtMs,
        });
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[retry-persistence] initialization failed', error);
      this.isInitialized = true;
    }
  }

  private getQueueKey(trackId: string, sectionType: SectionType): string {
    return `${trackId}:${sectionType}`;
  }

  private calculateNextRetryDelayMs(attemptCount: number): number {
    const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount);
    return Math.min(delayMs, MAX_RETRY_DELAY_MS);
  }

  async addRetryItem(
    trackId: string,
    sectionType: SectionType,
    error: string,
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.getQueueKey(trackId, sectionType);
    const existing = this.queue.get(key);
    const attemptCount = (existing?.attemptCount ?? 0) + 1;

    if (attemptCount > MAX_RETRY_ATTEMPTS) {
      this.queue.delete(key);
      await this.persist();
      console.log('[retry-persistence] max retry attempts exceeded, dropped', {
        trackId,
        sectionType,
        attemptCount,
      });
      return;
    }

    const now = Date.now();
    const nextRetryDelayMs = this.calculateNextRetryDelayMs(attemptCount);

    const item: RetryQueueItem = {
      trackId,
      sectionType,
      attemptCount,
      lastAttemptAtMs: now,
      nextRetryAtMs: now + nextRetryDelayMs,
      error,
    };

    this.queue.set(key, item);
    await this.persist();

    console.log('[retry-persistence] added retry item', {
      trackId,
      sectionType,
      attemptCount,
      nextRetryInMs: nextRetryDelayMs,
    });
  }

  async removeRetryItem(trackId: string, sectionType: SectionType): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const key = this.getQueueKey(trackId, sectionType);
    this.queue.delete(key);
    await this.persist();
  }

  getRetryItems(): RetryQueueItem[] {
    return Array.from(this.queue.values());
  }

  getRetryItemsForTrack(trackId: string): RetryQueueItem[] {
    return Array.from(this.queue.values()).filter((item) => item.trackId === trackId);
  }

  getPendingRetryItems(): RetryQueueItem[] {
    const now = Date.now();
    return Array.from(this.queue.values()).filter((item) => item.nextRetryAtMs <= now);
  }

  private async persist(): Promise<void> {
    try {
      const state: RetryQueueState = {
        items: Array.from(this.queue.values()),
        lastSyncAtMs: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[retry-persistence] failed to persist state', error);
    }
  }

  async syncPendingRetries(
    onRetrySuccess?: (trackId: string, sectionType: SectionType) => void,
    onRetryFailed?: (trackId: string, sectionType: SectionType, error: string) => void,
  ): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    this.syncInProgress = true;

    try {
      const pendingItems = this.getPendingRetryItems();

      if (pendingItems.length === 0) {
        return;
      }

      console.log('[retry-persistence] syncing pending retries', {
        count: pendingItems.length,
      });

      const results = await Promise.allSettled(
        pendingItems.map((item) => this.retryFetchSection(item)),
      );

      results.forEach((result, index) => {
        const item = pendingItems[index];
        if (result.status === 'fulfilled' && result.value.success) {
          onRetrySuccess?.(item.trackId, item.sectionType);
        } else {
          const errorMsg = result.status === 'rejected' 
            ? String(result.reason) 
            : (result as any).value?.error || 'Unknown error';
          onRetryFailed?.(item.trackId, item.sectionType, errorMsg);
        }
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  private async retryFetchSection(
    item: RetryQueueItem,
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      let result: LyricSectionResult | MeaningSectionResult | SectionError;

      if (item.sectionType === 'lyrics') {
        result = await fetchLyricSection(item.trackId);
      } else if (item.sectionType === 'meaning') {
        result = await fetchMeaningSection(item.trackId);
      } else if (item.sectionType === 'cultural_analysis') {
        // Cultural analysis is fetched as part of meaning
        result = await fetchMeaningSection(item.trackId);
      } else {
        return { success: false, error: 'Unknown section type' };
      }

      if (isSectionError(result)) {
        // Section error result
        await this.addRetryItem(item.trackId, item.sectionType, result.message);
        return { success: false, error: result.message };
      }

      // Success
      await this.removeRetryItem(item.trackId, item.sectionType);
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.addRetryItem(item.trackId, item.sectionType, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async clearAll(): Promise<void> {
    this.queue.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[retry-persistence] cleared all retry items');
  }
}

export default RetryPersistence;
