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
import { MAINTAINER_SKILLS, SHIPPED_SKILLS, isDirectEntryPoint } from "../../../../scripts/install-register.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const HOSTED_DOCS_PREFIX = "https://paragon-ux.github.io/Agy-Squad/";
const RETIRED_SYMBOL_RE =
  /\b(?:subagent_brief|spawnPacingMs|agy-squad(?:\.mjs)?\s+run|terminal\.py|run-state\.mjs|AGY_SQUAD_RUN_DIR|AGY_SQUAD_SESSION|managed\s+`?manifest`?|adversarial_l1|adversarial_flat|adversarial_review|integrity-auditor|query_transcript|read_transcript|check_context_health)\b|\bnode\s+mcp\/handoffs\.mjs\b|(?<![a-zA-Z0-9_-])\.mcp-ready(?![a-zA-Z0-9_-])/gi;
const HISTORICAL_NOTICE_RE =
  /\b(?:retired|historical|deprecated|removed|superseded|obsolete|replaced\s+by|do\s+not\s+use|never\s+use)\b/i;
const STRAY_FLAG_EMDASH_RE = /(?:^|\s)—[a-z][a-z0-9-]*/i;
const USAGE =
  "Usage: node .agents/skills/self-diagnosis/scripts/diagnose.mjs [--json] [-h|--help]\n" +
  "Read-only Agy-Squad maintainer check: audits shipped skills, links, hygiene, and brief/MCP byte budgets.\n" +
  "Options:\n" +
  "  --json        Emit JSON report (default output format; retained as a compatibility alias)\n" +
  "  -h, --help    Show this help message";

const estimateTokens = bytes => Math.ceil(bytes / 4);
const trimLeadingSlashes = s => { let i = 0; while (i < s.length && s[i] === "/") i++; return s.slice(i); };

function toFindingSlug(value) {
  const raw = value.replace(/\.(?:md|mjs|js|json|svg)$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let start = 0;
  let end = raw.length;
  while (start < end && raw[start] === "-") start++;
  while (end > start && raw[end - 1] === "-") end--;
  return raw.slice(start, end) || "file";
}

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

function assertAgySquadWorkspace(explicitWorkspace = undefined) {
  const candidate = explicitWorkspace || process.env.AGY_SQUAD_WORKSPACE || process.cwd();
  let startDir;
  try { startDir = fs.realpathSync.native(candidate); } catch { startDir = path.resolve(candidate); }
  let realRepoRoot;
  try { realRepoRoot = fs.realpathSync.native(repoRoot); } catch { realRepoRoot = path.resolve(repoRoot); }
  let cursor = startDir;
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
  // Allow invoking `node <parent>/Agy-Squad/.agents/.../diagnose.mjs` directly from the checkout's immediate parent workspace folder
  if (foundPkgName === null && path.dirname(realRepoRoot) === startDir) {
    const repoPkgPath = path.join(realRepoRoot, "package.json");
    if (fs.existsSync(repoPkgPath)) {
      try {
        if (JSON.parse(fs.readFileSync(repoPkgPath, "utf8"))?.name === "agy-squad") return;
      } catch { /* fall through to error */ }
    }
  }
  const detail = foundPkgName ? ` (found package "${foundPkgName}")` : ' (no package.json with name "agy-squad" found)';
  console.error(
    `Error: diagnose.mjs is an Agy-Squad maintainer check and must be run inside an Agy-Squad checkout.\n` +
    `Current working directory: ${candidate}${detail}\n` +
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
    if (/^[>|](?:[-+]?[1-9]|[1-9]?[-+]?)$/.test(inlineVal)) {
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

function readMarkdownCached(filePath, markdownTextCache) {
  if (markdownTextCache?.has(filePath)) return markdownTextCache.get(filePath);
  const text = fs.readFileSync(filePath, "utf8");
  markdownTextCache?.set(filePath, text);
  return text;
}

function existsCached(filePath, markdownTextCache, existsCache) {
  if (markdownTextCache?.has(filePath)) return true;
  if (existsCache?.has(filePath)) return existsCache.get(filePath);
  const ok = fs.existsSync(filePath);
  existsCache?.set(filePath, ok);
  return ok;
}

function trimAsciiSpaceTabEnd(line) {
  let end = line.length;
  while (end > 0 && (line[end - 1] === " " || line[end - 1] === "\t")) end--;
  return line.slice(0, end);
}

function stripMarkdownLinkSyntax(text) {
  if (!text.includes("[")) return text;
  let out = "";
  let pos = 0;
  while (pos < text.length) {
    const openBracket = text.indexOf("[", pos);
    if (openBracket === -1) return out + text.slice(pos);
    const closeBracket = text.indexOf("]", openBracket + 1);
    if (closeBracket === -1) return out + text.slice(pos);
    if (closeBracket === openBracket + 1 || text[closeBracket + 1] !== "(") {
      out += text.slice(pos, closeBracket + 1);
      pos = closeBracket + 1;
      continue;
    }
    const closeParen = text.indexOf(")", closeBracket + 2);
    if (closeParen === -1) return out + text.slice(pos);
    if (closeParen === closeBracket + 2) {
      out += text.slice(pos, closeParen + 1);
      pos = closeParen + 1;
      continue;
    }
    out += text.slice(pos, openBracket) + text.slice(openBracket + 1, closeBracket);
    pos = closeParen + 1;
  }
  return out;
}

function getHeadingSlugs(filePath, markdownTextCache, headingSlugCache = null) {
  if (headingSlugCache?.has(filePath)) return headingSlugCache.get(filePath);
  const slugs = new Set();
  const counts = new Map();
  for (const line of stripFencedCodeBlocks(readMarkdownCached(filePath, markdownTextCache)).split(/\r?\n/)) {
    const match = /^#{1,6}\s+(.+)$/.exec(line);
    if (!match) continue;
    const base = stripMarkdownLinkSyntax(match[1])
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
  headingSlugCache?.set(filePath, slugs);
  return slugs;
}

function extractMarkdownLinks(text) {
  const links = [];
  let pos = 0;
  while (pos < text.length) {
    const openBracket = text.indexOf("[", pos);
    if (openBracket === -1) break;
    const closeBracket = text.indexOf("]", openBracket + 1);
    if (closeBracket === -1) break;
    if (closeBracket === openBracket + 1 || text[closeBracket + 1] !== "(") {
      pos = closeBracket + 1;
      continue;
    }
    let i = closeBracket + 2;
    const destStart = i;
    while (i < text.length && text[i] !== ")" && text[i] !== "\n" && text[i] !== "\r" && !/\s/.test(text[i])) {
      i++;
    }
    const rawDest = text.slice(destStart, i);
    if (i < text.length && text[i] === ")") {
      pos = i + 1;
    } else if (i < text.length && (text[i] === " " || text[i] === "\t")) {
      while (i < text.length && (text[i] === " " || text[i] === "\t")) i++;
      const quote = text[i];
      if (quote !== '"' && quote !== "'") {
        pos = i;
        continue;
      }
      const closeQuote = text.indexOf(quote, i + 1);
      if (closeQuote === -1 || text[closeQuote + 1] !== ")") {
        pos = i + 1;
        continue;
      }
      pos = closeQuote + 2;
    } else {
      pos = i;
      continue;
    }
    if (!rawDest) continue;
    const hashIdx = rawDest.indexOf("#");
    const target = hashIdx === -1 ? rawDest : rawDest.slice(0, hashIdx);
    const fragment = hashIdx === -1 ? "" : rawDest.slice(hashIdx + 1);
    links.push({ target, fragment });
  }
  return links;
}

function hasValidSvgEnvelope(svgRaw) {
  const lower = svgRaw.trimEnd().toLowerCase();
  if (!lower.endsWith("</svg>")) return false;
  const bodyEnd = lower.length - 6;
  let idx = 0;
  while (idx < bodyEnd) {
    const start = lower.indexOf("<svg", idx);
    if (start === -1 || start >= bodyEnd) return false;
    const next = lower[start + 4];
    if (next === ">" || next === " " || next === "\t" || next === "\n" || next === "\r") {
      const closeGt = lower.indexOf(">", start + 4);
      return closeGt !== -1 && closeGt < bodyEnd;
    }
    idx = start + 4;
  }
  return false;
}

function checkRelativeLinks(skillFile, markdown, markdownTextCache, existsCache, headingSlugCache = new Map()) {
  const broken = [];
  const dir = path.dirname(skillFile);
  const skillsRootDir = path.join(repoRoot, ".agents", "skills");
  const isInsideSkills = skillFile === skillsRootDir || skillFile.startsWith(skillsRootDir + path.sep);
  const stripped = stripCode(stripHtmlComments(markdown));

  for (const { target: rawTarget, fragment } of extractMarkdownLinks(stripped)) {
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
    const displayLink = rawTarget ? `${rawTarget}${fragment ? `#${fragment}` : ""}` : `#${fragment}`;
    if (!isHostedDocs && isInsideSkills) {
      const rel = path.relative(skillsRootDir, resolved);
      if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
        broken.push(`${displayLink} (escapes .agents/skills/)`);
        continue;
      }
      const sourceSkill = path.relative(skillsRootDir, skillFile).split(path.sep)[0];
      const targetSkill = rel.split(path.sep)[0];
      if (SHIPPED_SKILLS.includes(sourceSkill) && MAINTAINER_SKILLS.includes(targetSkill)) {
        broken.push(`${displayLink} (links shipped skill to repo-only maintainer skill)`);
        continue;
      }
    }
    if (!existsCached(resolved, markdownTextCache, existsCache)) {
      broken.push(label);
    } else if (
      fragment &&
      resolved.endsWith(".md") &&
      !getHeadingSlugs(resolved, markdownTextCache, headingSlugCache).has(fragment.toLowerCase())
    ) {
      broken.push(displayLink);
    }
  }
  return broken;
}

function walkMarkdownFiles(dir, excludedDirs = null) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs?.has(full)) results.push(...walkMarkdownFiles(full, excludedDirs));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function findRetiredSymbolMatches(markdown) {
  const matched = new Set();
  const normalized = markdown.startsWith("\uFEFF") ? markdown.slice(1) : markdown;
  let activeHistoricalBlock = false;
  let fenceChar = "";
  let fenceLen = 0;
  for (const line of normalized.split(/\r?\n/)) {
    if (!fenceChar) {
      const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (open && !(open[1][0] === "`" && line.slice(open[0].length).includes("`"))) {
        fenceChar = open[1][0];
        fenceLen = open[1].length;
        continue;
      }
      if (/^\s*#{1,6}\s+/.test(line)) activeHistoricalBlock = HISTORICAL_NOTICE_RE.test(line);
    } else {
      const trimmed = trimAsciiSpaceTabEnd(line);
      let spaces = 0;
      while (spaces < trimmed.length && trimmed[spaces] === " ") spaces++;
      const body = trimmed.slice(spaces);
      if (spaces <= 3 && body.length >= fenceLen && [...body].every(c => c === fenceChar)) {
        fenceChar = "";
        fenceLen = 0;
        continue;
      }
    }
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
  const markdownTextCache = new Map();
  const existsCache = new Map();
  const headingSlugCache = new Map();
  const docsRoot = path.join(repoRoot, "docs");
  const excludedDocDirs = new Set([path.join(docsRoot, "reviews"), path.join(docsRoot, "plans")]);
  const activeDocs = fs.existsSync(docsRoot)
    ? walkMarkdownFiles(docsRoot, excludedDocDirs).map(filePath => ({
        path: filePath,
        text: readMarkdownCached(filePath, markdownTextCache)
      }))
    : [];
  const skillsRoot = path.join(repoRoot, ".agents", "skills");
  const skillNames = [...SHIPPED_SKILLS];
  for (const maintainerSkill of MAINTAINER_SKILLS) {
    if (fs.existsSync(path.join(skillsRoot, maintainerSkill))) skillNames.push(maintainerSkill);
  }
  const skillDirs = new Map();
  for (const name of skillNames) {
    const dir = path.join(skillsRoot, name);
    const skillMd = path.join(dir, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      skillDirs.set(name, null);
      continue;
    }
    const files = walkMarkdownFiles(dir);
    for (const f of files) readMarkdownCached(f, markdownTextCache);
    skillDirs.set(name, { dir, skillMd, files });
  }

  for (const name of skillNames) {
    const entry = skillDirs.get(name);
    if (!entry) {
      findings.push({ id: `SKILL-MISSING-${name}`, priority: "P1", summary: `Missing .agents/skills/${name}/SKILL.md` });
      continue;
    }
    const { dir, skillMd, files } = entry;
    const content = readMarkdownCached(skillMd, markdownTextCache);
    const bytes = Buffer.byteLength(content, "utf8");
    const lines = content.replace(/\r?\n$/, "").split(/\r?\n/).length;
    const fm = parseFrontmatter(content);
    if (!fm?.name || fm.name !== name || !fm.hasDescription) {
      findings.push({ id: `SKILL-FM-${name}`, priority: "P1", summary: `Invalid frontmatter in .agents/skills/${name}/SKILL.md` });
    }
    let brokenLinksCount = 0;
    for (const f of files) {
      const isSkillMd = f === skillMd;
      const text = readMarkdownCached(f, markdownTextCache);
      const relFile = path.relative(repoRoot, f).replace(/\\/g, "/");
      const relInSkill = path.relative(dir, f).replace(/\\/g, "/");
      const fileSlug = isSkillMd ? "" : toFindingSlug(relInSkill.replace(/^references\//, ""));
      const broken = checkRelativeLinks(f, text, markdownTextCache, existsCache, headingSlugCache);
      if (broken.length) {
        brokenLinksCount += broken.length;
        findings.push({
          id: isSkillMd ? `SKILL-LINKS-${name}` : `SKILL-REFLINKS-${name}-${fileSlug}`,
          priority: "P1",
          summary: `Broken links in ${relFile}: ${broken.join(", ")}`
        });
      }
      const retired = findRetiredSymbolMatches(text);
      if (retired.length) {
        findings.push({
          id: isSkillMd ? `SKILL-DRIFT-${name}` : `SKILL-DRIFT-${name}-${fileSlug}`,
          priority: "P2",
          summary: `Retired symbol(s) in ${relFile}: ${retired.join(", ")}`
        });
      }
      if (STRAY_FLAG_EMDASH_RE.test(stripHtmlComments(text))) {
        findings.push({
          id: isSkillMd ? `SKILL-EMDASH-${name}` : `SKILL-EMDASH-${name}-${fileSlug}`,
          priority: "P2",
          summary: `Stray em-dash attached to CLI flag in ${relFile}`
        });
      }
    }
    const referenceBytes = files
      .filter(f => f !== skillMd)
      .reduce((sum, f) => sum + Buffer.byteLength(readMarkdownCached(f, markdownTextCache), "utf8"), 0);
    const totalBytes = bytes + referenceBytes;
    if (lines > 300 || bytes > 12288) {
      findings.push({ id: `SKILL-BUDGET-${name}`, priority: "P2", summary: `.agents/skills/${name}/SKILL.md exceeds budget (${lines} lines, ${bytes} B)` });
    }
    skills.push({ name, path: path.relative(repoRoot, skillMd), lines, bytes, referenceBytes, totalBytes, estimatedTokens: estimateTokens(bytes), brokenLinksCount });
  }

  const driftTargets = [
    ...[
      "mcp/briefs.mjs",
      "mcp/planner.mjs",
      "mcp/dispatch.mjs",
      ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
      ".agents/skills/self-diagnosis/resources/comparative-research-manifest.json",
      "benchmarks/teamwork-vs-squad/manifest.json"
    ]
      .map(rel => path.join(repoRoot, rel))
      .filter(abs => fs.existsSync(abs))
      .map(filePath => ({ path: filePath, text: fs.readFileSync(filePath, "utf8") })),
    ...activeDocs
  ];
  for (const { path: abs, text } of driftTargets) {
    const retired = findRetiredSymbolMatches(text);
    if (retired.length) {
      const rel = path.relative(repoRoot, abs).replace(/\\/g, "/");
      findings.push({
        id: `DOC-MCP-DRIFT-${toFindingSlug(rel)}`,
        priority: "P2",
        summary: `Retired symbol(s) in ${rel}: ${retired.join(", ")}`
      });
    }
  }

  const assetsDir = path.join(docsRoot, "assets");
  if (fs.existsSync(assetsDir)) {
    for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".svg")) continue;
      const svgRaw = fs.readFileSync(path.join(assetsDir, entry.name), "utf8");
      if (!hasValidSvgEnvelope(svgRaw) || /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g.test(svgRaw)) {
        findings.push({ id: `DOC-SVG-XML-${entry.name.replace(/\.svg$/, "")}`, priority: "P2", summary: `docs/assets/${entry.name} failed SVG XML check` });
      }
      if (activeDocs.length && !activeDocs.some(d => d.text.includes(entry.name))) {
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
  // Measure template overhead independently of the host's checkout path.
  const workspaceArgument = /[\s"'`$\\]/.test(minSwarm.workspace) ? JSON.stringify(minSwarm.workspace) : minSwarm.workspace;
  const templateBytes = text => Buffer.byteLength(text.replaceAll(workspaceArgument, '"<workspace>"'), "utf8");
  const mcpToolsListResponseBytes = Buffer.byteLength(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: TOOLS } }), "utf8");

  for (const [label, text] of [
    ["subagent specialist", subSpecPrompt],
    ["subagent lead", subLeadPrompt],
    ["precompiled lead", subPreLeadPrompt],
    ["swarm specialist", swarmSpecBrief],
    ["swarm lead", swarmLeadBrief],
    ["swarm auditor", swarmAuditBrief]
  ]) {
    if (text.includes("——") || STRAY_FLAG_EMDASH_RE.test(text)) {
      findings.push({
        id: `BRIEF-EMDASH-${toFindingSlug(label)}`,
        priority: "P2",
        summary: `Malformed em-dash in ${label} brief`
      });
    }
  }

  const promptBudgets = {
    specialistTemplateBytes: Buffer.byteLength(subSpecPrompt, "utf8"),
    leadTemplateBytes: Buffer.byteLength(subLeadPrompt, "utf8"),
    precompiledLeadTemplateBytes: Buffer.byteLength(subPreLeadPrompt, "utf8"),
    swarmSpecialistTemplateBytes: templateBytes(swarmSpecBrief),
    swarmLeadTemplateBytes: templateBytes(swarmLeadBrief),
    swarmAuditorTemplateBytes: templateBytes(swarmAuditBrief),
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

function runCli() {
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
}

if (isDirectEntryPoint(process.argv[1], import.meta.url)) {
  runCli();
}

export { checkRelativeLinks, extractMarkdownLinks, getHeadingSlugs, hasValidSvgEnvelope, runDiagnostics, stripHtmlComments, stripMarkdownLinkSyntax };
