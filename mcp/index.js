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
let sessionWorkspace;

function workspaceFromInitializeParams(params) {
  if (!params || typeof params !== "object") return undefined;
  const candidates = [
    ...(Array.isArray(params.workspaceFolders) ? params.workspaceFolders.map((folder) => folder?.uri) : []),
    params.rootUri
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!/^file:\/\//i.test(trimmed)) continue;
    try {
      const parsedUrl = new URL(trimmed);
      if (!parsedUrl.pathname || parsedUrl.pathname === "/") continue;
      return fileURLToPath(parsedUrl);
    } catch {
      continue;
    }
  }
  if (typeof params.rootPath === "string" && params.rootPath.trim()) {
    return params.rootPath.trim();
  }
  return undefined;
}

const WORKSPACE_SCHEMA = {
  type: "string",
  minLength: 1,
  description: "Active repository directory path (overrides initialize roots, AGY_SQUAD_WORKSPACE, and cwd)."
};

const TOOLS = [
  {
    name: "dispatch_squad",
    description: "Compile leads (all_l1), integrity_auditor[:<target>], or one squad's specialists into an invoke_subagent payload (subagent mode only; use squad_planner for /swarm).",
    inputSchema: {
      type: "object",
      properties: {
        squadId: { type: "string", minLength: 1, description: "'all_l1', 'integrity_auditor[:<target>]', or squad ID." },
        manifestPath: { type: "string", minLength: 1, description: "Workspace-relative manifest path." },
        workspace: WORKSPACE_SCHEMA
      },
      required: ["squadId"],
      additionalProperties: false
    }
  },
  {
    name: "squad_planner",
    description: "Plan /swarm (primary) or invoke_subagent cohorts with model pinning, scope overlap checks, L6 provenance scaffold, and integrity audit slots. Neutral on flat vs layered topology.",
    inputSchema: {
      type: "object",
      properties: {
        manifestPath: { type: "string", minLength: 1, description: "Manifest path (exclusive with manifest/task)." },
        manifest: {
          type: "object",
          description: "Inline squads manifest (exclusive with manifestPath/task).",
          properties: { squads: { type: "object", minProperties: 1 } },
          required: ["squads"]
        },
        task: { type: "string", minLength: 1, description: "Freeform task (exclusive with manifestPath/manifest)." },
        workspace: WORKSPACE_SCHEMA,
        squadId: { type: "string", minLength: 1, description: "Optional working squad filter (never 'all_l1')." },
        topology: { type: "string", enum: ["flat", "layered"], description: "Force flat (no leads) or layered (require leads) topology." },
        executionMode: { type: "string", enum: ["swarm", "subagent"], description: "Execution plane (default: swarm)." },
        model: { type: "string", minLength: 1, description: "Target model ID (pinnable in swarm mode)." },
        workspaceIsolation: { type: "string", enum: ["inherit", "share", "branch"], description: "Swarm isolation (default: inherit)." },
        scopeFiles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "Relative file/directory scopes for task planning." },
        roles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "Worker role titles for task planning." },
        includeIntegrityAuditor: { type: "boolean", description: "Include flat audit-<id> / integrity_auditor (default: true)." },
        reportRoot: { type: "string", minLength: 1, description: "Custom workspace-relative report root." },
        knownModels: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "Allowlist of model IDs (e.g. from swarm models); rejects unlisted pins." },
        occupiedWorkerNames: { type: "array", items: { type: "string", minLength: 1 }, description: "Existing /swarm roster names to reserve when sharing one board across calls." }
      },
      oneOf: [
        { required: ["manifestPath"] },
        { required: ["manifest"] },
        { required: ["task"] }
      ],
      additionalProperties: false
    }
  }
];

function isValidRequestId(id) {
  return typeof id === "string" || (typeof id === "number" && Number.isInteger(id));
}

async function handleRequest(request) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    request.jsonrpc !== "2.0" ||
    typeof request.method !== "string" ||
    !request.method.trim()
  ) {
    const rawId = request && typeof request === "object" && !Array.isArray(request) && "id" in request ? request.id : null;
    const id = isValidRequestId(rawId) ? rawId : null;
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
  }
  const { id, method, params } = request;

  // Notifications carry no request ID and must not produce a response.
  if (id === undefined) return null;
  if (!isValidRequestId(id)) {
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request: id must be a string or integer." } };
  }

  if (method === "initialize") {
    sessionWorkspace = workspaceFromInitializeParams(params);
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
    if (!params || typeof params !== "object" || Array.isArray(params) || typeof params.name !== "string") {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: "Invalid params" } };
    }
    const { name, arguments: args = {} } = params;
    const envWorkspace = process.env.AGY_SQUAD_WORKSPACE?.trim();
    const defaultWorkspace = sessionWorkspace || envWorkspace || process.cwd();
    if (name === "dispatch_squad") {
      return { jsonrpc: "2.0", id, result: handleDispatchSquad(args, defaultWorkspace) };
    }
    if (name === "squad_planner") {
      return { jsonrpc: "2.0", id, result: handleSquadPlanner(args, defaultWorkspace) };
    }
    return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

if (isEntryPoint) {
  const rawMaxBytes = process.env.AGY_MAX_STDIO_PAYLOAD_BYTES;
  const parsedMaxBytes = rawMaxBytes === undefined ? NaN : Number(rawMaxBytes);
  const MAX_STDIO_PAYLOAD_BYTES = Number.isInteger(parsedMaxBytes) && parsedMaxBytes > 0
    ? parsedMaxBytes
    : 10 * 1024 * 1024;
  const wireUtf8Decoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
  let chunks = [];
  let bufferedBytes = 0;
  let droppingOversized = false;
  let processingChain = Promise.resolve();
  let stdoutClosed = false;
  let shutdownStarted = false;

  const writeStdout = (text) => new Promise((resolve) => {
    if (stdoutClosed || process.stdout.destroyed || process.stdout.writableEnded) {
      resolve();
      return;
    }
    const onDone = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      process.stdout.off("drain", onDone);
      process.stdout.off("error", onDone);
      process.stdout.off("close", onDone);
    };
    process.stdout.once("error", onDone);
    process.stdout.once("close", onDone);
    const ok = process.stdout.write(text);
    if (ok) {
      cleanup();
      resolve();
    } else {
      process.stdout.once("drain", onDone);
    }
  });

  const writeOversizedError = () => writeStdout(JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: { code: -32600, message: `Invalid Request: Payload exceeds ${MAX_STDIO_PAYLOAD_BYTES}-byte safety ceiling` }
  }) + "\n");

  const enqueueOversizedError = () => {
    processingChain = processingChain.then(writeOversizedError);
  };

  const processLine = async (frameBuf) => {
    let line;
    try {
      line = wireUtf8Decoder.decode(frameBuf);
    } catch {
      await writeStdout(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid UTF-8 in request frame" }
      }) + "\n");
      return;
    }
    if (!line || !line.trim()) return;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      await writeStdout(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `Parse error: ${err.message}` }
      }) + "\n");
      return;
    }
    try {
      const resp = await handleRequest(parsed);
      if (resp) await writeStdout(JSON.stringify(resp) + "\n");
    } catch (err) {
      const rawId = parsed && typeof parsed === "object" && "id" in parsed ? parsed.id : null;
      await writeStdout(JSON.stringify({
        jsonrpc: "2.0",
        id: isValidRequestId(rawId) ? rawId : null,
        error: { code: -32603, message: `Internal error: ${err.message}` }
      }) + "\n");
    }
  };

  const enqueueLine = (frameBuf) => {
    const copy = Buffer.from(frameBuf);
    processingChain = processingChain.then(() => processLine(copy));
  };

  const stripSingleTrailingCr = (buf) => (
    buf.length > 0 && buf[buf.length - 1] === 0x0d
      ? buf.subarray(0, buf.length - 1)
      : buf
  );

  process.stdin.on("data", (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
    let offset = 0;
    while (offset < buf.length) {
      const nlIndex = buf.indexOf(0x0a, offset);
      if (nlIndex === -1) {
        const rest = buf.subarray(offset);
        if (!droppingOversized) {
          const totalWithRest = bufferedBytes + rest.length;
          // Allow one extra byte solely if it is a trailing '\r' that may precede '\n' on the next chunk.
          const endsWithTrailingCr = rest.length > 0
            ? rest[rest.length - 1] === 0x0d
            : (chunks.length > 0 && chunks[chunks.length - 1][chunks[chunks.length - 1].length - 1] === 0x0d);
          const effectiveBuffered = totalWithRest - (endsWithTrailingCr ? 1 : 0);
          if (effectiveBuffered > MAX_STDIO_PAYLOAD_BYTES) {
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
      if (segment.length > 0) {
        chunks.push(segment);
        bufferedBytes += segment.length;
      }
      const fullLineBuf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, bufferedBytes);
      chunks = [];
      bufferedBytes = 0;
      const cleanBuf = stripSingleTrailingCr(fullLineBuf);
      if (cleanBuf.length > MAX_STDIO_PAYLOAD_BYTES) {
        enqueueOversizedError();
        continue;
      }
      enqueueLine(cleanBuf);
    }
  });

  const flushBufferedRemainder = () => {
    if (!droppingOversized && bufferedBytes > 0) {
      const fullLineBuf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, bufferedBytes);
      chunks = [];
      bufferedBytes = 0;
      const cleanBuf = stripSingleTrailingCr(fullLineBuf);
      if (cleanBuf.length > MAX_STDIO_PAYLOAD_BYTES) {
        enqueueOversizedError();
      } else {
        enqueueLine(cleanBuf);
      }
    }
  };

  const shutdown = () => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    flushBufferedRemainder();
    processingChain.finally(() => {
      if (stdoutClosed || process.stdout.destroyed || process.stdout.writableEnded) {
        process.exit(0);
        return;
      }
      const onFinish = () => process.exit(0);
      process.stdout.once("error", onFinish);
      process.stdout.end(onFinish);
    });
  };

  // Anti-orphan: exit when the parent closes stdio or goes away (after flushing queued stdout frames).
  process.stdin.on("end", shutdown);
  process.stdin.on("close", shutdown);
  process.stdout.on("error", (err) => {
    stdoutClosed = true;
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
