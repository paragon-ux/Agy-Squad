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
import { normalizeReportRoot, reportPath } from "./handoffs.mjs";

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
  "reportRoot",
  "knownModels"
]);

const SUBAGENT_MODEL_ALIASES = new Set(["inherit", "flash_lite", "flash", "pro"]);
const WORKSPACE_ISOLATIONS = new Set(["inherit", "share", "branch"]);
const MAX_SWARM_NAME_LENGTH = 24;

function slugifyName(value, fallback) {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SWARM_NAME_LENGTH)
    .replace(/-+$/, "");
  if (slug) return slug;
  const fallbackSlug = String(fallback ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SWARM_NAME_LENGTH)
    .replace(/-+$/, "");
  return fallbackSlug || "worker";
}

function allocateWorkerName(usedWorkerNames, rawValue, fallback) {
  const base = slugifyName(rawValue, fallback);
  if (!usedWorkerNames.has(base)) {
    usedWorkerNames.add(base);
    return base;
  }
  const safeFallback = slugifyName(fallback, "worker");
  for (let counter = 2; ; counter++) {
    const suffix = `-${counter}`;
    const maxPrefixLen = Math.max(1, MAX_SWARM_NAME_LENGTH - suffix.length);
    const prefix =
      base.slice(0, maxPrefixLen).replace(/-+$/, "") ||
      safeFallback.slice(0, maxPrefixLen).replace(/-+$/, "") ||
      "w";
    const candidate = `${prefix}${suffix}`;
    if (!usedWorkerNames.has(candidate)) {
      usedWorkerNames.add(candidate);
      return candidate;
    }
  }
}

function normalizeExplicitModel(rawModel) {
  if (typeof rawModel !== "string") return undefined;
  const trimmed = rawModel.trim();
  return trimmed && trimmed !== "inherit" ? trimmed : undefined;
}

function resolveWorkerModels(executionMode, requestedModel, specModelRaw, overriddenSubagentModels) {
  if (specModelRaw !== undefined && typeof specModelRaw !== "string") {
    return {
      requested: requestedModel ?? "inherit",
      effective: "inherit",
      swarmPin: requestedModel,
      compiledModel: specModelRaw
    };
  }
  const explicitSpecModel = normalizeExplicitModel(specModelRaw);
  const targetModel = requestedModel ?? explicitSpecModel;
  if (executionMode === "subagent") {
    const effectiveModel = targetModel && SUBAGENT_MODEL_ALIASES.has(targetModel) ? targetModel : "inherit";
    if (!requestedModel && explicitSpecModel && !SUBAGENT_MODEL_ALIASES.has(explicitSpecModel)) {
      overriddenSubagentModels.push(explicitSpecModel);
    }
    return {
      requested: targetModel ?? "inherit",
      effective: effectiveModel,
      swarmPin: undefined,
      compiledModel: effectiveModel
    };
  }
  return {
    requested: targetModel ?? "inherit",
    effective: targetModel ?? "inherit",
    swarmPin: targetModel,
    compiledModel: targetModel ?? (specModelRaw ?? "inherit")
  };
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
  if (roles !== undefined && (!Array.isArray(roles) || roles.length === 0)) {
    throw new Error("roles must be a non-empty array of non-empty strings.");
  }
  const roleList = roles ?? ["Task Worker"];
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
    reportRoot,
    knownModels
  } = args;

  if (knownModels !== undefined) {
    if (!Array.isArray(knownModels) || knownModels.length === 0 || knownModels.some(m => typeof m !== "string" || !m.trim())) {
      throw new Error("knownModels must be a non-empty array of non-empty model ID strings (for example the model IDs returned by swarm{action:\"models\"}).");
    }
  }

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
  const normalizedReportRoot = reportRoot !== undefined ? normalizeReportRoot(reportRoot) : undefined;

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

  const manifestPathForBrief =
    selectedManifest === "inline-manifest" || selectedManifest === "inline-task"
      ? undefined
      : selectedManifest;
  const writableScopeEntries = [];
  const workers = [];
  const provenanceEntries = [];
  const bundleRecordTemplates = {};
  const usedWorkerNames = new Set();
  const overriddenSubagentModels = [];
  let totalSpecialists = 0;

  for (const id of targetWorkingIds) {
    const squad = loadedSquads[id];
    const leadSpec = resolveSquadLead(squad, id, targetWorkingIds.length > 1);
    const specs = specialistAssignments(loadedSquads, id);
    totalSpecialists += specs.length;

    const leadSlot = reportPath(id, undefined, normalizedReportRoot);
    let compiledLead;
    let leadModel;
    let leadWorkerName;
    if (leadSpec) {
      const rawLead = stripPlannerFields(leadSpec);
      leadModel = resolveWorkerModels(
        executionMode,
        requestedModel,
        rawLead.model ?? rawLead.Model,
        overriddenSubagentModels
      );
      const cleanedLead = {
        ...rawLead,
        model: leadModel.compiledModel
      };
      compiledLead = buildSubagentSpec(cleanedLead, id, manifestPathForBrief, undefined, normalizedReportRoot);
      leadWorkerName = allocateWorkerName(usedWorkerNames, `${id}-lead`, `${id}-lead`);
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
      const specModel = resolveWorkerModels(
        executionMode,
        requestedModel,
        rawSpec.model ?? rawSpec.Model,
        overriddenSubagentModels
      );
      const subSpec = {
        ...rawSpec,
        model: specModel.compiledModel
      };
      const compiled = buildSubagentSpec(subSpec, id, manifestPathForBrief, number, normalizedReportRoot);
      const slot = reportPath(id, number, normalizedReportRoot);
      const workerName = allocateWorkerName(
        usedWorkerNames,
        `${id}-${rawSpec.role ?? rawSpec.Role ?? number}`,
        `${id}-worker-${number}`
      );
      compiledSpecialists.push({ slot, workerName, specModel, compiled });
      assignmentsTemplate.push({
        // Swarm identifies members on the board by roster name, so the name is the sender identity.
        conversationId: executionMode === "swarm" ? workerName : `<invoke_subagent:${workerName}:conversationId>`,
        report: slot
      });
      provenanceEntries.push({
        squadId: id,
        slotType: "specialist",
        workerName,
        role: compiled.Role,
        reportSlot: slot,
        requestedModel: specModel.requested,
        effectiveModel: specModel.effective,
        conversationId: "<record-after-launch>",
        resolvedModel: executionMode === "swarm" ? "<verify-via-swarm-status>" : "<inherited-from-parent-unverified>"
      });
    }

    if (compiledLead) {
      provenanceEntries.push({
        squadId: id,
        slotType: "lead",
        workerName: leadWorkerName,
        role: compiledLead.Role,
        reportSlot: leadSlot,
        requestedModel: leadModel.requested,
        effectiveModel: leadModel.effective,
        conversationId: "<record-after-launch>",
        resolvedModel: executionMode === "swarm" ? "<verify-via-swarm-status>" : "<inherited-from-parent-unverified>"
      });
    }

    workers.push({
      squadId: id,
      lead: compiledLead
        ? {
            workerName: leadWorkerName,
            reportSlot: leadSlot,
            ...(executionMode === "swarm"
              ? {
                  swarmAdd: {
                    action: "add",
                    name: leadWorkerName,
                    ...(leadModel.swarmPin ? { model: leadModel.swarmPin } : {}),
                    workspace: "inherit",
                    brief: buildSwarmWorkerBrief(compiledLead, leadModel.swarmPin, "inherit", leadSlot)
                  }
                }
              : { Subagent: compiledLead })
          }
        : null,
      specialists: compiledSpecialists.map(({ slot, workerName, specModel, compiled }) => ({
        workerName,
        reportSlot: slot,
        ...(executionMode === "swarm"
          ? {
              swarmAdd: {
                action: "add",
                name: workerName,
                ...(specModel.swarmPin ? { model: specModel.swarmPin } : {}),
                workspace: workspaceIsolation,
                brief: buildSwarmWorkerBrief(compiled, specModel.swarmPin, workspaceIsolation, slot)
              }
            }
          : { Subagent: compiled })
      }))
    });

    bundleRecordTemplates[id] = {
      squadId: id,
      workspace: root,
      ...(normalizedReportRoot ? { reportRoot: normalizedReportRoot } : {}),
      verdict: "PASS",
      verifiedFiles: {},
      assignments: assignmentsTemplate,
      handoffs: [],
      requireIntegrityAudit: includeIntegrityAuditor
    };
  }

  const integrityAuditPlan = includeIntegrityAuditor
    ? targetWorkingIds.flatMap(id => {
        const auditSpecs = resolveIntegrityAuditor(
          loadedSquads,
          allWorkingIds.length > 1 || targetWorkingIds.length > 1 ? id : undefined
        );
        return auditSpecs.map(auditItem => {
          const auditSquadId = auditItem.id;
          const auditSlot = reportPath(auditSquadId, auditItem.number, normalizedReportRoot);
          const rawAudit = stripPlannerFields(auditItem.spec);
          const auditModel = resolveWorkerModels(
            executionMode,
            requestedModel,
            rawAudit.model ?? rawAudit.Model,
            overriddenSubagentModels
          );
          const targetScopeNote = `Audit provenanceScaffold entries for squad '${id}'. Verify reports, verifiedFiles hashes, and spot-check traces ONLY via read_board/swarm status or single-pass query_transcript(summaryOnly=true) on coordinator-recorded conversationIds. NEVER copy .system_generated/ transcripts into scratch/.`;
          const compiledAudit = buildSubagentSpec(
            {
              ...rawAudit,
              model: auditModel.compiledModel,
              instructions: [rawAudit.instructions, targetScopeNote].filter(Boolean).join("\n")
            },
            auditSquadId,
            manifestPathForBrief,
            auditItem.number,
            normalizedReportRoot
          );
          const rawAuditName =
            auditSpecs.length > 1
              ? `audit-${id}-${rawAudit.role ?? rawAudit.Role ?? auditItem.number}`
              : `audit-${id}`;
          const auditWorkerName = allocateWorkerName(usedWorkerNames, rawAuditName, "audit");
          return {
            targetSquad: id,
            dispatchSquadId: allWorkingIds.length > 1 ? `integrity_auditor:${id}` : "integrity_auditor",
            reportSlot: auditSlot,
            workerName: auditWorkerName,
            ...(executionMode === "swarm"
              ? {
                  swarmAdd: {
                    action: "add",
                    name: auditWorkerName,
                    ...(auditModel.swarmPin ? { model: auditModel.swarmPin } : {}),
                    workspace: "inherit",
                    brief: buildSwarmWorkerBrief(compiledAudit, auditModel.swarmPin, "inherit", auditSlot)
                  }
                }
              : { Subagent: compiledAudit })
          };
        });
      })
    : [];

  if (executionMode === "subagent" && !modelProvenance.warning && overriddenSubagentModels.length > 0) {
    const uniqueOverridden = [...new Set(overriddenSubagentModels)];
    modelProvenance.warning = `Manifest model(s) (${uniqueOverridden.join(", ")}) cannot be pinned under executionMode 'subagent'; compiled Model defaults to 'inherit'. Switch to executionMode 'swarm' to pin exact model IDs.`;
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

  const pinnedModels = new Set();
  if (executionMode === "swarm") {
    for (const w of workers) {
      if (w.lead?.swarmAdd?.model) pinnedModels.add(w.lead.swarmAdd.model);
      for (const s of w.specialists) if (s.swarmAdd?.model) pinnedModels.add(s.swarmAdd.model);
    }
    for (const a of integrityAuditPlan) if (a.swarmAdd?.model) pinnedModels.add(a.swarmAdd.model);
  }
  let modelValidation;
  if (executionMode === "swarm" && pinnedModels.size > 0) {
    const pinned = [...pinnedModels];
    if (!requestedModel) {
      modelProvenance.requestedModel = `per-worker (${pinned.join(", ")})`;
      modelProvenance.caveat =
        "Top-level model omitted, but worker/lead specs pin explicit models; verify actual running IDs via swarm{action:\"status\"}.";
    }
    if (knownModels !== undefined) {
      const known = new Set(knownModels.map(m => m.trim()));
      const unknown = pinned.filter(m => !known.has(m));
      if (unknown.length > 0) {
        throw new Error(`Pinned model(s) not in knownModels: ${unknown.join(", ")}. Run swarm{action:"models"} and pass its model IDs, or fix the model name.`);
      }
      modelValidation = { status: "checked-against-supplied-list", pinned, source: "knownModels argument" };
    } else {
      modelValidation = {
        status: "unverified",
        pinned,
        reason: "The planner has no access to the host's swarm{action:\"models\"} list, so pinned model names are not checked here."
      };
      warnings.push(
        `Pinned model(s) ${pinned.join(", ")} are unverified. Run swarm{action:"models"} before the first swarm add, or pass its IDs as knownModels so the planner can reject typos.`
      );
    }
  }

  const notes = [];
  if (executionMode === "swarm" && workers.some(w => w.lead)) {
    notes.push(
      "Layered plan: each working squad has its own lead on top of the swarm coordinator. Single-squad plans have no squad lead (the coordinator acts as lead). The extra layer costs tokens and is unmeasured; prefer a flat plan unless domains need separate synthesis."
    );
  }
  if (executionMode === "swarm") {
    notes.push(
      "Pointer-Over-Wire on the swarm board is a convention, not enforced: workers can post anything. 'agy-squad inspect' detects violations after the fact; it does not prevent them."
    );
  }

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
    ...(modelValidation ? { modelValidation } : {}),
    warnings,
    notes,
    ...(executionMode === "swarm"
      ? { preflight: ["swarm{action:\"models\"}  // confirm pinned model IDs and quota before the first add", "swarm{action:\"status\"}  // after spawning, confirm each worker runs the pinned model"] }
      : {}),
    workers,
    provenanceScaffold: {
      transcriptIsolation: "L6 enforced: raw transcripts stay in .system_generated/; never copy transcripts into scratch/ or lead/leaf directories.",
      identity: executionMode === "swarm"
        ? "Swarm identifies members by roster name: bundle assignments[].conversationId and handoffs[].sender use the swarm member name shown above and on the board."
        : "invoke_subagent returns a conversationId per child; record it in assignments[].conversationId and use it as handoffs[].sender.",
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
