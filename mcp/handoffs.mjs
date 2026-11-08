import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const messageLimit = 500;

function reportPath(squadId, specialistNumber, reportRoot = "scratch/agy-squad") {
  if (typeof squadId !== "string" || !squadId.trim()) throw new Error("Provide a nonempty squad ID.");
  const directory = `squad-${encodeURIComponent(squadId)}`;
  if (Buffer.byteLength(directory) > 255) {
    throw new Error("Squad ID must fit in one workspace directory name.");
  }
  const slot = specialistNumber === undefined ? "lead" : `specialist-${specialistNumber}`;
  return `${reportRoot}/${directory}/${slot}/report.md`;
}

function reconcileHandoffs(assignments, handoffs) {
  if (!Array.isArray(assignments) || !assignments.length || !Array.isArray(handoffs)) {
    throw new Error("Provide the ordered launch assignments and their handoffs.");
  }
  const expected = new Map();
  const slots = new Set();
  for (const { conversationId, report } of assignments) {
    if (typeof conversationId !== "string" || !conversationId.trim() || expected.has(conversationId) ||
        typeof report !== "string" || slots.has(report) ||
        !/^scratch\/agy-squad\/(run-[0-9a-f-]{36}\/plan-[0-9a-f]{24}\/)?squad-[^/\s]+\/(lead|specialist-[1-9]\d*)\/report\.md$/.test(report)) {
      throw new Error("Launch assignments must have distinct native IDs and their exact compiled report slots.");
    }
    expected.set(conversationId, report);
    slots.add(report);
  }

  const received = new Map();
  for (const { sender, message } of handoffs) {
    const report = expected.get(sender);
    if (!report) throw new Error("Handoff is from outside the recorded cohort.");
    if (typeof message !== "string" || Buffer.byteLength(message) > messageLimit || /[\r\n]/.test(message)) {
      throw new Error("Handoff must be one line within 500 UTF-8 bytes.");
    }
    const match = /^(READY|PARTIAL) (\S+) — (.+)$/.exec(message);
    const noReport = /^NO_REPORT — \S/.test(message);
    if (!noReport && (!match || match[2] !== report || !match[3].trim())) {
      throw new Error("Handoff must include the sender's assigned report and an observation, or a NO_REPORT reason.");
    }
    if (received.has(sender) && received.get(sender).message !== message) {
      throw new Error("Conflicting handoffs from one assignment.");
    }
    received.set(sender, { message, status: noReport ? "NO_REPORT" : match[1] });
  }
  return received;
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function workspacePath(root, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) ||
      relative.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error(`Expected a workspace-relative file path: ${relative}`);
  }
  const file = path.join(root, relative);
  if (fs.realpathSync(path.dirname(file)) !== path.dirname(file)) {
    throw new Error(`Symlinked directories are unsupported: ${relative}`);
  }
  return file;
}

function readFile(root, relative) {
  const file = workspacePath(root, relative);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    if (!fs.fstatSync(fd).isFile() ||
        (process.platform === "linux" && fs.realpathSync(`/proc/self/fd/${fd}`) !== file)) {
      throw new Error(`Expected a regular file at the recorded path: ${relative}`);
    }
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readIfPresent(root, relative) {
  try {
    return readFile(root, relative);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function fingerprint(root, files) {
  if (!files.length) throw new Error("Specify the final files used for independent verification.");
  return Object.fromEntries(files.map(file => [file, sha256(readFile(root, file))]));
}

function verifyFiles(root, verifiedFiles) {
  const files = Object.keys(verifiedFiles ?? {});
  for (const [file, hash] of Object.entries(fingerprint(root, files))) {
    if (hash !== verifiedFiles[file]) throw new Error(`Verified input changed: ${file}`);
  }
}

function bundlePath(squadId) {
  return reportPath(squadId).replace(/\.md$/, ".sources.json");
}

function publish(root, relative, contents) {
  const destination = workspacePath(root, relative);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    try {
      fs.writeFileSync(fd, contents);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.linkSync(temporary, destination);
    } catch (error) {
      if (error.code !== "EEXIST" || !readFile(root, relative).equals(contents)) throw error;
    }
  } finally {
    fs.unlinkSync(temporary);
  }
}

function readEvidence(root, report) {
  const bytes = readFile(root, report);
  if (!bytes.toString("utf8").trim()) throw new Error(`Empty evidence report: ${report}`);
  return bytes;
}

function inspectHandoffs(root, { workspace, assignments, handoffs }) {
  if (workspace !== root) throw new Error("The cohort must use the current shared workspace.");
  const received = reconcileHandoffs(assignments, handoffs);
  return assignments.map(({ conversationId, report }) => {
    const status = received.get(conversationId)?.status ?? "PENDING";
    if (status === "READY" || status === "PARTIAL") readEvidence(root, report);
    return { conversationId, report, status };
  });
}

function bundleReports(root, record) {
  const { squadId, verdict, verifiedFiles } = record;
  if (verdict !== "PASS") throw new Error("Only independently passing cohorts are eligible for bundling.");
  const assignments = inspectHandoffs(root, record);
  if (assignments.some(({ status, report }, index) => status !== "READY" || report !== reportPath(squadId, index + 1))) {
    throw new Error("Bundling requires a READY handoff from each recorded specialist in its compiled slot.");
  }
  if (assignments.some(({ report }) => Object.hasOwn(verifiedFiles ?? {}, report))) {
    throw new Error("Record final work inputs in verifiedFiles. The bundle hashes the loose reports separately.");
  }
  verifyFiles(root, verifiedFiles);
  const synthesis = sha256(readEvidence(root, reportPath(squadId)));
  const reports = assignments.map(({ report }) => {
    const bytes = readEvidence(root, report);
    const markdown = bytes.toString("utf8");
    if (!Buffer.from(markdown).equals(bytes)) throw new Error(`Report must be UTF-8 Markdown: ${report}`);
    return { path: report, sha256: sha256(bytes), markdown };
  });
  const relative = bundlePath(squadId);
  publish(root, relative, Buffer.from(JSON.stringify({ squadId, synthesis, verifiedFiles, reports }, null, 2) + "\n"));
  return verifyBundle(root, relative);
}

function verifyBundle(root, relative, acceptedHash) {
  const contents = readFile(root, relative);
  const digest = sha256(contents);
  if (acceptedHash !== undefined && digest !== acceptedHash) throw new Error("Bundle differs from the primary's accepted digest.");
  const { squadId, synthesis, verifiedFiles, reports } = JSON.parse(contents);
  if (relative !== bundlePath(squadId) || !Array.isArray(reports) || !reports.length ||
      reports.some((report, index) => report.path !== reportPath(squadId, index + 1))) {
    throw new Error("Bundle must contain the recorded squad's exact specialist slots.");
  }
  if (sha256(readEvidence(root, reportPath(squadId))) !== synthesis) {
    throw new Error("Synthesis changed after bundling.");
  }
  verifyFiles(root, verifiedFiles);
  for (const report of reports) {
    const bytes = Buffer.from(report.markdown, "utf8");
    const loose = readIfPresent(root, report.path);
    if (!bytes.length || sha256(bytes) !== report.sha256 || (loose && !loose.equals(bytes))) {
      throw new Error(`Archived or loose report changed: ${report.path}`);
    }
  }
  return { path: relative, sha256: digest, reports: reports.map(({ path, sha256 }) => ({ path, sha256 })) };
}

function pruneReports(root, relative, acceptedHash) {
  if (!/^[0-9a-f]{64}$/.test(acceptedHash ?? "")) throw new Error("Pruning requires the primary's accepted bundle digest.");
  const { reports } = verifyBundle(root, relative, acceptedHash);
  const removed = [];
  for (const { path: report, sha256: hash } of reports) {
    const loose = readIfPresent(root, report);
    if (!loose) continue;
    if (sha256(loose) !== hash) throw new Error(`Loose report changed during cleanup: ${report}`);
    try {
      fs.unlinkSync(workspacePath(root, report));
      removed.push(report);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { removed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fs.realpathSync(process.cwd());
  const [action, ...args] = process.argv.slice(2);
  try {
    let result;
    if (action === "fingerprint") result = fingerprint(root, args);
    else if (action === "inspect" && args.length === 1) result = inspectHandoffs(root, JSON.parse(readFile(root, args[0])));
    else if (action === "bundle" && args.length === 1) result = bundleReports(root, JSON.parse(readFile(root, args[0])));
    else if (action === "verify" && args.length === 1) result = verifyBundle(root, args[0]);
    else if (action === "prune" && args.length === 2) result = pruneReports(root, ...args);
    else throw new Error("Usage: fingerprint <file...> | inspect <record.json> | bundle <record.json> | verify <bundle.json> | prune <bundle.json> <accepted-sha256>");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export { bundleReports, fingerprint, inspectHandoffs, messageLimit, pruneReports, publish, reportPath, verifyBundle };
