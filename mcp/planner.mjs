import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import util from "node:util";
import { SUBAGENT_MODEL_ALIASES, buildSubagentSpec, validateScopeFiles } from "./briefs.mjs";
import {
  formatNotFoundError,
  loadSquads,
  logicalWorkspaceRoot,
  manifestSquads,
  resolveIntegrityAuditor,
  resolveSquadLead,
  resolveWorkspaceRoot,
  specialistAssignments
} from "./dispatch.mjs";
import { normalizeReportRoot, reportPath } from "./handoffs.mjs";

const ALLOWED_PLANNER_KEYS = new Set([
  "manifestPath",
  "manifest",
  "task",
  "workspace",
  "squadId",
  "executionMode",
  "model",
  "workspaceIsolation",
  "scopeFiles",
  "roles",
  "includeIntegrityAuditor",
  "reportRoot",
  "knownModels",
  "occupiedWorkerNames",
  "topology",
  "boardSince",
  "boardSeqs"
]);

const WORKSPACE_ISOLATIONS = new Set(["inherit", "share", "branch"]);
const MAX_SWARM_NAME_LENGTH = 24;
const RESERVED_SWARM_NAMES = new Set(["all", "coordinator", "narrator", "monitor"]);
const AGENT_ALIAS_PAIRS = [
  ["role", "Role"],
  ["objective", "Objective"],
  ["scopeFiles", "ScopeFiles"],
  ["instructions", "Instructions"],
  ["expectedDeliverable", "ExpectedDeliverable"],
  ["typeName", "TypeName"],
  ["model", "Model"],
  ["workspace", "Workspace"]
];

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

function allocateWorkerName(usedWorkerNames, rawValue, fallback, truncatedTracker) {
  const cleanRawSlug = String(rawValue ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const rawBase = slugifyName(rawValue, fallback);
  const base = RESERVED_SWARM_NAMES.has(rawBase)
    ? `w-${rawBase}`.slice(0, MAX_SWARM_NAME_LENGTH).replace(/-+$/, "")
    : rawBase;
  const recordIfTruncated = (candidate) => {
    if (
      Array.isArray(truncatedTracker) &&
      (candidate.length >= MAX_SWARM_NAME_LENGTH || cleanRawSlug.length > MAX_SWARM_NAME_LENGTH)
    ) {
      truncatedTracker.push(candidate);
    }
    return candidate;
  };
  if (!usedWorkerNames.has(base) && !RESERVED_SWARM_NAMES.has(base)) {
    usedWorkerNames.add(base);
    return recordIfTruncated(base);
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
    if (!usedWorkerNames.has(candidate) && !RESERVED_SWARM_NAMES.has(candidate)) {
      usedWorkerNames.add(candidate);
      return recordIfTruncated(candidate);
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

function normalizeScopePath(scopeEntry, root, options = {}) {
  let resolvedRoot = root;
  let resolvedOptions = options;
  if (root && typeof root === "object") {
    resolvedOptions = root;
    resolvedRoot = undefined;
  }
  const safeOptions = resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : {};
  const caseInsensitive =
    typeof safeOptions.caseInsensitive === "boolean"
      ? safeOptions.caseInsensitive
      : os.platform() === "win32" || os.platform() === "darwin";
  const applyCase = value => (caseInsensitive ? value.toLowerCase() : value);

  let trimmed = scopeEntry
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^(?:\.\/)+/, "")
    .replace(/\/\.(?=\/|$)/g, "")
    .replace(/\/+$/, "");
  if (trimmed === ".") trimmed = "";
  if (trimmed === "") return "";
  if (safeOptions.normCache?.has(trimmed)) {
    return safeOptions.normCache.get(trimmed);
  }
  let result = applyCase(trimmed);
  if (resolvedRoot) {
    try {
      let canonicalRoot = safeOptions.canonicalRoot;
      if (!canonicalRoot) {
        canonicalRoot = path.resolve(resolvedRoot);
        try {
          canonicalRoot = fs.realpathSync.native(canonicalRoot);
        } catch {}
      }
      const candidate = path.resolve(canonicalRoot, trimmed);
      const lexRel = path.relative(canonicalRoot, candidate).split(path.sep).join("/");
      if (lexRel === "") {
        result = "";
      } else if (lexRel !== ".." && !lexRel.startsWith("../") && !path.isAbsolute(lexRel)) {
        const segmentCache = safeOptions.segmentCache;
        const parts = lexRel.split("/");
        let curPath = canonicalRoot;
        let curReal = canonicalRoot;
        let remainingStart = 0;
        let resolvedBase = canonicalRoot;
        for (let i = 0; i < parts.length; i++) {
          curPath = path.join(curPath, parts[i]);
          let cached = segmentCache?.get(curPath);
          if (cached === undefined) {
            try {
              const st = fs.lstatSync(curPath);
              if (st.isSymbolicLink()) {
                const real = fs.realpathSync.native(curPath);
                cached = { exists: true, real };
              } else {
                const real = path.join(curReal, parts[i]);
                cached = { exists: true, real };
              }
            } catch (err) {
              if (err?.code === "ENOENT" || err?.code === "ENOTDIR") {
                cached = { exists: false };
              } else {
                cached = { error: true };
              }
            }
            segmentCache?.set(curPath, cached);
          }
          if (!cached.exists) break;
          curReal = cached.real;
          resolvedBase = curReal;
          remainingStart = i + 1;
        }
        const suffixParts = parts.slice(remainingStart);
        const resolvedTarget = suffixParts.length ? path.join(resolvedBase, ...suffixParts) : resolvedBase;
        const rel = path.relative(canonicalRoot, resolvedTarget).split(path.sep).join("/");
        if (rel === "") {
          result = "";
        } else if (rel !== ".." && !rel.startsWith("../") && !path.isAbsolute(rel)) {
          result = applyCase(rel);
        } else {
          result = applyCase(lexRel);
        }
      }
    } catch {
      // Planned path may not exist on disk yet; keep normalized lexical form.
    }
  }
  safeOptions.normCache?.set(trimmed, result);
  return result;
}

function scopesOverlap(a, b, root, options = {}) {
  let resolvedRoot = root;
  let resolvedOptions = options;
  if (root && typeof root === "object") {
    resolvedOptions = root;
    resolvedRoot = undefined;
  }
  const normA = normalizeScopePath(a, resolvedRoot, resolvedOptions);
  const normB = normalizeScopePath(b, resolvedRoot, resolvedOptions);
  if (normA === "" || normB === "") return true;
  return normA === normB || normA.startsWith(`${normB}/`) || normB.startsWith(`${normA}/`);
}

function findScopeOverlaps(entries, root, options = {}) {
  let resolvedRoot = root;
  let resolvedOptions = options;
  if (root && typeof root === "object") {
    resolvedOptions = root;
    resolvedRoot = undefined;
  }
  let canonicalRoot;
  if (resolvedRoot) {
    canonicalRoot = path.resolve(resolvedRoot);
    try {
      canonicalRoot = fs.realpathSync.native(canonicalRoot);
    } catch {}
  }
  const scopedOptions = {
    ...(resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : {}),
    canonicalRoot,
    normCache: new Map(),
    segmentCache: new Map()
  };
  const normalizedEntries = entries.map(entry => {
    const deduped = [];
    const seenNorm = new Set();
    for (const raw of entry.scopeFiles) {
      const norm = normalizeScopePath(raw, resolvedRoot, scopedOptions);
      if (!seenNorm.has(norm)) {
        seenNorm.add(norm);
        deduped.push({ raw, norm });
      }
    }
    return { label: entry.label, scopes: deduped };
  });
  const overlaps = [];
  for (let i = 0; i < normalizedEntries.length; i++) {
    for (let j = i + 1; j < normalizedEntries.length; j++) {
      const left = normalizedEntries[i];
      const right = normalizedEntries[j];
      const matchingPair = [];
      for (const a of left.scopes) {
        for (const b of right.scopes) {
          if (a.norm === "" || b.norm === "" || a.norm === b.norm || a.norm.startsWith(`${b.norm}/`) || b.norm.startsWith(`${a.norm}/`)) {
            matchingPair.push([a.raw, b.raw]);
          }
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

function canonicalizeAgentSpec(spec, fallbackLabel) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error(`Agent '${fallbackLabel}' must be an object.`);
  }
  const agentLabel = spec.role ?? spec.Role ?? fallbackLabel;
  if (spec.readOnly !== undefined && spec.ReadOnly !== undefined && spec.readOnly !== spec.ReadOnly) {
    throw new Error(`Agent '${agentLabel}' cannot define both 'readOnly' and 'ReadOnly'.`);
  }
  const readOnly = spec.readOnly !== undefined ? spec.readOnly : spec.ReadOnly;
  if (readOnly !== undefined && typeof readOnly !== "boolean") {
    throw new Error(`Agent '${agentLabel}' readOnly must be a boolean.`);
  }
  const canonical = { ...spec };
  delete canonical.readOnly;
  delete canonical.ReadOnly;
  for (const [lower, upper] of AGENT_ALIAS_PAIRS) {
    const hasLower = canonical[lower] !== undefined;
    const hasUpper = canonical[upper] !== undefined;
    if (hasLower && hasUpper && !util.isDeepStrictEqual(canonical[lower], canonical[upper])) {
      throw new Error(`Agent '${agentLabel}' has conflicting ${lower} and ${upper} fields.`);
    }
    if (!hasLower && hasUpper) {
      canonical[lower] = canonical[upper];
    }
    delete canonical[upper];
  }
  return { canonical, readOnly };
}

function deriveTaskSquads(task, roles, scopeFiles) {
  const validatedScopes = validateScopeFiles(scopeFiles === undefined ? ["."] : scopeFiles, "task");
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

function buildSwarmWorkerBrief(compiledBrief, targetModel, workspaceIsolation) {
  const modelNote = targetModel
    ? `Pinned model expectation: ${targetModel} (verify via swarm status).`
    : "Model: coordinator default.";
  return workspaceIsolation === "inherit"
    ? `${compiledBrief.Prompt}\n${modelNote}`
    : `${compiledBrief.Prompt}\n${modelNote}\nIsolated '${workspaceIsolation}' workspace: coordinator collects outputs before bundling.`;
}

/**
 * Compile an execution plan pairing Agy-Squad governance with Antigravity native /swarm
 * or invoke_subagent dispatch, explicit model provenance, scope-overlap checks, and L6-safe
 * integrity audit scaffolding.
 */
function planSquadCohort(
  args = {},
  workspace = process.env.AGY_SQUAD_WORKSPACE?.trim() || process.cwd(),
  options = {}
) {
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
    workspace: argWorkspace,
    squadId,
    executionMode = "swarm",
    model,
    workspaceIsolation = "inherit",
    scopeFiles,
    roles,
    includeIntegrityAuditor = true,
    reportRoot,
    knownModels,
    occupiedWorkerNames,
    topology,
    boardSince,
    boardSeqs
  } = args;

  if (topology !== undefined && topology !== "flat" && topology !== "layered") {
    throw new Error("topology must be 'flat' or 'layered'.");
  }

  if (knownModels !== undefined) {
    if (!Array.isArray(knownModels) || knownModels.length === 0 || knownModels.some(m => typeof m !== "string" || !m.trim())) {
      throw new Error("knownModels must be a non-empty array of non-empty model ID strings (for example the model IDs returned by swarm{action:\"models\"}).");
    }
  }

  if (occupiedWorkerNames !== undefined) {
    if (!Array.isArray(occupiedWorkerNames) || occupiedWorkerNames.some(n => typeof n !== "string" || !n.trim())) {
      throw new Error("occupiedWorkerNames must be an array of non-empty worker name strings.");
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
  if (knownModels !== undefined && executionMode === "subagent") {
    throw new Error("knownModels is only supported with executionMode 'swarm' (subagent mode only supports 'inherit', 'flash_lite', 'flash', 'pro').");
  }
  if (boardSince !== undefined) {
    if (executionMode !== "swarm") {
      throw new Error("boardSince is only supported with executionMode 'swarm'.");
    }
    if (typeof boardSince !== "number" || !Number.isSafeInteger(boardSince) || boardSince < 0) {
      throw new Error("boardSince must be a non-negative integer sequence number.");
    }
  }
  if (boardSeqs !== undefined) {
    if (executionMode !== "swarm") {
      throw new Error("boardSeqs is only supported with executionMode 'swarm'.");
    }
    if (!Array.isArray(boardSeqs) || boardSeqs.length === 0 || boardSeqs.some(n => typeof n !== "number" || !Number.isSafeInteger(n) || n < 0)) {
      throw new Error("boardSeqs must be a non-empty array of non-negative integer sequence numbers.");
    }
  }
  if (model !== undefined && (typeof model !== "string" || !model.trim())) {
    throw new Error("model must be a non-empty string when provided.");
  }
  if (includeIntegrityAuditor !== undefined && typeof includeIntegrityAuditor !== "boolean") {
    throw new Error("includeIntegrityAuditor must be a boolean.");
  }
  const normalizedReportRoot = reportRoot !== undefined ? normalizeReportRoot(reportRoot) : undefined;

  const root = resolveWorkspaceRoot(argWorkspace, workspace);
  const logicalRoot = logicalWorkspaceRoot(argWorkspace, workspace);
  let loadedSquads;
  let selectedManifest;
  if (task !== undefined) {
    if (typeof task !== "string" || !task.trim()) {
      throw new Error("task must be a non-empty string.");
    }
    if (topology === "layered") {
      throw new Error("topology 'layered' requires a manifest with per-squad leads; use topology 'flat' (or omit topology) with task.");
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
    const loaded = loadSquads(root, manifestPath, logicalRoot);
    loadedSquads = loaded.squads;
    selectedManifest = loaded.selectedManifest;
  }

  const isAuditKey = id => id === "integrity_auditor" || id.startsWith("integrity_auditor-");
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

  const explicitInheritRequested = typeof model === "string" && model.trim() === "inherit";
  const requestedModel = normalizeExplicitModel(model);
  const effectiveSubagentModel = requestedModel && SUBAGENT_MODEL_ALIASES.has(requestedModel)
    ? requestedModel
    : "inherit";
  const modelProvenance = executionMode === "swarm"
    ? {
        executionMode: "swarm",
        requestedModel: requestedModel ?? (explicitInheritRequested ? "inherit" : "inherit (coordinator default)"),
        pinningSupported: true,
        perWorkerModelExposed: true,
        verificationMethod: "Call swarm{action: \"status\"} after spawning workers to verify actual running model IDs.",
        caveat: requestedModel
          ? "Each swarm add pins the requested model; monitor/coordinator model remains whatever session hosts the coordinator."
          : explicitInheritRequested
            ? "Explicit 'inherit' requested; workers use the coordinator's active model."
            : "No explicit model passed; workers default to the coordinator's active model."
      }
    : {
        executionMode: "subagent",
        requestedModel: requestedModel ?? "inherit",
        effectiveModel: effectiveSubagentModel,
        pinningSupported: false,
        perChildModelExposed: false,
        verificationMethod: "invoke_subagent inherits or aliases ('inherit'|'flash'|'flash_lite'|'pro'); neither 'agy-context transcript read' nor manage_subagents exposes per-child resolved model IDs.",
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
  const bundleRecordTemplates = Object.create(null);
  const usedWorkerNames = new Set(RESERVED_SWARM_NAMES);
  for (const occupied of occupiedWorkerNames ?? []) {
    const trimmed = occupied.trim();
    usedWorkerNames.add(trimmed);
    usedWorkerNames.add(slugifyName(trimmed, trimmed));
  }
  const overriddenSubagentModels = [];
  const strippedFlatLeads = [];
  const truncatedWorkerNames = [];
  let totalSpecialists = 0;

  for (const id of targetWorkingIds) {
    const squad = loadedSquads[id];
    const resolvedLeadSpec = resolveSquadLead(squad, id, topology === "layered");
    if (topology === "flat" && resolvedLeadSpec) {
      buildSubagentSpec(resolvedLeadSpec, id, manifestPathForBrief, undefined, normalizedReportRoot, {
        executionMode,
        workspaceIsolation: "inherit"
      });
      strippedFlatLeads.push(id);
    }
    const leadSpec = topology === "flat" ? undefined : resolvedLeadSpec;
    const specs = specialistAssignments(loadedSquads, id);
    totalSpecialists += specs.length;

    const leadSlot = reportPath(id, undefined, normalizedReportRoot);
    let compiledLead;
    let leadModel;
    let leadWorkerName;
    if (leadSpec) {
      leadWorkerName = allocateWorkerName(usedWorkerNames, `${id}-lead`, `${id}-lead`, truncatedWorkerNames);
      const { canonical: rawLead, readOnly: leadReadOnly } = canonicalizeAgentSpec(leadSpec, `${id}-lead`);
      const leadScope = validateScopeFiles(rawLead.scopeFiles, rawLead.role);
      if (leadReadOnly !== true) {
        writableScopeEntries.push({
          label: `${id}-lead (${rawLead.role ?? "Lead"})`,
          scopeFiles: leadScope
        });
      }
      leadModel = resolveWorkerModels(
        executionMode,
        requestedModel,
        rawLead.model,
        overriddenSubagentModels
      );
      const cleanedLead = {
        ...rawLead,
        model: leadModel.compiledModel
      };
      compiledLead = buildSubagentSpec(
        cleanedLead,
        id,
        manifestPathForBrief,
        undefined,
        normalizedReportRoot,
        {
          executionMode,
          workspaceIsolation: "inherit",
          isIntegrityAuditor: false,
          precompiledSpecialists: true,
          leadWorkerName,
          boardSince
        }
      );
    }

    const compiledSpecialists = [];
    const assignmentsTemplate = [];
    for (const { spec, number } of specs) {
      const { canonical: rawSpec, readOnly: specReadOnly } = canonicalizeAgentSpec(spec, `${id}#${number}`);
      const specScope = validateScopeFiles(rawSpec.scopeFiles, rawSpec.role);
      if (specReadOnly !== true) {
        writableScopeEntries.push({
          label: `${id}#${number} (${rawSpec.role ?? `Specialist ${number}`})`,
          scopeFiles: specScope
        });
      }
      const specModel = resolveWorkerModels(
        executionMode,
        requestedModel,
        rawSpec.model,
        overriddenSubagentModels
      );
      const subSpec = {
        ...rawSpec,
        model: specModel.compiledModel
      };
      const compiled = buildSubagentSpec(
        subSpec,
        id,
        manifestPathForBrief,
        number,
        normalizedReportRoot,
        {
          executionMode,
          workspaceIsolation,
          isIntegrityAuditor: false,
          leadWorkerName,
          boardSince
        }
      );
      const slot = reportPath(id, number, normalizedReportRoot);
      const workerName = allocateWorkerName(
        usedWorkerNames,
        `${id}-${rawSpec.role ?? number}`,
        `${id}-worker-${number}`,
        truncatedWorkerNames
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
                    brief: buildSwarmWorkerBrief(compiledLead, leadModel.swarmPin, "inherit")
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
                brief: buildSwarmWorkerBrief(compiled, specModel.swarmPin, workspaceIsolation)
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

  const auditWarnings = [];
  const integrityAuditPlan = includeIntegrityAuditor
    ? targetWorkingIds.flatMap(id => {
        const hasTargetOverride = Object.hasOwn(loadedSquads, `integrity_auditor-${id}`);
        const auditTargetArg =
          allWorkingIds.length > 1 || targetWorkingIds.length > 1 || hasTargetOverride ? id : undefined;
        const auditSpecs = resolveIntegrityAuditor(loadedSquads, auditTargetArg, auditWarnings);
        const compiledAudits = auditSpecs.map(auditItem => {
          const auditSquadId = auditItem.id;
          const auditSlot = reportPath(auditSquadId, auditItem.number, normalizedReportRoot);
          const { canonical: rawAudit } = canonicalizeAgentSpec(auditItem.spec, `${auditSquadId}#${auditItem.number}`);
          const auditModel = resolveWorkerModels(
            executionMode,
            requestedModel,
            rawAudit.model,
            overriddenSubagentModels
          );
          const targetScopeNote = executionMode === "swarm"
            ? `Audit '${id}' provenance, verifiedFiles hashes, and Evidence Digest ('agy-squad digest <record.json>').`
            : `Audit '${id}' provenance, verifiedFiles hashes, and Evidence Digest ('agy-squad digest <record.json>') vs recorded conversationIds.`;
          const compiledAudit = buildSubagentSpec(
            {
              ...rawAudit,
              model: auditModel.compiledModel,
              instructions: [rawAudit.instructions, targetScopeNote].filter(Boolean).join("\n")
            },
            auditSquadId,
            manifestPathForBrief,
            auditItem.number,
            normalizedReportRoot,
            { executionMode, workspaceIsolation: "inherit", isIntegrityAuditor: true, precompiledSpecialists: true, boardSeqs }
          );
          const rawAuditName =
            auditSpecs.length > 1
              ? `audit-${id}-${rawAudit.role ?? auditItem.number}`
              : `audit-${id}`;
          const auditWorkerName = allocateWorkerName(usedWorkerNames, rawAuditName, "audit", truncatedWorkerNames);
          return {
            targetSquad: id,
            dispatchSquadId: allWorkingIds.length > 1 || hasTargetOverride ? `integrity_auditor:${id}` : "integrity_auditor",
            reportSlot: auditSlot,
            workerName: auditWorkerName,
            ...(executionMode === "swarm"
              ? {
                  swarmAdd: {
                    action: "add",
                    name: auditWorkerName,
                    ...(auditModel.swarmPin ? { model: auditModel.swarmPin } : {}),
                    workspace: "inherit",
                    brief: buildSwarmWorkerBrief(compiledAudit, auditModel.swarmPin, "inherit")
                  }
                }
              : { Subagent: compiledAudit })
          };
        });
        if (bundleRecordTemplates[id]) {
          bundleRecordTemplates[id].integrityAuditSlots = compiledAudits.map(entry => entry.reportSlot);
        }
        return compiledAudits;
      })
    : [];

  if (executionMode === "subagent" && !modelProvenance.warning && overriddenSubagentModels.length > 0) {
    const uniqueOverridden = [...new Set(overriddenSubagentModels)];
    modelProvenance.warning = `Manifest model(s) (${uniqueOverridden.join(", ")}) cannot be pinned under executionMode 'subagent'; compiled Model defaults to 'inherit'. Switch to executionMode 'swarm' to pin exact model IDs.`;
  }

  const scopeOverlaps = findScopeOverlaps(writableScopeEntries, root, options);
  const warnings = [
    ...new Set(auditWarnings),
    ...(strippedFlatLeads.length > 0
      ? [`Squad(s) ${strippedFlatLeads.join(", ")} define lead blocks that were validated and stripped under topology='flat'.`]
      : [])
  ];
  if (scopeOverlaps.length > 0 && workspaceIsolation === "inherit") {
    warnings.push(
      `Detected ${scopeOverlaps.length} writable sibling scopeFiles overlap(s) with workspaceIsolation='inherit'; split scopeFiles across workers or use executionMode='swarm' with workspaceIsolation='share'.`
    );
  }
  if (executionMode === "swarm" && truncatedWorkerNames.length > 0) {
    warnings.push(
      `Swarm worker names truncate at 24 characters (${truncatedWorkerNames.join(", ")}); if reusing an active /swarm board across separate plan calls, pass occupiedWorkerNames to prevent cross-plan name collisions.`
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

  const hasLead = workers.some(w => Boolean(w.lead));
  const hasFlat = workers.some(w => !w.lead);
  const compiledPattern = hasLead && hasFlat ? "mixed" : hasLead ? "layered" : "flat";
  const notes = [];
  if (executionMode === "swarm" && compiledPattern === "mixed") {
    notes.push(
      "Mixed plan: cohort combines layered squads (with per-squad leads) and flat squads (specialists reporting directly to the coordinator). Neither topology is forced as default; ask the user which topology they want if unspecified."
    );
  } else if (executionMode === "swarm" && compiledPattern === "layered") {
    notes.push(
      "Layered plan: working squad(s) define a squad lead on top of the swarm coordinator. Compared with flat plans (specialists reporting directly to the coordinator), layered plans isolate multi-domain syntheses at higher coordination token cost. Neither topology is forced as default; ask the user which topology they want if unspecified."
    );
  } else if (executionMode === "swarm") {
    notes.push(
      "Flat plan: specialists report directly to the swarm coordinator without per-squad leads. Compared with layered plans, flat plans use fewer coordination hops when a single synthesis suffices. Neither topology is forced as default; ask the user which topology they want if unspecified."
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
      compiledPattern,
      defaultBias: "none (ask user if unspecified)",
      workingSquads: targetWorkingIds.length,
      totalSpecialists,
      scopeOverlaps,
      scopeOverlapComparison: "canonical-when-present-else-lexical"
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
      transcriptIsolation: "L6 convention: keep raw transcripts in .system_generated/; never copy transcripts into scratch/ or lead/leaf directories.",
      identity: executionMode === "swarm"
        ? "Swarm identifies members by roster name: bundle assignments[].conversationId and handoffs[].sender use the swarm member name shown above and on the board."
        : "invoke_subagent returns a conversationId per child; record it in assignments[].conversationId and use it as handoffs[].sender.",
      coordinatorSessionModel: "<record-coordinator-model-from-swarm-status>",
      entries: provenanceEntries
    },
    integrityAuditPlan,
    bundleRecordTemplates,
    verificationPipeline: [
      ...(workspaceIsolation !== "inherit"
        ? ["agy-squad collect --plan <plan.json> --from <worktree-dir>..."]
        : []),
      "agy-squad fingerprint <changed-or-verified-files...>",
      "agy-squad bundle-init --plan <plan.json> <verified-files...>",
      "agy-squad inspect <bundle-record.json>",
      "agy-squad digest <bundle-record.json>",
      "agy-squad verdict --integrity <integrity-report.md>",
      "agy-squad bundle <bundle-record.json>",
      "agy-squad verify <report.sources.json>",
      "agy-squad prune <report.sources.json> <accepted-sha256>"
    ]
  };
}

function handleSquadPlanner(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE?.trim() || process.cwd()) {
  try {
    const plan = planSquadCohort(args, workspace);
    return {
      content: [{ type: "text", text: JSON.stringify(plan) }]
    };
  } catch (error) {
    const message = error.code === "ENOENT" ? formatNotFoundError(args, workspace) : error.message;
    return { isError: true, content: [{ type: "text", text: `squad_planner: ${message}` }] };
  }
}

export { findScopeOverlaps, handleSquadPlanner, normalizeScopePath, planSquadCohort, scopesOverlap };
