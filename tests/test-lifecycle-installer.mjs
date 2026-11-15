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
const testEnv = { ...process.env, AGY_TEST_PROFILE_DIR: tmpProfile };

try {
  // 1. Release preflight & --version
  const preflight = spawnSync(process.execPath, [preflightScript], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(preflight.status, 0, preflight.stderr || preflight.stdout);
  assert.match(preflight.stdout, /Release preflight passed/);

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

  // 3. Seed foreign mcp_config.json and config.json, then run setup
  const configDir = path.join(tmpProfile, ".gemini", "config");
  fs.mkdirSync(configDir, { recursive: true });
  const mcpPath = path.join(configDir, "mcp_config.json");
  const cfgPath = path.join(configDir, "config.json");
  fs.writeFileSync(
    mcpPath,
    JSON.stringify({ mcpServers: { "foreign-server": { command: "node", args: ["foreign.js"] } } }, null, 2) + "\n"
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

  const installedMcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  assert.ok(installedMcp.mcpServers["foreign-server"], "Foreign MCP server must be preserved");
  assert.ok(installedMcp.mcpServers["agy-squad"], "agy-squad MCP server must be registered");

  const installedCfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  assert.equal(installedCfg.plugins["foreign-plugin"]?.enabled, true);
  assert.equal(installedCfg.plugins["agy-squad"]?.enabled, true);

  // 4. Malformed config preservation (fails closed without mutating)
  fs.writeFileSync(mcpPath, "{ malformed json");
  const badCheck = spawnSync(process.execPath, [cli, "setup", "--check"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.notEqual(badCheck.status, 0);
  assert.equal(fs.readFileSync(mcpPath, "utf8"), "{ malformed json");

  // Restore valid JSON & test uninstall --restore-backups
  fs.writeFileSync(mcpPath, JSON.stringify(installedMcp, null, 2) + "\n");
  const uninst = spawnSync(process.execPath, [cli, "uninstall", "--restore-backups"], {
    cwd: repoRoot,
    env: testEnv,
    encoding: "utf8"
  });
  assert.equal(uninst.status, 0, uninst.stderr || uninst.stdout);

  const afterMcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  assert.ok(afterMcp.mcpServers["foreign-server"]);
  assert.equal(afterMcp.mcpServers["agy-squad"], undefined);

  console.log("Lifecycle installer, --check, and rollback tests passed");
} finally {
  const repoSkillsLink = path.join(repoRoot, "skills");
  try {
    if (fs.existsSync(repoSkillsLink) && fs.lstatSync(repoSkillsLink).isSymbolicLink()) {
      fs.unlinkSync(repoSkillsLink);
    }
  } catch {}
  fs.rmSync(tmpProfile, { recursive: true, force: true });
}
