# Tools

Both tools return text and JSON only. They never start an agent.

## `subagent_brief`

Builds a scope-isolated brief and a ready-to-use `invoke_subagent` payload. It covers a single subagent, a batch, or a 2-layer squad: an **L1 lead** whose brief carries its **L2 leaves'** payload pre-compiled, so their instructions don't degrade as they pass from agent to agent.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :---: | :---: | :--- |
| `objective` | `string` | Yes (single) | The research or execution objective. |
| `scopeFiles` | `array` | Yes | Files or folders the subagent may inspect or edit. Briefs without a scope are rejected. |
| `role` | `string` | No | 2–5 word job title. Defaults: `Scope-Isolated Deep Research Subagent` (leaf), `L1 Squad Lead Orchestrator` (lead). |
| `tier` | `string` | No | `L2_leaf` (default) or `L1_lead`. Giving `children` makes it `L1_lead`. |
| `children` | `array` | No | For `L1_lead`: the leaves pre-compiled into the lead's brief. |
| `instructions` | `string` | No | Step-by-step directives. |
| `expectedDeliverable` | `string` | No | The format expected back. Default: `Synthesized factual findings`. |
| `typeName` | `string` | No | Antigravity subagent type. Defaults: `research` (read-only) for leaves, `self` for leads. |
| `model` | `string` | No | `inherit` (default), `flash_lite`, `flash`, `pro`. |
| `workspace` | `string` | No | `inherit` (default), `branch`, `share`. |
| `subagents` | `array` | Yes (batch) | Several specs at once. Each takes the fields above. |

### The Pointer-Over-Wire (POW) contract

Every brief tells the subagent to keep large results out of the message channel. A deliverable over 1 KB goes to a file, and the message carries only:

- an executive summary (3–5 sentences);
- a verdict or scoreboard table;
- a link to the file.

The brief also spells out Antigravity's path rules for `write_to_file`. If the instructions mention another conversation's `brain/<uuid>/` folder, the brief warns the subagent not to write there.

### Example: a lead with two leaves

```json
{
  "name": "subagent_brief",
  "arguments": {
    "role": "Architecture Squad Lead",
    "tier": "L1_lead",
    "objective": "Lead the consensus protocol refactor",
    "scopeFiles": ["src/consensus.mjs"],
    "children": [
      { "role": "Ledger State Specialist", "objective": "Audit state transitions", "scopeFiles": ["src/state.mjs"] },
      { "role": "Network Wire Auditor", "objective": "Validate wire serialization", "scopeFiles": ["src/wire.mjs"] }
    ]
  }
}
```

The output ends with the payload to pass to `invoke_subagent`:

```json
{
  "Subagents": [
    { "TypeName": "self", "Role": "Architecture Squad Lead", "Model": "inherit", "Workspace": "inherit", "Prompt": "ROLE: Architecture Squad Lead\nTIER: L1_lead\n..." }
  ]
}
```

## `dispatch_squad`

Reads a squad manifest and returns one stage at a time, so leads and leaves never start together.

| Parameter | Type | Required | Description |
| :--- | :---: | :---: | :--- |
| `squadId` | `string` | Yes | `all_l1` for stage 1 (every squad's lead), or a squad ID for stage 2 (that squad's leaves). |
| `manifestPath` | `string` | No | Path to the manifest. If omitted, it looks for `task-01-manifest.json`, `swarm-manifest.json`, `.scratch/swarm-manifest.json` or `suite-manifest.json` in the workspace. |

### Manifest shape

```json
{
  "squads": {
    "squad_storage": {
      "lead": { "role": "Storage Engine Lead", "objective": "Coordinate the storage engine", "scopeFiles": ["src/storage.js"] },
      "specialists": [
        { "role": "WAL Specialist", "objective": "Implement the write-ahead log", "scopeFiles": ["src/wal.js"] }
      ]
    }
  }
}
```

`children` works in place of `specialists`.

### Stages

1. The main agent calls `dispatch_squad({ squadId: "all_l1" })` and passes the payload to `invoke_subagent`. Each lead's brief tells it to fetch its own leaves later.
2. Each lead scaffolds its part of the workspace, then calls `dispatch_squad({ squadId: "<its squad>" })` and starts its leaves.

!!! note "No direct mode"
    An earlier version could start agents itself through the language server's private RPC. That path caused the 2026-10-14 breach and was not carried over (ledger L14).
