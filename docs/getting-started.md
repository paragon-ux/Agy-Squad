# Getting started (Desktop IDE & CLI on POSIX / WSL2)

Agy-Squad is a staged subagent orchestration, self-diagnosis, and review harness for **Antigravity Desktop (IDE)** and the **Antigravity CLI (`agy`)** across **Linux and WSL2 (with best-effort, untested macOS support)**. It compiles coding or review tasks into scoped Antigravity subagent assignments with `<= 500` byte `Pointer-Over-Wire` receipts, file-backed evidence slots, deterministic SHA-256 bundle checks, recursive [`self-diagnosis`](core-workflows.md#2-diagnose-and-optimize-the-harness-self-diagnosis), and the [`pr-review`](core-workflows.md#3-review-pull-requests-to-the-v130-standard) repository standard (`v1.3.0`).

## Host and companion compatibility matrix

| Layer | Requirement | Check command |
| --- | --- | --- |
| Operating system | Linux or WSL2 on Windows (primary verified targets; macOS is best-effort and untested) | `uname -a` |
| Node.js | `>= 22.0.0` | `node --version` |
| Antigravity surface | Antigravity Desktop (IDE) with `/swarm` and/or `invoke_subagent` | Open Desktop IDE |
| Agy-Context-Saver | `>= 1.8.1` (`HEALTHY & ACTIVE`) for live governed cohorts | Call `get_installation_status` or `sync_installation` MCP tool |
| RTK binary | Pinned `0.51.0` (provisioned by `Agy-Context-Saver`) | `rtk --version` (or via `sync_installation`) |
| Native permissions | Controlled by Desktop IDE approvals and `/swarm` / `/agents` | Review before launching workers |

## 1. Clone and verify your checkout

`Agy-Squad` runs directly from a local repository checkout (`package.json` sets `"private": true`). Clone the repository and run the offline test suite:

```bash
git clone https://github.com/paragon-ux/Agy-Squad.git
cd Agy-Squad
node --version
node bin/agy-squad.mjs --help
npm test
```

`npm test` runs locally in Node.js without spawning live subagents. It verifies the MCP server, `dispatch_squad` compiler, `squad_planner` cohort planner, handoff bundler, `/self-diagnosis` profiler, and benchmark fixture.

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
        "dispatch_squad": { "eager": true },
        "squad_planner": { "eager": true }
      }
    }
  }
}
```

In Desktop IDE sessions, use `squad_planner` paired with Antigravity native `/swarm` and the `swarm-governance` skill (or call `dispatch_squad` / `diagnose.mjs --print-dispatch <squadId> --parent-id <conversationId>`), enforce strict single-line verdicts and SHA-256 bundles via `node bin/agy-squad.mjs` (`plan`, `verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`), and stop completed subagents with `manage_subagents(Action='kill', ConversationIds=[...])`.

## 3. CLI Planner & Governance (`bin/agy-squad.mjs`)

For native `/swarm` workflows and CI verification, `bin/agy-squad.mjs` exposes offline planning and governance subcommands (`plan`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`, `verdict`). Legacy `agy-squad run` (`bin/terminal.py`) was retired in Phase 2 (`L17`, `L42`, `L43`).

### Generate a `/swarm` plan and provenance scaffold

```bash
node bin/agy-squad.mjs plan \
  --manifest .agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json \
  --model gemini-3.8-flash-high
```

Or plan directly from a freeform task description:

```bash
node bin/agy-squad.mjs plan \
  --mode swarm \
  --model gemini-3.8-flash-high \
  --scope src/app.js --scope docs/tools.md \
  --role "Implementer" --role "Reviewer" \
  "Verify Phase 2 runtime fixes and update documentation."
```

## 4. What successful output looks like

1. In Desktop IDE or CLI planning, `squad_planner` (or `dispatch_squad`) compiles worker specs, report slots under `scratch/agy-squad/...`, model provenance metadata, and an `L6`-safe `provenanceScaffold`.
2. Each worker writes its evidence report to its assigned slot (`scratch/agy-squad/.../specialist-<N>/report.md`) and returns a single-line `<= 500` byte receipt:
   ```text
   READY scratch/agy-squad/squad-1/specialist-1/report.md — gateway/gateway.mjs:10 timingSafeEqual throws RangeError on short hex
   ```
3. The parent (or squad lead) inspects the cited source lines and tests to verify semantic correctness, records a strict `Content Verdict: PASS` (or `Verdict: PASS`) in `lead/report.md`, pairs with a flat `integrity_auditor` (`Integrity Verdict: CLEAN`), and runs `node bin/agy-squad.mjs` (`verdict`, `fingerprint`, `inspect`, `bundle`, `verify`, `prune`) to record SHA-256 digests in `lead/report.sources.json`.
4. Use `swarm status` / `manage_subagents` to verify running worker models or stop running children ([Stopping agents](stopping-agents.md)).

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
| `Unknown command ...` or `'agy-squad run' was retired` | `agy-squad run` was invoked after Phase 2 retirement | Use `node bin/agy-squad.mjs plan` with Antigravity native `/swarm`, or register `mcp/index.js` directly in `.agents/mcp_config.json` |
| `read_file` denied by `Agy-Context-Saver` hook during live run | `Agy-Context-Saver` routes workspace reads to `rtk read` | Use `rtk read <file>` via `run_command`; run `sync_installation` if `rtk` (`0.51.0`) is missing |
| `Requested explicit model ... cannot be pinned under executionMode 'subagent'` | `invoke_subagent` accepts only `inherit|flash|flash_lite|pro` | Use `executionMode: "swarm"` (`--mode swarm`) in `squad_planner` to explicitly pin and verify exact model IDs via `swarm status` |
| Specialist silent past checkpoint | Waiting on permission prompt or stuck command | Use `swarm status`, `manage_subagents` (Desktop IDE), or `/agents` to inspect or stop the child, then verify underlying processes exited ([Stopping agents](stopping-agents.md)) |
