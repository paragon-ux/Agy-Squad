#!/usr/bin/env node

/**
 * Agy-Squad Registration & Installation Engine
 * Zero-clone cross-platform installer for Google Antigravity:
 * - Links or installs native plugin into ~/.gemini/config/plugins/agy-squad
 * - Links plugin skills (skills -> .agents/skills) for Antigravity discovery
 * - Registers agy-squad MCP server in ~/.gemini/config/plugins/agy-squad/mcp_config.json and sweeps duplicate global ~/.gemini/config/mcp_config.json entries
 * - Enables agy-squad plugin in ~/.gemini/config/config.json
 * - Provisions executable agy-squad CLI shims in ~/.gemini/antigravity/bin/
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const fsPromises = fs.promises;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const PACKAGE_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).version || "0.1.1";
  } catch {
    return "0.1.1";
  }
})();

const PLUGIN_KEY = "agy-squad";
const homeDir = process.env.AGY_TEST_PROFILE_DIR || os.homedir();
const geminiConfigDir = path.join(homeDir, ".gemini", "config");
const pluginsDir = path.join(geminiConfigDir, "plugins");
const pluginDest = path.join(pluginsDir, PLUGIN_KEY);
const configJsonPath = path.join(geminiConfigDir, "config.json");
const configBakPath = path.join(geminiConfigDir, "config.json.bak");
const mcpJsonPath = path.join(geminiConfigDir, "mcp_config.json");
const mcpBakPath = path.join(geminiConfigDir, "mcp_config.json.bak");
const antigravityMcpRootDir = path.join(homeDir, ".gemini", "antigravity", "mcp");
const antigravityBinDir = path.join(homeDir, ".gemini", "antigravity", "bin");
const MIN_AGY_CONTEXT_VERSION = "2.0.1";
const MIN_RTK_VERSION = "1.1.0";

function parseSemver(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    version: `${match[1]}.${match[2]}.${match[3]}`
  };
}

function isVersionAtLeast(semver, minMajor, minMinor, minPatch = 0) {
  if (!semver) return false;
  if (semver.major !== minMajor) return semver.major > minMajor;
  if (semver.minor !== minMinor) return semver.minor > minMinor;
  return semver.patch >= minPatch;
}

function probeBinaryVersion(target, args = ["--version"]) {
  const isWin = os.platform() === "win32";
  const isBareCommand = !target.includes("/") && !target.includes("\\");
  const useCmdShell = isWin && (isBareCommand || /\.(?:cmd|bat)$/i.test(target));
  try {
    let res;
    if (useCmdShell) {
      if (/["&|<>^%\r\n]/.test(target)) return null;
      const cmdLine = `"${target}" ${args.join(" ")}`;
      res = spawnSync("cmd.exe", ["/d", "/s", "/c", `"${cmdLine}"`], {
        encoding: "utf8",
        timeout: 3000,
        windowsHide: true,
        windowsVerbatimArguments: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } else {
      res = spawnSync(target, args, {
        encoding: "utf8",
        timeout: 3000,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
    }
    if (res.error || res.status !== 0) return null;
    const raw = (res.stdout || "").trim() || (res.stderr || "").trim();
    const semver = parseSemver(raw);
    if (!semver) return null;
    return { raw, semver };
  } catch {
    return null;
  }
}

export function detectCompanionDependencies() {
  const isWin = os.platform() === "win32";
  const activeHome = process.env.AGY_TEST_PROFILE_DIR || homeDir;
  const activeBinDir = path.join(activeHome, ".gemini", "antigravity", "bin");
  const activePluginsDir = path.join(activeHome, ".gemini", "config", "plugins");

  const agyContextCandidates = isWin
    ? [
        path.join(activeBinDir, "agy-context.cmd"),
        path.join(activeBinDir, "agy-context.exe"),
        "agy-context"
      ]
    : [path.join(activeBinDir, "agy-context"), "agy-context"];

  let agyContext = {
    available: false,
    installed: false,
    compatible: false,
    version: null,
    rawVersion: null,
    path: null,
    minVersion: MIN_AGY_CONTEXT_VERSION
  };
  for (const candidate of agyContextCandidates) {
    const isBare = !candidate.includes("/") && !candidate.includes("\\");
    if (!isBare && !fs.existsSync(candidate)) continue;
    const probed = probeBinaryVersion(candidate);
    if (!probed) continue;
    const compatible = isVersionAtLeast(probed.semver, 2, 0, 1);
    const entry = {
      available: compatible,
      installed: true,
      compatible,
      version: probed.semver.version,
      rawVersion: probed.raw,
      path: candidate,
      minVersion: MIN_AGY_CONTEXT_VERSION
    };
    if (compatible) {
      agyContext = entry;
      break;
    }
    if (!agyContext.installed) agyContext = entry;
  }

  const rtkCandidates = isWin
    ? [
        "rtk",
        path.join(activePluginsDir, "agy-context-saver", "bin", "rtk.exe"),
        path.join(activePluginsDir, "agy-context-saver", "bin", "rtk.cmd"),
        path.join(activeBinDir, "rtk.exe"),
        path.join(activeBinDir, "rtk.cmd")
      ]
    : [
        "rtk",
        path.join(activePluginsDir, "agy-context-saver", "bin", "rtk"),
        path.join(activeBinDir, "rtk")
      ];

  let rtk = {
    available: false,
    installed: false,
    compatible: false,
    version: null,
    rawVersion: null,
    path: null,
    minVersion: MIN_RTK_VERSION
  };
  for (const candidate of rtkCandidates) {
    const isBare = !candidate.includes("/") && !candidate.includes("\\");
    if (!isBare && !fs.existsSync(candidate)) continue;
    const probed = probeBinaryVersion(candidate);
    if (!probed) continue;
    const compatible = isVersionAtLeast(probed.semver, 1, 1, 0);
    const entry = {
      available: compatible,
      installed: true,
      compatible,
      version: probed.semver.version,
      rawVersion: probed.raw,
      path: candidate,
      minVersion: MIN_RTK_VERSION
    };
    if (compatible) {
      rtk = entry;
      break;
    }
    if (!rtk.installed) rtk = entry;
  }

  return { agyContext, rtk };
}

function normalizeSlash(p) {
  return p.replace(/\\/g, "/");
}

async function safeWriteFileIfChanged(filePath, content, mode) {
  try {
    if (fs.existsSync(filePath)) {
      const current = await fsPromises.readFile(filePath, "utf8");
      if (current === content) {
        if (mode !== undefined && os.platform() !== "win32") {
          await fsPromises.chmod(filePath, mode);
        }
        return false;
      }
    }
  } catch {}
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsPromises.writeFile(tmpPath, content, "utf8");
  if (mode !== undefined && os.platform() !== "win32") {
    await fsPromises.chmod(tmpPath, mode);
  }
  await fsPromises.rename(tmpPath, filePath);
  return true;
}

function readAndValidateJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) return null;
  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(`Cannot read ${label} (${filePath}): ${err.message}`);
  }
  if (!raw.trim()) {
    throw new Error(`Existing ${label} (${filePath}) is empty; aborting to preserve user configuration.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Existing ${label} (${filePath}) contains malformed JSON (${err.message}); aborting to preserve user configuration.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Existing ${label} (${filePath}) root must be a JSON object; aborting to preserve user configuration.`);
  }
  return parsed;
}

export function detectExistingInstallation(options = {}) {
  const includeCompanions = options.includeCompanions !== false;
  const pluginMcpJsonPath = path.join(pluginDest, "mcp_config.json");
  const details = {
    plugin: { exists: false, skillsReady: false, docsReady: false, path: pluginDest },
    mcp: {
      registered: false,
      pluginRegistered: false,
      globalDuplicate: false,
      staleSchemaCount: 0,
      path: pluginMcpJsonPath,
      globalPath: mcpJsonPath
    },
    cliShim: { exists: false, path: antigravityBinDir },
    config: { enabled: false, path: configJsonPath },
    companions: null
  };

  try {
    if (fs.existsSync(pluginDest)) {
      details.plugin.exists = true;
      const skillsPath = path.join(pluginDest, "skills");
      const requiredSkills = ["pr-review", "full-review", "self-diagnosis", "swarm-governance"];
      details.plugin.skillsReady = requiredSkills.every((skillName) =>
        fs.existsSync(path.join(skillsPath, skillName, "SKILL.md"))
      );
      details.plugin.docsReady = fs.existsSync(path.join(pluginDest, "docs", "tools.md"));
    }
  } catch {}

  try {
    if (fs.existsSync(pluginMcpJsonPath)) {
      const parsedPluginMcp = JSON.parse(fs.readFileSync(pluginMcpJsonPath, "utf8"));
      const entry = parsedPluginMcp?.mcpServers?.[PLUGIN_KEY];
      if (entry && typeof entry.command === "string" && Array.isArray(entry.args) && entry.args.length > 0) {
        details.mcp.pluginRegistered = true;
      }
    }
  } catch {}

  try {
    if (fs.existsSync(mcpJsonPath)) {
      const parsedGlobalMcp = JSON.parse(fs.readFileSync(mcpJsonPath, "utf8"));
      if (parsedGlobalMcp?.mcpServers && typeof parsedGlobalMcp.mcpServers === "object" && PLUGIN_KEY in parsedGlobalMcp.mcpServers) {
        details.mcp.globalDuplicate = true;
        details.mcp.staleSchemaCount += 1;
      }
    }
  } catch {}

  try {
    if (fs.existsSync(antigravityMcpRootDir)) {
      for (const entry of fs.readdirSync(antigravityMcpRootDir)) {
        if (entry === PLUGIN_KEY || entry.startsWith(`${PLUGIN_KEY}_`)) {
          details.mcp.globalDuplicate = true;
          details.mcp.staleSchemaCount += 1;
        }
      }
    }
  } catch {}

  details.mcp.registered = details.mcp.pluginRegistered && !details.mcp.globalDuplicate;

  try {
    const isWin = os.platform() === "win32";
    const shimPath = path.join(antigravityBinDir, isWin ? "agy-squad.cmd" : "agy-squad");
    details.cliShim.exists = fs.existsSync(shimPath);
  } catch {}

  let pluginDefaultEnabled = true;
  try {
    const manifestPath = fs.existsSync(path.join(pluginDest, "plugin.json"))
      ? path.join(pluginDest, "plugin.json")
      : path.join(repoRoot, "plugin.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest?.disabled === true) pluginDefaultEnabled = false;
    }
  } catch {}

  try {
    if (fs.existsSync(configJsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(configJsonPath, "utf8"));
      const cfgEntry = parsed?.plugins?.[PLUGIN_KEY];
      if (cfgEntry && typeof cfgEntry.enabled === "boolean") {
        details.config.enabled = cfgEntry.enabled;
      } else {
        details.config.enabled = pluginDefaultEnabled;
      }
    } else {
      details.config.enabled = pluginDefaultEnabled;
    }
  } catch {}

  if (includeCompanions) {
    details.companions = detectCompanionDependencies();
  }

  const isInstalled =
    details.plugin.exists &&
    details.plugin.skillsReady &&
    details.mcp.registered &&
    details.cliShim.exists &&
    details.config.enabled;

  return { isInstalled, details };
}

async function populateLinkedPluginDir(sourceRoot, targetPluginDir) {
  await fsPromises.mkdir(targetPluginDir, { recursive: true });
  for (const file of ["package.json", "plugin.json", "README.md"]) {
    const src = path.join(sourceRoot, file);
    if (fs.existsSync(src)) {
      await fsPromises.copyFile(src, path.join(targetPluginDir, file));
    }
  }
  const isWin = os.platform() === "win32";
  const linkMappings = [
    ["bin", path.join(sourceRoot, "bin")],
    ["docs", path.join(sourceRoot, "docs")],
    ["mcp", path.join(sourceRoot, "mcp")],
    ["scripts", path.join(sourceRoot, "scripts")],
    [".agents", path.join(sourceRoot, ".agents")],
    ["skills", path.join(sourceRoot, ".agents", "skills")]
  ];
  for (const [name, srcTarget] of linkMappings) {
    if (!fs.existsSync(srcTarget)) continue;
    const destPath = path.join(targetPluginDir, name);
    try {
      const stat = fs.lstatSync(destPath);
      if (stat.isSymbolicLink() || stat.isDirectory()) {
        if (stat.isSymbolicLink()) await fsPromises.unlink(destPath);
        else await fsPromises.rm(destPath, { recursive: true, force: true });
      }
    } catch {}
    try {
      fs.symlinkSync(srcTarget, destPath, isWin ? "junction" : "dir");
    } catch {
      await fsPromises.cp(srcTarget, destPath, { recursive: true });
    }
  }
  await ensurePluginSkillsAndMcpManifest(targetPluginDir);
}
async function ensurePluginSkillsAndMcpManifest(targetPluginDir) {
  const dotAgentsSkills = path.join(targetPluginDir, ".agents", "skills");
  const skillsDest = path.join(targetPluginDir, "skills");
  if (!fs.existsSync(skillsDest) && fs.existsSync(dotAgentsSkills)) {
    try {
      const isWin = os.platform() === "win32";
      fs.symlinkSync(
        isWin ? dotAgentsSkills : path.join(".agents", "skills"),
        skillsDest,
        isWin ? "junction" : "dir"
      );
    } catch {
      await fsPromises.cp(dotAgentsSkills, skillsDest, { recursive: true });
    }
  }

  const pluginMcpJson = path.join(targetPluginDir, "mcp_config.json");
  const pluginMcpContent = JSON.stringify(
    {
      mcpServers: {
        [PLUGIN_KEY]: {
          command: "node",
          args: ["./mcp/index.js"]
        }
      }
    },
    null,
    2
  ) + "\n";
  await safeWriteFileIfChanged(pluginMcpJson, pluginMcpContent);
}

export function formatWindowsCmdShim(targetRoot) {
  const winTarget = path.join(targetRoot, "bin", "agy-squad.mjs");
  return [
    "@echo off",
    "setlocal",
    "where node >nul 2>nul",
    "if errorlevel 1 goto :fallback",
    `node "${winTarget}" %*`,
    "exit /b %errorlevel%",
    ":fallback",
    `"${process.execPath}" "${winTarget}" %*`,
    "exit /b %errorlevel%",
    ""
  ].join("\r\n");
}

async function installCliShims({ targetRoot, log }) {
  await fsPromises.mkdir(antigravityBinDir, { recursive: true });
  const cliTarget = normalizeSlash(path.join(targetRoot, "bin", "agy-squad.mjs"));
  const posixShimPath = path.join(antigravityBinDir, "agy-squad");
  const cmdShimPath = path.join(antigravityBinDir, "agy-squad.cmd");

  const escapedExecPath = process.execPath.replace(/(["\\$`])/g, "\\$1");
  const posixContent = [
    "#!/usr/bin/env sh",
    "if command -v node >/dev/null 2>&1; then",
    `  exec node "${cliTarget}" "$@"`,
    "fi",
    `exec "${escapedExecPath}" "${cliTarget}" "$@"`,
    ""
  ].join("\n");
  const cmdContent = formatWindowsCmdShim(targetRoot);

  const posixChanged = await safeWriteFileIfChanged(posixShimPath, posixContent, 0o755);
  let cmdChanged = false;
  if (os.platform() === "win32") {
    cmdChanged = await safeWriteFileIfChanged(cmdShimPath, cmdContent);
  }
  const verb = posixChanged || cmdChanged ? "installed" : "verified";
  log(`[OK] CLI shim (agy-squad) ${verb} in: ${antigravityBinDir}`);
}

export async function runCheckOnly(options = {}) {
  const log = options.silent ? () => {} : console.log;
  log("Running Agy-Squad read-only preflight check (--check)...");

  for (const requiredRel of [
    "package.json",
    "plugin.json",
    "bin/agy-squad.mjs",
    "mcp/index.js",
    ".agents/skills/pr-review/SKILL.md",
    ".agents/skills/full-review/SKILL.md",
    ".agents/skills/self-diagnosis/SKILL.md",
    ".agents/skills/swarm-governance/SKILL.md"
  ]) {
    const abs = path.join(repoRoot, requiredRel);
    if (!fs.existsSync(abs)) {
      throw new Error(`Required repository file missing: ${requiredRel}`);
    }
  }

  readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  readAndValidateJsonFile(configJsonPath, "config.json");

  const status = detectExistingInstallation({ includeCompanions: false });
  log(`[OK] Read-only check passed (currently installed: ${status.isInstalled ? "YES" : "NO"}).`);
  return status;
}

export async function runInstall(options = {}) {
  const startTime = performance.now();
  const log = options.silent ? () => {} : console.log;
  const warn = options.silent ? () => {} : console.warn;

  const validatedMcp = readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  const validatedConfig = readAndValidateJsonFile(configJsonPath, "config.json");
  const existing = detectExistingInstallation({ includeCompanions: false });

  if (existing.isInstalled) {
    log("Existing Agy-Squad installation detected:");
    log(`   [OK] Native Plugin Link: ${pluginDest}`);
    log(`   [OK] Plugin MCP Server (${PLUGIN_KEY}): Registered in ${path.join(pluginDest, "mcp_config.json")}`);
    log(`   [OK] CLI Shim (agy-squad): Installed in ${antigravityBinDir}`);
    log(`\nRe-verifying and synchronizing to v${PACKAGE_VERSION}...`);
  } else {
    log(`Installing Agy-Squad v${PACKAGE_VERSION}...`);
  }

  await fsPromises.mkdir(pluginsDir, { recursive: true });
  const isGitRepo = fs.existsSync(path.join(repoRoot, ".git"));
  const isTempOrNpx =
    !isGitRepo || repoRoot.includes("_npx") || repoRoot.includes("npm-cache") || repoRoot.includes("node_modules");
  const copyFilter = (src) => {
    const rel = path.relative(repoRoot, src);
    if (!rel) return true;
    const topSegment = rel.split(path.sep)[0];
    return ![".git", "node_modules", ".venv", "scratch", "site", "benchmarks", "tests"].includes(topSegment);
  };

  let pluginLst = null;
  try {
    pluginLst = fs.lstatSync(pluginDest);
  } catch {}
  if (pluginLst) {
    await fsPromises.rm(pluginDest, { recursive: true, force: true });
  }

  if (isTempOrNpx || options.forceCopyFallback) {
    await fsPromises.cp(repoRoot, pluginDest, { recursive: true, filter: copyFilter });
    await ensurePluginSkillsAndMcpManifest(pluginDest);
    log(`[OK] Native Antigravity Plugin installed to: ${pluginDest}`);
  } else {
    await populateLinkedPluginDir(repoRoot, pluginDest);
    log(`[OK] Native Antigravity Plugin linked: ${pluginDest} -> ${repoRoot}`);
  }
  log(`[OK] Plugin skills, docs & manifest verified: ${path.join(pluginDest, "skills")}`);

  // Strip duplicate global mcp_config.json entry; plugin-scoped mcp_config.json is canonical (SQ-DEP-001)
  if (validatedMcp?.mcpServers && typeof validatedMcp.mcpServers === "object" && !Array.isArray(validatedMcp.mcpServers) && PLUGIN_KEY in validatedMcp.mcpServers) {
    const nextServers = { ...validatedMcp.mcpServers };
    delete nextServers[PLUGIN_KEY];
    const nextMcp = { ...validatedMcp, mcpServers: nextServers };
    const nextMcpRaw = JSON.stringify(nextMcp, null, 2) + "\n";

    if (fs.existsSync(mcpJsonPath) && !fs.existsSync(mcpBakPath)) {
      try {
        const currentRaw = fs.readFileSync(mcpJsonPath, "utf8");
        if (currentRaw !== nextMcpRaw) {
          await fsPromises.copyFile(mcpJsonPath, mcpBakPath);
          log(`[OK] Created configuration backup: ${mcpBakPath}`);
        }
      } catch (err) {
        warn(`[WARN] Could not create backup of ${mcpJsonPath}: ${err.message}`);
      }
    }
    await safeWriteFileIfChanged(mcpJsonPath, nextMcpRaw);
    log(`[OK] Removed duplicate global '${PLUGIN_KEY}' entry from: ${mcpJsonPath} (plugin mcp_config.json is canonical)`);
  }

  // Sweep stale global/cached agy-squad* MCP schema directories
  if (fs.existsSync(antigravityMcpRootDir)) {
    try {
      for (const entry of fs.readdirSync(antigravityMcpRootDir)) {
        if (entry === PLUGIN_KEY || entry.startsWith(`${PLUGIN_KEY}_`)) {
          await fsPromises.rm(path.join(antigravityMcpRootDir, entry), { recursive: true, force: true });
          log(`[OK] Swept stale MCP schema cache: ${path.join(antigravityMcpRootDir, entry)}`);
        }
      }
    } catch {}
  }

  const nextConfig = validatedConfig ? { ...validatedConfig } : {};
  const prevPluginEntry = nextConfig.plugins?.[PLUGIN_KEY];
  if (!prevPluginEntry || prevPluginEntry.enabled !== true) {
    if (fs.existsSync(configJsonPath) && !fs.existsSync(configBakPath)) {
      try {
        await fsPromises.copyFile(configJsonPath, configBakPath);
      } catch {}
    }
    nextConfig.plugins = {
      ...(nextConfig.plugins && typeof nextConfig.plugins === "object" ? nextConfig.plugins : {}),
      [PLUGIN_KEY]: {
        ...(prevPluginEntry && typeof prevPluginEntry === "object" ? prevPluginEntry : {}),
        enabled: true
      }
    };
    await safeWriteFileIfChanged(configJsonPath, JSON.stringify(nextConfig, null, 2) + "\n");
    log(`[OK] Enabled plugin '${PLUGIN_KEY}' in: ${configJsonPath}`);
  }

  await installCliShims({ targetRoot: pluginDest, log });

  const elapsed = (performance.now() - startTime).toFixed(1);
  log(`\nAgy-Squad installation ${existing.isInstalled ? "synchronized & up-to-date" : "completed"} in ${elapsed}ms!\n`);
  return { ...detectExistingInstallation({ includeCompanions: false }), isInstalled: true, elapsedMs: elapsed };
}

export async function runRestoreBackups(options = {}) {
  const log = options.silent ? () => {} : console.log;
  let restoredCount = 0;
  for (const [bakPath, targetPath] of [
    [mcpBakPath, mcpJsonPath],
    [configBakPath, configJsonPath]
  ]) {
    if (fs.existsSync(bakPath)) {
      await fsPromises.copyFile(bakPath, targetPath);
      await fsPromises.unlink(bakPath);
      log(`[OK] Restored backup: ${bakPath} -> ${targetPath}`);
      restoredCount += 1;
    }
  }
  if (restoredCount === 0) {
    log("[INFO] No backup files (*.bak) found to restore.");
  }
  return { restoredCount };
}

export async function runUninstall(options = {}) {
  const log = options.silent ? () => {} : console.log;
  log("Uninstalling Agy-Squad...");

  const validatedMcp = readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  const validatedConfig = readAndValidateJsonFile(configJsonPath, "config.json");

  if (fs.existsSync(pluginDest)) {
    try {
      const stat = fs.lstatSync(pluginDest);
      if (stat.isSymbolicLink()) {
        await fsPromises.unlink(pluginDest);
      } else {
        await fsPromises.rm(pluginDest, { recursive: true, force: true });
      }
      log(`[OK] Removed plugin installation: ${pluginDest}`);
    } catch (err) {
      log(`[WARN] Could not remove ${pluginDest}: ${err.message}`);
    }
  }

  const repoSkillsLink = path.join(repoRoot, "skills");
  try {
    if (fs.existsSync(repoSkillsLink) && fs.lstatSync(repoSkillsLink).isSymbolicLink()) {
      await fsPromises.unlink(repoSkillsLink);
    }
  } catch {}

  if (validatedMcp?.mcpServers && typeof validatedMcp.mcpServers === "object") {
    const nextServers = { ...validatedMcp.mcpServers };
    delete nextServers[PLUGIN_KEY];
    const nextMcp = { ...validatedMcp, mcpServers: nextServers };
    await safeWriteFileIfChanged(mcpJsonPath, JSON.stringify(nextMcp, null, 2) + "\n");
    log(`[OK] Removed '${PLUGIN_KEY}' from: ${mcpJsonPath} (foreign entries preserved)`);
  }

  if (validatedConfig?.plugins && typeof validatedConfig.plugins === "object" && PLUGIN_KEY in validatedConfig.plugins) {
    const nextPlugins = { ...validatedConfig.plugins };
    delete nextPlugins[PLUGIN_KEY];
    const nextConfig = { ...validatedConfig, plugins: nextPlugins };
    await safeWriteFileIfChanged(configJsonPath, JSON.stringify(nextConfig, null, 2) + "\n");
    log(`[OK] Removed '${PLUGIN_KEY}' plugin state from: ${configJsonPath}`);
  }

  for (const shimName of ["agy-squad", "agy-squad.cmd"]) {
    const shimPath = path.join(antigravityBinDir, shimName);
    if (fs.existsSync(shimPath)) {
      await fsPromises.unlink(shimPath);
      log(`[OK] Removed CLI shim: ${shimPath}`);
    }
  }

  if (fs.existsSync(antigravityMcpRootDir)) {
    try {
      for (const entry of fs.readdirSync(antigravityMcpRootDir)) {
        if (entry === PLUGIN_KEY || entry.startsWith(`${PLUGIN_KEY}_`)) {
          await fsPromises.rm(path.join(antigravityMcpRootDir, entry), { recursive: true, force: true });
        }
      }
    } catch {}
  }

  if (options.restoreBackups) {
    await runRestoreBackups(options);
  }

  log("\nAgy-Squad uninstallation complete.");
  return detectExistingInstallation({ includeCompanions: false });
}

function formatCompanionLine(label, info, note) {
  if (info?.available) {
    return `- ${label}: AVAILABLE (${info.rawVersion || info.version} at ${info.path})`;
  }
  if (info?.installed && !info?.compatible) {
    return `- ${label}: OUTDATED (${info.rawVersion || info.version} < ${info.minVersion} at ${info.path}; non-fatal — ${note})`;
  }
  return `- ${label}: MISSING (non-fatal — ${note})`;
}

export function printStatus(options = {}) {
  const log = options.silent ? () => {} : console.log;
  const status = detectExistingInstallation({ includeCompanions: true });
  log("Checking Agy-Squad installation status...\n");
  log(
    `- Native Plugin Link: ${status.details.plugin.exists ? "ACTIVE" : "MISSING"} (${status.details.plugin.path})`
  );
  log(
    `- Governance Skills (pr-review, full-review, self-diagnosis, swarm-governance): ${
      status.details.plugin.skillsReady ? "READY" : "MISSING"
    }`
  );
  log(
    `- Plugin Docs & Links: ${status.details.plugin.docsReady ? "READY" : "MISSING"} (${path.join(status.details.plugin.path, "docs")})`
  );
  log(
    `- MCP Server (${PLUGIN_KEY}): ${
      status.details.mcp.registered
        ? "REGISTERED (plugin mcp_config.json only)"
        : status.details.mcp.globalDuplicate
          ? "DUPLICATE GLOBAL ENTRY (re-run agy-squad setup)"
          : "MISSING"
    } (${status.details.mcp.path})`
  );
  log(
    `- CLI Shim (agy-squad): ${status.details.cliShim.exists ? "INSTALLED" : "MISSING"} (${status.details.cliShim.path})`
  );
  log(
    `- Plugin Enabled (config.json / plugin.json): ${status.details.config.enabled ? "ENABLED" : "DISABLED"}`
  );
  const { agyContext, rtk } = status.details.companions || {};
  log(formatCompanionLine("Companion CLI (agy-context >= 2.0.1)", agyContext, "needed for integrity trace audits"));
  log(formatCompanionLine("Companion Optimizer (rtk >= 1.1.0)", rtk, "needed by Agy-Context-Saver hooks"));
  if (!agyContext?.available || !rtk?.available) {
    log("[INFO] Companion tools are non-fatal for offline bundle/verify; install Agy-Context-Saver (>= 2.0.1) + RTK (>= 1.1.0) for full live integrity audits.");
  }
  const overallLabel = status.isInstalled
    ? "HEALTHY & ACTIVE"
    : !status.details.config.enabled
      ? "DISABLED"
      : "NOT INSTALLED";
  log(`\nOverall Status: ${overallLabel}`);
  return status;
}

function printCliHelp() {
  console.log(`
Agy-Squad Registration & Lifecycle Engine (v${PACKAGE_VERSION})

Usage:
  node scripts/install-register.mjs [command/option]

Commands & Options:
  --status, status [--json]    Check live integration status (plugin, skills, MCP server, CLI shim, companions)
  --check, -c                  Run read-only pre-flight validation check without writing changes
  --uninstall, uninstall       Remove plugin link, MCP entry, CLI shims, and schema caches
  --restore-backups            Restore original configuration backup files (*.bak)
  --help, -h, help             Show this help message
  (no arguments)               Install or synchronize Agy-Squad v${PACKAGE_VERSION}
`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const isHelp = args.includes("--help") || args.includes("-h") || args.includes("help");
  const isUninstall = args.includes("--uninstall") || args.includes("uninstall");
  const isStatus = args.includes("--status") || args.includes("status");
  const isCheck = args.includes("--check") || args.includes("-c");
  const isRestoreBackups = args.includes("--restore-backups") || args.includes("restore-backups");
  const isJson = args.includes("--json");

  if (isHelp) {
    printCliHelp();
    process.exit(0);
  }
  if (isCheck && (isUninstall || isRestoreBackups)) {
    console.error("Conflicting flags: --check is read-only and cannot be combined with --uninstall or --restore-backups.");
    process.exit(1);
  }

  try {
    if (isStatus) {
      const st = printStatus({ silent: isJson });
      if (isJson) {
        console.log(JSON.stringify(st, null, 2));
      }
      process.exit(st.isInstalled ? 0 : 1);
    } else if (isCheck) {
      await runCheckOnly();
    } else if (isUninstall) {
      await runUninstall({ restoreBackups: isRestoreBackups });
    } else if (isRestoreBackups) {
      await runRestoreBackups();
    } else {
      await runInstall();
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
