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
//   GET  /api/deliveries       -> purchases recorded in the app (receipts typed in or read from a photo)
//   POST /api/deliveries       { plot_id, date, season, kg, receipt, source? } -> records one purchase, re-runs the rules
//   DELETE /api/deliveries     -> removes the recorded purchases (demo reset)
//   POST /api/lots/create      { buyer: { name, email? }, plot_ids? } -> frozen pack for a named EU buyer + private share link
//   GET  /api/lots/register    -> the cooperative's lots, buyers and filing status
//   GET  /api/share/:token     -> the buyer's view of one lot (pack, checks, filing)
//   POST /api/share/:token/filing { reference, verification } -> the importer records its filed DDS
//   POST /api/extract          { imageBase64, mediaType } -> live Claude extraction of a receipt / land document
//   GET  /api/passport/key     -> the cooperative's public signing key and fingerprint
//   GET  /api/passports        -> passports issued so far (summaries, newest last)
//   GET  /api/passports/:id    -> one signed passport (what /verify.html checks)
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analysePlots, testKey, findDemoPlots, WhispError } from "./whisp.js";
import { classify, checkLot, applyRuleOverrides } from "./shared/rules.js";
import { buildPack } from "./shared/export.js";
import { buildPassportPayload, signPassport, generateSigningKey, publicJwkOf, keyFingerprint, sha256Hex, canonicalize } from "./shared/passport.js";
import { extractDocument, friendlyExtractError, ExtractError } from "./extract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const SHARED_DIR = path.join(here, "shared");
// EUDR_DATA_DIR / EUDR_WHISP_CACHE: used by the end-to-end test to keep its files out of the repo.
// On Vercel only /tmp is writable (temporary, per instance): recorded purchases and decisions live there.
const HOSTED = Boolean(process.env.VERCEL);
const DATA_DIR = process.env.EUDR_DATA_DIR ? path.resolve(process.env.EUDR_DATA_DIR) : HOSTED ? "/tmp/eudr-snap-data" : path.join(here, "data");
// Country profile. No EUDR_PROFILE = the original Colombian demo, unchanged.
// EUDR_PROFILE=cocoa-ci loads profiles/cocoa-ci/{profile.json, sample-farms.json, whisp-cache.json}.
const DEFAULT_PROFILE = { id: "", name: "Colombia: coffee and cocoa", country_iso2: "CO", country_risk: "standard", whisp_national_codes: ["co"], rules: {}, story: true };
const PROFILE_ID = process.env.EUDR_PROFILE || "";
if (PROFILE_ID && !/^[a-z0-9-]+$/.test(PROFILE_ID)) throw new Error("EUDR_PROFILE may only contain a-z, 0-9 and -");
const PROFILE_DIR = PROFILE_ID ? path.join(here, "profiles", PROFILE_ID) : null;
const profile = PROFILE_DIR
  ? { ...DEFAULT_PROFILE, story: false, ...JSON.parse(await fs.readFile(path.join(PROFILE_DIR, "profile.json"), "utf8")), id: PROFILE_ID }
  : DEFAULT_PROFILE;
applyRuleOverrides(profile.rules);
const FARMS_FILE = path.join(PROFILE_DIR || PUBLIC_DIR, "sample-farms.json");
const CACHE_FILE = process.env.EUDR_WHISP_CACHE ? path.resolve(process.env.EUDR_WHISP_CACHE) : path.join(PROFILE_DIR || PUBLIC_DIR, "whisp-cache.json");
const DELIVERIES_FILE = path.join(DATA_DIR, PROFILE_ID ? `deliveries-${PROFILE_ID}.json` : "deliveries.json");
const LOTS_FILE = path.join(DATA_DIR, PROFILE_ID ? `lots-${PROFILE_ID}.json` : "lots.json");
const DECISIONS_FILE = path.join(DATA_DIR, PROFILE_ID ? `decisions-${PROFILE_ID}.json` : "decisions.json");
const PASSPORTS_FILE = path.join(DATA_DIR, PROFILE_ID ? `passports-${PROFILE_ID}.json` : "passports.json");
const PASSPORT_KEY_FILE = path.join(DATA_DIR, PROFILE_ID ? `passport-key-${PROFILE_ID}.json` : "passport-key.json");
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

// The cooperative's signing key (ECDSA P-256). EUDR_PASSPORT_KEY (a private JWK) keeps it stable
// on a host; otherwise it is created once and kept in the data folder. Prototype: in production the
// key belongs to the cooperative (its own device or a key service), not to whoever runs the server.
let signingKey = null;
async function passportKey() {
  if (signingKey) return signingKey;
  if (process.env.EUDR_PASSPORT_KEY) signingKey = JSON.parse(process.env.EUDR_PASSPORT_KEY);
  else signingKey = await readJsonFile(PASSPORT_KEY_FILE);
  if (!signingKey?.d) {
    signingKey = await generateSigningKey();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(PASSPORT_KEY_FILE, JSON.stringify(signingKey));
  }
  return signingKey;
}

// Signs a passport for a pack that passed every check, chains it to the cooperative's previous one,
// and puts it first in pack.documents. Call inside serial() (the ledger is read, then written).
async function attachPassport(pack, args) {
  const passport = await issuePassportNow(args);
  const content = JSON.stringify(passport, null, 2);
  const p = passport.payload;
  pack.passport = { id: p.passport_id, key_fingerprint: p.issuer.key_fingerprint, sequence: p.history.sequence, verify_url: `/verify.html?id=${encodeURIComponent(p.passport_id)}` };
  pack.documents.unshift({ id: "passport", title: "Shipment Evidence Passport (signed)", subtitle: `${p.passport_id} · signed by the cooperative · key ${p.issuer.key_fingerprint}`, filename: `passport-${p.passport_id}.json`, mime: "application/json", content, sha256: await sha256Hex(content) });
  return pack.passport;
}

async function issuePassportNow(args) {
  {
    const key = await passportKey();
    const ledger = (await readJsonFile(PASSPORTS_FILE)) || [];
    const prev = ledger.at(-1) || null;
    const payload = await buildPassportPayload({ ...args, profile, publicJwk: publicJwkOf(key), previous: prev && { id: prev.id, sha256: prev.sha256, sequence: prev.sequence } });
    const passport = await signPassport(payload, key);
    const sha256 = await sha256Hex(canonicalize(passport));
    ledger.push({ id: payload.passport_id, sha256, sequence: payload.history.sequence, issued_at: payload.issued_at, lot_id: payload.shipment.lot_id, plots: payload.shipment.plots, passport });
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(PASSPORTS_FILE, JSON.stringify(ledger, null, 2));
    return passport;
  }
}

function friendly(error) {
  const map = {
    auth_missing_api_key: HOSTED ? "No Whisp API key on this server. Set WHISP_API_KEY in the Vercel project settings and redeploy (a key pasted in the panel only lasts for one serverless instance)." : "No Whisp API key set. Paste one in the key panel.",
    auth_invalid_api_key: "Whisp rejected the API key. Check you copied it from your Whisp account page.",
    auth_rate_limit_exceeded: "Whisp rate limit hit (30 requests/min). Wait a minute.",
    analysis_too_many_concurrent: "Whisp is already running 2 jobs for this key. Wait for them to finish.",
    analysis_timeout: "Whisp took too long to answer.",
  };
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "Whisp didn't answer in time.";
  if (error?.cause?.code === "ENOTFOUND" || error?.message === "fetch failed") return "Can't reach Whisp (no internet?).";
  return map[error?.code] || error?.message || "Unknown error";
}

// The sample farms plus the purchases recorded in the app (kept apart, so the sample file stays clean).
async function farmsDoc() {
  const doc = (await readJsonFile(FARMS_FILE)) || { farms: [] };
  const recorded = (await readJsonFile(DELIVERIES_FILE)) || [];
  const farms = (doc.farms || []).map((f) => {
    const extra = recorded.filter((d) => d.plot_id === f.id).map(({ plot_id, ...d }) => d);
    return extra.length ? { ...f, deliveries: [...(f.deliveries || []), ...extra] } : f;
  });
  return { ...doc, farms };
}

async function demoFarms() {
  return (await farmsDoc()).farms;
}

const SEASON_RE = /^[0-9]{4}(-[0-9A-Za-z]{1,4})?$/;

// The season a purchase date falls in, when the profile defines campaigns (Côte d'Ivoire:
// October to September, "2025-26"). Without a rule, the season must already exist in the data.
export function seasonForDate(date, rule) {
  if (!rule?.campaign_start_month) return null;
  const [y, m] = date.split("-").map(Number);
  const start = m >= rule.campaign_start_month ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

// Writes to the JSON files go one at a time, so two requests can't both pass the duplicate check.
let writeChain = Promise.resolve();
const serial = (fn) => (writeChain = writeChain.then(fn, fn));

async function handleAddDelivery(req, res) {
  const b = await readJsonBody(req);
  return serial(() => addDelivery(b, res));
}

async function addDelivery(b, res) {
  const farms = await demoFarms();
  const plot = farms.find((f) => f.id === b.plot_id);
  if (!plot) return sendJson(res, 400, { error: "Pick the plot (or producer) this purchase came from." });
  const kg = Number(b.kg);
  if (!(kg > 0 && kg <= 100000)) return sendJson(res, 400, { error: "Weight must be a number of kg between 0 and 100,000." });
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(b.date || "")) || Number.isNaN(Date.parse(b.date))) return sendJson(res, 400, { error: "Date must be yyyy-mm-dd." });
  if (!SEASON_RE.test(String(b.season || ""))) return sendJson(res, 400, { error: "Season must look like 2025-26 or 2026-A." });
  if (b.date > new Date().toISOString().slice(0, 10)) return sendJson(res, 400, { error: "The purchase date is in the future." });
  const expected = seasonForDate(b.date, profile.season_rule);
  if (expected && b.season !== expected) return sendJson(res, 400, { error: `A purchase on ${b.date} belongs to season ${expected}, not ${b.season}.` });
  if (!expected && !farms.some((f) => (f.deliveries || []).some((d) => d.season === b.season))) {
    return sendJson(res, 400, { error: `Season ${b.season} isn't in the cooperative's records. Use one of: ${[...new Set(farms.flatMap((f) => (f.deliveries || []).map((d) => d.season)))].sort().join(", ")}.` });
  }
  const receipt = String(b.receipt || "").trim().slice(0, 40);
  if (!receipt) return sendJson(res, 400, { error: "The receipt number is required: it links the purchase to the paper record." });
  if (farms.some((f) => (f.deliveries || []).some((d) => d.receipt === receipt))) return sendJson(res, 409, { error: `Receipt ${receipt} is already recorded.` });
  const unit = plot.deliveries?.[0]?.unit || (String(plot.crop).toLowerCase() === "coffee" ? "kg pergamino seco" : "kg");
  const entry = { plot_id: plot.id, date: b.date, season: b.season, kg, unit, receipt, source: b.source === "photo" ? "photo, fields accepted by a person" : "typed in", recorded_at: new Date().toISOString() };
  const recorded = (await readJsonFile(DELIVERIES_FILE)) || [];
  recorded.push(entry);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DELIVERIES_FILE, JSON.stringify(recorded, null, 2));
  // New volume = new evidence: an earlier accept on this plot (or any plot on the same card)
  // no longer covers it, so the review reopens.
  const reopened = farms.filter((f) => f.id === plot.id || (plot.producer_card && f.producer_card === plot.producer_card)).map((f) => f.id).filter((id) => decisions[id]);
  for (const id of reopened) delete decisions[id];
  if (reopened.length) await saveDecisions();
  const plots = await demoFarms();
  return sendJson(res, 201, { delivery: entry, reopened, result: (await currentResults(plots)).find((r) => r.id === plot.id) });
}

// ---------- lots for named buyers ----------
// A lot is the handoff from the cooperative (data custodian) to one EU importer (operator).
// Its pack is frozen when created: buyer and cooperative keep the same hashed evidence.
// Each purchase receipt can go into one EU lot only, so the same volume can't be sold twice.

const BUYER_NAME_MAX = 120;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}$/;
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/;

async function readLots() {
  return (await readJsonFile(LOTS_FILE)) || [];
}

async function writeLots(lots) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LOTS_FILE, JSON.stringify(lots, null, 2));
}

function lotSummary(l) {
  return { id: l.id, buyer: l.buyer, plot_ids: l.plot_ids, receipts: l.receipts, kg: l.kg, kg_unit: l.kg_unit, created_at: l.created_at, status: l.status, filing: l.filing, left_out: l.left_out, passport: l.passport || null, importer_decisions: l.importer_decisions || [], share_path: `/buyer.html#${l.token}` };
}

// Picks the receipts of the season each plot was checked on, minus receipts already in a lot.
// Plots on the same producer card travel together (the card's sales can't be split).
export function allocateReceipts(plots, results, plotIds, usedReceipts) {
  const res = new Map(results.map((r) => [r.id, r]));
  const chosen = new Set(plotIds);
  for (const p of plots) {
    if (!chosen.has(p.id) || !p.producer_card) continue;
    for (const q of plots) if (q.producer_card === p.producer_card && q.crop === p.crop) chosen.add(q.id);
  }
  const receipts = [];
  const withGoods = new Set();
  for (const p of plots) {
    if (!chosen.has(p.id)) continue;
    const season = res.get(p.id)?.yield?.season;
    for (const d of p.deliveries || []) {
      if ((!season || d.season === season) && !usedReceipts.has(d.receipt)) {
        receipts.push(d.receipt);
        withGoods.add(p.id);
      }
    }
  }
  const cardsWithGoods = new Set(plots.filter((p) => withGoods.has(p.id) && p.producer_card).map((p) => p.producer_card));
  const include = plots.filter((p) => chosen.has(p.id) && (withGoods.has(p.id) || (p.producer_card && cardsWithGoods.has(p.producer_card)))).map((p) => p.id);
  const exhausted = [...chosen].filter((id) => !include.includes(id));
  return { receipts, plot_ids: include, exhausted };
}

async function handleCreateLot(req, res) {
  const body = await readJsonBody(req);
  return serial(() => createLot(body, res));
}

async function createLot(body, res) {
  const name = String(body.buyer?.name || "").trim();
  if (!name) return sendJson(res, 400, { error: "Name the EU buyer (the importer that will file the due diligence statement)." });
  if (name.length > BUYER_NAME_MAX) return sendJson(res, 400, { error: "Buyer name is too long." });
  const email = String(body.buyer?.email || "").trim();
  if (email && !EMAIL_RE.test(email)) return sendJson(res, 400, { error: "That contact email doesn't look right." });
  const doc = await farmsDoc();
  const plots = doc.farms;
  const saved = await savedResult(plots);
  const results = saved?.results || classify(plots, null, decisions);
  const eligible = new Set(results.filter((r) => r.eligible).map((r) => r.id));
  const requested = Array.isArray(body.plot_ids) && body.plot_ids.length ? body.plot_ids.map(String) : [...eligible];
  if (!requested.length) return sendJson(res, 422, { error: "No plot is cleared yet. Check with Whisp and review the flagged plots first." });
  const notCleared = requested.filter((pid) => !eligible.has(pid));
  if (notCleared.length) return sendJson(res, 422, { error: `Not cleared, so it can't go into an EU lot: ${notCleared.join(", ")}.` });
  const lots = await readLots();
  const used = new Set(lots.flatMap((l) => l.receipts));
  const alloc = allocateReceipts(plots, results, requested, used);
  if (!alloc.receipts.length) return sendJson(res, 409, { error: "Every purchase from these plots is already in another lot. Record new purchases first." });
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const id = `${profile.country_iso2}-${date}-${String(lots.filter((l) => l.id.includes(date)).length + 1).padStart(2, "0")}`;
  const lot = { id, market: "EU", plot_ids: alloc.plot_ids, receipts: alloc.receipts, buyer: { name, email: email || null } };
  const pack = await buildPack({ plots, results, lot, cooperative: doc.cooperative, whisp: saved?.whisp, profile });
  if (pack.blocking.length) return sendJson(res, 422, { error: pack.blocking.join(" · "), blocking: pack.blocking });
  // Already inside serial(): sign directly (a nested serial() would wait on itself).
  const passport = await attachPassport(pack, { pack, lot, plots, results, cooperative: doc.cooperative, whisp: saved?.whisp });
  const dds = JSON.parse(pack.documents.find((d) => d.id === "dds").content);
  const kg = dds.commodities.reduce((s, c) => s + (Number(c.estimatedKgFromDeliveries) || 0), 0);
  const stored = {
    ...lot,
    token: crypto.randomBytes(18).toString("base64url"),
    kg,
    kg_unit: dds.commodities[0]?.estimatedKgUnit || "kg",
    created_at: new Date().toISOString(),
    status: "sent",
    filing: null,
    left_out: [...eligible].filter((pid) => !alloc.plot_ids.includes(pid)),
    exhausted: alloc.exhausted,
    passport,
    documents: pack.documents,
  };
  lots.push(stored);
  await writeLots(lots);
  return sendJson(res, 201, { lot: lotSummary(stored), documents: pack.documents });
}

async function handleShare(req, res, pathname) {
  const [, , , token, action] = pathname.split("/");
  const lots = await readLots();
  const lot = lots.find((l) => l.token && l.token === token);
  if (!lot) return sendJson(res, 404, { error: "This link doesn't match a lot. Ask the cooperative for a new one." });
  if (req.method === "GET" && !action) {
    const doc = await farmsDoc();
    return sendJson(res, 200, {
      lot: lotSummary(lot),
      supplier: doc.cooperative,
      profile: { name: profile.name, country_iso2: profile.country_iso2, country_risk: profile.country_risk || "standard" },
      documents: lot.documents,
      handoff: lot.filing ? downstreamHandoff(lot, doc.cooperative) : null,
    });
  }
  if (req.method === "POST" && action === "filing") {
    const b = await readJsonBody(req);
    const reference = String(b.reference || "").trim();
    const verification = String(b.verification || "").trim();
    if (!REF_RE.test(reference) || !REF_RE.test(verification)) {
      return sendJson(res, 400, { error: "Enter the reference and verification numbers exactly as the EU Information System shows them (letters, digits and dashes)." });
    }
    return serial(async () => {
      const all = await readLots();
      const l = all.find((x) => x.token === token);
      l.status = "filed";
      l.filing = { reference, verification, recorded_at: new Date().toISOString() };
      await writeLots(all);
      const doc = await farmsDoc();
      return sendJson(res, 200, { lot: lotSummary(l), handoff: downstreamHandoff(l, doc.cooperative) });
    });
  }
  if (req.method === "POST" && action === "decision") {
    const b = await readJsonBody(req);
    if (!["accept_evidence", "request_info"].includes(b.decision)) return sendJson(res, 400, { error: "Choose: accept the evidence for your risk assessment, or request more information." });
    const name = String(b.name || "").trim().slice(0, 100);
    const reason = String(b.reason || "").trim().slice(0, 1000);
    if (!name) return sendJson(res, 400, { error: "Your name is required: the decision is yours, as the operator." });
    if (!reason) return sendJson(res, 400, { error: "Write a reason: it goes into your Art 10 record." });
    return serial(async () => {
      const all = await readLots();
      const l = all.find((x) => x.token === token);
      // Appended, never edited: each entry carries the hash of the one before it.
      const list = (l.importer_decisions ||= []);
      const prev = list.at(-1)?.hash || "0".repeat(64);
      const passportDoc = (l.documents || []).find((d) => d.id === "passport");
      const entry = { decision: b.decision, name, reason, at: new Date().toISOString(), passport_id: l.passport?.id || null, passport_sha256: passportDoc?.sha256 || null };
      list.push({ ...entry, prev, hash: await sha256Hex(prev + canonicalize(entry)) });
      await writeLots(all);
      return sendJson(res, 200, { lot: lotSummary(l) });
    });
  }
  return sendJson(res, 405, { error: "Method not allowed" });
}

// What the importer passes on: since Reg. 2025/2650, downstream operators and traders keep the
// reference number of the first due diligence statement instead of filing their own.
function downstreamHandoff(lot, cooperative) {
  return {
    _status: "Prepared by EUDR-Snap from the operator's own entry. Check against the EU Information System.",
    lot: lot.id,
    referenceNumber: lot.filing.reference,
    verificationNumber: lot.filing.verification,
    operator: lot.buyer.name,
    supplier: cooperative?.name || null,
    recordedAt: lot.filing.recorded_at,
    forDownstream: "Downstream operators and traders keep this reference number with their records (Reg. (EU) 2023/1115 as amended by 2025/2650).",
  };
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
    const fc = await analysePlots(plots, whispKey, { maxWaitMs: HOSTED ? 40_000 : 60_000, nationalCodes: profile.whisp_national_codes });
    const checkedAt = new Date().toISOString();
    const result = { source: "live", checked_at: checkedAt, whisp: whispMeta(fc, checkedAt), results: classify(plots, fc, decisions), raw: fc };
    // Only the default demo batch refreshes the stage backup.
    if (!body.plots) await fs.writeFile(CACHE_FILE, JSON.stringify({ source: "cached", checked_at: checkedAt, raw: fc }, null, 2)).catch(() => {});
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
  const body = await readJsonBody(req);
  return serial(() => review(body, res));
}

async function review({ plot_id, decision, reason = "", reviewer = "" }, res) {
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
  if (!Array.isArray(body.lot?.plot_ids)) return sendJson(res, 400, { error: "Send a lot: { id, market, plot_ids: [...] }" });
  const doc = await farmsDoc();
  const plots = body.plots?.length ? body.plots : doc.farms;
  const saved = await savedResult(plots);
  const results = saved?.results || classify(plots, null, decisions);
  const pack = await buildPack({ plots, results, lot: body.lot, cooperative: doc.cooperative, whisp: saved?.whisp, profile });
  if (pack.blocking.length) return sendJson(res, 422, pack);
  await serial(() => attachPassport(pack, { pack, lot: body.lot, plots, results, cooperative: doc.cooperative, whisp: saved?.whisp }));
  return sendJson(res, 200, pack);
}

async function handleExtract(req, res) {
  try {
    const { imageBase64, mediaType } = await readJsonBody(req, MAX_IMAGE_BODY_BYTES);
    if (typeof imageBase64 !== "string" || !imageBase64) throw new ExtractError(400, "No image was sent.");
    if (!IMAGE_TYPES.has(mediaType)) throw new ExtractError(400, "Use a JPEG, PNG, WebP or GIF image.");
    const result = await extractDocument(imageBase64, mediaType, profile.country_iso2);
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
  if (pathname === "/api/farms" && req.method === "GET") return sendJson(res, 200, { ...(await farmsDoc()), profile });
  if (pathname === "/api/deliveries" && req.method === "GET") return sendJson(res, 200, { deliveries: (await readJsonFile(DELIVERIES_FILE)) || [] });
  if (pathname === "/api/deliveries" && req.method === "POST") return handleAddDelivery(req, res);
  if (pathname === "/api/deliveries" && req.method === "DELETE") {
    // Demo reset: recorded purchases AND review decisions, so rehearsals don't carry onto the stage.
    await serial(async () => {
      await fs.rm(DELIVERIES_FILE, { force: true });
      await fs.rm(PASSPORTS_FILE, { force: true });
      await fs.rm(LOTS_FILE, { force: true });
      decisions = {};
      await saveDecisions();
    });
    return sendJson(res, 200, { deliveries: [], decisions: {} });
  }
  if (pathname === "/api/risk" && req.method === "POST") return handleRisk(req, res);
  if (pathname === "/api/risk/saved" && req.method === "GET") {
    const plots = await demoFarms();
    return sendJson(res, 200, (await savedResult(plots)) || { source: "none", results: classify(plots, null, decisions) });
  }
  if (pathname === "/api/review" && req.method === "GET") return sendJson(res, 200, { decisions });
  if (pathname === "/api/review" && req.method === "POST") return handleReview(req, res);
  if (pathname === "/api/lots" && req.method === "POST") return handleLots(req, res);
  if (pathname === "/api/export" && req.method === "POST") return handleExport(req, res);
  if (pathname === "/api/lots/create" && req.method === "POST") return handleCreateLot(req, res);
  if (pathname === "/api/lots/register" && req.method === "GET") return sendJson(res, 200, { lots: (await readLots()).map(lotSummary) });
  if (pathname.startsWith("/api/share/")) return handleShare(req, res, pathname);
  if (pathname === "/api/extract" && req.method === "POST") return handleExtract(req, res);
  if (pathname === "/api/passport/key" && req.method === "GET") {
    const key = publicJwkOf(await passportKey());
    return sendJson(res, 200, { cooperative: (await farmsDoc()).cooperative?.name || null, key_fingerprint: await keyFingerprint(key), public_key: key });
  }
  if (pathname === "/api/passports" && req.method === "GET") {
    const ledger = (await readJsonFile(PASSPORTS_FILE)) || [];
    return sendJson(res, 200, { passports: ledger.map(({ passport, ...summary }) => summary) });
  }
  if (pathname.startsWith("/api/passports/") && req.method === "GET") {
    const id = decodeURIComponent(pathname.slice("/api/passports/".length));
    const hit = ((await readJsonFile(PASSPORTS_FILE)) || []).find((e) => e.id === id);
    if (!hit) return sendJson(res, 404, { error: `No passport ${id} on this server. It may have been issued elsewhere: drop the passport file in instead.` });
    const latest = ((await readJsonFile(PASSPORTS_FILE)) || []).at(-1);
    return sendJson(res, 200, { passport: hit.passport, sha256: hit.sha256, sequence: hit.sequence, latest_sequence: latest?.sequence });
  }
  if (pathname === "/api/find-plots" && req.method === "POST") {
    if (HOSTED) return sendJson(res, 400, { error: "The plot finder rewrites the demo files, so it only runs locally." });
    if (PROFILE_ID) return sendJson(res, 400, { error: "The plot finder only exists for the Colombian demo." });
    if (!whispKey) return sendJson(res, 400, { error: friendly({ code: "auth_missing_api_key" }) });
    startFindJob();
    return sendJson(res, 202, findJob);
  }
  if (pathname === "/api/find-plots" && req.method === "GET") return sendJson(res, 200, findJob || { running: false });
  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405).end("Method not allowed");
}

// One handler for both: the local server below, and Vercel's function (api/index.js).
export function handler(req, res) {
  return route(req, res).catch((error) => {
    console.error(error.message);
    if (!res.headersSent) sendJson(res, 400, { error: friendly(error) });
  });
}

// Vercel detects server.js as the entry point and calls its default export per request.
export default handler;

await loadDecisions();
if (!HOSTED) {
  http.createServer(handler).listen(PORT, () => {
    console.log(`EUDR-Snap running at http://localhost:${PORT} (profile: ${profile.name})`);
    console.log(whispKey ? "Whisp key loaded from WHISP_API_KEY." : "No Whisp key yet: paste one in the page.");
  });
}
