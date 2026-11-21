// MedAlert server.
//   GET  /api/state            -> active alerts summary, stock log, quarantine state
//   POST /api/extract          { imageBase64, mediaType, sample? } -> pack fields (vision; cached for demo samples)
//   POST /api/check            { pack } -> verdict (deterministic matcher + register lookup)
//   POST /api/replay-alert     { id } -> activates a replayed alert and sweeps the stock log
//   POST /api/quarantine       { entry_id } -> marks a stock entry quarantined
//   POST /api/reset            -> back to the start of the demo
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { checkPack, cdscoToAlerts, sweep, normBatch } from "./shared/match.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const SHARED_DIR = path.join(here, "shared");
const DATA_DIR = path.join(here, "data");
const PORT = Number(process.env.PORT) || 5175;
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const VISION_TIMEOUT_MS = 8000;
const REGISTER_TIMEOUT_MS = 5000;

const readData = async (name) => JSON.parse(await fs.readFile(path.join(DATA_DIR, name), "utf8"));
const baseAlerts = (await readData("alerts.json")).alerts;
const cdsco = await readData("cdsco-nsq-sep2026.json");
const cdscoAlerts = cdscoToAlerts(cdsco);
const greenbook = await readData("greenbook-cache.json");
const stockLog = await readData("stock-log.json");
const samples = await readData("samples.json");

let state;
function resetState() {
  state = {
    replayed: new Set(),
    quarantined: new Set(),
    reports: [],
  };
}
resetState();

function activeAlerts() {
  return [...baseAlerts.filter((a) => !a.replay || state.replayed.has(a.id)), ...cdscoAlerts];
}

// ---------- Vision extraction ----------

const PackFields = z.object({
  product: z.string().nullable().describe("Product / brand name as printed, e.g. 'Quinine Sulphate Tablets B.P.'"),
  strength: z.string().nullable().describe("Strength as printed, e.g. '300mg'. Null if not visible"),
  batch: z.string().nullable().describe("Lot / batch number exactly as printed, character by character. Null if unreadable"),
  manufacturer: z.string().nullable().describe("Manufacturer name as printed"),
  mfg_date: z.string().nullable().describe("Manufacturing date as printed, MM/YYYY if possible"),
  expiry: z.string().nullable().describe("Expiry date as printed, MM/YYYY if possible"),
  registration_no: z
    .string()
    .nullable()
    .describe("NAFDAC registration number only (formats like 04-3143, A4-1237, B4-6010). Null if none is printed"),
  other_marks: z.string().nullable().describe("Other authorisation numbers, scratch-code labels or barcodes seen, short"),
  uncertain_fields: z.array(z.string()).describe("Names of fields that were hard to read or guessed. Empty if none"),
});

const SYSTEM_PROMPT = `You read photos of medicine packs (cartons, tubs, blisters) received at a hospital pharmacy.
Extract what is printed. Copy; do not infer or correct. Never invent a batch number, date or registration number.
If a field is not visible or not readable, return null and list it in uncertain_fields.
Copy the batch number character by character; if any character is unclear (0/O, 1/I, 5/S, 8/B), list "batch" in uncertain_fields.
Only put a NAFDAC registration number in registration_no; put other countries' authorisation numbers in other_marks.`;

let client = null;
function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

async function extractFields(imageBase64, mediaType) {
  const response = await anthropic().beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(PackFields) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Read this medicine pack." },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new UserFacingError(422, "The model declined to read this photo.");
  if (!response.parsed_output) throw new UserFacingError(502, "Could not read the pack. Type the batch instead.");
  return response.parsed_output;
}

const timeout = (ms, label) =>
  new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error(label), { isTimeout: true })), ms));

async function handleExtract(body) {
  const { imageBase64, mediaType, sample } = body;
  const cached = sample ? samples.samples.find((s) => s.id === sample) : null;
  if (!imageBase64 && !cached) throw new UserFacingError(400, "No photo was sent.");
  if (imageBase64 && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)) {
    throw new UserFacingError(400, "Use a JPEG, PNG or WebP photo.");
  }
  if (!imageBase64 || !process.env.ANTHROPIC_API_KEY) {
    if (cached) return { fields: cached.fields, source: "cached", why: "No AI key on this server: showing the saved reading of this demo photo." };
    throw new UserFacingError(503, "Photo reading is off on this server. Type the batch instead.");
  }
  try {
    const fields = await Promise.race([extractFields(imageBase64, mediaType), timeout(VISION_TIMEOUT_MS, "vision timeout")]);
    return { fields, source: "live" };
  } catch (error) {
    if (cached) {
      const why = error.isTimeout ? "Reading took over 8 s: showing the saved reading of this demo photo." : "Live reading failed: showing the saved reading of this demo photo.";
      console.error("extract fallback:", error.message);
      return { fields: cached.fields, source: "cached", why };
    }
    if (error.isTimeout) throw new UserFacingError(504, "Reading took over 8 s. Type the batch instead.");
    if (error instanceof UserFacingError) throw error;
    console.error("extract error:", error.message);
    throw new UserFacingError(502, "Could not read the photo. Type the batch instead.");
  }
}

// ---------- Register lookup (NAFDAC Greenbook) ----------

const normReg = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

async function lookupRegister(regNo) {
  if (!regNo) return { checked: false, found: null, source: "none" };
  const fromCache = greenbook.products.find((p) => normReg(p.reg_no) === normReg(regNo)) || null;
  try {
    const url = `https://greenbook.nafdac.gov.ng/?draw=1&start=0&length=5&search[value]=${encodeURIComponent(regNo.trim())}`;
    const res = await fetch(url, {
      headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0 (MedAlert prototype)" },
      signal: AbortSignal.timeout(REGISTER_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`register HTTP ${res.status}`);
    const json = await res.json();
    const row = (json.data || []).find((r) => normReg(r.NAFDAC) === normReg(regNo));
    const found = row
      ? {
          reg_no: row.NAFDAC,
          product: row.product_name.replace(/[#*_ ]+$/, "").trim(),
          strength: row.strength,
          applicant: row.applicant?.name,
          status: row.status,
          expiry_date: row.expiry_date,
          ingredient: row.ingredient?.ingredient_name,
        }
      : null;
    return { checked: true, found, source: "live" };
  } catch (error) {
    console.error("register lookup fallback:", error.message);
    if (fromCache) return { checked: true, found: fromCache, source: "cache" };
    return { checked: false, found: null, source: "none" };
  }
}

async function handleCheck(body) {
  const pack = body.pack || {};
  if (!normBatch(pack.batch)) throw new UserFacingError(400, "Enter the batch number first.");
  const register = await lookupRegister(pack.registration_no);
  const verdict = checkPack(pack, activeAlerts(), register);
  const ids = new Set(verdict.reasons.map((r) => r.alert_id).filter(Boolean));
  const alerts = activeAlerts().filter((a) => ids.has(a.id));
  return { verdict, alerts, register };
}

function handleReplay(body) {
  const alert = baseAlerts.find((a) => a.id === body.id && a.replay);
  if (!alert) throw new UserFacingError(404, "Unknown alert.");
  state.replayed.add(alert.id);
  return { alert, hits: sweep(alert, stockLog.entries) };
}

function publicState() {
  const active = activeAlerts();
  const byIssuer = {};
  for (const a of active) byIssuer[a.issuer] = (byIssuer[a.issuer] || 0) + 1;
  return {
    alerts_by_issuer: byIssuer,
    pending_replays: baseAlerts.filter((a) => a.replay && !state.replayed.has(a.id)).map((a) => ({ id: a.id, title: a.title, date: a.date })),
    stock: stockLog,
    quarantined: [...state.quarantined],
    vision: Boolean(process.env.ANTHROPIC_API_KEY),
    samples: samples.samples.map(({ id, label, photo, credit, typed }) => ({ id, label, photo, credit, typed })),
    cdsco: { source: cdsco.source, source_url: cdsco.source_url, note: cdsco.note, count: cdsco.rows.length },
  };
}

// ---------- HTTP plumbing ----------

class UserFacingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new UserFacingError(413, "Photo too large. Use a smaller photo.");
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new UserFacingError(400, "Request body is not valid JSON.");
  }
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let root = PUBLIC_DIR;
  let relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  if (relative.startsWith("shared/")) {
    root = SHARED_DIR;
    relative = relative.slice("shared/".length);
  }
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep)) return res.writeHead(403).end("Forbidden");
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

const routes = {
  "POST /api/extract": handleExtract,
  "POST /api/check": handleCheck,
  "POST /api/replay-alert": handleReplay,
  "POST /api/quarantine": (b) => {
    if (b.entry_id) state.quarantined.add(b.entry_id);
    return publicState();
  },
  "POST /api/reset": () => {
    resetState();
    return publicState();
  },
  "GET /api/state": () => publicState(),
};

const server = http.createServer(async (req, res) => {
  const route = routes[`${req.method} ${new URL(req.url, "http://localhost").pathname}`];
  if (route) {
    try {
      const body = req.method === "POST" ? await readJsonBody(req) : {};
      sendJson(res, 200, await route(body));
    } catch (error) {
      if (error instanceof UserFacingError) sendJson(res, error.status, { error: error.message });
      else {
        console.error(error);
        sendJson(res, 500, { error: "Something went wrong on the server." });
      }
    }
  } else if (req.method === "GET") serveStatic(req, res);
  else res.writeHead(405).end("Method not allowed");
});

server.listen(PORT, () => console.log(`MedAlert running at http://localhost:${PORT}`));
