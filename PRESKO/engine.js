// Presko engine: building notes -> features -> heat band -> per-school plan -> independent checker.
// Pure functions, no DOM. Same file runs in the browser and in Node tests.
import { SCHOOLS_OSM } from "./schools-data.js";

// ---------- the visible rule ----------

export const PAGASA = [
  { min: -Infinity, max: 26.99, label: "Not at risk" },
  { min: 27, max: 32.99, label: "Caution" },
  { min: 33, max: 41.99, label: "Extreme caution" },
  { min: 42, max: 51.99, label: "Danger" },
  { min: 52, max: Infinity, label: "Extreme danger" },
];
export const pagasaCategory = (hi) => PAGASA.find((c) => hi >= c.min && hi <= c.max).label;

// Heat-index points for tomorrow's forecast.
export const HI_POINTS = [
  { min: -Infinity, max: 37.99, points: -2, label: "below 38°C" },
  { min: 38, max: 41.99, points: 0, label: "38–41°C" },
  { min: 42, max: 45.99, points: 1, label: "42–45°C" },
  { min: 46, max: 51.99, points: 2, label: "46–51°C" },
  { min: 52, max: Infinity, points: 3, label: "52°C and above" },
];
export const hiPoints = (hi) => HI_POINTS.find((r) => hi >= r.min && hi <= r.max).points;

// Building features and their points. The AI (or the keyword fallback) only decides which are true.
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
  { band: "green", max: 2, text: "0–2 points: usable all day" },
  { band: "amber", max: 4, text: "3–4 points: mornings only (06:00–11:00)" },
  { band: "red", max: Infinity, text: "5+ points: not used tomorrow" },
];

export function buildingPoints(features) {
  return FEATURE_KEYS.reduce((s, k) => s + (features[k] ? FEATURES[k].points : 0), 0);
}
export function band(hi, features) {
  const total = hiPoints(hi) + buildingPoints(features);
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

// ---------- the division (real schools, illustrative buildings) ----------

// Illustrative building notes. Features were extracted once and cached here (re-read live on edit).
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

export function makeDivision() {
  return SCHOOLS_OSM.map(([name, lat, lon], i) => {
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
    const doubleShift = r() < (kind === "secondary" ? 0.3 : 0.45);
    const sections = Math.max(2, Math.round(totalRooms * (doubleShift ? 1.6 + r() * 0.3 : 0.75 + r() * 0.2)));
    const grades = GRADES[kind];
    const sectionList = Array.from({ length: sections }, (_, k) => {
      const g = grades[k % grades.length];
      const letter = String.fromCharCode(65 + Math.floor(k / grades.length));
      return { id: `${i}-s${k}`, name: g === "K" ? `Kinder-${letter}` : `Grade ${g}-${letter}`, learners: 32 + Math.floor(r() * 14) };
    });
    return { id: String(i), name, lat, lon, kind, doubleShift, buildings, sections: sectionList };
  });
}

// ---------- planner ----------

const NORMAL_HOURS = { single: 6, double: 5 };
export const SLOTS = {
  fullDay: { id: "full", label: "07:30–15:30", hours: 6, morning: false },
  am: { id: "am", label: "06:00–12:00", hours: 5, morning: false },
  pm: { id: "pm", label: "12:00–18:00", hours: 5, morning: false },
  morning: { id: "morning", label: "06:00–11:00", hours: 5, morning: true },
  early: { id: "early", label: "06:00–08:30", hours: 2.5, morning: true },
  late: { id: "late", label: "08:30–11:00", hours: 2.5, morning: true },
};

function roomsOf(school, hi) {
  const rooms = [];
  for (const b of school.buildings) {
    const { band: bd, total } = band(hi, b.features);
    for (let k = 0; k < b.rooms; k++) rooms.push({ id: `${b.id}-r${k + 1}`, name: `${b.name} · Room ${k + 1}`, building: b.id, band: bd, points: total });
  }
  return rooms;
}

export function planSchool(school, hi) {
  const rooms = roomsOf(school, hi);
  const green = rooms.filter((r) => r.band === "green");
  const amber = rooms.filter((r) => r.band === "amber");
  const red = rooms.filter((r) => r.band === "red");
  const S = school.sections;
  const normalHours = school.doubleShift ? NORMAL_HOURS.double : NORMAL_HOURS.single;

  const fill = (pairs) => {
    const assignments = [];
    S.forEach((sec, k) => {
      const p = pairs[k];
      assignments.push(p ? { section: sec.id, room: p.room.id, slot: p.slot.id } : { section: sec.id, room: null, slot: "adm" });
    });
    return assignments;
  };
  const pairsFor = (rs, slots) => slots.flatMap((slot) => rs.map((room) => ({ room, slot })));

  let mode, assignments, slotsUsed;
  const fullSlots = school.doubleShift ? [SLOTS.am, SLOTS.pm] : [SLOTS.fullDay];
  if (S.length <= green.length * fullSlots.length) {
    mode = "full";
    slotsUsed = fullSlots;
    assignments = fill(pairsFor(green, fullSlots));
  } else {
    const usable = [...green, ...amber];
    const morningSlots = S.length <= usable.length ? [SLOTS.morning] : [SLOTS.early, SLOTS.late];
    slotsUsed = morningSlots;
    assignments = fill(pairsFor(usable, morningSlots));
    const adm = assignments.filter((a) => a.slot === "adm").length;
    mode = adm === 0 ? "morning" : adm === S.length ? "adm" : "partial";
  }

  const slotById = Object.fromEntries(Object.values(SLOTS).map((s) => [s.id, s]));
  const bySection = Object.fromEntries(S.map((s) => [s.id, s]));
  let keptLH = 0, normalLH = 0;
  for (const a of assignments) {
    const learners = bySection[a.section].learners;
    normalLH += learners * normalHours;
    if (a.slot !== "adm") keptLH += learners * slotById[a.slot].hours;
  }
  const admCount = assignments.filter((a) => a.slot === "adm").length;
  return { school: school.id, hi, mode, rooms, counts: { green: green.length, amber: amber.length, red: red.length }, assignments, slotsUsed: slotsUsed.map((s) => s.id), keptLH, normalLH, admCount, why: explain(mode, S.length, green.length, amber.length, red.length, admCount, school.doubleShift) };
}

function explain(mode, s, g, a, r, adm, dbl) {
  const rooms = `${g} green, ${a} amber, ${r} red room${r === 1 ? "" : "s"}`;
  if (mode === "full") return `${s} sections fit in ${g} green room${g === 1 ? "" : "s"}${dbl ? " across two shifts" : ""} (${rooms}).`;
  if (mode === "morning") return `Too few green rooms for a full day; all ${s} sections fit in the morning in ${g + a} green or amber rooms.`;
  if (mode === "partial") return `Morning slots hold ${s - adm} of ${s} sections (${rooms}); ${adm} go to alternative delivery.`;
  return `No green or amber rooms tomorrow (${rooms}): all ${s} sections go to alternative delivery.`;
}

export function planDivision(schools, hi) {
  const plans = schools.map((s) => planSchool(s, hi));
  const tally = { full: 0, morning: 0, partial: 0, adm: 0 };
  let keptLH = 0, normalLH = 0, adm = 0, sections = 0;
  for (const p of plans) { tally[p.mode]++; keptLH += p.keptLH; normalLH += p.normalLH; adm += p.admCount; sections += p.assignments.length; }
  return { hi, plans, tally, keptLH, normalLH, admSections: adm, sections };
}

// ---------- independent checker (does not trust the planner) ----------

export function check(school, plan) {
  const problems = [];
  const roomById = Object.fromEntries(plan.rooms.map((r) => [r.id, r]));
  const slotById = Object.fromEntries(Object.values(SLOTS).map((s) => [s.id, s]));
  const seenSection = new Map();
  const seenRoomSlot = new Set();
  for (const a of plan.assignments) {
    seenSection.set(a.section, (seenSection.get(a.section) || 0) + 1);
    if (a.slot === "adm") continue;
    const room = roomById[a.room];
    const slot = slotById[a.slot];
    if (!room) { problems.push(`unknown room ${a.room}`); continue; }
    if (!slot) { problems.push(`unknown slot ${a.slot}`); continue; }
    if (room.band === "red") problems.push(`${a.section} placed in a red room`);
    if (room.band === "amber" && !slot.morning) problems.push(`${a.section} in an amber room after 11:00`);
    const key = `${a.room}|${a.slot}`;
    if (seenRoomSlot.has(key)) problems.push(`${room.name} double-booked ${slot.label}`);
    seenRoomSlot.add(key);
    // overlapping slots in one room
    for (const other of ["early", "late", "morning", "am", "pm", "full"]) {
      if (other === a.slot) continue;
      if (seenRoomSlot.has(`${a.room}|${other}`) && overlaps(a.slot, other)) problems.push(`${room.name} has overlapping slots`);
    }
  }
  for (const s of school.sections) {
    const n = seenSection.get(s.id) || 0;
    if (n !== 1) problems.push(`${s.name} assigned ${n} times`);
  }
  return problems;
}
const RANGES = { full: [7.5, 15.5], am: [6, 12], pm: [12, 18], morning: [6, 11], early: [6, 8.5], late: [8.5, 11] };
function overlaps(a, b) { const [a1, a2] = RANGES[a]; const [b1, b2] = RANGES[b]; return a1 < b2 && b1 < a2; }

// ---------- real April 2024 heat (Open-Meteo archive, apparent temperature as a heat-index proxy) ----------

export const ILOILO_HEAT_2024 = {
  source: "Open-Meteo historical archive, daily apparent_temperature_max, Iloilo City (10.72 N, 122.56 E)",
  days: { "2024-04-23": 40.4, "2024-04-24": 40.1, "2024-04-25": 40.3, "2024-04-27": 40.5, "2024-04-28": 41.0, "2024-04-29": 37.2, "2024-04-30": 39.4 },
};
