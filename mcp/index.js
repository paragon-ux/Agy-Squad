#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { handleDispatchSquad } from "./dispatch.mjs";
import { publish } from "./handoffs.mjs";

const __filename = fileURLToPath(import.meta.url);
const realOrSelf = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const isEntryPoint = Boolean(process.argv[1] && realOrSelf(process.argv[1]) === realOrSelf(__filename));

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const SERVER_NAME = "agy-squad";
const managedRun = process.env.AGY_SQUAD_RUN_DIR;
// A neighboring CLI can discover the workspace plugin while this run is active.
const activeRun = !managedRun || process.env.AGY_SQUAD_SESSION === managedRun;
const TOOLS = [{
  name: "dispatch_squad",
  description: managedRun
    ? "Prepare one stage from a supplied task plan or workspace manifest and return its native Subagents payload. Antigravity performs launches."
    : "Compile leads (all_l1) or one squad's specialists from a workspace manifest into a native Subagents payload.",
  inputSchema: {
    type: "object",
    properties: {
      squadId: { type: "string", description: "'all_l1' for leads, or the ID of one squad for its specialists." },
      manifestPath: { type: "string", description: "Path to a manifest inside the workspace." },
      ...(managedRun ? {
        manifest: {
          type: "object",
          description: "Inline plan with a squads object keyed by squad ID. Each squad has specialists and an optional lead. Provide this or manifestPath.",
          properties: {
            squads: { type: "object", additionalProperties: { type: "object" } }
          },
          required: ["squads"]
        }
      } : {})
    },
    required: ["squadId"],
    additionalProperties: false
  }
}];

async function handleRequest(request) {
  const { id, method, params } = request;

  // Notifications carry no request ID and must not produce a response.
  if (id === undefined) return null;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: SERVER_NAME, version: pkg.version },
        capabilities: { tools: {} }
      }
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: activeRun ? TOOLS : [] } };
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    if (!activeRun || name !== "dispatch_squad") {
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Tool not found: ${name}` } };
    }
    return { jsonrpc: "2.0", id, result: handleDispatchSquad(args, undefined, managedRun) };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

if (isEntryPoint) {
  const MAX_STDIO_PAYLOAD_BYTES = Number(process.env.AGY_MAX_STDIO_PAYLOAD_BYTES) || (10 * 1024 * 1024);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  rl.on("line", async (line) => {
    if (!line || !line.trim()) return;
    if (line.length > MAX_STDIO_PAYLOAD_BYTES) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Invalid Request: Payload exceeds 10MB safety ceiling" }
      }) + "\n");
      return;
    }
    try {
      const resp = await handleRequest(JSON.parse(line));
      if (resp) process.stdout.write(JSON.stringify(resp) + "\n");
      if (managedRun && resp?.result?.tools === TOOLS) {
        try {
          publish(process.env.AGY_SQUAD_WORKSPACE, `${managedRun}/.mcp-ready`, Buffer.from("ready\n"));
        } catch (error) {
          process.stderr.write(`Agy-Squad readiness signal failed: ${error.message}\n`);
        }
      }
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse error: ${err.message}` }
      }) + "\n");
    }
  });

  // Anti-orphan: exit when the parent closes stdio or goes away
  rl.on("close", () => process.exit(0));
  process.stdin.on("end", () => process.exit(0));
  process.stdin.on("close", () => process.exit(0));
  process.stdout.on("error", (err) => {
    if (err && err.code === "EPIPE") process.exit(0);
  });

  const initialPpid = process.ppid;
  if (initialPpid && initialPpid > 1) {
    const watchdog = setInterval(() => {
      try {
        process.kill(initialPpid, 0);
      } catch (err) {
        if (err && err.code === "ESRCH") process.exit(0);
      }
    }, 15000);
    watchdog.unref();
  }
}

export { TOOLS, handleRequest };
