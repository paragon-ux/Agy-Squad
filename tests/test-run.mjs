import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-cli-diag-")));
const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const diagnoseCli = path.join(repoRoot, ".agents/skills/self-diagnosis/scripts/diagnose.mjs");

try {
  // 1. CLI --help, retired `run` rejection, and `plan` task execution
  const help = spawnSync(process.execPath, [cli, "--help"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /agy-squad plan/);
  assert.doesNotMatch(help.stdout, /terminal\.py/);

  const retiredRun = spawnSync(process.execPath, [cli, "run", "task"], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(retiredRun.status, 0);
  assert.match(retiredRun.stderr, /retired in Phase 2/);

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

  // 2. diagnose.mjs --help, flag validation, and HEALTHY execution (without touching tracked repo mtimes)
  const diagHelp = spawnSync(process.execPath, [diagnoseCli, "--help"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(diagHelp.status, 0, diagHelp.stderr);
  assert.match(diagHelp.stdout, /Usage:/);

  const testScratchRel = `scratch-test-${process.pid}`;
  const diagEnv = { ...process.env, AGY_SQUAD_SCRATCH_ROOT: testScratchRel };

  const diagRun = spawnSync(process.execPath, [diagnoseCli], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
  assert.equal(diagRun.status, 0, diagRun.stderr);
  const diagParsed = JSON.parse(diagRun.stdout);
  assert.equal(diagParsed.status, "HEALTHY");
  assert.ok(diagParsed.promptBudgets.specialistTemplateBytes > 0);
  assert.ok(diagParsed.promptBudgets.leadTemplateBytes > 0);
  assert.equal(typeof diagParsed.timings.squadPlannerMs, "number");
  assert.equal(fs.existsSync(path.join(repoRoot, testScratchRel)), false);

  const diagMd = spawnSync(process.execPath, [diagnoseCli, "--markdown"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
  assert.equal(diagMd.status, 0, diagMd.stderr);
  assert.match(diagMd.stdout, /# Agy-Squad Self-Diagnosis & Optimization Report/);
  assert.match(diagMd.stdout, /HEALTHY/);

  const badFlags = spawnSync(process.execPath, [diagnoseCli, "--markdown", "--teardown"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
  assert.equal(badFlags.status, 1);
  assert.match(badFlags.stderr, /mutually exclusive/);
  const badShortVal = spawnSync(process.execPath, [diagnoseCli, "--print-dispatch", "all_l1", "--parent-id", "-h"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
  assert.equal(badShortVal.status, 1);
  assert.match(badShortVal.stderr, /valid conversationId/);
  const badAcceptAll = spawnSync(process.execPath, [diagnoseCli, "--teardown", "all", "--accept", "0".repeat(64)], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
  assert.equal(badAcceptAll.status, 1);
  assert.match(badAcceptAll.stderr, /single squadId/);
  const badLedgerDispatch = spawnSync(process.execPath, [diagnoseCli, "--print-dispatch", "all_l1", "--ledger", "docs/reviews/x.md"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
  assert.equal(badLedgerDispatch.status, 1);
  assert.match(badLedgerDispatch.stderr, /not valid with '--print-dispatch'/);

  // Mid-cohort --allow-active-cohort check using isolated temporary scratch root
  fs.mkdirSync(path.join(repoRoot, testScratchRel, "agy-squad/squad-skill_and_pr_review_audit"), { recursive: true });
  try {
    const allowCohortRun = spawnSync(process.execPath, [diagnoseCli, "--allow-active-cohort"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(allowCohortRun.status, 0, allowCohortRun.stderr);
    assert.equal(JSON.parse(allowCohortRun.stdout).status, "HEALTHY");
  } finally {
    fs.rmSync(path.join(repoRoot, testScratchRel), { recursive: true, force: true });
  }

  // 3. TEST-P2-01: Test newest-ledger precedence in an isolated temp copy (never mutate tracked repo mtimes)
  const isoRepo = path.join(temporary, "iso-repo");
  for (const rel of ["bin", "mcp", ".agents", "docs", "tests", "package.json", "README.md"]) {
    fs.cpSync(path.join(repoRoot, rel), path.join(isoRepo, rel), { recursive: true });
  }
  const isoDiag = path.join(isoRepo, ".agents/skills/self-diagnosis/scripts/diagnose.mjs");
  const r1Iso = path.join(isoRepo, "docs/reviews/rebuild-wsl-dispatch-review.md");
  const r2Iso = path.join(isoRepo, "docs/reviews/rebuild-wsl-dispatch-review-r2.md");
  const baseSec = Math.floor(Date.now() / 1000) + 5;
  fs.utimesSync(r2Iso, baseSec, baseSec);
  fs.utimesSync(r1Iso, baseSec + 2, baseSec + 2);
  // Remove any newer pr4 ledger in isoCopy so rebuild-wsl-dispatch-review* precedence is isolated cleanly
  for (const name of fs.readdirSync(path.join(isoRepo, "docs/reviews"))) {
    if (!name.startsWith("rebuild-wsl-dispatch-review")) {
      fs.rmSync(path.join(isoRepo, "docs/reviews", name));
    }
  }
  const isoDiagRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(isoDiagRun.status, 0, isoDiagRun.stderr);
  assert.equal(JSON.parse(isoDiagRun.stdout).targetReviewLedger, "docs/reviews/rebuild-wsl-dispatch-review-r2.md");

  console.log("✓ CLI planner/governance, retired run rejection, and isolated self-diagnosis checks");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
