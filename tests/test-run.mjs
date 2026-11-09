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
  assert.match(dispatch({ squadId: "lexer", manifest: broken }).content[0].text, /requires an objective/);
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
  if (Number(process.env.AGY_TEST_STATUS) === 8) {
    const diagFile = path.join(registration.env.AGY_SQUAD_RUN_DIR, "diagnostics.json");
    fs.writeFileSync(diagFile, '{"reason":"session-failed"}\\n');
  }
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
  assert.match(reviewed.profile, /^inheritCustomizations: false$/m);
  assert.match(reviewed.profile, /- read_file\b/);
  assert.doesNotMatch(reviewed.profile, /- (invoke_subagent|run_command|schedule|call_mcp_tool|write_to_file|write_file|edit_file)\b/);
  assert.deepEqual(fs.readdirSync(profileDir), ["operator.md"]);
  assert.equal(fs.existsSync(path.join(root, reviewed.registration.env.AGY_SQUAD_RUN_DIR)), false);

  const execution = launch(["--launch", "--manifest", "plan.json", "--squad", "all_l1", "--mode", "auto"]);
  assert.equal(execution.status, 0, execution.error?.message ?? execution.stderr);
  const executed = capture();
  assert.match(executed.profile, /^inheritCustomizations: true$/m);
  assert.match(executed.profile, /- invoke_subagent\b/);
  assert.match(executed.profile, /- schedule\b/);
  assert.match(executed.profile, /- call_mcp_tool\b/);
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
  const diagnosticFailure = launch(["--launch", "Write diagnostic and exit"], 8);
  assert.equal(diagnosticFailure.status, 8, diagnosticFailure.stderr);
  const diagnosticRunRoot = capture().registration.env.AGY_SQUAD_RUN_DIR;
  assert.equal(
    fs.readFileSync(path.join(root, diagnosticRunRoot, "diagnostics.json"), "utf8"),
    '{"reason":"session-failed"}\n'
  );
  fs.rmSync(path.join(root, diagnosticRunRoot), { recursive: true, force: true });
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
  const r1Ledger = path.join(repoRoot, "docs/reviews/rebuild-wsl-dispatch-review.md");
  const r2Ledger = path.join(repoRoot, "docs/reviews/rebuild-wsl-dispatch-review-r2.md");
  const r1Stat = fs.statSync(r1Ledger);
  const r2Stat = fs.statSync(r2Ledger);
  try {
    const baseSec = Math.floor(Date.now() / 1000) + 5;
    fs.utimesSync(r2Ledger, baseSec, baseSec);
    fs.utimesSync(r1Ledger, baseSec + 0.05, baseSec + 0.05);
    const diagRun = spawnSync(process.execPath, [diagnoseCli], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(diagRun.status, 0, diagRun.stderr);
    const diagParsed = JSON.parse(diagRun.stdout);
    assert.equal(diagParsed.status, "HEALTHY");
    assert.equal(diagParsed.targetReviewLedger, "docs/reviews/rebuild-wsl-dispatch-review-r2.md");
    assert.equal(fs.existsSync(path.join(repoRoot, testScratchRel)), false);
    const badFlags = spawnSync(process.execPath, [diagnoseCli, "--markdown", "--teardown"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(badFlags.status, 1);
    assert.match(badFlags.stderr, /mutually exclusive/);
    const badShortVal = spawnSync(process.execPath, [diagnoseCli, "--print-dispatch", "all_l1", "--parent-id", "-h"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(badShortVal.status, 1);
    assert.match(badShortVal.stderr, /valid conversationId/);
    const badAcceptAll = spawnSync(process.execPath, [diagnoseCli, "--teardown", "all", "--accept", "0".repeat(64)], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(badAcceptAll.status, 1);
    assert.match(badAcceptAll.stderr, /single squadId/);
    const badLedgerDispatch = spawnSync(process.execPath, [diagnoseCli, "--print-dispatch", "all_l1", "--ledger", "docs/reviews/x.md"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(badLedgerDispatch.status, 1);
    assert.match(badLedgerDispatch.stderr, /not valid with '--print-dispatch'/);
    fs.mkdirSync(path.join(repoRoot, testScratchRel, "agy-squad/squad-skill_and_pr_review_audit"), { recursive: true });
    const allowCohortRun = spawnSync(process.execPath, [diagnoseCli, "--allow-active-cohort"], { cwd: repoRoot, env: diagEnv, encoding: "utf8" });
    assert.equal(allowCohortRun.status, 0, allowCohortRun.stderr);
    assert.equal(JSON.parse(allowCohortRun.stdout).status, "HEALTHY");

    // Exercise pre-submission Ctrl-C (\x03) in bin/terminal.py and modified registration file retention in bin/agy-squad.mjs
    const ctrlcBin = path.join(temporary, "bin-ctrlc");
    fs.mkdirSync(ctrlcBin);
    fs.writeFileSync(path.join(ctrlcBin, "agy"), "#!/usr/bin/env python3\nimport time\nprint('started', flush=True)\ntime.sleep(10)\n", { mode: 0o700 });
    const ctrlcRes = spawnSync("python3", [
      "-c",
      `import os, pty, select, sys, time
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], sys.argv[1:])
sent = False
deadline = time.monotonic() + 5
while time.monotonic() < deadline:
    r, _, _ = select.select([fd], [], [], 0.05)
    if r:
        try:
            chunk = os.read(fd, 4096)
            if not chunk: break
            if b"started" in chunk and not sent:
                os.write(fd, b"\\x03")
                sent = True
        except OSError:
            break
    wpid, status = os.waitpid(pid, os.WNOHANG)
    if wpid != 0:
        sys.exit(0 if os.waitstatus_to_exitcode(status) in (129, 130) else 1)
_, status = os.waitpid(pid, 0)
sys.exit(0 if os.waitstatus_to_exitcode(status) in (129, 130) else 1)`,
      "python3",
      fileURLToPath(new URL("../bin/terminal.py", import.meta.url)),
      path.join(temporary, "never-ready"),
      "prompt",
      "--agent",
      "test-agent"
    ], {
      env: { ...process.env, PATH: [ctrlcBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter) },
      encoding: "utf8",
      timeout: 8000
    });
    assert.equal(ctrlcRes.status, 0, ctrlcRes.stderr);

    const mutateBin = path.join(temporary, "bin-mutate");
    fs.mkdirSync(mutateBin);
    fs.writeFileSync(path.join(mutateBin, "agy"), `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const argv = process.argv.slice(2);
const name = argv[argv.indexOf("--agent") + 1];
const plugin = ".agents/plugins/" + name;
const registration = JSON.parse(fs.readFileSync(plugin + "/mcp_config.json", "utf8")).mcpServers.dispatch;
const emptyReport = path.join(registration.env.AGY_SQUAD_RUN_DIR, "squad-x/lead/report.md");
fs.mkdirSync(path.dirname(emptyReport), { recursive: true });
fs.writeFileSync(emptyReport, "   \\n");
fs.appendFileSync(".agents/agents/" + name + ".md", "\\n# mutated\\n");
console.log("? for shortcuts " + name);
let input = "";
process.stdin.on("data", chunk => {
  input += chunk;
  if (input.includes("/mcp")) {
    spawnSync(registration.command, registration.args, {
      env: { ...process.env, ...registration.env },
      input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\\n"
    });
  }
  if (/\\x1b\\[200~/.test(input)) process.exit(9);
});
`, { mode: 0o700 });
    const beforeRunDirs = fs.readdirSync(path.join(root, "scratch/agy-squad")).sort();
    const mutatedRun = spawnSync("python3", [
      "-c", "import os, pty, sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))",
      process.execPath, cli, "run", "--workspace", root, "--launch", "Mutate profile and write empty report"
    ], {
      env: { ...process.env, PATH: [mutateBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter) },
      encoding: "utf8", timeout: 10000
    });
    assert.equal(mutatedRun.status, 9);
    assert.match(mutatedRun.stdout + mutatedRun.stderr, /Retained changed session registration file/);
    const retainedProfiles = fs.readdirSync(profileDir).filter(f => f !== "operator.md");
    assert.equal(retainedProfiles.length, 1);
    fs.unlinkSync(path.join(profileDir, retainedProfiles[0]));
    assert.deepEqual(fs.readdirSync(path.join(root, "scratch/agy-squad")).sort(), beforeRunDirs);

    // Exercise startup deadline timeout + SIGKILL escalation on SIG_IGN child, post-submission SIGTERM wakeup + SIGKILL escalation,
    // failed --launch positive retention of non-empty report.md, and v1.3.0 review ledger schema validation
    const terminalPy = fileURLToPath(new URL("../bin/terminal.py", import.meta.url));
    const timeoutBin = path.join(temporary, "bin-timeout");
    fs.mkdirSync(timeoutBin);
    fs.writeFileSync(
      path.join(timeoutBin, "agy"),
      "#!/usr/bin/env python3\nimport signal, time\nsignal.signal(signal.SIGTERM, signal.SIG_IGN)\nsignal.signal(signal.SIGHUP, signal.SIG_IGN)\nprint('hanging', flush=True)\ntime.sleep(10)\n",
      { mode: 0o700 }
    );
    const timeoutRes = spawnSync(
      "python3",
      [
        "-c",
        "import os, pty, sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))",
        "python3",
        terminalPy,
        path.join(temporary, "never-ready"),
        "prompt",
        "--agent",
        "test-agent"
      ],
      {
        env: {
          ...process.env,
          AGY_SQUAD_STARTUP_TIMEOUT: "0.2",
          AGY_SQUAD_KILL_GRACE: "0.1",
          PATH: [timeoutBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter)
        },
        encoding: "utf8",
        timeout: 5000
      }
    );
    assert.equal(timeoutRes.status, 1);
    assert.match(timeoutRes.stdout + timeoutRes.stderr, /dispatcher was not discovered within 0\.2 seconds/);
    assert.match(
      timeoutRes.stdout + timeoutRes.stderr,
      /startup timeout: seen_agent=False seen_shortcuts=False mcp_ready=False/
    );

    const postTermReady = path.join(temporary, "post-term.mcp-ready");
    fs.writeFileSync(postTermReady, "ready\n");
    const postTermBin = path.join(temporary, "bin-postterm");
    fs.mkdirSync(postTermBin);
    fs.writeFileSync(
      path.join(postTermBin, "agy"),
      "#!/usr/bin/env python3\nimport signal, sys, time\nsignal.signal(signal.SIGTERM, signal.SIG_IGN)\nsignal.signal(signal.SIGHUP, signal.SIG_IGN)\nprint('CUSTOM_READY_MARKER test-agent', flush=True)\nbuf = b''\nwhile b'\\x1b[201~' not in buf:\n    ch = sys.stdin.buffer.read(1)\n    if not ch:\n        break\n    buf += ch\nprint('PROMPT_SUBMITTED', flush=True)\ntime.sleep(10)\n",
      { mode: 0o700 }
    );
    const postTermRes = spawnSync(
      "python3",
      [
        "-c",
        `import os, pty, select, signal, sys, time
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], sys.argv[1:])
termed = False
deadline = time.monotonic() + 5
while time.monotonic() < deadline:
    r, _, _ = select.select([fd], [], [], 0.05)
    if r:
        try:
            chunk = os.read(fd, 4096)
            if not chunk:
                break
            if b"PROMPT_SUBMITTED" in chunk and not termed:
                os.kill(pid, signal.SIGTERM)
                termed = True
        except OSError:
            break
    wpid, status = os.waitpid(pid, os.WNOHANG)
    if wpid != 0:
        sys.exit(0 if termed and os.waitstatus_to_exitcode(status) == 137 else 1)
_, status = os.waitpid(pid, 0)
sys.exit(0 if termed and os.waitstatus_to_exitcode(status) == 137 else 1)`,
        "python3",
        terminalPy,
        postTermReady,
        "submit-check",
        "--agent",
        "test-agent"
      ],
      {
        env: {
          ...process.env,
          AGY_SQUAD_KILL_GRACE: "0.1",
          AGY_SQUAD_READY_MARKER: "CUSTOM_READY_MARKER",
          PATH: [postTermBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter)
        },
        encoding: "utf8",
        timeout: 6000
      }
    );
    assert.equal(postTermRes.status, 0, postTermRes.stderr);

    const retainBin = path.join(temporary, "bin-retain");
    fs.mkdirSync(retainBin);
    fs.writeFileSync(
      path.join(retainBin, "agy"),
      `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const argv = process.argv.slice(2);
const name = argv[argv.indexOf("--agent") + 1];
const registration = JSON.parse(fs.readFileSync(".agents/plugins/" + name + "/mcp_config.json", "utf8")).mcpServers.dispatch;
const nonEmptyReport = path.join(registration.env.AGY_SQUAD_RUN_DIR, "squad-x/lead/report.md");
fs.mkdirSync(path.dirname(nonEmptyReport), { recursive: true });
fs.writeFileSync(nonEmptyReport, "Verdict: PASS\\nConcrete evidence.\\n");
console.log("? for shortcuts " + name);
let input = "";
process.stdin.on("data", chunk => {
  input += chunk;
  if (input.includes("/mcp")) {
    spawnSync(registration.command, registration.args, {
      env: { ...process.env, ...registration.env },
      input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\\n"
    });
  }
  if (/\\x1b\\[200~/.test(input)) process.exit(9);
});
`,
      { mode: 0o700 }
    );
    const retainRun = spawnSync(
      "python3",
      [
        "-c",
        "import os, pty, sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))",
        process.execPath,
        cli,
        "run",
        "--workspace",
        root,
        "--launch",
        "Write non-empty report then fail"
      ],
      {
        env: { ...process.env, PATH: [retainBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter) },
        encoding: "utf8",
        timeout: 10000
      }
    );
    assert.equal(retainRun.status, 9);
    assert.match(retainRun.stdout, /Run evidence:/);
    const afterRetainDirs = fs.readdirSync(path.join(root, "scratch/agy-squad")).filter(d => !beforeRunDirs.includes(d));
    assert.equal(afterRetainDirs.length, 1);
    assert.match(
      fs.readFileSync(path.join(root, "scratch/agy-squad", afterRetainDirs[0], "squad-x/lead/report.md"), "utf8"),
      /Verdict: PASS/
    );

    const badLedgerRel = `docs/reviews/.tmp-schema-test-${process.pid}.md`;
    const badLedgerAbs = path.join(repoRoot, badLedgerRel);
    try {
      fs.writeFileSync(
        badLedgerAbs,
        "# Bad Ledger\n\n## 1. Metadata\n\nNo session table.\n\n## 8. Post-Remediation Residuals & Deferred Dispositions\n\n| ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| `R5-HARDEN-P3-1` | `R5` | `SVC` | **Closed** | `x` | `y` | `z` | `w` |\n"
      );
      const schemaFail = spawnSync(process.execPath, [diagnoseCli, "--ledger", badLedgerRel], {
        cwd: repoRoot,
        env: diagEnv,
        encoding: "utf8"
      });
      assert.equal(schemaFail.status, 1);
      const schemaParsed = JSON.parse(schemaFail.stdout);
      assert.equal(schemaParsed.status, "CHANGES_REQUIRED");
      assert.ok(schemaParsed.findings.some(f => f.id === "DOC-LEDGER-SCHEMA"));
    } finally {
      fs.rmSync(badLedgerAbs, { force: true });
    }

    // Exercise premature exit(0) before prompt submission in bin/terminal.py (R6-SCRIPT-01)
    for (const [label, scriptBody] of [
      ["before-banner", "#!/usr/bin/env python3\nimport sys\nsys.exit(0)\n"],
      ["after-banner-before-ready", "#!/usr/bin/env python3\nimport sys\nprint('? for shortcuts test-agent', flush=True)\nsys.exit(0)\n"]
    ]) {
      const earlyExitBin = path.join(temporary, `bin-early-${label}`);
      fs.mkdirSync(earlyExitBin);
      fs.writeFileSync(path.join(earlyExitBin, "agy"), scriptBody, { mode: 0o700 });
      const earlyExitRes = spawnSync(
        "python3",
        [
          "-c",
          "import os, pty, sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))",
          "python3",
          terminalPy,
          path.join(temporary, "never-ready"),
          "prompt",
          "--agent",
          "test-agent"
        ],
        {
          env: {
            ...process.env,
            PATH: [earlyExitBin, path.dirname(process.execPath), process.env.PATH].join(path.delimiter)
          },
          encoding: "utf8",
          timeout: 5000
        }
      );
      assert.equal(earlyExitRes.status, 1, `Expected non-zero exit for ${label}`);
      assert.match(earlyExitRes.stdout + earlyExitRes.stderr, /native CLI exited before prompt submission/);
    }

    // Exercise R6-SVC-01 teardown ledger binding: bundle SHA membership and 1:1 cohort finding-ID membership
    const { bundleReports, fingerprint, pruneReports, reportPath: hReportPath } = await import("../mcp/handoffs.mjs");
    const tdSquad = "skill_and_pr_review_audit";
    const tdRoot = `${testScratchRel}/agy-squad`;
    const tdS1 = hReportPath(tdSquad, 1, tdRoot);
    const tdS2 = hReportPath(tdSquad, 2, tdRoot);
    const tdLead = hReportPath(tdSquad, undefined, tdRoot);
    for (const [slot, text] of [
      [tdS1, "# Specialist 1\n\n| ID | Status |\n| --- | --- |\n| `SD-TEST-01` | **Closed** |\n"],
      [tdS2, "# Specialist 2\n\n### SD-HEAD-01 — Missing verification in plain heading\n\nVerified.\n"],
      [tdLead, "# Lead Synthesis\n\n- **Verdict:** **PASS**\n\n- **SD-BULLET-01:** Missing verification in bullet list\n"]
    ]) {
      const abs = path.join(repoRoot, slot);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text);
    }
    const tdBundled = bundleReports(repoRoot, {
      workspace: repoRoot,
      squadId: tdSquad,
      reportRoot: tdRoot,
      verdict: "PASS",
      verifiedFiles: fingerprint(repoRoot, ["package.json"]),
      assignments: [
        { conversationId: "td-1", report: tdS1 },
        { conversationId: "td-2", report: tdS2 }
      ],
      handoffs: [
        { sender: "td-1", message: `READY ${tdS1} — Reported SD-TEST-01.` },
        { sender: "td-2", message: `READY ${tdS2} — Reported SD-HEAD-01.` }
      ]
    });
    pruneReports(repoRoot, tdBundled.path, tdBundled.sha256);

    const tdLedgerRel = `docs/reviews/.tmp-td-test-${process.pid}.md`;
    const tdLedgerAbs = path.join(repoRoot, tdLedgerRel);
    const makeTdLedger = (bundleSha, findingIds) => [
      "# Temp Teardown Ledger",
      "",
      "## 1. Review Metadata",
      "",
      "| Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked |",
      "| --- | --- | --- | --- | --- | --- |",
      "| `S1` | `00000000-0000-4000-8000-000000000000` | `None` | `2026-11-09` | `main..HEAD` | `/self-diagnosis` |",
      "",
      "## 8. Post-Remediation Residuals & Deferred Dispositions",
      "",
      "None (0 open residuals, 0 deferred items).",
      "",
      "## 9. `/self-diagnosis` Cohort & Bundle Ledger",
      "",
      "| Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      `| \`W1\` | \`00000000-0000-4000-8000-000000000000\` | \`${tdSquad}\` | \`td-1, td-2\` | \`N/A\` | \`${bundleSha}\` | \`Pending\` |`,
      "",
      ...(findingIds.length > 0
        ? [
            "| ID | Status | Summary |",
            "| --- | --- | --- |",
            ...findingIds.map(id => `| \`${id}\` | **Closed** | Verified finding recorded in ledger. |`)
          ]
        : ["None (0 wave findings)."])
    ].join("\n") + "\n";

    try {
      const allTdIds = ["SD-TEST-01", "SD-HEAD-01", "SD-BULLET-01"];
      // Case A: Unrelated bundle SHA -> rejected
      fs.writeFileSync(tdLedgerAbs, makeTdLedger("f".repeat(64), allTdIds));
      const tdUnrelated = spawnSync(
        process.execPath,
        [diagnoseCli, "--teardown", tdSquad, "--accept", tdBundled.sha256, "--ledger", tdLedgerRel],
        { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
      );
      assert.equal(tdUnrelated.status, 1);
      assert.match(tdUnrelated.stderr, /bundle digest .* is not recorded in Section 9/);

      // Case B1: Table finding SD-TEST-01 omitted -> rejected
      fs.writeFileSync(tdLedgerAbs, makeTdLedger(tdBundled.sha256, ["SD-HEAD-01", "SD-BULLET-01"]));
      const tdMissingTable = spawnSync(
        process.execPath,
        [diagnoseCli, "--teardown", tdSquad, "--accept", tdBundled.sha256, "--ledger", tdLedgerRel],
        { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
      );
      assert.equal(tdMissingTable.status, 1);
      assert.match(tdMissingTable.stderr, /cohort finding ID\(s\) \[SD-TEST-01\] are missing/);

      // Case B2: Plain heading finding SD-HEAD-01 omitted -> rejected
      fs.writeFileSync(tdLedgerAbs, makeTdLedger(tdBundled.sha256, ["SD-TEST-01", "SD-BULLET-01"]));
      const tdMissingHeading = spawnSync(
        process.execPath,
        [diagnoseCli, "--teardown", tdSquad, "--accept", tdBundled.sha256, "--ledger", tdLedgerRel],
        { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
      );
      assert.equal(tdMissingHeading.status, 1);
      assert.match(tdMissingHeading.stderr, /cohort finding ID\(s\) \[SD-HEAD-01\] are missing/);

      // Case B3: Bullet finding SD-BULLET-01 omitted -> rejected
      fs.writeFileSync(tdLedgerAbs, makeTdLedger(tdBundled.sha256, ["SD-TEST-01", "SD-HEAD-01"]));
      const tdMissingBullet = spawnSync(
        process.execPath,
        [diagnoseCli, "--teardown", tdSquad, "--accept", tdBundled.sha256, "--ledger", tdLedgerRel],
        { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
      );
      assert.equal(tdMissingBullet.status, 1);
      assert.match(tdMissingBullet.stderr, /cohort finding ID\(s\) \[SD-BULLET-01\] are missing/);

      // Case B4 (SVC-NEW-02): Unexpected non-report artifact blocks teardown even with an accepted bundle
      fs.writeFileSync(tdLedgerAbs, makeTdLedger(tdBundled.sha256, allTdIds));
      const unexpectedArtifact = path.join(repoRoot, tdRoot, `squad-${tdSquad}`, "diagnostics.json");
      fs.writeFileSync(unexpectedArtifact, '{"unarchived":true}\n');
      try {
        const rejected = spawnSync(
          process.execPath,
          [diagnoseCli, "--teardown", tdSquad, "--accept", tdBundled.sha256, "--ledger", tdLedgerRel],
          { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
        );
        assert.equal(rejected.status, 1);
        assert.match(rejected.stderr, /unbundled artifacts remain/);
        assert.equal(fs.existsSync(unexpectedArtifact), true);
      } finally {
        fs.rmSync(unexpectedArtifact, { force: true });
      }

      // Case B5 (SVC-NEW-02): Known squad directory with only diagnostics.json and no bundle blocks non-force teardown
      const noBundleSquad = "runtime_and_contract_diagnosis";
      const noBundleDir = path.join(repoRoot, tdRoot, `squad-${noBundleSquad}`);
      const noBundleDiag = path.join(noBundleDir, "diagnostics.json");
      fs.mkdirSync(noBundleDir, { recursive: true });
      fs.writeFileSync(noBundleDiag, '{"unbundledOnly":true}\n');
      try {
        const rejectedNoBundle = spawnSync(
          process.execPath,
          [diagnoseCli, "--teardown", noBundleSquad, "--ledger", tdLedgerRel],
          { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
        );
        assert.equal(rejectedNoBundle.status, 1);
        assert.match(rejectedNoBundle.stderr, /unbundled evidence/);
        assert.equal(fs.existsSync(noBundleDiag), true);
      } finally {
        fs.rmSync(noBundleDir, { recursive: true, force: true });
      }

      // Case B6 (SVC-NEW-01): Symlinked cleanup parent must not delete an outside sentinel (forced, non-forced, and all-canary)
      const linkedScratch = `scratch-external-probe-${process.pid}`;
      const outsideScratch = path.join(temporary, "external-probe");
      const externalSquad = path.join(outsideScratch, "agy-squad", `squad-${tdSquad}`);
      const externalEmptySquad = path.join(outsideScratch, "agy-squad", `squad-${noBundleSquad}`);
      const externalCanary = path.join(outsideScratch, "agy-squad", "self-diag-canary-external");
      fs.mkdirSync(externalSquad, { recursive: true });
      fs.mkdirSync(externalEmptySquad, { recursive: true });
      fs.mkdirSync(externalCanary, { recursive: true });
      const sentinel = path.join(externalSquad, "KEEP.json");
      const canarySentinel = path.join(externalCanary, "KEEP_CANARY.json");
      fs.writeFileSync(sentinel, '{"mustSurvive":true}\n');
      fs.writeFileSync(canarySentinel, '{"canaryMustSurvive":true}\n');
      fs.symlinkSync(outsideScratch, path.join(repoRoot, linkedScratch), "dir");
      try {
        const forcedSymlinkRes = spawnSync(process.execPath, [diagnoseCli, "--teardown", tdSquad, "--force"], {
          cwd: repoRoot,
          env: { ...process.env, AGY_SQUAD_SCRATCH_ROOT: linkedScratch },
          encoding: "utf8"
        });
        assert.equal(forcedSymlinkRes.status, 1, forcedSymlinkRes.stdout);
        assert.match(forcedSymlinkRes.stderr, /symlink|non-directory/);
        assert.equal(fs.readFileSync(sentinel, "utf8"), '{"mustSurvive":true}\n');

        const nonForcedSymlinkRes = spawnSync(
          process.execPath,
          [diagnoseCli, "--teardown", noBundleSquad, "--ledger", tdLedgerRel],
          {
            cwd: repoRoot,
            env: { ...process.env, AGY_SQUAD_SCRATCH_ROOT: linkedScratch },
            encoding: "utf8"
          }
        );
        assert.equal(nonForcedSymlinkRes.status, 1, nonForcedSymlinkRes.stdout);
        assert.match(nonForcedSymlinkRes.stderr, /symlink|non-directory/);
        assert.equal(fs.existsSync(externalEmptySquad), true);

        fs.rmSync(externalSquad, { recursive: true, force: true });
        fs.rmSync(externalEmptySquad, { recursive: true, force: true });
        const canarySymlinkRes = spawnSync(process.execPath, [diagnoseCli, "--teardown", "all", "--force"], {
          cwd: repoRoot,
          env: { ...process.env, AGY_SQUAD_SCRATCH_ROOT: linkedScratch },
          encoding: "utf8"
        });
        assert.equal(canarySymlinkRes.status, 1, canarySymlinkRes.stdout);
        assert.match(canarySymlinkRes.stderr, /symlink|non-directory/);
        assert.equal(fs.readFileSync(canarySentinel, "utf8"), '{"canaryMustSurvive":true}\n');
      } finally {
        fs.unlinkSync(path.join(repoRoot, linkedScratch));
      }

      // Case C: Bundle SHA and all 3 finding formats recorded -> accepted and torn down
      fs.writeFileSync(tdLedgerAbs, makeTdLedger(tdBundled.sha256, allTdIds));
      const tdAccepted = spawnSync(
        process.execPath,
        [diagnoseCli, "--teardown", tdSquad, "--accept", tdBundled.sha256, "--ledger", tdLedgerRel],
        { cwd: repoRoot, env: diagEnv, encoding: "utf8" }
      );
      assert.equal(tdAccepted.status, 0, tdAccepted.stderr);
      assert.equal(JSON.parse(tdAccepted.stdout).status, "TORN_DOWN");
    } finally {
      fs.rmSync(tdLedgerAbs, { force: true });
    }
  } finally {
    fs.utimesSync(r1Ledger, r1Stat.atime, r1Stat.mtime);
    fs.utimesSync(r2Ledger, r2Stat.atime, r2Stat.mtime);
    fs.rmSync(path.join(repoRoot, testScratchRel), { recursive: true, force: true });
  }
  console.log("✓ Managed flat and layered payloads, isolated report slots, and native launcher and self-diagnosis teardown");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
