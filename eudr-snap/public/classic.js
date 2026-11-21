const $ = (id) => document.getElementById(id);
const COLOURS = { green: "#1f8a4c", accepted: "#1f8a4c", review: "#c98a00", mitigating: "#c98a00", blocked: "#c98a00", excluded: "#c62828", unchecked: "#8a948d" };
const LABELS = { green: "Compliant", accepted: "Accepted after review", review: "Needs review", mitigating: "Mitigation open", blocked: "Fix geolocation", excluded: "Excluded", unchecked: "Not checked" };
// Everything from the data (names, reasons, reviewer text) is escaped before it goes into HTML.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const kgOf = (f) => (f.deliveries || []).reduce((s, d) => s + d.kg, 0);
// The season the rules checked (the same figure the pack reports), else all deliveries.
const seasonKg = (f) => results.get(f.id)?.yield?.kg_delivered ?? kgOf(f);

let farms = [];
let results = new Map();
let profile = {};
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
    marker.bindPopup(`<b>${esc(f.farm)}</b><br>${esc(f.farmer_name)}<br>${esc(f.crop)} · ${esc(f.hectares)} ha · ${esc(f.region)}<br><b>${LABELS[st]}</b>${r ? "<br>" + r.reasons.map(esc).join("<br>") : ""}`);
    layer.addLayer(marker);
    if (f.geometry.type === "Polygon") {
      layer.addLayer(L.geoJSON(f.geometry, { style: { color: COLOURS[st], weight: 2, fillOpacity: 0.25 } }));
    }

    const isExcluded = exclude && st === "excluded";
    if (isExcluded) excluded++;
    else if (st === "blocked") blocking++;
    if (!isExcluded && r?.eligible) okKg += seasonKg(f);

    const reasons = r ? r.reasons.map((x) => `<span class="reason">${esc(x)}</span>`).join("") : "";
    rows.push(`<tr class="${isExcluded ? "excluded" : ""}" data-id="${esc(f.id)}">
      <td><b>${esc(f.farmer_name)}</b><span class="reason">${esc(f.farm)} · ${esc(f.region)}${f.producer_card ? " · card " + esc(f.producer_card) : ""}</span></td>
      <td>${esc(f.crop)}</td><td>${esc(f.hectares)}</td>
      <td>${seasonKg(f).toLocaleString("en")}<span class="reason ${r?.yield?.flag ? "yield-bad" : ""}">${(r?.yield?.producer?.kg_per_ha ?? r?.yield?.kg_per_ha ?? Math.round(kgOf(f) / f.hectares)).toLocaleString("en")}/ha${r?.yield?.producer ? " (card total)" : ""}</span></td>
      <td><span class="status ${st}">${LABELS[st]}</span>${reasons}${["review", "mitigating"].includes(st) ? `<div class="decide"><button data-decide="accept" data-plot="${esc(f.id)}">Accept…</button><button class="secondary" data-decide="exclude" data-plot="${esc(f.id)}">Exclude</button></div>` : ""}${r?.decision ? `<div class="decide"><button class="secondary" data-decide="clear" data-plot="${esc(f.id)}">Undo decision</button></div>` : ""}</td></tr>`);
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
  if (e.target.closest("[data-decide]")) return;
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
  profile = doc.profile || {};
  fillPlotSelect();
  if (doc.cooperative?.name) $("coop").textContent = doc.cooperative.name;
  if (doc.profile?.id) {
    // Non-default profile: no plot finder (Colombian setup), no 3D story.
    $("find-setup").classList.add("hidden");
    $("unverified").textContent = "Demo plots for " + doc.profile.name + " are synthetic and haven't been checked with Whisp. Set a key and press Check with FAO Whisp.";
  }
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
  // Show the saved Whisp result straight away so the page isn't empty while Whisp works...
  const cache = await fetch("/api/risk/saved").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (cache?.results?.length && !results.size) {
    results = new Map(cache.results.map((r) => [r.id, r]));
    setBadge(cache);
    render();
  }
  // ...then call Whisp live on every page load. The server falls back to the saved result if the call fails.
  await check();
});

// ---------- 1. record a purchase ----------

const postJson = async (url, body, method = "POST") => {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
};
let fromPhoto = false;

function fillPlotSelect() {
  // Card-based sales (Côte d'Ivoire): one entry per producer card, recorded on the card's first plot.
  const seen = new Set();
  const opts = [];
  for (const f of farms) {
    if (f.producer_card) {
      if (seen.has(f.producer_card)) continue;
      seen.add(f.producer_card);
      const n = farms.filter((x) => x.producer_card === f.producer_card).length;
      opts.push(`<option value="${esc(f.id)}" data-card="${esc(f.producer_card)}">${esc(f.farmer_name)} · card ${esc(f.producer_card)}${n > 1 ? ` (${n} plots)` : ""}</option>`);
    } else {
      opts.push(`<option value="${esc(f.id)}">${esc(f.farmer_name)} · ${esc(f.farm)}</option>`);
    }
  }
  const keep = $("d-plot").value;
  $("d-plot").innerHTML = opts.join("");
  if (keep) $("d-plot").value = keep;
  const seasons = farms.flatMap((f) => (f.deliveries || []).map((d) => d.season)).filter(Boolean).sort();
  if (!$("d-season").value && seasons.length) $("d-season").value = seasons.at(-1);
}

async function refreshResults() {
  await loadFarms();
  const data = await fetch("/api/risk/saved").then((r) => r.json());
  results = new Map((data.results || []).map((r) => [r.id, r]));
  setBadge(data);
  render();
}

$("read-photo").onclick = async () => {
  const file = $("photo").files[0];
  if (!file) return msg("d-msg", "Choose a photo of the receipt first.", false);
  $("read-photo").disabled = true;
  msg("d-msg", "Claude is reading the receipt…");
  try {
    const b64 = await new Promise((ok, fail) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result).split(",")[1]);
      fr.onerror = fail;
      fr.readAsDataURL(file);
    });
    const { ok, body } = await postJson("/api/extract", { imageBase64: b64, mediaType: file.type });
    if (!ok) return msg("d-msg", body.error || "Couldn't read the photo.", false);
    const get = (name) => body.fields.find((f) => f.field === name);
    const set = (id, f) => { if (f?.value != null) $(id).value = f.value; };
    set("d-receipt", get("receipt_number"));
    set("d-date", get("date"));
    set("d-kg", get("kg"));
    const card = get("producer_card")?.value;
    const opt = card && [...$("d-plot").options].find((o) => o.dataset.card === card);
    if (opt) $("d-plot").value = opt.value;
    $("extracted").innerHTML =
      "<b>Read from the photo. Check each value against the paper:</b><br>" +
      body.fields
        .filter((f) => f.field !== "coordinates")
        .map((f) => `${esc(f.field)}: <b>${esc(f.value ?? "—")}</b> <small>(“${esc(f.source)}”, confidence ${esc(f.confidence ?? "—")}${f.note ? "; " + esc(f.note) : ""})</small>`)
        .join("<br>") +
      (card && !opt ? `<br><b>Card ${esc(card)} is not in the cooperative register: pick the producer by hand.</b>` : "") +
      (body.warnings?.length ? "<br>Warnings: " + body.warnings.map(esc).join("; ") : "");
    fromPhoto = true;
    $("d-checked").checked = false;
    $("d-checked-wrap").classList.remove("hidden");
    msg("d-msg", "Fields filled in. Check them, tick the box, then record.", true);
  } catch (e) {
    msg("d-msg", "Couldn't send the photo: " + e.message, false);
  } finally {
    $("read-photo").disabled = false;
  }
};

$("record").onclick = async () => {
  if (fromPhoto && !$("d-checked").checked) return msg("d-msg", "Tick the box once you've checked the fields against the paper receipt.", false);
  const body = { plot_id: $("d-plot").value, receipt: $("d-receipt").value.trim(), date: $("d-date").value, season: $("d-season").value.trim(), kg: Number($("d-kg").value), source: fromPhoto ? "photo" : "typed" };
  const res = await postJson("/api/deliveries", body);
  if (!res.ok) return msg("d-msg", res.body.error || "Not recorded.", false);
  const r = res.body.result;
  const y = r?.yield?.producer || r?.yield;
  msg("d-msg", `${res.body.reopened?.length ? `Review reopened for ${res.body.reopened.join(", ")} (new volume since the decision). ` : ""}Recorded ${body.kg.toLocaleString("en")} kg on receipt ${body.receipt}. Now ${y?.kg_per_ha?.toLocaleString("en") ?? "—"} ${y?.unit || "kg/ha"} for ${y?.season || "the season"}${r?.yield?.flag ? ": needs review" : ""}.`, !r?.yield?.flag);
  fromPhoto = false;
  $("d-checked-wrap").classList.add("hidden");
  $("extracted").innerHTML = "";
  $("d-receipt").value = "";
  $("d-kg").value = "";
  await refreshResults();
};

$("reset-deliveries").onclick = async () => {
  if (!confirm("Reset the demo: remove every purchase recorded in the app, every review decision and every lot sent to a buyer? The sample data stays.")) return;
  await postJson("/api/deliveries", undefined, "DELETE");
  msg("d-msg", "Demo reset: recorded purchases, review decisions and lots removed.");
  refreshRegister();
  await refreshResults();
};

// ---------- 2. review ----------

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-decide]");
  if (!b) return;
  const decision = b.dataset.decide;
  let reason = "";
  if (decision === "accept") {
    reason = prompt("Why is this plot acceptable? This goes into the Art 10 file (e.g. 'Field visit 20 Nov: two extra plots found, to be mapped').") || "";
    if (!reason.trim()) return;
  } else if (decision === "exclude") {
    // Optional, but it goes into the Art 11 log.
    const r = prompt("Why exclude this plot? (optional, goes into the Art 11 log)");
    if (r === null) return;
    reason = r;
  }
  const reviewer = decision === "clear" ? "" : prompt("Your name (logged with the decision):") || "";
  const res = await postJson("/api/review", { plot_id: b.dataset.plot, decision, reason, reviewer });
  if (!res.ok) return alert(res.body.error || "Decision not saved.");
  await refreshResults();
});

// ---------- 3. send a lot to an EU buyer ----------

$("make-pack").onclick = async () => {
  const cleared = farms.filter((f) => results.get(f.id)?.eligible);
  const left = farms.filter((f) => !results.get(f.id)?.eligible);
  for (const a of document.querySelectorAll("#docs a")) URL.revokeObjectURL(a.href);
  $("docs").innerHTML = "";
  $("share").classList.add("hidden");
  const name = $("buyer-name").value.trim();
  if (!name) return msg("pack-msg", "Name the EU buyer first: they file the due diligence statement.", false);
  if (!cleared.length) return msg("pack-msg", "No plot is cleared yet. Check with Whisp and review the flagged plots first.", false);
  const res = await postJson("/api/lots/create", { buyer: { name, email: $("buyer-email").value.trim() } });
  if (!res.ok) return msg("pack-msg", res.body.error || "The lot couldn't be prepared.", false);
  const lot = res.body.lot;
  const lotId = lot.id;
  const link = location.origin + lot.share_path;
  $("share-link").value = link;
  $("open-link").href = link;
  $("share").classList.remove("hidden");
  refreshRegister();
  msg("pack-msg", `Lot ${lotId} for ${lot.buyer.name}: ${lot.plot_ids.length} plot(s), ${lot.receipts.length} receipt(s), ${Number(lot.kg).toLocaleString("en")} ${lot.kg_unit}.${left.length ? ` Left out: ${left.map((f) => f.farm + " (" + (results.get(f.id)?.card_blocked_by ? "shares a card with " + results.get(f.id).card_blocked_by.join(", ") : LABELS[statusOf(f.id)] || "not cleared") + ")").join(", ")}.` : ""}`, true);
  $("docs").innerHTML =
    res.body.documents
      .map((d) => {
        const url = URL.createObjectURL(new Blob([d.content], { type: d.mime }));
        const open = d.mime === "text/html" ? ` target="_blank" rel="noopener"` : ` download="${esc(d.filename)}"`;
        return `<a class="${d.id === "report" ? "report" : ""}" href="${url}"${open}><b>${esc(d.title)}</b><small>${esc(d.filename)} · ${esc(d.subtitle)} · sha256 ${esc(d.sha256.slice(0, 12))}…</small></a>`;
      })
      .join("") + `<p class="hint">Your copy of what the buyer receives. Open the report and use Print → Save as PDF. The operator completes the statement and signs it.</p>`;
};

$("copy-link").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("share-link").value);
    $("copy-link").textContent = "Copied";
  } catch {
    $("share-link").select();
  }
  setTimeout(() => ($("copy-link").textContent = "Copy"), 1500);
};

// ---------- 4. lots and buyers ----------

async function refreshRegister() {
  const { lots = [] } = await fetch("/api/lots/register").then((r) => r.json()).catch(() => ({}));
  $("register").innerHTML = lots.length
    ? lots
        .slice()
        .reverse()
        .map((l) => `<tr><td><b>${esc(l.id)}</b><span class="reason">${esc(new Date(l.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span></td><td>${esc(l.buyer.name)}${l.buyer.email ? `<span class="reason">${esc(l.buyer.email)}</span>` : ""}</td><td>${esc(l.plot_ids.join(", "))}<span class="reason">${l.receipts.length} receipt(s)</span></td><td>${esc(Number(l.kg).toLocaleString("en"))} ${esc(l.kg_unit)}</td><td><span class="status ${l.status === "filed" ? "filed" : "sent"}">${l.status === "filed" ? "Filed by buyer" : "Sent, awaiting filing"}</span>${l.filing ? `<span class="reason">DDS ref. ${esc(l.filing.reference)}</span>` : ""}</td><td><a href="${esc(l.share_path)}" target="_blank" rel="noopener">Buyer view</a></td></tr>`)
        .join("")
    : '<tr><td colspan="6" class="hint">No lot sent yet.</td></tr>';
}
refreshRegister();
