# Pre-Flight Snapshot Format (`platform-fit`)

Coordinator guide for building pinned inputs under `scratch/platform-fit/<YYYY-MM-DD>-<short-sha>/` before launching the 3 `invoke_subagent` specialists. Building both files once avoids 3x redundant web fetches, keeps all specialists on one exact platform baseline, and prevents `[agy-transcript-access: self-only]` hook conflicts.

## 1. `00-platform-baseline.md` (Pinned Antigravity Platform Baseline)

Cap this file at `<= 250` lines so every specialist can read it in one bounded `read_file` call.

1. **Same-day baseline reuse:** If a `LIVE` `00-platform-baseline.md` already exists from today under `scratch/platform-fit/<YYYY-MM-DD>-*/`, copy it into the current run directory (updating `Target Checkout` and setting `Reused From: <prior-run-slug>`) instead of repeating live fetches.
2. **Ground locally first (zero network latency):**
   - Read the installed local `/antigravity-guide` offline subdocs (`references/cli.md`, `references/ide.md`, `references/app.md`, `references/sdk.md`) and built-in Antigravity platform skills (`agy-customizations`, `run-workflow`, `swarm_pane`, `plugin`, `mcp-app-development`).
   - Record built-in runtime orchestration primitives exposed in the active Antigravity session (`swarm`, `invoke_subagent`, `define_subagent`, `run_workflow`, `schedule`, `swarm_monitor`).
3. **Run one bounded live-delta check:**
   - Fetch `https://antigravity.google/llms.txt` and changed/relevant `.md` mirrors (`skills.md`, `rules.md`, `hooks.md`, `plugins.md`, `mcp.md`, `sidecars.md`, `permissions.md`, `sandbox.md`, plus any CLI, App, native `/swarm`, subagent, or `run_workflow` pages discovered in `llms.txt`) using bounded `curl -fsSL --max-time 10 <url>` (or `search_web`).
   - For `https://antigravity.google/docs/changelog.md`, head-slice only the recent entries under each relevant product heading (`## Antigravity App`, `## Antigravity CLI`, `## Antigravity IDE`) rather than reading the entire changelog.
4. **Offline / partial-fetch fail-safe:**
   - If network access is unavailable or any URL fails, keep the local-first baseline, set `Fetch Status: DEGRADED (offline)` (or `PARTIAL`), and list every unreached URL explicitly.
   - Specialists must mark any comparison depending on an unreached live doc as `Unverified (Offline)` rather than guessing from memory.
5. **Required Markdown layout for `00-platform-baseline.md`:**

```markdown
# Pinned Antigravity Platform Baseline

- **Captured At (UTC):** `<ISO-8601>`
- **Target Checkout:** `Agy-Squad` | Branch `<branch>` | `HEAD <sha>` | Dirty `<yes|no>`
- **Fetch Status:** `LIVE` | `PARTIAL` | `DEGRADED (offline)`
- **Reused From:** `none` (or `<YYYY-MM-DD>-<prior-sha>`)
- **Local Grounding:** `/antigravity-guide` subdocs + built-in skills (`agy-customizations`, `run-workflow`, `swarm_pane`, `plugin`, `mcp-app-development`)
- **Discovery Index:** `https://antigravity.google/llms.txt` (fetched `<yes|no>`)
- **Failed / Unreached URLs:** `none` (or exact list)

## Native Capability Matrix

| Capability | Native Antigravity Primitive | Source URL + Heading / Local Skill / Runtime Tool | Documented Limits & Guarantees |
| --- | --- | --- | --- |
| Multi-agent board | `/swarm` (`swarm` tool, `swarm_pane`, `swarm_monitor`) | `<url, local skill, or runtime>` | Shared board visibility, `share`/`branch` copies, model pinning |
| Isolated fan-out | `invoke_subagent` / `define_subagent` | `<url, local skill, or runtime>` | Isolated context, model aliases (`inherit`/`flash`/`flash_lite`/`pro`) |
| Scripted orchestration | `run_workflow` | `<url, local skill, or runtime>` | Python fan-out/pipeline/aggregation |
| Customizations & packaging | Plugins, Skills, Rules, Hooks, MCP, Sidecars | `<url#heading or local skill>` | Discovery roots, loading priority, hook boundaries |
| Security & containment | Permissions, Terminal Sandbox | `<url#heading>` | Host-enforced vs. prompt-enforced boundaries |

## Recent Platform Changes (Changelog Highlights)

- `<date>` (`<surface>`): `<concise platform change affecting swarm, subagents, plugins, hooks, or MCP>`
```

## 2. `01-telemetry-extract.md` (Measured Run Telemetry Extract)

Pull prior run telemetry once from the coordinator (which is not locked by `[agy-transcript-access: self-only]`).

1. **When `agy-context` is installed and prior run transcripts exist:**
   - Run single unchained `agy-context transcript list` and `agy-context transcript health --parent <runId> --json` (or `--id <u1,u2,...> --json`) to populate `Sessions`, `Turns`, `Tool Calls`, `Transcript KB`, `Polling`, and `Corrupt Lines` for the target recent `Agy-Squad` run(s), plus any vanilla Antigravity baseline session if available.
   - `Wall Clock`, `Denials`, and `Spills` are populated only from an optional bounded coordinator `agy-context transcript outline --id <coordId> --full --out scratch/platform-fit/<run-slug>/coord-outline.txt` pass; if you skip the outline pass, record `n/a (health-only)` in those cells (never copy raw `.system_generated/` JSONL files into `scratch/` or guess timings).
2. **When no prior run transcripts exist or `agy-context` is absent:**
   - Write `Telemetry Status: LOCAL_PROBES_ONLY` so Specialist 3 restricts analysis to reproducible local Node/CLI probes without guessing runtime quota percentages.
3. **Required Markdown layout for `01-telemetry-extract.md`:**

```markdown
# Measured Run Telemetry Extract

- **Telemetry Status:** `MEASURED (health + outline)` | `MEASURED (health-only)` | `LOCAL_PROBES_ONLY`
- **Source Run(s):** `<parentConvId> (<description>, <commit>)` | `none`
- **Baseline Comparison Run:** `<convId>` | `none`

## Role & Phase Metrics

| Role / Phase | Model | Sessions | Turns | Tool Calls | Transcript KB | Wall Clock | Observed Anomalies (Denials / Polling / Spills) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Coordinator (Setup / Glue / Closeout) | `<model>` | `1` | `<N>` | `<N>` | `<KB>` | `<mm:ss or n/a (health-only)>` | `<counts or n/a (health-only)>` |
| Leads / Specialists / Auditors | `<model>` | `<N>` | `<N>` | `<N>` | `<KB>` | `<mm:ss or n/a (health-only)>` | `<counts or n/a (health-only)>` |

## Observed Bottlenecks (Evidence-Backed)

- `<bottleneck>`: `<step/metric citation from agy-context health or outline>`
```
