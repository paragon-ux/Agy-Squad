# Security Policy

## Supported releases

Security fixes target the latest `0.1.x` release series.

## Reporting a vulnerability

Do **not** report exploitable details in a public issue or pull request.

Use GitHub's **private vulnerability reporting** from this repository's Security tab. Include the affected version or commit, operating system, Node.js version, impact, minimal reproduction steps, and redacted logs. Never attach raw Antigravity transcript files or user credentials.

## Response targets

Maintainers aim to acknowledge reports within 7 calendar days and provide a status update within 14 calendar days.

## Security-sensitive areas

`Agy-Squad` compiles `/swarm` and `invoke_subagent` briefs, enforces workspace-relative path containment on report slots and `.sources.json` proof bundles, verifies SHA-256 `Evidence Digest` hashes, and registers the `agy-squad` MCP server and CLI shim in user-level Antigravity configuration files.
