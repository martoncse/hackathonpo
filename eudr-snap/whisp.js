// Thin client for the FAO Whisp API (https://whisp.openforis.org/api/docs).
// Contract checked against /api/openapi.json on 21 Nov 2026:
//   POST /api/submit/geojson  body = FeatureCollection + analysisOptions
//   header x-api-key
//   200 {code:"analysis_completed", data: FeatureCollection}  (sync)
//   202 {code:"analysis_queued", data:{token}} -> poll GET /api/status/{token}
// Each result feature carries properties such as risk_pcrop ("low" / "high" / ...),
// Ind_04_disturbance_after_2020 ("yes"/"no"), Country, Area.

import { whispColour, whispPropsById } from "./shared/rules.js";

const BASE = "https://whisp.openforis.org/api";

export class WhispError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function toFeatureCollection(plots) {
  return {
    type: "FeatureCollection",
    features: plots.map((p) => ({
      type: "Feature",
      geometry: p.geometry,
      properties: { plot_id: String(p.id) },
    })),
  };
}

async function callWhisp(url, apiKey, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": apiKey, ...(init.headers || {}) },
    signal: AbortSignal.timeout(90_000),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new WhispError(`Whisp returned HTTP ${res.status} with no JSON body`, "bad_response");
  }
  return { status: res.status, body };
}

// Submits plots and waits for the result. Returns the result FeatureCollection.
export async function analysePlots(plots, apiKey, { async = false, maxWaitMs = 60_000, onProgress, nationalCodes = ["co"] } = {}) {
  if (!apiKey) throw new WhispError("No Whisp API key set", "auth_missing_api_key");
  const payload = {
    ...toFeatureCollection(plots),
    analysisOptions: { async, externalIdColumn: "plot_id", unitType: "ha", ...(nationalCodes.length ? { nationalCodes } : {}) },
  };
  let { status, body } = await callWhisp(`${BASE}/submit/geojson`, apiKey, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const deadline = Date.now() + maxWaitMs;
  while (body.code === "analysis_queued" || body.code === "analysis_processing") {
    const token = body.data?.token;
    if (!token) throw new WhispError("Whisp queued the job but sent no token", "bad_response");
    if (Date.now() > deadline) throw new WhispError("Whisp took too long to answer", "analysis_timeout");
    onProgress?.(body.data?.percent ?? null);
    await new Promise((r) => setTimeout(r, 2500));
    ({ status, body } = await callWhisp(`${BASE}/status/${encodeURIComponent(token)}`, apiKey));
  }

  if (body.code !== "analysis_completed") {
    throw new WhispError(body.message || `Whisp error (HTTP ${status})`, body.code || "unknown");
  }
  return body.data;
}

// One tiny test plot (a coffee area in Huila) to check that a key works.
export async function testKey(apiKey) {
  const plot = { id: "key-test", geometry: { type: "Point", coordinates: [-76.05, 1.85] } };
  const fc = await analysePlots([plot], apiKey);
  return { ok: true, features: fc.features?.length ?? 0, version: fc.features?.[0]?.properties?.whisp_processing_metadata?.whisp_version };
}

function propsById(fc) {
  return whispPropsById(fc);
}

// ---------- Finding real demo plots ----------

function square(lon, lat, side = 0.0015) {
  const h = side / 2;
  const r = (n) => Number(n.toFixed(6));
  return {
    type: "Polygon",
    coordinates: [[
      [r(lon - h), r(lat - h)], [r(lon + h), r(lat - h)], [r(lon + h), r(lat + h)],
      [r(lon - h), r(lat + h)], [r(lon - h), r(lat - h)],
    ]],
  };
}

function grid(prefix, lon, lat, n, step) {
  const out = [];
  const off = ((n - 1) / 2) * step;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = lon - off + i * step;
      const y = lat - off + j * step;
      out.push({ id: `${prefix}-${i}${j}`, area: prefix, centre: [x, y], geometry: square(x, y) });
    }
  }
  return out;
}

// Coffee areas in Huila (expected low risk) and Colombia's Amazon deforestation arc
// (Meta / Caquetá / Guaviare, where most tree loss since 2020 happened).
export const SEARCH_AREAS = {
  huila: [
    ["pitalito", -76.05, 1.85],
    ["acevedo", -75.88, 1.80],
    ["laplata", -75.88, 2.39],
    ["garzon", -75.63, 2.2],
  ],
  frontier: [
    ["tinigua", -74.1, 2.25],
    ["sanvicente", -74.45, 1.6],
    ["chaira", -74.6, 1.05],
    ["guaviare", -72.45, 2.0],
  ],
};

export function buildCandidates() {
  const huila = SEARCH_AREAS.huila.flatMap(([name, x, y]) => grid(`huila_${name}`, x, y, 3, 0.01));
  const frontier = SEARCH_AREAS.frontier.flatMap(([name, x, y]) => grid(`frontier_${name}`, x, y, 5, 0.03));
  return { huila, frontier };
}

const FARMERS = [
  // Declared hectares match the mapped demo squares (2.79 ha) so the yield check can't be explained away.
  { name: "Rosa Elena Muñoz", finca: "Finca El Paraíso", crop: "Coffee", hectares: 2.79, municipality: "Pitalito", deliveries: [1200, 1000, 800] },
  // Over-delivery on purpose: 9,300 kg parchment from 2.79 ha = 2,667 kg green/ha, above the 2,520 review threshold.
  { name: "Luis Alberto Cuéllar", finca: "Finca La Esperanza", crop: "Coffee", hectares: 2.79, municipality: "Acevedo", deliveries: [2800, 3100, 3400] },
  { name: "María Fernanda Losada", finca: "Finca Los Naranjos", crop: "Coffee", hectares: 2.79, municipality: "La Plata", deliveries: [1500, 1300, 900] },
  { name: "Jorge Iván Perdomo", finca: "Finca Buenavista", crop: "Coffee", hectares: 6.2, municipality: "Garzón", deliveries: [2600, 2800, 2000] },
  { name: "Wilson Andrés Trujillo", finca: "Finca Caño Negro", crop: "Cocoa", hectares: 2.79, municipality: "Cartagena del Chairá", deliveries: [700, 650, 550] },
];

// Runs all candidates through Whisp in one async job and picks:
// 3 low-risk Huila plots (green), 1 Huila point of 6.2 ha (amber by local rule),
// 1 frontier plot Whisp rates high risk (red).
export async function findDemoPlots(apiKey, onProgress) {
  const { huila, frontier } = buildCandidates();
  const all = [...huila, ...frontier];
  const fc = await analysePlots(all, apiKey, { async: true, maxWaitMs: 8 * 60_000, onProgress });
  const byId = propsById(fc);
  const rated = all.map((c, i) => {
    const p = byId.get(c.id) || fc.features?.[i]?.properties || {};
    return { ...c, risk: p.risk_pcrop ?? null, after2020: p.Ind_04_disturbance_after_2020 ?? null };
  });

  const lowHuila = [];
  const usedAreas = new Set();
  for (const c of rated.filter((c) => c.area.startsWith("huila") && whispColour(c.risk) === "green")) {
    if (!usedAreas.has(c.area)) {
      lowHuila.push(c);
      usedAreas.add(c.area);
    }
  }
  for (const c of rated.filter((c) => c.area.startsWith("huila") && whispColour(c.risk) === "green")) {
    if (lowHuila.length >= 4) break;
    if (!lowHuila.includes(c)) lowHuila.push(c);
  }
  const red = rated.find((c) => c.area.startsWith("frontier") && whispColour(c.risk) === "red" && c.after2020 === "yes")
    || rated.find((c) => c.area.startsWith("frontier") && whispColour(c.risk) === "red");

  const summary = {
    candidates: rated.length,
    huila_low: rated.filter((c) => c.area.startsWith("huila") && whispColour(c.risk) === "green").length,
    frontier_high: rated.filter((c) => c.area.startsWith("frontier") && whispColour(c.risk) === "red").length,
    risk_values_seen: [...new Set(rated.map((c) => c.risk))],
  };
  if (lowHuila.length < 4 || !red) {
    throw new WhispError(
      `Not enough real plots found (need 4 low-risk Huila, 1 high-risk frontier). Got: ${JSON.stringify(summary)}`,
      "not_enough_plots",
    );
  }

  const picks = [lowHuila[0], lowHuila[1], lowHuila[2], lowHuila[3], red];
  const farms = picks.map((c, i) => {
    const f = FARMERS[i];
    // Farm 4 (6.2 ha) is recorded as a point only, to trigger the >4 ha polygon rule.
    const geometry = i === 3 ? { type: "Point", coordinates: c.centre.map((n) => Number(n.toFixed(6))) } : c.geometry;
    return {
      id: `F${i + 1}`,
      farmer_name: f.name,
      farm: f.finca,
      crop: f.crop,
      hectares: f.hectares,
      municipality: f.municipality,
      deliveries: f.deliveries.map((kg, j) => ({
        date: `2026-0${5 + j}-1${j}`,
        season: "2026-A",
        kg,
        unit: f.crop === "Coffee" ? "kg pergamino seco" : "kg cacao seco",
        receipt: `R-${i + 1}0${j + 1}`,
      })),
      region: c.area.startsWith("huila") ? "Huila" : "Meta / Caquetá / Guaviare",
      search_cell: c.id,
      geometry,
    };
  });
  return { farms, summary };
}
