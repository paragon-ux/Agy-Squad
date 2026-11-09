import fs from "node:fs";

export function readLedger(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  } catch {
    return [];
  }
}

export function appendLedgerEntry(ledgerPath, entry) {
  const entries = readLedger(ledgerPath);
  if (entries.some(existing => existing.requestId === entry.requestId)) {
    return { duplicate: true, count: entries.length };
  }
  entries.push(entry);
  fs.writeFileSync(ledgerPath, JSON.stringify(entries, null, 2));
  return { duplicate: false, count: entries.length };
}
