import { messageLimit, reportPath } from "./handoffs.mjs";

const DISALLOWED_BUILTINS = new Set(["research", "browser", "image-generator"]);

const superviseCohort = [
  "Before launch, record neutral acceptance criteria, progress evidence, operator, shared workspace, each unused report slot, and an evidence checkpoint (default 10 minutes; apply a resource ceiling only if explicitly set).",
  "Use the shared workspace. Pass each compiled brief verbatim and map each returned worker or conversationId and workspace to its slot (treat an unexpected workspace as a blocker; use fresh squad IDs/slots on retries).",
  "Yield for Reactive Wakeup. Reconcile one READY, PARTIAL, or NO_REPORT message per recorded sender and slot; ignore exact duplicates, flag conflicts or missing reports, and avoid routine replies that wake idle children.",
  "At the evidence checkpoint, the operator checks /agents even if silent, distinguishing approval waits, active progress, and stalled loops. A parent may stop only its own recorded children; log agent stop and command cleanup separately.",
  "Squad Lead Patrol & Alignment Gate: Actively patrol and audit leaf execution. Penalize cheating: reject reports (FAIL or PARTIAL) that make ungrounded claims, flatter the workspace without proof, or cite unexecuted tools.",
  "Batch-Efficient Transcript Forensics: Never inspect transcripts iteratively 1-2 steps at a time (quadratic bloat). Inspect in one single-pass batch query: query_transcript(conversationId=\"...\", query=\"<tool>\", summaryOnly=true) or read_transcript(conversationId=\"...\", lastTurns=10) once across the entire run.",
  "Independently verify outcome claims against final artifacts, primary sources, and test suites. Base PASS on verified proof, recheck changed inputs, preserve gaps or contradictions in the synthesis, and use FAIL or BLOCKED when checks fail or evidence is missing."
].join("\n");

const superviseIntegrityCohort = [
  "Before launch, record neutral audit criteria, target squad, operator, shared workspace, and each unused report slot. Do not copy raw .system_generated/ transcripts into workspace files.",
  "Pass each compiled brief verbatim, map each returned worker or conversationId to its slot, yield for Reactive Wakeup, and reconcile one READY, PARTIAL, or NO_REPORT message per slot.",
  "Audit Execution Forensics: Inspect execution via swarm board/status or single-pass batch queries (query_transcript(..., summaryOnly=true) / read_transcript(..., lastTurns=10)); never inspect transcripts iteratively 1-2 steps at a time.",
  "Independently check evidence integrity against workspace artifacts and source hashes, recheck changed inputs, preserve contradictions, and never emit a content PASS: record 'Target Squad: <id>' and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
].join("\n");

/** Validate that every scopeFiles entry is a clean workspace-relative path (or "."). */
function validateScopeFiles(scope, agentLabel) {
  if (
    !Array.isArray(scope) ||
    !scope.length ||
    scope.some(file => {
      if (typeof file !== "string") return true;
      const trimmed = file.trim();
      if (!trimmed || /[\r\n]/.test(trimmed)) return true;
      if (trimmed.startsWith("/") || trimmed.includes("\\") || /^[a-zA-Z]:/.test(trimmed)) return true;
      return trimmed !== "." && trimmed.split("/").some(part => !part || part === "." || part === "..");
    })
  ) {
    throw new Error(`Agent '${agentLabel || "unnamed"}' requires valid workspace-relative scopeFiles.`);
  }
  return scope.map(file => file.trim());
}

/** Compile one squad lead or specialist manifest entry into a native subagent payload. */
function buildSubagentSpec(spec, squadId, manifestPath, specialistNumber, reportRoot) {
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
  const payload = {
    TypeName: rawTypeName.trim(),
    Role: role,
    Model: rawModel.trim(),
    Workspace: rawWorkspace.trim()
  };
  if (DISALLOWED_BUILTINS.has(payload.TypeName)) {
    throw new Error(`Assignment '${role}' needs a writable typeName (disallowed built-in '${payload.TypeName}'); use 'self' or a custom subagent.`);
  }
  if (payload.Workspace !== "inherit") {
    throw new Error(`Assignment '${role}' needs Workspace 'inherit' so its report slot is shared.`);
  }

  const isAdversarial = squadId === "adversarial_review" || /adversarial/i.test(role);
  const isIntegrityAuditor =
    squadId === "integrity_auditor" ||
    squadId.startsWith("integrity_auditor-") ||
    /integrity.*auditor/i.test(role);

  const alignmentLine = isIntegrityAuditor
    ? "Integrity Auditor Policy: Audit working reports and execution traces via single-pass batch queries (query_transcript summaryOnly=true or read_transcript lastTurns=10, or swarm board/status). Never copy raw .system_generated/ transcripts into scratch files. Never emit a content PASS; record 'Target Squad: <id>' and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
    : "Subagent Alignment Policy: Follow squad lead policy. Anti-cheating rule: never substitute parametric guessing or internal marketing for empirical execution; every claim must cite an executed tool command, live search, or source line. Flattery and ungrounded assertions are penalized and rejected by the lead. Instructions are self-contained: do not search codebase for unanchored acronyms or phantom references. Work toward the stated evidence criteria. Retry when inputs change, a failure is transient, or the next attempt tests a distinct diagnostic; if results stay unchanged, change approach or report partial evidence and the blocker.";

  const leadBody = isIntegrityAuditor
    ? `Independent Integrity Auditor Lead. Call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseIntegrityCohort}`
    : isAdversarial
      ? `Mandatory Adversarial Review Lead. Call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseCohort}\nIndependently audit working cohorts: verify tool traces via batch transcript inspection, re-run test suites, and write synthesis with PASS or FAIL verdict.`
      : `When authorized to delegate, call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseCohort}\nUse your report slot for the synthesis and your own verified PASS, FAIL, or BLOCKED verdict.`;

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
      "Write one Markdown evidence report in the shared workspace at your exact slot (if occupied, report the conflict). For each material finding, give the command, working directory, inputs, exit code, and output, or the exact source location and excerpt. Preserve contradictions and missing evidence.",
      `Pointer-Over-Wire requires one single-line native send_message handoff within ${messageLimit} UTF-8 bytes. Use READY ${artifact} — <concrete observation> for a ready report, PARTIAL ${artifact} — <observation and blocker> for partial evidence, or NO_REPORT — <reason> if no report can be written. Confirm readability before sending, then end your turn.`,
      isLead ? leadBody : alignmentLine
    ].join("\n")
  };
}

export { DISALLOWED_BUILTINS, buildSubagentSpec, superviseCohort, superviseIntegrityCohort, validateScopeFiles };
