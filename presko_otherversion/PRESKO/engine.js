// Presko engine: tomorrow's PAGASA heat index -> DepEd 4H level (DM 064 s. 2026) -> per-school plan,
// with building notes as flags (rooms to check at 8:00, grounds to ask the SDO for face-to-face back),
// and an independent checker. Pure functions, no DOM. Same file runs in the browser and in Node tests.
import { SCHOOLS_OSM } from "./schools-data.js";

// ---------- the rule: DepEd Memorandum No. 064, s. 2026 ("4H"), bands = PAGASA heat-index categories ----------

export const FOURH = [
  { id: "HAYO", max: 26.99, range: "below 27°C", pagasa: "Not hazardous", allows: "Regular face-to-face classes, with precautions" },
  { id: "HINAY", max: 32.99, range: "27–32°C", pagasa: "Caution", allows: "Shortened face-to-face day (e.g. 06:00–10:00 and 14:00–18:00), hybrid or home-based" },
  { id: "HINGA", max: 41.99, range: "33–41°C, or no water at school", pagasa: "Extreme caution", allows: "No face-to-face; light home-based work (modules, DepEd TV/radio)" },
  { id: "HINTO", max: Infinity, range: "42°C and above", pagasa: "Danger / extreme danger", allows: "All academic activity suspended, including home-based and online" },
];
const ORDER = FOURH.map((l) => l.id);
export const levelInfo = (id) => FOURH.find((l) => l.id === id);

/** 4H level for a forecast heat index. Losing the school's water supply forces at least HINGA. */
export function level(hi, { water = true } = {}) {
  const byHeat = FOURH.find((l) => hi <= l.max).id;
  if (!water && ORDER.indexOf(byHeat) < ORDER.indexOf("HINGA")) return "HINGA";
  return byHeat;
}

export const PAGASA = [
  { max: 26.99, label: "Not hazardous" },
  { max: 32.99, label: "Caution" },
  { max: 41.99, label: "Extreme caution" },
  { max: 51.99, label: "Danger" },
  { max: Infinity, label: "Extreme danger" },
];
export const pagasaCategory = (hi) => PAGASA.find((c) => hi <= c.max).label;

// Iloilo City EO 24 s. 2025 (PAGASA 5 PM advisory the day before). Automatic threshold reported as 42, 41 and 40°C.
export const CITY = { instrument: "Iloilo City EO 24 s. 2025", optional: 40, autoDefault: 42, autoOptions: [40, 41, 42] };
export function cityOverlay(hi, auto = CITY.autoDefault) {
  if (hi >= auto) return { status: "auto", text: `${CITY.instrument}: automatic citywide face-to-face suspension at ${auto}°C or above.` };
  if (hi >= CITY.optional) return { status: "optional", text: `${CITY.instrument}: suspension optional for school heads at ${CITY.optional}°C or above.` };
  return null;
}
// EO 130 s. 2026 (national, three tiers). Numeric heat trigger unconfirmed; implementing guidelines pending.
export const EO130 = { instrument: "EO 130 s. 2026", status: "implementing guidelines pending; heat trigger not confirmed" };

// ---------- heat index: NWS Rothfusz from Open-Meteo temperature + humidity, calibrated to PAGASA ----------

/** NWS heat index (Rothfusz 1990 with NWS adjustments). Input °C and %RH, output °C. */
export function heatIndexC(tC, rh) {
  const T = (tC * 9) / 5 + 32;
  let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + rh * 0.094);
  if ((hi + T) / 2 >= 80) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T - 0.05481717 * rh * rh
      + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
    if (rh < 13 && T >= 80 && T <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    else if (rh > 85 && T >= 80 && T <= 87) hi += ((rh - 85) / 10) * ((87 - T) / 5);
  }
  return ((hi - 32) * 5) / 9;
}

/** Daily maximum heat index over 11:00–16:00 local, from Open-Meteo hourly arrays. */
export function dailyHI({ time, temperature_2m, relative_humidity_2m }) {
  const out = {};
  time.forEach((t, i) => {
    const hr = +t.slice(11, 13);
    if (hr < 11 || hr > 16 || temperature_2m[i] == null) return;
    const d = t.slice(0, 10);
    out[d] = Math.max(out[d] ?? -Infinity, heatIndexC(temperature_2m[i], relative_humidity_2m[i]));
  });
  return out;
}

export const CALIBRATION = { offset: 3.7, band: 2, basis: "mean gap on 4 PAGASA-reported days (17, 21, 22, 28 Apr 2024)" };
export const calibrate = (raw, offset = CALIBRATION.offset) => Math.round((raw + offset) * 10) / 10;

// Raw daily max heat index, Iloilo City, from Open-Meteo archive (best match = ECMWF IFS), computed with heatIndexC/dailyHI.
export const ILOILO_HEAT = {
  source: "Open-Meteo archive (ECMWF IFS), hourly temperature_2m + relative_humidity_2m, Iloilo City (10.72 N, 122.56 E); NWS heat index, max 11:00–16:00",
  raw: {
    "2024-04-01": 37.5, "2024-04-02": 37.3, "2024-04-03": 36.4, "2024-04-04": 37.8, "2024-04-05": 37.8, "2024-04-06": 38.2,
    "2024-04-07": 37.2, "2024-04-08": 36.5, "2024-04-09": 37.4, "2024-04-10": 36.8, "2024-04-11": 37.1, "2024-04-12": 38.3,
    "2024-04-13": 37.3, "2024-04-14": 37.7, "2024-04-15": 39.2, "2024-04-16": 37.3, "2024-04-17": 37.7, "2024-04-18": 38.1,
    "2024-04-19": 37.9, "2024-04-20": 37.1, "2024-04-21": 39.0, "2024-04-22": 39.7, "2024-04-23": 40.2, "2024-04-24": 40.5,
    "2024-04-25": 39.0, "2024-04-26": 39.6, "2024-04-27": 41.3, "2024-04-28": 40.7, "2024-04-29": 37.7, "2024-04-30": 40.5,
    "2026-11-03": 36.7,
  },
  // PAGASA forecasts as reported in the news (what a coordinator would have typed in that afternoon).
  pagasa: { "2024-04-01": 41, "2024-04-25": 43, "2024-04-30": 44, "2026-11-03": 43 },
};

// The two replay cards. Facts are sourced; Presko's numbers are computed, never typed in.
export const REPLAYS = [
  {
    id: "2024-04-01", label: "Replay 1 April 2024",
    actual: "All 66 public schools in Iloilo City suspended face-to-face classes (city EO 047, PAGASA forecast 41°C). About 76,000 public learners (estimate from SY 2024-25 enrolment; no count was published for the day).",
    precedent: "The next day, EO 047-A let schools able to handle the heat (such as air-conditioned ones) hold classes on site.",
    sources: [["GMA Regional TV", "https://www.gmanetwork.com/regionaltv/news/101185/over-800-schools-in-western-visayas-suspend-inperson-classes/story"], ["IMT News", "https://imtnews.ph/in-person-classes-in-iloilo-city-suspended-due-to-intense-heat"]],
  },
  {
    id: "2026-11-03", label: "Replay 3 Nov 2026",
    actual: "SDO Iloilo City suspended face-to-face classes in 65 schools, 73,127 learners, on a PAGASA forecast of 43°C, under DM 064 s. 2026.",
    precedent: "The computed heat index that day was lower than PAGASA's forecast, which is why the coordinator types in PAGASA's figure.",
    sources: [["PNA", "https://www.pna.gov.ph/article/122-w-visayas-public-schools-suspend-in-person-classes-due-to-extreme-heat"], ["Daily Guardian", "https://www.dailyguardian.com.ph/blog/extreme-heat-suspends-classes-in-122-western-visayas-schools"]],
  },
];

// ---------- building notes -> features -> building band (a flag, never a temperature) ----------

export const FEATURES = {
  roof_no_ceiling: { points: 2, label: "metal roof, no ceiling" },
  makeshift: { points: 2, label: "makeshift / temporary" },
  upper_floor: { points: 1, label: "upper floor under the roof" },
  poor_ventilation: { points: 1, label: "windows on one side / poor airflow" },
  west_facing: { points: 1, label: "faces west" },
  ceiling_or_insulated: { points: -1, label: "ceiling or insulation" },
  shade_trees: { points: -1, label: "shade trees" },
  cross_ventilation: { points: -1, label: "windows on both sides" },
  aircon: { points: -3, label: "air-conditioned" },
};
export const FEATURE_KEYS = Object.keys(FEATURES);

export const BAND_RULE = [
  { band: "green", max: -2, text: "−2 points or less: cooler building. Grounds to ask the SDO for face-to-face back on a Hinga day." },
  { band: "amber", max: 2, text: "−1 to 2 points: typical building. Usable on Hinay hours." },
  { band: "red", max: Infinity, text: "3+ points: hot building. Not used on Hinay days; check first at the 8:00 reading." },
];

export function buildingPoints(features) {
  return FEATURE_KEYS.reduce((s, k) => s + (features[k] ? FEATURES[k].points : 0), 0);
}
export function band(features) {
  const total = buildingPoints(features);
  return { total, band: BAND_RULE.find((r) => total <= r.max).band };
}

// ---------- keyword fallback (used when Claude is not available) ----------

export function keywordFeatures(note) {
  const t = ` ${String(note || "").toLowerCase()} `;
  const noCeiling = /no ceiling|without (a )?ceiling|exposed (gi |tin |metal )?roof/.test(t);
  return {
    roof_no_ceiling: noCeiling,
    makeshift: /makeshift|temporary|\btent\b|plywood|nipa/.test(t),
    upper_floor: /upper floor|top[- ]floor|second floor|2nd floor|third floor|3rd floor/.test(t),
    poor_ventilation: /one side only|on one side|small windows|no (outside )?windows|poor (airflow|ventilation)|no fans/.test(t),
    west_facing: /faces west|facing west|west-facing|west facing/.test(t),
    ceiling_or_insulated: !noCeiling && /ceiling|insulat/.test(t),
    shade_trees: /trees|shade|shaded/.test(t),
    cross_ventilation: /both sides|cross[- ]?vent/.test(t),
    aircon: /air[- ]?con|aircon|a\/c\b/.test(t),
  };
}

// ---------- the division (real school locations, illustrative buildings) ----------

// Private schools that appear in the OpenStreetMap export but not in SDO Iloilo City's public roster.
export const PRIVATE_EXCLUDED = ["CPU Elementary School"];
export const DIVISION_FACTS = {
  publicSchools: 66, publicLearners: 75890, teachers: 2980, classrooms: 2242, shiftingSchools: 18,
  source: "TeacherPH (DepEd data, SY 2024-25); shifting schools: Iloilo Metropolitan Times, Aug 2024",
};

export const NOTE_TEMPLATES = [
  { note: "Old Gabaldon building with high ceilings, wide windows on both sides, acacia trees around it.", w: 2 },
  { note: "One-storey concrete classrooms with ceiling boards and electric fans, windows on both sides.", w: 4 },
  { note: "Two-storey concrete building with ceiling boards, windows on one side only.", w: 4 },
  { note: "Two-storey building, upper floor under a GI roof with no ceiling, windows on both sides.", w: 4 },
  { note: "One-storey classrooms with ceiling, facing west, mango trees on the west side.", w: 3 },
  { note: "One-storey classrooms, GI roof with no ceiling, louvre windows on one side only, faces west.", w: 3 },
  { note: "Three-storey building, top-floor rooms under a GI roof with no ceiling, faces west.", w: 2 },
  { note: "Temporary learning space (tent) set up after the 2023 typhoon, no fans.", w: 1 },
  { note: "Makeshift plywood classroom with a tin roof, no ceiling, small windows.", w: 1 },
  { note: "Converted library room with air-conditioning and a ceiling, no outside windows.", w: 1 },
];
NOTE_TEMPLATES.forEach((t) => (t.features = keywordFeatures(t.note)));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickWeighted(r, items) {
  const total = items.reduce((s, i) => s + i.w, 0);
  let x = r() * total;
  for (const i of items) { x -= i.w; if (x < 0) return i; }
  return items[items.length - 1];
}
function schoolKind(name) {
  if (/high school/i.test(name)) return "secondary";
  if (/integrated|sped/i.test(name)) return "integrated";
  return "elementary";
}
const GRADES = { elementary: ["K", "1", "2", "3", "4", "5", "6"], secondary: ["7", "8", "9", "10", "11", "12"], integrated: ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] };

// A school's usual timetable. Defaults are illustrative; Iloilo City NHS uses its reported late shift.
export const DEFAULT_TIMETABLE = { single: [[7.5, 15.5]], double: [[6, 12], [12, 18]] };
const REPORTED_TIMETABLES = {
  // Grades 9–10 attend 1:10–8:20 p.m. (GMA Regional TV, Aug 2024); morning shift assumed to end when the late shift starts.
  "Iloilo City National High School": { shifts: [[6, 13.17], [13.17, 20.33]], source: "late shift reported by GMA Regional TV, Aug 2024" },
};

export function makeDivision() {
  return SCHOOLS_OSM.map(([name, lat, lon], i) => ({ name, lat, lon, i }))
    .filter((s) => !PRIVATE_EXCLUDED.includes(s.name))
    .map(({ name, lat, lon, i }) => {
      const r = rng(1000 + i * 7919);
      const kind = schoolKind(name);
      const nB = 1 + Math.floor(r() * 3);
      const buildings = [];
      for (let b = 0; b < nB; b++) {
        const tpl = pickWeighted(r, NOTE_TEMPLATES);
        const rooms = tpl.note.includes("library") ? 1 : tpl.note.includes("tent") || tpl.note.includes("plywood") ? 1 + Math.floor(r() * 2) : 3 + Math.floor(r() * 6);
        buildings.push({ id: `${i}-${b}`, name: `Building ${"ABC"[b]}`, note: tpl.note, features: { ...tpl.features }, source: "cached", rooms });
      }
      const totalRooms = buildings.reduce((s, b) => s + b.rooms, 0);
      const reported = REPORTED_TIMETABLES[name];
      const doubleShift = reported ? reported.shifts.length === 2 : r() < (kind === "secondary" ? 0.3 : 0.45);
      const sections = Math.max(2, Math.round(totalRooms * (doubleShift ? 1.6 + r() * 0.3 : 0.75 + r() * 0.2)));
      const grades = GRADES[kind];
      const sectionList = Array.from({ length: sections }, (_, k) => {
        const g = grades[k % grades.length];
        const letter = String.fromCharCode(65 + Math.floor(k / grades.length));
        return { id: `${i}-s${k}`, name: g === "K" ? `Kinder-${letter}` : `Grade ${g}-${letter}`, learners: 32 + Math.floor(r() * 14) };
      });
      const timetable = reported ? { shifts: reported.shifts.map((x) => [...x]), source: reported.source } : { shifts: (doubleShift ? DEFAULT_TIMETABLE.double : DEFAULT_TIMETABLE.single).map((x) => [...x]), source: "illustrative default" };
      return {
        id: String(i), name, lat, lon, kind, doubleShift, buildings, sections: sectionList, timetable,
        water: true,        // school input, daily: water supply tomorrow
        readings: {},       // school input, morning of: building id -> indoor heat index at 8:00 (°C)
        decision: null,     // school input, daily: the head's recorded decision + SDO sign-off
      };
    });
}

// ---------- time helpers ----------

export const hhmm = (h) => `${String(Math.floor(h + 1e-6)).padStart(2, "0")}:${String(Math.round((h - Math.floor(h + 1e-6)) * 60)).padStart(2, "0")}`;
export const parseHHMM = (s) => { const [h, m] = String(s).split(":").map(Number); return h + (m || 0) / 60; };
const mkSlot = (id, start, end) => ({ id, start, end, hours: Math.round((end - start) * 100) / 100, label: `${hhmm(start)}–${hhmm(end)}` });

/** The school's own usual slots (from its timetable). Used by the planner and, independently, by the checker. */
export function schoolSlots(school) {
  return school.timetable.shifts.map(([a, b], k) => mkSlot(`shift${k + 1}`, a, b));
}
// DM 064's example shortened day for Hinay. Fixed, not school-specific.
export const HINAY_SLOTS = [mkSlot("hinayAm", 6, 10), mkSlot("hinayPm", 14, 18)];
export const OVERFLOW_SLOTS = [mkSlot("tempAm", 6, 12), mkSlot("tempPm", 12, 18)]; // temporary double shift if rooms run out
export function slotsFor(school) {
  return Object.fromEntries([...schoolSlots(school), ...HINAY_SLOTS, ...OVERFLOW_SLOTS].map((s) => [s.id, s]));
}
export const HOME = "home"; // modules / DepEd TV / radio at home
export const NONE = "none"; // HINTO: no academic activity at all
const MIDDAY = { start: 10, end: 14 };
const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export const MODES = {
  full: "Regular day",
  split: "Shortened day",
  splitPartial: "Shortened day + some at home",
  home: "Home-based",
  request: "Home-based · grounds to request F2F",
  stop: "No classes",
};

// ---------- levels: forecast, 8:00 indoor readings, the head's decision ----------

const rank = (l) => ORDER.indexOf(l);
const worse = (a, b) => (rank(a) >= rank(b) ? a : b);

/**
 * Level per building and for the school, from inputs only (no decision).
 * - Forecast level: from PAGASA's forecast (and water).
 * - A building with an 8:00 reading takes the worse of the forecast level and the reading's level ("whichever is worse":
 *   our assumption, because whether DM 064 binds on the reading or the forecast is unconfirmed).
 * - The school level is the coolest building level: classes move out of buildings that read hotter, and if every
 *   building reads hotter, the whole school steps up.
 */
function baseLevels(school, hi) {
  const forecast = level(hi, { water: school.water !== false });
  const byBuilding = {};
  for (const b of school.buildings) {
    const r = school.readings?.[b.id];
    byBuilding[b.id] = r == null || r === "" ? forecast : worse(forecast, level(+r));
  }
  const vals = Object.values(byBuilding);
  const recommended = vals.length ? vals.reduce((a, b) => (rank(a) <= rank(b) ? a : b)) : forecast;
  const hasReadings = Object.values(school.readings || {}).some((v) => v !== "" && v != null);
  return { forecast, byBuilding, recommended, hasReadings };
}

// Dated statuses (web app), first match wins. Legacy statuses are kept for calls without `forDate`.
export const STATUSES = ["none", "stale-forecast", "stale-inputs", "returned", "awaiting-sdo", "official"];
export const LEGACY_STATUSES = ["none", "stale", "returned", "awaiting-sdo", "official"];
export const STATUS_TEXT = {
  none: "No decision",
  stale: "Re-confirm",
  "stale-forecast": "Re-confirm: forecast changed",
  "stale-inputs": "Re-confirm",
  returned: "Returned by SDO",
  "awaiting-sdo": "Awaiting SDO",
  official: "Official",
};

/** Builds one school's engine input from a day record. Missing fields default to "nothing reported". */
export function withDay(school, day) {
  const id = school.id;
  return {
    ...school,
    water: day?.water?.[id] ?? true,
    readings: day?.readings?.[id] ?? {},
    decision: day?.decisions?.[id] ?? null,
    sent: day?.sent?.[id] ?? [],
    provenance: school.provenance ?? {},
  };
}

/** Status of the school's decision for forecast `hi`. With `opts.forDate`: the six dated statuses; without: legacy. */
export function decisionStatus(school, hi, opts = {}) {
  const d = school.decision;
  if (!opts.forDate) {
    if (!d) return "none";
    if (d.hi !== hi) return "stale";
    if (d.sdo === "returned") return "returned";
    if (d.lessProtective && d.sdo !== "approved") return "awaiting-sdo";
    return "official";
  }
  if (!d || d.forDate !== opts.forDate) return "none";
  if (d.hi !== hi) return "stale-forecast";
  const { recommended } = baseLevels(school, hi);
  if (rank(recommended) > rank(d.level) && rank(recommended) > rank(d.recommended)) return "stale-inputs";
  if (d.sdo === "returned") return "returned";
  if (d.lessProtective && d.sdo !== "approved") return "awaiting-sdo";
  return "official";
}

/** Why a decision went `stale-inputs`: compares today's inputs with the decision's snapshot. */
export function staleCause(school, hi) {
  const d = school.decision;
  if (!d) return [];
  const snap = d.inputsSnapshot || { water: true, readings: {} };
  const causes = [];
  if (snap.water !== false && school.water === false) causes.push("water");
  const withSnapReadings = baseLevels({ ...school, readings: snap.readings || {} }, hi).recommended;
  if (rank(baseLevels(school, hi).recommended) > rank(withSnapReadings)) causes.push("readings");
  return causes;
}
/** Fixed status sentence for the UI. */
export function statusSentence(school, hi, opts = {}) {
  const st = decisionStatus(school, hi, opts);
  if (st !== "stale-inputs") return STATUS_TEXT[st];
  const rec = baseLevels(school, hi).recommended;
  return staleCause(school, hi).includes("readings") ? `8:00 readings call for ${rec}` : `No water: ${rec} required`;
}

/**
 * Levels for a school. `opts`:
 * - officialOnly: the plan follows the decision only when it counts (see STATUSES); otherwise the rule level.
 * - proposed: the plan follows the head's chosen level, for display ("proposed plan").
 * - neither: legacy behaviour (a current decision always counts).
 */
export function levels(school, hi, opts = {}) {
  const base = baseLevels(school, hi);
  const d = school.decision;
  let decided = null, effective = base.recommended, status = null, basis = "legacy";
  if (opts.officialOnly) {
    basis = "official";
    status = decisionStatus(school, hi, opts);
    if (status === "official") { decided = d.level; effective = d.level; }
    else if (status === "stale-inputs") { decided = d.level; effective = worse(d.level, base.recommended); }
  } else {
    if (opts.proposed) basis = "proposed";
    const current = !!d && d.hi === hi && (!opts.forDate || d.forDate === opts.forDate);
    if (current) { decided = d.level; effective = d.level; }
    if (opts.forDate) status = decisionStatus(school, hi, opts);
  }
  return { ...base, decided, effective, status, basis };
}

let decisionSeq = 0;
/**
 * Record the head's decision. A level less protective than the recommendation needs SDO approval before it counts.
 * With `forDate` it returns a new decision (the caller stores it); without, legacy: it is also set on `school.decision`.
 */
export function recordDecision(school, hi, { level: lvl, by, reason = "", at = new Date().toISOString(), forDate, kind = "evening", system = false }) {
  const { recommended } = baseLevels(school, hi);
  const override = lvl !== recommended;
  const lessProtective = rank(lvl) < rank(recommended);
  if (!ORDER.includes(lvl)) throw new Error(`Unknown level ${lvl}.`);
  if (override && !reason.trim()) throw new Error("A reason is required when the decision differs from the recommendation.");
  if (!String(by || "").trim()) throw new Error("Name of the school head is required.");
  const d = { id: `d${++decisionSeq}-${school.id}-${Date.parse(at) || 0}`, hi, level: lvl, recommended, override, lessProtective, by: by.trim(), reason: reason.trim(), at, sdo: "pending", sdoAt: null, sdoNote: "" };
  if (forDate) {
    return { ...d, forDate, kind, system, inputsSnapshot: { water: school.water !== false, readings: { ...(school.readings || {}) } } };
  }
  school.decision = d;
  return d;
}

/**
 * SDO sign-off.
 * - Web app: sdoSignOff(decision, status, note, { currentStatus, latestId, at }) returns a new decision; it refuses
 *   stale or missing decisions, decisions that are not the latest, and returns without a note.
 * - Legacy: sdoSignOff(school, status, note, at) updates school.decision.
 */
export function sdoSignOff(target, status, note = "", opts = new Date().toISOString()) {
  if (target && Array.isArray(target.buildings)) {
    const school = target, at = typeof opts === "string" ? opts : new Date().toISOString();
    if (!school.decision) throw new Error("No decision to sign off.");
    school.decision.sdo = status; school.decision.sdoAt = at; school.decision.sdoNote = note;
    return school.decision;
  }
  const d = target, { currentStatus, latestId, at = new Date().toISOString() } = typeof opts === "object" ? opts : {};
  if (!d) throw new Error("No decision to sign off.");
  if (!["approved", "returned"].includes(status)) throw new Error(`Unknown sign-off ${status}.`);
  if (["none", "stale-forecast", "stale-inputs"].includes(currentStatus)) throw new Error("This decision needs the head to re-confirm before it can be signed off.");
  if (latestId && d.id !== latestId) throw new Error("A newer decision exists for this school.");
  if (status === "returned" && !String(note).trim()) throw new Error("Add a note when returning a decision.");
  return { ...d, sdo: status, sdoAt: at, sdoNote: String(note).trim() };
}

/** What the 8:00 readings change: buildings emptied, and whether the school's rule level moved. */
export function morningChange(school, hi) {
  const before = baseLevels({ ...school, readings: {} }, hi);
  const now = baseLevels(school, hi);
  const emptied = school.buildings.filter((b) => rank(now.byBuilding[b.id]) > rank(now.recommended)).map((b) => b.id);
  const levelChange = now.recommended !== before.recommended ? { from: before.recommended, to: now.recommended } : null;
  return { emptied, levelChange, cause: emptied.length || levelChange ? "readings" : null };
}

/** True if the decision was recorded after 17:00 Asia/Manila on the day before `forDate` (morning re-confirms exempt). */
export function isLate(decision) {
  if (!decision?.forDate || decision.kind === "morning") return false;
  const [y, m, dd] = decision.forDate.split("-").map(Number);
  const deadline = Date.UTC(y, m - 1, dd - 1, 17 - 8, 0, 0); // 17:00 at UTC+8 on the previous day
  return Date.parse(decision.at) > deadline;
}

// ---------- planner ----------

function roomsOf(school, lv) {
  const rooms = [];
  for (const b of school.buildings) {
    const { band: bd, total } = band(b.features);
    const bl = lv.byBuilding[b.id];
    // Its 8:00 reading puts it above the rule's level for the school (compared with the rule, not the head's choice,
    // so a head choosing a cooler level does not empty unread buildings).
    const excluded = rank(bl) > rank(lv.recommended);
    const reading = school.readings?.[b.id];
    for (let k = 0; k < b.rooms; k++) rooms.push({ id: `${b.id}-r${k + 1}`, name: `${b.name} · Room ${k + 1}`, building: b.id, band: bd, points: total, excluded, reading: reading === "" ? null : reading ?? null });
  }
  return rooms;
}

// Fill sections into (room, slot) pairs in order; leftover sections get `rest`.
function fill(sections, rooms, slots, rest) {
  const pairs = slots.flatMap((slot) => rooms.map((room) => ({ room, slot })));
  return sections.map((sec, k) => (pairs[k] ? { section: sec.id, room: pairs[k].room.id, slot: pairs[k].slot.id } : { section: sec.id, room: null, slot: rest }));
}
const hinaySlots = (n, rooms) => (n <= rooms ? [HINAY_SLOTS[0]] : HINAY_SLOTS);

export function planSchool(school, hi, opts = {}) {
  const lv = levels(school, hi, opts);
  const lvl = lv.effective;
  const rooms = roomsOf(school, lv);
  const open = rooms.filter((r) => !r.excluded);
  const counts = { green: 0, amber: 0, red: 0 };
  rooms.forEach((r) => counts[r.band]++);
  const S = school.sections;
  const own = schoolSlots(school);
  const green = open.filter((r) => r.band === "green");
  const usable = open.filter((r) => r.band !== "red");
  // Hot rooms with no 8:00 reading yet: check them first.
  const checkFirst = open.filter((r) => r.band === "red" && r.reading == null).map((r) => r.id);
  const flags = [];

  let mode, assignments, request = null;
  if (lvl === "HAYO") {
    const slots = S.length > open.length * own.length ? OVERFLOW_SLOTS : own;
    if (slots === OVERFLOW_SLOTS) flags.push("Not enough rooms for the usual timetable: temporary double shift.");
    assignments = fill(S, open, slots, HOME);
    mode = assignments.some((a) => a.slot === HOME) ? "splitPartial" : "full";
    const peak = own.filter((s) => overlaps(s, MIDDAY) && s.end > 14);
    if (peak.length) flags.push(`Usual timetable runs through the afternoon heat peak (${peak.map((s) => s.label).join(", ")}).`);
  } else if (lvl === "HINAY") {
    assignments = fill(S, usable, hinaySlots(S.length, usable.length), HOME);
    mode = assignments.some((a) => a.slot === HOME) ? "splitPartial" : "split";
  } else if (lvl === "HINGA") {
    assignments = S.map((sec) => ({ section: sec.id, room: null, slot: HOME }));
    mode = "home";
    // Grounds to ask the SDO for face-to-face back (EO 047-A precedent): cooler rooms on Hinay hours hold at least half the sections.
    if (school.water !== false && green.length && green.length * 2 >= S.length / 2) {
      request = fill(S, green, hinaySlots(S.length, green.length), HOME);
      mode = "request";
    }
  } else {
    assignments = S.map((sec) => ({ section: sec.id, room: null, slot: NONE }));
    mode = "stop";
  }
  if (rooms.some((r) => r.excluded)) flags.push(`8:00 reading: ${[...new Set(rooms.filter((r) => r.excluded).map((r) => r.name.split(" · ")[0]))].join(", ")} read hotter than the school's level; no classes there.`);

  const slotById = slotsFor(school);
  const bySection = Object.fromEntries(S.map((s) => [s.id, s]));
  const lh = (as) => as.reduce((s, a) => s + (slotById[a.slot] ? bySection[a.section].learners * slotById[a.slot].hours : 0), 0);
  // Normal day: each section attends one shift of the school's own timetable.
  const normalHours = own.reduce((s, x) => s + x.hours, 0) / own.length;
  const normalLH = S.reduce((s, x) => s + x.learners * normalHours, 0);
  const homeCount = assignments.filter((a) => a.slot === HOME).length;
  return {
    school: school.id, hi, opts: { forDate: opts.forDate, officialOnly: !!opts.officialOnly, proposed: !!opts.proposed }, basis: lv.basis,
    level: lvl, levels: lv, mode, rooms, counts, assignments, request, flags,
    checkFirst: lvl === "HINTO" || lvl === "HINGA" ? [] : checkFirst,
    keptLH: lh(assignments), requestLH: request ? lh(request) : 0, normalLH, homeCount,
    decision: decisionStatus(school, hi, opts),
    why: explain(lv, mode, S.length, counts, homeCount, school),
  };
}

function explain(lv, mode, s, c, home, school) {
  const lvl = lv.effective;
  const rooms = `${c.green} cooler, ${c.amber} typical, ${c.red} hot room${c.red === 1 ? "" : "s"}`;
  const pre = lv.decided && lv.decided !== lv.recommended ? `School head chose ${lv.decided} (rule: ${lv.recommended}). `
    : lv.recommended !== lv.forecast ? `8:00 readings move the school from ${lv.forecast} to ${lv.recommended}. ` : "";
  let t;
  if (lvl === "HINTO") t = `Hinto: all academic activity is suspended, including modules and online work.`;
  else if (lvl === "HINGA" && school.water === false) t = `No water at school forces at least Hinga: no face-to-face; all ${s} sections on light home-based work.`;
  else if (mode === "request") { const fit = Math.min(s, c.green * 2); t = `Hinga: no face-to-face by default. But ${fit === s ? `all ${s}` : `${fit} of ${s}`} sections fit in cooler rooms on shortened hours (06:00–10:00, 14:00–18:00), so the school has grounds to ask the SDO for face-to-face back.`; }
  else if (mode === "home") t = `Hinga: no face-to-face; all ${s} sections on light home-based work (${rooms}).`;
  else if (mode === "split") t = `Hinay: all ${s} sections fit the shortened day in non-hot rooms (${rooms}); nobody is in class 10:00–14:00.`;
  else if (mode === "splitPartial" && lvl === "HINAY") t = `Hinay: shortened-day rooms hold ${s - home} of ${s} sections (${rooms}); ${home} work at home.`;
  else if (mode === "splitPartial") t = `Hayo: usual timetable; rooms hold ${s - home} of ${s} sections, ${home} work at home.`;
  else t = `Hayo: usual timetable for all ${s} sections.${c.red ? ` Check the hot rooms first at the 8:00 reading.` : ""}`;
  return pre + t;
}

export function planDivision(schools, hi, opts = {}) {
  const plans = schools.map((s) => planSchool(s, hi, opts));
  const tally = Object.fromEntries(Object.keys(MODES).map((m) => [m, 0]));
  const decisions = Object.fromEntries([...(opts.forDate ? STATUSES : LEGACY_STATUSES), "overrides"].map((k) => [k, 0]));
  let keptLH = 0, normalLH = 0, home = 0, sections = 0, checkFirst = 0, requestSections = 0, withReadings = 0;
  plans.forEach((p, i) => {
    tally[p.mode]++; keptLH += p.keptLH; normalLH += p.normalLH; home += p.homeCount; sections += p.assignments.length; checkFirst += p.checkFirst.length;
    if (p.request) requestSections += p.request.filter((a) => a.slot !== HOME).length;
    decisions[p.decision]++;
    if (!["none", "stale", "stale-forecast"].includes(p.decision) && schools[i].decision.override) decisions.overrides++;
    if (p.levels.hasReadings) withReadings++;
  });
  return { hi, plans, tally, keptLH, normalLH, homeSections: home, sections, checkFirst, requestSections, decisions, withReadings };
}

/** Decision log for the SDO / DRRMS situation report (CSV). With `opts.forDate`, the extended web-app columns. */
export function decisionsCSV(schools, hi, opts = {}) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const readingsOf = (s) => s.buildings.filter((b) => s.readings?.[b.id] != null && s.readings?.[b.id] !== "").map((b) => `${b.name}=${s.readings[b.id]}`).join("; ");
  if (!opts.forDate) {
    const rows = [["school", "forecast_hi", "forecast_level", "readings", "recommended", "decided", "override", "reason", "by", "decided_at", "sdo", "sdo_at", "sdo_note", "status"]];
    for (const s of schools) {
      const lv = levels(s, hi), d = s.decision;
      rows.push([s.name, hi, lv.forecast, readingsOf(s), lv.recommended, d?.level, d?.override, d?.reason, d?.by, d?.at, d?.sdo, d?.sdoAt, d?.sdoNote, decisionStatus(s, hi)]);
    }
    return rows.map((r) => r.map(q).join(",")).join("\n");
  }
  const f = opts.forecast || {};
  const LABELS = ["real", "news-reported", "illustrative", "entered"];
  const rows = [["for_date", "school", "forecast_hi", "forecast_status", "published_at", "forecast_level", "readings", "recommended_snapshot", "recommended_now",
    "decided", "override", "reason", "by", "decided_at", "kind", "sdo", "sdo_at", "sdo_note", "status", "cause", "late", "sent_level", "system", ...LABELS.map((l) => `prov_${l}`)]];
  for (const s of schools) {
    const lv = levels(s, hi, { forDate: opts.forDate }), d = s.decision, st = decisionStatus(s, hi, opts);
    const sent = s.sent?.length ? s.sent[s.sent.length - 1].level : "";
    const prov = Object.values(s.provenance || {});
    rows.push([opts.forDate, s.name, hi, f.status, f.publishedAt, lv.forecast, readingsOf(s), d?.recommended, lv.recommended,
      d?.level, d?.override, d?.reason, d?.by, d?.at, d?.kind, d?.sdo, d?.sdoAt, d?.sdoNote, st, st === "stale-inputs" ? staleCause(s, hi).join("+") : "",
      d ? isLate(d) : "", sent, d?.system ? "demo seed" : "", ...LABELS.map((l) => prov.filter((x) => (x?.label ?? x) === l).length)]);
  }
  return rows.map((r) => r.map(q).join(",")).join("\n");
}

// ---------- independent checker (does not trust the planner) ----------

/** Checks an assignment list against the school's level, recomputed from inputs. `asRequest` checks a face-to-face-return request instead. */
export function check(school, plan, { asRequest = false } = {}) {
  const problems = [];
  const lv = levels(school, plan.hi, plan.opts || {}); // same basis as the plan being checked
  const lvl = lv.effective;
  const assignments = asRequest ? plan.request || [] : plan.assignments;
  const slotById = slotsFor(school);
  const roomBuilding = {};
  for (const b of school.buildings) for (let k = 0; k < b.rooms; k++) roomBuilding[`${b.id}-r${k + 1}`] = b;
  const seenSection = new Map();
  const used = []; // [roomId, slot]
  for (const a of assignments) {
    seenSection.set(a.section, (seenSection.get(a.section) || 0) + 1);
    if (a.slot === NONE) continue;
    if (a.slot === HOME) { if (lvl === "HINTO") problems.push(`${a.section} given home-based work on a Hinto day`); continue; }
    const b = roomBuilding[a.room];
    const slot = slotById[a.slot];
    if (!b) { problems.push(`unknown room ${a.room}`); continue; }
    if (!slot) { problems.push(`unknown slot ${a.slot}`); continue; }
    const bBand = band(b.features).band;
    if (rank(lv.byBuilding[b.id]) > rank(lv.recommended)) problems.push(`${a.section} in ${b.name}, which read hotter at 8:00`);
    if (lvl === "HINTO") problems.push(`${a.section} in class on a Hinto day`);
    if (lvl === "HINGA" && !asRequest) problems.push(`${a.section} face-to-face on a Hinga day without SDO approval`);
    if (lvl === "HINGA" && asRequest && bBand !== "green") problems.push(`${a.section} request uses a non-cooler room`);
    if ((lvl === "HINAY" || (lvl === "HINGA" && asRequest)) && overlaps(slot, MIDDAY)) problems.push(`${a.section} in class 10:00–14:00`);
    if (lvl === "HINAY" && bBand === "red") problems.push(`${a.section} in a hot room on a Hinay day`);
    for (const [rid, s] of used) if (rid === a.room && overlaps(s, slot)) problems.push(`${b.name} room double-booked ${slot.label}`);
    used.push([a.room, slot]);
  }
  if (!asRequest || plan.request) {
    for (const s of school.sections) {
      const n = seenSection.get(s.id) || 0;
      if (n !== 1) problems.push(`${s.name} assigned ${n} times`);
    }
  }
  return problems;
}
