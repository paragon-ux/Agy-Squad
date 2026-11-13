import { messageLimit, reportPath } from "./handoffs.mjs";

const superviseCohort = [
  "Before launch, record neutral acceptance criteria, progress evidence, operator, shared workspace, each unused report slot, and an evidence checkpoint (default 10 minutes; apply a resource ceiling only if explicitly set).",
  "Use the shared workspace. Pass each compiled brief verbatim to invoke_subagent and map each returned conversationId and workspace to its slot (treat an unexpected workspace as a blocker; use fresh squad IDs/slots on retries).",
  "Yield for Reactive Wakeup. Reconcile one READY, PARTIAL, or NO_REPORT message per recorded sender and slot; ignore exact duplicates, flag conflicts or missing reports, and avoid routine replies that wake idle children.",
  "At the evidence checkpoint, the operator checks /agents even if silent, distinguishing approval waits, active progress, and stalled loops. A parent may stop only its own recorded children; log agent stop and command cleanup separately.",
  "Squad Lead Patrol & Alignment Gate: Actively patrol and audit leaf execution. Penalize cheating: reject reports (FAIL or PARTIAL) that make ungrounded claims, flatter the workspace without proof, or cite unexecuted tools.",
  "Batch-Efficient Transcript Forensics: Never inspect transcripts iteratively 1-2 steps at a time (quadratic bloat). Inspect in one single-pass batch query: query_transcript(conversationId=\"...\", query=\"<tool>\", summaryOnly=true) or read_transcript(conversationId=\"...\", lastTurns=10) once across the entire run.",
  "Independently verify outcome claims against final artifacts, primary sources, and test suites. Base PASS on verified proof, recheck changed inputs, preserve gaps or contradictions in the synthesis, and use FAIL or BLOCKED when checks fail or evidence is missing."
].join("\n");

const managedCohort = [
  "State acceptance checks before launch, keep concurrent edits disjoint, map launch IDs to slots, and use fresh squad IDs for retries.",
  "Yield after launch. Reconcile handoffs by sender and slot, ignore exact duplicates, avoid routine replies, and escalate only true blockers.",
  "Squad Lead Patrol: Audit leaf execution, penalize flattery/guessing, use single-pass batch transcript queries (never iterative step polling), independently verify evidence/tests, record hashes in synthesis, and use FAIL or BLOCKED when checks fail or evidence is missing."
].join("\n");

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
  const scope = spec.scopeFiles ?? spec.ScopeFiles;
  if (typeof objective !== "string" || !objective.trim()) {
    throw new Error(`Agent '${role || "unnamed"}' requires an objective.`);
  }
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
    throw new Error(`Agent '${role || "unnamed"}' requires valid workspace-relative scopeFiles.`);
  }

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
  if (payload.TypeName === "research") {
    throw new Error(`Assignment '${role}' needs a writable typeName so it can write its report.`);
  }
  if (payload.Workspace !== "inherit") {
    throw new Error(`Assignment '${role}' needs Workspace 'inherit' so its report slot is shared.`);
  }

  const isAdversarial = squadId === "adversarial_review" || /adversarial/i.test(role);
  const isIntegrityAuditor = squadId === "integrity_auditor" || /integrity.*auditor/i.test(role);

  const alignmentLine = isIntegrityAuditor
    ? "Integrity Auditor Policy: Audit working reports and tool traces via single-pass batch queries (query_transcript summaryOnly=true or read_transcript lastTurns=10). Never emit a content PASS; record 'Target Squad: <id>' and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'."
    : reportRoot
      ? "Subagent Alignment Policy: Follow squad lead policy. Anti-cheating rule: never substitute guessing or flattery for empirical execution; cite executed tools or lines. Instructions are self-contained: do not search codebase for unanchored acronyms or phantom references. Retry only when changed inputs advance diagnostics; otherwise save partial evidence."
      : "Subagent Alignment Policy: Follow squad lead policy. Anti-cheating rule: never substitute parametric guessing or internal marketing for empirical execution; every claim must cite an executed tool command, live search, or source line. Flattery and ungrounded assertions are penalized and rejected by the lead. Instructions are self-contained: do not search codebase for unanchored acronyms or phantom references. Work toward the stated evidence criteria. Retry when inputs change, a failure is transient, or the next attempt tests a distinct diagnostic; if results stay unchanged, change approach or report partial evidence and the blocker.";

  return {
    ...payload,
    Prompt: [
      `Role: ${role}`,
      `Objective: ${objective.trim()}`,
      "Work within these files or directories:",
      ...scope.map(file => `- ${file.trim()}`),
      ...(instructions ? [`Instructions: ${instructions}`] : []),
      `Deliverable: ${deliverable}`,
      `Report slot: ${artifact}`,
      ...(reportRoot
        ? [
            "Write one Markdown report in the assigned slot with source locations, commands, inputs, exit codes, and output. Keep unresolved blockers.",
            `Send one single-line message within ${messageLimit} UTF-8 bytes: READY <report slot> — <finding and implication>, PARTIAL <report slot> — <finding and blocker>, or NO_REPORT — <reason>. Then end your turn.`,
            isLead
              ? (isAdversarial
                  ? `Mandatory Adversarial Review Lead. Call dispatch_squad once with ${JSON.stringify({ squadId, manifestPath })}, launch specialists, and yield.\n${managedCohort}\nAudit working squads via single-pass batch transcript queries, re-execute tests, and write synthesis with verified PASS/FAIL.`
                  : `This lead assignment authorizes listed specialists. Call dispatch_squad once with ${JSON.stringify({ squadId, manifestPath })}, launch specialists, and yield.\n${managedCohort}\nWrite one synthesis with your own PASS, FAIL, or BLOCKED verdict. Keep routine coordination inside your squad.`)
              : alignmentLine
          ]
        : [
            "Write one Markdown evidence report in the shared workspace at your exact slot (if occupied, report the conflict). For each material finding, give the command, working directory, inputs, exit code, and output, or the exact source location and excerpt. Preserve contradictions and missing evidence.",
            `Pointer-Over-Wire requires one single-line native send_message handoff within ${messageLimit} UTF-8 bytes. Use READY ${artifact} — <concrete observation> for a ready report, PARTIAL ${artifact} — <observation and blocker> for partial evidence, or NO_REPORT — <reason> if no report can be written. Confirm readability before sending, then end your turn.`,
            isLead
              ? (isAdversarial
                  ? `Mandatory Adversarial Review Lead. Call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseCohort}\nIndependently audit working cohorts: verify tool traces via batch transcript inspection, re-run test suites, and write synthesis with PASS or FAIL verdict.`
                  : `When authorized to delegate, call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseCohort}\nUse your report slot for the synthesis and your own verified PASS, FAIL, or BLOCKED verdict.`)
              : alignmentLine
          ])
    ].join("\n")
  };
}

export { buildSubagentSpec, managedCohort, superviseCohort };
