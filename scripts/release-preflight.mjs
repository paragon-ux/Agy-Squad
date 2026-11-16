#!/usr/bin/env node
/**
 * Non-destructive release metadata/package preflight for Agy-Squad.
 * Run from the repository root: node scripts/release-preflight.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function readText(relativePath) {
  const target = path.join(root, relativePath);
  try {
    return fs.readFileSync(target, "utf8");
  } catch {
    errors.push(`Required file is missing or unreadable: ${relativePath}`);
    return "";
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

let pkg;
const pkgText = readText("package.json");
if (pkgText) {
  try {
    pkg = JSON.parse(pkgText);
  } catch (error) {
    errors.push(`package.json is not valid JSON: ${error.message}`);
  }
}

if (pkg) {
  if (pkg.name !== "agy-squad") {
    errors.push(`Expected package name "agy-squad"; found ${JSON.stringify(pkg.name)}.`);
  }
  if (pkg.private === true) {
    errors.push('package.json has "private": true; remove it for public npm publishing.');
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(pkg.version ?? "")) {
    errors.push(`package.json version is not a valid semver release version: ${JSON.stringify(pkg.version)}.`);
  }

  const pluginText = readText("plugin.json");
  if (pluginText) {
    try {
      const pluginManifest = JSON.parse(pluginText);
      if (pluginManifest.name !== pkg.name) {
        errors.push(`plugin.json name ${JSON.stringify(pluginManifest.name)} does not match package.json name ${JSON.stringify(pkg.name)}.`);
      }
      if (pluginManifest.version !== pkg.version) {
        errors.push(`plugin.json version ${JSON.stringify(pluginManifest.version)} does not match package.json version ${JSON.stringify(pkg.version)}.`);
      }
      if (typeof pluginManifest.displayName !== "string" || !pluginManifest.displayName.trim()) {
        errors.push('plugin.json must define a non-empty "displayName".');
      }
      if (typeof pluginManifest.homepage !== "string" || !pluginManifest.homepage.trim()) {
        errors.push('plugin.json must define a non-empty "homepage".');
      } else if (pkg.homepage && pluginManifest.homepage !== pkg.homepage) {
        errors.push(`plugin.json homepage ${JSON.stringify(pluginManifest.homepage)} does not match package.json homepage ${JSON.stringify(pkg.homepage)}.`);
      }
      if (
        !Array.isArray(pluginManifest.suggestedPrompts) ||
        pluginManifest.suggestedPrompts.length === 0 ||
        pluginManifest.suggestedPrompts.some((p) => typeof p !== "string" || !p.trim())
      ) {
        errors.push('plugin.json must define a non-empty string array "suggestedPrompts".');
      }
    } catch (error) {
      errors.push(`plugin.json is not valid JSON: ${error.message}`);
    }
  }

  const changelogText = readText("CHANGELOG.md");
  if (changelogText && pkg.version && !changelogText.includes(`## [${pkg.version}]`)) {
    errors.push(`CHANGELOG.md is missing a release heading for current version "## [${pkg.version}]".`);
  }

  const requiredMetadata = [
    ["repository.url", pkg.repository?.url],
    ["homepage", pkg.homepage],
    ["bugs.url", pkg.bugs?.url],
    ["engines.node", pkg.engines?.node],
    ["publishConfig.access", pkg.publishConfig?.access]
  ];
  for (const [label, value] of requiredMetadata) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`Add package.json metadata field "${label}" before publishing.`);
    }
  }

  const requiredPackageFiles = [
    "bin/agy-squad.mjs",
    "mcp/index.js",
    "mcp/dispatch.mjs",
    "mcp/planner.mjs",
    "mcp/briefs.mjs",
    "mcp/handoffs.mjs",
    "mcp/verdicts.mjs",
    "scripts/install-register.mjs",
    "scripts/release-preflight.mjs",
    ".agents/skills/pr-review/SKILL.md",
    ".agents/skills/pr-review/references/pr-review-standard.md",
    ".agents/skills/full-review/SKILL.md",
    ".agents/skills/full-review/references/evidence-intake.md",
    ".agents/skills/full-review/references/report-template.md",
    ".agents/skills/full-review/references/review-roles.md",
    ".agents/skills/self-diagnosis/SKILL.md",
    ".agents/skills/self-diagnosis/references/execution-and-teardown.md",
    ".agents/skills/self-diagnosis/references/optimization-and-review-rubric.md",
    ".agents/skills/self-diagnosis/scripts/diagnose.mjs",
    ".agents/skills/self-diagnosis/resources/comparative-research-manifest.json",
    ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
    ".agents/skills/swarm-governance/SKILL.md",
    ".agents/skills/swarm-governance/references/bundling-and-wire-format.md",
    ".agents/skills/swarm-governance/references/ecosystem-and-modifiers.md",
    ".agents/skills/swarm-governance/references/intake-and-planning.md",
    ".agents/skills/swarm-governance/references/large-swarms.md",
    "plugin.json",
    "install.sh",
    "install.ps1",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ];

  const fileEntries = (pkg.files ?? [])
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => {
      const negated = entry.startsWith("!");
      const normalized = (negated ? entry.slice(1) : entry)
        .replace(/\\/g, "/")
        .replace(/^\.\//, "")
        .replace(/\/+$/, "");
      return { negated, normalized };
    });
  const positiveEntries = fileEntries.filter((entry) => !entry.negated);
  const negativeEntries = fileEntries.filter((entry) => entry.negated);
  const matchesPackageEntry = (relativePath, normalized) => {
    if (!normalized) return false;
    if (normalized.includes("*")) {
      const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`^${escaped.replace(/\*\*|\*/g, (m) => (m === "**" ? ".*" : "[^/]*"))}$`).test(relativePath);
    }
    return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
  };

  for (const relativePath of requiredPackageFiles) {
    if (!exists(relativePath)) {
      errors.push(`Required runtime/release file is missing: ${relativePath}`);
    }
    const alwaysIncluded = ["package.json", "README.md", "CHANGELOG.md", "LICENSE"].includes(relativePath);
    const coveredByFiles =
      alwaysIncluded ||
      (positiveEntries.some((entry) => matchesPackageEntry(relativePath, entry.normalized)) &&
        !negativeEntries.some((entry) => matchesPackageEntry(relativePath, entry.normalized)));
    if (!coveredByFiles) {
      errors.push(`package.json "files" does not clearly include ${relativePath}.`);
    }
  }

  const binEntries = Object.values(pkg.bin ?? {});
  if (binEntries.length === 0) {
    errors.push("package.json has no bin entry.");
  }
  for (const binPath of binEntries) {
    const normalizedBin = binPath.replace(/\\/g, "/").replace(/^\.\//, "");
    if (!exists(normalizedBin)) {
      errors.push(`package.json bin target does not exist: ${binPath}`);
    }
    const coveredByFiles =
      positiveEntries.some((entry) => matchesPackageEntry(normalizedBin, entry.normalized)) &&
      !negativeEntries.some((entry) => matchesPackageEntry(normalizedBin, entry.normalized));
    if (!coveredByFiles) {
      errors.push(`package.json "files" does not clearly include bin target: ${binPath}`);
    }
  }

  for (const relativePath of ["SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"]) {
    if (!exists(relativePath)) {
      errors.push(`Add ${relativePath} before the public release.`);
    }
  }

  if (
    !pkg.scripts?.setup ||
    !pkg.scripts?.status ||
    !pkg.scripts?.uninstall ||
    !pkg.scripts?.preflight ||
    !pkg.scripts?.test ||
    !pkg.scripts?.["verify:package"]
  ) {
    errors.push("Expected npm scripts setup, status, uninstall, preflight, test, and verify:package to be present.");
  } else {
    const suitePaths = [
      ...pkg.scripts.test.matchAll(/(?:^|&&\s*)node\s+((?:tests|benchmarks)\/[\w./-]+\.mjs)/g)
    ].map((match) => match[1]);
    if (suitePaths.length === 0) {
      errors.push("Could not find test entrypoints in package.json scripts.test.");
    }
    for (const suitePath of suitePaths) {
      if (!exists(suitePath)) {
        errors.push(`npm test references a missing test file: ${suitePath}`);
      }
    }
    const readmeText = readText("README.md");
    const countMatch = readmeText.match(/Runs all\s+(\d+)\s+test suites?/i);
    if (!countMatch) {
      errors.push('README.md must state the exact suite count using a phrase such as "Runs all 10 test suites".');
    } else if (Number(countMatch[1]) !== suitePaths.length) {
      errors.push(`README.md says ${countMatch[1]} test suites, but package.json scripts.test runs ${suitePaths.length}.`);
    }
    for (const suitePath of suitePaths) {
      if (!readmeText.includes(suitePath)) {
        errors.push(`README.md does not list the test entrypoint that npm test runs: ${suitePath}`);
      }
    }
  }

  if (Object.keys(pkg.dependencies ?? {}).length > 0) {
    warnings.push(`Runtime npm dependencies are present (${Object.keys(pkg.dependencies).join(", ")}); review whether each is required.`);
  }
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`FAIL: ${error}`);

if (errors.length) {
  console.error(`\nRelease preflight failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  process.exitCode = 1;
} else {
  console.log(`\nRelease preflight passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`);
}
