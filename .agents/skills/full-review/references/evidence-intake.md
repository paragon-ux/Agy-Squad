# Evidence intake for full reviews

This reference supports Step 1 and Step 2 of [../SKILL.md](../SKILL.md). It is a procedure, not a substitute for the [PR Review Standard v1.3.0](../../pr-review/references/pr-review-standard.md).

## 0. Target types and minimum evidence

| Target type | Baseline to pin | Minimum evidence |
| --- | --- | --- |
| Pull request / branch | merge-base and head SHA | diff, changed-file inventory, CI commit, prior review ledger |
| Working tree | `HEAD` plus dirty delta | tracked diff, untracked inventory, commands run |
| Commit range | base..head | changed files, affected contracts, tests |
| Whole repository or subsystem | one pinned SHA | inventory, dependencies, normative records |
| Evidence bundle | artifact hashes and locators | transcript/log/CI plus the claims they are meant to prove |
| Direction question | pinned state plus decision constraints | options, prior decisions, evidence for and against each option |
| Incident / regression | last known good..bad | reproduction, logs, timeline, blast radius |

## 1. Build the evidence manifest first

Every artifact that will be cited gets an `EID`, a locator, a content hash or size, a class, an access status, and an examined scope. The manifest is part of the report, not private scratch work.

| Field | Meaning |
| --- | --- |
| `EID` | Stable ID such as `E01`; findings cite it. |
| `Artifact` | File name, transcript, CI run, URL, or command output. |
| `Locator` | Path, URL, commit, step range, or line range. |
| `SHA-256 / size` | Content identity; use the hash when available, size plus date otherwise. |
| `Class` | Repository source, normative design record, user-provided evidence, local execution, CI log, external source, or prior review. |
| `Access` | `Examined`, `Partially examined`, `Unavailable`, or `Not examined`. |
| `Examined` | Exact sections, steps, lines, or queries actually read. |

Rules:

- A hash proves identity, not truth. It does not prove that the content was read or that its claims are correct.
- State when an attachment, environment, CI run, or external source was unavailable. Do not fill the gap with inference.
- Keep user-provided evidence separate from repository evidence. A transcript is a record of claims, not an authoritative design record.
- If the evidence is large, record the index you built and the windows you read. Do not imply full coverage from targeted reads.

## 2. Pin revisions and working state

For a Git target, record at minimum:

```bash
git rev-parse HEAD
git rev-parse <base>
git status --porcelain
git diff --stat <base>..HEAD
git diff --name-status <base>..HEAD
```

For a working-tree review, also capture the tracked diff and the untracked inventory. For a PR, record the PR URL, base branch, head branch, head SHA, mergeability, and the exact commit each CI run executed. Distinguish the PR head from GitHub's generated merge commit.

For local execution, record the runtime and environment, not just the command:

```text
cwd: <path>
runtime: <node/python version, OS, sandbox mode>
command: <exact command>
exit: <code>
output: <relevant excerpt, with truncation marked>
```

## 3. Transcript protocol (batch, never poll)

A typical JSONL transcript has one object per step with fields such as `step_index`, `source`, `type`, `status`, `created_at`, `content`, `thinking`, and `tool_calls`. Do not assume that schema; inspect the first and last records and the key distribution.

### 3.1 Index once

Use one batch pass to produce:

- total records, byte size, hash, first and last timestamps;
- counts by `type` and `source`;
- every user turn with step and timestamp;
- every assistant message with non-empty `content`, with length and a short prefix;
- tool call counts by name and error counts;
- a step/time index around quoted evidence.

A compact Node recipe (run from the repository root, adjust the path):

```bash
node -e '
const fs = require("node:fs");
const p = process.argv[1];
const rows = fs.readFileSync(p, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const counts = {};
for (const r of rows) counts[r.type] = (counts[r.type] ?? 0) + 1;
console.log(JSON.stringify({ rows: rows.length, counts }, null, 2));
for (const r of rows) {
  if (r.type === "USER_INPUT") console.log(`USER step=${r.step_index} at=${r.created_at}\n${String(r.content ?? "").slice(0, 500)}\n`);
}
' transcript_full.jsonl
```

Add a second pass for assistant messages and tool calls only when the index shows they matter. Never call a transcript-reading tool once per step; that is the quadratic pattern this protocol exists to prevent.

### 3.2 Read targeted windows

For each key step, read a bounded window (for example ±3 steps) and record:

- the exact user request or model claim, quoted;
- whether it is a user assertion, a model claim, a tool result, or an external-source claim;
- the tool command and result if the claim depends on execution;
- the timestamp and step;
- what the surrounding window does not establish.

### 3.3 Separate the four evidence layers

| Layer | What it proves | What it does not prove |
| --- | --- | --- |
| User statement | The user's requirement, verdict, or constraint | That the claim is factually correct |
| Model statement | What the model asserted or proposed | That the assertion was executed or verified |
| Tool result | What the tool returned in that run | That the run was representative or complete |
| Repository source | What the code or document currently says | That it behaves that way at runtime |

Do not cite a model's summary of a transcript as if it were the transcript. Quote the underlying step or tool result.

## 4. Logs, CI, and command output

- Record the exact revision, job, command, and environment.
- Distinguish a passing summary from the assertions that were executed. A green suite that never exercises the named guarantee is not evidence for that guarantee.
- A failure caused by the review environment (missing OS feature, sandbox denial, unavailable service) is an environment limitation, not a product defect. State it as such and do not count it against the target.
- If a test cannot run, give the reproduction steps and label the expected result as source-derived. Do not claim it passed or failed.

## 5. Citation formats

| Evidence | Format |
| --- | --- |
| Code at a commit | `https://github.com/paragon-ux/Agy-Squad/blob/<sha>/path#Lx-Ly` |
| Local code | `path#Lx-Ly` with the SHA pinned in Section 1 |
| Transcript | `transcript_full.jsonl step 1375 @ 2026-11-10T06:29:55Z` plus a short quote |
| Command | `cwd`, command, exit code, output excerpt |
| CI | workflow, job, revision, URL, conclusion, and the asserted check |
| External | title, URL, version/date, access date |
| Prior review | report path, finding ID, and the prior revision |

Mark `Observed` for execution you performed or output you inspected, and `Source-derived inference` for conclusions drawn from code or documents without execution. Never blur the two.

## 6. Intake failure modes to avoid

- Reading the first and last transcript entries and calling it a review.
- Polling a transcript one or two steps at a time and inflating the token cost.
- Treating a model's self-report ("I ran the tests", "I searched the web") as execution evidence.
- Treating a green test summary as proof of the guarantee the test names.
- Treating a hash as proof of correctness rather than identity.
- Citing a file you fetched but did not read, or a section you read but did not understand.
- Letting a prior review's verdict stand without revalidating its findings.
- Hiding unavailable evidence inside a confident narrative.
