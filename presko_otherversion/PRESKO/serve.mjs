// Tiny static server for the Presko prototype (no dependencies).
// Browsers block ES-module imports from file://, so open the page through this instead:
//   node PRESKO/serve.mjs   ->   http://localhost:5180 (opens the app)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5180;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".json": "application/json" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/" || path === "/app") { res.writeHead(302, { Location: "/app/" }).end(); return; }
  const file = normalize(join(ROOT, path.endsWith("/") ? `${path}index.html` : path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Presko: http://localhost:${PORT}`));
