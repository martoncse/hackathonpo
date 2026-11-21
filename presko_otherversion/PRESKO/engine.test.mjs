// Run: node --test PRESKO/
import test from "node:test";
import assert from "node:assert/strict";
import { level, heatIndexC, dailyHI, calibrate, makeDivision, planDivision, planSchool, check, keywordFeatures, band, cityOverlay, ILOILO_HEAT, HOME, NONE, slotsFor, levels, recordDecision, sdoSignOff, decisionStatus, decisionsCSV, schoolSlots } from "./engine.js";

test("4H bands follow PAGASA categories", () => {
  assert.equal(level(26.9), "HAYO");
  assert.equal(level(27), "HINAY");
  assert.equal(level(32.9), "HINAY");
  assert.equal(level(33), "HINGA");
  assert.equal(level(41.9), "HINGA");
  assert.equal(level(42), "HINTO");
  assert.equal(level(25, { water: false }), "HINGA");
  assert.equal(level(44, { water: false }), "HINTO");
});

test("NWS heat index matches reference values", () => {
  // NWS table: 90°F / 70% RH -> 106°F (41.1°C); 96°F / 50% -> 108°F (42.2°C)
  assert.ok(Math.abs(heatIndexC(32.22, 70) - 41.1) < 0.6);
  assert.ok(Math.abs(heatIndexC(35.56, 50) - 42.2) < 0.6);
  // below 80°F the simple formula is used and stays close to air temperature
  assert.ok(Math.abs(heatIndexC(20, 50) - 19.6) < 1);
});

test("dailyHI keeps only 11:00-16:00", () => {
  const h = { time: ["2024-04-01T10:00", "2024-04-01T13:00", "2024-04-01T17:00"], temperature_2m: [40, 32, 40], relative_humidity_2m: [60, 60, 60] };
  assert.equal(Math.round(dailyHI(h)["2024-04-01"] * 10) / 10, Math.round(heatIndexC(32, 60) * 10) / 10);
});

test("calibrated replay days land near PAGASA's forecasts", () => {
  for (const d of ["2024-04-01", "2024-04-25", "2024-04-30"]) {
    assert.ok(Math.abs(calibrate(ILOILO_HEAT.raw[d]) - ILOILO_HEAT.pagasa[d]) <= 0.5, d);
  }
});

test("division excludes the private school", () => {
  const d = makeDivision();
  assert.equal(d.length, 69);
  assert.ok(!d.some((s) => s.name === "CPU Elementary School"));
});

test("every level produces 0 checker conflicts", () => {
  const d = makeDivision();
  for (const hi of [25, 30, 38, 41.2, 43, 50]) {
    const div = planDivision(d, hi);
    div.plans.forEach((p, i) => {
      assert.deepEqual(check(d[i], p), [], `${hi} ${d[i].name}`);
      assert.deepEqual(check(d[i], p, { asRequest: true }), [], `${hi} ${d[i].name} request`);
    });
  }
});

test("Hinga never puts anyone in class; Hinto gives no home work", () => {
  const d = makeDivision();
  for (const p of planDivision(d, 38).plans) assert.ok(p.assignments.every((a) => a.slot === HOME));
  for (const p of planDivision(d, 44).plans) assert.ok(p.assignments.every((a) => a.slot === NONE));
});

test("Hinay keeps everyone out of class 10:00-14:00", () => {
  const d = makeDivision();
  for (const p of planDivision(d, 30).plans) {
    const byId = slotsFor(d.find((x) => x.id === p.school));
    for (const a of p.assignments) {
      const s = byId[a.slot];
      if (s) assert.ok(s.end <= 10 || s.start >= 14);
    }
  }
});

test("checker catches a face-to-face class on a Hinga day", () => {
  const d = makeDivision();
  const p = planSchool(d[0], 38);
  const bad = { ...p, assignments: p.assignments.map((a, k) => (k === 0 ? { ...a, room: p.rooms[0].id, slot: "hinayAm" } : a)) };
  assert.ok(check(d[0], bad).some((x) => /Hinga/.test(x)));
});

test("demo: insulating Pandac's Building A gives grounds to request F2F", () => {
  const d = makeDivision();
  const pandac = d.find((s) => s.name === "Pandac Elementary School");
  assert.equal(planSchool(pandac, 41.2).mode, "home");
  pandac.buildings[0].features = keywordFeatures("Ceiling and roof insulation installed last year, windows on both sides, shade trees.");
  assert.equal(band(pandac.buildings[0].features).band, "green");
  const p = planSchool(pandac, 41.2);
  assert.equal(p.mode, "request");
  assert.deepEqual(check(pandac, p, { asRequest: true }), []);
});

test("city overlay", () => {
  assert.equal(cityOverlay(39), null);
  assert.equal(cityOverlay(40.5).status, "optional");
  assert.equal(cityOverlay(41.2, 41).status, "auto");
});

test("8:00 reading: a hotter building is emptied, every building hotter steps the school up", () => {
  const d = makeDivision();
  const s = d.find((x) => x.buildings.length >= 2);
  s.readings[s.buildings[0].id] = 35; // Hinga reading on a Hinay forecast
  let p = planSchool(s, 30);
  assert.equal(p.level, "HINAY");
  assert.ok(p.assignments.every((a) => !a.room || !a.room.startsWith(s.buildings[0].id + "-")));
  assert.deepEqual(check(s, p), []);
  for (const b of s.buildings) s.readings[b.id] = 35;
  p = planSchool(s, 30);
  assert.equal(p.level, "HINGA");
  assert.deepEqual(check(s, p), []);
});

test("checker catches a class in a building that read hotter", () => {
  const d = makeDivision();
  const s = d.find((x) => x.buildings.length >= 2);
  const p = planSchool(s, 30);
  const usedBuilding = s.buildings.find((b) => p.assignments.some((a) => a.room && a.room.startsWith(b.id + "-")));
  s.readings[usedBuilding.id] = 36;
  assert.ok(check(s, p).some((x) => /read hotter/.test(x)));
});

test("timetable: reported late shift is used and flagged at Hayo", () => {
  const d = makeDivision();
  const ic = d.find((x) => x.name === "Iloilo City National High School");
  assert.deepEqual(schoolSlots(ic).map((x) => x.label), ["06:00–13:10", "13:10–20:20"]);
  const p = planSchool(ic, 25);
  assert.ok(p.flags.some((f) => /afternoon heat peak/.test(f)));
  assert.deepEqual(check(ic, p), []);
});

test("timetable edits change normal hours and still check clean", () => {
  const d = makeDivision();
  const s = d.find((x) => !x.doubleShift);
  s.timetable.shifts = [[7, 12]];
  const p = planSchool(s, 25);
  assert.equal(p.normalLH, s.sections.reduce((a, x) => a + x.learners * 5, 0));
  assert.deepEqual(check(s, p), []);
});

test("decision record: override needs reason; less protective needs SDO; stale when forecast changes", () => {
  const d = makeDivision();
  const s = d[0];
  assert.throws(() => recordDecision(s, 38, { level: "HINAY", by: "Head" }), /reason/);
  recordDecision(s, 38, { level: "HINAY", by: "Head", reason: "New aircon in all rooms" });
  assert.equal(decisionStatus(s, 38), "awaiting-sdo");
  assert.equal(planSchool(s, 38).level, "HINAY");
  sdoSignOff(s, "approved", "OK after site visit");
  assert.equal(decisionStatus(s, 38), "official");
  assert.equal(decisionStatus(s, 39), "stale");
  assert.equal(planSchool(s, 39).level, "HINGA");
  recordDecision(s, 38, { level: "HINTO", by: "Head", reason: "Water interruption expected" });
  assert.equal(decisionStatus(s, 38), "official");
  assert.equal(decisionsCSV(d, 38).split(/\n/).length, d.length + 1);
});

test("a head choosing a cooler level does not empty buildings without readings", () => {
  const d = makeDivision();
  const s = d.find((x) => x.buildings.length >= 3);
  s.readings[s.buildings[2].id] = 36;
  recordDecision(s, 30, { level: "HAYO", by: "Head", reason: "Fans repaired" });
  const p = planSchool(s, 30);
  assert.equal(p.level, "HAYO");
  const usedA = p.assignments.some((a) => a.room && a.room.startsWith(s.buildings[0].id + "-"));
  assert.ok(usedA);
  assert.ok(p.assignments.every((a) => !a.room || !a.room.startsWith(s.buildings[2].id + "-")));
  assert.deepEqual(check(s, p), []);
});
