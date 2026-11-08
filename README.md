# Agy-Squad

Task-driven subagent orchestration for the Antigravity CLI on WSL.

`dispatch_squad` compiles a cohort of direct specialists or squad leads. Each assignment gets an evidence report slot and one Pointer-Over-Wire message with a finding and its report path. Parents independently verify the evidence that determines the result. Antigravity handles native launch, Reactive Wakeup, and stopping.

- [Manifest and tool contract](docs/tools.md)
- [Head-to-head benchmark vs. Antigravity Teamwork](docs/benchmarks.md) ([benchmark folder](benchmarks/teamwork-vs-squad/README.md))
- [WSL CLI verification and live trial](docs/plans/wsl-cli-verification.md)
- [Decisions](docs/plans/LEDGER.md)

Agy-Context-Saver (`v1.8.1+`) is the companion package for RTK command rewriting, Reactive Wakeup lifecycle governance, and transcript forensics (`L31`). Before running live cohorts on a new WSL host, verify `Agy-Context-Saver` reports `HEALTHY & ACTIVE` (or invoke its `sync_installation` MCP tool to provision the pinned `rtk` binary); see [Companion integration](docs/index.md#companion-integration-agy-context-saver).

## Run a task on WSL

Use Node.js 22 or later, Python 3.9 or later, and an authenticated `agy` on PATH. From an interactive WSL terminal, run from the project directory or select a writable workspace with `--workspace`.

```bash
node /path/to/Agy-Squad/bin/agy-squad.mjs run --workspace /path/to/project --launch \
  "Investigate the intermittent retry failure and verify the fix."
```

The agent derives roles, scope, and success checks from the task. Independent work starts with direct specialists. When the task needs a layer of leads, each lead launches and verifies its own cohort. For a caller-defined stage, pass `--manifest ./run-plan.json --squad <id>` for direct specialists or `--squad all_l1` for leads. Manifest paths resolve from the selected workspace.

`--launch` authorizes native delegation for this session. Omit it for payload review with launch, file editing, and shell tools absent from the session profile. Run with `--launch` when ready to delegate. To reduce approvals, add `--mode auto` where Antigravity offers sandboxed auto mode, or `--mode accept-edits` for workspace edits. Native permission rules still apply. [Antigravity CLI modes and shortcuts](https://antigravity.google/docs/cli/reference/)

The launcher creates a temporary workspace plugin and agent profile. It uses the native MCP panel to discover the dispatcher before submitting the task. Report directories are prepared as cohorts are compiled. Exit the Antigravity session to remove the plugin and profile. Staged plans and evidence remain in the printed `scratch/agy-squad/run-…` directory. If a cohort is silent at its agreed checkpoint, check `/agents` for progress or pending approval before extending or stopping it.

## Compare orchestration

| Approach | Work allocation | Handoff, governance, and verification |
| --- | --- | --- |
| Antigravity Teamwork, the control | Scoping interview (or `[skip-interview]`), dedicated orchestration wrapper, and built-in planning and verification roles | Single top-level delegation with structured milestones and internal integrity checks |
| Agy-Squad + Agy-Context-Saver (`v1.8.1+`) | Direct workspace compile (`dispatch_squad`), choosing a flat specialist stage or domain leads proportional to the task | `<= 500` UTF-8 byte Pointer-Over-Wire receipt per assignment, `RTK` + Reactive Wakeup child governance, and SHA-256 `report.sources.json` verification (`mcp/handoffs.mjs`) |

### Head-to-head benchmark vs. Antigravity `/teamwork`

On an identical two-domain event-relay audit with six planted `P1` and `P2` bugs ([`benchmarks/teamwork-vs-squad/`](benchmarks/teamwork-vs-squad/README.md)), both systems caught all six bugs (`6 / 6`). Pairing **Agy-Squad** with **Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** finished in **`6m 15s` vs. `26m 19s`** (`4.2x` faster), used **`64` vs. `645` transcript steps** (`90.1%` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` byte reduction), injected **`249 B` vs. `4,940 B` into the parent context** (`95.0%` reduction across `1` wakeup vs. `5`), verified SHA-256 source and report digests in **`20 ms`** (`0` LLM tokens vs. `2` LLM verifier subagents), and left **`0` vs. `41` (`207.9 KB`) untracked files** in the workspace.

| Metric | Agy-Squad + Agy-Context-Saver | Antigravity `/teamwork` (`[skip-interview]`) | Improvement with Agy-Squad |
| --- | ---: | ---: | --- |
| **Planted defects caught** | **`6 / 6` (`100%`)** | **`6 / 6` (`100%`)** | Equal recall (`18` vs. `25` findings) |
| **Active wall-clock time** | **`6m 15s` (`375s`)** | **`26m 19s` (`1,579s`)** | **`4.2x` faster (`76.2%` less time)** |
| **Subagents spawned** | **`3`** (`1` lead, `2` specialists) | **`8`** (`teamwork` fleet) | **`2.7x` fewer subagents** |
| **Total transcript steps** | **`64`** | **`645`** | **`10.1x` fewer steps (`90.1%` reduction)** |
| **Total assistant LLM turns** | **`26`** | **`321`** | **`12.3x` fewer turns (`91.9%` reduction)** |
| **Total tool calls** | **`32`** | **`302`** | **`9.4x` fewer tool calls (`89.4%` reduction)** |
| **Aggregate raw transcript size** | **`148.2 KB`** | **`817.4 KB`** | **`5.5x` smaller (`81.9%` byte reduction)** |
| **Parent wakeups and injected bytes** | **`1` (`249 B`)** | **`5` (`4,940 B`)** | **`19.8x` fewer parent bytes (`95.0%` reduction)** |
| **Post-run untracked files** | **`0` (`0 B`)** | **`41` (`207.9 KB`)** | Clean working tree (`L41`) |

Run `node benchmarks/teamwork-vs-squad/verify-benchmark.mjs` to execute the offline fixture, manifest, and telemetry checks (`L7`), or read the full breakdown in [docs/benchmarks.md](docs/benchmarks.md). [Antigravity Teamwork](https://antigravity.google/docs/teamwork/)

## Manual registration and benchmark profiles

### Prepared smoke workspace

In the shared Antigravity checkout, run the following from the swarm suite. Its offline checks use the sibling Agy-Squad and Agy-Context-Saver 1.8.1 checkouts.

```bash
cd "$HOME/Antigravity/workspace/antigravity-swarm-orchestration-suite"
npm run setup
npm test
agy --sandbox --model gemini-3.8-flash-high --settings smoke-settings.json --agent wsl-smoke-main
```

For an existing registration, use `npm run setup:profiles` to refresh the presets and report helper while keeping the workspace settings. For a direct-specialist smoke trial, run the same commands from `$HOME/Antigravity/workspace/antigravity-orchestration-suite`.

1. Open `/mcp` and confirm that `agy-squad` is connected.
2. Send “Compile the smoke payload and show it. Wait for my launch instruction.”
3. Inspect the payload and separately authorize the launch when ready. In the swarm suite, expect one lead and two specialists.
4. Use `/agents` at the agreed evidence checkpoint. Review the parent's independent checks and keep the loose reports from this smoke trial.

### Register a custom workspace

Add the `agy-squad` entry to `mcpServers` in the workspace's `.agents/mcp_config.json`. Use the absolute WSL path from `command -v node` and replace the example checkout and workspace paths.

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

Place a `swarm-manifest.json` in the workspace using the [manifest example](docs/tools.md#manifest). Start `agy --sandbox` from that workspace and check `/mcp`. Compile with `squadId: "all_l1"` for leads or a named squad ID for specialists. Use the [WSL verification checklist](docs/plans/wsl-cli-verification.md) before authorizing native launches.

## Development

Run `npm test` with Node.js 22 or later and Python 3.9 or later. The suite compiles payloads, resolves fixture reports, and exercises the launcher with a fake CLI and the MCP server over stdio. It launches zero subagents.

## License

MIT
