#!/usr/bin/env node
// Offline consistency check for the Teamwork vs. Agy-Squad benchmark package:
// 1. Runs both fixture happy-path unit suites (test-gateway.mjs, test-worker.mjs).
// 2. Reproduces all 6 seeded defects in-process.
// 3. Compiles Stage 1 (all_l1) and Stage 2 (ab_audit) from manifest.json.
// 4. Verifies telemetry.json per-agent sums, rubric mappings, and provenance fields.
// (Does not launch live Antigravity subagents or replay session transcripts.)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleDispatchSquad } from "../../mcp/dispatch.mjs";
import { verifyWebhookSignature, createRateLimiter, buildWorkerEnvelope } from "./fixture/gateway/gateway.mjs";
import { appendLedgerEntry, readLedger } from "./fixture/worker/ledger.mjs";
import { processWorkerEnvelope } from "./fixture/worker/worker.mjs";

const benchDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(benchDir, "../..");

for (const rel of ["fixture/gateway/test-gateway.mjs", "fixture/worker/test-worker.mjs"]) {
  const res = spawnSync(process.execPath, [path.join(benchDir, rel)], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr || res.stdout);
}

// Verify all 6 planted defects are live and reproducible on the fixture
assert.throws(() => verifyWebhookSignature("{}", "aa", "s3cr3t"), RangeError);

const limiter = createRateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 1000 });
assert.equal(limiter("tenant-1", 0), true);
assert.equal(limiter("tenant-1", 600), false);
assert.equal(limiter("tenant-1", 1200), false);

const config = JSON.parse(fs.readFileSync(path.join(benchDir, "fixture/config.json"), "utf8"));
const body = JSON.stringify({ tenantId: "t1", eventType: "invoice.paid", timestampMs: 1000, data: {} });
const validSig = (await import("node:crypto")).default.createHmac("sha256", "s3cr3t").update(body, "utf8").digest("hex");
const env = buildWorkerEnvelope(body, validSig, "s3cr3t", "idem-1", 1000);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ab-verify-"));
try {
  const ledgerPath = path.join(tmp, "ledger.json");
  const missingReqId = await processWorkerEnvelope(env, config, async () => ({}), ledgerPath, 1000);
  assert.equal(missingReqId.reason, "MISSING_REQUEST_ID");

  const schemaMismatch = await processWorkerEnvelope(
    { headers: { "x-request-id": "r1" }, event: env.event },
    config,
    async () => ({}),
    ledgerPath,
    1000
  );
  assert.equal(schemaMismatch.reason, "UNSUPPORTED_SCHEMA");

  const unitMismatch = await processWorkerEnvelope(
    { headers: { "x-request-id": "r1" }, event: { ...env.event, schemaVersion: "1.0", timestampMs: 1000 } },
    config,
    async () => ({}),
    ledgerPath,
    1500
  );
  assert.equal(unitMismatch.reason, "STALE_EVENT");

  let calls = 0;
  const offByOneRetry = await processWorkerEnvelope(
    { headers: { "x-request-id": "r1" }, event: { ...env.event, schemaVersion: "1.0", timestampMs: 1000 } },
    config,
    async () => {
      calls += 1;
      throw new Error("transient");
    },
    ledgerPath,
    1100
  );
  assert.equal(offByOneRetry.status, "FAILED");
  assert.equal(calls, 1);

  // N6 planted defect: corrupt ledger is overwritten, prior entry lost
  appendLedgerEntry(ledgerPath, { requestId: "r-prior", tenantId: "t1", output: { ok: 1 } });
  assert.equal(readLedger(ledgerPath).length, 1);
  fs.writeFileSync(ledgerPath, "{corrupt-json");
  const expectFixed = process.argv.includes("--expect-fixed") || process.env.AGY_BENCHMARK_EXPECT_FIXED === "1";
  const verifyFixedLedgerGuard = (appendFn, targetPath) => {
    let threw = false;
    let res;
    try {
      res = appendFn(targetPath, { requestId: "r-new", tenantId: "t1", output: { ok: 2 } });
    } catch {
      threw = true;
    }
    const backedUp = fs.existsSync(targetPath + ".corrupt");
    assert.ok(threw || backedUp, "Fixed appendLedgerEntry must throw on corrupt JSON or preserve ledger.json.corrupt");
    if (backedUp) {
      assert.equal(fs.readFileSync(targetPath + ".corrupt", "utf8"), "{corrupt-json", "Backup must hold the original bytes");
      if (!threw) {
        assert.deepEqual(res, { duplicate: false, count: 1 });
        assert.deepEqual(JSON.parse(fs.readFileSync(targetPath, "utf8")), [
          { requestId: "r-new", tenantId: "t1", output: { ok: 2 } }
        ]);
      }
    } else {
      assert.notEqual(res?.count, 1, "Fixed appendLedgerEntry must not silently return { count: 1 } without backup");
    }
  };
  if (expectFixed) {
    verifyFixedLedgerGuard(appendLedgerEntry, ledgerPath);
  } else {
    assert.deepEqual(readLedger(ledgerPath), []);
    const overwriteRes = appendLedgerEntry(ledgerPath, { requestId: "r-new", tenantId: "t1", output: { ok: 2 } });
    assert.deepEqual(overwriteRes, { duplicate: false, count: 1 });
    assert.deepEqual(JSON.parse(fs.readFileSync(ledgerPath, "utf8")), [
      { requestId: "r-new", tenantId: "t1", output: { ok: 2 } }
    ]);
    // Also verify the fixed-mode grading check against both throw-and-backup and backup-and-continue reference fixes
    const fixedLedgerPath = path.join(tmp, "ledger-fixed.json");
    fs.writeFileSync(fixedLedgerPath, "{corrupt-json");
    verifyFixedLedgerGuard((p, entry) => {
      try {
        JSON.parse(fs.readFileSync(p, "utf8"));
      } catch (err) {
        fs.copyFileSync(p, p + ".corrupt");
        throw err;
      }
      return appendLedgerEntry(p, entry);
    }, fixedLedgerPath);
    assert.equal(fs.existsSync(fixedLedgerPath + ".corrupt"), true);

    const fixedContinuePath = path.join(tmp, "ledger-fixed-continue.json");
    fs.writeFileSync(fixedContinuePath, "{corrupt-json");
    verifyFixedLedgerGuard((p, entry) => {
      try {
        JSON.parse(fs.readFileSync(p, "utf8"));
      } catch {
        fs.renameSync(p, p + ".corrupt");
      }
      return appendLedgerEntry(p, entry);
    }, fixedContinuePath);
    assert.equal(fs.readFileSync(fixedContinuePath + ".corrupt", "utf8"), "{corrupt-json");
    assert.deepEqual(JSON.parse(fs.readFileSync(fixedContinuePath, "utf8")), [
      { requestId: "r-new", tenantId: "t1", output: { ok: 2 } }
    ]);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Verify manifest compilation at Stage 1 (all_l1) and Stage 2 (ab_audit)
const manifestPath = "benchmarks/teamwork-vs-squad/manifest.json";
const stage1 = handleDispatchSquad({ squadId: "all_l1", manifestPath }, repoRoot);
assert.equal(Boolean(stage1.isError), false);
assert.equal(JSON.parse(stage1.content[0].text).Subagents.length, 1);

const stage2 = handleDispatchSquad({ squadId: "ab_audit", manifestPath }, repoRoot);
assert.equal(Boolean(stage2.isError), false);
assert.equal(JSON.parse(stage2.content[0].text).Subagents.length, 2);

// Verify recorded telemetry ledger integrity, adjudication rubric, and provenance metadata
const telemetry = JSON.parse(fs.readFileSync(path.join(benchDir, "results/telemetry.json"), "utf8"));
assert.equal(typeof telemetry.studyType, "string");
assert.ok(telemetry.studyType.length > 0);
assert.equal(typeof telemetry.environment?.agyContextSaver, "string");
assert.equal(typeof telemetry.promptsAndConfiguration?.taskObjective, "string");
assert.equal(typeof telemetry.provenancePolicy?.conversationIds, "string");
assert.equal(telemetry.fixture.plantedNeedles.length, 6);
for (const needle of telemetry.fixture.plantedNeedles) {
  assert.ok(needle.agySquadFindingId);
  assert.ok(needle.teamworkFindingId);
  assert.ok(needle.adjudicationCriteria);
}
for (const arm of [telemetry.arms.agySquad, telemetry.arms.teamworkControl]) {
  assert.equal(arm.agents.length, arm.subagentsSpawned);
  assert.equal(arm.agents.reduce((s, a) => s + a.steps, 0), arm.totalSteps);
  assert.equal(arm.agents.reduce((s, a) => s + a.turns, 0), arm.totalAssistantTurns);
  assert.equal(arm.agents.reduce((s, a) => s + a.toolCalls, 0), arm.totalToolCalls);
  assert.equal(Number(arm.agents.reduce((s, a) => s + a.transcriptKb, 0).toFixed(1)), arm.totalTranscriptKb);
  assert.equal(arm.needlesCaught, 6);
}

console.log("✓ Offline benchmark check passed (fixture suites, 6 seeded defects, manifest stages, and telemetry ledger arithmetic).");
