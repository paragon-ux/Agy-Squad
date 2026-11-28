# Agy-Squad

[![npm version](https://img.shields.io/npm/v/agy-squad.svg)](https://www.npmjs.com/package/agy-squad)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-Zensical-purple.svg)](https://paragon-ux.github.io/Agy-Squad/)
[![CI](https://github.com/paragon-ux/Agy-Squad/actions/workflows/ci.yml/badge.svg)](https://github.com/paragon-ux/Agy-Squad/actions/workflows/ci.yml)

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](docs/assets/architecture-overview.svg)

Agy-Squad is a multi-agent swarm planner, code-review harness, and SHA-256 proof bundler for Google Antigravity on Linux, macOS, and Windows (Node.js 22 or newer, zero external npm dependencies). It splits reviews, audits, and implementation tasks across parallel Antigravity swarm workers with non-overlapping file scopes so workers do not collide or flood your context window. Each worker writes findings to a local report file, posts a short one-line status receipt, and can be audited and sealed into a SHA-256 proof bundle before you accept the result.

## Quickstart

Requires Node.js 22 or newer and Google Antigravity Desktop IDE or CLI (agy) with native swarm or subagent support. Works 100% standalone, including live native JSONL Integrity Audits. Optionally pairing with [Agy-Context-Saver](https://paragon-ux.github.io/Agy-Context-Saver/) (2.1.2+ recommended) adds hook-enforced context, shell, and transcript governance.

```bash
# Install the plugin, skills, MCP server, and agy-squad CLI
npx --package=agy-squad agy-squad setup

# Verify plugin, skills, MCP registration, and PATH status
npx --package=agy-squad agy-squad status
```

Reload Antigravity Desktop IDE after setup finishes so the MCP server and skills load. For shell PATH configuration, cohort planning and bundling examples, standalone mode, local checkout tests, and uninstallation, see the [Getting started guide](https://paragon-ux.github.io/Agy-Squad/getting-started/).

## How Agy-Squad extends native swarm

Agy-Squad configures Antigravity's native `/swarm` runtime rather than replacing it. It assigns non-overlapping file scopes, stages domain leads after specialist reports land, writes reports to local files with one-line status receipts, populates the Swarm UI Overview (`swarm/plan.json`), and checks worker transcripts and SHA-256 file hashes before you accept a review.

You do not need Agy-Squad for every task. Use `/boost` when fixing or investigating a single module, `invoke_subagent` (`research`) for a few quick read-only lookups, and `run_workflow` for scripted batch jobs that return typed JSON and can cancel the batch if one worker fails. Reach for Agy-Squad when you split a review or change across several areas, want completed reports kept if a sibling worker hits an error, need reports copied out of `share` or `branch` worktrees before `swarm kill` deletes them, or want a SHA-256 proof bundle:

![Native Antigravity /swarm vs. Agy-Squad roles and configuration additions](docs/assets/swarm-vs-agy-squad-roles.svg)

### Read-only subagent report collection
 
The npm package includes the custom `agy-squad-readonly` subagent type for read-only `invoke_subagent` specialists. Enable it with `readOnlySubagent: true` in `squad_planner` or `--readonly-subagent` with `agy-squad plan --mode subagent`. The specialist returns its Markdown report as chat text and sends only the short `READY` receipt. `agy-squad collect` then writes that report to the planned report slot without changing downstream hashing or verification.
 
In a default-open transcript environment, `collect` can extract the final `# Evidence Report` response directly from the worker transcript when the receipt sender is the worker conversation UUID. When Agy-Context-Saver policy is restrictive, direct extraction fails closed. Extract through the allowed CLI instead and ingest the resulting JSON:
 
```bash
agy-context transcript query --id <worker-uuid> --roles assistant --mode full --field content --limit 5 --full --json --out scratch/worker-transcript.json
agy-squad collect --plan scratch/plan.json --handoffs scratch/handoffs.json \
  --transcript-json scratch/agy-squad/squad-<id>/specialist-1/report.md=scratch/worker-transcript.json
```
 
## Built-in skills

Agy-Squad ships four user-facing Antigravity skills in the npm package covering structured code reviews, cold launch readiness, and swarm governance:

| Skill | Best for | What it delivers |
| --- | --- | --- |
| [pr-review](https://paragon-ux.github.io/Agy-Squad/skills/pr-review/) | Pull requests, branch diffs, and CI checks | Commit-pinned, eleven-category review reports (including security and vulnerabilities) with atomic one-ID-per-row findings and re-verification closure |
| [full-review](https://paragon-ux.github.io/Agy-Squad/skills/full-review/) | Whole repositories, subsystems, logs, or direction choices | Evidence-manifest triage across transcripts, CI runs, and code, plus structured direction decisions with constraints, options, and falsifiers |
| [day-one-review](https://paragon-ux.github.io/Agy-Squad/skills/day-one-review/) | Public launch readiness from a cold first-time user lens | Raw, unguided Day-1 audit under scratch/ with a user-journey trace matrix, ship verdict, selective-resume remediation, and cumulative follow-up passes |
| [swarm-governance](https://paragon-ux.github.io/Agy-Squad/skills/swarm-governance/) | Multi-agent teams running on Antigravity native swarm | Disjoint file scopes, model pinning, tiny one-line board receipts, independent integrity trace audits, SHA-256 proof bundles, and clean worker teardown |

Maintainers working inside an Agy-Squad source checkout also have the repo-only [self-diagnosis](https://paragon-ux.github.io/Agy-Squad/skills/self-diagnosis/) skill (excluded from end-user npm installs) for checking skill token budgets, links, closure gates, ledger schemas, and compiled prompt sizes.

## Documentation

Read the full documentation at [paragon-ux.github.io/Agy-Squad](https://paragon-ux.github.io/Agy-Squad/):

- [Overview](https://paragon-ux.github.io/Agy-Squad/)
- [Getting started](https://paragon-ux.github.io/Agy-Squad/getting-started/)
- [Core workflows: orchestrate, self-diagnose, review, and tear down](https://paragon-ux.github.io/Agy-Squad/core-workflows/)
- [Roles, skill workflows, and runtime closure checklist](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/)
- [Skill guides](https://paragon-ux.github.io/Agy-Squad/skills/pr-review/) ([pr-review](https://paragon-ux.github.io/Agy-Squad/skills/pr-review/), [full-review](https://paragon-ux.github.io/Agy-Squad/skills/full-review/), [day-one-review](https://paragon-ux.github.io/Agy-Squad/skills/day-one-review/), [swarm-governance](https://paragon-ux.github.io/Agy-Squad/skills/swarm-governance/), [self-diagnosis](https://paragon-ux.github.io/Agy-Squad/skills/self-diagnosis/))
- [Concepts and terminology](https://paragon-ux.github.io/Agy-Squad/concepts/)
- [Manifest and tool contract](https://paragon-ux.github.io/Agy-Squad/tools/)
- [Stopping agents and child processes](https://paragon-ux.github.io/Agy-Squad/stopping-agents/)
- [Benchmarks vs. Antigravity Teamwork](https://paragon-ux.github.io/Agy-Squad/benchmarks/)

## License

MIT License. Copyright (c) 2026 paragon-ux.
