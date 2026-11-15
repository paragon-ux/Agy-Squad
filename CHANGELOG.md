# Changelog

All notable changes to `Agy-Squad` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-15

### Added
- **Zero-Clone CLI & Plugin Installer (`scripts/install-register.mjs`, `bin/agy-squad.mjs`, `plugin.json`)**: Added `npx --package=agy-squad agy-squad setup` (`status`, `uninstall`, `--check`, `--restore-backups`) to install the native Antigravity plugin (`~/.gemini/config/plugins/agy-squad`), link `.agents/skills`, register the `agy-squad` MCP server in `~/.gemini/config/mcp_config.json`, and provision `agy-squad` CLI shims in `~/.gemini/antigravity/bin/`.
- **`squad_planner` & Native `/swarm` Cohort Compiler (`mcp/planner.mjs`, `bin/agy-squad.mjs`)**: Compiles flat (`1–3` workers) and layered (`4+` workers with Squad Leads) `/swarm` cohorts with disjoint file-scope validation, 24-character roster-name enforcement, model pinning (`knownModels`), `provenanceScaffold`, and flat `audit-<id>` integrity auditor slots.
- **First-Line Transcript Access Directives (`mcp/briefs.mjs`)**: Stamps `[agy-transcript-access: allow]` on Squad Lead and Independent Integrity Auditor briefs/prompts and `[agy-transcript-access: deny]` on leaf Specialist briefs/prompts for zero-config isolation with `Agy-Context-Saver >= 2.0.1`.
- **Pointer-Over-Wire & SHA-256 Proof Pipeline (`mcp/handoffs.mjs`, `mcp/verdicts.mjs`, `bin/agy-squad.mjs`)**: Implements `fingerprint`, `inspect`, `digest`, `verdict`, `bundle`, `verify`, and `prune` commands producing tamper-evident `.sources.json` sidecars with canonical `Evidence Digest` verification.
- **PR Review Standard `v1.4.0` & Governance Skills (`.agents/skills/`)**: Ships `pr-review`, `full-review`, `self-diagnosis` (`diagnose.mjs`), and `swarm-governance` skills with 10 mandatory review categories (`ARCH`, `DOC`, `SKILL`, `MCP`, `RUN`, `SVC`, `DB`, `SCRIPT`, `TEST`, `DEP`), 1-ID-per-row finding tables, and runtime closure checklists.
- **Release Preflight & Trusted Publishing Workflow (`scripts/release-preflight.mjs`, `.github/workflows/release-tag.yml`)**: Added automated release preflight verification and GitHub Actions OIDC Trusted Publishing to npm.
