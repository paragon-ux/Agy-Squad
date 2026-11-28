import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { isDeepStrictEqual } from "node:util";
import { hasContentVerdictAttempt, parseContentVerdict, parseEvidenceDigest, parseIntegrityVerdict, parseTargetSquad, stripFencedCodeBlocks, validateSquadId } from "./verdicts.mjs";

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

function isValidScopeEntry(file) {
  if (typeof file !== "string") return false;
  const trimmed = file.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return false;
  if (trimmed.startsWith("/") || trimmed.includes("\\") || WINDOWS_DRIVE_RE.test(trimmed)) return false;
  return trimmed === "." || !trimmed.split("/").some(part => !part || part === "." || part === "..");
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

function recordSlotPath(squadId, reportRoot = defaultReportRoot()) {
  validateSquadId(squadId);
  const normalizedRoot = normalizeReportRoot(reportRoot);
  const directory = `squad-${encodeURIComponent(squadId)}`;
  if (Buffer.byteLength(directory) > 255) {
    throw new Error("Squad ID must fit in one workspace directory name.");
  }
  return `${normalizedRoot}/${directory}/record.json`;
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

function isSameFsObject(a, b) {
  try {
    const stA = fs.statSync(a, { bigint: true });
    const stB = fs.statSync(b, { bigint: true });
    return stA.dev === stB.dev && stA.ino === stB.ino;
  } catch {
    return false;
  }
}

function isExpectedRealPath(expected, actual) {
  if (actual === expected) return true;
  if (process.platform === "win32") {
    return actual.toLowerCase() === expected.toLowerCase();
  }
  if (process.platform === "darwin" && actual.toLowerCase() === expected.toLowerCase()) {
    return isSameFsObject(expected, actual);
  }
  return false;
}

function isContainedPath(root, target, allowEqual = false, platform = process.platform) {
  const normalizeCase = platform === "win32";
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

const STREAM_HASH_BUF = Buffer.allocUnsafe(65536);

function readOpenedFileWithStat(file, relative = file, { maxBytes = Infinity, hashOnly = false } = {}) {
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
    if (hashOnly) {
      const hash = createHash("sha256");
      while (true) {
        const n = fs.readSync(fd, STREAM_HASH_BUF, 0, STREAM_HASH_BUF.length, null);
        if (n <= 0) break;
        hash.update(STREAM_HASH_BUF.subarray(0, n));
      }
      return { digest: hash.digest("hex"), stat, realPath };
    }
    if (stat.size > maxBytes) throw Object.assign(new Error(`File exceeds size limit: ${relative}`), { code: "EFBIG" });
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
        if (offset > maxBytes) throw Object.assign(new Error(`File exceeds size limit: ${relative}`), { code: "EFBIG" });
        const chunks = [buf];
        let totalBytes = buf.length;
        const extra = Buffer.allocUnsafe(65536);
        while (true) {
          const n = fs.readSync(fd, extra, 0, extra.length, null);
          if (n <= 0) break;
          if (totalBytes + n > maxBytes) throw Object.assign(new Error(`File exceeds size limit: ${relative}`), { code: "EFBIG" });
          chunks.push(Buffer.from(extra.subarray(0, n)));
          totalBytes += n;
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

function readIfPresentWithStat(root, relative, verifiedDirs, options) {
  try {
    return readOpenedFileWithStat(workspacePath(root, relative, verifiedDirs), relative, options);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

const hashIfPresentWithStat = (root, relative, verifiedDirs) => readIfPresentWithStat(root, relative, verifiedDirs, { hashOnly: true });

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
  return { bytes, markdown, verdict };
}

function extractCitationUrls(markdown) {
  if (typeof markdown !== "string" || !markdown) return [];
  const urls = new Set();
  const re = /https?:\/\/[^\s<>"'`]+/gi;
  for (let m; (m = re.exec(markdown)); ) {
    let raw = m[0];
    let parenDelta = 0;
    let bracketDelta = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "(") parenDelta++;
      else if (ch === ")") parenDelta--;
      else if (ch === "[") bracketDelta++;
      else if (ch === "]") bracketDelta--;
    }
    while (raw.length > 0) {
      const last = raw[raw.length - 1];
      if (".,;:!?".includes(last)) {
        raw = raw.slice(0, -1);
      } else if (last === ")" && parenDelta < 0) {
        raw = raw.slice(0, -1);
        parenDelta++;
      } else if (last === "]" && bracketDelta < 0) {
        raw = raw.slice(0, -1);
        bracketDelta++;
      } else {
        break;
      }
    }
    const minLen = raw.toLowerCase().startsWith("https://") ? 8 : 7;
    if (raw.length > minLen) {
      urls.add(raw);
    }
  }
  return [...urls];
}

function summarizeCitations(reports, synthesisMarkdown) {
  const specialistUrlSet = new Set();
  for (const report of reports ?? []) {
    for (const url of extractCitationUrls(report?.markdown ?? "")) {
      specialistUrlSet.add(url);
    }
  }
  const synthesisUrls = extractCitationUrls(synthesisMarkdown);
  const synthesisUrlSet = new Set(synthesisUrls);
  const specialistUrls = [...specialistUrlSet];
  const uncarriedUrls = specialistUrls.filter(url => !synthesisUrlSet.has(url));
  return { specialistUrls, synthesisUrls, uncarriedUrls };
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
  const citations = summarizeCitations(reports, synthesisCheck.markdown);
  return { rootPrefix, relative, synthesisSlot, verifiedDirs, synthesisCheck, synthesis, reports, evidenceDigest, citations };
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
  const { synthesis, reports, evidenceDigest, citations } = prepareCohortSnapshot(canonicalRoot, record, {
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
    reports: reports.map(({ markdown: _markdown, ...rest }) => rest),
    citations
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
    allowPartial = false,
    strictCitations = false
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
  if (typeof strictCitations !== "boolean") {
    throw new Error("strictCitations must be a boolean.");
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
  if (verdict !== undefined && (allowNonPassing ? !validVerdicts.has(verdict) : verdict !== "PASS")) {
    throw new Error("Only independently passing cohorts are eligible for bundling.");
  }
  const {
    rootPrefix,
    relative,
    synthesisSlot,
    synthesisCheck,
    synthesis,
    reports,
    evidenceDigest,
    citations
  } = prepareCohortSnapshot(root, record, {
    action: "Bundling",
    verifiedDirs,
    expectedVerdict: verdict
  });
  if (strictCitations && citations.uncarriedUrls.length > 0) {
    throw new Error(
      `Uncarried specialist citation URL(s) missing from ${synthesisSlot}: ${citations.uncarriedUrls.join(", ")}`
    );
  }

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
        assignments: record.assignments,
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
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })),
    citations
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

  const citations = summarizeCitations(reports, synthesisCheck.markdown);
  return {
    path: relative,
    sha256: digest,
    auditPolicy: parsed.auditPolicy,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })),
    citations,
    loosePresent,
    looseSnapshots,
    retainReports: parsed.retainReports === true
  };
}

function verifyBundle(root, relative, expectedSha256, options = {}) {
  const verifiedDirs = options?.verifiedDirs ?? new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  const { path: p, sha256: s, auditPolicy, reports, citations } = verifyBundleInternal(canonicalRoot, relative, expectedSha256, verifiedDirs);
  return { path: p, sha256: s, auditPolicy, reports, citations };
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
  const { path: p, sha256: s, auditPolicy, reports, citations, loosePresent, looseSnapshots, retainReports } = verified;
  const pruned = opts.keepReports || retainReports
    ? { removed: [], retained: loosePresent }
    : removeVerifiedLooseSnapshots(canonicalRoot, looseSnapshots);
  return { path: p, sha256: s, auditPolicy, reports, citations, pruned };
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

function extractWorktreePathsFromHandoffs(handoffs) {
  if (!Array.isArray(handoffs) || handoffs.length === 0) return [];
  const extracted = [];
  const seen = new Set();
  const pushWt = (val) => {
    const trimmed = typeof val === "string" ? val.trim() : "";
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      extracted.push(trimmed);
    }
  };
  const wtRe = /(?:^|[\s;,(])wt=(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s;,)"'\r\n]+))/g;
  for (const item of handoffs) {
    if (typeof item === "string") {
      wtRe.lastIndex = 0;
      for (let m; (m = wtRe.exec(item)); ) pushWt(m[1] ?? m[2] ?? m[3]);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    if (typeof item.worktree === "string") pushWt(item.worktree);
    if (typeof item.message === "string") {
      wtRe.lastIndex = 0;
      for (let m; (m = wtRe.exec(item.message)); ) pushWt(m[1] ?? m[2] ?? m[3]);
    }
  }
  return extracted;
}

function gitCommonDirectory(root) {
  const result = spawnSync("git", ["-C", root, "rev-parse", "--git-common-dir"], { encoding: "utf8", timeout: 3000 });
  if (result.status !== 0) return null;
  try { return fs.realpathSync.native(path.resolve(root, result.stdout.trim())); } catch { return null; }
}

function validateWorkerWorktreeRoot(root, candidate) {
  const real = resolveCanonicalRoot(candidate);
  const common = gitCommonDirectory(root);
  const workerCommon = gitCommonDirectory(real);
  if (!common || !workerCommon || !isExpectedRealPath(common, workerCommon)) {
    throw new Error(`Untrusted worker worktree: ${candidate}. Authorize a source explicitly with --from <dir>.`);
  }
  return real;
}

function workerReceiptRoots(handoffs) {
  return (Array.isArray(handoffs) ? handoffs : []).flatMap(h =>
    h && typeof h.sender === "string"
      ? extractWorktreePathsFromHandoffs([h]).map(root => ({ root, sender: h.sender }))
      : []);
}

function tryRealPath(candidate) {
  let cur = path.resolve(candidate);
  const tail = [];
  while (true) {
    try { return path.join(fs.realpathSync.native(cur), ...tail); } catch {}
    const parent = path.dirname(cur);
    if (parent === cur) return path.resolve(candidate);
    tail.unshift(path.basename(cur));
    cur = parent;
  }
}

const READONLY_SUBAGENT_TYPE = "agy-squad-readonly";
const SUBAGENT_PLACEHOLDER_RE = /^<invoke_subagent:([A-Za-z0-9_.-]+):conversationId>$/;
const RESERVED_WORKER_KEYS = new Set(["__proto__", "constructor", "prototype", ".", ".."]);

function extractPlaceholderWorkerName(rawId) {
  if (typeof rawId !== "string") return undefined;
  const match = SUBAGENT_PLACEHOLDER_RE.exec(rawId.trim());
  if (!match || RESERVED_WORKER_KEYS.has(match[1]) || match[1].endsWith(".")) return undefined;
  return match[1];
}
const TRANSCRIPT_REPORT_LIMIT_BYTES = 128 * 1024;
const MAX_TRANSCRIPT_STREAM_BYTES = 64 * 1024 * 1024;
const MAX_TRANSCRIPT_JSON_BYTES = 2 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function restrictiveTranscriptPolicyError(homeDir = os.homedir(), explicitHomeOverride = false) {
  const now = Date.now();
  const profileHome = explicitHomeOverride ? undefined : process.env.AGY_TEST_PROFILE_DIR;
  const useEnvStateDirs = !explicitHomeOverride && !profileHome;
  const effectiveHome = profileHome || homeDir;
  const stateDirs = [path.join(effectiveHome, ".gemini", "antigravity", "context-saver")];
  if (process.platform === "win32") {
    const localAppData = useEnvStateDirs && process.env.LOCALAPPDATA
      ? process.env.LOCALAPPDATA
      : path.join(effectiveHome, "AppData", "Local");
    stateDirs.push(path.join(localAppData, "agy-context-saver"));
  } else {
    const stateHome = useEnvStateDirs && process.env.XDG_STATE_HOME
      ? process.env.XDG_STATE_HOME
      : path.join(effectiveHome, ".local", "state");
    stateDirs.push(path.join(stateHome, "agy-context-saver"));
  }
  const uniqueStateDirs = [...new Set(stateDirs)];
  for (const stateDir of uniqueStateDirs) {
    const filePath = path.join(stateDir, "transcript-access.json");
    try {
      const st = fs.lstatSync(filePath);
      if (st.isSymbolicLink() || !st.isFile()) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const fresh = Object.values(parsed?.policies || {}).filter(p => {
        if (!p || typeof p !== "object") return false;
        const updatedAt = Number(p.updatedAt || p.createdAt || 0);
        const ttlMs = Number(p.ttlMs) > 0 ? Number(p.ttlMs) : 3600000;
        return updatedAt > 0 && now - updatedAt < ttlMs;
      });
      const active = fresh.find(p => p.ownerId === parsed?.activeOwnerId) ||
        fresh.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0];
      if (active && ["deny", "self-only", "allowlist"].includes(active.mode)) {
        return "A restrictive Agy-Context-Saver transcript policy is active. Direct transcript extraction is disabled; run 'agy-context transcript query --id <uuid> --roles assistant --mode full --field content --limit 5 --full --json --out <json>' and pass --transcript-json <slot>=<json>.";
      }
    } catch {}
  }
  return null;
}

function normalizeUuid(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null;
}

function resolveTranscriptFullPath(conversationId, homeDir = os.homedir()) {
  const normId = normalizeUuid(conversationId);
  if (!normId) throw new Error(`Invalid transcript conversation UUID: ${conversationId}`);
  conversationId = normId;
  const geminiDir = path.join(homeDir, ".gemini");
  let hostEntries = [];
  try {
    const realGeminiDir = fs.realpathSync.native(geminiDir);
    if (!fs.statSync(realGeminiDir).isDirectory()) {
      throw new Error(`Refusing non-directory transcript root: ${geminiDir}`);
    }
    hostEntries = fs.readdirSync(realGeminiDir, { withFileTypes: true })
      .filter(d => d.name.startsWith("antigravity") && d.isDirectory() && !d.isSymbolicLink())
      .map(d => path.join(realGeminiDir, d.name));
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") hostEntries = [];
    else throw error;
  }
  const matches = [];
  for (const hostRoot of hostEntries) {
    let current = hostRoot;
    try {
      for (const component of ["brain", conversationId, ".system_generated", "logs"]) {
        current = path.join(current, component);
        const st = fs.lstatSync(current);
        if (st.isSymbolicLink() || !st.isDirectory()) {
          throw new Error(`Refusing symlinked or non-directory transcript path component: ${current}`);
        }
      }
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR") continue;
      throw error;
    }
    const candidate = path.join(current, "transcript_full.jsonl");
    try {
      const st = fs.lstatSync(candidate);
      if (st.isSymbolicLink() || !st.isFile()) {
        throw new Error(`Refusing symlinked or non-regular transcript file: ${candidate}`);
      }
      const real = fs.realpathSync.native(candidate);
      const expected = path.join(fs.realpathSync.native(current), "transcript_full.jsonl");
      if (!isExpectedRealPath(real, expected)) {
        throw new Error(`Transcript path escapes canonical Antigravity brain directory: ${candidate}`);
      }
      matches.push(real);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR") continue;
      throw error;
    }
  }
  const unique = [...new Set(matches)];
  if (unique.length !== 1) throw new Error(`Expected exactly one transcript_full.jsonl for '${conversationId}', found ${unique.length}.`);
  return unique[0];
}

function parseTranscriptReportJsonl(filePath, conversationId) {
  const hasONofollow = typeof fs.constants.O_NOFOLLOW === "number" && fs.constants.O_NOFOLLOW !== 0;
  if (process.platform !== "linux" || !hasONofollow) {
    const lst = fs.lstatSync(filePath);
    if (lst.isSymbolicLink()) {
      throw new Error(`Refusing symlinked transcript file: ${filePath}`);
    }
  }
  const fd = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) {
      throw new Error(`Refusing non-regular transcript file: ${filePath}`);
    }
    if (st.size > MAX_TRANSCRIPT_STREAM_BYTES) {
      throw new Error(`Transcript '${conversationId}' exceeds the 64 MiB stream ceiling.`);
    }
    const decoder = new StringDecoder("utf8");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let totalBytesRead = 0;
    let carry = "";
    let sawAnyLine = false;
    let selected = null;
    const reportHashes = new Set();
    let incompleteTrailing = false;

    const processLine = (line, isFinal) => {
      if (!line.trim()) return;
      sawAnyLine = true;
      let item;
      try {
        item = JSON.parse(line);
      } catch {
        if (isFinal) {
          incompleteTrailing = true;
          return;
        }
        throw new Error(`Transcript '${conversationId}' has a malformed JSONL record before the final line.`);
      }
      if (item?.type !== "PLANNER_RESPONSE" || typeof item.content !== "string" || !item.content.trim().startsWith("# Evidence Report")) return;
      const stepIndex = Number(item.step_index);
      if (!Number.isSafeInteger(stepIndex) || stepIndex < 0) {
        throw new Error(`Final '# Evidence Report' response in transcript '${conversationId}' lacks a valid step_index.`);
      }
      reportHashes.add(sha256(Buffer.from(item.content, "utf8")));
      if (reportHashes.size > 1) throw new Error(`Ambiguous final '# Evidence Report' responses in transcript '${conversationId}'.`);
      if (!selected || stepIndex > selected.stepIndex) {
        selected = {
          stepIndex,
          content: item.content,
          truncated: Object.hasOwn(item, "truncated_fields")
        };
      }
    };

    while (true) {
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      totalBytesRead += bytesRead;
      if (totalBytesRead > MAX_TRANSCRIPT_STREAM_BYTES) {
        throw new Error(`Transcript '${conversationId}' exceeds the 64 MiB stream ceiling.`);
      }
      carry += decoder.write(buffer.subarray(0, bytesRead));
      let newlineIndex;
      while ((newlineIndex = carry.indexOf("\n")) !== -1) {
        let line = carry.slice(0, newlineIndex);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        carry = carry.slice(newlineIndex + 1);
        processLine(line, false);
      }
    }
    carry += decoder.end();
    processLine(carry, true);
    if (incompleteTrailing) throw new Error(`Transcript '${conversationId}' has an incomplete trailing JSONL record.`);
    if (!sawAnyLine) throw new Error(`Transcript '${conversationId}' is empty.`);
    if (!selected) throw new Error(`No final '# Evidence Report' assistant response found in transcript '${conversationId}'.`);
    if (selected.truncated) throw new Error(`Selected transcript response for '${conversationId}' has truncated_fields.`);
    const bytes = Buffer.byteLength(selected.content, "utf8");
    if (bytes > TRANSCRIPT_REPORT_LIMIT_BYTES) throw new Error(`Transcript report for '${conversationId}' exceeds the 128 KiB ceiling.`);
    return {
      bytes: Buffer.from(selected.content, "utf8"),
      provenance: { conversationId, stepIndex: selected.stepIndex }
    };
  } finally {
    try { fs.closeSync(fd); } catch {}
  }
}

function extractAcsJsonReport(root, rawFilePath, verifiedDirs) {
  if (typeof rawFilePath !== "string" || !rawFilePath.trim()) {
    throw new Error("Expected a nonempty workspace JSON path for --transcript-json.");
  }
  const trimmed = rawFilePath.trim();
  const relCandidate = path.isAbsolute(trimmed)
    ? relativizeContainedCliPath(trimmed, root, { allowEqual: false })
    : (process.platform === "win32" ? trimmed.replace(/\\/g, "/") : trimmed).replace(/^(?:\.\/)+/, "");
  if (!relCandidate || path.isAbsolute(relCandidate)) {
    throw new Error(`--transcript-json path must stay inside the workspace: ${rawFilePath}`);
  }
  assertNoSymlinkedAncestors(root, relCandidate, verifiedDirs);
  const absTarget = workspacePath(root, relCandidate, verifiedDirs);
  const opened = readOpenedFileWithStat(absTarget, rawFilePath, { maxBytes: MAX_TRANSCRIPT_JSON_BYTES });
  const parsed = JSON.parse(decodeUtf8(opened.bytes, rawFilePath));
  if (parsed?.clamped === true) throw new Error(`Agy-Context-Saver transcript JSON is clamped: ${rawFilePath}`);
  let content;
  let stepIndex = null;
  let conversationId = typeof parsed?.convId === "string" ? parsed.convId : null;
  if (typeof parsed?.data === "string") {
    content = parsed.data;
    stepIndex = Number.isFinite(Number(parsed.stepIndex)) ? Number(parsed.stepIndex) : null;
  } else if (Array.isArray(parsed?.items) || Array.isArray(parsed?.steps)) {
    const records = Array.isArray(parsed.items) ? parsed.items : parsed.steps;
    const candidates = records.filter(item => item?.type === "PLANNER_RESPONSE" && typeof item.content === "string" && item.content.trim());
    const marker = candidates.filter(item => item.content.trim().startsWith("# Evidence Report"));
    if (new Set(marker.map(item => item.content)).size > 1) throw new Error(`Agy-Context-Saver transcript JSON has ambiguous '# Evidence Report' responses: ${rawFilePath}`);
    const selected = (marker.length > 0 ? marker : candidates).at(-1);
    if (!selected) throw new Error(`Agy-Context-Saver transcript JSON has no assistant report content: ${rawFilePath}`);
    if (Object.hasOwn(selected, "truncated_fields")) throw new Error(`Agy-Context-Saver transcript JSON selected item has truncated_fields: ${rawFilePath}`);
    content = selected.content;
    stepIndex = Number.isFinite(Number(selected.step_index)) ? Number(selected.step_index) : null;
  }
  if (typeof content !== "string" || !content.trim()) throw new Error(`Agy-Context-Saver transcript JSON has empty report content: ${rawFilePath}`);
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > TRANSCRIPT_REPORT_LIMIT_BYTES) throw new Error(`Agy-Context-Saver transcript report exceeds the 128 KiB ceiling: ${rawFilePath}`);
  if (conversationId !== null) {
    const normConvId = normalizeUuid(conversationId);
    if (!normConvId) throw new Error(`Agy-Context-Saver transcript JSON has an invalid conversation UUID: ${rawFilePath}`);
    conversationId = normConvId;
  }
  return { bytes: Buffer.from(content, "utf8"), provenance: { conversationId, stepIndex }, relPath: relCandidate };
}
 
function parseTranscriptJsonMappings(values) {
  const out = new Map();
  for (const item of Array.isArray(values) ? values : values ? [values] : []) {
    const eq = String(item).indexOf("=");
    if (eq <= 0 || eq === String(item).length - 1) throw new Error(`Invalid --transcript-json entry '${item}'; expected <slot>=<jsonPath>.`);
    out.set(String(item).slice(0, eq).trim(), String(item).slice(eq + 1).trim());
  }
  return out;
}
 
function collectReportSlots(root, options = {}) {
  root = resolveCanonicalRoot(root);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Provide valid collect options.");
  }
  const {
    sources = [],
    handoffs,
    plan,
    provenance,
    record,
    idMap,
    squadId,
    reportRoot,
    overwrite = false,
    dryRun = false,
    allowEmpty = false,
    strict = false,
    transcriptJson,
    fromTranscript = false,
    transcriptHomeDir
  } = options;

  if (!Array.isArray(sources)) {
    throw new Error("Provide at least one worktree directory via --from <dir>.");
  }
  if (
    provenance !== undefined &&
    (!isPlainObject(provenance) || (provenance.entries !== undefined && !Array.isArray(provenance.entries)))
  ) {
    throw new Error("Provide a valid provenance scaffold JSON object with an entries array.");
  }
  if (idMap !== undefined && !isPlainObject(idMap)) {
    throw new Error("idMap must be a plain object mapping worker names to conversation UUIDs.");
  }
  const receiptRoots = workerReceiptRoots([
    ...(Array.isArray(handoffs) ? handoffs : []),
    ...(Array.isArray(record?.handoffs) ? record.handoffs : [])
  ]).map(r => ({ ...r, realRoot: tryRealPath(r.root) }));
  const inferredSources = sources.length > 0 ? sources : receiptRoots.map(r => r.root);
  if (sources.length === 0 && plan === undefined && record === undefined) {
    throw new Error("Collecting from --handoffs receipts requires --plan <plan.json> or --record <record.json> to bind senders to assigned slots; pass --from <worktree-dir> explicitly with --squad.");
  }
  if (
    typeof overwrite !== "boolean" || typeof dryRun !== "boolean" || typeof allowEmpty !== "boolean" ||
    typeof strict !== "boolean" || typeof fromTranscript !== "boolean"
  ) {
    throw new Error("Collect flags overwrite, dryRun, allowEmpty, strict, and fromTranscript must be booleans.");
  }
  const overrideRoot = reportRoot !== undefined ? normalizeReportRoot(reportRoot) : undefined;
  const transcriptMappings = parseTranscriptJsonMappings(transcriptJson);
  const readonlyWorkers = new Map();
  if (plan?.executionMode === "subagent" && Array.isArray(plan.workers)) {
    for (const worker of plan.workers) {
      if (squadId !== undefined && worker?.squadId !== squadId) continue;
      for (const specialist of Array.isArray(worker?.specialists) ? worker.specialists : []) {
        const specialistType = specialist?.typeName ?? specialist?.Subagent?.TypeName;
        if (specialistType === READONLY_SUBAGENT_TYPE && typeof specialist.reportSlot === "string") {
          const resolvedSlot = overrideRoot !== undefined ? rebaseSlotReportRoot(specialist.reportSlot, overrideRoot) : specialist.reportSlot;
          readonlyWorkers.set(resolvedSlot, specialist.workerName);
        }
      }
    }
  }
  const hasTranscriptMaterializationInputs = transcriptMappings.size > 0 || readonlyWorkers.size > 0 || fromTranscript === true;
  if (inferredSources.length === 0 && !hasTranscriptMaterializationInputs) throw new Error("Provide --from <dir> or sender-bound --handoffs containing wt=<dir>.");

  const resolvedSources = [];
  const seenRealSources = new Set();
  for (const src of inferredSources) {
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
    const seenKey = process.platform === "win32" ? realSrc.toLowerCase() : realSrc;
    if (!seenRealSources.has(seenKey)) {
      seenRealSources.add(seenKey);
      const senders = sources.length > 0 ? null : new Set(receiptRoots.filter(r => isExpectedRealPath(r.realRoot, realSrc)).map(r => r.sender));
      if (senders) validateWorkerWorktreeRoot(root, realSrc);
      resolvedSources.push({ raw: src, real: realSrc, senders });
    }
  }

  const targetSlotSet = new Set();
  const inheritSlotSet = new Set();
  const optionalPlanInheritSlots = new Set();
  const addSlot = (slot, isInherit = false, optionalInPlan = false) => {
    validateReportSlotPath(slot);
    const resolvedSlot = overrideRoot !== undefined ? rebaseSlotReportRoot(slot, overrideRoot) : slot;
    targetSlotSet.add(resolvedSlot);
    if (isInherit) {
      inheritSlotSet.add(resolvedSlot);
    }
    if (optionalInPlan) {
      optionalPlanInheritSlots.add(resolvedSlot);
    }
  };
  const senderSlots = new Map();
  const slotWorkerNames = new Map();
  const workerKeyToSlot = new Map();
  const slotToBinding = new Map();
  const slotToUuid = new Map();
  const uuidToSlot = new Map();
  const rebaseIfNeeded = (slot) => (overrideRoot !== undefined ? rebaseSlotReportRoot(slot, overrideRoot) : slot);
  const registerWorkerKey = (key, resolvedSlot) => {
    if (typeof key !== "string" || !key || RESERVED_WORKER_KEYS.has(key)) return;
    const prevSlot = workerKeyToSlot.get(key);
    if (prevSlot !== undefined && prevSlot !== resolvedSlot) {
      throw new Error(`Ambiguous worker key '${key}' mapped to multiple report slots ('${prevSlot}' and '${resolvedSlot}').`);
    }
    workerKeyToSlot.set(key, resolvedSlot);
  };
  const registerSlotWorker = (workerName, rawSlot) => {
    if (typeof workerName !== "string" || !workerName.trim() || typeof rawSlot !== "string") return;
    const wn = workerName.trim();
    if (RESERVED_WORKER_KEYS.has(wn)) {
      throw new Error(`Invalid reserved worker name '${wn}'.`);
    }
    const resolvedSlot = rebaseIfNeeded(rawSlot);
    if (!slotWorkerNames.has(resolvedSlot)) slotWorkerNames.set(resolvedSlot, wn);
    registerWorkerKey(wn, resolvedSlot);
    registerWorkerKey(`<invoke_subagent:${wn}:conversationId>`, resolvedSlot);
  };
  const bindSlotConversationId = (slotRel, rawId, requireUuid = false, sourceLabel = "binding") => {
    if (typeof rawId !== "string") {
      if (requireUuid) throw new Error(`Invalid ${sourceLabel} conversation UUID for '${slotRel}'.`);
      return;
    }
    const trimmed = rawId.trim();
    if (!trimmed || (!requireUuid && /^<.*>$/.test(trimmed))) return;
    const normUuid = normalizeUuid(trimmed);
    if (requireUuid && !normUuid) {
      throw new Error(`Invalid ${sourceLabel} UUID for '${slotRel}': expected a 36-character UUID, got '${rawId}'.`);
    }
    const canonicalId = normUuid ?? trimmed;
    const prevId = slotToBinding.get(slotRel);
    if (prevId !== undefined && prevId !== canonicalId) {
      throw new Error(`Conflicting conversationId bindings for '${slotRel}': '${prevId}' vs '${canonicalId}'.`);
    }
    slotToBinding.set(slotRel, canonicalId);
    if (normUuid) {
      const prevSlot = uuidToSlot.get(normUuid);
      if (prevSlot !== undefined && prevSlot !== slotRel) {
        throw new Error(`Duplicate conversationId '${normUuid}' bound to multiple report slots ('${prevSlot}' and '${slotRel}').`);
      }
      uuidToSlot.set(normUuid, slotRel);
      slotToUuid.set(slotRel, normUuid);
    }
  };
  const bindSender = (sender, slot) => { if (typeof sender === "string" && typeof slot === "string") senderSlots.set(sender, rebaseIfNeeded(slot)); };
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
        const leadIsInherit = w.lead.swarmAdd?.workspace === "inherit" || plan.executionMode === "subagent";
        addSlot(w.lead.reportSlot, leadIsInherit, leadIsInherit);
        registerSlotWorker(w.lead.workerName, w.lead.reportSlot);
      }
      for (const s of w?.specialists ?? []) {
        if (s?.reportSlot !== undefined) {
          const specialistIsInherit = plan.executionMode === "subagent" || s.swarmAdd?.workspace === "inherit";
          addSlot(s.reportSlot, specialistIsInherit);
          registerSlotWorker(s.workerName, s.reportSlot);
          if (!specialistIsInherit) bindSender(s.workerName, s.reportSlot);
        }
      }
    }
    for (const entry of [...(plan.provenanceScaffold?.entries ?? []), ...(provenance?.entries ?? [])]) {
      if (squadId !== undefined && entry?.squadId !== squadId) continue;
      matchedPlanSquad = true;
      if (entry?.reportSlot !== undefined) {
        const entryIsInherit = plan.executionMode === "swarm" && (entry?.slotType === "lead" || entry?.slotType === "audit");
        addSlot(entry.reportSlot, entryIsInherit, entryIsInherit);
        registerSlotWorker(entry.workerName, entry.reportSlot);
        bindSlotConversationId(rebaseIfNeeded(entry.reportSlot), entry.conversationId, false, "provenance");
      } else if (typeof entry?.workerName === "string" && workerKeyToSlot.has(entry.workerName.trim())) {
        bindSlotConversationId(workerKeyToSlot.get(entry.workerName.trim()), entry.conversationId, false, "provenance");
      }
    }
    for (const audit of plan.integrityAuditPlan ?? []) {
      if (squadId !== undefined && audit?.targetSquad !== squadId) continue;
      if (audit?.reportSlot !== undefined) {
        const auditIsInherit = audit.swarmAdd?.workspace === "inherit" || plan.executionMode === "subagent";
        addSlot(audit.reportSlot, auditIsInherit, auditIsInherit);
        registerSlotWorker(audit.workerName, audit.reportSlot);
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
      if (a?.report !== undefined) {
        addSlot(a.report);
        const resolvedSlot = rebaseIfNeeded(a.report);
        const trimmedCid = typeof a.conversationId === "string" ? a.conversationId.trim() : "";
        const explicitWn = typeof a.workerName === "string" && a.workerName.trim() ? a.workerName.trim() : undefined;
        let placeholderWn;
        if (trimmedCid.startsWith("<invoke_subagent:")) {
          placeholderWn = extractPlaceholderWorkerName(trimmedCid);
          if (!placeholderWn) {
            throw new Error(`Invalid subagent placeholder '${trimmedCid}' for '${resolvedSlot}'.`);
          }
        }
        if (explicitWn && placeholderWn && explicitWn !== placeholderWn) {
          throw new Error(`Conflicting workerName '${explicitWn}' and placeholder '${trimmedCid}' for '${resolvedSlot}'.`);
        }
        const effectiveWn = explicitWn ?? placeholderWn;
        bindSender(a.conversationId, a.report);
        bindSender(effectiveWn, a.report);
        registerSlotWorker(effectiveWn, a.report);
        if (trimmedCid) {
          registerWorkerKey(trimmedCid, resolvedSlot);
        }
        bindSlotConversationId(resolvedSlot, a.conversationId, false, "record");
      }
    }
    for (const entry of provenance?.entries ?? []) {
      if (entry?.squadId !== undefined && entry.squadId !== record.squadId) continue;
      const targetSlot = entry?.reportSlot !== undefined
        ? rebaseIfNeeded(entry.reportSlot)
        : (typeof entry?.workerName === "string" ? workerKeyToSlot.get(entry.workerName.trim()) : undefined);
      if (targetSlot && targetSlotSet.has(targetSlot)) {
        bindSlotConversationId(targetSlot, entry.conversationId, false, "provenance");
      }
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

  for (const key of Object.getOwnPropertyNames(idMap ?? {})) {
    if (RESERVED_WORKER_KEYS.has(key)) {
      throw new Error(`Invalid reserved --id-map key '${key}'.`);
    }
    const val = idMap[key];
    const mappedSlot = workerKeyToSlot.get(key) ?? (targetSlotSet.has(key) ? key : undefined);
    if (!mappedSlot) {
      throw new Error(`--id-map key '${key}' did not match any worker or assignment in the supplied plan or record.`);
    }
    bindSlotConversationId(mappedSlot, val, true, "--id-map");
  }

  const targetSlots = [...targetSlotSet];
  const foldSlotCase = process.platform === "win32" || process.platform === "darwin";
  const foundBySlot = new Map();
  for (const { raw, real, senders } of resolvedSources) {
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
      if (senders && (inheritSlotSet.has(slotRel) || ![...senders].some(sender => senderSlots.get(sender) === slotRel))) continue;
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

  const addTranscriptEntry = (slotRel, extracted, sourceLabel) => {
    if (!targetSlotSet.has(slotRel) || foundBySlot.has(slotRel)) return;
    foundBySlot.set(slotRel, {
      bytes: extracted.bytes,
      hash: sha256(extracted.bytes),
      source: sourceLabel,
      transcriptProvenance: { ...extracted.provenance, sha256: sha256(extracted.bytes) }
    });
  };
  const transcriptHandoffs = [
    ...(Array.isArray(handoffs) ? handoffs : []),
    ...(Array.isArray(record?.handoffs) ? record.handoffs : [])
  ];
  const verifiedExistingRootDirs = new Set([root]);
  for (const [slotRel, jsonPathRaw] of transcriptMappings.entries()) {
    if (!targetSlotSet.has(slotRel)) throw new Error(`--transcript-json slot '${slotRel}' is not an expected report slot.`);
    const extracted = extractAcsJsonReport(root, jsonPathRaw, verifiedExistingRootDirs);
    const boundUuid = slotToUuid.get(slotRel);
    if (boundUuid) {
      if (extracted.provenance.conversationId && extracted.provenance.conversationId !== boundUuid) {
        throw new Error(
          `--transcript-json conversationId '${extracted.provenance.conversationId}' does not match coordinator binding '${boundUuid}' for '${slotRel}'.`
        );
      }
      if (!extracted.provenance.conversationId) {
        extracted.provenance.conversationId = boundUuid;
      }
    }
    addTranscriptEntry(slotRel, extracted, `transcript-json:${extracted.relPath}`);
  }
  const directTranscriptSlots = fromTranscript
    ? new Map([...targetSlotSet].map(slotRel => [slotRel, slotWorkerNames.get(slotRel)]))
    : readonlyWorkers;
  const hasExplicitHome = typeof transcriptHomeDir === "string" && transcriptHomeDir.trim().length > 0;
  const homeDir = hasExplicitHome ? path.resolve(transcriptHomeDir) : os.homedir();
  for (const [slotRel, workerName] of directTranscriptSlots.entries()) {
    if (foundBySlot.has(slotRel)) continue;
    const existingRootReport = readIfPresentWithStat(root, slotRel, verifiedExistingRootDirs);
    if (existingRootReport && decodeUtf8(existingRootReport.bytes, slotRel).trim().length > 0) continue;
    const boundUuid = slotToUuid.get(slotRel);
    const allowRosterSender = plan?.executionMode === "swarm" && typeof workerName === "string" && workerName.length > 0;
    const isAuthorizedSender = (rawSender) => {
      if (!boundUuid) return false;
      const normSender = normalizeUuid(rawSender);
      if (normSender && normSender === boundUuid) return true;
      return Boolean(allowRosterSender && rawSender.trim() === workerName);
    };
    const matchingHandoffs = [];
    for (const h of transcriptHandoffs) {
      if (!h || typeof h !== "object" || typeof h.sender !== "string" || typeof h.message !== "string") continue;
      const rawSender = h.sender.trim();
      const stripped = stripReceiptPrefix(h.message);
      const parsedForSlot = parsePointerReceipt(stripped, slotRel);
      const targetsThisSlotExplicitly = parsedForSlot?.status === "READY" || parsedForSlot?.status === "PARTIAL";
      const fromAuthorizedSender = isAuthorizedSender(rawSender);
      if (!targetsThisSlotExplicitly && !fromAuthorizedSender) continue;
      if (!boundUuid) {
        throw new Error(
          `Direct transcript extraction for '${slotRel}' requires a coordinator-bound conversation UUID via --id-map <worker=uuid>, --provenance <scaffold.json>, or --record <record.json> (or pass --transcript-json <slot=json>).`
        );
      }
      if (!fromAuthorizedSender) {
        throw new Error(
          `Handoff sender '${rawSender}' is not authorized for slot '${slotRel}'; expected strict sender UUID '${boundUuid}' (or pass --transcript-json <slot=json>).`
        );
      }
      if (!parsedForSlot) {
        throw new Error(`Invalid handoff receipt from '${rawSender}' for slot '${slotRel}'.`);
      }
      matchingHandoffs.push({ handoff: h, status: parsedForSlot.status });
    }
    if (matchingHandoffs.length === 0) continue;
    if (new Set(matchingHandoffs.map(m => m.handoff.message)).size > 1) {
      throw new Error(`Conflicting handoffs for slot '${slotRel}'.`);
    }
    if (matchingHandoffs[0].status === "NO_REPORT") continue;
    const restriction = restrictiveTranscriptPolicyError(homeDir, hasExplicitHome);
    if (restriction) throw new Error(restriction);
    try {
      const transcriptPath = resolveTranscriptFullPath(boundUuid, homeDir);
      const extracted = parseTranscriptReportJsonl(transcriptPath, boundUuid);
      addTranscriptEntry(slotRel, extracted, `transcript:${boundUuid}`);
    } catch (error) {
      throw new Error(`Failed to materialize read-only subagent report '${slotRel}' from transcript '${boundUuid}': ${error.message}`);
    }
  }
 
  const verifiedInheritDirs = new Set([root]);
  const missing = targetSlots.filter(slotRel => {
    if (foundBySlot.has(slotRel)) return false;
    if (optionalPlanInheritSlots.has(slotRel)) return false;
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
        status: "unchanged",
        ...(entry.transcriptProvenance ? { transcriptProvenance: entry.transcriptProvenance } : {})
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
      status: dryRun ? "would-copy" : "copied",
      ...(entry.transcriptProvenance ? { transcriptProvenance: entry.transcriptProvenance } : {})
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
      ...(w.readOnly === true || plan.readOnly === true ? { readOnly: true } : {}),
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

const MAX_FROM_SCOPE_FILES = 256;
const SKIPPED_SCOPE_WALK_DIRS = new Set([".git", "node_modules"]);

function relativizeContainedCliPath(inputPath, targetRoot, { platform = process.platform, allowEqual = false } = {}) {
  if (typeof inputPath !== "string" || typeof targetRoot !== "string" || !targetRoot.trim()) {
    return null;
  }
  const trimmed = inputPath.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed) || platform !== process.platform || !path.isAbsolute(trimmed)) {
    return null;
  }
  let canonicalRoot;
  try {
    canonicalRoot = resolveCanonicalRoot(targetRoot);
  } catch {
    return null;
  }
  const resolved = path.resolve(trimmed);
  let cur = resolved;
  const tail = [];
  while (true) {
    try {
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink() && tail.length === 0) {
        // Leaf itself is a symlink: only relativize if its lexical parent directory is inside canonicalRoot,
        // so downstream O_NOFOLLOW rejects in-workspace symlinks with ELOOP while external inbound symlinks stay rejected as outside-workspace.
        const realLexParent = fs.realpathSync.native(path.dirname(cur));
        if (!isContainedPath(canonicalRoot, realLexParent, true, platform)) return null;
        const candidateInside = path.join(realLexParent, path.basename(cur));
        if (!isContainedPath(canonicalRoot, candidateInside, allowEqual, platform)) return null;
        const rel = path.relative(canonicalRoot, candidateInside).split(path.sep).join("/");
        return rel || (allowEqual ? "." : null);
      }
      if (st.isSymbolicLink() && tail.length > 0) {
        // Ancestor symlink: only allow if the symlink's lexical parent is canonicalRoot's parent (aliased workspace root itself),
        // never an in-workspace symlinked subdirectory.
        const realSym = fs.realpathSync.native(cur);
        if (!isExpectedRealPath(canonicalRoot, realSym)) return null;
        const candidateInside = path.join(realSym, ...tail);
        if (!isContainedPath(canonicalRoot, candidateInside, allowEqual, platform)) return null;
        const rel = path.relative(canonicalRoot, candidateInside).split(path.sep).join("/");
        return rel || (allowEqual ? "." : null);
      }
      const realExisting = fs.realpathSync.native(cur);
      if (!isContainedPath(canonicalRoot, realExisting, true, platform)) {
        return null;
      }
      const candidateTarget = tail.length > 0 ? path.join(realExisting, ...tail) : realExisting;
      if (!isContainedPath(canonicalRoot, candidateTarget, allowEqual, platform)) {
        return null;
      }
      const rel = path.relative(canonicalRoot, candidateTarget).split(path.sep).join("/");
      return rel || (allowEqual ? "." : null);
    } catch (err) {
      if (err?.code !== "ENOENT" && err?.code !== "ENOTDIR") return null;
    }
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    tail.unshift(path.basename(cur));
    cur = parent;
  }
}

function normalizeContainedJsonOutPath(rawPath, targetRoot, label = "outPath", platform = process.platform) {
  let candidate = typeof rawPath === "string" ? rawPath.trim() : "";
  if (candidate && targetRoot && path.isAbsolute(candidate)) {
    const relativized = relativizeContainedCliPath(candidate, targetRoot, { platform, allowEqual: false });
    if (relativized !== null) candidate = relativized;
  }
  const errSuffix = label === "outPath" ? " inside workspace" : "";
  if (
    !candidate ||
    CONTROL_CHAR_RE.test(candidate) ||
    candidate.startsWith("/") ||
    candidate.startsWith("\\") ||
    path.isAbsolute(candidate) ||
    WINDOWS_DRIVE_RE.test(candidate) ||
    (platform !== "win32" && candidate.includes("\\"))
  ) {
    throw new Error(`${label} must be a workspace-relative .json path${errSuffix}: ${rawPath}`);
  }
  const posixOut = (platform === "win32" ? candidate.replace(/\\/g, "/") : candidate).replace(/^(?:\.\/)+/, "");
  if (
    !posixOut ||
    posixOut.split("/").some(p => !p || p === "." || p === "..") ||
    !posixOut.toLowerCase().endsWith(".json") ||
    path.posix.basename(posixOut).toLowerCase() === ".json"
  ) {
    throw new Error(`${label} must be a workspace-relative .json path${errSuffix}: ${rawPath}`);
  }
  return posixOut;
}

function extractScopeLinesFromBrief(text) {
  if (typeof text !== "string" || !text) return [];
  const lines = text.split(/\r?\n/);
  const scopes = [];
  let inScope = false;
  for (const line of lines) {
    if (!inScope) {
      if (line === "Scope:" || line.startsWith("Spot-check scope (")) {
        inScope = true;
      }
      continue;
    }
    if (line.startsWith("- ")) {
      const entry = line.slice(2).trim();
      if (entry) scopes.push(entry);
    } else {
      break;
    }
  }
  return scopes;
}

function collectPlanSquadScopeEntries(rawPlan, selectedSquadId) {
  if (!Array.isArray(rawPlan?.workers)) {
    throw new Error(`--from-scope requires plan.workers['${selectedSquadId}'] with scopeFiles.`);
  }
  const squadWorker = rawPlan.workers.find(w => w && typeof w === "object" && w.squadId === selectedSquadId);
  if (!squadWorker) {
    throw new Error(`--from-scope could not find squad '${selectedSquadId}' in plan.workers.`);
  }
  const collected = [];
  const addWorkerScopes = (entry) => {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry.scopeFiles)) {
      for (const item of entry.scopeFiles) collected.push(item);
      return;
    }
    const briefText = entry.swarmAdd?.brief ?? entry.Subagent?.Prompt;
    for (const item of extractScopeLinesFromBrief(briefText)) {
      collected.push(item);
    }
  };
  for (const specialist of Array.isArray(squadWorker.specialists) ? squadWorker.specialists : []) {
    addWorkerScopes(specialist);
  }
  if (squadWorker.lead) {
    addWorkerScopes(squadWorker.lead);
  }
  const deduped = [];
  const seen = new Set();
  for (const raw of collected) {
    if (typeof raw !== "string") {
      throw new Error(`--from-scope found invalid scopeFiles entry for squad '${selectedSquadId}'.`);
    }
    if (!isValidScopeEntry(raw)) {
      throw new Error(`--from-scope found invalid workspace-relative scope entry '${raw}' for squad '${selectedSquadId}'.`);
    }
    const trimmed = raw.trim();
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      deduped.push(trimmed);
    }
  }
  if (deduped.length === 0) {
    throw new Error(`--from-scope found no scopeFiles for squad '${selectedSquadId}'; pass explicit --file <path> arguments.`);
  }
  return deduped;
}

function buildOutputTargetMatcher(canonicalRoot, candidateOutRels) {
  const targets = [];
  const seen = new Set();
  for (const raw of candidateOutRels) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    let rel;
    try {
      rel = normalizeContainedJsonOutPath(raw, canonicalRoot, "recordPath");
    } catch {
      continue;
    }
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(canonicalRoot, rel);
    targets.push({
      rel,
      lowerRel: rel.toLowerCase(),
      baseLower: path.posix.basename(rel).toLowerCase(),
      abs,
      dirAbs: path.dirname(abs)
    });
  }
  if (targets.length === 0) return () => null;
  return (candidateInput) => {
    if (typeof candidateInput !== "string" || !candidateInput.trim()) return null;
    let candNorm = candidateInput.trim();
    if (path.isAbsolute(candNorm)) {
      const rel = relativizeContainedCliPath(candNorm, canonicalRoot, { allowEqual: false });
      if (!rel) return null;
      candNorm = rel;
    } else {
      if (process.platform === "win32") candNorm = candNorm.replace(/\\/g, "/");
      candNorm = candNorm.replace(/\/+/g, "/").replace(/^(?:\.\/)+/, "");
    }
    const candLower = candNorm.toLowerCase();
    const candAbs = path.join(canonicalRoot, candNorm);
    const candDirAbs = path.dirname(candAbs);
    const candBaseLower = path.posix.basename(candNorm).toLowerCase();
    for (const t of targets) {
      if (candNorm === t.rel) return t.rel;
      if (process.platform === "win32" && candLower === t.lowerRel) return t.rel;
      if (isSameFsObject(candAbs, t.abs)) return t.rel;
      if (process.platform === "darwin" && candBaseLower === t.baseLower && isSameFsObject(candDirAbs, t.dirAbs)) {
        return t.rel;
      }
    }
    return null;
  };
}

function expandScopeEntriesToFiles(
  canonicalRoot,
  entries,
  selectedSquadId,
  verifiedDirs,
  resolvedReportRoot,
  options = {}
) {
  const maxFiles = Number.isInteger(options?.maxFiles) && options.maxFiles > 0 ? options.maxFiles : MAX_FROM_SCOPE_FILES;
  const allowEmptyResult = Boolean(options?.allowEmptyResult);
  const excludeFilePredicate = typeof options?.excludeFilePredicate === "function" ? options.excludeFilePredicate : null;
  const expanded = new Set();
  const reportRootPrefix = `${resolvedReportRoot}/`;
  const throwCapExceeded = (originEntry) => {
    const detail = originEntry ? ` while expanding '${originEntry}'` : "";
    const err = new Error(
      `--from-scope exceeded the ${maxFiles}-file safety cap${detail}; pass explicit --file <path> arguments instead.`
    );
    err.code = "EMAXFILES";
    err.partialFiles = [...expanded].slice(0, maxFiles).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    throw err;
  };
  const walkDirectory = (dirAbs, dirRel, originEntry) => {
    const dirents = fs.readdirSync(dirAbs, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
    for (const dirent of dirents) {
      const childRel = `${dirRel}/${dirent.name}`;
      if (dirent.isSymbolicLink()) {
        throw new Error(`Refusing to follow symlink '${childRel}' while expanding --from-scope directory '${originEntry}'.`);
      }
      if (dirent.isDirectory()) {
        if (
          SKIPPED_SCOPE_WALK_DIRS.has(dirent.name) ||
          childRel === resolvedReportRoot ||
          childRel.startsWith(reportRootPrefix)
        ) {
          continue;
        }
        walkDirectory(path.join(dirAbs, dirent.name), childRel, originEntry);
      } else if (dirent.isFile()) {
        if (excludeFilePredicate?.(childRel)) continue;
        expanded.add(childRel);
        if (expanded.size > maxFiles) {
          throwCapExceeded(originEntry);
        }
      } else {
        throw new Error(`Unsupported non-regular file '${childRel}' encountered while expanding --from-scope directory '${originEntry}'.`);
      }
    }
  };

  for (const entry of entries) {
    if (entry === ".") {
      throw new Error(
        "--from-scope cannot expand repo-wide wildcard '.'; narrow scopeFiles in the plan or pass explicit --file <path> arguments."
      );
    }
    const targetAbs = workspacePath(canonicalRoot, entry, verifiedDirs);
    let stat;
    try {
      stat = fs.lstatSync(targetAbs);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`--from-scope path '${entry}' does not exist in workspace.`);
      }
      throw error;
    }
    if (stat.isSymbolicLink()) {
      const symErr = new Error(`Refusing to follow symlink '${entry}' in --from-scope.`);
      symErr.code = "ELOOP";
      throw symErr;
    }
    if (stat.isFile()) {
      const hit = excludeFilePredicate?.(entry);
      if (hit) {
        throw new Error(
          `--from-scope file entry '${entry}' collides with generated record output '${hit}'; write the record outside scoped files.`
        );
      }
      expanded.add(entry);
      if (expanded.size > maxFiles) {
        throwCapExceeded(null);
      }
    } else if (stat.isDirectory()) {
      if (entry === resolvedReportRoot || entry.startsWith(reportRootPrefix)) {
        continue;
      }
      walkDirectory(targetAbs, entry, entry);
    } else {
      throw new Error(`Unsupported non-regular file '${entry}' in --from-scope.`);
    }
  }
  if (expanded.size === 0 && !allowEmptyResult) {
    throw new Error(`--from-scope resolved 0 regular files for squad '${selectedSquadId}'; pass explicit --file <path> arguments.`);
  }
  return [...expanded].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// POSIX single-quote serializer (also literal in PowerShell when value contains no apostrophe; not for cmd.exe).
function shellQuote(value) {
  const str = String(value);
  if (!str) return "''";
  return /^[A-Za-z0-9_./:-]+$/.test(str) ? str : "'" + str.replaceAll("'", "'\\''") + "'";
}

function replaceLineTokensOnce(line, rules) {
  if (rules.length === 0) return line;
  let out = "";
  for (let i = 0; i < line.length;) {
    let matched = null;
    for (const rule of rules) {
      if (!rule.from || !line.startsWith(rule.from, i)) continue;
      const end = i + rule.from.length;
      if (rule.boundary) {
        const leadOk = i === 0 || (rule.boundary === "quoted" ? " \t`([=:".includes(line[i - 1]) : " \t`".includes(line[i - 1]));
        const trailOk = end >= line.length || (rule.boundary === "quoted" ? " \t`;.,:)]".includes(line[end]) : " \t`;".includes(line[end]));
        if (!leadOk || !trailOk) continue;
      }
      matched = rule;
      break;
    }
    if (matched) {
      out += matched.to;
      i += matched.from.length;
    } else {
      out += line[i++];
    }
  }
  return out;
}

function addOrigPathBindRules(cmdRules, origPath, quotedReplacement) {
  const sq = "'" + origPath.replaceAll("'", "'\\''") + "'";
  const dq = '"' + origPath.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"';
  const sh = shellQuote(origPath);
  cmdRules.push({ from: sq, to: quotedReplacement, boundary: "quoted" }, { from: dq, to: quotedReplacement, boundary: "quoted" });
  if (sh !== sq && sh !== dq) cmdRules.push({ from: sh, to: quotedReplacement, boundary: true });
}

function buildBoundAuditSwarmAdds(_targetRoot, plan, record, outRel, digestResult) {
  if (!isPlainObject(plan) || !Array.isArray(plan.integrityAuditPlan) || record?.requireIntegrityAudit === false) {
    return [];
  }
  const matching = plan.integrityAuditPlan.filter(a => a && a.targetSquad === record.squadId && isPlainObject(a.swarmAdd));
  if (matching.length === 0) return [];
  const effectiveRecordPath = outRel ?? record.recordPath ?? recordSlotPath(record.squadId, record.reportRoot);
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const mappedUuids = [];
  const seenUuids = new Set();
  for (const a of record.assignments ?? []) {
    const cid = typeof a?.conversationId === "string" ? a.conversationId.trim() : "";
    if (uuidRe.test(cid) && !seenUuids.has(cid)) {
      seenUuids.add(cid);
      mappedUuids.push(cid);
    }
  }
  const bindOne = (auditEntry, idx) => {
    const auditSlot = Array.isArray(record.integrityAuditSlots) && record.integrityAuditSlots[idx]
      ? record.integrityAuditSlots[idx]
      : auditEntry.reportSlot;
    const origRecordSlot = auditEntry.recordSlot ?? recordSlotPath(record.squadId, plan.reportRoot);
    const origAuditSlot = auditEntry.reportSlot;
    const cmdRules = [];
    if (effectiveRecordPath) {
      const quotedRecord = shellQuote(effectiveRecordPath);
      cmdRules.push({ from: "'<rel-record>'", to: quotedRecord, boundary: false });
      cmdRules.push({ from: '"<rel-record>"', to: quotedRecord, boundary: false });
      cmdRules.push({ from: "<rel-record>", to: quotedRecord, boundary: false });
      if (origRecordSlot && origRecordSlot !== effectiveRecordPath) {
        addOrigPathBindRules(cmdRules, origRecordSlot, quotedRecord);
      }
    }
    if (auditSlot) {
      const quotedAudit = shellQuote(auditSlot);
      cmdRules.push({ from: "'<rel-slot>'", to: quotedAudit, boundary: false });
      cmdRules.push({ from: '"<rel-slot>"', to: quotedAudit, boundary: false });
      cmdRules.push({ from: "<rel-slot>", to: quotedAudit, boundary: false });
      if (origAuditSlot && origAuditSlot !== auditSlot) {
        addOrigPathBindRules(cmdRules, origAuditSlot, quotedAudit);
      }
    }
    if (mappedUuids.length > 0) {
      cmdRules.push({ from: "u1,u2", to: mappedUuids.join(","), boundary: false });
    }
    const brief = String(auditEntry.swarmAdd.brief ?? "")
      .split("\n")
      .map(line => {
        if (effectiveRecordPath && origRecordSlot && line === `- ${origRecordSlot}`) {
          return `- ${effectiveRecordPath}`;
        }
        if (auditSlot && origAuditSlot && line === `Report slot: ${origAuditSlot}`) {
          return `Report slot: ${auditSlot}`;
        }
        const nextLine = digestResult?.evidenceDigest
          ? line.replace(/Evidence Digest:\s*<sha256>/g, () => `Evidence Digest: ${digestResult.evidenceDigest}`)
          : line;
        return replaceLineTokensOnce(nextLine, cmdRules);
      })
      .join("\n");
    return {
      ...auditEntry.swarmAdd,
      brief
    };
  };
  return matching.map(bindOne);
}

function buildBoundAuditSwarmAdd(targetRoot, plan, record, outRel, digestResult) {
  return buildBoundAuditSwarmAdds(targetRoot, plan, record, outRel, digestResult)[0];
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
    fromScope = false,
    reportRoot,
    verdict,
    idMap = {},
    handoffs,
    allowUnaudited = false,
    allowNonPassing = false,
    allowPartial = false,
    recordPath: explicitRecordPath,
    onLeadRead
  } = options;

  if (typeof fromScope !== "boolean") {
    throw new Error("fromScope must be a boolean.");
  }
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
      `Plan defines ${templateKeys.length} squads (${templateKeys.join(", ") || "none"}); specify --squad <id> (or --all-squads).`
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

  const isReadOnlySquad = Boolean(template.readOnly === true);

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
    const explicitItemWorkerName =
      typeof item.workerName === "string" && item.workerName.trim() ? item.workerName.trim() : undefined;
    const swarmRosterName =
      plan.executionMode === "swarm"
        ? explicitItemWorkerName ??
          (typeof (slotEntry?.workerName ?? workerEntry?.workerName) === "string"
            ? (slotEntry?.workerName ?? workerEntry?.workerName).trim()
            : typeof item.conversationId === "string" && !/^<.*>$/.test(item.conversationId.trim())
              ? item.conversationId.trim()
              : undefined)
        : explicitItemWorkerName;
    return {
      conversationId: nextId,
      ...(swarmRosterName && (explicitItemWorkerName || swarmRosterName !== nextId)
        ? { workerName: swarmRosterName }
        : {}),
      report: slotPath,
      ...(() => {
        const roots = workerReceiptRoots(handoffs).filter(h => h.sender === nextId || h.sender === swarmRosterName);
        if (!roots.length) return {};
        const verified = [...new Set(roots.map(h => validateWorkerWorktreeRoot(root, h.root)))];
        if (verified.length !== 1) throw new Error(`Conflicting worktree roots for ${nextId}.`);
        return { worktreeRoot: verified[0] };
      })()
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
  const candidateRecordOutputs = Array.isArray(options.excludedRecordOutputs)
    ? options.excludedRecordOutputs
    : (explicitRecordPath ? [explicitRecordPath] : [recordSlotPath(selectedSquadId, resolvedReportRoot)]);
  const matchOutputTarget = buildOutputTargetMatcher(root, candidateRecordOutputs);
  const rejectOutputCollision = (fileList) => {
    for (const file of fileList) {
      const hit = matchOutputTarget(file);
      if (hit) {
        throw new Error(
          `Verified input '${file}' collides with generated record output '${hit}'; write the record outside verified inputs or omit it from --file.`
        );
      }
    }
  };
  rejectOutputCollision(files);
  let verifiedFiles = {};
  if (fromScope) {
    const scopeEntries = collectPlanSquadScopeEntries(rawPlan, selectedSquadId);
    const expandedFiles = expandScopeEntriesToFiles(root, scopeEntries, selectedSquadId, verifiedDirs, resolvedReportRoot, {
      excludeFilePredicate: matchOutputTarget
    });
    const combinedFiles = [...new Set([...expandedFiles, ...files])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    verifiedFiles = fingerprint(root, combinedFiles, verifiedDirs);
  } else if (files.length > 0) {
    verifiedFiles = fingerprint(root, files, verifiedDirs);
  } else if (
    template.verifiedFiles &&
    typeof template.verifiedFiles === "object" &&
    !Array.isArray(template.verifiedFiles) &&
    Object.keys(template.verifiedFiles).length > 0
  ) {
    const templateFiles = Object.keys(template.verifiedFiles);
    rejectOutputCollision(templateFiles);
    verifiedFiles = fingerprint(root, templateFiles, verifiedDirs);
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
    ...(typeof explicitRecordPath === "string" && explicitRecordPath ? { recordPath: explicitRecordPath } : {}),
    ...(isReadOnlySquad ? { readOnly: true } : {}),
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

function buildBundleRecordsForAllSquads(root, options = {}) {
  if (!isPlainObject(options) || !isPlainObject(options.plan) || !Array.isArray(options.plan.workers)) {
    throw new Error("--all-squads requires a valid squad_planner JSON object with a workers array.");
  }
  const verifiedDirs = options.verifiedDirs ?? new Set();
  root = resolveCanonicalRoot(root, verifiedDirs);
  const rawPlan = options.plan;
  const workerSquads = rawPlan.workers.filter(w => isPlainObject(w) && typeof w.squadId === "string");
  if (workerSquads.length === 0) {
    throw new Error("--all-squads found 0 working squads in plan.workers.");
  }
  const allHandoffs = Array.isArray(options.handoffs) ? options.handoffs : undefined;
  const fullIdMap = isPlainObject(options.idMap) ? options.idMap : {};
  const provEntries = [
    ...(Array.isArray(rawPlan.provenanceScaffold?.entries) ? rawPlan.provenanceScaffold.entries : []),
    ...(Array.isArray(options.provenance?.entries) ? options.provenance.entries : [])
  ];

  // Map every specialist/lead/auditor sender key across the plan so shared handoffs.json & idMap route deterministically.
  const specialistSquadByKey = new Map();
  const nonSpecialistKeys = new Set();
  const squadIdMapKeys = new Map();
  for (const w of workerSquads) {
    const sqId = w.squadId;
    const idKeys = new Set();
    squadIdMapKeys.set(sqId, idKeys);
    for (const s of Array.isArray(w.specialists) ? w.specialists : []) {
      if (!isPlainObject(s)) continue;
      if (typeof s.workerName === "string") {
        specialistSquadByKey.set(s.workerName, sqId);
        idKeys.add(s.workerName);
        const placeholder = `<invoke_subagent:${s.workerName}:conversationId>`;
        idKeys.add(placeholder);
        if (Object.hasOwn(fullIdMap, s.workerName)) {
          specialistSquadByKey.set(String(fullIdMap[s.workerName]).trim(), sqId);
        }
        if (Object.hasOwn(fullIdMap, placeholder)) {
          specialistSquadByKey.set(String(fullIdMap[placeholder]).trim(), sqId);
        }
      }
    }
    if (isPlainObject(w.lead) && typeof w.lead.workerName === "string") {
      nonSpecialistKeys.add(w.lead.workerName);
    }
  }
  for (const p of provEntries) {
    if (!p || typeof p !== "object" || typeof p.squadId !== "string") continue;
    const idKeys = squadIdMapKeys.get(p.squadId);
    if (typeof p.workerName === "string" && idKeys) idKeys.add(p.workerName);
    if (p.slotType === "lead" || p.slotType === "audit") {
      if (typeof p.conversationId === "string") nonSpecialistKeys.add(p.conversationId.trim());
    } else if (typeof p.conversationId === "string" && p.conversationId.trim()) {
      specialistSquadByKey.set(p.conversationId.trim(), p.squadId);
    }
  }
  for (const a of Array.isArray(rawPlan.integrityAuditPlan) ? rawPlan.integrityAuditPlan : []) {
    if (a && typeof a.workerName === "string") nonSpecialistKeys.add(a.workerName);
  }

  for (const key of Object.keys(fullIdMap)) {
    const matchedAny = [...squadIdMapKeys.values()].some(set => set.has(key));
    if (!matchedAny) {
      throw new Error(`--id-map key '${key}' did not match any worker in plan.workers.`);
    }
  }

  const handoffsBySquad = new Map(workerSquads.map(w => [w.squadId, []]));
  if (allHandoffs !== undefined) {
    for (const h of allHandoffs) {
      if (!h || typeof h !== "object" || typeof h.sender !== "string" || !h.sender.trim() || typeof h.message !== "string" || !h.message.trim()) {
        throw new Error("Each handoff must include nonempty 'sender' and 'message' strings.");
      }
      const sender = h.sender.trim();
      const targetSq = specialistSquadByKey.get(sender);
      if (targetSq) {
        handoffsBySquad.get(targetSq).push({ sender, message: h.message });
      } else if (!nonSpecialistKeys.has(sender)) {
        throw new Error(`Handoff sender '${sender}' does not match any worker in plan.`);
      }
    }
  }

  const resolvedOutRels = workerSquads.map(w =>
    typeof options.resolveOutPath === "function" ? options.resolveOutPath(w.squadId) : undefined
  );

  return workerSquads.map((w, idx) => {
    const sqId = w.squadId;
    const idKeys = squadIdMapKeys.get(sqId);
    const scopedIdMap = Object.create(null);
    for (const [k, v] of Object.entries(fullIdMap)) {
      if (idKeys.has(k)) scopedIdMap[k] = v;
    }
    const outRel = resolvedOutRels[idx];
    let preReadSynthesis;
    const record = buildBundleRecordInit(root, {
      ...options,
      squadId: sqId,
      idMap: scopedIdMap,
      handoffs: allHandoffs !== undefined ? handoffsBySquad.get(sqId) : undefined,
      recordPath: outRel,
      excludedRecordOutputs: resolvedOutRels,
      verifiedDirs,
      onLeadRead: info => { preReadSynthesis = info; }
    });
    return { squadId: sqId, outRel, record, preReadSynthesis };
  });
}

function doesRecordMatchAcceptedBundle(record, bundle) {
  if (!isPlainObject(record) || !isPlainObject(bundle)) return false;
  if (bundle.squadId !== record.squadId) return false;
  if (!isDeepStrictEqual(bundle.verifiedFiles, record.verifiedFiles)) return false;
  if (!isDeepStrictEqual(bundle.assignments, record.assignments)) return false;

  if (Boolean(record.allowNonPassing) && bundle.allowNonPassing !== true) return false;
  if (Boolean(record.allowPartial) && bundle.allowPartial !== true) return false;
  if (record.retainReports === true && bundle.retainReports !== true) return false;

  if (record.verdict !== undefined) {
    if (bundle.verdict !== record.verdict) return false;
    if (bundle.verdict !== "PASS" && bundle.allowNonPassing !== true) return false;
  } else if (bundle.verdict !== "PASS") {
    if (bundle.allowNonPassing !== true || (bundle.verdict !== "FAIL" && bundle.verdict !== "BLOCKED")) {
      return false;
    }
  }

  const isAuditCohort =
    record.squadId === "integrity_auditor" ||
    (typeof record.squadId === "string" && record.squadId.startsWith("integrity_auditor-"));
  if (isAuditCohort) {
    return bundle.auditPolicy === "unaudited-explicit" && !bundle.integrityAudit && !bundle.integrityAudits;
  }

  const explicitAuditSet = new Set();
  if (typeof record.integrityReport === "string" && record.integrityReport.trim()) {
    explicitAuditSet.add(record.integrityReport);
  }
  if (Array.isArray(record.integrityAuditSlots)) {
    for (const slot of record.integrityAuditSlots) {
      if (typeof slot === "string" && slot.trim()) explicitAuditSet.add(slot);
    }
  }
  const hasExplicitRecordAudit = explicitAuditSet.size > 0;

  if (record.requireIntegrityAudit === false) {
    if (!hasExplicitRecordAudit) return bundle.auditPolicy === "unaudited-explicit";
    if (bundle.auditPolicy === "unaudited-explicit") return true;
    if (bundle.auditPolicy !== "required") return false;
    const bundleAuditPaths = Array.isArray(bundle.integrityAudits) ? bundle.integrityAudits.map(a => a?.path) : [];
    return isDeepStrictEqual(bundleAuditPaths, [...explicitAuditSet]);
  }

  if (bundle.auditPolicy === "unaudited-explicit") return true;
  if (bundle.auditPolicy !== "required") return false;
  if (hasExplicitRecordAudit) {
    const bundleAuditPaths = Array.isArray(bundle.integrityAudits) ? bundle.integrityAudits.map(a => a?.path) : [];
    return isDeepStrictEqual(bundleAuditPaths, [...explicitAuditSet]);
  }
  return true;
}

export {
  CONTROL_CHAR_RE,
  READONLY_SUBAGENT_TYPE,
  assertNoSymlinkedAncestors,
  buildBoundAuditSwarmAdd,
  buildBoundAuditSwarmAdds,
  buildBundleRecordInit,
  buildBundleRecordsForAllSquads,
  bundlePath,
  bundleReports,
  collectPlanSquadScopeEntries,
  collectReportSlots,
  computeEvidenceDigest,
  decodeUtf8,
  doesRecordMatchAcceptedBundle,
  ensureDirectory,
  expandScopeEntriesToFiles,
  extractCitationUrls,
  extractWorktreePathsFromHandoffs,
  fingerprint,
  inspectHandoffs,
  isContainedPath,
  isExpectedRealPath,
  isSameFsObject,
  isValidScopeEntry,
  messageLimit,
  normalizeContainedJsonOutPath,
  normalizeReportRoot,
  pruneReports,
  publish,
  readFile,
  readOpenedFileWithStat,
  readRegularFileSafe,
  recordSlotPath,
  relativizeContainedCliPath,
  reportPath,
  resolveCanonicalRoot,
  resolveReportRoot,
  sha256,
  shellQuote,
  stripReceiptPrefix,
  summarizeCitations,
  trimTrailingSlashes,
  verifyAndPruneBundle,
  verifyBundle,
  validateWorkerWorktreeRoot,
  workspacePath
};
