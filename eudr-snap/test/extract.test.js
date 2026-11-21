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
