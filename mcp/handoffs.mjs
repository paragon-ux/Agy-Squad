import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseContentVerdict, parseIntegrityVerdict, parseTargetSquad, stripCode } from "./verdicts.mjs";

const messageLimit = 500;

function isValidRelativePrefix(prefix) {
  return (
    typeof prefix === "string" &&
    prefix.length > 0 &&
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
  if (typeof squadId !== "string" || !squadId.trim()) throw new Error("Provide a nonempty squad ID.");
  if (specialistNumber !== undefined && (!Number.isInteger(specialistNumber) || specialistNumber < 1)) {
    throw new Error("Specialist number must be a positive integer.");
  }
  const normalizedRoot = normalizeReportRoot(reportRoot);
  const directory = `squad-${encodeURIComponent(squadId)}`;
  if (Buffer.byteLength(directory) > 255) {
    throw new Error("Squad ID must fit in one workspace directory name.");
  }
  const slot = specialistNumber === undefined ? "lead" : `specialist-${specialistNumber}`;
  return `${normalizedRoot}/${directory}/${slot}/report.md`;
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
  return typeof firstSlot === "string" ? resolveReportRoot(firstSlot) : defaultReportRoot();
}

function reconcileHandoffs(assignments, handoffs, customReportRoot) {
  if (!Array.isArray(assignments) || !assignments.length || !Array.isArray(handoffs)) {
    throw new Error("Provide the ordered launch assignments and their handoffs.");
  }
  let allowedRoots = new Set(["scratch/agy-squad", defaultReportRoot()]);
  if (customReportRoot !== undefined) {
    const trimmed = normalizeReportRoot(customReportRoot);
    if (trimmed !== "scratch/agy-squad") {
      allowedRoots = new Set([trimmed]);
    }
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
    if (typeof message !== "string" || Buffer.byteLength(message) > messageLimit || /[\r\n\u2028\u2029]/.test(message)) {
      throw new Error("Handoff must be one line within 500 UTF-8 bytes.");
    }
    const readyPrefix = `READY ${report} — `;
    const partialPrefix = `PARTIAL ${report} — `;
    const status = message.startsWith(readyPrefix)
      ? "READY"
      : message.startsWith(partialPrefix)
        ? "PARTIAL"
        : undefined;
    const observation = status
      ? message.slice((status === "READY" ? readyPrefix : partialPrefix).length)
      : "";
    const noReport = /^NO_REPORT — \S/.test(message);
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

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

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

function workspacePath(root, relative, verifiedDirs) {
  if (
    typeof relative !== "string" ||
    !relative ||
    relative.includes("\\") ||
    path.isAbsolute(relative) ||
    relative.split("/").some(part => !part || part === "." || part === "..")
  ) {
    throw new Error(`Expected a workspace-relative file path: ${relative}`);
  }
  const file = path.join(root, relative);
  const dir = path.dirname(file);
  if (!verifiedDirs?.has(dir)) {
    if (fs.realpathSync(dir) !== dir) {
      throw new Error(`Symlinked directories are unsupported: ${relative}`);
    }
    verifiedDirs?.add(dir);
  }
  return file;
}

function readOpenedFile(file, relative) {
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

function readFile(root, relative, verifiedDirs) {
  return readOpenedFile(workspacePath(root, relative, verifiedDirs), relative);
}

function readIfPresent(root, relative, verifiedDirs) {
  try {
    return readFile(root, relative, verifiedDirs);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function fingerprint(root, files, verifiedDirs = new Set()) {
  if (!Array.isArray(files) || !files.length) {
    throw new Error("Specify the final files used for independent verification.");
  }
  const unique = [...new Set(files)];
  const hashes = new Map(unique.map(file => [file, sha256(readFile(root, file, verifiedDirs))]));
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

function publish(root, relative, contents, replace = false, verifiedDirs) {
  const destination = workspacePath(root, relative, verifiedDirs);
  if (!replace) {
    try {
      if (readOpenedFile(destination, relative).equals(contents)) return;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
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
      if (!readOpenedFile(destination, relative).equals(contents)) {
        if (!replace) throw error;
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

function readSynthesis(root, report, verifiedDirs) {
  const bytes = readEvidence(root, report, verifiedDirs);
  const markdown = decodeUtf8(bytes, report);
  let verdict;
  try {
    verdict = parseContentVerdict(markdown);
  } catch (error) {
    throw new Error(`Synthesis report must record an unambiguous PASS verdict. (${error.message})`);
  }
  if (verdict !== "PASS") {
    throw new Error("Synthesis report must record an unambiguous PASS verdict.");
  }
  return { bytes, verdict: "PASS" };
}

function readIntegrityAudit(root, report, expectedSquadId, verifiedDirs) {
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
  const targetSquad = parseTargetSquad(markdown);
  if (expectedSquadId && (!targetSquad || targetSquad !== expectedSquadId)) {
    throw new Error(
      targetSquad
        ? `Acceptance blocked: Integrity audit Target Squad '${targetSquad}' does not match '${expectedSquadId}'.`
        : `Acceptance blocked: Integrity audit report must record 'Target Squad: ${expectedSquadId}'.`
    );
  }
  return { bytes, verdict: "CLEAN", targetSquad };
}

function ensureDirectory(root, relative, created = [], verifiedDirs) {
  if (typeof relative !== "string" || relative.includes("\\")) {
    throw new Error(`Invalid workspace directory: ${relative}`);
  }
  let directory = root;
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

function inspectReports(root, record, verifiedDirs = new Set()) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid handoff inspection record.");
  }
  const { workspace, assignments, handoffs } = record;
  if (workspace !== root) throw new Error("The cohort must use the current shared workspace.");
  const resolvedRoot = resolveReportRoot(record);
  const received = reconcileHandoffs(assignments, handoffs, resolvedRoot);
  return assignments.map(({ conversationId, report }) => {
    const status = received.get(conversationId)?.status ?? "PENDING";
    const bytes = status === "READY" || status === "PARTIAL" ? readEvidence(root, report, verifiedDirs) : undefined;
    return { conversationId, report, status, bytes };
  });
}

function inspectHandoffs(root, record) {
  return inspectReports(root, record).map(({ conversationId, report, status }) => ({
    conversationId,
    report,
    status
  }));
}

function bundleReports(root, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Provide a valid bundle record.");
  }
  const {
    squadId,
    verdict,
    verifiedFiles,
    requireAdversarialReview,
    adversarialReport,
    requireIntegrityAudit,
    integrityReport,
    retainReports
  } = record;
  if (retainReports !== undefined && typeof retainReports !== "boolean") {
    throw new Error("retainReports must be a boolean.");
  }
  if (verdict !== "PASS") throw new Error("Only independently passing cohorts are eligible for bundling.");
  const verifiedDirs = new Set();
  const rootPrefix = resolveReportRoot(record);
  const assignments = inspectReports(root, record, verifiedDirs);
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
  verifyFiles(root, verifiedFiles, verifiedDirs);
  const synthesisCheck = readSynthesis(root, synthesisSlot, verifiedDirs);
  if (synthesisCheck.verdict !== verdict) {
    throw new Error("Synthesis report must record an unambiguous PASS verdict.");
  }
  const synthesis = sha256(synthesisCheck.bytes);

  let integrityAudit;
  let adversarialReview;
  const isAuditCohort =
    squadId === "adversarial_review" ||
    squadId === "integrity_auditor" ||
    squadId.startsWith("integrity_auditor-");
  if (!isAuditCohort) {
    const intScopedSlot1 = reportPath(`integrity_auditor-${squadId}`, 1, rootPrefix);
    const intScopedLead = reportPath(`integrity_auditor-${squadId}`, undefined, rootPrefix);
    const intSlot1 = reportPath("integrity_auditor", 1, rootPrefix);
    const intLeadSlot = reportPath("integrity_auditor", undefined, rootPrefix);
    const integrityCandidate = integrityReport ?? [intScopedSlot1, intScopedLead, intSlot1, intLeadSlot].find(
      slot => fs.existsSync(path.join(root, slot))
    );
    if (requireIntegrityAudit && !integrityCandidate) {
      throw new Error("Acceptance blocked: Mandatory integrity audit report missing. Run integrity_auditor before bundling.");
    }
    if (integrityCandidate) {
      const audit = readIntegrityAudit(root, integrityCandidate, squadId, verifiedDirs);
      integrityAudit = {
        path: integrityCandidate,
        sha256: sha256(audit.bytes),
        verdict: audit.verdict,
        ...(audit.targetSquad ? { targetSquad: audit.targetSquad } : {})
      };
    }

    const leadAdvSlot = reportPath("adversarial_review", undefined, rootPrefix);
    const flatAdvSlot = reportPath("adversarial_review", 1, rootPrefix);
    const advCandidate = adversarialReport ?? (
      !integrityCandidate
        ? [leadAdvSlot, flatAdvSlot].find(slot => fs.existsSync(path.join(root, slot)))
        : undefined
    );
    if (requireAdversarialReview && !advCandidate) {
      throw new Error("Acceptance blocked: Mandatory adversarial review report missing. Run adversarial review before bundling.");
    }
    if (advCandidate) {
      const advBytes = readEvidence(root, advCandidate, verifiedDirs);
      const advMarkdown = stripCode(decodeUtf8(advBytes, advCandidate));
      const hasIntegrityHeader = /^\s*(?:[-*+]\s+|#+\s+)?(?:[*_]{1,3})?\s*Integrity Verdict\s*(?:[*_]{1,3})?\s*:/im.test(advMarkdown);
      if (!integrityCandidate && !adversarialReport && !requireAdversarialReview && hasIntegrityHeader) {
        const audit = readIntegrityAudit(root, advCandidate, squadId, verifiedDirs);
        integrityAudit = {
          path: advCandidate,
          sha256: sha256(audit.bytes),
          verdict: audit.verdict,
          ...(audit.targetSquad ? { targetSquad: audit.targetSquad } : {})
        };
      } else {
        let advSynthesis;
        try {
          advSynthesis = readSynthesis(root, advCandidate, verifiedDirs);
        } catch {
          throw new Error("Acceptance blocked: Mandatory adversarial review verdict is not PASS.");
        }
        adversarialReview = { path: advCandidate, sha256: sha256(advSynthesis.bytes) };
      }
    }
  }

  const reports = assignments.map(({ report, bytes }) => {
    const markdown = decodeUtf8(bytes, report);
    return { path: report, sha256: sha256(bytes), markdown };
  });
  const bundlePayload = Buffer.from(
    JSON.stringify(
      {
        squadId,
        verdict: synthesisCheck.verdict,
        synthesis,
        verifiedFiles,
        ...(retainReports ? { retainReports: true } : {}),
        ...(integrityAudit ? { integrityAudit } : {}),
        ...(adversarialReview ? { adversarialReview } : {}),
        reports
      },
      null,
      2
    ) + "\n"
  );
  publish(root, relative, bundlePayload, true, verifiedDirs);
  return {
    path: relative,
    sha256: sha256(bundlePayload),
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
  const verdict = Object.hasOwn(parsed, "verdict") ? parsed.verdict : "PASS"; // legacy: field absent only
  if (verdict !== "PASS") {
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
  const synthesisCheck = readSynthesis(root, reportPath(squadId, undefined, rootPrefix), verifiedDirs);
  if (synthesisCheck.verdict !== verdict || sha256(synthesisCheck.bytes) !== synthesis) {
    throw new Error("Synthesis changed after bundling.");
  }
  if (parsed.retainReports !== undefined && typeof parsed.retainReports !== "boolean") {
    throw new Error("Invalid retainReports boolean in bundle.");
  }
  verifyFiles(root, verifiedFiles, verifiedDirs);
  if (parsed.integrityAudit) {
    const audit = parsed.integrityAudit;
    if (!audit || typeof audit !== "object" || typeof audit.path !== "string" || typeof audit.sha256 !== "string") {
      throw new Error("Invalid integrityAudit entry in bundle.");
    }
    if (audit.targetSquad !== undefined && audit.targetSquad !== squadId) {
      throw new Error(`Integrity audit targetSquad '${audit.targetSquad}' does not match bundle squad '${squadId}'.`);
    }
    const auditCheck = readIntegrityAudit(root, audit.path, squadId, verifiedDirs);
    if (sha256(auditCheck.bytes) !== audit.sha256) {
      throw new Error(`Integrity audit report changed: ${audit.path}`);
    }
  }
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
  const loosePresent = [];
  for (const report of reports) {
    if (typeof report.markdown !== "string" || typeof report.sha256 !== "string") {
      throw new Error(`Invalid archived report entry: ${report?.path}`);
    }
    const bytes = Buffer.from(report.markdown, "utf8");
    const loose = readIfPresent(root, report.path, verifiedDirs);
    if (!bytes.length || sha256(bytes) !== report.sha256 || (loose && !loose.equals(bytes))) {
      throw new Error(`Archived or loose report changed: ${report.path}`);
    }
    if (loose) loosePresent.push(report.path);
  }
  return {
    path: relative,
    sha256: digest,
    reports: reports.map(({ path: p, sha256: h }) => ({ path: p, sha256: h })),
    loosePresent,
    retainReports: parsed.retainReports === true
  };
}

function verifyBundle(root, relative, acceptedHash) {
  const { path: p, sha256: s, reports } = verifyBundleInternal(root, relative, acceptedHash);
  return { path: p, sha256: s, reports };
}

function pruneReports(root, relative, acceptedHash, options = {}) {
  if (!/^[0-9a-f]{64}$/.test(acceptedHash ?? "")) throw new Error("Pruning requires the primary's accepted bundle digest.");
  const { loosePresent, retainReports } = verifyBundleInternal(root, relative, acceptedHash);
  if (options.keepReports || retainReports) {
    return { removed: [], retained: loosePresent };
  }
  const removed = [];
  for (const report of loosePresent) {
    try {
      fs.unlinkSync(path.join(root, report));
      removed.push(report);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { removed };
}

const realOrSelf = p => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};

if (process.argv[1] && realOrSelf(process.argv[1]) === realOrSelf(fileURLToPath(import.meta.url))) {
  const root = fs.realpathSync(process.cwd());
  const [action, ...args] = process.argv.slice(2);
  try {
    let result;
    if (action === "fingerprint") result = fingerprint(root, args);
    else if (action === "inspect" && args.length === 1) result = inspectHandoffs(root, JSON.parse(readFile(root, args[0])));
    else if (action === "bundle" && args.length === 1) result = bundleReports(root, JSON.parse(readFile(root, args[0])));
    else if (action === "verify" && args.length === 1) result = verifyBundle(root, args[0]);
    else if (action === "prune" && (args.length === 2 || (args.length === 3 && args[2] === "--keep-reports"))) {
      result = pruneReports(root, args[0], args[1], { keepReports: args[2] === "--keep-reports" });
    } else {
      throw new Error("Usage: fingerprint <file...> | inspect <record.json> | bundle <record.json> | verify <bundle.json> | prune <bundle.json> <accepted-sha256> [--keep-reports]");
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export { bundleReports, ensureDirectory, fingerprint, inspectHandoffs, messageLimit, normalizeReportRoot, pruneReports, publish, readFile, reportPath, verifyBundle };
