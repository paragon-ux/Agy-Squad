// subagent_brief: single, batch and 2-layer briefs, validation, and the Pointer-Over-Wire contract.
// Calls the handler directly. Nothing here starts an agent.
import assert from "node:assert/strict";
import { handleSubagentBrief } from "../mcp/briefs.mjs";

const textOf = (res) => res.content[0].text;
const jsonBlocks = (text) => [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));

console.log("Agy-Squad subagent_brief tests\n");

// 1. Single subagent with custom role, directives and scope
{
  const res = handleSubagentBrief({
    role: "Codebase Security Auditor",
    objective: "Audit execution guard hook boundaries and fail-closed security handling",
    instructions: "1. Verify corrupt JSON payloads trigger strict fail-closed denials.\n2. Ensure no execution paths bypass RTK optimization.",
    scopeFiles: ["scripts/execution-guard-hook.mjs", "tests/test-hook.mjs"],
    expectedDeliverable: "Vulnerability matrix and audit verdict table",
    typeName: "self",
    model: "inherit",
    workspace: "inherit"
  });
  assert.equal(res.isError, undefined);
  const text = textOf(res);
  assert.ok(text.includes("ROLE: Codebase Security Auditor"));
  assert.ok(text.includes("scripts/execution-guard-hook.mjs"));
  assert.ok(text.includes("tests/test-hook.mjs"));
  assert.ok(text.includes("SPECIFIC INSTRUCTIONS:"));
  assert.ok(text.includes("Verify corrupt JSON payloads trigger strict fail-closed denials"));
  assert.ok(text.includes("cite exact file:line references"));
  const [payload] = jsonBlocks(text);
  assert.equal(payload.Subagents.length, 1);
  assert.deepEqual(
    { Role: payload.Subagents[0].Role, TypeName: payload.Subagents[0].TypeName, Model: payload.Subagents[0].Model, Workspace: payload.Subagents[0].Workspace },
    { Role: "Codebase Security Auditor", TypeName: "self", Model: "inherit", Workspace: "inherit" }
  );
  assert.ok(payload.Subagents[0].Prompt.includes("ROLE: Codebase Security Auditor"));
  console.log("✓ single subagent brief with custom role and a turnkey payload");
}

// 2. Default role for a bare objective
{
  const text = textOf(handleSubagentBrief({
    objective: "Deep audit of authentication logic",
    scopeFiles: ["src/auth.js", "src/tokens.js"],
    expectedDeliverable: "Markdown matrix of vulnerabilities"
  }));
  assert.ok(text.includes("ROLE: Scope-Isolated Deep Research Subagent"));
  assert.ok(text.includes("Markdown matrix of vulnerabilities"));
  assert.equal(jsonBlocks(text)[0].Subagents[0].TypeName, "research", "L2 leaves default to the read-only research type");
  console.log("✓ bare objective gets the default role and the research type");
}

// 3. Multi-subagent batch
{
  const text = textOf(handleSubagentBrief({
    subagents: [
      { role: "Performance Benchmark Engineer", objective: "Profile CPU bottlenecks", scopeFiles: ["src/perf.js"], typeName: "self" },
      { role: "API Regression Specialist", objective: "Validate JSON-RPC error handling", scopeFiles: ["mcp/index.js"], typeName: "self" },
      { role: "Documentation Integrity Reviewer", objective: "Verify docs sync", scopeFiles: ["README.md"], typeName: "research", model: "flash" }
    ]
  }));
  const [payload] = jsonBlocks(text);
  assert.equal(payload.Subagents.length, 3);
  assert.deepEqual(payload.Subagents.map((s) => s.Role), ["Performance Benchmark Engineer", "API Regression Specialist", "Documentation Integrity Reviewer"]);
  assert.equal(payload.Subagents[2].TypeName, "research");
  assert.equal(payload.Subagents[2].Model, "flash");
  assert.ok(text.includes("### Subagent 3: Documentation Integrity Reviewer (research)"));
  console.log("✓ multi-subagent batch in one call");
}

// 4. 2-layer hierarchy: L1 lead with pre-compiled L2 children
{
  const text = textOf(handleSubagentBrief({
    role: "Architecture Squad Lead",
    tier: "L1_lead",
    objective: "Lead consensus protocol refactor",
    scopeFiles: ["src/consensus.mjs"],
    children: [
      { role: "Ledger State Specialist", objective: "Audit state transitions", scopeFiles: ["src/state.mjs"] },
      { role: "Network Wire Auditor", objective: "Validate wire serialization", scopeFiles: ["src/wire.mjs"] }
    ]
  }));
  assert.match(text, /TIER: L1_lead/);
  assert.match(text, /L1 Squad Lead Delegation Mandate/);
  assert.match(text, /Target files \(STRICT CONTAINMENT BOUNDARY\)/);
  const blocks = jsonBlocks(text);
  assert.ok(blocks.length >= 2, "inner L2 payload and outer L1 payload");
  const outer = blocks[blocks.length - 1];
  assert.equal(outer.Subagents.length, 1);
  assert.equal(outer.Subagents[0].TypeName, "self", "L1 leads default to self");
  const inner = blocks[0];
  assert.deepEqual(inner.Subagents.map((s) => [s.Role, s.TypeName]), [["Ledger State Specialist", "research"], ["Network Wire Auditor", "research"]]);
  console.log("✓ L1 lead brief carries its pre-compiled L2 payload");
}

// 5. Validation: missing scopeFiles, empty call
{
  const missingScope = handleSubagentBrief({ objective: "Vague exploration without scope files" });
  assert.ok(missingScope.isError);
  assert.match(textOf(missingScope), /missing required 'scopeFiles'/);
  const empty = handleSubagentBrief({});
  assert.ok(empty.isError);
  assert.match(textOf(empty), /subagent_brief error/);
  console.log("✓ rejects briefs without scopeFiles and empty calls with actionable errors");
}

// 6. Pointer-Over-Wire contract and the artifact-directory write guard
{
  const text = textOf(handleSubagentBrief({
    role: "Deliverable Path Verifier",
    objective: "Verify subagent deliverable path guidance",
    instructions: "Write report to C:/Users/someone/.gemini/antigravity/brain/bfb10271-99c6-4002-b82c-7aac414ebe48/scratch/report.md",
    scopeFiles: ["scratch/report.md"]
  }));
  assert.match(text, /POINTER-OVER-WIRE/);
  assert.match(text, /transmit ONLY:\n\s+- Executive Summary/);
  assert.match(text, /Clickable File Link/);
  assert.ok(text.includes("ARTIFACT DIRECTORY WRITE GUARD"));
  assert.ok(text.includes("Option A (Workspace 'scratch/' — Recommended)"));
  assert.ok(text.includes("OMIT ArtifactMetadata"));
  assert.ok(text.includes("Option B (Your Own Brain 'scratch/')"));
  assert.ok(text.includes("Prefer 'view_file' with bounded slices"));
  console.log("✓ Pointer-Over-Wire contract and artifact-directory write guard");
}

console.log("\nAll subagent_brief tests passed.");
