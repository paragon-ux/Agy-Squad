import util from "node:util";
import { messageLimit, reportPath } from "./handoffs.mjs";

const DISALLOWED_BUILTINS = new Set(["research", "browser", "image-generator"]);
const SUBAGENT_MODEL_ALIASES = new Set(["inherit", "flash_lite", "flash", "pro"]);
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f\u2028\u2029]/;

const superviseCohort = [
  "Before launch: record acceptance criteria, evidence, operator, shared workspace, unused slots, and checkpoint (default 10m). Use the shared workspace; map returned conversationId+workspace to each slot (unexpected workspace = blocker; new slots on retry).",
  "Yield via Reactive Wakeup; reconcile one READY/PARTIAL/NO_REPORT per slot (ignore exact dupes, flag conflicts/gaps, avoid idle wakeups). At checkpoint operator checks /agents (log stop vs cleanup; stop own children only).",
  "Squad Lead Patrol & Alignment Gate: audit leaf runs and reject ungrounded/flattering/unexecuted claims (FAIL/PARTIAL).",
  "Batch transcript forensics (never 1-2 step loops): inspect child ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (and transcript_full.jsonl when needed) in one pass via recorded conversationIds when standalone, or use single-pass 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', or 'read --id <id> --last-turns 10' when agy-context is installed.",
  "Verify claims against final artifacts/tests via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files). Base PASS on verified proof, recheck changed inputs, preserve gaps, use FAIL/BLOCKED when checks fail or evidence is missing."
].join("\n");

const superviseIntegrityCohort = [
  "Before launch: record audit criteria, target squad, operator, shared workspace, and unused slots. Never copy raw .system_generated/ transcripts into workspace/scratch files. Pass brief verbatim, map conversationId->slot, yield via Reactive Wakeup, reconcile one handoff/slot.",
  "Audit Execution Forensics in one batch pass (never 1-2 step loops): inspect child ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (and transcript_full.jsonl when needed) via recorded conversationIds when standalone, or use single-pass 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', 'read --id <id> --last-turns 10' when agy-context is installed.",
  "Verify artifacts/hashes via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files); recheck changed inputs, preserve contradictions, never emit a content PASS: record 'Target Squad: <id>' and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
].join("\n");

const superviseSwarmCohort = [
  "Before launch: record criteria, coordinator, workspace mode, unused slots, checkpoint (default 10m), and swarm{action:\"status\"} head as cohortBaseSeq. Match briefs, map worker names->slots, and record swarm add note seqs (#N).",
  "Park via swarm_wait. Reconcile one READY/PARTIAL/NO_REPORT post per slot via read_board{since: <cohortBaseSeq>} or read_board{seqs: [...]} (never unfiltered read_board(), since: 0, or limit: 50); avoid idle chatter.",
  "At checkpoint inspect read_board{since: <cohortBaseSeq>} & swarm{action:\"status\"}; kill finished workers only after collecting isolated copies. Squad Lead Patrol & Alignment Gate: reject ungrounded/unexecuted leaf claims.",
  "Execution Forensics: read_board{since|seqs} / swarm status, plus single-pass batch inspection of child ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (matching Step 0/1 sender=<coordId> + @<workerName>, plus transcript_full.jsonl when needed) when standalone, or 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', 'read --id <id> --last-turns 10' when agy-context is installed. Verify artifacts/tests via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files); base PASS on verified proof, recheck changed inputs, preserve gaps, use FAIL/BLOCKED on missing/failing checks."
].join("\n");

const superviseSwarmLayeredLead = [
  "Park via swarm_wait and follow Board scope above (never unfiltered read_board(), since: 0, or limit: 50). Reconcile one READY/PARTIAL/NO_REPORT post per specialist slot; avoid idle chatter.",
  "Squad Lead Patrol & Alignment Gate: inspect swarm{action:\"status\"} and specialist reports; reject ungrounded/unexecuted leaf claims.",
  "Execution Forensics: read_board{since|seqs} / swarm status, plus single-pass batch inspection of child ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (matching Step 0/1 sender=<coordId> + @<workerName>, plus transcript_full.jsonl when needed) when standalone, or 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', 'read --id <id> --last-turns 10' when agy-context is installed. Verify artifacts/tests via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files); base PASS on verified proof, recheck changed inputs, preserve gaps, use FAIL/BLOCKED on missing/failing checks."
].join("\n");

const superviseSwarmIntegrityCohort = [
  "Before launch: record audit criteria, target squad, coordinator, workspace mode, unused slots, and worker/lead board seqs (#N). Never copy raw .system_generated/ transcripts into workspace/scratch files.",
  "Map worker names->slots; use read_board{seqs: [<workerSeqs...>, <auditBriefSeq>]} (never unfiltered read_board()) and swarm_wait; reconcile one post/slot.",
  "Audit Execution Forensics: read_board/status verify handoffs/roster/models only. Before CLEAN, verify child traces via single-pass batch inspection of ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (matching Step 0/1 sender=<coordId> + @<workerName>, plus transcript_full.jsonl when needed) when standalone, or via 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', 'read --id <id> --last-turns 10', or coordinator 'export --parent <id> --sanitized --out scratch/...' when agy-context is installed (re-execution alone cannot satisfy CLEAN); fail closed with 'Integrity Verdict: INTEGRITY VIOLATION' if traces are unavailable via the active path or tampering is found.",
  "Verify artifacts/hashes via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files); recheck changed inputs, preserve contradictions, never emit a content PASS: record 'Target Squad: <id>', 'Evidence Digest: <sha256>', and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
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
    includeTranscriptAccessDirectives = false,
    transcriptAccessDirective,
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
  for (const [lower, upper] of [
    ["role", "Role"],
    ["objective", "Objective"],
    ["scopeFiles", "ScopeFiles"],
    ["instructions", "Instructions"],
    ["expectedDeliverable", "ExpectedDeliverable"],
    ["typeName", "TypeName"],
    ["model", "Model"],
    ["workspace", "Workspace"]
  ]) {
    if (spec[lower] !== undefined && spec[upper] !== undefined && !util.isDeepStrictEqual(spec[lower], spec[upper])) {
      throw new Error(`Agent '${role || "unnamed"}' has conflicting ${lower} and ${upper} fields.`);
    }
  }
  const safeRole = role.replace(/[\x00-\x1f\x7f\u2028\u2029]+/g, " ").trim() || "unnamed";
  const instructions = pickAlias("instructions", "Instructions", undefined);
  const rawDeliverable =
    pickAlias("expectedDeliverable", "ExpectedDeliverable", "Factual findings with file and line references.");
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
    ? isSwarm
      ? "Integrity Auditor Policy: read_board/status verify handoffs & roster only; inspect workspace files via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files), never copying raw .system_generated/ transcripts into workspace/scratch files. Before CLEAN, verify child traces via single-pass batch inspection of ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (matching Step 0/1 sender=<coordId> + @<workerName>, plus transcript_full.jsonl when needed) when standalone, or via 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', 'read --id <id> --last-turns 10', or a coordinator-extracted sanitized transcript index in scratch/ ('export --parent <id> --sanitized --out scratch/...') when agy-context is installed (re-execution alone cannot satisfy CLEAN; report 'Integrity Verdict: INTEGRITY VIOLATION' if traces are unavailable via the active path, or report 'Integrity Verdict: INTEGRITY VIOLATION' (never CLEAN) on tampering). Record 'Target Squad: <id>', 'Evidence Digest: <sha256>', and 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
      : "Integrity Auditor Policy: Audit child traces in one batch pass via ~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl (and transcript_full.jsonl when needed, using recorded conversationIds) when standalone, or via 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', 'read --id <id> --last-turns 10' when agy-context is installed, and verify artifacts/hashes via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files), never copying raw .system_generated/ transcripts into workspace/scratch files. Never emit a content PASS; record 'Target Squad: <id>', 'Evidence Digest: <sha256>', and 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
    : `${isSwarm ? "Worker Alignment Policy: Follow squad lead/coordinator policy." : "Subagent Alignment Policy: Follow squad lead policy."} Anti-cheating rule: cite executed commands/searches or source lines, never guesses or unverified flattery. Inspect workspace files via native search/read tools (grep_search/find_by_name + bounded read_file slices on large files). Stay self-contained (don't probe phantom acronyms). Retry when inputs change, failures are transient, or diagnostics differ; otherwise switch approach or report partial+blocker.`;

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

  const integritySupervision = isSwarm ? superviseSwarmIntegrityCohort : superviseIntegrityCohort;
  const workingSupervision = isSwarm
    ? boardSince === 0 && !(Array.isArray(boardSeqs) && boardSeqs.length > 0)
      ? superviseSwarmLayeredLead.replace(", since: 0, or ", " or ")
      : superviseSwarmLayeredLead
    : superviseCohort;
  const leadIntro = isSwarm
    ? "Coordinate the planned /swarm specialists on the board."
    : precompiledSpecialists
      ? "Coordinate the pre-compiled specialists from squad_planner (launch their compiled workers[].specialists[].Subagent payloads verbatim without re-calling dispatch_squad so planner model and reportRoot overrides remain intact)."
      : dispatchCall
        ? `When authorized to delegate, ${dispatchCall[0].toLowerCase()}${dispatchCall.slice(1)}`
        : "Coordinate the pre-compiled specialists for this squad.";

  const leadBody = isIntegrityAuditor
    ? `Independent Integrity Auditor Lead.${dispatchCall ? ` ${dispatchCall}` : ""}\n${integritySupervision}`
    : `${leadIntro}\n${workingSupervision}\nUse your report slot for the synthesis and your own verified PASS, FAIL, or BLOCKED verdict.`;

  const reportPlacementLine =
    isSwarm && workspaceIsolation !== "inherit"
      ? "Write one Markdown report in your '${workspaceIsolation}' working copy at your exact slot (conflict = error). Cite command/cwd/inputs/exit/output or file:line excerpt per finding; keep contradictions & gaps.".replace("${workspaceIsolation}", workspaceIsolation)
      : "Write one Markdown report at your shared slot (conflict = error). Cite command/cwd/inputs/exit/output or file:line excerpt per finding; keep contradictions & gaps.";

  const swarmRecipient =
    leadWorkerName && !isLead && !isIntegrityAuditor ? `@${leadWorkerName}` : "@coordinator";

  const boardScopeLine = isSwarm
    ? Array.isArray(boardSeqs) && boardSeqs.length > 0
      ? `Board scope: read_board{seqs: [${boardSeqs.join(", ")}]} only (no unfiltered/since:0/limit:50).`
      : boardSince !== undefined
        ? boardSince === 0
          ? "Board scope: read_board{since: 0} only (no unfiltered read_board() or limit:50)."
          : `Board scope: read_board{since: ${boardSince}} only (no unfiltered/since:0/limit:50).`
        : isIntegrityAuditor
          ? "Board scope: read_board{seqs: [<workerSeqs...>, <auditBriefSeq>]} only (no unfiltered/since:0/limit:50)."
          : "Board scope: read_board{since: <cohortBaseSeq>} only (no unfiltered/since:0/limit:50)."
    : null;

  const handoffInstructionLine = isSwarm
    ? `Pointer-Over-Wire: one post_message line <= ${messageLimit} UTF-8 bytes (prefix ${swarmRecipient} on /swarm): READY ${artifact} — <concrete observation>, PARTIAL <slot> — <blocker>, or NO_REPORT — <reason>. Confirm readability, then wait via swarm_wait or end turn.`
    : `Pointer-Over-Wire: one native send_message line <= ${messageLimit} UTF-8 bytes: READY ${artifact} — <concrete observation>, PARTIAL <slot> — <blocker>, or NO_REPORT — <reason>. Confirm readability, then end turn.`;

  let resolvedTranscriptDirective = null;
  if (transcriptAccessDirective !== undefined && transcriptAccessDirective !== false && transcriptAccessDirective !== null) {
    if (transcriptAccessDirective === "allow" || transcriptAccessDirective === "deny") {
      resolvedTranscriptDirective = `[agy-transcript-access: ${transcriptAccessDirective}]`;
    } else {
      throw new Error(`Unsupported transcriptAccessDirective '${transcriptAccessDirective}'; expected 'allow' or 'deny'.`);
    }
  } else if (includeTranscriptAccessDirectives === true) {
    resolvedTranscriptDirective =
      isIntegrityAuditor || isLead
        ? "[agy-transcript-access: allow]"
        : "[agy-transcript-access: deny]";
  } else if (includeTranscriptAccessDirectives !== false) {
    throw new Error("includeTranscriptAccessDirectives must be a boolean.");
  }

  return {
    ...payload,
    Prompt: [
      ...(resolvedTranscriptDirective ? [resolvedTranscriptDirective] : []),
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
  DISALLOWED_BUILTINS,
  SUBAGENT_MODEL_ALIASES,
  buildSubagentSpec,
  superviseCohort,
  superviseIntegrityCohort,
  superviseSwarmCohort,
  superviseSwarmIntegrityCohort,
  superviseSwarmLayeredLead,
  validateScopeFiles
};
