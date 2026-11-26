import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { buildBundleRecordInit, bundleReports, collectReportSlots, computeEvidenceDigest, ensureDirectory, extractCitationUrls, fingerprint, inspectHandoffs, messageLimit, normalizeReportRoot, pruneReports, publish, readFile, readOpenedFileWithStat, readRegularFileSafe, reportPath, summarizeCitations, verifyAndPruneBundle, verifyBundle, verifyWorkerTraces } from "../mcp/handoffs.mjs";

const handoffsCli = fileURLToPath(new URL("../mcp/handoffs.mjs", import.meta.url));
const agySquadCli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));

const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-handoffs-")));
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
  const svcRoot = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-svc-001-")));
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

    // --strict fails when a Wave-1 worktree specialist slot (s2Slot) is missing, and succeeds post-Wave-1 when Wave-1 slots exist even before Wave-2/3 inherit slots run (FLOW-009)
    const strictMissing = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWt1, "--strict"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.notEqual(strictMissing.status, 0);
    assert.match(strictMissing.stderr, /Missing expected report slot/);
    assert.equal(fs.existsSync(path.join(svcCoord, s1Slot)), false, "--strict failure must be atomic with zero partial writes");

    const strictPostWave1 = spawnSync(
      process.execPath,
      [agySquadCli, "collect", "--plan", "scratch/plan.json", "--from", svcWt1, "--from", svcWt2, "--strict", "--dry-run"],
      { cwd: svcCoord, encoding: "utf8" }
    );
    assert.equal(strictPostWave1.status, 0, `FLOW-009: collect --plan --strict must succeed after Wave 1 before Wave-3 inherit audit runs: ${strictPostWave1.stderr}`);

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
    assert.equal(initOut.ok, true);
    assert.equal(initOut.path, "scratch/bundle-record.json");
    assert.equal(initOut.record, undefined, "bundle-init --out must omit giant record echo unless --verbose is set");
    const writtenInitRec = JSON.parse(fs.readFileSync(path.join(svcCoord, "scratch/bundle-record.json"), "utf8"));
    assert.equal(writtenInitRec.verdict, "PASS");
    assert.equal(writtenInitRec.verifiedFiles["src/core.mjs"], fingerprint(svcCoord, ["src/core.mjs"])["src/core.mjs"]);
    assert.equal(writtenInitRec.assignments.length, 2);
    assert.equal(writtenInitRec.handoffs.length, 2);

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
  const w2Root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-w2-handoffs-")));
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
  const asqDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-asq-handoffs-")));
  const asqWt = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-asq-wt-")));
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

    // Case-variant slot directory collection on case-insensitive volumes (win32/darwin) vs exact-case volumes
    const caseSlotCanonical = reportPath("case_slot", 1);
    const caseSlotVariant = caseSlotCanonical.replace("/specialist-1/", "/Specialist-1/");
    writeAtAsq(asqWt, caseSlotVariant, "# Case Variant\nVerified.\n");
    const caseSlotPlan = {
      executionMode: "swarm",
      workers: [{ squadId: "case_slot", specialists: [{ reportSlot: caseSlotCanonical }] }]
    };
    const isCaseInsensitiveTmp = fs.existsSync(path.join(asqWt, caseSlotCanonical));
    if (isCaseInsensitiveTmp && (process.platform === "win32" || process.platform === "darwin")) {
      const caseCollected = collectReportSlots(asqDir, { plan: caseSlotPlan, sources: [asqWt], strict: true });
      assert.deepEqual(caseCollected.missing, [], "Case-variant Specialist-1 must be collected on case-insensitive volume");
      assert.deepEqual(caseCollected.collected.map(c => c.slot), [caseSlotCanonical]);
    } else if (!isCaseInsensitiveTmp) {
      assert.throws(
        () => collectReportSlots(asqDir, { plan: caseSlotPlan, sources: [asqWt], strict: true }),
        /No non-empty report slots|Missing expected report slot/,
        "Exact-case filesystem must not match Specialist-1 for specialist-1"
      );
    }

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

    // PR15-SVC-001: slimmed v2.0.0 subagent plan resolves workerName-only --provenance entries without repeating reportSlot
    const slimSubagentSlot = reportPath("slim_sub", 1);
    const slimSubagentPlan = {
      schemaVersion: "2.0.0",
      executionMode: "subagent",
      workspace: asqDir,
      includeIntegrityAuditor: false,
      workers: [
        {
          squadId: "slim_sub",
          specialists: [{ workerName: "slim-sub-spec-1", reportSlot: slimSubagentSlot }]
        }
      ]
    };
    const slimInit = buildBundleRecordInit(asqDir, {
      plan: slimSubagentPlan,
      provenance: {
        entries: [{ squadId: "slim_sub", workerName: "slim-sub-spec-1", conversationId: "conv-uuid-slim-1" }]
      },
      squadId: "slim_sub",
      allowUnaudited: true
    });
    assert.deepEqual(
      slimInit.assignments,
      [{ conversationId: "conv-uuid-slim-1", report: slimSubagentSlot }],
      "PR15-SVC-001: workerName-only provenance override must populate subagent conversationId"
    );

    // PR15-RUN-003: collectReportSlots with corrupt non-UTF-8 destination conflicts without --overwrite and replaces cleanly with --overwrite
    const corruptSlot = reportPath("corrupt_dest", 1);
    const corruptDestPath = path.join(asqDir, corruptSlot);
    fs.mkdirSync(path.dirname(corruptDestPath), { recursive: true });
    fs.writeFileSync(corruptDestPath, Buffer.from([0xff, 0xfe, 0x00, 0x80]));
    writeAtAsq(asqWt, corruptSlot, "# Clean Replacement\nVerified.\n");
    const corruptPlan = {
      executionMode: "swarm",
      workers: [{ squadId: "corrupt_dest", specialists: [{ workerName: "cd-1", reportSlot: corruptSlot }] }]
    };
    assert.throws(
      () => collectReportSlots(asqDir, { plan: corruptPlan, sources: [asqWt], overwrite: false }),
      /Conflict at destination/,
      "PR15-RUN-003: non-UTF-8 destination must surface destination conflict when overwrite=false"
    );
    const overwritten = collectReportSlots(asqDir, { plan: corruptPlan, sources: [asqWt], overwrite: true });
    assert.equal(overwritten.collected.length, 1);
    assert.equal(fs.readFileSync(corruptDestPath, "utf8"), "# Clean Replacement\nVerified.\n");

    // v0.2.2 citation tracking: extractCitationUrls, summarizeCitations, stderr warning before prune, and --strict-citations fail-closed gate
    assert.deepEqual(
      extractCitationUrls(
        "See [Wiki](https://en.wikipedia.org/wiki/Foo_(bar)).\n" +
        "Also [Proxy](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ_abc-123==), and https://example.com/a?x=1&y=2!\n" +
        "Duplicate: https://example.com/a?x=1&y=2\n"
      ),
      [
        "https://en.wikipedia.org/wiki/Foo_(bar)",
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ_abc-123==",
        "https://example.com/a?x=1&y=2"
      ],
      "v0.2.2: extractCitationUrls must trim unbalanced punctuation/parens while preserving balanced parens and base64url tokens"
    );
    const citeSummary = summarizeCitations(
      [{ markdown: "Refs: [A](https://example.com/kept) and [B](https://example.com/dropped)." }],
      "Synthesis: [A](https://example.com/kept)."
    );
    assert.deepEqual(citeSummary.uncarriedUrls, ["https://example.com/dropped"]);

    const citeSquad = "cite_track";
    const citeSpecSlot = reportPath(citeSquad, 1);
    const citeLeadSlot = reportPath(citeSquad);
    const citeTargetFile = "cite-target.txt";
    writeAtAsq(asqDir, citeTargetFile, "citation check fixture\n");
    writeAtAsq(
      asqDir,
      citeSpecSlot,
      "# Specialist Report\n\n## Sources\n- [Kept](https://example.com/kept)\n- [Dropped](https://example.com/dropped)\n"
    );
    writeAtAsq(
      asqDir,
      citeLeadSlot,
      "Content Verdict: PASS\n\n## Sources\n- [Kept](https://example.com/kept)\n"
    );
    const citeRecord = {
      squadId: citeSquad,
      workspace: asqDir,
      verdict: "PASS",
      requireIntegrityAudit: false,
      verifiedFiles: fingerprint(asqDir, [citeTargetFile]),
      assignments: [{ conversationId: "cite-worker-1", report: citeSpecSlot }],
      handoffs: [{ sender: "cite-worker-1", message: `READY ${citeSpecSlot} - verified citations` }]
    };
    const citeRecPath = "scratch/cite-record.json";
    writeAtAsq(asqDir, citeRecPath, JSON.stringify(citeRecord, null, 2) + "\n");

    // computeEvidenceDigest and CLI digest report uncarriedUrls and emit stderr warning
    const citeDig = computeEvidenceDigest(asqDir, citeRecord);
    assert.deepEqual(citeDig.citations.uncarriedUrls, ["https://example.com/dropped"]);
    const citeDigCli = spawnSync(process.execPath, [agySquadCli, "digest", citeRecPath], { cwd: asqDir, encoding: "utf8" });
    assert.equal(citeDigCli.status, 0, citeDigCli.stderr);
    assert.match(citeDigCli.stderr, /\[WARN\] 1 specialist citation URL\(s\) not carried/);
    assert.deepEqual(JSON.parse(citeDigCli.stdout).citations.uncarriedUrls, ["https://example.com/dropped"]);

    // bundleReports / finalize --strict-citations fails closed before bundling or pruning
    assert.throws(
      () => bundleReports(asqDir, { ...citeRecord, strictCitations: true }),
      /Uncarried specialist citation URL\(s\).*https:\/\/example\.com\/dropped/
    );
    const strictFailCli = spawnSync(
      process.execPath,
      [agySquadCli, "finalize", citeRecPath, "--allow-unaudited", "--strict-citations", "--prune"],
      { cwd: asqDir, encoding: "utf8" }
    );
    assert.notEqual(strictFailCli.status, 0, "v0.2.2: finalize --strict-citations must fail closed on uncarried URLs");
    assert.match(strictFailCli.stderr, /Uncarried specialist citation URL\(s\)/);
    assert.equal(fs.existsSync(path.join(asqDir, citeSpecSlot)), true, "v0.2.2: failed --strict-citations must not prune loose specialist report");

    // Non-strict finalize warns on stderr before pruning and still surfaces citations.uncarriedUrls in JSON
    const warnFinCli = spawnSync(
      process.execPath,
      [agySquadCli, "finalize", citeRecPath, "--allow-unaudited", "--replace", "--prune", "--keep-reports"],
      { cwd: asqDir, encoding: "utf8" }
    );
    assert.equal(warnFinCli.status, 0, warnFinCli.stderr);
    assert.match(warnFinCli.stderr, /\[WARN\] 1 specialist citation URL\(s\) not carried/);
    assert.deepEqual(JSON.parse(warnFinCli.stdout).bundled.citations.uncarriedUrls, ["https://example.com/dropped"]);

    // Carrying all specialist URLs into lead/report.md clears warning and passes --strict-citations --prune
    writeAtAsq(
      asqDir,
      citeLeadSlot,
      "Content Verdict: PASS\n\n## Sources\n- [Kept](https://example.com/kept)\n- [Dropped](https://example.com/dropped)\n"
    );
    // CLI bundle --strict-citations passes when all URLs are carried, and fails closed when dropped
    const bundleStrictPass = spawnSync(process.execPath, [agySquadCli, "bundle", citeRecPath, "--allow-unaudited", "--strict-citations", "--replace"], { cwd: asqDir, encoding: "utf8" });
    assert.equal(bundleStrictPass.status, 0, bundleStrictPass.stderr);
    writeAtAsq(asqDir, citeLeadSlot, "Content Verdict: PASS\n\n## Sources\n- [Kept](https://example.com/kept)\n");
    const bundleStrictFail = spawnSync(
      process.execPath,
      [agySquadCli, "bundle", citeRecPath, "--allow-unaudited", "--strict-citations", "--replace"],
      { cwd: asqDir, encoding: "utf8" }
    );
    assert.notEqual(bundleStrictFail.status, 0, "bundle --strict-citations must fail closed on uncarried URLs");
    assert.match(bundleStrictFail.stderr, /Uncarried specialist citation URL/);

    // Non-circular workflow: finalize --strict-citations (without --prune) yields bundle SHA-256 while keeping specialist report, then prune removes it
    writeAtAsq(
      asqDir,
      citeLeadSlot,
      "Content Verdict: PASS\n\n## Sources\n- [Kept](https://example.com/kept)\n- [Dropped](https://example.com/dropped)\n"
    );
    const nonCircularFin = spawnSync(
      process.execPath,
      [agySquadCli, "finalize", citeRecPath, "--allow-unaudited", "--strict-citations", "--replace"],
      { cwd: asqDir, encoding: "utf8" }
    );
    assert.equal(nonCircularFin.status, 0, nonCircularFin.stderr);
    assert.doesNotMatch(nonCircularFin.stderr, /\[WARN\]/);
    const nonCircularOut = JSON.parse(nonCircularFin.stdout);
    assert.deepEqual(nonCircularOut.bundled.citations.uncarriedUrls, []);
    assert.equal(nonCircularOut.pruned, null);
    assert.equal(fs.existsSync(path.join(asqDir, citeSpecSlot)), true, "finalize without --prune must leave loose specialist report readable for synthesis");
    const postSynthPrune = spawnSync(
      process.execPath,
      [agySquadCli, "prune", nonCircularOut.bundled.path, nonCircularOut.bundled.sha256],
      { cwd: asqDir, encoding: "utf8" }
    );
    assert.equal(postSynthPrune.status, 0, postSynthPrune.stderr);
    assert.deepEqual(JSON.parse(postSynthPrune.stdout).removed, [citeSpecSlot]);
    assert.equal(fs.existsSync(path.join(asqDir, citeSpecSlot)), false, "post-synthesis prune must remove loose specialist report");

    // bundle-init --from-scope: expands files + subdirs, deduplicates lead/spec overlaps, skips .git/node_modules/reportRoot, merges explicit --file, supports legacy plans, and fails closed on '.', symlinks, empty dirs, missing files, and >256 file cap
    const scopeDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-from-scope-")));
    try {
      writeAtAsq(scopeDir, "src/a.mjs", "export const a = 1;\n");
      writeAtAsq(scopeDir, "src/nested/b.mjs", "export const b = 2;\n");
      writeAtAsq(scopeDir, "src/.git/HEAD", "ref: refs/heads/main\n");
      writeAtAsq(scopeDir, "src/node_modules/pkg/index.js", "module.exports = 1;\n");
      writeAtAsq(scopeDir, "docs/guide.md", "# Guide\n");
      writeAtAsq(scopeDir, "extra.txt", "extra\n");
      writeAtAsq(scopeDir, "scratch/agy-squad/squad-scoped/specialist-1/report.md", "# S1\nChecked.\n");
      writeAtAsq(scopeDir, "scratch/agy-squad/squad-scoped/lead/report.md", "Content Verdict: PASS\nChecked.\n");
      writeAtAsq(scopeDir, "scope-manifest.json", JSON.stringify({
        squads: {
          scoped: {
            lead: { role: "Scoped Lead", readOnly: true, objective: "Synthesize", scopeFiles: ["src", "docs/guide.md"] },
            specialists: [
              { role: "Core Spec", readOnly: true, objective: "Check src", scopeFiles: ["src/a.mjs", "src/nested"] }
            ]
          },
          wildcard: {
            specialists: [
              { role: "Wide Spec", readOnly: true, objective: "Wide", scopeFiles: ["."] }
            ]
          },
          missing: {
            specialists: [
              { role: "Missing Spec", readOnly: true, objective: "Missing", scopeFiles: ["does-not-exist.js"] }
            ]
          }
        }
      }, null, 2));
      const scopePlanCli = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--manifest", "scope-manifest.json", "--no-integrity"],
        { cwd: scopeDir, encoding: "utf8" }
      );
      assert.equal(scopePlanCli.status, 0, scopePlanCli.stderr);
      writeAtAsq(scopeDir, "scratch/scope-plan.json", scopePlanCli.stdout);
      const scopePlanObj = JSON.parse(scopePlanCli.stdout);
      const scopedSpecWorker = scopePlanObj.workers[0].specialists[0].workerName;
      const scopedSlot = scopePlanObj.workers[0].specialists[0].reportSlot;

      const fromScopeCli = spawnSync(
        process.execPath,
        [
          agySquadCli, "bundle-init",
          "--plan", "scratch/scope-plan.json",
          "--squad", "scoped",
          "--from-scope",
          "--file", "extra.txt",
          "--handoff", `${scopedSpecWorker}=READY ${scopedSlot} - verified scoped files`,
          "--digest",
          "--out", "scratch/scoped-record.json"
        ],
        { cwd: scopeDir, encoding: "utf8" }
      );
      assert.equal(fromScopeCli.status, 0, fromScopeCli.stderr);
      const fromScopeOut = JSON.parse(fromScopeCli.stdout);
      assert.equal(fromScopeOut.ok, true);
      assert.equal(fromScopeOut.record, undefined);
      const writtenScopedRec = JSON.parse(fs.readFileSync(path.join(scopeDir, "scratch/scoped-record.json"), "utf8"));
      assert.deepEqual(
        Object.keys(writtenScopedRec.verifiedFiles),
        ["docs/guide.md", "extra.txt", "src/a.mjs", "src/nested/b.mjs"],
        "--from-scope must expand subdirectories, deduplicate overlaps, skip .git/node_modules, and merge explicit --file"
      );
      assert.match(fromScopeOut.evidenceDigest, /^[0-9a-f]{64}$/);

      // Legacy plan fallback (no structured scopeFiles on workers) still expands via brief lines
      const legacyPlan = structuredClone(scopePlanObj);
      delete legacyPlan.workers[0].lead.scopeFiles;
      delete legacyPlan.workers[0].specialists[0].scopeFiles;
      const legacyRec = buildBundleRecordInit(scopeDir, { plan: legacyPlan, squadId: "scoped", fromScope: true });
      assert.deepEqual(Object.keys(legacyRec.verifiedFiles), ["docs/guide.md", "src/a.mjs", "src/nested/b.mjs"]);

      // Fail closed on repo-wide wildcard '.'
      const wildcardRes = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "scratch/scope-plan.json", "--squad", "wildcard", "--from-scope"],
        { cwd: scopeDir, encoding: "utf8" }
      );
      assert.notEqual(wildcardRes.status, 0, "--from-scope must reject repo-wide wildcard '.'");
      assert.match(wildcardRes.stderr, /wildcard '\.'/);

      // Fail closed on missing scoped file
      const missingRes = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--plan", "scratch/scope-plan.json", "--squad", "missing", "--from-scope"],
        { cwd: scopeDir, encoding: "utf8" }
      );
      assert.notEqual(missingRes.status, 0, "--from-scope must reject nonexistent scopeFiles");
      assert.match(missingRes.stderr, /does not exist/);

      // Fail closed on non-boolean fromScope
      assert.throws(
        () => buildBundleRecordInit(scopeDir, { plan: scopePlanObj, squadId: "scoped", fromScope: "yes" }),
        /fromScope must be a boolean/
      );

      // Fail closed on empty directory and >256 file safety cap
      fs.mkdirSync(path.join(scopeDir, "empty-dir"), { recursive: true });
      const emptyPlan = structuredClone(scopePlanObj);
      emptyPlan.workers[0].lead.scopeFiles = ["empty-dir"];
      emptyPlan.workers[0].specialists[0].scopeFiles = ["empty-dir"];
      assert.throws(
        () => buildBundleRecordInit(scopeDir, { plan: emptyPlan, squadId: "scoped", fromScope: true }),
        /resolved 0 regular files/
      );

      for (let i = 0; i < 257; i += 1) {
        writeAtAsq(scopeDir, `many/f-${String(i).padStart(3, "0")}.txt`, `${i}\n`);
      }
      const manyPlan = structuredClone(scopePlanObj);
      manyPlan.workers[0].lead.scopeFiles = ["many"];
      manyPlan.workers[0].specialists[0].scopeFiles = ["many"];
      assert.throws(
        () => buildBundleRecordInit(scopeDir, { plan: manyPlan, squadId: "scoped", fromScope: true }),
        /256-file safety cap/
      );

      // Fail closed on symlink inside expanded scope directory
      const symInsideScope = path.join(scopeDir, "src", "leak-link.txt");
      let createdScopeSym = false;
      try {
        fs.symlinkSync(path.join(scopeDir, "extra.txt"), symInsideScope);
        createdScopeSym = true;
      } catch (err) {
        if (err?.code !== "EPERM") throw err;
      }
      if (createdScopeSym) {
        assert.throws(
          () => buildBundleRecordInit(scopeDir, { plan: scopePlanObj, squadId: "scoped", fromScope: true }),
          /Read-only containment violation: new symlink 'src\/leak-link\.txt'/
        );
        const writableSymPlan = structuredClone(scopePlanObj);
        delete writableSymPlan.readOnlyBaseline;
        delete writableSymPlan.workers[0].readOnlyBaseline;
        assert.throws(
          () => buildBundleRecordInit(scopeDir, { plan: writableSymPlan, squadId: "scoped", fromScope: true }),
          /Refusing to follow symlink/
        );
      }
    } finally {
      fs.rmSync(scopeDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(asqDir, { recursive: true, force: true });
    fs.rmSync(asqWt, { recursive: true, force: true });
  }

  // Stage 3 Regressions: FIT-001, FLOW-005, FIT-002/FIT-003/FLOW-003, ROI-003/FLOW-004, ROI-005
  {
    const s3Parent = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-s3-parent-")));
    const s3Repo = path.join(s3Parent, "ChildRepo");
    const s3Wt = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-s3-wt-")));
    const s3Brain = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-s3-brain-")));
    try {
      fs.mkdirSync(path.join(s3Repo, "src"), { recursive: true });
      fs.writeFileSync(path.join(s3Repo, "src/app.js"), "export const v = 1;\n", "utf8");
      fs.writeFileSync(path.join(s3Repo, "src/util.js"), "export const u = 2;\n", "utf8");

      // Initialize git repo inside ChildRepo to test FIT-001 git + SHA-256 readOnlyBaseline fail-closed checks
      spawnSync("git", ["init", "-q"], { cwd: s3Repo });
      spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: s3Repo });
      spawnSync("git", ["config", "user.name", "Test"], { cwd: s3Repo });
      spawnSync("git", ["add", "."], { cwd: s3Repo });
      spawnSync("git", ["commit", "-q", "-m", "init"], { cwd: s3Repo });

      // 1. FIT-001: readOnlyBaseline fails closed in BOTH bundle-init and finalize on Stage-1 file mutation or untracked file
      const roPlanRes = spawnSync(
        process.execPath,
        [
          agySquadCli, "plan",
          "--workspace", s3Repo,
          "--mode", "swarm",
          "--read-only",
          "--scope", "src",
          "--role", "Reader",
          "--no-integrity",
          "--out", "scratch/ro-plan.json",
          "Read-only containment test"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(roPlanRes.status, 0, roPlanRes.stderr);
      const roSpecSlot = "scratch/agy-squad/squad-task_squad/specialist-1/report.md";
      const roLeadSlot = "scratch/agy-squad/squad-task_squad/lead/report.md";
      fs.mkdirSync(path.join(s3Repo, path.dirname(roSpecSlot)), { recursive: true });
      fs.mkdirSync(path.join(s3Repo, path.dirname(roLeadSlot)), { recursive: true });
      fs.writeFileSync(path.join(s3Repo, roSpecSlot), "# Specialist\nChecked `src/app.js:1`.\n", "utf8");
      fs.writeFileSync(path.join(s3Repo, roLeadSlot), "# Synthesis\nChecked `src/app.js:1`.\nContent Verdict: PASS\n", "utf8");

      // Mutate tracked src/app.js -> bundle-init MUST fail closed
      fs.writeFileSync(path.join(s3Repo, "src/app.js"), "export const v = 999;\n", "utf8");
      const roMutatedInit = spawnSync(
        process.execPath,
        [
          agySquadCli, "bundle-init",
          "--workspace", s3Repo,
          "--plan", "scratch/ro-plan.json",
          "--from-scope",
          "--handoff", `reader=READY ${roSpecSlot} - checked`,
          "--out", "scratch/ro-record.json"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.notEqual(roMutatedInit.status, 0, "FIT-001: bundle-init must fail closed when read-only scoped file was mutated");
      assert.match(roMutatedInit.stderr, /Read-only containment violation/);

      // Restore src/app.js -> bundle-init succeeds
      fs.writeFileSync(path.join(s3Repo, "src/app.js"), "export const v = 1;\n", "utf8");
      const roCleanInit = spawnSync(
        process.execPath,
        [
          agySquadCli, "bundle-init",
          "--workspace", s3Repo,
          "--plan", "scratch/ro-plan.json",
          "--from-scope",
          "--handoff", `reader=READY ${roSpecSlot} - checked`,
          "--out", "scratch/ro-record.json"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(roCleanInit.status, 0, roCleanInit.stderr);

      // Add rogue untracked file outside scratch/ before finalize -> finalize MUST fail closed
      fs.writeFileSync(path.join(s3Repo, "rogue.txt"), "unauthorized write\n", "utf8");
      const roRogueFinalize = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "ChildRepo/scratch/ro-record.json", "--allow-unaudited"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.notEqual(roRogueFinalize.status, 0, "FIT-001: finalize must fail closed on new untracked file outside scratch/");
      assert.match(roRogueFinalize.stderr, /Read-only containment violation/);
      fs.rmSync(path.join(s3Repo, "rogue.txt"), { force: true });

      // Ancestor record.workspace inference (ROI-003): finalize from s3Parent WITHOUT --workspace succeeds!
      const roCleanFinalize = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "ChildRepo/scratch/ro-record.json", "--allow-unaudited"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(roCleanFinalize.status, 0, `ROI-003: parent-CWD ancestor record.workspace inference failed: ${roCleanFinalize.stderr}`);

      // 2. FLOW-005: share/branch brief wt=<abs-worktree-root> & collect --handoff auto-discovery without --from
      const sharePlanRes = spawnSync(
        process.execPath,
        [
          agySquadCli, "plan",
          "--workspace", s3Repo,
          "--mode", "swarm",
          "--workspace-isolation", "share",
          "--scope", "src/app.js",
          "--role", "IsoWorker",
          "--no-integrity",
          "--out", "scratch/share-plan.json",
          "Isolated worktree collect test"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(sharePlanRes.status, 0, sharePlanRes.stderr);
      const sharePlanFull = JSON.parse(fs.readFileSync(path.join(s3Repo, "scratch/share-plan.json"), "utf8"));
      assert.match(sharePlanFull.workers[0].specialists[0].swarmAdd.brief, /wt="<abs-worktree-root>"/);

      const addReceiptWorktree = spawnSync("git", ["worktree", "add", "--detach", s3Wt], { cwd: s3Repo, encoding: "utf8" });
      assert.equal(addReceiptWorktree.status, 0, addReceiptWorktree.stderr);
      const wtSlot = "scratch/collect-test/squad-task_squad/specialist-1/report.md";
      fs.mkdirSync(path.join(s3Wt, path.dirname(wtSlot)), { recursive: true });
      fs.writeFileSync(path.join(s3Wt, wtSlot), "# Worktree Report\nVerified in share worktree.\n", "utf8");
      const collectAuto = spawnSync(
        process.execPath,
        [
          agySquadCli, "collect",
          "--workspace", s3Repo,
          "--plan", path.join(s3Repo, "scratch/share-plan.json"),
          "--report-root", "scratch/collect-test",
          "--handoff", `${sharePlanFull.workers[0].specialists[0].workerName}=READY ${wtSlot} - wt="${s3Wt}" completed`
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(collectAuto.status, 0, `FLOW-005: collect --handoff wt= auto-discovery failed: ${collectAuto.stderr}`);
      const collectAutoOut = JSON.parse(collectAuto.stdout);
      assert.deepEqual(collectAutoOut.collected.map(c => c.slot), [wtSlot]);
      assert.equal(fs.existsSync(path.join(s3Repo, wtSlot)), true);

      // 3. FIT-002 + FIT-003 + ROI-003 + ROI-005: Multi-squad --all-squads, bound auditSwarmAdd, audit-check/digest --verify-traces (<50ms), batch finalize, batch prune --records --clean-records
      const multiManifestRel = "scratch/multi-manifest.json";
      fs.writeFileSync(
        path.join(s3Repo, multiManifestRel),
        JSON.stringify({
          squads: {
            alpha: {
              lead: { role: "Alpha Lead", objective: "Synthesize alpha", scopeFiles: ["src/app.js"], readOnly: true },
              specialists: [{ role: "Alpha Spec", objective: "Audit app", scopeFiles: ["src/app.js"], readOnly: true }]
            },
            beta: {
              lead: { role: "Beta Lead", objective: "Synthesize beta", scopeFiles: ["src/util.js"], readOnly: true },
              specialists: [{ role: "Beta Spec", objective: "Audit util", scopeFiles: ["src/util.js"], readOnly: true }]
            }
          }
        }, null, 2) + "\n",
        "utf8"
      );
      // Use AGY_SQUAD_WORKSPACE fallback from parent directory + contained absolute manifest & out paths
      const envWs = { ...process.env, AGY_SQUAD_WORKSPACE: s3Repo };
      const multiPlanCli = spawnSync(
        process.execPath,
        [
          agySquadCli, "plan",
          "--manifest", path.join(s3Repo, multiManifestRel),
          "--report-root", "scratch/multi-run",
          "--out", path.join(s3Repo, "scratch/multi-plan.json")
        ],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(multiPlanCli.status, 0, multiPlanCli.stderr);
      const multiPlanObj = JSON.parse(fs.readFileSync(path.join(s3Repo, "scratch/multi-plan.json"), "utf8"));
      const alphaSpecName = multiPlanObj.workers[0].specialists[0].workerName;
      const betaSpecName = multiPlanObj.workers[1].specialists[0].workerName;
      const alphaSpecSlot = multiPlanObj.workers[0].specialists[0].reportSlot;
      const betaSpecSlot = multiPlanObj.workers[1].specialists[0].reportSlot;
      const alphaLeadSlot = multiPlanObj.workers[0].lead.reportSlot;
      const betaLeadSlot = multiPlanObj.workers[1].lead.reportSlot;

      for (const [slot, body] of [
        [alphaSpecSlot, "# Alpha Spec\nChecked `src/app.js:1`.\n"],
        [alphaLeadSlot, "# Alpha Lead\nChecked `src/app.js:1`.\nContent Verdict: PASS\n"],
        [betaSpecSlot, "# Beta Spec\nChecked `src/util.js:1`.\n"],
        [betaLeadSlot, "# Beta Lead\nChecked `src/util.js:1`.\nContent Verdict: PASS\n"]
      ]) {
        fs.mkdirSync(path.join(s3Repo, path.dirname(slot)), { recursive: true });
        fs.writeFileSync(path.join(s3Repo, slot), body, "utf8");
      }

      const coordUuid = "11111111-2222-3333-4444-555555555555";
      const alphaUuid = "aaaaaaaa-1111-2222-3333-444444444444";
      const betaUuid = "bbbbbbbb-1111-2222-3333-444444444444";
      const batchInit = spawnSync(
        process.execPath,
        [
          agySquadCli, "bundle-init",
          "--plan", "scratch/multi-plan.json",
          "--all-squads",
          "--from-scope",
          "--id-map", `${alphaSpecName}=${alphaUuid}`,
          "--id-map", `${betaSpecName}=${betaUuid}`,
          "--handoff", `${alphaUuid}=READY ${alphaSpecSlot} - ok`,
          "--handoff", `${betaUuid}=READY ${betaSpecSlot} - ok`,
          "--coord-id", coordUuid,
          "--handoff-seqs", "14,19",
          "--digest"
        ],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(batchInit.status, 0, `FIT-003: bundle-init --all-squads failed: ${batchInit.stderr}`);
      const batchInitOut = JSON.parse(batchInit.stdout);
      assert.equal(batchInitOut.ok, true);
      assert.equal(batchInitOut.squadCount, 2);
      for (const recSummary of batchInitOut.records) {
        assert.equal(recSummary.record, undefined);
        assert.ok(recSummary.auditSwarmAdd && recSummary.auditSwarmAdd.action === "add");
        assert.match(recSummary.auditSwarmAdd.brief, new RegExp(`sender=${coordUuid}`));
        assert.match(recSummary.auditSwarmAdd.brief, /read_board\{seqs: \[14, 19\]\} only\./);
        assert.match(recSummary.auditSwarmAdd.brief, new RegExp(`Evidence Digest: ${recSummary.evidenceDigest}`));
        assert.doesNotMatch(recSummary.auditSwarmAdd.brief, /<coordId>|<handoffSeqs|<sha256>|<rel-record>|<rel-slot>/);
      }

      assert.doesNotMatch(batchInitOut.records[0].auditSwarmAdd.brief, new RegExp(betaUuid));
      assert.doesNotMatch(batchInitOut.records[1].auditSwarmAdd.brief, new RegExp(alphaUuid));
      const firstRecordPath = path.join(s3Repo, batchInitOut.records[0].path);
      const firstRecordBytes = fs.readFileSync(firstRecordPath);
      fs.unlinkSync(firstRecordPath);
      const batchConflict = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--workspace", s3Repo, "--plan", "scratch/multi-plan.json", "--all-squads", "--from-scope"], { cwd: s3Repo, encoding: "utf8" });
      assert.notEqual(batchConflict.status, 0);
      assert.match(batchConflict.stderr, /already exists/);
      assert.equal(fs.existsSync(firstRecordPath), false);
      fs.writeFileSync(firstRecordPath, firstRecordBytes);

      const invalidLaterDigest = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--workspace", s3Repo, "--plan", "scratch/multi-plan.json", "--all-squads", "--from-scope", "--out-dir", "scratch/atomic-digest", "--digest", "--handoff", `${alphaSpecName}=READY ${alphaSpecSlot} - ok`], { cwd: s3Repo, encoding: "utf8" });
      assert.notEqual(invalidLaterDigest.status, 0);
      assert.match(invalidLaterDigest.stderr, /requires specialist handoff receipts/);
      assert.equal(fs.existsSync(path.join(s3Repo, "scratch/atomic-digest/alpha.record.json")), false);

      // ROI-005: deterministic audit-check & digest --verify-traces (<50 ms)
      const writeSyntheticTrace = (uuid, workerName, slotPath, readRelPaths = [], extraToolCalls = []) => {
        const logDir = path.join(s3Brain, uuid, ".system_generated", "logs");
        fs.mkdirSync(logDir, { recursive: true });
        const lines = [
          JSON.stringify({
            step_index: 1,
            type: "USER_INPUT",
            status: "DONE",
            content: `[Message] sender=${coordUuid} @${workerName} Report slot: ${slotPath}`
          }),
          JSON.stringify({
            step_index: 2,
            type: "PLANNER_RESPONSE",
            status: "DONE",
            tool_calls: [
              ...readRelPaths.map(r => ({ name: "read_file", arguments: { Path: path.join(s3Repo, r) } })),
              { name: "write_file", arguments: { Path: path.join(s3Repo, slotPath) } },
              ...extraToolCalls
            ]
          })
        ];
        fs.writeFileSync(path.join(logDir, "transcript.jsonl"), lines.join("\n") + "\n", "utf8");
      };
      writeSyntheticTrace(alphaUuid, alphaSpecName, alphaSpecSlot, ["src/app.js"]);
      writeSyntheticTrace(betaUuid, betaSpecName, betaSpecSlot, ["src/util.js"]);

      const alphaRecRel = batchInitOut.records[0].path;
      const betaRecRel = batchInitOut.records[1].path;
      const auditCheckPass = spawnSync(
        process.execPath,
        [
          agySquadCli, "audit-check",
          "--record", path.join(s3Repo, alphaRecRel),
          "--coord-id", coordUuid,
          "--brain-dir", s3Brain
        ],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(auditCheckPass.status, 0, `ROI-005: audit-check failed: ${auditCheckPass.stderr || auditCheckPass.stdout}`);
      const auditCheckJson = JSON.parse(auditCheckPass.stdout);
      assert.equal(auditCheckJson.ok, true);
      assert.ok(auditCheckJson.elapsedMs < 200, `Expected fast JSONL trace check, got ${auditCheckJson.elapsedMs}ms`);

      const digestVerifyPass = spawnSync(
        process.execPath,
        [
          agySquadCli, "digest",
          path.join(s3Repo, alphaRecRel),
          "--verify-traces",
          "--coord-id", coordUuid,
          "--brain-dir", s3Brain
        ],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(digestVerifyPass.status, 0, digestVerifyPass.stderr);
      assert.equal(JSON.parse(digestVerifyPass.stdout).traceVerification.ok, true);

      // Unauthorized write or ungrounded citation in read-only worker trace MUST fail closed with exit code 1
      writeSyntheticTrace(alphaUuid, alphaSpecName, alphaSpecSlot, ["src/app.js"], [
        { name: "edit_file", arguments: { Path: path.join(s3Repo, "src/app.js") } }
      ]);
      const auditCheckFail = spawnSync(
        process.execPath,
        [
          agySquadCli, "audit-check",
          "--record", alphaRecRel,
          "--coord-id", coordUuid,
          "--brain-dir", s3Brain
        ],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(auditCheckFail.status, 1, "ROI-005: unauthorized write in read-only worker trace must exit 1");
      assert.equal(JSON.parse(auditCheckFail.stdout).ok, false);

      // Write CLEAN integrity audit reports for both squads, test verdict --workspace, batch finalize, and batch prune --records --clean-records
      for (const [idx, recSummary] of batchInitOut.records.entries()) {
        const auditSlot = multiPlanObj.integrityAuditPlan[idx].reportSlot;
        fs.mkdirSync(path.join(s3Repo, path.dirname(auditSlot)), { recursive: true });
        fs.writeFileSync(
          path.join(s3Repo, auditSlot),
          `# Audit\nTarget Squad: ${recSummary.squadId}\nEvidence Digest: ${recSummary.evidenceDigest}\nIntegrity Verdict: CLEAN\n`,
          "utf8"
        );
        const vRes = spawnSync(
          process.execPath,
          [agySquadCli, "verdict", "--workspace", s3Repo, "--integrity", path.join(s3Repo, auditSlot)],
          { cwd: s3Parent, encoding: "utf8" }
        );
        assert.equal(vRes.status, 0, vRes.stderr);
        assert.equal(JSON.parse(vRes.stdout).verdict, "CLEAN");
      }

      // Also verify fingerprint, inspect, dispatch, verify --workspace from s3Parent, plus symlink escape rejection
      assert.equal(
        spawnSync(process.execPath, [agySquadCli, "fingerprint", "--workspace", s3Repo, path.join(s3Repo, "src/app.js")], { cwd: s3Parent, encoding: "utf8" }).status,
        0
      );
      assert.equal(
        spawnSync(process.execPath, [agySquadCli, "inspect", "--workspace", s3Repo, path.join(s3Repo, alphaRecRel)], { cwd: s3Parent, encoding: "utf8" }).status,
        0
      );
      assert.equal(
        spawnSync(process.execPath, [agySquadCli, "dispatch", "--workspace", s3Repo, "--manifest", multiManifestRel, "--squad", "alpha"], { cwd: s3Parent, encoding: "utf8" }).status,
        0
      );
      const escapeSym = path.join(s3Repo, "scratch/escape-out.json");
      fs.symlinkSync(path.join(s3Parent, "outside-target.json"), escapeSym);
      const symEscRes = spawnSync(
        process.execPath,
        [agySquadCli, "fingerprint", "--workspace", s3Repo, escapeSym],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.notEqual(symEscRes.status, 0, "FLOW-004: symlink escaping workspace passed as absolute path must fail closed");
      fs.unlinkSync(escapeSym);

      // Batch finalize both records in 1 call
      const batchFin = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", path.join(s3Repo, alphaRecRel), path.join(s3Repo, betaRecRel)],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(batchFin.status, 0, `FIT-003: multi-record finalize failed: ${batchFin.stderr}`);
      const batchFinJson = JSON.parse(batchFin.stdout);
      assert.equal(batchFinJson.ok, true);
      assert.equal(batchFinJson.count, 2);
      assert.equal(
        spawnSync(process.execPath, [agySquadCli, "verify", "--workspace", s3Repo, path.join(s3Repo, batchFinJson.results[0].bundlePath), batchFinJson.results[0].sha256], { cwd: s3Parent, encoding: "utf8" }).status,
        0
      );

      const alphaRaw = fs.readFileSync(path.join(s3Repo, alphaRecRel), "utf8");
      const swappedRecord = JSON.parse(alphaRaw);
      swappedRecord.assignments[0].conversationId = "different-worker";
      fs.writeFileSync(path.join(s3Repo, alphaRecRel), JSON.stringify(swappedRecord));
      const mismatchPrune = spawnSync(process.execPath, [agySquadCli, "prune", "--workspace", s3Repo, "--records", `${alphaRecRel}=${batchFinJson.results[0].sha256}`, "--clean-records"], { cwd: s3Repo, encoding: "utf8" });
      assert.notEqual(mismatchPrune.status, 0);
      assert.match(mismatchPrune.stderr, /does not match/);
      assert.equal(fs.existsSync(path.join(s3Repo, alphaSpecSlot)), true);
      fs.writeFileSync(path.join(s3Repo, alphaRecRel), alphaRaw);
      const wrongPinPrune = spawnSync(process.execPath, [agySquadCli, "prune", "--workspace", s3Repo, "--records", `${alphaRecRel}=${"0".repeat(64)}`], { cwd: s3Repo, encoding: "utf8" });
      assert.notEqual(wrongPinPrune.status, 0);
      assert.equal(fs.existsSync(path.join(s3Repo, alphaSpecSlot)), true);
      const unpinnedPrune = spawnSync(process.execPath, [agySquadCli, "prune", "--workspace", s3Repo, "--records", alphaRecRel], { cwd: s3Repo, encoding: "utf8" });
      assert.notEqual(unpinnedPrune.status, 0);
      assert.match(unpinnedPrune.stderr, /accepted-sha256/);

      // Batch prune --records --clean-records in 1 call
      const batchPrune = spawnSync(
        process.execPath,
        [agySquadCli, "prune", "--records", `${alphaRecRel}=${batchFinJson.results[0].sha256}`, "--records", `${betaRecRel}=${batchFinJson.results[1].sha256}`, "--records", `${alphaRecRel}=${batchFinJson.results[0].sha256}`, "--clean-records"],
        { cwd: s3Parent, env: envWs, encoding: "utf8" }
      );
      assert.equal(batchPrune.status, 0, `FIT-003: batch prune --records --clean-records failed: ${batchPrune.stderr}`);
      const batchPruneJson = JSON.parse(batchPrune.stdout);
      assert.equal(batchPruneJson.ok, true);
      assert.equal(batchPruneJson.count, 2);
      assert.deepEqual(batchPruneJson.cleanedRecords, [alphaRecRel, betaRecRel]);
      assert.equal(fs.existsSync(path.join(s3Repo, alphaRecRel)), false);
      assert.equal(fs.existsSync(path.join(s3Repo, betaRecRel)), false);
      assert.equal(fs.existsSync(path.join(s3Repo, alphaSpecSlot)), false);
      assert.equal(fs.existsSync(path.join(s3Repo, batchFinJson.results[0].bundlePath)), true);

      // Wildcard '.' bundle-init --digest empty-files error must NOT suggest --from-scope (FIT-002)
      const dotPlanCli = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--workspace", s3Repo, "--scope", ".", "--out", "scratch/dot-plan.json", "Wildcard hint check"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(dotPlanCli.status, 0, dotPlanCli.stderr);
      const dotSpecSlot = "scratch/agy-squad/squad-task_squad/specialist-1/report.md";
      fs.mkdirSync(path.join(s3Repo, path.dirname(dotSpecSlot)), { recursive: true });
      fs.writeFileSync(path.join(s3Repo, dotSpecSlot), "# Dot\n", "utf8");
      const dotEmptyDigest = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--workspace", s3Repo, "--plan", "scratch/dot-plan.json", "--handoff", `task-worker=READY ${dotSpecSlot} - ok`, "--digest"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.notEqual(dotEmptyDigest.status, 0);
      assert.doesNotMatch(dotEmptyDigest.stderr, /Pass --from-scope/, "FIT-002: wildcard '.' empty-files error must not suggest --from-scope");

      // 4. Stage 3b Regressions: FIT-010 (.scratch/ + non-scratch baselineIgnorePaths), FLOW-009 (post-Wave-1 collect --strict), FLOW-010 (batch finalize uncarriedUrls), ROI-009/FLOW-011 (transcript_full.jsonl hydration, grep_search/code-fence grounding, --id-map @workerName enforcement, bound UUIDs & audit-check)
      const dotScratchPlanCli = spawnSync(
        process.execPath,
        [
          agySquadCli, "plan",
          "--workspace", s3Repo,
          "--mode", "swarm",
          "--read-only",
          "--scope", "src/app.js",
          "--role", "DotScratchSec",
          "--out", ".scratch/ro-dotscratch-plan.json",
          "FIT-010 .scratch and custom ignore check"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(dotScratchPlanCli.status, 0, dotScratchPlanCli.stderr);
      const customMetaPlanCli = spawnSync(
        process.execPath,
        [
          agySquadCli, "plan",
          "--workspace", s3Repo,
          "--mode", "swarm",
          "--read-only",
          "--scope", "src/app.js",
          "--role", "CustomMetaSec",
          "--out", "meta/plan.json",
          "FIT-010 non-scratch outPath check"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(customMetaPlanCli.status, 0, customMetaPlanCli.stderr);
      const cmSpecSlot = "scratch/cm-run/squad-task_squad/specialist-1/report.md";
      const cmLeadSlot = "scratch/cm-run/squad-task_squad/lead/report.md";
      fs.mkdirSync(path.join(s3Repo, path.dirname(cmSpecSlot)), { recursive: true });
      fs.mkdirSync(path.join(s3Repo, path.dirname(cmLeadSlot)), { recursive: true });
      fs.writeFileSync(
        path.join(s3Repo, cmSpecSlot),
        "# Spec\nChecked `src/app.js:1` via grep_search and see https://example.com/uncarried-spec-doc.\n```js\n// fake/not-a-real-cite.js:99 and src/util.js:1 inside fenced block must be ignored\n```\n",
        "utf8"
      );
      fs.writeFileSync(path.join(s3Repo, cmLeadSlot), "# Synthesis\nContent Verdict: PASS\n", "utf8");
      fs.writeFileSync(
        path.join(s3Repo, "meta/handoffs.json"),
        JSON.stringify([{ sender: "99999999-1111-2222-3333-444444444444", message: `READY ${cmSpecSlot} - ok` }]) + "\n",
        "utf8"
      );
      const cmMappedUuid = "99999999-1111-2222-3333-444444444444";
      const cmInit = spawnSync(
        process.execPath,
        [
          agySquadCli, "bundle-init",
          "--workspace", s3Repo,
          "--plan", "meta/plan.json",
          "--report-root", "scratch/cm-run",
          "--from-scope",
          "--id-map", `custommetasec=${cmMappedUuid}`,
          "--handoffs", "meta/handoffs.json",
          "--coord-id", coordUuid,
          "--digest",
          "--out", "meta/record.json"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(cmInit.status, 0, `FIT-010: non-scratch plan/handoffs/record must pass readOnlyBaseline: ${cmInit.stderr}`);
      const cmInitOut = JSON.parse(cmInit.stdout);
      assert.match(cmInitOut.auditSwarmAdd.brief, /agy-squad audit-check --workspace .* --record meta\/record\.json --coord-id 11111111-2222-3333-4444-555555555555/, "ROI-009: bound auditSwarmAdd must include audit-check with bound record & coordId");
      assert.match(cmInitOut.auditSwarmAdd.brief, new RegExp(`health --id ${cmMappedUuid} --json`), "ROI-009: bound auditSwarmAdd must interpolate mapped worker UUIDs in place of u1,u2");
      const cmSavedRec = JSON.parse(fs.readFileSync(path.join(s3Repo, "meta/record.json"), "utf8"));
      assert.equal(cmSavedRec.assignments[0].workerName, "custommetasec", "FLOW-011: workerName must persist alongside mapped UUID");
      assert.ok(Array.isArray(cmSavedRec.baselineIgnorePaths) && cmSavedRec.baselineIgnorePaths.includes("meta/handoffs.json"));

      // FLOW-011: wrong @workerName under --id-map UUID MUST fail audit-check, and truncated transcript.jsonl hydrated from transcript_full.jsonl + grep_search SearchPath MUST pass
      const cmLogDir = path.join(s3Brain, cmMappedUuid, ".system_generated", "logs");
      fs.mkdirSync(cmLogDir, { recursive: true });
      fs.writeFileSync(
        path.join(cmLogDir, "transcript.jsonl"),
        JSON.stringify({ step_index: 1, content: `[Message] sender=${coordUuid} @wrong-worker-name` }) + "\n",
        "utf8"
      );
      const wrongMentionRes = spawnSync(
        process.execPath,
        [agySquadCli, "audit-check", "--workspace", s3Repo, "--record", "meta/record.json", "--coord-id", coordUuid, "--brain-dir", s3Brain],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(wrongMentionRes.status, 1, "FLOW-011: --id-map UUID must still enforce @<workerName> in Step 1");
      assert.match(wrongMentionRes.stdout, /MISSING_MENTION \(@custommetasec\)/);

      // Now test truncated_fields in transcript.jsonl hydrated from transcript_full.jsonl + grep_search SearchPath + fenced code citation ignored
      fs.writeFileSync(
        path.join(cmLogDir, "transcript.jsonl"),
        [
          JSON.stringify({ step_index: 1, content: "[Message] ...", truncated_fields: ["content"] }),
          JSON.stringify({ step_index: 2, tool_calls: [{ name: "grep_search", arguments: "{trunc" }], truncated_fields: ["tool_calls"] })
        ].join("\n") + "\n",
        "utf8"
      );
      fs.writeFileSync(
        path.join(cmLogDir, "transcript_full.jsonl"),
        [
          JSON.stringify({ step_index: 1, content: `[Message] sender=${coordUuid} @custommetasec Report slot: ${cmSpecSlot}` }),
          JSON.stringify({
            step_index: 2,
            tool_calls: [
              { name: "grep_search", arguments: { SearchPath: path.join(s3Repo, "src/app.js"), Query: "export" } },
              { name: "write_file", arguments: { Path: path.join(s3Repo, cmSpecSlot) } }
            ]
          })
        ].join("\n") + "\n",
        "utf8"
      );
      const hydratedPass = spawnSync(
        process.execPath,
        [agySquadCli, "audit-check", "--workspace", s3Repo, "--record", "meta/record.json", "--coord-id", coordUuid, "--brain-dir", s3Brain],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(hydratedPass.status, 0, `FLOW-011: hydrated transcript_full.jsonl + grep_search citation failed: ${hydratedPass.stdout}`);
      const hydratedJson = JSON.parse(hydratedPass.stdout);
      assert.equal(hydratedJson.ok, true);
      assert.deepEqual(hydratedJson.workers[0].unverifiedCitations, []);

      // FIT-010 + FLOW-010: inspect, digest, and finalize --compact on meta/record.json pass readOnlyBaseline and report uncarriedCitationsCount + uncarriedUrls
      assert.equal(
        spawnSync(process.execPath, [agySquadCli, "inspect", "--workspace", s3Repo, "meta/record.json"], { cwd: s3Parent, encoding: "utf8" }).status,
        0,
        "FIT-010: inspect must honor persisted baselineIgnorePaths"
      );
      const cmFinCompact = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "--workspace", s3Repo, "meta/record.json", "--allow-unaudited", "--compact"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(cmFinCompact.status, 0, `FIT-010/FLOW-010: finalize --compact failed: ${cmFinCompact.stderr}`);
      const cmFinJson = JSON.parse(cmFinCompact.stdout);
      assert.equal(cmFinJson.results[0].uncarriedCitationsCount, 1, "FLOW-010: compact/multi-record finalize must report uncarriedCitationsCount");
      assert.deepEqual(cmFinJson.results[0].uncarriedUrls, ["https://example.com/uncarried-spec-doc"]);

      // FIT-012 / FLOW-013: multi-squad bundle-init --all-squads --out-dir <non-scratch-dir> --digest -> finalize ignores sibling record paths
      const multiManifestPath = path.join(s3Repo, "meta/multi-manifest.json");
      fs.writeFileSync(
        multiManifestPath,
        JSON.stringify({
          squads: {
            sq1: { specialists: [{ role: "S1", objective: "Check app", scopeFiles: ["src/app.js"], readOnly: true }] },
            sq2: { specialists: [{ role: "S2", objective: "Check app", scopeFiles: ["src/app.js"], readOnly: true }] }
          }
        }) + "\n",
        "utf8"
      );
      const mPlanRes = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--workspace", s3Repo, "--manifest", "meta/multi-manifest.json", "--topology", "flat", "--no-integrity", "--out", "meta/multi-plan.json", "--replace"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(mPlanRes.status, 0, mPlanRes.stderr);
      const mPlan = JSON.parse(fs.readFileSync(path.join(s3Repo, "meta/multi-plan.json"), "utf8"));
      const mHandoffs = [];
      for (const w of mPlan.workers) {
        const sp = w.specialists[0];
        fs.mkdirSync(path.dirname(path.join(s3Repo, sp.reportSlot)), { recursive: true });
        fs.writeFileSync(path.join(s3Repo, sp.reportSlot), `# ${w.squadId}\nVerified src/app.js:1.\n`, "utf8");
        fs.mkdirSync(path.dirname(path.join(s3Repo, w.synthesisSlot)), { recursive: true });
        fs.writeFileSync(path.join(s3Repo, w.synthesisSlot), `# Lead ${w.squadId}\nContent Verdict: PASS\n`, "utf8");
        mHandoffs.push({ sender: sp.workerName, message: `@coordinator READY ${sp.reportSlot} - ok` });
      }
      fs.writeFileSync(path.join(s3Repo, "meta/multi-handoffs.json"), JSON.stringify(mHandoffs) + "\n", "utf8");
      const mBatchInit = spawnSync(
        process.execPath,
        [agySquadCli, "bundle-init", "--workspace", s3Repo, "--plan", "meta/multi-plan.json", "--all-squads", "--handoffs", "meta/multi-handoffs.json", "--from-scope", "--digest", "--out-dir", "meta/records", "--replace"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(mBatchInit.status, 0, `FIT-012/FLOW-013: multi-squad non-scratch --out-dir --digest failed: ${mBatchInit.stderr}`);
      const mBatchFin = spawnSync(
        process.execPath,
        [agySquadCli, "finalize", "--workspace", s3Repo, "meta/records/sq1.record.json", "meta/records/sq2.record.json", "--allow-unaudited", "--replace"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(mBatchFin.status, 0, `FIT-012/FLOW-013: multi-squad non-scratch finalize failed: ${mBatchFin.stderr}`);
      const mBatchFinJson = JSON.parse(mBatchFin.stdout);

      // SCRIPT-02: verify and positional prune infer child workspace root when invoked from s3Parent without --workspace
      const childVerifyNoWs = spawnSync(
        process.execPath,
        [agySquadCli, "verify", `ChildRepo/${mBatchFinJson.results[0].bundlePath}`, mBatchFinJson.results[0].sha256],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(childVerifyNoWs.status, 0, `SCRIPT-02: parent-CWD verify without --workspace failed: ${childVerifyNoWs.stderr}`);
      const childPruneNoWs = spawnSync(
        process.execPath,
        [agySquadCli, "prune", `ChildRepo/${mBatchFinJson.results[0].bundlePath}`, mBatchFinJson.results[0].sha256],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(childPruneNoWs.status, 0, `SCRIPT-02: parent-CWD positional prune without --workspace failed: ${childPruneNoWs.stderr}`);

      // SEC-01 & SEC-02: symlinked --trace / symlinked transcript_full.jsonl rejected with O_NOFOLLOW; shell redirection (> file) flagged on readOnly and not credited as read
      const outsideSecretJsonl = path.join(s3Parent, "outside-secret.jsonl");
      fs.writeFileSync(
        outsideSecretJsonl,
        JSON.stringify({ step_index: 1, content: `[Message] sender=${coordUuid} @custommetasec` }) + "\n",
        "utf8"
      );
      const traceLinkPath = path.join(s3Repo, "scratch/trace-link.jsonl");
      fs.symlinkSync(outsideSecretJsonl, traceLinkPath);
      const sec01LinkRes = spawnSync(
        process.execPath,
        [agySquadCli, "audit-check", "--workspace", s3Repo, "meta/record.json", "--coord-id", coordUuid, "--trace", `${cmMappedUuid}=${traceLinkPath}`],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(sec01LinkRes.status, 1, "SEC-01: symlinked --trace file must fail closed");
      assert.match(sec01LinkRes.stdout, /UNSAFE_TRACE \(ELOOP\)/);
      fs.unlinkSync(traceLinkPath);

      // Symlinked transcript_full.jsonl companion must also fail closed
      const fullTracePath = path.join(cmLogDir, "transcript_full.jsonl");
      fs.unlinkSync(fullTracePath);
      fs.symlinkSync(outsideSecretJsonl, fullTracePath);
      const sec01FullLinkRes = spawnSync(
        process.execPath,
        [agySquadCli, "audit-check", "--workspace", s3Repo, "meta/record.json", "--coord-id", coordUuid, "--brain-dir", s3Brain],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(sec01FullLinkRes.status, 1, "SEC-01: symlinked transcript_full.jsonl must fail closed");
      assert.match(sec01FullLinkRes.stdout, /UNSAFE_FULL_TRACE \(ELOOP\)/);
      fs.unlinkSync(fullTracePath);

      // SEC-02: shell output redirection (> src/app.js) in readOnly trace triggers UNAUTHORIZED_WRITE and does not credit src/app.js as read (while 2>/dev/null and 2>&1 stay allowed)
      fs.writeFileSync(
        path.join(cmLogDir, "transcript.jsonl"),
        [
          JSON.stringify({ step_index: 1, content: `[Message] sender=${coordUuid} @custommetasec` }),
          JSON.stringify({
            step_index: 2,
            tool_calls: [
              { name: "run_command", arguments: { CommandLine: "echo hacked > src/app.js" } },
              { name: "write_file", arguments: { Path: path.join(s3Repo, cmSpecSlot) } }
            ]
          })
        ].join("\n") + "\n",
        "utf8"
      );
      const sec02RedirRes = spawnSync(
        process.execPath,
        [agySquadCli, "audit-check", "--workspace", s3Repo, "meta/record.json", "--coord-id", coordUuid, "--brain-dir", s3Brain],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(sec02RedirRes.status, 1, "SEC-02: shell > redirection on readOnly cohort must fail closed");
      const sec02Json = JSON.parse(sec02RedirRes.stdout);
      assert.ok(sec02Json.workers[0].unauthorizedWrites.includes("run_command"));
      assert.deepEqual(sec02Json.workers[0].unverifiedCitations, ["src/app.js"], "SEC-02: redirected output target must not be credited as grounded read");

      fs.writeFileSync(
        path.join(cmLogDir, "transcript.jsonl"),
        [
          JSON.stringify({ step_index: 1, content: `[Message] sender=${coordUuid} @custommetasec` }),
          JSON.stringify({
            step_index: 2,
            tool_calls: [
              { name: "run_command", arguments: { CommandLine: "git grep -n export src/app.js 2>/dev/null 2>&1" } },
              { name: "write_file", arguments: { Path: path.join(s3Repo, cmSpecSlot) } }
            ]
          })
        ].join("\n") + "\n",
        "utf8"
      );
      const sec02SafeFdRes = spawnSync(
        process.execPath,
        [agySquadCli, "audit-check", "--workspace", s3Repo, "meta/record.json", "--coord-id", coordUuid, "--brain-dir", s3Brain],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(sec02SafeFdRes.status, 0, `SEC-02: safe 2>/dev/null and 2>&1 must pass: ${sec02SafeFdRes.stdout}`);

      // SVC-01: 2-specialist integrity_auditor squad binds distinct integrityAuditSlots[idx] and emits auditSwarmAdds
      const dualAuditManifest = path.join(s3Repo, "meta/dual-audit-manifest.json");
      fs.writeFileSync(
        dualAuditManifest,
        JSON.stringify({
          squads: {
            sqmain: {
              specialists: [{ role: "MainSpec", objective: "Audit app", scopeFiles: ["src/app.js"], readOnly: true }]
            },
            integrity_auditor: {
              specialists: [
                { role: "AuditorOne", objective: "Audit trace 1", scopeFiles: ["src/app.js"], readOnly: true },
                { role: "AuditorTwo", objective: "Audit trace 2", scopeFiles: ["src/app.js"], readOnly: true }
              ]
            }
          }
        }) + "\n",
        "utf8"
      );
      const dualPlanRes = spawnSync(
        process.execPath,
        [agySquadCli, "plan", "--workspace", s3Repo, "--manifest", "meta/dual-audit-manifest.json", "--topology", "flat", "--out", "meta/dual-plan.json", "--replace"],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(dualPlanRes.status, 0, dualPlanRes.stderr);
      const dualPlanObj = JSON.parse(fs.readFileSync(path.join(s3Repo, "meta/dual-plan.json"), "utf8"));
      assert.equal(dualPlanObj.integrityAuditPlan.length, 2);
      const dualSpec = dualPlanObj.workers[0].specialists[0];
      const dualLeadSlot = dualPlanObj.workers[0].synthesisSlot;
      fs.mkdirSync(path.dirname(path.join(s3Repo, dualSpec.reportSlot)), { recursive: true });
      fs.writeFileSync(path.join(s3Repo, dualSpec.reportSlot), "# Dual\nChecked src/app.js:1.\n", "utf8");
      fs.mkdirSync(path.dirname(path.join(s3Repo, dualLeadSlot)), { recursive: true });
      fs.writeFileSync(path.join(s3Repo, dualLeadSlot), "# Dual Lead\nContent Verdict: PASS\n", "utf8");
      const dualInitRes = spawnSync(
        process.execPath,
        [
          agySquadCli, "bundle-init",
          "--workspace", s3Repo,
          "--plan", "meta/dual-plan.json",
          "--squad", "sqmain",
          "--from-scope",
          "--handoff", `${dualSpec.workerName}=READY ${dualSpec.reportSlot} - ok`,
          "--digest",
          "--out", "meta/dual-record.json",
          "--replace"
        ],
        { cwd: s3Parent, encoding: "utf8" }
      );
      assert.equal(dualInitRes.status, 0, `SVC-01: dual-auditor bundle-init failed: ${dualInitRes.stderr}`);
      const dualInitOut = JSON.parse(dualInitRes.stdout);
      assert.equal(Array.isArray(dualInitOut.auditSwarmAdds), true, "SVC-01: 2-auditor squad must emit auditSwarmAdds array");
      assert.equal(dualInitOut.auditSwarmAdds.length, 2);
      assert.match(dualInitOut.auditSwarmAdds[0].brief, /specialist-1\/report\.md/);
      assert.match(dualInitOut.auditSwarmAdds[1].brief, /specialist-2\/report\.md/);

      // RUN-01 & RUN-03: readOnlyBaseline handles scoped directories containing symlinks AND detects mutations to dirty git files beyond index 64
      const roGitRepo = fs.mkdtempSync(path.join(os.tmpdir(), "agy-ro-git-"));
      try {
        spawnSync("git", ["init", "-q"], { cwd: roGitRepo });
        spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: roGitRepo });
        spawnSync("git", ["config", "user.name", "Test"], { cwd: roGitRepo });
        fs.mkdirSync(path.join(roGitRepo, "src"), { recursive: true });
        fs.mkdirSync(path.join(roGitRepo, "other"), { recursive: true });
        fs.writeFileSync(path.join(roGitRepo, "src/real.js"), "export const real = 1;\n", "utf8");
        fs.symlinkSync("real.js", path.join(roGitRepo, "src/alias.js"));
        for (let i = 1; i <= 75; i++) {
          const pad = String(i).padStart(3, "0");
          fs.writeFileSync(path.join(roGitRepo, `other/f${pad}.js`), `export const v = ${i};\n`, "utf8");
        }
        spawnSync("git", ["add", "."], { cwd: roGitRepo });
        spawnSync("git", ["commit", "-q", "-m", "init"], { cwd: roGitRepo });
        // Dirty all 75 files in other/ before planning
        for (let i = 1; i <= 75; i++) {
          const pad = String(i).padStart(3, "0");
          fs.writeFileSync(path.join(roGitRepo, `other/f${pad}.js`), `export const v = ${i * 10};\n`, "utf8");
        }
        const roSymPlanRes = spawnSync(
          process.execPath,
          [
            agySquadCli, "plan",
            "--workspace", roGitRepo,
            "--mode", "swarm",
            "--read-only",
            "--no-integrity",
            "--scope", "src",
            "--role", "RoSym",
            "--out", "scratch/ro-sym-plan.json",
            "Read-only symlink and dirty baseline check"
          ],
          { cwd: roGitRepo, encoding: "utf8" }
        );
        assert.equal(roSymPlanRes.status, 0, roSymPlanRes.stderr);
        const roSymPlan = JSON.parse(fs.readFileSync(path.join(roGitRepo, "scratch/ro-sym-plan.json"), "utf8"));
        assert.ok(roSymPlan.readOnlyBaseline.files["src/real.js"], "RUN-01: sibling regular file inside scoped dir with symlink must be hashed");
        assert.equal(roSymPlan.readOnlyBaseline.symlinks["src/alias.js"], "real.js", "RUN-01: nested symlink inside scoped dir must be recorded");
        assert.ok(roSymPlan.readOnlyBaseline.dirtyFiles["other/f070.js"], "RUN-03: dirty file #70 must be hashed in dirtyFiles");

        const roSpecSlot = roSymPlan.workers[0].specialists[0].reportSlot;
        const roLeadSlot = roSymPlan.workers[0].synthesisSlot;
        fs.mkdirSync(path.dirname(path.join(roGitRepo, roSpecSlot)), { recursive: true });
        fs.writeFileSync(path.join(roGitRepo, roSpecSlot), "# RO\nChecked src/real.js:1.\n", "utf8");
        fs.mkdirSync(path.dirname(path.join(roGitRepo, roLeadSlot)), { recursive: true });
        fs.writeFileSync(path.join(roGitRepo, roLeadSlot), "# RO Lead\nContent Verdict: PASS\n", "utf8");

        const roInitClean = spawnSync(
          process.execPath,
          [
            agySquadCli, "bundle-init",
            "--workspace", roGitRepo,
            "--plan", "scratch/ro-sym-plan.json",
            "--file", "src/real.js",
            "--handoff", `rosym=READY ${roSpecSlot} - ok`,
            "--allow-unaudited",
            "--out", "scratch/ro-sym-record.json"
          ],
          { cwd: roGitRepo, encoding: "utf8" }
        );
        assert.equal(roInitClean.status, 0, `RUN-01: untouched scoped dir with symlink must pass bundle-init: ${roInitClean.stderr}`);
        const roFinClean = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "--workspace", roGitRepo, "scratch/ro-sym-record.json", "--allow-unaudited", "--replace"],
          { cwd: roGitRepo, encoding: "utf8" }
        );
        assert.equal(roFinClean.status, 0, `RUN-01: untouched scoped dir with symlink must pass finalize: ${roFinClean.stderr}`);

        // Mutating dirty file #70 must fail closed with Read-only containment violation
        fs.writeFileSync(path.join(roGitRepo, "other/f070.js"), "export const v = 999999;\n", "utf8");
        const roDirty70Fail = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "--workspace", roGitRepo, "scratch/ro-sym-record.json", "--allow-unaudited", "--replace"],
          { cwd: roGitRepo, encoding: "utf8" }
        );
        assert.notEqual(roDirty70Fail.status, 0, "RUN-03: mutating dirty file #70 must fail closed");
        assert.match(roDirty70Fail.stderr, /Read-only containment violation: pre-existing dirty file 'other\/f070\.js'/);

        // Restore f070.js, then retarget symlink src/alias.js -> must also fail closed
        fs.writeFileSync(path.join(roGitRepo, "other/f070.js"), "export const v = 700;\n", "utf8");
        fs.unlinkSync(path.join(roGitRepo, "src/alias.js"));
        fs.symlinkSync("../other/f001.js", path.join(roGitRepo, "src/alias.js"));
        const roSymMutateFail = spawnSync(
          process.execPath,
          [agySquadCli, "finalize", "--workspace", roGitRepo, "scratch/ro-sym-record.json", "--allow-unaudited", "--replace"],
          { cwd: roGitRepo, encoding: "utf8" }
        );
        assert.notEqual(roSymMutateFail.status, 0, "RUN-01: mutating symlink target inside read-only scope must fail closed");
        assert.match(roSymMutateFail.stderr, /Read-only containment violation: baseline symlink 'src\/alias\.js'/);
      } finally {
        fs.rmSync(roGitRepo, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(s3Parent, { recursive: true, force: true });
      fs.rmSync(s3Wt, { recursive: true, force: true });
      fs.rmSync(s3Brain, { recursive: true, force: true });
    }
  }

  // SCRIPT-001/002, SEC-001, SVC-001, RUN-001: trace-check regressions
  {
    const tw = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-trace-")));
    try {
      const rec = { squadId: "s", readOnly: true, assignments: [{ conversationId: "w1", report: "scratch/r.md" }] };
      const trace = (step, name) => {
        const tp = path.join(tw, `${name}.jsonl`);
        fs.writeFileSync(tp, JSON.stringify({ step_index: 0, content: "sender=C @w1", ...step }) + "\n");
        return verifyWorkerTraces(tw, rec, { coordId: "C", traces: { w1: tp } });
      };
      const cmd = (CommandLine, n) => trace({ tool_calls: [{ name: "run_command", arguments: { CommandLine } }] }, n);
      assert.equal(cmd("git grep -n patch -- mcp", "a").ok, true);
      assert.equal(cmd("ls | grep rm", "b").ok, true);
      assert.equal(cmd("rm file", "c").ok, false);
      assert.equal(cmd("ls mcp > scratch/ls.txt", "d").ok, true);
      assert.equal(cmd("ls mcp > src/x", "e").ok, false);
      assert.equal(cmd("node -e 'require(\"fs\").writeFileSync(\"x\",\"y\")'", "f").ok, false);
      assert.equal(cmd("git checkout .", "g").ok, false);
      const meta = { Summary: "a", UserFacing: false, RequestFeedback: false };
      assert.equal(trace({ tool_calls: [{ name: "write_file", arguments: { Path: path.join(tw, "src/brain/x.js"), Content: "x", ArtifactMetadata: meta } }] }, "h").ok, false);
      const trunc = trace({ truncated_fields: ["tool_calls"], tool_calls: [{ name: "run_command", arguments: { CommandLine: "ls" } }] }, "i");
      assert.ok(trunc.anomalies.some(a => a.includes("TRUNCATED_STEP_UNRESOLVED")));
      const brain = path.join(tw, "brain");
      for (const id of ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]) {
        const d = path.join(brain, id, ".system_generated", "logs");
        fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, "transcript.jsonl"), JSON.stringify({ step_index: 0, content: "sender=C @specialist-1" }) + "\n");
      }
      const srec = { squadId: "s", readOnly: true, assignments: [{ conversationId: "specialist-1", report: "scratch/r.md" }] };
      const noCoord = verifyWorkerTraces(tw, srec, { brainRoot: brain });
      assert.ok(noCoord.anomalies.some(a => a.includes("MISSING_COORD_ID")));
      assert.ok(!verifyWorkerTraces(tw, srec, { brainRoot: brain, coordId: "C" }).anomalies.some(a => a.includes("MISSING_TRACE")));

      // Compact transcript.jsonl stores tool args as JSON-encoded strings (real brain log shape)
      const compactWs = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-trace-compact-")));
      try {
        fs.mkdirSync(path.join(compactWs, "src"), { recursive: true });
        fs.mkdirSync(path.join(compactWs, "scratch"), { recursive: true });
        const srcFile = path.join(compactWs, "src", "a.js");
        const reportFile = path.join(compactWs, "scratch", "r.md");
        fs.writeFileSync(srcFile, "export const x = 1;\n", "utf8");
        fs.writeFileSync(reportFile, "Checked src/a.js:1 and verified behavior.\n", "utf8");

        const compactBrain = path.join(compactWs, "brain-root");
        const sessId = "33333333-3333-3333-3333-333333333333";
        const sessLogs = path.join(compactBrain, sessId, ".system_generated", "logs");
        fs.mkdirSync(sessLogs, { recursive: true });
        const artifactPath = path.join(compactBrain, sessId, "notes.md");
        const compactLines = [
          JSON.stringify({ step_index: 0, content: "sender=C @w1 Review src/a.js" }),
          JSON.stringify({
            step_index: 1,
            tool_calls: [
              { name: "read_file", args: { Path: JSON.stringify(srcFile), StartLine: "1", EndLine: "20" } },
              { name: "run_command", args: { CommandLine: JSON.stringify("git grep -n x -- src/a.js"), WaitMsBeforeAsync: "5000" } }
            ]
          }),
          JSON.stringify({
            step_index: 2,
            truncated_fields: ["tool_calls"],
            tool_calls: [
              {
                name: "write_file",
                args: {
                  Path: JSON.stringify(reportFile),
                  Content: "\"Checked src/a.js:1...",
                  Overwrite: "true"
                }
              },
              {
                name: "write_file",
                args: {
                  Path: JSON.stringify(artifactPath),
                  Content: "\"# Notes",
                  ArtifactMetadata: JSON.stringify({ Summary: "notes", UserFacing: false, RequestFeedback: false })
                }
              }
            ]
          })
        ];
        const fullLines = [
          JSON.stringify({ step_index: 0, content: "sender=C @w1 Review src/a.js" }),
          JSON.stringify({
            step_index: 1,
            tool_calls: [
              { name: "read_file", args: { Path: srcFile, StartLine: 1, EndLine: 20 } },
              { name: "run_command", args: { CommandLine: "git grep -n x -- src/a.js", WaitMsBeforeAsync: 5000 } }
            ]
          }),
          JSON.stringify({
            step_index: 2,
            tool_calls: [
              { name: "write_file", args: { Path: reportFile, Content: "Checked src/a.js:1 and verified behavior.\n", Overwrite: true } },
              {
                name: "write_file",
                args: {
                  Path: artifactPath,
                  Content: "# Notes\n",
                  ArtifactMetadata: { Summary: "notes", UserFacing: false, RequestFeedback: false }
                }
              }
            ]
          })
        ];
        fs.writeFileSync(path.join(sessLogs, "transcript.jsonl"), compactLines.join("\n") + "\n", "utf8");
        fs.writeFileSync(path.join(sessLogs, "transcript_full.jsonl"), fullLines.join("\n") + "\n", "utf8");

        const compactRec = { squadId: "s", readOnly: true, assignments: [{ conversationId: "w1", report: "scratch/r.md" }] };
        const hydrated = verifyWorkerTraces(compactWs, compactRec, { coordId: "C", brainRoot: compactBrain });
        assert.equal(hydrated.ok, true, `Hydrated compact+full honest worker must be CLEAN: ${JSON.stringify(hydrated)}`);
        assert.equal(hydrated.recommendedVerdict, "CLEAN");
        assert.equal(hydrated.warningsCount, undefined);
        assert.deepEqual(hydrated.workers[0].unauthorizedWrites, []);
        assert.deepEqual(hydrated.workers[0].unverifiedCitations, []);

        // Compact-only transcript (no transcript_full.jsonl, no truncated_fields) must also decode quoted args cleanly
        const compactOnlyLogs = path.join(compactBrain, "44444444-4444-4444-4444-444444444444", ".system_generated", "logs");
        fs.mkdirSync(compactOnlyLogs, { recursive: true });
        const compactOnlyPath = path.join(compactOnlyLogs, "transcript.jsonl");
        const compactOnlyLines = [
          JSON.stringify({ step_index: 0, content: "sender=C @w1 Review src/a.js" }),
          JSON.stringify({
            step_index: 1,
            tool_calls: [
              { name: "read_file", args: { Path: JSON.stringify(srcFile), StartLine: "1", EndLine: "20" } },
              {
                name: "write_file",
                args: {
                  Path: JSON.stringify(reportFile),
                  Content: JSON.stringify("Checked src/a.js:1 and verified behavior.\n")
                }
              },
              {
                name: "write_file",
                args: {
                  Path: JSON.stringify(path.join(compactBrain, "44444444-4444-4444-4444-444444444444", "notes.md")),
                  Content: JSON.stringify("# Notes\n"),
                  ArtifactMetadata: JSON.stringify({ Summary: "notes", UserFacing: false, RequestFeedback: false })
                }
              }
            ]
          })
        ];
        fs.writeFileSync(compactOnlyPath, compactOnlyLines.join("\n") + "\n", "utf8");
        const compactOnly = verifyWorkerTraces(compactWs, compactRec, {
          coordId: "C",
          brainRoot: compactBrain,
          traces: { w1: compactOnlyPath }
        });
        assert.equal(compactOnly.ok, true, `Compact-only honest worker must be CLEAN: ${JSON.stringify(compactOnly)}`);
        assert.equal(compactOnly.warningsCount, undefined);
        assert.deepEqual(compactOnly.workers[0].unauthorizedWrites, []);
        assert.deepEqual(compactOnly.workers[0].unverifiedCitations, []);

        // Compact-encoded unauthorized file write and mutating shell command must still be caught
        const compactWritePath = path.join(compactWs, "compact-bad-write.jsonl");
        fs.writeFileSync(
          compactWritePath,
          [
            JSON.stringify({ step_index: 0, content: "sender=C @w1" }),
            JSON.stringify({
              step_index: 1,
              tool_calls: [
                { name: "write_file", args: { Path: JSON.stringify(srcFile), Content: JSON.stringify("bad") } },
                { name: "run_command", args: { CommandLine: JSON.stringify("rm src/a.js") } }
              ]
            })
          ].join("\n") + "\n",
          "utf8"
        );
        const compactBad = verifyWorkerTraces(compactWs, compactRec, { coordId: "C", traces: { w1: compactWritePath } });
        assert.equal(compactBad.ok, false);
        assert.ok(compactBad.workers[0].unauthorizedWrites.includes("src/a.js"));
        assert.ok(compactBad.workers[0].unauthorizedWrites.includes("run_command"));
      } finally {
        fs.rmSync(compactWs, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(tw, { recursive: true, force: true });
    }
  }

  // Worktree ownership, shell boundaries, and fail-closed trace regressions.
  {
    const { scanShellCommand, shellCommandWrites } = await import("../mcp/shell.mjs");
    const { captureReadOnlyBaseline, verifyReadOnlyBaseline, normalizeToolCallArgs } = await import("../mcp/handoffs.mjs");
    const tmp = fs.realpathSync.native(fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), "agy-hardening-")));
    const worktree = `${tmp}-worker space`;
    try {
      const git = args => { const result = spawnSync("git", ["-C", tmp, ...args], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
      const put = (rel, text, at = tmp) => { const file = path.join(at, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
      git(["init", "-q"]); git(["config", "user.name", "Test"]); git(["config", "user.email", "test@example.com"]);
      put("src/a.js", "line1\n"); put("docs/guide.md", "guide\n"); put("[2026]/a.js", "line1\n");
      git(["add", "."]); git(["commit", "-qm", "initial"]);
      assert.equal(normalizeToolCallArgs({ Path: "[2026]" }, false).Path, "[2026]");
      assert.equal(normalizeToolCallArgs({ Path: "[2026]" }, true).Path, "[2026]");
      assert.equal(normalizeToolCallArgs({ Path: '\"[2026]\"' }, true).Path, "[2026]");
      assert.equal(normalizeToolCallArgs({ ArtifactMetadata: "false" }, true).ArtifactMetadata, false);
      const baseline = captureReadOnlyBaseline(tmp, ["docs"], undefined);
      assert.match(baseline.gitHead, /^[a-f0-9]{40}$/);
      const scoped = captureReadOnlyBaseline(tmp, ["docs"], undefined, null, { scoped: true });
      put("src/a.js", "approved edit\n");
      assert.doesNotThrow(() => verifyReadOnlyBaseline(tmp, scoped));
      assert.throws(() => verifyReadOnlyBaseline(tmp, baseline), /containment violation/);
      git(["add", "."]); git(["commit", "-qm", "outside scope"]);
      assert.throws(() => verifyReadOnlyBaseline(tmp, baseline), /git HEAD changed/);
      assert.doesNotThrow(() => verifyReadOnlyBaseline(tmp, scoped));
      put("docs/new.md", "unauthorized\n");
      assert.throws(() => verifyReadOnlyBaseline(tmp, scoped), /new file/);
      fs.unlinkSync(path.join(tmp, "docs/new.md"));
      git(["worktree", "add", "--detach", worktree]);
      const slot = "scratch/agy-squad/squad-own/specialist-1/report.md";
      const sibling = "scratch/agy-squad/squad-own/specialist-2/report.md";
      const leadSlot = "scratch/agy-squad/squad-own/lead/report.md";
      const plan = { executionMode: "swarm", workers: [{ squadId: "own", specialists: [{ workerName: "one", reportSlot: slot, swarmAdd: { workspace: "share" } }, { workerName: "two", reportSlot: sibling, swarmAdd: { workspace: "share" } }], lead: { reportSlot: leadSlot, swarmAdd: { workspace: "inherit" } } }] };
      for (const rel of [slot, sibling, leadSlot]) put(rel, `report ${rel}\n`, worktree);
      const handoffs = [{ sender: "one", message: `READY ${slot} - wt="${worktree}" checked` }];
      const collected = collectReportSlots(tmp, { plan, handoffs });
      assert.deepEqual(collected.collected.map(r => r.slot), [slot]);
      assert.equal(fs.existsSync(path.join(tmp, sibling)), false);
      assert.equal(fs.existsSync(path.join(tmp, leadSlot)), false);
      const { planSquadCohort } = await import("../mcp/planner.mjs");
      const isolatedPlan = planSquadCohort({ manifest: { squads: { own: { specialists: [{ role: "One", objective: "Review", scopeFiles: ["src/a.js"] }] } } }, workspaceIsolation: "share", includeIntegrityAuditor: false }, tmp);
      const rootRecord = buildBundleRecordInit(tmp, { plan: isolatedPlan, files: ["src/a.js"], handoffs: [{ ...handoffs[0], sender: isolatedPlan.workers[0].specialists[0].workerName }], allowUnaudited: true });
      assert.equal(rootRecord.assignments[0].worktreeRoot, worktree);

      assert.throws(() => collectReportSlots(tmp, { plan, handoffs: [{ sender: "one", message: `READY ${slot} - wt="${path.dirname(tmp)}" checked` }] }), /Untrusted/);
      const record = { squadId: "own", readOnly: true, assignments: [{ conversationId: "one", report: slot, worktreeRoot: worktree }] };
      put(slot, "Read src/a.js:1\n");
      const logdir = path.join(tmp, "brain", "session", ".system_generated", "logs");
      fs.mkdirSync(logdir, { recursive: true });
      const tracePath = path.join(logdir, "transcript.jsonl");
      const audit = (calls, targetRecord = record, trace = tracePath) => {
        fs.writeFileSync(trace, [JSON.stringify({ step_index: 0, content: "sender=C @one" }), JSON.stringify({ step_index: 1, tool_calls: calls })].join("\n") + "\n");
        return verifyWorkerTraces(tmp, targetRecord, { coordId: "C", traces: { one: trace } });
      };
      const read = { name: "read_file", args: { Path: path.join(worktree, "src/a.js") } };
      assert.equal(audit([read, { name: "write_file", args: { Path: path.join(worktree, slot) } }]).ok, true);
      assert.equal(audit([read, { name: "write_file", args: { Path: path.join(worktree, "src/a.js") } }]).ok, false);
      assert.equal(audit([read, { name: "write_file", args: { Path: path.join(worktree, "src/a.js") } }], { ...record, readOnly: false }).ok, true);
      assert.equal(audit([read, { name: "write_file", args: { Path: path.join(tmp, "src/a.js") } }], { ...record, readOnly: false }).ok, false);
      assert.equal(audit([{ name: "run_command", args: { CommandLine: `echo hijack > "${path.join(worktree, sibling)}"` } }]).ok, false);
      const metadata = { Summary: "notes", UserFacing: false, RequestFeedback: false };
      const ownNote = path.join(tmp, "brain/session/note.md");
      assert.equal(audit([{ name: "write_file", args: { Path: ownNote, ArtifactMetadata: metadata } }]).ok, true);
      for (const bad of [false, "false", null, "null", {}, { anything: true }]) assert.equal(audit([{ name: "write_file", args: { Path: ownNote, ArtifactMetadata: bad } }]).ok, false);
      for (const target of [path.join(tmp, "brain/other/note.md"), tracePath]) assert.equal(audit([{ name: "write_file", args: { Path: target, ArtifactMetadata: metadata } }]).ok, false);
      const symlinkDir = path.join(tmp, "brain/session/escape");
      fs.symlinkSync(worktree, symlinkDir, process.platform === "win32" ? "junction" : "dir");
      assert.equal(audit([{ name: "write_file", args: { Path: path.join(symlinkDir, "note.md"), ArtifactMetadata: metadata } }]).ok, false);
      assert.throws(() => verifyWorkerTraces(tmp, { assignments: [] }), /assignments/);
      for (const cmd of ["git -C . status", "ls .", "echo src", "echo src/a.js"]) {
        const result = audit([{ name: "run_command", args: { CommandLine: cmd } }]);
        assert.deepEqual(result.workers[0].unverifiedCitations, ["src/a.js"], cmd);
      }
      assert.deepEqual(audit([{ name: "run_command", args: { CommandLine: "rg -n line1 src" } }]).workers[0].unverifiedCitations, []);
      put(slot, "Read [2026]/a.js:1\n");
      const fullTrace = path.join(logdir, "transcript_full.jsonl");
      assert.equal(audit([{ name: "grep_search", args: { SearchPath: "[2026]" } }], { ...record, assignments: [{ conversationId: "one", report: slot }] }, fullTrace).warningsCount, undefined);
      fs.writeFileSync(path.join(tmp, slot), Buffer.from([0xff]));
      assert.equal(audit([read]).ok, false);
      fs.unlinkSync(path.join(tmp, slot));
      fs.symlinkSync(path.join(worktree, slot), path.join(tmp, slot));
      assert.equal(audit([read]).ok, false);
      for (const cmd of ["/bin/rm src/a.js", "C:\\bin\\rm.exe src/a.js", "eval 'rm src/a.js'", "exec rm src/a.js", "source mutating.sh", "node -p \"require('fs').writeFileSync('x','y')\"", "env rm src/a.js", "env -C /tmp rm src/a.js", "env --chdir /tmp rm src/a.js", "git -C . checkout -- src/a.js", "git rm src/a.js", "git mv src/a.js src/b.js", "sh -c 'echo hacked > src/a.js'", `node -e"require('fs').writeFileSync('x','y')"`]) assert.equal(shellCommandWrites(scanShellCommand(cmd), () => false), true, cmd);
      for (const cmd of [`echo hi > "scratch/ok.txt"`, `echo hi > '/dev/null'`, `rg "x => y" src`, `awk '$1 > 0' src/a.js`]) assert.equal(shellCommandWrites(scanShellCommand(cmd), t => t === "/dev/null" || t.startsWith("scratch/")), false, cmd);
      fs.unlinkSync(path.join(tmp, slot));
      put(slot, "Read src/a.js:1\n");
      put(leadSlot, "Content Verdict: PASS\n");
      const retainedRecord = { ...record, workspace: tmp, requireIntegrityAudit: false, retainReports: true, verdict: "PASS", verifiedFiles: fingerprint(tmp, ["src/a.js"]), handoffs: [{ sender: "one", message: `READY ${slot} - checked` }] };
      const retainedBundle = bundleReports(tmp, retainedRecord);
      put("scratch/retained-record.json", JSON.stringify(retainedRecord));
      const keepRecord = spawnSync(process.execPath, [agySquadCli, "prune", "--records", `scratch/retained-record.json=${retainedBundle.sha256}`, "--clean-records"], { cwd: tmp, encoding: "utf8" });
      assert.equal(keepRecord.status, 0, keepRecord.stderr);
      assert.equal(fs.existsSync(path.join(tmp, "scratch/retained-record.json")), true);
      assert.equal(fs.existsSync(path.join(tmp, slot)), true);
      fs.writeFileSync(tracePath, JSON.stringify({ step_index: 0, content: "x".repeat(20000) }) + "\n" + JSON.stringify({ step_index: 1, content: "sender=C @one" }) + "\n");
      assert.equal(verifyWorkerTraces(tmp, record, { coordId: "C", brainRoot: path.join(tmp, "brain") }).ok, true);
      const stress = spawnSync(process.execPath, ["--input-type=module", "-e", `import assert from 'node:assert/strict'; import {scanShellCommand,shellCommandWrites} from ${JSON.stringify(new URL("../mcp/shell.mjs", import.meta.url).href)}; for(const token of ['git ','open(a','require(','Path(']) { const start=performance.now(); shellCommandWrites(scanShellCommand(token.repeat(20000)),()=>false); assert.ok(performance.now()-start<200, token); }`], { encoding: "utf8", timeout: 5000 });
      assert.equal(stress.status, 0, stress.stderr);
      for (const cmd of [["digest", "--coord-id", "C", "missing.json"], ["digest", "--trace", "one=x", "missing.json"], ["audit-check", "--coord-id", "bad;touch-x", "missing.json"], ["bundle-init", "--plan", "missing.json", "--coord-id", "bad;touch-x"]]) {
        const result = spawnSync(process.execPath, [agySquadCli, ...cmd], { cwd: tmp, encoding: "utf8" });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /require --verify-traces|Invalid --coord-id/);
      }
    } finally {
      fs.rmSync(worktree, { recursive: true, force: true });
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  // Execute the documented quickstart receipts and caller-relative child-workspace inputs.
  {
    const { scanShellCommand } = await import("../mcp/shell.mjs");
    const parent = fs.realpathSync.native(fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), "agy-quickstart-")));
    const child = path.join(parent, "Child");
    try {
      fs.mkdirSync(path.join(child, "src"), { recursive: true });
      fs.writeFileSync(path.join(child, "src/auth.js"), "export const auth = true;\n");
      const docs = fs.readFileSync(new URL("../docs/getting-started.md", import.meta.url), "utf8");
      const quickstart = docs.slice(docs.indexOf("### Generate a `/swarm` plan"));
      const planCommand = quickstart.match(/agy-squad plan[^]*?(?=\n\n# 2\.)/)[0].replaceAll("\\\n", " ");
      const words = scanShellCommand(planCommand)[0].words.slice(1);
      const planned = spawnSync(process.execPath, [agySquadCli, ...words], { cwd: child, encoding: "utf8" });
      assert.equal(planned.status, 0, planned.stderr);
      const plan = JSON.parse(fs.readFileSync(path.join(child, "scratch/plan.json"), "utf8"));
      const handoffs = JSON.parse(quickstart.match(/```json\n([^]*?)\n```/)[1]);
      assert.deepEqual(handoffs.map(h => h.sender), plan.workers[0].specialists.map(s => s.workerName));
      const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(child, rel)), { recursive: true }); fs.writeFileSync(path.join(child, rel), text); };
      for (const s of plan.workers[0].specialists) write(s.reportSlot, "Checked src/auth.js:1.\n");
      write(plan.workers[0].synthesisSlot, "Content Verdict: PASS\n");
      write("scratch/handoffs.json", JSON.stringify(handoffs));
      write("scratch/provenance.json", JSON.stringify({ entries: [] }));
      const initialized = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--plan", "scratch/plan.json", "--handoffs", "scratch/handoffs.json", "--coord-id", "C", "--digest", "--out", "scratch/record.json", "src/auth.js"], { cwd: child, encoding: "utf8" });
      assert.equal(initialized.status, 0, initialized.stderr);
      const inferred = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--plan", "Child/scratch/plan.json", "--handoffs", "Child/scratch/handoffs.json", "--provenance", "Child/scratch/provenance.json", "--digest", "--out", "Child/scratch/parent-record.json", "Child/src/auth.js"], { cwd: parent, encoding: "utf8" });
      assert.equal(inferred.status, 0, inferred.stderr);
      assert.equal(fs.existsSync(path.join(child, "scratch/parent-record.json")), true);
      assert.equal(fs.existsSync(path.join(child, "Child")), false);
      const inferredBatch = spawnSync(process.execPath, [agySquadCli, "bundle-init", "--plan", "Child/scratch/plan.json", "--handoffs", "Child/scratch/handoffs.json", "--all-squads", "--digest", "--out-dir", "Child/scratch/records", "Child/src/auth.js"], { cwd: parent, encoding: "utf8" });
      assert.equal(inferredBatch.status, 0, inferredBatch.stderr);
      const received = spawnSync(process.execPath, [agySquadCli, "collect", "--record", "Child/scratch/parent-record.json", "--handoffs", "Child/scratch/handoffs.json", "--from", child, "--dry-run"], { cwd: parent, encoding: "utf8" });
      assert.notEqual(received.status, 0);
      assert.match(received.stderr, /coordinator workspace itself/);
    } finally { fs.rmSync(parent, { recursive: true, force: true }); }
  }

  console.log("✓ Receipt reconciliation, changed evidence, custom scratch roots, retryable cleanup, SQ-SVC-001, and SQ-RUN/SQ-ARCH-001 regressions");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
