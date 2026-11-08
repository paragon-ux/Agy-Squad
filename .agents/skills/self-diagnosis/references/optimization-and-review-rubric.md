# Agy-Squad Self-Diagnosis, PR-Review & Optimization Rubric

This reference pairs the `self-diagnosis` skill with the [Agy-Squad PR Review Standard v1.1.0](../../pr-review/references/pr-review-standard.md) ([`pr-review` skill](../../pr-review/SKILL.md)). Use it to classify self-diagnosis findings, verify skill and runtime invariants, and evaluate token and execution optimizations.

---

## 1. Coupling `self-diagnosis` with `pr-review` (Standard v1.1.0)

Every self-diagnosis pass evaluates `Agy-Squad` and its skills (`.agents/skills/self-diagnosis/`, `.agents/skills/pr-review/`) using the `pr-review` v1.1.0 trace chain:

`design thesis / invariant -> current architecture decision (LEDGER.md) -> public contract -> implementation -> verification`

Map every diagnosed defect or optimization opportunity to **one primary category** from the 10 mandatory `pr-review` categories (cross-referencing related categories without double-counting):

| Category | Self-Diagnosis & Optimization Focus |
| --- | --- |
| `ARCH` | `L1`–`L41` ledger alignment, host-enforced vs. receipt-verified boundaries, workspace containment, and cohort topology. |
| `DOC` | `README.md`, `docs/tools.md`, `docs/plans/LEDGER.md`, and `docs/plans/wsl-cli-verification.md` parity with runtime behavior and benchmark/trial evidence. |
| `SKILL` | `.agents/skills/*/SKILL.md` frontmatter (`name`, `description`), relative link integrity, progressive disclosure ratio (`SKILL.md` vs. `references/` and `scripts/`), and accuracy of referenced tools/flags. |
| `MCP` | `mcp/index.js` JSON-RPC 2.0 compliance, UTF-8 byte limits, `.mcp-ready` publication, session gating, and `dispatch_squad` schema compactness/constraints. |
| `RUN` | `mcp/dispatch.mjs` and `mcp/briefs.mjs` symlink/fd checks, `all_l1` reservation, `TypeName: "self"` and `Workspace: "inherit"` invariants, and compiled prompt byte efficiency. |
| `SVC` | `mcp/handoffs.mjs`, `mcp/run-state.mjs`, and `bin/agy-squad.mjs` receipt reconciliation, `readSynthesis` unambiguous `PASS` verdict check, atomic bundle replacement, and run-directory cleanup. |
| `DB` | Verify absence of unreviewed database state (file-backed atomic staging and bundle persistence are audited under `SVC`). |
| `SCRIPT` | `bin/terminal.py`, `mcp/handoffs.mjs` CLI, and `.agents/skills/self-diagnosis/scripts/diagnose.mjs` deterministic exit codes, PTY readiness, and argument validation. |
| `TEST` | `tests/test-*.mjs` assertion strength, adversarial coverage, two-process concurrency, and supervised live subagent verification. |
| `DEP` | `package.json`, `zensical.toml`, `.gitignore`, and `.github/workflows/*.yml` coherence. |

---

## 2. Quantitative Optimization Budgets & Thresholds

`scripts/diagnose.mjs` measures the following budgets and flags violations or optimization opportunities:

| Metric | Target Budget | Warning / Optimization Threshold | Triage When Exceeded |
| --- | --- | --- | --- |
| **`SKILL.md` Entry Size (Progressive Disclosure)** | $\le 250$ lines and $\le 10,240$ UTF-8 bytes ($\approx 2,500$ tokens) per `SKILL.md` | $> 300$ lines or $> 12,288$ UTF-8 bytes, or $> 70\%$ of total skill text inlined in `SKILL.md` when total skill size $> 8\text{ KiB}$ | `P2` (if instructions conflict/truncate) or `P3` Advisory (`SKILL`) — extract bulky tables/examples into `references/` or `scripts/`. |
| **Compiled Unmanaged Specialist Brief Overhead** | $\le 1,600$ UTF-8 bytes ($\approx 400$ tokens) of fixed template text in `buildSubagentSpec` | $> 1,800$ UTF-8 bytes of fixed template text | `P3` Advisory (`RUN` / `SKILL`) — tighten `mcp/briefs.mjs` prompt lines without dropping required handoff rules. |
| **Compiled Managed Specialist Brief Overhead** | $\le 850$ UTF-8 bytes ($\approx 215$ tokens) of fixed template text in `buildSubagentSpec` | $> 1,000$ UTF-8 bytes of fixed template text | `P3` Advisory (`RUN` / `SKILL`). |
| **Compiled Unmanaged Lead Brief Overhead** | $\le 3,100$ UTF-8 bytes ($\approx 775$ tokens) of fixed template text (including `superviseCohort`) | $> 3,300$ UTF-8 bytes of fixed template text | `P3` Advisory (`RUN` / `SKILL`). |
| **Compiled Managed Lead Brief Overhead** | $\le 1,650$ UTF-8 bytes ($\approx 415$ tokens) of fixed template text (including `managedCohort`) | $> 1,800$ UTF-8 bytes of fixed template text | `P3` Advisory (`RUN` / `SKILL`). |
| **Pointer-Over-Wire Receipt Headroom** | `READY <slot> — ` prefix $\le 150$ UTF-8 bytes, leaving $\ge 350$ bytes of the `500`-byte `messageLimit` for the observation | Prefix $> 160$ UTF-8 bytes | `P2` (`SVC` / `RUN`) — shorten `squadId` or slot path encoding. |
| **Sibling Specialist `scopeFiles` Overlap** | $0\%$ overlapping files across specialists in the same squad | $> 25\%$ overlapping `scopeFiles` within one squad | `P2` (for concurrent writers) or `P3` Advisory (for readers) — partition `scopeFiles` cleanly across specialists. |
| **Stage Compilation Latency (`handleDispatchSquad`)** | $< 10\text{ ms}$ per stage call on local SSD/WSL | $> 25\text{ ms}$ per stage call | `P3` Advisory (`RUN`) — inspect redundant `realpathSync` / manifest re-reads. |
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
| **Managed Session Gate** | `.mcp-ready` not written on `tools/list` or neighbor session allowed to call `dispatch_squad` | `MCP` (**P1** / **P2**) | Verify `AGY_SQUAD_RUN_DIR` and `AGY_SQUAD_SESSION` checks and `fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd())` in `mcp/index.js`. |
| **Self-Diagnosis Directory Teardown (`L41`)** | Lingering `scratch/agy-squad/squad-<id>` or `self-diag-canary-*` directories left in workspace after verification (`SVC-TEARDOWN-*`) | `SVC` (**P2**) | Run `node .agents/skills/self-diagnosis/scripts/diagnose.mjs --teardown [squadId|all] [--accept <sha256>]` to verify the bundle and remove self-diagnosis directories and empty `scratch/agy-squad` / `scratch` parent directories. |
| **Cohort Agent Freshness vs. Remediation Check** | Reusing an old pass's subagent `conversationId` for an unrelated pass (`invoke_subagent` required), or spawning a brand-new squad when the operator requested verifying remediations on the active squad's exact findings (`send_message` required) | `SVC` (**P2**) | Launch fresh subagents (`invoke_subagent`) for new independent passes; message the **same** cohort (`send_message`) after `prune`/`--teardown` when verifying that their exact reported findings were remediated. |
| **Post-Cohort Subagent Termination** | Completed subagents left lingering in `idle` state in the session table after final bundle verification and `--teardown` | `SVC` (**P2**) | Call `manage_subagents(Action='kill', ConversationIds=[...])` for all spawned subagents once the cohort's final verification (including any same-squad remediation check) and `--teardown` complete. |
