#!/usr/bin/env node
// Agy-Squad MCP server (stdio JSON-RPC): subagent_brief and dispatch_squad.
//
// Not installable yet. Until the Docker sandbox and the spawn gate exist (docs/plans, P1-P3),
// payloads from this server would start unsandboxed host subagents, so nothing registers it
// with Antigravity. Run it only from the tests.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { SERVER_NAME, handleSubagentBrief } from "./briefs.mjs";
import { handleDispatchSquad } from "./dispatch.mjs";

const __filename = fileURLToPath(import.meta.url);
const realOrSelf = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const isEntryPoint = Boolean(process.argv[1] && realOrSelf(process.argv[1]) === realOrSelf(__filename));

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const SPEC_PROPERTIES = {
  role: { type: "string", description: "2-5 word role description." },
  objective: { type: "string", description: "The core objective for this subagent." },
  instructions: { type: "string", description: "Optional step-by-step instructions." },
  scopeFiles: { type: "array", items: { type: "string" }, description: "Mandatory files/directories this subagent may inspect/edit." },
  expectedDeliverable: { type: "string", description: "Expected deliverable format." },
  typeName: { type: "string", description: "Subagent type name ('self', 'research', or a custom type)." },
  model: { type: "string", enum: ["inherit", "flash_lite", "flash", "pro"], description: "Model tier." },
  workspace: { type: "string", enum: ["inherit", "branch", "share"], description: "Workspace isolation." }
};

const CHILDREN_SCHEMA = {
  type: "array",
  description: "For tier='L1_lead' only: L2_leaf subagent specifications pre-compiled into the L1 Squad Lead's prompt.",
  items: { type: "object", properties: SPEC_PROPERTIES, required: ["objective", "scopeFiles"] }
};

const TOOLS = [
  {
    name: "subagent_brief",
    description: "Generates scope-isolated, structural prompts and ready-to-use invoke_subagent JSON payloads for single subagents or 2-layer (L1 Squad Lead -> L2 Leaf) hierarchies. Pre-compiles L2 payloads directly inside L1 briefs to eliminate multi-hop prompt degradation.",
    inputSchema: {
      type: "object",
      properties: {
        ...SPEC_PROPERTIES,
        objective: { type: "string", description: "The core research or execution objective (mandatory for single subagent)." },
        tier: { type: "string", enum: ["L1_lead", "L2_leaf"], description: "Hierarchy layer: 'L1_lead' (Squad Lead that delegates pre-compiled children) or 'L2_leaf' (terminal worker, default)." },
        children: CHILDREN_SCHEMA,
        subagents: {
          type: "array",
          description: "Optional array of subagent configurations (L1 leads or L2 leaves) to formulate multiple subagents at once.",
          items: {
            type: "object",
            properties: {
              ...SPEC_PROPERTIES,
              tier: { type: "string", enum: ["L1_lead", "L2_leaf"] },
              children: CHILDREN_SCHEMA
            },
            required: ["objective", "scopeFiles"]
          }
        }
      }
    }
  },
  {
    name: "dispatch_squad",
    description: "Staged squad dispatcher. Reads a team topology from a squad manifest and returns a ready-to-use invoke_subagent payload, preserving native manage_subagents and Reactive Wakeup. Stage 1 ('all_l1') compiles only the L1 Squad Leads; Stage 2 (a squad ID) compiles that squad's L2 leaves.",
    inputSchema: {
      type: "object",
      properties: {
        squadId: {
          type: "string",
          description: "Stage target: 'all_l1' (Stage 1: L1 Squad Leads only) or a squad ID like 'squad_alpha' (Stage 2: that squad's L2 leaves)."
        },
        manifestPath: {
          type: "string",
          description: "Optional path to the manifest. Auto-discovers '<workspace>/swarm-manifest.json' or '<workspace>/suite-manifest.json' if omitted."
        }
      },
      required: ["squadId"]
    }
  }
];

async function handleRequest(request) {
  const { id, method, params } = request;

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

  if (method === "notifications/initialized") {
    return null;
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    let toolResult;
    if (name === "subagent_brief") {
      toolResult = handleSubagentBrief(args);
    } else if (name === "dispatch_squad") {
      toolResult = handleDispatchSquad(args);
    } else {
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Tool not found: ${name}` } };
    }
    return { jsonrpc: "2.0", id, result: toolResult };
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
