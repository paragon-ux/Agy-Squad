import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(repoRoot, "bin", "agy-squad.mjs");
const preflightScript = path.join(repoRoot, "scripts", "release-preflight.mjs");

const tmpProfile = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-installer-test-")));
const prevProfileEnv = process.env.AGY_TEST_PROFILE_DIR;
process.env.AGY_TEST_PROFILE_DIR = tmpProfile;
const testEnv = { ...process.env, AGY_TEST_PROFILE_DIR: tmpProfile };

function withEnvPath(newPath, baseEnv = process.env) {
  const out = { ...baseEnv };
  for (const k of Object.keys(out)) {
    if (k.toLowerCase() === "path") {
      delete out[k];
    }
  }
  out.PATH = newPath;
  if (os.platform() === "win32") {
    out.Path = newPath;
  }
  return out;
}

try {
  // 1. Release preflight & --version
  const preflight = spawnSync(process.execPath, [preflightScript], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(preflight.status, 0, preflight.stderr || preflight.stdout);
  assert.match(preflight.stdout, /Release preflight passed/);

  // Negative release-preflight check (SCRIPT-001/002: detects negated mcp/dispatch.mjs in package.json files)
  const negRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-preflight-neg-")));
  try {
    fs.cpSync(repoRoot, negRoot, {
      recursive: true,
      filter: (src) => !src.includes(`${path.sep}scratch`) && !src.includes(`${path.sep}.git`)
    });
    const negPkgPath = path.join(negRoot, "package.json");
    const negPkg = JSON.parse(fs.readFileSync(negPkgPath, "utf8"));
    negPkg.files = (negPkg.files || []).filter((f) => f !== "mcp").concat(["mcp/**", "!**/dispatch.mjs"]);
    fs.writeFileSync(negPkgPath, JSON.stringify(negPkg, null, 2) + "\n");
    const negPreflight = spawnSync(process.execPath, [path.join(negRoot, "scripts", "release-preflight.mjs")], {
      cwd: negRoot,
      encoding: "utf8"
    });
    assert.notEqual(negPreflight.status, 0);
    assert.match(negPreflight.stderr, /mcp\/dispatch\.mjs/);
    assert.doesNotMatch(negPreflight.stderr, /mcp\/planner\.mjs/);

    // SQ-SCRIPT-001: ./ prefix in pkg.bin is normalized cleanly
    const binPreflightPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    binPreflightPkg.bin = { "agy-squad": "./bin/agy-squad.mjs" };
    fs.writeFileSync(negPkgPath, JSON.stringify(binPreflightPkg, null, 2) + "\n");
    const binPreflight = spawnSync(process.execPath, [path.join(negRoot, "scripts", "release-preflight.mjs")], {
      cwd: negRoot,
      encoding: "utf8"
    });
    assert.equal(binPreflight.status, 0, binPreflight.stderr || binPreflight.stdout);

    // SQ7-DEP-002: plugin.json missing/mismatched L49 fields must fail preflight
    const negPluginPath = path.join(negRoot, "plugin.json");
    const negPlugin = JSON.parse(fs.readFileSync(negPluginPath, "utf8"));
    delete negPlugin.suggestedPrompts;
    negPlugin.homepage = "https://example.invalid/wrong";
    fs.writeFileSync(negPluginPath, JSON.stringify(negPlugin, null, 2) + "\n");
    const pluginNegPreflight = spawnSync(process.execPath, [path.join(negRoot, "scripts", "release-preflight.mjs")], {
      cwd: negRoot,
      encoding: "utf8"
    });
    assert.notEqual(pluginNegPreflight.status, 0);
    assert.match(pluginNegPreflight.stderr, /plugin\.json/);

    // Missing logo target in plugin.json must fail preflight
    const logoNegPlugin = JSON.parse(fs.readFileSync(path.join(repoRoot, "plugin.json"), "utf8"));
    logoNegPlugin.logo = "assets/does-not-exist.svg";
    fs.writeFileSync(negPluginPath, JSON.stringify(logoNegPlugin, null, 2) + "\n");
    const logoNegPreflight = spawnSync(process.execPath, [path.join(negRoot, "scripts", "release-preflight.mjs")], {
      cwd: negRoot,
      encoding: "utf8"
    });
    assert.notEqual(logoNegPreflight.status, 0);
    assert.match(logoNegPreflight.stderr, /plugin\.json logo target does not exist/);
  } finally {
    fs.rmSync(negRoot, { recursive: true, force: true });
  }

  const ver = spawnSync(process.execPath, [cli, "--version"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(ver.status, 0, ver.stderr);
  assert.match(ver.stdout.trim(), /^\d+\.\d+\.\d+/);

  // 2. --check read-only on fresh profile and conflicting flag rejection
  const conflict = spawnSync(process.execPath, [cli, "setup", "--check", "--restore-backups"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /Conflicting flags/);
  assert.equal(fs.existsSync(path.join(tmpProfile, ".gemini")), false);

  const checkFresh = spawnSync(process.execPath, [cli, "setup", "--check"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(checkFresh.status, 0, checkFresh.stderr);
  assert.equal(fs.existsSync(path.join(tmpProfile, ".gemini")), false);

  // Direct install-register.mjs CLI invocation & symlinked entrypoint guard
  const directCheck = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "install-register.mjs"), "--check"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(directCheck.status, 0, directCheck.stderr || directCheck.stdout);
  assert.match(directCheck.stdout, /Read-only check passed/);

  const directLink = path.join(tmpProfile, "install-register-link.mjs");
  let directLinkCreated = false;
  try {
    fs.symlinkSync(path.join(repoRoot, "scripts", "install-register.mjs"), directLink, "file");
    directLinkCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (directLinkCreated) {
    const linkCheck = spawnSync(process.execPath, [directLink, "--check"], {
      cwd: repoRoot,
      env: testEnv,
      encoding: "utf8"
    });
    assert.equal(linkCheck.status, 0, linkCheck.stderr || linkCheck.stdout);
    assert.match(linkCheck.stdout, /Read-only check passed/);
  }

  for (const badDirectArgs of [
    ["--bogus-flag"],
    ["bogus-arg"],
    ["--status", "--uninstall"],
    ["--check", "--status"],
    ["--json"],
    ["--help", "--check"]
  ]) {
    const badDirect = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "install-register.mjs"), ...badDirectArgs], {
      cwd: repoRoot,
      env: testEnv,
      encoding: "utf8"
    });
    assert.notEqual(badDirect.status, 0, `Expected direct install-register.mjs '${badDirectArgs.join(" ")}' to fail`);
    assert.equal(fs.existsSync(path.join(tmpProfile, ".gemini")), false, "Rejected direct flags must not mutate profile");
  }

  // 3. Seed legacy duplicate global MCP registration, stale schema caches & foreign configs, then run setup
  const configDir = path.join(tmpProfile, ".gemini", "config");
  const mcpRootDir = path.join(tmpProfile, ".gemini", "antigravity", "mcp");
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(path.join(mcpRootDir, "agy-squad"), { recursive: true });
  fs.mkdirSync(path.join(mcpRootDir, "agy-squad_agy-squad"), { recursive: true });
  fs.mkdirSync(path.join(mcpRootDir, "foreign-server"), { recursive: true });
  const mcpPath = path.join(configDir, "mcp_config.json");
  const cfgPath = path.join(configDir, "config.json");
  fs.writeFileSync(
    mcpPath,
    JSON.stringify({
      mcpServers: {
        "agy-squad": { command: "node", args: ["stale.js"] },
        "foreign-server": { command: "node", args: ["foreign.js"] }
      }
    }, null, 2) + "\n"
  );
  fs.writeFileSync(
    cfgPath,
    JSON.stringify({ plugins: { "foreign-plugin": { enabled: true } } }, null, 2) + "\n"
  );

  const setupRes = spawnSync(process.execPath, [cli, "setup"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(setupRes.status, 0, setupRes.stderr || setupRes.stdout);

  const statusRes = spawnSync(process.execPath, [cli, "status"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(statusRes.status, 0, statusRes.stderr || statusRes.stdout);
  assert.match(statusRes.stdout, /Overall Status: HEALTHY & ACTIVE/);
  assert.match(statusRes.stdout, /Plugin Docs & Links: READY/);
  assert.doesNotMatch(statusRes.stdout, /Companion CLI|Companion Optimizer|agy-context|rtk/i);
  assert.doesNotMatch(statusRes.stdout, /\u2014/);
  assert.equal(
    fs.existsSync(path.join(tmpProfile, ".gemini", "config", "plugins", "agy-squad", "assets", "logo.svg")),
    true,
    "Installed plugin directory must expose assets/logo.svg referenced by plugin.json"
  );
  // Redirected assets symlink in linked install must be detected as pointsElsewhere
  const installedAssetsPath = path.join(tmpProfile, ".gemini", "config", "plugins", "agy-squad", "assets");
  if (fs.lstatSync(installedAssetsPath).isSymbolicLink()) {
    const altAssetsDir = path.join(tmpProfile, "alt-assets");
    fs.mkdirSync(altAssetsDir, { recursive: true });
    fs.copyFileSync(path.join(repoRoot, "assets", "logo.svg"), path.join(altAssetsDir, "logo.svg"));
    fs.unlinkSync(installedAssetsPath);
    fs.symlinkSync(altAssetsDir, installedAssetsPath, os.platform() === "win32" ? "junction" : "dir");
    const redirectedAssetsStatus = spawnSync(process.execPath, [cli, "status", "--json"], {
      cwd: repoRoot,
      env: testEnv,
      encoding: "utf8"
    });
    assert.equal(redirectedAssetsStatus.status, 1, "Redirected assets symlink must fail health status");
    const redirectedAssetsParsed = JSON.parse(redirectedAssetsStatus.stdout);
    assert.equal(redirectedAssetsParsed.details.plugin.pointsElsewhere, true);
    assert.equal(redirectedAssetsParsed.isComplete, false);
    const repairAssetsRes = spawnSync(process.execPath, [cli, "setup"], {
      cwd: repoRoot,
      env: testEnv,
      encoding: "utf8"
    });
    assert.equal(repairAssetsRes.status, 0, repairAssetsRes.stderr || repairAssetsRes.stdout);
  }

  const posixShimBody = fs.readFileSync(path.join(tmpProfile, ".gemini", "antigravity", "bin", "agy-squad"), "utf8");
  assert.ok(posixShimBody.startsWith("#!/bin/sh\n"), "POSIX shim must use #!/bin/sh so fallback works when PATH lacks sh");
  assert.match(posixShimBody, /command -v node/);
  const expectedExecPath = process.execPath.replace(/\\/g, "/").replace(/(["\\$`])/g, "\\$1");
  const expectedCliTarget = path
    .join(tmpProfile, ".gemini", "config", "plugins", "agy-squad", "bin", "agy-squad.mjs")
    .replace(/\\/g, "/")
    .replace(/(["\\$`])/g, "\\$1");
  assert.ok(
    posixShimBody.includes(`exec "${expectedExecPath}" "${expectedCliTarget}" "$@"`),
    "POSIX shim must include normalized process.execPath fallback"
  );

  // Decoupled standalone health: clean isolated PATH with zero companion binaries reports HEALTHY & ACTIVE with zero companion warnings
  const emptyBinDir = path.join(tmpProfile, "empty-path-bin");
  fs.mkdirSync(emptyBinDir, { recursive: true });
  const scrubbedEnv = withEnvPath(emptyBinDir, { Path: "C:\\Windows\\System32", PATH: "C:\\Other", KEEP: "1" });
  assert.equal(
    Object.keys(scrubbedEnv).filter((k) => k.toLowerCase() === "path").length,
    os.platform() === "win32" ? 2 : 1
  );
  assert.equal(scrubbedEnv.PATH, emptyBinDir);
  assert.equal(scrubbedEnv.KEEP, "1");
  if (os.platform() === "win32") assert.equal(scrubbedEnv.Path, emptyBinDir);
  else assert.equal("Path" in scrubbedEnv, false);

  const standaloneStatusJsonRes = spawnSync(process.execPath, [cli, "status", "--json"], {
    cwd: repoRoot,
    env: withEnvPath(emptyBinDir, testEnv),
    encoding: "utf8"
  });
  assert.equal(standaloneStatusJsonRes.status, 0, "Standalone status --json must exit 0 without companion binaries");
  const standaloneStatusJson = JSON.parse(standaloneStatusJsonRes.stdout);
  assert.equal(standaloneStatusJson.isInstalled, true);
  assert.equal(standaloneStatusJson.isComplete, true);
  assert.equal(standaloneStatusJson.details.plugin.isSymlink, true);
  assert.equal(standaloneStatusJson.details.plugin.isCopyFallback, false);
  assert.equal(standaloneStatusJson.details.plugin.pointsElsewhere, false);
  assert.equal(standaloneStatusJson.details.plugin.versionMismatch, false);
  assert.equal("companions" in standaloneStatusJson.details, false, "Standalone status JSON must not probe or emit details.companions");

  const specialProfile = path.join(tmpProfile, "space $dollar");
  fs.mkdirSync(specialProfile, { recursive: true });
  const specialSetup = spawnSync(process.execPath, [cli, "setup"], {
    cwd: repoRoot,
    env: { ...testEnv, AGY_TEST_PROFILE_DIR: specialProfile },
    encoding: "utf8"
  });
  assert.equal(specialSetup.status, 0, specialSetup.stderr || specialSetup.stdout);
  const specialShimPath = path.join(specialProfile, ".gemini", "antigravity", "bin", "agy-squad");
  const specialShimBody = fs.readFileSync(specialShimPath, "utf8");
  assert.ok(
    specialShimBody.includes("space \\$dollar/.gemini/config/plugins/agy-squad/bin/agy-squad.mjs"),
    "POSIX shim must escape space and $ in cliTarget"
  );
  if (os.platform() !== "win32") {
    const posixFallbackRun = spawnSync(specialShimPath, ["--version"], {
      cwd: repoRoot,
      env: withEnvPath(emptyBinDir, testEnv),
      encoding: "utf8"
    });
    assert.equal(posixFallbackRun.status, 0, posixFallbackRun.stderr || posixFallbackRun.stdout);
    assert.match(posixFallbackRun.stdout.trim(), /^\d+\.\d+\.\d+/);

    const quotedProfile = path.join(tmpProfile, 'quote "q" `bt` $var');
    fs.mkdirSync(quotedProfile, { recursive: true });
    const quotedSetup = spawnSync(process.execPath, [cli, "setup"], {
      cwd: repoRoot,
      env: { ...testEnv, AGY_TEST_PROFILE_DIR: quotedProfile },
      encoding: "utf8"
    });
    assert.equal(quotedSetup.status, 0, quotedSetup.stderr || quotedSetup.stdout);
    const quotedShimPath = path.join(quotedProfile, ".gemini", "antigravity", "bin", "agy-squad");
    const quotedShimBody = fs.readFileSync(quotedShimPath, "utf8");
    assert.ok(
      quotedShimBody.includes('quote \\"q\\" \\`bt\\` \\$var/.gemini/config/plugins/agy-squad/bin/agy-squad.mjs'),
      "POSIX shim must escape quotes, backticks, and $ in cliTarget"
    );
    const quotedFallbackRun = spawnSync(quotedShimPath, ["--version"], {
      cwd: repoRoot,
      env: withEnvPath(emptyBinDir, testEnv),
      encoding: "utf8"
    });
    assert.equal(quotedFallbackRun.status, 0, quotedFallbackRun.stderr || quotedFallbackRun.stdout);
    assert.match(quotedFallbackRun.stdout.trim(), /^\d+\.\d+\.\d+/);
  }

  // SQ-DEP-001: Plugin mcp_config.json is canonical; duplicate global entry & stale caches stripped while foreign kept
  const pluginDir = path.join(configDir, "plugins", "agy-squad");
  const pluginMcp = JSON.parse(fs.readFileSync(path.join(pluginDir, "mcp_config.json"), "utf8"));
  assert.ok(pluginMcp.mcpServers["agy-squad"], "Plugin mcp_config.json must register agy-squad");
  // SQ-DEP-002: Linked docs/ resolves inside plugin directory
  assert.ok(fs.existsSync(path.join(pluginDir, "docs", "tools.md")), "Plugin docs/tools.md symlink must resolve");

  const installedMcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  assert.ok(installedMcp.mcpServers["foreign-server"], "Foreign MCP server must be preserved");
  assert.equal(installedMcp.mcpServers["agy-squad"], undefined, "Duplicate global agy-squad MCP entry must be stripped (SQ-DEP-001)");
  assert.ok(fs.existsSync(path.join(configDir, "mcp_config.json.agy-squad.bak")), "Backup mcp_config.json.agy-squad.bak must be saved when stripping global entry (S2-DEP-001)");
  assert.equal(fs.existsSync(path.join(configDir, "mcp_config.json.bak")), false, "Installer must not clobber shared mcp_config.json.bak (S2-DEP-001)");
  assert.deepEqual(fs.readdirSync(mcpRootDir), ["foreign-server"], "Stale agy-squad* MCP schema caches must be swept");

  // SQ-DEP-003: Omitted config.json entry defaults enabled=true, while enabled=false disables plugin cleanly
  const installedCfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  assert.equal(installedCfg.plugins["foreign-plugin"]?.enabled, true);
  assert.equal(installedCfg.plugins["agy-squad"]?.enabled, true);
  fs.writeFileSync(cfgPath, JSON.stringify({ plugins: { "foreign-plugin": { enabled: true } } }, null, 2) + "\n");
  const omittedCfgStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(omittedCfgStatus.status, 0, "Omitted plugins['agy-squad'] should default enabled per plugin.json");
  fs.writeFileSync(cfgPath, JSON.stringify({ plugins: { "foreign-plugin": { enabled: true }, "agy-squad": { enabled: false } } }, null, 2) + "\n");
  const disabledStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(disabledStatus.status, 1, "Explicitly disabled plugin must exit 1 on status (SQ-DEP-003)");
  assert.match(disabledStatus.stdout, /DISABLED/);
  fs.writeFileSync(cfgPath, JSON.stringify(installedCfg, null, 2) + "\n");

  // SQ-DEP-004: Copy fallback replaces prior install cleanly & Windows .cmd shim propagates errorlevel without cmd parse-time bugs
  const { runInstall: runAgySquadInstall, detectExistingInstallation, formatPosixShim, formatWindowsCmdShim } = await import("../scripts/install-register.mjs");
  const formattedPosix = formatPosixShim(
    'C:\\Program Files\\Agy $Squad\\"root"`1`',
    'C:\\Program Files\\node "24" `bt` $v\\node.exe'
  );
  assert.ok(formattedPosix.startsWith("#!/bin/sh\n"));
  assert.ok(
    formattedPosix.includes('exec "C:/Program Files/node \\"24\\" \\`bt\\` \\$v/node.exe" "C:/Program Files/Agy \\$Squad/\\"root\\"\\`1\\`/bin/agy-squad.mjs" "$@"'),
    "formatPosixShim must normalize backslashes to slashes and escape quotes, backticks, and $ in both execPath and targetRoot"
  );
  const livePluginSchemaDir = path.join(mcpRootDir, "agy-squad_agy-squad");
  fs.mkdirSync(livePluginSchemaDir, { recursive: true });
  fs.writeFileSync(path.join(livePluginSchemaDir, "squad_planner.json"), "{}\n");
  try {
    const activeSchemaDetect = detectExistingInstallation();
    assert.equal(activeSchemaDetect.details.mcp.pluginRegistered, true);
    assert.equal(activeSchemaDetect.details.mcp.globalDuplicate, false, "Active host-materialized agy-squad_agy-squad schema dir must not trigger globalDuplicate");
    assert.equal(activeSchemaDetect.details.mcp.staleSchemaCount, 0);
    assert.equal(activeSchemaDetect.details.mcp.registered, true);
    assert.equal(activeSchemaDetect.isComplete, true);
    await runAgySquadInstall({ silent: true });
    assert.equal(fs.existsSync(path.join(livePluginSchemaDir, "squad_planner.json")), true, "Repeat setup must preserve live host-materialized agy-squad_agy-squad schema dir");
  } finally {
    fs.rmSync(livePluginSchemaDir, { recursive: true, force: true });
  }

  const staleSchemaSubdir = path.join(mcpRootDir, "agy-squad_dup_probe");
  fs.mkdirSync(staleSchemaSubdir, { recursive: true });
  try {
    const staleDetected = detectExistingInstallation();
    assert.equal(staleDetected.details.mcp.globalDuplicate, true, "detectExistingInstallation must flag agy-squad_* schema directories");
    assert.ok(staleDetected.details.mcp.staleSchemaCount >= 1);
  } finally {
    fs.rmSync(staleSchemaSubdir, { recursive: true, force: true });
  }

  const cmdShimText = formatWindowsCmdShim(pluginDir);
  assert.match(cmdShimText, /^@echo off\r\nchcp 65001 >nul\r\n/);
  assert.match(cmdShimText, /chcp 65001 >nul/);
  assert.match(cmdShimText, /setlocal/);
  assert.match(cmdShimText, /where node/);
  assert.match(cmdShimText, /if errorlevel 1 goto :fallback/);
  assert.match(cmdShimText, /Math\.min\(parseInt\(process\.versions\.node,10\),22\)===22/);
  assert.match(cmdShimText, /:fallback/);
  assert.match(cmdShimText, /\(goto\) 2>nul & node\.exe /);
  assert.doesNotMatch(cmdShimText, /if %errorlevel% equ 0 \(/i);

  if (os.platform() === "win32") {
    const winShimRoot = path.join(tmpProfile, "win-shim-exec");
    fs.mkdirSync(path.join(winShimRoot, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(winShimRoot, "bin", "agy-squad.mjs"),
      "process.exit(Number(process.argv[2] || 0));\n"
    );
    const winShimPath = path.join(tmpProfile, "agy-squad-test.cmd");
    fs.writeFileSync(winShimPath, formatWindowsCmdShim(winShimRoot));
    const comspec =
      process.env.ComSpec ||
      process.env.COMSPEC ||
      path.join(process.env.SystemRoot || process.env.windir || "C:\\Windows", "System32", "cmd.exe");
    const okRun = spawnSync(comspec, ["/d", "/c", winShimPath, "0"], { encoding: "utf8" });
    assert.equal(okRun.status, 0, okRun.stderr || okRun.stdout);
    const errRun = spawnSync(comspec, ["/d", "/c", winShimPath, "7"], { encoding: "utf8" });
    assert.equal(errRun.status, 7, `Expected Windows .cmd shim to propagate exit code 7, got ${errRun.status}`);
    const fallbackRun = spawnSync(comspec, ["/d", "/c", winShimPath, "5"], {
      env: withEnvPath(emptyBinDir, testEnv),
      encoding: "utf8"
    });
    assert.equal(fallbackRun.status, 5, `Expected Windows .cmd shim :fallback to propagate exit code 5, got ${fallbackRun.status}`);
  }

  await runAgySquadInstall({ silent: true, forceCopyFallback: true });
  fs.writeFileSync(path.join(pluginDir, "stale-old-file.txt"), "stale");
  await runAgySquadInstall({ silent: true, forceCopyFallback: true });
  assert.equal(fs.existsSync(path.join(pluginDir, "stale-old-file.txt")), false, "forceCopyFallback must prune stale non-symlink files (SQ-DEP-004)");
  assert.equal(fs.lstatSync(pluginDir).isSymbolicLink(), false);
  const copyDetect = detectExistingInstallation();
  assert.equal(copyDetect.isComplete, true);
  assert.equal(copyDetect.details.plugin.isSymlink, false);
  assert.equal(copyDetect.details.plugin.isCopyFallback, true);
  assert.equal(copyDetect.details.plugin.versionMismatch, false);

  // SQ-BOOST-DEP-001: Stale copy-fallback package.json version must print STALE VERSION + PARTIAL INSTALLATION and exit 1
  const pluginPkgPath = path.join(pluginDir, "package.json");
  const savedPluginPkg = fs.readFileSync(pluginPkgPath, "utf8");
  const stalePkg = JSON.parse(savedPluginPkg);
  stalePkg.version = "0.1.1";
  fs.writeFileSync(pluginPkgPath, JSON.stringify(stalePkg, null, 2) + "\n");
  const staleCliStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(staleCliStatus.status, 1, "Stale copy-fallback version must exit 1 on agy-squad status");
  assert.match(staleCliStatus.stdout, /STALE VERSION/);
  assert.match(staleCliStatus.stdout, /PARTIAL INSTALLATION/);
  const staleDirectStatus = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "install-register.mjs"), "--status"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(staleDirectStatus.status, 1, "Stale copy-fallback version must exit 1 on install-register.mjs --status");
  const staleJsonStatus = spawnSync(process.execPath, [cli, "status", "--json"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(staleJsonStatus.status, 1);
  const staleJson = JSON.parse(staleJsonStatus.stdout);
  assert.equal(staleJson.isInstalled, true);
  assert.equal(staleJson.isComplete, false);
  assert.equal(staleJson.details.plugin.isCopyFallback, true);
  assert.equal(staleJson.details.plugin.version, "0.1.1");
  assert.equal(staleJson.details.plugin.versionMismatch, true);
  fs.mkdirSync(livePluginSchemaDir, { recursive: true });
  fs.writeFileSync(path.join(livePluginSchemaDir, "stale_v011.json"), "{}\n");
  try {
    await runAgySquadInstall({ silent: true, forceCopyFallback: true });
    assert.equal(fs.existsSync(livePluginSchemaDir), false, "Version upgrade install must sweep stale agy-squad_agy-squad schema dir");
  } finally {
    fs.rmSync(livePluginSchemaDir, { recursive: true, force: true });
  }
  fs.writeFileSync(pluginPkgPath, savedPluginPkg);

  // SQ-BOOST-DEP-001: Redirected symlinked bin / mcp / skills / pluginDest must print REDIRECTED (citing redirected checkout) + PARTIAL INSTALLATION and exit 1
  const otherCheckout = path.join(tmpProfile, "other-checkout");
  fs.mkdirSync(path.join(otherCheckout, "bin"), { recursive: true });
  fs.mkdirSync(path.join(otherCheckout, "mcp"), { recursive: true });
  fs.mkdirSync(path.join(otherCheckout, ".agents", "skills"), { recursive: true });
  fs.writeFileSync(path.join(otherCheckout, "bin", "agy-squad.mjs"), "// other\n");
  fs.writeFileSync(path.join(otherCheckout, "mcp", "index.js"), "// other\n");
  const pluginBinDir = path.join(pluginDir, "bin");
  fs.rmSync(pluginBinDir, { recursive: true, force: true });
  fs.symlinkSync(path.join(otherCheckout, "bin"), pluginBinDir, os.platform() === "win32" ? "junction" : "dir");
  const redirectedStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(redirectedStatus.status, 1, "Redirected plugin bin symlink must exit 1 on status");
  assert.match(redirectedStatus.stdout, /REDIRECTED/);
  assert.match(redirectedStatus.stdout, /PARTIAL INSTALLATION/);
  const redirectedDetect = detectExistingInstallation();
  assert.equal(redirectedDetect.isInstalled, true);
  assert.equal(redirectedDetect.isComplete, false);
  assert.equal(redirectedDetect.details.plugin.isSymlink, true);
  assert.equal(redirectedDetect.details.plugin.pointsElsewhere, true);

  // When bin points to repoRoot yet mcp points to otherCheckout, REDIRECTED target must name otherCheckout (not repoRoot)
  await runAgySquadInstall({ silent: true });
  const pluginMcpDir = path.join(pluginDir, "mcp");
  fs.rmSync(pluginMcpDir, { recursive: true, force: true });
  fs.symlinkSync(path.join(otherCheckout, "mcp"), pluginMcpDir, os.platform() === "win32" ? "junction" : "dir");
  const mcpRedirectStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(mcpRedirectStatus.status, 1, "Redirected plugin mcp symlink must exit 1 on status");
  assert.match(mcpRedirectStatus.stdout, /REDIRECTED/);
  assert.ok(mcpRedirectStatus.stdout.includes(otherCheckout), `Expected REDIRECTED target to cite ${otherCheckout}, got:\n${mcpRedirectStatus.stdout}`);

  // Also verify redirected skills symlink triggers REDIRECTED + exit 1
  await runAgySquadInstall({ silent: true });
  const pluginSkillsDir = path.join(pluginDir, "skills");
  fs.rmSync(pluginSkillsDir, { recursive: true, force: true });
  fs.symlinkSync(path.join(otherCheckout, ".agents", "skills"), pluginSkillsDir, os.platform() === "win32" ? "junction" : "dir");
  const skillsRedirectStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(skillsRedirectStatus.status, 1, "Redirected plugin skills symlink must exit 1 on status");
  assert.match(skillsRedirectStatus.stdout, /REDIRECTED/);

  // Also verify direct pluginDest symlink pointing elsewhere triggers REDIRECTED + exit 1
  fs.rmSync(pluginDir, { recursive: true, force: true });
  fs.symlinkSync(otherCheckout, pluginDir, os.platform() === "win32" ? "junction" : "dir");
  const directRedirectStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(directRedirectStatus.status, 1, "Redirected pluginDest symlink must exit 1 on status");
  assert.match(directRedirectStatus.stdout, /REDIRECTED/);
  assert.match(directRedirectStatus.stdout, /PARTIAL INSTALLATION/);
  const directRedirectDetect = detectExistingInstallation();
  assert.equal(directRedirectDetect.isInstalled, true);
  assert.equal(directRedirectDetect.isComplete, false);
  assert.equal(directRedirectDetect.details.plugin.isSymlink, true);
  assert.equal(directRedirectDetect.details.plugin.pointsElsewhere, true);

  // Broken symlink at pluginDest must report BROKEN SYMLINK + exit 1 AND be cleanly removed by uninstall
  fs.rmSync(pluginDir, { recursive: true, force: true });
  let brokenPluginSymCreated = false;
  try {
    fs.symlinkSync(path.join(tmpProfile, "missing-checkout"), pluginDir, os.platform() === "win32" ? "junction" : "dir");
    brokenPluginSymCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (brokenPluginSymCreated) {
    const brokenStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
    assert.equal(brokenStatus.status, 1);
    assert.match(brokenStatus.stdout, /BROKEN SYMLINK/);
    assert.match(brokenStatus.stdout, /PARTIAL INSTALLATION/);
    const brokenUninst = spawnSync(process.execPath, [cli, "uninstall"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
    assert.equal(brokenUninst.status, 0, brokenUninst.stderr || brokenUninst.stdout);
    assert.throws(() => fs.lstatSync(pluginDir), { code: "ENOENT" }, "uninstall must remove broken pluginDest symlink");
  }

  // Re-running setup heals stale/redirected/broken install cleanly
  await runAgySquadInstall({ silent: true });
  assert.equal(detectExistingInstallation().isComplete, true);

  // Missing package.json in pluginDest must fail runtimeReady -> INCOMPLETE + exit 1 (not HEALTHY & ACTIVE)
  const missingPkgPath = path.join(pluginDir, "package.json");
  const restoredPkgBody = fs.readFileSync(missingPkgPath, "utf8");
  fs.rmSync(missingPkgPath);
  const missingPkgStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(missingPkgStatus.status, 1, "Missing pluginDest/package.json must exit 1 on status");
  assert.match(missingPkgStatus.stdout, /INCOMPLETE/);
  assert.match(missingPkgStatus.stdout, /PARTIAL INSTALLATION/);
  fs.writeFileSync(missingPkgPath, restoredPkgBody);

  // Partial install (missing CLI shim) must exit 1 with PARTIAL INSTALLATION
  const shimFile = path.join(tmpProfile, ".gemini", "antigravity", "bin", os.platform() === "win32" ? "agy-squad.cmd" : "agy-squad");
  const savedShim = fs.readFileSync(shimFile, "utf8");
  fs.rmSync(shimFile);
  const partialStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(partialStatus.status, 1, "Partial install missing CLI shim must exit 1");
  assert.match(partialStatus.stdout, /PARTIAL INSTALLATION/);
  fs.writeFileSync(shimFile, savedShim, os.platform() === "win32" ? undefined : { mode: 0o755 });

  // L49 / v0.2.0: skillsReady must require all 5 skills (including swarm-governance & day-one-review) and lifecycle subcommands enforce strict args
  const savedSwarmSkill = fs.readFileSync(path.join(pluginDir, "skills", "swarm-governance", "SKILL.md"), "utf8");
  fs.rmSync(path.join(pluginDir, "skills", "swarm-governance", "SKILL.md"));
  assert.equal(detectExistingInstallation().details.plugin.skillsReady, false);
  fs.writeFileSync(path.join(pluginDir, "skills", "swarm-governance", "SKILL.md"), savedSwarmSkill);
  assert.equal(detectExistingInstallation().details.plugin.skillsReady, true);

  const savedDayOneSkill = fs.readFileSync(path.join(pluginDir, "skills", "day-one-review", "SKILL.md"), "utf8");
  fs.rmSync(path.join(pluginDir, "skills", "day-one-review", "SKILL.md"));
  assert.equal(detectExistingInstallation().details.plugin.skillsReady, false);
  fs.writeFileSync(path.join(pluginDir, "skills", "day-one-review", "SKILL.md"), savedDayOneSkill);
  assert.equal(detectExistingInstallation().details.plugin.skillsReady, true);

  if (os.platform() !== "win32") {
    const installedPosixShim = path.join(tmpProfile, ".gemini", "antigravity", "bin", "agy-squad");
    fs.chmodSync(installedPosixShim, 0o644);
    assert.equal(detectExistingInstallation().details.cliShim.exists, false);
    fs.chmodSync(installedPosixShim, 0o755);
    assert.equal(detectExistingInstallation().details.cliShim.exists, true);
  }

  for (const badArgs of [
    ["setup", "--bogus-flag"],
    ["setup", "extra-arg"],
    ["uninstall", "--bogus-flag"],
    ["uninstall", "restore-backups"],
    ["restore-backups", "--bogus-flag"],
    ["restore-backups", "extra-arg"]
  ]) {
    const badRes = spawnSync(process.execPath, [cli, ...badArgs], {
      cwd: repoRoot,
      env: testEnv,
      encoding: "utf8"
    });
    assert.notEqual(badRes.status, 0, `Expected '${badArgs.join(" ")}' to fail strict arg parsing`);
  }

  // 4. Malformed config preservation (fails closed without mutating)
  fs.writeFileSync(mcpPath, "{ malformed json");
  const badCheck = spawnSync(process.execPath, [cli, "setup", "--check"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.notEqual(badCheck.status, 0);
  assert.equal(fs.readFileSync(mcpPath, "utf8"), "{ malformed json");

  // Restore valid JSON & test uninstall + backup restoration
  fs.writeFileSync(mcpPath, JSON.stringify(installedMcp, null, 2) + "\n");
  const uninst = spawnSync(process.execPath, [cli, "uninstall"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(uninst.status, 0, uninst.stderr || uninst.stdout);

  const afterMcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  assert.ok(afterMcp.mcpServers["foreign-server"]);
  assert.equal(afterMcp.mcpServers["agy-squad"], undefined);

  const restoreRes = spawnSync(process.execPath, [cli, "restore-backups"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(restoreRes.status, 0, restoreRes.stderr || restoreRes.stdout);
  const restoredMcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  assert.deepEqual(restoredMcp.mcpServers["agy-squad"], { command: "node", args: ["stale.js"] });

  // SQ-DEP-006: detectExistingInstallation resolves AGY_TEST_PROFILE_DIR dynamically
  const installerMod = await import(new URL("../scripts/install-register.mjs", import.meta.url));
  const emptyDynProfile = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-dyn-prof-")));
  try {
    process.env.AGY_TEST_PROFILE_DIR = emptyDynProfile;
    const dynEmpty = installerMod.detectExistingInstallation();
    assert.equal(dynEmpty.isInstalled, false);
    assert.equal(dynEmpty.isComplete, false);
    assert.equal(dynEmpty.details.plugin.exists, false);
    assert.equal(dynEmpty.details.mcp.registered, false);
    assert.equal(dynEmpty.details.plugin.path.startsWith(emptyDynProfile), true);
    const emptyCliStatus = spawnSync(process.execPath, [cli, "status"], {
      cwd: repoRoot,
      env: { ...testEnv, AGY_TEST_PROFILE_DIR: emptyDynProfile },
      encoding: "utf8"
    });
    assert.equal(emptyCliStatus.status, 1);
    assert.match(emptyCliStatus.stdout, /Overall Status: NOT INSTALLED/);
    // LEAD-SCRIPT-002: uninstalled profile must report config.enabled=false
    assert.equal(dynEmpty.details.config.enabled, false, "LEAD-SCRIPT-002: uninstalled profile must report details.config.enabled=false");
  } finally {
    process.env.AGY_TEST_PROFILE_DIR = tmpProfile;
    fs.rmSync(emptyDynProfile, { recursive: true, force: true });
  }

  // Decoupled installer: companion probing & cross-plugin directory peeking helpers are removed
  assert.equal(installerMod.detectCompanionDependencies, undefined);
  assert.equal(installerMod.buildWindowsProbeInvocation, undefined);

  // S2-TEST-001 (S2-SCRIPT-003): Malformed mcp_config.json and config.json surface corrupt=true and fail status/status --json
  await runAgySquadInstall({ silent: true });
  fs.writeFileSync(mcpPath, "{ bad mcp json");
  const corruptMcpStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(corruptMcpStatus.status, 1, "S2-TEST-001: malformed mcp_config.json must exit 1 on status");
  assert.match(corruptMcpStatus.stdout, /CORRUPT/);
  const corruptMcpJsonRes = spawnSync(process.execPath, [cli, "status", "--json"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(corruptMcpJsonRes.status, 1);
  const corruptMcpJson = JSON.parse(corruptMcpJsonRes.stdout);
  assert.equal(corruptMcpJson.isComplete, false);
  assert.equal(corruptMcpJson.details.mcp.corrupt, true);
  assert.ok(corruptMcpJson.details.mcp.error);
  fs.writeFileSync(mcpPath, JSON.stringify(afterMcp, null, 2) + "\n");

  const savedValidCfg = fs.readFileSync(cfgPath, "utf8");
  fs.writeFileSync(cfgPath, "[]\n");
  const corruptCfgJsonRes = spawnSync(process.execPath, [cli, "status", "--json"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(corruptCfgJsonRes.status, 1, "S2-TEST-001: non-object config.json must fail status --json");
  const corruptCfgJson = JSON.parse(corruptCfgJsonRes.stdout);
  assert.equal(corruptCfgJson.isComplete, false);
  assert.equal(corruptCfgJson.details.config.corrupt, true);
  assert.equal(corruptCfgJson.details.config.enabled, false);
  fs.writeFileSync(cfgPath, savedValidCfg);

  // S2-TEST-002 (S2-SCRIPT-004): Copy-fallback missing docs/tools.md fails docsReady and status exit 1
  await runAgySquadInstall({ silent: true, forceCopyFallback: true });
  const copyDocsTools = path.join(pluginDir, "docs", "tools.md");
  const savedCopyDocsTools = fs.readFileSync(copyDocsTools, "utf8");
  fs.rmSync(copyDocsTools);
  const missingDocsDetect = detectExistingInstallation();
  assert.equal(missingDocsDetect.details.plugin.docsReady, false);
  assert.equal(missingDocsDetect.isComplete, false, "S2-SCRIPT-004: missing docsReady must fail isComplete");
  const missingDocsStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(missingDocsStatus.status, 1, "S2-TEST-002: missing docsReady must exit 1 on status");
  assert.match(missingDocsStatus.stdout, /INCOMPLETE/);
  fs.writeFileSync(copyDocsTools, savedCopyDocsTools);

  // S2-SCRIPT-010 & LEAD-SCRIPT-001: plugins: [] / mcpServers: [] array guards in runInstall and runUninstall
  fs.writeFileSync(cfgPath, JSON.stringify({ plugins: [] }, null, 2) + "\n");
  fs.writeFileSync(mcpPath, JSON.stringify({ mcpServers: [] }, null, 2) + "\n");
  const badPluginsSetup = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.notEqual(badPluginsSetup.status, 0, "S2-SCRIPT-010: setup must reject non-object config.json.plugins");
  assert.deepEqual(JSON.parse(fs.readFileSync(cfgPath, "utf8")), { plugins: [] });
  const safeArrayUninstall = spawnSync(process.execPath, [cli, "uninstall"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
  assert.equal(safeArrayUninstall.status, 0, "LEAD-SCRIPT-001: uninstall must preserve non-object array mcpServers/plugins without crashing");
  assert.deepEqual(JSON.parse(fs.readFileSync(cfgPath, "utf8")), { plugins: [] });
  assert.deepEqual(JSON.parse(fs.readFileSync(mcpPath, "utf8")), { mcpServers: [] });
  fs.writeFileSync(cfgPath, savedValidCfg);
  fs.writeFileSync(mcpPath, JSON.stringify(afterMcp, null, 2) + "\n");

  // v0.1.3 Remediation Regressions: S2-SCRIPT-01..03, S2-SCRIPT-05, S2-TEST-01
  // S2-SCRIPT-05: formatWindowsCmdShim escapes % -> %% and rejects embedded quotes/CR/LF
  const escapedWinShim = formatWindowsCmdShim("C:\\Users\\a%TEMP%b\\plugin", "C:\\Node%1\\node.exe");
  assert.match(escapedWinShim, /a%%TEMP%%b/);
  assert.match(escapedWinShim, /Node%%1\\node\.exe/);
  assert.match(escapedWinShim, /%\*/);
  assert.doesNotMatch(escapedWinShim, /a%TEMP%b/);
  for (const badWinPath of ["", "   ", "C:\\bad\"quote\\plugin", "C:\\bad\r\\plugin", "C:\\bad\n\\plugin", "C:\\bad\0null\\plugin"]) {
    assert.throws(() => formatWindowsCmdShim(badWinPath), /Invalid Windows CLI shim target path/);
    assert.throws(() => formatWindowsCmdShim("C:\\safe\\plugin", badWinPath), /Invalid Windows CLI shim execPath/);
  }

  // S2-SCRIPT-01..03 & S2-TEST-01: Zero filesystem mutation on rejected setup (plugins: [], mcpServers: []) and setup --check rejects corrupt profiles
  const noMutProf = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-nomut-")));
  try {
    const nmCfgDir = path.join(noMutProf, ".gemini", "config");
    const nmPluginDir = path.join(nmCfgDir, "plugins", "agy-squad");
    const nmCacheDir = path.join(noMutProf, ".gemini", "antigravity", "mcp", "agy-squad");
    fs.mkdirSync(nmPluginDir, { recursive: true });
    fs.mkdirSync(nmCacheDir, { recursive: true });
    const nmSentinel = path.join(nmPluginDir, "sentinel.txt");
    const nmCacheSentinel = path.join(nmCacheDir, "cache.json");
    const nmCfgPath = path.join(nmCfgDir, "config.json");
    const nmMcpPath = path.join(nmCfgDir, "mcp_config.json");
    const nmMcpBakPath = path.join(nmCfgDir, "mcp_config.json.agy-squad.bak");
    fs.writeFileSync(nmSentinel, "keep-untouched");
    fs.writeFileSync(nmCacheSentinel, "{}");
    const nmEnv = { ...testEnv, AGY_TEST_PROFILE_DIR: noMutProf };

    // Case 1: config.json has plugins: [] while mcp_config.json has duplicate global entry -> setup fails with zero mutation, --check fails
    const badCfgRaw = JSON.stringify({ plugins: [] }, null, 2) + "\n";
    const dupMcpRaw = JSON.stringify({ mcpServers: { "agy-squad": { command: "node", args: ["old.js"] } } }, null, 2) + "\n";
    fs.writeFileSync(nmCfgPath, badCfgRaw);
    fs.writeFileSync(nmMcpPath, dupMcpRaw);
    const badCfgCheck = spawnSync(process.execPath, [cli, "setup", "--check"], { cwd: repoRoot, env: nmEnv, encoding: "utf8" });
    assert.notEqual(badCfgCheck.status, 0, "S2-SCRIPT-03: setup --check must reject config.json.plugins: []");
    const badCfgSetup = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: nmEnv, encoding: "utf8" });
    assert.notEqual(badCfgSetup.status, 0, "S2-SCRIPT-01: setup must reject config.json.plugins: []");
    assert.equal(fs.readFileSync(nmSentinel, "utf8"), "keep-untouched", "S2-SCRIPT-01: pluginDir must not be mutated before plugins validation");
    assert.equal(fs.readFileSync(nmMcpPath, "utf8"), dupMcpRaw, "S2-SCRIPT-01: mcp_config.json must not be mutated before plugins validation");
    assert.equal(fs.existsSync(nmMcpBakPath), false, "S2-SCRIPT-01: mcp_config.json backup must not be created on rejected setup");
    assert.equal(fs.existsSync(nmCacheSentinel), true, "S2-SCRIPT-01: schema cache must not be swept on rejected setup");
    assert.equal(fs.readFileSync(nmCfgPath, "utf8"), badCfgRaw);

    // Case 2: valid config.json + mcp_config.json.mcpServers: [] -> setup fails with zero mutation, --check fails
    const goodCfgRaw = JSON.stringify({ plugins: {} }, null, 2) + "\n";
    const badMcpRaw = JSON.stringify({ mcpServers: [] }, null, 2) + "\n";
    fs.writeFileSync(nmCfgPath, goodCfgRaw);
    fs.writeFileSync(nmMcpPath, badMcpRaw);
    const badMcpCheck = spawnSync(process.execPath, [cli, "setup", "--check"], { cwd: repoRoot, env: nmEnv, encoding: "utf8" });
    assert.notEqual(badMcpCheck.status, 0, "S2-SCRIPT-03: setup --check must reject mcp_config.json.mcpServers: []");
    const badMcpSetup = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: nmEnv, encoding: "utf8" });
    assert.notEqual(badMcpSetup.status, 0, "S2-SCRIPT-02: setup must reject mcp_config.json.mcpServers: []");
    assert.match(badMcpSetup.stderr, /mcpServers/);
    assert.equal(fs.readFileSync(nmSentinel, "utf8"), "keep-untouched", "S2-SCRIPT-02: pluginDir must not be mutated on rejected mcpServers");
    assert.equal(fs.readFileSync(nmCfgPath, "utf8"), goodCfgRaw);
    assert.equal(fs.readFileSync(nmMcpPath, "utf8"), badMcpRaw);

    // Case 3: corrupt pluginDir/mcp_config.json -> setup --check fails
    fs.writeFileSync(nmMcpPath, JSON.stringify({ mcpServers: {} }, null, 2) + "\n");
    fs.writeFileSync(path.join(nmPluginDir, "mcp_config.json"), "{ corrupt plugin mcp");
    const badPluginMcpCheck = spawnSync(process.execPath, [cli, "setup", "--check"], { cwd: repoRoot, env: nmEnv, encoding: "utf8" });
    assert.notEqual(badPluginMcpCheck.status, 0, "S2-SCRIPT-03: setup --check must reject corrupt pluginDir/mcp_config.json");
  } finally {
    fs.rmSync(noMutProf, { recursive: true, force: true });
  }

  // S2-TEST-003 (S2-SCRIPT-011): Dangling CLI shim symlink and broken subdir/repoSkills symlink removed by uninstall
  const danglingShimPath = path.join(tmpProfile, ".gemini", "antigravity", "bin", "agy-squad");
  let danglingShimCreated = false;
  try {
    fs.symlinkSync(path.join(tmpProfile, "nonexistent-shim-target"), danglingShimPath, "file");
    danglingShimCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (danglingShimCreated) {
    const danglingUninst = spawnSync(process.execPath, [cli, "uninstall"], { cwd: repoRoot, env: testEnv, encoding: "utf8" });
    assert.equal(danglingUninst.status, 0, danglingUninst.stderr || danglingUninst.stdout);
    assert.throws(() => fs.lstatSync(danglingShimPath), { code: "ENOENT" }, "S2-TEST-003: uninstall must unlink dangling CLI shim symlink");
  }

  // S2-TEST-006 (S2-DEP-001): Coexistence with Agy-Context-Saver .bak and read-only legacy .bak fallback
  const coexistProf = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-coexist-")));
  try {
    const cCfgDir = path.join(coexistProf, ".gemini", "config");
    fs.mkdirSync(cCfgDir, { recursive: true });
    const cEnv = { ...testEnv, AGY_TEST_PROFILE_DIR: coexistProf };
    const acsBak = path.join(cCfgDir, "mcp_config.json.agy-context-saver.bak");
    const cMcpPath = path.join(cCfgDir, "mcp_config.json");
    const cLegacyBak = path.join(cCfgDir, "mcp_config.json.bak");
    const acsSentinel = JSON.stringify({ mcpServers: { "agy-context-saver": { command: "node", args: ["acs.js"] } } }, null, 2) + "\n";
    fs.writeFileSync(acsBak, acsSentinel);
    fs.writeFileSync(cMcpPath, JSON.stringify({ mcpServers: { "agy-squad": { command: "node", args: ["old.js"] }, "other": { command: "x" } } }, null, 2) + "\n");
    const coexistSetup = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: cEnv, encoding: "utf8" });
    assert.equal(coexistSetup.status, 0, coexistSetup.stderr || coexistSetup.stdout);
    assert.equal(fs.readFileSync(acsBak, "utf8"), acsSentinel, "S2-TEST-006: must never clobber .agy-context-saver.bak");
    assert.ok(fs.existsSync(path.join(cCfgDir, "mcp_config.json.agy-squad.bak")));
    assert.equal(fs.existsSync(cLegacyBak), false);

    // Foreign-only legacy mcp_config.json.bak must NOT be blindly restored over mcp_config.json
    fs.rmSync(path.join(cCfgDir, "mcp_config.json.agy-squad.bak"), { force: true });
    fs.writeFileSync(cLegacyBak, JSON.stringify({ mcpServers: { "agy-context-saver": { command: "node", args: ["only-acs.js"] } } }) + "\n");
    const curBeforeForeign = fs.readFileSync(cMcpPath, "utf8");
    spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: cEnv, encoding: "utf8" });
    assert.equal(fs.readFileSync(cMcpPath, "utf8"), curBeforeForeign, "S2-TEST-006: legacy .bak without agy-squad key must not overwrite mcp_config.json");

    // Legacy mcp_config.json.bak WITH agy-squad restores ONLY agy-squad* read-only without deleting legacy file or clobbering foreign servers
    fs.writeFileSync(cLegacyBak, JSON.stringify({ mcpServers: { "agy-squad": { command: "node", args: ["legacy.js"] }, "stale-old-foreign": { command: "old" } } }) + "\n");
    const legacyRestore = spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: cEnv, encoding: "utf8" });
    assert.equal(legacyRestore.status, 0, legacyRestore.stderr);
    const afterLegacyMcp = JSON.parse(fs.readFileSync(cMcpPath, "utf8"));
    assert.deepEqual(afterLegacyMcp.mcpServers["agy-squad"], { command: "node", args: ["legacy.js"] });
    assert.deepEqual(afterLegacyMcp.mcpServers["other"], { command: "x" }, "Key-scoped merge-restore must preserve current foreign MCP servers");
    assert.equal(afterLegacyMcp.mcpServers["stale-old-foreign"], undefined, "Key-scoped merge-restore must not resurrect foreign servers from backup");
    assert.equal(fs.existsSync(cLegacyBak), true, "Legacy fallback must stay read-only without deleting shared .bak");

    // Key-scoped merge-restore on uninstall --restore-backups preserves foreign plugins in config.json and foreign servers in mcp_config.json
    const mergeProf = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-merge-restore-")));
    try {
      const mCfgDir = path.join(mergeProf, ".gemini", "config");
      fs.mkdirSync(mCfgDir, { recursive: true });
      const mEnv = { ...testEnv, AGY_TEST_PROFILE_DIR: mergeProf };
      const mCfgPath = path.join(mCfgDir, "config.json");
      const mMcpPath = path.join(mCfgDir, "mcp_config.json");
      fs.writeFileSync(
        mCfgPath,
        JSON.stringify({
          theme: "dark",
          plugins: {
            "foreign-plugin": { enabled: true },
            "agy-squad": { enabled: false, customNote: "pre-install" }
          }
        }, null, 2) + "\n"
      );
      fs.writeFileSync(
        mMcpPath,
        JSON.stringify({
          globalOpt: 1,
          mcpServers: {
            "agy-squad": { command: "node", args: ["pre-install.js"] },
            "foreign-server": { command: "node", args: ["foreign.js"] }
          }
        }, null, 2) + "\n"
      );

      const mSetup = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: mEnv, encoding: "utf8" });
      assert.equal(mSetup.status, 0, mSetup.stderr || mSetup.stdout);

      // Simulate installing Agy-Context-Saver and editing user preferences AFTER Agy-Squad setup
      const postSetupCfg = JSON.parse(fs.readFileSync(mCfgPath, "utf8"));
      postSetupCfg.theme = "light";
      postSetupCfg.plugins["agy-context-saver"] = { enabled: true };
      fs.writeFileSync(mCfgPath, JSON.stringify(postSetupCfg, null, 2) + "\n");

      const postSetupMcp = JSON.parse(fs.readFileSync(mMcpPath, "utf8"));
      postSetupMcp.globalOpt = 2;
      postSetupMcp.mcpServers["agy-context-saver"] = { command: "node", args: ["acs-mcp.js"] };
      fs.writeFileSync(mMcpPath, JSON.stringify(postSetupMcp, null, 2) + "\n");

      const mUninst = spawnSync(process.execPath, [cli, "uninstall", "--restore-backups"], {
        cwd: repoRoot,
        env: mEnv,
        encoding: "utf8"
      });
      assert.equal(mUninst.status, 0, mUninst.stderr || mUninst.stdout);

      const mergedCfg = JSON.parse(fs.readFileSync(mCfgPath, "utf8"));
      assert.equal(mergedCfg.theme, "light", "uninstall --restore-backups must preserve updated top-level config.json fields");
      assert.deepEqual(mergedCfg.plugins["agy-context-saver"], { enabled: true }, "uninstall --restore-backups must preserve foreign plugin agy-context-saver in config.json");
      assert.deepEqual(mergedCfg.plugins["foreign-plugin"], { enabled: true }, "uninstall --restore-backups must preserve foreign-plugin in config.json");
      assert.deepEqual(mergedCfg.plugins["agy-squad"], { enabled: false, customNote: "pre-install" }, "uninstall --restore-backups must restore Agy-Squad's own plugins['agy-squad'] entry");
      assert.equal(fs.existsSync(path.join(mCfgDir, "config.json.agy-squad.bak")), false);

      const mergedMcp = JSON.parse(fs.readFileSync(mMcpPath, "utf8"));
      assert.equal(mergedMcp.globalOpt, 2, "uninstall --restore-backups must preserve updated top-level mcp_config.json fields");
      assert.deepEqual(mergedMcp.mcpServers["agy-context-saver"], { command: "node", args: ["acs-mcp.js"] }, "uninstall --restore-backups must preserve foreign server agy-context-saver in mcp_config.json");
      assert.deepEqual(mergedMcp.mcpServers["foreign-server"], { command: "node", args: ["foreign.js"] }, "uninstall --restore-backups must preserve foreign-server in mcp_config.json");
      assert.deepEqual(mergedMcp.mcpServers["agy-squad"], { command: "node", args: ["pre-install.js"] }, "uninstall --restore-backups must restore Agy-Squad's own mcpServers['agy-squad'] entry");
      assert.equal(fs.existsSync(path.join(mCfgDir, "mcp_config.json.agy-squad.bak")), false);

      // Case 2: backup created when agy-squad was absent from config.json removes only agy-squad while preserving foreign plugins
      fs.writeFileSync(mCfgPath, JSON.stringify({ plugins: { "foreign-plugin": { enabled: true } } }, null, 2) + "\n");
      const mSetup2 = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: mEnv, encoding: "utf8" });
      assert.equal(mSetup2.status, 0, mSetup2.stderr || mSetup2.stdout);
      const afterSetup2Cfg = JSON.parse(fs.readFileSync(mCfgPath, "utf8"));
      afterSetup2Cfg.plugins["agy-context-saver"] = { enabled: true };
      fs.writeFileSync(mCfgPath, JSON.stringify(afterSetup2Cfg, null, 2) + "\n");
      const mRestoreDirect = spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: mEnv, encoding: "utf8" });
      assert.equal(mRestoreDirect.status, 0, mRestoreDirect.stderr || mRestoreDirect.stdout);
      const restoredAbsentCfg = JSON.parse(fs.readFileSync(mCfgPath, "utf8"));
      assert.equal(restoredAbsentCfg.plugins["agy-squad"], undefined, "restore-backups must remove plugins['agy-squad'] when absent in pre-install backup");
      assert.deepEqual(restoredAbsentCfg.plugins["agy-context-saver"], { enabled: true }, "restore-backups must preserve foreign plugins when removing agy-squad");
      assert.deepEqual(restoredAbsentCfg.plugins["foreign-plugin"], { enabled: true });

      // Legacy config.json.bak without agy-squad must NOT overwrite config.json; with agy-squad merges ONLY plugins['agy-squad'] read-only
      const mLegacyCfgBak = path.join(mCfgDir, "config.json.bak");
      fs.writeFileSync(mLegacyCfgBak, JSON.stringify({ plugins: { "only-acs": { enabled: true } } }, null, 2) + "\n");
      const cfgBeforeLegacyForeign = fs.readFileSync(mCfgPath, "utf8");
      const legacyForeignCfgRes = spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: mEnv, encoding: "utf8" });
      assert.equal(legacyForeignCfgRes.status, 0, legacyForeignCfgRes.stderr);
      assert.equal(fs.readFileSync(mCfgPath, "utf8"), cfgBeforeLegacyForeign, "Legacy config.json.bak without agy-squad key must not overwrite config.json");

      fs.writeFileSync(
        mLegacyCfgBak,
        JSON.stringify({ plugins: { "agy-squad": { enabled: false }, "stale-legacy-plugin": { enabled: true } } }, null, 2) + "\n"
      );
      const legacyOwnCfgRes = spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: mEnv, encoding: "utf8" });
      assert.equal(legacyOwnCfgRes.status, 0, legacyOwnCfgRes.stderr);
      const afterLegacyCfg = JSON.parse(fs.readFileSync(mCfgPath, "utf8"));
      assert.deepEqual(afterLegacyCfg.plugins["agy-squad"], { enabled: false });
      assert.deepEqual(afterLegacyCfg.plugins["agy-context-saver"], { enabled: true });
      assert.equal(afterLegacyCfg.plugins["stale-legacy-plugin"], undefined, "Legacy config.json.bak merge-restore must not copy foreign plugins");
      assert.equal(fs.existsSync(mLegacyCfgBak), true, "Legacy config.json.bak fallback must stay read-only");

      // Corrupt primary backup fails closed without mutating config.json or deleting backup
      const mPrimaryBak = path.join(mCfgDir, "config.json.agy-squad.bak");
      const cfgBeforeCorrupt = fs.readFileSync(mCfgPath, "utf8");
      fs.writeFileSync(mPrimaryBak, "{ corrupt backup");
      const corruptBakRes = spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: mEnv, encoding: "utf8" });
      assert.notEqual(corruptBakRes.status, 0, "Corrupt primary backup must fail closed");
      assert.equal(fs.readFileSync(mCfgPath, "utf8"), cfgBeforeCorrupt, "Corrupt primary backup must not mutate config.json");
      assert.equal(fs.existsSync(mPrimaryBak), true, "Corrupt primary backup must not be deleted on failure");
    } finally {
      fs.rmSync(mergeProf, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(coexistProf, { recursive: true, force: true });
  }

  // Exercise the persistent copy made by the real npm tarball and invoke its registered shims.
  {
    const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-tarball-"));
    const profile = path.join(testRoot, "profile");
    const cfg = path.join(profile, ".gemini", "config");
    const mcp = path.join(cfg, "mcp_config.json");
    const installed = path.join(cfg, "plugins", "agy-squad");
    const win = process.platform === "win32";
    const shell = process.env.ComSpec || process.env.COMSPEC || "cmd.exe";
    const env = { ...process.env, AGY_TEST_PROFILE_DIR: profile, npm_config_cache: path.join(testRoot, "npm-cache") };
    const foreign = { mcpServers: { "foreign-server": { command: "node", args: ["foreign.js"] } } };
    const npmCli = process.env.npm_execpath;
    const npm = (args) => npmCli
      ? spawnSync(process.execPath, [npmCli, ...args], { env, encoding: "utf8" })
      : spawnSync(win ? "npm.cmd" : "npm", args, { env, encoding: "utf8", shell: win });
    const ok = (res) => assert.equal(res.status, 0, res.stderr || res.stdout || res.error?.message);
    function shim(command, ...args) {
      const launcher = win ? `${command}.cmd` : command;
      return win
        ? spawnSync(shell, ["/d", "/s", "/c", `""${launcher}" ${args.join(" ")}"`], { env, encoding: "utf8", windowsVerbatimArguments: true })
        : spawnSync(launcher, args, { env, encoding: "utf8" });
    }

    try {
      fs.mkdirSync(cfg, { recursive: true });
      fs.writeFileSync(mcp, JSON.stringify(foreign));
      const pack = npm(["pack", "--json", "--pack-destination", testRoot]);
      ok(pack);
      const tarball = path.join(testRoot, JSON.parse(pack.stdout)[0].filename);
      const prefix = path.join(testRoot, "npm-install");
      ok(npm(["install", "--offline", "--no-audit", "--no-fund", "--prefix", prefix, tarball]));
      const pkgShim = path.join(prefix, "node_modules", ".bin", "agy-squad");
      const installedShim = path.join(profile, ".gemini", "antigravity", "bin", "agy-squad");
      ok(shim(pkgShim, "setup"));
      assert.ok(fs.lstatSync(installed).isDirectory(), "npm setup must make a persistent plugin copy");
      const marker = path.join(installed, "preserve-on-repeat.txt");
      fs.writeFileSync(marker, "installed source");
      const registration = path.join(installed, "mcp_config.json");
      fs.unlinkSync(registration);
      ok(shim(installedShim, "setup"));
      ok(shim(installedShim, "setup"));
      assert.equal(fs.readFileSync(marker, "utf8"), "installed source");
      assert.ok(fs.existsSync(registration), "repeat setup should repair its registration");
      const status = shim(installedShim, "status", "--json");
      ok(status);
      assert.equal(JSON.parse(status.stdout).isComplete, true);

      // Missing assets/logo.svg in installed copy must fail runtimeReady / isComplete until restored
      const installedLogo = path.join(installed, "assets", "logo.svg");
      const logoBackup = fs.readFileSync(installedLogo, "utf8");
      fs.unlinkSync(installedLogo);
      const missingLogoStatus = shim(installedShim, "status", "--json");
      assert.equal(missingLogoStatus.status, 1, "Missing assets/logo.svg must fail status check");
      const missingLogoParsed = JSON.parse(missingLogoStatus.stdout);
      assert.equal(missingLogoParsed.details.plugin.runtimeReady, false);
      assert.equal(missingLogoParsed.isComplete, false);
      fs.writeFileSync(installedLogo, logoBackup, "utf8");
      const restoredLogoStatus = shim(installedShim, "status", "--json");
      ok(restoredLogoStatus);
      assert.equal(JSON.parse(restoredLogoStatus.stdout).isComplete, true);

      // The shim must propagate real failures and leave the working install intact.
      fs.writeFileSync(mcp, "{ malformed");
      const rejected = shim(installedShim, "uninstall");
      assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
      assert.equal(fs.readFileSync(mcp, "utf8"), "{ malformed");
      assert.ok(fs.existsSync(marker));
      fs.writeFileSync(mcp, JSON.stringify(foreign));

      ok(shim(installedShim, "uninstall"));
      assert.equal(fs.existsSync(installed), false);
      assert.equal(fs.existsSync(registration), false);
      assert.equal(fs.existsSync(installedShim), false);
      if (win) assert.equal(fs.existsSync(`${installedShim}.cmd`), false);
      assert.deepEqual(JSON.parse(fs.readFileSync(mcp, "utf8")), foreign);
      ok(shim(pkgShim, "setup"));
      ok(shim(installedShim, "--version"));
      if (win) {
        const lockFile = path.join(installed, "uninstall-locked.txt");
        const lockScript = [
          "$lock = [IO.File]::Open($env:AGY_FIXTURE_LOCK, 'CreateNew', 'ReadWrite', 'None')",
          "try { & $env:AGY_FIXTURE_SHIM uninstall; exit $LASTEXITCODE } finally { $lock.Dispose() }"
        ].join("\n");
        const powershell = path.join(env.SystemRoot || env.windir || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
        const locked = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-Command", lockScript], {
          encoding: "utf8",
          env: { ...env, AGY_FIXTURE_LOCK: lockFile, AGY_FIXTURE_SHIM: `${installedShim}.cmd` }
        });
        assert.equal(locked.status, 1, locked.stderr || locked.stdout || locked.error?.message);
        assert.match(locked.stderr, /uninstall-locked\.txt/);
        assert.ok(fs.existsSync(lockFile));
        assert.ok(fs.existsSync(`${installedShim}.cmd`));
        assert.deepEqual(JSON.parse(fs.readFileSync(mcp, "utf8")), foreign);
        ok(shim(pkgShim, "uninstall"));
        assert.equal(fs.existsSync(installed), false);
      }
    } finally {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  }

  // UX-SQ-004, UX-SQ-005, UX-SQ-012, UX-SQ-014: PATH & companion onboarding in setup/status, NOT INSTALLED hint, copy-fallback skill link safety
  {
    const uxProfile = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-ux-onboarding-")));
    const uxEmptyPath = path.join(uxProfile, "empty-bin");
    fs.mkdirSync(uxEmptyPath, { recursive: true });
    const uxBaseEnv = withEnvPath(uxEmptyPath, { ...process.env, AGY_TEST_PROFILE_DIR: uxProfile });
    try {
      // UX-SQ-014: NOT INSTALLED prints actionable setup hint in human mode, while --json stays pure JSON
      const preStatusHuman = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" });
      assert.equal(preStatusHuman.status, 1);
      assert.match(preStatusHuman.stdout, /Overall Status: NOT INSTALLED/);
      assert.match(preStatusHuman.stdout, /Next step: run 'npx --package=agy-squad agy-squad setup'/);

      const preStatusJson = spawnSync(process.execPath, [cli, "status", "--json"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" });
      assert.equal(preStatusJson.status, 1);
      const parsedPreJson = JSON.parse(preStatusJson.stdout);
      assert.equal(parsedPreJson.isInstalled, false);
      assert.doesNotMatch(preStatusJson.stdout, /Next step:/);

      // UX-SQ-005 & UX-SQ-012: setup on clean standalone profile emits PATH guidance & IDE reload guidance with zero companion warnings
      const uxSetup = spawnSync(process.execPath, [cli, "setup"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" });
      assert.equal(uxSetup.status, 0, uxSetup.stderr || uxSetup.stdout);
      assert.match(uxSetup.stdout, /\[WARN\] CLI bin directory is not on your PATH:/);
      assert.match(uxSetup.stdout, /npx --package=agy-squad agy-squad status/);
      assert.doesNotMatch(uxSetup.stdout, /\[NEXT STEP\] Optional companion tools not ready|agy-context-saver|rtk|--no-integrity.*--allow-unaudited/i);
      assert.match(uxSetup.stdout, /Next steps: reload or restart Antigravity Desktop IDE/);

      // UX-SQ-005 & standalone status: shows (not on PATH) + guidance, zero prose em dashes, and zero companion warnings
      const statusOffPath = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" });
      assert.equal(statusOffPath.status, 0, statusOffPath.stderr || statusOffPath.stdout);
      assert.match(statusOffPath.stdout, /CLI Shim \(agy-squad\): INSTALLED \(not on PATH\)/);
      assert.match(statusOffPath.stdout, /\[WARN\] CLI bin directory is not on your PATH:/);
      assert.doesNotMatch(statusOffPath.stdout, /\u2014/, "UX-SQ-R2-007: status output must not contain prose U+2014 em dashes");
      assert.doesNotMatch(statusOffPath.stdout, /Companion CLI|Companion Optimizer|agy-context|rtk|2\.0\.4\+/i);
      assert.match(statusOffPath.stdout, /Overall Status: HEALTHY & ACTIVE/);

      const uxBinDir = path.join(uxProfile, ".gemini", "antigravity", "bin");
      const statusOnPath = spawnSync(process.execPath, [cli, "status"], {
        cwd: repoRoot,
        env: withEnvPath(`${uxBinDir}${path.delimiter}${uxEmptyPath}`, { ...process.env, AGY_TEST_PROFILE_DIR: uxProfile }),
        encoding: "utf8"
      });
      assert.equal(statusOnPath.status, 0, statusOnPath.stderr || statusOnPath.stdout);
      assert.match(statusOnPath.stdout, /CLI Shim \(agy-squad\): INSTALLED \(on PATH\)/);
      assert.doesNotMatch(statusOnPath.stdout, /\[WARN\] CLI bin directory is not on your PATH:/);

      // UX-SQ-005: cross-platform isDirOnPath helper check (POSIX & Windows delimiters)
      assert.equal(installerMod.isDirOnPath("/home/dev/.gemini/antigravity/bin", "/usr/bin:/home/dev/.gemini/antigravity/bin", "linux"), true);
      assert.equal(installerMod.isDirOnPath("/home/dev/.gemini/antigravity/bin", "/usr/bin:/usr/local/bin", "linux"), false);
      assert.equal(installerMod.isDirOnPath("C:\\Users\\Dev\\.gemini\\antigravity\\bin", "C:\\Windows;c:\\users\\dev\\.gemini\\antigravity\\bin\\", "win32"), true);
      assert.equal(installerMod.isDirOnPath("C:\\Users\\Dev\\.gemini\\antigravity\\bin", "C:\\Windows;C:\\Tools", "win32"), false);

      // UX-SQ-014: PARTIAL INSTALLATION also prints actionable setup hint
      fs.rmSync(path.join(uxProfile, ".gemini", "config", "plugins", "agy-squad", "mcp_config.json"), { force: true });
      const partialStatus = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" });
      assert.equal(partialStatus.status, 1);
      assert.match(partialStatus.stdout, /Overall Status: PARTIAL INSTALLATION/);
      assert.match(partialStatus.stdout, /Next step: run 'npx --package=agy-squad agy-squad setup'/);

      // UX-SQ-004: forceCopyFallback installed skills contain zero ../../../docs/ or ../../../../docs/ links
      process.env.AGY_TEST_PROFILE_DIR = uxProfile;
      await runAgySquadInstall({ silent: true, forceCopyFallback: true });
      const copiedSkillsRoot = path.join(uxProfile, ".gemini", "config", "plugins", "agy-squad", "skills");
      const walkCopiedMd = (dir) => {
        const res = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) res.push(...walkCopiedMd(full));
          else if (entry.isFile() && entry.name.endsWith(".md")) res.push(full);
        }
        return res;
      };
      const copiedMdFiles = walkCopiedMd(copiedSkillsRoot);
      assert.ok(copiedMdFiles.length >= 4, "UX-SQ-004: expected copied skill markdown files under forceCopyFallback");
      for (const file of copiedMdFiles) {
        const body = fs.readFileSync(file, "utf8");
        assert.doesNotMatch(body, /\.\.\/\.\.\/\.\.\/docs\//, `UX-SQ-004: relative ../../../docs/ link leaked into copy-fallback skill ${file}`);
      }

      // RAW-DEP-001, RAW-DEP-002, RAW-SCRIPT-002: Node >= 22 runtime guard, MCP GUI PATH launcher fallback, and dangling skills symlink recovery
      assert.equal(installerMod.isNodeVersionSupported("20.18.0"), false);
      assert.equal(installerMod.isNodeVersionSupported("v20.19.0"), false);
      assert.equal(installerMod.isNodeVersionSupported("22.0.0"), true);
      assert.equal(installerMod.isNodeVersionSupported("v24.0.1"), true);
      assert.equal(installerMod.isNodeVersionSupported("22.0.0-rc.1"), true);
      assert.equal(installerMod.isNodeVersionSupported("garbage 22.0.0"), false);
      assert.equal(installerMod.isNodeVersionSupported("22.0.0junk"), false);
      assert.throws(() => installerMod.assertNodeVersion("20.18.0"), /requires Node\.js >= 22\.0\.0 \(found v20\.18\.0\)/);
      assert.throws(() => installerMod.assertNodeVersion(""), /requires Node\.js >= 22\.0\.0 \(found unknown\)/);

      const unsupportedStatusLines = [];
      const unsupportedStatus = installerMod.printStatus({
        nodeVersion: "20.18.0",
        log: (line) => unsupportedStatusLines.push(line)
      });
      assert.equal(unsupportedStatus.details.runtime.supported, false);
      assert.equal(unsupportedStatus.isComplete, false);
      assert.ok(
        unsupportedStatusLines.some((l) => l.includes("Overall Status: UNSUPPORTED NODE.JS RUNTIME")),
        `RAW-DEP-001: status under Node < 22 must report UNSUPPORTED NODE.JS RUNTIME, got: ${unsupportedStatusLines.join("\n")}`
      );
      assert.ok(
        unsupportedStatusLines.some((l) => l.includes("upgrade Node.js to >= 22.0.0 (found v20.18.0)")),
        "RAW-DEP-001: status under Node < 22 must instruct upgrading Node.js rather than re-running setup on Node 20"
      );

      const prefixedVersionLines = [];
      installerMod.printStatus({
        nodeVersion: "v20.18.0",
        log: (line) => prefixedVersionLines.push(line)
      });
      assert.ok(
        prefixedVersionLines.some((l) => l.includes("UNSUPPORTED (v20.18.0 < 22.0.0; upgrade Node.js)")),
        `printStatus must not double-prefix v-prefixed nodeVersion, got: ${prefixedVersionLines.join("\n")}`
      );

      const emptyVersionLines = [];
      installerMod.printStatus({
        nodeVersion: "",
        log: (line) => emptyVersionLines.push(line)
      });
      assert.ok(
        emptyVersionLines.some((l) => l.includes("UNSUPPORTED (unknown < 22.0.0; upgrade Node.js)")),
        `printStatus must normalize empty nodeVersion to unknown, got: ${emptyVersionLines.join("\n")}`
      );

      const runtimeStatusHuman = spawnSync(process.execPath, [cli, "status"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" });
      assert.equal(runtimeStatusHuman.status, 0, runtimeStatusHuman.stderr || runtimeStatusHuman.stdout);
      assert.match(runtimeStatusHuman.stdout, /Node\.js Runtime \(>= 22\.0\.0\): SUPPORTED/);
      const runtimeStatusJson = JSON.parse(
        spawnSync(process.execPath, [cli, "status", "--json"], { cwd: repoRoot, env: uxBaseEnv, encoding: "utf8" }).stdout
      );
      assert.equal(runtimeStatusJson.details.runtime.supported, true);
      assert.equal(runtimeStatusJson.details.runtime.minNodeVersion, "22.0.0");

      const formattedMcpLauncher = installerMod.formatPosixMcpLauncher('/opt/node "24" `bt` $v/node');
      assert.ok(formattedMcpLauncher.startsWith("#!/bin/sh\n"));
      assert.match(formattedMcpLauncher, /-ge 22/);
      assert.ok(
        formattedMcpLauncher.includes('exec "/opt/node \\"24\\" \\`bt\\` \\$v/node" "$@"'),
        "RAW-DEP-002: formatPosixMcpLauncher must escape quotes, backticks, and $ in execPath fallback"
      );

      const uxPluginDir = path.join(uxProfile, ".gemini", "config", "plugins", "agy-squad");
      const uxPluginMcp = JSON.parse(fs.readFileSync(path.join(uxPluginDir, "mcp_config.json"), "utf8"));
      const uxMcpEntry = uxPluginMcp.mcpServers["agy-squad"];
      if (process.platform === "win32") {
        assert.equal(uxMcpEntry.command, process.execPath, "RAW-DEP-002: Windows plugin mcp_config.json must pin process.execPath");
        assert.deepEqual(uxMcpEntry.args, ["./mcp/index.js"]);
      } else {
        assert.equal(uxMcpEntry.command, "/bin/sh", "RAW-DEP-002: POSIX plugin mcp_config.json must invoke /bin/sh ./mcp-launch.sh");
        assert.deepEqual(uxMcpEntry.args, ["./mcp-launch.sh", "./mcp/index.js"]);
        const launcherFile = path.join(uxPluginDir, "mcp-launch.sh");
        assert.equal(fs.existsSync(launcherFile), true, "RAW-DEP-002: mcp-launch.sh must exist in installed plugin directory");

        // Verify minimal non-login GUI PATH still launches MCP server via process.execPath fallback
        const initReq = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } }) + "\n";
        const guiLaunch = spawnSync(uxMcpEntry.command, uxMcpEntry.args, {
          cwd: uxPluginDir,
          env: { PATH: "/usr/bin:/bin" },
          input: initReq,
          encoding: "utf8"
        });
        assert.equal(guiLaunch.status, 0, `RAW-DEP-002: minimal-PATH MCP launcher failed: ${guiLaunch.stderr}`);
        assert.match(guiLaunch.stdout, /"name":"agy-squad"/);

        // Missing or non-file mcp-launch.sh must be detected as incomplete registration
        fs.unlinkSync(launcherFile);
        const missingLauncherDetect = detectExistingInstallation();
        assert.equal(missingLauncherDetect.details.mcp.pluginRegistered, false);
        assert.equal(missingLauncherDetect.isComplete, false);
        fs.mkdirSync(launcherFile);
        const dirLauncherDetect = detectExistingInstallation();
        assert.equal(dirLauncherDetect.details.mcp.pluginRegistered, false, "Directory at mcp-launch.sh must not count as valid launcher");
        fs.rmSync(launcherFile, { recursive: true, force: true });
        await runAgySquadInstall({ silent: true, forceCopyFallback: true });
        assert.equal(fs.existsSync(launcherFile), true);

        // Outdated Node 18 on PATH must be skipped in favor of process.execPath by both mcp-launch.sh and POSIX agy-squad CLI shim
        const staleNodeDir = path.join(uxProfile, "stale-node18-bin");
        fs.mkdirSync(staleNodeDir, { recursive: true });
        fs.writeFileSync(
          path.join(staleNodeDir, "node"),
          '#!/bin/sh\nif [ "$1" = "-p" ]; then echo 18.20.0; exit 0; fi\necho STALE_NODE18 >&2\nexit 42\n',
          { mode: 0o755 }
        );
        const staleNodeEnv = { ...uxBaseEnv, PATH: `${staleNodeDir}:/usr/bin:/bin` };
        const staleMcpLaunch = spawnSync(uxMcpEntry.command, uxMcpEntry.args, {
          cwd: uxPluginDir,
          env: staleNodeEnv,
          input: initReq,
          encoding: "utf8"
        });
        assert.equal(staleMcpLaunch.status, 0, `RAW-DEP-002: mcp-launch.sh failed when PATH had Node 18: ${staleMcpLaunch.stderr}`);
        assert.match(staleMcpLaunch.stdout, /"name":"agy-squad"/);
        const installedPosixShim = path.join(uxProfile, ".gemini", "antigravity", "bin", "agy-squad");
        const staleShimRun = spawnSync(installedPosixShim, ["--version"], {
          cwd: repoRoot,
          env: staleNodeEnv,
          encoding: "utf8"
        });
        assert.equal(staleShimRun.status, 0, `RAW-DEP-002: POSIX CLI shim must skip Node 18 on PATH and use process.execPath: ${staleShimRun.stderr}`);
        assert.match(staleShimRun.stdout.trim(), /^\d+\.\d+\.\d+/);

        // Broken node on PATH must cause install.sh to print '(found unknown)' instead of '(found vunknown)'
        const brokenNodeDir = path.join(uxProfile, "broken-node-bin");
        fs.mkdirSync(brokenNodeDir, { recursive: true });
        fs.writeFileSync(path.join(brokenNodeDir, "node"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
        const brokenInstallSh = spawnSync("bash", [path.join(repoRoot, "install.sh"), "--check"], {
          cwd: repoRoot,
          env: { ...uxBaseEnv, PATH: `${brokenNodeDir}:/usr/bin:/bin` },
          encoding: "utf8"
        });
        assert.equal(brokenInstallSh.status, 1);
        assert.match(brokenInstallSh.stderr, /requires Node\.js >= 22\.0\.0 \(found unknown\)/);
      }

      // Missing pinned absolute command in plugin mcp_config.json (e.g., relocated Windows node.exe) must be flagged
      const origPluginMcpRaw = fs.readFileSync(path.join(uxPluginDir, "mcp_config.json"), "utf8");
      fs.writeFileSync(
        path.join(uxPluginDir, "mcp_config.json"),
        JSON.stringify({ mcpServers: { "agy-squad": { command: path.join(uxProfile, "missing-node-bin"), args: ["./mcp/index.js"] } } }, null, 2) + "\n"
      );
      const missingPinnedDetect = detectExistingInstallation();
      assert.equal(missingPinnedDetect.details.mcp.pluginRegistered, false, "Missing pinned absolute MCP command must mark plugin unregistered");
      assert.equal(missingPinnedDetect.isComplete, false);
      fs.writeFileSync(path.join(uxPluginDir, "mcp_config.json"), origPluginMcpRaw);

      // RAW-SCRIPT-002: dangling skills symlink inside installed plugin dir is unlinked cleanly on in-place repeat setup (installedSource === true)
      const uxSkillsDest = path.join(uxPluginDir, "skills");
      fs.rmSync(uxSkillsDest, { recursive: true, force: true });
      let createdDanglingLink = false;
      try {
        fs.symlinkSync(path.join(uxPluginDir, "does-not-exist-skills-target"), uxSkillsDest, process.platform === "win32" ? "junction" : "dir");
        createdDanglingLink = true;
      } catch {}
      if (createdDanglingLink) {
        assert.equal(fs.existsSync(uxSkillsDest), false);
        assert.equal(fs.lstatSync(uxSkillsDest).isSymbolicLink(), true);
        const inPlaceSetup = spawnSync(process.execPath, [path.join(uxPluginDir, "bin", "agy-squad.mjs"), "setup"], {
          cwd: repoRoot,
          env: uxBaseEnv,
          encoding: "utf8"
        });
        assert.equal(inPlaceSetup.status, 0, `RAW-SCRIPT-002: in-place repeat setup failed on dangling skills symlink: ${inPlaceSetup.stderr || inPlaceSetup.stdout}`);
        assert.equal(fs.existsSync(path.join(uxSkillsDest, "pr-review", "SKILL.md")), true, "RAW-SCRIPT-002: dangling skills symlink must be replaced cleanly on repeat setup");
      }
    } finally {
      process.env.AGY_TEST_PROFILE_DIR = tmpProfile;
      fs.rmSync(uxProfile, { recursive: true, force: true });
    }
  }

  // ASQ-TEST-001 regressions: ASQ-SEC-001, ASQ-SCRIPT-001, ASQ-DEP-001, ASQ-SCRIPT-002, ASQ-SEC-007, ASQ-SCRIPT-006, A1
  {
    const installerMod = await import("../scripts/install-register.mjs");
    const asqProfile = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-asq-reg-")));
    const asqEnv = { ...process.env, AGY_TEST_PROFILE_DIR: asqProfile };
    process.env.AGY_TEST_PROFILE_DIR = asqProfile;
    try {
      const cfgDir = path.join(asqProfile, ".gemini", "config");
      const pluginsDir = path.join(cfgDir, "plugins");
      const pluginDest = path.join(pluginsDir, "agy-squad");
      const mcpJsonPath = path.join(cfgDir, "mcp_config.json");
      const mcpBakPath = `${mcpJsonPath}.agy-squad.bak`;
      const cfgJsonPath = path.join(cfgDir, "config.json");
      const cfgBakPath = `${cfgJsonPath}.agy-squad.bak`;
      fs.mkdirSync(cfgDir, { recursive: true });

      // ASQ-SEC-001: Foreign MCP servers 'agy-squad-custom' and 'agy-squad-pro' survive restore-backups and uninstall --restore-backups
      fs.writeFileSync(mcpJsonPath, JSON.stringify({
        mcpServers: {
          "agy-squad": { command: "new-node", args: ["./new.js"] },
          "agy-squad-custom": { command: "custom-bin", args: ["--flag"] },
          "agy-squad-pro": { command: "pro-bin", args: ["--pro"] },
          "other-tool": { command: "other-bin", args: [] }
        }
      }, null, 2) + "\n");
      fs.writeFileSync(mcpBakPath, JSON.stringify({
        mcpServers: { "agy-squad": { command: "orig-node", args: ["./orig.js"] } }
      }, null, 2) + "\n");
      await installerMod.runRestoreBackups({ silent: true });
      const afterRestoreMcp = JSON.parse(fs.readFileSync(mcpJsonPath, "utf8")).mcpServers;
      assert.equal(afterRestoreMcp["agy-squad"].command, "orig-node");
      assert.deepEqual(afterRestoreMcp["agy-squad-custom"], { command: "custom-bin", args: ["--flag"] });
      assert.deepEqual(afterRestoreMcp["agy-squad-pro"], { command: "pro-bin", args: ["--pro"] });
      assert.deepEqual(afterRestoreMcp["other-tool"], { command: "other-bin", args: [] });

      fs.writeFileSync(mcpBakPath, JSON.stringify({ mcpServers: {} }, null, 2) + "\n");
      await installerMod.runUninstall({ restoreBackups: true, silent: true });
      const afterUninstallMcp = JSON.parse(fs.readFileSync(mcpJsonPath, "utf8")).mcpServers;
      assert.equal(afterUninstallMcp["agy-squad"], undefined);
      assert.deepEqual(afterUninstallMcp["agy-squad-custom"], { command: "custom-bin", args: ["--flag"] });
      assert.deepEqual(afterUninstallMcp["agy-squad-pro"], { command: "pro-bin", args: ["--pro"] });

      // ASQ-SCRIPT-001: Corrupt config.json or config.json.agy-squad.bak fails closed, leaving mcp_config.json and its backup byte-identical
      const mcpBefore = JSON.stringify({ mcpServers: { "agy-squad": { command: "cur" }, foreign: { command: "f" } } }, null, 2) + "\n";
      const mcpBakBefore = JSON.stringify({ mcpServers: { "agy-squad": { command: "bak" } } }, null, 2) + "\n";
      fs.writeFileSync(mcpJsonPath, mcpBefore);
      fs.writeFileSync(mcpBakPath, mcpBakBefore);
      fs.writeFileSync(cfgJsonPath, JSON.stringify({ plugins: { "agy-squad": { enabled: true } } }, null, 2) + "\n");
      fs.writeFileSync(cfgBakPath, "{ corrupt backup json");
      await assert.rejects(() => installerMod.runRestoreBackups({ silent: true }), /invalid JSON|JSON/i);
      assert.equal(fs.readFileSync(mcpJsonPath, "utf8"), mcpBefore, "ASQ-SCRIPT-001: corrupt config backup must leave mcp_config.json byte-identical");
      assert.equal(fs.readFileSync(mcpBakPath, "utf8"), mcpBakBefore, "ASQ-SCRIPT-001: corrupt config backup must leave mcp_config.json.agy-squad.bak byte-identical");

      fs.writeFileSync(cfgJsonPath, "{ corrupt current config json");
      fs.writeFileSync(cfgBakPath, JSON.stringify({ plugins: {} }, null, 2) + "\n");
      await assert.rejects(() => installerMod.runRestoreBackups({ silent: true }), /invalid JSON|JSON/i);
      assert.equal(fs.readFileSync(mcpJsonPath, "utf8"), mcpBefore, "ASQ-SCRIPT-001: corrupt config.json must leave mcp_config.json byte-identical");
      assert.equal(fs.readFileSync(mcpBakPath, "utf8"), mcpBakBefore, "ASQ-SCRIPT-001: corrupt config.json must leave mcp_config.json.agy-squad.bak byte-identical");

      fs.rmSync(cfgJsonPath, { force: true });
      fs.rmSync(cfgBakPath, { force: true });
      fs.rmSync(mcpJsonPath, { force: true });
      fs.rmSync(mcpBakPath, { force: true });

      // ASQ-DEP-001: Copy-fallback install stages cleanly and replaces atomically without leftover staging/backup dirs
      await installerMod.runInstall({ silent: true, forceCopyFallback: true });
      const sentinelFile = path.join(pluginDest, "stale-sentinel.txt");
      fs.writeFileSync(sentinelFile, "old-install\n");
      await installerMod.runInstall({ silent: true, forceCopyFallback: true });
      assert.equal(fs.existsSync(sentinelFile), false, "ASQ-DEP-001: staged swap must cleanly replace prior copy-fallback install");
      const pluginSiblings = fs.readdirSync(pluginsDir);
      assert.deepEqual(
        pluginSiblings.filter((name) => name.startsWith("agy-squad.staging-") || name.startsWith("agy-squad.backup-")),
        [],
        `ASQ-DEP-001: unexpected leftover staging/backup dirs: ${pluginSiblings.join(", ")}`
      );
      assert.equal(installerMod.detectExistingInstallation().isComplete, true);

      // DEP-001 & A1: copy-fallback install excludes maintainer-only paths directly (no manual rmSync mask) and ships exactly the 4 portable skills
      for (const excludedRel of [
        ".agents/skills/self-diagnosis",
        "skills/self-diagnosis",
        "scripts/release-preflight.mjs",
        "docs/plans",
        "docs/reviews",
        ".github"
      ]) {
        assert.equal(
          fs.existsSync(path.join(pluginDest, excludedRel)),
          false,
          `DEP-001: forceCopyFallback install must not copy maintainer-only path '${excludedRel}'`
        );
      }
      assert.deepEqual(
        fs.readdirSync(path.join(pluginDest, "skills")).sort(),
        ["day-one-review", "full-review", "pr-review", "swarm-governance"]
      );
      const fourSkillStatus = installerMod.detectExistingInstallation();
      assert.equal(fourSkillStatus.details.plugin.skillsReady, true, "A1: 4 shipped skills without self-diagnosis must satisfy skillsReady");
      assert.equal(fourSkillStatus.isComplete, true);
      fs.rmSync(path.join(pluginDest, "skills", "pr-review", "SKILL.md"));
      assert.equal(installerMod.detectExistingInstallation().details.plugin.skillsReady, false, "A1: missing shipped skill must flip skillsReady to false");

      // ASQ-SCRIPT-002: Windows off-PATH persistence guidance preserves REG_EXPAND_SZ via DoNotExpandEnvironmentNames + ExpandString
      const winGuidance = installerMod.formatPathGuidanceLines("C:\\Users\\Dev\\.gemini\\antigravity\\bin", "win32").join("\n");
      assert.match(winGuidance, /DoNotExpandEnvironmentNames/);
      assert.match(winGuidance, /ExpandString/);
      assert.match(winGuidance, /REG_EXPAND_SZ/);

      // ASQ-SEC-007: formatPosixShim rejects /[\r\n\0]/ in targetRoot and execPath
      for (const badPath of ["/tmp/ok\nrm -rf /", "/tmp/ok\rfoo", "/tmp/ok\0bar"]) {
        assert.throws(() => installerMod.formatPosixShim(badPath), /Invalid POSIX CLI shim target path/);
        assert.throws(() => installerMod.formatPosixShim("/tmp/valid-root", badPath), /Invalid POSIX CLI shim execPath/);
      }

      // Batch A SCRIPT-001: runUninstall({ restoreBackups: true }) validates backups & target sections BEFORE deleting pluginDest/shims or mutating configs/backups
      await installerMod.runInstall({ silent: true, forceCopyFallback: true });
      const binDir = path.join(asqProfile, ".gemini", "antigravity", "bin");
      const snapshotFiles = () => {
        const shimNames = fs.readdirSync(binDir).sort();
        const shims = Object.fromEntries(shimNames.map((n) => [n, fs.readFileSync(path.join(binDir, n), "utf8")]));
        return {
          pluginExists: fs.existsSync(pluginDest),
          pluginJson: fs.readFileSync(path.join(pluginDest, "plugin.json"), "utf8"),
          shims,
          cfg: fs.readFileSync(cfgJsonPath, "utf8"),
          cfgBak: fs.readFileSync(cfgBakPath, "utf8"),
          mcp: fs.readFileSync(mcpJsonPath, "utf8"),
          mcpBak: fs.readFileSync(mcpBakPath, "utf8")
        };
      };
      const validCfgBefore = fs.readFileSync(cfgJsonPath, "utf8");
      const validCfgBak = JSON.stringify({ plugins: {} }, null, 2) + "\n";
      const validMcpBefore = JSON.stringify({ mcpServers: { "agy-squad": { command: "cur" }, foreign: { command: "f" } } }, null, 2) + "\n";
      const validMcpBak = JSON.stringify({ mcpServers: { "agy-squad": { command: "bak" } } }, null, 2) + "\n";
      const script001Cases = [
        [
          "corrupt config.json.agy-squad.bak",
          { cfg: validCfgBefore, cfgBak: "{ corrupt config backup", mcp: validMcpBefore, mcpBak: validMcpBak },
          /invalid JSON|JSON/i
        ],
        [
          "corrupt mcp_config.json.agy-squad.bak",
          { cfg: validCfgBefore, cfgBak: validCfgBak, mcp: validMcpBefore, mcpBak: "{ corrupt mcp backup" },
          /invalid JSON|JSON/i
        ],
        [
          "non-object plugins section in config.json",
          { cfg: JSON.stringify({ plugins: [] }), cfgBak: validCfgBak, mcp: validMcpBefore, mcpBak: validMcpBak },
          /field 'plugins' must be a JSON object/
        ],
        [
          "non-object mcpServers section in mcp_config.json",
          { cfg: validCfgBefore, cfgBak: validCfgBak, mcp: JSON.stringify({ mcpServers: "invalid" }), mcpBak: validMcpBak },
          /field 'mcpServers' must be a JSON object/
        ]
      ];
      for (const [label, files, errPattern] of script001Cases) {
        fs.writeFileSync(cfgJsonPath, files.cfg);
        fs.writeFileSync(cfgBakPath, files.cfgBak);
        fs.writeFileSync(mcpJsonPath, files.mcp);
        fs.writeFileSync(mcpBakPath, files.mcpBak);
        const before = snapshotFiles();
        assert.ok(Object.keys(before.shims).length > 0, "Expected installed CLI shims before failed uninstall");
        await assert.rejects(
          () => installerMod.runUninstall({ restoreBackups: true, silent: true }),
          errPattern,
          `SCRIPT-001: runUninstall({ restoreBackups: true }) must fail closed on ${label}`
        );
        const after = snapshotFiles();
        assert.deepEqual(after, before, `SCRIPT-001: ${label} must leave pluginDest, shims, configs, and backups byte-identical`);
      }
      fs.writeFileSync(cfgJsonPath, validCfgBefore);
      fs.rmSync(cfgBakPath, { force: true });
      fs.rmSync(mcpBakPath, { force: true });

      // Batch A SCRIPT-002 & ASQ-SCRIPT-006: compact foreign-only mcp_config.json (no trailing newline) stays byte-identical on uninstall, stdout omits false removal claim, and prints IDE reload reminder
      const compactForeignMcp = '{"mcpServers":{"foreign-srv":{"command":"f","args":[]}}}';
      fs.writeFileSync(mcpJsonPath, compactForeignMcp);
      const uninstallCliRes = spawnSync(process.execPath, [cli, "uninstall"], {
        cwd: repoRoot,
        env: asqEnv,
        encoding: "utf8"
      });
      assert.equal(uninstallCliRes.status, 0, uninstallCliRes.stderr || uninstallCliRes.stdout);
      assert.equal(
        fs.readFileSync(mcpJsonPath, "utf8"),
        compactForeignMcp,
        "SCRIPT-002: foreign-only compact mcp_config.json must stay byte-identical after uninstall"
      );
      assert.doesNotMatch(
        uninstallCliRes.stdout,
        /Removed 'agy-squad' from:.*mcp_config\.json/,
        "SCRIPT-002: uninstall stdout must omit mcp_config.json removal notice when agy-squad was absent"
      );
      assert.match(uninstallCliRes.stdout, /reload or restart Antigravity Desktop IDE/i);

      // Batch A SEC-008: release-tag.yml publish job is tag-gated and never uses --clobber on gh release upload
      const releaseWorkflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "release-tag.yml"), "utf8");
      const publishIdx = releaseWorkflow.indexOf("\n  publish:");
      assert.notEqual(publishIdx, -1, "SEC-008: expected 'publish:' job in .github/workflows/release-tag.yml");
      const publishJobBlock = releaseWorkflow.slice(publishIdx);
      assert.match(
        publishJobBlock,
        /^\s{4}if:\s*startsWith\(github\.ref,\s*'refs\/tags\/v'\)\s*$/m,
        "SEC-008: publish job must enforce if: startsWith(github.ref, 'refs/tags/v')"
      );
      assert.match(publishJobBlock, /\bgh release upload\b/, "SEC-008: expected gh release upload in publish job");
      assert.doesNotMatch(
        releaseWorkflow,
        /\bgh release upload[^\n]*--clobber\b/,
        "SEC-008: gh release upload must not pass --clobber"
      );

      // Day-1 raw-final RF-SCRIPT-001: stale global mcp_config.json-only profile reports PARTIAL INSTALLATION + Next step (not DISABLED)
      const rfProfile = fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-rf-status-"));
      try {
        const rfCfgDir = path.join(rfProfile, ".gemini", "config");
        fs.mkdirSync(rfCfgDir, { recursive: true });
        fs.writeFileSync(
          path.join(rfCfgDir, "mcp_config.json"),
          JSON.stringify({ mcpServers: { "agy-squad": { command: "node", args: ["old/mcp/index.js"] } } }, null, 2) + "\n"
        );
        const rfStatus = spawnSync(process.execPath, [cli, "status"], {
          cwd: repoRoot,
          env: { ...process.env, AGY_TEST_PROFILE_DIR: rfProfile },
          encoding: "utf8"
        });
        assert.equal(rfStatus.status, 1, "RF-SCRIPT-001: stale global MCP-only profile must exit 1");
        assert.match(rfStatus.stdout, /Overall Status: PARTIAL INSTALLATION/, "RF-SCRIPT-001: stale global MCP-only profile must report PARTIAL INSTALLATION");
        assert.doesNotMatch(rfStatus.stdout, /Overall Status: DISABLED/, "RF-SCRIPT-001: stale global MCP-only profile must not report DISABLED");
        assert.match(rfStatus.stdout, /Next step: run 'npx --package=agy-squad agy-squad setup'/, "RF-SCRIPT-001: Next step setup hint must print");
      } finally {
        fs.rmSync(rfProfile, { recursive: true, force: true });
      }
    } finally {
      process.env.AGY_TEST_PROFILE_DIR = tmpProfile;
      fs.rmSync(asqProfile, { recursive: true, force: true });
    }
  }

  console.log("Lifecycle installer, --check, and rollback tests passed");
} finally {
  if (prevProfileEnv === undefined) delete process.env.AGY_TEST_PROFILE_DIR;
  else process.env.AGY_TEST_PROFILE_DIR = prevProfileEnv;
  const repoSkillsLink = path.join(repoRoot, "skills");
  try {
    if (fs.existsSync(repoSkillsLink) && fs.lstatSync(repoSkillsLink).isSymbolicLink()) {
      fs.unlinkSync(repoSkillsLink);
    }
  } catch {}
  fs.rmSync(tmpProfile, { recursive: true, force: true });
}
