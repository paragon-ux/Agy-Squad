# Changelog

All notable changes to `Agy-Squad` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `agy-squad audit-check` now outputs structured per-worker work evidence: provably opened workspace files with inspection kinds (`read_file` line ranges, shell reads, search) separate from directory-only listings, mechanical citation line-range validation (`BAD_CITATION_LINE`), read-before-write step ordering (`REPORT_BEFORE_READS`), per-report SHA-256 digests, and a fixed flag list.
- Added `Work Verdict: VERIFIED | NOT VERIFIED` in `mcp/verdicts.mjs` and `agy-squad verdict --work` as an additive auditor verdict accepted alongside legacy `Integrity Verdict: CLEAN | INTEGRITY VIOLATION` in bundle and finalize gates, and bumped PR Review Standard to `1.6.0` (existing `1.5.0` and `1.4.0` ledgers remain valid).

### Changed
- Compiled auditor briefs now direct Wave-3 auditors to review `agy-squad audit-check` work evidence first and spot-check up to 3 claims per worker against cited `file:line` references without reading other sessions' transcripts directly.
- `agy-squad audit-check` now hard-blocks only on read-only file-tool writes into the repository outside `scratch/` and on unsafe or oversized trace paths; missing or unrecognized transcripts degrade to `NO_TRACE` or `UNVERIFIED_TRACE` flags, and shell-regex or external writes report informational flags while `readOnlyBaseline` enforces repository immutability.

## [0.2.2] - 2026-11-24

### Added
- `audit-check` verifies worker attribution, allowed writes, and citation reads before auditors inspect transcripts.
- Planner output supports staged launch files with `--out`, `--emit-wave`, and `--swarm-pane-out`.
- Read-only plans capture file hashes and Git state. Mixed plans protect read-only scopes while allowing disjoint writable work.
- `bundle-init --all-squads` initializes records together; `--from-scope` selects verified files from each squad's scope.
- `collect --handoffs` copies each isolated worker's report from a validated worktree receipt.
- `prune --records <record.json>=<accepted-sha256>` checks accepted bundle digests and record parity before cleanup. Unpinned record arguments are rejected; retained reports keep their records.
- `agy-squad bundle-init --digest`, `digest`, `bundle`, and `finalize` now report a deterministic `citations` summary (`specialistUrls`, `synthesisUrls`, `uncarriedUrls`) and print a warning on stderr before pruning when specialist URLs are missing from the synthesis report.
- Added `--strict-citations` on `agy-squad bundle` and `agy-squad finalize` to fail closed before bundling or pruning if any specialist URL is not carried into the synthesis report.

### Changed
- Layered squad leads now focus strictly on content verification (specialist reports, cited files, and checks) without running duplicate transcript forensics before independent integrity auditors.
- Integrity auditor briefs and the swarm governance wire guide now tell auditors to read `transcript.jsonl` natively in bounded slices (jumping to `transcript_full.jsonl` only when `truncated_fields` is set) and to use `agy-context transcript health --id <ids> --json` for counts when Agy-Context-Saver is installed.
- Swarm governance Stage 3 now directs coordinators to synthesize verified specialist and lead reports into the final deliverable before pruning loose reports (or to retain them with `--keep-reports`) and to carry forward `## Sources` citations.

## [0.2.1] - 2026-11-24

### Changed
- Agy-Squad runs standalone with native Antigravity, auditing worker execution directly from `~/.gemini/antigravity*/brain/<id>/.system_generated/logs/transcript.jsonl` and `transcript_full.jsonl` without companion setup steps. Running `agy-squad setup` and `agy-squad status` no longer probes for or prompts about companion tools, while optional pairing with Agy-Context-Saver 2.1.2+ remains supported.
- `agy-squad restore-backups` and `agy-squad uninstall --restore-backups` perform key-scoped merge-restore from namespaced `*.agy-squad.bak` backups (with a read-only fallback for legacy `*.bak` files), preserving third-party plugins and MCP servers. `agy-squad uninstall` also reminds you to reload Antigravity Desktop IDE after removing the plugin.
- The published npm package now ships only the four user-facing skills (`pr-review`, `full-review`, `day-one-review`, and `swarm-governance`) and defines an explicit `"exports"` map in `package.json` exposing `.` and `./package.json`. Maintainer-only tools, internal plans, and review logs no longer ship in end-user tarballs or installer copies. Undocumented deep imports such as `agy-squad/mcp/*` no longer resolve; CLI binaries and root imports remain unchanged.
- `swarm-governance` prompts once for only the swarm settings missing from your request, standardizes top-down resume for paused swarms, accepts spaced ASCII `-` and `--` separators plus optional `[done]` markers in one-line board receipts, and trims skill and compiled brief overhead.
- `day-one-review` confirms review depth and stop criteria upfront before starting a cold audit, replaces broad quick-fix buckets with explicit launch thresholds, runs live packed-artifact consumer installs and time-bounded regex safety checks, and defaults multi-file remediation to a single worker when shared daemons or symlinked hooks exist.
- Internal file I/O, hashing, and scope-overlap checks run faster without changing public CLI or MCP interfaces through lazy CLI module loading, cached directory containment checks, single-pass hashing in `bundle-init --digest`, and sorted prefix overlap sweeps.

### Fixed
- `agy-squad-mcp` resolves relative, absolute, symlink-aliased, and omitted default manifests across multi-root workspaces while deduplicating workspace aliases and blocking outbound symlinks, directory shadowing, and Windows drive-relative paths.
- `agy-squad collect` treats lead synthesis and integrity auditor slots as inherit-capable under isolated worktrees, handles corrupt destination files cleanly under `--overwrite`, and resolves worker-name provenance entries in slimmed subagent plans.
- `agy-squad restore-backups` retains primary `*.agy-squad.bak` backups with a warning when a live config file is missing and the backup contains third-party settings, while still recovering owned entries from mixed legacy `*.bak` backups without modifying the legacy file.
- `agy-squad status` reports stale global-MCP-only profiles as partial installations with repair steps, and CLI `--help` parsing rejects conflicting option combinations cleanly across subcommands.
- `agy-squad verdict` and bundle verification fail closed on malformed or incomplete archives, handle backticked `Evidence Digest` values and `verdict --integrity` checks consistently, and separate colon-delimited expectation labels from real failure statements in prose.
- Release automation verifies existing GitHub Release assets by SHA-256 on retry instead of overwriting uploads.

### Security
- Installer file writes preserve existing POSIX file permissions across atomic renames and create `*.agy-squad.bak` backups and recreated missing config targets with mode `0600`.
- `agy-squad-mcp` enforces multi-chunk stdio payload caps before buffering and pauses stdin during stdout backpressure.
- `agy-squad verify <bundle> --prune` requires `--expected-sha256 <sha256>` so pruning cannot run against an unintended bundle digest.
- Report parsers reject spoofed declarations inside fenced or indented code blocks and replace backtracking regexes with linear-time scanners across verdict, Markdown link, heading, SVG, and glob checks.
- Scope normalization resolves workspace-escaping, dangling, and ancestor symlinks so overlapping paths warn accurately, Windows `.cmd` shims disable delayed expansion, and GitHub Actions workflows pin actions to 40-character commit SHAs with least-privilege permissions.

## [0.2.0] - 2026-11-19

### Added
- Added a dedicated security and trust-boundaries category (`4.11 SEC`) to the PR Review Standard (v1.5.0) while keeping backward compatibility with older review formats.
- Added the `day-one-review` skill for cold first-time-user launch audits under `scratch/day-one-review/`, with a user-journey trace matrix, ship-readiness summary, interruption-safe subagent resume, cumulative follow-up rounds, and optional `/swarm` execution.

### Changed
- Promoted the native `/swarm` comparison diagram and skill overview table into `README.md`, split per-skill guides into dedicated pages under `docs/skills/`, and updated installer and packaging checks across all skills.

## [0.1.3] - 2026-11-19

### Added
- Added `agy-squad finalize <record.json>` to inspect, bundle, verify, and optionally prune reports in one command, along with grouped `agy-squad --help`, `--version` / `-v`, per-subcommand help, and cross-platform `PATH` diagnostics in `setup` and `status`.
- Added `--board-since` and `--board-seq` board scoping on `squad_planner` and `agy-squad plan`, batched `bundle-init --digest` and `verify --prune` workflows, and compact MCP responses.

### Changed
- Generalized `pr-review` and `full-review` to target any active repository and deliver reports in chat, an Antigravity artifact, or an opt-in review path when requested, added the `assets/logo.svg` plugin icon, simplified `README.md`, and trimmed skill context footprints.

### Fixed
- Tightened CLI argument and path normalization across Windows and POSIX, fixed Quickstart `bundle-init --digest` flags, namespaced installer backups to `*.agy-squad.bak` with legacy `.bak` fallback, surfaced malformed JSON config files during setup and status checks, and hardened verdict parsing and MCP request validation.

## [0.1.2] - 2026-11-16

### Added
- Added `agy-squad collect` for isolated `/swarm` worktree report recovery and `agy-squad bundle-init` for bundle record scaffolding.
- Added `--allow-non-passing` and `--allow-partial` archival flags, `plugin.json` metadata (`displayName`, `homepage`, `suggestedPrompts`), canonical plugin `mcp_config.json` registration, and richer installation state reporting in `agy-squad status`.

### Fixed
- Hardened cross-platform installer shims (`install.ps1` dynamic Node lookup, UTF-8 Windows `.cmd` shims, broken-symlink cleanup), rejected ambiguous multi-root default manifests, guarded bundle overwrites with predecessor checks, and normalized cross-platform scope path comparisons.

## [0.1.1] - 2026-11-15

### Fixed
- Added optional `workspace` parameters and MCP `initialize` root fallbacks on `dispatch_squad` and `squad_planner` with actionable missing-manifest diagnostics when the server starts outside a project root.
- Added bounded file-read guidance across compiled worker, lead, and auditor briefs and tightened release preflight and package allowlist checks.

### Documentation
- Added the November 15, 2026 matched-effort benchmark comparison against Antigravity `/teamwork`, scoped platform guidance, and standardized documentation links.

## [0.1.0] - 2026-11-15

### Added
- Initial release with zero-clone `npx --package=agy-squad agy-squad setup` (`status`, `uninstall`, `--check`, `restore-backups`), the `squad_planner` and `dispatch_squad` MCP server, one-line receipt and SHA-256 proof-bundle CLI commands, structured review and swarm-governance skills, and automated npm publishing with provenance.
