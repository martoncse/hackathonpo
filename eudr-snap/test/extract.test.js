import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseKg, postProcess, MATERIAL_FIELDS } from "../extract.js";

test("Spanish thousands separator and units", () => {
  assert.equal(normaliseKg("2.100 kg").kg, 2100);
  assert.equal(normaliseKg("1.200 kg p.s.").kg, 1200);
  assert.equal(normaliseKg("1.200,5 kg").kg, 1200.5);
  const arrobas = normaliseKg("8 @");
  assert.equal(arrobas.kg, 100);
  assert.match(arrobas.note, /12.5/);
  assert.equal(normaliseKg("2 cargas").kg, 250);
  assert.match(normaliseKg("900").note, /assumed kg/);
  assert.equal(normaliseKg(null).kg, null);
});

test("post-processing: illegible stays null, material fields need a person, coordinates never from the model", () => {
  const out = postProcess({
    document_type: "purchase_receipt",
    language: "es",
    transcribed_coordinates: null,
    warnings: [],
    fields: [
      { field: "farmer_name", value: "Rosa Elena Muñoz", confidence: 0.97, evidence: "Vendedor: Rosa Elena Muñoz", illegible: false },
      { field: "kg", value: "900 kg p.s.", confidence: 0.9, evidence: "900 kg p.s.", illegible: false },
      { field: "date", value: "14 agosto", confidence: 0.6, evidence: "14 agosto", illegible: false },
      { field: "product", value: "Café pergamino seco", confidence: 0.95, evidence: "Café pergamino seco", illegible: false },
      { field: "cedula", value: "12345", confidence: 0.4, evidence: "12?45", illegible: true },
    ],
  });
  const by = Object.fromEntries(out.fields.map((f) => [f.field, f]));
  assert.equal(by.kg.value, 900);
  assert.equal(by.date.value, null, "non-ISO date must not be guessed");
  assert.equal(by.cedula.value, null, "illegible stays null");
  for (const f of MATERIAL_FIELDS) if (by[f]) assert.equal(by[f].needs_check, true, f);
  assert.equal(by.product.needs_check, false);
  assert.equal(by.coordinates.value, null);
  assert.match(by.coordinates.note, /GPS/);
});

test("Côte d'Ivoire: French thousands separators, no bag conversion", () => {
  assert.equal(normaliseKg("1 250 kg", "CI").kg, 1250);
  assert.equal(normaliseKg("1 250,5 kg", "CI").kg, 1250.5);
  assert.equal(normaliseKg("12 sacs", "CI").kg, null);
  assert.match(normaliseKg("12 sacs", "CI").note, /not converted/);
  // Colombian units stay Colombian.
  assert.equal(normaliseKg("8 @", "CI").kg, 8);
  assert.equal(normaliseKg("8 @").kg, 100);
});

test("Côte d'Ivoire: the producer card is a material field a person must accept", () => {
  const out = postProcess({ document_type: "purchase_receipt", language: "fr", transcribed_coordinates: null, warnings: [], fields: [
    { field: "producer_card", value: "CP-DEMO-0001", confidence: 0.99, evidence: "N° carte: CP-DEMO-0001", illegible: false },
    { field: "kg", value: "1 250 kg", confidence: 0.95, evidence: "Poids net: 1 250 kg", illegible: false },
  ] }, "CI");
  const card = out.fields.find((f) => f.field === "producer_card");
  assert.equal(card.material, true);
  assert.equal(card.needs_check, true);
  assert.equal(out.fields.find((f) => f.field === "kg").value, 1250);
});
