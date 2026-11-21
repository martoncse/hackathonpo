// "Can I file?": the importer's per-shipment checklist, computed only from the pack files the
// importer received (plus the passport check). A checklist, NOT legal sign-off: the operator
// draws the Art 10 conclusion and files the DDS. Pure; runs in Node and the browser.
//
// Each item: { key, label, status: "ok" | "you" | "supplier", detail }
//   ok       = present in the evidence
//   you      = the importer completes it (it's theirs by law, e.g. net mass, Art 10 conclusion)
//   supplier = missing from the supplier's evidence: ask them before filing

export const RISK_TEXT = {
  standard: "Standard risk: full due diligence (Art 9 information, Art 10 risk assessment, Art 11 mitigation) for every shipment.",
  low: "Low risk: simplified due diligence (Art 13). Collect the Art 9 information; a risk assessment is needed only if information points to a risk.",
  high: "High risk: full due diligence, and authorities check a larger share of shipments.",
};

export function readiness({ art9, dds, art10, art11Entries = [], passportValid = null, importerDecision = null, countryRisk = "standard" }) {
  const items = [];
  const add = (key, label, status, detail = "") => items.push({ key, label, status, detail });
  const plots = art9?.plots || [];
  const commodities = dds?.commodities || [];

  add("hs", "Product and HS code", commodities.length && commodities.every((c) => c.hsHeading) ? "ok" : "supplier", commodities.map((c) => `HS ${c.hsHeading}`).join(", "));
  const est = commodities.reduce((s, c) => s + (Number(c.estimatedKgFromDeliveries) || 0), 0);
  add("quantity", "Quantity from purchase receipts", est > 0 ? "ok" : "supplier", est > 0 ? `${est.toLocaleString("en")} ${commodities[0]?.estimatedKgUnit || "kg"} (estimate from receipts)` : "no receipts in the lot");
  const netFilled = commodities.length && commodities.every((c) => typeof c.netWeightKg === "number");
  add("net", "Net mass actually shipped", netFilled ? "ok" : "you", netFilled ? "" : "You fill this from the bill of lading or weighing note");
  add("eori", "Your company details and EORI", "you", "Operator name, address and EORI in the statement");
  add("supplier", "Supplier named", art9?.supplier?.name ? "ok" : "supplier", art9?.supplier?.name || "");
  add("country", "Country of production", art9?.countryOfProduction ? "ok" : "supplier", art9?.countryOfProduction || "");

  const noGeo = plots.filter((p) => !p.geometryType);
  add("geo", "Geolocation for every plot", plots.length && !noGeo.length ? "ok" : "supplier", noGeo.length ? `missing: ${noGeo.map((p) => p.id).join(", ")}` : `${plots.length} plot(s) in the GeoJSON`);
  const bigPoints = plots.filter((p) => Number(p.hectares) > 4 && p.geometryType !== "Polygon" && p.geometryType !== "MultiPolygon");
  add("polygon", "Plots over 4 ha mapped as polygons", bigPoints.length ? "supplier" : "ok", bigPoints.length ? `points only: ${bigPoints.map((p) => p.id).join(", ")}` : "");
  const noPeriod = plots.filter((p) => !p.productionPeriod);
  add("period", "Production period per plot", noPeriod.length ? "supplier" : "ok", noPeriod.length ? `missing: ${noPeriod.map((p) => p.id).join(", ")}` : "from purchase dates");
  const unchecked = plots.filter((p) => !p.deforestationFree?.whispRisk);
  add("deforestation", "Deforestation check per plot", unchecked.length ? "supplier" : "ok", unchecked.length ? `not checked: ${unchecked.map((p) => p.id).join(", ")}` : `FAO Whisp${plots[0]?.deforestationFree?.checkedAt ? ", " + plots[0].deforestationFree.checkedAt.slice(0, 10) : ""}`);
  const legalityPending = plots.filter((p) => !p.legality || /pending/i.test(p.legality.status || ""));
  add("legality", "Legality evidence (land use, labour, tax…)", legalityPending.length ? "you" : "ok", legalityPending.length ? `questionnaire pending for ${legalityPending.length} plot(s): request it from your supplier` : "");

  if (countryRisk !== "low") {
    const open = (art10?.criteria || []).filter((c) => ["gap", "manual", "fail"].includes(c.rating));
    add("art10", "Art 10 risk assessment", open.length ? "you" : "ok", open.length ? `${open.length} of ${art10.criteria.length} criteria for you to complete, then you draw the conclusion` : "all criteria have a finding");
    const reviewed = plots.filter((p) => p.reviewDecision);
    add("art11", "Flags handled with named decisions (Art 11)", "ok", `${art11Entries.length} decision(s) logged with name, reason and time; ${reviewed.length} plot(s) reviewed`);
  }
  if (passportValid !== null) add("passport", "Supplier's passport signature and files", passportValid ? "ok" : "supplier", passportValid ? "signature valid, files unchanged" : "verification FAILED: don't rely on this evidence");
  add("decision", "Your decision on this evidence", importerDecision ? (importerDecision.decision === "accept_evidence" ? "ok" : "supplier") : "you", importerDecision ? `${importerDecision.decision === "accept_evidence" ? "Accepted for your risk assessment" : "More information requested"} by ${importerDecision.name}` : "Accept the evidence or request more information");

  const count = (s) => items.filter((i) => i.status === s).length;
  const summary = count("supplier")
    ? `${count("supplier")} item(s) to get from your supplier, ${count("you")} for you to complete.`
    : count("you")
      ? `Evidence complete from the supplier. ${count("you")} item(s) for you to complete before filing.`
      : "Every item is ready for you to file.";
  return { items, summary, counts: { ok: count("ok"), you: count("you"), supplier: count("supplier") }, note: "Filing checklist, not legal sign-off. You draw the Art 10 conclusion and file the DDS." };
}
