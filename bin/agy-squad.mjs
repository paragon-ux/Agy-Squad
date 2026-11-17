#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function readPkgVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8")).version || "0.1.3";
  } catch {
    return "0.1.3";
  }
}

const usage = [
  "Agy-Squad Governance & Verification CLI (pairs with Antigravity native /swarm):",
  "  agy-squad setup|install [--check]                                      Install or synchronize plugin, skills, MCP server, and CLI shim",
  "  agy-squad status [--json]                                              Check live integration and companion tool status across Antigravity",
  "  agy-squad uninstall [--restore-backups]                                Remove plugin link, MCP entry, and CLI shims",
  "  agy-squad restore-backups                                              Restore configuration backups (*.bak)",
  "  agy-squad plan (--manifest <path> | \"<task>\") [--squad <id>] [--topology flat|layered] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--no-integrity] [--report-root <path>] [--known-model <id>...] [--occupied-worker <name>...] [--board-since <seq>] [--board-seq <seq>...]",
  "  agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]       Compile invoke_subagent payload (subagent mode only)",
  "  agy-squad collect (--plan <plan.json> | --record <record.json> | --squad <id>) --from <worktree-dir>... [--workspace <dir>] [--report-root <path>] [--overwrite] [--dry-run] [--strict] [--allow-empty]",
  "  agy-squad bundle-init --plan <plan.json> [--provenance <scaffold.json>] [--squad <id>] [--workspace <dir>] [--report-root <path>] [--verdict PASS|FAIL|BLOCKED] [--file <path>...] [--id-map <worker=id>...] [--handoffs <file.json>] [--handoff <sender=message>...] [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--digest] [--out <record.json>] [--replace] [<file...>]",
  "  agy-squad fingerprint <file...>                                        Compute SHA-256 fingerprints for verifiedFiles",
  "  agy-squad inspect <record.json>                                        Reconcile handoff readiness for a cohort",
  "  agy-squad digest <record.json> [--allow-non-passing] [--allow-partial]  Compute canonical Evidence Digest for integrity audit binding",
  "  agy-squad bundle <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--replace] [--predecessor <sha256>]  Create a SHA-256 verified proof bundle",
  "  agy-squad verify <report.sources.json> [--prune [--keep-reports]]      Verify bundle integrity, and optionally prune loose reports",
  "  agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports] Prune loose reports after verification",
  "  agy-squad verdict [--integrity] <report.md>                            Strictly parse a content or integrity verdict"
].join("\n");

async function runPlanCommand(rest, root) {
  const usageLine =
    "Usage: agy-squad plan (--manifest <path> | \"<task>\") [--squad <id>] [--topology flat|layered] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--no-integrity] [--report-root <path>] [--known-model <id>...] [--occupied-worker <name>...] [--board-since <seq>] [--board-seq <seq>...]";
  if (!rest.length) {
    throw new Error(usageLine);
  }
  const parseSeqArg = (raw, flagName) => {
    if (!/^(?:0|[1-9]\d*)$/.test(String(raw).trim())) {
      throw new Error(`${flagName} requires a non-negative integer sequence number.`);
    }
    const parsed = Number(String(raw).trim());
    if (!Number.isSafeInteger(parsed)) {
      throw new Error(`${flagName} requires a safe integer sequence number.`);
    }
    return parsed;
  };
  const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
    manifest: { type: "string" },
    squad: { type: "string" },
    topology: { type: "string" },
    mode: { type: "string" },
    model: { type: "string" },
    "workspace-isolation": { type: "string" },
    scope: { type: "string", multiple: true },
    role: { type: "string", multiple: true },
    "no-integrity": { type: "boolean", default: false },
    "report-root": { type: "string" },
    "known-model": { type: "string", multiple: true },
    "occupied-worker": { type: "string", multiple: true },
    "board-since": { type: "string" },
    "board-seq": { type: "string", multiple: true }
  });
  const { planSquadCohort } = await import("../mcp/planner.mjs");
  const task = positionals.join(" ").trim();
  const planArgs = {
    ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {}),
    ...(task ? { task } : {}),
    ...(values.squad !== undefined ? { squadId: values.squad } : {}),
    ...(values.topology !== undefined ? { topology: values.topology } : {}),
    ...(values.mode !== undefined ? { executionMode: values.mode } : {}),
    ...(values.model !== undefined ? { model: values.model } : {}),
    ...(values["workspace-isolation"] !== undefined ? { workspaceIsolation: values["workspace-isolation"] } : {}),
    ...(values.scope !== undefined ? { scopeFiles: values.scope.map(normalizeWorkspaceCliPath) } : {}),
    ...(values.role !== undefined ? { roles: values.role } : {}),
    ...(values["no-integrity"] ? { includeIntegrityAuditor: false } : {}),
    ...(values["report-root"] !== undefined ? { reportRoot: normalizeWorkspaceCliPath(values["report-root"]) } : {}),
    ...(values["known-model"] !== undefined ? { knownModels: values["known-model"] } : {}),
    ...(values["occupied-worker"] !== undefined ? { occupiedWorkerNames: values["occupied-worker"] } : {}),
    ...(values["board-since"] !== undefined ? { boardSince: parseSeqArg(values["board-since"], "--board-since") } : {}),
    ...(values["board-seq"] !== undefined ? { boardSeqs: values["board-seq"].map(v => parseSeqArg(v, "--board-seq")) } : {})
  };
  return planSquadCohort(planArgs, root);
}

async function runDispatchCommand(rest, root) {
  if (!rest.length) {
    throw new Error("Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]");
  }
  const { handleDispatchSquad } = await import("../mcp/dispatch.mjs");
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      squad: { type: "string" },
      manifest: { type: "string" }
    }
  });
  if (values.squad !== undefined && positionals.length > 0) {
    throw new Error("Pass either --squad <id> or a positional <squadId>, not both.");
  }
  if (positionals.length > 1) {
    throw new Error("Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]");
  }
  const squadId = values.squad ?? positionals[0];
  if (!squadId) {
    throw new Error("Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]");
  }
  const result = handleDispatchSquad(
    {
      squadId,
      ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {})
    },
    root
  );
  if (result.isError) {
    throw new Error(result.content?.[0]?.text || "dispatch_squad failed.");
  }
  return JSON.stringify(JSON.parse(result.content[0].text), null, 2);
}

const KNOWN_COMMANDS = new Set([
  "setup",
  "install",
  "status",
  "uninstall",
  "restore-backups",
  "plan",
  "dispatch",
  "collect",
  "bundle-init",
  "fingerprint",
  "inspect",
  "digest",
  "bundle",
  "verify",
  "prune",
  "verdict",
  "run"
]);

function resolveWorkspaceRoot(workspaceArg, fallbackRoot) {
  if (workspaceArg === undefined) return fallbackRoot;
  const trimmed = String(workspaceArg).trim();
  if (!trimmed) throw new Error("--workspace must be a nonempty directory path.");
  let real;
  try {
    real = fs.realpathSync(trimmed);
  } catch (error) {
    throw new Error(`Workspace directory does not exist (${trimmed}): ${error.message}`);
  }
  if (!fs.lstatSync(real).isDirectory()) {
    throw new Error(`Workspace path is not a directory: ${trimmed}`);
  }
  return real;
}

function readRegularJsonFileSafe(resolvedPath, displayPath, label, decodeUtf8) {
  const hasONofollow = typeof fs.constants.O_NOFOLLOW === "number" && fs.constants.O_NOFOLLOW !== 0;
  if (process.platform !== "linux" || !hasONofollow) {
    const linkStat = fs.lstatSync(resolvedPath);
    if (linkStat.isSymbolicLink()) {
      const err = new Error(`${label} path must be a regular non-symlink file: ${displayPath}`);
      err.code = "ELOOP";
      throw err;
    }
  }
  const openFlags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0);
  const fd = fs.openSync(resolvedPath, openFlags);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) {
      throw new Error(`${label} path must be a regular non-symlink file: ${displayPath}`);
    }
    if (process.platform === "linux") {
      let fdTarget;
      try {
        fdTarget = fs.readlinkSync(`/proc/self/fd/${fd}`);
      } catch {}
      if (fdTarget && fdTarget !== fs.realpathSync(resolvedPath)) {
        throw new Error(`${label} path changed during open: ${displayPath}`);
      }
    }
    const chunks = [];
    const buf = Buffer.allocUnsafe(65536);
    while (true) {
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, null);
      if (bytesRead <= 0) break;
      chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
    }
    return decodeUtf8(Buffer.concat(chunks), displayPath);
  } finally {
    fs.closeSync(fd);
  }
}

async function readJsonInput(targetRoot, pathOrDash, label, { decodeUtf8, readFile }) {
  if (typeof pathOrDash !== "string" || !pathOrDash.trim()) {
    throw new Error(`${label} path must be nonempty.`);
  }
  const trimmedInput = pathOrDash.trim();
  let raw;
  if (trimmedInput === "-") {
    const { text: readStreamText } = await import("node:stream/consumers");
    raw = await readStreamText(process.stdin);
  } else {
    const normalized = trimmedInput.replace(/\\/g, "/");
    const stripped = normalized.replace(/^(?:\.\/)+/, "");
    if (!path.isAbsolute(trimmedInput) && stripped && !stripped.split("/").includes("..")) {
      try {
        raw = decodeUtf8(readFile(targetRoot, stripped), stripped);
      } catch (err) {
        const cwdResolved = path.resolve(trimmedInput);
        if (err.code === "ENOENT" && path.dirname(cwdResolved) !== targetRoot && fs.existsSync(cwdResolved)) {
          raw = readRegularJsonFileSafe(cwdResolved, trimmedInput, label, decodeUtf8);
        } else {
          throw err;
        }
      }
    } else {
      const resolved = path.resolve(trimmedInput);
      raw = readRegularJsonFileSafe(resolved, trimmedInput, label, decodeUtf8);
    }
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label} (${trimmedInput}): ${error.message}`);
  }
}

function normalizeWorkspaceCliPath(inputPath) {
  if (typeof inputPath !== "string") return inputPath;
  const trimmed = inputPath.trim();
  if (!trimmed || /[\x00-\x1f\x7f\u2028\u2029]/.test(trimmed) || trimmed.includes("\\") || path.isAbsolute(trimmed)) {
    return trimmed;
  }
  const stripped = trimmed.replace(/^(?:\.\/)+/, "");
  return stripped || trimmed;
}

function parseKeyValuePairs(items, flagName) {
  const result = Object.create(null);
  for (const item of items ?? []) {
    const eqIdx = item.indexOf("=");
    if (eqIdx <= 0 || eqIdx === item.length - 1) {
      throw new Error(`Invalid --${flagName} entry '${item}'; expected '<key>=<value>'.`);
    }
    const key = item.slice(0, eqIdx).trim();
    const val = item.slice(eqIdx + 1);
    if (!key || !val.trim()) {
      throw new Error(`Invalid --${flagName} entry '${item}'; key and value must be nonempty.`);
    }
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`Invalid --${flagName} key '${key}'.`);
    }
    if (Object.hasOwn(result, key)) {
      throw new Error(`Duplicate --${flagName} key '${key}'.`);
    }
    result[key] = val;
  }
  return result;
}

function parseHandoffPairEntries(items) {
  return (items ?? []).map(item => {
    const eqIdx = item.indexOf("=");
    if (eqIdx <= 0 || eqIdx === item.length - 1) {
      throw new Error(`Invalid --handoff entry '${item}'; expected '<sender>=<message>'.`);
    }
    const sender = item.slice(0, eqIdx).trim();
    const message = item.slice(eqIdx + 1);
    if (!sender || !message.trim()) {
      throw new Error(`Invalid --handoff entry '${item}'; sender and message must be nonempty.`);
    }
    return { sender, message };
  });
}

function hasHelpFlag(argv) {
  const { tokens } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    tokens: true,
    options: { help: { type: "boolean", short: "h" } }
  });
  for (const tok of tokens) {
    if (tok.kind === "option-terminator") break;
    if (tok.kind === "option" && tok.name === "help") return true;
  }
  return false;
}

function parseSubcommandArgs(rest, usageLine, options = {}) {
  try {
    return parseArgs({
      args: rest,
      allowPositionals: true,
      strict: true,
      options
    });
  } catch (error) {
    throw new Error(`${error.message}\n${usageLine}`);
  }
}

async function main(args) {
  if (!args.length) {
    console.log(usage);
    return 0;
  }
  if (args[0] === "--help" || args[0] === "-h") {
    if (args.length > 1) {
      throw new Error("Conflicting flags: --help cannot be combined with operational flags or arguments.");
    }
    console.log(usage);
    return 0;
  }
  if (args[0] === "--version" || args[0] === "-v") {
    if (args.length > 1) {
      throw new Error("Conflicting flags: --version cannot be combined with operational flags or arguments.");
    }
    console.log(readPkgVersion());
    return 0;
  }
  const [command, ...rest] = args;
  if (!KNOWN_COMMANDS.has(command)) {
    throw new Error(`Unknown command '${command}'. Expected setup, install, status, uninstall, restore-backups, plan, dispatch, collect, bundle-init, fingerprint, inspect, digest, bundle, verify, prune, or verdict.`);
  }
  if (command === "run") {
    throw new Error("'agy-squad run' was retired in Phase 2; use 'agy-squad plan' with Antigravity native /swarm + swarm-governance.");
  }
  if (hasHelpFlag(rest)) {
    if (rest.length > 1) {
      throw new Error("Conflicting flags: --help cannot be combined with operational flags or arguments.");
    }
    console.log(usage);
    return 0;
  }

  if (command === "setup" || command === "install") {
    const usageLine = "Usage: agy-squad setup [--check]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      check: { type: "boolean", short: "c", default: false },
      "restore-backups": { type: "boolean", default: false },
      uninstall: { type: "boolean", default: false }
    });
    const isRestorePos = positionals.includes("restore-backups");
    const isUninstallPos = positionals.includes("uninstall");
    if (values.check && (values["restore-backups"] || values.uninstall || isRestorePos || isUninstallPos)) {
      throw new Error("Conflicting flags: --check is read-only and cannot be combined with --uninstall or --restore-backups.");
    }
    if (values["restore-backups"] || values.uninstall || positionals.length > 0) {
      throw new Error(
        `Unexpected option or argument for '${command}'. Use 'agy-squad uninstall [--restore-backups]' or 'agy-squad restore-backups'.\n${usageLine}`
      );
    }
    const { runCheckOnly, runInstall } = await import("../scripts/install-register.mjs");
    if (values.check) {
      await runCheckOnly();
      return 0;
    }
    await runInstall();
    return 0;
  }
  if (command === "status") {
    const usageLine = "Usage: agy-squad status [--json]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      json: { type: "boolean", default: false }
    });
    if (positionals.length > 0) throw new Error(usageLine);
    const { printStatus } = await import("../scripts/install-register.mjs");
    const st = printStatus({ silent: values.json });
    if (values.json) {
      console.log(JSON.stringify(st, null, 2));
    }
    return st.isComplete ? 0 : 1;
  }
  if (command === "uninstall") {
    const usageLine = "Usage: agy-squad uninstall [--restore-backups]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "restore-backups": { type: "boolean", default: false }
    });
    if (positionals.length > 0) {
      throw new Error(`Unexpected positional argument '${positionals[0]}'.\n${usageLine}`);
    }
    const { runUninstall } = await import("../scripts/install-register.mjs");
    await runUninstall({ restoreBackups: values["restore-backups"] });
    return 0;
  }
  if (command === "restore-backups") {
    const usageLine = "Usage: agy-squad restore-backups";
    const { positionals } = parseSubcommandArgs(rest, usageLine, {});
    if (positionals.length > 0) {
      throw new Error(`Unexpected positional argument '${positionals[0]}'.\n${usageLine}`);
    }
    const { runRestoreBackups } = await import("../scripts/install-register.mjs");
    await runRestoreBackups();
    return 0;
  }

  const root = fs.realpathSync(process.cwd());

  if (command === "plan") {
    console.log(JSON.stringify(await runPlanCommand(rest, root), null, 2));
    return 0;
  }
  if (command === "dispatch") {
    console.log(await runDispatchCommand(rest, root));
    return 0;
  }
  if (command === "collect") {
    const usageLine = "Usage: agy-squad collect (--plan <plan.json> | --record <record.json> | --squad <id>) --from <worktree-dir>... [--workspace <dir>] [--report-root <path>] [--overwrite] [--dry-run] [--strict] [--allow-empty]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      plan: { type: "string" },
      record: { type: "string" },
      squad: { type: "string" },
      from: { type: "string", multiple: true },
      workspace: { type: "string" },
      "report-root": { type: "string" },
      overwrite: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
      "allow-empty": { type: "boolean", default: false }
    });
    if (values.plan !== undefined && values.record !== undefined) {
      throw new Error("Pass either --plan or --record to 'agy-squad collect', not both.");
    }
    if (values.record !== undefined && values.squad !== undefined) {
      throw new Error("Pass either --record or --squad to 'agy-squad collect', not both.");
    }
    const targetRoot = resolveWorkspaceRoot(values.workspace, root);
    const sources = [...(values.from ?? []), ...positionals];
    if (!sources.length) {
      throw new Error(usageLine);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    let plan;
    let record;
    if (values.plan !== undefined) {
      plan = await readJsonInput(targetRoot, values.plan, "plan", handoffsMod);
    } else if (values.record !== undefined) {
      record = await readJsonInput(targetRoot, values.record, "record", handoffsMod);
    } else if (values.squad === undefined) {
      throw new Error(usageLine);
    }
    const result = handoffsMod.collectReportSlots(targetRoot, {
      sources,
      plan,
      record,
      squadId: values.squad,
      reportRoot: values["report-root"] !== undefined ? normalizeWorkspaceCliPath(values["report-root"]) : undefined,
      overwrite: values.overwrite,
      dryRun: values["dry-run"],
      strict: values.strict,
      allowEmpty: values["allow-empty"]
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (command === "bundle-init") {
    const usageLine = "Usage: agy-squad bundle-init --plan <plan.json> [--provenance <scaffold.json>] [--squad <id>] [--workspace <dir>] [--report-root <path>] [--verdict PASS|FAIL|BLOCKED] [--file <path>...] [--id-map <worker=id>...] [--handoffs <file.json>] [--handoff <sender=message>...] [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--digest] [--out <record.json>] [--replace] [<file...>]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      plan: { type: "string" },
      provenance: { type: "string" },
      squad: { type: "string" },
      workspace: { type: "string" },
      "report-root": { type: "string" },
      verdict: { type: "string" },
      file: { type: "string", multiple: true },
      "id-map": { type: "string", multiple: true },
      handoffs: { type: "string" },
      handoff: { type: "string", multiple: true },
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      digest: { type: "boolean", default: false },
      out: { type: "string" },
      replace: { type: "boolean", default: false }
    });
    if (values.plan === undefined) {
      throw new Error(usageLine);
    }
    const targetRoot = resolveWorkspaceRoot(values.workspace, root);
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const plan = await readJsonInput(targetRoot, values.plan, "plan", handoffsMod);
    const provenance = values.provenance !== undefined ? await readJsonInput(targetRoot, values.provenance, "provenance", handoffsMod) : undefined;
    if (
      provenance !== undefined &&
      (!provenance ||
        typeof provenance !== "object" ||
        Array.isArray(provenance) ||
        (provenance.entries !== undefined && !Array.isArray(provenance.entries)))
    ) {
      throw new Error("--provenance JSON must contain an object (with an optional entries array).");
    }
    let handoffs;
    if (values.handoffs !== undefined) {
      const parsedHandoffs = await readJsonInput(targetRoot, values.handoffs, "handoffs", handoffsMod);
      if (!Array.isArray(parsedHandoffs)) {
        throw new Error("--handoffs JSON file must contain an array of { sender, message } entries.");
      }
      handoffs = parsedHandoffs;
    }
    if ((values.handoff ?? []).length > 0) {
      handoffs = [...(handoffs ?? []), ...parseHandoffPairEntries(values.handoff)];
    }
    const idMap = parseKeyValuePairs(values["id-map"], "id-map");
    const files = [...(values.file ?? []), ...positionals].map(normalizeWorkspaceCliPath);
    const record = handoffsMod.buildBundleRecordInit(targetRoot, {
      plan,
      provenance,
      squadId: values.squad,
      files,
      reportRoot: values["report-root"] !== undefined ? normalizeWorkspaceCliPath(values["report-root"]) : undefined,
      verdict: values.verdict,
      idMap,
      handoffs,
      allowUnaudited: values["allow-unaudited"],
      allowNonPassing: values["allow-non-passing"],
      allowPartial: values["allow-partial"]
    });
    const digestResult = values.digest ? handoffsMod.computeEvidenceDigest(targetRoot, record) : undefined;
    if (values.out !== undefined) {
      const trimmedOut = typeof values.out === "string" ? values.out.trim() : "";
      if (!trimmedOut || trimmedOut.includes("\\") || path.isAbsolute(trimmedOut) || /^[a-zA-Z]:/.test(trimmedOut)) {
        throw new Error(`--out must be a workspace-relative .json path: ${values.out}`);
      }
      const outRel = trimmedOut.replace(/^(?:\.\/)+/, "");
      if (
        outRel.split("/").some(p => !p || p === "." || p === "..") ||
        !outRel.toLowerCase().endsWith(".json") ||
        path.posix.basename(outRel).toLowerCase() === ".json"
      ) {
        throw new Error(`--out must be a workspace-relative .json path: ${values.out}`);
      }
      const parentDir = path.posix.dirname(outRel);
      if (parentDir && parentDir !== ".") {
        handoffsMod.ensureDirectory(targetRoot, parentDir, [], new Set());
      }
      const outBytes = Buffer.from(JSON.stringify(record, null, 2) + "\n", "utf8");
      handoffsMod.publish(targetRoot, outRel, outBytes, values.replace, undefined, undefined, { sync: false });
      console.log(JSON.stringify({
        path: outRel,
        squadId: record.squadId,
        verifiedFilesCount: Object.keys(record.verifiedFiles).length,
        ...(digestResult ? { evidenceDigest: digestResult.evidenceDigest } : {}),
        record
      }, null, 2));
    } else if (digestResult) {
      console.log(JSON.stringify({ evidenceDigest: digestResult.evidenceDigest, record }, null, 2));
    } else {
      console.log(JSON.stringify(record, null, 2));
    }
    return 0;
  }
  if (command === "fingerprint") {
    const usageLine = "Usage: agy-squad fingerprint <file...>";
    const { positionals } = parseSubcommandArgs(rest, usageLine);
    if (!positionals.length) throw new Error(usageLine);
    const { fingerprint } = await import("../mcp/handoffs.mjs");
    console.log(JSON.stringify(fingerprint(root, positionals.map(normalizeWorkspaceCliPath)), null, 2));
    return 0;
  }
  if (command === "inspect") {
    const usageLine = "Usage: agy-squad inspect <record.json>";
    const { positionals } = parseSubcommandArgs(rest, usageLine);
    if (positionals.length !== 1) throw new Error(usageLine);
    const { decodeUtf8, inspectHandoffs, readFile } = await import("../mcp/handoffs.mjs");
    const recPath = normalizeWorkspaceCliPath(positionals[0]);
    const record = JSON.parse(decodeUtf8(readFile(root, recPath), recPath));
    console.log(JSON.stringify(inspectHandoffs(root, record), null, 2));
    return 0;
  }
  if (command === "digest") {
    const usageLine = "Usage: agy-squad digest <record.json> [--allow-non-passing] [--allow-partial]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    const { computeEvidenceDigest, decodeUtf8, readFile } = await import("../mcp/handoffs.mjs");
    const recPath = normalizeWorkspaceCliPath(positionals[0]);
    const record = JSON.parse(decodeUtf8(readFile(root, recPath), recPath));
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("Provide a valid bundle or handoff record.");
    }
    const digestInput = {
      ...record,
      ...(values["allow-non-passing"] ? { allowNonPassing: true } : {}),
      ...(values["allow-partial"] ? { allowPartial: true } : {})
    };
    console.log(JSON.stringify(computeEvidenceDigest(root, digestInput), null, 2));
    return 0;
  }
  if (command === "bundle") {
    const usageLine = "Usage: agy-squad bundle <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--replace] [--predecessor <sha256>]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      replace: { type: "boolean", default: false },
      predecessor: { type: "string" }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    const { bundleReports, decodeUtf8, readFile } = await import("../mcp/handoffs.mjs");
    const recPath = normalizeWorkspaceCliPath(positionals[0]);
    const record = JSON.parse(decodeUtf8(readFile(root, recPath), recPath));
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("Provide a valid bundle record.");
    }
    const bundleInput = {
      ...record,
      ...(values["allow-unaudited"]
        ? { requireIntegrityAudit: false }
        : (record.requireIntegrityAudit === undefined ? { requireIntegrityAudit: true } : {})),
      ...(values["allow-non-passing"] ? { allowNonPassing: true } : {}),
      ...(values["allow-partial"] ? { allowPartial: true } : {}),
      ...(values.replace ? { replaceExisting: true } : {}),
      ...(values.predecessor !== undefined ? { expectedPredecessorSha256: values.predecessor } : {})
    };
    console.log(JSON.stringify(bundleReports(root, bundleInput), null, 2));
    return 0;
  }
  if (command === "verify") {
    const usageLine = "Usage: agy-squad verify <report.sources.json> [--prune [--keep-reports]]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      prune: { type: "boolean", default: false },
      "keep-reports": { type: "boolean", default: false }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    if (values["keep-reports"] && !values.prune) {
      throw new Error(`Flag '--keep-reports' requires '--prune' on 'agy-squad verify'.\n${usageLine}`);
    }
    const rel = normalizeWorkspaceCliPath(positionals[0]);
    if (values.prune) {
      const { verifyAndPruneBundle } = await import("../mcp/handoffs.mjs");
      console.log(JSON.stringify(verifyAndPruneBundle(root, rel, { keepReports: values["keep-reports"] }), null, 2));
    } else {
      const { verifyBundle } = await import("../mcp/handoffs.mjs");
      console.log(JSON.stringify(verifyBundle(root, rel), null, 2));
    }
    return 0;
  }
  if (command === "prune") {
    const usageLine = "Usage: agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "keep-reports": { type: "boolean", default: false }
    });
    if (positionals.length !== 2) {
      throw new Error(usageLine);
    }
    const { pruneReports } = await import("../mcp/handoffs.mjs");
    console.log(JSON.stringify(pruneReports(root, normalizeWorkspaceCliPath(positionals[0]), positionals[1], { keepReports: values["keep-reports"] }), null, 2));
    return 0;
  }
  if (command === "verdict") {
    const usageLine = "Usage: agy-squad verdict [--integrity] <report.md>";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      integrity: { type: "boolean", default: false }
    });
    if (positionals.length !== 1) {
      throw new Error(usageLine);
    }
    const { decodeUtf8, readFile } = await import("../mcp/handoffs.mjs");
    const { parseContentVerdict, parseIntegrityVerdict } = await import("../mcp/verdicts.mjs");
    const reportRel = normalizeWorkspaceCliPath(positionals[0]);
    const markdown = decodeUtf8(readFile(root, reportRel), reportRel);
    const verdict = values.integrity ? parseIntegrityVerdict(markdown) : parseContentVerdict(markdown);
    console.log(JSON.stringify({ verdict }, null, 2));
    return 0;
  }
}

main(process.argv.slice(2)).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error.message);
    process.exitCode = 1;
  }
);
