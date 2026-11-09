import { appendLedgerEntry } from "./ledger.mjs";

export async function processWorkerEnvelope(envelope, config, handler, ledgerPath, nowMs = Date.now()) {
  const requestId = envelope?.headers?.["x-request-id"];
  if (!requestId) {
    return { status: "DEAD_LETTER", reason: "MISSING_REQUEST_ID" };
  }
  const event = envelope.event;
  if (!event || event.schemaVersion !== "1.0") {
    return { status: "DEAD_LETTER", reason: "UNSUPPORTED_SCHEMA" };
  }
  if (Math.abs(nowMs - event.timestampMs) > config.maxSkewSeconds) {
    return { status: "DEAD_LETTER", reason: "STALE_EVENT" };
  }

  const maxRetries = config.retry?.maxRetries ?? 1;
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const output = await handler(event);
      const record = appendLedgerEntry(ledgerPath, { requestId, tenantId: event.tenantId, output });
      return { status: record.duplicate ? "DUPLICATE" : "PROCESSED", attempts: attempt };
    } catch (err) {
      if (attempt >= maxRetries) {
        return { status: "FAILED", attempts: attempt, error: err.message };
      }
    }
  }
}
