import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hasContentVerdictAttempt, parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad, validateSquadId } from "./verdicts.mjs";

const messageLimit = 500;
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f\u2028\u2029]/;
const WINDOWS_DRIVE_RE = /^[a-zA-Z]:/;
const SWARM_MENTION_RESERVE_BYTES = 33; // "@<24-char-name> [done] " prefix headroom on /swarm
const MIN_OBSERVATION_BYTES = 16; // minimum observation reserve alongside PARTIAL prefix + @24-char mention

function isValidRelativePrefix(prefix) {
  return (
    typeof prefix === "string" &&
    prefix.length > 0 &&
    !CONTROL_CHAR_RE.test(prefix) &&
    !WINDOWS_DRIVE_RE.test(prefix) &&
    !prefix.includes("\\") &&
    !path.isAbsolute(prefix) &&
    !prefix.split("/").some(part => !part || part === "." || part === "..")
  );
}

function trimTrailingSlashes(value) {
  const s = value.trim();
  let end = s.length;
  while (end > 0 && s[end - 1] === "/") end--;
  return s.slice(0, end);
}

function defaultScratchBase() {
  const raw = trimTrailingSlashes(process.env.AGY_SQUAD_SCRATCH_ROOT || "scratch");
  if (!isValidRelativePrefix(raw)) {
    throw new Error(`Invalid AGY_SQUAD_SCRATCH_ROOT: ${raw}`);
  }
  return raw;
}

function normalizeReportRoot(reportRoot) {
  const trimmed = typeof reportRoot === "string" ? trimTrailingSlashes(reportRoot) : "";
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

const REPORT_TAIL_RE = /^squad-[^/\s]+\/(?:lead\/report\.(?:md|sources\.json)|specialist-[1-9]\d*\/report\.md)$/;
const RECEIPT_SEPARATORS = [" — ", " -- ", " - "];
const RECEIPT_PREFIX_RE = /^(?:@[A-Za-z0-9._:-]+\s+)*(?:\[done\]\s+)?(?=(?:READY|PARTIAL|NO_REPORT)\b)/;
const PREDECESSOR_LOCK_STALE_MS = 30_000;

function stripReceiptPrefix(message) {
  return message.replace(RECEIPT_PREFIX_RE, "");
}

function hasAgySquadSegment(prefix) {
  const parts = prefix.split("/");
  const idx = parts.lastIndexOf("agy-squad");
  return idx >= 1 && parts.slice(idx + 1).every(seg => !/\s/.test(seg));
}

function resolveReportRoot(recordOrPath, allowCustomPrefix = false) {
  if (typeof recordOrPath === "string") {
    const markerIdx = recordOrPath.lastIndexOf("/squad-");
    if (markerIdx > 0) {
      const prefix = recordOrPath.slice(0, markerIdx);
      const tail = recordOrPath.slice(markerIdx + 1);
      if (
        REPORT_TAIL_RE.test(tail) &&
        isValidRelativePrefix(prefix) &&
        (allowCustomPrefix || (prefix.includes("/agy-squad") && hasAgySquadSegment(prefix)))
      ) {
        return prefix;
      }
    }
    return defaultReportRoot();
  }
  if (recordOrPath?.reportRoot !== undefined) {
    return normalizeReportRoot(recordOrPath.reportRoot);
  }
  const firstSlot = recordOrPath?.assignments?.[0]?.report;
  return typeof firstSlot === "string" ? resolveReportRoot(firstSlot, true) : defaultReportRoot();
}

function parsePointerReceipt(parsedMessage, report) {
  for (const verb of ["READY", "PARTIAL"]) {
    for (const sep of RECEIPT_SEPARATORS) {
      const prefix = `${verb} ${report}${sep}`;
      if (parsedMessage.startsWith(prefix)) {
        const note = parsedMessage.slice(prefix.length);
        return note.trim() ? { status: verb } : null;
      }
    }
  }
  for (const sep of RECEIPT_SEPARATORS) {
    const prefix = `NO_REPORT${sep}`;
    if (parsedMessage.startsWith(prefix)) {
      const note = parsedMessage.slice(prefix.length);
      return note.trim() ? { status: "NO_REPORT" } : null;
    }
  }
  return null;
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
    // Allow leading /swarm @mention prefixes and optional [done] marker before Pointer-Over-Wire verbs.
    const parsedMessage = stripReceiptPrefix(message);
    // REVIEW: Compare to the exact assigned path. It may contain spaces, "-", "--", or " — ".
    const parsedReceipt = parsePointerReceipt(parsedMessage, report);
    if (!parsedReceipt) {
      const matchedVerb = parsedMessage.startsWith(`READY ${report}`)
        ? "READY"
        : parsedMessage.startsWith(`PARTIAL ${report}`)
          ? "PARTIAL"
          : undefined;
      const afterSlot = matchedVerb ? parsedMessage.slice(`${matchedVerb} ${report}`.length) : "";
      const afterSlotTrimmed = afterSlot.trim();
      const afterNoReport = parsedMessage.startsWith("NO_REPORT") ? parsedMessage.slice("NO_REPORT".length) : "";
      const afterNoReportTrimmed = afterNoReport.trim();
      const isBlankAfterValidSep = value => value === "—" || value === "--" || value === "-";
      const delimiterMismatch =
        (matchedVerb &&
          /^(?:\s|[-:–—])/.test(afterSlot) &&
          Boolean(afterSlotTrimmed) &&
          !isBlankAfterValidSep(afterSlotTrimmed)) ||
        (/^NO_REPORT(?:\s|[-:–—])/.test(parsedMessage) &&
          Boolean(afterNoReportTrimmed) &&
          !isBlankAfterValidSep(afterNoReportTrimmed));
      if (delimiterMismatch) {
        throw new Error(
          `Handoff must include the sender's assigned report and an observation, or a NO_REPORT reason. Expected ' — ', ' -- ', or ' - ' delimiter: '${matchedVerb ? `${matchedVerb} ${report} — <observation>` : "NO_REPORT — <reason>"}'.`
        );
      }
      throw new Error("Handoff must include the sender's assigned report and an observation, or a NO_REPORT reason.");
    }
    if (received.has(sender) && received.get(sender).message !== message) {
      throw new Error("Conflicting handoffs from one assignment.");
    }
    received.set(sender, { message, status: parsedReceipt.status });
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

function isContainedPath(root, target, allowEqual = false, platform = process.platform) {
  const normalizeCase = platform === "win32" || platform === "darwin";
  const normRoot = normalizeCase ? root.toLowerCase() : root;
  const normTarget = normalizeCase ? target.toLowerCase() : target;
  const pathImpl = platform === "win32" ? path.win32 : path.posix;
  const rel = pathImpl.relative(normRoot, normTarget);
  return (
    (allowEqual || Boolean(rel)) &&
    rel !== ".." &&
    !rel.startsWith(`..${pathImpl.sep}`) &&
    !pathImpl.isAbsolute(rel)
  );
}

function resolveCanonicalRoot(root, verifiedDirs) {
  if (verifiedDirs?.has(root)) return root;
  if (typeof root !== "string" || !root.trim()) {
    throw new Error("Expected a valid workspace directory path.");
  }
  const realRoot = fs.realpathSync.native(root);
  if (!fs.lstatSync(realRoot).isDirectory()) {
    throw new Error(`Expected workspace root to be a directory: ${root}`);
  }
  verifiedDirs?.add(realRoot);
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
    if (!isExpectedRealPath(current, fs.realpathSync.native(current))) {
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
    WINDOWS_DRIVE_RE.test(relative) ||
    relative.includes("\\") ||
    path.isAbsolute(relative) ||
    relative.split("/").some(part => !part || part === "." || part === "..")
  ) {
    throw new Error(`Expected a workspace-relative file path: ${relative}`);
  }
  const file = path.join(root, relative);
  const dir = path.dirname(file);
  if (!verifiedDirs?.has(dir)) {
    if (!isExpectedRealPath(dir, fs.realpathSync.native(dir))) {
      throw new Error(`Symlinked directories are unsupported: ${relative}`);
    }
    verifiedDirs?.add(dir);
  }
  return file;
}

function readOpenedFileWithStat(file, relative = file) {
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
    let realPath;
    if (process.platform === "linux") {
      realPath = fs.readlinkSync(`/proc/self/fd/${fd}`);
      if (realPath !== file) {
        throw new Error(`Expected a regular file at the recorded path: ${relative}`);
      }
      if (!hasONofollow && !isExpectedRealPath(file, fs.realpathSync.native(file))) {
        throw new Error(`Expected a regular file at the recorded path: ${relative}`);
      }
    } else {
      realPath = fs.realpathSync.native(file);
      if (!isExpectedRealPath(file, realPath)) {
        throw new Error(`Expected a regular file at the recorded path: ${relative}`);
      }
    }
    const expectedSize = stat.size;
    let bytes;
    if (expectedSize >= 0 && expectedSize <= 64 * 1024 * 1024) {
      const buf = Buffer.allocUnsafe(expectedSize + 1);
      let offset = 0;
      while (offset < buf.length) {
        const n = fs.readSync(fd, buf, offset, buf.length - offset, null);
        if (n <= 0) break;
        offset += n;
      }
      if (offset < buf.length) {
        bytes = buf.subarray(0, offset);
      } else {
        const chunks = [buf];
        const extra = Buffer.allocUnsafe(65536);
        while (true) {
          const n = fs.readSync(fd, extra, 0, extra.length, null);
          if (n <= 0) break;
          chunks.push(Buffer.from(extra.subarray(0, n)));
        }
        bytes = Buffer.concat(chunks);
      }
    } else {
      const chunks = [];
      const chunk = Buffer.allocUnsafe(65536);
      while (true) {
        const n = fs.readSync(fd, chunk, 0, chunk.length, null);
        if (n <= 0) break;
        chunks.push(Buffer.from(chunk.subarray(0, n)));
      }
      bytes = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
    }
    return { bytes, stat, realPath };
  } finally {
    fs.closeSync(fd);
  }
}

function assertContainedPath(canonicalRoot, targetPath, errorMessage) {
  if (!isContainedPath(canonicalRoot, targetPath, true)) {
    throw new Error(errorMessage);
  }
}

function readRegularFileSafe(filePath, displayPath = filePath, options = {}) {
  const resolved = path.resolve(filePath);
  const canonicalTarget = path.join(fs.realpathSync.native(path.dirname(resolved)), path.basename(resolved));
  const allowedRoot = options?.allowedRoot !== undefined ? resolveCanonicalRoot(options.allowedRoot) : undefined;
  const containmentMessage = options?.containmentError ?? `Path must stay inside the workspace: ${displayPath}`;
  if (allowedRoot !== undefined) {
    assertContainedPath(allowedRoot, canonicalTarget, containmentMessage);
  }
  const opened = readOpenedFileWithStat(canonicalTarget, displayPath);
  if (allowedRoot !== undefined) {
    assertContainedPath(allowedRoot, opened.realPath, containmentMessage);
  }
  return opened.bytes;
}

function readOpenedFile(file, relative) {
  return readOpenedFileWithStat(file, relative).bytes;
}

function readFile(root, relative, verifiedDirs) {
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
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

function fingerprint(root, files, verifiedDirs = new Set()) {
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
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

function withPredecessorLock(destination, relative, fn) {
  const lockPath = `${destination}.lock`;
  let lockIno;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lockPath, "wx", 0o600);
      try {
        fs.writeFileSync(fd, `${process.pid} ${Date.now()}\n`);
        lockIno = fs.fstatSync(fd).ino;
      } finally {
        fs.closeSync(fd);
      }
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let stat;
      try {
        stat = fs.lstatSync(lockPath);
      } catch (statErr) {
        if (statErr.code === "ENOENT") continue;
        throw statErr;
      }
      if (stat.isSymbolicLink()) {
        const err = new Error(`ELOOP: symlinked lockfile is unsupported: ${relative}.lock`);
        err.code = "ELOOP";
        throw err;
      }
      if (Date.now() - stat.mtimeMs > PREDECESSOR_LOCK_STALE_MS) {
        try {
          fs.unlinkSync(lockPath);
        } catch (unlinkErr) {
          if (unlinkErr.code !== "ENOENT") throw unlinkErr;
        }
        continue;
      }
      const err = new Error(
        `Concurrent predecessor-checked publish already in progress at '${relative}' (lockfile '${relative}.lock' held).`
      );
      err.code = "EEXIST";
      throw err;
    }
  }
  if (lockIno === undefined) {
    const err = new Error(
      `Concurrent predecessor-checked publish already in progress at '${relative}' (lockfile '${relative}.lock' held).`
    );
    err.code = "EEXIST";
    throw err;
  }
  try {
    return fn();
  } finally {
    try {
      const cur = fs.lstatSync(lockPath);
      if (!cur.isSymbolicLink() && cur.ino === lockIno) {
        fs.unlinkSync(lockPath);
      }
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}

function publish(root, relative, contents, replace = false, verifiedDirs, expectedPredecessorSha256, { sync = true, skipExistingCheck = false } = {}) {
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  const destination = workspacePath(canonicalRoot, relative, verifiedDirs);
  const runPublish = () => {
    const directOverwrite = Boolean(replace && expectedPredecessorSha256 === undefined && skipExistingCheck);
    if (!directOverwrite) {
      let existingBytes;
      try {
        existingBytes = readOpenedFile(destination, relative);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (existingBytes !== undefined) {
        if (expectedPredecessorSha256 !== undefined) {
          const existingHash = sha256(existingBytes);
          if (existingHash !== expectedPredecessorSha256) {
            throw new Error(
              `Bundle predecessor digest mismatch at '${relative}': expected '${expectedPredecessorSha256}', found '${existingHash}'.`
            );
          }
        }
        if (existingBytes.equals(contents)) return;
        if (!replace) {
          const err = new Error(
            `Existing file at '${relative}' differs (SHA-256 ${sha256(existingBytes)}); pass replaceExisting: true or matching expectedPredecessorSha256 to overwrite.`
          );
          err.code = "EEXIST";
          throw err;
        }
      } else if (expectedPredecessorSha256 !== undefined) {
        throw new Error(
          `Bundle predecessor digest '${expectedPredecessorSha256}' provided, but '${relative}' does not exist.`
        );
      }
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
      if (directOverwrite) {
        fs.renameSync(temporary, destination);
        return;
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
  };
  if (expectedPredecessorSha256 !== undefined) {
    return withPredecessorLock(destination, relative, runPublish);
  }
  return runPublish();
}

function readEvidence(root, report, verifiedDirs) {
  const bytes = readFile(root, report, verifiedDirs);
  if (!bytes.toString("utf8").trim()) throw new Error(`Empty evidence report: ${report}`);
  return bytes;
}

function readSynthesis(root, report, verifiedDirs, { allowNonPassing = false, cachedBytes } = {}) {
  const bytes = cachedBytes ?? readEvidence(root, report, verifiedDirs);
  if (cachedBytes !== undefined && !bytes.toString("utf8").trim()) {
    throw new Error(`Empty evidence report: ${report}`);
  }
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

function readIntegrityAudit(root, report, expectedSquadId, verifiedDirs, expectedEvidenceDigest, cachedBytes) {
  const bytes = cachedBytes ?? readEvidence(root, report, verifiedDirs);
  if (cachedBytes !== undefined && !bytes.toString("utf8").trim()) {
    throw new Error(`Empty evidence report: ${report}`);
  }
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
  const realDir = fs.realpathSync.native(fullDir);
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

function matchesFlatAuditTarget(root, rel, squadId, verifiedDirs, { includeOnError = true, readCache } = {}) {
  let opened;
  try {
    opened = readIfPresentWithStat(root, rel, verifiedDirs);
  } catch (error) {
    if (error.code === "ELOOP") throw error;
    return includeOnError;
  }
  if (!opened) return false;
  try {
    const text = decodeUtf8(opened.bytes, rel);
    if (!text.trim()) return includeOnError;
    const declaredTarget = parseTargetSquad(text);
    const matches = !declaredTarget || declaredTarget === squadId;
    if (matches) readCache?.set(rel, opened.bytes);
    return matches;
  } catch {
    return includeOnError;
  }
}

function discoverAuditSlots(root, squadId, rootPrefix, verifiedDirs = new Set(), readCache) {
  const scopedDir = `${rootPrefix}/squad-${encodeURIComponent(`integrity_auditor-${squadId}`)}`;
  const scopedSlots = listCohortSlotsIfPresent(root, scopedDir);
  if (scopedSlots.length > 0) return scopedSlots;
  const flatDir = `${rootPrefix}/squad-integrity_auditor`;
  const flatSlots = listCohortSlotsIfPresent(root, flatDir);
  return flatSlots.filter(rel =>
    matchesFlatAuditTarget(root, rel, squadId, verifiedDirs, { includeOnError: true, readCache })
  );
}

function prepareCohortSnapshot(
  canonicalRoot,
  record,
  { action = "Bundling", verifiedDirs = new Set(), expectedVerdict, skipFileRehash = false, preReadSynthesis } = {}
) {
  verifiedDirs.add(canonicalRoot);
  const { squadId, verifiedFiles, allowPartial = false, allowNonPassing = false } = record;
  const rootPrefix = resolveReportRoot(record);
  const assignments = inspectReports(canonicalRoot, record, verifiedDirs, { rejectLooseOnNoReport: true });
  const allowedStatuses = allowPartial ? new Set(["READY", "PARTIAL", "NO_REPORT"]) : new Set(["READY"]);
  if (assignments.some(({ status }) => !allowedStatuses.has(status))) {
    throw new Error(
      allowPartial
        ? `${action} requires a READY, PARTIAL, or NO_REPORT handoff from each recorded specialist in its compiled slot.`
        : `${action} requires a READY handoff from each recorded specialist in its compiled slot.`
    );
  }
  const synthesisSlot = reportPath(squadId, undefined, rootPrefix);
  const relative = bundlePath(squadId, rootPrefix);
  const auditExclusions = [];
  if (typeof record.integrityReport === "string" && record.integrityReport.trim()) {
    auditExclusions.push(record.integrityReport);
  }
  if (Array.isArray(record.integrityAuditSlots)) {
    for (const slot of record.integrityAuditSlots) {
      if (typeof slot === "string" && slot.trim()) auditExclusions.push(slot);
    }
  }
  if (
    [...assignments.map(({ report }) => report), synthesisSlot, relative, ...auditExclusions].some(report =>
      Object.hasOwn(verifiedFiles ?? {}, report)
    )
  ) {
    throw new Error("Record final work inputs in verifiedFiles. The bundle hashes the loose reports separately.");
  }
  if (!skipFileRehash) {
    verifyFiles(canonicalRoot, verifiedFiles, verifiedDirs);
  } else if (!verifiedFiles || typeof verifiedFiles !== "object" || Array.isArray(verifiedFiles) || Object.keys(verifiedFiles).length === 0) {
    throw new Error("Specify the final files used for independent verification.");
  }
  const synthesisCheck = readSynthesis(canonicalRoot, synthesisSlot, verifiedDirs, {
    allowNonPassing,
    cachedBytes: preReadSynthesis?.slot === synthesisSlot ? preReadSynthesis.bytes : undefined
  });
  if (expectedVerdict !== undefined && synthesisCheck.verdict !== expectedVerdict) {
    throw new Error(
      allowNonPassing
        ? `Synthesis report verdict '${synthesisCheck.verdict}' does not match record verdict '${expectedVerdict}'.`
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
  return { rootPrefix, relative, verifiedDirs, synthesisCheck, synthesis, reports, evidenceDigest };
}

function computeEvidenceDigest(root, record, options = {}) {
  const verifiedDirs = options?.verifiedDirs ?? new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid bundle or handoff record.");
  }
  const { squadId, verifiedFiles, allowPartial = false, allowNonPassing = false } = record;
  if (typeof allowPartial !== "boolean") throw new Error("allowPartial must be a boolean.");
  if (typeof allowNonPassing !== "boolean") throw new Error("allowNonPassing must be a boolean.");
  validateSquadId(squadId);
  const { synthesis, reports, evidenceDigest } = prepareCohortSnapshot(canonicalRoot, record, {
    action: "Computing evidence digest",
    verifiedDirs,
    expectedVerdict: record.verdict,
    skipFileRehash: Boolean(options?.skipFileRehash),
    preReadSynthesis: options?.preReadSynthesis
  });
  return {
    squadId,
    evidenceDigest,
    synthesis,
    verifiedFiles,
    reports: reports.map(({ markdown: _markdown, ...rest }) => rest)
  };
}

function ensureDirectory(root, relative, created = [], verifiedDirs) {
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  if (
    typeof relative !== "string" ||
    !relative ||
    CONTROL_CHAR_RE.test(relative) ||
    WINDOWS_DRIVE_RE.test(relative) ||
    relative.includes("\\") ||
    path.isAbsolute(relative)
  ) {
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
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid handoff inspection record.");
  }
  const { workspace, assignments, handoffs } = record;
  let canonicalWorkspace;
  try {
    canonicalWorkspace = typeof workspace === "string" && workspace.trim() ? fs.realpathSync.native(workspace) : undefined;
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

function inspectHandoffs(root, record, options = {}) {
  const verifiedDirs = options?.verifiedDirs ?? new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  return inspectReports(canonicalRoot, record, verifiedDirs).map(({ conversationId, report, status }) => ({
    conversationId,
    report,
    status
  }));
}

function bundleReports(root, record, options = {}) {
  const verifiedDirs = options?.verifiedDirs ?? new Set();
  root = resolveCanonicalRoot(root, verifiedDirs);
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
  const {
    rootPrefix,
    relative,
    synthesisCheck,
    synthesis,
    reports,
    evidenceDigest
  } = prepareCohortSnapshot(root, record, {
    action: "Bundling",
    verifiedDirs,
    expectedVerdict: verdict
  });

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
    const auditReadCache = new Map();
    if (requireIntegrityAudit || hasExplicitAudit) {
      for (const slot of integrityAuditSlots ?? []) candidateSet.add(slot);
      if (!hasExplicitAudit) {
        for (const slot of discoverAuditSlots(root, squadId, rootPrefix, verifiedDirs, auditReadCache)) candidateSet.add(slot);
      }
    }
    const candidates = [...candidateSet];
    if (candidates.some(slot => Object.hasOwn(verifiedFiles ?? {}, slot))) {
      throw new Error("Record final work inputs in verifiedFiles. The bundle hashes the loose reports separately.");
    }
    if (requireIntegrityAudit && candidates.length === 0) {
      throw new Error("Acceptance blocked: Mandatory integrity audit report missing. Run integrity_auditor (or audit-<squad> in /swarm) before bundling.");
    }
    integrityAudits = candidates.map(slot => {
      const audit = readIntegrityAudit(root, slot, squadId, verifiedDirs, evidenceDigest, auditReadCache.get(slot));
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

function verifyBundleInternal(root, relative, acceptedHash, verifiedDirs = new Set()) {
  verifiedDirs.add(root);
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
  if (parsed.schemaVersion !== 2) {
    throw new Error("Unsupported or missing bundle schemaVersion (expected 2).");
  }
  if (parsed.auditPolicy !== "required" && parsed.auditPolicy !== "unaudited-explicit") {
    throw new Error(
      parsed.auditPolicy === undefined
        ? "Invalid auditPolicy: missing explicit 'required' or 'unaudited-explicit' in bundle."
        : `Invalid auditPolicy '${parsed.auditPolicy}' in bundle.`
    );
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
  const synthesisSlot = reportPath(squadId, undefined, rootPrefix);
  const synthesisCheck = readSynthesis(root, synthesisSlot, verifiedDirs, { allowNonPassing });
  if (synthesisCheck.verdict !== verdict || sha256(synthesisCheck.bytes) !== synthesis) {
    throw new Error("Synthesis changed after bundling.");
  }
  if (parsed.retainReports !== undefined && typeof parsed.retainReports !== "boolean") {
    throw new Error("Invalid retainReports boolean in bundle.");
  }
  const auditPaths = [
    ...(parsed.integrityAudit && typeof parsed.integrityAudit.path === "string" ? [parsed.integrityAudit.path] : []),
    ...(Array.isArray(parsed.integrityAudits)
      ? parsed.integrityAudits
          .filter(audit => audit && typeof audit === "object" && typeof audit.path === "string")
          .map(audit => audit.path)
      : [])
  ];
  if (
    verifiedFiles &&
    typeof verifiedFiles === "object" &&
    !Array.isArray(verifiedFiles) &&
    [...reports.map(r => r.path), synthesisSlot, relative, ...auditPaths].some(p => Object.hasOwn(verifiedFiles, p))
  ) {
    throw new Error("Record final work inputs in verifiedFiles. The bundle hashes the loose reports separately.");
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
    if (!report.markdown.trim()) {
      throw new Error(`Empty evidence report: ${report.path}`);
    }
    const bytes = Buffer.from(report.markdown, "utf8");
    const loose = readIfPresentWithStat(root, report.path, verifiedDirs);
    if (sha256(bytes) !== report.sha256 || (loose && !loose.bytes.equals(bytes))) {
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
  const auditEntries = Array.isArray(parsed.integrityAudits)
    ? parsed.integrityAudits
    : (parsed.integrityAudit ? [parsed.integrityAudit] : []);
  if (parsed.integrityAudit && parsed.integrityAudits) {
    const head = parsed.integrityAudits[0];
    if (
      parsed.integrityAudit.path !== head?.path ||
      parsed.integrityAudit.sha256 !== head?.sha256 ||
      parsed.integrityAudit.evidenceDigest !== head?.evidenceDigest ||
      parsed.integrityAudit.targetSquad !== head?.targetSquad ||
      parsed.integrityAudit.verdict !== head?.verdict
    ) {
      throw new Error("Bundle integrityAudit disagrees with integrityAudits[0].");
    }
  }
  if (parsed.auditPolicy === "required" && auditEntries.length === 0) {
    throw new Error("Acceptance blocked: Bundle auditPolicy 'required' is missing integrityAudit evidence.");
  }
  if (parsed.auditPolicy === "unaudited-explicit" && auditEntries.length > 0) {
    throw new Error("Bundle auditPolicy 'unaudited-explicit' cannot embed integrityAudit evidence.");
  }
  for (const audit of auditEntries) {
    if (!audit || typeof audit !== "object" || typeof audit.path !== "string" || typeof audit.sha256 !== "string") {
      throw new Error("Invalid integrityAudit entry in bundle.");
    }
    if (audit.verdict !== "CLEAN") {
      throw new Error(`Integrity audit entry verdict '${audit.verdict}' is not CLEAN.`);
    }
    if (audit.targetSquad !== undefined && audit.targetSquad !== squadId) {
      throw new Error(`Integrity audit targetSquad '${audit.targetSquad}' does not match bundle squad '${squadId}'.`);
    }
    if (audit.evidenceDigest !== snapshotDigest) {
      throw new Error(`Integrity audit evidenceDigest '${audit.evidenceDigest}' does not match verified bundle snapshot.`);
    }
    const auditCheck = readIntegrityAudit(root, audit.path, squadId, verifiedDirs, snapshotDigest);
    if (sha256(auditCheck.bytes) !== audit.sha256) {
      throw new Error(`Integrity audit report changed: ${audit.path}`);
    }
  }

  return {
    path: relative,
    sha256: digest,
    auditPolicy: parsed.auditPolicy,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })),
    loosePresent,
    looseSnapshots,
    retainReports: parsed.retainReports === true
  };
}

function verifyBundle(root, relative, expectedSha256, options = {}) {
  const verifiedDirs = options?.verifiedDirs ?? new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  const { path: p, sha256: s, auditPolicy, reports } = verifyBundleInternal(canonicalRoot, relative, expectedSha256, verifiedDirs);
  return { path: p, sha256: s, auditPolicy, reports };
}

function removeVerifiedLooseSnapshots(canonicalRoot, looseSnapshots) {
  const verifiedDirs = new Set([canonicalRoot]);
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
  const verifiedDirs = options?.verifiedDirs ?? new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  if (!/^[0-9a-f]{64}$/.test(acceptedHash ?? "")) throw new Error("Pruning requires the primary's accepted bundle digest.");
  const { loosePresent, looseSnapshots, retainReports } = verifyBundleInternal(canonicalRoot, relative, acceptedHash, verifiedDirs);
  if (options.keepReports || retainReports) {
    return { removed: [], retained: loosePresent };
  }
  return removeVerifiedLooseSnapshots(canonicalRoot, looseSnapshots);
}

function verifyAndPruneBundle(root, relative, options = {}) {
  const opts = options && typeof options === "object" ? options : {};
  const verifiedDirs = opts.verifiedDirs ?? new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  if (
    opts.expectedSha256 !== undefined &&
    opts.acceptedHash !== undefined &&
    opts.expectedSha256 !== opts.acceptedHash
  ) {
    throw new Error("Conflicting expectedSha256 and acceptedHash options.");
  }
  const expectedSha256 = opts.expectedSha256 ?? opts.acceptedHash;
  if (typeof expectedSha256 !== "string" || !/^[0-9a-f]{64}$/.test(expectedSha256)) {
    throw new Error("Pruning requires a 64-character lowercase hex expectedSha256 bundle digest.");
  }
  const verified = verifyBundleInternal(canonicalRoot, relative, expectedSha256, verifiedDirs);
  const { path: p, sha256: s, auditPolicy, reports, loosePresent, looseSnapshots, retainReports } = verified;
  const pruned = opts.keepReports || retainReports
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
    const verifiedDirs = new Set();
    for (const rel of listCohortSlotsIfPresent(real, flatAuditDir)) {
      if (matchesFlatAuditTarget(real, rel, squadId, verifiedDirs, { includeOnError: false })) {
        matching.push(rel);
      }
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
      realSrc = fs.realpathSync.native(src);
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
        addSlot(
          entry.reportSlot,
          plan.executionMode === "swarm" && (entry?.slotType === "lead" || entry?.slotType === "audit")
        );
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
    if (record.requireIntegrityAudit !== undefined && typeof record.requireIntegrityAudit !== "boolean") {
      throw new Error("requireIntegrityAudit must be a boolean.");
    }
    const rootPrefix = overrideRoot ?? resolveReportRoot(record);
    addSlot(reportPath(record.squadId, undefined, rootPrefix), true);
    for (const a of record.assignments ?? []) {
      if (a?.report !== undefined) addSlot(a.report);
    }
    let hasExplicitAuditSlot = false;
    for (const slot of record.integrityAuditSlots ?? []) {
      addSlot(slot, true);
      hasExplicitAuditSlot = true;
    }
    if (record.integrityReport !== undefined) {
      addSlot(record.integrityReport, true);
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
  const foldSlotCase = process.platform === "win32" || process.platform === "darwin";
  const foundBySlot = new Map();
  for (const { raw, real } of resolvedSources) {
    const verifiedSrcDirs = new Set([real]);
    const cohortEntriesCache = new Map();
    const cohortHasSlotDir = (slotRel) => {
      const slotDir = path.posix.dirname(slotRel);
      const cohortDir = path.posix.dirname(slotDir);
      const slotName = path.posix.basename(slotDir);
      let entryNames = cohortEntriesCache.get(cohortDir);
      if (entryNames === undefined) {
        const fullCohortDir = path.join(real, cohortDir);
        try {
          const st = fs.lstatSync(fullCohortDir);
          if (st.isSymbolicLink() || !st.isDirectory()) {
            entryNames = "probe";
          } else {
            const names = fs.readdirSync(fullCohortDir);
            entryNames = new Set(foldSlotCase ? names.map(name => name.toLowerCase()) : names);
          }
        } catch (error) {
          if (error.code === "ENOENT" || error.code === "ENOTDIR") {
            entryNames = null;
          } else {
            entryNames = "probe";
          }
        }
        cohortEntriesCache.set(cohortDir, entryNames);
      }
      return entryNames === "probe" || (entryNames !== null && entryNames.has(foldSlotCase ? slotName.toLowerCase() : slotName));
    };
    for (const slotRel of targetSlots) {
      if (!cohortHasSlotDir(slotRel)) continue;
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

  const verifiedInheritDirs = new Set([root]);
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

  const verifiedDestDirs = new Set([root]);
  const pendingActions = [];
  for (const [slotRel, entry] of foundBySlot.entries()) {
    assertNoSymlinkedAncestors(root, slotRel, verifiedDestDirs);
    const existing = readIfPresentWithStat(root, slotRel, verifiedDestDirs);
    if (existing) {
      if (existing.bytes.equals(entry.bytes)) {
        pendingActions.push({ kind: "unchanged", slotRel, entry });
        continue;
      }
      if (!overwrite) {
        let existingNonEmpty = existing.bytes.length > 0;
        if (existingNonEmpty) {
          try {
            existingNonEmpty = decodeUtf8(existing.bytes, slotRel).trim().length > 0;
          } catch {
            existingNonEmpty = true;
          }
        }
        if (existingNonEmpty) {
          throw new Error(
            `Conflict at destination '${slotRel}': coordinator workspace already has differing content (SHA-256 ${sha256(existing.bytes).slice(0, 12)}); pass --overwrite to replace.`
          );
        }
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
      publish(root, slotRel, entry.bytes, true, verifiedDestDirs, undefined, { sync: false, skipExistingCheck: true });
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

function hydratePlanForBundleInit(plan, fallbackRoot, selectedSquadId) {
  if (
    isPlainObject(plan) &&
    plan.includeIntegrityAuditor !== undefined &&
    typeof plan.includeIntegrityAuditor !== "boolean"
  ) {
    throw new Error("includeIntegrityAuditor must be a boolean.");
  }
  if (!isPlainObject(plan) || plan.bundleRecordTemplates !== undefined || !Array.isArray(plan.workers)) {
    return plan;
  }
  const workerList = plan.workers.filter(w => w && typeof w === "object" && typeof w.squadId === "string");
  let targetWorkers = workerList;
  if (selectedSquadId !== undefined) {
    const matched = workerList.filter(w => w.squadId === selectedSquadId);
    if (matched.length > 0) {
      targetWorkers = matched;
    } else {
      return {
        ...plan,
        bundleRecordTemplates: Object.fromEntries(workerList.map(w => [w.squadId, null])),
        ...(plan.provenanceScaffold === undefined ? { provenanceScaffold: { entries: [] } } : {})
      };
    }
  } else if (workerList.length !== 1) {
    return {
      ...plan,
      bundleRecordTemplates: Object.fromEntries(workerList.map(w => [w.squadId, null])),
      ...(plan.provenanceScaffold === undefined ? { provenanceScaffold: { entries: [] } } : {})
    };
  }
  const templates = Object.create(null);
  const entries = [];
  const auditPlan = Array.isArray(plan.integrityAuditPlan) ? plan.integrityAuditPlan : [];
  for (const w of targetWorkers) {
    const id = w.squadId;
    const specialists = Array.isArray(w.specialists) ? w.specialists : [];
    const assignments = [];
    for (const s of specialists) {
      if (!isPlainObject(s)) {
        throw new Error(`Plan workers['${id}'] specialist must be a plain object.`);
      }
      assignments.push({
        conversationId:
          plan.executionMode === "swarm" ? s.workerName : `<invoke_subagent:${s.workerName}:conversationId>`,
        report: s.reportSlot
      });
      entries.push({ squadId: id, slotType: "specialist", workerName: s.workerName, reportSlot: s.reportSlot });
    }
    if (w.lead && typeof w.lead === "object") {
      entries.push({ squadId: id, slotType: "lead", workerName: w.lead.workerName, reportSlot: w.lead.reportSlot });
    }
    const auditSlots = auditPlan
      .filter(a => a && a.targetSquad === id && typeof a.reportSlot === "string")
      .map(a => a.reportSlot);
    templates[id] = {
      squadId: id,
      workspace: typeof plan.workspace === "string" && plan.workspace ? plan.workspace : fallbackRoot,
      ...(plan.reportRoot !== undefined ? { reportRoot: plan.reportRoot } : {}),
      verdict: "PASS",
      verifiedFiles: {},
      assignments,
      handoffs: [],
      requireIntegrityAudit: plan.includeIntegrityAuditor !== false,
      ...(auditSlots.length > 0 ? { integrityAuditSlots: auditSlots } : {})
    };
  }
  return {
    ...plan,
    bundleRecordTemplates: templates,
    ...(plan.provenanceScaffold === undefined ? { provenanceScaffold: { entries } } : {})
  };
}

function buildBundleRecordInit(root, options = {}) {
  if (!isPlainObject(options)) {
    throw new Error("Provide valid bundle-init options.");
  }
  const verifiedDirs = options.verifiedDirs ?? new Set();
  root = resolveCanonicalRoot(root, verifiedDirs);
  const {
    plan: rawPlan,
    provenance,
    squadId,
    files = [],
    reportRoot,
    verdict,
    idMap = {},
    handoffs,
    allowUnaudited = false,
    allowNonPassing = false,
    allowPartial = false,
    onLeadRead
  } = options;

  if (typeof allowUnaudited !== "boolean") {
    throw new Error("allowUnaudited must be a boolean.");
  }
  if (typeof allowNonPassing !== "boolean") {
    throw new Error("allowNonPassing must be a boolean.");
  }
  if (typeof allowPartial !== "boolean") {
    throw new Error("allowPartial must be a boolean.");
  }
  if (!isPlainObject(rawPlan)) {
    throw new Error("Provide a valid squad_planner JSON object.");
  }
  const plan = hydratePlanForBundleInit(rawPlan, root, squadId);
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

  const hasRealConversationId = candidate =>
    typeof candidate?.conversationId === "string" &&
    candidate.conversationId.trim().length > 0 &&
    !/^<.*>$/.test(candidate.conversationId.trim());
  const matchedIdMapKeys = new Set();
  const assignments = (Array.isArray(template.assignments) ? template.assignments : []).map((item, idx) => {
    if (!isPlainObject(item)) {
      throw new Error(`Plan bundleRecordTemplates['${selectedSquadId}'] assignment must be a plain object.`);
    }
    const slotPath =
      reportRoot !== undefined ? reportPath(selectedSquadId, idx + 1, resolvedReportRoot) : item.report;
    const slotEntry = bySlot.get(slotPath) || bySlot.get(item.report);
    const workerEntry =
      (typeof slotEntry?.workerName === "string" ? byWorker.get(slotEntry.workerName) : undefined) ||
      byWorker.get(item.conversationId);
    const entry = hasRealConversationId(slotEntry)
      ? slotEntry
      : hasRealConversationId(workerEntry)
        ? workerEntry
        : (slotEntry || workerEntry);
    let mappedId;
    if (entry && Object.hasOwn(idMap, entry.workerName)) {
      mappedId = idMap[entry.workerName];
      matchedIdMapKeys.add(entry.workerName);
    } else if (slotEntry && Object.hasOwn(idMap, slotEntry.workerName)) {
      mappedId = idMap[slotEntry.workerName];
      matchedIdMapKeys.add(slotEntry.workerName);
    } else if (Object.hasOwn(idMap, item.conversationId)) {
      mappedId = idMap[item.conversationId];
      matchedIdMapKeys.add(item.conversationId);
    }
    let nextId = item.conversationId;
    if (typeof mappedId === "string" && mappedId.trim()) {
      nextId = mappedId.trim();
    } else if (plan.executionMode !== "swarm" && hasRealConversationId(entry)) {
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
    verifiedFiles = fingerprint(root, files, verifiedDirs);
  } else if (
    template.verifiedFiles &&
    typeof template.verifiedFiles === "object" &&
    !Array.isArray(template.verifiedFiles) &&
    Object.keys(template.verifiedFiles).length > 0
  ) {
    verifiedFiles = fingerprint(root, Object.keys(template.verifiedFiles), verifiedDirs);
  }

  const validVerdicts = new Set(["PASS", "FAIL", "BLOCKED"]);
  let resolvedVerdict = template.verdict === undefined ? "PASS" : template.verdict;
  if (verdict !== undefined) {
    resolvedVerdict = verdict;
  } else {
    const leadSlot = reportPath(selectedSquadId, undefined, resolvedReportRoot);
    const leadOpened = readIfPresentWithStat(root, leadSlot, verifiedDirs);
    if (leadOpened) {
      onLeadRead?.({ slot: leadSlot, bytes: leadOpened.bytes });
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
  if (!validVerdicts.has(resolvedVerdict)) {
    throw new Error(`Invalid verdict '${resolvedVerdict}': expected PASS, FAIL, or BLOCKED.`);
  }

  if (template.requireIntegrityAudit !== undefined && typeof template.requireIntegrityAudit !== "boolean") {
    throw new Error("requireIntegrityAudit must be a boolean.");
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
  isContainedPath,
  isExpectedRealPath,
  messageLimit,
  normalizeReportRoot,
  pruneReports,
  publish,
  readFile,
  readOpenedFileWithStat,
  readRegularFileSafe,
  reportPath,
  resolveCanonicalRoot,
  stripReceiptPrefix,
  trimTrailingSlashes,
  verifyAndPruneBundle,
  verifyBundle
};
