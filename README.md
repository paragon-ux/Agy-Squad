# Agy-Squad

Sandboxed subagent squads for Google Antigravity on Windows.

> **Under construction, not installable.** Today Agy-Squad only builds subagent briefs and `invoke_subagent` payloads. Until the Docker sandbox and the spawn gate exist, those payloads would start unsandboxed subagents on your machine, so nothing registers Agy-Squad with Antigravity yet.

- **Docs:** <https://paragon-ux.github.io/agy-squad/> (Zensical; run `npm run docs` locally)
- **Design:** [docs/plans/docker-sandbox-plan.md](docs/plans/docker-sandbox-plan.md)
- **Decisions:** [docs/plans/LEDGER.md](docs/plans/LEDGER.md). Read it first.
- **Stopping agents and the panic command:** [docs/stopping-agents.md](docs/stopping-agents.md)

## Tools

| Tool | What it does |
|---|---|
| `subagent_brief` | Turns an objective and a file scope into a scope-isolated brief plus a ready-to-use `invoke_subagent` payload: single subagents, batches, and leads with pre-compiled children. |
| `dispatch_squad` | Reads a squad manifest and returns one stage at a time: the leads first, then each lead's specialists. |

Neither tool starts an agent.

## Development

```bash
npm test
```

The tests call the handlers and start only this MCP server, never an agent (ledger L7).

## Relation to Agy-Context-Saver

These tools moved out of [Agy-Context-Saver](https://github.com/paragon-ux/agy-context-saver) on 2026-10-15. That package stays focused on RTK command rewriting, lifecycle governance and transcript tools. The two will install side by side.

## License

MIT
