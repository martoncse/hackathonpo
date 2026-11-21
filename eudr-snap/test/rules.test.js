import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classify, checkYield, checkGeometry, checkLot, whispColour } from "../shared/rules.js";
import { stringifyGeoJSON, buildTracesGeoJSON, buildPack } from "../shared/export.js";

const doc = JSON.parse(fs.readFileSync(new URL("../public/sample-farms.json", import.meta.url)));
const farms = doc.farms;
const byId = Object.fromEntries(farms.map((f) => [f.id, f]));

function whispFc(risks) {
  return { type: "FeatureCollection", features: Object.entries(risks).map(([id, risk]) => ({ type: "Feature", properties: { external_id: id, risk_pcrop: risk, Ind_04_disturbance_after_2020: risk === "high" ? "yes" : "no" } })) };
}
const fc = whispFc({ F1: "low", F2: "low", F3: "low", F4: "low", F5: "high" });

test("Whisp labels map to colours", () => {
  assert.equal(whispColour("high"), "red");
  assert.equal(whispColour("low"), "green");
  assert.equal(whispColour("more_info_needed"), "amber");
  assert.equal(whispColour(null), null);
});

test("Luis is flagged on the MEASURED area: 9,300 kg parchment from 2.79 ha = 2,667 kg green/ha > 2,520", () => {
  const y = checkYield(byId.F2);
  assert.equal(y.area_basis, "measured boundary");
  assert.equal(y.ha_used, 2.79);
  assert.equal(y.kg_per_ha, 2667);
  assert.ok(y.flag.startsWith("Needs review"));
});

test("yield uses the measured boundary, not a smaller declared area", () => {
  const plot = { ...byId.F1, hectares: 1.0 }; // declared far below the 2.79 ha mapped
  const y = checkYield(plot);
  assert.equal(y.ha_used, 2.79);
  assert.equal(y.flag, null);
});

test("demo declared hectares match the mapped boundaries (no area notes)", () => {
  for (const id of ["F1", "F2", "F3", "F5"]) assert.deepEqual(checkGeometry(byId[id]).notes, [], id);
});

test("normal coffee farms are not flagged", () => {
  for (const id of ["F1", "F3", "F4"]) assert.equal(checkYield(byId[id]).flag, null, id);
});

test("cocoa at 1,900 kg/ha is not flagged (best farms reach ~2,000)", () => {
  assert.equal(checkYield({ crop: "Cocoa", hectares: 1, deliveries: [{ season: "2026-A", kg: 1900 }] }).flag, null);
  assert.ok(checkYield({ crop: "Cocoa", hectares: 1, deliveries: [{ season: "2026-A", kg: 2100 }] }).flag);
});

test("yield only sums the latest season", () => {
  const plot = { crop: "Cocoa", hectares: 1, deliveries: [{ season: "2025-B", kg: 1500 }, { season: "2026-A", kg: 1000 }] };
  assert.equal(checkYield(plot).kg_delivered, 1000);
});

test("6.2 ha point blocks export; walked polygon clears it", () => {
  assert.equal(checkGeometry(byId.F4).errors.length, 1);
  const walked = { ...byId.F4, geometry: doc.walked_boundaries.F4 };
  const g = checkGeometry(walked);
  assert.deepEqual(g.errors, []);
  assert.ok(Math.abs(g.measured_ha - 6.2) < 0.05);
});

test("points of 3.6-4.4 ha go to review, not block", () => {
  const g = checkGeometry({ hectares: 3.9, geometry: { type: "Point", coordinates: [-75, 2] } });
  assert.equal(g.errors.length, 0);
  assert.equal(g.notes.length, 1);
});

test("open polygon ring is an error", () => {
  const g = checkGeometry({ hectares: 1, geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0.001], [0.001, 0.001], [0.001, 0]]] } });
  assert.ok(g.errors.some((e) => e.includes("not closed")));
});

test("statuses: high risk goes to review, not excluded", () => {
  const r = Object.fromEntries(classify(farms, fc).map((x) => [x.id, x]));
  assert.equal(r.F1.status, "green");
  assert.equal(r.F2.status, "review");
  assert.equal(r.F4.status, "blocked");
  assert.equal(r.F5.status, "review");
  assert.equal(r.F5.eligible, false);
});

test("reviewer decisions change status", () => {
  const r = Object.fromEntries(classify(farms, fc, { F5: { decision: "exclude" }, F2: { decision: "accept", reason: "two plots" } }).map((x) => [x.id, x]));
  assert.equal(r.F5.status, "excluded");
  assert.equal(r.F2.status, "accepted");
  assert.equal(r.F2.eligible, true);
});

test("one non-cleared input taints the whole EU lot", () => {
  const results = classify(farms, fc, { F5: { decision: "exclude" } });
  const clean = checkLot({ id: "EU", market: "EU", plot_ids: ["F1", "F3"] }, farms, results);
  assert.equal(clean.tainted, false);
  const dirty = checkLot({ id: "EU", market: "EU", plot_ids: ["F1", "F3", "F5"] }, farms, results);
  assert.equal(dirty.tainted, true);
  assert.equal(dirty.offenders[0].id, "F5");
  const nonEu = checkLot({ id: "X", market: "non-EU", plot_ids: ["F5"] }, farms, results);
  assert.equal(nonEu.tainted, false);
});

test("GeoJSON writes exactly 6 decimals and EU property names", () => {
  const text = stringifyGeoJSON(buildTracesGeoJSON([byId.F1]));
  assert.ok(text.includes("-76.060750"), text.slice(0, 400));
  const parsed = JSON.parse(text);
  const p = parsed.features[0].properties;
  assert.equal(p.ProducerCountry, "CO");
  assert.equal(typeof p.Area, "number");
  assert.ok(p.ProducerName && p.ProductionPlace);
  for (const m of text.matchAll(/-?\d+\.(\d+)/g)) {
    if (Math.abs(Number(m[0])) > 1 && m[1].length !== 6 && !String(p.Area).endsWith(m[1])) assert.fail(`not 6 dp: ${m[0]}`);
  }
});

test("pack is blocked by the point, then built after walking the boundary", async () => {
  const lot = { id: "EU-2026-A", market: "EU", plot_ids: ["F1", "F3", "F4"] };
  const blocked = await buildPack({ plots: farms, results: classify(farms, fc), lot, cooperative: doc.cooperative });
  assert.ok(blocked.blocking.some((b) => b.includes("Buenavista")));
  const plots = farms.map((f) => (f.id === "F4" ? { ...f, geometry: doc.walked_boundaries.F4 } : f));
  const pack = await buildPack({ plots, results: classify(plots, fc), lot, cooperative: doc.cooperative });
  assert.deepEqual(pack.blocking, []);
  assert.equal(pack.documents.length, 6);
  for (const d of pack.documents) assert.match(d.sha256, /^[0-9a-f]{64}$/);
  const dds = JSON.parse(pack.documents.find((d) => d.id === "dds").content);
  assert.equal(dds.commodities[0].hsHeading, "090111");
  assert.match(dds.commodities[0].netWeightKg, /Importer fills/);
  assert.equal(typeof dds.commodities[0].estimatedGreenKgFromDeliveries, "number");
  assert.equal(pack.art10.length, 14);
});
