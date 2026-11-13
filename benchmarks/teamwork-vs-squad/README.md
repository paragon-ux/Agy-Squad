# Agy-Squad vs. Antigravity Teamwork benchmark

This directory holds the fixture, dispatch manifest, offline consistency check, and recorded session telemetry for the November 8, 2026 head-to-head audit comparing **Agy-Squad + Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** against **Antigravity `/teamwork` (`[skip-interview]` control)**.

See [docs/benchmarks.md](../../docs/benchmarks.md) for the canonical comparison table and architectural breakdown.

## What this benchmark measures

Both systems coordinate multi-agent work inside Antigravity using different orchestration models:

- **Agy-Squad + Agy-Context-Saver** compiles a scoped cohort in `8.5 ms` (`dispatch_squad`), runs child shell commands through `RTK` (`v0.51.0`), caps every child handoff at `500` UTF-8 bytes (`Pointer-Over-Wire`), checks SHA-256 source and report digests in `20 ms` (`node mcp/handoffs.mjs verify`) alongside parent code inspection, and prunes loose specialist reports under an explicit teardown contract.
- **Antigravity `/teamwork` (`TypeName: "teamwork"`)** delegates an open-ended task through a wrapper agent, an internal orchestrator, exploratory workers, a dedicated report writer, and two semantic verification agents (`reviewer_1` and `auditor_1`).

We built a two-domain event-relay fixture (`fixture/gateway/`, `fixture/worker/`, and `fixture/config.json`) whose unit tests pass on mocked happy-path inputs while containing six `P1` and `P2` security, state-drift, data-loss, and cross-domain contract bugs.

## Recorded run summary (November 8, 2026)

In this recorded sequential audit on the six-defect fixture, both arms caught all six planted defect categories (`6 / 6`). **Agy-Squad + Agy-Context-Saver** finished in **`6m 15s` (`375s`) vs. `26m 19s` (`1,579s`, `4.2x` faster)**, spawned **`3` vs. `8` subagents**, executed **`64` vs. `645` transcript steps** (`90.1%` fewer steps), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` smaller), and sent **`1` wakeup (`249 B`) vs. `5` wakeups (`4,940 B`)** into the parent conversation (`95.0%` fewer parent bytes).

Full metric rows and unit definitions live in [docs/benchmarks.md](../../docs/benchmarks.md).

## Per-agent transcript breakdown

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

- **Environment:** WSL2 on Linux (`Node >= 22`, `Python >= 3.9`, authenticated `agy` CLI, `Agy-Context-Saver 1.8.1`, `RTK 0.51.0`).
- **Execution order:** Sequential runs on the same WSL2 host (Arm 1 Agy-Squad followed by Arm 2 `/teamwork` control) in separate conversation contexts with no shared state.
- **Task prompt and arm configuration:** Both arms received the same read-only audit objective:
  ```text
  Perform a read-only security, reliability, and cross-domain contract audit of benchmarks/teamwork-vs-squad/fixture (gateway/, worker/, and config.json). Identify all concrete defects with file/line evidence, severity (P1/P2), root cause, and remediation.
  ```
  Arm 1 dispatched from [`manifest.json`](manifest.json), which scopes one specialist to `gateway/` + `config.json` and a second specialist to `worker/` + `gateway.mjs` + `config.json`. Arm 2 ran native `/teamwork [skip-interview]` with the same objective and decomposed the task using its internal orchestrator.
- **Timing boundaries:** `activeWallClockSeconds` measures elapsed seconds from initial invocation to final completion receipt in the parent conversation. `timeToFirstDelegationSeconds` measures elapsed seconds from invocation to the first child specialist spawn.
- **Verification and teardown contract:** In Arm 1, the squad lead inspected the cited fixture lines, wrote its synthesis report, and ran `node mcp/handoffs.mjs bundle`, `verify` (`20 ms`, SHA-256 `418d7ccbade0a14a5b2e165b706adf45275e7b20604df1dfe03c41a012abc945`), and `prune` (`0` untracked Git files remaining; `.gitignore` excludes retained `scratch/` evidence until explicit teardown). In Arm 2, Teamwork ran two semantic review agents (`reviewer_1` and `auditor_1`) and left `41` untracked files (`207.9 KB`) in `.agents/teamwork/`.
- **Telemetry provenance and publication policy:** The `conversationId` UUIDs in [`results/telemetry.json`](results/telemetry.json) are local Antigravity conversation identifiers retained for audit traceability via `check_context_health`. Host-specific filesystem paths, OS usernames, environment credentials, and raw `.system_generated/` transcripts are excluded from repository artifacts.

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

To run a fresh live comparison on an authenticated WSL2 host with `Agy-Context-Saver 1.8.1+` (`HEALTHY & ACTIVE`):

1. Start from a clean checkout of `benchmarks/teamwork-vs-squad/fixture` and record your `agy --version`, model selection, and start/stop timestamps.
2. **Arm 1 (Agy-Squad):**
   > [!NOTE]
   > The recorded Nov 8, 2026 run launched Arm 1 through the Phase 1 `agy-squad run --launch` PTY launcher, which PR #5 retired (`L17`). The command below is the current equivalent. It is not the path that produced the recorded numbers, so a fresh run is a new measurement, not a replication.

   ```bash
   node bin/agy-squad.mjs plan --manifest benchmarks/teamwork-vs-squad/manifest.json \
     --squad ab_audit --mode subagent
   ```
   Give the compiled `Subagent` specs to Antigravity (`invoke_subagent`, or `dispatch_squad` over MCP). To run the same cohort on native `/swarm`, use `--mode swarm --model <id>` and let the coordinator issue the emitted `swarm add` calls. After the lead returns its `READY` receipt, fill in the emitted `bundleRecordTemplates`, run `node bin/agy-squad.mjs bundle <record.json>`, then `node bin/agy-squad.mjs verify scratch/agy-squad/squad-ab_audit/lead/report.sources.json`, and collect per-agent metrics via `check_context_health`.
3. **Arm 2 (Antigravity `/teamwork` control):** In a fresh Antigravity session on an identical clean checkout, invoke `/teamwork` (`[skip-interview]`) with the task prompt above, record completion time, and collect per-agent metrics via `check_context_health`.
4. Grade both arms' findings against the six-defect rubric (`N1` through `N6`) in `results/telemetry.json`.
