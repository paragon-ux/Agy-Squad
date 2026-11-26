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
| **Lead / Coord** | `<squad>-lead` / coordinator | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Verifies files/tests (`lead/report.md`). Never self-certifies work verification. |
| **Auditor** | `audit-<id>` (flat peer) | `Work Verdict: VERIFIED` \| `NOT VERIFIED` (legacy `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION`) | Reviews `audit-check` work evidence, spot-checks cited claims against source, emits `Evidence Digest` and `Target Squad: <id>`. Never issues `PASS`. |

- Compound verdicts (`PASS with Advisories`, `CONDITIONAL PASS`, `VERIFIED with caveats`) are rejected (`mcp/verdicts.mjs`).
- Slots: `squad-integrity_auditor/specialist-1/report.md` (single-squad) or `squad-integrity_auditor-<id>/specialist-1/report.md` (multi-squad).

## Dual-Path Trace Inspection

- **Deterministic work-evidence pre-check + focused source claim spot-check:** Run `agy-squad audit-check --record <record.json> --coord-id <coordId>` first. It parses worker JSONL transcripts (decoding compact JSON-encoded args and hydrating `truncated_fields` from `transcript_full.jsonl`) to emit per-worker work evidence:
  - Provably opened files with inspection kind (`read_file` with `StartLine`/`EndLine` ranges, `shell_read`, `search`) separate from directory-only listings (`listedDirs`).
  - Mechanical citation validation (`BAD_CITATION_LINE` when a cited line exceeds file length, `CITED_UNOPENED` when a cited file was not provably opened), read-before-write step ordering (`REPORT_BEFORE_READS`), and per-report SHA-256 digests.
  - Hard-blocks (`ok: false`, exit 1) only on read-only file-tool writes into the repository outside `scratch/` (`REPO_WRITE_IN_READ_ONLY`) or unsafe/oversized trace paths (`O_NOFOLLOW` symlink checks). Missing or unrecognized traces degrade to `NO_TRACE` / `UNVERIFIED_TRACE` flags, and shell-command or external (`/tmp`) writes emit flags rather than hard violations because `readOnlyBaseline` already catches repository mutations.
- **Auditor claim spot-check (no direct cross-session transcript reads):** The Wave-3 auditor reviews `audit-check` output and spot-checks up to 3 claims per worker (prioritizing flagged workers and `CITED_UNOPENED` files) by opening the cited `file:line`. Because `agy-squad audit-check` reads worker transcripts directly via the Node CLI (not restricted by Agy-Context-Saver 2.3.0 `self-only` tool-argument rules), treat `self-only` as a convenience against direct cross-session tool reads rather than an isolation boundary against the CLI.
- **Fail closed:** Emit a per-worker table (`Worker | Flags | Claims checked | Result | Note`) plus standalone plain-text lines `Target Squad: <id>`, `Evidence Digest: <64-hex>`, and `Work Verdict: VERIFIED | NOT VERIFIED` (no backticks; `NOT VERIFIED` if claims are fabricated or read-only repo writes occurred; legacy `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` remains accepted).

## Bundle Record Schema and CLI

Verified bundles (`lead/report.sources.json`) prove SHA-256 **file integrity** and `readOnlyBaseline` immutability for a coordinator-assembled record:

```bash
agy-squad collect --plan <plan.json> --handoffs <handoffs.json>                  # auto-extracts wt=<dir> if isolated
agy-squad bundle-init --plan <plan.json> --all-squads --handoffs <handoffs.json> \
  --from-scope --coord-id <coordId> --digest --out-dir scratch/records                                # enforces Content Verdict + readOnlyBaseline
# Run Wave-3 audit-<id> (using emitted auditSwarmAdd + agy-squad audit-check), then finalize all squads without --prune:
agy-squad finalize scratch/records/*.json [--strict-citations] [--replace]
# Synthesize final deliverable / ledger once with verified bundle SHA-256 hashes, then prune & clean records:
# Pass one record=digest pair per accepted squad bundle.
agy-squad prune --records <record.json>=<accepted-sha256>... --clean-records [--keep-reports]
```

*(Note: `bundle-init --digest` and `finalize` already enforce strict content and audit verdict parsing internally; standalone `agy-squad verdict --work <report.md>` (or `--integrity` for a legacy deliverable) remains available as an optional troubleshooting helper.)*

```json
{
  "squadId": "storage", "workspace": "/path/to/repo", "verdict": "PASS", "requireIntegrityAudit": true,
  "verifiedFiles": { "src/storage.js": "<64-hex-sha256>" },
  "assignments": [{ "conversationId": "storage-wal-reviewer", "report": "scratch/agy-squad/squad-storage/specialist-1/report.md" }],
  "handoffs": [{ "sender": "storage-wal-reviewer", "message": "@coordinator READY scratch/agy-squad/squad-storage/specialist-1/report.md - fsync guard verified" }]
}
```

Flags: `--allow-unaudited` (`auditPolicy: "unaudited-explicit"`), `--from-scope`, `--strict-citations`, `--replace` / `--predecessor <sha256>`, `--keep-reports`.
