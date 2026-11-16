# Swarm Governance: Pointer-Over-Wire, Role Separation & Bundling Schema

Reference details for [`.agents/skills/swarm-governance/SKILL.md`](../SKILL.md). Preserves complete wire-format examples, role-separation constraints, and SHA-256 verification schemas without inflating `SKILL.md` entry context.

## Pointer-Over-Wire Convention

Posting 50 KB Markdown reports directly to the `/swarm` board forces every waiting worker to ingest them on subsequent turns, causing quadratic token bloat.

1. **Write workspace report slots:** Instruct each `/swarm` worker to write its full Markdown report to its workspace-relative scratch slot (for example, `scratch/agy-squad/squad-<id>/specialist-N/report.md`, or inside its `share`/`branch` copy before coordinator collection).
2. **Post a single-line pointer (`<= 500` UTF-8 bytes):** Have the worker post one single-line pointer to the board (no embedded newlines; leaves headroom for `@<24-char-name> ` prefix; address `@coordinator` in Flat mode or `@<squad>-lead` in Layered mode):
   - `@<target> READY <report-path> — <1-line concrete observation>`
   - `@<target> PARTIAL <report-path> — <observation and blocker>`
   - `@<target> NO_REPORT — <reason>`
3. **Record raw posts verbatim in `<bundle-record.json>`:** When populating `handoffs[].message` for `inspectHandoffs` (`node bin/agy-squad.mjs inspect <record.json>`), copy the exact raw board post verbatim (including any leading `@coordinator` or `@<squad>-lead` mention prefix; `mcp/handoffs.mjs` parses leading `@mention` tokens natively while rejecting mismatches against the sender's assigned slot).

> [!NOTE]
> Pointer-Over-Wire on the `/swarm` board is a governance convention, not runtime-enforced by the board tool itself: workers can post arbitrary text, and `agy-squad inspect` detects deviations after the fact rather than blocking them at send time.

## Canonical Auditor Slots and Verdicts

Never conflate content acceptance with integrity auditing:

| Role | Native `/swarm` Member | Strict Verdict Format | Responsibility & Constraints |
| :--- | :--- | :--- | :--- |
| **Working Lead / Coordinator** | `<squad>-lead` (layered) or coordinator (flat) | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Reviews specialist deliverables, inspects cited files and executed tests, and owns final technical acceptance (`lead/report.md`). Never self-certifies execution integrity. |
| **Integrity Auditor** | `audit-<id>` (flat peer) | `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION` | Independent flat peer auditing tool traces (`agy-context transcript list --parent <id> --lineage`, `agy-context transcript query --id <id> --summary`, or `agy-context transcript read --id <id> --last-turns 10` with `[agy-transcript-access: allow]`, or coordinator `export --parent <id> --sanitized --out scratch/...` index), primary evidence, absence of sycophancy or guessing, and SHA-256 `Evidence Digest`. Never treats workspace re-execution alone as sufficient for `CLEAN` (fails closed with `INTEGRITY VIOLATION` if traces are unavailable). Must declare `Target Squad: <id>`. Cannot waive defects or issue content `PASS`. |

- **Strict single-line enforcement (`mcp/verdicts.mjs`):** Reject hedged, inline-wrapped, or contradictory verdicts (`PASS with Advisories`, `CONDITIONAL PASS`, `PASS / FAIL`). Note: `Verdict:` without `Content ` is accepted only as a legacy alias on lead reports; prefer `Content Verdict:`.
- **Canonical flat auditor slots:**
  - Single-squad manifests (flat or layered): `audit-<id>` -> `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md`
  - Multi-squad manifests (flat or layered): `audit-<id>` -> `scratch/agy-squad/squad-integrity_auditor-<id>/specialist-1/report.md`
  - Always keep `audit-*` as flat peers so an auditor is never subordinated inside a working lead's squad tree.

### Coordinator-Extracted Transcript Index (Native `/swarm` Fallback)

On Antigravity native `/swarm`, `Agy-Context-Saver` (`>= 2.0.1`) `PreToolUse` hooks block direct `.system_generated/` shell reads while enforcing 5-tier transcript access governance (`[agy-transcript-access: allow]` on `audit-<id>` and `<squad>-lead`, `[agy-transcript-access: deny]` on leaf specialists). `audit-<id>` can directly run single-pass batch `agy-context transcript list --parent <id> --lineage`, `agy-context transcript query --id <id> --summary`, or `agy-context transcript read --id <id> --last-turns 10` on recorded `provenanceScaffold` IDs. When child `conversationId` UUIDs are not mapped or direct CLI access is restricted, extract a sanitized coordinator transcript index before waking `audit-<id>`:

1. Generate the index from the coordinator via `agy-context transcript export --parent <coordinator-uuid> --sanitized --out scratch/agy-squad/transcript-index-<id>.md` (or query every child UUID with `agy-context transcript query --id <uuid> --roles assistant --include-tools --limit 50` plus `step` checks on any `status: "ERROR"` step; avoid relying solely on `--roles error`, which matches `"Error"` substrings inside normal source reads).
2. Write or keep only the sanitized summary table (executed commands, read targets, errors encountered; never raw `.system_generated/` JSONL lines) at `scratch/agy-squad/transcript-index-<id>.md` and include that path in `<bundle-record.json>` or the board wakeup to `@audit-<id>`.
3. `audit-<id>` cross-checks the `agy-context transcript` output or sanitized trace index against `verifiedFiles` SHA-256s, `Evidence Digest`, and direct workspace re-execution; if neither `agy-context transcript` nor a coordinator-extracted index covers material worker claims, `audit-<id>` must fail closed and emit `Integrity Verdict: INTEGRITY VIOLATION` (never `CLEAN`).

## Bundle Record Schema and CLI

**What a bundle attests, and what it does not:** `bundle` and `verify` bind SHA-256 digests of the verified workspace files, worker reports, and integrity-audit reports to a `<bundle-record.json>`, and `verify` fails if any input or report changes afterward. The coordinator assembles `assignments`, `handoffs`, and `sender` (`workerName` in `/swarm`) from the board. Treat a verified bundle (`lead/report.sources.json`) as cryptographic **file-integrity evidence** for a coordinator-assembled record, **not** as host attestation of worker authorship or truth of unverified claims.

Run all commands from the shared workspace root via `node bin/agy-squad.mjs` (`requireIntegrityAudit: true` by default; `mcp/handoffs.mjs` hashes inputs and audit reports programmatically rather than asking LLMs to copy-paste 64-hex SHA-256 digests):

```bash
node bin/agy-squad.mjs collect --plan <plan.json> --from <worktree-dir>...   # only when workspaceIsolation != inherit
node bin/agy-squad.mjs verdict scratch/agy-squad/squad-<id>/lead/report.md
node bin/agy-squad.mjs fingerprint <verified-file-1> <verified-file-2>
node bin/agy-squad.mjs bundle-init --plan <plan.json> [--squad <id>] [--handoff <worker=READY ...> ... | --handoffs <file.json>] [--id-map <worker=id>] <verified-file-1> <verified-file-2> --out <bundle-record.json>
node bin/agy-squad.mjs inspect <bundle-record.json>
node bin/agy-squad.mjs digest <bundle-record.json>
node bin/agy-squad.mjs verdict --integrity scratch/agy-squad/squad-integrity_auditor[-<id>]/specialist-1/report.md
node bin/agy-squad.mjs bundle <bundle-record.json>
node bin/agy-squad.mjs verify scratch/agy-squad/squad-<id>/lead/report.sources.json
node bin/agy-squad.mjs prune scratch/agy-squad/squad-<id>/lead/report.sources.json <accepted-sha256> [--keep-reports]
```

### `<bundle-record.json>` Schema & Concrete Wire-Format Example

Start from `agy-squad bundle-init --plan <plan.json> [--squad <id>]` (or `squad_planner`'s `bundleRecordTemplates.<squadId>`), which pre-populates `verifiedFiles`, `assignments`, and resolved `subagent` IDs (while `handoffs` is populated only when `--handoff` or `--handoffs` is supplied before running `inspect` and `digest`):

```json
{
  "squadId": "storage",
  "workspace": "/home/paragon-ux/Antigravity/Agy-Squad",
  "verdict": "PASS",
  "requireIntegrityAudit": true,
  "verifiedFiles": {
    "src/storage.js": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "assignments": [
    {
      "conversationId": "storage-wal-reviewer",
      "report": "scratch/agy-squad/squad-storage/specialist-1/report.md"
    }
  ],
  "handoffs": [
    {
      "sender": "storage-wal-reviewer",
      "message": "@storage-lead READY scratch/agy-squad/squad-storage/specialist-1/report.md — src/storage.js:42 fsync guard verified (npm test exit 0)"
    }
  ]
}
```

- Pass `--allow-unaudited` to `bundle` only when explicitly opting out of `requireIntegrityAudit: true` (persists `auditPolicy: "unaudited-explicit"` inside v2 `lead/report.sources.json`).
- Pass `--replace` or `--predecessor <sha256>` to `bundle` when overwriting an existing `lead/report.sources.json` from a prior run.
- Omit `--keep-reports` on `prune` to unlink verified loose `specialist-<N>/report.md` files (re-verifying inode identity and SHA-256), or pass `--keep-reports` when preserving loose scratch files per Step 0.
