import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubagentSpec } from "../mcp/briefs.mjs";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { bundleReports, computeEvidenceDigest, fingerprint, pruneReports, reportPath, verifyBundle } from "../mcp/handoffs.mjs";
import { hasContentVerdictAttempt, parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad, stripCode, validateSquadId } from "../mcp/verdicts.mjs";

const cliPath = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-pivot-")));
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
  assert.match(payload.Subagents[0].Prompt, /~\/\.gemini\/antigravity\*\/brain\/<id>\/\.system_generated\/logs\/transcript\.jsonl/);
  assert.match(payload.Subagents[0].Prompt, /agy-context transcript/);
  assert.doesNotMatch(payload.Subagents[0].Prompt, /rtk grep|rtk find|rtk read|<=150-line|\[agy-transcript-access:/);

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
  assert.match(singlePayload.Subagents[0].Prompt, /Integrity Auditor:/);
  assert.match(singlePayload.Subagents[0].Prompt, /Integrity Verdict: CLEAN \| INTEGRITY VIOLATION/);
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
  assert.doesNotMatch(swarmAuditSpec.Prompt, /query_transcript|read_transcript|rtk grep|rtk find|rtk read|<=150-line|\[agy-transcript-access:/);
  assert.match(swarmAuditSpec.Prompt, /~\/\.gemini\/antigravity\*\/brain\/<id>\/\.system_generated\/logs\/transcript\.jsonl/);
  assert.match(swarmAuditSpec.Prompt, /sender=<coordId> \+ @<workerName>/);
  assert.match(swarmAuditSpec.Prompt, /no raw \.system_generated\/ copies/);
  assert.match(swarmAuditSpec.Prompt, /re-execution cannot satisfy CLEAN.*'Integrity Verdict: INTEGRITY VIOLATION' if traces missing\/tampered/);

  // S1-F3: Integrity Auditor lead prompt must never instruct emitting PASS
  const intLeadCompiled = buildSubagentSpec(
    { role: "Integrity Auditor Lead", objective: "Audit alpha", scopeFiles: ["."] },
    "integrity_auditor-alpha",
    "single-squad.json"
  );
  assert.doesNotMatch(intLeadCompiled.Prompt, /Base PASS on verified proof|PASS on proof/);
  assert.match(intLeadCompiled.Prompt, /Integrity Auditor Lead/);
  assert.match(intLeadCompiled.Prompt, /Integrity Verdict: CLEAN \| INTEGRITY VIOLATION/);

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
    "digest", "bundle", "verify", "finalize", "prune", "verdict",
    "setup", "install", "status", "uninstall", "restore-backups"
  ]) {
    const helpRes = runCliFail([sub, "--help"]);
    assert.equal(helpRes.status, 0, `Expected --help exit 0 for ${sub}`);
    const expectedCmd = sub === "install" ? "setup" : sub;
    assert.match(helpRes.stdout, new RegExp(`Usage: agy-squad ${expectedCmd}\\b`));
    assert.match(helpRes.stdout, /Examples:/);
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

  // v0.1.3 Remediation Regressions: RUN-002, RUN-003, RUN-004, S2-SCRIPT-04, S2-TEST-02
  // RUN-002: Balanced emphasis stripping in parseTargetSquad + reconciled trailing-dot rejection in SQUAD_ID_RE
  for (const id of ["_auth", "auth_", "v1.0", "__auth_", "_auth__", "___"]) {
    assert.equal(validateSquadId(id), id);
    assert.equal(parseTargetSquad(`Target Squad: ${id}\nIntegrity Verdict: CLEAN\n`), id, `RUN-002: round-trip failed for '${id}'`);
  }
  assert.equal(parseTargetSquad("**Target Squad:** _auth\n"), "_auth");
  assert.equal(parseTargetSquad("Target Squad: **auth_**\n"), "auth_");
  assert.equal(parseTargetSquad("Target Squad: *_auth*\n"), "_auth");
  assert.equal(parseTargetSquad("Target Squad: _alpha_.\n"), "alpha");
  assert.equal(parseTargetSquad("Target Squad: v1.0.\n"), "v1.0");
  assert.throws(() => validateSquadId("v1."), /Invalid squad ID/);
  assert.throws(() => validateSquadId("_v1_."), /Invalid squad ID/);
  assert.throws(() => parseTargetSquad("Target Squad: alpha..\n"), /Malformed Target Squad/);
  assert.throws(() => parseTargetSquad("Target Squad: *alpha\n"), /Malformed Target Squad/);
  assert.throws(() => parseTargetSquad("Target Squad: __proto__\n"), /Invalid reserved squad ID/);
  assert.throws(() => parseTargetSquad("Target Squad: **__proto__**\n"), /Invalid reserved squad ID/);

  // RUN-003: parseIntegrityVerdict and readIntegrityAudit reject role-conflated content verdicts and secondary INTEGRITY VIOLATION lines
  write(first, "Evidence: node --test passed (exit 0).\n");
  for (const badAuditMd of [
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\nContent Verdict: PASS\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\nVerdict: INTEGRITY VIOLATION\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\nAudit Status: INTEGRITY VIOLATION\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\nAudit is NOT CLEAN.\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\nNot CLEAN due to hash mismatch.\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\n## INTEGRITY VIOLATION\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\n| Field | Value |\n| --- | --- |\n| Audit Status | INTEGRITY VIOLATION |\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\n| Field | Value |\n| --- | --- |\n| Content Verdict | PASS |\n`,
    `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\n| Squad | Content Verdict | Notes |\n| --- | --- | --- |\n| alpha | PASS | ok |\n`
  ]) {
    assert.throws(() => parseIntegrityVerdict(badAuditMd), /conflicting verdicts|role conflation|content verdict/i);
    write(scopedIntAlpha, badAuditMd);
    assert.throws(() => bundleReports(root, { ...record, replaceExisting: true }), /Integrity audit verdict is not CLEAN/);
  }
  assert.equal(
    parseIntegrityVerdict(
      `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: CLEAN\n| Field | Prior Baseline |\n| --- | --- |\n| Audit Status | INTEGRITY VIOLATION |\n`
    ),
    "CLEAN",
    "RUN-003: historical 2-column baseline column must not falsely contradict CLEAN"
  );
  write(scopedIntAlpha, cleanAlphaAudit);

  // RUN-004: parseContentVerdict avoids false positives on negative-test prose & historical leading bullets, and scans 2-column key-value verdict tables
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\nInvalid inputs do not pass.\nNegative tests for malformed records do not pass.\n"),
    "PASS",
    "RUN-004: normal negative-test prose with 'do not pass.' must not falsely contradict PASS"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **FAIL:** Prior Wave 1 run failed on missing fixture.\n"),
    "PASS",
    "RUN-004: historical leading FAIL bullet must not contradict Content Verdict: PASS"
  );
  assert.throws(
    () => parseContentVerdict("Content Verdict: PASS\n| Field | Value |\n| --- | --- |\n| Content Verdict | FAIL |\n"),
    /conflicting content verdicts/,
    "RUN-004: 2-column key-value verdict table contradicting PASS must throw"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n| Field | Value |\n| --- | --- |\n| Prior Verdict | FAIL |\n"),
    "PASS",
    "RUN-004: historical 2-column key-value row must not contradict PASS"
  );
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n| Field | Prior Baseline |\n| --- | --- |\n| Content Verdict | FAIL |\n"),
    "PASS",
    "RUN-004: historical 2-column baseline column must not contradict PASS"
  );
  for (const contradictingPassDoc of [
    "Content Verdict: PASS\nInvalid inputs do not pass; verification does not PASS.\n",
    "Content Verdict: PASS\nFixed invalid input handling; unit tests did not pass.\n",
    "Content Verdict: PASS\nVerification checks for auth do not pass.\n",
    "Content Verdict: PASS\nTests in `tests/test-run.mjs` did not pass.\n",
    "Content Verdict: PASS\nUnit tests don't pass.\n",
    "Content Verdict: PASS\nThe unit tests did not pass on Linux.\n"
  ]) {
    assert.throws(
      () => parseContentVerdict(contradictingPassDoc),
      /conflicting content verdicts/,
      `RUN-004: real failure negation must contradict PASS: ${JSON.stringify(contradictingPassDoc)}`
    );
  }

  // S2-SCRIPT-04 & S2-TEST-02: CLI bundle --allow-unaudited reconciles record.integrityReport and record.integrityAuditSlots cleanly
  const missingAuditRecPath = "unaudited-with-missing-report.json";
  write(missingAuditRecPath, JSON.stringify({ ...record, integrityReport: "scratch/agy-squad/missing-audit.md" }));
  const missingAuditCli = runCliFail(["bundle", missingAuditRecPath, "--allow-unaudited", "--replace"]);
  assert.equal(missingAuditCli.status, 0, `S2-SCRIPT-04: --allow-unaudited must override missing integrityReport: ${missingAuditCli.stderr}`);
  const missingAuditRes = JSON.parse(missingAuditCli.stdout);
  assert.equal(missingAuditRes.auditPolicy, "unaudited-explicit");
  const missingAuditBundleJson = JSON.parse(fs.readFileSync(path.join(root, missingAuditRes.path), "utf8"));
  assert.equal(missingAuditBundleJson.integrityAudit, undefined);
  assert.equal(missingAuditBundleJson.integrityAudits, undefined);

  const violatingAuditSlot = reportPath("integrity_auditor-alpha", 2);
  write(violatingAuditSlot, `Target Squad: alpha\nEvidence Digest: ${alphaDigest}\nIntegrity Verdict: INTEGRITY VIOLATION\n`);
  const badAuditRecPath = "unaudited-with-bad-report.json";
  write(badAuditRecPath, JSON.stringify({ ...record, integrityReport: violatingAuditSlot }));
  const badAuditOverrideCli = runCliFail(["bundle", badAuditRecPath, "--allow-unaudited", "--replace"]);
  assert.equal(badAuditOverrideCli.status, 0, `S2-SCRIPT-04: --allow-unaudited must override bad integrityReport: ${badAuditOverrideCli.stderr}`);
  assert.equal(JSON.parse(badAuditOverrideCli.stdout).auditPolicy, "unaudited-explicit");

  const cleanAuditRecPath = "unaudited-with-clean-report.json";
  write(cleanAuditRecPath, JSON.stringify({ ...record, integrityReport: scopedIntAlpha, integrityAuditSlots: [scopedIntAlpha] }));
  const cleanAuditOverrideCli = runCliFail(["bundle", cleanAuditRecPath, "--allow-unaudited", "--replace"]);
  assert.equal(cleanAuditOverrideCli.status, 0, `S2-SCRIPT-04: --allow-unaudited with clean integrityReport/slots failed: ${cleanAuditOverrideCli.stderr}`);
  const cleanOverrideRes = JSON.parse(cleanAuditOverrideCli.stdout);
  assert.equal(cleanOverrideRes.auditPolicy, "unaudited-explicit");
  const cleanOverrideBundleJson = JSON.parse(fs.readFileSync(path.join(root, cleanOverrideRes.path), "utf8"));
  assert.equal(cleanOverrideBundleJson.integrityAudit, undefined, "S2-SCRIPT-04: unaudited-explicit bundle must not embed contradictory integrityAudit");
  assert.equal(cleanOverrideBundleJson.integrityAudits, undefined, "S2-SCRIPT-04: unaudited-explicit bundle must not embed contradictory integrityAudits");
  assert.equal(verifyBundle(root, cleanOverrideRes.path).auditPolicy, "unaudited-explicit");

  // ASQ-RUN-002: Category Verdict columns and summary matrix tables do not false-conflict with top-level verdicts
  assert.equal(
    parseContentVerdict(
      "Content Verdict: FAIL\n| Category | Category Verdict |\n| --- | --- |\n| ARCH | PASS |\n| SEC | FAIL |\n"
    ),
    "FAIL",
    "ASQ-RUN-002: Category Verdict table column with PASS must not false-conflict with Content Verdict: FAIL"
  );
  assert.equal(
    parseContentVerdict(
      "Content Verdict: PASS\n| Check | PASS | FAIL |\n| --- | --- | --- |\n| Unit | 10 | 0 |\n"
    ),
    "PASS",
    "ASQ-RUN-002: summary table header '| Check | PASS | FAIL |' must not false-conflict with Content Verdict: PASS"
  );
  assert.equal(
    parseContentVerdict(
      "Content Verdict: FAIL\n| Check | PASS | FAIL |\n| --- | --- | --- |\n| Unit | 9 | 1 |\n"
    ),
    "FAIL",
    "ASQ-RUN-002: summary table header '| Check | PASS | FAIL |' must not false-conflict with Content Verdict: FAIL"
  );
  assert.equal(
    parseIntegrityVerdict(
      "Target Squad: alpha\nIntegrity Verdict: CLEAN\n| Metric | CLEAN | INTEGRITY VIOLATION |\n| --- | --- | --- |\n| Traces | 3 | 0 |\n"
    ),
    "CLEAN",
    "ASQ-RUN-002: summary table header '| Metric | CLEAN | INTEGRITY VIOLATION |' must not false-conflict with Integrity Verdict: CLEAN"
  );
  assert.equal(
    parseIntegrityVerdict(
      "Target Squad: alpha\nIntegrity Verdict: INTEGRITY VIOLATION\n| Metric | CLEAN | INTEGRITY VIOLATION |\n| --- | --- | --- |\n| Traces | 2 | 1 |\n"
    ),
    "INTEGRITY VIOLATION",
    "ASQ-RUN-002: summary table header '| Metric | CLEAN | INTEGRITY VIOLATION |' must not false-conflict with Integrity Verdict: INTEGRITY VIOLATION"
  );

  // ASQ-SEC-006: stripCode stays linear-time on 40k consecutive backticks (< 250 ms)
  const evilTicks = "`".repeat(40_000) + "x";
  const evilInlineTicks = "a " + evilTicks;
  const tStrip = performance.now();
  const strippedFenceTicks = stripCode(evilTicks);
  const strippedInlineTicks = stripCode(evilInlineTicks);
  const stripMs = performance.now() - tStrip;
  assert.equal(strippedFenceTicks, "");
  assert.equal(strippedInlineTicks, evilInlineTicks);
  assert.ok(stripMs < 250, `ASQ-SEC-006: stripCode on 40k backticks took ${stripMs.toFixed(1)} ms (>= 250 ms)`);
  assert.doesNotMatch(stripCode("ok `Content Verdict: FAIL` ok"), /FAIL/);

  // Post-swarm live fix: inline-backtick Evidence Digest/Target Squad + parenthetical provenance + verdict --integrity CLI parity
  const digestA = "c".repeat(64);
  const digestB = "d".repeat(64);
  assert.equal(parseTargetSquad("Target Squad: `core`.\n"), "core");
  assert.equal(parseEvidenceDigest(`Evidence Digest: \`${digestA}\`\n`), digestA);
  assert.equal(
    parseEvidenceDigest(
      `Evidence Digest: ${digestA}\n- **Evidence Digest**: \`${digestA}\` (matches coordinator brief seq \`#48\` and \`record-core.json\`).\n`
    ),
    digestA,
    "parseEvidenceDigest must accept matching inline-code digest with parenthetical provenance note"
  );
  assert.equal(
    parseEvidenceDigest(`\`\`\`md\nEvidence Digest: not-a-hash\n\`\`\`\nEvidence Digest: \`${digestA}\`\n`),
    digestA,
    "parseEvidenceDigest must continue ignoring fenced code blocks"
  );
  assert.throws(
    () => parseEvidenceDigest(`Evidence Digest: ${digestA}\n- **Evidence Digest**: \`${digestB}\` (conflict).\n`),
    /conflicting Evidence Digest/
  );
  assert.throws(
    () => parseEvidenceDigest(`Evidence Digest: \`${digestA}\n`),
    /Malformed Evidence Digest/
  );
  const validIntRel = "scratch/agy-squad/squad-integrity_auditor/specialist-1/cli-verdict-ok.md";
  write(
    validIntRel,
    `Target Squad: \`core\`\nEvidence Digest: ${digestA}\nIntegrity Verdict: CLEAN\n- **Evidence Digest**: \`${digestA}\` (matches brief seq \`#48\`).\n`
  );
  const cliVerdictOk = JSON.parse(runCli(["verdict", "--integrity", validIntRel]));
  assert.deepEqual(cliVerdictOk, { verdict: "CLEAN", targetSquad: "core", evidenceDigest: digestA });
  const badDigestRel = "scratch/agy-squad/squad-integrity_auditor/specialist-1/cli-verdict-bad-digest.md";
  write(badDigestRel, "Target Squad: core\nEvidence Digest: not-a-sha256\nIntegrity Verdict: CLEAN\n");
  const cliVerdictBad = runCliFail(["verdict", "--integrity", badDigestRel]);
  assert.notEqual(cliVerdictBad.status, 0, "verdict --integrity must fail closed on malformed Evidence Digest");
  assert.match(cliVerdictBad.stderr, /Malformed Evidence Digest/);

  // Batch A regressions: SEC-001, RUN-001, RUN-002, SEC-002
  // SEC-001: inline backticks on verdict lines fail closed as malformed/hedged while stripCode still strips inline code
  for (const hedgedContent of [
    "Content Verdict: PASS `(FAIL: 3 P1 blockers open)`\n",
    "Content Verdict: `FAIL` PASS\n"
  ]) {
    assert.throws(
      () => parseContentVerdict(hedgedContent),
      /Malformed or hedged verdict line/,
      `SEC-001: backtick-smuggled content verdict must fail closed: ${JSON.stringify(hedgedContent)}`
    );
  }
  for (const hedgedIntegrity of [
    "Integrity Verdict: `NOT` CLEAN\n",
    "Integrity Verdict: CLEAN `(INTEGRITY VIOLATION: traces missing)`\n"
  ]) {
    assert.throws(
      () => parseIntegrityVerdict(hedgedIntegrity),
      /Malformed or hedged verdict line/,
      `SEC-001: backtick-smuggled integrity verdict must fail closed: ${JSON.stringify(hedgedIntegrity)}`
    );
  }
  assert.doesNotMatch(stripCode("ok `Content Verdict: FAIL` ok"), /FAIL/);

  // RUN-001: PR #N / Wave N lines are no longer treated as historical bypasses; true historical lines remain allowed
  for (const badContent of [
    "Content Verdict: PASS\nFinal PR #15 status: FAIL\n",
    "Content Verdict: PASS\nTests for PR #15 did not PASS\n",
    "Content Verdict: PASS\nFAIL — Wave 2 still has P1 blockers\n"
  ]) {
    assert.throws(
      () => parseContentVerdict(badContent),
      /conflicting content verdicts/,
      `RUN-001: conflicting PR/Wave verdict line must throw: ${JSON.stringify(badContent)}`
    );
  }
  assert.throws(
    () => parseIntegrityVerdict("Integrity Verdict: CLEAN\nPR #15 status: PASS\n"),
    /role conflation/,
    "RUN-001: PR #15 status: PASS in integrity report must throw role conflation"
  );
  assert.throws(
    () => parseIntegrityVerdict("Integrity Verdict: CLEAN\nPR #15 audit is not CLEAN\n"),
    /conflicting verdicts/,
    "RUN-001: PR #15 audit is not CLEAN must throw conflicting verdicts"
  );
  assert.equal(parseContentVerdict("Content Verdict: PASS\nPrior baseline check did not pass.\n"), "PASS");
  assert.equal(parseContentVerdict("Content Verdict: PASS\nPrior status: FAIL\n"), "PASS");

  // RUN-002: 4-space and tab-indented Target Squad / Evidence Digest code blocks are ignored while value-only backticks still parse
  assert.equal(parseTargetSquad("    Target Squad: alpha\n\tTarget Squad: beta\n"), undefined);
  assert.equal(parseTargetSquad("Target Squad: `alpha`\n    Target Squad: beta\n\tTarget Squad: gamma\n"), "alpha");
  assert.equal(parseEvidenceDigest(`    Evidence Digest: ${digestA}\n\tEvidence Digest: ${digestB}\n`), undefined);
  assert.equal(
    parseEvidenceDigest(`Evidence Digest: \`${digestA}\`\n    Evidence Digest: ${digestB}\n\tEvidence Digest: not-a-hash\n`),
    digestA
  );

  // SEC-002: parseTargetSquad unwrapBalancedEmphasis stays linear-time on N=30,000 runs and preserves reserved-key checks
  const tEmph = performance.now();
  assert.equal(parseTargetSquad(`Target Squad: ${"*".repeat(30_000)}alpha${"*".repeat(30_000)}\n`), "alpha");
  assert.equal(parseTargetSquad(`Target Squad: ${"*_".repeat(15_000)}alpha${"_*".repeat(15_000)}\n`), "alpha");
  assert.throws(
    () => parseTargetSquad(`Target Squad: ${"_".repeat(30_000)}__proto__${"_".repeat(30_000)}\n`),
    /Invalid reserved squad ID/
  );
  assert.throws(
    () => parseTargetSquad(`Target Squad: ${"_*".repeat(15_000)}__proto__${"*_".repeat(15_000)}\n`),
    /Invalid reserved squad ID/
  );
  const emphMs = performance.now() - tEmph;
  assert.ok(emphMs < 250, `SEC-002: parseTargetSquad on N=30,000 balanced emphasis took ${emphMs.toFixed(1)} ms (>= 250 ms)`);

  // Session 3 regressions: RUN-009, SEC-011, RUN-010
  // RUN-009: Section 4 category Verdict lines quoting backticked PASS/FAIL/BLOCKED parse cleanly and agree with hasContentVerdictAttempt
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n- **Verdict:** Changes required (must emit `PASS` or `FAIL`)\n"),
    "PASS",
    "RUN-009: category Verdict line quoting backticked verdict tokens must not throw"
  );
  assert.equal(
    hasContentVerdictAttempt("# Draft\n- **Verdict:** Changes required (must emit `PASS` or `FAIL`)\n"),
    false,
    "RUN-009: category Verdict line quoting backticked verdict tokens must not trip hasContentVerdictAttempt"
  );
  assert.throws(
    () => parseContentVerdict("Content Verdict: PASS\n- **Verdict:** Changes required (FAIL)\n"),
    /Malformed or hedged verdict line/,
    "RUN-009: unbackticked FAIL on category Verdict line must still throw"
  );
  assert.equal(
    hasContentVerdictAttempt("Content Verdict: `PASS`\n"),
    true,
    "RUN-009: malformed backticked strict verdict line must still trip hasContentVerdictAttempt"
  );

  // SEC-011: backticked table/labeled/negated verdict contradictions & role conflation, label-prefix historical scoping, and narrowed 'before'
  for (const sec11BadContent of [
    "Content Verdict: PASS\n| Squad | `Verdict` |\n| --- | --- |\n| Alpha | `FAIL` |\n",
    "Content Verdict: PASS\n| Field | Value |\n| --- | --- |\n| `Content Verdict` | `FAIL` |\n",
    "Content Verdict: PASS\nSecondary check: `FAIL`\n",
    "Content Verdict: PASS\nUnit tests did not `PASS`.\n",
    "Content Verdict: PASS\nSecondary check: FAIL (fix blockers before release)\n",
    "Content Verdict: PASS\nStatus: FAIL (matches old baseline bug)\n",
    "Content Verdict: PASS\nUnit tests did not pass before timeout.\n",
    "Content Verdict: PASS\nUnit tests did not pass; fix blockers before release.\n",
    "Content Verdict: PASS\nFixed prior bug; unit tests did not pass.\n",
    "Content Verdict: PASS\n- **FAIL:** Failed before timeout.\n"
  ]) {
    assert.throws(
      () => parseContentVerdict(sec11BadContent),
      /conflicting content verdicts/,
      `SEC-011: conflicting content verdict must throw: ${JSON.stringify(sec11BadContent)}`
    );
  }
  for (const sec11BadIntegrity of [
    "Integrity Verdict: CLEAN\n| Field | Value |\n| --- | --- |\n| Audit Status | `INTEGRITY VIOLATION` |\n",
    "Integrity Verdict: CLEAN\nAudit Status: `INTEGRITY VIOLATION`\n",
    "Integrity Verdict: CLEAN\nAudit is not `CLEAN`.\n",
    "Integrity Verdict: CLEAN\nAudit Status: INTEGRITY VIOLATION (fix before release)\n",
    "Integrity Verdict: CLEAN\nAudit is not CLEAN — fix missing trace before merge.\n"
  ]) {
    assert.throws(
      () => parseIntegrityVerdict(sec11BadIntegrity),
      /conflicting verdicts/,
      `SEC-011: conflicting integrity verdict must throw: ${JSON.stringify(sec11BadIntegrity)}`
    );
  }
  for (const sec11RoleConflation of [
    "Integrity Verdict: CLEAN\n| Field | Value |\n| --- | --- |\n| `Content Verdict` | `PASS` |\n",
    "Integrity Verdict: CLEAN\nPR #15 status: `PASS`\n",
    "Integrity Verdict: CLEAN\nStatus: PASS (fix blockers before release)\n"
  ]) {
    assert.throws(
      () => parseIntegrityVerdict(sec11RoleConflation),
      /role conflation/,
      `SEC-011: integrity role conflation must throw: ${JSON.stringify(sec11RoleConflation)}`
    );
  }
  assert.equal(
    parseContentVerdict(
      "Content Verdict: PASS\nPrior status: FAIL\nBefore the fix, unit tests did not pass.\nQuoted `Content Verdict: FAIL` in prose.\n| Field | Before | Current |\n| --- | --- | --- |\n| Verdict | FAIL | PASS |\n"
    ),
    "PASS",
    "SEC-011: true historical context and prose code quotes must still pass"
  );
  assert.equal(
    parseIntegrityVerdict("Integrity Verdict: CLEAN\nLead report recorded `PASS` in prose.\n"),
    "CLEAN",
    "SEC-011: integrity prose mentioning backticked PASS must not false-trigger role conflation"
  );

  // RUN-010: odd balanced underscore emphasis wrapping reserved keys still throws Invalid reserved squad ID
  for (const oddProto of ["___proto___", "_____proto_____"]) {
    assert.throws(
      () => parseTargetSquad(`Target Squad: ${oddProto}\n`),
      /Invalid reserved squad ID/,
      `RUN-010: ${oddProto} must throw Invalid reserved squad ID`
    );
  }
  assert.equal(parseTargetSquad("Target Squad: ___alpha___\n"), "alpha");

  // Day-1 r1 regressions: R1-SEC-001 (tab-indented fence spoofing) & R1-SEC-002 (linear-time clause negation scan)
  for (const tabFence of ["\t```", "\t~~~"]) {
    // Forward suppression: tab-indented fence outside a fence must be stripped as indented code, not open a fake fence
    assert.throws(
      () => parseContentVerdict(`Content Verdict: PASS\n\n${tabFence}\nContent Verdict: FAIL\n`),
      /conflicting content verdicts/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} must not swallow subsequent Content Verdict: FAIL`
    );
    assert.throws(
      () => parseIntegrityVerdict(`Integrity Verdict: CLEAN\n\n${tabFence}\nIntegrity Verdict: INTEGRITY VIOLATION\n`),
      /conflicting verdicts/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} must not swallow subsequent Integrity Verdict: INTEGRITY VIOLATION`
    );
    assert.throws(
      () => parseIntegrityVerdict(`Integrity Verdict: CLEAN\n\n${tabFence}\nContent Verdict: PASS\n`),
      /role conflation/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} must not swallow subsequent role-conflated Content Verdict: PASS`
    );
    assert.throws(
      () => parseTargetSquad(`Target Squad: alpha\n\n${tabFence}\nTarget Squad: beta\n`),
      /conflicting Target Squad/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} must not swallow subsequent Target Squad`
    );
    assert.throws(
      () => parseEvidenceDigest(`Evidence Digest: ${digestA}\n\n${tabFence}\nEvidence Digest: ${digestB}\n`),
      /conflicting Evidence Digest/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} must not swallow subsequent Evidence Digest`
    );

    // Reverse injection: tab-indented fence inside an open fence must not prematurely close the fence
    const openFence = tabFence.includes("`") ? "```md" : "~~~md";
    const closeFence = tabFence.includes("`") ? "```" : "~~~";
    assert.throws(
      () => parseContentVerdict(`${openFence}\n${tabFence}\nContent Verdict: PASS\n${closeFence}\n`),
      /unambiguous single-line 'Content Verdict:/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} inside an open fence must not allow Content Verdict: PASS injection`
    );
    assert.throws(
      () => parseIntegrityVerdict(`${openFence}\n${tabFence}\nIntegrity Verdict: CLEAN\n${closeFence}\n`),
      /unambiguous single-line 'Integrity Verdict:/,
      `R1-SEC-001: ${JSON.stringify(tabFence)} inside an open fence must not allow Integrity Verdict: CLEAN injection`
    );
  }
  // Valid CommonMark 0-3 ASCII spaces still open/close fences cleanly
  assert.equal(parseContentVerdict("   ```md\n   Content Verdict: FAIL\n   ```\nContent Verdict: PASS\n"), "PASS");

  // R1-SEC-002: negation scans stay linear-time (< 500 ms) with or without clause separators
  const tNeg = performance.now();
  assert.equal(parseContentVerdict("Content Verdict: PASS\n" + "prior not pass; ".repeat(6000) + "\n"), "PASS");
  assert.equal(parseContentVerdict("Content Verdict: PASS\n" + "the endpoint does not pass foo; ".repeat(6000) + "\n"), "PASS");
  assert.equal(parseContentVerdict("Content Verdict: PASS\n" + "the endpoint does not pass foo ".repeat(6000) + "\n"), "PASS");
  assert.equal(parseIntegrityVerdict("Integrity Verdict: CLEAN\n" + "prior not CLEAN; ".repeat(6000) + "\n"), "CLEAN");
  assert.equal(parseIntegrityVerdict("Integrity Verdict: CLEAN\n" + "prior not CLEAN ".repeat(6000) + "\n"), "CLEAN");
  const negMs = performance.now() - tNeg;
  assert.ok(negMs < 500, `R1-SEC-002: negation scans took ${negMs.toFixed(1)} ms (>= 500 ms)`);
  // Parity check: same-clause historical exemption still holds across multiple negations
  assert.equal(parseContentVerdict("Content Verdict: PASS\nPrior check did not pass and still does not pass.\n"), "PASS");
  assert.throws(
    () => parseContentVerdict("Content Verdict: PASS\nPrior check did not pass; current check did not pass.\n"),
    /conflicting content verdicts/
  );

  // Day-1 r2 regressions: R2-SEC-001 (CommonMark 1-3 spaces + tab indented code) & R2-SEC-002 (ASCII-only closing fence trailing whitespace)
  for (const spaceTab of [" \t", "  \t", "   \t"]) {
    assert.throws(
      () => parseContentVerdict(`${spaceTab}Content Verdict: PASS\n`),
      /unambiguous single-line 'Content Verdict:/,
      `R2-SEC-001: ${JSON.stringify(spaceTab)} indented code must not inject Content Verdict: PASS`
    );
    assert.throws(
      () => parseIntegrityVerdict(`${spaceTab}Integrity Verdict: CLEAN\n`),
      /unambiguous single-line 'Integrity Verdict:/,
      `R2-SEC-001: ${JSON.stringify(spaceTab)} indented code must not inject Integrity Verdict: CLEAN`
    );
    assert.equal(parseTargetSquad(`${spaceTab}Target Squad: alpha\n`), undefined);
    assert.equal(parseEvidenceDigest(`${spaceTab}Evidence Digest: ${digestA}\n`), undefined);
    assert.equal(parseContentVerdict(`Content Verdict: PASS\n${spaceTab}Content Verdict: FAIL\n`), "PASS");
  }
  // 3 ASCII spaces without tab remain a normal CommonMark paragraph
  assert.equal(parseContentVerdict("   Content Verdict: PASS\n"), "PASS");

  for (const nonAsciiWs of ["\u00A0", "\uFEFF", "\f", "\v", "\u3000"]) {
    for (const [openF, closeF] of [["```md", "```"], ["~~~md", "~~~"]]) {
      assert.throws(
        () => parseContentVerdict(`${openF}\n${closeF}${nonAsciiWs}\nContent Verdict: PASS\n${closeF}\n`),
        /unambiguous single-line 'Content Verdict:/,
        `R2-SEC-002: trailing ${JSON.stringify(nonAsciiWs)} on ${closeF} must not close fence to inject PASS`
      );
      assert.throws(
        () => parseIntegrityVerdict(`${openF}\n${closeF}${nonAsciiWs}\nIntegrity Verdict: CLEAN\n${closeF}\n`),
        /unambiguous single-line 'Integrity Verdict:/,
        `R2-SEC-002: trailing ${JSON.stringify(nonAsciiWs)} on ${closeF} must not close fence to inject CLEAN`
      );
      assert.equal(parseTargetSquad(`${openF}\n${closeF}${nonAsciiWs}\nTarget Squad: alpha\n${closeF}\n`), undefined);
      assert.equal(parseEvidenceDigest(`${openF}\n${closeF}${nonAsciiWs}\nEvidence Digest: ${digestA}\n${closeF}\n`), undefined);
    }
  }
  // Trailing ASCII space and tab still close CommonMark fences cleanly
  assert.equal(parseContentVerdict("```md\nContent Verdict: FAIL\n``` \t \nContent Verdict: PASS\n"), "PASS");

  // PR15-SEC-002 / B-SEC-001: mid-token '.', ':', ';', '!', '?' (filenames, file:line, semver, URL query strings) must not bypass PASS contradiction detection
  for (const bypassReport of [
    "Content Verdict: PASS\nThe test suite for src/auth.js did not pass.\n",
    "Content Verdict: PASS\nVerification of mcp/index.js:120 did not pass.\n",
    "Content Verdict: PASS\nCheck of package.json did not pass.\n",
    "Content Verdict: PASS\nCI gate for v0.2.1 did not pass.\n",
    "Content Verdict: PASS\nThe test suite for https://example.com/run?id=1 did not pass.\n",
    "Content Verdict: PASS\nVerification of [PR #15](https://github.com/org/repo/pull/15?w=1) did not pass.\n",
    "Content Verdict: PASS\nThe check for sidecar://swarm/swarm_board/?auto_open=false did not pass.\n",
    "Content Verdict: PASS\nTest suite: did not pass.\n",
    "Content Verdict: PASS\n1. did not pass.\n",
    "Content Verdict: PASS\nCurrent check: did not pass.\n",
    "Content Verdict: PASS\nBefore the fix: tests did not PASS; after the fix: build did not PASS.\n",
    "Content Verdict: PASS\nBefore the fix: tests did not pass. Current tests did not pass.\n",
    "Content Verdict: PASS\nPrior run: tests did not pass, but current tests did not pass.\n",
    "Content Verdict: PASS\nBefore the fix: tests did not pass: after the fix: build did not pass.\n",
    "Content Verdict: PASS\nNegative test: tests did not pass: after the fix: build did not pass.\n",
    "Content Verdict: PASS\nAfter the fix: build did not PASS.\n"
  ]) {
    assert.throws(
      () => parseContentVerdict(bypassReport),
      /conflicting content verdicts/,
      `PR15-SEC-002 / PR15-RUN-001: expected contradiction throw for ${JSON.stringify(bypassReport)}`
    );
  }

  // PR15-RUN-001 / B-RUN-002: introducer colons and mid-token punctuation preserve historical and negative-expectation context
  for (const validPassReport of [
    "Content Verdict: PASS\nBefore the fix: tests did not PASS.\n",
    "Content Verdict: PASS\n**Before the fix:** tests did not PASS.\n",
    "Content Verdict: PASS\nPrior run: tests did not PASS.\n",
    "Content Verdict: PASS\nPrior run: did not pass.\n",
    "Content Verdict: PASS\nBefore the fix in src/auth.js, tests did not PASS.\n",
    "Content Verdict: PASS\nBefore the fix: check on https://example.com/run?id=1 did not PASS.\n",
    "Content Verdict: PASS\nNegative test: suite did not pass.\n",
    "Content Verdict: PASS\nNegative test: did not pass.\n",
    "Content Verdict: PASS\nFinal negative test: suite did not pass.\n",
    "Content Verdict: PASS\nPost-fix negative test: suite did not pass.\n",
    "Content Verdict: PASS\nCurrent invalid-input check: did not pass.\n",
    "Content Verdict: PASS\n1. Prior run: did not pass.\n"
  ]) {
    assert.equal(
      parseContentVerdict(validPassReport),
      "PASS",
      `PR15-RUN-001: expected PASS for ${JSON.stringify(validPassReport)}`
    );
  }
  assert.equal(
    parseIntegrityVerdict("Integrity Verdict: CLEAN\nBefore the fix: the run was not CLEAN.\n"),
    "CLEAN",
    "PR15-RUN-001: historical colon before not CLEAN must preserve CLEAN"
  );
  assert.equal(
    parseIntegrityVerdict("Integrity Verdict: CLEAN\nPrior run in mcp/index.js:120 was not CLEAN.\n"),
    "CLEAN",
    "PR15-RUN-001: mid-token file:line in historical integrity note must preserve CLEAN"
  );
  assert.throws(
    () => parseIntegrityVerdict("Integrity Verdict: CLEAN\nBefore the fix: run was not CLEAN; after the fix: run was not CLEAN.\n"),
    /conflicting verdicts/,
    "PR15-RUN-001: post-fix integrity contradiction after semicolon must throw"
  );

  console.log("✓ Strict verdicts, programmatic integrity hash binding, flat integrity_auditor, and governance CLI");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outsideFile, { force: true });
}
