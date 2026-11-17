import fs from "node:fs";
import path from "node:path";
import { buildSubagentSpec } from "./briefs.mjs";
import { validateSquadId } from "./verdicts.mjs";

const RETIRED_ADVERSARIAL_RE = /^adversarial_(?:review|l1|flat)$|^adversarial_/i;

const defaultManifests = [
  "task-01-manifest.json",
  "swarm-manifest.json",
  ".scratch/swarm-manifest.json",
  "suite-manifest.json"
];

function isWithinWorkspace(root, file) {
  const relative = path.relative(root, file);
  return !(relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative));
}

function assertWithinWorkspace(root, file) {
  if (!isWithinWorkspace(root, file)) {
    throw new Error("Manifest path must stay inside the workspace.");
  }
}

function readManifest(root, filename, logicalRoot = root) {
  const candidate = path.resolve(root, filename);
  if (path.isAbsolute(filename)) {
    if (!isWithinWorkspace(root, candidate) && !isWithinWorkspace(logicalRoot, candidate)) {
      throw new Error("Manifest path must stay inside the workspace.");
    }
  } else {
    assertWithinWorkspace(root, candidate);
  }
  const file = fs.realpathSync(candidate);
  assertWithinWorkspace(root, file);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
  let manifest;
  try {
    if (!fs.fstatSync(fd).isFile()) {
      throw new Error("Manifest path must name a regular file.");
    }
    // On WSL, check the opened descriptor in case a path changed after realpath.
    if (process.platform === "linux") {
      assertWithinWorkspace(root, fs.readlinkSync(`/proc/self/fd/${fd}`));
    }
    manifest = JSON.parse(fs.readFileSync(fd, "utf8"));
  } finally {
    fs.closeSync(fd);
  }
  return { squads: manifestSquads(manifest), selectedManifest: path.relative(root, file) };
}

function manifestSquads(manifest) {
  const squads = manifest?.squads;
  if (!squads || typeof squads !== "object" || Array.isArray(squads)) {
    throw new Error("Manifest must define at least one squad.");
  }
  const proto = Object.getPrototypeOf(squads);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error("Manifest 'squads' cannot define reserved prototype keys.");
  }
  const keys = Object.keys(squads);
  if (keys.length === 0) {
    throw new Error("Manifest must define at least one squad.");
  }
  for (const id of Object.getOwnPropertyNames(squads)) {
    if (id === "all_l1") {
      throw new Error("Squad ID 'all_l1' is reserved for lead compilation.");
    }
    if (RETIRED_ADVERSARIAL_RE.test(id)) {
      throw new Error(`Squad ID '${id}' was retired in Phase 2; migrate to 'integrity_auditor' (or 'integrity_auditor:<targetSquad>').`);
    }
    if (
      (/^integrity_auditor/i.test(id) && id !== "integrity_auditor" && !id.startsWith("integrity_auditor-")) ||
      id === "integrity_auditor-"
    ) {
      throw new Error(
        `Squad ID '${id}' uses a reserved integrity_auditor prefix; use exact 'integrity_auditor' or 'integrity_auditor-<targetSquad>'.`
      );
    }
    validateSquadId(id);
  }
  return squads;
}

function appendTargetInstruction(spec, targetLine) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return spec;
  if (spec.instructions !== undefined && spec.Instructions !== undefined && spec.instructions !== spec.Instructions) {
    throw new Error(`Agent '${spec.role ?? spec.Role ?? "unnamed"}' has conflicting instructions and Instructions fields.`);
  }
  const usesPascal = spec.Instructions !== undefined;
  const key = usesPascal ? "Instructions" : "instructions";
  const rawExisting = spec.Instructions ?? spec.instructions;
  if (rawExisting !== undefined && typeof rawExisting !== "string") {
    return spec;
  }
  const existing = typeof rawExisting === "string" && rawExisting.trim() ? `${rawExisting.trim()}\n` : "";
  const next = { ...spec, [key]: `${existing}${targetLine}` };
  if (usesPascal) {
    delete next.instructions;
  } else {
    delete next.Instructions;
  }
  return next;
}

function resolveIntegrityAuditor(squads, targetSquad, warnings = null) {
  const slotId = targetSquad ? `integrity_auditor-${targetSquad}` : "integrity_auditor";
  const targetIds = targetSquad
    ? [targetSquad]
    : Object.keys(squads).filter(
        id => id !== "integrity_auditor" && !id.startsWith("integrity_auditor-")
      );
  if (!targetSquad && targetIds.length > 1) {
    throw new Error(
      `Multiple working squads found (${targetIds.join(", ")}); specify 'integrity_auditor:<targetSquad>' for each squad.`
    );
  }
  const resolvedTarget = targetIds[0] ?? "all";
  const overrideKey = targetSquad ? `integrity_auditor-${targetSquad}` : null;
  const auditKey = overrideKey && Object.hasOwn(squads, overrideKey) ? overrideKey : "integrity_auditor";
  const auditSquad = squads[auditKey];
  if (auditSquad !== undefined) {
    if (!auditSquad || typeof auditSquad !== "object" || Array.isArray(auditSquad)) {
      throw new Error(`Squad '${auditKey}' must be an object.`);
    }
    if (!auditSquad._synthesized) {
      if (auditSquad.children !== undefined && auditSquad.specialists !== undefined) {
        throw new Error(`Squad '${auditKey}' cannot define both 'children' and 'specialists'.`);
      }
      const customSpecs = auditSquad.children ?? auditSquad.specialists;
      const customLead = resolveSquadLead(auditSquad, auditKey, false);
      if (customSpecs !== undefined) {
        if (!Array.isArray(customSpecs) || customSpecs.length === 0) {
          throw new Error(`Custom '${auditKey}' children or specialists must be a non-empty array.`);
        }
        if (customLead) {
          buildSubagentSpec(customLead, slotId, undefined, undefined, undefined, { isIntegrityAuditor: true });
          if (Array.isArray(warnings)) {
            warnings.push(`Custom '${auditKey}' lead is ignored in flat integrity_auditor execution; only its specialists run.`);
          }
        }
        return customSpecs.map((spec, index) => ({
          spec: appendTargetInstruction(spec, `Target Squad: ${resolvedTarget}`),
          id: slotId,
          number: index + 1
        }));
      }
      if (customLead) {
        throw new Error(
          `Custom '${auditKey}' defines a lead without specialists or children; add specialists/children or omit the lead.`
        );
      }
    }
  }
  return [
    {
      spec: {
        role: "Integrity Auditor",
        objective: `Audit working squad (${resolvedTarget}) for Subagent Alignment Policy compliance, empirical execution, absence of guessing or sycophancy, and truthfulness of reported evidence.`,
        scopeFiles: ["."],
        expectedDeliverable: `Markdown audit report recording 'Target Squad: ${resolvedTarget}', 'Evidence Digest: <sha256>' (via 'agy-squad digest <record.json>'), and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'.`
      },
      id: slotId,
      number: 1
    }
  ];
}

function loadSquads(root, manifestPath, logicalRoot = root) {
  if (manifestPath !== undefined) {
    return readManifest(root, manifestPath.trim(), logicalRoot);
  }

  let firstError;
  for (const candidate of defaultManifests) {
    try {
      return readManifest(root, candidate, logicalRoot);
    } catch (error) {
      if (error.code !== "ENOENT") firstError ??= error;
    }
  }
  const notFound = new Error("No squad manifest found. Pass a workspace-relative manifestPath.");
  notFound.code = "ENOENT";
  throw firstError ?? notFound;
}

const inlineLeadKeys = [
  "role",
  "Role",
  "objective",
  "Objective",
  "scopeFiles",
  "ScopeFiles",
  "instructions",
  "Instructions",
  "expectedDeliverable",
  "ExpectedDeliverable",
  "typeName",
  "TypeName",
  "model",
  "Model",
  "workspace",
  "Workspace"
];

function resolveSquadLead(squad, squadId, requireLead) {
  if (!squad || typeof squad !== "object" || Array.isArray(squad)) {
    throw new Error(`Squad '${squadId}' must be an object.`);
  }
  const hasInlineLead = inlineLeadKeys.some(key => squad[key] !== undefined);
  if (squad.lead !== undefined && hasInlineLead) {
    throw new Error(`Squad '${squadId}' cannot mix 'lead' with top-level lead fields.`);
  }
  if (squad.lead !== undefined) {
    if (!squad.lead || typeof squad.lead !== "object" || Array.isArray(squad.lead)) {
      throw new Error(`Lead for '${squadId}' must be an object.`);
    }
    return squad.lead;
  }
  return hasInlineLead
    ? squad
    : requireLead
      ? (() => {
          throw new Error(`Squad '${squadId}' does not define a lead (required for topology 'layered').`);
        })()
      : undefined;
}

function specialistAssignments(squads, squadId) {
  if (!Object.hasOwn(squads, squadId)) throw new Error(`Unknown squadId '${squadId}'.`);
  const squad = squads[squadId];
  if (!squad || typeof squad !== "object" || Array.isArray(squad)) {
    throw new Error(`Squad '${squadId}' must be an object.`);
  }
  if (squad.children !== undefined && squad.specialists !== undefined) {
    throw new Error(`Squad '${squadId}' cannot define both 'children' and 'specialists'.`);
  }
  const specialists = squad.children !== undefined ? squad.children : squad.specialists;
  if (!Array.isArray(specialists) || specialists.length === 0) {
    throw new Error(`Squad '${squadId}' must define children or specialists.`);
  }
  return specialists.map((spec, index) => ({ spec, id: squadId, number: index + 1 }));
}

const ALLOWED_DISPATCH_KEYS = new Set(["squadId", "manifestPath", "workspace"]);

function resolveCandidateWorkspace(argsWorkspace, fallbackWorkspace) {
  if (argsWorkspace !== undefined && (typeof argsWorkspace !== "string" || !argsWorkspace.trim())) {
    throw new Error("workspace must be a non-empty string.");
  }
  const candidate = argsWorkspace !== undefined
    ? argsWorkspace.trim()
    : typeof fallbackWorkspace === "string" && fallbackWorkspace.trim()
      ? fallbackWorkspace.trim()
      : "";
  if (!candidate) {
    throw new Error("workspace must be a non-empty string.");
  }
  return candidate;
}

function logicalWorkspaceRoot(argsWorkspace, fallbackWorkspace) {
  return path.resolve(resolveCandidateWorkspace(argsWorkspace, fallbackWorkspace));
}

function resolveWorkspaceRoot(argsWorkspace, fallbackWorkspace) {
  const candidate = resolveCandidateWorkspace(argsWorkspace, fallbackWorkspace);
  const root = fs.realpathSync(candidate);
  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`Workspace path must be a directory: '${candidate}'.`);
  }
  return root;
}

function formatNotFoundError(args, fallbackWorkspace) {
  const fallback = typeof fallbackWorkspace === "string" && fallbackWorkspace.trim()
    ? fallbackWorkspace.trim()
    : process.cwd();
  const attemptedWorkspace =
    typeof args?.workspace === "string" && args.workspace.trim() ? args.workspace.trim() : fallback;
  const manifestDetail =
    typeof args?.manifestPath === "string" && args.manifestPath.trim()
      ? `, manifestPath: '${args.manifestPath.trim()}'`
      : "";
  return `Manifest or workspace not found (workspace: '${attemptedWorkspace}'${manifestDetail}). Pass 'workspace' set to your active repository root, set AGY_SQUAD_WORKSPACE, or run 'node bin/agy-squad.mjs' from the repository root.`;
}

function handleDispatchSquad(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE?.trim() || process.cwd()) {
  try {
    if (!args || typeof args !== "object" || Array.isArray(args) ||
        Object.keys(args).some(key => !ALLOWED_DISPATCH_KEYS.has(key))) {
      throw new Error("Only squadId, manifestPath, and workspace are supported.");
    }
    const { squadId, manifestPath, workspace: argWorkspace } = args;
    if (typeof squadId !== "string" || !squadId.trim()) {
      throw new Error("Provide a squadId or use all_l1 for the leads.");
    }
    if (manifestPath !== undefined && (typeof manifestPath !== "string" || !manifestPath.trim())) {
      throw new Error("manifestPath must be a nonempty string.");
    }
    const root = resolveWorkspaceRoot(argWorkspace, workspace);
    const logicalRoot = logicalWorkspaceRoot(argWorkspace, workspace);
    const { squads: loadedSquads, selectedManifest } = loadSquads(root, manifestPath, logicalRoot);
    const squads = { ...loadedSquads };
    const isIntegrityAuditor = squadId === "integrity_auditor" || squadId.startsWith("integrity_auditor:");
    const hasTargetColon = isIntegrityAuditor && squadId.includes(":");
    const flatTarget = hasTargetColon ? squadId.slice(squadId.indexOf(":") + 1).trim() : undefined;
    if (hasTargetColon && !flatTarget) {
      throw new Error(`Specify a non-empty target squad after ':' in '${squadId}'.`);
    }
    if (
      flatTarget &&
      (flatTarget === "integrity_auditor" ||
        flatTarget.startsWith("integrity_auditor-") ||
        !Object.hasOwn(squads, flatTarget))
    ) {
      throw new Error(`Unknown targetSquad '${flatTarget}'.`);
    }

    if (!isIntegrityAuditor && (squadId === "integrity_auditor" || squadId.startsWith("integrity_auditor-"))) {
      const colonTarget =
        squadId === "integrity_auditor" ? "integrity_auditor" : `integrity_auditor:${squadId.slice("integrity_auditor-".length)}`;
      throw new Error(`Squad ID '${squadId}' is reserved for integrity audit overrides; dispatch it via '${colonTarget}'.`);
    }

    const delegateWorkspace = argWorkspace !== undefined ? root : undefined;
    const warnings = [];
    const build = ({ spec, id, number }, emitWarnings = false) =>
      buildSubagentSpec(spec, id, selectedManifest, number, undefined, {
        isIntegrityAuditor,
        workspace: delegateWorkspace,
        ...(emitWarnings ? { warnings } : {})
      });
    let assignments;
    if (squadId === "all_l1") {
      const workingSquads = Object.entries(squads).filter(
        ([id]) => id !== "integrity_auditor" && !id.startsWith("integrity_auditor-")
      );
      if (workingSquads.length === 0) {
        throw new Error("Manifest must define at least one non-audit working squad.");
      }
      assignments = workingSquads.map(([id, squad]) => ({
        spec: resolveSquadLead(squad, id, true),
        id
      }));
    } else if (isIntegrityAuditor) {
      assignments = resolveIntegrityAuditor(squads, flatTarget, warnings);
    } else {
      assignments = specialistAssignments(squads, squadId);
    }
    const Subagents = assignments.map(item => build(item, true));
    if (squadId === "all_l1") {
      const children = assignments.flatMap(({ id }) => specialistAssignments(squads, id));
      for (const child of children) build(child, false);
    } else if (!isIntegrityAuditor) {
      // Validate only the target squad's own lead (when present) without rebuilding unrelated sibling squads (S2-OPT2).
      const leadSpec = resolveSquadLead(squads[squadId], squadId, false);
      if (leadSpec) build({ spec: leadSpec, id: squadId }, false);
    }
    const uniqueWarnings = [...new Set(warnings)];
    return {
      content: [{ type: "text", text: JSON.stringify({ Subagents, ...(uniqueWarnings.length > 0 ? { warnings: uniqueWarnings } : {}) }) }]
    };
  } catch (error) {
    const message = error.code === "ENOENT" ? formatNotFoundError(args, workspace) : error.message;
    return { isError: true, content: [{ type: "text", text: `dispatch_squad: ${message}` }] };
  }
}

export {
  assertWithinWorkspace,
  defaultManifests,
  formatNotFoundError,
  handleDispatchSquad,
  loadSquads,
  logicalWorkspaceRoot,
  manifestSquads,
  readManifest,
  resolveIntegrityAuditor,
  resolveSquadLead,
  resolveWorkspaceRoot,
  specialistAssignments
};
