# dispatch_squad

`dispatch_squad` returns a JSON object with a native `Subagents` array. Each call compiles a single stage.

| Argument | Purpose |
| --- | --- |
| `squadId` | Required. Use `all_l1` for working leads, `integrity_auditor` (or `integrity_auditor:<targetSquad>`) for a flat independent integrity auditor, `adversarial_l1` / `adversarial_flat` / `adversarial_review` for legacy adversarial cohorts, or a squad ID for that squad's specialists. |
| `manifestPath` | Optional. A relative or absolute path inside the configured workspace. Symlinks must also resolve inside the workspace. |

The server uses `AGY_SQUAD_WORKSPACE` from its launch environment or its working directory. With no explicit `manifestPath`, the server looks for `task-01-manifest.json`, `swarm-manifest.json`, `.scratch/swarm-manifest.json`, and `suite-manifest.json`, in that order, and uses the first valid squad manifest.

## `squad_planner` (MCP tool & `agy-squad plan` CLI)

`squad_planner` pairs Agy-Squad governance with Antigravity native `/swarm` (`executionMode: "swarm"`, default) or `invoke_subagent` (`executionMode: "subagent"`), replacing the retired `agy-squad run` PTY launcher (`L17`, `L42`, `L43`). Provide **exactly one** of `manifestPath`, `manifest` (inline `{ squads }`), or `task` (plus optional `scopeFiles`, `roles`), alongside optional `squadId`, `executionMode`, `model`, `workspaceIsolation` (`inherit` | `share` | `branch`), `includeIntegrityAuditor`, and `reportRoot`.

- **Explicit Model Pinning & Provenance:** Under `executionMode: "swarm"`, `squad_planner` compiles `swarmAdd` entries with explicit `model` pinning and instructs live verification via `swarm{action: "status"}`. Under `executionMode: "subagent"`, `invoke_subagent` accepts only `inherit`, `flash`, `flash_lite`, or `pro`; `modelProvenance` explicitly discloses when a requested model ID cannot be pinned or inspected per child (`read_transcript` and `manage_subagents` do not expose child model IDs).
- **Writable `scopeFiles` Overlap Diagnostics:** Detects overlapping `scopeFiles` across concurrent working specialists while exempting read-only audit squads (`integrity_auditor*`, `adversarial_review`) and explicit `readOnly: true` specs.
- **`L6`-Safe `provenanceScaffold` & `bundleRecordTemplates`:** Generates a parent-authored provenance scaffold recording worker names, report slots, and model expectations without copying raw `.system_generated/` transcripts into `scratch/`, plus pre-populated `bundleRecordTemplates` for `agy-squad bundle`.

## Manifest

```json
{
  "squads": {
    "storage": {
      "lead": {
        "role": "Storage Lead",
        "objective": "Summarize the storage review",
        "scopeFiles": ["src/storage.js"]
      },
      "specialists": [
        {
          "role": "WAL Reviewer",
          "objective": "Review the write-ahead log",
          "scopeFiles": ["src/wal.js"]
        }
      ]
    }
  }
}
```

`children` is an alias for `specialists` (a squad cannot define both). A lead can also be specified directly on the squad object rather than under `lead` (a squad cannot mix `lead` with top-level lead fields, and `all_l1` is reserved for lead compilation and cannot be used as a squad ID in `squads`). Compiling a single working squad validates its specialists and its own lead (when defined) without rebuilding unrelated sibling squads. Each agent needs an objective and at least one workspace-relative scope file or directory (`"."` is allowed; absolute paths, `\` separators, `.` segments, `..` segments, and newlines are rejected). Optional fields include `role`, `instructions`, `expectedDeliverable`, `typeName`, `model`, and `workspace` (canonical camelCase fields also accept non-conflicting PascalCase aliases). The native `typeName` defaults to `self` for leads and specialists (disallowed built-in read-only/sandboxed presets `research`, `browser`, and `image-generator` are rejected). `model` defaults to `inherit`, and `workspace` must be `inherit` so report slots stay in the shared workspace.

## Stages and Pointer-Over-Wire

1. The main agent compiles the leads with `all_l1`. An authorized lead compiles its specialists using its squad ID and the same manifest. Review the payload before native launch and pass each compiled object verbatim. Record the operator, shared workspace, acceptance criteria, report slots, and evidence checkpoint before launch. Record the native child IDs from the launch receipts.
2. Each subagent writes one evidence report at its assigned `scratch/agy-squad/squad-<encoded-id>/lead/report.md` or `specialist-N/report.md` slot in the shared workspace. Prepare unused slots before launch and use fresh squad IDs on retries. Include exact source locations and observed excerpts, or commands, working directories, relevant inputs, exit codes, and supporting output. Preserve contradictions and gaps.
3. Send one single-line native message of at most 500 UTF-8 bytes. Use `READY <report-path> — <concrete observation>`, `PARTIAL <report-path> — <observation and blocker>`, or `NO_REPORT — <reason>`. Match the native sender to the assigned slot, ignore exact duplicates, and investigate conflicts. The message is an evidence locator and a claim for review.
4. Yield for Reactive Wakeup. The operator checks `/agents` at the evidence checkpoint, even when no child sends a message. Use ten minutes by default, with a longer interval for work that needs it. Extend work with demonstrated progress, account for approval waits, and redirect or stop work that keeps returning the same result. Retrying after a transient failure, a change to inputs, or a distinct diagnostic is valid. Tool counts are telemetry unless the operator specifies a resource ceiling. Record agent termination and command cleanup separately.
5. After relevant writers finish or stop, the parent or squad lead enforces the **Squad Lead Patrol & Alignment Gate**: audit leaf execution traces, reject ungrounded or sycophantic reports (`FAIL` or `PARTIAL`), and independently verify material claims against final artifacts. Specialists must follow the **Subagent Alignment Policy**: parametric guessing is strictly forbidden; every claim must cite an executed tool or primary source line. The lead records its own verified verdict and the hashes checked. Recheck changed inputs. Preserve partial evidence and treat missing required verification as blocked. Apply the same standard when the primary reviews a lead.
6. **Independent Integrity Auditor (Pre-Acceptance Gate):** After working squads complete and before acceptance, run the flat integrity auditor (separate from content `PASS`/`FAIL`/`BLOCKED` review):
   - **Flat Integrity Auditor (Recommended):** Run `dispatch_squad({ squadId: "integrity_auditor:<targetSquad>" })` (or `integrity_auditor` for single-squad manifests) to compile an independent `Integrity Auditor` into `scratch/agy-squad/squad-integrity_auditor-<targetSquad>/specialist-1/report.md`. The auditor inspects reports and tool traces via single-pass batch transcript queries (`summaryOnly=true` / `lastTurns=10`), records `Target Squad: <targetSquad>`, and outputs strictly `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION` (never a content `PASS`).
   - **Legacy Adversarial Dispatch:** `adversarial_l1` and `adversarial_flat` remain supported for backward compatibility.
   - **Acceptance Gate:** `node bin/agy-squad.mjs bundle <record.json>` enforces `requireIntegrityAudit: true` by default (pass `--allow-unaudited` or `requireIntegrityAudit: false` to opt out). `bundleReports` programmatically hashes the integrity report and embeds `integrityAudit: { path, sha256, verdict, targetSquad }`. `verify` requires the integrity report to remain present on disk with an unmodified SHA-256 hash, matching `Target Squad`, and `Integrity Verdict: CLEAN`.

File scope in a brief describes the assignment (see [WSL verification checklist](plans/wsl-cli-verification.md) for historical CLI boundary trials).

## Governance CLI & report cleanup (`bin/agy-squad.mjs` & `mcp/handoffs.mjs`)

Run `node bin/agy-squad.mjs` (or `node mcp/handoffs.mjs`) from the shared workspace root. Bundling and pruning support both default (`scratch/agy-squad/squad-…`) and custom `reportRoot` layouts.

- `plan ...` exposes `squad_planner` from the CLI (`--manifest` or `<task>`, `--squad`, `--mode swarm|subagent`, `--model`, `--workspace-isolation`, `--scope`, `--role`, `--no-integrity`, `--report-root`).

- `verdict [--integrity] <report.md>` strictly parses a single-line `Content Verdict: PASS|FAIL|BLOCKED` (or `Verdict: ...`), or `Integrity Verdict: CLEAN|INTEGRITY VIOLATION` with `--integrity`, rejecting hedged or contradictory lines.
- `fingerprint <file...>` returns workspace-relative paths mapped to SHA-256. Capture hashes before and after independent checks on final work inputs.
- `inspect <record.json>` checks the recorded cohort against the native messages and readable reports. The record contains an absolute `workspace`, ordered `assignments` with `conversationId` and `report`, and `handoffs` with native `sender` and exact `message`.
- `bundle <record.json> [--allow-unaudited]` requires `squadId`, the synthesizer's `verdict: "PASS"`, `verifiedFiles` containing the hashes of the final work inputs (excluding the squad's report and bundle slots), and an unambiguous strict `PASS` verdict recorded in the synthesis at `lead/report.md` after stripping fenced (` ``` ` / ` ~~~ `) and CommonMark inline backtick code spans. `bin/agy-squad.mjs bundle` enforces `requireIntegrityAudit: true` by default unless `--allow-unaudited` is passed. It publishes `lead/report.sources.json` with the exact Markdown and hashes of the original reports and any `integrityAudit` entry.
- `verify <report.sources.json>` checks the bundle, synthesis, `integrityAudit` (present on disk, matching `squadId`, `Integrity Verdict: CLEAN`), final inputs, and any loose reports against their recorded hashes. `prune <report.sources.json> <accepted-sha256> [--keep-reports]` removes matching loose reports unless `--keep-reports` or `retainReports: true` is set. Failed, blocked, changed, and shell-disabled runs keep their loose reports.
