// Store + view model tests (WEBAPP-PLAN.md §10). Run: node --test PRESKO/
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, memoryStorage, PermissionError, STORAGE_KEY, DEMO, addDays } from "./store.js";
import { viewModel, replayViewModel, statusOf } from "./selectors.js";

const TODAY = "2026-11-23", TMR = "2026-11-24";
const fixedNow = (iso = "2026-11-23T16:00:00+08:00") => () => new Date(iso);
const newStore = (opts = {}) => createStore({ today: TODAY, now: fixedNow(), ...opts });
const pandac = (st) => st.schools().find((s) => s.name === DEMO.pandac);
const asCoordinator = (st) => st.actions.setRole("coordinator", { name: "Coord" });
const asHead = (st, s) => st.actions.setRole("head", { name: "Ma. Santos", schoolId: s.id });
const asSdo = (st) => st.actions.setRole("sdo", { name: "SDS" });
const publish = (st, date, hi, status = "final") => { asCoordinator(st); st.actions.setDraft(hi, status); st.actions.publishForecast(date); };

test("demo seed: publish at 38 gives 3 official, 1 awaiting, rest none; Pandac slug resolves", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const vm = viewModel(st, { date: TMR });
  assert.equal(vm.decisions.official, 3);
  assert.equal(vm.decisions["awaiting-sdo"], 1);
  assert.equal(vm.decisions.none, st.schools().length - 4);
  assert.equal(st.bySlug("pandac-elementary-school").name, DEMO.pandac);
  const slugs = st.schools().map((s) => s.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  // one-shot: republishing 38 later doesn't seed again
  st.actions.setDraft(39); st.actions.publishForecast(TMR); st.actions.setDraft(38); st.actions.publishForecast(TMR);
  assert.equal(viewModel(st, { date: TMR }).decisions.official, 3);
});

test("roles: forbidden actions throw", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const p = pandac(st), other = st.schools()[5];
  asHead(st, p);
  assert.throws(() => st.actions.signOff(TMR, p.id, "x", "approved"), PermissionError);
  assert.throws(() => st.actions.recordDecision(TMR, other.id, { level: "HINGA" }), /own school/);
  assert.throws(() => st.actions.setDraft(40), PermissionError);
  asCoordinator(st);
  assert.throws(() => st.actions.recordDecision(TMR, p.id, { level: "HINGA" }), PermissionError);
  st.actions.setRole("teacher", { name: "T", schoolId: p.id });
  assert.throws(() => st.actions.editSetup(p.id, { sections: [] }), PermissionError);
  assert.throws(() => st.actions.setReading(TMR, p.id, p.buildings[0].id, 30), /today only/);
  // sign-off on a stale decision is refused
  asHead(st, p);
  const dec = st.actions.recordDecision(TMR, p.id, { level: "HAYO", reason: "test" });
  publish(st, TMR, 39);
  asSdo(st);
  assert.throws(() => st.actions.signOff(TMR, p.id, dec.id, "approved"), /re-confirm/);
});

test("two dates: at 08:15 on D with D+1 published, head can re-confirm D; D+1 unaffected", () => {
  const st = newStore({ now: fixedNow("2026-11-23T08:15:00+08:00") });
  const p = pandac(st);
  publish(st, TODAY, 30);             // yesterday's publish, for today
  asHead(st, p); st.actions.recordDecision(TODAY, p.id, { level: "HINAY" });
  publish(st, TMR, 38);               // coordinator already on tomorrow
  st.actions.setRole("teacher", { name: "T", schoolId: p.id });
  for (const b of p.buildings) st.actions.setReading(TODAY, p.id, b.id, 36);
  assert.equal(statusOf(st, TODAY, p.id), "stale-inputs");
  asHead(st, p);
  const re = st.actions.recordDecision(TODAY, p.id, { level: "HINGA" });
  assert.equal(re.kind, "morning");
  assert.equal(statusOf(st, TODAY, p.id), "official");
  assert.equal(statusOf(st, TMR, p.id), "none");
  assert.deepEqual(st.day(TMR).readings, {});
});

test("replay isolation: replay leaves days and storage unchanged and locks actions", () => {
  const storage = memoryStorage();
  const st = newStore({ storage });
  publish(st, TMR, 38);
  const before = storage.getItem(STORAGE_KEY), daysBefore = JSON.stringify(st.state.days);
  st.actions.startReplay("2024-04-01");
  const r = replayViewModel("2024-04-01");
  assert.equal(r.hi, 41);
  assert.equal(r.level, "HINGA");
  assert.equal(r.conflicts, 0);
  asHead(st, pandac(st));
  st.actions.exitReplay();
  st.actions.startReplay("2024-04-01");
  assert.throws(() => st.actions.recordDecision(TMR, pandac(st).id, { level: "HINGA" }), /Replay/);
  st.actions.exitReplay();
  assert.equal(JSON.stringify(st.state.days), daysBefore);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).days[TMR].forecast.hi, JSON.parse(before).days[TMR].forecast.hi);
  assert.equal(replayViewModel("2026-11-03").level, "HINTO");
});

test("view model: scene fields agree with panel counts; 0 conflicts at six heat values", () => {
  for (const hi of [25, 30, 38, 41.2, 43, 50]) {
    const st = newStore();
    st.actions.demoReset();
    st.state.demo.armed = false;
    publish(st, TMR, hi);
    const vm = viewModel(st, { date: TMR });
    assert.equal(vm.conflicts, 0, `hi ${hi}`);
    const tally = {};
    for (const v of vm.schools) tally[v.planType] = (tally[v.planType] || 0) + 1;
    for (const [k, n] of Object.entries(vm.tally)) assert.equal(tally[k] || 0, n, `${hi} ${k}`);
    assert.equal(vm.schools.reduce((a, v) => a + v.requestSections, 0), vm.requestSections);
    assert.equal(vm.schools.reduce((a, v) => a + (v.plan.assignments.length - v.f2fSections), 0) >= 0, true);
  }
});

test("persistence: round trip, schema bump, roster mismatch, storage failure", () => {
  const storage = memoryStorage();
  const a = newStore({ storage });
  publish(a, TMR, 38);
  const b = newStore({ storage });
  assert.equal(b.day(TMR).forecast.hi, 38);
  assert.equal(viewModel(b, { date: TMR }).decisions.official, 3);
  // schema bump
  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, schemaVersion: 0 }));
  const c = newStore({ storage });
  assert.equal(c.day(TMR).forecast, null);
  assert.ok(c.notices.length);
  // roster mismatch discards overrides and days
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, rosterHash: "other" }));
  const e = newStore({ storage });
  assert.equal(e.day(TMR).forecast, null);
  // storage throwing
  const f = newStore({ storage: memoryStorage({ fail: true }) });
  publish(f, TMR, 38);
  assert.equal(f.storageOk, false);
  assert.equal(f.day(TMR).forecast.hi, 38);
});

test("provenance: an edit flips illustrative to entered with who and when", () => {
  const st = newStore();
  const p = pandac(st);
  assert.equal(p.provenance.buildings, "illustrative");
  st.actions.setRole("custodian", { name: "Custodian", schoolId: p.id });
  st.actions.setBuildingNote(p.id, p.buildings[0].id, "Ceiling and roof insulation installed last year, windows on both sides, shade trees.");
  const after = pandac(st);
  assert.equal(after.provenance.buildings.label, "entered");
  assert.equal(after.provenance.buildings.by, "Custodian");
  assert.ok(after.provenance.buildings.at);
  assert.equal(after.buildings[0].source, "keywords");
});

test("setup edit: Pandac gets grounds for F2F at 38", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const p = pandac(st);
  assert.equal(viewModel(st, { date: TMR }).schools.find((v) => v.id === p.id).planType, "home");
  st.actions.setRole("custodian", { name: "C", schoolId: p.id });
  st.actions.setBuildingNote(p.id, p.buildings[0].id, "Ceiling and roof insulation installed last year, windows on both sides, shade trees.");
  const v = viewModel(st, { date: TMR }).schools.find((x) => x.id === p.id);
  assert.equal(v.planType, "request");
  assert.equal(v.requestSections, 14);
});

test("correction: only when last sent level differs, copyable only when official", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const p = pandac(st);
  asHead(st, p);
  st.actions.recordDecision(TMR, p.id, { level: "HINGA" });
  st.actions.markSent(TMR, p.id, "fb");
  publish(st, TMR, 39);   // still HINGA
  asHead(st, p);
  st.actions.recordDecision(TMR, p.id, { level: "HINGA" });
  assert.equal(viewModel(st, { date: TMR }).schools.find((v) => v.id === p.id).correction, null);
  publish(st, TMR, 42);   // HINTO
  let v = viewModel(st, { date: TMR }).schools.find((x) => x.id === p.id);
  assert.deepEqual([v.correction.from, v.correction.to, v.correction.ready], ["HINGA", "HINTO", false]);
  asHead(st, p);
  st.actions.recordDecision(TMR, p.id, { level: "HINTO" });
  v = viewModel(st, { date: TMR }).schools.find((x) => x.id === p.id);
  assert.equal(v.correction.ready, true);
  assert.throws(() => { publish(st, TMR, 43); asHead(st, p); st.actions.markSent(TMR, p.id, "fb"); }, /official/);
});

test("preview: draft 44 over published 38 doesn't change live view", () => {
  const st = newStore();
  publish(st, TMR, 38);
  st.actions.setDraft(44);
  const prev = viewModel(st, { date: TMR, preview: true }), live = viewModel(st, { date: TMR });
  assert.equal(prev.noClassesAnywhere, true);
  assert.equal(prev.decisions["stale-forecast"], 4);
  assert.equal(live.hi, 38);
  assert.equal(live.decisions.official, 3);
  assert.deepEqual(st.actions.republishImpact(TMR), { stale: 4, restored: 0 });
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
});
