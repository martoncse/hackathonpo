// node --test "PRESKO 2.0/model/plan.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDivision, planDivisionSafety, planSchoolSafety, correctionsFrom, check } from "../engine.js";
import { fillSolar, shiftToPeak, peakHeatIndex, LIMITS, tier4H } from "./safety-model.js";
import { DEMO_CLOSURE, REPLAY_NOV3, FORECAST_SNAPSHOT } from "../hourly-data.js";

const schools = makeDivision();
const hot = fillSolar(DEMO_CLOSURE);
const cool = fillSolar(FORECAST_SNAPSHOT.days["2026-11-22"]);

test("every plan passes the independent checker in all demo scenarios", () => {
  for (const [day, f] of [[cool], [hot], [REPLAY_NOV3.hours, REPLAY_NOV3.forecastHI]]) {
    const d = planDivisionSafety(schools, day, { forecastHI: f });
    d.plans.forEach((p, i) => assert.deepEqual(check(schools[i], p), [], schools[i].name));
  }
});

test("a cool day keeps almost every school on a full day", () => {
  const d = planDivisionSafety(schools, cool);
  assert.ok(d.tally.full >= 60, JSON.stringify(d.tally));
});

test("4H tiers follow DepEd Memo 064", () => {
  assert.equal(tier4H(26.9).key, "hayo"); assert.equal(tier4H(27).key, "hinay");
  assert.equal(tier4H(41.9).key, "hinga"); assert.equal(tier4H(42).key, "hinto");
});

test("day veto: a forecast at extreme danger closes every school", () => {
  const d = planDivisionSafety(schools, shiftToPeak(hot, 53), { forecastHI: 53 });
  assert.equal(d.tally.adm, schools.length);
});

test("commute veto cancels a session even with an air-conditioned room", () => {
  const ac = { ...schools[0], buildings: [{ ...schools[0].buildings[0], features: { aircon: true } }] };
  const saved = LIMITS.commuteVetoHI; LIMITS.commuteVetoHI = 40;
  try { assert.equal(planSchoolSafety(ac, hot).mode, "adm"); } finally { LIMITS.commuteVetoHI = saved; }
});

test("readings cooler than expected relax the plan; hotter readings tighten it", () => {
  const s = schools[0], day = REPLAY_NOV3.hours, f = REPLAY_NOV3.forecastHI;
  const base = planSchoolSafety(s, day, { forecastHI: f });
  const cooler = Object.fromEntries(s.buildings.map((b) => [b.id, [8, 12, 14].map((h) => ({ h, t: 30 }))]));
  const relaxed = planSchoolSafety(s, day, { forecastHI: f, corrections: correctionsFrom(s, day, cooler) });
  assert.equal(base.mode, "adm");
  assert.notEqual(relaxed.mode, "adm");
  const hotter = Object.fromEntries(s.buildings.map((b) => [b.id, [8, 12, 14].map((h) => ({ h, t: 48 }))]));
  const ic = schools.find((x) => /iloilo central/i.test(x.name));
  const icBase = planSchoolSafety(ic, hot), icHot = planSchoolSafety(ic, hot, { corrections: correctionsFrom(ic, hot, Object.fromEntries(ic.buildings.map((b) => [b.id, hotter[s.buildings[0].id]]))) });
  assert.notEqual(icBase.mode, "adm"); assert.equal(icHot.mode, "adm");
});

test("closures carry a documented reason", () => {
  const p = planSchoolSafety(schools[0], REPLAY_NOV3.hours, { forecastHI: 43 });
  assert.equal(p.mode, "adm");
  assert.ok(p.safety.sessions.morning.evidence.length > 0);
  assert.match(p.safety.sessions.morning.evidence[0], /WBGT \d+\.\d at \d\d:00/);
});

test("replay day matches PAGASA's 43 °C peak", () => {
  assert.ok(Math.abs(peakHeatIndex(REPLAY_NOV3.hours) - 43) < 0.1);
});

// ---------- DM 064 "4H" rules on top of the safety model ----------
import { planSchool4H, planDivision4H } from "../engine.js";
import { level } from "../rules.js";

test("4H level bands and the no-water rule", () => {
  assert.equal(level(26.9), "HAYO"); assert.equal(level(31), "HINAY"); assert.equal(level(40), "HINGA"); assert.equal(level(42), "HINTO");
  assert.equal(level(30, { water: false }), "HINGA"); assert.equal(level(45, { water: false }), "HINTO");
});

test("Hinto: no classes at all, not even home-based", () => {
  const d = planDivision4H(schools, REPLAY_NOV3.hours, { forecastHI: 43 });
  assert.equal(d.tally.stop, schools.length);
});

test("Hinay: never a regular day; classes only 06:00–10:00 or 14:00–18:00", () => {
  const day = shiftToPeak(cool, 31), d = planDivision4H(schools, day, { forecastHI: 31 });
  assert.equal(d.tally.full, 0);
  d.plans.forEach((p, i) => { p.assignments.filter((a) => a.slot !== "adm").forEach((a) => assert.ok(["hinayAM", "hinayPM"].includes(a.slot))); assert.deepEqual(check(schools[i], p), []); });
});

test("Hinga: home-based; cool rooms give grounds for a request, approval turns it into a short day", () => {
  const day = shiftToPeak(hot, 41);
  const d = planDivision4H(schools, day, { forecastHI: 41 });
  assert.equal(d.tally.full + d.tally.split + d.tally.splitPartial, 0);
  const i = d.plans.findIndex((p) => p.planType === "request");
  assert.ok(i >= 0 && d.plans[i].requestSections > 0);
  const approved = planSchool4H(schools[i], day, { forecastHI: 41, f2fApproved: true });
  assert.ok(["split", "splitPartial"].includes(approved.planType));
  assert.deepEqual(check(schools[i], approved), []);
});

test("No water at school forces Hinga on a Hinay day", () => {
  const p = planSchool4H(schools[0], shiftToPeak(cool, 31), { forecastHI: 31, water: false });
  assert.equal(p.level, "HINGA");
  assert.ok(["home", "request"].includes(p.planType));
});
