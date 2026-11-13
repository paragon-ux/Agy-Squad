# Stopping agents

Use the Antigravity CLI's `/agents` panel to monitor and stop subagents. The native `manage_subagents` tool also supports listing and stopping subagents. Keep those controls available during a supervised trial.

Verify that stopping an agent also stops any command it started. A disposable workspace and a bounded test command make cleanup observable. Record agent and command cleanup separately in the [verification checklist](plans/wsl-cli-verification.md).

Record an evidence checkpoint with the operator before launch. Reactive Wakeup delivers a message when a child sends one. At the checkpoint, the operator checks `/agents` for silent children, approvals, and repeated activity. An active parent may stop its own children using the IDs from the native launch receipts. Preserve partial evidence and confirm whether commands stopped.
