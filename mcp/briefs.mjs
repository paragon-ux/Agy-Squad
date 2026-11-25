import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { isContainedPath, messageLimit, reportPath, resolveCanonicalRoot } from "./handoffs.mjs";

const DISALLOWED_BUILTINS = new Set(["research", "browser", "image-generator"]);
const SUBAGENT_MODEL_ALIASES = new Set(["inherit", "flash_lite", "flash", "pro"]);
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f\u2028\u2029]/;
const DELIVERABLE_CONTROL_CHAR_RE = /[\x00-\x09\x0b-\x1f\x7f\u2028\u2029]/;
const LARGE_FILE_LINE_THRESHOLD = 750;
const LARGE_FILE_BYTE_THRESHOLD = 43_008; // 42 KiB
const MAX_LARGE_FILE_HINTS = 4;
const MAX_HINT_WALK_FILES = 128;
const SKIPPED_HINT_DIRS = new Set([".git", "node_modules", "scratch", "site"]);
const AGENT_ALIAS_PAIRS = Object.freeze([
  ["role", "Role"],
  ["objective", "Objective"],
  ["scopeFiles", "ScopeFiles"],
  ["instructions", "Instructions"],
  ["expectedDeliverable", "ExpectedDeliverable"],
  ["typeName", "TypeName"],
  ["model", "Model"],
  ["workspace", "Workspace"]
]);

const NATIVE_READ_TOOLS = "native search/read (grep_search/find_by_name + bounded read_file) or git grep -n";
const TRANSCRIPT_FORENSICS_BASE =
  "if agy-context installed: unchained 'agy-context transcript' (read-only '|' pipes ok; no &&/;): 1) parallel 'list --parent <coordId> --lineage --json' + 'health --id u1,u2 --json'; 2) inline 'step 1 --id <uuid> --field content' + 'query --id <uuid> --tool write_file,edit_file --errors' (no --out dumps); else ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (+ transcript_full.jsonl)";
const TRANSCRIPT_FORENSICS_SWARM = `${TRANSCRIPT_FORENSICS_BASE} (swarm: sender=<coordId> + @<workerName>)`;

const superviseCohort = [
  "Map conversationId->slot in shared workspace; yield via Reactive Wakeup, reconcile 1 receipt/slot; at 10m checkpoint operator checks /agents (stop own children only).",
  `Squad Lead Patrol & Alignment Gate: reject ungrounded claims; verify specialist reports and cited files/checks via ${NATIVE_READ_TOOLS} (content only; no trace forensics); recheck changed inputs, PASS on proof, else FAIL/BLOCKED.`
].join("\n");

const superviseSwarmLayeredLead = [
  "Wave-2 Squad Lead (spawned after specialist reports exist on disk): do NOT park upfront on swarm_wait; follow Board scope above (never unfiltered read_board(), since: 0, or limit: 50).",
  `Squad Lead Patrol & Alignment Gate: read specialist report slots directly, spot-check ONLY cited file:line/checks via ${NATIVE_READ_TOOLS} (no bulk repo re-reads; content only; no trace forensics), write Report slot, post <= ${messageLimit} B receipt to @coordinator, then swarm_wait; PASS on proof, else FAIL/BLOCKED.`
].join("\n");

function countBufferLines(buf) {
  if (buf.length === 0) return 0;
  let count = 0;
  let idx = -1;
  while ((idx = buf.indexOf(0x0a, idx + 1)) !== -1) {
    count += 1;
  }
  return buf[buf.length - 1] === 0x0a ? count : count + 1;
}

function collectLargeScopeFileHints(scope, workspaceRoot, fileMetricsCache) {
  if (!workspaceRoot || typeof workspaceRoot !== "string" || !Array.isArray(scope) || scope.length === 0) {
    return null;
  }
  let canonicalRoot;
  try {
    canonicalRoot = resolveCanonicalRoot(workspaceRoot);
  } catch {
    return null;
  }
  const cache = fileMetricsCache instanceof Map ? fileMetricsCache : new Map();
  const candidates = new Set();
  const inspectFile = (absPath, relPosix) => {
    if (candidates.size >= MAX_HINT_WALK_FILES) return;
    candidates.add(relPosix);
    if (cache.has(relPosix)) return;
    try {
      const st = fs.lstatSync(absPath);
      if (st.isSymbolicLink() || !st.isFile()) {
        cache.set(relPosix, null);
        return;
      }
      if (st.size < LARGE_FILE_LINE_THRESHOLD && st.size <= LARGE_FILE_BYTE_THRESHOLD) {
        cache.set(relPosix, null);
        return;
      }
      let lines = 0;
      if (st.size <= 4 * 1024 * 1024) {
        const buf = fs.readFileSync(absPath);
        lines = countBufferLines(buf);
      } else {
        lines = Math.ceil(st.size / 80);
      }
      if (lines > LARGE_FILE_LINE_THRESHOLD || st.size > LARGE_FILE_BYTE_THRESHOLD) {
        cache.set(relPosix, {
          relPath: relPosix,
          lines,
          bytes: st.size,
          kib: Math.max(1, Math.round(st.size / 1024))
        });
      } else {
        cache.set(relPosix, null);
      }
    } catch {
      cache.set(relPosix, null);
    }
  };
  const walkDir = (dirAbs, dirRel) => {
    if (candidates.size >= MAX_HINT_WALK_FILES) return;
    let dirents;
    try {
      dirents = fs.readdirSync(dirAbs, { withFileTypes: true }).sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      );
    } catch {
      return;
    }
    for (const dirent of dirents) {
      if (candidates.size >= MAX_HINT_WALK_FILES) break;
      if (dirent.isSymbolicLink()) continue;
      const childRel = `${dirRel}/${dirent.name}`;
      const childAbs = path.join(dirAbs, dirent.name);
      if (dirent.isDirectory()) {
        if (SKIPPED_HINT_DIRS.has(dirent.name)) continue;
        walkDir(childAbs, childRel);
      } else if (dirent.isFile()) {
        inspectFile(childAbs, childRel);
      }
    }
  };

  for (const entry of scope) {
    if (entry === "." || candidates.size >= MAX_HINT_WALK_FILES) continue;
    const abs = path.resolve(canonicalRoot, entry);
    if (!isContainedPath(canonicalRoot, abs, false)) continue;
    let st;
    try {
      st = fs.lstatSync(abs);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isFile()) {
      inspectFile(abs, entry);
    } else if (st.isDirectory() && !SKIPPED_HINT_DIRS.has(entry.split("/")[0])) {
      walkDir(abs, entry);
    }
  }

  const largeFiles = [];
  for (const rel of candidates) {
    const metric = cache.get(rel);
    if (metric) largeFiles.push(metric);
  }
  if (largeFiles.length === 0) return null;
  largeFiles.sort((a, b) => b.bytes - a.bytes || b.lines - a.lines || (a.relPath < b.relPath ? -1 : 1));
  const shown = largeFiles.slice(0, MAX_LARGE_FILE_HINTS);
  const extra = largeFiles.length > MAX_LARGE_FILE_HINTS ? `, +${largeFiles.length - MAX_LARGE_FILE_HINTS} more` : "";
  return `Large files (slice <=600L, <45KiB): ${shown.map(f => `${f.relPath} (${f.lines}L/${f.kib}KiB)`).join(", ")}${extra}`;
}

function normalizeModeObjective(rawObjective, executionMode, isLead, isIntegrityAuditor) {
  const trimmed = rawObjective.trim();
  if (executionMode === "subagent") {
    return trimmed
      .replace(/^Park\s+(?:on|via)\s+swarm_wait\b/i, "Wait via Reactive Wakeup")
      .replace(/\b(?:Park\s+(?:on|via)\s+)?swarm_wait\b/gi, "Reactive Wakeup");
  }
  if (executionMode === "swarm" && isLead && !isIntegrityAuditor) {
    return trimmed
      .replace(
        /^Park\s+(?:on|via)\s+swarm_wait\b([^.,;]*?)(?:,\s*then\s+|\s+then\s+)/i,
        (_m, middle) => {
          const cleaned = middle.trim().replace(/^for\s+/i, "");
          return cleaned ? `Read ${cleaned} on disk, then ` : "Read specialist reports on disk, then ";
        }
      )
      .replace(/^Park\s+(?:on|via)\s+swarm_wait\b/i, "Read specialist reports on disk");
  }
  return trimmed;
}

/** Validate that every scopeFiles entry is a clean workspace-relative path (or "."). */
function validateScopeFiles(scope, agentLabel) {
  if (
    !Array.isArray(scope) ||
    !scope.length ||
    scope.some(file => {
      if (typeof file !== "string") return true;
      const trimmed = file.trim();
      if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return true;
      if (trimmed.startsWith("/") || trimmed.includes("\\") || /^[a-zA-Z]:/.test(trimmed)) return true;
      return trimmed !== "." && trimmed.split("/").some(part => !part || part === "." || part === "..");
    })
  ) {
    throw new Error(`Agent '${agentLabel || "unnamed"}' requires valid workspace-relative scopeFiles.`);
  }
  return scope.map(file => file.trim());
}

/** Compile one squad lead or specialist manifest entry into a native worker payload. */
function buildSubagentSpec(spec, squadId, manifestPath, specialistNumber, reportRoot, options = {}) {
  const {
    executionMode = "subagent",
    workspaceIsolation = "inherit",
    isIntegrityAuditor: explicitIntegrityAuditor,
    precompiledSpecialists = false,
    workspace: delegateWorkspace,
    workspaceRoot,
    fileMetricsCache,
    readOnly: explicitReadOnly,
    specialistReportSlots,
    boardSince,
    boardSeqs,
    validateOnly = false,
    isCanonicalSpec = false,
    prevalidatedScope,
    precomputedArtifact
  } = options;
  if (executionMode !== "subagent" && executionMode !== "swarm") {
    throw new Error(`Unsupported executionMode '${executionMode}'.`);
  }
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error(`Invalid agent in squad '${squadId}'.`);
  }
  const pickAlias = isCanonicalSpec
    ? (lower, _upper, fallback) => (spec[lower] !== undefined ? spec[lower] : fallback)
    : (lower, upper, fallback) =>
        spec[lower] !== undefined ? spec[lower] : spec[upper] !== undefined ? spec[upper] : fallback;
  const isLead = specialistNumber === undefined;
  const rawRole = pickAlias("role", "Role", isLead ? "Squad Lead" : "Specialist");
  const role = typeof rawRole === "string" ? rawRole.trim() : "";
  if (!isCanonicalSpec) {
    for (const [lower, upper] of AGENT_ALIAS_PAIRS) {
      if (spec[lower] !== undefined && spec[upper] !== undefined && !util.isDeepStrictEqual(spec[lower], spec[upper])) {
        throw new Error(`Agent '${role || "unnamed"}' has conflicting ${lower} and ${upper} fields.`);
      }
    }
    if (spec.readOnly !== undefined && spec.ReadOnly !== undefined && spec.readOnly !== spec.ReadOnly) {
      throw new Error(`Agent '${role || "unnamed"}' cannot define both 'readOnly' and 'ReadOnly'.`);
    }
    const readOnly = spec.readOnly !== undefined ? spec.readOnly : spec.ReadOnly;
    if (readOnly !== undefined && typeof readOnly !== "boolean") {
      throw new Error(`Agent '${role || "unnamed"}' readOnly must be a boolean.`);
    }
  }
  const resolvedReadOnly =
    typeof explicitReadOnly === "boolean"
      ? explicitReadOnly
      : (spec.readOnly !== undefined ? spec.readOnly : spec.ReadOnly) === true;
  const safeRole = role.replace(/[\x00-\x1f\x7f\u2028\u2029]+/g, " ").trim() || "unnamed";
  const instructions = pickAlias("instructions", "Instructions", undefined);
  const rawDeliverable =
    pickAlias("expectedDeliverable", "ExpectedDeliverable", "Factual evidence with file:line.");
  const deliverable = typeof rawDeliverable === "string" ? rawDeliverable.trim() : "";
  const rawTypeName = pickAlias("typeName", "TypeName", "self");
  const rawModel = pickAlias("model", "Model", "inherit");
  const rawWorkspace = pickAlias("workspace", "Workspace", "inherit");
  if (
    [rawRole, rawTypeName, rawModel, rawWorkspace].some(
      value => typeof value !== "string" || !value.trim() || CONTROL_CHAR_RE.test(value)
    ) ||
    typeof rawDeliverable !== "string" ||
    !deliverable ||
    DELIVERABLE_CONTROL_CHAR_RE.test(rawDeliverable) ||
    /^\s*Report slot\s*:/im.test(rawDeliverable) ||
    (instructions !== undefined && typeof instructions !== "string")
  ) {
    throw new Error(`Agent '${safeRole}' has invalid brief or payload fields.`);
  }
  const objective = pickAlias("objective", "Objective", undefined);
  if (typeof objective !== "string" || !objective.trim()) {
    throw new Error(`Agent '${role || "unnamed"}' requires an objective.`);
  }
  const scope = prevalidatedScope ?? validateScopeFiles(pickAlias("scopeFiles", "ScopeFiles", undefined), safeRole);

  const artifact = precomputedArtifact ?? reportPath(squadId, specialistNumber, reportRoot);
  const trimmedModel = rawModel.trim();
  const coercedSubagentModel = executionMode === "subagent" && !SUBAGENT_MODEL_ALIASES.has(trimmedModel);
  if (coercedSubagentModel && Array.isArray(options.warnings)) {
    options.warnings.push(
      `Explicit model '${trimmedModel}' for agent '${role}' (${squadId}) cannot be pinned under subagent dispatch; compiled Model defaulted to 'inherit'. Use squad_planner with executionMode 'swarm' to pin exact model IDs.`
    );
  }
  const payload = {
    TypeName: rawTypeName.trim(),
    Role: role,
    Model: coercedSubagentModel ? "inherit" : trimmedModel,
    Workspace: rawWorkspace.trim()
  };
  if (DISALLOWED_BUILTINS.has(payload.TypeName.toLowerCase())) {
    throw new Error(`Assignment '${role}' needs a writable typeName (disallowed built-in '${payload.TypeName}'); use 'self' or a custom subagent.`);
  }
  if (payload.Workspace !== "inherit") {
    throw new Error(`Assignment '${role}' needs Workspace 'inherit' so its report slot is shared.`);
  }
  if (validateOnly) {
    return payload;
  }

  const isIntegrityAuditor =
    typeof explicitIntegrityAuditor === "boolean"
      ? explicitIntegrityAuditor
      : squadId === "integrity_auditor" || squadId.startsWith("integrity_auditor-");
  const isSwarm = executionMode === "swarm";
  const normalizedObjective = normalizeModeObjective(objective, executionMode, isLead, isIntegrityAuditor);

  const traceForensics = isSwarm ? TRANSCRIPT_FORENSICS_SWARM : TRANSCRIPT_FORENSICS_BASE;
  const deliverableHasAuditFields =
    deliverable.includes("Target Squad:") &&
    deliverable.includes("Evidence Digest:") &&
    deliverable.includes("Integrity Verdict:");
  const auditEmitClause = deliverableHasAuditFields
    ? ""
    : "\nEmit standalone lines (plain text, no backticks, never ';'-joined):\nTarget Squad: <id>\nEvidence Digest: <sha256>\nIntegrity Verdict: CLEAN | INTEGRITY VIOLATION";
  const alignmentLine = isIntegrityAuditor
    ? `Integrity Auditor: ${NATIVE_READ_TOOLS}; no raw .system_generated/ copies. Batch-check traces (${traceForensics}${isSwarm ? "; read_board/status verify handoffs/roster only; re-execution cannot satisfy CLEAN" : ""}). Fail closed: 'Integrity Verdict: INTEGRITY VIOLATION' if traces missing/tampered.${auditEmitClause}`
    : `${isSwarm ? "Worker Alignment Policy: Follow squad lead/coordinator policy." : "Subagent Alignment Policy: Follow squad lead policy."} Anti-cheating rule: cite executed checks or file:line; use ${NATIVE_READ_TOOLS}. Retry when inputs change/transient; else partial+blocker.`;

  const hasManifestFile =
    typeof manifestPath === "string" &&
    manifestPath.trim().length > 0 &&
    manifestPath !== "inline-manifest" &&
    manifestPath !== "inline-task";
  const dispatchArgs = delegateWorkspace
    ? { squadId, manifestPath, workspace: delegateWorkspace }
    : { squadId, manifestPath };
  const dispatchCall =
    !isSwarm && hasManifestFile && !precompiledSpecialists
      ? `Call dispatch_squad with ${JSON.stringify(dispatchArgs)}.`
      : null;

  const workingSupervision = isSwarm
    ? boardSince === 0 && !(Array.isArray(boardSeqs) && boardSeqs.length > 0)
      ? superviseSwarmLayeredLead.replace(", since: 0, or ", " or ")
      : superviseSwarmLayeredLead
    : superviseCohort;
  const leadIntro = isSwarm
    ? null
    : precompiledSpecialists
      ? "Launch pre-compiled squad_planner specialists verbatim (no dispatch_squad)."
      : dispatchCall
        ? `When authorized, ${dispatchCall[0].toLowerCase()}${dispatchCall.slice(1)}`
        : null;

  const leadBody = isIntegrityAuditor
    ? `Integrity Auditor Lead.${dispatchCall ? ` ${dispatchCall}` : ""}\n${alignmentLine}`
    : `${leadIntro ? `${leadIntro}\n` : ""}${workingSupervision}`;

  const citeSuffix = isLead || isIntegrityAuditor ? "; cite checks/file:line." : ".";
  const reportPlacementLine =
    isSwarm && workspaceIsolation !== "inherit"
      ? `Write '${workspaceIsolation}' working copy slot (no overwrite)${citeSuffix}`
      : `Write shared slot (no overwrite)${citeSuffix}`;
  const readOnlyLine =
    resolvedReadOnly && !isIntegrityAuditor
      ? "Read-only mode: do NOT modify, create, or delete files outside <Report slot>."
      : null;

  const swarmRecipient = "@coordinator";

  const boardScopeLine = isSwarm
    ? Array.isArray(boardSeqs) && boardSeqs.length > 0
      ? `Board scope: read_board{seqs: [${boardSeqs.join(", ")}]} only.`
      : isIntegrityAuditor
        ? "Board scope: read_board{seqs: [<handoffSeqs...>]} only."
        : isLead
          ? boardSince !== undefined
            ? `Board scope: skip Turn-1 read_board; read specialist report slots directly (on later wakeup, read_board{since: ${boardSince}}).`
            : "Board scope: skip Turn-1 read_board; read specialist report slots directly (on later wakeup, read_board{since: <ownSeq>})."
          : boardSince !== undefined
            ? `Board scope: skip Turn-1 read_board (Step 1 has brief); on wakeup, read_board{since: ${boardSince}} (then <last_read_seq>).`
            : "Board scope: skip Turn-1 read_board (Step 1 has brief); on wakeup, read_board{since: <ownSeq>} (then <last_read_seq>)."
    : null;

  const isIsolatedSwarm = isSwarm && (workspaceIsolation === "share" || workspaceIsolation === "branch");
  const handoffInstructionLine = isSwarm
    ? isIsolatedSwarm
      ? `1 post_message <= ${messageLimit} UTF-8 bytes (${swarmRecipient}): READY <Report slot> - wt=<abs-worktree-root> <obs> | PARTIAL <Report slot> - wt=<abs-worktree-root> <obs> | NO_REPORT - wt=<abs-worktree-root> <reason>. Then swarm_wait.`
      : `1 post_message <= ${messageLimit} UTF-8 bytes (${swarmRecipient}): READY <Report slot> - <obs> | PARTIAL <Report slot> - <obs> | NO_REPORT - <obs>. Then swarm_wait.`.replace("NO_REPORT - <obs>", "NO_REPORT - <reason>")
    : `1 send_message <= ${messageLimit} UTF-8 bytes: READY <Report slot> - <obs> | PARTIAL <Report slot> - <obs> | NO_REPORT - <reason>.`;

  const scopeHeader =
    isLead && isSwarm && !isIntegrityAuditor
      ? "Spot-check scope (cite-check only; no bulk repo re-reads):"
      : "Scope:";
  const hasSpecialistSlotHeader =
    isLead && isSwarm && !isIntegrityAuditor && Array.isArray(specialistReportSlots) && specialistReportSlots.length > 0;
  const largeFileHint = !isIntegrityAuditor
    ? collectLargeScopeFileHints(scope, workspaceRoot ?? delegateWorkspace, fileMetricsCache)
    : null;
  const formattedDeliverable = deliverable.includes("\n") ? `Deliverable:\n${deliverable}` : `Deliverable: ${deliverable}`;

  return {
    ...payload,
    Prompt: [
      `Role: ${role}`,
      `Objective: ${normalizedObjective}`,
      ...(hasSpecialistSlotHeader
        ? ["Specialist report slots:", ...specialistReportSlots.map(slot => `- ${slot}`)]
        : []),
      scopeHeader,
      ...scope.map(file => `- ${file}`),
      ...(largeFileHint ? [largeFileHint] : []),
      ...(instructions ? [`Instructions: ${instructions}`] : []),
      formattedDeliverable,
      `Report slot: ${artifact}`,
      reportPlacementLine,
      ...(readOnlyLine ? [readOnlyLine] : []),
      handoffInstructionLine,
      ...(boardScopeLine ? [boardScopeLine] : []),
      isLead ? leadBody : alignmentLine
    ].join("\n")
  };
}

export {
  AGENT_ALIAS_PAIRS,
  CONTROL_CHAR_RE,
  DISALLOWED_BUILTINS,
  SUBAGENT_MODEL_ALIASES,
  buildSubagentSpec,
  superviseCohort,
  superviseSwarmLayeredLead,
  validateScopeFiles
};
