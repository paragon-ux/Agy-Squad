#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { buildSubagentSpec } from "../../../../mcp/briefs.mjs";
import { handleDispatchSquad } from "../../../../mcp/dispatch.mjs";
import {
  bundleReports,
  fingerprint,
  inspectHandoffs,
  messageLimit,
  pruneReports,
  reportPath,
  verifyBundle
} from "../../../../mcp/handoffs.mjs";
import { createRun, ensureDirectory } from "../../../../mcp/run-state.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = fs.realpathSync(path.resolve(scriptDir, "../../../.."));
const manifestRelative = ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json";
const manifestAbsolute = path.join(repoRoot, manifestRelative);
const scratchBase = (process.env.AGY_SQUAD_SCRATCH_ROOT || "scratch").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
if (!scratchBase || scratchBase.includes("..")) {
  throw new Error("AGY_SQUAD_SCRATCH_ROOT must be a workspace-relative path without '..'.");
}
const scratchSquadRel = `${scratchBase}/agy-squad`;

const estimateTokens = bytes => Math.ceil(bytes / 4);

function removeEmpty(directory) {
  try {
    fs.rmdirSync(directory);
    return true;
  } catch (error) {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error;
    return false;
  }
}

function hasEvidence(directory) {
  if (!fs.existsSync(directory)) return false;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && hasEvidence(target)) return true;
    if (entry.isFile() && entry.name === "report.md") return true;
  }
  return false;
}

function teardownSelfDiagnosisDirs({ squadId = "all", acceptedHash, force = false } = {}) {
  const manifest = JSON.parse(fs.readFileSync(manifestAbsolute, "utf8"));
  const knownSquads = Object.keys(manifest.squads);
  if (squadId !== "all" && !knownSquads.includes(squadId)) {
    throw new Error(`Unknown self-diagnosis squadId '${squadId}'. Expected 'all' or one of: ${knownSquads.join(", ")}`);
  }
  const targetSquads = squadId === "all" ? knownSquads : [squadId];
  const scratchSquadRoot = path.join(repoRoot, scratchSquadRel);
  const tornDown = [];
  const removedParents = [];

  for (const id of targetSquads) {
    const relDir = `${scratchSquadRel}/squad-${encodeURIComponent(id)}`;
    const absDir = path.join(repoRoot, relDir);
    if (!fs.existsSync(absDir)) {
      if (acceptedHash && !force) {
        throw new Error(`Cannot verify accepted hash for '${id}': directory ${relDir} does not exist.`);
      }
      continue;
    }
    const bundleRel = reportPath(id, undefined, scratchSquadRel).replace(/\.md$/, ".sources.json");
    const bundleAbs = path.join(repoRoot, bundleRel);

    if (!force) {
      if (fs.existsSync(bundleAbs)) {
        verifyBundle(repoRoot, bundleRel, acceptedHash);
      } else if (acceptedHash) {
        throw new Error(`Cannot verify accepted hash for '${id}': missing bundle at ${bundleRel}`);
      } else if (hasEvidence(absDir)) {
        throw new Error(
          `Refusing to tear down unbundled evidence in ${relDir} without bundle verification or --force.`
        );
      }
    }
    fs.rmSync(absDir, { recursive: true, force: true });
    tornDown.push(relDir);
  }

  if (squadId === "all" && fs.existsSync(scratchSquadRoot)) {
    for (const entry of fs.readdirSync(scratchSquadRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("self-diag-canary-")) {
        const relCanary = `${scratchSquadRel}/${entry.name}`;
        fs.rmSync(path.join(repoRoot, relCanary), { recursive: true, force: true });
        tornDown.push(relCanary);
      }
    }
  }

  for (const parentRel of [scratchSquadRel, scratchBase]) {
    if (removeEmpty(path.join(repoRoot, parentRel))) {
      removedParents.push(parentRel);
    }
  }

  return { status: "TORN_DOWN", tornDown, removedParents };
}

function parseFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (!match) return null;
  const raw = match[1];
  const name = /^name:\s*(.+)$/m.exec(raw)?.[1]?.trim();
  const descMatch = /^description:\s*(?:[>|][-+]?\s*\r?\n)?([\s\S]*)$/m.exec(raw);
  const descBody = descMatch ? descMatch[1].replace(/^[a-zA-Z0-9_-]+:[\s\S]*$/m, "").trim() : "";
  const hasDescription = descBody.length > 0;
  return { name, hasDescription };
}

function checkRelativeLinks(skillFile, markdown) {
  const dir = path.dirname(skillFile);
  const broken = [];
  const stripped = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\r\n]+`/g, "");
  const linkRegex = /\[[^\]]+\]\(([^)#\s]+)(?:#[^)]*)?\)/g;
  for (const match of stripped.matchAll(linkRegex)) {
    const rawTarget = match[1];
    if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/)/.test(rawTarget)) continue;
    const target = path.resolve(dir, rawTarget);
    if (!fs.existsSync(target)) {
      broken.push({ link: rawTarget, resolved: path.relative(repoRoot, target) });
    }
  }
  return broken;
}

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full));
    else if (entry.isFile()) results.push(full);
  }
  return results;
}

function auditSkills() {
  const skillsRoot = path.join(repoRoot, ".agents/skills");
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(d => d.isDirectory());
  const skills = [];
  const findings = [];

  for (const entry of skillDirs) {
    const dir = path.join(skillsRoot, entry.name);
    const skillMd = path.join(dir, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      findings.push({
        id: `SKILL-DIAG-${entry.name}`,
        category: "SKILL",
        priority: "P1",
        summary: `Missing SKILL.md in .agents/skills/${entry.name}`
      });
      continue;
    }
    const content = fs.readFileSync(skillMd, "utf8");
    const bytes = Buffer.byteLength(content, "utf8");
    const lines = content.replace(/\r?\n$/, "").split(/\r?\n/).length;
    const fm = parseFrontmatter(content);
    const brokenLinks = checkRelativeLinks(skillMd, content);
    const allFiles = walkFiles(dir);
    const totalBytes = allFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);
    const entryShare = totalBytes > 0 ? Number((bytes / totalBytes).toFixed(2)) : 1;

    if (!fm?.name || fm.name !== entry.name || !fm.hasDescription) {
      findings.push({
        id: `SKILL-FM-${entry.name}`,
        category: "SKILL",
        priority: "P1",
        summary: `Invalid YAML frontmatter in .agents/skills/${entry.name}/SKILL.md (expected name '${entry.name}' and non-empty description).`
      });
    }
    if (brokenLinks.length) {
      findings.push({
        id: `SKILL-LINKS-${entry.name}`,
        category: "SKILL",
        priority: "P1",
        summary: `Broken relative links in .agents/skills/${entry.name}/SKILL.md: ${brokenLinks.map(b => b.link).join(", ")}`
      });
    }
    if (lines > 300 || bytes > 12288) {
      findings.push({
        id: `SKILL-BUDGET-${entry.name}`,
        category: "SKILL",
        priority: "P3",
        summary: `.agents/skills/${entry.name}/SKILL.md exceeds progressive-disclosure target (${lines} lines, ${bytes} bytes; target <= 250 lines / <= 10,240 bytes).`
      });
    }
    if (entryShare > 0.7 && totalBytes > 8192) {
      findings.push({
        id: `SKILL-SHARE-${entry.name}`,
        category: "SKILL",
        priority: "P3",
        summary: `.agents/skills/${entry.name}/SKILL.md entry share is ${Math.round(entryShare * 100)}% of ${totalBytes} B total skill bytes (target <= 60% when skill > 8 KB).`
      });
    }

    for (const f of allFiles.filter(file => file.endsWith(".md"))) {
      if (f === skillMd) continue;
      const refBroken = checkRelativeLinks(f, fs.readFileSync(f, "utf8"));
      if (refBroken.length) {
        findings.push({
          id: `SKILL-REFLINKS-${entry.name}`,
          category: "SKILL",
          priority: "P2",
          summary: `Broken relative links in ${path.relative(repoRoot, f)}: ${refBroken.map(b => b.link).join(", ")}`
        });
      }
    }

    skills.push({
      name: entry.name,
      path: path.relative(repoRoot, skillMd),
      lines,
      bytes,
      estimatedTokens: estimateTokens(bytes),
      totalSkillBytes: totalBytes,
      entryShareOfTotal: entryShare,
      brokenLinksCount: brokenLinks.length
    });
  }

  return { skills, findings };
}

function runSquadCanaryAndOptimization() {
  const manifest = JSON.parse(fs.readFileSync(manifestAbsolute, "utf8"));
  const squadIds = Object.keys(manifest.squads);
  const findings = [];
  const timings = {};

  // 0. Check for lingering untorn-down self-diagnosis directories (L41)
  const scratchSquadRoot = path.join(repoRoot, scratchSquadRel);
  if (fs.existsSync(scratchSquadRoot)) {
    for (const id of squadIds) {
      const relDir = `${scratchSquadRel}/squad-${encodeURIComponent(id)}`;
      if (fs.existsSync(path.join(repoRoot, relDir))) {
        findings.push({
          id: `SVC-TEARDOWN-${id}`,
          category: "SVC",
          priority: "P2",
          summary: `Lingering self-diagnosis directory '${relDir}' was not torn down (L41). Run 'node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown' after bundle verification.`
        });
      }
    }
    for (const entry of fs.readdirSync(scratchSquadRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("self-diag-canary-")) {
        findings.push({
          id: `SVC-TEARDOWN-${entry.name}`,
          category: "SVC",
          priority: "P2",
          summary: `Lingering self-diagnosis canary directory '${scratchSquadRel}/${entry.name}' was not torn down (L41).`
        });
      }
    }
  }

  // 1. Measure unmanaged stage compilation latency & validate payloads
  const t0 = performance.now();
  const leadRes = handleDispatchSquad({ squadId: "all_l1", manifestPath: manifestRelative }, repoRoot);
  if (leadRes.isError) {
    throw new Error(`Self-diagnosis all_l1 dispatch failed: ${leadRes.content[0].text}`);
  }
  const leads = JSON.parse(leadRes.content[0].text).Subagents;
  const stagePayloads = {};
  for (const id of squadIds) {
    const res = handleDispatchSquad({ squadId: id, manifestPath: manifestRelative }, repoRoot);
    if (res.isError) {
      throw new Error(`Self-diagnosis specialist dispatch failed for '${id}': ${res.content[0].text}`);
    }
    stagePayloads[id] = JSON.parse(res.content[0].text).Subagents;
  }
  timings.unmanagedCompileMs = Number((performance.now() - t0).toFixed(2));
  if (timings.unmanagedCompileMs > 25) {
    findings.push({
      id: "RUN-LATENCY-COMPILE",
      category: "RUN",
      priority: "P3",
      summary: `Unmanaged stage compilation took ${timings.unmanagedCompileMs} ms (target < 10 ms, flag > 25 ms).`
    });
  }

  // 2. Check scopeFiles existence (lead + specialists) and overlap within each squad
  const topology = [];
  for (const [id, squad] of Object.entries(manifest.squads)) {
    const leadSpec = squad.lead ?? squad;
    for (const file of leadSpec.scopeFiles ?? []) {
      if (!fs.existsSync(path.join(repoRoot, file))) {
        findings.push({
          id: `RUN-LEADSCOPE-${id}`,
          category: "RUN",
          priority: "P2",
          summary: `Missing lead scopeFile '${file}' in self-diagnosis squad '${id}'.`
        });
      }
    }
    const specialists = squad.specialists ?? squad.children ?? [];
    const seen = new Set();
    const overlaps = new Set();
    let totalFiles = 0;
    for (const sp of specialists) {
      for (const file of sp.scopeFiles) {
        totalFiles += 1;
        if (seen.has(file)) overlaps.add(file);
        seen.add(file);
        if (!fs.existsSync(path.join(repoRoot, file))) {
          findings.push({
            id: `RUN-SCOPE-${id}`,
            category: "RUN",
            priority: "P2",
            summary: `Missing specialist scopeFile '${file}' in self-diagnosis squad '${id}'.`
          });
        }
      }
    }
    const overlapRatio = totalFiles > 0 ? Number((overlaps.size / totalFiles).toFixed(2)) : 0;
    if (overlapRatio > 0.25) {
      findings.push({
        id: `ARCH-OVERLAP-${id}`,
        category: "ARCH",
        priority: "P3",
        summary: `Squad '${id}' has ${overlapRatio * 100}% scopeFiles overlap across specialists (${[...overlaps].join(", ")}).`
      });
    }
    topology.push({
      squadId: id,
      specialistsCount: specialists.length,
      uniqueScopeFiles: seen.size,
      overlappingScopeFiles: [...overlaps],
      overlapRatio
    });
  }

  // 3. Measure prompt overhead budgets (mcp/briefs.mjs)
  const minimalAgent = { role: "R", objective: "O", scopeFiles: ["a"] };
  const unmanagedSpecPromptBytes = Buffer.byteLength(
    buildSubagentSpec(minimalAgent, "s", "m.json", 1, undefined).Prompt,
    "utf8"
  );
  const managedSpecPromptBytes = Buffer.byteLength(
    buildSubagentSpec(minimalAgent, "s", "m.json", 1, "scratch/agy-squad/run-00000000-0000-4000-8000-000000000000/plan-000000000000000000000000").Prompt,
    "utf8"
  );
  const unmanagedLeadPromptBytes = Buffer.byteLength(
    buildSubagentSpec(minimalAgent, "s", "m.json", undefined, undefined).Prompt,
    "utf8"
  );
  const managedLeadPromptBytes = Buffer.byteLength(
    buildSubagentSpec(minimalAgent, "s", "m.json", undefined, "scratch/agy-squad/run-00000000-0000-4000-8000-000000000000/plan-000000000000000000000000").Prompt,
    "utf8"
  );

  for (const [budgetId, actual, limit, label] of [
    ["RUN-BUDGET-UNMANAGED-SPEC", unmanagedSpecPromptBytes, 1800, "Unmanaged specialist template"],
    ["RUN-BUDGET-MANAGED-SPEC", managedSpecPromptBytes, 1000, "Managed specialist template"],
    ["RUN-BUDGET-UNMANAGED-LEAD", unmanagedLeadPromptBytes, 3300, "Unmanaged lead template"],
    ["RUN-BUDGET-MANAGED-LEAD", managedLeadPromptBytes, 1800, "Managed lead template"]
  ]) {
    if (actual > limit) {
      findings.push({
        id: budgetId,
        category: "RUN",
        priority: "P3",
        summary: `${label} is ${actual} UTF-8 bytes (exceeds ${limit} B rubric budget).`
      });
    }
  }

  // 4. Execute isolated workspace-local managed + Pointer-Over-Wire canary with deterministic teardown (L4, L41)
  const created = [];
  const canaryRel = `${scratchSquadRel}/self-diag-canary-${randomUUID()}`;
  const canaryDir = ensureDirectory(repoRoot, canaryRel, created);
  const cleanupCanary = () => {
    fs.rmSync(canaryDir, { recursive: true, force: true });
    for (const dir of [...created].reverse()) {
      removeEmpty(dir);
    }
  };
  process.once("exit", cleanupCanary);
  try {
    fs.writeFileSync(path.join(canaryDir, "target.txt"), "self-diagnosis-canary\n");
    const run = createRun(canaryDir);
    const managedLeads = handleDispatchSquad({ squadId: "all_l1", manifest }, canaryDir, run.relative);
    if (managedLeads.isError) {
      throw new Error(`Managed self-diagnosis stage failed: ${managedLeads.content[0].text}`);
    }
    for (const id of squadIds) {
      const managedSpec = handleDispatchSquad(
        { squadId: id, manifestPath: managedLeads.structuredContent.manifestPath },
        canaryDir,
        run.relative
      );
      if (managedSpec.isError) {
        throw new Error(`Managed specialist stage failed for '${id}': ${managedSpec.content[0].text}`);
      }
    }

    const tHandoff = performance.now();
    const verifiedFiles = fingerprint(canaryDir, ["target.txt"]);
    const leadAssignments = [];
    const leadHandoffs = [];

    // Smoke-test Single-Squad (2 specialists), Flat Full-Squad (6 specialists across all 3 squads),
    // and Layered Full-Squad (3 leads -> 6 specialists) handoff/bundle/verify/prune pipelines
    for (const id of squadIds) {
      const s1 = reportPath(id, 1);
      const s2 = reportPath(id, 2);
      const leadSlot = reportPath(id);
      for (const [slot, text] of [
        [s1, `# ${id} Specialist 1\nVerified target.txt.\n`],
        [s2, `# ${id} Specialist 2\nVerified target.txt.\n`],
        [leadSlot, `# ${id} Lead Synthesis\nVerdict: PASS\nVerified both specialist reports against target.txt.\n`]
      ]) {
        const full = path.join(canaryDir, slot);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, text);
      }
      const record = {
        workspace: canaryDir,
        squadId: id,
        verdict: "PASS",
        verifiedFiles,
        assignments: [
          { conversationId: `${id}-child-1`, report: s1 },
          { conversationId: `${id}-child-2`, report: s2 }
        ],
        handoffs: [
          { sender: `${id}-child-1`, message: `READY ${s1} — Specialist 1 verified ${id}.` },
          { sender: `${id}-child-2`, message: `READY ${s2} — Specialist 2 verified ${id}.` }
        ]
      };
      inspectHandoffs(canaryDir, record);
      const bundled = bundleReports(canaryDir, record);
      const verified = verifyBundle(canaryDir, bundled.path, bundled.sha256);
      const pruned = pruneReports(canaryDir, bundled.path, verified.sha256);
      if (pruned.removed.length !== 2) {
        throw new Error(`Expected 2 pruned reports in self-diagnosis canary for '${id}', got ${pruned.removed.length}`);
      }
      leadAssignments.push({ conversationId: `${id}-lead`, report: leadSlot });
      leadHandoffs.push({
        sender: `${id}-lead`,
        message: `READY ${leadSlot} — Lead synthesized and bundled ${id} (${verified.sha256.slice(0, 12)}).`
      });
    }

    // Verify Layered Full-Squad (all_l1) 3-lead receipt reconciliation
    const layeredInspected = inspectHandoffs(canaryDir, {
      workspace: canaryDir,
      assignments: leadAssignments,
      handoffs: leadHandoffs
    });
    if (layeredInspected.some(item => item.status !== "READY") || layeredInspected.length !== 3) {
      throw new Error("Layered 3-lead canary reconciliation failed.");
    }
    timings.handoffPipelineMs = Number((performance.now() - tHandoff).toFixed(2));
    timings.perSquadHandoffMs = Number((timings.handoffPipelineMs / squadIds.length).toFixed(2));
    if (timings.perSquadHandoffMs > 50) {
      findings.push({
        id: "SVC-LATENCY-HANDOFF",
        category: "SVC",
        priority: "P3",
        summary: `Handoff/bundle/verify/prune canary took ${timings.perSquadHandoffMs} ms per 2-specialist squad (${timings.handoffPipelineMs} ms total across ${squadIds.length} squads; target < 20 ms, flag > 50 ms per squad).`
      });
    }
  } finally {
    process.removeListener("exit", cleanupCanary);
    cleanupCanary();
  }

  // 5. Measure MCP tools/list schema payload size via stdio
  const tMcp = performance.now();
  const serverRes = spawnSync(process.execPath, [path.join(repoRoot, "mcp/index.js")], {
    cwd: repoRoot,
    input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n",
    encoding: "utf8"
  });
  timings.mcpSpawnMs = Number((performance.now() - tMcp).toFixed(2));
  if (serverRes.status !== 0) {
    throw new Error(`MCP server tools/list check failed: ${serverRes.stderr}`);
  }
  const schemaBytes = Buffer.byteLength(serverRes.stdout.trim(), "utf8");
  if (schemaBytes > 4096) {
    findings.push({
      id: "MCP-BUDGET-SCHEMA",
      category: "MCP",
      priority: "P3",
      summary: `MCP tools/list response is ${schemaBytes} UTF-8 bytes (exceeds 4,096 B rubric budget).`
    });
  }

  const compiledSquads = Object.fromEntries(
    Object.entries(stagePayloads).map(([id, agents]) => [
      id,
      agents.map((a, idx) => {
        const slot = a.Prompt.match(/^Report slot: (\S+)$/m)?.[1];
        const prefixBytes = Buffer.byteLength(`READY ${slot} — `, "utf8");
        const receiptHeadroomBytes = messageLimit - prefixBytes;
        if (receiptHeadroomBytes < 340) {
          findings.push({
            id: `SVC-HEADROOM-${id}-${idx + 1}`,
            category: "SVC",
            priority: "P2",
            summary: `Specialist ${idx + 1} in '${id}' has only ${receiptHeadroomBytes} B receipt headroom (prefix ${prefixBytes} B > 160 B limit).`
          });
        }
        return {
          Role: a.Role,
          TypeName: a.TypeName,
          Workspace: a.Workspace,
          reportSlot: slot,
          promptBytes: Buffer.byteLength(a.Prompt, "utf8"),
          receiptHeadroomBytes
        };
      })
    ])
  );

  return {
    compiledStages: {
      leadsCount: leads.length,
      squads: compiledSquads
    },
    promptBudgets: {
      unmanagedSpecialistTemplateBytes: unmanagedSpecPromptBytes,
      unmanagedSpecialistEstimatedTokens: estimateTokens(unmanagedSpecPromptBytes),
      managedSpecialistTemplateBytes: managedSpecPromptBytes,
      managedSpecialistEstimatedTokens: estimateTokens(managedSpecPromptBytes),
      unmanagedLeadTemplateBytes: unmanagedLeadPromptBytes,
      unmanagedLeadEstimatedTokens: estimateTokens(unmanagedLeadPromptBytes),
      managedLeadTemplateBytes: managedLeadPromptBytes,
      managedLeadEstimatedTokens: estimateTokens(managedLeadPromptBytes),
      mcpToolsListResponseBytes: schemaBytes,
      mcpToolsListEstimatedTokens: estimateTokens(schemaBytes)
    },
    topology,
    timings,
    findings
  };
}

function buildPrReviewCategoryMatrix(allFindings) {
  const categories = ["ARCH", "DOC", "SKILL", "MCP", "RUN", "SVC", "DB", "SCRIPT", "TEST", "DEP"];
  return categories.map(cat => {
    const items = allFindings.filter(f => f.category === cat);
    const p1 = items.filter(f => f.priority === "P1").length;
    const p2 = items.filter(f => f.priority === "P2").length;
    const p3 = items.filter(f => f.priority === "P3").length;
    return {
      category: cat,
      p1,
      p2,
      p3,
      verdict:
        cat === "DB"
          ? "Not applicable"
          : p1 > 0 || p2 > 0
            ? "Changes required"
            : "No findings within reviewed scope"
    };
  });
}

function parseCliArgs(argv) {
  let markdown = false;
  let printDispatch = false;
  let teardown = false;
  let squadId = "all_l1";
  let teardownTarget = "all";
  let parentId;
  let acceptedHash;
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--markdown") {
      markdown = true;
    } else if (arg === "--print-dispatch") {
      printDispatch = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        squadId = next;
        i += 1;
      }
    } else if (arg === "--parent-id") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("Flag '--parent-id' requires a non-empty conversationId value.");
      }
      parentId = next;
      i += 1;
    } else if (arg === "--teardown") {
      teardown = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        teardownTarget = next;
        i += 1;
      }
    } else if (arg === "--accept") {
      const next = argv[i + 1];
      if (!next || !/^[0-9a-f]{64}$/.test(next)) {
        throw new Error("Flag '--accept' requires a 64-character lowercase hex SHA-256 bundle digest.");
      }
      acceptedHash = next;
      i += 1;
    } else if (arg === "--force") {
      force = true;
    } else {
      throw new Error(
        `Unknown argument '${arg}'. Usage: diagnose.mjs [--markdown] | [--print-dispatch [squadId] [--parent-id <id>]] | [--teardown [squadId|all] [--accept <sha256>] [--force]]`
      );
    }
  }
  return { markdown, printDispatch, teardown, squadId, teardownTarget, parentId, acceptedHash, force };
}

let cli;
try {
  cli = parseCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (cli.teardown) {
  try {
    const res = teardownSelfDiagnosisDirs({
      squadId: cli.teardownTarget,
      acceptedHash: cli.acceptedHash,
      force: cli.force
    });
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (cli.printDispatch) {
  let parsed;
  if (cli.squadId === "all_specialists") {
    const manifest = JSON.parse(fs.readFileSync(manifestAbsolute, "utf8"));
    const Subagents = [];
    for (const id of Object.keys(manifest.squads)) {
      const res = handleDispatchSquad({ squadId: id, manifestPath: manifestRelative }, repoRoot);
      if (res.isError) {
        console.error(res.content[0].text);
        process.exit(1);
      }
      Subagents.push(...JSON.parse(res.content[0].text).Subagents);
    }
    parsed = { Subagents };
  } else {
    const result = handleDispatchSquad({ squadId: cli.squadId, manifestPath: manifestRelative }, repoRoot);
    if (result.isError) {
      console.error(result.content[0].text);
      process.exit(1);
    }
    parsed = JSON.parse(result.content[0].text);
  }
  if (cli.parentId) {
    for (const agent of parsed.Subagents) {
      agent.Prompt += `\nParent conversation ID (send_message Recipient): ${cli.parentId}`;
    }
  }
  console.log(JSON.stringify(parsed, null, 2));
  process.exit(0);
}

const skillAudit = auditSkills();
const squadAudit = runSquadCanaryAndOptimization();
const findings = [...skillAudit.findings, ...squadAudit.findings];
const prReviewMatrix = buildPrReviewCategoryMatrix(findings);
const blockingCount = findings.filter(f => f.priority === "P1" || f.priority === "P2").length;

const report = {
  status: blockingCount === 0 ? "HEALTHY" : "CHANGES_REQUIRED",
  standardVersion: "1.1.0",
  manifestPath: manifestRelative,
  skills: skillAudit.skills,
  promptBudgets: squadAudit.promptBudgets,
  topology: squadAudit.topology,
  timings: squadAudit.timings,
  compiledStages: squadAudit.compiledStages,
  prReviewCategoryMatrix: prReviewMatrix,
  findings
};

if (cli.markdown) {
  const findingLines =
    report.findings.length === 0
      ? ["- None (all rubric thresholds and contract checks passed)."]
      : report.findings.map(f => `- **[${f.priority}] \`${f.id}\` (\`${f.category}\`):** ${f.summary}`);
  const lines = [
    "# Agy-Squad Self-Diagnosis & Optimization Report",
    "",
    `- **Status:** \`${report.status}\` (PR Review Standard \`v${report.standardVersion}\`)`,
    `- **Self-Diagnosis Manifest:** \`${report.manifestPath}\``,
    `- **Timings:** compile \`${report.timings.unmanagedCompileMs} ms\`, handoff+bundle+verify+prune \`${report.timings.handoffPipelineMs} ms\`, mcp-stdio \`${report.timings.mcpSpawnMs} ms\``,
    "",
    "## 1. Workspace Skills Progressive Disclosure & Token Audit",
    "",
    "| Skill | Path | Lines | UTF-8 Bytes | Est. Tokens | Entry Share of Skill | Broken Links |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...report.skills.map(
      s =>
        `| \`${s.name}\` | \`${s.path}\` | ${s.lines} | ${s.bytes} | ~${s.estimatedTokens} | ${Math.round(
          s.entryShareOfTotal * 100
        )}% | ${s.brokenLinksCount} |`
    ),
    "",
    "## 2. Compiled Brief & MCP Schema Budgets",
    "",
    `- **Unmanaged Specialist Template:** \`${report.promptBudgets.unmanagedSpecialistTemplateBytes} B\` (~${report.promptBudgets.unmanagedSpecialistEstimatedTokens} tokens)`,
    `- **Managed Specialist Template:** \`${report.promptBudgets.managedSpecialistTemplateBytes} B\` (~${report.promptBudgets.managedSpecialistEstimatedTokens} tokens)`,
    `- **Unmanaged Lead Template:** \`${report.promptBudgets.unmanagedLeadTemplateBytes} B\` (~${report.promptBudgets.unmanagedLeadEstimatedTokens} tokens)`,
    `- **Managed Lead Template:** \`${report.promptBudgets.managedLeadTemplateBytes} B\` (~${report.promptBudgets.managedLeadEstimatedTokens} tokens)`,
    `- **MCP \`tools/list\` Response:** \`${report.promptBudgets.mcpToolsListResponseBytes} B\` (~${report.promptBudgets.mcpToolsListEstimatedTokens} tokens)`,
    "",
    "## 3. PR-Review Standard v1.1.0 Category Matrix",
    "",
    "| Category | P1 | P2 | P3 (Advisory) | Verdict |",
    "| --- | ---: | ---: | ---: | --- |",
    ...report.prReviewCategoryMatrix.map(
      c => `| \`${c.category}\` | ${c.p1} | ${c.p2} | ${c.p3} | **${c.verdict}** |`
    ),
    "",
    "## 4. Findings",
    "",
    ...findingLines
  ];
  console.log(lines.join("\n"));
} else {
  console.log(JSON.stringify(report, null, 2));
}

if (blockingCount > 0) {
  process.exitCode = 1;
}
