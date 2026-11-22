# Day-One Review Protocol (PR Review Standard v1.5.0)

Workflow reference for [../SKILL.md](../SKILL.md) under [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md). Applies to any target repo (CLIs, plugins, libraries, APIs, web apps).

## 1. Stage 1: Cadence Intake and Audit Workspace

1. **Cadence intake (zero anchoring):** Ask strictly for cadence/stop criteria before `r1` (never bug hypotheses or prior fix claims):
   - **Single-round (`r1` only):** cold audit + 4-tier verdict, then stop.
   - **Multi-round (`r1` -> remediate -> `r2`):** iterate cumulatively until target verdict passes.
   - **Full public-launch gate (`r1` -> remediate -> `r2` -> `raw-final`):** add one unanchored live consumer trial before merge/tag.
2. **Workspace & hygiene:** Default `scratch/day-one-review/` (or user path); confirm `.gitignore` and release-tarball exclusion. Write `docs/reviews/` only if explicitly requested.
3. **Lineage & pin:** `<auditDir>/day-one-review-r1.md`, `day-one-review-r2.md` (`r3`...), `day-one-review-raw-final.md`. Pin repo, branch, `HEAD`, dirty state, runtime, cadence, and Session Provenance first.

## 2. Stage 2: Raw, Unguided Initial Review (`r1`)

### Anti-Anchoring (`r1` and `raw-final`)
- Prepend `[agy-transcript-access: deny]` on line 1 of `r1` and `raw-final` subagent prompts when `Agy-Context-Saver` is installed.
- Do not read `docs/reviews/*`, `scratch/day-one-review/day-one-review-r*.md`, `docs/plans/*`, `git log`, PR summaries, or hints before outside-in inspection.
- Pass only repo root, pinned commit/branch, output path, and cold Day-1 persona. Never edit repo files during review passes.

### Live Consumer Install & Journeys
Pack the release artifact (`npm pack`, `python -m build`, etc.), install into a disposable consumer project outside the checkout (normal + `--ignore-scripts`), compile public types strictly (`tsc --noEmit --strict`, `skipLibCheck: false` if `.d.ts` ships), and dogfood CLI/SDK/MCP live. Clean up temp dirs/daemons afterward.

Record this **User-Journey Trace Matrix** in Section 3 alongside the architecture trace:

| Journey | Promised | Actual (`file:line`) | Coverage | Verdict |
| --- | --- | --- | --- | --- |
| 1. First 60s (`README`, Quickstart, metadata, jargon) | `<claim>` | `<reality>` | `<tests/gap>` | `Satisfied/Mismatch/Gap` |
| 2. Clean install, upgrade, rollback (`--ignore-scripts`, off-`PATH`, `skipLibCheck: false`) | | | | |
| 3. Everyday use in an unrelated project (live CLI/SDK/MCP, error clarity) | | | | |
| 4. Security & trust (`4.11 SEC`: surface, checksums, secrets, ReDoS, CI `permissions:`/`concurrency:`, uninstall) | | | | |
| 5. Packaging, CI & release (allowlist, artifact parity, multi-OS CI, release notes) | | | | |

### P3 vs. Section 8 Boundary & 4-Tier Ship Verdict
Follow Standard `v1.5.0` Sections 1-8 across all **11 categories** (`ARCH`..`DEP`, `SEC`; check ReDoS and CI `permissions:`/`concurrency:` under `4.11 SEC`) with `1 ID = 1 Row`:

- **P3 (auto-fixed in Stage 3):** Concrete, unambiguous, user-visible in-repo defects (typos, stale counts, bad schema docs, missing non-breaking validation, stray internal tags, leaked temp dirs).
- **Section 8 (human decision gate):** Upstream/external deps, intentional contract trade-offs risking breakage, policy-gated files (benchmarks), and subjective polish.
- **4-Tier Verdict (Section 7):**
  - **`SHIP NOW`**: `0` open P0/P1/P2/P3 in-repo defects (only tracked Section 8 residuals/deferrals/informational notes, if any).
  - **`SHIP WITH MINOR POLISH`**: `0` P0/P1/SEC blockers and `<= 2` small localized P2/P3 polish items with zero broken install/compile/SDK/core contracts.
  - **`FIX BEFORE RELEASE`**: `0` P0/P1/SEC blockers, but `>= 3` open P2/P3 items or any P2 breaking compile, install, or core workflows (auto-fixed in Stage 3 to reach `SHIP NOW`).
  - **`HOLD BEFORE PUBLIC RELEASE`**: Any open P0/P1 blocker, unresolved `SEC` flaw, or unreviewed material category.

## 3. Stage 3: Remediation and Selective Resume

1. **Auto-fix P0-P3; ask only on Section 8:** Checkpoint clean git state, then fix every concrete in-repo P0-P3 defect automatically without asking to skip P3s. Pause only on Section 8 decision items.
2. **CPU/daemon serialization:** Default to a **single coding subagent** when native indexers, local daemons, SQLite/DB locks, or heavy build harnesses exist; parallelize disjoint files only for lightweight modules.
3. **Selective Resume:** Inspect `manage_subagents(Action='list')`, resume **ONLY** interrupted subagents, never message healthy workers, and never spawn duplicate replacements. If a worker died permanently, run a read-only recovery audit first (`git diff` + single-pass transcript read per [dual-path trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection)) classifying IDs as `Completed`, `Partially Completed`, or `Unremediated`, then finish only the remainder.
4. **Pre-push checks:** Run tests, strict typecheck (`skipLibCheck: false` if `.d.ts`), preflight/packaging smoke test, docs/lint, ReDoS inspection, and CI `permissions:`/`concurrency:` checks; commit cleanly.

## 4. Stage 4: Cumulative Follow-Ups and `raw-final`

1. **Cumulative `r2+`:** Save `<auditDir>/day-one-review-r2.md` linking `Prior review: day-one-review-r1.md` and appending Session Provenance. Carry forward every prior ID in Section 7 closure using Section 4-7 statuses (`Open (Pre-Remediation)` or `Closed`) and route residual/deferred/by-design statuses (`Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, `Closed (By Design)`) exclusively to **Section 8**. Re-verify fixes across affected categories, log new IDs (`R2-...`), and auto-fix new in-repo P0-P3 before `raw-final` or merge.
2. **Unanchored `raw-final`:** Under full launch gate (or on request), spawn one fresh read-only reviewer obeying Stage 2 Anti-Anchoring (`[agy-transcript-access: deny]` on line 1 when `Agy-Context-Saver` is installed; zero prior ledgers/`git log`) for a cold consumer install, compile, and live dogfooding trial.

## 5. Explicit `/swarm` Opt-In

Launch `/swarm` ONLY when requested, pairing with [`swarm-governance`](../../swarm-governance/SKILL.md) (Step 0 `ask_question` for any unspecified settings) in **flat** mode:

1. **Flat specialists:** Run `agy-squad plan --topology flat --read-only --role "Arch/Doc/Skill/MCP Auditor" --role "Runtime/Script/Dep Auditor" --role "Test/Sec Auditor" "<cold Day-1 review task>"` (inline task mode uses `--read-only`; manifest mode sets per-agent `readOnly: true`).
2. **Strict role ordering (Synthesis -> Audit -> Finalize):** After collecting receipts, the **coordinator** verifies cited files/tests, writes `scratch/agy-squad/squad-<id>/lead/report.md` (with plain `Content Verdict: PASS | FAIL | BLOCKED`), and runs `agy-squad verdict` + `agy-squad bundle-init --plan <plan.json> --handoff '<worker>=READY <slot> - <note>' --digest --out <record.json> <verified-files...>`. Next, wake flat **`audit-<id>`** to verify traces via [dual-path trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection) (`Target Squad:`, `Evidence Digest:`, `Integrity Verdict: CLEAN`). Finally, the **coordinator** runs `agy-squad verdict --integrity` + `agy-squad finalize <record.json> --prune` and publishes `day-one-review-r1.md`.
3. **Closure:** Keep `r1` unanchored, post `[done]` and pass [`swarm-governance` Section 5](../../swarm-governance/SKILL.md#5-runtime-closure-checklist-pre-handoff-gate), then run Stage 3 separately with selective resume.
