# Benchmarks: Agy-Squad vs. Antigravity Teamwork

On November 8, 2026, we ran a recorded sequential comparison between **Agy-Squad + Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** and **Antigravity `/teamwork` (`[skip-interview]` control)** on a two-domain event-relay fixture containing six planted `P1` and `P2` defects ([`benchmarks/teamwork-vs-squad/`](https://github.com/paragon-ux/Agy-Squad/tree/main/benchmarks/teamwork-vs-squad)).

## Canonical recorded comparison (November 8, 2026)

In this recorded six-defect audit, both arms caught all six planted defect categories (`6 / 6`). Agy-Squad + Agy-Context-Saver finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)**, used **`64` vs. `645` transcript steps** (`10.1x` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` smaller), and sent **`249 B` vs. `4,940 B` into the parent conversation** (`95.0%` fewer parent wakeup bytes).

| Metric | Agy-Squad + Agy-Context-Saver (`ab_audit`) | Antigravity `/teamwork` (`[skip-interview]`) | Recorded difference |
| --- | ---: | ---: | --- |
| **Planted defect categories caught** | **`6 / 6` (`100%`)** | **`6 / 6` (`100%`)** | Equal category recall (`18` vs. `25` total items reported) |
| **Active wall-clock time** | **`6m 15s` (`375s`)** | **`26m 19s` (`1,579s`)** | **`4.2x` faster (`76.2%` less time)** |
| **Time to first specialist delegation** | **`59s`** (`8.5 ms` compile) | **`91s`** (startup phase) | **`1.5x` faster initial delegation** |
| **Subagents spawned** | **`3`** (`1` lead, `2` specialists) | **`8`** (`teamwork` fleet) | **`2.7x` fewer subagents** |
| **Total transcript steps (`check_context_health`)** | **`64`** (`32 + 19 + 13`) | **`645`** (`66` to `129` across `8` agents) | **`10.1x` fewer steps (`90.1%` reduction)** |
| **Total assistant LLM turns** | **`26`** (`11 + 9 + 6`) | **`321`** (`25` to `63` across `8` agents) | **`12.3x` fewer turns (`91.9%` reduction)** |
| **Total tool calls** | **`32`** (`17 + 9 + 6`) | **`302`** (`24` to `57` across `8` agents) | **`9.4x` fewer tool calls (`89.4%` reduction)** |
| **Aggregate raw transcript size** | **`148.2 KB`** | **`817.4 KB`** | **`5.5x` smaller (`81.9%` byte reduction)** |
| **Parent wakeups and injected bytes** | **`1` wakeup (`249 B`)** | **`5` wakeups (`4,940 B`)** | **`19.8x` fewer parent bytes (`95.0%` reduction)** |
| **Artifact integrity verification** | **`20 ms`** (`handoffs.mjs verify` SHA-256 digests) | No separate SHA-256 source/report bundle check | Cryptographic input and report digest check |
| **Semantic correctness verification** | Parent/lead direct code and test inspection (`32` lead steps) | `2` dedicated LLM review agents (`reviewer_1` + `auditor_1`, `174` steps, `228.6 KB`) | Direct lead verification vs. separate verifier fleet |
| **Teardown policy and post-run Git status** | Explicit 3-scope teardown contract (`0` untracked Git files; `scratch/` gitignored) | No operator-facing teardown CLI documented (`41` untracked files, `207.9 KB` in `.agents/teamwork/`) | Governed lifecycle contract (`L41`) |

## Possible contributors to the observed difference

1. **Task-proportional topology (`3` agents vs. `8`):** For a two-domain audit (`gateway/` and `worker/`), `Agy-Squad` dispatches one squad lead and two domain specialists from `manifest.json`. `/teamwork` spawns a wrapper agent, an internal orchestrator, three exploratory agents, a dedicated report writer (`worker_report_1`), a reviewer (`reviewer_1`), and a forensic auditor (`auditor_1`).
2. **Scoped lead verification + `20 ms` SHA-256 bundling vs. separate LLM review fleet:** In `Agy-Squad`, the squad lead inspects the cited source lines directly, writes its synthesis report, and runs `node mcp/handoffs.mjs bundle`, `verify` (`20 ms`, SHA-256 `418d7ccbade0a14a5b2e165b706adf45275e7b20604df1dfe03c41a012abc945`), and `prune`. The `20 ms` SHA-256 check confirms cryptographic artifact integrity (that cited files and reports match their recorded digests), while the lead's code inspection verifies semantic correctness. `/teamwork` delegates semantic verification to two additional LLM subagents (`reviewer_1` and `auditor_1`) that run `174` combined steps (`228.6 KB` of transcript).
3. **Single-line `Pointer-Over-Wire` receipt (`249 B`) vs. five parent wakeups (`4,940 B`):** `Agy-Squad` keeps intermediate coordination inside the squad and wakes the parent conversation once with a `249`-byte `READY` receipt. `/teamwork` wakes the parent conversation four times with intermediate Sentinel progress updates before sending a `3,218`-byte completion summary.
4. **RTK command rewriting and governed teardown (`L41`):** With `Agy-Context-Saver 1.8.1` (`rtk 0.51.0`) active, `Agy-Squad` specialists read scoped files through `rtk read` and prune loose specialist reports after bundling.

## Recorded session metrics and unit definitions

All session counts in `benchmarks/teamwork-vs-squad/results/telemetry.json` come from `agy-context-saver`'s `check_context_health` tool:

- **Transcript steps, turns, and tool calls:** Operational counts from `.system_generated/logs/transcript.jsonl` across every spawned subagent in each arm.
- **Raw transcript size (`148.2 KB` vs. `817.4 KB`) and parent wakeup bytes (`249 B` vs. `4,940 B`):** Measured in decimal kilobytes (`1,000 B`) and UTF-8 message bytes. These measure transcript and parent-inbox volume rather than billed API token charges.
- **Finding adjudication (`6 / 6` categories vs. `18` and `25` total items):** Both arms caught all six planted defect categories (`N1` through `N6`). Total reported counts (`18` in Agy-Squad vs. `25` in Teamwork) include sub-defects split out from `N6` (corrupt JSON reset, non-atomic write, off-by-one retry) plus secondary input-validation observations.

## Benchmark fixture and six planted bugs

The fixture in `benchmarks/teamwork-vs-squad/fixture/` models a two-stage webhook relay (`gateway/gateway.mjs` and `worker/worker.mjs` + `worker/ledger.mjs`). Its unit tests (`test-gateway.mjs` and `test-worker.mjs`) pass in isolation while leaving six defects across module boundaries:

| ID | Priority | Location | Defect summary | Caught by Agy-Squad | Caught by `/teamwork` |
| --- | --- | --- | --- | :---: | :---: |
| `N1` | `P1` | `gateway/gateway.mjs:10` | `crypto.timingSafeEqual` called without buffer length check, throwing uncaught `RangeError` on short or odd-length hex signatures | Yes (`SYN-01`) | Yes (`SEC-01`) |
| `N2` | `P2` | `gateway/gateway.mjs:25` | `createRateLimiter` resets `bucket.lastRefillMs = nowMs` even when `intervals === 0`, starving token refill under steady sub-second traffic | Yes (`SYN-02`) | Yes (`REL-01`) |
| `N3` | `P1` | `gateway/gateway.mjs:40` vs. `worker/worker.mjs:4` | Gateway writes `headers['x-idempotency-key']` while worker requires `headers['x-request-id']`, dead-lettering `100%` of gateway envelopes with `MISSING_REQUEST_ID` | Yes (`SYN-03`) | Yes (`CON-01`) |
| `N4` | `P1` | `gateway/gateway.mjs:43` vs. `worker/worker.mjs:9` | Gateway emits `schemaVersion: "2.0"` while worker rejects anything other than `"1.0"` with `UNSUPPORTED_SCHEMA` | Yes (`SYN-04`) | Yes (`CON-02`) |
| `N5` | `P1` | `worker/worker.mjs:12` vs. `config.json:3` | Worker compares millisecond timestamp delta `Math.abs(nowMs - event.timestampMs)` against `config.maxSkewSeconds` (`300`) without `* 1000`, shrinking the 5-minute window to `300 ms` | Yes (`SYN-05`) | Yes (`BUG-01`) |
| `N6` | `P1` | `worker/ledger.mjs:9-21` & `worker/worker.mjs:16-28` | `readLedger` resets corrupt JSON to `[]` (wiping prior entries on non-atomic `writeFileSync`) and `attempt >= maxRetries` on 1-based `attempt` performs `0` retries when `maxRetries = 1` | Yes (`SYN-06`) | Yes (`REL-02` / `BUG-02`) |

## Per-agent telemetry breakdown

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

The lifecycle distinction between the two workflows is **Agy-Squad's explicit 3-scope teardown and evidence-retention contract** ([`docs/core-workflows.md`](core-workflows.md)):

1. **Managed CLI session scope:** `bin/agy-squad.mjs` removes unchanged temporary plugin and agent profile registrations on exit while preserving staged run evidence under `scratch/agy-squad/run-...`.
2. **Handoff bundle scope:** `node mcp/handoffs.mjs` enforces `inspect -> bundle -> verify -> prune`, recording SHA-256 digests of every input file and specialist report in `lead/report.sources.json` before pruning loose `specialist-N/report.md` files.
3. **Self-diagnosis review scope:** `.agents/skills/self-diagnosis/SKILL.md` requires 1-ID-per-row transcription into a durable `docs/reviews/` ledger and bundle digest verification before `diagnose.mjs --teardown` removes `scratch/agy-squad/squad-*` directories and `manage_subagents` terminates child sessions.

The recorded `0` vs. `41` (`207.9 KB`) Git-untracked file counts are secondary telemetry from `git status` after run completion (note that Agy-Squad's `.gitignore` excludes `scratch/`).

## Offline check vs. live experiment reproduction

### 1. Offline fixture and ledger consistency check

Run the offline verifier from the repository root (also executed by `npm test`):

```bash
node benchmarks/teamwork-vs-squad/verify-benchmark.mjs
```

This script runs both fixture unit suites, reproduces all six seeded bugs in-process, compiles `all_l1` and `ab_audit` from `benchmarks/teamwork-vs-squad/manifest.json`, and checks the per-agent sums, rubric mappings, and provenance fields in `benchmarks/teamwork-vs-squad/results/telemetry.json`. It does not launch `agy` or replay live conversations.

### 2. Live reproduction protocol and provenance policy

See [`benchmarks/teamwork-vs-squad/README.md`](https://github.com/paragon-ux/Agy-Squad/blob/main/benchmarks/teamwork-vs-squad/README.md#experimental-protocol-prompts-and-provenance-policy) for the verbatim audit prompt, arm configuration details (`manifest.json` domain-specialist briefs vs. `/teamwork [skip-interview]`), timing boundaries, and step-by-step live run commands. Session `conversationId` UUIDs in `results/telemetry.json` are local Antigravity conversation identifiers kept for `check_context_health` verification, with host paths, usernames, and raw session transcripts excluded prior to publication.
