# Stopping Agents

There are three ways to stop agents, from narrowest to broadest.

| What you want | How | What keeps running |
|---|---|---|
| Stop one agent or squad | `manage_subagents`, or Antigravity's agent controls | Everything else |
| Stop every sandboxed subagent at once | The **panic** command *(planned, see below)* | The main agent and the language server. Subagent conversations stay open but can't act. |
| End **every** agent conversation, including the main agent | End the language server (below) | Nothing. All conversations stop. |

## Stop one agent: `manage_subagents`

`manage_subagents` is Antigravity's own control, and it stays unblockable. No hook from Agy-Squad or Agy-Context-Saver ever matches it (ledger L3).

## Panic: kill everything the sandbox spawned

!!! warning "Planned, not built yet"
    The panic command arrives with the sandbox runtime (plan phase P2). Until then, Agy-Squad starts no containers or processes.

Panic is not a normal stop. It kills **every process the system spawned**, at once and without asking (ledger L24):

- **every container**, removed by label (`docker rm -f`), which kills everything running inside it;
- **every host-side helper** (prepare steps, `docker exec` clients, reapers). These run inside one Windows Job Object, so the whole process tree dies together.

Panic never waits on a hook, the language server or an agent.

Panic doesn't end subagent conversations, because they live inside the language server, not as processes Windows can kill. After a panic they are **inert**: their sandbox tools fail and their host tools are denied, so the most they can do is send a message (ledger L28). To end the conversations too, end the language server.

## End the language server

Ending the language server stops **every** conversation, including the main agent. Do it when you want everything gone, not just the subagents.

=== "Antigravity desktop app"

    The desktop app (2.11) has no menu command for this. Run this in PowerShell:

    ```powershell
    Get-Process language_server* | Where-Object { $_.Path -like '*antigravity*' } | Stop-Process -Force
    ```

    The `Path` filter matters: other editors (Windsurf, for example) ship a process with the same name. Antigravity starts a new language server the next time you open a conversation.

=== "Antigravity IDE"

    Open the Command Palette (++ctrl+shift+p++) and run one of:

    - **Kill Language Server and Reload Window** (`antigravity.killLanguageServerAndReloadWindow`): ends it immediately.
    - **Restart Language Server** (`antigravity.restartLanguageServer`): ends it and starts a fresh one.

    Neither has a default shortcut. To bind one, open **Preferences: Open Keyboard Shortcuts (JSON)** and add:

    ```json
    { "key": "ctrl+alt+shift+k", "command": "antigravity.killLanguageServerAndReloadWindow" }
    ```

    The PowerShell command from the desktop tab works here too.
