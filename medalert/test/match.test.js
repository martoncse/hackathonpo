import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkPack, cdscoToAlerts, sweep, parseGs1, normBatch } from "../shared/match.js";

const alerts = JSON.parse(fs.readFileSync(new URL("../data/alerts.json", import.meta.url))).alerts;
const cdsco = JSON.parse(fs.readFileSync(new URL("../data/cdsco-nsq-sep2026.json", import.meta.url)));
const stock = JSON.parse(fs.readFileSync(new URL("../data/stock-log.json", import.meta.url))).entries;
const all = [...alerts, ...cdscoToAlerts(cdsco)];
const today = new Date("2026-11-21");
const reg = { checked: false };

test("WHO quinine batch 44680 is red", () => {
  const v = checkPack({ product: "Quinine Sulphate Tablets B.P.", batch: "44680", expiry: "10/2020" }, all, reg, today);
  assert.equal(v.level, "red");
  assert.match(v.headline, /WHO Medical Product Alert N°1\/2020/);
});
test("typed batch with spaces and prefix still matches", () => {
  assert.equal(normBatch("Lot: 4mw 4c"), "4MW4C");
  assert.equal(checkPack({ product: "Tavanic 500", batch: "Lot: 4mw 4c" }, all, reg, today).level, "red");
});
test("India CDSCO batch through the same matcher", () => {
  const v = checkPack({ product: "Thyroxine Tablets 25 mcg", batch: "T-639" }, all, reg, today);
  assert.equal(v.level, "red");
  assert.match(v.headline, /CDSCO/);
});
test("short batch with a different product is orange, not red", () => {
  const v = checkPack({ product: "Paracetamol 500mg", batch: "687" }, all, reg, today);
  assert.equal(v.level, "orange");
});
test("near miss is orange", () => {
  assert.equal(checkPack({ product: "Quinine", batch: "44630" }, all, reg, today).level, "orange");
});
test("clean registered pack is none, never safe", () => {
  const v = checkPack({ product: "Alpaquine Tablets", batch: "AQ2508", expiry: "06/2028", registration_no: "B4-6010" }, all,
    { checked: true, found: { product: "Alpaquine Tablets", status: "Active", applicant: "x", ingredient: "Quinine" }, source: "cache" }, today);
  assert.equal(v.level, "none");
  assert.match(v.headline, /not a quality clearance/);
  assert.doesNotMatch(JSON.stringify(v), /\bsafe\b/i);
});
test("unknown registration is orange", () => {
  assert.equal(checkPack({ product: "X", batch: "ZZ999", registration_no: "A4-0000" }, all, { checked: true, found: null }, today).level, "orange");
});
test("sweep finds the Tavanic carton only", () => {
  const hits = sweep(alerts.find((a) => a.id === "NAFDAC-01-2026"), stock);
  assert.deepEqual(hits.map((h) => h.id), ["R-1101"]);
});
test("GS1 parse", () => {
  assert.deepEqual(parseGs1("]d2010358291008072517270430104MW4C\x1d21ABC123"), { gtin: "03582910080725", batch: "4MW4C", serial: "ABC123", expiry: "04/2027" });
  assert.equal(parseGs1("(01)03582910080725(17)270430(10)4MW4C").batch, "4MW4C");
});
