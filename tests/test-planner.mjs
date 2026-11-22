import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSubagentSpec, superviseSwarmLayeredLead } from "../mcp/briefs.mjs";
import { handleSquadPlanner, normalizeScopePath, planSquadCohort, scopesOverlap } from "../mcp/planner.mjs";

const cli = fileURLToPath(new URL("../bin/agy-squad.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-planner-")));

try {
  // 1. Scope overlap primitive checks
  assert.equal(scopesOverlap("src", "src/a.js"), true);
  assert.equal(scopesOverlap(".", "docs/tools.md"), true);
  assert.equal(scopesOverlap("src", "src-extra/a.js"), false);
  assert.equal(scopesOverlap("mcp/dispatch.mjs", "mcp/handoffs.mjs"), false);
  assert.equal(scopesOverlap("README.md", "./README.md", path.join(repoRoot, "mcp", "..")), true);
  assert.equal(scopesOverlap("./nonexistent-scope.js", "nonexistent-scope.js", root), true);
  assert.equal(scopesOverlap("./mcp-missing/a.js", "mcp-missing\\a.js", root), true);

  // SQ-BOOST-MCP-001: Case-insensitive uncreated planned scopes + ancestor symlink resolution without breaking Linux ext4 sensitivity
  assert.equal(normalizeScopePath("src/Foo.js", { caseInsensitive: true }), "src/foo.js");
  assert.equal(scopesOverlap("src//Foo.js", "src/foo.js", { caseInsensitive: true }), true);
  assert.equal(scopesOverlap("src/./Foo.js", "src/foo.js", { caseInsensitive: true }), true);
  assert.equal(scopesOverlap(".//Foo.js", "foo.js", { caseInsensitive: true }), true);
  assert.equal(scopesOverlap("src/Foo.js", "src/foo.js", root, { caseInsensitive: true }), true);
  assert.equal(scopesOverlap("src/Foo", "src/foo/bar.js", root, { caseInsensitive: true }), true);
  assert.equal(scopesOverlap("src/Foo.js", "src/foo.js", root, { caseInsensitive: false }), false);
  assert.equal(scopesOverlap("src/Foo", "src/foo/bar.js", root, { caseInsensitive: false }), false);
  assert.equal(
    scopesOverlap("src/Foo.js", "src/foo.js", root),
    os.platform() === "win32" || os.platform() === "darwin"
  );
  const caseInsensitivePlan = planSquadCohort(
    {
      manifest: {
        squads: {
          alpha: {
            specialists: [
              { role: "Spec Upper", objective: "Create Foo", scopeFiles: ["uncreated/Foo.js"] },
              { role: "Spec Lower", objective: "Create foo", scopeFiles: ["uncreated/foo.js"] }
            ]
          }
        }
      },
      includeIntegrityAuditor: false
    },
    root,
    { caseInsensitive: true }
  );
  assert.equal(caseInsensitivePlan.topology.scopeOverlaps.length, 1);
  assert.match(caseInsensitivePlan.warnings[0], /scopeFiles overlap/);

  const caseSensitivePlan = planSquadCohort(
    {
      manifest: {
        squads: {
          alpha: {
            specialists: [
              { role: "Spec Upper", objective: "Create Foo", scopeFiles: ["uncreated/Foo.js"] },
              { role: "Spec Lower", objective: "Create foo", scopeFiles: ["uncreated/foo.js"] }
            ]
          }
        }
      },
      includeIntegrityAuditor: false
    },
    root,
    { caseInsensitive: false }
  );
  assert.equal(caseSensitivePlan.topology.scopeOverlaps.length, 0);

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
  assert.doesNotMatch(overlapTask.integrityAuditPlan[0].swarmAdd.brief, /or direct re-execution before CLEAN/);
  assert.match(overlapTask.integrityAuditPlan[0].swarmAdd.brief, /no raw \.system_generated\/ copies/);
  assert.match(overlapTask.integrityAuditPlan[0].swarmAdd.brief, /re-execution cannot satisfy CLEAN.*'Integrity Verdict: INTEGRITY VIOLATION' if traces missing\/tampered/);
  assert.equal(overlapTask.workspace, root);
  assert.equal(overlapTask.provenanceScaffold, undefined);
  assert.equal(overlapTask.bundleRecordTemplates, undefined);
  assert.equal(overlapTask.notes, undefined);

  // 3. Subagent-mode honest modelProvenance warning when exact model ID cannot be pinned
  const subagentPlan = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Alpha Lead", objective: "Coordinate alpha", scopeFiles: ["mcp"], readOnly: true },
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
  }
  assert.equal(selfDiagPlan.workspace, fs.realpathSync(repoRoot));
  assert.equal(selfDiagPlan.provenanceScaffold, undefined);
  assert.equal(selfDiagPlan.bundleRecordTemplates, undefined);
  assert.equal(selfDiagPlan.notes, undefined);
  const compactThreeSquad = planSquadCohort({
    manifest: {
      squads: {
        alpha: { specialists: [{ role: "A1", objective: "Audit a1", scopeFiles: ["src/a/1.js"] }, { role: "A2", objective: "Audit a2", scopeFiles: ["src/a/2.js"] }] },
        beta: { specialists: [{ role: "B1", objective: "Audit b1", scopeFiles: ["src/b/1.js"] }, { role: "B2", objective: "Audit b2", scopeFiles: ["src/b/2.js"] }] },
        gamma: { specialists: [{ role: "C1", objective: "Audit c1", scopeFiles: ["src/c/1.js"] }, { role: "C2", objective: "Audit c2", scopeFiles: ["src/c/2.js"] }] }
      }
    },
    executionMode: "swarm"
  }, root);
  const threeSquadBytes = Buffer.byteLength(JSON.stringify(compactThreeSquad), "utf8");
  assert.ok(
    threeSquadBytes < 16384,
    `Expected compact 3-squad swarm plan < 16 KB, got ${threeSquadBytes} B`
  );
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
  assert.equal(normalizedRootPlan.reportRoot, "custom/out");

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
  assert.ok(multiSquadPlan.verificationPipeline.some(step => /--allow-unaudited/.test(step)));

  const cliNoIntegrity = spawnSync(
    process.execPath,
    [cli, "plan", "--manifest", "plan-manifest.json", "--no-integrity"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(cliNoIntegrity.status, 0, cliNoIntegrity.stderr);
  const parsedNoInt = JSON.parse(cliNoIntegrity.stdout);
  assert.equal(parsedNoInt.integrityAuditPlan.length, 0);
  assert.ok(parsedNoInt.verificationPipeline.some(step => /--allow-unaudited/.test(step)));

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

  // 10. PR5-ARCH-02: swarm workers use board roster names; slimmed plans omit provenanceScaffold/bundleRecordTemplates/notes
  const swarmIdentity = planSquadCohort({ task: "audit", roles: ["A", "B"], scopeFiles: ["src"] }, root);
  for (const w of swarmIdentity.workers) {
    assert.deepEqual(
      w.specialists.map(s => s.swarmAdd.name),
      w.specialists.map(s => s.workerName)
    );
  }
  assert.equal(swarmIdentity.provenanceScaffold, undefined);
  assert.equal(swarmIdentity.bundleRecordTemplates, undefined);
  assert.equal(swarmIdentity.notes, undefined);
  const subIdentity = planSquadCohort({ task: "audit", executionMode: "subagent" }, root);
  assert.equal(subIdentity.workers[0].specialists[0].Subagent.TypeName, "self");
  assert.equal(subIdentity.provenanceScaffold, undefined);
  assert.equal(subIdentity.bundleRecordTemplates, undefined);
  assert.equal(subIdentity.notes, undefined);

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

  // ARCH-001: Multi-squad topology='flat' omits leads cleanly while 'layered' requires lead on each working squad
  const multiFlat = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "A", objective: "O", scopeFiles: ["a"], readOnly: true },
          specialists: [{ role: "A1", objective: "O", scopeFiles: ["a/1"] }]
        },
        beta: {
          lead: { role: "B", objective: "O", scopeFiles: ["b"], readOnly: true },
          specialists: [{ role: "B1", objective: "O", scopeFiles: ["b/1"] }]
        }
      }
    },
    topology: "flat",
    includeIntegrityAuditor: false
  }, root);
  assert.equal(multiFlat.topology.compiledPattern, "flat");
  assert.equal(multiFlat.workers[0].lead, null);
  assert.equal(multiFlat.workers[1].lead, null);
  assert.throws(() => planSquadCohort({
    manifest: {
      squads: {
        alpha: { specialists: [{ role: "A1", objective: "O", scopeFiles: ["a"] }] },
        beta: { specialists: [{ role: "B1", objective: "O", scopeFiles: ["b"] }] }
      }
    },
    topology: "layered",
    includeIntegrityAuditor: false
  }, root), /does not define a lead \(required for topology 'layered'\)/);
  assert.throws(() => planSquadCohort({
    task: "Audit auth",
    topology: "layered",
    includeIntegrityAuditor: false
  }, root), /topology 'layered' requires a manifest with per-squad leads/);

  // ARCH-002: Writable lead whose scopeFiles overlaps a specialist reports scopeOverlaps
  const writableLeadOverlap = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Writable Lead", objective: "Edit mcp", scopeFiles: ["mcp"] },
          specialists: [{ role: "Planner Spec", objective: "Edit planner", scopeFiles: ["mcp/planner.mjs"] }]
        }
      }
    },
    topology: "layered",
    includeIntegrityAuditor: false
  }, root);
  assert.equal(writableLeadOverlap.topology.scopeOverlaps.length, 1);

  // MCP-002: scopeFiles: undefined defaults to ["."] while empty [] fails validation
  const defaultScopePlan = planSquadCohort({
    task: "Inspect repo",
    includeIntegrityAuditor: false
  }, root);
  assert.deepEqual(defaultScopePlan.topology.scopeOverlaps, []);
  assert.ok(defaultScopePlan.workers[0].specialists[0].swarmAdd.brief.includes("Work within these files or directories:\n- ."));
  assert.throws(() => planSquadCohort({
    task: "Invalid empty scopeFiles",
    scopeFiles: [],
    includeIntegrityAuditor: false
  }, root), /scopeFiles/);

  // RUN-004, RUN-007, RUN-008, S1-SVC-01: Reserved keys rejected, readOnly: null rejected, PascalCase Model normalized/stripped so top-level model override wins
  const safeKeys = JSON.parse('{"squads":{"safe_sq":{"lead":{"role":"Safe","objective":"Audit","scopeFiles":["a"],"readOnly":true,"Model":"StalePascal"},"specialists":[{"role":"S1","objective":"Audit","scopeFiles":["a/1"]}]}}}');
  const safePlan = planSquadCohort({ manifest: safeKeys, model: "gemini-3.8-flash-high", includeIntegrityAuditor: false }, root);
  assert.equal(safePlan.workers[0].lead.swarmAdd.model, "gemini-3.8-flash-high");
  assert.equal(safePlan.workers[0].lead.swarmAdd.brief.includes("StalePascal"), false);
  const protoSquad = JSON.parse('{"squads":{"__proto__":{"specialists":[{"role":"Bad","objective":"Bad","scopeFiles":["a"]}]}}}');
  assert.throws(() => planSquadCohort({ manifest: protoSquad, includeIntegrityAuditor: false }, root), /Invalid reserved squad ID '__proto__'\./);
  assert.throws(() => planSquadCohort({
    manifest: {
      squads: {
        bad: {
          lead: { role: "Bad", objective: "Bad", scopeFiles: ["a"], readOnly: null },
          specialists: [{ role: "S1", objective: "Audit", scopeFiles: ["a/1"] }]
        }
      }
    },
    includeIntegrityAuditor: false
  }, root), /readOnly/);

  // RUN-013: Symlink pointing to overlapping real target detects scopeOverlaps
  const symDir = path.join(root, "sym-src");
  const realDir = path.join(root, "real-src");
  fs.mkdirSync(realDir, { recursive: true });
  fs.writeFileSync(path.join(realDir, "item.js"), "// item\n", "utf8");
  fs.symlinkSync(realDir, symDir, os.platform() === "win32" ? "junction" : "dir");
  const symlinkOverlap = planSquadCohort({
    manifest: {
      squads: {
        alpha: {
          lead: { role: "Lead", objective: "L", scopeFiles: ["docs"], readOnly: true },
          specialists: [
            { role: "Spec A", objective: "Edit real", scopeFiles: ["real-src/item.js"] },
            { role: "Spec B", objective: "Edit link", scopeFiles: ["sym-src/item.js"] }
          ]
        }
      }
    },
    topology: "layered",
    includeIntegrityAuditor: false
  }, root);
  assert.equal(symlinkOverlap.topology.scopeOverlaps.length, 1);

  // SQ-BOOST-MCP-001: Existing ancestor symlink resolves even when nested planned files do not exist yet
  assert.equal(scopesOverlap("sym-src/uncreated/NewFile.js", "real-src/uncreated/NewFile.js", root, { caseInsensitive: false }), true);
  assert.equal(scopesOverlap("sym-src/uncreated/NewFile.js", "real-src/uncreated/newfile.js", root, { caseInsensitive: false }), false);
  assert.equal(scopesOverlap("sym-src/uncreated/NewFile.js", "real-src/uncreated/newfile.js", root, { caseInsensitive: true }), true);
  const escapeOutsideDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-escape-")));
  try {
    fs.symlinkSync(escapeOutsideDir, path.join(root, "sym-escape"), os.platform() === "win32" ? "junction" : "dir");
    assert.equal(
      normalizeScopePath("sym-escape/uncreated/item.js", root, { caseInsensitive: false }),
      "sym-escape/uncreated/item.js"
    );
  } finally {
    fs.rmSync(escapeOutsideDir, { recursive: true, force: true });
  }
  const missingTarget = path.join(root, "does-not-exist-target");
  let brokenScopeSymCreated = false;
  try {
    fs.symlinkSync(missingTarget, path.join(root, "sym-broken"), os.platform() === "win32" ? "junction" : "dir");
    brokenScopeSymCreated = true;
  } catch (err) {
    if (err?.code !== "EPERM") throw err;
  }
  if (brokenScopeSymCreated) {
    assert.equal(scopesOverlap("sym-broken/Foo.js", "sym-broken/foo.js", root, { caseInsensitive: true }), true);
    assert.equal(scopesOverlap("sym-broken/Foo.js", "sym-broken/foo.js", root, { caseInsensitive: false }), false);
  }

  // RUN-014 & SVC-007 & SVC-001: precompiledSpecialists omits Call dispatch_squad; occupiedWorkerNames deduplicates; integrityAuditPlan populated
  assert.equal(subagentPlan.workers[0].lead.Subagent.Prompt.includes("Call dispatch_squad"), false);
  assert.equal(overlapTask.integrityAuditPlan.length, 1);
  assert.equal(overlapTask.integrityAuditPlan[0].reportSlot, "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md");
  const deduplicatedPlan = planSquadCohort({
    manifest: {
      squads: {
        task_squad: {
          lead: { role: "Lead", objective: "L", scopeFiles: ["a"], readOnly: true },
          specialists: [{ role: "Worker Reviewer Extra", objective: "W", scopeFiles: ["a/1"] }]
        }
      }
    },
    occupiedWorkerNames: ["Task-Squad-Lead", "task-squad-worker-review"],
    includeIntegrityAuditor: false
  }, root);
  assert.equal(deduplicatedPlan.workers[0].lead.workerName, "task-squad-lead-2");
  assert.equal(deduplicatedPlan.workers[0].specialists[0].workerName, "task-squad-worker-revi-2");
  assert.equal(deduplicatedPlan.workers[0].specialists[0].workerName.length <= 24, true);

  const exact18Squad = "s".repeat(18);
  const exact18Plan = planSquadCohort({
    manifest: { squads: { [exact18Squad]: { specialists: [{ role: "W", objective: "W", scopeFiles: ["a"] }] } } },
    includeIntegrityAuditor: false
  }, root);
  assert.equal(exact18Plan.warnings.some((w) => /occupiedWorkerNames/.test(w)), false);

  const longNamePlan = planSquadCohort({
    manifest: {
      squads: {
        ["s".repeat(19)]: {
          specialists: [{ role: "Worker", objective: "W", scopeFiles: ["a"] }]
        }
      }
    },
    includeIntegrityAuditor: false
  }, root);
  assert.ok(longNamePlan.warnings.some((w) => /24 characters/.test(w) && /occupiedWorkerNames/.test(w)));

  // 11. Workspace argument, symlinked workspaces, handleSquadPlanner errors, and bounded-read/budget checks
  const altDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-planner-alt-")));
  const linkRoot = path.join(path.dirname(root), `${path.basename(root)}-link`);
  fs.symlinkSync(root, linkRoot, os.platform() === "win32" ? "junction" : "dir");
  try {
    const overridePlan = planSquadCohort({
      manifestPath: "plan-manifest.json",
      workspace: root,
      executionMode: "swarm"
    }, altDir);
    assert.equal(overridePlan.workspace, root);
    assert.equal(overridePlan.workers[0].squadId, "alpha");
    assert.match(
      inlineSwarmLeadPlan.workers[0].lead.swarmAdd.brief,
      /native search\/read tools \(grep_search\/find_by_name \+ bounded read_file slices on large files\)/
    );
    assert.doesNotMatch(inlineSwarmLeadPlan.workers[0].lead.swarmAdd.brief, /rtk grep|rtk find|rtk read|<=150-line|\[agy-transcript-access:/);
    assert.match(
      overridePlan.workers[0].specialists[0].swarmAdd.brief,
      /native search\/read tools \(grep_search\/find_by_name \+ bounded read_file slices on large files\)/
    );
    assert.doesNotMatch(overridePlan.workers[0].specialists[0].swarmAdd.brief, /rtk grep|rtk find|rtk read|<=150-line|\[agy-transcript-access:/);
    assert.match(
      overridePlan.integrityAuditPlan[0].swarmAdd.brief,
      /native search\/read tools \(grep_search\/find_by_name \+ bounded read_file slices on large files\)/
    );
    assert.match(
      overridePlan.integrityAuditPlan[0].swarmAdd.brief,
      /~\/\.gemini\/antigravity\*\/brain\/<id>\/\.system_generated\/logs\/transcript\.jsonl.*sender=<coordId> \+ @<workerName>/
    );
    assert.doesNotMatch(overridePlan.integrityAuditPlan[0].swarmAdd.brief, /rtk grep|rtk find|rtk read|<=150-line|\[agy-transcript-access:/);

    const symlinkAbsPlan = handleSquadPlanner({
      manifestPath: path.join(linkRoot, "plan-manifest.json"),
      workspace: linkRoot,
      executionMode: "swarm"
    }, altDir);
    assert.equal(symlinkAbsPlan.isError, undefined, symlinkAbsPlan.content[0].text);
    assert.equal(JSON.parse(symlinkAbsPlan.content[0].text).workspace, root);

    fs.writeFileSync(path.join(root, "scope-real.txt"), "x\n");
    let scopeAliasCreated = false;
    try {
      fs.symlinkSync(path.join(root, "scope-real.txt"), path.join(root, "scope-alias.txt"), "file");
      scopeAliasCreated = true;
    } catch (err) {
      if (err?.code !== "EPERM") throw err;
    }
    if (scopeAliasCreated) {
      assert.equal(scopesOverlap("scope-real.txt", "scope-alias.txt", linkRoot), true);
    }

    const taskOverridePlan = handleSquadPlanner({ task: "Audit task override", workspace: root }, altDir);
    assert.equal(taskOverridePlan.isError, undefined, taskOverridePlan.content[0].text);
    assert.equal(JSON.parse(taskOverridePlan.content[0].text).workspace, root);

    const noDefaultPlannerErr = handleSquadPlanner({ manifestPath: "missing.json" }, altDir);
    assert.equal(noDefaultPlannerErr.isError, true);
    assert.match(noDefaultPlannerErr.content[0].text, /Pass 'workspace'/);

    for (const badWs of ["", 42, path.join(root, "plan-manifest.json"), path.join(root, "missing-dir")]) {
      assert.equal(handleSquadPlanner({ task: "bad ws", workspace: badWs }, altDir).isError, true);
    }

    const minAgent = { role: "R", objective: "O", scopeFiles: ["a"] };
    assert.ok(Buffer.byteLength(buildSubagentSpec(minAgent, "s", "m.json", 1).Prompt, "utf8") <= 1600, "W4 target: subagent specialist <= 1600 B");
    assert.ok(Buffer.byteLength(buildSubagentSpec(minAgent, "s", "m.json", undefined).Prompt, "utf8") <= 3100, "W4 target: subagent lead <= 3100 B");
    const minSwarmCohort = planSquadCohort({
      manifest: { squads: { s: { lead: minAgent, specialists: [minAgent] } } },
      executionMode: "swarm"
    }, root);
    assert.ok(Buffer.byteLength(minSwarmCohort.workers[0].specialists[0].swarmAdd.brief, "utf8") <= 1600, "W4 target: /swarm specialist <= 1600 B");
    assert.ok(Buffer.byteLength(minSwarmCohort.workers[0].lead.swarmAdd.brief, "utf8") <= 3100, "W4 target: /swarm lead <= 3100 B");
    const minSwarmAudit = minSwarmCohort.integrityAuditPlan[0].swarmAdd.brief;
    assert.ok(Buffer.byteLength(minSwarmAudit, "utf8") <= 2500, `Expected swarm auditor brief <= 2500 B, got ${Buffer.byteLength(minSwarmAudit, "utf8")}`);

    // SQ-RUN-003: Reserved /swarm names (all, coordinator, narrator, monitor) must never be allocated
    const reservedPlan = planSquadCohort({
      manifest: {
        squads: {
          "___": {
            specialists: [
              { role: "monitor", objective: "O1", scopeFiles: ["a"] },
              { role: "coordinator", objective: "O2", scopeFiles: ["b"] },
              { role: "narrator", objective: "O3", scopeFiles: ["c"] },
              { role: "all", objective: "O4", scopeFiles: ["d"] }
            ]
          }
        }
      },
      includeIntegrityAuditor: false
    }, root);
    const reservedNames = new Set(["all", "coordinator", "narrator", "monitor"]);
    const emittedNames = reservedPlan.workers[0].specialists.map(s => s.workerName);
    assert.ok(emittedNames.every(n => !reservedNames.has(n)), `Expected no reserved swarm names, got: ${emittedNames.join(", ")}`);
    assert.equal(new Set(emittedNames).size, 4);

    // SQ-MCP-002 & decoupled subagent modelProvenance: must not mention retired transcript tools or hardcode agy-context transcript read
    const subProvPlan = planSquadCohort({ task: "Check provenance", executionMode: "subagent" }, root);
    assert.doesNotMatch(JSON.stringify(subProvPlan), /query_transcript|read_transcript/);
    assert.match(subProvPlan.modelProvenance.verificationMethod, /session transcripts/);
    assert.doesNotMatch(subProvPlan.modelProvenance.verificationMethod, /agy-context transcript read/);

    // SQ-RUN-007: Planner preserves resolveIntegrityAuditor warning when custom integrity_auditor defines a lead alongside specialists
    const customAuditWarnPlan = planSquadCohort({
      manifest: {
        squads: {
          work: { specialists: [{ role: "Worker", objective: "Audit", scopeFiles: ["a"] }] },
          integrity_auditor: {
            lead: { role: "Ignored Audit Lead", objective: "Lead", scopeFiles: ["a"] },
            specialists: [{ role: "Audit Spec", objective: "Audit traces", scopeFiles: ["a"] }]
          }
        }
      }
    }, root);
    assert.ok(
      customAuditWarnPlan.warnings.some(w => /Custom 'integrity_auditor' lead is ignored/.test(w)),
      `Expected SQ-RUN-007 integrity_auditor lead warning, got: ${JSON.stringify(customAuditWarnPlan.warnings)}`
    );
  } finally {
    fs.rmSync(linkRoot, { recursive: true, force: true });
    fs.rmSync(altDir, { recursive: true, force: true });
  }

    // W1 Regressions (LEAD-RUN-001, SVC-005, SVC-008, SVC-009)
    // LEAD-RUN-001: equal array scopeFiles & ScopeFiles inside canonicalizeAgentSpec must not throw conflict
    const aliasArrayPlan = planSquadCohort({
      manifest: {
        squads: {
          alpha: {
            specialists: [{ role: "Spec", objective: "Verify", scopeFiles: ["src/a.js"], ScopeFiles: ["src/a.js"] }]
          }
        }
      },
      includeIntegrityAuditor: false
    }, root);
    assert.equal(aliasArrayPlan.workers[0].specialists.length, 1);

    // SVC-005: topology='flat' must validate stripped lead blocks rather than silently passing invalid scopeFiles/typeName
    assert.throws(
      () => planSquadCohort({
        manifest: {
          squads: {
            alpha: {
              lead: { role: "Bad Lead", objective: "Lead", scopeFiles: ["/abs/bad"], typeName: "research" },
              specialists: [{ role: "Spec", objective: "Ok", scopeFiles: ["src/a.js"] }]
            }
          }
        },
        topology: "flat"
      }, root),
      /workspace-relative|writable typeName/
    );

    // SVC-008: explicit model: "inherit" is distinguished from omitted model in modelProvenance.caveat
    const explicitInheritPlan = planSquadCohort({ task: "Audit", model: "inherit" }, root);
    assert.doesNotMatch(
      explicitInheritPlan.modelProvenance.caveat,
      /No explicit model passed/,
      "SVC-008: explicit model='inherit' must not report 'No explicit model passed'"
    );
    assert.match(explicitInheritPlan.modelProvenance.caveat, /Explicit 'inherit'/);

    // SVC-009: knownModels passed with executionMode='subagent' must reject rather than silently ignore
    assert.throws(
      () => planSquadCohort({ task: "Audit", executionMode: "subagent", knownModels: ["bogus-model"] }, root),
      /knownModels is only supported with executionMode 'swarm'/
    );

    // W2 Regressions (SQ-SWARM-BOARD-SCOPE, SKILL-SG-01, SVC-007, SVC-004)
    // SQ-SWARM-BOARD-SCOPE: default board scoping placeholders + explicit boardSince/boardSeqs options
    const scopedDefaultPlan = planSquadCohort({
      manifest: {
        squads: {
          skill_and_pr_review_audit: {
            lead: { role: "Skill Lead", objective: "Lead", scopeFiles: ["a"] },
            specialists: [{ role: "Audit Spec", objective: "Audit", scopeFiles: ["a"] }]
          }
        }
      }
    }, root);
    const s1Brief = scopedDefaultPlan.workers[0].specialists[0].swarmAdd.brief;
    const leadWorker = scopedDefaultPlan.workers[0].lead.workerName;
    assert.ok(s1Brief.includes(`@${leadWorker}`), `SKILL-SG-01: expected exact @${leadWorker} in specialist brief, got:\n${s1Brief}`);
    assert.ok(!s1Brief.includes("@skill_and_pr_review_audit-lead") && !s1Brief.includes("@<lead>"), "SKILL-SG-01: must never emit literal @<squad>-lead or @<lead>");
    assert.match(s1Brief, /read_board\{since:\s*<cohortBaseSeq>\}/, "SQ-SWARM-BOARD-SCOPE: specialist brief must guide read_board{since: <cohortBaseSeq>}");
    assert.match(scopedDefaultPlan.integrityAuditPlan[0].swarmAdd.brief, /read_board\{seqs:/, "SQ-SWARM-BOARD-SCOPE: auditor brief must scope read_board via seqs");

    const explicitBoardPlan = planSquadCohort({
      manifest: {
        squads: {
          a: {
            specialists: [{ role: "Very Long Specialist Role Name Exceeding Limit", objective: "Check", scopeFiles: ["a"] }]
          }
        }
      },
      boardSince: 42,
      boardSeqs: [43, 44]
    }, root);
    assert.match(explicitBoardPlan.workers[0].specialists[0].swarmAdd.brief, /read_board\{since:\s*42\}/);
    assert.match(explicitBoardPlan.integrityAuditPlan[0].swarmAdd.brief, /read_board\{seqs:\s*\[43,\s*44\]\}/);
    assert.ok(
      explicitBoardPlan.warnings.some(w => /truncate at 24 characters/i.test(w)),
      `SVC-007: expected 24-char workerName truncation warning even when squadId='a', got: ${JSON.stringify(explicitBoardPlan.warnings)}`
    );
    assert.throws(
      () => planSquadCohort({ task: "Check", boardSince: -1 }, root),
      /boardSince/
    );
    assert.throws(
      () => planSquadCohort({ task: "Check", executionMode: "subagent", boardSince: 10 }, root),
      /boardSince.*swarm/i
    );

    // SVC-004: mixed flat+layered cohort emits compiledPattern: "mixed"
    const mixedPlan = planSquadCohort({
      manifest: {
        squads: {
          flat_sq: { specialists: [{ role: "Flat Spec", objective: "Check flat", scopeFiles: ["a"] }] },
          layered_sq: {
            lead: { role: "Layered Lead", objective: "Synthesize", scopeFiles: ["b"] },
            specialists: [{ role: "Layered Spec", objective: "Check layered", scopeFiles: ["b"] }]
          }
        }
      }
    }, root);
    assert.equal(mixedPlan.topology.compiledPattern, "mixed", "SVC-004: mixed flat+layered squads must emit compiledPattern='mixed'");

    const runCli = args => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
    fs.writeFileSync(path.join(root, "board-scope-manifest.json"), JSON.stringify({
      squads: {
        alpha: {
          lead: { role: "Lead", objective: "Lead", scopeFiles: ["a"] },
          specialists: [{ role: "Spec", objective: "Check", scopeFiles: ["a"] }]
        }
      }
    }));
    const cliBoardPlan = runCli([
      "plan",
      "--manifest",
      "board-scope-manifest.json",
      "--board-since",
      "42",
      "--board-seq",
      "44",
      "--board-seq",
      "47"
    ]);
    assert.equal(cliBoardPlan.status, 0, cliBoardPlan.stderr);
    const cliBoardJson = JSON.parse(cliBoardPlan.stdout);
    assert.match(cliBoardJson.workers[0].lead.swarmAdd.brief, /read_board\{since:\s*42\}/);
    assert.match(cliBoardJson.integrityAuditPlan[0].swarmAdd.brief, /read_board\{seqs:\s*\[44,\s*47\]\}/);
    const badBoardSince = runCli(["plan", "--board-since", "-1", "Audit"]);
    assert.notEqual(badBoardSince.status, 0);
    const badBoardSeq = runCli(["plan", "--board-seq", "abc", "Audit"]);
    assert.notEqual(badBoardSeq.status, 0);

    // OPT-RT-08: multi-squad manifest with shared custom integrity_auditor.lead validates and warns once
    const multiCustomAudit = planSquadCohort({
      manifest: {
        squads: {
          alpha: { lead: { role: "A Lead", objective: "Lead a", scopeFiles: ["a"] }, specialists: [{ role: "A1", objective: "Do a", scopeFiles: ["a/1"] }] },
          beta: { lead: { role: "B Lead", objective: "Lead b", scopeFiles: ["b"] }, specialists: [{ role: "B1", objective: "Do b", scopeFiles: ["b/1"] }] },
          integrity_auditor: {
            lead: { role: "Ignored Audit Lead", objective: "Ignored", scopeFiles: ["."] },
            specialists: [{ role: "Shared Auditor", objective: "Audit", scopeFiles: ["."] }]
          }
        }
      }
    }, root);
    assert.equal(multiCustomAudit.integrityAuditPlan.length, 2);
    assert.equal(multiCustomAudit.warnings.filter(w => /Custom 'integrity_auditor' lead is ignored/.test(w)).length, 1);

    // Wave 2 Regressions: W2-RUN-002, W2-RUN-003, W2-SVC-001, W2-SCRIPT-001, SD2-SKILL-01..02, OPT-GAP-AUDIT-LEAD
    // W2-RUN-002: boardSince: 0 must not emit self-contradictory '(no unfiltered/since:0/limit:50)' or lead ', since: 0,'
    const zeroBoardPlan = planSquadCohort({ task: "Check zero cursor", boardSince: 0 }, root);
    const zeroBrief = zeroBoardPlan.workers[0].specialists[0].swarmAdd.brief;
    assert.match(zeroBrief, /Board scope: read_board\{since:\s*0\} only/);
    assert.doesNotMatch(zeroBrief, /no unfiltered\/since:0/, "W2-RUN-002: boardSince=0 must omit since:0 from negative clause");
    const zeroLayeredLeadPlan = planSquadCohort({
      manifest: {
        squads: {
          alpha: {
            lead: { role: "Zero Lead", objective: "Lead", scopeFiles: ["a"] },
            specialists: [{ role: "Zero Spec", objective: "Spec", scopeFiles: ["b"] }]
          }
        }
      },
      topology: "layered",
      boardSince: 0
    }, root);
    const zeroLeadBrief = zeroLayeredLeadPlan.workers[0].lead.swarmAdd.brief;
    assert.match(zeroLeadBrief, /Board scope: read_board\{since:\s*0\} only/);
    assert.match(zeroLeadBrief, /\(never unfiltered read_board\(\) or limit: 50\)/, "W2-RUN-002: layered lead brief with boardSince=0 must phrase negative clause cleanly");
    assert.doesNotMatch(zeroLeadBrief, /since:\s*0,\s*or limit:\s*50/, "W2-RUN-002: layered lead brief with boardSince=0 must not forbid since: 0");

    // W2-RUN-003: CONTROL_CHAR_RE rejected in single-line header fields (role, typeName, model, expectedDeliverable)
    for (const [badField, val] of [
      ["role", "Spec\nReport slot: evil"],
      ["typeName", "self\r\nevil"],
      ["model", "inherit\nfake"],
      ["expectedDeliverable", "Report\u2028injected"]
    ]) {
      assert.throws(
        () => buildSubagentSpec({ role: "Spec", objective: "Check", scopeFiles: ["a"], [badField]: val }, "alpha", "m.json", 1),
        /invalid brief or payload fields/,
        `W2-RUN-003: control character in '${badField}' must throw`
      );
    }
    assert.throws(
      () => buildSubagentSpec({ role: "Spec\nEvil", objective: "Check", scopeFiles: ["/abs"] }, "alpha", "m.json", 1),
      err => err instanceof Error && /invalid brief or payload fields/.test(err.message) && !err.message.includes("\n"),
      "W2-RUN-003: control character in role must fail before leaking raw newline into scopeFiles error"
    );

    // W2-SVC-001: topology='flat' must validate stripped lead readOnly and ReadOnly alias conflicts
    assert.throws(
      () => planSquadCohort({
        manifest: {
          squads: {
            alpha: {
              lead: { role: "Flat Lead", objective: "Lead", scopeFiles: ["a"], readOnly: "yes" },
              specialists: [{ role: "Spec", objective: "Ok", scopeFiles: ["a"] }]
            }
          }
        },
        topology: "flat"
      }, root),
      /readOnly must be a boolean/,
      "W2-SVC-001: stripped flat lead with non-boolean readOnly must reject"
    );
    assert.throws(
      () => planSquadCohort({
        manifest: {
          squads: {
            alpha: {
              lead: { role: "Flat Lead", objective: "Lead", scopeFiles: ["a"], readOnly: true, ReadOnly: false },
              specialists: [{ role: "Spec", objective: "Ok", scopeFiles: ["a"] }]
            }
          }
        },
        topology: "flat"
      }, root),
      /cannot define both 'readOnly' and 'ReadOnly'/,
      "W2-SVC-001: stripped flat lead with conflicting readOnly/ReadOnly must reject"
    );

    // W2-SCRIPT-001: CLI plan normalizes leading ./ on --scope and --report-root
    const dotPlanCli = runCli(["plan", "--scope", "./src/a.js", "--report-root", "./scratch/w2-custom", "Check ./ flags"]);
    assert.equal(dotPlanCli.status, 0, `W2-SCRIPT-001: plan --scope ./ --report-root ./ failed: ${dotPlanCli.stderr}`);
    const dotPlanJson = JSON.parse(dotPlanCli.stdout);
    assert.equal(dotPlanJson.workers[0].specialists[0].reportSlot, "scratch/w2-custom/squad-task_squad/specialist-1/report.md");
    assert.match(dotPlanJson.workers[0].specialists[0].swarmAdd.brief, /^- src\/a\.js$/m);

    // OPT-GAP-AUDIT-LEAD: swarm integrity auditor lead instructions include Target Squad, Evidence Digest, and Integrity Verdict
    const swarmAuditLeadSpec = buildSubagentSpec(
      { role: "Audit Lead", objective: "Lead audit", scopeFiles: ["."] },
      "integrity_auditor-alpha",
      "m.json",
      undefined,
      undefined,
      { executionMode: "swarm" }
    );
    assert.match(swarmAuditLeadSpec.Prompt, /Target Squad: <id>/);
    assert.match(swarmAuditLeadSpec.Prompt, /Evidence Digest: <sha256>/);
    assert.match(swarmAuditLeadSpec.Prompt, /Integrity Verdict: CLEAN \| INTEGRITY VIOLATION/);

    // SD2-SKILL-01 & SD2-SKILL-02: comparative-research-manifest.json has 0 writable scope overlaps and /swarm lead wording
    const compPlan = planSquadCohort(
      { manifestPath: ".agents/skills/self-diagnosis/resources/comparative-research-manifest.json" },
      repoRoot
    );
    assert.deepEqual(compPlan.topology.scopeOverlaps, [], "SD2-SKILL-01: comparative-research-manifest specialists must be readOnly: true");
    const compLeadBrief = compPlan.workers[0].lead.swarmAdd.brief;
    assert.match(compLeadBrief, /read_board\{since\|seqs\}/);
    assert.match(compLeadBrief, /~\/\.gemini\/antigravity\*\/brain\/<id>\/\.system_generated\/logs\/transcript\.jsonl/);
    assert.match(compLeadBrief, /agy-context transcript/);
    assert.match(compLeadBrief, /Content Verdict/);
    assert.match(compLeadBrief, /post <=500B READY/);
    assert.doesNotMatch(compLeadBrief, /Send a <=500B READY receipt to parent|rtk grep|rtk find|rtk read|<=150-line/);

    const selfDiagDecoupledPlan = planSquadCohort(
      { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" },
      repoRoot
    );
    assert.doesNotMatch(JSON.stringify(selfDiagDecoupledPlan), /rtk grep|rtk find|rtk read|<=150-line|\[agy-transcript-access:/);

    // v0.1.3 Remediation Regressions: MCP-001, OPT-IO-6, OPT-BRIEF-03
    // MCP-001: Subagent modelProvenance reflects per-worker manifest models (aliases and non-aliases) when top-level model is omitted or 'inherit'
    const subagentPerWorkerAlias = planSquadCohort({
      manifest: {
        squads: {
          alpha: {
            specialists: [{ role: "Pro Spec", objective: "Audit", scopeFiles: ["mcp"], model: "pro" }]
          }
        }
      },
      executionMode: "subagent"
    }, root);
    assert.equal(subagentPerWorkerAlias.workers[0].specialists[0].Subagent.Model, "pro");
    assert.equal(subagentPerWorkerAlias.modelProvenance.requestedModel, "per-worker (pro)");
    assert.equal(subagentPerWorkerAlias.modelProvenance.effectiveModel, "per-worker (pro)");
    assert.equal(subagentPerWorkerAlias.modelProvenance.warning, undefined);

    const subagentPerWorkerMixed = planSquadCohort({
      manifest: {
        squads: {
          alpha: {
            lead: { role: "Lead", objective: "Lead", scopeFiles: ["mcp"], readOnly: true, model: "pro" },
            specialists: [{ role: "NonAlias Spec", objective: "Audit", scopeFiles: ["mcp/planner.mjs"], model: "gemini-4-neon-high" }]
          }
        }
      },
      executionMode: "subagent",
      model: "inherit"
    }, root);
    assert.equal(subagentPerWorkerMixed.modelProvenance.requestedModel, "per-worker (pro, gemini-4-neon-high)");
    assert.equal(subagentPerWorkerMixed.modelProvenance.effectiveModel, "per-worker (pro)");
    assert.match(subagentPerWorkerMixed.modelProvenance.warning, /gemini-4-neon-high/);
    assert.equal(subagentSpecWarn.modelProvenance.requestedModel, "per-worker (gemini-3.8-flash-high, gemini-2.5-pro)");
    assert.equal(subagentSpecWarn.modelProvenance.effectiveModel, "inherit");

    // OPT-IO-6: Partition siblingOverlaps vs leadSpecialistOverlaps and support --read-only / roleScopes on inline task
    const benchPlan = planSquadCohort({
      manifestPath: "benchmarks/teamwork-vs-squad/manifest.json",
      topology: "layered",
      includeIntegrityAuditor: false
    }, repoRoot);
    assert.equal(benchPlan.topology.scopeOverlaps.length, 3);
    assert.equal(benchPlan.topology.siblingOverlaps.length, 1);
    assert.equal(benchPlan.topology.leadSpecialistOverlaps.length, 2);
    assert.ok(benchPlan.topology.siblingOverlaps.every(o => o.kind === "sibling"));
    assert.ok(benchPlan.topology.leadSpecialistOverlaps.every(o => o.kind === "lead-specialist"));
    assert.ok(
      benchPlan.warnings.some(w => /Detected 1 writable sibling scopeFiles overlap/.test(w)),
      `OPT-IO-6: expected 1 writable sibling overlap warning, got: ${JSON.stringify(benchPlan.warnings)}`
    );
    assert.equal(writableLeadOverlap.topology.siblingOverlaps.length, 0);
    assert.equal(writableLeadOverlap.topology.leadSpecialistOverlaps.length, 1);
    assert.ok(!writableLeadOverlap.warnings.some(w => /writable sibling scopeFiles overlap/.test(w)));

    const readOnlyInlineTask = planSquadCohort({
      task: "Read-only parallel audit",
      roles: ["Auditor A", "Auditor B", "Auditor C"],
      scopeFiles: ["mcp"],
      readOnly: true,
      includeIntegrityAuditor: false
    }, root);
    assert.deepEqual(readOnlyInlineTask.topology.scopeOverlaps, []);
    assert.deepEqual(readOnlyInlineTask.topology.siblingOverlaps, []);
    assert.ok(!readOnlyInlineTask.warnings.some(w => /scopeFiles overlap/.test(w)));

    const cliReadOnlyTask = runCli(["plan", "--read-only", "--role", "A", "--role", "B", "--scope", "mcp", "--no-integrity", "Audit mcp"]);
    assert.equal(cliReadOnlyTask.status, 0, cliReadOnlyTask.stderr);
    const cliReadOnlyJson = JSON.parse(cliReadOnlyTask.stdout);
    assert.deepEqual(cliReadOnlyJson.topology.scopeOverlaps, []);
    assert.deepEqual(cliReadOnlyJson.topology.siblingOverlaps, []);

    const cliRoleScopeTask = runCli([
      "plan",
      "--role", "A",
      "--role", "B",
      "--role-scope", "A=./mcp/planner.mjs",
      "--role-scope", "B=./mcp/briefs.mjs",
      "--no-integrity",
      "Disjoint task"
    ]);
    assert.equal(cliRoleScopeTask.status, 0, cliRoleScopeTask.stderr);
    const cliRoleScopeJson = JSON.parse(cliRoleScopeTask.stdout);
    assert.deepEqual(cliRoleScopeJson.topology.scopeOverlaps, []);
    assert.match(cliRoleScopeJson.workers[0].specialists[0].swarmAdd.brief, /^- mcp\/planner\.mjs$/m);
    assert.match(cliRoleScopeJson.workers[0].specialists[1].swarmAdd.brief, /^- mcp\/briefs\.mjs$/m);

    assert.throws(
      () => planSquadCohort({ task: "Bad ro", readOnly: "yes" }, root),
      /readOnly must be a boolean/
    );
    assert.throws(
      () => planSquadCohort({ manifest: { squads: { s: { specialists: [{ role: "R", objective: "O", scopeFiles: ["a"] }] } } }, readOnly: true }, root),
      /can only be passed with task/
    );
    assert.throws(
      () => planSquadCohort({ task: "Bad roleScopes", roles: ["A"], roleScopes: { Unknown: ["a"] } }, root),
      /Unknown roleScopes key/
    );
    const crossSquadLeadVsSpec = planSquadCohort({
      manifest: {
        squads: {
          sqA: {
            lead: { role: "Lead A", objective: "Edit", scopeFiles: ["mcp/planner.mjs"] },
            specialists: [{ role: "Spec A", objective: "Edit", scopeFiles: ["mcp/briefs.mjs"] }]
          },
          sqB: {
            lead: { role: "Lead B", objective: "Audit", readOnly: true, scopeFiles: ["mcp"] },
            specialists: [{ role: "Spec B", objective: "Edit", scopeFiles: ["mcp/planner.mjs"] }]
          }
        }
      },
      topology: "layered",
      includeIntegrityAuditor: false
    }, root);
    assert.equal(crossSquadLeadVsSpec.topology.siblingOverlaps.length, 1, "OPT-IO-6: cross-squad lead vs other-squad specialist must classify as sibling");
    assert.equal(crossSquadLeadVsSpec.topology.leadSpecialistOverlaps.length, 0);
    assert.ok(crossSquadLeadVsSpec.warnings.some(w => /Detected 1 writable sibling scopeFiles overlap/.test(w)));
    const defaultRoleScopeTask = planSquadCohort({
      task: "Single default role with roleScopes",
      roleScopes: { "Task Worker": ["mcp/planner.mjs"] },
      includeIntegrityAuditor: false
    }, root);
    assert.match(defaultRoleScopeTask.workers[0].specialists[0].swarmAdd.brief, /^- mcp\/planner\.mjs$/m);

    // OPT-BRIEF-03: superviseSwarmLayeredLead omits coordinator-only swarm add/kill directives & duplicate <cohortBaseSeq>, saving >= 226 B/lead
    const layeredLeadCheckPlan = planSquadCohort({
      manifest: {
        squads: {
          alpha: {
            lead: { role: "Layered Lead", objective: "Synthesize", scopeFiles: ["a"], readOnly: true },
            specialists: [{ role: "Spec", objective: "Audit", scopeFiles: ["a"], readOnly: true }]
          }
        }
      },
      topology: "layered",
      boardSince: 11
    }, root);
    const layeredLeadBrief = layeredLeadCheckPlan.workers[0].lead.swarmAdd.brief;
    assert.doesNotMatch(layeredLeadBrief, /swarm add/);
    assert.doesNotMatch(layeredLeadBrief, /kill finished workers/);
    assert.doesNotMatch(layeredLeadBrief, /<cohortBaseSeq>/);
    assert.match(layeredLeadBrief, /Board scope: read_board\{since:\s*11\} only/);
    assert.match(layeredLeadBrief, /follow Board scope above/);
    assert.ok(
      Buffer.byteLength(superviseSwarmLayeredLead, "utf8") <= 600,
      `OPT-BRIEF-03: expected compact superviseSwarmLayeredLead <= 600 B, got ${Buffer.byteLength(superviseSwarmLayeredLead, "utf8")} B`
    );

    // UX-SQ-003 & UX-SQ-015: handleSquadPlanner ENOENT recommends global 'agy-squad plan' and verificationPipeline surfaces 'agy-squad finalize'
    const missingPlanErr = handleSquadPlanner({ manifestPath: "missing-manifest.json" }, root);
    assert.equal(missingPlanErr.isError, true);
    assert.match(missingPlanErr.content[0].text, /agy-squad plan/);
    assert.doesNotMatch(missingPlanErr.content[0].text, /node bin\/agy-squad\.mjs/);
    assert.ok(
      layeredLeadCheckPlan.verificationPipeline.some(step => /agy-squad finalize <bundle-record\.json>/.test(step)),
      "UX-SQ-015: audited verificationPipeline must surface agy-squad finalize shorthand"
    );
    assert.ok(
      defaultRoleScopeTask.verificationPipeline.some(step => /agy-squad finalize <bundle-record\.json> --allow-unaudited/.test(step)),
      "UX-SQ-015: standalone (--no-integrity) verificationPipeline must surface finalize --allow-unaudited"
    );

    // UX-SQ-R2-001 & UX-SQ-R2-002: verificationPipeline bundle-init --digest includes --handoffs/--handoff, and README Quickstart plan runs warning-free with single-squad auditor slot
    assert.ok(
      layeredLeadCheckPlan.verificationPipeline.some(
        step => /agy-squad bundle-init\b/.test(step) && /--digest\b/.test(step) && /--handoffs?\b/.test(step)
      ),
      `UX-SQ-R2-001: verificationPipeline bundle-init --digest must include --handoffs or --handoff, got: ${JSON.stringify(layeredLeadCheckPlan.verificationPipeline)}`
    );
    const readmeQuickstartPlan = runCli([
      "plan",
      "--mode", "swarm",
      "--read-only",
      "--scope", "src",
      "--role", "Security",
      "--role", "Test Audit",
      "Audit authentication flow"
    ]);
    assert.equal(readmeQuickstartPlan.status, 0, `UX-SQ-R2-002: README Quickstart plan failed: ${readmeQuickstartPlan.stderr}`);
    const readmeQuickstartJson = JSON.parse(readmeQuickstartPlan.stdout);
    assert.deepEqual(
      readmeQuickstartJson.warnings,
      [],
      `UX-SQ-R2-002: README Quickstart plan must emit 0 warnings, got: ${JSON.stringify(readmeQuickstartJson.warnings)}`
    );
    assert.equal(readmeQuickstartJson.workers.length, 1);
    assert.equal(readmeQuickstartJson.workers[0].squadId, "task_squad");
    assert.equal(
      readmeQuickstartJson.integrityAuditPlan[0].reportSlot,
      "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md"
    );

    // RAW-RUN-001: flat & task plans expose workers[i].synthesisSlot plus coordinator synthesis guidance (including custom --report-root)
    assert.equal(readmeQuickstartJson.workers[0].lead, null);
    assert.equal(
      readmeQuickstartJson.workers[0].synthesisSlot,
      "scratch/agy-squad/squad-task_squad/lead/report.md",
      "RAW-RUN-001: flat task plan must expose synthesisSlot pointing to lead/report.md"
    );
    assert.ok(
      readmeQuickstartJson.verificationPipeline.some(
        step => step.includes("scratch/agy-squad/squad-task_squad/lead/report.md") && step.includes("Content Verdict: PASS|FAIL|BLOCKED")
      ),
      "RAW-RUN-001: flat task verificationPipeline must surface coordinator synthesisSlot before bundle-init"
    );
    const customRootFlatPlan = planSquadCohort({
      task: "Custom root flat audit",
      roles: ["Security"],
      reportRoot: "scratch/custom-flat",
      includeIntegrityAuditor: false
    }, root);
    assert.equal(customRootFlatPlan.workers[0].lead, null);
    assert.equal(customRootFlatPlan.workers[0].synthesisSlot, "scratch/custom-flat/squad-task_squad/lead/report.md");
    assert.ok(
      customRootFlatPlan.verificationPipeline.some(step => step.includes("scratch/custom-flat/squad-task_squad/lead/report.md")),
      "RAW-RUN-001: custom reportRoot must propagate into flat synthesisSlot verificationPipeline"
    );
    assert.equal(layeredLeadCheckPlan.workers[0].synthesisSlot, layeredLeadCheckPlan.workers[0].lead.reportSlot);
    assert.equal(
      layeredLeadCheckPlan.verificationPipeline.some(step => /Write synthesis/.test(step)),
      false,
      "RAW-RUN-001: layered plans should not emit flat coordinator synthesis step"
    );

    // RAW-SCRIPT-001 / RAW-TEST-001: Windows backslash and Tab-completion CLI path normalization in plan
    const { normalizeScopeCliPath, normalizeWorkspaceCliPath } = await import("../bin/agy-squad.mjs");
    assert.equal(normalizeWorkspaceCliPath(".\\", "win32"), ".");
    assert.equal(normalizeWorkspaceCliPath("./", "linux"), ".");
    assert.equal(normalizeWorkspaceCliPath(".\\src\\auth.js", "win32"), "src/auth.js");
    assert.equal(normalizeWorkspaceCliPath("src\\auth.js", "win32"), "src/auth.js");
    assert.equal(normalizeWorkspaceCliPath(".\\scratch\\win-root", "win32"), "scratch/win-root");
    assert.equal(normalizeWorkspaceCliPath("\\\\server\\share\\src", "win32"), "\\\\server\\share\\src");
    assert.equal(normalizeWorkspaceCliPath("C:\\repo\\src", "win32"), "C:\\repo\\src");
    assert.equal(normalizeWorkspaceCliPath("src\\auth.js", "linux"), "src\\auth.js");
    assert.equal(normalizeScopeCliPath(".\\src\\", "win32"), "src");
    assert.equal(normalizeScopeCliPath("src/", "linux"), "src");
    assert.equal(normalizeScopeCliPath(".\\", "win32"), ".");
    assert.equal(normalizeScopeCliPath("./", "linux"), ".");
    assert.equal(normalizeScopeCliPath("src//", "linux"), "src//");
    assert.equal(normalizeScopeCliPath("/", "linux"), "/");
    const tabCompletePlanRes = runCli([
      "plan",
      "--mode", "swarm",
      "--read-only",
      "--scope", "./",
      "--role", "Security",
      "--role-scope", "Security=src/",
      "--no-integrity",
      "Tab completion scope check"
    ]);
    assert.equal(tabCompletePlanRes.status, 0, `CLI plan must accept ./ and trailing-slash directory scopes: ${tabCompletePlanRes.stderr}`);
    assert.match(JSON.parse(tabCompletePlanRes.stdout).workers[0].specialists[0].swarmAdd.brief, /^- src$/m);
    if (process.platform === "win32") {
      const winPlanRes = runCli([
        "plan",
        "--mode", "swarm",
        "--read-only",
        "--scope", ".\\src\\",
        "--role", "Security",
        "--role-scope", "Security=.\\mcp\\planner.mjs",
        "--report-root", ".\\scratch\\win-plan-root",
        "--no-integrity",
        "Windows backslash plan check"
      ]);
      assert.equal(winPlanRes.status, 0, `RAW-SCRIPT-001: Windows backslash plan failed: ${winPlanRes.stderr}`);
      const winPlanJson = JSON.parse(winPlanRes.stdout);
      assert.equal(winPlanJson.workers[0].synthesisSlot, "scratch/win-plan-root/squad-task_squad/lead/report.md");
      assert.match(winPlanJson.workers[0].specialists[0].swarmAdd.brief, /^- mcp\/planner\.mjs$/m);
    }

    // CodeQL #2/#3/#4: planner slugifyName/allocateWorkerName stay linear-time on pathological repeated dashes
    const evilRole = "a" + "-".repeat(50_000) + "b";
    const tSlug = performance.now();
    const slugPlan = planSquadCohort({
      workspace: root,
      task: "Linear slug test",
      executionMode: "swarm",
      readOnly: true,
      roles: [evilRole],
      occupiedWorkerNames: [evilRole],
      includeIntegrityAuditor: false
    });
    assert.ok(performance.now() - tSlug < 200, "planSquadCohort worker name allocation must stay linear-time on repeated dashes");
    assert.equal(slugPlan.workers[0].specialists[0].swarmAdd.name, "task-squad-a-b");

    // Post-swarm live fixes: exact 24-char slug must not warn, 25-char warns, coordinator-* is reserved, includeIntegrityAuditor: false emitted on opt-out
    const exact24Plan = planSquadCohort({
      workspace: root,
      manifest: {
        squads: {
          runtime: {
            lead: { role: "Lead", readOnly: true, objective: "Lead", scopeFiles: ["mcp/planner.mjs"] },
            specialists: [
              { role: "Planner Dispatch", readOnly: true, objective: "Check", scopeFiles: ["mcp/planner.mjs"] }
            ]
          },
          coordinator: {
            lead: { role: "Alpha", readOnly: true, objective: "Lead", scopeFiles: ["mcp/briefs.mjs"] },
            specialists: [
              { role: "Worker", readOnly: true, objective: "Check", scopeFiles: ["mcp/briefs.mjs"] }
            ]
          }
        }
      },
      executionMode: "swarm",
      topology: "layered",
      includeIntegrityAuditor: false
    });
    assert.equal(exact24Plan.workers[0].specialists[0].workerName, "runtime-planner-dispatch");
    assert.equal(exact24Plan.workers[0].specialists[0].workerName.length, 24);
    assert.equal(
      exact24Plan.warnings.some(w => w.includes("runtime-planner-dispatch")),
      false,
      "Exact 24-char worker name without truncation must not trigger truncation warning"
    );
    assert.equal(
      exact24Plan.workers[1].lead.workerName.startsWith("coordinator-"),
      false,
      "Reserved coordinator-* swarm worker name must be prefixed"
    );
    assert.equal(exact24Plan.includeIntegrityAuditor, false);

    console.log("✓ squad_planner model pinning, scope overlap checks, transcript-safe provenance scaffold, and CLI plan");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
