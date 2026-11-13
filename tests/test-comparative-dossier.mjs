#!/usr/bin/env node

/**
 * Automated Test Suite: Comparative Multi-Agent Harness Architecture Dossier
 * 
 * Verifies all requirements (R1–R4, F1–F6) from ORIGINAL_REQUEST.md and PROJECT.md:
 * - Tier 1: Feature Coverage & Completeness (R1, R2, R3, R4)
 * - Tier 2: Boundary & Format Checks (Score bounds, receipt byte budget, markdown integrity)
 * - Tier 3: Cross-Feature Consistency & Internal Coherence (Score parity, rubric anchors, yield points)
 * - Tier 4: Real-World Workload & Empirical Citation Validation (Benchmark metrics, codebase paths, L1–L41)
 * 
 * Standard: Agy-Squad PR Review Standard v1.3.0 & Architectural Decision Ledger (L1–L41)
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
      "Tier 4 (Real-World & Citations)": { passed: 0, failed: 0 }
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
      console.log("SUCCESS: All dossier verification tests passed cleanly (100% compliance).");
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

const content = fs.readFileSync(DOSSIER_PATH, "utf8");

// Helpers for Parsing & Inspection
function findSections(markdown) {
  const headings = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,4})\s+(.+)$/);
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
  const lines = markdown.split("\n");
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
  assert.ok(/executive\s+(abstract|summary|framing)|systems\s+engineering\s+trilemma/i.test(content),
    "Dossier must contain an Executive Abstract / Systems Engineering Trilemma section.");
  
  // Trilemma components
  assert.match(content, /orchestration\s+expressiveness/i, "Must identify 'orchestration expressiveness'");
  assert.match(content, /context\s+(window\s+)?(\/|\&|\+)?\s*token\s+(efficiency|preservation)/i, "Must identify context / token preservation");
  assert.match(content, /verifiability|verification/i, "Must identify evidence verifiability");

  // Conflation of IPC signaling wire with evidentiary storage
  assert.match(content, /signaling\s+(channel|wire).*storage/i,
    "Must explain the core systems flaw: conflating IPC signaling channel with storage channel.");
});

runner.run("Tier 1 (Feature Coverage)", "F2 / R1: General Workflow & Graph Harnesses Audits", () => {
  const requiredGroup1 = [
    { name: "MetaGPT", regex: /MetaGPT/i, concepts: [/SOP|Standard Operating Procedure/i, /Role/i, /Message Pool/i] },
    { name: "CrewAI", regex: /CrewAI/i, concepts: [/Role-Playing/i, /Task/i, /Sequential|Hierarchical/i] },
    { name: "AutoGen / Swarm", regex: /AutoGen.*Swarm|Swarm.*AutoGen/i, concepts: [/Conversational|Broadcast|GroupChat/i, /Speaker Selection|Hand-off/i] },
    { name: "LangGraph", regex: /LangGraph/i, concepts: [/Statechart|Graph|DAG/i, /Checkpointer|State/i] }
  ];

  for (const h of requiredGroup1) {
    assert.match(content, h.regex, `Group 1 audit must include ${h.name}`);
    for (const c of h.concepts) {
      assert.match(content, c, `${h.name} audit must cover core concept: ${c.toString()}`);
    }
  }
});

runner.run("Tier 1 (Feature Coverage)", "F3 / R1: Autonomous Coding & SWE Harnesses Audits", () => {
  const requiredGroup2 = [
    { name: "Devin / Cognition Sol", regex: /Devin|Cognition.*Sol/i, concepts: [/MicroVM|Firecracker|KVM/i, /Snapshot|Rollback/i] },
    { name: "Claude Code / SWE-agent", regex: /Claude Code|SWE-agent/i, concepts: [/Agent-Computer Interface|ACI/i, /Windowed|Diff/i] },
    { name: "Google Antigravity Native /teamwork", regex: /Google Antigravity|Antigravity.*teamwork/i, concepts: [/teamwork/i, /Wakeup|Watchdog/i] },
    { name: "Agy-Squad Reference Baseline", regex: /Agy-Squad/i, concepts: [/Pointer-Over-Wire/i, /Cryptographic Bundle|SHA-256/i, /RTK|Rust Token Killer/i, /WSL2/i] }
  ];

  for (const h of requiredGroup2) {
    assert.match(content, h.regex, `Group 2 audit must include ${h.name}`);
    for (const c of h.concepts) {
      assert.match(content, c, `${h.name} audit must cover core concept: ${c.toString()}`);
    }
  }
});

runner.run("Tier 1 (Feature Coverage)", "F4 / R2: 5-Axis Quantitative Evaluation Rubric Definitions", () => {
  const dimensions = [
    /Token\s*(&|\+)?\s*Context\s*Preservation|TCP/i,
    /Evidence\s*Traceability\s*(&|\+)?\s*Cryptographic\s*Proof|ETC/i,
    /Failure\s*Isolation\s*(&|\+)?\s*Blast\s*Radius|FIB/i,
    /Orchestration\s*Topology\s*Flexibility|OTF/i,
    /OS\s*(&|\+)?\s*Execution\s*Boundary\s*Safety|OES/i
  ];

  for (const dim of dimensions) {
    assert.match(content, dim, `Rubric must explicitly define dimension: ${dim.toString()}`);
  }

  // Anchor levels 1.0 to 5.0
  assert.match(content, /1\.0|1\/5/i, "Rubric must define level 1.0 anchor");
  assert.match(content, /3\.0|3\/5/i, "Rubric must define level 3.0 anchor");
  assert.match(content, /5\.0|5\/5/i, "Rubric must define level 5.0 anchor");
});

runner.run("Tier 1 (Feature Coverage)", "F5 / R3: Formal Complexity Models & Empirical Protocol Tracing", () => {
  // Complexity formulas
  assert.match(content, /O\(.*(N\^2|M\^2|N\s*\*\s*M\^2).*\)/i, "Must formulate O(N^2) or O(N*M^2) conversational broadcast bloat");
  assert.match(content, /O\(.*(N\s*\*\s*\|?S\|?|M\s*\*\s*\|?S\|?|M\s*\*\s*L).*\)/i, "Must formulate structured state dictionary or SOP complexity");
  assert.match(content, /O\(.*(N|M\s*\*\s*P).*\)/i, "Must formulate O(N) or O(M*P) Pointer-Over-Wire complexity");

  // Formal communication telemetry concepts
  assert.match(content, /Wire\s+(Overhead|Payload|Representation)/i, "Must discuss wire payload/overhead");
  assert.match(content, /bloat/i, "Must address token/context bloat");
  assert.match(content, /Transcript\s+(Volume|Size|Chatter)|Injected\s+Context\s+Bytes/i, "Must track transcript volume/bytes");
  assert.match(content, /Prompt\s+Cache/i, "Must address prompt cache hit rates/eviction");

  // Pointer-Over-Wire receipt ceiling <= 500 B
  assert.match(content, /(500\s*(B|bytes|UTF-8\s*bytes)|<=\s*500)/i, "Must specify <= 500 B receipt ceiling");
});

runner.run("Tier 1 (Feature Coverage)", "F6 / R4: Synthesized Architectural Matrix & Trade-Offs", () => {
  // Section existence
  assert.match(content, /Synthesized\s+Architectural\s+Matrix|Comparative\s+Trade-Off\s+Matrix/i,
    "Must include a Synthesized Architectural Matrix section.");
  
  // Pareto frontier and yield points
  assert.match(content, /Pareto\s+Frontier/i, "Must articulate the Pareto frontier.");
  assert.match(content, /yield(s)?\*?\*?\s+to|Yield\s+Point/i, "Must explicitly articulate where Agy-Squad yields to alternative paradigms.");

  // Specific yield points across narrative
  assert.ok(/yield.*(Devin|microVM|virtualization)/is.test(content),
    "Must articulate yield point to Devin on hardware/microVM isolation.");
  assert.ok(/yield.*(LangGraph|cyclic|statechart|checkpoint)/is.test(content),
    "Must articulate yield point to LangGraph on arbitrary cyclic statecharts / HITL.");
  assert.ok(/yield.*(zero-config|onboarding|ad-hoc|Claude Code)/is.test(content),
    "Must articulate yield point to Claude Code / SWE-agent on zero-config onboarding / ad-hoc ergonomics.");

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
  const lines = content.split("\n");
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
  // Agy-Squad's score of 5.0 in Evidence Traceability must be backed by SHA-256 bundling in narrative
  assert.ok(/Agy-Squad.*(5\.0|5\/5).*SHA-256|SHA-256.*(5\.0|5\/5)/is.test(content) ||
            /Evidence Traceability.*5\.0.*(cryptographic|SHA-256|digest)/is.test(content) ||
            /ETC\s*\(5\.0\).*SHA-256/is.test(content),
    "Agy-Squad's 5.0 score in Evidence Traceability must cite cryptographic SHA-256 bundling.");

  // Devin's score of 5.0 in Execution Safety must be backed by MicroVM/Firecracker/KVM
  assert.ok(/Devin.*(5\.0|5\/5).*(microVM|Firecracker|KVM)/is.test(content) ||
            /Execution Safety.*5\.0.*(microVM|Firecracker|KVM)/is.test(content) ||
            /OES\s*\(5\.0\).*(microVM|Firecracker|KVM)/is.test(content),
    "Devin's 5.0 score in OS Safety must cite microVM / Firecracker isolation.");
});

runner.run("Tier 3 (Cross-Feature Consistency)", "Coherence: Architectural Yield Points Alignment", () => {
  // Check that the yield points in synthesized matrix align with deep dive limitations
  assert.ok(/yield.*(Devin|microVM|virtualization)/is.test(content),
    "Synthesis matrix must align with deep dive regarding microVM isolation yield point.");
  assert.ok(/yield.*(LangGraph|cyclic|statechart|checkpoint)/is.test(content),
    "Synthesis matrix must align with deep dive regarding LangGraph cyclic statechart yield point.");
  assert.ok(/yield.*(zero-config|onboarding|ad-hoc|Claude Code)/is.test(content),
    "Synthesis matrix must align with deep dive regarding zero-config onboarding / ad-hoc ergonomics yield point.");
});

// ============================================================================
// TIER 4: REAL-WORLD WORKLOAD & EMPIRICAL CITATION VALIDATION
// ============================================================================
console.log("\nExecuting Tier 4: Real-World Workload & Empirical Citation Validation...");

runner.run("Tier 4 (Real-World & Citations)", "Grounded Benchmark: November 8, 2026 Empirical Benchmark Metrics", () => {
  // Key data points from the benchmark on 6-defect event-relay fixture
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
    assert.match(content, dp.regex, `Empirical benchmark table must ground metric: ${dp.label}`);
  }
});

runner.run("Tier 4 (Real-World & Citations)", "Fixture Reference: Event-Relay Fixture (gateway/ and worker/)", () => {
  assert.match(content, /gateway/i, "Must cite event-relay fixture component: gateway/");
  assert.match(content, /worker/i, "Must cite event-relay fixture component: worker/");
  assert.match(content, /6-defect|six-defect/i, "Must cite the 6-defect benchmark fixture");
});

runner.run("Tier 4 (Real-World & Citations)", "Codebase Verification: Referenced Core Implementation Files Physically Exist", () => {
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

runner.run("Tier 4 (Real-World & Citations)", "Standard & Ledger: Architectural Decision Citations (L1–L41)", () => {
  assert.match(content, /L41/i, "Must cite decision L41 (governed teardown / lifecycle cleanup contract).");
  assert.match(content, /L1.*L41|Architectural\s+Decision\s+Ledger/i,
    "Must cite the Architectural Decision Ledger (L1–L41).");
});

// Final summary and process exit
runner.summary();
