#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { managedCohort } from "../mcp/briefs.mjs";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { bundleReports, fingerprint, inspectHandoffs, pruneReports, publish, readFile, verifyBundle } from "../mcp/handoffs.mjs";
import { createRun, ensureDirectory } from "../mcp/run-state.mjs";
import { parseContentVerdict, parseIntegrityVerdict } from "../mcp/verdicts.mjs";

const server = fileURLToPath(new URL("../mcp/index.js", import.meta.url));
const terminal = fileURLToPath(new URL("./terminal.py", import.meta.url));
const usage = [
  "Agy-Squad Governance & Verification CLI (pairs with Antigravity native /swarm):",
  "  agy-squad fingerprint <file...>                                        Compute SHA-256 fingerprints for verifiedFiles",
  "  agy-squad inspect <record.json>                                        Reconcile handoff readiness for a cohort",
  "  agy-squad bundle <record.json> [--allow-unaudited]                     Create a SHA-256 verified proof bundle",
  "  agy-squad verify <report.sources.json>                                 Verify bundle integrity, synthesis, and audit hashes",
  "  agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports] Prune loose reports after verification",
  "  agy-squad verdict [--integrity] <report.md>                            Strictly parse a content or integrity verdict",
  "",
  "Legacy local launcher (deprecated in favor of native /swarm):",
  '  agy-squad run --workspace <directory> --launch "Your task"',
  '  agy-squad run --manifest <workspace-path> --squad <id|all_l1> --launch ["Additional context"]',
  "  Omit --launch for a tool-limited payload review session. Workspace defaults to the current directory.",
  "  Optional session flags: --mode auto|accept-edits, --model <slug>, --effort <level>."
].join("\n");

function initialPrompt(name, task, dispatch, launch) {
  const request = dispatch
    ? `Use ${name}'s dispatch_squad with ${JSON.stringify(dispatch)} as your first action.`
    : [
      "Derive assignments and success checks from the task. Start flat when independent work fits in one cohort. Add leads only when they can own separate domains. Keep the plan proportional and put dependencies into separate stages.",
      `Call ${name}'s dispatch_squad once with squadId and an inline manifest. Use {squads:{<id>:{specialists:[{role,objective,scopeFiles,expectedDeliverable}]}}} for a flat stage, or all_l1 with lead and specialists on each squad for a layered stage. Scope files can name a workspace directory, including ".". Roles and expected outcomes come from this task.`
    ].join("\n");
  return [
    request,
    "The dispatcher reserves the exact report slots. Use its Subagents objects verbatim. If dispatch fails or is unavailable, surface the error once and stop the attempt. Go directly from the supplied task or manifest to dispatch.",
    launch
      ? [
        "The operator authorized delegation for this task. Invoke independent assignments through Antigravity and let leads run their own specialists. Use handoff observations to prioritize evidence. Advance dependent work when its inputs are ready.",
        managedCohort,
        "Ask the operator when scope or permissions must change. Tell them the evidence checkpoint, ten minutes by default, so they can check /agents if the cohort stays silent. Stop any active children you own when their remaining work is canceled."
      ].join("\n")
      : "Show the assignments, expected outcomes, and exact report slots for review. End this session's work at payload review.",
    ...(task ? ["", "Task supplied by the operator", task] : [])
  ].join("\n");
}

function makeProfile(name, launch) {
  return [
    "---", `name: ${name}`, "description: Task-driven Agy-Squad session.",
    "mainAgent: true", "subagent: false", "inheritMcp: true", `inheritCustomizations: ${Boolean(launch)}`,
    `commandExecutionPolicy: ${launch ? "sandbox" : "off"}`,
    "tools:", "  - view_file", "  - read_file", "  - search_web", "  - read_url_content",
    ...(launch ? ["  - write_to_file", "  - replace_file_content", "  - write_file", "  - edit_file",
      "  - send_message", "  - run_command", "  - command_status", "  - manage_task", "  - schedule",
      "  - call_mcp_tool", "  - invoke_subagent", "  - manage_subagents"] : []),
    "---", "", "Follow the current assignment. Use the run-local dispatcher when your assignment authorizes delegation.", ""
  ].join("\n");
}

function waitForSession(args, workspace, prompt, readyFile) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [terminal, readyFile, prompt, ...args], {
      cwd: workspace, stdio: "inherit",
      env: { ...process.env, AGY_SQUAD_SESSION: path.relative(workspace, path.dirname(readyFile)) }
    });
    const terminate = () => child.kill("SIGTERM");
    // The terminal bridge handles interrupts and restores the outer terminal.
    const interrupt = () => {};
    const cleanup = () => {
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", terminate);
    };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    child.once("error", error => {
      cleanup();
      reject(error.code === "ENOENT" ? new Error("Python 3 (python3) must be available on PATH.") : error);
    });
    child.once("close", (code, signal) => {
      cleanup();
      resolve(code ?? 128 + (os.constants.signals[signal] ?? 0));
    });
  });
}

function removeEmpty(directory) {
  try {
    fs.rmdirSync(directory);
  } catch (error) {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error;
  }
}

function hasEvidence(directory, relative = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (hasEvidence(absolute, childRelative)) return true;
      continue;
    }

    // REVIEW: These are launcher-owned transient files, not task evidence.
    if (childRelative === ".mcp-ready" || /^plan-[0-9a-f]{24}\/manifest\.json$/.test(childRelative)) continue;

    // REVIEW: Preserve existing test behavior for empty report slots.
    if (entry.isFile() && entry.name === "report.md" && !fs.readFileSync(absolute, "utf8").trim()) continue;

    // REVIEW: Unexpected JSON/log files and symlinks may be the only failure evidence.
    return true;
  }
  return false;
}

function requireBinary(name, label) {
  const dirs = new Set((process.env.PATH ?? "").split(path.delimiter).filter(Boolean));
  for (const dir of dirs) {
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return;
    } catch {}
  }
  throw new Error(`${label} (${name}) must be available on PATH.`);
}

async function runSession(options, task) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Open an interactive terminal to start a squad run.");
  const workspace = fs.realpathSync(options.workspace ?? process.cwd());
  if (!fs.statSync(workspace).isDirectory()) throw new Error("Workspace must be a directory.");
  requireBinary("python3", "Python 3");
  requireBinary("agy", "Antigravity CLI");
  const created = [];
  const run = createRun(workspace, created);
  const name = `agy-squad-${run.id.slice(0, 13)}`;
  const plugin = `.agents/plugins/${name}`;
  const serverName = `${name}_dispatch`;
  const dispatch = options.manifest ? { squadId: options.squad, manifestPath: options.manifest } : undefined;
  const registration = {
    command: process.execPath, args: [server],
    env: { AGY_SQUAD_WORKSPACE: workspace, AGY_SQUAD_RUN_DIR: run.relative },
    tools: { dispatch_squad: { eager: true } }
  };
  const artifacts = [
    [`${plugin}/plugin.json`, JSON.stringify({ name })],
    [`${plugin}/mcp_config.json`, JSON.stringify({ mcpServers: { dispatch: registration } })],
    [`.agents/agents/${name}.md`, makeProfile(name, options.launch)]
  ];
  const published = [];
  let status = 1;
  try {
    if (dispatch) {
      const result = handleDispatchSquad(dispatch, workspace, run.relative);
      if (result.isError) throw new Error(result.content[0].text);
      dispatch.manifestPath = result.structuredContent.manifestPath;
    }
    const seenDirs = new Set();
    for (const [target, contents] of artifacts) {
      const dir = path.posix.dirname(target);
      if (!seenDirs.has(dir)) {
        ensureDirectory(workspace, dir, created, seenDirs);
        seenDirs.add(dir);
      }
      publish(workspace, target, Buffer.from(contents), true, seenDirs);
      published.push([path.join(workspace, target), contents]);
    }
    const settings = {
      trustedWorkspaces: [workspace],
      allowNonWorkspaceAccess: false,
      permissions: {
        allow: [`read_file(${workspace})`, `mcp(${serverName}/dispatch_squad)`, ...(options.launch ? [`write_file(${run.directory})`] : [])],
        deny: [
          `write_file(${path.join(workspace, plugin)})`,
          `write_file(${published.at(-1)[0]})`,
          ...(dispatch ? [`write_file(${path.join(workspace, dispatch.manifestPath)})`] : [])
        ]
      }
    };
    const args = ["--sandbox", "--settings", JSON.stringify(settings), "--agent", name];
    for (const flag of ["mode", "model", "effort"]) {
      if (options[flag]) args.push(`--${flag}`, options[flag]);
    }
    console.log(`Agy-Squad run ${run.directory}`);
    status = await waitForSession(args, workspace, initialPrompt(serverName, task, dispatch, options.launch),
      path.join(run.directory, ".mcp-ready"));
    return status;
  } finally {
    for (const [file, contents] of published.reverse()) {
      const entry = fs.lstatSync(file, { throwIfNoEntry: false });
      if (!entry) continue;
      if (entry.isFile() && fs.readFileSync(file, "utf8") === contents) {
        fs.unlinkSync(file);
      } else {
        console.error(`Retained changed session registration file: ${file}`);
      }
    }
    fs.rmSync(path.join(run.directory, ".mcp-ready"), { force: true });
    const keptEvidence = fs.existsSync(run.directory) && hasEvidence(run.directory);
    if (!keptEvidence && (status !== 0 || !options.launch)) {
      fs.rmSync(run.directory, { recursive: true, force: true });
    }
    removeEmpty(run.directory);
    for (const directory of created.reverse()) removeEmpty(directory);
    if (keptEvidence && fs.existsSync(run.directory)) console.log(`Run evidence: ${run.directory}`);
  }
}

async function main(args) {
  if (!args.length || args[0] === "--help" || args[0] === "-h") {
    console.log(usage);
    return 0;
  }
  const [command, ...rest] = args;
  if (command !== "run" && (rest.includes("--help") || rest.includes("-h"))) {
    console.log(usage);
    return 0;
  }
  const root = fs.realpathSync(process.cwd());

  if (command === "fingerprint") {
    if (!rest.length) throw new Error("Usage: agy-squad fingerprint <file...>");
    console.log(JSON.stringify(fingerprint(root, rest), null, 2));
    return 0;
  }
  if (command === "inspect") {
    if (rest.length !== 1) throw new Error("Usage: agy-squad inspect <record.json>");
    const record = JSON.parse(readFile(root, rest[0]).toString("utf8"));
    console.log(JSON.stringify(inspectHandoffs(root, record), null, 2));
    return 0;
  }
  if (command === "bundle") {
    const allowUnaudited = rest.includes("--allow-unaudited");
    const positional = rest.filter(arg => arg !== "--allow-unaudited");
    if (positional.length !== 1) throw new Error("Usage: agy-squad bundle <record.json> [--allow-unaudited]");
    const record = JSON.parse(readFile(root, positional[0]).toString("utf8"));
    const bundleInput = allowUnaudited || record.requireIntegrityAudit === false
      ? record
      : { requireIntegrityAudit: true, ...record };
    console.log(JSON.stringify(bundleReports(root, bundleInput), null, 2));
    return 0;
  }
  if (command === "verify") {
    if (rest.length !== 1) throw new Error("Usage: agy-squad verify <report.sources.json>");
    console.log(JSON.stringify(verifyBundle(root, rest[0]), null, 2));
    return 0;
  }
  if (command === "prune") {
    const keepReports = rest.includes("--keep-reports");
    const positional = rest.filter(arg => arg !== "--keep-reports");
    if (positional.length !== 2) {
      throw new Error("Usage: agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports]");
    }
    console.log(JSON.stringify(pruneReports(root, positional[0], positional[1], { keepReports }), null, 2));
    return 0;
  }
  if (command === "verdict") {
    const isIntegrity = rest.includes("--integrity");
    const positional = rest.filter(arg => arg !== "--integrity");
    if (positional.length !== 1) {
      throw new Error("Usage: agy-squad verdict [--integrity] <report.md>");
    }
    const markdown = readFile(root, positional[0]).toString("utf8");
    const verdict = isIntegrity ? parseIntegrityVerdict(markdown) : parseContentVerdict(markdown);
    console.log(JSON.stringify({ verdict }, null, 2));
    return 0;
  }
  if (command !== "run") {
    throw new Error(`Unknown command '${command}'. Expected fingerprint, inspect, bundle, verify, prune, verdict, or run.`);
  }
  const { values, positionals } = parseArgs({
    args: rest, allowPositionals: true,
    options: {
      workspace: { type: "string" }, manifest: { type: "string" }, squad: { type: "string" },
      launch: { type: "boolean", default: false }, help: { type: "boolean", short: "h" },
      mode: { type: "string" }, model: { type: "string" }, effort: { type: "string" }
    }
  });
  if (values.help) {
    console.log(usage);
    return 0;
  }
  console.error("Warning: 'agy-squad run' is deprecated in favor of Antigravity native /swarm + swarm-governance.");
  const task = positionals.join(" ").trim();
  if (/[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(task)) {
    throw new Error("Task text must not contain terminal control characters.");
  }
  if (Boolean(values.manifest) !== Boolean(values.squad) || (!task && !values.manifest)) {
    throw new Error("Provide a task or both --manifest and --squad.");
  }
  if (values.mode && !["auto", "accept-edits"].includes(values.mode)) {
    throw new Error("Mode must be auto or accept-edits.");
  }
  return runSession(values, task);
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`agy-squad: ${error.message}`);
  process.exitCode = 1;
}
