import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubagentSpec } from "../mcp/briefs.mjs";
import { collectReportSlots, reportPath } from "../mcp/handoffs.mjs";
import { planSquadCohort } from "../mcp/planner.mjs";

const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
const uuid = "123e4567-e89b-42d3-a456-426614174000";
const reportBody = "# Evidence Report\n\nChecked src/a.js:1.";

function tmpdir(prefix) {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function makeFixture(records, options = {}) {
  const root = tmpdir("agy-ro-slot-");
  const home = tmpdir("agy-ro-home-");
  const slot = reportPath("trial-a", 1);
  const plan = {
    executionMode: "subagent",
    workers: [{
      squadId: "trial-a",
      specialists: [{ workerName: "worker", reportSlot: slot, typeName: "agy-squad-readonly" }]
    }]
  };
  const handoff = { sender: uuid, message: `READY ${slot} - ok` };
  const logDir = path.join(home, ".gemini", "antigravity", "brain", uuid, ".system_generated", "logs");
  if (options.transcript !== false) {
    fs.mkdirSync(logDir, { recursive: true });
    const text = records.map(item => typeof item === "string" ? item : JSON.stringify(item)).join("\n") + (options.trailingNewline === false ? "" : "\n");
    fs.writeFileSync(path.join(logDir, "transcript_full.jsonl"), text);
  }
  return {
    root,
    home,
    slot,
    plan,
    handoff,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
    }
  };
}

function collectFixture(fixture, extra = {}) {
  const base = {
    plan: fixture.plan,
    sources: [],
    handoffs: [fixture.handoff],
    idMap: { worker: uuid },
    transcriptHomeDir: fixture.home
  };
  return collectReportSlots(fixture.root, {
    ...base,
    ...extra
  });
}

function assertFixtureFailure(fixture, pattern, extra = {}) {
  assert.throws(() => collectFixture(fixture, extra), pattern);
}

try {
  {
    const agentPath = fileURLToPath(new URL("../agents/agy-squad-readonly.md", import.meta.url));
    const agentText = fs.readFileSync(agentPath, "utf8").replace(/\r\n/g, "\n");
    assert.match(agentText, /^---\nname: agy-squad-readonly\n/);
    assert.match(agentText, /^subagent: true$/m);
    assert.match(agentText, /^mainAgent: false$/m);
    assert.doesNotMatch(agentText, /^tools:/m, "custom agent must use the native default read-only tool set");
    assert.ok(packageJson.files.includes("agents"));
  }

  {
    const valid = buildSubagentSpec(
      { role: "Reader", objective: "Inspect evidence", scopeFiles: ["src/a.js"], typeName: "Agy-Squad-Readonly" },
      "trial-a",
      undefined,
      1,
      undefined,
      { executionMode: "subagent", readOnly: true }
    );
    assert.equal(valid.TypeName, "agy-squad-readonly");
    assert.match(valid.Prompt, /Final-response report contract/);
    assert.match(valid.Prompt, /# Evidence Report/);
    assert.match(valid.Prompt, /1 send_message <= 500 UTF-8 bytes: READY <Report slot>/);
    assert.doesNotMatch(valid.Prompt, /Write shared slot/);
    assert.throws(() => buildSubagentSpec(
      { role: "Reader", objective: "Inspect evidence", scopeFiles: ["src/a.js"], typeName: "agy-squad-readonly" },
      "trial-a",
      undefined,
      1,
      undefined,
      { executionMode: "swarm", readOnly: true }
    ), /requires executionMode 'subagent'/);
    assert.throws(() => buildSubagentSpec(
      { role: "Reader", objective: "Inspect evidence", scopeFiles: ["src/a.js"], typeName: "agy-squad-readonly" },
      "trial-a",
      undefined,
      1,
      undefined,
      { executionMode: "subagent", readOnly: false }
    ), /requires readOnly: true/);
    assert.throws(() => buildSubagentSpec(
      { role: "Reader", objective: "Inspect evidence", scopeFiles: ["src/a.js"], typeName: "agy-squad-readonly" },
      "integrity_auditor",
      undefined,
      1,
      undefined,
      { executionMode: "subagent", readOnly: true, isIntegrityAuditor: true, validateOnly: true }
    ), /cannot use typeName/);
    assert.throws(() => buildSubagentSpec(
      { role: "Lead", objective: "Synthesize evidence", scopeFiles: ["src/a.js"], typeName: "agy-squad-readonly" },
      "trial-a",
      undefined,
      undefined,
      undefined,
      { executionMode: "subagent", readOnly: true, validateOnly: true }
    ), /cannot use typeName/);
  }

  {
    const root = tmpdir("agy-ro-plan-");
    try {
      fs.writeFileSync(path.join(root, "a.js"), "export {};\n");
      const plan = planSquadCohort({
        task: "Inspect a.js",
        scopeFiles: ["a.js"],
        readOnly: true,
        executionMode: "subagent",
        readOnlySubagent: true,
        includeIntegrityAuditor: false
      }, root);
      const specialist = plan.workers[0].specialists[0];
      assert.equal(specialist.typeName, "agy-squad-readonly");
      assert.equal(specialist.Subagent.TypeName, "agy-squad-readonly");
      assert.ok(
        plan.verificationPipeline.some(step => step.startsWith("agy-squad collect ") && step.includes("--id-map ")),
        "verificationPipeline must include agy-squad collect with --id-map when readOnlySubagent is enabled"
      );
      assert.ok(
        plan.verificationPipeline.some(step => step.startsWith("agy-squad bundle-init ") && step.includes("--id-map ")),
        "verificationPipeline must include --id-map on bundle-init in subagent mode"
      );
      const defaultPlan = planSquadCohort({
        task: "Inspect a.js",
        scopeFiles: ["a.js"],
        readOnly: true,
        executionMode: "subagent",
        includeIntegrityAuditor: false
      }, root);
      assert.equal(defaultPlan.workers[0].specialists[0].Subagent.TypeName, "self");
      assert.equal(defaultPlan.workers[0].specialists[0].typeName, undefined);
      assert.throws(() => planSquadCohort({
        task: "Inspect a.js",
        scopeFiles: ["a.js"],
        readOnly: true,
        executionMode: "swarm",
        readOnlySubagent: true
      }, root), /readOnlySubagent requires executionMode 'subagent'/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const fixture = makeFixture([
      { type: "PLANNER_RESPONSE", step_index: 1, content: reportBody },
      { type: "PLANNER_RESPONSE", step_index: 2, content: "Done." }
    ]);
    try {
      const result = collectFixture(fixture);
      assert.equal(result.collected.length, 1);
      assert.equal(fs.readFileSync(path.join(fixture.root, fixture.slot), "utf8"), reportBody);
      assert.equal(result.collected[0].transcriptProvenance.stepIndex, 1);
      assert.equal(result.collected[0].transcriptProvenance.conversationId, uuid);
      assert.equal(result.collected[0].transcriptProvenance.sha256, sha256(Buffer.from(reportBody, "utf8")));
    } finally { fixture.cleanup(); }
  }

  {
    const fixture = makeFixture([
      { type: "PLANNER_RESPONSE", step_index: 1, content: "" },
      { type: "PLANNER_RESPONSE", step_index: 2, content: reportBody }
    ]);
    try {
      const result = collectFixture(fixture);
      assert.equal(result.collected[0].transcriptProvenance.stepIndex, 2);
      assert.equal(fs.readFileSync(path.join(fixture.root, fixture.slot), "utf8"), reportBody);
    } finally { fixture.cleanup(); }
  }

  for (const [_label, records, pattern] of [
    ["truncated selected response", [{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody, truncated_fields: ["content"] }], /truncated_fields/],
    ["missing report", [{ type: "PLANNER_RESPONSE", step_index: 1, content: "Done." }], /No final '# Evidence Report'/],
    ["ambiguous reports", [
      { type: "PLANNER_RESPONSE", step_index: 1, content: `${reportBody}\none` },
      { type: "PLANNER_RESPONSE", step_index: 2, content: `${reportBody}\ntwo` }
    ], /Ambiguous final/],
    ["oversize report", [{ type: "PLANNER_RESPONSE", step_index: 1, content: `# Evidence Report\n${"x".repeat(128 * 1024)}` }], /128 KiB/]
  ]) {
    const fixture = makeFixture(records);
    try { assertFixtureFailure(fixture, pattern); } finally { fixture.cleanup(); }
  }

  {
    const validLine = JSON.stringify({ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody });
    const fixture = makeFixture([validLine, '{"type":"PLANNER_RESPONSE","step_index":2,"content":"# Evidence Report'], { trailingNewline: false });
    try { assertFixtureFailure(fixture, /incomplete trailing JSONL/); } finally { fixture.cleanup(); }
  }

  {
    const fixture = makeFixture([{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }]);
    try {
      assertFixtureFailure(fixture, /strict sender UUID|not authorized|pass --transcript-json/, {
        handoffs: [{ sender: "worker", message: `READY ${fixture.slot} - ok` }]
      });
      assertFixtureFailure(fixture, /strict sender UUID|not authorized|pass --transcript-json/, {
        handoffs: [{ sender: "not-a-uuid", message: `READY ${fixture.slot} - ok id=also-not-a-uuid` }]
      });
      // ASQ-DEV-V1: Unbound sender UUID or untrusted id=<uuid> in handoff message must fail closed
      assertFixtureFailure(fixture, /coordinator-bound conversation UUID/, { idMap: undefined });
      const otherUuid = "99999999-e89b-42d3-a456-426614174999";
      const otherLogs = path.join(fixture.home, ".gemini", "antigravity", "brain", otherUuid, ".system_generated", "logs");
      fs.mkdirSync(otherLogs, { recursive: true });
      fs.writeFileSync(path.join(otherLogs, "transcript_full.jsonl"), JSON.stringify({ type: "PLANNER_RESPONSE", step_index: 1, content: "# Evidence Report\n\nSPOOFED OTHER SESSION" }) + "\n");
      assertFixtureFailure(fixture, /coordinator-bound conversation UUID/, {
        idMap: undefined,
        handoffs: [{ sender: "worker", message: `READY ${fixture.slot} - ok id=${otherUuid}` }]
      });
      assertFixtureFailure(fixture, /not authorized|strict sender UUID/, {
        idMap: { worker: uuid },
        handoffs: [{ sender: otherUuid, message: `READY ${fixture.slot} - ok` }]
      });
      // Trailing id=<otherUuid> in message must never override coordinator-bound uuid
      const boundRes = collectFixture(fixture, {
        idMap: { worker: uuid },
        handoffs: [{ sender: uuid, message: `READY ${fixture.slot} - ok id=${otherUuid}` }]
      });
      assert.equal(boundRes.collected[0].transcriptProvenance.conversationId, uuid);
      assert.equal(fs.readFileSync(path.join(fixture.root, fixture.slot), "utf8"), reportBody);
      fs.rmSync(path.join(fixture.root, fixture.slot), { force: true });
      // Case-normalized UUID agreement succeeds; conflicting or duplicate bindings fail closed
      const upperRes = collectFixture(fixture, {
        idMap: { worker: uuid.toUpperCase() },
        provenance: { entries: [{ squadId: "trial-a", workerName: "worker", reportSlot: fixture.slot, conversationId: uuid }] },
        handoffs: [{ sender: uuid.toUpperCase(), message: `READY ${fixture.slot} - ok` }]
      });
      assert.equal(upperRes.collected[0].transcriptProvenance.conversationId, uuid);
      fs.rmSync(path.join(fixture.root, fixture.slot), { force: true });
      assertFixtureFailure(fixture, /Conflicting conversationId/, {
        idMap: { worker: otherUuid },
        provenance: { entries: [{ squadId: "trial-a", workerName: "worker", reportSlot: fixture.slot, conversationId: uuid }] }
      });
      assertFixtureFailure(fixture, /did not match/, {
        idMap: { worker: uuid, ghost: otherUuid }
      });
      {
        const slot2 = reportPath("trial-a", 2);
        const twoSlotPlan = {
          executionMode: "subagent",
          workers: [{
            squadId: "trial-a",
            specialists: [
              { workerName: "worker-1", reportSlot: fixture.slot, typeName: "agy-squad-readonly" },
              { workerName: "worker-2", reportSlot: slot2, typeName: "agy-squad-readonly" }
            ]
          }]
        };
        assertFixtureFailure(fixture, /Duplicate conversationId/, {
          plan: twoSlotPlan,
          idMap: { "worker-1": uuid, "worker-2": uuid.toUpperCase() },
          handoffs: [{ sender: uuid, message: `READY ${fixture.slot} - ok` }]
        });
        assertFixtureFailure(fixture, /not authorized/, {
          plan: twoSlotPlan,
          idMap: { "worker-1": uuid, "worker-2": otherUuid },
          handoffs: [{ sender: otherUuid, message: `READY ${fixture.slot} - ok` }]
        });
      }
      // NO_REPORT receipt must skip materializing report.md cleanly
      const noReportRes = collectFixture(fixture, {
        handoffs: [{ sender: uuid, message: "NO_REPORT - blocked on missing fixture" }],
        allowEmpty: true
      });
      assert.equal(noReportRes.collected.length, 0);
      assert.equal(fs.existsSync(path.join(fixture.root, fixture.slot)), false);
    } finally { fixture.cleanup(); }
  }

  {
    // Symlinked ~/.gemini dotfiles root is permitted while symlinked <uuid> beneath brain/ fails closed
    const fixture = makeFixture([]);
    const dotfilesRoot = tmpdir("agy-ro-dotfiles-");
    try {
      const realGemini = path.join(dotfilesRoot, "gemini-real");
      const realLogs = path.join(realGemini, "antigravity", "brain", uuid, ".system_generated", "logs");
      fs.mkdirSync(realLogs, { recursive: true });
      fs.writeFileSync(path.join(realLogs, "transcript_full.jsonl"), JSON.stringify({ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }) + "\n");
      fs.rmSync(path.join(fixture.home, ".gemini"), { recursive: true, force: true });
      fs.symlinkSync(realGemini, path.join(fixture.home, ".gemini"), process.platform === "win32" ? "junction" : "dir");
      const symHomeRes = collectFixture(fixture);
      assert.equal(symHomeRes.collected.length, 1);
    } finally {
      fs.rmSync(dotfilesRoot, { recursive: true, force: true });
      fixture.cleanup();
    }
  }

  {
    const fixture = makeFixture([{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }]);
    try {
      const outside = tmpdir("agy-ro-outside-");
      try {
        const outsideUuid = path.join(outside, uuid);
        fs.mkdirSync(path.join(outsideUuid, ".system_generated", "logs"), { recursive: true });
        fs.writeFileSync(path.join(outsideUuid, ".system_generated", "logs", "transcript_full.jsonl"), JSON.stringify({ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }) + "\n");
        const link = path.join(fixture.home, ".gemini", "antigravity", "brain", uuid);
        fs.rmSync(link, { recursive: true, force: true });
        fs.symlinkSync(outsideUuid, link, process.platform === "win32" ? "junction" : "dir");
        assertFixtureFailure(fixture, /symlinked|escapes canonical/);
      } finally { fs.rmSync(outside, { recursive: true, force: true }); }
    } finally { fixture.cleanup(); }
  }

  for (const stateRel of [
    path.join(".gemini", "antigravity", "context-saver"),
    process.platform === "win32"
      ? path.join("AppData", "Local", "agy-context-saver")
      : path.join(".local", "state", "agy-context-saver")
  ]) {
    const fixture = makeFixture([{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }]);
    try {
      const stateDir = path.join(fixture.home, stateRel);
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(path.join(stateDir, "transcript-access.json"), JSON.stringify({
        activeOwnerId: "owner",
        policies: { owner: { ownerId: "owner", mode: "self-only", updatedAt: Date.now() } }
      }));
      assertFixtureFailure(fixture, /restrictive Agy-Context-Saver transcript policy/);
    } finally { fixture.cleanup(); }
  }

  {
    // Unrestricted parent coordinator must NOT be blocked merely because a recent child session file had launchDirective: "deny"
    const fixture = makeFixture([{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }]);
    try {
      const stateDir = path.join(
        fixture.home,
        process.platform === "win32"
          ? path.join("AppData", "Local", "agy-context-saver")
          : path.join(".local", "state", "agy-context-saver")
      );
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(path.join(stateDir, "agy-session-worker.json"), JSON.stringify({ lineage: { launchDirective: "deny" } }));
      const result = collectFixture(fixture);
      assert.equal(result.collected.length, 1);
    } finally { fixture.cleanup(); }
  }

  {
    const fixture = makeFixture([{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }]);
    try {
      const stateDir = path.join(
        fixture.home,
        process.platform === "win32"
          ? path.join("AppData", "Local", "agy-context-saver")
          : path.join(".local", "state", "agy-context-saver")
      );
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(path.join(stateDir, "transcript-access.json"), JSON.stringify({
        activeOwnerId: "owner",
        policies: { owner: { ownerId: "owner", mode: "open", updatedAt: Date.now() } }
      }));
      const result = collectFixture(fixture);
      assert.equal(result.collected.length, 1);
    } finally { fixture.cleanup(); }
  }

  for (const [label, payload] of [
    ["query", { convId: uuid, clamped: false, steps: [{ type: "PLANNER_RESPONSE", step_index: 7, content: reportBody }] }],
    ["step", { stepIndex: 8, field: "content", clamped: false, data: reportBody }]
  ]) {
    const fixture = makeFixture([], { transcript: false });
    try {
      fs.writeFileSync(path.join(fixture.root, "extract.json"), JSON.stringify(payload));
      const result = collectFixture(fixture, { transcriptJson: [`${fixture.slot}=extract.json`] });
      assert.equal(result.collected.length, 1);
      assert.equal(fs.readFileSync(path.join(fixture.root, fixture.slot), "utf8"), reportBody);
      assert.equal(result.collected[0].transcriptProvenance.stepIndex, label === "query" ? 7 : 8);
      assert.equal(result.collected[0].transcriptProvenance.sha256, sha256(Buffer.from(reportBody, "utf8")));
    } finally { fixture.cleanup(); }
  }

  for (const [payload, pattern] of [
    [{ convId: uuid, clamped: true, steps: [{ type: "PLANNER_RESPONSE", step_index: 7, content: reportBody }] }, /clamped/],
    [{ convId: uuid, clamped: false, steps: [{ type: "PLANNER_RESPONSE", step_index: 7, content: reportBody, truncated_fields: [] }] }, /truncated_fields/],
    [{ convId: uuid, clamped: false, steps: [{ type: "PLANNER_RESPONSE", step_index: 7, content: "  " }] }, /empty report content|no assistant report content/],
    [{ convId: uuid, clamped: false, steps: [{ type: "PLANNER_RESPONSE", step_index: 7, content: `# Evidence Report\n${"x".repeat(128 * 1024)}` }] }, /128 KiB/]
  ]) {
    const fixture = makeFixture([], { transcript: false });
    try {
      fs.writeFileSync(path.join(fixture.root, "extract.json"), JSON.stringify(payload));
      assertFixtureFailure(fixture, pattern, { transcriptJson: [`${fixture.slot}=extract.json`] });
    } finally { fixture.cleanup(); }
  }

  {
    const fixture = makeFixture([], { transcript: false });
    const outside = tmpdir("agy-ro-json-outside-");
    try {
      const outsideJson = path.join(outside, "outside.json");
      fs.writeFileSync(outsideJson, JSON.stringify({ clamped: false, data: reportBody }));
      fs.writeFileSync(path.join(fixture.root, "extract.json"), JSON.stringify({ clamped: false, data: reportBody }));
      assert.throws(
        () => collectFixture(fixture, { transcriptJson: ["scratch/agy-squad/squad-other/specialist-1/report.md=extract.json"] }),
        /not an expected report slot/
      );
      assert.throws(
        () => collectFixture(fixture, { transcriptJson: [`${fixture.slot}=${outsideJson}`] }),
        /stay inside the workspace/
      );
      assert.throws(
        () => collectFixture(fixture, { transcriptJson: [`${fixture.slot}=../${path.basename(outside)}/outside.json`] }),
        /stay inside the workspace|workspace-relative/
      );
      if (process.platform !== "win32") {
        const symJson = path.join(fixture.root, "sym.json");
        fs.symlinkSync(outsideJson, symJson);
        assert.throws(
          () => collectFixture(fixture, { transcriptJson: [`${fixture.slot}=sym.json`] }),
          /ELOOP|symlinked|regular file/
        );
      }
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
      fixture.cleanup();
    }
  }

  {
    const fixture = makeFixture([{ type: "PLANNER_RESPONSE", step_index: 1, content: reportBody }]);
    try {
      fixture.plan.workers[0].specialists[0].typeName = "self";
      assert.throws(() => collectFixture(fixture), /Provide --from|No non-empty report slots/);
      const result = collectFixture(fixture, { fromTranscript: true });
      assert.equal(result.collected.length, 1);
      assert.equal(fs.readFileSync(path.join(fixture.root, fixture.slot), "utf8"), reportBody);
    } finally { fixture.cleanup(); }
  }

  {
    const root = tmpdir("agy-ro-e2e-");
    const home = tmpdir("agy-ro-e2e-home-");
    const env = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      XDG_STATE_HOME: path.join(home, ".local", "state"),
      LOCALAPPDATA: path.join(home, "AppData", "Local")
    };
    delete env.AGY_TEST_PROFILE_DIR;
    const write = (rel, text) => {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text);
    };
    const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: "utf8" });
    try {
      write("src/a.js", "export const a = 1;\n");
      write("manifest.json", JSON.stringify({
        squads: {
          trial: {
            lead: { role: "Lead", objective: "Synthesize", scopeFiles: ["src/a.js"] },
            specialists: [{ role: "Spec", objective: "Check", scopeFiles: ["src/a.js"], readOnly: true }]
          }
        }
      }));
      let result = run(["plan", "--manifest", "manifest.json", "--mode", "subagent", "--readonly-subagent", "--no-integrity", "--out", "scratch/plan.json"]);
      assert.equal(result.status, 0, result.stderr);
      const plan = JSON.parse(fs.readFileSync(path.join(root, "scratch/plan.json"), "utf8"));
      const specialist = plan.workers[0].specialists[0];
      const lead = plan.workers[0].lead;
      assert.equal(specialist.typeName, "agy-squad-readonly");
      const logDir = path.join(home, ".gemini", "antigravity", "brain", uuid, ".system_generated", "logs");
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(logDir, "transcript_full.jsonl"), [
        JSON.stringify({ type: "PLANNER_RESPONSE", step_index: 1, content: "" }),
        JSON.stringify({ type: "PLANNER_RESPONSE", step_index: 2, content: reportBody })
      ].join("\n") + "\n");
      write("scratch/handoffs.json", JSON.stringify([{ sender: uuid, message: `READY ${specialist.reportSlot} - ok` }]));
      write(lead.reportSlot, "Content Verdict: PASS\nLead synthesis.\n");
      result = run(["collect", "--plan", "scratch/plan.json", "--handoffs", "scratch/handoffs.json", "--id-map", `${specialist.workerName}=${uuid}`, "--strict"]);
      assert.equal(result.status, 0, result.stderr);
      const collectOut = JSON.parse(result.stdout);
      assert.equal(collectOut.collected[0].transcriptProvenance.conversationId, uuid);
      assert.equal(fs.readFileSync(path.join(root, specialist.reportSlot), "utf8"), reportBody);
      result = run(["bundle-init", "--plan", "scratch/plan.json", "--handoffs", "scratch/handoffs.json", "--id-map", `${specialist.workerName}=${uuid}`, "--out", "scratch/record.json", "src/a.js"]);
      assert.equal(result.status, 0, result.stderr);
      result = run(["finalize", "scratch/record.json", "--allow-unaudited"]);
      assert.equal(result.status, 0, result.stderr);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
    }
  }

  console.log("✓ read-only subagent contract, transcript materialization, policy fail-closed behavior, and collect lifecycle");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
