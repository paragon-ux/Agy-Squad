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

export function shellCommandWrites(segments, allowRedirection) {
  for (const segment of segments) {
    if (segment.dynamic || segment.incomplete || segment.redirections.some(target => !allowRedirection(target))) return true;
    const { head, args } = unwrapShellCommand(segment.words);
    if (["eval", "source", "."].includes(head)) return true;
    if (["rm", "mv", "cp", "dd", "tee", "touch", "truncate", "mkdir", "rmdir", "unlink", "chmod", "chown", "patch"].includes(head)) return true;
    if (["sh", "bash", "zsh", "dash", "cmd", "powershell", "pwsh", "node", "python", "python3", "ruby", "perl"].includes(head) && args.some(a => /^(?:-[a-z]*[cep]|--eval(?:$|=)|--print(?:$|=)|--command(?:$|=)|\/c)/i.test(a))) return true;
    if (["sed", "perl"].includes(head) && args.some(a => /^-[a-z]*i/.test(a))) return true;
    if (head === "git" && ["reset", "clean", "checkout", "apply", "am", "cherry-pick", "merge", "rebase", "restore", "stash", "commit", "switch", "rm", "mv", "add", "update-index", "update-ref"].includes(args[0])) return true;
  }
  return false;
}
