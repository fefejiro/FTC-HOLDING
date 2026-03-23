type LogMeta = Record<string, unknown> | undefined;

function write(level: "info" | "warn" | "error", event: string, meta?: LogMeta) {
  const payload = {
    source: "ftc-site",
    event,
    ...(meta ?? {})
  };

  const loggerFn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;

  loggerFn(`[ftc-site] ${event}`, payload);
}

export const logger = {
  info(event: string, meta?: LogMeta) {
    write("info", event, meta);
  },
  warn(event: string, meta?: LogMeta) {
    write("warn", event, meta);
  },
  error(event: string, meta?: LogMeta) {
    write("error", event, meta);
  }
};
