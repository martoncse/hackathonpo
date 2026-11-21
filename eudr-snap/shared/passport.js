// Shipment Evidence Passport: one signed, checkable record per EU shipment, owned by the cooperative.
// It binds the pack's files (by SHA-256), the checks behind them and the named reviewer decisions,
// and points to the cooperative's previous passport, so its history builds up season after season.
// Pure + Web Crypto (ECDSA P-256 / SHA-256): the same code signs in Node and verifies in any browser.

export const PASSPORT_FORMAT = "eudr-snap-passport/1";
export const SIGNATURE_ALG = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_PARAMS = { name: "ECDSA", hash: "SHA-256" };

const subtle = () => globalThis.crypto.subtle;
const enc = (text) => new TextEncoder().encode(text);

// Deterministic JSON: object keys sorted, no whitespace. What gets signed and hashed.
export function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
}

export async function sha256Hex(data) {
  const bytes = typeof data === "string" ? enc(data) : data;
  const buf = await subtle().digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(buf) {
  let bin = "";
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const bin = atob(String(text).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function publicJwkOf(jwk) {
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
}

// Short, readable key id a buyer can compare by eye or by phone: "3F2A-9C10-…" (16 hex).
export async function keyFingerprint(jwk) {
  const hex = (await sha256Hex(canonicalize(publicJwkOf(jwk)))).slice(0, 16).toUpperCase();
  return hex.match(/.{4}/g).join("-");
}

export async function generateSigningKey() {
  const pair = await subtle().generateKey(SIGNATURE_ALG, true, ["sign", "verify"]);
  return subtle().exportKey("jwk", pair.privateKey);
}

// Each reviewer decision carries the hash of the one before it: editing or deleting an
// earlier decision breaks every later hash, and the head hash is inside the signed payload.
export async function chainDecisions(entries) {
  let prev = "0".repeat(64);
  const chained = [];
  for (const e of entries) {
    const hash = await sha256Hex(prev + canonicalize(e));
    chained.push({ ...e, prev, hash });
    prev = hash;
  }
  return { entries: chained, head: prev };
}

export async function checkDecisionChain(chain) {
  let prev = "0".repeat(64);
  for (const [i, { prev: p, hash, ...e }] of (chain?.entries || []).entries()) {
    if (p !== prev || hash !== (await sha256Hex(prev + canonicalize(e)))) return { ok: false, brokenAt: i };
    prev = hash;
  }
  return { ok: prev === chain?.head, brokenAt: prev === chain?.head ? null : (chain?.entries || []).length };
}

// The signed content. Everything a buyer, bank or inspector needs to judge the shipment at a
// glance; the full detail stays in the pack files, each pinned by its SHA-256.
export async function buildPassportPayload({ pack, lot, plots, results, cooperative, profile, whisp, publicJwk, previous = null, issuedAt = new Date().toISOString() }) {
  const res = new Map(results.map((r) => [r.id, r]));
  const lotPlots = plots.filter((p) => lot.plot_ids.includes(p.id));
  const receiptSet = Array.isArray(lot.receipts) ? new Set(lot.receipts) : null;
  const receipts = lotPlots.flatMap((p) => (p.deliveries || []).filter((d) => !receiptSet || receiptSet.has(d.receipt)).map((d) => ({ receipt: d.receipt, plot: p.id, date: d.date, kg: d.kg, unit: d.unit || "kg", source: d.source || "cooperative record" })));
  const doc = (id) => pack.documents.find((d) => d.id === id);
  const dds = JSON.parse(doc("dds")?.content || "{}");
  const art10 = JSON.parse(doc("art10")?.content || "{}");
  const art11 = JSON.parse(doc("art11")?.content || '{"entries":[]}').entries || [];
  const fingerprint = await keyFingerprint(publicJwk);
  const files = await Promise.all(
    pack.documents.map(async (d) => ({ filename: d.filename, sha256: d.sha256, bytes: enc(d.content).length, title: d.title })),
  );
  const decisions = await chainDecisions(art11);
  const body = {
    format: PASSPORT_FORMAT,
    issued_at: issuedAt,
    issuer: {
      role: "supplier (cooperative); the EU operator files the DDS and stays responsible",
      cooperative: cooperative?.name || null,
      registration: cooperative?.registration || cooperative?.nit || null,
      country: profile?.country_iso2 || "CO",
      key_fingerprint: fingerprint,
      public_key: publicJwkOf(publicJwk),
    },
    shipment: {
      lot_id: lot.id,
      market: lot.market,
      buyer: lot.buyer?.name ? { name: lot.buyer.name } : null,
      goods: (dds.commodities || []).map((c) => ({ hs: c.hsHeading, description: c.descriptionOfGoods, estimated_kg_from_receipts: c.estimatedKgFromDeliveries, unit: c.estimatedKgUnit })),
      plots: lotPlots.length,
      producer_cards: new Set(lotPlots.map((p) => p.producer_card).filter(Boolean)).size || null,
      receipts,
    },
    checks: {
      deforestation: { source: "FAO Whisp", version: whisp?.version || null, checked_at: whisp?.checked_at || null },
      plots: lotPlots.map((p) => {
        const r = res.get(p.id) || {};
        const v = r.yield || {};
        return {
          id: p.id,
          producer_card: p.producer_card || null,
          hectares: p.hectares,
          geometry: p.geometry?.type || null,
          whisp_risk: r.whisp_risk || null,
          status: r.status || null,
          volume: { kg_per_ha: v.kg_per_ha ?? null, threshold: v.limit ?? null, unit: v.unit || null, flagged: Boolean(v.flag) },
          decision: r.decision ? { decision: r.decision.decision, reviewer: r.decision.reviewer, at: r.decision.at } : null,
        };
      }),
      art10_conclusion: art10.conclusion || null,
    },
    decisions,
    files,
    history: { sequence: (previous?.sequence || 0) + 1, previous_passport_sha256: previous?.sha256 || null, previous_passport_id: previous?.id || null },
    notice: "Evidence passport prepared with EUDR-Snap. It proves what the supplier recorded and when; it is not a certificate of compliance. Decision support, not legal advice.",
  };
  const id = `PP-${String(lot.id).replace(/[^A-Za-z0-9_-]/g, "_")}-${(await sha256Hex(canonicalize(body))).slice(0, 8).toUpperCase()}`;
  return { passport_id: id, ...body };
}

export async function signPassport(payload, privateJwk) {
  const key = await subtle().importKey("jwk", privateJwk, SIGNATURE_ALG, false, ["sign"]);
  const sig = await subtle().sign(SIGN_PARAMS, key, enc(canonicalize(payload)));
  return { payload, signature: { alg: "ES256", key_fingerprint: payload.issuer.key_fingerprint, value: toBase64Url(sig) } };
}

// files: optional [{ name, bytes: Uint8Array }]. Matched to the passport's list by file name,
// or by hash when a buyer renamed a download. Returns every check, never throws on bad input.
export async function verifyPassport(passport, files = []) {
  const out = { format: false, signature: false, fingerprintMatches: false, decisionChain: null, files: [], errors: [] };
  try {
    const p = passport?.payload;
    if (!p || p.format !== PASSPORT_FORMAT) {
      out.errors.push(`Not an ${PASSPORT_FORMAT} file.`);
      return out;
    }
    out.format = true;
    out.passportId = p.passport_id;
    out.fingerprint = await keyFingerprint(p.issuer.public_key);
    out.fingerprintMatches = out.fingerprint === p.issuer.key_fingerprint && out.fingerprint === passport.signature?.key_fingerprint;
    const key = await subtle().importKey("jwk", p.issuer.public_key, SIGNATURE_ALG, false, ["verify"]);
    out.signature = await subtle().verify(SIGN_PARAMS, key, fromBase64Url(passport.signature?.value || ""), enc(canonicalize(p)));
    out.decisionChain = await checkDecisionChain(p.decisions);
    const supplied = await Promise.all(files.map(async (f) => ({ name: f.name, sha256: await sha256Hex(f.bytes) })));
    out.files = p.files.map((f) => {
      const byName = supplied.find((s) => s.name === f.filename);
      const byHash = supplied.find((s) => s.sha256 === f.sha256);
      if (byHash) return { ...f, status: "match", suppliedAs: byHash.name };
      if (byName) return { ...f, status: "altered", actual: byName.sha256 };
      return { ...f, status: "not supplied" };
    });
    out.extraFiles = supplied.filter((s) => !p.files.some((f) => f.sha256 === s.sha256 || f.filename === s.name)).map((s) => s.name);
  } catch (error) {
    out.errors.push(error.message);
  }
  out.valid = out.format && out.signature && out.fingerprintMatches && out.decisionChain?.ok !== false && !out.files.some((f) => f.status === "altered");
  return out;
}
