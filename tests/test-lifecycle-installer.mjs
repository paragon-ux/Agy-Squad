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
  assert.ok(fs.existsSync(path.join(configDir, "mcp_config.json.bak")), "Backup mcp_config.json.bak must be saved when stripping global entry");
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
  assert.match(cmdShimText, /setlocal/);
  assert.match(cmdShimText, /where node/);
  assert.match(cmdShimText, /if errorlevel 1 goto :fallback/);
  assert.match(cmdShimText, /:fallback/);
  assert.match(cmdShimText, /exit \/b %errorlevel%/);
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
