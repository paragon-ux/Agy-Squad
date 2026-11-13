const CONTENT_VERDICTS = new Set(["PASS", "FAIL", "BLOCKED"]);
const INTEGRITY_VERDICTS = new Set(["CLEAN", "INTEGRITY VIOLATION"]);

/**
 * Strip fenced code blocks and inline code spans so quoted examples do not
 * trigger verdict parsing.
 * @param {string} markdown
 * @returns {string}
 */
function stripCode(markdown) {
  return markdown
    .replace(/(?:```[\s\S]*?```|~~~[\s\S]*?~~~)/g, "")
    .replace(/(`+)([^\r\n]*?)\1/g, " ");
}

/**
 * Parse strict single-line verdict declarations of the form
 * `<Label>: <ALLOWED_TOKEN>` (with optional Markdown emphasis).
 * Rejects hedged or compound values such as `PASS with Advisories`.
 * @param {string} markdown
 * @param {string[]} labels
 * @param {Set<string>} allowed
 * @returns {Set<string>}
 */
function parseStrictLines(markdown, labels, allowed) {
  const clean = stripCode(markdown);
  const labelPattern = labels.join("|");
  const labelRe = new RegExp(`^\\s*(?:[-*+]\\s+)?(?:[*_]{1,3})?\\s*(?:${labelPattern})\\s*(?:[*_]{1,3})?\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*(?:[-*+]\\s+)?(?:[*_]{1,3})?\\s*(?:${labelPattern})\\s*(?:[*_]{1,3})?\\s*:\\s*(?:[*_]{1,3})?\\s*(?:[*_]{1,3})?\\s*([A-Z][A-Z ]*?)\\s*(?:[*_]{1,3})?\\s*$`,
    "i"
  );
  const found = new Set();

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const match = line.match(exactRe);
    if (!match) {
      throw new Error(`Malformed or hedged verdict line: "${line.trim()}"`);
    }
    const normalized = match[1].replace(/\s+/g, " ").trim().toUpperCase();
    if (!allowed.has(normalized)) {
      throw new Error(`Unsupported verdict "${normalized}" on line: "${line.trim()}"`);
    }
    found.add(normalized);
  }
  return found;
}

/**
 * Parse a strict content verdict (`PASS`, `FAIL`, or `BLOCKED`) from a
 * synthesis or lead report.
 * @param {string} markdown
 * @returns {"PASS"|"FAIL"|"BLOCKED"}
 */
function parseContentVerdict(markdown) {
  const found = parseStrictLines(markdown, ["Content Verdict", "Verdict"], CONTENT_VERDICTS);
  const clean = stripCode(markdown);
  for (const line of clean.split(/\r?\n/)) {
    if (/\b(?:FAIL|BLOCKED)\b/.test(line)) {
      const m = line.match(/\b(FAIL|BLOCKED)\b/);
      if (m) found.add(m[1]);
    }
    if (/\b(?:not|no|never|isn't|wasn't|didn't|doesn't|cannot|can't|did not|does not)\s+PASS\b/.test(line)) {
      found.add("FAIL");
    }
  }
  if (found.size === 0) {
    throw new Error("Report must record an unambiguous single-line 'Content Verdict: PASS|FAIL|BLOCKED' (or 'Verdict: ...').");
  }
  if (found.size > 1) {
    throw new Error(`Report contains conflicting content verdicts: ${[...found].join(", ")}.`);
  }
  return [...found][0];
}

/**
 * Parse a strict integrity audit verdict (`CLEAN` or `INTEGRITY VIOLATION`)
 * from an independent integrity auditor report.
 * @param {string} markdown
 * @returns {"CLEAN"|"INTEGRITY VIOLATION"}
 */
function parseIntegrityVerdict(markdown) {
  const found = parseStrictLines(markdown, ["Integrity Verdict"], INTEGRITY_VERDICTS);
  if (found.size === 0) {
    throw new Error("Integrity audit report must record an unambiguous single-line 'Integrity Verdict: CLEAN' or 'Integrity Verdict: INTEGRITY VIOLATION'.");
  }
  if (found.size > 1) {
    throw new Error(`Integrity audit report contains conflicting verdicts: ${[...found].join(", ")}.`);
  }
  return [...found][0];
}

/**
 * Parse an optional `Target Squad: <id>` declaration from an integrity report.
 * @param {string} markdown
 * @returns {string|undefined}
 */
function parseTargetSquad(markdown) {
  const clean = stripCode(markdown);
  const re = /^\s*(?:[*_]{1,3})?\s*Target Squad\s*(?:[*_]{1,3})?\s*:\s*(?:[*_]{1,3})?\s*([A-Za-z0-9_.-]+)\s*(?:[*_]{1,3})?\s*$/i;
  for (const line of clean.split(/\r?\n/)) {
    const match = line.match(re);
    if (match) return match[1];
  }
  return undefined;
}

export {
  CONTENT_VERDICTS,
  INTEGRITY_VERDICTS,
  parseContentVerdict,
  parseIntegrityVerdict,
  parseTargetSquad,
  stripCode
};
