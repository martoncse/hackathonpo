// CLI fallback for the "Find real plots with Whisp" button.
// Usage (PowerShell): $env:WHISP_API_KEY = "<key>"; npm run find-red
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analysePlots, findDemoPlots } from "../whisp.js";
import { classify } from "../shared/rules.js";

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const key = process.env.WHISP_API_KEY;
if (!key) {
  console.error("Set WHISP_API_KEY first.");
  process.exit(1);
}

console.log("Sending candidate plots to Whisp (this can take a few minutes)...");
const { farms, summary } = await findDemoPlots(key, (p) => p != null && process.stdout.write(`\r${p}% `));
console.log("\n", summary);
const farmsFile = path.join(pub, "sample-farms.json");
const doc = JSON.parse(await fs.readFile(farmsFile, "utf8").catch(() => "{}"));
await fs.writeFile(farmsFile, JSON.stringify({ ...doc, verified_with_whisp: true, found_at: new Date().toISOString(), farms }, null, 2));
const fc = await analysePlots(farms, key, { maxWaitMs: 90_000 });
await fs.writeFile(path.join(pub, "whisp-cache.json"), JSON.stringify({ source: "cached", checked_at: new Date().toISOString(), raw: fc }, null, 2));
for (const r of classify(farms, fc)) console.log(r.id, r.status, r.whisp_risk, "|", r.reasons.join("; "));
console.log("Note: the walked boundary for Buenavista in sample-farms.json refers to the old F4 point; regenerate it if F4 moved.");
