#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultManifests, handleDispatchSquad } from "./dispatch.mjs";
import { handleSquadPlanner } from "./planner.mjs";

const __filename = fileURLToPath(import.meta.url);
const realOrSelf = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
function isDirectEntryPoint(argv1 = process.argv[1], selfPath = __filename, platform = process.platform) {
  if (!argv1) return false;
  const normalizeForPlatform = (p) => {
    const resolved = realOrSelf(p);
    if (platform === "win32") return resolved.replace(/\\/g, "/").toLowerCase();
    if (platform === "darwin") return resolved.toLowerCase();
    return resolved;
  };
  return normalizeForPlatform(argv1) === normalizeForPlatform(selfPath);
}
const isEntryPoint = isDirectEntryPoint();

const MIN_NODE_MAJOR = 22;
function isNodeVersionSupported(versionStr = process.versions.node, minMajor = MIN_NODE_MAJOR) {
  const match = typeof versionStr === "string" ? versionStr.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/) : null;
  return Boolean(match && Number.parseInt(match[1], 10) >= minMajor);
}

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const SERVER_NAME = "agy-squad";
let sessionWorkspaces = [];

function workspacesFromInitializeParams(params) {
  if (!params || typeof params !== "object") return [];
  const candidates = [
    ...(Array.isArray(params.workspaceFolders) ? params.workspaceFolders.map((folder) => folder?.uri) : []),
    params.rootUri
  ];
  const resolved = [];
  const seen = new Set();
  const normalizeKey = (localPath) => {
    const canonical = path.resolve(localPath);
    return process.platform === "win32" || process.platform === "darwin"
      ? canonical.toLowerCase()
      : canonical;
  };
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!/^file:\/\//i.test(trimmed)) continue;
    try {
      const parsedUrl = new URL(trimmed);
      if (!parsedUrl.pathname || parsedUrl.pathname === "/") continue;
      const canonical = path.resolve(fileURLToPath(parsedUrl));
      const key = normalizeKey(canonical);
      if (!seen.has(key)) {
        seen.add(key);
        resolved.push(canonical);
      }
    } catch {
      continue;
    }
  }
  if (typeof params.rootPath === "string" && params.rootPath.trim()) {
    const canonicalRootPath = path.resolve(params.rootPath.trim());
    const key = normalizeKey(canonicalRootPath);
    if (!seen.has(key)) {
      seen.add(key);
      resolved.push(canonicalRootPath);
    }
  }
  return resolved;
}

function isPackagedPluginRoot(dir) {
  try {
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    const dirPkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (dirPkg?.name !== SERVER_NAME) return null;
    if (fs.existsSync(path.join(dir, ".git")) || fs.existsSync(path.join(dir, "tests"))) {
      return false;
    }
    return fs.existsSync(path.join(dir, "plugin.json")) || fs.existsSync(path.join(dir, "mcp_config.json"));
  } catch {
    return null;
  }
}

function isInstalledPluginDir(dir) {
  if (typeof dir !== "string" || !dir.trim()) return false;
  const resolved = path.resolve(dir);
  const candidates = [resolved];
  try {
    const real = fs.realpathSync(resolved);
    if (real !== resolved) candidates.push(real);
  } catch {}
  for (const candidate of candidates) {
    const normalized = candidate.replace(/\\/g, "/");
    if (/(?:^|\/)\.gemini\/config\/plugins\/agy-squad(?:\/|$)/i.test(normalized)) {
      return true;
    }
  }
  for (const candidate of candidates) {
    let cur = candidate;
    while (true) {
      const verdict = isPackagedPluginRoot(cur);
      if (verdict !== null) return verdict;
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }
  }
  return false;
}

function resolveDefaultWorkspaceForCall(args, envWorkspace) {
  if (typeof args?.workspace === "string" && args.workspace.trim()) {
    return args.workspace.trim();
  }
  if (sessionWorkspaces.length > 1 && typeof args?.manifestPath === "string" && args.manifestPath.trim()) {
    const rel = args.manifestPath.trim();
    const posixNorm = path.posix.normalize(rel.replace(/\\/g, "/"));
    if (!path.isAbsolute(rel) && !posixNorm.startsWith("/") && posixNorm !== "." && posixNorm !== ".." && !posixNorm.startsWith("../")) {
      const matching = sessionWorkspaces.filter((root) => {
        try {
          const candidate = path.resolve(root, posixNorm);
          const relCheck = path.relative(root, candidate);
          if (!relCheck || relCheck.startsWith("..") || path.isAbsolute(relCheck)) return false;
          return fs.existsSync(candidate);
        } catch {
          return false;
        }
      });
      if (matching.length === 1) {
        return matching[0];
      }
      if (matching.length > 1) {
        throw new Error(
          `Ambiguous multi-root workspace for manifestPath '${rel}' (matched: ${matching.join(", ")}). Pass 'workspace' explicitly.`
        );
      }
    }
  }
  if (sessionWorkspaces.length > 1 && args?.manifestPath === undefined && args?.manifest === undefined && args?.task === undefined) {
    const matching = sessionWorkspaces.filter((root) =>
      defaultManifests.some((rel) => {
        try { return fs.existsSync(path.join(root, rel)); } catch { return false; }
      })
    );
    if (matching.length === 1) return matching[0];
    if (matching.length > 1) {
      throw new Error(
        `Ambiguous multi-root workspace: default manifest found in multiple roots (${matching.join(", ")}). Pass 'workspace' or 'manifestPath' explicitly.`
      );
    }
  }
  if (sessionWorkspaces[0]) return sessionWorkspaces[0];
  if (envWorkspace) return envWorkspace;
  const fallbackCwd = process.cwd();
  if (isInstalledPluginDir(fallbackCwd)) {
    throw new Error(
      `Refusing to target the installed Agy-Squad plugin directory (${fallbackCwd}) as the workspace. Pass 'workspace' set to your active repository root (or configure MCP workspace roots / AGY_SQUAD_WORKSPACE).`
    );
  }
  return fallbackCwd;
}

const WORKSPACE_SCHEMA = {
  type: "string",
  minLength: 1,
  description: "Active repo root path (pass explicitly from global plugin installs)."
};

const TOOLS = [
  {
    name: "dispatch_squad",
    description: "Compile leads (all_l1), integrity_auditor[:<target>], or squad specialists for invoke_subagent.",
    inputSchema: {
      type: "object",
      properties: {
        squadId: { type: "string", minLength: 1, description: "'all_l1', 'integrity_auditor[:<target>]', or squad ID." },
        manifestPath: { type: "string", minLength: 1, description: "Relative manifest path." },
        workspace: WORKSPACE_SCHEMA
      },
      required: ["squadId"],
      additionalProperties: false
    }
  },
  {
    name: "squad_planner",
    description: "Plan /swarm (primary) or subagent cohorts with pinning, overlap checks, transcript-safe provenance, and audit slots.",
    inputSchema: {
      type: "object",
      properties: {
        manifestPath: { type: "string", minLength: 1, description: "Relative manifest path." },
        manifest: {
          type: "object",
          description: "Inline squads manifest.",
          properties: { squads: { type: "object", minProperties: 1 } },
          required: ["squads"]
        },
        task: { type: "string", minLength: 1, description: "Freeform task string." },
        workspace: WORKSPACE_SCHEMA,
        squadId: { type: "string", minLength: 1, description: "Target working squad ID." },
        topology: { type: "string", enum: ["flat", "layered"], description: "Flat or layered topology." },
        executionMode: { type: "string", enum: ["swarm", "subagent"], description: "Mode (default: swarm)." },
        model: { type: "string", minLength: 1, description: "Target model ID." },
        workspaceIsolation: { type: "string", enum: ["inherit", "share", "branch"], description: "Swarm isolation." },
        scopeFiles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "Task paths." },
        roles: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "Task role titles." },
        readOnly: { type: "boolean", description: "Read-only task workers." },
        roleScopes: {
          type: "object",
          description: "Per-role task paths.",
          additionalProperties: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } }
        },
        includeIntegrityAuditor: { type: "boolean", description: "Include integrity audit." },
        reportRoot: { type: "string", minLength: 1, description: "Relative report root." },
        knownModels: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "Allowed model IDs." },
        occupiedWorkerNames: { type: "array", items: { type: "string", minLength: 1 }, description: "Reserved roster names." },
        boardSince: { type: "integer", minimum: 0, description: "Swarm board since seq." },
        boardSeqs: { type: "array", minItems: 1, items: { type: "integer", minimum: 0 }, description: "Swarm audit board seqs." }
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
  return typeof id === "string" || (typeof id === "number" && Number.isSafeInteger(id));
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
    sessionWorkspaces = workspacesFromInitializeParams(params);
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
    if (
      params.arguments !== undefined &&
      (params.arguments === null || typeof params.arguments !== "object" || Array.isArray(params.arguments))
    ) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: "Invalid params: arguments must be a JSON object" } };
    }
    const { name } = params;
    const args = params.arguments ?? {};
    const envWorkspace = process.env.AGY_SQUAD_WORKSPACE?.trim();
    if (name !== "dispatch_squad" && name !== "squad_planner") {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } };
    }
    let defaultWorkspace;
    try {
      defaultWorkspace = resolveDefaultWorkspaceForCall(args, envWorkspace);
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        result: { isError: true, content: [{ type: "text", text: `${name}: ${error.message}` }] }
      };
    }
    if (name === "dispatch_squad") {
      return { jsonrpc: "2.0", id, result: handleDispatchSquad(args, defaultWorkspace) };
    }
    return { jsonrpc: "2.0", id, result: handleSquadPlanner(args, defaultWorkspace) };
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

if (isEntryPoint) {
  if (!isNodeVersionSupported()) {
    process.stderr.write(
      `Agy-Squad MCP server requires Node.js >= ${MIN_NODE_MAJOR}.0.0 (found v${process.versions.node}). Please upgrade Node.js.\n`
    );
    process.exit(1);
  }
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

export { TOOLS, handleRequest, isDirectEntryPoint, isInstalledPluginDir, isNodeVersionSupported };
