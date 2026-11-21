// EUDR-Snap story mode: receipt -> plot -> Whisp -> review -> segregated lot -> importer pack.
import { Map3D, COLOURS, centroid } from "./map3d.js";
import { classify, checkLot, STATUS_LABELS, CONFIG } from "/shared/rules.js";
import { buildPack, DISCLAIMER } from "/shared/export.js";

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toLocaleString("en");

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

const state = {
  doc: null,
  farms: [],
  raw: null,
  whisp: null,
  source: null,
  liveError: null,
  scanned: false,
  placed: false,
  decisions: {},
  results: [],
  lots: { EU: [], NON: [] },
  lotsInit: false,
  scene: 0,
  reviewId: "F5",
  walked: false,
  lite: store("eudr-lite") === "1",
};

const map3d = new Map3D("map", { lite: state.lite });

// ---------- helpers ----------

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "content-type": "application/json" }, ...opts });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function toast(msg, ms = 3200) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add("hidden"), ms);
}

const farmById = (id) => state.farms.find((f) => f.id === id);
const resultById = (id) => state.results.find((r) => r.id === id);

function colourOf(r) {
  if (!state.scanned || !r) return COLOURS.unchecked;
  switch (r.status) {
    case "green":
    case "accepted":
      return COLOURS.green;
    case "excluded":
      return COLOURS.excluded;
    case "review":
      return r.whisp_colour === "red" ? COLOURS.red : COLOURS.amber;
    case "mitigating":
    case "blocked":
      return COLOURS.amber;
    default:
      return COLOURS.unchecked;
  }
}

function heightOf(r) {
  if (!state.scanned || !r) return 140;
  return { green: 70, accepted: 90, review: r.whisp_colour === "red" ? 520 : 300, mitigating: 260, blocked: 240, excluded: 30 }[r.status] ?? 140;
}

function labelOf(r) {
  if (!state.scanned || !r) return null;
  if (r.status === "review" && r.whisp_colour === "red") return "Deforestation alert";
  if (r.status === "review" && r.yield?.flag) return "Volume alert";
  return STATUS_LABELS[r.status];
}

function recompute() {
  state.results = classify(state.farms, state.scanned ? state.raw : null, state.decisions);
  refreshMap();
}

function refreshMap() {
  if (!state.farms.length) return;
  map3d.setPlots(
    state.placed
      ? state.farms.map((f) => {
          const r = resultById(f.id);
          return { id: f.id, geometry: f.geometry, colour: colourOf(r), height: heightOf(r) };
        })
      : [],
  );
  const coop = state.doc.cooperative;
  map3d.setMarkers([
    ...state.farms.map((f) => {
      const r = resultById(f.id);
      return {
        id: f.id,
        lngLat: centroid(f.geometry),
        label: f.farm,
        sub: labelOf(r) || `${f.municipality} · ${f.crop}`,
        colour: colourOf(r),
        hidden: !state.placed || state.scene === 0,
        alert: state.scanned && r?.status === "review",
        onClick: () => onPlotClick(f.id),
      };
    }),
    { id: "coop", lngLat: coop.warehouse, label: "Cooperative warehouse", sub: coop.municipality, colour: COLOURS.eu, warehouse: true, hidden: state.scene < 4 },
  ]);
  if (state.scene === 4) drawFlows();
}

function setBadge() {
  const b = $("#source-badge");
  b.className = "badge";
  if (!state.scanned) {
    b.textContent = "Whisp: not run";
    return;
  }
  const t = state.whisp?.checked_at ? new Date(state.whisp.checked_at) : null;
  if (state.source === "live") {
    b.classList.add("live");
    b.textContent = `● Live from FAO Whisp ${state.whisp?.version || ""} · ${t?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}`;
  } else if (state.source === "cached") {
    b.classList.add("cached");
    b.textContent = `Saved Whisp result · ${t?.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || ""}${state.liveError ? " (live call failed)" : ""}`;
    b.title = state.liveError || "";
  } else {
    b.textContent = `Whisp unavailable: ${state.liveError || ""}`;
  }
}

function panel(step, title, sub, html) {
  $("#panel").classList.remove("hidden");
  $("#panel-step").textContent = `${step} / 5`;
  $("#panel-title").textContent = title;
  $("#panel-sub").textContent = sub;
  $("#panel-body").innerHTML = html;
  $("#panel-body").scrollTop = 0;
}

// Keep the camera's focus left of the scene panel on wide screens.
function panelPad() {
  return window.innerWidth > 760 ? Math.min(480, window.innerWidth * 0.4) : 0;
}

function allCoords() {
  return state.farms.map((f) => centroid(f.geometry));
}

// ---------- scenes ----------

const SCENES = [
  {
    short: "39 days",
    notes: "Open on the globe. The arc is the shipment route: Huila to Rotterdam. Say the deadline and the size: 540k coffee families, paper records. Press → to fly in.",
    async enter() {
      $("#hero").classList.remove("hidden");
      $("#panel").classList.add("hidden");
      map3d.showLoss(false);
      map3d.map.setTerrain(null);
      await map3d.fly({ center: [-38, 22], zoom: 1.7, pitch: 0, bearing: 0, duration: 2500, padding: { left: Math.min(window.innerWidth * 0.45, 560), top: 0, right: 0, bottom: 0 } });
      map3d.spin();
      await sleep(400);
      if (state.scene === 0) await map3d.drawArc(state.doc.cooperative.warehouse);
    },
  },
  {
    short: "Intake",
    notes: "This is a cooperative in Huila. Its records are receipts and land certificates. Claude reads them into structured fields, each with a confidence and the exact text it came from. Point out: coordinates NEVER come from the AI, they come from GPS capture.",
    async enter() {
      $("#hero").classList.add("hidden");
      map3d.clearArc();
      renderIntake();
      map3d.enableTerrain();
      await map3d.fly({ center: [-75.86, 2.08], zoom: 9.3, pitch: 64, bearing: -22, duration: 6500, padding: { left: 0, top: 0, bottom: 0, right: panelPad() } });
    },
  },
  {
    short: "Analyse",
    notes: "Press Scan. This is a LIVE call to FAO's Whisp API: 17 forest and land-use layers, including Colombia's own IDEAM forest map. Then our rules add what satellites can't see: the 4 ha polygon rule and delivered volume per hectare. Luis's deliveries work out above twice the national yield per hectare: not proof of anything, but a reason to ask before accepting.",
    async enter() {
      $("#hero").classList.add("hidden");
      if (!state.placed) await placePlots(false);
      renderAnalysis();
      map3d.showLoss(false);
      await map3d.fit(allCoords(), { pitch: 52, bearing: -12, maxZoom: 9 });
    },
  },
  {
    short: "Review",
    notes: "Whisp flags this cocoa plot in Caquetá: forest in 2020, cleared after. Pink is tree cover loss. But global maps over-flag shade coffee and cocoa, so a human decides, and the decision becomes the Article 11 log. Choose Exclude here.",
    async enter() {
      $("#hero").classList.add("hidden");
      if (!state.placed) await placePlots(false);
      renderReview();
      await focusReview(state.reviewId);
    },
  },
  {
    short: "Lots & file",
    notes: "Here is the rule most tools get wrong: no mass balance. One uncleared bag taints the whole EU lot. Move the excluded plot to the non-EU lot. Then Buenavista blocks export: 6.2 ha but only a GPS point. Walk the boundary. Now generate the pack: GeoJSON for the EU system, DDS data, Articles 9, 10, 11, hashed for 5-year retention. The importer files; the cooperative owns its data.",
    async enter() {
      $("#hero").classList.add("hidden");
      if (!state.placed) await placePlots(false);
      if (!state.lotsInit) {
        state.lots = { EU: state.farms.map((f) => f.id), NON: [] };
        state.lotsInit = true;
      }
      map3d.showLoss(false);
      refreshMap();
      renderLots();
      await map3d.fit([...allCoords(), state.doc.cooperative.warehouse], { pitch: 55, bearing: 8, maxZoom: 9 });
    },
  },
];

async function go(i) {
  i = Math.max(0, Math.min(SCENES.length - 1, i));
  state.scene = i;
  renderRail();
  $("#notes").innerHTML = `<b>Speaker notes · ${i + 1}</b><br>${esc(SCENES[i].notes)}`;
  refreshMap();
  await SCENES[i].enter();
}

function renderRail() {
  $("#rail-steps").innerHTML = SCENES.map(
    (s, i) => `<li class="${i === state.scene ? "on" : i < state.scene ? "done" : ""}"><button data-go="${i}"><span class="n">${i + 1}</span><span class="t">${s.short}</span></button></li>`,
  ).join("");
}

// ---------- 1: intake ----------

function renderIntake() {
  const receipts = state.doc.receipts || [];
  panel(
    2,
    "Paper becomes data",
    "Claude vision reads receipts and land certificates. Recorded extractions for the demo.",
    `<div class="receipts">${receipts
      .map(
        (r, i) => `<div class="receipt" style="animation-delay:${i * 0.25}s">
        <div class="paper"><div class="scan"></div><div class="head">${esc(r.lines[0])}</div>${r.lines.slice(1).map((l) => `<div>${esc(l)}</div>`).join("")}</div>
        <div class="fields">${r.fields
          .map((f) => {
            const conf = f.confidence == null ? `<span class="conf gps">GPS</span>` : `<span class="conf ${f.confidence >= 0.85 ? "hi" : "mid"}">${Math.round(f.confidence * 100)}%</span>`;
            const v = f.value == null ? "from GPS capture" : f.value;
            return `<div class="field"><div><div class="k">${esc(f.field.replace("_", " "))}</div><div class="v">${esc(v)}</div></div>${conf}<div class="src">${f.note ? esc(f.note) : `“${esc(f.source)}”`}</div></div>`;
          })
          .join("")}</div>
      </div>`,
      )
      .join("")}</div>
    <div class="row"><button class="btn wide" id="place-btn">${state.placed ? "Plots are on the map ✓" : "Place 5 plots on the map"}</button></div>
    <p class="muted small">Low-confidence fields (amber) go to a person before anything is used. Every extraction is logged for audit.</p>`,
  );
  const fields = [...document.querySelectorAll(".field")];
  fields.forEach((el, i) => setTimeout(() => el.classList.add("show"), 600 + i * 140));
  $("#place-btn").onclick = () => placePlots(true);
}

async function placePlots(animate = true) {
  if (state.placed) return;
  state.placed = true;
  recompute();
  if (animate) {
    await map3d.raisePlots(2200);
    if (state.scene === 1) $("#place-btn").textContent = "Plots are on the map ✓";
  } else {
    map3d.map.setPaintProperty("plots-ext", "fill-extrusion-height", ["get", "h"]);
    map3d.map.setPaintProperty("beams", "fill-extrusion-height", ["get", "bh"]);
  }
}

// ---------- 2: analysis ----------

const STAGES = [
  ["Geometry gate", "EU Information System rules: WGS84, 6 decimals, closed rings, 4 ha"],
  ["FAO Whisp", "17 forest & land-use layers incl. JRC 2020, Hansen, RADD, IDEAM Colombia"],
  ["Colombian overlays", "Resguardos, RUNAP parks, Ley 2 reserves, UPRA frontier (next phase)", true],
  ["Local rules", "Delivered volume per hectare per season, point vs polygon"],
  ["Legality (Art 2(40))", "Proportionate questionnaire; documents only on a flag (next phase)", true],
];

function renderAnalysis() {
  panel(
    3,
    "Five-stage risk check",
    "Satellites see the land. Our rules see the deliveries. A human gets the final word.",
    `<ol class="pipeline">${STAGES.map(([t, s, later], i) => `<li id="stage-${i}" class="${later ? "later" : ""} ${state.scanned ? "done" : ""}"><span class="n">${i + 1}</span><div>${t}<small>${s}</small></div><span class="tag">${later ? "next" : ""}</span></li>`).join("")}</ol>
     <button class="btn wide" id="scan-btn">${state.scanned ? "Scan again with FAO Whisp" : "Scan with FAO Whisp"}</button>
     <div id="plot-list" class="plots" style="margin-top:14px"></div>`,
  );
  $("#scan-btn").onclick = scan;
  if (state.scanned) renderPlotList();
}

async function scan() {
  const btn = $("#scan-btn");
  btn.disabled = true;
  btn.textContent = "Asking FAO Whisp…";
  map3d.setScanning(true);
  const req = api("/api/risk", { method: "POST", body: "{}" });
  const stages = [0, 1, 3];
  for (const s of [0, 1, 2, 3, 4]) $(`#stage-${s}`)?.classList.remove("done", "run");
  for (const s of stages) {
    $(`#stage-${s}`)?.classList.add("run");
    await sleep(s === 1 ? 1400 : 700);
    if (s === 1) await req;
    $(`#stage-${s}`)?.classList.replace("run", "done");
  }
  const { body } = await req;
  map3d.setScanning(false);
  if (body.raw) {
    state.raw = body.raw;
    state.whisp = body.whisp;
  }
  state.source = body.source;
  state.liveError = body.live_error || null;
  state.scanned = Boolean(state.raw);
  setBadge();
  recompute();
  btn.disabled = false;
  btn.textContent = "Scan again with FAO Whisp";
  renderPlotList();
  if (!state.scanned) toast(`Whisp unavailable: ${state.liveError || "no result"}. Set a key (top right).`, 5000);
}

function yieldBar(r) {
  const y = r.yield;
  if (!y?.kg_per_ha || !y.limit) return "";
  const scale = y.limit * 1.6;
  const pct = Math.min(100, (y.kg_per_ha / scale) * 100);
  return `<div class="yieldbar"><div class="track"><div class="fill" data-w="${pct}"></div><div class="limit" style="left:${(y.limit / scale) * 100}%"></div></div>
    <small>${fmt(y.kg_per_ha)} ${esc(y.unit)} · limit ${fmt(y.limit)}</small></div>`;
}

function renderPlotList() {
  const el = $("#plot-list");
  if (!el) return;
  el.innerHTML = state.farms
    .map((f, i) => {
      const r = resultById(f.id);
      const c = colourOf(r);
      const main = r.reasons.find((x) => x.startsWith("Volume") || x.includes("4 ha") || x.includes("high risk")) || r.reasons[0];
      return `<div class="plot" style="--c:${c};animation-delay:${i * 0.12}s" data-plot="${f.id}"><span class="dot"></span>
        <div><b>${esc(f.farmer_name)}</b><small>${esc(f.farm)} · ${esc(f.municipality)} · ${f.hectares} ha ${esc(f.crop)}</small></div>
        <span class="status" style="--c:${c}">${esc(labelOf(r))}</span>
        <div class="reason">${esc(main)}</div>${yieldBar(r)}</div>`;
    })
    .join("");
  requestAnimationFrame(() => document.querySelectorAll(".yieldbar .fill").forEach((b) => (b.style.width = b.dataset.w + "%")));
  el.querySelectorAll("[data-plot]").forEach((n) => (n.onclick = () => onPlotClick(n.dataset.plot)));
}

// ---------- 3: review ----------

function reviewQueue() {
  return state.results.filter((r) => r.status === "review" || r.decision || r.status === "mitigating").map((r) => r.id);
}

function renderReview() {
  if (!state.scanned) {
    panel(4, "Human review", "Run the Whisp scan first.", `<button class="btn wide" data-go="2">← Go to the scan</button>`);
    return;
  }
  const queue = reviewQueue();
  if (!queue.includes(state.reviewId)) state.reviewId = queue[0] || state.reviewId;
  const f = farmById(state.reviewId);
  const r = resultById(state.reviewId);
  const w = (state.raw?.features || []).find((x) => x.properties?.external_id === f.id)?.properties || {};
  const yn = (v) => (v === "yes" || v === true || Number(v) > 0 ? `<span class="yes">yes</span>` : v == null ? "–" : `<span class="no">no</span>`);
  const pct = (v) => (v == null ? "–" : `${Math.round(Number(v) * 100) / 100} ha`);
  const isForest = r.whisp_colour === "red" || r.whisp_colour === "amber";
  panel(
    4,
    "A person makes the call",
    "Global maps over-flag shade coffee and cocoa, so a flag starts a review, never an automatic exclusion.",
    `<div class="review-queue">${queue
      .map((id) => {
        const q = resultById(id);
        return `<button class="chip ${id === f.id ? "on" : ""}" data-review="${id}" style="--c:${colourOf(q)}"><span class="d"></span>${esc(farmById(id).farm)}</button>`;
      })
      .join("")}</div>
    <div class="card">
      <h3>${esc(f.farm)} <span class="status" style="--c:${colourOf(r)}">${esc(labelOf(r))}</span></h3>
      <div class="muted small">${esc(f.farmer_name)} · ${esc(f.vereda)}, ${esc(f.municipality)} · ${f.hectares} ha ${esc(f.crop)}</div>
      ${isForest ? `<div class="ind">
        <span>Whisp risk (perennial crops)</span><b>${esc(r.whisp_risk)}</b>
        <span>Plot area (Whisp)</span><b>${pct(w.Area)}</b>
        <span>Tree cover in 2020</span>${yn(r.indicators?.treecover_2020)}
        <span>Disturbance after 2020</span>${yn(r.indicators?.disturbance_after_2020)}
        <span>EU forest map 2020 (JRC)</span><b>${pct(w.EUFO_2020)}</b>
        <span>IDEAM forest 2020 (Colombia)</span><b>${pct(w.nCO_ideam_forest_2020)}</b>
        <span>Hansen loss after 2020</span><b>${pct(w.GFC_loss_after_2020)}</b>
        <span>RADD alerts after 2020</span><b>${pct(w.RADD_after_2020)}</b>
      </div>
      <div class="legend"><i></i> Tree cover lost 2001–2023 (Hansen/UMD), shown on the map</div>` : ""}
      <ul class="muted small" style="padding-left:18px;margin:10px 0 0">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${r.decision ? `<div class="decision">Decision: <b>${esc(r.decision.decision)}</b> by ${esc(r.decision.reviewer)}${r.decision.reason ? ` · “${esc(r.decision.reason)}”` : ""}<br><span class="muted small">${esc(new Date(r.decision.at).toLocaleString())} → written to the Art 11 log</span><div class="row"><button class="btn ghost" id="undo">Undo decision</button></div></div>` : ""}
    </div>
    ${r.decision ? "" : `<label class="lbl">Reviewer</label><input type="text" id="reviewer" value="${esc(store("eudr-reviewer") || "Ana Gómez (coop QA)")}" />
    <label class="lbl">Reason / evidence</label><textarea id="reason" placeholder="${isForest ? "e.g. Sentinel-2 2020 shows forest; clearing visible in 2023 imagery" : "e.g. Farmer also manages his brother's 2.1 ha plot; deliveries combined"}"></textarea>
    <div class="row"><button class="btn ok" data-decide="accept">Accept with evidence</button><button class="btn warn" data-decide="mitigate">Mitigate</button><button class="btn danger" data-decide="exclude">Exclude</button></div>
    <p class="muted small">Accepting needs a written reason. Every decision is stored with name and time and feeds the Art 10 assessment and Art 11 log.</p>`}`,
  );
  document.querySelectorAll("[data-review]").forEach((b) => (b.onclick = () => focusReview(b.dataset.review)));
  document.querySelectorAll("[data-decide]").forEach((b) => (b.onclick = () => decide(f.id, b.dataset.decide)));
  if ($("#undo")) $("#undo").onclick = () => decide(f.id, "clear");
}

async function focusReview(id) {
  state.reviewId = id;
  if (state.scene === 3) renderReview();
  const f = farmById(id);
  if (!f) return;
  const r = resultById(id);
  map3d.showLoss(state.scanned && r?.whisp_colour === "red");
  await map3d.fly({ center: centroid(f.geometry), zoom: 15.1, pitch: 68, bearing: 28, duration: 4500, padding: { left: 0, top: 0, bottom: 0, right: panelPad() } });
}

async function decide(id, decision) {
  const reviewer = $("#reviewer")?.value || "";
  const reason = $("#reason")?.value || "";
  if (decision === "accept" && !reason.trim()) {
    toast("Accepting a flagged plot needs a reason: it goes into the Art 10 record.");
    $("#reason")?.focus();
    return;
  }
  store("eudr-reviewer", reviewer);
  const { ok, body } = await api("/api/review", { method: "POST", body: JSON.stringify({ plot_id: id, decision, reason, reviewer }) });
  if (!ok) return toast(body.error || "Could not save the decision");
  state.decisions = body.decisions;
  recompute();
  renderReview();
  toast(decision === "clear" ? "Decision undone" : `Decision saved · Art 11 log entry created`);
}

// ---------- 4: lots + pack ----------

function lotChecks() {
  return {
    EU: checkLot({ id: "EU-2026-A", market: "EU", plot_ids: state.lots.EU }, state.farms, state.results),
    NON: checkLot({ id: "LOCAL-2026-A", market: "non-EU", plot_ids: state.lots.NON }, state.farms, state.results),
  };
}

function drawFlows() {
  const wh = state.doc.cooperative.warehouse;
  const eu = lotChecks().EU;
  map3d.setFlows(
    state.farms.map((f) => ({
      from: centroid(f.geometry),
      to: wh,
      colour: state.lots.EU.includes(f.id) ? (eu.tainted ? COLOURS.red : COLOURS.eu) : COLOURS.noneu,
    })),
  );
}

function sack(id) {
  const f = farmById(id);
  const r = resultById(id);
  return `<button class="sack" data-move="${id}" style="--c:${colourOf(r)}"><span class="d"></span>${esc(f.farm)}<em>${fmt(r?.yield?.kg_comparable)} kg</em></button>`;
}

function renderLots(pack = null) {
  const { EU, NON } = lotChecks();
  const offenders = EU.offenders
    .map((o) => {
      const action = o.status === "blocked" ? `<button class="btn warn" data-walk="${o.id}">Walk the boundary</button>` : o.status === "excluded" ? `<button class="btn ghost" data-move="${o.id}">Move to non-EU</button>` : `<button class="btn ghost" data-goreview="${o.id}">Review</button>`;
      return `<div class="offender"><span class="status" style="--c:${colourOf(resultById(o.id))}">${esc(o.label)}</span>${esc(o.farm)}${action}</div>`;
    })
    .join("");
  panel(
    5,
    "Segregated lots, then the importer's file",
    "No mass balance: one uncleared bag taints the whole EU lot. Tap a sack to move it.",
    `<div class="bins">
      <div class="bin ${EU.tainted ? "tainted" : EU.plots ? "clean" : ""}" style="--bc:var(--eu)"><h4>EU lot</h4><div class="kg">${fmt(EU.kg_comparable)} kg</div><div class="sacks">${state.lots.EU.map(sack).join("")}</div></div>
      <div class="bin" style="--bc:var(--noneu)"><h4>Non-EU lot</h4><div class="kg">${fmt(NON.kg_comparable)} kg</div><div class="sacks">${state.lots.NON.map(sack).join("")}</div></div>
    </div>
    <div class="lot-msg ${EU.tainted ? "bad" : "good"}">${esc(EU.message)}${offenders}</div>
    <button class="btn wide" id="pack-btn" ${EU.tainted || !EU.plots ? "disabled" : ""}>Generate importer pack</button>
    <div id="pack"></div>`,
  );
  document.querySelectorAll("[data-move]").forEach((b) => (b.onclick = () => moveSack(b.dataset.move)));
  document.querySelectorAll("[data-walk]").forEach((b) => (b.onclick = () => walk(b.dataset.walk)));
  document.querySelectorAll("[data-goreview]").forEach((b) => (b.onclick = () => { state.reviewId = b.dataset.goreview; go(3); }));
  $("#pack-btn").onclick = makePack;
  if (pack) renderPack(pack);
  drawFlows();
}

function moveSack(id) {
  const inEU = state.lots.EU.includes(id);
  state.lots.EU = inEU ? state.lots.EU.filter((x) => x !== id) : [...state.lots.EU, id];
  state.lots.NON = inEU ? [...state.lots.NON, id] : state.lots.NON.filter((x) => x !== id);
  renderLots();
  const eu = lotChecks().EU;
  if (!inEU && eu.tainted) toast(`${farmById(id).farm} tainted the EU lot: mass balance is not allowed`);
}

async function walk(id) {
  const f = farmById(id);
  const boundary = state.doc.walked_boundaries?.[id];
  if (!boundary) return toast("No walked boundary recorded for this plot");
  toast("Field technician walks the boundary with GPS…", 4500);
  await map3d.fly({ center: centroid(f.geometry), zoom: 16.2, pitch: 58, bearing: -15, duration: 3500 });
  await map3d.walkBoundary(boundary.coordinates[0]);
  f.geometry = boundary;
  state.walked = true;
  recompute();
  await sleep(500);
  map3d.clearWalk();
  toast("Polygon captured: 6.2 ha. Export unblocked. Re-checking the polygon with Whisp…", 4000);
  renderLots();
  // Re-check the new polygon live; keep the point result if Whisp is unreachable.
  api("/api/risk", { method: "POST", body: JSON.stringify({ plots: [f] }) }).then(({ body }) => {
    const feat = body.source === "live" ? body.raw?.features?.find((x) => x.properties?.external_id === id) : null;
    if (feat && state.raw) {
      state.raw = { ...state.raw, features: [...state.raw.features.filter((x) => x.properties?.external_id !== id), feat] };
      recompute();
      if (state.scene === 4) renderLots();
      toast(`Whisp on the walked polygon: ${feat.properties.risk_pcrop} risk`);
    }
  });
  await sleep(1200);
  await map3d.fit([...allCoords(), state.doc.cooperative.warehouse], { pitch: 55, bearing: 8, maxZoom: 9, duration: 3000 });
}

async function makePack() {
  const pack = await buildPack({
    plots: state.farms,
    results: state.results,
    lot: { id: "EU-2026-A", market: "EU", plot_ids: state.lots.EU },
    cooperative: state.doc.cooperative,
    whisp: state.whisp,
  });
  if (pack.blocking.length) return toast(pack.blocking[0], 5000);
  state.pack = pack;
  renderLots(pack);
  $("#pack").scrollIntoView({ behavior: "smooth" });
}

function renderPack(pack) {
  const net = JSON.parse(pack.documents.find((d) => d.id === "dds").content).commodities.reduce((s, c) => s + (Number(c.estimatedGreenKgFromDeliveries) || 0), 0);
  $("#pack").innerHTML = `<div class="summary">
      <div><b>${fmt(net)}</b><small>kg est. from deliveries</small></div>
      <div><b>${state.lots.EU.length}</b><small>plots traced</small></div>
      <div><b>0</b><small>blocking errors</small></div>
    </div>
    <div class="docs">${pack.documents
      .map((d, i) => `<button class="doc" data-doc="${d.id}" style="animation-delay:${i * 0.12}s"><b>${esc(d.title)}</b><small>${esc(d.subtitle)}</small><code>sha256 ${d.sha256.slice(0, 16)}…</code></button>`)
      .join("")}</div>
    <p class="disclaimer">${esc(DISCLAIMER)} Narrative sections (Art 10(2)(h)) are reserved for LLM drafting with evidence citations and human sign-off, next phase.</p>`;
  document.querySelectorAll("[data-doc]").forEach((b) => (b.onclick = () => download(pack.documents.find((d) => d.id === b.dataset.doc))));
}

function download(doc) {
  const url = URL.createObjectURL(new Blob([doc.content], { type: doc.mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: doc.filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- interactions ----------

function onPlotClick(id) {
  if (state.scene === 3) return focusReview(id);
  if (state.scene === 4) return moveSack(id);
  const f = farmById(id);
  map3d.fly({ center: centroid(f.geometry), zoom: 14.8, pitch: 65, bearing: 20, duration: 3500 });
}

document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]");
  if (g) go(Number(g.dataset.go));
  if (e.target.closest("[data-next]")) go(state.scene + 1);
});
$("#next").onclick = () => go(state.scene + 1);
$("#prev").onclick = () => go(state.scene - 1);

function toggleLite() {
  state.lite = !state.lite;
  store("eudr-lite", state.lite ? "1" : "0");
  map3d.setLite(state.lite);
  $("#lite-btn").classList.toggle("on", state.lite);
  toast(state.lite ? "Lite mode: 3D terrain off" : "3D terrain on");
}
$("#lite-btn").onclick = toggleLite;
$("#lite-btn").classList.toggle("on", state.lite);

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !e.target.closest("button"))) {
    e.preventDefault();
    go(state.scene + 1);
  } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
    e.preventDefault();
    go(state.scene - 1);
  } else if (e.key.toLowerCase() === "n") {
    $("#notes").classList.toggle("hidden");
  } else if (e.key.toLowerCase() === "l") {
    toggleLite();
  }
});

// key drawer
$("#key-btn").onclick = async () => {
  $("#key-drawer").classList.toggle("hidden");
  const { body } = await api("/api/whisp-key");
  $("#key-msg").textContent = body.configured ? "A key is set on the server." : "No key set: scans will use the saved Whisp result.";
};
$("#key-close").onclick = () => $("#key-drawer").classList.add("hidden");
$("#key-save").onclick = async () => {
  const { ok, body } = await api("/api/whisp-key", { method: "POST", body: JSON.stringify({ key: $("#key-input").value }) });
  $("#key-input").value = "";
  $("#key-msg").textContent = ok ? "Saved on the local server (memory only)." : body.error;
};
$("#key-test").onclick = async () => {
  $("#key-msg").textContent = "Sending one test plot to Whisp…";
  const { body } = await api("/api/whisp-key/test", { method: "POST" });
  $("#key-msg").textContent = body.ok ? `Key works · Whisp ${body.version || ""}` : body.error;
};

$("#reset-demo").onclick = async () => {
  for (const id of Object.keys(state.decisions)) {
    await api("/api/review", { method: "POST", body: JSON.stringify({ plot_id: id, decision: "clear" }) });
  }
  location.reload();
};

// ---------- boot ----------

async function boot() {
  const days = Math.max(0, Math.ceil((Date.UTC(2026, 11, 30) - Date.now()) / 86400000));
  $("#days").textContent = days;
  const [farms, review] = await Promise.all([api("/api/farms"), api("/api/review")]);
  state.doc = farms.body;
  state.farms = structuredClone(farms.body.farms);
  state.decisions = review.body.decisions || {};
  await map3d.ready;
  recompute();
  go(0);
  // Expose for rehearsal / debugging in the console.
  window.eudr = { state, go, CONFIG, map3d };
}
boot();
