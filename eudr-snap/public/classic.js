const $ = (id) => document.getElementById(id);
const COLOURS = { green: "#1f8a4c", accepted: "#1f8a4c", review: "#c98a00", mitigating: "#c98a00", blocked: "#c98a00", excluded: "#c62828", unchecked: "#8a948d" };
const LABELS = { green: "Compliant", accepted: "Accepted after review", review: "Needs review", mitigating: "Mitigation open", blocked: "Fix geolocation", excluded: "Excluded", unchecked: "Not checked" };
const kgOf = (f) => (f.deliveries || []).reduce((s, d) => s + d.kg, 0);

let farms = [];
let results = new Map();
const map = L.map("map");
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
  maxZoom: 18,
}).addTo(map);
const layer = L.layerGroup().addTo(map);

function daysLeft() {
  const target = new Date("2026-12-30T00:00:00");
  const d = Math.ceil((target - new Date()) / 86_400_000);
  $("days").textContent = Math.max(d, 0);
}

function centreOf(geom) {
  if (geom.type === "Point") return [geom.coordinates[1], geom.coordinates[0]];
  const ring = geom.coordinates[0];
  const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lat, lon];
}

function statusOf(id) {
  return results.get(id)?.status || "unchecked";
}

function render() {
  layer.clearLayers();
  const bounds = [];
  const exclude = $("exclude").checked;
  let okKg = 0, blocking = 0, excluded = 0;
  const rows = [];

  for (const f of farms) {
    const st = statusOf(f.id);
    const r = results.get(f.id);
    const c = centreOf(f.geometry);
    bounds.push(c);
    const marker = L.circleMarker(c, { radius: 11, color: "#fff", weight: 2, fillColor: COLOURS[st], fillOpacity: 1 });
    marker.bindPopup(`<b>${f.farm}</b><br>${f.farmer_name}<br>${f.crop} · ${f.hectares} ha · ${f.region}<br><b>${LABELS[st]}</b>${r ? "<br>" + r.reasons.join("<br>") : ""}`);
    layer.addLayer(marker);
    if (f.geometry.type === "Polygon") {
      layer.addLayer(L.geoJSON(f.geometry, { style: { color: COLOURS[st], weight: 2, fillOpacity: 0.25 } }));
    }

    const isExcluded = exclude && st === "excluded";
    if (isExcluded) excluded++;
    else if (st === "excluded" || st === "amber" || st === "unchecked") blocking++;
    if (!isExcluded && st === "green") okKg += kgOf(f);

    const reasons = r ? r.reasons.map((x) => `<span class="reason">${x}</span>`).join("") : "";
    rows.push(`<tr class="${isExcluded ? "excluded" : ""}" data-id="${f.id}">
      <td><b>${f.farmer_name}</b><span class="reason">${f.farm} · ${f.region}</span></td>
      <td>${f.crop}</td><td>${f.hectares}</td>
      <td>${kgOf(f).toLocaleString("en")}<span class="reason ${r?.yield?.flag ? "yield-bad" : ""}">${(r?.yield?.kg_per_ha ?? Math.round(kgOf(f) / f.hectares)).toLocaleString("en")}/ha</span></td>
      <td><span class="status ${st}">${LABELS[st]}</span>${reasons}</td></tr>`);
  }
  $("rows").innerHTML = rows.join("");
  $("ok-kg").textContent = okKg.toLocaleString("en");
  $("blocking").textContent = blocking;
  $("excluded").textContent = excluded;
  if (bounds.length && !render.fitted) {
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [40, 40] });
    render.fitted = true;
  }
}

document.addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (!tr) return;
  const f = farms.find((x) => x.id === tr.dataset.id);
  if (f) map.flyTo(centreOf(f.geometry), 15);
});

function setBadge(data) {
  const b = $("source");
  b.className = "badge";
  if (data.source === "live") {
    b.classList.add("live");
    b.textContent = `Live from FAO Whisp · ${new Date(data.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else if (data.source === "cached") {
    b.classList.add("cached");
    const when = new Date(data.checked_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    b.textContent = `Saved Whisp result from ${when}` + (data.live_error ? ` (live call failed: ${data.live_error})` : "");
  } else {
    b.textContent = `Not checked: ${data.live_error || "no result"}`;
  }
}

async function loadFarms() {
  const doc = await (await fetch("/api/farms")).json();
  farms = doc.farms || [];
  $("unverified").classList.toggle("hidden", Boolean(doc.verified_with_whisp));
  render.fitted = false;
  render();
}

async function check() {
  const btn = $("check");
  btn.disabled = true;
  btn.textContent = "Asking Whisp…";
  try {
    const data = await (await fetch("/api/risk", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
    results = new Map((data.results || []).map((r) => [r.id, r]));
    setBadge(data);
    render();
  } catch (e) {
    $("source").textContent = "Server not reachable";
  } finally {
    btn.disabled = false;
    btn.textContent = "Check with FAO Whisp";
  }
}

function msg(el, text, ok) {
  $(el).textContent = text;
  $(el).className = "msg " + (ok === true ? "ok" : ok === false ? "err" : "");
}

async function refreshKeyState() {
  const { configured } = await (await fetch("/api/whisp-key")).json();
  $("key-state").textContent = configured ? "set" : "not set";
  $("key-state").className = "pill" + (configured ? " on" : "");
  if (!configured) $("key-panel").open = true;
  return configured;
}

$("save-key").onclick = async () => {
  const key = $("key-input").value;
  const res = await fetch("/api/whisp-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
  const data = await res.json();
  $("key-input").value = "";
  msg("key-msg", res.ok ? "Key saved on the local server (memory only)." : data.error, res.ok);
  refreshKeyState();
};

$("test-key").onclick = async () => {
  msg("key-msg", "Sending one test plot to Whisp…");
  const data = await (await fetch("/api/whisp-key/test", { method: "POST" })).json();
  msg("key-msg", data.ok ? `Key works. Whisp ${data.version || ""} answered.` : data.error, data.ok);
};

$("clear-key").onclick = async () => {
  await fetch("/api/whisp-key", { method: "DELETE" });
  msg("key-msg", "Key removed from the server.");
  refreshKeyState();
};

$("find-plots").onclick = async () => {
  const res = await fetch("/api/find-plots", { method: "POST" });
  if (!res.ok) return msg("find-msg", (await res.json()).error, false);
  $("find-plots").disabled = true;
  const poll = async () => {
    const job = await (await fetch("/api/find-plots")).json();
    if (job.running) {
      msg("find-msg", `Whisp is analysing the candidate plots… ${job.percent ? job.percent + "%" : ""} (can take a few minutes)`);
      return setTimeout(poll, 3000);
    }
    $("find-plots").disabled = false;
    if (job.error) return msg("find-msg", job.error, false);
    const s = job.summary;
    msg("find-msg", `Done. ${s.candidates} plots checked: ${s.huila_low} low risk in Huila, ${s.frontier_high} high risk on the frontier. Demo farms and saved result updated.`, true);
    await loadFarms();
    await check();
  };
  poll();
};

$("check").onclick = check;
$("exclude").onchange = render;

daysLeft();
refreshKeyState();
loadFarms().then(async () => {
  // Show the saved Whisp result straight away if there is one (no live call on page load).
  const cache = await fetch("/api/risk/saved").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (cache?.results?.length && !results.size) {
    results = new Map(cache.results.map((r) => [r.id, r]));
    setBadge(cache);
    render();
  }
});
