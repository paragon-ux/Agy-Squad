import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import util from "node:util";
import { AGENT_ALIAS_PAIRS, READONLY_SUBAGENT_TYPE, SUBAGENT_MODEL_ALIASES, buildSubagentSpec, validateScopeFiles } from "./briefs.mjs";
import {
  formatNotFoundError,
  loadSquads,
  manifestSquads,
  resolveIntegrityAuditor,
  resolveSquadLead,
  resolveWorkspaceRoots,
  specialistAssignments
} from "./dispatch.mjs";
import {
  CONTROL_CHAR_RE,
  bundlePath,
  ensureDirectory,
  expandScopeEntriesToFiles,
  normalizeContainedJsonOutPath,
  normalizeReportRoot,
  publish,
  recordSlotPath,
  relativizeContainedCliPath,
  reportPath,
  trimTrailingSlashes
} from "./handoffs.mjs";

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
  "readOnly",
  "readOnlySubagent",
  "roleScopes",
  "includeIntegrityAuditor",
  "reportRoot",
  "knownModels",
  "occupiedWorkerNames",
  "topology",
  "boardSince",
  "boardSeqs",
  "outPath",
  "swarmPaneOutPath",
  "emitWave",
  "replace",
  "compact"
]);

const WORKSPACE_ISOLATIONS = new Set(["inherit", "share", "branch"]);
const MAX_SWARM_NAME_LENGTH = 24;
const RESERVED_SWARM_NAMES = new Set(["all", "coordinator", "narrator", "monitor"]);
const isReservedSwarmName = (name) => RESERVED_SWARM_NAMES.has(name) || name.startsWith("coordinator-");

function trimEdgeDashes(value) {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === "-") start++;
  while (end > start && value[end - 1] === "-") end--;
  return value.slice(start, end);
}

function trimTrailingDashes(value) {
  let end = value.length;
  while (end > 0 && value[end - 1] === "-") end--;
  return value.slice(0, end);
}

function unclippedSlugLength(value) {
  return trimEdgeDashes(
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
  ).length;
}

function slugifyName(value, fallback) {
  const slug = trimTrailingDashes(
    trimEdgeDashes(
      String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
    ).slice(0, MAX_SWARM_NAME_LENGTH)
  );
  if (slug) return slug;
  const fallbackSlug = trimTrailingDashes(
    trimEdgeDashes(
      String(fallback ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
    ).slice(0, MAX_SWARM_NAME_LENGTH)
  );
  return fallbackSlug || "worker";
}

function allocateWorkerName(usedWorkerNames, rawValue, fallback, truncatedTracker, roleOpts = {}) {
  const { rolePrefix = "", roleSuffix = "" } = roleOpts;
  const cleanRawSlug = trimEdgeDashes(
    String(rawValue ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
  );
  const stripRoleAffixes = (slug) => {
    let s = slug;
    if (rolePrefix && s.startsWith(rolePrefix)) s = s.slice(rolePrefix.length);
    if (roleSuffix && s.endsWith(roleSuffix)) s = s.slice(0, s.length - roleSuffix.length);
    return trimEdgeDashes(s);
  };
  let rawBase;
  if (
    cleanRawSlug &&
    cleanRawSlug.length <= MAX_SWARM_NAME_LENGTH &&
    (!rolePrefix || cleanRawSlug.startsWith(rolePrefix)) &&
    (!roleSuffix || cleanRawSlug.endsWith(roleSuffix))
  ) {
    rawBase = cleanRawSlug;
  } else if (rolePrefix || roleSuffix) {
    const core = stripRoleAffixes(cleanRawSlug) || stripRoleAffixes(slugifyName(fallback, "w")) || "w";
    const maxCoreLen = Math.max(1, MAX_SWARM_NAME_LENGTH - rolePrefix.length - roleSuffix.length);
    const slicedCore = trimEdgeDashes(core.slice(0, maxCoreLen)) || "w";
    rawBase = trimEdgeDashes(`${rolePrefix}${slicedCore}${roleSuffix}`);
  } else {
    rawBase = slugifyName(rawValue, fallback);
  }
  let base = rawBase;
  if (isReservedSwarmName(base)) {
    if (roleSuffix) {
      const maxCore = Math.max(1, MAX_SWARM_NAME_LENGTH - 2 - roleSuffix.length);
      const core = trimEdgeDashes(stripRoleAffixes(base).slice(0, maxCore)) || "w";
      base = `w-${core}${roleSuffix}`;
    } else {
      base = trimTrailingDashes(`w-${base}`.slice(0, MAX_SWARM_NAME_LENGTH));
    }
  }
  const recordIfTruncated = (candidate) => {
    if (
      Array.isArray(truncatedTracker) &&
      (cleanRawSlug.length > MAX_SWARM_NAME_LENGTH || (candidate.length >= MAX_SWARM_NAME_LENGTH && candidate !== cleanRawSlug))
    ) {
      truncatedTracker.push(candidate);
    }
    return candidate;
  };
  if (!usedWorkerNames.has(base) && !isReservedSwarmName(base)) {
    usedWorkerNames.add(base);
    return recordIfTruncated(base);
  }
  const safeFallback = slugifyName(fallback, "worker");
  for (let counter = 2; ; counter++) {
    const counterSuffix = `-${counter}`;
    let candidate;
    if (rolePrefix || roleSuffix) {
      const combinedSuffix = `${roleSuffix}${counterSuffix}`;
      const maxCoreLen = Math.max(1, MAX_SWARM_NAME_LENGTH - rolePrefix.length - combinedSuffix.length);
      const baseCore = stripRoleAffixes(base) || stripRoleAffixes(safeFallback) || "w";
      const prefixCore = trimEdgeDashes(baseCore.slice(0, maxCoreLen)) || "w";
      candidate = `${rolePrefix}${prefixCore}${combinedSuffix}`;
    } else {
      const maxPrefixLen = Math.max(1, MAX_SWARM_NAME_LENGTH - counterSuffix.length);
      const prefix =
        trimTrailingDashes(base.slice(0, maxPrefixLen)) ||
        trimTrailingDashes(safeFallback.slice(0, maxPrefixLen)) ||
        "w";
      candidate = `${prefix}${counterSuffix}`;
    }
    if (!usedWorkerNames.has(candidate) && !isReservedSwarmName(candidate)) {
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
  if (
    specModelRaw !== undefined &&
    (typeof specModelRaw !== "string" || !specModelRaw.trim() || CONTROL_CHAR_RE.test(specModelRaw))
  ) {
    throw new Error("Agent model must be a non-empty string without control characters.");
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
    compiledModel: targetModel ?? "inherit"
  };
}

function resolvePathThroughMissing(targetPath, depth = 0) {
  if (depth > 16) return null;
  try {
    return fs.realpathSync.native(targetPath);
  } catch (err) {
    if (err?.code !== "ENOENT" && err?.code !== "ENOTDIR") return null;
  }
  let cur = path.resolve(targetPath);
  const tail = [];
  while (true) {
    try {
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink()) {
        const parentReal = resolvePathThroughMissing(path.dirname(cur), depth + 1);
        if (!parentReal) return null;
        const nextTarget = path.resolve(parentReal, fs.readlinkSync(cur));
        const resolved = resolvePathThroughMissing(nextTarget, depth + 1);
        if (!resolved) return null;
        return tail.length ? path.join(resolved, ...tail) : resolved;
      }
      const real = fs.realpathSync.native(cur);
      return tail.length ? path.join(real, ...tail) : real;
    } catch (err) {
      if (err?.code !== "ENOENT" && err?.code !== "ENOTDIR") return null;
    }
    const parent = path.dirname(cur);
    if (parent === cur) {
      return tail.length ? path.join(cur, ...tail) : cur;
    }
    tail.unshift(path.basename(cur));
    cur = parent;
  }
}

function resolveScopeCaseInsensitive(options) {
  return typeof options?.caseInsensitive === "boolean"
    ? options.caseInsensitive
    : os.platform() === "win32" || os.platform() === "darwin";
}

function resolveCanonicalRootKey(root, caseInsensitive, cachedCanonicalRoot) {
  let canonicalRoot = cachedCanonicalRoot;
  if (!canonicalRoot && root) {
    canonicalRoot = path.resolve(root);
    try {
      canonicalRoot = fs.realpathSync.native(canonicalRoot);
    } catch {}
  }
  if (!canonicalRoot) return undefined;
  const normalized = trimTrailingSlashes(canonicalRoot.split(path.sep).join("/")) || "/";
  return caseInsensitive ? normalized.toLowerCase() : normalized;
}

function isSameOrParentPath(parent, child) {
  if (parent === child) return true;
  if (parent === "/") return child.startsWith("/");
  return child.startsWith(`${parent}/`);
}

function normalizedScopesOverlap(normA, normB, canonicalRootKey) {
  if (normA === "" || normB === "") return true;
  const extA = normA.startsWith("external:");
  const extB = normB.startsWith("external:");
  if (extA && extB) {
    const pathA = normA.slice("external:".length);
    const pathB = normB.slice("external:".length);
    return isSameOrParentPath(pathA, pathB) || isSameOrParentPath(pathB, pathA);
  }
  if (extA || extB) {
    if (!canonicalRootKey) return false;
    const extPath = (extA ? normA : normB).slice("external:".length);
    return isSameOrParentPath(extPath, canonicalRootKey);
  }
  return isSameOrParentPath(normA, normB) || isSameOrParentPath(normB, normA);
}

function normalizeScopePath(scopeEntry, root, options = {}) {
  let resolvedRoot = root;
  let resolvedOptions = options;
  if (root && typeof root === "object") {
    resolvedOptions = root;
    resolvedRoot = undefined;
  }
  const safeOptions = resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : {};
  const caseInsensitive = resolveScopeCaseInsensitive(safeOptions);
  const applyCase = value => (caseInsensitive ? value.toLowerCase() : value);

  let trimmed = trimTrailingSlashes(
    scopeEntry
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/^(?:\.\/)+/, "")
      .replace(/\/\.(?=\/|$)/g, "")
  );
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
                try {
                  cached = { exists: true, real: fs.realpathSync.native(curPath) };
                } catch (symErr) {
                  if (symErr?.code === "ENOENT" || symErr?.code === "ENOTDIR") {
                    const resolvedDangling = resolvePathThroughMissing(
                      path.resolve(curReal, fs.readlinkSync(curPath)),
                      1
                    );
                    cached = resolvedDangling ? { exists: true, real: resolvedDangling } : { exists: false };
                  } else {
                    cached = { error: true };
                  }
                }
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
          const externalTarget = trimTrailingSlashes(resolvedTarget.split(path.sep).join("/")) || "/";
          result = `external:${applyCase(externalTarget)}`;
          if (Array.isArray(safeOptions.warnings)) {
            safeOptions.warnings.push(
              `Scope path '${trimmed}' resolves outside workspace root ('${resolvedTarget}'); verify symlink boundaries before running writable workers.`
            );
          }
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
  const safeOptions = resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : {};
  const caseInsensitive = resolveScopeCaseInsensitive(safeOptions);
  let canonicalRoot = safeOptions.canonicalRoot;
  if (!canonicalRoot && resolvedRoot) {
    canonicalRoot = path.resolve(resolvedRoot);
    try {
      canonicalRoot = fs.realpathSync.native(canonicalRoot);
    } catch {}
  }
  const scopedOptions = canonicalRoot ? { ...safeOptions, canonicalRoot } : safeOptions;
  const normA = normalizeScopePath(a, resolvedRoot, scopedOptions);
  const normB = normalizeScopePath(b, resolvedRoot, scopedOptions);
  const canonicalRootKey = resolveCanonicalRootKey(resolvedRoot, caseInsensitive, canonicalRoot);
  return normalizedScopesOverlap(normA, normB, canonicalRootKey);
}

function findScopeOverlaps(entries, root, options = {}) {
  let resolvedRoot = root;
  let resolvedOptions = options;
  if (root && typeof root === "object") {
    resolvedOptions = root;
    resolvedRoot = undefined;
  }
  const safeOptions = resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : {};
  if (!Array.isArray(entries) || entries.length === 0) return [];
  if (entries.length < 2 && !Array.isArray(safeOptions.warnings)) return [];
  let canonicalRoot;
  if (resolvedRoot) {
    canonicalRoot = path.resolve(resolvedRoot);
    try {
      canonicalRoot = fs.realpathSync.native(canonicalRoot);
    } catch {}
  }
  const scopedOptions = {
    ...safeOptions,
    canonicalRoot,
    normCache: new Map(),
    segmentCache: new Map()
  };
  const canonicalRootKey = resolveCanonicalRootKey(
    resolvedRoot,
    resolveScopeCaseInsensitive(scopedOptions),
    canonicalRoot
  );
  const normalizedEntries = entries.map((entry, workerIdx) => {
    const deduped = [];
    const seenNorm = new Set();
    for (const raw of entry.scopeFiles) {
      const norm = normalizeScopePath(raw, resolvedRoot, scopedOptions);
      if (!seenNorm.has(norm)) {
        seenNorm.add(norm);
        deduped.push({ workerIdx, scopeIdx: deduped.length, raw, norm });
      }
    }
    return { workerIdx, label: entry.label, squadId: entry.squadId, roleType: entry.roleType, scopes: deduped };
  });
  if (normalizedEntries.length < 2) return [];

  const workerCount = normalizedEntries.length;
  const pairMatches = new Map();
  const recordPair = (itemA, itemB) => {
    if (itemA.workerIdx === itemB.workerIdx) return;
    const left = itemA.workerIdx < itemB.workerIdx ? itemA : itemB;
    const right = itemA.workerIdx < itemB.workerIdx ? itemB : itemA;
    const key = left.workerIdx * workerCount + right.workerIdx;
    let bucket = pairMatches.get(key);
    if (!bucket) {
      bucket = { leftIdx: left.workerIdx, rightIdx: right.workerIdx, seen: new Set(), items: [] };
      pairMatches.set(key, bucket);
    }
    const pairTag = `${left.scopeIdx}:${right.scopeIdx}`;
    if (!bucket.seen.has(pairTag)) {
      bucket.seen.add(pairTag);
      bucket.items.push({ leftScopeIdx: left.scopeIdx, rightScopeIdx: right.scopeIdx, leftRaw: left.raw, rightRaw: right.raw });
    }
  };

  const wildcards = [];
  const relItems = [];
  const extItems = [];
  const rootCoveringExt = [];
  for (const entry of normalizedEntries) {
    for (const item of entry.scopes) {
      if (item.norm === "") {
        wildcards.push(item);
      } else if (item.norm.startsWith("external:")) {
        const extPath = item.norm.slice("external:".length);
        const extItem = { ...item, pathKey: extPath, sortKey: extPath.replace(/\//g, "\0") };
        extItems.push(extItem);
        if (canonicalRootKey && isSameOrParentPath(extPath, canonicalRootKey)) {
          rootCoveringExt.push(extItem);
        }
      } else {
        relItems.push({ ...item, pathKey: item.norm, sortKey: item.norm.replace(/\//g, "\0") });
      }
    }
  }

  for (const wc of wildcards) {
    for (const other of normalizedEntries) {
      if (other.workerIdx === wc.workerIdx) continue;
      for (const s of other.scopes) recordPair(wc, s);
    }
  }
  for (const extItem of rootCoveringExt) {
    for (const relItem of relItems) recordPair(extItem, relItem);
  }

  const sweepSortedPrefix = (items) => {
    if (items.length < 2) return;
    items.sort((a, b) =>
      a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : a.workerIdx - b.workerIdx || a.scopeIdx - b.scopeIdx
    );
    const stack = [];
    for (const item of items) {
      while (stack.length > 0 && !isSameOrParentPath(stack[stack.length - 1].pathKey, item.pathKey)) {
        stack.pop();
      }
      for (const anc of stack) {
        if (anc.workerIdx !== item.workerIdx) recordPair(anc, item);
      }
      stack.push(item);
    }
  };
  sweepSortedPrefix(relItems);
  sweepSortedPrefix(extItems);

  const sortedBuckets = [...pairMatches.values()].sort((a, b) => a.leftIdx - b.leftIdx || a.rightIdx - b.rightIdx);
  return sortedBuckets.map(bucket => {
    const left = normalizedEntries[bucket.leftIdx];
    const right = normalizedEntries[bucket.rightIdx];
    bucket.items.sort((a, b) => a.leftScopeIdx - b.leftScopeIdx || a.rightScopeIdx - b.rightScopeIdx);
    const isLeadSpecialist =
      left.squadId !== undefined &&
      left.squadId === right.squadId &&
      left.roleType !== right.roleType &&
      (left.roleType === "lead" || right.roleType === "lead");
    return {
      workerA: left.label,
      workerB: right.label,
      kind: isLeadSpecialist ? "lead-specialist" : "sibling",
      pairs: bucket.items.map(p => `${p.leftRaw} <-> ${p.rightRaw}`)
    };
  });
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

function deriveTaskSquads(task, roles, scopeFiles, options = {}) {
  const { readOnly, roleScopes } = options;
  const validatedScopes = validateScopeFiles(scopeFiles === undefined ? ["."] : scopeFiles, "task");
  if (roles !== undefined && (!Array.isArray(roles) || roles.length === 0)) {
    throw new Error("roles must be a non-empty array of non-empty strings.");
  }
  const roleList = roles ?? ["Task Worker"];
  const trimmedRoles = roleList.map((role, index) => {
    if (typeof role !== "string" || !role.trim()) {
      throw new Error(`Role at index ${index} must be a non-empty string.`);
    }
    return role.trim();
  });
  let validatedRoleScopes;
  if (roleScopes !== undefined) {
    if (!roleScopes || typeof roleScopes !== "object" || Array.isArray(roleScopes)) {
      throw new Error("roleScopes must be an object mapping role names to non-empty scopeFiles arrays.");
    }
    const keys = Object.keys(roleScopes);
    if (keys.length === 0) {
      throw new Error("roleScopes must map at least one role name to scopeFiles.");
    }
    const validRoleSet = new Set(trimmedRoles);
    validatedRoleScopes = Object.create(null);
    for (const rawKey of keys) {
      const trimmedKey = rawKey.trim();
      if (
        !trimmedKey ||
        trimmedKey === "__proto__" ||
        trimmedKey === "constructor" ||
        trimmedKey === "prototype"
      ) {
        throw new Error(`Invalid roleScopes key '${rawKey}'.`);
      }
      if (!validRoleSet.has(trimmedKey)) {
        throw new Error(`Unknown roleScopes key '${trimmedKey}'; expected one of: ${trimmedRoles.join(", ")}.`);
      }
      if (Object.hasOwn(validatedRoleScopes, trimmedKey)) {
        throw new Error(`Duplicate roleScopes key '${trimmedKey}'.`);
      }
      validatedRoleScopes[trimmedKey] = validateScopeFiles(roleScopes[rawKey], trimmedKey);
    }
  }
  const specialists = trimmedRoles.map((roleName) => ({
    role: roleName,
    objective: trimmedRoles.length === 1 ? task.trim() : `${task.trim()} — Focus: ${roleName}.`,
    scopeFiles: validatedRoleScopes?.[roleName] ?? validatedScopes,
    ...(readOnly === true ? { readOnly: true } : {}),
    expectedDeliverable: "Markdown evidence report with verified file paths, commands, exit codes, and test outputs."
  }));
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
 * or invoke_subagent dispatch, explicit model provenance, scope-overlap checks, and transcript-safe
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

  for (const [key, maxItems, maxLength] of [["scopeFiles", 256, 512], ["roles", 64, 160], ["knownModels", 128, 160], ["occupiedWorkerNames", 256, 64], ["boardSeqs", 256, null]]) {
    const value = args[key];
    if (Array.isArray(value) && (value.length > maxItems || (maxLength && value.some(v => typeof v === "string" && v.length > maxLength)))) throw new Error(`${key} exceeds its schema bounds.`);
  }
  for (const [key, maxLength] of [["reportRoot", 256], ["outPath", 512], ["swarmPaneOutPath", 512]]) {
    if (typeof args[key] === "string" && args[key].length > maxLength) throw new Error(`${key} exceeds its schema bounds.`);
  }
  if (args.roleScopes !== undefined) {
    const value = args.roleScopes;
    if (value && typeof value === "object" && !Array.isArray(value) && (Object.keys(value).length > 64 || Object.values(value).some(v => Array.isArray(v) && (v.length > 256 || v.some(p => typeof p === "string" && p.length > 512))))) throw new Error("roleScopes exceeds its schema bounds.");
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
    readOnly,
    roleScopes,
    includeIntegrityAuditor = true,
    reportRoot,
    knownModels,
    occupiedWorkerNames,
    topology,
    boardSince,
    boardSeqs,
    outPath,
    swarmPaneOutPath,
    emitWave,
    replace,
    compact
  } = args;

  if (topology !== undefined && topology !== "flat" && topology !== "layered") {
    throw new Error("topology must be 'flat' or 'layered'.");
  }
  if (replace !== undefined && typeof replace !== "boolean") {
    throw new Error("replace must be a boolean.");
  }
  if (compact !== undefined && typeof compact !== "boolean") {
    throw new Error("compact must be a boolean.");
  }
  if (replace === true && outPath === undefined && swarmPaneOutPath === undefined) {
    throw new Error("replace requires outPath or swarmPaneOutPath.");
  }
  if (outPath !== undefined && (typeof outPath !== "string" || !outPath.trim() || CONTROL_CHAR_RE.test(outPath))) {
    throw new Error("outPath must be a non-empty workspace-relative .json path.");
  }
  if (
    swarmPaneOutPath !== undefined &&
    (typeof swarmPaneOutPath !== "string" || !swarmPaneOutPath.trim() || CONTROL_CHAR_RE.test(swarmPaneOutPath))
  ) {
    throw new Error("swarmPaneOutPath must be a non-empty .json path.");
  }
  if (args?.readOnlySubagent !== undefined && typeof args.readOnlySubagent !== "boolean") {
    throw new Error("readOnlySubagent must be a boolean.");
  }
 
  if (emitWave !== undefined) {
    if (typeof emitWave !== "number" || !Number.isInteger(emitWave) || emitWave < 1 || emitWave > 3) {
      throw new Error("emitWave must be 1, 2, or 3.");
    }
    if (compact === true) {
      throw new Error("emitWave cannot be combined with compact: true.");
    }
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
  if (args?.readOnlySubagent === true && executionMode !== "subagent") {
    throw new Error("readOnlySubagent requires executionMode 'subagent'.");
  }
  if (swarmPaneOutPath !== undefined && executionMode !== "swarm") {
    throw new Error("swarmPaneOutPath is only supported with executionMode 'swarm'.");
  }
  if (emitWave !== undefined && executionMode !== "swarm") {
    throw new Error("emitWave is only supported with executionMode 'swarm'.");
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
  if (model !== undefined && (typeof model !== "string" || !model.trim() || CONTROL_CHAR_RE.test(model))) {
    throw new Error("model must be a non-empty string without control characters when provided.");
  }
  if (includeIntegrityAuditor !== undefined && typeof includeIntegrityAuditor !== "boolean") {
    throw new Error("includeIntegrityAuditor must be a boolean.");
  }
  if (readOnly !== undefined && typeof readOnly !== "boolean") {
    throw new Error("readOnly must be a boolean.");
  }
  const normalizedReportRoot = reportRoot !== undefined ? normalizeReportRoot(reportRoot) : undefined;

  const { root, logicalRoot } = resolveWorkspaceRoots(argWorkspace, workspace);
  let normalizedOutRel;
  let waveFiles;
  if (outPath !== undefined) {
    normalizedOutRel = normalizePlanOutPath(outPath, root);
    if (executionMode === "swarm") {
      const outBase = normalizedOutRel.slice(0, -5);
      waveFiles = {
        wave1: `${outBase}.wave1.json`,
        wave2: `${outBase}.wave2.json`
      };
    }
  }
  const swarmPaneTarget =
    swarmPaneOutPath !== undefined ? resolveSwarmPaneOutTarget(swarmPaneOutPath, root) : undefined;
  let loadedSquads;
  let selectedManifest;
  if (task !== undefined) {
    if (typeof task !== "string" || !task.trim()) {
      throw new Error("task must be a non-empty string.");
    }
    if (topology === "layered") {
      throw new Error("topology 'layered' requires a manifest with per-squad leads; use topology 'flat' (or omit topology) with task.");
    }
    loadedSquads = deriveTaskSquads(task, roles, scopeFiles, { readOnly, roleScopes });
    selectedManifest = "inline-task";
  } else if (manifest !== undefined) {
    if (scopeFiles !== undefined || roles !== undefined || readOnly !== undefined || roleScopes !== undefined) {
      throw new Error("scopeFiles, roles, readOnly, and roleScopes can only be passed with task.");
    }
    loadedSquads = manifestSquads(manifest);
    selectedManifest = "inline-manifest";
  } else {
    if (typeof manifestPath !== "string" || !manifestPath.trim()) {
      throw new Error("manifestPath must be a non-empty string.");
    }
    if (scopeFiles !== undefined || roles !== undefined || readOnly !== undefined || roleScopes !== undefined) {
      throw new Error("scopeFiles, roles, readOnly, and roleScopes can only be passed with task.");
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
        verificationMethod: "Verify running models via swarm{action:\"status\"}.",
        caveat: requestedModel
          ? "Pinned per swarm add; coordinator/monitor use host model."
          : explicitInheritRequested
            ? "Explicit 'inherit'; workers use coordinator model."
            : "No explicit model passed; workers use coordinator model."
      }
    : {
        executionMode: "subagent",
        requestedModel: requestedModel ?? "inherit",
        effectiveModel: effectiveSubagentModel,
        pinningSupported: false,
        perChildModelExposed: false,
        verificationMethod: "invoke_subagent inherits/aliases ('inherit'|'flash'|'flash_lite'|'pro'); session transcripts/manage_subagents omit per-child model IDs.",
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
  const readerScopeEntries = [];
  const workers = [];
  const usedWorkerNames = new Set(RESERVED_SWARM_NAMES);
  for (const occupied of occupiedWorkerNames ?? []) {
    const trimmed = occupied.trim();
    usedWorkerNames.add(trimmed);
    usedWorkerNames.add(slugifyName(trimmed, trimmed));
  }
  const overriddenSubagentModels = [];
  const subagentRequestedModels = new Set();
  const subagentEffectiveModels = new Set();
  const recordSubagentWorkerModel = (workerModel) => {
    if (executionMode !== "subagent" || !workerModel) return;
    if (workerModel.requested && workerModel.requested !== "inherit") {
      subagentRequestedModels.add(workerModel.requested);
    }
    if (workerModel.effective && workerModel.effective !== "inherit") {
      subagentEffectiveModels.add(workerModel.effective);
    }
  };
  const strippedFlatLeads = [];
  const truncatedWorkerNames = [];
  const fileMetricsCache = new Map();
  const isSingleSquadInlineTask = selectedManifest === "inline-task" && targetWorkingIds.length === 1;
  let totalSpecialists = 0;

  for (const id of targetWorkingIds) {
    const squad = loadedSquads[id];
    let customWorkerPrefix;
    if (squad.workerPrefix !== undefined) {
      if (
        typeof squad.workerPrefix !== "string" ||
        !squad.workerPrefix.trim() ||
        CONTROL_CHAR_RE.test(squad.workerPrefix) ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/.test(squad.workerPrefix.trim())
      ) {
        throw new Error(
          `Squad '${id}' workerPrefix must be a 1..16 char alphanumeric/dash/underscore string starting with a letter or digit.`
        );
      }
      customWorkerPrefix = slugifyName(squad.workerPrefix.trim(), id);
    }
    const namingPrefix = customWorkerPrefix ?? (isSingleSquadInlineTask ? "" : id);
    const resolvedLeadSpec = resolveSquadLead(squad, id, topology === "layered");
    if (topology === "flat" && resolvedLeadSpec) {
      const { canonical: canonicalStrippedLead } = canonicalizeAgentSpec(resolvedLeadSpec, `${id}-lead`);
      buildSubagentSpec(canonicalStrippedLead, id, manifestPathForBrief, undefined, normalizedReportRoot, {
        executionMode,
        workspaceIsolation: "inherit",
        validateOnly: true,
        isCanonicalSpec: true
      });
      strippedFlatLeads.push(id);
    }
    const leadSpec = topology === "flat" ? undefined : resolvedLeadSpec;
    const specs = specialistAssignments(loadedSquads, id);
    totalSpecialists += specs.length;

    const leadSlot = reportPath(id, undefined, normalizedReportRoot);
    const recordSlot = recordSlotPath(id, normalizedReportRoot);
    const specialistReportSlots = specs.map(({ number }) => reportPath(id, number, normalizedReportRoot));
    let compiledLead;
    let leadModel;
    let leadWorkerName;
    let leadScope;
    let leadReadOnlyVal;
    let leadRoleTitle;
    if (leadSpec) {
      const leadRawBase = namingPrefix ? `${namingPrefix}-lead` : `${id}-lead`;
      leadWorkerName = allocateWorkerName(usedWorkerNames, leadRawBase, `${id}-lead`, truncatedWorkerNames, {
        roleSuffix: "-lead"
      });
      const { canonical: rawLead, readOnly: leadReadOnly } = canonicalizeAgentSpec(leadSpec, `${id}-lead`);
      leadReadOnlyVal = leadReadOnly;
      leadRoleTitle = rawLead.role ?? "Squad Lead";
      leadScope = validateScopeFiles(rawLead.scopeFiles, rawLead.role);
      if (leadReadOnly !== true) {
        writableScopeEntries.push({
          label: `${id}-lead (${rawLead.role ?? "Lead"})`,
          scopeFiles: leadScope,
          squadId: id,
          roleType: "lead"
        });
      }
      leadModel = resolveWorkerModels(
        executionMode,
        requestedModel,
        rawLead.model,
        overriddenSubagentModels
      );
      recordSubagentWorkerModel(leadModel);
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
          workspaceRoot: root,
          fileMetricsCache,
          readOnly: leadReadOnly,
          specialistReportSlots,
          boardSince,
          isCanonicalSpec: true,
          prevalidatedScope: leadScope,
          precomputedArtifact: leadSlot
        }
      );
    }

    const compiledSpecialists = [];
    for (const { spec, number } of specs) {
      const { canonical: rawSpec, readOnly: specReadOnly } = canonicalizeAgentSpec(spec, `${id}#${number}`);
      const specScope = validateScopeFiles(rawSpec.scopeFiles, rawSpec.role);
      const workerLabel = `${id}#${number} (${rawSpec.role ?? `Specialist ${number}`})`;
      if (specReadOnly !== true) {
        writableScopeEntries.push({
          label: workerLabel,
          scopeFiles: specScope,
          squadId: id,
          roleType: "specialist"
        });
      } else {
        readerScopeEntries.push({
          label: workerLabel,
          scopeFiles: specScope,
          squadId: id,
          roleType: "specialist"
        });
      }
      const specModel = resolveWorkerModels(
        executionMode,
        requestedModel,
        rawSpec.model,
        overriddenSubagentModels
      );
      recordSubagentWorkerModel(specModel);
      const useReadOnlySubagent =
        args?.readOnlySubagent === true &&
        specReadOnly === true &&
        rawSpec.typeName === undefined &&
        rawSpec.TypeName === undefined;
      const subSpec = {
        ...rawSpec,
        ...(useReadOnlySubagent ? { typeName: READONLY_SUBAGENT_TYPE } : {}),
        model: specModel.compiledModel
      };
      const slot = specialistReportSlots[number - 1];
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
          workspaceRoot: root,
          fileMetricsCache,
          readOnly: specReadOnly,
          boardSince,
          isCanonicalSpec: true,
          prevalidatedScope: specScope,
          precomputedArtifact: slot
        }
      );
      const rawRolePart = rawSpec.role ?? String(number);
      const rawSpecName = namingPrefix ? `${namingPrefix}-${rawRolePart}` : String(rawRolePart);
      const specFallback = namingPrefix ? `${namingPrefix}-s${number}` : `s${number}`;
      const workerName = allocateWorkerName(
        usedWorkerNames,
        rawSpecName,
        specFallback,
        truncatedWorkerNames,
        { roleSuffix: unclippedSlugLength(rawSpecName) > MAX_SWARM_NAME_LENGTH ? `-s${number}` : "" }
      );
      compiledSpecialists.push({
        slot,
        workerName,
        specModel,
        compiled,
        scopeFiles: specScope,
        readOnly: specReadOnly,
        roleTitle: rawSpec.role ?? `Specialist ${number}`
      });
    }

    const squadIsReadOnly =
      options?.readOnly === true ||
      readOnly === true ||
      (compiledSpecialists.length > 0 &&
        compiledSpecialists.every(s => s.readOnly === true) &&
        (!compiledLead || leadReadOnlyVal === true));

    workers.push({
      squadId: id,
      ...(customWorkerPrefix ? { workerPrefix: customWorkerPrefix } : {}),
      synthesisSlot: leadSlot,
      recordSlot,
      ...(squadIsReadOnly ? { readOnly: true } : {}),
      lead: compiledLead
        ? {
            workerName: leadWorkerName,
            wave: 2,
            reportSlot: leadSlot,
            scopeFiles: leadScope,
            ...(typeof leadReadOnlyVal === "boolean" ? { readOnly: leadReadOnlyVal } : {}),
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
      specialists: compiledSpecialists.map(({ slot, workerName, specModel, compiled, scopeFiles: specScope, readOnly: sRo }) => ({
        workerName,
        wave: 1,
        reportSlot: slot,
        scopeFiles: specScope,
        ...(typeof sRo === "boolean" ? { readOnly: sRo } : {}),
        ...(compiled.TypeName === READONLY_SUBAGENT_TYPE ? { typeName: READONLY_SUBAGENT_TYPE } : {}),
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
      })),
      _paneMeta: {
        leadRoleTitle,
        specialistRoles: compiledSpecialists.map(s => ({ workerName: s.workerName, roleTitle: s.roleTitle }))
      }
    });
  }

  const wsCliArg = /[\s"'`$\\]/.test(root) ? JSON.stringify(root) : root;
  const auditWarnings = [];
  const validatedAuditKeys = new Set();
  const integrityAuditPlan = includeIntegrityAuditor
    ? targetWorkingIds.flatMap(id => {
        const squadObj = loadedSquads[id];
        const auditPrefixBase =
          squadObj?.workerPrefix !== undefined
            ? slugifyName(squadObj.workerPrefix.trim(), id)
            : isSingleSquadInlineTask
              ? "task"
              : id;
        const squadRecordSlot = recordSlotPath(id, normalizedReportRoot);
        const hasTargetOverride = Object.hasOwn(loadedSquads, `integrity_auditor-${id}`);
        const auditTargetArg =
          allWorkingIds.length > 1 || targetWorkingIds.length > 1 || hasTargetOverride ? id : undefined;
        const auditSpecs = resolveIntegrityAuditor(loadedSquads, auditTargetArg, auditWarnings, {
          validatedAuditKeys,
          reportRoot: normalizedReportRoot
        });
        return auditSpecs.map(auditItem => {
          const auditSquadId = auditItem.id;
          const auditSlot = reportPath(auditSquadId, auditItem.number, normalizedReportRoot);
          const { canonical: rawAudit } = canonicalizeAgentSpec(auditItem.spec, `${auditSquadId}#${auditItem.number}`);
          const auditModel = resolveWorkerModels(
            executionMode,
            requestedModel,
            rawAudit.model,
            overriddenSubagentModels
          );
          recordSubagentWorkerModel(auditModel);
          const targetScopeNote = executionMode === "swarm"
            ? `Run 'agy-squad digest --workspace ${wsCliArg} ${squadRecordSlot}' & 'agy-squad verdict --workspace ${wsCliArg} --integrity ${auditSlot}'; '${id}' slots/traces only (no unrelated repo source reads).`
            : `Run 'agy-squad digest --workspace ${wsCliArg} ${squadRecordSlot}' & 'agy-squad verdict --workspace ${wsCliArg} --integrity ${auditSlot}'; '${id}' slots, conversationIds & traces only (no unrelated repo source reads).`;
          const compiledAudit = buildSubagentSpec(
            {
              ...rawAudit,
              model: auditModel.compiledModel,
              instructions:
                rawAudit.instructions === undefined || typeof rawAudit.instructions === "string"
                  ? [rawAudit.instructions, targetScopeNote].filter(Boolean).join("\n")
                  : rawAudit.instructions
            },
            auditSquadId,
            manifestPathForBrief,
            auditItem.number,
            normalizedReportRoot,
            {
              executionMode,
              workspaceIsolation: "inherit",
              isIntegrityAuditor: true,
              precompiledSpecialists: true,
              workspaceRoot: root,
              fileMetricsCache,
              boardSeqs,
              isCanonicalSpec: true,
              precomputedArtifact: auditSlot
            }
          );
          const rawAuditName =
            auditSpecs.length > 1
              ? `audit-${auditPrefixBase}-${rawAudit.role ?? auditItem.number}`
              : `audit-${auditPrefixBase}`;
          const auditRoleSuffix =
            auditSpecs.length > 1 && unclippedSlugLength(rawAuditName) > MAX_SWARM_NAME_LENGTH
              ? `-s${auditItem.number}`
              : "";
          const auditWorkerName = allocateWorkerName(
            usedWorkerNames,
            rawAuditName,
            "audit",
            truncatedWorkerNames,
            { rolePrefix: "audit-", roleSuffix: auditRoleSuffix }
          );
          return {
            targetSquad: id,
            wave: 3,
            dispatchSquadId: allWorkingIds.length > 1 || hasTargetOverride ? `integrity_auditor:${id}` : "integrity_auditor",
            reportSlot: auditSlot,
            recordSlot: squadRecordSlot,
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
      })
    : [];

  if (executionMode === "subagent" && !requestedModel) {
    if (subagentRequestedModels.size > 0) {
      modelProvenance.requestedModel = `per-worker (${[...subagentRequestedModels].join(", ")})`;
    }
    if (subagentEffectiveModels.size > 0) {
      modelProvenance.effectiveModel = `per-worker (${[...subagentEffectiveModels].join(", ")})`;
    }
  }
  if (executionMode === "subagent" && !modelProvenance.warning && overriddenSubagentModels.length > 0) {
    const uniqueOverridden = [...new Set(overriddenSubagentModels)];
    modelProvenance.warning = `Manifest model(s) (${uniqueOverridden.join(", ")}) cannot be pinned under executionMode 'subagent'; compiled Model defaults to 'inherit'. Switch to executionMode 'swarm' to pin exact model IDs.`;
  }

  const scopeEscapeWarnings = [];
  const scopeOverlaps = findScopeOverlaps(writableScopeEntries, root, {
    ...(options && typeof options === "object" ? options : {}),
    warnings: scopeEscapeWarnings
  });
  const siblingOverlaps = scopeOverlaps.filter(item => item.kind !== "lead-specialist");
  const leadSpecialistOverlaps = scopeOverlaps.filter(item => item.kind === "lead-specialist");

  const rawReaderOverlaps = findScopeOverlaps(readerScopeEntries, root, {
    ...(options && typeof options === "object" ? options : {})
  }).filter(item => item.kind === "sibling");
  let readerSiblingOverlaps = [];
  if (rawReaderOverlaps.length > 0) {
    const readerEntryByLabel = new Map(readerScopeEntries.map(e => [e.label, e]));
    const expandedReaderCache = new Map();
    const getExpandedReaderFiles = (entry) => {
      if (expandedReaderCache.has(entry.label)) return expandedReaderCache.get(entry.label);
      const nonWildcard = entry.scopeFiles.filter(s => s !== ".");
      if (nonWildcard.length === 0) {
        expandedReaderCache.set(entry.label, null);
        return null;
      }
      const existing = nonWildcard.filter(s => {
        try {
          const st = fs.lstatSync(path.join(root, s));
          return !st.isSymbolicLink() && (st.isFile() || st.isDirectory());
        } catch {
          return false;
        }
      });
      if (existing.length === 0) {
        expandedReaderCache.set(entry.label, new Set());
        return expandedReaderCache.get(entry.label);
      }
      try {
        const files = expandScopeEntriesToFiles(
          root,
          existing,
          entry.squadId ?? "reader",
          new Set([root]),
          normalizedReportRoot ?? "scratch/agy-squad",
          { maxFiles: 512, allowEmptyResult: true }
        );
        const set = new Set(files);
        expandedReaderCache.set(entry.label, set);
        return set;
      } catch {
        expandedReaderCache.set(entry.label, null);
        return null;
      }
    };
    for (const ov of rawReaderOverlaps) {
      const entryA = readerEntryByLabel.get(ov.workerA);
      const entryB = readerEntryByLabel.get(ov.workerB);
      if (!entryA || !entryB) continue;
      const normSetA = new Set(entryA.scopeFiles.map(s => normalizeScopePath(s, root)));
      const hasDuplicateEntry = entryB.scopeFiles.some(s => normSetA.has(normalizeScopePath(s, root)));
      const filesA = getExpandedReaderFiles(entryA);
      const filesB = getExpandedReaderFiles(entryB);
      let overlapRatio = hasDuplicateEntry ? 1 : 0;
      if (filesA && filesB && filesA.size > 0 && filesB.size > 0) {
        let shared = 0;
        for (const f of filesA) if (filesB.has(f)) shared++;
        overlapRatio = Number((shared / Math.min(filesA.size, filesB.size)).toFixed(2));
      } else if (filesA === null || filesB === null) {
        overlapRatio = 1;
      }
      if (hasDuplicateEntry || overlapRatio > 0.25) {
        readerSiblingOverlaps.push({ ...ov, overlapRatio });
      }
    }
  }

  const warnings = [
    ...new Set(auditWarnings),
    ...new Set(scopeEscapeWarnings),
    ...(strippedFlatLeads.length > 0
      ? [`Squad(s) ${strippedFlatLeads.join(", ")} define lead blocks that were validated and stripped under topology='flat'.`]
      : [])
  ];
  if (siblingOverlaps.length > 0 && workspaceIsolation === "inherit") {
    warnings.push(
      `Detected ${siblingOverlaps.length} writable sibling scopeFiles overlap(s) with workspaceIsolation='inherit'; split scopeFiles across workers or use executionMode='swarm' with workspaceIsolation='share'.`
    );
  }
  if (
    readerSiblingOverlaps.length > 0 &&
    !(selectedManifest === "inline-task" && roleScopes === undefined)
  ) {
    warnings.push(
      `Detected ${readerSiblingOverlaps.length} read-only sibling reader overlap(s) (>25% shared files or duplicate paths); partition reader scopes to avoid duplicate context reads.`
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
      modelProvenance.caveat = explicitInheritRequested
        ? "Top-level 'inherit' passed, but worker/lead specs pin explicit models; verify actual running IDs via swarm{action:\"status\"}."
        : "Top-level model omitted, but worker/lead specs pin explicit models; verify actual running IDs via swarm{action:\"status\"}.";
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

  const paneTasks = Object.create(null);
  const rawThreads = [];
  const usedThreadIds = new Set(["t-additional-squads"]);
  for (const w of workers) {
    const meta = w._paneMeta;
    delete w._paneMeta;
    const threadWorkers = [];
    for (const sr of meta?.specialistRoles ?? []) {
      paneTasks[sr.workerName] = String(sr.roleTitle).slice(0, 64);
      threadWorkers.push(sr.workerName);
    }
      if (w.lead) {
        paneTasks[w.lead.workerName] = `Synthesize ${w.squadId}`.slice(0, 64);
        threadWorkers.push(w.lead.workerName);
      }
      for (const a of integrityAuditPlan.filter(item => item.targetSquad === w.squadId)) {
        paneTasks[a.workerName] = `Audit ${w.squadId} traces`.slice(0, 64);
        threadWorkers.push(a.workerName);
      }
      const threadBase = `t-${slugifyName(w.squadId, "squad")}`;
      let threadId = threadBase;
      for (let suffix = 2; usedThreadIds.has(threadId); suffix++) threadId = `${threadBase}-${suffix}`;
      usedThreadIds.add(threadId);
      rawThreads.push({
        id: threadId,
        title: w.squadId.replace(/[_-]+/g, " ").slice(0, 48),
        goal: `Verify & bundle ${w.squadId}.`,
        tasks: threadWorkers
      });
    }
    const threads =
      rawThreads.length <= 6
        ? rawThreads
        : [
            ...rawThreads.slice(0, 5),
            {
              id: "t-additional-squads",
              title: "Additional squads",
              goal: "Verify & bundle remaining squads.",
              tasks: rawThreads.slice(5).flatMap(t => t.tasks)
            }
          ];
    const rawGoalWords = (typeof task === "string" && task.trim()
      ? task.trim()
      : `Governed multi-squad review across ${path.basename(root) || "workspace"}`
    ).split(/\s+/).filter(Boolean);
    const goalTitle = (rawGoalWords.length >= 4
      ? rawGoalWords.slice(0, 8).join(" ")
      : [...rawGoalWords, "governed", "squad", "verification", "pass"].slice(0, 6).join(" ")
    ).slice(0, 80);
    const swarmPane =
      executionMode === "swarm"
        ? {
            goal: {
              title: goalTitle,
              line: includeIntegrityAuditor
                ? "Run specialists, synthesize evidence, audit traces, and seal bundles."
                : "Run specialists, synthesize evidence, and seal SHA-256 bundles."
            },
            tasks: paneTasks,
            threads
          }
        : undefined;

  const waves = {
    wave1: workers.flatMap(w => w.specialists.map(s => s.workerName)),
    wave2: workers.filter(w => Boolean(w.lead)).map(w => w.lead.workerName),
    wave3: integrityAuditPlan.map(a => a.workerName)
  };

  const hasLead = workers.some(w => Boolean(w.lead));
  const hasFlat = workers.some(w => !w.lead);
  const flatSynthesisSlots = workers.filter(w => !w.lead).map(w => w.synthesisSlot);
  const compiledPattern = hasLead && hasFlat ? "mixed" : hasLead ? "layered" : "flat";
  const allSquadsReadOnly = workers.length > 0 && workers.every(w => w.readOnly === true);
  const hasWildcardScope = workers.some(w =>
    w.specialists.some(s => Array.isArray(s.scopeFiles) && s.scopeFiles.includes(".")) ||
    (Array.isArray(w.lead?.scopeFiles) && w.lead.scopeFiles.includes("."))
  );

  const planCliRef = normalizedOutRel ?? "<plan.json>";
  const fileSpecArg = hasWildcardScope ? "<verified-files...>" : "--from-scope";
  const singleWorker = workers.length === 1 ? workers[0] : null;
  const singleRecordSlot = singleWorker ? singleWorker.recordSlot : null;
  const singleBundleSlot = singleWorker ? bundlePath(singleWorker.squadId, normalizedReportRoot) : null;
  const multiRecordSlots = workers.map(w => w.recordSlot).join(" ");
  const multiRecordPins = workers.map(w => `${w.recordSlot}=<accepted-sha256>`).join(" ");

  const verificationPipeline = [
    ...(workspaceIsolation !== "inherit"
      ? [`agy-squad collect --workspace ${wsCliArg} --plan ${planCliRef} --handoffs <handoffs.json>`]
      : []),
    ...(flatSynthesisSlots.length > 0
      ? [`# Write synthesis ('Content Verdict: PASS|FAIL|BLOCKED'): ${flatSynthesisSlots.join(", ")}`]
      : []),
    singleRecordSlot
      ? `agy-squad bundle-init --workspace ${wsCliArg} --plan ${planCliRef} --handoffs <handoffs.json>${includeIntegrityAuditor ? " --digest" : ""} --out ${singleRecordSlot} ${fileSpecArg}`
      : `agy-squad bundle-init --workspace ${wsCliArg} --plan ${planCliRef} --all-squads --handoffs <handoffs.json>${includeIntegrityAuditor ? " --digest" : ""} ${fileSpecArg}`,
    singleRecordSlot
      ? `agy-squad finalize --workspace ${wsCliArg} ${singleRecordSlot}${includeIntegrityAuditor ? "" : " --allow-unaudited"} [--strict-citations] [--prune [--keep-reports]]`
      : `agy-squad finalize --workspace ${wsCliArg} ${multiRecordSlots}${includeIntegrityAuditor ? "" : " --allow-unaudited"} [--strict-citations] [--prune [--keep-reports]]`,
    singleBundleSlot
      ? `# Post-synthesis prune (finalize without --prune first, synthesize once): agy-squad prune --workspace ${wsCliArg} ${singleBundleSlot} <sha256>`
      : `# Post-synthesis prune (finalize without --prune first, synthesize once): agy-squad prune --workspace ${wsCliArg} --records ${multiRecordPins} [--clean-records]`
  ];

  const recordedSwarmPanePath = swarmPaneTarget
    ? swarmPaneTarget.kind === "workspace"
      ? swarmPaneTarget.relPath
      : swarmPaneTarget.absPath
    : undefined;

  const plan = {
    plannerVersion: "2.0.0",
    source: selectedManifest,
    workspace: root,
    ...(normalizedReportRoot ? { reportRoot: normalizedReportRoot } : {}),
    ...(normalizedOutRel ? { path: normalizedOutRel } : {}),
    ...(waveFiles ? { waveFiles } : {}),
    ...(recordedSwarmPanePath ? { swarmPanePath: recordedSwarmPanePath } : {}),
    executionMode,
    workspaceIsolation,
    ...(allSquadsReadOnly ? { readOnly: true } : {}),
    ...(includeIntegrityAuditor === false ? { includeIntegrityAuditor: false } : {}),
    topology: {
      compiledPattern,
      defaultBias:
        "flat for inline task; wave-gated otherwise (zero-interview defaults; ask_question only on writable inherit siblingOverlaps or explicit ambiguity)",
      workingSquads: targetWorkingIds.length,
      totalSpecialists,
      scopeOverlaps,
      siblingOverlaps,
      leadSpecialistOverlaps,
      readerSiblingOverlaps,
      scopeOverlapComparison: "canonical-when-present-else-lexical"
    },
    waves,
    ...(swarmPane ? { swarmPane } : {}),
    modelProvenance,
    ...(modelValidation ? { modelValidation } : {}),
    warnings,
    ...(executionMode === "swarm"
      ? { preflight: ["swarm{action:\"models\"}", "swarm{action:\"status\"}"] }
      : {}),
    workers,
    integrityAuditPlan,
    verificationPipeline
  };

  const targets = [normalizedOutRel && path.join(root, normalizedOutRel), ...Object.values(waveFiles ?? {}).map(rel => path.join(root, rel)), swarmPaneTarget?.absPath ?? (swarmPaneTarget?.relPath ? path.join(root, swarmPaneTarget.relPath) : undefined)].filter(Boolean);
  for (const target of targets) {
    let st;
    try { st = fs.lstatSync(target); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (st.isSymbolicLink()) throw new Error(`Refusing symlink output path: ${target}`);
    if (!st.isFile()) throw new Error(`Expected a regular file at output path: ${target}`);
    if (!replace) throw new Error(`Target already exists: ${target} (pass --replace / replace: true to overwrite).`);
  }
  const verifiedOutDirs = new Set([root]);
  if (normalizedOutRel !== undefined) {
    const parentDir = path.posix.dirname(normalizedOutRel);
    if (parentDir && parentDir !== ".") {
      ensureDirectory(root, parentDir, [], verifiedOutDirs);
    }
    const planBytes = Buffer.from(serializePlanJson(plan), "utf8");
    publish(root, normalizedOutRel, planBytes, Boolean(replace), verifiedOutDirs, undefined, { sync: false });
    if (waveFiles) {
      for (const [waveNum, sidecarRel] of [
        [1, waveFiles.wave1],
        [2, waveFiles.wave2]
      ]) {
        const waveSlice = buildWaveSlice(plan, waveNum);
        const waveBytes = Buffer.from(serializeWaveSliceJson(waveSlice), "utf8");
        publish(root, sidecarRel, waveBytes, Boolean(replace), verifiedOutDirs, undefined, { sync: false });
      }
    }
  }
  if (swarmPaneTarget && swarmPane) {
    const paneBytes = Buffer.from(JSON.stringify(swarmPane, null, 2) + "\n", "utf8");
    if (swarmPaneTarget.kind === "workspace") {
      const paneParent = path.posix.dirname(swarmPaneTarget.relPath);
      if (paneParent && paneParent !== ".") {
        ensureDirectory(root, paneParent, [], verifiedOutDirs);
      }
      publish(root, swarmPaneTarget.relPath, paneBytes, Boolean(replace), verifiedOutDirs, undefined, { sync: false });
    } else {
      writeBrainSwarmPaneFile(swarmPaneTarget.baseDir, swarmPaneTarget.absPath, paneBytes, Boolean(replace));
    }
  }

  return plan;
}

const PLAN_EXPANDED_ARRAY_KEYS = new Set(["workers", "integrityAuditPlan", "verificationPipeline"]);
const WAVE_SLICE_EXPANDED_ARRAY_KEYS = new Set(["swarmAdd"]);

function serializeCompactJsonWithExpandedArrays(obj, expandedKeys) {
  const entries = Object.entries(obj);
  const lines = ["{"];
  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    const comma = i < entries.length - 1 ? "," : "";
    const kJson = JSON.stringify(key);
    if (expandedKeys.has(key) && Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`  ${kJson}: []${comma}`);
      } else {
        lines.push(`  ${kJson}: [`);
        for (let j = 0; j < val.length; j++) {
          const itemComma = j < val.length - 1 ? "," : "";
          lines.push(`    ${JSON.stringify(val[j])}${itemComma}`);
        }
        lines.push(`  ]${comma}`);
      }
    } else {
      lines.push(`  ${kJson}: ${JSON.stringify(val)}${comma}`);
    }
  }
  lines.push("}\n");
  return lines.join("\n");
}

const serializePlanJson = (plan) => serializeCompactJsonWithExpandedArrays(plan, PLAN_EXPANDED_ARRAY_KEYS);
const serializeWaveSliceJson = (slice) => serializeCompactJsonWithExpandedArrays(slice, WAVE_SLICE_EXPANDED_ARRAY_KEYS);

function resolveSwarmPaneOutTarget(rawPath, canonicalRoot, platform = process.platform) {
  const trimmed = typeof rawPath === "string" ? rawPath.trim() : "";
  if (trimmed && path.isAbsolute(trimmed)) {
    const relativized = relativizeContainedCliPath(trimmed, canonicalRoot, { platform, allowEqual: false });
    if (relativized) {
      return { kind: "workspace", relPath: normalizePlanOutPath(relativized, canonicalRoot, platform) };
    }
    const resolvedAbs = path.resolve(trimmed);
    const home = process.env.AGY_TEST_HOME_DIR || os.homedir();
    const geminiBase = path.resolve(path.join(home, ".gemini"));
    let canonicalGemini = geminiBase;
    if (fs.existsSync(geminiBase)) {
      const geminiStat = fs.lstatSync(geminiBase);
      if (geminiStat.isSymbolicLink() || geminiStat.isDirectory()) {
        canonicalGemini = fs.realpathSync.native(geminiBase);
      } else {
        throw new Error(`Invalid ~/.gemini directory along swarmPaneOutPath: ${geminiBase}`);
      }
    }
    const brainPattern = /^antigravity[^/]*\/brain\/[A-Za-z0-9_-]+\/\.system_generated\/swarm\/plan\.json$/;
    for (const candidateBase of [geminiBase, canonicalGemini]) {
      const rel = path.relative(candidateBase, resolvedAbs).split(path.sep).join("/");
      if (brainPattern.test(rel)) {
        const relParts = rel.split("/");
        if (relParts.every(p => p && p !== "." && p !== "..")) {
          return { kind: "brain", baseDir: canonicalGemini, absPath: path.join(canonicalGemini, ...relParts) };
        }
      }
    }
    throw new Error(
      `swarmPaneOutPath must be a workspace-relative .json path inside workspace or ~/.gemini/antigravity*/brain/<id>/.system_generated/swarm/plan.json: ${rawPath}`
    );
  }
  return { kind: "workspace", relPath: normalizePlanOutPath(trimmed, canonicalRoot, platform) };
}

function writeBrainSwarmPaneFile(baseDir, absPath, bytes, allowReplace) {
  if (fs.existsSync(baseDir)) {
    const baseStat = fs.lstatSync(baseDir);
    if (baseStat.isSymbolicLink() || !baseStat.isDirectory()) {
      throw new Error(`Invalid or symlinked base directory along swarmPaneOutPath: ${baseDir}`);
    }
  } else {
    fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });
  }
  const relParts = path.relative(baseDir, absPath).split(path.sep);
  if (relParts.length === 0 || relParts.some(p => !p || p === "." || p === "..")) {
    throw new Error(`Invalid swarmPaneOutPath outside canonical ~/.gemini root: ${absPath}`);
  }
  let cur = baseDir;
  for (let i = 0; i < relParts.length - 1; i++) {
    cur = path.join(cur, relParts[i]);
    let st;
    try { st = fs.lstatSync(cur); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (st) {
      if (st.isSymbolicLink() || !st.isDirectory()) {
        throw new Error(`Invalid or symlinked directory along swarmPaneOutPath: ${cur}`);
      }
    } else {
      fs.mkdirSync(cur, { mode: 0o700 });
    }
  }
  let outputStat;
  try { outputStat = fs.lstatSync(absPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (outputStat) {
    const st = outputStat;
    if (st.isSymbolicLink() || !st.isFile()) {
      throw new Error(`Refusing to write non-regular file at swarmPaneOutPath: ${absPath}`);
    }
    if (!allowReplace) {
      throw new Error(`Target already exists: ${absPath} (pass --replace / replace: true to overwrite).`);
    }
  }
  const tmpPath = `${absPath}.tmp-${process.pid}-${randomUUID()}`;
  fs.writeFileSync(tmpPath, bytes, { mode: 0o600, flag: "wx" });
  try {
    if (allowReplace) fs.renameSync(tmpPath, absPath);
    else fs.linkSync(tmpPath, absPath); // exclusive create: fails with EEXIST if a file appeared since the check
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch {}
    throw err;
  }
  if (!allowReplace) fs.unlinkSync(tmpPath);
}

function buildWaveSlice(plan, waveNumber) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error("Provide a valid squad_planner JSON object.");
  }
  if (plan.executionMode !== "swarm") {
    throw new Error("Wave slice extraction requires executionMode 'swarm'.");
  }
  if (waveNumber !== 1 && waveNumber !== 2 && waveNumber !== 3) {
    throw new Error(`Unsupported wave '${waveNumber}'; expected 1, 2, or 3.`);
  }
  const workers = Array.isArray(plan.workers) ? plan.workers : [];
  const audits = Array.isArray(plan.integrityAuditPlan) ? plan.integrityAuditPlan : [];
  let entries;
  let workerNames;
  if (waveNumber === 1) {
    entries = workers.flatMap(w =>
      (w.specialists ?? [])
        .filter(s => Boolean(s?.swarmAdd))
        .map(s => ({ squadId: w.squadId, ...s.swarmAdd }))
    );
    workerNames = plan.waves?.wave1 ?? entries.map(e => e.name);
  } else if (waveNumber === 2) {
    entries = workers
      .filter(w => Boolean(w.lead?.swarmAdd))
      .map(w => ({ squadId: w.squadId, ...w.lead.swarmAdd }));
    workerNames = plan.waves?.wave2 ?? entries.map(e => e.name);
  } else {
    entries = audits
      .filter(a => Boolean(a?.swarmAdd))
      .map(a => ({ targetSquad: a.targetSquad, recordSlot: a.recordSlot, ...a.swarmAdd }));
    workerNames = plan.waves?.wave3 ?? entries.map(e => e.name);
  }
  return {
    ok: true,
    wave: waveNumber,
    ...(plan.path ? { planPath: plan.path } : {}),
    workspace: plan.workspace,
    workerNames,
    swarmAdd: entries
  };
}

function normalizePlanOutPath(rawOutPath, canonicalRoot, platform = process.platform) {
  return normalizeContainedJsonOutPath(rawOutPath, canonicalRoot, "outPath", platform);
}

function buildCompactPlanSummary(plan, explicitPath) {
  const resolvedPath = explicitPath ?? plan?.path;
  return {
    ok: true,
    ...(resolvedPath !== undefined ? { path: resolvedPath } : {}),
    ...(plan.waveFiles ? { waveFiles: plan.waveFiles } : {}),
    ...(plan.swarmPanePath ? { swarmPanePath: plan.swarmPanePath } : {}),
    workspace: plan.workspace,
    ...(plan.reportRoot ? { reportRoot: plan.reportRoot } : {}),
    executionMode: plan.executionMode,
    workspaceIsolation: plan.workspaceIsolation,
    ...(plan.readOnly ? { readOnly: true } : {}),
    topology: {
      compiledPattern: plan.topology.compiledPattern,
      workingSquads: plan.topology.workingSquads,
      totalSpecialists: plan.topology.totalSpecialists,
      siblingOverlapsCount: plan.topology.siblingOverlaps.length,
      readerSiblingOverlapsCount: (plan.topology.readerSiblingOverlaps ?? []).length
    },
    squadIds: plan.workers.map(w => w.squadId),
    waves: plan.waves,
    ...(plan.swarmPane ? { swarmPane: plan.swarmPane } : {}),
    workersSummary: plan.workers.map(w => ({
      squadId: w.squadId,
      synthesisSlot: w.synthesisSlot,
      recordSlot: w.recordSlot,
      lead: w.lead ? { workerName: w.lead.workerName, reportSlot: w.lead.reportSlot, wave: w.lead.wave } : null,
      specialists: w.specialists.map(s => ({ workerName: s.workerName, reportSlot: s.reportSlot, wave: s.wave })),
      auditors: (plan.integrityAuditPlan ?? [])
        .filter(a => a.targetSquad === w.squadId)
        .map(a => ({ workerName: a.workerName, reportSlot: a.reportSlot, wave: a.wave }))
    })),
    warnings: plan.warnings
  };
}

function handleSquadPlanner(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE?.trim() || process.cwd()) {
  try {
    const plan = planSquadCohort(args, workspace);
    let payload;
    if (args?.emitWave !== undefined) {
      payload = buildWaveSlice(plan, args.emitWave);
    } else {
      const emitCompact = args?.outPath !== undefined ? args.compact !== false : args?.compact === true;
      payload = emitCompact ? buildCompactPlanSummary(plan, plan.path) : plan;
    }
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }]
    };
  } catch (error) {
    const message = error.code === "ENOENT" ? formatNotFoundError(args, workspace) : error.message;
    return { isError: true, content: [{ type: "text", text: `squad_planner: ${message}` }] };
  }
}

export { buildCompactPlanSummary, buildWaveSlice, findScopeOverlaps, handleSquadPlanner, normalizeScopePath, planSquadCohort, scopesOverlap };
