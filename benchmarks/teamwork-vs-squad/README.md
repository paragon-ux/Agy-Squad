# Agy-Squad vs. Antigravity Teamwork benchmark

This directory holds the fixture, dispatch manifest, offline consistency check, and recorded session telemetry for two sequential head-to-head audits on the six-defect event-relay fixture:

1. **November 15, 2026 Matched-`High` Retest (current Phase 2 path):** Native `/swarm` + **Agy-Context-Saver 2.0.1 (`rtk 1.1.0`)** vs. **Antigravity `/teamwork` (`[skip-interview]` control)**, pinned to `Gemini 4 Hydrogen (High)` on all parents and child workers.
2. **November 8, 2026 Historical Baseline (retired Phase 1 path):** `agy-squad run --launch` + **Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** vs. **Antigravity `/teamwork` (`[skip-interview]` control)**.

See [docs/benchmarks.md](../../docs/benchmarks.md) for the canonical comparison tables and architectural breakdown.

## What this benchmark measures

Both systems coordinate multi-agent work inside Antigravity using different orchestration models:

- **Agy-Squad + Agy-Context-Saver (`2.0.1+`)** compiles a scoped cohort via `squad_planner` (`agy-squad plan`), runs child shell commands through `RTK` (`rtk >= 1.1.0`), caps every child board/message handoff at `500` UTF-8 bytes (`Pointer-Over-Wire`), pairs an independent flat Integrity Auditor (`audit-<id>`) with `agy-squad digest` / `bundle` / `verify` SHA-256 digests (`4c28db49...` / `ad876bd4...`), and prunes loose specialist reports under an explicit teardown contract.
- **Antigravity `/teamwork` (`TypeName: "teamwork"`)** delegates an open-ended task through a wrapper/Sentinel agent, an internal orchestrator, exploratory workers, quality reviewer/forensic auditor, and victory auditor.

We built a two-domain event-relay fixture (`fixture/gateway/`, `fixture/worker/`, and `fixture/config.json`) whose unit tests pass on mocked happy-path inputs while containing six `P1` and `P2` security, state-drift, data-loss, and cross-domain contract bugs.

## Matched-`High` retest summary (November 15, 2026)

With both arms pinned to `Gemini 4 Hydrogen (High)` on parents and all child workers, both caught all six planted defect categories (`6 / 6`), with **Agy-Squad reporting `21` unique defects (`10 P1`, `11 P2`) vs. `16` (`8 P1`, `8 P2`)** (where `/teamwork` Sentinel `0d03a8bb` fabricated code snippets/symbol names that passed `/teamwork`'s own `Victory Auditor` and had to be caught and fixed by the parent session in Steps 11–17). Counting **all sessions end-to-end (`parent + child workers`)**, **Agy-Squad `/swarm`** finished in **`6m 30s` (`390s`) vs. `22m 41s` (`1,361s`, `3.49x` faster)**, used **`4` vs. `9` total sessions** (`3` vs. `8` child workers), executed **`178` vs. `655` steps** (`72.8%` reduction; `90` vs. `636` child-only), generated **`336.8 KB` (`183.6 KB` child-only) vs. `801.8 KB` (`773.7 KB` child-only)** of raw transcripts (`58.0%` smaller overall, `76.3%` smaller child-only), and sent **`1,629 B` (`5` notices; `647 B` handoffs) vs. `18,322 B` (`4` wakeups)** into the parent inbox (`91.1%` fewer wakeup bytes).

All per-agent metrics are stored in [`results/telemetry.json`](results/telemetry.json) (Nov 15 under `matchedHighRetest`; Nov 8 under top-level `arms`).

### Arm 1 (`Nov 15`): Agy-Squad native `/swarm` (`4` sessions total, `336,829 B` / `336.8 KB`)

| Role | Conversation ID | Steps | Assistant turns | Tool calls | Errors | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Parent Coordinator & Verification Lead | `5e4a24e1-0dd6-4028-b690-7a731772f2bf` | `88` | `25` | `57` | `1` | `153.2 KB` |
| `ab-audit-gateway-securit` | `583dd7ae-d639-4bbd-91f4-f810f4426542` | `21` | `8` | `11` | `0` | `38.1 KB` |
| `ab-audit-worker-retry-le` | `031e3bc7-7721-4427-a5e8-f531be0176ce` | `23` | `9` | `12` | `0` | `41.7 KB` |
| `audit-ab-audit` (Integrity Auditor) | `15f815c6-7dec-480c-b7e8-3f6a71256f9c` | `46` | `7` | `37` | `4` | `103.8 KB` |

### Arm 2 (`Nov 15`): Antigravity `/teamwork` control (`9` sessions total, `801,839 B` / `801.8 KB`)

| Role | Conversation ID | Steps | Assistant turns | Tool calls | Errors | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Parent Session | `c657d27b-892e-487a-b461-1ebc5484e860` | `19` | `8` | `6` | `0` | `28.2 KB` |
| Sentinel | `0d03a8bb-a10b-48b1-8996-283e6ed47611` | `97` | `46` | `44` | `0` | `94.3 KB` |
| Orchestrator | `1912c806-59e3-4df8-bc10-ee70b955bca9` | `102` | `51` | `45` | `6` | `136.0 KB` |
| Security Explorer | `08eb6ae7-b109-43cb-95ac-b6dd0e6a8942` | `65` | `29` | `35` | `4` | `85.6 KB` |
| Reliability Explorer | `9aa12cb7-aac5-43b1-9b83-7529002f8b5a` | `74` | `37` | `36` | `1` | `88.8 KB` |
| Contract Explorer | `3d6d877a-ebfb-4e7c-b152-39874f9ee5ca` | `81` | `40` | `40` | `2` | `104.5 KB` |
| Quality Reviewer | `b6a2378b-cce9-412b-a8b7-8fb117ba3f07` | `62` | `31` | `30` | `2` | `87.1 KB` |
| Forensic Auditor | `65936336-840e-46e5-8556-1fb6f5bd3214` | `76` | `38` | `37` | `1` | `77.2 KB` |
| Victory Auditor | `0c070377-6818-41cc-ad82-b53fa4ae15bf` | `79` | `39` | `38` | `0` | `100.1 KB` |

## Historical baseline summary (November 8, 2026)

In the initial Phase 1 (`agy-squad run --launch`) sequential audit on the same fixture (`Agy-Context-Saver 1.8.1`, `rtk 0.51.0`), both arms caught `6 / 6` planted defect categories (`18` vs. `25` items). **Agy-Squad** finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)**, spawned **`3` vs. `8` subagents**, executed **`64` vs. `645` transcript steps** (`90.1%` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` smaller), and sent **`1` wakeup (`249 B`) vs. `5` wakeups (`4,940 B`)** into the parent conversation (`95.0%` fewer parent bytes).

Full metric rows and unit definitions live in [docs/benchmarks.md](../../docs/benchmarks.md).

## Per-agent breakdown (November 8, 2026 Phase 1 baseline)

All per-agent metrics come from `agy-context-saver`'s `check_context_health` tool and are stored in [`results/telemetry.json`](results/telemetry.json).

### Arm 1: Agy-Squad + Agy-Context-Saver (`3` subagents, `148.2 KB` total)

| Role | Conversation ID | Steps | Assistant turns | Tool calls | Busy-polling events | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Event Relay Audit Squad Lead | `f1465008-b194-4217-b103-07bfb98d9454` | `32` | `11` | `17` | `0` | `78.3 KB` |
| Gateway Security & Rate-Limit Auditor | `5f8a9dd9-42cd-4331-9307-4edd8e02aa54` | `19` | `9` | `9` | `0` | `38.3 KB` |
| Worker Retry, Ledger & Contract Auditor | `472dbd4c-0f4c-45bf-8b24-ec69923d913f` | `13` | `6` | `6` | `0` | `31.6 KB` |

### Arm 2: Antigravity `/teamwork` control (`8` subagents, `817.4 KB` total)

| Role | Conversation ID | Steps | Assistant turns | Tool calls | Busy-polling events | Raw transcript |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `teamwork` wrapper | `d00a4261-5d7c-4edd-bb27-8a1f277a5420` | `66` | `33` | `26` | `0` | `59.0 KB` |
| `teamwork_orchestrator` | `a6772a4a-25d7-411e-bfaf-9d14d0aa63c5` | `129` | `63` | `57` | `0` | `186.2 KB` |
| `explorer_gateway_1` | `1096662d-2e1e-4945-a512-11c8e077fd98` | `66` | `33` | `32` | `0` | `80.7 KB` |
| `explorer_worker_1` | `13d812cf-97c2-4372-8622-4ba9fe10e46f` | `84` | `42` | `41` | `0` | `107.2 KB` |
| `miner_contract_1` | `1d4582c6-d938-46a0-a52f-4f9ced1b8bc2` | `50` | `25` | `24` | `0` | `71.8 KB` |
| `worker_report_1` | `b67d2e43-bf6e-4981-b70b-8a3ef93e266a` | `76` | `38` | `37` | `0` | `83.9 KB` |
| `reviewer_1` | `c76fead5-bea3-464d-9865-55fb3f10d205` | `60` | `30` | `29` | `0` | `96.2 KB` |
| `auditor_1` | `cb702aa1-b3b3-4325-9fe7-1edfdea74ecd` | `114` | `57` | `56` | `0` | `132.4 KB` |

## The six planted defects and adjudication rubric

Both happy-path test files (`fixture/gateway/test-gateway.mjs` and `fixture/worker/test-worker.mjs`) exit `0` because they test each module in isolation with happy-path inputs. Auditing the code across module boundaries exposes six planted defects (`N1` through `N6`):

1. **`N1` (`P1` security and crash DoS in `fixture/gateway/gateway.mjs:10`, matched by `SYN-01` and `SEC-01`):** `verifyWebhookSignature` passes `actualBuf` and `expectedBuf` to `crypto.timingSafeEqual` without checking `actualBuf.length === expectedBuf.length`. Any truncated or odd-length hex signature throws an uncaught `RangeError` instead of returning `false`.
2. **`N2` (`P2` rate-limit starvation in `fixture/gateway/gateway.mjs:25`, matched by `SYN-02` and `REL-01`):** `createRateLimiter` overwrites `bucket.lastRefillMs = nowMs` on every request, even when `elapsedMs < refillIntervalMs` (`intervals === 0`). Steady traffic arriving faster than `1,000 ms` resets the refill clock on every call and never replenishes tokens.
3. **`N3` (`P1` cross-domain header mismatch in `fixture/gateway/gateway.mjs:40` vs. `fixture/worker/worker.mjs:4`, matched by `SYN-03` and `CON-01`):** `buildWorkerEnvelope` writes the idempotency token to `headers["x-idempotency-key"]`, while `processWorkerEnvelope` reads `headers["x-request-id"]`. The worker dead-letters `100%` of gateway envelopes with `MISSING_REQUEST_ID`.
4. **`N4` (`P1` cross-domain schema mismatch in `fixture/gateway/gateway.mjs:43` vs. `fixture/worker/worker.mjs:9`, matched by `SYN-04` and `CON-02`):** `buildWorkerEnvelope` emits `event.schemaVersion = "2.0"`, while `processWorkerEnvelope` rejects any schema version other than `"1.0"` with `UNSUPPORTED_SCHEMA`.
5. **`N5` (`P1` timestamp unit bug in `fixture/worker/worker.mjs:12` vs. `fixture/config.json:3`, matched by `SYN-05` and `BUG-01`):** `processWorkerEnvelope` compares `Math.abs(nowMs - event.timestampMs)` in milliseconds directly against `config.maxSkewSeconds` (`300`) without multiplying by `1000`. That shrinks the configured 5-minute replay window to `300 ms`.
6. **`N6` (`P1` ledger data loss and off-by-one retry in `fixture/worker/ledger.mjs:9-21` and `fixture/worker/worker.mjs:16-28`, matched by `SYN-06` and `REL-02 / BUG-02`):** `readLedger` catches corrupt JSON and returns `[]`, so the next `appendLedgerEntry` call overwrites the ledger file with a single-item array via non-atomic `fs.writeFileSync`. In addition, `processWorkerEnvelope` checks `attempt >= maxRetries` on a 1-based counter, performing zero retries when `config.retry.maxRetries` is `1`.

Both arms reported `6 / 6` planted defect categories (`18` total items reported by Agy-Squad vs. `25` by Teamwork, where extra items correspond to splitting `N6` into its constituent sub-defects plus secondary input-validation observations).

## Experimental protocol, prompts, and provenance policy

- **Environment:** Linux / WSL2 (`Node >= 22`, `Python >= 3.9`, authenticated `agy` CLI). November 15, 2026 matched-`High` retest: `Gemini 4 Hydrogen (High)` on all parents and child workers, `Agy-Context-Saver 2.0.1`, `RTK 1.1.0`. November 8, 2026 historical baseline: `Agy-Context-Saver 1.8.1`, `RTK 0.51.0`.
- **Execution order:** Sequential runs on the same host (Arm 1 Agy-Squad followed by Arm 2 `/teamwork` control) in separate conversation contexts with no shared state.
- **Task prompt and arm configuration:** Both arms received the same read-only audit objective:
  ```text
  Perform a read-only security, reliability, and cross-domain contract audit of benchmarks/teamwork-vs-squad/fixture (gateway/, worker/, and config.json). Identify all concrete defects with file/line evidence, severity (P1/P2), root cause, and remediation.
  ```
  Arm 1 dispatched from [`manifest.json`](manifest.json), which scopes one specialist to `gateway/` + `config.json` and a second specialist to `worker/` + `gateway.mjs` + `config.json`. Arm 2 ran native `/teamwork [skip-interview]` with the same objective and decomposed the task using its internal orchestrator.
- **Timing boundaries:** `activeWallClockSeconds` measures elapsed seconds from initial invocation to final completion receipt in the parent conversation. `timeToFirstDelegationSeconds` measures elapsed seconds from invocation to the first child worker/subagent spawn.
- **Verification and teardown contracts:**
  - *November 15, 2026 Matched-`High` Retest (Phase 2 `/swarm` + flat `audit-ab-audit`):* Arm 1 compiled `ab_audit` (`flat` mode via `squad_planner`), ran `node bin/agy-squad.mjs digest`, spawned flat integrity auditor `audit-ab-audit` (`Integrity Verdict: CLEAN`, Evidence Digest `ad876bd489dede1cf60ba92348c7510fb059e3f5beeedab69de74815ca25d9af`), ran `bundle` & `verify` (Bundle SHA-256 `4c28db49fd34325b9ba13c054955f9ee40462cfa066e55df34d47f566efd9f04`), and pruned loose specialist reports, leaving `4` gitignored proof/lead files (`72,320 B`). Arm 2 invoked `8` `/teamwork` subagents (including `Quality Reviewer`, `Forensic Auditor`, and `Victory Auditor`) and retained `33` files (`183,670 B`) in `.agents/teamwork/`.
  - *November 8, 2026 Baseline (retired Phase 1 `agy-squad run --launch`):* Arm 1 inspected fixture lines, wrote its synthesis report, and ran `node mcp/handoffs.mjs bundle`, `verify` (`20 ms`, SHA-256 `418d7ccbade0a14a5b2e165b706adf45275e7b20604df1dfe03c41a012abc945`), and `prune` (`0` untracked Git files remaining). Arm 2 ran `8` subagents (including `reviewer_1` and `auditor_1`) and left `41` untracked files (`207.9 KB`) in `.agents/teamwork/`.
- **Telemetry provenance and publication policy:** The `conversationId` UUIDs in [`results/telemetry.json`](results/telemetry.json) are local Antigravity conversation identifiers audited via `agy-context transcript health --json` (November 15) and `check_context_health` (November 8). Host-specific filesystem paths, OS usernames, environment credentials, and raw `.system_generated/` transcripts are excluded from repository artifacts.

## Offline fixture and ledger consistency check

Run `verify-benchmark.mjs` locally or in CI without launching subagents:

```bash
node benchmarks/teamwork-vs-squad/verify-benchmark.mjs
```

This script performs four offline checks:

1. Runs `fixture/gateway/test-gateway.mjs` and `fixture/worker/test-worker.mjs`.
2. Reproduces all six planted defects (`N1` through `N6`) in-process.
3. Compiles Stage 1 (`all_l1`) and Stage 2 (`ab_audit`) from `manifest.json`.
4. Verifies per-agent arithmetic sums, adjudication rubric mappings, and provenance fields in `results/telemetry.json`.

## Run a new live experiment

To run a fresh live comparison on an authenticated WSL2 / Linux host with `Agy-Context-Saver 2.0.1+` and `RTK >= 1.1.0` (`HEALTHY & ACTIVE`):

1. Start from a clean checkout of `benchmarks/teamwork-vs-squad/fixture` and record your `agy --version`, exact model/effort tier (e.g., `Gemini 4 Hydrogen (High)` on parent and all children), and start/stop timestamps.
2. **Arm 1 (Agy-Squad):**
   > [!NOTE]
   > The November 8, 2026 baseline used the retired Phase 1 `agy-squad run --launch` PTY launcher (`L17`), whereas the November 15, 2026 matched-`High` retest used native `/swarm` (`squad_planner --mode swarm --model <id>`). Pass `workspace: "<repo-root>"` when invoking MCP `squad_planner` from a global plugin install, or run the CLI equivalent below from the repo root.

   ```bash
   node bin/agy-squad.mjs plan --manifest benchmarks/teamwork-vs-squad/manifest.json \
     --squad ab_audit --topology flat --mode swarm --model <model-id> --out scratch/ab-plan.json --replace
   ```
   Execute the emitted `swarm add` calls (or `invoke_subagent` under `--mode subagent`), wait via `swarm_wait`, initialize and compute the digest via `node bin/agy-squad.mjs bundle-init --plan scratch/ab-plan.json --handoffs scratch/handoffs.json --from-scope --digest --out scratch/ab-record.json --replace`, run `audit-ab-audit` (`node bin/agy-squad.mjs audit-check --record scratch/ab-record.json`, emitting `Integrity Verdict: CLEAN`), run `node bin/agy-squad.mjs finalize scratch/ab-record.json --replace --prune`, and collect per-agent metrics via `agy-context transcript health --id <parent,child1,...> --json`.
3. **Arm 2 (Antigravity `/teamwork` control) and optional fast native controls (`/boost`, plain `/swarm`):** In a fresh Antigravity session on an identical clean checkout, invoke `/teamwork` (`[skip-interview]`) with the task prompt above (and optionally run separate control arms on `/boost` and plain unmanaged `/swarm` with `Agy-Context-Saver` held constant), record completion time, and collect per-agent metrics via `agy-context transcript health --id <parent,child1,...> --json` (or native JSONL transcript inspection).
4. Grade both arms' findings against the six-defect rubric (`N1` through `N6`) in `results/telemetry.json`.
