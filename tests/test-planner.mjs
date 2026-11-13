import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planSquadCohort, scopesOverlap } from "../mcp/planner.mjs";

const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-planner-")));

try {
  // 1. Scope overlap primitive checks
  assert.equal(scopesOverlap("src", "src/a.js"), true);
  assert.equal(scopesOverlap(".", "docs/tools.md"), true);
  assert.equal(scopesOverlap("src", "src-extra/a.js"), false);
  assert.equal(scopesOverlap("mcp/dispatch.mjs", "mcp/handoffs.mjs"), false);

  // 2. Task-mode swarm planning with explicit model pinning and overlapping scopes warning
  const overlapTask = planSquadCohort({
    task: "Audit server modules",
    scopeFiles: ["mcp"],
    roles: ["MCP Auditor", "Brief Auditor"],
    executionMode: "swarm",
    model: "gemini-3.8-flash-high"
  }, root);
  assert.equal(overlapTask.executionMode, "swarm");
  assert.equal(overlapTask.topology.compiledPattern, "flat");
  assert.match(overlapTask.topology.defaultBias, /ask user/i);
  assert.equal(overlapTask.topology.scopeOverlaps.length, 1);
  assert.match(overlapTask.warnings[0], /scopeFiles overlap/);
  assert.equal(overlapTask.modelProvenance.pinningSupported, true);
  assert.equal(overlapTask.workers[0].specialists[0].swarmAdd.model, "gemini-3.8-flash-high");
  assert.equal(overlapTask.integrityAuditPlan.length, 1);
  assert.equal(overlapTask.integrityAuditPlan[0].swarmAdd.model, "gemini-3.8-flash-high");
  assert.match(overlapTask.provenanceScaffold.transcriptIsolation, /L6 convention/);
  assert.equal(overlapTask.provenanceScaffold.entries.length, 2);
  assert.ok(overlapTask.bundleRecordTemplates.task_squad.requireIntegrityAudit);

  // 3. Subagent-mode honest modelProvenance warning when exact model ID cannot be pinned
  const subagentPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Alpha Lead", objective: "Coordinate alpha", scopeFiles: ["mcp"] },
          specialists: [
            { role: "Dispatch Spec", objective: "Audit dispatch", scopeFiles: ["mcp/dispatch.mjs"] },
            { role: "Planner Spec", objective: "Audit planner", scopeFiles: ["mcp/planner.mjs"] }
          ]
        },
        integrity_auditor: {
          specialists: [{ role: "Integrity Spec", objective: "Audit traces", scopeFiles: ["mcp"] }]
        }
      }
    },
    executionMode: "subagent",
    model: "gemini-3.8-flash-high"
  }, root);
  assert.equal(subagentPlan.modelProvenance.pinningSupported, false);
  assert.equal(subagentPlan.modelProvenance.effectiveModel, "inherit");
  assert.match(subagentPlan.modelProvenance.warning, /cannot be pinned under executionMode 'subagent'/);
  assert.equal(subagentPlan.topology.scopeOverlaps.length, 0);
  assert.equal(subagentPlan.workers[0].specialists[0].Subagent.Model, "inherit");

  // 4. Rejects workspaceIsolation share/branch in subagent mode & rejects mixed manifest/task sources
  assert.throws(
    () => planSquadCohort({ task: "bad", executionMode: "subagent", workspaceIsolation: "share" }, root),
    /requires executionMode 'swarm'/
  );
  assert.throws(
    () => planSquadCohort({ task: "bad", manifest: { squads: {} } }, root),
    /exactly one of manifestPath, manifest, or task/
  );

  // 5. Disjoint manifestPath CLI smoke check with swarm workspaceIsolation='share' warning
  const manifestFile = path.join(root, "plan-manifest.json");
  fs.writeFileSync(manifestFile, JSON.stringify({
    squads: {
      alpha: {
        specialists: [{ role: "Alpha Spec", objective: "Edit alpha", scopeFiles: ["src/a.js"] }]
      }
    }
  }));
  const cliPlan = spawnSync(
    process.execPath,
    [cli, "plan", "--manifest", "plan-manifest.json", "--workspace-isolation", "share", "--model", "gemini-3.8-flash-high"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(cliPlan.status, 0, cliPlan.stderr);
  const parsed = JSON.parse(cliPlan.stdout);
  assert.equal(parsed.workspaceIsolation, "share");
  assert.equal(parsed.workers[0].specialists[0].swarmAdd.workspace, "share");
  assert.ok(parsed.warnings.some(w => /merge or collect report slots/.test(w)));

  // 6. SVC-PR5-01 / PR5-RUN-SWARM-01: Cohort-wide unique workerNames (<=24 chars for native /swarm) on self-diagnosis-manifest.json, duplicate roles, and >24-char prefix roles
  const selfDiagPlan = planSquadCohort({
    manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
    model: "gemini-3.8-flash-high"
  }, repoRoot);
  const allSelfDiagNames = [
    ...selfDiagPlan.workers.flatMap(w => [
      ...(w.lead ? [w.lead.workerName] : []),
      ...w.specialists.map(s => s.workerName)
    ]),
    ...selfDiagPlan.integrityAuditPlan.map(a => a.workerName)
  ];
  assert.equal(new Set(allSelfDiagNames).size, allSelfDiagNames.length, "self-diagnosis-manifest workerNames must be globally unique");
  assert.ok(allSelfDiagNames.every(n => typeof n === "string" && n.length > 0 && n.length <= 24));
  for (const w of selfDiagPlan.workers) {
    if (w.lead) {
      assert.equal(w.lead.swarmAdd.name, w.lead.workerName);
      assert.ok(!w.lead.swarmAdd.brief.includes("dispatch_squad"), "swarm lead brief must not call dispatch_squad");
      assert.ok(!w.lead.swarmAdd.brief.includes("send_message"), "swarm lead brief must not tell lead to use send_message");
      assert.ok(!w.lead.swarmAdd.brief.includes("/agents"), "swarm lead brief must not instruct checking /agents");
      assert.match(w.lead.swarmAdd.brief, /post_message/);
      assert.match(w.lead.swarmAdd.brief, /swarm_wait/);
    }
    for (const s of w.specialists) assert.equal(s.swarmAdd.name, s.workerName);
    const tplAssignments = selfDiagPlan.bundleRecordTemplates[w.squadId].assignments.map(a => a.conversationId);
    assert.equal(new Set(tplAssignments).size, tplAssignments.length);
  }
  const sharedSelfDiagPlan = planSquadCohort({
    manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
    executionMode: "swarm",
    workspaceIsolation: "share"
  }, repoRoot);
  for (const w of sharedSelfDiagPlan.workers) {
    for (const s of w.specialists) {
      assert.ok(!s.swarmAdd.brief.includes("Use the shared workspace"), "isolated share brief must not say shared workspace");
      assert.ok(!s.swarmAdd.brief.includes("send_message"), "swarm specialist brief must not use send_message");
      assert.match(s.swarmAdd.brief, /'share' working copy/);
      assert.match(s.swarmAdd.brief, /post_message/);
    }
  }
  for (const a of selfDiagPlan.integrityAuditPlan) {
    assert.equal(a.swarmAdd.name, a.workerName);
  }

  const dupRolesPlan = planSquadCohort({
    task: "Duplicate role test",
    roles: ["Reviewer", "Reviewer", "Reviewer"]
  }, root);
  const dupNames = dupRolesPlan.workers[0].specialists.map(s => s.workerName);
  assert.equal(new Set(dupNames).size, 3);
  assert.ok(dupNames.every(n => n.length <= 24));

  const longPrefixPlan = planSquadCohort({
    task: "Long prefix role test",
    roles: [
      "Extremely Long Shared Prefix Role Alpha",
      "Extremely Long Shared Prefix Role Beta"
    ]
  }, root);
  const longNames = longPrefixPlan.workers[0].specialists.map(s => s.workerName);
  assert.equal(new Set(longNames).size, 2);
  assert.ok(longNames.every(n => n.length <= 24));

  // 7. RUN-PR5-01: reportRoot validation and trailing-slash normalization
  for (const badRoot of ["../../etc", "/tmp/evil", "", "   ", "foo\\bar", "a/../b", "/", null]) {
    assert.throws(
      () => planSquadCohort({ task: "bad root", reportRoot: badRoot }, root),
      /workspace-relative reportRoot/
    );
  }
  const normalizedRootPlan = planSquadCohort({
    task: "Normalized root",
    reportRoot: "custom/out/"
  }, root);
  assert.equal(normalizedRootPlan.workers[0].specialists[0].reportSlot, "custom/out/squad-task_squad/specialist-1/report.md");
  assert.equal(normalizedRootPlan.integrityAuditPlan[0].reportSlot, "custom/out/squad-integrity_auditor/specialist-1/report.md");
  assert.equal(normalizedRootPlan.bundleRecordTemplates.task_squad.reportRoot, "custom/out");

  // 8. MCP-PR5-01, MCP-PR5-02, SVC-PR5-02: per-spec model, swarm lead.swarmAdd, and inline-manifest lead brief
  const inlineSwarmLeadPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Alpha Lead", objective: "Lead alpha", scopeFiles: ["mcp"], model: "gemini-2.5-flash" },
          specialists: [
            { role: "Spec A", objective: "Check A", scopeFiles: ["mcp/a.mjs"], model: "gemini-2.5-pro" },
            { role: "Spec B", objective: "Check B", scopeFiles: ["mcp/b.mjs"] }
          ]
        }
      }
    },
    executionMode: "swarm"
  }, root);
  const alphaWorker = inlineSwarmLeadPlan.workers[0];
  assert.equal(alphaWorker.lead.swarmAdd.model, "gemini-2.5-flash");
  assert.match(alphaWorker.lead.swarmAdd.brief, /Pinned model expectation: gemini-2.5-flash/);
  assert.ok(!alphaWorker.lead.swarmAdd.brief.includes("inline-manifest"));
  assert.ok(!alphaWorker.lead.swarmAdd.brief.includes("dispatch_squad"));
  assert.equal(alphaWorker.specialists[0].swarmAdd.model, "gemini-2.5-pro");
  assert.match(alphaWorker.specialists[0].swarmAdd.brief, /Pinned model expectation: gemini-2.5-pro/);
  assert.equal(alphaWorker.specialists[1].swarmAdd.model, undefined);
  assert.match(alphaWorker.specialists[1].swarmAdd.brief, /Model: coordinator default\./);
  const leadProv = inlineSwarmLeadPlan.provenanceScaffold.entries.find(e => e.slotType === "lead");
  assert.equal(leadProv.workerName, alphaWorker.lead.workerName);
  assert.equal(leadProv.effectiveModel, "gemini-2.5-flash");
  const specAProv = inlineSwarmLeadPlan.provenanceScaffold.entries.find(e => e.workerName === alphaWorker.specialists[0].workerName);
  assert.equal(specAProv.effectiveModel, "gemini-2.5-pro");

  // Top-level model overrides lead & specialist models in swarm mode
  const swarmTopModelPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Alpha Lead", objective: "Lead alpha", scopeFiles: ["mcp"] },
          specialists: [{ role: "Spec A", objective: "Check A", scopeFiles: ["mcp/a.mjs"] }]
        }
      }
    },
    executionMode: "swarm",
    model: "gemini-3.8-flash-high"
  }, root);
  assert.equal(swarmTopModelPlan.workers[0].lead.swarmAdd.model, "gemini-3.8-flash-high");
  assert.equal(
    swarmTopModelPlan.provenanceScaffold.entries.find(e => e.slotType === "lead").effectiveModel,
    "gemini-3.8-flash-high"
  );

  // Subagent mode: per-specialist & lead non-alias models warn and coerce to inherit; aliases preserved without warning
  const subagentSpecWarn = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Alpha Lead", objective: "Lead alpha", scopeFiles: ["mcp"], model: "gemini-3.8-flash-high" },
          specialists: [{ role: "Spec A", objective: "Check A", scopeFiles: ["mcp/a.mjs"], model: "gemini-2.5-pro" }]
        }
      }
    },
    executionMode: "subagent"
  }, root);
  assert.equal(subagentSpecWarn.workers[0].lead.Subagent.Model, "inherit");
  assert.equal(subagentSpecWarn.workers[0].lead.swarmAdd, undefined);
  assert.ok(!subagentSpecWarn.workers[0].lead.Subagent.Prompt.includes("inline-manifest"));
  assert.equal(subagentSpecWarn.workers[0].specialists[0].Subagent.Model, "inherit");
  assert.match(subagentSpecWarn.modelProvenance.warning, /cannot be pinned under executionMode 'subagent'/);
  assert.ok(subagentSpecWarn.warnings.some(w => /cannot be pinned under executionMode 'subagent'/.test(w)));

  for (const alias of ["flash", "flash_lite", "pro"]) {
    const aliasPlan = planSquadCohort({
      task: "Alias test",
      executionMode: "subagent",
      model: alias
    }, root);
    assert.equal(aliasPlan.modelProvenance.effectiveModel, alias);
    assert.equal(aliasPlan.modelProvenance.warning, undefined);
    assert.equal(aliasPlan.workers[0].specialists[0].Subagent.Model, alias);
  }

  // 9. ARCH-PR5-01: integrityAuditPlan emits plans for ALL auditSpecs entries
  const multiAuditorPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          specialists: [{ role: "Spec A", objective: "Check A", scopeFiles: ["mcp/a.mjs"] }]
        },
        integrity_auditor: {
          specialists: [
            { role: "Trace Auditor", objective: "Check traces", scopeFiles: ["mcp"] },
            { role: "Hash Auditor", objective: "Check hashes", scopeFiles: ["mcp"] }
          ]
        }
      }
    }
  }, root);
  assert.equal(multiAuditorPlan.integrityAuditPlan.length, 2);
  assert.notEqual(multiAuditorPlan.integrityAuditPlan[0].workerName, multiAuditorPlan.integrityAuditPlan[1].workerName);
  assert.equal(multiAuditorPlan.integrityAuditPlan[0].reportSlot, "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md");
  assert.equal(multiAuditorPlan.integrityAuditPlan[1].reportSlot, "scratch/agy-squad/squad-integrity_auditor/specialist-2/report.md");

  // 10. MCP-PR5-03 & TEST-PR5-01: roles validation, readOnly exemption, squadId, --no-integrity, branch isolation, and negative branches
  for (const badRoles of ["not-an-array", 123, []]) {
    assert.throws(
      () => planSquadCohort({ task: "bad roles", roles: badRoles }, root),
      /non-empty array/
    );
  }

  const readOnlyPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          specialists: [
            { role: "Reader A", objective: "Read A", scopeFiles: ["mcp"], readOnly: true },
            { role: "Reader B", objective: "Read B", scopeFiles: ["mcp"], readOnly: true }
          ]
        }
      }
    }
  }, root);
  assert.equal(readOnlyPlan.topology.scopeOverlaps.length, 0);
  assert.equal(readOnlyPlan.warnings.length, 0);

  const multiSquadPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: { specialists: [{ role: "A", objective: "Do A", scopeFiles: ["mcp/a.mjs"] }] },
        beta: { specialists: [{ role: "B", objective: "Do B", scopeFiles: ["mcp/b.mjs"] }] }
      }
    },
    squadId: "beta",
    workspaceIsolation: "branch",
    includeIntegrityAuditor: false
  }, root);
  assert.equal(multiSquadPlan.topology.compiledPattern, "flat");
  assert.equal(multiSquadPlan.topology.workingSquads, 1);
  assert.equal(multiSquadPlan.workers[0].squadId, "beta");
  assert.equal(multiSquadPlan.workers[0].specialists[0].swarmAdd.workspace, "branch");
  assert.equal(multiSquadPlan.integrityAuditPlan.length, 0);
  assert.equal(multiSquadPlan.bundleRecordTemplates.beta.requireIntegrityAudit, false);

  const cliNoIntegrity = spawnSync(
    process.execPath,
    [cli, "plan", "--manifest", "plan-manifest.json", "--no-integrity"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(cliNoIntegrity.status, 0, cliNoIntegrity.stderr);
  const parsedNoInt = JSON.parse(cliNoIntegrity.stdout);
  assert.equal(parsedNoInt.integrityAuditPlan.length, 0);
  assert.equal(parsedNoInt.bundleRecordTemplates.alpha.requireIntegrityAudit, false);

  for (const [badArgs, pattern] of [
    [{ task: "x", bogusKey: 1 }, /Unsupported squad_planner option/],
    [{ task: "x", executionMode: "direct" }, /executionMode must be/],
    [{ task: "x", workspaceIsolation: "worktree" }, /workspaceIsolation must be/],
    [{ manifestPath: "plan-manifest.json", scopeFiles: ["mcp"] }, /only be passed with task/],
    [{ manifest: { squads: { a: { specialists: [{ role: "R", objective: "O", scopeFiles: ["."] }] } } }, roles: ["R"] }, /only be passed with task/],
    [{ manifest: { squads: { a: { specialists: [{ role: "R", objective: "O", scopeFiles: ["."] }] } } }, squadId: "missing" }, /Unknown working squadId/],
    [{ manifest: { squads: { a: { specialists: [{ role: "R", objective: "O", scopeFiles: ["."] }] } } }, squadId: "adversarial_review" }, /Unknown working squadId/],
    [{ manifest: { squads: { a: { specialists: [{ role: "R", objective: "O", scopeFiles: ["."], readOnly: "true" }] } } } }, /readOnly must be a boolean/],
    [{ manifest: { squads: { a: { lead: { role: "L", objective: "O", scopeFiles: ["."], readOnly: 1 }, specialists: [{ role: "R", objective: "O", scopeFiles: ["."] }] } } } }, /readOnly must be a boolean/]
  ]) {
    assert.throws(() => planSquadCohort(badArgs, root), pattern);
  }

  const badCliFlag = spawnSync(process.execPath, [cli, "plan", "Task", "--unknown-flag"], { cwd: root, encoding: "utf8" });
  assert.notEqual(badCliFlag.status, 0);

  // 9. PR5-MCP-01: pinned swarm models are unverified unless the caller supplies the host's list
  const unverified = planSquadCohort({ task: "audit", model: "bogus-model" }, root);
  assert.equal(unverified.modelValidation.status, "unverified");
  assert.deepEqual(unverified.modelValidation.pinned, ["bogus-model"]);
  assert.ok(unverified.warnings.some(w => /unverified/.test(w)));
  assert.ok(unverified.preflight.some(p => /swarm\{action:"models"\}/.test(p)));
  const checked = planSquadCohort({ task: "audit", model: "gemini-3.8-flash-high", knownModels: ["gemini-3.8-flash-high", "claude-sonnet-5-5-high"] }, root);
  assert.equal(checked.modelValidation.status, "checked-against-supplied-list");
  assert.ok(!checked.warnings.some(w => /unverified/.test(w)));
  assert.throws(() => planSquadCohort({ task: "audit", model: "bogus-model", knownModels: ["gemini-3.8-flash-high"] }, root), /not in knownModels: bogus-model/);
  assert.throws(() => planSquadCohort({ task: "audit", knownModels: [] }, root), /knownModels must be a non-empty array/);
  const noModel = planSquadCohort({ task: "audit" }, root);
  assert.equal(noModel.modelValidation, undefined);
  const subagentNoValidation = planSquadCohort({ task: "audit", executionMode: "subagent", model: "bogus-model" }, root);
  assert.equal(subagentNoValidation.modelValidation, undefined);
  assert.equal(subagentNoValidation.preflight, undefined);
  const cliModel = spawnSync(process.execPath, [cli, "plan", "Audit", "--model", "gemini-3.8-flash-high", "--known-model", "gemini-3.8-flash-high"], { cwd: root, encoding: "utf8" });
  assert.equal(cliModel.status, 0, cliModel.stderr);
  assert.equal(JSON.parse(cliModel.stdout).modelValidation.status, "checked-against-supplied-list");
  const cliBadModel = spawnSync(process.execPath, [cli, "plan", "Audit", "--model", "typo-model", "--known-model", "gemini-3.8-flash-high"], { cwd: root, encoding: "utf8" });
  assert.notEqual(cliBadModel.status, 0);

  // Per-spec model pinning without top-level args.model updates caveat and is checked against knownModels
  const perSpecPinned = planSquadCohort({
    manifest: {
      squads: {
        s1: {
          specialists: [{ role: "Auditor", objective: "Audit mcp", scopeFiles: ["mcp"], model: "gemini-4-hydrogen-high" }]
        }
      }
    },
    knownModels: ["gemini-4-hydrogen-high"]
  }, root);
  assert.equal(perSpecPinned.modelValidation.status, "checked-against-supplied-list");
  assert.match(perSpecPinned.modelProvenance.requestedModel, /per-worker \(gemini-4-hydrogen-high\)/);
  assert.doesNotMatch(perSpecPinned.modelProvenance.caveat, /No explicit model passed/);
  assert.throws(() => planSquadCohort({
    manifest: {
      squads: {
        s1: {
          specialists: [{ role: "Auditor", objective: "Audit mcp", scopeFiles: ["mcp"], model: "typo-spec-model" }]
        }
      }
    },
    knownModels: ["gemini-4-hydrogen-high"]
  }, root), /not in knownModels: typo-spec-model/);

  // 10. PR5-ARCH-02: swarm bundle templates use the board (member) name as identity
  const swarmIdentity = planSquadCohort({ task: "audit", roles: ["A", "B"], scopeFiles: ["src"] }, root);
  for (const w of swarmIdentity.workers) {
    const names = w.specialists.map(s => s.workerName);
    const tpl = swarmIdentity.bundleRecordTemplates[w.squadId].assignments.map(a => a.conversationId);
    assert.deepEqual(tpl, names);
  }
  assert.match(swarmIdentity.provenanceScaffold.identity, /roster name/);
  const subIdentity = planSquadCohort({ task: "audit", executionMode: "subagent" }, root);
  assert.match(subIdentity.bundleRecordTemplates[subIdentity.workers[0].squadId].assignments[0].conversationId, /^<invoke_subagent:/);

  // 11. PR5-ARCH-03 / PR5-SKILL-01: honest notes about layering cost and convention-only Pointer-Over-Wire
  assert.ok(swarmIdentity.notes.some(n => /not enforced/.test(n)));
  assert.ok(!swarmIdentity.notes.some(n => /Layered plan/.test(n)), "single-squad swarm plans have no squad lead");
  const layered = planSquadCohort({
    manifest: { squads: {
      a: { lead: { role: "A Lead", objective: "Lead a", scopeFiles: ["a"] }, specialists: [{ role: "SA", objective: "Check a", scopeFiles: ["a/x.mjs"] }] },
      b: { lead: { role: "B Lead", objective: "Lead b", scopeFiles: ["b"] }, specialists: [{ role: "SB", objective: "Check b", scopeFiles: ["b/y.mjs"] }] }
    } }
  }, root);
  assert.ok(layered.notes.some(n => /Layered plan/.test(n)));
  assert.equal(planSquadCohort({ task: "audit", executionMode: "subagent" }, root).notes.some(n => /not enforced/.test(n)), false);

  // 12. Stage 1 remediation regressions: inherit model in swarm + knownModels, explicit topology flat/layered, PascalCase ReadOnly
  const inheritSwarmPlan = planSquadCohort({
    task: "verify inherit normalization",
    model: "inherit",
    executionMode: "swarm",
    knownModels: ["gemini-4-hydrogen-high"]
  }, root);
  assert.equal(inheritSwarmPlan.workers[0].specialists[0].swarmAdd.model, undefined);

  const flatSelfDiag = planSquadCohort({
    manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
    topology: "flat",
    executionMode: "swarm"
  }, repoRoot);
  assert.equal(flatSelfDiag.topology.compiledPattern, "flat");
  assert.ok(flatSelfDiag.workers.every(w => w.lead === null));

  const pascalReadOnlyPlan = planSquadCohort({
    manifest: {
      squads: {
        pascal: {
          specialists: [
            { Role: "R1", Objective: "O1", ScopeFiles: ["src/a.js"], ReadOnly: true },
            { Role: "R2", Objective: "O2", ScopeFiles: ["src/a.js"], ReadOnly: true }
          ]
        }
      }
    }
  }, root);
  assert.equal(pascalReadOnlyPlan.topology.scopeOverlaps.length, 0);
  assert.equal(pascalReadOnlyPlan.workers[0].specialists[0].swarmAdd.brief.includes("ReadOnly"), false);

  console.log("✓ squad_planner model pinning, scope overlap checks, L6 provenance scaffold, and CLI plan");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
