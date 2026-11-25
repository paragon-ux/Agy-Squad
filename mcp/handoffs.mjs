import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  if (record.readOnlyBaseline !== undefined) {
    verifyReadOnlyBaseline(canonicalRoot, record.readOnlyBaseline, rootPrefix, {
      ignoreRelPaths: optionsRecordIgnorePaths(record)
    });
  }
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
  if (record?.readOnlyBaseline !== undefined) {
    verifyReadOnlyBaseline(canonicalRoot, record.readOnlyBaseline, resolveReportRoot(record), {
      ignoreRelPaths: optionsRecordIgnorePaths(record)
    });
  }
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
  if (allowNonPassing ? !validVerdicts.has(verdict) : verdict !== "PASS") {
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

function collectReportSlots(root, options = {}) {
  root = resolveCanonicalRoot(root);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Provide valid collect options.");
  }
  const {
    sources = [],
    handoffs,
    plan,
    record,
    squadId,
    reportRoot,
    overwrite = false,
    dryRun = false,
    allowEmpty = false,
    strict = false
  } = options;

  if (!Array.isArray(sources)) {
    throw new Error("Provide at least one worktree directory via --from <dir>.");
  }
  const inferredSources = sources.length > 0
    ? sources
    : extractWorktreePathsFromHandoffs([
        ...(Array.isArray(handoffs) ? handoffs : []),
        ...(Array.isArray(record?.handoffs) ? record.handoffs : [])
      ]);
  if (inferredSources.length === 0) {
    throw new Error("Provide at least one worktree directory via --from <dir> (or --handoffs containing wt=<dir>).");
  }
  if (typeof overwrite !== "boolean" || typeof dryRun !== "boolean" || typeof allowEmpty !== "boolean" || typeof strict !== "boolean") {
    throw new Error("Collect flags overwrite, dryRun, allowEmpty, and strict must be booleans.");
  }
  const overrideRoot = reportRoot !== undefined ? normalizeReportRoot(reportRoot) : undefined;

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
      resolvedSources.push({ raw: src, real: realSrc });
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
        const entryIsInherit = plan.executionMode === "swarm" && (entry?.slotType === "lead" || entry?.slotType === "audit");
        addSlot(entry.reportSlot, entryIsInherit, entryIsInherit);
      }
    }
    for (const audit of plan.integrityAuditPlan ?? []) {
      if (squadId !== undefined && audit?.targetSquad !== squadId) continue;
      if (audit?.reportSlot !== undefined) {
        const auditIsInherit = audit.swarmAdd?.workspace === "inherit" || plan.executionMode === "subagent";
        addSlot(audit.reportSlot, auditIsInherit, auditIsInherit);
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
      ...(w.readOnly === true || plan.readOnly === true ? { readOnly: true } : {}),
      ...(isPlainObject(w.readOnlyBaseline)
        ? { readOnlyBaseline: w.readOnlyBaseline }
        : (w.readOnly === true || plan.readOnly === true) && isPlainObject(plan.readOnlyBaseline)
          ? { readOnlyBaseline: plan.readOnlyBaseline }
          : {}),
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
const MAX_READONLY_BASELINE_FILES = 512;
const MAX_DIRTY_BASELINE_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TRACE_JSONL_BYTES = 64 * 1024 * 1024;
const SKIPPED_SCOPE_WALK_DIRS = new Set([".git", "node_modules"]);

function isScratchOrReportRelPath(relPosix, resolvedReportRoot = defaultReportRoot()) {
  if (!relPosix) return false;
  const scratchBase = defaultScratchBase();
  return (
    relPosix === "scratch" ||
    relPosix.startsWith("scratch/") ||
    relPosix === ".scratch" ||
    relPosix.startsWith(".scratch/") ||
    relPosix === scratchBase ||
    relPosix.startsWith(`${scratchBase}/`) ||
    relPosix === resolvedReportRoot ||
    relPosix.startsWith(`${resolvedReportRoot}/`)
  );
}

function hasGitMetadataAncestor(dirPath) {
  let cur = dirPath;
  while (true) {
    if (fs.existsSync(path.join(cur, ".git"))) return true;
    const parent = path.dirname(cur);
    if (parent === cur) return false;
    cur = parent;
  }
}

function captureGitPorcelainForRoot(canonicalRoot, resolvedReportRoot = defaultReportRoot(), ignoreSet = null) {
  if (!hasGitMetadataAncestor(canonicalRoot)) return undefined;
  const topRes = spawnSync(
    "git",
    ["-c", "core.quotePath=false", "-C", canonicalRoot, "rev-parse", "--show-toplevel"],
    { encoding: "utf8", timeout: 3000 }
  );
  if (topRes.status !== 0 || !topRes.stdout) return undefined;
  let gitTop;
  try {
    gitTop = fs.realpathSync.native(topRes.stdout.trim());
  } catch {
    gitTop = path.resolve(topRes.stdout.trim());
  }
  const relFromTop = path.relative(gitTop, canonicalRoot).split(path.sep).join("/");
  if (relFromTop === ".." || relFromTop.startsWith("../") || path.isAbsolute(relFromTop)) {
    return undefined;
  }
  const stRes = spawnSync(
    "git",
    ["-c", "core.quotePath=false", "-C", canonicalRoot, "status", "--porcelain=v1", "-uall", "--no-renames", "--", "."],
    { encoding: "utf8", timeout: 5000 }
  );
  if (stRes.status !== 0 || typeof stRes.stdout !== "string") return undefined;
  const prefix = relFromTop ? `${relFromTop}/` : "";
  const lines = [];
  const dirtyPaths = [];
  for (const rawLine of stRes.stdout.split(/\r?\n/)) {
    if (rawLine.length < 4) continue;
    const xy = rawLine.slice(0, 2);
    const rawRepoPath = rawLine.slice(3);
    let relPath = rawRepoPath;
    if (prefix) {
      if (!rawRepoPath.startsWith(prefix)) continue;
      relPath = rawRepoPath.slice(prefix.length);
    }
    relPath = trimTrailingSlashes(relPath);
    if (!relPath || isScratchOrReportRelPath(relPath, resolvedReportRoot)) continue;
    if (ignoreSet?.has(relPath)) continue;
    lines.push(`${xy} ${relPath}`);
    dirtyPaths.push(relPath);
  }
  lines.sort();
  return { lines, dirtyPaths };
}

function optionsRecordIgnorePaths(record, extraPaths = []) {
  const out = new Set();
  if (typeof record?.recordPath === "string" && record.recordPath.trim()) {
    out.add(record.recordPath.trim());
  }
  if (Array.isArray(record?.baselineIgnorePaths)) {
    for (const p of record.baselineIgnorePaths) {
      if (typeof p === "string" && p.trim()) out.add(p.trim());
    }
  }
  if (Array.isArray(record?.readOnlyBaseline?.baselineIgnorePaths)) {
    for (const p of record.readOnlyBaseline.baselineIgnorePaths) {
      if (typeof p === "string" && p.trim()) out.add(p.trim());
    }
  }
  for (const p of extraPaths) {
    if (typeof p === "string" && p.trim()) out.add(p.trim());
  }
  return out;
}

const READONLY_BASELINE_DIGEST_HEX_LEN = 16;

function matchesBaselineDigest(actualFullHex, expectedHex) {
  return (
    typeof expectedHex === "string" &&
    /^[0-9a-f]{16,64}$/.test(expectedHex) &&
    (expectedHex.length === 64 ? actualFullHex === expectedHex : actualFullHex.startsWith(expectedHex))
  );
}

function captureReadOnlyBaseline(root, scopeEntries, resolvedReportRoot = defaultReportRoot(), cache = null, options = {}) {
  const verifiedDirs = new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  const rawIgnore = options?.ignoreRelPaths instanceof Set
    ? [...options.ignoreRelPaths]
    : Array.isArray(options?.ignoreRelPaths)
      ? options.ignoreRelPaths
      : [];
  const ignoreList = [...new Set(rawIgnore.filter(p => typeof p === "string" && p.trim()).map(p => p.trim()))].sort();
  const ignoreSet = ignoreList.length > 0 ? new Set(ignoreList) : null;
  const shaCache = cache?.shaCache instanceof Map ? cache.shaCache : new Map();
  const hashCached = (relPosix) => {
    if (shaCache.has(relPosix)) return shaCache.get(relPosix);
    const digest = sha256(readFile(canonicalRoot, relPosix, verifiedDirs)).slice(0, READONLY_BASELINE_DIGEST_HEX_LEN);
    shaCache.set(relPosix, digest);
    return digest;
  };
  const nonWildcardEntries = (Array.isArray(scopeEntries) ? scopeEntries : []).filter(
    e => typeof e === "string" && e.trim() && e.trim() !== "."
  );
  const missingScopeEntries = [];
  const scopedDirs = [];
  const recordedSymlinks = Object.create(null);
  let expandedFiles = [];
  let filesCapped = false;
  if (nonWildcardEntries.length > 0) {
    const existingEntries = [];
    for (const entry of nonWildcardEntries) {
      const trimmed = entry.trim();
      if (isScratchOrReportRelPath(trimmed, resolvedReportRoot) || ignoreSet?.has(trimmed)) continue;
      const abs = path.join(canonicalRoot, trimmed);
      let st;
      try {
        st = fs.lstatSync(abs);
      } catch (err) {
        if (err?.code === "ENOENT" || err?.code === "ENOTDIR") {
          missingScopeEntries.push(trimmed);
          continue;
        }
        continue;
      }
      if (st.isSymbolicLink()) {
        recordedSymlinks[trimmed] = fs.readlinkSync(abs);
        continue;
      }
      if (st.isDirectory()) scopedDirs.push(trimmed);
      existingEntries.push(trimmed);
    }
    if (existingEntries.length > 0) {
      try {
        expandedFiles = expandScopeEntriesToFiles(
          canonicalRoot,
          existingEntries,
          "readonly_baseline",
          verifiedDirs,
          resolvedReportRoot,
          { maxFiles: MAX_READONLY_BASELINE_FILES, allowEmptyResult: true, symlinkPolicy: "record", recordedSymlinks }
        );
      } catch (err) {
        if (err?.code === "EMAXFILES") {
          filesCapped = true;
          expandedFiles = Array.isArray(err.partialFiles) ? err.partialFiles : [];
        } else {
          throw err;
        }
      }
    }
  }
  const filteredExpanded = ignoreSet ? expandedFiles.filter(rel => !ignoreSet.has(rel)) : expandedFiles;
  const files = Object.fromEntries(filteredExpanded.map(rel => [rel, hashCached(rel)]));
  const symlinks = Object.fromEntries(
    Object.entries(recordedSymlinks)
      .filter(([rel]) => !isScratchOrReportRelPath(rel, resolvedReportRoot) && !ignoreSet?.has(rel))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
  let gitSnapshot = cache?.gitSnapshot;
  if (gitSnapshot === undefined) {
    gitSnapshot = captureGitPorcelainForRoot(canonicalRoot, resolvedReportRoot, ignoreSet) ?? null;
    if (cache && typeof cache === "object") cache.gitSnapshot = gitSnapshot;
  }
  let dirtyFiles;
  let unhashedDirtyMeta;
  if (gitSnapshot && gitSnapshot.dirtyPaths.length > 0) {
    const dirtyMap = {};
    const metaMap = {};
    let hashedDirtyCount = 0;
    for (const rel of gitSnapshot.dirtyPaths) {
      if (Object.hasOwn(files, rel) || Object.hasOwn(symlinks, rel) || ignoreSet?.has(rel)) continue;
      const absDirty = path.join(canonicalRoot, rel);
      let st;
      try {
        st = fs.lstatSync(absDirty);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        try {
          dirtyMap[rel] = `symlink:${sha256(Buffer.from(fs.readlinkSync(absDirty), "utf8")).slice(0, READONLY_BASELINE_DIGEST_HEX_LEN)}`;
        } catch {}
        continue;
      }
      if (!st.isFile()) continue;
      if (hashedDirtyCount < MAX_READONLY_BASELINE_FILES && st.size <= MAX_DIRTY_BASELINE_FILE_BYTES) {
        try {
          if (shaCache.has(rel)) {
            dirtyMap[rel] = shaCache.get(rel);
            hashedDirtyCount += 1;
          } else {
            const opened = readIfPresentWithStat(canonicalRoot, rel, verifiedDirs);
            if (opened) {
              const digest = sha256(opened.bytes).slice(0, READONLY_BASELINE_DIGEST_HEX_LEN);
              shaCache.set(rel, digest);
              dirtyMap[rel] = digest;
              hashedDirtyCount += 1;
            }
          }
        } catch {
          metaMap[rel] = `${st.size}:${Math.trunc(st.mtimeMs)}`;
        }
      } else {
        metaMap[rel] = `${st.size}:${Math.trunc(st.mtimeMs)}`;
      }
    }
    if (Object.keys(dirtyMap).length > 0) dirtyFiles = dirtyMap;
    if (Object.keys(metaMap).length > 0) unhashedDirtyMeta = metaMap;
  }
  const nonScratchIgnore = ignoreList.filter(p => !isScratchOrReportRelPath(p, resolvedReportRoot));
  return {
    files,
    ...(Object.keys(symlinks).length > 0 ? { symlinks } : {}),
    ...(filesCapped ? { filesCapped: true } : {}),
    ...(!filesCapped && scopedDirs.length > 0 ? { scopedDirs } : {}),
    ...(!filesCapped && missingScopeEntries.length > 0 ? { missingScopeEntries } : {}),
    ...(nonScratchIgnore.length > 0 ? { baselineIgnorePaths: nonScratchIgnore } : {}),
    ...(gitSnapshot ? { gitStatusPorcelain: gitSnapshot.lines } : {}),
    ...(dirtyFiles ? { dirtyFiles } : {}),
    ...(unhashedDirtyMeta ? { unhashedDirtyMeta } : {})
  };
}

function verifyReadOnlyBaseline(root, baseline, resolvedReportRoot = defaultReportRoot(), options = {}) {
  if (!isPlainObject(baseline)) return;
  const verifiedDirs = new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  const ignoreRelPaths = new Set([
    ...(options?.ignoreRelPaths instanceof Set
      ? options.ignoreRelPaths
      : Array.isArray(options?.ignoreRelPaths)
        ? options.ignoreRelPaths
        : []),
    ...(Array.isArray(baseline.baselineIgnorePaths) ? baseline.baselineIgnorePaths : [])
  ]);
  const baselineFiles = isPlainObject(baseline.files) ? baseline.files : {};
  const baselineSymlinks = isPlainObject(baseline.symlinks) ? baseline.symlinks : {};
  for (const [relPath, expectedHash] of Object.entries(baselineFiles)) {
    let opened;
    try {
      opened = readIfPresentWithStat(canonicalRoot, relPath, verifiedDirs);
    } catch (err) {
      throw new Error(`Read-only containment violation: baseline file '${relPath}' could not be verified (${err.message}).`);
    }
    if (!opened) {
      throw new Error(`Read-only containment violation: baseline file '${relPath}' was deleted during execution.`);
    }
    const actualHash = sha256(opened.bytes);
    if (!matchesBaselineDigest(actualHash, expectedHash)) {
      throw new Error(`Read-only containment violation: baseline file '${relPath}' was modified during execution.`);
    }
  }
  for (const [relPath, expectedTarget] of Object.entries(baselineSymlinks)) {
    if (ignoreRelPaths.has(relPath)) continue;
    const absSym = path.join(canonicalRoot, relPath);
    let st;
    try {
      st = fs.lstatSync(absSym);
    } catch {
      throw new Error(`Read-only containment violation: baseline symlink '${relPath}' was deleted during execution.`);
    }
    if (!st.isSymbolicLink() || fs.readlinkSync(absSym) !== expectedTarget) {
      throw new Error(`Read-only containment violation: baseline symlink '${relPath}' was modified during execution.`);
    }
  }
  if (isPlainObject(baseline.dirtyFiles)) {
    for (const [relPath, expectedHash] of Object.entries(baseline.dirtyFiles)) {
      if (ignoreRelPaths.has(relPath)) continue;
      if (typeof expectedHash === "string" && expectedHash.startsWith("symlink:")) {
        const absSym = path.join(canonicalRoot, relPath);
        let st;
        try {
          st = fs.lstatSync(absSym);
        } catch {
          throw new Error(`Read-only containment violation: pre-existing dirty symlink '${relPath}' was deleted during execution.`);
        }
        const actualLinkHash = st.isSymbolicLink() ? sha256(Buffer.from(fs.readlinkSync(absSym), "utf8")) : "";
        if (!actualLinkHash || !matchesBaselineDigest(actualLinkHash, expectedHash.slice("symlink:".length))) {
          throw new Error(`Read-only containment violation: pre-existing dirty symlink '${relPath}' was modified during execution.`);
        }
        continue;
      }
      let opened;
      try {
        opened = readIfPresentWithStat(canonicalRoot, relPath, verifiedDirs);
      } catch (err) {
        throw new Error(`Read-only containment violation: pre-existing dirty file '${relPath}' changed (${err.message}).`);
      }
      if (!opened || !matchesBaselineDigest(sha256(opened.bytes), expectedHash)) {
        throw new Error(`Read-only containment violation: pre-existing dirty file '${relPath}' was modified or deleted during execution.`);
      }
    }
  }
  if (isPlainObject(baseline.unhashedDirtyMeta)) {
    for (const [relPath, expectedMeta] of Object.entries(baseline.unhashedDirtyMeta)) {
      if (ignoreRelPaths.has(relPath)) continue;
      let st;
      try {
        st = fs.lstatSync(path.join(canonicalRoot, relPath));
      } catch {
        throw new Error(`Read-only containment violation: pre-existing dirty file '${relPath}' was deleted during execution.`);
      }
      if (!st.isFile() || `${st.size}:${Math.trunc(st.mtimeMs)}` !== expectedMeta) {
        throw new Error(`Read-only containment violation: pre-existing dirty file '${relPath}' was modified during execution.`);
      }
    }
  }
  if (Array.isArray(baseline.missingScopeEntries)) {
    for (const relPath of baseline.missingScopeEntries) {
      if (typeof relPath !== "string" || isScratchOrReportRelPath(relPath, resolvedReportRoot) || ignoreRelPaths.has(relPath)) continue;
      let exists = false;
      try {
        fs.lstatSync(path.join(canonicalRoot, relPath));
        exists = true;
      } catch {}
      if (exists) {
        throw new Error(`Read-only containment violation: unexpected new path '${relPath}' created in read-only scope.`);
      }
    }
  }
  if (!baseline.filesCapped && Array.isArray(baseline.scopedDirs) && baseline.scopedDirs.length > 0) {
    let currentScopedFiles = [];
    const currentSymlinks = Object.create(null);
    try {
      const existingScopedDirs = baseline.scopedDirs.filter(d => typeof d === "string" && fs.existsSync(path.join(canonicalRoot, d)));
      if (existingScopedDirs.length > 0) {
        currentScopedFiles = expandScopeEntriesToFiles(
          canonicalRoot,
          existingScopedDirs,
          "readonly_verify",
          verifiedDirs,
          resolvedReportRoot,
          { maxFiles: MAX_READONLY_BASELINE_FILES, allowEmptyResult: true, symlinkPolicy: "record", recordedSymlinks: currentSymlinks }
        );
      }
    } catch (err) {
      throw new Error(`Read-only containment violation: scoped directory inspection failed (${err.message}).`);
    }
    for (const relPath of currentScopedFiles) {
      if (isScratchOrReportRelPath(relPath, resolvedReportRoot) || ignoreRelPaths.has(relPath)) continue;
      if (!Object.hasOwn(baselineFiles, relPath)) {
        throw new Error(`Read-only containment violation: new file '${relPath}' was created inside read-only scope.`);
      }
    }
    for (const relPath of Object.keys(currentSymlinks)) {
      if (isScratchOrReportRelPath(relPath, resolvedReportRoot) || ignoreRelPaths.has(relPath)) continue;
      if (!Object.hasOwn(baselineSymlinks, relPath)) {
        throw new Error(`Read-only containment violation: new symlink '${relPath}' was created inside read-only scope.`);
      }
    }
  }
  if (Array.isArray(baseline.gitStatusPorcelain)) {
    const currentGit = captureGitPorcelainForRoot(canonicalRoot, resolvedReportRoot, ignoreRelPaths);
    if (currentGit) {
      const baselineSet = new Set(baseline.gitStatusPorcelain);
      const currentSet = new Set(currentGit.lines);
      const added = currentGit.lines.filter(line => !baselineSet.has(line));
      const removed = baseline.gitStatusPorcelain.filter(line => !currentSet.has(line) && !ignoreRelPaths.has(line.slice(3)));
      if (added.length > 0 || removed.length > 0) {
        const detail = added.length > 0 ? added[0] : `reverted/staged ${removed[0]}`;
        throw new Error(`Read-only containment violation: unexpected git status change outside scratch/ ('${detail}').`);
      }
    }
  }
}

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
  const symlinkPolicy = options?.symlinkPolicy === "record" ? "record" : "throw";
  const recordedSymlinks = options?.recordedSymlinks && typeof options.recordedSymlinks === "object" ? options.recordedSymlinks : null;
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
        if (symlinkPolicy === "record") {
          if (recordedSymlinks && childRel !== resolvedReportRoot && !childRel.startsWith(reportRootPrefix)) {
            recordedSymlinks[childRel] = fs.readlinkSync(path.join(dirAbs, dirent.name));
          }
          continue;
        }
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
        expanded.add(childRel);
        if (expanded.size > maxFiles) {
          throwCapExceeded(originEntry);
        }
      } else if (symlinkPolicy !== "record") {
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
      if (symlinkPolicy === "record") {
        if (recordedSymlinks) recordedSymlinks[entry] = fs.readlinkSync(targetAbs);
        continue;
      }
      const symErr = new Error(`Refusing to follow symlink '${entry}' in --from-scope.`);
      symErr.code = "ELOOP";
      throw symErr;
    }
    if (stat.isFile()) {
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

function buildBoundAuditSwarmAdds(targetRoot, plan, record, outRel, digestResult, options = {}) {
  if (!isPlainObject(plan) || !Array.isArray(plan.integrityAuditPlan) || record?.requireIntegrityAudit === false) {
    return [];
  }
  const matching = plan.integrityAuditPlan.filter(a => a && a.targetSquad === record.squadId && isPlainObject(a.swarmAdd));
  if (matching.length === 0) return [];
  const { coordId, handoffSeqs, idMap } = options;
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
  if (isPlainObject(idMap)) {
    for (const val of Object.values(idMap)) {
      const cid = typeof val === "string" ? val.trim() : "";
      if (uuidRe.test(cid) && !seenUuids.has(cid)) {
        seenUuids.add(cid);
        mappedUuids.push(cid);
      }
    }
  }
  const bindOne = (auditEntry, idx) => {
    const auditSlot = Array.isArray(record.integrityAuditSlots) && record.integrityAuditSlots[idx]
      ? record.integrityAuditSlots[idx]
      : auditEntry.reportSlot;
    let brief = String(auditEntry.swarmAdd.brief ?? "");
    const origRecordSlot = auditEntry.recordSlot ?? recordSlotPath(record.squadId, plan.reportRoot);
    if (effectiveRecordPath) {
      brief = brief.replaceAll("<rel-record>", effectiveRecordPath);
      if (origRecordSlot && origRecordSlot !== effectiveRecordPath) {
        brief = brief.replaceAll(origRecordSlot, effectiveRecordPath);
      }
    }
    if (auditSlot) {
      brief = brief.replaceAll("<rel-slot>", auditSlot);
      if (auditEntry.reportSlot && auditEntry.reportSlot !== auditSlot) {
        brief = brief.replaceAll(auditEntry.reportSlot, auditSlot);
      }
    }
    if (digestResult?.evidenceDigest) {
      brief = brief.replace(/Evidence Digest:\s*<sha256>/g, `Evidence Digest: ${digestResult.evidenceDigest}`);
    }
    if (typeof coordId === "string" && coordId.trim()) {
      const trimmedCoord = coordId.trim();
      brief = brief.replaceAll("[--coord-id <coordId>]", `--coord-id ${trimmedCoord}`);
      brief = brief.replaceAll("<coordId>", trimmedCoord);
    }
    if (mappedUuids.length > 0) {
      brief = brief.replaceAll("u1,u2", mappedUuids.join(","));
    }
    if (Array.isArray(handoffSeqs) && handoffSeqs.length > 0) {
      brief = brief.replace(
        /Board scope:\s*read_board\{seqs:\s*\[[^\]]*\]\}\s*only\./,
        `Board scope: read_board{seqs: [${handoffSeqs.join(", ")}]} only.`
      );
    }
    return {
      ...auditEntry.swarmAdd,
      brief
    };
  };
  return matching.map(bindOne);
}

function buildBoundAuditSwarmAdd(targetRoot, plan, record, outRel, digestResult, options = {}) {
  return buildBoundAuditSwarmAdds(targetRoot, plan, record, outRel, digestResult, options)[0];
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
    ignoreRelPaths = [],
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

  const readOnlyBaseline = isPlainObject(template.readOnlyBaseline) ? template.readOnlyBaseline : undefined;
  const isReadOnlySquad = Boolean(template.readOnly === true || readOnlyBaseline);
  const planWavePaths = isPlainObject(rawPlan.waveFiles) ? Object.values(rawPlan.waveFiles) : [];
  const planPanePath =
    typeof rawPlan.swarmPanePath === "string" && !path.isAbsolute(rawPlan.swarmPanePath)
      ? rawPlan.swarmPanePath
      : undefined;
  const combinedIgnoreList = [
    ...new Set(
      [
        ...(Array.isArray(readOnlyBaseline?.baselineIgnorePaths) ? readOnlyBaseline.baselineIgnorePaths : []),
        ...(typeof rawPlan.path === "string" ? [rawPlan.path] : []),
        ...planWavePaths,
        planPanePath,
        ...(Array.isArray(ignoreRelPaths) ? ignoreRelPaths : []),
        explicitRecordPath
      ]
        .filter(p => typeof p === "string" && p.trim())
        .map(p => p.trim())
    )
  ];
  const persistedIgnorePaths = combinedIgnoreList.filter(p => !isScratchOrReportRelPath(p, resolvedReportRoot));
  if (readOnlyBaseline) {
    verifyReadOnlyBaseline(root, readOnlyBaseline, resolvedReportRoot, {
      ignoreRelPaths: new Set(combinedIgnoreList)
    });
  }

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
  if (fromScope) {
    const scopeEntries = collectPlanSquadScopeEntries(rawPlan, selectedSquadId);
    const expandedFiles = expandScopeEntriesToFiles(root, scopeEntries, selectedSquadId, verifiedDirs, resolvedReportRoot);
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
    ...(typeof explicitRecordPath === "string" && explicitRecordPath ? { recordPath: explicitRecordPath } : {}),
    ...(persistedIgnorePaths.length > 0 ? { baselineIgnorePaths: persistedIgnorePaths } : {}),
    ...(isReadOnlySquad ? { readOnly: true } : {}),
    ...(readOnlyBaseline ? { readOnlyBaseline } : {}),
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
  const sharedBatchIgnorePaths = [
    ...(Array.isArray(options.ignoreRelPaths) ? options.ignoreRelPaths : []),
    ...resolvedOutRels.filter(Boolean)
  ];

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
      ignoreRelPaths: sharedBatchIgnorePaths,
      squadId: sqId,
      idMap: scopedIdMap,
      handoffs: allHandoffs !== undefined ? handoffsBySquad.get(sqId) : undefined,
      recordPath: outRel,
      verifiedDirs,
      onLeadRead: info => { preReadSynthesis = info; }
    });
    return { squadId: sqId, outRel, record, preReadSynthesis };
  });
}

function assertNoSymlinkSegmentsBetween(baseDir, targetAbs) {
  if (!baseDir || !isContainedPath(baseDir, targetAbs, false)) return;
  const relParts = path.relative(baseDir, path.dirname(targetAbs)).split(path.sep).filter(Boolean);
  let cur = baseDir;
  for (const part of relParts) {
    if (part === "." || part === "..") {
      const err = new Error(`Unsafe trace path segment: ${targetAbs}`);
      err.code = "ELOOP";
      throw err;
    }
    cur = path.join(cur, part);
    const st = fs.lstatSync(cur);
    if (st.isSymbolicLink() || !st.isDirectory()) {
      const err = new Error(`ELOOP: symlinked directory along trace path: ${cur}`);
      err.code = "ELOOP";
      throw err;
    }
  }
}

function openSafeTraceFd(filePath, canonicalWorkspaceRoot = null, allowedBaseDir = null) {
  const resolved = path.resolve(filePath);
  if (canonicalWorkspaceRoot) assertNoSymlinkSegmentsBetween(canonicalWorkspaceRoot, resolved);
  if (allowedBaseDir) assertNoSymlinkSegmentsBetween(allowedBaseDir, resolved);
  const parentDir = path.dirname(resolved);
  const parentStat = fs.lstatSync(parentDir);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
    const err = new Error(`ELOOP: trace parent is not a regular directory: ${parentDir}`);
    err.code = "ELOOP";
    throw err;
  }
  const leafStat = fs.lstatSync(resolved);
  if (leafStat.isSymbolicLink()) {
    const err = new Error(`ELOOP: symlinked trace file is unsupported: ${resolved}`);
    err.code = "ELOOP";
    throw err;
  }
  if (!leafStat.isFile()) {
    const err = new Error(`Expected regular file for trace: ${resolved}`);
    err.code = "ENOTREG";
    throw err;
  }
  const fd = fs.openSync(resolved, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) {
      const err = new Error(`Expected regular file for trace: ${resolved}`);
      err.code = "ENOTREG";
      throw err;
    }
    if (process.platform === "linux") {
      const fdTarget = fs.readlinkSync(`/proc/self/fd/${fd}`);
      if (
        path.basename(fdTarget) !== path.basename(resolved) ||
        !isExpectedRealPath(fs.realpathSync.native(parentDir), path.dirname(fdTarget))
      ) {
        const err = new Error(`ELOOP: trace descriptor did not match path: ${resolved}`);
        err.code = "ELOOP";
        throw err;
      }
    }
    if (stat.size > MAX_TRACE_JSONL_BYTES) {
      const err = new Error(`Trace file exceeds 64 MiB cap: ${resolved}`);
      err.code = "EFBIG";
      throw err;
    }
    return { fd, stat };
  } catch (err) {
    try { fs.closeSync(fd); } catch {}
    throw err;
  }
}

function readSafeJsonlFile(filePath, canonicalWorkspaceRoot = null, allowedBaseDir = null) {
  const { fd } = openSafeTraceFd(filePath, canonicalWorkspaceRoot, allowedBaseDir);
  try {
    const chunks = [];
    const buf = Buffer.allocUnsafe(65536);
    let total = 0;
    while (true) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n <= 0) break;
      total += n;
      if (total > MAX_TRACE_JSONL_BYTES) {
        const err = new Error(`Trace file exceeds 64 MiB cap: ${filePath}`);
        err.code = "EFBIG";
        throw err;
      }
      chunks.push(Buffer.from(buf.subarray(0, n)));
    }
    return Buffer.concat(chunks, total).toString("utf8");
  } finally {
    try { fs.closeSync(fd); } catch {}
  }
}

function discoverBrainTranscriptForWorker(
  workerKey,
  coordId,
  explicitTracePath,
  brainRootOverride,
  fallbackWorkerName,
  canonicalWorkspaceRoot = null
) {
  if (typeof explicitTracePath === "string" && explicitTracePath.trim()) {
    const rawTrimmed = explicitTracePath.trim();
    const resolved = path.isAbsolute(rawTrimmed)
      ? path.resolve(rawTrimmed)
      : path.resolve(canonicalWorkspaceRoot || process.cwd(), rawTrimmed);
    try {
      fs.lstatSync(resolved);
      return { tracePath: resolved, brainBaseDir: null };
    } catch (err) {
      if (err?.code === "ENOENT" || err?.code === "ENOTDIR") return null;
      return { tracePath: resolved, brainBaseDir: null };
    }
  }
  const candidateBrainRoots = [];
  if (typeof brainRootOverride === "string" && brainRootOverride.trim()) {
    const overrideResolved = path.resolve(brainRootOverride.trim());
    try {
      if (fs.existsSync(overrideResolved)) {
        const realBr = fs.realpathSync.native(overrideResolved);
        if (fs.lstatSync(realBr).isDirectory()) candidateBrainRoots.push(realBr);
      }
    } catch {}
  } else {
    const home = os.homedir();
    const geminiDir = path.join(home, ".gemini");
    if (fs.existsSync(geminiDir)) {
      try {
        const realGemini = fs.realpathSync.native(geminiDir);
        for (const entry of fs.readdirSync(realGemini, { withFileTypes: true })) {
          if (!entry.isSymbolicLink() && entry.isDirectory() && entry.name.startsWith("antigravity")) {
            const br = path.join(realGemini, entry.name, "brain");
            if (fs.existsSync(br) && !fs.lstatSync(br).isSymbolicLink() && fs.lstatSync(br).isDirectory()) {
              candidateBrainRoots.push(br);
            }
          }
        }
      } catch {}
    }
  }
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerKey);
  const mentionTarget = !isUuidLike
    ? workerKey
    : typeof fallbackWorkerName === "string" && fallbackWorkerName.trim()
      ? fallbackWorkerName.trim()
      : null;
  const readHeadLines = (filePath, brainBaseDir) => {
    let opened;
    try {
      opened = openSafeTraceFd(filePath, canonicalWorkspaceRoot, brainBaseDir);
      const headBuf = Buffer.allocUnsafe(16384);
      const bytesRead = fs.readSync(opened.fd, headBuf, 0, headBuf.length, 0);
      const headText = headBuf.subarray(0, bytesRead).toString("utf8");
      return { firstLines: headText.split(/\r?\n/).slice(0, 4).join("\n"), mtimeMs: opened.stat.mtimeMs };
    } catch {
      return null;
    } finally {
      if (opened?.fd !== undefined) {
        try { fs.closeSync(opened.fd); } catch {}
      }
    }
  };
  for (const br of candidateBrainRoots) {
    if (isUuidLike) {
      const directSessionDir = path.join(br, workerKey);
      try {
        const stDir = fs.lstatSync(directSessionDir);
        if (!stDir.isSymbolicLink() && stDir.isDirectory()) {
          const direct = path.join(directSessionDir, ".system_generated", "logs", "transcript.jsonl");
          if (fs.existsSync(direct)) return { tracePath: direct, brainBaseDir: br };
        }
      } catch {}
      if (!mentionTarget) continue;
    }
    let sessionDirs;
    try {
      sessionDirs = fs.readdirSync(br, { withFileTypes: true });
    } catch {
      continue;
    }
    const mentionRe = new RegExp(`@${mentionTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9_-])`, "i");
    const matches = [];
    for (const dirent of sessionDirs) {
      if (dirent.isSymbolicLink() || !dirent.isDirectory()) continue;
      if (coordId && dirent.name === coordId) continue;
      const traceFile = path.join(br, dirent.name, ".system_generated", "logs", "transcript.jsonl");
      const headInfo = readHeadLines(traceFile, br);
      if (!headInfo) continue;
      let checkLines = headInfo.firstLines;
      if ((!mentionRe.test(checkLines) || (coordId && !checkLines.includes(`sender=${coordId}`))) && checkLines.includes("truncated_fields")) {
        const fullHead = readHeadLines(path.join(path.dirname(traceFile), "transcript_full.jsonl"), br);
        if (fullHead) checkLines = `${checkLines}\n${fullHead.firstLines}`;
      }
      if (!mentionRe.test(checkLines)) continue;
      if (coordId && !checkLines.includes(`sender=${coordId}`)) continue;
      matches.push({ traceFile, mtimeMs: headInfo.mtimeMs });
    }
    if (matches.length > 0) {
      matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
      return { tracePath: matches[0].traceFile, brainBaseDir: br };
    }
  }
  return null;
}

function extractCitedWorkspaceFiles(markdown, canonicalRoot, selfSlot) {
  if (typeof markdown !== "string" || !markdown) return [];
  const cleanMarkdown = stripFencedCodeBlocks(markdown);
  const cited = new Set();
  const citeRe = /(?:^|[\s`(\["'])([A-Za-z0-9_./-]+\.[A-Za-z0-9]+):[1-9]\d*\b/g;
  for (let m; (m = citeRe.exec(cleanMarkdown)); ) {
    const rawRel = m[1].replace(/^(?:\.\/)+/, "");
    if (!rawRel || rawRel === selfSlot || rawRel.startsWith("/") || rawRel.includes("..")) continue;
    const abs = path.join(canonicalRoot, rawRel);
    try {
      const st = fs.lstatSync(abs);
      if (!st.isSymbolicLink() && st.isFile()) {
        cited.add(rawRel);
      }
    } catch {}
  }
  return [...cited].sort();
}

const WRITE_TOOL_NAMES = new Set([
  "write_file",
  "edit_file",
  "multi_edit",
  "replace_file_content",
  "multi_replace_file_content",
  "create_file",
  "delete_file"
]);
const READ_TOOL_NAMES = new Set(["read_file", "view_file", "view_file_outline", "view_code_item"]);
const SEARCH_TOOL_NAMES = new Set(["grep_search", "find_by_name", "list_dir"]);
const COMMAND_TOOL_NAMES = new Set(["run_command", "execute_command", "bash"]);

function normalizeToolTargetToRel(rawTarget, canonicalRoot, allowEqual = false) {
  if (typeof rawTarget !== "string" || !rawTarget.trim()) return null;
  const trimmed = rawTarget.trim().replace(/^file:\/\//i, "");
  const resolved = path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(canonicalRoot, trimmed);
  let normalizedResolved = resolved;
  try {
    const st = fs.lstatSync(resolved);
    if (!st.isSymbolicLink()) {
      normalizedResolved = fs.realpathSync.native(resolved);
    } else {
      const parentReal = fs.realpathSync.native(path.dirname(resolved));
      normalizedResolved = path.join(parentReal, path.basename(resolved));
    }
  } catch {
    try {
      const parentReal = fs.realpathSync.native(path.dirname(resolved));
      normalizedResolved = path.join(parentReal, path.basename(resolved));
    } catch {}
  }
  if (!isContainedPath(canonicalRoot, normalizedResolved, allowEqual)) {
    return `external:${trimmed}`;
  }
  const rel = path.relative(canonicalRoot, normalizedResolved).split(path.sep).join("/");
  return rel || (allowEqual ? "." : null);
}

function recordInspectedPath(rawTarget, canonicalRoot, inspectedFiles, inspectedDirs, state) {
  const rel = normalizeToolTargetToRel(rawTarget, canonicalRoot, true);
  if (!rel || rel.startsWith("external:")) return;
  if (rel === ".") {
    state.inspectedRoot = true;
    return;
  }
  const abs = path.join(canonicalRoot, rel);
  try {
    const st = fs.lstatSync(abs);
    if (st.isDirectory()) {
      inspectedDirs.add(rel);
      return;
    }
  } catch {}
  inspectedFiles.add(rel);
}

function verifyWorkerTraces(root, record, options = {}) {
  const t0 = performance.now();
  const verifiedDirs = new Set();
  const canonicalRoot = resolveCanonicalRoot(root, verifiedDirs);
  if (!isPlainObject(record) || !Array.isArray(record.assignments)) {
    throw new Error("Provide a valid bundle record with assignments for trace verification.");
  }
  const coordId = typeof options.coordId === "string" && options.coordId.trim() ? options.coordId.trim() : undefined;
  const traceMap = isPlainObject(options.traces) ? options.traces : {};
  const isReadOnly = Boolean(record.readOnly === true || isPlainObject(record.readOnlyBaseline) || options.readOnly === true);
  const anomalies = [];
  const warnings = [];
  const workerResults = [];

  for (const assignment of record.assignments) {
    const workerKey = String(assignment?.conversationId ?? "").trim();
    const explicitWorkerName =
      typeof assignment?.workerName === "string" && assignment.workerName.trim()
        ? assignment.workerName.trim()
        : undefined;
    const reportSlot = String(assignment?.report ?? "").trim();
    const explicitTrace = traceMap[workerKey] ?? (explicitWorkerName ? traceMap[explicitWorkerName] : undefined);
    const discovered = discoverBrainTranscriptForWorker(
      workerKey,
      coordId,
      explicitTrace,
      options.brainRoot,
      explicitWorkerName,
      canonicalRoot
    );
    if (!discovered) {
      anomalies.push(`${workerKey}: MISSING_TRACE`);
      workerResults.push({
        worker: workerKey,
        ...(explicitWorkerName ? { workerName: explicitWorkerName } : {}),
        step1Ok: false,
        unauthorizedWrites: [],
        citedFilesCount: 0,
        unverifiedCitations: []
      });
      continue;
    }
    const { tracePath, brainBaseDir } = discovered;
    let rawJsonl;
    try {
      rawJsonl = readSafeJsonlFile(tracePath, canonicalRoot, brainBaseDir);
    } catch (err) {
      const errCode = err?.code || "ERR";
      const tag = errCode === "EFBIG" ? "OVERSIZED_TRACE" : errCode === "ELOOP" || errCode === "ENOTREG" ? `UNSAFE_TRACE (${errCode})` : `UNREADABLE_TRACE (${errCode})`;
      anomalies.push(`${workerKey}: ${tag}`);
      workerResults.push({
        worker: workerKey,
        ...(explicitWorkerName ? { workerName: explicitWorkerName } : {}),
        step1Ok: false,
        unauthorizedWrites: [],
        citedFilesCount: 0,
        unverifiedCitations: []
      });
      continue;
    }

    const lines = rawJsonl.split(/\r?\n/).filter(Boolean);
    const isUuidWorker = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerKey);
    const expectedMentionName = explicitWorkerName ?? (!isUuidWorker ? workerKey : undefined);
    const mentionRe = expectedMentionName
      ? new RegExp(`@${expectedMentionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9_-])`, "i")
      : null;
    let sawEarlyContent = false;
    let sawWorkerMention = !mentionRe;
    let sawCoordSender = !coordId;
    const inspectedFiles = new Set();
    const inspectedDirs = new Set();
    const inspectState = { inspectedRoot: false };
    const commandLines = [];
    const unauthorizedWrites = new Set();
    let corruptLineSeen = false;

    let fullTraceLoaded = false;
    let fullByStepIndex = null;
    let fullByLineIndex = null;
    const hydrateTruncatedStep = (compactStep, lineIdx) => {
      if (!Array.isArray(compactStep?.truncated_fields) || compactStep.truncated_fields.length === 0) {
        return compactStep;
      }
      if (!fullTraceLoaded) {
        fullTraceLoaded = true;
        const fullPath = path.join(path.dirname(tracePath), "transcript_full.jsonl");
        let fullStatExists = false;
        try {
          fs.lstatSync(fullPath);
          fullStatExists = true;
        } catch {}
        if (fullStatExists) {
          try {
            const fullLines = readSafeJsonlFile(fullPath, canonicalRoot, brainBaseDir).split(/\r?\n/).filter(Boolean);
            fullByStepIndex = new Map();
            fullByLineIndex = new Map();
            for (let fIdx = 0; fIdx < fullLines.length; fIdx++) {
              try {
                const parsedFull = JSON.parse(fullLines[fIdx]);
                fullByLineIndex.set(fIdx, parsedFull);
                if (typeof parsedFull?.step_index === "number") {
                  fullByStepIndex.set(parsedFull.step_index, parsedFull);
                }
              } catch {}
            }
          } catch (err) {
            const errCode = err?.code || "ERR";
            anomalies.push(`${workerKey}: UNSAFE_FULL_TRACE (${errCode})`);
          }
        }
      }
      if (fullByStepIndex && typeof compactStep.step_index === "number" && fullByStepIndex.has(compactStep.step_index)) {
        return fullByStepIndex.get(compactStep.step_index);
      }
      if (fullByLineIndex && fullByLineIndex.has(lineIdx)) {
        return fullByLineIndex.get(lineIdx);
      }
      return compactStep;
    };

    for (let idx = 0; idx < lines.length; idx++) {
      let step;
      try {
        step = JSON.parse(lines[idx]);
      } catch {
        if (!corruptLineSeen) {
          corruptLineSeen = true;
          anomalies.push(`${workerKey}: CORRUPT_JSONL_LINE_${idx + 1}`);
        }
        continue;
      }
      step = hydrateTruncatedStep(step, idx);
      const stepIdx = typeof step?.step_index === "number" ? step.step_index : idx;
      const content = typeof step?.content === "string" ? step.content : "";
      if (stepIdx <= 2 && content) {
        sawEarlyContent = true;
        if (mentionRe && mentionRe.test(content)) sawWorkerMention = true;
        if (coordId && content.includes(`sender=${coordId}`)) sawCoordSender = true;
      }
      const toolCalls = Array.isArray(step?.tool_calls) ? step.tool_calls : [];
      for (const tc of toolCalls) {
        const rawName = String(tc?.name ?? tc?.tool_name ?? tc?.function?.name ?? "").replace(/^default_api:/, "");
        let args = tc?.arguments ?? tc?.args ?? tc?.input ?? tc?.function?.arguments ?? {};
        if (typeof args === "string") {
          try { args = JSON.parse(args); } catch { args = {}; }
        }
        if (!isPlainObject(args)) continue;
        const targetRaw = args.Path ?? args.path ?? args.TargetFile ?? args.file_path;
        if (READ_TOOL_NAMES.has(rawName)) {
          recordInspectedPath(targetRaw, canonicalRoot, inspectedFiles, inspectedDirs, inspectState);
        } else if (SEARCH_TOOL_NAMES.has(rawName)) {
          for (const searchField of [args.SearchPath, args.SearchDirectory, args.DirectoryPath, targetRaw]) {
            if (typeof searchField === "string" && searchField.trim()) {
              recordInspectedPath(searchField, canonicalRoot, inspectedFiles, inspectedDirs, inspectState);
            }
          }
        } else if (COMMAND_TOOL_NAMES.has(rawName)) {
          const cmd = args.CommandLine ?? args.command;
          if (typeof cmd === "string" && cmd.trim()) {
            const cmdForReads = cmd.replace(/(?:^|[^0-9>&])(?:>>?|[12&]>>?)\s*(?:&\d+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+)/g, " ");
            commandLines.push(cmdForReads);
            for (const tok of cmdForReads.split(/[\s"'`();|&<>]+/)) {
              if (!tok || tok.startsWith("-")) continue;
              const cleanedTok = tok.replace(/:[1-9]\d*$/, "").replace(/\/+$/, "");
              if (cleanedTok === ".") {
                inspectState.inspectedRoot = true;
              } else if (cleanedTok.includes("/") || /\.[A-Za-z0-9]{1,8}$/.test(cleanedTok)) {
                recordInspectedPath(cleanedTok, canonicalRoot, inspectedFiles, inspectedDirs, inspectState);
              }
            }
            if (/\bgit\b[^\n;|&]*\bgrep\b/.test(cmdForReads)) {
              const afterGrep = cmdForReads.slice(cmdForReads.indexOf("grep") + 4);
              const nonFlagArgs = afterGrep
                .replace(/(?:"[^"]*"|'[^']*')/g, " pat ")
                .trim()
                .split(/\s+/)
                .filter(t => t && !t.startsWith("-"));
              if (nonFlagArgs.length <= 1) inspectState.inspectedRoot = true;
            }
            if (isReadOnly) {
              const unquoted = cmd.replace(/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, "''");
              const hasOutputRedir = /(?:^|[^0-9>&])(?:>>?|[12&]>>?)\s*(?!&\d|\/dev\/null(?:\s|$|[;|&)]))\S+/.test(unquoted);
              const hasMutatingCmd =
                /\b(?:rm|mv|cp|dd|tee|touch|truncate|mkdir|rmdir|unlink|chmod|chown|patch)\b|(?:\bsed|\bperl)\s+-i\b|\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s+|apply|am|cherry-pick|merge|rebase|restore|stash|commit)\b/.test(
                  unquoted
                );
              const hasInlineScriptWrite =
                /\b(?:node|python3?|ruby|perl)\b/.test(unquoted) &&
                /(?:\bfs\s*\.\s*(?:write|append|unlink|rm|rename|cp|mkdir|copyFile)|open\s*\([^)]*,\s*['"][wa+]|Path\([^)]*\)\.write_)/.test(
                  cmd
                );
              if (hasOutputRedir || hasMutatingCmd || hasInlineScriptWrite) {
                unauthorizedWrites.add("run_command");
              }
            }
          }
        } else if (WRITE_TOOL_NAMES.has(rawName)) {
          if (args.ArtifactMetadata && typeof targetRaw === "string" && targetRaw.includes("/brain/")) {
            continue;
          }
          const rel = normalizeToolTargetToRel(targetRaw, canonicalRoot);
          if (isReadOnly && rel !== reportSlot) {
            unauthorizedWrites.add(rel ?? String(targetRaw));
          } else if (!isReadOnly && rel && rel.startsWith("external:")) {
            unauthorizedWrites.add(rel);
          }
        }
      }
    }

    const step1Ok = sawEarlyContent && sawWorkerMention && sawCoordSender && !corruptLineSeen;
    if (!sawEarlyContent) anomalies.push(`${workerKey}: EMPTY_STEP1`);
    else {
      if (!sawWorkerMention) anomalies.push(`${workerKey}: MISSING_MENTION (@${expectedMentionName})`);
      if (!sawCoordSender) anomalies.push(`${workerKey}: COORD_SENDER_MISMATCH (expected ${coordId})`);
    }
    for (const wPath of unauthorizedWrites) {
      anomalies.push(`${workerKey}: UNAUTHORIZED_WRITE (${wPath})`);
    }

    let citedFiles = [];
    let unverifiedCitations = [];
    const isFileGrounded = (relFile) => {
      if (inspectState.inspectedRoot || inspectedFiles.has(relFile)) return true;
      for (const dirRel of inspectedDirs) {
        if (relFile === dirRel || relFile.startsWith(`${dirRel}/`)) return true;
      }
      const parentDir = path.posix.dirname(relFile);
      for (const cmd of commandLines) {
        if (cmd.includes(relFile) || (parentDir !== "." && cmd.includes(parentDir))) return true;
      }
      return false;
    };
    try {
      const opened = readIfPresentWithStat(canonicalRoot, reportSlot, verifiedDirs);
      if (opened) {
        const md = decodeUtf8(opened.bytes, reportSlot);
        citedFiles = extractCitedWorkspaceFiles(md, canonicalRoot, reportSlot);
        unverifiedCitations = citedFiles.filter(f => !isFileGrounded(f));
        for (const uFile of unverifiedCitations) {
          warnings.push(`${workerKey}: UNVERIFIED_CITATION (${uFile})`);
        }
      }
    } catch {}

    workerResults.push({
      worker: workerKey,
      ...(explicitWorkerName ? { workerName: explicitWorkerName } : {}),
      step1Ok,
      unauthorizedWrites: [...unauthorizedWrites].slice(0, 5),
      citedFilesCount: citedFiles.length,
      unverifiedCitations: unverifiedCitations.slice(0, 5)
    });
  }

  const ok = anomalies.length === 0;
  const maxAnomalies = 8;
  const cappedAnomalies = anomalies.slice(0, maxAnomalies).map(a => (a.length > 110 ? `${a.slice(0, 107)}...` : a));
  const cappedWarnings = warnings.slice(0, maxAnomalies).map(w => (w.length > 110 ? `${w.slice(0, 107)}...` : w));
  return {
    ok,
    recommendedVerdict: ok ? "CLEAN" : "INTEGRITY VIOLATION",
    squadId: record.squadId ?? "unknown",
    readOnly: isReadOnly,
    workersChecked: workerResults.length,
    anomaliesCount: anomalies.length,
    ...(warnings.length > 0 ? { warningsCount: warnings.length, warnings: cappedWarnings } : {}),
    elapsedMs: Number((performance.now() - t0).toFixed(2)),
    workers: workerResults.slice(0, 12),
    anomalies: cappedAnomalies
  };
}

export {
  CONTROL_CHAR_RE,
  buildBoundAuditSwarmAdd,
  buildBoundAuditSwarmAdds,
  buildBundleRecordInit,
  buildBundleRecordsForAllSquads,
  bundlePath,
  bundleReports,
  captureReadOnlyBaseline,
  collectPlanSquadScopeEntries,
  collectReportSlots,
  computeEvidenceDigest,
  decodeUtf8,
  ensureDirectory,
  expandScopeEntriesToFiles,
  extractCitationUrls,
  extractWorktreePathsFromHandoffs,
  fingerprint,
  inspectHandoffs,
  isContainedPath,
  isExpectedRealPath,
  isValidScopeEntry,
  messageLimit,
  normalizeContainedJsonOutPath,
  normalizeReportRoot,
  pruneReports,
  publish,
  readFile,
  readOpenedFileWithStat,
  readRegularFileSafe,
  readSafeJsonlFile,
  recordSlotPath,
  relativizeContainedCliPath,
  reportPath,
  resolveCanonicalRoot,
  resolveReportRoot,
  sha256,
  stripReceiptPrefix,
  summarizeCitations,
  trimTrailingSlashes,
  verifyAndPruneBundle,
  verifyBundle,
  verifyReadOnlyBaseline,
  verifyWorkerTraces,
  workspacePath
};
