import fs from "node:fs";
import path from "node:path";
import { buildSubagentSpec } from "./briefs.mjs";
import { reportPath } from "./handoffs.mjs";
import { stagePlan } from "./run-state.mjs";

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
      assertWithinWorkspace(root, fs.realpathSync(`/proc/self/fd/${fd}`));
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

function handleDispatchSquad(args = {}, workspace = process.env.AGY_SQUAD_WORKSPACE || process.cwd(), run) {
  try {
    if (!args || typeof args !== "object" || Array.isArray(args) ||
        Object.keys(args).some(key => key !== "squadId" && key !== "manifestPath" && !(run && key === "manifest"))) {
      throw new Error(run ? "Only squadId, manifestPath, and manifest are supported." : "Only squadId and manifestPath are supported.");
    }
    const { squadId, manifestPath, manifest } = args;
    if (typeof squadId !== "string" || !squadId.trim()) {
      throw new Error("Provide a squadId or use all_l1 for the leads.");
    }
    if (manifestPath !== undefined && (typeof manifestPath !== "string" || !manifestPath.trim())) {
      throw new Error("manifestPath must be a nonempty string.");
    }
    if (run && (manifestPath === undefined) === (manifest === undefined)) {
      throw new Error("Provide exactly one of manifest or manifestPath in a managed run.");
    }
    const root = fs.realpathSync(workspace);
    const { squads, selectedManifest } = manifest === undefined
      ? loadSquads(root, manifestPath)
      : { squads: manifestSquads(manifest) };
    const staged = run ? stagePlan(root, run, squads) : undefined;
    const requestedManifest = manifestPath && path.relative(root, path.resolve(root, manifestPath));
    if (staged && requestedManifest?.startsWith(`${run}/plan-`) &&
        (requestedManifest !== staged.manifestPath || requestedManifest !== selectedManifest)) {
      throw new Error("The prepared manifest changed. Start a fresh assignment.");
    }
    const alreadyStaged = Boolean(staged && requestedManifest === staged.manifestPath);
    const build = ({ spec, id, number }) =>
      buildSubagentSpec(spec, id, staged?.manifestPath ?? selectedManifest, number, staged?.reportRoot);
    let assignments;
    if (squadId === "all_l1") {
      assignments = Object.entries(squads).map(([id, squad]) => ({
        spec: resolveSquadLead(squad, id, true),
        id
      }));
    } else {
      assignments = specialistAssignments(squads, squadId);
    }
    const Subagents = assignments.map(build);
    const children = squadId === "all_l1" ? assignments.flatMap(({ id }) => specialistAssignments(squads, id)) : [];
    for (const child of children) build(child);
    if (squadId !== "all_l1" && !alreadyStaged) {
      for (const [id, squad] of Object.entries(squads)) {
        const leadSpec = resolveSquadLead(squad, id, false);
        if (leadSpec) build({ spec: leadSpec, id });
        if (id !== squadId) {
          for (const sibling of specialistAssignments(squads, id)) build(sibling);
        }
      }
    }
    if (staged) {
      const slots = [...assignments, ...children].map(({ id, number }) => reportPath(id, number, staged.reportRoot));
      staged.prepare(slots, { skipManifestPublish: alreadyStaged });
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ Subagents }, null, 2) }],
      ...(staged ? { structuredContent: { manifestPath: staged.manifestPath } } : {})
    };
  } catch (error) {
    const message = error.code === "ENOENT" ? "Manifest or workspace not found." : error.message;
    return { isError: true, content: [{ type: "text", text: `dispatch_squad: ${message}` }] };
  }
}

export { handleDispatchSquad };
