// Builds the importer's evidence pack. Pure + Web Crypto, runs in Node 20+ and browsers.
// EUDR-Snap prepares drafts; the EU operator (importer) files the DDS and stays responsible.
import { CONFIG, checkGeometry, checkLot, STATUS_LABELS } from "./rules.js";

export const DISCLAIMER =
  "DRAFT prepared by EUDR-Snap for the operator. The operator files the due diligence statement in the EU Information System and remains legally responsible (Reg. (EU) 2023/1115 as amended by 2025/2650). Decision support, not legal advice.";

const HS = {
  coffee: { hsHeading: "090111", description: "Green coffee, not roasted, not decaffeinated" },
  cocoa: { hsHeading: "180100", description: "Cocoa beans, whole, raw" },
};

// ---------- GeoJSON with exactly 6 decimals ----------

function mapCoords(c) {
  return typeof c[0] === "number" ? c.map((n) => `__N${Number(n).toFixed(6)}__`) : c.map(mapCoords);
}

// JSON drops trailing zeros (-76.06075), so coordinates are written as raw text.
export function stringifyGeoJSON(fc, space = 2) {
  const marked = {
    ...fc,
    features: fc.features.map((f) => ({ ...f, geometry: { ...f.geometry, coordinates: mapCoords(f.geometry.coordinates) } })),
  };
  return JSON.stringify(marked, null, space).replace(/"__N(-?\d+\.\d{6})__"/g, "$1");
}

// EU Information System GeoJSON: FeatureCollection, WGS84, exact-case property names.
export function buildTracesGeoJSON(plots, country = "CO") {
  return {
    type: "FeatureCollection",
    features: plots.map((p) => ({
      type: "Feature",
      properties: {
        ProducerName: p.farmer_name,
        ProducerCountry: country,
        ProductionPlace: `${p.farm}, ${p.municipality || p.region}`,
        Area: Math.round(Number(p.hectares) * 100) / 100,
      },
      geometry: p.geometry,
    })),
  };
}

// ---------- hashing ----------

async function sha256(text) {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// ---------- Art 10 / Art 11 ----------

const ART10 = [
  ["a", "Risk level of the country or part of it (Art 29)"],
  ["b", "Presence of forests in the country or area of production"],
  ["c", "Presence of indigenous peoples in the country or area of production"],
  ["d", "Consultation and cooperation in good faith with indigenous peoples"],
  ["e", "Duly reasoned claims by indigenous peoples over the area"],
  ["f", "Prevalence of deforestation or forest degradation"],
  ["g", "Source, reliability and validity of the Art 9 information"],
  ["h", "Country concerns: corruption, document falsification, law enforcement, human rights, armed conflict, sanctions"],
  ["i", "Complexity of the supply chain, difficulty linking products to plots"],
  ["j", "Risk of circumvention or mixing with products of unknown or non-compliant origin"],
  ["k", "Conclusions of Commission expert group meetings"],
  ["l", "Substantiated concerns (Art 31) and supply-chain non-compliance history"],
  ["m", "Any other information pointing to non-compliance"],
  ["n", "Complementary information, e.g. certification or third-party schemes"],
];

function art10Rows(lotPlots, results, lotCheck, overrides = {}, country = "CO") {
  const res = new Map(results.map((r) => [r.id, r]));
  const rs = lotPlots.map((p) => res.get(p.id));
  const whispRuns = rs.filter((r) => r?.whisp_risk).length;
  const reviewed = rs.filter((r) => r?.decision).length;
  const afterHigh = rs.filter((r) => r?.whisp_colour === "red").length;
  const yieldFlags = rs.filter((r) => r?.yield?.flag).length;
  const auto = {
    a: ["Colombia is standard risk (Impl. Reg. 2025/1093): full due diligence, no Art 13 simplification.", "standard"],
    b: [`${whispRuns}/${lotPlots.length} plots checked with FAO Whisp (JRC GFC2020, TMF, Hansen, RADD/GLAD${country === "CO" ? ", IDEAM" : country === "CI" ? ", BNETD 2020 forest and cocoa" : ""} layers). ${afterHigh} flagged high risk and handled by review. Whisp supports due diligence; it does not replace it, and no single map gives the full picture (FAO). The operator should confirm with its own sources.`, afterHigh ? "mitigated" : "supported"],
    c: ["Overlap with ANT resguardos and consejos comunitarios: overlay planned (next phase). No overlap declared in questionnaire.", "gap"],
    d: ["Only required where an ethnic-territory overlap exists. None detected yet (overlay planned).", "gap"],
    e: ["No claims recorded. Overlay with ANT and land-restitution register planned.", "gap"],
    f: ["IDEAM: 119,483 ha deforested in 2025, concentrated in Caquetá, Meta, Putumayo. Plots outside the Amazon arc carry lower prior risk.", "context"],
    g: [`Plot data from receipts (AI extraction, human-checked) and GPS capture; ${reviewed} reviewer decisions logged with name and timestamp.`, "documented"],
    h: ["Requires narrative assessment (armed conflict, document falsification). Slot reserved for LLM-drafted, evidence-cited text with human sign-off (next phase).", "manual"],
    i: [`Cooperative aggregates ${lotPlots.length} smallholder plots; each delivery is linked to its plot and season.`, "documented"],
    j: [lotCheck.tainted ? `Lot contains ${lotCheck.offenders.length} non-cleared input(s): NOT eligible.` : `Segregated EU lot; ${yieldFlags} yield anomaly(ies) handled by review; no unknown-origin inputs.`, lotCheck.tainted ? "fail" : "negligible"],
    k: ["To be completed by the operator.", "manual"],
    l: ["No substantiated concerns recorded.", "manual"],
    m: ["None recorded.", "manual"],
    n: ["Certifications support but do not replace due diligence. None attached.", "manual"],
  };
  // A country profile replaces the country-specific rows (a, c-i except b); computed rows stay computed.
  for (const [k, row] of Object.entries(overrides)) if (["a", "c", "d", "e", "f", "g", "h", "i"].includes(k)) auto[k] = row;
  return ART10.map(([k, criterion]) => ({ criterion: `10(2)(${k})`, text: criterion, finding: auto[k][0], rating: auto[k][1] }));
}

function art11Log(lotPlots, results) {
  const res = new Map(results.map((r) => [r.id, r]));
  return lotPlots
    .map((p) => ({ p, r: res.get(p.id) }))
    .filter(({ r }) => r?.decision)
    .map(({ p, r }) => ({
      plot: p.id,
      farm: p.farm,
      trigger: r.reasons.filter((x) => !x.startsWith("Reviewer")).join("; "),
      action: { accept: "Accepted with evidence (Art 11(1)(a))", mitigate: "Additional information or field visit requested (Art 11(1)(a)-(b))", exclude: "Plot excluded from EU supply" }[r.decision.decision],
      reason: r.decision.reason || "",
      reviewer: r.decision.reviewer || "",
      at: r.decision.at,
    }));
}

// The operator draws the Art 10 conclusion. EUDR-Snap never pre-writes "negligible risk" while
// criteria are open: it states how many are open and which.
export function conclusionText(rows) {
  const open = rows.filter((r) => ["gap", "manual", "fail"].includes(r.rating));
  if (!open.length) return "All criteria have a finding. The operator draws the conclusion (Art 10(1)).";
  return `No conclusion drawn: ${open.length} of ${rows.length} criteria are still open (${open.map((r) => r.criterion.replace("10(2)", "")).join(" ")}: rated gap, manual or fail). The operator completes them and draws the conclusion (Art 10(1)).`;
}

// ---------- human-readable report ----------

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const COUNTRY_NAMES = { CO: "Colombia", CI: "Côte d'Ivoire", GH: "Ghana" };

// One printable document a person can read, check and sign (browser: Print -> Save as PDF).
// Same facts as the JSON files, which stay the machine-readable source.
export function buildReportHtml({ lotCheck, lotPlots, res, dds, rows, log, cooperative, country, whisp, files, now }) {
  const table = (head, body) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table>`;
  const plotRows = lotPlots.map((p) => {
    const r = res.get(p.id);
    const kg = (p.deliveries || []).filter((d) => !r?.yield?.season || d.season === r.yield.season).reduce((a, d) => a + Number(d.kg || 0), 0);
    return `<tr><td>${esc(p.id)}</td><td>${esc(p.farmer_name)}${p.producer_card ? `<br><small>card ${esc(p.producer_card)}</small>` : ""}</td><td>${esc(p.farm)}<br><small>${esc(p.municipality || p.region)}</small></td><td>${esc(p.hectares)}</td><td>${esc(p.geometry?.type)}</td><td>${esc(kg.toLocaleString("en"))} ${esc(p.deliveries?.[0]?.unit || "kg")}<br><small>season ${esc(r?.yield?.season)}</small></td><td>${esc(r?.whisp_risk || "not checked")}</td><td>${esc(STATUS_LABELS[r?.status] || r?.status)}</td></tr>`;
  });
  const receipts = lotPlots.flatMap((p) => (p.deliveries || []).map((d) => `<tr><td>${esc(d.receipt)}</td><td>${esc(d.date)}</td><td>${esc(p.id)}</td><td>${esc(Number(d.kg).toLocaleString("en"))} ${esc(d.unit || "kg")}</td><td>${esc(d.source || "cooperative record")}</td></tr>`));
  const art10 = rows.map((r) => `<tr><td>${esc(r.criterion)}</td><td>${esc(r.text)}</td><td>${esc(r.finding)}</td><td class="rating ${esc(r.rating)}">${esc(r.rating)}</td></tr>`);
  const art11 = log.length ? log.map((e) => `<tr><td>${esc(e.plot)}</td><td>${esc(e.trigger)}</td><td>${esc(e.action)}</td><td>${esc(e.reason)}</td><td>${esc(e.reviewer)}</td><td>${esc(e.at)}</td></tr>`) : ['<tr><td colspan="6">No reviewer decisions recorded.</td></tr>'];
  const goods = dds.commodities.map((c) => `<tr><td>${esc(c.hsHeading)}</td><td>${esc(c.descriptionOfGoods)}</td><td>${esc(c.estimatedKgFromDeliveries.toLocaleString("en"))} ${esc(c.estimatedKgUnit || "kg")}</td><td>[Importer fills: net mass shipped]</td></tr>`);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Due diligence report ${esc(lotCheck.id)} (draft)</title>
<style>
body{font:13px/1.45 Georgia,serif;color:#111;max-width:960px;margin:24px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #999;padding-bottom:3px}
.draft{border:2px solid #b00;color:#b00;padding:8px 12px;font-weight:bold;margin:12px 0}
table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eee}
small{color:#555}.rating.gap,.rating.manual,.rating.fail{background:#fff3cd}.sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}.sign div{border-top:1px solid #111;padding-top:4px;margin-top:40px}
code{font-size:11px;word-break:break-all}@media print{body{margin:0}}
</style></head><body>
<h1>EUDR due diligence report: lot ${esc(lotCheck.id)}</h1>
<p>Regulation (EU) 2023/1115 as amended by 2025/2650 · prepared ${esc(now.slice(0, 10))} · country of production: ${esc(COUNTRY_NAMES[country] || country)} (${esc(country)})</p>
<div class="draft">${esc(DISCLAIMER)}</div>

<h2>1. Operator and supplier (Art 9(1)(e)-(f))</h2>
${table(["", "Details"], [
  `<tr><td>Operator (EU importer)</td><td>[Operator fills: name, address, EORI]</td></tr>`,
  `<tr><td>Activity</td><td>${esc(dds.activityType)} into ${esc(dds.countryOfActivity)}</td></tr>`,
  `<tr><td>Supplier</td><td>${esc(cooperative?.name)}${cooperative?.municipality ? ", " + esc(cooperative.municipality) : ""}${cooperative?.nit ? " · NIT " + esc(cooperative.nit) : ""}${cooperative?.registration ? " · " + esc(cooperative.registration) : ""}</td></tr>`,
])}

<h2>2. Goods (Art 9(1)(a)-(c))</h2>
${table(["HS heading", "Description", "Estimated from deliveries", "Net mass"], goods)}

<h2>3. Plots of land and geolocation (Art 9(1)(d))</h2>
<p>${esc(lotPlots.length)} plot(s). Coordinates are in <code>traces-geolocation.geojson</code> (WGS84, 6 decimals) for upload to the EU Information System. Plots over 4 ha are polygons (Art 2(28)).</p>
${table(["Plot", "Producer", "Farm", "ha", "Geolocation", "Season volume", "Whisp risk", "Status"], plotRows)}
<p>Lot check: ${esc(lotCheck.message)}.</p>

<h2>4. Purchase records</h2>
${table(["Receipt", "Date", "Plot", "Quantity", "Source"], receipts)}

<h2>5. Deforestation-free and legality evidence (Art 9(1)(g)-(h))</h2>
<p>Deforestation risk per plot from FAO Whisp${whisp?.version ? " " + esc(whisp.version) : ""}${whisp?.checked_at ? ", checked " + esc(whisp.checked_at) : ""}. Whisp supports due diligence; it does not replace it. Legality evidence per plot: see <code>art9-evidence.json</code> (questionnaire pending where not supplied).</p>

<h2>6. Risk assessment (Art 10)</h2>
${table(["Criterion", "Art 10(2)", "Finding", "Rating"], art10)}
<p><b>Conclusion:</b> ${esc(conclusionText(rows))}</p>

<h2>7. Risk mitigation (Art 11)</h2>
${table(["Plot", "Trigger", "Action", "Reason", "Reviewer", "When"], art11)}

<h2>8. Files in this pack (keep 5 years: Art 4(3), Art 9(1))</h2>
${table(["File", "SHA-256"], files.map((f) => `<tr><td>${esc(f.filename)}</td><td><code>${esc(f.sha256)}</code></td></tr>`))}

<h2>9. Statement and signature (Annex II points 5-6)</h2>
<p>To be completed by the operator in the EU Information System: "By submitting this due diligence statement the operator confirms that due diligence in accordance with Regulation (EU) 2023/1115 was carried out and that no or only a negligible risk was found that the relevant products do not comply with Article 3, point (a) or (b), of that Regulation."</p>
<div class="sign"><div>Signed for and on behalf of: [operator]</div><div>Date</div><div>Name and function</div><div>Signature</div></div>
</body></html>
`;
}

// ---------- the pack ----------

// Returns { blocking: [...], lot, documents: [{ id, title, filename, mime, content, sha256 }] }
export async function buildPack({ plots, results, lot, cooperative, whisp, profile }) {
  const country = profile?.country_iso2 || "CO";
  const res = new Map(results.map((r) => [r.id, r]));
  const lotPlots = plots.filter((p) => lot.plot_ids.includes(p.id));
  const lotCheck = checkLot(lot, plots, results);
  const blocking = [];
  if (lot.market !== "EU") blocking.push("Only the EU lot needs an EUDR pack");
  if (!lotPlots.length) blocking.push("The EU lot is empty");
  if (lotCheck.tainted) blocking.push(lotCheck.message);
  for (const p of lotPlots) {
    for (const e of checkGeometry(p).errors) blocking.push(`${p.farm}: ${e}`);
  }
  if (blocking.length) return { blocking, lot: lotCheck, documents: [] };

  const now = new Date().toISOString();
  const byCrop = {};
  for (const p of lotPlots) (byCrop[p.crop.toLowerCase()] ||= []).push(p);

  const geojsonText = stringifyGeoJSON(buildTracesGeoJSON(lotPlots, country));
  const dds = {
    _status: DISCLAIMER,
    activityType: "IMPORT",
    operator: { name: "[Importer fills]", eori: "[Importer fills]" },
    countryOfActivity: "[EU member state]",
    supplier: cooperative,
    commodities: Object.entries(byCrop).map(([crop, ps]) => ({
      hsHeading: HS[crop]?.hsHeading,
      descriptionOfGoods: HS[crop]?.description,
      netWeightKg: "[Importer fills: net mass actually shipped]",
      estimatedKgFromDeliveries: ps.reduce((s, p) => s + (res.get(p.id)?.yield?.kg_comparable || 0), 0),
      estimatedKgUnit: (res.get(ps[0]?.id)?.yield?.unit || "").replace("/ha", "") || null,
      producers: ps.map((p) => ({ country, name: p.farmer_name })),
      geolocation: { file: "traces-geolocation.geojson", geometryGeojsonBase64: utf8ToBase64(stringifyGeoJSON(buildTracesGeoJSON(ps, country), 0)) },
    })),
    declaration: "Point 5 (Annex II) statement and point 6 signature are completed by the operator in the EU Information System.",
    afterFiling: { referenceNumber: null, verificationNumber: null, customsCode: "C716" },
  };
  const ddsText = JSON.stringify(dds, null, 2);

  const art9 = {
    _status: DISCLAIMER,
    article: "Art 9(1)(a)-(h)",
    lot: lot.id,
    products: Object.entries(byCrop).map(([crop, ps]) => ({ crop, hs: HS[crop]?.hsHeading, estimatedKgFromDeliveries: ps.reduce((s, p) => s + (res.get(p.id)?.yield?.kg_comparable || 0), 0) })),
    countryOfProduction: country,
    plots: lotPlots.map((p) => {
      const r = res.get(p.id);
      return {
        id: p.id,
        farmer: p.farmer_name,
        farm: p.farm,
        municipality: p.municipality,
        producerCard: p.producer_card || null,
        hectares: p.hectares,
        geometryType: p.geometry.type,
        season: r?.yield?.season,
        deliveries: (p.deliveries || []).map((d) => ({ date: d.date, kg: d.kg, receipt: d.receipt })),
        deforestationFree: { whispRisk: r?.whisp_risk, indicators: r?.indicators, whispVersion: whisp?.version, checkedAt: whisp?.checked_at },
        legality: p.legality || { status: "questionnaire pending" },
        reviewDecision: r?.decision || null,
      };
    }),
    supplier: cooperative,
    retentionYears: 5,
  };
  const art9Text = JSON.stringify(art9, null, 2);

  const rows = art10Rows(lotPlots, results, lotCheck, profile?.art10, country);
  const log = art11Log(plots, results);
  const art10Text = JSON.stringify({ _status: DISCLAIMER, conclusion: conclusionText(rows), criteria: rows }, null, 2);
  const art11Text = JSON.stringify({ _status: DISCLAIMER, entries: log }, null, 2);

  const docs = [
    { id: "geojson", title: "EU Information System GeoJSON", subtitle: `${lotPlots.length} plots · WGS84 · 6 decimals`, filename: "traces-geolocation.geojson", mime: "application/geo+json", content: geojsonText },
    { id: "dds", title: "Due diligence statement data pack", subtitle: "Annex II points 1-3 · HS, estimated kg, producers", filename: "dds-data-pack.json", mime: "application/json", content: ddsText },
    { id: "art9", title: "Art 9 evidence file", subtitle: "Plots, deliveries, Whisp runs, legality", filename: "art9-evidence.json", mime: "application/json", content: art9Text },
    { id: "art10", title: "Art 10 risk assessment", subtitle: "Criteria (a)-(n), auto-filled where data exists", filename: "art10-risk-assessment.json", mime: "application/json", content: art10Text },
    { id: "art11", title: "Art 11 mitigation log", subtitle: `${log.length} reviewer decision(s)`, filename: "art11-mitigation-log.json", mime: "application/json", content: art11Text },
  ];
  for (const d of docs) d.sha256 = await sha256(d.content);
  const reportText = buildReportHtml({ lotCheck, lotPlots, res, dds, rows, log, cooperative, country, whisp, files: docs, now });
  docs.push({ id: "report", title: "Due diligence report (readable, printable)", subtitle: "Arts 9-11 in one document · print to PDF · operator signs", filename: `due-diligence-report-${String(lot.id).replace(/[^A-Za-z0-9_-]/g, "_")}.html`, mime: "text/html", content: reportText, sha256: await sha256(reportText) });

  const keepUntil = new Date(Date.now() + 5 * 365.25 * 86400000).toISOString().slice(0, 10);
  const retention = {
    _status: DISCLAIMER,
    createdAt: now,
    keepUntil,
    basis: "Art 4(3), Art 9(1): keep 5 years",
    documents: docs.map((d) => ({ file: d.filename, sha256: d.sha256 })),
    whisp: whisp ? { version: whisp.version, checkedAt: whisp.checked_at } : null,
    rules: { config: CONFIG },
  };
  const retentionText = JSON.stringify(retention, null, 2);
  docs.push({ id: "retention", title: "Retention index", subtitle: `SHA-256 per file · keep until ${keepUntil}`, filename: "retention-index.json", mime: "application/json", content: retentionText, sha256: await sha256(retentionText) });

  return { blocking: [], lot: lotCheck, documents: docs, art10: rows, art11: log, statusLabels: STATUS_LABELS };
}
