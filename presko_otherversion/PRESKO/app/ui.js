// Presko web app UI: router, header, admin and school screens. Reads only the view model; writes only via store actions.
import { createStore, ROLES, DEMO, addDays } from "./store.js";
import { viewModel, replayViewModel, LEVEL_TEXT } from "./selectors.js";
import { renderDivision2D, renderSchool2D, legendHTML, sunArc, PLAN_LABEL, PLAN_ORDER } from "./scenes.js";
import { prefers3D, loadThree, division3D, school3D } from "./scene3d.js";
import { parentMessage, correctionMessage, morningMessage, chaseText, tellHeadText } from "./messages.js";
import { FOURH, FEATURES, FEATURE_KEYS, BAND_RULE, HINAY_SLOTS, CALIBRATION, CITY, EO130, REPLAYS, DIVISION_FACTS, decisionsCSV, withDay, keywordFeatures } from "../engine.js";

let storage = null;
try { storage = window.localStorage; storage.getItem("x"); } catch { storage = null; }
const store = createStore({ storage });
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Math.round(n).toLocaleString("en");
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "short", day: "numeric", month: "short" }); };
const ui = { planDate: null, selected: null, preview: false, use3D: prefers3D(), lang: "en", filter: "awaiting-sdo", confirmPublish: false, scene: null, sceneKind: null, flash: "", sdoNote: {}, chooseOther: false };
const PANDAC = () => store.schools().find((s) => s.name === DEMO.pandac);
const tomorrow = () => addDays(store.state.today, 1);

// ---------- router ----------
function route() {
  const h = (location.hash || "#start").slice(1);
  if (h.startsWith("school-")) {
    let rest = h.slice(7), sub = "today";
    for (const s of ["morning", "setup"]) if (rest.endsWith(`-${s}`)) { sub = s; rest = rest.slice(0, -(s.length + 1)); }
    return { page: `school-${sub}`, slug: rest };
  }
  return { page: h };
}
const go = (hash) => { if (location.hash === `#${hash}`) render(); else location.hash = hash; };

// ---------- clock ----------
function countdown() {
  const now = new Date(), end = new Date(now); end.setHours(17, 0, 0, 0);
  const ms = end - now;
  if (ms <= 0) return { text: "Past 17:00", late: true };
  const m = Math.floor(ms / 60000);
  return { text: `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m to 17:00`, late: false, soon: m <= 15 };
}

// ---------- header ----------
function renderHeader(r) {
  const role = store.role(), mode = ROLES[role.kind].mode;
  const p = PANDAC();
  const f = store.day(tomorrow()).forecast;
  const cd = countdown();
  const morning = r.page === "school-morning";
  const tabs = mode === "admin"
    ? [["admin", "Division"], ["admin-decisions-awaiting", "Decisions"], ["admin-replay", "Replay"], ["admin-rules", "Rules"], ["admin-data", "Data"]]
    : (() => { const s = store.school(role.schoolId); return [[`school-${s.slug}`, "Today"], [`school-${s.slug}-morning`, "Morning check"], [`school-${s.slug}-setup`, "Setup"]]; })();
  const cur = location.hash.slice(1) || "start";
  const school = mode === "school" ? store.school(role.schoolId) : null;
  $("#hdr").innerHTML = `
    <div class="brand"><b>Presko</b><span class="who">${esc(role.name)} · ${esc(ROLES[role.kind].label)}${school ? `, ${esc(school.name)}` : ""} <span class="tag" style="color:var(--muted)">demo, no sign-in</span></span></div>
    <div class="fc">
      <span>${f ? `Tomorrow ${fmtDate(tomorrow())}: <b class="mono">${f.hi}°C</b> PAGASA ${f.status} · ${fmtTime(f.publishedAt)}` : `Tomorrow ${fmtDate(tomorrow())}: <span class="muted">no forecast published</span>`}</span>
      ${morning ? "" : `<span class="count ${cd.late ? "late" : ""}" role="timer">${cd.text}</span>`}
      <button class="chip-btn" id="switchRole">${mode === "admin" ? "Switch: Pandac head" : "Switch: SDO"}</button>
      <select id="rolePick" aria-label="Change role" style="min-height:36px;font-size:14px">
        ${[["coordinator", "Coordinator"], ["sdo", "SDO approver"], ["head", "Pandac head"], ["teacher", "Pandac teacher"], ["custodian", "Pandac custodian"]].map(([k, l]) => `<option value="${k}" ${role.kind === k ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </div>
    <nav class="tabs" aria-label="Sections">${tabs.map(([h, l]) => `<a href="#${h}" ${cur === h || (h === "admin-decisions-awaiting" && cur.startsWith("admin-decisions")) ? 'aria-current="page"' : ""}>${l}</a>`).join("")}<a href="#demo">Demo</a></nav>`;
  $("#switchRole").onclick = () => {
    if (mode === "admin") { store.actions.setRole("head", { name: "Ma. Santos", schoolId: p.id }); go(`school-${p.slug}`); }
    else { store.actions.setRole("sdo", { name: "Dr. Reyes (SDS)" }); go("admin-decisions-awaiting"); }
  };
  $("#rolePick").onchange = (e) => {
    const k = e.target.value;
    const names = { coordinator: "R. Dela Cruz (DRRM)", sdo: "Dr. Reyes (SDS)", head: "Ma. Santos", teacher: "J. Villanueva", custodian: "P. Gonzaga" };
    store.actions.setRole(k, { name: names[k], schoolId: ROLES[k].mode === "school" ? p.id : null });
    go(ROLES[k].mode === "admin" ? (k === "sdo" ? "admin-decisions-awaiting" : "admin") : k === "teacher" ? `school-${p.slug}-morning` : k === "custodian" ? `school-${p.slug}-setup` : `school-${p.slug}`);
  };
}

// ---------- shared bits ----------
const lvlChip = (lvl) => `<span class="lvl ${lvl}" style="background:var(--${lvl})">${lvl} <small>${LEVEL_TEXT[lvl].split(" ")[1]}</small></span>`;
const planChip = (v) => `<span class="plan"><svg class="sym" viewBox="0 0 16 16" aria-hidden="true">${symbolFor(v.planType)}</svg>${esc(v.planLabel)}</span>`;
let symbolFor = () => "";
import("./scenes.js").then((m) => { symbolFor = (t) => m.symbol(t, 8, 8, 7); });
const statusHTML = (v) => `<span class="status ${v.status}">${esc(v.sentence)}</span>`;
function copyBtn(id, text, label = "Copy") {
  queueMicrotask(() => { const b = document.getElementById(id); if (!b) return; b.onclick = async () => { try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; } catch { const t = b.nextElementSibling; if (t) { const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r); } b.textContent = "Selected"; } setTimeout(() => (b.textContent = label), 1500); }; });
  return `<button class="chip-btn" id="${id}">${label}</button>`;
}
function guard(fn) { try { fn(); ui.flash = ""; } catch (e) { ui.flash = e.message; render(); } }
const flashHTML = () => (ui.flash ? `<div class="banner bad" role="alert">${esc(ui.flash)}</div>` : "");
const bannerNotices = () => [
  ...store.notices.splice(0).map((n) => `<div class="banner">${esc(n)}</div>`),
  !store.storageOk || !storage ? `<div class="banner bad">Changes won't be saved in this browser.</div>` : "",
].join("");

// ---------- scene mounting ----------
function disposeScene() { ui.scene?.dispose?.(); ui.scene = null; ui.sceneKind = null; }
function mountDivision(el, vm) {
  const tools = `<div class="tools">${ui.use3D ? `<button data-preset="overview">Overview</button><button data-preset="north">North</button><button data-preset="south">South</button>` : ""}<button id="t3d">${ui.use3D ? "2D view" : "3D view"}</button></div>`;
  const draw2D = () => { disposeScene(); el.innerHTML = `<div class="map2d"></div>${tools}`; renderDivision2D($(".map2d", el), vm, { selected: ui.selected, onSelect: select }); wireTools(); };
  const wireTools = () => {
    $("#t3d", el).onclick = () => { ui.use3D = !ui.use3D; render(); };
    el.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => ui.scene?.preset?.(b.dataset.preset)));
  };
  if (!ui.use3D) return draw2D();
  if (ui.scene && ui.sceneKind === "division" && el.contains(ui.scene.el)) { ui.scene.update(vm); return; }
  disposeScene();
  el.innerHTML = `<div class="c3d" style="height:520px"></div>${tools}<div class="tip" hidden></div>`;
  wireTools();
  loadThree().then((THREE) => {
    const host = $(".c3d", el), tip = $(".tip", el);
    const sc = division3D(THREE, host, vm, {
      onSelect: select,
      onHover: (id, e) => { const v = vm.schools.find((x) => x.id === id); if (!v) { tip.hidden = true; return; } const r = el.getBoundingClientRect(); tip.hidden = false; tip.style.left = `${e.clientX - r.left + 12}px`; tip.style.top = `${e.clientY - r.top + 12}px`; tip.textContent = vm.waiting ? v.name : `${v.name}: ${v.levelText} · ${v.planLabel}`; },
    });
    ui.scene = { ...sc, el: host }; ui.sceneKind = "division";
    setTimeout(() => { if (ui.scene && !ui.scene.firstFrame()) { ui.use3D = false; draw2D(); } }, 3000);
  }).catch(() => { ui.use3D = false; draw2D(); });
}
function mountSchool(el, v) {
  const draw2D = () => { disposeScene(); el.innerHTML = `<div style="padding:12px"></div>`; renderSchool2D(el.firstChild, v); };
  if (!ui.use3D) return draw2D();
  disposeScene();
  el.innerHTML = `<div class="c3d" style="height:380px"></div>`;
  loadThree().then((THREE) => {
    const sc = school3D(THREE, $(".c3d", el), v);
    ui.scene = { ...sc, el }; ui.sceneKind = "school";
    setTimeout(() => { if (ui.scene && !ui.scene.firstFrame()) { ui.use3D = false; draw2D(); } }, 3000);
  }).catch(() => { ui.use3D = false; draw2D(); });
}
function select(id) { ui.selected = id; render(); }

// ---------- admin: Division ----------
function adminDivision() {
  const role = store.role();
  if (!ui.planDate) ui.planDate = new Date().getHours() < 12 && store.day(store.state.today).forecast ? store.state.today : tomorrow();
  const date = ui.planDate;
  const pub = store.day(date).forecast;
  const draftDiffers = !pub || pub.hi !== store.state.draft.hi;
  const preview = ui.preview && draftDiffers;
  const vm = viewModel(store, { date, preview });
  const isCoord = role.kind === "coordinator";
  const impact = store.actions.republishImpact(date);
  const sel = !vm.waiting && vm.schools.find((v) => v.id === ui.selected);
  const cd = countdown();
  const kpi = vm.waiting ? "" : vm.level === "HINGA"
    ? `<p><b class="mono">${vm.tally.request}</b> schools have grounds to ask for face-to-face back: <b class="mono">${fmt(vm.requestSections)}</b> of ${fmt(vm.sections)} sections, in cooler rooms on shortened hours${vm.city?.status === "auto" ? `, <b>subject to the city EO</b> (EO 047-A precedent)` : ""}.</p>`
    : vm.level === "HINTO" ? `<p>${vm.noClassesAnywhere ? "<b>No classes anywhere</b>, not even modules. Parents get a stay-cool message." : `${vm.tally.stop} schools with no classes.`}</p>`
    : `<p><b class="mono">${vm.keptPct}%</b> of normal face-to-face learner-hours · <b class="mono">${fmt(vm.checkFirst)}</b> hot rooms to check first at 8:00</p>`;
  const dc = vm.decisions || {};
  $("#main").innerHTML = `${bannerNotices()}${flashHTML()}
  ${preview ? `<div class="banner" style="border:2px dashed var(--accent)"><b>Preview, not published.</b> Schools still see ${pub ? `${pub.hi}°C` : "no forecast"}. Only you see this.</div>` : ""}
  <div class="admin">
    <section class="card" aria-label="Forecast">
      <div class="row" role="group" aria-label="Day shown">
        <button class="chip-btn" data-date="${store.state.today}" aria-pressed="${date === store.state.today}">Today ${fmtDate(store.state.today)}</button>
        <button class="chip-btn" data-date="${tomorrow()}" aria-pressed="${date === tomorrow()}">Tomorrow ${fmtDate(tomorrow())}</button>
      </div>
      <div class="eyebrow">PAGASA heat-index forecast for ${fmtDate(date)}</div>
      ${pub ? `<p>Published: <b class="mono">${pub.hi}°C</b> · ${pub.status} · ${fmtTime(pub.publishedAt)}</p>` : `<p class="muted">Not published yet. Schools see "Waiting for the SDO's forecast".</p>`}
      ${isCoord ? `
      <div class="row"><label for="draft" class="small">Draft</label><input id="draft" type="number" step="0.1" min="20" max="60" inputmode="decimal" value="${store.state.draft.hi}" style="width:7em"> <span>°C</span>
        <select id="draftStatus" aria-label="Forecast status"><option value="provisional" ${store.state.draft.status === "provisional" ? "selected" : ""}>Provisional</option><option value="final" ${store.state.draft.status === "final" ? "selected" : ""}>Final (5 p.m. advisory)</option></select></div>
      ${draftDiffers ? `<label class="row small"><input type="checkbox" id="prev" ${ui.preview ? "checked" : ""} style="min-height:auto"> Preview the draft (only you)</label>` : ""}
      ${ui.confirmPublish ? `<div class="banner bad">This marks <b>${impact.stale}</b> recorded decision${impact.stale === 1 ? "" : "s"} "re-confirm"${impact.restored ? ` and restores <b>${impact.restored}</b> made at ${store.state.draft.hi}°C` : ""}. <div class="row" style="margin-top:8px"><button class="primary" id="pubYes">Publish anyway</button><button id="pubNo">Cancel</button></div></div>`
        : `<button class="primary" id="publish" ${pub && !draftDiffers && pub.status === store.state.draft.status ? "disabled" : ""}>Publish to schools</button>`}` : `<p class="small muted">Only the DRRM coordinator publishes the forecast.</p>`}
      ${vm.waiting ? "" : `<div class="row">${lvlChip(vm.level)}</div><p class="small">${esc(vm.allows)}.</p>`}
      <label class="small" for="city">Iloilo City EO 24 s. 2025, automatic suspension at</label>
      <select id="city" ${isCoord ? "" : "disabled"}>${CITY.autoOptions.map((v) => `<option value="${v}" ${v === store.state.cityAuto ? "selected" : ""}>${v}°C (reported)</option>`).join("")}</select>
      ${vm.city ? `<div class="banner">${esc(vm.city.text)}</div>` : ""}
      <p class="small muted">${EO130.instrument}: ${EO130.status}.</p>
    </section>
    <section class="stack" aria-label="Division map">
      <div class="scene" id="scene"></div>
      <div class="legend">${legendHTML()}</div>
      ${sel ? drawer(sel, vm) : `<p class="small muted">Tap a school for its plan. Every school is also listed under Decisions.</p>`}
    </section>
    <section class="card" aria-label="Status">
      <span class="count ${cd.late ? "late" : ""}">${cd.text}</span>
      ${vm.waiting ? `<p class="muted">No forecast for ${fmtDate(date)} yet.</p>` : `
      <div class="eyebrow">Decisions · ${fmtDate(date)}</div>
      <div class="stat-grid">
        <div class="stat"><b>${dc.official ?? 0}</b><span>Official</span></div>
        <div class="stat"><b>${dc["awaiting-sdo"] ?? 0}</b><span>Awaiting SDO</span></div>
        <div class="stat"><b>${dc.returned ?? 0}</b><span>Returned</span></div>
        <div class="stat"><b>${(dc["stale-forecast"] ?? 0) + (dc["stale-inputs"] ?? 0)}</b><span>Re-confirm</span></div>
        <div class="stat"><b>${dc.none ?? 0}</b><span>No decision</span></div>
        <div class="stat"><b>${dc.overrides ?? 0}</b><span>Overrides</span></div>
      </div>
      <p class="small">8:00 readings: <b>${vm.withReadings}</b> schools · <span class="${vm.conflicts ? "bad" : "ok"}">Rule conflicts: ${vm.conflicts}</span></p>
      <div class="eyebrow">Plans</div>
      <div class="stat-grid">${PLAN_ORDER.filter((t) => vm.tally[t]).map((t) => `<div class="stat"><b>${vm.tally[t]}</b><span><svg class="sym" viewBox="0 0 16 16">${symbolFor(t)}</svg>${PLAN_LABEL[t]}</span></div>`).join("")}</div>
      ${kpi}
      ${!preview && vm.missing.length ? `<details><summary>Chase missing (${vm.missing.length})</summary><ul class="small">${vm.missing.slice(0, 12).map((v) => `<li>${esc(v.name)}: <span class="status ${v.status}">${esc(v.sentence)}</span></li>`).join("")}${vm.missing.length > 12 ? `<li>and ${vm.missing.length - 12} more</li>` : ""}</ul>
        ${copyBtn("chaseCopy", chaseText(vm.missing.map((v) => v.name), date), "Copy reminder")}<p class="small muted">${esc(chaseText(vm.missing.slice(0, 3).map((v) => v.name), date))}…</p></details>` : ""}`}
    </section>
  </div>`;
  mountDivision($("#scene"), vm);
  document.querySelectorAll("[data-date]").forEach((b) => (b.onclick = () => { ui.planDate = b.dataset.date; ui.confirmPublish = false; render(); }));
  if (isCoord) {
    $("#draft").onchange = (e) => guard(() => { store.actions.setDraft(e.target.value); ui.confirmPublish = false; });
    $("#draftStatus").onchange = (e) => guard(() => store.actions.setDraft(store.state.draft.hi, e.target.value));
    $("#prev") && ($("#prev").onchange = (e) => { ui.preview = e.target.checked; render(); });
    $("#publish") && ($("#publish").onclick = () => { if (store.actions.republishImpact(date).stale > 0) { ui.confirmPublish = true; render(); } else guard(() => { store.actions.publishForecast(date); ui.preview = false; }); });
    $("#pubYes") && ($("#pubYes").onclick = () => guard(() => { store.actions.publishForecast(date); ui.confirmPublish = false; ui.preview = false; }));
    $("#pubNo") && ($("#pubNo").onclick = () => { ui.confirmPublish = false; render(); });
    $("#city").onchange = (e) => guard(() => store.actions.setCityThreshold(e.target.value));
  }
}
function drawer(v, vm) {
  const notes = v.buildings.map((b) => `<li>${esc(b.name)} · ${b.rooms} rooms · <span class="flag ${b.flag}">${{ green: "cooler", amber: "typical", red: "hot" }[b.flag]}</span> ${b.emptied ? '<span class="bad">emptied (8:00)</span>' : ""}<br><span class="small muted">${esc(b.note)}</span></li>`).join("");
  return `<div class="card drawer"><div class="row" style="justify-content:space-between"><h2>${esc(v.name)}</h2><a href="#school-${v.slug}">Open school view</a></div>
    <div class="row">${lvlChip(v.level)} ${planChip(v)} ${statusHTML(v)}</div>
    <p class="small">${esc(v.plan.why)}</p>
    ${v.requestSections ? `<p class="small"><b>F2F request:</b> ${v.requestSections} of ${v.plan.assignments.length} sections on 06:00–10:00 / 14:00–18:00.</p>` : ""}
    <details><summary>Building notes (read-only; edited by the school)</summary><ul class="small">${notes}</ul></details></div>`;
}

// ---------- admin: Decisions ----------
function adminDecisions(filterFromRoute) {
  if (!ui.planDate) ui.planDate = tomorrow();
  if (filterFromRoute) ui.filter = filterFromRoute;
  const date = ui.planDate, vm = viewModel(store, { date });
  const isSdo = store.role().kind === "sdo";
  const FILTERS = [["awaiting-sdo", "Awaiting SDO"], ["returned", "Returned"], ["stale", "Re-confirm"], ["none", "No decision"], ["official", "Official"], ["all", "All"]];
  const match = (v) => ui.filter === "all" || v.status === ui.filter || (ui.filter === "stale" && v.status.startsWith("stale"));
  const rows = vm.waiting ? [] : vm.schools.filter(match);
  const narrow = window.innerWidth < 700;
  const actions = (v) => isSdo && v.status === "awaiting-sdo"
    ? `<div class="row"><button class="chip-btn primary" data-approve="${v.id}">Approve</button><input data-note="${v.id}" placeholder="Note (needed to return)" value="${esc(ui.sdoNote[v.id] || "")}" style="min-width:9em;flex:1"><button class="chip-btn" data-return="${v.id}">Return</button></div>`
    : v.status.startsWith("stale") ? `<span class="small muted">Needs the head to re-confirm</span>` : "";
  const cellLess = (v) => (v.decision?.lessProtective ? `<span class="tag" style="color:var(--bad)">less protective</span>` : "");
  const seed = (v) => (v.decision?.system ? ` <span class="tag" style="color:var(--muted)">demo seed</span>` : "");
  const table = narrow
    ? rows.map((v) => `<div class="card"><b>${esc(v.name)}</b>${seed(v)}<div class="row small">Rule now ${lvlChip(v.plan.levels.recommended)} Chosen ${v.decision ? lvlChip(v.decision.level) : "–"} ${cellLess(v)}</div>${v.decision?.reason ? `<p class="small">“${esc(v.decision.reason)}”</p>` : ""}<p class="small">${statusHTML(v)} ${v.decision ? `· ${esc(v.decision.by)} ${fmtTime(v.decision.at)}` : ""}</p>${actions(v)}</div>`).join("")
    : `<div class="tbl"><table><thead><tr><th>School</th><th>Rule now</th><th>Snapshot</th><th>Chosen</th><th></th><th>Reason</th><th>By · time</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((v) => `<tr><td>${esc(v.name)}${seed(v)}</td><td>${v.plan.levels.recommended}</td><td>${v.decision?.recommended ?? "–"}</td><td>${v.decision?.level ?? "–"}</td><td>${cellLess(v)}</td><td class="small">${esc(v.decision?.reason || "")}${v.decision?.sdoNote ? `<br><i>SDO: ${esc(v.decision.sdoNote)}</i>` : ""}</td><td class="small">${v.decision ? `${esc(v.decision.by)} · ${fmtTime(v.decision.at)}` : ""}</td><td>${statusHTML(v)}</td><td>${actions(v)}</td></tr>`).join("")}</tbody></table></div>`;
  $("#main").innerHTML = `${bannerNotices()}${flashHTML()}
    <div class="row" style="justify-content:space-between"><h1>Decisions · ${fmtDate(date)}</h1>
      <div class="row"><button class="chip-btn" data-date="${store.state.today}" aria-pressed="${date === store.state.today}">Today</button><button class="chip-btn" data-date="${tomorrow()}" aria-pressed="${date === tomorrow()}">Tomorrow</button><button id="csv">Download log (CSV)</button></div></div>
    ${!isSdo ? `<div class="banner">Sign-off is for the SDO approver. Use "Switch: SDO" in the header.</div>` : ""}
    <div class="row" role="group" aria-label="Filter">${FILTERS.map(([k, l]) => `<button class="chip-btn" data-filter="${k}" aria-pressed="${ui.filter === k}">${l}</button>`).join("")}</div>
    ${vm.waiting ? `<p class="muted">No forecast for this day.</p>` : rows.length ? table : `<p class="muted">Nothing here.</p>`}`;
  document.querySelectorAll("[data-filter]").forEach((b) => (b.onclick = () => { ui.filter = b.dataset.filter; render(); }));
  document.querySelectorAll("[data-date]").forEach((b) => (b.onclick = () => { ui.planDate = b.dataset.date; render(); }));
  document.querySelectorAll("[data-note]").forEach((i) => (i.oninput = () => (ui.sdoNote[i.dataset.note] = i.value)));
  document.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => guard(() => { const v = vm.schools.find((x) => x.id === b.dataset.approve); store.actions.signOff(date, v.id, v.decision.id, "approved", ui.sdoNote[v.id] || ""); })));
  document.querySelectorAll("[data-return]").forEach((b) => (b.onclick = () => guard(() => { const v = vm.schools.find((x) => x.id === b.dataset.return); store.actions.signOff(date, v.id, v.decision.id, "returned", ui.sdoNote[v.id] || ""); })));
  $("#csv").onclick = () => {
    const d = store.day(date);
    const csv = decisionsCSV(store.schools().map((s) => withDay(s, d)), d.forecast?.hi ?? 0, { forDate: date, forecast: d.forecast || {} });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `presko-decisions-${date}.csv` });
    document.body.append(a); a.click(); a.remove();
  };
}

// ---------- admin: Replay ----------
function adminReplay() {
  if (store.replay) {
    const r = replayViewModel(store.replay);
    $("#main").innerHTML = `<div class="banner replay"><span>REPLAY · ${esc(r.replay.label.replace("Replay ", ""))} · not tomorrow's plan</span><button id="exitReplay">Exit replay</button></div>
      <div class="admin"><section class="card"><div class="eyebrow">What happened</div><p>${esc(r.replay.actual)}</p><p class="small muted">${r.replay.sources.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(", ")}</p>
        <div class="eyebrow">Heat</div><p>PAGASA forecast <b class="mono">${r.hi}°C</b> (news-reported) drives the replay. Computed ${r.raw}°C, calibrated ${r.calibrated}°C (+${CALIBRATION.offset} ±${CALIBRATION.band}), shown for comparison only.</p>${lvlChip(r.level)}</section>
      <section class="stack"><div class="scene" id="scene"></div><div class="legend">${legendHTML()}</div></section>
      <section class="card"><div class="eyebrow">Presko, computed</div>${r.level === "HINGA" ? `<p><b class="mono">${r.tally.request}</b> of ${r.schools.length} schools have cooler rooms that could hold <b class="mono">${fmt(r.requestSections)}</b> sections on shortened hours: grounds for an EO 047-A-style request.</p>` : `<p>${r.tally.stop} of ${r.schools.length} schools: no classes, not even modules.</p>`}
        <p class="small ${r.conflicts ? "bad" : "ok"}">Rule conflicts: ${r.conflicts}</p>
        <p class="small muted">${esc(r.replay.precedent)} Today's rules (DM 064 s. 2026) and today's illustrative buildings applied to that day's heat. On 1 April 2024 the city's EO 047 applied; DM 064 and EO 24 didn't exist yet. Decisions, sign-off, readings and messages are locked during a replay.</p></section></div>`;
    ui.use3D = ui.use3D && true;
    mountDivision($("#scene"), { ...r, waiting: false });
    $("#exitReplay").onclick = () => { store.actions.exitReplay(); render(); };
    return;
  }
  $("#main").innerHTML = `<h1>Replay</h1><p class="muted">Runs on a separate copy. Nothing is saved, and today's data is untouched.</p>
    <div class="roles">${REPLAYS.map((r) => `<div class="card"><h2>${esc(r.label)}</h2><p class="small">${esc(r.actual)}</p><button class="primary" data-replay="${r.id}">Run replay</button></div>`).join("")}</div>`;
  document.querySelectorAll("[data-replay]").forEach((b) => (b.onclick = () => { store.actions.startReplay(b.dataset.replay); render(); }));
}

// ---------- admin: Rules, Data ----------
function adminRules() {
  $("#main").innerHTML = `<h1>Rules</h1><p class="muted">Read-only. The engine owns these; the page shows them so anyone can check a recommendation.</p>
  <div class="roles">
  <div class="card"><h2>4H levels (DepEd DM 064 s. 2026) <span class="tag" style="color:var(--warn)">news-reported</span></h2><div class="tbl"><table><tbody>${FOURH.map((l) => `<tr><td>${lvlChip(l.id)}</td><td>${l.range}</td><td class="small">${l.allows}</td></tr>`).join("")}</tbody></table></div>
    <p class="small">The school head decides, with the SDO, and informs the SDS (DM 064 s. 2026; DO 22 s. 2024). Legal chain: EO 130 s. 2026 (${EO130.status}) → DO 22 s. 2024 → DM 064 s. 2026. City: EO 24 s. 2025 (40°C optional; automatic reported as 40, 41 and 42°C).</p>
    <p class="small"><b>Assumption:</b> with an 8:00 indoor reading, a building takes whichever level is worse, the forecast's or the reading's. The memo text that would settle this hasn't been read.</p></div>
  <div class="card"><h2>Building features</h2><div class="tbl"><table><tbody>${FEATURE_KEYS.map((k) => `<tr><td>${FEATURES[k].label}</td><td class="mono">${FEATURES[k].points > 0 ? "+" : ""}${FEATURES[k].points}</td></tr>`).join("")}</tbody></table></div>
    <div class="tbl"><table><tbody>${BAND_RULE.map((r) => `<tr><td><span class="flag ${r.band}">${{ green: "cooler", amber: "typical", red: "hot" }[r.band]}</span></td><td class="small">${r.text}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="card"><h2>Plans and data</h2><p class="small">Hinay hours: ${HINAY_SLOTS.map((s) => s.label).join(" and ")}; nobody in class 10:00–14:00.</p><p class="small">F2F request on Hinga days: cooler rooms × 2 slots hold at least half the sections.</p><p class="small">Replay heat: NWS heat index from Open-Meteo, +${CALIBRATION.offset}°C (±${CALIBRATION.band}), ${CALIBRATION.basis}. Never applied to a typed forecast.</p></div>
  </div>`;
}
function adminData() {
  const schools = store.schools(), d = store.day(store.state.today);
  const lab = (p) => (typeof p === "string" ? p : `${p.label} · ${esc(p.by)} ${fmtTime(p.at)}`);
  $("#main").innerHTML = `<h1>Data</h1>
    <div class="card"><p>SDO Iloilo City: <b>${DIVISION_FACTS.publicSchools}</b> public schools, <b>${fmt(DIVISION_FACTS.publicLearners)}</b> learners, <b>${fmt(DIVISION_FACTS.classrooms)}</b> classrooms, ${DIVISION_FACTS.shiftingSchools} on shifting schedules <span class="tag" style="color:var(--ok)">real</span> <span class="small muted">${esc(DIVISION_FACTS.source)}</span></p>
    <p class="small muted">${schools.length} schools mapped from OpenStreetMap (real locations). Saved data lives in this browser only.</p></div>
    <div class="tbl"><table><thead><tr><th>School</th><th>Buildings & notes</th><th>Sections</th><th>Timetable</th><th>8:00 readings today</th></tr></thead><tbody>
    ${schools.map((s) => `<tr><td>${esc(s.name)}</td><td class="small">${lab(s.provenance.buildings)}</td><td class="small">${lab(s.provenance.sections)}</td><td class="small">${lab(s.provenance.timetable)}</td><td>${Object.keys(d.readings[s.id] || {}).length ? '<span class="ok">received</span>' : '<span class="muted">–</span>'}</td></tr>`).join("")}</tbody></table></div>`;
}

// ---------- school: Today ----------
function schoolPage(r) {
  const s = store.bySlug(r.slug);
  if (!s) { $("#main").innerHTML = `<p>Unknown school link.</p>`; return; }
  const role = store.role();
  if (ROLES[role.kind].mode === "school" && role.schoolId !== s.id) store.actions.setRole(role.kind, { name: role.name, schoolId: s.id });
  if (r.page === "school-morning") return schoolMorning(s);
  if (r.page === "school-setup") return schoolSetup(s);
  return schoolToday(s);
}
function schoolToday(s) {
  const role = store.role(), isHead = role.kind === "head";
  const today = store.state.today, tmr = tomorrow();
  const vmT = viewModel(store, { date: today }), vmN = viewModel(store, { date: tmr });
  const vT = !vmT.waiting && vmT.schools.find((v) => v.id === s.id);
  const v = !vmN.waiting && vmN.schools.find((x) => x.id === s.id);
  const showToday = vT && (vT.status !== "official" || (vT.correction && vT.correction.from !== vT.correction.to) || (vT.morning?.levelChange && vT.status === "none"));
  const cd = countdown();
  const todayCard = showToday ? `<section class="card dated" aria-label="Today"><div class="eyebrow">Today, ${fmtDate(today)}</div>
      <div class="banner ${vT.status === "official" ? "" : "bad"}">${esc(vT.status === "none" && vT.morning?.levelChange ? `8:00 readings call for ${vT.level}` : vT.sentence)}</div>
      ${isHead ? decisionButtons(vT, today, vmT, "morning") : `<p class="small">The school head re-confirms today's level.</p>`}
      ${vT.status === "official" && vT.morning?.levelChange ? messageBlock(vT, vmT, today, morningMessage(vT, vmT, ui.lang, s.name), "mmsg") : ""}</section>` : "";
  if (!v) {
    $("#main").innerHTML = `${bannerNotices()}${flashHTML()}<div class="school"><div class="stack">${todayCard}<section class="card dated"><div class="eyebrow">Plan for tomorrow, ${fmtDate(tmr)}</div><h2>${esc(s.name)}</h2><p>Waiting for the SDO's forecast for ${fmtDate(tmr)}.</p><p class="small muted">You'll record tomorrow's level here once the coordinator publishes it.</p></div></div>`;
    wireDecisions(s, vmT, today);
    return;
  }
  const proposedNote = v.proposed ? `<p class="small">Your proposed plan (${v.decision.level}) isn't in force until the SDO approves it; the rule level ${v.plan.levels.recommended} applies meanwhile.</p>` : "";
  $("#main").innerHTML = `${bannerNotices()}${flashHTML()}<div class="school"><div class="stack">
    ${todayCard}
    <section class="card dated" aria-label="Plan for tomorrow">
      <div class="row" style="justify-content:space-between"><div class="eyebrow">Plan for tomorrow, ${fmtDate(tmr)}</div><span class="count ${cd.late ? "late" : ""}">${cd.text}</span></div>
      <h2>${esc(s.name)}</h2>
      <div class="row">${lvlChip(v.level)} ${planChip(v)}</div>
      ${isHead ? decisionButtons(v, tmr, vmN, "evening") : `<p class="small">${statusHTML(v)} · the school head records tomorrow's decision.</p>`}
      ${proposedNote}
      <h3>Message to parents</h3>
      ${messageBlock(v, vmN, tmr, null, "msg")}
      ${v.correction && v.correction.from !== v.correction.to ? (v.correction.ready ? `<h3>Correction</h3>${messageBlock(v, vmN, tmr, correctionMessage(v, vmN, ui.lang, s.name), "cmsg")}` : `<div class="banner bad">Parents were told ${v.correction.from}. A correction is ready after you re-confirm.</div>`) : ""}
      <p class="small">${esc(v.plan.why)}</p>
      ${v.plan.flags.map((f) => `<p class="small">⚑ ${esc(f)}</p>`).join("")}
      <p class="small ${v.problems.length ? "bad" : "ok"}">Rule conflicts: ${v.problems.length}</p>
      ${v.plan.checkFirst.length ? `<p class="small"><b>Rooms to check first at 8:00:</b> ${[...new Set(v.plan.checkFirst.map((id) => v.plan.rooms.find((r) => r.id === id).name.split(" · ")[0]))].join(", ")} (${v.plan.checkFirst.length} hot rooms)</p>` : ""}
      ${isHead ? `<label class="row small"><input type="checkbox" id="water" ${v.water ? "" : "checked"} style="min-height:auto"> No water supply tomorrow (forces at least HINGA)</label>` : ""}
      <details><summary>${v.plan.request ? `Draft F2F request (${v.requestSections} of ${v.plan.request.length} sections)` : `Section plan (${v.plan.assignments.length} sections)`}</summary>${sectionTable(v)}</details>
    </section></div>
    <section class="stack" aria-label="School view">
      <div class="row"><button class="chip-btn" id="t3d">${ui.use3D ? "Show 2D" : "Show 3D"}</button><span class="small muted">Rooms by flag; greyed buildings were emptied by an 8:00 reading.</span></div>
      <div class="scene" id="scene" style="min-height:240px"></div>
      <div class="card"><div class="eyebrow">Class hours tomorrow</div>${sunArc(v)}</div>
    </section></div>`;
  mountSchool($("#scene"), v);
  $("#t3d").onclick = () => { ui.use3D = !ui.use3D; render(); };
  wireDecisions(s, vmN, tmr);
  if (vT) wireDecisions(s, vmT, today);
  $("#water") && ($("#water").onchange = (e) => {
    if (e.target.checked && !confirm2("water")) { e.target.checked = false; return; }
    guard(() => store.actions.setWater(tmr, s.id, !e.target.checked));
  });
}
const confirm2 = () => true; // in-page confirmation is the checkbox label itself; confirm() is unavailable in artifacts

function decisionButtons(v, date, vm, kind) {
  const rec = v.plan.levels.recommended, st = v.status;
  const id = `${date}`;
  const near = new Date().getHours() * 60 + new Date().getMinutes() >= 16 * 60 + 45;
  let primary;
  if (st === "none") primary = `<button class="primary" data-rec="${id}" data-level="${rec}">Record ${rec} (recommended)</button>`;
  else if (st === "stale-forecast" || st === "stale-inputs") primary = `<button class="primary" data-rec="${id}" data-level="${rec}">Re-confirm ${rec}</button>`;
  else if (st === "returned") primary = `<div class="banner bad">SDO note: “${esc(v.decision.sdoNote)}”</div><button class="primary" data-other="${id}">Revise decision</button>`;
  else if (st === "awaiting-sdo") primary = near ? `<button class="primary" data-rec="${id}" data-level="${rec}" data-replace="1">Send rule-level message now</button><p class="small">This replaces your ${v.decision.level} request with ${rec} (the rule level), official at once.</p>` : `<p class="small">Waiting for the SDO. From 16:45 you can send the rule-level message instead.</p>`;
  else primary = `<p class="small ok">Official: ${v.decision.level}, by ${esc(v.decision.by)} at ${fmtTime(v.decision.at)}.</p>`;
  const other = ui.chooseOther === id ? `<div class="card" style="background:var(--sunk)"><label class="small" for="lv-${id}">Level</label><select id="lv-${id}">${FOURH.map((l) => `<option value="${l.id}" ${l.id === rec ? "selected" : ""}>${l.id} ${l.range}${l.id === rec ? " (recommended)" : ""}</option>`).join("")}</select>
      <label class="small" for="rs-${id}">Reason (required for a different level)</label><textarea id="rs-${id}"></textarea><button class="primary" data-save="${id}" data-kind="${kind}">Record decision</button></div>` : "";
  return `<div class="stack"><p>${statusHTML(v)}</p>${primary}${st !== "official" && st !== "returned" ? `<button class="ghost chip-btn" data-other="${id}">Choose a different level</button>` : ""}${other}</div>`;
}
function wireDecisions(s, vm, date) {
  document.querySelectorAll(`[data-rec="${date}"]`).forEach((b) => (b.onclick = () => guard(() => { store.actions.recordDecision(date, s.id, { level: b.dataset.level }); ui.chooseOther = false; })));
  document.querySelectorAll(`[data-other="${date}"]`).forEach((b) => (b.onclick = () => { ui.chooseOther = ui.chooseOther === date ? false : date; render(); }));
  document.querySelectorAll(`[data-save="${date}"]`).forEach((b) => (b.onclick = () => guard(() => { store.actions.recordDecision(date, s.id, { level: $(`#lv-${date}`).value, reason: $(`#rs-${date}`).value }); ui.chooseOther = false; })));
  document.querySelectorAll(`[data-sent="${date}"]`).forEach((b) => (b.onclick = () => guard(() => store.actions.markSent(date, s.id, b.dataset.channel))));
  document.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { ui.lang = b.dataset.lang; render(); }));
}
function messageBlock(v, vm, date, overrideText, key) {
  const official = v.status === "official";
  const name = store.school(v.id).name;
  const text = overrideText || parentMessage(v, vm, ui.lang, { official, schoolName: name });
  const isHead = store.role().kind === "head";
  const sent = v.sent.filter((x) => x.level === v.level);
  return `<div class="row" role="group" aria-label="Language">${[["en", "English"], ["tl", "Filipino"], ["hil", "Hiligaynon"]].map(([k, l]) => `<button class="chip-btn" data-lang="${k}" aria-pressed="${ui.lang === k}">${l}</button>`).join("")}</div>
    <div class="msg ${official ? "official" : "draft"}" id="${key}-text">${esc(text)}</div>
    ${official ? `<div class="row">${copyBtn(`${key}-copy`, text)}<span class="small muted">then mark as sent:</span>${isHead ? ["FB page", "Group chat", "Radio"].map((c) => `<button class="chip-btn" data-sent="${date}" data-channel="${c}">${c}${sent.some((x) => x.channel === c) ? " ✓" : ""}</button>`).join("") : ""}</div>`
      : `<p class="small bad">Draft: record the decision to make this official. Copy is off for drafts.</p>`}
    ${ui.lang !== "en" ? `<p class="small muted">Fixed template; have a native speaker check the wording.</p>` : ""}`;
}
function sectionTable(v) {
  const list = v.plan.request || v.plan.assignments;
  return `<div class="tbl"><table><thead><tr><th>Section</th><th>Room</th><th>Time</th></tr></thead><tbody>${list.map((a) => { const sec = store.school(v.id).sections.find((x) => x.id === a.section); const room = v.plan.rooms.find((r) => r.id === a.room); const slot = v.litSlots.find((x) => x.id === a.slot); return `<tr><td>${esc(sec?.name)}</td><td>${a.slot === "home" ? "Home-based" : a.slot === "none" ? "No classes" : esc(room?.name)}</td><td class="mono">${slot?.label || "–"}</td></tr>`; }).join("")}</tbody></table></div>`;
}

// ---------- school: Morning check ----------
function schoolMorning(s) {
  const role = store.role(), can = ["teacher", "head"].includes(role.kind);
  const today = store.state.today, vm = viewModel(store, { date: today });
  const v = !vm.waiting && vm.schools.find((x) => x.id === s.id);
  if (!v) { $("#main").innerHTML = `<h1>Morning check · ${fmtDate(today)}</h1><p class="muted">No forecast was published for today, so there's nothing to check against.</p>`; return; }
  const m = v.morning;
  const outcome = m.levelChange ? `<div class="banner bad">Readings call for <b>${m.levelChange.to}</b> (was ${m.levelChange.from}). The school head must re-confirm on Today before the morning update is official.</div>
      ${role.kind === "teacher" ? `<p class="small">${copyBtn("tellHead", tellHeadText(s.name, m.levelChange.to), "Copy note for the head")} <span>${esc(tellHeadText(s.name, m.levelChange.to))}</span></p>` : `<a href="#school-${s.slug}">Go to Today to re-confirm</a>`}`
    : m.emptied.length ? `<div class="banner">Room move for staff (not a parent message): no classes in ${m.emptied.map((id) => esc(v.buildings.find((b) => b.id === id).name)).join(", ")} today. The level stays ${v.level}.</div>`
    : `<div class="banner">Plan unchanged.</div>`;
  $("#main").innerHTML = `${flashHTML()}<div class="school"><div class="stack"><section class="card dated"><div class="eyebrow">Morning check, ${fmtDate(today)}</div><h2>${esc(s.name)}</h2>
    <div class="row">${lvlChip(v.level)} ${planChip(v)}</div>
    ${v.plan.checkFirst.length ? `<p class="small"><b>Check first:</b> ${[...new Set(v.plan.checkFirst.map((id) => v.plan.rooms.find((r) => r.id === id).name.split(" · ")[0]))].join(", ")}</p>` : ""}
    ${v.buildings.map((b) => `<div class="bldg"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><span class="flag ${b.flag}">${{ green: "cooler", amber: "typical", red: "hot" }[b.flag]}</span></div>
      <label class="row small">Indoor heat index at 8:00 <input type="number" step="0.1" min="20" max="55" inputmode="decimal" data-reading="${b.id}" value="${b.reading ?? ""}" ${can ? "" : "disabled"} style="width:7em"> °C
      ${b.reading != null ? `<span class="${b.emptied ? "bad" : "muted"}">→ ${b.buildingLevel}${b.emptied ? ", no classes here" : ""}</span>` : `<span class="muted">not read</span>`}</label></div>`).join("")}
    <p class="small muted">Assumption: a building takes whichever level is worse, the forecast's or its reading's.</p>
    ${outcome}</section></div>
    <section class="stack"><div class="scene" id="scene" style="min-height:240px"></div></section></div>`;
  mountSchool($("#scene"), v);
  document.querySelectorAll("[data-reading]").forEach((i) => (i.onchange = () => guard(() => store.actions.setReading(today, s.id, i.dataset.reading, i.value.trim()))));
}

// ---------- school: Setup ----------
let sample = null;
(window.claude?.use ? window.claude.use("sample").catch(() => null) : Promise.resolve(null)).then((x) => (sample = x));
function schoolSetup(s) {
  const role = store.role(), can = ["custodian", "head"].includes(role.kind);
  const lab = (p) => (typeof p === "string" ? `<span class="tag" style="color:var(--muted)">${p}</span>` : `<span class="tag" style="color:var(--ok)">entered · ${esc(p.by)}</span>`);
  $("#main").innerHTML = `${flashHTML()}<h1>Setup · ${esc(s.name)}</h1>${can ? "" : `<div class="banner">Setup is for the property custodian or the school head.</div>`}
    <section class="card"><div class="row" style="justify-content:space-between"><h2>Buildings</h2>${lab(s.provenance.buildings)}</div>
    ${s.buildings.map((b) => `<div class="bldg"><div class="row" style="justify-content:space-between"><b>${esc(b.name)} · ${b.rooms} rooms</b><span class="small muted">${b.source === "claude" ? "Read by Claude" : b.source === "keywords" ? "Keyword reading (no AI)" : "Read once, cached"}</span></div>
      <label class="small" for="note-${b.id}">Note</label><textarea id="note-${b.id}" ${can ? "" : "disabled"}>${esc(b.note)}</textarea>
      <div class="row"><button data-reread="${b.id}" ${can ? "" : "disabled"}>${sample ? "Re-read with Claude" : "Re-read note"}</button></div>
      <div class="chips">${FEATURE_KEYS.filter((k) => b.features[k]).map((k) => `<span class="chip ${FEATURES[k].points > 0 ? "plus" : "minus"}">${FEATURES[k].label} ${FEATURES[k].points > 0 ? "+" : ""}${FEATURES[k].points}</span>`).join("") || '<span class="chip">no features</span>'}</div>
      ${b.evidence ? `<p class="small muted">Evidence: ${esc(b.evidence)}</p>` : ""}</div>`).join("")}</section>
    <section class="card"><div class="row" style="justify-content:space-between"><h2>Usual timetable</h2>${lab(s.provenance.timetable)}</div>
      <div class="row"><label class="row small"><input type="radio" name="shift" value="1" ${s.timetable.shifts.length === 1 ? "checked" : ""} ${can ? "" : "disabled"} style="min-height:auto"> Single shift</label><label class="row small"><input type="radio" name="shift" value="2" ${s.timetable.shifts.length === 2 ? "checked" : ""} ${can ? "" : "disabled"} style="min-height:auto"> Double shift</label></div>
      ${s.timetable.shifts.map(([a, b], k) => `<div class="row small">Shift ${k + 1} <input type="time" data-tt="${k}-0" value="${hh(a)}" ${can ? "" : "disabled"}> to <input type="time" data-tt="${k}-1" value="${hh(b)}" ${can ? "" : "disabled"}></div>`).join("")}
      <p class="small muted">Hinay days always use 06:00–10:00 and 14:00–18:00.</p></section>
    <section class="card"><div class="row" style="justify-content:space-between"><h2>Sections</h2>${lab(s.provenance.sections)}</div><p class="small">${s.sections.length} sections, ${fmt(s.sections.reduce((a, x) => a + x.learners, 0))} learners (illustrative).</p></section>`;
  document.querySelectorAll("[data-reread]").forEach((b) => (b.onclick = () => reread(s, b.dataset.reread)));
  document.querySelectorAll("input[name=shift]").forEach((r) => (r.onchange = () => guard(() => store.actions.editSetup(s.id, { timetable: { shifts: r.value === "2" ? [[6, 12], [12, 18]] : [[7.5, 15.5]] } }))));
  document.querySelectorAll("[data-tt]").forEach((i) => (i.onchange = () => guard(() => { const [k, j] = i.dataset.tt.split("-").map(Number); const sh = s.timetable.shifts.map((x) => [...x]); const [H, M] = i.value.split(":").map(Number); sh[k][j] = H + M / 60; store.actions.editSetup(s.id, { timetable: { shifts: sh } }); })));
}
const hh = (h) => `${String(Math.floor(h + 1e-6)).padStart(2, "0")}:${String(Math.round((h - Math.floor(h + 1e-6)) * 60)).padStart(2, "0")}`;
async function reread(s, bid) {
  const note = $(`#note-${bid}`).value.trim();
  if (!sample) return guard(() => store.actions.setBuildingNote(s.id, bid, note, { features: keywordFeatures(note), source: "keywords" }));
  try {
    const prompt = `You read short notes about school buildings in the Philippines and say which physical features are present. Do not guess temperatures.\nNote: """${note}"""\nReply with only a JSON object with these boolean keys: ${FEATURE_KEYS.join(", ")}; plus "evidence": a short string quoting the words that support each true key.`;
    const out = await Promise.race([sample.json(prompt, { modelTier: "quick" }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))]);
    const f = Object.fromEntries(FEATURE_KEYS.map((k) => [k, out?.[k] === true]));
    if (f.roof_no_ceiling) f.ceiling_or_insulated = false;
    guard(() => store.actions.setBuildingNote(s.id, bid, note, { features: f, source: "claude", evidence: String(out?.evidence || "").slice(0, 300) }));
  } catch {
    guard(() => store.actions.setBuildingNote(s.id, bid, note, { features: keywordFeatures(note), source: "keywords", evidence: "Claude unavailable; keyword reading used." }));
  }
}

// ---------- start, demo ----------
function startPage() {
  const p = PANDAC();
  $("#main").innerHTML = `<div class="start"><h1>Presko: tomorrow's 4H level for every school</h1>
    <p class="muted">Schools Division of Iloilo City. Pick a role to try the prototype. Building data is illustrative; school locations and the rules are real or news-reported.</p>
    <div class="roles">
      <button data-role="coordinator"><b>DRRM coordinator</b><span class="small muted">Publish the forecast, watch the division</span></button>
      <button data-role="sdo"><b>SDO approver</b><span class="small muted">Approve or return decisions</span></button>
      <button data-role="head"><b>School head, Pandac ES</b><span class="small muted">Record tomorrow's level, send the message</span></button>
      <button data-role="teacher"><b>Teacher, Pandac ES</b><span class="small muted">8:00 indoor readings</span></button>
      <button data-role="custodian"><b>Custodian, Pandac ES</b><span class="small muted">Buildings, notes, timetable</span></button>
    </div><p class="small"><a href="#demo">Demo settings and reset</a> · <a href="../index.html">Classic desk</a> · <a href="../data-flow.html">Data flow</a></p></div>`;
  document.querySelectorAll("[data-role]").forEach((b) => (b.onclick = () => { $("#rolePick").value = b.dataset.role; $("#rolePick").dispatchEvent(new Event("change")); }));
  void p;
}
function demoPage() {
  $("#main").innerHTML = `<div class="start"><h1>Demo settings</h1>
    <div class="card"><label for="today">Operating day (today)</label><input type="date" id="today" value="${store.state.today}">
      <p class="small muted">Tomorrow is ${fmtDate(tomorrow())}.</p></div>
    <div class="card"><h2>Demo reset</h2><p class="small">Clears saved data and loads the scripted state: a 38°C draft for tomorrow, not yet published. Publishing it at 38°C seeds one override awaiting the SDO (Jibao-an ES) and 3 official decisions, all tagged "demo seed".</p><button class="primary" id="reset">Demo reset</button></div>
    <div class="card"><h2>Script (about 1:50)</h2><ol class="small"><li>Coordinator: Publish 38°C.</li><li>Switch: Pandac head → Record HINGA → Copy → Mark as sent.</li><li>Switch: SDO → approve Jibao-an.</li><li>Pandac custodian: Setup → edit Building A note → re-read.</li><li>Replay 1 April 2024.</li><li>Coordinator: Preview draft 44°C (not published).</li></ol></div></div>`;
  $("#today").onchange = (e) => guard(() => store.actions.setToday(e.target.value));
  $("#reset").onclick = () => { store.actions.demoReset(); store.actions.setRole("coordinator", { name: "R. Dela Cruz (DRRM)" }); ui.planDate = null; ui.selected = PANDAC().id; ui.preview = false; go("admin"); };
}

// ---------- render ----------
function render() {
  rendering = true;
  try { renderInner(); } finally { rendering = false; }
}
function renderInner() {
  const r = route();
  const mode = ROLES[store.role().kind].mode;
  if (store.replay && r.page !== "admin-replay") store.actions.exitReplay();
  if (r.page.startsWith("admin") && mode !== "admin") store.actions.setRole("coordinator", { name: "R. Dela Cruz (DRRM)" });
  if (r.page.startsWith("school") && mode !== "school") { const s = store.bySlug(r.slug); if (s) store.actions.setRole("head", { name: "Ma. Santos", schoolId: s.id }); }
  renderHeader(r);
  if (!["admin", "admin-replay", "school-today", "school-morning"].includes(r.page)) disposeScene();
  if (r.page === "admin") adminDivision();
  else if (r.page.startsWith("admin-decisions")) adminDecisions(r.page === "admin-decisions-awaiting" ? "awaiting-sdo" : null);
  else if (r.page === "admin-replay") adminReplay();
  else if (r.page === "admin-rules") adminRules();
  else if (r.page === "admin-data") adminData();
  else if (r.page.startsWith("school-")) schoolPage(r);
  else if (r.page === "demo") demoPage();
  else startPage();
  window.__presko = { store, ui, viewModel };
}
addEventListener("hashchange", () => { ui.flash = ""; ui.chooseOther = false; disposeScene(); render(); });
// Re-render after every store change, batched so actions called during a render can't recurse.
let rendering = false, queued = false;
store.subscribe(() => { if (rendering || queued) return; queued = true; queueMicrotask(() => { queued = false; render(); }); });
setInterval(() => document.querySelectorAll(".count").forEach((el) => { const c = countdown(); el.textContent = c.text; el.classList.toggle("late", c.late); }), 30000);
if (!store.state.days[tomorrow()]) ui.selected = PANDAC().id;
render();
