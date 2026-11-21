// Store + view model tests (WEBAPP-PLAN.md §10). Run: node --test PRESKO/
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, memoryStorage, PermissionError, AuthError, STORAGE_KEY, DEMO, addDays } from "./store.js";
import { ACCOUNTS, SESSION_KEY } from "./accounts.js";
import { parentMessage, chaseText, msgDate } from "./messages.js";
import { viewModel, replayViewModel, statusOf, updatesFor } from "./selectors.js";

const TODAY = "2026-11-23", TMR = "2026-11-24";
const fixedNow = (iso = "2026-11-23T16:00:00+08:00") => () => new Date(iso);
// The tests use the fixture seed (3 official + 1 override on the first publish at 38 °C); the app never arms it.
const newStore = (opts = {}) => { const st = createStore({ today: TODAY, now: fixedNow(), ...opts }); if (!st.hasSavedData) st.state.demo.armed = true; return st; };
const pandac = (st) => st.schools().find((s) => s.name === DEMO.pandac);
const asCoordinator = (st) => st.actions.setRole("coordinator", { name: "Coord" });
const asHead = (st, s) => st.actions.setRole("head", { name: "Demo Head (Pandac)", schoolId: s.id });
const asSdo = (st) => st.actions.setRole("sdo", { name: "SDS" });
const publish = (st, date, hi, status = "final") => { asCoordinator(st); st.actions.setDraft(hi, status); st.actions.publishForecast(date); };

test("fixture seed: publish at 38 gives 3 official, 1 awaiting, rest none; Pandac slug resolves", () => {
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
    asCoordinator(st);
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

// ---- sign-in (journey review §1) ----
const acct = (kind, school) => ACCOUNTS.find((a) => a.kind === kind && (!school || a.school === school));
const sessionStores = () => ({ local: memoryStorage(), session: memoryStorage() });

test("sign-in: wrong PIN, unknown email and empty fields throw AuthError with one message that names no field", () => {
  const st = newStore();
  const h = acct("head", DEMO.pandac);
  const msgs = [];
  for (const [e, p] of [[h.email, "0000"], ["nobody@presko.local", h.pin], ["", ""], [h.email, ""]]) {
    assert.throws(() => st.actions.signIn(e, p), (err) => { msgs.push(err.message); return err instanceof AuthError; });
  }
  assert.equal(new Set(msgs).size, 1);
  assert.doesNotMatch(msgs[0], /PIN is wrong|email is wrong|unknown email|incorrect PIN/i);
  assert.equal(st.role(), null);
});

test("sign-in: each account gets exactly its kind and school; email is case-insensitive", () => {
  const st = newStore();
  for (const a of ACCOUNTS) {
    st.actions.signIn(`  ${a.email.toUpperCase()} `, a.pin);
    const r = st.role();
    assert.equal(r.kind, a.kind);
    assert.equal(r.name, a.name);
    if (a.school) assert.equal(st.school(r.schoolId).name, a.school);
    else assert.equal(r.schoolId, null);
    st.actions.signOut();
  }
});

test("signed out: every action throws 'Sign in first.'", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const p = pandac(st);
  st.actions.signOut();
  assert.equal(st.role(), null);
  for (const f of [
    () => st.actions.recordDecision(TMR, p.id, { level: "HINGA" }),
    () => st.actions.setDraft(40),
    () => st.actions.publishForecast(TMR),
    () => st.actions.signOff(TMR, p.id, "x", "approved"),
    () => st.actions.setReading(TODAY, p.id, p.buildings[0].id, 30),
    () => st.actions.editSetup(p.id, { sections: [] }),
    () => st.actions.markSent(TMR, p.id, "fb"),
  ]) assert.throws(f, (e) => e instanceof PermissionError && /Sign in first/.test(e.message));
});

test("head signed in for Pandac cannot record, mark sent or set water for Jibao-an; second head can", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const jib = st.schools().find((s) => s.name === DEMO.override.name);
  const h = acct("head", DEMO.pandac), h2 = acct("head", DEMO.override.name);
  st.actions.signIn(h.email, h.pin);
  assert.throws(() => st.actions.recordDecision(TMR, jib.id, { level: "HINGA" }), /own school/);
  assert.throws(() => st.actions.setWater(TMR, jib.id, false), /own school/);
  assert.throws(() => st.actions.markSent(TMR, jib.id, "fb"), /own school/);
  const dec = st.actions.recordDecision(TMR, pandac(st).id, { level: "HINGA" });
  assert.equal(dec.by, "Liza Gonzaga");
  // SDO returns Jibao-an's seeded override; the Jibao-an head sees it in Updates and can revise
  st.actions.signOut();
  const sdo = acct("sdo");
  st.actions.signIn(sdo.email, sdo.pin);
  assert.match(updatesFor(st).map((u) => u.text).join(" "), /1 decision awaits you/);
  const jd = st.day(TMR).decisions[jib.id];
  st.actions.signOff(TMR, jib.id, jd.id, "returned", "Fans alone don't justify HINAY at 38°C");
  st.actions.signOut();
  st.actions.signIn(h2.email, h2.pin);
  assert.match(updatesFor(st).map((u) => u.text).join(" "), /returned your HINAY request/);
  assert.equal(statusOf(st, TMR, jib.id), "returned");
  st.actions.recordDecision(TMR, jib.id, { level: "HINGA" });
  assert.equal(statusOf(st, TMR, jib.id), "official");
});

test("session: remember → localStorage, otherwise sessionStorage; restored on reload; sign-out clears it; data blob has no role", () => {
  const storage = memoryStorage(), ss = sessionStores();
  const h = acct("head", DEMO.pandac);
  const a = newStore({ storage, sessionStores: ss });
  a.actions.signIn(h.email, h.pin, { remember: true });
  assert.ok(ss.local.getItem(SESSION_KEY));
  assert.equal(ss.session.getItem(SESSION_KEY), null);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).role, undefined);
  const b = newStore({ storage, sessionStores: ss });
  assert.equal(b.role().kind, "head");
  assert.equal(b.school(b.role().schoolId).name, DEMO.pandac);
  b.actions.signOut();
  assert.equal(ss.local.getItem(SESSION_KEY), null);
  assert.equal(newStore({ storage, sessionStores: ss }).role(), null);
  // not remembered: tab-only session
  b.actions.signIn(h.email, h.pin, { remember: false });
  assert.equal(ss.local.getItem(SESSION_KEY), null);
  assert.ok(ss.session.getItem(SESSION_KEY));
  // an old data blob that still carries a role does not sign anyone in
  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, role: { kind: "coordinator", name: "X", schoolId: null } }));
  assert.equal(newStore({ storage }).role(), null);
});

test("messages: parent message names its date; chase reminder caps the list at 10", () => {
  const st = newStore();
  publish(st, TMR, 38);
  const vm = viewModel(st, { date: TMR }), v = vm.schools.find((x) => x.id === pandac(st).id);
  assert.equal(msgDate(TMR), "Tue 24 Nov");
  assert.match(parentMessage(v, vm, "en", { official: false, schoolName: v.name }), /ADVISORY for Tue 24 Nov/);
  assert.match(parentMessage(v, vm, "tl", { official: false, schoolName: v.name }), /para sa Mar 24 Nob/);
  const names = Array.from({ length: 14 }, (_, i) => `School ${i}`);
  assert.match(chaseText(names, TMR), /School 9 \+4 more/);
  assert.doesNotMatch(chaseText(names, TMR), /School 10/);
});

test("admin controls: only the coordinator can reset data or move the operating day", () => {
  const st = newStore();
  assert.throws(() => st.actions.demoReset(), PermissionError);
  assert.throws(() => st.actions.setToday("2030-01-01"), PermissionError);
  asHead(st, pandac(st));
  assert.throws(() => st.actions.demoReset(), PermissionError);
  assert.throws(() => st.actions.setToday("2030-01-01"), PermissionError);
  asCoordinator(st);
  assert.throws(() => st.actions.setToday("not-a-date"), PermissionError);
  st.actions.setToday("2026-11-10");
  assert.equal(st.state.today, "2026-11-10");
  st.actions.demoReset();
  assert.equal(st.role().kind, "coordinator");
});

test("first open: a realistic working day is filled in, Pandac still to decide, one override awaiting the SDO", () => {
  const st = createStore({ today: TODAY, now: fixedNow() });
  st.seedActivity();
  const vmT = viewModel(st, { date: TODAY }), vmN = viewModel(st, { date: TMR });
  assert.equal(st.day(TODAY).forecast.status, "final");
  assert.equal(st.day(TMR).forecast.status, "provisional");
  assert.ok(vmT.decisions.official > 40);
  assert.ok(vmN.decisions.official > 30);
  assert.equal(vmN.decisions["awaiting-sdo"], 1);
  assert.equal(vmN.decisions.returned, 1);
  assert.equal(statusOf(st, TMR, pandac(st).id), "none");
  assert.ok(Object.keys(st.day(TODAY).readings).length > 10);
  assert.ok(!JSON.stringify(st.state.days).toLowerCase().includes("demo"));
});

test("heat replay: hourly heat index per school from real archive data; 1 April 2024 afternoon is HINGA or worse", async () => {
  const { makeReplay, heatColor } = await import("./replay.js");
  const st = newStore();
  const R = makeReplay("2024-04", st.schools());
  assert.equal(R.hours, 720); assert.equal(R.days, 30);
  const at2pm = R.at(14); // 1 Apr 2024, 14:00
  assert.equal(at2pm.length, st.schools().length);
  assert.ok(at2pm.every((v) => v >= 33 && v < 50), `range ${Math.min(...at2pm)}..${Math.max(...at2pm)}`);
  assert.ok(Math.min(...R.at(3)) < Math.min(...at2pm), "nights are cooler than afternoons");
  assert.equal(R.when(14).getUTCHours(), 14);
  assert.match(heatColor(40), /^rgb\(/);
  assert.equal(makeReplay("2026-11", st.schools()).days, 14);
});
