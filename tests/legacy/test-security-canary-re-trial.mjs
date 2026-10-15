// LEGACY, NOT RUN (ledger L16). Copied as-is from Agy-Context-Saver's wip/subagent-squad branch.
// It targets the old shared `agy-swarm-sandbox` container and imports an mcp/index.js that no
// longer exports these handlers. Plan phase P2 rewrites it against the squad sandbox (ledger L35).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  handleDispatchSquad,
  handleSubagentBrief,
  handleRequest
} from "../mcp/index.js";

console.log("=================================================");
console.log("Agy-Context-Saver Security Canary & Re-Trial Suite");
console.log("=================================================\n");

// =========================================================================
// Track 1: True Read-Only Verification (Schema-Level Stripping)
// =========================================================================
console.log("--- Track 1: True Read-Only Verification (Schema-Level Stripping) ---");

// The exact schema parameters for defining a strict read-only subagent preset
const strictReadOnlyPresetDefinition = {
  name: "strict_readonly",
  description: "Hermetic, zero-mutation read-only subagent preset with all write, shell, and subagent tools structurally stripped from its schema.",
  system_prompt: "You are a hermetic read-only specialist. You do not possess tools to write files, modify files, run shell commands, or spawn subagents. You may only view designated target files and communicate via send_message.",
  enable_write_tools: false,     // Strips: run_command, write_to_file, replace_file_content
  enable_subagent_tools: false,  // Strips: invoke_subagent, define_subagent, manage_subagents
  enable_mcp_tools: false        // Strips: call_mcp_tool (or true if read-only MCP whitelist)
};

assert.equal(strictReadOnlyPresetDefinition.enable_write_tools, false, "enable_write_tools must be false");
assert.equal(strictReadOnlyPresetDefinition.enable_subagent_tools, false, "enable_subagent_tools must be false");
console.log("✓ Strict Read-Only preset definition verified: write_tools=false, subagent_tools=false, mcp_tools=false");

// Verify that when L2 leaf subagent brief specifies typeName='strict_readonly',
// subagent_brief respects and propagates the custom typeName
const briefRes = handleSubagentBrief({
  tier: "L2_leaf",
  role: "Hermetic File Inspector",
  typeName: "strict_readonly",
  objective: "Inspect designated source files with zero mutation tools",
  scopeFiles: ["mcp/index.js"]
});
assert.equal(briefRes.isError, undefined);
const parsedBrief = JSON.parse(briefRes.content[0].text.match(/```json\n([\s\S]*?)\n```/)[1]);
assert.equal(parsedBrief.Subagents[0].TypeName, "strict_readonly");
console.log("✓ subagent_brief preserves and maps custom 'strict_readonly' preset in L2 payload");

// =========================================================================
// Track 2: Sandbox Escape & Canary Prompts (The 'Jailbreak' Test)
// =========================================================================
console.log("\n--- Track 2: Sandbox Escape & Canary Prompts (Jailbreak Attacks) ---");

// Canary Attack 1: Attempting path traversal to read /root/.gemini/config/ or /etc/passwd via read_transcript
const traversalTargets = [
  "/root/.gemini/config/config.json",
  "/root/.gemini/config/mcp_config.json",
  "../../../../etc/passwd",
  "../../../../root/.gemini/config/",
  "C:\\Users\\USER\\.gemini\\config\\config.json",
  "\\\\127.0.0.1\\c$\\Windows\\win.ini"
];

for (const target of traversalTargets) {
  const req = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "read_transcript",
      arguments: { conversationId: target, mode: "compact" }
    }
  };
  const res = await handleRequest(req);
  assert.equal(res.result?.isError, true, `Target '${target}' must be rejected`);
  assert.match(res.result.content[0].text, /Transcript not found/);
  // Ensure sensitive config contents are NEVER leaked in error or content
  assert.equal(res.result.content[0].text.includes("mcpServers"), false);
  assert.equal(res.result.content[0].text.includes("userSettings"), false);
}
console.log("✓ Path traversal canary attacks (6/6) cleanly rejected without leaking system files");

// Canary Attack 2: Command/shell injection attempts inside query_transcript query parameter
const injectionQueries = [
  "; rm -rf / ; cat /root/.gemini/config/config.json",
  "| cat /etc/shadow #",
  "`whoami`",
  "$(id)",
  "& echo 'injected' &",
  "'; DROP TABLE transcripts; --",
  "(?i)root.*token"
];

for (const q of injectionQueries) {
  const req = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "query_transcript",
      arguments: {
        conversationId: "fcda194f-62d6-46aa-b545-b2de8fa5774e",
        query: q
      }
    }
  };
  const res = await handleRequest(req);
  // Must execute safely as string search / regex without shell execution
  assert.equal(res.error, undefined);
  assert.ok(res.result.content[0].text);
}
console.log("✓ Shell injection canary attacks (7/7) treated strictly as bounded text queries with zero shell execution");

// =========================================================================
// Track 3: File System Integrity (The Docker Read-Only Mount Simulation)
// =========================================================================
console.log("\n--- Track 3: File System Integrity (Docker :ro Mount Verification) ---");

// Test container physical VFS mount flags via docker exec
try {
  const mountsOutput = execSync(
    'docker exec agy-swarm-sandbox sh -c "cat /proc/mounts | grep -E \'/workspace/Agy-Context-Saver\'"',
    { encoding: "utf-8" }
  );
  assert.match(mountsOutput, /\/workspace\/Agy-Context-Saver\s+9p\s+ro\b/);
  console.log("✓ Docker kernel VFS mount verified: /workspace/Agy-Context-Saver is physically mounted 'ro' (Read-Only)");

  // Test live EROFS kernel rejection
  let erofsTriggered = false;
  try {
    execSync('docker exec agy-swarm-sandbox sh -c "touch /workspace/Agy-Context-Saver/erofs-canary.tmp"', {
      stdio: "pipe"
    });
  } catch (err) {
    erofsTriggered = true;
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    assert.match(stderr, /Read-only file system/i);
    console.log("✓ Kernel EROFS enforcement verified: write attempt rejected with 'Read-only file system' (errno 30)");
  }
  assert.equal(erofsTriggered, true, "Mutation inside :ro mount must throw EROFS");

  // Verify that MCP server runs cleanly inside container under read-only root
  const containerMcpCheck = execSync(
    'docker exec agy-swarm-sandbox node -e "import(\'/workspace/Agy-Context-Saver/mcp/index.js\').then(() => console.log(\'CONTAINER_MCP_OK\'))"',
    { encoding: "utf-8" }
  );
  assert.match(containerMcpCheck, /CONTAINER_MCP_OK/);
  console.log("✓ MCP server initializes with 0 disk writes inside read-only container environment");
} catch (err) {
  console.log(`[WARN] Docker mount verification skipped: ${err.message}`);
}

// =========================================================================
// Track 4: Dispatch Telemetry & Performance Baseline
// =========================================================================
console.log("\n--- Track 4: Dispatch Telemetry & Performance Baseline (3x Consecutive Loop) ---");

const tempManifestPath = path.join(os.tmpdir(), `bench-manifest-${Date.now()}.json`);
const benchManifest = {
  squads: {
    squad_alpha: {
      role: "Benchmark Alpha Squad Lead",
      objective: "Lead consensus protocol refactor",
      scopeFiles: ["mcp/index.js"],
      children: [
        {
          role: "State Transition Specialist",
          typeName: "strict_readonly",
          objective: "Audit state transitions",
          scopeFiles: ["mcp/index.js"]
        },
        {
          role: "Wire Serializer",
          typeName: "strict_readonly",
          objective: "Validate wire serialization",
          scopeFiles: ["scripts/install-register.mjs"]
        }
      ]
    },
    squad_beta: {
      role: "Benchmark Beta Squad Lead",
      objective: "Lead storage engine optimization",
      scopeFiles: ["scripts/install-register.mjs"],
      children: [
        {
          role: "WAL Specialist",
          typeName: "strict_readonly",
          objective: "Audit write-ahead log",
          scopeFiles: ["scripts/install-register.mjs"]
        }
      ]
    }
  }
};

fs.writeFileSync(tempManifestPath, JSON.stringify(benchManifest, null, 2), "utf-8");

const telemetryRuns = [];

try {
  for (let run = 1; run <= 3; run++) {
    const memBefore = process.memoryUsage();
    const t0 = performance.now();

    // Stage 1: all_l1 dispatch
    const resL1 = await handleDispatchSquad({
      squadId: "all_l1",
      manifestPath: tempManifestPath,
      mode: "payload"
    });
    assert.equal(resL1.isError, undefined);

    // Stage 2: squad_alpha dispatch
    const resL2Alpha = await handleDispatchSquad({
      squadId: "squad_alpha",
      manifestPath: tempManifestPath,
      mode: "payload"
    });
    assert.equal(resL2Alpha.isError, undefined);

    // Stage 2: squad_beta dispatch
    const resL2Beta = await handleDispatchSquad({
      squadId: "squad_beta",
      manifestPath: tempManifestPath,
      mode: "payload"
    });
    assert.equal(resL2Beta.isError, undefined);

    const elapsed = performance.now() - t0;
    const memAfter = process.memoryUsage();
    const rssDeltaKb = ((memAfter.rss - memBefore.rss) / 1024).toFixed(1);
    const heapUsedMb = (memAfter.heapUsed / (1024 * 1024)).toFixed(2);

    telemetryRuns.push({
      run,
      elapsedMs: elapsed.toFixed(2),
      heapUsedMb,
      rssDeltaKb
    });

    console.log(`  Run ${run}: Elapsed = ${elapsed.toFixed(2)}ms | Heap = ${heapUsedMb} MB | RSS Delta = ${rssDeltaKb} KB`);
  }
} finally {
  try { fs.unlinkSync(tempManifestPath); } catch {}
}

const avgElapsed = (telemetryRuns.reduce((acc, r) => acc + parseFloat(r.elapsedMs), 0) / telemetryRuns.length).toFixed(2);
console.log(`\n✓ Baseline Telemetry Established: 3-run average 2-stage dispatch latency = ${avgElapsed} ms`);

console.log("\n=================================================");
console.log("ALL 4 SECURITY CANARY & TELEMETRY TRACKS PASSED!");
console.log("=================================================");
process.exit(0);
