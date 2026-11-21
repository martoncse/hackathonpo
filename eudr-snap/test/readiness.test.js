// The importer's "Can I file?" checklist: three states, never a legal sign-off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readiness } from "../shared/readiness.js";

const base = () => ({
  art9: {
    supplier: { name: "SCOOP Soubré" },
    countryOfProduction: "CI",
    plots: [
      { id: "C1", hectares: 2.1, geometryType: "Polygon", productionPeriod: { from: "2025-10-14", to: "2026-03-02" }, deforestationFree: { whispRisk: "low", checkedAt: "2026-11-21T10:00:00Z" }, legality: { status: "questionnaire pending" } },
      { id: "C2", hectares: 1.2, geometryType: "Point", productionPeriod: { from: "2025-11-01", to: "2025-12-01" }, deforestationFree: { whispRisk: "low" }, reviewDecision: { decision: "accept" } },
    ],
  },
  dds: { commodities: [{ hsHeading: "180100", estimatedKgFromDeliveries: 3300, estimatedKgUnit: "kg dry beans", netWeightKg: "[Importer fills]" }] },
  art10: { criteria: [{ criterion: "10(2)(a)", rating: "standard" }, { criterion: "10(2)(k)", rating: "manual" }] },
  art11Entries: [{ plot: "C2" }],
  passportValid: true,
  countryRisk: "standard",
});
const byKey = (r) => Object.fromEntries(r.items.map((i) => [i.key, i.status]));

test("complete supplier evidence leaves only the importer's own items", () => {
  const r = readiness(base());
  const s = byKey(r);
  assert.equal(s.geo, "ok");
  assert.equal(s.passport, "ok");
  assert.equal(s.net, "you");
  assert.equal(s.eori, "you");
  assert.equal(s.art10, "you");
  assert.equal(s.decision, "you");
  assert.equal(r.counts.supplier, 0);
  assert.match(r.note, /not legal sign-off/);
});

test("a big plot mapped as a point and a failed passport go back to the supplier", () => {
  const input = base();
  input.art9.plots[1].hectares = 6.2;
  input.passportValid = false;
  const s = byKey(readiness(input));
  assert.equal(s.polygon, "supplier");
  assert.equal(s.passport, "supplier");
});

test("low-risk origin skips the Art 10/11 rows (Art 13)", () => {
  const s = byKey(readiness({ ...base(), countryRisk: "low" }));
  assert.equal(s.art10, undefined);
  assert.equal(s.art11, undefined);
});

test("the importer's own decision completes its row", () => {
  const r = readiness({ ...base(), importerDecision: { decision: "accept_evidence", name: "M. Dupont" } });
  assert.equal(byKey(r).decision, "ok");
});
