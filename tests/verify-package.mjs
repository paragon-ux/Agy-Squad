#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { text } from "node:stream/consumers";

const REQUIRED = [
  "package.json",
  "README.md",
  "bin/agy-squad.mjs",
  "mcp/index.js",
  "mcp/dispatch.mjs",
  "mcp/briefs.mjs",
  "mcp/planner.mjs",
  "mcp/handoffs.mjs",
  "mcp/verdicts.mjs",
  ".agents/skills/full-review/SKILL.md",
  ".agents/skills/pr-review/SKILL.md",
  ".agents/skills/pr-review/references/pr-review-standard.md",
  ".agents/skills/self-diagnosis/SKILL.md",
  ".agents/skills/swarm-governance/SKILL.md",
  ".agents/skills/self-diagnosis/scripts/diagnose.mjs",
  "docs/roles-and-workflows.md"
];

function validate(packages) {
  assert.ok(Array.isArray(packages) && packages.length === 1,
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

  const allowed = names.filter(name =>
    name === "package.json" || name === "README.md" ||
    name === "LICENSE" || name === "LICENSE.md" || name === "LICENSE.txt" ||
    name.startsWith("bin/") || name.startsWith("mcp/") ||
    name.startsWith(".agents/skills/") || name.startsWith("docs/")
  );
  const forbidden = names.filter(name => !allowed.includes(name));
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
  assert.equal(validate(fixture(["docs/index.md"])), REQUIRED.length + 1);
  for (const bad of [
    "tests/leaked.mjs",
    "benchmarks/private.json",
    "scratch/trace.log",
    ".agents/teamwork/session.json",
    "other/private.txt",
    "../outside.txt"
  ]) {
    assert.throws(() => validate(fixture([bad])),
      /Forbidden npm package contents|Unsafe package paths/,
      `Expected synthetic package with ${bad} to be rejected`);
  }
  assert.throws(() => validate([{ files: REQUIRED
    .filter(path => path !== "mcp/index.js").map(path => ({ path })) }]),
    /Missing required npm package file: mcp\/index.js/);
  console.log("Package verifier self-test passed (positive + 7 negatives)");
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
