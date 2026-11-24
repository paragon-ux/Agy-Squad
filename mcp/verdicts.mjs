const CONTENT_VERDICTS = new Set(["PASS", "FAIL", "BLOCKED"]);
const INTEGRITY_VERDICTS = new Set(["CLEAN", "INTEGRITY VIOLATION"]);
const SQUAD_ID_RE = /^[A-Za-z0-9_.-]*[A-Za-z0-9_-]$/;
const RESERVED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_RESERVED_KEY_LEN = Math.max(...[...RESERVED_OBJECT_KEYS].map(k => k.length));

function validateSquadId(squadId) {
  if (typeof squadId !== "string" || !squadId) {
    throw new Error("Squad ID must be a nonempty string.");
  }
  if (RESERVED_OBJECT_KEYS.has(squadId) || squadId === "." || squadId === "..") {
    throw new Error(`Invalid reserved squad ID '${squadId}'.`);
  }
  if (!SQUAD_ID_RE.test(squadId)) {
    throw new Error(`Invalid squad ID '${squadId}': use only [A-Za-z0-9_.-]+ without a trailing period.`);
  }
  return squadId;
}

const LINE_ITEM_PREFIX = "(?:(?:\\d+[.)]|[-*+])\\s+|#+\\s+)?(?:[*_]+\\s*)?";
const POST_LABEL_EMPH = "(?:\\s*[*_]+)?";
const POST_COLON_EMPH = "(?:[*_]+\\s+)?[*_]*";
const TRAILING_DOT_AND_EMPH = "(?:\\s*(?:\\.(?:\\s*[*_]+)?|[*_]+(?:\\s*\\.)?))?";

const HISTORICAL_CONTEXT_RE =
  /\b(?:prior|previous|baseline|historical|old|initial|original|earlier)\b|^before$|\bbefore\s+(?:the\s+|this\s+|our\s+)?(?:fix(?:es)?|patch(?:es)?|remediation|change(?:s)?|update(?:s)?|refactor(?:ing)?|migration|edit(?:s)?|commit)\b/i;
const CURRENT_CONTEXT_RE = /\b(?:current|now|final|post|after)\b/i;
const LEADING_HISTORICAL_RE =
  /^\s*(?:(?:on|in|from|during)\s+)?(?:(?:the|a|an|this|our)\s+)?(?:(?:prior|previous|baseline|historical|old|initial|original|earlier)\b|before\s+(?:the\s+|this\s+|our\s+)?(?:fix(?:es)?|patch(?:es)?|remediation|change(?:s)?|update(?:s)?|refactor(?:ing)?|migration|edit(?:s)?|commit)\b)/i;
const PRESERVED_VERDICT_TOKENS = new Set(["PASS", "FAIL", "BLOCKED", "CLEAN", "INTEGRITY VIOLATION"]);
const LABELED_VERDICT_PREFIX_RE =
  /^\s*(?:(?:\d+[.)]|[-*+])\s+|#+\s+)?(?:[*_]*#?[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?[*_]*\s+){0,3}[*_]*(?:verdict|status|result|check|disposition|outcome)(?:\s*[*_]+)?(?:\s*[:—–]|\s+-(?=\s|$))\s*(?:[*_]+\s+)?[*_]*/i;
const STRICT_UPPERCASE_VERDICT_RE = /^(PASS|FAIL|BLOCKED)(?![*_]*[-A-Za-z0-9/])/;
const STRICT_UPPERCASE_INTEGRITY_VERDICT_RE = /^(CLEAN|INTEGRITY VIOLATION)(?![*_]*[-A-Za-z0-9/])/;
const VERDICT_NEGATION_RE =
  /\b(not|no|never|isn't|wasn't|aren't|weren't|didn't|doesn't|don't|won't|cannot|can't|did\s+not|does\s+not|do\s+not|will\s+not)\s+(pass)\b/gi;
const VERDICT_SUBJECT_NOUN_RE =
  /\b(?:verdict|check|checks|test|tests|suite|suites|gate|gates|build|lint|audit|verification|smoke|ci|run|pipeline|preflight)\b/i;
const VERDICT_LABEL_SUBJECT_RE =
  /\b(?:verdict|result|outcome|status|disposition|check|checks|test|tests|suite|suites|gate|gates|build|lint|audit|verification|smoke|ci|run|pipeline|preflight)\b/i;
const BARE_POST_COLON_RE = /^\s*[*_]{0,3}(?:(?:it|they|this|that|still|also|really)\s+){0,2}[*_]{0,3}$/i;
const NEGATIVE_EXPECTATION_RE =
  /\b(?:should|must|expected\s+(?:to|result|outcome|failure(?:s)?|behaviou?r|denial|rejection|error)|verified\s+that|ensure|confirm|assert|negative|invalid|malformed|bad|corrupt|untrusted|unauthorized|rejected)\b|^\s*[*_]{0,3}expected[*_]{0,3}\s*$/i;
const CLAUSE_BREAK_RE =
  /(?:[.;!?][*_]{0,3}(?=\s|$)|(?<colon>:)[*_]{0,3}(?=\s|$)|,\s*(?:and|but|however|yet|while)\b)\s*/gi;
const TAIL_ADJUNCT_WORD_RE =
  /^(?:on|in|at|under|during|for|with|without|due\s+to|because|after|before|when|while|yet|still|here|locally|today)\b/i;
const INTEGRITY_NEGATION_RE =
  /\b(?:not|never|isn't|wasn't|cannot\s+be|can't\s+be)\s+(CLEAN)\b/gi;

function createClauseTracker(line) {
  let scanFrom = 0;
  let hasHistorical = false;
  let hasCurrent = false;
  let hasSubject = false;
  let hasColonSubjectLabel = false;
  let hasNegExpectation = false;
  let hasPriorNegation = false;
  let hasPriorClauseBreak = false;

  const updateFlags = text => {
    if (!text) return;
    if (HISTORICAL_CONTEXT_RE.test(text)) hasHistorical = true;
    if (CURRENT_CONTEXT_RE.test(text)) hasCurrent = true;
    if (VERDICT_SUBJECT_NOUN_RE.test(text)) hasSubject = true;
    if (NEGATIVE_EXPECTATION_RE.test(text)) hasNegExpectation = true;
  };

  const advanceTo = toIndex => {
    const seg = line.slice(scanFrom, toIndex);
    let pos = 0;
    CLAUSE_BREAK_RE.lastIndex = 0;
    for (let m; (m = CLAUSE_BREAK_RE.exec(seg)); ) {
      const chunk = seg.slice(pos, m.index);
      if (scanFrom === 0 && pos === 0 && m[0].startsWith(".") && /^\s*\d+$/.test(chunk)) {
        continue;
      }
      updateFlags(chunk);
      hasPriorClauseBreak = true;
      if (m.groups?.colon) {
        const labelHasSubject = VERDICT_LABEL_SUBJECT_RE.test(chunk);
        // Preserve historical/negative-expectation qualifiers across introducer colons when no current context appeared.
        if (hasCurrent) {
          hasHistorical = false;
          if (!NEGATIVE_EXPECTATION_RE.test(chunk)) {
            hasNegExpectation = false;
          }
          hasCurrent = false;
        }
        hasSubject = false;
        hasColonSubjectLabel = labelHasSubject;
      } else {
        hasHistorical = false;
        hasCurrent = false;
        hasSubject = false;
        hasColonSubjectLabel = false;
        hasNegExpectation = false;
      }
      pos = m.index + m[0].length;
    }
    const delta = seg.slice(pos);
    updateFlags(delta);
    const effectiveSubject = hasSubject || (hasColonSubjectLabel && BARE_POST_COLON_RE.test(delta));
    const isLineInitial =
      !hasPriorNegation &&
      !hasPriorClauseBreak &&
      /^\s*(?:(?:\d+[.)]|[-*+])\s+|#+\s+)?[*_]*$/.test(delta);
    return {
      isHistorical: hasHistorical && !hasCurrent,
      hasVerdictSubject: effectiveSubject && !hasNegExpectation,
      isLineInitial
    };
  };

  const markConsumed = matchEnd => {
    scanFrom = matchEnd;
    hasPriorNegation = true;
    hasColonSubjectLabel = false;
  };

  return { advanceTo, markConsumed };
}

function classifyNegationTail(line, matchEnd) {
  let i = matchEnd;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
  if (i === line.length || ".,;:!?)]".includes(line[i])) {
    return { isClauseEnd: true, isAdjunctTail: false };
  }
  const isAdjunctTail = i > matchEnd && TAIL_ADJUNCT_WORD_RE.test(line.slice(i, i + 24));
  return { isClauseEnd: false, isAdjunctTail };
}

function isHistoricalLeadingDesc(desc) {
  const cleaned = desc.replace(/^[*_\s]+/, "");
  const firstClause = cleaned.split(/[.;!?]/)[0];
  return LEADING_HISTORICAL_RE.test(firstClause) && !CURRENT_CONTEXT_RE.test(cleaned);
}

function unwrapOuterCodeSpan(text) {
  const trimmed = text.replace(/[*_]+/g, "").trim();
  const m = /^`([^`]+)`$/.exec(trimmed);
  return m ? m[1].trim() : stripInlineCodeLine(text).replace(/[*_]+/g, "").trim();
}

function matchLabeledVerdict(line) {
  const prefixMatch = LABELED_VERDICT_PREFIX_RE.exec(line);
  if (!prefixMatch) return null;
  const verdictMatch = STRICT_UPPERCASE_VERDICT_RE.exec(line.slice(prefixMatch[0].length));
  return verdictMatch ? { verdict: verdictMatch[1], prefix: prefixMatch[0] } : null;
}

function matchLabeledIntegrityVerdict(line) {
  const prefixMatch = LABELED_VERDICT_PREFIX_RE.exec(line);
  if (!prefixMatch) return null;
  const verdictMatch = STRICT_UPPERCASE_INTEGRITY_VERDICT_RE.exec(line.slice(prefixMatch[0].length));
  return verdictMatch ? { verdict: verdictMatch[1], prefix: prefixMatch[0] } : null;
}

const CONTENT_CELL_VERDICT_RE = /^[*_]*(?:`[*_]*(PASS|FAIL|BLOCKED)\.?[*_]*`|(PASS|FAIL|BLOCKED))\.?[*_]*\.?$/;
const INTEGRITY_CELL_VERDICT_RE =
  /^[*_]*(?:`[*_]*(CLEAN|INTEGRITY VIOLATION)\.?[*_]*`|(CLEAN|INTEGRITY VIOLATION))\.?[*_]*\.?$/;

function matchTwoColumnContentVerdict(cells) {
  if (cells.length !== 2) return null;
  const keyText = unwrapOuterCodeSpan(cells[0]);
  const isVerdictKey =
    /^(?:(?:content|overall|final)\s+)?(?:verdict|gate)$/i.test(keyText) ||
    (/\b(?:content\s+verdict|overall\s+verdict|final\s+verdict|verdict)\b/i.test(keyText) &&
      !/\b(?:category|integrity)\b/i.test(keyText) &&
      !isHistoricalLine(keyText));
  if (!isVerdictKey) return null;
  const m = cells[1].match(CONTENT_CELL_VERDICT_RE);
  return m ? (m[1] || m[2]) : null;
}

function matchTwoColumnIntegrityVerdict(cells) {
  if (cells.length !== 2) return null;
  const keyText = unwrapOuterCodeSpan(cells[0]);
  const isIntegrityKey =
    /^(?:(?:integrity|audit|overall|final)\s+)?(?:verdict|status|result|outcome)$/i.test(keyText) ||
    (/\b(?:integrity\s+verdict|audit\s+(?:verdict|status)|verdict)\b/i.test(keyText) &&
      !/\b(?:category|content)\b/i.test(keyText) &&
      !isHistoricalLine(keyText));
  if (!isIntegrityKey) return null;
  const m = cells[1].match(INTEGRITY_CELL_VERDICT_RE);
  return m ? (m[1] || m[2]) : null;
}

const CONTENT_TABLE_CONFIG = {
  isVerdictHeader: h =>
    /\b(?:content\s+verdict|overall(?:\s+verdict)?|verdict)\b/i.test(h) &&
    !/\b(?:category|integrity)\b/i.test(h),
  cellVerdictRe: CONTENT_CELL_VERDICT_RE,
  matchTwoColumn: matchTwoColumnContentVerdict
};

const INTEGRITY_TABLE_CONFIG = {
  isVerdictHeader: h =>
    /\b(?:integrity\s+verdict|audit\s+(?:verdict|status)|verdict)\b/i.test(h) &&
    !/\b(?:category|content)\b/i.test(h),
  cellVerdictRe: INTEGRITY_CELL_VERDICT_RE,
  matchTwoColumn: matchTwoColumnIntegrityVerdict
};

function createTableVerdictScanner(config) {
  let inTable = false;
  let headerVerdictCol = [];
  let headerHistoricalCol = [];
  const reset = () => {
    inTable = false;
    headerVerdictCol = [];
    headerHistoricalCol = [];
  };
  const scanLine = line => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
      reset();
      return [];
    }
    const cells = trimmed.slice(1, -1).split(/(?<!\\)\|/).map(c => c.trim());
    if (cells.every(c => /^:?-{2,}:?$/.test(c))) {
      inTable = true;
      return [];
    }
    const isFirstRow = !inTable;
    if (isFirstRow) {
      inTable = true;
      headerHistoricalCol = cells.map(c => isHistoricalLine(unwrapOuterCodeSpan(c)));
      headerVerdictCol = cells.map(h => {
        const cleanHeader = unwrapOuterCodeSpan(h);
        return config.isVerdictHeader(cleanHeader) && !isHistoricalLine(cleanHeader);
      });
    }
    const matches = [];
    if (!isFirstRow) {
      for (let colIdx = 0; colIdx < cells.length; colIdx++) {
        if (!headerVerdictCol[colIdx]) continue;
        const m = cells[colIdx].match(config.cellVerdictRe);
        if (m) matches.push(m[1] || m[2]);
      }
    }
    const kv = !headerHistoricalCol[1] ? config.matchTwoColumn(cells) : null;
    if (kv) matches.push(kv);
    return matches;
  };
  return { reset, scanLine };
}

function unwrapBalancedEmphasis(value) {
  const trimmed = value.trim();
  let left = 0;
  let right = trimmed.length;
  while (right - left > 2) {
    const first = trimmed[left];
    if (first !== "*" && first !== "_") break;
    let lead = 0;
    while (left + lead < right && trimmed[left + lead] === first) lead++;
    if (lead * 2 >= right - left) break;
    let trail = 0;
    while (trail < lead && trimmed[right - 1 - trail] === first) trail++;
    if (trail !== lead || trimmed[right - 1 - trail] === first) break;
    if (first === "_" && lead >= 2) {
      const innerStart = left + lead - 2;
      const innerEnd = right - trail + 2;
      if (innerEnd - innerStart <= MAX_RESERVED_KEY_LEN && RESERVED_OBJECT_KEYS.has(trimmed.slice(innerStart, innerEnd))) {
        left = innerStart;
        right = innerEnd;
        break;
      }
    }
    left += lead;
    right -= trail;
  }
  return trimmed.slice(left, right);
}

function isHistoricalLine(line) {
  return HISTORICAL_CONTEXT_RE.test(line) && !CURRENT_CONTEXT_RE.test(line);
}

function trimAsciiSpaceTabEnd(line) {
  let end = line.length;
  while (end > 0 && (line[end - 1] === " " || line[end - 1] === "\t")) end--;
  return line.slice(0, end);
}

function isClosingFence(line, fenceChar, fenceLen) {
  const trimmedEnd = trimAsciiSpaceTabEnd(line);
  let i = 0;
  while (i < trimmedEnd.length && trimmedEnd[i] === " ") i++;
  if (i > 3 || trimmedEnd.length - i < fenceLen) return false;
  for (; i < trimmedEnd.length; i++) {
    if (trimmedEnd[i] !== fenceChar) return false;
  }
  return true;
}

/**
 * Strip fenced code blocks line-by-line (tracking matching opening/closing
 * fence tokens), optionally also stripping 4-space/tab indented Markdown code blocks.
 * @param {string} markdown
 * @param {{ stripIndented?: boolean }} [options]
 * @returns {string}
 */
function stripFencedCodeBlocks(markdown, { stripIndented = false } = {}) {
  const normalized = markdown.startsWith("\uFEFF") ? markdown.slice(1) : markdown;
  const lines = normalized.split(/\r?\n/);
  const kept = [];
  let fenceChar = "";
  let fenceLen = 0;

  for (const line of lines) {
    if (!fenceChar) {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (open && !(open[1][0] === "`" && line.slice(open[0].length).includes("`"))) {
        fenceChar = open[1][0];
        fenceLen = open[1].length;
        continue;
      }
      if (stripIndented && /^(?: {4}| {0,3}\t)/.test(line)) {
        continue;
      }
      kept.push(line);
    } else if (isClosingFence(line, fenceChar, fenceLen)) {
      fenceChar = "";
      fenceLen = 0;
    }
  }

  return kept.join("\n");
}

function stripInlineCodeLine(line, preserveVerdictTokens = false) {
  if (!line.includes("`")) return line;
  const runs = [];
  const byLen = new Map();
  let i = 0;
  while (i < line.length) {
    if (line.charCodeAt(i) !== 96) {
      i++;
      continue;
    }
    const start = i;
    while (i < line.length && line.charCodeAt(i) === 96) i++;
    const len = i - start;
    const runIdx = runs.length;
    runs.push({ start, end: i, len });
    let list = byLen.get(len);
    if (!list) {
      list = [];
      byLen.set(len, list);
    }
    list.push(runIdx);
  }
  const cursor = new Map();
  const parts = [];
  let pos = 0;
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    if (run.start < pos) continue;
    const list = byLen.get(run.len);
    let idx = cursor.get(run.len) ?? 0;
    while (idx < list.length && list[idx] <= r) idx++;
    cursor.set(run.len, idx);
    if (idx < list.length) {
      const closeRun = runs[list[idx]];
      cursor.set(run.len, idx + 1);
      if (preserveVerdictTokens) {
        const inner = line.slice(run.end, closeRun.start).trim();
        const strippedInner = inner.replace(/^[*_]+|[*_]+$/g, "");
        if (PRESERVED_VERDICT_TOKENS.has(strippedInner)) {
          parts.push(line.slice(pos, run.start), inner);
          pos = closeRun.end;
          continue;
        }
      }
      parts.push(line.slice(pos, run.start), " ");
      pos = closeRun.end;
    }
  }
  parts.push(line.slice(pos));
  return parts.join("");
}

/**
 * Strip fenced code blocks line-by-line (tracking matching opening/closing
 * fence tokens), 4-space/tab indented Markdown code blocks, and inline code
 * spans so code examples cannot inject or swallow verdict lines.
 * @param {string} markdown
 * @returns {string}
 */
function stripCode(markdown) {
  return stripFencedCodeBlocks(markdown, { stripIndented: true })
    .split("\n")
    .map(line => stripInlineCodeLine(line))
    .join("\n");
}

const CATEGORY_VERDICT_RE = /^(?:changes required|no findings within reviewed scope|incomplete|not applicable)\b/i;

function isCategoryVerdictLine(line) {
  const bareVerdictPrefix = new RegExp(`^\\s*${LINE_ITEM_PREFIX}Verdict${POST_LABEL_EMPH}\\s*:(.*)$`, "i");
  const match = bareVerdictPrefix.exec(line);
  if (!match) return false;
  const rawVal = stripInlineCodeLine(match[1]).replace(/[*_]+/g, "").trim();
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
  const clean = stripFencedCodeBlocks(markdown, { stripIndented: true });
  const labelPattern = labels.join("|");
  const labelRe = new RegExp(`^\\s*${LINE_ITEM_PREFIX}(?:${labelPattern})${POST_LABEL_EMPH}\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${LINE_ITEM_PREFIX}(?:${labelPattern})${POST_LABEL_EMPH}\\s*:\\s*${POST_COLON_EMPH}([A-Z](?:[A-Z ]*[A-Z])?)${TRAILING_DOT_AND_EMPH}\\s*$`,
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
  const clean = stripFencedCodeBlocks(markdown, { stripIndented: true });
  const verdictLabelRe = new RegExp(`^\\s*${LINE_ITEM_PREFIX}(?:(?:Content|Overall)\\s+)?Verdict${POST_LABEL_EMPH}\\s*:`, "i");
  const tableScanner = createTableVerdictScanner(CONTENT_TABLE_CONFIG);
  for (const rawLine of clean.split(/\r?\n/)) {
    if (isCategoryVerdictLine(rawLine)) {
      tableScanner.reset();
      continue;
    }
    if (verdictLabelRe.test(rawLine)) return true;
    const line = stripInlineCodeLine(rawLine, true);
    const leading = line.match(
      /^\s*(?:\d+[.)]\s+|[-*+]\s+|#+\s+)?[*_]*(PASS|FAIL|BLOCKED)[*_]*(?:\s*[:—–]|\s+-(?=\s|$)|\.?\s*$)/
    );
    if (leading && !isHistoricalLeadingDesc(line.slice(leading[0].length))) {
      return true;
    }
    const labeled = matchLabeledVerdict(line);
    if (labeled && !isHistoricalLine(labeled.prefix)) return true;
    if (tableScanner.scanLine(rawLine).length > 0) return true;
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

  const clean = stripFencedCodeBlocks(markdown, { stripIndented: true });
  const tableScanner = createTableVerdictScanner(CONTENT_TABLE_CONFIG);
  for (const rawLine of clean.split(/\r?\n/)) {
    if (isCategoryVerdictLine(rawLine)) {
      tableScanner.reset();
      continue;
    }
    const line = stripInlineCodeLine(rawLine, true);
    // Reject explicit verdict-targeted negations of PASS when report claims PASS (excluding historical/negative-test prose)
    if (found.has("PASS")) {
      const tracker = createClauseTracker(line);
      for (const negMatch of line.matchAll(VERDICT_NEGATION_RE)) {
        const clause = tracker.advanceTo(negMatch.index);
        const matchEnd = negMatch.index + negMatch[0].length;
        if (clause.isHistorical) {
          tracker.markConsumed(matchEnd);
          continue;
        }
        if (negMatch[2] === "PASS") {
          found.add("FAIL");
          break;
        }
        const { isClauseEnd, isAdjunctTail } = classifyNegationTail(line, matchEnd);
        if ((clause.isLineInitial && isClauseEnd) || (clause.hasVerdictSubject && (isClauseEnd || isAdjunctTail))) {
          found.add("FAIL");
          break;
        }
        tracker.markConsumed(matchEnd);
      }
    }
    // Reject secondary labeled verdict/status/check lines asserting conflicting verdicts (excluding historical/compound tokens)
    const labeled = matchLabeledVerdict(line);
    if (labeled && !isHistoricalLine(labeled.prefix)) {
      found.add(labeled.verdict);
    }
    const leading = line.match(
      /^\s*(?:\d+[.)]\s+|[-*+]\s+|#+\s+)?[*_]*(PASS|FAIL|BLOCKED)[*_]*(?:\s*[:—–]|\s+-(?=\s|$)|\.?\s*$)/
    );
    if (leading && !isHistoricalLeadingDesc(line.slice(leading[0].length))) {
      found.add(leading[1]);
    }
    for (const verdict of tableScanner.scanLine(rawLine)) {
      found.add(verdict);
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

  const clean = stripFencedCodeBlocks(markdown, { stripIndented: true });
  const tableScanner = createTableVerdictScanner(INTEGRITY_TABLE_CONFIG);
  for (const rawLine of clean.split(/\r?\n/)) {
    const line = stripInlineCodeLine(rawLine, true);
    if (found.has("CLEAN")) {
      const tracker = createClauseTracker(line);
      for (const m of line.matchAll(INTEGRITY_NEGATION_RE)) {
        const clause = tracker.advanceTo(m.index);
        const matchEnd = m.index + m[0].length;
        if (m[1] === "CLEAN" && !clause.isHistorical) {
          found.add("INTEGRITY VIOLATION");
          break;
        }
        tracker.markConsumed(matchEnd);
      }
    }
    const labeled = matchLabeledIntegrityVerdict(line);
    if (labeled && !isHistoricalLine(labeled.prefix)) {
      found.add(labeled.verdict);
    }
    const leading = line.match(
      /^\s*(?:\d+[.)]\s+|[-*+]\s+|#+\s+)?[*_]*(CLEAN|INTEGRITY VIOLATION)[*_]*(?:\s*[:—–]|\s+-(?=\s|$)|\.?\s*$)/
    );
    if (leading && !isHistoricalLeadingDesc(line.slice(leading[0].length))) {
      found.add(leading[1]);
    }
    for (const verdict of tableScanner.scanLine(rawLine)) {
      found.add(verdict);
    }
  }

  if (found.size > 1) {
    throw new Error(`Integrity audit report contains conflicting verdicts: ${[...found].join(", ")}.`);
  }
  if (hasContentVerdictAttempt(markdown)) {
    throw new Error("Integrity audit report must not declare a content verdict (role conflation).");
  }
  return [...found][0];
}

/**
 * Parse a `Target Squad: <id>` declaration from an integrity report.
 * Supports optional unordered/ordered list, heading, and balanced Markdown emphasis;
 * throws on malformed, reserved, or conflicting Target Squad declarations.
 * @param {string} markdown
 * @returns {string|undefined}
 */
function parseTargetSquad(markdown) {
  const clean = stripFencedCodeBlocks(markdown, { stripIndented: true });
  const labelRe = new RegExp(`^\\s*${LINE_ITEM_PREFIX}Target Squad${POST_LABEL_EMPH}\\s*:`, "i");
  const found = new Set();

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const strippedPrefix = line.replace(/^\s*(?:(?:\d+[.)]|[-*+])\s+|#+\s+)?/, "").trim();
    const headerMatch = /^([*_]*)\s*Target Squad(?:\s*([*_]*))?\s*:(.*)$/i.exec(strippedPrefix);
    if (!headerMatch) {
      throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
    }
    const openEmph = headerMatch[1] || "";
    const closeBeforeColon = headerMatch[2] || "";
    let rest = headerMatch[3];
    const expectedClose = [...openEmph].reverse().join("");
    let trailingDotStripped = false;
    if (openEmph && !closeBeforeColon) {
      if (
        rest.startsWith(expectedClose) &&
        (rest.length === expectedClose.length || /^\s/.test(rest.slice(expectedClose.length)))
      ) {
        rest = rest.slice(expectedClose.length);
      } else {
        const trimmedRest = rest.trimEnd();
        if (trimmedRest.endsWith(`${expectedClose}.`)) {
          rest = trimmedRest.slice(0, -(expectedClose.length + 1));
          trailingDotStripped = true;
        } else if (trimmedRest.endsWith(expectedClose)) {
          rest = trimmedRest.slice(0, -expectedClose.length);
        } else {
          throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
        }
      }
    } else if (openEmph && closeBeforeColon !== expectedClose) {
      throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
    } else if (!openEmph && closeBeforeColon) {
      throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
    }
    let value = rest.trim();
    if (!trailingDotStripped && value.endsWith(".")) {
      value = value.slice(0, -1).trimEnd();
      trailingDotStripped = true;
    }
    value = unwrapBalancedEmphasis(value);
    if (value.startsWith("`") && value.endsWith("`") && value.length > 2) {
      value = value.slice(1, -1).trim();
    }
    if (!trailingDotStripped && value.endsWith(".")) {
      value = value.slice(0, -1);
      trailingDotStripped = true;
    }
    if (!value || !SQUAD_ID_RE.test(value)) {
      throw new Error(`Malformed Target Squad line: "${line.trim()}"`);
    }
    found.add(validateSquadId(value));
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
  const clean = stripFencedCodeBlocks(markdown, { stripIndented: true });
  const labelRe = new RegExp(`^\\s*${LINE_ITEM_PREFIX}Evidence Digest${POST_LABEL_EMPH}\\s*:`, "i");
  const exactRe = new RegExp(
    `^\\s*${LINE_ITEM_PREFIX}Evidence Digest${POST_LABEL_EMPH}\\s*:\\s*${POST_COLON_EMPH}(?:\`([0-9a-f]{64})\`|([0-9a-f]{64}))(?:[*_]*\\s*\\([^)\\r\\n]*\\))?${TRAILING_DOT_AND_EMPH}\\s*$`,
    "i"
  );
  const found = new Set();

  for (const line of clean.split(/\r?\n/)) {
    if (!labelRe.test(line)) continue;
    const match = line.match(exactRe);
    if (!match) {
      throw new Error(`Malformed Evidence Digest line: "${line.trim()}"`);
    }
    found.add((match[1] || match[2]).toLowerCase());
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
  stripFencedCodeBlocks,
  validateSquadId
};
