# dispatch_squad

`dispatch_squad` returns a JSON object with a native `Subagents` array. Each call compiles a single stage.

| Argument | Purpose |
| --- | --- |
| `squadId` | Required. Use `all_l1` for every squad lead or a squad ID for that squad's specialists. |
| `manifestPath` | Optional. A relative or absolute path inside the configured workspace. Symlinks must also resolve inside the workspace. |
| `manifest` | Managed runs only. An inline object with a `squads` map; mutually exclusive with `manifestPath`. |

The server uses `AGY_SQUAD_WORKSPACE` from its launch environment or its working directory. For CLI registration, set the environment variable to the absolute path of the intended workspace. With no explicit `manifestPath`, the server looks for `task-01-manifest.json`, `swarm-manifest.json`, `.scratch/swarm-manifest.json`, and `suite-manifest.json`, in that order, and uses the first valid squad manifest.

## Managed runs

The `agy-squad run` launcher gives its dispatcher a fresh run directory (`AGY_SQUAD_RUN_DIR`) in the selected workspace and gates tool visibility to the matching `AGY_SQUAD_SESSION` so neighboring CLI processes see an empty tool list. In that session, pass exactly one of `manifestPath` or `manifest`, an inline object with the shape below. The dispatcher saves the plan by content hash under the run directory and prepares unused report slots. Compiled leads reuse that snapshot to compile their own specialists (`all_l1` also validates every squad's specialists upfront). Use a fresh squad ID when retrying an assignment.

The returned native payload still contains only the five native brief fields on each member of `Subagents`, and the MCP response adds `structuredContent: { manifestPath }` pointing to the staged snapshot (`scratch/agy-squad/run-…/plan-…/manifest.json`). Managed slots use `scratch/agy-squad/run-…/plan-…/squad-…/<assignment>/report.md`. Compiled agents default to `self` so they can write evidence. A custom agent type needs access to its report slot and native messaging. A custom lead also needs access to the dispatcher and native launch. Agents share the selected workspace through `Workspace: "inherit"`. File ownership for concurrent work belongs in the assignments.

The managed dispatcher performs staging and compilation. The Antigravity session controls agent execution and approvals. The launcher removes its registration at session exit and keeps the staged evidence.

## Manifest

```json
{
  "squads": {
    "storage": {
      "lead": {
        "role": "Storage Lead",
        "objective": "Summarize the storage review",
        "scopeFiles": ["src/storage.js"]
      },
      "specialists": [
        {
          "role": "WAL Reviewer",
          "objective": "Review the write-ahead log",
          "scopeFiles": ["src/wal.js"]
        }
      ]
    }
  }
}
```

`children` is an alias for `specialists` (a squad cannot define both). A lead can also be specified directly on the squad object rather than under `lead` (a squad cannot mix `lead` with top-level lead fields, and `all_l1` is reserved for lead compilation and cannot be used as a squad ID in `squads`). Upfront compilation validates all squads and lead specs in the manifest (skipping redundant sibling recompilation when dispatching from an already-staged `plan-<hash>/manifest.json`). Each agent needs an objective and at least one workspace-relative scope file or directory (`"."` is allowed; absolute paths, `\` separators, `.` segments, `..` segments, and newlines are rejected). Optional fields include `role`, `instructions`, `expectedDeliverable`, `typeName`, `model`, and `workspace` (canonical camelCase fields also accept non-conflicting PascalCase aliases). The native `typeName` defaults to `self` for leads and specialists (`research` is rejected because it is read-only). `model` defaults to `inherit`, and `workspace` must be `inherit` so report slots stay in the shared workspace.

## Stages and Pointer-Over-Wire

1. The main agent compiles the leads with `all_l1`. An authorized lead compiles its specialists using its squad ID and the same manifest. Review the payload before native launch and pass each compiled object verbatim. Record the operator, shared workspace, acceptance criteria, report slots, and evidence checkpoint before launch. Record the native child IDs from the launch receipts.
2. Each subagent writes one evidence report at its assigned `scratch/agy-squad/squad-<encoded-id>/lead/report.md` or `specialist-N/report.md` slot in the shared workspace. Prepare unused slots before launch and use fresh squad IDs on retries. Include exact source locations and observed excerpts, or commands, working directories, relevant inputs, exit codes, and supporting output. Preserve contradictions and gaps.
3. Send one single-line native message of at most 500 UTF-8 bytes. Use `READY <report-path> — <concrete observation>`, `PARTIAL <report-path> — <observation and blocker>`, or `NO_REPORT — <reason>`. Match the native sender to the assigned slot, ignore exact duplicates, and investigate conflicts. The message is an evidence locator and a claim for review.
4. Yield for Reactive Wakeup. The operator checks `/agents` at the evidence checkpoint, even when no child sends a message. Use ten minutes by default, with a longer interval for work that needs it. Extend work with demonstrated progress, account for approval waits, and redirect or stop work that keeps returning the same result. Retrying after a transient failure, a change to inputs, or a distinct diagnostic is valid. Tool counts are telemetry unless the operator specifies a resource ceiling. Record agent termination and command cleanup separately.
5. After relevant writers finish or stop, the parent verifies material claims on the final inputs and records its own verdict and the versions or hashes checked. Recheck changed inputs. Preserve partial evidence and treat missing required verification as blocked. Apply the same standard when the primary reviews a lead.

File scope in a brief describes the assignment. Use the [WSL verification checklist](plans/wsl-cli-verification.md) to establish what the CLI actually enforces.

## Optional report cleanup

The benchmark presets stage a copy of `mcp/handoffs.mjs` at `.benchmark-bin/agy-squad-handoffs.mjs`. Run it with Node from the shared workspace root. Bundling and pruning support both unmanaged (`scratch/agy-squad/squad-…`) and managed (`scratch/agy-squad/run-…/plan-…/squad-…`) report layouts.

- `fingerprint <file...>` returns workspace-relative paths mapped to SHA-256. Capture hashes before and after independent checks on final work inputs.
- `inspect <record.json>` checks the recorded cohort against the native messages and readable reports. The record contains an absolute `workspace`, ordered `assignments` with `conversationId` and `report`, and `handoffs` with native `sender` and exact `message`.
- `bundle <record.json>` additionally requires `squadId`, the synthesizer's `verdict: "PASS"`, `verifiedFiles` containing the hashes of the final work inputs (excluding the squad's report and bundle slots), and an unambiguous `PASS` verdict recorded in the synthesis at the squad's `lead/report.md` slot after stripping fenced (` ``` ` / ` ~~~ `) and CommonMark inline backtick code spans (with no conflicting `FAIL` or `BLOCKED` verdict tokens; hyphenated prose such as `fail-safe` is ignored). The helper publishes `lead/report.sources.json` with the exact Markdown and hashes of the original reports.
- `verify <bundle.json>` checks the bundle, synthesis, final inputs, and any loose reports against their recorded hashes. After the primary independently accepts the result, record the returned bundle digest. `prune <bundle.json> <accepted-sha256>` removes only matching loose reports and can resume after partial cleanup. Run it after writers have stopped. Failed, blocked, changed, and shell-disabled runs keep their loose reports.
