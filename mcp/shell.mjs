import path from "node:path";
const EMPTY = Object.freeze([]), CMD_PCT_RE = /^%(?:[0-9*]|~[0-9A-Za-z]|[A-Za-z_]\w*%)/, KW_CLOSE = { "}": ["{"], fi: ["then", "else"], done: ["do"] };
const STOP_CHAR = new Uint8Array(128);
for (let i = 0; i < 25; i++) STOP_CHAR[" \t\r\n\v\f\"'#$%&();<>\\`|".charCodeAt(i)] = 1;
const COMPOUND_KWS = new Set("! time { } if elif then else fi while until for select do done case esac [[ ]] function coproc".split(" "));
const KW_OPEN = { "{": [null, "{"], if: [null, "if"], while: [null, "loop"], until: [null, "loop"],
  then: ["if", "then"], do: ["loop", "do"], elif: ["then", "if"], else: ["then", "else"] };
// shortcut: case/select/[[/function/coproc and heredocs mark segments unverifiable instead of full AST parsing; never evaluate shell input
export function scanShellCommand(command) {
  const segments = [], scopeParents = [-1], stack = [], newSeg = () => ({ words: [], qMask: 0, redirs: [], target: "" });
  let s = newSeg(), word = "", active = false, wordQuoted = false, quote = "", parenDepth = 0, poisonDepth = -1, curScope = 0, leadSep = "";
  const finishWord = (dropFd = false) => {
    if (!active) return;
    if (!dropFd && s.target) {
      if (s.target === "in") s.sawIn = true;
      else s.redirs.push(word);
    } else if (!dropFd) {
      if (wordQuoted && s.words.length < 30) s.qMask |= 1 << s.words.length;
      s.words.push(word);
    }
    s.target = word = "";
    active = wordQuoted = false;
  };
  const applyCompound = () => {
    let c = 0;
    while (c < s.words.length && (c >= 30 || !(s.qMask & (1 << c))) && COMPOUND_KWS.has(s.words[c])) {
      const kw = s.words[c++];
      if (kw === "!" || kw === "time") continue;
      if (kw in KW_CLOSE) {
        const popped = stack.pop();
        s.closing = KW_CLOSE[kw].includes(popped) && c === s.words.length;
        if (!s.closing) s.unverifiable = true;
        return;
      }
      if (kw === "for") {
        const ok = c < s.words.length && !(s.qMask & (1 << c)) && /^[A-Za-z_]\w*$/.test(s.words[c]);
        const w2 = c + 1 < s.words.length ? (!(s.qMask & (1 << (c + 1))) ? s.words[c + 1] : "?") : null;
        if (ok && w2 === "do") {
          stack.push("do");
          c += 2;
          if (c >= s.words.length) s.incomplete = true;
          continue;
        }
        s.forHdr = Boolean(ok && (w2 === null || w2 === "in"));
        if (s.forHdr) stack.push("loop");
        else s.unverifiable = true;
        return;
      } else if (kw in KW_OPEN) {
        const prevTop = KW_OPEN[kw][0] ? stack.pop() : null;
        if (KW_OPEN[kw][0] && prevTop !== KW_OPEN[kw][0]) s.unverifiable = true;
        stack.push(KW_OPEN[kw][1]);
      } else {
        s.unverifiable = true;
        return;
      }
    }
    if (c > 0 && c >= s.words.length && s.words[c - 1] !== "!" && s.words[c - 1] !== "time") s.incomplete = true;
    if (c > 0) s.words = s.words.slice(c);
  };
  const finishSegment = (nextSep = "", scope = curScope) => {
    const preBranch = stack.some(x => x !== "{");
    finishWord();
    if (s.target) s.incomplete = true;
    if (s.words.length && !(s.qMask & 1) && COMPOUND_KWS.has(s.words[0])) applyCompound();
    const poisoned = poisonDepth !== -1 && parenDepth >= poisonDepth;
    if (s.words.length || s.redirs.length || s.sawIn || s.incomplete || s.unverifiable || s.closing || s.forHdr) {
      segments.push({
        words: (s.closing || s.forHdr) ? EMPTY : s.words, redirections: s.redirs, dynamic: Boolean(s.dynamic), incomplete: Boolean(s.incomplete),
        unverifiable: Boolean(s.unverifiable || poisoned), closingKeyword: Boolean(s.closing), forHeader: Boolean(s.forHdr),
        inSubshell: scope > 0 || poisoned, scope, scopeParents, inBranch: preBranch || stack.some(x => x !== "{"), prevSep: leadSep, nextSep
      });
      s = newSeg();
    }
    if (nextSep) leadSep = nextSep;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "%" && CMD_PCT_RE.test(command.slice(i, i + 64))) s.dynamic = true;
    if (quote) {
      if (quote === '"' && c !== "\\" && (c === "`" || (c === "$" && /[A-Za-z0-9_{(@*#?$!-]/.test(command[i + 1] ?? "")))) s.dynamic = true;
      if (c === quote) quote = "";
      else word += quote === '"' && c === "\\" && /["\\$`\n]/.test(command[i + 1] ?? "") ? command[++i] : c;
    } else if (c === "'" || c === '"') {
      active = wordQuoted = true;
      quote = c;
    } else if (!active && c === "#") {
      while (i + 1 < command.length && command[i + 1] !== "\n") i++;
    } else if (c === "\\" && i + 1 < command.length) {
      active = true;
      word += /^[A-Za-z]:/.test(word) || word.startsWith("\\") ? c : command[++i];
    } else if (c === "&" && command[i + 1] === ">") finishWord();
    else if (c === ">" || c === "<") {
      finishWord(!wordQuoted && /^\d+$/.test(word));
      const r4 = command.slice(i, i + 4), fdDup = /^[<>]&\d+(?=$|[\s;|&<>()])/.exec(command.slice(i, i + 12));
      if (r4.startsWith("<<") && r4[2] !== "<") {
        s.target = "in";
        s.unverifiable = true;
        i += r4[2] === "-" ? 2 : 1;
      } else if (r4.startsWith("<<<") || /^[<>]&-/.test(r4)) {
        if (r4[2] !== "-") s.target = "in";
        i += 2;
      } else if (fdDup) i += fdDup[0].length - 1;
      else {
        if (/^(?:>>|>\||<>|[<>]&)/.test(r4)) i++;
        s.target = c === "<" && r4[1] !== ">" ? "in" : "out";
      }
    } else if (c === "(") {
      finishWord();
      if (!s.words.length || (!(s.qMask & (1 << (s.words.length - 1))) && COMPOUND_KWS.has(s.words[s.words.length - 1]))) {
        finishSegment("(");
        curScope = scopeParents.push(curScope) - 1;
      } else {
        s.unverifiable = true;
        if (poisonDepth === -1) poisonDepth = parenDepth + 1;
      }
      parenDepth++;
    } else if (c === ")") {
      finishWord();
      const segScope = curScope;
      if (leadSep === "(" && !s.words.length && !s.redirs.length && !s.sawIn) s.unverifiable = true;
      parenDepth--;
      if (parenDepth < 0) {
        parenDepth = 0;
        s.unverifiable = true;
      } else if (poisonDepth !== -1 && parenDepth < poisonDepth) poisonDepth = -1;
      else if (poisonDepth === -1 && curScope > 0) curScope = scopeParents[curScope];
      finishSegment(")", segScope);
    } else if (c === ";" || c === "|" || c === "&" || c === "\n") {
      const two = command.slice(i, i + 2), isTwo = two === "&&" || two === "||" || two === "|&" || two === ";;";
      if (two === ";;") s.unverifiable = true;
      if (isTwo) i++;
      finishSegment(isTwo ? two : c);
    } else if (c === " " || c === "\t" || c === "\r" || c === "\v" || c === "\f") finishWord();
    else {
      active = true;
      if (c === "`" || (c === "$" && /[A-Za-z0-9_{(@*#?$!-]/.test(command[i + 1] ?? ""))) s.dynamic = true;
      let end = i + 1;
      while (end < command.length && (command.charCodeAt(end) >= 128 || !STOP_CHAR[command.charCodeAt(end)])) end++;
      word = word ? word + (end > i + 1 ? command.slice(i, end) : c) : (end > i + 1 ? command.slice(i, end) : c);
      i = end - 1;
    }
  }
  finishSegment();
  if ((quote || parenDepth !== 0 || stack.length > 0) && segments.length) segments[segments.length - 1].incomplete = true;
  return segments;
}
// shortcut: only unwrap VAR=val, env, command, xargs, and git; sudo/nohup/exec/timeout/nice/builtin remain unverifiable
export function unwrapShellCommand(words) {
  let i = 0, cwd, wrapperUncertain = false, hasGitConfigOverride = false;
  const envVars = [], wrappers = [], base = v => path.posix.basename(v.replaceAll("\\", "/")).replace(/\.(?:exe|cmd|bat)$/i, "").toLowerCase();
  const joinCwd = next => (cwd && !path.isAbsolute(next) ? path.join(cwd, next) : next);
  while (i < words.length && !wrapperUncertain) {
    const h = base(words[i]);
    if (/^[A-Za-z_]\w*=/.test(words[i])) envVars.push(words[i].slice(0, words[i++].indexOf("=")));
    else if (h === "command" && (!words[i + 1]?.startsWith("-") || words[i + 1] === "-p" || words[i + 1] === "--")) {
      wrappers.push("command");
      i += words[i + 1] === "-p" ? (words[i + 2] === "--" ? 3 : 2) : (words[i + 1] === "--" ? 2 : 1);
    } else if (h === "env" || h === "xargs") {
      wrappers.push(h);
      for (i++; i < words.length && !wrapperUncertain && (words[i].startsWith("-") || (h === "env" && /^[A-Za-z_]\w*=/.test(words[i])));) {
        const f = words[i++];
        if (f === "--") break;
        if (h === "env" && /^[A-Za-z_]\w*=/.test(f)) envVars.push(f.slice(0, f.indexOf("=")));
        else if (h === "env" && /^(?:-i|--ignore-environment|--unset=.+)$/.test(f)) continue;
        else if (h === "env" && (f === "-u" || f === "--unset") && i < words.length) i++;
        else if (h === "env" && f.startsWith("--chdir=")) cwd = joinCwd(f.slice(8));
        else if (h === "env" && (f === "-C" || f === "--chdir") && i < words.length) cwd = joinCwd(words[i++]);
        else if (h === "xargs" && /^-(?:[0rt]+|[nLP]\d+)$/.test(f)) continue;
        else if (h === "xargs" && /^-[nLP]$/.test(f) && /^\d+$/.test(words[i] ?? "")) i++;
        else wrapperUncertain = true;
      }
    } else break;
  }
  const head = i < words.length ? base(words[i++]) : "";
  while (head === "git" && i < words.length && words[i].startsWith("-") && words[i] !== "-") {
    const f = words[i++];
    if (f === "--") break;
    if (f === "-C" && i < words.length) cwd = joinCwd(words[i++]);
    else if (f.startsWith("-C") && f.length > 2 && !f.startsWith("--")) cwd = joinCwd(f.slice(2));
    else if (!/^-(?:p|P|-paginate|-no-pager|-bare|-no-optional-locks|-literal-pathspecs)$/.test(f)) hasGitConfigOverride = wrapperUncertain = true;
  }
  return { head, args: words.slice(i), cwd, envVars, wrappers, wrapperUncertain, hasGitConfigOverride };
}
const SAFE_NODE_CALLS = new Set(("require readFileSync statSync lstatSync readdirSync existsSync realpathSync byteLength stringify parse keys " +
  "values entries split slice trim join match startsWith endsWith includes indexOf Number String Boolean isArray toLowerCase toUpperCase cwd " +
  "resolve relative basename dirname extname homedir tmpdir platform arch max min round floor ceil").split(" "));
const BAD_NODE_RE = new RegExp("\\b(?:new|function|eval|Function|import|globalThis|Reflect|Proxy|child_process|constructor|__proto__|prototype|" +
  "class|with|promises|binding|_linkedBinding|dlopen|mainModule|write|append|rm|unlink|mkdir|rmdir|rename|copy|cp|chmod|chown|truncate|open|close|" +
  "link|symlink|utimes|lutimes|mkdtemp|watch|createWriteStream|fsync|fdatasync|exec|spawn|fork|kill|exit|abort|chdir|umask|setuid|setgid)\\w*\\b", "i");
function stripJsStrings(expr, allowSlash = false) {
  let out = "", i = 0;
  const strings = [];
  while (i < expr.length) {
    const c = expr[i++];
    if (c === "'" || c === '"') {
      const start = i;
      while (i < expr.length && expr[i] !== c) i += expr[i] === "\\" ? 2 : 1;
      if (expr[i] !== c) return null;
      out += `__S${strings.push(expr.slice(start, i++)) - 1}__`;
    } else {
      const closeHtml = c === "-" && expr[i] === "-" && (expr[i + 1] === ">" || (expr[i + 1] === "!" && expr[i + 2] === ">"));
      if (!allowSlash && (c === "/" || c === "`" || (c === "<" && expr[i] === "!") || closeHtml)) return null;
      out += c;
    }
  }
  return { code: out, strings };
}
function isSafeReadOnlyNodePrint(args) {
  let expr;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-p" || args[i] === "--print") && expr === undefined && i + 1 < args.length) expr = args[++i];
    else if (args[i].startsWith("--print=") && expr === undefined) expr = args[i].slice(8);
    else if (args[i] !== "--" || i !== args.length - 1) return false;
  }
  const s = typeof expr === "string" && expr.trim() && expr.length <= 1024 && !/__S\d+__/.test(expr) ? stripJsStrings(expr) : null;
  if (!s || /[\)\]]\s*\(|\?\.\s*\(|\\u|=>|\[(?![0-9]+\])|(?<![=!<>])=(?!=)|\bparse\s*\([^()]*,/.test(s.code) || BAD_NODE_RE.test(s.code)) return false;
  const reqOk = [...s.code.matchAll(/\brequire\s*\(/g)].every(m => {
    const r = /^require\s*\(\s*__S(\d+)__\s*\)/.exec(s.code.slice(m.index));
    return Boolean(r && /^(?:node:)?(?:fs|path|os|url|util)$/.test(s.strings[Number(r[1])] ?? ""));
  });
  return reqOk && [...s.code.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].every(m => SAFE_NODE_CALLS.has(m[1]));
}
const UNSAFE_ENV_RE = new RegExp("^(?:LD_|DYLD_|NODE_OPTIONS$|PERL5|PYTHON|RUBY|BASH_ENV$|ENV$|PROMPT_COMMAND$|GIT_(?:DIR$|WORK_TREE$|" +
  "INDEX_FILE$|OBJECT_DIRECTORY$|CONFIG|EXEC_PATH$|EXTERNAL_DIFF$|SSH|PAGER$)|PAGER$|LESSOPEN$|IFS$|PATH$)", "i");
const READ_CMDS = new Set(("cat head tail nl wc stat ls dir pwd cd true false : echo printf test [ grep egrep fgrep cut tr diff cmp comm jq " +
  "basename dirname realpath readlink which where type uname whoami id hostname du df").split(" "));
const GIT_READ = new Set(("status diff log show grep rev-parse rev-list ls-files ls-tree cat-file blame annotate shortlog describe name-rev " +
  "for-each-ref show-ref merge-base diff-tree diff-files diff-index check-ignore check-attr var version --version -v help --help -h").split(" "));
const INTERP_RE = /^(?:perl|python[23]?|ruby|php|node|sh|bash|zsh|dash|ksh|pwsh|powershell|cmd|cscript|wscript|mshta)$/;
const BAD_ARG_RE = { date: /^--set|^-[A-Za-z]*s/, rg: /^(?:--pre|--hostname-bin)(?:=|$)/, ripgrep: /^(?:--pre|--hostname-bin)(?:=|$)/,
  file: /^--compile|^-[^-]*C/, sort: /^--(?:output|compress-program)|^-[^-]*o/ };
// shortcut: non-trivial sed/awk/find or unknown commands return true (unverifiable), upgrade only for proven read-only forms
export function shellCommandWrites(segments, allowRedir, depth = 0) {
  if (depth > 4) return true;
  for (const seg of segments) {
    if (seg.dynamic || seg.incomplete || seg.unverifiable || seg.redirections.some(t => !allowRedir(t))) return true;
    if (seg.closingKeyword || seg.forHeader) continue;
    const { head, args, envVars, wrappers, wrapperUncertain, hasGitConfigOverride } = unwrapShellCommand(seg.words);
    if (wrapperUncertain || envVars.some(k => UNSAFE_ENV_RE.test(k)) || (!head && (!envVars.length || wrappers.length))) return true;
    if (!head || READ_CMDS.has(head) || (head in BAD_ARG_RE && !args.some(a => BAD_ARG_RE[head].test(a)))) continue;
    if (head === "command" && args.length >= 1 && args.every(a => !a.startsWith("-") || /^-[vV]+$/.test(a) || a === "--")) continue;
    if (head === "uniq" && args.filter((a, idx) => a === "-" || !a.startsWith("-") || args.slice(0, idx).includes("--")).length <= 1) continue;
    if (INTERP_RE.test(head)) {
      const okVer = args.length === 1 && ((/^(?:sh|bash|zsh|dash|ksh)$/.test(head) && /^--(?:version|help)$/.test(args[0])) ||
        (/^python/.test(head) && /^-(?:[Vh]|-version|-help)$/.test(args[0])) ||
        (/^(?:perl|ruby|php|node)$/.test(head) && (head === "perl" ? /^-(?:[vVh]|-version|-help)$/ : /^-(?:[vh]|-version|-help)$/).test(args[0])) ||
        (/^(?:pwsh|powershell)$/.test(head) && /^(?:--?version|-v|--?help|-h|-\?)$/i.test(args[0])));
      const okNode = head === "node" && ((args.length === 2 && /^-(?:c|-check)$/.test(args[0]) && Boolean(args[1]) && !args[1].startsWith("-")) ||
        isSafeReadOnlyNodePrint(args));
      if (!envVars.length && !wrappers.includes("xargs") && (okVer || okNode)) continue;
      return true;
    }
    if (head === "find") {
      let ok = true, inExpr = false;
      for (let i = 0; i < args.length && ok; i++) {
        if (!inExpr && !args[i].startsWith("-") && args[i] !== "(" && args[i] !== "!") continue;
        inExpr = true;
        if (args[i] === "-exec" || args[i] === "-execdir") {
          let t = i + 1;
          while (t < args.length && !(args[t] === ";" || (args[t] === "+" && t > i + 1 && args[t - 1] === "{}"))) t++;
          const sub = { words: args.slice(i + 1, t).map(w => (w === "{}" ? "__ITEM__" : w)), redirections: EMPTY };
          ok = t < args.length && t > i + 1 && !shellCommandWrites([sub], allowRedir, depth + 1);
          i = t;
        } else if (/^-(?:maxdepth|mindepth|i?name|path|type)$/.test(args[i])) ok = ++i < args.length;
        else ok = /^-(?:H|L|P|print0?|a|o)$|^[!()]$/.test(args[i]);
      }
      if (ok) continue;
    } else if (head === "sed") {
      if (args.length === 1 && /^--(?:version|help)$/.test(args[0])) continue;
      const scripts = [], pos = [], clauseRe = /^(?:\d+|\$)(?:[ \t]*,[ \t]*(?:\d+|\$))?[ \t]*[pqd]$/;
      let explicit = false, dd = false, ok = true;
      for (let i = 0; i < args.length && ok; i++) {
        const a = args[i], em = !dd && /^(?:--expression=(.*)|(-e|--expression)|-[nEru]+e([\s\S]*))$/.exec(a);
        if (!dd && a === "--") dd = true;
        else if (dd || !a.startsWith("-") || a === "-") pos.push(a);
        else if (em) {
          const val = em[1] ?? (em[2] ? args[++i] : (em[3] || args[++i]));
          explicit ||= val !== undefined;
          if (val === undefined) ok = false;
          else scripts.push(val);
        } else ok = /^--(?:quiet|silent|regexp-extended)$|^-[nEru]+$/.test(a);
      }
      if (!explicit && pos.length) scripts.push(pos[0]);
      if (ok && scripts.length > 0 && scripts.every(x => x.length <= 256 && x.split(/[;\r\n]+/).filter(Boolean).every(c => clauseRe.test(c.trim())))) continue;
    } else if (["awk", "gawk", "mawk", "nawk"].includes(head)) {
      if (args.length === 1 && /^(?:--version|-V|--help|-h)$/.test(args[0])) continue;
      let prog = null, dd = false, ok = true;
      for (let i = 0; i < args.length && ok; i++) {
        if (!dd && args[i] === "--") dd = true;
        else if (!dd && (args[i] === "-F" || args[i] === "-v")) ok = ++i < args.length;
        else if (!dd && args[i].startsWith("-") && args[i] !== "-") ok = /^-[Fv].*/.test(args[i]);
        else if (prog === null) prog = args[i];
      }
      const st = ok && prog !== null ? stripJsStrings(prog.replace(/\\\r?\n/g, " "), true) : null;
      if (st && !/\bsystem\s*\(|\bgetline\b|\|\&|(?:^|[^|])\|(?:[^|]|$)|\b(?:print|printf)\b[^;}\n]*>/.test(st.code)) continue;
    } else if (head === "git" && !hasGitConfigOverride && (!args[0] || GIT_READ.has(args[0]) || /^(?:branch|tag|remote)$/.test(args[0]))) {
      const sub = args[0], rest = args.slice(1);
      const badGit = rest.some(a => a === "--output" || a.startsWith("--output=") || a === "--ext-diff" || a === "--textconv");
      const okGrep = sub !== "grep" || !rest.some(a => a.startsWith("--open-files-in-pager") || (!a.startsWith("--") && /^-[A-Za-z0-9]*O/.test(a)));
      const okBr = sub === "branch" && rest.every(a => /^--(?:show-current|all|remotes|verbose|list)$|^-(?:a|r|vv?|l)$/.test(a));
      const okTR = (sub === "tag" && (!rest[0] || /^-(?:l|-list)$/.test(rest[0]))) ||
        (sub === "remote" && (!rest[0] || (rest.length === 1 && /^-(?:v|-verbose)$/.test(rest[0]))));
      if (!badGit && (!sub || (GIT_READ.has(sub) && okGrep) || okBr || okTR)) continue;
    } else if (head === "rtk") {
      const okSub = /^(?:cat|head|tail|grep|rg|ls|find|diff|git)$/.test(args[0]) &&
        !shellCommandWrites([{ words: args, redirections: EMPTY }], allowRedir, depth + 1);
      if ((args.length === 1 && /^(?:--version|-V|--help|-h)$/.test(args[0])) || args[0] === "read" || okSub) continue;
    }
    return true;
  }
  return false;
}
