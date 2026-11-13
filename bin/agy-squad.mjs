#!/usr/bin/env node
import fs from "node:fs";
import { parseArgs } from "node:util";
import { bundleReports, fingerprint, inspectHandoffs, pruneReports, readFile, verifyBundle } from "../mcp/handoffs.mjs";
import { planSquadCohort } from "../mcp/planner.mjs";
import { parseContentVerdict, parseIntegrityVerdict } from "../mcp/verdicts.mjs";

const usage = [
  "Agy-Squad Governance & Verification CLI (pairs with Antigravity native /swarm):",
  "  agy-squad plan (--manifest <path> | \"<task>\") [--squad <id>] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--no-integrity] [--report-root <path>]",
  "  agy-squad fingerprint <file...>                                        Compute SHA-256 fingerprints for verifiedFiles",
  "  agy-squad inspect <record.json>                                        Reconcile handoff readiness for a cohort",
  "  agy-squad bundle <record.json> [--allow-unaudited]                     Create a SHA-256 verified proof bundle",
  "  agy-squad verify <report.sources.json>                                 Verify bundle integrity, synthesis, and audit hashes",
  "  agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports] Prune loose reports after verification",
  "  agy-squad verdict [--integrity] <report.md>                            Strictly parse a content or integrity verdict"
].join("\n");

function runPlanCommand(rest, root) {
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      manifest: { type: "string" },
      squad: { type: "string" },
      mode: { type: "string" },
      model: { type: "string" },
      "workspace-isolation": { type: "string" },
      scope: { type: "string", multiple: true },
      role: { type: "string", multiple: true },
      "no-integrity": { type: "boolean", default: false },
      "report-root": { type: "string" }
    }
  });
  const task = positionals.join(" ").trim();
  const planArgs = {
    ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {}),
    ...(task ? { task } : {}),
    ...(values.squad !== undefined ? { squadId: values.squad } : {}),
    ...(values.mode !== undefined ? { executionMode: values.mode } : {}),
    ...(values.model !== undefined ? { model: values.model } : {}),
    ...(values["workspace-isolation"] !== undefined ? { workspaceIsolation: values["workspace-isolation"] } : {}),
    ...(values.scope !== undefined ? { scopeFiles: values.scope } : {}),
    ...(values.role !== undefined ? { roles: values.role } : {}),
    ...(values["no-integrity"] ? { includeIntegrityAuditor: false } : {}),
    ...(values["report-root"] !== undefined ? { reportRoot: values["report-root"] } : {})
  };
  return planSquadCohort(planArgs, root);
}

async function main(args) {
  if (!args.length || args[0] === "--help" || args[0] === "-h") {
    console.log(usage);
    return 0;
  }
  const [command, ...rest] = args;
  if (rest.includes("--help") || rest.includes("-h")) {
    console.log(usage);
    return 0;
  }
  if (command === "run") {
    throw new Error("'agy-squad run' was retired in Phase 2; use 'agy-squad plan' with Antigravity native /swarm + swarm-governance.");
  }

  const root = fs.realpathSync(process.cwd());

  if (command === "plan") {
    console.log(JSON.stringify(runPlanCommand(rest, root), null, 2));
    return 0;
  }
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
    const bundleInput = allowUnaudited
      ? { ...record, requireIntegrityAudit: false }
      : (record.requireIntegrityAudit === false ? record : { ...record, requireIntegrityAudit: true });
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

  throw new Error(`Unknown command '${command}'. Expected plan, fingerprint, inspect, bundle, verify, prune, or verdict.`);
}

main(process.argv.slice(2)).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error.message);
    process.exitCode = 1;
  }
);
