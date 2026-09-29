#!/usr/bin/env node
// Usage: kev [--json] [--root <dir>] <screen file> [...]
import { triage } from "../src/triage.mjs";
import { toMarkdown } from "../src/report.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const rootAt = args.indexOf("--root");
const root = rootAt >= 0 ? args[rootAt + 1] : undefined;
const files = args.filter((a, i) => !a.startsWith("--") && !(rootAt >= 0 && i === rootAt + 1));
if (!files.length) {
  console.error("usage: kev [--json] [--root <dir>] <screen file> [...]");
  process.exit(2);
}
try {
  const r = await triage(files, { root });
  console.log(json ? JSON.stringify(r, null, 2) : toMarkdown(r));
} catch (err) {
  console.error(`kev failed: ${err.message}`);
  process.exit(1);
}
