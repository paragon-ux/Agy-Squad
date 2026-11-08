import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyWebhookSignature, createRateLimiter, buildWorkerEnvelope } from "./gateway.mjs";

const secret = "s3cr3t";
const body = JSON.stringify({ tenantId: "t1", eventType: "invoice.paid", timestampMs: 1700000000000, data: { amount: 42 } });
const sig = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

assert.equal(verifyWebhookSignature(body, sig, secret), true);
const limiter = createRateLimiter({ capacity: 2, refillTokens: 1, refillIntervalMs: 1000 });
assert.equal(limiter("t1", 1000), true);
assert.equal(limiter("t1", 1000), true);
assert.equal(limiter("t1", 1000), false);
assert.equal(limiter("t1", 2000), true);

const env = buildWorkerEnvelope(body, sig, secret, "idem-123", 1700000000000);
assert.equal(env.accepted, true);
assert.equal(env.event.schemaVersion, "2.0");
console.log("gateway happy-path tests passed");
