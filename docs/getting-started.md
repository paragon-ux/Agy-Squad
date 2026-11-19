# Getting started (Desktop IDE & CLI)

Agy-Squad is a subagent planning, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** across **Linux, macOS, and Windows** (Node.js parity tested in CI on `ubuntu-latest`, `macos-latest`, and `windows-latest`; live host `agy` IDE/CLI execution verified on Linux/WSL2, with physical macOS/Windows `agy` verification tracked as a remaining cross-platform parity gate). It pairs [`swarm-governance`](roles-and-workflows.md#swarm-governance) (Execution Modifier) with Task-Spec skills ([`self-diagnosis`](core-workflows.md#2-diagnose-and-optimize-the-harness-self-diagnosis), [`pr-review`](core-workflows.md#3-review-pull-requests-to-the-v140-standard), and [`full-review`](roles-and-workflows.md#full-review)) using `<= 500` byte `Pointer-Over-Wire` receipts, file-backed evidence slots, and SHA-256 bundle checks (`v1.4.0`).

## Host and companion compatibility matrix

| Layer | Requirement | Check command |
| --- | --- | --- |
| Operating system | Linux, macOS, or Windows (Node 22/24 CI parity; live `agy` tested on Linux/WSL2) | `node -p "process.platform + ' ' + process.arch"` |
| Node.js | `>= 22.0.0` | `node --version` |
| Antigravity surface | Antigravity Desktop (IDE) or CLI (`agy`) with `/swarm` and/or `invoke_subagent` | `agy --version` / Desktop IDE |
| Agy-Context-Saver | `>= 2.0.1` (`2.0.4+` recommended; `PreToolUse` hook + `agy-context` CLI active) for live governed cohorts (optional for standalone `--no-integrity` / `--allow-unaudited` runs) | `agy-context status` (or `npx --package=agy-context-saver agy-context setup`) |
| RTK binary | `>= 1.1.0` (`rtk hook antigravity`, provisioned by `Agy-Context-Saver`) | `rtk --version` (or via `agy-context setup`) |
| Documentation site (optional) | Python 3.11+ with pinned `zensical==0.0.74` for `npm run docs` (`zensical serve`) / `zensical build` (use `python3 -m zensical ...` if `zensical` is not on `PATH`) | `pip install "zensical==0.0.74" && zensical --version` |
| Native permissions | Controlled by Desktop IDE approvals and `/swarm` / `/agents` | Review before launching workers |

## 1. Install via NPX (Recommended, zero clone required)

Register the native Antigravity plugin (`~/.gemini/config/plugins/agy-squad`), link the four governance skills (`pr-review`, `full-review`, `self-diagnosis`, `swarm-governance`), register the `agy-squad` MCP server in `~/.gemini/config/plugins/agy-squad/mcp_config.json` (sweeping any duplicate global entry in `~/.gemini/config/mcp_config.json`), and provision the `agy-squad` CLI shim in `~/.gemini/antigravity/bin/` with a single command:

```bash
npx --package=agy-squad agy-squad setup
agy-squad status
```

- **Reload Antigravity Desktop IDE:** If Antigravity Desktop IDE is open while running `setup`, reload or restart the IDE so the newly registered `agy-squad` MCP server and skills load.
- **Ensure `~/.gemini/antigravity/bin` is on `PATH`:** If `agy-squad status` reports `command not found` (or `setup` prints a `PATH` warning), add the bin directory to your shell profile:
  - **Linux / macOS (`bash` / `zsh`):** `export PATH="$HOME/.gemini/antigravity/bin:$PATH"`
  - **Windows (PowerShell):** `$env:PATH = "$HOME\.gemini\antigravity\bin;$env:PATH"`
  - **Zero-PATH fallback:** `npx --package=agy-squad agy-squad status` (works for any subcommand without modifying `PATH`).
- **Standalone usage without `Agy-Context-Saver`:** `setup` prints a `[NEXT STEP]` notice if `agy-context` or `rtk` is absent. Install `Agy-Context-Saver` (`npx --package=agy-context-saver agy-context setup`) for full live integrity trace audits, or pass `--no-integrity` to `agy-squad plan` and `--allow-unaudited` to `agy-squad bundle` or `agy-squad finalize` for standalone runs.

### Local repository checkout and development (optional)

If you are developing `Agy-Squad` from source, clone the repository and run the setup, preflight, test, and package-boundary checks (source checkouts may also invoke the CLI directly via `node bin/agy-squad.mjs`):

```bash
git clone https://github.com/paragon-ux/Agy-Squad.git
cd Agy-Squad
npm run setup
node scripts/release-preflight.mjs
npm test
npm run verify:package
```

Runs all 10 test suites (`tests/test-verdicts-and-pivot.mjs`, `tests/test-dispatch.mjs`, `tests/test-planner.mjs`, `tests/test-handoffs.mjs`, `tests/test-run.mjs`, `tests/test-server.mjs`, `tests/test-comparative-dossier.mjs`, `tests/test-lifecycle-installer.mjs`, `benchmarks/teamwork-vs-squad/verify-benchmark.mjs`, and `tests/verify-package.mjs`) locally in isolated temporary directories without spawning live subagents or mutating your live `~/.gemini` configuration.

### Uninstall & Rollback

To cleanly remove the plugin registration, CLI shims, and stale MCP caches (or restore pre-install configuration backups):

```bash
# Remove plugin link/copy, MCP registration, and CLI shims
agy-squad uninstall

# Remove and restore pre-install .bak configuration files
agy-squad uninstall --restore-backups

# Restore configuration backups directly
agy-squad restore-backups

# Or run via npx if the CLI shim is already removed / not on PATH
npx --package=agy-squad agy-squad uninstall
```

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

In Desktop IDE sessions, pair `squad_planner` with Antigravity native `/swarm` and the `swarm-governance` skill (asking once upfront when `Flat` vs `Layered` topology is unspecified), or call `dispatch_squad` / `agy-squad dispatch` when targeting `invoke_subagent`. Enforce strict single-line verdicts and SHA-256 bundles with `agy-squad` (`plan`, `dispatch`, `collect`, `bundle-init`, `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`), and stop completed `invoke_subagent` children with `manage_subagents(Action='kill', ConversationIds=[...])`.

## 3. CLI Planner and Governance (`agy-squad`)

![Six-step swarm lifecycle and dual-verdict gate](assets/swarm-lifecycle.svg)

For native `/swarm` planning, `invoke_subagent` stage compilation, and CI verification, `agy-squad` provides lifecycle (`setup`, `status`, `uninstall`, `restore-backups`) and cohort verification (`plan`, `dispatch`, `collect`, `bundle-init`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `finalize`, `prune`, `verdict`) subcommands (run `agy-squad <command> --help` for full options and examples). Legacy `agy-squad run` (`bin/terminal.py`) and the standalone `node mcp/handoffs.mjs` CLI were retired in favor of native `/swarm` planning and the unified `agy-squad` governance CLI.

### Generate a `/swarm` plan, audit, and proof bundle

Plan a self-contained read-only `/swarm` cohort in any repository, check the lead and integrity auditor verdicts, and seal the SHA-256 bundle in one step:

```bash
# Plan a read-only /swarm cohort in any repository and save the plan JSON
mkdir -p scratch && agy-squad plan --mode swarm --read-only --scope src \
  --role "Security" --role "Test Audit" \
  "Audit authentication flow" > scratch/plan.json

# After workers finish, check the lead verdict and initialize the bundle record + Evidence Digest
agy-squad verdict scratch/agy-squad/squad-task_squad/lead/report.md
agy-squad bundle-init --plan scratch/plan.json --handoffs scratch/handoffs.json \
  --digest --out scratch/record.json src/auth.js

# Verify the integrity auditor verdict (single-squad slot; multi-squad uses squad-integrity_auditor-<id>)
# and finalize (inspect -> bundle -> verify + prune) in one step
agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md
agy-squad finalize scratch/record.json --replace --prune
```

Or compile a multi-squad cohort from a workspace manifest file:

```bash
agy-squad plan \
  --manifest swarm-manifest.json \
  --topology layered \
  --mode swarm
```

## 4. What successful output looks like

1. In Desktop IDE or CLI planning, `squad_planner` (or `dispatch_squad`) generates worker specs, report slots under `scratch/agy-squad/...`, model provenance metadata, and a transcript-safe `provenanceScaffold`.
   - **External repositories (`scratch/`):** Add `scratch/` to your repo's `.gitignore` (or `.git/info/exclude`) before running a cohort so `scratch/agy-squad/` artifacts stay untracked, or pass `--report-root <ignored-dir>`.
2. Each worker writes its evidence report to its assigned slot (`scratch/agy-squad/.../specialist-<N>/report.md`) and posts a single-line `<= 500` byte receipt:
   ```text
   READY scratch/agy-squad/squad-1/specialist-1/report.md — gateway/gateway.mjs:10 timingSafeEqual throws RangeError on short hex
   ```
3. The parent (or squad lead) runs `agy-squad collect` for any `share`/`branch` copies, inspects cited source lines and tests to verify correctness, writes a strict `Content Verdict: PASS` line in `lead/report.md` (bare `Verdict: PASS` is accepted only as a legacy alias), pairs with a flat integrity auditor (`audit-<id>` on `/swarm`, `integrity_auditor` via slot; emits `Integrity Verdict: CLEAN`), and runs `agy-squad bundle-init --digest` + `agy-squad finalize <record.json> [--prune]` (or granular `verdict`, `fingerprint`, `inspect`, `digest`, `bundle`, `verify`, `prune`) to record SHA-256 digests in `lead/report.sources.json`.
4. Run `swarm status` or `manage_subagents` to inspect running worker models or stop active children ([Stopping agents](stopping-agents.md)).

## When to use Agy-Squad vs. alternatives

| Approach | Primary strength | Use Agy-Squad when... | Prefer comparator when... |
| --- | --- | --- | --- |
| **Antigravity native `/swarm`** | Native shared board, worktrees (`share`/`branch`), live model switching, and `swarm_monitor` | You want Agy-Squad (`swarm-governance` + `agy-squad` CLI) on top of `/swarm` for role separation, `Pointer-Over-Wire` disk pointers, and SHA-256 CI proof bundles | You only need ephemeral board coordination without deterministic bundles or strict verdict gates |
| **Antigravity `/teamwork`** (or `/teamwork-preview`) | Autonomous multi-milestone campaigns with built-in wrapper, explorer, and semantic reviewer agents | You want proportional 2-to-3 agent cohorts in Desktop IDE or CLI, `<= 500` B receipts, SHA-256 evidence bundles, governed teardown, and integrated `self-diagnosis` + `pr-review` (`v1.4.0`) (see [Benchmarks](benchmarks.md)) | You want a long autonomous campaign with built-in LLM reviewer/auditor agents |
| **Antigravity native subagents** (`invoke_subagent`) | Zero setup for ad hoc parallel tasks | You want a repeatable manifest, report-slot paths, receipt length enforcement, and bundle verification | You only need one quick ad hoc delegation |
| **Claude Code / Codex subagents** | Native role files and parallel delegation inside those tools | Your workflow runs in Antigravity Desktop or CLI on Linux, macOS, or Windows | Your team works inside Claude Code or OpenAI Codex |
| **CrewAI / LangGraph / Microsoft Agent Framework** | General Python/TypeScript SDKs for building standalone multi-agent applications | You want a lightweight workspace harness without building an external orchestration service | You are building a standalone application, stateful graph, or multi-cloud agent service |

## Troubleshooting common issues

| Symptom | Cause | Resolution |
| --- | --- | --- |
| `Unknown command ...` or `'agy-squad run' was retired` | Retired `agy-squad run` PTY launcher was invoked | Run `agy-squad plan` with Antigravity native `/swarm`, or register `mcp/index.js` directly in `.agents/mcp_config.json` |
| Unbounded `read_file` denied by `Agy-Context-Saver` hook during live run | `Agy-Context-Saver` (`>= 2.0.1`, `2.0.4+` recommended) enforces the 3-tier Hybrid Slice Policy (`StartLine`/`EndLine` `<= 150` lines, or full-file `<= 800` lines & `<= 45 KiB`) | Locate symbols with `rtk grep`/`rtk find` and pass bounded `StartLine`/`EndLine` (`<= 150` lines) to `read_file` for workspace source files (reserve `rtk read` strictly for step spillovers and completed task logs); run `agy-context setup` if `rtk` (`>= 1.1.0`) is missing |
| `Requested explicit model ... cannot be pinned under executionMode 'subagent'` | `invoke_subagent` accepts only `inherit|flash|flash_lite|pro` | Set `executionMode: "swarm"` (`--mode swarm`) in `squad_planner` to explicitly pin and verify exact model IDs via `swarm status` |
| Swarm UI shows old posts, retired workers, or loads slowly across waves | Antigravity keeps one append-only board per conversation (`killed: true` entries stay in history) and does not expose user-configurable channels when `swarm` lacks `action: "channel"` | Start a fresh Antigravity conversation per major `/swarm` wave for a clean board, or run follow-up cohorts via `invoke_subagent` ([Shared swarm board and channel limits](concepts.md#shared-swarm-board-and-channel-limits)) |
| Specialist silent past checkpoint | Waiting on permission prompt or stuck command | Run `swarm status`, `manage_subagents` (Desktop IDE), or `/agents` to inspect or stop the child, then verify underlying processes exited ([Stopping agents](stopping-agents.md)) |
