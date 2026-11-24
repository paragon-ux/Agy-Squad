// MCP stdio server smoke test: handshake, tool list, unknown tools, and exit when stdin closes.
// Starts only this MCP server process, never an agent.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { handleRequest, isDirectEntryPoint, isInstalledPluginDir, isNodeVersionSupported } from "../mcp/index.js";

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
  assert.deepEqual(Object.keys(dispatch.inputSchema.properties).sort(), ["manifestPath", "squadId", "workspace"], "no transport mode or spawn pacing in the schema");
  assert.doesNotMatch(dispatch.inputSchema.properties.squadId.description, /adversarial_/);
  assert.equal(dispatch.inputSchema.properties.squadId.minLength, 1);
  assert.equal(dispatch.inputSchema.properties.manifestPath.minLength, 1);
  assert.equal(dispatch.inputSchema.properties.workspace.minLength, 1);
  const planner = res.result.tools.find((t) => t.name === "squad_planner");
  assert.equal(planner.inputSchema.properties.workspace.minLength, 1);
  assert.ok(Array.isArray(planner.inputSchema.oneOf) && planner.inputSchema.oneOf.length === 3);
  assert.ok(Object.values(planner.inputSchema.properties).every((p) => typeof p.description === "string" && p.description.length > 0));
  assert.ok(planner.inputSchema.properties.executionMode.enum.includes("swarm"));
  assert.ok(planner.inputSchema.properties.executionMode.enum.includes("subagent"));
  assert.ok(planner.inputSchema.properties.boardSince && planner.inputSchema.properties.boardSeqs, "SQ-SWARM-BOARD-SCOPE schema fields exposed");
  assert.equal(planner.inputSchema.properties.readOnly?.type, "boolean", "OPT-IO-6: readOnly schema field exposed");
  assert.equal(planner.inputSchema.properties.roleScopes?.type, "object", "OPT-IO-6: roleScopes schema field exposed");
  assert.equal(planner.inputSchema.properties.roleScopes?.minProperties, 1, "R1-MCP-001: roleScopes schema enforces minProperties: 1");
  assert.equal(planner.inputSchema.properties.scopeFiles.description, "Task paths.", "OPT-GAP-SCHEMA-WORD: scopeFiles description must use 'Task paths.'");
  const toolsListBytes = Buffer.byteLength(JSON.stringify(res), "utf8");
  assert.ok(toolsListBytes <= 3072, `W4 target: tools/list response must stay <= 3072 B (got ${toolsListBytes})`);
  const invalidParamsRes = await handleRequest({ jsonrpc: "2.0", id: 98, method: "tools/call", params: null });
  assert.equal(invalidParamsRes.error.code, -32602);
  const arrayParamsRes = await handleRequest({ jsonrpc: "2.0", id: 99, method: "tools/call", params: [] });
  assert.equal(arrayParamsRes.error.code, -32602);
  console.log("✓ tools/list exposes dispatch_squad and squad_planner");
}
{
  const res = await send("tools/call", { name: "dispatch_squad", arguments: { squadId: "all_l1", mode: "direct" } });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /Only squadId, manifestPath, and workspace/);
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
  const optIo6Res = await send("tools/call", {
    name: "squad_planner",
    arguments: {
      task: "Audit server boundaries",
      roles: ["Security", "Docs"],
      readOnly: true,
      roleScopes: { Security: ["mcp/index.js"], Docs: ["docs/tools.md"] }
    }
  });
  assert.equal(Boolean(optIo6Res.result.isError), false, optIo6Res.result.content[0].text);
  const optIo6Payload = JSON.parse(optIo6Res.result.content[0].text);
  assert.equal(optIo6Payload.workers[0].specialists.length, 2);
  assert.equal(optIo6Payload.topology.siblingOverlaps.length, 0);
  assert.equal(optIo6Payload.topology.leadSpecialistOverlaps.length, 0);
  assert.ok(optIo6Payload.workers[0].specialists[0].swarmAdd.brief.includes("mcp/index.js"));
  assert.ok(optIo6Payload.workers[0].specialists[1].swarmAdd.brief.includes("docs/tools.md"));
  const manifestPlanRes = await send("tools/call", {
    name: "squad_planner",
    arguments: {
      manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
      executionMode: "swarm",
      workspaceIsolation: "share"
    }
  });
  assert.equal(Boolean(manifestPlanRes.result.isError), false, manifestPlanRes.result.content[0].text);
  const manifestPlan = JSON.parse(manifestPlanRes.result.content[0].text);
  assert.equal(manifestPlan.workers.length, 3);
  assert.ok(!manifestPlan.workers[0].lead.swarmAdd.brief.includes("dispatch_squad"));
  assert.ok(manifestPlan.workers[0].specialists[0].swarmAdd.brief.includes("post_message"));
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
  assert.equal(unknown.error.code, -32602);
  for (const invalid of [
    null,
    123,
    [],
    { jsonrpc: "2.0", id: 99 },
    { id: 99, method: "ping" },
    { jsonrpc: "2.0", id: null, method: "ping" },
    { jsonrpc: "2.0", id: true, method: "ping" },
    { jsonrpc: "2.0", id: {}, method: "ping" }
  ]) {
    const err = await handleRequest(invalid);
    assert.equal(err.error.code, -32600);
  }
  // MCP-007: subagent mode coerces non-alias models to 'inherit'
  const subagentCoerced = await handleRequest({
    jsonrpc: "2.0",
    id: 199,
    method: "tools/call",
    params: { name: "squad_planner", arguments: { task: "Verify coercion", executionMode: "subagent", model: "gemini-3.8-flash-high" } }
  });
  const coercedPayload = JSON.parse(subagentCoerced.result.content[0].text);
  assert.equal(coercedPayload.workers[0].specialists[0].Subagent.Model, "inherit");
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
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${count} stdio messages`)), 10000);
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
  assert.match(cappedMsgs[0].error.message, /exceeds 2048-byte safety ceiling/);

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
  console.log("✓ incremental chunk-level 2048-byte override stdio framing cap and split UTF-8 recovery");
}
{
  // TEST-001, MCP-003, MCP-004, MCP-005: default 10 MiB boundary, split \r\n framing, >500 KB early-EOF stdout drain, and invalid UTF-8 -32700
  const maxDefaultProc = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
  const maxChunks = [];
  maxDefaultProc.stdout.on("data", (d) => maxChunks.push(d));
  const maxExited = new Promise((resolve) => maxDefaultProc.on("close", resolve));
  maxDefaultProc.stdin.write(Buffer.alloc(10 * 1024 * 1024 + 1, 0x61));
  maxDefaultProc.stdin.write("\n");
  maxDefaultProc.stdin.end();
  assert.equal(await maxExited, 0);
  const maxMsg = JSON.parse(Buffer.concat(maxChunks).toString("utf8").trim());
  assert.equal(maxMsg.error.code, -32600);
  assert.match(maxMsg.error.message, /10485760-byte safety ceiling/);

  // MCP-003 & MCP-005: split CRLF across chunks and invalid UTF-8 fatal parse error
  const crlfProc = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
  const crlfChunks = [];
  crlfProc.stdout.on("data", (d) => crlfChunks.push(d));
  const crlfExited = new Promise((resolve) => crlfProc.on("close", resolve));
  crlfProc.stdin.write(Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 11, method: "ping" }) + "\r", "utf8"));
  crlfProc.stdin.write(Buffer.from("\n", "utf8"));
  crlfProc.stdin.write(Buffer.concat([Buffer.from('{"jsonrpc":"2.0","id":12,"method":"'), Buffer.from([0xff, 0xfe]), Buffer.from('"}\n')]));
  crlfProc.stdin.end();
  assert.equal(await crlfExited, 0);
  const crlfMsgs = Buffer.concat(crlfChunks).toString("utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(crlfMsgs.length, 2);
  assert.equal(crlfMsgs[0].id, 11);
  assert.equal(crlfMsgs[1].error.code, -32700);

  // Batch B MCP-003: multi-chunk oversized frame crossing cap on terminating newline chunk rejects pre-concat and recovers
  const splitCapProc = spawn(process.execPath, [server], {
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, AGY_MAX_STDIO_PAYLOAD_BYTES: "2048" }
  });
  const splitCapChunks = [];
  splitCapProc.stdout.on("data", (d) => splitCapChunks.push(d));
  const splitCapExited = new Promise((resolve) => splitCapProc.on("close", resolve));
  splitCapProc.stdin.write(Buffer.alloc(1500, 0x61));
  splitCapProc.stdin.write(Buffer.concat([Buffer.alloc(600, 0x62), Buffer.from("\n")]));
  splitCapProc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 13, method: "ping" }) + "\n");
  splitCapProc.stdin.end();
  assert.equal(await splitCapExited, 0);
  const splitCapMsgs = Buffer.concat(splitCapChunks).toString("utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(splitCapMsgs.length, 2);
  assert.equal(splitCapMsgs[0].error.code, -32600);
  assert.match(splitCapMsgs[0].error.message, /2048-byte safety ceiling/);
  assert.equal(splitCapMsgs[1].id, 13);

  // MCP-004: >500 KB response written while stdin closes immediately after sending the request (early EOF)
  const manyRoles = Array.from({ length: 120 }, (_, i) => `Role ${i + 1} Large Objective Padding`);
  const largeProc = spawn(process.execPath, [server], { stdio: ["pipe", "pipe", "inherit"] });
  const largeChunks = [];
  largeProc.stdout.on("data", (d) => largeChunks.push(d));
  const largeExited = new Promise((resolve) => largeProc.on("close", resolve));
  largeProc.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 404,
      method: "tools/call",
      params: { name: "squad_planner", arguments: { task: "Large stdio frame drain test", roles: manyRoles, executionMode: "swarm" } }
    }) + "\n"
  );
  largeProc.stdin.end();
  const largeExitCode = await largeExited;
  assert.equal(largeExitCode, 0);
  const largeRaw = Buffer.concat(largeChunks).toString("utf8");
  assert.ok(Buffer.byteLength(largeRaw, "utf8") > 500_000, `Expected >500 KB payload, got ${Buffer.byteLength(largeRaw, "utf8")}`);
  const largeParsed = JSON.parse(largeRaw.trim());
  assert.equal(largeParsed.id, 404);
  assert.equal(largeParsed.result.isError, undefined);
  console.log("✓ default 10 MiB framing ceiling, split CRLF, invalid UTF-8 -32700, and >500 KB early-EOF stdout drain");
}
{
  const repoRoot = fs.realpathSync.native(path.resolve(path.dirname(server), ".."));
  const runTmpSession = (requests, extraEnv = {}) => {
    const env = { ...process.env };
    delete env.AGY_SQUAD_WORKSPACE;
    Object.assign(env, extraEnv);
    const tmpProc = spawnSync(process.execPath, [server], {
      cwd: os.tmpdir(),
      env,
      input: requests.map((req) => JSON.stringify(req)).join("\n") + "\n",
      encoding: "utf8"
    });
    assert.equal(tmpProc.status, 0, tmpProc.stderr);
    return tmpProc.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  };

  // Without initialize rootUri or args.workspace, server cwd (tmpdir) surfaces actionable ENOENT diagnostic, while args.workspace succeeds
  const explicitWsResponses = runTmpSession([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "squad_planner",
        arguments: {
          manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
          workspace: repoRoot,
          executionMode: "swarm"
        }
      }
    },
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "dispatch_squad",
        arguments: {
          squadId: "all_l1",
          manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json",
          workspace: repoRoot
        }
      }
    }
  ]);
  assert.equal(explicitWsResponses[1].result.isError, true);
  assert.match(explicitWsResponses[1].result.content[0].text, /Pass 'workspace'/);
  assert.equal(Boolean(explicitWsResponses[2].result.isError), false, explicitWsResponses[2].result.content[0].text);
  assert.equal(
    JSON.parse(explicitWsResponses[2].result.content[0].text).workspace,
    repoRoot
  );
  assert.equal(Boolean(explicitWsResponses[3].result.isError), false, explicitWsResponses[3].result.content[0].text);
  assert.ok(JSON.parse(explicitWsResponses[3].result.content[0].text).Subagents.length >= 1);

  // Client initialize rootUri sets default workspace across subsequent calls and takes precedence over AGY_SQUAD_WORKSPACE
  const tmpAlt = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-env-override-")));
  try {
    const rootUriResponses = runTmpSession([
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", rootUri: pathToFileURL(repoRoot).href } },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "dispatch_squad", arguments: { squadId: "all_l1", manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
      },
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: "missing.json", workspace: tmpAlt } }
      }
    ], { AGY_SQUAD_WORKSPACE: tmpAlt });
    assert.equal(Boolean(rootUriResponses[1].result.isError), false, rootUriResponses[1].result.content[0].text);
    assert.equal(
      JSON.parse(rootUriResponses[1].result.content[0].text).workspace,
      repoRoot
    );
    assert.equal(Boolean(rootUriResponses[2].result.isError), false, rootUriResponses[2].result.content[0].text);
    assert.ok(JSON.parse(rootUriResponses[2].result.content[0].text).Subagents.length >= 1);
    assert.equal(rootUriResponses[3].result.isError, true);
    assert.match(rootUriResponses[3].result.content[0].text, new RegExp(tmpAlt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    fs.rmSync(tmpAlt, { recursive: true, force: true });
  }

  // RT-002 URI edge cases: skip empty/non-file/invalid/bare 'file://', accept uppercase 'FILE://', and fall back to rootPath
  const folderFallback = runTmpSession([
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        workspaceFolders: [
          { uri: "", name: "empty" },
          { uri: "vscode-vfs://github/test", name: "vfs" },
          { uri: "file://otherhost/tmp/wrong", name: "otherhost" },
          { uri: "file://%ZZ/bad", name: "badpct" },
          { uri: "file://", name: "bare" }
        ],
        rootUri: pathToFileURL(repoRoot).href.replace(/^file:/, "FILE:")
      }
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
    }
  ]);
  assert.equal(Boolean(folderFallback[1].result.isError), false, folderFallback[1].result.content[0].text);

  const rootPathFallback = runTmpSession([
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        workspaceFolders: [{ uri: "file://otherhost/tmp/wrong", name: "otherhost" }],
        rootPath: repoRoot
      }
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
    }
  ]);
  assert.equal(Boolean(rootPathFallback[1].result.isError), false, rootPathFallback[1].result.content[0].text);

  const blankEnvResponses = runTmpSession([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
    }
  ], { AGY_SQUAD_WORKSPACE: "   " });
  assert.equal(blankEnvResponses[1].result.isError, true);
  assert.doesNotMatch(blankEnvResponses[1].result.content[0].text, /workspace: '   '/);

  // SQ-MCP-001: Multi-root workspaceFolders matches manifestPath on secondary workspace root & surfaces multi-root ambiguity
  const emptySecondary = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-multiroot-empty-")));
  const dupManifestRoot = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-multiroot-dup-")));
  try {
    fs.mkdirSync(path.join(dupManifestRoot, ".agents", "skills", "self-diagnosis", "resources"), { recursive: true });
    fs.copyFileSync(
      path.join(repoRoot, ".agents", "skills", "self-diagnosis", "resources", "self-diagnosis-manifest.json"),
      path.join(dupManifestRoot, ".agents", "skills", "self-diagnosis", "resources", "self-diagnosis-manifest.json")
    );
    const multiRootHit = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(emptySecondary).href, name: "other" },
            { uri: pathToFileURL(repoRoot).href, name: "agy-squad" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
      }
    ]);
    assert.equal(Boolean(multiRootHit[1].result.isError), false, multiRootHit[1].result.content[0].text);
    assert.equal(
      JSON.parse(multiRootHit[1].result.content[0].text).workspace,
      repoRoot
    );

    const multiRootAmbiguous = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(dupManifestRoot).href, name: "dup" },
            { uri: pathToFileURL(repoRoot).href, name: "agy-squad" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: ".agents/skills/self-diagnosis/resources/self-diagnosis-manifest.json" } }
      }
    ]);
    assert.equal(multiRootAmbiguous[1].result.isError, true);
    assert.match(multiRootAmbiguous[1].result.content[0].text, /Ambiguous multi-root workspace/);

    // SQ-MCP-001 defaultManifests parity: omitted manifestPath matches swarm-manifest.json on secondary root & rejects ambiguity
    const swarmDefaultManifest = {
      squads: {
        alpha: {
          lead: { role: "Lead", objective: "Synthesize", scopeFiles: ["a"] },
          specialists: [{ role: "Spec", objective: "Audit", scopeFiles: ["a"] }]
        }
      }
    };
    fs.writeFileSync(path.join(dupManifestRoot, "swarm-manifest.json"), JSON.stringify(swarmDefaultManifest));
    const omittedDefaultHit = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(emptySecondary).href, name: "empty" },
            { uri: pathToFileURL(dupManifestRoot).href, name: "swarm-default" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "dispatch_squad", arguments: { squadId: "all_l1" } }
      }
    ]);
    assert.equal(Boolean(omittedDefaultHit[1].result.isError), false, omittedDefaultHit[1].result.content[0].text);
    const compiledDefault = JSON.parse(omittedDefaultHit[1].result.content[0].text);
    assert.equal(compiledDefault.Subagents[0].Role, "Lead");

    fs.writeFileSync(path.join(emptySecondary, "task-01-manifest.json"), JSON.stringify(swarmDefaultManifest));
    const omittedDefaultDup = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(emptySecondary).href, name: "first-default" },
            { uri: pathToFileURL(dupManifestRoot).href, name: "second-default" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "dispatch_squad", arguments: { squadId: "all_l1" } }
      }
    ]);
    assert.equal(omittedDefaultDup[1].result.isError, true);
    assert.match(omittedDefaultDup[1].result.content[0].text, /Ambiguous multi-root workspace/);
  } finally {
    fs.rmSync(emptySecondary, { recursive: true, force: true });
    fs.rmSync(dupManifestRoot, { recursive: true, force: true });
  }
  // W1 Regressions (MCP-001..004): trailing-slash root dedupe, non-plain-object arguments -> -32602, unsafe id, normalized relative manifestPath
  for (const badArgs of [null, [], "str", 42, true]) {
    const badArgsRes = await handleRequest({
      jsonrpc: "2.0",
      id: 201,
      method: "tools/call",
      params: { name: "dispatch_squad", arguments: badArgs }
    });
    assert.equal(badArgsRes.error?.code, -32602, `MCP-002: non-plain-object arguments=${JSON.stringify(badArgs)} must return -32602`);
  }
  const unsafeIdRes = await handleRequest({ jsonrpc: "2.0", id: 1e25, method: "ping" });
  assert.equal(unsafeIdRes.error?.code, -32600, "MCP-003: unsafe integer request id must be rejected with -32600");

  const dupSlashRoot = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-slash-root-")));
  const secondaryWs = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-rel-norm-")));
  try {
    fs.mkdirSync(path.join(dupSlashRoot, "sub"), { recursive: true });
    fs.writeFileSync(path.join(dupSlashRoot, "swarm-manifest.json"), JSON.stringify({
      squads: { alpha: { specialists: [{ role: "Spec", objective: "Check", scopeFiles: ["."] }] } }
    }));
    const slashHref = pathToFileURL(dupSlashRoot).href.replace(/\/$/, "");
    const slashRes = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: slashHref, name: "ws1" },
            { uri: `${slashHref}/`, name: "ws1-slash" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: "sub/../swarm-manifest.json" } }
      }
    ]);
    assert.equal(Boolean(slashRes[1].result.isError), false, `MCP-001/MCP-004: trailing-slash dedupe and sub/../manifestPath must succeed: ${slashRes[1].result.content[0].text}`);

    fs.mkdirSync(path.join(secondaryWs, "sub"), { recursive: true });
    fs.writeFileSync(path.join(secondaryWs, "target.json"), JSON.stringify({
      squads: { beta: { specialists: [{ role: "Beta", objective: "Check", scopeFiles: ["."] }] } }
    }));
    const multiNormRes = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(dupSlashRoot).href, name: "first" },
            { uri: pathToFileURL(secondaryWs).href, name: "second" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: "sub/../target.json" } }
      }
    ]);
    assert.equal(Boolean(multiNormRes[1].result.isError), false, `MCP-004: multi-root sub/../target.json must match secondary root: ${multiNormRes[1].result.content[0].text}`);
    assert.equal(JSON.parse(multiNormRes[1].result.content[0].text).workspace, secondaryWs);

    // Batch A MCP-001: multi-root initialize resolves absolute manifestPath inside secondary root for both dispatch_squad and squad_planner, and rejects ambiguous nested roots
    const absTargetManifest = path.join(secondaryWs, "target.json");
    const absMultiRes = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(dupSlashRoot).href, name: "r1" },
            { uri: pathToFileURL(secondaryWs).href, name: "r2" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: absTargetManifest } }
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "dispatch_squad", arguments: { squadId: "beta", manifestPath: absTargetManifest } }
      }
    ]);
    assert.equal(Boolean(absMultiRes[1].result.isError), false, `MCP-001: squad_planner must resolve absolute manifestPath in r2: ${absMultiRes[1].result.content[0].text}`);
    assert.equal(JSON.parse(absMultiRes[1].result.content[0].text).workspace, secondaryWs);
    assert.equal(Boolean(absMultiRes[2].result.isError), false, `MCP-001: dispatch_squad must resolve absolute manifestPath in r2: ${absMultiRes[2].result.content[0].text}`);
    assert.equal(JSON.parse(absMultiRes[2].result.content[0].text).Subagents[0].Role, "Beta");

    const nestedChildWs = path.join(secondaryWs, "nested-child");
    fs.mkdirSync(nestedChildWs, { recursive: true });
    const nestedAbsManifest = path.join(nestedChildWs, "nested.json");
    fs.writeFileSync(nestedAbsManifest, JSON.stringify({
      squads: { nested: { specialists: [{ role: "Nested Spec", objective: "Check", scopeFiles: ["."] }] } }
    }));
    const nestedAmbigRes = runTmpSession([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          workspaceFolders: [
            { uri: pathToFileURL(secondaryWs).href, name: "parent" },
            { uri: pathToFileURL(nestedChildWs).href, name: "child" }
          ]
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { manifestPath: nestedAbsManifest } }
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "dispatch_squad", arguments: { squadId: "nested", manifestPath: nestedAbsManifest } }
      }
    ]);
    assert.equal(nestedAmbigRes[1].result.isError, true, "MCP-001: squad_planner must reject ambiguous nested roots");
    assert.match(nestedAmbigRes[1].result.content[0].text, /Ambiguous multi-root workspace/);
    assert.equal(nestedAmbigRes[2].result.isError, true, "MCP-001: dispatch_squad must reject ambiguous nested roots");
    assert.match(nestedAmbigRes[2].result.content[0].text, /Ambiguous multi-root workspace/);

    // Session 3 MCP-004 & TEST-NEW-001: symlink-aliased multi-root manifestPath and outbound cross-root symlink containment
    const secondaryLink = path.join(path.dirname(secondaryWs), `${path.basename(secondaryWs)}-link`);
    fs.symlinkSync(secondaryWs, secondaryLink, os.platform() === "win32" ? "junction" : "dir");
    try {
      const symManifestRes = runTmpSession([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            workspaceFolders: [
              { uri: pathToFileURL(dupSlashRoot).href, name: "r1" },
              { uri: pathToFileURL(secondaryWs).href, name: "r2" }
            ]
          }
        },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "squad_planner", arguments: { manifestPath: path.join(secondaryLink, "target.json") } }
        },
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "dispatch_squad", arguments: { squadId: "beta", manifestPath: path.join(secondaryLink, "target.json") } }
        }
      ]);
      assert.equal(Boolean(symManifestRes[1].result.isError), false, `MCP-004: symlink-aliased manifestPath must pass squad_planner: ${symManifestRes[1].result.content[0].text}`);
      assert.equal(JSON.parse(symManifestRes[1].result.content[0].text).workspace, secondaryWs);
      assert.equal(Boolean(symManifestRes[2].result.isError), false, `MCP-004: symlink-aliased manifestPath must pass dispatch_squad: ${symManifestRes[2].result.content[0].text}`);
      assert.equal(JSON.parse(symManifestRes[2].result.content[0].text).Subagents[0].Role, "Beta");

      const symRootRes = runTmpSession([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            workspaceFolders: [
              { uri: pathToFileURL(dupSlashRoot).href, name: "r1" },
              { uri: pathToFileURL(secondaryLink).href, name: "r2-link" }
            ]
          }
        },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "squad_planner", arguments: { manifestPath: absTargetManifest } }
        },
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "dispatch_squad", arguments: { squadId: "beta", manifestPath: absTargetManifest } }
        }
      ]);
      assert.equal(Boolean(symRootRes[1].result.isError), false, `TEST-NEW-001: symlinked root + canonical manifestPath must pass squad_planner: ${symRootRes[1].result.content[0].text}`);
      assert.equal(JSON.parse(symRootRes[1].result.content[0].text).workspace, secondaryWs);
      assert.equal(Boolean(symRootRes[2].result.isError), false, `TEST-NEW-001: symlinked root + canonical manifestPath must pass dispatch_squad: ${symRootRes[2].result.content[0].text}`);
      assert.equal(JSON.parse(symRootRes[2].result.content[0].text).Subagents[0].Role, "Beta");

      const relSymRootRes = runTmpSession([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            workspaceFolders: [
              { uri: pathToFileURL(dupSlashRoot).href, name: "r1" },
              { uri: pathToFileURL(secondaryLink).href, name: "r2-link" }
            ]
          }
        },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "squad_planner", arguments: { manifestPath: "target.json" } }
        }
      ]);
      assert.equal(Boolean(relSymRootRes[1].result.isError), false, `relative manifestPath inside symlinked root must pass: ${relSymRootRes[1].result.content[0].text}`);
      assert.equal(JSON.parse(relSymRootRes[1].result.content[0].text).workspace, secondaryWs);

      const crossRootEscape = path.join(dupSlashRoot, "escape-to-r2.json");
      const relShadowEscape = path.join(dupSlashRoot, "target.json");
      const inRootAlias = path.join(secondaryWs, "in-root-alias.json");
      const danglingShadow = path.join(dupSlashRoot, "in-root-alias.json");
      let crossLinkCreated = false;
      try {
        fs.symlinkSync(absTargetManifest, crossRootEscape, "file");
        fs.symlinkSync(absTargetManifest, relShadowEscape, "file");
        fs.symlinkSync(absTargetManifest, inRootAlias, "file");
        fs.symlinkSync(path.join(dupSlashRoot, "missing-target.json"), danglingShadow, "file");
        crossLinkCreated = true;
      } catch (err) {
        if (err?.code !== "EPERM") throw err;
      }
      if (crossLinkCreated) {
        for (const folderPair of [[dupSlashRoot, secondaryWs], [secondaryWs, dupSlashRoot]]) {
          const escapeRes = runTmpSession([
            {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                workspaceFolders: [
                  { uri: pathToFileURL(folderPair[0]).href, name: "a" },
                  { uri: pathToFileURL(folderPair[1]).href, name: "b" }
                ]
              }
            },
            {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: { name: "squad_planner", arguments: { manifestPath: crossRootEscape } }
            },
            {
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: { name: "squad_planner", arguments: { manifestPath: "target.json" } }
            },
            {
              jsonrpc: "2.0",
              id: 4,
              method: "tools/call",
              params: { name: "dispatch_squad", arguments: { squadId: "beta", manifestPath: "target.json" } }
            },
            {
              jsonrpc: "2.0",
              id: 5,
              method: "tools/call",
              params: { name: "squad_planner", arguments: { manifestPath: "escape-to-r2.json" } }
            }
          ]);
          assert.equal(escapeRes[1].result.isError, true, "MCP-004: outbound cross-root symlink must be rejected");
          assert.match(escapeRes[1].result.content[0].text, /inside the workspace/);
          assert.doesNotMatch(escapeRes[1].result.content[0].text, /Ambiguous multi-root workspace/);
          assert.equal(Boolean(escapeRes[2].result.isError), false, `relative escaping symlink in sibling root must be skipped without ambiguity: ${escapeRes[2].result.content[0].text}`);
          assert.equal(JSON.parse(escapeRes[2].result.content[0].text).workspace, secondaryWs);
          assert.equal(Boolean(escapeRes[3].result.isError), false, `dispatch_squad relative escaping symlink in sibling root must be skipped: ${escapeRes[3].result.content[0].text}`);
          assert.equal(JSON.parse(escapeRes[3].result.content[0].text).Subagents[0].Role, "Beta");
          assert.equal(escapeRes[4].result.isError, true, "relative escaping symlink with no valid sibling root must fail closed");
          assert.doesNotMatch(escapeRes[4].result.content[0].text, /Ambiguous multi-root workspace/);
        }
        const inRootAliasRes = runTmpSession([
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              workspaceFolders: [
                { uri: pathToFileURL(dupSlashRoot).href, name: "r1" },
                { uri: pathToFileURL(secondaryWs).href, name: "r2" }
              ]
            }
          },
          {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: { name: "squad_planner", arguments: { manifestPath: "in-root-alias.json" } }
          }
        ]);
        assert.equal(Boolean(inRootAliasRes[1].result.isError), false, `valid in-workspace relative symlink must resolve: ${inRootAliasRes[1].result.content[0].text}`);
        assert.equal(JSON.parse(inRootAliasRes[1].result.content[0].text).workspace, secondaryWs);
      }

      // Cross-OS multi-root directory shadowing, escaping dir junction/symlink, drive-relative guard, and omitted-manifestPath defaultManifests containment
      const shadowRootA = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-shadow-a-")));
      const shadowRootB = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-shadow-b-")));
      const dirLinkType = os.platform() === "win32" ? "junction" : "dir";
      const escapeSubLink = path.join(shadowRootA, "sub-escape");
      const escapeScratchLink = path.join(shadowRootA, ".scratch");
      try {
        const betaManifestBody = JSON.stringify({
          squads: { beta: { specialists: [{ role: "Beta", objective: "Check", scopeFiles: ["."] }] } }
        });
        fs.mkdirSync(path.join(shadowRootA, "dir-shadow.json"), { recursive: true });
        fs.mkdirSync(path.join(shadowRootA, "task-01-manifest.json"), { recursive: true });
        fs.mkdirSync(path.join(shadowRootB, "sub-escape"), { recursive: true });
        fs.writeFileSync(path.join(shadowRootB, "dir-shadow.json"), betaManifestBody);
        fs.writeFileSync(path.join(shadowRootB, "swarm-manifest.json"), betaManifestBody);
        fs.writeFileSync(path.join(shadowRootB, "sub-escape", "target.json"), betaManifestBody);
        fs.symlinkSync(path.join(shadowRootB, "sub-escape"), escapeSubLink, dirLinkType);
        fs.symlinkSync(shadowRootB, escapeScratchLink, dirLinkType);

        for (const pair of [[shadowRootA, shadowRootB], [shadowRootB, shadowRootA]]) {
          const shadowRes = runTmpSession([
            {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                workspaceFolders: [
                  { uri: pathToFileURL(pair[0]).href, name: "sa" },
                  { uri: pathToFileURL(pair[1]).href, name: "sb" }
                ]
              }
            },
            {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: { name: "squad_planner", arguments: { manifestPath: "dir-shadow.json" } }
            },
            {
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: { name: "squad_planner", arguments: { manifestPath: "sub-escape/target.json" } }
            },
            {
              jsonrpc: "2.0",
              id: 4,
              method: "tools/call",
              params: { name: "dispatch_squad", arguments: { squadId: "beta" } }
            },
            {
              jsonrpc: "2.0",
              id: 5,
              method: "tools/call",
              params: { name: "squad_planner", arguments: { manifestPath: "C:dir-shadow.json" } }
            }
          ]);
          assert.equal(Boolean(shadowRes[1].result.isError), false, `directory shadowing relative manifestPath must be skipped: ${shadowRes[1].result.content[0].text}`);
          assert.equal(JSON.parse(shadowRes[1].result.content[0].text).workspace, shadowRootB);
          assert.equal(Boolean(shadowRes[2].result.isError), false, `escaping dir symlink/junction on relative manifestPath must be skipped: ${shadowRes[2].result.content[0].text}`);
          assert.equal(JSON.parse(shadowRes[2].result.content[0].text).workspace, shadowRootB);
          assert.equal(Boolean(shadowRes[3].result.isError), false, `omitted manifestPath must skip directory and escaping .scratch junction: ${shadowRes[3].result.content[0].text}`);
          assert.equal(JSON.parse(shadowRes[3].result.content[0].text).Subagents[0].Role, "Beta");
          assert.equal(shadowRes[4].result.isError, true, "Windows drive-relative manifestPath must fail closed");
          assert.doesNotMatch(shadowRes[4].result.content[0].text, /Ambiguous multi-root workspace/);
        }

        if (crossLinkCreated) {
          fs.symlinkSync(path.join(shadowRootB, "swarm-manifest.json"), path.join(shadowRootA, "swarm-manifest.json"), "file");
          for (const pair of [[shadowRootA, shadowRootB], [shadowRootB, shadowRootA]]) {
            const defaultSymRes = runTmpSession([
              {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                  protocolVersion: "2024-11-05",
                  workspaceFolders: [
                    { uri: pathToFileURL(pair[0]).href, name: "sa" },
                    { uri: pathToFileURL(pair[1]).href, name: "sb" }
                  ]
                }
              },
              {
                jsonrpc: "2.0",
                id: 2,
                method: "tools/call",
                params: { name: "dispatch_squad", arguments: { squadId: "beta" } }
              }
            ]);
            assert.equal(Boolean(defaultSymRes[1].result.isError), false, `omitted manifestPath must skip escaping default-manifest file symlink: ${defaultSymRes[1].result.content[0].text}`);
            assert.equal(JSON.parse(defaultSymRes[1].result.content[0].text).Subagents[0].Role, "Beta");
          }
          // Valid in-workspace default-manifest symlink in secondary root resolves cleanly
          fs.rmSync(path.join(shadowRootB, "swarm-manifest.json"));
          fs.symlinkSync(path.join(shadowRootB, "dir-shadow.json"), path.join(shadowRootB, "swarm-manifest.json"), "file");
          const validDefaultSymRes = runTmpSession([
            {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                workspaceFolders: [
                  { uri: pathToFileURL(shadowRootA).href, name: "sa" },
                  { uri: pathToFileURL(shadowRootB).href, name: "sb" }
                ]
              }
            },
            {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: { name: "dispatch_squad", arguments: { squadId: "beta" } }
            }
          ]);
          assert.equal(Boolean(validDefaultSymRes[1].result.isError), false, `valid in-workspace default-manifest symlink must resolve: ${validDefaultSymRes[1].result.content[0].text}`);
          assert.equal(JSON.parse(validDefaultSymRes[1].result.content[0].text).Subagents[0].Role, "Beta");
        }
      } finally {
        fs.rmSync(escapeSubLink, { recursive: true, force: true });
        fs.rmSync(escapeScratchLink, { recursive: true, force: true });
        fs.rmSync(shadowRootA, { recursive: true, force: true });
        fs.rmSync(shadowRootB, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(secondaryLink, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dupSlashRoot, { recursive: true, force: true });
    fs.rmSync(secondaryWs, { recursive: true, force: true });
  }

  console.log("✓ explicit workspace arg, initialize URIs, multi-root resolution, fallback precedence, and env isolation work cleanly");

  // RAW-MCP-001, RAW-MCP-002, RAW-DEP-001, RAW-TEST-001: refuse silent plugin-dir fallback, case-insensitive entry check, Node >= 22 guard
  assert.equal(isNodeVersionSupported("20.18.0"), false);
  assert.equal(isNodeVersionSupported("v20.19.1"), false);
  assert.equal(isNodeVersionSupported("22.0.0"), true);
  assert.equal(isNodeVersionSupported("22.0.0-rc.1"), true);
  assert.equal(isNodeVersionSupported("v24.1.0"), true);
  assert.equal(isNodeVersionSupported("junk 22.0.0"), false);
  assert.equal(isNodeVersionSupported("22.0.0junk"), false);

  assert.equal(isDirectEntryPoint("C:\\Users\\Dev\\mcp\\index.js", "c:\\users\\dev\\mcp\\index.js", "win32"), true);
  assert.equal(isDirectEntryPoint("C:/Users/Dev/mcp/index.js", "c:\\users\\dev\\mcp\\index.js", "win32"), true);
  assert.equal(isDirectEntryPoint("/Users/Dev/mcp/index.js", "/users/dev/mcp/index.js", "darwin"), true);
  assert.equal(isDirectEntryPoint("/Users/Dev/mcp/index.js", "/users/dev/mcp/index.js", "linux"), false);
  assert.equal(isInstalledPluginDir(repoRoot), false, "Source checkout with .git/tests must not be treated as an installed plugin directory");
  assert.equal(isInstalledPluginDir(path.join(repoRoot, "mcp")), false, "Subdirectory inside source checkout must not be treated as an installed plugin directory");

  const simHome = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-plugin-cwd-")));
  const simPluginDir = path.join(simHome, ".gemini", "config", "plugins", "agy-squad");
  const simCustomPkgPlugin = path.join(simHome, "custom-plugin-copy");
  try {
    fs.mkdirSync(simPluginDir, { recursive: true });
    fs.writeFileSync(path.join(simPluginDir, "package.json"), JSON.stringify({ name: "agy-squad", version: "0.1.3" }));
    fs.writeFileSync(path.join(simPluginDir, "plugin.json"), JSON.stringify({ name: "agy-squad", version: "0.1.3" }));

    fs.mkdirSync(path.join(simCustomPkgPlugin, "mcp"), { recursive: true });
    fs.writeFileSync(path.join(simCustomPkgPlugin, "package.json"), JSON.stringify({ name: "agy-squad", version: "0.1.3" }));
    fs.writeFileSync(path.join(simCustomPkgPlugin, "plugin.json"), JSON.stringify({ name: "agy-squad", version: "0.1.3" }));

    const runInCwd = (cwd, requests) => {
      const env = { ...process.env };
      delete env.AGY_SQUAD_WORKSPACE;
      const p = spawnSync(process.execPath, [server], {
        cwd,
        env,
        input: requests.map((req) => JSON.stringify(req)).join("\n") + "\n",
        encoding: "utf8"
      });
      assert.equal(p.status, 0, p.stderr);
      return p.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    };

    const pluginCwdResponses = runInCwd(simPluginDir, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "squad_planner",
          arguments: { task: "Review this repository", roles: ["Security", "Tests"], scopeFiles: ["src"] }
        }
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "squad_planner",
          arguments: {
            manifest: { squads: { alpha: { specialists: [{ role: "Spec", objective: "Audit", scopeFiles: ["."] }] } } }
          }
        }
      },
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "squad_planner",
          arguments: { task: "Review this repository", roles: ["Security"], scopeFiles: ["mcp"], workspace: repoRoot }
        }
      }
    ]);
    assert.equal(pluginCwdResponses[1].result.isError, true, "RAW-MCP-001: task mode from plugin cwd without workspace must fail closed");
    assert.match(pluginCwdResponses[1].result.content[0].text, /Refusing to target the installed Agy-Squad plugin directory/);
    assert.match(pluginCwdResponses[1].result.content[0].text, /Pass 'workspace'/);
    assert.equal(pluginCwdResponses[2].result.isError, true, "RAW-MCP-001: inline manifest from plugin cwd without workspace must fail closed");
    assert.match(pluginCwdResponses[2].result.content[0].text, /Refusing to target the installed Agy-Squad plugin directory/);
    assert.equal(Boolean(pluginCwdResponses[3].result.isError), false, pluginCwdResponses[3].result.content[0].text);
    assert.equal(
      JSON.parse(pluginCwdResponses[3].result.content[0].text).workspace,
      repoRoot
    );

    const rootUriFallbackResponses = runInCwd(simPluginDir, [
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", rootUri: pathToFileURL(repoRoot).href }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "squad_planner",
          arguments: { task: "Review this repository", roles: ["Security"], scopeFiles: ["mcp"] }
        }
      }
    ]);
    assert.equal(
      Boolean(rootUriFallbackResponses[1].result.isError),
      false,
      rootUriFallbackResponses[1].result.content[0].text
    );
    assert.equal(
      JSON.parse(rootUriFallbackResponses[1].result.content[0].text).workspace,
      repoRoot,
      "RAW-MCP-001: initialize rootUri must supply workspace cleanly even when MCP cwd is installed plugin directory"
    );

    const customPluginResponses = runInCwd(simCustomPkgPlugin, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { task: "Review repo", roles: ["Spec"] } }
      }
    ]);
    assert.equal(customPluginResponses[1].result.isError, true, "RAW-MCP-001: packaged plugin copy without .git/tests must also fail closed");
    assert.match(customPluginResponses[1].result.content[0].text, /Refusing to target the installed Agy-Squad plugin directory/);

    const customPluginSubdirResponses = runInCwd(path.join(simCustomPkgPlugin, "mcp"), [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "squad_planner", arguments: { task: "Review repo", roles: ["Spec"] } }
      }
    ]);
    assert.equal(customPluginSubdirResponses[1].result.isError, true, "RAW-MCP-001: subdirectory of installed plugin copy must also fail closed");
    assert.match(customPluginSubdirResponses[1].result.content[0].text, /Refusing to target the installed Agy-Squad plugin directory/);
  } finally {
    fs.rmSync(simHome, { recursive: true, force: true });
  }
  console.log("✓ global plugin cwd guard, case-insensitive entry detection, and Node >= 22 version check");
}
{
  // PR15-MCP-001: workspaceFolders advertising canonical + symlink aliases of the same repo collapse without false multi-root ambiguity
  const aliasBase = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agy-squad-alias-root-")));
  const wsReal = path.join(aliasBase, "repo-real");
  const wsLink = path.join(aliasBase, "repo-link");
  fs.mkdirSync(wsReal, { recursive: true });
  const aliasManifestPath = path.join(wsReal, "swarm-manifest.json");
  fs.writeFileSync(
    aliasManifestPath,
    JSON.stringify({
      squads: {
        alpha: {
          lead: { role: "Lead", objective: "Lead", scopeFiles: ["."] },
          specialists: [{ role: "Spec", objective: "Audit", scopeFiles: ["."] }]
        }
      }
    })
  );
  fs.symlinkSync(wsReal, wsLink, os.platform() === "win32" ? "junction" : "dir");
  try {
    const runAliasSession = (requests) => {
      const res = spawnSync(process.execPath, [server], {
        cwd: aliasBase,
        env: { ...process.env, AGY_SQUAD_WORKSPACE: "" },
        input: requests.map((r) => JSON.stringify(r)).join("\n") + "\n",
        encoding: "utf8",
        timeout: 15000
      });
      assert.equal(res.status, 0, res.stderr);
      return res.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    };
    for (const pair of [[wsReal, wsLink], [wsLink, wsReal]]) {
      const responses = runAliasSession([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            workspaceFolders: [
              { uri: pathToFileURL(pair[0]).href, name: "first" },
              { uri: pathToFileURL(pair[1]).href, name: "second" }
            ],
            rootUri: pathToFileURL(wsLink).href
          }
        },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "squad_planner", arguments: { manifestPath: path.join(wsLink, "swarm-manifest.json") } }
        },
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "squad_planner", arguments: { manifestPath: "swarm-manifest.json" } }
        },
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "dispatch_squad", arguments: { squadId: "alpha" } }
        }
      ]);
      assert.equal(Boolean(responses[1].result.isError), false, `PR15-MCP-001 abs: ${responses[1].result.content[0].text}`);
      assert.equal(JSON.parse(responses[1].result.content[0].text).workspace, wsReal);
      assert.equal(Boolean(responses[2].result.isError), false, `PR15-MCP-001 rel: ${responses[2].result.content[0].text}`);
      assert.equal(JSON.parse(responses[2].result.content[0].text).workspace, wsReal);
      assert.equal(Boolean(responses[3].result.isError), false, `PR15-MCP-001 default: ${responses[3].result.content[0].text}`);
      assert.equal(JSON.parse(responses[3].result.content[0].text).Subagents[0].Role, "Spec");
    }
  } finally {
    fs.rmSync(aliasBase, { recursive: true, force: true });
  }
  console.log("✓ symlink-aliased workspace roots collapse without multi-root ambiguity");
}
{
  const selfPkg = await import("agy-squad");
  assert.equal(typeof selfPkg.handleRequest, "function");
  assert.ok(Array.isArray(selfPkg.TOOLS) && selfPkg.TOOLS.length === 2);
  const pkgMeta = createRequire(import.meta.url)("agy-squad/package.json");
  assert.equal(pkgMeta.name, "agy-squad");
  await assert.rejects(() => import("agy-squad/mcp/dispatch.mjs"), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
  console.log("✓ package.json exports map exposes root/package.json and encapsulates internal subpaths");
}
{
  const exited = new Promise((resolve) => proc.on("exit", (code) => resolve(code)));
  proc.stdin.end();
  const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r("timeout"), 5000))]);
  assert.equal(code, 0, "server must exit when stdin closes (anti-orphan)");
  console.log("✓ server exits when its parent closes stdin");
}

console.log("\nAll MCP server tests passed.");
