# WSL CLI verification

Use a disposable workspace with synthetic files. Keep configuration local to that workspace. Agy-Squad compiles payloads while Antigravity owns permissions and launch.

## Integration

- Register the exact Context-Saver 1.8.1 tarball and Squad's MCP server in `.agents/mcp_config.json` using absolute entry-point paths. Set `AGY_SQUAD_WORKSPACE` for Squad. Use `AGY_BRAIN_DIR` to point Context-Saver at the CLI's transcript root or a synthetic equivalent.
- Check both MCP registrations. Exercise Context-Saver's health and transcript tools and one PreToolUse decision. Exercise `dispatch_squad` at both stages and inspect the returned roles and report paths.
- Use a scripted model fixture for automated CLI tool calls. The fixture issues only the prescribed calls. The normal test suite starts only Node.js MCP processes.

## Required checks before live dispatch

- Enable `--sandbox` and prove a sandboxed shell command can read and write its own workspace. Use a sibling directory outside the workspace for denied read and write canaries. Verify the command ran inside the sandbox and lacked unsandboxed command grants.
- Check native file tools and MCP permissions separately. Verify that a specialist cannot read other conversations' transcripts or invoke an MCP tool that would expose them.
- Confirm the actual tool restrictions on lead and specialist presets. Verify them through tool behavior or the model request schema. A startup tool inventory alone is insufficient.
- Confirm the CLI can stop a bounded command and that the command leaves no process running. Keep the native `/agents` controls available.

If any required boundary fails, keep the workflow at payload compilation.

## Recorded checks

On WSL2 with Antigravity CLI 1.5.3, a loopback model fixture exercised the real CLI tool path. The fixture sent zero launch requests.

| Check | Result |
| --- | --- |
| Context-Saver 1.8.1 tarball | Release preflight and all ten suites passed. The tarball passed disposable install, status, and uninstall with the pinned RTK test shim. |
| Context-Saver through CLI | Health and transcript tools returned synthetic data with `AGY_BRAIN_DIR` set. The hook denied a direct read of protected state. |
| Squad through CLI | Lead and specialist stages returned their expected payloads. Both specialist presets wrote fixture reports over 1 KB. The lead preset read both pointers. |
| WSL shell sandbox | A command read and wrote its workspace with an explicit workspace write grant. Its outside read and write canaries failed. |
| Native permissions | File reads and writes outside the fixture were denied by policy. An explicit MCP deny blocked the transcript call. The trial specialist was denied a synthetic sibling transcript path and had no native launch, shell, or MCP-call tools. |
| Stopping | `manage_task` canceled the bounded command. Its heartbeat stopped and its process was gone. The live `/agents` panel showed all three trial agents as Killed after the user stopped them. |

## User-run trial

For the next authorized live trial, use a throwaway workspace with one lead and two specialists. Check that each specialist writes one evidence report and sends a concrete observation with its pointer. Verify that the lead checks the fixture sources independently. Exercise a child that repeats a call without progress, a silent child, and a child waiting for approval. Use the operator checkpoint to distinguish those cases and confirm agent and command termination separately.

The earlier supervised trial passed on November 7, 2026, under the original handoff contract. The lead launched one Alpha specialist and one Beta specialist. Both sent workspace-relative pointers. The lead read both files and returned PASS with both markers. The user stopped the lead and both specialists from `/agents`.

| File | Size | Verified evidence |
| --- | ---: | --- |
| `specialist-1.md` | 1,746 bytes | `ALPHA-271` |
| `specialist-2.md` | 1,668 bytes | `BETA-683` |
| `lead.md` | 3,162 bytes | Both report references and both markers |

The reports are under `scratch/agy-squad/squad-pow_trial/` in the disposable trial workspace.

On November 8, 2026, an operator-authorized 1-specialist live subagent check (`squadId: "live_pow_r2"`, child conversation `1e211e57-a046-4b5a-8fdf-46a2dcd8a083`) verified the revised report-slot hierarchy and `mcp/handoffs.mjs` CLI lifecycle end to end. The specialist (`TypeName: "self"`, `Workspace: "inherit"`) wrote `scratch/agy-squad/squad-live_pow_r2/specialist-1/report.md` (`4,897` bytes, SHA-256 `55ee7af4...`) and sent a single-line `READY` receipt (`272` UTF-8 bytes) via `send_message`, waking the parent via Reactive Wakeup. After independent verification (`fingerprint` on `mcp/briefs.mjs` and `mcp/handoffs.mjs`) and writing `scratch/agy-squad/squad-live_pow_r2/lead/report.md` (`Verdict: PASS`, `449` bytes), `node mcp/handoffs.mjs` passed `inspect`, `bundle` (`scratch/agy-squad/squad-live_pow_r2/lead/report.sources.json`, SHA-256 `9782972e...`), `verify`, and `prune`.

## Controlled head-to-head benchmark vs. Antigravity `/teamwork`

On November 8, 2026, a blinded, sequential A/B benchmark compared **`Agy-Squad` + `Agy-Context-Saver 1.8.1` (`rtk 0.51.0`)** against **Antigravity `/teamwork` (`TypeName: "teamwork"`, `[skip-interview]`)** on an identical 2-domain (`gateway/` + `worker/` + `config.json`) event-relay fixture containing `6` planted `P1`/`P2` security, state/clock drift, data-loss, retry, and cross-domain contract defects:

| Metric | `Agy-Squad` + `Agy-Context-Saver` (`ab_audit`) | Antigravity `/teamwork` (`[skip-interview]` Control) | Delta (`Agy-Squad` vs. `/teamwork`) |
| --- | ---: | ---: | --- |
| **Planted defect catch rate** | **`6 / 6` (`100%`)** | **`6 / 6` (`100%`)** | Parity on recall (`18` vs. `25` total findings) |
| **Active execution wall-clock time** | **`6m 15s` (`375s`)** | **`26m 19s` (`1,579s`)** | **`4.2x` faster (`-76.2%` wall-clock time)** |
| **Time to first specialist delegation** | **`59s`** (`8.5 ms` compile) | **`91s`** (internal startup phase) | **`1.5x` faster initial delegation** |
| **Total subagents spawned** | **`3`** (`1` Lead + `2` Specialists) | **`8`** (wrapper, orchestrator, 3 explorers, writer, reviewer, auditor) | **`2.7x` fewer subagents** |
| **Total transcript steps (`check_context_health`)** | **`64` steps** (`32 + 19 + 13`) | **`645` steps** (`66..129` across `8` agents) | **`10.1x` fewer steps (`-90.1%`)** |
| **Total assistant turns** | **`26` turns** (`11 + 9 + 6`) | **`321` turns** (`25..63` across `8` agents) | **`12.3x` fewer LLM turns (`-91.9%`)** |
| **Total tool calls** | **`32` calls** (`17 + 9 + 6`) | **`302` calls** (`24..57` across `8` agents) | **`9.4x` fewer tool calls (`-89.4%`)** |
| **Aggregate raw transcript footprint** | **`148.2 KB`** (`78.3 + 38.3 + 31.6 KB`) | **`817.4 KB`** (`59.0..186.2 KB` across `8` agents) | **`5.5x` smaller (`-81.9%` transcript bytes)** |
| **Parent wakeups & injected bytes** | **`1` wakeup / `249 B`** (`READY` receipt) | **`5` wakeups / `4,940 B`** (`4` Sentinel updates + final summary) | **`19.8x` fewer parent context bytes (`-95.0%`)** |
| **Verification mechanism** | Deterministic `handoffs.mjs verify` (`~20 ms`, SHA-256 `418d7ccb...`) | `2` LLM verifier subagents (`reviewer_1` + `auditor_1`, `~8m`, `218 KB`) | Zero-token cryptographic verification |
| **Post-run workspace hygiene** | **`0` untracked files** (`prune` + `--teardown`) | **`41` untracked files (`207.9 KB`)** left in `.agents/teamwork/` | Clean working tree (`L41`) |
