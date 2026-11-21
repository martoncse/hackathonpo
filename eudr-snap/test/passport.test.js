// Shipment Evidence Passport: sign -> verify, and every way a buyer could be fooled is caught.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize, generateSigningKey, publicJwkOf, keyFingerprint, chainDecisions, checkDecisionChain, buildPassportPayload, signPassport, verifyPassport, PASSPORT_FORMAT } from "../shared/passport.js";

const enc = (s) => new TextEncoder().encode(s);
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function fixture() {
  const docs = [
    { id: "geojson", title: "GeoJSON", filename: "traces-geolocation.geojson", content: '{"type":"FeatureCollection","features":[]}' },
    { id: "dds", title: "DDS", filename: "dds-data-pack.json", content: JSON.stringify({ commodities: [{ hsHeading: "180100", descriptionOfGoods: "Cocoa beans", estimatedKgFromDeliveries: 3300, estimatedKgUnit: "kg dry beans" }] }) },
    { id: "art10", title: "Art 10", filename: "art10-risk-assessment.json", content: JSON.stringify({ conclusion: "No conclusion drawn: 5 of 14 open." }) },
    { id: "art11", title: "Art 11", filename: "art11-mitigation-log.json", content: JSON.stringify({ entries: [{ plot: "C1", reason: "Field visit", reviewer: "A. Koné", at: "2026-11-21T10:00:00Z" }, { plot: "C4", reason: "High risk", reviewer: "A. Koné", at: "2026-11-21T10:05:00Z" }] }) },
  ];
  for (const d of docs) d.sha256 = await sha(d.content);
  const plots = [
    { id: "C1", producer_card: "CI-0001", hectares: 2.1, geometry: { type: "Polygon" }, deliveries: [{ receipt: "BA-900", date: "2025-10-14", kg: 1800 }] },
    { id: "C9", hectares: 1, geometry: { type: "Point" }, deliveries: [{ receipt: "BA-999", date: "2025-10-20", kg: 500 }] },
  ];
  const results = [{ id: "C1", whisp_risk: "low", status: "accepted", yield: { kg_per_ha: 857, limit: 924, unit: "kg dry beans/ha", flag: null }, decision: { decision: "accept", reviewer: "A. Koné", at: "2026-11-21T10:00:00Z" } }];
  const key = await generateSigningKey();
  const payload = await buildPassportPayload({
    pack: { documents: docs },
    lot: { id: "CI-20261121-01", market: "EU", plot_ids: ["C1"], receipts: ["BA-900"], buyer: { name: "Hamburg Imports GmbH" } },
    plots,
    results,
    cooperative: { name: "SCOOP Soubré", registration: "RCCM CI-SBR-2019" },
    profile: { country_iso2: "CI" },
    whisp: { version: "3.0", checked_at: "2026-11-21T09:00:00Z" },
    publicJwk: publicJwkOf(key),
    previous: { id: "PP-prev", sha256: "ab".repeat(32), sequence: 4 },
    issuedAt: "2026-11-21T11:00:00.000Z",
  });
  return { docs, key, payload, passport: await signPassport(payload, key) };
}

const filesOf = (docs) => docs.map((d) => ({ name: d.filename, bytes: enc(d.content) }));

test("canonical JSON ignores key order", () => {
  assert.equal(canonicalize({ b: 1, a: [{ d: 2, c: null }] }), canonicalize({ a: [{ c: null, d: 2 }], b: 1 }));
});

test("payload covers the lot only, chains history and decisions", async () => {
  const { payload } = await fixture();
  assert.equal(payload.format, PASSPORT_FORMAT);
  assert.match(payload.passport_id, /^PP-CI-20261121-01-[0-9A-F]{8}$/);
  assert.deepEqual(payload.shipment.receipts.map((r) => r.receipt), ["BA-900"]);
  assert.equal(payload.shipment.producer_cards, 1);
  assert.equal(payload.shipment.goods[0].estimated_kg_from_receipts, 3300);
  assert.equal(payload.checks.plots[0].volume.threshold, 924);
  assert.deepEqual(payload.history, { sequence: 5, previous_passport_sha256: "ab".repeat(32), previous_passport_id: "PP-prev" });
  assert.equal(payload.decisions.entries.length, 2);
  assert.equal(payload.files.length, 4);
});

test("a genuine passport with all its files verifies", async () => {
  const { docs, passport } = await fixture();
  const v = await verifyPassport(JSON.parse(JSON.stringify(passport)), filesOf(docs));
  assert.equal(v.valid, true, JSON.stringify(v.errors));
  assert.ok(v.files.every((f) => f.status === "match"));
  assert.equal(v.fingerprint, passport.payload.issuer.key_fingerprint);
  assert.match(v.fingerprint, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
});

test("a renamed download still matches by hash", async () => {
  const { docs, passport } = await fixture();
  const v = await verifyPassport(passport, [{ name: "geo (1).geojson", bytes: enc(docs[0].content) }]);
  assert.equal(v.files[0].status, "match");
  assert.equal(v.files[1].status, "not supplied");
});

test("an edited pack file is caught", async () => {
  const { docs, passport } = await fixture();
  const files = filesOf(docs);
  files[1].bytes = enc(docs[1].content.replace("3300", "9300"));
  const v = await verifyPassport(passport, files);
  assert.equal(v.valid, false);
  assert.equal(v.files.find((f) => f.filename === "dds-data-pack.json").status, "altered");
});

test("an edited passport breaks the signature", async () => {
  const { passport } = await fixture();
  const forged = structuredClone(passport);
  forged.payload.shipment.goods[0].estimated_kg_from_receipts = 9300;
  assert.equal((await verifyPassport(forged)).signature, false);
});

test("re-signing with another key changes the fingerprint", async () => {
  const { passport } = await fixture();
  const other = await generateSigningKey();
  const forged = structuredClone(passport.payload);
  forged.issuer.public_key = publicJwkOf(other);
  forged.issuer.key_fingerprint = await keyFingerprint(other);
  const v = await verifyPassport(await signPassport(forged, other));
  assert.equal(v.signature, true);
  assert.notEqual(v.fingerprint, passport.payload.issuer.key_fingerprint);
});

test("a deleted or edited decision breaks the chain", async () => {
  const chain = await chainDecisions([{ plot: "A" }, { plot: "B" }, { plot: "C" }]);
  assert.equal((await checkDecisionChain(chain)).ok, true);
  const edited = structuredClone(chain);
  edited.entries[0].plot = "Z";
  assert.deepEqual(await checkDecisionChain(edited), { ok: false, brokenAt: 0 });
  const dropped = { ...chain, entries: chain.entries.slice(1) };
  assert.equal((await checkDecisionChain(dropped)).ok, false);
});

test("garbage input is reported, not thrown", async () => {
  const v = await verifyPassport({ hello: 1 });
  assert.equal(v.valid, false);
  assert.match(v.errors[0], /Not an eudr-snap-passport/);
});
