# Decision and work ledger

This ledger records the active Agy-Squad decisions. IDs shared with Agy-Context-Saver stay stable (`L13–L15, L25–L27, L32–L34` are allocated in the Agy-Context-Saver ledger). The previous Docker plan and its decision history are in commit `ee10ebc`.

| ID | Decision | Status |
| --- | --- | --- |
| L1, L2 | Use host-enforced boundaries and structured permissions. Under WSL `Workspace: "inherit"`, host permissions confine access to the workspace and protect session registrations and staged manifests, while intra-workspace file scope and sibling report slots are verified through receipts and SHA-256 hashes (`mcp/handoffs.mjs`). | Active |
| L3, L5 | Keep native stop controls available and verify that stopping work cleans up its commands. | Active |
| L4 | Avoid shared mutable runtime state in the system temporary directory. | Active |
| L6 | Enforce the boundary around other agents' transcripts. | Active |
| L7 | Automated tests launch zero real subagents. Any live trial is supervised and run separately by the user. | Active |
| L8–L12, L35, L36, L38 | Use the Antigravity CLI on WSL for this rebuild. The Windows native-jail, Windows 24H2 terminal-sandbox, and Docker workspace/per-agent container designs are retired. | Superseded by the user's WSL decision, 2026-11-07 |
| L16 | Retire the legacy shared-container canary. Keep its source in Git history. | Rebuild branch |
| L17 | Run the legacy managed CLI session under `--sandbox` on WSL (`bin/agy-squad.mjs run`), with write and launch tools omitted during payload review. | Deprecated in favor of `L42` (retained for PR #1/#3 compatibility) |
| L18–L20, L22–L24, L28, L37, L39 | Retire the Docker enforcement, collection, and cleanup mechanisms. Verify the native CLI boundaries and stopping behavior for the trial. | Rebuild branch, WSL trial checks passed |
| L21, L40 | Keep deny-by-default admission and keep credentials outside agent commands. Verify the native permissions before relying on them. | Active |
| L29 | Keep distribution private while verifying the native WSL boundaries. Use workspace-local registration for tests. | Active |
| L30 | Publish documentation as a Zensical site (`zensical.toml`, `.github/workflows/docs.yml`). | Active |
| L31 | Keep Context-Saver and Squad separate. Expose staged payload compilation through one public Squad tool, `dispatch_squad`. | Active |
| L41 | Keep self-diagnosis directories and canary runs under workspace-local `scratch/agy-squad/` (`L4`) and tear them down deterministically after verification (`diagnose.mjs --teardown` and `try/finally` canary cleanup), removing empty parent `scratch/agy-squad` and `scratch` directories so no stale report slots or dirty working-tree artifacts remain. | Active |
| L42 | Pivot execution to Antigravity native `/swarm` (`swarm-governance`), retaining Agy-Squad as the governance, strict single-line verdict (`mcp/verdicts.mjs`), flat `integrity_auditor`, and offline SHA-256 verification CLI (`bin/agy-squad.mjs fingerprint|inspect|bundle|verify|prune|verdict`). | Active |

See the [WSL CLI verification checklist](wsl-cli-verification.md) for the launch gates.
