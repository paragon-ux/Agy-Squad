#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const MIN_NODE_MAJOR = 22;

function isNodeVersionSupported(versionStr = process.versions.node, minMajor = MIN_NODE_MAJOR) {
  if (typeof versionStr !== "string") return false;
  const match = versionStr.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return Boolean(match && Number.parseInt(match[1], 10) >= minMajor);
}

function assertNodeVersion(versionStr = process.versions.node, minMajor = MIN_NODE_MAJOR) {
  if (!isNodeVersionSupported(versionStr, minMajor)) {
    const cleaned = typeof versionStr === "string" ? versionStr.trim().replace(/^v/i, "") : "";
    const foundLabel = cleaned ? `v${cleaned}` : "unknown";
    throw new Error(`Agy-Squad requires Node.js >= ${minMajor}.0.0 (found ${foundLabel}). Please upgrade Node.js.`);
  }
}

function readPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version || "0.2.2";
  } catch {
    return "0.2.2";
  }
}

function warnUncarriedCitations(citations, targetLabel) {
  const uncarried = citations?.uncarriedUrls;
  if (!Array.isArray(uncarried) || uncarried.length === 0) return;
  console.error(
    `[WARN] ${uncarried.length} specialist citation URL(s) not carried into ${targetLabel} (raw specialist markdown stays archived in report.sources.json; pass --strict-citations on bundle/finalize to fail closed):\n${uncarried.map(url => `  - ${url}`).join("\n")}`
  );
}

function isDirectExecution(
  argv1 = process.argv[1],
  selfUrl = import.meta.url,
  platform = process.platform
) {
  if (!argv1 || !selfUrl) return false;
  const selfPath =
    selfUrl instanceof URL || (typeof selfUrl === "string" && selfUrl.startsWith("file:"))
      ? fileURLToPath(selfUrl)
      : selfUrl;
  const pathImpl = platform === "win32" ? path.win32 : path.posix;
  const normalize = (p) => {
    let resolved;
    if (platform === process.platform) {
      try {
        resolved = fs.realpathSync.native(path.resolve(p));
      } catch {
        resolved = path.resolve(p);
      }
    } else {
      resolved = pathImpl.resolve(p);
    }
    if (platform === "win32") return resolved.replace(/\\/g, "/").toLowerCase();
    if (platform === "darwin") return resolved.toLowerCase();
    return resolved;
  };
  return normalize(argv1) === normalize(selfPath);
}

const usage = [
  "Agy-Squad Governance & Verification CLI (pairs with Antigravity native /swarm)",
  "",
  "Usage:",
  "  agy-squad <command> [options]",
  "  agy-squad help [<command>] | agy-squad <command> --help",
  "  agy-squad --help | -h | --version | -v",
  "",
  "Lifecycle Commands:",
  "  setup | install [--check]       Install or sync plugin, skills, MCP server, and CLI shim",
  "  status [--json]                 Check plugin, skills, MCP server, CLI shim, and PATH health",
  "  uninstall [--restore-backups]   Remove plugin link, MCP entry, and CLI shims",
  "  restore-backups                 Key-merge restore *.agy-squad.bak (preserves foreign entries)",
  "",
  "Planning Commands:",
  "  plan (--manifest <path> | \"<task>\") [options]",
  "                                  Compile flat or layered /swarm (or subagent) cohort plans",
  "  dispatch (--squad <id> | <id>) [--manifest <path>]",
  "                                  Compile invoke_subagent stage payload (subagent fallback)",
  "",
  "Verification & Bundling Commands:",
  "  collect --plan|--record|--squad --from <dir>... [options]",
  "                                  Collect report slots from share/branch worktrees",
  "  bundle-init --plan <plan.json> [options] [<file>...]",
  "                                  Build a bundle record JSON from a plan and verified files",
  "  fingerprint <file...>           Compute SHA-256 digests for verifiedFiles",
  "  inspect <record.json>           Reconcile Pointer-Over-Wire handoff receipts",
  "  digest <record.json> [options]  Compute canonical Evidence Digest for integrity auditing",
  "  bundle <record.json> [options]  Create a SHA-256 verified proof bundle (.sources.json)",
  "  verify <report.sources.json> [sha256] [--expected-sha256 <sha256>] [--prune [--keep-reports]]",
  "                                  Verify bundle integrity (+ optional --prune with SHA-256)",
  "  finalize <record.json> [options]",
  "                                  Run inspect -> bundle -> verify (+ optional --prune) in one call",
  "  prune <report.sources.json> <accepted-sha256> [--keep-reports]",
  "                                  Prune verified loose specialist reports",
  "  verdict [--integrity] <report.md>",
  "                                  Strictly parse a content or integrity verdict",
  "",
  "Global Options:",
  "  --help, -h                      Show this help message (or subcommand help)",
  "  --version, -v                   Print the installed agy-squad CLI version",
  "",
  "Run 'agy-squad <command> --help' (e.g. 'agy-squad plan --help') for full flags and examples."
].join("\n");

const SETUP_HELP = [
  "Usage: agy-squad setup [--check]",
  "Alias: agy-squad install [--check]",
  "",
  "Install or synchronize the Agy-Squad plugin, skills, plugin MCP server, and CLI shims.",
  "",
  "Options:",
  "  --check, -c          Run read-only preflight validation without writing files",
  "",
  "Examples:",
  "  agy-squad setup",
  "  agy-squad setup --check"
].join("\n");

const SUBCOMMAND_HELP = {
  setup: SETUP_HELP,
  install: SETUP_HELP,
  status: [
    "Usage: agy-squad status [--json]",
    "",
    "Check plugin link/copy, skills, MCP registration, CLI shim, and PATH.",
    "",
    "Options:",
    "  --json               Emit machine-readable JSON status output",
    "",
    "Examples:",
    "  agy-squad status",
    "  agy-squad status --json"
  ].join("\n"),
  uninstall: [
    "Usage: agy-squad uninstall [--restore-backups]",
    "",
    "Remove the Agy-Squad plugin link/copy, MCP entry, CLI shims, and schema caches.",
    "",
    "Options:",
    "  --restore-backups    Restore saved *.agy-squad.bak (with legacy *.bak fallback) via key-merge, preserving foreign plugins/MCP entries",
    "",
    "Examples:",
    "  agy-squad uninstall",
    "  agy-squad uninstall --restore-backups"
  ].join("\n"),
  "restore-backups": [
    "Usage: agy-squad restore-backups",
    "",
    "Restore saved pre-install backups (*.agy-squad.bak, with legacy *.bak fallback) via key-merge, preserving foreign plugins/MCP entries.",
    "",
    "Examples:",
    "  agy-squad restore-backups"
  ].join("\n"),
  plan: [
    "Usage: agy-squad plan (--manifest <path> | \"<task>\") [options]",
    "",
    "Compile a flat or layered /swarm (or invoke_subagent) cohort plan.",
    "",
    "Options:",
    "  --manifest <path>                Load squads from a workspace manifest JSON file",
    "  --squad <id>                     Compile one squad (omit to compile all manifest squads)",
    "  --topology flat|layered          Override topology (flat for inline task, manifest-defined otherwise; Step 0 asks if unspecified)",
    "  --mode swarm|subagent            Target native /swarm (default) or invoke_subagent",
    "  --model <id>                     Pin an explicit model ID (verified via --known-model)",
    "  --known-model <id>               Repeatable allowed model ID from swarm{action:\"models\"}",
    "  --workspace-isolation inherit|share|branch",
    "                                   Worker workspace copy mode (default: inherit)",
    "  --scope <path>                   Repeatable workspace-relative scope path (task mode)",
    "  --role <title>                   Repeatable specialist role title (task mode)",
    "  --read-only                      Mark inline task specialists readOnly: true",
    "  --role-scope <role=path>         Repeatable per-role scope override (task mode)",
    "  --no-integrity                   Omit flat audit-<id> stage when explicitly skipping integrity audits",
    "  --report-root <path>             Custom workspace-relative root (default: scratch/agy-squad)",
    "  --occupied-worker <name>         Repeatable existing roster name to avoid collisions",
    "  --board-since <seq>              Scope read_board{since: <seq>} for working members",
    "  --board-seq <seq>                Repeatable board seq for read_board{seqs: [...]}",
    "",
    "Examples:",
    "  agy-squad plan --mode swarm --scope src --role \"Implementer\" --role \"Reviewer\" \"Audit auth\"",
    "  agy-squad plan --manifest swarm-manifest.json --topology flat --workspace-isolation inherit"
  ].join("\n"),
  dispatch: [
    "Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]",
    "",
    "Compile one invoke_subagent stage payload (subagent fallback mode only).",
    "",
    "Options:",
    "  --squad <id>                     Target squad ID, all_l1, or integrity_auditor[:<id>]",
    "  --manifest <path>                Workspace manifest JSON path (optional auto-discovery)",
    "",
    "Examples:",
    "  agy-squad dispatch --squad all_l1 --manifest swarm-manifest.json",
    "  agy-squad dispatch integrity_auditor:storage --manifest swarm-manifest.json"
  ].join("\n"),
  collect: [
    "Usage: agy-squad collect (--plan <plan.json> | --record <record.json> | --squad <id>)",
    "                         --from <worktree-dir>... [options]",
    "",
    "Copy worker, lead, and auditor report slots from share/branch worktrees into workspace.",
    "",
    "Options:",
    "  --plan <plan.json>               Planner JSON output defining expected report slots",
    "  --record <record.json>           Bundle record JSON defining expected report slots",
    "  --squad <id>                     Collect slots for one squad ID",
    "  --from <worktree-dir>            Repeatable source worktree directory",
    "  --workspace <dir>                Target coordinator workspace root (default: cwd)",
    "  --report-root <path>             Custom workspace-relative report root",
    "  --overwrite                      Overwrite differing existing slots in workspace",
    "  --dry-run                        Preview copies without writing files",
    "  --strict                         Fail if any declared slot is missing",
    "  --allow-empty                    Succeed even when zero matching slots are found",
    "",
    "Examples:",
    "  agy-squad collect --plan scratch/plan.json --from ../wt-worker-1 --from ../wt-worker-2",
    "  agy-squad collect --squad auth --from ../wt-auth --dry-run"
  ].join("\n"),
  "bundle-init": [
    "Usage: agy-squad bundle-init --plan <plan.json> [options] [<file>...]",
    "",
    "Initialize a bundle record JSON from squad_planner output and verified workspace files.",
    "",
    "Options:",
    "  --plan <plan.json>               Required planner JSON output (or '-' for stdin)",
    "  --provenance <scaffold.json>     Optional provenanceScaffold JSON override",
    "  --squad <id>                     Target squad ID (required for multi-squad plans)",
    "  --workspace <dir>                Coordinator workspace root (default: cwd)",
    "  --report-root <path>             Custom workspace-relative report root",
    "  --verdict PASS|FAIL|BLOCKED      Explicit lead verdict override",
    "  --file <path>                    Repeatable verified workspace file path",
    "  --from-scope                     Infer & fingerprint regular files from the squad's plan scopeFiles",
    "  --id-map <worker=id>             Repeatable runtime conversationId mapping",
    "  --handoffs <file.json>           JSON array of { sender, message } handoff receipts",
    "  --handoff <sender=message>       Repeatable inline handoff receipt entry",
    "  --allow-unaudited                Set requireIntegrityAudit: false when explicitly skipping integrity audits",
    "  --allow-non-passing              Allow FAIL/BLOCKED synthesis verdicts",
    "  --allow-partial                  Allow PARTIAL/NO_REPORT specialist handoffs",
    "  --digest                         Compute and output canonical Evidence Digest",
    "  --out <record.json>              Write record to a workspace-relative .json file",
    "  --replace                        Overwrite an existing --out file",
    "",
    "Examples:",
    "  agy-squad bundle-init --plan scratch/plan.json --from-scope --handoffs scratch/handoffs.json --digest --out scratch/rec.json",
    "  agy-squad bundle-init --plan scratch/plan.json --squad auth --handoffs scratch/handoffs.json src/auth.js"
  ].join("\n"),
  fingerprint: [
    "Usage: agy-squad fingerprint <file...>",
    "",
    "Compute SHA-256 digests for workspace-relative files used in verifiedFiles.",
    "",
    "Examples:",
    "  agy-squad fingerprint src/auth.js src/session.js",
    "  agy-squad fingerprint README.md docs/tools.md"
  ].join("\n"),
  inspect: [
    "Usage: agy-squad inspect <record.json>",
    "",
    "Reconcile <= 500 byte Pointer-Over-Wire receipts and verify slot readability.",
    "",
    "Examples:",
    "  agy-squad inspect scratch/bundle-record.json"
  ].join("\n"),
  digest: [
    "Usage: agy-squad digest <record.json> [--allow-non-passing] [--allow-partial]",
    "",
    "Compute the deterministic 64-hex Evidence Digest for integrity auditor binding.",
    "",
    "Options:",
    "  --allow-non-passing              Allow FAIL or BLOCKED lead verdicts",
    "  --allow-partial                  Allow PARTIAL or NO_REPORT specialist handoffs",
    "",
    "Examples:",
    "  agy-squad digest scratch/bundle-record.json",
    "  agy-squad digest scratch/bundle-record.json --allow-non-passing --allow-partial"
  ].join("\n"),
  bundle: [
    "Usage: agy-squad bundle <record.json> [options]",
    "",
    "Write a SHA-256 verified v2 proof bundle (lead/report.sources.json).",
    "",
    "Options:",
    "  --allow-unaudited                Opt out of requireIntegrityAudit: true when explicitly skipping integrity audits",
    "  --allow-non-passing              Allow archiving FAIL or BLOCKED cohorts",
    "  --allow-partial                  Allow archiving PARTIAL or NO_REPORT specialist slots",
    "  --strict-citations               Fail closed if any specialist URL is missing from lead/report.md",
    "  --replace                        Overwrite an existing differing report.sources.json",
    "  --predecessor <sha256>           Require existing bundle digest to match before overwrite",
    "",
    "Examples:",
    "  agy-squad bundle scratch/bundle-record.json --replace",
    "  agy-squad bundle scratch/bundle-record.json --allow-unaudited"
  ].join("\n"),
  verify: [
    "Usage: agy-squad verify <report.sources.json> [expected-sha256] [--expected-sha256 <sha256>] [--prune [--keep-reports]]",
    "",
    "Verify bundle SHA-256 digests, auditPolicy, verdicts, and optional loose report pruning.",
    "",
    "Options:",
    "  --expected-sha256 <sha256>       Pin expected 64-hex bundle SHA-256 (required with --prune; or pass as 2nd positional arg)",
    "  --prune                          Unlink verified loose specialist reports after verify (requires expected SHA-256)",
    "  --keep-reports                   With --prune, retain loose specialist reports on disk",
    "",
    "Examples:",
    "  agy-squad verify scratch/agy-squad/squad-auth/lead/report.sources.json",
    "  agy-squad verify scratch/agy-squad/squad-auth/lead/report.sources.json --expected-sha256 <64-hex-sha256> --prune"
  ].join("\n"),
  finalize: [
    "Usage: agy-squad finalize <record.json> [options]",
    "",
    "Run inspect -> bundle -> verify (+ optional --prune) in one deterministic call.",
    "",
    "Options:",
    "  --allow-unaudited                Opt out of requireIntegrityAudit: true when explicitly skipping integrity audits",
    "  --allow-non-passing              Allow archiving FAIL or BLOCKED cohorts",
    "  --allow-partial                  Allow archiving PARTIAL or NO_REPORT specialist slots",
    "  --strict-citations               Fail closed if any specialist URL is missing from lead/report.md",
    "  --replace                        Overwrite an existing differing report.sources.json",
    "  --predecessor <sha256>           Require existing bundle digest to match before overwrite",
    "  --prune                          Unlink verified loose specialist reports after verify",
    "  --keep-reports                   With --prune, retain loose specialist reports on disk",
    "",
    "Examples:",
    "  agy-squad finalize scratch/bundle-record.json --replace --prune",
    "  agy-squad finalize scratch/bundle-record.json --allow-unaudited --prune --keep-reports"
  ].join("\n"),
  prune: [
    "Usage: agy-squad prune <report.sources.json> <accepted-sha256> [--keep-reports]",
    "",
    "Safely remove verified loose specialist reports matching the accepted bundle SHA-256.",
    "",
    "Options:",
    "  --keep-reports                   Verify bundle and retain loose reports on disk",
    "",
    "Examples:",
    "  agy-squad prune scratch/agy-squad/squad-auth/lead/report.sources.json <64-hex-sha256>",
    "  agy-squad prune scratch/agy-squad/squad-auth/lead/report.sources.json <sha256> --keep-reports"
  ].join("\n"),
  verdict: [
    "Usage: agy-squad verdict [--integrity] <report.md>",
    "",
    "Strictly parse a single-line Content Verdict (PASS|FAIL|BLOCKED) or Integrity Verdict.",
    "",
    "Options:",
    "  --integrity                      Parse Integrity Verdict (CLEAN|INTEGRITY VIOLATION) plus targetSquad and evidenceDigest when present",
    "",
    "Examples:",
    "  agy-squad verdict scratch/agy-squad/squad-auth/lead/report.md",
    "  agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md"
  ].join("\n")
};

async function runPlanCommand(rest, root) {
  const usageLine =
    "Usage: agy-squad plan (--manifest <path> | \"<task>\") [--squad <id>] [--topology flat|layered] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--read-only] [--role-scope <role=path>...] [--no-integrity] [--report-root <path>] [--known-model <id>...] [--occupied-worker <name>...] [--board-since <seq>] [--board-seq <seq>...]";
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
    "read-only": { type: "boolean", default: false },
    "role-scope": { type: "string", multiple: true },
    "no-integrity": { type: "boolean", default: false },
    "report-root": { type: "string" },
    "known-model": { type: "string", multiple: true },
    "occupied-worker": { type: "string", multiple: true },
    "board-since": { type: "string" },
    "board-seq": { type: "string", multiple: true }
  });
  let roleScopes;
  if (values["role-scope"] !== undefined) {
    roleScopes = Object.create(null);
    for (const item of values["role-scope"]) {
      const eqIdx = item.indexOf("=");
      if (eqIdx <= 0 || eqIdx === item.length - 1) {
        throw new Error(`Invalid --role-scope entry '${item}'; expected '<role>=<path>'.`);
      }
      const roleKey = item.slice(0, eqIdx).trim();
      const rawPath = item.slice(eqIdx + 1).trim();
      if (!roleKey || !rawPath) {
        throw new Error(`Invalid --role-scope entry '${item}'; role and path must be nonempty.`);
      }
      if (roleKey === "__proto__" || roleKey === "constructor" || roleKey === "prototype") {
        throw new Error(`Invalid --role-scope role '${roleKey}'.`);
      }
      if (!Object.hasOwn(roleScopes, roleKey)) {
        roleScopes[roleKey] = [];
      }
      roleScopes[roleKey].push(normalizeScopeCliPath(rawPath));
    }
  }
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
    ...(values.scope !== undefined ? { scopeFiles: values.scope.map(p => normalizeScopeCliPath(p)) } : {}),
    ...(values.role !== undefined ? { roles: values.role } : {}),
    ...(values["read-only"] ? { readOnly: true } : {}),
    ...(roleScopes !== undefined ? { roleScopes } : {}),
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
  const usageLine = "Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>]";
  if (!rest.length) {
    throw new Error(usageLine);
  }
  const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
    squad: { type: "string" },
    manifest: { type: "string" }
  });
  const { dispatchSquadData, formatNotFoundError } = await import("../mcp/dispatch.mjs");
  if (values.squad !== undefined && positionals.length > 0) {
    throw new Error("Pass either --squad <id> or a positional <squadId>, not both.");
  }
  if (positionals.length > 1) {
    throw new Error(usageLine);
  }
  const squadId = values.squad ?? positionals[0];
  if (!squadId) {
    throw new Error(usageLine);
  }
  const dispatchArgs = {
    squadId,
    ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {})
  };
  try {
    return JSON.stringify(dispatchSquadData(dispatchArgs, root), null, 2);
  } catch (error) {
    const message = error.code === "ENOENT" ? formatNotFoundError(dispatchArgs, root) : error.message;
    throw new Error(`dispatch_squad: ${message}`);
  }
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
  "finalize",
  "prune",
  "verdict",
  "help",
  "run"
]);

function resolveWorkspaceRoot(workspaceArg, fallbackRoot, resolveCanonicalRoot) {
  if (workspaceArg === undefined) return fallbackRoot;
  const trimmed = String(workspaceArg).trim();
  if (!trimmed) throw new Error("--workspace must be a nonempty directory path.");
  try {
    return resolveCanonicalRoot(trimmed);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Workspace directory does not exist (${trimmed}): ${error.message}`);
    }
    throw error;
  }
}

async function readJsonInput(targetRoot, pathOrDash, label, { decodeUtf8, isExpectedRealPath, readFile, readRegularFileSafe }) {
  if (typeof pathOrDash !== "string" || !pathOrDash.trim()) {
    throw new Error(`${label} path must be nonempty.`);
  }
  const trimmedInput = pathOrDash.trim();
  let raw;
  if (trimmedInput === "-") {
    const { text: readStreamText } = await import("node:stream/consumers");
    raw = await readStreamText(process.stdin);
  } else {
    const normalized = normalizeWorkspaceCliPath(trimmedInput);
    if (
      !path.isAbsolute(trimmedInput) &&
      normalized &&
      normalized !== "." &&
      !normalized.includes("\\") &&
      !normalized.split("/").includes("..")
    ) {
      try {
        raw = decodeUtf8(readFile(targetRoot, normalized), normalized);
      } catch (err) {
        const cwdResolved = path.resolve(trimmedInput);
        const workspaceCandidate = path.resolve(targetRoot, normalized);
        if (err.code === "ENOENT" && !isExpectedRealPath(workspaceCandidate, cwdResolved)) {
          try {
            raw = decodeUtf8(readRegularFileSafe(cwdResolved, trimmedInput), trimmedInput);
          } catch (fallbackErr) {
            throw fallbackErr.code === "ENOENT" ? err : fallbackErr;
          }
        } else {
          throw err;
        }
      }
    } else {
      const resolved = path.resolve(trimmedInput);
      raw = decodeUtf8(readRegularFileSafe(resolved, trimmedInput), trimmedInput);
    }
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label} (${trimmedInput}): ${error.message}`);
  }
}

function normalizeWorkspaceCliPath(inputPath, platform = process.platform) {
  if (typeof inputPath !== "string") return inputPath;
  const trimmed = inputPath.trim();
  if (
    !trimmed ||
    /[\x00-\x1f\x7f\u2028\u2029]/.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    /^[a-zA-Z]:/.test(trimmed) ||
    path.isAbsolute(trimmed)
  ) {
    return trimmed;
  }
  if (platform !== "win32" && trimmed.includes("\\")) {
    return trimmed;
  }
  const normalized = platform === "win32" ? trimmed.replace(/\\/g, "/") : trimmed;
  if (/^(?:\.\/)+$/.test(normalized)) {
    return ".";
  }
  const stripped = normalized.replace(/^(?:\.\/)+/, "");
  return stripped || normalized;
}

function normalizeScopeCliPath(inputPath, platform = process.platform) {
  const normalized = normalizeWorkspaceCliPath(inputPath, platform);
  if (
    typeof normalized === "string" &&
    normalized.length > 1 &&
    !normalized.startsWith("/") &&
    normalized.endsWith("/") &&
    !normalized.endsWith("//")
  ) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function normalizeBundleOutCliPath(inputOut, platform = process.platform) {
  const trimmedOut = typeof inputOut === "string" ? inputOut.trim() : "";
  if (
    !trimmedOut ||
    /[\x00-\x1f\x7f\u2028\u2029]/.test(trimmedOut) ||
    trimmedOut.startsWith("/") ||
    trimmedOut.startsWith("\\") ||
    path.isAbsolute(trimmedOut) ||
    /^[a-zA-Z]:/.test(trimmedOut)
  ) {
    throw new Error(`--out must be a workspace-relative .json path: ${inputOut}`);
  }
  if (platform !== "win32" && trimmedOut.includes("\\")) {
    throw new Error(`--out must be a workspace-relative .json path: ${inputOut}`);
  }
  const normalizedOut = platform === "win32" ? trimmedOut.replace(/\\/g, "/") : trimmedOut;
  const outRel = normalizedOut.replace(/^(?:\.\/)+/, "");
  if (
    !outRel ||
    outRel.split("/").some(p => !p || p === "." || p === "..") ||
    !outRel.toLowerCase().endsWith(".json") ||
    path.posix.basename(outRel).toLowerCase() === ".json"
  ) {
    throw new Error(`--out must be a workspace-relative .json path: ${inputOut}`);
  }
  return outRel;
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

const STRING_OPTIONS_BY_COMMAND = {
  plan: ["manifest", "squad", "topology", "mode", "model", "workspace-isolation", "scope", "role", "role-scope", "report-root", "known-model", "occupied-worker", "board-since", "board-seq"],
  dispatch: ["squad", "manifest"],
  collect: ["plan", "record", "squad", "from", "workspace", "report-root"],
  "bundle-init": ["plan", "provenance", "squad", "workspace", "report-root", "verdict", "file", "id-map", "handoffs", "handoff", "out"],
  bundle: ["predecessor"],
  verify: ["expected-sha256"],
  finalize: ["predecessor"]
};

function hasHelpFlag(argv, command) {
  const options = { help: { type: "boolean", short: "h" } };
  for (const name of STRING_OPTIONS_BY_COMMAND[command] ?? []) {
    options[name] = { type: "string", multiple: true };
  }
  const { tokens } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    tokens: true,
    options
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
    console.log(readPackageVersion());
    return 0;
  }
  const [command, ...rest] = args;
  if (!KNOWN_COMMANDS.has(command)) {
    throw new Error(`Unknown command '${command}'. Expected setup, install, status, uninstall, restore-backups, plan, dispatch, collect, bundle-init, fingerprint, inspect, digest, bundle, verify, finalize, prune, verdict, or help.`);
  }
  if (command === "help") {
    if (rest.length === 0) {
      console.log(usage);
      return 0;
    }
    if (rest.length > 1) {
      throw new Error("Usage: agy-squad help [<command>]");
    }
    const target = rest[0];
    if (target === "--help" || target === "-h" || target === "help") {
      console.log(usage);
      return 0;
    }
    if (target.startsWith("-")) {
      throw new Error("Conflicting flags: help takes at most one command name (e.g. 'agy-squad help plan').");
    }
    if (target === "run") {
      throw new Error("'agy-squad run' was retired in Phase 2; use 'agy-squad plan' with Antigravity native /swarm + swarm-governance.");
    }
    if (!Object.hasOwn(SUBCOMMAND_HELP, target)) {
      throw new Error(`Unknown command '${target}'. Expected setup, install, status, uninstall, restore-backups, plan, dispatch, collect, bundle-init, fingerprint, inspect, digest, bundle, verify, finalize, prune, verdict, or help.`);
    }
    console.log(SUBCOMMAND_HELP[target]);
    return 0;
  }
  if (command === "run") {
    throw new Error("'agy-squad run' was retired in Phase 2; use 'agy-squad plan' with Antigravity native /swarm + swarm-governance.");
  }
  if (hasHelpFlag(rest, command)) {
    if (rest.length > 1 || (rest[0] !== "--help" && rest[0] !== "-h")) {
      throw new Error("Conflicting flags: --help cannot be combined with operational flags or arguments.");
    }
    console.log(SUBCOMMAND_HELP[command] ?? usage);
    return 0;
  }
  if (command !== "status") {
    assertNodeVersion();
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

  const root = fs.realpathSync.native(process.cwd());

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
    const sources = [...(values.from ?? []), ...positionals];
    if (!sources.length) {
      throw new Error(usageLine);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const targetRoot = resolveWorkspaceRoot(values.workspace, root, handoffsMod.resolveCanonicalRoot);
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
    const usageLine = "Usage: agy-squad bundle-init --plan <plan.json> [--provenance <scaffold.json>] [--squad <id>] [--workspace <dir>] [--report-root <path>] [--verdict PASS|FAIL|BLOCKED] [--file <path>...] [--from-scope] [--id-map <worker=id>...] [--handoffs <file.json>] [--handoff <sender=message>...] [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--digest] [--out <record.json>] [--replace] [<file...>]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      plan: { type: "string" },
      provenance: { type: "string" },
      squad: { type: "string" },
      workspace: { type: "string" },
      "report-root": { type: "string" },
      verdict: { type: "string" },
      file: { type: "string", multiple: true },
      "from-scope": { type: "boolean", default: false },
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
    if (values.replace && values.out === undefined) {
      throw new Error(`Flag '--replace' requires '--out <record.json>' on 'agy-squad bundle-init'.\n${usageLine}`);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const targetRoot = resolveWorkspaceRoot(values.workspace, root, handoffsMod.resolveCanonicalRoot);
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
    const files = [...(values.file ?? []), ...positionals].map(p => normalizeWorkspaceCliPath(p));
    const initVerifiedDirs = new Set([targetRoot]);
    let preReadSynthesis;
    const record = handoffsMod.buildBundleRecordInit(targetRoot, {
      plan,
      provenance,
      squadId: values.squad,
      files,
      fromScope: values["from-scope"],
      reportRoot: values["report-root"] !== undefined ? normalizeWorkspaceCliPath(values["report-root"]) : undefined,
      verdict: values.verdict,
      idMap,
      handoffs,
      allowUnaudited: values["allow-unaudited"],
      allowNonPassing: values["allow-non-passing"],
      allowPartial: values["allow-partial"],
      verifiedDirs: initVerifiedDirs,
      onLeadRead: info => { preReadSynthesis = info; }
    });
    if (values.digest && (!Array.isArray(record.handoffs) || record.handoffs.length === 0)) {
      throw new Error(
        "bundle-init --digest requires specialist handoff receipts. Pass --handoffs <file.json> or --handoff <worker=READY ...>, or omit --digest until handoffs are recorded."
      );
    }
    if (values.digest && Object.keys(record.verifiedFiles ?? {}).length === 0) {
      throw new Error(
        "bundle-init --digest requires at least one verified workspace file. Pass --from-scope, or one or more workspace-relative paths via --file <path> or trailing <file...> arguments."
      );
    }
    const digestResult = values.digest
      ? handoffsMod.computeEvidenceDigest(targetRoot, record, {
          verifiedDirs: initVerifiedDirs,
          skipFileRehash: true,
          preReadSynthesis
        })
      : undefined;
    if (digestResult) {
      warnUncarriedCitations(digestResult.citations, "synthesis report");
    }
    if (values.out !== undefined) {
      const outRel = normalizeBundleOutCliPath(values.out);
      const parentDir = path.posix.dirname(outRel);
      if (parentDir && parentDir !== ".") {
        handoffsMod.ensureDirectory(targetRoot, parentDir, [], initVerifiedDirs);
      }
      const outBytes = Buffer.from(JSON.stringify(record, null, 2) + "\n", "utf8");
      handoffsMod.publish(targetRoot, outRel, outBytes, values.replace, initVerifiedDirs, undefined, { sync: false });
      console.log(JSON.stringify({
        path: outRel,
        squadId: record.squadId,
        verifiedFilesCount: Object.keys(record.verifiedFiles).length,
        ...(digestResult ? { evidenceDigest: digestResult.evidenceDigest, citations: digestResult.citations } : {}),
        record
      }, null, 2));
    } else if (digestResult) {
      console.log(JSON.stringify({ evidenceDigest: digestResult.evidenceDigest, citations: digestResult.citations, record }, null, 2));
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
    console.log(JSON.stringify(fingerprint(root, positionals.map(p => normalizeWorkspaceCliPath(p))), null, 2));
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
    const digestOut = computeEvidenceDigest(root, digestInput);
    warnUncarriedCitations(digestOut.citations, "synthesis report");
    console.log(JSON.stringify(digestOut, null, 2));
    return 0;
  }
  if (command === "bundle") {
    const usageLine =
      "Usage: agy-squad bundle <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--strict-citations] [--replace] [--predecessor <sha256>]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      "strict-citations": { type: "boolean", default: false },
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
        ? { requireIntegrityAudit: false, integrityReport: undefined, integrityAuditSlots: undefined }
        : (record.requireIntegrityAudit === undefined ? { requireIntegrityAudit: true } : {})),
      ...(values["allow-non-passing"] ? { allowNonPassing: true } : {}),
      ...(values["allow-partial"] ? { allowPartial: true } : {}),
      ...(values["strict-citations"] ? { strictCitations: true } : {}),
      ...(values.replace ? { replaceExisting: true } : {}),
      ...(values.predecessor !== undefined ? { expectedPredecessorSha256: values.predecessor } : {})
    };
    const bundled = bundleReports(root, bundleInput);
    warnUncarriedCitations(bundled.citations, bundled.path);
    console.log(JSON.stringify(bundled, null, 2));
    return 0;
  }
  if (command === "verify") {
    const usageLine =
      "Usage: agy-squad verify <report.sources.json> [expected-sha256] [--expected-sha256 <sha256>] [--prune [--keep-reports]]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "expected-sha256": { type: "string" },
      prune: { type: "boolean", default: false },
      "keep-reports": { type: "boolean", default: false }
    });
    if (positionals.length < 1 || positionals.length > 2) throw new Error(usageLine);
    if (values["expected-sha256"] !== undefined && positionals.length === 2) {
      throw new Error("Pass either --expected-sha256 <sha256> or a positional <expected-sha256>, not both.");
    }
    if (values["keep-reports"] && !values.prune) {
      throw new Error(`Flag '--keep-reports' requires '--prune' on 'agy-squad verify'.\n${usageLine}`);
    }
    const rel = normalizeWorkspaceCliPath(positionals[0]);
    const expectedSha256 = values["expected-sha256"] ?? positionals[1];
    if (values.prune) {
      const { verifyAndPruneBundle } = await import("../mcp/handoffs.mjs");
      const out = verifyAndPruneBundle(root, rel, { expectedSha256, keepReports: values["keep-reports"] });
      warnUncarriedCitations(out.citations, out.path);
      console.log(JSON.stringify(out, null, 2));
    } else {
      const { verifyBundle } = await import("../mcp/handoffs.mjs");
      const out = verifyBundle(root, rel, expectedSha256);
      warnUncarriedCitations(out.citations, out.path);
      console.log(JSON.stringify(out, null, 2));
    }
    return 0;
  }
  if (command === "finalize") {
    const usageLine =
      "Usage: agy-squad finalize <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--strict-citations] [--replace] [--predecessor <sha256>] [--prune [--keep-reports]]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      "strict-citations": { type: "boolean", default: false },
      replace: { type: "boolean", default: false },
      predecessor: { type: "string" },
      prune: { type: "boolean", default: false },
      "keep-reports": { type: "boolean", default: false }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    if (values["keep-reports"] && !values.prune) {
      throw new Error(`Flag '--keep-reports' requires '--prune' on 'agy-squad finalize'.\n${usageLine}`);
    }
    const {
      bundleReports,
      decodeUtf8,
      readFile,
      stripReceiptPrefix,
      verifyAndPruneBundle,
      verifyBundle
    } = await import("../mcp/handoffs.mjs");
    const recPath = normalizeWorkspaceCliPath(positionals[0]);
    const verifiedDirs = new Set([root]);
    const record = JSON.parse(decodeUtf8(readFile(root, recPath, verifiedDirs), recPath));
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("Provide a valid bundle record.");
    }
    const bundleInput = {
      ...record,
      ...(values["allow-unaudited"]
        ? { requireIntegrityAudit: false, integrityReport: undefined, integrityAuditSlots: undefined }
        : (record.requireIntegrityAudit === undefined ? { requireIntegrityAudit: true } : {})),
      ...(values["allow-non-passing"] ? { allowNonPassing: true } : {}),
      ...(values["allow-partial"] ? { allowPartial: true } : {}),
      ...(values["strict-citations"] ? { strictCitations: true } : {}),
      ...(values.replace ? { replaceExisting: true } : {}),
      ...(values.predecessor !== undefined ? { expectedPredecessorSha256: values.predecessor } : {})
    };
    // bundleReports already reconciles handoffs and reads every report slot once; derive inspected summary from validated inputs without a duplicate disk pass.
    const bundled = bundleReports(root, bundleInput, { verifiedDirs });
    warnUncarriedCitations(bundled.citations, bundled.path);
    const statusBySender = new Map();
    for (const h of record.handoffs ?? []) {
      const stripped = stripReceiptPrefix(h.message);
      statusBySender.set(
        h.sender,
        stripped.startsWith("READY ") ? "READY" : stripped.startsWith("PARTIAL ") ? "PARTIAL" : "NO_REPORT"
      );
    }
    const inspected = (record.assignments ?? []).map(({ conversationId, report }) => ({
      conversationId,
      report,
      status: statusBySender.get(conversationId) ?? "PENDING"
    }));
    let verified;
    let pruned = null;
    if (values.prune) {
      const vp = verifyAndPruneBundle(root, bundled.path, {
        expectedSha256: bundled.sha256,
        keepReports: values["keep-reports"],
        verifiedDirs
      });
      pruned = vp.pruned;
      verified = { path: vp.path, sha256: vp.sha256, auditPolicy: vp.auditPolicy, reports: vp.reports, citations: vp.citations };
    } else {
      verified = verifyBundle(root, bundled.path, bundled.sha256, { verifiedDirs });
    }
    console.log(JSON.stringify({ inspected, bundled, verified, pruned }, null, 2));
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
    const { parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad } = await import("../mcp/verdicts.mjs");
    const reportRel = normalizeWorkspaceCliPath(positionals[0]);
    const markdown = decodeUtf8(readFile(root, reportRel), reportRel);
    if (values.integrity) {
      const verdict = parseIntegrityVerdict(markdown);
      const targetSquad = parseTargetSquad(markdown);
      const evidenceDigest = parseEvidenceDigest(markdown);
      console.log(JSON.stringify({
        verdict,
        ...(targetSquad !== undefined ? { targetSquad } : {}),
        ...(evidenceDigest !== undefined ? { evidenceDigest } : {})
      }, null, 2));
    } else {
      console.log(JSON.stringify({ verdict: parseContentVerdict(markdown) }, null, 2));
    }
    return 0;
  }
}

if (isDirectExecution()) {
  main(process.argv.slice(2)).then(
    code => { process.exitCode = code; },
    error => {
      console.error(error.message);
      process.exitCode = 1;
    }
  );
}

export { assertNodeVersion, isDirectExecution, isNodeVersionSupported, normalizeBundleOutCliPath, normalizeScopeCliPath, normalizeWorkspaceCliPath };
