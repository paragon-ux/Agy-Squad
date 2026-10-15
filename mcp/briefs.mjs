// Subagent briefs: scope-isolated prompts and ready-to-use invoke_subagent payloads,
// for single subagents or 2-layer (L1 Squad Lead -> L2 Leaf) hierarchies.
//
// Moved from Agy-Context-Saver (2026-10-15). Payload mode only: this module builds text and
// JSON, it never spawns an agent. Spawning stays with Antigravity's native invoke_subagent.

export const SERVER_NAME = "agy-squad";

function buildSubagentSpecObject(spec = {}, forcedTier = null) {
  const children = Array.isArray(spec.children || spec.Children) ? (spec.children || spec.Children) : [];
  const tier = forcedTier || spec.tier || spec.Tier || (children.length > 0 ? "L1_lead" : "L2_leaf");
  const role = spec.role || spec.Role || (tier === "L1_lead" ? "L1 Squad Lead Orchestrator" : "Scope-Isolated Deep Research Subagent");
  const objective = (spec.objective || spec.Objective || "").trim();
  const instructions = spec.instructions || spec.Instructions || "";
  const rawScope = spec.scopeFiles || spec.ScopeFiles || [];
  const scopeFiles = Array.isArray(rawScope) ? rawScope.map(s => String(s).trim()).filter(Boolean) : [];
  const expectedDeliverable = spec.expectedDeliverable || spec.ExpectedDeliverable || "Synthesized factual findings";

  // L1 Squad Leads need subagent tools ('self'); L2 leaves default to 'research' (read-only, no subagent tools).
  const defaultTypeName = tier === "L1_lead" ? "self" : "research";
  const typeName = spec.typeName || spec.TypeName || defaultTypeName;
  const model = spec.model || spec.Model || "inherit";
  const workspace = spec.workspace || spec.Workspace || "inherit";

  if (!objective) {
    throw new Error(`Subagent '${role}' is missing a required 'objective'.`);
  }
  if (scopeFiles.length === 0) {
    throw new Error(`Subagent '${role}' is missing required 'scopeFiles'. Explicit file/directory boundaries are mandatory to prevent out-of-scope directory crawling.`);
  }

  // Pre-compile L2 children into an L1 Squad Lead's prompt
  let compiledChildrenPayload = null;
  if (tier === "L1_lead" && children.length > 0) {
    const childSubagents = children.map(childSpec => buildSubagentSpecObject(childSpec, "L2_leaf"));
    compiledChildrenPayload = JSON.stringify({ Subagents: childSubagents }, null, 2);
  }

  const promptText = formatSingleBrief({
    role,
    tier,
    objective,
    instructions,
    scopeFiles,
    expectedDeliverable,
    compiledChildrenPayload,
    squadId: spec.squadId || null
  });

  return {
    TypeName: typeName,
    Role: role,
    Model: model,
    Workspace: workspace,
    Prompt: promptText
  };
}

function formatSingleBrief({
  role = "Scope-Isolated Deep Research Subagent",
  tier = "L2_leaf",
  objective = "",
  instructions = "",
  scopeFiles = [],
  expectedDeliverable = "Synthesized factual findings",
  compiledChildrenPayload = null,
  squadId = null
} = {}) {
  const scopeStr = scopeFiles && scopeFiles.length
    ? `\n\nTarget files (STRICT CONTAINMENT BOUNDARY):\n${scopeFiles.map(f => `- ${f}`).join("\n")}`
    : "";
  const instrStr = instructions && instructions.trim() ? `\n\nSPECIFIC INSTRUCTIONS:\n${instructions.trim()}` : "";
  const hasBrainUuidPath = /[/\\]\.gemini[/\\]antigravity[/\\]brain[/\\][0-9a-f-]{36}/i.test(`${objective}\n${instructions}\n${expectedDeliverable}`);
  const brainPathWarning = hasBrainUuidPath
    ? `\n\n⚠️ ARTIFACT DIRECTORY WRITE GUARD: Any 'brain/<uuid>/' path referenced above belongs to another conversation. You may READ from it via 'view_file', but when calling 'write_to_file' or 'replace_file_content', you MUST either write to workspace '<workspace>/scratch/...' (OMIT ArtifactMetadata) or substitute YOUR OWN Artifact Directory Path from <user_information> (INCLUDE ArtifactMetadata).`
    : "";

  let tierSection;
  if (tier !== "L1_lead") {
    tierSection = [
      `7. Codebase Intelligence & Containment:`,
      `   - Use 'waymark-engine' ('waymark_ask') for symbol/AST search rather than crawling filesystems.`,
      `   - Perform all reads and edits strictly within your assigned Target files or '<workspace>/scratch/'.`
    ].join("\n");
  } else if (compiledChildrenPayload) {
    tierSection = [
      `7. L1 Squad Lead Delegation Mandate:`,
      `   - You lead this squad and coordinate L2 leaf specialists.`,
      `   - Dispatch your L2 specialists by invoking 'invoke_subagent' with this pre-compiled payload:\n\`\`\`json\n${compiledChildrenPayload}\n\`\`\``,
      `   - After dispatching, conclude your turn immediately and wait for Reactive Wakeup when their deliverables arrive.`
    ].join("\n");
  } else if (squadId) {
    tierSection = [
      `7. L1 Squad Lead Delegation Mandate:`,
      `   - You lead this squad and coordinate L2 leaf specialists.`,
      `   - Retrieve your pre-compiled L2 specialists payload by calling MCP tool 'dispatch_squad' with squadId='${squadId}'.`,
      `   - Pass the resulting Subagents array to 'invoke_subagent' byte-for-byte.`,
      `   - After dispatching, conclude your turn immediately and wait for Reactive Wakeup when their deliverables arrive.`
    ].join("\n");
  } else {
    tierSection = [
      `7. L1 Squad Lead Delegation Mandate:`,
      `   - You lead this squad and coordinate L2 leaf specialists.`,
      `   - When delegating tasks to L2 specialists, formulate exact file boundaries using 'mcp:${SERVER_NAME}:subagent_brief' (tier='L2_leaf') before calling 'invoke_subagent'.`,
      `   - After dispatching, conclude your turn immediately and wait for Reactive Wakeup.`
    ].join("\n");
  }

  return [
    `ROLE: ${role}`,
    `TIER: ${tier}`,
    `OBJECTIVE: ${objective}${scopeStr}${instrStr}${brainPathWarning}`,
    ``,
    `CRITICAL CONTEXT GOVERNANCE INSTRUCTIONS (POINTER-OVER-WIRE):`,
    `1. Isolated Workspace & Bounded File Slices: Do all exploration inside your Target files list. Prefer 'view_file' with bounded slices (StartLine and EndLine, max 150 lines) over 'rtk read' so line numbers are preserved and terminal buffers never truncate file headers.`,
    `2. Pointer-Over-Wire (POW) Protocol: In-band messaging channels (send_message) have strict transport payload limits (~16-20 KB). If your findings or deliverable exceed 1 KB:`,
    `   a. Write the full comprehensive deliverable using 'write_to_file' following Antigravity's strict path rules:`,
    `      - Option A (Workspace 'scratch/' — Recommended): Set TargetFile to '<workspace>/scratch/<task>_findings.md' and OMIT ArtifactMetadata completely (passing ArtifactMetadata on a workspace path throws "files must be written to the correct artifact directory").`,
    `      - Option B (Your Own Brain 'scratch/'): Set TargetFile to '<your-Artifact-Directory-Path>/scratch/<task>_findings.md' using the exact Artifact Directory Path from YOUR <user_information> block (NEVER a parent's brain/<other-uuid>/ path) and INCLUDE ArtifactMetadata: { Summary: "...", UserFacing: false, RequestFeedback: false }.`,
    `   b. In 'send_message', transmit ONLY:`,
    `      - Executive Summary (3-5 high-signal sentences)`,
    `      - Verdict / Scoreboard Table`,
    `      - Clickable File Link: [Full Deliverable](file:///absolute/path/to/findings.md)`,
    `3. Fast Turn Termination: Once 'send_message' is dispatched, stop calling tools and conclude your turn immediately so the parent agent wakes up without latency.`,
    `4. Format: ${expectedDeliverable}`,
    `5. Citation Mandate: Keep your final response concise, structured, and cite exact file:line references.`,
    `6. Write Scope: You may edit only files inside your Target files (assumed disjoint from sibling subagents) or '<workspace>/scratch/'. If a tool or the environment fails, report it to the parent via 'send_message' and stop; do not work around it.`,
    tierSection
  ].join("\n");
}

function handleSubagentBrief(args = {}) {
  let specs = [];
  if (Array.isArray(args.subagents) && args.subagents.length > 0) {
    specs = args.subagents;
  } else if (args.objective || args.role || args.instructions) {
    specs = [args];
  } else {
    return {
      isError: true,
      content: [{ type: "text", text: "subagent_brief error: provide either 'objective' + 'scopeFiles' (for a single subagent) or 'subagents' array (for multiple subagents)." }]
    };
  }

  const subagentsPayload = [];
  const renderedBriefs = [];

  try {
    for (let i = 0; i < specs.length; i++) {
      const built = buildSubagentSpecObject(specs[i]);
      subagentsPayload.push(built);
      renderedBriefs.push(specs.length === 1 ? built.Prompt : `### Subagent ${i + 1}: ${built.Role} (${built.TypeName})\n${built.Prompt}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `subagent_brief validation error: ${err.message}` }]
    };
  }

  const fullText = [
    renderedBriefs.join("\n\n---\n\n"),
    "",
    "==================================================",
    "READY-TO-USE invoke_subagent PAYLOAD:",
    "```json",
    JSON.stringify({ Subagents: subagentsPayload }, null, 2),
    "```"
  ].join("\n");

  return { content: [{ type: "text", text: fullText }] };
}

export { buildSubagentSpecObject, formatSingleBrief, handleSubagentBrief };
