import path from "node:path";

const EMPTY = Object.freeze([]);
const COMPOUND_STARTS = new Set(" ! time { } if elif then else fi while until for select do done case esac [[ ]] function coproc".trim().split(" "));

function matchesCmdPercent(text, idx) {
  const next = text[idx + 1];
  if (!next) return false;
  if (/[0-9*]/.test(next) || (next === "~" && /[0-9a-zA-Z]/.test(text[idx + 2] ?? ""))) return true;
  if (!/[A-Za-z_]/.test(next)) return false;
  let end = idx + 2; while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end++;
  return end < text.length && text[end] === "%";
}

function normalizeCompoundSegments(rawSegments) {
  const st = { ifDepth: 0, loopDepth: 0, braceDepth: 0, awaitingThen: false, awaitingDo: false };
  for (const seg of rawSegments) {
    const { words, qMask } = seg;
    if (!words.length || (qMask & 1) !== 0 || !COMPOUND_STARTS.has(words[0])) continue;
    let c = 0, closing = false, forHdr = false;
    while (c < words.length && (c >= 30 || (qMask & (1 << c)) === 0)) {
      const kw = words[c];
      if (kw === "!" || kw === "time") { c++; continue; }
      if (kw === "{") { st.braceDepth++; if (++c >= words.length) seg.incomplete = true; continue; }
      if (kw === "}" || kw === "fi" || kw === "done") {
        const bad = kw === "}" ? st.braceDepth <= 0 : (kw === "fi" ? (st.ifDepth <= 0 || st.awaitingThen) : (st.loopDepth <= 0 || st.awaitingDo));
        if (bad || c + 1 < words.length) seg.unverifiable = true; else { if (kw === "}") st.braceDepth--; else if (kw === "fi") st.ifDepth--; else st.loopDepth--; closing = true; }
        break;
      }
      if (kw === "if" || kw === "while" || kw === "until") {
        if (kw === "if") { st.ifDepth++; st.awaitingThen = true; } else { st.loopDepth++; st.awaitingDo = true; }
        if (++c >= words.length) seg.incomplete = true; continue;
      }
      if (kw === "elif" || kw === "else") {
        if (st.ifDepth <= 0 || st.awaitingThen) seg.unverifiable = true;
        if (kw === "elif") st.awaitingThen = true;
        if (++c >= words.length) seg.incomplete = true; continue;
      }
      if (kw === "then" || kw === "do") {
        if (!(kw === "then" ? st.awaitingThen : st.awaitingDo)) seg.unverifiable = true;
        if (kw === "then") st.awaitingThen = false; else st.awaitingDo = false;
        if (++c >= words.length) seg.incomplete = true; continue;
      }
      if (kw === "for" || kw === "select") {
        st.loopDepth++; st.awaitingDo = true;
        const vQ = c + 1 < 30 && (qMask & (1 << (c + 1))) !== 0, dQ = c + 2 < 30 && (qMask & (1 << (c + 2))) !== 0;
        if (c + 1 >= words.length || vQ || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(words[c + 1])) { seg.unverifiable = true; break; }
        if (c + 2 < words.length && !dQ && words[c + 2] === "do") { st.awaitingDo = false; c += 3; if (c >= words.length) seg.incomplete = true; continue; }
        if (c + 2 < words.length && (dQ || words[c + 2] !== "in")) seg.unverifiable = true; else forHdr = true;
        break;
      }
      if (["case", "esac", "[[", "]]", "function", "coproc"].includes(kw)) seg.unverifiable = true;
      break;
    }
    seg.words = (closing || forHdr) ? EMPTY : (c > 0 ? words.slice(c) : words);
    seg.closingKeyword = closing; seg.forHeader = forHdr;
  }
  if (rawSegments.length && (st.ifDepth > 0 || st.loopDepth > 0 || st.braceDepth > 0 || st.awaitingThen || st.awaitingDo)) rawSegments[rawSegments.length - 1].incomplete = true;
  return rawSegments;
}

// Parse only shell word/quote boundaries; never evaluate shell input.
export function scanShellCommand(command) {
  const segments = [], isParam = ch => Boolean(ch && /[A-Za-z0-9_{(@*#?$!-]/.test(ch));
  let words = [], qMask = 0, redirs = null, hasInRedir = false, word = "", active = false, wordQuoted = false;
  let quote = "", target = "", dynamic = false, unverifiable = false, parenDepth = 0;
  const finishWord = () => {
    if (!active) return;
    if (target === "out") { (redirs ||= []).push(word); target = ""; }
    else if (target === "in") { hasInRedir = true; target = ""; }
    else { if (wordQuoted && words.length < 30) qMask |= (1 << words.length); words.push(word); }
    word = ""; active = false; wordQuoted = false;
  };
  const finishSegment = () => {
    finishWord();
    const incomplete = Boolean(target);
    if (words.length || redirs || hasInRedir || incomplete || unverifiable) {
      segments.push({ words, qMask, redirections: redirs ?? EMPTY, dynamic, incomplete, unverifiable, closingKeyword: false, forHeader: false });
      if (words.length) words = [];
      qMask = 0; redirs = null; hasInRedir = false;
    }
    target = ""; dynamic = false; unverifiable = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "%" && matchesCmdPercent(command, i)) dynamic = true;
    if (quote) {
      if (c === quote) { quote = ""; continue; }
      if (quote === '"' && c === "\\" && /["\\$`\n]/.test(command[i + 1] ?? "")) { word += command[++i]; continue; }
      if (quote === '"' && (c === "`" || (c === "$" && isParam(command[i + 1])))) dynamic = true;
      word += c; continue;
    }
    if (c === "'" || c === '"') { quote = c; active = true; wordQuoted = true; continue; }
    if (!active && c === "#") { while (i + 1 < command.length && command[i + 1] !== "\n") i++; continue; }
    if (c === "\\" && i + 1 < command.length) { word += /^[A-Za-z]:/.test(word) || word.startsWith("\\") ? c : command[++i]; active = true; continue; }
    if (c === "`" || (c === "$" && isParam(command[i + 1]))) dynamic = true;
    if (c === ">" || c === "<") {
      if (!wordQuoted && /^\d+$/.test(word)) { word = ""; active = false; } else finishWord();
      if ((c === ">" && (command[i + 1] === ">" || command[i + 1] === "|")) || (c === "<" && command[i + 1] === ">")) { i++; target = "out"; continue; }
      // shortcut: heredocs mark the command unverifiable instead of parsing delimiter bodies, upgrade if read-only heredocs are needed
      if (c === "<" && command[i + 1] === "<") { if (command[i + 2] === "<") i += 2; else { i += command[i + 2] === "-" ? 2 : 1; unverifiable = true; } target = "in"; continue; }
      if (command[i + 1] === "&") {
        if (command[i + 2] === "-") { i += 2; continue; }
        let d = i + 2; while (/\d/.test(command[d] ?? "")) d++;
        if (d > i + 2 && (!command[d] || /[\s;|&<>()]/.test(command[d]))) { i = d - 1; continue; }
        i++;
      }
      target = c === ">" ? "out" : "in"; continue;
    }
    if (c === "&" && command[i + 1] === ">") { finishWord(); continue; }
    if (c === "(") { parenDepth++; finishSegment(); continue; }
    if (c === ")") { if (--parenDepth < 0) { unverifiable = true; parenDepth = 0; } finishSegment(); continue; }
    if (c === ";" || c === "|" || c === "&" || c === "\n") { if (c === ";" && command[i + 1] === ";") unverifiable = true; finishSegment(); continue; }
    if (c === " " || c === "\t" || c === "\r" || c === "\v" || c === "\f") { finishWord(); continue; }
    word += c; active = true;
  }
  finishSegment();
  if ((quote || parenDepth !== 0) && segments.length) segments[segments.length - 1].incomplete = true;
  return normalizeCompoundSegments(segments);
}

const WRAPPER_VAL_FLAGS = new Set("-u --unset --user -g --group -a -C --chdir -n --adjustment -k --kill-after -s --signal -I -L -P".split(" "));

export function unwrapShellCommand(words) {
  let i = 0, cwd, wrapperUncertain = false, hasGitConfigOverride = false;
  const envVars = [], wrappers = [], base = v => path.posix.basename(v.replaceAll("\\", "/")).replace(/\.(?:exe|cmd|bat)$/i, "").toLowerCase();
  while (i < words.length) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) { envVars.push(words[i].slice(0, words[i].indexOf("="))); i++; continue; }
    const h = base(words[i]);
    if (!["env", "command", "builtin", "xargs", "nohup", "timeout", "nice", "sudo", "exec"].includes(h)) break;
    if (h === "command") {
      let p = i + 1, q = false;
      for (; p < words.length && words[p].startsWith("-") && words[p] !== "-"; p++) {
        if (words[p] === "--") { p++; break; }
        if ((/^-[pPvV]+$/.test(words[p]) && /[vV]/.test(words[p])) || words[p] !== "-p") q = true;
      }
      if (q) break;
      wrappers.push(h); i = p; continue;
    }
    for (wrappers.push(h), i++; i < words.length && (words[i].startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]));) {
      const f = words[i++];
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(f)) { envVars.push(f.slice(0, f.indexOf("="))); continue; }
      if (f === "--") break;
      if (h === "env" && (f === "-S" || f.startsWith("--split-string") || (!f.startsWith("--") && /^-[A-Za-z]*S/.test(f)))) { wrapperUncertain = true; break; }
      if (f.startsWith("--chdir=")) cwd = f.slice(8);
      else if (WRAPPER_VAL_FLAGS.has(f)) { if (i >= words.length) { wrapperUncertain = true; break; } if (f === "-C" || f === "--chdir") cwd = words[i]; i++; }
    }
    if (h === "timeout") { if (i >= words.length) wrapperUncertain = true; else i++; }
  }
  const head = i < words.length ? base(words[i++]) : "";
  for (; head === "git" && i < words.length && words[i].startsWith("-") && words[i] !== "--";) {
    const f = words[i++];
    if (f === "-C") { if (i >= words.length) wrapperUncertain = true; else cwd = words[i++]; }
    else if (f.startsWith("-C") && f.length > 2 && !f.startsWith("--")) cwd = f.slice(2);
    else if (["-c", "--config-env", "--super-prefix"].includes(f)) { hasGitConfigOverride = true; if (i >= words.length) wrapperUncertain = true; else i++; }
    else if ((f.startsWith("-c") && f.length > 2 && !f.startsWith("--")) || f.startsWith("--config-env=") || f.startsWith("--super-prefix=")) hasGitConfigOverride = true;
    else if (["--git-dir", "--work-tree", "--namespace"].includes(f)) { if (i >= words.length) wrapperUncertain = true; else i++; }
  }
  return { head, args: words.slice(i), cwd, envVars, wrappers, wrapperUncertain, hasGitConfigOverride };
}

const SAFE_NODE_READ_CALLS = new Set("require readFileSync statSync lstatSync readdirSync existsSync realpathSync byteLength stringify parse keys values entries split slice trim join match startsWith endsWith includes indexOf Number String Boolean isArray toLowerCase toUpperCase cwd resolve relative basename dirname extname homedir tmpdir platform arch max min round floor ceil".split(" "));

function stripJsStrings(expr) {
  let out = "", q = "", start = 0; const strings = [];
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (q) { if (c === "\\") i++; else if (c === q) { strings.push(expr.slice(start + 1, i)); out += `__S${strings.length - 1}__`; q = ""; } continue; }
    if (c === "'" || c === '"') { q = c; start = i; continue; }
    out += c;
  }
  return q ? null : { code: out, strings };
}

function isSafeReadOnlyNodePrint(args) {
  let expr;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-p" || a === "--print") { if (expr !== undefined || i + 1 >= args.length) return false; expr = args[++i]; }
    else if (a.startsWith("--print=")) { if (expr !== undefined) return false; expr = a.slice(8); }
    else if (a !== "--" || i !== args.length - 1) return false;
  }
  if (typeof expr !== "string" || !expr.trim() || expr.length > 1024 || /__S\d+__/.test(expr)) return false;
  const stripped = stripJsStrings(expr);
  if (!stripped) return false;
  const { code, strings } = stripped;
  if (/[`]|[\)\]]\s*\(|\?\.\s*\(|\/\*|\/\/|\\u|=>|\[(?![0-9]+\])|(?<![=!<>])=(?!=)|\bparse\s*\([^()]*,|\b(?:new|function|eval|Function|import|globalThis|Reflect|Proxy|child_process|constructor|__proto__|prototype|class|with|promises|binding|_linkedBinding|dlopen|mainModule)\b/.test(code) ||
      /\b(?:write|append|rm|unlink|mkdir|rmdir|rename|copy|cp|chmod|chown|truncate|open|close|link|symlink|utimes|lutimes|mkdtemp|watch|createWriteStream|fsync|fdatasync|exec|spawn|fork|kill|exit|abort|chdir|umask|setuid|setgid)\w*\b/i.test(code)) return false;
  for (const m of code.matchAll(/\brequire\s*\(/g)) { const req = /^require\s*\(\s*__S(\d+)__\s*\)/.exec(code.slice(m.index)); if (!req || !/^(?:node:)?(?:fs|path|os|url|util)$/.test(strings[Number(req[1])] ?? "")) return false; }
  for (const m of code.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) if (!SAFE_NODE_READ_CALLS.has(m[1])) return false;
  return true;
}

const UNSAFE_ENV_RE = /^(?:LD_|DYLD_|NODE_OPTIONS$|PERL5|PYTHON|RUBY|BASH_ENV$|ENV$|PROMPT_COMMAND$|GIT_EXTERNAL_DIFF$|GIT_SSH|GIT_PAGER$|PAGER$|LESSOPEN$|IFS$|PATH$)/i;
const READ_CMDS = new Set("cat head tail nl wc stat ls dir pwd cd true false : echo printf test [ grep egrep fgrep cut tr diff cmp comm jq basename dirname realpath readlink which where type uname whoami id hostname du df".split(" "));
const GIT_READ_SUBS = new Set("status diff log show grep rev-parse rev-list ls-files ls-tree cat-file blame annotate shortlog describe name-rev for-each-ref show-ref merge-base diff-tree diff-files diff-index check-ignore check-attr var version --version -v help --help -h".split(" "));
const FIND_VAL_PREDS = new Set("-name -iname -path -ipath -wholename -iwholename -lname -ilname -regex -iregex -regextype -type -xtype -perm -user -group -uid -gid -size -links -inum -mindepth -maxdepth -mtime -atime -ctime -mmin -amin -cmin -printf -newer -anewer -cnewer -samefile -files0-from -used -fstype -context".split(" "));
const FIND_BOOL_PREDS = new Set("-H -L -P -print -print0 -ls -prune -quit -empty -executable -readable -writable -true -false -depth -d -mount -xdev -daystart -follow -noleaf -warn -nowarn -ignore_readdir_race -noignore_readdir_race ( ) ! -not -a -and -o -or ,".split(" "));
const INTERP_VER = { perl: ["-v", "--version", "-V", "-h", "--help"], python: ["-V", "--version", "-h", "--help"], python2: ["-V", "--version", "-h", "--help"], python3: ["-V", "--version", "-h", "--help"], ruby: ["-v", "--version", "-h", "--help"], php: ["-v", "--version", "-h", "--help"], sh: ["--version", "--help"], bash: ["--version", "--help"], zsh: ["--version", "--help"], dash: ["--version", "--help"], ksh: ["--version", "--help"] };

// shortcut: non-trivial sed/awk/find or unknown commands return true (unverifiable), upgrade only for proven read-only forms
function isSafeFind(args, allowRedir, depth) {
  if (depth > 4) return false;
  for (let i = 0, inExpr = false; i < args.length; i++) {
    const a = args[i];
    if (!inExpr) { if (a === "-H" || a === "-L" || a === "-P" || /^-O\d*$/.test(a)) continue; if (a === "-D") { if (++i >= args.length) return false; continue; } if (a.startsWith("-") || a === "(" || a === "!" || a === ",") inExpr = true; else continue; }
    if (["-delete", "-fprint", "-fprint0", "-fprintf", "-fls"].includes(a)) return false;
    if (["-exec", "-execdir", "-ok", "-okdir"].includes(a)) {
      let t = i + 1; while (t < args.length && !(args[t] === ";" || (args[t] === "+" && t > i + 1 && args[t - 1] === "{}"))) t++;
      if (t >= args.length || t === i + 1 || writesInternal([{ words: args.slice(i + 1, t).map(w => (w === "{}" ? "__ITEM__" : w)), redirections: EMPTY, dynamic: false, incomplete: false, unverifiable: false }], allowRedir, depth + 1)) return false;
      i = t; continue;
    }
    if (FIND_VAL_PREDS.has(a) || /^-newer[aBcmMt]{2}$/.test(a)) { if (++i >= args.length) return false; continue; }
    if (!FIND_BOOL_PREDS.has(a) && !/^-O\d*$/.test(a) && a.startsWith("-")) return false;
  }
  return true;
}

function isSafeSedOrAwk(head, args) {
  if (head !== "sed") {
    if (args.length === 1 && ["--version", "-V", "--help", "-h"].includes(args[0])) return true;
    let prog = null, dd = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (!dd && a === "--") { dd = true; continue; }
      if (!dd && a.startsWith("-") && a !== "-") {
        if (a === "-F" || a === "-v" || a === "--field-separator" || a === "--assign") { if (++i >= args.length) return false; continue; }
        if (!(/^-[Fv].+/.test(a) || /^--(?:field-separator|assign)=/.test(a) || ["--posix", "--traditional", "--characters-as-bytes"].includes(a))) return false;
        continue;
      }
      if (prog === null) prog = a;
    }
    return prog !== null && !/\bsystem\s*\(|\bgetline\b|\|\&|(?:^|[^|])\|(?:[^|]|$)|\b(?:print|printf)\b[^;}\n]*>/.test(prog);
  }
  const scripts = [], pos = [];
  for (let i = 0, explicit = false, dd = false; i <= args.length; i++) {
    if (i === args.length) { if (!explicit && pos.length) scripts.push(pos[0]); break; }
    const a = args[i];
    if (!dd && a === "--") { dd = true; continue; }
    if (dd || !a.startsWith("-") || a === "-") { pos.push(a); continue; }
    if (a === "--in-place" || a.startsWith("--in-place=") || a === "-f" || a.startsWith("--file") || (!a.startsWith("--") && /^-[A-Za-z0-9]*[if]/.test(a))) return false;
    if (!a.startsWith("--") && a.includes("e")) { explicit = true; const p = a.indexOf("e"); if (p + 1 < a.length) scripts.push(a.slice(p + 1)); else if (++i < args.length) scripts.push(args[i]); else return false; }
    else if (a === "--expression") { if (++i >= args.length) return false; explicit = true; scripts.push(args[i]); }
    else if (a.startsWith("--expression=")) { explicit = true; scripts.push(a.slice(13)); }
    else if (a === "-l" || a === "--line-length") i++;
  }
  return scripts.every(s => !/(?:^|[;{}\n]\s*)(?:(?:\d+|\$|\/[^/]*\/)(?:\s*,\s*(?:\d+|\$|\/[^/]*\/))?\s*)?[wWe](?:\s|$)|s\/[^/]*\/[^/]*\/[A-Za-z0-9]*[we]/.test(s));
}
export const shellCommandWrites = (segments, allowRedirection) => writesInternal(segments, allowRedirection, 0);

function writesInternal(segments, allowRedirection, depth = 0) {
  if (depth > 4) return true;
  for (const seg of segments) {
    if (seg.dynamic || seg.incomplete || seg.unverifiable || seg.redirections.some(t => !allowRedirection(t))) return true;
    if (seg.closingKeyword || seg.forHeader) continue;
    const { head, args, envVars, wrappers, wrapperUncertain, hasGitConfigOverride } = unwrapShellCommand(seg.words);
    if (wrapperUncertain || envVars.some(k => UNSAFE_ENV_RE.test(k))) return true;
    if (!head) { if (envVars.length && !wrappers.length) continue; return true; }
    if (head in INTERP_VER || ["powershell", "pwsh", "node", "cmd", "cscript", "wscript", "mshta"].includes(head)) {
      if (envVars.length || wrappers.includes("xargs")) return true;
      if ((head in INTERP_VER && args.length === 1 && INTERP_VER[head].includes(args[0])) ||
          ((head === "powershell" || head === "pwsh") && args.length === 1 && ["-v", "-version", "--version", "-h", "-help", "--help", "-?"].includes(args[0].toLowerCase())) ||
          (head === "node" && ((args.length === 1 && ["-v", "--version", "-h", "--help"].includes(args[0])) || (args.length === 2 && (args[0] === "-c" || args[0] === "--check") && Boolean(args[1]) && !args[1].startsWith("-")) || isSafeReadOnlyNodePrint(args)))) continue;
      return true;
    }
    if (head === "command" && args.length >= 1 && args.every(a => !a.startsWith("-") || /^-[vV]+$/.test(a) || a === "--")) continue;
    if (READ_CMDS.has(head)) continue;
    if (head === "date" && !args.some(a => a === "-s" || a.startsWith("--set") || (!a.startsWith("--") && /^-[A-Za-z]*s/.test(a)))) continue;
    if ((head === "rg" || head === "ripgrep") && !args.some(a => /^(?:--pre|--hostname-bin)(?:=|$)/.test(a))) continue;
    if (head === "file" && !args.some(a => a === "--compile" || (!a.startsWith("--") && /^-[^-]*C/.test(a)))) continue;
    if (head === "sort" && !args.some(a => a === "--output" || a.startsWith("--output=") || (!a.startsWith("--") && /^-[^-]*o/.test(a)) || a.startsWith("--compress-program"))) continue;
    if (head === "uniq") { let dd = false, n = 0; for (const a of args) { if (!dd && a === "--") dd = true; else if (dd || !a.startsWith("-") || a === "-") n++; } if (n <= 1) continue; return true; }
    if ((head === "sed" || ["awk", "gawk", "mawk", "nawk"].includes(head)) && isSafeSedOrAwk(head, args)) continue;
    if (head === "find" && isSafeFind(args, allowRedirection, depth)) continue;
    if (head === "git" && !hasGitConfigOverride && (args.length === 0 || (GIT_READ_SUBS.has(args[0]) && !(args[0] === "grep" && args.slice(1).some(a => a.startsWith("-O") || a.startsWith("--open-files-in-pager")))) || (args[0] === "branch" && args.slice(1).every(a => ["--show-current", "-a", "--all", "-r", "--remotes", "-v", "-vv", "--verbose", "--list", "-l"].includes(a))) || (args[0] === "tag" && (!args[1] || args[1] === "-l" || args[1] === "--list")) || (args[0] === "remote" && (!args[1] || (args.length === 2 && ["-v", "--verbose"].includes(args[1])))))) continue;
    if (head === "rtk" && ((args.length === 1 && ["--version", "-V", "--help", "-h"].includes(args[0])) || args[0] === "read" || (["cat", "head", "tail", "grep", "rg", "ls", "find", "diff", "git"].includes(args[0]) && !writesInternal([{ words: args, redirections: EMPTY, dynamic: false, incomplete: false, unverifiable: false }], allowRedirection, depth + 1)))) continue;
    return true;
  }
  return false;
}
