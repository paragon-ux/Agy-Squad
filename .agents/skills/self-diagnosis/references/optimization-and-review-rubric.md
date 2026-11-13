# Agy-Squad Self-Diagnosis, PR-Review & Optimization Rubric

This reference pairs the `self-diagnosis` skill with the [Agy-Squad PR Review Standard v1.3.0](../../pr-review/references/pr-review-standard.md) ([`pr-review` skill](../../pr-review/SKILL.md)). Use it to classify self-diagnosis findings, verify skill and runtime invariants, and evaluate token and execution optimizations.

---

## 1. Coupling `self-diagnosis` with `pr-review` (Standard v1.3.0)

Every self-diagnosis pass evaluates `Agy-Squad` and its skills (`.agents/skills/self-diagnosis/`, `.agents/skills/pr-review/`) using the `pr-review` v1.3.0 trace chain:

`design thesis / invariant -> current architecture decision (LEDGER.md) -> public contract -> implementation -> verification`

Map every diagnosed defect or optimization opportunity to **one primary category** from the 10 mandatory `pr-review` categories (cross-referencing related categories without double-counting):

| Category | Self-Diagnosis & Optimization Focus |
| --- | --- |
| `ARCH` | `L1`–`L43` ledger alignment, host-enforced vs. receipt-verified boundaries, workspace containment, and cohort topology. |
| `DOC` | `README.md`, `docs/tools.md`, `docs/plans/LEDGER.md`, and `docs/reviews/` parity with runtime behavior and benchmark/trial evidence. |
| `SKILL` | `.agents/skills/*/SKILL.md` frontmatter (`name`, `description`), relative link integrity, progressive disclosure ratio (`SKILL.md` vs. `references/` and `scripts/`), and accuracy of referenced tools/flags. |
| `MCP` | `mcp/index.js` JSON-RPC 2.0 compliance, positive integer `AGY_MAX_STDIO_PAYLOAD_BYTES` limits, and `dispatch_squad` / `squad_planner` schema compactness. |
| `RUN` | `mcp/dispatch.mjs`, `mcp/briefs.mjs`, and `mcp/planner.mjs` symlink/fd checks, `TypeName: "self"` + rejected built-ins (`research`, `browser`, `image-generator`), `modelProvenance`, and scope overlap checks. |
| `SVC` | `mcp/handoffs.mjs`, `mcp/verdicts.mjs`, and `bin/agy-squad.mjs` receipt reconciliation, custom `reportRoot` handling, `readSynthesis` PASS verdict, `integrityAudit` binding, atomic bundle replacement, and `--teardown`. |
| `DB` | Verify absence of unreviewed database state (file-backed atomic bundle persistence is audited under `SVC`). |
| `SCRIPT` | `bin/agy-squad.mjs`, `mcp/handoffs.mjs` CLI, and `.agents/skills/self-diagnosis/scripts/diagnose.mjs` deterministic exit codes and argument validation. |
| `TEST` | `tests/test-*.mjs` assertion strength, adversarial coverage, two-process concurrency, and supervised live subagent verification. |
| `DEP` | `package.json`, `zensical.toml`, `.gitignore`, and `.github/workflows/*.yml` coherence. |

---

## 2. Quantitative Optimization Budgets & Thresholds

`scripts/diagnose.mjs` measures the following budgets and flags violations or optimization opportunities:

| Metric | Target Budget | Warning / Optimization Threshold | Triage When Exceeded |
| --- | --- | --- | --- |
| **`SKILL.md` Entry Size (Progressive Disclosure)** | $\le 250$ lines and $\le 10,240$ UTF-8 bytes ($\approx 2,500$ tokens) per `SKILL.md` | $> 300$ lines or $> 12,288$ UTF-8 bytes, or $> 70\%$ of total skill text inlined in `SKILL.md` when total skill size $> 8\text{ KiB}$ | `P2` (if instructions conflict/truncate) or `P3` Advisory (`SKILL`) — extract bulky tables/examples into `references/` or `scripts/`. |
| **Compiled Specialist Brief Overhead** | $\le 1,600$ UTF-8 bytes ($\approx 400$ tokens) of fixed template text in `buildSubagentSpec` | $> 1,800$ UTF-8 bytes of fixed template text | `P3` Advisory (`RUN` / `SKILL`) — tighten `mcp/briefs.mjs` prompt lines without dropping required handoff rules. |
| **Compiled Lead Brief Overhead** | $\le 3,100$ UTF-8 bytes ($\approx 775$ tokens) of fixed template text (including `superviseCohort`) | $> 3,300$ UTF-8 bytes of fixed template text | `P3` Advisory (`RUN` / `SKILL`). |
| **MCP `tools/list` Schema Response** | $\le 3,072$ UTF-8 bytes (`dispatch_squad` + `squad_planner`) | $> 4,096$ UTF-8 bytes (`MCP-BUDGET-SCHEMA`) | `P3` Advisory (`MCP`) — tighten schema descriptions in `mcp/index.js`. |
| **Pointer-Over-Wire Receipt Headroom** | `READY <slot> — ` prefix $\le 150$ UTF-8 bytes, leaving $\ge 350$ bytes of the `500`-byte `messageLimit` for the observation | Prefix $> 160$ UTF-8 bytes | `P2` (`SVC` / `RUN`) — shorten `squadId` or slot path encoding. |
| **Sibling Specialist `scopeFiles` Overlap** | $0\%$ overlapping files across specialists in the same squad | $> 25\%$ overlapping `scopeFiles` within one squad | `P2` (for concurrent writers) or `P3` Advisory (for readers) — partition `scopeFiles` cleanly across specialists or use `/swarm` `workspace: "share"`. |
| **Stage Compilation & Planner Latency (`handleDispatchSquad` / `planSquadCohort`)** | $< 10\text{ ms}$ per call on local SSD/WSL | $> 25\text{ ms}$ per call | `P3` Advisory (`RUN`) — inspect redundant `realpathSync` / manifest re-reads. |
| **Handoff & Bundle Pipeline Latency (`inspect` + `bundle` + `verify` + `prune`)** | $< 20\text{ ms}$ for a 2-specialist cohort | $> 50\text{ ms}$ for a 2-specialist cohort | `P3` Advisory (`SVC`) — inspect redundant file opens in `verifyFiles` / `verifyBundle`. |

---

## 3. Failure-to-Category Triage Matrix

| Diagnostic Check | Failure Symptom | Primary Category & Priority | Root Cause & Remediation |
| --- | --- | --- | --- |
| **Skill Frontmatter & Links** | Missing `name` / `description` YAML frontmatter or broken relative link (`[...](./path)`) in `.agents/skills/*/SKILL.md` | `SKILL` (**P1** if broken script/manifest link; **P2** if broken doc link) | Fix frontmatter or restore the missing target file under `.agents/skills/<skill>/`. |
| **Skill Tool/API Drift** | Skill references retired tool (`subagent_brief`) or legacy-only parameters (`mode`, `spawnPacingMs`) as active | `SKILL` (**P2**) | Update skill instructions to use `dispatch_squad` (`squadId`, `manifestPath`, or managed `manifest`) and `node mcp/handoffs.mjs`. |
| **Preset Capability Check** | Specialist compiled with `TypeName: "research"` or `Workspace !== "inherit"` | `RUN` (**P1**) | Ensure `buildSubagentSpec` in `mcp/briefs.mjs` defaults `TypeName` to `"self"`, rejects `"research"`, and requires `Workspace === "inherit"`. |
| **Synthesis Verdict Gate** | `bundleReports` or `verifyBundle` accepts a `lead/report.md` containing `FAIL`, `BLOCKED`, or no `PASS` token | `SVC` (**P1**) | Ensure `readSynthesis` in `mcp/handoffs.mjs` validates line-anchored `PASS` and rejects `FAIL` / `BLOCKED` across both `bundleReports` and `verifyBundle`. |
| **Receipt Reconciliation** | Handoff rejected for `> 500` UTF-8 bytes, multiline text, wrong sender, or wrong slot | `SVC` (**P2**) | Ensure child sends single-line `READY <assigned-slot> — <observation>` within `500` UTF-8 bytes (`Buffer.byteLength`). |
| **MCP Framing & Planner Boundary** | Oversized stdio payload allowed past `AGY_MAX_STDIO_PAYLOAD_BYTES`, negative byte limit accepted, or `squad_planner` omits `modelProvenance` / `provenanceScaffold` | `MCP` (**P1** / **P2**) | Verify positive integer `AGY_MAX_STDIO_PAYLOAD_BYTES` guard in `mcp/index.js` and `planSquadCohort` invariants in `mcp/planner.mjs`. |
| **Durable Target PR Review Ledger Gate & `v1.3.0` Schema (`docs/reviews/`)** | Missing target ledger, starting code edits or `--teardown` before updating `docs/reviews/<target-review-slug>.md`, missing Section 1 `Session Provenance` / Section 8 `Post-Remediation Residuals & Deferred Dispositions` / Section 9 `/self-diagnosis` Cohort & Bundle Ledger, or using umbrella/range-compressed finding IDs (`DOC-LEDGER-MISSING`, `DOC-LEDGER-SCHEMA`) | `DOC` / `SVC` (**P1** if missing/stale pre-teardown; **P2** if schema/umbrella violation; **P3** `DOC-LEDGER-RESIDUALS-OPEN` while Section 8 `Residual (Open)` rows await fix) | Update `docs/reviews/<target-review-slug>.md` in place before remediation or `--teardown` with Section 1 Session Provenance, Section 9 Cohort Provenance + `1 ID = 1 Row` Wave Finding Ledger, and Section 8 atomic residual/deferred dispositions. |
| **Self-Diagnosis Directory Teardown (`L41`)** | Lingering `scratch/agy-squad/squad-<id>` or `self-diag-canary-*` directories left in workspace after verification (`SVC-TEARDOWN-*`) | `SVC` (**P2** post-cohort; **P3** advisory when `--allow-active-cohort` is passed mid-cohort) | Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown [all | <squadId> [--accept <sha256>]] [--ledger docs/reviews/<slug>.md]` after updating the target `docs/reviews/` ledger to atomically verify bundles and remove self-diagnosis directories and empty `scratch/agy-squad` / `scratch` parent directories. |
| **Cohort Agent Freshness vs. Remediation Check** | Reusing an old pass's subagent `conversationId` for an unrelated pass (`invoke_subagent` required), or spawning a brand-new squad when the operator requested verifying remediations on the active squad's exact findings (`send_message` required) | `SVC` (**P2**) | Launch fresh subagents (`invoke_subagent`) for new independent passes; message the **same** cohort (`send_message`) after `prune`/`--teardown` when verifying that their exact reported findings were remediated. |
| **Post-Cohort Subagent Termination** | Completed subagents left lingering in `idle` state in the session table after final bundle verification and `--teardown` | `SVC` (**P2**) | Call `manage_subagents(Action='kill', ConversationIds=[...])` for all spawned subagents once the cohort's final verification (including any same-squad remediation check) and `--teardown` complete. |
