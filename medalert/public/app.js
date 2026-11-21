import { parseGs1 } from "/shared/match.js";

const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const FIELDS = ["batch", "product", "strength", "expiry", "manufacturer", "registration_no"];

let state = null;
let current = { fields: null, source: null, photo: null };
let lastCheck = null;

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

// ---------- state + static bits ----------

async function loadState() {
  state = await api("/api/state");
  const a = state.alerts_by_issuer;
  $("#sourcesLine").innerHTML =
    `Checking against <b>${(a.WHO || 0) + (a.NAFDAC || 0) + (a.CDSCO || 0)}</b> official alerts: ` +
    `WHO ${a.WHO || 0} · Nigeria (NAFDAC) ${a.NAFDAC || 0} · India (CDSCO) ${a.CDSCO || 0}` +
    (state.vision ? "" : ` · <span title="No AI key on this server: demo packs use saved readings">photo reading: saved</span>`);
  $("#replayBtn").hidden = state.pending_replays.length === 0;
  renderStock();
}

function renderSamples() {
  $("#sampleList").innerHTML = state.samples
    .map(
      (s) => `<button class="sample" type="button" data-id="${esc(s.id)}">
        ${s.photo ? `<img src="${esc(s.photo)}" alt="">` : `<span class="typed">⌨</span>`}
        <span>${esc(s.label)}</span></button>`,
    )
    .join("");
  for (const btn of document.querySelectorAll(".sample")) btn.addEventListener("click", () => useSample(btn.dataset.id));
  $("#sourceLinks").innerHTML =
    `Sources: <a href="https://www.who.int/news/item/09-03-2020-medical-product-alert-n-1-2020-english-version" target="_blank" rel="noopener">WHO Alert N°1/2020</a> · ` +
    `<a href="https://nafdac.gov.ng/public-alert-no-01-2026-sale-of-falsified-tavanic-500mg-tablet-in-nigeria/" target="_blank" rel="noopener">NAFDAC Public Alert 01/2026</a> · ` +
    `<a href="https://greenbook.nafdac.gov.ng/" target="_blank" rel="noopener">NAFDAC Greenbook register</a> · ` +
    `<a href="${esc(state.cdsco.source_url)}" target="_blank" rel="noopener">CDSCO list, Sep 2026 (${state.cdsco.count} central-lab samples that failed testing)</a>. Photos credited to WHO and NAFDAC.`;
}

function renderStock() {
  const q = new Set(state.quarantined);
  const rows = state.stock.entries
    .map(
      (e) => `<tr id="stock-${esc(e.id)}">
      <td>${esc(e.received.slice(5))}</td><td>${esc(e.product)}</td><td class="mono">${esc(e.batch)}</td>
      <td>${esc(e.location)}</td><td>${q.has(e.id) ? '<span class="chip q">Quarantined</span>' : ""}</td></tr>`,
    )
    .join("");
  $("#stockTable").innerHTML =
    `<table class="stock"><thead><tr><th>In</th><th>Product</th><th>Batch</th><th>Where</th><th></th></tr></thead><tbody>${rows}</tbody></table>` +
    `<p class="fine">${esc(state.stock.note)}</p>`;
}

// ---------- step 1: read ----------

function status(text, isErr = false) {
  const el = $("#readStatus");
  el.hidden = !text;
  el.textContent = text || "";
  el.classList.toggle("err", isErr);
}

async function useSample(id) {
  const sample = state.samples.find((s) => s.id === id);
  if (sample.typed) {
    const { fields } = await api("/api/extract", { sample: id });
    showConfirm(fields, "Typed by the pharmacist (demo values).", null);
    return;
  }
  status("Reading the pack…");
  const blob = await (await fetch(sample.photo)).blob();
  await readPhoto(blob, id);
}

async function downscale(blob, max = 1600) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return { canvas, bmp, dataUrl: canvas.toDataURL("image/jpeg", 0.85) };
}

async function tryBarcode(bmp) {
  if (!("BarcodeDetector" in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    if (!formats.includes("data_matrix")) return null;
    const codes = await new window.BarcodeDetector({ formats: ["data_matrix"] }).detect(bmp);
    for (const c of codes) {
      const gs1 = parseGs1(c.rawValue);
      if (gs1?.batch) return gs1;
    }
  } catch {
    /* fall through to the photo reading */
  }
  return null;
}

async function readPhoto(blob, sampleId = null) {
  status("Reading the pack…");
  let img;
  try {
    img = await downscale(blob);
  } catch {
    status("That file is not a photo we can open. Try again or type the batch.", true);
    return;
  }
  const gs1 = await tryBarcode(img.bmp);
  if (gs1) {
    status("");
    showConfirm({ batch: gs1.batch, expiry: gs1.expiry, other_marks: `GS1 barcode · GTIN ${gs1.gtin || "?"}${gs1.serial ? ` · serial ${gs1.serial}` : ""}`, uncertain_fields: [] },
      "Read from the pack's GS1 barcode (no AI needed). Add the product name.", img.dataUrl);
    return;
  }
  const t0 = performance.now();
  try {
    const res = await api("/api/extract", { imageBase64: img.dataUrl.split(",")[1], mediaType: "image/jpeg", sample: sampleId });
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    status("");
    showConfirm(res.fields, res.source === "live" ? `Read from the photo by AI in ${secs} s. Check every field.` : res.why, img.dataUrl);
  } catch (err) {
    status(`${err.message}`, true);
    showConfirm({ uncertain_fields: ["batch"] }, "Photo not read. Type the fields from the pack.", img.dataUrl);
  }
}

$("#photoInput").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) readPhoto(file);
  e.target.value = "";
});
$("#typeBtn").addEventListener("click", () => showConfirm({}, "Typed by the pharmacist.", null));

// ---------- step 2: confirm ----------

function showConfirm(fields, sourceText, photo) {
  current = { fields, source: sourceText, photo };
  const form = $("#fieldsForm");
  const uncertain = new Set(fields.uncertain_fields || []);
  for (const name of FIELDS) {
    form.elements[name].value = fields[name] ?? "";
    form.elements[name].closest(".field").classList.toggle("uncertain", uncertain.has(name));
  }
  $("#fieldSource").textContent = sourceText;
  const ph = $("#packPhoto");
  ph.hidden = !photo;
  if (photo) ph.src = photo;
  const other = $("#otherMarks");
  other.hidden = !fields.other_marks;
  other.textContent = fields.other_marks ? `Also on the pack: ${fields.other_marks}` : "";
  $("#stepConfirm").hidden = false;
  $("#stepVerdict").hidden = true;
  $("#report").hidden = true;
  $("#stepConfirm").scrollIntoView({ behavior: "smooth", block: "start" });
  form.elements.batch.focus({ preventScroll: true });
}

$("#fieldsForm").addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("uncertain"));

$("#fieldsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const pack = Object.fromEntries(FIELDS.map((n) => [n, form.elements[n].value.trim() || null]));
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    lastCheck = { pack, ...(await api("/api/check", { pack })) };
    renderVerdict(lastCheck);
  } catch (err) {
    status(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ---------- step 3: verdict ----------

const LABELS = { red: "Quarantine", orange: "Hold and verify", none: "No alert found" };

function alertBox(a, pack) {
  const lot = a.lots?.find((l) => l.country === "Nigeria") || a.lots?.[0];
  return `<div class="alert-box">
    ${a.photo ? `<figure style="margin:0"><img src="${esc(a.photo)}" alt="Pack photo from the alert"><figcaption class="credit">${esc(a.photo_credit)}</figcaption></figure>` : ""}
    <div>
      <b>${esc(a.title)}</b> · ${esc(a.issuer_long)} · ${esc(a.date)}<br>
      ${esc(a.product)}${a.stated_manufacturer ? `, labelled as made by ${esc(a.stated_manufacturer)}` : ""}.
      <blockquote>“${esc(a.quote)}”</blockquote>
      ${lot && lot.result !== a.quote ? `<div>Lab result${lot.country ? ` (${esc(lot.country)})` : ""}: ${esc(lot.result)}</div>` : ""}
      ${a.signs?.length ? `<div>What to look for: ${a.signs.map(esc).join("; ")}.</div>` : ""}
      <a href="${esc(a.url)}" target="_blank" rel="noopener">Open the official alert ↗</a>
    </div></div>`;
}

function renderVerdict({ verdict, alerts, pack }) {
  const el = $("#stepVerdict");
  el.className = `card verdict ${verdict.level}`;
  const others = verdict.reasons.slice(1);
  el.innerHTML = `
    <span class="label">${LABELS[verdict.level] || ""}</span>
    <h3>${verdict.level === "red" ? "🔴 " : verdict.level === "orange" ? "🟠 " : "⚪ "}${esc(verdict.headline)}</h3>
    <p style="margin:0;font-size:14px">Batch <b style="font-family:ui-monospace,monospace">${esc(pack.batch)}</b>${pack.product ? ` · ${esc(pack.product)}` : ""}</p>
    ${others.length ? `<ul>${others.map((r) => `<li>${esc(r.text)}</li>`).join("")}</ul>` : ""}
    ${alerts.map((a) => alertBox(a, pack)).join("")}
    ${verdict.notes.length ? `<ul class="notes">${verdict.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    ${verdict.level === "red" || verdict.level === "orange"
      ? `<button class="btn ${verdict.level === "red" ? "danger" : "primary"} wide" id="reportBtn" type="button">${verdict.level === "red" ? "Quarantine + report to the regulator" : "Hold + report to the regulator"}</button>`
      : `<p class="fine">Checked against ${alertsCount()} official alerts on ${new Date().toLocaleDateString("en-GB")}. Lab testing and normal receipt checks still apply.</p>`}
    <button class="btn ghost wide" id="nextBtn" type="button">Check the next pack</button>`;
  el.hidden = false;
  $("#report").hidden = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  $("#reportBtn")?.addEventListener("click", () => showReport({ pack, verdict, alert: alerts[0] }));
  $("#nextBtn").addEventListener("click", () => {
    el.hidden = true;
    $("#stepConfirm").hidden = true;
    $("#report").hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const alertsCount = () => Object.values(state.alerts_by_issuer).reduce((a, b) => a + b, 0);

// ---------- report ----------

function showReport({ pack, verdict, alert, stockEntry }) {
  const regulator = alert?.issuer === "CDSCO" ? "CDSCO (India)" : "NAFDAC Pharmacovigilance (Nigeria)";
  const report = {
    report_type: "Product quality problem",
    send_to: regulator,
    reporter: "Hospital pharmacist, pharmacy store (demo hospital)",
    date_found: new Date().toISOString().slice(0, 10),
    product_name: pack.product || alert?.product || "",
    strength: pack.strength || "",
    batch_number: pack.batch,
    expiry_date: pack.expiry || "",
    manufacturer_on_pack: pack.manufacturer || "",
    registration_number: pack.registration_no || (stockEntry ? "not recorded in stock log" : "not on pack"),
    problem: verdict.level === "red" ? `Batch matches ${alert?.title}` : verdict.headline,
    alert_reference: alert ? `${alert.title} (${alert.url})` : "",
    quantity_and_location: stockEntry ? `${stockEntry.qty}, ${stockEntry.location}` : "At goods receipt (not yet shelved)",
    supplier: stockEntry?.supplier || "",
    action_taken: verdict.level === "red" ? "Quarantined, not dispensed" : "Held pending verification",
  };
  const el = $("#report");
  el.innerHTML = `<h2>Report, ready to send</h2>
    <p class="fine">Pre-filled from the confirmed fields. Layout follows the product-quality fields of NAFDAC's Med Safety reporting; check against the live form before sending.</p>
    <dl>${Object.entries(report).map(([k, v]) => `<dt>${esc(k.replaceAll("_", " "))}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <div class="row">
      <button class="btn primary" id="copyReport" type="button">Copy report</button>
      <button class="btn" id="dlReport" type="button">Download (.json)</button>
    </div>`;
  el.hidden = false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const text = Object.entries(report).map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`).join("\n");
  $("#copyReport").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = "Copied ✓";
    } catch {
      e.target.textContent = "Copy blocked: select the text";
    }
  });
  $("#dlReport").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    a.download = `medalert-report-${pack.batch}.json`;
    a.click();
  });
}

// ---------- sweep ----------

$("#replayBtn").addEventListener("click", async () => {
  const pending = state.pending_replays[0];
  if (!pending) return;
  const { alert, hits } = await api("/api/replay-alert", { id: pending.id });
  await loadState();
  const banner = $("#banner");
  const where = hits.map((h) => `${h.qty} in ${h.location} (received ${h.received.slice(8)}/${h.received.slice(5, 7)})`).join("; ");
  banner.innerHTML = hits.length
    ? `<h3>New ${esc(alert.issuer)} alert: ${esc(alert.product.replace(/ \(.*\)/, ""))}, batch ${esc(alert.batches[0])}</h3>
       <p><b>You have it:</b> ${esc(where)}. Quarantine?</p>
       <div class="row"><button class="btn" id="bannerQ" type="button">Quarantine + report</button><button class="btn ghost" id="bannerX" type="button">Later</button></div>
       <div class="src">${esc(alert.title)}, ${esc(alert.date)} · replayed against the synthetic stock log</div>`
    : `<h3>New ${esc(alert.issuer)} alert: batch ${esc(alert.batches[0])}</h3><p>Not in your received stock.</p><div class="row"><button class="btn ghost" id="bannerX" type="button">OK</button></div>`;
  banner.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  for (const h of hits) document.querySelector(`#stock-${CSS.escape(h.id)} td:last-child`).innerHTML = '<span class="chip hit">On alert</span>';
  $("#stockDrawer").open = true;
  $("#bannerX").addEventListener("click", () => (banner.hidden = true));
  $("#bannerQ")?.addEventListener("click", async () => {
    for (const h of hits) state = await api("/api/quarantine", { entry_id: h.id });
    renderStock();
    banner.hidden = true;
    const h = hits[0];
    showReport({
      pack: { product: h.product, batch: h.batch, expiry: h.expiry, manufacturer: h.manufacturer },
      verdict: { level: "red" },
      alert,
      stockEntry: h,
    });
  });
});

$("#resetBtn").addEventListener("click", async () => {
  await api("/api/reset", {});
  $("#banner").hidden = true;
  $("#stepConfirm").hidden = true;
  $("#stepVerdict").hidden = true;
  $("#report").hidden = true;
  $("#stockDrawer").open = false;
  status("");
  await loadState();
  window.scrollTo({ top: 0 });
});

await loadState();
renderSamples();
