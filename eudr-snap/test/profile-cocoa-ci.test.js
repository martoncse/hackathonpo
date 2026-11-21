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
  assert.equal(CONFIG.cocoa.nationalAvgKgPerHa, 462);
  assert.equal(CONFIG.cocoa.maxKgPerHa, 924);
  assert.equal(CONFIG.pointMaxHa, 4);
});

test("demo data is labelled synthetic and not Whisp-verified", () => {
  assert.match(doc._synthetic, /Synthetic/);
  assert.equal(doc.verified_with_whisp, false);
});

test("declared hectares match the mapped boundaries", () => {
  for (const f of farms) assert.deepEqual(checkGeometry(f).notes, [], f.id);
});

test("sales are pooled per producer card: 3,400 kg over 3.2 ha = 1,063 kg/ha > 924", () => {
  const v = checkProducerVolumes(farms).get("CP-DEMO-0003|cocoa");
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

const pt = (id, card, crop, ha, deliveries) => ({ id, crop, producer_card: card, hectares: ha, geometry: { type: "Point", coordinates: [-6.6, 5.8] }, deliveries });

test("one card selling coffee and cocoa is checked per crop", () => {
  const v = checkProducerVolumes([pt("A", "CP-M", "Cocoa", 1, [{ season: "2025-26", kg: 800 }]), pt("B", "CP-M", "Coffee", 3, [{ season: "2025-26", kg: 100 }])]);
  assert.equal(v.get("CP-M|cocoa").ha_used, 1);
  assert.equal(v.get("CP-M|cocoa").kg_per_ha, 800);
  assert.equal(v.get("CP-M|coffee").ha_used, 3);
});

test("a card uses one season for all its plots", () => {
  const v = checkProducerVolumes([pt("A", "CP-S", "Cocoa", 1, [{ season: "2025-26", kg: 500 }]), pt("B", "CP-S", "Cocoa", 1, [{ season: "2024-25", kg: 900 }])]).get("CP-S|cocoa");
  assert.equal(v.season, "2025-26");
  assert.equal(v.kg_delivered, 500);
});

test("a card with sales but no plot area goes to review", () => {
  const v = checkProducerVolumes([pt("A", "CP-Z", "Cocoa", 0, [{ season: "2025-26", kg: 300 }])]).get("CP-Z|cocoa");
  assert.match(v.flag, /no plot area/);
});

test("the flag names the area basis when points contribute declared area", () => {
  const plots = [pt("A", "CP-P", "Cocoa", 1, [{ season: "2025-26", kg: 2000 }])];
  assert.match(checkProducerVolumes(plots).get("CP-P|cocoa").flag, /declared areas/);
});

test("Art 10 rows b, g and i carry Ivorian text, not Colombian", async () => {
  const lot = { id: "EU-CI-1", market: "EU", plot_ids: ["C1", "C2"] };
  const pack = await buildPack({ plots: farms, results: classify(farms, fc), lot, cooperative: doc.cooperative, profile });
  const art10 = JSON.parse(pack.documents.find((d) => d.id === "art10").content).criteria;
  const row = (k) => art10.find((r) => r.criterion === `10(2)(${k})`).finding;
  assert.match(row("b"), /BNETD/);
  assert.match(row("g"), /producer card/);
  assert.doesNotMatch(row("g"), /AI extraction/);
  assert.match(row("i"), /per producer card/);
});

test("each plot on a card reports the card's season", () => {
  const r = classify([pt("A", "CP-T", "Cocoa", 1, [{ season: "2025-26", kg: 500 }]), pt("B", "CP-T", "Cocoa", 1, [{ season: "2024-25", kg: 900 }])], null);
  assert.deepEqual(r.map((x) => x.yield.season), ["2025-26", "2025-26"]);
});

test("the pack never pre-writes a negligible-risk conclusion while criteria are open", async () => {
  const lot = { id: "EU-CI-1", market: "EU", plot_ids: ["C1", "C2"] };
  const pack = await buildPack({ plots: farms, results: classify(farms, fc), lot, cooperative: doc.cooperative, profile });
  const art10 = JSON.parse(pack.documents.find((d) => d.id === "art10").content);
  assert.match(art10.conclusion, /^No conclusion drawn: \d+ of 14 criteria are still open/);
  const report = pack.documents.find((d) => d.id === "report").content;
  assert.doesNotMatch(report, /Draft conclusion:<\/b> negligible risk/);
  assert.match(report, /Signed for and on behalf of/);
  assert.match(report, /Art 4\(3\), Art 9\(1\)/);
});
