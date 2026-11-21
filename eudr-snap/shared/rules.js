// EUDR-Snap local rules. Pure functions, used by the Node server AND the browser.
// Whisp says whether land is risky; these rules cover what Whisp cannot see:
// geometry validity for the EU Information System, delivered volume vs plot size,
// human review decisions, and lot segregation.

export const CONFIG = {
  // Demo baselines. Replace with municipal yields (UPRA EVA) per plot. All "verify".
  coffee: {
    parchmentToGreen: 1.25, // kg pergamino seco per kg green (~19 bags p.s. = 15 bags green, Fedecafé; verify)
    nationalAvgGreenKgPerHa: 1260, // ~21 bags of 60 kg/ha in 2025 (Cenicafé / FNC, via Portafolio)
    maxGreenKgPerHa: 2520, // 2x national average: above this the plot goes to REVIEW, it is not proof of mixing
  },
  cocoa: {
    nationalAvgKgPerHa: 400,
    maxKgPerHa: 2000, // review threshold; "best Colombian farms reach ~2,000" is unsourced: verify
  },
  pointMaxHa: 4, // EUDR Art 2(28): plots over 4 ha need a polygon
  gpsMarginHa: 0.4, // 3.6-4.4 ha points go to review
  areaTolerance: 0.15, // declared vs measured polygon area
  eligibleStatuses: ["green", "accepted"],
};

export const STATUS_LABELS = {
  green: "Compliant",
  accepted: "Accepted after review",
  review: "Needs review",
  mitigating: "Mitigation open",
  excluded: "Excluded",
  blocked: "Fix geolocation",
  unchecked: "Not checked",
};

// Whisp risk label -> traffic-light colour for display (not the final status).
export function whispColour(risk) {
  const r = String(risk ?? "").toLowerCase();
  if (!r) return null;
  if (r.includes("high")) return "red";
  if (r.includes("low")) return "green";
  return "amber"; // more_info_needed and anything unknown
}

// ---------- geometry ----------

const R = 6378137;
const rad = (d) => (d * Math.PI) / 180;

// Geodesic-ish ring area in m2 (same spherical formula as turf.js).
function ringArea(ring) {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    total += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
  }
  return Math.abs((total * R * R) / 2);
}

export function areaHa(geometry) {
  if (!geometry) return 0;
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates;
    return (ringArea(outer) - holes.reduce((s, h) => s + ringArea(h), 0)) / 10000;
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce((s, p) => s + areaHa({ type: "Polygon", coordinates: p }), 0);
  }
  return 0;
}

function validLonLat([lon, lat]) {
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
}

// Returns { errors: [] (block export), notes: [] (review), measured_ha }
export function checkGeometry(plot) {
  const g = plot.geometry;
  const errors = [];
  const notes = [];
  let measured = null;
  const declared = Number(plot.hectares);

  if (!g || !["Point", "MultiPoint", "Polygon", "MultiPolygon"].includes(g.type)) {
    errors.push("No valid geolocation (EU IS accepts Point, MultiPoint, Polygon, MultiPolygon only)");
    return { errors, notes, measured_ha: measured };
  }
  if (g.type === "Point") {
    if (!validLonLat(g.coordinates)) errors.push("Coordinates out of range");
    if (declared > CONFIG.pointMaxHa) {
      errors.push(`Plot is ${declared} ha but only a point was captured. Plots over 4 ha need a polygon (Reg. 2023/1115, Art 2(28))`);
    } else if (declared >= CONFIG.pointMaxHa - CONFIG.gpsMarginHa) {
      notes.push(`Plot is ${declared} ha, within GPS error of the 4 ha limit: walk the boundary to be safe`);
    }
  }
  if (g.type === "Polygon" || g.type === "MultiPolygon") {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of polys) {
      if (poly.length > 1) errors.push("Polygon has holes; the EU Information System rejects them");
      const ring = poly[0] || [];
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (ring.length < 4 || !first || !last || first[0] !== last[0] || first[1] !== last[1]) {
        errors.push("Polygon ring is not closed");
      }
      if (!ring.every(validLonLat)) errors.push("Coordinates out of range");
    }
    measured = Math.round(areaHa(g) * 100) / 100;
    if (declared > 0 && Math.abs(measured - declared) / declared > CONFIG.areaTolerance) {
      notes.push(`Declared ${declared} ha but the mapped boundary measures ${measured} ha (more than 15% apart)`);
    }
  }
  return { errors, notes, measured_ha: measured };
}

// ---------- yield ----------

export function seasonOf(plot) {
  const seasons = [...new Set((plot.deliveries || []).map((d) => d.season))];
  return seasons.sort().at(-1) || null;
}

// Sums deliveries for one season and compares with the crop baseline.
// Uses the MEASURED area when a boundary was mapped (the declared figure is only a fallback),
// so "the plot is just bigger than declared" can't explain a flag away.
export function checkYield(plot, season = seasonOf(plot)) {
  const isPoly = plot.geometry && (plot.geometry.type === "Polygon" || plot.geometry.type === "MultiPolygon");
  const measured = isPoly ? Math.round(areaHa(plot.geometry) * 100) / 100 : null;
  const ha = measured > 0 ? measured : Number(plot.hectares);
  const deliveries = (plot.deliveries || []).filter((d) => !season || d.season === season);
  const kg = deliveries.reduce((s, d) => s + Number(d.kg || 0), 0);
  const crop = String(plot.crop || "").toLowerCase();
  const out = { season, deliveries: deliveries.length, kg_delivered: kg, kg_comparable: null, kg_per_ha: null, ha_used: ha, area_basis: measured > 0 ? "measured boundary" : "declared", limit: null, unit: null, flag: null };
  if (!(ha > 0)) return out;

  if (crop === "coffee") {
    const green = kg / CONFIG.coffee.parchmentToGreen;
    out.kg_comparable = Math.round(green);
    out.kg_per_ha = Math.round(green / ha);
    out.limit = CONFIG.coffee.maxGreenKgPerHa;
    out.unit = "kg green/ha";
  } else if (crop === "cocoa") {
    out.kg_comparable = kg;
    out.kg_per_ha = Math.round(kg / ha);
    out.limit = CONFIG.cocoa.maxKgPerHa;
    out.unit = "kg dry beans/ha";
  } else {
    return out;
  }
  if (out.kg_per_ha > out.limit) {
    out.flag = `Needs review: ${kg.toLocaleString("en")} kg delivered in ${season} from ${ha} ha (${out.area_basis}) = ${out.kg_per_ha.toLocaleString("en")} ${out.unit}, above the review threshold of ${out.limit.toLocaleString("en")}. Could be produce from other plots, or a very productive farm: ask before accepting`;
  }
  return out;
}

// ---------- classification ----------

// Whisp copies our plot id (externalIdColumn) into `external_id`; `plotId` is its own 1..n.
export function whispPropsById(fc) {
  const map = new Map();
  for (const f of fc?.features || []) {
    const p = f.properties || {};
    const id = p.external_id || p.plot_id;
    if (id != null && id !== "") map.set(String(id), p);
  }
  return map;
}

// plots: farm records; fc: Whisp result FeatureCollection (or null);
// decisions: { [plotId]: { decision: "accept"|"mitigate"|"exclude", reason, reviewer, at } }
export function classify(plots, fc, decisions = {}) {
  const byId = whispPropsById(fc);
  return plots.map((plot) => {
    const w = fc ? byId.get(String(plot.id)) || null : null;
    const geometry = checkGeometry(plot);
    const yieldCheck = checkYield(plot);
    const decision = decisions[plot.id] || null;
    const colour = w ? whispColour(w.risk_pcrop) : null;
    const reasons = [];

    if (!w) reasons.push("Not checked with Whisp yet");
    else if (colour === "red") reasons.push("Whisp: high risk, forest in 2020 and disturbance after 2020");
    else if (colour === "amber") reasons.push(`Whisp: ${w.risk_pcrop}, forest in 2020 with no commodity or disturbance record`);
    else reasons.push("Whisp: low risk");
    for (const e of geometry.errors) reasons.push(e);
    for (const n of geometry.notes) reasons.push(n);
    if (yieldCheck.flag) reasons.push(yieldCheck.flag);

    const needsReview = colour === "red" || colour === "amber" || Boolean(yieldCheck.flag) || geometry.notes.length > 0;
    let status;
    if (geometry.errors.length) status = "blocked";
    else if (decision?.decision === "exclude") status = "excluded";
    else if (decision?.decision === "mitigate") status = "mitigating";
    else if (decision?.decision === "accept") status = "accepted";
    else if (!w) status = "unchecked";
    else if (needsReview) status = "review";
    else status = "green";
    if (decision) reasons.push(`Reviewer (${decision.reviewer || "unknown"}): ${decision.decision}${decision.reason ? ": " + decision.reason : ""}`);

    return {
      id: plot.id,
      status,
      eligible: CONFIG.eligibleStatuses.includes(status),
      whisp_risk: w?.risk_pcrop ?? null,
      whisp_colour: colour,
      indicators: w
        ? {
            treecover_2020: w.Ind_01_treecover ?? null,
            commodities: w.Ind_02_commodities ?? null,
            disturbance_before_2020: w.Ind_03_disturbance_before_2020 ?? null,
            disturbance_after_2020: w.Ind_04_disturbance_after_2020 ?? null,
            country: w.Country ?? null,
            admin_1: w.Admin_Level_1 ?? null,
          }
        : null,
      geometry,
      yield: yieldCheck,
      decision,
      reasons,
    };
  });
}

// ---------- segregation ----------

// lot: { id, market: "EU" | "non-EU", plot_ids: [] }. Mass balance is not allowed
// (Commission FAQ v5 Q1.5): one non-eligible input taints the whole EU lot.
export function checkLot(lot, plots, results) {
  const byId = new Map(results.map((r) => [r.id, r]));
  const plotById = new Map(plots.map((p) => [p.id, p]));
  const offenders = [];
  let kgDelivered = 0;
  let kgComparable = 0;
  for (const id of lot.plot_ids) {
    const r = byId.get(id);
    const y = r?.yield;
    kgDelivered += y?.kg_delivered || 0;
    kgComparable += y?.kg_comparable || 0;
    if (lot.market === "EU" && !r?.eligible) {
      offenders.push({ id, farm: plotById.get(id)?.farm, status: r?.status || "unchecked", label: STATUS_LABELS[r?.status] || "Not checked" });
    }
  }
  return {
    id: lot.id,
    market: lot.market,
    plots: lot.plot_ids.length,
    kg_delivered: kgDelivered,
    kg_comparable: kgComparable,
    tainted: offenders.length > 0,
    offenders,
    message: offenders.length
      ? `Lot tainted: ${offenders.length} input(s) not cleared. Mass balance is not allowed (Commission FAQ v5 Q1.5), so the whole lot cannot go to the EU`
      : lot.market === "EU"
        ? "Every input comes from a cleared plot"
        : "Non-EU lot: EUDR does not apply",
  };
}
