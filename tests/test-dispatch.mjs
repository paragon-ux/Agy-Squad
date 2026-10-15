// dispatch_squad: staged payloads from a manifest, error handling, and no spawn path.
// Calls the handler directly. Nothing here starts an agent.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleDispatchSquad } from "../mcp/dispatch.mjs";

const textOf = (res) => res.content[0].text;
const payloadOf = (text) => JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);

console.log("Agy-Squad dispatch_squad tests\n");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-test-"));
const manifestPath = path.join(dir, "swarm-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify({
  squads: {
    squad_consensus: {
      lead: { role: "Consensus Architect Lead", objective: "Coordinate consensus implementation", scopeFiles: ["src/consensus.js"] },
      specialists: [
        { role: "State Transition Specialist", objective: "Implement state transitions", scopeFiles: ["src/state.js"] },
        { role: "Wire Serializer", objective: "Implement binary wire encoding", scopeFiles: ["src/wire.js"] }
      ]
    },
    squad_storage: {
      lead: { role: "Storage Engine Lead", objective: "Coordinate LSM storage engine", scopeFiles: ["src/storage.js"] },
      specialists: [{ role: "WAL Specialist", objective: "Implement write-ahead log", scopeFiles: ["src/wal.js"] }]
    },
    squad_empty: { lead: { role: "Lonely Lead", objective: "Nothing to delegate", scopeFiles: ["src/x.js"] } }
  }
}, null, 2));

try {
  // Missing manifest
  {
    const res = handleDispatchSquad({ manifestPath: path.join(dir, "missing.json"), squadId: "all_l1" });
    assert.ok(res.isError);
    assert.match(textOf(res), /Manifest not found/);
    console.log("✓ missing manifest is reported");
  }

  // Stage 1: L1 leads only, each told to fetch its own leaves in stage 2
  {
    const res = handleDispatchSquad({ manifestPath, squadId: "all_l1" });
    assert.equal(res.isError, undefined);
    const text = textOf(res);
    assert.match(text, /Staged Squad Payload Ready/);
    assert.match(text, /Agents Compiled: 3/);
    const payload = payloadOf(text);
    assert.deepEqual(payload.Subagents.map((s) => [s.Role, s.TypeName]), [
      ["Consensus Architect Lead", "self"], ["Storage Engine Lead", "self"], ["Lonely Lead", "self"]
    ]);
    assert.match(payload.Subagents[0].Prompt, /calling MCP tool 'dispatch_squad' with squadId='squad_consensus'/);
    console.log("✓ stage 1 compiles only the L1 leads");
  }

  // Stage 2: one squad's leaves
  {
    const payload = payloadOf(textOf(handleDispatchSquad({ manifestPath, squadId: "squad_consensus" })));
    assert.deepEqual(payload.Subagents.map((s) => [s.Role, s.TypeName]), [
      ["State Transition Specialist", "research"], ["Wire Serializer", "research"]
    ]);
    console.log("✓ stage 2 compiles one squad's L2 leaves");
  }

  // Errors: unknown squad, squad without leaves
  {
    const unknown = handleDispatchSquad({ manifestPath, squadId: "squad_nonexistent" });
    assert.ok(unknown.isError);
    assert.match(textOf(unknown), /Unknown squadId 'squad_nonexistent'/);
    assert.match(textOf(unknown), /squad_consensus, squad_storage, squad_empty/);
    const empty = handleDispatchSquad({ manifestPath, squadId: "squad_empty" });
    assert.ok(empty.isError);
    assert.match(textOf(empty), /has no children or specialists/);
    console.log("✓ unknown squads and squads without leaves are rejected");
  }

  // No spawn path: the old direct mode is gone, so mode='direct' still only returns a payload
  {
    const res = handleDispatchSquad({ manifestPath, squadId: "all_l1", mode: "direct", staggerMs: 1 });
    assert.equal(res.isError, undefined);
    assert.match(textOf(res), /Pass this exact payload to `invoke_subagent`/);
    assert.doesNotMatch(textOf(res), /Dispatched|SPAWNED|agentapi|Connect RPC/);
    console.log("✓ no spawn path: a 'direct' request still returns a payload only");
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log("\nAll dispatch_squad tests passed.");
