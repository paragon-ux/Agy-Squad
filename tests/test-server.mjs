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
  assert.deepEqual(res.result.tools.map((t) => t.name), ["dispatch_squad", "squad_planner"]);
  const dispatch = res.result.tools.find((t) => t.name === "dispatch_squad");
  assert.deepEqual(Object.keys(dispatch.inputSchema.properties).sort(), ["manifestPath", "squadId"], "no transport mode or spawn pacing in the schema");
  assert.equal(dispatch.inputSchema.properties.squadId.minLength, 1);
  assert.equal(dispatch.inputSchema.properties.manifestPath.minLength, 1);
  const planner = res.result.tools.find((t) => t.name === "squad_planner");
  assert.ok(planner.inputSchema.properties.executionMode.enum.includes("swarm"));
  assert.ok(planner.inputSchema.properties.executionMode.enum.includes("subagent"));
  console.log("✓ tools/list exposes dispatch_squad and squad_planner");
}
{
  const res = await send("tools/call", { name: "dispatch_squad", arguments: { squadId: "all_l1", mode: "direct" } });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /Only squadId and manifestPath/);
  const dispatchOk = await send("tools/call", {
    name: "dispatch_squad",
    arguments: {
      squadId: "all_l1",
      manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json"
    }
  });
  assert.equal(Boolean(dispatchOk.result.isError), false, dispatchOk.result.content[0].text);
  const dispatchPayload = JSON.parse(dispatchOk.result.content[0].text);
  assert.ok(Array.isArray(dispatchPayload.Subagents) && dispatchPayload.Subagents.length >= 1);
  assert.equal(typeof dispatchPayload.Subagents[0].Role, "string");
  assert.equal(typeof dispatchPayload.Subagents[0].Prompt, "string");
  const planRes = await send("tools/call", {
    name: "squad_planner",
    arguments: {
      task: "Audit server boundaries",
      scopeFiles: ["mcp/index.js"],
      roles: ["Inspector"],
      model: "gemini-4-hydrogen-high",
      knownModels: ["gemini-4-hydrogen-high"]
    }
  });
  assert.equal(Boolean(planRes.result.isError), false, planRes.result.content[0].text);
  const planPayload = JSON.parse(planRes.result.content[0].text);
  assert.equal(planPayload.executionMode, "swarm");
  assert.equal(planPayload.modelProvenance.pinningSupported, true);
  assert.equal(planPayload.modelValidation.status, "checked-against-supplied-list");
  const badKnownModel = await send("tools/call", {
    name: "squad_planner",
    arguments: {
      task: "Audit server boundaries",
      scopeFiles: ["mcp/index.js"],
      model: "typo-model",
      knownModels: ["gemini-4-hydrogen-high"]
    }
  });
  assert.equal(badKnownModel.result.isError, true);
  assert.match(badKnownModel.result.content[0].text, /not in knownModels: typo-model/);
  const badPlan = await send("tools/call", {
    name: "squad_planner",
    arguments: { task: "conflict", manifestPath: "x.json" }
  });
  assert.equal(badPlan.result.isError, true);
  assert.match(badPlan.result.content[0].text, /exactly one/);
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
  console.log("✓ tools/call executes squad_planner, rejects direct mode, retired subagent_brief, and malformed JSON-RPC");
}
{
  // F-07(6): Non-positive or invalid AGY_MAX_STDIO_PAYLOAD_BYTES falls back safely to 10MB default.
  for (const badEnv of ["-1", "abc", "0"]) {
    const invalidLimit = spawnSync(process.execPath, [server], {
      env: { ...process.env, AGY_MAX_STDIO_PAYLOAD_BYTES: badEnv },
      input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) + "\n",
      encoding: "utf8"
    });
    assert.equal(invalidLimit.status, 0, invalidLimit.stderr);
    assert.deepEqual(JSON.parse(invalidLimit.stdout.trim()).result, {});
  }
  console.log("✓ invalid or non-positive AGY_MAX_STDIO_PAYLOAD_BYTES safely falls back to 10MB default");
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
