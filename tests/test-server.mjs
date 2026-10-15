// MCP stdio server smoke test: handshake, tool list, unknown tools, and exit when stdin closes.
// Starts only this MCP server process, never an agent.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const server = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../mcp/index.js");
const proc = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
const rl = readline.createInterface({ input: proc.stdout, terminal: false });
const pending = new Map();
let nextId = 1;
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
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
  const res = await send("tools/list");
  assert.deepEqual(res.result.tools.map((t) => t.name), ["subagent_brief", "dispatch_squad"]);
  const dispatch = res.result.tools.find((t) => t.name === "dispatch_squad");
  assert.deepEqual(Object.keys(dispatch.inputSchema.properties).sort(), ["manifestPath", "squadId"], "no transport mode or spawn pacing in the schema");
  console.log("✓ tools/list exposes exactly subagent_brief and dispatch_squad, with no spawn options");
}
{
  const res = await send("tools/call", { name: "subagent_brief", arguments: { objective: "Analyze test failures", scopeFiles: ["tests/test_foo.py"] } });
  assert.match(res.result.content[0].text, /READY-TO-USE invoke_subagent PAYLOAD/);
  const unknown = await send("tools/call", { name: "check_context_health" });
  assert.equal(unknown.error.code, -32601);
  console.log("✓ tools/call routes subagent_brief and rejects unknown tools");
}
{
  const exited = new Promise((resolve) => proc.on("exit", (code) => resolve(code)));
  proc.stdin.end();
  const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r("timeout"), 5000))]);
  assert.equal(code, 0, "server must exit when stdin closes (anti-orphan)");
  console.log("✓ server exits when its parent closes stdin");
}

console.log("\nAll MCP server tests passed.");
