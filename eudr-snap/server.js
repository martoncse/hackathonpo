// EUDR-Snap server.
// Keeps the Whisp API key on the server (memory only) and exposes:
//   GET  /api/whisp-key        -> { configured }
//   POST /api/whisp-key        { key } -> saves in memory
//   DELETE /api/whisp-key      -> forgets it
//   POST /api/whisp-key/test   -> one test plot against Whisp
//   GET  /api/farms            -> demo farms, receipts, walked boundaries, cooperative
//   POST /api/risk             { plots? } -> Whisp + local rules (live, else saved result)
//   GET  /api/risk/saved       -> saved Whisp result, re-run through current rules
//   GET  /api/review           -> reviewer decisions
//   POST /api/review           { plot_id, decision, reason, reviewer } -> Art 11 entry
//   POST /api/lots             { lots, plots? } -> segregation / taint check
//   POST /api/export           { lot, plots? } -> importer pack (422 if blocked)
//   POST /api/find-plots       -> searches Whisp for real demo plots (one-time setup)
//   POST /api/extract          { imageBase64, mediaType } -> live Claude extraction of a receipt / land document
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analysePlots, testKey, findDemoPlots, WhispError } from "./whisp.js";
import { classify, checkLot, applyRuleOverrides } from "./shared/rules.js";
import { buildPack } from "./shared/export.js";
import { extractDocument, friendlyExtractError, ExtractError } from "./extract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const SHARED_DIR = path.join(here, "shared");
const DATA_DIR = path.join(here, "data");
// Country profile. No EUDR_PROFILE = the original Colombian demo, unchanged.
// EUDR_PROFILE=cocoa-ci loads profiles/cocoa-ci/{profile.json, sample-farms.json, whisp-cache.json}.
const DEFAULT_PROFILE = { id: "", name: "Colombia: coffee and cocoa", country_iso2: "CO", whisp_national_codes: ["co"], rules: {}, story: true };
const PROFILE_ID = process.env.EUDR_PROFILE || "";
if (PROFILE_ID && !/^[a-z0-9-]+$/.test(PROFILE_ID)) throw new Error("EUDR_PROFILE may only contain a-z, 0-9 and -");
const PROFILE_DIR = PROFILE_ID ? path.join(here, "profiles", PROFILE_ID) : null;
const profile = PROFILE_DIR
  ? { ...DEFAULT_PROFILE, story: false, ...JSON.parse(await fs.readFile(path.join(PROFILE_DIR, "profile.json"), "utf8")), id: PROFILE_ID }
  : DEFAULT_PROFILE;
applyRuleOverrides(profile.rules);
const FARMS_FILE = path.join(PROFILE_DIR || PUBLIC_DIR, "sample-farms.json");
const CACHE_FILE = path.join(PROFILE_DIR || PUBLIC_DIR, "whisp-cache.json");
const DECISIONS_FILE = path.join(DATA_DIR, PROFILE_ID ? `decisions-${PROFILE_ID}.json` : "decisions.json");
const PORT = Number(process.env.PORT) || 5174;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BODY_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// In memory only: never written to disk or logged.
let whispKey = process.env.WHISP_API_KEY || "";
let findJob = null;
let decisions = {};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new WhispError("Request body too large", "too_large");
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new WhispError("Body is not valid JSON", "bad_json");
  }
}

async function readJsonFile(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function loadDecisions() {
  decisions = (await readJsonFile(DECISIONS_FILE)) || {};
}

async function saveDecisions() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DECISIONS_FILE, JSON.stringify(decisions, null, 2));
}

function friendly(error) {
  const map = {
    auth_missing_api_key: "No Whisp API key set. Paste one in the key panel.",
    auth_invalid_api_key: "Whisp rejected the API key. Check you copied it from your Whisp account page.",
    auth_rate_limit_exceeded: "Whisp rate limit hit (30 requests/min). Wait a minute.",
    analysis_too_many_concurrent: "Whisp is already running 2 jobs for this key. Wait for them to finish.",
    analysis_timeout: "Whisp took too long to answer.",
  };
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "Whisp didn't answer in time.";
  if (error?.cause?.code === "ENOTFOUND" || error?.message === "fetch failed") return "Can't reach Whisp (no internet?).";
  return map[error?.code] || error?.message || "Unknown error";
}

async function demoFarms() {
  return (await readJsonFile(FARMS_FILE))?.farms || [];
}

function whispMeta(fc, checkedAt) {
  return { version: fc?.features?.[0]?.properties?.whisp_processing_metadata?.whisp_version || null, checked_at: checkedAt };
}

// Saved Whisp response, re-run through the current rules and decisions.
async function savedResult(plots) {
  const cache = await readJsonFile(CACHE_FILE);
  if (!cache?.raw) return null;
  return { source: "cached", checked_at: cache.checked_at, whisp: whispMeta(cache.raw, cache.checked_at), results: classify(plots, cache.raw, decisions), raw: cache.raw };
}

async function handleRisk(req, res) {
  const body = await readJsonBody(req);
  const plots = Array.isArray(body.plots) && body.plots.length ? body.plots : await demoFarms();
  if (!plots.length) return sendJson(res, 400, { error: "No plots to check." });
  try {
    const fc = await analysePlots(plots, whispKey, { maxWaitMs: 60_000, nationalCodes: profile.whisp_national_codes });
    const checkedAt = new Date().toISOString();
    const result = { source: "live", checked_at: checkedAt, whisp: whispMeta(fc, checkedAt), results: classify(plots, fc, decisions), raw: fc };
    // Only the default demo batch refreshes the stage backup.
    if (!body.plots) await fs.writeFile(CACHE_FILE, JSON.stringify({ source: "cached", checked_at: checkedAt, raw: fc }, null, 2));
    return sendJson(res, 200, result);
  } catch (error) {
    const reason = friendly(error);
    console.warn("Live Whisp call failed:", reason);
    const cache = !body.plots ? await savedResult(plots) : null;
    if (cache) return sendJson(res, 200, { ...cache, live_error: reason });
    return sendJson(res, 200, { source: "none", live_error: reason, results: classify(plots, null, decisions) });
  }
}

async function currentResults(plots) {
  return (await savedResult(plots))?.results || classify(plots, null, decisions);
}

async function handleReview(req, res) {
  const { plot_id, decision, reason = "", reviewer = "" } = await readJsonBody(req);
  if (!plot_id) return sendJson(res, 400, { error: "plot_id is required" });
  if (decision === null || decision === "clear") {
    delete decisions[plot_id];
  } else {
    if (!["accept", "mitigate", "exclude"].includes(decision)) return sendJson(res, 400, { error: "decision must be accept, mitigate or exclude" });
    if (decision === "accept" && !String(reason).trim()) return sendJson(res, 400, { error: "Accepting a flagged plot needs a reason (Art 10 record)" });
    decisions[plot_id] = { decision, reason: String(reason).slice(0, 1000), reviewer: String(reviewer).slice(0, 100), at: new Date().toISOString() };
  }
  await saveDecisions();
  return sendJson(res, 200, { decisions });
}

async function handleLots(req, res) {
  const body = await readJsonBody(req);
  const plots = body.plots?.length ? body.plots : await demoFarms();
  const results = await currentResults(plots);
  return sendJson(res, 200, { lots: (body.lots || []).map((lot) => checkLot(lot, plots, results)) });
}

async function handleExport(req, res) {
  const body = await readJsonBody(req);
  const farmsDoc = await readJsonFile(FARMS_FILE);
  const plots = body.plots?.length ? body.plots : farmsDoc?.farms || [];
  const saved = await savedResult(plots);
  const results = saved?.results || classify(plots, null, decisions);
  const pack = await buildPack({ plots, results, lot: body.lot, cooperative: farmsDoc?.cooperative, whisp: saved?.whisp, profile });
  return sendJson(res, pack.blocking.length ? 422 : 200, pack);
}

async function handleExtract(req, res) {
  try {
    const { imageBase64, mediaType } = await readJsonBody(req, MAX_IMAGE_BODY_BYTES);
    if (typeof imageBase64 !== "string" || !imageBase64) throw new ExtractError(400, "No image was sent.");
    if (!IMAGE_TYPES.has(mediaType)) throw new ExtractError(400, "Use a JPEG, PNG, WebP or GIF image.");
    const result = await extractDocument(imageBase64, mediaType);
    return sendJson(res, 200, { source: "live", extracted_at: new Date().toISOString(), ...result });
  } catch (error) {
    if (error instanceof WhispError) return sendJson(res, 413, { error: "Image too large. Use a smaller photo." });
    const [status, message] = friendlyExtractError(error);
    if (status >= 500) console.warn("Extraction failed:", error.message);
    return sendJson(res, status, { error: message });
  }
}

function startFindJob() {
  if (findJob?.running) return;
  findJob = { running: true, percent: 0, error: null, summary: null, started_at: new Date().toISOString() };
  const key = whispKey;
  findDemoPlots(key, (p) => {
    if (p != null) findJob.percent = p;
  })
    .then(async ({ farms, summary }) => {
      const doc = (await readJsonFile(FARMS_FILE)) || {};
      await fs.writeFile(FARMS_FILE, JSON.stringify({ ...doc, verified_with_whisp: true, found_at: new Date().toISOString(), farms }, null, 2));
      const fc = await analysePlots(farms, key, { maxWaitMs: 90_000 });
      await fs.writeFile(CACHE_FILE, JSON.stringify({ source: "cached", checked_at: new Date().toISOString(), raw: fc }, null, 2));
      findJob = { ...findJob, running: false, percent: 100, summary };
    })
    .catch((error) => {
      findJob = { ...findJob, running: false, error: friendly(error) };
    });
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  // /shared/* is served from the shared rules folder so the browser runs the same rules.
  const [base, relative] = urlPath.startsWith("/shared/")
    ? [SHARED_DIR, urlPath.slice("/shared/".length)]
    : [PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "")];
  const filePath = path.resolve(base, relative);
  if (!filePath.startsWith(base + path.sep)) return res.writeHead(403).end("Forbidden");
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

async function route(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    return res.end();
  }
  if (pathname === "/api/whisp-key" && req.method === "GET") return sendJson(res, 200, { configured: Boolean(whispKey) });
  if (pathname === "/api/whisp-key" && req.method === "POST") {
    const { key } = await readJsonBody(req);
    if (typeof key !== "string" || !key.trim()) return sendJson(res, 400, { error: "Paste a key first." });
    whispKey = key.trim();
    return sendJson(res, 200, { configured: true });
  }
  if (pathname === "/api/whisp-key" && req.method === "DELETE") {
    whispKey = "";
    return sendJson(res, 200, { configured: false });
  }
  if (pathname === "/api/whisp-key/test" && req.method === "POST") {
    try {
      return sendJson(res, 200, await testKey(whispKey));
    } catch (error) {
      return sendJson(res, 200, { ok: false, error: friendly(error) });
    }
  }
  if (pathname === "/api/farms" && req.method === "GET") return sendJson(res, 200, { ...((await readJsonFile(FARMS_FILE)) || { farms: [] }), profile });
  if (pathname === "/api/risk" && req.method === "POST") return handleRisk(req, res);
  if (pathname === "/api/risk/saved" && req.method === "GET") {
    return sendJson(res, 200, (await savedResult(await demoFarms())) || { source: "none", results: [] });
  }
  if (pathname === "/api/review" && req.method === "GET") return sendJson(res, 200, { decisions });
  if (pathname === "/api/review" && req.method === "POST") return handleReview(req, res);
  if (pathname === "/api/lots" && req.method === "POST") return handleLots(req, res);
  if (pathname === "/api/export" && req.method === "POST") return handleExport(req, res);
  if (pathname === "/api/extract" && req.method === "POST") return handleExtract(req, res);
  if (pathname === "/api/find-plots" && req.method === "POST") {
    if (PROFILE_ID) return sendJson(res, 400, { error: "The plot finder only exists for the Colombian demo." });
    if (!whispKey) return sendJson(res, 400, { error: friendly({ code: "auth_missing_api_key" }) });
    startFindJob();
    return sendJson(res, 202, findJob);
  }
  if (pathname === "/api/find-plots" && req.method === "GET") return sendJson(res, 200, findJob || { running: false });
  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405).end("Method not allowed");
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    console.error(error.message);
    if (!res.headersSent) sendJson(res, 400, { error: friendly(error) });
  });
});

await loadDecisions();
server.listen(PORT, () => {
  console.log(`EUDR-Snap running at http://localhost:${PORT} (profile: ${profile.name})`);
  console.log(whispKey ? "Whisp key loaded from WHISP_API_KEY." : "No Whisp key yet: paste one in the page.");
});
