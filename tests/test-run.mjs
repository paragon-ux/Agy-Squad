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

  // Fresh clone / equal-mtime checkout: prN-* ledgers must beat legacy cross-family -r2 ledgers
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
    assert.match(JSON.parse(freshRun.stdout).targetReviewLedger, /^docs\/reviews\/pr5-/);
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
    const packRes = spawnSync("npm", ["pack", "--pack-destination", packDir], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(packRes.status, 0, packRes.stderr);
    const tgzName = packRes.stdout.trim().split(/\r?\n/).pop();
    const untarRes = spawnSync("tar", ["-xzf", path.join(packDir, tgzName), "-C", unpackDir], { encoding: "utf8" });
    assert.equal(untarRes.status, 0, untarRes.stderr);
    const pkgRoot = path.join(unpackDir, "package");
    const pkgDiagRes = spawnSync(
      process.execPath,
      [".agents/skills/self-diagnosis/scripts/diagnose.mjs"],
      { cwd: pkgRoot, encoding: "utf8" }
    );
    assert.equal(pkgDiagRes.status, 0, pkgDiagRes.stderr);
    const pkgDiagJson = JSON.parse(pkgDiagRes.stdout);
    assert.equal(pkgDiagJson.targetReviewLedger, "docs/reviews/pr5-reconciled-review.md");
    assert.ok(pkgDiagJson.findings.some((f) => f.id === "DEP-PACKAGED-CHECKOUT-SCOPE" && f.priority === "P3"));
    assert.equal(pkgDiagJson.status, "HEALTHY");
  } finally {
    fs.rmSync(svcRepo, { recursive: true, force: true });
  }

  console.log("✓ CLI planner/governance, retired run rejection, --print-dispatch, --teardown, and isolated self-diagnosis checks");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
