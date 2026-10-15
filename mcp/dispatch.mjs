// dispatch_squad: compiles a staged squad from a manifest into an invoke_subagent payload.
// Stage 1 ('all_l1') returns only the L1 Squad Leads; Stage 2 (a squad ID) returns that squad's L2 leaves.
//
// Payload mode only. The direct mode that spawned agents through the language server's private RPC
// caused the 2026-10-14 breach and was not carried over (see docs/plans/LEDGER.md).
import fs from "node:fs";
import path from "node:path";
import { buildSubagentSpecObject } from "./briefs.mjs";

function manifestSearchBases() {
  const bases = [process.cwd(), process.env.VSCODE_CWD, process.env.PWD, process.env.INIT_CWD];
  return [...new Set(bases.filter(Boolean).map((b) => path.resolve(b)))];
}

function resolveManifestFile(customPath) {
  const bases = manifestSearchBases();
  if (customPath) {
    // Absolute path: use as-is. Relative path: try every plausible workspace base.
    const tried = path.isAbsolute(customPath)
      ? [customPath]
      : bases.map((b) => path.resolve(b, customPath));
    for (const p of tried) {
      if (fs.existsSync(p)) return p;
    }
    // Report what the caller asked for (not an unrelated default) so the error is accurate.
    return tried[0];
  }
  const cwd = bases[0];
  const candidates = [
    path.join(cwd, "task-01-manifest.json"),
    path.join(cwd, "swarm-manifest.json"),
    path.join(cwd, ".scratch", "swarm-manifest.json"),
    path.join(cwd, "suite-manifest.json")
  ];
  // First pass: prefer a candidate that actually defines squads
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(c, "utf-8"));
        if (parsed.squads && typeof parsed.squads === "object" && Object.keys(parsed.squads).length > 0) {
          return c;
        }
      } catch {}
    }
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function handleDispatchSquad({ squadId, manifestPath } = {}) {
  const startTime = Date.now();
  const resolvedManifest = resolveManifestFile(manifestPath);

  if (!fs.existsSync(resolvedManifest)) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: [
          `dispatch_squad error: Manifest not found at ${resolvedManifest}.`,
          `- manifestPath given: ${manifestPath || "(none; default candidates searched)"}`,
          `- MCP server platform: ${process.platform} (cwd: ${process.cwd()})`,
          `- Search bases: ${manifestSearchBases().join(" | ")}`,
          `- Hint: pass an absolute manifestPath.`
        ].join("\n")
      }]
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(resolvedManifest, "utf-8"));
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `dispatch_squad error: Failed to parse manifest JSON at ${resolvedManifest}: ${err.message}` }]
    };
  }

  const squads = manifest.squads || {};
  let targetSpecs = [];
  let stageLabel = "";

  // Strict 2-stage gating: never compile L1 and L2 in the same call
  if (squadId === "all_l1") {
    stageLabel = "Stage 1 (L0 -> L1 Squad Leads Only)";
    targetSpecs = Object.entries(squads).map(([id, sq]) => {
      const base = sq.lead ? { ...sq, ...sq.lead } : sq;
      // The L1 Lead scaffolds its workspace first, then calls dispatch_squad({ squadId: id })
      return { ...base, squadId: id, tier: "L1_lead", children: [] };
    });
  } else if (squads[squadId]) {
    const sq = squads[squadId];
    const leaves = Array.isArray(sq.children)
      ? sq.children
      : (Array.isArray(sq.specialists) ? sq.specialists : null);
    if (!leaves) {
      return {
        isError: true,
        content: [{ type: "text", text: `dispatch_squad error: Squad '${squadId}' has no children or specialists defined in manifest.` }]
      };
    }
    stageLabel = `Stage 2 (L1 '${squadId}' -> L2 Terminal Leaves)`;
    targetSpecs = leaves.map((leaf) => ({ ...leaf, tier: "L2_leaf" }));
  } else {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `dispatch_squad error: Unknown squadId '${squadId}'. Available targets: 'all_l1' or [${Object.keys(squads).join(", ")}].`
      }]
    };
  }

  let compiledSpecs;
  try {
    compiledSpecs = targetSpecs.map((s) => buildSubagentSpecObject(s));
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `dispatch_squad manifest validation error: ${err.message}` }]
    };
  }

  return {
    content: [{
      type: "text",
      text: [
        `### 🎯 Staged Squad Payload Ready: \`${squadId}\` (${stageLabel})`,
        `- Manifest: \`${path.basename(resolvedManifest)}\``,
        `- Agents Compiled: ${compiledSpecs.length} (compiled in ${Date.now() - startTime} ms)`,
        `- Lifecycle Tracking: **Native** (\`invoke_subagent\` + \`manage_subagents\` enabled)`,
        "",
        "Pass this exact payload to `invoke_subagent`:",
        "```json",
        JSON.stringify({ Subagents: compiledSpecs }, null, 2),
        "```"
      ].join("\n")
    }]
  };
}

export { handleDispatchSquad, resolveManifestFile };
