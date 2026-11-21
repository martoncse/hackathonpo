// Presko web app UI: router, header, admin and school screens. Reads only the view model; writes only via store actions.
import { createStore, ROLES, addDays, AuthError } from "./store.js";
import { viewModel, LEVEL_TEXT, updatesFor, setupProgress } from "./selectors.js";
import { ACCOUNTS, browserStores } from "./accounts.js";
import { replayPage, stopReplay } from "./replay.js";
import { renderDivision2D, renderSchool2D, legendHTML, sunArc, PLAN_LABEL, PLAN_ORDER } from "./scenes.js";
import { prefers3D, loadThree, division3D, school3D } from "./scene3d.js";
import { parentMessage, correctionMessage, morningMessage, chaseText, chaseLine, tellHeadText, sdoNoteText, sitrepText } from "./messages.js";
import { FOURH, FEATURES, FEATURE_KEYS, CITY, DIVISION_FACTS, decisionsCSV, withDay, keywordFeatures, band } from "../engine.js";

let storage = null;
try { storage = window.localStorage; storage.getItem("x"); } catch { storage = null; }
const sessionStores = browserStores();
const store = createStore({ storage, sessionStores });
// Nothing published for today or tomorrow on this device: start from a realistic working day.
if (!store.day(store.state.today).forecast && !store.day(addDays(store.state.today, 1)).forecast) store.seedActivity();
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Math.round(n).toLocaleString("en");
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "short", day: "numeric", month: "short" }); };
const ui = { planDate: null, selected: null, preview: false, use3D: prefers3D(), lang: "en", filter: "all", confirmPublish: false, scene: null, sceneKind: null, flash: "", sdoNote: {}, chooseOther: false,
  authError: "", authEmail: "", signinNote: "", rereadMsg: "", savedAt: null };
/** Clears per-person screen state (on sign-in, sign-out and account switch) so nothing carries over between accounts. */
function resetUi() {
  Object.assign(ui, { planDate: null, selected: null, preview: false, lang: "en", filter: "all", confirmPublish: false, flash: "", sdoNote: {}, chooseOther: false, rereadMsg: "", savedAt: null });
}
const shortName = (n) => n.replace(/ Elementary School$/, " ES").replace(/ National High School$/, " NHS").replace(/ High School$/, " HS");
const initials = (n) => n.replace(/\(.*\)/, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
function toast(msg) {
  const el = document.getElementById("sr-status");
  if (!el || !msg) return;
  el.textContent = msg;
  clearTimeout(toast.t); toast.t = setTimeout(() => (el.textContent = ""), 4500);
}
const tomorrow = () => addDays(store.state.today, 1);

// ---------- router ----------
function route(hash = location.hash) {
  const h = (hash || "#start").replace(/^#/, "") || "start";
  if (h.startsWith("school-")) {
    let rest = h.slice(7), sub = "today";
    for (const s of ["morning", "setup"]) if (rest.endsWith(`-${s}`)) { sub = s; rest = rest.slice(0, -(s.length + 1)); }
    return { page: `school-${sub}`, slug: rest };
  }
  return { page: h };
}
const go = (hash) => { if (location.hash === `#${hash}`) render(); else location.hash = hash; };
const ADMIN_PAGES = ["admin", "admin-decisions", "admin-decisions-awaiting", "admin-data"];

/** Where each role lands after sign-in (journey review §1.4). */
function landing(role) {
  if (!role) return "start";
  if (role.kind === "coordinator") return "admin";
  if (role.kind === "sdo") return "admin-decisions-awaiting";
  const s = store.school(role.schoolId);
  if (role.kind === "teacher") { const h = new Date().getHours(); return h >= 5 && h < 12 ? `school-${s.slug}-morning` : `school-${s.slug}`; }
  if (role.kind === "custodian") return `school-${s.slug}-setup`;
  return `school-${s.slug}`;
}
/**
 * Route guard. The URL only navigates; it never changes who you are.
 * Returns { ok, readOnly?, reason?, school? }. Reasons: signed-out, admin-only, wrong-school, unknown-school, unknown-page.
 */
function allowed(r, role) {
  if (r.page === "start" || r.page === "replay") return { ok: true };
  const isAdmin = r.page.startsWith("admin"), isSchool = r.page.startsWith("school-");
  if (isAdmin && !ADMIN_PAGES.includes(r.page)) return { ok: false, reason: "unknown-page" };
  if (!isAdmin && !isSchool) return { ok: false, reason: "unknown-page" };
  const school = isSchool ? store.bySlug(r.slug) : null;
  if (!role) return { ok: false, reason: "signed-out", school };
  const mode = ROLES[role.kind].mode;
  if (isAdmin) return mode === "admin" ? { ok: true } : { ok: false, reason: "admin-only" };
  if (!school) return { ok: false, reason: "unknown-school" };
  if (mode === "admin") return { ok: true, readOnly: true, school };
  return school.id === role.schoolId ? { ok: true, school } : { ok: false, reason: "wrong-school", school };
}
const NEXT_KEY = "presko:next";
const setNext = (h) => { try { sessionStores.session?.setItem(NEXT_KEY, h); } catch {} };
const takeNext = () => { let h = null; try { h = sessionStores.session?.getItem(NEXT_KEY) || null; sessionStores.session?.removeItem(NEXT_KEY); } catch {} return h; };
const peekNext = () => { try { return sessionStores.session?.getItem(NEXT_KEY) || null; } catch { return null; } };

// ---------- sign in / out (every path goes through store.actions.signIn) ----------
function doSignIn(email, pin, remember) {
  let a;
  try { a = store.actions.signIn(email, pin, { remember }); }
  catch (e) {
    if (!(e instanceof AuthError)) throw e;
    ui.authError = `${e.message} Check them and try again.`; ui.authEmail = String(email || "").trim();
    render();
    queueMicrotask(() => $("#pin")?.focus());
    return;
  }
  resetUi();
  ui.authError = ""; ui.authEmail = ""; ui.signinNote = "";
  const next = takeNext(), role = store.role();
  const g = next ? allowed(route(`#${next}`), role) : null;
  toast(g && !g.ok ? `Signed in as ${a.name}. The link you opened ${g.school ? `is for ${g.school.name}` : "isn't for your account"}, so here is your own page.` : `Signed in as ${a.name}.`);
  go(g?.ok ? next : landing(role));
}
function doSignOut(note = "Signed out.") {
  store.actions.signOut();
  disposeScene(); resetUi();
  takeNext();
  ui.signinNote = note;
  toast(note);
  go("start");
}
// ---------- clock ----------
function countdown() {
  const now = new Date(), end = new Date(now); end.setHours(17, 0, 0, 0);
  const ms = end - now;
  if (ms <= 0) return { text: "Past 17:00", late: true };
  const m = Math.floor(ms / 60000);
  return { text: `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m to 17:00`, late: false, soon: m <= 15 };
}

// ---------- header ----------
function tabsFor(role) {
  if (!role) return [];
  const awaiting = viewModel(store, { date: tomorrow() }).decisions?.["awaiting-sdo"] ?? 0;
  const dec = [role.kind === "sdo" ? "admin-decisions-awaiting" : "admin-decisions", `Decisions${awaiting ? ` <span class="badge" aria-label="${awaiting} awaiting">${awaiting}</span>` : ""}`];
  if (role.kind === "coordinator") return [["admin", "Division"], dec, ["admin-data", "Schools"]];
  if (role.kind === "sdo") return [dec, ["admin", "Division"]];
  const s = store.school(role.schoolId);
  const T = [`school-${s.slug}`, "Today"], M = [`school-${s.slug}-morning`, "Morning check"], S = [`school-${s.slug}-setup`, "Setup"];
  if (role.kind === "teacher") return [M, [T[0], "Today (read-only)"]];
  if (role.kind === "custodian") return [S, [T[0], "Today (read-only)"]];
  return [T, M, S];
}
function renderHeader(r) {
  const role = store.role();
  const word = `<a class="wordmark" href="#start" aria-label="Presko, home"><i><span></span></i><b>Presko</b></a>`;
  if (!role) {
    $("#hdr").innerHTML = `${word}<span class="spacer"></span>${r.page === "replay" ? `<a class="chip-btn linkbtn" href="#start">Sign in</a>` : ""}`;
    $("#hdr2").innerHTML = ""; $("#hdr2").hidden = true;
    document.title = r.page === "replay" ? "Presko · Heat replay" : "Presko · Sign in";
    return;
  }
  const mode = ROLES[role.kind].mode;
  const school = mode === "school" ? store.school(role.schoolId) : null;
  const f = store.day(tomorrow()).forecast;
  const cd = countdown();
  const morning = r.page === "school-morning";
  const label = ROLES[role.kind].label;
  const since = store.session?.at ? fmtTime(store.session.at) : "";
  const where = store.session?.remember === false ? "in this tab" : "on this phone";
  const cur = location.hash.slice(1) || "start";
  $("#hdr").innerHTML = `${word}
    <span class="ctx" title="${esc(role.name)} · ${esc(label)}${school ? ` · ${esc(school.name)}` : ""}">${esc(role.name)} · ${esc(label)}${school ? ` · ${schoolA(school, shortName(school.name))}` : ""}</span>
    <span class="spacer"></span>
    <span class="hchip hide-sm">${f ? `${fmtDate(tomorrow())} · ${f.hi}°C ${f.status}` : `${fmtDate(tomorrow())} · no forecast yet`}</span>
    ${morning ? "" : `<span class="count hide-sm ${cd.late ? "late" : ""}" role="timer">${cd.text}</span>`}
    <details class="acct" id="acct"><summary aria-label="Account: ${esc(role.name)}"><span class="initials" aria-hidden="true">${esc(initials(role.name))}</span></summary>
      <div class="acct-menu card"><div><b>${esc(role.name)}</b><div class="small">${esc(label)}${school ? `, ${schoolA(school)}` : ""}</div><div class="small muted">${esc(role.email || "")}</div>${since ? `<div class="small muted">Signed in ${where} since ${since}</div>` : ""}</div>
      <button class="primary" id="signOut">Sign out</button></div></details>`;
  const tabs = tabsFor(role);
  $("#hdr2").hidden = false;
  $("#hdr2").innerHTML = `<nav class="tabs" aria-label="Sections">${tabs.map(([h, l]) => `<a href="#${h}" ${cur === h || (h === "admin-decisions-awaiting" && cur.startsWith("admin-decisions")) ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
  $("#signOut").onclick = () => doSignOut();
  document.title = school ? `Presko · ${shortName(school.name)}` : "Presko · Division";
}

// ---------- shared bits ----------
const lvlChip = (lvl) => `<span class="lvl ${lvl}" style="background:var(--${lvl})">${lvl} <small>${LEVEL_TEXT[lvl].split(" ")[1]}</small></span>`;
const planChip = (v) => `<span class="plan"><svg class="sym" viewBox="0 0 16 16" aria-hidden="true">${symbolFor(v.planType)}</svg>${esc(v.planLabel)}</span>`;
let symbolFor = () => "";
import("./scenes.js").then((m) => { symbolFor = (t) => m.symbol(t, 8, 8, 7); });
/** A school's name, linked to its page whenever the signed-in account may open that page. */
const schoolA = (v, label = v.name) => (v.slug && allowed({ page: "school-today", slug: v.slug }, store.role()).ok ? `<a class="school-link" href="#school-${v.slug}">${esc(label)}</a>` : esc(label));
const statusHTML = (v) => `<span class="status ${v.status}">${esc(v.sentence)}</span>`;
function copyBtn(id, text, label = "Copy") {
  queueMicrotask(() => { const b = document.getElementById(id); if (!b) return; b.onclick = async () => { try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; } catch { const t = b.nextElementSibling; if (t) { const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r); } b.textContent = "Selected"; } setTimeout(() => (b.textContent = label), 1500); }; });
  return `<button class="chip-btn" id="${id}">${label}</button>`;
}
/** Runs a store action; on success shows `done` (string or function) as a toast, on failure a persistent alert. */
function guard(fn, done) {
  try { const out = fn(); ui.flash = ""; const msg = typeof done === "function" ? done(out) : done; if (msg) toast(msg); return out; }
  catch (e) { ui.flash = e.message; render(); }
}
function shareBtn(id, text, after) {
  if (typeof navigator === "undefined" || !navigator.share) return "";
  queueMicrotask(() => { const b = document.getElementById(id); if (!b) return; b.onclick = async () => { try { await navigator.share({ text }); after?.(); } catch {} }; });
  return `<button class="chip-btn" id="${id}">Share…</button>`;
}
const flashHTML = () => (ui.flash ? `<div class="banner bad" role="alert">${esc(ui.flash)}</div>` : "");
const bannerNotices = () => [
  ...store.notices.splice(0).map((n) => `<div class="banner">${esc(n)}</div>`),
  !store.storageOk || !storage ? `<div class="banner bad">Changes won't be saved in this browser.</div>` : "",
  typeof navigator !== "undefined" && navigator.onLine === false ? `<div class="banner">You're offline. Presko still works on this phone, and your changes stay here.</div>` : "",
].join("");
/** Updates strip: derived from the store, not pushed. */
function updatesHTML() {
  const u = updatesFor(store);
  if (!u.length) return "";
  return `<section class="card updates" aria-label="Updates"><div class="row" style="justify-content:space-between"><div class="eyebrow">Updates</div></div>
    <ul class="small">${u.map((x) => `<li>${x.at ? `<span class="mono muted">${fmtTime(x.at)}</span> ` : ""}<span class="${x.tone}">${esc(x.text)}</span></li>`).join("")}</ul></section>`;
}
const topHTML = () => `${bannerNotices()}${flashHTML()}${updatesHTML()}`;

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
    ? `<p><b class="mono">${vm.tally.request}</b> schools have grounds to ask for face-to-face back: <b class="mono">${fmt(vm.requestSections)}</b> of ${fmt(vm.sections)} sections, in cooler rooms on shortened hours${vm.city?.status === "auto" ? `, <b>subject to the city's suspension order</b>` : ""}.</p>`
    : vm.level === "HINTO" ? `<p>${vm.noClassesAnywhere ? "<b>No classes anywhere</b>, not even modules. Parents get a stay-cool message." : `${vm.tally.stop} schools with no classes.`}</p>`
    : `<p><b class="mono">${vm.keptPct}%</b> of normal face-to-face learner-hours · <b class="mono">${fmt(vm.checkFirst)}</b> hot rooms to check first at 8:00</p>`;
  const dc = vm.decisions || {};
  // Chase list: regular HAYO days need no action; order by what matters at this hour.
  const hr = new Date().getHours() * 60 + new Date().getMinutes();
  const regular = (v) => v.status === "none" && v.plan.levels.recommended === "HAYO" && v.planType === "full";
  const rank = (v) => (hr < 12 * 60 ? (v.status.startsWith("stale") ? 0 : v.status === "none" ? 1 : 2) : hr >= 16 * 60 + 45 ? (v.status === "none" ? 0 : 1) : 0);
  const chase = vm.waiting ? [] : vm.missing.filter((v) => !regular(v)).sort((a, b) => rank(a) - rank(b));
  const regularN = vm.waiting ? 0 : vm.missing.filter(regular).length;
  const sentN = vm.waiting ? 0 : vm.schools.filter((v) => v.sent.some((x) => x.level === v.level)).length;
  $("#main").innerHTML = `${topHTML()}
  ${preview ? `<div class="banner" style="border:2px dashed var(--accent)"><b>Preview, not published.</b> Schools still see ${pub ? `${pub.hi}°C` : "no forecast"}. Only you see this.</div>` : ""}
  <div class="admin">
    <section class="card" aria-label="Forecast">
      <div class="row" role="group" aria-label="Day shown">
        <button class="chip-btn" data-date="${store.state.today}" aria-pressed="${date === store.state.today}">Today ${fmtDate(store.state.today)}</button>
        <button class="chip-btn" data-date="${tomorrow()}" aria-pressed="${date === tomorrow()}">Tomorrow ${fmtDate(tomorrow())}</button>
      </div>
      <div class="eyebrow">PAGASA heat-index forecast for ${fmtDate(date)}</div>
      ${pub ? `<p>Published: <b class="mono">${pub.hi}°C</b> · ${pub.status} · ${fmtTime(pub.publishedAt)}</p>` : `<p class="muted">Not published yet. Schools are waiting.${isCoord ? " Publish by 16:00 so heads have an hour." : ""}</p>`}
      ${isCoord ? `
      <div class="row"><label for="draft" class="small">Draft</label><input id="draft" type="number" step="0.1" min="20" max="60" inputmode="decimal" value="${store.state.draft.hi}" style="width:7em"> <span>°C</span>
        <select id="draftStatus" aria-label="Forecast status"><option value="provisional" ${store.state.draft.status === "provisional" ? "selected" : ""}>Provisional</option><option value="final" ${store.state.draft.status === "final" ? "selected" : ""}>Final (5 p.m. advisory)</option></select></div>
      ${draftDiffers ? `<label class="row small"><input type="checkbox" id="prev" ${ui.preview ? "checked" : ""} style="min-height:auto"> Preview the draft (only you)</label>` : ""}
      ${ui.confirmPublish ? `<div class="banner bad">This marks <b>${impact.stale}</b> recorded decision${impact.stale === 1 ? "" : "s"} "re-confirm"${impact.restored ? ` and restores <b>${impact.restored}</b> made at ${store.state.draft.hi}°C` : ""}. <div class="row" style="margin-top:8px"><button class="primary" id="pubYes">Publish anyway</button><button id="pubNo">Cancel</button></div></div>`
        : `<button class="primary" id="publish" ${pub && !draftDiffers && pub.status === store.state.draft.status ? "disabled" : ""}>Publish to schools</button>`}` : `<p class="small muted">Only the DRRM coordinator publishes the forecast.</p>`}
      ${vm.waiting ? "" : `<div class="row">${lvlChip(vm.level)}</div><p class="small">${esc(vm.allows)}.</p>`}
      <label class="small" for="city">City automatic suspension at</label>
      <select id="city" ${isCoord ? "" : "disabled"}>${CITY.autoOptions.map((v) => `<option value="${v}" ${v === store.state.cityAuto ? "selected" : ""}>${v}°C (reported)</option>`).join("")}</select>
      ${vm.city ? `<div class="banner">${esc(vm.city.text)}</div>` : ""}
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
      ${!preview && chase.length ? `<details><summary>Chase missing (${chase.length})</summary>
        ${regularN ? `<p class="small muted">${regularN} more on a regular day (HAYO, no change to classes): no action needed.</p>` : ""}
        <ul class="small chase">${chase.slice(0, 12).map((v, i) => `<li><span>${schoolA(v)}: <span class="status ${v.status}">${esc(v.sentence)}</span></span> ${copyBtn(`chase-${i}`, chaseLine(v.name, v.sentence, date), "Copy")}</li>`).join("")}${chase.length > 12 ? `<li>and ${chase.length - 12} more (see Decisions)</li>` : ""}</ul>
        <div class="row">${copyBtn("chaseCopy", chaseText(chase.map((v) => v.name), date), "Copy group reminder")}</div><p class="small muted">${esc(chaseText(chase.map((v) => v.name), date, { max: 3 }))}</p></details>`
        : !preview && regularN ? `<p class="small ok">Every school with a change has decided. ${regularN} on a regular day need no action.</p>` : ""}
      ${preview ? "" : `<details><summary>Day summary · situation report</summary>
        <p class="small">Official <b class="mono">${dc.official ?? 0}</b> · no decision <b class="mono">${dc.none ?? 0}</b> · messages marked sent <b class="mono">${sentN}</b> of ${vm.schools.length}</p>
        <div class="msg small" id="sitrep-text">${esc(sitrepText(vm, { sentCount: sentN }))}</div>
        <div class="row">${copyBtn("sitrepCopy", sitrepText(vm, { sentCount: sentN }), "Copy situation report")}</div></details>`}`}
    </section>
  </div>`;
  mountDivision($("#scene"), vm);
  document.querySelectorAll("[data-date]").forEach((b) => (b.onclick = () => { ui.planDate = b.dataset.date; ui.confirmPublish = false; render(); }));
  if (isCoord) {
    $("#draft").onchange = (e) => guard(() => { store.actions.setDraft(e.target.value); ui.confirmPublish = false; });
    $("#draftStatus").onchange = (e) => guard(() => store.actions.setDraft(store.state.draft.hi, e.target.value));
    $("#prev") && ($("#prev").onchange = (e) => { ui.preview = e.target.checked; render(); });
    const published = () => { const f = store.day(date).forecast; return `Published ${f.hi}°C ${f.status} for ${fmtDate(date)} to ${store.schools().length} schools.`; };
    $("#publish") && ($("#publish").onclick = () => { if (store.actions.republishImpact(date).stale > 0) { ui.confirmPublish = true; render(); } else guard(() => { store.actions.publishForecast(date); ui.preview = false; }, published); });
    $("#pubYes") && ($("#pubYes").onclick = () => guard(() => { store.actions.publishForecast(date); ui.confirmPublish = false; ui.preview = false; }, published));
    $("#pubNo") && ($("#pubNo").onclick = () => { ui.confirmPublish = false; render(); });
    $("#city").onchange = (e) => guard(() => store.actions.setCityThreshold(e.target.value));
  }
}
function drawer(v, vm) {
  const notes = v.buildings.map((b) => `<li>${esc(b.name)} · ${b.rooms} rooms · <span class="flag ${b.flag}">${{ green: "cooler", amber: "typical", red: "hot" }[b.flag]}</span> ${b.emptied ? '<span class="bad">emptied (8:00)</span>' : ""}<br><span class="small muted">${esc(b.note)}</span></li>`).join("");
  return `<div class="card drawer"><div class="row" style="justify-content:space-between"><h2>${schoolA(v)}</h2><a href="#school-${v.slug}">Open school view</a></div>
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
  const ORDER = { "awaiting-sdo": 0, returned: 1, "stale-forecast": 2, "stale-inputs": 2, none: 3, official: 4 };
  const rows = vm.waiting ? [] : vm.schools.filter(match).sort((a, b) => (ORDER[a.status] ?? 5) - (ORDER[b.status] ?? 5) || a.name.localeCompare(b.name));
  const narrow = window.innerWidth < 700;
  const actions = (v) => isSdo && v.status === "awaiting-sdo"
    ? `<div class="stack sdo-act"><label class="small" for="note-${v.id}">Note (required to return, optional to approve)</label><input id="note-${v.id}" data-note="${v.id}" value="${esc(ui.sdoNote[v.id] || "")}">
        <div class="row"><button class="chip-btn primary" data-approve="${v.id}">Approve</button><button class="chip-btn" data-return="${v.id}">Return to head</button></div></div>`
    : v.status.startsWith("stale") ? `<span class="small muted">Needs the head to re-confirm</span>` : "";
  const cellLess = (v) => (v.decision?.lessProtective ? `<span class="tag" style="color:var(--bad)">less protective</span>` : "");
  const seed = () => "";
  const table = narrow
    ? rows.map((v) => `<div class="card"><b>${schoolA(v)}</b>${seed(v)}<div class="row small">Rule now ${lvlChip(v.plan.levels.recommended)} Chosen ${v.decision ? lvlChip(v.decision.level) : "–"} ${cellLess(v)}</div>${v.decision?.reason ? `<p class="small">“${esc(v.decision.reason)}”</p>` : ""}<p class="small">${statusHTML(v)} ${v.decision ? `· ${esc(v.decision.by)} ${fmtTime(v.decision.at)}` : ""}</p>${actions(v)}</div>`).join("")
    : `<div class="tbl"><table><thead><tr><th>School</th><th>Rule now</th><th>Snapshot</th><th>Chosen</th><th></th><th>Reason</th><th>By · time</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((v) => `<tr><td>${schoolA(v)}${seed(v)}</td><td>${v.plan.levels.recommended}</td><td>${v.decision?.recommended ?? "–"}</td><td>${v.decision?.level ?? "–"}</td><td>${cellLess(v)}</td><td class="small">${esc(v.decision?.reason || "")}${v.decision?.sdoNote ? `<br><i>SDO: ${esc(v.decision.sdoNote)}</i>` : ""}</td><td class="small">${v.decision ? `${esc(v.decision.by)} · ${fmtTime(v.decision.at)}` : ""}</td><td>${statusHTML(v)}</td><td>${actions(v)}</td></tr>`).join("")}</tbody></table></div>`;
  const empty = ui.filter === "awaiting-sdo" ? (isSdo ? "Nothing awaits you. Requests appear here when a head picks a less protective level than the rule." : "Nothing awaits the SDO approver.")
    : ui.filter === "returned" ? "No decisions returned." : ui.filter === "stale" ? "Nothing to re-confirm." : ui.filter === "none" ? "Every school has recorded a decision." : "Nothing here.";
  $("#main").innerHTML = `${isSdo ? topHTML() : `${bannerNotices()}${flashHTML()}`}
    <div class="row" style="justify-content:space-between"><h1>Decisions · ${fmtDate(date)}</h1>
      <div class="row"><button class="chip-btn" data-date="${store.state.today}" aria-pressed="${date === store.state.today}">Today</button><button class="chip-btn" data-date="${tomorrow()}" aria-pressed="${date === tomorrow()}">Tomorrow</button><button id="csv">Download log (CSV)</button></div></div>
    ${!isSdo ? `<div class="banner">Only the SDO approver signs off. You can follow every decision here.</div>` : ""}
    <div class="row" role="group" aria-label="Filter">${FILTERS.map(([k, l]) => `<button class="chip-btn" data-filter="${k}" aria-pressed="${ui.filter === k}">${l}</button>`).join("")}</div>
    ${vm.waiting ? `<p class="muted">No forecast for ${fmtDate(date)} yet, so there are no decisions.</p>` : rows.length ? table : `<p class="muted">${empty}</p>`}`;
  document.querySelectorAll("[data-filter]").forEach((b) => (b.onclick = () => { ui.filter = b.dataset.filter; render(); }));
  document.querySelectorAll("[data-date]").forEach((b) => (b.onclick = () => { ui.planDate = b.dataset.date; render(); }));
  document.querySelectorAll("[data-note]").forEach((i) => (i.oninput = () => (ui.sdoNote[i.dataset.note] = i.value)));
  document.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => guard(() => { const v = vm.schools.find((x) => x.id === b.dataset.approve); store.actions.signOff(date, v.id, v.decision.id, "approved", ui.sdoNote[v.id] || ""); delete ui.sdoNote[v.id]; return v; }, (v) => `Approved ${v.decision.level} for ${v.name}. It is official now.`)));
  document.querySelectorAll("[data-return]").forEach((b) => (b.onclick = () => guard(() => { const v = vm.schools.find((x) => x.id === b.dataset.return); store.actions.signOff(date, v.id, v.decision.id, "returned", ui.sdoNote[v.id] || ""); delete ui.sdoNote[v.id]; return v; }, (v) => `Returned to the head of ${v.name} with your note.`)));
  $("#csv").onclick = () => {
    const d = store.day(date);
    const csv = decisionsCSV(store.schools().map((s) => withDay(s, d)), d.forecast?.hi ?? 0, { forDate: date, forecast: d.forecast || {} });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `presko-decisions-${date}.csv` });
    document.body.append(a); a.click(); a.remove();
  };
}

// ---------- admin: Schools ----------
function adminData() {
  const today = store.state.today, tmr = tomorrow();
  const vmT = viewModel(store, { date: today }), vmN = viewModel(store, { date: tmr });
  const byId = (vm) => new Map(vm.waiting ? [] : vm.schools.map((v) => [v.id, v]));
  const T = byId(vmT), N = byId(vmN);
  const q = (ui.schoolQuery || "").trim().toLowerCase();
  const list = store.schools().filter((s) => !q || s.name.toLowerCase().includes(q));
  const sections = (s) => (Array.isArray(s.sections) ? s.sections.length : s.sections) || 0;
  const flags = (s) => { const c = { green: 0, amber: 0, red: 0 }; s.buildings.forEach((b) => c[band(b.features).band]++); return c; };
  const readingCell = (v) => { const r = Object.values(v?.readings || {}); return r.length ? `<span class="mono ${Math.max(...r) >= 42 ? "bad" : ""}">${Math.max(...r).toFixed(1)}°C</span> <span class="small muted">max of ${r.length}</span>` : '<span class="muted">–</span>'; };
  const decCell = (v) => (!v ? '<span class="muted">no forecast</span>' : `${v.decision ? lvlChip(v.decision.level) : ""} ${statusHTML(v)}${v.decision ? `<div class="small muted">${esc(v.decision.by)} · ${fmtTime(v.decision.at)}</div>` : ""}`);
  const sentCell = (v) => (v?.sent?.length ? `<span class="ok">✓</span> <span class="small">${esc(v.sent.map((x) => x.channel).join(", "))}</span>` : '<span class="muted">–</span>');
  const totals = { learners: DIVISION_FACTS.publicLearners, sent: vmT.waiting ? 0 : vmT.schools.filter((v) => v.sent.length).length, readings: vmT.waiting ? 0 : vmT.schools.filter((v) => Object.keys(v.readings).length).length };
  $("#main").innerHTML = `${bannerNotices()}<div class="row" style="justify-content:space-between"><h1>Schools</h1>
      <input type="search" id="schoolQ" placeholder="Find a school" value="${esc(ui.schoolQuery || "")}" aria-label="Find a school" style="max-width:260px"></div>
    <div class="stat-grid">
      <div class="stat"><b>${store.schools().length}</b><span>Schools on Presko</span></div>
      <div class="stat"><b>${fmt(totals.learners)}</b><span>Public learners</span></div>
      <div class="stat"><b>${totals.readings}</b><span>Sent 8:00 readings today</span></div>
      <div class="stat"><b>${totals.sent}</b><span>Messaged parents today</span></div>
    </div>
    <div class="tbl"><table><thead><tr><th>School</th><th>Sections</th><th>Buildings</th><th>Today ${fmtDate(today)}</th><th>8:00 readings</th><th>Parents told</th><th>Tomorrow ${fmtDate(tmr)}</th></tr></thead><tbody>
    ${list.map((s) => { const f = flags(s), vt = T.get(s.id), vn = N.get(s.id); return `<tr>
      <td>${schoolA(s)}</td>
      <td class="mono">${sections(s)}</td>
      <td class="small">${s.buildings.length} ${f.green || f.red ? "· " : ""}${f.green ? `<span class="flag green">${f.green} cooler</span> ` : ""}${f.red ? `<span class="flag red">${f.red} hot</span>` : ""}${!f.green && !f.red ? '<span class="muted">typical</span>' : ""}</td>
      <td>${decCell(vt)}</td><td>${readingCell(vt)}</td><td>${sentCell(vt)}</td><td>${decCell(vn)}</td></tr>`; }).join("") || `<tr><td colspan="7" class="muted">No school matches “${esc(q)}”.</td></tr>`}
    </tbody></table></div>`;
  $("#schoolQ").oninput = (e) => { ui.schoolQuery = e.target.value; const pos = e.target.selectionStart; render(); const el = $("#schoolQ"); el.focus(); el.setSelectionRange(pos, pos); };
}

// ---------- school: Today ----------
// The route guard has already checked the school; this never changes the role.
function schoolPage(r) {
  const s = store.bySlug(r.slug);
  if (r.page === "school-morning") return schoolMorning(s);
  if (r.page === "school-setup") return schoolSetup(s);
  return schoolToday(s);
}
const readOnlyBanner = (s) => (ROLES[store.role().kind].mode === "admin" ? `<div class="banner">Read-only view of ${esc(s.name)}. Only this school's head records decisions and sends messages.</div>` : "");
const schoolTop = (s) => (ROLES[store.role().kind].mode === "admin" ? `${bannerNotices()}${flashHTML()}${readOnlyBanner(s)}` : topHTML());
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
    $("#main").innerHTML = `${schoolTop(s)}<div class="school"><div class="stack">${todayCard}<section class="card dated"><div class="eyebrow">Plan for tomorrow, ${fmtDate(tmr)}</div><h2>${esc(s.name)}</h2><p>Waiting for the SDO's forecast for ${fmtDate(tmr)}.</p><p class="small muted">${isHead ? "Usually published by 16:00. Open this page again then; you'll record tomorrow's level here." : "The school head records tomorrow's level once the coordinator publishes the forecast."}</p></section></div></div>`;
    wireDecisions(s, vmT, today);
    return;
  }
  const proposedNote = v.proposed && v.status === "awaiting-sdo" ? `<p class="small">${isHead ? "Your" : "The head's"} proposed plan (${v.decision.level}) isn't in force until the SDO approves it; the rule level ${v.plan.levels.recommended} applies meanwhile.</p>` : "";
  const regularDay = v.status === "none" && v.plan.levels.recommended === "HAYO" && v.planType === "full"
    ? `<p class="small ok">Regular day: no change to classes. Parents don't need a notice on regular days; recording is still your call.</p>` : "";
  $("#main").innerHTML = `${schoolTop(s)}<div class="school"><div class="stack">
    ${todayCard}
    <section class="card dated" aria-label="Plan for tomorrow">
      <div class="row" style="justify-content:space-between"><div class="eyebrow">Plan for tomorrow, ${fmtDate(tmr)}</div><span class="count ${cd.late ? "late" : ""}">${cd.text}</span></div>
      <h2>${esc(s.name)}</h2>
      <div class="row">${lvlChip(v.level)} ${planChip(v)}</div>
      ${isHead ? `${regularDay}${decisionButtons(v, tmr, vmN, "evening")}` : `<p class="small">${statusHTML(v)} · the school head records tomorrow's decision.</p>`}
      ${proposedNote}
      <h3>Message to parents${regularDay && isHead ? ` <span class="small muted">(optional on a regular day)</span>` : ""}</h3>
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
    guard(() => store.actions.setWater(tmr, s.id, !e.target.checked), e.target.checked ? "Noted: no water tomorrow. The level is at least HINGA; re-confirm if asked." : "Noted: water supply is back for tomorrow.");
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
  else if (st === "returned") primary = `<div class="banner bad" role="status">The SDO returned your ${esc(v.decision.level)} request${v.decision.sdoAt ? ` at ${fmtTime(v.decision.sdoAt)}` : ""}: ${esc(quoted(v.decision.sdoNote))} Until you revise it, the rule level ${rec} applies.</div>
      <div class="row"><button class="primary" data-rec="${id}" data-level="${rec}">Accept ${rec} (rule level)</button><button data-other="${id}">Revise with a new reason</button></div>`;
  else if (st === "awaiting-sdo") {
    const note = sdoNoteText(store.school(v.id).name, v.decision.level, rec, v.decision.reason, date);
    primary = `${near ? `<button class="primary" data-rec="${id}" data-level="${rec}" data-replace="1">Send rule-level message now</button><p class="small">This replaces your ${v.decision.level} request with ${rec} (the rule level), official at once.</p>` : `<p class="small">Sent to the SDO approver. From 16:45 you can send the rule-level message instead.</p>`}
      <div class="row">${copyBtn(`sdonote-${id}`, note, "Copy note for the SDO")}${shareBtn(`sdoshare-${id}`, note)}</div><p class="small muted">${esc(note)}</p>`;
  }
  else primary = `<p class="small ok">Official: ${v.decision.level}, by ${esc(v.decision.by)} at ${fmtTime(v.decision.at)}${v.decision.sdo === "approved" ? `, approved by the SDO${v.decision.sdoAt ? ` at ${fmtTime(v.decision.sdoAt)}` : ""}` : ""}.</p>`;
  const other = ui.chooseOther === id ? `<div class="card" style="background:var(--sunk)"><label class="small" for="lv-${id}">Level</label><select id="lv-${id}">${FOURH.map((l) => `<option value="${l.id}" ${l.id === rec ? "selected" : ""}>${l.id} ${l.range}${l.id === rec ? " (recommended)" : ""}</option>`).join("")}</select>
      <label class="small" for="rs-${id}">Reason (required for a different level)</label><textarea id="rs-${id}"></textarea><button class="primary" data-save="${id}" data-kind="${kind}">Record decision</button></div>` : "";
  return `<div class="stack"><p>${statusHTML(v)}</p>${primary}${st !== "official" && st !== "returned" ? `<button class="ghost chip-btn" data-other="${id}">Choose a different level</button>` : ""}${other}</div>`;
}
/** “note” plus a full stop, unless the note already ends with one. */
const quoted = (n) => `“${n}”${/[.!?]$/.test(String(n).trim()) ? "" : "."}`;
const recorded = (date) => (dec) => (dec.lessProtective
  ? `Recorded ${dec.level} for ${fmtDate(date)}. It goes to the SDO approver; the rule level ${dec.recommended} applies until approved.`
  : `Recorded ${dec.level} for ${fmtDate(date)}. It's official. Next: copy the message for parents.`);
function wireDecisions(s, vm, date) {
  document.querySelectorAll(`[data-rec="${date}"]`).forEach((b) => (b.onclick = () => guard(() => { const d = store.actions.recordDecision(date, s.id, { level: b.dataset.level }); ui.chooseOther = false; return d; }, recorded(date))));
  document.querySelectorAll(`[data-other="${date}"]`).forEach((b) => (b.onclick = () => { ui.chooseOther = ui.chooseOther === date ? false : date; render(); }));
  document.querySelectorAll(`[data-save="${date}"]`).forEach((b) => (b.onclick = () => guard(() => { const d = store.actions.recordDecision(date, s.id, { level: $(`#lv-${date}`).value, reason: $(`#rs-${date}`).value }); ui.chooseOther = false; return d; }, recorded(date))));
  document.querySelectorAll(`[data-sent="${date}"]`).forEach((b) => (b.onclick = () => guard(() => store.actions.markSent(date, s.id, b.dataset.channel), `Marked as sent on ${b.dataset.channel}.`)));
  document.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { ui.lang = b.dataset.lang; render(); }));
}
function messageBlock(v, vm, date, overrideText, key) {
  const official = v.status === "official";
  const name = store.school(v.id).name;
  const text = overrideText || parentMessage(v, vm, ui.lang, { official, schoolName: name });
  const isHead = store.role().kind === "head";
  const sent = v.sent.filter((x) => x.level === v.level);
  const hot = v.plan.checkFirst.length ? [...new Set(v.plan.checkFirst.map((id) => v.plan.rooms.find((r) => r.id === id).name.split(" · ")[0]))].join(", ") : "";
  const done = official && isHead && sent.length && key === "msg"
    ? `<p class="small ok" role="status">✓ Done for ${fmtDate(date)}. Next: 8:00 readings${hot ? ` (check ${esc(hot)} first)` : ""}.</p>` : "";
  return `<div class="row" role="group" aria-label="Language">${[["en", "English"], ["tl", "Filipino"], ["hil", "Hiligaynon"]].map(([k, l]) => `<button class="chip-btn" data-lang="${k}" aria-pressed="${ui.lang === k}">${l}</button>`).join("")}</div>
    <div class="msg ${official ? "official" : "draft"}" id="${key}-text">${esc(text)}</div>
    ${official ? `<div class="row">${copyBtn(`${key}-copy`, text)}${isHead ? shareBtn(`${key}-share`, text) : ""}${isHead ? `<span class="small muted">then mark where you sent it:</span>${["FB page", "Group chat", "Radio"].map((c) => `<button class="chip-btn" data-sent="${date}" data-channel="${c}" aria-pressed="${sent.some((x) => x.channel === c)}">${c}${sent.some((x) => x.channel === c) ? " ✓" : ""}</button>`).join("")}` : ""}</div>${done}`
      : `<p class="small bad">Draft: ${isHead ? "record the decision" : "the head records the decision"} to make this official. Copy is off for drafts.</p>`}
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
  if (!v) { $("#main").innerHTML = `${bannerNotices()}${flashHTML()}<section class="card"><h1>Morning check · ${fmtDate(today)}</h1><p>No forecast was published for today, so there's nothing to check against yet.</p><p class="small muted">Ask the coordinator; you can note readings on paper meanwhile and enter them here once today's forecast is in.</p></section>`; return; }
  const m = v.morning;
  const read = v.buildings.filter((b) => b.reading != null), unread = v.buildings.filter((b) => b.reading == null);
  const saved = `<p class="small" aria-live="polite" id="savedLine">${read.length ? `${ui.savedAt ? `Saved ${fmtTime(ui.savedAt)} · ` : ""}<b>${read.length} of ${v.buildings.length}</b> buildings read${unread.length ? ` · not read: ${unread.map((b) => esc(b.name)).join(", ")}` : " · all read"}` : can ? "No readings yet. Each value saves as soon as you leave the box." : ""}</p>`;
  const outcome = m.levelChange ? `<div class="banner bad">Readings call for <b>${m.levelChange.to}</b> (was ${m.levelChange.from}). The school head must re-confirm on Today before the morning update is official.</div>
      ${role.kind === "teacher" ? `<p class="small">${copyBtn("tellHead", tellHeadText(s.name, m.levelChange.to), "Copy note for the head")} ${shareBtn("tellHeadShare", tellHeadText(s.name, m.levelChange.to))} <span>${esc(tellHeadText(s.name, m.levelChange.to))}</span></p>` : `<a href="#school-${s.slug}">Go to Today to re-confirm</a>`}`
    : m.emptied.length ? `<div class="banner">Room move for staff (not a parent message): no classes in ${m.emptied.map((id) => esc(v.buildings.find((b) => b.id === id).name)).join(", ")} today. The level stays ${v.level}.</div>`
    : `<div class="banner">Plan unchanged.</div>`;
  $("#main").innerHTML = `${schoolTop(s)}<div class="school"><div class="stack"><section class="card dated"><div class="eyebrow">Morning check, ${fmtDate(today)}</div><h2>${esc(s.name)}</h2>
    ${can ? "" : `<div class="banner">Readings are entered by the teacher on duty or the school head.</div>`}
    <div class="row">${lvlChip(v.level)} ${planChip(v)}</div>
    ${v.plan.checkFirst.length ? `<p class="small"><b>Check first:</b> ${[...new Set(v.plan.checkFirst.map((id) => v.plan.rooms.find((r) => r.id === id).name.split(" · ")[0]))].join(", ")}</p>` : ""}
    ${v.buildings.map((b) => `<div class="bldg"><div class="row" style="justify-content:space-between"><b>${esc(b.name)}</b><span class="flag ${b.flag}">${{ green: "cooler", amber: "typical", red: "hot" }[b.flag]}</span></div>
      <label class="row small">Indoor heat index at 8:00 <input type="number" step="0.1" min="20" max="55" inputmode="decimal" data-reading="${b.id}" value="${b.reading ?? ""}" ${can ? "" : "disabled"} style="width:7em"> °C
      ${b.reading != null ? `<span class="${b.emptied ? "bad" : "muted"}">→ ${b.buildingLevel}${b.emptied ? ", no classes here" : ""}</span>` : `<span class="muted">not read</span>`}</label></div>`).join("")}
    ${saved}
    <p class="small muted">Assumption: a building takes whichever level is worse, the forecast's or its reading's.</p>
    ${outcome}</section></div>
    <section class="stack"><div class="scene" id="scene" style="min-height:240px"></div></section></div>`;
  mountSchool($("#scene"), v);
  document.querySelectorAll("[data-reading]").forEach((i) => (i.onchange = () => { ui.savedAt = new Date().toISOString(); guard(() => store.actions.setReading(today, s.id, i.dataset.reading, i.value.trim())); }));
}

// ---------- school: Setup ----------
let sample = null;
(window.claude?.use ? window.claude.use("sample").catch(() => null) : Promise.resolve(null)).then((x) => (sample = x));
function schoolSetup(s) {
  const role = store.role(), can = ["custodian", "head"].includes(role.kind);
  const lab = (p) => (typeof p === "string" ? `<span class="tag" style="color:var(--muted)">${p}</span>` : `<span class="tag" style="color:var(--ok)">entered · ${esc(p.by)}</span>`);
  const prog = setupProgress(s);
  $("#main").innerHTML = `${role.kind === "custodian" ? topHTML() : schoolTop(s)}<h1>Setup · ${esc(s.name)}</h1>${can ? "" : `<div class="banner">Setup is for the property custodian or the school head.</div>`}
    ${role.kind === "custodian" ? "" : `<p class="small ${prog.done === prog.total ? "ok" : ""}">Setup: ${prog.done} of ${prog.total} parts entered by the school${prog.missing.length ? ` · still illustrative: ${prog.missing.join(", ")}` : ""}.</p>`}
    ${ui.rereadMsg ? `<div class="banner" role="status">${esc(ui.rereadMsg)}</div>` : ""}
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
  document.querySelectorAll("input[name=shift]").forEach((r) => (r.onchange = () => guard(() => store.actions.editSetup(s.id, { timetable: { shifts: r.value === "2" ? [[6, 12], [12, 18]] : [[7.5, 15.5]] } }), "Timetable saved.")));
  document.querySelectorAll("[data-tt]").forEach((i) => (i.onchange = () => guard(() => { const [k, j] = i.dataset.tt.split("-").map(Number); const sh = s.timetable.shifts.map((x) => [...x]); const [H, M] = i.value.split(":").map(Number); sh[k][j] = H + M / 60; store.actions.editSetup(s.id, { timetable: { shifts: sh } }); }, "Timetable saved.")));
}
const hh = (h) => `${String(Math.floor(h + 1e-6)).padStart(2, "0")}:${String(Math.round((h - Math.floor(h + 1e-6)) * 60)).padStart(2, "0")}`;
const FLAG_WORD = { green: "cooler", amber: "typical", red: "hot" };
/** What a re-read changed for the school: the building's flag, and tomorrow's plan if a forecast exists. */
function rereadResult(s, bid, before) {
  const b = store.school(s.id).buildings.find((x) => x.id === bid);
  const after = { flag: band(b.features).band, plan: planFor(s.id) };
  const flagPart = before.flag === after.flag ? `${b.name}: still ${FLAG_WORD[after.flag]}.` : `${b.name}: ${FLAG_WORD[before.flag]} → ${FLAG_WORD[after.flag]}.`;
  const planPart = before.plan && after.plan && before.plan.type !== after.plan.type ? ` Tomorrow's plan changes from "${before.plan.label}" to "${after.plan.label}"${after.plan.type === "request" ? `: ${shortName(s.name)} now has grounds to ask for face-to-face classes in cooler rooms` : ""}.` : "";
  ui.rereadMsg = `Saved. ${flagPart}${planPart}`;
}
function planFor(id) {
  const vm = viewModel(store, { date: tomorrow() });
  const v = !vm.waiting && vm.schools.find((x) => x.id === id);
  return v ? { type: v.planType, label: v.planLabel } : null;
}
async function reread(s, bid) {
  const note = $(`#note-${bid}`).value.trim();
  const b0 = s.buildings.find((x) => x.id === bid);
  const before = { flag: band(b0.features).band, plan: planFor(s.id) };
  const finish = () => { if (!ui.flash) rereadResult(s, bid, before); };
  if (!sample) { guard(() => store.actions.setBuildingNote(s.id, bid, note, { features: keywordFeatures(note), source: "keywords" })); return finish(); }
  try {
    const prompt = `You read short notes about school buildings in the Philippines and say which physical features are present. Do not guess temperatures.\nNote: """${note}"""\nReply with only a JSON object with these boolean keys: ${FEATURE_KEYS.join(", ")}; plus "evidence": a short string quoting the words that support each true key.`;
    const out = await Promise.race([sample.json(prompt, { modelTier: "quick" }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))]);
    const f = Object.fromEntries(FEATURE_KEYS.map((k) => [k, out?.[k] === true]));
    if (f.roof_no_ceiling) f.ceiling_or_insulated = false;
    guard(() => store.actions.setBuildingNote(s.id, bid, note, { features: f, source: "claude", evidence: String(out?.evidence || "").slice(0, 300) }));
  } catch {
    guard(() => store.actions.setBuildingNote(s.id, bid, note, { features: keywordFeatures(note), source: "keywords", evidence: "Claude unavailable; keyword reading used." }));
  }
  finish();
}

// ---------- sign in, stop cards ----------
function signInPage() {
  const next = peekNext(), nr = next ? route(`#${next}`) : null;
  const nextSchool = nr?.page.startsWith("school-") ? store.bySlug(nr.slug) : null;
  const nextNote = nr ? (nextSchool ? `Sign in to open ${nextSchool.name}'s page.` : nr.page.startsWith("admin") ? "Sign in to open the division page." : "") : "";
  const note = ui.signinNote || nextNote;
  $("#main").innerHTML = `<div class="start signin">
    <div class="stack" style="gap:8px"><h1>Tomorrow's heat level for ${store.schools().length} schools, decided by 17:00.</h1>
      <p class="muted">SDO Iloilo City · DRRM, school heads and teachers</p></div>
    ${bannerNotices()}
    ${note ? `<div class="banner" role="status">${esc(note)}</div>` : ""}
    <form class="card" id="signinForm" novalidate aria-labelledby="signinTitle">
      <h2 id="signinTitle">Sign in</h2>
      <div id="authErr" class="banner bad" role="alert" ${ui.authError ? "" : "hidden"}>${esc(ui.authError)}</div>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(ui.authEmail)}">
      <label for="pin">PIN</label>
      <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required>
      <label class="switchrow"><input type="checkbox" id="remember" checked> Keep me signed in on this phone</label>
      <button class="primary full" type="submit">Sign in</button>
      <p class="small muted">Forgot your PIN or need an account? Ask the SDO's DRRM coordinator.</p>
    </form>
    <section class="card" aria-labelledby="acctTitle"><h2 id="acctTitle">Accounts</h2>
      <p class="small muted">Tap an account to sign in with it, or type its email and PIN above.</p>
      <ul class="accounts">${ACCOUNTS.map((a, i) => `<li>
        <span class="acct-who"><b>${esc(a.name)}</b><span class="small">${esc(a.title)}</span><span class="small mono muted">${esc(a.email)} · PIN ${esc(a.pin)}</span></span>
        <button class="chip-btn" type="button" data-acct="${i}" aria-label="Sign in as ${esc(a.name)}, ${esc(a.title)}">Sign in</button></li>`).join("")}</ul></section>
    <a class="card replay-cta" href="#replay">
      <span class="replay-swatch" aria-hidden="true"></span>
      <span class="stack" style="gap:2px"><b>Heat replay</b><span class="small muted">Swipe through the April 2024 heatwave hour by hour and see how hot each part of the city got.</span></span>
      <span aria-hidden="true">→</span>
    </a></div>`;
  const remember = () => $("#remember").checked;
  document.querySelectorAll("[data-acct]").forEach((b) => (b.onclick = () => { const a = ACCOUNTS[+b.dataset.acct]; $("#email").value = a.email; $("#pin").value = a.pin; doSignIn(a.email, a.pin, remember()); }));
  $("#signinForm").onsubmit = (e) => {
    e.preventDefault();
    const email = $("#email").value, pin = $("#pin").value;
    if (!email.trim() || !pin.trim()) { ui.authError = "Enter your email and PIN."; ui.authEmail = email.trim(); render(); queueMicrotask(() => $(email.trim() ? "#pin" : "#email")?.focus()); return; }
    doSignIn(email, pin, remember());
  };
  if (!ui.authError) queueMicrotask(() => { if (document.activeElement === document.body) $(ui.authEmail ? "#pin" : "#email")?.focus({ preventScroll: true }); });
}
/** Shown instead of a page the signed-in account may not open. Never switches the role. */
function stopCard(reason, school) {
  const role = store.role();
  const mine = role?.schoolId != null ? store.school(role.schoolId) : null;
  const who = role ? `You're signed in as ${esc(role.name)}${mine ? `, ${esc(mine.name)}` : `, ${esc(ROLES[role.kind].label)}`}.` : "";
  const T = {
    "wrong-school": [`This link is for ${esc(school?.name || "another school")}`, `${who} You can only see and record for your own school.`],
    "admin-only": ["Not available for your role", `This page is for SDO staff. ${who}`],
    "unknown-school": ["We can't find that school link", "It may be mistyped or out of date."],
    "unknown-page": ["We can't find that page", "The link may be mistyped or out of date."],
  }[reason];
  $("#main").innerHTML = `<div class="start"><section class="card" role="region" aria-labelledby="stopTitle"><h1 id="stopTitle">${T[0]}</h1><p>${T[1]}</p>
    <div class="row"><a class="btn-primary linkbtn" href="#${landing(role)}">${mine ? "Go to my school" : "Go to my page"}</a>${role ? `<button id="stopSignOut">Sign out and use another account</button>` : ""}</div></section></div>`;
  $("#stopSignOut") && ($("#stopSignOut").onclick = () => doSignOut("Signed out. Sign in with the account for that page."));
}
// ---------- render ----------
function render() {
  rendering = true;
  try { renderInner(); } finally { rendering = false; }
}
function renderInner() {
  const r = route();
  const role = store.role();
  // Signed in and on the sign-in page: go home. Signed out on a protected page: remember it, then ask to sign in.
  if (r.page === "start" && role) { history.replaceState(null, "", `#${landing(role)}`); return renderInner(); }
  const g = allowed(r, role);
  if (!g.ok && g.reason === "signed-out") {
    setNext(location.hash.slice(1));
    history.replaceState(null, "", "#start");
    return renderInner();
  }
  renderHeader(r);
  if (!["admin", "school-today", "school-morning"].includes(r.page) || !g.ok) disposeScene();
  if (r.page !== "replay") stopReplay();
  document.body.dataset.signedIn = role ? "yes" : "no";
  if (!g.ok) stopCard(g.reason, g.school);
  else if (r.page === "start") signInPage();
  else if (r.page === "replay") replayPage($("#main"), store.schools());
  else if (r.page === "admin") adminDivision();
  else if (r.page.startsWith("admin-decisions")) adminDecisions(r.page === "admin-decisions-awaiting" ? "awaiting-sdo" : null);
  else if (r.page === "admin-data") adminData();
  else if (r.page.startsWith("school-")) schoolPage(r);
  window.__presko = { store, ui, viewModel };
}
addEventListener("hashchange", () => { ui.flash = ""; ui.chooseOther = false; ui.rereadMsg = ""; disposeScene(); render(); scrollTo(0, 0); });
addEventListener("online", () => render());
addEventListener("offline", () => render());
// Close the account menu when tapping elsewhere.
document.addEventListener("click", (e) => { const m = document.getElementById("acct"); if (m?.open && !m.contains(e.target)) m.open = false; });
// Re-render after every store change, batched so actions called during a render can't recurse.
let rendering = false, queued = false;
store.subscribe(() => { if (rendering || queued) return; queued = true; queueMicrotask(() => { queued = false; render(); }); });
setInterval(() => document.querySelectorAll(".count").forEach((el) => { const c = countdown(); el.textContent = c.text; el.classList.toggle("late", c.late); }), 30000);
render();
