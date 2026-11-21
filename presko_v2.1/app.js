// Presko 2.0 app: Safety Model v2.1 under DepEd DM 064 "4H" rules, on the Sunbreaker design system.
// Two roles. Division coordinator: forecast, 3D division map, decisions, approvals, messages, rules.
// Principal: one simple page (tomorrow's answer → parents → thermometer → buildings), written for anyone.
import { makeDivision, planDivision4H, planSchool4H, correctionsFrom, modelBuildings, check, FEATURE_KEYS } from "./engine.js";
import { LIMITS, CHECKPOINTS, fillSolar, shiftToPeak, heatIndex, indoorHour } from "./model/safety-model.js";
import { FOURH, levelInfo, PLAN_LABEL, PLAN_ORDER, CITY, SOURCES, AUTHORITY, EO130 } from "./rules.js";
import { FORECAST_SNAPSHOT, DEMO_CLOSURE, REPLAY_NOV3 } from "./hourly-data.js";
import { prefers3D, loadThree, division3D, school3D } from "./ui/scene3d.js";
import { symbol, legendHTML, renderDivision2D, renderSchool2D, sunArc } from "./ui/scenes.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const hh = (h) => `${String(h).padStart(2, "0")}:00`;
const clock = (h) => (h === 12 ? "12 noon" : h < 12 ? `${h} AM` : `${h - 12} PM`);
const sym = (t, size = 18) => `<svg class="sym" style="width:${size}px;height:${size}px" viewBox="0 0 16 16" aria-hidden="true">${symbol(t, 8, 8, 7)}</svg>`;
const lvlTag = (id, extra = "", cls = "") => `<span class="lvl ${id} ${cls}"><b>${id}</b>${extra ? `<span>${extra}</span>` : ""}</span>`;
const RANK = { full: 0, split: 1, splitPartial: 2, home: 3, request: 3, stop: 4 };
const LANGS = [["en", "English"], ["tl", "Tagalog"], ["hil", "Hiligaynon"]];

// ---------- demo scenarios: tomorrow's hourly weather ----------
const liveDate = () => Object.keys(state.forecastDays).sort()[1] || Object.keys(state.forecastDays)[0];
const SCENARIOS = {
  apr1: { label: "Hinga · 41 °C (1 Apr 2024 forecast)", note: "Hot-season hourly profile at PAGASA's 41 °C forecast for 1 April 2024, when Iloilo City suspended in-person classes.", make: () => ({ hours: shiftToPeak(fillSolar(DEMO_CLOSURE), 41), f: 41, day: "Demo day · 41 °C" }) },
  nov3: { label: "Hinto · 3 Nov 2026 replay (43 °C)", note: "Real Open-Meteo hours for Iloilo City on 3 Nov 2026, adjusted to PAGASA's 43 °C forecast. That day 65 Iloilo City schools closed for heat.", make: () => ({ hours: REPLAY_NOV3.hours, f: 43, day: "Tue 3 Nov 2026" }) },
  hinay: { label: "Hinay · cooler day (31 °C)", note: "Live forecast profile scaled to a 31 °C peak (demo).", make: () => ({ hours: shiftToPeak(fillSolar(state.forecastDays[liveDate()]), 31), f: 31, day: "Demo day · 31 °C" }) },
  live: { label: "Live forecast · tomorrow", note: "Open-Meteo hourly forecast for Iloilo City. In use, PAGASA's 5 PM forecast sets the level.", make: () => ({ hours: fillSolar(state.forecastDays[liveDate()]), f: null, day: liveDate() }) },
};

const state = {
  scenario: "apr1", forecastDays: FORECAST_SNAPSHOT.days, live: false, dayHours: [], forecastHI: null, day: "", cityAuto: CITY.autoDefault,
  schools: makeDivision(), user: null, school: null, lang: "en", filter: "all", view3d: null,
  decisions: {}, // schoolId -> { choice: "confirm" | plan type | "request", reason, via, at, status: "official" | "awaiting" | "returned" }
  sent: {}, smsThread: {}, requests: [], comms: {}, readings: {}, water: {}, f2fApproved: {},
  rule: { version: 1, approvedBy: "sdo.iloilocity@deped.gov.ph", approvedAt: "2026-11-21 09:00", cutoff: "17:00" },
};
const ruleLabel = () => `v2.${state.rule.version}`;

// ---------- plans ----------
const correctionsFor = (s) => (state.readings[s.id] ? correctionsFrom(s, state.dayHours, state.readings[s.id]) : undefined);
function divisionPlan() {
  const corrections = {}; for (const s of state.schools) { const c = correctionsFor(s); if (c) corrections[s.id] = c; }
  return planDivision4H(state.schools, state.dayHours, { forecastHI: state.forecastHI ?? undefined, corrections, water: state.water, f2fApproved: state.f2fApproved, cityAuto: state.cityAuto });
}
const planFor = (s) => planSchool4H(s, state.dayHours, { forecastHI: state.forecastHI ?? undefined, corrections: correctionsFor(s), water: state.water[s.id] !== false, f2fApproved: !!state.f2fApproved[s.id], cityAuto: state.cityAuto });
function applyType(p, type) {
  if (type === "home") return { ...p, planType: "home", assignments: p.assignments.map((x) => ({ ...x, room: null, slot: "adm" })), slotsUsed: [], litSlots: [], f2fSections: 0 };
  if (type === "split" || type === "splitPartial") return { ...p, rooms: p.hinay.rooms, planType: p.hinay.type, assignments: p.hinay.assignments, slotsUsed: p.hinay.slotsUsed, litSlots: p.hinay.slotsUsed.map((id) => p.litSlots.find((l) => l.id === id) || { id, start: id === "hinayAM" ? 6 : 14, end: id === "hinayAM" ? 10 : 18, label: id === "hinayAM" ? "06:00–10:00" : "14:00–18:00" }), f2fSections: p.hinay.f2f };
  return p;
}
function effective(s, p) {
  const d = state.decisions[s.id];
  return d && d.status === "official" && PLAN_LABEL[d.choice] ? applyType(p, d.choice) : p;
}
const options = (p) => PLAN_ORDER.filter((t) => t !== "request" && t !== "stop" && RANK[t] > RANK[p.planType] && (levelInfo(p.level).plans.includes(t) || t === "home"));
const status = (s) => { const d = state.decisions[s.id]; return !d ? "none" : d.status; };
const STATUS_TEXT = { none: "No answer yet", official: "Final", awaiting: "Waiting for the Division", returned: "Returned to principal" };
const flagOf = (p, b) => {
  const S = p.safety.sessions, u = (k) => S[k].buildings.find((x) => x.id === b.id)?.usable;
  return u("fullDay") || (u("hinayAM") && u("hinayPM")) ? "green" : u("morning") || u("afternoon") || u("hinayAM") || u("hinayPM") ? "amber" : "red";
};
const FLAG_WORD = { green: "Stays cooler", amber: "Hot part of the day", red: "Too hot" };
const roofOf = (b) => (b.features.roof_no_ceiling || b.features.makeshift ? "bare" : b.features.aircon ? "slab" : "ceiling");
const schoolVM = (s, p) => ({ name: s.name, level: p.level, planType: p.planType, litSlots: p.litSlots,
  buildings: s.buildings.map((b) => ({ name: b.name, rooms: b.rooms, storeys: Math.max(1, Math.min(b.nsbi.storeys, b.rooms)), flag: flagOf(p, b), emptied: false, roofType: roofOf(b) })) });
const TRAIT = { roof_no_ceiling: "metal roof, no ceiling", makeshift: "temporary structure", upper_floor: "top floor under the roof", poor_ventilation: "poor airflow", west_facing: "faces the afternoon sun", ceiling_or_insulated: "has a ceiling", shade_trees: "shaded by trees", cross_ventilation: "windows on both sides", aircon: "air-conditioned" };
const traits = (b) => FEATURE_KEYS.filter((k) => b.features[k]).map((k) => TRAIT[k]);
const learners = (s) => s.sections.reduce((t, x) => t + x.learners, 0);

// ---------- words ----------
const PLAIN = {
  full: "Normal school day.",
  split: "Short school day. Nobody stays at school at midday.",
  splitPartial: "Short school day for some classes. The other classes learn at home.",
  home: "No classes at school. Pupils do light work at home.",
  request: "No classes at school. Pupils do light work at home.",
  stop: "No school and no homework. Everyone stays home and keeps cool.",
};
const timesText = (p, or = "or") => p.litSlots.map((l) => l.label).join(` ${or} `);
function parentMessage(s, p, lang) {
  const hi = Math.round(p.safety.peakHI), L = p.level, t = timesText(p, { en: "or", tl: "o", hil: "ukon" }[lang]);
  const home = p.assignments.filter((a) => a.slot === "adm").map((a) => s.sections.find((x) => x.id === a.section).name);
  const list = home.slice(0, 6).join(", ") + (home.length > 6 ? ` +${home.length - 6}` : "");
  const T = {
    en: { head: `${s.name}: PAGASA heat index forecast for tomorrow ${hi}°C (DepEd 4H: ${L}).`, full: `Classes run as normal. Please send your child with water.`, split: `Short school day: classes ${t} only. Nobody stays at school at midday. Bring water.`, splitPartial: `Short school day for some classes, ${t}. Learning at home: ${list}.`, home: `No face-to-face classes. Light home-based work only (modules, DepEd TV/radio).`, stop: `No classes and no homework tomorrow. Keep children indoors, cool and drinking water.`, sign: "– Principal" },
    tl: { head: `${s.name}: Heat index bukas ayon sa PAGASA ${hi}°C (DepEd 4H: ${L}).`, full: `Normal ang klase. Magdala ng tubig.`, split: `Pinaikling klase: ${t} lamang. Walang mananatili sa paaralan sa tanghali. Magdala ng tubig.`, splitPartial: `Pinaikling klase para sa ilang seksyon, ${t}. Sa bahay mag-aaral: ${list}.`, home: `Walang face-to-face na klase. Magaan na gawain sa bahay lamang (modules, DepEd TV/radyo).`, stop: `Walang klase at walang takdang-aralin bukas. Panatilihing malamig at uminom ng tubig ang mga bata.`, sign: "– Punong-guro" },
    hil: { head: `${s.name}: Heat index buwas suno sa PAGASA ${hi}°C (DepEd 4H: ${L}).`, full: `Normal ang klase. Magdala sang tubig.`, split: `Ginpamubo nga klase: ${t} lang. Wala sing magapabilin sa eskwelahan sa udto. Magdala sang tubig.`, splitPartial: `Ginpamubo nga klase para sa pila ka seksyon, ${t}. Sa balay magatuon: ${list}.`, home: `Wala sing face-to-face nga klase. Mamag-an nga buluhaton sa balay lang (modules, DepEd TV/radyo).`, stop: `Wala sing klase kag wala sing assignment buwas. Patumanan nga mahaw-as kag mainom sang tubig ang mga kabataan.`, sign: "– Punong-manunudlo" },
  }[lang];
  return `${T.head} ${T[p.planType === "request" ? "home" : p.planType]}\n${T.sign}`;
}
// EO 130 "documented, site-specific" reasons, in plain words for the principal and exact for the Division.
function reasons(p, plain = false) {
  const a = p.safety, out = [];
  if (plain) out.push({ HAYO: "DepEd rule: below 27°C, normal classes are allowed.", HINAY: "DepEd rule: at 27–32°C, only a short school day.", HINGA: "DepEd rule: at 33–41°C, no classes at school.", HINTO: "DepEd rule: at 42°C or more, no school activity at all." }[p.level]);
  if (a.dayVeto) out.push(plain ? `Dangerous heat (${Math.round(a.peakHI)}°C). No school for anyone.` : `Forecast heat index ${a.peakHI.toFixed(0)} °C: PAGASA extreme danger`);
  const sessions = p.level === "HAYO" ? ["fullDay"] : ["hinayAM", "hinayPM"];
  for (const k of sessions) {
    const S = a.sessions[k];
    if (S.commuteVeto) { out.push(plain ? `Too hot to walk to or from school (about ${Math.round(S.worstCommute)}°C in the sun).` : S.evidence[0]); continue; }
    for (const b of S.buildings) if (!b.usable) out.push(plain ? `${b.name} gets too hot inside from ${clock(Math.min(...b.unsafeHours))}.` : `${k === "hinayAM" ? "06:00–10:00" : k === "hinayPM" ? "14:00–18:00" : "Full day"} · ${b.name}: estimated indoor WBGT ${b.peakWBGT.toFixed(1)} at ${hh(b.peakAt)} (limit ${LIMITS.classUnsafeWBGT})`);
  }
  return [...new Set(out)];
}

// Evidence for a face-to-face request: the rooms that stay below the caution line in each short-day slot.
function coolEvidence(p) {
  const out = [];
  for (const [k, label] of [["hinayAM", "06:00–10:00"], ["hinayPM", "14:00–18:00"]]) {
    const S = p.safety.sessions[k]; if (S.commuteVeto) continue;
    for (const b of S.buildings) if (b.usable && !b.cautionHours.length) out.push(`${label} · ${b.name}: estimated indoor WBGT up to ${b.peakWBGT.toFixed(1)}, below the caution line (${LIMITS.classCautionWBGT})${b.learned ? ", checked against the school's readings" : ""}`);
  }
  return out;
}

// ---------- shared chrome ----------
let scenes = [];
function disposeScenes() { scenes.forEach((x) => x.dispose?.()); scenes = []; }
function mount(el, kind, data, opts) {
  const draw2D = () => (kind === "div" ? renderDivision2D(el, data, opts) : renderSchool2D(el, data));
  if (!state.view3d) return draw2D();
  loadThree().then((T) => { if (!el.isConnected) return; const h = kind === "div" ? division3D(T, el, data, opts) : school3D(T, el, data); scenes.push(h); el._h = h; })
    .catch(() => { state.view3d = false; draw2D(); });
}
let toastT;
function toast(msg) { $("sr-status").textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => ($("sr-status").textContent = ""), 3500); }
function go(hash) { if (location.hash !== hash) location.hash = hash; else render(); }
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
const route = () => (location.hash.replace(/^#\/?/, "") || "").split("/");

function header() {
  const u = state.user;
  const tabs = !u ? [] : u.role === "sdo"
    ? [["", "Overview"], ["decisions", "Decisions"], ["requests", `Approvals${pendingApprovals() ? ` <span class="badge">${pendingApprovals()}</span>` : ""}`], ["messages", "Messages"], ["rules", "Rules"]]
    : [];
  const r = route()[0] || "";
  const nav = tabs.length ? `<nav class="tabs" aria-label="Sections">${tabs.map(([k, l]) => `<a href="#/${k}" ${(r === k || (k === "" && r === "school")) ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>` : "";
  $("hdr").innerHTML = `<a class="wordmark" href="#/"><i><span></span></i><b>Presko</b></a>
    ${u ? `<span class="ctx">${u.role === "sdo" ? "SDO Iloilo City · Division coordinator" : esc(current().name)}</span>` : ""}
    ${nav}<span class="spacer"></span>
    <button class="iconbtn theme" id="themeBtn" aria-label="Switch light or dark">◐</button>
    ${u ? `<button class="btn-sm" id="signout">Sign out</button>` : ""}`;
  $("hdr2").hidden = !tabs.length; $("hdr2").innerHTML = nav;
  $("themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("presko:theme", document.documentElement.dataset.theme); } catch {}
    render();
  });
  $("signout")?.addEventListener("click", () => { state.user = null; history.replaceState(null, "", location.pathname); render(); });
  $("demoBar").hidden = !u;
  $("demoBar").innerHTML = `<span class="cap">Demo</span><label>Tomorrow's weather <select id="scenario">${Object.entries(SCENARIOS).map(([k, v]) => `<option value="${k}" ${state.scenario === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></label><label><input type="checkbox" id="v3d" ${state.view3d ? "checked" : ""} style="width:18px;height:18px;min-height:auto;vertical-align:middle"> 3D pictures</label>`;
  $("scenario")?.addEventListener("change", (e) => { state.scenario = e.target.value; loadScenario(); });
  $("v3d")?.addEventListener("change", (e) => { state.view3d = e.target.checked; render(); });
}
const pendingApprovals = () => Object.values(state.decisions).filter((d) => d.status === "awaiting").length + state.requests.filter((q) => q.status === "pending").length;

// ---------- sign in ----------
const SDO_EMAIL = "sdo.iloilocity@deped.gov.ph";
const slug = (name) => name.toLowerCase().replace(/elementary school/, "es").replace(/national high school/, "nhs").replace(/integrated school/, "is").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
const ACCOUNTS = new Map([[SDO_EMAIL, { role: "sdo" }]]);
for (const s of state.schools) ACCOUNTS.set(`head.${slug(s.name)}@deped.gov.ph`, { role: "head", school: s.id });
const pandac = state.schools.find((s) => /pandac/i.test(s.name));
const central = state.schools.find((s) => /iloilo central/i.test(s.name));
const DEMO = [[SDO_EMAIL, "Division", "SDO Iloilo City · coordinator"], [`head.${slug(pandac.name)}@deped.gov.ph`, "Principal", pandac.name], [`head.${slug(central.name)}@deped.gov.ph`, "Principal", central.name]];
function renderLogin() {
  $("main").innerHTML = `<div class="start">
    <div class="stack" style="gap:6px"><h1>Tomorrow's school plan for every school, ready by 5 PM.</h1><p class="ink2">SDO Iloilo City · heat decisions under DepEd Memo 064 s. 2026</p></div>
    <form class="card" id="login" novalidate>
      <label for="email"><h3>Your DepEd email</h3></label>
      <input id="email" type="email" autocomplete="username" placeholder="name@deped.gov.ph" style="width:100%">
      <button class="btn-primary btn-xl" type="submit">Sign in</button>
      <p class="bad small" id="err" role="alert"></p>
    </form>
    <section class="card"><h2>Demo accounts</h2><p class="small muted">Tap one to sign in. No password in the demo.</p>
      ${DEMO.map(([e, r, n]) => `<button class="rolecard" data-email="${e}"><span class="mono">${r}</span><span><b>${esc(n)}</b><br><span class="small muted mono">${e}</span></span></button>`).join("")}</section></div>`;
  $("login").addEventListener("submit", (e) => { e.preventDefault(); signIn($("email").value); });
  $("main").querySelectorAll("[data-email]").forEach((b) => b.addEventListener("click", () => signIn(b.dataset.email)));
}
function signIn(raw) {
  const email = String(raw).trim().toLowerCase(), acc = ACCOUNTS.get(email);
  if (!acc) { $("err").textContent = email ? "There is no Presko account for this email." : "Please type your DepEd email."; return; }
  state.user = { email, ...acc }; if (acc.role === "head") state.school = acc.school;
  history.replaceState(null, "", location.pathname + "#/"); render();
  if (acc.role === "head") openSms();
  toast(`Signed in as ${acc.role === "sdo" ? "Division coordinator" : `principal, ${current().name}`}.`);
}

// ---------- principal ----------
const current = () => state.schools.find((x) => x.id === state.school);
function decide(s, choice, reason, via) {
  const status = choice === "confirm" ? "official" : "awaiting";
  state.decisions[s.id] = { choice, reason: reason || "", via, at: now(), status };
  delete state.sent[s.id];
}
function renderHead() {
  const s = current(), p = planFor(s), ep = effective(s, p), d = state.decisions[s.id], st = status(s), sent = state.sent[s.id];
  const L = levelInfo(p.level), hi = Math.round(p.safety.peakHI), why = reasons(p, true), opts = options(p);
  const answered = st === "official";
  const statusLine = st === "none" ? `<div class="answer">Please answer before ${clock(17)}.</div>`
    : st === "official" ? `<div class="answer ok">✓ Final. Sent to the Division at ${d.at}.</div>`
    : st === "awaiting" ? `<div class="answer wait">Waiting for the Division to approve your ${d.choice === "request" ? "request for classes in the cool rooms" : "change"}.</div>`
    : `<div class="answer wait">The Division sent your change back. Please choose again.</div>`;
  const ask = p.planType === "request" && !state.f2fApproved[s.id];
  $("main").innerHTML = `<div class="wrap1">
    <section class="hero" style="--lvl:var(--${p.level})">
      <span class="cap">Tomorrow · ${esc(state.day)}</span>
      ${lvlTag(p.level, `${hi}°C`, "xl")}
      <p class="huge">${PLAIN[ep.planType]}</p>
      ${ep.litSlots.length ? `<p class="big">Classes: <b class="mono">${esc(timesText(ep))}</b></p>${sunArc({ ...schoolVM(s, ep), litSlots: ep.litSlots, level: p.level, planType: ep.planType })}` : ""}
      ${ask ? `<p class="big">Some classrooms stay cool enough for <b>${p.requestSections} of ${p.sections}</b> classes on a short day. You can ask the Division to allow it.</p>` : ""}
      ${why.length ? `<details><summary>Why?</summary><ul class="why">${why.slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : `<p class="small ink2">${esc(L.allows)}.</p>`}
      ${statusLine}
    </section>

    <section class="card">
      <div class="step"><span class="n ${answered && sent ? "done" : ""}">1</span><h2>Your answer</h2></div>
      ${st === "official" && !state.changeOpen ? `<button class="btn-link" id="change">Change my answer</button>` : `
        ${st !== "official" ? `<button class="btn-primary btn-xl" id="confirm">Yes, use this plan</button>` : ""}
        ${ask ? `<button class="btn-xl" id="askF2F">Ask for classes in the cool rooms</button>` : ""}
        ${opts.length ? `<details ${state.changeOpen ? "open" : ""}><summary class="big">I need a different plan</summary>
          <form id="ovr" class="stack" style="gap:10px;margin-top:8px">
            ${opts.map((t, i) => `<label class="opt"><input type="radio" name="plan" value="${t}" ${i === 0 ? "checked" : ""}> ${sym(t, 22)} ${PLAN_LABEL[t]}</label>`).join("")}
            <label for="ovrReason" class="big">Why? <span class="small muted">(the Division will read this)</span></label>
            <input id="ovrReason" type="text" placeholder="For example: no water at school" style="width:100%">
            <p class="bad" id="ovrErr" role="alert"></p>
            <button class="btn-xl" type="submit">Send to the Division</button></form></details>`
        : st !== "official" && !ask ? `<p class="small muted">At this heat level the DepEd rule allows only this plan.</p>` : ""}`}
      ${answered ? (sent ? `<div class="answer ok">✓ Parents told at ${sent.at} (${sent.recipients.toLocaleString()} pupils).</div><button class="btn-link" id="notify">Send another message to parents</button>`
        : `<button class="btn-primary btn-xl" id="notify">Message the parents</button>`) : ""}
    </section>

    <section class="card">
      <div class="step"><span class="n">2</span><h2>Classroom thermometer</h2></div>
      <p class="big">Write today's temperatures. Presko learns how hot your rooms really get.</p>
      ${readingsForm(s)}
    </section>

    <section class="card">
      <h2>Building records</h2>
      <div class="scene sch" id="schScene"></div>
      <div>${s.buildings.map((b) => `<div class="bline"><span class="flag ${flagOf(p, b)}">${FLAG_WORD[flagOf(p, b)]}</span><span><b>${esc(b.name)}</b> · ${b.rooms} classroom${b.rooms === 1 ? "" : "s"}${traits(b).length ? ` · ${esc(traits(b).join(", "))}` : ""}</span></div>`).join("")}</div>
      <details><summary>Full building records</summary>${s.buildings.map((b) => `<div class="bldg"><b>${esc(b.name)}</b> <span class="mono small muted">NSBI ${esc(b.nsbi.buildingNo)}</span><div class="kv"><div><span>Type</span> ${esc(b.nsbi.type)}</div><div><span>Storeys</span> ${b.nsbi.storeys}</div><div><span>Classrooms</span> ${b.rooms}</div><div><span>Built</span> ${b.nsbi.yearBuilt}</div><div><span>Condition</span> ${esc(b.nsbi.condition)}</div><div><span>Classification</span> ${esc(b.nsbi.cls)}</div></div></div>`).join("")}</details>
      <form id="reqForm" class="stack" style="gap:8px"><label for="reqText" class="big">Something changed? (new fan, new ceiling…)</label>
        <textarea id="reqText" style="font-size:17px" placeholder="For example: Building B now has 2 ceiling fans in each room."></textarea>
        <button type="submit">Tell the Division</button>
        ${state.requests.filter((q) => q.school === s.id).map((q) => `<p class="small">${q.status === "pending" ? "Sent" : "✓ Seen by the Division"} · ${q.at}: ${esc(q.text)}</p>`).join("")}</form>
    </section>
    <p class="small muted">${esc(AUTHORITY)}</p></div>`;
  mount($("schScene"), "school", schoolVM(s, ep));
  $("confirm")?.addEventListener("click", () => { state.changeOpen = false; decide(s, "confirm", "", "web"); render(); openParentDialog(); });
  $("change")?.addEventListener("click", () => { state.changeOpen = true; render(); });
  $("askF2F")?.addEventListener("click", () => { decide(s, "request", `${p.requestSections} classes in cooler rooms on a short day`, "web"); render(); toast("Request sent to the Division."); });
  $("ovr")?.addEventListener("submit", (e) => {
    e.preventDefault(); const t = new FormData(e.target).get("plan"), why = $("ovrReason").value.trim();
    if (!why) { $("ovrErr").textContent = "Please write a short reason."; $("ovrReason").focus(); return; }
    state.changeOpen = false; decide(s, t, why, "web"); render(); toast("Sent to the Division for approval.");
  });
  $("notify")?.addEventListener("click", openParentDialog);
  wireReadings(s, p);
  $("reqForm").addEventListener("submit", (e) => {
    e.preventDefault(); const text = $("reqText").value.trim(); if (!text) { $("reqText").focus(); return; }
    state.requests.push({ id: String(Date.now()), school: s.id, text, at: now(), status: "pending" }); render(); toast("Sent to the Division.");
  });
}
function readingsForm(s) {
  const mine = state.readings[s.id] || {}, corr = correctionsFor(s) || {};
  const exp = (b, h) => { const w = state.dayHours.find((x) => x.h === h); return w ? indoorHour(w, b).t.toFixed(0) : ""; };
  return `<form id="rdForm" class="stack" style="gap:10px">
    <div class="rd"><span></span>${CHECKPOINTS.map((h) => `<span class="h">${clock(h)}</span>`).join("")}</div>
    ${modelBuildings(s).map((b) => `<div class="rd"><span class="bn"><b>${esc(b.name)}</b>${corr[b.id] ? `<br><span class="small muted">Learned: ${corr[b.id].corr > 0 ? "+" : ""}${corr[b.id].corr.toFixed(1)}°C</span>` : ""}</span>${CHECKPOINTS.map((h) => `<input type="number" step="0.1" min="15" max="55" inputmode="decimal" data-rd="${b.id}" data-h="${h}" value="${(mine[b.id] || []).find((r) => r.h === h)?.t ?? ""}" placeholder="${exp(b, h)}" aria-label="${esc(b.name)}, ${clock(h)}, °C">`).join("")}</div>`).join("")}
    <p class="small muted">Grey numbers are what Presko expected, in °C.</p>
    <button type="submit">Save temperatures</button></form>`;
}
function wireReadings(s, p) {
  $("rdForm").addEventListener("submit", (e) => {
    e.preventDefault(); const next = {};
    $("rdForm").querySelectorAll("[data-rd]").forEach((el) => { const v = parseFloat(el.value); if (Number.isFinite(v)) (next[el.dataset.rd] ??= []).push({ h: +el.dataset.h, t: v }); });
    state.readings[s.id] = next;
    const after = planFor(s).planType;
    if (after !== p.planType) { delete state.decisions[s.id]; delete state.sent[s.id]; }
    render(); toast(after !== p.planType ? `Saved. Tomorrow's plan changed: ${PLAN_LABEL[after]}.` : "Saved. Tomorrow's plan stays the same.");
  });
}
function openSms() {
  const s = current(), p = planFor(s), thread = state.smsThread[s.id] || [];
  $("phone").innerHTML = `<div class="bubble">PRESKO · ${esc(s.name)}\nTomorrow: ${p.level} (${Math.round(p.safety.peakHI)}°C)\n${PLAIN[p.planType]}${p.litSlots.length ? `\nClasses ${timesText(p)}` : ""}\nReply 1 to agree, or open Presko.</div>${thread.map((m) => `<div class="bubble ${m.me ? "me" : ""}">${esc(m.text)}</div>`).join("")}
    <form class="row" id="smsForm"><input id="smsIn" inputmode="numeric" maxlength="1" placeholder="Reply" aria-label="Reply" style="flex:1"><button type="submit">Send</button></form>`;
  $("smsForm").addEventListener("submit", (e) => {
    e.preventDefault(); const v = $("smsIn").value.trim(), t = (state.smsThread[s.id] ??= []);
    t.push({ me: true, text: v || "?" });
    if (v === "1") { decide(s, "confirm", "", "sms"); t.push({ me: false, text: "Thank you. Your answer is final. Open Presko to message parents." }); render(); }
    else t.push({ me: false, text: "Reply 1 to agree, or open Presko to choose." });
    openSms();
  });
  if (!$("smsDlg").open) $("smsDlg").showModal();
}
function openParentDialog() {
  const s = current(), ep = effective(s, planFor(s));
  state.draft = { lang: state.lang, text: parentMessage(s, ep, state.lang), edited: false };
  fillParent(); $("parentDlg").showModal();
}
function fillParent() {
  const s = current(), ep = effective(s, planFor(s)), dr = state.draft;
  $("pIntro").innerHTML = `Plan: <b>${esc(PLAIN[ep.planType])}</b> Review the message below, edit it if needed, then confirm to send it by SMS to every registered parent or guardian.`;
  $("pLang").innerHTML = LANGS.map(([k, l]) => `<button data-l="${k}" aria-pressed="${dr.lang === k}">${l}</button>`).join("");
  $("pDraft").hidden = dr.lang === "en";
  $("pText").value = dr.text;
  countParent();
  $("pLang").querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => {
    if (dr.edited && !confirm("Switching language replaces your edits with the template. Continue?")) return;
    dr.lang = state.lang = b.dataset.l; dr.text = parentMessage(s, ep, dr.lang); dr.edited = false; fillParent();
  }));
}
function countParent() { const s = current(); $("pCount").textContent = `Recipients: parents/guardians of ${learners(s).toLocaleString()} learners in ${s.sections.length} sections · ${state.draft.text.length} characters`; }
$("pText").addEventListener("input", () => { state.draft.text = $("pText").value; state.draft.edited = true; countParent(); });
$("pSend").addEventListener("click", () => {
  const s = current(), text = $("pText").value.trim(); if (!text) { $("pText").focus(); return; }
  state.sent[s.id] = { at: now(), lang: state.draft.lang, text, recipients: learners(s) };
  $("parentDlg").close(); render(); toast(`Message broadcast to parents/guardians of ${learners(s).toLocaleString()} learners.`);
});
document.querySelectorAll("dialog").forEach((d) => { d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => d.close())); d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); });

// ---------- coordinator ----------
function hoursSvg(levelColor = true) {
  const hrs = state.dayHours.filter((x) => x.h >= 6 && x.h <= 17).map((x) => ({ h: x.h, hi: heatIndex(x.t, x.rh) }));
  if (!hrs.length) return "";
  const W = 600, H = 92, bw = W / hrs.length, max = Math.max(50, ...hrs.map((x) => x.hi)), min = 20, y = (v) => 70 - ((v - min) / (max - min)) * 62;
  const col = (v) => `var(--${FOURH.find((l) => v <= l.max).id})`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Hourly heat index">${hrs.map((x, i) => `<rect x="${i * bw + 4}" y="${y(x.hi)}" width="${bw - 8}" height="${70 - y(x.hi)}" rx="2" fill="${col(x.hi)}"><title>${hh(x.h)} · ${x.hi.toFixed(1)} °C</title></rect><text x="${i * bw + bw / 2}" y="${y(x.hi) - 3}" text-anchor="middle" font-size="11" fill="var(--ink)" font-family="var(--mono)">${Math.round(x.hi)}</text><text x="${i * bw + bw / 2}" y="86" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--mono)">${String(x.h).padStart(2, "0")}</text>`).join("")}</svg>`;
}
function ruler(hi) {
  const lo = 20, top = 50, pct = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (top - lo)) * 100))}%`;
  const bands = [["HAYO", 20, 27], ["HINAY", 27, 33], ["HINGA", 33, 42], ["HINTO", 42, 50]];
  const on = FOURH.find((l) => hi <= l.max).id;
  return `<div class="ruler"><div class="band">${bands.map(([id, a, b]) => `<div class="${id === on ? "on" : ""}" style="flex:${b - a};background:var(--${id})"></div>`).join("")}</div>
    <div class="names">${bands.map(([id, a, b]) => `<span class="${id === on ? "on" : ""}" style="flex:${b - a}">${id}</span>`).join("")}</div>
    <div class="mk" style="left:${pct(hi)}"><b>${hi.toFixed(0)}°C</b></div>
    <div class="city" style="left:${pct(state.cityAuto)}">City ${state.cityAuto}°</div></div>`;
}
function rows(div) {
  return state.schools.map((s, i) => { const p = div.plans[i], ep = effective(s, p); return { s, p, ep, st: status(s), d: state.decisions[s.id] }; });
}
function renderOverview(div) {
  const p0 = div.plans[0], hi = p0.safety.peakHI, L = levelInfo(p0.level), sc = SCENARIOS[state.scenario];
  const R = rows(div), tally = Object.fromEntries(PLAN_ORDER.map((t) => [t, 0])); R.forEach((r) => tally[r.ep.planType]++);
  const n = { none: 0, official: 0, awaiting: 0, returned: 0 }; R.forEach((r) => n[r.st]++);
  const conflicts = R.reduce((c, r) => c + check(r.s, r.ep).length, 0);
  const req = R.filter((r) => r.p.planType === "request");
  const city = p0.city;
  $("main").innerHTML = `
    <section class="card"><div class="strip">
      <div class="stack" style="gap:8px"><span class="cap">PAGASA heat-index forecast · ${esc(state.day)}</span><span class="hero-num">${hi.toFixed(0)}°C</span>${lvlTag(p0.level, L.range)}</div>
      <div class="stack" style="gap:8px"><p class="big">${esc(L.allows)}.</p>${ruler(hi)}${hoursSvg()}</div>
      <div class="rail">
        <div><span class="cap">Answers · cut-off ${state.rule.cutoff}</span><div class="sbar" style="margin-top:8px">${[["official", "s-ok"], ["awaiting", "s-warn"], ["returned", "s-bad"], ["none", "s-none"]].map(([k, c]) => n[k] ? `<div class="${c}" style="flex:${n[k]}"></div>` : "").join("")}</div>
          <div class="counts" style="margin-top:8px"><span><b>${n.official}</b> final</span><span><b>${n.awaiting}</b> waiting for you</span><span class="${n.none ? "warn" : ""}"><b>${n.none}</b> no answer</span></div></div>
        ${req.length ? `<div class="banner"><b>${req.length} schools</b> have cool rooms for ${req.reduce((t, r) => t + r.p.requestSections, 0)} classes on a short day. They may ask to hold face-to-face classes.</div>` : ""}
        <p class="small ${conflicts ? "bad" : "ok"}">${conflicts} scheduling conflicts</p>
        <div class="row"><a class="linkbtn" href="#/decisions">See all schools</a>${pendingApprovals() ? `<a class="linkbtn" href="#/requests">Approvals (${pendingApprovals()})</a>` : ""}</div>
      </div>
      <div class="legal"><label>Iloilo City automatic suspension at <select id="cityAuto">${CITY.autoOptions.map((v) => `<option value="${v}" ${v === state.cityAuto ? "selected" : ""}>${v} °C (reported)</option>`).join("")}</select></label>
        <span>${city ? esc(city.text) : `${CITY.instrument}: not triggered.`}</span><span class="muted">${esc(sc.note)}</span></div>
    </div></section>
    <section class="card" style="padding:0;overflow:hidden">
      <div class="scene div3d" id="divScene"><div class="c3d" id="divC"></div>
        <div class="tools"><div class="seg"><button data-pre="overview" aria-pressed="true">Overview</button><button data-pre="north">North</button><button data-pre="south">South</button></div></div>
        <div class="legend-map">${legendHTML(tally)}</div></div>
      <p class="small muted" style="padding:10px 16px">Tap a school to open it. Column height = classes held at school.</p>
    </section>`;
  $("cityAuto").addEventListener("change", (e) => { state.cityAuto = +e.target.value; state.decisions = {}; state.sent = {}; render(); });
  const vm = { hi, waiting: false, schools: R.map((r) => ({ id: r.s.id, name: r.s.name, lat: r.s.lat, lon: r.s.lon, planType: r.ep.planType, f2fSections: r.ep.f2fSections, requestSections: r.p.requestSections, levelText: r.p.level, planLabel: PLAN_LABEL[r.ep.planType] })) };
  mount($("divC"), "div", vm, { onSelect: (id) => go(`#/school/${id}`) });
  $("main").querySelectorAll("[data-pre]").forEach((b) => b.addEventListener("click", () => { $("divC")._h?.preset(b.dataset.pre); $("main").querySelectorAll("[data-pre]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
}
function renderDecisions(div) {
  const R = rows(div), n = { all: R.length, none: 0, awaiting: 0, official: 0, request: R.filter((r) => r.p.planType === "request").length };
  R.forEach((r) => n[r.st] !== undefined && n[r.st]++);
  const f = state.filter, order = { none: 0, returned: 1, awaiting: 2, official: 3 };
  const shown = R.filter((r) => f === "all" || (f === "request" ? r.p.planType === "request" : r.st === f)).sort((a, b) => order[a.st] - order[b.st] || a.s.name.localeCompare(b.s.name));
  $("main").innerHTML = `<section class="card"><div class="stephead"><h1>Decisions</h1><span class="count">${esc(state.day)}</span></div>
    <div class="seg" role="group" aria-label="Filter">${[["all", "All"], ["none", "No answer"], ["awaiting", "Waiting for you"], ["official", "Final"], ["request", "Cool rooms"]].map(([k, l]) => `<button data-f="${k}" aria-pressed="${f === k}">${l}<span class="n ${n[k] ? "" : "zero"}">${n[k]}</span></button>`).join("")}</div>
    <div class="tbl"><table><thead><tr><th>School</th><th>Plan</th><th>Principal</th><th>Parents</th></tr></thead><tbody>
    ${shown.length ? shown.map((r) => `<tr class="click" data-school="${r.s.id}"><td><b>${esc(r.s.name)}</b></td><td><span class="plan">${sym(r.ep.planType)} ${PLAN_LABEL[r.ep.planType]}</span>${r.p.planType === "request" ? `<div class="reason">cool rooms for ${r.p.requestSections} classes</div>` : ""}</td><td><span class="status ${r.st === "awaiting" ? "awaiting-sdo" : r.st}">${STATUS_TEXT[r.st]}</span>${r.d?.reason ? `<div class="reason">${esc(r.d.reason)}</div>` : ""}</td><td>${state.sent[r.s.id] ? `<span class="ok">Sent ${state.sent[r.s.id].at}</span>` : `<span class="muted">—</span>`}</td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">No schools here. <button class="btn-link" data-f="all">Show all</button></td></tr>`}</tbody></table></div></section>`;
  $("main").querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { state.filter = b.dataset.f; render(); }));
  $("main").querySelectorAll("[data-school]").forEach((t) => t.addEventListener("click", () => go(`#/school/${t.dataset.school}`)));
}
function renderRequests(div) {
  const R = rows(div), wait = R.filter((r) => r.st === "awaiting"), recs = state.requests;
  $("main").innerHTML = `<div class="grid2">
    <section class="card"><h2>Waiting for your approval</h2><p class="small muted">${esc(AUTHORITY)}</p>
      ${wait.length ? wait.map((r) => `<div class="req"><b>${esc(r.s.name)}</b><span>${r.d.choice === "request" ? `Asks for face-to-face classes in cool rooms: ${r.p.requestSections} of ${r.p.sections} classes, ${esc(timesText(applyType(r.p, "split")) || "06:00–10:00 or 14:00–18:00")}` : `Asks to change to <b>${PLAN_LABEL[r.d.choice]}</b> (recommended: ${PLAN_LABEL[r.p.planType]})`}</span>
        <span class="reason">${esc(r.d.reason)} · ${r.d.at}</span>
        ${r.d.choice === "request" ? `<details><summary class="small">Cool rooms (evidence)</summary><ul class="small">${coolEvidence(r.p).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
        <div class="row"><button class="btn-sm primary" data-ok="${r.s.id}">Approve</button><button class="btn-sm" data-back="${r.s.id}">Send back</button></div></div>`).join("") : `<p class="muted">Nothing is waiting.</p>`}</section>
    <section class="card"><h2>Building updates from principals</h2>
      ${recs.length ? recs.map((q) => `<div class="req"><b>${esc(state.schools[+q.school].name)}</b><span>${esc(q.text)}</span><span class="reason">${q.at}</span>${q.status === "pending" ? `<button class="btn-sm" data-rv="${q.id}">Mark as seen</button>` : `<span class="ok small">Seen</span>`}</div>`).join("") : `<p class="muted">No updates yet. Principals send them from their buildings page.</p>`}</section></div>`;
  $("main").querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", () => { const id = b.dataset.ok, d = state.decisions[id]; if (d.choice === "request") state.f2fApproved[id] = true; d.status = "official"; d.at = now(); render(); toast("Approved."); }));
  $("main").querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => { state.decisions[b.dataset.back].status = "returned"; render(); toast("Sent back to the principal."); }));
  $("main").querySelectorAll("[data-rv]").forEach((b) => b.addEventListener("click", () => { state.requests.find((q) => q.id === b.dataset.rv).status = "seen"; render(); }));
}
function reportText(kind, div) {
  const R = rows(div), p0 = div.plans[0], tally = Object.fromEntries(PLAN_ORDER.map((t) => [t, 0])); R.forEach((r) => tally[r.ep.planType]++);
  const counts = PLAN_ORDER.filter((t) => tally[t]).map((t) => `${PLAN_LABEL[t]}: ${tally[t]}`).join("\n");
  const head = `DepEd 4H level: ${p0.level} (PAGASA forecast ${p0.safety.peakHI.toFixed(0)} °C) · ${state.day}`;
  if (kind === "reminders") { const pend = R.filter((r) => r.st === "none"); return { pend, text: `PRESKO reminder: please answer for tomorrow (${p0.level}) before ${state.rule.cutoff}. Reply 1 to agree, or open Presko.` }; }
  if (kind === "mayor") return { text: `Briefing for the City Mayor\n${head}\n\n${counts}\n\nSchools holding some classes at school:\n${R.filter((r) => RANK[r.ep.planType] < 3).map((r) => `- ${r.s.name}: ${PLAN_LABEL[r.ep.planType]}`).join("\n") || "- none"}\n\n${p0.city ? p0.city.text : `${CITY.instrument}: not triggered.`}` };
  return { text: `SDO Iloilo City · Report to DepEd Regional Office VI · as of ${now()}\n${head}\nSchools: ${R.length} · final: ${R.filter((r) => r.st === "official").length} · awaiting SDO: ${R.filter((r) => r.st === "awaiting").length} · no answer: ${R.filter((r) => r.st === "none").length}\nParents notified: ${Object.keys(state.sent).length} schools\n\n${counts}\n\nBasis: DM 064 s. 2026; DO 22 s. 2024; EO 130 s. 2026. Safety Model ${ruleLabel()}.` };
}
function renderMessages(div, sub) {
  const back = `<a class="btn-link" href="#/messages">‹ All messages</a>`;
  if (!sub) {
    const pend = rows(div).filter((r) => r.st === "none").length, last = (k) => (state.comms[k] ? `${state.comms[k].label} ${state.comms[k].at}` : "Not sent");
    $("main").innerHTML = `<section class="card"><h1>Messages</h1><div class="nav2">${[["reminders", "Remind principals", `Text principals who have not answered (cut-off ${state.rule.cutoff})`, pend ? `${pend} not answered` : "All answered"], ["mayor", "Mayor's briefing", "School arrangements for the City Mayor's Office", last("mayor")], ["region", "Regional Office report", "Status report to DepEd Regional Office VI", last("region")]].map(([k, t, d, st]) => `<button data-m="${k}"><span><b>${t}</b><br><span class="small muted">${d}</span></span><span class="small muted">${st}</span><span aria-hidden="true">›</span></button>`).join("")}</div></section>`;
    $("main").querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => go(`#/messages/${b.dataset.m}`)));
    return;
  }
  const r = reportText(sub, div), sent = state.comms[sub];
  if (sub === "reminders") {
    $("main").innerHTML = `<section class="card">${back}<h1>Remind principals</h1>${!r.pend.length ? `<p class="big">Every principal has answered. No reminder needed.</p>` : `
      <p class="ink2">${r.pend.length} principals have not answered.</p><details><summary>Show schools</summary><ul class="small">${r.pend.map((x) => `<li>${esc(x.s.name)}</li>`).join("")}</ul></details>
      <label for="remText" class="cap">Message</label><textarea id="remText">${esc(state.reminderDraft ?? r.text)}</textarea>
      <button class="btn-primary" id="remSend">Send to ${r.pend.length} principals</button>${sent ? `<p class="ok">Sent ${sent.at} to ${sent.n}</p>` : ""}`}</section>`;
    $("remText")?.addEventListener("input", (e) => (state.reminderDraft = e.target.value));
    $("remSend")?.addEventListener("click", () => { state.comms.reminders = { at: now(), n: r.pend.length, label: "Sent" }; toast(`Reminder sent to ${r.pend.length} principals.`); render(); });
    return;
  }
  const mayor = sub === "mayor";
  $("main").innerHTML = `<section class="card">${back}<h1>${mayor ? "Mayor's briefing" : "Regional Office report"}</h1><div class="out">${esc(r.text)}</div>
    <div class="row"><button class="btn-primary" id="docSend">${mayor ? "Mark as sent" : "Mark as submitted"}</button><button id="docCopy">Copy text</button>${sent ? `<span class="ok">${sent.label} ${sent.at}</span>` : ""}</div></section>`;
  $("docCopy").addEventListener("click", async (e) => { try { await navigator.clipboard.writeText(r.text); e.target.textContent = "Copied"; } catch { e.target.textContent = "Copy failed"; } });
  $("docSend").addEventListener("click", () => { state.comms[sub] = { at: now(), label: mayor ? "Sent" : "Submitted" }; render(); });
}
function renderRules(div) {
  const r = state.rule, lim = (k, step = 1) => `<input type="number" step="${step}" data-lim="${k}" value="${LIMITS[k]}" style="width:90px" aria-label="${k}">`;
  const ex = div.plans.find((p) => p.planType === "home" && reasons(p).length);
  $("main").innerHTML = `<div class="grid2">
    <section class="card"><div class="stephead"><h1>Rules</h1><span class="${r.approvedBy ? "ok" : "warn"}">${r.approvedBy ? `Safety Model ${ruleLabel()} approved ${r.approvedAt}` : `Safety Model ${ruleLabel()} not approved`}</span></div>
      <h2>1 · DepEd 4H level (DM 064 s. 2026)</h2>
      <div class="tbl"><table><tbody>${FOURH.map((l) => `<tr><td>${lvlTag(l.id)}</td><td class="mono">${l.range}</td><td>${esc(l.allows)}</td></tr>`).join("")}</tbody></table></div>
      <p class="small ink2">${esc(AUTHORITY)} ${esc(EO130)}</p>
      <h2>2 · Hard stops</h2>
      <div class="row">No school at all from ${lim("dayVetoHI")} °C · Session cancelled if the walk reaches ${lim("commuteVetoHI")} °C (heat index in the sun)</div>
      <h2>3 · Safe rooms (Safety Model)</h2>
      <p class="small ink2">Presko estimates the heat inside each building hour by hour (roof, floors, airflow, shade, number of pupils, fans) and corrects it with the school's own 8 AM, 12 noon and 2 PM readings. A room is used only while it stays under the unsafe line; on a Hinga day, a request for face-to-face classes needs rooms that stay under the caution line.</p>
      <div class="row">Caution from WBGT ${lim("classCautionWBGT", 0.5)} · Unsafe from WBGT ${lim("classUnsafeWBGT", 0.5)}</div>
      ${ex ? `<div class="well small"><b>Example of a recorded reason · ${esc(state.schools.find((s) => s.id === ex.school).name)}</b>${reasons(ex).slice(0, 3).map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
      <label class="row">Principals answer by <input id="cutoff" type="time" value="${r.cutoff}"></label>
      <button class="primary" id="approve" ${r.approvedBy ? "disabled" : ""}>${r.approvedBy ? "Approved" : `Approve Safety Model ${ruleLabel()}`}</button></section>
    <section class="card"><h2>Sources</h2><ul class="small">${Object.values(SOURCES).map((x) => `<li><a href="${x.url}" target="_blank" rel="noopener">${esc(x.label)}</a></li>`).join("")}</ul>
      <p class="small muted">Primary texts of DM 064, EO 130 and DO 22 could not be read (sites returned 403); rules follow the reporting above. DO 37 s. 2022 was repealed by DO 22 s. 2024.</p></section></div>`;
  $("main").querySelectorAll("[data-lim]").forEach((el) => el.addEventListener("change", () => { const v = +el.value; if (!Number.isFinite(v)) return; LIMITS[el.dataset.lim] = v; r.version += 1; r.approvedBy = null; r.approvedAt = null; state.decisions = {}; state.sent = {}; render(); }));
  $("cutoff").addEventListener("change", (e) => { r.cutoff = e.target.value || "17:00"; render(); });
  $("approve").addEventListener("click", () => { r.approvedBy = state.user.email; r.approvedAt = `${new Date().toISOString().slice(0, 10)} ${now()}`; render(); });
}

// per-school dashboard (season history simulated by running the same rules over a modelled 2026 hot season)
function rand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SEASON = (() => { const out = [], d = new Date(Date.UTC(2026, 2, 2)), end = Date.UTC(2026, 4, 29), r = rand(42);
  while (d.getTime() <= end) { const wd = d.getUTCDay(); if (wd > 0 && wd < 6) { const t = out.length, peak = Math.exp(-((t - 38) ** 2) / (2 * 14 ** 2)); out.push({ date: d.toISOString().slice(0, 10), pm: Math.round((29 + 15 * peak + 5 * (r() - 0.5)) * 10) / 10 }); } d.setUTCDate(d.getUTCDate() + 1); }
  return out; })();
const seasonCache = new Map(), histCache = {};
const seasonHours = (day) => { if (!seasonCache.has(day.date)) seasonCache.set(day.date, shiftToPeak(fillSolar(DEMO_CLOSURE), day.pm)); return seasonCache.get(day.date); };
const OVR = ["Water supply interrupted", "Quarterly examinations", "Power outage; fans not working", "Classrooms used as evacuation centre", "Parents' transport arrangements"];
function seasonHistory(s) {
  if (histCache[s.id]) return histCache[s.id];
  const r = rand(5000 + +s.id * 131), rel = 0.6 + r() * 0.38;
  return (histCache[s.id] = SEASON.map((day) => { const p = planSchool4H(s, seasonHours(day), { forecastHI: day.pm }); const x = r(); const resp = x < rel ? "ontime" : x < rel + (1 - rel) * 0.7 ? "late" : "none"; let type = p.planType === "request" ? (r() < 0.4 ? "split" : "home") : p.planType, reason = "";
    if (resp !== "none" && r() < 0.08 && type !== "stop" && type !== "home") { type = "home"; reason = OVR[Math.floor(r() * OVR.length)]; }
    return { ...day, level: p.level, rec: p.planType, type, resp, reason }; }));
}
function renderSchoolDash(id, div) {
  const s = state.schools.find((x) => x.id === id);
  if (!s) { $("main").innerHTML = `<section class="card"><p>School not found.</p><a class="btn-link" href="#/">Back</a></section>`; return; }
  const p = div.plans[state.schools.indexOf(s)], ep = effective(s, p), h = seasonHistory(s), d = state.decisions[s.id];
  const c = Object.fromEntries(PLAN_ORDER.map((t) => [t, 0])); h.forEach((x) => c[x.type]++);
  const onTime = h.filter((x) => x.resp === "ontime").length, overs = h.filter((x) => x.reason);
  const fmt = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  $("main").innerHTML = `<a class="btn-link" href="#/">‹ Back to overview</a>
    <div class="body2"><div class="stack">
      <section class="hero" style="--lvl:var(--${p.level})"><span class="cap">${esc(s.name)} · tomorrow</span><div class="row">${lvlTag(p.level, `${Math.round(p.safety.peakHI)}°C`)}<span class="plan big">${sym(ep.planType, 22)} ${PLAN_LABEL[ep.planType]}</span></div>
        <p>${STATUS_TEXT[status(s)]}${d?.reason ? ` · ${esc(d.reason)}` : ""}${state.sent[s.id] ? ` · parents told ${state.sent[s.id].at}` : ""}</p>
        ${reasons(p).length ? `<details><summary class="small">Recorded reasons (EO 130)</summary><ul class="small">${reasons(p).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}</section>
      <div class="kpis">${[["Regular days", c.full], ["Short days", c.split + c.splitPartial], ["Home-based", c.home], ["No classes", c.stop], ["Answered on time", `${Math.round((onTime / h.length) * 100)}%`], ["Changed by principal", overs.length]].map(([l, v]) => `<div class="card"><span class="cap">${l}</span><span class="kpi">${v}</span></div>`).join("")}</div>
      <section class="card"><div class="stephead"><h2>This season</h2><span class="small muted">${fmt(SEASON[0].date)} – ${fmt(SEASON.at(-1).date)} · ${SEASON.length} school days</span></div>
        <div class="strip2">${h.map((x) => `<i style="background:var(--${x.type})" title="${fmt(x.date)}: ${x.level} · ${PLAN_LABEL[x.type]}${x.reason ? ` (${esc(x.reason)})` : ""}"></i>`).join("")}</div>
        <div class="legend-row">${legendHTML(c)}</div>
        <p class="small muted">Demo data: simulated by running the same rules over a modelled 2026 hot season. Principal answers are simulated.</p>
        ${overs.length ? `<details><summary>Changes by the principal (${overs.length})</summary><table><tbody>${overs.map((x) => `<tr><td class="mono">${fmt(x.date)}</td><td>${PLAN_LABEL[x.rec]} → ${PLAN_LABEL[x.type]}</td><td>${esc(x.reason)}</td></tr>`).join("")}</tbody></table></details>` : ""}</section>
    </div><div class="stack">
      <section class="card"><h2>Buildings</h2><div class="scene sch" id="schScene"></div>
        <div class="tbl"><table><thead><tr><th>Building</th><th class="num">Rooms</th><th>Features</th><th>Tomorrow</th></tr></thead><tbody>${s.buildings.map((b) => `<tr><td><b>${esc(b.name)}</b><div class="reason mono">NSBI ${esc(b.nsbi.buildingNo)} · ${esc(b.nsbi.type)} · ${b.nsbi.storeys} storey${b.nsbi.storeys > 1 ? "s" : ""}</div></td><td class="num">${b.rooms}</td><td class="small">${esc(traits(b).join(", ") || "none recorded")}</td><td><span class="flag ${flagOf(p, b)}">${FLAG_WORD[flagOf(p, b)]}</span></td></tr>`).join("")}</tbody></table></div>
        ${state.requests.filter((q) => q.school === s.id).map((q) => `<p class="small">Update from principal · ${q.at}: ${esc(q.text)}</p>`).join("")}</section>
    </div></div>`;
  mount($("schScene"), "school", schoolVM(s, ep));
}

// ---------- render ----------
function render() {
  disposeScenes(); header();
  if (!state.user) return renderLogin();
  if (state.user.role === "head") return renderHead();
  const div = divisionPlan(), [r0, r1] = route();
  if (r0 === "decisions") renderDecisions(div);
  else if (r0 === "requests") renderRequests(div);
  else if (r0 === "messages") renderMessages(div, r1);
  else if (r0 === "rules") renderRules(div);
  else if (r0 === "school") renderSchoolDash(r1, div);
  else renderOverview(div);
}
function loadScenario() {
  const sc = SCENARIOS[state.scenario].make();
  if (sc.day !== state.day || sc.f !== state.forecastHI) { state.decisions = {}; state.sent = {}; state.smsThread = {}; state.f2fApproved = {}; }
  state.dayHours = sc.hours; state.forecastHI = sc.f; state.day = sc.day;
  render();
}
fetch("https://api.open-meteo.com/v1/forecast?latitude=10.72&longitude=122.56&hourly=temperature_2m,relative_humidity_2m,shortwave_radiation&timezone=Asia%2FManila&forecast_days=3")
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((d) => { const days = {}; d.hourly.time.forEach((t, i) => { const [day, h2] = t.split("T"); const h = +h2.slice(0, 2); if (h >= 6 && h <= 17) (days[day] ??= []).push({ h, t: d.hourly.temperature_2m[i], rh: d.hourly.relative_humidity_2m[i], sw: d.hourly.shortwave_radiation[i] }); });
    state.forecastDays = days; state.live = true; if (state.scenario === "live" || state.scenario === "hinay") loadScenario(); })
  .catch(() => {});
state.view3d = prefers3D();
loadScenario();
