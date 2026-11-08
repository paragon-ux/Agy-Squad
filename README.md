# Agy-Squad

Task-driven subagent orchestration for the Antigravity CLI on WSL.

`dispatch_squad` compiles a cohort of direct specialists or squad leads. Each assignment gets an evidence report slot and one Pointer-Over-Wire message with a finding and its report path. Parents independently verify the evidence that determines the result. Antigravity handles native launch, Reactive Wakeup, and stopping.

- [Manifest and tool contract](docs/tools.md)
- [WSL CLI verification and live trial](docs/plans/wsl-cli-verification.md)
- [Decisions](docs/plans/LEDGER.md)

Agy-Context-Saver is the companion package for RTK command rewriting, lifecycle governance, and transcript tools.

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

| Approach | Work allocation | Handoff and verification |
| --- | --- | --- |
| Antigravity Teamwork, the control | Scoping interview, approved prompt, dedicated project directory, and built-in orchestration and verification roles | Structured milestones and integrity checks within Teamwork's selected mode |
| Agy-Context-Saver 1.7.0 | One batch of task-specific subagent briefs | Summary and report pointer from each specialist |
| Agy-Squad | One command in the caller's workspace. One compile per cohort, with a flat stage or leads chosen for the task | One observation and evidence pointer per assignment. Each parent checks the claims that determine the result. |

Compare Teamwork and Agy-Squad on equivalent starting inputs and the same external acceptance checks. Record time to first delegation, approval prompts and wait time, parent coordination calls, time to independently verified results, and teardown effort separately. [Antigravity Teamwork](https://antigravity.google/docs/teamwork/)

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
