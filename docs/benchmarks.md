# Benchmarks: Agy-Squad vs. Antigravity Teamwork

We benchmarked **Agy-Squad + Agy-Context-Saver 1.8.1 (`rtk 0.51.0`)** head-to-head against **Antigravity `/teamwork` (`[skip-interview]` control)** on an identical two-domain codebase audit (`benchmarks/teamwork-vs-squad/`).

## Headline comparison

Both arms caught all six planted `P1` and `P2` defects (`100%` recall). Agy-Squad + Agy-Context-Saver finished **`4.2x` faster**, used **`10.1x` fewer transcript steps**, generated **`81.9%` fewer transcript bytes**, injected **`95.0%` fewer bytes into the parent context**, and left **`0` untracked workspace files**.

| Metric | Agy-Squad + Agy-Context-Saver (`ab_audit`) | Antigravity `/teamwork` (`[skip-interview]`) | Improvement with Agy-Squad |
| --- | ---: | ---: | --- |
| **Planted defects caught** | **`6 / 6` (`100%`)** | **`6 / 6` (`100%`)** | Equal recall (`18` vs. `25` findings) |
| **Active wall-clock time** | **`6m 15s` (`375s`)** | **`26m 19s` (`1,579s`)** | **`4.2x` faster (`76.2%` time saved)** |
| **Time to first specialist delegation** | **`59s`** (`8.5 ms` compile) | **`91s`** (startup phase) | **`1.5x` faster initial delegation** |
| **Subagents spawned** | **`3`** (`1` lead, `2` specialists) | **`8`** (`teamwork` fleet) | **`2.7x` fewer subagents** |
| **Total transcript steps (`check_context_health`)** | **`64`** (`32 + 19 + 13`) | **`645`** (`66` to `129` across `8` agents) | **`10.1x` fewer steps (`90.1%` reduction)** |
| **Total assistant LLM turns** | **`26`** (`11 + 9 + 6`) | **`321`** (`25` to `63` across `8` agents) | **`12.3x` fewer turns (`91.9%` reduction)** |
| **Total tool calls** | **`32`** (`17 + 9 + 6`) | **`302`** (`24` to `57` across `8` agents) | **`9.4x` fewer tool calls (`89.4%` reduction)** |
| **Aggregate raw transcript size** | **`148.2 KB`** | **`817.4 KB`** | **`5.5x` smaller (`81.9%` byte reduction)** |
| **Parent wakeups and injected bytes** | **`1` wakeup (`249 B`)** | **`5` wakeups (`4,940 B`)** | **`19.8x` fewer parent bytes (`95.0%` reduction)** |
| **Verification runtime and cost** | **`20 ms`** (`handoffs.mjs verify`, `0` LLM tokens) | **`~8m` across `2` LLM agents** (`218.6 KB` transcript) | Deterministic SHA-256 verification |
| **Post-run untracked files** | **`0` files (`0 B`)** | **`41` files (`207.9 KB`)** in `.agents/teamwork/` | Clean working tree (`L41`) |

## Why the efficiency gap is structural

1. **Proportional topology (`3` agents vs. `8`):** For a two-domain audit (`gateway/` and `worker/`), `Agy-Squad` dispatches one squad lead and two domain specialists. `/teamwork` spawns a wrapper agent, an internal orchestrator, three exploratory agents, a dedicated report writer (`worker_report_1`), a reviewer (`reviewer_1`), and a forensic auditor (`auditor_1`).
2. **Deterministic SHA-256 verification (`20 ms`) vs. LLM verifier fleet (`~8m`):** After writing its synthesis, the `Agy-Squad` lead runs `node mcp/handoffs.mjs bundle`, `verify`, and `prune`. That checks SHA-256 digests of every source file and specialist report in `20 ms` (`418d7ccbade0a14a5b2e165b706adf45275e7b20604df1dfe03c41a012abc945`) with zero extra LLM turns. `/teamwork` spawns two additional LLM subagents (`reviewer_1` and `auditor_1`) that consume `174` steps and `228.6 KB` of transcript to check the report.
3. **Single-line `Pointer-Over-Wire` receipt (`249 B`) vs. five parent wakeups (`4,940 B`):** `Agy-Squad` keeps intermediate coordination inside the squad and wakes the parent conversation once with a `249`-byte `READY` receipt. `/teamwork` interrupts the parent conversation four times with intermediate Sentinel progress updates before sending a `3,218`-byte completion message.
4. **RTK command compression and workspace hygiene (`L41`):** With `Agy-Context-Saver 1.8.1` (`rtk 0.51.0`) active, `Agy-Squad` specialists read scoped files through `rtk read` and prune loose specialist reports before teardown. `/teamwork` leaves `41` untracked orchestration files (`207.9 KB`) inside `.agents/teamwork/`.

## Benchmark fixture and six planted bugs

The fixture in `benchmarks/teamwork-vs-squad/fixture/` models a two-stage webhook relay (`gateway/gateway.mjs` and `worker/worker.mjs` + `worker/ledger.mjs`). Its unit tests (`test-gateway.mjs` and `test-worker.mjs`) pass in isolation while leaving six real defects across module boundaries:

| ID | Priority | Location | Defect summary | Caught by Agy-Squad | Caught by `/teamwork` |
| --- | --- | --- | --- | :---: | :---: |
| `N1` | `P1` | `gateway/gateway.mjs:10` | `crypto.timingSafeEqual` called without buffer length check, throwing uncaught `RangeError` on short or odd-length hex signatures | Yes (`SYN-01`) | Yes (`SEC-01`) |
| `N2` | `P2` | `gateway/gateway.mjs:25` | `createRateLimiter` resets `bucket.lastRefillMs = nowMs` when `intervals === 0`, starving token refills under sub-interval traffic | Yes (`SYN-04`) | Yes (`CLK-02`) |
| `N3` | `P1` | `gateway/gateway.mjs:40` vs. `worker/worker.mjs:4` | Gateway emits `headers["x-idempotency-key"]` while worker requires `headers["x-request-id"]`, dead-lettering `100%` of events | Yes (`SYN-02`) | Yes (`CTR-01`) |
| `N4` | `P1` | `gateway/gateway.mjs:43` vs. `worker/worker.mjs:9` | Gateway emits `schemaVersion: "2.0"` while worker rejects anything other than `"1.0"` | Yes (`SYN-03`) | Yes (`CTR-02`) |
| `N5` | `P1` | `worker/worker.mjs:12` vs. `config.json:3` | Worker compares millisecond age directly against `maxSkewSeconds` (`300`), shrinking a 5-minute window to `300 ms` | Yes (`SYN-05`) | Yes (`CLK-01`) |
| `N6` | `P1` | `worker/ledger.mjs:9-21`, `worker/worker.mjs:16-28` | `readLedger` returns `[]` on corrupt JSON (wiping history on next non-atomic `writeFileSync`), and `attempt >= maxRetries` runs `0` retries when `maxRetries = 1` | Yes (`SYN-06..09`) | Yes (`DAT-01..02`, `RTY-03`) |

## Run the offline verification check

The benchmark folder includes a zero-subagent verification script (`L7`) that runs the fixture tests, reproduces all six defects in-process, compiles both stages of `benchmarks/teamwork-vs-squad/manifest.json`, and checks every sum in `benchmarks/teamwork-vs-squad/results/telemetry.json`:

```bash
node benchmarks/teamwork-vs-squad/verify-benchmark.mjs
```
