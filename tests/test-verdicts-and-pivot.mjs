import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubagentSpec } from "../mcp/briefs.mjs";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { bundleReports, fingerprint, pruneReports, reportPath, verifyBundle } from "../mcp/handoffs.mjs";
import { parseContentVerdict, parseIntegrityVerdict, parseTargetSquad } from "../mcp/verdicts.mjs";

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
    "Verdict: PASS\ndid not PASS smoke test"
  ]) {
    assert.throws(() => parseContentVerdict(hedged));
  }

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
  write(scopedIntAlpha, "Target Squad: alpha\nIntegrity Verdict: CLEAN\nAll traces grounded.\n");
  write(scopedIntBeta, "Target Squad: beta\nIntegrity Verdict: CLEAN\nBeta grounded.\n");

  const bundled = bundleReports(root, record);
  const bundleJson = JSON.parse(fs.readFileSync(path.join(root, bundled.path), "utf8"));
  assert.equal(bundleJson.integrityAudit.path, scopedIntAlpha);
  assert.equal(bundleJson.integrityAudit.verdict, "CLEAN");
  assert.equal(bundleJson.integrityAudit.targetSquad, "alpha");
  assert.match(bundleJson.integrityAudit.sha256, /^[0-9a-f]{64}$/);
  assert.equal(verifyBundle(root, bundled.path).sha256, bundled.sha256);

  // SVC-PR4-02: tampered bundle JSON pointing integrityAudit to beta is rejected
  const tamperedBundle = {
    ...bundleJson,
    integrityAudit: {
      path: scopedIntBeta,
      sha256: JSON.parse(JSON.stringify(bundleJson)).integrityAudit.sha256,
      verdict: "CLEAN",
      targetSquad: "beta"
    }
  };
  write("scratch/agy-squad/squad-alpha/lead/tampered.json", JSON.stringify(tamperedBundle));
  const savedBundle = fs.readFileSync(path.join(root, bundled.path), "utf8");
  fs.writeFileSync(path.join(root, bundled.path), JSON.stringify(tamperedBundle));
  assert.throws(() => verifyBundle(root, bundled.path), /does not match bundle squad 'alpha'/);
  fs.writeFileSync(path.join(root, bundled.path), savedBundle);

  // F-01 & SVC-PR4-03/04: explicit adversarialReport does not overwrite existing integrityAudit, and fenced code is ignored
  const advSlot = reportPath("adversarial_review", 1);
  write(advSlot, "Verdict: FAIL\n```\nIntegrity Verdict: CLEAN\n```\n");
  assert.throws(
    () => bundleReports(root, { ...record, requireAdversarialReview: true, adversarialReport: advSlot }),
    /Mandatory adversarial review verdict is not PASS/
  );
  write(advSlot, "Content Verdict: PASS\nIndependent adversarial verification passed.\n");
  const bothBundle = bundleReports(root, { ...record, requireAdversarialReview: true, adversarialReport: advSlot });
  const bothJson = JSON.parse(fs.readFileSync(path.join(root, bothBundle.path), "utf8"));
  assert.equal(bothJson.integrityAudit.path, scopedIntAlpha);
  assert.equal(bothJson.adversarialReview.path, advSlot);
  write(advSlot, "Integrity Verdict: CLEAN\nAttempted role conflation.\n");
  assert.throws(
    () => bundleReports(root, { ...record, requireAdversarialReview: true, adversarialReport: advSlot }),
    /Mandatory adversarial review verdict is not PASS/
  );
  fs.unlinkSync(path.join(root, advSlot));
  bundleReports(root, record);

  // Deleting integrity report from disk must fail verifyBundle (no silent deletion pass)
  fs.unlinkSync(path.join(root, scopedIntAlpha));
  assert.throws(() => verifyBundle(root, bundled.path), /ENOENT/);

  // Restore and test retainReports / --keep-reports
  write(scopedIntAlpha, "Target Squad: alpha\nIntegrity Verdict: CLEAN\nAll traces grounded.\n");
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
  assert.match(payload.Subagents[0].Prompt, /summaryOnly=true/);

  // Untargeted on multi-squad manifest throws; empty target and adversarial_review target return isError
  assert.equal(handleDispatchSquad({ squadId: "integrity_auditor", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(handleDispatchSquad({ squadId: "integrity_auditor:", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(handleDispatchSquad({ squadId: "adversarial_flat:", manifestPath: "squads.json" }, root).isError, true);
  assert.equal(
    handleDispatchSquad({ squadId: "integrity_auditor:adversarial_review", manifestPath: "squads.json" }, root).isError,
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
  const customLeadRes = handleDispatchSquad({ squadId: "integrity_auditor", manifestPath: "single-squad.json" }, root);
  assert.equal(customLeadRes.isError, undefined);

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
  assert.equal(runCliFail(["bundle", "unaudited-record.json", "--allow-unaudited"]).status, 0);
  assert.equal(runCliFail(["bundle", "strict-record.json", "--allow-unaudited"]).status, 0);

  // Restore audit and run full CLI cycle including inspect & destructive prune
  write(scopedIntAlpha, "Target Squad: alpha\nIntegrity Verdict: CLEAN\nAll traces grounded.\n");
  write("bundle-record.json", JSON.stringify(record));
  assert.equal(JSON.parse(runCli(["inspect", "bundle-record.json"]))[0].status, "READY");
  const cliBundled = JSON.parse(runCli(["bundle", "bundle-record.json"]));
  const cliVerified = JSON.parse(runCli(["verify", cliBundled.path]));
  assert.equal(cliVerified.sha256, cliBundled.sha256);
  const cliKept = JSON.parse(runCli(["prune", cliBundled.path, cliBundled.sha256, "--keep-reports"]));
  assert.deepEqual(cliKept.removed, []);
  const cliPruned = JSON.parse(runCli(["prune", cliBundled.path, cliBundled.sha256]));
  assert.deepEqual(cliPruned.removed, [first]);
  assert.equal(fs.existsSync(path.join(root, first)), false);

  // SCRIPT-PR4-01 & SCRIPT-PR4-02: path traversal, absolute paths, symlinks, malformed verdicts, --help
  const symlinkReport = "scratch/agy-squad/symlink-report.md";
  fs.symlinkSync(outsideFile, path.join(root, symlinkReport));
  for (const badArgs of [
    ["verdict", `../${path.basename(outsideFile)}`],
    ["verdict", outsideFile],
    ["verdict", symlinkReport],
    ["bundle", outsideFile],
    ["verdict", lead, "--integrity"]
  ]) {
    assert.notEqual(runCliFail(badArgs).status, 0, `Expected failure for: ${badArgs.join(" ")}`);
  }

  for (const sub of ["plan", "fingerprint", "inspect", "bundle", "verify", "prune", "verdict"]) {
    const helpRes = runCliFail([sub, "--help"]);
    assert.equal(helpRes.status, 0, `Expected --help exit 0 for ${sub}`);
    assert.match(helpRes.stdout, /Agy-Squad Governance & Verification CLI/);
  }

  console.log("✓ Strict verdicts, programmatic integrity hash binding, flat integrity_auditor, and governance CLI");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outsideFile, { force: true });
}
