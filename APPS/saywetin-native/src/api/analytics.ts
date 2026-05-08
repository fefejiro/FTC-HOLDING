/**
 * Analytics Tracking for Result Screen Performance
 * 
 * Tracks:
 * - Retry attempts by section and error type
 * - Section load success/failure rates
 * - Performance timing metrics
 * - User engagement with retry actions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SectionType } from './retry-persistence';

export interface SectionLoadEvent {
  trackId: string;
  sectionType: SectionType;
  success: boolean;
  durationMs: number;
  errorType?: string;
  isRetry: boolean;
  attemptNumber: number;
}

export interface RetryActionEvent {
  trackId: string;
  sectionType: SectionType;
  userInitiated: boolean;
  timestamp: number;
}

export interface PerformanceMetricsEvent {
  recognitionDurationMs: number;
  totalLoadTimeMs: number;
  sectionLoadTimesMs: {
    lyrics?: number;
    meaning?: number;
    cultural_analysis?: number;
  };
}

export interface AnalyticsSession {
  sessionId: string;
  startedAtMs: number;
  sectionLoadEvents: SectionLoadEvent[];
  retryActionEvents: RetryActionEvent[];
  performanceMetrics: PerformanceMetricsEvent[];
  errorDistribution: Map<string, number>;
}

const STORAGE_KEY = '@saywetin/analytics-sessions';
const MAX_SESSIONS_STORED = 50;

export class ResultScreenAnalytics {
  private static instance: ResultScreenAnalytics | null = null;
  private currentSession: AnalyticsSession | null = null;
  private sessions: AnalyticsSession[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ResultScreenAnalytics {
    if (!ResultScreenAnalytics.instance) {
      ResultScreenAnalytics.instance = new ResultScreenAnalytics();
    }
    return ResultScreenAnalytics.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.sessions = parsed.map(
          (s: any): AnalyticsSession => ({
            ...s,
            errorDistribution: new Map(Object.entries(s.errorDistribution || {})),
          }),
        );
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('[analytics] initialization failed', error);
      this.isInitialized = true;
    }
  }

  startSession(): void {
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      startedAtMs: Date.now(),
      sectionLoadEvents: [],
      retryActionEvents: [],
      performanceMetrics: [],
      errorDistribution: new Map(),
    };
    console.log('[analytics] session started', { sessionId: this.currentSession.sessionId });
  }

  recordSectionLoad(event: SectionLoadEvent): void {
    if (!this.currentSession) {
      this.startSession();
    }

    this.currentSession!.sectionLoadEvents.push(event);

    if (event.errorType) {
      const count = this.currentSession!.errorDistribution.get(event.errorType) ?? 0;
      this.currentSession!.errorDistribution.set(event.errorType, count + 1);
    }

    console.log('[analytics] section load recorded', {
      trackId: event.trackId,
      sectionType: event.sectionType,
      success: event.success,
      durationMs: event.durationMs,
      attemptNumber: event.attemptNumber,
    });
  }

  recordRetryAction(event: RetryActionEvent): void {
    if (!this.currentSession) {
      this.startSession();
    }

    this.currentSession!.retryActionEvents.push(event);

    console.log('[analytics] retry action recorded', {
      trackId: event.trackId,
      sectionType: event.sectionType,
      userInitiated: event.userInitiated,
    });
  }

  recordPerformanceMetrics(event: PerformanceMetricsEvent): void {
    if (!this.currentSession) {
      this.startSession();
    }

    this.currentSession!.performanceMetrics.push(event);

    console.log('[analytics] performance metrics recorded', {
      recognitionDurationMs: event.recognitionDurationMs,
      totalLoadTimeMs: event.totalLoadTimeMs,
    });
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    this.sessions.push(this.currentSession);

    // Keep only recent sessions
    if (this.sessions.length > MAX_SESSIONS_STORED) {
      this.sessions = this.sessions.slice(-MAX_SESSIONS_STORED);
    }

    await this.persistSessions();

    console.log('[analytics] session ended', {
      sessionId: this.currentSession.sessionId,
      loadEvents: this.currentSession.sectionLoadEvents.length,
      retryEvents: this.currentSession.retryActionEvents.length,
    });

    this.currentSession = null;
  }

  getSummaryStats(): {
    totalSessions: number;
    totalLoadEvents: number;
    successRate: number;
    retryRate: number;
    topErrors: Array<[string, number]>;
    avgRecognitionTimeMs: number;
    avgTotalLoadTimeMs: number;
  } {
    let totalLoadEvents = 0;
    let successfulLoads = 0;
    let retryEvents = 0;
    let totalRecognitionTimeMs = 0;
    let totalLoadTimeMs = 0;
    const errorDistribution = new Map<string, number>();

    this.sessions.forEach((session) => {
      totalLoadEvents += session.sectionLoadEvents.length;
      successfulLoads += session.sectionLoadEvents.filter((e) => e.success).length;
      retryEvents += session.retryActionEvents.length;

      session.sectionLoadEvents.forEach((event) => {
        if (event.errorType) {
          const count = errorDistribution.get(event.errorType) ?? 0;
          errorDistribution.set(event.errorType, count + 1);
        }
      });

      session.performanceMetrics.forEach((metric) => {
        totalRecognitionTimeMs += metric.recognitionDurationMs;
        totalLoadTimeMs += metric.totalLoadTimeMs;
      });
    });

    const topErrors = Array.from(errorDistribution.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      totalSessions: this.sessions.length,
      totalLoadEvents,
      successRate: totalLoadEvents > 0 ? successfulLoads / totalLoadEvents : 0,
      retryRate: totalLoadEvents > 0 ? retryEvents / totalLoadEvents : 0,
      topErrors,
      avgRecognitionTimeMs:
        this.sessions.reduce((sum, s) => sum + s.performanceMetrics.length, 0) > 0
          ? totalRecognitionTimeMs /
            this.sessions.reduce((sum, s) => sum + s.performanceMetrics.length, 0)
          : 0,
      avgTotalLoadTimeMs:
        this.sessions.reduce((sum, s) => sum + s.performanceMetrics.length, 0) > 0
          ? totalLoadTimeMs /
            this.sessions.reduce((sum, s) => sum + s.performanceMetrics.length, 0)
          : 0,
    };
  }

  getRecentEvents(limit = 20): Array<{
    type: 'load' | 'retry';
    event: SectionLoadEvent | RetryActionEvent;
    timestamp: number;
  }> {
    const events: Array<{ type: 'load' | 'retry'; event: SectionLoadEvent | RetryActionEvent; timestamp: number }> = [];

    this.sessions.forEach((session) => {
      session.sectionLoadEvents.forEach((event) => {
        events.push({ type: 'load', event, timestamp: session.startedAtMs });
      });
      session.retryActionEvents.forEach((event) => {
        events.push({ type: 'retry', event, timestamp: event.timestamp });
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  private async persistSessions(): Promise<void> {
    try {
      const sessionsData = this.sessions.map((s) => ({
        ...s,
        errorDistribution: Object.fromEntries(s.errorDistribution),
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsData));
    } catch (error) {
      console.error('[analytics] failed to persist sessions', error);
    }
  }

  async clearSessions(): Promise<void> {
    this.sessions = [];
    this.currentSession = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[analytics] cleared all sessions');
  }
}

export default ResultScreenAnalytics;
