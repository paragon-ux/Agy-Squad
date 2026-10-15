# Decision and work ledger (canonical)

This file is the **single source of truth** for Agy-Squad's cross-cutting decisions and open items.

**When to read it:** every session reads it first, and again after any context compaction.

**Where the detail lives:** the plans hold the reasoning. This file holds the status, and points to them.

**Updating it:**
- **One row per decision.** Keep each row to one or two sentences; the reasoning goes in a plan, linked from the row.
- Every commit or PR that settles or changes an item updates its row in the same commit.
- **Mark items `done` as they land, with the commit that completed them.**
- A decision made in a side chat is not settled until it has a row here with its source.
- **Conflicts** between two recorded decisions:
  - a **minor** one: the newer decision wins; record it and note the conflict in the row;
  - a **major** one: mark it `conflict` and ask the user.
- Rows proposed by an agent stay `open` until the user confirms them.
- **Row IDs are shared with [Agy-Context-Saver's ledger](https://github.com/paragon-ux/agy-context-saver/blob/main/docs/plans/LEDGER.md) and never reused.** A row keeps its ID when it moves between the two, which is why each ledger has gaps.

**Status values:**
- `open`: not decided, or proposed and not yet confirmed by the user;
- `decided`: decided, not yet built (or built but not yet committed, as the row says);
- `in PR n`: being built in that PR;
- `done`: completed and committed (the row cites the commit);
- `conflict`: two recorded decisions disagree, and only the user settles it.

**Sources:**
- `user`: the user's own words;
- `main`: the main working chat;
- `side`: the user's side chat, pasted into main.

## Where the item registries live

| IDs | Registry |
|---|---|
| P0–P5 (phases), V1–V8 (verifications) | [docker-sandbox-plan.md](docker-sandbox-plan.md) |

## Ledger

### Invariants (apply to every design)

| ID | Item | Source | Status | Decision | Link |
|---|---|---|---|---|---|
| L1 | Zero trust in agents | user, 2026-10-14 | decided | Boundaries are enforced by the host, never by agent self-discipline or prompt wording. | plan §3.1 |
| L2 | No regex security perimeter | user, 2026-10-14 | decided | Never filter shell commands with regex as a security boundary. Strip tools at the schema level, deny by tool name, and jail at the OS level. | plan §3.2–3.3 |
| L3 | `manage_subagents` is never blockable | user, 2026-10-14 | decided | No hook matches it, and no code path can deny or delay it. | plan §3.6, V6 |
| L4 | No shared mutable state in `os.tmpdir()` | user, 2026-10-14 | decided | Agy-Squad keeps its per-user state in `%LOCALAPPDATA%\agy-squad\`. | plan §3.2 |
| L5 | Immediate kill on the user's command | user, 2026-10-14 | decided | The panic command (L24) removes every sandbox at once, and agents left without one are inert. | plan §3.6 |
| L6 | Subagents can't read other agents' transcripts | user, 2026-10-14 | decided | Host read tools are denied to bound conversations, and no container mounts `~/.gemini`. | plan §3.3–3.4 |
| L7 | Tests never start real agents | main, 2026-10-15; user accepted 2026-10-15 | decided | Live checks are manual, run by the user with the panic command ready, and never part of `npm test`. This is the lesson of the 2026-10-14 breach. | plan §4 |

### Platform

| ID | Item | Source | Status | Decision | Link |
|---|---|---|---|---|---|
| L8 | No WSL requirement for users | user, 2026-10-14 | decided | Antigravity runs natively on Windows; the IDE dev-container build lacks `invoke_subagent`. | — |
| L9 | Subagent execution runs in Docker Desktop | user, 2026-10-15 | decided | "We'll just go with Docker." | plan §2 |
| L10 | Native jails are not pursued | user, 2026-10-15 | decided | AppContainer breaks git/npm; the restricted-token jail breaks test runners and bash and has no network isolation. Tests from 2026-10-15. | plan §2 |
| L11 | Workspaces live in Docker volumes, not bind mounts | main, 2026-10-15; user accepted 2026-10-15 | decided | Bind mounts were 5–27× slower and made 2 tests time out, and they expose `.git` hooks/config to the agent. | plan §2, §3.5 |
| L12 | Antigravity's built-in Windows terminal sandbox | main, 2026-10-15; user accepted 2026-10-15 | decided | Needs Windows 11 24H2 with the August 2026 update; the development machine is on 21H2. Deferred: revisit after an upgrade; not on the path. | — |

### Repository and docs

| ID | Item | Source | Status | Decision | Link |
|---|---|---|---|---|---|
| L16 | The canary test from the old shared container | user, 2026-10-15 | decided | Moved here with the other subagent scripts and parked in `tests/legacy/` (not run). P2 rewrites it against the new sandbox. | plan P0, P2 |
| L29 | Not installable before P3 | main, 2026-10-15; user accepted 2026-10-15 | decided | No installer and `private: true` until the spawn gate and the sandbox exist, because a payload used today would start an unsandboxed host subagent. | [index](../index.md) |
| L30 | Docs are a Zensical site | user, 2026-10-15 | done (`8e461bf`) | Same as waymark-engine, PDLt and Agy-Context-Saver. Plans and this ledger live in `docs/plans/` and are listed in the nav while the project is in design. | `zensical.toml` |
| L31 | P0: subagent tools split out of Agy-Context-Saver | user, 2026-10-15 | done (`8e461bf`; Agy-Context-Saver `dd94778`) | `subagent_brief` and `dispatch_squad` (payload only) moved here with 15 tests; Agy-Context-Saver no longer has any subagent tool. | plan P0 |

### Sandbox design

| ID | Item | Source | Status | Decision | Link |
|---|---|---|---|---|---|
| L17 | Main agent scope | user, 2026-10-15 | decided | The main agent runs on the host by default; sandboxing it is opt-in. Docker is too slow to impose on the main agent, and a forced sandbox would limit uses of Agy-Context-Saver beyond spawning subagents. | plan §3.1 |
| L18 | Spawn gate on `invoke_subagent` | main, 2026-10-15; user accepted 2026-10-15 | decided | The hook denies spawns without a valid HMAC binding and forces the sandbox preset. Depends on V1, V2 and V4. | plan §3.2 |
| L19 | Default-deny for bound conversations | main, 2026-10-15; user accepted 2026-10-15 | decided | An allow-list of sandbox tools plus `send_message`; everything else is denied. Depends on V3 and V6. | plan §3.3 |
| L20 | Shape of the sandbox tools | main, 2026-10-15; user accepted 2026-10-15 | decided | `sandbox_exec`, `sandbox_write`, `sandbox_edit` (reads go through `sandbox_exec rtk read`). | plan §3.3 |
| L21 | Deny by default, with an admission policy | user, 2026-10-15 | decided | Model it on OpenClaw. The default role is deny-all. Each role has a ceiling set in user config (network, mounts, resources, tools). Requests beyond a ceiling or from unknown roles are challenged and need the user's approval; nothing is granted silently. Agent containers start with no network. | plan §3.8 |
| L22 | Return path | main, 2026-10-15; user accepted 2026-10-15 | decided | Results come back as git bundles fetched into `agy/<squad>/<role>` branches. The host working tree is never written. | plan §3.5 |
| L23 | Fail closed without Docker | main, 2026-10-15; user accepted 2026-10-15 | decided | With no Docker, image or container, there is no dispatch and never a fallback to host execution. | plan §3.7 |
| L24 | The kill command is a panic command | user, 2026-10-15 | decided | It kills every process the system spawned: all containers and their processes, plus every host-side helper (prepare steps, `docker exec` clients, reapers). Stopping one agent normally stays with `manage_subagents`. | plan §3.6 |
| L28 | Panic and agent conversations | user, 2026-10-15 | decided | Panic leaves conversations inert rather than ending the language server. The docs give the commands to end the language server by hand. | [Stopping Agents](../stopping-agents.md) |
| L35 | Squad layout | user, 2026-10-15 | decided | One workspace volume per squad and one container per agent. Each agent has its own folder: a clone that borrows history from a read-only `base`. The lead mounts its leaves' folders read-only. Verifying the layout is a P2 gate. | plan §2.1, §3.4, P2 |
| L36 | Siblings can't see each other's processes or command lines | user, 2026-10-15 | decided | Enforced by separate containers. A shared squad container would need `SYS_ADMIN` to hide them (tested: `hidepid` is refused without it), so that layout was rejected. | plan §2.1 |
| L37 | Leads control leaves only through the host | main, 2026-10-15 | open | Proposed: no container gets Docker access or root. Leads stop leaves' conversations with `manage_subagents`, and leaves' commands with a host-side stop tool that checks the caller is the target's lead. | plan §3.6 |
| L38 | Sharing what's expensive | main, 2026-10-15 | open | Proposed: dependencies installed once per squad and mounted read-only; a per-squad cap on concurrent heavy commands (installs, builds, test runs); a pool of pre-started containers. | plan §2.1 |
| L39 | Docker Sandboxes | main, 2026-10-15 | open | Proposed: not adopted. It's proprietary, experimental and needs a Docker sign-in, doesn't support Antigravity's agents, and runs whole teams in one sandbox. Borrow two ideas instead: a host proxy that blocks traffic by default (an alternative to "no network plus a prepare step"), and credentials that never enter the container. | plan §2.1 |
