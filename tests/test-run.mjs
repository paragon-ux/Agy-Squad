import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint } from "../mcp/handoffs.mjs";

const temporary = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-cli-diag-")));
const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function copyIsolatedRepo(targetDir) {
  for (const rel of ["assets", "bin", "mcp", "scripts", ".agents", "docs", "tests", "package.json", "plugin.json", "README.md", "CHANGELOG.md", "install.sh", "install.ps1", "zensical.toml"]) {
    fs.cpSync(path.join(repoRoot, rel), path.join(targetDir, rel), { recursive: true });
  }
  return path.join(targetDir, ".agents/skills/self-diagnosis/scripts/diagnose.mjs");
}

try {
  // 1. CLI --help, retired `run` rejection, `plan` task execution, and `dispatch`
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

  // 2. A1 read-only diagnose.mjs [--json] [--help] contract, removed flags, drift, link, SVG, and checkout-guard checks (isolated in os.tmpdir)
  const isoRepo = path.join(temporary, "iso-repo");
  const isoDiag = copyIsolatedRepo(isoRepo);
  const writeIso = (rel, body) => {
    const abs = path.join(isoRepo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body, "utf8");
  };

  const diagHelp = spawnSync(process.execPath, [isoDiag, "--help"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(diagHelp.status, 0, diagHelp.stderr);
  assert.match(diagHelp.stdout, /Usage:.*--json.*-h\|--help/);
  assert.match(diagHelp.stdout, /compatibility alias/i);
  const diagShortHelp = spawnSync(process.execPath, [isoDiag, "-h"], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(diagShortHelp.status, 0, diagShortHelp.stderr);
  assert.equal(diagShortHelp.stdout, diagHelp.stdout);

  for (const args of [[], ["--json"]]) {
    const diagRun = spawnSync(process.execPath, [isoDiag, ...args], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(diagRun.status, 0, diagRun.stderr || diagRun.stdout);
    const diagParsed = JSON.parse(diagRun.stdout);
    assert.deepEqual(Object.keys(diagParsed), ["status", "skills", "promptBudgets", "findings"]);
    assert.equal(diagParsed.status, "HEALTHY");
    assert.deepEqual(diagParsed.findings, []);
    assert.deepEqual(
      diagParsed.skills.map(s => s.name),
      ["pr-review", "full-review", "day-one-review", "swarm-governance", "self-diagnosis", "platform-fit"]
    );
    for (const s of diagParsed.skills) {
      assert.equal(s.brokenLinksCount, 0, `${s.name} must have 0 broken links`);
    }
    for (const key of [
      "specialistTemplateBytes",
      "leadTemplateBytes",
      "precompiledLeadTemplateBytes",
      "swarmSpecialistTemplateBytes",
      "swarmLeadTemplateBytes",
      "swarmAuditorTemplateBytes",
      "mcpToolsListResponseBytes"
    ]) {
      assert.ok(typeof diagParsed.promptBudgets[key] === "number" && diagParsed.promptBudgets[key] > 0, `Expected positive promptBudgets.${key}`);
    }
    assert.equal(fs.existsSync(path.join(isoRepo, "scratch")), false, "Read-only diagnose.mjs must never write to scratch/");
  }

  // Removed legacy diagnose.mjs flags must fail closed cleanly with Usage and no stack trace
  for (const removedArgs of [
    ["--print-dispatch", "all_l1"],
    ["--print-plan"],
    ["--teardown", "all"],
    ["--ledger", "docs/reviews/x.md"],
    ["--markdown"],
    ["--skip-mcp-spawn"],
    ["unexpected-positional"]
  ]) {
    const res = spawnSync(process.execPath, [isoDiag, ...removedArgs], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(res.status, 1, `Removed diagnose.mjs flag '${removedArgs.join(" ")}' must fail closed`);
    assert.match(res.stderr, /Usage:/);
    assert.doesNotMatch(res.stderr, /^\s+at\s+/m, `Removed flag '${removedArgs.join(" ")}' must not leak raw stack trace`);
  }

  // SKILL-PR5-04: Skill drift check catches retired Phase 1/2 symbols in references/*.md without false positives on historical notices
  const driftRefFile = path.join(isoRepo, ".agents/skills/swarm-governance/references/drift-probe.md");
  try {
    fs.writeFileSync(driftRefFile, "Run `bin/terminal.py`, `adversarial_l1`, `node mcp/handoffs.mjs`, and wait for `.mcp-ready`.\n");
    const driftBad = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(driftBad.status, 1, driftBad.stderr);
    const driftBadJson = JSON.parse(driftBad.stdout);
    assert.equal(driftBadJson.status, "ISSUES");
    const driftFinding = driftBadJson.findings.find(f => f.id === "SKILL-DRIFT-swarm-governance-drift-probe");
    assert.ok(driftFinding, "Expected SKILL-DRIFT-swarm-governance-drift-probe for active retired Phase 1/2 symbol reference");
    assert.match(driftFinding.summary, /terminal\.py/);
    assert.match(driftFinding.summary, /adversarial_l1/);
    assert.match(driftFinding.summary, /mcp\/handoffs\.mjs/);
    assert.match(driftFinding.summary, /\.mcp-ready/);

    fs.writeFileSync(driftRefFile, "Historical note: `bin/terminal.py`, `adversarial_l1`, `node mcp/handoffs.mjs`, and `.mcp-ready` are retired.\n");
    const driftOk = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(driftOk.status, 0, driftOk.stderr);
    assert.equal(JSON.parse(driftOk.stdout).status, "HEALTHY");

    // Fenced bash '# deprecated' comment must not suppress drift below it
    fs.writeFileSync(driftRefFile, "```bash\n# deprecated example\necho ok\n```\n\nRun `subagent_brief` now.\n");
    const fenceDriftRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(fenceDriftRun.status, 1, "Bash '# deprecated' inside fence must not disable drift scanning");
    assert.ok(JSON.parse(fenceDriftRun.stdout).findings.some(f => f.id === "SKILL-DRIFT-swarm-governance-drift-probe" && /subagent_brief/.test(f.summary)));
  } finally {
    fs.rmSync(driftRefFile, { force: true });
  }

  // SQ-SCRIPT-001: diagnose.mjs flags retired v1.x symbols (query_transcript, etc.) in active docs/
  const driftDocPath = path.join(isoRepo, "docs/concepts.md");
  const savedConcepts = fs.readFileSync(driftDocPath, "utf8");
  try {
    fs.writeFileSync(driftDocPath, savedConcepts + "\nCall query_transcript summaryOnly=true now.\n");
    const driftRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(driftRun.status, 1);
    assert.ok(JSON.parse(driftRun.stdout).findings.some(f => f.id === "DOC-MCP-DRIFT-docs-concepts" && /query_transcript/.test(f.summary)));
  } finally {
    fs.writeFileSync(driftDocPath, savedConcepts);
  }

  // Batch A SD-SCRIPT-001..005 regressions
  const batchRefProbe = path.join(isoRepo, ".agents/skills/swarm-governance/references/batch-a-probe.md");
  const prSkillFile = path.join(isoRepo, ".agents/skills/pr-review/SKILL.md");
  const prRefFile = path.join(isoRepo, ".agents/skills/pr-review/references/pr-review-standard.md");
  const docsToolsPath = path.join(isoRepo, "docs/tools.md");
  const docsSkillPath = path.join(isoRepo, "docs/skills/swarm-governance.md");
  const planOrphanSvg = path.join(isoRepo, "docs/assets/test-plan-only-orphan.svg");
  const planOrphanMention = path.join(isoRepo, "docs/plans/test-plan-only-mention.md");
  const savedPrSkillForBatchA = fs.readFileSync(prSkillFile, "utf8");
  const savedPrRefForBatchA = fs.readFileSync(prRefFile, "utf8");
  const savedToolsForBatchA = fs.readFileSync(docsToolsPath, "utf8");
  const savedDocsSkillForBatchA = fs.readFileSync(docsSkillPath, "utf8");
  try {
    // SD-SCRIPT-001: em-dash CLI flag (—prune) inside inline backticks AND inside fenced bash block fails diagnose.mjs
    for (const [label, body] of [
      ["inline backticks", "Run `agy-squad verify bundle.json —prune` now.\n"],
      ["fenced bash block", "```bash\nagy-squad verify bundle.json —prune\n```\n"]
    ]) {
      fs.writeFileSync(batchRefProbe, body, "utf8");
      const emdashRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
      assert.equal(emdashRun.status, 1, `SD-SCRIPT-001: em-dash CLI flag in ${label} must fail diagnose.mjs`);
      assert.ok(
        JSON.parse(emdashRun.stdout).findings.some(f => f.id === "SKILL-EMDASH-swarm-governance-batch-a-probe"),
        `SD-SCRIPT-001: expected SKILL-EMDASH-swarm-governance-batch-a-probe for ${label}`
      );
    }

    // SD-SCRIPT-002: retired commands inside fenced bash block fail diagnose.mjs while '# deprecated' bash comment isolation stays green
    fs.writeFileSync(
      batchRefProbe,
      "```bash\nagy-squad run \"audit\"\nnode mcp/handoffs.mjs\n```\n",
      "utf8"
    );
    const fencedRetiredRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(fencedRetiredRun.status, 1, "SD-SCRIPT-002: retired commands in fenced bash block must fail diagnose.mjs");
    const fencedRetiredFinding = JSON.parse(fencedRetiredRun.stdout).findings.find(
      f => f.id === "SKILL-DRIFT-swarm-governance-batch-a-probe"
    );
    assert.ok(fencedRetiredFinding, "SD-SCRIPT-002: expected SKILL-DRIFT-swarm-governance-batch-a-probe");
    assert.match(fencedRetiredFinding.summary, /agy-squad run/);
    assert.match(fencedRetiredFinding.summary, /node mcp\/handoffs\.mjs/);

    fs.writeFileSync(batchRefProbe, "```bash\n# deprecated bash comment\necho ok\n```\n\nActive guidance stays clean.\n", "utf8");
    const commentIsoRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(commentIsoRun.status, 0, `SD-SCRIPT-002: bash '# deprecated' comment without retired symbols must remain green: ${commentIsoRun.stdout}`);
    assert.equal(JSON.parse(commentIsoRun.stdout).status, "HEALTHY");
    fs.rmSync(batchRefProbe, { force: true });

    // SD-SCRIPT-003: multi-file failures across SKILL.md + references/*.md and two docs/*.md files emit distinct unique finding IDs including SKILL-REFLINKS-*
    fs.writeFileSync(prSkillFile, `${savedPrSkillForBatchA}\nSee [missing-skill](./references/missing-skill-link.md).\nCall \`subagent_brief\`.\n`);
    fs.writeFileSync(prRefFile, `${savedPrRefForBatchA}\nSee [missing-ref](./missing-ref-link.md).\nCall \`subagent_brief\`.\n`);
    fs.writeFileSync(driftDocPath, `${savedConcepts}\nCall query_transcript now.\n`);
    fs.writeFileSync(docsToolsPath, `${savedToolsForBatchA}\nCall read_transcript now.\n`);
    const multiFailRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(multiFailRun.status, 1, "SD-SCRIPT-003: multi-file failures must fail diagnose.mjs");
    const multiFindings = JSON.parse(multiFailRun.stdout).findings;
    const multiIds = multiFindings.map(f => f.id);
    assert.equal(
      new Set(multiIds).size,
      multiIds.length,
      `SD-SCRIPT-003: finding IDs must be unique across multi-file failures, got: ${JSON.stringify(multiIds)}`
    );
    for (const expectedId of [
      "SKILL-LINKS-pr-review",
      "SKILL-REFLINKS-pr-review-pr-review-standard",
      "SKILL-DRIFT-pr-review",
      "SKILL-DRIFT-pr-review-pr-review-standard",
      "DOC-MCP-DRIFT-docs-concepts",
      "DOC-MCP-DRIFT-docs-tools"
    ]) {
      assert.ok(multiIds.includes(expectedId), `SD-SCRIPT-003: expected finding ID '${expectedId}' in ${JSON.stringify(multiIds)}`);
    }
    fs.writeFileSync(prSkillFile, savedPrSkillForBatchA);
    fs.writeFileSync(prRefFile, savedPrRefForBatchA);
    fs.writeFileSync(driftDocPath, savedConcepts);
    fs.writeFileSync(docsToolsPath, savedToolsForBatchA);

    // SD-SCRIPT-005: retired symbol in docs/skills/*.md triggers DOC-MCP-DRIFT-*, and orphan SVG cited only in docs/plans/ still triggers DOC-SVG-ORPHAN
    fs.writeFileSync(docsSkillPath, `${savedDocsSkillForBatchA}\nRun \`agy-squad run\` directly.\n`);
    writeIso("docs/assets/test-plan-only-orphan.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n");
    writeIso("docs/plans/test-plan-only-mention.md", "Plan referencing test-plan-only-orphan.svg must not clear DOC-SVG-ORPHAN.\n");
    const sd005Run = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    assert.equal(sd005Run.status, 1, "SD-SCRIPT-005: retired symbol in docs/skills/*.md and plan-only SVG must fail diagnose.mjs");
    const sd005Ids = JSON.parse(sd005Run.stdout).findings.map(f => f.id);
    assert.ok(
      sd005Ids.includes("DOC-MCP-DRIFT-docs-skills-swarm-governance"),
      `SD-SCRIPT-005: expected DOC-MCP-DRIFT-docs-skills-swarm-governance in ${JSON.stringify(sd005Ids)}`
    );
    assert.ok(
      sd005Ids.includes("DOC-SVG-ORPHAN-test-plan-only-orphan"),
      `SD-SCRIPT-005: expected DOC-SVG-ORPHAN-test-plan-only-orphan in ${JSON.stringify(sd005Ids)}`
    );
  } finally {
    fs.rmSync(batchRefProbe, { force: true });
    fs.writeFileSync(prSkillFile, savedPrSkillForBatchA);
    fs.writeFileSync(prRefFile, savedPrRefForBatchA);
    fs.writeFileSync(driftDocPath, savedConcepts);
    fs.writeFileSync(docsToolsPath, savedToolsForBatchA);
    fs.writeFileSync(docsSkillPath, savedDocsSkillForBatchA);
    fs.rmSync(planOrphanSvg, { force: true });
    fs.rmSync(planOrphanMention, { force: true });
  }

  // Orphan SVG detection ignores docs/reviews/ mentions; frontmatter edge cases trigger SKILL-FM
  const orphanSvgPath = path.join(isoRepo, "docs/assets/test-orphan-diagram.svg");
  const reviewMentionPath = path.join(isoRepo, "docs/reviews/test-orphan-mention.md");
  const prSkillPath = path.join(isoRepo, ".agents/skills/pr-review/SKILL.md");
  const savedPrSkill = fs.readFileSync(prSkillPath, "utf8");
  try {
    writeIso("docs/assets/test-orphan-diagram.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n");
    writeIso("docs/reviews/test-orphan-mention.md", "Mentioning test-orphan-diagram.svg in docs/reviews/ must not clear DOC-SVG-ORPHAN.\n");
    const svgOut = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout);
    assert.ok(svgOut.findings.some(f => f.id === "DOC-SVG-ORPHAN-test-orphan-diagram"), "Expected DOC-SVG-ORPHAN even if mentioned in docs/reviews/");

    fs.writeFileSync(prSkillPath, "---\nname: pr-review\ndescription: \"\"\n---\nBody.\n");
    const emptyDescOut = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout);
    assert.ok(emptyDescOut.findings.some(f => f.id === "SKILL-FM-pr-review"), "Empty frontmatter description must trigger SKILL-FM-pr-review");

    fs.writeFileSync(prSkillPath, "---\nname: pr-review\ndescription: Valid at EOF\n---");
    const eofFmOut = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout);
    assert.ok(!eofFmOut.findings.some(f => f.id === "SKILL-FM-pr-review"), "Closing --- at EOF without newline must pass SKILL-FM");
  } finally {
    fs.writeFileSync(prSkillPath, savedPrSkill);
    fs.rmSync(orphanSvgPath, { force: true });
    fs.rmSync(reviewMentionPath, { force: true });
  }

  // UX-SQ-004 & UX-SQ-R2-005: diagnose.mjs rejects cross-root links escaping .agents/skills/ and malformed hosted docs URLs
  for (const [label, badLink] of [
    ["cross-root ../../../docs/", "../../../docs/tools.md"],
    ["non-docs escape ../../../README.md", "../../../README.md"],
    ["malformed hosted .. URL", "https://paragon-ux.github.io/Agy-Squad/../README.md"],
    ["malformed hosted backslash URL", "https://paragon-ux.github.io/Agy-Squad/tools\\bad"]
  ]) {
    fs.writeFileSync(prSkillPath, `${savedPrSkill}\nSee [bad link](${badLink}).\n`);
    const badLinkRun = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" });
    fs.writeFileSync(prSkillPath, savedPrSkill);
    assert.equal(badLinkRun.status, 1, `UX-SQ-004/UX-SQ-R2-005: ${label} in SKILL.md must fail diagnose.mjs`);
    assert.ok(JSON.parse(badLinkRun.stdout).findings.some(f => f.id === "SKILL-LINKS-pr-review"), `Expected SKILL-LINKS-pr-review for ${label}`);
  }

  // UX-SQ-008: diagnose.mjs exits cleanly (code 1, friendly message, no stack trace) when run outside an Agy-Squad checkout
  const unrelatedEmpty = path.join(temporary, "unrelated-empty");
  const unrelatedApp = path.join(temporary, "my-react-app");
  fs.mkdirSync(unrelatedEmpty, { recursive: true });
  fs.mkdirSync(unrelatedApp, { recursive: true });
  fs.writeFileSync(path.join(unrelatedApp, "package.json"), JSON.stringify({ name: "my-react-app", version: "1.0.0" }) + "\n");
  for (const [label, dir] of [["empty dir", unrelatedEmpty], ["unrelated repo", unrelatedApp]]) {
    const outsideRun = spawnSync(process.execPath, [isoDiag], { cwd: dir, encoding: "utf8" });
    assert.equal(outsideRun.status, 1, `UX-SQ-008: diagnose.mjs must exit 1 from ${label}`);
    assert.match(outsideRun.stderr, /maintainer check.*Agy-Squad checkout/i);
    assert.doesNotMatch(outsideRun.stderr, /at\s+.*diagnose\.mjs:/, `UX-SQ-008: ${label} must not print raw stack trace`);
  }
  const outsideHelp = spawnSync(process.execPath, [isoDiag, "--help"], { cwd: unrelatedApp, encoding: "utf8" });
  assert.equal(outsideHelp.status, 0, "UX-SQ-008: diagnose.mjs --help must still exit 0 from any cwd");

  // SCRIPT-003: Spaced AGY_SQUAD_SCRATCH_ROOT handled cleanly by diagnose.mjs and CLI bundle; traversal rejected
  const spacedEnv = { ...process.env, AGY_SQUAD_SCRATCH_ROOT: "scratch/custom spaced" };
  const spacedDiag = spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, env: spacedEnv, encoding: "utf8" });
  assert.equal(spacedDiag.status, 0, spacedDiag.stderr);
  const badScratchDiag = spawnSync(process.execPath, [isoDiag], {
    cwd: isoRepo,
    env: { ...process.env, AGY_SQUAD_SCRATCH_ROOT: "../outside" },
    encoding: "utf8"
  });
  assert.equal(badScratchDiag.status, 1);

  writeIso("target.txt", "spaced scratch bundle\n");
  const isoFiles = fingerprint(isoRepo, ["target.txt"]);
  const spS1 = "scratch/custom spaced/agy-squad/squad-spaced_cli/specialist-1/report.md";
  const spLead = "scratch/custom spaced/agy-squad/squad-spaced_cli/lead/report.md";
  writeIso(spS1, "# Spaced CLI Spec\nVerified target.txt.\n");
  writeIso(spLead, "Content Verdict: PASS\nVerified spaced root.\n");
  const spRecPath = "scratch/custom spaced/spaced-record.json";
  writeIso(spRecPath, JSON.stringify({
    workspace: isoRepo,
    squadId: "spaced_cli",
    verdict: "PASS",
    requireIntegrityAudit: false,
    verifiedFiles: isoFiles,
    assignments: [{ conversationId: "sp-1", report: spS1 }],
    handoffs: [{ sender: "sp-1", message: `READY ${spS1} — Verified spaced scratch root.` }]
  }));
  const spBundle = spawnSync(process.execPath, [cli, "bundle", spRecPath], { cwd: isoRepo, env: spacedEnv, encoding: "utf8" });
  assert.equal(spBundle.status, 0, spBundle.stderr);
  assert.equal(JSON.parse(spBundle.stdout).path, "scratch/custom spaced/agy-squad/squad-spaced_cli/lead/report.sources.json");
  fs.rmSync(path.join(isoRepo, "scratch"), { recursive: true, force: true });

  // L46: install.ps1 resolves node dynamically across Windows PowerShell 5.1 & PowerShell 7+
  const installPs1 = fs.readFileSync(path.join(repoRoot, "install.ps1"), "utf8");
  assert.match(installPs1, /Get-Command node/);
  assert.match(installPs1, /\$PSCommandPath/);
  assert.match(installPs1, /\$LASTEXITCODE/);

  // S2-DEP-01 & S2-DEP-02: release-preflight.mjs passes on baseline and fails if 'docs' or 'CHANGELOG.md' is dropped from package.json files
  for (const extra of ["LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "benchmarks"]) {
    fs.cpSync(path.join(repoRoot, extra), path.join(isoRepo, extra), { recursive: true });
  }
  const preflightScript = path.join(isoRepo, "scripts/release-preflight.mjs");
  const preflightBaseline = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  assert.equal(preflightBaseline.status, 0, `Baseline release-preflight failed: ${preflightBaseline.stderr}`);
  const origPkg = fs.readFileSync(path.join(isoRepo, "package.json"), "utf8");
  const pkgNoDocs = JSON.parse(origPkg);
  pkgNoDocs.files = pkgNoDocs.files.filter(f => f !== "docs");
  writeIso("package.json", JSON.stringify(pkgNoDocs, null, 2) + "\n");
  const preflightNoDocs = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  assert.notEqual(preflightNoDocs.status, 0, "S2-DEP-01: release-preflight must fail when 'docs' is dropped from package.json files");
  assert.match(preflightNoDocs.stderr, /docs\/tools\.md/);

  const pkgNoChangelog = JSON.parse(origPkg);
  pkgNoChangelog.files = pkgNoChangelog.files.filter(f => f !== "CHANGELOG.md");
  writeIso("package.json", JSON.stringify(pkgNoChangelog, null, 2) + "\n");
  const preflightNoChangelog = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  assert.notEqual(preflightNoChangelog.status, 0, "S2-DEP-02: release-preflight must fail when 'CHANGELOG.md' is dropped from package.json files");
  assert.match(preflightNoChangelog.stderr, /CHANGELOG\.md/);
  const pkgNoPlatformFitExclusion = JSON.parse(origPkg);
  pkgNoPlatformFitExclusion.files = pkgNoPlatformFitExclusion.files.filter(f => !f.includes("platform-fit"));
  writeIso("package.json", JSON.stringify(pkgNoPlatformFitExclusion, null, 2) + "\n");
  const preflightLeakPlatformFit = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  assert.notEqual(preflightLeakPlatformFit.status, 0, "platform-fit: release-preflight must fail if platform-fit exclusion is dropped from package.json files");
  assert.match(preflightLeakPlatformFit.stderr, /\.agents\/skills\/platform-fit/);
  writeIso("package.json", origPkg);

  // UX-SQ-010 & UX-SQ-013: grouped top-level --help (<= 100 chars/line) and focused per-subcommand --help
  const topHelp = spawnSync(process.execPath, [cli, "--help"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(topHelp.status, 0, topHelp.stderr);
  assert.match(topHelp.stdout, /Lifecycle Commands:/);
  assert.match(topHelp.stdout, /Planning Commands:/);
  assert.match(topHelp.stdout, /Verification & Bundling Commands:/);
  assert.match(topHelp.stdout, /--version,\s*-v/);
  assert.match(topHelp.stdout, /\bfinalize\b/);
  const longHelpLines = topHelp.stdout.split(/\r?\n/).filter(line => line.length > 100);
  assert.deepEqual(longHelpLines, [], `UX-SQ-010: top-level --help lines must be <= 100 chars, got: ${JSON.stringify(longHelpLines)}`);

  for (const sub of [
    "setup", "install", "status", "uninstall", "restore-backups",
    "plan", "dispatch", "collect", "bundle-init", "fingerprint",
    "inspect", "digest", "bundle", "verify", "finalize", "prune", "verdict"
  ]) {
    const subHelp = spawnSync(process.execPath, [cli, sub, "--help"], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(subHelp.status, 0, `UX-SQ-013: '${sub} --help' failed: ${subHelp.stderr}`);
    const expectedUsageName = sub === "install" ? "setup" : sub;
    assert.match(subHelp.stdout, new RegExp(`Usage: agy-squad ${expectedUsageName}\\b`), `UX-SQ-013: '${sub} --help' must print focused Usage`);
    assert.match(subHelp.stdout, /Examples:/, `UX-SQ-013: '${sub} --help' must include Examples`);
    assert.doesNotMatch(subHelp.stdout, /Lifecycle Commands:/, `UX-SQ-013: '${sub} --help' must not dump full top-level usage`);
  }
  const conflictSubHelp = spawnSync(process.execPath, [cli, "plan", "--help", "--topology", "flat"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(conflictSubHelp.status, 1, "UX-SQ-013: conflicting flags with --help must remain rejected");
  assert.match(conflictSubHelp.stderr, /Conflicting flags/);

  // UX-SQ-R2-001 & UX-SQ-R2-004: bundle-init --help --digest example includes --handoffs/--handoff, and bundled short/inline help conflicts fail closed
  const bundleInitHelp = spawnSync(process.execPath, [cli, "bundle-init", "--help"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(bundleInitHelp.status, 0, bundleInitHelp.stderr);
  const digestHelpLine = bundleInitHelp.stdout.split(/\r?\n/).find(line => /agy-squad bundle-init\b/.test(line) && /--digest\b/.test(line));
  assert.ok(digestHelpLine && /--handoffs?\b/.test(digestHelpLine), `UX-SQ-R2-001: bundle-init --help --digest example must include --handoffs/--handoff, got: ${bundleInitHelp.stdout}`);

  for (const badHelpArgs of [
    ["setup", "-ch"],
    ["plan", "-xh"],
    ["plan", "--help=false"]
  ]) {
    const badHelpRes = spawnSync(process.execPath, [cli, ...badHelpArgs], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(badHelpRes.status, 1, `UX-SQ-R2-004: '${badHelpArgs.join(" ")}' must fail closed instead of exiting 0`);
    assert.match(badHelpRes.stderr, /Conflicting flags/);
  }

  // UX-SQ-R2-003 & UX-SQ-R2-006: hosted docs align with opt-in docs/reviews/ and CHANGELOG [0.1.3] documents finalize without internal ledger codes
  const prSkillDocText = fs.readFileSync(path.join(repoRoot, "docs/skills/pr-review.md"), "utf8");
  const rolesDocText = fs.readFileSync(path.join(repoRoot, "docs/roles-and-workflows.md"), "utf8");
  const conceptsDocText = fs.readFileSync(path.join(repoRoot, "docs/concepts.md"), "utf8");
  assert.match(prSkillDocText, /in chat or an Antigravity artifact.*`docs\/reviews\/<review-slug>\.md`/i);
  for (const skillPage of ["pr-review", "full-review", "day-one-review", "swarm-governance", "self-diagnosis"]) {
    assert.ok(rolesDocText.includes(`skills/${skillPage}.md`), `docs/roles-and-workflows.md must link to skills/${skillPage}.md`);
  }
  assert.match(conceptsDocText, /delivered in chat, an Antigravity artifact, or `docs\/reviews\/<slug>\.md` when requested or already adopted/i);
  const changelogText = fs.readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  const v013Section = changelogText.slice(changelogText.indexOf("## [0.1.3]"), changelogText.indexOf("## [0.1.2]"));
  assert.match(v013Section, /\bagy-squad finalize\b/);
  assert.doesNotMatch(v013Section, /docs\/plans\/LEDGER\.md|\bL51\b|\bL56\b/);

  // UX-SQ-001, UX-SQ-002, UX-SQ-003, UX-SQ-004, UX-SQ-009, UX-SQ-011: portable skill & plugin.json hygiene checks
  const walkMd = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkMd(full));
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
    }
    return out;
  };
  const allSkillMdFiles = walkMd(path.join(repoRoot, ".agents/skills"));
  for (const mdFile of allSkillMdFiles) {
    const rel = path.relative(repoRoot, mdFile).replace(/\\/g, "/");
    const text = fs.readFileSync(mdFile, "utf8");
    assert.doesNotMatch(text, /\/home\/paragon-ux/i, `UX-SQ-003: hardcoded author path in ${rel}`);
    assert.doesNotMatch(text, /\.\.\/\.\.\/\.\.\/docs\//, `UX-SQ-004: broken relative ../../../docs/ link in ${rel}`);
    if (!rel.startsWith(".agents/skills/self-diagnosis/") && !rel.startsWith(".agents/skills/platform-fit/")) {
      assert.doesNotMatch(text, /node bin\/agy-squad\.mjs/, `UX-SQ-003: checkout-only 'node bin/agy-squad.mjs' in portable skill ${rel}`);
    }
  }
  const prSkillText = fs.readFileSync(path.join(repoRoot, ".agents/skills/pr-review/SKILL.md"), "utf8");
  const fullSkillText = fs.readFileSync(path.join(repoRoot, ".agents/skills/full-review/SKILL.md"), "utf8");
  const reportTplText = fs.readFileSync(path.join(repoRoot, ".agents/skills/full-review/references/report-template.md"), "utf8");
  const swarmSkillText = fs.readFileSync(path.join(repoRoot, ".agents/skills/swarm-governance/SKILL.md"), "utf8");
  const selfDiagSkillText = fs.readFileSync(path.join(repoRoot, ".agents/skills/self-diagnosis/SKILL.md"), "utf8");
  assert.doesNotMatch(prSkillText, /branch review in Agy-Squad/i, "UX-SQ-001: pr-review must target the active repository");
  assert.doesNotMatch(fullSkillText, /recommendation on Agy-Squad/i, "UX-SQ-001: full-review must target the active repository");
  assert.match(reportTplText, /\| Repository \| `<owner\/repo>` \|/, "UX-SQ-001: report-template.md must use <owner/repo>");
  assert.doesNotMatch(swarmSkillText, /\b(?:antislop|permissioned-github)\b/i, "UX-SQ-011: swarm-governance/SKILL.md must not front-load third-party skills");
  const swarmDocText = fs.readFileSync(path.join(repoRoot, "docs/skills/swarm-governance.md"), "utf8");
  for (const [label, txt] of [["swarm-governance/SKILL.md", swarmSkillText], ["docs/skills/swarm-governance.md", swarmDocText]]) {
    assert.match(txt, /Synthesize all verified `lead\/report\.md` outputs into one complete user-facing deliverable/i, `${label} must require deliverable-first synthesis in Stage 3`);
    assert.match(txt, /--no-integrity.*--allow-unaudited/i, `${label} must document lightweight research opt-out`);
  }
  assert.match(selfDiagSkillText, /Agy-Squad maintainers only: run inside an Agy-Squad source checkout/i, "UX-SQ-008: self-diagnosis must gate for maintainers");

  // Repo-only platform-fit meta-skill contract checks
  const platformFitSkill = fs.readFileSync(path.join(repoRoot, ".agents/skills/platform-fit/SKILL.md"), "utf8");
  const platformFitPreflight = fs.readFileSync(path.join(repoRoot, ".agents/skills/platform-fit/references/preflight-snapshot.md"), "utf8");
  const platformFitRubric = fs.readFileSync(path.join(repoRoot, ".agents/skills/platform-fit/references/specialist-rubric.md"), "utf8");
  const platformFitScorecard = fs.readFileSync(path.join(repoRoot, ".agents/skills/platform-fit/references/scorecard-template.md"), "utf8");
  assert.match(platformFitSkill, /Agy-Squad maintainers only: run inside an Agy-Squad source checkout/i);
  assert.match(platformFitSkill, /invoke_subagent.*TypeName:\s*"self"/s);
  assert.match(platformFitSkill, /no \/swarm/i);
  assert.match(platformFitSkill, /\[agy-transcript-access: self-only\]/);
  assert.match(platformFitSkill, /scratch\/platform-fit\//);
  assert.match(platformFitSkill, /Empirical Leverage Gate/);
  assert.match(platformFitSkill, /Invariant Parity Gate/);
  assert.match(platformFitPreflight, /https:\/\/antigravity\.google\/llms\.txt/);
  assert.match(platformFitPreflight, /00-platform-baseline\.md/);
  assert.match(platformFitPreflight, /01-telemetry-extract\.md/);
  assert.match(platformFitPreflight, /agy-context transcript health/);
  for (const verdict of [
    "Differentiated (Retain)",
    "Align to Native Primitive",
    "Consolidate / Automate Friction",
    "Harden Determinism",
    "Human Product Tradeoff"
  ]) {
    assert.ok(platformFitSkill.includes(verdict), `platform-fit/SKILL.md must include verdict '${verdict}'`);
    assert.ok(platformFitRubric.includes(verdict), `platform-fit specialist-rubric.md must include verdict '${verdict}'`);
  }
  assert.match(platformFitRubric, /Never invent or emit a `Delete`/);
  assert.doesNotMatch(platformFitRubric, /^\|\s*\*\*`Delete/m, "platform-fit rubric must never define a Delete verdict row");
  assert.match(platformFitRubric, /route automatically to \*\*`Human Product Tradeoff`\*\*/);
  assert.match(platformFitScorecard, /20-platform-fit-scorecard\.md/);
  assert.match(platformFitScorecard, /Handoff to `\/self-diagnosis`/);
  for (const [label, txt] of [
    ["platform-fit/SKILL.md", platformFitSkill],
    ["platform-fit/references/preflight-snapshot.md", platformFitPreflight],
    ["platform-fit/references/specialist-rubric.md", platformFitRubric],
    ["platform-fit/references/scorecard-template.md", platformFitScorecard]
  ]) {
    assert.doesNotMatch(txt, /[\u2013\u2014]/, `${label} must not contain prose em/en dashes`);
  }

  const pluginMeta = JSON.parse(fs.readFileSync(path.join(repoRoot, "plugin.json"), "utf8"));
  assert.doesNotMatch(pluginMeta.description, /Pointer-Over-Wire/i, "UX-SQ-009: plugin.json description must be plain English");
  assert.ok(pluginMeta.suggestedPrompts.every(p => !/integrity_auditor/i.test(p)), "UX-SQ-009: suggestedPrompts must be Day-1 runnable");

  // v0.2.1: day-one-review 4-tier verdicts, upfront cadence intake, P0-P3 auto-fix vs Section 8 residuals, hook anti-anchoring, CPU serialization & CodeQL SEC checks
  const dayOneSkillText = fs.readFileSync(path.join(repoRoot, ".agents/skills/day-one-review/SKILL.md"), "utf8");
  const dayOneProtoText = fs.readFileSync(path.join(repoRoot, ".agents/skills/day-one-review/references/day-one-protocol.md"), "utf8");
  const dayOneDocText = fs.readFileSync(path.join(repoRoot, "docs/skills/day-one-review.md"), "utf8");
  const stdText = fs.readFileSync(path.join(repoRoot, ".agents/skills/pr-review/references/pr-review-standard.md"), "utf8");
  for (const [label, txt] of [
    ["day-one-review/SKILL.md", dayOneSkillText],
    ["day-one-protocol.md", dayOneProtoText],
    ["docs/skills/day-one-review.md", dayOneDocText]
  ]) {
    assert.doesNotMatch(txt, /SHIP WITH QUICK FIXES/, `v0.2.1: legacy verdict label must be removed from ${label}`);
    for (const verdict of ["SHIP NOW", "SHIP WITH MINOR POLISH", "FIX BEFORE RELEASE", "HOLD BEFORE PUBLIC RELEASE"]) {
      assert.ok(txt.includes(verdict), `v0.2.1: ${label} must include 4-tier verdict '${verdict}'`);
    }
    assert.match(txt, /\[agy-transcript-access: self-only\]/, `v0.2.1: ${label} must mandate hook-enforced self-only anti-anchoring`);
    assert.match(txt, /skipLibCheck:\s*false/, `v0.2.1: ${label} must mandate strict consumer typecheck`);
    assert.match(txt, /Section 8/, `v0.2.1: ${label} must separate Section 8 residuals from auto-fixed P0-P3`);
    assert.match(txt, /timeout 5/, `v0.2.1: ${label} must bound ReDoS probes with timeout 5`);
    assert.match(txt, /ReDoS/i, `v0.2.1: ${label} must include CodeQL-class ReDoS check`);
    assert.match(txt, /r3/, `v0.2.1: ${label} must include 2-round escalation stop-rule for r3`);
    assert.match(txt, /1-line rows/, `v0.2.1: ${label} must compact previously Closed P1/P2 items to 1-line rows in r2+`);
    assert.doesNotMatch(txt, /[\u2013\u2014]/, `v0.2.1: ${label} must not contain prose em/en dashes`);
  }
  assert.match(dayOneProtoText, /hermetic test scripts/i, "v0.2.1: day-one-protocol.md must note hermetic .system_generated consumer checks");
  assert.match(dayOneProtoText, /live symlinked plugin\/hook/i, "v0.2.1: day-one-protocol.md must serialize live symlinked plugin/hook edits");
  assert.match(stdText, /ReDoS/i, "v0.2.1: 4.11 SEC in pr-review-standard.md must include ReDoS");
  assert.match(stdText, /permissions:/, "v0.2.1: 4.11 SEC in pr-review-standard.md must include CI workflow permissions");

  // Day-1 r1 regressions: R1-DOC-001, R1-DOC-002, R1-SEC-003, R1-SEC-005
  const contribText = fs.readFileSync(path.join(repoRoot, "CONTRIBUTING.md"), "utf8");
  assert.doesNotMatch(contribText, /diagnose\.mjs\s+--markdown/, "R1-DOC-001: CONTRIBUTING.md must not reference removed --markdown flag");
  assert.match(contribText, /diagnose\.mjs\s+--json/, "R1-DOC-001: CONTRIBUTING.md must reference diagnose.mjs --json");
  assert.match(contribText, /<= 1200 B.*<= 1800 B/, "R1-DOC-001: CONTRIBUTING.md must match enforced specialist/lead byte budgets");
  const benchReadme = fs.readFileSync(path.join(repoRoot, "benchmarks/teamwork-vs-squad/README.md"), "utf8");
  const liveSection = benchReadme.slice(benchReadme.indexOf("## Run a new live experiment"));
  assert.doesNotMatch(liveSection, /check_context_health/, "R1-DOC-002: live benchmark instructions must not reference retired check_context_health");

  const { checkRelativeLinks, extractMarkdownLinks, getHeadingSlugs, hasValidSvgEnvelope, stripMarkdownLinkSyntax } = await import(
    "../.agents/skills/self-diagnosis/scripts/diagnose.mjs"
  );
  const tDiag = performance.now();
  assert.deepEqual(extractMarkdownLinks("[a](b".repeat(20_000)), []);
  assert.deepEqual(extractMarkdownLinks("[a](b ".repeat(20_000) + ")"), []);
  assert.equal(hasValidSvgEnvelope("<svg>".repeat(20_000)), false);
  assert.equal(hasValidSvgEnvelope("<svg ".repeat(20_000) + "</svg>"), false);
  assert.equal(hasValidSvgEnvelope('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>\n'), true);
  // Day-1 r2 regressions: R2-SEC-003 (linear getHeadingSlugs) & R2-SCRIPT-001 (same-file #fragment formatting)
  assert.equal(stripMarkdownLinkSyntax("Heading [a](https://example.com) and [b](./x.md)"), "Heading a and b");
  const slugCache = new Map([["/virtual-redos.md", "# " + "[a](b".repeat(40_000) + "\n## Valid Heading\n"]]);
  const slugs = getHeadingSlugs("/virtual-redos.md", slugCache);
  assert.equal(slugs.has("valid-heading"), true);
  const diagMs = performance.now() - tDiag;
  assert.ok(diagMs < 500, `R1-SEC-003 / R2-SEC-003: diagnose link/SVG/heading checks took ${diagMs.toFixed(1)} ms (>= 500 ms)`);
  const virtualSelfFile = path.join(repoRoot, ".agents/skills/pr-review/virtual-r2-check.md");
  const selfTextCache = new Map([[virtualSelfFile, "# Top\nSee [missing](#foo).\n"]]);
  assert.deepEqual(
    checkRelativeLinks(virtualSelfFile, selfTextCache.get(virtualSelfFile), selfTextCache, new Map()),
    ["#foo"],
    "R2-SCRIPT-001: broken same-file fragment link must report '#foo' without duplicating '#foo#foo'"
  );
  // PR15-SCRIPT-002: heading slugs are scoped per call so updated virtual markdown is never shadowed by a stale global cache
  const updatedSelfCache = new Map([[virtualSelfFile, "# Top\n## Foo\nSee [ok](#foo).\n"]]);
  assert.deepEqual(
    checkRelativeLinks(virtualSelfFile, updatedSelfCache.get(virtualSelfFile), updatedSelfCache, new Map()),
    [],
    "PR15-SCRIPT-002: updated markdown for same file path must reflect newly added #foo heading"
  );
  assert.equal(getHeadingSlugs(virtualSelfFile, updatedSelfCache).has("foo"), true);
  assert.equal(getHeadingSlugs(virtualSelfFile, selfTextCache).has("foo"), false);

  const { matchesPackageEntry } = await import("../scripts/release-preflight.mjs");
  assert.equal(matchesPackageEntry("docs/skills/pr-review.md", "docs/**/*.md"), true);
  assert.equal(matchesPackageEntry("docs/index.md", "docs/**/*.md"), true);
  assert.equal(matchesPackageEntry("mcp/handoffs.mjs", "mcp/*.mjs"), true);
  assert.equal(matchesPackageEntry("mcp/sub/handoffs.mjs", "mcp/*.mjs"), false);
  assert.equal(matchesPackageEntry("docs/plans/LEDGER.md", "docs/plans/**"), true);
  // Batch B SCRIPT-005: '?' single non-slash wildcard + plugin.json logo coverage + SD-SCRIPT-007 YAML block scalar indicators + TEST-003 unwired test warning
  assert.equal(matchesPackageEntry("mcp/a.mjs", "mcp/?.mjs"), true);
  assert.equal(matchesPackageEntry("mcp/ab.mjs", "mcp/?.mjs"), false);
  assert.equal(matchesPackageEntry("mcp//.mjs", "mcp/?.mjs"), false);

  const origPlugin = fs.readFileSync(path.join(isoRepo, "plugin.json"), "utf8");
  const badLogoPlugin = JSON.parse(origPlugin);
  writeIso("unpacked-logo.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n");
  badLogoPlugin.logo = "unpacked-logo.svg";
  writeIso("plugin.json", JSON.stringify(badLogoPlugin, null, 2) + "\n");
  const preflightBadLogo = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  assert.notEqual(preflightBadLogo.status, 0, "SCRIPT-005: plugin.json logo excluded from package.json files must fail preflight");
  assert.match(preflightBadLogo.stderr, /plugin\.json logo: unpacked-logo\.svg/);
  badLogoPlugin.logo = "assets\\logo.svg";
  writeIso("plugin.json", JSON.stringify(badLogoPlugin, null, 2) + "\n");
  const preflightBackslashLogo = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  assert.notEqual(preflightBackslashLogo.status, 0, "Backslash plugin.json logo must fail preflight on all OSes");
  assert.match(preflightBackslashLogo.stderr, /plugin\.json logo must use POSIX/);
  writeIso("plugin.json", origPlugin);
  fs.rmSync(path.join(isoRepo, "unpacked-logo.svg"), { force: true });

  const unwiredProbe = path.join(isoRepo, "tests/test-unwired-probe.mjs");
  fs.writeFileSync(unwiredProbe, "// probe\n", "utf8");
  const preflightUnwired = spawnSync(process.execPath, [preflightScript], { cwd: isoRepo, encoding: "utf8" });
  fs.rmSync(unwiredProbe, { force: true });
  assert.equal(preflightUnwired.status, 0, preflightUnwired.stderr);
  assert.match(preflightUnwired.stderr, /WARN: Test file tests\/test-unwired-probe\.mjs is not wired/);

  for (const scalarHeader of [">2", ">-2", ">2-", "|+2", "|2+"]) {
    fs.writeFileSync(prSkillPath, `---\nname: pr-review\ndescription: ${scalarHeader}\n  Indented scalar body.\n---\nBody.\n`);
    const scalarOut = JSON.parse(spawnSync(process.execPath, [isoDiag], { cwd: isoRepo, encoding: "utf8" }).stdout);
    assert.ok(!scalarOut.findings.some(f => f.id === "SKILL-FM-pr-review"), `SD-SCRIPT-007: '${scalarHeader}' must pass SKILL-FM`);
  }
  fs.writeFileSync(prSkillPath, savedPrSkill);

  const tGlob = performance.now();
  assert.equal(matchesPackageEntry("a/".repeat(25) + "y", "**/".repeat(15) + "x"), false);
  assert.equal(matchesPackageEntry("a/".repeat(40) + "y", "**/a/".repeat(15) + "x"), false);
  const globMs = performance.now() - tGlob;
  assert.ok(globMs < 100, `R1-SEC-005: release-preflight glob match took ${globMs.toFixed(1)} ms (>= 100 ms)`);

  console.log("✓ CLI planner/governance, retired run rejection, read-only diagnose.mjs, preflight, and skill/doc contract checks");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
