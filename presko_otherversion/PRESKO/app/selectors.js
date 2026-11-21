// Presko view model: one planDivision per state version, read by both the 3D/2D scenes and the panels.
// Scenes never import engine.js. See WEBAPP-PLAN.md §5, §9.
import {
  makeDivision, withDay, planDivision, planSchool, check, decisionStatus, statusSentence, staleCause, morningChange,
  band, levelInfo, cityOverlay, slotsFor, MODES, REPLAYS, ILOILO_HEAT, calibrate, HOME,
} from "../engine.js";
import { slug } from "./store.js";
import { msgDate } from "./messages.js";

export const LEVEL_TEXT = { HAYO: "HAYO <27°C", HINAY: "HINAY 27–32°C", HINGA: "HINGA 33–41°C", HINTO: "HINTO ≥42°C" };
const realSlot = (a) => a.slot !== HOME && a.slot !== "none";

function roofType(features) {
  if (features.roof_no_ceiling) return "bare";
  if (features.ceiling_or_insulated) return "slab";
  return "plain";
}

/** Per-school view: plan (official basis), proposed plan, checks, status, 3D fields. */
function schoolView(s, sd, plan, hi, date, isToday) {
  const problems = check(sd, plan).concat(check(sd, plan, { asRequest: true }));
  const status = plan.decision;
  const d = sd.decision;
  const proposed = d && ["awaiting-sdo", "returned"].includes(status) ? planSchool(sd, hi, { forDate: date, proposed: true }) : null;
  const slots = slotsFor(sd);
  const litSlots = [...new Set(plan.assignments.filter(realSlot).map((a) => a.slot))].map((id) => ({ id, start: slots[id].start, end: slots[id].end, label: slots[id].label }));
  const emptiedSet = new Set(plan.rooms.filter((r) => r.excluded).map((r) => r.building));
  const lastSent = sd.sent?.length ? sd.sent[sd.sent.length - 1] : null;
  return {
    id: s.id, slug: s.slug || slug(s.name), name: s.name, lat: s.lat, lon: s.lon, kind: s.kind,
    plan, proposed, problems, status, sentence: statusSentence(sd, hi, { forDate: date }),
    cause: status === "stale-inputs" ? staleCause(sd, hi) : [],
    decision: d, sent: sd.sent || [], water: sd.water !== false, readings: sd.readings || {},
    level: plan.level, levelText: LEVEL_TEXT[plan.level], planType: plan.mode, planLabel: modeLabel(plan),
    f2fSections: plan.assignments.filter(realSlot).length,
    requestSections: plan.request ? plan.request.filter(realSlot).length : 0,
    litSlots,
    buildings: s.buildings.map((b) => ({ id: b.id, name: b.name, rooms: b.rooms, storeys: b.storeys || (b.note && /three-storey/i.test(b.note) ? 3 : /two-storey/i.test(b.note || "") ? 2 : 1),
      flag: band(b.features).band, points: band(b.features).total, roofType: roofType(b.features), emptied: emptiedSet.has(b.id),
      reading: sd.readings?.[b.id] ?? null, note: b.note, features: b.features, source: b.source, evidence: b.evidence, buildingLevel: plan.levels.byBuilding[b.id] })),
    morning: isToday ? morningChange(sd, hi) : null,
    correction: lastSent && lastSent.level !== plan.level ? { from: lastSent.level, to: plan.level, ready: status === "official" } : null,
    provenance: s.provenance || {},
  };
}

export function modeLabel(plan) {
  return plan.mode === "splitPartial" && plan.level === "HAYO" ? "Regular day + some at home" : MODES[plan.mode];
}

/**
 * viewModel(store, { date, preview })
 * - date: the day shown (planDate).
 * - preview: true → evaluate the coordinator's draft forecast (admin only, never saved).
 */
const memos = new WeakMap(); // per store
export function viewModel(store, { date, preview = false } = {}) {
  if (!memos.has(store)) memos.set(store, new Map());
  const memo = memos.get(store);
  const key = `${store.version}|${date}|${preview}|${store.state.draft.hi}`;
  if (memo.has(key)) return memo.get(key);
  if (memo.size > 20) memo.clear();
  const d = store.day(date);
  const forecast = d.forecast;
  const hi = preview ? store.state.draft.hi : forecast?.hi;
  const schools = store.schools();
  let vm;
  if (hi == null) {
    vm = { date, waiting: true, forecast: null, preview, schools: schools.map((s) => ({ id: s.id, slug: s.slug, name: s.name, lat: s.lat, lon: s.lon })) };
  } else {
    const sd = schools.map((s) => withDay(s, d));
    const div = planDivision(sd, hi, { forDate: date, officialOnly: true });
    const isToday = date === store.state.today;
    const views = schools.map((s, i) => schoolView(s, sd[i], div.plans[i], hi, date, isToday));
    const conflicts = views.reduce((a, v) => a + v.problems.length, 0);
    vm = {
      date, preview, waiting: false, hi, forecast, level: levelLevel(hi), levelText: LEVEL_TEXT[levelLevel(hi)], allows: levelInfo(levelLevel(hi)).allows,
      city: cityOverlay(hi, store.state.cityAuto),
      tally: div.tally, decisions: div.decisions, requestSections: div.requestSections, sections: div.sections, homeSections: div.homeSections,
      checkFirst: div.checkFirst, keptPct: div.normalLH ? Math.round((100 * div.keptLH) / div.normalLH) : 0, withReadings: div.withReadings,
      noClassesAnywhere: div.tally.stop === schools.length, conflicts, schools: views,
      missing: views.filter((v) => ["none", "stale-forecast", "stale-inputs", "returned"].includes(v.status)).sort((a, b) => (a.status === "none" ? -1 : 0) - (b.status === "none" ? -1 : 0)),
    };
  }
  memo.set(key, vm);
  return vm;
}
function levelLevel(hi) { return hi < 27 ? "HAYO" : hi < 33 ? "HINAY" : hi < 42 ? "HINGA" : "HINTO"; }

/** Replay view model on a fresh copy: never touches the store. Driven by PAGASA's reported figure. */
export function replayViewModel(id) {
  const r = REPLAYS.find((x) => x.id === id);
  const hi = ILOILO_HEAT.pagasa[id];
  const schools = makeDivision().map((s) => ({ ...s, slug: slug(s.name) }));
  const sd = schools.map((s) => withDay(s, null));
  const div = planDivision(sd, hi, { forDate: id, officialOnly: true });
  const views = schools.map((s, i) => schoolView(s, sd[i], div.plans[i], hi, id, false));
  return {
    replay: r, hi, raw: ILOILO_HEAT.raw[id], calibrated: calibrate(ILOILO_HEAT.raw[id]), level: levelLevel(hi), levelText: LEVEL_TEXT[levelLevel(hi)],
    tally: div.tally, requestSections: div.requestSections, sections: div.sections, schools: views, conflicts: views.reduce((a, v) => a + v.problems.length, 0),
  };
}

/** Status of one school's decision for a date (convenience for panels and tests). */
export function statusOf(store, date, schoolId) {
  const d = store.day(date), s = store.school(schoolId);
  return d.forecast ? decisionStatus(withDay(s, d), d.forecast.hi, { forDate: date }) : "none";
}

/** Setup progress for a school: which of the three parts the school has entered itself. */
export function setupProgress(s) {
  const parts = [["buildings", "buildings"], ["timetable", "timetable"], ["sections", "sections"]];
  const entered = parts.filter(([k]) => typeof s.provenance?.[k] === "object");
  return { done: entered.length, total: parts.length, missing: parts.filter(([k]) => typeof s.provenance?.[k] !== "object").map(([, l]) => l) };
}

/**
 * "Updates" for the signed-in role, derived from the store (no push; honest in-app notifications).
 * Returns [{ tone: "ok"|"warn"|"bad"|"", text, at }] where `at` is an ISO time or null.
 */
export function updatesFor(store) {
  const role = store.role();
  if (!role) return [];
  const today = store.state.today, tmr = store.tomorrow();
  const fT = store.day(today).forecast, fN = store.day(tmr).forecast;
  const D = (iso) => msgDate(iso);
  const out = [];
  const push = (tone, text, at = null) => out.push({ tone, text, at });
  if (role.kind === "coordinator" || role.kind === "sdo") {
    const vm = viewModel(store, { date: tmr });
    if (!fN) push("warn", role.kind === "coordinator" ? `Schools are waiting for the forecast for ${D(tmr)}. Publish by 16:00 so heads have an hour.` : `No forecast for ${D(tmr)} yet. Decisions arrive after the coordinator publishes.`);
    else {
      push("", `Forecast for ${D(tmr)}: ${fN.hi}°C ${fN.status}, published by ${fN.by}.`, fN.publishedAt);
      const dc = vm.decisions || {};
      if (role.kind === "sdo") push(dc["awaiting-sdo"] ? "warn" : "ok", dc["awaiting-sdo"] ? `${dc["awaiting-sdo"]} decision${dc["awaiting-sdo"] === 1 ? " awaits" : "s await"} you for ${D(tmr)}.` : `Nothing awaits you for ${D(tmr)} right now.`);
      else {
        if (dc.none) push("warn", `${dc.none} schools have no decision yet for ${D(tmr)}.`);
        if (dc["awaiting-sdo"]) push("", `${dc["awaiting-sdo"]} awaiting the SDO approver.`);
      }
      if (dc.returned) push("", `${dc.returned} returned to the school head.`);
    }
    if (fT) {
      const vt = viewModel(store, { date: today });
      if (vt.withReadings) push("", `8:00 readings in from ${vt.withReadings} schools today.`);
      const re = vt.decisions?.["stale-inputs"] ?? 0;
      if (re) push("bad", `${re} school${re === 1 ? "" : "s"} must re-confirm today after the 8:00 readings.`);
    }
    return out;
  }
  const s = role.schoolId != null ? store.school(role.schoolId) : null;
  if (!s) return out;
  if (role.kind === "custodian") {
    const p = setupProgress(s);
    push(p.done === p.total ? "ok" : "warn", `Setup: ${p.done} of ${p.total} parts entered by the school${p.missing.length ? ` (still illustrative: ${p.missing.join(", ")})` : ""}.`);
    return out;
  }
  if (role.kind === "teacher") {
    if (!fT) push("warn", `No forecast was published for today (${D(today)}). Ask the coordinator; you can note readings on paper meanwhile.`);
    else {
      const n = Object.keys(store.day(today).readings[s.id] || {}).length;
      push(n === s.buildings.length ? "ok" : "warn", `${n} of ${s.buildings.length} buildings read today.`);
    }
    return out;
  }
  // head
  if (!fN) push("warn", `No forecast for ${D(tmr)} yet. Usually published by 16:00. Open this page again then.`);
  else {
    push("", `Forecast for ${D(tmr)}: ${fN.hi}°C ${fN.status}.`, fN.publishedAt);
    const v = viewModel(store, { date: tmr }).schools.find((x) => x.id === s.id);
    const d = v?.decision;
    if (v.status === "none") push("warn", `Record the level for ${D(tmr)} before 17:00.`);
    else if (v.status === "returned") push("bad", `The SDO returned your ${d.level} request: “${d.sdoNote}”${/[.!?]$/.test(d.sdoNote) ? "" : "."} Accept the rule level or revise it below.`, d.sdoAt);
    else if (v.status === "awaiting-sdo") push("warn", `Your ${d.level} request is waiting for the SDO approver.`, d.at);
    else if (v.status === "stale-forecast") push("bad", `The forecast changed after you recorded ${d.level}. Re-confirm below.`);
    else if (v.status === "stale-inputs") push("bad", `${v.sentence}. Re-confirm below.`);
    else if (v.status === "official") {
      if (d.sdo === "approved") push("ok", `The SDO approved your ${d.level} request.`, d.sdoAt);
      push(v.sent.some((x) => x.level === v.level) ? "ok" : "warn", v.sent.some((x) => x.level === v.level) ? `Official ${v.level} for ${D(tmr)}; parent message marked sent.` : `Official ${v.level} for ${D(tmr)}. Copy the message and send it to parents.`);
    }
  }
  if (fT) {
    const vt = viewModel(store, { date: today }).schools.find((x) => x.id === s.id);
    if (vt.status === "stale-inputs" || (vt.status === "none" && vt.morning?.levelChange)) push("bad", `8:00 readings call for ${vt.morning?.levelChange?.to || vt.level} today. Re-confirm today's level.`);
  }
  return out;
}
