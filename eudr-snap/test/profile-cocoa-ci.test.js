// Côte d'Ivoire cocoa profile. Its own file: applyRuleOverrides changes CONFIG for the whole
// process, and node --test runs each file in a separate process.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classify, checkProducerVolumes, checkGeometry, applyRuleOverrides, CONFIG } from "../shared/rules.js";
import { buildPack } from "../shared/export.js";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../profiles/cocoa-ci/${p}`, import.meta.url)));
const profile = read("profile.json");
const doc = read("sample-farms.json");
const farms = doc.farms;
applyRuleOverrides(profile.rules);

const fc = {
  type: "FeatureCollection",
  features: farms.map((f) => ({ type: "Feature", properties: { external_id: f.id, risk_pcrop: "low" } })),
};

test("profile overrides the cocoa yield and keeps the 4 ha rule", () => {
  assert.equal(CONFIG.cocoa.nationalAvgKgPerHa, 435);
  assert.equal(CONFIG.cocoa.maxKgPerHa, 870);
  assert.equal(CONFIG.pointMaxHa, 4);
});

test("demo data is labelled synthetic and not Whisp-verified", () => {
  assert.match(doc._synthetic, /Synthetic/);
  assert.equal(doc.verified_with_whisp, false);
});

test("declared hectares match the mapped boundaries", () => {
  for (const f of farms) assert.deepEqual(checkGeometry(f).notes, [], f.id);
});

test("sales are pooled per producer card: 3,400 kg over 3.2 ha = 1,063 kg/ha > 870", () => {
  const v = checkProducerVolumes(farms).get("CP-DEMO-0003");
  assert.equal(v.plots, 2);
  assert.equal(v.kg_delivered, 3400);
  assert.equal(v.ha_used, 3.2);
  assert.equal(v.kg_per_ha, 1063);
  assert.match(v.flag, /producer card CP-DEMO-0003/);
});

test("both plots on a flagged card go to review, others stay clear", () => {
  const r = Object.fromEntries(classify(farms, fc).map((x) => [x.id, x]));
  assert.equal(r.C3.status, "review");
  assert.equal(r.C4.status, "review");
  assert.equal(r.C1.status, "green");
  assert.equal(r.C2.status, "green");
  assert.equal(r.C5.status, "blocked");
});

test("pooling clears a plot that only looks high on its own", () => {
  // One card, two plots: all sales recorded against the first plot.
  const plot = (id, ha, kg) => ({ id, crop: "Cocoa", producer_card: "CP-X", hectares: ha, geometry: { type: "Point", coordinates: [-6.6, 5.8] }, deliveries: kg ? [{ season: "2025-26", kg }] : [] });
  const plots = [plot("A", 1, 1500), plot("B", 2, 0)];
  const r = classify(plots, null);
  assert.equal(r[0].yield.producer.kg_per_ha, 500);
  assert.equal(r[0].yield.flag, null);
});

test("pack uses CI as the country and the profile's Art 10 rows", async () => {
  const lot = { id: "EU-CI-1", market: "EU", plot_ids: ["C1", "C2"] };
  const pack = await buildPack({ plots: farms, results: classify(farms, fc), lot, cooperative: doc.cooperative, profile });
  assert.deepEqual(pack.blocking, []);
  const geo = JSON.parse(pack.documents.find((d) => d.filename.endsWith(".geojson")).content);
  assert.ok(geo.features.every((f) => f.properties.ProducerCountry === "CI"));
  const all = pack.documents.map((d) => d.content).join("\n");
  assert.doesNotMatch(all, /Colombia|IDEAM|"CO"/);
  assert.match(all, /CP-DEMO-0001/);
  assert.match(all, /180100/);
});
