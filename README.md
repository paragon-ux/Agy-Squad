# Agy-Squad

[![npm version](https://img.shields.io/npm/v/agy-squad.svg)](https://www.npmjs.com/package/agy-squad)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-Zensical-purple.svg)](https://paragon-ux.github.io/Agy-Squad/)
[![Tests](https://img.shields.io/badge/tests-100%25%20passing-brightgreen.svg)](https://github.com/paragon-ux/Agy-Squad/actions)

![Agy-Squad, Antigravity, and Agy-Context-Saver architecture](docs/assets/architecture-overview.svg)

Agy-Squad is a multi-agent swarm planner, code-review harness, and SHA-256 proof bundler for Google Antigravity on Linux, macOS, and Windows (Node.js 22 or newer, zero external npm dependencies). It splits reviews, audits, and implementation tasks across parallel Antigravity swarm workers with non-overlapping file scopes so workers do not collide or flood your context window. Each worker writes findings to a local report file, posts a short one-line status receipt, and can be audited and sealed into a SHA-256 proof bundle before you accept the result.

## Quickstart

Requires Node.js 22 or newer and Google Antigravity 2.0+. Pairing with [Agy-Context-Saver](https://paragon-ux.github.io/Agy-Context-Saver/) (2.0.1+, 2.0.4+ recommended) enables live integrity trace audits; standalone runs work without it.

```bash
# Install the plugin, skills, MCP server, and agy-squad CLI
npx --package=agy-squad agy-squad setup

# Verify plugin, skills, MCP registration, PATH, and companion tool status
npx --package=agy-squad agy-squad status
```

Reload Antigravity Desktop IDE after setup finishes so the MCP server and skills load. For shell PATH configuration, cohort planning and bundling examples, standalone mode, local checkout tests, and uninstallation, see the [Getting started guide](https://paragon-ux.github.io/Agy-Squad/getting-started/).

## Documentation

Read the full documentation at [paragon-ux.github.io/Agy-Squad](https://paragon-ux.github.io/Agy-Squad/):

- [Overview](https://paragon-ux.github.io/Agy-Squad/)
- [Getting started](https://paragon-ux.github.io/Agy-Squad/getting-started/)
- [Core workflows: orchestrate, self-diagnose, review, and tear down](https://paragon-ux.github.io/Agy-Squad/core-workflows/)
- [Roles, skill workflows, and runtime closure checklist](https://paragon-ux.github.io/Agy-Squad/roles-and-workflows/)
- [Concepts and terminology](https://paragon-ux.github.io/Agy-Squad/concepts/)
- [Manifest and tool contract](https://paragon-ux.github.io/Agy-Squad/tools/)
- [Stopping agents and child processes](https://paragon-ux.github.io/Agy-Squad/stopping-agents/)
- [Benchmarks vs. Antigravity Teamwork](https://paragon-ux.github.io/Agy-Squad/benchmarks/)

## License

MIT License. Copyright (c) 2026 paragon-ux.
