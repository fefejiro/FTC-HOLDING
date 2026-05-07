import { axiomTransport, createLogger } from "@ftc/logger";

type LogMeta = Record<string, unknown> | undefined;
const MAX_REQUEST_ID_LENGTH = 120;

const axiomToken = process.env.AXIOM_TOKEN || "";
const axiomDataset = process.env.AXIOM_DATASET_FTC_SITE || process.env.AXIOM_DATASET || "";

const serviceLogger = createLogger("ftc-site", {
  context: { source: "ftc-site" },
  transports: axiomToken && axiomDataset ? [axiomTransport({ token: axiomToken, dataset: axiomDataset })] : [],
});

function write(level: "info" | "warn" | "error", event: string, meta?: LogMeta) {
  const suppliedRequestId = typeof meta?.requestId === "string" ? meta.requestId.trim() : "";
  const requestId =
    suppliedRequestId
      ? suppliedRequestId.slice(0, MAX_REQUEST_ID_LENGTH)
      : crypto.randomUUID();
  const payload = { event, requestId, ...(meta ?? {}) };
  if (level === "error") {
    serviceLogger.error(event, payload);
    return;
  }
  if (level === "warn") {
    serviceLogger.warn(event, payload);
    return;
  }
  serviceLogger.info(event, payload);
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
