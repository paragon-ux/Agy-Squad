# Native Enforcement Ledger

**Status:** Draft v0.1 (scoping ledger; no enforcement is implemented or verified by this document)
**Date:** 2026-11-13
**Origin:** PR #5 independent review residuals `PR5-ARCH-05`, `PR5-SCRIPT-02`, `PR5-ARCH-06` ([`docs/reviews/pr5-independent-review.md`](../reviews/pr5-independent-review.md))
**Supersedes (as a direction):** the retired Docker per-agent container and spawn-gate design (`docs/plans/LEDGER.md` L8–L12, L35, L36, L38; plan text at commit `ee10ebc`)

## 1. Purpose

Agy-Squad delegates orchestration to Antigravity (native `/swarm`, `invoke_subagent`). What remains the project's own job is **enforcement**: checks that run outside the governed agent's control and that fail closed. This ledger records each enforcement claim, the native mechanism that could provide it, and the pass/fail test that would verify it. It exists so that no enforcement claim is made in docs, skills or PRs before its test has passed.

### Principles

1. **Enforcement is mechanical.** A check counts only if a script or the host runs it and the governed agent cannot talk its way past it. A model's report is never the evidence.
2. **Fail closed.** A hook or policy that errors, times out or is absent must deny, or the claim is downgraded.
3. **A claim needs a falsifiable test.** Each row has a test that can fail. "The API exists" is not "the behavior holds".
4. **Do not claim propagation without a test.** Hooks and policies on a parent agent do not imply the same controls on subagents or swarm workers.
5. **The governed agent must not be able to edit its own guard.** If it can write the hook config, the policy file or the audit log, the row is not enforcement.

### Status taxonomy

| Status | Meaning |
|---|---|
| `Unverified` | Claimed or inferred; no test run |
| `API-verified` | The mechanism exists in installed software (introspected or observed), behavior not tested |
| `Observed` | Behavior observed once in a real session; no controlled test |
| `Verified` | Controlled pass/fail test passed and is reproducible (evidence linked) |
| `Rejected` | Tested or decided against; reason recorded |
| `Not supported` | The platform does not offer it as of the recorded version |

## 2. Evidence base (what is actually known)

| ID | Fact | How established | Confidence |
|---|---|---|---|
| V-01 | Antigravity `PreToolUse` hooks fire for `run_command`, `read_file`, `schedule`, `manage_task` and can **deny** (and rewrite) calls | Observed repeatedly in the PR #5 review sessions: denied `read_file`, rewrote `run_command` args via the Agy-Context-Saver hook | `Observed` (not a controlled test) |
| V-02 | The live global hook (`~/.gemini/config/hooks.json`) has a `PreToolUse` matcher limited to `manage_task\|schedule\|run_command\|view_file\|read_file\|read_many_files\|grep_search\|find_by_name\|list_dir\|replace_file_content\|write_to_file`. It does **not** match `swarm`, `post_message`, `read_board` or `invoke_subagent` | Read from `hooks.json` | Verified by inspection |
| V-03 | `google-antigravity` SDK v0.1.23 installs from PyPI (pre-1.0) | Installed into `scratch/sdk_pkgs` (gitignored) | Verified |
| V-04 | `LocalAgentConfig` accepts `policies`, `hooks`, `triggers`, `mcp_servers`, `subagents`, `workspaces`, `env`, `budget_config`, `retry_config`, `model`/`models`, `api_key`, `vertex`, `conversation_id` | Introspected signature | `API-verified` |
| V-05 | `CapabilitiesConfig` includes `enable_subagents`, `allowed_subagents`, `max_subagent_depth`, `enabled_tools`, `disabled_tools`, `run_command_config`, MCP options | Introspected fields | `API-verified` |
| V-06 | `BudgetConfig` has `max_model_calls`, `max_tool_calls`, `max_input_tokens`, `max_output_tokens`, `max_total_tokens`, `scope` | Introspected fields | `API-verified` |
| V-07 | Hook types: `PreToolCallDecideHook`, `PostToolCallHook`, `PreTurnHook`, `PostTurnHook`, `StopHook`, `OnToolErrorHook`, `OnSessionStartHook`/`OnSessionEndHook`, `OnInteractionHook`, `OnCompactionHook`. Policy helpers: `allow`, `deny`, `ask_user`, `allow_all`, `deny_all`, `workspace_only`, `safe_defaults`, `confirm_run_command`. `Decision` = `APPROVE`/`ASK_USER`/`DENY`. `HookContext` carries a `parent` | Introspected exports | `API-verified` |
| V-08 | `BuiltinTools` includes `INVOKE_SUBAGENT`; **no reference to "swarm" exists anywhere in the SDK Python sources** (`grep -rnI swarm` returns empty; raw binary `bin/localharness` matches the byte string `"swarm"`) | `grep -rnI swarm` over installed package | Verified for v0.1.23 |
| V-09 | `Agent` exposes `chat`, `conversation`, `conversation_id`, `sandbox_status`, `is_started`, `beta` | Introspected | `API-verified` |
| V-10 | Native swarm: `swarm{action:"status"}` lists each worker's state and model; `add` refuses a model whose quota is exhausted; `kill` deletes a worker's workspace | Local swarm skill and `swarm` tool description | Documented, not tested |
| W-01 | (Web, secondary sources) tool calls inside spawned subagents may bypass workspace-level hooks unless registered globally or via plugin; blocking a spawn tool with `PreToolUse` may not stop the spawn under some runtime flags (e.g. `--dangerously-skip-permissions`); `PostToolUse` cannot block | One search summary; redirect-only citations | **Unverified. Treat as a risk to test, not a fact.** |

## 3. Two enforcement planes

The SDK has no swarm support (V-08). That splits enforcement into two planes that do not share a mechanism:

| | **Plane A: SDK-hosted agents** | **Plane B: Native app/CLI (`/swarm`, `invoke_subagent`)** |
|---|---|---|
| Control surface | Typed `policies`, `hooks`, `budget_config`, `capabilities`, per-agent `mcp_servers` | `hooks.json` (global or `<repo>/.agents/hooks.json`), swarm tool surface, host permissions |
| Strength | Strong and testable in code | Weaker: matcher-based, propagation to workers unverified (W-01), live hook does not match swarm tools (V-02) |
| UI / board / @mentions | None (no swarm integration, V-08) | Native Swarm UI, board, graph |
| Lateral communication | None by construction (each `Agent` is isolated) | Shared board; restriction is a convention unless a hook denies `post_message` |
| Best use | Contention experiments, CI verification, controlled benchmarks | Interactive multi-agent work where users need the UI to manage and steer |

**Consequence:** one design cannot provide both strong typed enforcement and the native Swarm UI today. Rows below name their plane. Choosing a plane per use case is a design decision, not a defect.

## 4. Ledger

Threat sources: PR #3 evidence (model deleted `FAIL` to evade the verdict parser; `E14`/`E15`), `PR5-ARCH-05` (handoff authorship unattested), `PR5-SCRIPT-02` (health gate trusts the author's ledger), `PR5-ARCH-06` (spawn gate / default-deny), flash-class models gaming benchmarks.

| ID | Claim / threat | Plane | Native mechanism | Status | Verification test (must be able to fail) | Blockers / risks | Links |
|---|---|---|---|---|---|---|---|
| **NE-01** | Spawn gate: only planned workers may spawn; depth and count bounded | A | `CapabilitiesConfig.allowed_subagents`, `max_subagent_depth`, `enable_subagents=False`; `PreToolCallDecideHook` on `INVOKE_SUBAGENT` comparing the call to a plan hash | `API-verified` | An agent instructed to spawn an unlisted subagent and to exceed the depth gets `DENY`; the spawn does not occur; the denial is logged | Needs credentials (NE-12) | PR5-ARCH-06 |
| NE-01b | Same, native app/CLI | B | `PreToolUse` hook matching the spawn tools (`invoke_subagent`, `swarm`) | `Unverified` | With a disposable hook that denies `invoke_subagent`, a spawn request is blocked and no child conversation appears | V-02: live matcher excludes these tools; W-01: bypass risk | PR5-ARCH-06 |
| **NE-02** | Default-deny tool profile per agent (your own tool profile, per worker) | A | `policies=[deny_all(), allow(...)]`, `capabilities.enabled_tools`, per-agent `mcp_servers` | `API-verified` | Two agents with different profiles each list only their own tools; a call to a non-granted tool is denied | NE-12 | PR5-ARCH-04 |
| **NE-03** | Protected paths: oracle, tests and fixtures cannot be modified by workers | A (primary), B | `DecideHook` on `EDIT_FILE`/`CREATE_FILE`/`RUN_COMMAND` args against a pinned set; post-run SHA-256 verify (existing `agy-squad fingerprint`/`verify`) | `Unverified` (hash verify exists; gating does not) | A worker told to weaken a test is denied, or the post-run hash mismatch is detected and `verify` fails | Shell indirection (`run_command` writing files) must be covered | E14/E15 gaming |
| **NE-04** | Handoff attestation: who produced which report is recorded outside the model's control | A, B | `PostToolCallHook` appends `(agent id, tool, args hash, result hash, timestamp)` to a log the agent cannot write; bundle consumes the log instead of a hand-assembled `handoffs` list. Plane B: `PostToolUse` on `post_message` | A: `API-verified`; B: `Unverified` | Forge a handoff in the record; `verify` rejects it because the log has no matching entry | B: whether payload exposes member identity; log must be outside agent-writable paths (NE-09) | PR5-ARCH-05 |
| **NE-05** | Model pinning is verified, not assumed | A, B | A: `model`/`models` (`ModelTarget`) plus readback; B: `swarm{action:"status"}` compared to the plan | `Unverified` | Request a pinned model; assert the readback equals it; request a typo and assert rejection | Whether SDK exposes the resolved model per call; swarm `status` shape unseen | PR5-MCP-01 |
| **NE-06** | Budget / panic stop | A, B | A: `BudgetConfig.max_*`, `scope`; B: `manage_subagents kill_all`, swarm `kill`, quota refusal on `add` | A: `API-verified`; B: tool surface exists | Set a tiny `max_tool_calls`; the agent stops (or raises) at the limit; document which | Behavior at limit unknown (stop vs raise vs soft warning) | PR5-ARCH-06 |
| **NE-07** | No lateral communication in contention arms | A (by construction), B | A: isolated `Agent` instances; B: `PreToolUse` deny on `post_message` for worker members; channels | A: `API-verified`; B: `Unverified` | B: a worker attempts to post; it is denied; a control run without the hook posts | Hook must identify the caller as a worker; V-02 | concurrency protocol |
| **NE-08** | Review/health gate is independent of the change's author | In-repo (not native) | `diagnose.mjs` requires a ledger from a different conversation or a commit not written by the author; `conversation_id` as identity | `Unverified` | Add an author-written ledger newer than the independent one; the gate must still target the independent one or fail | Needs an identity convention for ledgers | PR5-SCRIPT-02 |
| **NE-09** | The governed agent cannot edit its own guard (hook config, policy files, audit log) | A, B | Host/file permissions; hook config and log outside agent-writable roots; `workspace_only` policy | `Unverified` | On a **disposable copy** of the config, an agent told to disable the hook fails to; the live `hooks.json` must never be used for this test | Precondition for NE-01..NE-07 being enforcement at all | all |
| **NE-10** | Hooks and policies propagate to subagents and swarm workers | A, B | A: `HookContext.parent`; B: global `hooks.json`, plugin hooks | `Unverified` | A child agent's tool call hits the parent's deny hook; for B, a worker's `run_command` hits a marker hook | W-01 reports gaps; V-02 | all |
| NE-11 | SDK-hosted agents appear in the native Swarm UI / board | n/a | None found | `Not supported` (v0.1.23, V-08) | Re-check on SDK upgrades: `grep -rnI swarm` over the package | Pre-1.0 API | direction |
| NE-12 | SDK agents can run on the maintainer's existing subscriptions | A | `api_key` / `vertex` / `project` / `location` config; unknown whether subscription auth is supported | `Unverified` | Spawn one read-only `Agent` and complete one `chat()` call | **Blocks every Plane A behavioral test.** Credentials are an owner decision | all Plane A rows |

## 5. Verification plan (ordered; each spike produces evidence linked back to its row)

| Step | Spike | Rows | Needs |
|---|---|---|---|
| S0 | Decide credentials for the SDK (API key / Vertex / existing auth) | NE-12 | Owner |
| S1 | One read-only `Agent`, `deny_all()` plus one `allow`, a `PreToolCallDecideHook` that logs and denies a marked call | NE-02, NE-10 (parent hook) | S0 |
| S2 | `SubagentConfig` child with a restricted profile; parent hook; assert child tool calls reach the parent's hook | NE-01, NE-10 | S1 |
| S3 | `BudgetConfig` with tiny limits; record behavior at the limit | NE-06 | S1 |
| S4 | `PostToolCallHook` writing to a path outside the agent's `workspaces`; forge a handoff and run `verify` | NE-04, NE-09 | S1 |
| S5 | First verify hook discovery (`<repo>/.agents/hooks.json` vs plugin/global hooks) using a benign marker on `run_command`; then test marker `PreToolUse` on `invoke_subagent` and `post_message` across native subagents and swarm workers | NE-01b, NE-04 (B), NE-07 (B), NE-10 (B) | App session; no live-config edits |
| S6 | Pinned-model readback via SDK response metadata and `swarm status` | NE-05 | S0 (A), swarm run (B) |
| S7 | `diagnose.mjs` independent-ledger rule | NE-08 | In-repo change |

S5 must not edit or probe the live `~/.gemini/config/hooks.json`. First establish whether Antigravity loads repo-scoped `.agents/hooks.json` at all so a silently ignored file is not mistaken for hook bypass.

## 6. Closure criteria

- A row moves to `Verified` only with a committed test or a transcript hash and the exact command, plus the date and the SDK/Antigravity version.
- A row cannot be cited in README, skills or PR descriptions as an enforced guarantee until it is `Verified`. `API-verified` may be cited only as "the platform provides X".
- PR #5 residuals close like this: `PR5-ARCH-05` ← NE-04 `Verified`; `PR5-SCRIPT-02` ← NE-08 `Verified`; `PR5-ARCH-06` ← NE-01/NE-02/NE-06 `Verified` on at least one plane.

## 7. Out of scope and rejected

- Docker per-agent containers and the PTY launcher (retired; `L8–L12`, `L17`, `L35`, `L36`, `L38`).
- Competing with native orchestration (dispatch, board, UI): this ledger covers enforcement only.
- Any test that disables or probes a live control (the live `hooks.json`, the live Agy-Context-Saver hook, host permissions). Controls are tested on disposable copies only.

## 8. Reproduction (evidence for V-03 to V-09)

```bash
~/.local/share/patchdiff-runtime/venv/bin/pip install --target scratch/sdk_pkgs google-antigravity
PYTHONPATH=scratch/sdk_pkgs ~/.local/share/patchdiff-runtime/venv/bin/python - <<'EOF'
import inspect, google.antigravity as ag
import google.antigravity.types as t
import google.antigravity.hooks as h
print(inspect.signature(ag.LocalAgentConfig))
print(list(t.CapabilitiesConfig.model_fields.keys()))
print(list(t.BudgetConfig.model_fields.keys()))
print([x for x in dir(h) if x.endswith("Hook")])
EOF
grep -rnI swarm scratch/sdk_pkgs/google/antigravity   # expect: no output (V-08)
```

The system Python on the review host (3.14, Debian) has no `ensurepip`, so `python3 -m venv` fails. `--target` into the gitignored `scratch/` avoids touching system packages.
