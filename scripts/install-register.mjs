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
    return JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).version || "0.1.3";
  } catch {
    return "0.1.3";
  }
})();

const PLUGIN_KEY = "agy-squad";
const MIN_AGY_CONTEXT_VERSION = "2.0.1";
const MIN_RTK_VERSION = "1.1.0";

function resolveProfilePaths() {
  const homeDir = process.env.AGY_TEST_PROFILE_DIR || os.homedir();
  const geminiConfigDir = path.join(homeDir, ".gemini", "config");
  const pluginsDir = path.join(geminiConfigDir, "plugins");
  const pluginDest = path.join(pluginsDir, PLUGIN_KEY);
  const configJsonPath = path.join(geminiConfigDir, "config.json");
  const configBakPath = path.join(geminiConfigDir, "config.json.agy-squad.bak");
  const legacyConfigBakPath = path.join(geminiConfigDir, "config.json.bak");
  const mcpJsonPath = path.join(geminiConfigDir, "mcp_config.json");
  const mcpBakPath = path.join(geminiConfigDir, "mcp_config.json.agy-squad.bak");
  const legacyMcpBakPath = path.join(geminiConfigDir, "mcp_config.json.bak");
  const antigravityMcpRootDir = path.join(homeDir, ".gemini", "antigravity", "mcp");
  const antigravityBinDir = path.join(homeDir, ".gemini", "antigravity", "bin");
  return {
    homeDir,
    geminiConfigDir,
    pluginsDir,
    pluginDest,
    configJsonPath,
    configBakPath,
    legacyConfigBakPath,
    mcpJsonPath,
    mcpBakPath,
    legacyMcpBakPath,
    antigravityMcpRootDir,
    antigravityBinDir
  };
}

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

export function buildWindowsProbeInvocation(target, args = ["--version"]) {
  if (typeof target !== "string" || !target.trim() || /["&|<>^%!\r\n]/.test(target)) {
    return null;
  }
  const isBareCommand = !target.includes("/") && !target.includes("\\");
  if (isBareCommand && /[()\s]/.test(target)) {
    return null;
  }
  if (!Array.isArray(args)) return null;
  const quotedArgs = [];
  for (const arg of args) {
    if (typeof arg !== "string" || /["&|<>^%!()\r\n]/.test(arg)) {
      return null;
    }
    quotedArgs.push(`"${arg}"`);
  }
  const cmdLine = [`"${target}"`, ...quotedArgs].join(" ");
  const comspec =
    process.env.ComSpec ||
    process.env.COMSPEC ||
    path.join(process.env.SystemRoot || process.env.windir || "C:\\Windows", "System32", "cmd.exe");
  return {
    comspec,
    args: ["/d", "/s", "/c", `"${cmdLine}"`],
    cmdLine
  };
}

function probeBinaryVersion(target, args = ["--version"]) {
  const isWin = os.platform() === "win32";
  const isBareCommand = typeof target === "string" && !target.includes("/") && !target.includes("\\");
  const useCmdShell = isWin && (isBareCommand || /\.(?:cmd|bat)$/i.test(target));
  try {
    let res;
    if (useCmdShell) {
      const winInv = buildWindowsProbeInvocation(target, args);
      if (!winInv) return null;
      res = spawnSync(winInv.comspec, winInv.args, {
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
  const { antigravityBinDir: activeBinDir, pluginsDir: activePluginsDir } = resolveProfilePaths();

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

function resolveEnvPathValue(env = process.env, platform = os.platform()) {
  if (!env || typeof env !== "object") return "";
  if (typeof env.PATH === "string") return env.PATH;
  if (platform === "win32") {
    const key = Object.keys(env).find((k) => k.toLowerCase() === "path");
    if (key && typeof env[key] === "string") return env[key];
  }
  return "";
}

function normalizePathEntry(entry, platform = os.platform(), homeDir = os.homedir()) {
  if (typeof entry !== "string") return "";
  let trimmed = entry.trim();
  if (!trimmed) return "";
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed) return "";
  if (platform !== "win32" && (trimmed === "~" || trimmed.startsWith("~/"))) {
    trimmed = path.join(homeDir, trimmed.slice(1));
  }
  const pathImpl = platform === "win32" ? path.win32 : path.posix;
  let resolved = pathImpl.resolve(trimmed);
  if (platform === os.platform()) {
    try {
      resolved = fs.realpathSync(resolved);
    } catch {}
  }
  resolved = resolved.replace(/[\\/]+$/, "") || resolved;
  return platform === "win32" || platform === "darwin" ? resolved.toLowerCase() : resolved;
}

export function isDirOnPath(targetDir, envPath, platform = os.platform()) {
  const rawPath = envPath !== undefined ? String(envPath ?? "") : resolveEnvPathValue(process.env, platform);
  if (!rawPath || !targetDir) return false;
  const homeDir = process.env.AGY_TEST_PROFILE_DIR || os.homedir();
  const normalizedTarget = normalizePathEntry(targetDir, platform, homeDir);
  if (!normalizedTarget) return false;
  const delimiter = platform === "win32" ? ";" : ":";
  return rawPath
    .split(delimiter)
    .some((segment) => normalizePathEntry(segment, platform, homeDir) === normalizedTarget);
}

export function formatPathGuidanceLines(antigravityBinDir, platform = os.platform()) {
  if (platform === "win32") {
    return [
      `[WARN] CLI bin directory is not on your PATH: ${antigravityBinDir}`,
      `       PowerShell (current session): $env:PATH = "${antigravityBinDir};$env:PATH"`,
      `       PowerShell (persist for user): [Environment]::SetEnvironmentVariable("Path", "${antigravityBinDir};" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")`,
      "       Or invoke without editing PATH: npx --package=agy-squad agy-squad status"
    ];
  }
  return [
    `[WARN] CLI bin directory is not on your PATH: ${antigravityBinDir}`,
    `       Add to ~/.bashrc or ~/.zshrc: export PATH="${antigravityBinDir}:$PATH"`,
    "       Then reload your shell (e.g. 'source ~/.bashrc') or run: npx --package=agy-squad agy-squad status"
  ];
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
  const {
    pluginDest,
    configJsonPath,
    mcpJsonPath,
    antigravityMcpRootDir,
    antigravityBinDir
  } = resolveProfilePaths();
  const includeCompanions = options.includeCompanions !== false;
  const pluginMcpJsonPath = path.join(pluginDest, "mcp_config.json");
  const details = {
    plugin: {
      exists: false,
      skillsReady: false,
      docsReady: false,
      runtimeReady: false,
      path: pluginDest,
      target: null,
      isSymlink: false,
      isCopyFallback: false,
      pointsElsewhere: false,
      version: null,
      versionMismatch: false
    },
    mcp: {
      registered: false,
      pluginRegistered: false,
      globalDuplicate: false,
      corrupt: false,
      error: null,
      staleSchemaCount: 0,
      path: pluginMcpJsonPath,
      globalPath: mcpJsonPath
    },
    cliShim: { exists: false, onPath: isDirOnPath(antigravityBinDir), path: antigravityBinDir },
    config: { enabled: false, corrupt: false, error: null, path: configJsonPath },
    companions: null
  };

  const isLocalCheckout =
    fs.existsSync(path.join(repoRoot, ".git")) &&
    !repoRoot.includes("_npx") &&
    !repoRoot.includes("npm-cache") &&
    !repoRoot.includes("node_modules");
  const pathsEqual = (a, b) =>
    os.platform() === "win32" || os.platform() === "darwin"
      ? a.toLowerCase() === b.toLowerCase()
      : a === b;

  let pluginLst = null;
  try {
    pluginLst = fs.lstatSync(pluginDest);
  } catch {}

  try {
    if (fs.existsSync(pluginDest)) {
      details.plugin.exists = true;
      const pluginDirIsSymlink = Boolean(pluginLst && pluginLst.isSymbolicLink());
      if (pluginDirIsSymlink) {
        details.plugin.isSymlink = true;
        try {
          details.plugin.target = fs.readlinkSync(pluginDest);
        } catch {
          details.plugin.target = "symlink";
        }
        if (isLocalCheckout) {
          try {
            details.plugin.pointsElsewhere = !pathsEqual(fs.realpathSync(pluginDest), fs.realpathSync(repoRoot));
          } catch {
            details.plugin.pointsElsewhere = true;
          }
        }
      } else {
        const linkedDirs = [
          ["bin", "bin"],
          ["docs", "docs"],
          ["mcp", "mcp"],
          ["scripts", "scripts"],
          [".agents", ".agents"],
          ["skills", path.join(".agents", "skills")]
        ];
        let dotAgentsIsSymlink = false;
        for (const [relDir, repoRel] of linkedDirs) {
          const linkPath = path.join(pluginDest, relDir);
          let linkLst = null;
          try {
            linkLst = fs.lstatSync(linkPath);
          } catch {}
          if (linkLst && linkLst.isSymbolicLink()) {
            if (relDir === ".agents") {
              dotAgentsIsSymlink = true;
            }
            if (relDir === "skills" && !dotAgentsIsSymlink) {
              try {
                const localAgentsSkills = path.join(pluginDest, ".agents", "skills");
                if (
                  fs.existsSync(localAgentsSkills) &&
                  pathsEqual(fs.realpathSync(linkPath), fs.realpathSync(localAgentsSkills))
                ) {
                  continue;
                }
              } catch {}
            }
            details.plugin.isSymlink = true;
            let subdirRedirected = false;
            if (isLocalCheckout) {
              try {
                if (!pathsEqual(fs.realpathSync(linkPath), fs.realpathSync(path.join(repoRoot, repoRel)))) {
                  details.plugin.pointsElsewhere = true;
                  subdirRedirected = true;
                }
              } catch {
                details.plugin.pointsElsewhere = true;
                subdirRedirected = true;
              }
            }
            if (subdirRedirected || !details.plugin.target) {
              try {
                const rawTarget = fs.readlinkSync(linkPath);
                const suffix = `${path.sep}${repoRel}`;
                if (rawTarget.endsWith(suffix)) {
                  details.plugin.target = rawTarget.slice(0, -suffix.length) || rawTarget;
                } else {
                  const expectedBase = path.basename(repoRel);
                  details.plugin.target = path.basename(rawTarget) === expectedBase ? path.dirname(rawTarget) : rawTarget;
                }
              } catch {
                if (!details.plugin.target || subdirRedirected) details.plugin.target = "symlink";
              }
            }
          }
        }
        if (!details.plugin.isSymlink) {
          details.plugin.target = "direct folder or junction";
        }
      }
      details.plugin.isCopyFallback = !details.plugin.isSymlink;

      try {
        const installedPkg = JSON.parse(fs.readFileSync(path.join(pluginDest, "package.json"), "utf8"));
        if (typeof installedPkg?.version === "string" && installedPkg.version.trim()) {
          details.plugin.version = installedPkg.version.trim();
        }
      } catch {}
      details.plugin.versionMismatch = Boolean(
        details.plugin.version && details.plugin.version !== PACKAGE_VERSION
      );

      const skillsPath = path.join(pluginDest, "skills");
      const requiredSkills = ["pr-review", "full-review", "self-diagnosis", "swarm-governance"];
      details.plugin.skillsReady = requiredSkills.every((skillName) =>
        fs.existsSync(path.join(skillsPath, skillName, "SKILL.md"))
      );
      details.plugin.docsReady = fs.existsSync(path.join(pluginDest, "docs", "tools.md"));
      details.plugin.runtimeReady =
        fs.existsSync(path.join(pluginDest, "package.json")) &&
        fs.existsSync(path.join(pluginDest, "plugin.json")) &&
        Boolean(details.plugin.version) &&
        fs.existsSync(path.join(pluginDest, "bin", "agy-squad.mjs")) &&
        fs.existsSync(path.join(pluginDest, "mcp", "index.js"));
    } else if (pluginLst && pluginLst.isSymbolicLink()) {
      details.plugin.isSymlink = true;
      details.plugin.pointsElsewhere = true;
      try {
        details.plugin.target = fs.readlinkSync(pluginDest);
      } catch {
        details.plugin.target = "broken symlink";
      }
    }
  } catch {}

  const inspectJsonObject = (filePath, label) => {
    if (!fs.existsSync(filePath)) return { exists: false, data: null, error: null };
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      if (!raw.trim()) {
        return { exists: true, data: null, error: `${label} is empty` };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { exists: true, data: null, error: `${label} root must be a JSON object` };
      }
      return { exists: true, data: parsed, error: null };
    } catch (err) {
      return { exists: true, data: null, error: `${label} contains malformed JSON (${err.message})` };
    }
  };
  const appendMcpError = (errMsg) => {
    details.mcp.corrupt = true;
    details.mcp.error = details.mcp.error ? `${details.mcp.error}; ${errMsg}` : errMsg;
  };

  const pluginMcpCheck = inspectJsonObject(pluginMcpJsonPath, "plugin mcp_config.json");
  if (pluginMcpCheck.error) {
    appendMcpError(pluginMcpCheck.error);
  } else if (pluginMcpCheck.data) {
    if (
      pluginMcpCheck.data.mcpServers !== undefined &&
      (!pluginMcpCheck.data.mcpServers ||
        typeof pluginMcpCheck.data.mcpServers !== "object" ||
        Array.isArray(pluginMcpCheck.data.mcpServers))
    ) {
      appendMcpError("plugin mcp_config.json field 'mcpServers' must be a JSON object");
    } else {
      const entry = pluginMcpCheck.data.mcpServers?.[PLUGIN_KEY];
      if (entry && typeof entry.command === "string" && Array.isArray(entry.args) && entry.args.length > 0) {
        details.mcp.pluginRegistered = true;
      }
    }
  }

  const globalMcpCheck = inspectJsonObject(mcpJsonPath, "mcp_config.json");
  let hasGlobalMcpEntry = false;
  if (globalMcpCheck.error) {
    appendMcpError(globalMcpCheck.error);
  } else if (globalMcpCheck.data) {
    if (
      globalMcpCheck.data.mcpServers !== undefined &&
      (!globalMcpCheck.data.mcpServers ||
        typeof globalMcpCheck.data.mcpServers !== "object" ||
        Array.isArray(globalMcpCheck.data.mcpServers))
    ) {
      appendMcpError("mcp_config.json field 'mcpServers' must be a JSON object");
    } else if (globalMcpCheck.data.mcpServers && PLUGIN_KEY in globalMcpCheck.data.mcpServers) {
      hasGlobalMcpEntry = true;
      details.mcp.globalDuplicate = true;
      details.mcp.staleSchemaCount += 1;
    }
  }

  const activePluginSchemaDir = `${PLUGIN_KEY}_${PLUGIN_KEY}`;
  try {
    if (fs.existsSync(antigravityMcpRootDir)) {
      for (const entry of fs.readdirSync(antigravityMcpRootDir)) {
        if (entry === PLUGIN_KEY || entry.startsWith(`${PLUGIN_KEY}_`)) {
          // Antigravity creates ~/.gemini/antigravity/mcp/<plugin>_<server> ("agy-squad_agy-squad")
          // when loading the plugin's canonical mcp_config.json; only treat it as stale when
          // the plugin is unregistered or duplicated in global mcp_config.json.
          const isActivePluginSchemaDir =
            entry === activePluginSchemaDir && details.mcp.pluginRegistered && !hasGlobalMcpEntry;
          if (!isActivePluginSchemaDir) {
            details.mcp.globalDuplicate = true;
            details.mcp.staleSchemaCount += 1;
          }
        }
      }
    }
  } catch {}

  details.mcp.registered = details.mcp.pluginRegistered && !details.mcp.globalDuplicate && !details.mcp.corrupt;

  try {
    const isWin = os.platform() === "win32";
    const shimPath = path.join(antigravityBinDir, isWin ? "agy-squad.cmd" : "agy-squad");
    if (fs.existsSync(shimPath)) {
      if (isWin) {
        details.cliShim.exists = true;
      } else {
        fs.accessSync(shimPath, fs.constants.X_OK);
        details.cliShim.exists = true;
      }
    }
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

  const hasInstalledArtifacts =
    details.plugin.exists ||
    Boolean(pluginLst) ||
    details.mcp.pluginRegistered ||
    details.cliShim.exists;

  const cfgCheck = inspectJsonObject(configJsonPath, "config.json");
  if (cfgCheck.error) {
    details.config.corrupt = true;
    details.config.error = cfgCheck.error;
    details.config.enabled = false;
  } else if (cfgCheck.data) {
    if (
      cfgCheck.data.plugins !== undefined &&
      (!cfgCheck.data.plugins || typeof cfgCheck.data.plugins !== "object" || Array.isArray(cfgCheck.data.plugins))
    ) {
      details.config.corrupt = true;
      details.config.error = "config.json field 'plugins' must be a JSON object";
      details.config.enabled = false;
    } else {
      const cfgEntry = cfgCheck.data.plugins?.[PLUGIN_KEY];
      if (cfgEntry && typeof cfgEntry.enabled === "boolean") {
        details.config.enabled = cfgEntry.enabled;
      } else {
        details.config.enabled = hasInstalledArtifacts ? pluginDefaultEnabled : false;
      }
    }
  } else {
    details.config.enabled = hasInstalledArtifacts ? pluginDefaultEnabled : false;
  }

  if (includeCompanions) {
    details.companions = detectCompanionDependencies();
  }

  const isInstalled =
    details.plugin.exists ||
    Boolean(pluginLst) ||
    details.mcp.pluginRegistered ||
    details.mcp.globalDuplicate ||
    details.cliShim.exists;

  const isComplete =
    details.plugin.exists &&
    !details.plugin.pointsElsewhere &&
    !details.plugin.versionMismatch &&
    details.plugin.runtimeReady &&
    details.plugin.skillsReady &&
    details.plugin.docsReady &&
    details.mcp.registered &&
    !details.mcp.corrupt &&
    details.cliShim.exists &&
    details.config.enabled &&
    !details.config.corrupt;

  return { isInstalled, isComplete, details };
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
    ["assets", path.join(sourceRoot, "assets")],
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

export function formatWindowsCmdShim(targetRoot, execPath = process.execPath) {
  if (typeof targetRoot !== "string" || !targetRoot.trim() || /["\r\n\0]/.test(targetRoot)) {
    throw new Error(`Invalid Windows CLI shim target path: ${JSON.stringify(targetRoot)}`);
  }
  const winTarget = path.join(targetRoot, "bin", "agy-squad.mjs");
  if (typeof winTarget !== "string" || /["\r\n\0]/.test(winTarget)) {
    throw new Error(`Invalid Windows CLI shim target path: ${JSON.stringify(winTarget)}`);
  }
  if (typeof execPath !== "string" || !execPath.trim() || /["\r\n\0]/.test(execPath)) {
    throw new Error(`Invalid Windows CLI shim execPath: ${JSON.stringify(execPath)}`);
  }
  const escapeCmdPercent = (value) => value.replace(/%/g, "%%");
  const escapedTarget = escapeCmdPercent(winTarget);
  const escapedExecPath = escapeCmdPercent(execPath);
  return [
    "@echo off",
    "chcp 65001 >nul",
    "setlocal",
    "where node.exe >nul 2>nul",
    "if errorlevel 1 goto :fallback",
    // A label-less GOTO ends the batch context. The queued executable can
    // delete this shim (and any managed node.cmd) and return its own status.
    `(goto) 2>nul & node.exe "${escapedTarget}" %*`,
    ":fallback",
    `(goto) 2>nul & "${escapedExecPath}" "${escapedTarget}" %*`,
    ""
  ].join("\r\n");
}

export function formatPosixShim(targetRoot, execPath = process.execPath) {
  const cliTarget = normalizeSlash(path.join(targetRoot, "bin", "agy-squad.mjs")).replace(/(["\\$`])/g, "\\$1");
  const escapedExecPath = normalizeSlash(execPath).replace(/(["\\$`])/g, "\\$1");
  return [
    "#!/bin/sh",
    "if command -v node >/dev/null 2>&1; then",
    `  exec node "${cliTarget}" "$@"`,
    "fi",
    `exec "${escapedExecPath}" "${cliTarget}" "$@"`,
    ""
  ].join("\n");
}

async function installCliShims({ targetRoot, log }) {
  const { antigravityBinDir } = resolveProfilePaths();
  await fsPromises.mkdir(antigravityBinDir, { recursive: true });
  const posixShimPath = path.join(antigravityBinDir, "agy-squad");
  const cmdShimPath = path.join(antigravityBinDir, "agy-squad.cmd");

  const posixContent = formatPosixShim(targetRoot);

  const posixChanged = await safeWriteFileIfChanged(posixShimPath, posixContent, 0o755);
  let cmdChanged = false;
  if (os.platform() === "win32") {
    const cmdContent = formatWindowsCmdShim(targetRoot);
    cmdChanged = await safeWriteFileIfChanged(cmdShimPath, cmdContent);
  }
  const verb = posixChanged || cmdChanged ? "installed" : "verified";
  log(`[OK] CLI shim (agy-squad) ${verb} in: ${antigravityBinDir}`);
}

export async function runCheckOnly(options = {}) {
  const { mcpJsonPath, configJsonPath } = resolveProfilePaths();
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
  if (status.details.mcp.corrupt) {
    throw new Error(`Corrupt MCP configuration detected: ${status.details.mcp.error}`);
  }
  if (status.details.config.corrupt) {
    throw new Error(`Corrupt config.json detected: ${status.details.config.error}`);
  }
  log(`[OK] Read-only check passed (currently installed: ${status.isInstalled ? "YES" : "NO"}).`);
  return status;
}

export async function runInstall(options = {}) {
  const {
    pluginsDir,
    pluginDest,
    configJsonPath,
    configBakPath,
    mcpJsonPath,
    mcpBakPath,
    antigravityMcpRootDir,
    antigravityBinDir
  } = resolveProfilePaths();
  const startTime = performance.now();
  const log = options.silent ? () => {} : console.log;
  const warn = options.silent ? () => {} : console.warn;

  const validatedMcp = readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  const validatedConfig = readAndValidateJsonFile(configJsonPath, "config.json");
  if (
    validatedMcp?.mcpServers !== undefined &&
    (!validatedMcp.mcpServers || typeof validatedMcp.mcpServers !== "object" || Array.isArray(validatedMcp.mcpServers))
  ) {
    throw new Error(
      `Existing mcp_config.json (${mcpJsonPath}) field 'mcpServers' must be a JSON object; aborting to preserve user configuration.`
    );
  }
  if (
    validatedConfig?.plugins !== undefined &&
    (!validatedConfig.plugins || typeof validatedConfig.plugins !== "object" || Array.isArray(validatedConfig.plugins))
  ) {
    throw new Error(
      `Existing config.json (${configJsonPath}) field 'plugins' must be a JSON object; aborting to preserve user configuration.`
    );
  }
  const existing = detectExistingInstallation({ includeCompanions: false });

  if (existing.isInstalled) {
    log("Existing Agy-Squad installation detected:");
    if (existing.details.plugin.exists) {
      if (existing.details.plugin.pointsElsewhere) {
        log(`   [WARN] Native Plugin Link: ${pluginDest} (redirected -> ${existing.details.plugin.target}; re-linking)`);
      } else if (existing.details.plugin.versionMismatch) {
        log(`   [WARN] Native Plugin Link: ${pluginDest} (stale v${existing.details.plugin.version}; updating)`);
      } else {
        log(`   [OK] Native Plugin Link: ${pluginDest}`);
      }
    } else if (existing.details.plugin.isSymlink) {
      log(`   [WARN] Native Plugin Link: ${pluginDest} (broken symlink -> ${existing.details.plugin.target}; re-linking)`);
    }
    if (existing.details.mcp.registered) {
      log(`   [OK] Plugin MCP Server (${PLUGIN_KEY}): Registered in ${path.join(pluginDest, "mcp_config.json")}`);
    }
    if (existing.details.cliShim.exists) {
      log(`   [OK] CLI Shim (agy-squad): Installed in ${antigravityBinDir}`);
    }
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
    pluginLst = fs.lstatSync(pluginDest, { bigint: true });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const sourceStat = fs.statSync(repoRoot, { bigint: true });
  // A shim installed from an npm tarball runs directly from the plugin copy.
  const installedSource = pluginLst?.isDirectory() &&
    pluginLst.dev === sourceStat.dev && pluginLst.ino === sourceStat.ino;
  if (pluginLst && !installedSource) {
    if (pluginLst.isSymbolicLink()) {
      await fsPromises.unlink(pluginDest);
    } else {
      await fsPromises.rm(pluginDest, { recursive: true, force: true });
    }
  }

  if (installedSource) {
    await ensurePluginSkillsAndMcpManifest(pluginDest);
    log(`[OK] Native Antigravity Plugin verified: ${pluginDest}`);
  } else if (isTempOrNpx || options.forceCopyFallback) {
    await fsPromises.cp(repoRoot, pluginDest, { recursive: true, filter: copyFilter });
    await ensurePluginSkillsAndMcpManifest(pluginDest);
    log(`[OK] Native Antigravity Plugin installed to: ${pluginDest}`);
  } else {
    await populateLinkedPluginDir(repoRoot, pluginDest);
    log(`[OK] Native Antigravity Plugin linked: ${pluginDest} -> ${repoRoot}`);
  }
  log(`[OK] Plugin skills, docs & manifest verified: ${path.join(pluginDest, "skills")}`);

  // Strip duplicate global mcp_config.json entry; plugin-scoped mcp_config.json is canonical (SQ-DEP-001)
  const hadGlobalMcpEntry = Boolean(
    validatedMcp?.mcpServers &&
      typeof validatedMcp.mcpServers === "object" &&
      !Array.isArray(validatedMcp.mcpServers) &&
      PLUGIN_KEY in validatedMcp.mcpServers
  );
  if (hadGlobalMcpEntry) {
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

  // Sweep stale global/cached agy-squad* MCP schema directories, preserving the host-managed
  // plugin schema directory (agy-squad_agy-squad) once plugin registration is clean.
  const activePluginSchemaDir = `${PLUGIN_KEY}_${PLUGIN_KEY}`;
  const preserveActivePluginSchemaDir =
    existing.details.plugin.exists &&
    !existing.details.plugin.pointsElsewhere &&
    !existing.details.plugin.versionMismatch &&
    existing.details.mcp.pluginRegistered &&
    !hadGlobalMcpEntry;
  if (fs.existsSync(antigravityMcpRootDir)) {
    try {
      for (const entry of fs.readdirSync(antigravityMcpRootDir)) {
        if (entry === PLUGIN_KEY || entry.startsWith(`${PLUGIN_KEY}_`)) {
          if (preserveActivePluginSchemaDir && entry === activePluginSchemaDir) {
            continue;
          }
          await fsPromises.rm(path.join(antigravityMcpRootDir, entry), { recursive: true, force: true });
          log(`[OK] Swept stale MCP schema cache: ${path.join(antigravityMcpRootDir, entry)}`);
        }
      }
    } catch {}
  }

  const nextConfig = validatedConfig ? { ...validatedConfig } : {};
  if (
    nextConfig.plugins !== undefined &&
    (!nextConfig.plugins || typeof nextConfig.plugins !== "object" || Array.isArray(nextConfig.plugins))
  ) {
    throw new Error(
      `Existing config.json (${configJsonPath}) field 'plugins' must be a JSON object; aborting to preserve user configuration.`
    );
  }
  const prevPluginEntry = nextConfig.plugins?.[PLUGIN_KEY];
  if (!prevPluginEntry || typeof prevPluginEntry !== "object" || Array.isArray(prevPluginEntry) || prevPluginEntry.enabled !== true) {
    if (fs.existsSync(configJsonPath) && !fs.existsSync(configBakPath)) {
      try {
        await fsPromises.copyFile(configJsonPath, configBakPath);
      } catch {}
    }
    nextConfig.plugins = {
      ...(nextConfig.plugins && typeof nextConfig.plugins === "object" && !Array.isArray(nextConfig.plugins)
        ? nextConfig.plugins
        : {}),
      [PLUGIN_KEY]: {
        ...(prevPluginEntry && typeof prevPluginEntry === "object" && !Array.isArray(prevPluginEntry)
          ? prevPluginEntry
          : {}),
        enabled: true
      }
    };
    await safeWriteFileIfChanged(configJsonPath, JSON.stringify(nextConfig, null, 2) + "\n");
    log(`[OK] Enabled plugin '${PLUGIN_KEY}' in: ${configJsonPath}`);
  }

  await installCliShims({ targetRoot: pluginDest, log });

  const onPath = isDirOnPath(antigravityBinDir);
  if (!onPath) {
    for (const line of formatPathGuidanceLines(antigravityBinDir)) {
      log(line);
    }
  }

  const companions = detectCompanionDependencies();
  const missingCompanions = [];
  if (!companions.agyContext?.available) {
    missingCompanions.push(`agy-context >= ${MIN_AGY_CONTEXT_VERSION}`);
  }
  if (!companions.rtk?.available) {
    missingCompanions.push(`rtk >= ${MIN_RTK_VERSION}`);
  }
  if (missingCompanions.length > 0) {
    log(`[NEXT STEP] Optional companion tools not ready (${missingCompanions.join(", ")}):`);
    log("            - For full live integrity trace audits, install Agy-Context-Saver (>= 2.0.1, 2.0.4+ recommended): npx --package=agy-context-saver agy-context setup");
    log("            - For standalone usage without live trace audits, pass --no-integrity to 'agy-squad plan' and --allow-unaudited to 'agy-squad bundle' or 'agy-squad finalize'.");
  }

  const elapsed = (performance.now() - startTime).toFixed(1);
  log(`\nAgy-Squad installation ${existing.isInstalled ? "synchronized & up-to-date" : "completed"} in ${elapsed}ms!`);
  log("Next steps: reload or restart Antigravity Desktop IDE (if open) so the registered 'agy-squad' MCP server and skills load, then run 'agy-squad status' (or 'npx --package=agy-squad agy-squad status').\n");
  const finalStatus = detectExistingInstallation({ includeCompanions: false });
  finalStatus.details.companions = companions;
  return { ...finalStatus, isInstalled: true, elapsedMs: elapsed };
}

export async function runRestoreBackups(options = {}) {
  const {
    configJsonPath,
    configBakPath,
    legacyConfigBakPath,
    mcpJsonPath,
    mcpBakPath,
    legacyMcpBakPath
  } = resolveProfilePaths();
  const log = options.silent ? () => {} : console.log;
  let restoredCount = 0;

  if (fs.existsSync(mcpBakPath)) {
    await fsPromises.copyFile(mcpBakPath, mcpJsonPath);
    await fsPromises.unlink(mcpBakPath);
    log(`[OK] Restored backup: ${mcpBakPath} -> ${mcpJsonPath}`);
    restoredCount += 1;
  } else if (fs.existsSync(legacyMcpBakPath)) {
    try {
      const legacyMcp = JSON.parse(fs.readFileSync(legacyMcpBakPath, "utf8"));
      if (
        legacyMcp &&
        typeof legacyMcp === "object" &&
        !Array.isArray(legacyMcp) &&
        legacyMcp.mcpServers &&
        typeof legacyMcp.mcpServers === "object" &&
        !Array.isArray(legacyMcp.mcpServers) &&
        PLUGIN_KEY in legacyMcp.mcpServers
      ) {
        await fsPromises.copyFile(legacyMcpBakPath, mcpJsonPath);
        log(`[OK] Restored legacy backup (read-only fallback): ${legacyMcpBakPath} -> ${mcpJsonPath}`);
        restoredCount += 1;
      }
    } catch {}
  }

  if (fs.existsSync(configBakPath)) {
    await fsPromises.copyFile(configBakPath, configJsonPath);
    await fsPromises.unlink(configBakPath);
    log(`[OK] Restored backup: ${configBakPath} -> ${configJsonPath}`);
    restoredCount += 1;
  } else if (fs.existsSync(legacyConfigBakPath)) {
    try {
      const legacyCfg = JSON.parse(fs.readFileSync(legacyConfigBakPath, "utf8"));
      if (legacyCfg && typeof legacyCfg === "object" && !Array.isArray(legacyCfg)) {
        await fsPromises.copyFile(legacyConfigBakPath, configJsonPath);
        log(`[OK] Restored legacy backup (read-only fallback): ${legacyConfigBakPath} -> ${configJsonPath}`);
        restoredCount += 1;
      }
    } catch {}
  }

  if (restoredCount === 0) {
    log("[INFO] No backup files (*.bak) found to restore.");
  }
  return { restoredCount };
}

export async function runUninstall(options = {}) {
  const {
    pluginDest,
    configJsonPath,
    mcpJsonPath,
    antigravityMcpRootDir,
    antigravityBinDir
  } = resolveProfilePaths();
  const log = options.silent ? () => {} : console.log;
  log("Uninstalling Agy-Squad...");

  const validatedMcp = readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  const validatedConfig = readAndValidateJsonFile(configJsonPath, "config.json");

  let pluginStat = null;
  try {
    pluginStat = fs.lstatSync(pluginDest);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  if (pluginStat) {
    if (pluginStat.isSymbolicLink()) {
      await fsPromises.unlink(pluginDest);
    } else {
      await fsPromises.rm(pluginDest, { recursive: true, force: true });
    }
    log(`[OK] Removed plugin installation: ${pluginDest}`);
  }

  const repoSkillsLink = path.join(repoRoot, "skills");
  try {
    if (fs.lstatSync(repoSkillsLink).isSymbolicLink()) {
      await fsPromises.unlink(repoSkillsLink);
    }
  } catch {}

  if (validatedMcp?.mcpServers && typeof validatedMcp.mcpServers === "object" && !Array.isArray(validatedMcp.mcpServers)) {
    const nextServers = { ...validatedMcp.mcpServers };
    delete nextServers[PLUGIN_KEY];
    const nextMcp = { ...validatedMcp, mcpServers: nextServers };
    await safeWriteFileIfChanged(mcpJsonPath, JSON.stringify(nextMcp, null, 2) + "\n");
    log(`[OK] Removed '${PLUGIN_KEY}' from: ${mcpJsonPath} (foreign entries preserved)`);
  }

  if (
    validatedConfig?.plugins &&
    typeof validatedConfig.plugins === "object" &&
    !Array.isArray(validatedConfig.plugins) &&
    PLUGIN_KEY in validatedConfig.plugins
  ) {
    const nextPlugins = { ...validatedConfig.plugins };
    delete nextPlugins[PLUGIN_KEY];
    const nextConfig = { ...validatedConfig, plugins: nextPlugins };
    await safeWriteFileIfChanged(configJsonPath, JSON.stringify(nextConfig, null, 2) + "\n");
    log(`[OK] Removed '${PLUGIN_KEY}' plugin state from: ${configJsonPath}`);
  }

  for (const shimName of ["agy-squad", "agy-squad.cmd"]) {
    const shimPath = path.join(antigravityBinDir, shimName);
    try {
      await fsPromises.unlink(shimPath);
      log(`[OK] Removed CLI shim: ${shimPath}`);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
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
    return `- ${label}: OUTDATED (${info.rawVersion || info.version} < ${info.minVersion} at ${info.path}; non-fatal: ${note})`;
  }
  return `- ${label}: MISSING (non-fatal: ${note})`;
}

export function printStatus(options = {}) {
  const log = options.silent ? () => {} : console.log;
  const status = detectExistingInstallation({ includeCompanions: true });
  const plug = status.details.plugin;
  const pluginNote = !plug.exists
    ? (plug.isSymlink
        ? `BROKEN SYMLINK (${plug.path} -> ${plug.target}; re-run agy-squad setup)`
        : `MISSING (${plug.path})`)
    : plug.pointsElsewhere
      ? `REDIRECTED (${plug.path} -> ${plug.target}; re-run agy-squad setup)`
      : plug.versionMismatch
        ? `STALE VERSION (${plug.version} != ${PACKAGE_VERSION} at ${plug.path}; re-run agy-squad setup)`
        : !plug.runtimeReady || !plug.docsReady
          ? `INCOMPLETE (${plug.path}; re-run agy-squad setup)`
          : plug.isCopyFallback
            ? `ACTIVE COPY (${plug.path})`
            : `ACTIVE (${plug.path})`;
  log("Checking Agy-Squad installation status...\n");
  log(`- Native Plugin Link: ${pluginNote}`);
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
      status.details.mcp.corrupt
        ? `CORRUPT (${status.details.mcp.error})`
        : status.details.mcp.registered
          ? "REGISTERED (plugin mcp_config.json only)"
          : status.details.mcp.globalDuplicate
            ? "DUPLICATE GLOBAL ENTRY (re-run agy-squad setup)"
            : "MISSING"
    } (${status.details.mcp.path})`
  );
  log(
    `- CLI Shim (agy-squad): ${
      status.details.cliShim.exists
        ? (status.details.cliShim.onPath ? "INSTALLED (on PATH)" : "INSTALLED (not on PATH)")
        : "MISSING"
    } (${status.details.cliShim.path})`
  );
  if (status.details.cliShim.exists && !status.details.cliShim.onPath) {
    for (const line of formatPathGuidanceLines(status.details.cliShim.path)) {
      log(line);
    }
  }
  log(
    `- Plugin Enabled (config.json / plugin.json): ${
      status.details.config.corrupt
        ? `CORRUPT (${status.details.config.error})`
        : status.details.config.enabled
          ? "ENABLED"
          : "DISABLED"
    }`
  );
  const { agyContext, rtk } = status.details.companions || {};
  log(formatCompanionLine("Companion CLI (agy-context >= 2.0.1)", agyContext, "needed for integrity trace audits"));
  log(formatCompanionLine("Companion Optimizer (rtk >= 1.1.0)", rtk, "needed by Agy-Context-Saver hooks"));
  if (!agyContext?.available || !rtk?.available) {
    log("[INFO] Companion tools are non-fatal for offline bundle/verify; install Agy-Context-Saver (>= 2.0.1, 2.0.4+ recommended) + RTK (>= 1.1.0) for full live integrity audits, or pass --no-integrity to 'agy-squad plan' and --allow-unaudited to 'agy-squad bundle' or 'agy-squad finalize' for standalone runs.");
  }
  const overallLabel = status.isComplete
    ? "HEALTHY & ACTIVE"
    : status.details.mcp.corrupt || status.details.config.corrupt
      ? "CORRUPT CONFIGURATION"
      : status.isInstalled
        ? (!status.details.config.enabled ? "DISABLED" : "PARTIAL INSTALLATION")
        : "NOT INSTALLED";
  log(`\nOverall Status: ${overallLabel}`);
  if (overallLabel === "NOT INSTALLED" || overallLabel === "PARTIAL INSTALLATION") {
    log("Next step: run 'npx --package=agy-squad agy-squad setup' (or 'agy-squad setup') to install/repair.");
  }
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

function isDirectExecution() {
  if (!process.argv[1]) return false;
  const tryRealpath = (p) => {
    try {
      return fs.realpathSync(p);
    } catch {
      return path.resolve(p);
    }
  };
  const resolvedArg = tryRealpath(path.resolve(process.argv[1]));
  const resolvedSelf = tryRealpath(fileURLToPath(import.meta.url));
  if (resolvedArg === resolvedSelf) return true;
  if (os.platform() === "win32" || os.platform() === "darwin") {
    return resolvedArg.toLowerCase() === resolvedSelf.toLowerCase();
  }
  return false;
}

if (isDirectExecution()) {
  const args = process.argv.slice(2);
  const knownFlags = new Set(["--help", "-h", "--uninstall", "--status", "--check", "-c", "--restore-backups", "--json"]);
  const knownPositionals = new Set(["help", "uninstall", "status", "restore-backups"]);
  for (const arg of args) {
    if (arg.startsWith("-")) {
      if (!knownFlags.has(arg)) {
        console.error(`Unknown option '${arg}'. Run 'node scripts/install-register.mjs --help' for usage.`);
        process.exit(1);
      }
    } else if (!knownPositionals.has(arg)) {
      console.error(`Unknown argument '${arg}'. Run 'node scripts/install-register.mjs --help' for usage.`);
      process.exit(1);
    }
  }

  const isHelp = args.includes("--help") || args.includes("-h") || args.includes("help");
  const isUninstall = args.includes("--uninstall") || args.includes("uninstall");
  const isStatus = args.includes("--status") || args.includes("status");
  const isCheck = args.includes("--check") || args.includes("-c");
  const isRestoreBackups = args.includes("--restore-backups") || args.includes("restore-backups");
  const isJson = args.includes("--json");

  if (isHelp) {
    if (isUninstall || isStatus || isCheck || isRestoreBackups || isJson) {
      console.error("Conflicting flags: --help cannot be combined with operational flags.");
      process.exit(1);
    }
    printCliHelp();
    process.exit(0);
  }
  if ((isCheck || isStatus) && (isUninstall || isRestoreBackups)) {
    console.error("Conflicting flags: read-only flags (--check, --status) cannot be combined with --uninstall or --restore-backups.");
    process.exit(1);
  }
  if (isCheck && isStatus) {
    console.error("Conflicting flags: specify either --check or --status, not both.");
    process.exit(1);
  }
  if (isJson && !isStatus) {
    console.error("Invalid flag: --json is only supported with --status.");
    process.exit(1);
  }

  try {
    if (isStatus) {
      const st = printStatus({ silent: isJson });
      if (isJson) {
        console.log(JSON.stringify(st, null, 2));
      }
      process.exit(st.isComplete ? 0 : 1);
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
