# L46 Live Integration Verification Report (WSL / Antigravity)

> Live end-to-end WSL verification of **Agy-Context-Saver v2.0.4** and **Agy-Squad v0.1.3** executed in an active Antigravity session under WSL2 Ubuntu (`2026-11-17`). No code edits, installs, or environment migrations were performed.

---

## A. Provenance

| Component / Identifier | Observed Value |
| --- | --- |
| **Agy-Context-Saver Repo** | `/home/paragon-ux/Antigravity/Agy-Context-Saver` (`feat/v2.0.4-transcript-ergonomics`, clean) |
| **Agy-Context-Saver HEAD** | `a7571a19a74c427400985a3a3f0b5b7c0fa092b9` (version `2.0.4`; matches `origin/feat/v2.0.4-transcript-ergonomics`) |
| **Agy-Squad Repo** | `/home/paragon-ux/Antigravity/Agy-Squad` (`feat/v0.1.3-remediation`, clean prior to this report) |
| **Agy-Squad HEAD** | `c1875f2197cdc95fe3bec35f20ef7abfa339e9d4` (version `0.1.3`; matches `origin/feat/v0.1.3-remediation`) |
| **Revision Discrepancy Note** | Local clones had not pulled PR heads `c724eaaa921aa44b70c0624a95204aac82c283df` (`c724eaa`, PR #7) and `052713ec42f2c439e161ee08c1d8d1364d176cf5` (`052713e`, PR #9). This run exercised the outdated local checkouts `a7571a1` and `c1875f2` and therefore does **not** close the release gate for `c724eaa` / `052713e`. |
| **Antigravity Host / CLI** | Language server `hub-2.32.2` (`~/.antigravity-server/bin/2.32.2/language_server`, `ANTIGRAVITY_VSCODE_HOST=1`); WSL CLI `~/.local/bin/agy` `1.5.10` |
| **Node.js / RTK** | Node `v22.19.0` (`~/.gemini/antigravity/bin/node`; `/usr/local/bin/node` is `v24.22.2`); `rtk 1.1.0` (`/usr/local/bin/rtk`) |
| **OS / WSL Environment** | Ubuntu `26.04 LTS` on WSL2 (`Linux DESKTOP-1JHP9MT 6.18.58.1-microsoft-standard-WSL2 x86_64`) |
| **Coordinator Session** | `d0b422a7-480b-4b8f-983a-f811dc58d724` (Gemini 4 Hydrogen XHigh) |
| **Trial Cohort (`l46_live`)** | Flat `/swarm`, `workspaceIsolation: "inherit"`, worker/auditor model `gemini-4-hydrogen-high`, `--keep-reports` |
| **Worker: `l46-live-quota-ledger-au`** | `0f3d3075-0949-4d74-92b0-e785a7173131` -> `scratch/agy-squad/squad-l46_live/specialist-1/report.md` (brief `#1`, receipt `#4`) |
| **Worker: `l46-live-manifest-guard`** | `c94d9938-54b1-49c8-90b7-6489edb1ad2c` -> `scratch/agy-squad/squad-l46_live/specialist-2/report.md` (brief `#2`, receipt `#5`) |
| **Monitor: `monitor`** | `59fd4525-8bd6-4012-8201-f4650d273652` (`gemini-4-hydrogen-xhigh`, brief `#3`) |
| **Integrity Auditor: `audit-l46-live`** | `584e4cc6-2227-4c14-a6ee-b966004574b4` -> `scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md` (brief `#6`, receipt `#7`) |

---

## B. Agy-Context-Saver Results (v2.0.4)

### 1. Transcript Operations (Real Session `d0b422a7-480b-4b8f-983a-f811dc58d724`)
- `agy-context status --json`: Reported `isInstalled: true`, `isComplete: true`, `version: "2.0.4"`, `rtk 1.1.0`, and `Transcript Access Policy: OPEN` (exit `0`).
- `transcript list --limit 5 --lineage` & `--parent d0b422a7-... --lineage`: Listed real top-level, subagent, and live `/swarm` child sessions with `kind: swarm`, `parent`, and exact `@roster` tags (`@l46-live-quota-ledger-au`, `@l46-live-manifest-guard`, `@monitor`, `@audit-l46-live`).
- `transcript health` (text and `--json`): Accurately tracked turn counts, tool calls, `pollingViolations: 0`, `corruptLines: 0`, and `rtk 1.1.0` across the growing session (`54`/`55` steps early, `235` steps at closure).
- `transcript read`, `query`, `outline`, `summary`, `tools`: Exercised with real step indices, `--offset`/`--limit` pagination (`next: --offset 28 --limit 20` -> `next: --offset 42 --limit 20`), `--roles assistant --mode full --full-args`, and `[spill: steps/60]` surfacing.
- `transcript step`: Exercised `1-5 --field content --head 10`, `48 --line-start 5 --line-end 15`, `51 --field tool_args:CommandLine`, `51 --field thinking --tail 10`, and `60 --field content --head 12` (successfully dereferencing truncated spillover Step 60 from `transcript_full.jsonl`).

### 2. Output Budgets & Ergonomics
- **Markdown inline defaults (`<= 9,200` B):** `read`, `outline`, `summary`, `query`, `tools`, and `step` all stayed within the `~9.2 KB` inline budget with zero Antigravity host spillover, including on a synthetic `785,851`-byte multi-byte UTF-8 fixture (`synth_utf8.jsonl`). Explicit `--max-chars 1500` on `read` clamped cleanly (`1.5 KB inline ceiling`).
- **`--full` and `--out` deep tier (`<= 512 KB` UTF-8):** Verified `read --full --out` (`391,691` B `.md`; `446,815` B `.json`), `read --full --max-chars 8000 --out --json` (`5,918` B `<= 8,000` B, `jsonTruncated: true`, `jsonItemsIncluded: 2`, `jsonItemsTotal: 5`), and synthetic `synth_utf8.jsonl` `read --offset 0 --limit 120 --full --out` (`519,032` B `.md` `<= 524,288` B; `524,198` B `.json` `<= 524,288` B, valid JSON, `jsonTruncated: true`, `jsonItemsIncluded: 79`, `jsonItemsTotal: 80`).
- **Stdout `--json` without `--out` (Defect Found):** `bin/agy-context.mjs` (`read` L585-587, `outline`/`summary` L550-552, `query`/`tools` L678-680, `step` L753-755) calls `console.log(JSON.stringify(payload, null, 2))` directly without `serializeBoundedJsonPayload()`. In live testing, stdout `--json` repeatedly exceeded `9,200` B and triggered Antigravity tool-output spillovers: `read --json` (`25,741` B, `steps/60`), `read --offset 29 --limit 20 --json` (`26,658` B, `steps/70`), `query --json` (`16,484` B, `steps/107`), and `step 60 --json` (`22,691` B with `"clamped": false`, `steps/108`). `read --offset 0 --limit 10 --max-chars 1200 --json` also emitted uncompacted Step 0 JSON (~6+ KB) because `maxOutputChars` only governs `res.text`.

### 3. Live Antigravity `PreToolUse` Hook Behavior
- **Bounded file reads:** Permitted `1-150`-line slices, explicit `StartLine=1, EndLine=<TotalLines>` reads `<= 800` lines / `<= 45 KiB`, and Safe Harbor reads (`.gemini/config/*`, `SKILL.md`, bounded `steps/162/output.txt`).
- **Denied reads:** Blocked unbounded `read_file` without `StartLine`/`EndLine` (`mcp_config.json`), blocked `151 > 150`-line partial slice (`execution-guard-hook.mjs:4825-4975`), blocked direct shell access inside `.system_generated/` (`wc -c .../steps/60/output.txt`), and blocked chained `agy-context transcript ...` invocations (`&&`/`;`).
- **RTK delegation:** Host `PreToolUse` rewrote `run_command` calls (`A pre-tool hook changed the arguments of this tool call before it ran. Changed: CommandLine.`) on `ls` and `git`; explicit `rtk ls`, `rtk grep`, and `rtk read --head-lines 20` on spillover `steps/60/output.txt` succeeded cleanly.

### 4. Access Governance & Sanitized Export
- `agy-context transcript access --self-only --json` updated policy (`ownerId: d0b422a7-...`, `ttlMs: 3600000`), surfaced in `agy-context status` (`Transcript Access Policy: SELF-ONLY`), and restored cleanly via `--reset`.
- Live `/swarm` launch-directive enforcement verified on both specialists (`[mode=deny, source=launch-directive]`) and on `audit-l46-live` (`[agy-transcript-access: allow]`).
- `export --sanitized` produced L6-safe summaries for the coordinator (`5,352` B `.md`, `10,482` B `.json`, `l6Safe: true`) and via `--parent d0b422a7-...` across all 4 swarm children (`scratch/agy-squad/l46-live-transcript-index.md`).

---

## C. Agy-Squad Results (v0.1.3)

### 1. Live Status Check Defect (`agy-squad status`)
- Running `node /home/paragon-ux/Antigravity/Agy-Squad/bin/agy-squad.mjs status --json` inside the live Antigravity session exited `1` with `isComplete: false`, `details.mcp.registered: false`, `details.mcp.globalDuplicate: true`, and `details.mcp.staleSchemaCount: 1`.
- Root cause: When Antigravity `hub-2.32.2` loads `agy-squad`'s plugin `mcp_config.json`, it materializes lazy schemas at `/home/paragon-ux/.gemini/antigravity/mcp/agy-squad_agy-squad/` (`dispatch_squad.json`, `squad_planner.json`). `Agy-Squad/scripts/install-register.mjs:514-525` treats any directory in `~/.gemini/antigravity/mcp/` matching `agy-squad_*` as a stale global duplicate even when `~/.gemini/config/mcp_config.json` is empty (`{"mcpServers": {}}`). (Companion checks for `agy-context 2.0.4` and `rtk 1.1.0` both reported `AVAILABLE`.)

### 2. Planner, Worker Execution & Receipts
- **Step 0 & Planning:** `ask_question` intake locked `Flat`, `inherit`, `--keep-reports`, `gemini-4-hydrogen-high`, and authorized launch. `squad_planner` (MCP) compiled `plannerVersion: "2.0.0"`, `scopeOverlaps: []`, 24-char truncated worker name `l46-live-quota-ledger-au`, `knownModels` validation, `boardSince: 0` scoping, and `[agy-transcript-access: deny|allow]` directives.
- **Native `/swarm` Execution:** Spawned `l46-live-quota-ledger-au`, `l46-live-manifest-guard`, and `monitor` (`swarm_narrator` correctly omitted because absent from session `<skills>`). `swarm{action: "status"}` confirmed `gemini-4-hydrogen-high` on working specialists and `gemini-4-hydrogen-xhigh` on `monitor` and coordinator.
- **Specialist Evidence & Receipts:** Both specialists inspected their disjoint fixture files (`quota-ledger.mjs`, `manifest-guard.mjs`), ran real `node -e` / `node:assert/strict` checks reproducing all planted defects, hit `PreToolUse` transcript-access denials on their single probes, wrote their reports (`d0d02669...` and `539d9367...`), and emitted single-line `<= 500` UTF-8 byte `READY` receipts (`#4`, `#5`).

### 3. Content Verdict, Independent Integrity Audit & Bundle Verification
- **Coordinator Patrol & Content Gate:** Coordinator independently reproduced fixture results via `node -e`, checked worker lineage and `outline` traces, wrote `scratch/agy-squad/squad-l46_live/lead/report.md` (`Content Verdict: PASS`, SHA-256 `8f278ca9f072189a0b9c0ff01b96d99c581c066bc4e36b8500620888bf8288c3`), and passed `agy-squad verdict` (`{"verdict": "PASS"}`).
- **Stage 2 CLI Pipeline:** `agy-squad fingerprint`, `bundle-init --digest` (`l46-live-bundle-record.json`), `inspect` (both `READY`), and `digest` produced canonical `evidenceDigest: dd08b1ff7b5725e3f8d1c60cc421c2c8c3c4e861f4a05b93c73350c3e7e3b83b`.
- **Independent Flat Integrity Auditor (`audit-l46-live`):** Spawned post-content-gate with `[agy-transcript-access: allow]`; directly executed `agy-context transcript list --parent ... --lineage`, `query --summary`, `read --last-turns 10`, `agy-squad inspect`, `agy-squad digest`, and `sha256sum` on fixtures and reports. Emitted `Target Squad: l46_live`, matching `Evidence Digest`, and `Integrity Verdict: CLEAN` (report SHA-256 `54985d87...`, receipt `#7`).
- **Bundle & Verify:** `agy-squad verdict --integrity`, `agy-squad bundle`, and `agy-squad verify ... --prune --keep-reports` produced and verified `scratch/agy-squad/squad-l46_live/lead/report.sources.json` (SHA-256 `3c55ba75556843eae1738a1a5e30dfb8ee207bf387417500dd3fa1ca4eb3a62a`, `auditPolicy: "required"`), retaining both loose specialist reports and verified fixture files.

### 4. Runtime Closure (Section 5 Gate)
- Posted `[done]` (`#8`) and killed all 4 workers (`l46-live-quota-ledger-au`, `l46-live-manifest-guard`, `audit-l46-live`, `monitor`).
- Verified all 4 closure checks: `swarm{action: "status"}` showed `state: "killed", killed: true` for all 4 workers; `manage_subagents(Action='list')` returned `0 active subagent(s): []`; `manage_task(Action='list')` returned `No background tasks are currently running.`; `ps` confirmed zero lingering child processes; `agy-context transcript access status --json` confirmed `open`; `agy-squad verify` re-passed on disk.

---

## D. Cross-Repository Findings

### Confirmed Integration Successes
1. **End-to-end governed cohort lifecycle:** `squad_planner` (MCP) -> native `/swarm` (`gemini-4-hydrogen-high` pinning) -> Pointer-Over-Wire (`#4`, `#5`, `#7`) -> `bundle-init --digest` -> independent flat `audit-l46-live` -> `bundle`/`verify --prune --keep-reports` -> 4-check runtime closure executed smoothly in one real WSL session.
2. **Automatic `/swarm` lineage & directive enforcement:** `Agy-Context-Saver` bound all 4 native `/swarm` children (`0f3d3075...`, `c94d9938...`, `59fd4525...`, `584e4cc6...`) to parent `d0b422a7-...` with `@roster` tags, blocked specialist transcript queries (`[agy-transcript-access: deny]`), and allowed `audit-l46-live` (`[agy-transcript-access: allow]`) to inspect worker traces directly without needing fallback exports.
3. **Role & digest separation:** `Content Verdict: PASS` and `Integrity Verdict: CLEAN` remained distinct, and `report.sources.json` bound inputs, reports, and audit digests cryptographically.

### Reproducible Defects & Post-Run Revision Comparison
1. **`Agy-Squad` `agy-squad status` false-positive `globalDuplicate` (Confirmed outstanding defect; present in `c1875f2` and, per operator GitHub comparison, in PR head `052713e`):** `scripts/install-register.mjs:514-525` flags Antigravity's live plugin MCP schema cache (`~/.gemini/antigravity/mcp/agy-squad_agy-squad/`) as a duplicate global entry, causing `agy-squad status` to exit `1` (`isComplete: false`) during active Antigravity sessions. Requires targeted remediation before closing the `Agy-Squad` release gate. (Note: `Agy-Context-Saver/scripts/install-register.mjs:160-179` shares the same prefix check, dormant in v2.0.x because it retired its MCP server.)
2. **`Agy-Context-Saver` inline stdout `--json` bypass on outdated `a7571a1` (Requires re-verification on `c724eaa`, not a second fix):** On the tested `a7571a1` checkout, `bin/agy-context.mjs` omitted `serializeBoundedJsonPayload()` on stdout `--json` (`16.5 KB`-`26.7 KB` across `steps/60`, `steps/70`, `steps/107`, `steps/108`) and ignored `--max-chars 1200` on stdout `read --json`. Per operator GitHub comparison, PR head `c724eaa` already routes transcript JSON output through bounded serialization; this check must be re-verified directly against `c724eaa`.
3. **Host/Environmental notes:** Windows `agy.exe --version` invoked from WSL interop (`task-50`) hung/did not exit within 10s and was cancelled via `manage_task(Action='kill')`. Also note `Agy-Squad`'s `diagnose.mjs` auto-selects the newest `.md` in `docs/reviews/` when `--ledger` is omitted; run `diagnose.mjs --ledger docs/reviews/v0.1.2-self-diagnosis-review.md` if targeting the release review ledger.
4. **Release-blocking assessment:** While this trial demonstrated that native `/swarm`, transcript lineage, access controls, independent integrity auditing, and SHA-256 bundling operate cleanly together on `a7571a1` / `c1875f2`, it does **not** establish a clean release gate for the newer PR heads (`c724eaa` / `052713e`).

---

## E. Final WSL Gate Verdict

> Scope note: Classifications below reflect direct execution on outdated local checkouts `a7571a1` (`Agy-Context-Saver`) and `c1875f2` (`Agy-Squad`). Current PR heads `c724eaa` and `052713e` remain **UNVERIFIED** in live WSL execution until pulled/remediated and re-tested.

| Area | Capability Tested (on `a7571a1` / `c1875f2`) | Verdict | Evidence Summary |
| --- | --- | --- | --- |
| **Agy-Context-Saver v2.0.4** | Transcript CLI (`list`, `health`, `read`, `query`, `outline`, `tools`, `step`, pagination) | **PASS** (`a7571a1`) | All operations verified on real session `d0b422a7-...` and `/swarm` children; re-verify on `c724eaa` |
| **Agy-Context-Saver v2.0.4** | Inline Markdown (`<= 9.2 KB`) & `--out` / `--out --json` (`<= 512 KB` / `--max-chars` UTF-8) | **PASS** (`a7571a1`) | `0` Markdown spillovers; `synth_full_all.md` `519,032` B, `.json` `524,198` B (`jsonTruncated: true`) |
| **Agy-Context-Saver v2.0.4** | Inline stdout `--json` output bounds (`read`/`query`/`step --json` without `--out`) | **FAIL** (`a7571a1`) / **UNVERIFIED** (`c724eaa`) | `a7571a1` emitted `16,484`-`26,658` B (`steps/60,70,107,108`); per operator comparison `c724eaa` already bounds JSON output and requires live re-verification |
| **Agy-Context-Saver v2.0.4** | Sanitized export (`export --sanitized`, single & `--parent`) | **PASS** (`a7571a1`) | L6-safe summary index exported for coordinator (`5,352` B) and 4 swarm children |
| **Agy-Context-Saver v2.0.4** | Live Antigravity `PreToolUse` hook (slices, `.system_generated`, RTK, access directives) | **PASS** (`a7571a1`) | Allowed `1-150` / safe harbor; denied unbounded, `151`-line slice, `.system_generated`, chained CLI, and restricted child probes |
| **Agy-Squad v0.1.3** | Live `agy-squad status` health reporting | **FAIL** | Exited `1` (`globalDuplicate: true`) due to Antigravity's live `mcp/agy-squad_agy-squad/` schema dir; operator confirmed still present on `052713e` |
| **Agy-Squad v0.1.3** | Step 0 intake, `squad_planner` (MCP), and `swarm{action: "status"}` model pinning | **PASS** (`c1875f2`) | Compiled `l46_live` (`scopeOverlaps: []`); pinned `gemini-4-hydrogen-high` verified |
| **Agy-Squad v0.1.3** | Native `/swarm` execution, Pointer-Over-Wire, `Content Verdict`, flat `audit-l46-live`, `bundle`/`verify` | **PASS** (`c1875f2`) | `Content Verdict: PASS`, `Integrity Verdict: CLEAN`, `report.sources.json` (`3c55ba75...`) verified |
| **Agy-Squad v0.1.3** | Section 5 runtime closure (4-check gate) | **PASS** (`c1875f2`) | All 4 workers `killed: true`, `0` subagents, `0` background tasks, `0` child processes |
| **Cross-Repo Integration** | End-to-end governed `/swarm` + `Agy-Context-Saver` lineage, access control & verified evidence | **PASS** (`a7571a1`+`c1875f2`) | Real tool execution, child deny, auditor allow, and cryptographic digest binding succeeded on tested revisions |
| **Newer PR Heads (`c724eaa` / `052713e`)** | Live WSL verification of actual PR #7 and PR #9 heads | **UNVERIFIED** | Local clones were behind PR heads; requires fetch/pull, targeted `Agy-Squad` MCP fix, and focused WSL re-run |
| **L46 Untested Platforms** | Physical macOS & Windows native `node.exe` live `/swarm` | **UNVERIFIED** | Out of scope for this WSL Ubuntu verification; remains open per `L46` |

### Gate Closure Determination

- **Baseline Workflow Validation (`a7571a1` / `c1875f2`):** **PASS** for native `/swarm`, transcript lineage, access governance, independent integrity auditing, and SHA-256 bundling.
- **WSL Live Integration Gate for Outdated Snapshot (`a7571a1` / `c1875f2`):** Superseded by **Section F** below after syncing to `c724eaa` / `052713e` and remediating `scripts/install-register.mjs`.
- **Broader Multi-Platform Release Decision:** Separate from WSL; physical macOS and native Windows (`node.exe`) live interactive `/swarm` gates under `L46` remain **UNVERIFIED** here and must not be inferred from this WSL Ubuntu result.

---

## F. Post-Sync & Targeted Remediation Verification (`c724eaa` + Patched `052713e`)

With operator approval, both repositories were fast-forwarded cleanly to the GitHub PR heads (`Agy-Context-Saver` `c724eaaa921aa44b70c0624a95204aac82c283df` and `Agy-Squad` `052713ec42f2c439e161ee08c1d8d1364d176cf5`), `Agy-Squad` received a targeted fix in `scripts/install-register.mjs` (+regression tests in `tests/test-lifecycle-installer.mjs`), and targeted live WSL verification was re-executed.

### 1. Revision Delta Scope Since Initial WSL Trial
- **`Agy-Context-Saver` (`a7571a1..c724eaa`, 5 files):** `bin/agy-context.mjs`, `docs/tools.md`, `scripts/install-register.mjs`, `tests/test-installed-verification.mjs`, `tests/test-transcript.mjs` (`lib/transcript-core.mjs` and `scripts/execution-guard-hook.mjs` unchanged).
- **`Agy-Squad` (`c1875f2..052713e` + local patch, 2 files):** `scripts/install-register.mjs` and `tests/test-lifecycle-installer.mjs` (`mcp/*`, `bin/agy-squad.mjs`, and `.agents/skills/*` unchanged).

### 2. `Agy-Context-Saver` (`c724eaa`) Re-Verification Results
- **Stdout `--json` bounded serialization (`bin/agy-context.mjs` `emitTranscriptResult` / `serializeTranscriptResult`):**
  - `agy-context transcript read d0b422a7-... --json`: **PASS** (inline compact JSON, zero spillover; `clamped: true`, `jsonTruncated: true`, `jsonItemsIncluded: 3`, `jsonItemsTotal: 10`, `nextCursor: { offset: 252, limit: 20 }`).
  - `agy-context transcript read d0b422a7-... --offset 252 --limit 20 --json`: **PASS** (inline compact JSON, zero spillover; `jsonItemsIncluded: 5`, `nextCursor: { offset: 257, limit: 20 }`).
  - `agy-context transcript read d0b422a7-... --offset 0 --limit 10 --max-chars 1200 --json`: **PASS** (enforced `1200` B limit inline; `steps: []`, `jsonTruncated: true`, `jsonItemsIncluded: 0`, `jsonItemsTotal: 1`).
  - `agy-context transcript query "execution-guard-hook" d0b422a7-... --json`: **PASS** (inline compact JSON, zero spillover; `jsonTruncated: true`, `jsonItemsIncluded: 1`, `jsonItemsTotal: 3`).
  - `agy-context transcript outline d0b422a7-... --start 240 --end 280 --json`: **PASS** (inline compact JSON, zero spillover; `jsonTruncated: true`, `jsonItemsIncluded: 4`, `jsonItemsTotal: 41`, `nextCursor: { start: 244, end: 280 }`).
  - `agy-context transcript tools d0b422a7-... --start 265 --end 280 --json` & `step 51 --field tool_args --json`: **PASS** (inline, zero spillover).
  - `agy-context transcript step 60 d0b422a7-... --max-chars 8000 --json`: **PASS** (enforced `8000` B ceiling inline, `jsonTruncated: true`, zero spillover).
  - `agy-context transcript step 60 d0b422a7-... --json` (no `--max-chars`): `bin/agy-context.mjs:787` intentionally defaults `step` to `MAX_FIELD_CHARS` (`24,000` B per `docs/tools.md:134` `24 KB` safety ceiling rather than `9,200` B), so Step 60 (`22,691` B <= `24,000` B) remained un-clamped at CLI level and spilled in Antigravity (`steps/275`) as designed for single-step `24 KB` inspection.
- **Installed Status & Test Suites (`c724eaa`):**
  - `agy-context status --json`: **PASS** (`isInstalled: true`, `isComplete: true`, `version: "2.0.4"`, `rtk 1.1.0`).
  - `node tests/test-transcript.mjs`, `node tests/test-installed-verification.mjs`, `npm run preflight`, and `npm run verify:package` (`34` files): all **PASS** (`exit 0`).

### 3. `Agy-Squad` (`052713e` + Targeted Fix) Remediation & Verification Results
- **Targeted Fix (`scripts/install-register.mjs`, uncommitted local diff `+31 / -4`):**
  - `detectExistingInstallation()` now distinguishes Antigravity's canonical active plugin schema cache (`${PLUGIN_KEY}_${PLUGIN_KEY}` = `agy-squad_agy-squad`) when `details.mcp.pluginRegistered` is `true` and `PLUGIN_KEY` is absent from global `mcp_config.json`, while continuing to flag legacy `agy-squad`, any non-canonical `agy-squad_*` (e.g., `agy-squad_dup_probe`), or `agy-squad_agy-squad` when unregistered/duplicated globally.
  - `runInstall()` preserves `agy-squad_agy-squad` during clean repeat `agy-squad setup` runs (requiring `existing.details.plugin.exists`, `!existing.details.plugin.pointsElsewhere`, `!existing.details.plugin.versionMismatch`, `existing.details.mcp.pluginRegistered`, and `!hadGlobalMcpEntry`) while sweeping stale/duplicate caches on duplicate, unregistered, redirected, or version-upgrade installs; `runUninstall()` still removes all `agy-squad` / `agy-squad_*` caches.
- **Test & Live Verification:**
  - `tests/test-lifecycle-installer.mjs`: Added explicit assertions covering live `agy-squad_agy-squad` preservation + clean `status`, version-upgrade (`0.1.1`) stale `agy-squad_agy-squad` cache sweeping, and `agy-squad_dup_probe` detection (`+24` lines).
  - Live WSL session (`~/.gemini/antigravity/mcp/agy-squad_agy-squad/` present on disk): `agy-squad setup --check` (**PASS**), `agy-squad setup` (`78.2ms`, preserved `dispatch_squad.json` and `squad_planner.json`, **PASS**), `agy-squad status --json` (`isComplete: true`, `registered: true`, `globalDuplicate: false`, `staleSchemaCount: 0`, `exit 0`, **PASS**), and `agy-squad status` (`Overall Status: HEALTHY & ACTIVE`, **PASS**).
  - Full `Agy-Squad` suite: `npm test` (all 10 scripts including `verify-package.mjs --self-test`), `npm run preflight`, `npm run verify:package` (`54` files), and `agy-squad verify scratch/agy-squad/squad-l46_live/lead/report.sources.json` all **PASS** (`exit 0`).

### 4. Updated WSL Gate Determination
- **Agy-Context-Saver v2.0.4 (`c724eaa`):** **PASS** across transcript CLI, inline Markdown & stdout `--json` bounding (`read`/`query`/`outline`/`tools`/`--max-chars`), `--full`/`--out`, sanitized export, live `PreToolUse` hooks, `status`, `preflight`, and `verify:package`. (See **Section G** for live WSL runtime hook follow-up and unattributed pre-restart host-`SIGKILL` / Windows ConPTY notes.)
- **Agy-Squad v0.1.3 (`052713e` + local `install-register.mjs` patch):** **PASS** on WSL host `status`/`setup --check`/`setup`, full 10-script `npm test`, `preflight`, `verify:package`, and retained SHA-256 bundle verification. (Requires committing/pushing the local `scripts/install-register.mjs` + `tests/test-lifecycle-installer.mjs` patch to `origin/feat/v0.1.3-remediation` / PR #9 to take effect upstream.)
- **WSL Live Integration Gate:** **PASS (with local `Agy-Squad` patch applied)** for tested WSL capabilities on `c724eaa` / patched `052713e`; per Sol's incident handoff (**Section G**), Windows native release testing stays deferred (`UNVERIFIED`), physical macOS remains `UNVERIFIED`, and prior Windows `conhost.exe --headless` orphans + pre-restart Step 380 `signal: killed` remain recorded as unattributed external/pre-restart events that did not recur in clean post-restart WSL execution.

---

## G. Console Process Incident Triage & Step 380 Follow-Up (`c724eaa`)

Following reports of multiple console windows and Step 380's hook error during the earlier session, Sol reviewed Windows host snapshots (`/home/paragon-ux/Antigravity/artifacts/agy-context-saver-console-incident-2026-11-17.md`, `.evidence.json`, and `transcript-issue.md`) and handed off live WSL verification on `Agy-Context-Saver` `c724eaaa921aa44b70c0624a95204aac82c283df`.

### 1. Sol Incident Evidence Summary (Windows Host Side)
- **Retained idle console chains:** Three `conhost.exe` (`13760`, `14952`, `8848`) + `cmd.exe /c agy-node.cmd` (`15316`, `21436`, `8496`) + `Antigravity.exe` (`9680`, `6324`, `19084`) chains were Antigravity's built-in `swarm_board` sidecar (`main.mjs`, working directory `%USERPROFILE%\.gemini\antigravity\builtin\plugins\swarm\sidecars\swarm_board\`), not spawned by `Agy-Context-Saver`.
- **Transient CPU-busy headless consoles:** Three `conhost.exe --headless --inheritcursor --width --height --signal --server` processes (`10972`, `3428`, `1008`, `~3.1s` CPU per 3s window) had missing parents (`parentPresent: false` for PIDs `708` and `17244`) and exited before follow-up. Zero `rg` or `rtk` processes appeared in Windows CIM snapshots, and `execution-guard-hook.mjs` on `c724eaa` was unmodified.

### 2. WSL Checksums & Linux Binary Resolution (`c724eaa`)
- **Plugin & mirrored hook integrity:** `/home/paragon-ux/.gemini/config/plugins/agy-context-saver` symlinks to `/home/paragon-ux/Antigravity/Agy-Context-Saver`. All three copies of `scripts/execution-guard-hook.mjs` (repo, plugin symlink, and `/home/paragon-ux/.gemini/config/scripts/execution-guard-hook.mjs`) share SHA-256 `f14377cf323baa6945b13a1e3ebd9f8f2c80a304a14b51d84bbc2a64f80fe272`. Both `/home/paragon-ux/Antigravity/Agy-Context-Saver/hooks.json` (`4ce2913edb39a87d397069f1caaaf049ed2eed6d27fb1b52cb7d54c2bdbb6305`, trailing newline) and `/home/paragon-ux/.gemini/config/hooks.json` (`0d351b522ed6f6a7285d7a78f6878e72075bb3d121d7001ccbf91af15fb07c96`, no trailing newline) register `agy-context-saver` `PreToolUse` (`timeout: 10`).
- **Resolved executables on host `language_server` `PATH` (`62` directories):**
  - `node`: `/home/paragon-ux/.gemini/antigravity/bin/node` (symlink -> `node-v22.19.0-linux-x64/bin/node`) ahead of `/usr/local/bin/node` (`v24.22.2`).
  - `npm`: `/home/paragon-ux/.gemini/antigravity/bin/npm` (symlink -> `node-v22.19.0-linux-x64/bin/npm`) resolves first ahead of `/mnt/c/Program Files/nodejs//npm` and `/mnt/c/Users/USER/AppData/Roaming/npm/npm`.
  - `rtk`: `/usr/local/bin/rtk` (symlink -> Linux ELF `/home/paragon-ux/.local/bin/rtk`, `rtk 1.1.0`) ahead of bundled Linux ELF `~/.gemini/config/plugins/agy-context-saver/bin/rtk`.
  - `agy`: Absent from `language_server` `PATH` (`which -a agy` empty); `/home/paragon-ux/.local/bin/agy` exists on disk as a Linux ELF 64-bit executable.
  - `rg`: Absent from `PATH` (`which -a rg` empty). `execution-guard-hook.mjs` scans all `62` `PATH` directories (including `/mnt/c/...` 9P entries) via `findExecutableOnPath("rg")` in `128.1 ms`, `rtk --version` completes in `6.01 ms`, and `rtk hook antigravity` completes in `8.2 ms` to `69.39 ms` (`timeout: 2000`, `windowsHide: true`).

### 3. Live WSL `rg` Fallback, Step 380 Re-Test & Process Baseline Comparison
- **Pre-probe baseline (`/usr/bin/ps -efww --forest`, `STIME 21:05`):** Only `/home/paragon-ux/.antigravity-server/bin/2.32.2/language_server` (`PID 555`), `node ./mcp/index.js` (`PID 595`), and `swarm_board` sidecar (`PID 596`, `cwd` `/home/paragon-ux/.gemini/antigravity/builtin/plugins/swarm/sidecars/swarm_board`) under WSL session `pts/0` (plus login shell `411` on `pts/1` and transient `run_command` subshell on `pts/2`).
- **Step 379/380 diagnostic re-test:** Re-running Step 379's exact command (`ls -la /tmp/ && ls -la /home/paragon-ux/.antigravity-server/ && grep -nE "globalHookRegistered|mirroredHook" /home/paragon-ux/Antigravity/Agy-Context-Saver/scripts/install-register.mjs`) through the live host hook completed in `~3s` (`exit 0`). Step 380's pre-restart failure (`JSON hook "jsonhook__agy-context-saver_PreToolUse_0_0" failed: command failed: signal: killed, stderr:` at `01:31:23Z-01:31:29Z`) remains an isolated unattributed host-side `SIGKILL` event and did not reproduce on `c724eaa`.
- **Live missing-`rg` guard exercises:** Ordinary `rg`, repeated `rg`, explicit `rtk rg`, and explicit `rtk grep -rnE` all completed cleanly (`exit 0`), with `PreToolUse` rewriting `rg` to `grep -n -E` fallback and `rtk rg` to `rtk grep -E` fallback while preserving explicit `rtk grep -rnE`.
- **Post-probe and full-suite WSL process check:** After all live probes and re-running the full parallel workflow (`agy-squad setup`, `status --json`, all `12` scripts in `Agy-Context-Saver` `npm test`, all `10` scripts in `Agy-Squad` `npm test`, `preflight`, and `verify:package` on both repos `34` and `54` files), the operator observed zero Windows console anomalies on re-run, and `/usr/bin/ps -efww --forest` remained identical to baseline (`PIDs 555`, `595`, `596` at `STIME 21:05`), with zero orphan `node`, `rtk`, `rg`, or hook processes retained in WSL.
- **Closure state (`l46_live`):** `swarm{action: "status"}` confirms all 4 workers `killed: true`; `manage_subagents(Action='list')` returns `[]`; `manage_task(Action='list')` reports zero running tasks; `agy-squad verify scratch/agy-squad/squad-l46_live/lead/report.sources.json` passes (`exit 0`, `SHA-256 3c55ba75556843eae1738a1a5e30dfb8ee207bf387417500dd3fa1ca4eb3a62a`); `agy-context status --json` and `agy-squad status --json` both report `isComplete: true` (`exit 0`). (Session `transcript health` at Step 430 reported `WARNING` with `pollingViolations: 1`, `corruptLines: 0`.)
