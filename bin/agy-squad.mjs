#!/usr/bin/env node
import fs from "node:fs";
import { parseArgs } from "node:util";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { bundleReports, fingerprint, inspectHandoffs, pruneReports, readFile, verifyBundle } from "../mcp/handoffs.mjs";
import { planSquadCohort } from "../mcp/planner.mjs";
import { parseContentVerdict, parseIntegrityVerdict } from "../mcp/verdicts.mjs";

const usage = [
  "Agy-Squad Governance & Verification CLI (pairs with Antigravity native /swarm):",
  "  agy-squad plan (--manifest <path> | \"<task>\") [--squad <id>] [--topology flat|layered] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--no-integrity] [--report-root <path>] [--known-model <id>...]",
  "  agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]       Compile invoke_subagent payload (subagent mode only)",
  "  agy-squad fingerprint <file...>                                        Compute SHA-256 fingerprints for verifiedFiles",
  "  agy-squad inspect <record.json>                                        Reconcile handoff readiness for a cohort",
  "  agy-squad bundle <record.json> [--allow-unaudited]                     Create a SHA-256 verified proof bundle",
  "  agy-squad verify <report.sources.json>                                 Verify bundle integrity, synthesis, and audit hashes",
  "  agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports] Prune loose reports after verification",
  "  agy-squad verdict [--integrity] <report.md>                            Strictly parse a content or integrity verdict"
].join("\n");

function runPlanCommand(rest, root) {
  if (!rest.length) {
    throw new Error(
      "Usage: agy-squad plan (--manifest <path> | \"<task>\") [--squad <id>] [--topology flat|layered] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--no-integrity] [--report-root <path>] [--known-model <id>...]"
    );
  }
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
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
      "known-model": { type: "string", multiple: true }
    }
  });
  const task = positionals.join(" ").trim();
  const planArgs = {
    ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {}),
    ...(task ? { task } : {}),
    ...(values.squad !== undefined ? { squadId: values.squad } : {}),
    ...(values.topology !== undefined ? { topology: values.topology } : {}),
    ...(values.mode !== undefined ? { executionMode: values.mode } : {}),
    ...(values.model !== undefined ? { model: values.model } : {}),
    ...(values["workspace-isolation"] !== undefined ? { workspaceIsolation: values["workspace-isolation"] } : {}),
    ...(values.scope !== undefined ? { scopeFiles: values.scope } : {}),
    ...(values.role !== undefined ? { roles: values.role } : {}),
    ...(values["no-integrity"] ? { includeIntegrityAuditor: false } : {}),
    ...(values["report-root"] !== undefined ? { reportRoot: values["report-root"] } : {}),
    ...(values["known-model"] !== undefined ? { knownModels: values["known-model"] } : {})
  };
  return planSquadCohort(planArgs, root);
}

function runDispatchCommand(rest, root) {
  if (!rest.length) {
    throw new Error("Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]");
  }
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
  return result.content[0].text;
}

const KNOWN_COMMANDS = new Set([
  "plan",
  "dispatch",
  "fingerprint",
  "inspect",
  "bundle",
  "verify",
  "prune",
  "verdict",
  "run"
]);

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
  if (!args.length || args[0] === "--help" || args[0] === "-h") {
    console.log(usage);
    return 0;
  }
  const [command, ...rest] = args;
  if (!KNOWN_COMMANDS.has(command)) {
    throw new Error(`Unknown command '${command}'. Expected plan, dispatch, fingerprint, inspect, bundle, verify, prune, or verdict.`);
  }
  if (command === "run") {
    throw new Error("'agy-squad run' was retired in Phase 2; use 'agy-squad plan' with Antigravity native /swarm + swarm-governance.");
  }
  if (rest.includes("--help") || rest.includes("-h")) {
    console.log(usage);
    return 0;
  }

  const root = fs.realpathSync(process.cwd());

  if (command === "plan") {
    console.log(JSON.stringify(runPlanCommand(rest, root), null, 2));
    return 0;
  }
  if (command === "dispatch") {
    console.log(runDispatchCommand(rest, root));
    return 0;
  }
  if (command === "fingerprint") {
    const usageLine = "Usage: agy-squad fingerprint <file...>";
    const { positionals } = parseSubcommandArgs(rest, usageLine);
    if (!positionals.length) throw new Error(usageLine);
    console.log(JSON.stringify(fingerprint(root, positionals), null, 2));
    return 0;
  }
  if (command === "inspect") {
    const usageLine = "Usage: agy-squad inspect <record.json>";
    const { positionals } = parseSubcommandArgs(rest, usageLine);
    if (positionals.length !== 1) throw new Error(usageLine);
    const record = JSON.parse(readFile(root, positionals[0]).toString("utf8"));
    console.log(JSON.stringify(inspectHandoffs(root, record), null, 2));
    return 0;
  }
  if (command === "bundle") {
    const usageLine = "Usage: agy-squad bundle <record.json> [--allow-unaudited]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "allow-unaudited": { type: "boolean", default: false }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    const record = JSON.parse(readFile(root, positionals[0]).toString("utf8"));
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("Provide a valid bundle record.");
    }
    const bundleInput = values["allow-unaudited"]
      ? { ...record, requireIntegrityAudit: false }
      : (record.requireIntegrityAudit === undefined ? { ...record, requireIntegrityAudit: true } : record);
    console.log(JSON.stringify(bundleReports(root, bundleInput), null, 2));
    return 0;
  }
  if (command === "verify") {
    const usageLine = "Usage: agy-squad verify <report.sources.json>";
    const { positionals } = parseSubcommandArgs(rest, usageLine);
    if (positionals.length !== 1) throw new Error(usageLine);
    console.log(JSON.stringify(verifyBundle(root, positionals[0]), null, 2));
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
    console.log(JSON.stringify(pruneReports(root, positionals[0], positionals[1], { keepReports: values["keep-reports"] }), null, 2));
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
    const markdown = readFile(root, positionals[0]).toString("utf8");
    const verdict = values.integrity ? parseIntegrityVerdict(markdown) : parseContentVerdict(markdown);
    console.log(JSON.stringify({ verdict }, null, 2));
    return 0;
  }

  throw new Error(`Unknown command '${command}'. Expected plan, dispatch, fingerprint, inspect, bundle, verify, prune, or verdict.`);
}

main(process.argv.slice(2)).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error.message);
    process.exitCode = 1;
  }
);
