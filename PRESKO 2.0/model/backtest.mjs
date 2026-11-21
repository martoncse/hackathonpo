// Backtest the safety model on real Iloilo City weather (Open-Meteo archive) and real 2024 class suspensions.
// Run: node "PRESKO 2.0/model/backtest.mjs"  → prints a report and writes model/results.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assessDay, heatIndex, indoorHour, LIMITS, OFFSETS, vapour, rhFrom, tier4H, learnCorrection, CHECKPOINTS } from "./safety-model.js";
import { makeDivision, NOTE_TEMPLATES } from "../engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const load = (y) => {
  const d = JSON.parse(readFileSync(join(here, "data", `iloilo-${y}.json`), "utf8")).hourly;
  const days = {};
  d.time.forEach((t, i) => { const [day, hh] = t.split("T"); (days[day] ??= []).push({ h: +hh.slice(0, 2), t: d.temperature_2m[i], rh: d.relative_humidity_2m[i], sw: d.shortwave_radiation[i], wind: d.wind_speed_10m[i] }); });
  return days;
};

// Real labels: days Iloilo City public schools had no face-to-face classes because of heat (2024).
// Apr 1–2 (EO 047), Apr 3 (EO 047-B), Apr 4 (EO 047-C), Apr 5 (EO 047-D), Apr 25–26 (schools), Apr 29–30 (DepEd nationwide).
const SUSPENDED_2024 = new Set(["2024-04-01", "2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05", "2024-04-25", "2024-04-26", "2024-04-29", "2024-04-30"]);
// Non-class days in SY 2023–24 (weekends removed separately): Holy Week, Araw ng Kagitingan, Eid'l Fitr, Labor Day.
const HOLIDAYS = new Set(["2024-03-28", "2024-03-29", "2024-04-09", "2024-04-10", "2024-05-01"]);
const isWeekday = (iso) => { const wd = new Date(iso + "T00:00:00Z").getUTCDay(); return wd > 0 && wd < 6; };
function rand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const isSchoolDay = (iso) => { const wd = new Date(iso + "T00:00:00Z").getUTCDay(); return wd > 0 && wd < 6 && !HOLIDAYS.has(iso); };

const division = makeDivision();
// PAGASA heat-index forecasts quoted in the suspension orders vs Open-Meteo peak for the same day.
const PAGASA_2024 = { "2024-04-01": 41, "2024-04-02": 42, "2024-04-04": 42, "2024-04-05": 41.1 };
const fmt = (x, n = 1) => (Number.isFinite(x) ? x.toFixed(n) : "—");

const asBuildings = (s) => s.buildings.map((b) => ({ id: b.id, name: b.name, features: b.features, fans: /electric fans/.test(b.note) ? 2 : 0 }));
function dayOutcome(hours, opts = {}) {
  let anySession = 0, morningOnly = 0, closed = 0;
  for (const s of division) {
    const d = assessDay(hours, asBuildings(s), opts).decision;
    if (d === "full") anySession++; else if (d === "closed") closed++; else morningOnly++;
  }
  const a0 = assessDay(hours, [{ id: "x", features: {} }], opts);
  return { full: anySession, half: morningOnly, closed, peakHI: a0.peakHI, dayVeto: a0.dayVeto, commuteAM: a0.sessions.morning.worstCommute, commutePM: a0.sessions.afternoon.worstCommute };
}

// ---------- 1. Calibration check against the Accra classroom study ----------
const y24 = load(2024);
const classHours = Object.values(y24).flatMap((d) => d.filter((x) => x.h >= 8 && x.h <= 14));
const meanOffset = (f) => classHours.reduce((s, x) => s + indoorHour(x, f).offset, 0) / classHours.length - 1.0; // minus occupancy heat
const peakOffset = (f) => Math.max(...classHours.map((x) => indoorHour(x, f).offset - 1.0));
const calib = {
  metalNoCeiling: { model: meanOffset({ roof_no_ceiling: true }), modelPeak: peakOffset({ roof_no_ceiling: true }), study: 2.2, studyPeak: 5.9 },
  metalWithCeiling: { model: meanOffset({ ceiling_or_insulated: true }), study: -0.2 },
};

// ---------- 2. Day-by-day backtest, 2024 hot season ----------
const rows = Object.keys(y24).sort().filter(isSchoolDay).map((iso) => ({ iso, label: SUSPENDED_2024.has(iso) ? 1 : 0, ...dayOutcome(y24[iso]) }));

// ---------- 3. Fit: what heat index did officials act on? (logistic regression, 1 feature) ----------
function logistic(xs, ys, iters = 20000, lr = 0.05) {
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, sx = Math.sqrt(xs.reduce((a, b) => a + (b - mx) ** 2, 0) / xs.length);
  const z = xs.map((x) => (x - mx) / sx);
  let w = 0, b = 0;
  for (let i = 0; i < iters; i++) {
    let gw = 0, gb = 0;
    z.forEach((x, k) => { const p = 1 / (1 + Math.exp(-(w * x + b))); gw += (p - ys[k]) * x; gb += p - ys[k]; });
    w -= (lr * gw) / z.length; b -= (lr * gb) / z.length;
  }
  return { w: w / sx, b: b - (w * mx) / sx, p: (x) => 1 / (1 + Math.exp(-((w / sx) * x + (b - (w * mx) / sx)))) };
}
const fit = logistic(rows.map((r) => r.peakHI), rows.map((r) => r.label));
const threshold50 = -fit.b / fit.w;
// AUC: chance a random suspended day was hotter than a random open day (0.5 = heat explains nothing).
const pos = rows.filter((r) => r.label), neg = rows.filter((r) => !r.label);
const auc = pos.reduce((s, p) => s + neg.reduce((t, n) => t + (p.peakHI > n.peakHI ? 1 : p.peakHI === n.peakHI ? 0.5 : 0), 0), 0) / (pos.length * neg.length);
const medianSusp = [...pos].sort((a, b) => a.peakHI - b.peakHI)[Math.floor(pos.length / 2)].peakHI;
const hotterOpen = neg.filter((r) => r.peakHI > medianSusp).length;
const biasPairs = Object.entries(PAGASA_2024).map(([d, v]) => v - rows.find((r) => r.iso === d).peakHI);
const bias = biasPairs.reduce((a, b) => a + b, 0) / biasPairs.length;

// ---------- 3b. Re-run on PAGASA-calibrated weather ----------
// Find the air-temperature shift (water vapour held constant) that makes Open-Meteo's daily peak heat index
// match PAGASA's forecast on the order days, then apply it to every hour.
// The forecast heat index is a daily peak, so the correction is applied in proportion to how close each hour
// is to the day's peak (full at the peak hour, none at the coolest class hour).
const shiftDay = (hours, dT) => {
  const his = hours.filter((x) => x.h >= 6 && x.h <= 17).map((x) => heatIndex(x.t, x.rh));
  const lo = Math.min(...his), hi = Math.max(...his);
  return hours.map((x) => { const w = hi > lo ? Math.max(0, Math.min(1, (heatIndex(x.t, x.rh) - lo) / (hi - lo))) : 1; const t = x.t + dT * w; return { ...x, t, rh: rhFrom(t, vapour(x.t, x.rh)) }; });
};
const peakOf = (hours) => Math.max(...hours.filter((x) => x.h >= 6 && x.h <= 17).map((x) => heatIndex(x.t, x.rh)));
let tShift = 0;
for (let dT = 0; dT <= 8; dT += 0.05) {
  const err = Object.entries(PAGASA_2024).reduce((s, [d, v]) => s + (peakOf(shiftDay(y24[d], dT)) - v), 0) / 4;
  if (err >= 0) { tShift = Math.round(dT * 100) / 100; break; }
}
const rowsCal = Object.keys(y24).sort().filter(isSchoolDay).map((iso) => ({ iso, label: SUSPENDED_2024.has(iso) ? 1 : 0, ...dayOutcome(shiftDay(y24[iso], tShift)) }));
const notFull = (r) => r.closed + r.half;
const cmCal = { tp: 0, fp: 0, fn: 0, tn: 0 };
rowsCal.forEach((r) => { const m = notFull(r) > division.length / 2 ? 1 : 0; cmCal[m && r.label ? "tp" : m ? "fp" : r.label ? "fn" : "tn"]++; });

// Model's own call: the typical school (median) is not safe for a full day.
const modelCall = (r) => (r.closed + r.half > division.length / 2 ? 1 : 0);
const cm = { tp: 0, fp: 0, fn: 0, tn: 0 };
rows.forEach((r) => { const m = modelCall(r); cm[m && r.label ? "tp" : m ? "fp" : r.label ? "fn" : "tn"]++; });

// ---------- 4. Building archetypes on the hottest real day ----------
const hottest = rows.reduce((a, r) => (r.peakHI > a.peakHI ? r : a));
const archetypes = NOTE_TEMPLATES.map((t) => {
  const a = assessDay(shiftDay(y24[hottest.iso], tShift), [{ id: "x", features: t.features }]);
  const b = (s) => a.sessions[s].buildings[0];
  return { building: t.note.slice(0, 70), peakIndoorT: b("afternoon").peakT, peakWBGT: b("afternoon").peakWBGT, morning: b("morning").usable, afternoon: b("afternoon").usable };
});

// ---------- 5. Other years: how often would each check trigger? ----------
const yearly = [2023, 2024, 2025].map((y) => {
  const days = load(y), ds = Object.keys(days).sort().filter((iso) => { const wd = new Date(iso + "T00:00:00Z").getUTCDay(); return wd > 0 && wd < 6; });
  const outs = ds.map((iso) => dayOutcome(shiftDay(days[iso], tShift)));
  return { year: y, weekdays: ds.length, maxPeakHI: Math.max(...outs.map((o) => o.peakHI)), dayVetoDays: outs.filter((o) => o.dayVeto).length,
    commuteVetoDays: outs.filter((o) => o.commuteAM >= LIMITS.commuteVetoHI || o.commutePM >= LIMITS.commuteVetoHI).length,
    daysMostSchoolsNotFullDay: outs.filter((o) => o.closed + o.half > division.length / 2).length };
});

// ---------- report ----------
console.log("== 1. Calibration vs Accra classroom study (class hours 08–14, Iloilo 2024 weather) ==");
console.log(`metal roof, no ceiling: model mean +${fmt(calib.metalNoCeiling.model)} °C (study +2.2), model peak +${fmt(calib.metalNoCeiling.modelPeak)} °C (study up to +5.9)`);
console.log(`metal roof with ceiling: model mean ${fmt(calib.metalWithCeiling.model)} °C (study −0.2)`);
console.log("\n== 2. 2024 school days: real suspensions vs model ==");
console.log("date        label peakHI  commuteAM commutePM  full half closed");
rows.forEach((r) => console.log(`${r.iso}  ${r.label ? "SUSP" : "    "}  ${fmt(r.peakHI)}   ${fmt(r.commuteAM)}      ${fmt(r.commutePM)}      ${String(r.full).padStart(3)} ${String(r.half).padStart(4)} ${String(r.closed).padStart(5)}`));
console.log(`\n== 3. Logistic fit: P(suspended) vs Open-Meteo peak heat index ==`);
console.log(`n=${rows.length} school days, ${pos.length} suspended. AUC of peak heat index = ${fmt(auc, 2)} (0.5 = no signal). Fitted 50% point ${fmt(threshold50)} °C (not meaningful).`);
console.log(`${hotterOpen} open days were hotter than the median suspended day (${fmt(medianSusp)} °C).`);
console.log(`PAGASA forecast minus Open-Meteo peak on order days: ${biasPairs.map((b) => fmt(b)).join(", ")} → mean bias +${fmt(bias)} °C`);
console.log(`Model call "most schools not safe for a full day" vs real suspensions (raw Open-Meteo): TP ${cm.tp} FP ${cm.fp} FN ${cm.fn} TN ${cm.tn}`);
console.log(`\n== 3b. PAGASA-calibrated weather: peak-hour air temperature +${tShift} °C (scaled toward 0 at the coolest hour) ==`);
console.log("date        label peakHI commuteAM commutePM  full half closed");
rowsCal.forEach((r) => console.log(`${r.iso}  ${r.label ? "SUSP" : "    "}  ${fmt(r.peakHI)}  ${fmt(r.commuteAM)}     ${fmt(r.commutePM)}     ${String(r.full).padStart(3)} ${String(r.half).padStart(4)} ${String(r.closed).padStart(5)}`));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`Schools not safe for a full day: mean ${fmt(mean(rowsCal.filter((r) => r.label).map(notFull)))} on suspended days vs ${fmt(mean(rowsCal.filter((r) => !r.label).map(notFull)))} on open days (of ${division.length})`);
console.log(`Schools with no safe session: mean ${fmt(mean(rowsCal.filter((r) => r.label).map((r) => r.closed)))} on suspended days vs ${fmt(mean(rowsCal.filter((r) => !r.label).map((r) => r.closed)))} on open days`);
console.log(`Days with commute veto: ${rowsCal.filter((r) => r.commuteAM >= LIMITS.commuteVetoHI || r.commutePM >= LIMITS.commuteVetoHI).length}; day veto: ${rowsCal.filter((r) => r.dayVeto).length}`);
console.log(`Model "most schools not full day" vs suspensions: TP ${cmCal.tp} FP ${cmCal.fp} FN ${cmCal.fn} TN ${cmCal.tn}`);
console.log(`\n== 4. Building types on the hottest 2024 school day (${hottest.iso}), PAGASA-calibrated ==`);
archetypes.forEach((a) => console.log(`${a.morning ? "AM ok " : "AM no "}${a.afternoon ? "PM ok " : "PM no "} indoor ${fmt(a.peakIndoorT)}°C WBGT ${fmt(a.peakWBGT)}  ${a.building}`));
console.log("\n== 5. How often each check triggers (weekdays, Mar–May) ==");
yearly.forEach((y) => console.log(`${y.year}: peak HI ${fmt(y.maxPeakHI)} °C · day veto ${y.dayVetoDays} · commute veto ${y.commuteVetoDays} · most schools not full day ${y.daysMostSchoolsNotFullDay} of ${y.weekdays}`));

writeFileSync(join(here, "results.json"), JSON.stringify({ limits: LIMITS, calib, auc, bias, tShift, rowsCal, confusionCal: cmCal, hotterOpen, medianSusp, threshold50, confusion: cm, rows, hottest: hottest.iso, archetypes, yearly }, null, 1));

// ---------- 5b. DepEd 4H tiers over the 2024 school days (PAGASA-calibrated) ----------
const tierCount = {};
rowsCal.forEach((r) => { const k = tier4H(r.peakHI).label; tierCount[k] = (tierCount[k] || 0) + 1; });
console.log("\n== 5b. DepEd 4H tiers, 2024 school days (PAGASA-calibrated) ==");
console.log(Object.entries(tierCount).map(([k, v]) => `${k} ${v}`).join(" · "));
const hintoRows = rowsCal.filter((r) => r.peakHI >= 42);
console.log(`On Hinto days, schools the model would keep open in some form: mean ${fmt(mean(hintoRows.map((r) => r.full + r.half)))} of ${division.length}`);

// ---------- 5c. Replay 3 Nov 2026: 65 Iloilo City schools closed at a forecast heat index of 43 °C ----------
const nov = (() => { const d = JSON.parse(readFileSync(join(here, "data", "iloilo-2026-nov.json"), "utf8")).hourly; const days = {};
  d.time.forEach((t, i) => { const [day, hh] = t.split("T"); (days[day] ??= []).push({ h: +hh.slice(0, 2), t: d.temperature_2m[i], rh: d.relative_humidity_2m[i], sw: d.shortwave_radiation[i] }); }); return days; })();
const n3 = nov["2026-11-03"], n3Peak = peakOf(n3);
let n3Shift = 0; for (let dT = 0; dT <= 10; dT += 0.05) if (peakOf(shiftDay(n3, dT)) >= 43) { n3Shift = Math.round(dT * 100) / 100; break; }
const n3Cal = shiftDay(n3, n3Shift);
const n3Out = dayOutcome(n3Cal, { forecastHI: 43 });
const n3NoMargin = (() => { const m = LIMITS.noReadingMarginC; LIMITS.noReadingMarginC = 0; const o = dayOutcome(n3Cal, { forecastHI: 43 }); LIMITS.noReadingMarginC = m; return o; })();
console.log("\n== 5c. Replay 3 Nov 2026 (forecast heat index 43 °C, Hinto) ==");
console.log(`Open-Meteo peak ${fmt(n3Peak)} °C → PAGASA gap +${fmt(43 - n3Peak)} °C; calibrated with air temperature +${n3Shift} °C`);
console.log(`Model, no indoor readings (+${LIMITS.noReadingMarginC} °C margin): full day ${n3Out.full} · one session ${n3Out.half} · closed ${n3Out.closed} of ${division.length}`);
console.log(`Model, if every building had readings matching the estimate (no margin): full day ${n3NoMargin.full} · one session ${n3NoMargin.half} · closed ${n3NoMargin.closed}`);
const pandac = division[0];
const pandacA = assessDay(n3Cal, asBuildings(pandac), { forecastHI: 43 });
console.log(`Pandac ES on 3 Nov 2026: ${pandacA.decision}; ` + Object.entries(pandacA.sessions).map(([k, v]) => `${k} ${v.safe ? "safe" : v.reason}`).join(", "));
pandacA.sessions.fullDay.buildings.forEach((b) => console.log(`  ${b.name}: full-day peak WBGT ${fmt(b.peakWBGT)} at ${b.peakAt}:00, peak ${fmt(b.peakT)} °C, unsafe hours ${b.unsafeHours.join(",") || "none"}`));
pandacA.sessions.morning.buildings.forEach((b) => console.log(`  ${b.name}: morning peak WBGT ${fmt(b.peakWBGT)} at ${b.peakAt}:00`));
console.log(`  commute AM ${fmt(pandacA.sessions.morning.worstCommute)} · PM ${fmt(pandacA.sessions.afternoon.worstCommute)}`);

// ---------- 5d. Learning from readings (SIMULATED readings, real weather) ----------
// A building the records call "metal roof, no ceiling" that had a ceiling fitted after the NSBI survey.
// Its true indoor temperature runs about 3.0 °C below the model. Readings at 08:00, 12:00, 14:00 on 10 school days.
const r = rand(7);
const bldg = { id: "demo", name: "Building A", features: pandac.buildings[0].features };
const learnDays = Object.keys(nov).sort().filter((d) => d < "2026-11-03" && isWeekday(d)).slice(-10);
const readings = [], curve = [];
for (const d of learnDays) {
  const day = shiftDay(nov[d], n3Shift);
  for (const h of CHECKPOINTS) { const w = day.find((x) => x.h === h); readings.push({ day, h, t: indoorHour(w, bldg).t - 3.0 + (r() - 0.5) * 0.8 }); }
  curve.push({ day: d, n: readings.length, corr: learnCorrection(bldg, readings).corr });
}
console.log("\n== 5d. Learning from checkpoint readings (simulated readings, real Nov 2026 weather) ==");
curve.forEach((c) => console.log(`${c.day}: ${c.n} readings → learned correction ${fmt(c.corr, 2)} °C`));
const learned = learnCorrection(bldg, readings);
const before = assessDay(n3Cal, [bldg], { forecastHI: 43 }), after = assessDay(n3Cal, [{ ...bldg, corr: learned.corr, nReadings: learned.n }], { forecastHI: 43 });
console.log(`3 Nov morning, Building A alone: before readings ${before.sessions.morning.safe ? "safe" : "unsafe"} (peak WBGT ${fmt(before.sessions.morning.buildings[0].peakWBGT)}) → after ${after.sessions.morning.safe ? "safe" : "unsafe"} (peak WBGT ${fmt(after.sessions.morning.buildings[0].peakWBGT)})`);

// ---------- 6. Sensitivity: how much do the chosen limits matter? (2024, PAGASA-calibrated) ----------
console.log("\n== 6. Sensitivity (2024 school days, PAGASA-calibrated) ==");
const sens = [];
const days24 = Object.keys(y24).sort().filter(isSchoolDay).map((iso) => shiftDay(y24[iso], tShift));
const base = { ...LIMITS };
for (const w of [30, 31, 32]) {
  LIMITS.classUnsafeWBGT = w;
  const outs = days24.map(dayOutcome);
  const r = { classUnsafeWBGT: w, schoolDaysNoSafeSession: outs.reduce((s, o) => s + o.closed, 0), daysMostSchoolsNotFull: outs.filter((o) => o.closed + o.half > division.length / 2).length, worstDayClosed: Math.max(...outs.map((o) => o.closed)) };
  sens.push(r);
  console.log(`unsafe at WBGT ≥ ${w}: ${r.schoolDaysNoSafeSession} school-days with no safe session · ${r.daysMostSchoolsNotFull} days most schools not full day · worst day ${r.worstDayClosed} of ${division.length} schools closed`);
}
Object.assign(LIMITS, base);
const commutePeaks = days24.map((d) => dayOutcome(d)).map((o) => Math.max(o.commuteAM, o.commutePM));
for (const c of [44, 46, 48, 50]) console.log(`commute veto at HI ≥ ${c}: ${commutePeaks.filter((x) => x >= c).length} of ${days24.length} days`);
const res = JSON.parse(readFileSync(join(here, "results.json"), "utf8"));
writeFileSync(join(here, "results.json"), JSON.stringify({ ...res, sensitivity: sens, commutePeaks, tierCount, nov3: { omPeak: n3Peak, shift: n3Shift, withMargin: n3Out, noMargin: n3NoMargin, pandac: pandacA }, learning: { curve, before: before.sessions.morning, after: after.sessions.morning } }, null, 1));
