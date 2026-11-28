# Getting started (Desktop IDE & CLI)

Agy-Squad is a subagent planning, review, and SHA-256 proof-bundling harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** across **Linux, macOS, and Windows** (Node.js parity tested in CI on `ubuntu-latest`, `macos-latest`, and `windows-latest`; live host `agy` IDE/CLI execution verified on Linux/WSL2, with physical macOS/Windows `agy` verification tracked as a remaining cross-platform parity gate). It ships four user-facing skills ([`swarm-governance`](skills/swarm-governance.md) as an Execution Modifier plus [`pr-review`](skills/pr-review.md), [`full-review`](skills/full-review.md), and [`day-one-review`](skills/day-one-review.md) as Task Specs) alongside the repo-only [`self-diagnosis`](skills/self-diagnosis.md) maintainer skill, using `<= 500` byte `Pointer-Over-Wire` receipts, file-backed evidence slots, native JSONL Integrity Audits, and SHA-256 bundle checks (`v1.5.0`).

## Host and companion compatibility matrix

| Layer | Requirement | Check command |
| --- | --- | --- |
| Operating system | Linux, macOS, or Windows (Node 22/24 CI parity; live `agy` tested on Linux/WSL2) | `node -p "process.platform + ' ' + process.arch"` |
| Node.js | `>= 22.0.0` | `node --version` |
| Antigravity surface | Antigravity Desktop (IDE) or CLI (`agy`) with `/swarm` and/or `invoke_subagent` | `agy --version` / Desktop IDE |
| Agy-Context-Saver (optional) | `>= 2.1.2` recommended (completely optional; adds a single global `~/.gemini/config/hooks.json` guard hook, narrow high-ROI `rtk >= 1.1.0` pre-gate, `300L / 24 KiB` `read_file` bounds, and `agy-context transcript` CLI; not required for standalone runs or live Integrity Audits) | `agy-context status` (or `npx --package=agy-context-saver agy-context setup`) |
| Documentation site (optional) | Python 3.11+ with pinned `zensical==0.0.74` for `npm run docs` (`zensical serve`) / `zensical build` (use `python3 -m zensical ...` if `zensical` is not on `PATH`) | `pip install "zensical==0.0.74" && zensical --version` |
| Native permissions | Controlled by Desktop IDE approvals and `/swarm` / `/agents` | Review before launching workers |

## 1. Install via NPX (Recommended, zero clone required)

Register the native Antigravity plugin (`~/.gemini/config/plugins/agy-squad`), link the four shipped user-facing skills (`pr-review`, `full-review`, `day-one-review`, `swarm-governance`), register the `agy-squad` MCP server in `~/.gemini/config/plugins/agy-squad/mcp_config.json` (sweeping any duplicate global entry in `~/.gemini/config/mcp_config.json`), and provision the `agy-squad` CLI shim in `~/.gemini/antigravity/bin/` with a single command:

```bash
npx --package=agy-squad agy-squad setup
agy-squad status
```

- **Reload Antigravity Desktop IDE:** If Antigravity Desktop IDE is open while running `setup`, reload or restart the IDE so the newly registered `agy-squad` MCP server and skills load.
- **Ensure `~/.gemini/antigravity/bin` is on `PATH`:** If `agy-squad status` reports `command not found` (or `setup` prints a `PATH` warning), add the bin directory to your shell profile:
  - **Linux / macOS (`bash` / `zsh`):** `export PATH="$HOME/.gemini/antigravity/bin:$PATH"`
  - **Windows (PowerShell):** `$env:PATH = "$HOME\.gemini\antigravity\bin;$env:PATH"`
  - **Zero-PATH fallback:** `npx --package=agy-squad agy-squad status` (works for any subcommand without modifying `PATH`).
- **Standalone usage (default):** `Agy-Squad` works 100% standalone with native Antigravity, including live native JSONL Integrity Audits that inspect `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` and `transcript_full.jsonl` in one batch pass. `setup` and `status` perform zero companion probes or nags. `--no-integrity` and `--allow-unaudited` are explicit opt-outs if you intentionally want to skip auditing, never requirements for standalone runs. Pairing with optional `Agy-Context-Saver` (`2.1.2+` recommended) adds hook-enforced context, shell, and transcript governance.
- **Upgrade an existing install:** Run `npx --package=agy-squad@latest agy-squad setup` when updating to a newer release so npm does not reuse a cached `_npx` package version.

### Local repository checkout and development (optional)

If you are developing `Agy-Squad` from source, clone the repository and run the setup, preflight, test, and package-boundary checks (source checkouts also include the repo-only `self-diagnosis` skill and `scripts/release-preflight.mjs`, and may invoke the CLI directly via `node bin/agy-squad.mjs`):

```bash
git clone https://github.com/paragon-ux/Agy-Squad.git
cd Agy-Squad
npm run setup
node scripts/release-preflight.mjs
npm test
npm run verify:package
```

Runs the full unit, MCP server, installer lifecycle, benchmark fixture, and package-boundary test suite locally in isolated temporary directories without spawning live subagents or mutating your live `~/.gemini` configuration.

### Uninstall & Rollback

To cleanly remove the plugin registration, CLI shims, and stale MCP caches (or perform a validated key-scoped merge-restore of `Agy-Squad` entries from namespaced `*.agy-squad.bak` backups while preserving third-party plugins and foreign MCP servers):

```bash
# Remove plugin link/copy, MCP registration, and CLI shims
agy-squad uninstall

# Remove and merge-restore pre-install *.agy-squad.bak configuration entries (legacy *.bak fallback)
agy-squad uninstall --restore-backups

# Merge-restore configuration backups directly without overwriting foreign plugins/MCP servers
agy-squad restore-backups

# Or run via npx if the CLI shim is already removed / not on PATH
npx --package=agy-squad agy-squad uninstall
```

Reload Antigravity Desktop IDE after running `agy-squad uninstall` so the IDE unloads the removed `agy-squad` MCP server and skills cleanly.

## 2. Manual workspace MCP registration (optional)

If you prefer not to use `agy-squad setup`, you can register `agy-squad` manually in `.agents/mcp_config.json` (or your IDE MCP config) using the absolute path to your `node` binary (`command -v node` on POSIX, `(Get-Command node).Source` on Windows):

```json
{
  "mcpServers": {
    "agy-squad": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/Agy-Squad/mcp/index.js"],
      "env": {
        "AGY_SQUAD_WORKSPACE": "/absolute/path/to/workspace"
      },
      "tools": {
        "dispatch_squad": { "eager": true },
        "squad_planner": { "eager": true }
      }
    }
  }
}
```

In Desktop IDE and CLI sessions, `agy-squad setup` registers `squad_planner` and `dispatch_squad` as lazy MCP tools so idle chats and spawned workers pay `0 B` of `tools/list` schema overhead (run `agy-squad plan --out scratch/plan.json` directly or set `"eager": true` in a workspace `.agents/mcp_config.json` if you want the schema loaded upfront). Pair `squad_planner` with Antigravity native `/swarm` and `swarm-governance`: read-only and overlap-free runs start immediately with defaults (`flat` for inline tasks, staged `layered` waves for manifests with `lead` blocks unless `--topology flat` is passed), and the coordinator calls `ask_question` only when concurrent writers share files on `inherit` or run settings are ambiguous. Use `dispatch_squad` / `agy-squad dispatch` when targeting `invoke_subagent`. Check verdicts and seal SHA-256 bundles with `agy-squad` (`plan`, `dispatch`, `collect`, `bundle-init`, `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`), and stop completed `invoke_subagent` children with `manage_subagents(Action='kill', ConversationIds=[...])`.

## 3. CLI Planner and Governance (`agy-squad`)

![Six-step swarm lifecycle and dual-verdict gate](assets/swarm-lifecycle.svg)

For native `/swarm` planning, `invoke_subagent` stage compilation, and CI verification, `agy-squad` provides lifecycle (`setup`, `status`, `uninstall`, `restore-backups`) and cohort verification (`plan`, `dispatch`, `collect`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`, `verdict`) subcommands (run `agy-squad <command> --help` for full options and examples). Legacy `agy-squad run` (`bin/terminal.py`) and the standalone `node mcp/handoffs.mjs` CLI were retired in favor of native `/swarm` planning and the unified `agy-squad` governance CLI.

### Generate a `/swarm` plan, audit, and proof bundle

Plan a self-contained read-only `/swarm` cohort in any repository, write the coordinator synthesis report (`synthesisSlot` in `scratch/plan.json`, required for flat `task` cohorts that have no separate lead worker), record the worker receipts in `scratch/handoffs.json`, and seal the SHA-256 bundle in one step:

```bash
# 1. Plan a read-only /swarm cohort in any repository and save the plan JSON atomically
agy-squad plan --mode swarm --read-only --scope src \
  --role "Security" --role "Test Audit" \
  --out scratch/plan.json --replace "Audit authentication flow"

# 2. After specialists finish, author the flat-mode synthesis report at
#    workers[0].synthesisSlot (scratch/agy-squad/squad-task_squad/lead/report.md)
#    containing a strict single line: "Content Verdict: PASS" (or FAIL / BLOCKED),
#    then initialize the bundle record + Evidence Digest:
agy-squad bundle-init --plan scratch/plan.json --handoffs scratch/handoffs.json \
  --digest --out scratch/record.json --replace src/auth.js

# 3. After audit-task writes its CLEAN report, finalize (inspect -> bundle -> verify + prune) in one step:
agy-squad finalize scratch/record.json --replace --prune
```

`scratch/handoffs.json` is a JSON array pairing each compiled `workerName` from `scratch/plan.json` with its exact single-line `<= 500` byte receipt (accepting spaced ASCII ` - ` or ` -- ` alongside Unicode `U+2014` as the delimiter; you can also pass repeatable `--handoff "<workerName>=READY ..."` flags inline instead of a file):

```json
[
  {
    "sender": "security",
    "message": "@coordinator READY scratch/agy-squad/squad-task_squad/specialist-1/report.md -- src/auth.js:42 token check verified"
  },
  {
    "sender": "test-audit",
    "message": "@coordinator READY scratch/agy-squad/squad-task_squad/specialist-2/report.md -- auth unit tests cover expiry edge cases"
  }
]
```

See [Bundle record and handoffs schemas](tools.md#bundle-record-and-handoffs-schemas) for the full `<bundle-record.json>` and `--handoffs` contracts.

Or compile a multi-squad cohort from a workspace manifest file:

```bash
agy-squad plan \
  --manifest swarm-manifest.json \
  --topology layered \
  --mode swarm
```

## 4. What successful output looks like

1. In Desktop IDE or CLI planning, `squad_planner` (or `dispatch_squad`) generates worker specs, report slots under `scratch/agy-squad/...`, model provenance metadata, and `verificationPipeline` commands.
   - **External repositories (`scratch/`):** Add `scratch/` to your repo's `.gitignore` (or `.git/info/exclude`) before running a cohort so `scratch/agy-squad/` artifacts stay untracked, or pass `--report-root <ignored-dir>`.
2. Each worker writes its evidence report to its assigned slot (`scratch/agy-squad/.../specialist-<N>/report.md`) and posts a single-line `<= 500` byte receipt (spaced ASCII ` - ` or ` -- `, or ` — `):
   ```text
   READY scratch/agy-squad/squad-1/specialist-1/report.md -- gateway/gateway.mjs:10 timingSafeEqual throws RangeError on short hex
   ```
3. The parent (or squad lead) runs `agy-squad collect` for any `share`/`branch` copies, inspects cited source lines and tests to verify correctness, writes a strict `Content Verdict: PASS` line in `lead/report.md` (bare `Verdict: PASS` is accepted only as a legacy alias), pairs with a flat integrity auditor (`audit-<id>` on `/swarm`, `integrity_auditor` via slot; emits `Integrity Verdict: CLEAN`), and runs `agy-squad bundle-init --digest` + `agy-squad finalize <record.json> [--prune]` (or granular `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `prune`) to record SHA-256 digests in `lead/report.sources.json`.
 
   For read-only `invoke_subagent` specialists, `agy-squad plan --mode subagent --readonly-subagent` uses the packaged `agy-squad-readonly` type. The child sends the report as its final chat response rather than writing a file, and `invoke_subagent` returns the child's runtime `conversationId` UUID to the coordinator. The coordinator binds each assigned worker to that UUID (`--id-map <worker=uuid>` or `--provenance <scaffold.json>`) and runs `agy-squad collect --plan <plan.json> --handoffs <file> --id-map <worker=uuid>` (or `--record <record.json> --from-transcript --handoffs <file> --id-map <worker=uuid>`) to materialize the response into `report.md`; a UUID-shaped receipt sender alone never authorizes transcript extraction. If Agy-Context-Saver transcript policy is restrictive, run the permitted `agy-context transcript query ... --json --out <file>` extraction first and pass `--transcript-json <slot>=<file>` to `collect`.
4. Run `swarm status` or `manage_subagents` to inspect running worker models or stop active children ([Stopping agents](stopping-agents.md)).

## When to use Agy-Squad vs. alternatives

| Approach | Primary strength | Use Agy-Squad when... | Prefer comparator when... |
| --- | --- | --- | --- |
| **Antigravity native `/swarm`** | Native shared board, worktrees (`share`/`branch`), `swarm_pane` Overview, live model switching, and `swarm_monitor` | You want `swarm-governance` and `agy-squad` on top of `/swarm` to stage waves, copy reports out of worktrees before `kill`, keep board posts under `500 B`, and seal SHA-256 bundles | You want informal collaboration on the shared board without report files, verdict checks, or proof bundles |
| **Antigravity `/boost`** | Starts immediately across App, CLI, IDE, and extensions with `DeepCoder` or `DeepInvestigator` challenge and verification rounds | You are splitting a review or change across separate parts of a codebase and want structured `v1.5.0` review tables and SHA-256 proof archives | You are fixing a bug, tracing a root cause, or building a feature in one area (`<= 6-8` files) |
| **Antigravity `run_workflow`** (`/run-workflow`) | Python script running `parallel()` and `pipeline()` agents with schema-checked `finish` results and no shared board | You want completed workers' reports kept if one sibling errors out, need child `transcript.jsonl` tool calls audited (`trajectory()` reads pre-workflow parent steps only), or need mid-run `ask_question` prompts | You are fanning out a scripted batch job (`10-50+` files or items) that returns JSON and can cancel the batch if one worker fails |
| **Antigravity `/teamwork`** (or `/teamwork-preview`) | Autonomous multi-milestone campaigns with built-in wrapper, explorer, and semantic reviewer agents | You want proportional 2-to-3 agent cohorts in Desktop IDE or CLI, `<= 500` B receipts, SHA-256 evidence bundles, governed teardown, and integrated `v1.5.0` reviews (`pr-review`, `full-review`, `day-one-review`) (see [Benchmarks](benchmarks.md)) | You want a long autonomous campaign with built-in LLM reviewer/auditor agents |
| **Antigravity native subagents** (`invoke_subagent`) | Zero setup for ad hoc parallel tasks (including sandboxed read-only `research` subagents) | You want a repeatable manifest, report-slot paths, receipt length enforcement, and bundle verification | You only need 1-to-3 quick read-only lookups or helper delegations |
| **Claude Code / Codex subagents** | Native role files and parallel delegation inside those tools | Your workflow runs in Antigravity Desktop or CLI on Linux, macOS, or Windows | Your team works inside Claude Code or OpenAI Codex |
| **CrewAI / LangGraph / Microsoft Agent Framework** | General Python/TypeScript SDKs for building standalone multi-agent applications | You want a lightweight workspace harness without building an external orchestration service | You are building a standalone application, stateful graph, or multi-cloud agent service |

## Troubleshooting common issues

| Symptom | Cause | Resolution |
| --- | --- | --- |
| `Unknown command ...` or `'agy-squad run' was retired` | Retired `agy-squad run` PTY launcher was invoked | Run `agy-squad plan` with Antigravity native `/swarm`, or register `mcp/index.js` directly in `.agents/mcp_config.json` |
| Desktop IDE fails to start `agy-squad` MCP (`spawn node ENOENT`, Node `< 22`, or tools missing after reload) | GUI app launched with a minimal non-login `PATH` lacking Homebrew/`nvm`/`fnm`/`volta` Node `>= 22`, or Node moved since `setup` ran | Re-run `npx --package=agy-squad@latest agy-squad setup` from a shell with Node `>= 22.0.0` (writes `~/.gemini/config/plugins/agy-squad/mcp-launch.sh` on POSIX or records `process.execPath` on Windows in `~/.gemini/config/plugins/agy-squad/mcp_config.json`), verify with `agy-squad status`, and reload Antigravity Desktop IDE |
| Large `read_file` call denied by optional `Agy-Context-Saver` hook during live run | Optional `Agy-Context-Saver` (`2.1.2+`) allows `<= 300`-line / `<= 24 KiB` `read_file` calls without bounds, requires `<= 300`-line `StartLine`/`EndLine` slices on larger files (or explicit full-file audits `<= 800` lines & `<= 45 KiB`), and blocks direct reads inside `.system_generated/` | Locate symbols with native `grep_search`, `find_by_name`, `list_dir`, or `rg`/`grep` (all unblocked on workspaces in `v2.1.2+`), pass bounded `StartLine`/`EndLine` (`<= 300` lines) to `read_file` on large files, and use `rtk read` for `.system_generated/` spillovers and completed task logs |
| `Requested explicit model ... cannot be pinned under executionMode 'subagent'` | `invoke_subagent` accepts only `inherit|flash|flash_lite|pro` | Set `executionMode: "swarm"` (`--mode swarm`) in `squad_planner` to explicitly pin and verify exact model IDs via `swarm status` |
| Swarm UI shows old posts, retired workers, or loads slowly across waves | Antigravity keeps one append-only board per conversation (`killed: true` entries stay in history) and does not expose user-configurable channels when `swarm` lacks `action: "channel"` | Start a fresh Antigravity conversation per major `/swarm` wave for a clean board, or run follow-up cohorts via `invoke_subagent` ([Shared swarm board and channel limits](concepts.md#shared-swarm-board-and-channel-limits)) |
| Specialist silent past checkpoint | Waiting on permission prompt or stuck command | Run `swarm status`, `manage_subagents` (Desktop IDE), or `/agents` to inspect or stop the child, then verify underlying processes exited ([Stopping agents](stopping-agents.md)) |
