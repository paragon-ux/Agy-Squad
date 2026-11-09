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
    if (entry.isFile() && entry.name === "report.md" && fs.readFileSync(target, "utf8").trim().length > 0) {
      return true;
    }
  }
  return false;
}

function resolveTargetReviewLedger(ledgerArg) {
  const reviewsDir = path.join(repoRoot, "docs/reviews");
  const reviewsReal = fs.existsSync(reviewsDir) ? fs.realpathSync(reviewsDir) : null;
  if (ledgerArg) {
    const clean = ledgerArg.replace(/\\/g, "/").replace(/^\.\/+/, "");
    if (!clean.startsWith("docs/reviews/") || !clean.endsWith(".md") || clean.includes("..")) {
      throw new Error("Flag '--ledger' must name a Markdown file under docs/reviews/ (e.g., docs/reviews/rebuild-wsl-dispatch-review-r2.md).");
    }
    const abs = path.resolve(repoRoot, clean);
    if (!reviewsReal || !fs.existsSync(abs)) {
      throw new Error(`Target PR review ledger '${clean}' does not exist.`);
    }
    const real = fs.realpathSync(abs);
    const stat = fs.statSync(real);
    if (path.dirname(real) !== reviewsReal || !stat.isFile()) {
      throw new Error(`Target PR review ledger '${clean}' must be a regular file inside docs/reviews/.`);
    }
    return { relative: path.relative(repoRoot, real).replace(/\\/g, "/"), absolute: real, stat };
  }
  if (!reviewsReal) return null;
  const candidates = [];
  for (const entry of fs.readdirSync(reviewsReal, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith(".") || !entry.name.endsWith(".md")) continue;
    const absolute = path.join(reviewsReal, entry.name);
    const real = fs.realpathSync(absolute);
    if (path.dirname(real) !== reviewsReal) continue;
    const stat = fs.statSync(real);
    if (stat.isFile()) {
      const revMatch = /-r(\d+)\.md$/i.exec(entry.name);
      const revision = revMatch ? Number.parseInt(revMatch[1], 10) : 1;
      const family = entry.name.replace(/-r\d+(?=\.md$)/i, "").toLowerCase();
      candidates.push({ relative: `docs/reviews/${entry.name}`, absolute: real, stat, family, revision });
    }
  }
  const latestByFamily = new Map();
  for (const item of candidates) {
    const prev = latestByFamily.get(item.family);
    if (!prev || item.revision > prev.revision || (item.revision === prev.revision && item.stat.mtimeMs > prev.stat.mtimeMs)) {
      latestByFamily.set(item.family, item);
    }
  }
  const activeCandidates = [...latestByFamily.values()];
  activeCandidates.sort((a, b) => {
    if (Math.abs(b.stat.mtimeMs - a.stat.mtimeMs) > 2000) {
      return b.stat.mtimeMs - a.stat.mtimeMs;
    }
    if (b.revision !== a.revision) {
      return b.revision - a.revision;
    }
    return b.relative.localeCompare(a.relative);
  });
  return activeCandidates[0] ?? null;
}

const ALLOWED_LEDGER_STATUSES = new Set([
  "Open (Pre-Remediation)",
  "Closed",
  "Residual (Open)",
  "Closed (Post-Remediation)",
  "Deferred / Won't Fix",
  "Closed (By Design)",
  "Informational"
]);

const SECTION8_STATUSES = new Set([
  "Residual (Open)",
  "Closed (Post-Remediation)",
  "Deferred / Won't Fix",
  "Closed (By Design)",
  "Informational"
]);

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map(cell => cell.trim());
}

function parseMarkdownTables(sectionText) {
  const lines = sectionText.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i + 1 < lines.length; i += 1) {
    const hdrLine = lines[i].trim();
    const sepLine = lines[i + 1].trim();
    if (!hdrLine.startsWith("|") || !hdrLine.endsWith("|")) continue;
    if (!/^\|\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*\|$/.test(sepLine)) continue;
    const headers = splitMarkdownRow(hdrLine);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith("|") && lines[j].trim().endsWith("|")) {
      rows.push(splitMarkdownRow(lines[j]));
      j += 1;
    }
    tables.push({ headers, rows });
    i = j - 1;
  }
  return tables;
}

function extractTopLevelSection(markdown, sectionNum) {
  const headingRe = new RegExp(`^##\\s+${sectionNum}\\.\\s+.*$`, "m");
  const match = headingRe.exec(markdown);
  if (!match) return null;
  const start = match.index;
  const afterHeading = start + match[0].length;
  const rest = markdown.slice(afterHeading);
  const nextMatch = /^##\s+\d+\.\s+/m.exec(rest);
  const body = nextMatch ? rest.slice(0, nextMatch.index) : rest;
  return { heading: match[0].trim(), body };
}

const NON_FINDING_HYPHEN_TOKENS = new Set([
  "UTF-8",
  "UTF-16",
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
  "JSON-RPC",
  "CTRL-C",
  "CTRL-D",
  "PRE-FIX",
  "RE-VERIFY",
  "NON-ZERO",
  "NON-EMPTY",
  "READ-ONLY",
  "FAIL-FAST",
  "FAIL-SAFE",
  "OPT-IN",
  "END-TO-END",
  "ONE-TO-ONE",
  "STEP-BY-STEP",
  "LINE-BY-LINE",
  "MULTI-BYTE",
  "SUB-AGENT"
]);

function extractCohortFindingIds(markdown, { includeProseHeadingsAndBullets = false } = {}) {
  const ids = new Set();
  if (typeof markdown !== "string" || !markdown.trim()) return ids;
  const idPattern = /^(?:[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+|F\d{2,})$/;
  const addCandidate = raw => {
    const clean = raw.replace(/\([^)]*\)/g, "").replace(/`/g, "").replace(/\*/g, "").trim();
    if (idPattern.test(clean) && !NON_FINDING_HYPHEN_TOKENS.has(clean.toUpperCase())) {
      ids.add(clean);
    }
  };
  const stripped = markdown.replace(/(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g, "");
  for (const table of parseMarkdownTables(stripped)) {
    if (table.headers[0] !== "ID" && table.headers[0] !== "Finding ID") continue;
    for (const row of table.rows) {
      if (!row.length) continue;
      addCandidate(row[0]);
    }
  }
  for (const match of stripped.matchAll(/^#{3,4}\s+`([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+|F\d{2,})`/gm)) {
    addCandidate(match[1]);
  }
  if (includeProseHeadingsAndBullets) {
    // Plain, numbered, or styled headings (e.g., "### SD-TEST-01 — ...", "#### **SD-TEST-01:** ...", "### 2.1 SD-HEAD-02: ...")
    const headingRe =
      /^#{2,6}\s+(?:\d+(?:\.\d+)*[.)]?\s+)?(?:[*`\s]*(?:\[P[0-3]\]|\(P[0-3]\)|Finding)[*`\s]*[:—–-]?\s*)?[*`]*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+|F\d{2,})[*`]*(?=$|\s*(?:[:—–(-]|[*`]))/gm;
    for (const match of stripped.matchAll(headingRe)) {
      addCandidate(match[1]);
    }
    // Plain or styled bullets / numbered items (e.g., "- SD-TEST-01 — ...", "- **SD-TEST-01:** ...", "- **[P2] `SD-TEST-01` (`SVC`):** ...")
    const bulletRe =
      /^\s*(?:[*+-]|\d+[.)])\s+(?:[*`\s]*(?:\[P[0-3]\]|\(P[0-3]\)|Finding)[*`\s]*[:—–-]?\s*)?[*`]*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+|F\d{2,})[*`]*\s*(?:\([^)]*\)\s*)?[*`]*\s*(?:[:—–-]|[*`]+\s*[:—–-]|$)/gm;
    for (const match of stripped.matchAll(bulletRe)) {
      addCandidate(match[1]);
    }
  }
  return ids;
}

function validateTargetReviewLedger(targetLedger, { requireCohortSection = false } = {}) {
  const markdown = fs.readFileSync(targetLedger.absolute, "utf8");
  const errors = [];
  const openResiduals = [];
  const recordedFindingIds = extractCohortFindingIds(markdown);
  const recordedBundleShas = [];

  const sec1 = extractTopLevelSection(markdown, 1);
  const expectedSessionHeaders = [
    "Session #",
    "Operator Conversation ID",
    "Parent Session",
    "Date",
    "Base..Head + Working-Tree State",
    "Skill / Topology Invoked"
  ];
  if (!sec1) {
    errors.push("Missing mandatory '## 1.' review metadata section.");
  } else {
    const sessionTable = parseMarkdownTables(sec1.body).find(
      t => t.headers.length === expectedSessionHeaders.length && t.headers.every((h, idx) => h === expectedSessionHeaders[idx])
    );
    if (!sessionTable || sessionTable.rows.length === 0) {
      errors.push(
        "Section 1 must contain a populated Session Provenance table ('Session # | Operator Conversation ID | Parent Session | Date | Base..Head + Working-Tree State | Skill / Topology Invoked')."
      );
    }
  }

  const validateFindingTable = (table, label, { section8Only = false } = {}) => {
    const idIdx = 0;
    const statusIdx = table.headers.indexOf("Status");
    if (statusIdx === -1) {
      errors.push(`${label} finding table is missing a 'Status' column.`);
      return;
    }
    const seenIds = new Set();
    for (const row of table.rows) {
      if (row.length !== table.headers.length) {
        errors.push(`${label} row '${row[0] ?? ""}' has ${row.length} columns (expected ${table.headers.length}).`);
        continue;
      }
      const rawId = row[idIdx];
      const primaryId = rawId.replace(/\([^)]*\)/g, "").replace(/`/g, "").trim();
      if (
        !primaryId ||
        /\.\.|[&+,/]/.test(primaryId) ||
        /(?:^|-)(?:HARDEN|UMBRELLA|BATCH|MISC)(?:-|$)/i.test(primaryId) ||
        /^R\d+-OPT-P3-\d+$/i.test(primaryId)
      ) {
        errors.push(`${label} violates '1 ID = 1 Row' with compressed/umbrella ID '${rawId}'.`);
      } else if (seenIds.has(primaryId)) {
        errors.push(`${label} contains duplicate finding ID '${primaryId}'.`);
      } else {
        seenIds.add(primaryId);
      }

      const cleanStatus = row[statusIdx].replace(/\*\*|`/g, "").trim();
      if (!ALLOWED_LEDGER_STATUSES.has(cleanStatus)) {
        errors.push(`${label} row '${primaryId || rawId}' uses non-canonical status '${cleanStatus}'.`);
      } else if (section8Only && !SECTION8_STATUSES.has(cleanStatus)) {
        errors.push(`Section 8 row '${primaryId || rawId}' must use a residual/deferred/by-design status (found '${cleanStatus}').`);
      } else if (!section8Only && SECTION8_STATUSES.has(cleanStatus)) {
        errors.push(`${label} row '${primaryId || rawId}' has status '${cleanStatus}', which belongs in Section 8.`);
      }

      if (section8Only && cleanStatus === "Residual (Open)" && primaryId) {
        openResiduals.push(primaryId);
      }
    }
  };

  const sec8 = extractTopLevelSection(markdown, 8);
  const expectedSec8Headers = [
    "ID",
    "Wave/Session",
    "Cat",
    "Status",
    "Source",
    "Defect / Proposal",
    "Disposition / Fix",
    "Verification & Bundle SHA"
  ];
  if (!sec8 || !/^##\s+8\.\s+Post-Remediation Residuals & Deferred Dispositions\b/.test(sec8.heading)) {
    errors.push("Missing mandatory '## 8. Post-Remediation Residuals & Deferred Dispositions' section.");
  } else {
    const sec8Tables = parseMarkdownTables(sec8.body);
    const hasEmptyMarker = /None \(0 open residuals, 0 deferred items\)/.test(sec8.body);
    const sec8Table = sec8Tables.find(
      t => t.headers.length === expectedSec8Headers.length && t.headers.every((h, idx) => h === expectedSec8Headers[idx])
    );
    if (!sec8Table && !hasEmptyMarker) {
      errors.push(
        "Section 8 must contain either 'None (0 open residuals, 0 deferred items)' or the 8-column table ('ID | Wave/Session | Cat | Status | Source | Defect / Proposal | Disposition / Fix | Verification & Bundle SHA')."
      );
    } else if (sec8Table) {
      if (sec8Table.rows.length === 0) {
        errors.push("Section 8 table has 0 rows; use 'None (0 open residuals, 0 deferred items)' when empty.");
      }
      validateFindingTable(sec8Table, "Section 8", { section8Only: true });
    }
  }

  if (/^##\s+(?:1[0-9]|[2-9]\d)\.\s+/m.test(markdown)) {
    errors.push("Ad-hoc top-level sections beyond Section 9 are prohibited; consolidate all /self-diagnosis waves into Section 9.");
  }

  const sec9 = extractTopLevelSection(markdown, 9);
  const expectedCohortHeaders = [
    "Wave",
    "Session ID",
    "Stage",
    "Subagent IDs",
    "Pre-Fix Bundle SHA",
    "Re-Verify Bundle SHA",
    "Teardown"
  ];
  if (!sec9 && requireCohortSection) {
    errors.push("Missing mandatory '## 9. `/self-diagnosis` Cohort & Bundle Ledger' section required before --teardown.");
  } else if (sec9) {
    if (!/^##\s+9\.\s+`?\/self-diagnosis`?\s+Cohort & Bundle Ledger\b/.test(sec9.heading)) {
      errors.push("Section 9 must be titled '## 9. `/self-diagnosis` Cohort & Bundle Ledger'.");
    }
    const sec9Tables = parseMarkdownTables(sec9.body);
    const cohortTable = sec9Tables.find(
      t => t.headers.length === expectedCohortHeaders.length && t.headers.every((h, idx) => h === expectedCohortHeaders[idx])
    );
    if (!cohortTable || cohortTable.rows.length === 0) {
      errors.push(
        "Section 9 must contain a populated Cohort Provenance table ('Wave | Session ID | Stage | Subagent IDs | Pre-Fix Bundle SHA | Re-Verify Bundle SHA | Teardown')."
      );
    } else {
      for (const row of cohortTable.rows) {
        for (const colIdx of [4, 5]) {
          const cell = row[colIdx] ?? "";
          for (const match of cell.matchAll(/(?<![0-9a-f-])[0-9a-f]{12,64}(?![0-9a-f-])/gi)) {
            recordedBundleShas.push(match[0].toLowerCase());
          }
        }
      }
    }
    const findingTables = sec9Tables.filter(t => t !== cohortTable && (t.headers[0] === "ID" || t.headers[0] === "Finding ID"));
    if (findingTables.length === 0 && !/None \(0 wave findings\)/.test(sec9.body)) {
      errors.push("Section 9 must contain an atomic Wave Finding Ledger table (or 'None (0 wave findings)').");
    }
    for (const ft of findingTables) {
      validateFindingTable(ft, "Section 9");
    }
  }

  return { errors, openResiduals, recordedFindingIds, recordedBundleShas };
}

function teardownSelfDiagnosisDirs({ squadId = "all", acceptedHash, force = false, ledgerPath } = {}) {
  const manifest = JSON.parse(fs.readFileSync(manifestAbsolute, "utf8"));
  const knownSquads = Object.keys(manifest.squads);
  if (squadId !== "all" && !knownSquads.includes(squadId)) {
    throw new Error(`Unknown self-diagnosis squadId '${squadId}'. Expected 'all' or one of: ${knownSquads.join(", ")}`);
  }
  if (acceptedHash && squadId === "all") {
    throw new Error("Flag '--accept' requires a single squadId (not 'all').");
  }
  const targetLedger = resolveTargetReviewLedger(ledgerPath);
  const targetSquads = squadId === "all" ? knownSquads : [squadId];
  const scratchSquadRoot = path.join(repoRoot, scratchSquadRel);
  const validatedDirs = [];
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
      if (!targetLedger) {
        throw new Error(
          `Refusing to tear down ${relDir}: no durable target PR review ledger found under docs/reviews/. Export or update docs/reviews/<slug>.md before --teardown.`
        );
      }
      const ledgerCheck = validateTargetReviewLedger(targetLedger, { requireCohortSection: true });
      if (ledgerCheck.errors.length > 0) {
        throw new Error(
          `Refusing to tear down ${relDir}: ${targetLedger.relative} violates PR Review Standard v1.3.0 schema: ${ledgerCheck.errors.join(" ")}`
        );
      }
      if (fs.existsSync(bundleAbs)) {
        const verified = verifyBundle(repoRoot, bundleRel, acceptedHash);
        const bundleStat = fs.statSync(bundleAbs);
        if (targetLedger.stat.mtimeMs + 1000 < bundleStat.mtimeMs) {
          throw new Error(
            `Refusing to tear down ${relDir} before updating the durable target PR review ledger (${targetLedger.relative}). Update ${targetLedger.relative} with this cohort's findings and bundle digest before running --teardown.`
          );
        }
        const digestRecorded = ledgerCheck.recordedBundleShas.some(
          token => verified.sha256 === token || verified.sha256.startsWith(token)
        );
        if (!digestRecorded) {
          throw new Error(
            `Refusing to tear down ${relDir}: bundle digest ${verified.sha256} is not recorded in Section 9 of ${targetLedger.relative}.`
          );
        }
        const bundleJson = JSON.parse(fs.readFileSync(bundleAbs, "utf8"));
        const leadReportAbs = path.join(repoRoot, reportPath(id, undefined, scratchSquadRel));
        const looseReports = [];
        for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
          if (entry.isDirectory() && /^specialist-[1-9]\d*$/.test(entry.name)) {
            const repPath = path.join(absDir, entry.name, "report.md");
            if (fs.existsSync(repPath)) {
              looseReports.push(fs.readFileSync(repPath, "utf8"));
            }
          }
        }
        const cohortMarkdowns = [
          ...(fs.existsSync(leadReportAbs) ? [fs.readFileSync(leadReportAbs, "utf8")] : []),
          ...(Array.isArray(bundleJson.reports) ? bundleJson.reports.map(r => r.markdown || "") : []),
          ...looseReports
        ];
        const cohortFindingIds = new Set();
        for (const md of cohortMarkdowns) {
          for (const fid of extractCohortFindingIds(md, { includeProseHeadingsAndBullets: true })) {
            cohortFindingIds.add(fid);
          }
        }
        const missingIds = [...cohortFindingIds].filter(fid => !ledgerCheck.recordedFindingIds.has(fid));
        if (missingIds.length > 0) {
          throw new Error(
            `Refusing to tear down ${relDir}: cohort finding ID(s) [${missingIds.join(", ")}] are missing from ${targetLedger.relative}.`
          );
        }
      } else if (acceptedHash) {
        throw new Error(`Cannot verify accepted hash for '${id}': missing bundle at ${bundleRel}`);
      } else if (hasEvidence(absDir)) {
        throw new Error(
          `Refusing to tear down unbundled evidence in ${relDir} without bundle verification or --force.`
        );
      }
    }
    validatedDirs.push({ absDir, relDir });
  }

  for (const { absDir, relDir } of validatedDirs) {
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

  return { status: "TORN_DOWN", targetReviewLedger: targetLedger?.relative ?? null, tornDown, removedParents };
}

function parseFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (!match) return null;
  const raw = match[1];
  let name = /^name:\s*(.+)$/m.exec(raw)?.[1]?.trim();
  if (name && ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'")))) {
    name = name.slice(1, -1).trim();
  }
  const descMatch = /^description:\s*(?:[>|][-+]?\s*\r?\n)?([\s\S]*)$/m.exec(raw);
  const descBody = descMatch ? descMatch[1].replace(/\r?\n[a-zA-Z0-9_-]+:[\s\S]*$/, "").trim() : "";
  const hasDescription = descBody.length > 0;
  return { name, hasDescription };
}

function checkRelativeLinks(skillFile, markdown) {
  const dir = path.dirname(skillFile);
  const broken = [];
  const stripped = markdown
    .replace(/(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g, "")
    .replace(/(`+)([^\r\n]*?)\1/g, "CODE");
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

function auditSkills(ledgerArg) {
  const skillsRoot = path.join(repoRoot, ".agents/skills");
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(d => d.isDirectory());
  const skills = [];
  const findings = [];
  const targetLedger = resolveTargetReviewLedger(ledgerArg);

  if (!targetLedger) {
    findings.push({
      id: "DOC-LEDGER-MISSING",
      category: "DOC",
      priority: "P1",
      summary: "No durable target PR review ledger found under docs/reviews/ (required pre-remediation and pre-teardown target)."
    });
  } else {
    const ledgerCheck = validateTargetReviewLedger(targetLedger);
    if (ledgerCheck.errors.length > 0) {
      findings.push({
        id: "DOC-LEDGER-SCHEMA",
        category: "DOC",
        priority: "P2",
        summary: `${targetLedger.relative} violates PR Review Standard v1.3.0 ledger structure: ${ledgerCheck.errors.join(" ")}`
      });
    }
    if (ledgerCheck.openResiduals.length > 0) {
      findings.push({
        id: "DOC-LEDGER-RESIDUALS-OPEN",
        category: "DOC",
        priority: "P3",
        summary: `${targetLedger.relative} Section 8 tracks ${ledgerCheck.openResiduals.length} Residual (Open) item(s) awaiting post-remediation closure: ${ledgerCheck.openResiduals.join(", ")}.`
      });
    }
  }

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
    let totalBytes = 0;
    let markdownBytes = 0;
    for (const f of allFiles) {
      const sz = fs.statSync(f).size;
      totalBytes += sz;
      if (f.endsWith(".md")) markdownBytes += sz;
    }
    const entryShare = totalBytes > 0 ? Number((bytes / totalBytes).toFixed(2)) : 1;
    const proseShare = markdownBytes > 0 ? Number((bytes / markdownBytes).toFixed(2)) : 1;

    if (!fm?.name || fm.name !== entry.name || !fm.hasDescription) {
      findings.push({
        id: `SKILL-FM-${entry.name}`,
        category: "SKILL",
        priority: "P1",
        summary: `Invalid YAML frontmatter in .agents/skills/${entry.name}/SKILL.md (expected name '${entry.name}' and non-empty description).`
      });
    }
    if (/\b(?:call|use)\s+`?(?:subagent_brief|spawnPacingMs)`?/i.test(content)) {
      findings.push({
        id: `SKILL-DRIFT-${entry.name}`,
        category: "SKILL",
        priority: "P2",
        summary: `.agents/skills/${entry.name}/SKILL.md instructs use of retired tool/parameter (subagent_brief or spawnPacingMs).`
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
        summary: `.agents/skills/${entry.name}/SKILL.md entry share is ${Math.round(entryShare * 100)}% of ${totalBytes} B total skill bytes (target <= 70% when skill > 8 KB).`
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
      markdownSkillBytes: markdownBytes,
      entryShareOfTotal: entryShare,
      proseShareOfMarkdown: proseShare,
      brokenLinksCount: brokenLinks.length
    });
  }

  return { skills, findings, targetReviewLedger: targetLedger?.relative ?? null };
}

function runSquadCanaryAndOptimization({ allowActiveCohort = false } = {}) {
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
          id: allowActiveCohort ? `SVC-ACTIVE-COHORT-${id}` : `SVC-TEARDOWN-${id}`,
          category: "SVC",
          priority: allowActiveCohort ? "P3" : "P2",
          summary: allowActiveCohort
            ? `Active self-diagnosis cohort directory '${relDir}' present (--allow-active-cohort set; tear down via '--teardown' after final verification).`
            : `Lingering self-diagnosis directory '${relDir}' was not torn down (L41). Run 'node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown' after bundle verification (or pass '--allow-active-cohort' during an in-flight cohort).`
        });
      }
    }
    for (const entry of fs.readdirSync(scratchSquadRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("self-diag-canary-")) {
        findings.push({
          id: allowActiveCohort ? `SVC-ACTIVE-CANARY-${entry.name}` : `SVC-TEARDOWN-${entry.name}`,
          category: "SVC",
          priority: allowActiveCohort ? "P3" : "P2",
          summary: allowActiveCohort
            ? `Concurrent self-diagnosis canary directory '${scratchSquadRel}/${entry.name}' present (--allow-active-cohort set).`
            : `Lingering self-diagnosis canary directory '${scratchSquadRel}/${entry.name}' was not torn down (L41).`
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

    const managedReportRoot = path.posix.dirname(managedLeads.structuredContent.manifestPath);
    for (const id of squadIds) {
      const s1 = reportPath(id, 1);
      const s2 = reportPath(id, 2);
      const leadSlot = reportPath(id);
      const ms1 = reportPath(id, 1, managedReportRoot);
      const ms2 = reportPath(id, 2, managedReportRoot);
      const mleadSlot = reportPath(id, undefined, managedReportRoot);
      for (const [slot, text] of [
        [s1, `# ${id} Specialist 1\nVerified target.txt.\n`],
        [s2, `# ${id} Specialist 2\nVerified target.txt.\n`],
        [leadSlot, `# ${id} Lead Synthesis\nVerdict: PASS\nVerified both specialist reports against target.txt.\n`],
        [ms1, `# ${id} Managed Specialist 1\nVerified target.txt.\n`],
        [ms2, `# ${id} Managed Specialist 2\nVerified target.txt.\n`],
        [mleadSlot, `# ${id} Managed Lead Synthesis\nVerdict: PASS\nVerified both specialist reports against target.txt.\n`]
      ]) {
        const full = path.join(canaryDir, slot);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, text);
      }
    }

    const tHandoff = performance.now();
    const verifiedFiles = fingerprint(canaryDir, ["target.txt"]);
    const leadAssignments = [];
    const leadHandoffs = [];

    // Smoke-test Single-Squad (2 specialists), Flat Full-Squad (6 specialists across all 3 squads),
    // Layered Full-Squad (3 leads -> 6 specialists), and Managed Plan-Root handoff/bundle/verify/prune pipelines
    for (const id of squadIds) {
      const s1 = reportPath(id, 1);
      const s2 = reportPath(id, 2);
      const leadSlot = reportPath(id);
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

    const managedId = squadIds[0];
    const ms1 = reportPath(managedId, 1, managedReportRoot);
    const ms2 = reportPath(managedId, 2, managedReportRoot);
    const managedRecord = {
      workspace: canaryDir,
      squadId: managedId,
      reportRoot: managedReportRoot,
      verdict: "PASS",
      verifiedFiles,
      assignments: [
        { conversationId: `${managedId}-mchild-1`, report: ms1 },
        { conversationId: `${managedId}-mchild-2`, report: ms2 }
      ],
      handoffs: [
        { sender: `${managedId}-mchild-1`, message: `READY ${ms1} — Managed Specialist 1 verified ${managedId}.` },
        { sender: `${managedId}-mchild-2`, message: `READY ${ms2} — Managed Specialist 2 verified ${managedId}.` }
      ]
    };
    inspectHandoffs(canaryDir, managedRecord);
    const managedBundled = bundleReports(canaryDir, managedRecord);
    const managedVerified = verifyBundle(canaryDir, managedBundled.path, managedBundled.sha256);
    const managedPruned = pruneReports(canaryDir, managedBundled.path, managedVerified.sha256);
    if (managedPruned.removed.length !== 2) {
      throw new Error(`Expected 2 pruned managed reports in self-diagnosis canary for '${managedId}', got ${managedPruned.removed.length}`);
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
    const totalCanarySquads = squadIds.length + 1;
    timings.handoffPipelineMs = Number((performance.now() - tHandoff).toFixed(2));
    timings.perSquadHandoffMs = Number((timings.handoffPipelineMs / totalCanarySquads).toFixed(2));
    if (timings.perSquadHandoffMs > 50) {
      findings.push({
        id: "SVC-LATENCY-HANDOFF",
        category: "SVC",
        priority: "P3",
        summary: `Handoff/bundle/verify/prune canary took ${timings.perSquadHandoffMs} ms per 2-specialist squad (${timings.handoffPipelineMs} ms total across ${totalCanarySquads} squads; target < 20 ms, flag > 50 ms per squad).`
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
  let ledgerPath;
  let force = false;
  let allowActiveCohort = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--markdown") {
      markdown = true;
    } else if (arg === "--allow-active-cohort") {
      allowActiveCohort = true;
    } else if (arg === "--print-dispatch") {
      printDispatch = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        squadId = next;
        i += 1;
      }
    } else if (arg === "--parent-id") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-") || !/^[A-Za-z0-9._:-]+$/.test(next)) {
        throw new Error("Flag '--parent-id' requires a valid conversationId value (alphanumeric, '.', '_', ':', '-').");
      }
      parentId = next;
      i += 1;
    } else if (arg === "--teardown") {
      teardown = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
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
    } else if (arg === "--ledger") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Flag '--ledger' requires a path under docs/reviews/.");
      }
      ledgerPath = next;
      i += 1;
    } else if (arg === "--force") {
      force = true;
    } else {
      throw new Error(
        `Unknown argument '${arg}'. Usage: diagnose.mjs [--markdown] [--allow-active-cohort] [--ledger <docs/reviews/...>] | [--print-dispatch [squadId] [--parent-id <id>]] | [--teardown [all | <squadId> [--accept <sha256>]] [--ledger <docs/reviews/...>] [--force]]`
      );
    }
  }
  if ([markdown, printDispatch, teardown].filter(Boolean).length > 1) {
    throw new Error("Flags '--markdown', '--print-dispatch', and '--teardown' are mutually exclusive.");
  }
  if (parentId && !printDispatch) {
    throw new Error("Flag '--parent-id' is only valid with '--print-dispatch'.");
  }
  if (ledgerPath && printDispatch) {
    throw new Error("Flag '--ledger' is not valid with '--print-dispatch'.");
  }
  if (allowActiveCohort && (printDispatch || teardown)) {
    throw new Error("Flag '--allow-active-cohort' is only valid in audit mode.");
  }
  if ((acceptedHash || force) && !teardown) {
    throw new Error("Flags '--accept' and '--force' are only valid with '--teardown'.");
  }
  if (acceptedHash && teardownTarget === "all") {
    throw new Error("Flag '--accept' requires a single squadId (not 'all').");
  }
  return {
    markdown,
    printDispatch,
    teardown,
    squadId,
    teardownTarget,
    parentId,
    acceptedHash,
    ledgerPath,
    force,
    allowActiveCohort
  };
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
      force: cli.force,
      ledgerPath: cli.ledgerPath
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

const skillAudit = auditSkills(cli.ledgerPath);
const squadAudit = runSquadCanaryAndOptimization({ allowActiveCohort: cli.allowActiveCohort });
const findings = [...skillAudit.findings, ...squadAudit.findings];
const prReviewMatrix = buildPrReviewCategoryMatrix(findings);
const blockingCount = findings.filter(f => f.priority === "P1" || f.priority === "P2").length;

const report = {
  status: blockingCount === 0 ? "HEALTHY" : "CHANGES_REQUIRED",
  standardVersion: "1.3.0",
  manifestPath: manifestRelative,
  targetReviewLedger: skillAudit.targetReviewLedger,
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
    `- **Target PR Review Ledger:** \`${report.targetReviewLedger ?? "MISSING"}\``,
    `- **Timings:** compile \`${report.timings.unmanagedCompileMs} ms\`, handoff+bundle+verify+prune \`${report.timings.handoffPipelineMs} ms\` (\`${report.timings.perSquadHandoffMs} ms/squad\`), mcp-stdio \`${report.timings.mcpSpawnMs} ms\``,
    "",
    "## 1. Workspace Skills Progressive Disclosure & Token Audit",
    "",
    "| Skill | Path | Lines | UTF-8 Bytes | Est. Tokens | Entry Share (All / Prose) | Broken Links |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...report.skills.map(
      s =>
        `| \`${s.name}\` | \`${s.path}\` | ${s.lines} | ${s.bytes} | ~${s.estimatedTokens} | ${Math.round(
          s.entryShareOfTotal * 100
        )}% / ${Math.round(s.proseShareOfMarkdown * 100)}% | ${s.brokenLinksCount} |`
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
    "## 3. PR-Review Standard v1.3.0 Category Matrix",
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
