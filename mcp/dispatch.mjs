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
  if (Object.hasOwn(squads, "adversarial_l1")) {
    throw new Error("Squad ID 'adversarial_l1' is reserved for adversarial lead compilation.");
  }
  if (Object.hasOwn(squads, "adversarial_flat")) {
    throw new Error("Squad ID 'adversarial_flat' is reserved for flat adversarial review compilation.");
  }
  return squads;
}

function defaultAdversarialSquad(squads, targetSquad) {
  const targetIds = targetSquad
    ? [targetSquad]
    : Object.keys(squads).filter(id => id !== "adversarial_review");
  const targetLabel = targetIds.length > 0 ? targetIds.join(", ") : "all squads";
  return {
    _synthesized: true,
    lead: {
      role: "Adversarial Review Lead",
      objective: `Patrol and audit working squads (${targetLabel}) for Subagent Alignment Policy compliance, empirical execution, absence of parametric guessing or sycophancy, and absence of rubber-stamping.`,
      scopeFiles: ["."],
      instructions: "Audit working squad reports and tool execution traces across working squads. Verify empirical execution and anti-cheating compliance. Verify that lead syntheses independently checked evidence before issuing PASS. Reject ungrounded claims with FAIL or REQUEST_CHANGES.",
      expectedDeliverable: "Adversarial synthesis report starting with Verdict: PASS or FAIL/BLOCKED, detailing compliance findings across working squad leads and specialists."
    },
    specialists: [
      {
        role: "Specialist Alignment & Anti-Cheating Auditor",
        objective: `Audit working specialists' reports in (${targetLabel}) for Subagent Alignment Policy compliance. Verify empirical tool execution: every finding must cite executed tool commands, exit codes, and primary source lines. Report any parametric guessing, sycophantic flattery, or unverified claims.`,
        scopeFiles: ["."],
        expectedDeliverable: "Markdown evidence report detailing alignment and tool-execution compliance findings across all working specialists."
      },
      {
        role: "Lead Synthesis & Grounding Auditor",
        objective: `Audit working squad leads' syntheses and verifiedFiles in (${targetLabel}). Verify that claims are backed by specialist evidence, independent checks were performed, no rubber-stamping occurred, and SHA-256 hashes match.`,
        scopeFiles: ["."],
        expectedDeliverable: "Markdown evidence report detailing synthesis grounding, audit independence, and hash verification across working leads."
      }
    ]
  };
}

function resolveFlatAdversarialSpecialist(squads, targetSquad) {
  if (squads.adversarial_review !== undefined && !squads.adversarial_review._synthesized) {
    const customSpecs = squads.adversarial_review.children ?? squads.adversarial_review.specialists;
    if (Array.isArray(customSpecs) && customSpecs.length > 0) {
      return customSpecs.map((spec, index) => ({ spec, id: "adversarial_review", number: index + 1 }));
    }
  }
  const targetIds = targetSquad
    ? [targetSquad]
    : Object.keys(squads).filter(id => id !== "adversarial_review");
  const targetLabel = targetIds.length > 0 ? targetIds.join(", ") : "all squads";
  return [
    {
      spec: {
        role: "Adversarial Review Specialist",
        objective: `Patrol and audit working squad specialists in (${targetLabel}) for Subagent Alignment Policy compliance, empirical execution, absence of parametric guessing or sycophancy, and truthfulness of reported evidence.`,
        scopeFiles: ["."],
        expectedDeliverable: "Markdown evidence report detailing alignment, tool-execution compliance, and evidence validity across working specialists."
      },
      id: "adversarial_review",
      number: 1
    }
  ];
}

function resolveIntegrityAuditor(squads, targetSquad) {
  const slotId = targetSquad ? `integrity_auditor-${targetSquad}` : "integrity_auditor";
  const targetIds = targetSquad
    ? [targetSquad]
    : Object.keys(squads).filter(
        id => id !== "adversarial_review" && id !== "integrity_auditor" && !id.startsWith("integrity_auditor-")
      );
  if (!targetSquad && targetIds.length > 1) {
    throw new Error(
      `Multiple working squads found (${targetIds.join(", ")}); specify 'integrity_auditor:<targetSquad>' for each squad.`
    );
  }
  if (squads.integrity_auditor !== undefined && !squads.integrity_auditor._synthesized) {
    const customSpecs = squads.integrity_auditor.children ?? squads.integrity_auditor.specialists;
    if (Array.isArray(customSpecs) && customSpecs.length > 0) {
      return customSpecs.map((spec, index) => ({ spec, id: slotId, number: index + 1 }));
    }
  }
  const resolvedTarget = targetIds[0] ?? "all";
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
    const { squads: loadedSquads, selectedManifest } = manifest === undefined
      ? loadSquads(root, manifestPath)
      : { squads: manifestSquads(manifest) };
    const squads = { ...loadedSquads };
    const isAdvLead = squadId === "adversarial_l1";
    const isAdvFlat = squadId === "adversarial_flat" || squadId.startsWith("adversarial_flat:");
    const isIntegrityAuditor = squadId === "integrity_auditor" || squadId.startsWith("integrity_auditor:");
    const hasTargetColon = (isAdvFlat || isIntegrityAuditor) && squadId.includes(":");
    const flatTarget = hasTargetColon ? squadId.slice(squadId.indexOf(":") + 1).trim() : undefined;
    if (hasTargetColon && !flatTarget) {
      throw new Error(`Specify a non-empty target squad after ':' in '${squadId}'.`);
    }
    if (
      flatTarget &&
      (flatTarget === "adversarial_review" ||
        flatTarget === "integrity_auditor" ||
        flatTarget.startsWith("integrity_auditor-") ||
        !Object.hasOwn(squads, flatTarget))
    ) {
      throw new Error(`Unknown targetSquad '${flatTarget}'.`);
    }

    if (!squads.adversarial_review) {
      squads.adversarial_review = defaultAdversarialSquad(squads, flatTarget);
    }

    const staged = run ? stagePlan(root, run, loadedSquads) : undefined;
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
      const workingSquads = Object.entries(squads).filter(
        ([id]) => id !== "adversarial_review" && id !== "integrity_auditor" && !id.startsWith("integrity_auditor-")
      );
      assignments = workingSquads.map(([id, squad]) => ({
        spec: resolveSquadLead(squad, id, true),
        id
      }));
    } else if (isAdvLead) {
      assignments = [{
        spec: resolveSquadLead(squads.adversarial_review, "adversarial_review", true),
        id: "adversarial_review"
      }];
    } else if (isAdvFlat) {
      assignments = resolveFlatAdversarialSpecialist(squads, flatTarget);
    } else if (isIntegrityAuditor) {
      assignments = resolveIntegrityAuditor(squads, flatTarget);
    } else {
      assignments = specialistAssignments(squads, squadId);
    }
    const Subagents = assignments.map(build);
    const children = (squadId === "all_l1" || isAdvLead)
      ? assignments.flatMap(({ id }) => specialistAssignments(squads, id))
      : [];
    for (const child of children) build(child);
    if (squadId !== "all_l1" && !isAdvLead && !alreadyStaged) {
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
