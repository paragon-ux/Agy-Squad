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
    "mcp/planner.mjs",
    "mcp/briefs.mjs",
    "mcp/handoffs.mjs",
    "mcp/verdicts.mjs",
    "scripts/install-register.mjs",
    "scripts/release-preflight.mjs",
    ".agents/skills/pr-review/SKILL.md",
    ".agents/skills/full-review/SKILL.md",
    ".agents/skills/self-diagnosis/SKILL.md",
    ".agents/skills/swarm-governance/SKILL.md",
    "plugin.json",
    "install.sh",
    "install.ps1",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ];

  for (const relativePath of requiredPackageFiles) {
    if (!exists(relativePath)) {
      errors.push(`Required runtime/release file is missing: ${relativePath}`);
    }
    const alwaysIncluded = ["package.json", "README.md", "CHANGELOG.md", "LICENSE"].includes(relativePath);
    const coveredByFiles =
      alwaysIncluded ||
      (pkg.files ?? []).some((entry) => {
        const normalized = entry.replace(/\\/g, "/").replace(/\/$/, "");
        return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
      });
    if (!coveredByFiles) {
      errors.push(`package.json "files" does not clearly include ${relativePath}.`);
    }
  }

  for (const relativePath of ["SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"]) {
    if (!exists(relativePath)) {
      errors.push(`Add ${relativePath} before the public release.`);
    }
  }

  if (!pkg.scripts?.setup || !pkg.scripts?.status || !pkg.scripts?.uninstall || !pkg.scripts?.preflight || !pkg.scripts?.test) {
    errors.push("Expected npm scripts setup, status, uninstall, preflight, and test to be present.");
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
