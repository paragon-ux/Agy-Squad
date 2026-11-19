# Live `/swarm` Transcript Verification Report (WSL2 Ubuntu): Agy-Context-Saver v2.0.4 & Agy-Squad v0.1.3

> Focused live Antigravity `/swarm` transcript integration test executed under WSL2 Ubuntu (`2026-11-17` / `2026-11-18 UTC`) against the exact PR #7 and PR #9 heads. Zero product source files were modified in either repository.

---

## 1. Environment & Revision Provenance

| Component | Observed Value |
| --- | --- |
| **Agy-Context-Saver Repo** | `/home/paragon-ux/Antigravity/Agy-Context-Saver` (`feat/v2.0.4-transcript-ergonomics`, clean working tree) |
| **Agy-Context-Saver HEAD / PR #7** | `c724eaaa921aa44b70c0624a95204aac82c283df` (matches `origin/feat/v2.0.4-transcript-ergonomics` and `gh pr view 7` `headRefOid`) |
| **Agy-Context-Saver Install** | Symlink `~/.gemini/config/plugins/agy-context-saver` -> `/home/paragon-ux/Antigravity/Agy-Context-Saver` (`2.0.4`); `agy-context status --json` `isComplete: true`, `mirroredHookStale: false`, hook SHA-256 `f14377cf323baa6945b13a1e3ebd9f8f2c80a304a14b51d84bbc2a64f80fe272` |
| **Agy-Squad Repo** | `/home/paragon-ux/Antigravity/Agy-Squad` (`feat/v0.1.3-remediation`, clean prior to adding this report) |
| **Agy-Squad HEAD / PR #9** | `d5a4d517b8c347ea289f28a70f3544b1475f719b` (matches `origin/feat/v0.1.3-remediation` and `gh pr view 9` `headRefOid`) |
| **Agy-Squad Install** | `~/.gemini/config/plugins/agy-squad` (symlinks `.agents`, `bin`, `docs`, `mcp`, `scripts`, `skills` -> `/home/paragon-ux/Antigravity/Agy-Squad`); `agy-squad status --json` `isComplete: true`, `version: "0.1.3"`, `registered: true`, `globalDuplicate: false` |
| **CLIs & Runtimes** | `agy-context 2.0.4`, `agy-squad 0.1.3`, `rtk 1.1.0` (`/usr/local/bin/rtk`), Node `v22.19.0` (`~/.gemini/antigravity/bin/node`), `agy 1.5.10` (`~/.local/bin/agy`) |
| **Antigravity Host** | `language_server` `2.32.2` (`PID 555`, `hub`), `node ./mcp/index.js` (`PID 595`), `swarm_board` sidecar (`PID 596`) |
| **OS / Kernel** | WSL2 Ubuntu (`Linux DESKTOP-1JHP9MT 6.18.58.1-microsoft-standard-WSL2 x86_64`) |

---

## 2. Cohort Configuration & Conversation IDs

Step 0 Pre-Flight Intake (`ask_question`) locked **Layered** topology, `workspaceIsolation: "inherit"`, retain loose reports (`--keep-reports`), pinned worker/lead/auditor model `gemini-4-hydrogen-high`, and operator launch authorization. Plan compiled via `squad_planner` (MCP) under `scratch/agy-squad/l46-transcript-v204/`.

| Roster Name | Role | Conversation ID | Model Verified (`swarm status`) | Brief Seq / Directive | Report Slot |
| --- | --- | --- | --- | --- | --- |
| `coordinator` | Coordinator (current session) | `c927245c-dcdd-4467-8494-fbe8d8dbc5a0` | `gemini-4-hydrogen-xhigh` | Top-level `USER_INPUT` | N/A |
| `v204-live-transcript-sou` | Specialist 1 (Transcript Source Analyst) | `90f46f8a-b5fb-4d69-86e9-a1b4df722004` | `gemini-4-hydrogen-high` | `#1` / `[agy-transcript-access: deny]` | `scratch/agy-squad/l46-transcript-v204/squad-v204_live/specialist-1/report.md` |
| `v204-live-governance-spi` | Specialist 2 (Governance Spillover Analyst) | `aa5d1e83-207f-4f06-8693-f841c69f6d02` | `gemini-4-hydrogen-high` | `#2` / `[agy-transcript-access: deny]` | `scratch/agy-squad/l46-transcript-v204/squad-v204_live/specialist-2/report.md` |
| `v204-live-lead` | Squad Lead (Transcript Lead) | `2d404057-c716-40a1-b526-91a7dd1f2086` | `gemini-4-hydrogen-high` | `#3` / `[agy-transcript-access: allow]` | `scratch/agy-squad/l46-transcript-v204/squad-v204_live/lead/report.md` |
| `monitor` | Stall Monitor | `a39ab5df-c273-4e6b-b39d-647c5c929cd0` | `gemini-4-hydrogen-xhigh` | `#4` / Coordinator default | N/A |
| `audit-v204-live` | Flat Integrity Auditor | `2bc1f308-804c-4163-b865-5e92a92debc1` | `gemini-4-hydrogen-high` | `#11` / `[agy-transcript-access: allow]` | `scratch/agy-squad/l46-transcript-v204/squad-integrity_auditor/specialist-1/report.md` |

Lineage discovery (`agy-context transcript list --parent c927245c-dcdd-4467-8494-fbe8d8dbc5a0 --lineage` and `--limit 5 --lineage --json`) correctly mapped all 5 `/swarm` child conversations with `sessionKind: "swarm"`, exact `parentConvId`, `rosterName`, `stepCount`, `bytes`, and `brainRoot: "antigravity"`.

---

## 3. Live Transcript Truncation & Dereferencing Verification

Real `/swarm` execution in Specialist 1 (`90f46f8a-b5fb-4d69-86e9-a1b4df722004`) generated 22 genuine `truncated_fields` entries across the first 48 steps without synthetic injection or canaries (`151,723` B in `--mode compact` vs `251,775` B in `--mode full`):

- **Step 41 (`PLANNER_RESPONSE`)**: `truncated_fields: ["thinking", "tool_calls"]` -- compact `thinking` `4,120` chars vs full `7,740` chars; compact `tool_calls` `2,292` chars vs full `20,080` chars.
- **Step 44 (`GENERIC`)**: `truncated_fields: ["content"]` -- compact `4,117` chars vs full `20,472` chars.
- **Step 47 (`PLANNER_RESPONSE`)**: `truncated_fields: ["content"]` -- compact `4,120` chars vs full `5,735` chars (genuine truncated assistant response).

### Observed Dereferencing Results

| Field Type | Marker Strictly Absent in Compact | `--mode compact` Query | Default `mode="auto"` Query | `transcript step` Recovery |
| --- | --- | --- | --- | --- |
| Assistant `content` (Step 47) | `"binary-searches array item retention"` | `matchedCount: 0`, `items: []` | `matchedCount: 1` (Step 47 hydrated to full `content`) | `step 47 ... --field content --line-start 20 --line-end 40` recovered lines 20-24 |
| Assistant `tool_calls` (Step 41) | `"mayHaveTruncatedTail"` | `matchedCount: 0`, `items: []` | `matchedCount: 1` (`step41-auto-query.json`, `28,682` B `--out`); inline `--json` bounded cleanly to `items: []` (`jsonTruncated: true`, `nextCursor: {end: 41}`) | `step 41 ... --field tool_args:Content --line-start 80 --line-end 96` recovered lines 80-96 |
| Assistant `thinking` (Step 41) | `"Markdown mode truncates output by calculating available bytes"` | Absent from compact `thinking` | `matchedCount: 1` (`--include-thinking --roles assistant --json`, bounded `items: []`, `jsonTruncated: true`, `nextCursor: {end: 41}`) | `step 41 ... --field thinking --tail 10` recovered lines 54-63 of 63 |

Observed design nuance (non-defect): passing `--full` alongside `--mode compact` to `transcript read` intentionally upgrades `effectiveMode` to `"full"` (`Agy-Context-Saver/lib/transcript-core.mjs:1828`), whereas `--mode compact` without `--full` stays on `transcript.jsonl`.

---

## 4. Live Host Tool-Output Spillover Verification

Specialist 2 (`aa5d1e83-207f-4f06-8693-f841c69f6d02`) executed one bounded source-index `grep -nE "function |throw new Error|export "` across `Agy-Squad/mcp/{handoffs,planner,verdicts}.mjs` (`Step 5`):

- **Spillover artifact**: `/home/paragon-ux/.gemini/antigravity/brain/aa5d1e83-207f-4f06-8693-f841c69f6d02/.system_generated/steps/5/output.txt` (`32,110` bytes, `241` lines).
- **Transcript representation**: `outline` / `summary` displays `[spill: steps/5]`; Step 5 record retains `<truncated 22216 of 32110 bytes from the middle of the output>`, head marker `isValidRelativePrefix`, and tail marker `verdicts.mjs:292:export {`.
- **Omitted-middle marker**: `allocateWorkerName` (`Agy-Squad/mcp/planner.mjs:69`, line 174 of `steps/5/output.txt`).
- **Query honesty**:
  - `agy-context transcript query "isValidRelativePrefix" aa5d1e83-... --start 5 --end 5 --json` -> `matchedCount: 1` (present in retained preview).
  - `agy-context transcript query "allocateWorkerName" aa5d1e83-... --start 5 --end 5 --json` -> `matchedCount: 0, items: []` (does NOT claim to index omitted spillover content).
- **Authorized bounded recovery**: `rtk read --head-lines 20 .../steps/5/output.txt` recovered the head slice, and bounded `read_file` (`StartLine: 150, EndLine: 220`) recovered `allocateWorkerName` at line 174.

---

## 5. Transcript Output, Pagination & UTF-8 Budget Measurements

All serialized UTF-8 byte counts below were measured on disk (`Buffer.byteLength` / `stat -c%s`) and verified parseable via `JSON.parse()` where JSON was emitted:

| Tier / Contract | Command Exercised | Measured UTF-8 Bytes | Budget / Contract Result |
| --- | --- | --- | --- |
| **Tier A Markdown** (`<= 9,200` B) | `read 90f46f8a-...` (stdout + `--max-chars 9200 --out m-read.md`) | `3,543` B | **PASS** (zero spillover) |
| **Tier A JSON** (`<= 9,200` B) | `read 90f46f8a-... --json` (stdout + `m-read.json`) | `9,045` B | **PASS** (valid JSON, zero spillover) |
| **Tier A Pagination** | `read --offset 0 --limit 10 --json` -> `nextCursor: {offset: 4, limit: 10}` -> `read --offset 4 --limit 10 --json` | Inline (`<= 9,200` B) | **PASS** (cursor advances cleanly to `{offset: 5, limit: 10}`) |
| **Tier A `outline --json`** (`<= 9,200` B) | `outline 90f46f8a-... --json` / `m-outline.json` | `6,676` B | **PASS** (`jsonTruncated: true`, `4/47`, `nextCursor: {start: 4, end: 999999}`) |
| **Tier A `tools --json`** (`<= 9,200` B) | `tools --id 90f46f8a-... --start 0 --end 48 --json` / `m-tools.json` | `8,633` B | **PASS** (`jsonTruncated: true`, `3/14`, `nextCursor: {end: 42}`) |
| **Tier A `query --json`** (`<= 9,200` B) | `query "execution-guard-hook" 90f46f8a-... --json` / `m-query.json` | `3,449` B | **PASS** (`jsonTruncated: true`, `2/4`, `nextCursor: {end: 59}`) |
| **Tier A `grep` / `summary`** | `grep "Content Verdict" 2d404057-... --roles assistant --limit 5`; `summary 90f46f8a-...` | Inline (`<= 9,200` B) | **PASS** (zero spillover) |
| **Single-step default** (`<= 24,000` B) | `step 41 90f46f8a-... --field tool_args:Content` | `~19,976` B (`<= 24,000` B) | **PASS** (within 24 KB step contract; spilled host stdout to `steps/243/output.txt` as expected above ~10 KB) |
| **Single-step `--max-chars` & batch** | `step 41 ... --max-chars 3500 --json`; `step 40,41,47 ... --field content --head 12 --json` | Inline (`<= 3,500` B / `<= 9,200` B) | **PASS** (`jsonTruncated: true`, batch `nextCursor: {step: "41,47"}`) |
| **Tier B Deep Markdown** (`<= 524,288` B) | `read 90f46f8a-... --offset 0 --limit 63 --full --out`; `read c927245c-... --offset 0 --limit 200 --full --out` | `252,195` B / `523,806` B | **PASS** (`<= 512 KiB`) |
| **Tier B Deep JSON** (`<= 524,288` B) | `read c927245c-... --offset 0 --limit 200 --full --out coord-tierb-full.json --json` | `523,864` B | **PASS** (`<= 512 KiB`, valid JSON, `jsonTruncated: true`, `130/144`, `nextCursor: {offset: 130, limit: 200}`) |
| **Insufficient Budget Handling** | `read ... --max-chars 50 --out preserve-sentinel.json --json`; `read ... --max-chars 20` | Exit `1` | **PASS** (`preserve-sentinel.json` untouched at `14` B `{"keep":true}`) |
| **Contract-specific commands** | `health --json`, `list --lineage --json`, `export 90f46f8a-... --sanitized --json`, `export --parent c927245c-... --sanitized --out` | `20,895` B (stdout `export`) / `29,812` B (`transcript-index.md`) | **PASS** (`l6Safe: true`, no `thinking` or raw JSONL lines) |

Usage note observed: `tools` aliases `query` (`[<pattern>] [<id>]`), so passing a UUID without `--id` parses it as `<pattern>` and triggers `"current"` active-swarm disambiguation (`Ambiguous active conversation: 5 transcripts ...`, exit `1`). Passing `--id <uuid>` (per `Agy-Context-Saver/docs/tools.md:118`) resolves cleanly.

---

## 6. Transcript Governance & Access Policy Enforcement

| Role / Tier Tested | Probe Executed | Result | Policy Mechanism Verified |
| --- | --- | --- | --- |
| Coordinator (`Tier 1 owner`) | `health` / `read` / `query` / `step` / `list` / `export` both when `OPEN` and while `allowlist` active | **ALLOWED** (`exit 0`) | `evaluateCallerTranscriptAccess` Tier 1 (`source: "owner"`) |
| Specialist 1 (`Tier 4 launch-directive`) | `agy-context transcript list --limit 1` (Cycle 1, step 8) | **DENIED** | `PreToolUse` `[mode=deny, source=launch-directive]` |
| Specialist 2 (`Tier 4 launch-directive`) | `agy-context transcript health` (step 6) | **DENIED** | `PreToolUse` `[mode=deny, source=launch-directive]` |
| Lead & Integrity Auditor (`Tier 4 launch-directive`) | `list --parent ... --lineage`, `query --summary`, `read --last-turns 10`, `step` | **ALLOWED** (`exit 0`) | `[agy-transcript-access: allow]` |
| Lead under mid-session `--deny` (`Tier 2`) | `agy-context transcript list --limit 1` under `--mode allowlist --deny @v204-live-lead*` (`#14`) | **DENIED** | `PreToolUse` `[mode=deny, source=cli-deny-list]` |
| Specialist 2 under mid-session `--allow` (`Tier 3`) | `agy-context transcript health aa5d1e83-... --json` under `--allow @v204-live-governance-spi*` (`#15`) | **ALLOWED** (`exit 0`) | `PreToolUse` `[mode=open, source=cli-allow-list]` + single-use grant claimed/consumed despite active launch restriction |
| Auditor under mid-session `allowlist` (`Tier 4 override`) | `agy-context transcript list --limit 1` after policy `updatedAt > birthTimeMs` (`#17`) | **DENIED** | `PreToolUse` `[mode=allowlist, source=cli-policy-override]` |
| Policy TTL & Reset | `access --self-only --ttl 60 --json` -> `access --reset --json` -> `status --json` | **PASS** | `expiresInSec: 60`, then restored to `OPEN` (`active: false`) |
| Inline `node -e` on `transcript-core.mjs` | `node -e 'import("./Agy-Context-Saver/lib/transcript-core.mjs")...'` (Specialist 1 step 37, Lead step 41) | **DENIED** | Intentional L6 security guard (`execution-guard-hook.mjs:229-236`) preventing in-process bypass |

Minor non-blocking diagnostic UX observation: when `execution-guard-hook.mjs:229-236` blocks an unrestricted session (`v204-live-lead` step 41) from running `node -e` importing `transcript-core.mjs`, `buildInternalStateShellDenial` cites `.system_generated` rather than explicitly naming `transcript-core.mjs` / interpreter-import protection. No functional defect.

---

## 7. Governed `/swarm` Execution, Integrity Audit & Runtime Closure

1. **Multi-Cycle Anti-Sycophancy Flow**: In Cycle 1, Specialist 1 honestly emitted `PARTIAL` (`#6`) because the brief's `node -e` import of `transcript-core.mjs` was blocked by `execution-guard-hook.mjs:229-236`, and `v204-live-lead` independently confirmed the block and emitted `Content Verdict: BLOCKED` (`#7`). After coordinator scope adjustment `#8` (replacing inline `node -e` with `execution-guard-hook.mjs:220-265` inspection plus `agy-context status --json` and `agy-context --help`), Specialist 1 emitted `READY` (`#9`) and `v204-live-lead` verified everything and emitted `Content Verdict: PASS` (`#10`).
2. **Stage 2 & Independent Integrity Audit**:
   - `agy-squad verdict`, `fingerprint` (8 verified source files), `bundle-init --digest`, `inspect` (`READY` / `READY`), and `digest` produced canonical `evidenceDigest: fccd657f1d4f4a84b236a458f6b9ff0deea00d82dd2334a6bcc782ed87f4b634`.
   - Flat Integrity Auditor `audit-v204-live` (`2bc1f308-...`) independently verified `list --parent ... --lineage`, `query --summary`, `read --last-turns 10`, `step`, `transcript-index.md`, `provenance.json`, `bundle-record.json`, and `sha256sum` across all 8 verified files and 3 reports, emitting `Target Squad: v204_live`, matching `Evidence Digest`, and `Integrity Verdict: CLEAN` (`#12`).
3. **Stage 3 Bundle Verification & Runtime Closure**:
   - `agy-squad verdict --integrity`, `agy-squad bundle`, and `agy-squad verify scratch/agy-squad/l46-transcript-v204/squad-v204_live/lead/report.sources.json --prune --keep-reports` exited `0` (`sha256: 80955e4dc05305adc71a3f7509426b3d630e1896f38df22e02d22302ca4346b8`, `auditPolicy: "required"`, both loose specialist reports retained).
   - Posted `[done]` (`#18`), killed all 5 workers including `monitor`, and confirmed 4/4 runtime closure (`swarm{action: "status"}`: `killed: true` for all 5 workers; `manage_subagents(Action='list')`: `[]`; `manage_task(Action='list')`: none running; `/usr/bin/ps -efww --forest`: baseline host processes only).

---

## 8. Acceptance Criteria Evaluation & Final WSL Verdict

| # | Acceptance Criterion | Classification | Basis |
| --- | --- | --- | --- |
| 1 | Actual Antigravity conversations produce the evidence | **PASS** | Coordinator `c927245c` + 5 genuine `/swarm` child sessions |
| 2 | Transcript discovery and lineage are correct | **PASS** | `list --lineage`, `--parent --lineage`, and `health` matched live sessions |
| 3 | Available truncated fields are recovered correctly | **PASS** | Genuine `content`, `thinking`, and `tool_calls` `truncated_fields` dereferenced from `transcript_full.jsonl` |
| 4 | Tool-output spillover pointers correspond to correct artifacts | **PASS** | `aa5d1e83` Step 5 (`32,110` B) matched `[spill: steps/5]` and `.../steps/5/output.txt` |
| 5 | Transcript searches do not claim to index omitted spillover content | **PASS** | Step 5 middle marker `allocateWorkerName` returned `matchedCount: 0` on `--start 5 --end 5`; recovered via bounded `read_file` |
| 6 | Inline and deep output behavior respects documented contracts | **PASS** | Tier A `<= 9,200` B, Step `<= 24,000` B, Tier B `<= 524,288` B, pagination, error preservation, and `health`/`list`/`export` all verified |
| 7 | Transcript access policies work across worker roles | **BLOCKED (Tier 4 `--reset` / `status` mismatch)** | Tier 1-5 live enforcement passed while active, but `access --reset` leaves `[agy-transcript-access: deny]` specialists blocked (`[mode=deny, source=launch-directive]`) while `status` reports `OPEN` |
| 8 | Governed `/swarm` workflow completes successfully | **PASS** | Layered cohorts, Cycle 1 `BLOCKED` -> Cycle 2 `PASS`, and 4/4 runtime closure verified |
| 9 | Independent audit and evidence bundle verify | **PASS** | `Integrity Verdict: CLEAN`, matching `Evidence Digest`, `report.sources.json` verified after closure |
| 10 | No material release-blocking regression is observed | **BLOCKED** | Confirmed gate blocker on Tier 4 `[agy-transcript-access: deny]` immutability vs `access --reset` / `status` `OPEN` reporting (Section 10) |

### Final WSL Live Transcript Verdict (Wave 1 + Wave 2)

- **WSL Live `/swarm` Transcript Integration Gate (`Agy-Context-Saver` `c724eaaa921aa44b70c0624a95204aac82c283df` + `Agy-Squad` `d5a4d517b8c347ea289f28a70f3544b1475f719b`)**: **BLOCKED** (core transcript parsing, truncation dereferencing, host spillover honesty, inline/deep UTF-8 budgets, lineage, and Tier 1-5 active policy mechanics passed; blocked on the Tier 4 `launch-directive` vs `access --reset` / `status` `OPEN` contract & UX mismatch in Section 10).
- **Release Sequencing Note**: Physical macOS and native Windows (`node.exe`) `L46` live `/swarm` gates remain **UNVERIFIED** here and stay separate subsequent gates, and WSL gate closure remains held pending the Section 10 decision/fix. No git push, PR merge, version bump, tag, or publish was performed.

---

## 9. Wave 2 Worker-Side Verification (`w2_live`)

Following review of Wave 1, a dedicated Wave 2 layered `/swarm` cohort (`boardSince: 18`, `workspaceIsolation: "inherit"`, `--keep-reports`, coordinator default `gemini-4-hydrogen-xhigh`, `reportRoot: scratch/agy-squad/l46-transcript-v204-wave2/`) closed all worker-side execution gaps **inside live `/swarm` subagents** without modifying any CLI or product source code.

### 9.1 Wave 2 Cohort & Provenance

| Roster Name | Role | Conversation ID | Brief Seq / Directive | Verified Slot |
| --- | --- | --- | --- | --- |
| `w2-live-allow-matrix-ana` | Specialist 1 (`Allow Matrix Analyst`) | `72cc4786-2f5f-4af4-a7a2-0ec8d17c57e9` | `#19` / `[agy-transcript-access: deny]` | `scratch/agy-squad/l46-transcript-v204-wave2/squad-w2_live/specialist-1/report.md` |
| `w2-live-selfonly-reset-a` | Specialist 2 (`SelfOnly Reset Analyst`) | `5096a4bf-2c0d-49f8-97c8-a07f168048fb` | `#20` / *(none -- intentional Tier 5 setup)* | `scratch/agy-squad/l46-transcript-v204-wave2/squad-w2_live/specialist-2/report.md` |
| `w2-live-lead` | Squad Lead (`Post-Reset Lead`) | `8f06fd5d-c0e1-49c2-bf7b-faebe08130af` | `#21` / `[agy-transcript-access: allow]` | `scratch/agy-squad/l46-transcript-v204-wave2/squad-w2_live/lead/report.md` |
| `monitor-2` | Stall Monitor | `d8789b01-ac52-4fad-9c80-9578327f5d83` | `#22` | N/A |
| `audit-w2-live` | Flat Integrity Auditor | `7c13fbea-b801-4acf-af1c-df789c698ecb` | `#35` / `[agy-transcript-access: allow]` | `scratch/agy-squad/l46-transcript-v204-wave2/squad-integrity_auditor/specialist-1/report.md` |

### 9.2 Worker-Side Policy Stages, CLI Matrix & Post-Reset Recovery

1. **Stage A (Baseline `OPEN`, `#19`..`#25`):**
   - `w2-live-allow-matrix-ana` (`[agy-transcript-access: deny]`) ran `agy-context transcript list --limit 1` -> **DENIED** (`[mode=deny, source=launch-directive]`, `#25`).
   - `w2-live-lead` (`[agy-transcript-access: allow]`) ran `agy-context transcript list --limit 1` -> **ALLOWED** (`exit 0`, `#24`).
   - `w2-live-selfonly-reset-a` (no Tier 4 directive) registered `STAGE_A_READY` (`#23`).
2. **Stage B (Tier 3 `--allow` + Tier 2 `--deny`, `#26`..`#28`):** Coordinator set `access --mode allowlist --allow @w2-live-allow-matrix-ana* --deny @w2-live-lead* --ttl 300 --json`:
   - `w2-live-lead` ran `agy-context transcript list --limit 1` -> **DENIED** (`[mode=deny, source=cli-deny-list]`, `#27`).
   - `w2-live-allow-matrix-ana` executed the full CLI matrix inside its own session under Tier 3 `--allow` (`exit 0` across all checks):
     - `list --limit 3 --lineage --json` (`total: 682`, `includeLineage: true`), `health 72cc4786-... --json` (`HEALTHY`, `22` steps), and `read 90f46f8a-... --offset 0 --limit 10 --json` -> `nextCursor: {offset: 4, limit: 10}` -> `--offset 4 --limit 10 --json` (`4` steps -> `1` step, `clamped: true`, `jsonTruncated: true`).
     - `query "binary-searches array item retention" 90f46f8a-... --mode compact --json` (`matchedCount: 0`) vs default `mode="auto"` (`matchedCount: 1`, `step_index: 47`); `query "mayHaveTruncatedTail" 90f46f8a-... --start 40 --end 43 --include-tools --full-args --out spec1-step41-query.json --json` (`28,682` B); spillover omission check `query "allocateWorkerName" aa5d1e83-... --start 5 --end 5 --json` (`matchedCount: 0`).
     - `step 47 90f46f8a-... --field content --line-start 20 --line-end 40` (`[Lines 20-24 of 24]`) and Tier B `read c927245c-... --offset 0 --limit 200 --full --out spec1-tierb.json --json` (`523,864` B `<= 524,288` B, `130` steps, `nextCursor: {offset: 130, limit: 200}`).
     - Multi-byte UTF-8 CLI clamping (`utf8SliceToBytes` / `utf8ByteLength`): `spec1-utf8-note.txt` (`853` B containing `UTF8_MARKER_🚀🔥€—_END`) clamped via `read 72cc4786-... --last-turns 1 --max-chars 520 --out spec1-utf8-clamp.md` (`byteLength: 520`, `charLength: 488`, `hasFFFD: false`, `hasEmoji: true`) and `step 48 72cc4786-... --field all --max-chars 380` (zero `U+FFFD`).
3. **Stage C (Tier 5 `--self-only` inside `/swarm` child, `#29`..`#30`):** Coordinator ran `access --reset --json` then `access --self-only --ttl 300 --json` (`allow: []`, `deny: []`):
   - `w2-live-selfonly-reset-a` verified inside its session: `list --limit 1` **DENIED** (`[mode=self-only, source=cli-policy]`); cross-session `read 90f46f8a-...` **DENIED** (`[mode=self-only, source=cli-policy]`); own `--id` `read 5096a4bf-... --last-turns 1` **ALLOWED** (`exit 0`); omitted `--id` `read --last-turns 1` **ALLOWED** (`PreToolUse` auto-injected `--id 5096a4bf-...`); own `health` and `query "STAGE_A_READY"` **ALLOWED** (`exit 0`); `--out scratch/.../spec2-utf8-clamp.md` **ALLOWED** (`520` B, `0` `U+FFFD`); and `step 14 5096a4bf-... --field tool_calls --max-chars 1365` sliced cleanly before 4-byte `🚀` (`"Content": "SELFONLY_UTF8_` + clamp notice, zero `U+FFFD`).
   - Preserved nuance: `spec2-utf8-clamp.md` clamped inside ASCII Step 21 (`PLANNER_RESPONSE` anchor fallback when `userTurns: 0`), which Specialist 2 flagged transparently (`hasUtf8Marker: false`) and supplemented with Step 14 (`--max-chars 1365`).
4. **Stage D (Post-`access --reset` worker behavior, `#31`..`#34`):** Coordinator ran `access --reset --json` (`mode: "open"`):
   - **Specialist 1 (`w2-live-allow-matrix-ana`, standard `Agy-Squad` specialist with `[agy-transcript-access: deny]`):** Single `list --limit 1` (Step 74) after `--reset` stayed **DENIED** (`[mode=deny, source=launch-directive]`). Because `--reset` only removes `store.policies[ownerId]` (Tiers 2/3/5), removing the Tier 3 `--allow` entry drops standard `Agy-Squad` specialists back to immutable Tier 4 `deny` while `agy-context status` reports `OPEN` (see Section 10 blocker).
   - **Specialist 2 (`w2-live-selfonly-reset-a`, non-directive probe without `[agy-transcript-access: ...]` at Step 1):** Recovered `list --limit 3 --lineage --json` (`total: 682`), cross-session `read 90f46f8a-...` Tier A pagination (`4` -> `1` steps), `query` `compact` (`0`) vs `auto` (`1`, `step_index: 47`), `step 41 --field thinking --tail 10` (`[Lines 54-63 of 63]`), and Tier B `spec2-tierb.json` (`523,864` B, `523,531` chars, `hasFFFD: false`). Note: this recovery applies only to sessions spawned without a `[agy-transcript-access: deny]` first-line directive, unlike standard `Agy-Squad` leaf specialists.
   - **Lead (`w2-live-lead`, launched with `[agy-transcript-access: allow]`):** Recovered from Stage B Tier 2 `--deny`, executing `list --parent c927245c-... --lineage --json` (`total: 9`), `query "allocateWorkerName" aa5d1e83-... --start 5 --end 5 --json` (`0`), `read 90f46f8a-...` (`4` steps), and `step 47` (`[Lines 20-24 of 24]`).

### 9.3 Wave 2 Audit, Bundle & Runtime Closure

- **Verdicts & Digests:** `w2-live-lead` issued `Content Verdict: PASS` (`#34`); flat `audit-w2-live` (`7c13fbea-...`) verified live traces (`72cc4786`, `5096a4bf`, `8f06fd5d`), hashes, and `Evidence Digest: 3163b99f3dd600c94773970334d5d0174a2746690c74cba140d5b8a7d69ffbff`, issuing `Integrity Verdict: CLEAN` (`#36`). Note: `transcript-index.md` truncated at `MAX_OUTPUT_CHARS` (`24,000` chars) after `3 (of 9)` sessions (`d8789b01`, `8f06fd5d`, `5096a4bf`), while direct auditor trace inspection covered `72cc4786` completely.
- **Bundle & Closure:** `agy-squad bundle` + `verify --prune --keep-reports` passed on `scratch/agy-squad/l46-transcript-v204-wave2/squad-w2_live/lead/report.sources.json` (`sha256: bd9d1866fa2842a4fd6213ff91c39eac23f86cbbc0a836f83f301dffdfb87475`, `auditPolicy: "required"`). Posted `[done]` (`#37`), killed all Wave 2 workers (`monitor-2` and `audit-w2-live` included), verified `0` active subagents, `0` background tasks, clean `ps`, `OPEN` access policy, and zero edits to product source code.
- **Remaining Static Note:** Direct inline `node -e` imports of `Agy-Context-Saver/lib/transcript-core.mjs` remain intentionally blocked across all sessions by `execution-guard-hook.mjs:229-236`; runtime `utf8ByteLength` / `utf8SliceToBytes` execution was verified end-to-end inside Wave 2 workers via multi-byte/astral UTF-8 CLI Markdown clamping (`--max-chars`) with zero `U+FFFD` replacement characters.

---

## 10. Confirmed Gate Blocker & Remediation Baton Pass for Sol

### Confirmed Blocker: `access --reset` / `status: OPEN` vs Immutable `[agy-transcript-access: deny]` Launch Directives

- **Exact Reproduction (Observed in Wave 2 `w2_live`):**
  1. Spawn a standard `Agy-Squad` leaf specialist (`w2-live-allow-matrix-ana`, `72cc4786-2f5f-4af4-a7a2-0ec8d17c57e9`). `Agy-Squad/mcp/briefs.mjs:205-208` stamps `[agy-transcript-access: deny]` onto Line 1 of its brief (`seq: 19`).
  2. Coordinator grants temporary access via `agy-context transcript access --mode allowlist --allow @w2-live-allow-matrix-ana* --ttl 300 --json` (Tier 3 overrides Tier 4). Worker runs `list`/`health`/`read`/`query`/`step` cleanly (`exit 0`).
  3. Coordinator runs `agy-context transcript access --reset --json`. `agy-context status --json` and `agy-context transcript access --status --json` report `Transcript Access Policy: OPEN (default -- all sessions permitted)` (`active: false, mode: "open"`).
  4. Wake `w2-live-allow-matrix-ana` (`72cc4786-...`) and run `agy-context transcript list --limit 1`. It is **still denied** at Step 74 with `[mode=deny, source=launch-directive]`.
- **Root Cause (Verified Across Both Repos):**
  - `Agy-Squad/mcp/briefs.mjs:205-208` stamps `[agy-transcript-access: deny]` on every leaf specialist's initial assignment (`Step 1`), and `execution-guard-hook.mjs:1964, 1980-2032` (`getCallerLineage()`) parses `Step 0`/`Step 1` of immutable `transcript.jsonl` and caches `session.lineage.launchDirective = "deny"` permanently for that conversation.
  - `Agy-Context-Saver/lib/transcript-core.mjs:717-726` (`manageTranscriptAccessPolicy` with `--on`/`--reset`) only executes `delete store.policies[ownerId]`, clearing Tiers 2 (`--deny`), 3 (`--allow`), and 5 (`policy.mode`).
  - Under the 5-tier precedence in `Agy-Context-Saver/docs/governance.md:94-100` and `execution-guard-hook.mjs:2127-2262`, Tier 4 (`lineage.launchDirective === "deny"` at `:2171-2183`) sits above Tier 5 (`OPEN` / `policy.mode`). Thus clearing the Tier 3 `--allow` entry immediately drops the specialist back to Tier 4 `deny`, with **no CLI reset or override path** to lift Tier 4 `deny` to `open` without maintaining an active `--allow` policy, while `formatTranscriptAccessStatus()` (`transcript-core.mjs:610-655`) reports `OPEN` unconditionally.
- **Required Decision & Remediation Options for Sol:**
  1. **Option A (Keep Tier 4 immutable per `docs/governance.md:94-100`, fix status reporting & override UX):** Update `formatTranscriptAccessStatus` / `agy-context status` (`transcript-core.mjs:610-655`) to detect and disclose active child sessions holding Tier 4 `[agy-transcript-access: deny|self-only]` launch directives rather than reporting `OPEN (default -- all sessions permitted)` unconditionally, and clarify `docs/governance.md` / `docs/tools.md` (and `context-governance`) that `--on`/`--reset` resets CLI policy only (use `--mode open --allow @...` or `--allow *` if explicitly lifting launch-locked children).
  2. **Option B (Allow coordinator reset/override to lift Tier 4 `deny`):** Record an explicit parent-scoped `overrideLaunchDirectives` / `forceOpen` state (or `access --reset --include-launch-directives` / `--on` timestamp check against `lineage.birthTimeMs`, symmetric to `parentOverrodeMidSession` at `execution-guard-hook.mjs:2185-2201`) when the parent explicitly unlocks its active cohort, and update `docs/governance.md:94-100` + `tests/test-transcript.mjs` to match.
- **Holding Gate:** WSL integration gate stays **BLOCKED** (not closed) until Sol resolves this Tier 4 `--reset` / `status: OPEN` behavior and targeted regression + live re-verification pass.
