import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleReports, computeEvidenceDigest, fingerprint, inspectHandoffs, reportPath } from "../mcp/handoffs.mjs";

const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-cli-diag-")));
const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function copyIsolatedRepo(targetDir) {
  for (const rel of ["bin", "mcp", "scripts", ".agents", "docs", "tests", "package.json", "plugin.json", "README.md", "CHANGELOG.md", "install.sh", "install.ps1", "zensical.toml"]) {
    fs.cpSync(path.join(repoRoot, rel), path.join(targetDir, rel), { recursive: true });
  }
  return path.join(targetDir, ".agents/skills/self-diagnosis/scripts/diagnose.mjs");
}

function buildTestLedger({ bundleSha = "pending", includeFindingRow = false, includeAuditFinding = false, openBlocking = false } = {}) {
  const rows = [];
  if (includeFindingRow) {
    rows.push("| `SD-TEST-01` | Wave 1 | `TEST` | `Closed` | `target.txt#L1` | Synthetic test finding | Verified | `bundle` |");
  }
  if (includeAuditFinding) {
    rows.push("| `SD-AUDIT-99` | Wave 1 | `TEST` | `Closed` | `target.txt#L1` | Synthetic audit finding | Verified | `bundle` |");
  }
  const findingRow = rows.length
    ? "| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n" + rows.join("\n")
    : "None (0 wave findings)";
  const p1Status = openBlocking ? "Open (Pre-Remediation)" : "Closed";
  return [
    "# Synthetic Test Review Ledger",
    "",
    "## 1. Review Metadata & Session Provenance",
    "",
    "| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |",
    "| --- | --- | --- | --- | --- | --- |",
    "| Session 1 | `test-op-1` | `root` | `2026-11-13` | `main..HEAD` | `self-diagnosis` |",
    "",
    "## 2. Executive Summary & Overall Verdict",
    "",
    "Verdict: PASS (synthetic ledger).",
    "",
    "## 3. Scope, Baseline & PR Review Standard Compliance Matrix",
    "",
    "| Category | Status | Notes |",
    "| --- | --- | --- |",
    "| ARCH | Checked | Verified |",
    "",
    "## 4. Architecture-Before-Runtime Execution & Verification Trace",
    "",
    "Verified command execution trace.",
    "",
    "## 5. Prioritized Findings Ledger (1 ID Per Row)",
    "",
    "| ID | Severity | Category | Status | Location / Evidence | Finding | Suggested Fix |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    `| \`P1-SYN-01\` | P1 | \`SVC\` | \`${p1Status}\` | \`target.txt#L1\` | Synthetic P1 | Resolved |`,
    "",
    "## 6. Re-Verification Checklist & Acceptance Gate",
    "",
    "1. All items verified.",
    "",
    "## 7. Direction & Pre-Merge Readiness",
    "",
    "Proceed after verification.",
    "",
    "## 8. Post-Remediation Residuals & Deferred Dispositions",
    "",
    "None (0 open residuals, 0 deferred items)",
    "",
    "## 9. `/self-diagnosis` Cohort & Bundle Ledger",
    "",
    "| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    `| Wave 1 | \`sess-1\` | \`skill_and_pr_review_audit\` | \`s1, s2\` | \`${bundleSha}\` | \`N/A\` | Pending |`,
    "",
    findingRow,
    ""
  ].join("\n");
}

try {
  // 1. CLI --help, retired `run` rejection, and `plan` task execution
  const help = spawnSync(process.execPath, [cli, "--help"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /agy-squad plan/);
  assert.doesNotMatch(help.stdout, /terminal\.py/);

  const retiredRun = spawnSync(process.execPath, [cli, "run", "task"], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(retiredRun.status, 0);
  assert.match(retiredRun.stderr, /retired in Phase 2/);

  const emptyPlan = spawnSync(process.execPath, [cli, "plan"], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(emptyPlan.status, 0);
  assert.match(emptyPlan.stderr, /Usage: agy-squad plan/);

  const planRes = spawnSync(
    process.execPath,
    [cli, "plan", "--model", "gemini-3.8-flash-high", "--scope", "package.json", "--role", "Verifier", "Verify Phase 2 CLI"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(planRes.status, 0, planRes.stderr);
  const planJson = JSON.parse(planRes.stdout);
  assert.equal(planJson.executionMode, "swarm");
  assert.equal(planJson.modelProvenance.pinningSupported, true);
  assert.equal(planJson.workers[0].specialists[0].swarmAdd.model, "gemini-3.8-flash-high");

  const dispatchRes = spawnSync(
    process.execPath,
    [cli, "dispatch", "--squad", "all_l1", "--manifest", ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(dispatchRes.status, 0, dispatchRes.stderr);
  const dispatchJson = JSON.parse(dispatchRes.stdout);
  assert.equal(dispatchJson.Subagents.length, 3);
  const dispatchPos = spawnSync(
    process.execPath,
    [cli, "dispatch", "integrity_auditor:skill_and_pr_review_audit", "--manifest", ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(dispatchPos.status, 0, dispatchPos.stderr);
  assert.equal(JSON.parse(dispatchPos.stdout).Subagents.length, 1);
  const dispatchBad = spawnSync(process.execPath, [cli, "dispatch"], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(dispatchBad.status, 0);
  assert.match(dispatchBad.stderr, /Usage: agy-squad dispatch/);

  // 2. diagnose.mjs --help, flag validation, HEALTHY execution, --print-dispatch, and drift checks (all isolated in os.tmpdir)
  const isoRepo = path.join(temporary, "iso-repo");
  const isoDiag = copyIsolatedRepo(isoRepo);

  const diagHelp = spawnSync(process.execPath, [isoDiag, "--help"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(diagHelp.status, 0, diagHelp.stderr);
  assert.match(diagHelp.stdout, /Usage:/);

  const diagRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(diagRun.status, 0, diagRun.stderr);
  const diagParsed = JSON.parse(diagRun.stdout);
  assert.equal(diagParsed.status, "HEALTHY");
  assert.ok(diagParsed.promptBudgets.specialistTemplateBytes > 0);
  assert.ok(diagParsed.promptBudgets.leadTemplateBytes > 0);
  assert.equal(typeof diagParsed.timings.squadPlannerMs, "number");
  assert.equal(fs.existsSync(path.join(isoRepo, "scratch")), false);

  const diagMd = spawnSync(process.execPath, [isoDiag, "--markdown"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(diagMd.status, 0, diagMd.stderr);
  assert.match(diagMd.stdout, /# Agy-Squad Self-Diagnosis & Optimization Report/);
  assert.match(diagMd.stdout, /HEALTHY/);

  const badFlags = spawnSync(process.execPath, [isoDiag, "--markdown", "--teardown"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(badFlags.status, 1);
  assert.match(badFlags.stderr, /mutually exclusive/);
  const badShortVal = spawnSync(process.execPath, [isoDiag, "--print-dispatch", "all_l1", "--parent-id", "-h"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(badShortVal.status, 1);
  assert.match(badShortVal.stderr, /valid conversationId/);
  const badAcceptAll = spawnSync(process.execPath, [isoDiag, "--teardown", "all", "--accept", "0".repeat(64)], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(badAcceptAll.status, 1);
  assert.match(badAcceptAll.stderr, /single squadId/);
  const badLedgerDispatch = spawnSync(process.execPath, [isoDiag, "--print-dispatch", "all_l1", "--ledger", "docs/reviews/x.md"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(badLedgerDispatch.status, 1);
  assert.match(badLedgerDispatch.stderr, /not valid with '--print-plan' or '--print-dispatch'/);

  // Mid-cohort --allow-active-cohort check inside os.tmpdir()
  fs.mkdirSync(path.join(isoRepo, "scratch/agy-squad/squad-skill_and_pr_review_audit"), { recursive: true });
  try {
    const allowCohortRun = spawnSync(process.execPath, [isoDiag, "--allow-active-cohort"], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(allowCohortRun.status, 0, allowCohortRun.stderr);
    assert.equal(JSON.parse(allowCohortRun.stdout).status, "HEALTHY");
  } finally {
    fs.rmSync(path.join(isoRepo, "scratch"), { recursive: true, force: true });
  }

  // Positive --print-dispatch tests (all_l1, single squad, all_specialists with --parent-id)
  const dispatchAllL1 = spawnSync(
    process.execPath,
    [isoDiag, "--print-dispatch", "all_l1", "--parent-id", "parent-conv-123"],
    { cwd: isoRepo, encoding: "utf8" }
  );
  assert.equal(dispatchAllL1.status, 0, dispatchAllL1.stderr);
  const l1Json = JSON.parse(dispatchAllL1.stdout);
  assert.equal(l1Json.Subagents.length, 3);
  for (const agent of l1Json.Subagents) {
    assert.match(agent.Prompt, /Parent conversation ID \(send_message Recipient\): parent-conv-123/);
  }

  const dispatchSingle = spawnSync(
    process.execPath,
    [isoDiag, "--print-dispatch", "skill_and_pr_review_audit"],
    { cwd: isoRepo, encoding: "utf8" }
  );
  assert.equal(dispatchSingle.status, 0, dispatchSingle.stderr);
  assert.equal(JSON.parse(dispatchSingle.stdout).Subagents.length, 2);

  const dispatchAllSpec = spawnSync(
    process.execPath,
    [isoDiag, "--print-dispatch", "all_specialists", "--parent-id", "parent-conv-456"],
    { cwd: isoRepo, encoding: "utf8" }
  );
  assert.equal(dispatchAllSpec.status, 0, dispatchAllSpec.stderr);
  const specJson = JSON.parse(dispatchAllSpec.stdout);
  assert.equal(specJson.Subagents.length, 6);
  for (const agent of specJson.Subagents) {
    assert.match(agent.Prompt, /Parent conversation ID \(send_message Recipient\): parent-conv-456/);
  }

  const planDiagRes = spawnSync(
    process.execPath,
    [isoDiag, "--print-plan", "--workspace-isolation", "share"],
    { cwd: isoRepo, encoding: "utf8" }
  );
  assert.equal(planDiagRes.status, 0, planDiagRes.stderr);
  const planDiagJson = JSON.parse(planDiagRes.stdout);
  assert.equal(planDiagJson.executionMode, "swarm");
  assert.equal(planDiagJson.workers.length, 3);
  assert.equal(planDiagJson.integrityAuditPlan.length, 3);

  const flatPlanRes = spawnSync(
    process.execPath,
    [isoDiag, "--print-plan", "--topology", "flat"],
    { cwd: isoRepo, encoding: "utf8" }
  );
  assert.equal(flatPlanRes.status, 0, flatPlanRes.stderr);
  const flatPlanJson = JSON.parse(flatPlanRes.stdout);
  assert.equal(flatPlanJson.topology.compiledPattern, "flat");
  assert.equal(flatPlanJson.workers.length, 1);
  assert.equal(flatPlanJson.workers[0].squadId, "self_diagnosis");
  assert.equal(flatPlanJson.workers[0].lead, null);
  assert.equal(flatPlanJson.workers[0].specialists.length, 6);
  assert.equal(flatPlanJson.integrityAuditPlan.length, 1);

  // SKILL-PR5-04: Verify skill drift check catches retired Phase 1/2 symbols in references/*.md without false positives on retired notices
  const driftRefDir = path.join(isoRepo, ".agents/skills/swarm-governance/references");
  const driftRefFile = path.join(driftRefDir, "drift-probe.md");
  const hadDriftRefDir = fs.existsSync(driftRefDir);
  fs.mkdirSync(driftRefDir, { recursive: true });
  try {
    fs.writeFileSync(driftRefFile, "Run `bin/terminal.py`, `adversarial_l1`, `node mcp/handoffs.mjs`, and wait for `.mcp-ready`.\n");
    const driftBad = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(driftBad.status, 1, driftBad.stderr);
    const driftBadJson = JSON.parse(driftBad.stdout);
    assert.equal(driftBadJson.status, "CHANGES_REQUIRED");
    const driftFinding = driftBadJson.findings.find(f => f.id === "SKILL-DRIFT-swarm-governance");
    assert.ok(driftFinding, "Expected SKILL-DRIFT-swarm-governance for active retired Phase 1/2 symbol reference");
    assert.match(driftFinding.summary, /terminal\.py/);
    assert.match(driftFinding.summary, /adversarial_l1/);
    assert.match(driftFinding.summary, /mcp\/handoffs\.mjs/);
    assert.match(driftFinding.summary, /\.mcp-ready/);

    fs.writeFileSync(driftRefFile, "Historical note: `bin/terminal.py`, `adversarial_l1`, `node mcp/handoffs.mjs`, and `.mcp-ready` are retired.\n");
    const driftOk = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(driftOk.status, 0, driftOk.stderr);
    assert.equal(JSON.parse(driftOk.stdout).status, "HEALTHY");
  } finally {
    fs.rmSync(driftRefFile, { force: true });
    if (!hadDriftRefDir) {
      fs.rmSync(driftRefDir, { recursive: true, force: true });
    }
  }

  // Canonical roles-and-workflows & runtime closure checklist enforcement tests
  const swarmSkillPath = path.join(isoRepo, ".agents/skills/swarm-governance/SKILL.md");
  const stoppingDocPath = path.join(isoRepo, "docs/stopping-agents.md");
  const rolesDocPath = path.join(isoRepo, "docs/roles-and-workflows.md");
  const prSkillPath = path.join(isoRepo, ".agents/skills/pr-review/SKILL.md");
  const origSwarmSkill = fs.readFileSync(swarmSkillPath, "utf8");
  const origStoppingDoc = fs.readFileSync(stoppingDocPath, "utf8");
  const origRolesDoc = fs.readFileSync(rolesDocPath, "utf8");
  const origPrSkill = fs.readFileSync(prSkillPath, "utf8");
  try {
    // 1. Dropping checks 1 & 4 inside closure section triggers SKILL-CLOSURE-CHECKLIST even though swarm_monitor appears earlier;
    //    bare non-link text "roles-and-workflows.md" triggers SKILL-ROLES-LINK-*
    fs.writeFileSync(
      swarmSkillPath,
      origSwarmSkill
        .replace(/\[Roles & skill workflows\]\([^)]+\)/g, "roles-and-workflows.md")
        .replace(/1\. `swarm\{action: "status"\}`[^\n]+\n/, "")
        .replace(/4\. Child commands:[^\n]+\n?/, "")
    );
    fs.writeFileSync(
      prSkillPath,
      origPrSkill.replace("roles-and-workflows.md#pr-review", "roles-and-workflows.md#nonexistent-anchor")
    );
    fs.writeFileSync(
      stoppingDocPath,
      origStoppingDoc.replace(/## Four-check runtime closure checklist[\s\S]*?(?=\n## )/, "")
    );
    fs.writeFileSync(
      rolesDocPath,
      origRolesDoc.replace(/### Four-check runtime closure gate[\s\S]*?(?=\n#{2,3} |$)/, "")
    );
    const badIds = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout).findings.map(f => f.id);
    assert.ok(badIds.includes("SKILL-ROLES-LINK-swarm-governance"), "Expected SKILL-ROLES-LINK for bare non-link mention");
    assert.ok(badIds.includes("SKILL-ROLES-LINK-pr-review"), "Expected SKILL-ROLES-LINK for bad #anchor fragment");
    assert.ok(badIds.includes("SKILL-CLOSURE-CHECKLIST"), "Expected SKILL-CLOSURE-CHECKLIST when closure section is incomplete");
    assert.ok(badIds.includes("DOC-CLOSURE-CHECKLIST-stopping-agents"), "Expected DOC-CLOSURE-CHECKLIST-stopping-agents when closure section is removed");
    assert.ok(badIds.includes("DOC-CLOSURE-CHECKLIST-roles-and-workflows"), "Expected DOC-CLOSURE-CHECKLIST-roles-and-workflows when closure section is removed");

    fs.rmSync(rolesDocPath);
    const missingDocIds = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout).findings.map(f => f.id);
    assert.ok(missingDocIds.includes("DOC-ROLES-MISSING"), "Expected DOC-ROLES-MISSING when docs/roles-and-workflows.md is absent");

    const orphanSvgPath = path.join(isoRepo, "docs/assets/test-orphan-diagram.svg");
    const reviewMentionPath = path.join(isoRepo, "docs/reviews/test-orphan-mention.md");
    fs.mkdirSync(path.dirname(orphanSvgPath), { recursive: true });
    fs.writeFileSync(orphanSvgPath, "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n");
    fs.writeFileSync(reviewMentionPath, "Mentioning test-orphan-diagram.svg in docs/reviews/ must not clear DOC-SVG-ORPHAN.\n");
    const zensicalPath = path.join(isoRepo, "zensical.toml");
    const origZensical = fs.readFileSync(zensicalPath, "utf8");
    fs.writeFileSync(zensicalPath, origZensical.replace("roles-and-workflows.md", "missing-nav-target.md"));
    try {
      const visualIds = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout).findings.map(f => f.id);
      assert.ok(visualIds.includes("DOC-SVG-ORPHAN-test-orphan-diagram"), "Expected DOC-SVG-ORPHAN even if mentioned in docs/reviews/");
      assert.ok(visualIds.some(id => id.startsWith("DOC-ZENSICAL-MISSING")), "Expected DOC-ZENSICAL-MISSING for missing nav target");
    } finally {
      fs.writeFileSync(zensicalPath, origZensical);
      fs.rmSync(orphanSvgPath, { force: true });
      fs.rmSync(reviewMentionPath, { force: true });
    }
  } finally {
    fs.writeFileSync(swarmSkillPath, origSwarmSkill);
    fs.writeFileSync(stoppingDocPath, origStoppingDoc);
    fs.writeFileSync(rolesDocPath, origRolesDoc);
    fs.writeFileSync(prSkillPath, origPrSkill);
  }

  // 3. TEST-PR5-02: Isolated --teardown positive & negative gating tests
  const tdRepo = path.join(temporary, "teardown-repo");
  const tdDiag = copyIsolatedRepo(tdRepo);
  const tdReviewsDir = path.join(tdRepo, "docs/reviews");
  for (const name of fs.readdirSync(tdReviewsDir)) {
    fs.rmSync(path.join(tdReviewsDir, name), { recursive: true, force: true });
  }
  const tdLedgerRel = "docs/reviews/test-teardown-ledger.md";
  const tdLedgerAbs = path.join(tdRepo, tdLedgerRel);
  fs.writeFileSync(tdLedgerAbs, buildTestLedger());

  // 3a. Refusal on unbundled evidence
  const squadId = "skill_and_pr_review_audit";
  const s1Slot = reportPath(squadId, 1, "scratch/agy-squad");
  const s2Slot = reportPath(squadId, 2, "scratch/agy-squad");
  const leadSlot = reportPath(squadId, undefined, "scratch/agy-squad");
  for (const [slot, body] of [
    [s1Slot, "# Specialist 1\nVerified target.txt.\n"],
    [s2Slot, "# Specialist 2\nVerified target.txt.\n"],
    [leadSlot, "# Lead Synthesis\nContent Verdict: PASS\n- `SD-TEST-01`: Verified target.txt.\n"]
  ]) {
    const abs = path.join(tdRepo, slot);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  const refuseUnbundled = spawnSync(process.execPath, [tdDiag, "--teardown", squadId], { cwd: tdRepo, encoding: "utf8" });
  assert.equal(refuseUnbundled.status, 1);
  assert.match(refuseUnbundled.stderr, /unbundled evidence/);

  // Create valid bundle for skill_and_pr_review_audit
  fs.writeFileSync(path.join(tdRepo, "target.txt"), "verified content\n");
  const verifiedFiles = fingerprint(tdRepo, ["target.txt"]);
  const tdRecord = {
    workspace: tdRepo,
    squadId,
    verdict: "PASS",
    requireIntegrityAudit: false,
    verifiedFiles,
    assignments: [
      { conversationId: "s1-id", report: s1Slot },
      { conversationId: "s2-id", report: s2Slot }
    ],
    handoffs: [
      { sender: "s1-id", message: `READY ${s1Slot} — Specialist 1 verified target.txt.` },
      { sender: "s2-id", message: `READY ${s2Slot} — Specialist 2 verified target.txt.` }
    ]
  };
  inspectHandoffs(tdRepo, tdRecord);
  const bundled = bundleReports(tdRepo, tdRecord);
  const bundleAbs = path.join(tdRepo, bundled.path);
  const bundleMtimeSec = Math.floor(fs.statSync(bundleAbs).mtimeMs / 1000);

  // 3b. Refusal when bundle digest is missing from Section 9
  fs.writeFileSync(tdLedgerAbs, buildTestLedger({ bundleSha: "pending", includeFindingRow: true }));
  fs.utimesSync(tdLedgerAbs, bundleMtimeSec + 5, bundleMtimeSec + 5);
  const refuseMissingSha = spawnSync(process.execPath, [tdDiag, "--teardown", squadId], { cwd: tdRepo, encoding: "utf8" });
  assert.equal(refuseMissingSha.status, 1);
  assert.match(refuseMissingSha.stderr, /not recorded in Section 9/);

  // 3c. Refusal when cohort finding ID (SD-TEST-01) is missing from ledger
  fs.writeFileSync(tdLedgerAbs, buildTestLedger({ bundleSha: bundled.sha256, includeFindingRow: false }));
  fs.utimesSync(tdLedgerAbs, bundleMtimeSec + 5, bundleMtimeSec + 5);
  const refuseMissingFinding = spawnSync(process.execPath, [tdDiag, "--teardown", squadId], { cwd: tdRepo, encoding: "utf8" });
  assert.equal(refuseMissingFinding.status, 1);
  assert.match(refuseMissingFinding.stderr, /cohort finding ID\(s\) \[SD-TEST-01\] are missing/);

  // 3d. Refusal when ledger mtime < bundle mtime
  fs.writeFileSync(tdLedgerAbs, buildTestLedger({ bundleSha: bundled.sha256, includeFindingRow: true }));
  fs.utimesSync(tdLedgerAbs, bundleMtimeSec - 10, bundleMtimeSec - 10);
  const refuseStaleLedger = spawnSync(process.execPath, [tdDiag, "--teardown", squadId], { cwd: tdRepo, encoding: "utf8" });
  assert.equal(refuseStaleLedger.status, 1);
  assert.match(refuseStaleLedger.stderr, /before updating the durable target PR review ledger/);

  // 3e. Refusal on wrong --accept digest when ledger is valid and newer
  fs.utimesSync(tdLedgerAbs, bundleMtimeSec + 5, bundleMtimeSec + 5);
  const refuseWrongAccept = spawnSync(
    process.execPath,
    [tdDiag, "--teardown", squadId, "--accept", "0".repeat(64), "--ledger", tdLedgerRel],
    { cwd: tdRepo, encoding: "utf8" }
  );
  assert.equal(refuseWrongAccept.status, 1);
  assert.match(refuseWrongAccept.stderr, /Bundle differs from the primary's accepted digest/);

  // 3f. Success with valid bundle + newer ledger + matching --accept + empty parent cleanup
  const tdSuccess = spawnSync(
    process.execPath,
    [tdDiag, "--teardown", squadId, "--accept", bundled.sha256, "--ledger", tdLedgerRel],
    { cwd: tdRepo, encoding: "utf8" }
  );
  assert.equal(tdSuccess.status, 0, tdSuccess.stderr);
  const tdSuccessJson = JSON.parse(tdSuccess.stdout);
  assert.equal(tdSuccessJson.status, "TORN_DOWN");
  assert.deepEqual(tdSuccessJson.tornDown, [`scratch/agy-squad/squad-${squadId}`]);
  assert.deepEqual(tdSuccessJson.removedParents, ["scratch/agy-squad", "scratch"]);
  assert.equal(fs.existsSync(path.join(tdRepo, "scratch")), false);

  // 3f2. SD-SCRIPT-01: Audited teardown removes companion squad-integrity_auditor-<id> too and refuses unbundled auditor dir
  const auditedId = "runtime_and_contract_diagnosis";
  const aS1 = reportPath(auditedId, 1);
  const aLead = reportPath(auditedId, undefined);
  const aInt = reportPath(`integrity_auditor-${auditedId}`, 1);
  const writeTd = (rel, body) => {
    const abs = path.join(tdRepo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };
  writeTd(aS1, "# Spec 1\nVerified target.txt.\n");
  writeTd(aLead, "Content Verdict: PASS\nNo open defects.\n");
  const auditedRecord = {
    workspace: tdRepo,
    squadId: auditedId,
    verdict: "PASS",
    requireIntegrityAudit: true,
    verifiedFiles,
    assignments: [{ conversationId: "s1-id", report: aS1 }],
    handoffs: [{ sender: "s1-id", message: `READY ${aS1} — Audited check.` }]
  };
  const { evidenceDigest: auditedDigest } = computeEvidenceDigest(tdRepo, auditedRecord);
  writeTd(aInt, `Target Squad: ${auditedId}\nEvidence Digest: ${auditedDigest}\nIntegrity Verdict: CLEAN\nVerified.\n`);
  const unbundledAuditRefusal = spawnSync(process.execPath, [tdDiag, "--teardown", auditedId], { cwd: tdRepo, encoding: "utf8" });
  assert.equal(unbundledAuditRefusal.status, 1);
  inspectHandoffs(tdRepo, auditedRecord);
  const auditedBundled = bundleReports(tdRepo, auditedRecord);
  const auditedMtimeSec = Math.floor(fs.statSync(path.join(tdRepo, auditedBundled.path)).mtimeMs / 1000);
  fs.writeFileSync(tdLedgerAbs, buildTestLedger({ bundleSha: auditedBundled.sha256, includeFindingRow: true }));
  fs.utimesSync(tdLedgerAbs, auditedMtimeSec + 5, auditedMtimeSec + 5);
  const auditedTeardown = spawnSync(
    process.execPath,
    [tdDiag, "--teardown", auditedId, "--accept", auditedBundled.sha256, "--ledger", tdLedgerRel],
    { cwd: tdRepo, encoding: "utf8" }
  );
  assert.equal(auditedTeardown.status, 0, auditedTeardown.stderr);
  const auditedTdJson = JSON.parse(auditedTeardown.stdout);
  assert.ok(auditedTdJson.tornDown.includes(`scratch/agy-squad/squad-${auditedId}`));
  assert.ok(auditedTdJson.tornDown.includes(`scratch/agy-squad/squad-integrity_auditor-${auditedId}`));
  assert.equal(fs.existsSync(path.join(tdRepo, "scratch")), false);

  // 3g. --force bypass removes unbundled squad and canary directories + empty parents
  const forceSquadFile = path.join(tdRepo, "scratch/agy-squad/squad-runtime_and_contract_diagnosis/specialist-1/report.md");
  const forceCanaryFile = path.join(tdRepo, "scratch/agy-squad/self-diag-canary-999/artifact.txt");
  fs.mkdirSync(path.dirname(forceSquadFile), { recursive: true });
  fs.mkdirSync(path.dirname(forceCanaryFile), { recursive: true });
  fs.writeFileSync(forceSquadFile, "unbundled");
  fs.writeFileSync(forceCanaryFile, "canary");
  const tdForce = spawnSync(process.execPath, [tdDiag, "--teardown", "all", "--force"], { cwd: tdRepo, encoding: "utf8" });
  assert.equal(tdForce.status, 0, tdForce.stderr);
  const tdForceJson = JSON.parse(tdForce.stdout);
  assert.equal(tdForceJson.status, "TORN_DOWN");
  assert.ok(tdForceJson.tornDown.includes("scratch/agy-squad/squad-runtime_and_contract_diagnosis"));
  assert.ok(tdForceJson.tornDown.includes("scratch/agy-squad/self-diag-canary-999"));
  assert.equal(fs.existsSync(path.join(tdRepo, "scratch")), false);

  // 4. TEST-P2-01: Test newest-ledger precedence in an isolated temp copy (never mutate tracked repo mtimes)
  const r1Iso = path.join(isoRepo, "docs/reviews/rebuild-wsl-dispatch-review.md");
  const r2Iso = path.join(isoRepo, "docs/reviews/rebuild-wsl-dispatch-review-r2.md");
  const baseSec = Math.floor(Date.now() / 1000) + 5;
  fs.utimesSync(r2Iso, baseSec, baseSec);
  fs.utimesSync(r1Iso, baseSec + 2, baseSec + 2);
  // Remove any newer ledger in isoCopy so rebuild-wsl-dispatch-review* precedence is isolated cleanly
  for (const name of fs.readdirSync(path.join(isoRepo, "docs/reviews"))) {
    if (!name.startsWith("rebuild-wsl-dispatch-review")) {
      fs.rmSync(path.join(isoRepo, "docs/reviews", name));
    }
  }
  const isoDiagRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(isoDiagRun.status, 0, isoDiagRun.stderr);
  assert.equal(JSON.parse(isoDiagRun.stdout).targetReviewLedger, "docs/reviews/rebuild-wsl-dispatch-review-r2.md");

  // Fresh clone / equal-mtime checkout: semantic vX.Y.Z release ledgers beat prN-* (`SD-SCRIPT-LEDGER-SORT`),
  // and without release/remediation ledgers, prN-* ledgers still beat legacy cross-family -r2 ledgers
  const freshRepo = path.join(temporary, "fresh-repo");
  fs.mkdirSync(freshRepo, { recursive: true });
  const freshDiag = copyIsolatedRepo(freshRepo);
  try {
    const sameSec = Math.floor(Date.now() / 1000) + 10;
    for (const name of fs.readdirSync(path.join(freshRepo, "docs/reviews"))) {
      if (name.endsWith(".md")) {
        fs.utimesSync(path.join(freshRepo, "docs/reviews", name), sameSec, sameSec);
      }
    }
    const freshRun = spawnSync(process.execPath, [freshDiag], { cwd: freshRepo, encoding: "utf8" });
    assert.equal(freshRun.status, 0, freshRun.stderr);
    assert.equal(JSON.parse(freshRun.stdout).targetReviewLedger, "docs/reviews/v0.1.3-self-diagnosis-review.md");

    for (const name of fs.readdirSync(path.join(freshRepo, "docs/reviews"))) {
      if (/^v\d+\./i.test(name) || /(?:remediation|fix-p[0-9]|self-diagnosis-review)/i.test(name)) {
        fs.rmSync(path.join(freshRepo, "docs/reviews", name));
      }
    }
    const freshPrRun = spawnSync(process.execPath, [freshDiag, "--skip-mcp-spawn"], { cwd: freshRepo, encoding: "utf8" });
    assert.equal(freshPrRun.status, 0, freshPrRun.stderr);
    assert.match(JSON.parse(freshPrRun.stdout).targetReviewLedger, /^docs\/reviews\/pr5-/);
  } finally {
    fs.rmSync(freshRepo, { recursive: true, force: true });
  }

  // 5. Wave C4 Regressions: SVC-002 flat teardown atomic preflight, SVC-006 live-PID canary, SVC-009 audit finding ID, SCRIPT-001/002/003, DEP-001 tarball
  const svcRepo = path.join(temporary, "svc-repo");
  fs.mkdirSync(svcRepo, { recursive: true });
  const svcDiag = copyIsolatedRepo(svcRepo);
  try {
    fs.writeFileSync(path.join(svcRepo, "target.txt"), "flat self-diag\n");
    const svcFiles = fingerprint(svcRepo, ["target.txt"]);
    const flatId = "self_diagnosis";
    const flatS1 = reportPath(flatId, 1);
    const flatLead = reportPath(flatId, undefined);
    const flatAudit = reportPath("integrity_auditor", 1);
    const writeSvc = (rel, body) => {
      const abs = path.join(svcRepo, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body);
    };
    writeSvc(flatS1, "# Flat Spec 1\nVerified target.txt.\n");
    writeSvc(flatLead, "Content Verdict: PASS\nVerified flat cohort.\n");
    const flatRecord = {
      workspace: svcRepo,
      squadId: flatId,
      verdict: "PASS",
      requireIntegrityAudit: true,
      integrityAuditSlots: [flatAudit],
      verifiedFiles: svcFiles,
      assignments: [{ conversationId: "flat-s1", report: flatS1 }],
      handoffs: [{ sender: "flat-s1", message: `READY ${flatS1} — Verified flat.` }]
    };
    const { evidenceDigest: flatDigest } = computeEvidenceDigest(svcRepo, flatRecord);
    // SVC-009: audit-only finding SD-AUDIT-99 must block teardown until added to ledger; SVC-002 atomic preflight preserves working bundle when auditor/ledger fails
    writeSvc(flatAudit, `Target Squad: ${flatId}\nEvidence Digest: ${flatDigest}\nIntegrity Verdict: CLEAN\n- \`SD-AUDIT-99\`: unexported audit finding.\n`);
    inspectHandoffs(svcRepo, flatRecord);
    const flatBundled = bundleReports(svcRepo, flatRecord);
    const svcLedgerRel = "docs/reviews/svc-ledger.md";
    const svcLedgerAbs = path.join(svcRepo, svcLedgerRel);
    const flatMtimeSec = Math.floor(fs.statSync(path.join(svcRepo, flatBundled.path)).mtimeMs / 1000);
    fs.writeFileSync(svcLedgerAbs, buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: false, includeAuditFinding: false }));
    fs.utimesSync(svcLedgerAbs, flatMtimeSec + 5, flatMtimeSec + 5);
    const failAuditFinding = spawnSync(process.execPath, [svcDiag, "--teardown", "all", "--ledger", svcLedgerRel], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(failAuditFinding.status, 1);
    assert.match(failAuditFinding.stderr, /SD-AUDIT-99/);
    assert.equal(fs.existsSync(path.join(svcRepo, flatS1)), true, "SVC-002 atomic preflight must not delete working evidence on failure");
    assert.equal(fs.existsSync(path.join(svcRepo, flatBundled.path)), true);

    // SVC-006: live-PID canary is skipped while dead-PID canary is reaped and valid flat cohort + flat auditor dir are both removed
    writeSvc("scratch/agy-squad/self-diag-canary-live/canary-owner.json", JSON.stringify({ pid: process.pid }));
    writeSvc("scratch/agy-squad/self-diag-canary-dead/canary-owner.json", JSON.stringify({ pid: 9999999 }));
    fs.writeFileSync(svcLedgerAbs, buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: false, includeAuditFinding: true }));
    fs.utimesSync(svcLedgerAbs, flatMtimeSec + 5, flatMtimeSec + 5);
    const okFlatTd = spawnSync(process.execPath, [svcDiag, "--teardown", "all", "--ledger", svcLedgerRel], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(okFlatTd.status, 0, okFlatTd.stderr);
    const okFlatJson = JSON.parse(okFlatTd.stdout);
    assert.ok(okFlatJson.tornDown.includes("scratch/agy-squad/squad-self_diagnosis"));
    assert.ok(okFlatJson.tornDown.includes("scratch/agy-squad/squad-integrity_auditor"));
    assert.ok(okFlatJson.tornDown.includes("scratch/agy-squad/self-diag-canary-dead"));
    assert.equal(fs.existsSync(path.join(svcRepo, "scratch/agy-squad/squad-integrity_auditor")), false);
    assert.equal(fs.existsSync(path.join(svcRepo, "scratch/agy-squad/self-diag-canary-live/canary-owner.json")), true);
    fs.rmSync(path.join(svcRepo, "scratch"), { recursive: true, force: true });

    // SCRIPT-001 & SCRIPT-002: Missing section, cross-section conflict, and Open (Pre-Remediation) P1 fail with structured ledger diagnostics
    const openLedgerRel = "docs/reviews/open-blocker.md";
    fs.writeFileSync(path.join(svcRepo, openLedgerRel), buildTestLedger({ openBlocking: true }));
    const openRun = spawnSync(process.execPath, [svcDiag, "--ledger", openLedgerRel], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(openRun.status, 1);
    const openJson = JSON.parse(openRun.stdout);
    assert.equal(openJson.ledgerDisposition, "OPEN_BLOCKERS");
    assert.ok(openJson.findings.some((f) => f.id === "DOC-LEDGER-OPEN-BLOCKERS"));

    const schemaLedgerRel = "docs/reviews/bad-schema.md";
    fs.writeFileSync(path.join(svcRepo, schemaLedgerRel), "# Incomplete Ledger\n## 1. Review Metadata\n");
    const schemaRun = spawnSync(process.execPath, [svcDiag, "--ledger", schemaLedgerRel], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(schemaRun.status, 1);
    const schemaJson = JSON.parse(schemaRun.stdout);
    assert.ok(schemaJson.findings.some((f) => f.id === "DOC-LEDGER-SCHEMA"));

    const conflictLedgerRel = "docs/reviews/conflict-schema.md";
    const conflictText = buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: true }).replace(
      "None (0 open residuals, 0 deferred items)",
      "| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| `P1-SYN-01` | Wave 1 | `SVC` | `Residual (Open)` | `target.txt#L1` | Conflicting status | Deferred | `open` |"
    );
    fs.writeFileSync(path.join(svcRepo, conflictLedgerRel), conflictText);
    const conflictRun = spawnSync(process.execPath, [svcDiag, "--ledger", conflictLedgerRel], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(conflictRun.status, 1);
    const conflictJson = JSON.parse(conflictRun.stdout);
    assert.ok(conflictJson.findings.some((f) => f.id === "DOC-LEDGER-SCHEMA" && /P1-SYN-01/.test(f.summary)));

    // SCRIPT-003: Spaced AGY_SQUAD_SCRATCH_ROOT handled cleanly by diagnose.mjs and CLI bundle
    const spacedEnv = { ...process.env, AGY_SQUAD_SCRATCH_ROOT: "scratch/custom spaced" };
    const spacedRun = spawnSync(process.execPath, [svcDiag, "--ledger", svcLedgerRel], { cwd: svcRepo, env: spacedEnv, encoding: "utf8" });
    assert.equal(spacedRun.status, 0, spacedRun.stderr);
    const spacedJson = JSON.parse(spacedRun.stdout);
    const spacedSlot = spacedJson.compiledStages?.squads?.skill_and_pr_review_audit?.[0]?.reportSlot;
    assert.equal(spacedSlot, "scratch/custom spaced/agy-squad/squad-skill_and_pr_review_audit/specialist-1/report.md");
    assert.ok(spacedJson.compiledStages.squads.skill_and_pr_review_audit[0].receiptHeadroomBytes > 0);
    const spS1 = "scratch/custom spaced/agy-squad/squad-spaced_cli/specialist-1/report.md";
    const spLead = "scratch/custom spaced/agy-squad/squad-spaced_cli/lead/report.md";
    writeSvc(spS1, "# Spaced CLI Spec\nVerified target.txt.\n");
    writeSvc(spLead, "Content Verdict: PASS\nVerified spaced root.\n");
    const spRecPath = "scratch/custom spaced/spaced-record.json";
    writeSvc(spRecPath, JSON.stringify({
      workspace: svcRepo,
      squadId: "spaced_cli",
      verdict: "PASS",
      requireIntegrityAudit: false,
      verifiedFiles: svcFiles,
      assignments: [{ conversationId: "sp-1", report: spS1 }],
      handoffs: [{ sender: "sp-1", message: `READY ${spS1} — Verified spaced scratch root.` }]
    }));
    const spBundle = spawnSync(process.execPath, [cli, "bundle", spRecPath], { cwd: svcRepo, env: spacedEnv, encoding: "utf8" });
    assert.equal(spBundle.status, 0, spBundle.stderr);
    assert.equal(JSON.parse(spBundle.stdout).path, "scratch/custom spaced/agy-squad/squad-spaced_cli/lead/report.sources.json");
    fs.rmSync(path.join(svcRepo, "scratch"), { recursive: true, force: true });

    // DEP-001: Packaged tarball offline run of diagnose.mjs completes without failing on checkout-only paths
    const packDir = path.join(temporary, "pack-out");
    const unpackDir = path.join(temporary, "unpack-pkg");
    fs.mkdirSync(packDir, { recursive: true });
    fs.mkdirSync(unpackDir, { recursive: true });
    const packRes = spawnSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["pack", "--pack-destination", packDir],
      { cwd: repoRoot, encoding: "utf8", shell: process.platform === "win32" }
    );
    assert.equal(packRes.status, 0, packRes.stderr);
    const tgzName = packRes.stdout.trim().split(/\r?\n/).pop();
    const relUnpack = path.relative(packDir, unpackDir).replace(/\\/g, "/");
    const untarRes = spawnSync("tar", ["-xzf", tgzName, "-C", relUnpack], { cwd: packDir, encoding: "utf8" });
    assert.equal(untarRes.status, 0, untarRes.stderr);
    const pkgRoot = path.join(unpackDir, "package");
    const pkgDiagRes = spawnSync(
      process.execPath,
      [".agents/skills/self-diagnosis/scripts/diagnose.mjs"],
      { cwd: pkgRoot, encoding: "utf8" }
    );
    assert.equal(pkgDiagRes.status, 0, pkgDiagRes.stderr);
    const pkgDiagJson = JSON.parse(pkgDiagRes.stdout);
    assert.equal(pkgDiagJson.targetReviewLedger, null);
    assert.equal(pkgDiagJson.ledgerDisposition, "PACKAGED_OMITTED");
    assert.ok(pkgDiagJson.findings.some((f) => f.id === "DOC-PACKAGED-LEDGER-OMITTED" && f.priority === "P3"));
    assert.ok(pkgDiagJson.findings.some((f) => f.id === "DEP-PACKAGED-CHECKOUT-SCOPE" && f.priority === "P3"));
    assert.equal(pkgDiagJson.status, "HEALTHY");

    // SQ-SCRIPT-001: diagnose.mjs flags retired v1.x symbols (query_transcript, read_transcript, check_context_health) in mcp/ and active docs/
    const driftDocPath = path.join(svcRepo, "docs", "concepts.md");
    const savedConcepts = fs.readFileSync(driftDocPath, "utf8");
    fs.writeFileSync(driftDocPath, savedConcepts + "\nCall query_transcript summaryOnly=true now.\n");
    const driftRun = spawnSync(process.execPath, [svcDiag, "--ledger", svcLedgerRel], { cwd: svcRepo, encoding: "utf8" });
    fs.writeFileSync(driftDocPath, savedConcepts);
    assert.notEqual(driftRun.status, 0);
    const driftJson = JSON.parse(driftRun.stdout);
    assert.ok(driftJson.findings.some((f) => f.id === "DOC-MCP-DRIFT" && /query_transcript/.test(f.summary)));

    // SQ-SKILL-004: self-diagnosis manifest must not emit contradictory 'never call read_file' alongside bounded read_file guidance
    assert.equal(
      JSON.stringify(pkgDiagJson.compiledStages?.squads ?? {}).includes("never call read_file"),
      false,
      "Compiled self-diagnosis briefs must not contain 'never call read_file'"
    );

    // L46: install.ps1 resolves node dynamically across Windows PowerShell 5.1 & PowerShell 7+
    const installPs1 = fs.readFileSync(path.join(repoRoot, "install.ps1"), "utf8");
    assert.match(installPs1, /Get-Command node/);
    assert.match(installPs1, /\$PSCommandPath/);
    assert.match(installPs1, /\$LASTEXITCODE/);

    // W3 Regressions (SD-SCRIPT-*, COORD-DIAG-001, OPT-SVC-01, OPT-PROF-01)
    // SD-SCRIPT-SEC4 & SD-SCRIPT-BOLDID: Section 4 open blockers & bold **ID** duplicates detected
    const sec4OpenText = buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: true })
      .replace("None (0 open residuals, 0 deferred items)", "| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| `RES-01` | Wave 1 | `SVC` | `Closed (Post-Remediation)` | `target.txt#L1` | Closed residual | Fixed | `verified` |")
      .replace("## 4. Architecture-Before-Runtime Execution & Verification Trace", "## 4. Architecture-Before-Runtime Execution & Verification Trace\n\n| ID | Wave | Cat | Priority | Status | Source | Summary |\n| --- | --- | --- | --- | --- | --- | --- |\n| `SEC4-P2-01` | v0.1.2 | `SVC` | P2 | `Open (Pre-Remediation)` | `target.txt#L1` | Open blocker in section 4 |");
    writeSvc("docs/reviews/sec4-open.md", sec4OpenText);
    const sec4OpenRun = spawnSync(process.execPath, [svcDiag, "--ledger", "docs/reviews/sec4-open.md", "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(sec4OpenRun.status, 1, "SD-SCRIPT-SEC4: open P2 in Section 4 must exit 1");
    assert.ok(JSON.parse(sec4OpenRun.stdout).findings.some(f => f.id === "DOC-LEDGER-OPEN-BLOCKERS"));

    const boldDupText = buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: true })
      .replace("| `P1-SYN-01` |", "| **`P1-SYN-01`** | P1 | `SVC` | `Closed` | `target.txt#L1` | Bold duplicate | Fixed |\n| `P1-SYN-01` |");
    writeSvc("docs/reviews/bold-dup.md", boldDupText);
    const boldDupRun = spawnSync(process.execPath, [svcDiag, "--ledger", "docs/reviews/bold-dup.md", "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(boldDupRun.status, 1, "SD-SCRIPT-BOLDID: **ID** must strip asterisks and catch duplicate");
    assert.ok(JSON.parse(boldDupRun.stdout).findings.some(f => f.id === "DOC-LEDGER-SCHEMA" && /duplicate/i.test(f.summary)));

    // SD-SCRIPT-CLI-ORDER & SD-OPT-MCP-SPAWN & SD-SCRIPT-BUDGET-SWARM & SD-OPT-CANARY-TIMING
    const orderPlan = spawnSync(process.execPath, [svcDiag, "--print-plan", "--flat", "skill_and_pr_review_audit"], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(orderPlan.status, 0, `SD-SCRIPT-CLI-ORDER: --print-plan --flat <id> must work: ${orderPlan.stderr}`);
    assert.equal(JSON.parse(orderPlan.stdout).workers[0].squadId, "skill_and_pr_review_audit");
    const conflictTopo = spawnSync(process.execPath, [svcDiag, "--print-plan", "--topology", "layered", "--flat"], { cwd: svcRepo, encoding: "utf8" });
    assert.notEqual(conflictTopo.status, 0, "SD-SCRIPT-CLI-ORDER: --topology layered --flat must conflict");

    const fastDiagRes = spawnSync(process.execPath, [svcDiag, "--ledger", svcLedgerRel, "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(fastDiagRes.status, 0, fastDiagRes.stderr);
    const fastDiag = JSON.parse(fastDiagRes.stdout);
    assert.equal(fastDiag.timings.mcpSpawnSkipped, true, "SD-OPT-MCP-SPAWN: --skip-mcp-spawn flag must skip stdio child spawn");
    assert.equal(typeof fastDiag.timings.digestMs, "number", "SD-OPT-CANARY-TIMING: timings.digestMs must be reported separately");
    assert.equal(typeof fastDiag.timings.canaryFingerprintMs, "number", "SD-SCRIPT-LATENCY: timings.canaryFingerprintMs must be reported separately");
    assert.equal(typeof fastDiag.promptBudgets.swarmSpecialistTemplateBytes, "number", "SD-SCRIPT-BUDGET-SWARM: must report swarm specialist template bytes");
    assert.equal(typeof fastDiag.promptBudgets.swarmLeadTemplateBytes, "number", "SD-SCRIPT-BUDGET-SWARM: must report swarm lead template bytes");
    assert.equal(typeof fastDiag.promptBudgets.swarmAuditorTemplateBytes, "number", "OPT-SVC-01: must report swarm auditor template bytes");

    // SD-SCRIPT-LEDGER-ERR: invalid --ledger prints clean message without JS stack trace
    const badLedgerErr = spawnSync(process.execPath, [svcDiag, "--ledger", "/etc/passwd"], { cwd: svcRepo, encoding: "utf8" });
    assert.equal(badLedgerErr.status, 1);
    assert.doesNotMatch(badLedgerErr.stderr, /^\s+at\s+/m, "SD-SCRIPT-LEDGER-ERR: invalid --ledger must not leak raw JS stack trace");

    // SD-SCRIPT-SHARE, SD-SCRIPT-FM-EDGE, COORD-DIAG-001, SD-SCRIPT-PROSE-FP, SD-SCRIPT-OVERLAP-DENOM
    // Add bloated JS script + large SKILL.md to existing skill to trigger SKILL-SHARE (proseShare > 0.7) even though entryShareOfTotal < 0.1
    const shareSkillDir = path.join(svcRepo, ".agents", "skills", "self-diagnosis");
    fs.writeFileSync(path.join(shareSkillDir, "scripts", "huge-filler.mjs"), "// " + "x".repeat(500000));
    fs.writeFileSync(path.join(shareSkillDir, "SKILL.md"), "---\nname: self-diagnosis\ndescription: >-\n  Self diagnosis skill.\n---\n" + "line of markdown prose\n".repeat(2500));
    writeSvc(".agents/skills/fm-empty-block/SKILL.md", "---\nname: fm-empty-block\ndescription: >-\nlicense: MIT\n---\nBody.\n");
    writeSvc(".agents/skills/fm-empty-quotes/SKILL.md", "---\nname: fm-empty-quotes\ndescription: \"\"\n---\nBody.\n");
    writeSvc(".agents/skills/fm-eof-no-nl/SKILL.md", "---\nname: fm-eof-no-nl\ndescription: Valid at EOF\n---");
    const skillEdgeDiag = JSON.parse(spawnSync(process.execPath, [svcDiag, "--ledger", svcLedgerRel, "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" }).stdout);
    assert.ok(skillEdgeDiag.findings.some(f => f.id === "SKILL-SHARE-self-diagnosis"), "SD-SCRIPT-SHARE: proseShare > 0.7 && markdownBytes > 8192 must trigger SKILL-SHARE");
    assert.ok(skillEdgeDiag.findings.some(f => f.id === "SKILL-FM-fm-empty-block"), "SD-SCRIPT-FM-EDGE: description: >- before next key must fail");
    assert.ok(skillEdgeDiag.findings.some(f => f.id === "SKILL-FM-fm-empty-quotes"), "SD-SCRIPT-FM-EDGE: description: \"\" must fail");
    assert.ok(!skillEdgeDiag.findings.some(f => f.id === "SKILL-FM-fm-eof-no-nl"), "SD-SCRIPT-FM-EDGE: closing --- at EOF without newline must pass");

    // COORD-DIAG-001 & SD-SCRIPT-PROSE-FP: hyphenated ID + trailing comma and prose tokens (SELF-DIAGNOSIS, L1-L50, CLI-FLAGS) must not break --teardown
    const tdProseDir = path.join(svcRepo, "scratch/agy-squad/squad-skill_and_pr_review_audit/lead");
    fs.mkdirSync(tdProseDir, { recursive: true });
    writeSvc(
      "scratch/agy-squad/squad-skill_and_pr_review_audit/specialist-1/report.md",
      "- `P1-SYN-01`, `DOC-TOOLS-01`, SELF-DIAGNOSIS, L1-L50, CLI-FLAGS\n"
    );
    writeSvc(
      "scratch/agy-squad/squad-skill_and_pr_review_audit/lead/report.md",
      "Content Verdict: PASS\n- P1-SYN-01, DOC-TOOLS-01, reviewed SELF-DIAGNOSIS & L1-L50 & CLI-FLAGS\n"
    );
    const tdProseRec = {
      workspace: svcRepo,
      squadId: "skill_and_pr_review_audit",
      verdict: "PASS",
      requireIntegrityAudit: false,
      verifiedFiles: svcFiles,
      assignments: [{ conversationId: "p1", report: "scratch/agy-squad/squad-skill_and_pr_review_audit/specialist-1/report.md" }],
      handoffs: [{ sender: "p1", message: "READY scratch/agy-squad/squad-skill_and_pr_review_audit/specialist-1/report.md — Ok." }]
    };
    const tdProseBundled = bundleReports(svcRepo, tdProseRec);
    const tdProseLedger = buildTestLedger({ bundleSha: tdProseBundled.sha256, includeFindingRow: true }).replace(
      "| `P1-SYN-01` |",
      "| `DOC-TOOLS-01` | P2 | `DOC` | `Closed` | `target.txt#L1` | Hyphenated ID | Fixed |\n| `P1-SYN-01` |"
    );
    fs.writeFileSync(svcLedgerAbs, tdProseLedger);
    const tdProseSec = Math.floor(fs.statSync(path.join(svcRepo, tdProseBundled.path)).mtimeMs / 1000);
    fs.utimesSync(svcLedgerAbs, tdProseSec + 5, tdProseSec + 5);
    const proseTeardown = spawnSync(
      process.execPath,
      [svcDiag, "--teardown", "skill_and_pr_review_audit", "--accept", tdProseBundled.sha256, "--ledger", svcLedgerRel],
      { cwd: svcRepo, encoding: "utf8" }
    );
    assert.equal(proseTeardown.status, 0, `COORD-DIAG-001/SD-SCRIPT-PROSE-FP: false-positive hyphenated prose tokens broke teardown: ${proseTeardown.stderr}`);

    // SD-SCRIPT-LEDGER-SORT: semantic vX.Y.Z ledger beats pr5 ledger under equal mtimes (v0.1.3 > v0.1.2 > pr5)
    const tEq = new Date(Date.now() + 10000);
    for (const f of fs.readdirSync(path.join(svcRepo, "docs/reviews"))) {
      if (f.endsWith(".md")) {
        fs.utimesSync(path.join(svcRepo, "docs/reviews", f), tEq, tEq);
      }
    }
    writeSvc("docs/reviews/pr5-reconciled-review.md", buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: true }));
    writeSvc("docs/reviews/v0.1.2-self-diagnosis-review.md", buildTestLedger({ bundleSha: flatBundled.sha256, includeFindingRow: true }));
    fs.utimesSync(path.join(svcRepo, "docs/reviews/pr5-reconciled-review.md"), tEq, tEq);
    fs.utimesSync(path.join(svcRepo, "docs/reviews/v0.1.2-self-diagnosis-review.md"), tEq, tEq);
    const sortDiagV013 = JSON.parse(spawnSync(process.execPath, [svcDiag, "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" }).stdout);
    assert.equal(sortDiagV013.targetReviewLedger, "docs/reviews/v0.1.3-self-diagnosis-review.md", "SD-SCRIPT-LEDGER-SORT: v0.1.3 must outrank v0.1.2 and pr5 on equal mtimes");
    fs.rmSync(path.join(svcRepo, "docs/reviews/v0.1.3-self-diagnosis-review.md"), { force: true });
    const sortDiag = JSON.parse(spawnSync(process.execPath, [svcDiag, "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" }).stdout);
    assert.equal(sortDiag.targetReviewLedger, "docs/reviews/v0.1.2-self-diagnosis-review.md", "SD-SCRIPT-LEDGER-SORT: versioned release ledger must outrank pr5 on equal mtimes");

    // SD-SCRIPT-OVERLAP-DENOM: readOnly specialist scopeFiles excluded from overlapRatio denominator
    const roManifestPath = path.join(svcRepo, ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json");
    const roManifest = JSON.parse(fs.readFileSync(roManifestPath, "utf8"));
    const firstSqKey = Object.keys(roManifest.squads)[0];
    roManifest.squads[firstSqKey] = {
      lead: { role: "Lead", objective: "Synthesize", scopeFiles: ["target.txt"] },
      specialists: [
        { role: "W1", objective: "Write 1", scopeFiles: ["target.txt"] },
        { role: "W2", objective: "Write 2", scopeFiles: ["target.txt"] },
        { role: "RO", objective: "ReadOnly", readOnly: true, scopeFiles: ["README.md", "package.json", "docs/tools.md"] }
      ]
    };
    writeSvc(".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json", JSON.stringify(roManifest));
    const denomDiag = JSON.parse(spawnSync(process.execPath, [svcDiag, "--ledger", svcLedgerRel, "--skip-mcp-spawn"], { cwd: svcRepo, encoding: "utf8" }).stdout);
    const sqTopo = denomDiag.topology.find(t => t.squadId === firstSqKey);
    assert.equal(sqTopo.overlapRatio, 0.5, `SD-SCRIPT-OVERLAP-DENOM: expected 1 overlap / 2 writable scopeFiles = 0.5, got ${sqTopo.overlapRatio}`);
  } finally {
    fs.rmSync(svcRepo, { recursive: true, force: true });
  }

  // 6. Wave 2 Regressions: SD2-DOC-01, SD2-SCRIPT-02..06
  const w2DiagRepo = path.join(temporary, "w2-diag-repo");
  fs.mkdirSync(w2DiagRepo, { recursive: true });
  const w2Diag = copyIsolatedRepo(w2DiagRepo);
  try {
    const writeW2 = (rel, body) => {
      const abs = path.join(w2DiagRepo, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body, "utf8");
    };
    writeW2("target.txt", "wave2 diag\n");
    const w2Files = fingerprint(w2DiagRepo, ["target.txt"]);

    // SD2-SCRIPT-04: --mode and --workspace-isolation rejected outside --print-plan even when set to defaults ('swarm'/'inherit')
    const modeWithoutPrintPlan = spawnSync(process.execPath, [w2Diag, "--markdown", "--mode", "swarm", "--skip-mcp-spawn"], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.notEqual(modeWithoutPrintPlan.status, 0, "SD2-SCRIPT-04: --mode swarm without --print-plan must exit non-zero");
    assert.match(modeWithoutPrintPlan.stderr, /--print-plan/);
    const isoWithoutPrintPlan = spawnSync(process.execPath, [w2Diag, "--workspace-isolation", "inherit", "--skip-mcp-spawn"], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.notEqual(isoWithoutPrintPlan.status, 0, "SD2-SCRIPT-04: --workspace-isolation inherit without --print-plan must exit non-zero");

    // SD2-SCRIPT-06: --markdown Section 2 displays /swarm and precompiled template budgets; SKILL-BUDGET says warn threshold
    const w2LedgerRel = "docs/reviews/w2-clean.md";
    const w2LedgerAbs = path.join(w2DiagRepo, w2LedgerRel);
    writeW2(w2LedgerRel, buildTestLedger({ includeFindingRow: true }));
    const w2Md = spawnSync(process.execPath, [w2Diag, "--markdown", "--ledger", w2LedgerRel, "--skip-mcp-spawn"], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.equal(w2Md.status, 0, w2Md.stderr);
    assert.match(w2Md.stdout, /Precompiled Lead Template/i, "SD2-SCRIPT-06: --markdown must report precompiled lead template bytes");
    assert.match(w2Md.stdout, /\/swarm Specialist Template/i, "SD2-SCRIPT-06: --markdown must report /swarm specialist template bytes");
    assert.match(w2Md.stdout, /\/swarm Lead Template/i, "SD2-SCRIPT-06: --markdown must report /swarm lead template bytes");
    assert.match(w2Md.stdout, /\/swarm Auditor Template/i, "SD2-SCRIPT-06: --markdown must report /swarm auditor template bytes");

    const diagSrc = fs.readFileSync(w2Diag, "utf8");
    assert.match(diagSrc, /RUN-BUDGET-PRECOMPILED-LEAD/, "SD2-SCRIPT-06: precompiledLeadTemplateBytes budget check required");
    assert.match(diagSrc, /RUN-BUDGET-SWARM-AUDIT/, "SD2-SCRIPT-06: swarmAuditorTemplateBytes budget check required");
    assert.match(diagSrc, /exceeds progressive-disclosure warn threshold/, "SD2-SCRIPT-06: SKILL-BUDGET message must say warn threshold");

    // SD2-SCRIPT-02, SD2-SCRIPT-03, SD2-DOC-01: prose tokens, slash lookahead, bold heading records with *Status*, and audit-only teardown
    const w2S1 = reportPath("skill_and_pr_review_audit", 1);
    const w2Lead = reportPath("skill_and_pr_review_audit");
    writeW2(w2S1, [
      "- `DOC-TOOLS-01` / `DOC-TOOLS-02`: verified.",
      "- L1-L51, P0-P2, P1-P2, P1-P3, FAIL-CLOSED, PRE-FLIGHT, BUILT-IN, IN-FLIGHT, MID-COHORT, NO-BIAS"
    ].join("\n"));
    writeW2(w2Lead, [
      "Content Verdict: PASS",
      "- DOC-TOOLS-01 / DOC-TOOLS-02: verified prose slash.",
      "- L1-L51, P0-P2, P1-P2, P1-P3, FAIL-CLOSED, PRE-FLIGHT, BUILT-IN, IN-FLIGHT, MID-COHORT, NO-BIAS"
    ].join("\n"));
    const w2Rec = {
      workspace: w2DiagRepo,
      squadId: "skill_and_pr_review_audit",
      verdict: "PASS",
      requireIntegrityAudit: false,
      verifiedFiles: w2Files,
      assignments: [{ conversationId: "s1", report: w2S1 }],
      handoffs: [{ sender: "s1", message: `READY ${w2S1} — Ok.` }]
    };
    const w2Bundled = bundleReports(w2DiagRepo, w2Rec);
    // Test bold heading record #### **REC-BOLD-01** — Title | P2 | *Closed* AND open P2 audit-only teardown
    const w2AuditLedger = buildTestLedger({ bundleSha: w2Bundled.sha256, openBlocking: true })
      .replace(
        "| `P1-SYN-01` | P1 | `SVC` | `Open (Pre-Remediation)` | `target.txt#L1` | Synthetic P1 | Resolved |",
        [
          "| `DOC-TOOLS-01` | P2 | `DOC` | `Open (Pre-Remediation)` | `target.txt#L1` | Open audit finding | Pending |",
          "| `DOC-TOOLS-02` | P2 | `DOC` | `Closed` | `target.txt#L1` | Closed | Fixed |",
          "",
          "#### **REC-BOLD-01** — Bold pipe record | P2 | *Closed*"
        ].join("\n")
      );
    fs.writeFileSync(w2LedgerAbs, w2AuditLedger, "utf8");
    const w2MtimeSec = Math.floor(fs.statSync(path.join(w2DiagRepo, w2Bundled.path)).mtimeMs / 1000);
    fs.utimesSync(w2LedgerAbs, w2MtimeSec + 5, w2MtimeSec + 5);

    const w2OpenAudit = spawnSync(process.execPath, [w2Diag, "--ledger", w2LedgerRel, "--skip-mcp-spawn"], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.equal(w2OpenAudit.status, 1, "SD2-DOC-01: audit mode must still flag Open (Pre-Remediation) P2 blocker");
    assert.ok(JSON.parse(w2OpenAudit.stdout).findings.some(f => f.id === "DOC-LEDGER-OPEN-BLOCKERS"));

    const w2Td = spawnSync(process.execPath, [w2Diag, "--teardown", "skill_and_pr_review_audit", "--accept", w2Bundled.sha256, "--ledger", w2LedgerRel], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.equal(w2Td.status, 0, `SD2-DOC-01 & SD2-SCRIPT-02: audit-only teardown & prose tokens failed: ${w2Td.stderr}`);

    // SD2-SCRIPT-03: bold heading record conflict (**REC-BOLD-01** with *Closed* vs Open (Pre-Remediation) in Section 8/another table) is caught
    const boldConflictLedger = w2AuditLedger.replace(
      "#### **REC-BOLD-01** — Bold pipe record | P2 | *Closed*",
      "#### **REC-BOLD-01** — Bold pipe record | P2 | *Closed*\n\n| ID | Status |\n| --- | --- |\n| `REC-BOLD-01` | Open (Pre-Remediation) |"
    );
    writeW2("docs/reviews/w2-bold-conflict.md", boldConflictLedger);
    const boldConflictRun = spawnSync(process.execPath, [w2Diag, "--ledger", "docs/reviews/w2-bold-conflict.md", "--skip-mcp-spawn"], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.equal(boldConflictRun.status, 1, "SD2-SCRIPT-03: conflicting status against bold **REC-BOLD-01** *Closed* heading record must fail");
    assert.ok(JSON.parse(boldConflictRun.stdout).findings.some(f => f.id === "DOC-LEDGER-SCHEMA" && /REC-BOLD-01/.test(f.summary)));

    // SD2-SCRIPT-05: --print-dispatch all_specialists on malformed manifest exits 1 cleanly without stack trace
    writeW2(".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json", "{ malformed json");
    const badDispatchRun = spawnSync(process.execPath, [w2Diag, "--print-dispatch", "all_specialists"], { cwd: w2DiagRepo, encoding: "utf8" });
    assert.equal(badDispatchRun.status, 1);
    assert.doesNotMatch(badDispatchRun.stderr, /^\s+at\s+/m, "SD2-SCRIPT-05: --print-dispatch must not leak raw JS stack trace");
  } finally {
    fs.rmSync(w2DiagRepo, { recursive: true, force: true });
  }

  // 7. v0.1.3 Remediation Regressions: SD-SCRIPT-01..03, S2-DEP-01..02
  const v013Repo = path.join(temporary, "v013-diag-repo");
  fs.mkdirSync(v013Repo, { recursive: true });
  const v013Diag = copyIsolatedRepo(v013Repo);
  try {
    const writeV013 = (rel, body) => {
      const abs = path.join(v013Repo, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, body, "utf8");
    };
    const v013LedgerRel = "docs/reviews/v013-clean.md";
    writeV013(v013LedgerRel, buildTestLedger({ includeFindingRow: true }));

    // SD-SCRIPT-03: fenced ## 10. and fenced finding table inside ledger must NOT trigger errors; unfenced ## 10. and ## 100. MUST fail
    const fencedSec10Ledger = buildTestLedger({ includeFindingRow: true })
      .replace(
        "## 6. Verification Record",
        "## 6. Verification Record\n\n```markdown\n## 10. Quoted Example Heading\n```\n"
      )
      .replace(
        "## 5. Atomic Finding Records",
        "## 5. Atomic Finding Records\n\n```markdown\n| ID | Status |\n| --- | --- |\n| `FAKE-01` | Open (Pre-Remediation) |\n```\n"
      );
    writeV013("docs/reviews/v013-fenced-sec10.md", fencedSec10Ledger);
    const fencedSec10Run = spawnSync(process.execPath, [v013Diag, "--ledger", "docs/reviews/v013-fenced-sec10.md", "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(fencedSec10Run.status, 0, `SD-SCRIPT-03: fenced '## 10.' and fenced finding table must not fail schema: ${fencedSec10Run.stdout} ${fencedSec10Run.stderr}`);

    for (const badHeading of ["## 10. Ad-Hoc Wave", "## 100. Ad-Hoc Wave"]) {
      const realSecOver9Ledger = `${buildTestLedger({ includeFindingRow: true })}\n\n${badHeading}\n\nBad.\n`;
      writeV013("docs/reviews/v013-real-sec10.md", realSecOver9Ledger);
      const realSec10Run = spawnSync(process.execPath, [v013Diag, "--ledger", "docs/reviews/v013-real-sec10.md", "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
      assert.equal(realSec10Run.status, 1, `SD-SCRIPT-03: unfenced '${badHeading}' must fail schema`);
      assert.ok(JSON.parse(realSec10Run.stdout).findings.some(f => f.id === "DOC-LEDGER-SCHEMA" && /beyond Section 9/.test(f.summary)));
    }

    // SD-SCRIPT-03: fenced bash '# deprecated' comment must NOT suppress drift below it, AND active retired CLI commands inside fenced bash blocks MUST still be detected
    const fenceDriftRef = ".agents/skills/swarm-governance/references/v013-fence-drift.md";
    writeV013(fenceDriftRef, "```bash\n# deprecated example\necho ok\n```\n\nRun `subagent_brief` now.\n");
    const fenceDriftRun = spawnSync(process.execPath, [v013Diag, "--ledger", v013LedgerRel, "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(fenceDriftRun.status, 1, "SD-SCRIPT-03: bash '# deprecated' inside fence must not disable drift scanning");
    assert.ok(JSON.parse(fenceDriftRun.stdout).findings.some(f => f.id === "SKILL-DRIFT-swarm-governance" && /subagent_brief/.test(f.summary)));
    writeV013(fenceDriftRef, "## Quick Start\n\n```bash\nagy-squad run --manifest squad.json\n```\n");
    const fenceCmdDriftRun = spawnSync(process.execPath, [v013Diag, "--ledger", v013LedgerRel, "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(fenceCmdDriftRun.status, 1, "SD-SCRIPT-03: retired CLI command inside fenced bash block must still trigger SKILL-DRIFT");
    assert.ok(JSON.parse(fenceCmdDriftRun.stdout).findings.some(f => f.id === "SKILL-DRIFT-swarm-governance" && /agy-squad run/.test(f.summary)));
    fs.rmSync(path.join(v013Repo, fenceDriftRef), { force: true });

    // SD-SCRIPT-02: multi-file broken ref links emit unique IDs and count refBroken in brokenLinksCount
    const refBreakA = ".agents/skills/swarm-governance/references/v013-break-a.md";
    const refBreakB = ".agents/skills/swarm-governance/references/v013-break-b.md";
    writeV013(refBreakA, "See [missing A](./missing-a.md).\n");
    writeV013(refBreakB, "See [missing B](./missing-b.md).\n");
    const refBreakRun = spawnSync(process.execPath, [v013Diag, "--ledger", v013LedgerRel, "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(refBreakRun.status, 1);
    const refBreakJson = JSON.parse(refBreakRun.stdout);
    const refLinkFindings = refBreakJson.findings.filter(f => f.id.startsWith("SKILL-REFLINKS-swarm-governance"));
    assert.equal(refLinkFindings.length, 2, "SD-SCRIPT-02: expected 2 ref-link findings");
    assert.equal(new Set(refLinkFindings.map(f => f.id)).size, 2, "SD-SCRIPT-02: SKILL-REFLINKS IDs must be unique");
    const sgSkillStats = refBreakJson.skills.find(s => s.name === "swarm-governance");
    assert.ok(sgSkillStats.brokenLinksCount >= 2, `SD-SCRIPT-02: brokenLinksCount must include refBroken (got ${sgSkillStats.brokenLinksCount})`);
    fs.rmSync(path.join(v013Repo, refBreakA), { force: true });
    fs.rmSync(path.join(v013Repo, refBreakB), { force: true });

    // SD-SCRIPT-01 & SD-SCRIPT-02: writable overlap >25% is P2, readOnly overlap >25% is P3 Advisory, and missing scopeFiles emit unique IDs
    const v013ManifestPath = ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json";
    const origManifestText = fs.readFileSync(path.join(v013Repo, v013ManifestPath), "utf8");
    const baseManifest = JSON.parse(origManifestText);
    const sqKeys = Object.keys(baseManifest.squads);

    // Subcase A: readOnly overlap > 25% -> P3 Advisory (HEALTHY exit 0)
    const roOverlapManifest = structuredClone(baseManifest);
    roOverlapManifest.squads[sqKeys[0]] = {
      lead: { role: "Lead", readOnly: true, objective: "Lead", scopeFiles: ["README.md"] },
      specialists: [
        { role: "RO1", readOnly: true, objective: "Audit 1", scopeFiles: ["README.md"] },
        { role: "RO2", readOnly: true, objective: "Audit 2", scopeFiles: ["README.md"] }
      ]
    };
    writeV013(v013ManifestPath, JSON.stringify(roOverlapManifest));
    const roOverlapRun = spawnSync(process.execPath, [v013Diag, "--ledger", v013LedgerRel, "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(roOverlapRun.status, 0, `SD-SCRIPT-01: read-only overlap should be P3 Advisory (exit 0), got: ${roOverlapRun.stdout}`);
    const roOverlapJson = JSON.parse(roOverlapRun.stdout);
    const roFinding = roOverlapJson.findings.find(f => f.id === `ARCH-READ-OVERLAP-${sqKeys[0]}`);
    assert.ok(roFinding && roFinding.priority === "P3", "SD-SCRIPT-01: read-only overlap >25% must emit P3 Advisory");

    // Subcase B: writable overlap > 25% -> P2 blocking (exit 1) + unique RUN-LEADSCOPE / RUN-SCOPE IDs for multiple missing files
    const rwOverlapManifest = structuredClone(baseManifest);
    rwOverlapManifest.squads[sqKeys[0]] = {
      lead: { role: "Lead", objective: "Lead", scopeFiles: ["missing-lead-1.txt", "missing-lead-2.txt"] },
      specialists: [
        { role: "W1", objective: "Write 1", scopeFiles: ["README.md", "package.json", "missing-spec-1.txt"] },
        { role: "W2", objective: "Write 2", scopeFiles: ["README.md", "package.json", "missing-spec-2.txt"] }
      ]
    };
    writeV013(v013ManifestPath, JSON.stringify(rwOverlapManifest));
    const rwOverlapRun = spawnSync(process.execPath, [v013Diag, "--ledger", v013LedgerRel, "--skip-mcp-spawn"], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(rwOverlapRun.status, 1, "SD-SCRIPT-01: writable overlap >25% must be P2 blocking");
    const rwOverlapJson = JSON.parse(rwOverlapRun.stdout);
    const rwFinding = rwOverlapJson.findings.find(f => f.id === `ARCH-OVERLAP-${sqKeys[0]}`);
    assert.ok(rwFinding && rwFinding.priority === "P2", "SD-SCRIPT-01: writable overlap >25% must emit P2");
    const allIds = rwOverlapJson.findings.map(f => f.id);
    assert.equal(new Set(allIds).size, allIds.length, `SD-SCRIPT-02: all finding IDs must be unique, got: ${JSON.stringify(allIds)}`);
    assert.equal(rwOverlapJson.findings.filter(f => f.id.startsWith(`RUN-LEADSCOPE-${sqKeys[0]}-`)).length, 2);
    assert.equal(rwOverlapJson.findings.filter(f => f.id.startsWith(`RUN-SCOPE-${sqKeys[0]}-`)).length, 2);
    writeV013(v013ManifestPath, origManifestText);

    // S2-DEP-01 & S2-DEP-02: release-preflight.mjs passes on baseline and fails if 'docs' or 'CHANGELOG.md' is dropped from package.json files
    for (const extra of ["LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "benchmarks"]) {
      fs.cpSync(path.join(repoRoot, extra), path.join(v013Repo, extra), { recursive: true });
    }
    const preflightScript = path.join(v013Repo, "scripts/release-preflight.mjs");
    const preflightBaseline = spawnSync(process.execPath, [preflightScript], { cwd: v013Repo, encoding: "utf8" });
    assert.equal(preflightBaseline.status, 0, `Baseline release-preflight failed: ${preflightBaseline.stderr}`);
    const origPkg = fs.readFileSync(path.join(v013Repo, "package.json"), "utf8");
    const pkgNoDocs = JSON.parse(origPkg);
    pkgNoDocs.files = pkgNoDocs.files.filter(f => f !== "docs");
    writeV013("package.json", JSON.stringify(pkgNoDocs, null, 2) + "\n");
    const preflightNoDocs = spawnSync(process.execPath, [preflightScript], { cwd: v013Repo, encoding: "utf8" });
    assert.notEqual(preflightNoDocs.status, 0, "S2-DEP-01: release-preflight must fail when 'docs' is dropped from package.json files");
    assert.match(preflightNoDocs.stderr, /docs\/tools\.md/);

    const pkgNoChangelog = JSON.parse(origPkg);
    pkgNoChangelog.files = pkgNoChangelog.files.filter(f => f !== "CHANGELOG.md");
    writeV013("package.json", JSON.stringify(pkgNoChangelog, null, 2) + "\n");
    const preflightNoChangelog = spawnSync(process.execPath, [preflightScript], { cwd: v013Repo, encoding: "utf8" });
    assert.notEqual(preflightNoChangelog.status, 0, "S2-DEP-02: release-preflight must fail when 'CHANGELOG.md' is dropped from package.json files");
    assert.match(preflightNoChangelog.stderr, /CHANGELOG\.md/);
    writeV013("package.json", origPkg);
  } finally {
    fs.rmSync(v013Repo, { recursive: true, force: true });
  }

  console.log("✓ CLI planner/governance, retired run rejection, --print-dispatch, --teardown, and isolated self-diagnosis checks");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
