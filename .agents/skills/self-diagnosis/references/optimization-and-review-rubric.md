# Self-Diagnosis & Optimization Rubric

Pairs `self-diagnosis` with [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md) ([`pr-review`](../../pr-review/SKILL.md)).

## 1. Category Mapping (Standard v1.5.0)

Trace `invariant -> decision (docs/plans/LEDGER.md) -> contract -> code -> verification`; assign one primary category:

| Cat | Focus |
| --- | --- |
| `ARCH` | Architecture decisions (`docs/plans/LEDGER.md`), host vs receipt boundaries, containment, topology. |
| `DOC` | `README.md`, `docs/`, `docs/reviews/` parity with runtime and measured evidence. |
| `SKILL` | `.agents/skills/*/SKILL.md` frontmatter, relative links, entry size/prose share, tool/flag accuracy. |
| `MCP` | `mcp/index.js` JSON-RPC 2.0, `AGY_MAX_STDIO_PAYLOAD_BYTES`, compact `tools/list` schemas. |
| `RUN` | `mcp/{dispatch,briefs,planner}.mjs` symlink/fd checks, `TypeName: "self"`, `modelProvenance`, scope overlaps. |
| `SVC` | `mcp/{handoffs,verdicts}.mjs`, `bin/agy-squad.mjs` receipts, custom `reportRoot`, strict verdicts, atomic bundles. |
| `DB` | Confirm no unreviewed DB state (file-backed bundles audited under `SVC`). |
| `SCRIPT` | `bin/agy-squad.mjs` CLI and `scripts/diagnose.mjs` exit codes and strict arg validation. |
| `TEST` | `tests/test-*.mjs` assertion strength, adversarial cases, concurrency, live verification. |
| `DEP` | `package.json`, `zensical.toml`, `.gitignore`, `.github/workflows/*.yml`. |
| `SEC` | Injection/ReDoS, symlink/fd escapes, isolation/transcript boundaries, secret hygiene, CI `permissions:`/`concurrency:`, fail-closed defaults. |

## 2. Optimization Budgets

| Metric | Target | Warn | Triage |
| --- | --- | --- | --- |
| **`SKILL.md` Size** | `<= 250` L, `<= 10,240` B (~2,500 tok) | `> 300` L, `> 12,288` B, or `> 70%` prose share (`> 8` KiB skill MD) | P2/P3 (`SKILL`) |
| **Specialist Brief** (`RUN-BUDGET-*SPEC`) | `<= 1,600` B fixed template | `> 1,800` B | P3 (`RUN`/`SKILL`) |
| **Lead / Auditor Brief** (`RUN-BUDGET-*LEAD`/`AUDIT`) | `<= 3,100` B fixed template | `> 3,300` B | P3 (`RUN`/`SKILL`) |
| **MCP `tools/list` Schema** | `<= 3,072` B | `> 4,096` B (`MCP-BUDGET-SCHEMA`) | P3 (`MCP`) |
| **Receipt Prefix Headroom** | `PARTIAL <slot> - ` + `@<24-char> ` `<= 188` B (`>= 312` B room in `500` B) | `< 312` B room | P2 (`SVC`/`RUN`) |
| **Sibling `scopeFiles` Overlap** | `0%` | `> 25%` | P2 (writers) / P3 (readers) |
| **Planner / Bundle Latency** | `< 10` ms / `< 20` ms (2-spec) | `> 25` ms / `> 50` ms | P3 (`RUN`/`SVC`) |

## 3. Triage Matrix

| Check | Failure | Cat / Prio | Fix |
| --- | --- | --- | --- |
| **Frontmatter & Links** | Bad YAML or broken relative link (`SKILL-LINKS-*`, `SKILL-REFLINKS-*`) | `SKILL` (P1/P2) | Fix YAML or link/anchor target. |
| **Tool/API Drift** | Active reference to retired Phase 1/2 symbols (`SKILL-DRIFT-*`) | `SKILL` (P2) | Use `squad_planner`, `dispatch_squad` (subagent), `audit-<id>`, `agy-squad` CLI. |
| **Readability** | Plain numbers/statuses/sentences wrapped in backticks | `DOC`/`SKILL` (P3) | Restrict backticks to code identifiers, paths, flags, commands, verdicts. |
| **Capabilities** | Built-in `TypeName` (`research`) or `Workspace !== "inherit"` | `RUN` (P1) | Enforce `TypeName: "self"` and `Workspace: "inherit"` (`mcp/briefs.mjs`). |
| **Verdicts & Receipts** | Non-`PASS` bundled, `> 500` B, multiline, bad sender/slot/delimiter | `SVC` (P1/P2) | Enforce strict enums (`mcp/verdicts.mjs`) and single-line `-`/`--`/em-dash receipts. |
| **MCP & Planner** | Oversized stdio or missing `modelProvenance`/`integrityAuditPlan` | `MCP` (P1/P2) | Enforce `AGY_MAX_STDIO_PAYLOAD_BYTES` and `planSquadCohort` invariants. |
| **Ledger Gate** | Edits/cleanup before ledger update, schema gap, open blockers, umbrella IDs | `DOC`/`SVC` (P1-P3) | Update `docs/reviews/<slug>.md` (`v1.5.0` `1 ID = 1 Row`) first. |
| **Cleanup & Closure** | Lingering `scratch/agy-squad/squad-*`, workers, `monitor`, or tasks | `SVC` (P2) | Run `finalize --prune` / `verify --prune --expected-sha256`, wake same cohort for recheck, pass [`swarm-governance` Section 5](../../swarm-governance/SKILL.md#5-runtime-closure-checklist-pre-handoff-gate). |
