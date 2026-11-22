#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildSubagentSpec } from "../../../../mcp/briefs.mjs";
import { normalizeReportRoot, trimTrailingSlashes } from "../../../../mcp/handoffs.mjs";
import { TOOLS } from "../../../../mcp/index.js";
import { planSquadCohort } from "../../../../mcp/planner.mjs";
import { stripCode, stripFencedCodeBlocks } from "../../../../mcp/verdicts.mjs";
import { SHIPPED_SKILLS } from "../../../../scripts/install-register.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const HOSTED_DOCS_PREFIX = "https://paragon-ux.github.io/Agy-Squad/";
const RETIRED_SYMBOL_RE =
  /\b(?:subagent_brief|spawnPacingMs|agy-squad(?:\.mjs)?\s+run|terminal\.py|run-state\.mjs|AGY_SQUAD_RUN_DIR|AGY_SQUAD_SESSION|managed\s+`?manifest`?|adversarial_l1|adversarial_flat|adversarial_review|integrity-auditor|query_transcript|read_transcript|check_context_health)\b|\bnode\s+mcp\/handoffs\.mjs\b|(?<![a-zA-Z0-9_-])\.mcp-ready(?![a-zA-Z0-9_-])/gi;
const HISTORICAL_NOTICE_RE =
  /\b(?:retired|historical|deprecated|removed|superseded|obsolete|replaced\s+by|do\s+not\s+use|never\s+use)\b/i;
const STRAY_FLAG_EMDASH_RE = /(?:^|\s)—[a-z][a-z0-9-]*/i;
const USAGE =
  "Usage: node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json] [--help]\n" +
  "Read-only Agy-Squad maintainer check: audits shipped skills, links, hygiene, and brief/MCP byte budgets.";

const estimateTokens = bytes => Math.ceil(bytes / 4);
const trimLeadingSlashes = s => { let i = 0; while (i < s.length && s[i] === "/") i++; return s.slice(i); };

function stripHtmlComments(text) {
  let out = "";
  for (let pos = 0; pos < text.length; ) {
    const start = text.indexOf("<!--", pos);
    if (start === -1) return out + text.slice(pos);
    out += text.slice(pos, start);
    const end = text.indexOf("-->", start + 4);
    if (end === -1) return out;
    pos = end + 3;
  }
  return out;
}

function assertAgySquadWorkspace() {
  const rawCwd = process.cwd();
  let cursor;
  try { cursor = fs.realpathSync(rawCwd); } catch { cursor = path.resolve(rawCwd); }
  let foundPkgName = null;
  while (true) {
    const pkgPath = path.join(cursor, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (parsed?.name === "agy-squad") return;
        foundPkgName = typeof parsed?.name === "string" ? parsed.name : "(unnamed package)";
      } catch {
        foundPkgName = "(unreadable package.json)";
      }
      break;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  const detail = foundPkgName ? ` (found package "${foundPkgName}")` : ' (no package.json with name "agy-squad" found)';
  console.error(
    `Error: diagnose.mjs is an Agy-Squad maintainer check and must be run inside an Agy-Squad checkout.\n` +
    `Current working directory: ${rawCwd}${detail}\n` +
    `To govern your own repository, use 'agy-squad plan', '/pr-review', '/full-review', '/day-one-review', or '/swarm-governance'.`
  );
  process.exit(1);
}

function unquote(value) {
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    ? value.slice(1, -1).trim()
    : value;
}

function parseFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) return null;
  const raw = match[1];
  const rawName = /^name:\s*(.+)$/m.exec(raw)?.[1]?.trim();
  const name = rawName ? unquote(rawName) : undefined;
  const fmLines = raw.split(/\r?\n/);
  let descBody = "";
  for (let i = 0; i < fmLines.length; i++) {
    const m = /^description:\s*(.*)$/.exec(fmLines[i]);
    if (!m) continue;
    const inlineVal = m[1].trim();
    if (/^[>|][-+]?$/.test(inlineVal)) {
      const block = [];
      for (let j = i + 1; j < fmLines.length; j++) {
        if (/^\s*$/.test(fmLines[j])) continue;
        if (!/^\s+/.test(fmLines[j])) break;
        block.push(fmLines[j].trim());
      }
      descBody = block.join(" ").trim();
    } else {
      descBody = unquote(inlineVal);
    }
    break;
  }
  return { name, hasDescription: descBody.length > 0 };
}

const headingSlugCache = new Map();
function getHeadingSlugs(filePath) {
  if (!headingSlugCache.has(filePath)) {
    const slugs = new Set();
    const counts = new Map();
    for (const line of stripFencedCodeBlocks(fs.readFileSync(filePath, "utf8")).split(/\r?\n/)) {
      const match = /^#{1,6}\s+(.+)$/.exec(line);
      if (!match) continue;
      const base = match[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .toLowerCase()
        .replace(/`/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s/g, "-");
      if (!base) continue;
      const seen = counts.get(base) ?? 0;
      counts.set(base, seen + 1);
      slugs.add(seen === 0 ? base : `${base}-${seen}`);
    }
    headingSlugCache.set(filePath, slugs);
  }
  return headingSlugCache.get(filePath);
}

function checkRelativeLinks(skillFile, markdown) {
  const broken = [];
  const dir = path.dirname(skillFile);
  const skillsRootDir = path.join(repoRoot, ".agents", "skills");
  const isInsideSkills = skillFile === skillsRootDir || skillFile.startsWith(skillsRootDir + path.sep);
  const stripped = stripCode(stripHtmlComments(markdown));

  for (const match of stripped.matchAll(/\[[^\]]+\]\(([^)#\s]*)(?:#([^)\s]*))?\)/g)) {
    const rawTarget = match[1];
    const fragment = match[2] ?? "";
    if (!rawTarget && !fragment) continue;
    let resolved;
    let isHostedDocs = false;
    if (rawTarget.startsWith(HOSTED_DOCS_PREFIX)) {
      isHostedDocs = true;
      const slug = trimTrailingSlashes(trimLeadingSlashes(rawTarget.slice(HOSTED_DOCS_PREFIX.length)));
      if (slug && (slug.includes("..") || slug.includes("\\"))) {
        broken.push(`${rawTarget}${fragment ? `#${fragment}` : ""} (malformed hosted docs URL)`);
        continue;
      }
      resolved = path.join(repoRoot, "docs", `${slug ? slug.replace(/\.md$/i, "") : "index"}.md`);
    } else if (rawTarget && /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/)/.test(rawTarget)) {
      continue;
    } else {
      resolved = rawTarget ? path.resolve(dir, rawTarget) : skillFile;
    }
    const label = rawTarget || `#${fragment}`;
    if (!isHostedDocs && isInsideSkills) {
      const rel = path.relative(skillsRootDir, resolved);
      if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
        broken.push(`${label}${fragment ? `#${fragment}` : ""} (escapes .agents/skills/)`);
        continue;
      }
    }
    if (!fs.existsSync(resolved)) {
      broken.push(label);
    } else if (fragment && resolved.endsWith(".md") && !getHeadingSlugs(resolved).has(fragment.toLowerCase())) {
      broken.push(`${label}#${fragment}`);
    }
  }
  return broken;
}

function walkMarkdownFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

function findRetiredSymbolMatches(markdown) {
  const matched = new Set();
  let activeHistoricalBlock = false;
  for (const line of stripFencedCodeBlocks(markdown).split(/\r?\n/)) {
    if (/^\s*#{1,6}\s+/.test(line)) activeHistoricalBlock = HISTORICAL_NOTICE_RE.test(line);
    if (activeHistoricalBlock) continue;
    const segments = line.trim().startsWith("|") ? line.split(/(?<!\\)\|/) : line.split(/(?<=[.!?;])\s+/);
    for (const seg of segments) {
      RETIRED_SYMBOL_RE.lastIndex = 0;
      if (!RETIRED_SYMBOL_RE.test(seg) || HISTORICAL_NOTICE_RE.test(seg)) continue;
      RETIRED_SYMBOL_RE.lastIndex = 0;
      for (const m of seg.matchAll(RETIRED_SYMBOL_RE)) {
        matched.add(m[0].replace(/`/g, "").replace(/\s+/g, " ").trim());
      }
    }
  }
  return [...matched];
}

function runDiagnostics() {
  if (process.env.AGY_SQUAD_SCRATCH_ROOT) {
    normalizeReportRoot(process.env.AGY_SQUAD_SCRATCH_ROOT);
  }

  const findings = [];
  const skills = [];
  const skillsRoot = path.join(repoRoot, ".agents", "skills");
  const skillNames = [...SHIPPED_SKILLS];
  if (fs.existsSync(path.join(skillsRoot, "self-diagnosis"))) skillNames.push("self-diagnosis");

  for (const name of skillNames) {
    const dir = path.join(skillsRoot, name);
    const skillMd = path.join(dir, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      findings.push({ id: `SKILL-MISSING-${name}`, priority: "P1", summary: `Missing .agents/skills/${name}/SKILL.md` });
      continue;
    }
    const content = fs.readFileSync(skillMd, "utf8");
    const bytes = Buffer.byteLength(content, "utf8");
    const lines = content.replace(/\r?\n$/, "").split(/\r?\n/).length;
    const fm = parseFrontmatter(content);
    if (!fm?.name || fm.name !== name || !fm.hasDescription) {
      findings.push({ id: `SKILL-FM-${name}`, priority: "P1", summary: `Invalid frontmatter in .agents/skills/${name}/SKILL.md` });
    }
    let brokenLinksCount = 0;
    for (const f of walkMarkdownFiles(dir)) {
      const text = f === skillMd ? content : fs.readFileSync(f, "utf8");
      const relFile = path.relative(repoRoot, f);
      const broken = checkRelativeLinks(f, text);
      if (broken.length) {
        brokenLinksCount += broken.length;
        findings.push({ id: `SKILL-LINKS-${name}`, priority: "P1", summary: `Broken links in ${relFile}: ${broken.join(", ")}` });
      }
      const retired = findRetiredSymbolMatches(text);
      if (retired.length) {
        findings.push({ id: `SKILL-DRIFT-${name}`, priority: "P2", summary: `Retired symbol(s) in ${relFile}: ${retired.join(", ")}` });
      }
      if (STRAY_FLAG_EMDASH_RE.test(stripCode(text))) {
        findings.push({ id: `SKILL-EMDASH-${name}`, priority: "P2", summary: `Stray em-dash attached to CLI flag in ${relFile}` });
      }
    }
    if (lines > 300 || bytes > 12288) {
      findings.push({ id: `SKILL-BUDGET-${name}`, priority: "P2", summary: `.agents/skills/${name}/SKILL.md exceeds budget (${lines} lines, ${bytes} B)` });
    }
    skills.push({ name, path: path.relative(repoRoot, skillMd), lines, bytes, estimatedTokens: estimateTokens(bytes), brokenLinksCount });
  }

  const docsRoot = path.join(repoRoot, "docs");
  const driftTargets = [
    ...["mcp/briefs.mjs", "mcp/planner.mjs", "mcp/dispatch.mjs"].map(rel => path.join(repoRoot, rel)),
    ...(fs.existsSync(docsRoot)
      ? fs.readdirSync(docsRoot, { withFileTypes: true }).filter(e => e.isFile() && e.name.endsWith(".md")).map(e => path.join(docsRoot, e.name))
      : [])
  ].filter(abs => fs.existsSync(abs));
  for (const abs of driftTargets) {
    const retired = findRetiredSymbolMatches(fs.readFileSync(abs, "utf8"));
    if (retired.length) {
      findings.push({ id: "DOC-MCP-DRIFT", priority: "P2", summary: `Retired symbol(s) in ${path.relative(repoRoot, abs)}: ${retired.join(", ")}` });
    }
  }

  const assetsDir = path.join(docsRoot, "assets");
  if (fs.existsSync(assetsDir)) {
    const reviewsPrefix = path.join(docsRoot, "reviews") + path.sep;
    const docsTexts = walkMarkdownFiles(docsRoot).filter(f => !f.startsWith(reviewsPrefix)).map(f => fs.readFileSync(f, "utf8"));
    for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".svg")) continue;
      const svgRaw = fs.readFileSync(path.join(assetsDir, entry.name), "utf8");
      if (!/<svg\b[^>]*>[\s\S]*<\/svg>\s*$/i.test(svgRaw) || /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g.test(svgRaw)) {
        findings.push({ id: `DOC-SVG-XML-${entry.name.replace(/\.svg$/, "")}`, priority: "P2", summary: `docs/assets/${entry.name} failed SVG XML check` });
      }
      if (docsTexts.length && !docsTexts.some(t => t.includes(entry.name))) {
        findings.push({ id: `DOC-SVG-ORPHAN-${entry.name.replace(/\.svg$/, "")}`, priority: "P3", summary: `docs/assets/${entry.name} is unreferenced under docs/` });
      }
    }
  }

  const minAgent = { role: "R", objective: "O", scopeFiles: ["a"] };
  const subSpecPrompt = buildSubagentSpec(minAgent, "s", "m.json", 1).Prompt;
  const subLeadPrompt = buildSubagentSpec(minAgent, "s", "m.json", undefined).Prompt;
  const subPreLeadPrompt = buildSubagentSpec(minAgent, "s", "m.json", undefined, undefined, { precompiledSpecialists: true }).Prompt;
  const minSwarm = planSquadCohort(
    { manifest: { squads: { s: { lead: minAgent, specialists: [minAgent] } } }, executionMode: "swarm" },
    repoRoot
  );
  const swarmSpecBrief = minSwarm.workers[0].specialists[0].swarmAdd.brief;
  const swarmLeadBrief = minSwarm.workers[0].lead.swarmAdd.brief;
  const swarmAuditBrief = minSwarm.integrityAuditPlan[0].swarmAdd.brief;
  const mcpToolsListResponseBytes = Buffer.byteLength(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: TOOLS } }), "utf8");

  for (const [label, text] of [["subagent specialist", subSpecPrompt], ["swarm specialist", swarmSpecBrief], ["swarm auditor", swarmAuditBrief]]) {
    if (text.includes("——") || STRAY_FLAG_EMDASH_RE.test(text)) {
      findings.push({ id: "BRIEF-EMDASH", priority: "P2", summary: `Malformed em-dash in ${label} brief` });
    }
  }

  const promptBudgets = {
    specialistTemplateBytes: Buffer.byteLength(subSpecPrompt, "utf8"),
    leadTemplateBytes: Buffer.byteLength(subLeadPrompt, "utf8"),
    precompiledLeadTemplateBytes: Buffer.byteLength(subPreLeadPrompt, "utf8"),
    swarmSpecialistTemplateBytes: Buffer.byteLength(swarmSpecBrief, "utf8"),
    swarmLeadTemplateBytes: Buffer.byteLength(swarmLeadBrief, "utf8"),
    swarmAuditorTemplateBytes: Buffer.byteLength(swarmAuditBrief, "utf8"),
    mcpToolsListResponseBytes
  };
  for (const [id, actual, limit, label] of [
    ["RUN-BUDGET-SPEC", promptBudgets.specialistTemplateBytes, 1200, "Subagent specialist brief"],
    ["RUN-BUDGET-LEAD", promptBudgets.leadTemplateBytes, 1800, "Subagent lead brief"],
    ["RUN-BUDGET-PRECOMPILED-LEAD", promptBudgets.precompiledLeadTemplateBytes, 1800, "Precompiled lead brief"],
    ["RUN-BUDGET-SWARM-SPEC", promptBudgets.swarmSpecialistTemplateBytes, 1200, "/swarm specialist brief"],
    ["RUN-BUDGET-SWARM-LEAD", promptBudgets.swarmLeadTemplateBytes, 1800, "/swarm lead brief"],
    ["RUN-BUDGET-SWARM-AUDIT", promptBudgets.swarmAuditorTemplateBytes, 2000, "/swarm integrity auditor brief"],
    ["MCP-BUDGET-SCHEMA", promptBudgets.mcpToolsListResponseBytes, 4096, "MCP tools/list schema"]
  ]) {
    if (actual > limit) findings.push({ id, priority: "P2", summary: `${label} is ${actual} B (exceeds ${limit} B budget)` });
  }

  return { status: findings.length === 0 ? "HEALTHY" : "ISSUES", skills, promptBudgets, findings };
}

let cli;
try {
  cli = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    allowPositionals: false,
    options: { json: { type: "boolean", default: false }, help: { type: "boolean", short: "h", default: false } }
  });
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(1);
}
if (cli.values.help) {
  console.log(USAGE);
  process.exit(0);
}
assertAgySquadWorkspace();
try {
  const report = runDiagnostics();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === "HEALTHY" ? 0 : 1;
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
