import path from "node:path";

// Parse only shell word/quote boundaries; never evaluate shell input.
export function scanShellCommand(command) {
  const segments = [];
  let words = [], redirections = [], word = "", active = false, quote = "", target = false, dynamic = false;
  const finishWord = () => {
    if (!active) return;
    if (target) { redirections.push(word); target = false; }
    else words.push(word);
    word = ""; active = false;
  };
  const finishSegment = () => {
    finishWord();
    if (words.length || redirections.length || target) segments.push({ words, redirections, dynamic, incomplete: target });
    words = []; redirections = []; target = false; dynamic = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) { quote = ""; continue; }
      if (quote === '"' && c === "\\" && /["\\$`\n]/.test(command[i + 1] ?? "")) { word += command[++i]; continue; }
      if (quote === '"' && (c === "`" || (c === "$" && command[i + 1] === "("))) dynamic = true;
      word += c; continue;
    }
    if (c === "'" || c === '"') { quote = c; active = true; continue; }
    if (c === "\\" && i + 1 < command.length) {
      word += /^[A-Za-z]:/.test(word) || word.startsWith("\\") ? c : command[++i];
      active = true; continue;
    }
    if (c === "`" || (c === "$" && command[i + 1] === "(")) dynamic = true;
    if (c === ">") {
      if (/^\d+$/.test(word)) { word = ""; active = false; }
      else finishWord();
      if (command[i + 1] === ">" || command[i + 1] === "|") i++;
      if (command[i + 1] === "&" && /\d/.test(command[i + 2] ?? "")) { i += 2; while (/\d/.test(command[i + 1] ?? "")) i++; continue; }
      target = true; continue;
    }
    if (c === "&" && command[i + 1] === ">") { finishWord(); continue; }
    if (c === ";" || c === "|" || c === "&" || c === "\n" || c === "(" || c === ")") { finishSegment(); continue; }
    if (c === " " || c === "\t" || c === "\r" || c === "\v" || c === "\f") { finishWord(); continue; }
    word += c; active = true;
  }
  finishSegment();
  if (quote && segments.length) segments[segments.length - 1].incomplete = true;
  return segments;
}

export function unwrapShellCommand(words) {
  let i = 0, cwd;
  const basename = value => path.posix.basename(value.replaceAll("\\", "/")).replace(/\.(?:exe|cmd)$/i, "").toLowerCase();
  while (i < words.length) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) { i++; continue; }
    const head = basename(words[i]);
    if (!["env", "command", "xargs", "nohup", "timeout", "nice", "sudo", "exec"].includes(head)) break;
    i++;
    while (i < words.length && (words[i].startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]))) {
      const flag = words[i++];
      if (flag.startsWith("--chdir=")) cwd = flag.slice(8);
      if (["-u", "--unset", "--user", "-g", "--group", "-a", "-C", "--chdir", "-n", "--adjustment", "-k", "--kill-after", "-s", "--signal", "-I", "-L", "-P"].includes(flag)) { if (flag === "-C" || flag === "--chdir") cwd = words[i]; i++; }
    }
    if (head === "timeout" && i < words.length) i++;
  }
  const head = i < words.length ? basename(words[i++]) : "";
  if (head === "git") {
    while (i < words.length && words[i].startsWith("-")) {
      const flag = words[i++];
      if (flag === "-C") cwd = words[i++];
      else if (["-c", "--git-dir", "--work-tree", "--namespace"].includes(flag)) i++;
    }
  }
  return { head, args: words.slice(i), cwd };
}

const SAFE_NODE_READ_CALLS = new Set([
  "require", "readFileSync", "statSync", "lstatSync", "readdirSync", "existsSync", "realpathSync",
  "byteLength", "stringify", "parse", "keys", "values", "entries", "split", "slice", "trim", "join",
  "match", "startsWith", "endsWith", "includes", "indexOf", "Number", "String", "Boolean", "isArray",
  "toLowerCase", "toUpperCase", "cwd", "resolve", "relative", "basename", "dirname", "extname",
  "homedir", "tmpdir", "platform", "arch", "max", "min", "round", "floor", "ceil"
]);

function stripJsStrings(expr) {
  let out = "", q = "", start = 0;
  const strings = [];
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (q) {
      if (c === "\\") i++;
      else if (c === q) { strings.push(expr.slice(start + 1, i)); out += `__S${strings.length - 1}__`; q = ""; }
      continue;
    }
    if (c === "'" || c === '"') { q = c; start = i; continue; }
    out += c;
  }
  return q ? null : { code: out, strings };
}

function isSafeReadOnlyNodePrint(args) {
  let expr;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-p" || a === "--print") {
      if (expr !== undefined || i + 1 >= args.length) return false;
      expr = args[++i];
    } else if (a.startsWith("--print=")) {
      if (expr !== undefined) return false;
      expr = a.slice(8);
    } else if (a === "--") {
      if (i !== args.length - 1) return false;
    } else {
      return false;
    }
  }
  if (typeof expr !== "string" || !expr.trim() || expr.length > 1024 || /__S\d+__/.test(expr)) return false;
  const stripped = stripJsStrings(expr);
  if (!stripped) return false;
  const { code, strings } = stripped;
  if (/[`]|[\)\]]\s*\(|\?\.\s*\(|\/\*|\/\/|\\u|=>|\[(?![0-9]+\])|(?<![=!<>])=(?!=)|\bparse\s*\([^()]*,|\b(?:new|function|eval|Function|import|globalThis|Reflect|Proxy|child_process|constructor|__proto__|prototype|class|with|promises|binding|_linkedBinding|dlopen|mainModule)\b/.test(code)) return false;
  if (/\b(?:write|append|rm|unlink|mkdir|rmdir|rename|copy|cp|chmod|chown|truncate|open|close|link|symlink|utimes|lutimes|mkdtemp|watch|createWriteStream|fsync|fdatasync|exec|spawn|fork|kill|exit|abort|chdir|umask|setuid|setgid)\w*\b/i.test(code)) return false;
  for (const m of code.matchAll(/\brequire\s*\(/g)) {
    const req = /^require\s*\(\s*__S(\d+)__\s*\)/.exec(code.slice(m.index));
    if (!req || !/^(?:node:)?(?:fs|path|os|url|util)$/.test(strings[Number(req[1])] ?? "")) return false;
  }
  for (const m of code.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) {
    if (!SAFE_NODE_READ_CALLS.has(m[1])) return false;
  }
  return true;
}

export function shellCommandWrites(segments, allowRedirection) {
  for (const segment of segments) {
    if (segment.dynamic || segment.incomplete || segment.redirections.some(target => !allowRedirection(target))) return true;
    const { head, args } = unwrapShellCommand(segment.words);
    if (["eval", "source", "."].includes(head)) return true;
    if (["rm", "mv", "cp", "dd", "tee", "touch", "truncate", "mkdir", "rmdir", "unlink", "chmod", "chown", "patch"].includes(head)) return true;
    if (["sh", "bash", "zsh", "dash"].includes(head) && args.some(a => /^(?:-[a-z]*c|--command(?:$|=))/i.test(a))) return true;
    if (head === "cmd" && args.some(a => /^\/[ck]$/i.test(a))) return true;
    if (["powershell", "pwsh"].includes(head) && args.some(a => /^(?:-c|-command)$/i.test(a))) return true;
    if (["python", "python3"].includes(head) && args.some(a => /^-[a-z]*c/i.test(a))) return true;
    if (["ruby", "perl"].includes(head) && args.some(a => /^-[a-z]*e/i.test(a))) return true;
    if (head === "node" && args.some(a => /^(?:-[a-z]*[ep]|--eval(?:$|=)|--print(?:$|=))/i.test(a)) && !isSafeReadOnlyNodePrint(args)) return true;
    if (head === "find" && args.includes("-delete")) return true;
    if (["sed", "perl"].includes(head) && args.some(a => /^-[a-z]*i/.test(a))) return true;
    if (head === "git" && ["reset", "clean", "checkout", "apply", "am", "cherry-pick", "merge", "rebase", "restore", "stash", "commit", "switch", "rm", "mv", "add", "update-index", "update-ref"].includes(args[0])) return true;
  }
  return false;
}
