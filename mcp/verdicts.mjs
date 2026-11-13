const CONTENT_VERDICTS = new Set(["PASS", "FAIL", "BLOCKED"]);
const INTEGRITY_VERDICTS = new Set(["CLEAN", "INTEGRITY VIOLATION"]);

/**
 * Strip fenced code blocks line-by-line (tracking matching opening/closing
 * fence tokens) before stripping inline code spans so an inline `` ` ``` ` ``
 * cannot swallow subsequent lines.
 * @param {string} markdown
 * @returns {string}
 */
function stripCode(markdown) {
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let fenceChar = "";
  let fenceLen = 0;

  for (const line of lines) {
    if (!fenceChar) {
      const open = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (open && !(open[1][0] === "`" && line.slice(open[0].length).includes("`"))) {
        fenceChar = open[1][0];
        fenceLen = open[1].length;
        continue;
      }
      kept.push(line);
    } else {
      const closeRe = new RegExp(`^\\s{0,3}${fenceChar}{${fenceLen},}\\s*$`);
      if (closeRe.test(line)) {
        fenceChar = "";
        fenceLen = 0;
      }
    }
  }

  return kept
    .join("\n")
    .replace(/(`+)([^\r\n]*?)\1/g, " ");
}

/**
 * Parse strict single-line verdict declarations of the form
 * `<Label>: <ALLOWED_TOKEN>` (with optional list/heading prefix, Markdown
 * emphasis, and trailing period). Rejects hedged or compound values.
 * @param {string} markdown
 * @param {string[]} labels
 * @param {Set<string>} allowed
 * @returns {Set<string>}
 */
function parseStrictLines(markdown, labels, allowed) {
  const clean = stripCode(markdown);
  const labelPattern = labels.join("|");
  const prefix = "(?:[-*+]\\s+|#+\\s+)?(?:[*_]{1,3})?";
  const labelRe = new RegExp(`^\\s*${prefix}\\s*(?:${labelPattern})\\s*(?:[*_]{1,3})?\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${prefix}\\s*(?:${labelPattern})\\s*(?:[*_]{1,3})?\\s*:\\s*(?:[*_]{1,3})?\\s*(?:[*_]{1,3})?\\s*([A-Z][A-Z ]*?)\\s*\\.?\\s*(?:[*_]{1,3})?\\s*$`,
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
 * synthesis or lead report. Rejects missing, hedged, or contradicted verdicts.
 * @param {string} markdown
 * @returns {"PASS"|"FAIL"|"BLOCKED"}
 */
function parseContentVerdict(markdown) {
  const found = parseStrictLines(markdown, ["Content Verdict", "Verdict"], CONTENT_VERDICTS);
  if (found.size === 0) {
    throw new Error("Report must record an unambiguous single-line 'Content Verdict: PASS|FAIL|BLOCKED' (or 'Verdict: ...').");
  }

  const clean = stripCode(markdown);
  for (const line of clean.split(/\r?\n/)) {
    // Reject explicit negations targeting PASS (uppercase PASS, or lowercase "pass" at clause end)
    if (/\b(?:not|no|never|isn't|wasn't|didn't|doesn't|cannot|can't|did not|does not)\s+(?:PASS\b|pass(?=\s*(?:[.,;:!?]|$)))/.test(line)) {
      found.add("FAIL");
    }
    // Reject secondary labeled verdict/status/check lines or table cells asserting FAIL/BLOCKED
    const labeled = line.match(
      /(?:^|\b)(?:verdict|status|result|check|disposition|outcome)\s*(?:[*_]{1,3})?\s*(?:[:—–-]|\bis\b)\s*(?:[*_]{1,3})?\s*(PASS|FAIL|BLOCKED)(?![-\w])/i
    );
    if (labeled) {
      const token = labeled[1].toUpperCase();
      if (token !== "PASS") found.add(token);
    }
    const leading = line.match(/^\s*(?:\d+[.)]\s*|[-*+]\s*|#+\s*)?(?:[*_]{1,3})?(FAIL|BLOCKED)(?:[*_]{1,3})?\s*[:—–-]/);
    if (leading) {
      found.add(leading[1]);
    }
    const tableCell = line.match(/\|\s*(?:[*_]{1,3})?(FAIL|BLOCKED)(?:[*_]{1,3})?\s*\|/);
    if (tableCell) {
      found.add(tableCell[1]);
    }
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
 * Parse a `Target Squad: <id>` declaration from an integrity report.
 * Supports optional list/heading/Markdown emphasis; throws on malformed or
 * conflicting Target Squad declarations.
 * @param {string} markdown
 * @returns {string|undefined}
 */
function parseTargetSquad(markdown) {
  const clean = stripCode(markdown);
  const prefix = "(?:[-*+]\\s+|#+\\s+)?(?:[*_]{1,3})?";
  const labelRe = new RegExp(`^\\s*${prefix}\\s*Target Squad\\s*(?:[*_]{1,3})?\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${prefix}\\s*Target Squad\\s*(?:[*_]{1,3})?\\s*:\\s*(?:[*_]{1,3})?\\s*(?:[*_]{1,3})?\\s*([A-Za-z0-9_.-]+)\\s*\\.?\\s*(?:[*_]{1,3})?\\s*$`,
    "i"
  );
  const found = new Set();

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const match = line.match(exactRe);
    if (!match) {
      throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
    }
    found.add(match[1]);
  }
  if (found.size > 1) {
    throw new Error(`Integrity report contains conflicting Target Squad declarations: ${[...found].join(", ")}.`);
  }
  return found.size === 1 ? [...found][0] : undefined;
}

export {
  CONTENT_VERDICTS,
  INTEGRITY_VERDICTS,
  parseContentVerdict,
  parseIntegrityVerdict,
  parseTargetSquad,
  stripCode
};
