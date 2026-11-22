# Evidence Intake for Full Reviews

Procedure for [../SKILL.md](../SKILL.md) under [PR Review Standard v1.5.0](../../pr-review/references/pr-review-standard.md).

## 0. Target Types and Minimum Evidence

| Target | Baseline | Minimum Evidence |
| --- | --- | --- |
| PR / branch | merge-base & head SHA | diff, inventory, CI commit, prior review |
| Working tree | `HEAD` + dirty delta | tracked diff, untracked list, commands run |
| Commit range | `base..head` | changed files, contracts, tests |
| Repo / subsystem | pinned SHA | inventory, deps, normative docs |
| Evidence bundle | hashes & locators | transcript/log/CI + claims they prove |
| Direction question | pinned state + constraints | options, prior decisions, pro/con evidence |
| Incident / regression | last good..bad | repro, logs, timeline, blast radius |

## 1. Evidence Manifest

Record every cited artifact in Section 1.3 (`EID | Artifact | Locator | SHA-256 / size | Class | Access | Examined`):

- **Classes:** Repo source, normative record, user evidence, local run, CI log, external source, prior review.
- **Access:** Examined, Partially examined, Unavailable, Not examined.
- **Rules:** Hashes prove identity, not truth. State gaps explicitly. Transcripts record claims, not normative specs. Record the index and windows read.

## 2. Pin Git & Local Runs

```bash
git rev-parse HEAD && git rev-parse <base>
git status --porcelain && git diff --stat <base>..HEAD && git diff --name-status <base>..HEAD
```

For PRs, pin URL, base/head, mergeability, and CI commit (PR head vs merge commit). For local runs, record `cwd`, runtime/OS, exact `command`, `exit`, and relevant excerpt.

## 3. Transcript Protocol (Batch, Never Poll)

Index in **one batch pass** (counts by `type`/`source`, user turns, assistant messages, tool calls, errors). For Antigravity traces (standalone JSONL vs optional `Agy-Context-Saver`), follow [dual-path trace inspection](../../swarm-governance/references/bundling-and-wire-format.md#dual-path-trace-inspection).

```bash
node -e '
const rows = require("node:fs").readFileSync(process.argv[1], "utf8").trim().split(/\r?\n/).map(JSON.parse);
const counts = {};
for (const r of rows) counts[r.type] = (counts[r.type] ?? 0) + 1;
console.log(JSON.stringify({ rows: rows.length, counts }));
for (const r of rows) if (r.type === "USER_INPUT") console.log(`USER ${r.step_index} @ ${r.created_at}: ${String(r.content ?? "").slice(0, 300)}`);
' transcript_full.jsonl
```

Read targeted +/-3-step windows only where the index shows key claims. Separate layers:

| Layer | Proves | Does not prove |
| --- | --- | --- |
| User | Requirement, verdict, or constraint | Factual truth |
| Model | Claim or proposal | Execution or verification |
| Tool | Returned output in that run | Representativeness or completeness |
| Source | Current file contents | Runtime behavior |

Never cite a model summary as the underlying transcript step or tool output.

## 4. Logs, CI & Citations

- Separate green summaries from asserted checks; mark environment limits distinctly from defects; label unrun checks `Source-derived inference` with repro steps.
- **Citations:** Commit URL (`.../blob/<sha>/path#Lx-Ly`) or local (`path#Lx-Ly` + pinned SHA); Transcript (`step N @ ISO` + quote); Command (`cwd`, command, exit, excerpt); CI (workflow, job, SHA, URL, check); External (title, URL, date); Prior review (path, ID, SHA).
- **Avoid:** Reading only endpoints, step-by-step polling, trusting self-reports, equating hashes with truth, inheriting verdicts, or hiding missing evidence.
