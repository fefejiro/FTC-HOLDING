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
  timestamp: Date;
  context?: Record<string, unknown>;
}

export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    const prefix = `[${entry.timestamp.toISOString()}] [${this.name}] [${level.toUpperCase()}]`;
    const ctx = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}${ctx}`);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${message}${ctx}`);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}${ctx}`);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}${ctx}`);
        break;
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

export function createLogger(name: string): Logger {
  return new Logger(name);
}

export default { Logger, createLogger, LogLevel };
