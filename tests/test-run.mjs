import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { inspectHandoffs } from "../mcp/handoffs.mjs";
import { createRun } from "../mcp/run-state.mjs";

const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-run-test-")));
const root = path.join(temporary, "caller workspace");
fs.mkdirSync(root);
const fakeBin = path.join(temporary, "bin");
fs.mkdirSync(fakeBin);
const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const fixture = path.join(temporary, "native-argv.json");
const manifest = {
  squads: {
    lexer: {
      lead: { role: "Lexer Integrator", objective: "Check token boundaries", scopeFiles: ["lib"] },
      specialists: [{ role: "Boundary Investigator", objective: "Find the EOF failure", scopeFiles: ["lib/lexer.js"] }]
    },
    emitter: {
      lead: { role: "Emitter Integrator", objective: "Verify output equivalence", scopeFiles: ["output"] },
      children: [{ role: "Output Investigator", objective: "Find a reproducible output mismatch", scopeFiles: ["output"] }]
    }
  }
};
const slotOf = agent => agent.Prompt.match(/^Report slot: (.+)$/m)[1];
const unpack = result => {
  assert.equal(result.isError, undefined, result.content[0].text);
  return JSON.parse(result.content[0].text).Subagents;
};

try {
  const managed = createRun(root);
  const dispatch = args => handleDispatchSquad(args, root, managed.relative);
  assert.match(dispatch({ squadId: "all_l1" }).content[0].text, /exactly one/);
  const broken = structuredClone(manifest);
  broken.squads.emitter.children[0].objective = "";
  assert.match(dispatch({ squadId: "all_l1", manifest: broken }).content[0].text, /requires an objective/);
  assert.deepEqual(fs.readdirSync(managed.directory), []);
  const leads = unpack(dispatch({ squadId: "all_l1", manifest }));
  assert.deepEqual(leads.map(({ Role }) => Role), ["Lexer Integrator", "Emitter Integrator"]);
  assert.equal(leads[0].TypeName, "self");
  const nestedArgs = JSON.parse(leads[0].Prompt.match(/Call dispatch_squad once with (\{.*\}), launch/)[1]);
  assert.ok(nestedArgs.manifestPath.startsWith(managed.relative + "/"));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, nestedArgs.manifestPath), "utf8")), manifest);
  const [leaf] = unpack(dispatch(nestedArgs));
  const report = slotOf(leaf);
  assert.equal(leaf.Role, "Boundary Investigator");
  assert.equal(leaf.Workspace, "inherit");
  assert.ok(fs.statSync(path.join(root, path.dirname(report))).isDirectory());
  assert.equal(fs.existsSync(path.join(root, report)), false);
  fs.writeFileSync(path.join(root, report), "Input without a newline triggers EOF.\n");
  const checked = inspectHandoffs(root, {
    workspace: root,
    assignments: [{ conversationId: "fixture-sender", report }],
    handoffs: [{ sender: "fixture-sender", message: `READY ${report} — Final token is missing at EOF.` }]
  });
  assert.equal(checked[0].status, "READY");
  assert.match(dispatch(nestedArgs).content[0].text, /already occupied/);
  const snapshot = path.join(root, nestedArgs.manifestPath);
  fs.writeFileSync(snapshot, JSON.stringify({ squads: { ...manifest.squads, extra: manifest.squads.lexer } }));
  assert.match(dispatch(nestedArgs).content[0].text, /prepared manifest changed/);
  fs.unlinkSync(snapshot);
  fs.writeFileSync(path.join(root, "replacement.json"), JSON.stringify(manifest));
  fs.symlinkSync(path.join(root, "replacement.json"), snapshot);
  assert.match(dispatch(nestedArgs).content[0].text, /prepared manifest changed/);
  const other = createRun(root);
  const flat = unpack(handleDispatchSquad({ squadId: "lexer", manifest }, root, other.relative));
  assert.notEqual(slotOf(flat[0]), report);
  assert.ok(slotOf(flat[0]).startsWith(other.relative));

  const concurrent = createRun(root);
  const dispatchModule = fileURLToPath(new URL("../mcp/dispatch.mjs", import.meta.url));
  const runChildDispatch = squadId => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--input-type=module", "-e",
      `import { handleDispatchSquad } from ${JSON.stringify(dispatchModule)};
       const res = handleDispatchSquad(${JSON.stringify({ squadId, manifest })}, ${JSON.stringify(root)}, ${JSON.stringify(concurrent.relative)});
       if (res.isError) { console.error(res.content[0].text); process.exit(1); }
       process.stdout.write(res.content[0].text);`
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(JSON.parse(stdout).Subagents) : reject(new Error(stderr || `exit ${code}`)));
  });
  const [concurrentLexer, concurrentEmitter] = await Promise.all([runChildDispatch("lexer"), runChildDispatch("emitter")]);
  assert.equal(concurrentLexer[0].Role, "Boundary Investigator");
  assert.equal(concurrentEmitter[0].Role, "Output Investigator");

  fs.mkdirSync(path.join(root, ".agents/agents"), { recursive: true });
  fs.writeFileSync(path.join(root, ".agents/mcp_config.json"), '{"mcpServers":{}}\n');
  fs.writeFileSync(path.join(root, ".agents/agents/operator.md"), "operator profile\n");
  fs.writeFileSync(path.join(root, "plan.json"), JSON.stringify(manifest));
  // This executable captures the invocation and never starts the native CLI or a model.
  fs.writeFileSync(path.join(fakeBin, "agy"), `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const argv = process.argv.slice(2);
const name = argv[argv.indexOf("--agent") + 1];
const profile = fs.readFileSync(".agents/agents/" + name + ".md", "utf8");
const plugin = ".agents/plugins/" + name;
const registration = JSON.parse(fs.readFileSync(plugin + "/mcp_config.json", "utf8")).mcpServers.dispatch;
const ready = path.join(registration.env.AGY_SQUAD_RUN_DIR, ".mcp-ready");
console.log("? for shortcuts " + name);
let input = "";
process.stdin.on("data", chunk => {
  input += chunk;
  if (input.includes("/mcp") && !fs.existsSync(ready)) {
    spawnSync(registration.command, registration.args, {
      env: { ...process.env, ...registration.env },
      input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\\n"
    });
  }
  const prompt = input.match(/\\x1b\\[200~([\\s\\S]+?)\\x1b\\[201~/)?.[1];
  if (!prompt) return;
  fs.writeFileSync(process.env.AGY_TEST_RECORD, JSON.stringify({ argv, profile, prompt, name, registration, cwd: process.cwd(), input }));
  process.exit(Number(process.env.AGY_TEST_STATUS || 0));
});
`, { mode: 0o700 });
  const launch = (args, status = 0) => spawnSync("python3", [
    "-c", "import os, pty, sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))",
    process.execPath, cli, "run", "--workspace", root, ...args
  ], {
    env: { ...process.env, PATH: [fakeBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter),
      AGY_TEST_RECORD: fixture, AGY_TEST_STATUS: String(status) },
    encoding: "utf8", timeout: 10_000
  });
  const capture = () => JSON.parse(fs.readFileSync(fixture, "utf8"));
  const profileDir = path.join(root, ".agents/agents");
  const preview = launch(["Find the smallest lexer regression."]);
  assert.equal(preview.status, 0, preview.error?.message ?? preview.stderr);
  const reviewed = capture();
  assert.equal(reviewed.cwd, root);
  assert.ok(reviewed.argv.includes("--sandbox"));
  assert.match(reviewed.prompt, /Find the smallest lexer regression/);
  assert.match(reviewed.profile, /- read_file\b/);
  assert.doesNotMatch(reviewed.profile, /- (invoke_subagent|run_command|write_to_file|write_file|edit_file)\b/);
  assert.deepEqual(fs.readdirSync(profileDir), ["operator.md"]);
  assert.equal(fs.existsSync(path.join(root, reviewed.registration.env.AGY_SQUAD_RUN_DIR)), false);

  const execution = launch(["--launch", "--manifest", "plan.json", "--squad", "all_l1", "--mode", "auto"]);
  assert.equal(execution.status, 0, execution.error?.message ?? execution.stderr);
  const executed = capture();
  assert.match(executed.profile, /- invoke_subagent\b/);
  assert.match(executed.profile, /- (write_file|edit_file|manage_task)\b/);
  assert.match(executed.prompt, /"squadId":"all_l1","manifestPath":"scratch\/agy-squad\/run-.*\/plan-.*\/manifest\.json"/);
  assert.match(executed.prompt, /operator authorized delegation/);
  assert.ok(executed.argv.includes("auto"));
  const { registration } = executed;
  assert.equal(registration.env.AGY_SQUAD_WORKSPACE, root);
  const [stagedPlan] = fs.readdirSync(path.join(root, registration.env.AGY_SQUAD_RUN_DIR)).filter(x => x.startsWith("plan-"));
  assert.ok(stagedPlan);
  const settings = JSON.parse(executed.argv[executed.argv.indexOf("--settings") + 1]);
  assert.equal(settings.allowNonWorkspaceAccess, false);
  assert.deepEqual(settings.permissions.allow, [
    `read_file(${root})`,
    `mcp(${executed.name}_dispatch/dispatch_squad)`,
    `write_file(${path.join(root, registration.env.AGY_SQUAD_RUN_DIR)})`
  ]);
  assert.ok(settings.permissions.deny.includes(
    `write_file(${path.join(root, registration.env.AGY_SQUAD_RUN_DIR, stagedPlan, "manifest.json")})`
  ));
  assert.deepEqual(fs.readdirSync(profileDir), ["operator.md"]);
  const unsuccessful = launch(["--launch", "--manifest", "plan.json", "--squad", "all_l1"], 7);
  assert.equal(unsuccessful.status, 7, unsuccessful.stderr);
  assert.deepEqual(fs.readdirSync(profileDir), ["operator.md"]);
  const failedRun = capture().registration.env.AGY_SQUAD_RUN_DIR;
  assert.equal(fs.existsSync(path.join(root, failedRun)), false);
  const failedInline = launch(["--launch", "Inline task that fails"], 7);
  assert.equal(failedInline.status, 7, failedInline.stderr);
  assert.equal(fs.existsSync(path.join(root, capture().registration.env.AGY_SQUAD_RUN_DIR)), false);
  assert.equal(fs.existsSync(path.join(root, ".agents/plugins")), false);
  assert.equal(fs.readFileSync(path.join(root, ".agents/mcp_config.json"), "utf8"), '{"mcpServers":{}}\n');
  assert.equal(fs.readFileSync(path.join(profileDir, "operator.md"), "utf8"), "operator profile\n");

  const runCliDirect = args => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
  assert.equal(runCliDirect(["--help"]).status, 0);
  assert.match(runCliDirect(["run", "--mode", "invalid", "task"]).stderr, /Mode must be auto or accept-edits/);
  assert.match(runCliDirect(["run", "--manifest", "plan.json"]).stderr, /both --manifest and --squad/);
  assert.match(runCliDirect(["run", "bad\x07task"]).stderr, /control characters/);

  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const diagnoseCli = path.join(repoRoot, ".agents/skills/self-diagnosis/scripts/diagnose.mjs");
  const testScratchRel = `scratch-test-${process.pid}`;
  const diagEnv = { ...process.env, AGY_SQUAD_SCRATCH_ROOT: testScratchRel };
  try {
    const diagRun = spawnSync(process.execPath, [diagnoseCli], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(diagRun.status, 0, diagRun.stderr);
    assert.equal(JSON.parse(diagRun.stdout).status, "HEALTHY");
    assert.equal(fs.existsSync(path.join(repoRoot, testScratchRel)), false);
  } finally {
    fs.rmSync(path.join(repoRoot, testScratchRel), { recursive: true, force: true });
  }
  console.log("✓ Managed flat and layered payloads, isolated report slots, and native launcher and self-diagnosis teardown");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
