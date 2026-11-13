import crypto from "node:crypto";

export function verifyWebhookSignature(rawBody, signatureHex, secret) {
  if (typeof rawBody !== "string" || typeof signatureHex !== "string" || !secret) {
    return false;
  }
  const expectedHex = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const actualBuf = Buffer.from(signatureHex, "hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function createRateLimiter({ capacity, refillTokens, refillIntervalMs }) {
  const buckets = new Map();
  return function allowRequest(tenantId, nowMs = Date.now()) {
    let bucket = buckets.get(tenantId);
    if (!bucket) {
      bucket = { tokens: capacity, lastRefillMs: nowMs };
      buckets.set(tenantId, bucket);
    }
    const elapsedMs = Math.max(0, nowMs - bucket.lastRefillMs);
    const intervals = Math.floor(elapsedMs / refillIntervalMs);
    const added = intervals * refillTokens;
    bucket.tokens = Math.min(capacity, bucket.tokens + added);
    bucket.lastRefillMs = nowMs;
    if (bucket.tokens < 1) {
      return false;
    }
    bucket.tokens -= 1;
    return true;
  };
}

export function buildWorkerEnvelope(rawBody, signatureHex, secret, idempotencyKey, nowMs = Date.now()) {
  if (!verifyWebhookSignature(rawBody, signatureHex, secret)) {
    return { accepted: false, reason: "INVALID_SIGNATURE" };
  }
  const parsed = JSON.parse(rawBody);
  return {
    accepted: true,
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": idempotencyKey
    },
    event: {
      schemaVersion: "2.0",
      tenantId: parsed.tenantId,
      eventType: parsed.eventType,
      timestampMs: parsed.timestampMs ?? nowMs,
      payload: parsed.data ?? {}
    }
  };
}
