import { messageLimit, reportPath } from "./handoffs.mjs";

const superviseCohort = [
  "Before launch, record neutral acceptance criteria, progress evidence, operator, shared workspace, each unused report slot, and an evidence checkpoint (default 10 minutes; apply a resource ceiling only if explicitly set).",
  "Use the shared workspace. Pass each compiled brief verbatim to invoke_subagent and map each returned conversationId and workspace to its slot (treat an unexpected workspace as a blocker; use fresh squad IDs/slots on retries).",
  "Yield for Reactive Wakeup. Reconcile one READY, PARTIAL, or NO_REPORT message per recorded sender and slot; ignore exact duplicates, flag conflicts or missing reports, and avoid routine replies that wake idle children.",
  "At the evidence checkpoint, the operator checks /agents even if silent, distinguishing approval waits, active progress, and stalled loops. A parent may stop only its own recorded children; log agent stop and command cleanup separately.",
  "When writers finish, independently verify outcome claims against final artifacts or primary sources, record versions/hashes, and recheck changed inputs. Base PASS on independent checks, keep conflicts in the synthesis, and use FAIL or BLOCKED when checks fail or evidence is missing."
].join("\n");

const managedCohort = [
  "State acceptance checks before launch, keep concurrent edits disjoint, map launch IDs to slots, and use fresh squad IDs for retries.",
  "Yield after launch. Reconcile handoffs by sender and slot, ignore exact duplicates, avoid routine replies, and escalate only true blockers.",
  "When writers finish, independently verify outcome evidence, record revisions/hashes, recheck changed inputs, and preserve gaps or contradictions in the synthesis."
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
            "Write one Markdown report in the assigned slot with source locations and excerpts, or commands, inputs, exit codes, and output. Keep unresolved blockers.",
            `Send one single-line message within ${messageLimit} UTF-8 bytes: READY <report slot> — <finding and implication>, PARTIAL <report slot> — <finding and blocker>, or NO_REPORT — <reason>. Then end your turn.`,
            isLead
              ? `This lead assignment authorizes the listed specialists. Call dispatch_squad once with ${JSON.stringify({ squadId, manifestPath })}, launch the returned specialists verbatim through the native tool, and yield.\n${managedCohort}\nWrite one synthesis with your own PASS, FAIL, or BLOCKED verdict. Keep routine coordination inside your squad.`
              : "Carry out your assignment directly. Retry when a changed input or a different diagnostic can advance the work; otherwise save partial evidence and hand it off."
          ]
        : [
            "Write one Markdown evidence report in the shared workspace at your exact slot (if occupied, report the conflict). For each material finding, give the command, working directory, inputs, exit code, and output, or the exact source location and excerpt. Preserve contradictions and missing evidence.",
            `Pointer-Over-Wire requires one single-line native send_message handoff within ${messageLimit} UTF-8 bytes. Use READY ${artifact} — <concrete observation> for a ready report, PARTIAL ${artifact} — <observation and blocker> for partial evidence, or NO_REPORT — <reason> if no report can be written. Confirm readability before sending, then end your turn.`,
            isLead
              ? `When authorized to delegate, call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseCohort}\nUse your report slot for the synthesis and your own verified PASS, FAIL, or BLOCKED verdict.`
              : "Work toward the stated evidence criteria. Retry when inputs change, a failure is transient, or the next attempt tests a distinct diagnostic; if results stay unchanged, change approach or report partial evidence and the blocker."
          ])
    ].join("\n")
  };
}

export { buildSubagentSpec, managedCohort, superviseCohort };
