// Dated, official-only engine behaviour used by the web app (WEBAPP-PLAN.md §3–§4). Run: node --test PRESKO/
import test from "node:test";
import assert from "node:assert/strict";
import {
  makeDivision, withDay, levels, planSchool, planDivision, check, decisionStatus, recordDecision, sdoSignOff,
  staleCause, statusSentence, morningChange, isLate, decisionsCSV, keywordFeatures, STATUSES,
} from "./engine.js";

const D1 = "2026-11-23", D2 = "2026-11-24";
const OFF = (forDate) => ({ forDate, officialOnly: true });
const emptyDay = () => ({ water: {}, readings: {}, decisions: {}, sent: {} });
const pandacEdited = () => {
  const d = makeDivision();
  const p = d.find((s) => s.name === "Pandac Elementary School");
  p.buildings[0].features = keywordFeatures("Ceiling and roof insulation installed last year, windows on both sides, shade trees.");
  return { d, p };
};
const decide = (school, day, hi, args) => {
  const dec = recordDecision(withDay(school, day), hi, { by: "Head", forDate: args.forDate, ...args });
  day.decisions[school.id] = dec;
  return dec;
};

test("day isolation: day-1 decision and readings don't apply on day 2 with the same forecast", () => {
  const d = makeDivision(), s = d[0];
  const day1 = emptyDay(), day2 = emptyDay();
  day1.readings[s.id] = Object.fromEntries(s.buildings.map((b) => [b.id, 45]));
  decide(s, day1, 38, { level: "HINTO", forDate: D1 });
  assert.equal(decisionStatus(withDay(s, day1), 38, { forDate: D1 }), "official");
  assert.equal(decisionStatus(withDay(s, day2), 38, { forDate: D2 }), "none");
  assert.equal(planSchool(withDay(s, day2), 38, OFF(D2)).level, "HINGA");
  // a day-1 decision object leaking into day 2 still doesn't count
  day2.decisions[s.id] = day1.decisions[s.id];
  assert.equal(decisionStatus(withDay(s, day2), 38, { forDate: D2 }), "none");
});

test("readings after a decision: stale-inputs, effective is the worse level, old plan fails the check", () => {
  const d = makeDivision(), s = d.find((x) => x.buildings.length >= 2), day = emptyDay();
  decide(s, day, 30, { level: "HINAY", forDate: D1 });
  const before = planSchool(withDay(s, day), 30, OFF(D1));
  assert.equal(before.level, "HINAY");
  day.readings[s.id] = Object.fromEntries(s.buildings.map((b) => [b.id, 36]));
  const sd = withDay(s, day);
  assert.equal(decisionStatus(sd, 30, { forDate: D1 }), "stale-inputs");
  assert.deepEqual(staleCause(sd, 30), ["readings"]);
  assert.equal(statusSentence(sd, 30, { forDate: D1 }), "8:00 readings call for HINGA");
  const after = planSchool(sd, 30, OFF(D1));
  assert.equal(after.level, "HINGA");
  assert.deepEqual(check(sd, after), []);
  if (before.assignments.some((a) => a.room)) assert.ok(check(sd, before).length > 0);
});

test("official-only: awaiting or returned less-protective decision doesn't drive the plan", () => {
  const d = makeDivision(), s = d[0], day = emptyDay();
  const dec = decide(s, day, 38, { level: "HAYO", reason: "test", forDate: D1 });
  let sd = withDay(s, day);
  assert.equal(decisionStatus(sd, 38, { forDate: D1 }), "awaiting-sdo");
  const off = planSchool(sd, 38, OFF(D1));
  assert.equal(off.level, "HINGA");
  assert.equal(off.basis, "official");
  assert.deepEqual(check(sd, off), []);
  const prop = planSchool(sd, 38, { forDate: D1, proposed: true });
  assert.equal(prop.level, "HAYO");
  assert.equal(prop.basis, "proposed");
  day.decisions[s.id] = sdoSignOff(dec, "returned", "Not enough evidence", { currentStatus: "awaiting-sdo", latestId: dec.id });
  sd = withDay(s, day);
  assert.equal(decisionStatus(sd, 38, { forDate: D1 }), "returned");
  assert.equal(planSchool(sd, 38, OFF(D1)).level, "HINGA");
  day.decisions[s.id] = sdoSignOff(dec, "approved", "", { currentStatus: "awaiting-sdo", latestId: dec.id });
  assert.equal(planSchool(withDay(s, day), 38, OFF(D1)).level, "HAYO");
});

test("status order and overlaps; water cause; already-more-protective is not stale", () => {
  const d = makeDivision(), s = d.find((x) => x.buildings.length >= 2);
  // returned + raised readings -> stale-inputs wins
  let day = emptyDay();
  let dec = decide(s, day, 30, { level: "HAYO", reason: "x", forDate: D1 });
  day.decisions[s.id] = sdoSignOff(dec, "returned", "no", { currentStatus: "awaiting-sdo" });
  day.readings[s.id] = Object.fromEntries(s.buildings.map((b) => [b.id, 36]));
  assert.equal(decisionStatus(withDay(s, day), 30, { forDate: D1 }), "stale-inputs");
  // stale-forecast + readings -> stale-forecast wins
  assert.equal(decisionStatus(withDay(s, day), 31, { forDate: D1 }), "stale-forecast");
  // water off after decision -> stale-inputs, cause water
  day = emptyDay();
  decide(s, day, 30, { level: "HINAY", forDate: D1 });
  day.water[s.id] = false;
  const sd = withDay(s, day);
  assert.equal(decisionStatus(sd, 30, { forDate: D1 }), "stale-inputs");
  assert.deepEqual(staleCause(sd, 30), ["water"]);
  assert.equal(statusSentence(sd, 30, { forDate: D1 }), "No water: HINGA required");
  // head already at HINTO; readings raise rule to HINGA -> not stale
  day = emptyDay();
  decide(s, day, 30, { level: "HINTO", reason: "No fans working", forDate: D1 });
  day.readings[s.id] = Object.fromEntries(s.buildings.map((b) => [b.id, 36]));
  assert.equal(decisionStatus(withDay(s, day), 30, { forDate: D1 }), "official");
});

test("status counts sum to the number of schools", () => {
  const d = makeDivision(), day = emptyDay();
  decide(d[0], day, 38, { level: "HINGA", forDate: D1 });
  decide(d[1], day, 38, { level: "HAYO", reason: "x", forDate: D1 });
  decide(d[2], day, 37, { level: "HINGA", forDate: D1 });
  const sd = d.map((s) => withDay(s, day));
  for (const opts of [OFF(D1), {}]) {
    const div = planDivision(sd, 38, opts);
    const keys = opts.forDate ? STATUSES : ["none", "stale", "returned", "awaiting-sdo", "official"];
    assert.equal(keys.reduce((a, k) => a + div.decisions[k], 0), d.length);
  }
  const div = planDivision(sd, 38, OFF(D1));
  assert.equal(div.decisions.official, 1);
  assert.equal(div.decisions["awaiting-sdo"], 1);
  assert.equal(div.decisions["stale-forecast"], 1);
});

test("sign-off guard", () => {
  const d = makeDivision(), s = d[0], day = emptyDay();
  const dec = decide(s, day, 38, { level: "HAYO", reason: "x", forDate: D1 });
  for (const st of ["none", "stale-forecast", "stale-inputs"]) assert.throws(() => sdoSignOff(dec, "approved", "", { currentStatus: st }), /re-confirm/);
  assert.throws(() => sdoSignOff(dec, "approved", "", { currentStatus: "awaiting-sdo", latestId: "other" }), /newer/);
  assert.throws(() => sdoSignOff(dec, "returned", " ", { currentStatus: "awaiting-sdo" }), /note/);
  const approved = sdoSignOff(dec, "approved", "", { currentStatus: "awaiting-sdo", latestId: dec.id });
  assert.equal(approved.sdo, "approved");
  assert.equal(dec.sdo, "pending"); // pure
  // re-confirm creates a new decision: approval reset
  const again = decide(s, day, 38, { level: "HAYO", reason: "x", forDate: D1 });
  assert.notEqual(again.id, approved.id);
  assert.equal(again.sdo, "pending");
});

test("empty day: same F2F requests as explicit water; CSV doesn't throw", () => {
  const { d } = pandacEdited();
  const empty = d.map((s) => withDay(s, {}));
  const explicit = d.map((s) => ({ ...s, water: true, readings: {}, decision: null }));
  const a = planDivision(empty, 38, OFF(D1)), b = planDivision(explicit, 38, OFF(D1));
  assert.ok(a.tally.request > 0);
  assert.equal(a.tally.request, b.tally.request);
  assert.equal(a.requestSections, b.requestSections);
  assert.equal(planSchool(withDay(d[0], {}), 38, OFF(D1)).mode, "request"); // edited Pandac
  const raw = d.map((s) => ({ ...s, readings: undefined, water: undefined }));
  assert.doesNotThrow(() => decisionsCSV(raw, 38, { forDate: D1 }));
  assert.doesNotThrow(() => decisionsCSV(raw, 38));
});

test("preview: decisions at 38 are stale-forecast at 44; every school no classes; live unchanged", () => {
  const d = makeDivision(), day = emptyDay();
  [0, 1, 2].forEach((i) => decide(d[i], day, 38, { level: "HINGA", forDate: D1 }));
  const sd = d.map((s) => withDay(s, day));
  const live = planDivision(sd, 38, OFF(D1));
  const preview = planDivision(sd, 44, OFF(D1));
  assert.equal(preview.decisions["stale-forecast"], 3);
  assert.equal(preview.tally.stop, d.length);
  assert.equal(live.decisions.official, 3);
  assert.equal(planDivision(sd, 38, OFF(D1)).decisions.official, 3);
});

test("late flag: after 17:00 Manila the day before; morning re-confirms exempt", () => {
  const base = { forDate: D1, kind: "evening" };
  assert.equal(isLate({ ...base, at: "2026-11-22T16:59:00+08:00" }), false);
  assert.equal(isLate({ ...base, at: "2026-11-22T17:01:00+08:00" }), true);
  assert.equal(isLate({ ...base, kind: "morning", at: "2026-11-23T08:15:00+08:00" }), false);
});

test("republish back: 38 -> 39 -> 38 restores decisions made at 38", () => {
  const d = makeDivision(), s = d[0], day = emptyDay();
  decide(s, day, 38, { level: "HINGA", forDate: D1 });
  const sd = withDay(s, day);
  assert.equal(decisionStatus(sd, 39, { forDate: D1 }), "stale-forecast");
  assert.equal(decisionStatus(sd, 38, { forDate: D1 }), "official");
});

test("morning change: emptied buildings and level change", () => {
  const d = makeDivision(), s = d.find((x) => x.buildings.length >= 2);
  const one = { ...withDay(s, {}), readings: { [s.buildings[0].id]: 36 } };
  const m1 = morningChange(one, 30);
  assert.deepEqual(m1.emptied, [s.buildings[0].id]);
  assert.equal(m1.levelChange, null);
  const all = { ...withDay(s, {}), readings: Object.fromEntries(s.buildings.map((b) => [b.id, 36])) };
  assert.deepEqual(morningChange(all, 30).levelChange, { from: "HINAY", to: "HINGA" });
});

test("extended CSV columns", () => {
  const d = makeDivision(), day = emptyDay();
  decide(d[0], day, 38, { level: "HINGA", forDate: D1, system: true });
  day.sent[d[0].id] = [{ level: "HINGA", at: "x", channel: "fb" }];
  const csv = decisionsCSV(d.map((s) => withDay(s, day)), 38, { forDate: D1, forecast: { status: "final", publishedAt: "t" } });
  const [head, first] = csv.split("\n");
  for (const col of ["for_date", "forecast_status", "recommended_snapshot", "recommended_now", "status", "cause", "late", "sent_level", "system", "prov_entered"]) assert.ok(head.includes(`"${col}"`), col);
  assert.ok(first.includes('"demo seed"'));
  assert.ok(first.includes(`"${D1}"`));
});
