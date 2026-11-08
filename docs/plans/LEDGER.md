# Decision and work ledger

This ledger records the active Agy-Squad decisions. IDs shared with Agy-Context-Saver stay stable. The previous Docker plan and its decision history are in commit `ee10ebc`.

| ID | Decision | Status |
| --- | --- | --- |
| L1, L2 | Use host-enforced boundaries and structured permissions. Treat a brief's file scope as guidance. | Active |
| L3, L5 | Keep native stop controls available and verify that stopping work cleans up its commands. | WSL command and supervised stop checks passed |
| L4 | Avoid shared mutable runtime state in the system temporary directory. | Active |
| L6 | Enforce the boundary around other agents' transcripts. | Trial specialist denied a synthetic sibling transcript path |
| L7 | Automated tests launch zero real subagents. Any live trial is supervised and run separately by the user. | Active |
| L8, L9, L11, L35, L36, L38 | Use the Antigravity CLI on WSL for this rebuild. The Docker workspace and per-agent container design is retired. | Superseded by the user's WSL decision, 2026-11-07 |
| L16 | Retire the legacy shared-container canary. Keep its source in Git history. | Rebuild branch |
| L18–L20, L22–L24, L28, L37, L39 | Retire the Docker enforcement, collection, and cleanup mechanisms. Verify the native CLI boundaries and stopping behavior for the trial. | Rebuild branch, WSL trial checks passed |
| L21, L40 | Keep deny-by-default admission and keep credentials outside agent commands. Verify the native permissions before relying on them. | Active |
| L29 | Keep distribution private while verifying the native WSL boundaries. Use workspace-local registration for tests. | Active |
| L31 | Keep Context-Saver and Squad separate. Expose staged payload compilation through one public Squad tool, `dispatch_squad`. | Rebuild branch |

See the [WSL CLI verification checklist](wsl-cli-verification.md) for the launch gates.
