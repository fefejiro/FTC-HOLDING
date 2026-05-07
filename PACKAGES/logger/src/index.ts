/**
 * FTC Holding Logger Package
 * Centralized logging utilities for all FTC applications
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export type LogTransport = (entry: LogEntry & { service: string }) => void | Promise<void>;

export interface LoggerOptions {
  context?: Record<string, unknown>;
  transports?: LogTransport[];
}

export interface AxiomTransportOptions {
  token: string;
  dataset: string;
  baseUrl?: string;
}

const DEFAULT_REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(email|phone|password|passcode|secret|token|authorization|cookie|session|payment|card|cvv|cvc|iban|routing|account)/i;

function redactValue(value: unknown, visited = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, visited));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (visited.has(value)) {
    return "[Circular]";
  }
  visited.add(value);

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = DEFAULT_REDACTED_VALUE;
      continue;
    }
    output[key] = redactValue(nestedValue, visited);
  }
  return output;
}

export function redactSensitiveFields(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  return redactValue(context) as Record<string, unknown>;
}

export class Logger {
  private name: string;
  private readonly baseContext: Record<string, unknown>;
  private readonly transports: LogTransport[];

  constructor(name: string, options?: LoggerOptions) {
    this.name = name;
    this.baseContext = options?.context ?? {};
    this.transports = options?.transports ?? [];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const redactedContext = redactSensitiveFields({
      ...this.baseContext,
      ...(context ?? {}),
    });

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: redactedContext,
    };

    const payload = {
      service: this.name,
      ...entry,
    };

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(payload));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(payload));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(payload));
        break;
      case LogLevel.ERROR:
        console.error(JSON.stringify(payload));
        break;
    }

    for (const transport of this.transports) {
      Promise.resolve(transport(payload)).catch(() => {
        // Keep application flow safe if transport fails.
      });
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }
}

export function axiomTransport(options: AxiomTransportOptions): LogTransport {
  const token = options.token.trim();
  const dataset = options.dataset.trim();
  const baseUrl = (options.baseUrl || "https://api.axiom.co").replace(/\/+$/, "");

  return async (entry) => {
    if (!token || !dataset) return;

    const fetchFn = (globalThis as unknown as {
      fetch?: (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
        ok: boolean;
      }>;
    }).fetch;

    if (!fetchFn) return;

    await fetchFn(`${baseUrl}/v1/datasets/${encodeURIComponent(dataset)}/ingest`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([entry]),
    });
  };
}

export function createLogger(name: string, options?: LoggerOptions): Logger {
  return new Logger(name, options);
}

export default { Logger, createLogger, LogLevel, axiomTransport, redactSensitiveFields };
