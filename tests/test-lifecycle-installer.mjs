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
  assert.match(statusRes.stdout, /Companion CLI \(agy-context >= 2\.0\.1\):/);
  assert.match(statusRes.stdout, /Companion Optimizer \(rtk >= 1\.1\.0\):/);

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

  // SQ-DEP-005: Non-fatal companion checks report MISSING, OUTDATED, and AVAILABLE cleanly across isolated profiles
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

  const missingCompanionStatus = spawnSync(process.execPath, [cli, "status", "--json"], {
    cwd: repoRoot,
    env: withEnvPath(emptyBinDir, testEnv),
    encoding: "utf8"
  });
  assert.equal(missingCompanionStatus.status, 0, "Missing companions must be non-fatal when Agy-Squad is installed (SQ-DEP-005)");
  const missingCompanionJson = JSON.parse(missingCompanionStatus.stdout);
  assert.equal(missingCompanionJson.isInstalled, true);
  assert.equal(missingCompanionJson.isComplete, true);
  assert.equal(missingCompanionJson.details.plugin.isSymlink, true);
  assert.equal(missingCompanionJson.details.plugin.isCopyFallback, false);
  assert.equal(missingCompanionJson.details.plugin.pointsElsewhere, false);
  assert.equal(missingCompanionJson.details.plugin.versionMismatch, false);
  assert.equal(missingCompanionJson.details.companions.agyContext.available, false);
  assert.equal(missingCompanionJson.details.companions.rtk.available, false);

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

  const companionBinDir = path.join(tmpProfile, ".gemini", "antigravity", "bin");
  const fakePathBinDir = path.join(tmpProfile, "fake-path-bin");
  fs.mkdirSync(companionBinDir, { recursive: true });
  fs.mkdirSync(fakePathBinDir, { recursive: true });
  const writeFakeVersionBinary = (dir, baseName, versionText) => {
    if (os.platform() === "win32") {
      const p = path.join(dir, `${baseName}.cmd`);
      fs.writeFileSync(p, `@echo off\r\necho ${versionText}\r\n`);
      return p;
    }
    const p = path.join(dir, baseName);
    fs.writeFileSync(p, `#!/bin/sh\necho "${versionText}"\n`, { mode: 0o755 });
    return p;
  };
  const fakeAgyCtxPath = writeFakeVersionBinary(companionBinDir, "agy-context", "2.0.0");
  const fakeRtkPath = writeFakeVersionBinary(fakePathBinDir, "rtk", "rtk 0.9.5");
  const outdatedCompanionStatus = spawnSync(process.execPath, [cli, "status"], {
    cwd: repoRoot,
    env: withEnvPath(fakePathBinDir, testEnv),
    encoding: "utf8"
  });
  assert.equal(outdatedCompanionStatus.status, 0, "Outdated companions must remain non-fatal");
  assert.match(outdatedCompanionStatus.stdout, /Companion CLI \(agy-context >= 2\.0\.1\): OUTDATED/);
  assert.match(outdatedCompanionStatus.stdout, /Companion Optimizer \(rtk >= 1\.1\.0\): OUTDATED/);

  writeFakeVersionBinary(companionBinDir, "agy-context", "2.0.1");
  writeFakeVersionBinary(fakePathBinDir, "rtk", "rtk 1.1.0");
  const availCompanionStatus = spawnSync(process.execPath, [cli, "status", "--json"], {
    cwd: repoRoot,
    env: withEnvPath(fakePathBinDir, testEnv),
    encoding: "utf8"
  });
  assert.equal(availCompanionStatus.status, 0, availCompanionStatus.stderr);
  const availCompanionJson = JSON.parse(availCompanionStatus.stdout);
  assert.equal(availCompanionJson.details.companions.agyContext.available, true);
  assert.equal(availCompanionJson.details.companions.agyContext.version, "2.0.1");
  assert.equal(availCompanionJson.details.companions.rtk.available, true);
  assert.equal(availCompanionJson.details.companions.rtk.version, "1.1.0");
  fs.rmSync(fakeAgyCtxPath, { force: true });
  fs.rmSync(fakeRtkPath, { force: true });

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
    const activeSchemaDetect = detectExistingInstallation({ includeCompanions: false });
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
  const copyDetect = detectExistingInstallation({ includeCompanions: false });
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
  const redirectedDetect = detectExistingInstallation({ includeCompanions: false });
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
  const directRedirectDetect = detectExistingInstallation({ includeCompanions: false });
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
  assert.equal(detectExistingInstallation({ includeCompanions: false }).isComplete, true);

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

  // L49: skillsReady must require all 4 skills (including swarm-governance) and lifecycle subcommands enforce strict args
  const savedSwarmSkill = fs.readFileSync(path.join(pluginDir, "skills", "swarm-governance", "SKILL.md"), "utf8");
  fs.rmSync(path.join(pluginDir, "skills", "swarm-governance", "SKILL.md"));
  assert.equal(detectExistingInstallation({ includeCompanions: false }).details.plugin.skillsReady, false);
  fs.writeFileSync(path.join(pluginDir, "skills", "swarm-governance", "SKILL.md"), savedSwarmSkill);
  assert.equal(detectExistingInstallation({ includeCompanions: false }).details.plugin.skillsReady, true);

  if (os.platform() !== "win32") {
    const installedPosixShim = path.join(tmpProfile, ".gemini", "antigravity", "bin", "agy-squad");
    fs.chmodSync(installedPosixShim, 0o644);
    assert.equal(detectExistingInstallation({ includeCompanions: false }).details.cliShim.exists, false);
    fs.chmodSync(installedPosixShim, 0o755);
    assert.equal(detectExistingInstallation({ includeCompanions: false }).details.cliShim.exists, true);
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

  // W6 Regressions: S2-SCRIPT-013, S2-TEST-001..003, S2-TEST-006, S2-DEP-001, S2-SCRIPT-010, S2-SCRIPT-011, LEAD-SCRIPT-001
  // S2-SCRIPT-013: Windows probeBinaryVersion invocation safety (Program Files (x86) safe; bare parens & unsafe args/chars rejected)
  const validX86Probe = installerMod.buildWindowsProbeInvocation("C:\\Program Files (x86)\\rtk\\rtk.cmd", ["--version"]);
  assert.ok(validX86Probe && validX86Probe.cmdLine === '"C:\\Program Files (x86)\\rtk\\rtk.cmd" "--version"');
  assert.equal(installerMod.buildWindowsProbeInvocation("bad(cmd)", ["--version"]), null);
  assert.equal(installerMod.buildWindowsProbeInvocation("rtk", ["(--version)"]), null);
  assert.equal(installerMod.buildWindowsProbeInvocation("C:\\bad&dir\\rtk.cmd", ["--version"]), null);
  assert.equal(installerMod.buildWindowsProbeInvocation("rtk", ["--version&calc"]), null);

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
  const missingDocsDetect = detectExistingInstallation({ includeCompanions: false });
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

    // Legacy mcp_config.json.bak WITH agy-squad restores read-only without deleting legacy file
    fs.writeFileSync(cLegacyBak, JSON.stringify({ mcpServers: { "agy-squad": { command: "node", args: ["legacy.js"] } } }) + "\n");
    const legacyRestore = spawnSync(process.execPath, [cli, "restore-backups"], { cwd: repoRoot, env: cEnv, encoding: "utf8" });
    assert.equal(legacyRestore.status, 0, legacyRestore.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(cMcpPath, "utf8")).mcpServers["agy-squad"], { command: "node", args: ["legacy.js"] });
    assert.equal(fs.existsSync(cLegacyBak), true, "Legacy fallback must stay read-only without deleting shared .bak");
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
