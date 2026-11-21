// CatatSekali front end (v3).
// 1. Capture: photo of a paper sheet -> visits the nurse reviews.
// 2. Reconcile: match each visit against the centre's P-Care visit list for the month,
//    and show what recovering the missing visits does to the contact rate and capitation.
// 3. Send: export the missing entries for P-Care, and a FHIR Bundle shaped for SATUSEHAT.
// Everything is synthetic. P-Care fields are illustrative; the FHIR Bundle is not validated.

const DIAGNOSES = {
  diarrhoea: { label: "Diarrhoea", icd10: "A09" },
  ari: { label: "Acute respiratory infection", icd10: "J06.9" },
  fever: { label: "Fever", icd10: "R50.9" },
  hypertension: { label: "Hypertension", icd10: "I10" },
  skin: { label: "Skin infection", icd10: "L08.9" },
  other: { label: "Other", icd10: "R69" },
};
const VACCINES = {
  BCG: "BCG",
  polio: "Polio",
  "DPT-HB-Hib": "DPT-HB-Hib",
  measles_rubella: "Measles-rubella",
  other: "Other",
};
const VISIT_TYPES = { sick: "Sick visit", immunisation: "Immunisation", antenatal: "Antenatal care" };

// Peraturan BPJS Kesehatan 7/2019: contact-rate rating bands (per 1,000 registered members)
// and puskesmas capitation by total KBK score. Weights: contact rate 40%, non-specialist
// referral ratio 50%, controlled Prolanis members 10%.
function contactRating(rate) {
  if (rate >= 150) return 4;
  if (rate >= 145) return 3;
  if (rate >= 140) return 2;
  return 1;
}
function capitationPct(contactRatingValue, otherRatings = 4) {
  const score = contactRatingValue * 0.4 + otherRatings * 0.5 + otherRatings * 0.1;
  if (score >= 4) return 100;
  if (score >= 3) return 95;
  if (score >= 2) return 90;
  return 85;
}

const state = { visits: [], pcare: null, fileDataUrl: null, mediaType: null };

const $ = (id) => document.getElementById(id);
const photoInput = $("photo");
const readBtn = $("read");
const demoBtn = $("demo");
const statusEl = $("status");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const isMissing = (v) => v === null || v === undefined || v === "";
const normName = (s) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
// Card numbers: digits only. Dates: DD/MM, zero-padded ("3/11", "03/11/2026" -> "03/11").
const normCard = (s) => String(s ?? "").replace(/\D/g, "");
function normDate(s) {
  const m = String(s ?? "").match(/(\d{1,2})\s*[\/.-]\s*(\d{1,2})/);
  return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}` : "";
}

// ---------- Step 1: capture ----------

photoInput.addEventListener("change", () => handleFile(photoInput.files?.[0]));

const dropzone = $("dropzone");
for (const type of ["dragenter", "dragover"]) {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag");
  });
}
for (const type of ["dragleave", "drop"]) {
  dropzone.addEventListener(type, () => dropzone.classList.remove("drag"));
}
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  handleFile(event.dataTransfer?.files?.[0]);
});

async function handleFile(file) {
  if (!file) return;
  try {
    const { dataUrl, mediaType } = await downscaleImage(file, 1800);
    state.fileDataUrl = dataUrl;
    state.mediaType = mediaType;
    $("previewImg").src = dataUrl;
    $("preview").hidden = false;
    readBtn.disabled = false;
    setStatus("Photo ready. Press “Read sheet”.");
  } catch {
    setStatus("That file couldn't be opened as an image.", true);
  }
}

// Phone photos are large; shrink them before sending so the request stays small.
function downscaleImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), mediaType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

async function loadPcare() {
  if (state.pcare) return state.pcare;
  const res = await fetch("sample-pcare-export.json");
  state.pcare = await res.json();
  return state.pcare;
}

readBtn.addEventListener("click", async () => {
  if (!state.fileDataUrl) return;
  readBtn.disabled = true;
  readBtn.classList.add("loading");
  readBtn.querySelector(".label").textContent = "Reading…";
  setStatus("Reading the sheet… this can take a little while.");
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: state.fileDataUrl.split(",")[1], mediaType: state.mediaType }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Server error (${res.status})`);
    await loadPcare();
    loadVisits(body.visits, `Read ${body.visits.length} visits from the photo.`);
  } catch (error) {
    setStatus(`${error.message}`, true);
  } finally {
    readBtn.disabled = false;
    readBtn.classList.remove("loading");
    readBtn.querySelector(".label").textContent = "Read sheet";
  }
});

demoBtn.addEventListener("click", async () => {
  try {
    const [visitsRes] = await Promise.all([fetch("sample-visits.json"), loadPcare()]);
    const body = await visitsRes.json();
    loadVisits(body.visits, "Demo mode: loaded the sample sheet (pre-extracted, no AI call).");
  } catch {
    setStatus("Couldn't load the sample data.", true);
  }
});

function loadVisits(visits, message) {
  state.visits = visits.map((v) => ({ ...v, uncertain_fields: [...(v.uncertain_fields || [])] }));
  $("results").hidden = false;
  renderVisits();
  renderOutputs();
  setStatus(message);
  $("summary").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- Step 2: reconcile against P-Care ----------

function reconcile(visit, entries) {
  const card = normCard(visit.bpjs_card_number);
  const date = normDate(visit.date);
  if (card) {
    const hit = date && entries.find((e) => normCard(e.noKartu) === card && normDate(e.tglDaftar) === date);
    if (hit) return { status: "matched", entry: hit };
    // Already counted this month on another date? Then entering this visit won't raise the contact rate.
    const counted = entries.some((e) => normCard(e.noKartu) === card);
    return { status: "missing", newMember: !counted };
  }
  const probable = date && entries.find((e) => normName(e.nama) === normName(visit.name) && normDate(e.tglDaftar) === date);
  return probable ? { status: "probable", entry: probable } : { status: "unchecked" };
}

const STATUS_LABEL = {
  matched: "In P-Care",
  probable: "Probable match",
  missing: "Missing from P-Care",
  unchecked: "Can't check: no card",
};

function options(map, selected, allowBlank) {
  const blank = allowBlank ? `<option value="" ${isMissing(selected) ? "selected" : ""}>—</option>` : "";
  return blank + Object.entries(map)
    .map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`)
    .join("");
}

const DIAGNOSIS_LABELS = Object.fromEntries(Object.entries(DIAGNOSES).map(([k, v]) => [k, v.label]));

function detailCell(v, i) {
  if (v.visit_type === "sick") {
    return `<select data-i="${i}" data-field="diagnosis" aria-label="Diagnosis, visit ${v.row}" class="${isMissing(v.diagnosis) ? "missing" : ""}">${options(DIAGNOSIS_LABELS, v.diagnosis, true)}</select>`;
  }
  if (v.visit_type === "immunisation") {
    return `<select data-i="${i}" data-field="vaccine" aria-label="Vaccine, visit ${v.row}" class="${isMissing(v.vaccine) ? "missing" : ""}">${options(VACCINES, v.vaccine, true)}</select>`;
  }
  return `<span class="muted">ANC visit ${escapeHtml(v.anc_visit_number ?? "?")}</span>`;
}

function renderVisits() {
  const tbody = $("visitsTable").querySelector("tbody");
  tbody.innerHTML = state.visits
    .map((v, i) => `
      <tr id="visit-${v.row}">
        <td>${escapeHtml(v.row)}</td>
        <td>${escapeHtml(v.date)}</td>
        <td class="name">${escapeHtml(v.name)}</td>
        <td><input data-i="${i}" data-field="bpjs_card_number" inputmode="numeric" value="${escapeHtml(v.bpjs_card_number ?? "")}" aria-label="BPJS card number, visit ${v.row}" class="cardno ${isMissing(v.bpjs_card_number) ? "missing" : ""}"></td>
        <td><select data-i="${i}" data-field="sex" aria-label="Sex, visit ${v.row}" class="${isMissing(v.sex) ? "missing" : ""}">${options({ M: "M", F: "F" }, v.sex, true)}</select></td>
        <td><input data-i="${i}" data-field="age_years" type="number" min="0" max="120" step="0.01" value="${v.age_years ?? ""}" aria-label="Age in years, visit ${v.row}" class="${isMissing(v.age_years) ? "missing" : ""}"></td>
        <td><span class="pill ${escapeHtml(v.visit_type)}">${VISIT_TYPES[v.visit_type] || escapeHtml(v.visit_type)}</span></td>
        <td>${detailCell(v, i)}</td>
        <td class="status-cell"></td>
      </tr>`)
    .join("");
}

$("visitsTable").addEventListener("input", (event) => {
  const el = event.target;
  const i = Number(el.dataset.i);
  const field = el.dataset.field;
  if (!field || Number.isNaN(i)) return;
  const visit = state.visits[i];
  let value = el.value.trim();
  if (field === "age_years") value = value === "" ? null : Number(value);
  if (value === "") value = null;
  visit[field] = value;
  if (!isMissing(value)) visit.uncertain_fields = visit.uncertain_fields.filter((f) => f !== field);
  el.classList.toggle("missing", isMissing(value));
  renderOutputs();
});

// ---------- Data-quality flags (before anything is sent) ----------

function findFlags(visits, results) {
  const flags = [];
  const rows = (list) => list.map((v) => `#${v.row}`).join(", ");

  const missing = visits.filter((v, i) => results[i].status === "missing");
  if (missing.length) {
    const alreadyCounted = missing.filter((v) => !results[visits.indexOf(v)].newMember);
    flags.push({
      level: "attention",
      rows: missing.map((v) => v.row),
      html: `<strong>${missing.length} visit(s) from registered members never reached P-Care.</strong>
        Visit ${rows(missing)}. They should still be entered.` +
        (alreadyCounted.length
          ? ` Visit ${rows(alreadyCounted)} won't change the contact rate: that member is already counted this month.`
          : ` None of these members is counted yet this month, so each one raises the contact rate.`),
    });
  }
  const noDate = visits.filter((v) => !normDate(v.date));
  if (noDate.length) {
    flags.push({
      level: "attention",
      rows: noDate.map((v) => v.row),
      html: `<strong>Visit ${rows(noDate)} has no readable date.</strong> It can't be matched or sent until a date is added.`,
    });
  }
  const probable = visits.filter((v, i) => results[i].status === "probable");
  if (probable.length) {
    flags.push({
      level: "check",
      rows: probable.map((v) => v.row),
      html: `<strong>Probable match, confirm before counting:</strong> visit ${rows(probable)} has no card number on the sheet. It matches a P-Care entry by name and date only.`,
    });
  }
  const unchecked = visits.filter((v, i) => results[i].status === "unchecked");
  if (unchecked.length) {
    flags.push({
      level: "check",
      rows: unchecked.map((v) => v.row),
      html: `<strong>Can't check:</strong> visit ${rows(unchecked)} has no card number and no P-Care entry with the same name and date. Add the card number, or confirm the patient isn't a JKN member.`,
    });
  }
  const noAge = visits.filter((v) => isMissing(v.age_years));
  if (noAge.length) {
    flags.push({
      level: "attention",
      rows: noAge.map((v) => v.row),
      html: `<strong>Visit ${rows(noAge)} has no age.</strong> Age-grouped reports can't place it, and the record will differ between systems. Check the sheet before sending.`,
    });
  }
  const noSex = visits.filter((v) => isMissing(v.sex));
  if (noSex.length) {
    flags.push({
      level: "check",
      rows: noSex.map((v) => v.row),
      html: `<strong>Check:</strong> visit ${rows(noSex)} has no sex recorded.`,
    });
  }
  const oddAnc = visits.filter((v) => v.visit_type === "antenatal" && (v.sex === "M" || (!isMissing(v.age_years) && v.age_years < 10)));
  if (oddAnc.length) {
    flags.push({
      level: "attention",
      rows: oddAnc.map((v) => v.row),
      html: `<strong>Antenatal visit doesn't fit the patient.</strong> Check sex and age on visit ${rows(oddAnc)}.`,
    });
  }
  for (const v of visits) {
    const pending = v.uncertain_fields.filter((f) => !["age_years", "sex", "bpjs_card_number"].includes(f) || !isMissing(v[f]));
    if (pending.length) {
      flags.push({
        level: "check",
        rows: [v.row],
        html: `<strong>Check visit #${v.row}:</strong> hard to read: ${pending.map(escapeHtml).join(", ")}.`,
      });
    }
  }
  return flags;
}

// ---------- Render ----------

function renderOutputs() {
  const visits = state.visits;
  const pcare = state.pcare;
  const results = visits.map((v) => reconcile(v, pcare.entries));
  const flags = findFlags(visits, results);

  // Per-row P-Care status
  visits.forEach((v, i) => {
    const cell = document.querySelector(`#visit-${v.row} .status-cell`);
    if (!cell) return;
    const r = results[i];
    cell.innerHTML = r.status === "missing" && !r.newMember
      ? `<span class="status missing">Visit missing · member already counted</span>`
      : `<span class="status ${r.status}">${STATUS_LABEL[r.status]}</span>`;
  });

  // Contact rate, computed on unique registered members.
  const c = pcare.centre;
  // Only members with no P-Care entry at all this month raise the rate (unique members).
  const missingCards = new Set(
    visits.filter((v, i) => results[i].status === "missing" && results[i].newMember).map((v) => normCard(v.bpjs_card_number)),
  );
  const sheetMissing = missingCards.size;
  const monthMissing = c.other_sheets_missing_unique_members + sheetMissing;
  const before = (c.unique_members_in_pcare / c.registered_members) * 1000;
  const after = ((c.unique_members_in_pcare + monthMissing) / c.registered_members) * 1000;
  const rBefore = contactRating(before);
  const rAfter = contactRating(after);
  const pctBefore = capitationPct(rBefore);
  const pctAfter = capitationPct(rAfter);

  $("summary").innerHTML = `
    <div class="sum-grid">
      <div class="sum-cell">
        <span class="sum-label">This sheet</span>
        <span class="sum-num">${sheetMissing}</span>
        <span class="sum-sub">registered member(s) not yet in P-Care this month</span>
      </div>
      <div class="sum-cell">
        <span class="sum-label">This month (${c.other_sheets} other sheets, synthetic)</span>
        <span class="sum-num">${monthMissing}</span>
        <span class="sum-sub">unique members to recover: ${c.other_sheets_missing_unique_members} + ${sheetMissing}</span>
      </div>
      <div class="sum-cell accent">
        <span class="sum-label">Contact rate per 1,000 members</span>
        <span class="sum-num">${before.toFixed(1)} → ${after.toFixed(1)}</span>
        <span class="sum-sub">rating ${rBefore} → ${rAfter} · target ≥150</span>
      </div>
      <div class="sum-cell accent">
        <span class="sum-label">Capitation paid</span>
        <span class="sum-num">${pctBefore}% → ${pctAfter}%</span>
        <span class="sum-sub">if the other two KBK indicators are at rating 4</span>
      </div>
    </div>
    <small>${escapeHtml(c.name)}: ${c.registered_members.toLocaleString("en")} registered members, ${c.unique_members_in_pcare} unique members already in P-Care this month. Rule: Peraturan BPJS Kesehatan 7/2019 (contact rate = unique registered members served ÷ registered members × 1,000). All figures synthetic.</small>`;

  // Rating table
  $("ratingTable").innerHTML = `
    <table>
      <thead><tr><th>Contact rate</th><th class="num">Rating</th><th class="num">Capitation*</th></tr></thead>
      <tbody>
        ${[[1, "< 140"], [2, "140 – < 145"], [3, "145 – < 150"], [4, "≥ 150"]]
          .map(([r, band]) => `<tr class="${r === rBefore ? "was" : ""} ${r === rAfter ? "now" : ""}"><td>${band}</td><td class="num">${r}</td><td class="num">${capitationPct(r)}%</td></tr>`)
          .join("")}
      </tbody>
    </table>
    <p class="meta small">*Puskesmas capitation by total KBK score, with the referral ratio and Prolanis indicators held at rating 4. Peraturan BPJS Kesehatan 7/2019; check it is still current.</p>`;

  // Flags
  $("flags").innerHTML = flags.length
    ? flags.map((f) => `<li class="${f.level === "check" ? "check" : ""}"><div>${f.html}</div></li>`).join("")
    : `<li class="ok"><div><strong>Everything matches.</strong> Nothing left to check.</div></li>`;

  const attention = new Set(flags.filter((f) => f.level === "attention").flatMap((f) => f.rows));
  const check = new Set(flags.filter((f) => f.level === "check").flatMap((f) => f.rows));
  for (const v of visits) {
    const tr = document.getElementById(`visit-${v.row}`);
    if (!tr) continue;
    tr.classList.toggle("attention", attention.has(v.row));
    tr.classList.toggle("check", !attention.has(v.row) && check.has(v.row));
  }

  $("pcareCount").textContent = String(results.filter((r) => r.status === "missing").length);
}

// ---------- Step 3: send ----------

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function icd10For(v) {
  if (v.visit_type === "sick") return DIAGNOSES[v.diagnosis]?.icd10 ?? null;
  if (v.visit_type === "immunisation") return "Z23";
  if (v.visit_type === "antenatal") return v.anc_visit_number === 1 ? "Z34.0" : "Z34.8";
  return null;
}

$("exportPcare").addEventListener("click", () => {
  // Visits without a readable date can't be sent; they're flagged on screen instead.
  const missing = state.visits.filter((v) => normDate(v.date) && reconcile(v, state.pcare.entries).status === "missing");
  // Send normalised values so the bridge gets digits-only card numbers and DD/MM dates.
  download("pcare-entries-to-send.json", {
    note: "Synthetic. Illustrative field names; the real P-Care bridging spec is behind the BPJS developer portal.",
    entries: missing.map((v) => ({
      noKartu: normCard(v.bpjs_card_number),
      nama: v.name,
      tglDaftar: normDate(v.date),
      kdDiag: icd10For(v),
      jenisKunjungan: v.visit_type === "sick" ? "sakit" : "sehat",
    })),
  });
});

$("exportFhir").addEventListener("click", () => {
  const entries = [];
  // Visits without a readable date can't be sent; they're flagged on screen instead.
  state.visits.filter((v) => normDate(v.date)).forEach((v) => {
    const encId = `urn:uuid:encounter-${v.row}`;
    const isoDate = `2026-${normDate(v.date).slice(3, 5)}-${normDate(v.date).slice(0, 2)}`;
    const subject = v.nik
      ? { reference: `Patient?identifier=https://fhir.kemkes.go.id/id/nik|${v.nik}`, display: v.name }
      : { display: `${v.name} (patient lookup by NIK still needed)` };
    entries.push({
      fullUrl: encId,
      resource: {
        resourceType: "Encounter",
        identifier: [{ system: "http://sys-ids.kemkes.go.id/encounter/{organization-ihs-number}", value: `catatsekali-${isoDate}-${v.row}` }],
        status: "finished",
        class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
        subject,
        period: { start: isoDate },
        statusHistory: [
          { status: "arrived", period: { start: isoDate } },
          { status: "in-progress", period: { start: isoDate } },
          { status: "finished", period: { start: isoDate } },
        ],
      },
      request: { method: "POST", url: "Encounter" },
    });
    if (v.visit_type === "sick" && v.diagnosis) {
      entries.push({
        resource: {
          resourceType: "Condition",
          code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: icd10For(v), display: DIAGNOSES[v.diagnosis].label }] },
          subject,
          encounter: { reference: encId },
        },
        request: { method: "POST", url: "Condition" },
      });
    }
    if (v.visit_type === "immunisation" && v.vaccine) {
      entries.push({
        resource: {
          resourceType: "Immunization",
          status: "completed",
          vaccineCode: { text: VACCINES[v.vaccine] },
          patient: subject,
          encounter: { reference: encId },
          occurrenceDateTime: isoDate,
        },
        request: { method: "POST", url: "Immunization" },
      });
    }
  });
  download("satusehat-bundle.json", {
    resourceType: "Bundle",
    type: "transaction",
    meta: { tag: [{ code: "synthetic-not-validated", display: "Shaped to SATUSEHAT profiles, not validated" }] },
    entry: entries,
  });
});
