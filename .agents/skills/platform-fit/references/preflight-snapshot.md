# Pre-Flight Snapshot Format (`platform-fit`)

Coordinator guide for building pinned inputs under `scratch/platform-fit/<YYYY-MM-DD>-<short-sha>/` before launching the 3 `invoke_subagent` specialists. Building both files once avoids 3x redundant web fetches, keeps all specialists on one exact platform baseline, and prevents `[agy-transcript-access: self-only]` hook conflicts.

## 1. `00-platform-baseline.md` (Pinned Antigravity Platform Baseline)

Cap this file at `<= 250` lines so every specialist can read it in one bounded `read_file` call.

1. **Retrieve live official docs via `/antigravity-guide` hybrid retrieval:**
   - Fetch `https://antigravity.google/llms.txt` first to enumerate current docs URLs.
   - Fetch the raw `.md` mirrors for platform primitives directly relevant to `Agy-Squad`:
     - `https://antigravity.google/docs/skills.md`
     - `https://antigravity.google/docs/rules.md`
     - `https://antigravity.google/docs/hooks.md`
     - `https://antigravity.google/docs/plugins.md`
     - `https://antigravity.google/docs/mcp.md`
     - `https://antigravity.google/docs/sidecars.md`
     - `https://antigravity.google/docs/permissions.md`
     - `https://antigravity.google/docs/sandbox.md`
     - Latest entries under `## Antigravity App` and `## Antigravity CLI` in `https://antigravity.google/docs/changelog.md`
     - Any additional CLI, App, native `/swarm`, subagent, or `run_workflow` pages discovered in `llms.txt`.
   - Record built-in runtime orchestration primitives exposed in the active Antigravity session (`swarm`, `invoke_subagent`, `define_subagent`, `run_workflow`, `schedule`, `swarm_pane`, `swarm_monitor`).
2. **Offline / partial-fetch fail-safe:**
   - If network access is unavailable or any URL fails, set `Fetch Status: DEGRADED (offline)` (or `PARTIAL`) and list every unreached URL explicitly.
   - Specialists must mark any comparison depending on an unreached doc as `Unverified (Offline)` rather than guessing from memory.
3. **Required Markdown layout for `00-platform-baseline.md`:**

```markdown
# Pinned Antigravity Platform Baseline

- **Captured At (UTC):** `<ISO-8601>`
- **Target Checkout:** `Agy-Squad` | Branch `<branch>` | `HEAD <sha>` | Dirty `<yes|no>`
- **Fetch Status:** `LIVE` | `PARTIAL` | `DEGRADED (offline)`
- **Discovery Index:** `https://antigravity.google/llms.txt` (fetched `<yes|no>`)
- **Failed / Unreached URLs:** `none` (or exact list)

## Native Capability Matrix

| Capability | Native Antigravity Primitive | Source URL + Heading / Runtime Tool | Documented Limits & Guarantees |
| --- | --- | --- | --- |
| Multi-agent board | `/swarm` (`swarm` tool, `swarm_pane`, `swarm_monitor`) | `<url or runtime>` | Shared board visibility, `share`/`branch` copies, model pinning |
| Isolated fan-out | `invoke_subagent` / `define_subagent` | `<url or runtime>` | Isolated context, model aliases (`inherit`/`flash`/`flash_lite`/`pro`) |
| Scripted orchestration | `run_workflow` | `<url or runtime>` | Python fan-out/pipeline/aggregation |
| Customizations & packaging | Plugins, Skills, Rules, Hooks, MCP, Sidecars | `<url#heading>` | Discovery roots, loading priority, hook boundaries |
| Security & containment | Permissions, Terminal Sandbox | `<url#heading>` | Host-enforced vs. prompt-enforced boundaries |

## Recent Platform Changes (Changelog Highlights)

- `<date>` (`<surface>`): `<concise platform change affecting swarm, subagents, plugins, hooks, or MCP>`
```

## 2. `01-telemetry-extract.md` (Measured Run Telemetry Extract)

Pull prior run telemetry once from the coordinator (which is not locked by `[agy-transcript-access: self-only]`).

1. **When `agy-context` is installed and prior run transcripts exist:**
   - Run single unchained `agy-context transcript list` and `agy-context transcript health --parent <runId> --json` (or `--id <u1,u2,...> --json`) for the target recent `Agy-Squad` run(s), plus any vanilla Antigravity baseline session if available.
   - Summarize only observed empirical metrics (never copy raw `.system_generated/` JSONL files into `scratch/`).
2. **When no prior run transcripts exist or `agy-context` is absent:**
   - Write `Telemetry Status: LOCAL_PROBES_ONLY` so Specialist 3 restricts analysis to reproducible local Node/CLI probes without guessing runtime quota percentages.
3. **Required Markdown layout for `01-telemetry-extract.md`:**

```markdown
# Measured Run Telemetry Extract

- **Telemetry Status:** `MEASURED` | `LOCAL_PROBES_ONLY`
- **Source Run(s):** `<parentConvId> (<description>, <commit>)` | `none`
- **Baseline Comparison Run:** `<convId>` | `none`

## Role & Phase Metrics

| Role / Phase | Model | Sessions | Turns | Tool Calls | Transcript KB | Wall Clock | Observed Anomalies (Denials / Polling / Spills) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Coordinator (Setup / Glue / Closeout) | `<model>` | `1` | `<N>` | `<N>` | `<KB>` | `<mm:ss>` | `<counts>` |
| Leads / Specialists / Auditors | `<model>` | `<N>` | `<N>` | `<N>` | `<KB>` | `<mm:ss>` | `<counts>` |

## Observed Bottlenecks (Evidence-Backed)

- `<bottleneck>`: `<step/metric citation from agy-context health or outline>`
```
