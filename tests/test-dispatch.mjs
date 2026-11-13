import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";
import { reportPath } from "../mcp/handoffs.mjs";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-test-"));
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
    assert.ok(leaf.Prompt.includes(`READY ${pointer} — <concrete observation>`));
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

  rejects({ squadId: "all_l1", mode: "direct" }, /Only squadId and manifestPath/);
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

  // Adversarial Review Squad dispatch tests (layered, flat, targeted)
  const advLead = payload({ squadId: "adversarial_l1", manifestPath });
  assert.equal(advLead.length, 1);
  assert.equal(advLead[0].Role, "Adversarial Review Lead");
  assert.equal(advLead[0].TypeName, "self");
  assert.match(advLead[0].Prompt, /"squadId":"adversarial_review"/);
  assert.equal(advLead[0].Prompt.match(/^Report slot: (\S+)$/m)?.[1], reportPath("adversarial_review"));

  const advSpecs = payload({ squadId: "adversarial_review", manifestPath });
  assert.equal(advSpecs.length, 2);
  assert.deepEqual(advSpecs.map(s => s.Role), [
    "Specialist Alignment & Anti-Cheating Auditor",
    "Lead Synthesis & Grounding Auditor"
  ]);
  assert.equal(advSpecs[0].Prompt.match(/^Report slot: (\S+)$/m)?.[1], reportPath("adversarial_review", 1));
  assert.equal(advSpecs[1].Prompt.match(/^Report slot: (\S+)$/m)?.[1], reportPath("adversarial_review", 2));

  const flatAdv = payload({ squadId: "adversarial_flat", manifestPath });
  assert.equal(flatAdv.length, 1);
  assert.equal(flatAdv[0].Role, "Adversarial Review Specialist");
  assert.equal(flatAdv[0].Prompt.match(/^Report slot: (\S+)$/m)?.[1], reportPath("adversarial_review", 1));

  const targetedFlatAdv = payload({ squadId: "adversarial_flat:alpha", manifestPath });
  assert.equal(targetedFlatAdv.length, 1);
  assert.match(targetedFlatAdv[0].Prompt, /alpha/);

  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { adversarial_l1: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /reserved for adversarial lead compilation/);
  fs.writeFileSync(path.join(workspace, "invalid.json"), JSON.stringify({
    squads: { adversarial_flat: { lead: agent("Lead", "src"), specialists: [agent("First", "src/a.js")] } }
  }));
  rejects({ squadId: "all_l1", manifestPath: "invalid.json" }, /reserved for flat adversarial review compilation/);
  rejects({ squadId: "adversarial_flat:missing", manifestPath }, /Unknown targetSquad 'missing'/);

  const externalManifest = path.join(testDir, "outside.json");
  fs.writeFileSync(externalManifest, JSON.stringify(manifest));
  fs.symlinkSync(externalManifest, path.join(workspace, "escape.json"), "file");
  rejects({ squadId: "all_l1", manifestPath: externalManifest }, /inside the workspace/);
  rejects({ squadId: "all_l1", manifestPath: "../outside.json" }, /inside the workspace/);
  rejects({ squadId: "all_l1", manifestPath: "escape.json" }, /inside the workspace/);
  fs.symlinkSync(manifestPath, path.join(workspace, "internal.json"), "file");
  assert.equal(payload({ squadId: "all_l1", manifestPath: "internal.json" }).length, 2);
  console.log("✓ Rejects direct dispatch, malformed manifests, and workspace escapes");
} finally {
  fs.rmSync(testDir, { recursive: true, force: true });
}
