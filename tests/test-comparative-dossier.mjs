#!/usr/bin/env node

/**
 * Automated Test Suite: Comparative Multi-Agent Harness Architecture Dossier
 * 
 * Verifies all requirements (R1–R4, F1–F6) from ORIGINAL_REQUEST.md and PROJECT.md:
 * - Tier 1: Feature Coverage & Completeness (R1, R2, R3, R4)
 * - Tier 2: Boundary & Format Checks (Score bounds, receipt byte budget, markdown integrity)
 * - Tier 3: Cross-Feature Consistency & Internal Coherence (Score parity, rubric anchors, yield points)
 * - Tier 4: Structural Citation & Dossier Coverage Validation (Pattern & File Presence)
 * 
 * Standard: Agy-Squad PR Review Standard v1.4.0 & Architectural Decision Ledger (L1–L43; historical dossier L1–L41)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DOSSIER_PATH = path.resolve(process.cwd(), "docs/plans/comparative-harness-architecture-teamwork.md");

// Test Reporter
class TestRunner {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.tierResults = {
      "Tier 1 (Feature Coverage)": { passed: 0, failed: 0 },
      "Tier 2 (Boundary & Format)": { passed: 0, failed: 0 },
      "Tier 3 (Cross-Feature Consistency)": { passed: 0, failed: 0 },
      "Tier 4 (Structural & Citations)": { passed: 0, failed: 0 }
    };
    this.errors = [];
  }

  run(tier, name, fn) {
    this.total++;
    try {
      fn();
      this.passed++;
      this.tierResults[tier].passed++;
      console.log(`  ✓ [${tier.split(" ")[0]}] ${name}`);
    } catch (err) {
      this.failed++;
      this.tierResults[tier].failed++;
      this.errors.push({ tier, name, error: err });
      console.error(`  ✗ [${tier.split(" ")[0]}] ${name}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  summary() {
    console.log("\n=======================================================");
    console.log("Comparative Multi-Agent Harness Dossier Test Results");
    console.log("=======================================================");
    for (const [tier, res] of Object.entries(this.tierResults)) {
      const icon = res.failed === 0 ? "✓" : "✗";
      console.log(` ${icon} ${tier}: ${res.passed} passed, ${res.failed} failed`);
    }
    console.log("-------------------------------------------------------");
    console.log(`Total Assertions: ${this.total} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log("=======================================================\n");

    if (this.failed > 0) {
      console.error(`FAILED: ${this.failed} test(s) failed.`);
      process.exit(1);
    } else {
      console.log("SUCCESS: All dossier structural and citation checks passed cleanly (pattern & file-presence coverage).");
      process.exit(0);
    }
  }
}

const runner = new TestRunner();

// Ensure file exists before running tests
if (!fs.existsSync(DOSSIER_PATH)) {
  console.error(`\n[FATAL] Master Dossier not found at expected path:\n  ${DOSSIER_PATH}\n`);
  console.error("Please author or generate the dossier before executing this test suite.");
  process.exit(1);
}

const content = fs.readFileSync(DOSSIER_PATH, "utf8").replace(/\r\n/g, "\n");

// Helpers for Parsing & Inspection
function findSections(markdown) {
  const headings = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trimEnd().match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      headings.push({ level: match[1].length, title: match[2].trim(), line: i + 1 });
    }
  }
  return headings;
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  
  const cells = [];
  let current = "";
  let inMath = false;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const prev = i > 0 ? trimmed[i - 1] : "";
    if (char === "$" && prev !== "\\") {
      inMath = !inMath;
      current += char;
    } else if (char === "|" && prev !== "\\" && !inMath) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseMarkdownTables(markdown) {
  const tables = [];
  const lines = markdown.split(/\r?\n/);
  let currentTable = null;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (currentTable) {
        if (currentTable.rows.length >= 2) {
          const sepRow = currentTable.rows[1];
          if (sepRow.every(c => /^:?-+:?$/.test(c))) tables.push(currentTable);
        }
        currentTable = null;
      }
      continue;
    }
    if (inCodeBlock) continue;

    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = splitTableRow(line);
      if (!currentTable) {
        currentTable = { startLine: i + 1, rows: [] };
      }
      currentTable.rows.push(cells);
    } else {
      if (currentTable) {
        if (currentTable.rows.length >= 2) {
          const sepRow = currentTable.rows[1];
          if (sepRow.every(c => /^:?-+:?$/.test(c))) tables.push(currentTable);
        }
        currentTable = null;
      }
    }
  }
  if (currentTable && currentTable.rows.length >= 2) {
    const sepRow = currentTable.rows[1];
    if (sepRow.every(c => /^:?-+:?$/.test(c))) tables.push(currentTable);
  }
  return tables;
}

function getHeadingSemanticLevel(level, title) {
  if (/^#{3}\s+\d+\.\d+\.\d+\b/.test(title)) return 4;
  return level;
}

function getSectionContent(markdown, headingRe) {
  const lines = markdown.split(/\r?\n/);
  let inCode = false;
  let captured = null;
  let targetLevel = 0;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim().startsWith("```")) inCode = !inCode;
    if (!inCode) {
      const m = line.match(/^(#{1,4})\s+(.+)$/);
      if (m) {
        const title = line.trim();
        const level = getHeadingSemanticLevel(m[1].length, title);
        if (captured === null) {
          if (headingRe.test(title)) {
            targetLevel = level;
            captured = [line];
          }
          continue;
        }
        if (level <= targetLevel) break;
      }
    }
    if (captured !== null) captured.push(line);
  }
  return captured ? captured.join("\n") : null;
}

function get5AxisScoringTable(markdown) {
  const tables = parseMarkdownTables(markdown);
  for (const t of tables) {
    const header = t.rows[0].join(" ");
    if (/TCP/i.test(header) && /ETC/i.test(header) && /OES/i.test(header)) {
      return t;
    }
  }
  return null;
}

// ============================================================================
// TIER 1: FEATURE COVERAGE & COMPLETENESS (F1–F6, R1–R4)
// ============================================================================
console.log("\nExecuting Tier 1: Feature Coverage & Completeness...");

runner.run("Tier 1 (Feature Coverage)", "F1 / R1: Executive Framing & Systems Engineering Trilemma", () => {
  const execAbstract = getSectionContent(content, /^##\s+Executive Abstract/i);
  const sec1 = getSectionContent(content, /^##\s+1\.\s+Executive Framing/i);
  assert.ok(execAbstract && sec1, "Dossier must contain Executive Abstract and Section 1 Executive Framing.");
  const combinedSec1 = `${execAbstract}\n${sec1}`;
  assert.match(combinedSec1, /orchestration\s+expressiveness/i, "Section 1 must identify 'orchestration expressiveness'");
  assert.match(combinedSec1, /context\s+(window\s+)?(\/|\&|\+)?\s*token\s+(efficiency|preservation)/i, "Section 1 must identify context / token preservation");
  assert.match(combinedSec1, /verifiability|verification/i, "Section 1 must identify evidence verifiability");
  assert.match(combinedSec1, /signaling.*storage/i,
    "Executive Abstract / Section 1 must explain conflating IPC signaling with storage.");
});

runner.run("Tier 1 (Feature Coverage)", "F2 / R1: General Workflow & Graph Harnesses Audits", () => {
  const requiredGroup1 = [
    { name: "MetaGPT", sectionRe: /^###\s+2\.1\s+MetaGPT/i, concepts: [/SOP|Standard Operating Procedure/i, /Role/i, /Message Pool/i] },
    { name: "CrewAI", sectionRe: /^###\s+2\.2\s+CrewAI/i, concepts: [/Role-Playing/i, /Task/i, /Sequential|Hierarchical/i] },
    { name: "AutoGen / Swarm", sectionRe: /^###\s+2\.3\s+AutoGen/i, concepts: [/Conversational|Broadcast|GroupChat/i, /Function\s+Handoffs?|stateless\s+function\s+handoffs?/i] },
    { name: "LangGraph", sectionRe: /^###\s+2\.4\s+LangGraph/i, concepts: [/Statechart|Graph|DAG/i, /Checkpointer|State/i] }
  ];

  for (const h of requiredGroup1) {
    const sub = getSectionContent(content, h.sectionRe);
    assert.ok(sub, `Group 1 audit must include dedicated subsection for ${h.name}`);
    for (const c of h.concepts) {
      assert.match(sub, c, `${h.name} subsection must cover core concept: ${c.toString()}`);
    }
  }
});

runner.run("Tier 1 (Feature Coverage)", "F3 / R1: Autonomous Coding & SWE Harnesses Audits", () => {
  const requiredGroup2 = [
    { name: "Devin / Cognition Sol", sectionRe: /^###\s+3\.1\s+Devin/i, concepts: [/MicroVM|Firecracker|KVM/i, /Snapshot|Rollback/i] },
    { name: "Claude Code / SWE-agent", sectionRe: /^###\s+3\.2\s+Claude Code/i, concepts: [/Agent-Computer Interface|ACI/i, /Windowed|Diff/i] },
    { name: "Google Antigravity Native /teamwork", sectionRe: /^###\s+3\.3\s+Google Antigravity/i, concepts: [/teamwork/i, /Wakeup|Watchdog/i] },
    { name: "Agy-Squad Reference Baseline", sectionRe: /^###\s+3\.4\s+Agy-Squad/i, concepts: [/Pointer-Over-Wire/i, /Cryptographic Bundle|SHA-256/i, /RTK|Rust Token Killer/i, /WSL2/i] }
  ];

  for (const h of requiredGroup2) {
    const sub = getSectionContent(content, h.sectionRe);
    assert.ok(sub, `Group 2 audit must include dedicated subsection for ${h.name}`);
    for (const c of h.concepts) {
      assert.match(sub, c, `${h.name} subsection must cover core concept: ${c.toString()}`);
    }
  }
});

runner.run("Tier 1 (Feature Coverage)", "F4 / R2: 5-Axis Quantitative Evaluation Rubric Definitions", () => {
  const sec4_1 = getSectionContent(content, /^###\s+4\.1\s+Rubric Metric Definitions/i);
  assert.ok(sec4_1, "Dossier must contain Section 4.1 Rubric Metric Definitions.");
  const dimensions = [
    /Token\s*(&|\+)?\s*Context\s*Preservation|TCP/i,
    /Evidence\s*Traceability\s*(&|\+)?\s*Cryptographic\s*Proof|ETC/i,
    /Failure\s*Isolation\s*(&|\+)?\s*Blast\s*Radius|FIB/i,
    /Orchestration\s*Topology\s*Flexibility|OTF/i,
    /OS\s*(&|\+)?\s*Execution\s*Boundary\s*Safety|OES/i
  ];

  for (const dim of dimensions) {
    assert.match(sec4_1, dim, `Section 4.1 must explicitly define dimension: ${dim.toString()}`);
  }

  assert.match(sec4_1, /1\.0|1\/5/i, "Section 4.1 must define level 1.0 anchor");
  assert.match(sec4_1, /3\.0|3\/5/i, "Section 4.1 must define level 3.0 anchor");
  assert.match(sec4_1, /5\.0|5\/5/i, "Section 4.1 must define level 5.0 anchor");
});

runner.run("Tier 1 (Feature Coverage)", "F5 / R3: Formal Complexity Models & Empirical Protocol Tracing", () => {
  const sec5 = getSectionContent(content, /^##\s+5\.\s+Empirical Evidence/i);
  assert.ok(sec5, "Dossier must contain Section 5 Empirical Evidence & Protocol Tracing.");
  assert.match(sec5, /O\(.*(N\^2|M\^2|N\s*\*\s*M\^2).*\)/i, "Section 5 must formulate O(N^2) or O(N*M^2) conversational broadcast bloat");
  assert.match(sec5, /O\(.*(N\s*\*\s*\|?S\|?|M\s*\*\s*\|?S\|?|M\s*\*\s*L).*\)/i, "Section 5 must formulate structured state dictionary or SOP complexity");
  assert.match(sec5, /O\(.*(N|M\s*\*\s*P).*\)/i, "Section 5 must formulate O(N) or O(M*P) Pointer-Over-Wire complexity");

  assert.match(sec5, /Wire\s+(Overhead|Payload|Representation)/i, "Section 5 must discuss wire payload/overhead");
  assert.match(sec5, /bloat/i, "Section 5 must address token/context bloat");
  assert.match(sec5, /Transcript\s+(Volume|Size|Chatter)|Injected\s+Context\s+Bytes/i, "Section 5 must track transcript volume/bytes");
  assert.match(sec5, /Prompt\s+Cache/i, "Section 5 must address prompt cache hit rates/eviction");
  assert.match(sec5, /(500\s*(B|bytes|UTF-8\s*bytes)|<=\s*500)/i, "Section 5 must specify <= 500 B receipt ceiling");
});

runner.run("Tier 1 (Feature Coverage)", "F6 / R4: Synthesized Architectural Matrix & Trade-Offs", () => {
  const sec6 = getSectionContent(content, /^##\s+6\.\s+Synthesized Architectural Matrix/i);
  assert.ok(sec6, "Must include Section 6 Synthesized Architectural Matrix.");
  assert.match(sec6, /Pareto\s+Frontier/i, "Section 6 must articulate the Pareto frontier.");
  assert.match(sec6, /yield(s)?\*?\*?\s+to|Yield\s+Point/i, "Section 6 must articulate yield points.");
  assert.ok(/yield.*(Devin|microVM|virtualization)/is.test(sec6),
    "Section 6 must articulate yield point to Devin on hardware/microVM isolation.");
  assert.ok(/yield.*(LangGraph|cyclic|statechart|checkpoint)/is.test(sec6),
    "Section 6 must articulate yield point to LangGraph on arbitrary cyclic statecharts / HITL.");
  assert.ok(/yield.*(zero-config|onboarding|ad-hoc|Claude Code)/is.test(sec6),
    "Section 6 must articulate yield point to Claude Code / SWE-agent on zero-config onboarding / ad-hoc ergonomics.");

  // Section 6.3 Yield Points verification (microVM, cyclic statecharts, zero-config onboarding)
  const section6_3Match = content.match(/###\s*6\.3[^\n]*\n([\s\S]*?)(?=---\s*\n|###\s*6\.4|\n##\s*7)/i);
  assert.ok(section6_3Match, "Dossier must contain Section 6.3 Strategic Yield Points.");
  const section6_3Content = section6_3Match[1];
  assert.match(section6_3Content, /(Devin|microVM|virtualization)/i,
    "Section 6.3 must detail microVM virtualization yield point (Devin).");
  assert.match(section6_3Content, /(LangGraph|cyclic\s+statechart)/i,
    "Section 6.3 must detail cyclic statecharts yield point (LangGraph).");
  assert.match(section6_3Content, /(zero-config|onboarding|ad-hoc)/i,
    "Section 6.3 must explicitly detail Zero-Config Onboarding / Ad-Hoc Ergonomics yield point (Claude Code / SWE-agent).");

  // Table 6.1 Synthesized Comparative Architecture Matrix row verification
  const table6_1Match = content.match(/###\s*6\.1[^\n]*\n([\s\S]*?)(?=---\s*\n|###\s*6\.2)/i);
  assert.ok(table6_1Match, "Dossier must contain Section 6.1 Comparative Trade-Off Matrix.");
  const table6_1Content = table6_1Match[1];
  assert.match(table6_1Content, /(zero-config|onboarding|ad-hoc)/i,
    "Table 6.1 must contain an entry or row for Zero-Config Onboarding / Ad-Hoc Ergonomics.");
});

// ============================================================================
// TIER 2: BOUNDARY & FORMAT CHECKS
// ============================================================================
console.log("\nExecuting Tier 2: Boundary & Format Checks...");

runner.run("Tier 2 (Boundary & Format)", "Format: Publication Markdown Quality & Code Block Delimiter Parity", () => {
  // Check code block delimiters
  const matches = content.match(/```/g);
  assert.ok(matches && matches.length > 0, "Dossier must contain code blocks.");
  assert.equal(matches.length % 2, 0,
    "Code block backticks (```) must be evenly paired. Found " + matches.length + " markers.");
  
  // File size check: publication-grade comprehensive report should be >= 25 KB
  const byteSize = Buffer.byteLength(content, "utf8");
  assert.ok(byteSize >= 25000, `Publication dossier size (${byteSize} bytes) should be >= 25,000 bytes.`);
});

runner.run("Tier 2 (Boundary & Format)", "Boundary: Score Numeric Range Enforcement (1.0 to 5.0)", () => {
  const scoreTable = get5AxisScoringTable(content);
  assert.ok(scoreTable, "Could not locate 5-Axis Comparative Scoring Table.");

  // In scoreTable:
  // Row 0 is header, Row 1 is separator |---|
  // Row structure: [Harness, Operating Paradigm, TCP, ETC, FIB, OTF, OES, Composite, Normalized]
  for (let r = 2; r < scoreTable.rows.length; r++) {
    const row = scoreTable.rows[r];
    const harnessName = row[0].replace(/\*\*/g, "").trim();
    // columns 2 to 6 are the 5 dimension scores (TCP, ETC, FIB, OTF, OES)
    for (let col = 2; col <= 6; col++) {
      const valStr = row[col].replace(/\*\*/g, "").trim();
      const num = parseFloat(valStr);
      assert.ok(!isNaN(num), `Row '${harnessName}' column ${col} '${valStr}' must be a valid number.`);
      assert.ok(num >= 1.0 && num <= 5.0,
        `Score for ${harnessName} in dimension column ${col} (${num}) must be within [1.0, 5.0].`);
    }
  }
});

runner.run("Tier 2 (Boundary & Format)", "Boundary: Pointer-Over-Wire Receipt Budget (<= 500 Bytes)", () => {
  // Regex extracting verbatim code examples of receipts
  const receiptExamples = [
    ...content.matchAll(/`(READY\s+scratch\/[^\s`]+(?:\s+—\s+[^`]+)?)`/g),
    ...content.matchAll(/`(PARTIAL\s+scratch\/[^\s`]+(?:\s+—\s+[^`]+)?)`/g),
    ...content.matchAll(/`(NO_REPORT\s+—\s+[^`]+)`/g)
  ];

  assert.ok(receiptExamples.length >= 2, "Must show concrete verbatim examples of receipt lines.");

  for (const match of receiptExamples) {
    const receiptStr = match[1];
    const byteLen = Buffer.byteLength(receiptStr, "utf8");
    assert.ok(byteLen <= 500,
      `Receipt example '${receiptStr}' exceeds 500 bytes (is ${byteLen} bytes).`);
  }
});

runner.run("Tier 2 (Boundary & Format)", "Format: Pointer-Over-Wire Grammar Conformance", () => {
  // Grammar patterns
  assert.match(content, /READY\s+\S+\s+—/i, "Must illustrate READY <pointer> — <observation> receipt syntax");
  assert.match(content, /PARTIAL\s+\S+\s+—/i, "Must illustrate PARTIAL <pointer> — <observation> receipt syntax");
  assert.match(content, /NO_REPORT\s+—/i, "Must illustrate NO_REPORT — <reason> receipt syntax");
});

runner.run("Tier 2 (Boundary & Format)", "Format: Markdown Table Column Parity & Formatting", () => {
  const tables = parseMarkdownTables(content);
  assert.ok(tables.length >= 2, "Must contain at least 2 valid markdown tables.");
  for (const [idx, table] of tables.entries()) {
    const headerCols = table.rows[0].length;
    for (let r = 1; r < table.rows.length; r++) {
      assert.equal(table.rows[r].length, headerCols,
        `Table #${idx + 1} row ${r + 1} has ${table.rows[r].length} columns; expected ${headerCols}.`);
    }
  }
});

runner.run("Tier 2 (Boundary & Format)", "Format: Standard Markdown / GFM Table Pipe Escaping Integrity", () => {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      // Must not contain raw unescaped pipe inside $...$ in table rows
      const mathBlocks = line.match(/\$([^$]+)\$/g);
      if (mathBlocks) {
        for (const block of mathBlocks) {
          const inner = block.slice(1, -1);
          assert.ok(!/(^|[^\\])\|/.test(inner),
            `Line ${i + 1} contains unescaped pipe character inside math formula '${block}' in table row. Use \\vert instead of | in LaTeX formulas in tables.`);
        }
      }
    }
  }
});

// ============================================================================
// TIER 3: CROSS-FEATURE CONSISTENCY & INTERNAL COHERENCE
// ============================================================================
console.log("\nExecuting Tier 3: Cross-Feature Consistency & Internal Coherence...");

runner.run("Tier 3 (Cross-Feature Consistency)", "Parity: All 8 Audited Target Harnesses Scored Across All 5 Dimensions", () => {
  const scoreTable = get5AxisScoringTable(content);
  assert.ok(scoreTable, "Score table must be present.");

  // Names of all 8 required harnesses
  const expectedHarnesses = [
    { name: "MetaGPT", regex: /MetaGPT/i },
    { name: "CrewAI", regex: /CrewAI/i },
    { name: "AutoGen / Swarm", regex: /AutoGen.*Swarm|Swarm.*AutoGen/i },
    { name: "LangGraph", regex: /LangGraph/i },
    { name: "Devin / Cognition Sol", regex: /Devin|Cognition\s+Sol/i },
    { name: "Claude Code / SWE-agent", regex: /Claude\s+Code|SWE-agent/i },
    { name: "Google Antigravity Native /teamwork", regex: /Google\s+Antigravity|Antigravity.*teamwork/i },
    { name: "Agy-Squad Reference Baseline", regex: /Agy-Squad/i }
  ];

  const auditedRows = scoreTable.rows.slice(2).map(r => r[0].replace(/\*\*/g, "").trim());

  for (const expected of expectedHarnesses) {
    const matched = auditedRows.some(rowName => expected.regex.test(rowName));
    assert.ok(matched, `Score table must contain a row for ${expected.name}. Found rows: ${JSON.stringify(auditedRows)}`);
  }
});

runner.run("Tier 3 (Cross-Feature Consistency)", "Arithmetic: Composite Score Sum / Mean Verification", () => {
  const scoreTable = get5AxisScoringTable(content);
  assert.ok(scoreTable, "Score table must be present.");

  for (let r = 2; r < scoreTable.rows.length; r++) {
    const row = scoreTable.rows[r];
    const harness = row[0].replace(/\*\*/g, "").trim();
    // columns 2 to 6 are the 5 dimension scores
    const scores = [2, 3, 4, 5, 6].map(c => parseFloat(row[c].replace(/\*\*/g, "").trim()));
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / 5;

    // Col 7 is composite score (/25.0), Col 8 is normalized (/5.0)
    const compositeStr = row[7].replace(/\*\*/g, "").trim();
    const compositeVal = parseFloat(compositeStr);
    assert.ok(!isNaN(compositeVal), `Composite score for ${harness} ('${compositeStr}') is invalid.`);

    const matchesSum = Math.abs(compositeVal - sum) <= 0.15;
    assert.ok(matchesSum,
      `Composite score ${compositeVal} for ${harness} must match sum of dimensions (${sum.toFixed(1)}).`);

    if (row.length > 8) {
      const normStr = row[8].replace(/\*\*/g, "").trim();
      const normVal = parseFloat(normStr);
      assert.ok(!isNaN(normVal), `Normalized score for ${harness} ('${normStr}') is invalid.`);
      const matchesAvg = Math.abs(normVal - avg) <= 0.15;
      assert.ok(matchesAvg,
        `Normalized score ${normVal} for ${harness} must match average (${avg.toFixed(2)}).`);
    }
  }
});

runner.run("Tier 3 (Cross-Feature Consistency)", "Coherence: Rubric Anchor Consistency & Justification Backing", () => {
  const sec4_3 = getSectionContent(content, /^###\s+4\.3\s+Detailed Architectural Justifications/i);
  assert.ok(sec4_3, "Dossier must contain Section 4.3 Detailed Architectural Justifications.");
  assert.ok(/Agy-Squad.*(5\.0|5\/5).*SHA-256|SHA-256.*(5\.0|5\/5)/is.test(sec4_3) ||
            /Evidence Traceability.*5\.0.*(cryptographic|SHA-256|digest)/is.test(sec4_3) ||
            /ETC\s*\(5\.0\).*SHA-256/is.test(sec4_3),
    "Section 4.3 Agy-Squad 5.0 Evidence Traceability score must cite cryptographic SHA-256 bundling.");

  assert.ok(/Devin.*(5\.0|5\/5).*(microVM|Firecracker|KVM)/is.test(sec4_3) ||
            /Execution Safety.*5\.0.*(microVM|Firecracker|KVM)/is.test(sec4_3) ||
            /OES\s*\(5\.0\).*(microVM|Firecracker|KVM)/is.test(sec4_3),
    "Section 4.3 Devin 5.0 OS Safety score must cite microVM / Firecracker isolation.");
});

runner.run("Tier 3 (Cross-Feature Consistency)", "Coherence: Architectural Yield Points Alignment", () => {
  const sec6_3 = getSectionContent(content, /^###\s+6\.3\b/i);
  assert.ok(sec6_3, "Section 6.3 must exist for yield point alignment.");
  assert.ok(/yield.*(Devin|microVM|virtualization)/is.test(sec6_3),
    "Section 6.3 must align on microVM isolation yield point.");
  assert.ok(/yield.*(LangGraph|cyclic|statechart|checkpoint)/is.test(sec6_3),
    "Section 6.3 must align on LangGraph cyclic statechart yield point.");
  assert.ok(/yield.*(zero-config|onboarding|ad-hoc|Claude Code)/is.test(sec6_3),
    "Section 6.3 must align on zero-config onboarding / ad-hoc ergonomics yield point.");
});

// ============================================================================
// TIER 4: STRUCTURAL CITATION & DOSSIER COVERAGE VALIDATION
// ============================================================================
console.log("\nExecuting Tier 4: Structural Citation & Dossier Coverage Validation (Pattern & File Presence)...");

runner.run("Tier 4 (Structural & Citations)", "Citation Coverage: November 8, 2026 Empirical Benchmark Metrics", () => {
  const sec5_2 = getSectionContent(content, /^###\s+5\.2\s+Empirical Protocol Telemetry/i);
  assert.ok(sec5_2, "Dossier must contain Section 5.2 Empirical Protocol Telemetry.");
  const requiredDataPoints = [
    { label: "Wall clock time (26m 19s vs 6m 15s or 1579s vs 375s)", regex: /26m\s*19s.*6m\s*15s|1,?579.*375/s },
    { label: "Subagents count (8 vs 3)", regex: /8\s+(agents|subagents).*3\s+(agents|subagents)|8.*vs.*3/i },
    { label: "Transcript steps reduction (645 vs 64)", regex: /645.*64/ },
    { label: "Assistant LLM turns reduction (321 vs 26)", regex: /321.*26/ },
    { label: "Tool calls reduction (302 vs 32)", regex: /302.*32/ },
    { label: "Transcript size reduction (817.4 KB vs 148.2 KB)", regex: /817(\.4)?\s*KB.*148(\.2)?\s*KB/i },
    { label: "Parent wakeups / injected bytes (4,940 B vs 249 B)", regex: /4,?940.*249/ },
    { label: "Teardown drift (41 files vs 0 files)", regex: /41\s+files.*0\s+files|41.*207\.9.*0/i }
  ];

  for (const dp of requiredDataPoints) {
    assert.match(sec5_2, dp.regex, `Section 5.2 empirical benchmark table must ground metric: ${dp.label}`);
  }
});

runner.run("Tier 4 (Structural & Citations)", "Fixture Reference: Event-Relay Fixture (gateway/ and worker/)", () => {
  const sec5_2 = getSectionContent(content, /^###\s+5\.2\s+Empirical Protocol Telemetry/i);
  assert.ok(sec5_2, "Section 5.2 must exist.");
  assert.match(sec5_2, /gateway/i, "Section 5.2 must cite event-relay fixture component: gateway/");
  assert.match(sec5_2, /worker/i, "Section 5.2 must cite event-relay fixture component: worker/");
  assert.match(sec5_2, /6-defect|six-defect/i, "Section 5.2 must cite the 6-defect benchmark fixture");
});

runner.run("Tier 4 (Structural & Citations)", "Codebase Verification: Referenced Core Implementation Files Physically Exist", () => {
  const referencedFiles = [
    "mcp/dispatch.mjs",
    "mcp/handoffs.mjs",
    "bin/agy-squad.mjs"
  ];

  for (const file of referencedFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    assert.ok(fs.existsSync(fullPath), `Referenced codebase file '${file}' must physically exist in workspace.`);
    assert.match(content, new RegExp(file.replace(/\./g, "\\."), "i"),
      `Dossier must cite implementation file '${file}'.`);
  }
});

runner.run("Tier 4 (Structural & Citations)", "Standard & Ledger: Architectural Decision Citations (L1–L43)", () => {
  assert.match(content, /L41/i, "Dossier must cite decision L41 (governed teardown / lifecycle cleanup contract).");
  assert.match(content, /L1.*L4[13]|Architectural\s+Decision\s+Ledger/i,
    "Dossier must cite the Architectural Decision Ledger (L1–L41 / L1–L43).");
  const ledgerPath = path.resolve(process.cwd(), "docs/plans/LEDGER.md");
  assert.ok(fs.existsSync(ledgerPath), "docs/plans/LEDGER.md must exist.");
  const ledger = fs.readFileSync(ledgerPath, "utf8").replace(/\r\n/g, "\n");
  assert.match(ledger, /^\|\s*L17\s*\|.*\|\s*Retired\b/im, "LEDGER.md must mark L17 retired.");
  assert.match(ledger, /^\|\s*L42\s*\|.*\|\s*Active\b/im, "LEDGER.md must list L42 Active.");
  assert.match(ledger, /^\|\s*L43\s*\|.*\|\s*Active\b/im, "LEDGER.md must list L43 Active.");
  const crlfSection = getSectionContent("## 1. Executive Framing\r\nAlpha\r\n### 1.1 Sub\r\nBeta\r\n## 2. Next\r\n", /^##\s+1\.\s+Executive Framing/i);
  assert.ok(crlfSection && /Alpha/.test(crlfSection) && /Beta/.test(crlfSection) && !/## 2\./.test(crlfSection),
    "getSectionContent must normalize CRLF checkouts consistently.");
});

// Final summary and process exit
runner.summary();
