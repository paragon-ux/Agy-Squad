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
  const { runInstall: runAgySquadInstall, detectExistingInstallation, formatWindowsCmdShim } = await import("../scripts/install-register.mjs");
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
    const okRun = spawnSync("cmd.exe", ["/d", "/c", winShimPath, "0"], { encoding: "utf8" });
    assert.equal(okRun.status, 0, okRun.stderr || okRun.stdout);
    const errRun = spawnSync("cmd.exe", ["/d", "/c", winShimPath, "7"], { encoding: "utf8" });
    assert.equal(errRun.status, 7, `Expected Windows .cmd shim to propagate exit code 7, got ${errRun.status}`);
  }

  await runAgySquadInstall({ silent: true, forceCopyFallback: true });
  fs.writeFileSync(path.join(pluginDir, "stale-old-file.txt"), "stale");
  await runAgySquadInstall({ silent: true, forceCopyFallback: true });
  assert.equal(fs.existsSync(path.join(pluginDir, "stale-old-file.txt")), false, "forceCopyFallback must prune stale non-symlink files (SQ-DEP-004)");
  assert.equal(fs.lstatSync(pluginDir).isSymbolicLink(), false);

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
