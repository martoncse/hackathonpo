// Presko safety model v2.1 (draft): is it safe for children to be in school, session by session?
// Pure functions. Runs in the browser and in Node.
//
// Aligned to DepEd Memorandum 064, s. 2026 (the "4H" heat tiers) and EO 130 (school-level suspensions
// for documented, site-specific threats). Checks, in order:
//   1. Outdoor tier (4H) from the forecast heat index.
//   2. Day veto and commute veto: outdoor heat no child should walk through.
//   3. Classroom check per building, hour by hour: estimated indoor WBGT, corrected by the school's own
//      08:00 / 12:00 / 14:00 indoor readings when it has them (the part of the model that learns).
//   4. School result (full day / one session / closed) with the documented reason for each closure.
//
// Evidence behind each number is in model/MODEL-CARD.md. Values marked ASSUMPTION have no direct
// measurement behind them yet and should be calibrated with classroom loggers.

// ---------- weather physics ----------

// Heat index (°C) from air temperature (°C) and relative humidity (%), NWS Rothfusz regression (shade, light wind).
export function heatIndex(tc, rh) {
  const T = (tc * 9) / 5 + 32;
  let H = 0.5 * (T + 61 + (T - 68) * 1.2 + rh * 0.094);
  if ((H + T) / 2 >= 80) {
    H = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
    if (rh < 13 && T >= 80 && T <= 112) H -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    if (rh > 85 && T >= 80 && T <= 87) H += ((rh - 85) / 10) * ((87 - T) / 5);
  }
  return ((H - 32) * 5) / 9;
}
export const satVap = (tc) => 6.112 * Math.exp((17.67 * tc) / (tc + 243.5)); // hPa
export const vapour = (tc, rh) => (rh / 100) * satVap(tc);
export const rhFrom = (tc, e) => Math.min(100, (100 * e) / satVap(tc));
// Psychrometric wet-bulb temperature, Stull (2011). Valid for RH 5–99 %, T −20–50 °C.
export function wetBulb(tc, rh) {
  return tc * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) + Math.atan(tc + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
}
// Indoor WBGT (no direct sun): 0.7 × natural wet bulb + 0.3 × globe. Indoors, globe ≈ air temp + radiant excess.
export function indoorWBGT(tc, rh, radiant = 0) {
  return 0.7 * wetBulb(tc, rh) + 0.3 * (tc + radiant);
}

// ---------- thresholds for children ----------

export const LIMITS = {
  // Whole-day veto: shade heat index at PAGASA "extreme danger" (heat stroke imminent). Iloilo-area records:
  // 53 °C in 2024, 60 °C in 2023, so this is not hypothetical.
  dayVetoHI: 52,
  // Commute veto: heat index while walking, with sun added (NWS: full sun adds up to 8 °C). Lowered from 52 for children.
  commuteVetoHI: 50,
  commuteSunExposure: 0.5,    // ASSUMPTION: half the walk in direct sun
  // Classroom, sedentary children. Japan MoE: WBGT ≥ 31 stop children's activity; 28–31 caution. ISO 7243 light work ≈ 30.
  classUnsafeWBGT: 31,
  classCautionWBGT: 28,
  // At Hinto (≥ 42 °C) a building with no indoor readings gets a safety margin on its estimate.
  noReadingMarginC: 1.0,      // ASSUMPTION
  // Learning from readings: residuals are shrunk toward 0 as if 3 prior readings said "model is right".
  readingPrior: 3,
  studentsPerRoom: 40,        // DepEd classrooms hold 35–50
  fanMaxTemp: 35,             // ASSUMPTION: fans stop helping at indoor air ≥ 35 °C (common public-health advice)
  // Open-Meteo reads lower than PAGASA. Add to outdoor heat index when the input is reanalysis, not a PAGASA forecast.
  hiBias: 0,
};

// DepEd Memorandum 064, s. 2026, "4H" tiers on the forecast heat index (°C).
export const DEPED_4H = [
  { key: "hayo",  label: "Hayo",  min: -Infinity, max: 26.99, action: "Normal classes" },
  { key: "hinay", label: "Hinay", min: 27, max: 32.99, action: "Head may shorten on-site hours or modify schedules" },
  { key: "hinga", label: "Hinga", min: 33, max: 41.99, action: "Precautions; head may adjust on-site classes" },
  { key: "hinto", label: "Hinto", min: 42, max: Infinity, action: "Head may suspend on-site classes" },
];
export const tier4H = (hi) => DEPED_4H.find((t) => hi >= t.min && hi <= t.max);
// The memo's indoor checkpoints. Readings at these hours are what the model learns from.
export const CHECKPOINTS = [8, 12, 14];

// ---------- classroom: from outdoor weather to indoor conditions ----------

// Indoor temperature offsets (°C) by building feature. sol = solar load 0–1 from shortwave radiation.
// Amankwaa et al. 2025 (Accra, 16 classrooms, 389 days): metal roof without ceiling +2.2 °C mean over outdoor
// in class hours, up to +5.9 °C; plywood ceiling under metal −0.2 °C mean, halves overheating hours.
export const OFFSETS = {
  roof_no_ceiling:      (sol) => 0.3 + 2.3 * sol,   // calibrated to Accra: mean ≈ +2.2 in class hours
  ceiling_or_insulated: (sol) => -0.6 + 0.5 * sol,  // calibrated to Accra: mean ≈ −0.2
  makeshift:            (sol) => 0.8 + 2.8 * sol,   // ASSUMPTION: canvas/plywood behaves worse than metal with no ceiling
  upper_floor:          (sol) => 0.8 * sol,         // ASSUMPTION: top floor directly under the roof
  west_facing:          (sol, h) => (h >= 13 ? 1.2 * sol + 0.4 : 0), // ASSUMPTION: afternoon sun on the west wall
  poor_ventilation:     () => 0.8,                  // ASSUMPTION
  cross_ventilation:    () => -0.6,                 // ASSUMPTION
  shade_trees:          (sol) => -0.8 * sol,        // ASSUMPTION
};
const HEAT_PER_CHILD = 0.025;    // °C per child, ASSUMPTION: 40 children ≈ +1.0 °C in a naturally ventilated room
const VAPOUR_PER_CHILD = 0.025;  // hPa per child, ASSUMPTION: breathing and sweat
const FAN_WBGT = [0, -0.6, -0.9]; // WBGT change with 0, 1, 2+ fans below fanMaxTemp, ASSUMPTION (air movement)
const AIRCON = { t: 27, rh: 60 };

// hour: { h, t, rh, sw }. b: { features, students?, fans? }. extraC: learned correction + any safety margin.
export function indoorHour(hour, b, extraC = 0) {
  const features = b.features ?? b; // accepts a bare feature object too
  const sol = Math.max(0, Math.min(1, (hour.sw ?? 0) / 800));
  if (features.aircon) {
    const wbgt = indoorWBGT(AIRCON.t, AIRCON.rh);
    return { t: AIRCON.t, rh: AIRCON.rh, hi: heatIndex(AIRCON.t, AIRCON.rh), wbgt, offset: AIRCON.t - hour.t };
  }
  const kids = b.students ?? LIMITS.studentsPerRoom;
  let dT = HEAT_PER_CHILD * kids + extraC;
  for (const [k, f] of Object.entries(OFFSETS)) if (features[k]) dT += f(sol, hour.h);
  const t = hour.t + dT;
  const rh = rhFrom(t, vapour(hour.t, hour.rh) + VAPOUR_PER_CHILD * kids);
  const radiant = features.roof_no_ceiling || features.makeshift ? 1.5 * sol : 0; // ASSUMPTION: hot roof radiates
  const fan = t < LIMITS.fanMaxTemp ? FAN_WBGT[Math.min(2, b.fans ?? 0)] : 0;
  return { t, rh, hi: heatIndex(t, rh), wbgt: indoorWBGT(t, rh, radiant) + fan, offset: dT };
}

export const classLevel = (wbgt) => (wbgt >= LIMITS.classUnsafeWBGT ? "unsafe" : wbgt >= LIMITS.classCautionWBGT ? "caution" : "safe");

// ---------- learning from the school's own readings ----------

// readings: [{ day: [{h,t,rh,sw}] (weather that day), h, t (measured indoor °C) }]
// Returns the building's learned correction: mean(measured − predicted), shrunk toward 0 when readings are few.
export function learnCorrection(b, readings) {
  if (!readings?.length) return { corr: 0, n: 0 };
  let sum = 0, n = 0;
  for (const r of readings) {
    const w = r.day.find((x) => x.h === r.h);
    if (!w || !Number.isFinite(r.t)) continue;
    sum += r.t - indoorHour(w, b).t; n++;
  }
  return { corr: sum / (n + LIMITS.readingPrior), n };
}

// ---------- sessions ----------

export const SESSIONS = {
  morning:   { hours: [6, 7, 8, 9, 10],      commute: [6, 7, 11] },   // arrive 06:00–07:00, leave ~11:00
  afternoon: { hours: [12, 13, 14, 15, 16],  commute: [11, 12, 17] }, // arrive ~12:00, leave ~17:00
  fullDay:   { hours: [7, 8, 9, 10, 11, 12, 13, 14, 15], commute: [7, 15] },
  // DM 064 Hinay shortened day: 06:00–10:00 and 14:00–18:00 (no one at school over midday).
  hinayAM:   { hours: [6, 7, 8, 9],          commute: [6, 10] },
  hinayPM:   { hours: [14, 15, 16, 17],      commute: [13, 18] },
};

const commuteHI = (x) => heatIndex(x.t, x.rh) + LIMITS.hiBias + 8 * LIMITS.commuteSunExposure * Math.max(0, Math.min(1, (x.sw ?? 0) / 800));
const hh = (h) => `${String(h).padStart(2, "0")}:00`;

// day: [{h, t, rh, sw}] hourly for one day.
// buildings: [{ id, name?, features, students?, fans?, corr?, nReadings? }] (corr from learnCorrection).
// opts.forecastHI: PAGASA forecast heat index for the day, if known (sets the 4H tier and the day veto).
export function assessDay(day, buildings, opts = {}) {
  const at = Object.fromEntries(day.map((x) => [x.h, x]));
  const shadeHI = day.filter((x) => x.h >= 6 && x.h <= 17).map((x) => heatIndex(x.t, x.rh) + LIMITS.hiBias);
  const peakHI = opts.forecastHI ?? Math.max(...shadeHI);
  const tier = tier4H(peakHI);
  const dayVeto = peakHI >= LIMITS.dayVetoHI;
  const out = { peakHI, tier, dayVeto, sessions: {} };
  for (const [name, s] of Object.entries(SESSIONS)) {
    const commute = s.commute.filter((h) => at[h]).map((h) => ({ h, hi: commuteHI(at[h]) }));
    const worst = commute.reduce((a, c) => (!a || c.hi > a.hi ? c : a), null);
    const commuteVeto = worst.hi >= LIMITS.commuteVetoHI;
    const perBuilding = buildings.map((b) => {
      const margin = tier.key === "hinto" && !(b.nReadings > 0) ? LIMITS.noReadingMarginC : 0;
      const hrs = s.hours.filter((h) => at[h]).map((h) => ({ h, ...indoorHour(at[h], b, (b.corr ?? 0) + margin) }));
      const bad = hrs.filter((x) => classLevel(x.wbgt) === "unsafe");
      const peak = hrs.reduce((a, x) => (x.wbgt > a.wbgt ? x : a));
      return { id: b.id, name: b.name, usable: bad.length === 0, unsafeHours: bad.map((x) => x.h), cautionHours: hrs.filter((x) => classLevel(x.wbgt) === "caution").map((x) => x.h),
        peakWBGT: peak.wbgt, peakT: Math.max(...hrs.map((x) => x.t)), peakAt: peak.h, margin, learned: b.nReadings > 0 };
    });
    const anyUsable = perBuilding.some((b) => b.usable);
    // Documented, site-specific reason (EO 130): what exactly makes this session unsafe.
    const evidence = dayVeto ? [`Forecast heat index ${peakHI.toFixed(0)} °C: PAGASA extreme danger`]
      : commuteVeto ? [`Heat index about ${worst.hi.toFixed(0)} °C at ${hh(worst.h)} while pupils walk to or from school`]
      : !anyUsable ? perBuilding.map((b) => `${b.name ?? b.id}: estimated indoor WBGT ${b.peakWBGT.toFixed(1)} at ${hh(b.peakAt)} (limit ${LIMITS.classUnsafeWBGT})${b.learned ? ", corrected by the school's readings" : ""}`)
      : [];
    out.sessions[name] = { commuteVeto, worstCommute: worst.hi, buildings: perBuilding, safe: !dayVeto && !commuteVeto && anyUsable, evidence,
      reason: dayVeto ? "day veto" : commuteVeto ? "commute too hot" : !anyUsable ? "no classroom safe" : "ok" };
  }
  const S = out.sessions;
  out.decision = S.fullDay.safe ? "full" : S.morning.safe ? "morning" : S.afternoon.safe ? "afternoon" : "closed";
  return out;
}

// ---------- helpers for forecasts ----------

// Forecast feeds without solar radiation get a clear-sky-shaped estimate (W/m²), ASSUMPTION.
export const fillSolar = (day) => day.map((x) => (Number.isFinite(x.sw) ? x : { ...x, sw: Math.max(0, Math.round(850 * Math.sin((Math.PI * (x.h - 6)) / 12.5))) }));
export const peakHeatIndex = (day) => Math.max(...day.filter((x) => x.h >= 6 && x.h <= 17).map((x) => heatIndex(x.t, x.rh)));
// Raise (or lower) air temperature so the day's peak heat index matches a target (e.g. PAGASA's forecast).
// The change is full at the hottest hour and fades to none at the coolest class hour; water vapour is held constant.
export function shiftToPeak(day, targetHI) {
  const his = day.filter((x) => x.h >= 6 && x.h <= 17).map((x) => heatIndex(x.t, x.rh));
  const lo = Math.min(...his), hi = Math.max(...his);
  const apply = (dT) => day.map((x) => { const w = hi > lo ? Math.max(0, Math.min(1, (heatIndex(x.t, x.rh) - lo) / (hi - lo))) : 1; const t = x.t + dT * w; return { ...x, t, rh: rhFrom(t, vapour(x.t, x.rh)) }; });
  let a = -10, b = 10;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (peakHeatIndex(apply(m)) < targetHI) a = m; else b = m; }
  return apply((a + b) / 2);
}
