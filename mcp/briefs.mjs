import { messageLimit, reportPath } from "./handoffs.mjs";

const superviseCohort = [
  "Before launch, record neutral acceptance criteria, what evidence would show useful progress, the operator, the shared workspace, each exact unused report slot, and an evidence checkpoint. Default to 10 minutes from cohort launch. Agree a longer interval for work that needs it. Apply a resource ceiling only if the operator explicitly sets one.",
  "Use the shared workspace for this workflow. Pass each compiled brief verbatim to one native invoke_subagent call. Record the native conversation ID and workspace from each launch receipt against the assigned slot. Treat an unexpected workspace as a blocker. Use a fresh squad ID and report slots for any retry.",
  "Yield for Reactive Wakeup after launching. On each wake, reconcile READY, PARTIAL, and NO_REPORT messages against the recorded sender and slot. Accept one handoff per assignment and ignore exact duplicates. Record conflicts, missing reports, and mismatched slots as unresolved. Avoid acknowledgment messages that wake idle children.",
  "At the evidence checkpoint, the operator checks /agents even if nobody has reported. Distinguish approval waits, progress on scoped work, and repeated work with unchanged results. The operator may extend useful work or stop the affected agents. An active parent may stop only its own recorded children. Record agent termination and any command cleanup separately.",
  "Once relevant writers and their commands finish or stop, independently check the claims that decide the outcome against the final artifacts or primary sources. Record the versions or hashes checked and recheck changed inputs. Base PASS on independent checks. Keep conflicting observations in the synthesis. Use FAIL when a required check fails and BLOCKED when required evidence or access is missing."
].join("\n");

const managedCohort = [
  "Before launch, state the acceptance checks and keep concurrent edits disjoint. Match native launch IDs to the assigned slots. Use fresh squad IDs for retries.",
  "Yield after launch. Reconcile handoffs by sender and slot, ignore exact duplicates, and avoid routine replies. If progress stops, distinguish approval waits from repeated work and escalate only what needs the operator.",
  "After relevant writers finish, independently verify the evidence that decides the outcome. Record what was checked and its revision or hashes. Recheck changed inputs and keep gaps or contradictory evidence in the synthesis."
].join("\n");

function buildSubagentSpec(spec, squadId, manifestPath, specialistNumber, reportRoot) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error(`Invalid agent in squad '${squadId}'.`);
  }
  const isLead = specialistNumber === undefined;
  const role = spec.role ?? spec.Role ?? (isLead ? "Squad Lead" : "Specialist");
  const objective = spec.objective ?? spec.Objective;
  const scope = spec.scopeFiles ?? spec.ScopeFiles;
  if (typeof objective !== "string" || !objective.trim()) {
    throw new Error(`Agent '${role}' requires an objective.`);
  }
  if (!Array.isArray(scope) || !scope.length || scope.some(file => typeof file !== "string" || !file.trim())) {
    throw new Error(`Agent '${role}' requires nonempty scopeFiles.`);
  }

  const artifact = reportPath(squadId, specialistNumber, reportRoot);
  const instructions = spec.instructions ?? spec.Instructions;
  const deliverable = spec.expectedDeliverable ?? spec.ExpectedDeliverable ?? "Factual findings with file and line references.";
  const payload = {
    TypeName: spec.typeName ?? spec.TypeName ?? (isLead || reportRoot ? "self" : "research"),
    Role: role,
    Model: spec.model ?? spec.Model ?? "inherit",
    Workspace: spec.workspace ?? spec.Workspace ?? "inherit"
  };
  if (Object.values(payload).some(value => typeof value !== "string" || !value.trim()) ||
      typeof deliverable !== "string" || (instructions !== undefined && typeof instructions !== "string")) {
    throw new Error(`Agent '${role}' has invalid brief or payload fields.`);
  }
  if (reportRoot && payload.Workspace !== "inherit") {
    throw new Error(`Managed assignment '${role}' needs Workspace 'inherit' so its report slot is shared.`);
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
      ...(reportRoot ? [
        "Write one Markdown report in the assigned slot. For each material observation include the source location and excerpt, or the command, inputs, exit code, and relevant output. Keep unresolved blockers.",
        `Send one single-line message within ${messageLimit} UTF-8 bytes. Use READY <report slot> — <finding and its implication>, PARTIAL <report slot> — <finding and blocker>, or NO_REPORT — <reason>. Then end your turn.`,
        isLead
          ? `This lead assignment authorizes the listed specialists. Call dispatch_squad once with ${JSON.stringify({ squadId, manifestPath })}, launch the returned specialists verbatim through the native tool, and yield.\n${managedCohort}\nWrite one synthesis with your own PASS, FAIL, or BLOCKED verdict. Keep routine coordination inside your squad.`
          : "Carry out your assignment directly. Retry when a changed input or a different diagnostic can advance the work. If no useful next step remains, save partial evidence and hand it off."
      ] : [
      "Write one Markdown evidence report in the shared workspace, using your exact slot. If the slot belongs to an earlier assignment, report the conflict and request a fresh assignment. For each material finding, give the actual observation with the command, working directory, relevant inputs, exit code, and relevant output, or the exact source location and observed excerpt. Preserve contradictory results and identify missing evidence.",
      `Pointer-Over-Wire requires one single-line native send_message handoff within ${messageLimit} UTF-8 bytes. Use READY ${artifact} — <concrete observation> for a report ready for review, PARTIAL ${artifact} — <observation and blocker> for partial evidence, or NO_REPORT — <reason> if no report can be written. Confirm the report is readable before sending its pointer. End the turn after sending.`,
      isLead
        ? `When authorized to delegate, call dispatch_squad with ${JSON.stringify({ squadId, manifestPath })}.\n${superviseCohort}\nUse your report slot for the synthesis and your own verified PASS, FAIL, or BLOCKED verdict.`
        : "Work toward the stated evidence criteria. Retry when inputs change, a failure is transient, or the next attempt tests a distinct diagnostic. If an operation keeps producing the same result under the same conditions, change approach or report partial evidence and the blocker. On longer assignments, save new evidence and what remains in the same report as you reach useful milestones."
      ])
    ].join("\n")
  };
}

export { buildSubagentSpec, managedCohort, superviseCohort };
