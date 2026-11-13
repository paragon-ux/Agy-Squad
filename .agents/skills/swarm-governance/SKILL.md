---
name: swarm-governance
description: Apply Agy-Squad governance, role separation, Pointer-Over-Wire reporting, and SHA-256 proof bundling on top of Antigravity native /swarm execution.
---

# Agy-Squad Swarm Governance & Verification

Agy-Squad serves as the **governance, integrity auditing, and file-integrity layer** on top of Antigravity's native `/swarm` orchestration (`swarm`, `post_message`, `read_board`, `swarm_wait`, `swarm_monitor`).

Native `/swarm` handles worker spawning, worktree/branch isolation (`workspace: "share"` / `"branch"`), live model switching, and stall monitoring. Use `squad_planner` (MCP tool or `node bin/agy-squad.mjs plan`) + native `/swarm` to pin worker models explicitly (`swarm add`), detect writable `scopeFiles` overlaps, scaffold `L6`-safe `provenanceScaffold` (without copying raw `.system_generated/` transcripts), and bind SHA-256 bundles (`L42`, `L43`). The legacy `agy-squad run` PTY launcher (`L17`) is retired.

---

## 1. Planning & Explicit Model Pinning (`squad_planner` / `agy-squad plan`)

- Run `squad_planner` (or `node bin/agy-squad.mjs plan --manifest <path> --model gemini-4-hydrogen-high`) before spawning workers:
  - Under `executionMode: "swarm"` (default), `squad_planner` emits `swarmAdd` with explicit `model` pinning and instructs verification via `swarm{action: "status"}`.
  - Under `executionMode: "subagent"`, `invoke_subagent` accepts only `inherit|flash_lite|flash|pro`; `modelProvenance` explicitly flags when an exact model ID cannot be pinned or verified per-child.
  - Record parent-known worker names and `conversationId`s in `provenanceScaffold` and pass them to `integrity-auditor`—never copy raw `.system_generated/` transcripts into `scratch/` (`L6`).

---

## 2. Strict Role Separation

Never conflate content acceptance with integrity auditing:

| Role | Native `/swarm` Member | Verdict Format | Responsibility |
| :--- | :--- | :--- | :--- |
| **Working Lead** | `lead` / domain lead | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Reviews specialist deliverables, runs tests, and owns final technical acceptance. |
| **Integrity Auditor** | `integrity-auditor` (flat) | `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION` | Independent peer auditing tool traces, primary evidence, and absence of sycophancy or guessing. Must record `Target Squad: <id>`. |

- **Strict single-line enforcement:** Avoid hedged verdicts (e.g., `PASS with Advisories`, `CONDITIONAL PASS`). `agy-squad verdict` and `bundleReports` deterministically reject hedged or contradictory verdict lines.
- **Flat auditor preference:** Use a single flat `integrity-auditor` peer (or `integrity_auditor:<target>` slot `scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md`) rather than nested adversarial sub-hierarchies to eliminate invisible sub-subagents and reduce token burn.

---

## 3. Pointer-Over-Wire on the Swarm Board

Posting 50 KB Markdown reports directly to the `/swarm` board forces every waiting worker to ingest them on subsequent turns, causing quadratic token bloat.

1. Instruct each `/swarm` worker to write its full Markdown report to a workspace-relative scratch slot (e.g., `scratch/agy-squad/squad-<id>/specialist-N/report.md`).
2. Have the worker post a single-line pointer (under 500 UTF-8 bytes) to the board:
   - `@lead READY <report-path> — <1-line concrete observation>`
   - `@lead PARTIAL <report-path> — <observation and blocker>`
   - `@lead NO_REPORT — <reason>`
3. When recording board receipts into `<bundle-record.json>` `handoffs[].message` for `reconcileHandoffs`, strip the leading `@lead ` mention prefix so each message starts with `READY `, `PARTIAL `, or `NO_REPORT`.

> [!NOTE]
> This pointer format is a convention. The board does not enforce it, and workers can post anything. `agy-squad inspect` detects deviations after the fact; it cannot prevent them. A layered plan also adds a squad lead per working squad above the swarm coordinator; that extra layer is unmeasured, and a flat plan is the default recommendation. `squad_planner` reports both caveats in its `notes` output.

---

## 4. Post-Swarm File-Integrity Bundling

**What a bundle attests, and what it does not.** `bundle`/`verify` bind SHA-256 digests of the verified files, worker reports and the integrity-audit report to a `<bundle-record.json>`, and `verify` fails if any of them changed afterward. The record itself (`assignments`, `handoffs`, `sender`) is assembled by the coordinator from the board. The pipeline checks that each `sender` string matches a recorded assignment; it does **not** prove that the board carried that message or that the named worker wrote the report. Treat a verified bundle as file-integrity evidence for a coordinator-assembled record, not as proof of authorship or of the truth of any worker's claim. Use the swarm member name (the board identity) as the `conversationId` / `sender` string consistently.

Since `agy-squad` is a workspace-private package (`"private": true`), invoke the CLI directly via `node bin/agy-squad.mjs` (or `npm link` + `npx --no-install agy-squad`):

```bash
# 1. Validate strict verdicts
node bin/agy-squad.mjs verdict scratch/agy-squad/squad-<id>/lead/report.md
node bin/agy-squad.mjs verdict --integrity scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md

# 2. Fingerprint verified source files for <bundle-record.json>
node bin/agy-squad.mjs fingerprint <verified-file-1> <verified-file-2>

# 3. Bundle reports + programmatic integrity hash binding (enforces requireIntegrityAudit: true by default)
node bin/agy-squad.mjs bundle <bundle-record.json>

# 4. Verify bundle, synthesis, verified files, and integrity audit hash in CI/CD
node bin/agy-squad.mjs verify scratch/agy-squad/squad-<id>/lead/report.sources.json

# 5. Optionally prune loose reports (or pass --keep-reports to retain)
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
