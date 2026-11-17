import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubagentSpec } from "../mcp/briefs.mjs";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { bundleReports, computeEvidenceDigest, fingerprint, pruneReports, reportPath, verifyBundle } from "../mcp/handoffs.mjs";
import { hasContentVerdictAttempt, parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad } from "../mcp/verdicts.mjs";

const cliPath = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-pivot-")));
const outsideFile = path.join(os.tmpdir(), `agy-outside-${process.pid}.md`);
fs.writeFileSync(outsideFile, "Content Verdict: PASS\n", "utf8");

function write(relative, contents) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
}

function runCli(args) {
  return execFileSync(process.execPath, [cliPath, ...args], { cwd: root, encoding: "utf8" });
}

function runCliFail(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd: root, encoding: "utf8" });
}

try {
  // 1. Strict verdict parsing (RUN-PR4-01..04, SVC-PR4-01)
  assert.equal(parseContentVerdict("Content Verdict: PASS\nAll checks verified."), "PASS");
  assert.equal(parseContentVerdict("- **Verdict:** **PASS**\nDetails."), "PASS");
  assert.equal(parseContentVerdict("Content Verdict: PASS.\nTrailing period."), "PASS");
  assert.equal(parseContentVerdict("## Content Verdict: PASS\nHeading declaration."), "PASS");
  assert.equal(parseContentVerdict("Verdict: FAIL\nCheck failed."), "FAIL");
  assert.equal(parseContentVerdict("Verdict: BLOCKED\nMissing fixture."), "BLOCKED");
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n```\nVerdict: FAIL\n```\nIgnored `FAIL` span."),
    "PASS"
  );
  // RUN-PR4-01: unanchored prose mentions of FAIL / BLOCKED must not trigger false conflict or fabricate BLOCKED
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\nVerified that bad input causes FAIL in helper."),
    "PASS"
  );
  assert.throws(() => parseContentVerdict("Nothing was BLOCKED during run."));
  // RUN-PR4-02 & RUN-PR4-06: sentence-initial & lowercase negation at clause end caught; verb phrase allowed
  assert.throws(() => parseContentVerdict("Content Verdict: PASS\nThe check did not pass."));
  assert.throws(() => parseContentVerdict("Content Verdict: PASS\nNot PASS on smoke."));
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\nThe endpoint does not pass invalid events."),
    "PASS"
  );
  // RUN-PR4-03: inline ` ``` ` does not swallow subsequent lines
  assert.throws(() => parseContentVerdict("Content Verdict: PASS\nMentioned inline ` ``` ` token.\nVerdict: FAIL"));

  for (const hedged of [
    "Verdict: PASS with Preserved Advisories",
    "Verdict: CONDITIONAL PASS",
    "Content Verdict: PASS (caveats apply)",
    "Verdict: PASS\nSecondary check: FAIL",
    "Verdict: PASS\ndid not PASS smoke test",
    "Content Verdict: FAIL\nFinal Status: PASS",
    "Content Verdict: BLOCKED\n| Gate | PASS |",
    "Content Verdict: FAIL\nPASS: all checks succeeded"
  ]) {
    assert.throws(() => parseContentVerdict(hedged));
  }
  assert.equal(
    parseContentVerdict("Content Verdict: FAIL\n| Check | Prior Wave | Current |\n| --- | --- | --- |\n| Auth | PASS | FAIL |\n"),
    "FAIL",
    "Historical comparison column PASS must not trigger false conflict against Content Verdict: FAIL (SQ-RUN-002)"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **Verdict:** Changes required (`SQ-001`)\n7. **Verdict:** No findings within reviewed scope\n"),
    "PASS",
    "PR Review Standard Section 4 category Verdict lines must not collide with strict Content Verdict parsing"
  );
  assert.throws(() => parseContentVerdict("- **Verdict:** Changes required\n"));

  assert.equal(parseIntegrityVerdict("Target Squad: alpha\nIntegrity Verdict: CLEAN\n"), "CLEAN");
  assert.equal(
    parseIntegrityVerdict("**Integrity Verdict:** **INTEGRITY VIOLATION**\nUngrounded claim."),
    "INTEGRITY VIOLATION"
  );
  assert.equal(parseTargetSquad("Target Squad: alpha\nIntegrity Verdict: CLEAN"), "alpha");
  assert.equal(parseTargetSquad("- **Target Squad:** **beta**"), "beta");
  assert.throws(() => parseTargetSquad("Target Squad: beta, gamma"));
  assert.throws(() => parseTargetSquad("Target Squad: alpha\nTarget Squad: beta"));
  assert.throws(() => parseIntegrityVerdict("Verdict: PASS\nRole conflation."));
  assert.throws(() => parseIntegrityVerdict("Integrity Verdict: CLEAN with advisories"));

  // 2. Programmatic integrity hash binding, target scoping & deletion protection (ARCH-PR4-01, SVC-PR4-01..06)
  write("src/app.js", "export const ok = true;\n");
  write("src/beta.js", "export const beta = true;\n");
  const first = reportPath("alpha", 1);
  const lead = reportPath("alpha");
  const scopedIntAlpha = reportPath("integrity_auditor-alpha", 1);
  const scopedIntBeta = reportPath("integrity_auditor-beta", 1);
  write(first, "Evidence: node --test passed (exit 0).\n");
  write(lead, "Content Verdict: PASS\nVerified src/app.js.\n");

  const record = {
    squadId: "alpha",
    workspace: root,
    verdict: "PASS",
    verifiedFiles: fingerprint(root, ["src/app.js"]),
    assignments: [{ conversationId: "worker-1", report: first }],
    handoffs: [{ sender: "worker-1", message: `READY ${first} — tests pass` }],
    requireIntegrityAudit: true
  };

  assert.throws(() => bundleReports(root, record), /Mandatory integrity audit report missing/);

  // SVC-PR4-01: formatted Target Squad and missing Target Squad fail closed
  write(scopedIntAlpha, "Integrity Verdict: CLEAN\nMissing target squad.\n");
  assert.throws(() => bundleReports(root, record), /must record 'Target Squad: alpha'/);

  write(scopedIntAlpha, "**Target Squad:** **beta**\nIntegrity Verdict: CLEAN\n");
  assert.throws(() => bundleReports(root, record), /does not match 'alpha'/);

  write(scopedIntAlpha, "Target Squad: alpha\nVerdict: PASS\n");
  assert.throws(() => bundleReports(root, record), /Integrity audit verdict is not CLEAN/);

  write(scopedIntAlpha, "Target Squad: alpha\nIntegrity Verdict: INTEGRITY VIOLATION\n");
  assert.throws(() => bundleReports(root, record), /INTEGRITY VIOLATION/);

  // SVC-PR4-06: non-boolean retainReports rejected
  assert.throws(() => bundleReports(root, { ...record, retainReports: "false" }), /retainReports must be a boolean/);

  // Valid scoped alpha & beta audits co-exist without collision (ARCH-PR4-01)
  const { evidenceDigest: alphaDigest } = computeEvidenceDigest(root, record);
  const cleanAlphaAudit = `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\nAll traces grounded.\n`;
  write(scopedIntAlpha, cleanAlphaAudit);
  write(scopedIntBeta, "Target Squad: beta\nIntegrity Verdict: CLEAN\nBeta grounded.\n");

  const bundled = bundleReports(root, record);
  const bundleJson = JSON.parse(fs.readFileSync(path.join(root, bundled.path), "utf8"));
  assert.equal(bundleJson.integrityAudit.path, scopedIntAlpha);
  assert.equal(bundleJson.integrityAudit.verdict, "CLEAN");
  assert.equal(bundleJson.integrityAudit.targetSquad, "alpha");
  assert.match(bundleJson.integrityAudit.sha256, /^[0-9a-f]{64}$/);
  assert.equal(verifyBundle(root, bundled.path).sha256, bundled.sha256);

  // SVC-PR4-02: tampered bundle JSON pointing integrityAudit to beta is rejected
  const tamperedEntry = {
    path: scopedIntBeta,
    sha256: JSON.parse(JSON.stringify(bundleJson)).integrityAudit.sha256,
    verdict: "CLEAN",
    targetSquad: "beta"
  };
  const tamperedBundle = {
    ...bundleJson,
    integrityAudit: tamperedEntry,
    integrityAudits: [tamperedEntry]
  };
  write("scratch/agy-squad/squad-alpha/lead/tampered.json", JSON.stringify(tamperedBundle));
  const savedBundle = fs.readFileSync(path.join(root, bundled.path), "utf8");
  fs.writeFileSync(path.join(root, bundled.path), JSON.stringify(tamperedBundle));
  assert.throws(() => verifyBundle(root, bundled.path), /does not match bundle squad 'alpha'/);
  fs.writeFileSync(path.join(root, bundled.path), savedBundle);

  // Stale squad-adversarial_review directory on disk is never auto-discovered by bundleReports
  const advSlot = reportPath("adversarial_review", 1);
  write(advSlot, "Verdict: FAIL\n```\nIntegrity Verdict: CLEAN\n```\n");
  const withoutAdvAuto = bundleReports(root, record);
  const withoutAdvJson = JSON.parse(fs.readFileSync(path.join(root, withoutAdvAuto.path), "utf8"));
  assert.equal(withoutAdvJson.integrityAudit.path, scopedIntAlpha);
  assert.equal(withoutAdvJson.adversarialReview, undefined);
  fs.unlinkSync(path.join(root, advSlot));
  bundleReports(root, record);

  // Deleting integrity report from disk must fail verifyBundle (no silent deletion pass)
  fs.unlinkSync(path.join(root, scopedIntAlpha));
  assert.throws(() => verifyBundle(root, bundled.path), /ENOENT/);

  // Restore and test retainReports / --keep-reports
  write(scopedIntAlpha, cleanAlphaAudit);
  const kept = pruneReports(root, bundled.path, bundled.sha256, { keepReports: true });
  assert.deepEqual(kept.removed, []);
  assert.deepEqual(kept.retained, [first]);

  // 3. Multi-squad & negative integrity_auditor dispatch (ARCH-PR4-01..02, MCP-PR4-01..02, RUN-PR4-05)
  write("squads.json", JSON.stringify({
    squads: {
      alpha: {
        lead: { role: "Alpha Lead", objective: "Lead alpha", scopeFiles: ["src"] },
        specialists: [{ role: "Worker", objective: "Build app", scopeFiles: ["src/app.js"] }]
      },
      beta: {
        lead: { role: "Beta Lead", objective: "Lead beta", scopeFiles: ["src"] },
        specialists: [{ role: "Worker B", objective: "Build beta", scopeFiles: ["src/beta.js"] }]
      }
    }
  }));
  const dispatchRes = handleDispatchSquad({ squadId: "integrity_auditor:alpha", manifestPath: "squads.json" }, root);
  assert.equal(dispatchRes.isError, undefined);
  const payload = JSON.parse(dispatchRes.content[0].text);
  assert.equal(payload.Subagents.length, 1);
  assert.equal(payload.Subagents[0].Role, "Integrity Auditor");
  assert.match(payload.Subagents[0].Prompt, /squad-integrity_auditor-alpha\/specialist-1\/report\.md/);
  assert.match(payload.Subagents[0].Prompt, /Integrity Verdict: CLEAN/);
  assert.match(payload.Subagents[0].Prompt, /Target Squad: alpha/);
  assert.match(payload.Subagents[0].Prompt, /agy-context transcript query --id <id> --summary/);

  // Untargeted on multi-squad manifest throws; empty target and retired adversarial targets return isError
  assert.equal(handleDispatchSquad({ squadId: "integrity_auditor", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(handleDispatchSquad({ squadId: "integrity_auditor:", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(handleDispatchSquad({ squadId: "adversarial_l1", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(handleDispatchSquad({ squadId: "adversarial_flat", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(
    handleDispatchSquad({ squadId: "integrity_auditor:nonexistent", manifestPath: "squads.json" }, root).isError,
    true
  );

  // Single-squad untargeted works and emits Target Squad: alpha; custom integrity_auditor lead enforces CLEAN/VIOLATION (RUN-PR4-05)
  write("single-squad.json", JSON.stringify({
    squads: {
      alpha: {
        lead: { role: "Alpha Lead", objective: "Lead alpha", scopeFiles: ["src"] },
        specialists: [{ role: "Worker", objective: "Build app", scopeFiles: ["src/app.js"] }]
      },
      integrity_auditor: {
        lead: { role: "Integrity Lead", objective: "Lead audit", scopeFiles: ["."] },
        specialists: [{ role: "Integrity Specialist", objective: "Audit alpha", scopeFiles: ["."] }]
      }
    }
  }));
  const untargetedSingle = handleDispatchSquad({ squadId: "integrity_auditor", manifestPath: "single-squad.json" }, root);
  assert.equal(untargetedSingle.isError, undefined);
  const singlePayload = JSON.parse(untargetedSingle.content[0].text);
  assert.equal(singlePayload.Subagents.length, 1);
  assert.ok(Array.isArray(singlePayload.warnings) && singlePayload.warnings.some(w => /ignored/.test(w)), "Custom integrity_auditor.lead must emit explicit warning (SQ-RUN-007)");
  assert.match(singlePayload.Subagents[0].Prompt, /Target Squad: alpha/);
  assert.match(singlePayload.Subagents[0].Prompt, /Integrity Auditor Policy/);
  assert.match(singlePayload.Subagents[0].Prompt, /Integrity Verdict: CLEAN.*Integrity Verdict: INTEGRITY VIOLATION/);
  assert.doesNotMatch(singlePayload.Subagents[0].Prompt, /query_transcript|read_transcript/, "SQ-MCP-002: briefs must not reference retired MCP transcript tools");

  // GOV-07: Swarm integrity auditor briefs must not treat workspace re-execution alone as sufficient for CLEAN
  const swarmAuditSpec = buildSubagentSpec(
    { role: "Integrity Auditor", objective: "Audit swarm alpha", scopeFiles: ["."] },
    "integrity_auditor-alpha",
    "multi-squad.json",
    1,
    undefined,
    { executionMode: "swarm" }
  );
  assert.doesNotMatch(swarmAuditSpec.Prompt, /or direct workspace artifact\/command re-execution/);
  assert.doesNotMatch(swarmAuditSpec.Prompt, /query_transcript|read_transcript/);
  assert.match(swarmAuditSpec.Prompt, /coordinator-extracted sanitized transcript index in scratch\//);
  assert.match(swarmAuditSpec.Prompt, /report 'Integrity Verdict: INTEGRITY VIOLATION' \(never CLEAN\)/);

  // S1-F3: Integrity Auditor lead prompt must never instruct emitting PASS
  const intLeadCompiled = buildSubagentSpec(
    { role: "Integrity Auditor Lead", objective: "Audit alpha", scopeFiles: ["."] },
    "integrity_auditor-alpha",
    "single-squad.json"
  );
  assert.doesNotMatch(intLeadCompiled.Prompt, /Base PASS on verified proof/);
  assert.match(intLeadCompiled.Prompt, /never emit a content PASS/i);

  // 4. Governance CLI positive & negative security tests (SCRIPT-PR4-01..03, SCRIPT-P3-04, ARCH-PR4-03, TEST-PR4-01)
  assert.equal(JSON.parse(runCli(["verdict", lead])).verdict, "PASS");
  assert.equal(JSON.parse(runCli(["verdict", "--integrity", scopedIntAlpha])).verdict, "CLEAN");
  assert.deepEqual(Object.keys(JSON.parse(runCli(["fingerprint", "src/app.js"]))), ["src/app.js"]);

  const unauditedRecord = { ...record };
  delete unauditedRecord.requireIntegrityAudit;
  write("unaudited-record.json", JSON.stringify(unauditedRecord));
  write("strict-record.json", JSON.stringify(record));
  fs.unlinkSync(path.join(root, scopedIntAlpha));
  // ARCH-PR4-03: CLI bundle enforces requireIntegrityAudit: true by default
  assert.notEqual(runCliFail(["bundle", "unaudited-record.json"]).status, 0);
  // --allow-unaudited allows explicit opt-out even when record sets requireIntegrityAudit: true (SCRIPT-P3-04)
  assert.equal(runCliFail(["bundle", "unaudited-record.json", "--allow-unaudited", "--replace"]).status, 0);
  assert.equal(runCliFail(["bundle", "strict-record.json", "--allow-unaudited", "--replace"]).status, 0);

  // Restore audit and run full CLI cycle including inspect & destructive prune
  write(scopedIntAlpha, cleanAlphaAudit);
  write("bundle-record.json", JSON.stringify(record));
  assert.equal(JSON.parse(runCli(["inspect", "bundle-record.json"]))[0].status, "READY");
  const cliBundled = JSON.parse(runCli(["bundle", "bundle-record.json", "--replace"]));
  const cliVerified = JSON.parse(runCli(["verify", cliBundled.path]));
  assert.equal(cliVerified.sha256, cliBundled.sha256);
  const cliKept = JSON.parse(runCli(["prune", cliBundled.path, cliBundled.sha256, "--keep-reports"]));
  assert.deepEqual(cliKept.removed, []);
  const cliPruned = JSON.parse(runCli(["prune", cliBundled.path, cliBundled.sha256]));
  assert.deepEqual(cliPruned.removed, [first]);
  assert.equal(fs.existsSync(path.join(root, first)), false);

  // SCRIPT-PR4-01 & SCRIPT-PR4-02: path traversal, absolute paths, symlinks, malformed verdicts, --help
  const malformedVerdict = "scratch/agy-squad/malformed-content.md";
  const malformedIntegrity = "scratch/agy-squad/malformed-integrity.md";
  write(malformedVerdict, "Looks fine without verdict token.\n");
  write(malformedIntegrity, "Integrity Verdict: CLEAN\nIntegrity Verdict: INTEGRITY VIOLATION\n");
  const symlinkReport = "scratch/agy-squad/symlink-report.md";
  let symlinkReportCreated = false;
  try {
    fs.symlinkSync(outsideFile, path.join(root, symlinkReport), "file");
    symlinkReportCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  for (const [badArgs, expectedStderr] of [
    [["verdict", `../${path.basename(outsideFile)}`], /workspace-relative/],
    [["verdict", outsideFile], /workspace-relative/],
    ...(symlinkReportCreated ? [[["verdict", symlinkReport], /Unsupported|symlink|ELOOP/i]] : []),
    [["bundle", outsideFile], /workspace-relative/],
    [["verdict", lead, "--integrity"], /Integrity Verdict:/],
    [["verdict", malformedVerdict], /Content Verdict:/],
    [["verdict", "--integrity", malformedIntegrity], /conflicting verdicts/],
    [["bogus", "--help"], /Unknown command/],
    [["bundle", "bundle-record.json", "--unknown"], /Unknown option/],
    [["verify", cliBundled.path, "--unknown"], /Unknown option/]
  ]) {
    const res = runCliFail(badArgs);
    assert.notEqual(res.status, 0, `Expected failure for: ${badArgs.join(" ")}`);
    assert.match(res.stderr, expectedStderr, `Expected ${expectedStderr} in stderr for ${badArgs.join(" ")}`);
  }

  // SD-GOV-SCRIPT-01: Non-boolean requireIntegrityAudit must not coerce to true
  write("bad-audit-type.json", JSON.stringify({ ...record, requireIntegrityAudit: "false" }));
  const badAuditCli = runCliFail(["bundle", "bad-audit-type.json"]);
  assert.notEqual(badAuditCli.status, 0);
  assert.match(badAuditCli.stderr, /requireIntegrityAudit must be a boolean/);

  for (const sub of [
    "plan", "dispatch", "collect", "bundle-init", "fingerprint", "inspect",
    "digest", "bundle", "verify", "prune", "verdict",
    "setup", "status", "uninstall", "restore-backups"
  ]) {
    const helpRes = runCliFail([sub, "--help"]);
    assert.equal(helpRes.status, 0, `Expected --help exit 0 for ${sub}`);
    assert.match(helpRes.stdout, /Agy-Squad Governance & Verification CLI/);
  }
  // SQ-DEP-007: --help and --version combined with operational flags/args must fail closed
  for (const badHelp of [
    ["--help", "--bogus"],
    ["--version", "--bogus"],
    ["setup", "--check", "--help"],
    ["plan", "--help", "--manifest", "m.json"]
  ]) {
    const helpConflict = runCliFail(badHelp);
    assert.notEqual(helpConflict.status, 0, `Expected conflicting --help/--version failure for ${badHelp.join(" ")}`);
    assert.match(helpConflict.stderr, /Conflicting flags/);
  }

  // RUN-011 & RUN-012: ordered list verdict prefix supported and invalid UTF-8 rejected by verdict CLI
  assert.equal(parseContentVerdict("1. Content Verdict: PASS\n"), "PASS");
  assert.equal(parseIntegrityVerdict("2) Integrity Verdict: CLEAN\n"), "CLEAN");
  const badUtf8Report = "scratch/agy-squad/invalid-utf8.md";
  fs.mkdirSync(path.dirname(path.join(root, badUtf8Report)), { recursive: true });
  fs.writeFileSync(path.join(root, badUtf8Report), Buffer.from([0x61, 0xff, 0x62]));
  const badUtf8Res = runCliFail(["verdict", badUtf8Report]);
  assert.notEqual(badUtf8Res.status, 0);
  assert.match(badUtf8Res.stderr, /UTF-8/);

  // W1 Regressions (RUN-001..005, RUN-012, LEAD-RUN-002): prose negation, historical status, table result matrices, indented code, trailing dot
  assert.equal(
    parseContentVerdict("Content Verdict: BLOCKED\nPrerequisites did not pass.\n"),
    "BLOCKED",
    "RUN-001: 'did not pass.' must not inject synthetic FAIL into Content Verdict: BLOCKED"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\nPrior baseline check did not pass.\n"),
    "PASS",
    "RUN-001: historical 'did not pass.' must not contradict Content Verdict: PASS"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\nCheck result is fail/pass depending on mode.\nPrior status: FAIL\n"),
    "PASS",
    "RUN-005: slash compounds and historical status lines must not trigger false conflict"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: BLOCKED\n| Suite | Result | Status |\n| --- | --- | --- |\n| Unit | PASS | PASS |\n| Smoke | FAIL | FAIL |\n"),
    "BLOCKED",
    "RUN-004: Result/Status matrix tables must not override Content Verdict: BLOCKED"
  );
  assert.throws(
    () => parseContentVerdict("Content Verdict: FAIL\n| Squad | Verdict |\n| --- | --- |\n| Alpha | PASS |\n"),
    /conflicting content verdicts/,
    "RUN-004: Verdict table column MUST still catch conflicting verdicts"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n\n    Verdict: FAIL\n    Content Verdict: BLOCKED\n"),
    "PASS",
    "RUN-012: 4-space indented code blocks must be stripped by stripCode"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n\tVerdict: FAIL\n"),
    "PASS",
    "RUN-012: tab-indented code blocks must be stripped by stripCode"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **Verdict:** Changes required (all tests pass).\n"),
    "PASS",
    "LEAD-RUN-002: lowercase 'pass' inside category Verdict line must not break bypass"
  );
  assert.equal(
    parseTargetSquad("Target Squad: alpha.\nIntegrity Verdict: CLEAN\n"),
    "alpha",
    "RUN-002: trailing sentence period in Target Squad must be stripped cleanly"
  );
  // RUN-003: bundle-init pre-verdict draft containing category Verdict: Changes required must not throw
  const draftSlot = reportPath("draft_check", 1);
  const draftLeadSlot = reportPath("draft_check");
  write(draftSlot, "Evidence: ok.\n");
  write(draftLeadSlot, "# Draft Synthesis\n- **Verdict:** Changes required (`SQ-001`)\n");
  write("draft-plan.json", JSON.stringify({
    executionMode: "swarm",
    workers: [{ squadId: "draft_check", specialists: [{ reportSlot: draftSlot }] }],
    bundleRecordTemplates: {
      draft_check: {
        squadId: "draft_check",
        workspace: root,
        assignments: [{ conversationId: "w1", report: draftSlot }],
        requireIntegrityAudit: false
      }
    }
  }));
  const draftInitOut = JSON.parse(runCli(["bundle-init", "--plan", "draft-plan.json", "--allow-unaudited"]));
  assert.equal(draftInitOut.verdict, "PASS", "RUN-003: category Verdict line must not trigger hasContentVerdictAttempt error");

  // Wave 2 Regressions (W2-RUN-001): LABELED_VERDICT_RE requires uppercase PASS|FAIL|BLOCKED while keeping labels case-insensitive
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- Error check: fail closed on empty input.\n- Input status: blocked by gate.\n- Smoke result: pass on retry.\n"),
    "PASS",
    "W2-RUN-001: lowercase prose fail/blocked/pass after check:/status:/result: must not trigger conflicting verdict"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **Error check:** Fail closed.\n"),
    "PASS",
    "W2-RUN-001: mixed-case prose 'Fail' after label must not trigger conflicting verdict"
  );
  assert.equal(
    hasContentVerdictAttempt("# Draft\n- Error check: fail closed on empty input.\n- Input status: blocked by gate.\n"),
    false,
    "W2-RUN-001: lowercase prose in draft report must not trip hasContentVerdictAttempt"
  );
  assert.throws(
    () => parseContentVerdict("Content Verdict: PASS\n- Secondary check: FAIL\n"),
    /conflicting content verdicts/,
    "W2-RUN-001: uppercase secondary check: FAIL must still fail closed"
  );
  assert.throws(
    () => parseContentVerdict("Content Verdict: FAIL\nfinal status: PASS\n"),
    /conflicting content verdicts/,
    "W2-RUN-001: case-insensitive label with uppercase PASS must still fail closed"
  );
  write(draftLeadSlot, "# Draft Synthesis\n- Error check: fail closed on empty input.\n");
  const w2DraftInitOut = JSON.parse(runCli(["bundle-init", "--plan", "draft-plan.json", "--allow-unaudited"]));
  assert.equal(w2DraftInitOut.verdict, "PASS", "W2-RUN-001: bundle-init must not crash on draft containing lowercase 'check: fail ...'");

  // Wave 2 Regressions (W2-RUN-004): bolded label-with-inner-colon paired with emphasized verdict tokens
  for (const [boldLine, expectedAttempt] of [
    ["- **Status:** **FAIL**", true],
    ["- **Final Status:** **PASS**", true],
    ["**Final check:** **BLOCKED**", true],
    ["- ***Status:*** ***FAIL***", true],
    ["- __Status:__ __FAIL__", true],
    ["- _Status:_ _FAIL_", true],
    ["- *__Status:__* *__FAIL__*", true],
    ["- __FAIL__: reason", true]
  ]) {
    assert.equal(
      hasContentVerdictAttempt(`# Draft\n${boldLine}\n`),
      expectedAttempt,
      `W2-RUN-004: hasContentVerdictAttempt must detect '${boldLine}'`
    );
  }
  for (const [primary, conflictLine] of [
    ["PASS", "- **Status:** **FAIL**"],
    ["FAIL", "- **Final Status:** **PASS**"],
    ["PASS", "**Final check:** **BLOCKED**"],
    ["PASS", "- ***Status:*** ***FAIL***"],
    ["PASS", "- __Status:__ __FAIL__"],
    ["PASS", "- _Status:_ _FAIL_"],
    ["PASS", "- *__Status:__* *__FAIL__*"]
  ]) {
    assert.throws(
      () => parseContentVerdict(`Content Verdict: ${primary}\n${conflictLine}\n`),
      /conflicting content verdicts/,
      `W2-RUN-004: conflicting emphasized line '${conflictLine}' must throw against ${primary}`
    );
  }
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **Final Status:** **PASS**\n"),
    "PASS",
    "W2-RUN-004: matching emphasized secondary status must agree cleanly"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **Status:** **pass** all checks\n"),
    "PASS",
    "W2-RUN-004: lowercase emphasized '- **Status:** **pass** all checks' must not false-trigger"
  );
  assert.equal(
    hasContentVerdictAttempt("# Draft\n- **Status:** **pass** all checks\n"),
    false,
    "W2-RUN-004: lowercase emphasized '- **Status:** **pass** all checks' must not trip hasContentVerdictAttempt"
  );
  assert.equal(
    parseContentVerdict(
      "Content Verdict: PASS\n- **Status:** **FAIL-fast** mode\n- **Status:** FAIL_FAST\n- **Status:** __FAIL__-mode\n- **Status:** **FAIL**ed\n- **Prior Status:** **FAIL**\n"
    ),
    "PASS",
    "W2-RUN-004: hyphenated/snake_case/suffixed compounds and historical emphasized lines must not false-trigger"
  );

  // Additional W2-RUN-004 edge-case regressions: leading/label hyphenated compounds, 4+ char emphasis, split-word emphasis, outer periods
  for (const [doc, expected] of [
    ["Content Verdict: PASS\n- **FAIL-fast** mode enabled\n- __FAIL__-mode enabled\n- FAIL-safe behavior\n", "PASS"],
    ["Content Verdict: FAIL\n- PASS-through mode enabled\n", "FAIL"],
    ["Content Verdict: PASS\n- check-FAIL path tested\n- status-PASS flag ignored\n", "PASS"],
    ["- **Content Verdict:** **PASS**.\n", "PASS"],
    ["**__Content Verdict:__** **__PASS__**\n", "PASS"],
    ["**__Content Verdict:__** **__FAIL__**\n", "FAIL"],
    ["Content Verdict: PASS\n- **__Verdict:__** Changes required (`SQ-001`)\n", "PASS"]
  ]) {
    assert.equal(
      parseContentVerdict(doc),
      expected,
      `W2-RUN-004: parseContentVerdict must return ${expected} for ${JSON.stringify(doc)}`
    );
  }
  for (const draftLine of [
    "- **FAIL-fast** mode enabled",
    "- __FAIL__-mode enabled",
    "- FAIL-safe behavior",
    "- PASS-through mode enabled",
    "- check-FAIL path tested"
  ]) {
    assert.equal(
      hasContentVerdictAttempt(`# Draft\n${draftLine}\n`),
      false,
      `W2-RUN-004: hasContentVerdictAttempt must not false-trigger on '${draftLine}'`
    );
  }
  for (const attemptLine of [
    "- **Status:** **__FAIL__**",
    "- **__Status:__** **__FAIL__**",
    "- **Final** **Status:** **FAIL**",
    "- Final **Status:** **FAIL**",
    "- **Check** - **FAIL**",
    "- **__FAIL__**: reason",
    "- **__FAIL__:** reason",
    "- **FAIL** - reason",
    "**__Content Verdict:__** **__FAIL__**"
  ]) {
    assert.equal(
      hasContentVerdictAttempt(`# Draft\n${attemptLine}\n`),
      true,
      `W2-RUN-004: hasContentVerdictAttempt must detect '${attemptLine}'`
    );
  }
  for (const conflictLine of [
    "- **Status:** **__FAIL__**",
    "- **__Status:__** **__FAIL__**",
    "- **Final** **Status:** **FAIL**",
    "- Final **Status:** **FAIL**",
    "- **Check** - **FAIL**",
    "- **__FAIL__**: reason",
    "- **__FAIL__:** reason",
    "- **FAIL** - reason",
    "| Squad | Verdict |\n| --- | --- |\n| Alpha | **__FAIL__** |"
  ]) {
    assert.throws(
      () => parseContentVerdict(`Content Verdict: PASS\n${conflictLine}\n`),
      /conflicting content verdicts/,
      `W2-RUN-004: conflicting line '${conflictLine}' must throw against PASS`
    );
  }
  assert.equal(parseIntegrityVerdict("**Integrity Verdict:** **CLEAN**.\n"), "CLEAN");
  assert.equal(parseTargetSquad("**__Target Squad:__** **__alpha__**.\n"), "alpha");
  assert.equal(
    parseEvidenceDigest(`**__Evidence Digest:__** **__${"a".repeat(64)}__**.\n`),
    "a".repeat(64)
  );

  console.log("✓ Strict verdicts, programmatic integrity hash binding, flat integrity_auditor, and governance CLI");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outsideFile, { force: true });
}
