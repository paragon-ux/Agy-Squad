# Changelog

All notable changes to `Agy-Squad` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-11-15

### Fixed
- **MCP Workspace Resolution (`mcp/index.js`, `mcp/dispatch.mjs`, `mcp/planner.mjs`, `docs/tools.md`)**: Added optional `workspace` parameter on both `dispatch_squad` and `squad_planner`, forwarded explicit `workspace` overrides in `all_l1` lead delegation instructions, captured client `initialize` workspace roots (`workspaceFolders`/`rootUri`/`rootPath` with resilient URI fallback), supported absolute `manifestPath` inside symlinked workspaces, trimmed `manifestPath`/`AGY_SQUAD_WORKSPACE` consistently, and surfaced actionable `ENOENT` diagnostics (`workspace:`, `manifestPath:`, and `Pass 'workspace'` / `AGY_SQUAD_WORKSPACE` hints) even on missing default manifests when the MCP server starts outside the active repository root.
- **Bounded File-Read Guidance (`mcp/briefs.mjs`, `mcp/planner.mjs`)**: Added concise `rtk read` / `rtk grep` / bounded `<= 150`-line `read_file` (`StartLine`/`EndLine`) instructions across compiled working specialist, squad lead, and auto-synthesized `integrity_auditor` (`audit-<id>`) prompts while removing duplicated auditor text and staying inside prompt byte budgets (`1702 B <= 1800 B` specialist, `2881 B <= 3300 B` lead, `3075 B <= 4096 B` `tools/list`).
- **Release Preflight & Package Checks (`scripts/release-preflight.mjs`, `tests/verify-package.mjs`, `tests/test-server.mjs`)**: Added `mcp/dispatch.mjs`, `self-diagnosis` runtime files, `verify:package` script checks, `./` + `!` negation handling in `files`, `LICENSE` + nested scratch/log tarball guards, isolated `AGY_SQUAD_WORKSPACE` in MCP server tests, and bumped catch version fallbacks to `0.1.1`.

### Documentation
- **Matched-`High` Benchmark Retest (`benchmarks/teamwork-vs-squad/`, `docs/benchmarks.md`, `docs/index.md`, `docs/getting-started.md`, `docs/core-workflows.md`, `README.md`, `package.json`, `zensical.toml`)**: Recorded the November 15, 2026 `Gemini 4 Hydrogen (High)` matched-effort comparison (`6m 30s` / `390s` vs. `22m 41s` / `1,361s`, `178` vs. `655` combined steps, `336.8 KB` vs. `801.8 KB` combined raw transcripts, `1,629 B` vs. `18,322 B` parent wakeup bytes, `21` vs. `16` defects, and `audit-ab-audit` `CLEAN` verdict vs. `/teamwork` Sentinel-fabricated snippets passing `Victory Auditor`) alongside the historical November 8, 2026 Phase 1 baseline, extended `verify-benchmark.mjs` to validate per-row KB sums, `N1`–`N6` rubric mappings, digest/SHA-256 provenance, and flat `/swarm` planning, scoped platform support to Linux and WSL2, and standardized GitHub Pages URL casing (`https://paragon-ux.github.io/Agy-Squad/`).

## [0.1.0] - 2026-11-15

### Added
- **Zero-Clone CLI & Plugin Installer (`scripts/install-register.mjs`, `bin/agy-squad.mjs`, `plugin.json`)**: Added `npx --package=agy-squad agy-squad setup` (`status`, `uninstall`, `--check`, `--restore-backups`) to install the native Antigravity plugin (`~/.gemini/config/plugins/agy-squad`), link `.agents/skills`, register the `agy-squad` MCP server in `~/.gemini/config/mcp_config.json`, and provision `agy-squad` CLI shims in `~/.gemini/antigravity/bin/`.
- **`squad_planner` & Native `/swarm` Cohort Compiler (`mcp/planner.mjs`, `bin/agy-squad.mjs`)**: Compiles flat (`1–3` workers) and layered (`4+` workers with Squad Leads) `/swarm` cohorts with disjoint file-scope validation, 24-character roster-name enforcement, model pinning (`knownModels`), `provenanceScaffold`, and flat `audit-<id>` integrity auditor slots.
- **First-Line Transcript Access Directives (`mcp/briefs.mjs`)**: Stamps `[agy-transcript-access: allow]` on Squad Lead and Independent Integrity Auditor briefs/prompts and `[agy-transcript-access: deny]` on leaf Specialist briefs/prompts for zero-config isolation with `Agy-Context-Saver >= 2.0.1`.
- **Pointer-Over-Wire & SHA-256 Proof Pipeline (`mcp/handoffs.mjs`, `mcp/verdicts.mjs`, `bin/agy-squad.mjs`)**: Implements `fingerprint`, `inspect`, `digest`, `verdict`, `bundle`, `verify`, and `prune` commands producing tamper-evident `.sources.json` sidecars with canonical `Evidence Digest` verification.
- **PR Review Standard `v1.4.0` & Governance Skills (`.agents/skills/`)**: Ships `pr-review`, `full-review`, `self-diagnosis` (`diagnose.mjs`), and `swarm-governance` skills with 10 mandatory review categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), 1-ID-per-row finding tables, and runtime closure checklists.
- **Release Preflight & Trusted Publishing Workflow (`scripts/release-preflight.mjs`, `.github/workflows/release-tag.yml`)**: Added automated release preflight verification and GitHub Actions OIDC Trusted Publishing to npm.
