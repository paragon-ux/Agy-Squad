# Agy-Squad

Agy-Squad compiles staged subagent payloads and Pointer-Over-Wire briefs for the Antigravity CLI on WSL. Use it alongside Agy-Context-Saver (`v1.8.1+`), which handles RTK command rewriting, Reactive Wakeup lifecycle governance, and session transcripts (`L31`).

Start with the [manifest and tool contract](tools.md), the [head-to-head Teamwork benchmark](benchmarks.md), and the [WSL CLI verification checklist](plans/wsl-cli-verification.md) before launching a live squad.

## Measured efficiency against Antigravity `/teamwork`

On an identical two-domain codebase audit with six planted `P1` and `P2` defects ([`benchmarks/teamwork-vs-squad/`](benchmarks.md)), both systems caught all six bugs (`100%` recall). **Agy-Squad + Agy-Context-Saver (`v1.8.1`)** finished in **`6m 15s` vs. `26m 19s`** (`4.2x` faster), used **`64` vs. `645` transcript steps** (`90.1%` reduction), generated **`148.2 KB` vs. `817.4 KB` of raw transcripts** (`81.9%` byte reduction), injected **`249 B` vs. `4,940 B` into the parent context** (`95.0%` reduction), verified SHA-256 report digests in **`20 ms`** with zero LLM verifier tokens, and left **`0` vs. `41` (`207.9 KB`) untracked workspace files**.

## Companion integration: Agy-Context-Saver

`Agy-Squad` and `Agy-Context-Saver` remain separate packages (`L31`) that link cleanly across four execution boundaries:

1. **Staged Compilation (`Agy-Squad`):** `dispatch_squad` compiles isolated workspace report slots (`scratch/agy-squad/...`) and `<= 500` UTF-8 byte Pointer-Over-Wire handoff contracts (`TypeName: "self"`, `Workspace: "inherit"`).
2. **Subagent Execution Governance (`Agy-Context-Saver`):** When `--launch` is active (or inside IDE sessions), `Agy-Context-Saver`'s PreToolUse hook transparently rewrites child `run_command` calls via pinned `RTK` (`v0.51.0`), routes workspace file reads to compact slices/`rtk read`, and enforces proportional backoff on `manage_task` and `schedule`. During shell-disabled payload review (`agy-squad run` without `--launch`), `bin/agy-squad.mjs` sets `inheritCustomizations: false` so read-only workspace inspection works without `run_command`, then enables `inheritCustomizations: true` (plus `schedule` and `call_mcp_tool`) on `--launch`.
3. **Cryptographic Bundling & Pruning (`Agy-Squad`):** `node mcp/handoffs.mjs` (`inspect -> bundle -> verify -> prune`) records SHA-256 digests of every specialist report and cited `verifiedFiles` in `report.sources.json` and removes loose specialist reports (`L41`), keeping raw child prose out of parent context.
4. **Session & Child Transcript Forensics (`Agy-Context-Saver`):** Lazy MCP tools (`get_installation_status`, `sync_installation`, `check_context_health`, `read_transcript`, `query_transcript`) audit parent or subagent `conversationId` telemetry without reading `.system_generated/` directly (`L6`). Run `sync_installation` once on a new WSL host so the pinned `rtk` binary is active before live dispatch.
