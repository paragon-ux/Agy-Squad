# Swarm Governance: Wire Format, Role Separation & Bundling

Reference for [`SKILL.md`](../SKILL.md).

## Pointer-Over-Wire Convention

1. **Report slots:** Write reports to `scratch/agy-squad/squad-<id>/specialist-N/report.md` (or inside `share`/`branch` before `collect`; undeclared `tasks`/`n` shards fail `bundle`).
2. **Single-line receipt (`<= 500` B):** No newlines; address `@coordinator` (flat) or `@<leadWorkerName>` (layered). Accepts spaced `-`, `--`, or `—`:
   - `@<target> READY <slot> - <note>` (also `--` or `—`)
   - `@<target> PARTIAL <slot> -- <note and blocker>`
   - `@<target> NO_REPORT - <reason>`
3. **Verbatim & scoped:** Copy raw posts verbatim into `handoffs[].message` for `inspect` (verified post-hoc). Always scope `read_board{since|seqs}`.

## Canonical Auditor Slots and Verdicts

| Role | Member | Strict Verdict | Responsibility |
| --- | --- | --- | --- |
| **Lead / Coord** | `<squad>-lead` / coordinator | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Verifies files/tests (`lead/report.md`). Never self-certifies integrity. |
| **Auditor** | `audit-<id>` (flat peer) | `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION` | Audits traces, evidence, `Evidence Digest`, `Target Squad: <id>`. Never issues `PASS`. |

- Compound verdicts (`PASS with Advisories`, `CONDITIONAL PASS`) are rejected (`mcp/verdicts.mjs`).
- Slots: `squad-integrity_auditor/specialist-1/report.md` (single-squad) or `squad-integrity_auditor-<id>/specialist-1/report.md` (multi-squad).

## Dual-Path Trace Inspection

- **Standalone native (`agy-context` absent):** Single-pass batch read of `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` (+ `transcript_full.jsonl` if `truncated_fields` set), matching child `conversationId`s (`subagent`) or Step 0/1 `sender=<coordId>` + `@<workerName>` (`/swarm`). Never copy raw JSONL into `scratch/` or poll step-by-step.
- **Optional `Agy-Context-Saver` installed:** Single-pass `agy-context transcript list --parent <id> --lineage`, `query --id <id> --summary`, or `read --id <id> --last-turns 10`. If restricted, extract a sanitized index before waking `audit-<id>`:
  - `agy-context transcript export --parent <coord-uuid> --sanitized --out scratch/agy-squad/transcript-index-<id>.md` (or `query --id <uuid> --roles assistant --include-tools --limit 50` + `step` on `ERROR`; never rely only on `--roles error`).
- **Fail closed:** Workspace re-runs alone never justify `CLEAN`. Emit `INTEGRITY VIOLATION` if traces cannot be verified via the active environment's path or tampering/fabrication is found.

## Bundle Record Schema and CLI

Verified bundles (`lead/report.sources.json`) prove SHA-256 **file integrity** for a coordinator-assembled record (not host authorship attestation):

```bash
agy-squad collect --plan <plan.json> --from <worktree-dir>...   # only if isolated
agy-squad verdict scratch/agy-squad/squad-<id>/lead/report.md
agy-squad bundle-init --plan <plan.json> [--squad <id>] (--handoff '<worker>=READY <slot> - <note>' | --handoffs <file.json>) \
  [--id-map <worker=id>] <verified-file...> --out <record.json> --digest
agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor[-<id>]/specialist-1/report.md
agy-squad finalize <record.json> [--replace] [--prune [--keep-reports]]
agy-squad verify scratch/agy-squad/squad-<id>/lead/report.sources.json --prune --expected-sha256 <sha256> [--keep-reports]
```

*(Passing `--digest` requires `--handoff` or `--handoffs` and at least one `<verified-file>`. Granular `fingerprint`, `inspect`, `digest`, `bundle`, and `prune <bundle> <sha256>` remain available; standalone `verify --prune` requires `--expected-sha256 <sha256>`.)*

```json
{
  "squadId": "storage", "workspace": "/path/to/repo", "verdict": "PASS", "requireIntegrityAudit": true,
  "verifiedFiles": { "src/storage.js": "<64-hex-sha256>" },
  "assignments": [{ "conversationId": "storage-wal-reviewer", "report": "scratch/agy-squad/squad-storage/specialist-1/report.md" }],
  "handoffs": [{ "sender": "storage-wal-reviewer", "message": "@storage-lead READY scratch/agy-squad/squad-storage/specialist-1/report.md - fsync guard verified" }]
}
```

Flags: `--allow-unaudited` (`auditPolicy: "unaudited-explicit"`), `--replace` / `--predecessor <sha256>`, `--keep-reports`.
