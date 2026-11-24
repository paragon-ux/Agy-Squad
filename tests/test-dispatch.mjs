import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSubagentSpec } from "../mcp/briefs.mjs";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { reportPath } from "../mcp/handoffs.mjs";

const testDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-test-")));
const workspace = path.join(testDir, "workspace");
fs.mkdirSync(workspace);
const manifestPath = path.join(workspace, "swarm-manifest.json");
const agent = (role, file) => ({ role, objective: `Review ${file}`, scopeFiles: [file] });
const manifest = {
  squads: {
    alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js"), agent("Second", "src/b.js")] },
    beta: { ...agent("Other lead", "docs"), children: [agent("Other specialist", "docs/index.md")] }
  }
};
const dispatch = args => handleDispatchSquad(args, workspace);
function payload(args) {
  const response = dispatch(args);
  assert.equal(response.isError, undefined, response.content[0].text);
  return JSON.parse(response.content[0].text).Subagents;
}
function rejects(args, pattern) {
  const response = dispatch(args);
  assert.equal(response.isError, true);
  assert.match(response.content[0].text, pattern);
}

try {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  fs.writeFileSync(path.join(workspace, "task-01-manifest.json"), "{}");
  const leads = payload({ squadId: "all_l1" });
  assert.deepEqual(leads.map(({ Role, TypeName }) => [Role, TypeName]), [["Lead", "self"], ["Other lead", "self"]]);
  assert.match(leads[0].Prompt, /"squadId":"alpha","manifestPath":"swarm-manifest.json"/);
  assert.doesNotMatch(leads[0].Prompt, /Review src\/a\.js/);
  assert.match(leads[0].Prompt, /operator checks \/agents/);
  assert.match(leads[0].Prompt, /recheck changed inputs/);
  assert.match(leads[0].Prompt, /Squad Lead Patrol & Alignment Gate/);
  assert.equal(payload({ squadId: "beta", manifestPath: "swarm-manifest.json" })[0].Role, "Other specialist");

  const leaves = payload({ squadId: "alpha", manifestPath });
  assert.deepEqual(leaves.map(({ Role, TypeName, Model, Workspace }) => [Role, TypeName, Model, Workspace]), [
    ["First", "self", "inherit", "inherit"],
    ["Second", "self", "inherit", "inherit"]
  ]);
  const reports = leaves.map((leaf, index) => {
    assert.deepEqual(Object.keys(leaf).sort(), ["Model", "Prompt", "Role", "TypeName", "Workspace"]);
    const pointer = leaf.Prompt.match(/^Report slot: (\S+)$/m)?.[1];
    assert.equal(pointer, reportPath("alpha", index + 1));
    assert.ok(leaf.Prompt.includes("READY <Report slot> - <obs>"));
    assert.doesNotMatch(leaf.Prompt, /—/);
    assert.match(leaf.Prompt, /500 UTF-8 bytes/);
    assert.match(leaf.Prompt, /Retry when inputs change/);
    assert.match(leaf.Prompt, /Subagent Alignment Policy: Follow squad lead policy/);
    assert.match(leaf.Prompt, /Anti-cheating rule/);
    assert.doesNotMatch(leaf.Prompt, /1 KB|20 work tool calls/);
    const file = path.join(workspace, pointer);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const report = `Report ${index + 1}: ` + "findings ".repeat(160);
    fs.writeFileSync(file, report);
    return { pointer, report };
  });
  const leadSlot = leads[0].Prompt.match(/^Report slot: (\S+)$/m)?.[1];
  assert.equal(leadSlot, reportPath("alpha"));
  for (const { pointer, report } of reports) {
    assert.equal(path.dirname(path.dirname(pointer)), path.dirname(path.dirname(leadSlot)));
    assert.equal(fs.readFileSync(path.join(workspace, pointer), "utf8"), report);
  }
  console.log("✓ Leads, both specialist aliases, and two Pointer-Over-Wire reports");

  rejects({ squadId: "all_l1", mode: "direct" }, /Only squadId, manifestPath, and workspace/);
  rejects({ squadId: "all_l1", workspace: "   " }, /workspace must be a non-empty string/);
  const overrideDispatch = handleDispatchSquad(
    { squadId: "alpha", manifestPath: "swarm-manifest.json", workspace },
    os.tmpdir()
  );
  assert.equal(overrideDispatch.isError, undefined, overrideDispatch.content[0].text);
  assert.equal(JSON.parse(overrideDispatch.content[0].text).Subagents[0].Role, "First");
  const missingManifestErr = handleDispatchSquad({ squadId: "all_l1", manifestPath: "missing.json" }, testDir);
  assert.equal(missingManifestErr.isError, true);
  assert.match(missingManifestErr.content[0].text, /workspace:/);
  assert.match(missingManifestErr.content[0].text, /Pass 'workspace'/);
  rejects({ squadId: "toString" }, /Unknown squadId/);
  rejects({ squadId: "all_l1", manifestPath: "missing.json" }, /not found/);
  rejects({ squadId: "all_l1", manifestPath: "." }, /regular file/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), "{");
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /JSON/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: { objective: "Valid", scopeFiles: [42] }, specialists: [] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /scopeFiles/);
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /children or specialists/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: { objective: "Valid", scopeFiles: ["src"] }, specialists: [] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /children or specialists/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { all_l1: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /reserved for lead compilation/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "src/a.js"), typeName: "research" }] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /writable typeName/);
  for (const builtinType of ["browser", "image-generator"]) {
    fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
      squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "src/a.js"), typeName: builtinType }] } }
    }));
    rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /writable typeName/);
  }
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "src/a.js"), workspace: "branch" }] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /Workspace 'inherit'/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: { ...agent("Lead", "src"), typeName: " research " }, specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /writable typeName/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: { ...agent("Lead", "src"), workspace: "branch" }, specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /Workspace 'inherit'/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "../secret.txt") }] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /workspace-relative/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "src/a\nb.js") }] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /workspace-relative/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "src/a.js"), expectedDeliverable: "   " }] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /invalid brief or payload fields/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "/etc/passwd")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /workspace-relative/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "./src/a.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /workspace-relative/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src\\a.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /workspace-relative/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), specialists: [{ ...agent("First", "src/a.js"), typeName: "self", TypeName: "research" }] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /conflicting typeName and TypeName/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { typeName: "research", workspace: "branch", scopeFiles: ["../escape"], specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /requires an objective/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { ...agent("Inline Lead", "src"), typeName: "research", specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /writable typeName/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), objective: "Mixed", specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /cannot mix 'lead'/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), children: [agent("A", "src/a.js")], specialists: [agent("B", "src/b.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /both 'children' and 'specialists'/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { alpha: { lead: agent("Lead", "src"), children: "invalid", specialists: [agent("B", "src/b.js")] } }
  }));
  rejects({ squadId: "alpha", manifestPath: "invalid.json" }, /both 'children' and 'specialists'/);

  // Legacy Phase 1 adversarial_* targets are retired (kept only: integrity_auditor[:<target>])
  rejects({ squadId: "adversarial_l1", manifestPath }, /Unknown squadId 'adversarial_l1'/);
  rejects({ squadId: "adversarial_flat", manifestPath }, /Unknown squadId 'adversarial_flat'/);
  rejects({ squadId: "adversarial_flat:alpha", manifestPath }, /Unknown squadId 'adversarial_flat:alpha'/);
  rejects({ squadId: "integrity_auditor:missing", manifestPath }, /Unknown targetSquad 'missing'/);

  // Plane-split brief tests (P1L-CODE-01..03): swarm vs subagent wording
  const swarmLead = buildSubagentSpec(agent("Lead", "src"), "alpha", "swarm-manifest.json", undefined, undefined, {
    executionMode: "swarm",
    workspaceIsolation: "inherit"
  });
  assert.match(swarmLead.Prompt, /swarm_wait/);
  assert.match(swarmLead.Prompt, /post_message/);
  assert.doesNotMatch(swarmLead.Prompt, /dispatch_squad|send_message|\/agents/);
  const swarmSpec = buildSubagentSpec(agent("Spec", "src/a.js"), "alpha", "swarm-manifest.json", 1, undefined, {
    executionMode: "swarm",
    workspaceIsolation: "share"
  });
  assert.match(swarmSpec.Prompt, /'share' working copy/);
  assert.match(swarmSpec.Prompt, /post_message/);
  assert.doesNotMatch(swarmSpec.Prompt, /Use the shared workspace|send_message/);

  // S2-OPT2: single-squad dispatch skips unrelated invalid sibling squads; lead-only integrity_auditor rejects loudly
  fs.writeFileSync(path.join(workspace, "custom-targets.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      broken_sibling: { specialists: [] }
    }
  }));
  const alphaWithBrokenSibling = payload({ squadId: "alpha", manifestPath: "custom-targets.json" });
  assert.equal(alphaWithBrokenSibling[0].Role, "First");
  const scopedAuditor = payload({ squadId: "integrity_auditor:alpha", manifestPath: "custom-targets.json" });
  assert.equal(scopedAuditor.length, 1);
  assert.match(scopedAuditor[0].Prompt, /Target Squad: alpha/);

  fs.writeFileSync(path.join(workspace, "lead-only-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      integrity_auditor: { lead: agent("Lead Only", ".") }
    }
  }));
  rejects({ squadId: "integrity_auditor:alpha", manifestPath: "lead-only-auditor.json" }, /lead without specialists/);

  fs.writeFileSync(path.join(workspace, "null-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      integrity_auditor: null
    }
  }));
  rejects({ squadId: "integrity_auditor:alpha", manifestPath: "null-auditor.json" }, /must be an object/);

  const externalManifest = path.join(testDir, "outside.json");
  fs.writeFileSync(externalManifest, JSON.stringify(manifest));
  let escapeLinkCreated = false;
  try {
    fs.symlinkSync(externalManifest, path.join(workspace, "escape.json"), "file");
    escapeLinkCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  rejects({ squadId: "all_l1", manifestPath: externalManifest }, /inside the workspace/);
  rejects({ squadId: "all_l1", manifestPath: "../outside.json" }, /inside the workspace/);
  if (escapeLinkCreated) {
    rejects({ squadId: "all_l1", manifestPath: "escape.json" }, /inside the workspace/);
  }
  assert.match(payload({ squadId: "all_l1", manifestPath: " swarm-manifest.json " })[0].Prompt, /dispatch_squad/);
  const l1WithExplicitWs = handleDispatchSquad(
    { squadId: "all_l1", manifestPath: "swarm-manifest.json", workspace },
    testDir
  );
  assert.equal(l1WithExplicitWs.isError, undefined, l1WithExplicitWs.content[0].text);
  const l1Prompt = JSON.parse(l1WithExplicitWs.content[0].text).Subagents[0].Prompt;
  const dispatchMatch = l1Prompt.match(/Call dispatch_squad with (\{[^\n]+\})\./i);
  assert.ok(dispatchMatch, "Expected compiled L1 lead prompt to embed dispatch_squad arguments");
  const parsedLeadArgs = JSON.parse(dispatchMatch[1]);
  assert.equal(parsedLeadArgs.workspace, workspace);
  const delegatedSpecialists = handleDispatchSquad(parsedLeadArgs, testDir);
  assert.equal(delegatedSpecialists.isError, undefined, delegatedSpecialists.content[0].text);
  assert.equal(JSON.parse(delegatedSpecialists.content[0].text).Subagents[0].Role, "First");

  assert.match(leaves[0].Prompt, /native search\/read \(grep_search\/find_by_name \+ bounded read_file\)/);

  const emptyWs = path.join(testDir, "empty-ws");
  fs.mkdirSync(emptyWs);
  const noDefaultErr = handleDispatchSquad({ squadId: "all_l1" }, emptyWs);
  assert.equal(noDefaultErr.isError, true);
  assert.match(noDefaultErr.content[0].text, new RegExp(emptyWs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(noDefaultErr.content[0].text, /Pass 'workspace'/);

  const linkWs = path.join(testDir, "link-ws");
  fs.symlinkSync(workspace, linkWs, os.platform() === "win32" ? "junction" : "dir");
  assert.equal(
    handleDispatchSquad({ squadId: "alpha", workspace: linkWs, manifestPath: "swarm-manifest.json" }, testDir).isError,
    undefined
  );
  assert.equal(
    handleDispatchSquad(
      { squadId: "alpha", workspace: linkWs, manifestPath: path.join(linkWs, "swarm-manifest.json") },
      testDir
    ).isError,
    undefined
  );
  // Session 3 MCP-004: canonical workspace + symlink-aliased absolute manifestPath succeeds; external file symlink pointing in fails
  assert.equal(
    handleDispatchSquad(
      { squadId: "alpha", workspace, manifestPath: path.join(linkWs, "swarm-manifest.json") },
      testDir
    ).isError,
    undefined
  );
  let inboundEscapeCreated = false;
  const externalInboundLink = path.join(testDir, "inbound-escape.json");
  try {
    fs.symlinkSync(manifestPath, externalInboundLink, "file");
    inboundEscapeCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (inboundEscapeCreated) {
    rejects({ squadId: "alpha", manifestPath: externalInboundLink }, /inside the workspace/);
  }
  if (escapeLinkCreated) {
    assert.equal(
      handleDispatchSquad(
        { squadId: "all_l1", workspace: linkWs, manifestPath: path.join(linkWs, "escape.json") },
        testDir
      ).isError,
      true
    );
  }

  for (const badWs of ["", 123, null, manifestPath]) {
    const errRes = handleDispatchSquad({ squadId: "all_l1", workspace: badWs }, workspace);
    assert.equal(errRes.isError, true);
  }
  assert.match(
    handleDispatchSquad({ squadId: "all_l1" }, "   ").content[0].text,
    /workspace must be a non-empty string/
  );

  let internalLinkCreated = false;
  try {
    fs.symlinkSync(manifestPath, path.join(workspace, "internal.json"), "file");
    internalLinkCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (internalLinkCreated) {
    assert.equal(payload({ squadId: "all_l1", manifestPath: "internal.json" }).length, 2);
  }
  // W1 Regressions (RUN-006..008, LEAD-RUN-001, SVC-001, SVC-002, SVC-006)
  // LEAD-RUN-001: equal array scopeFiles / ScopeFiles aliases must not conflict
  const equalScopeSpec = buildSubagentSpec(
    { role: "Alias Spec", objective: "Check", scopeFiles: ["src/a.js"], ScopeFiles: ["src/a.js"] },
    "alpha",
    "swarm-manifest.json",
    1
  );
  assert.equal(equalScopeSpec.Role, "Alias Spec");

  // RUN-007: explicit null optional agent fields must reject instead of coalescing to defaults
  for (const nullField of [
    { role: null },
    { typeName: null },
    { model: null },
    { workspace: null },
    { expectedDeliverable: null }
  ]) {
    assert.throws(
      () => buildSubagentSpec({ objective: "Check", scopeFiles: ["src/a.js"], ...nullField }, "alpha", "swarm-manifest.json", 1),
      /invalid brief or payload fields|Agent '.*'/,
      `RUN-007: explicit null for ${Object.keys(nullField)[0]} must throw`
    );
  }

  // RUN-008: DISALLOWED_BUILTINS check is case-insensitive
  for (const upperBuiltin of ["Research", "BROWSER", "Image-Generator"]) {
    assert.throws(
      () => buildSubagentSpec({ role: "Bad", objective: "Check", scopeFiles: ["src/a.js"], typeName: upperBuiltin }, "alpha", "swarm-manifest.json", 1),
      /writable typeName/,
      `RUN-008: disallowed builtin '${upperBuiltin}' must be rejected case-insensitively`
    );
  }

  // RUN-006: custom integrity_auditor with matching instructions & Instructions must not trigger conflict after appendTargetInstruction
  fs.writeFileSync(path.join(workspace, "dual-instr-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      integrity_auditor: {
        specialists: [{
          role: "Custom Dual Auditor",
          objective: "Audit alpha",
          scopeFiles: ["."],
          instructions: "Keep evidence crisp.",
          Instructions: "Keep evidence crisp."
        }]
      }
    }
  }));
  const dualAuditPayload = payload({ squadId: "integrity_auditor", manifestPath: "dual-instr-auditor.json" });
  assert.match(dualAuditPayload[0].Prompt, /Target Squad: alpha/);
  assert.match(dualAuditPayload[0].Prompt, /Keep evidence crisp\./);

  // SVC-001: dispatch_squad emits warnings when non-alias manifest models coerce to 'inherit'
  fs.writeFileSync(path.join(workspace, "pinned-model.json"), JSON.stringify({
    squads: {
      alpha: {
        lead: { ...agent("Lead", "src"), model: "gemini-4-hydrogen-high" },
        specialists: [{ ...agent("First", "src/a.js"), model: "gemini-3.8-flash-high" }]
      }
    }
  }));
  const coercedDispatch = dispatch({ squadId: "alpha", manifestPath: "pinned-model.json" });
  assert.equal(coercedDispatch.isError, undefined);
  const coercedJson = JSON.parse(coercedDispatch.content[0].text);
  assert.equal(coercedJson.Subagents[0].Model, "inherit");
  assert.ok(Array.isArray(coercedJson.warnings) && coercedJson.warnings.some(w => /gemini-3\.8-flash-high/.test(w)), "SVC-001: dispatch_squad must emit model coercion warning");

  // SVC-002 & SVC-006: integrity_auditor-<target> overrides honored, direct dispatch forbidden, non-canonical variants rejected, empty all_l1 throws
  fs.writeFileSync(path.join(workspace, "scoped-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      beta: { lead: agent("Lead B", "docs"), specialists: [agent("Second", "docs/a.md")] },
      "integrity_auditor-alpha": {
        specialists: [{ role: "Alpha Custom Auditor", objective: "Custom audit for alpha", scopeFiles: ["src"] }]
      }
    }
  }));
  const scopedOverride = payload({ squadId: "integrity_auditor:alpha", manifestPath: "scoped-auditor.json" });
  assert.equal(scopedOverride[0].Role, "Alpha Custom Auditor", "SVC-002: resolveIntegrityAuditor must honor integrity_auditor-<target>");
  assert.match(scopedOverride[0].Prompt, /Target Squad: alpha/);
  rejects({ squadId: "integrity_auditor-alpha", manifestPath: "scoped-auditor.json" }, /reserved|integrity_auditor:alpha/i);

  for (const badAuditKey of ["integrity_auditor_custom", "INTEGRITY_AUDITOR"]) {
    fs.writeFileSync(path.join(workspace, "bad-audit-key.json"), JSON.stringify({
      squads: {
        alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
        [badAuditKey]: { specialists: [{ role: "Bad", objective: "Audit", scopeFiles: ["."] }] }
      }
    }));
    rejects({ squadId: "all_l1", manifestPath: "bad-audit-key.json" }, /integrity_auditor/i);
  }

  fs.writeFileSync(path.join(workspace, "audit-only.json"), JSON.stringify({
    squads: {
      integrity_auditor: { specialists: [{ role: "Auditor", objective: "Audit", scopeFiles: ["."] }] }
    }
  }));
  rejects({ squadId: "all_l1", manifestPath: "audit-only.json" }, /at least one non-audit working squad/);

  // OPT-RT-07: validateOnly avoids building discarded Prompt strings while preserving validation on all_l1 children and target lead
  const validateOnlySpec = buildSubagentSpec(agent("Check", "src/a.js"), "alpha", "swarm-manifest.json", 1, undefined, { validateOnly: true });
  assert.equal(validateOnlySpec.Prompt, undefined, "OPT-RT-07: validateOnly must skip Prompt string formatting");
  fs.writeFileSync(path.join(workspace, "bad-child-all-l1.json"), JSON.stringify({
    squads: {
      alpha: {
        lead: agent("Lead", "src"),
        specialists: [{ role: "Bad Child", objective: "Fail validation", scopeFiles: ["src"], typeName: "Browser" }]
      }
    }
  }));
  rejects({ squadId: "all_l1", manifestPath: "bad-child-all-l1.json" }, /writable typeName/);

  // UX-SQ-003: formatNotFoundError recommends global 'agy-squad plan' / 'agy-squad dispatch', never checkout-only 'node bin/agy-squad.mjs'
  const missingRes = dispatch({ squadId: "all_l1", manifestPath: "does-not-exist.json" });
  assert.equal(missingRes.isError, true);
  assert.match(missingRes.content[0].text, /agy-squad plan.*agy-squad dispatch/);
  assert.doesNotMatch(missingRes.content[0].text, /node bin\/agy-squad\.mjs/);

  // Decoupled native fungibility: briefs use native search/read guidance (zero hardcoded rtk/<=150-line), omit foreign hook tags, and include standalone native JSONL traces on auditors
  const uxSpecBrief = buildSubagentSpec(agent("Spec", "src/a.js"), "alpha", "swarm-manifest.json", 1).Prompt;
  const uxLeadBrief = buildSubagentSpec(agent("Lead", "src/a.js"), "alpha", "swarm-manifest.json").Prompt;
  const uxAuditBrief = buildSubagentSpec(agent("Audit", "src/a.js"), "integrity_auditor", "swarm-manifest.json", 1).Prompt;
  const uxSwarmAuditBrief = buildSubagentSpec(agent("Audit", "src/a.js"), "integrity_auditor", "swarm-manifest.json", 1, undefined, { executionMode: "swarm" }).Prompt;
  for (const [label, promptText] of [
    ["specialist", uxSpecBrief],
    ["lead", uxLeadBrief],
    ["auditor", uxAuditBrief],
    ["swarm-auditor", uxSwarmAuditBrief]
  ]) {
    assert.match(
      promptText,
      /native search\/read \(grep_search\/find_by_name \+ bounded read_file\)/,
      `${label} brief must use native search/read guidance`
    );
    assert.doesNotMatch(
      promptText,
      /rtk grep|rtk find|rtk read|<=150-line/,
      `${label} brief must not hardcode rtk or <=150-line rules`
    );
    assert.doesNotMatch(
      promptText,
      /^\[agy-transcript-access:/m,
      `${label} brief must not inject [agy-transcript-access: ...] by default in standalone mode`
    );
    assert.ok(promptText.startsWith("Role: "), `${label} default prompt should begin directly with Role:`);
  }
  assert.doesNotMatch(uxLeadBrief, /sender=<coordId>/, "OPT-BRIEF-01: subagent lead must omit swarm-only trace suffix");
  assert.doesNotMatch(uxAuditBrief, /sender=<coordId>/, "OPT-BRIEF-01: subagent auditor must omit swarm-only trace suffix");
  assert.doesNotMatch(uxSpecBrief, /Write shared slot \(no overwrite\); cite checks/, "OPT-BRIEF-03: non-auditor specialist must omit duplicate cite checks");
  assert.match(
    uxAuditBrief,
    /~\/\.gemini\/antigravity\*\/brain\/<id>\/\.system_generated\/logs\/transcript\.jsonl/,
    "subagent Integrity Auditor brief must include standalone native JSONL trace path"
  );
  assert.match(
    uxSwarmAuditBrief,
    /~\/\.gemini\/antigravity\*\/brain\/<id>\/\.system_generated\/logs\/transcript\.jsonl/,
    "swarm Integrity Auditor brief must include standalone native JSONL trace path"
  );
  assert.match(
    uxSwarmAuditBrief,
    /sender=<coordId> \+ @<workerName>/,
    "swarm Integrity Auditor brief must explain standalone Step 0/1 worker trace matching"
  );
  assert.match(
    uxAuditBrief,
    /Integrity Verdict: CLEAN \| INTEGRITY VIOLATION' \(plain text, no backticks\)/,
    "Integrity Auditor brief must explicitly disallow backticks on verdict lines"
  );
  assert.match(
    scopedAuditor[0].Prompt,
    /Integrity Verdict: CLEAN \| INTEGRITY VIOLATION \(plain text, no backticks\)\./,
    "Default integrity_auditor deliverable must explicitly disallow backticks on verdict lines"
  );
  const standaloneDispatch = handleDispatchSquad(
    { squadId: "alpha", manifestPath: "swarm-manifest.json" },
    workspace
  );
  assert.equal(standaloneDispatch.isError, undefined);
  assert.doesNotMatch(
    JSON.parse(standaloneDispatch.content[0].text).Subagents[0].Prompt,
    /^\[agy-transcript-access:/m,
    "dispatched brief must omit [agy-transcript-access:] by default"
  );

  // Batch A SEC-003: forged _synthesized: true on integrity_auditor must not bypass custom auditor validation
  fs.writeFileSync(path.join(workspace, "forged-synthesized-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      integrity_auditor: { _synthesized: true, specialists: "invalid" }
    }
  }));
  rejects(
    { squadId: "integrity_auditor:alpha", manifestPath: "forged-synthesized-auditor.json" },
    /children or specialists must be a non-empty array/
  );

  // Batch B RUN-006 & RUN-007: custom auditor lead readOnly/ReadOnly conflict + reportRoot propagation + POSIX selectedManifest
  fs.writeFileSync(path.join(workspace, "conflict-ro-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      integrity_auditor: {
        lead: { ...agent("Ignored Lead", "."), readOnly: true, ReadOnly: false },
        specialists: [agent("Auditor", ".")]
      }
    }
  }));
  rejects(
    { squadId: "integrity_auditor:alpha", manifestPath: "conflict-ro-auditor.json" },
    /cannot define both 'readOnly' and 'ReadOnly'/
  );
  fs.writeFileSync(path.join(workspace, "nonbool-ro-auditor.json"), JSON.stringify({
    squads: {
      alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
      integrity_auditor: {
        lead: { ...agent("Ignored Lead", "."), readOnly: "yes" },
        specialists: [agent("Auditor", ".")]
      }
    }
  }));
  rejects(
    { squadId: "integrity_auditor:alpha", manifestPath: "nonbool-ro-auditor.json" },
    /readOnly must be a boolean/
  );
  const { readManifest, resolveIntegrityAuditor } = await import("../mcp/dispatch.mjs");
  assert.throws(
    () =>
      resolveIntegrityAuditor(
        {
          alpha: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] },
          integrity_auditor: { lead: agent("Ignored Lead", "."), specialists: [agent("Auditor", ".")] }
        },
        "alpha",
        [],
        { reportRoot: "a/".repeat(220) + "root" }
      ),
    /500-byte Pointer-Over-Wire prefix budget/,
    "RUN-006: resolveIntegrityAuditor must pass custom reportRoot when validating custom auditor lead"
  );
  const nestedManifestDir = path.join(workspace, "nested");
  fs.mkdirSync(nestedManifestDir, { recursive: true });
  fs.writeFileSync(path.join(nestedManifestDir, "m.json"), JSON.stringify(manifest));
  const nestedLoaded = readManifest(workspace, path.join("nested", "m.json"));
  assert.equal(nestedLoaded.selectedManifest, "nested/m.json", "RUN-007: selectedManifest must use POSIX / separators");

  console.log("✓ Rejects direct dispatch, malformed manifests, and workspace escapes");
} finally {
  fs.rmSync(testDir, { recursive: true, force: true });
}
