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
const agentSchema = managedRun
  ? {
      type: "object",
      properties: {
        role: { type: "string", minLength: 1 },
        objective: { type: "string", minLength: 1 },
        scopeFiles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
        instructions: { type: "string" },
        expectedDeliverable: { type: "string", minLength: 1 },
        typeName: { type: "string", minLength: 1, not: { enum: ["research"] } },
        model: { type: "string", minLength: 1 },
        workspace: { type: "string", enum: ["inherit"] }
      },
      required: ["objective", "scopeFiles"]
    }
  : null;
const TOOLS = [{
  name: "dispatch_squad",
  description: managedRun
    ? "Prepare one stage from an inline plan or workspace manifest into a native Subagents payload."
    : "Compile leads (all_l1) or one squad's specialists from a workspace manifest into a native Subagents payload.",
  inputSchema: {
    type: "object",
    properties: {
      squadId: { type: "string", minLength: 1, description: "'all_l1' for leads, or one squad ID for specialists." },
      manifestPath: { type: "string", minLength: 1, description: "Workspace-relative manifest path." },
      ...(managedRun ? {
        manifest: {
          type: "object",
          description: "Inline squads plan (mutually exclusive with manifestPath; canonical camelCase fields shown, non-conflicting PascalCase aliases accepted at runtime).",
          properties: {
            squads: {
              type: "object",
              minProperties: 1,
              additionalProperties: {
                type: "object",
                properties: {
                  ...agentSchema.properties,
                  lead: agentSchema,
                  specialists: { type: "array", minItems: 1, items: agentSchema },
                  children: { type: "array", minItems: 1, items: agentSchema }
                },
                anyOf: [{ required: ["specialists"] }, { required: ["children"] }]
              }
            }
          },
          required: ["squads"],
          additionalProperties: false
        }
      } : {})
    },
    required: ["squadId"],
    additionalProperties: false
  }
}];

async function handleRequest(request) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    request.jsonrpc !== "2.0" ||
    typeof request.method !== "string" ||
    !request.method.trim()
  ) {
    const id = request && typeof request === "object" && !Array.isArray(request) && "id" in request ? request.id : null;
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
  }
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
    if (Buffer.byteLength(line, "utf8") > MAX_STDIO_PAYLOAD_BYTES) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Invalid Request: Payload exceeds 10MB safety ceiling" }
      }) + "\n");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse error: ${err.message}` }
      }) + "\n");
      return;
    }
    try {
      const resp = await handleRequest(parsed);
      if (resp) process.stdout.write(JSON.stringify(resp) + "\n");
      if (managedRun && resp?.result?.tools === TOOLS) {
        try {
          const root = fs.realpathSync(process.env.AGY_SQUAD_WORKSPACE || process.cwd());
          publish(root, `${managedRun}/.mcp-ready`, Buffer.from("ready\n"));
        } catch (error) {
          process.stderr.write(`Agy-Squad readiness signal failed: ${error.message}\n`);
        }
      }
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: parsed && typeof parsed === "object" && "id" in parsed ? parsed.id : null,
        error: { code: -32603, message: `Internal error: ${err.message}` }
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
