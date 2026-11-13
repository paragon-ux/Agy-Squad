---
name: swarm-governance
description: Apply Agy-Squad governance, role separation, Pointer-Over-Wire reporting, and SHA-256 proof bundling on top of Antigravity native /swarm execution.
---

# Agy-Squad Swarm Governance & Verification

Agy-Squad serves as the **governance, integrity auditing, and cryptographic proof layer** on top of Antigravity's native `/swarm` orchestration (`swarm`, `post_message`, `read_board`, `swarm_wait`, `swarm_monitor`).

Native `/swarm` handles worker spawning, worktree/branch isolation (`workspace: "share"` / `"branch"`), live model switching, and stall monitoring. Do **not** use the deprecated local launcher (`agy-squad run`); use native `/swarm` for execution and apply these Agy-Squad controls for rigor and auditability.

---

## 1. Strict Role Separation

Never conflate content acceptance with integrity auditing:

| Role | Native `/swarm` Member | Verdict Format | Responsibility |
| :--- | :--- | :--- | :--- |
| **Working Lead** | `lead` / domain lead | `Content Verdict: PASS` \| `FAIL` \| `BLOCKED` | Reviews specialist deliverables, runs tests, and owns final technical acceptance. |
| **Integrity Auditor** | `integrity-auditor` (flat) | `Integrity Verdict: CLEAN` \| `INTEGRITY VIOLATION` | Independent peer auditing tool traces, primary evidence, and absence of sycophancy or guessing. Must record `Target Squad: <id>`. |

- **Strict single-line enforcement:** Avoid hedged verdicts (e.g., `PASS with Advisories`, `CONDITIONAL PASS`). `agy-squad verdict` and `bundleReports` deterministically reject hedged or contradictory verdict lines.
- **Flat auditor preference:** Use a single flat `integrity-auditor` peer rather than nested adversarial sub-hierarchies to eliminate invisible sub-subagents and reduce token burn.

---

## 2. Pointer-Over-Wire on the Swarm Board

Posting 50 KB Markdown reports directly to the `/swarm` board forces every waiting worker to ingest them on subsequent turns, causing quadratic token bloat.

1. Instruct each `/swarm` worker to write its full Markdown report to a workspace-relative scratch slot (e.g., `scratch/agy-squad/squad-<id>/specialist-N/report.md`).
2. Have the worker post a single-line pointer (under 500 UTF-8 bytes) to the board:
   - `@lead READY <report-path> — <1-line concrete observation>`
   - `@lead PARTIAL <report-path> — <observation and blocker>`
   - `@lead NO_REPORT — <reason>`

---

## 3. Post-Swarm Cryptographic Proof Bundling

After the `/swarm` cohort completes, generate and verify a tamper-evident SHA-256 bundle offline without model calls:

```bash
# 1. Validate strict verdicts
npx agy-squad verdict scratch/agy-squad/squad-<id>/lead/report.md
npx agy-squad verdict --integrity scratch/agy-squad/squad-integrity_auditor/specialist-1/report.md

# 2. Bundle reports + programmatic integrity hash binding
npx agy-squad bundle <bundle-record.json>

# 3. Verify bundle, synthesis, verified files, and integrity audit hash in CI/CD
npx agy-squad verify scratch/agy-squad/squad-<id>/bundle.json

# 4. Optionally prune loose reports (or pass --keep-reports to retain)
npx agy-squad prune scratch/agy-squad/squad-<id>/bundle.json <bundle-sha256> --keep-reports
```

The bundler (`mcp/handoffs.mjs`) programmatically computes and binds the integrity audit report's SHA-256 digest—never ask an LLM to manually copy-paste 64-character hashes in Markdown.
