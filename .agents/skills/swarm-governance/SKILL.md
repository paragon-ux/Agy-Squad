---
name: swarm-governance
description: >-
  [Execution Modifier — pairs with /pr-review, /full-review, or /self-diagnosis on /swarm]
  Apply Agy-Squad governance, role separation, Pointer-Over-Wire reporting, and
  SHA-256 proof bundling on top of Antigravity native /swarm execution.
---

# Agy-Squad Swarm Governance (Native `/swarm` Execution Modifier)

Agy-Squad serves as the **governance, integrity auditing, and file-integrity layer** on top of Antigravity's native `/swarm` orchestration (`swarm`, `post_message`, `read_board`, `swarm_wait`, `swarm_monitor`). When paired with a **Task Spec** (`pr-review`, `full-review`, or `self-diagnosis`), this skill governs swarm execution, role separation, bundling, and closure while the Task Spec governs review scope and report format. Consult [Core workflows](../../../docs/core-workflows.md) and [Roles & skill workflows](../../../docs/roles-and-workflows.md#swarm-governance) for the full skill composition matrix.

**Surface Map:** Use `squad_planner` (MCP) or `node bin/agy-squad.mjs plan` for `/swarm` cohorts (pass `--manifest <path>` or inline `"<task>" [--scope ...] [--role ...] [--workspace-isolation inherit|share|branch]`; omit `squadId` to plan all squads—never pass `all_l1`). Use `dispatch_squad` (MCP) or `node bin/agy-squad.mjs dispatch` only for `invoke_subagent` fallback (`executionMode: "subagent"`). `mcp/handoffs.mjs` is the internal library module (never run it as a CLI; use `node bin/agy-squad.mjs`). The legacy `agy-squad run` PTY launcher (`L17`) is retired.

---

## 1. Planning & Explicit Model Pinning (`squad_planner` / `agy-squad plan`)

- Run `squad_planner`, `node bin/agy-squad.mjs plan --manifest <path> --model gemini-4-hydrogen-high`, or `node bin/agy-squad.mjs plan "<task>" --scope <path> --role <title> --workspace-isolation share` before spawning workers:
  - Under `executionMode: "swarm"` (default), `squad_planner` emits `swarmAdd` with explicit `model` pinning and instructs verification via `swarm{action: "status"}`. Call `swarm{action: "models"}` first (or pass `knownModels`) so typos fail before spawn.
  - **Surface the Swarm UI immediately:** Right after launching workers with `swarm{action: "add"}` and confirming models via `swarm{action: "status"}`, end that turn with the live board link from `open_board` (`[Open the Swarm UI](sidecar://swarm/swarm_board/)`, or `?tab=graph` for the @mention graph) on its own line—do not call `swarm_wait` silently on the launch turn, because ending the turn parks the coordinator cleanly and renders the Swarm UI pill immediately for the user.
  - Under `executionMode: "subagent"`, `invoke_subagent` accepts only `inherit|flash_lite|flash|pro`; `modelProvenance` flags when exact model IDs cannot be pinned or verified per-child.
  - Record parent-known worker names and `conversationId`s in `provenanceScaffold` and pass them to the flat auditor (`audit-<id>`)—never copy raw `.system_generated/` transcripts into `scratch/` (`L6`).

---

## 2. Strict Role Separation

Never conflate content acceptance with integrity auditing:

| Role | Native `/swarm` Member | Verdict Format | Responsibility |
| :--- | :--- | :--- | :--- |
| **Working Lead** | `<squad>-lead` (layered) or coordinator (flat) | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Reviews specialist deliverables, runs tests, and owns final technical acceptance. |
| **Integrity Auditor** | `audit-<id>` (flat peer) | `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION` | Independent peer auditing tool traces, primary evidence, and absence of sycophancy or guessing. Must record `Target Squad: <id>`. |

- **Strict single-line enforcement:** Avoid hedged verdicts (e.g., `PASS with Advisories`, `CONDITIONAL PASS`). `agy-squad verdict` and `bundleReports` deterministically reject hedged or contradictory verdict lines.
- **Canonical auditor naming:** `squad_planner` generates `/swarm` member `audit-<id>` writing to `scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md` (and `dispatch_squad` compiles it under `integrity_auditor[:<id>]`). Use this flat peer rather than nested sub-hierarchies.

---

## 3. Pointer-Over-Wire on the Swarm Board

Posting 50 KB Markdown reports directly to the `/swarm` board forces every waiting worker to ingest them on subsequent turns, causing quadratic token bloat.

1. Instruct each `/swarm` worker to write its full Markdown report to its workspace-relative scratch slot (e.g., `scratch/agy-squad/squad-<id>/specialist-N/report.md`, or inside its `share`/`branch` copy before coordinator collection).
2. Have the worker post a single-line pointer (under 500 UTF-8 bytes) to the board:
   - `@lead READY <report-path> — <1-line concrete observation>`
   - `@lead PARTIAL <report-path> — <observation and blocker>`
   - `@lead NO_REPORT — <reason>`
3. When recording board receipts into `<bundle-record.json>` `handoffs[].message` for `inspectHandoffs` (`agy-squad inspect`), strip the leading `@lead ` mention prefix so each message starts with `READY `, `PARTIAL `, or `NO_REPORT`.

> [!NOTE]
> This pointer format is a convention. The board does not enforce it, and `agy-squad inspect` detects deviations after the fact rather than preventing them. Neither flat nor layered topology is forced as default—ask the user if topology is unspecified; `squad_planner` reports both tradeoffs in its `notes` output.

---

## 4. Post-Swarm File-Integrity Bundling

**What a bundle attests, and what it does not.** `bundle`/`verify` bind SHA-256 digests of the verified files, worker reports and the integrity-audit report to a `<bundle-record.json>`, and `verify` fails if any of them changed afterward. The coordinator assembles `assignments`, `handoffs`, and `sender` from the board (`workerName` in `/swarm`). Treat a verified bundle as file-integrity evidence for a coordinator-assembled record, not as proof of authorship or truth of claims.

Since `agy-squad` is a workspace-private package (`"private": true`), invoke the CLI directly via `node bin/agy-squad.mjs` (enforces `requireIntegrityAudit: true` by default):

```bash
node bin/agy-squad.mjs verdict scratch/agy-squad/squad-<id>/lead/report.md
node bin/agy-squad.mjs verdict --integrity scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md
node bin/agy-squad.mjs fingerprint <verified-file-1> <verified-file-2>
node bin/agy-squad.mjs bundle <bundle-record.json>
node bin/agy-squad.mjs verify scratch/agy-squad/squad-<id>/lead/report.sources.json
node bin/agy-squad.mjs prune scratch/agy-squad/squad-<id>/lead/report.sources.json <bundle-sha256> --keep-reports
```

### `<bundle-record.json>` Schema
```json
{
  "squadId": "<id>",
  "workspace": "<realpath-to-workspace>",
  "verdict": "PASS",
  "requireIntegrityAudit": true,
  "verifiedFiles": { "<file>": "<64-hex>" },
  "assignments": [{ "conversationId": "<worker-id>", "report": "scratch/agy-squad/squad-<id>/specialist-1/report.md" }],
  "handoffs": [{ "sender": "<worker-id>", "message": "READY scratch/agy-squad/squad-<id>/specialist-1/report.md — <summary>" }]
}
```

The bundler (`mcp/handoffs.mjs`) programmatically computes and binds the integrity audit report's SHA-256 digest—never ask an LLM to manually copy-paste 64-character hashes in Markdown.

---

## 5. Runtime Closure Checklist (Pre-Handoff Gate)

See [Roles & skill workflows](../../../docs/roles-and-workflows.md#swarm-governance) for the canonical cross-role map and closure rationale (`Spike S5`). `bundle`/`verify` check file SHA-256 digests only; before ending a session, run all four runtime checks:

1. `swarm{action: "status"}`: every worker **including `monitor`** (exact monitor roster name in status, killed via `swarm{action: "kill", name: "monitor"}` after `[done]`) reports `state: "killed"`.
2. `manage_subagents(Action='list')`: `0 active subagent(s): []`.
3. `manage_task(Action='list')`: `No background tasks are currently running.` (catches lingering `swarm_monitor` daemon crons).
4. Child commands: any worker-launched builds, servers, or watchers exited cleanly.
