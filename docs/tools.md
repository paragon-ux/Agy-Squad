# Manifest and tool contract

Agy-Squad exposes two MCP tools (`dispatch_squad` in `mcp/dispatch.mjs` and `squad_planner` in `mcp/planner.mjs`) alongside the offline governance CLI (`bin/agy-squad.mjs`, backed by `mcp/briefs.mjs`, `mcp/handoffs.mjs`, and `mcp/verdicts.mjs`).

## `dispatch_squad` (`mcp/dispatch.mjs`)

`dispatch_squad` is the `invoke_subagent` compiler and returns a JSON object with a native `Subagents` array. Each call compiles one stage.

| Argument | Purpose |
| --- | --- |
| `squadId` | Required. Use `all_l1` for working leads, `integrity_auditor` (or `integrity_auditor:<targetSquad>`) for the canonical flat independent integrity auditor, or a squad ID for that squad's specialists. Legacy `adversarial_l1` / `adversarial_flat` / `adversarial_review` stages were removed in PR #5. |
| `manifestPath` | Optional. A relative or absolute path inside the configured workspace. Symlinks must also resolve inside the workspace. |

`mcp/dispatch.mjs` reads `AGY_SQUAD_WORKSPACE` from its launch environment or falls back to `process.cwd()`. With no explicit `manifestPath`, `dispatch_squad` searches for `task-01-manifest.json`, `swarm-manifest.json`, `.scratch/swarm-manifest.json`, and `suite-manifest.json` in that order and loads the first valid squad manifest.

## `squad_planner` (`mcp/planner.mjs` & `agy-squad plan`)

![squad_planner and dispatch_squad inputs, checks, and outputs](assets/manifest-and-modes.svg)

`squad_planner` pairs Agy-Squad governance with Antigravity native `/swarm` (`executionMode: "swarm"`, default) or `invoke_subagent` (`executionMode: "subagent"`), replacing the retired `agy-squad run` PTY launcher (`L17`, `L42`, `L43`). Provide **exactly one** of `manifestPath`, `manifest` (inline `{ squads }`), or `task` (plus optional `scopeFiles`, `roles`), alongside optional `squadId` (omit to plan all squads; `all_l1` is valid only in `dispatch_squad`/`agy-squad dispatch`), `topology` (`flat` | `layered`), `executionMode`, `model`, `workspaceIsolation` (`inherit` | `share` | `branch`), `includeIntegrityAuditor`, `reportRoot`, and `knownModels`. It imposes zero topology default bias (`topology.defaultBias: "none (ask user if unspecified)"`).

- **Explicit model pinning and provenance:** Under `executionMode: "swarm"`, `mcp/planner.mjs` compiles `swarmAdd` entries with explicit `model` pinning and instructs live verification via `swarm{action: "status"}`. Under `executionMode: "subagent"`, `invoke_subagent` accepts only `inherit`, `flash`, `flash_lite`, or `pro`; `modelProvenance` states when a requested model ID cannot be pinned or inspected per child (`read_transcript` and `manage_subagents` do not expose child model IDs).
- **Writable `scopeFiles` overlap checks:** `mcp/planner.mjs` flags overlapping `scopeFiles` across concurrent working specialists while exempting read-only audit squads (`integrity_auditor*`) and explicit boolean `readOnly: true` specs.
- **`L6`-safe `provenanceScaffold` and `bundleRecordTemplates`:** Generates a parent-authored provenance scaffold recording worker names, report slots, and model expectations without copying raw `.system_generated/` transcripts into `scratch/`, plus pre-populated `bundleRecordTemplates` for `agy-squad bundle`.

## Manifest (`mcp/briefs.mjs` & `mcp/dispatch.mjs`)

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

### Manifest structure rules

- **Single-squad validation:** Compiling one working squad validates its specialists and its own `lead` (when defined) without rebuilding unrelated sibling squads.
- **Aliases and reserved IDs:** `children` is an alias for `specialists` (a squad cannot define both). You can place lead fields directly on the squad object instead of under `lead`, as long as you do not mix both forms. `all_l1` is reserved for lead compilation and cannot be used as a squad ID inside `squads`.
- **Canonical casing:** Agent fields in `mcp/briefs.mjs` plus `readOnly` in `mcp/planner.mjs` accept camelCase and non-conflicting PascalCase aliases.

### Agent field contract

| Field | Requirement | Rules and defaults |
| --- | --- | --- |
| `objective` | Required | Plain task statement for the worker or lead. |
| `scopeFiles` | Required (`>= 1`) | Workspace-relative files or directories (`"."` is allowed; absolute paths, `\` separators, `.` or `..` segments, and newlines are rejected by `mcp/briefs.mjs`). |
| `role`, `instructions`, `expectedDeliverable` | Optional | Optional role label, custom guidance, and deliverable description. |
| `typeName` | Optional | Defaults to `self`. Disallowed read-only or sandboxed presets (`research`, `browser`, `image-generator`) are rejected. |
| `model` | Optional | Defaults to `inherit` in `dispatch_squad` (`swarm` mode in `squad_planner` supports explicit model IDs). |
| `workspace` | Optional | Manifest agent `workspace` must be `inherit` in both `dispatch_squad` and `squad_planner` (configure `/swarm` copy isolation via top-level `workspaceIsolation`). |

## Stages and Pointer-Over-Wire

1. **Compile and record launch metadata:** The parent compiles leads with `all_l1` (or specialists directly with a squad ID). An authorized lead compiles its own specialists from the same manifest. Review the compiled payload, pass each object verbatim, and record the operator, shared workspace, acceptance criteria, report slots, evidence checkpoint, and native child IDs from launch receipts.
2. **Write workspace report slots:** Each worker writes one evidence report at `scratch/agy-squad/squad-<encoded-id>/lead/report.md` or `specialist-N/report.md` (or under custom `reportRoot`). Pre-create unused slots before launch, use fresh squad IDs on retries, include source locations or command outputs with exit codes, and preserve contradictions or gaps.
3. **Send `<= 500` byte receipts:** Each child posts one single-line receipt of at most `500` UTF-8 bytes: `READY <report-path> — <concrete observation>`, `PARTIAL <report-path> — <observation and blocker>`, or `NO_REPORT — <reason>`. The parent matches each sender to its assigned slot, ignores exact duplicates, and inspects conflicts.
4. **Yield for Reactive Wakeup:** Wait via Reactive Wakeup, then inspect `/agents` (or `swarm{action: "status"}`) at the evidence checkpoint (10 minutes by default, longer when work requires it). Extend work showing progress, allow for approval waits, and redirect or stop work stuck on identical output. Record agent termination and command cleanup separately.
5. **Enforce the Squad Lead Patrol Gate:** After workers finish or stop, the parent or squad lead audits execution traces, rejects ungrounded or sycophantic reports (`FAIL` or `PARTIAL`), and checks material claims against final files (`Subagent Alignment Policy`: guessing from memory is prohibited; every claim cites an executed tool or primary source line). The lead records its verdict (`Content Verdict: PASS`, `FAIL`, or `BLOCKED`; bare `Verdict:` is accepted only as a legacy alias) and verified file hashes, rechecking changed inputs.
6. **Run the Independent Integrity Auditor (`audit-<targetSquad>` / `integrity_auditor:<targetSquad>`):** After working squads finish and before acceptance, run the flat integrity auditor:
   - **Canonical Flat Integrity Auditor:** On `/swarm`, spawn `audit-<targetSquad>` via `squad_planner` (writing to `scratch/agy-squad/squad-integrity_auditor-<targetSquad>/specialist-1/report.md`). On `invoke_subagent`, call `dispatch_squad({ squadId: "integrity_auditor:<targetSquad>" })` (or `integrity_auditor` for single-squad manifests). The auditor inspects reports and tool traces via single-pass batch queries (`summaryOnly=true` / `lastTurns=10`), records `Target Squad: <targetSquad>`, and outputs strictly `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION` (never a content `PASS`). Legacy `adversarial_l1`, `adversarial_flat`, and `adversarial_review` auto-discovery have been removed.
   - **Acceptance gate:** `node bin/agy-squad.mjs bundle <record.json>` enforces `requireIntegrityAudit: true` by default (pass `--allow-unaudited` or `requireIntegrityAudit: false` to opt out). `bundleReports` in `mcp/handoffs.mjs` hashes the integrity report and embeds `integrityAudit: { path, sha256, verdict, targetSquad }`. `verify` requires the integrity report on disk with an unmodified SHA-256 hash, matching `Target Squad`, and `Integrity Verdict: CLEAN`.

File scope in a brief describes the assignment (see [WSL verification checklist](plans/wsl-cli-verification.md) for historical CLI boundary trials).

## Governance CLI & report cleanup (`bin/agy-squad.mjs`, `mcp/handoffs.mjs`, `mcp/verdicts.mjs`)

Run `node bin/agy-squad.mjs` from the shared workspace root. (`mcp/handoffs.mjs` is the underlying JS library module; its standalone CLI entrypoint was removed in PR #5.) Bundling and pruning support both default (`scratch/agy-squad/squad-<id>/`) and custom `reportRoot` layouts.

### CLI subcommands

| Command | Purpose and inputs |
| --- | --- |
| `dispatch (--squad <id> \| <id>) [--manifest <path>]` | Exposes `dispatch_squad` (`mcp/dispatch.mjs`) for `invoke_subagent` cohorts (`all_l1`, `<squadId>`, or `integrity_auditor[:<target>]`). |
| `plan (--manifest <path> \| "<task>") [options]` | Exposes `squad_planner` (`mcp/planner.mjs`) from the CLI. In `swarm` mode, bundle templates use each swarm member name as `assignments[].conversationId` and `handoffs[].sender`. |
| `verdict [--integrity] <report.md>` | Calls `mcp/verdicts.mjs` (`parseContentVerdict` or `parseIntegrityVerdict`) to parse a strict single-line `Content Verdict: PASS\|FAIL\|BLOCKED` (legacy alias `Verdict: ...`), or `Integrity Verdict: CLEAN\|INTEGRITY VIOLATION` with `--integrity`, rejecting hedged or conflicting lines. |
| `fingerprint <file...>` | Maps workspace-relative file paths to SHA-256 digests for `verifiedFiles`. Capture hashes before and after checks on final work inputs. |
| `inspect <record.json>` | Checks the recorded cohort against native messages and readable reports (`workspace`, ordered `assignments` with `conversationId` and `report`, and `handoffs` with native `sender` and exact `message`). |
| `bundle <record.json> [--allow-unaudited]` | Requires `squadId`, synthesizer `verdict: "PASS"`, `verifiedFiles` hashes (excluding report and bundle slots), and an unambiguous `PASS` in `lead/report.md` after stripping fenced (` ``` ` / ` ~~~ `) and CommonMark inline backtick code spans. Enforces `requireIntegrityAudit: true` unless `--allow-unaudited` is passed, and writes `lead/report.sources.json`. |
| `verify <report.sources.json>` | Checks the bundle, synthesis, `integrityAudit` (on disk, matching `squadId`, `Integrity Verdict: CLEAN`), final inputs, and any loose reports against recorded SHA-256 digests. |
| `prune <report.sources.json> <accepted-sha256> [--keep-reports]` | Deletes matching loose specialist reports after `bundle` and `verify` pass, unless `--keep-reports` or `retainReports: true` is set. Failed, blocked, changed, and shell-disabled runs keep their loose reports. |

### `agy-squad plan` and governance flags

| Flag | Applies to | Behavior |
| --- | --- | --- |
| `--manifest <path>` | `plan` | Load squads from a workspace manifest file (mutually exclusive with positional `<task>`). |
| `--squad <id>` | `plan` | Target a specific squad ID in the manifest. |
| `--topology flat\|layered` | `plan` | Override multi-squad compilation topology (`flat` strips leads; `layered` requires leads). |
| `--mode swarm\|subagent` | `plan` | Select native `/swarm` (`swarm`, default) or `invoke_subagent` (`subagent`). |
| `--model <id>` | `plan` | Pin a model ID for workers (under `swarm` mode, marks models `unverified` unless listed via `--known-model`). |
| `--known-model <id>` | `plan` | Repeatable. Supplies allowed model IDs from `swarm{action: "models"}`; pinned models outside the list are rejected. |
| `--workspace-isolation inherit\|share\|branch` | `plan` | Choose Antigravity `/swarm` worker workspace mode (`inherit`, `share`, or `branch`). |
| `--scope <path>` | `plan` | Repeatable. Workspace-relative scope paths for task-based planning. |
| `--role <title>` | `plan` | Repeatable. Specialist role titles for task-based planning. |
| `--no-integrity` | `plan` | Omit the `integrity_auditor` plan stage and set `requireIntegrityAudit: false` in `bundleRecordTemplates`. |
| `--report-root <path>` | `plan` | Custom workspace-relative root for report slots instead of `scratch/agy-squad`. |
| `--integrity` | `verdict` | Parse `Integrity Verdict: CLEAN\|INTEGRITY VIOLATION` instead of a content verdict. |
| `--allow-unaudited` | `bundle` | Opt out of the default `requireIntegrityAudit: true` gate. |
| `--keep-reports` | `prune` | Retain loose `specialist-<N>/report.md` files after `bundle` and `verify` succeed. |
