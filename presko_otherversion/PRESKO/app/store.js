// Presko web app store: dated per-day inputs, permissions enforced in every action, persistence.
// Pure ES module (no DOM); runs in the browser and in Node tests. See WEBAPP-PLAN.md §2, §3, §9.
import { SCHOOLS_OSM } from "../schools-data.js";
import { makeDivision, withDay, recordDecision as engineRecord, sdoSignOff as engineSignOff, decisionStatus, levels, keywordFeatures } from "../engine.js";

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = `presko:v${SCHEMA_VERSION}`;

/** Stable hash of the school roster, so saved overrides are discarded if the data file changes. */
export function rosterHash(list = SCHOOLS_OSM) {
  let h = 5381;
  for (const ch of list.map((s) => s[0]).join("|")) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
export const slug = (name) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return isoDate(new Date(y, m - 1, d + n)); };

export const ROLES = {
  coordinator: { mode: "admin", label: "DRRM coordinator (SDO)" },
  sdo: { mode: "admin", label: "SDO approver" },
  head: { mode: "school", label: "School head" },
  teacher: { mode: "school", label: "Teacher on duty" },
  custodian: { mode: "school", label: "Property custodian" },
};

// Demo seed (WEBAPP-PLAN.md §9): runs once, on the first Publish at 38 °C.
export const DEMO = {
  hi: 38,
  override: { name: "Jibao-an Elementary School", level: "HINAY", reason: "New ceiling fans and cross-ventilation in all rooms" },
  official: ["Ungka II Elementary School", "Bito-on Elementary School", "Sambag Elementary School"],
  pandac: "Pandac Elementary School",
};

export class PermissionError extends Error {}
const deny = (msg) => { throw new PermissionError(msg); };

const emptyDay = () => ({ forecast: null, water: {}, readings: {}, decisions: {}, sent: {} });

function initialState(today) {
  return {
    schemaVersion: SCHEMA_VERSION, rosterHash: rosterHash(), today,
    days: {}, cityAuto: 42, draft: { hi: DEMO.hi, status: "final" },
    setupOverrides: {}, role: { kind: "coordinator", name: "Coordinator", schoolId: null },
    demo: { armed: true, seeded: false },
  };
}

/**
 * createStore({ storage, now, today })
 * - storage: { getItem, setItem, removeItem } (localStorage in the browser; a Map-backed stub in tests), or null.
 * - now: () => Date, for timestamps.
 */
export function createStore({ storage = null, now = () => new Date(), today } = {}) {
  let state = initialState(today || isoDate(now()));
  let version = 0, replay = null;
  const listeners = new Set();
  const notices = [];
  let storageOk = true;

  // ---- persistence (inputs only) ----
  function load() {
    if (!storage) return;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.schemaVersion !== SCHEMA_VERSION) { notices.push("Saved data was from an older version and was cleared."); return; }
      if (saved.rosterHash !== rosterHash()) { notices.push("The school list changed, so saved setup edits and days were cleared."); return; }
      state = { ...initialState(today || saved.today), ...saved, today: today || saved.today };
    } catch { storageOk = false; }
  }
  function save() {
    if (!storage) return;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOk = true; } catch { storageOk = false; }
  }
  load();

  // ---- schools: baseline + setup overrides (by id and name) ----
  let cachedSchools = null, cachedFor = -1;
  function schools() {
    if (cachedFor === version && cachedSchools) return cachedSchools;
    cachedSchools = makeDivision().map((s) => {
      const o = state.setupOverrides[s.id];
      const prov = { buildings: "illustrative", sections: "illustrative", timetable: s.timetable.source === "illustrative default" ? "illustrative" : "news-reported" };
      const base = { ...s, slug: slug(s.name), provenance: { ...prov } };
      if (!o || o.name !== s.name) return base;
      const out = { ...base, provenance: { ...prov, ...(o.provenance || {}) } };
      if (o.buildings) out.buildings = o.buildings;
      if (o.sections) out.sections = o.sections;
      if (o.timetable) { out.timetable = o.timetable; out.doubleShift = o.timetable.shifts.length === 2; }
      return out;
    });
    cachedFor = version;
    return cachedSchools;
  }
  const school = (id) => schools().find((s) => s.id === id) || deny(`Unknown school ${id}.`);
  const bySlug = (sl) => schools().find((s) => s.slug === sl) || null;
  const day = (date) => state.days[date] || emptyDay();
  const ensureDay = (date) => (state.days[date] ||= emptyDay());

  // ---- permissions ----
  const role = () => state.role;
  function need(kinds, schoolId) {
    if (replay) deny("Replay is on: actions are locked. Exit replay first.");
    const r = state.role;
    if (!kinds.includes(r.kind)) deny(`Only ${kinds.map((k) => ROLES[k].label).join(" or ")} can do this.`);
    if (schoolId != null && ROLES[r.kind].mode === "school" && r.schoolId !== schoolId) deny("You can only act for your own school.");
  }
  const tomorrow = () => addDays(state.today, 1);
  const operable = (date) => date === state.today || date === tomorrow() || deny("Decisions can only be made for today or tomorrow.");

  function commit() { version++; save(); listeners.forEach((f) => f()); }

  // ---- actions ----
  const actions = {
    setRole(kind, { name, schoolId = null } = {}) {
      if (!ROLES[kind]) deny(`Unknown role ${kind}.`);
      if (ROLES[kind].mode === "school" && schoolId == null) deny("Pick a school for school mode.");
      state.role = { kind, name: (name || state.role.name || "").trim() || ROLES[kind].label, schoolId: ROLES[kind].mode === "school" ? schoolId : null };
      commit();
    },
    setDraft(hi, status = state.draft.status) {
      need(["coordinator"]);
      const v = Number(hi);
      if (!Number.isFinite(v) || v < 20 || v > 60) deny("Enter a heat index between 20 and 60 °C.");
      state.draft = { hi: Math.round(v * 10) / 10, status };
      commit();
    },
    /** Decisions for `date` that become stale-forecast if the draft is published. */
    republishImpact(date) {
      const d = day(date), hi = state.draft.hi;
      let stale = 0, restored = 0;
      for (const s of schools()) {
        const dec = d.decisions[s.id];
        if (!dec) continue;
        const cur = d.forecast ? decisionStatus(withDay(s, d), d.forecast.hi, { forDate: date }) : "none";
        const next = decisionStatus(withDay(s, d), hi, { forDate: date });
        if (next === "stale-forecast" && cur !== "stale-forecast") stale++;
        if (cur === "stale-forecast" && next !== "stale-forecast") restored++;
      }
      return { stale, restored };
    },
    publishForecast(date) {
      need(["coordinator"]);
      if (date !== tomorrow() && date !== state.today) deny("Publish for today or tomorrow.");
      const d = ensureDay(date);
      d.forecast = { hi: state.draft.hi, status: state.draft.status, source: "PAGASA", publishedAt: now().toISOString(), by: state.role.name };
      if (state.demo.armed && !state.demo.seeded && d.forecast.hi === DEMO.hi) seedDemo(date);
      commit();
    },
    setCityThreshold(v) {
      need(["coordinator"]);
      if (![40, 41, 42].includes(+v)) deny("Choose 40, 41 or 42 °C.");
      state.cityAuto = +v; commit();
    },
    recordDecision(date, schoolId, { level, reason = "", kind } = {}) {
      need(["head"], schoolId); operable(date);
      const d = day(date);
      if (!d.forecast) deny("Wait for the SDO's forecast before recording a decision.");
      const s = school(schoolId);
      const dec = engineRecord(withDay(s, d), d.forecast.hi, { level, by: state.role.name, reason, forDate: date, at: now().toISOString(), kind: kind || (date === state.today ? "morning" : "evening") });
      ensureDay(date).decisions[schoolId] = dec;
      commit();
      return dec;
    },
    signOff(date, schoolId, decisionId, status, note = "") {
      need(["sdo"]);
      const d = day(date), s = school(schoolId), dec = d.decisions[schoolId];
      if (!dec) deny("No decision to sign off.");
      const currentStatus = d.forecast ? decisionStatus(withDay(s, d), d.forecast.hi, { forDate: date }) : "none";
      if (dec.id !== decisionId) deny("A newer decision exists for this school.");
      d.decisions[schoolId] = engineSignOff(dec, status, note, { currentStatus, latestId: dec.id, at: now().toISOString() });
      commit();
    },
    setReading(date, schoolId, buildingId, value) {
      need(["teacher", "head"], schoolId);
      if (date !== state.today) deny("Readings are for today only.");
      const s = school(schoolId);
      if (!s.buildings.some((b) => b.id === buildingId)) deny("Unknown building.");
      const d = ensureDay(date), r = (d.readings[schoolId] ||= {});
      if (value === "" || value == null) delete r[buildingId];
      else {
        const v = Number(value);
        if (!Number.isFinite(v) || v < 20 || v > 55) deny("Enter an indoor heat index between 20 and 55 °C, or leave it empty.");
        r[buildingId] = Math.round(v * 10) / 10;
      }
      commit();
    },
    setWater(date, schoolId, available) {
      need(["head"], schoolId); operable(date);
      ensureDay(date).water[schoolId] = !!available;
      commit();
    },
    editSetup(schoolId, patch) {
      need(["custodian", "head"], schoolId);
      const s = school(schoolId);
      const o = (state.setupOverrides[schoolId] ||= { name: s.name, provenance: {} });
      const stamp = { label: "entered", by: state.role.name, at: now().toISOString() };
      if (patch.buildings) {
        o.buildings = patch.buildings.map((b) => ({ ...b, storeys: Math.max(1, Math.round(b.storeys || 1)), rooms: Math.max(1, Math.round(b.rooms)) }));
        o.provenance.buildings = stamp;
      }
      if (patch.sections) { o.sections = patch.sections; o.provenance.sections = stamp; }
      if (patch.timetable) {
        for (const [a, b] of patch.timetable.shifts) if (!(b > a)) deny("Each shift must end after it starts.");
        o.timetable = { shifts: patch.timetable.shifts.map((x) => [...x]), source: "entered by the school" };
        o.provenance.timetable = stamp;
      }
      commit();
    },
    /** Update one building's note and features (features from Claude or the keyword fallback). */
    setBuildingNote(schoolId, buildingId, note, { features, source = "keywords", evidence = "" } = {}) {
      const s = school(schoolId);
      const buildings = s.buildings.map((b) => (b.id === buildingId ? { ...b, note, features: features || keywordFeatures(note), source, evidence } : b));
      actions.editSetup(schoolId, { buildings });
    },
    markSent(date, schoolId, channel) {
      need(["head"], schoolId);
      const d = day(date), s = school(schoolId);
      if (!d.forecast || decisionStatus(withDay(s, d), d.forecast.hi, { forDate: date }) !== "official") deny("Only an official message can be marked as sent.");
      const lvl = levels(withDay(s, d), d.forecast.hi, { forDate: date, officialOnly: true }).effective;
      const list = (ensureDay(date).sent[schoolId] ||= []);
      list.push({ level: lvl, channel, at: now().toISOString() });
      commit();
    },
    setToday(iso) { state.today = iso; commit(); },
    demoReset() {
      if (storage) try { storage.removeItem(STORAGE_KEY); } catch {}
      const keepToday = state.today;
      state = initialState(keepToday);
      replay = null;
      commit();
    },
    startReplay(id) { replay = id; version++; listeners.forEach((f) => f()); },
    exitReplay() { replay = null; version++; listeners.forEach((f) => f()); },
  };

  function seedDemo(date) {
    const d = ensureDay(date), hi = d.forecast.hi, at = now().toISOString();
    const find = (name) => schools().find((s) => s.name === name);
    const o = find(DEMO.override.name);
    if (o) d.decisions[o.id] = engineRecord(withDay(o, d), hi, { level: DEMO.override.level, reason: DEMO.override.reason, by: "Demo head", forDate: date, at, system: true });
    for (const name of DEMO.official) {
      const s = find(name);
      if (!s) continue;
      const rec = levels(withDay(s, d), hi).recommended;
      d.decisions[s.id] = engineRecord(withDay(s, d), hi, { level: rec, by: "Demo head", forDate: date, at, system: true });
    }
    state.demo = { armed: false, seeded: true };
  }

  return {
    get state() { return state; },
    get version() { return version; },
    get replay() { return replay; },
    get storageOk() { return storageOk; },
    notices, schools, school, bySlug, day, role, tomorrow, actions,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** Map-backed storage for tests. Pass { fail: true } to simulate a browser that refuses storage. */
export function memoryStorage({ fail = false } = {}) {
  const m = new Map();
  return {
    getItem: (k) => { if (fail) throw new Error("blocked"); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (fail) throw new Error("blocked"); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _map: m,
  };
}
