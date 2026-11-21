# Day-One Review Protocol (PR Review Standard v1.5.0)

This reference defines the exact non-digressing workflow for [../SKILL.md](../SKILL.md). It pairs with [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md) and applies to **any target repository or product** requested by the user (CLIs, IDE plugins, libraries, APIs, or web applications).

---

## 1. Stage 1: Cadence Intake & Designated Audit Workspace

1. **Upfront cadence intake (zero anti-anchoring bleed):** Before launching `r1`, ask the user which review cadence and stop criteria they want:
   - **Single-round cold audit (`r1` only):** produce the read-only `r1` report and 4-tier ship verdict, then stop.
   - **Multi-round (`r1` -> remediate -> `r2` cumulative):** iterate until the target ship verdict passes cleanly.
   - **Full public-launch gate (`r1` -> remediate -> `r2` -> unanchored live `raw-final`):** run an unanchored consumer live trial before merging or tagging.
   Restrict this intake strictly to workflow cadence and stop criteria; never ask for or inject bug hypotheses, suspected areas, or prior fix claims so Stage 2 Anti-Anchoring remains intact.
2. **Default directory:** `scratch/day-one-review/` inside the target repository (or a user-designated path when specified).
3. **Hygiene check:** Confirm `scratch/` (or the designated audit folder) is gitignored and excluded from release archives/tarballs so review ledgers never accidentally ship in public packages. Write under `docs/reviews/` only when the user explicitly requests a committed in-repo ledger.
4. **File naming lineage:**
   - Initial raw cold pass: `<auditDir>/day-one-review-r1.md`
   - Cumulative follow-up passes: `<auditDir>/day-one-review-r2.md`, `day-one-review-r3.md`, ...
   - Unanchored live final gate before tagging: `<auditDir>/day-one-review-raw-final.md`
5. **Provenance pin:** Record repository path/URL, branch, `HEAD` SHA, uncommitted working-tree state, OS/runtime versions, chosen cadence, and Session Provenance before inspecting files.

---

## 2. Stage 2: Raw, Unguided Initial Review (`r1`)

### Anti-Anchoring Rules (Mandatory on `r1` and `raw-final`)
- **Hook-enforced isolation:** Whenever `Agy-Context-Saver` is installed, place `[agy-transcript-access: deny]` on the first non-empty line of every `r1` and `raw-final` subagent prompt so the reviewer cannot read parent or prior review transcripts.
- **Do NOT read** prior review ledgers (`docs/reviews/*`, `scratch/day-one-review/day-one-review-r*.md`), internal maintainer plans (`docs/plans/*`), `git log` / PR self-summaries, or user-supplied hypotheses before completing independent outside-in inspection.
- **Zero leading briefs:** When spawning a read-only `invoke_subagent` reviewer (or opt-in `/swarm` specialists), pass ONLY the repository root, pinned commit/branch, output slot/path, and the cold Day-1 persona. Never inject prior finding IDs or "verify that X works" hints.
- **Strictly read-only:** Do not edit repository files or leave artifacts in the repo root during a review pass.

### Mandatory Live Consumer Install & Outside-In Inspection Order
Do not rely on static source reading alone during `r1`. Pack the release artifact (for example `npm pack --pack-destination /tmp/...`, `python -m build`, or cargo/go release artifact), install it into a disposable consumer project outside the checkout (testing both normal install and `--ignore-scripts` where applicable), compile public TypeScript/SDK types with strict settings (`tsc --noEmit --strict` with `skipLibCheck: false` when `.d.ts` files ship), and dogfood the CLI, SDK, and MCP surfaces live against an unrelated or disposable repo copy. Clean up all temporary directories and test daemons before finishing.

Walk the repository in the exact order a real external developer experiences it on Day 1, and record a **User-Journey Trace Matrix** inside Section 3 alongside the architecture trace:

| User Journey | Promised Contract | Actual Experience on Disk / Runtime | Test Coverage | Verdict |
| --- | --- | --- | --- | --- |
| 1. First 60 seconds (`README`, visuals/jargon, Quickstart, package/site metadata) | `<claim>` | `<observed reality + file:line>` | `<tests or gap>` | `Satisfied / Mismatch / Gap` |
| 2. Clean install, setup, upgrade & rollback (fresh host, `--ignore-scripts`, off-`PATH`, cross-OS, strict public typecheck) | | | | |
| 3. Everyday usage inside an unrelated user project (zero repo-checkout assumptions, live CLI/SDK/MCP dogfooding, clear errors) | | | | |
| 4. Security & trust optics (`4.11 SEC`: execution surface, downloads/checksums, permissions, secret hygiene, linear-time regex / ReDoS, CI workflow `permissions:` / `concurrency:`, uninstall cleanliness) | | | | |
| 5. Packaging, CI & release pipeline (published allowlist, exact artifact parity, multi-OS CI, release notes) | | | | |

### Report Structure, P3 vs. Section 8 Boundary & 4-Tier Ship Verdict
Conform strictly to [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md) Sections 1-8:
- All **11 mandatory categories** (`4.1 ARCH`, `4.2 DOC`, `4.3 SKILL`, `4.4 MCP`, `4.5 RUN`, `4.6 SVC`, `4.7 DB`, `4.8 SCRIPT`, `4.9 TEST`, `4.10 DEP`, `4.11 SEC`), marking categories that do not apply to the target repository `Not applicable` with a concrete reason (never silently omitted). Under `4.11 SEC`, explicitly check CodeQL-class issues including polynomial/exponential regexes (ReDoS on untrusted input) and least-privilege GitHub Actions `permissions:` and `concurrency:` scoping.
- Strict **`1 ID = 1 Row`** (10-field records for P0-P2; compact table rows for P3; mandatory Section 8 sink for residuals, deferred, by-design, and informational items).
- **Sharp P3 vs. Section 8 triage boundary:**
  - Classify as **P3** strictly concrete, unambiguous, user-visible in-repo defects (typos, stale doc counts, misleading schema descriptions, missing non-breaking validation, stray internal audit tags in public docs, leaked temp test dirs). Every P3 is auto-remediated in Stage 3 without asking.
  - Route exclusively to **Section 8 (`Post-Remediation Residuals & Deferred Dispositions`)** items that require a human decision: external/upstream dependencies outside the repository, intentional behavior or contract trade-offs that could break existing suites or users, policy-gated files (such as benchmark definitions), and subjective polish suggestions.
- Explicit **4-Tier Day-1 Ship Verdict** in Section 7:
  - **`SHIP NOW`**: `0` open P0/P1/P2/P3 actionable in-repo defects (only tracked Section 8 residuals, upstream deferrals, or informational notes remain, if any).
  - **`SHIP WITH MINOR POLISH`**: `0` P0/P1/SEC blockers and at most `<= 2` small, localized P2/P3 polish items with zero broken consumer install, compile, SDK, or core-command contracts.
  - **`FIX BEFORE RELEASE`**: `0` P0/P1/SEC blockers, but **`>= 3` open P2/P3 items** or any P2 breaking consumer compilation, installation, or core documented workflows (under Stage 3, all concrete in-repo P0-P3 defects are fixed automatically to reach `SHIP NOW`).
  - **`HOLD BEFORE PUBLIC RELEASE`**: Any open P0/P1 blocker, any unresolved `SEC` vulnerability, or any unreviewed material category.

---

## 3. Stage 3: Remediation (P0-P3 Auto-Fix, Section 8 Residuals & Selective Resume)

1. **Fix P0-P3 automatically; ask only on Section 8 residuals:** In a Day-1 public-launch review, **P3 defects are visible user-facing launch issues and MUST be remediated automatically alongside P0-P2, no questions asked.** Do not ask the user whether to skip P3s. Pause to ask the user **only** for Section 8 decision-gate items (upstream/external dependencies, intentional contract/behavior trade-offs that could break existing tests or users, or policy-gated files such as benchmark definitions). Ensure git state is clean (create a remediation branch or record baseline SHA) before editing files.
2. **CPU/daemon serialization rule (single subagent default for heavy runtimes):** Default Stage 3 remediation to a **single coding subagent** whenever the target repository uses native indexers, local daemons, SQLite/database locks, or CPU-heavy build/test harnesses so parallel workers do not spawn competing indexers or starve host cores. Reserve multiple parallel coding subagents (with strictly disjoint file scopes mapped to atomic finding IDs) for lightweight, independent modules only.
3. **Interruption & Selective Resume Protocol (Non-Negotiable):**
   - If implementation is interrupted by a rate limit (`429`), timeout, disconnect, user pause, or session restart:
     1. Run `manage_subagents(Action='list')` to inspect live state across all direct subagents.
     2. **Resume ONLY the interrupted/paused subagent(s)** (never send unsolicited `send_message` nudges to healthy, actively working subagents; do not interrupt them).
     3. **Never launch fresh replacement coding subagents** when the existing interrupted subagent can be resumed cleanly.
   - **Permanent worker death fallback (Recovery Audit First):** Only when an interrupted subagent has permanently exited/died mid-edit and cannot be resumed in place:
     1. Run a read-only **recovery audit** first inspecting `git diff` / `git status` AND the deceased subagent's full transcript (single-pass batch inspection of `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` and `transcript_full.jsonl` when standalone, or `agy-context transcript` when `Agy-Context-Saver` is installed, without copying raw logs into workspace/scratch files) to classify every assigned finding ID as `Completed`, `Partially Completed`, or `Unremediated`.
     2. Complete **only** the `Partially Completed` and `Unremediated` remainder without overwriting verified work.
4. **Local, packaging & CodeQL-class pre-push verification:** Run the target repository's test suite, strict consumer typecheck (`skipLibCheck: false` when shipping `.d.ts`), `preflight`, packaging dry-run/smoke test, docs/lint build, and CodeQL-class security checks (linear-time regex / ReDoS inspection on modified parsers/routers and least-privilege GitHub Actions `permissions:` / `concurrency:` checks), then commit fixes cleanly before starting Stage 4.

---

## 4. Stage 4: Cumulative Follow-Up Reviews & Unanchored `raw-final`

1. **Follow-up reviews build on the initial review (`r2`, `r3`, ...):**
   - Save `<auditDir>/day-one-review-r2.md` (and `r3`, ...) in the same designated directory, explicitly linking `Prior review: day-one-review-r1.md` in Section 1.1 and appending the new session row to Section 1.2 (`Session Provenance`).
   - Carry forward **every prior finding ID** in the closure table with its updated canonical status (`Closed`, `Residual (Open)`, `Closed (Post-Remediation)`, `Deferred / Won't Fix`, `Closed (By Design)`); never silently drop or renumber an ID.
   - Re-verify each fix in its primary category and all affected categories at the new commit, and record any newly discovered defects or regressions with fresh atomic IDs (`R2-...`).
   - Route every post-remediation decision-gate residual or upstream deferral exclusively to Section 8; any concrete in-repo P0-P3 defect newly found in `r2` is fixed automatically before moving to `raw-final` or merge.
2. **Unanchored Live Final Pass (`day-one-review-raw-final.md`):**
   - Required under the **full public-launch gate** cadence (or whenever requested before tagging/releasing). Spawn one fresh read-only reviewer obeying all Stage 2 Anti-Anchoring Rules (adding `[agy-transcript-access: deny]` on line 1 when `Agy-Context-Saver` is installed, with zero prior `r1..rN` ledgers or `git log` read) to execute a cold packed-artifact consumer install, strict SDK compile, and live CLI/MCP dogfooding pass to catch blind spots missed during guided follow-ups.

---

## 5. Explicit `/swarm` Opt-In: Flat Category Specialists + Flat Auditor

Do **not** launch `/swarm` by default for `day-one-review`. Only when the user **explicitly asks for `/swarm`**, pair with [swarm-governance](../../swarm-governance/SKILL.md) using a **flat `/swarm`** mirroring flat `self-diagnosis`, generalized completely to the requested target repository (never hardcoded to `Agy-Squad` or `Agy-Context-Saver`):

1. **Flat category-specialist split:** Compile a flat single-squad plan via `squad_planner` (`agy-squad plan --topology flat --read-only`) partitioning the 11 Standard `v1.5.0` categories across read-only specialists tailored to the target repo's actual layout, for example:
   - **Specialist 1 (`ARCH`, `DOC`, `SKILL`, `MCP`):** First 60s onboarding, architecture/contracts, public API/CLI/schema docs, diagrams & jargon.
   - **Specialist 2 (`RUN`, `SVC`, `DB`, `SCRIPT`, `DEP`):** Clean install/upgrade/rollback, core runtime behavior, persistence, packaging & dependency boundaries.
   - **Specialist 3 (`TEST`, `SEC`):** Adversarial test & CI strength plus `4.11 SEC` security, injection, containment, secrets, and supply-chain posture.
   *(Adjust specialist count cleanly when categories such as `SKILL`, `MCP`, or `DB` are `Not applicable` for the target repo.)*
2. **Flat Integrity Auditor (`audit-<id>`):** Always pair the flat working specialists with one independent flat `audit-<id>` worker verifying real tool traces (standalone native Antigravity: single-pass batch inspection of `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` matching Step 0/1 `sender=<coordId>` + `@<workerName>` without copying raw JSONL into `scratch/`; when `Agy-Context-Saver` is installed: single-pass `agy-context transcript` or coordinator `export --sanitized`) and SHA-256 evidence digests (`Integrity Verdict: CLEAN | INTEGRITY VIOLATION`), plus `agy-squad finalize` bundle verification before accepting the synthesis into `scratch/day-one-review/day-one-review-r1.md`.
3. **Preserve all core invariants:** Keep `r1` briefs unanchored (zero prior review ledgers/hints), keep `monitor`/`narrator` strictly observational, post `[done]` and run the 4-check closure gate when finished, and execute Stage 3 remediation separately with selective resume on interruption.
