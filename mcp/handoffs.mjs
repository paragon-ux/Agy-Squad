import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hasContentVerdictAttempt, parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad, validateSquadId } from "./verdicts.mjs";

const messageLimit = 500;
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f\u2028\u2029]/;
const SWARM_MENTION_RESERVE_BYTES = 26; // "@<24-char-name> " prefix headroom on /swarm
const MIN_OBSERVATION_BYTES = 16; // minimum observation reserve alongside PARTIAL prefix + @24-char mention

function isValidRelativePrefix(prefix) {
  return (
    typeof prefix === "string" &&
    prefix.length > 0 &&
    !CONTROL_CHAR_RE.test(prefix) &&
    !prefix.includes("\\") &&
    !path.isAbsolute(prefix) &&
    !prefix.split("/").some(part => !part || part === "." || part === "..")
  );
}

function defaultScratchBase() {
  const raw = (process.env.AGY_SQUAD_SCRATCH_ROOT || "scratch").trim().replace(/\/+$/, "");
  if (!isValidRelativePrefix(raw)) {
    throw new Error(`Invalid AGY_SQUAD_SCRATCH_ROOT: ${raw}`);
  }
  return raw;
}

function normalizeReportRoot(reportRoot) {
  const trimmed = typeof reportRoot === "string" ? reportRoot.trim().replace(/\/+$/, "") : "";
  if (!isValidRelativePrefix(trimmed)) {
    throw new Error(`Expected a workspace-relative reportRoot: ${reportRoot}`);
  }
  return trimmed;
}

function defaultReportRoot() {
  return `${defaultScratchBase()}/agy-squad`;
}

function reportPath(squadId, specialistNumber, reportRoot = defaultReportRoot()) {
  validateSquadId(squadId);
  if (specialistNumber !== undefined && (!Number.isInteger(specialistNumber) || specialistNumber < 1)) {
    throw new Error("Specialist number must be a positive integer.");
  }
  const normalizedRoot = normalizeReportRoot(reportRoot);
  const directory = `squad-${encodeURIComponent(squadId)}`;
  if (Buffer.byteLength(directory) > 255) {
    throw new Error("Squad ID must fit in one workspace directory name.");
  }
  const slot = specialistNumber === undefined ? "lead" : `specialist-${specialistNumber}`;
  const relative = `${normalizedRoot}/${directory}/${slot}/report.md`;
  if (Buffer.byteLength(`PARTIAL ${relative} — `) + SWARM_MENTION_RESERVE_BYTES + MIN_OBSERVATION_BYTES > messageLimit) {
    throw new Error(`Report slot exceeds 500-byte Pointer-Over-Wire prefix budget (including PARTIAL, /swarm @mention, and observation headroom): ${relative}`);
  }
  return relative;
}

function resolveReportRoot(recordOrPath, allowCustomPrefix = false) {
  if (typeof recordOrPath === "string") {
    const pattern = allowCustomPrefix
      ? /^(.+)\/squad-[^/\s]+\/(?:lead\/report\.(?:md|sources\.json)|specialist-[1-9]\d*\/report\.md)$/
      : /^(.+\/agy-squad(?:\/[^/\s]+)*)\/squad-[^/\s]+\/(?:lead\/report\.(?:md|sources\.json)|specialist-[1-9]\d*\/report\.md)$/;
    const match = pattern.exec(recordOrPath);
    if (match && isValidRelativePrefix(match[1])) {
      return match[1];
    }
    return defaultReportRoot();
  }
  if (recordOrPath?.reportRoot !== undefined) {
    return normalizeReportRoot(recordOrPath.reportRoot);
  }
  const firstSlot = recordOrPath?.assignments?.[0]?.report;
  return typeof firstSlot === "string" ? resolveReportRoot(firstSlot, true) : defaultReportRoot();
}

function reconcileHandoffs(assignments, handoffs, customReportRoot) {
  if (!Array.isArray(assignments) || !assignments.length || !Array.isArray(handoffs)) {
    throw new Error("Provide the ordered launch assignments and their handoffs.");
  }
  let allowedRoots = new Set(["scratch/agy-squad", defaultReportRoot()]);
  if (customReportRoot !== undefined) {
    allowedRoots = new Set([normalizeReportRoot(customReportRoot)]);
  }
  const expected = new Map();
  const slots = new Set();
  for (const item of assignments) {
    const { conversationId, report } = item ?? {};
    const slotMatch =
      typeof report === "string"
        ? /^(.+)\/squad-[^/\s]+\/(lead|specialist-[1-9]\d*)\/report\.md$/.exec(report)
        : null;
    if (
      typeof conversationId !== "string" ||
      !conversationId.trim() ||
      expected.has(conversationId) ||
      !slotMatch ||
      !allowedRoots.has(slotMatch[1]) ||
      slots.has(report)
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
    if (typeof message !== "string" || Buffer.byteLength(message) > messageLimit || CONTROL_CHAR_RE.test(message)) {
      throw new Error("Handoff must be one line within 500 UTF-8 bytes without control characters.");
    }
    // Allow one or more leading /swarm @mention prefixes before Pointer-Over-Wire verbs.
    const parsedMessage = message.replace(/^(?:@[A-Za-z0-9._:-]+\s+)+(?=(?:READY|PARTIAL|NO_REPORT)\b)/, "");
    const readyPrefix = `READY ${report} — `;
    const partialPrefix = `PARTIAL ${report} — `;
    const status = parsedMessage.startsWith(readyPrefix)
      ? "READY"
      : parsedMessage.startsWith(partialPrefix)
        ? "PARTIAL"
        : undefined;
    const observation = status
      ? parsedMessage.slice((status === "READY" ? readyPrefix : partialPrefix).length)
      : "";
    const noReport = /^NO_REPORT — \s*\S/.test(parsedMessage);
    // REVIEW: Compare to the exact assigned path. It may contain spaces or " — ".
    if (!noReport && (!status || !observation.trim())) {
      throw new Error("Handoff must include the sender's assigned report and an observation, or a NO_REPORT reason.");
    }
    if (received.has(sender) && received.get(sender).message !== message) {
      throw new Error("Conflicting handoffs from one assignment.");
    }
    received.set(sender, { message, status: noReport ? "NO_REPORT" : status });
  }
  return received;
}

const utf8Decoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function decodeUtf8(bytes, relative) {
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    throw new Error(`Report must be UTF-8 Markdown: ${relative}`);
  }
}

function isExpectedRealPath(expected, actual) {
  if (actual === expected) return true;
  if (process.platform === "win32" || process.platform === "darwin") {
    return actual.toLowerCase() === expected.toLowerCase();
  }
  return false;
}

function resolveCanonicalRoot(root) {
  if (typeof root !== "string" || !root.trim()) {
    throw new Error("Expected a valid workspace directory path.");
  }
  const realRoot = fs.realpathSync(root);
  if (!fs.lstatSync(realRoot).isDirectory()) {
    throw new Error(`Expected workspace root to be a directory: ${root}`);
  }
  return realRoot;
}

function assertNoSymlinkedAncestors(root, relative, verifiedDirs) {
  const relDir = path.posix.dirname(relative);
  if (!relDir || relDir === ".") return;
  let current = root;
  for (const part of relDir.split("/")) {
    if (!part || part === "." || part === "..") {
      throw new Error(`Expected a workspace-relative file path: ${relative}`);
    }
    current = path.join(current, part);
    if (verifiedDirs?.has(current)) continue;
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      const err = new Error(`ELOOP: symlinked directories are unsupported: ${relative}`);
      err.code = "ELOOP";
      throw err;
    }
    if (!stat.isDirectory()) {
      throw new Error(`Expected a workspace directory for '${relative}' at '${part}'.`);
    }
    if (!isExpectedRealPath(current, fs.realpathSync(current))) {
      throw new Error(`Symlinked directories are unsupported: ${relative}`);
    }
    verifiedDirs?.add(current);
  }
}

function workspacePath(root, relative, verifiedDirs) {
  if (
    typeof relative !== "string" ||
    !relative ||
    CONTROL_CHAR_RE.test(relative) ||
    relative.includes("\\") ||
    path.isAbsolute(relative) ||
    relative.split("/").some(part => !part || part === "." || part === "..")
  ) {
    throw new Error(`Expected a workspace-relative file path: ${relative}`);
  }
  const file = path.join(root, relative);
  const dir = path.dirname(file);
  if (!verifiedDirs?.has(dir)) {
    if (!isExpectedRealPath(dir, fs.realpathSync(dir))) {
      throw new Error(`Symlinked directories are unsupported: ${relative}`);
    }
    verifiedDirs?.add(dir);
  }
  return file;
}

function readOpenedFileWithStat(file, relative) {
  const hasONofollow = typeof fs.constants.O_NOFOLLOW === "number" && fs.constants.O_NOFOLLOW !== 0;
  if (process.platform !== "linux" || !hasONofollow) {
    const linkStat = fs.lstatSync(file);
    if (linkStat.isSymbolicLink()) {
      const err = new Error(`ELOOP: symlinked file is unsupported: ${relative}`);
      err.code = "ELOOP";
      throw err;
    }
  }
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) {
      throw new Error(`Expected a regular file at the recorded path: ${relative}`);
    }
    if (process.platform === "linux") {
      if (fs.readlinkSync(`/proc/self/fd/${fd}`) !== file) {
        throw new Error(`Expected a regular file at the recorded path: ${relative}`);
      }
      if (!hasONofollow && !isExpectedRealPath(file, fs.realpathSync(file))) {
        throw new Error(`Expected a regular file at the recorded path: ${relative}`);
      }
    } else if (!isExpectedRealPath(file, fs.realpathSync(file))) {
      throw new Error(`Expected a regular file at the recorded path: ${relative}`);
    }
    if (stat.size === 0) {
      return { bytes: Buffer.alloc(0), stat };
    }
    const buf = Buffer.allocUnsafe(stat.size);
    let offset = 0;
    while (offset < stat.size) {
      const n = fs.readSync(fd, buf, offset, stat.size - offset, null);
      if (n <= 0) break;
      offset += n;
    }
    if (offset !== stat.size) {
      const tail = [buf.subarray(0, offset)];
      const extra = Buffer.allocUnsafe(65536);
      while (true) {
        const n = fs.readSync(fd, extra, 0, extra.length, null);
        if (n <= 0) break;
        tail.push(Buffer.from(extra.subarray(0, n)));
      }
      return { bytes: Buffer.concat(tail), stat };
    }
    return { bytes: buf, stat };
  } finally {
    fs.closeSync(fd);
  }
}

function readOpenedFile(file, relative) {
  return readOpenedFileWithStat(file, relative).bytes;
}

function readFile(root, relative, verifiedDirs) {
  const canonicalRoot = resolveCanonicalRoot(root);
  return readOpenedFile(workspacePath(canonicalRoot, relative, verifiedDirs), relative);
}

function readIfPresentWithStat(root, relative, verifiedDirs) {
  try {
    return readOpenedFileWithStat(workspacePath(root, relative, verifiedDirs), relative);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function readIfPresent(root, relative, verifiedDirs) {
  return readIfPresentWithStat(root, relative, verifiedDirs)?.bytes;
}

function fingerprint(root, files, verifiedDirs = new Set()) {
  const canonicalRoot = resolveCanonicalRoot(root);
  if (!Array.isArray(files) || !files.length) {
    throw new Error("Specify the final files used for independent verification.");
  }
  const unique = [...new Set(files)];
  const hashes = new Map(unique.map(file => [file, sha256(readFile(canonicalRoot, file, verifiedDirs))]));
  return Object.fromEntries(files.map(file => [file, hashes.get(file)]));
}

function verifyFiles(root, verifiedFiles, verifiedDirs) {
  if (!verifiedFiles || typeof verifiedFiles !== "object" || Array.isArray(verifiedFiles)) {
    throw new Error("Specify the final files used for independent verification.");
  }
  const files = Object.keys(verifiedFiles);
  for (const [file, hash] of Object.entries(fingerprint(root, files, verifiedDirs))) {
    if (hash !== verifiedFiles[file]) throw new Error(`Verified input changed: ${file}`);
  }
}

function bundlePath(squadId, reportRoot = defaultReportRoot()) {
  return reportPath(squadId, undefined, reportRoot).replace(/\.md$/, ".sources.json");
}

function publish(root, relative, contents, replace = false, verifiedDirs, expectedPredecessorSha256, { sync = true } = {}) {
  const canonicalRoot = resolveCanonicalRoot(root);
  const destination = workspacePath(canonicalRoot, relative, verifiedDirs);
  let existingBytes;
  try {
    existingBytes = readOpenedFile(destination, relative);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existingBytes !== undefined) {
    const existingHash = sha256(existingBytes);
    if (expectedPredecessorSha256 !== undefined && existingHash !== expectedPredecessorSha256) {
      throw new Error(
        `Bundle predecessor digest mismatch at '${relative}': expected '${expectedPredecessorSha256}', found '${existingHash}'.`
      );
    }
    if (existingBytes.equals(contents)) return;
    if (!replace) {
      const err = new Error(
        `Existing file at '${relative}' differs (SHA-256 ${existingHash}); pass replaceExisting: true or matching expectedPredecessorSha256 to overwrite.`
      );
      err.code = "EEXIST";
      throw err;
    }
  } else if (expectedPredecessorSha256 !== undefined) {
    throw new Error(
      `Bundle predecessor digest '${expectedPredecessorSha256}' provided, but '${relative}' does not exist.`
    );
  }
  const temporary = `${destination}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    try {
      fs.writeFileSync(fd, contents);
      if (sync) fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.linkSync(temporary, destination);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const racedBytes = readOpenedFile(destination, relative);
      if (!racedBytes.equals(contents)) {
        if (!replace) {
          const err = new Error(
            `Existing file at '${relative}' differs (SHA-256 ${sha256(racedBytes)}); pass replaceExisting: true or matching expectedPredecessorSha256 to overwrite.`
          );
          err.code = "EEXIST";
          throw err;
        }
        if (expectedPredecessorSha256 !== undefined && sha256(racedBytes) !== expectedPredecessorSha256) {
          throw new Error(
            `Bundle predecessor digest mismatch at '${relative}': expected '${expectedPredecessorSha256}', found '${sha256(racedBytes)}'.`
          );
        }
        fs.renameSync(temporary, destination);
        return;
      }
    }
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function readEvidence(root, report, verifiedDirs) {
  const bytes = readFile(root, report, verifiedDirs);
  if (!bytes.toString("utf8").trim()) throw new Error(`Empty evidence report: ${report}`);
  return bytes;
}

function readSynthesis(root, report, verifiedDirs, { allowNonPassing = false } = {}) {
  const bytes = readEvidence(root, report, verifiedDirs);
  const markdown = decodeUtf8(bytes, report);
  let verdict;
  try {
    verdict = parseContentVerdict(markdown);
  } catch (error) {
    throw new Error(
      allowNonPassing
        ? `Synthesis report must record an unambiguous PASS, FAIL, or BLOCKED verdict. (${error.message})`
        : `Synthesis report must record an unambiguous PASS verdict. (${error.message})`
    );
  }
  if (!allowNonPassing && verdict !== "PASS") {
    throw new Error("Synthesis report must record an unambiguous PASS verdict.");
  }
  return { bytes, verdict };
}

function readIntegrityAudit(root, report, expectedSquadId, verifiedDirs, expectedEvidenceDigest) {
  const bytes = readEvidence(root, report, verifiedDirs);
  const markdown = decodeUtf8(bytes, report);
  let verdict;
  try {
    verdict = parseIntegrityVerdict(markdown);
  } catch (error) {
    throw new Error(`Acceptance blocked: Integrity audit verdict is not CLEAN. (${error.message})`);
  }
  if (verdict !== "CLEAN") {
    throw new Error(`Acceptance blocked: Integrity audit verdict is ${verdict}.`);
  }
  if (hasContentVerdictAttempt(markdown)) {
    throw new Error("Acceptance blocked: Integrity audit verdict is not CLEAN. (Integrity audit report must not declare a content verdict.)");
  }
  const targetSquad = parseTargetSquad(markdown);
  if (expectedSquadId && (!targetSquad || targetSquad !== expectedSquadId)) {
    throw new Error(
      targetSquad
        ? `Acceptance blocked: Integrity audit Target Squad '${targetSquad}' does not match '${expectedSquadId}'.`
        : `Acceptance blocked: Integrity audit report must record 'Target Squad: ${expectedSquadId}'.`
    );
  }
  const evidenceDigest = parseEvidenceDigest(markdown);
  if (expectedEvidenceDigest !== undefined) {
    if (!evidenceDigest) {
      throw new Error(
        `Acceptance blocked: Integrity audit report must record 'Evidence Digest: ${expectedEvidenceDigest}' binding it to the reviewed cohort snapshot.`
      );
    }
    if (evidenceDigest !== expectedEvidenceDigest) {
      throw new Error(
        `Acceptance blocked: Integrity audit Evidence Digest '${evidenceDigest}' does not match reviewed cohort snapshot '${expectedEvidenceDigest}'.`
      );
    }
  }
  return { bytes, verdict: "CLEAN", targetSquad, evidenceDigest };
}

function canonicalSnapshotDigest(squadId, synthesisSha, verifiedFiles, reports) {
  const sortedVerifiedFiles = Object.keys(verifiedFiles ?? {})
    .sort()
    .map(file => [file, verifiedFiles[file]]);
  const normalizedReports = reports.map(({ path: p, sha256: h }) => [p, h]);
  const payload = JSON.stringify({
    squadId,
    synthesis: synthesisSha,
    verifiedFiles: sortedVerifiedFiles,
    reports: normalizedReports
  });
  return sha256(Buffer.from(payload, "utf8"));
}

function listCohortSlotsIfPresent(root, cohortRelDir) {
  const fullDir = path.join(root, cohortRelDir);
  let dirLstat;
  try {
    dirLstat = fs.lstatSync(fullDir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  if (dirLstat.isSymbolicLink()) {
    const err = new Error(`ELOOP: symlinked audit directory is unsupported: ${cohortRelDir}`);
    err.code = "ELOOP";
    throw err;
  }
  const realDir = fs.realpathSync(fullDir);
  if (!isExpectedRealPath(fullDir, realDir)) {
    throw new Error(`Symlinked audit directory is unsupported: ${cohortRelDir}`);
  }
  if (!dirLstat.isDirectory()) {
    throw new Error(`Expected directory for audit cohort: ${cohortRelDir}`);
  }
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  const slots = [];
  const specialistEntries = [];
  for (const entry of entries) {
    const isLead = entry.name === "lead";
    const m = isLead ? null : /^specialist-([1-9]\d*)$/.exec(entry.name);
    if (!isLead && !m) continue;
    if (entry.isSymbolicLink()) {
      const err = new Error(`ELOOP: symlinked slot directory is unsupported: ${cohortRelDir}/${entry.name}`);
      err.code = "ELOOP";
      throw err;
    }
    if (!entry.isDirectory()) continue;
    const rel = `${cohortRelDir}/${entry.name}/report.md`;
    let slotExists = false;
    try {
      fs.lstatSync(path.join(root, rel));
      slotExists = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!slotExists) continue;
    if (isLead) {
      slots.push(rel);
    } else {
      specialistEntries.push({ num: Number(m[1]), rel });
    }
  }
  specialistEntries.sort((a, b) => a.num - b.num);
  return [...specialistEntries.map(s => s.rel), ...slots];
}

function discoverAuditSlots(root, squadId, rootPrefix) {
  const scopedDir = `${rootPrefix}/squad-${encodeURIComponent(`integrity_auditor-${squadId}`)}`;
  const scopedSlots = listCohortSlotsIfPresent(root, scopedDir);
  if (scopedSlots.length > 0) return scopedSlots;
  const flatDir = `${rootPrefix}/squad-integrity_auditor`;
  const flatSlots = listCohortSlotsIfPresent(root, flatDir);
  const verifiedDirs = new Set();
  return flatSlots.filter(rel => {
    try {
      const opened = readIfPresentWithStat(root, rel, verifiedDirs);
      if (!opened) return false;
      const text = decodeUtf8(opened.bytes, rel);
      if (!text.trim()) return true;
      const declaredTarget = parseTargetSquad(text);
      return !declaredTarget || declaredTarget === squadId;
    } catch {
      return true;
    }
  });
}

function computeEvidenceDigest(root, record) {
  const canonicalRoot = resolveCanonicalRoot(root);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid bundle or handoff record.");
  }
  const { squadId, verifiedFiles, allowPartial = false, allowNonPassing = false } = record;
  if (typeof allowPartial !== "boolean") throw new Error("allowPartial must be a boolean.");
  if (typeof allowNonPassing !== "boolean") throw new Error("allowNonPassing must be a boolean.");
  validateSquadId(squadId);
  const verifiedDirs = new Set();
  const rootPrefix = resolveReportRoot(record);
  const assignments = inspectReports(canonicalRoot, record, verifiedDirs, { rejectLooseOnNoReport: true });
  const allowedStatuses = allowPartial ? new Set(["READY", "PARTIAL", "NO_REPORT"]) : new Set(["READY"]);
  if (
    assignments.some(
      ({ status, report }, index) => !allowedStatuses.has(status) || report !== reportPath(squadId, index + 1, rootPrefix)
    )
  ) {
    throw new Error(
      allowPartial
        ? "Computing evidence digest requires a READY, PARTIAL, or NO_REPORT handoff from each recorded specialist in its compiled slot."
        : "Computing evidence digest requires a READY handoff from each recorded specialist in its compiled slot."
    );
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
  verifyFiles(canonicalRoot, verifiedFiles, verifiedDirs);
  const synthesisCheck = readSynthesis(canonicalRoot, synthesisSlot, verifiedDirs, { allowNonPassing });
  const synthesis = sha256(synthesisCheck.bytes);
  const reports = assignments.map(({ report, status, bytes }) => ({
    path: report,
    ...(status !== "READY" ? { status } : {}),
    sha256: sha256(bytes ?? Buffer.alloc(0))
  }));
  const evidenceDigest = canonicalSnapshotDigest(squadId, synthesis, verifiedFiles, reports);
  return { squadId, evidenceDigest, synthesis, verifiedFiles, reports };
}

function ensureDirectory(root, relative, created = [], verifiedDirs) {
  const canonicalRoot = resolveCanonicalRoot(root);
  if (typeof relative !== "string" || CONTROL_CHAR_RE.test(relative) || relative.includes("\\")) {
    throw new Error(`Invalid workspace directory: ${relative}`);
  }
  let directory = canonicalRoot;
  for (const part of relative.split("/")) {
    if (!part || part === "." || part === "..") throw new Error(`Invalid workspace directory: ${relative}`);
    directory = path.join(directory, part);
    if (verifiedDirs?.has(directory)) continue;
    try {
      fs.mkdirSync(directory, { mode: 0o700 });
      created.push(directory);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (!fs.lstatSync(directory).isDirectory()) {
        throw new Error(`Expected a real workspace directory: ${directory}`);
      }
    }
    verifiedDirs?.add(directory);
  }
  return directory;
}

function inspectReports(root, record, verifiedDirs = new Set(), { rejectLooseOnNoReport = false } = {}) {
  const canonicalRoot = resolveCanonicalRoot(root);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid handoff inspection record.");
  }
  const { workspace, assignments, handoffs } = record;
  let canonicalWorkspace;
  try {
    canonicalWorkspace = typeof workspace === "string" && workspace.trim() ? fs.realpathSync(workspace) : undefined;
  } catch {
    canonicalWorkspace = undefined;
  }
  if (!canonicalWorkspace || !isExpectedRealPath(canonicalRoot, canonicalWorkspace)) {
    throw new Error("The cohort must use the current shared workspace.");
  }
  const resolvedRoot = resolveReportRoot(record);
  const received = reconcileHandoffs(assignments, handoffs, resolvedRoot);
  if (record.squadId !== undefined) {
    validateSquadId(record.squadId);
    if (assignments.some((item, index) => item?.report !== reportPath(record.squadId, index + 1, resolvedRoot))) {
      throw new Error("Launch assignments must have distinct native IDs and their exact compiled report slots.");
    }
  }
  return assignments.map(({ conversationId, report }) => {
    const status = received.get(conversationId)?.status ?? "PENDING";
    let bytes;
    if (status === "READY" || status === "PARTIAL") {
      bytes = readEvidence(canonicalRoot, report, verifiedDirs);
    } else if (rejectLooseOnNoReport && status === "NO_REPORT" && readIfPresentWithStat(canonicalRoot, report, verifiedDirs)) {
      throw new Error(`Unexpected loose file present at NO_REPORT slot: ${report}`);
    }
    return { conversationId, report, status, bytes };
  });
}

function inspectHandoffs(root, record) {
  const canonicalRoot = resolveCanonicalRoot(root);
  return inspectReports(canonicalRoot, record).map(({ conversationId, report, status }) => ({
    conversationId,
    report,
    status
  }));
}

function bundleReports(root, record) {
  root = resolveCanonicalRoot(root);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid bundle record.");
  }
  const {
    squadId,
    verdict,
    verifiedFiles,
    requireIntegrityAudit = true,
    integrityReport,
    integrityAuditSlots,
    retainReports,
    replaceExisting = false,
    expectedPredecessorSha256,
    allowNonPassing = false,
    allowPartial = false
  } = record;
  validateSquadId(squadId);
  if (retainReports !== undefined && typeof retainReports !== "boolean") {
    throw new Error("retainReports must be a boolean.");
  }
  if (typeof requireIntegrityAudit !== "boolean") {
    throw new Error("requireIntegrityAudit must be a boolean.");
  }
  if (typeof replaceExisting !== "boolean") {
    throw new Error("replaceExisting must be a boolean.");
  }
  if (typeof allowNonPassing !== "boolean") {
    throw new Error("allowNonPassing must be a boolean.");
  }
  if (typeof allowPartial !== "boolean") {
    throw new Error("allowPartial must be a boolean.");
  }
  if (expectedPredecessorSha256 !== undefined && !/^[0-9a-f]{64}$/.test(expectedPredecessorSha256)) {
    throw new Error("expectedPredecessorSha256 must be a 64-character lowercase hex SHA-256 digest.");
  }
  if (
    integrityAuditSlots !== undefined &&
    (!Array.isArray(integrityAuditSlots) || integrityAuditSlots.some(slot => typeof slot !== "string" || !slot.trim()))
  ) {
    throw new Error("integrityAuditSlots must be an array of nonempty workspace-relative paths.");
  }
  const validVerdicts = new Set(["PASS", "FAIL", "BLOCKED"]);
  if (allowNonPassing ? !validVerdicts.has(verdict) : verdict !== "PASS") {
    throw new Error("Only independently passing cohorts are eligible for bundling.");
  }
  const verifiedDirs = new Set();
  const rootPrefix = resolveReportRoot(record);
  const assignments = inspectReports(root, record, verifiedDirs, { rejectLooseOnNoReport: true });
  const allowedStatuses = allowPartial ? new Set(["READY", "PARTIAL", "NO_REPORT"]) : new Set(["READY"]);
  if (
    assignments.some(
      ({ status, report }, index) => !allowedStatuses.has(status) || report !== reportPath(squadId, index + 1, rootPrefix)
    )
  ) {
    throw new Error(
      allowPartial
        ? "Bundling requires a READY, PARTIAL, or NO_REPORT handoff from each recorded specialist in its compiled slot."
        : "Bundling requires a READY handoff from each recorded specialist in its compiled slot."
    );
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
  verifyFiles(root, verifiedFiles, verifiedDirs);
  const synthesisCheck = readSynthesis(root, synthesisSlot, verifiedDirs, { allowNonPassing });
  if (synthesisCheck.verdict !== verdict) {
    throw new Error(
      allowNonPassing
        ? `Synthesis report verdict '${synthesisCheck.verdict}' does not match record verdict '${verdict}'.`
        : "Synthesis report must record an unambiguous PASS verdict."
    );
  }
  const synthesis = sha256(synthesisCheck.bytes);
  const reports = assignments.map(({ report, status, bytes }) => {
    const rawBytes = bytes ?? Buffer.alloc(0);
    const markdown = status === "NO_REPORT" ? "" : decodeUtf8(rawBytes, report);
    return {
      path: report,
      ...(status !== "READY" ? { status } : {}),
      sha256: sha256(rawBytes),
      markdown
    };
  });
  const evidenceDigest = canonicalSnapshotDigest(squadId, synthesis, verifiedFiles, reports);

  let integrityAudits = [];
  const isAuditCohort =
    squadId === "integrity_auditor" ||
    squadId.startsWith("integrity_auditor-");
  if (!isAuditCohort) {
    const candidateSet = new Set();
    if (integrityReport !== undefined) {
      if (typeof integrityReport !== "string" || !integrityReport.trim()) {
        throw new Error("integrityReport must be a nonempty workspace-relative path.");
      }
      candidateSet.add(integrityReport);
    }
    const hasExplicitAudit =
      integrityReport !== undefined ||
      (Array.isArray(integrityAuditSlots) && integrityAuditSlots.length > 0);
    if (requireIntegrityAudit || hasExplicitAudit) {
      for (const slot of integrityAuditSlots ?? []) candidateSet.add(slot);
      if (!hasExplicitAudit) {
        for (const slot of discoverAuditSlots(root, squadId, rootPrefix)) candidateSet.add(slot);
      }
    }
    const candidates = [...candidateSet];
    if (requireIntegrityAudit && candidates.length === 0) {
      throw new Error("Acceptance blocked: Mandatory integrity audit report missing. Run integrity_auditor (or audit-<squad> in /swarm) before bundling.");
    }
    integrityAudits = candidates.map(slot => {
      const audit = readIntegrityAudit(root, slot, squadId, verifiedDirs, evidenceDigest);
      return {
        path: slot,
        sha256: sha256(audit.bytes),
        verdict: audit.verdict,
        evidenceDigest: audit.evidenceDigest,
        ...(audit.targetSquad ? { targetSquad: audit.targetSquad } : {})
      };
    });
  }

  const auditPolicy =
    isAuditCohort || (!requireIntegrityAudit && integrityAudits.length === 0)
      ? "unaudited-explicit"
      : "required";
  const integrityAudit = integrityAudits[0];
  const bundlePayload = Buffer.from(
    JSON.stringify(
      {
        schemaVersion: 2,
        squadId,
        verdict: synthesisCheck.verdict,
        auditPolicy,
        ...(allowNonPassing ? { allowNonPassing: true } : {}),
        ...(allowPartial ? { allowPartial: true } : {}),
        synthesis,
        verifiedFiles,
        ...(retainReports ? { retainReports: true } : {}),
        ...(integrityAudit ? { integrityAudit, integrityAudits } : {}),
        reports
      },
      null,
      2
    ) + "\n"
  );
  const allowReplace = Boolean(replaceExisting || expectedPredecessorSha256 !== undefined);
  publish(root, relative, bundlePayload, allowReplace, verifiedDirs, expectedPredecessorSha256);
  return {
    path: relative,
    sha256: sha256(bundlePayload),
    auditPolicy,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h }))
  };
}

function verifyBundleInternal(root, relative, acceptedHash) {
  const verifiedDirs = new Set();
  const contents = readFile(root, relative, verifiedDirs);
  const digest = sha256(contents);
  if (acceptedHash !== undefined && digest !== acceptedHash) {
    throw new Error("Bundle differs from the primary's accepted digest.");
  }
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid bundle JSON object.");
  }
  const { squadId, synthesis, verifiedFiles, reports } = parsed;
  validateSquadId(squadId);
  if (parsed.schemaVersion !== undefined && (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion < 2)) {
    throw new Error("Unsupported bundle schemaVersion.");
  }
  if (parsed.auditPolicy !== undefined && parsed.auditPolicy !== "required" && parsed.auditPolicy !== "unaudited-explicit") {
    throw new Error(`Invalid auditPolicy '${parsed.auditPolicy}' in bundle.`);
  }
  if (parsed.allowNonPassing !== undefined && typeof parsed.allowNonPassing !== "boolean") {
    throw new Error("Invalid allowNonPassing boolean in bundle.");
  }
  if (parsed.allowPartial !== undefined && typeof parsed.allowPartial !== "boolean") {
    throw new Error("Invalid allowPartial boolean in bundle.");
  }
  const allowNonPassing = Boolean(parsed.allowNonPassing);
  const allowPartial = Boolean(parsed.allowPartial);
  const verdict = Object.hasOwn(parsed, "verdict") ? parsed.verdict : "PASS"; // legacy: field absent only
  if (allowNonPassing ? !["PASS", "FAIL", "BLOCKED"].includes(verdict) : verdict !== "PASS") {
    throw new Error("Bundle must record an independently verified PASS verdict.");
  }
  const rootPrefix = resolveReportRoot(relative, true);
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
  const synthesisCheck = readSynthesis(root, reportPath(squadId, undefined, rootPrefix), verifiedDirs, { allowNonPassing });
  if (synthesisCheck.verdict !== verdict || sha256(synthesisCheck.bytes) !== synthesis) {
    throw new Error("Synthesis changed after bundling.");
  }
  if (parsed.retainReports !== undefined && typeof parsed.retainReports !== "boolean") {
    throw new Error("Invalid retainReports boolean in bundle.");
  }
  verifyFiles(root, verifiedFiles, verifiedDirs);

  const loosePresent = [];
  const looseSnapshots = [];
  for (const report of reports) {
    if (typeof report.markdown !== "string" || typeof report.sha256 !== "string") {
      throw new Error(`Invalid archived report entry: ${report?.path}`);
    }
    if (report.status !== undefined && !["READY", "PARTIAL", "NO_REPORT"].includes(report.status)) {
      throw new Error(`Invalid archived report status '${report.status}': ${report?.path}`);
    }
    if (report.status === "NO_REPORT") {
      if (!allowPartial || report.markdown !== "") {
        throw new Error(`Invalid NO_REPORT entry: ${report?.path}`);
      }
      const bytes = Buffer.alloc(0);
      const loose = readIfPresentWithStat(root, report.path, verifiedDirs);
      if (sha256(bytes) !== report.sha256 || loose) {
        throw new Error(`Archived or loose report changed: ${report.path}`);
      }
      continue;
    }
    if (report.status === "PARTIAL" && !allowPartial) {
      throw new Error(`PARTIAL report requires allowPartial bundle opt-in: ${report?.path}`);
    }
    const bytes = Buffer.from(report.markdown, "utf8");
    const loose = readIfPresentWithStat(root, report.path, verifiedDirs);
    if (!bytes.length || sha256(bytes) !== report.sha256 || (loose && !loose.bytes.equals(bytes))) {
      throw new Error(`Archived or loose report changed: ${report.path}`);
    }
    if (loose) {
      loosePresent.push(report.path);
      looseSnapshots.push({
        path: report.path,
        sha256: report.sha256,
        dev: loose.stat.dev,
        ino: loose.stat.ino,
        size: loose.stat.size
      });
    }
  }

  const snapshotDigest = canonicalSnapshotDigest(squadId, synthesis, verifiedFiles, reports);
  if (parsed.integrityAudits !== undefined && (!Array.isArray(parsed.integrityAudits) || parsed.integrityAudits.length === 0)) {
    throw new Error("Invalid integrityAudits array in bundle.");
  }
  const isV2 = parsed.schemaVersion >= 2 || parsed.auditPolicy !== undefined;
  const auditEntries = Array.isArray(parsed.integrityAudits)
    ? parsed.integrityAudits
    : (parsed.integrityAudit ? [parsed.integrityAudit] : []);
  if (parsed.integrityAudit && parsed.integrityAudits) {
    const head = parsed.integrityAudits[0];
    if (
      parsed.integrityAudit.path !== head?.path ||
      parsed.integrityAudit.sha256 !== head?.sha256 ||
      ((isV2 || parsed.integrityAudit.evidenceDigest !== undefined) && parsed.integrityAudit.evidenceDigest !== head?.evidenceDigest) ||
      ((isV2 || parsed.integrityAudit.targetSquad !== undefined) && parsed.integrityAudit.targetSquad !== head?.targetSquad) ||
      ((isV2 || parsed.integrityAudit.verdict !== undefined) && parsed.integrityAudit.verdict !== head?.verdict)
    ) {
      throw new Error("Bundle integrityAudit disagrees with integrityAudits[0].");
    }
  }
  const auditRequired = parsed.auditPolicy === "required" || (parsed.schemaVersion >= 2 && parsed.auditPolicy !== "unaudited-explicit");
  if (auditRequired && auditEntries.length === 0) {
    throw new Error("Acceptance blocked: Bundle auditPolicy 'required' is missing integrityAudit evidence.");
  }
  if (parsed.auditPolicy === "unaudited-explicit" && auditEntries.length > 0) {
    throw new Error("Bundle auditPolicy 'unaudited-explicit' cannot embed integrityAudit evidence.");
  }
  for (const audit of auditEntries) {
    if (!audit || typeof audit !== "object" || typeof audit.path !== "string" || typeof audit.sha256 !== "string") {
      throw new Error("Invalid integrityAudit entry in bundle.");
    }
    if ((isV2 || audit.verdict !== undefined) && audit.verdict !== "CLEAN") {
      throw new Error(`Integrity audit entry verdict '${audit.verdict}' is not CLEAN.`);
    }
    if (audit.targetSquad !== undefined && audit.targetSquad !== squadId) {
      throw new Error(`Integrity audit targetSquad '${audit.targetSquad}' does not match bundle squad '${squadId}'.`);
    }
    const expectedDigestForEntry = isV2 || audit.evidenceDigest !== undefined ? snapshotDigest : undefined;
    if (expectedDigestForEntry !== undefined && audit.evidenceDigest !== undefined && audit.evidenceDigest !== expectedDigestForEntry) {
      throw new Error(`Integrity audit evidenceDigest '${audit.evidenceDigest}' does not match verified bundle snapshot.`);
    }
    const auditCheck = readIntegrityAudit(root, audit.path, squadId, verifiedDirs, expectedDigestForEntry);
    if (sha256(auditCheck.bytes) !== audit.sha256) {
      throw new Error(`Integrity audit report changed: ${audit.path}`);
    }
  }
  const resolvedPolicy = parsed.auditPolicy ?? (auditEntries.length > 0 ? "legacy-audited" : "legacy-unaudited");

  // Legacy read-only verification compatibility for pre-Phase-2 bundle manifests.
  if (parsed.adversarialReview) {
    const adv = parsed.adversarialReview;
    if (!adv || typeof adv !== "object" || typeof adv.path !== "string" || typeof adv.sha256 !== "string") {
      throw new Error("Invalid adversarialReview entry in bundle.");
    }
    const advSynthesis = readSynthesis(root, adv.path, verifiedDirs);
    if (sha256(advSynthesis.bytes) !== adv.sha256) {
      throw new Error(`Adversarial review report changed: ${adv.path}`);
    }
  }

  return {
    path: relative,
    sha256: digest,
    auditPolicy: resolvedPolicy,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })),
    loosePresent,
    looseSnapshots,
    retainReports: parsed.retainReports === true
  };
}

function verifyBundle(root, relative, acceptedHash) {
  const canonicalRoot = resolveCanonicalRoot(root);
  const { path: p, sha256: s, auditPolicy, reports } = verifyBundleInternal(canonicalRoot, relative, acceptedHash);
  return { path: p, sha256: s, auditPolicy, reports };
}

function removeVerifiedLooseSnapshots(canonicalRoot, looseSnapshots) {
  const verifiedDirs = new Set();
  const removed = [];
  for (let i = 0; i < looseSnapshots.length; i += 1) {
    const snap = looseSnapshots[i];
    const remaining = looseSnapshots.slice(i).map(item => item.path);
    try {
      const targetPath = workspacePath(canonicalRoot, snap.path, verifiedDirs);
      const { bytes, stat } = readOpenedFileWithStat(targetPath, snap.path);
      if (
        stat.dev !== snap.dev ||
        stat.ino !== snap.ino ||
        stat.size !== snap.size ||
        sha256(bytes) !== snap.sha256
      ) {
        const conflictErr = new Error(
          `Prune aborted before removing '${snap.path}': file changed or was replaced after verification.`
        );
        conflictErr.removed = removed;
        conflictErr.remaining = remaining;
        throw conflictErr;
      }
      fs.unlinkSync(targetPath);
      removed.push(snap.path);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      if (error.removed === undefined) {
        const wrapped = new Error(
          `Prune failed at '${snap.path}' (removed ${removed.length} [${removed.join(", ")}], remaining ${remaining.length} [${remaining.join(", ")}]): ${error.message}`
        );
        wrapped.cause = error;
        wrapped.code = error.code;
        wrapped.removed = removed;
        wrapped.remaining = remaining;
        throw wrapped;
      }
      throw error;
    }
  }
  return { removed };
}

function pruneReports(root, relative, acceptedHash, options = {}) {
  const canonicalRoot = resolveCanonicalRoot(root);
  if (!/^[0-9a-f]{64}$/.test(acceptedHash ?? "")) throw new Error("Pruning requires the primary's accepted bundle digest.");
  const { loosePresent, looseSnapshots, retainReports } = verifyBundleInternal(canonicalRoot, relative, acceptedHash);
  if (options.keepReports || retainReports) {
    return { removed: [], retained: loosePresent };
  }
  return removeVerifiedLooseSnapshots(canonicalRoot, looseSnapshots);
}

function verifyAndPruneBundle(root, relative, options = {}) {
  const canonicalRoot = resolveCanonicalRoot(root);
  const verified = verifyBundleInternal(canonicalRoot, relative, options.acceptedHash);
  const { path: p, sha256: s, auditPolicy, reports, loosePresent, looseSnapshots, retainReports } = verified;
  const pruned = options.keepReports || retainReports
    ? { removed: [], retained: loosePresent }
    : removeVerifiedLooseSnapshots(canonicalRoot, looseSnapshots);
  return { path: p, sha256: s, auditPolicy, reports, pruned };
}

function validateReportSlotPath(slotPath) {
  if (typeof slotPath !== "string" || !slotPath) {
    throw new Error(`Invalid report slot path '${slotPath}': expected '<reportRoot>/squad-<id>/(lead|specialist-<N>)/report.md'.`);
  }
  const match = /^(.+)\/squad-([^/\s]+)\/(?:lead|specialist-[1-9]\d*)\/report\.md$/.exec(slotPath);
  if (!match) {
    throw new Error(`Invalid report slot path '${slotPath}': expected '<reportRoot>/squad-<id>/(lead|specialist-<N>)/report.md'.`);
  }
  const rawRoot = match[1];
  const rawSquadId = match[2];
  if (rawRoot !== rawRoot.trim() || /^[a-zA-Z]:/.test(rawRoot) || !isValidRelativePrefix(rawRoot)) {
    throw new Error(`Invalid report slot path '${slotPath}': invalid reportRoot prefix.`);
  }
  validateSquadId(rawSquadId);
  const directory = `squad-${encodeURIComponent(rawSquadId)}`;
  if (directory !== `squad-${rawSquadId}` || Buffer.byteLength(directory) > 255) {
    throw new Error(`Invalid report slot path '${slotPath}': invalid squad directory name.`);
  }
  return {
    reportRoot: rawRoot,
    squadId: rawSquadId,
    slotTail: slotPath.slice(rawRoot.length + 1)
  };
}

function rebaseSlotReportRoot(slotPath, targetReportRoot) {
  const { slotTail } = validateReportSlotPath(slotPath);
  if (!targetReportRoot) return slotPath;
  const cleanTargetRoot = normalizeReportRoot(targetReportRoot);
  const rebased = `${cleanTargetRoot}/${slotTail}`;
  if (Buffer.byteLength(`PARTIAL ${rebased} — `) + SWARM_MENTION_RESERVE_BYTES + MIN_OBSERVATION_BYTES > messageLimit) {
    throw new Error(`Report slot exceeds 500-byte Pointer-Over-Wire prefix budget (including PARTIAL, /swarm @mention, and observation headroom): ${rebased}`);
  }
  return rebased;
}

function discoverSingleSquadAuditSlotsIfMatching(sources, squadId, rootPrefix) {
  const flatAuditDir = `${rootPrefix}/squad-integrity_auditor`;
  const matching = [];
  for (const { real } of sources) {
    for (const rel of listCohortSlotsIfPresent(real, flatAuditDir)) {
      const opened = readIfPresentWithStat(real, rel, new Set());
      if (opened) {
        const text = decodeUtf8(opened.bytes, rel);
        if (text.trim()) {
          const declaredTarget = parseTargetSquad(text);
          if (declaredTarget && declaredTarget !== squadId) continue;
        }
      }
      matching.push(rel);
    }
  }
  return matching;
}

function collectReportSlots(root, options = {}) {
  root = resolveCanonicalRoot(root);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Provide valid collect options.");
  }
  const {
    sources = [],
    plan,
    record,
    squadId,
    reportRoot,
    overwrite = false,
    dryRun = false,
    allowEmpty = false,
    strict = false
  } = options;

  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("Provide at least one worktree directory via --from <dir>.");
  }
  if (typeof overwrite !== "boolean" || typeof dryRun !== "boolean" || typeof allowEmpty !== "boolean" || typeof strict !== "boolean") {
    throw new Error("Collect flags overwrite, dryRun, allowEmpty, and strict must be booleans.");
  }
  const overrideRoot = reportRoot !== undefined ? normalizeReportRoot(reportRoot) : undefined;

  const resolvedSources = [];
  const seenRealSources = new Set();
  for (const src of sources) {
    if (typeof src !== "string" || !src.trim()) {
      throw new Error("Worktree --from path must be a nonempty directory path.");
    }
    let realSrc;
    try {
      realSrc = fs.realpathSync(src);
    } catch (error) {
      throw new Error(`Worktree directory does not exist (${src}): ${error.message}`);
    }
    if (!fs.lstatSync(realSrc).isDirectory()) {
      throw new Error(`Worktree path is not a directory: ${src}`);
    }
    if (isExpectedRealPath(root, realSrc)) {
      throw new Error(`Worktree source '${src}' resolves to the coordinator workspace itself.`);
    }
    const seenKey = process.platform === "win32" || process.platform === "darwin" ? realSrc.toLowerCase() : realSrc;
    if (!seenRealSources.has(seenKey)) {
      seenRealSources.add(seenKey);
      resolvedSources.push({ raw: src, real: realSrc });
    }
  }

  const targetSlotSet = new Set();
  const inheritSlotSet = new Set();
  const addSlot = (slot, isInherit = false) => {
    validateReportSlotPath(slot);
    const resolvedSlot = overrideRoot !== undefined ? rebaseSlotReportRoot(slot, overrideRoot) : slot;
    targetSlotSet.add(resolvedSlot);
    if (isInherit) {
      inheritSlotSet.add(resolvedSlot);
    }
  };
  let explicitExpectations = false;
  if (plan !== undefined) {
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      throw new Error("Provide a valid squad_planner JSON object.");
    }
    if (!Array.isArray(plan.workers) || (plan.integrityAuditPlan !== undefined && !Array.isArray(plan.integrityAuditPlan))) {
      throw new Error("Plan output must define a workers array (and integrityAuditPlan array when present).");
    }
    if (squadId !== undefined) validateSquadId(squadId);
    let matchedPlanSquad = false;
    for (const w of plan.workers) {
      if (squadId !== undefined && w?.squadId !== squadId) continue;
      matchedPlanSquad = true;
      if (w?.lead?.reportSlot !== undefined) {
        addSlot(w.lead.reportSlot, w.lead.swarmAdd?.workspace === "inherit");
      }
      for (const s of w?.specialists ?? []) {
        if (s?.reportSlot !== undefined) {
          addSlot(s.reportSlot, s.swarmAdd?.workspace === "inherit");
        }
      }
    }
    for (const entry of plan.provenanceScaffold?.entries ?? []) {
      if (squadId !== undefined && entry?.squadId !== squadId) continue;
      matchedPlanSquad = true;
      if (entry?.reportSlot !== undefined) {
        addSlot(entry.reportSlot, plan.executionMode === "swarm" && entry?.slotType === "lead");
      }
    }
    for (const audit of plan.integrityAuditPlan ?? []) {
      if (squadId !== undefined && audit?.targetSquad !== squadId) continue;
      if (audit?.reportSlot !== undefined) {
        addSlot(audit.reportSlot, audit.swarmAdd?.workspace === "inherit");
      }
    }
    if (squadId !== undefined && !matchedPlanSquad) {
      throw new Error(`Squad '${squadId}' was not found in the supplied plan.`);
    }
    explicitExpectations = true;
  } else if (record !== undefined) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("Provide a valid bundle or handoff record.");
    }
    validateSquadId(record.squadId);
    if (squadId !== undefined && squadId !== record.squadId) {
      throw new Error(`Conflicting squad '${squadId}' for record squad '${record.squadId}'.`);
    }
    const rootPrefix = overrideRoot ?? resolveReportRoot(record);
    addSlot(reportPath(record.squadId, undefined, rootPrefix));
    for (const a of record.assignments ?? []) {
      if (a?.report !== undefined) addSlot(a.report);
    }
    let hasExplicitAuditSlot = false;
    for (const slot of record.integrityAuditSlots ?? []) {
      addSlot(slot);
      hasExplicitAuditSlot = true;
    }
    if (record.integrityReport !== undefined) {
      addSlot(record.integrityReport);
      hasExplicitAuditSlot = true;
    }
    if (!hasExplicitAuditSlot && record.requireIntegrityAudit !== false) {
      const scopedAuditDir = `${rootPrefix}/squad-${encodeURIComponent(`integrity_auditor-${record.squadId}`)}`;
      let foundScoped = false;
      for (const { real } of resolvedSources) {
        for (const rel of listCohortSlotsIfPresent(real, scopedAuditDir)) {
          targetSlotSet.add(rel);
          foundScoped = true;
        }
      }
      if (!foundScoped) {
        for (const rel of discoverSingleSquadAuditSlotsIfMatching(resolvedSources, record.squadId, rootPrefix)) {
          targetSlotSet.add(rel);
        }
      }
    }
    explicitExpectations = true;
  } else if (squadId !== undefined) {
    validateSquadId(squadId);
    const rootPrefix = overrideRoot ?? defaultReportRoot();
    const workingCohortDir = `${rootPrefix}/squad-${encodeURIComponent(squadId)}`;
    const auditCohortDir = `${rootPrefix}/squad-${encodeURIComponent(`integrity_auditor-${squadId}`)}`;
    let foundScopedAudit = false;
    for (const { real } of resolvedSources) {
      for (const rel of listCohortSlotsIfPresent(real, workingCohortDir)) {
        targetSlotSet.add(rel);
      }
      for (const rel of listCohortSlotsIfPresent(real, auditCohortDir)) {
        targetSlotSet.add(rel);
        foundScopedAudit = true;
      }
    }
    if (!foundScopedAudit) {
      for (const rel of discoverSingleSquadAuditSlotsIfMatching(resolvedSources, squadId, rootPrefix)) {
        targetSlotSet.add(rel);
      }
    }
  } else {
    throw new Error("Provide --plan <plan.json>, --record <record.json>, or --squad <id> to collect report slots.");
  }

  const targetSlots = [...targetSlotSet];
  const foundBySlot = new Map();
  for (const { raw, real } of resolvedSources) {
    const verifiedSrcDirs = new Set();
    for (const slotRel of targetSlots) {
      const opened = readIfPresentWithStat(real, slotRel, verifiedSrcDirs);
      if (!opened) continue;
      const text = decodeUtf8(opened.bytes, slotRel);
      if (!text.trim()) continue;
      const hash = sha256(opened.bytes);
      const prev = foundBySlot.get(slotRel);
      if (prev) {
        if (prev.hash !== hash) {
          throw new Error(
            `Conflict collecting '${slotRel}': '${prev.source}' (${prev.hash.slice(0, 12)}) differs from '${raw}' (${hash.slice(0, 12)}).`
          );
        }
        continue;
      }
      foundBySlot.set(slotRel, { bytes: opened.bytes, hash, source: raw });
    }
  }

  const verifiedInheritDirs = new Set();
  const missing = targetSlots.filter(slotRel => {
    if (foundBySlot.has(slotRel)) return false;
    if (inheritSlotSet.has(slotRel)) {
      const rootExisting = readIfPresentWithStat(root, slotRel, verifiedInheritDirs);
      if (rootExisting && decodeUtf8(rootExisting.bytes, slotRel).trim().length > 0) {
        return false;
      }
    }
    return true;
  });
  if (foundBySlot.size === 0 && !allowEmpty) {
    throw new Error("No non-empty report slots were found across the provided worktrees.");
  }
  if (strict && explicitExpectations && missing.length > 0) {
    throw new Error(`Missing expected report slot(s) across worktrees: ${missing.join(", ")}`);
  }

  const verifiedDestDirs = new Set();
  const pendingActions = [];
  for (const [slotRel, entry] of foundBySlot.entries()) {
    assertNoSymlinkedAncestors(root, slotRel, verifiedDestDirs);
    const existing = readIfPresentWithStat(root, slotRel, verifiedDestDirs);
    if (existing) {
      if (existing.bytes.equals(entry.bytes)) {
        pendingActions.push({ kind: "unchanged", slotRel, entry });
        continue;
      }
      const existingNonEmpty = decodeUtf8(existing.bytes, slotRel).trim().length > 0;
      if (existingNonEmpty && !overwrite) {
        throw new Error(
          `Conflict at destination '${slotRel}': coordinator workspace already has differing content (SHA-256 ${sha256(existing.bytes).slice(0, 12)}); pass --overwrite to replace.`
        );
      }
    }
    pendingActions.push({ kind: "copy", slotRel, entry });
  }

  const collected = [];
  const unchanged = [];
  for (const action of pendingActions) {
    const { kind, slotRel, entry } = action;
    if (kind === "unchanged") {
      unchanged.push({
        slot: slotRel,
        from: entry.source,
        sha256: entry.hash,
        bytes: entry.bytes.length,
        status: "unchanged"
      });
      continue;
    }
    if (!dryRun) {
      ensureDirectory(root, path.posix.dirname(slotRel), [], verifiedDestDirs);
      publish(root, slotRel, entry.bytes, true, verifiedDestDirs, undefined, { sync: false });
    }
    collected.push({
      slot: slotRel,
      from: entry.source,
      sha256: entry.hash,
      bytes: entry.bytes.length,
      status: dryRun ? "would-copy" : "copied"
    });
  }

  return {
    workspace: root,
    sources: resolvedSources.map(s => s.real),
    collected,
    unchanged,
    missing,
    dryRun
  };
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function buildBundleRecordInit(root, options = {}) {
  root = resolveCanonicalRoot(root);
  if (!isPlainObject(options)) {
    throw new Error("Provide valid bundle-init options.");
  }
  const {
    plan,
    provenance,
    squadId,
    files = [],
    reportRoot,
    verdict,
    idMap = {},
    handoffs,
    allowUnaudited = false,
    allowNonPassing = false,
    allowPartial = false
  } = options;

  if (!isPlainObject(plan)) {
    throw new Error("Provide a valid squad_planner JSON object.");
  }
  if (!isPlainObject(idMap)) {
    throw new Error("idMap must be a plain object mapping worker names to IDs.");
  }
  const templates = plan.bundleRecordTemplates;
  if (!isPlainObject(templates)) {
    throw new Error("Plan output does not contain bundleRecordTemplates.");
  }
  const templateKeys = Object.keys(templates);
  let selectedSquadId = squadId;
  if (selectedSquadId !== undefined) {
    validateSquadId(selectedSquadId);
    if (!Object.hasOwn(templates, selectedSquadId)) {
      throw new Error(`Squad '${selectedSquadId}' was not found in plan.bundleRecordTemplates (${templateKeys.join(", ") || "none"}).`);
    }
  } else if (templateKeys.length === 1) {
    selectedSquadId = templateKeys[0];
  } else {
    throw new Error(
      `Plan defines ${templateKeys.length} squads (${templateKeys.join(", ") || "none"}); specify --squad <id>.`
    );
  }
  validateSquadId(selectedSquadId);

  const template = templates[selectedSquadId];
  if (!isPlainObject(template)) {
    throw new Error(`Plan bundleRecordTemplates['${selectedSquadId}'] must be a plain object.`);
  }
  const resolvedReportRoot =
    reportRoot !== undefined
      ? normalizeReportRoot(reportRoot)
      : template.reportRoot !== undefined
        ? normalizeReportRoot(template.reportRoot)
        : defaultReportRoot();

  const mergedEntries = [
    ...(Array.isArray(plan.provenanceScaffold?.entries) ? plan.provenanceScaffold.entries : []),
    ...(Array.isArray(provenance?.entries) ? provenance.entries : [])
  ].filter(entry => entry && entry.squadId === selectedSquadId);

  const bySlot = new Map();
  const byWorker = new Map();
  for (const entry of mergedEntries) {
    if (typeof entry.reportSlot === "string") bySlot.set(entry.reportSlot, entry);
    if (typeof entry.workerName === "string") byWorker.set(entry.workerName, entry);
  }

  const matchedIdMapKeys = new Set();
  const assignments = (Array.isArray(template.assignments) ? template.assignments : []).map((item, idx) => {
    if (!isPlainObject(item)) {
      throw new Error(`Plan bundleRecordTemplates['${selectedSquadId}'] assignment must be a plain object.`);
    }
    const slotPath =
      reportRoot !== undefined ? reportPath(selectedSquadId, idx + 1, resolvedReportRoot) : item.report;
    const entry = bySlot.get(slotPath) || bySlot.get(item.report) || byWorker.get(item.conversationId);
    let mappedId;
    if (entry && Object.hasOwn(idMap, entry.workerName)) {
      mappedId = idMap[entry.workerName];
      matchedIdMapKeys.add(entry.workerName);
    } else if (Object.hasOwn(idMap, item.conversationId)) {
      mappedId = idMap[item.conversationId];
      matchedIdMapKeys.add(item.conversationId);
    }
    let nextId = item.conversationId;
    if (typeof mappedId === "string" && mappedId.trim()) {
      nextId = mappedId.trim();
    } else if (
      plan.executionMode !== "swarm" &&
      typeof entry?.conversationId === "string" &&
      entry.conversationId.trim() &&
      !/^<.*>$/.test(entry.conversationId.trim())
    ) {
      nextId = entry.conversationId.trim();
    }
    return {
      conversationId: nextId,
      report: slotPath
    };
  });
  for (const key of Object.keys(idMap ?? {})) {
    if (!matchedIdMapKeys.has(key)) {
      throw new Error(`--id-map key '${key}' did not match any worker or assignment in squad '${selectedSquadId}'.`);
    }
  }

  if (!Array.isArray(files) || files.some(f => typeof f !== "string" || !f.trim())) {
    throw new Error("verifiedFiles inputs must be nonempty workspace-relative file paths.");
  }
  let verifiedFiles = {};
  if (files.length > 0) {
    verifiedFiles = fingerprint(root, files);
  } else if (
    template.verifiedFiles &&
    typeof template.verifiedFiles === "object" &&
    !Array.isArray(template.verifiedFiles) &&
    Object.keys(template.verifiedFiles).length > 0
  ) {
    verifiedFiles = fingerprint(root, Object.keys(template.verifiedFiles));
  }

  const validVerdicts = new Set(["PASS", "FAIL", "BLOCKED"]);
  let resolvedVerdict = template.verdict || "PASS";
  if (verdict !== undefined) {
    if (!validVerdicts.has(verdict)) {
      throw new Error(`Invalid verdict '${verdict}': expected PASS, FAIL, or BLOCKED.`);
    }
    resolvedVerdict = verdict;
  } else {
    const leadSlot = reportPath(selectedSquadId, undefined, resolvedReportRoot);
    const leadOpened = readIfPresentWithStat(root, leadSlot, new Set());
    if (leadOpened) {
      const leadText = decodeUtf8(leadOpened.bytes, leadSlot);
      if (leadText.trim()) {
        try {
          resolvedVerdict = parseContentVerdict(leadText);
        } catch (error) {
          if (hasContentVerdictAttempt(leadText)) {
            throw new Error(`Existing synthesis report '${leadSlot}' contains an invalid or conflicting verdict: ${error.message}`);
          }
        }
      }
    }
  }

  const requireAudit = allowUnaudited ? false : (template.requireIntegrityAudit ?? true);
  let auditSlots = [];
  if (requireAudit) {
    if (reportRoot === undefined && Array.isArray(template.integrityAuditSlots) && template.integrityAuditSlots.length > 0) {
      auditSlots = [...template.integrityAuditSlots];
    } else if (Array.isArray(plan.integrityAuditPlan) && plan.integrityAuditPlan.length > 0) {
      const matchingAudits = plan.integrityAuditPlan.filter(a => a && a.targetSquad === selectedSquadId);
      auditSlots = matchingAudits.map(a =>
        reportRoot !== undefined ? rebaseSlotReportRoot(a.reportSlot, resolvedReportRoot) : a.reportSlot
      );
    }
  }

  let resolvedHandoffs = Array.isArray(template.handoffs) ? [...template.handoffs] : [];
  if (handoffs !== undefined) {
    if (!Array.isArray(handoffs)) {
      throw new Error("handoffs must be an array of { sender, message } entries.");
    }
    for (const h of handoffs) {
      if (!h || typeof h !== "object" || typeof h.sender !== "string" || !h.sender.trim() || typeof h.message !== "string" || !h.message.trim()) {
        throw new Error("Each handoff must include nonempty 'sender' and 'message' strings.");
      }
    }
    resolvedHandoffs = handoffs.map(({ sender, message }) => ({ sender: sender.trim(), message }));
  }

  return {
    squadId: selectedSquadId,
    workspace: root,
    reportRoot: resolvedReportRoot,
    verdict: resolvedVerdict,
    ...(allowNonPassing ? { allowNonPassing: true } : {}),
    ...(allowPartial ? { allowPartial: true } : {}),
    verifiedFiles,
    assignments,
    handoffs: resolvedHandoffs,
    requireIntegrityAudit: requireAudit,
    ...(requireAudit && auditSlots.length > 0 ? { integrityAuditSlots: auditSlots } : {})
  };
}

export {
  buildBundleRecordInit,
  bundleReports,
  collectReportSlots,
  computeEvidenceDigest,
  decodeUtf8,
  ensureDirectory,
  fingerprint,
  inspectHandoffs,
  messageLimit,
  normalizeReportRoot,
  pruneReports,
  publish,
  readFile,
  reportPath,
  verifyAndPruneBundle,
  verifyBundle
};
