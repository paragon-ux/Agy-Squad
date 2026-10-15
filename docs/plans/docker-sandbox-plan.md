# Docker sandbox for subagents: implementation plan

Status and decisions are in [LEDGER.md](LEDGER.md). This file holds the reasoning, the phases, and the verification gates. Item IDs: **P0–P5** for phases, **V1–V8** for verifications.

## 0. Where this work lives (L26, L27)

- **Agy-Context-Saver keeps what works:** the RTK hook, lifecycle governance and the transcript tools. It has no subagent tools at all.
- **Agy-Squad (this repo) holds everything about subagents:** `subagent_brief`, `dispatch_squad`, and from P1 on the Docker sandbox, its hook and its admission policy.
- **The two packages install side by side.** Antigravity's `hooks.json` keys hooks by plugin, so Agy-Squad registers its own PreToolUse hook next to Agy-Context-Saver's. V8 checks how Antigravity combines the decisions of two plugins' hooks.
- "The package" below means Agy-Squad. Its state lives in `%LOCALAPPDATA%\agy-squad\`.

## 1. Goal

Make agent teams usable in Antigravity on Windows without trusting any subagent.
- Every subagent runs its commands and edits inside its own Docker container.
- The host enforces that. The subagent can't opt out, and the main agent can't skip it by writing a different prompt.
- Subagents stay native Antigravity subagents (`invoke_subagent`). `manage_subagents` and Reactive Wakeup keep working.

## 2. Why Docker, and why volumes (evidence, 2026-10-15)

**Native jails were tried and ruled out:**
- **AppContainer:** git and npm fail. `NUL` grants no access to AppContainers, and named pipes are limited to `\pipe\LOCAL\`.
- **Restricted-token jail:** fast, but `node --test` and Git's bash fail. Test runners start child processes over pipes. The jail also has no network isolation.
- **Antigravity's own Windows sandbox:** needs Windows 11 24H2 with the August 2026 update.

**Benchmark** (Waymark repo, median times):

| Operation | Native | Docker bind mount | Docker volume |
|---|---|---|---|
| `npm ci` | 36.8 s | 189.5 s | 26.2 s |
| File walk (~5.6k files) | 1.0 s | 28.2 s | 0.5 s |
| `tsc` build | 7.0 s | 11.0 s | 5.9 s |
| `node --test` | 88.9 s | 220.7 s, **2 tests fail (timeouts)** | 34.6 s, all pass |
| Starting one command | 83 ms | 307 ms | 308 ms |

Bind mounts from `C:\` cross the bridge between Windows and the WSL2 VM, and on this repo that made two tests fail. Bind mounts also expose `.git/config` and `.git/hooks`. A sandboxed agent could plant `core.fsmonitor` or a hook there, and it would run on the host the next time someone uses git. **Volumes avoid both problems.** The cost: host-side tools can't see the work until it's brought back (§3.5).

## 3. Design

### 3.1 Trust boundary

| Party | Where it runs | Trust |
|---|---|---|
| User | Host | Trusted. Approves merges. |
| Main agent | Host by default, under the existing PreToolUse hooks. Sandboxing it is opt-in (L17): when enabled, its `run_command` goes to its own container. | Supervised. On the host it can do anything the user can, so the design never relies on it keeping a secret from itself. |
| Subagent | Native cascade. All execution and writes go to its own container. | Untrusted. Confined by schema stripping + hook denial + container. |
| Container | Docker Desktop (WSL2 backend) | Treated as a hostile process. No host mounts, no network, no Docker socket. |

### 3.2 Spawn gate

A subagent is sandboxed only if the host forces it, so the gate sits on `invoke_subagent` itself:
1. `dispatch_squad` / `subagent_brief` create the container and mint a binding: `sandbox id` plus an HMAC over (id, squad, role).
   - The HMAC key lives in Agy-Squad's per-user state folder `%LOCALAPPDATA%\agy-squad\`, never in `os.tmpdir()`.
2. Agy-Squad's PreToolUse hook matches `invoke_subagent` and `define_subagent`. It denies any call whose payload lacks a valid binding (a cryptographic check on a structured field, not a regex over a shell command). If V2 allows, it also forces the subagent type to the sandbox preset.
3. The sandbox preset strips host tools at the schema level: `enable_write_tools: false`, `enable_subagent_tools: false`, MCP tools on (V4).

### 3.3 Running a confined subagent

- **Identifying the subagent:** the hook knows the caller from `payload.conversationId`. On the first call from a new conversation, it reads the start of that conversation's transcript, finds the binding, verifies it, and caches the mapping from conversation to sandbox in the state directory.
- **Default deny:** for a bound conversation, the hook denies every tool not on a short allow-list (the sandbox MCP tools, `send_message`, and reading its own brief). Anything the preset failed to strip is still denied. This needs a matcher that covers every tool except `manage_subagents` (V6).
- **Sandbox tools:** a bound conversation runs commands and edits only through the sandbox MCP tools. Proposed shape: `sandbox_exec`, `sandbox_write`, `sandbox_edit` (open in the ledger).
  - The hook rewrites the sandbox argument to the caller's bound container (V5), so a subagent can't aim at another agent's container.
  - If MCP calls can't be hooked, the fallback is a per-agent capability token passed as an argument. Subagents can't read other agents' briefs or transcripts, so they can't learn another agent's token.
- **Unbound conversations** (the main agent) keep today's governance, unchanged.

### 3.4 Container spec

One container per subagent, created by the MCP server:

```text
docker run -d --init --name agy-<squad>-<role>-<n>
  --label agy.sandbox=1 --label agy.squad=<squad>
  --network none --cap-drop ALL --security-opt no-new-privileges
  --pids-limit 512 --memory 4g --cpus 2
  --read-only --tmpfs /tmp:rw,nosuid,size=1g --tmpfs /home/agent:rw,nosuid,size=256m
  --user agent -v agy-ws-<squad>-<role>-<n>:/workspace
  agy-sandbox:<version> sleep infinity
```

- **Image:** shipped in this repo (`sandbox/Dockerfile`), based on the existing swarm image (node 22 bookworm, python3, git, build-essential), plus a non-root `agent` user and the Linux `rtk` binary.
- **Never mounted:** host folders, the Docker socket, or anything under `~/.gemini`.
- **No network,** so `host.docker.internal`, the language server's ports and its CSRF token are unreachable.
- **Dependencies:** installed in a separate prepare step, with network on, running a fixed command from the manifest that agents can't change. The agent's container then starts without network.
- **Admission policy:** every flag above is the ceiling of the deny-all default role. Wider settings come only through §3.8.

### 3.5 Workspace in and results out

- **Seed:**
  1. On the host: `git bundle` of `HEAD`, plus `git stash create` for uncommitted changes.
  2. `docker cp` the bundle into the container, then clone it into the volume.
  - Untracked and ignored files are not copied. Dependencies are installed by the prepare step.
- **Return:**
  1. At finish, the MCP server commits the agent's work inside the container.
  2. It creates `git bundle <base>..HEAD`, runs `docker cp` to copy it out, and runs `git fetch` into the host branch `agy/<squad>/<role>`.
  - Fetching only copies git objects. No hooks or config come across.
  - The host working tree is never written. The user or the main agent reviews and merges.

### 3.6 Stopping agents

- **Normal stop (one agent or squad):** use `manage_subagents` or the Antigravity UI, which stay unblockable because no hook matches them. The MCP server then removes that squad's containers.
- **Panic (L24): one command kills every process the system spawned.**
  - **All containers** are removed by label (`docker rm -f`), which kills every process inside them in under a second.
  - **All host-side helpers** are killed too: prepare steps, `docker exec` clients, reapers. They run inside one Windows Job Object created with `KILL_ON_JOB_CLOSE`, so closing the job kills the whole tree, including anything a helper started.
  - Panic never waits on a hook, the language server or an agent.
- **Agents left without a container are inert:** their host tools are denied (§3.3) and their sandbox tools fail. They can only `send_message`. Panic leaves the conversations themselves alone (L28). To end every conversation, end the language server, as [Stopping Agents](../stopping-agents.md) explains.
- **Reaper:** idle and hard time limits per container. The MCP server's exit handlers remove that session's containers. The status check lists leftovers.

### 3.7 Fail closed

- Docker not running, image missing, or container creation failed → `dispatch_squad` refuses. It never falls back to host execution.
- Hook error on a bound conversation → deny. The one exception is `manage_subagents`, which the hook never sees.

### 3.8 Admission policy (L21, modeled on OpenClaw)

Access follows a policy the user configures. Agents and manifests can't widen it.

- **Default role: deny-all.** No network, no mounts beyond the workspace volume, and the minimum resources and tools.
- **Roles and ceilings live in user config** (`%LOCALAPPDATA%\agy-squad\policy.json`), never in the workspace or a manifest. Each role sets its maximum:
  - network (`none` / `registry` / `full`);
  - CPU, memory and process count;
  - run time;
  - the tool allow-list;
  - whether it may spawn children.
- **Manifests can only request.** A squad manifest names a role per agent and may ask for less than the ceiling. Asking for more is challenged.
- **Challenge, never silent grant.** Each of these needs the user's approval, through the hook's `force_ask`:
  - an unknown role;
  - a request above a ceiling;
  - a sandbox tool call from a conversation with no binding.
  An approval covers that one squad run unless the user saves it into the policy.
- **Pairing:** a conversation becomes bound only through the spawn gate (§3.2). Anything that shows up unpaired is treated as unknown.

## 4. Phases

Rule for every phase: **no automated test starts a real agent.** Live checks are manual, run by the user, with the kill command ready, and are never part of `npm test`.

### P0: Split the subagent tools out of Agy-Context-Saver (L15, L26)

1. **Save the work in progress.** The uncommitted subagent work was committed as it was to the local branch `wip/subagent-squad` in Agy-Context-Saver. It is never pushed or merged; it's only a record.
2. **Move the subagent tools here,** with direct mode left out:
   - `subagent_brief` with tiers, children and mandatory `scopeFiles`;
   - `dispatch_squad` (payload only);
   - their tests;
   - the canary test, parked in `tests/legacy/` until P2 rewrites it (L16).
3. **Remove every subagent tool and script from Agy-Context-Saver:**
   - the `subagent_brief` tool and its installer schema;
   - the subagent tests;
   - the subagent guidance in its rules, skill and docs.
   - Its installer retires `subagent_brief.json` and `dispatch_squad.json` from existing installs.
4. **Keep the general fixes in Agy-Context-Saver:** the `isEntryPoint` guard and the anti-orphan exit handlers.

**Exit criteria:**
- In Agy-Context-Saver, `rg "subagent_brief|dispatch_squad|direct-rpc|BypassSandbox"` finds only the retirement code, the changelog and the ledger;
- its installer and tests expect 5 tools;
- no test in either repo starts an agent or calls the language server;
- `npm test` passes in both repos.

### P1: Verify Antigravity's enforcement points (before building on them)

| ID | Question | How (zero agent spawns unless marked) |
|---|---|---|
| V1 | Does PreToolUse fire on `invoke_subagent` and `define_subagent`, and what is in the payload? | Hook in log-and-deny mode; ask the main agent to call it. Denied, so nothing spawns. |
| V2 | Can the hook overwrite `invoke_subagent` arguments (type, prompt)? | **Supervised, one spawn:** overwrite in a marker, with the subagent's tools all denied. |
| V3 | Do a subagent's tool calls reach the hook with its own `conversationId`, and does a deny hold? | Same supervised spawn as V2. |
| V4 | Does a preset with `enable_write_tools: false` really remove `run_command` and the write tools, and keep MCP tools? | Same supervised spawn; read its tool list from the transcript. |
| V5 | Do MCP tool calls go through PreToolUse, with arguments that can be overwritten? | Hook log on a main-agent MCP call. No spawn. |
| V6 | Matcher semantics (full regex? negative lookahead to exclude `manage_subagents`?), and what does Antigravity do when a hook times out or crashes? | Main agent only; a hook that sleeps or throws on a harmless tool. |
| V7 | Can the hook read the start of a subagent's transcript, and does the brief land there verbatim? | Same supervised spawn as V2. |
| V8 | With two plugins' PreToolUse hooks on one tool (Agy-Context-Saver's and Agy-Squad's), in what order do they run, and does a deny from either one win over an overwrite from the other? | Main agent only; two log-only hooks on a harmless tool, then one denies. No spawn. |

- **Exit criteria:** every V row has a recorded answer in the ledger. Wherever a V fails, the matching part of §3 is redesigned before P3.

### P2: Sandbox runtime (Docker only, no Antigravity)
- Write `sandbox/Dockerfile` and the module `mcp/sandbox.mjs`: create, seed, prepare, exec, collect, destroy, reap.
- All state lives in `%LOCALAPPDATA%\agy-squad\`.
- Rewrite the containment tests against real containers (port `verify-containment.ps1`). Each of these must fail from inside the container:
  - reaching a host path or the Docker socket;
  - any network, including `host.docker.internal`;
  - exceeding the pid/memory limits;
  - writing to the root filesystem.
- **Exit criteria:**
  - containment suite green;
  - kill by label takes under 1 s with a fork bomb running;
  - the reaper leaves 0 containers and 0 volumes after the MCP server exits.

### P3: Wire up enforcement
- Add the sandbox MCP tools.
- Hook changes:
  - gate `invoke_subagent` and `define_subagent`;
  - bind conversations to sandboxes;
  - default-deny for bound conversations;
  - rewrite the sandbox argument.
- `dispatch_squad` payload mode creates containers and emits payloads carrying the binding.
- Tests feed recorded hook payloads (from V1–V8) into the hook and MCP handlers. No live agents.
- **Exit criteria:**
  - a forged or missing binding is denied;
  - a bound conversation's `run_command`, `write_to_file` and `view_file` are denied;
  - an MCP call aimed at another sandbox is rewritten or denied;
  - `manage_subagents` never reaches the hook.

### P4: Return path
- Collect into `agy/<squad>/<role>` branches.
- Report the diff stat and the branch name to the main agent through the existing message path.
- **Exit criteria:** round trip on a throwaway repo; the host's `.git/config` and hooks are unchanged (checksum before and after).

### P5: Supervised live trial and release
- One squad (lead plus 2 leaves) on a throwaway copy of a real repo, with the user watching. Run a kill drill in the middle of a task.
- Then:
  - README and installer: Docker Desktop requirement, an image build step, the panic command;
  - a CHANGELOG entry.
- **Exit criteria:**
  - the trial finishes or is killed cleanly;
  - no host file outside the result branches changed;
  - the ledger is updated.
