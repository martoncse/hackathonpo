// Presko web app store: dated per-day inputs, permissions enforced in every action, persistence.
// Pure ES module (no DOM); runs in the browser and in Node tests. See WEBAPP-PLAN.md §2, §3, §9.
import { SCHOOLS_OSM } from "../schools-data.js";
import { ACCOUNTS, AUTH_FAIL, authenticate, accountByEmail, loadSession, saveSession, clearSession } from "./accounts.js";
import { makeDivision, withDay, recordDecision as engineRecord, sdoSignOff as engineSignOff, decisionStatus, levels, keywordFeatures } from "../engine.js";

export const SCHEMA_VERSION = 2; // 2: MVP accounts and seeded working day; older saved copies are replaced
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

// Fixture school names and an optional seed used by the tests (never armed in the app).
export const DEMO = {
  hi: 38,
  override: { name: "Jibao-an Elementary School", level: "HINAY", reason: "New ceiling fans and cross-ventilation in all rooms" },
  official: ["Ungka II Elementary School", "Bito-on Elementary School", "Sambag Elementary School"],
  pandac: "Pandac Elementary School",
};

export class PermissionError extends Error {}
/** Wrong email or PIN. The message never says which part was wrong. */
export class AuthError extends Error {}
const deny = (msg) => { throw new PermissionError(msg); };

const emptyDay = () => ({ forecast: null, water: {}, readings: {}, decisions: {}, sent: {} });

function initialState(today) {
  return {
    schemaVersion: SCHEMA_VERSION, rosterHash: rosterHash(), today,
    days: {}, cityAuto: 42, draft: { hi: DEMO.hi, status: "final" },
    setupOverrides: {}, role: null, // signed out until signIn(); the role and school come only from the account

    demo: { armed: false, seeded: false },
  };
}

/**
 * createStore({ storage, sessionStores, now, today })
 * - storage: { getItem, setItem, removeItem } for the data blob (localStorage in the browser; a Map-backed stub in tests), or null.
 * - sessionStores: { local, session } for the sign-in session (kept apart from data), or null (not persisted).
 * - now: () => Date, for timestamps.
 */
export function createStore({ storage = null, sessionStores = null, now = () => new Date(), today } = {}) {
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
      if (saved.schemaVersion !== SCHEMA_VERSION) { notices.push("Presko was updated, so this device starts from the latest data."); return; }
      if (saved.rosterHash !== rosterHash()) { notices.push("The school list changed, so saved setup edits and days were cleared."); return; }
      delete saved.role; // older blobs carried the role; the role now comes only from the session
      state = { ...initialState(today || isoDate(now())), ...saved, today: today || isoDate(now()) }; // the operating day is always the real date
    } catch { storageOk = false; }
  }
  const roleFor = (a) => {
    const s = a.school ? makeDivision().find((x) => x.name === a.school) : null;
    return { kind: a.kind, name: a.name, title: a.title, email: a.email, schoolId: s ? s.id : null };
  };
  function restoreSession() {
    const sess = sessionStores ? loadSession(sessionStores) : null;
    const a = sess && accountByEmail(sess.email);
    if (a) { state.role = roleFor(a); session = sess; }
  }
  let session = null;
  function save() {
    if (!storage) return;
    const { role: _omit, ...data } = state; // the session is stored separately, never inside the data blob
    try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); storageOk = true; } catch { storageOk = false; }
  }
  let loaded = false;
  load();
  loaded = !!(storage && (() => { try { return storage.getItem(STORAGE_KEY); } catch { return null; } })());
  restoreSession();

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
    if (!r) deny("Sign in first.");
    if (!kinds.includes(r.kind)) deny(`Only ${kinds.map((k) => ROLES[k].label).join(" or ")} can do this.`);
    if (schoolId != null && ROLES[r.kind].mode === "school" && r.schoolId !== schoolId) deny("You can only act for your own school.");
  }
  const tomorrow = () => addDays(state.today, 1);
  const operable = (date) => date === state.today || date === tomorrow() || deny("Decisions can only be made for today or tomorrow.");

  function commit() { version++; save(); listeners.forEach((f) => f()); }

  // ---- actions ----
  const actions = {
    /**
     * Sign in with an issued account. Returns the account. Throws AuthError on any mismatch (never says which part).
     * The role and school come only from the account; `remember` keeps the session on this device (localStorage).
     */
    signIn(email, pin, { remember = true } = {}) {
      const a = authenticate(email, pin);
      if (!a) throw new AuthError(AUTH_FAIL);
      replay = null;
      state.role = roleFor(a);
      session = sessionStores ? saveSession(a, remember, sessionStores, now()) : { email: a.email, at: now().toISOString(), remember: !!remember };
      commit();
      return a;
    },
    signOut() {
      state.role = null; session = null; replay = null;
      if (sessionStores) clearSession(sessionStores);
      commit();
    },
    /** TEST ONLY: sets a role without an account. The UI never calls this; it signs in through signIn(). */
    setRole(kind, { name, schoolId = null } = {}) {
      if (!ROLES[kind]) deny(`Unknown role ${kind}.`);
      if (ROLES[kind].mode === "school" && schoolId == null) deny("Pick a school for school mode.");
      state.role = { kind, name: (name || state.role?.name || "").trim() || ROLES[kind].label, schoolId: ROLES[kind].mode === "school" ? schoolId : null };
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
    setToday(iso) {
      need(["coordinator"]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) deny("Pick a valid date.");
      state.today = iso; commit();
    },
    demoReset() {
      need(["coordinator"]);
      if (storage) try { storage.removeItem(STORAGE_KEY); } catch {}
      const keepToday = state.today, keepRole = state.role;
      state = initialState(keepToday);
      state.role = keepRole; // reset clears data, not who is signed in
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
    if (o) d.decisions[o.id] = engineRecord(withDay(o, d), hi, { level: DEMO.override.level, reason: DEMO.override.reason, by: "Demo head (seed)", forDate: date, at, system: true });
    for (const name of DEMO.official) {
      const s = find(name);
      if (!s) continue;
      const rec = levels(withDay(s, d), hi).recommended;
      d.decisions[s.id] = engineRecord(withDay(s, d), hi, { level: rec, by: "Demo head (seed)", forDate: date, at, system: true });
    }
    state.demo = { armed: false, seeded: true };
  }

  /**
   * Fills a fresh device with a realistic working day so people can see how Presko is used:
   * today's final forecast with decisions, 8:00 readings and sent messages; tomorrow's provisional forecast with
   * most heads already decided, one override awaiting the SDO and one returned. Pandac ES is left undecided.
   * Runs only when nothing is saved yet. People are fictional.
   */
  function seedActivity() {
    const FIRST = ["Maricel", "Rodel", "Joy", "Antonio", "Grace", "Dennis", "Rowena", "Edgar", "Lorna", "Ramil", "Cecilia", "Noel", "Jocelyn", "Arturo", "Mylene", "Ronald", "Teresita", "Jun", "Analyn", "Rey"];
    const LAST = ["Dela Peña", "Gonzales", "Tolentino", "Villareal", "Escobar", "Panganiban", "Marquez", "Salcedo", "Abellana", "Ledesma", "Javellana", "Montinola", "Sumagaysay", "Gallego", "Jalandoni", "Tirol", "Palmares", "Ganzon"];
    const all = schools();
    const headOf = (s, k) => ACCOUNTS.find((a) => a.kind === "head" && a.school === s.name)?.name || `${FIRST[(k * 7) % FIRST.length]} ${LAST[(k * 5 + 3) % LAST.length]}`;
    const t = state.today, tm = tomorrow(), base = new Date(`${t}T00:00:00`);
    const at = (dayOffset, h, m = 0) => new Date(base.getTime() + dayOffset * 864e5 + (h * 60 + m) * 6e4).toISOString();
    const coord = ACCOUNTS.find((a) => a.kind === "coordinator").name, sdo = ACCOUNTS.find((a) => a.kind === "sdo").name;
    // Today: 5 p.m. advisory from yesterday, decided last night, 8:00 readings in this morning.
    const dT = ensureDay(t);
    dT.forecast = { hi: 39.4, status: "final", source: "PAGASA", publishedAt: at(-1, 16, 52), by: coord };
    all.forEach((s, k) => {
      const w = withDay(s, dT), rec = levels(w, 39.4).recommended;
      if (k % 9 === 4) return; // a few never recorded
      dT.decisions[s.id] = engineRecord(w, 39.4, { level: rec, by: headOf(s, k), forDate: t, at: at(-1, 16, 10 + (k % 40)), kind: "evening" });
      if (k % 3 !== 1) (dT.sent[s.id] ||= []).push({ level: rec, channel: ["FB page", "Group chat", "Radio"][k % 3], at: at(-1, 16, 30 + (k % 25)) });
      if (k % 4 === 0) {
        const r = (dT.readings[s.id] ||= {});
        s.buildings.forEach((b, j) => { r[b.id] = Math.round((34 + ((k * 3 + j * 5) % 70) / 10) * 10) / 10; });
      }
    });
    // Tomorrow: provisional forecast at 15:20; most heads have already recorded.
    const dN = ensureDay(tm);
    dN.forecast = { hi: 41.0, status: "provisional", source: "PAGASA", publishedAt: at(0, 15, 20), by: coord };
    const jib = all.find((s) => s.name === DEMO.override.name), pandac = all.find((s) => s.name === DEMO.pandac);
    all.forEach((s, k) => {
      if (s === pandac || k % 4 === 3) return; // Pandac and some others still to decide
      const w = withDay(s, dN), rec = levels(w, 41.0).recommended;
      dN.decisions[s.id] = engineRecord(w, 41.0, { level: rec, by: headOf(s, k), forDate: tm, at: at(0, 15, 30 + (k % 28)), kind: "evening" });
    });
    if (jib) {
      const w = withDay(jib, dN);
      dN.decisions[jib.id] = engineRecord(w, 41.0, { level: "HINAY", reason: "New ceiling fans and cross-ventilation in all classrooms since October.", by: headOf(jib, 1), forDate: tm, at: at(0, 15, 48), kind: "evening" });
    }
    const ret = all.find((s, k) => s !== jib && s !== pandac && k % 4 !== 3 && k > 10);
    if (ret) {
      const w = withDay(ret, dN), dec = engineRecord(w, 41.0, { level: "HINAY", reason: "Only the morning shift would be affected.", by: headOf(ret, all.indexOf(ret)), forDate: tm, at: at(0, 15, 41), kind: "evening" });
      dN.decisions[ret.id] = engineSignOff(dec, "returned", "Afternoon shift is still exposed at 41°C. Keep HINGA unless both shifts move to cooler rooms.", { currentStatus: "awaiting-sdo", latestId: dec.id, at: at(0, 15, 58) });
    }
    state.draft = { hi: 41.0, status: "provisional" };
    void sdo;
  }

  return {
    seedActivity() { seedActivity(); commit(); },
    get state() { return state; },
    get version() { return version; },
    get replay() { return replay; },
    get storageOk() { return storageOk; },
    get hasSavedData() { return loaded; },
    get session() { return session; },
    notices, schools, school, bySlug, day, role, tomorrow, actions, accounts: ACCOUNTS,
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
