import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { publish } from "./handoffs.mjs";

function ensureDirectory(root, relative, created = [], verifiedDirs) {
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

function createRun(root, created) {
  const parent = ensureDirectory(root, "scratch/agy-squad", created);
  const id = randomUUID();
  const directory = path.join(parent, `run-${id}`);
  fs.mkdirSync(directory, { mode: 0o700 });
  return { id, relative: path.relative(root, directory), directory };
}

function stagePlan(root, run, squads) {
  if (!/^scratch\/agy-squad\/run-[0-9a-f-]{36}$/.test(run)) {
    throw new Error("Invalid managed run directory.");
  }
  const directory = path.join(root, run);
  if (fs.realpathSync(directory) !== directory || !fs.lstatSync(directory).isDirectory()) {
    throw new Error("Managed run directory must be a real workspace directory.");
  }
  const contents = Buffer.from(JSON.stringify({ squads }, null, 2) + "\n");
  const key = createHash("sha256").update(contents).digest("hex").slice(0, 24);
  const reportRoot = `${run}/plan-${key}`;
  const manifestPath = `${reportRoot}/manifest.json`;
  return {
    reportRoot,
    manifestPath,
    prepare(slots) {
      const verifiedDirs = new Set();
      for (const slot of slots) {
        ensureDirectory(root, path.posix.dirname(slot), undefined, verifiedDirs);
        try {
          fs.lstatSync(path.join(root, slot));
          throw new Error(`Report slot is already occupied: ${slot}. Use a fresh squad ID for a retry.`);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      publish(root, manifestPath, contents);
    }
  };
}

export { createRun, ensureDirectory, stagePlan };
