import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { processWorkerEnvelope } from "./worker.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wk-"));
const ledgerPath = path.join(tmp, "ledger.json");
const config = { maxSkewSeconds: 300, retry: { maxRetries: 2, baseDelayMs: 10 } };

const res = await processWorkerEnvelope(
  {
    headers: { "x-request-id": "req-1" },
    event: { schemaVersion: "1.0", tenantId: "t1", eventType: "invoice.paid", timestampMs: 5000, payload: {} }
  },
  config,
  async () => ({ ok: true }),
  ledgerPath,
  5100
);
assert.equal(res.status, "PROCESSED");
fs.rmSync(tmp, { recursive: true, force: true });
console.log("worker happy-path tests passed");
