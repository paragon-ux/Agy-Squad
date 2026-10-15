# Agy-Squad

Agent teams for Google Antigravity on Windows, without trusting any agent.

Antigravity can delegate work to subagents. Agy-Squad organizes those subagents into staged squads (a lead plus its specialists). The goal is for every subagent to run its commands and edits inside its own Docker container, enforced by the host rather than promised by the agent.

!!! danger "Under construction, not installable"
    Today Agy-Squad only builds briefs and payloads. The Docker sandbox and the spawn gate that would confine subagents don't exist yet. A payload used now would start an **unsandboxed** subagent on your machine, so nothing registers Agy-Squad with Antigravity until plan phase P3 is done (ledger L23, L29).

## How it relates to Agy-Context-Saver

[Agy-Context-Saver](https://paragon-ux.github.io/agy-context-saver/) is complete without subagents: RTK command rewriting, lifecycle governance and transcript tools. The subagent tools moved here on 2026-10-15 so that what works stays separate from what's under construction (ledger L26). Each is its own package, and the two will install side by side.

## What's here today

| Tool | What it does |
|---|---|
| [`subagent_brief`](tools.md#subagent_brief) | Turns an objective and a file scope into a scope-isolated brief plus a ready-to-use `invoke_subagent` payload. Handles single subagents, batches, and leads with pre-compiled children. |
| [`dispatch_squad`](tools.md#dispatch_squad) | Reads a squad manifest and returns one stage at a time: first the leads, then each lead's specialists. |

Neither tool starts an agent. Spawning stays with Antigravity's own `invoke_subagent`, so `manage_subagents` and Reactive Wakeup keep working.

## Where it's going

- **One container per subagent**, with the workspace in a Docker volume. There are no host folders, no network and no Docker socket.
- **A spawn gate** on `invoke_subagent`, so the host decides which subagents start, and how.
- **Deny by default.** A subagent gets only what its role allows; anything more needs your approval.
- **A panic command** that kills everything the system spawned. See [Stopping Agents](stopping-agents.md).

The design, the evidence behind it, and the phases are in [Sandbox Design](plans/docker-sandbox-plan.md). Every decision and its status is in the [Decision Ledger](plans/LEDGER.md).

## Requirements (planned)

- Windows 11 with Antigravity, desktop app or IDE (developed on 21H2)
- Node.js 22+
- Docker Desktop (needed from phase P2 on)
