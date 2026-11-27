import fs from "node:fs";
import path from "node:path";

export function tryRealPath(candidate) {
  let cur = path.resolve(candidate);
  const tail = [];
  while (true) {
    try { return path.join(fs.realpathSync.native(cur), ...tail); } catch {}
    const parent = path.dirname(cur);
    if (parent === cur) return path.resolve(candidate);
    tail.unshift(path.basename(cur));
    cur = parent;
  }
}

const CASE_INSENSITIVE_FS = process.platform === "win32" || process.platform === "darwin";

export function resolveWriteTargetPath(resolved, maxHops = 16) {
  let current = resolved;
  const seen = new Set();
  while (true) {
    const parentReal = tryRealPath(path.dirname(current));
    const canonicalCur = path.join(parentReal, path.basename(current));
    let st;
    try {
      st = fs.lstatSync(canonicalCur);
    } catch {
      return tryRealPath(canonicalCur);
    }
    if (!st.isSymbolicLink()) return tryRealPath(canonicalCur);
    const key = CASE_INSENSITIVE_FS ? canonicalCur.toLowerCase() : canonicalCur;
    if (seen.has(key) || seen.size >= maxHops) return null;
    seen.add(key);
    try {
      current = path.resolve(parentReal, fs.readlinkSync(canonicalCur));
    } catch {
      return null;
    }
  }
}
