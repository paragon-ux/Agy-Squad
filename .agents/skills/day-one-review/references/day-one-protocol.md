# Day-One Review Protocol (PR Review Standard v1.5.0)

Workflow reference for [../SKILL.md](../SKILL.md) under [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md). Applies to any target repo (CLIs, plugins, libraries, APIs, web apps).

## 1. Stage 1: Cadence Intake and Audit Workspace

1. **Cadence intake (zero anchoring):** Ask strictly for cadence/stop criteria before `r1` (never bug hypotheses or prior fix claims):
   - **Single-round (`r1` only):** cold audit + 4-tier verdict, then stop.
   - **Multi-round (`r1` -> remediate -> `r2`):** iterate cumulatively until the chosen target verdict passes.
   - **Full public-launch gate (`r1` -> remediate -> `r2` -> `raw-final`):** add one unanchored live consumer trial before merge/tag.
   - **Target stop verdict (multi-round / full gate):** confirm whether remediation stops at `SHIP NOW` (0 open P0-P3) or `SHIP WITH MINOR POLISH` (0 P0/P1/SEC and <= 2 non-SEC P2/P3 polish items).
2. **Workspace & hygiene:** Default `scratch/day-one-review/` (or user path); confirm `.gitignore` and release-tarball exclusion. Write `docs/reviews/` only if explicitly requested.
3. **Lineage & pin:** `<auditDir>/day-one-review-r1.md`, `day-one-review-r2.md` (`r3`...), `day-one-review-raw-final.md`. Pin repo, branch, `HEAD`, dirty state, runtime, cadence, target stop verdict, and Session Provenance first.

## 2. Stage 2: Raw, Unguided Initial Review (`r1`)

### Anti-Anchoring (`r1` and `raw-final`)
- Prepend `[agy-transcript-access: self-only]` (or `[agy-transcript-access: deny]`) on line 1 of `r1` and `raw-final` subagent prompts when `Agy-Context-Saver` is installed. `self-only` enforces identical cross-session isolation while letting long audits query their own post-compaction transcript.
- Do not read `docs/reviews/*`, `scratch/day-one-review/day-one-review-r*.md`, `docs/plans/*`, `git log`, PR summaries, or hints before outside-in inspection.
- Pass only repo root, pinned commit/branch, output path, and cold Day-1 persona. Never edit repo files during review passes.

### Live Consumer Install & Journeys
Pack the release artifact (`npm pack`, `python -m build`, etc.), install into a disposable consumer project outside the checkout (normal + `--ignore-scripts`), compile public types strictly (`tsc --noEmit --strict`, `skipLibCheck: false` if `.d.ts` ships), and dogfood CLI/SDK/MCP live. Clean up temp dirs/daemons afterward. For governance or transcript plugins, run synthetic `.system_generated` consumer checks via hermetic test scripts rather than inline shell literals that trip active host guard hooks.

Record this **User-Journey Trace Matrix** in Section 3 alongside the architecture trace:

| Journey | Promised | Actual (`file:line`) | Coverage | Verdict |
| --- | --- | --- | --- | --- |
| 1. First 60s (`README`, Quickstart, metadata, jargon) | `<claim>` | `<reality>` | `<tests/gap>` | `Satisfied/Mismatch/Gap` |
| 2. Clean install, upgrade, rollback (`--ignore-scripts`, off-`PATH`, `skipLibCheck: false`) | | | | |
| 3. Everyday use in an unrelated project (live CLI/SDK/MCP, error clarity) | | | | |
| 4. Security & trust (`4.11 SEC`: surface, checksums, secrets, `timeout 5` ReDoS probes, CI `permissions:`/`concurrency:`, uninstall) | | | | |
| 5. Packaging, CI & release (allowlist, artifact parity, multi-OS CI, release notes) | | | | |

### P3 vs. Section 8 Boundary & 4-Tier Ship Verdict
Follow Standard v1.5.0 Sections 1-8 across all **11 categories** (`ARCH`..`DEP`, `SEC`; bound adversarial ReDoS and CPU-amplification probes with `timeout 5`, and check CI `permissions:`/`concurrency:` under `4.11 SEC`) with `1 ID = 1 Row`:

- **P3 (auto-fixed in Stage 3):** Concrete, unambiguous, user-visible in-repo defects (typos, stale counts, bad schema docs, missing non-breaking validation, stray internal tags, leaked temp dirs).
- **Section 8 (human decision gate):** Upstream/external deps, intentional contract trade-offs risking breakage, policy-gated files (benchmarks), and subjective polish.
- **4-Tier Verdict (Section 7):**
  - **`SHIP NOW`**: 0 open P0/P1/P2/P3 in-repo defects (only tracked Section 8 residuals/deferrals/informational notes, if any).
  - **`SHIP WITH MINOR POLISH`**: 0 P0/P1/SEC blockers and <= 2 small localized P2/P3 polish items with zero broken install/compile/SDK/core contracts.
  - **`FIX BEFORE RELEASE`**: 0 P0/P1/SEC blockers, but >= 3 open P2/P3 items or any P2 breaking compile, install, or core workflows (auto-fixed in Stage 3 to reach the target stop verdict).
  - **`HOLD BEFORE PUBLIC RELEASE`**: Any open P0/P1 blocker, unresolved `SEC` flaw, or unreviewed material category.

## 3. Stage 3: Remediation and Selective Resume

1. **Auto-fix P0-P3; ask only on Section 8:** Checkpoint clean git state, then fix every concrete in-repo P0-P3 defect automatically without asking to skip P3s. Pause only on Section 8 decision items.
2. **2-round escalation stop-rule:** If any finding ID remains `Open` after 2 remediation rounds (still `Open` in `r3`), stop heuristic patching and apply an architectural or structural replacement before launching the next verification round.
3. **CPU/daemon & live-hook serialization:** Default to a **single coding subagent** when native indexers, local daemons, SQLite/DB locks, heavy build harnesses, or live symlinked plugin/hook files exist; parallelize disjoint files only for lightweight modules.
4. **Selective Resume:** Inspect `manage_subagents(Action='list')` (when exposed), resume **ONLY** interrupted subagents, never message healthy workers, and never spawn duplicate replacements. If a worker died permanently, run a read-only recovery audit first (`git diff` + single-pass transcript read per [dual-path trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection)) classifying IDs as `Completed`, `Partially Completed`, or `Unremediated`, then finish only the remainder.
5. **Pre-push checks:** Run targeted suites + adversarial probes during narrow intermediate `r2+` deltas, and run the full local gate (full tests, strict typecheck `skipLibCheck: false` if `.d.ts`, preflight/packaging smoke test, docs/lint, `timeout 5`-bounded ReDoS probes, and CI `permissions:`/`concurrency:` checks) before `SHIP NOW` confirmation or whenever shared/cross-cutting files change; commit cleanly.

## 4. Stage 4: Cumulative Follow-Ups and `raw-final`

1. **Cumulative `r2+`:** Save `<auditDir>/day-one-review-r2.md` linking `Prior review: day-one-review-r1.md` and appending Session Provenance. Carry forward every prior Section 4-7 finding ID in Section 7's Closure Table using Section 4-7 statuses (`Open (Pre-Remediation)` or `Closed`), and carry forward residual, deferred, by-design, and informational IDs (`Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, `Closed (By Design)`, or `Informational`) exclusively in **Section 8** (never Section 7). Keep previously `Closed` P1/P2 items as 1-line rows in Section 7 (referencing `r<N>` for their 10-field closure card), reserving full 10-field cards for findings newly opened, re-opened, or closed in the current round. On narrow intermediate deltas (1-2 open IDs without shared/cross-cutting edits), run targeted suites + `timeout 5`-bounded adversarial probes instead of repeating the full multi-suite gate, requiring one full-gate run on the `SHIP NOW` confirmation pass. Log new IDs (`R2-...`), enforce the 2-round escalation rule if an ID stays `Open` in `r3`, and auto-fix new in-repo P0-P3 before `raw-final` or merge.
2. **Unanchored `raw-final`:** Under full launch gate (or on request), spawn one fresh read-only reviewer obeying Stage 2 Anti-Anchoring (`[agy-transcript-access: self-only]` or `deny` on line 1 when `Agy-Context-Saver` is installed; zero prior ledgers/`git log`) for a cold consumer install, compile, and live dogfooding trial.

## 5. Explicit `/swarm` Opt-In

Launch `/swarm` ONLY when requested, pairing with [`swarm-governance`](../../swarm-governance/SKILL.md) (Step 0 `ask_question` for any unspecified settings) in **flat** mode:

1. **Flat specialists:** Run `agy-squad plan --topology flat --read-only --role "Arch/Doc/Skill/MCP Auditor" --role "Runtime/Script/Dep Auditor" --role "Test/Sec Auditor" "<cold Day-1 review task>"` (inline task mode uses `--read-only`; manifest mode sets per-agent `readOnly: true`).
2. **Strict role ordering (Synthesis -> Audit -> Finalize):** After collecting receipts, the **coordinator** verifies cited files/tests, writes `scratch/agy-squad/squad-<id>/lead/report.md` (with plain `Content Verdict: PASS | FAIL | BLOCKED`), and runs `agy-squad verdict` + `agy-squad bundle-init --plan <plan.json> --handoff '<worker>=READY <slot> - <note>' --digest --out <record.json> <verified-files...>`. Next, wake flat **`audit-<id>`** to verify traces via [dual-path trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection) (`Target Squad:`, `Evidence Digest:`, `Integrity Verdict: CLEAN`). Finally, the **coordinator** runs `agy-squad verdict --integrity` + `agy-squad finalize <record.json> --prune` and publishes `day-one-review-r1.md`.
3. **Closure:** Keep `r1` unanchored, post `[done]` and pass [`swarm-governance` Section 5](../../swarm-governance/SKILL.md#5-runtime-closure-checklist-pre-handoff-gate), then run Stage 3 separately with selective resume.
