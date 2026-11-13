// MCP stdio server smoke test: handshake, tool list, unknown tools, and exit when stdin closes.
// Starts only this MCP server process, never an agent.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { handleRequest } from "../mcp/index.js";
import { createRun } from "../mcp/run-state.mjs";

const server = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../mcp/index.js");
const proc = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
const rl = readline.createInterface({ input: proc.stdout, terminal: false });
const pending = new Map();
const unsolicited = [];
let nextId = 1;
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else {
    unsolicited.push(msg);
  }
});
const send = (method, params = {}) => new Promise((resolve) => {
  const id = nextId++;
  pending.set(id, resolve);
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});

console.log("Agy-Squad MCP server tests\n");

{
  const res = await send("initialize", { protocolVersion: "2024-11-05" });
  assert.equal(res.result.serverInfo.name, "agy-squad");
  console.log("✓ initialize handshake");
}
{
  for (const method of ["notifications/initialized", "notifications/cancelled", "notifications/roots/list_changed"]) {
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
  }
  const res = await send("ping");
  assert.deepEqual(res.result, {});
  assert.deepEqual(unsolicited, []);
  console.log("✓ handles keepalive and sends no replies to notifications");
}
{
  const res = await send("tools/list");
  assert.deepEqual(res.result.tools.map((t) => t.name), ["dispatch_squad"]);
  const dispatch = res.result.tools.find((t) => t.name === "dispatch_squad");
  assert.deepEqual(Object.keys(dispatch.inputSchema.properties).sort(), ["manifestPath", "squadId"], "no transport mode or spawn pacing in the schema");
  assert.equal(dispatch.inputSchema.properties.squadId.minLength, 1);
  assert.equal(dispatch.inputSchema.properties.manifestPath.minLength, 1);
  console.log("✓ tools/list exposes only dispatch_squad, with no spawn options");
}
{
  const res = await send("tools/call", { name: "dispatch_squad", arguments: { squadId: "all_l1", mode: "direct" } });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /Only squadId and manifestPath/);
  const unknown = await send("tools/call", { name: "subagent_brief" });
  assert.equal(unknown.error.code, -32601);
  for (const invalid of [null, 123, [], { jsonrpc: "2.0", id: 99 }, { id: 99, method: "ping" }]) {
    const err = await handleRequest(invalid);
    assert.equal(err.error.code, -32600);
  }
  const unknownMethod = await send("resources/list");
  assert.equal(unknownMethod.error.code, -32601);
  proc.stdin.write("{malformed json\n");
  const afterMalformed = await send("ping");
  assert.deepEqual(afterMalformed.result, {});
  assert.equal(unsolicited.pop()?.error?.code, -32700);
  console.log("✓ tools/call rejects direct mode, retired subagent_brief, and malformed JSON-RPC requests");
}
{
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agy-server-managed-")));
  try {
    const run = createRun(tmp);
    const active = spawnSync(process.execPath, [server], {
      cwd: tmp,
      env: { PATH: process.env.PATH, AGY_SQUAD_RUN_DIR: run.relative, AGY_SQUAD_SESSION: run.relative },
      input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n",
      encoding: "utf8"
    });
    assert.equal(active.status, 0, active.stderr);
    const listed = JSON.parse(active.stdout.trim()).result.tools[0];
    assert.deepEqual(Object.keys(listed.inputSchema.properties).sort(), ["manifest", "manifestPath", "squadId"]);
    assert.equal(listed.inputSchema.properties.manifest.properties.squads.minProperties, 1);
    const leadSchema = listed.inputSchema.properties.manifest.properties.squads.additionalProperties.properties.lead;
    assert.deepEqual(leadSchema.properties.workspace.enum, ["inherit"]);
    assert.deepEqual(leadSchema.properties.Workspace.enum, ["inherit"]);
    assert.equal(leadSchema.required, undefined, "PascalCase-only inline manifests must not fail camelCase required check");
    assert.equal(leadSchema.allOf.length, 2);
    assert.equal(fs.readFileSync(path.join(tmp, run.relative, ".mcp-ready"), "utf8"), "ready\n");

    const pascalCall = spawnSync(process.execPath, [server], {
      cwd: tmp,
      env: { PATH: process.env.PATH, AGY_SQUAD_RUN_DIR: run.relative, AGY_SQUAD_SESSION: run.relative },
      input: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: {
            name: "dispatch_squad",
            arguments: {
              squadId: "all_l1",
              manifest: {
                squads: {
                  alpha: {
                    Role: "Alpha Lead",
                    Objective: "Verify PascalCase inline lead",
                    ScopeFiles: ["README.md"],
                    specialists: [
                      {
                        Role: "Alpha Specialist",
                        Objective: "Verify PascalCase inline specialist",
                        ScopeFiles: ["README.md"]
                      }
                    ]
                  }
                }
              }
            }
          }
        }),
        JSON.stringify({
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: {
            name: "dispatch_squad",
            arguments: {
              squadId: "all_l1",
              manifest: {
                squads: {
                  alpha: {
                    objective: "camel",
                    Objective: "Pascal conflict",
                    scopeFiles: ["README.md"],
                    specialists: [{ objective: "spec", scopeFiles: ["README.md"] }]
                  }
                }
              }
            }
          }
        })
      ].join("\n") + "\n",
      encoding: "utf8"
    });
    assert.equal(pascalCall.status, 0, pascalCall.stderr);
    const [pascalOk, pascalConflict] = pascalCall.stdout.trim().split("\n").map(JSON.parse);
    assert.equal(Boolean(pascalOk.result.isError), false);
    assert.equal(pascalConflict.result.isError, true);
    assert.match(pascalConflict.result.content[0].text, /conflicting objective and Objective fields/);

    const neighbor = spawnSync(process.execPath, [server], {
      cwd: tmp,
      env: { PATH: process.env.PATH, AGY_SQUAD_RUN_DIR: run.relative, AGY_SQUAD_SESSION: "other-session" },
      input: [
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "dispatch_squad", arguments: { squadId: "all_l1" } } })
      ].join("\n") + "\n",
      encoding: "utf8"
    });
    const [neighborList, neighborCall] = neighbor.stdout.trim().split("\n").map(JSON.parse);
    assert.deepEqual(neighborList.result.tools, []);
    assert.equal(neighborCall.error.code, -32601);
    console.log("✓ managed-run session gating, PascalCase inline manifest schema, and .mcp-ready publication");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
{
  const capped = spawn(process.execPath, [server], {
    env: { ...process.env, AGY_MAX_STDIO_PAYLOAD_BYTES: "2048" },
    stdio: ["pipe", "pipe", "inherit"]
  });
  const cappedRl = readline.createInterface({ input: capped.stdout, terminal: false });
  const cappedMsgs = [];
  let notifyLine = null;
  cappedRl.on("line", (line) => {
    cappedMsgs.push(JSON.parse(line));
    if (notifyLine) notifyLine();
  });
  const waitForMsgCount = (count) =>
    new Promise((resolve, reject) => {
      if (cappedMsgs.length >= count) return resolve();
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${count} stdio messages`)), 4000);
      notifyLine = () => {
        if (cappedMsgs.length >= count) {
          clearTimeout(timer);
          notifyLine = null;
          resolve();
        }
      };
    });

  // Stream > 2048 bytes WITHOUT a newline: server must reject incrementally before \n arrives.
  capped.stdin.write(Buffer.alloc(1500, 0x61));
  capped.stdin.write(Buffer.alloc(1500, 0x62));
  await waitForMsgCount(1);
  assert.equal(cappedMsgs[0].error.code, -32600);
  assert.match(cappedMsgs[0].error.message, /exceeds 10MB safety ceiling/);

  // Terminate the dropped oversized frame and stream a valid request split mid-UTF8 character across chunks.
  capped.stdin.write("\n");
  const validBuf = Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 77, method: "ping", params: { note: "🔥" } }) + "\n", "utf8");
  const emojiIdx = validBuf.indexOf(Buffer.from("🔥", "utf8"));
  capped.stdin.write(validBuf.subarray(0, emojiIdx + 2));
  capped.stdin.write(validBuf.subarray(emojiIdx + 2));
  await waitForMsgCount(2);
  assert.equal(cappedMsgs[1].id, 77);
  assert.deepEqual(cappedMsgs[1].result, {});
  capped.stdin.end();
  await new Promise((resolve) => capped.on("exit", resolve));
  console.log("✓ incremental chunk-level 10MB stdio framing cap before newline and split UTF-8 recovery");
}
{
  const exited = new Promise((resolve) => proc.on("exit", (code) => resolve(code)));
  proc.stdin.end();
  const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r("timeout"), 5000))]);
  assert.equal(code, 0, "server must exit when stdin closes (anti-orphan)");
  console.log("✓ server exits when its parent closes stdin");
}

console.log("\nAll MCP server tests passed.");
