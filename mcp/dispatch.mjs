import fs from "node:fs";
import path from "node:path";
import { buildSubagentSpec } from "./briefs.mjs";

const defaultManifests = [
  "task-01-manifest.json",
  "swarm-manifest.json",
  ".scratch/swarm-manifest.json",
  "suite-manifest.json"
];

function assertWithinWorkspace(root, file) {
  const relative = path.relative(root, file);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("Manifest path must stay inside the workspace.");
  }
}

function readManifest(root, filename) {
  const candidate = path.resolve(root, filename);
  assertWithinWorkspace(root, candidate);
  const file = fs.realpathSync(candidate);
  assertWithinWorkspace(root, file);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
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
  if (!squads || typeof squads !== "object" || Array.isArray(squads) || Object.keys(squads).length === 0) {
    throw new Error("Manifest must define at least one squad.");
  }
  if (Object.hasOwn(squads, "all_l1")) {
    throw new Error("Squad ID 'all_l1' is reserved for lead compilation.");
  }
  return squads;
}

function appendTargetInstruction(spec, targetLine) {
  if (!spec || typeof spec !== "object") return spec;
  const usesPascal = spec.Instructions !== undefined;
  const key = usesPascal ? "Instructions" : "instructions";
  const existing = typeof spec[key] === "string" && spec[key].trim() ? `${spec[key].trim()}\n` : "";
  return { ...spec, [key]: `${existing}${targetLine}` };
}

function resolveIntegrityAuditor(squads, targetSquad) {
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
  if (squads.integrity_auditor !== undefined) {
    if (!squads.integrity_auditor || typeof squads.integrity_auditor !== "object" || Array.isArray(squads.integrity_auditor)) {
      throw new Error("Squad 'integrity_auditor' must be an object.");
    }
    if (!squads.integrity_auditor._synthesized) {
      if (squads.integrity_auditor.children !== undefined && squads.integrity_auditor.specialists !== undefined) {
        throw new Error("Squad 'integrity_auditor' cannot define both 'children' and 'specialists'.");
      }
      const customSpecs = squads.integrity_auditor.children ?? squads.integrity_auditor.specialists;
      const customLead = resolveSquadLead(squads.integrity_auditor, "integrity_auditor", false);
      if (Array.isArray(customSpecs) && customSpecs.length > 0) {
        if (customLead) buildSubagentSpec(customLead, slotId, undefined);
        return customSpecs.map((spec, index) => ({
          spec: appendTargetInstruction(spec, `Target Squad: ${resolvedTarget}`),
          id: slotId,
          number: index + 1
        }));
      }
      if (customLead) {
        throw new Error(
          "Custom 'integrity_auditor' defines a lead without specialists or children; add specialists/children or omit the lead."
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
        expectedDeliverable: `Markdown audit report recording 'Target Squad: ${resolvedTarget}' and strictly 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'.`
      },
      id: slotId,
      number: 1
    }
  ];
}

function loadSquads(root, manifestPath) {
  if (manifestPath !== undefined) {
    return readManifest(root, manifestPath);
  }

  let firstError;
  for (const candidate of defaultManifests) {
    try {
      return readManifest(root, candidate);
    } catch (error) {
      if (error.code !== "ENOENT") firstError ??= error;
    }
  }
  throw firstError ?? new Error("No squad manifest found. Pass a workspace-relative manifestPath.");
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
  return hasInlineLead || requireLead ? squad : undefined;
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

function handleDispatchSquad(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE || process.cwd()) {
  try {
    if (!args || typeof args !== "object" || Array.isArray(args) ||
        Object.keys(args).some(key => key !== "squadId" && key !== "manifestPath")) {
      throw new Error("Only squadId and manifestPath are supported.");
    }
    const { squadId, manifestPath } = args;
    if (typeof squadId !== "string" || !squadId.trim()) {
      throw new Error("Provide a squadId or use all_l1 for the leads.");
    }
    if (manifestPath !== undefined && (typeof manifestPath !== "string" || !manifestPath.trim())) {
      throw new Error("manifestPath must be a nonempty string.");
    }
    const root = fs.realpathSync(workspace);
    const { squads: loadedSquads, selectedManifest } = loadSquads(root, manifestPath);
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

    const build = ({ spec, id, number }) => buildSubagentSpec(spec, id, selectedManifest, number);
    let assignments;
    if (squadId === "all_l1") {
      const workingSquads = Object.entries(squads).filter(
        ([id]) => id !== "integrity_auditor" && !id.startsWith("integrity_auditor-")
      );
      assignments = workingSquads.map(([id, squad]) => ({
        spec: resolveSquadLead(squad, id, true),
        id
      }));
    } else if (isIntegrityAuditor) {
      assignments = resolveIntegrityAuditor(squads, flatTarget);
    } else {
      assignments = specialistAssignments(squads, squadId);
    }
    const Subagents = assignments.map(build);
    if (squadId === "all_l1") {
      const children = assignments.flatMap(({ id }) => specialistAssignments(squads, id));
      for (const child of children) build(child);
    } else if (!isIntegrityAuditor) {
      // Validate only the target squad's own lead (when present) without rebuilding unrelated sibling squads (S2-OPT2).
      const leadSpec = resolveSquadLead(squads[squadId], squadId, false);
      if (leadSpec) build({ spec: leadSpec, id: squadId });
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ Subagents }, null, 2) }]
    };
  } catch (error) {
    const message = error.code === "ENOENT" ? "Manifest or workspace not found." : error.message;
    return { isError: true, content: [{ type: "text", text: `dispatch_squad: ${message}` }] };
  }
}

export {
  assertWithinWorkspace,
  handleDispatchSquad,
  loadSquads,
  manifestSquads,
  readManifest,
  resolveIntegrityAuditor,
  resolveSquadLead,
  specialistAssignments
};
