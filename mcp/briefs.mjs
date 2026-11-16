import { messageLimit, reportPath } from "./handoffs.mjs";

const DISALLOWED_BUILTINS = new Set(["research", "browser", "image-generator"]);
const SUBAGENT_MODEL_ALIASES = new Set(["inherit", "flash_lite", "flash", "pro"]);

const superviseCohort = [
  "Before launch, record neutral acceptance criteria, progress evidence, operator, shared workspace, each unused report slot, and an evidence checkpoint (default 10 minutes; apply a resource ceiling only if explicitly set).",
  "Use the shared workspace. Pass each compiled brief verbatim and map each returned worker or conversationId and workspace to its slot (treat an unexpected workspace as a blocker; use fresh squad IDs/slots on retries).",
  "Yield for Reactive Wakeup. Reconcile one READY, PARTIAL, or NO_REPORT message per recorded sender and slot; ignore exact duplicates, flag conflicts or missing reports, and avoid routine replies that wake idle children.",
  "At the evidence checkpoint, the operator checks /agents even if silent, distinguishing approval waits, active progress, and stalled loops. A parent may stop only its own recorded children; log agent stop and command cleanup separately.",
  "Squad Lead Patrol & Alignment Gate: Actively patrol and audit leaf execution. Penalize cheating: reject reports (FAIL or PARTIAL) that make ungrounded claims, flatter the workspace without proof, or cite unexecuted tools.",
  "Batch-Efficient Transcript Forensics: Never inspect transcripts iteratively 1-2 steps at a time (quadratic bloat). Inspect in one single-pass batch query: 'agy-context transcript list --parent <id> --lineage', 'agy-context transcript query --id <id> --summary', or 'agy-context transcript read --id <id> --last-turns 10' once across the entire run.",
  "Independently verify outcome claims against final artifacts, primary sources, and test suites. Inspect workspace files via 'rtk read'/'rtk grep' or bounded <=150-line read_file slices (StartLine/EndLine). Base PASS on verified proof, recheck changed inputs, preserve gaps or contradictions in the synthesis, and use FAIL or BLOCKED when checks fail or evidence is missing."
].join("\n");

const superviseIntegrityCohort = [
  "Before launch, record neutral audit criteria, target squad, operator, shared workspace, and each unused report slot. Do not copy raw .system_generated/ transcripts into workspace files.",
  "Pass each compiled brief verbatim, map each returned worker or conversationId to its slot, yield via Reactive Wakeup, and reconcile one READY, PARTIAL, or NO_REPORT message per slot.",
  "Audit Execution Forensics: Inspect execution via single-pass batch queries ('agy-context transcript list --parent <id> --lineage', 'agy-context transcript query --id <id> --summary', 'agy-context transcript read --id <id> --last-turns 10'); never inspect transcripts iteratively 1-2 steps at a time.",
  "Independently check evidence integrity against workspace artifacts and source hashes (using 'rtk read'/'rtk grep' or bounded <=150-line read_file slices with StartLine/EndLine, never unbounded read_file), recheck changed inputs, preserve contradictions, and never emit a content PASS: record 'Target Squad: <id>' and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
].join("\n");

const superviseSwarmCohort = [
  "Before launch, record neutral acceptance criteria, progress evidence, coordinator, workspace isolation mode (inherit, share, or branch), each unused report slot, and an evidence checkpoint (default 10 minutes; apply a resource ceiling only if explicitly set).",
  "Confirm worker briefs match the plan and map each spawned /swarm member name to its report slot (use fresh squad IDs/slots on retries).",
  "Park via swarm_wait. Reconcile one READY, PARTIAL, or NO_REPORT board post (via read_board) per recorded member name and slot; ignore exact duplicates, flag conflicts or missing reports, and avoid routine board chatter that wakes waiting workers.",
  "At the evidence checkpoint, inspect the board and swarm{action:\"status\"} (or monitor reports), distinguishing approval waits, active progress, and stalled loops. Retire finished workers with swarm{action:\"kill\"} only after collecting isolated copies and verify cleanup separately.",
  "Squad Lead Patrol & Alignment Gate: Actively patrol and audit leaf execution. Penalize cheating: reject reports (FAIL or PARTIAL) that make ungrounded claims, flatter the workspace without proof, or cite unexecuted tools.",
  "Execution Forensics: Inspect execution via read_board / swarm{action:\"status\"}, or in one single-pass batch query via 'agy-context transcript list --parent <id> --lineage', 'agy-context transcript query --id <id> --summary', or 'agy-context transcript read --id <id> --last-turns 10'; never iterate 1-2 steps at a time.",
  "Independently verify outcome claims against final artifacts, primary sources, and test suites. Inspect workspace files via 'rtk read'/'rtk grep' or bounded <=150-line read_file slices (StartLine/EndLine). Base PASS on verified proof, recheck changed inputs, preserve gaps or contradictions in the synthesis, and use FAIL or BLOCKED when checks fail or evidence is missing."
].join("\n");

const superviseSwarmIntegrityCohort = [
  "Before launch, record neutral audit criteria, target squad, coordinator, workspace mode, and each unused report slot. Do not copy raw .system_generated/ transcripts into workspace files.",
  "Map each spawned worker name to its slot, use read_board and swarm_wait for Reactive Wakeup, and reconcile one READY, PARTIAL, or NO_REPORT board post per slot.",
  "Audit Execution Forensics: read_board and swarm{action:\"status\"} verify handoffs, roster, and model state only. Before CLEAN, verify worker execution traces via 'agy-context transcript list --parent <id> --lineage', 'agy-context transcript query --id <id> --summary', or 'agy-context transcript read --id <id> --last-turns 10', or via a coordinator-extracted sanitized transcript index in scratch/ ('agy-context transcript export --parent <id> --sanitized --out scratch/...'; never rely on workspace re-execution alone); never iterate 1-2 turns at a time.",
  "Independently check evidence integrity against workspace artifacts and source hashes (using 'rtk read'/'rtk grep' or bounded <=150-line read_file slices with StartLine/EndLine, never unbounded read_file), recheck changed inputs, preserve contradictions, and never emit a content PASS: record 'Target Squad: <id>', 'Evidence Digest: <sha256>', and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
].join("\n");

/** Validate that every scopeFiles entry is a clean workspace-relative path (or "."). */
function validateScopeFiles(scope, agentLabel) {
  if (
    !Array.isArray(scope) ||
    !scope.length ||
    scope.some(file => {
      if (typeof file !== "string") return true;
      const trimmed = file.trim();
      if (!trimmed || /[\x00-\x1f\x7f\u2028\u2029]/.test(trimmed)) return true;
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
    workspace: delegateWorkspace
  } = options;
  if (executionMode !== "subagent" && executionMode !== "swarm") {
    throw new Error(`Unsupported executionMode '${executionMode}'.`);
  }
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error(`Invalid agent in squad '${squadId}'.`);
  }
  const isLead = specialistNumber === undefined;
  const rawRole = spec.role ?? spec.Role ?? (isLead ? "Squad Lead" : "Specialist");
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
    if (spec[lower] !== undefined && spec[upper] !== undefined && spec[lower] !== spec[upper]) {
      throw new Error(`Agent '${role || "unnamed"}' has conflicting ${lower} and ${upper} fields.`);
    }
  }
  const objective = spec.objective ?? spec.Objective;
  if (typeof objective !== "string" || !objective.trim()) {
    throw new Error(`Agent '${role || "unnamed"}' requires an objective.`);
  }
  const scope = validateScopeFiles(spec.scopeFiles ?? spec.ScopeFiles, role);

  const artifact = reportPath(squadId, specialistNumber, reportRoot);
  const instructions = spec.instructions ?? spec.Instructions;
  const rawDeliverable =
    spec.expectedDeliverable ?? spec.ExpectedDeliverable ?? "Factual findings with file and line references.";
  const deliverable = typeof rawDeliverable === "string" ? rawDeliverable.trim() : "";
  const rawTypeName = spec.typeName ?? spec.TypeName ?? "self";
  const rawModel = spec.model ?? spec.Model ?? "inherit";
  const rawWorkspace = spec.workspace ?? spec.Workspace ?? "inherit";
  if (
    [rawRole, rawTypeName, rawModel, rawWorkspace, rawDeliverable].some(
      value => typeof value !== "string" || !value.trim()
    ) ||
    (instructions !== undefined && typeof instructions !== "string")
  ) {
    throw new Error(`Agent '${role || "unnamed"}' has invalid brief or payload fields.`);
  }
  const trimmedModel = rawModel.trim();
  const payload = {
    TypeName: rawTypeName.trim(),
    Role: role,
    Model: executionMode === "subagent" && !SUBAGENT_MODEL_ALIASES.has(trimmedModel) ? "inherit" : trimmedModel,
    Workspace: rawWorkspace.trim()
  };
  if (DISALLOWED_BUILTINS.has(payload.TypeName)) {
    throw new Error(`Assignment '${role}' needs a writable typeName (disallowed built-in '${payload.TypeName}'); use 'self' or a custom subagent.`);
  }
  if (payload.Workspace !== "inherit") {
    throw new Error(`Assignment '${role}' needs Workspace 'inherit' so its report slot is shared.`);
  }

  const isIntegrityAuditor =
    typeof explicitIntegrityAuditor === "boolean"
      ? explicitIntegrityAuditor
      : squadId === "integrity_auditor" || squadId.startsWith("integrity_auditor-");
  const isSwarm = executionMode === "swarm";

  const alignmentLine = isIntegrityAuditor
    ? isSwarm
      ? "Integrity Auditor Policy: read_board and swarm{action:\"status\"} verify handoffs, roster, and model state only. Inspect files/reports via bounded <=150-line read_file slices (StartLine/EndLine) or 'rtk read'/'rtk grep', never unbounded read_file. Before CLEAN, audit worker traces via 'agy-context transcript list --parent <id> --lineage', 'query --id <id> --summary', or 'read --id <id> --last-turns 10' when permitted, or require a coordinator-extracted sanitized transcript index in scratch/ ('export --parent <id> --sanitized --out scratch/...'); never copy raw .system_generated/ transcripts into scratch/. If neither transcript CLI queries nor a coordinator transcript index covers material claims (or on tampering), fail closed and report 'Integrity Verdict: INTEGRITY VIOLATION' (never CLEAN). Record 'Target Squad: <id>', 'Evidence Digest: <sha256>', and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
      : "Integrity Auditor Policy: Audit working reports and execution traces via single-pass batch queries ('agy-context transcript list --parent <id> --lineage', 'agy-context transcript query --id <id> --summary', 'agy-context transcript read --id <id> --last-turns 10') plus direct artifact/hash checks using bounded <=150-line read_file slices (StartLine/EndLine) or 'rtk read'/'rtk grep', never unbounded read_file. Never copy raw .system_generated/ transcripts into scratch files. Never emit a content PASS; record 'Target Squad: <id>', 'Evidence Digest: <sha256>', and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
    : `${isSwarm ? "Worker Alignment Policy: Follow squad lead/coordinator policy." : "Subagent Alignment Policy: Follow squad lead policy."} Anti-cheating rule: never substitute parametric guessing or internal marketing for empirical execution; every claim must cite an executed tool command, live search, or source line. Flattery and ungrounded assertions are penalized and rejected by the lead. Inspect files via 'rtk read'/'rtk grep' or bounded <=150-line read_file slices (StartLine/EndLine), never unbounded read_file. Instructions are self-contained: do not search codebase for unanchored acronyms or phantom references. Work toward the stated evidence criteria. Retry when inputs change, a failure is transient, or the next attempt tests a distinct diagnostic; if results stay unchanged, change approach or report partial evidence and the blocker.`;

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
  const workingSupervision = isSwarm ? superviseSwarmCohort : superviseCohort;
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
      ? `Write one Markdown evidence report in your '${workspaceIsolation}' working copy at your exact slot ${artifact} (if occupied, report the conflict). For each material finding, give the command, working directory, inputs, exit code, and output, or the exact source location and excerpt. Preserve contradictions and missing evidence.`
      : "Write one Markdown evidence report in the shared workspace at your exact slot (if occupied, report the conflict). For each material finding, give the command, working directory, inputs, exit code, and output, or the exact source location and excerpt. Preserve contradictions and missing evidence.";

  const handoffInstructionLine = isSwarm
    ? `Pointer-Over-Wire requires one single-line post_message board handoff within ${messageLimit} UTF-8 bytes. Use READY ${artifact} — <concrete observation> (prefix @coordinator or @<lead> on /swarm) for a ready report, PARTIAL ${artifact} — <observation and blocker> for partial evidence, or NO_REPORT — <reason> if no report can be written. Confirm readability before posting, then wait via swarm_wait or end your turn.`
    : `Pointer-Over-Wire requires one single-line native send_message handoff within ${messageLimit} UTF-8 bytes. Use READY ${artifact} — <concrete observation> for a ready report, PARTIAL ${artifact} — <observation and blocker> for partial evidence, or NO_REPORT — <reason> if no report can be written. Confirm readability before sending, then end your turn.`;

  const transcriptAccessDirective =
    isIntegrityAuditor || isLead
      ? "[agy-transcript-access: allow]"
      : "[agy-transcript-access: deny]";

  return {
    ...payload,
    Prompt: [
      transcriptAccessDirective,
      `Role: ${role}`,
      `Objective: ${objective.trim()}`,
      "Work within these files or directories:",
      ...scope.map(file => `- ${file}`),
      ...(instructions ? [`Instructions: ${instructions}`] : []),
      `Deliverable: ${deliverable}`,
      `Report slot: ${artifact}`,
      reportPlacementLine,
      handoffInstructionLine,
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
  validateScopeFiles
};
