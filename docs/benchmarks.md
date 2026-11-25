# Benchmarks: Agy-Squad vs. Antigravity Teamwork

This page records two head-to-head sequential evaluations on the two-domain event-relay fixture (`6` planted `P1`/`P2` defects, [`benchmarks/teamwork-vs-squad/`](https://github.com/paragon-ux/Agy-Squad/tree/main/benchmarks/teamwork-vs-squad)):

1. **November 15, 2026 Matched-`High` Retest (current Phase 2 path):** Native `/swarm` + `Agy-Context-Saver 2.0.1` (`rtk 1.1.0`) vs. Antigravity `/teamwork [skip-interview]`, pinned to `Gemini 4 Hydrogen (High)` on all parents and child workers.
2. **November 8, 2026 Historical Baseline (retired Phase 1 path):** `agy-squad run --launch` + `Agy-Context-Saver 1.8.1` (`rtk 0.51.0`) vs. Antigravity `/teamwork [skip-interview]`.

## Matched-`High` Retest (November 15, 2026: Native `/swarm` + `Agy-Context-Saver 2.0.1`)

Both arms caught all six planted defect categories (`6 / 6`). Counting **all sessions end-to-end (`parent + workers`)**, Agy-Squad finished in **`6m 30s` (`390s`) vs. `22m 41s` (`1,361s`, `3.49x` faster)**, used **`4` vs. `9` total sessions** (`3` vs. `8` spawned child workers), executed **`178` vs. `655` transcript steps** (`72.8%` reduction; `90` vs. `636` child-only steps), generated **`336.8 KB` vs. `801.8 KB` of raw transcripts** (`58.0%` smaller overall; `183.6 KB` vs. `773.7 KB`, `76.3%` smaller child-only), and sent **`1,629 B` vs. `18,322 B` into the parent inbox** (`91.1%` fewer wakeup bytes).

| Metric | Agy-Squad `/swarm` (`ab_audit`, flat) | Antigravity `/teamwork` (`[skip-interview]`) | Recorded difference |
| --- | ---: | ---: | --- |
| **Model & effort tier (all parents + children)** | `Gemini 4 Hydrogen (High)` | `Gemini 4 Hydrogen (High)` | Exact matched-effort parity |
| **Planted defect categories caught** | **`6 / 6`** (`21` defects: `10 P1`, `11 P2`) | **`6 / 6`** (`16` defects: `8 P1`, `8 P2`) | Equal recall; Arm 1 found 5 more unique defects |
| **Active wall-clock time** | **`6m 30s` (`390s`)** (`385s` internal clock) | **`22m 41s` (`1,361s`)** | **`3.49x` faster (`71.3%` less time)** |
| **Time to first specialist delegation** | **`47s`** (`42s` from initial `date`) | **`244s`** (Sentinel `9s`, Orchestrator `127s`) | **`5.19x` faster first domain worker** |
| **Total sessions (`parent + child workers`)** | **`4`** (`1` coordinator + `3` `/swarm` workers) | **`9`** (`1` parent + `8` subagents) | **`2.25x` fewer sessions (`3` vs. `8` children)** |
| **Combined transcript steps (end-to-end)** | **`178`** (`88` parent + `90` workers) | **`655`** (`19` parent + `636` subagents) | **`3.68x` fewer steps (`72.8%` reduction)** |
| **Combined assistant LLM turns** | **`49`** (`25` parent + `24` workers) | **`319`** (`8` parent + `311` subagents) | **`6.51x` fewer turns (`84.6%` reduction)** |
| **Combined tool calls (errors)** | **`117`** (`57` + `60`; `5` errors) | **`311`** (`6` + `305`; `16` errors) | **`2.66x` fewer tool calls (`62.4%` reduction)** |
| **Combined raw transcript size (end-to-end)** | **`336.8 KB`** (`153.2 KB` + `183.6 KB`) | **`801.8 KB`** (`28.2 KB` + `773.7 KB`) | **`2.38x` smaller (`58.0%` byte reduction)** |
| **Child-only raw transcript size** | **`183.6 KB`** (`3` workers) | **`773.7 KB`** (`8` subagents) | **`4.21x` smaller (`76.3%` byte reduction)** |
| **Parent wakeups and injected bytes** | **`5` notices (`1,629 B`; `647 B` handoffs)** | **`4` wakeups (`18,322 B` incl. `15,839 B` Step 10 CLI output)** | **`11.2x` fewer parent bytes (`91.1%` reduction)** |
| **Busy-polling violations** | **`0`** | **`0`** | Both compliant |
| **Quality & integrity verification** | Bundle SHA-256 `4c28db49...`, Digest `ad876bd4...`, `audit-ab-audit` `CLEAN` | `Victory Auditor` approved Sentinel-fabricated snippets/symbols; caught by parent (`Steps 11–17`) | Cryptographic proof + trace audit vs. missed fabrication |
| **Scratch artifacts retained** | **`4` files (`72,320 B`, specialists pruned, gitignored)** | **`33` files (`183,670 B` in `.agents/teamwork/`)** | **`29` fewer files (`60.6%` fewer bytes)** |

### Matched-`High` per-agent telemetry (November 15, 2026)

#### Arm 1: Agy-Squad native `/swarm` (`4` sessions total, `336,829 B` / `336.8 KB`)

| Role | Conversation ID | Steps | Turns | Tool calls | Errors | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Parent Coordinator & Verification Lead | `5e4a24e1-0dd6-4028-b690-7a731772f2bf` | `88` | `25` | `57` | `1` | `153.2 KB` (`153,216 B`) |
| `ab-audit-gateway-securit` | `583dd7ae-d639-4bbd-91f4-f810f4426542` | `21` | `8` | `11` | `0` | `38.1 KB` (`38,121 B`) |
| `ab-audit-worker-retry-le` | `031e3bc7-7721-4427-a5e8-f531be0176ce` | `23` | `9` | `12` | `0` | `41.7 KB` (`41,722 B`) |
| `audit-ab-audit` (Integrity Auditor) | `15f815c6-7dec-480c-b7e8-3f6a71256f9c` | `46` | `7` | `37` | `4` | `103.8 KB` (`103,770 B`) |

> [!NOTE]
> **Friction investigated and fixed in `v0.1.1`:** During Arm 1 above, Parent Step 7 hit `1` `ENOENT` error when `mcp_agy-squad_squad_planner` ran with MCP server `cwd` outside the repository root (resolved via optional `workspace` parameter, `initialize` `rootUri` fallback, and actionable `ENOENT` diagnostics), and `audit-ab-audit` hit `4` pre-tool hook denials on unbounded `read_file` in Steps 5-8 before falling back to `rtk read` (resolved by adding bounded `<=150`-line / `rtk read` guidance in `mcp/briefs.mjs`).

#### Arm 2: Antigravity `/teamwork` control (`9` sessions total, `801,839 B` / `801.8 KB`)

| Role | Conversation ID | Steps | Turns | Tool calls | Errors | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Parent Session | `c657d27b-892e-487a-b461-1ebc5484e860` | `19` | `8` | `6` | `0` | `28.2 KB` (`28,177 B`) |
| Sentinel | `0d03a8bb-a10b-48b1-8996-283e6ed47611` | `97` | `46` | `44` | `0` | `94.3 KB` (`94,290 B`) |
| Orchestrator | `1912c806-59e3-4df8-bc10-ee70b955bca9` | `102` | `51` | `45` | `6` | `136.0 KB` (`136,047 B`) |
| Security Explorer | `08eb6ae7-b109-43cb-95ac-b6dd0e6a8942` | `65` | `29` | `35` | `4` | `85.6 KB` (`85,609 B`) |
| Reliability Explorer | `9aa12cb7-aac5-43b1-9b83-7529002f8b5a` | `74` | `37` | `36` | `1` | `88.8 KB` (`88,837 B`) |
| Contract Explorer | `3d6d877a-ebfb-4e7c-b152-39874f9ee5ca` | `81` | `40` | `40` | `2` | `104.5 KB` (`104,516 B`) |
| Quality Reviewer | `b6a2378b-cce9-412b-a8b7-8fb117ba3f07` | `62` | `31` | `30` | `2` | `87.1 KB` (`87,072 B`) |
| Forensic Auditor | `65936336-840e-46e5-8556-1fb6f5bd3214` | `76` | `38` | `37` | `1` | `77.2 KB` (`77,155 B`) |
| Victory Auditor | `0c070377-6818-41cc-ad82-b53fa4ae15bf` | `79` | `39` | `38` | `0` | `100.1 KB` (`100,136 B`) |

## Historical baseline comparison (November 8, 2026)

Both arms caught all six planted defect categories (`6 / 6`). Agy-Squad + Agy-Context-Saver finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)**, used **`64` vs. `645` transcript steps** (`10.1x` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` smaller), and sent **`249 B` vs. `4,940 B` into the parent conversation** (`95.0%` fewer parent wakeup bytes).

| Metric | Agy-Squad + Agy-Context-Saver (`ab_audit`) | Antigravity `/teamwork` (`[skip-interview]`) | Recorded difference |
| --- | ---: | ---: | --- |
| **Planted defect categories caught** | **`6 / 6` (`100%`)** | **`6 / 6` (`100%`)** | Equal category recall (`18` vs. `25` total items reported) |
| **Active wall-clock time** | **`6m 15s` (`375s`)** | **`26m 19s` (`1,579s`)** | **`4.2x` faster (`76.2%` less time)** |
| **Time to first specialist delegation** | **`59s`** (`8.5 ms` compile) | **`91s`** (startup phase) | **`1.5x` faster initial delegation** |
| **Subagents spawned** | **`3`** (`1` lead, `2` specialists) | **`8`** (`teamwork` fleet) | **`2.7x` fewer subagents** |
| **Total transcript steps (historical `v1.8.1` `check_context_health` / `v2.0.1` `agy-context transcript health`)** | **`64`** (`32 + 19 + 13`) | **`645`** (`50` to `129` across `8` agents) | **`10.1x` fewer steps (`90.1%` reduction)** |
| **Total assistant LLM turns** | **`26`** (`11 + 9 + 6`) | **`321`** (`25` to `63` across `8` agents) | **`12.3x` fewer turns (`91.9%` reduction)** |
| **Total tool calls** | **`32`** (`17 + 9 + 6`) | **`302`** (`24` to `57` across `8` agents) | **`9.4x` fewer tool calls (`89.4%` reduction)** |
| **Aggregate raw transcript size** | **`148.2 KB`** | **`817.4 KB`** | **`5.5x` smaller (`81.9%` byte reduction)** |
| **Parent wakeups and injected bytes** | **`1` wakeup (`249 B`)** | **`5` wakeups (`4,940 B`)** | **`19.8x` fewer parent bytes (`95.0%` reduction)** |
| **Artifact integrity verification** | **`20 ms`** (`handoffs.mjs verify` SHA-256 digests) | No separate SHA-256 source/report bundle check | Cryptographic input and report digest check |
| **Semantic correctness verification** | Parent/lead direct code and test inspection (`32` lead steps) | `2` dedicated LLM review agents (`reviewer_1` + `auditor_1`, `174` steps, `228.6 KB`) | Direct lead verification vs. separate verifier fleet |
| **Teardown policy and post-run Git status** | Explicit 3-scope teardown contract at the time of the run (`0` untracked Git files; `scratch/` gitignored; Phase 1, see note below) | No operator-facing teardown CLI documented (`41` untracked files, `207.9 KB` in `.agents/teamwork/`) | Governed deterministic teardown contract |

## Observed contributors to the difference

1. **Task-proportional topology (`3` agents vs. `8`):** For a two-domain audit (`gateway/` and `worker/`), `dispatch_squad` launches one squad lead and two domain specialists from `manifest.json`. `/teamwork` spawns a wrapper agent, an internal orchestrator, three exploratory agents, a report writer (`worker_report_1`), a reviewer (`reviewer_1`), and a forensic auditor (`auditor_1`).
2. **Scoped lead verification and `20 ms` SHA-256 bundling vs. separate LLM review fleet:** In `Agy-Squad`, the squad lead inspects cited source lines directly, writes its synthesis report, and runs the historical Phase 1 standalone `node mcp/handoffs.mjs` (`bundle`, `verify` in `20 ms` producing SHA-256 `418d7ccbade0a14a5b2e165b706adf45275e7b20604df1dfe03c41a012abc945`, and `prune`; now unified into the `agy-squad` CLI). Digest verification confirms that cited inputs and reports match their recorded hashes while the lead's code inspection checks semantic correctness. `/teamwork` delegates verification to `reviewer_1` and `auditor_1` (`174` combined steps, `228.6 KB` of transcript).
3. **Single-line `Pointer-Over-Wire` receipt (`249 B`) vs. five parent wakeups (`4,940 B`):** `Agy-Squad` keeps intermediate coordination inside the squad and wakes the parent once with a `249`-byte `READY` receipt. `/teamwork` wakes the parent four times with intermediate Sentinel progress updates before sending a `3,218`-byte completion summary.
4. **RTK command rewriting and governed teardown:** With `Agy-Context-Saver 1.8.1` (`rtk 0.51.0`) active, `Agy-Squad` specialists read scoped files through `rtk read` and prune loose specialist reports after bundling.

## Recorded session metrics and unit definitions

Session counts in [`benchmarks/teamwork-vs-squad/results/telemetry.json`](https://github.com/paragon-ux/Agy-Squad/blob/main/benchmarks/teamwork-vs-squad/results/telemetry.json) come from `agy-context transcript health --json` in the November 15, 2026 matched-`High` retest (`Agy-Context-Saver 2.0.1`) and from retired `check_context_health` in the historical November 8, 2026 baseline (`Agy-Context-Saver 1.8.1`):

- **Transcript steps, turns, and tool calls:** Operational counts from `.system_generated/logs/transcript.jsonl`. The November 15 retest records both child-worker totals (`workersSummary` / `childrenSummary`) and full end-to-end totals including parent coordination (`allSessionsSummary`), whereas the November 8 Phase 1 baseline recorded child-subagent totals (`3` vs. `8`).
- **Raw transcript size and parent wakeup bytes:** Measured in decimal kilobytes (`1,000 B`) and UTF-8 message bytes (`336.8 KB` vs. `801.8 KB` end-to-end and `1,629 B` vs. `18,322 B` in November 15; `148.2 KB` vs. `817.4 KB` child-only and `249 B` vs. `4,940 B` in November 8). These measure transcript and parent-inbox volume, not billed API token charges.
- **Finding adjudication (`6 / 6` categories across all runs):** Both arms caught all six planted defect categories (`N1` through `N6`). Total reported item counts (`21` vs. `16` in November 15; `18` vs. `25` in November 8) depend on how `N6` sub-defects and secondary input-validation observations are itemized.
- **Methodology scope, governance share, and native comparators:** Both recorded runs compare two-specialist `ab_audit` (`manifest.json`) with `Agy-Context-Saver` (`rtk`) against 8-subagent `/teamwork [skip-interview]` (`1` run per arm on the 6-file event-relay fixture). In November 15 Arm 1 (`178` steps, `336.8 KB`), the two domain specialists used `44` steps (`79.8 KB`, `24.7%` of steps and `23.7%` of bytes) while parent coordination and `audit-ab-audit` verification used `134` steps (`257.0 KB`, `75.3%` of steps and `76.3%` of bytes). Those captures did not include standalone runs without `Agy-Context-Saver`, plain unmanaged `/swarm`, `run_workflow`, or `/boost` (`DeepInvestigator`); when auditing a single module (`<= 6-8` files) that does not need separate specialist scopes or a SHA-256 proof bundle, use `/boost` directly.

## Benchmark fixture and six planted bugs

The fixture in `benchmarks/teamwork-vs-squad/fixture/` models a two-stage webhook relay (`gateway/gateway.mjs` and `worker/worker.mjs` + `worker/ledger.mjs`). Its unit tests (`test-gateway.mjs` and `test-worker.mjs`) pass in isolation while leaving six cross-module defects:

| ID | Priority | Location | Defect summary | Caught by Agy-Squad | Caught by `/teamwork` |
| --- | --- | --- | --- | :---: | :---: |
| `N1` | `P1` | `gateway/gateway.mjs:10` | `crypto.timingSafeEqual` called without buffer length check, throwing uncaught `RangeError` on short or odd-length hex signatures | Yes (`SYN-01`) | Yes (`SEC-01`) |
| `N2` | `P2` | `gateway/gateway.mjs:25` | `createRateLimiter` resets `bucket.lastRefillMs = nowMs` even when `intervals === 0`, starving token refill under steady sub-second traffic | Yes (`SYN-02`) | Yes (`REL-01`) |
| `N3` | `P1` | `gateway/gateway.mjs:40` vs. `worker/worker.mjs:4` | Gateway writes `headers['x-idempotency-key']` while worker requires `headers['x-request-id']`, dead-lettering `100%` of gateway envelopes with `MISSING_REQUEST_ID` | Yes (`SYN-03`) | Yes (`CON-01`) |
| `N4` | `P1` | `gateway/gateway.mjs:43` vs. `worker/worker.mjs:9` | Gateway emits `schemaVersion: "2.0"` while worker rejects anything other than `"1.0"` with `UNSUPPORTED_SCHEMA` | Yes (`SYN-04`) | Yes (`CON-02`) |
| `N5` | `P1` | `worker/worker.mjs:12` vs. `config.json:3` | Worker compares millisecond timestamp delta `Math.abs(nowMs - event.timestampMs)` against `config.maxSkewSeconds` (`300`) without `* 1000`, shrinking the 5-minute window to `300 ms` | Yes (`SYN-05`) | Yes (`BUG-01`) |
| `N6` | `P1` | `worker/ledger.mjs:9-21` & `worker/worker.mjs:16-28` | `readLedger` resets corrupt JSON to `[]` (wiping prior entries on non-atomic `writeFileSync`) and `attempt >= maxRetries` on 1-based `attempt` performs `0` retries when `maxRetries = 1` | Yes (`SYN-06`) | Yes (`REL-02` / `BUG-02`) |

## Per-agent telemetry breakdown (November 8, 2026 Phase 1 baseline)

### Arm 1: Agy-Squad + Agy-Context-Saver (`3` subagents, `148.2 KB` total)

| Role | Conversation ID | Steps | Turns | Tool calls | Busy polls | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Event Relay Audit Squad Lead | `f1465008-b194-4217-b103-07bfb98d9454` | `32` | `11` | `17` | `0` | `78.3 KB` |
| Gateway Security & Rate-Limit Auditor | `5f8a9dd9-42cd-4331-9307-4edd8e02aa54` | `19` | `9` | `9` | `0` | `38.3 KB` |
| Worker Retry, Ledger & Contract Auditor | `472dbd4c-0f4c-45bf-8b24-ec69923d913f` | `13` | `6` | `6` | `0` | `31.6 KB` |

### Arm 2: Antigravity `/teamwork` control (`8` subagents, `817.4 KB` total)

| Role | Conversation ID | Steps | Turns | Tool calls | Busy polls | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `teamwork` wrapper | `d00a4261-5d7c-4edd-bb27-8a1f277a5420` | `66` | `33` | `26` | `0` | `59.0 KB` |
| `teamwork_orchestrator` | `a6772a4a-25d7-411e-bfaf-9d14d0aa63c5` | `129` | `63` | `57` | `0` | `186.2 KB` |
| `explorer_gateway_1` | `1096662d-2e1e-4945-a512-11c8e077fd98` | `66` | `33` | `32` | `0` | `80.7 KB` |
| `explorer_worker_1` | `13d812cf-97c2-4372-8622-4ba9fe10e46f` | `84` | `42` | `41` | `0` | `107.2 KB` |
| `miner_contract_1` | `1d4582c6-d938-46a0-a52f-4f9ced1b8bc2` | `50` | `25` | `24` | `0` | `71.8 KB` |
| `worker_report_1` | `b67d2e43-bf6e-4981-b70b-8a3ef93e266a` | `76` | `38` | `37` | `0` | `83.9 KB` |
| `reviewer_1` | `c76fead5-bea3-464d-9865-55fb3f10d205` | `60` | `30` | `29` | `0` | `96.2 KB` |
| `auditor_1` | `cb702aa1-b3b3-4325-9fe7-1edfdea74ecd` | `114` | `57` | `56` | `0` | `132.4 KB` |

## Documented teardown and evidence retention

> [!NOTE]
> **Historical comparison.** The November 8, 2026 run above used Agy-Squad's Phase 1 launcher (`agy-squad run --launch`, `bin/terminal.py`, `mcp/run-state.mjs`), which has since been retired. The run exercised the retained `dispatch_squad` staged compiler, `Pointer-Over-Wire` receipts, and `mcp/handoffs.mjs` (`bundle`/`verify`/`prune`). Managed CLI session cleanup from Phase 1 no longer exists because native `/swarm` owns worker lifecycles and `kill` cleanup. These numbers record the Phase 1 workflow and do not measure the current `squad_planner` + `/swarm` path.

After Phase 2, **Agy-Squad's evidence-retention contract (handoff bundle and self-diagnosis scopes)** ([`docs/core-workflows.md`](core-workflows.md)) sits alongside native `/swarm` worker cleanup:

1. **Native `/swarm` worker lifecycle (Antigravity):** Worker spawning, worktree isolation, and `kill` cleanup belong to Antigravity `/swarm`. `agy-squad` writes no temporary plugin or agent-profile registrations.
2. **Handoff bundle scope:** `agy-squad` (`finalize` or `inspect -> bundle -> verify -> prune`, backed by `mcp/handoffs.mjs`; the standalone `node mcp/handoffs.mjs` CLI from Phase 1 has since been retired) records SHA-256 digests of every input file and specialist report in `lead/report.sources.json` before pruning loose `specialist-N/report.md` files.
3. **Self-diagnosis review scope:** `.agents/skills/self-diagnosis/SKILL.md` requires 1-ID-per-row transcription into a durable `docs/reviews/` ledger and bundle digest verification before `agy-squad finalize --prune` and scratch cleanup remove finished `scratch/agy-squad/squad-*` directories and `manage_subagents` terminates child sessions.

The recorded `0` vs. `41` (`207.9 KB`) Git-untracked file counts come from `git status` after run completion (Agy-Squad's `.gitignore` excludes `scratch/`).

## Offline check vs. live experiment reproduction

### 1. Offline fixture and ledger consistency check

Run the offline verifier from the repository root (also executed by `npm test`):

```bash
node benchmarks/teamwork-vs-squad/verify-benchmark.mjs
```

`verify-benchmark.mjs` runs both fixture unit suites, reproduces all six seeded bugs in-process, compiles `all_l1` and `ab_audit` from `benchmarks/teamwork-vs-squad/manifest.json`, and checks the per-agent sums, rubric mappings, and provenance fields in `benchmarks/teamwork-vs-squad/results/telemetry.json`. It does not launch `agy` or replay live conversations.

### 2. Live reproduction protocol and provenance policy

See [`benchmarks/teamwork-vs-squad/README.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/benchmarks/teamwork-vs-squad/README.md#experimental-protocol-prompts-and-provenance-policy) for the verbatim audit prompt, arm configuration details (`manifest.json` domain-specialist briefs vs. `/teamwork [skip-interview]`), timing boundaries, and step-by-step live run commands. Session `conversationId` UUIDs in `results/telemetry.json` are local Antigravity conversation identifiers kept for transcript health verification (`agy-context transcript health` in `v2.0.1`; historical `check_context_health` in the `v1.8.1` baseline); host paths, usernames, and raw session transcripts were stripped before publication.
