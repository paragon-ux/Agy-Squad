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
  "  collect --plan|--record|--squad [--from <dir>... | --handoffs <file>] [options]",
  "                                  Collect report slots from share/branch worktrees",
  "  bundle-init --plan <plan.json> [options] [<file>...]",
  "                                  Build bundle record(s) from a plan and verified files",
  "  fingerprint <file...>           Compute SHA-256 digests for verifiedFiles",
  "  inspect <record.json>           Reconcile Pointer-Over-Wire handoff receipts",
  "  digest <record.json> [options]  Compute canonical Evidence Digest (+ --verify-traces)",
  "  audit-check --record <record.json> [options]",
  "                                  Verify worker Step-1 attribution, writes, and citations",
  "  bundle <record.json> [options]  Create a SHA-256 verified proof bundle (.sources.json)",
  "  verify <report.sources.json> [sha256] [--expected-sha256 <sha256>] [--prune [--keep-reports]]",
  "                                  Verify bundle integrity (+ optional --prune with SHA-256)",
  "  finalize <record.json...> [options]",
  "                                  Run inspect -> bundle -> verify (+ optional --prune) in one call",
  "  prune (<report.sources.json> <sha256> | --records <record.json...>) [options]",
  "                                  Prune verified loose specialist reports (and optional records)",
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
    "  --topology flat|layered          Override topology (flat for inline task, wave-gated layered for manifests; asks only on writable inherit overlaps)",
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
    "  --workspace <dir>                Target repository root (or set AGY_SQUAD_WORKSPACE)",
    "  --out <plan.json>                Write plan JSON (+ .wave1.json / .wave2.json) and print summary with swarmPane",
    "  --swarm-pane-out <path>          Write swarmPane JSON directly (workspace .json or .system_generated/swarm/plan.json)",
    "  --emit-wave <1|2|3>              Print compact swarmAdd slice for Wave 1, 2, or 3",
    "  --replace                        Overwrite existing --out / --swarm-pane-out file(s)",
    "  --compact                        Print compact summary with swarmPane without full worker briefs",
    "",
    "Examples:",
    "  agy-squad plan --mode swarm --scope src --role \"Implementer\" --role \"Reviewer\" \"Audit auth\"",
    "  agy-squad plan --manifest swarm-manifest.json --out scratch/plan.json --replace"
  ].join("\n"),
  dispatch: [
    "Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>] [--workspace <dir>]",
    "",
    "Compile one invoke_subagent stage payload (subagent fallback mode only).",
    "",
    "Options:",
    "  --squad <id>                     Target squad ID, all_l1, or integrity_auditor[:<id>]",
    "  --manifest <path>                Workspace manifest JSON path (optional auto-discovery)",
    "  --workspace <dir>                Target repository root (or set AGY_SQUAD_WORKSPACE)",
    "",
    "Examples:",
    "  agy-squad dispatch --squad all_l1 --manifest swarm-manifest.json",
    "  agy-squad dispatch integrity_auditor:storage --manifest swarm-manifest.json"
  ].join("\n"),
  collect: [
    "Usage: agy-squad collect (--plan <plan.json> | --record <record.json> | --squad <id>)",
    "                         [--from <worktree-dir>... | --handoffs <handoffs.json>] [options]",
    "",
    "Copy worker, lead, and auditor report slots from share/branch worktrees into workspace.",
    "",
    "Options:",
    "  --plan <plan.json>               Planner JSON output defining expected report slots",
    "  --record <record.json>           Bundle record JSON defining expected report slots",
    "  --squad <id>                     Collect slots for one squad ID",
    "  --from <worktree-dir>            Repeatable source worktree directory",
    "  --handoffs <file.json>           Extract wt=<dir> worktrees from handoff receipts automatically",
    "  --handoff <receipt>              Repeatable inline handoff receipt containing wt=<dir>",
    "  --workspace <dir>                Target coordinator workspace root (default: cwd)",
    "  --report-root <path>             Custom workspace-relative report root",
    "  --overwrite                      Overwrite differing existing slots in workspace",
    "  --dry-run                        Preview copies without writing files",
    "  --strict                         Fail if any declared slot is missing",
    "  --allow-empty                    Succeed even when zero matching slots are found",
    "",
    "Examples:",
    "  agy-squad collect --plan scratch/plan.json --handoffs scratch/handoffs.json",
    "  agy-squad collect --plan scratch/plan.json --from ../wt-worker-1 --from ../wt-worker-2"
  ].join("\n"),
  "bundle-init": [
    "Usage: agy-squad bundle-init --plan <plan.json> [options] [<file>...]",
    "",
    "Initialize bundle record JSON(s) from squad_planner output and verified workspace files.",
    "",
    "Options:",
    "  --plan <plan.json>               Required planner JSON output (or '-' for stdin)",
    "  --provenance <scaffold.json>     Optional provenanceScaffold JSON override",
    "  --squad <id>                     Target squad ID (or pass --all-squads)",
    "  --all-squads                     Initialize records across all squads in plan.workers",
    "  --out-dir <dir>                  Custom output directory for --all-squads records",
    "  --workspace <dir>                Coordinator workspace root (default: cwd)",
    "  --report-root <path>             Custom workspace-relative report root",
    "  --verdict PASS|FAIL|BLOCKED      Explicit lead verdict override",
    "  --file <path>                    Repeatable verified workspace file path",
    "  --from-scope                     Infer & fingerprint regular files from the squad's plan scopeFiles",
    "  --id-map <worker=id>             Repeatable runtime conversationId mapping",
    "  --handoffs <file.json>           JSON array of { sender, message } handoff receipts",
    "  --handoff <sender=message>       Repeatable inline handoff receipt entry",
    "  --coord-id <uuid>                Bind <coordId> into emitted auditSwarmAdd brief",
    "  --handoff-seq <seq>              Repeatable receipt board seq for auditSwarmAdd",
    "  --handoff-seqs <csv>             Comma-separated receipt board seqs for auditSwarmAdd",
    "  --allow-unaudited                Set requireIntegrityAudit: false when explicitly skipping integrity audits",
    "  --allow-non-passing              Allow FAIL/BLOCKED synthesis verdicts",
    "  --allow-partial                  Allow PARTIAL/NO_REPORT specialist handoffs",
    "  --digest                         Compute and output canonical Evidence Digest",
    "  --out <record.json>              Write record atomically and emit compact receipt",
    "  --verbose                        Include full record object in --out stdout JSON",
    "  --replace                        Overwrite existing --out / --all-squads record file(s)",
    "",
    "Examples:",
    "  agy-squad bundle-init --plan scratch/plan.json --from-scope --handoffs scratch/handoffs.json --digest --out scratch/rec.json",
    "  agy-squad bundle-init --plan scratch/plan.json --squad auth --handoffs scratch/handoffs.json src/auth.js"
  ].join("\n"),
  fingerprint: [
    "Usage: agy-squad fingerprint [--workspace <dir>] <file...>",
    "",
    "Compute SHA-256 digests for workspace-relative files used in verifiedFiles.",
    "",
    "Examples:",
    "  agy-squad fingerprint src/auth.js src/session.js",
    "  agy-squad fingerprint --workspace /path/to/repo README.md docs/tools.md"
  ].join("\n"),
  inspect: [
    "Usage: agy-squad inspect [--workspace <dir>] <record.json>",
    "",
    "Reconcile <= 500 byte Pointer-Over-Wire receipts and verify slot readability.",
    "",
    "Examples:",
    "  agy-squad inspect scratch/bundle-record.json"
  ].join("\n"),
  digest: [
    "Usage: agy-squad digest <record.json> [--workspace <dir>] [--verify-traces] [--coord-id <uuid>] [--trace <worker=jsonl>...] [--allow-non-passing] [--allow-partial]",
    "",
    "Compute the deterministic 64-hex Evidence Digest for integrity auditor binding.",
    "",
    "Options:",
    "  --workspace <dir>                Coordinator workspace root",
    "  --verify-traces                  Run deterministic <50ms JSONL trace verification",
    "  --coord-id <uuid>                Coordinator conversationId for Step-1 sender check",
    "  --trace <worker=jsonl>           Explicit worker transcript JSONL path override",
    "  --allow-non-passing              Allow FAIL or BLOCKED lead verdicts",
    "  --allow-partial                  Allow PARTIAL or NO_REPORT specialist handoffs",
    "",
    "Examples:",
    "  agy-squad digest scratch/bundle-record.json",
    "  agy-squad digest scratch/bundle-record.json --verify-traces --coord-id <uuid>"
  ].join("\n"),
  "audit-check": [
    "Usage: agy-squad audit-check --record <record.json> [--workspace <dir>] [--coord-id <uuid>] [--trace <worker=jsonl>...]",
    "",
    "Run deterministic <50ms JSONL trace checks (Step-1 attribution, read-only writes, citation grounding).",
    "",
    "Options:",
    "  --record <record.json>           Bundle record JSON defining cohort assignments",
    "  --workspace <dir>                Coordinator workspace root",
    "  --coord-id <uuid>                Coordinator conversationId for Step-1 sender=<coordId> check",
    "  --trace <worker=jsonl>           Repeatable or comma-separated worker=transcript.jsonl override",
    "",
    "Examples:",
    "  agy-squad audit-check --record scratch/agy-squad/squad-auth/record.json --coord-id <uuid>"
  ].join("\n"),
  bundle: [
    "Usage: agy-squad bundle <record.json> [--workspace <dir>] [options]",
    "",
    "Write a SHA-256 verified v2 proof bundle (lead/report.sources.json).",
    "",
    "Options:",
    "  --workspace <dir>                Coordinator workspace root",
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
    "Usage: agy-squad verify <report.sources.json> [expected-sha256] [--workspace <dir>] [--expected-sha256 <sha256>] [--prune [--keep-reports]]",
    "",
    "Verify bundle SHA-256 digests, auditPolicy, verdicts, and optional loose report pruning.",
    "",
    "Options:",
    "  --workspace <dir>                Coordinator workspace root",
    "  --expected-sha256 <sha256>       Pin expected 64-hex bundle SHA-256 (required with --prune; or pass as 2nd positional arg)",
    "  --prune                          Unlink verified loose specialist reports after verify (requires expected SHA-256)",
    "  --keep-reports                   With --prune, retain loose specialist reports on disk",
    "",
    "Examples:",
    "  agy-squad verify scratch/agy-squad/squad-auth/lead/report.sources.json",
    "  agy-squad verify scratch/agy-squad/squad-auth/lead/report.sources.json --expected-sha256 <64-hex-sha256> --prune"
  ].join("\n"),
  finalize: [
    "Usage: agy-squad finalize <record.json...> [--workspace <dir>] [--compact] [options]",
    "",
    "Run inspect -> bundle -> verify (+ optional --prune) across 1..M records in one call.",
    "",
    "Options:",
    "  --workspace <dir>                Coordinator workspace root",
    "  --compact                        Emit compact summary even on a single record",
    "  --allow-unaudited                Opt out of requireIntegrityAudit: true when explicitly skipping integrity audits",
    "  --allow-non-passing              Allow archiving FAIL or BLOCKED cohorts",
    "  --allow-partial                  Allow archiving PARTIAL or NO_REPORT specialist slots",
    "  --strict-citations               Fail closed if any specialist URL is missing from lead/report.md",
    "  --replace                        Overwrite an existing differing report.sources.json",
    "  --predecessor <sha256>           Require existing bundle digest to match before overwrite (single record)",
    "  --prune                          Unlink verified loose specialist reports after verify",
    "  --keep-reports                   With --prune, retain loose specialist reports on disk",
    "",
    "Examples:",
    "  agy-squad finalize scratch/bundle-record.json --replace --prune",
    "  agy-squad finalize scratch/agy-squad/squad-a/record.json scratch/agy-squad/squad-b/record.json --replace --prune"
  ].join("\n"),
  prune: [
    "Usage: agy-squad prune (<report.sources.json> <accepted-sha256> | <bundle>=<sha256>... | --records <record.json...>) [--workspace <dir>] [--keep-reports] [--clean-records]",
    "",
    "Safely remove verified loose specialist reports matching accepted bundle SHA-256 digests.",
    "",
    "Options:",
    "  --workspace <dir>                Coordinator workspace root",
    "  --records <record.json>          Prune bundles corresponding to 1..M verified record files",
    "  --clean-records                  With --records, unlink verified record.json files after pruning",
    "  --keep-reports                   Verify bundle and retain loose reports on disk",
    "",
    "Examples:",
    "  agy-squad prune scratch/agy-squad/squad-auth/lead/report.sources.json <64-hex-sha256>",
    "  agy-squad prune --records scratch/agy-squad/squad-a/record.json scratch/agy-squad/squad-b/record.json --clean-records"
  ].join("\n"),
  verdict: [
    "Usage: agy-squad verdict [--workspace <dir>] [--integrity] <report.md>",
    "",
    "Strictly parse a single-line Content Verdict (PASS|FAIL|BLOCKED) or Integrity Verdict.",
    "",
    "Options:",
    "  --workspace <dir>                Coordinator workspace root",
    "  --integrity                      Parse Integrity Verdict (CLEAN|INTEGRITY VIOLATION) plus targetSquad and evidenceDigest when present",
    "",
    "Examples:",
    "  agy-squad verdict scratch/agy-squad/squad-auth/lead/report.md",
    "  agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md"
  ].join("\n")
};

async function runPlanCommand(rest, fallbackRoot) {
  const usageLine =
    "Usage: agy-squad plan (--manifest <path> | \"<task>\") [--workspace <dir>] [--squad <id>] [--topology flat|layered] [--mode swarm|subagent] [--model <id>] [--workspace-isolation inherit|share|branch] [--scope <path>...] [--role <title>...] [--read-only] [--role-scope <role=path>...] [--no-integrity] [--report-root <path>] [--known-model <id>...] [--occupied-worker <name>...] [--board-since <seq>] [--board-seq <seq>...] [--out <plan.json>] [--swarm-pane-out <path>] [--emit-wave <1|2|3>] [--replace] [--compact]";
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
    workspace: { type: "string" },
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
    "board-seq": { type: "string", multiple: true },
    out: { type: "string" },
    "swarm-pane-out": { type: "string" },
    "emit-wave": { type: "string" },
    replace: { type: "boolean", default: false },
    compact: { type: "boolean", default: false }
  });
  if (values.replace && values.out === undefined && values["swarm-pane-out"] === undefined) {
    throw new Error(`Flag '--replace' requires '--out <plan.json>' or '--swarm-pane-out <path>' on 'agy-squad plan'.\n${usageLine}`);
  }
  let parsedEmitWave;
  if (values["emit-wave"] !== undefined) {
    const rawWave = String(values["emit-wave"]).trim();
    if (rawWave !== "1" && rawWave !== "2" && rawWave !== "3") {
      throw new Error(`--emit-wave must be 1, 2, or 3 (got '${values["emit-wave"]}').`);
    }
    if (values.compact) {
      throw new Error("Conflicting flags: --emit-wave cannot be combined with --compact.");
    }
    parsedEmitWave = Number(rawWave);
  }
  const { resolveCanonicalRoot } = await import("../mcp/handoffs.mjs");
  const { targetRoot } = resolveCommandWorkspace(values.workspace, fallbackRoot, resolveCanonicalRoot);
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
      roleScopes[roleKey].push(normalizeScopeCliPath(rawPath, process.platform, targetRoot));
    }
  }
  const { buildCompactPlanSummary, buildWaveSlice, planSquadCohort } = await import("../mcp/planner.mjs");
  const task = positionals.join(" ").trim();
  const normalizedOut = values.out !== undefined ? normalizeBundleOutCliPath(values.out, process.platform, targetRoot) : undefined;
  const planArgs = {
    ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {}),
    ...(task ? { task } : {}),
    ...(values.squad !== undefined ? { squadId: values.squad } : {}),
    ...(values.topology !== undefined ? { topology: values.topology } : {}),
    ...(values.mode !== undefined ? { executionMode: values.mode } : {}),
    ...(values.model !== undefined ? { model: values.model } : {}),
    ...(values["workspace-isolation"] !== undefined ? { workspaceIsolation: values["workspace-isolation"] } : {}),
    ...(values.scope !== undefined ? { scopeFiles: values.scope.map(p => normalizeScopeCliPath(p, process.platform, targetRoot)) } : {}),
    ...(values.role !== undefined ? { roles: values.role } : {}),
    ...(values["read-only"] ? { readOnly: true } : {}),
    ...(roleScopes !== undefined ? { roleScopes } : {}),
    ...(values["no-integrity"] ? { includeIntegrityAuditor: false } : {}),
    ...(values["report-root"] !== undefined ? { reportRoot: normalizeWorkspaceCliPath(values["report-root"], process.platform, targetRoot) } : {}),
    ...(values["known-model"] !== undefined ? { knownModels: values["known-model"] } : {}),
    ...(values["occupied-worker"] !== undefined ? { occupiedWorkerNames: values["occupied-worker"] } : {}),
    ...(values["board-since"] !== undefined ? { boardSince: parseSeqArg(values["board-since"], "--board-since") } : {}),
    ...(values["board-seq"] !== undefined ? { boardSeqs: values["board-seq"].map(v => parseSeqArg(v, "--board-seq")) } : {}),
    ...(normalizedOut !== undefined ? { outPath: normalizedOut } : {}),
    ...(values["swarm-pane-out"] !== undefined ? { swarmPaneOutPath: values["swarm-pane-out"] } : {}),
    ...(parsedEmitWave !== undefined ? { emitWave: parsedEmitWave } : {}),
    ...(values.replace ? { replace: true } : {})
  };
  const plan = planSquadCohort(planArgs, targetRoot);
  if (parsedEmitWave !== undefined) {
    return buildWaveSlice(plan, parsedEmitWave);
  }
  if (normalizedOut !== undefined || values.compact) {
    return buildCompactPlanSummary(plan, normalizedOut);
  }
  return plan;
}

async function runDispatchCommand(rest, fallbackRoot) {
  const usageLine = "Usage: agy-squad dispatch (--squad <id> | <squadId>) [--manifest <path>] [--workspace <dir>]";
  if (!rest.length) {
    throw new Error(usageLine);
  }
  const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
    squad: { type: "string" },
    manifest: { type: "string" },
    workspace: { type: "string" }
  });
  const { resolveCanonicalRoot } = await import("../mcp/handoffs.mjs");
  const { dispatchSquadData, formatNotFoundError } = await import("../mcp/dispatch.mjs");
  const { targetRoot, explicit } = resolveCommandWorkspace(values.workspace, fallbackRoot, resolveCanonicalRoot);
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
    ...(values.manifest !== undefined ? { manifestPath: values.manifest } : {}),
    ...(explicit ? { workspace: targetRoot } : {})
  };
  try {
    return JSON.stringify(dispatchSquadData(dispatchArgs, targetRoot), null, 2);
  } catch (error) {
    const message = error.code === "ENOENT" ? formatNotFoundError(dispatchArgs, targetRoot) : error.message;
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
  "audit-check",
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

function resolveCommandWorkspace(workspaceArg, cwdRoot, resolveCanonicalRoot) {
  if (workspaceArg !== undefined) {
    return { targetRoot: resolveWorkspaceRoot(workspaceArg, cwdRoot, resolveCanonicalRoot), explicit: true };
  }
  const envWs = process.env.AGY_SQUAD_WORKSPACE?.trim();
  if (envWs) {
    return { targetRoot: resolveWorkspaceRoot(envWs, cwdRoot, resolveCanonicalRoot), explicit: true };
  }
  return { targetRoot: cwdRoot, explicit: false };
}

function inferChildWorkspaceIfContained(currentRoot, explicitWorkspaceSet, candidateWs, handoffsMod) {
  if (explicitWorkspaceSet || typeof candidateWs !== "string" || !candidateWs.trim()) {
    return currentRoot;
  }
  try {
    const canonicalChild = handoffsMod.resolveCanonicalRoot(candidateWs.trim());
    if (
      !handoffsMod.isExpectedRealPath(currentRoot, canonicalChild) &&
      handoffsMod.isContainedPath(currentRoot, canonicalChild, false)
    ) {
      return canonicalChild;
    }
  } catch {}
  return currentRoot;
}

function readRecordWithWorkspaceInference(baseRoot, explicitWorkspaceSet, rawPathArg, handoffsMod, invalidMsg = "Provide a valid bundle record.") {
  const initialRel = normalizeWorkspaceCliPath(rawPathArg, process.platform, baseRoot);
  const record = JSON.parse(handoffsMod.decodeUtf8(handoffsMod.readFile(baseRoot, initialRel), initialRel));
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(invalidMsg);
  }
  const effectiveRoot = inferChildWorkspaceIfContained(baseRoot, explicitWorkspaceSet, record.workspace, handoffsMod);
  const recRel =
    effectiveRoot === baseRoot
      ? initialRel
      : normalizeWorkspaceCliPath(path.join(baseRoot, initialRel), process.platform, effectiveRoot);
  return { record, effectiveRoot, recRel };
}

async function readJsonInput(targetRoot, pathOrDash, label, { decodeUtf8, isExpectedRealPath, readFile, readRegularFileSafe }) {
  if (typeof pathOrDash !== "string" || !pathOrDash.trim()) {
    throw new Error(`${label} path must be nonempty.`);
  }
  const trimmedInput = pathOrDash.trim();
  let raw;
  let resolvedRelPath;
  if (trimmedInput === "-") {
    const { text: readStreamText } = await import("node:stream/consumers");
    raw = await readStreamText(process.stdin);
  } else {
    const normalized = normalizeWorkspaceCliPath(trimmedInput, process.platform, targetRoot);
    if (
      normalized &&
      !path.isAbsolute(normalized) &&
      normalized !== "." &&
      !normalized.includes("\\") &&
      !normalized.split("/").includes("..")
    ) {
      resolvedRelPath = normalized;
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
    const parsed = JSON.parse(raw);
    if (resolvedRelPath && parsed && typeof parsed === "object") {
      Object.defineProperty(parsed, "_cliRelPath", { value: resolvedRelPath, enumerable: false, configurable: true });
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON in ${label} (${trimmedInput}): ${error.message}`);
  }
}

function relativizeAbsoluteWithinRootSync(trimmedPath, targetRoot, platform = process.platform, allowEqual = false) {
  if (!targetRoot || typeof targetRoot !== "string" || platform !== process.platform || !path.isAbsolute(trimmedPath)) {
    return null;
  }
  let canonicalRoot;
  try {
    canonicalRoot = fs.realpathSync.native(targetRoot);
  } catch {
    return null;
  }
  const isContained = (rootP, targetP, eq = false) => {
    const nRoot = platform === "win32" ? rootP.toLowerCase() : rootP;
    const nTarget = platform === "win32" ? targetP.toLowerCase() : targetP;
    const rel = path.relative(nRoot, nTarget);
    return (eq || Boolean(rel)) && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  const resolved = path.resolve(trimmedPath);
  let cur = resolved;
  const tail = [];
  while (true) {
    try {
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink() && tail.length === 0) {
        const realLexParent = fs.realpathSync.native(path.dirname(cur));
        if (!isContained(canonicalRoot, realLexParent, true)) return null;
        const candidateInside = path.join(realLexParent, path.basename(cur));
        if (!isContained(canonicalRoot, candidateInside, allowEqual)) return null;
        const rel = path.relative(canonicalRoot, candidateInside).split(path.sep).join("/");
        return rel || (allowEqual ? "." : null);
      }
      if (st.isSymbolicLink() && tail.length > 0) {
        const realSym = fs.realpathSync.native(cur);
        const sameRoot = platform === "win32"
          ? realSym.toLowerCase() === canonicalRoot.toLowerCase()
          : realSym === canonicalRoot;
        if (!sameRoot) return null;
        const candidateInside = path.join(realSym, ...tail);
        if (!isContained(canonicalRoot, candidateInside, allowEqual)) return null;
        const rel = path.relative(canonicalRoot, candidateInside).split(path.sep).join("/");
        return rel || (allowEqual ? "." : null);
      }
      const realExisting = fs.realpathSync.native(cur);
      if (!isContained(canonicalRoot, realExisting, true)) return null;
      const candidateTarget = tail.length > 0 ? path.join(realExisting, ...tail) : realExisting;
      if (!isContained(canonicalRoot, candidateTarget, allowEqual)) return null;
      const rel = path.relative(canonicalRoot, candidateTarget).split(path.sep).join("/");
      return rel || (allowEqual ? "." : null);
    } catch (err) {
      if (err?.code !== "ENOENT" && err?.code !== "ENOTDIR") return null;
    }
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    tail.unshift(path.basename(cur));
    cur = parent;
  }
}

function normalizeWorkspaceCliPath(inputPath, platform = process.platform, targetRoot = undefined, allowEqual = false) {
  if (typeof inputPath !== "string") return inputPath;
  const trimmed = inputPath.trim();
  if (!trimmed || /[\x00-\x1f\x7f\u2028\u2029]/.test(trimmed)) {
    return trimmed;
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    /^[a-zA-Z]:/.test(trimmed) ||
    path.isAbsolute(trimmed)
  ) {
    const relativized = relativizeAbsoluteWithinRootSync(trimmed, targetRoot, platform, allowEqual);
    return relativized !== null ? relativized : trimmed;
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

function normalizeScopeCliPath(inputPath, platform = process.platform, targetRoot = undefined) {
  const normalized = normalizeWorkspaceCliPath(inputPath, platform, targetRoot, true);
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

function normalizeBundleOutCliPath(inputOut, platform = process.platform, targetRoot = undefined) {
  let trimmedOut = typeof inputOut === "string" ? inputOut.trim() : "";
  if (trimmedOut && targetRoot && path.isAbsolute(trimmedOut)) {
    const relativized = relativizeAbsoluteWithinRootSync(trimmedOut, targetRoot, platform, false);
    if (relativized !== null) trimmedOut = relativized;
  }
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

function parseTracePairEntries(items) {
  const expanded = [];
  for (const raw of items ?? []) {
    for (const part of String(raw).split(",")) {
      const trimmed = part.trim();
      if (trimmed) expanded.push(trimmed);
    }
  }
  return parseKeyValuePairs(expanded, "trace");
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

function parseCollectHandoffEntries(items) {
  return (items ?? []).map(item => {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`Invalid --handoff entry '${item}'; expected a nonempty receipt line.`);
    }
    return item.trim();
  });
}

function parseHandoffSeqOptions(singleItems, csvItems) {
  const tokens = [];
  for (const v of singleItems ?? []) tokens.push(String(v).trim());
  for (const csv of csvItems ?? []) {
    for (const part of String(csv).split(",")) {
      const t = part.trim();
      if (t) tokens.push(t);
    }
  }
  if (tokens.length === 0) return undefined;
  const seen = new Set();
  const parsed = [];
  for (const tok of tokens) {
    if (!/^(?:0|[1-9]\d*)$/.test(tok)) {
      throw new Error(`Invalid handoff sequence '${tok}'; expected a non-negative integer.`);
    }
    const num = Number(tok);
    if (!Number.isSafeInteger(num)) {
      throw new Error(`Invalid handoff sequence '${tok}'; expected a safe integer.`);
    }
    if (!seen.has(num)) {
      seen.add(num);
      parsed.push(num);
    }
  }
  return parsed;
}

const STRING_OPTIONS_BY_COMMAND = {
  plan: ["manifest", "workspace", "squad", "topology", "mode", "model", "workspace-isolation", "scope", "role", "role-scope", "report-root", "known-model", "occupied-worker", "board-since", "board-seq", "out", "swarm-pane-out", "emit-wave"],
  dispatch: ["squad", "manifest", "workspace"],
  collect: ["plan", "record", "squad", "from", "handoffs", "handoff", "workspace", "report-root"],
  "bundle-init": ["plan", "provenance", "squad", "out-dir", "workspace", "report-root", "verdict", "file", "id-map", "handoffs", "handoff", "coord-id", "handoff-seq", "handoff-seqs", "out"],
  fingerprint: ["workspace"],
  inspect: ["workspace"],
  digest: ["workspace", "coord-id", "trace", "brain-dir"],
  "audit-check": ["record", "workspace", "coord-id", "trace", "brain-dir"],
  bundle: ["workspace", "predecessor"],
  verify: ["workspace", "expected-sha256"],
  finalize: ["workspace", "predecessor"],
  prune: ["workspace", "records"],
  verdict: ["workspace"]
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
    throw new Error(`Unknown command '${command}'. Expected setup, install, status, uninstall, restore-backups, plan, dispatch, collect, bundle-init, fingerprint, inspect, digest, audit-check, bundle, verify, finalize, prune, verdict, or help.`);
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
      throw new Error(`Unknown command '${target}'. Expected setup, install, status, uninstall, restore-backups, plan, dispatch, collect, bundle-init, fingerprint, inspect, digest, audit-check, bundle, verify, finalize, prune, verdict, or help.`);
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
    const usageLine = "Usage: agy-squad collect (--plan <plan.json> | --record <record.json> | --squad <id>) [--from <worktree-dir>...] [--handoffs <file.json>] [--handoff <receipt>...] [--workspace <dir>] [--report-root <path>] [--overwrite] [--dry-run] [--strict] [--allow-empty]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      plan: { type: "string" },
      record: { type: "string" },
      squad: { type: "string" },
      from: { type: "string", multiple: true },
      handoffs: { type: "string" },
      handoff: { type: "string", multiple: true },
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
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    let plan;
    let record;
    if (values.plan !== undefined) {
      plan = await readJsonInput(baseRoot, values.plan, "plan", handoffsMod);
    } else if (values.record !== undefined) {
      record = await readJsonInput(baseRoot, values.record, "record", handoffsMod);
    } else if (values.squad === undefined) {
      throw new Error(usageLine);
    }
    const targetRoot = inferChildWorkspaceIfContained(baseRoot, explicit, plan?.workspace ?? record?.workspace, handoffsMod);
    let handoffs;
    if (values.handoffs !== undefined) {
      const parsedHandoffs = await readJsonInput(targetRoot, values.handoffs, "handoffs", handoffsMod);
      if (!Array.isArray(parsedHandoffs)) {
        throw new Error("--handoffs JSON file must contain an array of handoff entries.");
      }
      handoffs = parsedHandoffs;
    }
    if ((values.handoff ?? []).length > 0) {
      handoffs = [...(handoffs ?? []), ...parseCollectHandoffEntries(values.handoff)];
    }
    const sources = [...(values.from ?? []), ...positionals];
    const hasHandoffInputs =
      (Array.isArray(handoffs) && handoffs.length > 0) ||
      (Array.isArray(record?.handoffs) && record.handoffs.length > 0);
    if (!sources.length && !hasHandoffInputs) {
      throw new Error(usageLine);
    }
    const result = handoffsMod.collectReportSlots(targetRoot, {
      sources,
      handoffs,
      plan,
      record,
      squadId: values.squad,
      reportRoot: values["report-root"] !== undefined ? normalizeWorkspaceCliPath(values["report-root"], process.platform, targetRoot) : undefined,
      overwrite: values.overwrite,
      dryRun: values["dry-run"],
      strict: values.strict,
      allowEmpty: values["allow-empty"]
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (command === "bundle-init") {
    const usageLine = "Usage: agy-squad bundle-init --plan <plan.json> [--provenance <scaffold.json>] [--squad <id> | --all-squads [--out-dir <dir>]] [--workspace <dir>] [--report-root <path>] [--verdict PASS|FAIL|BLOCKED] [--file <path>...] [--from-scope] [--id-map <worker=id>...] [--handoffs <file.json>] [--handoff <sender=message>...] [--coord-id <uuid>] [--handoff-seq <seq>...] [--handoff-seqs <csv>] [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--digest] [--out <record.json>] [--replace] [--verbose] [<file...>]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      plan: { type: "string" },
      provenance: { type: "string" },
      squad: { type: "string" },
      "all-squads": { type: "boolean", default: false },
      "out-dir": { type: "string" },
      workspace: { type: "string" },
      "report-root": { type: "string" },
      verdict: { type: "string" },
      file: { type: "string", multiple: true },
      "from-scope": { type: "boolean", default: false },
      "id-map": { type: "string", multiple: true },
      handoffs: { type: "string" },
      handoff: { type: "string", multiple: true },
      "coord-id": { type: "string" },
      "handoff-seq": { type: "string", multiple: true },
      "handoff-seqs": { type: "string", multiple: true },
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      digest: { type: "boolean", default: false },
      out: { type: "string" },
      replace: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false }
    });
    if (values.plan === undefined) {
      throw new Error(usageLine);
    }
    if (values.replace && values.out === undefined && !values["all-squads"]) {
      throw new Error(`Flag '--replace' requires '--out <record.json>' or '--all-squads' on 'agy-squad bundle-init'.\n${usageLine}`);
    }
    if (values.verbose && values.out === undefined && !values["all-squads"]) {
      throw new Error(`Flag '--verbose' requires '--out <record.json>' or '--all-squads' on 'agy-squad bundle-init'.\n${usageLine}`);
    }
    if (values["out-dir"] !== undefined && !values["all-squads"]) {
      throw new Error(`Flag '--out-dir <dir>' requires '--all-squads' on 'agy-squad bundle-init'.\n${usageLine}`);
    }
    if (values["all-squads"] && (values.squad !== undefined || values.out !== undefined)) {
      throw new Error(`Flag '--all-squads' cannot be combined with '--squad' or '--out'.\n${usageLine}`);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const plan = await readJsonInput(baseRoot, values.plan, "plan", handoffsMod);
    const targetRoot = inferChildWorkspaceIfContained(baseRoot, explicit, plan?.workspace, handoffsMod);
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
    let parsedHandoffsInput;
    if (values.handoffs !== undefined) {
      parsedHandoffsInput = await readJsonInput(targetRoot, values.handoffs, "handoffs", handoffsMod);
      if (!Array.isArray(parsedHandoffsInput)) {
        throw new Error("--handoffs JSON file must contain an array of { sender, message } entries.");
      }
      handoffs = parsedHandoffsInput;
    }
    if ((values.handoff ?? []).length > 0) {
      handoffs = [...(handoffs ?? []), ...parseHandoffPairEntries(values.handoff)];
    }
    const handoffSeqs = parseHandoffSeqOptions(values["handoff-seq"], values["handoff-seqs"]);
    const idMap = parseKeyValuePairs(values["id-map"], "id-map");
    const files = [...(values.file ?? []), ...positionals].map(p => normalizeWorkspaceCliPath(p, process.platform, targetRoot));
    const customReportRoot =
      values["report-root"] !== undefined
        ? normalizeWorkspaceCliPath(values["report-root"], process.platform, targetRoot)
        : undefined;

    const resolveInputRelToTarget = (obj, originRoot) => {
      const cliRel = obj?._cliRelPath;
      if (typeof cliRel !== "string" || !cliRel) return undefined;
      if (originRoot === targetRoot) return cliRel;
      const reRel = normalizeWorkspaceCliPath(path.join(originRoot, cliRel), process.platform, targetRoot);
      return typeof reRel === "string" && !path.isAbsolute(reRel) ? reRel : undefined;
    };
    const ignoreRelPaths = [
      resolveInputRelToTarget(plan, baseRoot),
      resolveInputRelToTarget(provenance, targetRoot),
      resolveInputRelToTarget(parsedHandoffsInput, targetRoot)
    ].filter(Boolean);

    const squadHasDotScope = sqId => {
      const w = Array.isArray(plan?.workers) ? plan.workers.find(x => x?.squadId === sqId) : undefined;
      const scopes = [
        ...(Array.isArray(w?.lead?.scopeFiles) ? w.lead.scopeFiles : []),
        ...(Array.isArray(w?.specialists) ? w.specialists.flatMap(s => (Array.isArray(s?.scopeFiles) ? s.scopeFiles : [])) : [])
      ];
      return scopes.some(s => typeof s === "string" && s.trim() === ".");
    };
    const buildEmptyDigestFilesError = sqId =>
      squadHasDotScope(sqId)
        ? "bundle-init --digest requires at least one verified workspace file. Because squad scope includes '.', pass explicit workspace-relative paths via --file <path> or trailing <file...> arguments (--from-scope rejects wildcard '.' scopes)."
        : "bundle-init --digest requires at least one verified workspace file. Pass --from-scope, or one or more workspace-relative paths via --file <path> or trailing <file...> arguments.";

    const initVerifiedDirs = new Set([targetRoot]);

    if (values["all-squads"]) {
      const outDirRel =
        values["out-dir"] !== undefined
          ? handoffsMod.normalizeReportRoot(normalizeWorkspaceCliPath(values["out-dir"], process.platform, targetRoot))
          : undefined;
      const batchItems = handoffsMod.buildBundleRecordsForAllSquads(targetRoot, {
        plan,
        provenance,
        files,
        fromScope: values["from-scope"],
        reportRoot: customReportRoot,
        verdict: values.verdict,
        idMap,
        handoffs,
        allowUnaudited: values["allow-unaudited"],
        allowNonPassing: values["allow-non-passing"],
        allowPartial: values["allow-partial"],
        ignoreRelPaths,
        verifiedDirs: initVerifiedDirs,
        resolveOutPath: sqId =>
          outDirRel
            ? `${outDirRel}/${encodeURIComponent(sqId)}.record.json`
            : handoffsMod.recordSlotPath(sqId, customReportRoot ?? plan?.reportRoot)
      });
      const recordsOut = [];
      for (const item of batchItems) {
        const rec = item.record;
        if (values.digest && (!Array.isArray(rec.handoffs) || rec.handoffs.length === 0)) {
          throw new Error(
            `bundle-init --digest requires specialist handoff receipts (squad '${item.squadId}'). Pass --handoffs <file.json> or --handoff <worker=READY ...>, or omit --digest until handoffs are recorded.`
          );
        }
        if (values.digest && Object.keys(rec.verifiedFiles ?? {}).length === 0) {
          throw new Error(buildEmptyDigestFilesError(item.squadId));
        }
        const digestResult = values.digest
          ? handoffsMod.computeEvidenceDigest(targetRoot, rec, {
              verifiedDirs: initVerifiedDirs,
              skipFileRehash: true,
              preReadSynthesis: item.preReadSynthesis
            })
          : undefined;
        if (digestResult) {
          warnUncarriedCitations(digestResult.citations, `${item.squadId} synthesis report`);
        }
        const outRel = normalizeBundleOutCliPath(item.outRel ?? item.outPath, process.platform, targetRoot);
        const parentDir = path.posix.dirname(outRel);
        if (parentDir && parentDir !== ".") {
          handoffsMod.ensureDirectory(targetRoot, parentDir, [], initVerifiedDirs);
        }
        const outBytes = Buffer.from(JSON.stringify(rec, null, 2) + "\n", "utf8");
        handoffsMod.publish(targetRoot, outRel, outBytes, values.replace, initVerifiedDirs, undefined, { sync: false });
        const auditSwarmAdd = handoffsMod.buildBoundAuditSwarmAdd(targetRoot, plan, rec, outRel, digestResult, {
          coordId: values["coord-id"],
          handoffSeqs,
          idMap
        });
        recordsOut.push({
          path: outRel,
          squadId: rec.squadId,
          verifiedFilesCount: Object.keys(rec.verifiedFiles).length,
          ...(digestResult ? { evidenceDigest: digestResult.evidenceDigest, citations: digestResult.citations } : {}),
          ...(auditSwarmAdd ? { auditSwarmAdd } : {}),
          ...(values.verbose ? { record: rec } : {})
        });
      }
      console.log(JSON.stringify({ ok: true, squadCount: recordsOut.length, records: recordsOut }, null, 2));
      return 0;
    }

    const outRel = values.out !== undefined ? normalizeBundleOutCliPath(values.out, process.platform, targetRoot) : undefined;
    let preReadSynthesis;
    const record = handoffsMod.buildBundleRecordInit(targetRoot, {
      plan,
      provenance,
      squadId: values.squad,
      files,
      fromScope: values["from-scope"],
      reportRoot: customReportRoot,
      recordPath: outRel,
      ignoreRelPaths,
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
      throw new Error(buildEmptyDigestFilesError(record.squadId));
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
    if (outRel !== undefined) {
      const parentDir = path.posix.dirname(outRel);
      if (parentDir && parentDir !== ".") {
        handoffsMod.ensureDirectory(targetRoot, parentDir, [], initVerifiedDirs);
      }
      const outBytes = Buffer.from(JSON.stringify(record, null, 2) + "\n", "utf8");
      handoffsMod.publish(targetRoot, outRel, outBytes, values.replace, initVerifiedDirs, undefined, { sync: false });
      const auditSwarmAdd = handoffsMod.buildBoundAuditSwarmAdd(targetRoot, plan, record, outRel, digestResult, {
        coordId: values["coord-id"],
        handoffSeqs,
        idMap
      });
      console.log(JSON.stringify({
        ok: true,
        path: outRel,
        squadId: record.squadId,
        verifiedFilesCount: Object.keys(record.verifiedFiles).length,
        ...(digestResult ? { evidenceDigest: digestResult.evidenceDigest, citations: digestResult.citations } : {}),
        ...(auditSwarmAdd ? { auditSwarmAdd } : {}),
        ...(values.verbose ? { record } : {})
      }, null, 2));
    } else if (digestResult) {
      console.log(JSON.stringify({ evidenceDigest: digestResult.evidenceDigest, citations: digestResult.citations, record }, null, 2));
    } else {
      console.log(JSON.stringify(record, null, 2));
    }
    return 0;
  }
  if (command === "fingerprint") {
    const usageLine = "Usage: agy-squad fingerprint [--workspace <dir>] <file...>";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" }
    });
    if (!positionals.length) throw new Error(usageLine);
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    console.log(JSON.stringify(handoffsMod.fingerprint(targetRoot, positionals.map(p => normalizeWorkspaceCliPath(p, process.platform, targetRoot))), null, 2));
    return 0;
  }
  if (command === "inspect") {
    const usageLine = "Usage: agy-squad inspect [--workspace <dir>] <record.json>";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const { record, effectiveRoot, recRel } = readRecordWithWorkspaceInference(
      baseRoot,
      explicit,
      positionals[0],
      handoffsMod,
      "Provide a valid bundle or handoff record."
    );
    const inspectInput = !path.isAbsolute(recRel) && !record.recordPath ? { ...record, recordPath: recRel } : record;
    console.log(JSON.stringify(handoffsMod.inspectHandoffs(effectiveRoot, inspectInput), null, 2));
    return 0;
  }
  if (command === "digest") {
    const usageLine = "Usage: agy-squad digest [--workspace <dir>] <record.json> [--allow-non-passing] [--allow-partial] [--verify-traces [--coord-id <uuid>] [--trace <worker=jsonlPath>...]]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      "verify-traces": { type: "boolean", default: false },
      "coord-id": { type: "string" },
      trace: { type: "string", multiple: true },
      "brain-dir": { type: "string" }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const { record, effectiveRoot, recRel } = readRecordWithWorkspaceInference(
      baseRoot,
      explicit,
      positionals[0],
      handoffsMod,
      "Provide a valid bundle or handoff record."
    );
    const digestInput = {
      ...record,
      ...(!path.isAbsolute(recRel) && !record.recordPath ? { recordPath: recRel } : {}),
      ...(values["allow-non-passing"] ? { allowNonPassing: true } : {}),
      ...(values["allow-partial"] ? { allowPartial: true } : {})
    };
    const digestOut = handoffsMod.computeEvidenceDigest(effectiveRoot, digestInput);
    warnUncarriedCitations(digestOut.citations, "synthesis report");
    if (values["verify-traces"]) {
      const traceVerification = handoffsMod.verifyWorkerTraces(effectiveRoot, digestInput, {
        coordId: values["coord-id"],
        traces: parseTracePairEntries(values.trace),
        brainRoot: values["brain-dir"]
      });
      console.log(JSON.stringify({ ...digestOut, traceVerification }, null, 2));
      return traceVerification.ok ? 0 : 1;
    }
    console.log(JSON.stringify(digestOut, null, 2));
    return 0;
  }
  if (command === "audit-check") {
    const usageLine = "Usage: agy-squad audit-check [--workspace <dir>] (--record <record.json> | <record.json>) [--coord-id <uuid>] [--trace <worker=jsonlPath>...]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      record: { type: "string" },
      workspace: { type: "string" },
      "coord-id": { type: "string" },
      trace: { type: "string", multiple: true },
      "brain-dir": { type: "string" }
    });
    if ((values.record !== undefined && positionals.length > 0) || (values.record === undefined && positionals.length !== 1)) {
      throw new Error(usageLine);
    }
    const rawRecordArg = values.record ?? positionals[0];
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const { record, effectiveRoot, recRel } = readRecordWithWorkspaceInference(
      baseRoot,
      explicit,
      rawRecordArg,
      handoffsMod,
      "Provide a valid bundle record."
    );
    const recordWithRel = !path.isAbsolute(recRel) && !record.recordPath ? { ...record, recordPath: recRel } : record;
    const result = handoffsMod.verifyWorkerTraces(effectiveRoot, recordWithRel, {
      coordId: values["coord-id"],
      traces: parseTracePairEntries(values.trace),
      brainRoot: values["brain-dir"]
    });
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }
  if (command === "bundle") {
    const usageLine =
      "Usage: agy-squad bundle [--workspace <dir>] <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--strict-citations] [--replace] [--predecessor <sha256>]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" },
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      "strict-citations": { type: "boolean", default: false },
      replace: { type: "boolean", default: false },
      predecessor: { type: "string" }
    });
    if (positionals.length !== 1) throw new Error(usageLine);
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const { record, effectiveRoot, recRel } = readRecordWithWorkspaceInference(baseRoot, explicit, positionals[0], handoffsMod);
    const bundleInput = {
      ...record,
      ...(!path.isAbsolute(recRel) && !record.recordPath ? { recordPath: recRel } : {}),
      ...(values["allow-unaudited"]
        ? { requireIntegrityAudit: false, integrityReport: undefined, integrityAuditSlots: undefined }
        : (record.requireIntegrityAudit === undefined ? { requireIntegrityAudit: true } : {})),
      ...(values["allow-non-passing"] ? { allowNonPassing: true } : {}),
      ...(values["allow-partial"] ? { allowPartial: true } : {}),
      ...(values["strict-citations"] ? { strictCitations: true } : {}),
      ...(values.replace ? { replaceExisting: true } : {}),
      ...(values.predecessor !== undefined ? { expectedPredecessorSha256: values.predecessor } : {})
    };
    const bundled = handoffsMod.bundleReports(effectiveRoot, bundleInput);
    warnUncarriedCitations(bundled.citations, bundled.path);
    console.log(JSON.stringify(bundled, null, 2));
    return 0;
  }
  if (command === "verify") {
    const usageLine =
      "Usage: agy-squad verify [--workspace <dir>] <report.sources.json> [expected-sha256] [--expected-sha256 <sha256>] [--prune [--keep-reports]]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" },
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
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const rel = normalizeWorkspaceCliPath(positionals[0], process.platform, targetRoot);
    const expectedSha256 = values["expected-sha256"] ?? positionals[1];
    if (values.prune) {
      const out = handoffsMod.verifyAndPruneBundle(targetRoot, rel, { expectedSha256, keepReports: values["keep-reports"] });
      warnUncarriedCitations(out.citations, out.path);
      console.log(JSON.stringify(out, null, 2));
    } else {
      const out = handoffsMod.verifyBundle(targetRoot, rel, expectedSha256);
      warnUncarriedCitations(out.citations, out.path);
      console.log(JSON.stringify(out, null, 2));
    }
    return 0;
  }
  if (command === "finalize") {
    const usageLine =
      "Usage: agy-squad finalize [--workspace <dir>] <record.json...> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--strict-citations] [--replace] [--predecessor <sha256>] [--prune [--keep-reports]] [--compact]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" },
      "allow-unaudited": { type: "boolean", default: false },
      "allow-non-passing": { type: "boolean", default: false },
      "allow-partial": { type: "boolean", default: false },
      "strict-citations": { type: "boolean", default: false },
      replace: { type: "boolean", default: false },
      predecessor: { type: "string" },
      prune: { type: "boolean", default: false },
      "keep-reports": { type: "boolean", default: false },
      compact: { type: "boolean", default: false }
    });
    if (positionals.length < 1) throw new Error(usageLine);
    if (values["keep-reports"] && !values.prune) {
      throw new Error(`Flag '--keep-reports' requires '--prune' on 'agy-squad finalize'.\n${usageLine}`);
    }
    if (values.predecessor !== undefined && positionals.length > 1) {
      throw new Error(`Flag '--predecessor' can only be used with a single <record.json> on 'agy-squad finalize'.\n${usageLine}`);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const loadedPositionals = positionals.map(rawRecPos =>
      readRecordWithWorkspaceInference(baseRoot, explicit, rawRecPos, handoffsMod)
    );
    const allPositionalRecRels = loadedPositionals
      .map(item => item.recRel)
      .filter(rel => typeof rel === "string" && rel && !path.isAbsolute(rel));
    const finalizedResults = [];
    for (const { record, effectiveRoot, recRel } of loadedPositionals) {
      const verifiedDirs = new Set([effectiveRoot]);
      const mergedIgnorePaths = Array.from(
        new Set([...(Array.isArray(record.baselineIgnorePaths) ? record.baselineIgnorePaths : []), ...allPositionalRecRels])
      );
      const bundleInput = {
        ...record,
        ...(!path.isAbsolute(recRel) && !record.recordPath ? { recordPath: recRel } : {}),
        ...(mergedIgnorePaths.length > 0 ? { baselineIgnorePaths: mergedIgnorePaths } : {}),
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
      const bundled = handoffsMod.bundleReports(effectiveRoot, bundleInput, { verifiedDirs });
      warnUncarriedCitations(bundled.citations, bundled.path);
      const statusBySender = new Map();
      for (const h of record.handoffs ?? []) {
        const stripped = handoffsMod.stripReceiptPrefix(h.message);
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
        const vp = handoffsMod.verifyAndPruneBundle(effectiveRoot, bundled.path, {
          expectedSha256: bundled.sha256,
          keepReports: values["keep-reports"],
          verifiedDirs
        });
        pruned = vp.pruned;
        verified = { path: vp.path, sha256: vp.sha256, auditPolicy: vp.auditPolicy, reports: vp.reports, citations: vp.citations };
      } else {
        verified = handoffsMod.verifyBundle(effectiveRoot, bundled.path, bundled.sha256, { verifiedDirs });
      }
      finalizedResults.push({ record, recRel, inspected, bundled, verified, pruned });
    }
    if (finalizedResults.length === 1 && !values.compact) {
      const single = finalizedResults[0];
      console.log(JSON.stringify({ inspected: single.inspected, bundled: single.bundled, verified: single.verified, pruned: single.pruned }, null, 2));
      return 0;
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          count: finalizedResults.length,
          results: finalizedResults.map(item => {
            const uncarriedUrls = Array.isArray(item.bundled.citations?.uncarriedUrls)
              ? item.bundled.citations.uncarriedUrls
              : [];
            return {
              squadId: item.record.squadId,
              recordPath: item.recRel,
              bundlePath: item.bundled.path,
              sha256: item.bundled.sha256,
              auditPolicy: item.verified.auditPolicy,
              uncarriedCitationsCount: uncarriedUrls.length,
              ...(uncarriedUrls.length > 0 ? { uncarriedUrls } : {}),
              prunedCount: Array.isArray(item.pruned?.removed) ? item.pruned.removed.length : 0,
              ...(item.pruned ? { pruned: item.pruned } : {})
            };
          })
        },
        null,
        2
      )
    );
    return 0;
  }
  if (command === "prune") {
    const usageLine =
      "Usage: agy-squad prune [--workspace <dir>] (<report.sources.json> <accepted-sha256> | <report.sources.json>=<accepted-sha256>... | --records <record.json...> [--clean-records]) [--keep-reports]";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" },
      records: { type: "string", multiple: true },
      "clean-records": { type: "boolean", default: false },
      "keep-reports": { type: "boolean", default: false }
    });
    if (values["clean-records"] && values.records === undefined) {
      throw new Error(`Flag '--clean-records' requires '--records <record.json...>' on 'agy-squad prune'.\n${usageLine}`);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { targetRoot: baseRoot, explicit } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    if (values.records !== undefined) {
      const recordArgs = [...values.records, ...positionals];
      if (!recordArgs.length) throw new Error(usageLine);
      const results = [];
      const removed = [];
      const cleanedRecords = [];
      for (const rawRecArg of recordArgs) {
        const { record, effectiveRoot, recRel } = readRecordWithWorkspaceInference(baseRoot, explicit, rawRecArg, handoffsMod);
        const verifiedDirs = new Set([effectiveRoot]);
        const resolvedRootPrefix = handoffsMod.resolveReportRoot(record);
        const bundleRel = handoffsMod.bundlePath(record.squadId, resolvedRootPrefix);
        const acceptedSha = handoffsMod.sha256(handoffsMod.readFile(effectiveRoot, bundleRel, verifiedDirs));
        const pruned = handoffsMod.pruneReports(effectiveRoot, bundleRel, acceptedSha, {
          keepReports: values["keep-reports"],
          verifiedDirs
        });
        removed.push(...(pruned.removed ?? []));
        if (values["clean-records"] && !values["keep-reports"] && !path.isAbsolute(recRel)) {
          const recFull = handoffsMod.workspacePath(effectiveRoot, recRel, verifiedDirs);
          try {
            handoffsMod.readOpenedFileWithStat(recFull, recRel);
            fs.unlinkSync(recFull);
            cleanedRecords.push(recRel);
          } catch (err) {
            if (err?.code !== "ENOENT") throw err;
          }
        }
        results.push({
          squadId: record.squadId,
          bundlePath: bundleRel,
          acceptedSha256: acceptedSha,
          removed: pruned.removed ?? [],
          ...(pruned.retained ? { retained: pruned.retained } : {})
        });
      }
      console.log(
        JSON.stringify(
          {
            ok: true,
            count: results.length,
            results,
            removed,
            ...(values["clean-records"] ? { cleanedRecords } : {})
          },
          null,
          2
        )
      );
      return 0;
    }
    if (positionals.length >= 1 && positionals.every(p => p.includes("="))) {
      const results = [];
      const removed = [];
      for (const pair of positionals) {
        const eqIdx = pair.lastIndexOf("=");
        const rawBundle = pair.slice(0, eqIdx).trim();
        const sha = pair.slice(eqIdx + 1).trim();
        if (!rawBundle || !sha) {
          throw new Error(`Invalid bundle=sha256 pair '${pair}'.\n${usageLine}`);
        }
        const bundleRel = normalizeWorkspaceCliPath(rawBundle, process.platform, baseRoot);
        const pruned = handoffsMod.pruneReports(baseRoot, bundleRel, sha, { keepReports: values["keep-reports"] });
        removed.push(...(pruned.removed ?? []));
        results.push({
          bundlePath: bundleRel,
          acceptedSha256: sha,
          removed: pruned.removed ?? [],
          ...(pruned.retained ? { retained: pruned.retained } : {})
        });
      }
      console.log(JSON.stringify({ ok: true, count: results.length, results, removed }, null, 2));
      return 0;
    }
    if (positionals.length !== 2) {
      throw new Error(usageLine);
    }
    console.log(
      JSON.stringify(
        handoffsMod.pruneReports(baseRoot, normalizeWorkspaceCliPath(positionals[0], process.platform, baseRoot), positionals[1], {
          keepReports: values["keep-reports"]
        }),
        null,
        2
      )
    );
    return 0;
  }
  if (command === "verdict") {
    const usageLine = "Usage: agy-squad verdict [--workspace <dir>] [--integrity] <report.md>";
    const { values, positionals } = parseSubcommandArgs(rest, usageLine, {
      workspace: { type: "string" },
      integrity: { type: "boolean", default: false }
    });
    if (positionals.length !== 1) {
      throw new Error(usageLine);
    }
    const handoffsMod = await import("../mcp/handoffs.mjs");
    const { parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad } = await import("../mcp/verdicts.mjs");
    const { targetRoot } = resolveCommandWorkspace(values.workspace, root, handoffsMod.resolveCanonicalRoot);
    const reportRel = normalizeWorkspaceCliPath(positionals[0], process.platform, targetRoot);
    const markdown = handoffsMod.decodeUtf8(handoffsMod.readFile(targetRoot, reportRel), reportRel);
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
