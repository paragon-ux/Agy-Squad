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

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const fsPromises = fs.promises;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const PACKAGE_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).version || "0.2.2";
  } catch {
    return "0.2.2";
  }
})();

const PLUGIN_KEY = "agy-squad";
export const MIN_NODE_MAJOR = 22;
const MIN_NODE_VERSION = `${MIN_NODE_MAJOR}.0.0`;
export const SHIPPED_SKILLS = Object.freeze(["pr-review", "full-review", "day-one-review", "swarm-governance"]);
export const MAINTAINER_SKILLS = Object.freeze(["self-diagnosis", "platform-fit"]);
const COPY_EXCLUDED_TOP_DIRS = new Set([".git", ".github", "node_modules", ".venv", ".cache", "scratch", "site", "benchmarks", "tests"]);
const COPY_EXCLUDED_PATHS = Object.freeze([
  ...MAINTAINER_SKILLS.map((skill) => `.agents/skills/${skill}`),
  "scripts/release-preflight.mjs",
  "docs/plans",
  "docs/reviews"
]);

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

export function isNodeVersionSupported(versionStr = process.versions.node, minMajor = MIN_NODE_MAJOR) {
  if (typeof versionStr !== "string") return false;
  const match = versionStr.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return Boolean(match && Number.parseInt(match[1], 10) >= minMajor);
}

export function assertNodeVersion(versionStr = process.versions.node, minMajor = MIN_NODE_MAJOR) {
  if (!isNodeVersionSupported(versionStr, minMajor)) {
    const cleaned = typeof versionStr === "string" ? versionStr.trim().replace(/^v/i, "") : "";
    const foundLabel = cleaned ? `v${cleaned}` : "unknown";
    throw new Error(`Agy-Squad requires Node.js >= ${minMajor}.0.0 (found ${foundLabel}). Please upgrade Node.js.`);
  }
}

export { assertNodeVersion as assertSupportedNodeVersion };

export function isDirectEntryPoint(
  argv1 = process.argv[1],
  selfPathOrUrl = import.meta.url,
  platform = process.platform
) {
  if (!argv1 || !selfPathOrUrl) return false;
  const selfPath =
    selfPathOrUrl instanceof URL || (typeof selfPathOrUrl === "string" && selfPathOrUrl.startsWith("file:"))
      ? fileURLToPath(selfPathOrUrl)
      : selfPathOrUrl;
  const pathImpl = platform === "win32" ? path.win32 : path.posix;
  const normalizeForPlatform = (p) => {
    let resolved;
    if (platform === process.platform) {
      try {
        resolved = fs.realpathSync.native(path.resolve(p));
      } catch {
        resolved = path.resolve(p);
      }
    } else {
      resolved = pathImpl.resolve(p);
    }
    if (platform === "win32") return resolved.replace(/\\/g, "/").toLowerCase();
    if (platform === "darwin") return resolved.toLowerCase();
    return resolved;
  };
  return normalizeForPlatform(argv1) === normalizeForPlatform(selfPath);
}

function normalizeSlash(p) {
  return p.replace(/\\/g, "/");
}

function stripTrailingSeparators(value) {
  let end = value.length;
  while (end > 0 && (value.charCodeAt(end - 1) === 47 || value.charCodeAt(end - 1) === 92)) {
    end -= 1;
  }
  return end > 0 ? value.slice(0, end) : value;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isLocalGitCheckout(dir = repoRoot) {
  return (
    fs.existsSync(path.join(dir, ".git")) &&
    !dir.includes("_npx") &&
    !dir.includes("npm-cache") &&
    !dir.includes("node_modules")
  );
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
      resolved = fs.realpathSync.native(resolved);
    } catch {}
  }
  resolved = stripTrailingSeparators(resolved);
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
    const psBin = String(antigravityBinDir).replace(/'/g, "''");
    return [
      `[WARN] CLI bin directory is not on your PATH: ${antigravityBinDir}`,
      `       PowerShell (current session): $bin = '${psBin}'; $parts = @($env:Path -split ';' | Where-Object { $_.Trim() }); if (@($parts | ForEach-Object { $_.TrimEnd('\\') }) -notcontains $bin.TrimEnd('\\')) { $env:Path = ($parts + $bin) -join ';' }`,
      `       PowerShell (persist for user, preserves REG_EXPAND_SZ): $bin = '${psBin}'; $k = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment'); try { $cur = [string]$k.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); $parts = @($cur -split ';' | Where-Object { $_.Trim() }); $norm = @($parts | ForEach-Object { $_.TrimEnd('\\') }); if ($norm -notcontains $bin.TrimEnd('\\') -and $norm -notcontains '%USERPROFILE%\\.gemini\\antigravity\\bin') { $k.SetValue('Path', (($parts + $bin) -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString) } } finally { $k.Close() }`,
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
  let effectiveMode = mode;
  try {
    if (fs.existsSync(filePath)) {
      if (effectiveMode === undefined && os.platform() !== "win32") {
        effectiveMode = fs.statSync(filePath).mode & 0o777;
      }
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
  const tmpPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const writeOpts = effectiveMode !== undefined
    ? { encoding: "utf8", flag: "wx", mode: effectiveMode }
    : { encoding: "utf8", flag: "wx" };
  try {
    await fsPromises.writeFile(tmpPath, content, writeOpts);
    if (effectiveMode !== undefined && os.platform() !== "win32") {
      await fsPromises.chmod(tmpPath, effectiveMode);
    }
    await fsPromises.rename(tmpPath, filePath);
  } catch (err) {
    if (err?.code !== "EEXIST") {
      try {
        await fsPromises.unlink(tmpPath);
      } catch {}
    }
    throw err;
  }
  return true;
}

function inspectJsonObject(filePath, label) {
  if (!fs.existsSync(filePath)) return { exists: false, data: null, error: null, readError: false };
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return { exists: true, data: null, error: `Cannot read ${label} (${filePath}): ${err.message}`, readError: true };
  }
  if (!raw.trim()) {
    return { exists: true, data: null, error: `${label} is empty`, readError: false };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { exists: true, data: null, error: `${label} contains malformed JSON (${err.message})`, readError: false };
  }
  if (!isPlainObject(parsed)) {
    return { exists: true, data: null, error: `${label} root must be a JSON object`, readError: false };
  }
  return { exists: true, data: parsed, error: null, readError: false };
}

function readAndValidateJsonFile(filePath, label) {
  const result = inspectJsonObject(filePath, label);
  if (!result.exists) return null;
  if (result.error) {
    if (result.readError) throw new Error(result.error);
    throw new Error(`Existing ${result.error.replace(label, `${label} (${filePath})`)}; aborting to preserve user configuration.`);
  }
  return result.data;
}

export function detectExistingInstallation(options = {}) {
  const {
    pluginDest,
    configJsonPath,
    mcpJsonPath,
    antigravityMcpRootDir,
    antigravityBinDir
  } = resolveProfilePaths();
  const nodeVersion = typeof options.nodeVersion === "string" ? options.nodeVersion : process.versions.node;
  const pluginMcpJsonPath = path.join(pluginDest, "mcp_config.json");
  const details = {
    runtime: {
      nodeVersion,
      minNodeVersion: MIN_NODE_VERSION,
      supported: isNodeVersionSupported(nodeVersion)
    },
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
    config: { enabled: false, corrupt: false, error: null, path: configJsonPath }
  };

  const isLocalCheckout = isLocalGitCheckout();
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
            details.plugin.pointsElsewhere = !pathsEqual(fs.realpathSync.native(pluginDest), fs.realpathSync.native(repoRoot));
          } catch {
            details.plugin.pointsElsewhere = true;
          }
        }
      } else {
        const linkedDirs = [
          ["assets", "assets"],
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
                  pathsEqual(fs.realpathSync.native(linkPath), fs.realpathSync.native(localAgentsSkills))
                ) {
                  continue;
                }
              } catch {}
            }
            details.plugin.isSymlink = true;
            let subdirRedirected = false;
            if (isLocalCheckout) {
              try {
                if (!pathsEqual(fs.realpathSync.native(linkPath), fs.realpathSync.native(path.join(repoRoot, repoRel)))) {
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
      details.plugin.skillsReady = SHIPPED_SKILLS.every((skillName) =>
        fs.existsSync(path.join(skillsPath, skillName, "SKILL.md"))
      );
      details.plugin.docsReady = fs.existsSync(path.join(pluginDest, "docs", "tools.md"));
      let logoTarget = "assets/logo.svg";
      try {
        const installedPlugin = JSON.parse(fs.readFileSync(path.join(pluginDest, "plugin.json"), "utf8"));
        if (typeof installedPlugin?.logo === "string" && installedPlugin.logo.trim()) {
          logoTarget = installedPlugin.logo.trim();
        }
      } catch {}
      const resolvedLogoPath = path.resolve(pluginDest, logoTarget);
      const logoInsidePlugin =
        resolvedLogoPath === pluginDest || resolvedLogoPath.startsWith(pluginDest + path.sep);
      details.plugin.runtimeReady =
        fs.existsSync(path.join(pluginDest, "package.json")) &&
        fs.existsSync(path.join(pluginDest, "plugin.json")) &&
        Boolean(details.plugin.version) &&
        logoInsidePlugin &&
        fs.existsSync(resolvedLogoPath) &&
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

  const appendMcpError = (errMsg) => {
    details.mcp.corrupt = true;
    details.mcp.error = details.mcp.error ? `${details.mcp.error}; ${errMsg}` : errMsg;
  };

  const pluginMcpCheck = inspectJsonObject(pluginMcpJsonPath, "plugin mcp_config.json");
  if (pluginMcpCheck.error) {
    appendMcpError(pluginMcpCheck.error);
  } else if (pluginMcpCheck.data) {
    if (pluginMcpCheck.data.mcpServers !== undefined && !isPlainObject(pluginMcpCheck.data.mcpServers)) {
      appendMcpError("plugin mcp_config.json field 'mcpServers' must be a JSON object");
    } else {
      const entry = pluginMcpCheck.data.mcpServers?.[PLUGIN_KEY];
      if (entry && typeof entry.command === "string" && entry.command.trim() && Array.isArray(entry.args) && entry.args.length > 0) {
        const isRegularFile = (filePath) => {
          try {
            return fs.statSync(filePath).isFile();
          } catch {
            return false;
          }
        };
        const usesLocalLauncher = entry.command === "/bin/sh" && entry.args[0] === "./mcp-launch.sh";
        const isAbsoluteCmd = path.isAbsolute(entry.command) || /^[a-zA-Z]:[\\/]/.test(entry.command);
        const commandReady = usesLocalLauncher
          ? isRegularFile(path.join(pluginDest, "mcp-launch.sh"))
          : !isAbsoluteCmd || isRegularFile(entry.command);
        if (commandReady) {
          details.mcp.pluginRegistered = true;
        }
      }
    }
  }

  const globalMcpCheck = inspectJsonObject(mcpJsonPath, "mcp_config.json");
  let hasGlobalMcpEntry = false;
  if (globalMcpCheck.error) {
    appendMcpError(globalMcpCheck.error);
  } else if (globalMcpCheck.data) {
    if (globalMcpCheck.data.mcpServers !== undefined && !isPlainObject(globalMcpCheck.data.mcpServers)) {
      appendMcpError("mcp_config.json field 'mcpServers' must be a JSON object");
    } else if (globalMcpCheck.data.mcpServers && Object.hasOwn(globalMcpCheck.data.mcpServers, PLUGIN_KEY)) {
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
    if (cfgCheck.data.plugins !== undefined && !isPlainObject(cfgCheck.data.plugins)) {
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

  const isInstalled =
    details.plugin.exists ||
    Boolean(pluginLst) ||
    details.mcp.pluginRegistered ||
    details.mcp.globalDuplicate ||
    details.cliShim.exists;

  const isComplete =
    details.runtime.supported &&
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

export function createCopyFilter(sourceRoot = repoRoot) {
  return (src) => {
    const rel = normalizeSlash(path.relative(sourceRoot, src));
    if (!rel) return true;
    if (COPY_EXCLUDED_TOP_DIRS.has(rel.split("/")[0])) return false;
    return !COPY_EXCLUDED_PATHS.some((excluded) => rel === excluded || rel.startsWith(`${excluded}/`));
  };
}

export async function populateLinkedPluginDir(sourceRoot, targetPluginDir, options = {}) {
  const symlinkSyncImpl = options.symlinkSync || fs.symlinkSync;
  const copyFilter = createCopyFilter(sourceRoot);
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
      symlinkSyncImpl(srcTarget, destPath, isWin ? "junction" : "dir");
    } catch {
      if (name === "skills") {
        // ensurePluginSkillsAndMcpManifest wires pluginDest/skills from the already-filtered .agents/skills copy
        continue;
      }
      await fsPromises.cp(srcTarget, destPath, { recursive: true, filter: copyFilter });
    }
  }
  await ensurePluginSkillsAndMcpManifest(targetPluginDir, options);
}
function validateAndEscapePosixPath(value, label) {
  if (typeof value !== "string" || !value.trim() || /[\r\n\0]/.test(value)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`);
  }
  return normalizeSlash(value).replace(/(["\\$`])/g, "\\$1");
}

function formatPosixNodeWrapper({ execPath = process.execPath, scriptPath = null, label = "POSIX wrapper" } = {}) {
  const escapedExecPath = validateAndEscapePosixPath(execPath, `${label} execPath`);
  const scriptArg = scriptPath !== null
    ? `"${validateAndEscapePosixPath(scriptPath, `${label} target path`)}" `
    : "";
  return [
    "#!/bin/sh",
    "if command -v node >/dev/null 2>&1; then",
    '  NODE_MAJOR="$(node -p \'process.versions.node.split(".")[0]\' 2>/dev/null || echo 0)"',
    '  NODE_MAJOR="${NODE_MAJOR%%[!0-9]*}"',
    `  if [ "\${NODE_MAJOR:-0}" -ge ${MIN_NODE_MAJOR} ] 2>/dev/null; then`,
    `    exec node ${scriptArg}"$@"`,
    "  fi",
    "fi",
    `if [ -x "${escapedExecPath}" ]; then`,
    `  exec "${escapedExecPath}" ${scriptArg}"$@"`,
    "fi",
    `exec node ${scriptArg}"$@"`,
    ""
  ].join("\n");
}

export function formatPosixMcpLauncher(execPath = process.execPath) {
  return formatPosixNodeWrapper({ execPath, label: "POSIX MCP launcher" });
}

async function ensurePluginSkillsAndMcpManifest(targetPluginDir, options = {}) {
  const symlinkSyncImpl = options.symlinkSync || fs.symlinkSync;
  const isWin = os.platform() === "win32";
  const dotAgentsSkills = path.join(targetPluginDir, ".agents", "skills");
  const skillsDest = path.join(targetPluginDir, "skills");
  if (!(isWin && options.skipWindowsJunction) && !fs.existsSync(skillsDest) && fs.existsSync(dotAgentsSkills)) {
    try {
      const linkStat = fs.lstatSync(skillsDest);
      if (linkStat.isSymbolicLink()) {
        await fsPromises.unlink(skillsDest);
      }
    } catch {}
    try {
      symlinkSyncImpl(
        isWin ? dotAgentsSkills : path.join(".agents", "skills"),
        skillsDest,
        isWin ? "junction" : "dir"
      );
    } catch {
      await fsPromises.cp(dotAgentsSkills, skillsDest, { recursive: true });
    }
  }

  let mcpEntry;
  if (isWin) {
    mcpEntry = {
      command: process.execPath,
      args: ["./mcp/index.js"]
    };
  } else {
    const launcherPath = path.join(targetPluginDir, "mcp-launch.sh");
    await safeWriteFileIfChanged(launcherPath, formatPosixMcpLauncher(process.execPath), 0o755);
    mcpEntry = {
      command: "/bin/sh",
      args: ["./mcp-launch.sh", "./mcp/index.js"]
    };
  }

  const pluginMcpJson = path.join(targetPluginDir, "mcp_config.json");
  const pluginMcpContent = JSON.stringify(
    {
      mcpServers: {
        [PLUGIN_KEY]: mcpEntry
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
    "setlocal DisableDelayedExpansion",
    "where node.exe >nul 2>nul",
    "if errorlevel 1 goto :fallback",
    `node.exe -e "process.exit(Math.min(parseInt(process.versions.node,10),${MIN_NODE_MAJOR})===${MIN_NODE_MAJOR}?0:1)" >nul 2>nul`,
    "if errorlevel 1 goto :fallback",
    // A label-less GOTO ends the batch context so the queued executable can
    // delete this shim and return its own status.
    `(goto) 2>nul & node.exe "${escapedTarget}" %*`,
    ":fallback",
    `(goto) 2>nul & "${escapedExecPath}" "${escapedTarget}" %*`,
    ""
  ].join("\r\n");
}

export function formatPosixShim(targetRoot, execPath = process.execPath) {
  validateAndEscapePosixPath(targetRoot, "POSIX CLI shim target path");
  const cliTarget = path.join(targetRoot, "bin", "agy-squad.mjs");
  return formatPosixNodeWrapper({ execPath, scriptPath: cliTarget, label: "POSIX CLI shim" });
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

async function removeFsEntry(targetPath, knownStat = null) {
  let lst = knownStat;
  if (!lst) {
    try {
      lst = fs.lstatSync(targetPath);
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
  }
  if (lst.isSymbolicLink()) {
    await fsPromises.unlink(targetPath);
  } else {
    await fsPromises.rm(targetPath, { recursive: true, force: true });
  }
}

async function stageAndSwapPluginDir({ pluginDest, pluginLst, stageInto, afterSwap, warn }) {
  const stagingDir = `${pluginDest}.staging-${crypto.randomUUID()}`;
  const backupDir = `${pluginDest}.backup-${crypto.randomUUID()}`;
  let movedOldToBackup = false;
  let swappedInStaging = false;
  try {
    await stageInto(stagingDir);
    if (pluginLst) {
      await fsPromises.rename(pluginDest, backupDir);
      movedOldToBackup = true;
    }
    await fsPromises.rename(stagingDir, pluginDest);
    swappedInStaging = true;
    if (afterSwap) {
      await afterSwap(pluginDest);
    }
  } catch (err) {
    if (swappedInStaging) {
      try {
        await fsPromises.rename(pluginDest, stagingDir);
        swappedInStaging = false;
      } catch {}
    }
    if (movedOldToBackup && !swappedInStaging) {
      try {
        await fsPromises.rename(backupDir, pluginDest);
        movedOldToBackup = false;
      } catch {}
    }
    try {
      await removeFsEntry(stagingDir);
    } catch {}
    throw err;
  }
  if (movedOldToBackup) {
    try {
      await removeFsEntry(backupDir);
    } catch (err) {
      warn(`[WARN] Could not clean up prior plugin backup (${backupDir}): ${err.message}`);
    }
  }
}

export async function runCheckOnly(options = {}) {
  assertNodeVersion();
  const { mcpJsonPath, configJsonPath } = resolveProfilePaths();
  const log = options.silent ? () => {} : console.log;
  log("Running Agy-Squad read-only preflight check (--check)...");

  for (const requiredRel of [
    "package.json",
    "plugin.json",
    "bin/agy-squad.mjs",
    "mcp/index.js",
    ...SHIPPED_SKILLS.map((skillName) => `.agents/skills/${skillName}/SKILL.md`)
  ]) {
    const abs = path.join(repoRoot, requiredRel);
    if (!fs.existsSync(abs)) {
      throw new Error(`Required repository file missing: ${requiredRel}`);
    }
  }

  readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  readAndValidateJsonFile(configJsonPath, "config.json");

  const status = detectExistingInstallation();
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
  assertNodeVersion();
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
  if (validatedMcp?.mcpServers !== undefined && !isPlainObject(validatedMcp.mcpServers)) {
    throw new Error(
      `Existing mcp_config.json (${mcpJsonPath}) field 'mcpServers' must be a JSON object; aborting to preserve user configuration.`
    );
  }
  if (validatedConfig?.plugins !== undefined && !isPlainObject(validatedConfig.plugins)) {
    throw new Error(
      `Existing config.json (${configJsonPath}) field 'plugins' must be a JSON object; aborting to preserve user configuration.`
    );
  }
  const existing = detectExistingInstallation();

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
  const isTempOrNpx = !isLocalGitCheckout();
  const copyFilter = createCopyFilter(repoRoot);

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

  if (installedSource) {
    await ensurePluginSkillsAndMcpManifest(pluginDest);
    log(`[OK] Native Antigravity Plugin verified: ${pluginDest}`);
  } else if (isTempOrNpx || options.forceCopyFallback) {
    await stageAndSwapPluginDir({
      pluginDest,
      pluginLst,
      warn,
      stageInto: async (stagingDir) => {
        await fsPromises.cp(repoRoot, stagingDir, { recursive: true, filter: copyFilter });
        await ensurePluginSkillsAndMcpManifest(stagingDir, { skipWindowsJunction: true });
      },
      afterSwap: os.platform() === "win32" ? (finalDir) => ensurePluginSkillsAndMcpManifest(finalDir) : null
    });
    log(`[OK] Native Antigravity Plugin installed to: ${pluginDest}`);
  } else {
    await stageAndSwapPluginDir({
      pluginDest,
      pluginLst,
      warn,
      stageInto: (stagingDir) => populateLinkedPluginDir(repoRoot, stagingDir)
    });
    log(`[OK] Native Antigravity Plugin linked: ${pluginDest} -> ${repoRoot}`);
  }
  log(`[OK] Plugin skills, docs & manifest verified: ${path.join(pluginDest, "skills")}`);

  // Strip duplicate global mcp_config.json entry; plugin-scoped mcp_config.json is canonical (SQ-DEP-001)
  const hadGlobalMcpEntry = Boolean(
    isPlainObject(validatedMcp?.mcpServers) && Object.hasOwn(validatedMcp.mcpServers, PLUGIN_KEY)
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
          await safeWriteFileIfChanged(mcpBakPath, currentRaw, 0o600);
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
  const prevPluginEntry = nextConfig.plugins?.[PLUGIN_KEY];
  if (!isPlainObject(prevPluginEntry) || prevPluginEntry.enabled !== true) {
    if (fs.existsSync(configJsonPath) && !fs.existsSync(configBakPath)) {
      try {
        const currentCfgRaw = fs.readFileSync(configJsonPath, "utf8");
        await safeWriteFileIfChanged(configBakPath, currentCfgRaw, 0o600);
      } catch {}
    }
    nextConfig.plugins = {
      ...(isPlainObject(nextConfig.plugins) ? nextConfig.plugins : {}),
      [PLUGIN_KEY]: {
        ...(isPlainObject(prevPluginEntry) ? prevPluginEntry : {}),
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

  const elapsed = (performance.now() - startTime).toFixed(1);
  log(`\nAgy-Squad installation ${existing.isInstalled ? "synchronized & up-to-date" : "completed"} in ${elapsed}ms!`);
  log("Next steps: reload or restart Antigravity Desktop IDE (if open) so the registered 'agy-squad' MCP server and skills load, then run 'agy-squad status' (or 'npx --package=agy-squad agy-squad status').\n");
  const finalStatus = detectExistingInstallation();
  return { ...finalStatus, isInstalled: true, elapsedMs: elapsed };
}

function isOwnMcpServerKey(key) {
  return key === PLUGIN_KEY;
}

function hasForeignBackupData(backupData, sectionKey, keyFilter) {
  if (!isPlainObject(backupData)) return false;
  for (const topKey of Object.keys(backupData)) {
    if (topKey !== sectionKey) return true;
  }
  if (isPlainObject(backupData[sectionKey])) {
    for (const key of Object.keys(backupData[sectionKey])) {
      if (!keyFilter(key)) return true;
    }
  }
  return false;
}

function prepareRestoreJsonSection({
  targetPath,
  targetLabel,
  backupPath,
  legacyBackupPath,
  sectionKey,
  keyFilter
}) {
  const hasPrimary = fs.existsSync(backupPath);
  const hasLegacy = !hasPrimary && fs.existsSync(legacyBackupPath);
  if (!hasPrimary && !hasLegacy) return null;

  let backupData;
  if (hasPrimary) {
    backupData = readAndValidateJsonFile(backupPath, `${targetLabel} backup`);
    if (backupData[sectionKey] !== undefined && !isPlainObject(backupData[sectionKey])) {
      throw new Error(
        `Backup ${targetLabel} (${backupPath}) field '${sectionKey}' must be a JSON object; aborting restore to preserve user configuration.`
      );
    }
  } else {
    try {
      backupData = readAndValidateJsonFile(legacyBackupPath, `legacy ${targetLabel} backup`);
    } catch {
      return null;
    }
    if (!isPlainObject(backupData?.[sectionKey])) {
      return null;
    }
    if (!Object.keys(backupData[sectionKey]).some(keyFilter)) {
      return null;
    }
  }

  const currentData = readAndValidateJsonFile(targetPath, targetLabel);
  if (currentData && currentData[sectionKey] !== undefined && !isPlainObject(currentData[sectionKey])) {
    throw new Error(
      `Existing ${targetLabel} (${targetPath}) field '${sectionKey}' must be a JSON object; aborting restore to preserve user configuration.`
    );
  }

  const backupSection = isPlainObject(backupData?.[sectionKey]) ? backupData[sectionKey] : {};
  const ownBackupKeys = Object.keys(backupSection).filter(keyFilter);
  const hasForeignBackup = hasForeignBackupData(backupData, sectionKey, keyFilter);

  if (!currentData && hasPrimary && hasForeignBackup) {
    return {
      targetPath,
      content: null,
      mode: undefined,
      unlinkBackupPath: null,
      logMessage: `[WARN] Retained backup without recreating ${targetLabel} (live ${targetLabel} is missing and backup contains non-${PLUGIN_KEY} settings that scoped restore does not recover; restore manually if needed): ${backupPath}`
    };
  }

  if (!currentData && ownBackupKeys.length === 0) {
    return {
      targetPath,
      content: null,
      mode: undefined,
      unlinkBackupPath: hasPrimary ? backupPath : null,
      logMessage: hasPrimary ? `[OK] Cleared backup (no ${PLUGIN_KEY} entries to restore): ${backupPath}` : null
    };
  }

  const nextDoc = currentData ? { ...currentData } : {};
  const hasCurrentSection = isPlainObject(nextDoc[sectionKey]);
  if (hasCurrentSection || ownBackupKeys.length > 0) {
    const nextSection = hasCurrentSection ? { ...nextDoc[sectionKey] } : {};
    for (const existingKey of Object.keys(nextSection)) {
      if (keyFilter(existingKey) && !Object.hasOwn(backupSection, existingKey)) {
        delete nextSection[existingKey];
      }
    }
    for (const ownKey of ownBackupKeys) {
      nextSection[ownKey] = backupSection[ownKey];
    }
    nextDoc[sectionKey] = nextSection;
  }

  return {
    targetPath,
    content: JSON.stringify(nextDoc, null, 2) + "\n",
    mode: currentData ? undefined : 0o600,
    unlinkBackupPath: hasPrimary ? backupPath : null,
    logMessage: hasPrimary
      ? `[OK] Restored ${PLUGIN_KEY} entries from backup: ${backupPath} -> ${targetPath} (foreign entries preserved)`
      : !currentData && hasForeignBackup
        ? `[OK] Recreated ${targetLabel} with ${PLUGIN_KEY} entries from legacy backup (read-only fallback; non-${PLUGIN_KEY} settings remain untouched in backup): ${legacyBackupPath} -> ${targetPath}`
        : `[OK] Restored ${PLUGIN_KEY} entries from legacy backup (read-only fallback): ${legacyBackupPath} -> ${targetPath} (foreign entries preserved)`
  };
}

function prepareRestorePlans(paths) {
  return [
    prepareRestoreJsonSection({
      targetPath: paths.mcpJsonPath,
      targetLabel: "mcp_config.json",
      backupPath: paths.mcpBakPath,
      legacyBackupPath: paths.legacyMcpBakPath,
      sectionKey: "mcpServers",
      keyFilter: isOwnMcpServerKey
    }),
    prepareRestoreJsonSection({
      targetPath: paths.configJsonPath,
      targetLabel: "config.json",
      backupPath: paths.configBakPath,
      legacyBackupPath: paths.legacyConfigBakPath,
      sectionKey: "plugins",
      keyFilter: (key) => key === PLUGIN_KEY
    })
  ].filter(Boolean);
}

async function commitRestorePlans(plans, log) {
  // Phase 2: commit target writes first, then unlink primary backups.
  for (const plan of plans) {
    if (plan.content !== null) {
      await safeWriteFileIfChanged(plan.targetPath, plan.content, plan.mode);
    }
  }
  for (const plan of plans) {
    if (plan.unlinkBackupPath) {
      await fsPromises.unlink(plan.unlinkBackupPath);
    }
    if (plan.logMessage) {
      log(plan.logMessage);
    }
  }

  if (plans.length === 0) {
    log("[INFO] No backup files (*.agy-squad.bak or legacy *.bak) found to restore.");
  }
  return { restoredCount: plans.length };
}

export async function runRestoreBackups(options = {}) {
  const paths = resolveProfilePaths();
  const log = options.silent ? () => {} : console.log;

  // Phase 1: validate and prepare all targets before mutating any file or unlinking any backup.
  const plans = prepareRestorePlans(paths);
  return commitRestorePlans(plans, log);
}

export async function runUninstall(options = {}) {
  const paths = resolveProfilePaths();
  const {
    pluginDest,
    configJsonPath,
    mcpJsonPath,
    antigravityMcpRootDir,
    antigravityBinDir
  } = paths;
  const log = options.silent ? () => {} : console.log;
  log("Uninstalling Agy-Squad...");

  const validatedMcp = readAndValidateJsonFile(mcpJsonPath, "mcp_config.json");
  const validatedConfig = readAndValidateJsonFile(configJsonPath, "config.json");
  const restorePlans = options.restoreBackups ? prepareRestorePlans(paths) : null;

  let pluginStat = null;
  try {
    pluginStat = fs.lstatSync(pluginDest);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  if (pluginStat) {
    await removeFsEntry(pluginDest, pluginStat);
    log(`[OK] Removed plugin installation: ${pluginDest}`);
  }

  if (isPlainObject(validatedMcp?.mcpServers) && Object.hasOwn(validatedMcp.mcpServers, PLUGIN_KEY)) {
    const nextServers = { ...validatedMcp.mcpServers };
    delete nextServers[PLUGIN_KEY];
    const nextMcp = { ...validatedMcp, mcpServers: nextServers };
    await safeWriteFileIfChanged(mcpJsonPath, JSON.stringify(nextMcp, null, 2) + "\n");
    log(`[OK] Removed '${PLUGIN_KEY}' from: ${mcpJsonPath} (foreign entries preserved)`);
  }

  if (isPlainObject(validatedConfig?.plugins) && Object.hasOwn(validatedConfig.plugins, PLUGIN_KEY)) {
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
    await commitRestorePlans(restorePlans, log);
  }

  log("\nAgy-Squad uninstallation complete.");
  log("Next step: reload or restart Antigravity Desktop IDE (if open) so removed 'agy-squad' MCP tools and skills unload.");
  return detectExistingInstallation();
}

export function printStatus(options = {}) {
  const log = typeof options.log === "function" ? options.log : (options.silent ? () => {} : console.log);
  const status = detectExistingInstallation({
    ...(typeof options.nodeVersion === "string" ? { nodeVersion: options.nodeVersion } : {})
  });
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
  const rt = status.details.runtime;
  const cleanedNode = typeof rt.nodeVersion === "string" ? rt.nodeVersion.trim().replace(/^v/i, "") : "";
  const foundNode = cleanedNode ? `v${cleanedNode}` : "unknown";
  log(
    `- Node.js Runtime (>= ${rt.minNodeVersion}): ${
      rt.supported
        ? `SUPPORTED (${foundNode})`
        : `UNSUPPORTED (${foundNode} < ${rt.minNodeVersion}; upgrade Node.js)`
    }`
  );
  log(`- Native Plugin Link: ${pluginNote}`);
  log(
    `- Governance Skills (${SHIPPED_SKILLS.join(", ")}): ${
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
  const overallLabel = status.isComplete
    ? "HEALTHY & ACTIVE"
    : status.details.mcp.corrupt || status.details.config.corrupt
      ? "CORRUPT CONFIGURATION"
      : !status.details.runtime.supported
        ? (status.isInstalled ? "UNSUPPORTED NODE.JS RUNTIME" : "NOT INSTALLED (UNSUPPORTED NODE.JS)")
        : status.isInstalled
          ? (status.details.plugin.exists && !status.details.config.enabled ? "DISABLED" : "PARTIAL INSTALLATION")
          : "NOT INSTALLED";
  log(`\nOverall Status: ${overallLabel}`);
  if (!status.details.runtime.supported) {
    log(`Next step: upgrade Node.js to >= ${rt.minNodeVersion} (found ${foundNode}), then run 'npx --package=agy-squad@latest agy-squad setup'.`);
  } else if (overallLabel === "NOT INSTALLED" || overallLabel === "PARTIAL INSTALLATION") {
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
  --status, status [--json]    Check live integration status (plugin, skills, MCP server, CLI shim, PATH)
  --check, -c                  Run read-only pre-flight validation check without writing changes
  --uninstall, uninstall       Remove plugin link, MCP entry, CLI shims, and schema caches
  --restore-backups            Merge-restore Agy-Squad entries from *.agy-squad.bak (legacy *.bak fallback; preserves foreign entries)
  --help, -h, help             Show this help message
  (no arguments)               Install or synchronize Agy-Squad v${PACKAGE_VERSION}
`);
}

if (isDirectEntryPoint()) {
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
