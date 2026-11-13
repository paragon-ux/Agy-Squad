import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { bundleReports, fingerprint, pruneReports, reportPath, verifyBundle } from "../mcp/handoffs.mjs";
import { parseContentVerdict, parseIntegrityVerdict, parseTargetSquad } from "../mcp/verdicts.mjs";

const cliPath = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-pivot-")));

function write(relative, contents) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, "utf8");
}

try {
  // 1. Strict verdict parsing
  assert.equal(parseContentVerdict("Content Verdict: PASS\nAll checks verified."), "PASS");
  assert.equal(parseContentVerdict("- **Verdict:** **PASS**\nDetails."), "PASS");
  assert.equal(parseContentVerdict("Verdict: FAIL\nCheck failed."), "FAIL");
  assert.equal(parseContentVerdict("Verdict: BLOCKED\nMissing fixture."), "BLOCKED");
  assert.equal(
    parseContentVerdict("Content Verdict: PASS\n```\nVerdict: FAIL\n```\nIgnored `FAIL` span."),
    "PASS"
  );

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
  assert.throws(() => parseIntegrityVerdict("Verdict: PASS\nRole conflation."));
  assert.throws(() => parseIntegrityVerdict("Integrity Verdict: CLEAN with advisories"));

  // 2. Programmatic integrity hash binding & deletion protection
  write("src/app.js", "export const ok = true;\n");
  const first = reportPath("alpha", 1);
  const lead = reportPath("alpha");
  const intSlot = reportPath("integrity_auditor", 1);
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

  write(intSlot, "Target Squad: alpha\nVerdict: PASS\n");
  assert.throws(() => bundleReports(root, record), /Integrity audit verdict is not CLEAN/);

  write(intSlot, "Target Squad: beta\nIntegrity Verdict: CLEAN\n");
  assert.throws(() => bundleReports(root, record), /does not match 'alpha'/);

  write(intSlot, "Target Squad: alpha\nIntegrity Verdict: INTEGRITY VIOLATION\n");
  assert.throws(() => bundleReports(root, record), /INTEGRITY VIOLATION/);

  write(intSlot, "Target Squad: alpha\nIntegrity Verdict: CLEAN\nAll traces grounded.\n");
  const bundled = bundleReports(root, record);
  const bundleJson = JSON.parse(fs.readFileSync(path.join(root, bundled.path), "utf8"));
  assert.equal(bundleJson.integrityAudit.path, intSlot);
  assert.equal(bundleJson.integrityAudit.verdict, "CLEAN");
  assert.equal(bundleJson.integrityAudit.targetSquad, "alpha");
  assert.match(bundleJson.integrityAudit.sha256, /^[0-9a-f]{64}$/);
  assert.equal(verifyBundle(root, bundled.path).sha256, bundled.sha256);

  // Deleting integrity report from disk must fail verifyBundle (no silent deletion pass)
  fs.unlinkSync(path.join(root, intSlot));
  assert.throws(() => verifyBundle(root, bundled.path), /ENOENT/);

  // Restore and test retainReports / --keep-reports
  write(intSlot, "Target Squad: alpha\nIntegrity Verdict: CLEAN\nAll traces grounded.\n");
  const kept = pruneReports(root, bundled.path, bundled.sha256, { keepReports: true });
  assert.deepEqual(kept.removed, []);
  assert.deepEqual(kept.retained, [first]);

  // 3. Flat integrity_auditor dispatch
  write("squads.json", JSON.stringify({
    squads: {
      alpha: {
        lead: { role: "Alpha Lead", objective: "Lead alpha", scopeFiles: ["src"] },
        specialists: [{ role: "Worker", objective: "Build app", scopeFiles: ["src/app.js"] }]
      }
    }
  }));
  const dispatchRes = handleDispatchSquad({ squadId: "integrity_auditor:alpha", manifestPath: "squads.json" }, root);
  assert.equal(dispatchRes.isError, undefined);
  const payload = JSON.parse(dispatchRes.content[0].text);
  assert.equal(payload.Subagents.length, 1);
  assert.equal(payload.Subagents[0].Role, "Integrity Auditor");
  assert.match(payload.Subagents[0].Prompt, /Integrity Verdict: CLEAN/);
  assert.match(payload.Subagents[0].Prompt, /Target Squad: alpha/);
  assert.match(payload.Subagents[0].Prompt, /summaryOnly=true/);

  // 4. Governance CLI subcommands
  const runCli = args => execFileSync(process.execPath, [cliPath, ...args], { cwd: root, encoding: "utf8" });
  assert.equal(JSON.parse(runCli(["verdict", lead])).verdict, "PASS");
  assert.equal(JSON.parse(runCli(["verdict", "--integrity", intSlot])).verdict, "CLEAN");

  write("bundle-record.json", JSON.stringify(record));
  const cliBundled = JSON.parse(runCli(["bundle", "bundle-record.json"]));
  const cliVerified = JSON.parse(runCli(["verify", cliBundled.path]));
  assert.equal(cliVerified.sha256, cliBundled.sha256);
  const cliPruned = JSON.parse(runCli(["prune", cliBundled.path, cliBundled.sha256, "--keep-reports"]));
  assert.deepEqual(cliPruned.removed, []);

  console.log("✓ Strict verdicts, programmatic integrity hash binding, flat integrity_auditor, and governance CLI");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
