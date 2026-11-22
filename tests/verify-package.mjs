#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { text } from "node:stream/consumers";

const REQUIRED = [
  "package.json",
  "plugin.json",
  "assets/logo.svg",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "install.sh",
  "install.ps1",
  "bin/agy-squad.mjs",
  "scripts/install-register.mjs",
  "mcp/index.js",
  "mcp/dispatch.mjs",
  "mcp/briefs.mjs",
  "mcp/planner.mjs",
  "mcp/handoffs.mjs",
  "mcp/verdicts.mjs",
  ".agents/skills/day-one-review/SKILL.md",
  ".agents/skills/day-one-review/references/day-one-protocol.md",
  ".agents/skills/full-review/SKILL.md",
  ".agents/skills/full-review/references/evidence-intake.md",
  ".agents/skills/full-review/references/report-template.md",
  ".agents/skills/full-review/references/review-roles.md",
  ".agents/skills/pr-review/SKILL.md",
  ".agents/skills/pr-review/references/pr-review-standard.md",
  ".agents/skills/swarm-governance/SKILL.md",
  ".agents/skills/swarm-governance/references/bundling-and-wire-format.md",
  ".agents/skills/swarm-governance/references/ecosystem-and-modifiers.md",
  ".agents/skills/swarm-governance/references/intake-and-planning.md",
  ".agents/skills/swarm-governance/references/large-swarms.md",
  "docs/benchmarks.md",
  "docs/concepts.md",
  "docs/core-workflows.md",
  "docs/getting-started.md",
  "docs/index.md",
  "docs/roles-and-workflows.md",
  "docs/skills/day-one-review.md",
  "docs/skills/full-review.md",
  "docs/skills/pr-review.md",
  "docs/skills/self-diagnosis.md",
  "docs/skills/swarm-governance.md",
  "docs/stopping-agents.md",
  "docs/tools.md",
  "docs/assets/architecture-overview.svg",
  "docs/assets/manifest-and-modes.svg",
  "docs/assets/role-and-verdict-gate.svg",
  "docs/assets/skill-role-workflows.svg",
  "docs/assets/swarm-lifecycle.svg",
  "docs/assets/swarm-vs-agy-squad-roles.svg"
];

const RETIRED_DENYLIST = [
  "bin/terminal.py",
  "mcp/run-state.mjs",
  "mcp/subagent-brief.mjs"
];

function validate(packages) {
  assert.ok(Array.isArray(packages) && packages.length === 1 && packages[0] && typeof packages[0] === "object",
    "Expected one npm pack JSON package record");
  const entries = packages[0].files;
  assert.ok(Array.isArray(entries) && entries.length > 0,
    "Expected a nonempty npm pack file list");
  const names = entries.map(entry => entry?.path);
  assert.ok(names.every(name => typeof name === "string" && name.length > 0),
    "Every npm pack file must have a nonempty path");
  assert.equal(new Set(names).size, names.length, "Duplicate package paths");

  const unsafe = names.filter(name =>
    name.startsWith("/") || name.includes("\\") ||
    name.split("/").some(part => !part || part === "." || part === "..")
  );
  assert.deepEqual(unsafe, [], `Unsafe package paths: ${unsafe.join(", ")}`);

  const hasBadSubpath = (name) => {
    const lower = name.toLowerCase();
    const segments = lower.split("/");
    return (
      lower.endsWith(".tgz") ||
      lower.endsWith(".log") ||
      lower.endsWith(".bak") ||
      lower.endsWith(".tmp") ||
      segments.some(seg => seg === ".env" || seg.startsWith(".env.") || seg === ".ds_store") ||
      /(?:^|\/)scratch(?:\/|$)/.test(lower) ||
      lower === "docs/plans" ||
      lower.startsWith("docs/plans/") ||
      lower === "docs/reviews" ||
      lower.startsWith("docs/reviews/") ||
      lower === "scripts/release-preflight.mjs" ||
      lower === "scripts/diagnose.mjs" ||
      lower === ".agents/skills/self-diagnosis" ||
      lower.startsWith(".agents/skills/self-diagnosis/")
    );
  };
  const allowed = names.filter(name =>
    !hasBadSubpath(name) &&
    (name === "package.json" || name === "plugin.json" ||
      name === "README.md" || name === "CHANGELOG.md" ||
      name === "install.sh" || name === "install.ps1" ||
      name === "LICENSE" || name === "LICENSE.md" || name === "LICENSE.txt" ||
      name.startsWith("assets/") || name.startsWith("bin/") || name.startsWith("mcp/") ||
      name.startsWith("scripts/") ||
      name.startsWith(".agents/skills/") || name.startsWith("docs/"))
  );
  const forbidden = names.filter(name => !allowed.includes(name) || RETIRED_DENYLIST.includes(name));
  assert.deepEqual(forbidden, [],
    `Forbidden npm package contents: ${forbidden.join(", ")}`);

  const present = new Set(names);
  for (const file of REQUIRED) {
    assert.ok(present.has(file), `Missing required npm package file: ${file}`);
  }
  return names.length;
}

function selfTest() {
  const fixture = extra => [{ files: [...REQUIRED, ...extra].map(path => ({ path })) }];
  assert.equal(validate(fixture(["docs/extra-guide.md"])), REQUIRED.length + 1);
  const badCases = [
    "tests/leaked.mjs",
    "benchmarks/private.json",
    "scratch/trace.log",
    "docs/scratch/leak.md",
    "docs/plans",
    "docs/plans/LEDGER.md",
    "docs/plans/pr3-option-b-fixes.md",
    "docs/reviews",
    "docs/reviews/pr5-reconciled-review.md",
    "docs/package.tgz",
    "mcp/debug.log",
    "mcp/.env",
    "mcp/.ENV",
    "mcp/.env/secret",
    "scripts/.env.local",
    "docs/.DS_Store",
    "docs/.ds_store",
    "scripts/foo.bak",
    "scripts/FOO.BAK",
    "bin/bar.tmp",
    ".agents/teamwork/session.json",
    "other/private.txt",
    "../outside.txt",
    "bin/terminal.py",
    "mcp/run-state.mjs",
    "mcp/subagent-brief.mjs",
    "scripts/release-preflight.mjs",
    "scripts/diagnose.mjs",
    ".agents/skills/self-diagnosis",
    ".agents/skills/self-diagnosis/SKILL.md",
    ".agents/skills/self-diagnosis/scripts/diagnose.mjs"
  ];
  for (const bad of badCases) {
    assert.throws(() => validate(fixture([bad])),
      /Forbidden npm package contents|Unsafe package paths/,
      `Expected synthetic package with ${bad} to be rejected`);
  }
  assert.throws(() => validate([{ files: REQUIRED
    .filter(path => path !== "mcp/index.js").map(path => ({ path })) }]),
    /Missing required npm package file: mcp\/index.js/);
  console.log(`Package verifier self-test passed (positive + ${badCases.length + 1} negatives)`);
}

if (process.argv[2] === "--self-test") {
  selfTest();
} else {
  const usage = "Usage: node tests/verify-package.mjs [<npm-pack-json> | - | --self-test]";
  assert.ok(process.argv.length === 2 || process.argv.length === 3, usage);
  const useStdin = process.argv.length === 2 || process.argv[2] === "-";
  if (process.argv.length === 2 && process.stdin.isTTY) {
    assert.fail(usage);
  }
  const raw = useStdin
    ? await text(process.stdin)
    : fs.readFileSync(process.argv[2], "utf8");
  const packages = JSON.parse(raw);
  console.log(`Package boundary verified (${validate(packages)} files)`);
}
