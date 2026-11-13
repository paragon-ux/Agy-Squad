# Getting started (Desktop IDE & CLI on POSIX / WSL2)

Agy-Squad is a staged subagent orchestration, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** across **Linux and WSL2 (with best-effort, untested macOS support)**. It compiles coding or review tasks into scoped Antigravity subagent assignments with `<= 500` byte `Pointer-Over-Wire` receipts, file-backed evidence slots, deterministic SHA-256 bundle checks, recursive [`self-diagnosis`](core-workflows.md#2-diagnose-and-optimize-the-harness-self-diagnosis), and the [`pr-review`](core-workflows.md#3-review-pull-requests-to-the-v130-standard) repository standard (`v1.3.0`).

## Host and companion compatibility matrix

| Layer | Requirement | Check command |
| --- | --- | --- |
| Operating system | Linux or WSL2 on Windows (primary verified targets; macOS is best-effort and untested) | `uname -a` |
| Node.js | `>= 22.0.0` | `node --version` |
| Python | `>= 3.9` (used by `bin/terminal.py` when launching the CLI PTY wrapper) | `python3 --version` |
| Antigravity surface | Antigravity Desktop (IDE) or authenticated `agy` CLI on `PATH` ([CLI install guide](https://antigravity.google/docs/cli/install/)) | Open Desktop IDE or run `agy --version` |
| Agy-Context-Saver | `>= 1.8.1` (`HEALTHY & ACTIVE`) for live governed cohorts | Call `get_installation_status` or `sync_installation` MCP tool |
| RTK binary | Pinned `0.51.0` (provisioned by `Agy-Context-Saver`) | `rtk --version` (or via `sync_installation`) |
| Native permissions | Controlled by Desktop IDE approvals or CLI `--mode` (`auto` / `accept-edits`) and `/agents` | Review before launching subagents |

## 1. Clone and verify your checkout

`Agy-Squad` runs directly from a local repository checkout (`package.json` sets `"private": true`). Clone the repository and run the offline test suite:

```bash
git clone https://github.com/paragon-ux/Agy-Squad.git
cd Agy-Squad
node --version
python3 --version
node bin/agy-squad.mjs --help
npm test
```

`npm test` runs locally in Node.js without starting `agy` or spawning subagents. It verifies the MCP server, dispatch compiler, handoff bundler, PTY launcher bridge (against a simulated CLI), `/self-diagnosis` profiler, and benchmark fixture.

## 2. Use in Antigravity Desktop (IDE) or manual MCP registration

In **Antigravity Desktop (IDE)** (or any workspace on Linux, macOS, or WSL2), register `agy-squad` in `.agents/mcp_config.json` (or your IDE MCP config) using the absolute path from `command -v node`:

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
        "dispatch_squad": { "eager": true }
      }
    }
  }
}
```

In Desktop IDE sessions, use Antigravity native `/swarm` paired with the `swarm-governance` skill (or call `dispatch_squad` / `diagnose.mjs --print-dispatch <squadId> --parent-id <conversationId>`), enforce strict single-line verdicts and SHA-256 bundles via `node bin/agy-squad.mjs` (`verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`), and stop completed subagents with `manage_subagents(Action='kill', ConversationIds=[...])`.

## 3. CLI Governance & Legacy Runner (`bin/agy-squad.mjs`)

For native `/swarm` workflows and CI verification, `bin/agy-squad.mjs` exposes offline governance subcommands (`fingerprint`, `inspect`, `bundle`, `verify`, `prune`, `verdict`). The local PTY wrapper (`bin/agy-squad.mjs run`) is **deprecated** in favor of Antigravity native `/swarm` (`L42`), but remains available when running from an interactive WSL2 terminal with `agy` on `PATH`:

| Mode | Command | Starts `agy`? | Spawns subagents? | When to use |
| --- | --- | :---: | :---: | --- |
| **1. Offline test** | `npm test` | No | No | Verify code, schemas, and fixtures locally or in CI at zero model cost |
| **2. Payload preview** | `node bin/agy-squad.mjs run --workspace "$PWD" "<task>"` | Yes | No | Inspect the compiled assignment plan and report slots in `agy` with child-launch, shell, and write tools disabled |
| **3. Live delegation** | `node bin/agy-squad.mjs run --workspace "$PWD" --launch "<task>"` | Yes | Yes | Execute delegated specialist or lead cohorts under your `agy` permission settings |

### Preview a task without launching children

Run from your checkout using the included benchmark fixture (no external repositories required):

```bash
node bin/agy-squad.mjs run --workspace "$PWD" \
  "Plan a read-only audit of benchmarks/teamwork-vs-squad/fixture and show the specialist scopes and report slots."
```

Omitting `--launch` opens an `agy` session configured for payload preview: `invoke_subagent`, `run_command`, `write_file`, and `edit_file` are omitted from the agent profile (`inheritCustomizations: false`). Review the compiled plan and exit `agy`.

### Launch a live cohort

When your companion status is healthy and you are ready to authorize child agents:

```bash
node bin/agy-squad.mjs run --workspace "$PWD" --launch \
  "Perform a read-only audit of benchmarks/teamwork-vs-squad/fixture, write specialist evidence reports, and verify cross-module findings."
```

Or dispatch a caller-defined manifest stage directly:

```bash
node bin/agy-squad.mjs run --workspace "$PWD" \
  --manifest benchmarks/teamwork-vs-squad/manifest.json --squad all_l1 --launch
```

## 4. What successful output looks like

1. In Desktop IDE or CLI sessions, `dispatch_squad` compiles the target stage and prepares the `scratch/agy-squad/...` report directories.
2. Each specialist writes its evidence report to its assigned slot (`scratch/agy-squad/.../specialist-<N>/report.md`) and returns a single-line `<= 500` byte receipt:
   ```text
   READY scratch/agy-squad/run-.../plan-.../squad-1/specialist-1/report.md — gateway/gateway.mjs:10 timingSafeEqual throws RangeError on short hex
   ```
3. The parent (or squad lead) inspects the cited source lines and tests to verify semantic correctness, records a strict `Content Verdict: PASS` (or `Verdict: PASS`) in `lead/report.md`, pairs with a flat `integrity_auditor` (`Integrity Verdict: CLEAN`), and runs `node bin/agy-squad.mjs` (`verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`) to record SHA-256 digests in `lead/report.sources.json`.
4. Exiting a managed CLI session removes the temporary workspace plugin and agent profile while keeping staged evidence in `scratch/agy-squad/run-<uuid>/`. Use `manage_subagents` (in Desktop IDE) or `/agents` (in CLI) to inspect or stop running subagents, and see [Stopping agents](stopping-agents.md) to verify child process termination.

## When to use Agy-Squad vs. alternatives

| Approach | Primary strength | Use Agy-Squad when... | Prefer comparator when... |
| --- | --- | --- | --- |
| **Antigravity native `/swarm`** | Native shared board, worktrees (`share`/`branch`), live model switching, and `swarm_monitor` | Pair Agy-Squad (`swarm-governance` + `bin/agy-squad.mjs`) on top of `/swarm` for role separation, `Pointer-Over-Wire` disk pointers, and SHA-256 CI proof bundles | You only need ephemeral board coordination without deterministic bundles or strict verdict gates |
| **Antigravity `/teamwork`** (or `/teamwork-preview`) | Autonomous multi-milestone campaigns with built-in wrapper, explorer, and semantic reviewer agents | You want proportional 2-to-3 agent cohorts in Desktop IDE or CLI, `<= 500` B receipts, SHA-256 evidence bundles, governed teardown, and integrated `self-diagnosis` + `pr-review` (`v1.3.0`) | You want a long autonomous campaign with built-in LLM reviewer/auditor agents |
| **Antigravity native subagents** (`invoke_subagent`) | Zero setup for ad hoc parallel tasks | You want a repeatable manifest, report-slot paths, receipt length enforcement, and bundle verification | You only need one quick ad hoc delegation |
| **Claude Code / Codex subagents** | Native role files and parallel delegation inside those tools | Your workflow runs in Antigravity Desktop or CLI on POSIX / WSL2 | Your team works inside Claude Code or OpenAI Codex |
| **CrewAI / LangGraph / Microsoft Agent Framework** | General Python/TypeScript SDKs for building standalone multi-agent applications | You want a lightweight workspace harness without building an external orchestration service | You are building a standalone application, stateful graph, or multi-cloud agent service |

## Troubleshooting common issues

| Symptom | Cause | Resolution |
| --- | --- | --- |
| `agy-squad: Open an interactive terminal to start a squad run.` | `bin/agy-squad.mjs run` CLI wrapper was invoked outside an interactive TTY | Run `bin/agy-squad.mjs run` in an interactive terminal, or register `mcp/index.js` directly in Antigravity Desktop IDE / `.agents/mcp_config.json` |
| `agy-squad: Antigravity CLI (agy) must be available on PATH.` or `agy-squad: Python 3 (python3) must be available on PATH.` | `agy` or `python3` is missing from `PATH` | Confirm `which agy` and `python3 --version` succeed in the same shell |
| `Agy-Squad: the dispatcher was not discovered within 15 seconds (startup timeout: ...)` | `agy` is unauthenticated, awaiting first-run prompt, or MCP discovery stalled | Run `agy` directly once to complete sign-in, then retry `bin/agy-squad.mjs run` |
| `read_file` denied by `Agy-Context-Saver` hook during live run | `Agy-Context-Saver` routes workspace reads to `rtk read` | Use `rtk read <file>` via `run_command`; run `sync_installation` if `rtk` (`0.51.0`) is missing |
| `invoke_subagent` unavailable in CLI session | Session started in preview mode (without `--launch`) | Re-run with `--launch` to include `invoke_subagent`, `run_command`, `schedule`, and `call_mcp_tool` |
| Specialist silent past checkpoint | Waiting on permission prompt or stuck command | Use `manage_subagents` (Desktop IDE) or `/agents` (CLI) to inspect or stop the child, then verify underlying processes exited ([Stopping agents](stopping-agents.md)) |
