const CONTENT_VERDICTS = new Set(["PASS", "FAIL", "BLOCKED"]);
const INTEGRITY_VERDICTS = new Set(["CLEAN", "INTEGRITY VIOLATION"]);
const SQUAD_ID_RE = /^[A-Za-z0-9_.-]+$/;
const RESERVED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function validateSquadId(squadId) {
  if (typeof squadId !== "string" || !squadId) {
    throw new Error("Squad ID must be a nonempty string.");
  }
  if (RESERVED_OBJECT_KEYS.has(squadId) || squadId === "." || squadId === "..") {
    throw new Error(`Invalid reserved squad ID '${squadId}'.`);
  }
  if (!SQUAD_ID_RE.test(squadId)) {
    throw new Error(`Invalid squad ID '${squadId}': use only [A-Za-z0-9_.-]+.`);
  }
  return squadId;
}

const HISTORICAL_CONTEXT_RE =
  /\b(?:prior|previous|baseline|before|wave\s*\d+|pr\s*#?\d+|historical|old|initial|original|earlier)\b/i;
const CURRENT_CONTEXT_RE = /\b(?:current|now|final|post|after)\b/i;
const LABELED_VERDICT_PREFIX_RE =
  /^\s*(?:(?:\d+[.)]|[-*+])\s+|#+\s+)?(?:[*_]{1,3})?(?:[A-Za-z0-9_-]+\s+){0,2}(?:verdict|status|result|check|disposition|outcome)\s*(?:[*_]{1,3})?\s*[:—–-]\s*(?:[*_]{1,3})?\s*/i;
const STRICT_UPPERCASE_VERDICT_RE = /^(PASS|FAIL|BLOCKED)(?![-\w/])/;

function matchLabeledVerdict(line) {
  const prefixMatch = LABELED_VERDICT_PREFIX_RE.exec(line);
  if (!prefixMatch) return null;
  return STRICT_UPPERCASE_VERDICT_RE.exec(line.slice(prefixMatch[0].length));
}

function isHistoricalTableHeader(header) {
  return HISTORICAL_CONTEXT_RE.test(header) && !CURRENT_CONTEXT_RE.test(header);
}

/**
 * Strip fenced code blocks line-by-line (tracking matching opening/closing
 * fence tokens), 4-space/tab indented Markdown code blocks, and inline code
 * spans so code examples cannot inject or swallow verdict lines.
 * @param {string} markdown
 * @returns {string}
 */
function stripCode(markdown) {
  const normalized = markdown.startsWith("\uFEFF") ? markdown.slice(1) : markdown;
  const lines = normalized.split(/\r?\n/);
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
      if (/^(?: {4}|\t)/.test(line)) {
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

const CATEGORY_VERDICT_RE = /^(?:changes required|no findings within reviewed scope|incomplete|not applicable)\b/i;

function isCategoryVerdictLine(line) {
  const bareVerdictPrefix = /^\s*(?:(?:\d+[.)]|[-*+])(?:\s+|$)|#+\s+)?(?:[*_]{1,3})?\s*Verdict\s*(?:[*_]{1,3})?\s*:(.*)$/i;
  const match = bareVerdictPrefix.exec(line);
  if (!match) return false;
  const rawVal = match[1].replace(/[*_]{1,3}/g, "").trim();
  if (!CATEGORY_VERDICT_RE.test(rawVal)) return false;
  return !/\b(?:PASS|FAIL|BLOCKED)\b/.test(rawVal);
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
  const prefix = "(?:(?:\\d+[.)]|[-*+])\\s+|#+\\s+)?(?:[*_]{1,3})?";
  const labelRe = new RegExp(`^\\s*${prefix}\\s*(?:${labelPattern})\\s*(?:[*_]{1,3})?\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${prefix}\\s*(?:${labelPattern})\\s*(?:[*_]{1,3})?\\s*:\\s*(?:[*_]{1,3})?\\s*(?:[*_]{1,3})?\\s*([A-Z][A-Z ]*?)\\s*\\.?\\s*(?:[*_]{1,3})?\\s*$`,
    "i"
  );
  const found = new Set();
  const allowCategoryBypass = labels.includes("Verdict");

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    if (allowCategoryBypass && isCategoryVerdictLine(line)) continue;
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
 * Returns true if markdown outside fenced/inline code attempts to declare or reference
 * a content verdict (matching prefix/emphasis syntax supported by `parseContentVerdict`).
 * @param {string} markdown
 * @returns {boolean}
 */
function hasContentVerdictAttempt(markdown) {
  const clean = stripCode(markdown);
  const prefix = "(?:(?:\\d+[.)]|[-*+])\\s+|#+\\s+)?(?:[*_]{1,3})?";
  const verdictLabelRe = new RegExp(`^\\s*${prefix}\\s*(?:(?:Content|Overall)\\s+)?Verdict\\s*(?:[*_]{1,3})?\\s*:`, "i");
  for (const line of clean.split(/\r?\n/)) {
    if (isCategoryVerdictLine(line)) continue;
    if (verdictLabelRe.test(line)) return true;
    if (/^\s*(?:\d+[.)]\s*|[-*+]\s*|#+\s*)?(?:[*_]{1,3})?(?:PASS|FAIL|BLOCKED)\b/.test(line)) return true;
    if (matchLabeledVerdict(line) && !HISTORICAL_CONTEXT_RE.test(line)) return true;
  }
  return false;
}

/**
 * Parse a strict content verdict (`PASS`, `FAIL`, or `BLOCKED`) from a
 * synthesis or lead report. Rejects missing, hedged, or contradicted verdicts.
 * @param {string} markdown
 * @returns {"PASS"|"FAIL"|"BLOCKED"}
 */
function parseContentVerdict(markdown) {
  const found = parseStrictLines(markdown, ["Content Verdict", "Overall Verdict", "Verdict"], CONTENT_VERDICTS);
  if (found.size === 0) {
    throw new Error("Report must record an unambiguous single-line 'Content Verdict: PASS|FAIL|BLOCKED' (or 'Verdict: ...').");
  }

  const clean = stripCode(markdown);
  let inTable = false;
  let headerVerdictCol = [];
  for (const line of clean.split(/\r?\n/)) {
    if (isCategoryVerdictLine(line)) {
      inTable = false;
      headerVerdictCol = [];
      continue;
    }
    // Reject explicit negations targeting PASS when report claims PASS (excluding historical prose)
    const negMatch = line.match(
      /\b(not|no|never|isn't|wasn't|didn't|doesn't|cannot|can't|did\s+not|does\s+not)\s+(pass)\b(?:\s*([.,;:!?]|$))?/i
    );
    if (found.has("PASS") && negMatch && (negMatch[2] === "PASS" || negMatch[3] !== undefined) && !HISTORICAL_CONTEXT_RE.test(line)) {
      found.add("FAIL");
    }
    // Reject secondary labeled verdict/status/check lines asserting conflicting verdicts (excluding historical/compound tokens)
    const labeled = matchLabeledVerdict(line);
    if (labeled && !HISTORICAL_CONTEXT_RE.test(line)) {
      found.add(labeled[1]);
    }
    const leading = line.match(/^\s*(?:\d+[.)]\s*|[-*+]\s*|#+\s*)?(?:[*_]{1,3})?(PASS|FAIL|BLOCKED)(?:[*_]{1,3})?\s*[:—–-]/);
    if (leading) {
      found.add(leading[1]);
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.slice(1, -1).split(/(?<!\\)\|/).map(c => c.trim());
      if (cells.every(c => /^:?-{2,}:?$/.test(c))) {
        inTable = true;
      } else {
        const isFirstRow = !inTable;
        if (isFirstRow) {
          inTable = true;
          headerVerdictCol = cells.map(h =>
            /\b(?:content\s+verdict|overall(?:\s+verdict)?|verdict)\b/i.test(h) &&
            !isHistoricalTableHeader(h)
          );
        }
        cells.forEach((cell, colIdx) => {
          if (!isFirstRow && !headerVerdictCol[colIdx]) return;
          const m = cell.match(/^(?:[*_]{1,3})?(PASS|FAIL|BLOCKED)(?:[*_]{1,3})?$/);
          if (m) found.add(m[1]);
        });
      }
    } else {
      inTable = false;
      headerVerdictCol = [];
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
 * Supports optional unordered/ordered list, heading, and Markdown emphasis;
 * throws on malformed, reserved, or conflicting Target Squad declarations.
 * @param {string} markdown
 * @returns {string|undefined}
 */
function parseTargetSquad(markdown) {
  const clean = stripCode(markdown);
  const prefix = "(?:(?:\\d+[.)]|[-*+])\\s+|#+\\s+)?(?:[*_]{1,3})?";
  const labelRe = new RegExp(`^\\s*${prefix}\\s*Target Squad\\s*(?:[*_]{1,3})?\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${prefix}\\s*Target Squad\\s*(?:[*_]{1,3})?\\s*:\\s*(?:[*_]{1,3})?\\s*(?:[*_]{1,3})?\\s*([A-Za-z0-9_.-]+?)\\s*\\.?\\s*(?:[*_]{1,3})?\\s*$`,
    "i"
  );
  const found = new Set();

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const match = line.match(exactRe);
    if (!match) {
      throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
    }
    found.add(validateSquadId(match[1]));
  }
  if (found.size > 1) {
    throw new Error(`Integrity report contains conflicting Target Squad declarations: ${[...found].join(", ")}.`);
  }
  return found.size === 1 ? [...found][0] : undefined;
}

/**
 * Parse a strict `Evidence Digest: <64-hex>` declaration from an integrity report.
 * @param {string} markdown
 * @returns {string|undefined}
 */
function parseEvidenceDigest(markdown) {
  const clean = stripCode(markdown);
  const prefix = "(?:(?:\\d+[.)]|[-*+])\\s+|#+\\s+)?(?:[*_]{1,3})?";
  const labelRe = new RegExp(`^\\s*${prefix}\\s*Evidence Digest\\s*(?:[*_]{1,3})?\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${prefix}\\s*Evidence Digest\\s*(?:[*_]{1,3})?\\s*:\\s*(?:[*_]{1,3})?\\s*(?:[*_]{1,3})?\\s*([0-9a-f]{64})\\s*\\.?\\s*(?:[*_]{1,3})?\\s*$`,
    "i"
  );
  const found = new Set();

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const match = line.match(exactRe);
    if (!match) {
      throw new Error(`Malformed Evidence Digest line: "${line.trim()}"`);
    }
    found.add(match[1].toLowerCase());
  }
  if (found.size > 1) {
    throw new Error(`Integrity report contains conflicting Evidence Digest declarations: ${[...found].join(", ")}.`);
  }
  return found.size === 1 ? [...found][0] : undefined;
}

export {
  CONTENT_VERDICTS,
  INTEGRITY_VERDICTS,
  RESERVED_OBJECT_KEYS,
  SQUAD_ID_RE,
  hasContentVerdictAttempt,
  parseContentVerdict,
  parseEvidenceDigest,
  parseIntegrityVerdict,
  parseTargetSquad,
  stripCode,
  validateSquadId
};
