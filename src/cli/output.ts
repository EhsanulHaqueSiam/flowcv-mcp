/**
 * CLI output formatting helpers.
 * Uses ANSI escape codes directly (no external deps).
 */

import { createInterface } from "node:readline";

// ANSI color codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

export function printSuccess(msg: string): void {
  console.log(`${GREEN}\u2714${RESET} ${msg}`);
}

export function printError(msg: string): void {
  console.error(`${RED}\u2718${RESET} ${msg}`);
}

export function printWarn(msg: string): void {
  console.error(`${YELLOW}!${RESET} ${msg}`);
}

export function printInfo(msg: string): void {
  console.log(`${CYAN}i${RESET} ${msg}`);
}

export function printJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = rows.reduce((max, row) => Math.max(max, (row[i] || "").length), 0);
    return Math.max(h.length, maxDataWidth);
  });

  const separator = colWidths.map(w => "-".repeat(w + 2)).join("+");
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell || "").padEnd(colWidths[i])} `).join("|");

  console.log(`${BOLD}${formatRow(headers)}${RESET}`);
  console.log(separator);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}

export function printKeyValue(pairs: [string, string][]): void {
  const maxKeyLen = pairs.reduce((max, [k]) => Math.max(max, k.length), 0);
  for (const [key, value] of pairs) {
    console.log(`  ${DIM}${key.padEnd(maxKeyLen)}${RESET}  ${value}`);
  }
}

export async function confirm(msg: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(`${YELLOW}?${RESET} ${msg} [y/N] `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

export function requireArg(value: string | undefined, usage: string): asserts value is string {
  if (!value) {
    printError(usage);
    process.exit(1);
  }
}

export function parseJSONFlag<T = Record<string, unknown>>(raw: string | boolean | undefined, hint = "--data flag is required."): T {
  if (!raw || typeof raw !== "string") {
    printError(hint);
    process.exit(1);
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    printError("Invalid JSON.");
    process.exit(1);
  }
}

export async function confirmOrCancel(quiet: boolean, msg: string): Promise<boolean> {
  if (quiet) return true;
  const ok = await confirm(msg);
  if (!ok) console.log("Cancelled.");
  return ok;
}

export async function prompt(msg: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(`${CYAN}>${RESET} ${msg}: `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
