# PR #3 Option B Remediation: Integrity-Role Separation and Host Enforcement

**Status:** Proposed patch plan — not applied in this session
**Target:** `feat/squad-alignment` at `f2ad744a553f1a938ee8128a2f5d1dfad1d9a9b8`
**Base:** `rebuild/wsl-dispatch` at `6708c35fabf3254ea8a8109c51511b7237fe6e28`
**Governing review:** [`docs/reviews/pr3-squad-alignment-full-review.md`](../reviews/pr3-squad-alignment-full-review.md) (Revision 2, Addendum A)
**Governing standard:** Agy-Squad PR Review Standard `v1.3.0`

This document is the implementation plan for the review's **Option B**: keep the layered adversarial coverage, but correct the roles, verdicts, lifecycle, enforcement, and audit coverage. It is written for a follow-up DSH/WSL2 session. Apply the patches in order; do not merge PR #3 until the acceptance test in §11 passes.

The plan is deliberately split into **code patches** (P1–P6), **documentation/ledger patches** (P7), and **host-boundary work** (P8). P8 cannot be completed by editing this repository alone; it requires a host hook or launcher change and must not be claimed as fixed until it is verified.

---

## 0. Target contract

| Concept | Owner | Verdict | Report field |
| --- | --- | --- | --- |
| Content acceptance | Working squad lead (reviewer/parent) | `PASS` / `FAIL` / `BLOCKED` | `Content Verdict: PASS` (or `Verdict: PASS`) |
| Integrity audit | Independent integrity auditor | `CLEAN` / `INTEGRITY VIOLATION` | `Integrity Verdict: CLEAN` |
| Post-audit re-review | Working squad lead | `PASS` only, bound to the integrity report hash | `Post-Audit Re-Review: PASS <integrity-sha256>` |
| Integrity warning | Every worker/auditor brief | Enforced by the auditor + hard block, not prose alone | `MANDATORY INTEGRITY WARNING` |

**Lifecycle:**

1. Working cohort completes. The working lead writes a **provisional** content verdict and a synthesis.
2. The independent integrity audit runs. It returns `CLEAN` or `INTEGRITY VIOLATION` and records `Target Squad`.
3. If `INTEGRITY VIOLATION`: acceptance stops. Record the violation, reject the work, and require a re-run. No advisory downgrade.
4. If `CLEAN`: the working lead **re-reviews the final artifacts** and writes `Post-Audit Re-Review: PASS <integrity-sha256>` plus the final `Content Verdict: PASS`.
5. `bundleReports` requires: content `PASS`, integrity `CLEAN`, integrity report hash, a matching target, and the lead’s post-audit re-review bound to that hash.
6. `verifyBundle` rechecks the integrity report presence and hash; a missing report is a failure.
7. `pruneReports` respects a `retainReports` pin; the documented `--keep-reports` flag actually exists.

**Compatibility:** this is a pre-merge breaking change. Bundles without `bundleVersion: 2` are rejected with a clear error and must be regenerated. Tests that still use `Verdict: PASS` without a dedicated line are updated in P6. Do not add a silent legacy fallback: it would reopen the compound-verdict hole.

**Naming:** keep the existing `adversarial_l1`, `adversarial_flat`, and `adversarial_review` IDs for PR #3 compatibility, but treat them as the **integrity** cohort. Add `integrity_*` aliases only after the role correction lands; do not rename in the same patch.

---

## 1. Patch map

| Patch | Files | Fixes | Depends on | Risk |
| --- | --- | --- | --- | --- |
| P1 | `mcp/verdicts.mjs` (new), `mcp/handoffs.mjs` import/readers | `RUN-PR3-01`, `ARCH-PR3-05` | — | Low; new module |
| P2 | `mcp/handoffs.mjs` bundle/verify/prune | `SVC-PR3-01`, `SVC-PR3-03`, `RUN-PR3-02`, `ARCH-PR3-03`, `SVC-PR3-02` | P1 | High; changes bundle schema |
| P3 | `mcp/briefs.mjs` | `ARCH-PR3-05`, `SKILL-PR3-03`, `RUN-PR3-05` | — | Medium; prompt budgets |
| P4 | `mcp/dispatch.mjs` | `ARCH-PR3-05`, `MCP-PR3-01` | P3 | Medium |
| P5 | `bin/agy-squad.mjs`, `mcp/handoffs.mjs` CLI | `SCRIPT-PR3-01`, `MCP-PR3-02`, `SVC-PR3-02` | P2 | Medium |
| P6 | `tests/` | `TEST-PR3-01`, `TEST-PR3-03` | P1–P5 | Medium |
| P7 | `docs/`, `.agents/skills/`, ledger, PR body | `DOC-PR3-01`, `DOC-PR3-03`, `DOC-PR3-04`, `SKILL-PR3-01`, `SKILL-PR3-02` | P1–P6 | Low |
| P8 | Host hook / launcher | `ARCH-PR3-04`, `ARCH-PR3-02` | P3–P6 | External |

**Apply order:** P1 → P2 → P3 → P4 → P5 → P6 → P7. P8 is tracked separately.

---

## 2. P1 — Strict verdict module

### 2.1 New file: `mcp/verdicts.mjs`

~~~js
const CONTENT_VERDICTS = new Set(["PASS", "FAIL", "BLOCKED"]);
const INTEGRITY_VERDICTS = new Set(["CLEAN", "INTEGRITY VIOLATION"]);
const INTEGRITY_ALIASES = new Map([["CLEAR", "CLEAN"]]);

function stripCode(markdown) {
  return markdown
    .replace(/(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g, "")
    .replace(/(`+)([^\r\n]*?)\1/g, " ");
}

function parseExactLines(markdown, label, allowed) {
  const labelRe = new RegExp(`^\\s*(?:[*_]{1,3})?\\s*${label}\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*(?:[*_]{1,3})?\\s*${label}\\s*:\\s*(?:[*_]{1,3})?\\s*([A-Z][A-Z ]*?)\\s*(?:[*_]{1,3})?\\s*$`,
    "i"
  );
  const found = new Set();
  for (const line of markdown.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const match = exactRe.exec(line);
    if (!match) {
      throw new Error(`${label} must be exactly one of: ${[...allowed].join(", ")} on its own line; qualifiers and compound verdicts are not allowed.`);
    }
    const raw = match[1].trim().replace(/\s+/g, " ").toUpperCase();
    const value = INTEGRITY_ALIASES.get(raw) ?? raw;
    if (!allowed.has(value)) {
      throw new Error(`${label} has unsupported verdict '${raw}'.`);
    }
    found.add(value);
  }
  if (found.size === 0) throw new Error(`${label} is missing.`);
  if (found.size > 1) throw new Error(`${label} has conflicting verdicts.`);
  return [...found][0];
}

function collectContentTokens(markdown) {
  const found = new Set();
  for (const line of markdown.split(/\r?\n/)) {
    for (const m of line.matchAll(
      /(?:^|\b)(?:verdict|status|result|check|disposition|outcome)[*_\s]*(?:[:—–-]|\bis\b)[*_\s]*(PASS|FAIL|BLOCKED)(?![-\w])/g
    )) {
      found.add(m[1]);
    }
    for (const m of line.matchAll(
      /(?:^\s*(?:(?:#+|>|[*+-]|\d+[.)])\s*)*|[:|—–][*_\s]*)[*_]*(PASS|FAIL|BLOCKED)[*_]*(?![-\w])/g
    )) {
      found.add(m[1]);
    }
  }
  return found;
}

function readContentVerdict(markdown) {
  const clean = stripCode(markdown);
  const exact = parseExactLines(clean, "(?:Content\\s+)?Verdict", CONTENT_VERDICTS);
  const all = new Set([exact, ...collectContentTokens(clean)]);
  if (all.size !== 1 || !all.has("PASS")) {
    throw new Error("Content verdict must be exactly PASS, with no conflicting verdict tokens.");
  }
  return "PASS";
}

function readIntegrityVerdict(markdown) {
  return parseExactLines(stripCode(markdown), "Integrity\\s+Verdict", INTEGRITY_VERDICTS);
}

function readPostAuditReReview(markdown) {
  const clean = stripCode(markdown);
  const re = /^\s*(?:[*_]{1,3})?\s*Post-Audit Re-Review\s*:\s*(?:[*_]{1,3})?\s*(PASS)\s+([0-9a-f]{64})\s*(?:[*_]{1,3})?\s*$/gim;
  const found = new Set();
  for (const m of clean.matchAll(re)) found.add(`${m[1].toUpperCase()} ${m[2]}`);
  if (found.size !== 1) {
    throw new Error("Post-Audit Re-Review must record exactly one `PASS <integrity-sha256>` line.");
  }
  return [...found][0];
}

export {
  CONTENT_VERDICTS,
  INTEGRITY_VERDICTS,
  readContentVerdict,
  readIntegrityVerdict,
  readPostAuditReReview,
  stripCode
};
~~~

### 2.2 `mcp/handoffs.mjs` imports and readers

At the top of `mcp/handoffs.mjs`, add:

~~~js
import {
  readContentVerdict,
  readIntegrityVerdict,
  readPostAuditReReview,
  stripCode
} from "./verdicts.mjs";
~~~

Replace `readSynthesis` with:

~~~js
function readSynthesis(root, report, verifiedDirs) {
  const bytes = readEvidence(root, report, verifiedDirs);
  const markdown = decodeUtf8(bytes, report);
  return { bytes, markdown, verdict: readContentVerdict(markdown) };
}
~~~

Add:

~~~js
function readIntegrityReport(root, report, verifiedDirs) {
  const bytes = readEvidence(root, report, verifiedDirs);
  const markdown = decodeUtf8(bytes, report);
  const verdict = readIntegrityVerdict(markdown);
  const target = /^\s*(?:[*_]{1,3})?\s*Target Squad\s*:\s*(?:[*_]{1,3})?\s*([A-Za-z0-9._:-]+)\s*$/m
    .exec(stripCode(markdown))?.[1];
  if (!target) throw new Error("Integrity report must record `Target Squad: <squadId>`.");
  return { bytes, markdown, verdict, targetSquad: target, sha256: sha256(bytes) };
}
~~~

**Why this parser is stricter:** it rejects `Verdict: PASS with …`, `Verdict: CONDITIONAL PASS`, `Verdict: CLEAN` in a content role, `Integrity Verdict: PASS`, multiple conflicting verdict lines, and verdicts hidden in fenced code. It still catches a conflicting `FAIL` in a `Secondary check: FAIL` line via `collectContentTokens`. `CLEAR` is accepted only as an integrity alias and normalized to `CLEAN`; reports should emit `CLEAN`.

---

## 3. P2 — Bundle lifecycle, hard block, target binding, retention

### 3.1 New bundle record shape

~~~json
{
  "workspace": "/workspace",
  "squadId": "harness_comparative_audit",
  "verdict": "PASS",
  "integrityVerdict": "CLEAN",
  "integrityReport": "scratch/agy-squad/squad-harness_comparative_audit/integrity/report.md",
  "leadReReview": {
    "verdict": "PASS",
    "integritySha256": "<sha256 of the integrity report>"
  },
  "retainReports": true,
  "verifiedFiles": { "path": "sha256" },
  "assignments": [
    { "conversationId": "...", "report": "scratch/.../specialist-1/report.md" }
  ],
  "handoffs": [
    { "sender": "...", "message": "READY scratch/... — ..." }
  ]
}
~~~

`leadReReview` is optional as an input object; the authoritative binding is the `Post-Audit Re-Review: PASS <sha>` line in the lead synthesis. The record object is a convenience for callers and is verified against the report.

### 3.2 Replace `bundleReports`

~~~js
function bundleReports(root, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid bundle record.");
  }
  const {
    squadId,
    verdict,
    verifiedFiles,
    integrityVerdict,
    integrityReport,
    retainReports
  } = record;
  const isIntegritySquad = squadId === "adversarial_review" || squadId === "integrity_review";
  if (!isIntegritySquad && verdict !== "PASS") {
    throw new Error("Only independently passing cohorts are eligible for bundling.");
  }
  const verifiedDirs = new Set();
  const rootPrefix = resolveReportRoot(record);
  const assignments = inspectReports(root, record, verifiedDirs);
  if (
    assignments.some(
      ({ status, report }, index) => status !== "READY" || report !== reportPath(squadId, index + 1, rootPrefix)
    )
  ) {
    throw new Error("Bundling requires a READY handoff from each recorded specialist in its compiled slot.");
  }
  const synthesisSlot = reportPath(squadId, undefined, rootPrefix);
  const relative = bundlePath(squadId, rootPrefix);
  if (
    [...assignments.map(({ report }) => report), synthesisSlot, relative].some(report =>
      Object.hasOwn(verifiedFiles ?? {}, report)
    )
  ) {
    throw new Error("Record final work inputs in verifiedFiles. The bundle hashes the loose reports separately.");
  }
  verifyFiles(root, verifiedFiles, verifiedDirs);

  let content;
  let integrity;
  let reReview;
  if (isIntegritySquad) {
    const integritySlot = integrityReport ?? synthesisSlot;
    integrity = readIntegrityReport(root, integritySlot, verifiedDirs);
    if (integrity.verdict === "INTEGRITY VIOLATION") {
      throw new Error("Acceptance blocked: integrity violation recorded. Reject the cohort and re-run.");
    }
  } else {
    if (integrityVerdict !== "CLEAN" && integrityVerdict !== "CLEAR") {
      throw new Error("Acceptance blocked: an integrity verdict of CLEAN is required before content acceptance.");
    }
    if (!integrityReport) {
      throw new Error("Acceptance blocked: integrity report missing. Run the integrity audit before bundling.");
    }
    integrity = readIntegrityReport(root, integrityReport, verifiedDirs);
    if (integrity.verdict !== "CLEAN") {
      throw new Error("Acceptance blocked: integrity verdict is not CLEAN.");
    }
    if (integrity.targetSquad !== squadId) {
      throw new Error(`Acceptance blocked: integrity report targets '${integrity.targetSquad}', not '${squadId}'.`);
    }
    content = readSynthesis(root, synthesisSlot, verifiedDirs);
    if (content.verdict !== "PASS" || content.verdict !== verdict) {
      throw new Error("Synthesis report must record an unambiguous content PASS verdict.");
    }
    reReview = readPostAuditReReview(content.markdown);
    if (!reReview.endsWith(integrity.sha256)) {
      throw new Error("Acceptance blocked: lead post-audit re-review does not reference this integrity report.");
    }
  }

  const reports = assignments.map(({ report, bytes }) => {
    const markdown = decodeUtf8(bytes, report);
    return { path: report, sha256: sha256(bytes), markdown };
  });
  const integritySlot = integrityReport ?? synthesisSlot;
  const bundlePayload = Buffer.from(
    JSON.stringify(
      {
        bundleVersion: 2,
        kind: isIntegritySquad ? "integrity" : "content",
        squadId,
        ...(content ? { verdict: content.verdict, synthesis: sha256(content.bytes) } : {}),
        integrityVerdict: integrity.verdict,
        integrity: { path: integritySlot, sha256: integrity.sha256, targetSquad: integrity.targetSquad },
        ...(reReview ? { leadReReview: { verdict: "PASS", integritySha256: integrity.sha256 } } : {}),
        retainReports: Boolean(retainReports),
        verifiedFiles,
        reports
      },
      null,
      2
    ) + "\n"
  );
  publish(root, relative, bundlePayload, true, verifiedDirs);
  return {
    path: relative,
    sha256: sha256(bundlePayload),
    integritySha256: integrity.sha256,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h }))
  };
}
~~~

### 3.3 Replace `verifyBundleInternal`

~~~js
function verifyBundleInternal(root, relative, acceptedHash) {
  const verifiedDirs = new Set();
  const contents = readFile(root, relative, verifiedDirs);
  const digest = sha256(contents);
  if (acceptedHash !== undefined && digest !== acceptedHash) {
    throw new Error("Bundle differs from the primary's accepted digest.");
  }
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid bundle JSON object.");
  }
  if (parsed.bundleVersion !== 2) {
    throw new Error("Legacy bundle format. Regenerate the bundle with bundleVersion 2 before verification.");
  }
  const { squadId, kind, verdict, synthesis, verifiedFiles, reports, integrityVerdict, integrity } = parsed;
  if (kind !== "content" && kind !== "integrity") {
    throw new Error("Bundle kind must be content or integrity.");
  }
  const rootPrefix = resolveReportRoot(relative);
  if (
    relative !== bundlePath(squadId, rootPrefix) ||
    !Array.isArray(reports) ||
    !reports.length ||
    reports.some(
      (report, index) =>
        !report || typeof report !== "object" || report.path !== reportPath(squadId, index + 1, rootPrefix)
    )
  ) {
    throw new Error("Bundle must contain the recorded squad's exact specialist slots.");
  }
  if (!integrity || typeof integrity.path !== "string" || typeof integrity.sha256 !== "string") {
    throw new Error("Bundle must record the integrity report path and hash.");
  }
  const integrityReport = readIntegrityReport(root, integrity.path, verifiedDirs);
  if (integrityReport.sha256 !== integrity.sha256) {
    throw new Error("Integrity report changed after bundling.");
  }
  if (integrityReport.verdict !== integrityVerdict) {
    throw new Error("Bundle integrity verdict does not match the report.");
  }
  if (kind === "content" && integrity.targetSquad !== squadId) {
    throw new Error(`Bundle integrity report targets '${integrity.targetSquad}', not '${squadId}'.`);
  }
  if (kind === "content") {
    if (verdict !== "PASS" || integrityVerdict !== "CLEAN") {
      throw new Error("Content bundles require a content PASS and an integrity CLEAN.");
    }
    const content = readSynthesis(root, reportPath(squadId, undefined, rootPrefix), verifiedDirs);
    if (content.verdict !== verdict || sha256(content.bytes) !== synthesis) {
      throw new Error("Synthesis changed after bundling.");
    }
    const reReview = readPostAuditReReview(content.markdown);
    if (!reReview.endsWith(integrity.sha256)) {
      throw new Error("Lead post-audit re-review does not reference the bound integrity report.");
    }
  }
  verifyFiles(root, verifiedFiles, verifiedDirs);
  const loosePresent = [];
  for (const report of reports) {
    if (typeof report.markdown !== "string" || typeof report.sha256 !== "string") {
      throw new Error(`Invalid archived report entry: ${report?.path}`);
    }
    const bytes = Buffer.from(report.markdown, "utf8");
    const loose = readIfPresent(root, report.path, verifiedDirs);
    if (!bytes.length || sha256(bytes) !== report.sha256 || (loose && !loose.equals(bytes))) {
      throw new Error(`Archived or loose report changed: ${report.path}`);
    }
    if (loose) loosePresent.push(report.path);
  }
  return {
    path: relative,
    sha256: digest,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })),
    loosePresent,
    retainReports: Boolean(parsed.retainReports)
  };
}
~~~

### 3.4 `pruneReports` retention pin

~~~js
function pruneReports(root, relative, acceptedHash) {
  if (!/^[0-9a-f]{64}$/.test(acceptedHash ?? "")) {
    throw new Error("Pruning requires the primary's accepted bundle digest.");
  }
  const { loosePresent, retainReports } = verifyBundleInternal(root, relative, acceptedHash);
  if (retainReports) return { removed: [], retained: loosePresent };
  const removed = [];
  for (const report of loosePresent) {
    try {
      fs.unlinkSync(path.join(root, report));
      removed.push(report);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { removed };
}
~~~

### 3.5 Bundle invariants to test

- No `integrityReport` → hard block.
- `integrityVerdict: "INTEGRITY VIOLATION"` → hard block with an explicit violation message.
- Integrity report target mismatch → hard block.
- Missing `Post-Audit Re-Review` or wrong hash → hard block.
- Compound content verdict (`PASS with …`) → hard block.
- `Integrity Verdict: PASS` → hard block.
- Integrity report deleted after bundling → `verifyBundle` throws.
- `retainReports: true` → `prune` removes nothing and returns the retained list.
- Legacy bundle without `bundleVersion: 2` → clear migration error.

---

## 4. P3 — Briefs: roles, warning, coverage

### 4.1 Add the warning and role constants

After the imports in `mcp/briefs.mjs`:

~~~js
const INTEGRITY_WARNING = [
  "MANDATORY INTEGRITY WARNING:",
  "DO NOT CHEAT. All implementations must be genuine. Do not hardcode test results, create dummy/facade implementations, or circumvent the intended task.",
  "An independent integrity auditor will verify your work. Integrity violations WILL be detected and your work WILL be rejected."
].join("\n");
~~~

Include `INTEGRITY_WARNING` in every compiled `Prompt` (working and integrity roles). This adds roughly 250–300 bytes to each prompt; update the `diagnose.mjs` budgets accordingly (see §9.3).

### 4.2 Replace the patrol text

In `superviseCohort`, replace the existing patrol/verify items with:

~~~js
"Squad Lead Patrol & Content Review Gate: Actively patrol leaf execution. Reject FAIL/PARTIAL reports that make ungrounded claims, flatter the workspace without proof, or cite unexecuted tools. The lead owns the content verdict. After the independent integrity audit returns CLEAN, re-review the final artifacts and record `Post-Audit Re-Review: PASS <integrity-sha256>` before the final `Content Verdict: PASS`.",
"Integrity Audit Gate: An independent integrity auditor returns CLEAN or INTEGRITY VIOLATION. INTEGRITY VIOLATION hard-blocks acceptance and cannot be downgraded to an advisory. Do not let the integrity auditor issue a content PASS/FAIL/BLOCKED verdict.",
"Batch-Efficient Transcript Forensics: Inspect transcripts in one single-pass batch query, merge overlapping ranges, and record the coverage table (conversations, step ranges, tool traces, evidence classes). Never poll 1-2 steps at a time."
~~~

In `managedCohort`, mirror the content/integrity separation:

~~~js
"Squad Lead Patrol & Content Review Gate: Audit leaf execution, penalize flattery/guessing, verify evidence/tests, and own the content verdict. After the integrity audit returns CLEAN, re-review the final artifacts and record `Post-Audit Re-Review: PASS <integrity-sha256>` before the final content PASS.",
"Integrity Audit Gate: The integrity auditor returns CLEAN or INTEGRITY VIOLATION; a violation hard-blocks acceptance and cannot be downgraded to an advisory. Batch transcript queries and record coverage."
~~~

### 4.3 Adversarial lead/specialist prompts

Replace the `isAdversarial` branch with `isIntegrity`:

~~~js
const isIntegrity = squadId === "adversarial_review" || squadId === "integrity_review" || /integrity|adversarial/i.test(role);
~~~

For an integrity **lead**:

~~~text
Integrity Audit Lead. Call dispatch_squad once with {"squadId":"adversarial_review","manifestPath":"..."} and launch the specialists. Audit the working cohort's tool traces, transcripts, hashes, and evidence-to-claim correspondence. Do not approve or reject content. Write `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION`, plus `Target Squad: <id>` and a coverage table. An INTEGRITY VIOLATION is a hard block; it cannot be downgraded to an advisory.
~~~

For an integrity **specialist**:

~~~text
Integrity Auditor. Verify that every material claim cites an executed tool command, exit code, and source line or transcript step. Flag parametric guessing, sycophantic flattery, pre-conclusive reasoning, fabricated citations, and scope violations. Write `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION`, `Target Squad: <id>`, and a coverage table. Do not issue PASS/FAIL/BLOCKED. Batch transcript queries once; merge overlapping ranges.
~~~

For a **working lead**, replace the PASS/FAIL sentence with:

~~~text
Write a provisional content verdict first. After the independent integrity audit returns CLEAN, re-review the final artifacts and record `Post-Audit Re-Review: PASS <integrity-sha256>` and the final `Content Verdict: PASS`, `FAIL`, or `BLOCKED`. A content PASS without the post-audit re-review line is not eligible for bundling.
~~~

For a **working specialist**, keep the existing alignment/anti-cheating text; do not give it a transcript-audit role unless it is also an integrity specialist.

### 4.4 Budget impact

The current managed specialist prompt is 950 B with a 1,000 B budget. The warning plus the integrity text may exceed it. Update the budgets in `diagnose.mjs` and its tests, for example:

- managed specialist: `1,250 B` (from `1,000`)
- unmanaged specialist: `1,800 B` (unchanged if the warning fits)
- managed lead: `1,800 B` (unchanged)
- unmanaged lead: `3,300 B` (unchanged)

Measure the real byte counts after applying the patch; do not guess. The budget update must be a deliberate, tested change.

---

## 5. P4 — Dispatch: integrity target and deliverable

In `defaultAdversarialSquad`, replace the current `expectedDeliverable` and instructions:

~~~js
return {
  _synthesized: true,
  lead: {
    role: "Integrity Audit Lead",
    objective: `Independently audit working squads (${targetLabel}) for authenticity, tool-trace evidence, scope compliance, and absence of gaming. Do not approve content.`,
    scopeFiles: ["."],
    instructions: `Record Target Squad: ${targetLabel}. Audit transcripts/tool traces, hashes, and evidence-to-claim correspondence. Write Integrity Verdict: CLEAN or INTEGRITY VIOLATION and a coverage table. INTEGRITY VIOLATION is a hard block.`,
    expectedDeliverable: "Integrity report with `Integrity Verdict: CLEAN|INTEGRITY VIOLATION`, `Target Squad: <id>`, and a coverage table."
  },
  specialists: [
    {
      role: "Tool Trace & Evidence Auditor",
      objective: `Audit working specialists in (${targetLabel}) for executed-tool evidence, exit codes, source lines, and transcript coverage.`,
      scopeFiles: ["."],
      expectedDeliverable: "Integrity report with `Integrity Verdict: CLEAN|INTEGRITY VIOLATION`, `Target Squad: <id>`, and a coverage table."
    },
    {
      role: "Synthesis Grounding Auditor",
      objective: `Audit working leads in (${targetLabel}) for independent checks, hash grounding, and absence of rubber-stamping.`,
      scopeFiles: ["."],
      expectedDeliverable: "Integrity report with `Integrity Verdict: CLEAN|INTEGRITY VIOLATION`, `Target Squad: <id>`, and a coverage table."
    }
  ]
};
~~~

In `resolveFlatAdversarialSpecialist`, apply the same role and deliverable. In `buildSubagentSpec`, inject `Target Squad: ${...}` into the integrity prompt. The bundle rejects a report whose `Target Squad` does not match `squadId`.

**Do not** add a `requireAdversarialReview` boolean to the schema. Integrity review is required by default for working cohorts; the only opt-out is a documented `integrityExemption` record with a reason, and the bundle should reject that for research/review tasks. Prefer no opt-out for PR #3.

---

## 6. P5 — CLI: one-shot dispatch and retention flag

### 6.1 `bin/agy-squad.mjs` dispatch command

Add to `usage`:

~~~js
'agy-squad dispatch --manifest <workspace-path> --squad <id|all_l1|adversarial_l1|adversarial_flat>',
'Optional dispatch flags: --workspace <directory>, --run <managed-run-dir>. Prints the Subagents JSON to stdout.'
~~~

Add before the `args[0] !== "run"` branch in `main`:

~~~js
if (args[0] === "dispatch") {
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      workspace: { type: "string" },
      manifest: { type: "string" },
      squad: { type: "string" },
      run: { type: "string" }
    }
  });
  if (!values.manifest || !values.squad) {
    throw new Error("dispatch requires --manifest and --squad.");
  }
  const workspace = values.workspace ? path.resolve(values.workspace) : process.cwd();
  const result = handleDispatchSquad(
    { manifestPath: values.manifest, squadId: values.squad },
    workspace,
    values.run
  );
  if (result.isError) throw new Error(result.content[0].text);
  console.log(result.content[0].text);
  return 0;
}
~~~

This is a thin wrapper over `handleDispatchSquad`; it preserves `L31` (one public compiler) and gives fresh subagents a discoverable one-line command.

### 6.2 `mcp/handoffs.mjs` bundle/keep-reports

Change the CLI branch:

~~~js
else if (action === "bundle" && (args.length === 1 || (args.length === 2 && args[1] === "--keep-reports"))) {
  const record = JSON.parse(readFile(root, args[0]));
  if (args[1] === "--keep-reports") record.retainReports = true;
  result = bundleReports(root, record);
}
~~~

Update the usage string:

~~~text
Usage: fingerprint <file...> | inspect <record.json> | bundle <record.json> [--keep-reports] | verify <bundle.json> | prune <bundle.json> <accepted-sha256>
~~~

`prune` already respects the bundle's `retainReports` after P2, so `bundle --keep-reports` is a real, durable pin. Do not add a separate `--keep-reports` to `prune`; the bundle is the source of truth.

---

## 7. P6 — Tests

### 7.1 New `tests/test-verdicts.mjs`

~~~js
import assert from "node:assert/strict";
import {
  readContentVerdict,
  readIntegrityVerdict,
  readPostAuditReReview
} from "../mcp/verdicts.mjs";

assert.equal(readContentVerdict("Content Verdict: PASS"), "PASS");
assert.equal(readContentVerdict("**Content Verdict: PASS**"), "PASS");
assert.equal(readContentVerdict("Verdict: PASS"), "PASS");
assert.throws(() => readContentVerdict("Verdict: PASS with advisories"), /exactly/);
assert.throws(() => readContentVerdict("Verdict: CONDITIONAL PASS"), /exactly/);
assert.throws(() => readContentVerdict("Verdict: PASS\nSecondary check: FAIL."), /exactly/);
assert.equal(readContentVerdict("```\nVerdict: FAIL\n```\nVerdict: PASS"), "PASS");
assert.equal(readIntegrityVerdict("Integrity Verdict: CLEAN"), "CLEAN");
assert.equal(readIntegrityVerdict("Integrity Verdict: CLEAR"), "CLEAN");
assert.equal(readIntegrityVerdict("Integrity Verdict: INTEGRITY VIOLATION"), "INTEGRITY VIOLATION");
assert.throws(() => readIntegrityVerdict("Integrity Verdict: PASS"), /unsupported/);
const sha = "a".repeat(64);
assert.equal(readPostAuditReReview(`Post-Audit Re-Review: PASS ${sha}`), `PASS ${sha}`);
assert.throws(() => readPostAuditReReview(`Post-Audit Re-Review: FAIL ${sha}`), /exactly one/);
console.log("verdict tests passed");
~~~

### 7.2 Update `tests/test-handoffs.mjs`

Replace the adversarial section with the new lifecycle:

- Write lead synthesis with `Content Verdict: PASS` and `Post-Audit Re-Review: PASS <sha>` after writing the integrity report.
- Integrity report: `Integrity Verdict: CLEAN` + `Target Squad: trial-a`.
- Bundle record: `integrityVerdict: "CLEAN"`, `integrityReport: <path>`.
- Assert missing integrity report blocks.
- Assert `Integrity Verdict: INTEGRITY VIOLATION` blocks.
- Assert target mismatch blocks.
- Assert missing/wrong re-review hash blocks.
- Assert deleting the integrity report after bundling makes `verifyBundle` throw.
- Assert `bundle --keep-reports`/`retainReports` makes `prune` a no-op.

The existing `Verdict: PASS` lead fixtures must become `Content Verdict: PASS` plus a `Post-Audit Re-Review` line. Do not keep a legacy permissive path.

### 7.3 Update `tests/test-dispatch.mjs`

- Assert the integrity lead prompt contains `Integrity Verdict: CLEAN` and `INTEGRITY VIOLATION`, and does not contain `Verdict: PASS`.
- Assert the working lead prompt contains `Content Verdict` and `Post-Audit Re-Review`.
- Assert the specialist prompt contains `MANDATORY INTEGRITY WARNING` and the coverage instruction.

### 7.4 `package.json`

Add `node tests/test-verdicts.mjs` to the `test` script. Add a CLI dispatch test (spawn `bin/agy-squad.mjs dispatch` against a fixture manifest and assert valid JSON).

---

## 8. P7 — Documentation, skills, ledger, PR body

### 8.1 `docs/core-workflows.md`

Replace the Stage 2/3 block with:

~~~markdown
- **Stage 1 — Working Cohort (content).** The working lead is the reviewer and parent of its leaf agents. It writes a provisional `Content Verdict` after patrol. A content PASS is not final.
- **Stage 2 — Independent Integrity Audit.** An independent integrity auditor (layered for layered cohorts, flat for flat) returns `Integrity Verdict: CLEAN` or `INTEGRITY VIOLATION` and records `Target Squad`, coverage, and evidence. The auditor does not approve content. `INTEGRITY VIOLATION` is a hard block and cannot be downgraded to an advisory.
- **Stage 3 — Post-Audit Lead Re-Review and Acceptance.** After `CLEAN`, the working lead re-reviews the final artifacts, records `Post-Audit Re-Review: PASS <integrity-sha256>`, and issues the final `Content Verdict: PASS`. `bundleReports` requires both verdicts and the binding.
~~~

Remove the “adversarial `PASS` gate” language. Document the exact enums and the `Target Squad` field.

### 8.2 `docs/tools.md`

Update the `dispatch_squad` description to include `integrity_l1`/`integrity_flat` aliases (once added) or explain that the existing `adversarial_*` IDs are the integrity cohort. Update the bundle record section with:

- `integrityVerdict` (required, `CLEAN`/`INTEGRITY VIOLATION`);
- `integrityReport` (required path);
- `leadReReview` (`PASS` bound to the integrity hash);
- `retainReports` / `bundle --keep-reports`;
- `verify` fails when the integrity report is missing;
- `Target Squad` binding.

### 8.3 Skills

In `.agents/skills/pr-review/SKILL.md` and `.agents/skills/self-diagnosis/SKILL.md`, change the Step 0 “Adversarial Rigor” option to **Integrity Audit** and add:

> The integrity auditor returns `CLEAN`/`INTEGRITY VIOLATION`; it does not approve content. The working lead owns the content verdict and re-reviews after `CLEAN`. `INTEGRITY VIOLATION` hard-blocks acceptance.

Remove the hard-coded “3 leads / 6 specialists” unless it is derived from the manifest. `all_specialists` must be implemented or removed; `--keep-reports` must be real before it is offered.

### 8.4 Ledger and PR body

Append, do not rewrite, in `docs/reviews/pr1-code-review-ledger.md`:

- Session 15 / Wave R15 with the revision-2 findings (`ARCH-PR3-05`, `SVC-PR3-03`, `SKILL-PR3-03`, `RUN-PR3-05`, `DOC-PR3-04`, `TEST-PR3-03`).
- A correction row for `SVC-ADV-01`/`ARCH-ADV-01` stating the prior closure is reopened because the adversarial role is a content gate.
- A note that the retest dossier is `Unverified` and that the PR body no longer claims 0 P1/P2.

Update the PR #3 body to link this document and the review addendum; remove “0 P1/P2” and “ready” language.

---

## 9. P8 — Host-boundary work not covered by these patches

These are real findings, but they cannot be closed by editing `mcp/` alone. Track them explicitly; do not claim them fixed.

### 9.1 Tool-enforced `scopeFiles`

`scopeFiles` is prompt text (`mcp/briefs.mjs:95–96`). A host PreToolUse hook or per-subagent permission profile is required to reject reads outside the listed files. Integration options:

- Antigravity PreToolUse hook that receives the subagent's brief and the tool path, and rejects `read_file`/`run_command` outside the allowlist.
- Per-subagent workspace isolation (worktree) so out-of-scope files are physically absent.
- If neither is available, remove the enforcement claim and add a `Scope Verdict: CLEAN|VIOLATION` audit requirement, but do not call it tool-enforced.

Acceptance: an adversarial test that attempts an out-of-scope read and observes rejection, or a documented retraction of the guarantee.

### 9.2 Root-visible layered cohorts

Layered adversarial coverage is required. The GUI currently surfaces only direct children. The fix is a root-visible projection or a launcher that dispatches each layer from the root while preserving the parent/delegation relationship. Do not flatten solely for visibility. Acceptance: every working and integrity agent is visible in `/agents` or the projection, with layering intact.

### 9.3 Prompt budgets

The integrity warning and role text increase the compiled prompt size. Update `diagnose.mjs` budgets and the corresponding tests with measured values. Do not silently drop the warning to fit an old budget.

### 9.4 Managed plan staging

`stagePlan` still hashes working squads only (`mcp/dispatch.mjs:216`). If the integrity cohort is synthesized after staging, its config is outside the plan. Stage the integrity cohort as a separate plan or include it deliberately; record the choice. This is `RUN-PR3-03`, not a blocker for the role correction.

---

## 10. Migration and compatibility

- Regenerate all test bundles with `bundleVersion: 2`; no silent legacy path.
- Update fixtures from `Verdict: PASS` to `Content Verdict: PASS` + `Post-Audit Re-Review`.
- Update `README`/docs examples that show an adversarial `PASS` gate.
- Existing `adversarialReview` bundle field becomes legacy; `verifyBundle` should reject it with “Legacy bundle format” rather than accepting it.
- Keep `adversarial_l1`/`adversarial_flat` IDs for PR #3 compatibility; add `integrity_*` aliases in a follow-up if desired.
- `CLEAR` is accepted as an integrity alias and normalized to `CLEAN`; reports should emit `CLEAN`.

---

## 11. Acceptance test (after P1–P7)

Run on WSL2 with a real Antigravity cohort, not on Windows:

1. Apply P1–P7; run `npm test` (including the new verdict/CLI tests).
2. Dispatch the same comparative research task with a fresh orchestrator. No operator-authored `node -e` notices; the orchestrator must use `agy-squad dispatch`.
3. Confirm:
   - the working lead writes `Content Verdict: PASS` and a provisional synthesis;
   - the integrity audit writes `Integrity Verdict: CLEAN`, `Target Squad`, and a coverage table;
   - the lead writes `Post-Audit Re-Review: PASS <integrity-sha>` after `CLEAN`;
   - no report contains `PASS with …`, `CONDITIONAL PASS`, or an integrity `PASS`;
   - `bundleReports` requires both verdicts and the target binding;
   - deleting the integrity report makes `verify` fail;
   - an injected `INTEGRITY VIOLATION` fixture hard-blocks acceptance and is recorded;
   - transcript coverage lists the conversations, ranges, tool traces, and evidence classes; overlapping ranges are merged/justified;
   - every working and integrity agent is visible in `/agents` (or the documented projection).
4. Re-run the Teamwork comparison only after the above passes. Do not claim parity from the old retest.

---

## 12. Apply/commit checklist

- [ ] Apply P1–P7 in order; run `node --check` on every modified `.mjs`.
- [ ] Run `npm test` on WSL2; add the new tests to the script.
- [ ] Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --allow-active-cohort`; fix prompt-budget findings deliberately.
- [ ] Run the acceptance test in §11.
- [ ] Append the ledger session and correct the PR body.
- [ ] Commit with a message that names the role separation, not “alignment”.
- [ ] Re-review PR #3 against Standard v1.3.0; do not merge until all P1/P2 are closed.
- [ ] Only then merge #3 into PR #1; re-review PR #1; merge #1.
