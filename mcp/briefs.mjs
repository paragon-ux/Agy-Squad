import util from "node:util";
import { messageLimit, reportPath } from "./handoffs.mjs";

const DISALLOWED_BUILTINS = new Set(["research", "browser", "image-generator"]);
const SUBAGENT_MODEL_ALIASES = new Set(["inherit", "flash_lite", "flash", "pro"]);
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f\u2028\u2029]/;
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

const NATIVE_READ_TOOLS =
  "native search/read tools (grep_search/find_by_name + bounded read_file slices on large files)";
const TRANSCRIPT_FORENSICS =
  "~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (swarm: sender=<coordId> + @<workerName>) or 'agy-context transcript'";

const superviseCohort = [
  "Map conversationId->slot in shared workspace; yield via Reactive Wakeup, reconcile 1 receipt/slot; at 10m checkpoint operator checks /agents (stop own children only).",
  `Squad Lead Patrol & Alignment Gate: reject ungrounded claims; batch-read traces (${TRANSCRIPT_FORENSICS}) and verify via ${NATIVE_READ_TOOLS}; recheck changed inputs, PASS on proof, else FAIL/BLOCKED.`
].join("\n");

const superviseSwarmLayeredLead = [
  "Park via swarm_wait; follow Board scope above (never unfiltered read_board(), since: 0, or limit: 50); reconcile 1 receipt/slot.",
  `Squad Lead Patrol & Alignment Gate: verify swarm status, batch-read traces (${TRANSCRIPT_FORENSICS}), and artifacts via ${NATIVE_READ_TOOLS}; recheck changed inputs, PASS on proof, else FAIL/BLOCKED.`
].join("\n");

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
    leadWorkerName,
    boardSince,
    boardSeqs,
    validateOnly = false
  } = options;
  if (executionMode !== "subagent" && executionMode !== "swarm") {
    throw new Error(`Unsupported executionMode '${executionMode}'.`);
  }
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error(`Invalid agent in squad '${squadId}'.`);
  }
  const pickAlias = (lower, upper, fallback) =>
    spec[lower] !== undefined ? spec[lower] : spec[upper] !== undefined ? spec[upper] : fallback;
  const isLead = specialistNumber === undefined;
  const rawRole = pickAlias("role", "Role", isLead ? "Squad Lead" : "Specialist");
  const role = typeof rawRole === "string" ? rawRole.trim() : "";
  for (const [lower, upper] of AGENT_ALIAS_PAIRS) {
    if (spec[lower] !== undefined && spec[upper] !== undefined && !util.isDeepStrictEqual(spec[lower], spec[upper])) {
      throw new Error(`Agent '${role || "unnamed"}' has conflicting ${lower} and ${upper} fields.`);
    }
  }
  const safeRole = role.replace(/[\x00-\x1f\x7f\u2028\u2029]+/g, " ").trim() || "unnamed";
  const instructions = pickAlias("instructions", "Instructions", undefined);
  const rawDeliverable =
    pickAlias("expectedDeliverable", "ExpectedDeliverable", "Factual evidence with file:line.");
  const deliverable = typeof rawDeliverable === "string" ? rawDeliverable.trim() : "";
  const rawTypeName = pickAlias("typeName", "TypeName", "self");
  const rawModel = pickAlias("model", "Model", "inherit");
  const rawWorkspace = pickAlias("workspace", "Workspace", "inherit");
  if (
    [rawRole, rawTypeName, rawModel, rawWorkspace, rawDeliverable].some(
      value => typeof value !== "string" || !value.trim() || CONTROL_CHAR_RE.test(value)
    ) ||
    (instructions !== undefined && typeof instructions !== "string")
  ) {
    throw new Error(`Agent '${safeRole}' has invalid brief or payload fields.`);
  }
  const objective = pickAlias("objective", "Objective", undefined);
  if (typeof objective !== "string" || !objective.trim()) {
    throw new Error(`Agent '${role || "unnamed"}' requires an objective.`);
  }
  const scope = validateScopeFiles(pickAlias("scopeFiles", "ScopeFiles", undefined), safeRole);

  const artifact = reportPath(squadId, specialistNumber, reportRoot);
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

  const alignmentLine = isIntegrityAuditor
    ? `Integrity Auditor: ${NATIVE_READ_TOOLS}; no raw .system_generated/ copies. Batch-check traces (${TRANSCRIPT_FORENSICS}${isSwarm ? "; read_board/status verify handoffs/roster only; re-execution cannot satisfy CLEAN" : ""}). Fail closed: 'Integrity Verdict: INTEGRITY VIOLATION' if traces missing/tampered; emit 'Target Squad: <id>', 'Evidence Digest: <sha256>', 'Integrity Verdict: CLEAN | INTEGRITY VIOLATION'.`
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

  const reportPlacementLine =
    isSwarm && workspaceIsolation !== "inherit"
      ? `Write '${workspaceIsolation}' working copy slot (no overwrite); cite checks/file:line.`
      : "Write shared slot (no overwrite); cite checks/file:line.";

  const swarmRecipient =
    leadWorkerName && !isLead && !isIntegrityAuditor ? `@${leadWorkerName}` : "@coordinator";

  const boardScopeLine = isSwarm
    ? Array.isArray(boardSeqs) && boardSeqs.length > 0
      ? `Board scope: read_board{seqs: [${boardSeqs.join(", ")}]} only.`
      : boardSince !== undefined
        ? `Board scope: read_board{since: ${boardSince}} only.`
        : isIntegrityAuditor
          ? "Board scope: read_board{seqs: [<workerSeqs...>, <auditBriefSeq>]} only."
          : "Board scope: read_board{since: <cohortBaseSeq>} only."
    : null;

  const handoffInstructionLine = isSwarm
    ? `1 post_message <= ${messageLimit} UTF-8 bytes (${swarmRecipient}, sep —/--/-): READY ${artifact} — <concrete observation> | PARTIAL <slot> | NO_REPORT. Then swarm_wait.`
    : `1 send_message <= ${messageLimit} UTF-8 bytes (sep —/--/-): READY ${artifact} — <concrete observation> | PARTIAL <slot> | NO_REPORT.`;

  return {
    ...payload,
    Prompt: [
      `Role: ${role}`,
      `Objective: ${objective.trim()}`,
      "Work within these files or directories:",
      ...scope.map(file => `- ${file}`),
      ...(instructions ? [`Instructions: ${instructions}`] : []),
      `Deliverable: ${deliverable}`,
      `Report slot: ${artifact}`,
      reportPlacementLine,
      handoffInstructionLine,
      ...(boardScopeLine ? [boardScopeLine] : []),
      isLead ? leadBody : alignmentLine
    ].join("\n")
  };
}

export {
  AGENT_ALIAS_PAIRS,
  DISALLOWED_BUILTINS,
  SUBAGENT_MODEL_ALIASES,
  buildSubagentSpec,
  superviseCohort,
  superviseSwarmLayeredLead,
  validateScopeFiles
};
