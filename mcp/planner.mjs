import fs from "node:fs";
import path from "node:path";
import { buildSubagentSpec, validateScopeFiles } from "./briefs.mjs";
import {
  defaultAdversarialSquad,
  loadSquads,
  manifestSquads,
  resolveIntegrityAuditor,
  resolveSquadLead,
  specialistAssignments
} from "./dispatch.mjs";
import { reportPath } from "./handoffs.mjs";

const ALLOWED_PLANNER_KEYS = new Set([
  "manifestPath",
  "manifest",
  "task",
  "squadId",
  "executionMode",
  "model",
  "workspaceIsolation",
  "scopeFiles",
  "roles",
  "includeIntegrityAuditor",
  "reportRoot"
]);

const SUBAGENT_MODEL_ALIASES = new Set(["inherit", "flash_lite", "flash", "pro"]);
const WORKSPACE_ISOLATIONS = new Set(["inherit", "share", "branch"]);

function slugifyName(value, fallback) {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || fallback;
}

function normalizeScopePath(scopeEntry) {
  const trimmed = scopeEntry.trim().replace(/\/+$/, "");
  return trimmed === "." ? "" : trimmed;
}

function scopesOverlap(a, b) {
  const normA = normalizeScopePath(a);
  const normB = normalizeScopePath(b);
  if (normA === "" || normB === "") return true;
  return normA === normB || normA.startsWith(`${normB}/`) || normB.startsWith(`${normA}/`);
}

function findScopeOverlaps(entries) {
  const overlaps = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const left = entries[i];
      const right = entries[j];
      const matchingPair = [];
      for (const a of left.scopeFiles) {
        for (const b of right.scopeFiles) {
          if (scopesOverlap(a, b)) matchingPair.push([a, b]);
        }
      }
      if (matchingPair.length > 0) {
        overlaps.push({
          workerA: left.label,
          workerB: right.label,
          pairs: matchingPair.map(([a, b]) => `${a} <-> ${b}`)
        });
      }
    }
  }
  return overlaps;
}

function stripPlannerFields(spec) {
  if (!spec || typeof spec !== "object") return spec;
  const { readOnly: _readOnly, ...rest } = spec;
  return rest;
}

function deriveTaskSquads(task, roles, scopeFiles) {
  const validatedScopes = validateScopeFiles(scopeFiles ?? ["."], "task");
  const roleList = Array.isArray(roles) && roles.length > 0 ? roles : ["Task Worker"];
  const specialists = roleList.map((role, index) => {
    if (typeof role !== "string" || !role.trim()) {
      throw new Error(`Role at index ${index} must be a non-empty string.`);
    }
    return {
      role: role.trim(),
      objective: roleList.length === 1 ? task.trim() : `${task.trim()} — Focus: ${role.trim()}.`,
      scopeFiles: validatedScopes,
      expectedDeliverable: "Markdown evidence report with verified file paths, commands, exit codes, and test outputs."
    };
  });
  return { task_squad: { specialists } };
}

function buildSwarmWorkerBrief(compiledBrief, targetModel, workspaceIsolation, reportSlot) {
  const modelNote = targetModel
    ? `Pinned model expectation: ${targetModel} (verify via swarm status).`
    : "Model: coordinator default.";
  const isolationNote = workspaceIsolation === "inherit"
    ? `Shared workspace mode: write your report directly to ${reportSlot} and post READY ${reportSlot} — <finding> on the board.`
    : `Isolated '${workspaceIsolation}' workspace mode: write your report inside your working copy at ${reportSlot}, post READY ${reportSlot} — <finding> on the board, and let the coordinator merge/collect outputs before bundling.`;
  return [
    compiledBrief.Prompt,
    modelNote,
    isolationNote
  ].join("\n");
}

/**
 * Compile an execution plan pairing Agy-Squad governance with Antigravity native /swarm
 * or invoke_subagent dispatch, explicit model provenance, scope-overlap checks, and L6-safe
 * integrity audit scaffolding.
 */
function planSquadCohort(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE || process.cwd()) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Provide a planner options object.");
  }
  for (const key of Object.keys(args)) {
    if (!ALLOWED_PLANNER_KEYS.has(key)) {
      throw new Error(`Unsupported squad_planner option '${key}'.`);
    }
  }

  const {
    manifestPath,
    manifest,
    task,
    squadId,
    executionMode = "swarm",
    model,
    workspaceIsolation = "inherit",
    scopeFiles,
    roles,
    includeIntegrityAuditor = true,
    reportRoot
  } = args;

  const sources = [
    manifestPath !== undefined ? "manifestPath" : null,
    manifest !== undefined ? "manifest" : null,
    task !== undefined ? "task" : null
  ].filter(Boolean);
  if (sources.length !== 1) {
    throw new Error("Provide exactly one of manifestPath, manifest, or task.");
  }
  if (executionMode !== "swarm" && executionMode !== "subagent") {
    throw new Error("executionMode must be 'swarm' or 'subagent'.");
  }
  if (!WORKSPACE_ISOLATIONS.has(workspaceIsolation)) {
    throw new Error("workspaceIsolation must be 'inherit', 'share', or 'branch'.");
  }
  if (executionMode === "subagent" && workspaceIsolation !== "inherit") {
    throw new Error("workspaceIsolation 'share' or 'branch' requires executionMode 'swarm'; subagent mode requires 'inherit'.");
  }
  if (model !== undefined && (typeof model !== "string" || !model.trim())) {
    throw new Error("model must be a non-empty string when provided.");
  }
  if (includeIntegrityAuditor !== undefined && typeof includeIntegrityAuditor !== "boolean") {
    throw new Error("includeIntegrityAuditor must be a boolean.");
  }
  if (reportRoot !== undefined) {
    reportPath("probe", undefined, reportRoot);
  }

  const root = fs.realpathSync(workspace);
  let loadedSquads;
  let selectedManifest;
  if (task !== undefined) {
    if (typeof task !== "string" || !task.trim()) {
      throw new Error("task must be a non-empty string.");
    }
    loadedSquads = deriveTaskSquads(task, roles, scopeFiles);
    selectedManifest = "inline-task";
  } else if (manifest !== undefined) {
    if (scopeFiles !== undefined || roles !== undefined) {
      throw new Error("scopeFiles and roles can only be passed with task.");
    }
    loadedSquads = manifestSquads(manifest);
    selectedManifest = "inline-manifest";
  } else {
    if (typeof manifestPath !== "string" || !manifestPath.trim()) {
      throw new Error("manifestPath must be a non-empty string.");
    }
    if (scopeFiles !== undefined || roles !== undefined) {
      throw new Error("scopeFiles and roles can only be passed with task.");
    }
    const loaded = loadSquads(root, manifestPath);
    loadedSquads = loaded.squads;
    selectedManifest = loaded.selectedManifest;
  }

  const allSquads = { ...loadedSquads };
  if (!allSquads.adversarial_review) {
    allSquads.adversarial_review = defaultAdversarialSquad(allSquads, squadId);
  }

  const isAuditKey = id =>
    id === "adversarial_review" || id === "integrity_auditor" || id.startsWith("integrity_auditor-");
  const allWorkingIds = Object.keys(loadedSquads).filter(id => !isAuditKey(id));
  const targetWorkingIds = squadId !== undefined
    ? (() => {
        if (typeof squadId !== "string" || !squadId.trim()) {
          throw new Error("squadId must be a non-empty string.");
        }
        if (!Object.hasOwn(loadedSquads, squadId) || isAuditKey(squadId)) {
          throw new Error(`Unknown working squadId '${squadId}'.`);
        }
        return [squadId];
      })()
    : allWorkingIds;

  if (!targetWorkingIds.length) {
    throw new Error("Manifest must define at least one non-audit working squad.");
  }

  const requestedModel = model?.trim();
  const effectiveSubagentModel = requestedModel && SUBAGENT_MODEL_ALIASES.has(requestedModel)
    ? requestedModel
    : "inherit";
  const modelProvenance = executionMode === "swarm"
    ? {
        executionMode: "swarm",
        requestedModel: requestedModel ?? "inherit (coordinator default)",
        pinningSupported: true,
        perWorkerModelExposed: true,
        verificationMethod: "Call swarm{action: \"status\"} after spawning workers to verify actual running model IDs.",
        caveat: requestedModel
          ? "Each swarm add pins the requested model; monitor/coordinator model remains whatever session hosts the coordinator."
          : "No explicit model passed; workers default to the coordinator's active model."
      }
    : {
        executionMode: "subagent",
        requestedModel: requestedModel ?? "inherit",
        effectiveModel: effectiveSubagentModel,
        pinningSupported: false,
        perChildModelExposed: false,
        verificationMethod: "invoke_subagent inherits or aliases ('inherit'|'flash'|'flash_lite'|'pro'); neither read_transcript nor manage_subagents exposes per-child resolved model IDs.",
        ...(requestedModel && !SUBAGENT_MODEL_ALIASES.has(requestedModel)
          ? {
              warning: `Requested explicit model '${requestedModel}' cannot be pinned under executionMode 'subagent'; compiled Model defaults to 'inherit'. Switch to executionMode 'swarm' to pin exact model IDs.`
            }
          : {})
      };

  const writableScopeEntries = [];
  const workers = [];
  const provenanceEntries = [];
  const bundleRecordTemplates = {};
  let totalSpecialists = 0;

  for (const id of targetWorkingIds) {
    const squad = loadedSquads[id];
    const leadSpec = resolveSquadLead(squad, id, targetWorkingIds.length > 1);
    const specs = specialistAssignments(loadedSquads, id);
    totalSpecialists += specs.length;

    const leadSlot = reportPath(id, undefined, reportRoot);
    let compiledLead;
    if (leadSpec) {
      const cleanedLead = {
        ...stripPlannerFields(leadSpec),
        model: executionMode === "subagent" ? effectiveSubagentModel : (leadSpec.model ?? leadSpec.Model ?? "inherit")
      };
      compiledLead = buildSubagentSpec(cleanedLead, id, selectedManifest, undefined, reportRoot);
    }

    const compiledSpecialists = [];
    const assignmentsTemplate = [];
    for (const { spec, number } of specs) {
      const rawSpec = stripPlannerFields(spec);
      const specScope = validateScopeFiles(rawSpec.scopeFiles ?? rawSpec.ScopeFiles, rawSpec.role ?? rawSpec.Role);
      if (spec?.readOnly !== true) {
        writableScopeEntries.push({
          label: `${id}#${number} (${rawSpec.role ?? rawSpec.Role ?? `Specialist ${number}`})`,
          scopeFiles: specScope
        });
      }
      const subSpec = {
        ...rawSpec,
        model: executionMode === "subagent"
          ? effectiveSubagentModel
          : (rawSpec.model ?? rawSpec.Model ?? "inherit")
      };
      const compiled = buildSubagentSpec(subSpec, id, selectedManifest, number, reportRoot);
      const slot = reportPath(id, number, reportRoot);
      const workerName = slugifyName(`${id}-${rawSpec.role ?? rawSpec.Role ?? number}`, `${id}-worker-${number}`);
      compiledSpecialists.push({ slot, workerName, rawSpec, compiled });
      assignmentsTemplate.push({
        conversationId: executionMode === "swarm" ? `<swarm-worker:${workerName}:conversationId>` : `<invoke_subagent:${workerName}:conversationId>`,
        report: slot
      });
      provenanceEntries.push({
        squadId: id,
        slotType: "specialist",
        workerName,
        role: compiled.Role,
        reportSlot: slot,
        requestedModel: requestedModel ?? (rawSpec.model ?? rawSpec.Model ?? "inherit"),
        effectiveModel: executionMode === "swarm" ? (requestedModel ?? rawSpec.model ?? rawSpec.Model ?? "inherit") : effectiveSubagentModel,
        conversationId: "<record-after-launch>",
        resolvedModel: executionMode === "swarm" ? "<verify-via-swarm-status>" : "<inherited-from-parent-unverified>"
      });
    }

    if (compiledLead) {
      provenanceEntries.push({
        squadId: id,
        slotType: "lead",
        workerName: slugifyName(`${id}-lead`, `${id}-lead`),
        role: compiledLead.Role,
        reportSlot: leadSlot,
        requestedModel: requestedModel ?? "inherit",
        effectiveModel: executionMode === "swarm" ? (requestedModel ?? "inherit") : effectiveSubagentModel,
        conversationId: "<record-after-launch>",
        resolvedModel: executionMode === "swarm" ? "<verify-via-swarm-status>" : "<inherited-from-parent-unverified>"
      });
    }

    workers.push({
      squadId: id,
      lead: compiledLead ? { reportSlot: leadSlot, Subagent: compiledLead } : null,
      specialists: compiledSpecialists.map(({ slot, workerName, compiled }) => ({
        workerName,
        reportSlot: slot,
        ...(executionMode === "swarm"
          ? {
              swarmAdd: {
                action: "add",
                name: workerName,
                ...(requestedModel ? { model: requestedModel } : {}),
                workspace: workspaceIsolation,
                brief: buildSwarmWorkerBrief(compiled, requestedModel, workspaceIsolation, slot)
              }
            }
          : { Subagent: compiled })
      }))
    });

    bundleRecordTemplates[id] = {
      squadId: id,
      workspace: root,
      ...(reportRoot ? { reportRoot } : {}),
      verdict: "PASS",
      verifiedFiles: {},
      assignments: assignmentsTemplate,
      handoffs: [],
      requireIntegrityAudit: includeIntegrityAuditor
    };
  }

  const scopeOverlaps = findScopeOverlaps(writableScopeEntries);
  const warnings = [];
  if (scopeOverlaps.length > 0 && workspaceIsolation === "inherit") {
    warnings.push(
      `Detected ${scopeOverlaps.length} writable sibling scopeFiles overlap(s) with workspaceIsolation='inherit'; split scopeFiles across workers or use executionMode='swarm' with workspaceIsolation='share'.`
    );
  }
  if (executionMode === "swarm" && workspaceIsolation !== "inherit") {
    warnings.push(
      `Swarm workers run in '${workspaceIsolation}' copies; merge or collect report slots from worker copies into the coordinator workspace before running agy-squad bundle.`
    );
  }
  if (modelProvenance.warning) {
    warnings.push(modelProvenance.warning);
  }

  const integrityAuditPlan = includeIntegrityAuditor
    ? targetWorkingIds.map(id => {
        const auditSpecs = resolveIntegrityAuditor(loadedSquads, allWorkingIds.length > 1 || targetWorkingIds.length > 1 ? id : undefined);
        const auditSquadId = auditSpecs[0].id;
        const auditSlot = reportPath(auditSquadId, 1, reportRoot);
        const targetScopeNote = `Audit provenanceScaffold entries for squad '${id}'. Verify reports, verifiedFiles hashes, and spot-check traces ONLY via read_board/swarm status or single-pass query_transcript(summaryOnly=true) on coordinator-recorded conversationIds. NEVER copy .system_generated/ transcripts into scratch/.`;
        const compiledAudit = buildSubagentSpec(
          {
            ...auditSpecs[0].spec,
            model: executionMode === "subagent" ? effectiveSubagentModel : (requestedModel ?? "inherit"),
            instructions: [auditSpecs[0].spec.instructions, targetScopeNote].filter(Boolean).join("\n")
          },
          auditSquadId,
          selectedManifest,
          1,
          reportRoot
        );
        return {
          targetSquad: id,
          dispatchSquadId: allWorkingIds.length > 1 ? `integrity_auditor:${id}` : "integrity_auditor",
          reportSlot: auditSlot,
          workerName: slugifyName(`integrity-auditor-${id}`, "integrity-auditor"),
          ...(executionMode === "swarm"
            ? {
                swarmAdd: {
                  action: "add",
                  name: slugifyName(`integrity-auditor-${id}`, "integrity-auditor"),
                  ...(requestedModel ? { model: requestedModel } : {}),
                  workspace: "inherit",
                  brief: buildSwarmWorkerBrief(compiledAudit, requestedModel, "inherit", auditSlot)
                }
              }
            : { Subagent: compiledAudit })
        };
      })
    : [];

  return {
    plannerVersion: "2.0.0",
    source: selectedManifest,
    executionMode,
    workspaceIsolation,
    topology: {
      recommendedPattern: targetWorkingIds.length > 1 ? "layered" : "flat",
      workingSquads: targetWorkingIds.length,
      totalSpecialists,
      scopeOverlaps
    },
    modelProvenance,
    warnings,
    workers,
    provenanceScaffold: {
      transcriptIsolation: "L6 enforced: raw transcripts stay in .system_generated/; never copy transcripts into scratch/ or lead/leaf directories.",
      coordinatorSessionModel: "<record-coordinator-model-from-swarm-status>",
      entries: provenanceEntries
    },
    integrityAuditPlan,
    bundleRecordTemplates,
    verificationPipeline: [
      "agy-squad fingerprint <changed-or-verified-files...>",
      "agy-squad inspect <bundle-record.json>",
      "agy-squad bundle <bundle-record.json>",
      "agy-squad verify <report.sources.json>",
      "agy-squad prune <report.sources.json> <accepted-sha256>"
    ]
  };
}

function handleSquadPlanner(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE || process.cwd()) {
  try {
    const plan = planSquadCohort(args, workspace);
    return {
      content: [{ type: "text", text: JSON.stringify(plan, null, 2) }]
    };
  } catch (error) {
    const message = error.code === "ENOENT" ? "Manifest or workspace not found." : error.message;
    return { isError: true, content: [{ type: "text", text: `squad_planner: ${message}` }] };
  }
}

export { handleSquadPlanner, planSquadCohort, scopesOverlap };
