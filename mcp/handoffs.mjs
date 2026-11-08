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

function resolveReportRoot(recordOrPath) {
  if (typeof recordOrPath === "string") {
    const match = /^(scratch\/agy-squad\/run-[0-9a-f-]{36}\/plan-[0-9a-f]{24})\/squad-/.exec(recordOrPath);
    return match ? match[1] : "scratch/agy-squad";
  }
  if (typeof recordOrPath?.reportRoot === "string" && recordOrPath.reportRoot.trim()) {
    return recordOrPath.reportRoot.trim();
  }
  const firstSlot = recordOrPath?.assignments?.[0]?.report;
  return typeof firstSlot === "string" ? resolveReportRoot(firstSlot) : "scratch/agy-squad";
}

function reconcileHandoffs(assignments, handoffs) {
  if (!Array.isArray(assignments) || !assignments.length || !Array.isArray(handoffs)) {
    throw new Error("Provide the ordered launch assignments and their handoffs.");
  }
  const expected = new Map();
  const slots = new Set();
  for (const item of assignments) {
    const { conversationId, report } = item ?? {};
    if (
      typeof conversationId !== "string" ||
      !conversationId.trim() ||
      expected.has(conversationId) ||
      typeof report !== "string" ||
      slots.has(report) ||
      !/^scratch\/agy-squad\/(run-[0-9a-f-]{36}\/plan-[0-9a-f]{24}\/)?squad-[^/\s]+\/(lead|specialist-[1-9]\d*)\/report\.md$/.test(
        report
      )
    ) {
      throw new Error("Launch assignments must have distinct native IDs and their exact compiled report slots.");
    }
    expected.set(conversationId, report);
    slots.add(report);
  }

  const received = new Map();
  for (const item of handoffs) {
    const { sender, message } = item ?? {};
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
  if (
    typeof relative !== "string" ||
    !relative ||
    path.isAbsolute(relative) ||
    relative.split("/").some(part => !part || part === "." || part === "..")
  ) {
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
    if (!fs.fstatSync(fd).isFile() || (process.platform === "linux" && fs.realpathSync(`/proc/self/fd/${fd}`) !== file)) {
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
  if (!Array.isArray(files) || !files.length) {
    throw new Error("Specify the final files used for independent verification.");
  }
  return Object.fromEntries(files.map(file => [file, sha256(readFile(root, file))]));
}

function verifyFiles(root, verifiedFiles) {
  if (!verifiedFiles || typeof verifiedFiles !== "object" || Array.isArray(verifiedFiles)) {
    throw new Error("Specify the final files used for independent verification.");
  }
  const files = Object.keys(verifiedFiles);
  for (const [file, hash] of Object.entries(fingerprint(root, files))) {
    if (hash !== verifiedFiles[file]) throw new Error(`Verified input changed: ${file}`);
  }
}

function bundlePath(squadId, reportRoot = "scratch/agy-squad") {
  return reportPath(squadId, undefined, reportRoot).replace(/\.md$/, ".sources.json");
}

function publish(root, relative, contents, replace = false) {
  const destination = workspacePath(root, relative);
  if (!replace) {
    const existing = readIfPresent(root, relative);
    if (existing?.equals(contents)) return;
  }
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
      if (error.code !== "EEXIST") throw error;
      if (!readFile(root, relative).equals(contents)) {
        if (!replace) throw error;
        fs.renameSync(temporary, destination);
        return;
      }
    }
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function readEvidence(root, report) {
  const bytes = readFile(root, report);
  if (!bytes.toString("utf8").trim()) throw new Error(`Empty evidence report: ${report}`);
  return bytes;
}

function readSynthesis(root, report) {
  const bytes = readEvidence(root, report);
  const markdown = bytes.toString("utf8");
  if (!Buffer.from(markdown).equals(bytes)) throw new Error(`Report must be UTF-8 Markdown: ${report}`);
  const clean = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\r\n]+`/g, "");
  const verdicts = new Set();
  for (const line of clean.split(/\r?\n/)) {
    for (const m of line.matchAll(
      /(?:(?:^|\b)verdict\s*(?:\*{1,2})?\s*[:—-]\s*|:\s*)(?:\*{1,2})?(PASS|FAIL|BLOCKED)\b/gi
    )) {
      verdicts.add(m[1].toUpperCase());
    }
    const leadToken = /^\s*(?:[#>*+-]+\s*)?(?:\*{1,2})?(PASS|FAIL|BLOCKED)\b/.exec(line);
    if (leadToken) {
      verdicts.add(leadToken[1].toUpperCase());
    }
  }
  if (verdicts.size !== 1 || !verdicts.has("PASS")) {
    throw new Error("Synthesis report must record an unambiguous PASS verdict.");
  }
  return bytes;
}

function inspectHandoffs(root, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid handoff inspection record.");
  }
  const { workspace, assignments, handoffs } = record;
  if (workspace !== root) throw new Error("The cohort must use the current shared workspace.");
  const received = reconcileHandoffs(assignments, handoffs);
  return assignments.map(({ conversationId, report }) => {
    const status = received.get(conversationId)?.status ?? "PENDING";
    if (status === "READY" || status === "PARTIAL") readEvidence(root, report);
    return { conversationId, report, status };
  });
}

function bundleReports(root, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid bundle record.");
  }
  const { squadId, verdict, verifiedFiles } = record;
  if (verdict !== "PASS") throw new Error("Only independently passing cohorts are eligible for bundling.");
  const rootPrefix = resolveReportRoot(record);
  const assignments = inspectHandoffs(root, record);
  if (
    assignments.some(
      ({ status, report }, index) => status !== "READY" || report !== reportPath(squadId, index + 1, rootPrefix)
    )
  ) {
    throw new Error("Bundling requires a READY handoff from each recorded specialist in its compiled slot.");
  }
  const synthesisSlot = reportPath(squadId, undefined, rootPrefix);
  const relative = bundlePath(squadId, rootPrefix);
  if (
    [...assignments.map(({ report }) => report), synthesisSlot, relative].some(report =>
      Object.hasOwn(verifiedFiles ?? {}, report)
    )
  ) {
    throw new Error("Record final work inputs in verifiedFiles. The bundle hashes the loose reports separately.");
  }
  verifyFiles(root, verifiedFiles);
  const synthesis = sha256(readSynthesis(root, synthesisSlot));
  const reports = assignments.map(({ report }) => {
    const bytes = readEvidence(root, report);
    const markdown = bytes.toString("utf8");
    if (!Buffer.from(markdown).equals(bytes)) throw new Error(`Report must be UTF-8 Markdown: ${report}`);
    return { path: report, sha256: sha256(bytes), markdown };
  });
  const bundlePayload = Buffer.from(JSON.stringify({ squadId, synthesis, verifiedFiles, reports }, null, 2) + "\n");
  publish(root, relative, bundlePayload, true);
  return {
    path: relative,
    sha256: sha256(bundlePayload),
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h }))
  };
}

function verifyBundle(root, relative, acceptedHash) {
  const contents = readFile(root, relative);
  const digest = sha256(contents);
  if (acceptedHash !== undefined && digest !== acceptedHash) {
    throw new Error("Bundle differs from the primary's accepted digest.");
  }
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid bundle JSON object.");
  }
  const { squadId, synthesis, verifiedFiles, reports } = parsed;
  const rootPrefix = resolveReportRoot(relative);
  if (
    relative !== bundlePath(squadId, rootPrefix) ||
    !Array.isArray(reports) ||
    !reports.length ||
    reports.some(
      (report, index) =>
        !report || typeof report !== "object" || report.path !== reportPath(squadId, index + 1, rootPrefix)
    )
  ) {
    throw new Error("Bundle must contain the recorded squad's exact specialist slots.");
  }
  if (sha256(readSynthesis(root, reportPath(squadId, undefined, rootPrefix))) !== synthesis) {
    throw new Error("Synthesis changed after bundling.");
  }
  verifyFiles(root, verifiedFiles);
  for (const report of reports) {
    if (typeof report.markdown !== "string" || typeof report.sha256 !== "string") {
      throw new Error(`Invalid archived report entry: ${report?.path}`);
    }
    const bytes = Buffer.from(report.markdown, "utf8");
    const loose = readIfPresent(root, report.path);
    if (!bytes.length || sha256(bytes) !== report.sha256 || (loose && !loose.equals(bytes))) {
      throw new Error(`Archived or loose report changed: ${report.path}`);
    }
  }
  return { path: relative, sha256: digest, reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })) };
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
