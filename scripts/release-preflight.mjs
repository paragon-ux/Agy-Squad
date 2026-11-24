#!/usr/bin/env node
/**
 * Non-destructive release metadata/package preflight for Agy-Squad.
 * Run from the repository root: node scripts/release-preflight.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHIPPED_SKILLS, isDirectEntryPoint } from "./install-register.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function stripTrailingSlashes(value) {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
}

function matchPackageGlob(value, pattern) {
  const tokens = [];
  for (let i = 0; i < pattern.length; ) {
    if (pattern.startsWith("**/", i)) {
      if (tokens[tokens.length - 1] !== "**/") tokens.push("**/");
      i += 3;
    } else if (pattern.startsWith("**", i)) {
      if (tokens[tokens.length - 1] !== "**") tokens.push("**");
      i += 2;
    } else if (pattern[i] === "*") {
      if (tokens[tokens.length - 1] !== "*") tokens.push("*");
      i += 1;
    } else if (pattern[i] === "?") {
      tokens.push("?");
      i += 1;
    } else {
      tokens.push(pattern[i]);
      i += 1;
    }
  }
  const n = value.length;
  let dp = new Uint8Array(n + 1);
  dp[0] = 1;
  for (const tok of tokens) {
    const next = new Uint8Array(n + 1);
    if (tok === "**/") {
      let seen = false;
      for (let j = 0; j <= n; j++) {
        if (dp[j]) {
          next[j] = 1;
          seen = true;
        }
        if (seen && j > 0 && value[j - 1] === "/") {
          next[j] = 1;
        }
      }
    } else if (tok === "**") {
      let seen = false;
      for (let j = 0; j <= n; j++) {
        if (dp[j]) seen = true;
        if (seen) next[j] = 1;
      }
    } else if (tok === "*") {
      let seen = false;
      for (let j = 0; j <= n; j++) {
        if (j > 0 && value[j - 1] === "/") seen = false;
        if (dp[j]) seen = true;
        if (seen) next[j] = 1;
      }
    } else if (tok === "?") {
      for (let j = 0; j < n; j++) {
        if (dp[j] && value[j] !== "/") next[j + 1] = 1;
      }
    } else {
      for (let j = 0; j < n; j++) {
        if (dp[j] && value[j] === tok) next[j + 1] = 1;
      }
    }
    dp = next;
  }
  return dp[n] === 1;
}

function matchesPackageEntry(relativePath, normalized) {
  if (!normalized) return false;
  if (normalized.includes("*") || normalized.includes("?")) {
    return matchPackageGlob(relativePath, normalized);
  }
  return relativePath === normalized || relativePath.startsWith(`${normalized}/`);
}

function runReleasePreflight() {
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

  let pluginLogoPath = null;
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
      if (typeof pluginManifest.logo !== "string" || !pluginManifest.logo.trim()) {
        errors.push('plugin.json must define a non-empty "logo" path.');
      } else {
        const rawLogo = pluginManifest.logo.trim();
        if (rawLogo.includes("\\")) {
          errors.push(`plugin.json logo must use POSIX '/' separators: ${pluginManifest.logo}`);
        } else if (!exists(rawLogo)) {
          errors.push(`plugin.json logo target does not exist: ${pluginManifest.logo}`);
        } else {
          pluginLogoPath = rawLogo.replace(/^\.\//, "");
        }
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
    "assets/logo.svg",
    "bin/agy-squad.mjs",
    "mcp/index.js",
    "scripts/install-register.mjs",
    "docs/index.md",
    "docs/tools.md",
    "plugin.json",
    "install.sh",
    "install.ps1",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    ...SHIPPED_SKILLS.map((skill) => `.agents/skills/${skill}/SKILL.md`)
  ];
  if (exists("mcp")) {
    for (const entry of fs.readdirSync(path.join(root, "mcp"), { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:m?js)$/.test(entry.name)) {
        const rel = `mcp/${entry.name}`;
        if (!requiredPackageFiles.includes(rel)) {
          requiredPackageFiles.push(rel);
        }
      }
    }
  }

  const fileEntries = (pkg.files ?? [])
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => {
      const negated = entry.startsWith("!");
      const normalized = stripTrailingSlashes(
        (negated ? entry.slice(1) : entry).replace(/\\/g, "/").replace(/^\.\//, "")
      );
      return { negated, normalized };
    });
  const positiveEntries = fileEntries.filter((entry) => !entry.negated);
  const negativeEntries = fileEntries.filter((entry) => entry.negated);
  const isCoveredByFiles = (relativePath) =>
    ["package.json", "README.md", "LICENSE"].includes(relativePath) ||
    (positiveEntries.some((entry) => matchesPackageEntry(relativePath, entry.normalized)) &&
      !negativeEntries.some((entry) => matchesPackageEntry(relativePath, entry.normalized)));

  for (const relativePath of requiredPackageFiles) {
    if (!exists(relativePath)) {
      errors.push(`Required runtime/release file is missing: ${relativePath}`);
    }
    if (!isCoveredByFiles(relativePath)) {
      errors.push(`package.json "files" does not clearly include ${relativePath}.`);
    }
  }
  if (pluginLogoPath && !isCoveredByFiles(pluginLogoPath)) {
    errors.push(`package.json "files" does not clearly include plugin.json logo: ${pluginLogoPath}.`);
  }

  for (const excludedPath of [
    ".agents/skills/self-diagnosis",
    ".agents/skills/self-diagnosis/SKILL.md",
    "scripts/release-preflight.mjs",
    "docs/plans",
    "docs/plans/example.md",
    "docs/reviews",
    "docs/reviews/example.md"
  ]) {
    if (isCoveredByFiles(excludedPath)) {
      errors.push(`package.json "files" must exclude ${excludedPath}.`);
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
    if (!isCoveredByFiles(normalizedBin)) {
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
    if (exists("tests")) {
      const wiredSuites = new Set(suitePaths);
      for (const entry of fs.readdirSync(path.join(root, "tests"), { withFileTypes: true })) {
        if (entry.isFile() && /^test-.*\.mjs$/.test(entry.name)) {
          const rel = `tests/${entry.name}`;
          if (!wiredSuites.has(rel)) {
            warnings.push(`Test file ${rel} is not wired into package.json scripts.test.`);
          }
        }
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
}

if (isDirectEntryPoint(process.argv[1], import.meta.url)) {
  runReleasePreflight();
}

export { matchPackageGlob, matchesPackageEntry, runReleasePreflight };
