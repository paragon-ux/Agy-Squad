import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { buildBundleRecordInit, bundleReports, collectReportSlots, computeEvidenceDigest, ensureDirectory, fingerprint, inspectHandoffs, messageLimit, normalizeReportRoot, pruneReports, publish, readFile, readOpenedFileWithStat, readRegularFileSafe, reportPath, verifyAndPruneBundle, verifyBundle } from "../mcp/handoffs.mjs";

const handoffsCli = fileURLToPath(new URL("../mcp/handoffs.mjs", import.meta.url));
const agySquadCli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));

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
  requireIntegrityAudit: false,
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
  write(lead, "Verdict: PASS\nPASS after independent inspection of fixture.txt.");
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
    "Verdict: PASS\nSummary: blocked symlinks, the endpoint does not pass invalid events, result is fail-safe, and status: fail-fast were checked.\n~~~\nVerdict: FAIL\n~~~\nVerified that `FAIL` and `` `FAIL` `` inside CommonMark code spans do not reject synthesis."
  );

  const initialBundle = bundleReports(root, record);
  write(lead, "Verdict: PASS\nPASS after independent inspection and recheck of fixture.txt.");
  const accepted = bundleReports(root, { ...record, replaceExisting: true });
  assert.notEqual(accepted.sha256, initialBundle.sha256);
  assert.deepEqual(bundleReports(root, record), accepted);

  // Phase 2 Integrity Audit Acceptance Gate tests (P1L-CODE-06, P1L-CODE-07, P1L-CODE-14):
  const { requireIntegrityAudit: _omittedAudit, ...defaultRecord } = record;
  // 1. Default bundleReports requires integrity audit when requireIntegrityAudit is omitted
  assert.throws(
    () => bundleReports(root, defaultRecord),
    /Acceptance blocked: Mandatory integrity audit report missing/
  );

  // 2. Stale squad-adversarial_review on disk is NOT auto-discovered
  const advLeadSlot = reportPath("adversarial_review", undefined);
  write(advLeadSlot, "Verdict: FAIL\nStale legacy adversarial report should be ignored.");
  assert.throws(
    () => bundleReports(root, defaultRecord),
    /Acceptance blocked: Mandatory integrity audit report missing/
  );
  const unauditedBundle = bundleReports(root, record);
  const unauditedParsed = JSON.parse(fs.readFileSync(path.join(root, unauditedBundle.path), "utf8"));
  assert.equal(unauditedParsed.adversarialReview, undefined);
  fs.unlinkSync(path.join(root, advLeadSlot));

  // 3. Valid integrity audit unblocks default bundleReports, and tampering fails verifyBundle
  const intAuditSlot = reportPath(`integrity_auditor-${squadId}`, 1);
  const intDigest = computeEvidenceDigest(root, defaultRecord).evidenceDigest;
  write(intAuditSlot, `Target Squad: ${squadId}\nEvidence Digest: ${intDigest}\nIntegrity Verdict: CLEAN\nVerified empirical execution.\n`);
  const intAcceptedBundle = bundleReports(root, { ...defaultRecord, replaceExisting: true });
  assert.ok(intAcceptedBundle.sha256);
  const bundledWithInt = JSON.parse(fs.readFileSync(path.join(root, bundle), "utf8"));
  assert.equal(bundledWithInt.integrityAudit.path, intAuditSlot);
  assert.equal(bundledWithInt.auditPolicy, "required");
  assert.equal(verifyBundle(root, bundle).path, bundle);

  write(intAuditSlot, `Target Squad: ${squadId}\nEvidence Digest: ${intDigest}\nIntegrity Verdict: CLEAN\nTampered after bundling.`);
  assert.throws(() => verifyBundle(root, bundle), /Integrity audit report changed/);

  // Clean up integrity slot for remaining baseline tests
  fs.unlinkSync(path.join(root, intAuditSlot));
  bundleReports(root, { ...record, replaceExisting: true });
  write(lead, "FAIL: synthesis changed after bundling.");
  assert.throws(() => verifyBundle(root, bundle), /unambiguous PASS verdict/);
  assert.throws(() => pruneReports(root, bundle, accepted.sha256), /unambiguous PASS verdict/);
  write(lead, "Verdict: PASS\nPASS after independent inspection and recheck of fixture.txt.");
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
  let reportSymlinkCreated = false;
  try {
    fs.symlinkSync(path.join(root, "fixture.txt"), path.join(root, second), "file");
    reportSymlinkCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (reportSymlinkCreated) {
    assert.throws(() => pruneReports(root, bundle, accepted.sha256), /ELOOP/);
    assert.ok(exists(first) && exists(second));
    fs.unlinkSync(path.join(root, second));
  }
  write(second, secondEvidence);

  // Simulate interruption after the first unlink, then retry the accepted cleanup.
  fs.unlinkSync(path.join(root, first));
  assert.deepEqual(pruneReports(root, bundle, accepted.sha256), { removed: [second] });
  assert.deepEqual(pruneReports(root, bundle, accepted.sha256), { removed: [] });
  assert.deepEqual(verifyBundle(root, bundle), accepted);
  const archived = JSON.parse(fs.readFileSync(path.join(root, bundle), "utf8"));
  assert.equal(archived.verdict, "PASS");
  assert.deepEqual(archived.reports.map(report => report.markdown), [firstEvidence, secondEvidence]);
  // Verify B2: legacy bundle without verdict field still verifies when synthesis is PASS, and rejects explicit non-PASS or null verdict
  const { verdict: _omittedVerdict, ...legacyBundleObj } = archived;
  write(bundle, JSON.stringify(legacyBundleObj, null, 2) + "\n");
  assert.equal(verifyBundle(root, bundle).path, bundle);
  write(bundle, JSON.stringify({ ...legacyBundleObj, verdict: "FAIL" }, null, 2) + "\n");
  assert.throws(() => verifyBundle(root, bundle), /independently verified PASS verdict/);
  write(bundle, JSON.stringify({ ...legacyBundleObj, verdict: null }, null, 2) + "\n");
  assert.throws(() => verifyBundle(root, bundle), /independently verified PASS verdict/);
  write(bundle, JSON.stringify(archived, null, 2) + "\n");
  assert.ok(exists(lead) && exists("fixture.txt"));
  // mcp/handoffs.mjs standalone CLI was removed (bin/agy-squad.mjs is the single canonical CLI)
  const libDirect = spawnSync(process.execPath, [handoffsCli, "verify", bundle], { cwd: root, encoding: "utf8" });
  assert.equal(libDirect.status, 0, libDirect.stderr);
  assert.equal(libDirect.stdout, "");

  const cliVerify = spawnSync(process.execPath, [agySquadCli, "verify", bundle], { cwd: root, encoding: "utf8" });
  assert.equal(cliVerify.status, 0, cliVerify.stderr);
  assert.deepEqual(JSON.parse(cliVerify.stdout), accepted);
  const symlinkCli = path.join(root, "agy-squad-link.mjs");
  let cliSymlinkCreated = false;
  try {
    fs.symlinkSync(agySquadCli, symlinkCli, "file");
    cliSymlinkCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (cliSymlinkCreated) {
    const cliViaSymlink = spawnSync(process.execPath, [symlinkCli, "verify", bundle], { cwd: root, encoding: "utf8" });
    assert.equal(cliViaSymlink.status, 0, cliViaSymlink.stderr);
    assert.deepEqual(JSON.parse(cliViaSymlink.stdout), accepted);
    fs.unlinkSync(symlinkCli);
  }
  assert.throws(() => verifyBundle(root, "scratch\\agy-squad\\bundle.json"), /workspace-relative/);

  // Verify custom reportRoot slot bundling (F-02), CLI fingerprint/inspect/bundle/prune, and multiline handoff rejection.
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
  const cohortRoot = "custom-reports/cohort-alpha";
  const mFirst = reportPath("alpha", 1, cohortRoot);
  const mLead = reportPath("alpha", undefined, cohortRoot);
  write(mFirst, "Cohort specialist evidence.\n");
  write(mLead, "Verdict: PASS\nCohort lead synthesis.\n");
  const mRecordPath = path.join(root, "cohort-record.json");
  fs.writeFileSync(mRecordPath, JSON.stringify({
    workspace: root,
    reportRoot: cohortRoot,
    squadId: "alpha",
    verdict: "PASS",
    verifiedFiles: fingerprint(root, ["fixture.txt"]),
    assignments: [{ conversationId: "m-1", report: mFirst }],
    handoffs: [{ sender: "m-1", message: `READY ${mFirst} — Cohort specialist verified.` }]
  }));
  const cliInspect = spawnSync(process.execPath, [agySquadCli, "inspect", "cohort-record.json"], { cwd: root, encoding: "utf8" });
  assert.equal(cliInspect.status, 0, cliInspect.stderr);
  assert.equal(JSON.parse(cliInspect.stdout)[0].status, "READY");
  const cliBundleBlocked = spawnSync(process.execPath, [agySquadCli, "bundle", "cohort-record.json"], { cwd: root, encoding: "utf8" });
  assert.notEqual(cliBundleBlocked.status, 0);
  const cliBundle = spawnSync(process.execPath, [agySquadCli, "bundle", "cohort-record.json", "--allow-unaudited"], { cwd: root, encoding: "utf8" });
  assert.equal(cliBundle.status, 0, cliBundle.stderr);
  const mBundled = JSON.parse(cliBundle.stdout);
  assert.ok(mBundled.path.startsWith(cohortRoot + "/"));
  const cliPrune = spawnSync(process.execPath, [agySquadCli, "prune", mBundled.path, mBundled.sha256], { cwd: root, encoding: "utf8" });
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
  const cInspect = spawnSync(process.execPath, [agySquadCli, "inspect", "custom-record.json"], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cInspect.status, 0, cInspect.stderr);
  const cBundle = spawnSync(process.execPath, [agySquadCli, "bundle", "custom-record.json", "--allow-unaudited"], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cBundle.status, 0, cBundle.stderr);
  const cBundled = JSON.parse(cBundle.stdout);
  assert.ok(cBundled.path.startsWith(customRootPrefix + "/"));
  const cVerify = spawnSync(process.execPath, [agySquadCli, "verify", cBundled.path], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cVerify.status, 0, cVerify.stderr);
  const cPrune = spawnSync(process.execPath, [agySquadCli, "prune", cBundled.path, cBundled.sha256], { cwd: root, env: customScratchEnv, encoding: "utf8" });
  assert.equal(cPrune.status, 0, cPrune.stderr);
  assert.deepEqual(JSON.parse(cPrune.stdout), { removed: [cFirst] });

  // Verify SVC-NEW-03: READY and PARTIAL receipts with spaces and " — " separator in reportRoot
  const spacedRoot = "scratch files/nested/agy-squad";
  const spacedReport = reportPath("alpha", 1, spacedRoot);
  write(spacedReport, "# Evidence\nObserved result.\n");
  const spacedRecord = {
    workspace: root,
    reportRoot: spacedRoot,
    assignments: [{ conversationId: "space-child", report: spacedReport }],
    handoffs: [
      {
        sender: "space-child",
        message: `READY ${spacedReport} — Completed verification.`
      }
    ]
  };
  assert.equal(inspectHandoffs(root, spacedRecord)[0].status, "READY");
  assert.equal(
    inspectHandoffs(root, {
      ...spacedRecord,
      handoffs: [{ sender: "space-child", message: `PARTIAL ${spacedReport} — Waiting for approval.` }]
    })[0].status,
    "PARTIAL"
  );

  const dashRoot = "scratch — files/nested/agy-squad";
  const dashReport = reportPath("alpha", 1, dashRoot);
  write(dashReport, "# Evidence\nObserved dash-path result.\n");
  const dashRecord = {
    workspace: root,
    reportRoot: dashRoot,
    assignments: [{ conversationId: "dash-child", report: dashReport }],
    handoffs: [
      {
        sender: "dash-child",
        message: `READY ${dashReport} — Completed dash-path verification.`
      }
    ]
  };
  assert.equal(inspectHandoffs(root, dashRecord)[0].status, "READY");
  assert.equal(
    inspectHandoffs(root, {
      ...dashRecord,
      handoffs: [{ sender: "dash-child", message: `PARTIAL ${dashReport} — Waiting on dash-path check.` }]
    })[0].status,
    "PARTIAL"
  );

  // Verify RUN-PR5-01: reportPath rejects traversal/invalid roots and normalizes trailing slashes
  for (const badRoot of ["", "   ", "../../etc", "/tmp/evil", "foo\\bar", "a/../b", "/", null]) {
    assert.throws(() => reportPath("alpha", 1, badRoot), /workspace-relative reportRoot/);
  }
  assert.equal(reportPath("alpha", 1, "custom/out/"), "custom/out/squad-alpha/specialist-1/report.md");

  // Verify RUN-PR5-02: inspectHandoffs restricts allowedRoots when custom reportRoot differs from default
  const defaultSlot = reportPath("alpha", 1);
  write(defaultSlot, "Default slot evidence.\n");
  assert.throws(
    () => inspectHandoffs(root, {
      workspace: root,
      reportRoot: "custom/out",
      assignments: [{ conversationId: "mismatch-1", report: defaultSlot }],
      handoffs: [{ sender: "mismatch-1", message: `READY ${defaultSlot} — Mismatched root.` }]
    }),
    /exact compiled report slots/
  );

  // Verify SCRIPT-PR5-01: bin/agy-squad.mjs bundle rejects null/non-object JSON cleanly without TypeError
  write("null-record.json", "null\n");
  const nullBundle = spawnSync(process.execPath, [agySquadCli, "bundle", "null-record.json"], { cwd: root, encoding: "utf8" });
  assert.equal(nullBundle.status, 1);
  assert.match(nullBundle.stderr, /Provide a valid bundle record\./);
  assert.ok(!/TypeError/.test(nullBundle.stderr));

  // Verify SVC-HANDOFF-PREFIX-AND-LENGTH & RUN-009: reportPath enforces <= 500 B PARTIAL prefix (+33 B @mention+[done] + 16 B observation reserve = 451 B PARTIAL ceiling)
  assert.equal(reportPath("a", undefined, "x".repeat(415)).endsWith("/squad-a/lead/report.md"), true);
  assert.throws(() => reportPath("a", undefined, "x".repeat(416)), /500-byte Pointer-Over-Wire/);
  assert.throws(() => reportPath("a", undefined, "x".repeat(439)), /500-byte Pointer-Over-Wire/);
  assert.throws(() => reportPath("alpha", 1, "a/".repeat(230) + "out"), /500-byte Pointer-Over-Wire/);
  write(first, firstEvidence);
  assert.deepEqual(
    inspectHandoffs(root, {
      workspace: root,
      assignments: [{ conversationId: "w-mention", report: first }],
      handoffs: [{ sender: "w-mention", message: `@coordinator READY ${first} — Verified via swarm board.` }]
    }).map(({ status }) => status),
    ["READY"]
  );

  // Regression suite for SVC-001, SVC-003, SVC-004, SVC-005, SVC-008, RUN-001..005 & CLI digest/--replace/--predecessor
  const regSquad = "reg-svc";
  const regSpec1 = reportPath(regSquad, 1);
  const regSpec2 = reportPath(regSquad, 2);
  const regLead = reportPath(regSquad);
  const regBundle = regLead.replace(/\.md$/, ".sources.json");
  const regAudit1 = reportPath(`integrity_auditor-${regSquad}`, 1);
  const regAudit2 = reportPath(`integrity_auditor-${regSquad}`, 2);
  write("reg-input.txt", "reg-alpha\n");
  // RUN-003: UTF-8 BOM stripped cleanly on specialist & lead reports
  write(regSpec1, "\uFEFF# Spec 1\nVerified reg-input.txt line 1: reg-alpha\n");
  write(regSpec2, "# Spec 2\nVerified reg-input.txt second check: reg-alpha\n");
  write(regLead, "\uFEFFVerdict: PASS\nVerified reg-alpha after checking both reports.\n");
  const regBaseRecord = {
    workspace: root,
    squadId: regSquad,
    verdict: "PASS",
    integrityAuditSlots: [regAudit1, regAudit2],
    verifiedFiles: fingerprint(root, ["reg-input.txt"]),
    assignments: [
      { conversationId: "reg-s1", report: regSpec1 },
      { conversationId: "reg-s2", report: regSpec2 }
    ],
    handoffs: [
      { sender: "reg-s1", message: `READY ${regSpec1} — reg-alpha 1` },
      { sender: "reg-s2", message: `READY ${regSpec2} — reg-alpha 2` }
    ]
  };

  // RUN-001 & RUN-002: unsafe squadId & control characters in paths rejected
  assert.throws(() => bundleReports(root, { ...regBaseRecord, squadId: "../escape" }), /Invalid squad ID|workspace-relative/i);
  assert.throws(() => fingerprint(root, ["bad\x07path.txt"]), /workspace-relative/i);
  assert.throws(() => inspectHandoffs(root, {
    workspace: root,
    assignments: [{ conversationId: "reg-s1", report: regSpec1 }],
    handoffs: [{ sender: "reg-s1", message: `READY ${regSpec1} — line1\nline2` }]
  }), /one line/i);

  // SVC-005: missing/stale Evidence Digest blocks acceptance; computeEvidenceDigest matches CLI digest
  write(regAudit1, `Target Squad: ${regSquad}\nIntegrity Verdict: CLEAN\nNo digest provided.\n`);
  write(regAudit2, `Target Squad: ${regSquad}\nIntegrity Verdict: CLEAN\nNo digest provided.\n`);
  assert.throws(() => bundleReports(root, regBaseRecord), /Evidence Digest/i);
  const { evidenceDigest: regDigest } = computeEvidenceDigest(root, regBaseRecord);
  write("reg-record.json", JSON.stringify(regBaseRecord));
  const cliDigest = spawnSync(process.execPath, [agySquadCli, "digest", "reg-record.json"], { cwd: root, encoding: "utf8" });
  assert.equal(cliDigest.status, 0, cliDigest.stderr);
  assert.equal(JSON.parse(cliDigest.stdout).evidenceDigest, regDigest);
  write(regAudit1, `Target Squad: ${regSquad}\nEvidence Digest: ${"f".repeat(64)}\nIntegrity Verdict: CLEAN\nStale digest.\n`);
  write(regAudit2, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest}\nIntegrity Verdict: CLEAN\nSecond auditor CLEAN.\n`);
  assert.throws(() => bundleReports(root, regBaseRecord), /Evidence Digest .* does not match/i);

  // SVC-001: second auditor reporting INTEGRITY VIOLATION blocks bundling even when first is CLEAN
  write(regAudit1, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest}\nIntegrity Verdict: CLEAN\nFirst auditor CLEAN.\n`);
  write(regAudit2, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest}\nIntegrity Verdict: INTEGRITY VIOLATION\nSecond auditor flagged trace gap.\n`);
  assert.throws(() => bundleReports(root, regBaseRecord), /INTEGRITY VIOLATION/);

  // Both CLEAN with matching digest succeed and record integrityAudits array + auditPolicy='required'
  write(regAudit2, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest}\nIntegrity Verdict: CLEAN\nSecond auditor verified.\n`);
  const regBundled1 = bundleReports(root, regBaseRecord);
  const regBundleObj = JSON.parse(fs.readFileSync(path.join(root, regBundled1.path), "utf8"));
  assert.equal(regBundleObj.schemaVersion, 2);
  assert.equal(regBundleObj.auditPolicy, "required");
  assert.equal(regBundleObj.integrityAudits.length, 2);
  assert.equal(verifyBundle(root, regBundle).auditPolicy, "required");

  // SVC-003: verifyBundle enforces auditPolicy, rejects missing required audits / invalid policy, and surfaces explicit unaudited policy or digest mismatch
  const savedRegJson = fs.readFileSync(path.join(root, regBundle), "utf8");
  fs.writeFileSync(path.join(root, regBundle), JSON.stringify({ ...regBundleObj, auditPolicy: "bogus" }));
  assert.throws(() => verifyBundle(root, regBundle), /Invalid auditPolicy/);
  fs.writeFileSync(path.join(root, regBundle), JSON.stringify({ ...regBundleObj, integrityAudits: undefined, integrityAudit: undefined }));
  assert.throws(() => verifyBundle(root, regBundle), /missing integrityAudit/i);
  const downgraded = { ...regBundleObj, auditPolicy: "unaudited-explicit", integrityAudits: undefined, integrityAudit: undefined };
  fs.writeFileSync(path.join(root, regBundle), JSON.stringify(downgraded));
  assert.equal(verifyBundle(root, regBundle).auditPolicy, "unaudited-explicit");
  fs.writeFileSync(path.join(root, regBundle), JSON.stringify({ ...regBundleObj, integrityAudits: [] }));
  assert.throws(() => verifyBundle(root, regBundle), /Invalid integrityAudits array/);
  fs.writeFileSync(path.join(root, regBundle), JSON.stringify({
    ...regBundleObj,
    integrityAudit: { ...regBundleObj.integrityAudit, evidenceDigest: "0".repeat(64) }
  }));
  assert.throws(() => verifyBundle(root, regBundle), /disagrees with integrityAudits\[0\]/);
  assert.throws(() => verifyBundle(root, regBundle, regBundled1.sha256), /Bundle differs from the primary's accepted digest/);
  fs.writeFileSync(path.join(root, regBundle), savedRegJson);
  write(regAudit2, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest}\nIntegrity Verdict: CLEAN\nTampered second auditor.\n`);
  assert.throws(() => verifyBundle(root, regBundle), /Integrity audit report changed/);
  write(regAudit2, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest}\nIntegrity Verdict: CLEAN\nSecond auditor verified.\n`);
  const missSpec = reportPath("missing-prev", 1);
  const missLead = reportPath("missing-prev");
  write(missSpec, "# Missing Prev Spec\nVerified reg-target.txt.\n");
  write(missLead, "Content Verdict: PASS\nMissing prev lead.\n");
  assert.throws(() => bundleReports(root, {
    workspace: root,
    squadId: "missing-prev",
    verdict: "PASS",
    requireIntegrityAudit: false,
    verifiedFiles: regBaseRecord.verifiedFiles,
    assignments: [{ conversationId: "mp-1", report: missSpec }],
    handoffs: [{ sender: "mp-1", message: `READY ${missSpec} — Verified.` }],
    expectedPredecessorSha256: regBundled1.sha256
  }), /does not exist\./);

  // SVC-008: silent overwrite blocked without replaceExisting or matching expectedPredecessorSha256
  write(regLead, "Verdict: PASS\nPASS updated synthesis text.\n");
  const { evidenceDigest: regDigest2 } = computeEvidenceDigest(root, regBaseRecord);
  write(regAudit1, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest2}\nIntegrity Verdict: CLEAN\nFirst auditor re-verified.\n`);
  write(regAudit2, `Target Squad: ${regSquad}\nEvidence Digest: ${regDigest2}\nIntegrity Verdict: CLEAN\nSecond auditor re-verified.\n`);
  assert.throws(() => bundleReports(root, regBaseRecord), /replaceExisting|expectedPredecessorSha256/i);
  assert.throws(() => bundleReports(root, { ...regBaseRecord, expectedPredecessorSha256: "0".repeat(64) }), /predecessor/i);
  const cliReplace = spawnSync(process.execPath, [agySquadCli, "bundle", "reg-record.json", "--predecessor", regBundled1.sha256], { cwd: root, encoding: "utf8" });
  assert.equal(cliReplace.status, 0, cliReplace.stderr);
  const regBundled2 = JSON.parse(cliReplace.stdout);
  assert.notEqual(regBundled2.sha256, regBundled1.sha256);

  // SQ-RUN-001: Identical-byte republish with wrong expectedPredecessorSha256 must STILL fail
  assert.throws(
    () => bundleReports(root, { ...regBaseRecord, replaceExisting: true, expectedPredecessorSha256: "f".repeat(64) }),
    /predecessor digest mismatch/i
  );

  // SVC-004: partial prune failure reports removed/remaining cleanly and retry finishes removal
  const spec2FullPath = path.join(root, regSpec2);
  const spec2Dir = path.dirname(spec2FullPath);
  const isWin32 = process.platform === "win32";
  // On POSIX, read-only directory blocks unlink (EACCES). On Windows NTFS, libuv clears READONLY on unlink and ACL denies affect open/stat differently, so simulate EPERM on target unlink cleanly.
  let origUnlinkSync = null;
  if (isWin32) {
    origUnlinkSync = fs.unlinkSync;
    fs.unlinkSync = (targetPath, ...rest) => {
      if (path.resolve(String(targetPath)) === path.resolve(spec2FullPath)) {
        const err = new Error(`EPERM: operation not permitted, unlink '${targetPath}'`);
        err.code = "EPERM";
        throw err;
      }
      return origUnlinkSync.call(fs, targetPath, ...rest);
    };
  } else {
    fs.chmodSync(spec2Dir, 0o555);
  }
  let partialErr;
  try {
    pruneReports(root, regBundle, regBundled2.sha256);
  } catch (err) {
    partialErr = err;
  } finally {
    if (isWin32) {
      fs.unlinkSync = origUnlinkSync;
    } else {
      fs.chmodSync(spec2Dir, 0o755);
    }
  }
  assert.ok(partialErr, "Expected partial prune permission error when specialist 2 report cannot be unlinked");
  assert.deepEqual(partialErr.removed, [regSpec1]);
  assert.deepEqual(partialErr.remaining, [regSpec2]);
  const retryPruned = pruneReports(root, regBundle, regBundled2.sha256);
  assert.deepEqual(retryPruned.removed, [regSpec2]);

  // SQ-RUN-005: Multiple @mention prefixes in READY receipt must strip cleanly
  const multiMentionSpec = reportPath("multi_mention", 1);
  write(multiMentionSpec, "Multi-mention evidence.\n");
  const multiMentionRec = {
    workspace: root,
    assignments: [{ conversationId: "m-multi", report: multiMentionSpec }],
    handoffs: [{ sender: "m-multi", message: `@lead @coordinator READY ${multiMentionSpec} — Multi-mention verified.` }]
  };
  assert.equal(inspectHandoffs(root, multiMentionRec)[0].status, "READY");

  // SQ-RUN-006: Single-segment custom root derives without reportRoot; explicit reportRoot="scratch/agy-squad" stays strict under AGY_SQUAD_SCRATCH_ROOT
  const singleSegSpec = reportPath("alpha", 1, "custom-out");
  write(singleSegSpec, "Single-segment root evidence.\n");
  assert.equal(
    inspectHandoffs(root, {
      workspace: root,
      assignments: [{ conversationId: "seg-1", report: singleSegSpec }],
      handoffs: [{ sender: "seg-1", message: `READY ${singleSegSpec} — Single segment verified.` }]
    })[0].status,
    "READY"
  );
  write("strict-scratch-env.json", JSON.stringify({
    workspace: root,
    reportRoot: "scratch/agy-squad",
    assignments: [{ conversationId: "s-env", report: "alt-scratch/agy-squad/squad-alpha/specialist-1/report.md" }],
    handoffs: [{ sender: "s-env", message: "READY alt-scratch/agy-squad/squad-alpha/specialist-1/report.md — Should fail." }]
  }));
  const envStrictCheck = spawnSync(process.execPath, [agySquadCli, "inspect", "strict-scratch-env.json"], {
    cwd: root,
    env: { ...process.env, AGY_SQUAD_SCRATCH_ROOT: "alt-scratch" },
    encoding: "utf8"
  });
  assert.notEqual(envStrictCheck.status, 0, "Explicit reportRoot='scratch/agy-squad' must reject alt-scratch slot");

  // SQ-ARCH-001: Opt-in allowNonPassing + allowPartial bundles & verifies FAIL cohorts with PARTIAL + NO_REPORT slots
  const failRoot = "scratch/agy-squad-fail";
  const failSpec1 = reportPath("fail_squad", 1, failRoot);
  const failSpec2 = reportPath("fail_squad", 2, failRoot);
  const failLead = reportPath("fail_squad", undefined, failRoot);
  const failAudit = reportPath("integrity_auditor-fail_squad", 1, failRoot);
  write(failSpec1, "# Partial Spec 1\nReproduced bug #1.\n");
  write(failLead, "Content Verdict: FAIL\nTwo blocking issues identified.\n");
  const failRecord = {
    workspace: root,
    reportRoot: failRoot,
    squadId: "fail_squad",
    verdict: "FAIL",
    verifiedFiles: regBaseRecord.verifiedFiles,
    assignments: [
      { conversationId: "f-1", report: failSpec1 },
      { conversationId: "f-2", report: failSpec2 }
    ],
    handoffs: [
      { sender: "f-1", message: `PARTIAL ${failSpec1} — Partial reproduction recorded.` },
      { sender: "f-2", message: `NO_REPORT — Worker timed out before write.` }
    ]
  };
  write("fail-record.json", JSON.stringify(failRecord));
  const failDigestCli = spawnSync(process.execPath, [agySquadCli, "digest", "fail-record.json", "--allow-non-passing", "--allow-partial"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(failDigestCli.status, 0, failDigestCli.stderr);
  const failDigest = JSON.parse(failDigestCli.stdout).evidenceDigest;
  write(failAudit, `Target Squad: fail_squad\nEvidence Digest: ${failDigest}\nIntegrity Verdict: CLEAN\nVerified failure bundle.\n`);
  const failBundleCli = spawnSync(process.execPath, [agySquadCli, "bundle", "fail-record.json", "--allow-non-passing", "--allow-partial"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(failBundleCli.status, 0, failBundleCli.stderr);
  const failBundled = JSON.parse(failBundleCli.stdout);
  const failVerifiedCli = spawnSync(process.execPath, [agySquadCli, "verify", failBundled.path], { cwd: root, encoding: "utf8" });
  assert.equal(failVerifiedCli.status, 0, failVerifiedCli.stderr);
  // Strict verify rejects forged verdict=FAIL without allowNonPassing=true
  const failBundleJson = JSON.parse(fs.readFileSync(path.join(root, failBundled.path), "utf8"));
  delete failBundleJson.allowNonPassing;
  write(failBundled.path, JSON.stringify(failBundleJson, null, 2) + "\n");
  assert.throws(() => verifyBundle(root, failBundled.path), /PASS verdict/);

  // Digesting or bundling NO_REPORT with an unexpected loose file on disk must fail upfront before verifyBundle
  write(failSpec2, "# Unexpected stale file\nShould not exist at NO_REPORT slot.\n");
  assert.deepEqual(inspectHandoffs(root, failRecord).map(({ status }) => status), ["PARTIAL", "NO_REPORT"]);
  assert.throws(() => bundleReports(root, { ...failRecord, integrityReport: failAudit, allowNonPassing: true, allowPartial: true }), /Unexpected loose file present at NO_REPORT slot/);
  const staleDigestCli = spawnSync(process.execPath, [agySquadCli, "digest", "fail-record.json", "--allow-non-passing", "--allow-partial"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.notEqual(staleDigestCli.status, 0);
  assert.match(staleDigestCli.stderr, /Unexpected loose file present at NO_REPORT slot/);
  fs.rmSync(path.join(root, failSpec2), { force: true });

  // BLOCKED verdict + PARTIAL specialist with --allow-non-passing --allow-partial roundtrips cleanly
  const blockedRoot = "scratch/agy-squad-blocked";
  const blkSpec1 = reportPath("blk_squad", 1, blockedRoot);
  const blkLead = reportPath("blk_squad", undefined, blockedRoot);
  const blkAudit = reportPath("integrity_auditor-blk_squad", 1, blockedRoot);
  write(blkSpec1, "# Partial Blk\nUpstream auth outage.\n");
  write(blkLead, "Content Verdict: BLOCKED\nMissing required credentials.\n");
  const blockedRecord = {
    workspace: root,
    reportRoot: blockedRoot,
    squadId: "blk_squad",
    verdict: "BLOCKED",
    verifiedFiles: regBaseRecord.verifiedFiles,
    assignments: [{ conversationId: "b-1", report: blkSpec1 }],
    handoffs: [{ sender: "b-1", message: `PARTIAL ${blkSpec1} — Blocked on missing creds.` }]
  };
  write("blocked-record.json", JSON.stringify(blockedRecord));
  const blkDigestCli = spawnSync(process.execPath, [agySquadCli, "digest", "blocked-record.json", "--allow-non-passing", "--allow-partial"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(blkDigestCli.status, 0, blkDigestCli.stderr);
  const blkDigest = JSON.parse(blkDigestCli.stdout).evidenceDigest;
  write(blkAudit, `Target Squad: blk_squad\nEvidence Digest: ${blkDigest}\nIntegrity Verdict: CLEAN\nVerified blocked bundle.\n`);
  const blkBundleCli = spawnSync(process.execPath, [agySquadCli, "bundle", "blocked-record.json", "--allow-non-passing", "--allow-partial"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(blkBundleCli.status, 0, blkBundleCli.stderr);
  const blkBundled = JSON.parse(blkBundleCli.stdout);
  const blkVerifiedCli = spawnSync(process.execPath, [agySquadCli, "verify", blkBundled.path], { cwd: root, encoding: "utf8" });
  assert.equal(blkVerifiedCli.status, 0, blkVerifiedCli.stderr);

  // SQ-TEST-001-P3-1: Explicit pruneReports regression on allowNonPassing + allowPartial (PARTIAL + NO_REPORT) bundle
  const prunePartialRoot = "scratch/agy-squad-prune-partial";
  const ppSpec1 = reportPath("prune_partial", 1, prunePartialRoot);
  const ppSpec2 = reportPath("prune_partial", 2, prunePartialRoot);
  const ppLead = reportPath("prune_partial", undefined, prunePartialRoot);
  const ppAudit = reportPath("integrity_auditor-prune_partial", 1, prunePartialRoot);
  write(ppSpec1, "# Partial Spec 1\nVerified partial proof before upstream outage.\n");
  write(ppLead, "Content Verdict: FAIL\nIncomplete run; spec-2 unavailable.\n");
  const ppRecord = {
    workspace: root,
    reportRoot: prunePartialRoot,
    squadId: "prune_partial",
    verdict: "FAIL",
    allowNonPassing: true,
    allowPartial: true,
    verifiedFiles: regBaseRecord.verifiedFiles,
    assignments: [
      { conversationId: "pp-1", report: ppSpec1 },
      { conversationId: "pp-2", report: ppSpec2 }
    ],
    handoffs: [
      { sender: "pp-1", message: `PARTIAL ${ppSpec1} — Partial check recorded.` },
      { sender: "pp-2", message: "NO_REPORT — Timed out before output." }
    ]
  };
  const ppDigest = computeEvidenceDigest(root, ppRecord).evidenceDigest;
  write(ppAudit, `Target Squad: prune_partial\nEvidence Digest: ${ppDigest}\nIntegrity Verdict: CLEAN\nVerified partial prune fixture.\n`);
  const ppBundled = bundleReports(root, { ...ppRecord, integrityReport: ppAudit });
  const ppPruned = pruneReports(root, ppBundled.path, ppBundled.sha256);
  assert.deepEqual(ppPruned, { removed: [ppSpec1] }, "pruneReports must remove PARTIAL loose report and skip absent NO_REPORT cleanly");
  assert.equal(exists(ppSpec1), false);
  assert.equal(exists(ppSpec2), false);
  assert.equal(verifyBundle(root, ppBundled.path, ppBundled.sha256).sha256, ppBundled.sha256);

  // L46: Direct handoffs.mjs API calls canonicalize un-canonicalized root (relative '.' or symlinked parent)
  const relViaDotRoot = path.join(root, ".", "scratch", "..");
  assert.deepEqual(fingerprint(relViaDotRoot, ["reg-input.txt"]), regBaseRecord.verifiedFiles);
  assert.deepEqual(inspectHandoffs(relViaDotRoot, { ...blockedRecord, workspace: relViaDotRoot }).map(s => s.status), ["PARTIAL"]);
  const rootSymlinkAlias = path.join(path.dirname(root), `alias-${path.basename(root)}`);
  let aliasCreated = false;
  try {
    fs.symlinkSync(root, rootSymlinkAlias, os.platform() === "win32" ? "junction" : "dir");
    aliasCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (aliasCreated) {
    try {
      assert.deepEqual(fingerprint(rootSymlinkAlias, ["reg-input.txt"]), regBaseRecord.verifiedFiles);
      assert.deepEqual(inspectHandoffs(rootSymlinkAlias, blockedRecord).map(s => s.status), ["PARTIAL"]);
    } finally {
      fs.rmSync(rootSymlinkAlias, { recursive: true, force: true });
    }
  }

  // SQ-SVC-001: agy-squad collect + bundle-init end-to-end & edge cases
  const svcRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-svc-001-")));
  try {
    const svcCoord = path.join(svcRoot, "coord");
    const svcWt1 = path.join(svcRoot, "wt1");
    const svcWt2 = path.join(svcRoot, "wt2");
    fs.mkdirSync(svcCoord, { recursive: true });
    fs.mkdirSync(svcWt1, { recursive: true });
    fs.mkdirSync(svcWt2, { recursive: true });

    const writeAt = (base, rel, val) => {
      const dest = path.join(base, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, val);
    };

    writeAt(svcCoord, "src/core.mjs", "export const ok = true;\n");
    writeAt(svcCoord, "svc-manifest.json", JSON.stringify({
      squads: {
        alpha: {
          lead: { role: "Alpha Lead", objective: "Synthesize alpha", scopeFiles: ["src/core.mjs"] },
          specialists: [
            { role: "Spec One", objective: "Check part 1", scopeFiles: ["src/core.mjs"] },
            { role: "Spec Two", objective: "Check part 2", scopeFiles: ["src/core.mjs"] }
          ]
        }
      }
    }));

    const svcPlanCli = spawnSync(
      process.execPath,
      [agySquadCli, "plan", "--manifest", "svc-manifest.json", "--workspace-isolation", "share"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(svcPlanCli.status, 0, svcPlanCli.stderr);
    writeAt(svcCoord, "scratch/plan.json", svcPlanCli.stdout);
    const svcPlan = JSON.parse(svcPlanCli.stdout);
    const s1Slot = svcPlan.workers[0].specialists[0].reportSlot;
    const s2Slot = svcPlan.workers[0].specialists[1].reportSlot;
    const leadSlot = svcPlan.workers[0].lead.reportSlot;
    const auditSlot = svcPlan.integrityAuditPlan[0].reportSlot;
    const s1Worker = svcPlan.workers[0].specialists[0].workerName;
    const s2Worker = svcPlan.workers[0].specialists[1].workerName;

    // Pre-create empty placeholder in wt1 for s2Slot while real content lives in wt2
    writeAt(svcWt1, s1Slot, "# Specialist 1\nVerified src/core.mjs:1.\n");
    writeAt(svcWt1, s2Slot, "   \n");
    writeAt(svcWt2, s2Slot, "# Specialist 2\nVerified exports.\n");
    writeAt(svcWt1, leadSlot, "Content Verdict: PASS\nVerified alpha cohort cleanly.\n");

    // --dry-run must preview without writing
    const dryCollect = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWt1, "--from", svcWt2, "--dry-run"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(dryCollect.status, 0, dryCollect.stderr);
    const dryJson = JSON.parse(dryCollect.stdout);
    assert.equal(dryJson.dryRun, true);
    assert.equal(dryJson.collected.length, 3);
    assert.equal(fs.existsSync(path.join(svcCoord, s1Slot)), false);

    // --strict fails when integrityAudit slot is missing from worktrees
    const strictMissing = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWt1, "--from", svcWt2, "--strict"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(strictMissing.status, 0);
    assert.match(strictMissing.stderr, /Missing expected report slot/);
    assert.equal(fs.existsSync(path.join(svcCoord, s1Slot)), false, "--strict failure must be atomic with zero partial writes");

    // Real collect copies slots atomically and is idempotent on repeat
    const realCollect = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--squad", "alpha", "--from", svcWt1, "--from", svcWt2],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(realCollect.status, 0, realCollect.stderr);
    const realCollectJson = JSON.parse(realCollect.stdout);
    assert.equal(realCollectJson.collected.length, 3);
    assert.equal(fs.readFileSync(path.join(svcCoord, s2Slot), "utf8"), "# Specialist 2\nVerified exports.\n");

    const repeatCollect = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWt1, "--from", svcWt2],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(repeatCollect.status, 0, repeatCollect.stderr);
    assert.equal(JSON.parse(repeatCollect.stdout).unchanged.length, 3);

    // Destination conflict fails without --overwrite and succeeds with --overwrite
    writeAt(svcWt2, s1Slot, "# Specialist 1\nUpdated wt2 report.\n");
    // Inter-worktree conflict (wt1 vs wt2 both have differing non-empty s1Slot) must always fail
    const interConflict = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWt1, "--from", svcWt2, "--overwrite"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(interConflict.status, 0);
    assert.match(interConflict.stderr, /Conflict collecting/);

    // Single updated worktree against differing coordinator slot requires --overwrite
    const destConflict = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--squad", "alpha", "--from", svcWt2],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(destConflict.status, 0);
    assert.match(destConflict.stderr, /Conflict at destination/);
    const destOverwrite = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--squad", "alpha", "--from", svcWt2, "--overwrite"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(destOverwrite.status, 0, destOverwrite.stderr);

    // Symlink inside source worktree must be rejected fail-closed
    const svcWtSym = path.join(svcRoot, "wt-sym");
    fs.mkdirSync(svcWtSym, { recursive: true });
    const secretFile = path.join(svcRoot, "outside-secret.md");
    fs.writeFileSync(secretFile, "SECRET");
    const symTargetDir = path.join(svcWtSym, path.dirname(s1Slot));
    fs.mkdirSync(symTargetDir, { recursive: true });
    let symlinkCreated = false;
    try {
      fs.symlinkSync(secretFile, path.join(svcWtSym, s1Slot), "file");
      symlinkCreated = true;
    } catch (err) {
      if (err?.code !== "EPERM") throw err;
    }
    if (symlinkCreated) {
      const symCollect = spawnSync(
        process.execPath,
        [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWtSym, "--overwrite"],
        { cwd: svcCoord, encoding: "utf8" }
      );
      assert.notEqual(symCollect.status, 0);
      assert.match(symCollect.stderr, /ELOOP|symlink/i);
    }

    // bundle-init produces pre-filled record with fingerprint digests & provenanceScaffold/id-map integration
    const initCli = spawnSync(
      process.execPath,
      [
        agySquadCli,
        "bundle-init",
        "--plan",
        "scratch/plan.json",
        "--handoff",
        `${s1Worker}=READY ${s1Slot} — Verified part 1.`,
        "--handoff",
        `${s2Worker}=READY ${s2Slot} — Verified part 2.`,
        "--out",
        "scratch/bundle-record.json",
        "src/core.mjs"
      ],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(initCli.status, 0, initCli.stderr);
    const initOut = JSON.parse(initCli.stdout);
    assert.equal(initOut.path, "scratch/bundle-record.json");
    assert.equal(initOut.record.verdict, "PASS");
    assert.equal(initOut.record.verifiedFiles["src/core.mjs"], fingerprint(svcCoord, ["src/core.mjs"])["src/core.mjs"]);
    assert.equal(initOut.record.assignments.length, 2);
    assert.equal(initOut.record.handoffs.length, 2);

    // Overwriting existing --out rejects without --replace, succeeds with --replace
    const initDup = spawnSync(
      process.execPath,
      [agySquadCli, "bundle-init", "--plan", "scratch/plan.json", "--out", "scratch/bundle-record.json", "src/core.mjs"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(initDup.status, 0);
    const initReplace = spawnSync(
      process.execPath,
      [
        agySquadCli,
        "bundle-init",
        "--plan",
        "scratch/plan.json",
        "--handoff",
        `${s1Worker}=READY ${s1Slot} — Verified part 1.`,
        "--handoff",
        `${s2Worker}=READY ${s2Slot} — Verified part 2.`,
        "--out",
        "scratch/bundle-record.json",
        "--replace",
        "src/core.mjs"
      ],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(initReplace.status, 0, initReplace.stderr);

    // Full downstream pipeline: inspect -> digest -> audit -> bundle -> verify
    const svcInspect = spawnSync(process.execPath, [agySquadCli, "inspect", "scratch/bundle-record.json"], { cwd: svcCoord, encoding: "utf8" });
    assert.equal(svcInspect.status, 0, svcInspect.stderr);
    const svcDigest = spawnSync(process.execPath, [agySquadCli, "digest", "scratch/bundle-record.json"], { cwd: svcCoord, encoding: "utf8" });
    assert.equal(svcDigest.status, 0, svcDigest.stderr);
    const evDigest = JSON.parse(svcDigest.stdout).evidenceDigest;
    writeAt(svcCoord, auditSlot, `Target Squad: alpha\nEvidence Digest: ${evDigest}\nIntegrity Verdict: CLEAN\nVerified collected slots.\n`);
    const svcBundle = spawnSync(process.execPath, [agySquadCli, "bundle", "scratch/bundle-record.json"], { cwd: svcCoord, encoding: "utf8" });
    assert.equal(svcBundle.status, 0, svcBundle.stderr);
    const svcVerify = spawnSync(process.execPath, [agySquadCli, "verify", JSON.parse(svcBundle.stdout).path], { cwd: svcCoord, encoding: "utf8" });
    assert.equal(svcVerify.status, 0, svcVerify.stderr);

    // Leading './' path inputs, single-squad integrity_auditor collection, --report-root rebase, symlinked slot dir rejection, and strict bundle-init checks
    writeAt(svcWt1, auditSlot, `Target Squad: alpha\nIntegrity Verdict: CLEAN\nVerified in wt1.\n`);
    const dotPlanDry = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "./scratch/plan.json", "--from", svcWt1, "--overwrite", "--dry-run"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(dotPlanDry.status, 0, dotPlanDry.stderr);

    const squadCollectWithAudit = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--squad", "alpha", "--from", svcWt1, "--overwrite", "--dry-run"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(squadCollectWithAudit.status, 0, squadCollectWithAudit.stderr);
    assert.ok(
      JSON.parse(squadCollectWithAudit.stdout).collected.some(c => c.slot === auditSlot),
      "collect --squad <id> must discover single-squad integrity_auditor slot"
    );

    const wave2Wt = path.join(svcRoot, "wt-wave2");
    writeAt(wave2Wt, "scratch/wave2/squad-alpha/specialist-1/report.md", "# Wave 2 S1\nOk.\n");
    writeAt(wave2Wt, "scratch/wave2/squad-alpha/lead/report.md", "Content Verdict: PASS\nWave 2 lead.\n");
    const wave2Collect = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "./scratch/plan.json", "--report-root", "scratch/wave2", "--from", wave2Wt],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(wave2Collect.status, 0, wave2Collect.stderr);
    assert.equal(fs.existsSync(path.join(svcCoord, "scratch/wave2/squad-alpha/lead/report.md")), true);

    const symSlotDirWt = path.join(svcRoot, "wt-sym-slotdir");
    const outsideSlotDir = path.join(svcRoot, "outside-slot-dir");
    writeAt(outsideSlotDir, "report.md", "LEAKED");
    writeAt(symSlotDirWt, leadSlot, "Content Verdict: PASS\nLead ok.\n");
    let slotDirLinkCreated = false;
    try {
      fs.symlinkSync(
        outsideSlotDir,
        path.join(symSlotDirWt, "scratch/agy-squad/squad-alpha/specialist-1"),
        os.platform() === "win32" ? "junction" : "dir"
      );
      slotDirLinkCreated = true;
    } catch (err) {
      if (err?.code !== "EPERM") throw err;
    }
    if (slotDirLinkCreated) {
      const symSlotRes = spawnSync(
        process.execPath,
        [agySquadCli, "collect", "--squad", "alpha", "--from", symSlotDirWt, "--overwrite"],
        { cwd: svcCoord, encoding: "utf8" }
      );
      assert.notEqual(symSlotRes.status, 0);
      assert.match(symSlotRes.stderr, /ELOOP|symlink/i);
    }

    // Hedged lead/report.md verdict must fail bundle-init instead of defaulting to PASS
    const hedgedLeadDir = path.join(svcRoot, "coord-hedged");
    fs.cpSync(svcCoord, hedgedLeadDir, { recursive: true });
    writeAt(hedgedLeadDir, leadSlot, "Content Verdict: PASS with Advisories\n");
    const hedgedInit = spawnSync(
      process.execPath,
      [agySquadCli, "bundle-init", "--plan", "./scratch/plan.json", "src/core.mjs"],
      { cwd: hedgedLeadDir, encoding: "utf8" }
    );
    assert.notEqual(hedgedInit.status, 0, "bundle-init must reject hedged lead verdict instead of defaulting to PASS");
    assert.match(hedgedInit.stderr, /invalid or conflicting verdict/i);

    // SQ-RUN-001: Markdown-formatted conflicting or invalid lead verdicts must also fail bundle-init
    for (const badMdVerdict of [
      "## **Content Verdict:** PASS\nStatus: FAIL\n",
      "- **Content Verdict**: MAYBE\n"
    ]) {
      const badMdDir = path.join(svcRoot, "coord-bad-md");
      fs.rmSync(badMdDir, { recursive: true, force: true });
      fs.cpSync(svcCoord, badMdDir, { recursive: true });
      writeAt(badMdDir, leadSlot, badMdVerdict);
      const badMdInit = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "./scratch/plan.json", "src/core.mjs"],
        { cwd: badMdDir, encoding: "utf8" }
      );
      assert.notEqual(badMdInit.status, 0, `bundle-init must reject: ${badMdVerdict}`);
      assert.match(badMdInit.stderr, /invalid or conflicting verdict/i);
    }

    // SQ-RUN-003: Reject Windows drive-relative prefix and bare .json in bundle-init --out
    for (const badOut of ["C:bundle.json", ".json"]) {
      const badOutRes = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "./scratch/plan.json", "--out", badOut, "src/core.mjs"],
        { cwd: svcCoord, encoding: "utf8" }
      );
      assert.notEqual(badOutRes.status, 0, `bundle-init must reject invalid --out '${badOut}'`);
    }

    // SQ-RUN-002: Whitespace around relative --plan path trims cleanly, while symlinked --plan is rejected via O_NOFOLLOW
    const trimmedPlanRes = spawnSync(
      process.execPath,
      [agySquadCli, "bundle-init", "--plan", "  ./scratch/plan.json  ", "src/core.mjs"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(trimmedPlanRes.status, 0, trimmedPlanRes.stderr);
    const symlinkPlanPath = path.join(svcCoord, "scratch", "plan-link.json");
    let createdPlanLink = false;
    try {
      fs.symlinkSync("plan.json", symlinkPlanPath);
      createdPlanLink = true;
    } catch {}
    if (createdPlanLink) {
      const symPlanRes = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "./scratch/plan-link.json", "src/core.mjs"],
        { cwd: svcCoord, encoding: "utf8" }
      );
      assert.notEqual(symPlanRes.status, 0);
      assert.match(symPlanRes.stderr, /ELOOP|symlink/i);
    }

    // SQ-SVC-002: collect --record combined with --squad must reject, and collectReportSlots checks squadId mismatch
    writeAt(svcCoord, "scratch/collect-rec.json", trimmedPlanRes.stdout);
    const conflictCollect = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--record", "scratch/collect-rec.json", "--squad", "other_squad", "--from", svcWt1],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(conflictCollect.status, 0);
    assert.match(conflictCollect.stderr, /--record.*--squad|Conflicting/i);
    assert.throws(
      () => collectReportSlots(svcCoord, { record: JSON.parse(trimmedPlanRes.stdout), squadId: "other_squad", sources: [svcWt1] }),
      /Conflicting squad/i
    );

    // PR Review Standard Section 4 category Verdict lines must coexist cleanly with Content Verdict: PASS in bundle-init
    const catVerdictDir = path.join(svcRoot, "coord-cat-verdict");
    fs.cpSync(svcCoord, catVerdictDir, { recursive: true });
    writeAt(catVerdictDir, leadSlot, "Content Verdict: PASS\n- **Verdict:** Changes required (`SQ-001`)\n");
    const catVerdictInit = spawnSync(
      process.execPath,
      [agySquadCli, "bundle-init", "--plan", "./scratch/plan.json", "src/core.mjs"],
      { cwd: catVerdictDir, encoding: "utf8" }
    );
    assert.equal(catVerdictInit.status, 0, catVerdictInit.stderr);
    assert.equal(JSON.parse(catVerdictInit.stdout).verdict, "PASS");

    const badIdMap = spawnSync(
      process.execPath,
      [agySquadCli, "bundle-init", "--plan", "scratch/plan.json", "--id-map", "no_such_worker=uuid-99", "src/core.mjs"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(badIdMap.status, 0, "bundle-init must reject unmatched --id-map keys");
    assert.match(badIdMap.stderr, /--id-map key/);

    // Subagent-mode slimmed plan hydration & --id-map substitution in bundle-init (no provenanceScaffold / bundleRecordTemplates on plan)
    const subPlan = spawnSync(
      process.execPath,
      [agySquadCli, "plan", "--manifest", "svc-manifest.json", "--mode", "subagent"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(subPlan.status, 0, subPlan.stderr);
    const subPlanObj = JSON.parse(subPlan.stdout);
    assert.equal(subPlanObj.provenanceScaffold, undefined, "slimmed subagent plan omits provenanceScaffold");
    assert.equal(subPlanObj.bundleRecordTemplates, undefined, "slimmed subagent plan omits bundleRecordTemplates");
    writeAt(svcCoord, "scratch/sub-plan.json", JSON.stringify(subPlanObj));
    const spec1Name = subPlanObj.workers[0].specialists[0].workerName;
    const spec2Name = subPlanObj.workers[0].specialists[1].workerName;
    const directHydrated = buildBundleRecordInit(svcCoord, {
      plan: subPlanObj,
      files: ["src/core.mjs"],
      idMap: { [spec2Name]: "uuid-override-2" }
    });
    assert.equal(directHydrated.assignments[0].conversationId, `<invoke_subagent:${spec1Name}:conversationId>`);
    assert.equal(directHydrated.assignments[1].conversationId, "uuid-override-2");
    const subInit = spawnSync(
      process.execPath,
      [
        agySquadCli,
        "bundle-init",
        "--plan", "scratch/sub-plan.json",
        "--id-map", `${spec1Name}=uuid-spec-1`,
        "--id-map", `${spec2Name}=uuid-override-2`,
        "src/core.mjs"
      ],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(subInit.status, 0, subInit.stderr);
    const subInitObj = JSON.parse(subInit.stdout);
    assert.equal(subInitObj.assignments[0].conversationId, "uuid-spec-1");
    assert.equal(subInitObj.assignments[1].conversationId, "uuid-override-2");
  } finally {
    fs.rmSync(svcRoot, { recursive: true, force: true });
  }

  // W2 Regressions (SVC-003, LEAD-SVC-001, LEAD-SVC-002, S2-SCRIPT-001, S2-SCRIPT-002, RUN-009..011, SVC-010, S2-SCRIPT-007..009, S2-DEP-003)
  const w2Root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-w2-handoffs-")));
  try {
    const w2Write = (rel, contents) => {
      const target = path.join(w2Root, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents, "utf8");
    };
    const w2S1 = reportPath("alpha", 1);
    const w2S2 = reportPath("alpha", 2);
    const w2Lead = reportPath("alpha");
    w2Write(w2S1, "# Spec 1\nVerified.\n");
    w2Write(w2S2, "# Spec 2\nVerified.\n");
    w2Write(w2Lead, "Content Verdict: PASS\nVerified alpha.\n");
    w2Write("src/item.js", "export const item = 1;\n");

    // SVC-003: inspectHandoffs must reject out-of-order / non-canonical slot assignments matching computeEvidenceDigest
    assert.throws(
      () => inspectHandoffs(w2Root, {
        workspace: w2Root,
        squadId: "alpha",
        assignments: [{ conversationId: "w-1", report: w2S2 }],
        handoffs: [{ sender: "w-1", message: `READY ${w2S2} — Swapped slot.` }]
      }),
      /exact compiled report slots/
    );

    // RUN-010 / RUN-HANDOFF-01: NO_REPORT double spaces after em-dash accepted
    assert.deepEqual(
      inspectHandoffs(w2Root, {
        workspace: w2Root,
        squadId: "alpha",
        assignments: [{ conversationId: "w-1", report: w2S1 }],
        handoffs: [{ sender: "w-1", message: "NO_REPORT —  double spaced reason." }]
      }).map(r => r.status),
      ["NO_REPORT"]
    );

    // RUN-011: non-newline control bytes (\t, \x1b) must be rejected
    for (const badMsg of [
      `READY ${w2S1} — tabbed\treason.`,
      `READY ${w2S1} — ansi\x1b[31mreason.`
    ]) {
      assert.throws(
        () => inspectHandoffs(w2Root, {
          workspace: w2Root,
          squadId: "alpha",
          assignments: [{ conversationId: "w-1", report: w2S1 }],
          handoffs: [{ sender: "w-1", message: badMsg }]
        }),
        /CONTROL|control|500 UTF-8 bytes/i
      );
    }

    // LEAD-SVC-001: explicit integrityReport/integrityAuditSlots skips corrupted flat fallback, and fallback filters by Target Squad
    const customAuditSlot = reportPath("alpha", 3); // distinct valid slot path
    const w2Files = fingerprint(w2Root, ["src/item.js"]);
    const w2RecBase = {
      workspace: w2Root,
      squadId: "alpha",
      verdict: "PASS",
      verifiedFiles: w2Files,
      assignments: [{ conversationId: "w-1", report: w2S1 }],
      handoffs: [{ sender: "w-1", message: `READY ${w2S1} — Ok.` }]
    };
    const w2Digest = computeEvidenceDigest(w2Root, w2RecBase).evidenceDigest;
    const flatAuditDirSlot = reportPath("integrity_auditor", 1);
    const scopedAuditTargetSlot = reportPath("integrity_auditor-alpha", 1);
    w2Write(flatAuditDirSlot, "Target Squad: other_squad\nIntegrity Verdict: INTEGRITY VIOLATION\n");
    w2Write(scopedAuditTargetSlot, `Target Squad: alpha\nEvidence Digest: ${w2Digest}\nIntegrity Verdict: CLEAN\n`);
    const explicitBundle = bundleReports(w2Root, {
      ...w2RecBase,
      integrityAuditSlots: [scopedAuditTargetSlot]
    });
    assert.ok(explicitBundle.sha256, "LEAD-SVC-001: explicit integrityAuditSlots must ignore unrelated flat audit report");

    // Fallback flat discovery ignores other_squad audit when scoped dir doesn't exist
    fs.unlinkSync(path.join(w2Root, scopedAuditTargetSlot));
    const flatMatchSlot = reportPath("integrity_auditor", 2);
    w2Write(flatMatchSlot, `Target Squad: alpha\nEvidence Digest: ${w2Digest}\nIntegrity Verdict: CLEAN\n`);
    const filteredFlatBundle = bundleReports(w2Root, {
      ...w2RecBase,
      replaceExisting: true,
      expectedPredecessorSha256: explicitBundle.sha256
    });
    assert.ok(filteredFlatBundle.sha256, "LEAD-SVC-001: fallback flat audit discovery must ignore Target Squad: other_squad");

    // LEAD-SVC-002 & S2-SCRIPT-002 & SVC-010: collect --plan --strict with inherit lead/audit on root, empty plan rejected, dry-run symlink check
    w2Write("m.json", JSON.stringify({
      squads: {
        alpha: {
          lead: { role: "Lead", objective: "Synthesize", scopeFiles: ["src/item.js"] },
          specialists: [{ role: "Spec", objective: "Verify", scopeFiles: ["src/item.js"] }]
        }
      }
    }));
    const validSharePlan = JSON.parse(spawnSync(
      process.execPath,
      [agySquadCli, "plan", "--manifest", "m.json", "--workspace-isolation", "share"],
      { cwd: w2Root, encoding: "utf8" }
    ).stdout);
    w2Write("scratch/share-plan.json", JSON.stringify(validSharePlan));
    const w2Wt = path.join(w2Root, "..", `w2-wt-${process.pid}`);
    fs.mkdirSync(w2Wt, { recursive: true });
    try {
      const wtSpecFile = path.join(w2Wt, w2S1);
      fs.mkdirSync(path.dirname(wtSpecFile), { recursive: true });
      fs.writeFileSync(wtSpecFile, "# Spec 1 from share worktree\nVerified.\n");
      // Ensure audit slot exists in coordinator root (w2Root) alongside lead slot
      w2Write(validSharePlan.integrityAuditPlan[0].reportSlot, `Target Squad: alpha\nEvidence Digest: ${w2Digest}\nIntegrity Verdict: CLEAN\n`);
      const strictInheritCollect = spawnSync(
        process.execPath,
        [agySquadCli, "collect", "--plan", "scratch/share-plan.json", "--from", w2Wt, "--strict", "--overwrite"],
        { cwd: w2Root, encoding: "utf8" }
      );
      assert.equal(strictInheritCollect.status, 0, `LEAD-SVC-002: collect --strict must allow inherit lead/audit slots present in coordinator root: ${strictInheritCollect.stderr}`);

      // S2-SCRIPT-002: empty {} plan fails closed even with --allow-empty
      w2Write("scratch/empty-plan.json", "{}\n");
      const emptyPlanCollect = spawnSync(
        process.execPath,
        [agySquadCli, "collect", "--plan", "scratch/empty-plan.json", "--from", w2Wt, "--allow-empty"],
        { cwd: w2Root, encoding: "utf8" }
      );
      assert.notEqual(emptyPlanCollect.status, 0, "S2-SCRIPT-002: collect --plan {} --allow-empty must fail schema check");

      // SVC-010: dry-run must fail closed if destination parent component is a symlink without target subdir
      const symCoord = path.join(w2Root, "..", `w2-sym-coord-${process.pid}`);
      const outsideParent = path.join(w2Root, "..", `w2-outside-parent-${process.pid}`);
      fs.mkdirSync(path.join(symCoord, "scratch"), { recursive: true });
      fs.mkdirSync(outsideParent, { recursive: true });
      let parentSymCreated = false;
      try {
        fs.symlinkSync(outsideParent, path.join(symCoord, "scratch", "agy-squad"), os.platform() === "win32" ? "junction" : "dir");
        parentSymCreated = true;
      } catch (err) {
        if (err?.code !== "EPERM") throw err;
      }
      if (parentSymCreated) {
        const drySym = spawnSync(
          process.execPath,
          [agySquadCli, "collect", "--squad", "alpha", "--from", w2Wt, "--dry-run"],
          { cwd: symCoord, encoding: "utf8" }
        );
        assert.notEqual(drySym.status, 0, "SVC-010: dry-run must reject destination symlink parent even when leaf directory is absent");
        assert.match(drySym.stderr, /symlink|ELOOP/i);
      }
      fs.rmSync(symCoord, { recursive: true, force: true });
      fs.rmSync(outsideParent, { recursive: true, force: true });
    } finally {
      fs.rmSync(w2Wt, { recursive: true, force: true });
    }

    // S2-SCRIPT-001: leading ./ works uniformly across all 7 downstream CLI verbs
    const w2DotDigest = computeEvidenceDigest(w2Root, w2RecBase).evidenceDigest;
    w2Write(flatMatchSlot, `Target Squad: alpha\nEvidence Digest: ${w2DotDigest}\nIntegrity Verdict: CLEAN\n`);
    const dotBundleRec = "scratch/dot-bundle-rec.json";
    w2Write(dotBundleRec, JSON.stringify({ ...w2RecBase, integrityAuditSlots: [flatMatchSlot] }));
    assert.equal(spawnSync(process.execPath, [agySquadCli, "verdict", `./${w2Lead}`], { cwd: w2Root, encoding: "utf8" }).status, 0, "S2-SCRIPT-001 verdict ./");
    assert.equal(spawnSync(process.execPath, [agySquadCli, "fingerprint", "./src/item.js"], { cwd: w2Root, encoding: "utf8" }).status, 0, "S2-SCRIPT-001 fingerprint ./");
    assert.equal(spawnSync(process.execPath, [agySquadCli, "inspect", `./${dotBundleRec}`], { cwd: w2Root, encoding: "utf8" }).status, 0, "S2-SCRIPT-001 inspect ./");
    assert.equal(spawnSync(process.execPath, [agySquadCli, "digest", `./${dotBundleRec}`], { cwd: w2Root, encoding: "utf8" }).status, 0, "S2-SCRIPT-001 digest ./");
    const dotBundleOut = spawnSync(process.execPath, [agySquadCli, "bundle", `./${dotBundleRec}`, "--replace"], { cwd: w2Root, encoding: "utf8" });
    assert.equal(dotBundleOut.status, 0, `S2-SCRIPT-001 bundle ./: ${dotBundleOut.stderr}`);
    const dotBundleMeta = JSON.parse(dotBundleOut.stdout);
    assert.equal(spawnSync(process.execPath, [agySquadCli, "verify", `./${dotBundleMeta.path}`], { cwd: w2Root, encoding: "utf8" }).status, 0, "S2-SCRIPT-001 verify ./");
    assert.equal(spawnSync(process.execPath, [agySquadCli, "prune", `./${dotBundleMeta.path}`, dotBundleMeta.sha256, "--keep-reports"], { cwd: w2Root, encoding: "utf8" }).status, 0, "S2-SCRIPT-001 prune ./");

    // S2-SCRIPT-007..009 & S2-DEP-003: non-object --provenance, duplicate --id-map, task containing '--help', install alias in usage
    w2Write("scratch/bad-prov.json", "[]\n");
    const badProv = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--plan", "scratch/share-plan.json", "--provenance", "scratch/bad-prov.json"], { cwd: w2Root, encoding: "utf8" });
    assert.notEqual(badProv.status, 0, "S2-SCRIPT-007: array --provenance must reject");
    const dupIdMap = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--plan", "scratch/share-plan.json", "--id-map", "w=id1", "--id-map", "w=id2"], { cwd: w2Root, encoding: "utf8" });
    assert.notEqual(dupIdMap.status, 0, "S2-SCRIPT-008: duplicate --id-map key must reject");
    const planHelpTask = spawnSync(process.execPath, [agySquadCli, "plan", "Fix --help bug in parser"], { cwd: w2Root, encoding: "utf8" });
    assert.equal(planHelpTask.status, 0, `S2-SCRIPT-009: positional task with '--help' must succeed: ${planHelpTask.stderr}`);
    const planHelpAfterTerminator = spawnSync(process.execPath, [agySquadCli, "plan", "--", "--help"], { cwd: w2Root, encoding: "utf8" });
    assert.equal(planHelpAfterTerminator.status, 0, `S2-SCRIPT-009: positional '-- --help' must succeed: ${planHelpAfterTerminator.stderr}`);
    const rootHelp = spawnSync(process.execPath, [agySquadCli, "--help"], { cwd: w2Root, encoding: "utf8" });
    assert.match(rootHelp.stdout, /\binstall\b/, "S2-DEP-003: --help usage must mention install alias");

    // W4 Regressions (OPT-RT-01/05/06): batched bundle-init --digest and verify --prune [--keep-reports]
    const batchDir = path.join(w2Root, "..", `w4-batch-${process.pid}`);
    fs.mkdirSync(batchDir, { recursive: true });
    try {
      const bWrite = (rel, c) => {
        const dest = path.join(batchDir, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, c, "utf8");
      };
      bWrite("src/x.js", "export const x = 42;\n");
      bWrite("m.json", JSON.stringify({
        squads: { alpha: { specialists: [{ role: "Spec", objective: "Verify", scopeFiles: ["src/x.js"] }] } }
      }));
      const realBatchPlan = spawnSync(process.execPath, [agySquadCli, "plan", "--manifest", "m.json"], { cwd: batchDir, encoding: "utf8" });
      assert.equal(realBatchPlan.status, 0, realBatchPlan.stderr);
      bWrite("scratch/plan.json", realBatchPlan.stdout);
      const parsedPlan = JSON.parse(realBatchPlan.stdout);
      const bS1 = parsedPlan.workers[0].specialists[0].reportSlot;
      const bLead = reportPath("alpha");
      const bAudit = parsedPlan.integrityAuditPlan[0].reportSlot;
      bWrite(bS1, "# Spec\nVerified src/x.js.\n");
      bWrite(bLead, "Content Verdict: PASS\nVerified cleanly.\n");

      // S2-TEST-005: bundle-init --out must reject symlink destination
      const symOutTarget = path.join(batchDir, "..", `w4-out-esc-${process.pid}.json`);
      fs.writeFileSync(symOutTarget, "{}\n", "utf8");
      let outSymCreated = false;
      try {
        fs.symlinkSync(symOutTarget, path.join(batchDir, "scratch", "sym-out.json"), "file");
        outSymCreated = true;
      } catch (err) {
        if (err?.code !== "EPERM") throw err;
      }
      if (outSymCreated) {
        const symOutRes = spawnSync(
          process.execPath,
          [agySquadCli, "bundle-init", "--plan", "scratch/plan.json", "--out", "scratch/sym-out.json", "--replace", "src/x.js"],
          { cwd: batchDir, encoding: "utf8" }
        );
        assert.notEqual(symOutRes.status, 0, "S2-TEST-005: bundle-init --out symlink must reject");
        assert.match(symOutRes.stderr, /symlink|ELOOP/i);
      }
      fs.rmSync(symOutTarget, { force: true });
      const initDigestRes = spawnSync(
        process.execPath,
        [
          agySquadCli,
          "bundle-init",
          "--plan", "scratch/plan.json",
          "--handoff", `${parsedPlan.workers[0].specialists[0].workerName}=READY ${bS1} — Ok.`,
          "--digest",
          "--out", "scratch/rec.json",
          "src/x.js"
        ],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.equal(initDigestRes.status, 0, `OPT-RT-01 bundle-init --digest failed: ${initDigestRes.stderr}`);
      const initDigestOut = JSON.parse(initDigestRes.stdout);
      assert.match(initDigestOut.evidenceDigest, /^[0-9a-f]{64}$/);
      bWrite(bAudit, `Target Squad: alpha\nEvidence Digest: ${initDigestOut.evidenceDigest}\nIntegrity Verdict: CLEAN\n`);
      const bundledBatch = JSON.parse(spawnSync(process.execPath, [agySquadCli, "bundle", "scratch/rec.json"], { cwd: batchDir, encoding: "utf8" }).stdout);
      const verifyPruneNoHash = spawnSync(process.execPath, [agySquadCli, "verify", bundledBatch.path, "--prune"], { cwd: batchDir, encoding: "utf8" });
      assert.notEqual(verifyPruneNoHash.status, 0, "ASQ-SEC-002: verify --prune without expected sha256 must fail closed");
      assert.match(verifyPruneNoHash.stderr, /expectedSha256/);
      const verifyKeep = spawnSync(process.execPath, [agySquadCli, "verify", bundledBatch.path, "--expected-sha256", bundledBatch.sha256, "--prune", "--keep-reports"], { cwd: batchDir, encoding: "utf8" });
      assert.equal(verifyKeep.status, 0, verifyKeep.stderr);
      assert.deepEqual(JSON.parse(verifyKeep.stdout).pruned.removed, []);
      assert.equal(fs.existsSync(path.join(batchDir, bS1)), true);
      const verifyPrune = spawnSync(process.execPath, [agySquadCli, "verify", bundledBatch.path, bundledBatch.sha256, "--prune"], { cwd: batchDir, encoding: "utf8" });
      assert.equal(verifyPrune.status, 0, verifyPrune.stderr);
      assert.deepEqual(JSON.parse(verifyPrune.stdout).pruned.removed, [bS1]);
      assert.equal(fs.existsSync(path.join(batchDir, bS1)), false);
      const keepOnlyErr = spawnSync(process.execPath, [agySquadCli, "verify", bundledBatch.path, "--keep-reports"], { cwd: batchDir, encoding: "utf8" });
      assert.notEqual(keepOnlyErr.status, 0, "verify --keep-reports without --prune must fail closed");

      // Batch B TEST-002: CLI subprocess negative tests for verify --expected-sha256 & finalize --allow-unaudited
      const verifyConflict = spawnSync(
        process.execPath,
        [agySquadCli, "verify", bundledBatch.path, bundledBatch.sha256, "--expected-sha256", bundledBatch.sha256],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(verifyConflict.status, 0, "TEST-002: positional + --expected-sha256 conflict must fail");
      assert.match(verifyConflict.stderr, /not both/);
      const verifyUpper = spawnSync(
        process.execPath,
        [agySquadCli, "verify", bundledBatch.path, "--expected-sha256", bundledBatch.sha256.toUpperCase(), "--prune"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(verifyUpper.status, 0, "TEST-002: uppercase --expected-sha256 must fail");
      const verifyEmpty = spawnSync(
        process.execPath,
        [agySquadCli, "verify", bundledBatch.path, "--expected-sha256", "", "--prune"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(verifyEmpty.status, 0, "TEST-002: empty --expected-sha256 must fail");
      const verifyMismatch = spawnSync(
        process.execPath,
        [agySquadCli, "verify", bundledBatch.path, "--expected-sha256", "0".repeat(64)],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(verifyMismatch.status, 0, "TEST-002: mismatched --expected-sha256 must fail");
      assert.match(verifyMismatch.stderr, /accepted digest/);

      bWrite(bS1, "# Spec 1\nVerified src/x.js.\n");
      fs.rmSync(path.join(batchDir, bAudit), { force: true });
      const finMissingAudit = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "scratch/rec.json", "--replace"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(finMissingAudit.status, 0, "TEST-002: finalize without --allow-unaudited when audit missing must fail");
      const finKeepNoPrune = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "scratch/rec.json", "--allow-unaudited", "--keep-reports"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(finKeepNoPrune.status, 0, "TEST-002: finalize --keep-reports without --prune must fail");
      const finUnaudited = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "scratch/rec.json", "--allow-unaudited", "--replace", "--prune"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.equal(finUnaudited.status, 0, `TEST-002: finalize --allow-unaudited --replace --prune failed: ${finUnaudited.stderr}`);
      const finUnauditedJson = JSON.parse(finUnaudited.stdout);
      assert.equal(finUnauditedJson.bundled.auditPolicy, "unaudited-explicit");
      assert.deepEqual(finUnauditedJson.pruned.removed, [bS1]);

      // Batch B SCRIPT-003, SCRIPT-004, SCRIPT-006, SEC-006, SEC-007
      const replaceNoOut = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "scratch/plan.json", "--replace", "src/x.js"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(replaceNoOut.status, 0, "SCRIPT-004: bundle-init --replace without --out must fail");
      assert.match(replaceNoOut.stderr, /--replace.*requires '--out/);

      const childPlanPath = path.join(batchDir, "plan-child.json");
      fs.copyFileSync(path.join(batchDir, "scratch/plan.json"), childPlanPath);
      const childFallback = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--workspace", batchDir, "--plan", `${path.basename(batchDir)}/plan-child.json`, "src/x.js"],
        { cwd: path.dirname(batchDir), encoding: "utf8" }
      );
      assert.equal(childFallback.status, 0, `SCRIPT-003: direct child-dir --workspace cwd fallback failed: ${childFallback.stderr}`);
      assert.equal(JSON.parse(childFallback.stdout).squadId, "alpha");

      const dashHRoleInline = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--role=-h", "--scope", "src/x.js", "Audit role flag"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.equal(dashHRoleInline.status, 0, `SCRIPT-006: --role=-h must succeed: ${dashHRoleInline.stderr}`);
      const dashHRoleSpaced = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--role", "-h", "--scope", "src/x.js", "Audit role flag"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(dashHRoleSpaced.status, 0);
      assert.match(dashHRoleSpaced.stderr, /argument is ambiguous/, "SCRIPT-006: arity-aware hasHelpFlag must not misreport --role -h as --help conflict");
      assert.doesNotMatch(dashHRoleSpaced.stderr, /Conflicting flags/);
      const dashHConflict = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--role=-h", "--help"],
        { cwd: batchDir, encoding: "utf8" }
      );
      assert.notEqual(dashHConflict.status, 0, "SCRIPT-006: trailing --help after --role=-h must still conflict");
      assert.match(dashHConflict.stderr, /Conflicting flags/);

      for (const driveRel of ["C:scratch/agy-squad", "c:foo/bar"]) {
        assert.throws(() => normalizeReportRoot(driveRel), /workspace-relative reportRoot/, `SEC-006: normalizeReportRoot must reject ${driveRel}`);
        assert.throws(() => readFile(batchDir, driveRel), /workspace-relative file path/, `SEC-006: readFile must reject ${driveRel}`);
        assert.throws(() => ensureDirectory(batchDir, driveRel), /Invalid workspace directory/, `SEC-006: ensureDirectory must reject ${driveRel}`);
      }
      const outsideSafeFile = path.join(path.dirname(batchDir), `sec007-outside-${process.pid}.txt`);
      fs.writeFileSync(outsideSafeFile, "outside\n", "utf8");
      try {
        assert.equal(
          readRegularFileSafe(path.join(batchDir, "src/x.js"), "src/x.js", { allowedRoot: batchDir }).toString("utf8"),
          "export const x = 42;\n"
        );
        assert.throws(
          () => readRegularFileSafe(outsideSafeFile, "outside.txt", { allowedRoot: batchDir }),
          /inside the workspace/,
          "SEC-007: readRegularFileSafe with allowedRoot must reject paths outside root"
        );
      } finally {
        fs.rmSync(outsideSafeFile, { force: true });
      }
      // Batch B OPT-IO-06 & OPT-IO-10e: size-hinted readOpenedFileWithStat on 0-byte & >64KB files; selective squad hydration
      bWrite("src/empty.txt", "");
      const largeBody = "0123456789abcdef".repeat(9000);
      bWrite("src/large.txt", largeBody);
      assert.equal(readOpenedFileWithStat(path.join(batchDir, "src/empty.txt"), "src/empty.txt").bytes.length, 0);
      assert.equal(readOpenedFileWithStat(path.join(batchDir, "src/large.txt"), "src/large.txt").bytes.toString("utf8"), largeBody);
      const multiHydrateRec = buildBundleRecordInit(batchDir, {
        plan: {
          executionMode: "swarm",
          workspace: batchDir,
          workers: [
            { squadId: "target_sq", specialists: [{ workerName: "t-1", reportSlot: reportPath("target_sq", 1) }] },
            { squadId: "unrelated_sq", specialists: ["not-a-plain-object-skipped-when-unselected"] }
          ]
        },
        squadId: "target_sq",
        files: ["src/x.js"]
      });
      assert.equal(multiHydrateRec.squadId, "target_sq");
      assert.equal(multiHydrateRec.assignments.length, 1);
    } finally {
      fs.rmSync(batchDir, { recursive: true, force: true });
    }

    // Wave 2 Regressions: W2-SCRIPT-001 (collect/bundle-init --report-root ./), W2-SVC-002, S2R-SCRIPT-002, OPT-GAP-L46-CLI
    const w2CliDir = path.join(w2Root, "..", `w2-cli-${process.pid}`);
    const w2CliWt = path.join(w2Root, "..", `w2-cli-wt-${process.pid}`);
    const w2OutsideJson = path.join(w2Root, "..", `w2-outside-plan-${process.pid}.json`);
    fs.mkdirSync(w2CliDir, { recursive: true });
    fs.mkdirSync(w2CliWt, { recursive: true });
    try {
      const cWrite = (base, rel, c) => {
        const dest = path.join(base, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, c, "utf8");
      };
      cWrite(w2CliDir, "src/w2.js", "export const w2 = 1;\n");
      const customRoot = "scratch/w2-custom";
      const customPlan = {
        executionMode: "swarm",
        workers: [{ squadId: "alpha", specialists: [{ workerName: "alpha-spec", reportSlot: `${customRoot}/squad-alpha/specialist-1/report.md` }] }],
        bundleRecordTemplates: {
          alpha: {
            squadId: "alpha",
            workspace: w2CliDir,
            reportRoot: customRoot,
            verdict: "PASS",
            verifiedFiles: {},
            assignments: [{ conversationId: "alpha-spec", report: `${customRoot}/squad-alpha/specialist-1/report.md` }],
            handoffs: [],
            requireIntegrityAudit: false
          }
        }
      };
      cWrite(w2CliDir, "scratch/custom-plan.json", JSON.stringify(customPlan));
      cWrite(w2CliWt, `${customRoot}/squad-alpha/specialist-1/report.md`, "# Custom Spec\nVerified w2.\n");

      const dotCollect = spawnSync(
        process.execPath,
        [agySquadCli, "collect", "--squad", "alpha", "--report-root", `./${customRoot}`, "--from", w2CliWt],
        { cwd: w2CliDir, encoding: "utf8" }
      );
      assert.equal(dotCollect.status, 0, `W2-SCRIPT-001: collect --report-root ./ failed: ${dotCollect.stderr}`);
      assert.equal(dotCollect.status === 0 && JSON.parse(dotCollect.stdout).collected.length, 1);

      const dotBundleInit = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "scratch/custom-plan.json", "--report-root", `./${customRoot}`, "--allow-unaudited", "src/w2.js"],
        { cwd: w2CliDir, encoding: "utf8" }
      );
      assert.equal(dotBundleInit.status, 0, `W2-SCRIPT-001: bundle-init --report-root ./ failed: ${dotBundleInit.stderr}`);
      assert.equal(JSON.parse(dotBundleInit.stdout).reportRoot, customRoot);

      // W2-SVC-002: buildBundleRecordInit validates idMap and template as plain non-null objects
      for (const badMap of [null, [], "invalid"]) {
        assert.throws(
          () => buildBundleRecordInit(w2CliDir, { plan: customPlan, idMap: badMap }),
          /idMap must be a plain object/,
          `W2-SVC-002: idMap=${JSON.stringify(badMap)} must throw plain-object error instead of TypeError`
        );
      }
      for (const badTpl of [null, [], "bad"]) {
        assert.throws(
          () => buildBundleRecordInit(w2CliDir, {
            plan: { ...customPlan, bundleRecordTemplates: { alpha: badTpl } }
          }),
          /bundleRecordTemplates.*must be a plain object/,
          `W2-SVC-002: template=${JSON.stringify(badTpl)} must throw plain-object error`
        );
      }
      assert.throws(
        () => buildBundleRecordInit(w2CliDir, {
          plan: {
            ...customPlan,
            bundleRecordTemplates: {
              alpha: { ...customPlan.bundleRecordTemplates.alpha, assignments: [null] }
            }
          }
        }),
        /assignment must be a plain object/,
        "W2-SVC-002: non-object assignment entry must throw plain-object error instead of TypeError"
      );
      assert.throws(
        () => buildBundleRecordInit(w2CliDir, {
          plan: JSON.parse(JSON.stringify({
            executionMode: "swarm",
            bundleRecordTemplates: {
              ["__proto__"]: {
                squadId: "__proto__",
                workspace: w2CliDir,
                verdict: "PASS",
                assignments: []
              }
            }
          }))
        }),
        /Invalid reserved squad ID/,
        "W2-SVC-002: auto-selected single template key must still validate squadId"
      );

      // S2R-SCRIPT-002: plan/dispatch --unknown-flag emit Usage lines and unknown command mentions install
      const badPlanFlag = spawnSync(process.execPath, [agySquadCli, "plan", "--unknown-flag", "Audit"], { cwd: w2CliDir, encoding: "utf8" });
      assert.notEqual(badPlanFlag.status, 0);
      assert.match(badPlanFlag.stderr, /Usage: agy-squad plan/, "S2R-SCRIPT-002: plan unknown flag must show usage line");
      const badDispatchFlag = spawnSync(process.execPath, [agySquadCli, "dispatch", "--unknown-flag", "alpha"], { cwd: w2CliDir, encoding: "utf8" });
      assert.notEqual(badDispatchFlag.status, 0);
      assert.match(badDispatchFlag.stderr, /Usage: agy-squad dispatch/, "S2R-SCRIPT-002: dispatch unknown flag must show usage line");
      const unknownCmd = spawnSync(process.execPath, [agySquadCli, "boguscmd"], { cwd: w2CliDir, encoding: "utf8" });
      assert.notEqual(unknownCmd.status, 0);
      assert.match(unknownCmd.stderr, /\binstall\b/, "S2R-SCRIPT-002: unknown command error must include install");

      // OPT-GAP-L46-CLI: readRegularJsonFileSafe rejects symlinked --plan outside workspace
      fs.writeFileSync(w2OutsideJson, JSON.stringify(customPlan), "utf8");
      const symOutsidePlan = path.join(w2CliDir, "..", `w2-outside-sym-${process.pid}.json`);
      let outsideSymCreated = false;
      try {
        fs.symlinkSync(w2OutsideJson, symOutsidePlan, "file");
        outsideSymCreated = true;
      } catch (err) {
        if (err?.code !== "EPERM") throw err;
      }
      if (outsideSymCreated) {
        const symPlanRes = spawnSync(
          process.execPath,
          [agySquadCli, "bundle-init", "--plan", symOutsidePlan, "--allow-unaudited"],
          { cwd: w2CliDir, encoding: "utf8" }
        );
        assert.notEqual(symPlanRes.status, 0, "OPT-GAP-L46-CLI: symlinked external --plan must be rejected");
        fs.rmSync(symOutsidePlan, { force: true });
      }

      // v0.1.3 Remediation Regressions: RUN-001, RUN-003, SVC-001, SVC-002, S2-TEST-02
      // RUN-001: collectReportSlots must reject arbitrary non-report files across plan, record, and reportRoot override
      fs.mkdirSync(path.join(w2CliWt, "src"), { recursive: true });
      fs.writeFileSync(path.join(w2CliWt, "src/arbitrary-non-slot.txt"), "do not copy into coord\n", "utf8");
      const badSlotPlan = {
        executionMode: "swarm",
        workers: [{ squadId: "alpha", specialists: [{ reportSlot: "src/arbitrary-non-slot.txt" }] }]
      };
      assert.throws(
        () => collectReportSlots(w2CliDir, { sources: [w2CliWt], plan: badSlotPlan }),
        /Invalid report slot path/,
        "RUN-001: non-report plan slot must be rejected fail-closed"
      );
      assert.throws(
        () => collectReportSlots(w2CliDir, { sources: [w2CliWt], plan: badSlotPlan, reportRoot: "scratch/custom" }),
        /Invalid report slot path/,
        "RUN-001: non-report plan slot with reportRoot override must be rejected fail-closed"
      );
      assert.throws(
        () => collectReportSlots(w2CliDir, {
          sources: [w2CliWt],
          record: {
            squadId: "alpha",
            assignments: [{ conversationId: "w1", report: "src/arbitrary-non-slot.txt" }]
          }
        }),
        /Invalid report slot path/,
        "RUN-001: non-report record assignment slot must be rejected fail-closed"
      );
      assert.throws(
        () => collectReportSlots(w2CliDir, {
          sources: [w2CliWt],
          record: {
            squadId: "alpha",
            assignments: [],
            integrityAuditSlots: ["scratch/agy-squad/squad-alpha/specialist-0/report.md"]
          }
        }),
        /Invalid report slot path/,
        "RUN-001: invalid specialist-0 slot must be rejected fail-closed"
      );
      for (const malformedSlot of [
        " scratch/agy-squad/squad-alpha/lead/report.md",
        "C:scratch/agy-squad/squad-alpha/lead/report.md"
      ]) {
        assert.throws(
          () => collectReportSlots(w2CliDir, {
            sources: [w2CliWt],
            plan: { executionMode: "swarm", workers: [{ squadId: "alpha", lead: { reportSlot: malformedSlot } }] }
          }),
          /Invalid report slot path/,
          `RUN-001: malformed reportRoot slot '${malformedSlot}' must be rejected fail-closed`
        );
      }
      assert.equal(fs.existsSync(path.join(w2CliDir, "src/arbitrary-non-slot.txt")), false, "RUN-001: non-report file must never be copied into coordinator workspace");

      // SVC-001, SVC-002, RUN-003 & S2-TEST-02: explicit integrityAuditSlots validated even when requireIntegrityAudit: false, and verifyBundle rejects non-CLEAN audit.verdict
      const s2Squad = "svc_audit_check";
      const s2Spec = reportPath(s2Squad, 1);
      const s2Lead = reportPath(s2Squad);
      const s2BadAudit = reportPath(`integrity_auditor-${s2Squad}`, 1);
      const s2CleanAudit = reportPath(`integrity_auditor-${s2Squad}`, 2);
      const s2Write = (rel, body) => {
        const abs = path.join(w2CliDir, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body, "utf8");
      };
      s2Write(s2Spec, "Evidence: ok.\n");
      s2Write(s2Lead, "Content Verdict: PASS\nVerified.\n");
      const s2Rec = {
        squadId: s2Squad,
        workspace: w2CliDir,
        verdict: "PASS",
        verifiedFiles: fingerprint(w2CliDir, ["src/w2.js"]),
        assignments: [{ conversationId: "s1", report: s2Spec }],
        handoffs: [{ sender: "s1", message: `READY ${s2Spec} — ok` }],
        requireIntegrityAudit: false
      };
      const { evidenceDigest: s2Digest } = computeEvidenceDigest(w2CliDir, s2Rec);
      s2Write(s2BadAudit, `Target Squad: ${s2Squad}\nEvidence Digest: ${s2Digest}\nIntegrity Verdict: INTEGRITY VIOLATION\nBad trace.\n`);
      s2Write(s2CleanAudit, `Target Squad: ${s2Squad}\nEvidence Digest: ${s2Digest}\nIntegrity Verdict: CLEAN\nVerified traces.\n`);

      assert.throws(
        () => bundleReports(w2CliDir, { ...s2Rec, integrityAuditSlots: [s2BadAudit] }),
        /INTEGRITY VIOLATION/,
        "SVC-001: explicit integrityAuditSlots must fail closed even when requireIntegrityAudit is false"
      );
      const s2ExplicitClean = bundleReports(w2CliDir, { ...s2Rec, integrityAuditSlots: [s2CleanAudit] });
      assert.equal(s2ExplicitClean.auditPolicy, "required", "SVC-001: explicit CLEAN integrityAuditSlots must record auditPolicy 'required'");
      const s2Verified = verifyBundle(w2CliDir, s2ExplicitClean.path);
      assert.equal(s2Verified.auditPolicy, "required");

      // SVC-002: Mutating audit.verdict in report.sources.json to INTEGRITY VIOLATION (or removing verdict) must fail verifyBundle
      const s2BundleAbs = path.join(w2CliDir, s2ExplicitClean.path);
      const s2BundleObj = JSON.parse(fs.readFileSync(s2BundleAbs, "utf8"));
      const tamperedViolation = {
        ...s2BundleObj,
        integrityAudit: { ...s2BundleObj.integrityAudit, verdict: "INTEGRITY VIOLATION" },
        integrityAudits: s2BundleObj.integrityAudits.map(a => ({ ...a, verdict: "INTEGRITY VIOLATION" }))
      };
      fs.writeFileSync(s2BundleAbs, JSON.stringify(tamperedViolation, null, 2) + "\n", "utf8");
      assert.throws(
        () => verifyBundle(w2CliDir, s2ExplicitClean.path),
        /is not CLEAN/,
        "SVC-002: verifyBundle must reject integrityAudit entries whose verdict is not CLEAN"
      );
      const tamperedMissingVerdict = {
        ...s2BundleObj,
        integrityAudit: { ...s2BundleObj.integrityAudit, verdict: undefined },
        integrityAudits: s2BundleObj.integrityAudits.map(({ verdict: _v, ...rest }) => rest)
      };
      fs.writeFileSync(s2BundleAbs, JSON.stringify(tamperedMissingVerdict, null, 2) + "\n", "utf8");
      assert.throws(
        () => verifyBundle(w2CliDir, s2ExplicitClean.path),
        /is not CLEAN/,
        "SVC-002: verifyBundle must reject v2 integrityAudit entries missing verdict"
      );
      const tamperedContradictoryPolicy = {
        ...s2BundleObj,
        auditPolicy: "unaudited-explicit"
      };
      fs.writeFileSync(s2BundleAbs, JSON.stringify(tamperedContradictoryPolicy, null, 2) + "\n", "utf8");
      assert.throws(
        () => verifyBundle(w2CliDir, s2ExplicitClean.path),
        /unaudited-explicit.*cannot embed integrityAudit/,
        "SVC-001/SVC-002: verifyBundle must reject v2 unaudited-explicit bundles embedding integrityAudit"
      );
      const { evidenceDigest: _dropDigest, ...auditMissingDigest } = s2BundleObj.integrityAudit;
      fs.writeFileSync(
        s2BundleAbs,
        JSON.stringify({ ...s2BundleObj, integrityAudit: auditMissingDigest }, null, 2) + "\n",
        "utf8"
      );
      assert.throws(
        () => verifyBundle(w2CliDir, s2ExplicitClean.path),
        /disagrees with integrityAudits\[0\]/,
        "SVC-002: verifyBundle must reject v2 integrityAudit missing evidenceDigest relative to integrityAudits[0]"
      );

      // UX-SQ-015: agy-squad finalize <record.json> runs inspect -> bundle -> verify (+ optional --prune [--keep-reports]) in one call
      const finDir = path.join(w2Root, "..", `ux-finalize-${process.pid}`);
      fs.mkdirSync(finDir, { recursive: true });
      try {
        const finWrite = (rel, content) => {
          const dest = path.join(finDir, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, content, "utf8");
        };
        finWrite("src/auth.js", "export function verifyToken(t) { return Boolean(t); }\n");
        const finS1 = reportPath("auth", 1);
        const finLead = reportPath("auth");
        const finAudit = reportPath("integrity_auditor", 1);
        finWrite(finS1, "# Auth Specialist\nVerified src/auth.js:1.\n");
        finWrite(finLead, "# Auth Lead\nContent Verdict: PASS\nVerified src/auth.js.\n");
        const finRec = {
          squadId: "auth",
          workspace: finDir,
          verdict: "PASS",
          requireIntegrityAudit: true,
          verifiedFiles: fingerprint(finDir, ["src/auth.js"]),
          assignments: [{ conversationId: "auth-spec-1", report: finS1 }],
          handoffs: [{ sender: "auth-spec-1", message: `@coordinator READY ${finS1} — src/auth.js:1 verified` }]
        };
        finWrite("scratch/fin-record.json", JSON.stringify(finRec, null, 2) + "\n");

        // 1. Fail closed when integrity audit is missing (no --allow-unaudited)
        const finMissingAudit = spawnSync(process.execPath, [agySquadCli, "finalize", "scratch/fin-record.json"], { cwd: finDir, encoding: "utf8" });
        assert.notEqual(finMissingAudit.status, 0, "UX-SQ-015: finalize must fail closed when integrity audit is missing");
        assert.equal(fs.existsSync(path.join(finDir, "scratch/agy-squad/squad-auth/lead/report.sources.json")), false);

        // 2. Fail closed when handoff receipt is malformed (before writing any bundle)
        const badHandoffRec = { ...finRec, handoffs: [{ sender: "auth-spec-1", message: "bad receipt" }] };
        finWrite("scratch/fin-bad-handoff.json", JSON.stringify(badHandoffRec, null, 2) + "\n");
        const finBadHandoff = spawnSync(process.execPath, [agySquadCli, "finalize", "scratch/fin-bad-handoff.json", "--allow-unaudited"], { cwd: finDir, encoding: "utf8" });
        assert.notEqual(finBadHandoff.status, 0, "UX-SQ-015: finalize must fail closed on invalid handoff receipt");
        assert.equal(fs.existsSync(path.join(finDir, "scratch/agy-squad/squad-auth/lead/report.sources.json")), false);

        // 3. Reject --keep-reports without --prune
        const finBadFlags = spawnSync(process.execPath, [agySquadCli, "finalize", "scratch/fin-record.json", "--keep-reports"], { cwd: finDir, encoding: "utf8" });
        assert.notEqual(finBadFlags.status, 0, "UX-SQ-015: finalize --keep-reports without --prune must fail");
        assert.match(finBadFlags.stderr, /--keep-reports.*requires '--prune'/);

        // 4. Write valid CLEAN integrity audit with matching Evidence Digest and finalize cleanly (no prune)
        const finDigest = computeEvidenceDigest(finDir, finRec).evidenceDigest;
        finWrite(finAudit, `# Integrity Audit\nTarget Squad: auth\nEvidence Digest: ${finDigest}\nIntegrity Verdict: CLEAN\n`);
        const finOk = spawnSync(process.execPath, [agySquadCli, "finalize", "./scratch/fin-record.json"], { cwd: finDir, encoding: "utf8" });
        assert.equal(finOk.status, 0, `UX-SQ-015: audited finalize failed: ${finOk.stderr}`);
        const finOkJson = JSON.parse(finOk.stdout);
        assert.equal(finOkJson.inspected.length, 1);
        assert.equal(finOkJson.inspected[0].status, "READY");
        assert.equal(finOkJson.bundled.auditPolicy, "required");
        assert.equal(finOkJson.verified.sha256, finOkJson.bundled.sha256);
        assert.equal(finOkJson.verified.auditPolicy, "required");
        assert.equal(finOkJson.pruned, null);
        assert.equal(fs.existsSync(path.join(finDir, finS1)), true, "Without --prune, loose specialist report stays on disk");

        // 5. Finalize with --allow-unaudited --replace --prune --keep-reports
        const finKeep = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-record.json", "--allow-unaudited", "--replace", "--prune", "--keep-reports"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(finKeep.status, 0, `UX-SQ-015: finalize --allow-unaudited --prune --keep-reports failed: ${finKeep.stderr}`);
        const finKeepJson = JSON.parse(finKeep.stdout);
        assert.equal(finKeepJson.verified.auditPolicy, "unaudited-explicit");
        assert.deepEqual(finKeepJson.pruned.removed, []);
        assert.deepEqual(finKeepJson.pruned.retained, [finS1]);
        assert.equal(fs.existsSync(path.join(finDir, finS1)), true);

        // 6. Finalize audited with --replace --prune removes verified loose specialist report
        const finPrune = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-record.json", "--replace", "--prune"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(finPrune.status, 0, `UX-SQ-015: finalize --replace --prune failed: ${finPrune.stderr}`);
        const finPruneJson = JSON.parse(finPrune.stdout);
        assert.equal(finPruneJson.verified.auditPolicy, "required");
        assert.deepEqual(finPruneJson.pruned.removed, [finS1]);
        assert.equal(fs.existsSync(path.join(finDir, finS1)), false, "With --prune, loose specialist report must be unlinked");

        // 7. Fail closed when lead verdict is FAIL without --allow-non-passing
        finWrite(finS1, "# Auth Specialist\nVerified src/auth.js:1.\n");
        finWrite(finLead, "# Auth Lead\nContent Verdict: FAIL\nBlocker found.\n");
        const finFailRec = { ...finRec, verdict: "FAIL" };
        finWrite("scratch/fin-fail-record.json", JSON.stringify(finFailRec, null, 2) + "\n");
        const finFailVerdict = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-fail-record.json", "--allow-unaudited", "--replace"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.notEqual(finFailVerdict.status, 0, "UX-SQ-015: finalize must reject FAIL verdict unless --allow-non-passing");

        // 8. Round-2 Section 4.9 gap: finalize positive --allow-non-passing, --predecessor match & mismatch, and positive --allow-partial
        const finAllowNonPass = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-fail-record.json", "--allow-unaudited", "--allow-non-passing", "--replace"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(finAllowNonPass.status, 0, `Round-2 gap: finalize --allow-non-passing failed: ${finAllowNonPass.stderr}`);
        const finAllowNonPassJson = JSON.parse(finAllowNonPass.stdout);
        const currentBundleSha = finAllowNonPassJson.bundled.sha256;
        assert.equal(finAllowNonPassJson.verified.sha256, currentBundleSha);

        const wrongPredecessor = "0".repeat(64);
        const finPredMismatch = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-fail-record.json", "--allow-unaudited", "--allow-non-passing", "--replace", "--predecessor", wrongPredecessor],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.notEqual(finPredMismatch.status, 0, "Round-2 gap: finalize --predecessor mismatch must fail closed");
        assert.match(finPredMismatch.stderr, /predecessor|sha-?256|changed|mismatch/i);

        const finPredMatch = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-fail-record.json", "--allow-unaudited", "--allow-non-passing", "--replace", "--predecessor", currentBundleSha],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(finPredMatch.status, 0, `Round-2 gap: finalize --predecessor match failed: ${finPredMatch.stderr}`);

        const partialRec = {
          ...finRec,
          verdict: "PASS",
          handoffs: [{ sender: "auth-spec-1", message: `@coordinator PARTIAL ${finS1} — Blocked by missing fixture` }]
        };
        finWrite(finLead, "# Auth Lead\nContent Verdict: PASS\nAccepted partial coverage.\n");
        finWrite("scratch/fin-partial-record.json", JSON.stringify(partialRec, null, 2) + "\n");
        const finPartialRejected = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-partial-record.json", "--allow-unaudited", "--replace"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.notEqual(finPartialRejected.status, 0, "Round-2 gap: finalize must reject PARTIAL handoff without --allow-partial");

        const finPartialOk = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/fin-partial-record.json", "--allow-unaudited", "--allow-partial", "--replace"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(finPartialOk.status, 0, `Round-2 gap: finalize --allow-partial failed: ${finPartialOk.stderr}`);
        assert.equal(JSON.parse(finPartialOk.stdout).inspected[0].status, "PARTIAL");

        // 9. UX-SQ-R2-001 & UX-SQ-R2-002: end-to-end Quickstart plan -> bundle-init --digest (fail on empty handoffs, succeed with --handoff) -> finalize
        const qsPlanRes = spawnSync(
          process.execPath,
          [agySquadCli, "plan", "--mode", "swarm", "--read-only", "--scope", "src", "--role", "Security", "--role", "Test Audit", "Audit authentication flow"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(qsPlanRes.status, 0, qsPlanRes.stderr);
        finWrite("scratch/qs-plan.json", qsPlanRes.stdout);
        const qsPlan = JSON.parse(qsPlanRes.stdout);
        assert.deepEqual(qsPlan.warnings, []);
        const qsSpec1 = qsPlan.workers[0].specialists[0];
        const qsSpec2 = qsPlan.workers[0].specialists[1];
        const qsLeadSlot = reportPath("task_squad");
        const qsAuditSlot = qsPlan.integrityAuditPlan[0].reportSlot;
        assert.equal(qsAuditSlot, "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md");
        finWrite(qsSpec1.reportSlot, "# Security Reviewer\nVerified src/auth.js.\n");
        finWrite(qsSpec2.reportSlot, "# Test Reviewer\nVerified src/auth.js tests.\n");
        finWrite(qsLeadSlot, "# Lead\nContent Verdict: PASS\nBoth reviewers verified src/auth.js.\n");

        const emptyHandoffsDigest = spawnSync(
          process.execPath,
          [agySquadCli, "bundle-init", "--plan", "scratch/qs-plan.json", "--digest", "--out", "scratch/qs-rec.json", "src/auth.js"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.notEqual(emptyHandoffsDigest.status, 0, "UX-SQ-R2-001: bundle-init --digest without handoffs must fail closed");
        assert.match(emptyHandoffsDigest.stderr, /--handoffs <file\.json>/);
        assert.match(emptyHandoffsDigest.stderr, /--handoff <worker=READY \.\.\.>/);
        assert.equal(fs.existsSync(path.join(finDir, "scratch/qs-rec.json")), false);

        const qsInitOk = spawnSync(
          process.execPath,
          [
            agySquadCli,
            "bundle-init",
            "--plan", "scratch/qs-plan.json",
            "--handoff", `${qsSpec1.workerName}=@coordinator READY ${qsSpec1.reportSlot} — src/auth.js security checked`,
            "--handoff", `${qsSpec2.workerName}=@coordinator READY ${qsSpec2.reportSlot} — src/auth.js test coverage checked`,
            "--digest",
            "--out", "scratch/qs-rec.json",
            "src/auth.js"
          ],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(qsInitOk.status, 0, `UX-SQ-R2-001: bundle-init --digest with --handoff failed: ${qsInitOk.stderr}`);
        const qsInitJson = JSON.parse(qsInitOk.stdout);
        assert.match(qsInitJson.evidenceDigest, /^[0-9a-f]{64}$/);
        finWrite(qsAuditSlot, `# Audit\nTarget Squad: task_squad\nEvidence Digest: ${qsInitJson.evidenceDigest}\nIntegrity Verdict: CLEAN\n`);

        const qsFinalize = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "scratch/qs-rec.json", "--replace", "--prune"],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.equal(qsFinalize.status, 0, `UX-SQ-R2-001/002: Quickstart finalize failed: ${qsFinalize.stderr}`);
        const qsFinalizeJson = JSON.parse(qsFinalize.stdout);
        assert.equal(qsFinalizeJson.verified.auditPolicy, "required");
        assert.deepEqual(qsFinalizeJson.pruned.removed, [qsSpec1.reportSlot, qsSpec2.reportSlot]);

        // 10. RAW-SCRIPT-001, RAW-SCRIPT-003, RAW-SCRIPT-004, RAW-SVC-001, RAW-TEST-001 regressions
        const {
          assertNodeVersion: assertCliNodeVersion,
          isNodeVersionSupported: isCliNodeVersionSupported,
          normalizeBundleOutCliPath,
          normalizeWorkspaceCliPath
        } = await import("../bin/agy-squad.mjs");
        assert.equal(isCliNodeVersionSupported("20.18.0"), false);
        assert.equal(isCliNodeVersionSupported("22.0.0"), true);
        assert.equal(isCliNodeVersionSupported("22.0.0-rc.1"), true);
        assert.equal(isCliNodeVersionSupported("22.0.0junk"), false);
        assert.throws(() => assertCliNodeVersion("20.18.0"), /requires Node\.js >= 22\.0\.0 \(found v20\.18\.0\)/);
        assert.throws(() => assertCliNodeVersion(""), /requires Node\.js >= 22\.0\.0 \(found unknown\)/);

        assert.equal(normalizeWorkspaceCliPath(".\\", "win32"), ".");
        assert.equal(normalizeWorkspaceCliPath("./", "linux"), ".");
        assert.equal(normalizeWorkspaceCliPath(".\\scratch\\record.json", "win32"), "scratch/record.json");
        assert.equal(normalizeWorkspaceCliPath(".\\.\\src\\auth.js", "win32"), "src/auth.js");
        assert.equal(normalizeWorkspaceCliPath("C:src\\auth.js", "win32"), "C:src\\auth.js");
        assert.equal(normalizeWorkspaceCliPath("\\\\server\\share\\record.json", "win32"), "\\\\server\\share\\record.json");
        assert.equal(normalizeWorkspaceCliPath("src\\auth.js", "linux"), "src\\auth.js");
        assert.equal(normalizeBundleOutCliPath(".\\scratch\\record.json", "win32"), "scratch/record.json");
        assert.equal(normalizeBundleOutCliPath("scratch\\sub\\record.json", "win32"), "scratch/sub/record.json");
        for (const badOut of ["\\\\server\\share\\rec.json", "C:\\rec.json", "C:rec.json", "..\\rec.json", "scratch\\rec.txt", "scratch\\.json"]) {
          assert.throws(() => normalizeBundleOutCliPath(badOut, "win32"), /--out must be a workspace-relative \.json path/);
        }
        assert.throws(() => normalizeBundleOutCliPath("scratch\\record.json", "linux"), /--out must be a workspace-relative \.json path/);

        if (process.platform === "win32") {
          finWrite(qsSpec1.reportSlot, "# Security Reviewer\nVerified src/auth.js.\n");
          finWrite(qsSpec2.reportSlot, "# Test Reviewer\nVerified src/auth.js tests.\n");
          const winInitRes = spawnSync(
            process.execPath,
            [
              agySquadCli,
              "bundle-init",
              "--plan", ".\\scratch\\qs-plan.json",
              "--handoff", `${qsSpec1.workerName}=@coordinator READY ${qsSpec1.reportSlot} — src/auth.js win check`,
              "--handoff", `${qsSpec2.workerName}=@coordinator READY ${qsSpec2.reportSlot} — src/auth.js win test`,
              "--allow-unaudited",
              "--digest",
              "--out", ".\\scratch\\win-rec.json",
              ".\\src\\auth.js"
            ],
            { cwd: finDir, encoding: "utf8" }
          );
          assert.equal(winInitRes.status, 0, `RAW-SCRIPT-001: Windows bundle-init backslash paths failed: ${winInitRes.stderr}`);
          const winVerdictRes = spawnSync(
            process.execPath,
            [agySquadCli, "verdict", `.\\${qsLeadSlot.replace(/\//g, "\\")}`],
            { cwd: finDir, encoding: "utf8" }
          );
          assert.equal(winVerdictRes.status, 0, `RAW-SCRIPT-001: Windows verdict backslash path failed: ${winVerdictRes.stderr}`);
          const winFinalizeRes = spawnSync(
            process.execPath,
            [agySquadCli, "finalize", ".\\scratch\\win-rec.json", "--allow-unaudited", "--replace"],
            { cwd: finDir, encoding: "utf8" }
          );
          assert.equal(winFinalizeRes.status, 0, `RAW-SCRIPT-001: Windows finalize backslash path failed: ${winFinalizeRes.stderr}`);
        }

        // RAW-SCRIPT-003: bundle-init --help Example 2 includes <file> and --digest with zero verifiedFiles emits targeted hint
        const bundleInitHelp = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--help"], { cwd: finDir, encoding: "utf8" });
        assert.equal(bundleInitHelp.status, 0, bundleInitHelp.stderr);
        assert.match(bundleInitHelp.stdout, /--squad auth --handoffs scratch\/handoffs\.json src\/auth\.js/);

        finWrite(qsSpec1.reportSlot, "# Security Reviewer\nVerified src/auth.js.\n");
        finWrite(qsSpec2.reportSlot, "# Test Reviewer\nVerified src/auth.js tests.\n");
        const emptyFilesDigest = spawnSync(
          process.execPath,
          [
            agySquadCli,
            "bundle-init",
            "--plan", "scratch/qs-plan.json",
            "--handoff", `${qsSpec1.workerName}=READY ${qsSpec1.reportSlot} — ok`,
            "--handoff", `${qsSpec2.workerName}=READY ${qsSpec2.reportSlot} — ok`,
            "--digest"
          ],
          { cwd: finDir, encoding: "utf8" }
        );
        assert.notEqual(emptyFilesDigest.status, 0, "RAW-SCRIPT-003: bundle-init --digest without verifiedFiles must fail closed");
        assert.match(emptyFilesDigest.stderr, /requires at least one verified workspace file/);
        assert.match(emptyFilesDigest.stderr, /--file <path> or trailing <file\.\.\.>/);

        // RAW-SCRIPT-004: agy-squad help and agy-squad help <command>
        const helpTop = spawnSync(process.execPath, [agySquadCli, "help"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpTop.status, 0, helpTop.stderr);
        assert.match(helpTop.stdout, /agy-squad help \[<command>\]/);
        const helpPlan = spawnSync(process.execPath, [agySquadCli, "help", "plan"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpPlan.status, 0, helpPlan.stderr);
        assert.match(helpPlan.stdout, /Usage: agy-squad plan/);
        const helpSelf = spawnSync(process.execPath, [agySquadCli, "help", "help"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpSelf.status, 0, helpSelf.stderr);
        const helpFlag = spawnSync(process.execPath, [agySquadCli, "help", "--help"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpFlag.status, 0, helpFlag.stderr);
        const helpRun = spawnSync(process.execPath, [agySquadCli, "help", "run"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpRun.status, 1);
        assert.match(helpRun.stderr, /retired in Phase 2/);
        const helpBogus = spawnSync(process.execPath, [agySquadCli, "help", "bogus"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpBogus.status, 1);
        assert.match(helpBogus.stderr, /Unknown command 'bogus'/);
        const helpBadFlag = spawnSync(process.execPath, [agySquadCli, "help", "--bogus"], { cwd: finDir, encoding: "utf8" });
        assert.equal(helpBadFlag.status, 1);
        assert.match(helpBadFlag.stderr, /Conflicting flags/);

        // ASQ-SVC-003 (C1): Spaced ASCII '-' and '--' accepted alongside U+2014 '—'; non-accepted delimiters fail closed with hint, without false-positive on blank observations
        const baseDelimRec = {
          workspace: finDir,
          assignments: [{ conversationId: "w1", report: qsSpec1.reportSlot }]
        };
        for (const [msg, expectedStatus] of [
          [`READY ${qsSpec1.reportSlot} - ASCII dash`, "READY"],
          [`READY ${qsSpec1.reportSlot} -- double dash`, "READY"],
          [`PARTIAL ${qsSpec1.reportSlot} - partial ascii`, "PARTIAL"],
          [`PARTIAL ${qsSpec1.reportSlot} -- partial double`, "PARTIAL"],
          ["NO_REPORT - timed out", "NO_REPORT"],
          ["NO_REPORT -- timed out", "NO_REPORT"]
        ]) {
          assert.deepEqual(
            inspectHandoffs(finDir, { ...baseDelimRec, handoffs: [{ sender: "w1", message: msg }] }).map(r => r.status),
            [expectedStatus],
            `ASQ-SVC-003: expected '${msg}' to be accepted as ${expectedStatus}`
          );
        }
        for (const badDelimMsg of [
          `READY ${qsSpec1.reportSlot} : colon delimiter`,
          `PARTIAL ${qsSpec1.reportSlot} – en-dash delimiter`,
          `READY ${qsSpec1.reportSlot}-unspaced dash`,
          "NO_REPORT: colon reason",
          "NO_REPORT-unspaced reason"
        ]) {
          assert.throws(
            () => inspectHandoffs(finDir, { ...baseDelimRec, handoffs: [{ sender: "w1", message: badDelimMsg }] }),
            /Expected ' — ', ' -- ', or ' - ' delimiter/,
            `ASQ-SVC-003: non-accepted delimiter '${badDelimMsg}' must fail closed with delimiter hint`
          );
        }
        for (const nonMismatchMsg of [
          "NO_REPORT —   ",
          "NO_REPORT —",
          "NO_REPORT --",
          "NO_REPORT -",
          "NO_REPORT   ",
          `READY ${qsSpec1.reportSlot} —`,
          `READY ${qsSpec1.reportSlot} --`,
          `READY ${qsSpec1.reportSlot} -`,
          `READY ${qsSpec1.reportSlot}   `
        ]) {
          assert.throws(
            () => inspectHandoffs(finDir, { ...baseDelimRec, handoffs: [{ sender: "w1", message: nonMismatchMsg }] }),
            (err) => /Handoff must include/.test(err.message) && !/Expected ' — ', ' -- ', or ' - '/.test(err.message),
            `ASQ-SVC-003: '${nonMismatchMsg}' must not emit false-positive delimiter mismatch hint`
          );
        }
      } finally {
        fs.rmSync(finDir, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(w2CliDir, { recursive: true, force: true });
      fs.rmSync(w2CliWt, { recursive: true, force: true });
      fs.rmSync(w2OutsideJson, { force: true });
    }
  } finally {
    fs.rmSync(w2Root, { recursive: true, force: true });
  }

  // CodeQL #1: normalizeReportRoot trims trailing slashes in linear time without polynomial backtracking
  assert.equal(normalizeReportRoot("scratch/agy-squad///"), "scratch/agy-squad");
  const evilRoot = "/".repeat(50_000) + "a";
  const tNorm = performance.now();
  assert.throws(() => normalizeReportRoot(evilRoot), /workspace-relative reportRoot/);
  assert.ok(performance.now() - tNorm < 250, "normalizeReportRoot must stay linear-time on repeated slashes");

  // ASQ-TEST-001 regressions: ASQ-SEC-002, ASQ-RUN-001, ASQ-SVC-001, ASQ-SVC-002, ASQ-SEC-008
  const asqDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-asq-handoffs-")));
  const asqWt = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-asq-wt-")));
  try {
    const writeAtAsq = (base, rel, data) => {
      const dest = path.join(base, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
    };

    // ASQ-SEC-002: Stripping schemaVersion, auditPolicy, or integrityAudit* from a v2 bundle fails closed; verify --prune requires matching expectedSha256
    const secS1 = reportPath("sec", 1);
    const secLead = reportPath("sec");
    const secAudit = reportPath("integrity_auditor-sec", 1);
    writeAtAsq(asqDir, "src/mod.js", "export const ok = true;\n");
    writeAtAsq(asqDir, secS1, "# Spec\nVerified src/mod.js:1.\n");
    writeAtAsq(asqDir, secLead, "Content Verdict: PASS\nVerified.\n");
    const secRec = {
      workspace: asqDir,
      squadId: "sec",
      verdict: "PASS",
      verifiedFiles: fingerprint(asqDir, ["src/mod.js"]),
      assignments: [{ conversationId: "sec-w1", report: secS1 }],
      handoffs: [{ sender: "sec-w1", message: `READY ${secS1} — Verified.` }],
      requireIntegrityAudit: true,
      integrityAuditSlots: [secAudit]
    };
    const secDig = computeEvidenceDigest(asqDir, secRec).evidenceDigest;
    writeAtAsq(asqDir, secAudit, `Target Squad: sec\nEvidence Digest: ${secDig}\nIntegrity Verdict: CLEAN\n`);
    const secBundled = bundleReports(asqDir, secRec);
    const validBundleAbs = path.join(asqDir, secBundled.path);
    const validBundleRaw = fs.readFileSync(validBundleAbs, "utf8");
    const validBundleObj = JSON.parse(validBundleRaw);
    assert.equal(verifyBundle(asqDir, secBundled.path, secBundled.sha256).auditPolicy, "required");

    const tamperCases = [
      ["missing schemaVersion", o => { delete o.schemaVersion; }, /Unsupported or missing bundle schemaVersion/],
      ["missing auditPolicy", o => { delete o.auditPolicy; }, /Invalid auditPolicy/],
      ["stripped integrityAudit*", o => { delete o.integrityAudit; delete o.integrityAudits; }, /missing integrityAudit evidence/]
    ];
    for (const [label, mutate, pattern] of tamperCases) {
      const clone = structuredClone(validBundleObj);
      mutate(clone);
      fs.writeFileSync(validBundleAbs, JSON.stringify(clone, null, 2) + "\n", "utf8");
      assert.throws(() => verifyBundle(asqDir, secBundled.path), pattern, `ASQ-SEC-002: ${label} must fail closed`);
    }
    fs.writeFileSync(validBundleAbs, validBundleRaw, "utf8");
    assert.throws(
      () => verifyAndPruneBundle(asqDir, secBundled.path),
      /expectedSha256/,
      "ASQ-SEC-002: verifyAndPruneBundle without expectedSha256 must fail closed"
    );
    assert.throws(
      () => verifyAndPruneBundle(asqDir, secBundled.path, { expectedSha256: "0".repeat(64) }),
      /differs from the primary's accepted digest/,
      "ASQ-SEC-002: verifyAndPruneBundle with mismatched expectedSha256 must fail closed"
    );
    const prunedOk = verifyAndPruneBundle(asqDir, secBundled.path, { expectedSha256: secBundled.sha256 });
    assert.deepEqual(prunedOk.pruned.removed, [secS1]);
    assert.equal(fs.existsSync(path.join(asqDir, secS1)), false);

    // ASQ-RUN-001: readOpenedFileWithStat reads full EOF content on empty and multi-chunk (>64 KiB) files
    const emptyFile = path.join(asqDir, "empty.bin");
    fs.writeFileSync(emptyFile, Buffer.alloc(0));
    const emptyRead = readOpenedFileWithStat(emptyFile, "empty.bin");
    assert.equal(emptyRead.bytes.length, 0);
    assert.equal(emptyRead.stat.size, 0);

    const bigPayload = Buffer.concat([
      Buffer.from("HEADER-START\n"),
      Buffer.alloc(150_000, 0x61),
      Buffer.from("\nTAIL-EOF-MARKER")
    ]);
    const bigFile = path.join(asqDir, "big-multi-chunk.bin");
    fs.writeFileSync(bigFile, bigPayload);
    const bigRead = readOpenedFileWithStat(bigFile, "big-multi-chunk.bin");
    assert.equal(bigRead.bytes.length, bigPayload.length);
    assert.equal(bigRead.bytes.equals(bigPayload), true);

    // ASQ-SVC-001: Predecessor lockfile rejects active concurrent .lock and recovers stale .lock cleanly
    const lockRel = "scratch/lock-target.json";
    const lockAbs = path.join(asqDir, lockRel);
    const lockFile = `${lockAbs}.lock`;
    const buf1 = Buffer.from('{"v":1}\n', "utf8");
    const buf2 = Buffer.from('{"v":2}\n', "utf8");
    const sha1 = createHash("sha256").update(buf1).digest("hex");
    publish(asqDir, lockRel, buf1, true);
    fs.writeFileSync(lockFile, "999999 active\n", "utf8");
    assert.throws(
      () => publish(asqDir, lockRel, buf2, true, undefined, sha1),
      /Concurrent predecessor-checked publish already in progress/,
      "ASQ-SVC-001: active lockfile must block concurrent predecessor-checked publish"
    );
    assert.equal(fs.readFileSync(lockAbs).equals(buf1), true);
    const staleDate = new Date(Date.now() - 60_000);
    fs.utimesSync(lockFile, staleDate, staleDate);
    publish(asqDir, lockRel, buf2, true, undefined, sha1);
    assert.equal(fs.readFileSync(lockAbs).equals(buf2), true);
    assert.equal(fs.existsSync(lockFile), false, "ASQ-SVC-001: stale lockfile must be recovered and cleaned up");

    // ASQ-SVC-002: computeEvidenceDigest rejects invalid UTF-8 specialist report; collect --squad tolerates corrupt unrelated flat audit file
    const badUtf8S1 = reportPath("badutf8", 1);
    const badUtf8Lead = reportPath("badutf8");
    writeAtAsq(asqDir, badUtf8S1, Buffer.from([0x23, 0x20, 0xff, 0xfe, 0x0a]));
    writeAtAsq(asqDir, badUtf8Lead, "Content Verdict: PASS\nOk.\n");
    assert.throws(
      () => computeEvidenceDigest(asqDir, {
        workspace: asqDir,
        squadId: "badutf8",
        verdict: "PASS",
        verifiedFiles: fingerprint(asqDir, ["src/mod.js"]),
        assignments: [{ conversationId: "u-w1", report: badUtf8S1 }],
        handoffs: [{ sender: "u-w1", message: `READY ${badUtf8S1} — Done.` }]
      }),
      /UTF-8 Markdown/,
      "ASQ-SVC-002: computeEvidenceDigest must reject invalid UTF-8 specialist report matching bundleReports"
    );
    const colS1 = reportPath("alpha", 1);
    const corruptFlatAudit = reportPath("integrity_auditor", 1);
    writeAtAsq(asqWt, colS1, "# Alpha spec\nClean.\n");
    writeAtAsq(asqWt, corruptFlatAudit, Buffer.from([0xff, 0xfe, 0x00, 0x80]));
    const collectedAlpha = collectReportSlots(asqDir, { sources: [asqWt], squadId: "alpha" });
    assert.deepEqual(collectedAlpha.collected.map(c => c.slot), [colS1]);
    assert.equal(fs.existsSync(path.join(asqDir, corruptFlatAudit)), false);

    // ASQ-SEC-008: resolveReportRoot stays linear-time on 20k '/agy-squad' segments (< 500 ms)
    const seg20k = "x" + "/agy-squad".repeat(20_000);
    const tResolve = performance.now();
    assert.throws(
      () => inspectHandoffs(asqDir, {
        workspace: asqDir,
        squadId: "alpha",
        assignments: [{ conversationId: "w1", report: `${seg20k}/squad-alpha/specialist-1/report.md` }],
        handoffs: []
      }),
      /exceeds 500-byte Pointer-Over-Wire prefix budget/
    );
    assert.throws(
      () => inspectHandoffs(asqDir, {
        workspace: asqDir,
        squadId: "alpha",
        assignments: [{ conversationId: "w1", report: `${seg20k} bad/squad-alpha/not-valid` }],
        handoffs: []
      }),
      /exact compiled report slots/
    );
    const resolveMs = performance.now() - tResolve;
    assert.ok(resolveMs < 500, `ASQ-SEC-008: resolveReportRoot on 20k '/agy-squad' segments took ${resolveMs.toFixed(1)} ms (>= 500 ms)`);

    // Post-swarm live fix: hydratePlanForBundleInit stays fail-closed (requireIntegrityAudit: true) unless plan explicitly opts out
    const emptyAuditPlan = {
      executionMode: "swarm",
      workspace: asqDir,
      workers: [{ squadId: "alpha", specialists: [{ workerName: "alpha-1", reportSlot: reportPath("alpha", 1) }] }],
      integrityAuditPlan: []
    };
    const hydratedFailClosed = buildBundleRecordInit(asqDir, { plan: emptyAuditPlan, squadId: "alpha" });
    assert.equal(hydratedFailClosed.requireIntegrityAudit, true, "Missing integrityAuditPlan without explicit opt-out must fail closed");
    const hydratedOptOut = buildBundleRecordInit(asqDir, {
      plan: { ...emptyAuditPlan, includeIntegrityAuditor: false },
      squadId: "alpha"
    });
    assert.equal(hydratedOptOut.requireIntegrityAudit, false, "Explicit includeIntegrityAuditor: false must honor opt-out");

    // Batch A regressions: SEC-005, RUN-004, SVC-003, SVC-001
    const baS1 = reportPath("batcha", 1);
    const baS2 = reportPath("batcha", 2);
    const baS3 = reportPath("batcha", 3);
    const baLead = reportPath("batcha");
    const baAudit = reportPath("integrity_auditor-batcha", 1);
    writeAtAsq(asqDir, "src/batcha.js", "export const batchA = true;\n");
    writeAtAsq(asqDir, baS1, "# Spec 1\nVerified src/batcha.js.\n");
    writeAtAsq(asqDir, baLead, "Content Verdict: PASS\nVerified batcha.\n");
    const baFiles = fingerprint(asqDir, ["src/batcha.js"]);
    const baRec = {
      workspace: asqDir,
      squadId: "batcha",
      verdict: "PASS",
      verifiedFiles: baFiles,
      assignments: [{ conversationId: "ba-w1", report: baS1 }],
      handoffs: [{ sender: "ba-w1", message: `@lead [done] READY ${baS1} - Verified batcha.` }],
      requireIntegrityAudit: true,
      integrityAuditSlots: [baAudit]
    };
    const baDig = computeEvidenceDigest(asqDir, baRec).evidenceDigest;
    writeAtAsq(asqDir, baAudit, `Target Squad: batcha\nEvidence Digest: ${baDig}\nIntegrity Verdict: CLEAN\n`);

    // SEC-005: bundleReports rejects audit slot in verifiedFiles; verifyBundle rejects self-referenced specialist/synthesis/bundle/audit paths and whitespace-only archived markdown
    assert.throws(
      () => bundleReports(asqDir, { ...baRec, verifiedFiles: { ...baFiles, [baAudit]: fingerprint(asqDir, [baAudit])[baAudit] } }),
      /Record final work inputs in verifiedFiles/,
      "SEC-005: bundleReports must reject audit path in verifiedFiles"
    );
    const baBundled = bundleReports(asqDir, baRec);
    const baBundleAbs = path.join(asqDir, baBundled.path);
    const baBundleRaw = fs.readFileSync(baBundleAbs, "utf8");
    const baBundleObj = JSON.parse(baBundleRaw);
    for (const [label, selfPath] of [
      ["specialist slot", baS1],
      ["synthesis slot", baLead],
      ["bundle path", baBundled.path],
      ["audit path", baAudit]
    ]) {
      const clone = structuredClone(baBundleObj);
      clone.verifiedFiles[selfPath] = fingerprint(asqDir, [selfPath])[selfPath];
      fs.writeFileSync(baBundleAbs, JSON.stringify(clone, null, 2) + "\n", "utf8");
      assert.throws(
        () => verifyBundle(asqDir, baBundled.path),
        /Record final work inputs in verifiedFiles/,
        `SEC-005: verifyBundle must reject ${label} in verifiedFiles`
      );
    }
    const wsMarkdown = "   \n\t  ";
    const wsClone = structuredClone(baBundleObj);
    wsClone.reports[0].markdown = wsMarkdown;
    wsClone.reports[0].sha256 = createHash("sha256").update(wsMarkdown, "utf8").digest("hex");
    fs.writeFileSync(baBundleAbs, JSON.stringify(wsClone, null, 2) + "\n", "utf8");
    writeAtAsq(asqDir, baS1, wsMarkdown);
    assert.throws(
      () => verifyBundle(asqDir, baBundled.path),
      /Empty evidence report/,
      "SEC-005: verifyBundle must reject whitespace-only archived reports[].markdown"
    );
    fs.writeFileSync(baBundleAbs, baBundleRaw, "utf8");
    writeAtAsq(asqDir, baS1, "# Spec 1\nVerified src/batcha.js.\n");
    assert.equal(verifyBundle(asqDir, baBundled.path, baBundled.sha256).sha256, baBundled.sha256);

    // RUN-004: buildBundleRecordInit rejects non-boolean flags, invalid template.verdict (even with missing lead/report.md), and null specialists
    for (const flagName of ["allowUnaudited", "allowNonPassing", "allowPartial"]) {
      assert.throws(
        () => buildBundleRecordInit(asqDir, { plan: emptyAuditPlan, squadId: "alpha", [flagName]: "false" }),
        new RegExp(`${flagName} must be a boolean`),
        `RUN-004: buildBundleRecordInit must reject string "false" for ${flagName}`
      );
    }
    assert.throws(
      () => buildBundleRecordInit(asqDir, {
        plan: {
          executionMode: "swarm",
          workspace: asqDir,
          workers: [{ squadId: "missing_lead_squad", specialists: [{ workerName: "ml-1", reportSlot: reportPath("missing_lead_squad", 1) }] }],
          bundleRecordTemplates: {
            missing_lead_squad: {
              squadId: "missing_lead_squad",
              workspace: asqDir,
              verdict: "BOGUS",
              assignments: [{ conversationId: "ml-1", report: reportPath("missing_lead_squad", 1) }]
            }
          }
        },
        squadId: "missing_lead_squad",
        allowUnaudited: true
      }),
      /Invalid verdict 'BOGUS'/,
      "RUN-004: invalid template.verdict must throw even when lead/report.md is absent"
    );
    assert.throws(
      () => buildBundleRecordInit(asqDir, {
        plan: {
          executionMode: "swarm",
          workspace: asqDir,
          workers: [{ squadId: "null_spec", specialists: [null] }]
        },
        squadId: "null_spec",
        allowUnaudited: true
      }),
      /specialist must be a plain object/,
      "RUN-004: hydratePlanForBundleInit must reject null specialist entries"
    );

    // SVC-003: computeEvidenceDigest rejects record.verdict disagreeing with lead/report.md under allowNonPassing: true
    writeAtAsq(asqDir, baLead, "Content Verdict: FAIL\nFailing synthesis.\n");
    assert.throws(
      () => computeEvidenceDigest(asqDir, { ...baRec, verdict: "PASS", allowNonPassing: true }),
      /Synthesis report verdict 'FAIL' does not match record verdict 'PASS'/,
      "SVC-003: computeEvidenceDigest must reject record.verdict mismatch under allowNonPassing: true"
    );
    writeAtAsq(asqDir, baLead, "Content Verdict: PASS\nVerified batcha.\n");

    // SVC-001: inspectHandoffs + agy-squad finalize reconcile [done]-prefixed Pointer-Over-Wire handoffs
    writeAtAsq(asqDir, baS2, "# Spec 2\nPartial findings.\n");
    const doneInspected = inspectHandoffs(asqDir, {
      workspace: asqDir,
      assignments: [
        { conversationId: "ba-w1", report: baS1 },
        { conversationId: "ba-w2", report: baS2 },
        { conversationId: "ba-w3", report: baS3 }
      ],
      handoffs: [
        { sender: "ba-w1", message: `@lead [done] READY ${baS1} - obs 1` },
        { sender: "ba-w2", message: `@lead [done] PARTIAL ${baS2} -- obs 2` },
        { sender: "ba-w3", message: "@coordinator [done] NO_REPORT — reason 3" }
      ]
    });
    assert.deepEqual(doneInspected.map(r => r.status), ["READY", "PARTIAL", "NO_REPORT"]);
    const baRecFile = path.join(asqDir, "batcha-finalize-record.json");
    fs.writeFileSync(baRecFile, JSON.stringify({ ...baRec, replaceExisting: true }, null, 2) + "\n", "utf8");
    const finDoneRes = spawnSync(process.execPath, [agySquadCli, "finalize", "batcha-finalize-record.json", "--replace"], {
      cwd: asqDir,
      encoding: "utf8"
    });
    assert.equal(finDoneRes.status, 0, finDoneRes.stderr || finDoneRes.stdout);
    const finDoneJson = JSON.parse(finDoneRes.stdout);
    assert.equal(finDoneJson.inspected[0].status, "READY", "SVC-001: finalize must report inspected[].status === 'READY' on '@lead [done] READY'");

    // Session 3 regressions: SVC-005, RUN-011, SVC-006
    // SVC-005: collectReportSlots(--record --strict) treats lead synthesis and integrity auditor slots as inherit-capable, plus legacy slotType === "audit"
    const svc5S1 = reportPath("svc5", 1);
    const svc5Lead = reportPath("svc5");
    const svc5Audit = reportPath("integrity_auditor-svc5", 1);
    const svc5AltAudit = reportPath("integrity_auditor-svc5", 2);
    writeAtAsq(asqWt, svc5S1, "# SVC-005 Specialist\nDone in worktree.\n");
    writeAtAsq(asqDir, svc5Lead, "Content Verdict: PASS\nLead in coordinator inherit root.\n");
    writeAtAsq(asqDir, svc5Audit, "Target Squad: svc5\nIntegrity Verdict: CLEAN\nAudit in coordinator inherit root.\n");
    const svc5Rec = {
      workspace: asqDir,
      squadId: "svc5",
      verdict: "PASS",
      verifiedFiles: baFiles,
      assignments: [{ conversationId: "svc5-w1", report: svc5S1 }],
      handoffs: [{ sender: "svc5-w1", message: `READY ${svc5S1} - Done.` }],
      requireIntegrityAudit: true,
      integrityAuditSlots: [svc5Audit]
    };
    const svc5Collected = collectReportSlots(asqDir, { record: svc5Rec, sources: [asqWt], strict: true });
    assert.deepEqual(svc5Collected.missing, [], "SVC-005: inherit lead + integrityAuditSlots in coordinator root must satisfy --strict");
    assert.deepEqual(svc5Collected.collected.map(c => c.slot), [svc5S1]);
    writeAtAsq(asqDir, svc5AltAudit, "Target Squad: svc5\nIntegrity Verdict: CLEAN\nAlt audit in root.\n");
    const svc5ReportFieldCollected = collectReportSlots(asqDir, {
      record: { ...svc5Rec, integrityAuditSlots: undefined, integrityReport: svc5AltAudit },
      sources: [asqWt],
      strict: true
    });
    assert.deepEqual(svc5ReportFieldCollected.missing, [], "SVC-005: inherit integrityReport in coordinator root must satisfy --strict");
    const svc5LegacyScaffold = collectReportSlots(asqDir, {
      plan: {
        executionMode: "swarm",
        workers: [{ squadId: "svc5", specialists: [{ reportSlot: svc5S1 }] }],
        provenanceScaffold: {
          entries: [
            { squadId: "svc5", slotType: "lead", reportSlot: svc5Lead },
            { squadId: "svc5", slotType: "audit", reportSlot: svc5Audit }
          ]
        }
      },
      sources: [asqWt],
      strict: true
    });
    assert.deepEqual(svc5LegacyScaffold.missing, [], "SVC-005: legacy provenanceScaffold slotType === 'audit' must be treated as inherit");
    assert.throws(
      () => collectReportSlots(asqDir, {
        record: { ...svc5Rec, integrityAuditSlots: [reportPath("integrity_auditor-svc5", 9)] },
        sources: [asqWt],
        strict: true
      }),
      /Missing expected report slot/,
      "SVC-005: --strict must still fail when inherit audit slot is absent from both worktree and root"
    );

    // RUN-011: non-boolean includeIntegrityAuditor and template/record requireIntegrityAudit must fail closed
    for (const badBool of ["false", 0, "true", null]) {
      assert.throws(
        () => buildBundleRecordInit(asqDir, {
          plan: { ...emptyAuditPlan, includeIntegrityAuditor: badBool },
          squadId: "alpha"
        }),
        /includeIntegrityAuditor must be a boolean/,
        `RUN-011: includeIntegrityAuditor=${JSON.stringify(badBool)} must throw`
      );
      assert.throws(
        () => buildBundleRecordInit(asqDir, {
          plan: {
            executionMode: "swarm",
            workspace: asqDir,
            workers: [{ squadId: "bad_req", specialists: [{ workerName: "br-1", reportSlot: reportPath("bad_req", 1) }] }],
            bundleRecordTemplates: {
              bad_req: {
                squadId: "bad_req",
                workspace: asqDir,
                verdict: "PASS",
                assignments: [{ conversationId: "br-1", report: reportPath("bad_req", 1) }],
                requireIntegrityAudit: badBool
              }
            }
          },
          squadId: "bad_req",
          allowUnaudited: true
        }),
        /requireIntegrityAudit must be a boolean/,
        `RUN-011: template.requireIntegrityAudit=${JSON.stringify(badBool)} must throw`
      );
    }
    assert.throws(
      () => collectReportSlots(asqDir, {
        record: { ...svc5Rec, requireIntegrityAudit: "false" },
        sources: [asqWt]
      }),
      /requireIntegrityAudit must be a boolean/,
      "RUN-011: collectReportSlots must reject non-boolean record.requireIntegrityAudit"
    );

    // SVC-006: computeEvidenceDigest rejects integrityAuditSlots and integrityReport self-references in verifiedFiles
    assert.throws(
      () => computeEvidenceDigest(asqDir, {
        ...baRec,
        verifiedFiles: { ...baFiles, [baAudit]: fingerprint(asqDir, [baAudit])[baAudit] }
      }),
      /Record final work inputs in verifiedFiles/,
      "SVC-006: computeEvidenceDigest must reject integrityAuditSlots entry in verifiedFiles"
    );
    assert.throws(
      () => computeEvidenceDigest(asqDir, {
        ...baRec,
        integrityAuditSlots: undefined,
        integrityReport: baAudit,
        verifiedFiles: { ...baFiles, [baAudit]: fingerprint(asqDir, [baAudit])[baAudit] }
      }),
      /Record final work inputs in verifiedFiles/,
      "SVC-006: computeEvidenceDigest must reject integrityReport in verifiedFiles"
    );
  } finally {
    fs.rmSync(asqDir, { recursive: true, force: true });
    fs.rmSync(asqWt, { recursive: true, force: true });
  }

  console.log("✓ Receipt reconciliation, changed evidence, custom scratch roots, retryable cleanup, SQ-SVC-001, and SQ-RUN/SQ-ARCH-001 regressions");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
