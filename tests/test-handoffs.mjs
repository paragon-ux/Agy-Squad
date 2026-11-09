import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { bundleReports, fingerprint, inspectHandoffs, messageLimit, pruneReports, reportPath, verifyBundle } from "../mcp/handoffs.mjs";

const handoffsCli = fileURLToPath(new URL("../mcp/handoffs.mjs", import.meta.url));

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-handoffs-")));
const squadId = "trial-a";
const first = reportPath(squadId, 1);
const second = reportPath(squadId, 2);
const lead = reportPath(squadId);
const bundle = lead.replace(/\.md$/, ".sources.json");
const firstEvidence = "# Observation\r\nRead fixture.txt, line 1. Observed ALPHA-é.\r\n";
const secondEvidence = "# Observation\nCommand: compare fixture.txt\nExit: 0\nOutput: ALPHA-é\n";
const firstHandoff = { sender: "native-alpha", message: `READY ${first} — Saw ALPHA-é.` };
const secondHandoff = { sender: "native-beta", message: `READY ${second} — Command returned ALPHA-é.` };
const record = {
  workspace: root, squadId,
  assignments: [
    { conversationId: firstHandoff.sender, report: first },
    { conversationId: secondHandoff.sender, report: second }
  ],
  handoffs: [firstHandoff, secondHandoff, firstHandoff],
  verdict: "PASS"
};
const exists = file => fs.existsSync(path.join(root, file));
const write = (file, value) => {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, value);
};

try {
  write(first, firstEvidence);
  write(second, secondEvidence);
  write(lead, "PASS after independent inspection of fixture.txt.");
  write("fixture.txt", "ALPHA-é");
  record.verifiedFiles = fingerprint(root, ["fixture.txt"]);
  const inspect = (...handoffs) => inspectHandoffs(root, { ...record, handoffs }).map(({ status }) => status);
  assert.deepEqual(inspect(firstHandoff, secondHandoff, firstHandoff), ["READY", "READY"]);
  assert.deepEqual(inspect(firstHandoff), ["READY", "PENDING"]);
  assert.deepEqual(inspect({ ...firstHandoff, message: `PARTIAL ${first} — Awaiting approval.` }), ["PARTIAL", "PENDING"]);
  assert.deepEqual(inspect({ ...firstHandoff, message: "NO_REPORT — Slot unavailable." }), ["NO_REPORT", "PENDING"]);
  assert.throws(() => inspect({ ...firstHandoff, sender: "previous-attempt" }), /outside the recorded cohort/);
  assert.throws(() => inspect({ ...firstHandoff, message: `READY ${second} — Wrong slot.` }), /assigned report/);
  assert.throws(() => inspect({ ...firstHandoff, message: `READY ${first} —   ` }), /observation/);
  assert.throws(() => inspect(firstHandoff, { ...firstHandoff, message: firstHandoff.message + " Changed." }), /Conflicting/);
  const prefix = `READY ${first} — `;
  const exact = prefix + "é".repeat(Math.floor((messageLimit - Buffer.byteLength(prefix)) / 2));
  const padded = exact.padEnd(exact.length + messageLimit - Buffer.byteLength(exact), "x");
  assert.deepEqual(inspect({ ...firstHandoff, message: padded }), ["READY", "PENDING"]);
  assert.throws(() => inspect({ ...firstHandoff, message: padded + "x" }), /500 UTF-8 bytes/);
  assert.throws(() => inspectHandoffs(root, { ...record, workspace: "/elsewhere" }), /shared workspace/);

  fs.unlinkSync(path.join(root, second));
  assert.throws(() => bundleReports(root, record), /ENOENT/);
  write(second, " \n");
  assert.throws(() => bundleReports(root, record), /Empty evidence/);
  write(second, secondEvidence);
  assert.throws(() => bundleReports(root, { ...record, handoffs: [firstHandoff] }), /each recorded specialist/);

  // A green characterization test alone cannot qualify the cohort for cleanup.
  write("observed.json", "{}");
  const observed = JSON.parse(fs.readFileSync(path.join(root, "observed.json"), "utf8"));
  assert.deepEqual(observed, {}, "A producer's test can pass while demonstrating data loss");
  const verifiedVerdict = isDeepStrictEqual(observed, { preserved: [1, 2, 3] }) ? "PASS" : "FAIL";
  assert.throws(() => bundleReports(root, { ...record, verdict: verifiedVerdict }), /independently passing/);
  assert.equal(exists(bundle), false);
  write("fixture.txt", "Changed after review");
  assert.throws(() => bundleReports(root, record), /Verified input changed/);
  write("fixture.txt", "ALPHA-é");
  assert.throws(() => bundleReports(root, { ...record, verifiedFiles: ["fixture.txt"] }), /independent verification/);
  assert.throws(() => bundleReports(root, { ...record, verifiedFiles: { ...record.verifiedFiles, [lead]: "0".repeat(64) } }), /final work inputs/);
  for (const invalidLead of [
    "FAIL: output differs from expected.",
    "1. FAIL: output differs from expected.",
    "Output check — FAIL: output differs from expected.",
    "NOT PASS: validation failed.",
    "Verdict: not PASS",
    "no PASS: check failed.",
    "- **Verdict:** **FAIL**",
    "Verdict: PASS\n- **Verdict:** **FAIL**",
    "Verdict: BLOCKED — missing required fixture.",
    "BLOCKED: missing upstream schema.",
    "Verdict: PASS\nSecondary check: FAIL.",
    "Verdict: PASS\n1. FAIL: output differs from expected.",
    "Completed checks without recording a verdict token.",
    "Pass the arguments to the function without a verdict token.",
    "Verdict: PASS\n\n| Gate | Verdict |\n| --- | --- |\n| Security | FAIL |\n\nOverall verdict is FAIL."
  ]) {
    write(lead, invalidLead);
    assert.throws(() => bundleReports(root, record), /unambiguous PASS verdict/);
    assert.equal(exists(bundle), false);
  }
  write(
    lead,
    "Verdict: PASS\nSummary: blocked symlinks, result is fail-safe, and status: fail-fast were checked.\n~~~\nVerdict: FAIL\n~~~\nVerified that `FAIL` and `` `FAIL` `` inside CommonMark code spans do not reject synthesis."
  );

  const initialBundle = bundleReports(root, record);
  write(lead, "PASS after independent inspection and recheck of fixture.txt.");
  const accepted = bundleReports(root, record);
  assert.notEqual(accepted.sha256, initialBundle.sha256);
  assert.deepEqual(bundleReports(root, record), accepted);
  write(lead, "FAIL: synthesis changed after bundling.");
  assert.throws(() => verifyBundle(root, bundle), /unambiguous PASS verdict/);
  assert.throws(() => pruneReports(root, bundle, accepted.sha256), /unambiguous PASS verdict/);
  write(lead, "PASS after independent inspection and recheck of fixture.txt.");
  assert.ok(exists(first) && exists(second));
  assert.throws(() => pruneReports(root, bundle), /accepted bundle digest/);
  assert.throws(() => pruneReports(root, bundle, "0".repeat(64)), /accepted digest/);
  assert.throws(() => verifyBundle(root, "../outside.json"), /workspace-relative/);
  write("fixture.txt", "Changed after primary acceptance");
  assert.throws(() => pruneReports(root, bundle, accepted.sha256), /Verified input changed/);
  assert.ok(exists(first) && exists(second));
  write("fixture.txt", "ALPHA-é");
  write(second, "Report changed after review");
  assert.throws(() => pruneReports(root, bundle, accepted.sha256), /report changed/);
  assert.ok(exists(first) && exists(second));
  fs.unlinkSync(path.join(root, second));
  fs.symlinkSync(path.join(root, "fixture.txt"), path.join(root, second));
  assert.throws(() => pruneReports(root, bundle, accepted.sha256), /ELOOP/);
  assert.ok(exists(first) && exists(second));
  fs.unlinkSync(path.join(root, second));
  write(second, secondEvidence);

  // Simulate interruption after the first unlink, then retry the accepted cleanup.
  fs.unlinkSync(path.join(root, first));
  assert.deepEqual(pruneReports(root, bundle, accepted.sha256), { removed: [second] });
  assert.deepEqual(pruneReports(root, bundle, accepted.sha256), { removed: [] });
  assert.deepEqual(verifyBundle(root, bundle), accepted);
  const archived = JSON.parse(fs.readFileSync(path.join(root, bundle), "utf8"));
  assert.equal(archived.verdict, "PASS");
  assert.deepEqual(archived.reports.map(report => report.markdown), [firstEvidence, secondEvidence]);
  // Verify B2: legacy bundle without verdict field still verifies when synthesis is PASS, and rejects explicit non-PASS verdict
  const { verdict: _omittedVerdict, ...legacyBundleObj } = archived;
  write(bundle, JSON.stringify(legacyBundleObj, null, 2) + "\n");
  assert.equal(verifyBundle(root, bundle).path, bundle);
  write(bundle, JSON.stringify({ ...legacyBundleObj, verdict: "FAIL" }, null, 2) + "\n");
  assert.throws(() => verifyBundle(root, bundle), /independently verified PASS verdict/);
  write(bundle, JSON.stringify(archived, null, 2) + "\n");
  assert.ok(exists(lead) && exists("fixture.txt"));
  const cliVerify = spawnSync(process.execPath, [handoffsCli, "verify", bundle], { cwd: root, encoding: "utf8" });
  assert.equal(cliVerify.status, 0, cliVerify.stderr);
  assert.deepEqual(JSON.parse(cliVerify.stdout), accepted);
  const symlinkCli = path.join(root, "handoffs-link.mjs");
  fs.symlinkSync(handoffsCli, symlinkCli);
  const cliViaSymlink = spawnSync(process.execPath, [symlinkCli, "verify", bundle], { cwd: root, encoding: "utf8" });
  assert.equal(cliViaSymlink.status, 0, cliViaSymlink.stderr);
  assert.deepEqual(JSON.parse(cliViaSymlink.stdout), accepted);
  fs.unlinkSync(symlinkCli);
  assert.throws(() => verifyBundle(root, "scratch\\agy-squad\\bundle.json"), /workspace-relative/);

  // Verify managed-run slot bundling, CLI fingerprint/inspect/bundle/prune, and multiline handoff rejection.
  assert.throws(() => inspectHandoffs(root, {
    workspace: root,
    assignments: [{ conversationId: "child-1", report: first }],
    handoffs: [{ sender: "child-1", message: `READY ${first} — line one\nline two` }]
  }), /one line within 500 UTF-8 bytes/);
  assert.throws(() => inspectHandoffs(root, {
    workspace: root,
    assignments: [{ conversationId: "child-1", report: first }],
    handoffs: [{ sender: "child-1", message: `NO_REPORT — line one\u2028line two` }]
  }), /one line within 500 UTF-8 bytes/);
  assert.throws(() => reportPath("alpha", -1), /positive integer/);
  const managedRoot = "scratch/agy-squad/run-00000000-0000-4000-8000-000000000000/plan-000000000000000000000000";
  const mFirst = reportPath("alpha", 1, managedRoot);
  const mLead = reportPath("alpha", undefined, managedRoot);
  write(mFirst, "Managed specialist evidence.\n");
  write(mLead, "Verdict: PASS\nManaged lead synthesis.\n");
  const mRecordPath = path.join(root, "managed-record.json");
  fs.writeFileSync(mRecordPath, JSON.stringify({
    workspace: root,
    squadId: "alpha",
    verdict: "PASS",
    verifiedFiles: fingerprint(root, ["fixture.txt"]),
    assignments: [{ conversationId: "m-1", report: mFirst }],
    handoffs: [{ sender: "m-1", message: `READY ${mFirst} — Managed specialist verified.` }]
  }));
  const cliInspect = spawnSync(process.execPath, [handoffsCli, "inspect", "managed-record.json"], { cwd: root, encoding: "utf8" });
  assert.equal(cliInspect.status, 0, cliInspect.stderr);
  const cliBundle = spawnSync(process.execPath, [handoffsCli, "bundle", "managed-record.json"], { cwd: root, encoding: "utf8" });
  assert.equal(cliBundle.status, 0, cliBundle.stderr);
  const mBundled = JSON.parse(cliBundle.stdout);
  assert.ok(mBundled.path.startsWith(managedRoot + "/"));
  const cliPrune = spawnSync(process.execPath, [handoffsCli, "prune", mBundled.path, mBundled.sha256], { cwd: root, encoding: "utf8" });
  assert.equal(cliPrune.status, 0, cliPrune.stderr);
  assert.deepEqual(JSON.parse(cliPrune.stdout), { removed: [mFirst] });

  // Verify custom AGY_SQUAD_SCRATCH_ROOT across inspect/bundle/verify/prune (R6-SVC-02).
  const customScratchEnv = { ...process.env, AGY_SQUAD_SCRATCH_ROOT: "custom-scratch/nested" };
  const customRootPrefix = "custom-scratch/nested/agy-squad";
  const cFirst = reportPath("alpha", 1, customRootPrefix);
  const cLead = reportPath("alpha", undefined, customRootPrefix);
  write(cFirst, "Custom scratch specialist evidence.\n");
  write(cLead, "Verdict: PASS\nCustom scratch lead synthesis.\n");
  const cRecordPath = path.join(root, "custom-record.json");
  fs.writeFileSync(cRecordPath, JSON.stringify({
    workspace: root,
    squadId: "alpha",
    verdict: "PASS",
    verifiedFiles: fingerprint(root, ["fixture.txt"]),
    assignments: [{ conversationId: "c-1", report: cFirst }],
    handoffs: [{ sender: "c-1", message: `READY ${cFirst} — Custom scratch specialist verified.` }]
  }));
  const cInspect = spawnSync(process.execPath, [handoffsCli, "inspect", "custom-record.json"], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cInspect.status, 0, cInspect.stderr);
  const cBundle = spawnSync(process.execPath, [handoffsCli, "bundle", "custom-record.json"], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cBundle.status, 0, cBundle.stderr);
  const cBundled = JSON.parse(cBundle.stdout);
  assert.ok(cBundled.path.startsWith(customRootPrefix + "/"));
  const cVerify = spawnSync(process.execPath, [handoffsCli, "verify", cBundled.path], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cVerify.status, 0, cVerify.stderr);
  const cPrune = spawnSync(process.execPath, [handoffsCli, "prune", cBundled.path, cBundled.sha256], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cPrune.status, 0, cPrune.stderr);
  assert.deepEqual(JSON.parse(cPrune.stdout), { removed: [cFirst] });
  console.log("✓ Receipt reconciliation, changed evidence, custom scratch roots, and retryable report cleanup");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
