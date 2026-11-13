#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleDispatchSquad } from "./dispatch.mjs";
import { handleSquadPlanner } from "./planner.mjs";

const __filename = fileURLToPath(import.meta.url);
const realOrSelf = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const isEntryPoint = Boolean(process.argv[1] && realOrSelf(process.argv[1]) === realOrSelf(__filename));

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const SERVER_NAME = "agy-squad";
const TOOLS = [
  {
    name: "dispatch_squad",
    description: "Compile leads (all_l1), audit targets, or one squad's specialists from a workspace manifest into a native Subagents payload.",
    inputSchema: {
      type: "object",
      properties: {
        squadId: { type: "string", minLength: 1, description: "'all_l1', 'adversarial_l1', 'adversarial_flat[:<target>]', 'integrity_auditor[:<target>]', or a squad ID." },
        manifestPath: { type: "string", minLength: 1, description: "Workspace-relative manifest path." }
      },
      required: ["squadId"],
      additionalProperties: false
    }
  },
  {
    name: "squad_planner",
    description: "Plan proportional /swarm or subagent cohorts with explicit model pinning, writable scope overlap checks, L6-safe provenance scaffolding, and audit plans.",
    inputSchema: {
      type: "object",
      properties: {
        manifestPath: { type: "string", minLength: 1, description: "Workspace-relative manifest path (exclusive with manifest/task)." },
        manifest: {
          type: "object",
          description: "Inline squads manifest (exclusive with manifestPath/task).",
          properties: { squads: { type: "object", minProperties: 1 } },
          required: ["squads"]
        },
        task: { type: "string", minLength: 1, description: "Freeform task description (exclusive with manifestPath/manifest)." },
        squadId: { type: "string", minLength: 1, description: "Optional working squad filter." },
        executionMode: { type: "string", enum: ["swarm", "subagent"], description: "Native execution plane (default: swarm)." },
        model: { type: "string", minLength: 1, description: "Target model ID (explicitly pinnable in swarm mode)." },
        workspaceIsolation: { type: "string", enum: ["inherit", "share", "branch"], description: "Swarm workspace isolation (default: inherit)." },
        scopeFiles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
        roles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
        includeIntegrityAuditor: { type: "boolean" },
        reportRoot: { type: "string", minLength: 1 }
      },
      anyOf: [
        { required: ["manifestPath"] },
        { required: ["manifest"] },
        { required: ["task"] }
      ],
      additionalProperties: false
    }
  }
];

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
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    if (name === "dispatch_squad") {
      return { jsonrpc: "2.0", id, result: handleDispatchSquad(args) };
    }
    if (name === "squad_planner") {
      return { jsonrpc: "2.0", id, result: handleSquadPlanner(args) };
    }
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Tool not found: ${name}` } };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

if (isEntryPoint) {
  const rawMaxBytes = process.env.AGY_MAX_STDIO_PAYLOAD_BYTES;
  const parsedMaxBytes = rawMaxBytes === undefined ? NaN : Number(rawMaxBytes);
  const MAX_STDIO_PAYLOAD_BYTES = Number.isInteger(parsedMaxBytes) && parsedMaxBytes > 0
    ? parsedMaxBytes
    : 10 * 1024 * 1024;
  let chunks = [];
  let bufferedBytes = 0;
  let droppingOversized = false;
  let processingChain = Promise.resolve();

  const writeOversizedError = () => {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request: Payload exceeds 10MB safety ceiling" }
    }) + "\n");
  };

  const enqueueOversizedError = () => {
    processingChain = processingChain.then(writeOversizedError);
  };

  const processLine = async (line) => {
    if (!line || !line.trim()) return;
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
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: parsed && typeof parsed === "object" && "id" in parsed ? parsed.id : null,
        error: { code: -32603, message: `Internal error: ${err.message}` }
      }) + "\n");
    }
  };

  const enqueueLine = (line) => {
    processingChain = processingChain.then(() => processLine(line));
  };

  process.stdin.on("data", (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
    let offset = 0;
    while (offset < buf.length) {
      const nlIndex = buf.indexOf(0x0a, offset);
      if (nlIndex === -1) {
        const rest = buf.subarray(offset);
        if (!droppingOversized) {
          if (bufferedBytes + rest.length > MAX_STDIO_PAYLOAD_BYTES) {
            chunks = [];
            bufferedBytes = 0;
            droppingOversized = true;
            enqueueOversizedError();
          } else {
            chunks.push(rest);
            bufferedBytes += rest.length;
          }
        }
        break;
      }
      const segment = buf.subarray(offset, nlIndex);
      offset = nlIndex + 1;
      if (droppingOversized) {
        droppingOversized = false;
        continue;
      }
      const endsWithCr = segment.length > 0
        ? segment[segment.length - 1] === 0x0d
        : (chunks.length > 0 && chunks[chunks.length - 1][chunks[chunks.length - 1].length - 1] === 0x0d);
      const effectiveAdded = segment.length - (endsWithCr ? 1 : 0);
      if (bufferedBytes + effectiveAdded > MAX_STDIO_PAYLOAD_BYTES) {
        chunks = [];
        bufferedBytes = 0;
        enqueueOversizedError();
        continue;
      }
      if (segment.length > 0) chunks.push(segment);
      const fullLineBuf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, bufferedBytes + segment.length);
      chunks = [];
      bufferedBytes = 0;
      const cleanBuf = fullLineBuf.length > 0 && fullLineBuf[fullLineBuf.length - 1] === 0x0d
        ? fullLineBuf.subarray(0, fullLineBuf.length - 1)
        : fullLineBuf;
      enqueueLine(cleanBuf.toString("utf8"));
    }
  });

  // Anti-orphan: exit when the parent closes stdio or goes away
  process.stdin.on("end", () => {
    if (!droppingOversized && bufferedBytes > 0) {
      const fullLineBuf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, bufferedBytes);
      chunks = [];
      bufferedBytes = 0;
      const cleanBuf = fullLineBuf.length > 0 && fullLineBuf[fullLineBuf.length - 1] === 0x0d
        ? fullLineBuf.subarray(0, fullLineBuf.length - 1)
        : fullLineBuf;
      if (cleanBuf.length > MAX_STDIO_PAYLOAD_BYTES) {
        enqueueOversizedError();
      } else {
        enqueueLine(cleanBuf.toString("utf8"));
      }
    }
    processingChain.finally(() => process.exit(0));
  });
  process.stdin.on("close", () => {
    processingChain.finally(() => process.exit(0));
  });
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
