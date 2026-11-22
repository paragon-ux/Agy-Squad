# Manifest and tool contract

Agy-Squad exposes two MCP tools (`dispatch_squad` in `mcp/dispatch.mjs` and `squad_planner` in `mcp/planner.mjs`) alongside the offline governance CLI (`bin/agy-squad.mjs`, backed by `mcp/briefs.mjs`, `mcp/handoffs.mjs`, and `mcp/verdicts.mjs`).

## `dispatch_squad` (`mcp/dispatch.mjs`)

`dispatch_squad` is the `invoke_subagent` compiler and returns a JSON object with a native `Subagents` array. Each call compiles one stage.

| Argument | Purpose |
| --- | --- |
| `squadId` | Required. Use `all_l1` for working leads, `integrity_auditor` (or `integrity_auditor:<targetSquad>`) for the canonical flat independent integrity auditor, or a squad ID for that squad's specialists. Legacy `adversarial_l1` / `adversarial_flat` / `adversarial_review` stages were removed in PR #5. |
| `manifestPath` | Optional. A relative or absolute path inside the configured workspace. Symlinks must also resolve inside the workspace. |
| `workspace` | Optional. Active repository directory path; overrides MCP initialize roots, `AGY_SQUAD_WORKSPACE`, and server `cwd` when running from a global plugin install. |

`mcp/index.js` captures MCP `initialize` workspace roots (`workspaceFolders`/`rootUri`/`rootPath`) as the session default and passes `args.workspace`, that initialize root, `AGY_SQUAD_WORKSPACE`, or `process.cwd()` into `mcp/dispatch.mjs` and `mcp/planner.mjs`. With no explicit `manifestPath`, `dispatch_squad` searches for `task-01-manifest.json`, `swarm-manifest.json`, `.scratch/swarm-manifest.json`, and `suite-manifest.json` in that order and loads the first valid squad manifest. `agy-squad setup` installs the plugin into `~/.gemini/config/plugins/agy-squad` (auto-discovering `skills/` and `mcp_config.json`, while sweeping any duplicate global `agy-squad` MCP entry).

## `squad_planner` (`mcp/planner.mjs` & `agy-squad plan`)

![squad_planner and dispatch_squad inputs, checks, and outputs](assets/manifest-and-modes.svg)

`squad_planner` pairs Agy-Squad governance with Antigravity native `/swarm` (`executionMode: "swarm"`, default) or `invoke_subagent` (`executionMode: "subagent"`), replacing the retired `agy-squad run` PTY launcher. Provide **exactly one** of `manifestPath`, `manifest` (inline `{ squads }`), or `task` (plus optional `scopeFiles`, `roles`, `readOnly`, `roleScopes`), alongside optional `workspace` (active repository root when MCP `cwd` differs from your repo), `squadId` (omit to plan all squads; `all_l1` is valid only in `dispatch_squad`/`agy-squad dispatch`), `topology` (`flat` | `layered`), `executionMode`, `model`, `workspaceIsolation` (`inherit` | `share` | `branch`), `includeIntegrityAuditor`, `reportRoot`, `knownModels`, `occupiedWorkerNames`, `boardSince`, and `boardSeqs`. It imposes zero topology default bias (`topology.defaultBias: "none (ask user if unspecified)"`).

- **Explicit model pinning and provenance:** Under `executionMode: "swarm"`, `mcp/planner.mjs` compiles `swarmAdd` entries with explicit `model` pinning and instructs live verification via `swarm{action: "status"}`. Under `executionMode: "subagent"`, `invoke_subagent` accepts only `inherit`, `flash`, `flash_lite`, or `pro`; `modelProvenance` states when a requested model ID cannot be pinned or inspected per child (neither session transcripts nor `manage_subagents` expose child model IDs).
- **Writable `scopeFiles` overlap checks:** `mcp/planner.mjs` partitions overlapping writable `scopeFiles` into `topology.siblingOverlaps` (concurrent sibling collisions, emitted as `warnings[]` under `workspaceIsolation: "inherit"`) and `topology.leadSpecialistOverlaps` (sequential same-squad lead-vs-specialist overlaps, emitted as `notes[]`), while keeping the combined `topology.scopeOverlaps` list (`scopeOverlapComparison: "canonical-when-present-else-lexical"`) and exempting read-only audit squads (`integrity_auditor*`) and explicit boolean `readOnly: true` specs. Note: `readOnly: true` is overlap-check planning metadata only (not enforced inside compiled worker briefs or host permissions).
- **Transcript-safe `workers`, `integrityAuditPlan`, and `verificationPipeline`:** Generates compiled worker specs, report slots, integrity audit slots, and copy-pasteable `verificationPipeline` commands without copying raw `.system_generated/` transcripts into `scratch/`; `agy-squad bundle-init --plan <plan.json>` derives `<bundle-record.json>` directly from `plan.workers` (with optional `--provenance` override).

> [!NOTE]
> `mcp/index.js` validates JSON-RPC 2.0 request IDs (`typeof id === "string"` or `Number.isSafeInteger(id)`; otherwise `-32600`), decodes stdio payloads with fatal UTF-8 (`-32700` on invalid UTF-8), drains stdout cleanly on stdin EOF, returns JSON-RPC `-32602` (`Invalid params`) for malformed `tools/call` params, unknown tool names, or non-object `params.arguments`, and returns `{ isError: true }` inside tool results for schema, workspace, or manifest validation errors (`MCP-002`).

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
- **Custom roles vs. custom manifests:** Use `task` + `roles` (plus optional `readOnly: true` / `--read-only` or per-role `roleScopes` / `--role-scope <role=path>`) for fast multi-role flat cohorts; switch to inline `manifest` or `manifestPath` when workers need custom per-worker `objective`/`instructions`, per-worker `model`, domain `lead`s, or multiple parallel squads (omit `squadId` in `squad_planner` to compile all squads). Passing `roles`, `scopeFiles`, `readOnly`, or `roleScopes` alongside `manifest`/`manifestPath` is rejected.
- **Aliases and reserved IDs:** `children` is an alias for `specialists` (a squad cannot define both). You can place lead fields directly on the squad object instead of under `lead`, as long as you do not mix both forms. `all_l1` and retired `adversarial_*` keys cannot be used as squad IDs inside `squads`. Exact `integrity_auditor` and `integrity_auditor-<targetSquad>` keys are permitted only as optional flat integrity auditor overrides (filtered out of working squads); malformed or case-variant `integrity_auditor*` keys (such as `integrity_auditor_custom`, `INTEGRITY_AUDITOR`, or `integrity_auditor-`) are rejected.
- **Canonical casing:** Agent fields in `mcp/briefs.mjs` plus `readOnly` in `mcp/planner.mjs` accept camelCase and non-conflicting PascalCase aliases compared structurally with `util.isDeepStrictEqual` (for example, identical `scopeFiles` arrays in both cases pass cleanly; conflicting values throw).
- **Planner & wire limits:** There is no hardcoded cap on squad count or specialists per squad, but code enforces `MAX_SWARM_NAME_LENGTH = 24` chars (deduplicated with `-2`, `-3`, ...; pass `occupiedWorkerNames` across multi-call `/swarm` additions), `squad-<encodeURIComponent(id)>` directory names `<= 255` UTF-8 bytes, `reportPath()` slot length headroom so `PARTIAL <path> — ` (and ASCII ` -- ` / ` - ` delimiters) plus `SWARM_MENTION_RESERVE_BYTES = 26` and `MIN_OBSERVATION_BYTES = 16` stays `<= 500` UTF-8 bytes, and `MAX_STDIO_PAYLOAD_BYTES = 10 MiB` default (`AGY_MAX_STDIO_PAYLOAD_BYTES`) on `mcp/index.js`. See [Scaling swarms, custom role configurations, and limits](roles-and-workflows.md#4-scaling-swarms-custom-role-configurations-and-limits).

### Agent field contract

| Field | Requirement | Rules and defaults |
| --- | --- | --- |
| `objective` | Required | Plain task statement for the worker or lead. |
| `scopeFiles` | Required (`>= 1`) | Workspace-relative files or directories without trailing `/` (`"."` and `"docs"` are valid; `"docs/"`, absolute paths, `\` separators, `.` or `..` segments, and newlines are rejected by `mcp/briefs.mjs`). |
| `role`, `instructions`, `expectedDeliverable` | Optional | Optional role label, custom guidance, and deliverable description. |
| `readOnly` | Optional | Boolean (`ReadOnly` alias supported). Exempts read-only specialists or leads from `squad_planner` writable `scopeFiles` overlap checks (planning metadata only). |
| `typeName` | Optional | Defaults to `self`. Disallowed read-only or sandboxed presets (`research`, `browser`, `image-generator`) are rejected. |
| `model` | Optional | Defaults to `inherit` in `dispatch_squad` (only `inherit`, `flash_lite`, `flash`, or `pro` pin directly under `dispatch_squad`; any other explicit ID defaults to `inherit` with a `warnings[]` advisory recommending `squad_planner` under `executionMode: "swarm"`). |
| `workspace` | Optional | Manifest agent `workspace` must be `inherit` in both `dispatch_squad` and `squad_planner` (configure `/swarm` copy isolation via top-level `workspaceIsolation`). |

## Stages and Pointer-Over-Wire

1. **Plan and record launch metadata:** Call `squad_planner` (MCP `/swarm` primary flow; omit `squadId` to compile all working squads with optional `topology`, `workspaceIsolation`, `boardSince`, and `boardSeqs`) or `dispatch_squad` (`invoke_subagent` fallback via `all_l1` or a squad ID). Review the compiled payload, pass each entry verbatim, and record the operator, shared workspace, acceptance criteria, report slots, `<cohortBaseSeq>` cursor, and native child IDs from launch receipts.
2. **Write workspace report slots:** Each worker writes one evidence report at `scratch/agy-squad/squad-<encoded-id>/lead/report.md` or `specialist-N/report.md` (or under custom `reportRoot`). Pre-create unused slots before launch, use fresh squad IDs on retries, include source locations or command outputs with exit codes, and preserve contradictions or gaps.
3. **Send `<= 500` byte receipts:** Each child posts one single-line receipt of at most `500` UTF-8 bytes accepting spaced ASCII ` - ` or ` -- ` alongside ` — ` (`U+2014`): `READY <report-path> -- <concrete observation>`, `PARTIAL <report-path> -- <observation and blocker>`, or `NO_REPORT -- <reason>`. The parent matches each sender to its assigned slot, ignores exact duplicates, and inspects conflicts.
4. **Yield for Reactive Wakeup:** Wait via Reactive Wakeup, then inspect `/agents` (or `swarm{action: "status"}`) at the evidence checkpoint (10 minutes by default, longer when work requires it). Extend work showing progress, allow for approval waits, and redirect or stop work stuck on identical output. Record agent termination and command cleanup separately.
5. **Enforce the Squad Lead Patrol Gate:** After workers finish or stop, the parent or squad lead audits execution traces, rejects ungrounded or sycophantic reports (`FAIL` or `PARTIAL`), and checks material claims against final files (`Subagent Alignment Policy`: guessing from memory is prohibited; every claim cites an executed tool or primary source line). The lead records its verdict (`Content Verdict: PASS`, `FAIL`, or `BLOCKED`; bare `Verdict:` is accepted only as a legacy alias) and verified file hashes, rechecking changed inputs.
6. **Run the Independent Integrity Auditor (`audit-<id>` / `integrity_auditor`):** After working squads finish and before acceptance, run the flat integrity auditor:
   - **Canonical Flat Integrity Auditor:** On `/swarm`, spawn `audit-<id>` (`scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md` for single-squad manifests, flat or layered, or `scratch/agy-squad/squad-integrity_auditor-<targetSquad>/specialist-1/report.md` for multi-squad manifests, flat or layered) via `squad_planner`. On `invoke_subagent`, call `dispatch_squad({ squadId: "integrity_auditor:<targetSquad>" })` (or `integrity_auditor` for single-squad manifests). Compute `agy-squad digest <record.json>` (or `agy-squad bundle-init --digest`) first so each auditor records `Target Squad: <targetSquad>`, `Evidence Digest: <64-hex>`, and strictly `Integrity Verdict: CLEAN` or `Integrity Verdict: INTEGRITY VIOLATION` (never a content `PASS`). Legacy `adversarial_l1`, `adversarial_flat`, and `adversarial_review` auto-discovery have been removed.
   - **Acceptance gate:** `agy-squad bundle <record.json>` (and `agy-squad finalize <record.json>`) enforces `requireIntegrityAudit: true` by default (pass `--allow-unaudited` or `requireIntegrityAudit: false` to opt out). `bundleReports` in `mcp/handoffs.mjs` hashes all matching integrity audit reports (`integrityAudits` + `integrityAudit`), persists `schemaVersion: 2` and `auditPolicy` (`"required"` | `"unaudited-explicit"`), and guards against silent overwrites (`--replace` / `--predecessor <sha256>`). `verify` enforces the persisted `auditPolicy` and confirms matching `Evidence Digest`, `Target Squad`, `Integrity Verdict: CLEAN`, and `verifiedFiles` digests.

File scope in a brief describes the worker's assigned target paths; host-level write enforcement remains controlled by Antigravity permissions and workspace isolation.

## Governance CLI & report cleanup (`agy-squad`, `mcp/handoffs.mjs`, `mcp/verdicts.mjs`)

Run `agy-squad <command>` from the shared workspace root (inside a local `Agy-Squad` source checkout, you may also run `node bin/agy-squad.mjs <command>`; run `agy-squad help [<command>]` or `agy-squad <command> --help` for focused flags and examples; `mcp/handoffs.mjs` is the underlying JS library module whose standalone CLI entrypoint was removed in PR #5). Leading `./` workspace-relative paths (for example, `./docs/tools.md`) and Windows `\` relative paths on `win32` (for example, `.\scratch\record.json`) are normalized uniformly at the CLI boundary across downstream verbs (`plan`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`, `verdict`, and `collect`), while internal JSON/API contracts keep canonical POSIX `/` paths. Flat and `task` plans also emit `workers[i].synthesisSlot` pointing to the coordinator-authored `lead/report.md` path. Bundling and pruning support both default (`scratch/agy-squad/squad-<id>/`) and custom `reportRoot` layouts.

### CLI subcommands

| Command | Purpose and inputs |
| --- | --- |
| `setup [--check]` | Installs or synchronizes the native plugin, 4 shipped user-facing skills (`pr-review`, `full-review`, `day-one-review`, `swarm-governance`), plugin `mcp_config.json`, and `agy-squad` CLI shims (`install` is an alias; `--check` runs read-only preflight validation; zero companion probes). |
| `status [--json]` | Checks live plugin link, installed skills, docs, canonical plugin MCP registration, and CLI shim status (zero companion probes). |
| `uninstall [--restore-backups]` | Removes the plugin link, MCP registration, CLI shims, and stale schema caches, and reminds you to reload Antigravity Desktop IDE; `--restore-backups` performs a validated key-scoped merge-restore of prior backups. |
| `restore-backups` | Performs a validated key-scoped merge-restore of `Agy-Squad` entries from namespaced backups (`mcp_config.json.agy-squad.bak` / `config.json.agy-squad.bak`, with read-only fallback on legacy `*.bak` files), preserving third-party plugins and foreign MCP servers. |
| `dispatch (--squad <id> \| <id>) [--manifest <path>]` | Exposes `dispatch_squad` (`mcp/dispatch.mjs`) for `invoke_subagent` cohorts (`all_l1`, `<squadId>`, or `integrity_auditor[:<target>]`). |
| `plan (--manifest <path> \| "<task>") [options]` | Exposes `squad_planner` (`mcp/planner.mjs`) from the CLI (`--board-since`, `--board-seq`, `--occupied-worker`, etc.). In `swarm` mode, bundle templates use each swarm member name as `assignments[].conversationId` and `handoffs[].sender`. |
| `collect (--plan <plan.json> \| --record <record.json> \| --squad <id>) --from <worktree-dir>...` | Safely collects non-empty specialist/lead/auditor report slots from `/swarm` `share` or `branch` worktrees into the coordinator workspace before `bundle` and `kill`, rejecting symlink escapes and inter-worktree conflicts (`--workspace`, `--report-root`, `--overwrite`, `--dry-run`, `--strict`, `--allow-empty`). |
| `bundle-init --plan <plan.json> [options] [<verified-file>...]` | Generates a pre-filled `bundle-record.json` from `squad_planner` output (`plan.workers`, with optional `--provenance` override; supports `--squad`, `--workspace`, `--report-root`, `--verdict`, `--file`, `--id-map`, `--handoffs`, `--handoff`, `--allow-unaudited`, `--allow-non-passing`, `--allow-partial`, `--digest`, `--out`, `--replace`). |
| `verdict [--integrity] <report.md>` | Calls `mcp/verdicts.mjs` (`parseContentVerdict` or `parseIntegrityVerdict`) to parse a strict single-line `Content Verdict: PASS\|FAIL\|BLOCKED` (legacy alias `Verdict: ...`), or `Integrity Verdict: CLEAN\|INTEGRITY VIOLATION` with `--integrity`, rejecting hedged or conflicting lines. |
| `fingerprint <file...>` | Maps workspace-relative file paths to SHA-256 digests for `verifiedFiles`. Capture hashes before and after checks on final work inputs. |
| `inspect <record.json>` | Checks the recorded cohort against native messages and readable reports (`workspace`, ordered `assignments` with `conversationId` and `report`, and `handoffs` with native `sender` and exact `message`). |
| `digest <record.json> [--allow-non-passing] [--allow-partial]` | Computes the deterministic 64-hex `Evidence Digest` binding `squadId`, `verifiedFiles`, `lead/report.md`, and specialist reports before `audit-<id>` signs `CLEAN` (opt-in `--allow-non-passing` / `--allow-partial` for non-`PASS` or `PARTIAL`/`NO_REPORT` failure bundles). |
| `bundle <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--replace] [--predecessor <sha256>]` | Requires `squadId`, synthesizer `verdict: "PASS"` (unless `--allow-non-passing` for `FAIL`/`BLOCKED`), `verifiedFiles` hashes, unambiguous matching verdict in `lead/report.md`, and matching `Evidence Digest: <64-hex>` + `Integrity Verdict: CLEAN` across all matching auditor slots (unless `--allow-unaudited`). Writes v2 `lead/report.sources.json` and requires `--replace` or `--predecessor <sha256>` to overwrite a different existing bundle. |
| `verify <report.sources.json> [--prune --expected-sha256 <sha256> [--keep-reports]]` | Enforces persisted `auditPolicy` (failing closed on malformed v2 bundles), archived Markdown verdicts, every `integrityAudit` / `integrityAudits` digest and `Evidence Digest`, `verifiedFiles` hashes, and any remaining loose reports. Combining `--prune` with `verify` requires `--expected-sha256 <sha256>` to pin the accepted bundle digest before unlinking verified loose reports in the same process. |
| `finalize <record.json> [--allow-unaudited] [--allow-non-passing] [--allow-partial] [--replace] [--predecessor <sha256>] [--prune [--keep-reports]]` | Ergonomic one-step wrapper that runs `inspect` -> `bundle` -> `verify` (plus optional `--prune [--keep-reports]`) deterministically and emits `{ inspected, bundled, verified, pruned }` JSON while keeping every granular subcommand intact. |
| `prune <report.sources.json> <accepted-sha256> [--keep-reports]` | Safely unlinks only verified loose specialist reports (re-verifying inode identity and SHA-256) after `bundle` and `verify` pass, unless `--keep-reports` or `retainReports: true` is set. |
| `help [<command>]` | Print top-level CLI usage or focused help for a specific subcommand (equivalent to `--help` / `<command> --help`). |

### Bundle record and handoffs schemas

`agy-squad bundle-init --plan <plan.json> ...` generates a `<bundle-record.json>` pre-populated from `plan.workers`, optional `--provenance` entries, and fingerprinted `verifiedFiles`. Pass specialist receipts via `--handoffs <handoffs.json>` (a JSON array of `{ sender, message }` objects) or repeatable `--handoff "<sender>=<message>"` flags.

**`--handoffs <handoffs.json>` schema (`mcp/handoffs.mjs`):**

```json
[
  {
    "sender": "storage-wal-reviewer",
    "message": "@storage-lead READY scratch/agy-squad/squad-storage/specialist-1/report.md -- src/storage.js:42 fsync guard verified (npm test exit 0)"
  }
]
```

Each entry requires nonempty `sender` (matching `assignments[].conversationId`, which is the compiled `workerName` in `/swarm` mode) and a single-line `<= 500` UTF-8 byte `message` accepting spaced ASCII ` - ` or ` -- ` alongside ` — ` (`U+2014`) as the separator (`READY <slot> -- <observation>`, `PARTIAL <slot> -- <observation>`, or `NO_REPORT -- <reason>`, with optional leading `@mention` prefixes).

**`<bundle-record.json>` schema (`inspect`, `digest`, `bundle`, `finalize`):**

```json
{
  "squadId": "storage",
  "workspace": "/absolute/path/to/your-repo",
  "reportRoot": "scratch/agy-squad",
  "verdict": "PASS",
  "verifiedFiles": {
    "src/storage.js": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "assignments": [
    {
      "conversationId": "storage-wal-reviewer",
      "report": "scratch/agy-squad/squad-storage/specialist-1/report.md"
    }
  ],
  "handoffs": [
    {
      "sender": "storage-wal-reviewer",
      "message": "@storage-lead READY scratch/agy-squad/squad-storage/specialist-1/report.md -- src/storage.js:42 fsync guard verified (npm test exit 0)"
    }
  ],
  "requireIntegrityAudit": true,
  "integrityAuditSlots": [
    "scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md"
  ]
}
```

Optional boolean flags `allowNonPassing: true` and `allowPartial: true` mirror `--allow-non-passing` and `--allow-partial`. All workspace paths inside JSON records must use canonical POSIX `/` separators.

### `agy-squad` flags reference

| Flag | Applies to | Behavior |
| --- | --- | --- |
| `--check` / `-c` | `setup`, `install` | Run read-only preflight check without writing files (cannot pair with `--restore-backups` or `--uninstall`). |
| `--restore-backups` | `uninstall` | Perform a validated key-scoped merge-restore of `Agy-Squad` entries from `*.agy-squad.bak` backups (legacy `*.bak` fallback; preserves foreign plugins/MCP servers) after removing `Agy-Squad`. |
| `--json` | `status` | Emit machine-readable installation status JSON. |
| `--manifest <path>` | `plan`, `dispatch` | Load squads from a workspace manifest file (mutually exclusive with positional `<task>` in `plan`). |
| `--squad <id>` | `plan`, `dispatch`, `collect`, `bundle-init` | Target a specific squad ID. |
| `--topology flat\|layered` | `plan` | Override multi-squad compilation topology (`flat` strips leads; `layered` requires leads). |
| `--mode swarm\|subagent` | `plan` | Select native `/swarm` (`swarm`, default) or `invoke_subagent` (`subagent`). |
| `--model <id>` | `plan` | Pin a model ID for workers (under `swarm` mode, marks models `unverified` unless listed via `--known-model`). |
| `--known-model <id>` | `plan` | Repeatable. Supplies allowed model IDs from `swarm{action: "models"}`; pinned models outside the list are rejected. |
| `--occupied-worker <name>` | `plan` | Repeatable. Reserves pre-existing `/swarm` roster names (`occupiedWorkerNames`) when adding cohorts to an active board. |
| `--board-since <seq>` / `--board-seq <seq>` | `plan` | Scope working `lead`/`specialists` `read_board` directives via `boardSince` (non-negative integer cursor) and integrity auditor directives via repeatable `boardSeqs` message sequence IDs. |
| `--workspace-isolation inherit\|share\|branch` | `plan` | Choose Antigravity `/swarm` worker workspace mode (`inherit`, `share`, or `branch`). |
| `--scope <path>` | `plan` | Repeatable. Workspace-relative scope paths for task-based planning. |
| `--role <title>` | `plan` | Repeatable. Specialist role titles for task-based planning. |
| `--read-only` | `plan` | Mark inline task specialists `readOnly: true` to exempt them from writable overlap warnings. |
| `--role-scope <role=path>` | `plan` | Repeatable. Assign per-role workspace-relative `scopeFiles` for inline task planning (`roleScopes`). |
| `--no-integrity` | `plan` | Omit the `integrity_auditor` plan stage and emit `--allow-unaudited` in `verificationPipeline`. |
| `--report-root <path>` | `plan`, `collect`, `bundle-init` | Custom workspace-relative root for report slots instead of `scratch/agy-squad`. |
| `--plan <path>` / `--record <path>` | `collect`, `bundle-init` | Supply `squad_planner` JSON output (`--plan`) or a bundle record (`--record` in `collect`). |
| `--from <worktree-dir>` / `--workspace <dir>` | `collect`, `bundle-init` | Repeatable source worktree directories (`--from` in `collect`) and optional target coordinator root (`--workspace`). |
| `--overwrite` / `--dry-run` / `--strict` / `--allow-empty` | `collect` | Overwrite differing coordinator slots, preview copies without writing, fail on missing slots, or allow zero found slots. |
| `--provenance <path>` / `--verdict <v>` / `--file <path>` | `bundle-init` | Merge external provenance entries, supply an explicit verdict (`PASS\|FAIL\|BLOCKED`), and add repeatable verified file inputs. |
| `--id-map <worker=id>` / `--handoffs <json>` / `--handoff <sender=msg>` | `bundle-init` | Map worker names to runtime IDs and inject handoff receipts from JSON or inline `sender=message` pairs. |
| `--digest` | `bundle-init` | Compute and output `evidenceDigest` alongside the initialized record (requires `--handoffs` or `--handoff`; `--out` optional). |
| `--out <path>` | `bundle-init` | Write the initialized `<record.json>` to disk instead of printing only to stdout. |
| `--integrity` | `verdict` | Parse `Integrity Verdict: CLEAN\|INTEGRITY VIOLATION` instead of a content verdict. |
| `--allow-unaudited` | `bundle`, `finalize`, `bundle-init` | Opt out of the default `requireIntegrityAudit: true` gate. |
| `--allow-non-passing` | `digest`, `bundle`, `finalize`, `bundle-init` | Allow archiving/digesting a `FAIL` or `BLOCKED` cohort (`allowNonPassing: true`). |
| `--allow-partial` | `digest`, `bundle`, `finalize`, `bundle-init` | Allow archiving/digesting cohorts containing `PARTIAL` or `NO_REPORT` specialist slots (`allowPartial: true`). |
| `--replace` | `bundle`, `finalize`, `bundle-init` | Allow overwriting an existing `lead/report.sources.json` bundle or `--out` record file. |
| `--predecessor <sha256>` | `bundle`, `finalize` | Require the existing `lead/report.sources.json` bundle's SHA-256 to match `<sha256>` before overwriting. |
| `--expected-sha256 <sha256>` | `verify` | Required when combining `verify` with `--prune`; pins the expected bundle SHA-256 digest before pruning loose specialist reports. |
| `--prune` / `--keep-reports` | `verify`, `finalize`, `prune` | `--prune` (on `verify` with `--expected-sha256 <sha256>`, or on `finalize`) prunes verified loose `specialist-<N>/report.md` files in the same process; `--keep-reports` retains loose reports after verification passes. |
