# Swarm Governance: Wire Format, Role Separation & Bundling

Reference for [`SKILL.md`](../SKILL.md).

## Pointer-Over-Wire Convention

1. **Report slots:** Write reports to `scratch/agy-squad/squad-<id>/specialist-N/report.md` (or inside `share`/`branch` before `collect`; undeclared `tasks`/`n` shards fail `bundle`).
2. **Single-line receipt (`<= 500` B):** No newlines; address `@coordinator` (both flat and wave-gated layered; append `wt="<abs-worktree-root>"` in `<note>` under `share`/`branch`). Accepts spaced `-`, `--`, or `—`:
   - `@coordinator READY <slot> - <note>` (also `--` or `—`)
   - `@coordinator PARTIAL <slot> -- <note and blocker>`
   - `@coordinator NO_REPORT - <reason>`
3. **Verbatim & scoped:** Copy raw posts verbatim into `handoffs[].message` for `inspect` (verified post-hoc). Skip Turn-1 `read_board` (Step 1 holds the brief); scope post-wakeup `read_board{since|seqs}` strictly to receipt sequence IDs.
4. **Sources & citation carry-forward:** Any specialist or lead report citing external URLs or repository code should include a `## Sources` section with descriptive `[Title](url)` or `path:line` entries (never generic `reference 1` labels). Carry every cited source forward into synthesis (or drop prose claims that depended on omitted sources), run `finalize [--strict-citations]` without `--prune` before synthesis (or synthesize before `finalize --prune` / pass `--keep-reports`), and reconcile any `citations.uncarriedUrls` reported by `bundle-init --digest`, `digest`, `bundle`, `verify`, or `finalize` (pass `--strict-citations` on `bundle`/`finalize` to fail closed before bundling/pruning when any specialist URL is missing from `lead/report.md`).

## Canonical Auditor Slots and Verdicts

| Role | Member | Strict Verdict | Responsibility |
| --- | --- | --- | --- |
| **Lead / Coord** | `<squad>-lead` / coordinator | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Verifies files/tests (`lead/report.md`). Never self-certifies integrity. |
| **Auditor** | `audit-<id>` (flat peer) | `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION` | Audits traces, evidence, `Evidence Digest`, `Target Squad: <id>`. Never issues `PASS`. |

- Compound verdicts (`PASS with Advisories`, `CONDITIONAL PASS`) are rejected (`mcp/verdicts.mjs`).
- Slots: `squad-integrity_auditor/specialist-1/report.md` (single-squad) or `squad-integrity_auditor-<id>/specialist-1/report.md` (multi-squad).

## Dual-Path Trace Inspection

- **Standalone native (`agy-context` absent):** Single-pass batch read of `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` (+ `transcript_full.jsonl` if `truncated_fields` set), matching child `conversationId`s (`subagent`) or Step 0/1 `sender=<coordId>` + `@<workerName>` (`/swarm`). Never copy raw JSONL into `scratch/` or poll step-by-step.
- **Optional `Agy-Context-Saver` installed:** Single unchained `agy-context transcript` commands (read-only `|` stdin pipes such as `rg`/`grep`/`head`/`tail`/`jq` allowed; no `&&` or `;`): discover via `list --parent <id> --json` or `health --id u1,u2 --json`, then audit tool traces in parallel via `query --id <uuid> --summary --include-tools --full` (or `--field tool_calls|tool_args`), `read --id <uuid> --full`, and `step <N|N-M> --id <uuid> --full` (use `--out <path>` if raw output exceeds `9 KB`). If restricted, extract a sanitized index before waking `audit-<id>`:
  - `agy-context transcript export --parent <coord-uuid> --sanitized --out scratch/agy-squad/transcript-index-<id>.md` (or `query --id <uuid> --roles assistant --include-tools --full --limit 50` + `step --id <uuid> --full` on `ERROR`; never rely only on `--roles error`).
- **Fail closed:** Workspace re-runs alone never justify `CLEAN`. Emit `INTEGRITY VIOLATION` if traces cannot be verified via the active environment's path or tampering/fabrication is found.

## Bundle Record Schema and CLI

Verified bundles (`lead/report.sources.json`) prove SHA-256 **file integrity** for a coordinator-assembled record (not host authorship attestation):

```bash
agy-squad collect --plan <plan.json> --handoffs <handoffs.json>                  # auto-extracts wt=<dir> if isolated
agy-squad bundle-init --plan <plan.json> --all-squads --handoffs <handoffs.json> \
  --from-scope --digest --out-dir scratch/records                                # enforces Content Verdict + emits auditSwarmAdd
# Run Wave-3 audit-<id> (using emitted auditSwarmAdd), then finalize all squads without --prune:
agy-squad finalize scratch/records/*.json [--strict-citations] [--replace]
# Synthesize final deliverable / ledger once with verified bundle SHA-256 hashes, then prune & clean records:
agy-squad prune --records <record.json>=<accepted-sha256>... --clean-records [--keep-reports]
```

*(Note: `bundle-init --digest` and `finalize` already enforce strict `Content Verdict` and `Integrity Verdict` parsing internally; standalone `agy-squad verdict [--integrity] <report.md>` remains available as a standalone helper.)*

```json
{
  "squadId": "storage", "workspace": "/path/to/repo", "verdict": "PASS", "requireIntegrityAudit": true,
  "verifiedFiles": { "src/storage.js": "<64-hex-sha256>" },
  "assignments": [{ "conversationId": "storage-wal-reviewer", "report": "scratch/agy-squad/squad-storage/specialist-1/report.md" }],
  "handoffs": [{ "sender": "storage-wal-reviewer", "message": "@coordinator READY scratch/agy-squad/squad-storage/specialist-1/report.md - fsync guard verified" }]
}
```

Flags: `--allow-unaudited` (`auditPolicy: "unaudited-explicit"`), `--from-scope`, `--strict-citations`, `--replace` / `--predecessor <sha256>`, `--keep-reports`.
