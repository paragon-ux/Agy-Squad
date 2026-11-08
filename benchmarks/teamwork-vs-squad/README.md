# Agy-Squad vs. Antigravity Teamwork benchmark

This directory contains the reproducible fixture, dispatch manifest, offline verification script, and recorded session telemetry for the November 8, 2026 head-to-head comparison between **Agy-Squad + Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** and **Antigravity `/teamwork` (`[skip-interview]` control)**.

## Why this benchmark exists

Both systems coordinate multi-agent work inside Antigravity, but they make different architectural bets:

- **Agy-Squad + Agy-Context-Saver** compiles a scoped cohort in `8.5 ms` (`dispatch_squad`), runs child shell commands through `RTK` (`v0.51.0`), caps every child handoff at `500` UTF-8 bytes (`Pointer-Over-Wire`), verifies SHA-256 source and report digests in `20 ms` (`node mcp/handoffs.mjs verify`), and prunes loose specialist reports (`L41`).
- **Antigravity `/teamwork` (`TypeName: "teamwork"`)** delegates an open-ended task through a wrapper agent, an internal orchestrator, exploratory workers, a dedicated report-writing worker, and two LLM verification agents (`reviewer_1` and `auditor_1`).

To test both on equal footing, we built a two-domain event-relay fixture (`fixture/gateway/`, `fixture/worker/`, and `fixture/config.json`) whose unit tests pass on mocked happy-path inputs while hiding six `P1` and `P2` security, state-drift, data-loss, and cross-domain contract bugs.

## Measured results (November 8, 2026)

Both arms ran sequentially on the same WSL2 host against the unmodified fixture and received the same read-only audit prompt and acceptance criteria. We collected transcript metrics from every spawned subagent using `agy-context-saver`'s `check_context_health` tool (`results/telemetry.json`).

| Metric | Agy-Squad + Agy-Context-Saver (`ab_audit`) | Antigravity `/teamwork` (`[skip-interview]`) | Measured difference |
| --- | ---: | ---: | --- |
| **Planted bugs caught (`N1` to `N6`)** | **`6 / 6` (`100%`)** | **`6 / 6` (`100%`)** | Equal recall (`18` vs. `25` total findings) |
| **Active wall-clock time** | **`6m 15s` (`375s`)** | **`26m 19s` (`1,579s`)** | **`4.2x` faster (`76.2%` less time)** |
| **Time to first specialist delegation** | **`59s`** (`8.5 ms` compile) | **`91s`** (internal startup phase) | **`1.5x` faster initial delegation** |
| **Subagents spawned** | **`3`** (`1` lead, `2` specialists) | **`8`** (wrapper, orchestrator, `3` explorers, writer, reviewer, auditor) | **`2.7x` fewer subagents** |
| **Total transcript steps** | **`64`** (`32 + 19 + 13`) | **`645`** (`66` to `129` across `8` agents) | **`10.1x` fewer steps (`90.1%` reduction)** |
| **Total assistant turns** | **`26`** (`11 + 9 + 6`) | **`321`** (`25` to `63` across `8` agents) | **`12.3x` fewer LLM turns (`91.9%` reduction)** |
| **Total tool calls** | **`32`** (`17 + 9 + 6`) | **`302`** (`24` to `57` across `8` agents) | **`9.4x` fewer tool calls (`89.4%` reduction)** |
| **Aggregate raw transcript size** | **`148.2 KB`** | **`817.4 KB`** | **`5.5x` smaller (`81.9%` byte reduction)** |
| **Parent wakeups and injected bytes** | **`1` wakeup (`249 B`)** | **`5` wakeups (`4,940 B`)** | **`19.8x` fewer parent context bytes (`95.0%` reduction)** |
| **Verification runtime and cost** | **`20 ms`** (`handoffs.mjs verify`, `0` LLM tokens) | **`~8m` across `2` LLM agents** (`218.6 KB` transcript) | Deterministic SHA-256 check (`418d7ccb...`) |
| **Leftover untracked workspace files** | **`0` files (`0 B`)** | **`41` files (`207.9 KB`)** in `.agents/teamwork/` | Clean working tree after teardown (`L41`) |

## Per-agent transcript breakdown

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

## The six planted defects in `fixture/`

Both happy-path test files (`fixture/gateway/test-gateway.mjs` and `fixture/worker/test-worker.mjs`) exit `0` because they test each module in isolation with happy-path inputs. Auditing the code across module boundaries exposes six defects:

1. **`N1` (`P1` security and crash DoS in `fixture/gateway/gateway.mjs:10`):** `verifyWebhookSignature` passes `actualBuf` and `expectedBuf` to `crypto.timingSafeEqual` without checking `actualBuf.length === expectedBuf.length`. Any truncated or odd-length hex signature throws an uncaught `RangeError` instead of returning `false`.
2. **`N2` (`P2` rate-limit starvation in `fixture/gateway/gateway.mjs:25`):** `createRateLimiter` overwrites `bucket.lastRefillMs = nowMs` on every request, even when `elapsedMs < refillIntervalMs` (`intervals === 0`). Steady traffic arriving faster than `1,000 ms` resets the refill clock on every call and never replenishes tokens.
3. **`N3` (`P1` cross-domain header mismatch in `fixture/gateway/gateway.mjs:40` vs. `fixture/worker/worker.mjs:4`):** `buildWorkerEnvelope` writes the idempotency token to `headers["x-idempotency-key"]`, while `processWorkerEnvelope` reads `headers["x-request-id"]`. The worker dead-letters `100%` of gateway envelopes with `MISSING_REQUEST_ID`.
4. **`N4` (`P1` cross-domain schema mismatch in `fixture/gateway/gateway.mjs:43` vs. `fixture/worker/worker.mjs:9`):** `buildWorkerEnvelope` emits `event.schemaVersion = "2.0"`, while `processWorkerEnvelope` rejects any schema version other than `"1.0"` with `UNSUPPORTED_SCHEMA`.
5. **`N5` (`P1` timestamp unit bug in `fixture/worker/worker.mjs:12` vs. `fixture/config.json:3`):** `processWorkerEnvelope` compares `Math.abs(nowMs - event.timestampMs)` in milliseconds directly against `config.maxSkewSeconds` (`300`) without multiplying by `1000`. That shrinks the configured 5-minute replay window to `300 ms`.
6. **`N6` (`P1` ledger data loss and off-by-one retry in `fixture/worker/ledger.mjs:9-21` and `fixture/worker/worker.mjs:16-28`):** `readLedger` catches corrupt JSON and returns `[]`, so the next `appendLedgerEntry` call overwrites the ledger file with a single-item array via non-atomic `fs.writeFileSync`. In addition, `processWorkerEnvelope` checks `attempt >= maxRetries` on a 1-based counter, performing zero retries when `config.retry.maxRetries` is `1`.

## Verify offline or reproduce live

Run the offline verifier from the repository root. It executes both happy-path fixture suites, reproduces all six planted bugs in-process, compiles both stages of `manifest.json` (`all_l1` and `ab_audit`), and checks the sums in `results/telemetry.json` without launching subagents (`L7`):

```bash
node benchmarks/teamwork-vs-squad/verify-benchmark.mjs
```

To run the live `Agy-Squad` cohort from the Antigravity CLI on WSL:

```bash
node bin/agy-squad.mjs run --manifest benchmarks/teamwork-vs-squad/manifest.json --squad all_l1 --launch
```
