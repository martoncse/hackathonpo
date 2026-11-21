VERDICT: CHANGES REQUIRED

# Data review, round 1: `PRESKO/WEBAPP-PLAN.md` (draft v1)

Reviewed against `PRESKO/data-flow.html`, `PRESKO/engine.js`, `PRESKO/engine.test.mjs` (17/17 green), `PRESKO/index.html` and `reports/Presko prototype plan verified.md`. I checked the claims by running the engine (`makeDivision()`, `planDivision`, `planSchool`, `recordDecision`, `sdoSignOff`, `cityOverlay`).

What works: all 11 engine functions the plan names exist and are exported. "22 schools have grounds for F2F" at 38 °C is correct (`tally.request` = 22, `requestSections` = 213). Pandac's "14 of 22" after the note edit is correct. Pandac does have Buildings A, B and C (A and B hot, C typical). The stale-on-forecast-change journey matches `decisionStatus`. Having one derived view model (`selectors.js`) is the right approach.

The blocking issues are mostly about **time and authority**. The engine does not know which day it is planning. It treats any recorded decision as effective, whether or not the SDO approved it. And it keeps a decision valid after the 8:00 readings change the recommendation. The prototype could live with these gaps while it was a single page. A two-mode app that saves state for a whole day cannot.

---

## BLOCKING

### 1. The data model has no date, so readings, water and decisions carry over to the next day
`levels()` only treats a decision as valid when `d.hi === hi`. Readings have no date. The store's `forecast.at` is never compared with anything. With `localStorage` persistence:
- On day 2 the coordinator types a new forecast. Day 1's 8:00 readings still apply to day 2's plan, so buildings are emptied for no reason.
- If day 2's forecast equals day 1's (38 again, which is common in April), day 1's decision comes back as **official**, along with its SDO approval and its "Ready to send" parent message.

**Fix:**
- Add `forecast.forDate` (ISO date of the school day being planned). Store `decision.forDate`, and key `readings` and `water` by date, e.g. `days[forDate].schools[id] = { water, readings, decision }`.
- The selector builds the school object for the engine from that day's records only.
- Treat a decision as stale if `forDate` differs *or* `hi` differs. This can live in the store or selector without changing the engine. Alternatively, extend `recordDecision`/`decisionStatus` with an optional `forDate`.
- Add `forDate` to the CSV (extend `decisionsCSV` with an optional `meta` argument, or prepend the column in the app).

### 2. A decision stays valid after the 8:00 readings raise the recommendation, so classes stay face-to-face on a Hinga reading
Reproduced:
1. Record HINAY on a 30 °C forecast (status official, no SDO needed).
2. Next morning, every building reads 36. `recommended` becomes HINGA.
3. `effective` stays HINAY. The mode is `split` (sections in class), status stays **official**, and `check()` returns `[]`.

The stored `decision.lessProtective` is a snapshot taken before the readings, so the SDO is never asked. This is the one place where the "whichever is worse" assumption actually matters, and the app silently undoes it. The plan's morning journey (§5.6) and "whether the school level changed" depend on this behaviour, but the plan never says what happens to the official decision.

**Fix** (engine extension; state it in the plan):
- In `levels()`, a decision counts only if `d.hi === hi && d.recommended === recommended(current readings)`. Otherwise:
  - `decisionStatus` returns a new status `"stale-readings"`, shown as "Re-confirm: 8:00 readings changed the level".
  - `effective = worse(d.level, recommended)`. Readings can only raise the level, so this never ends up less protective than either the head's choice or the readings.
- `check()` uses the same rule, so the checker catches this case.
- Show the morning update (issue 6) when `effective` changes because of readings. A more protective step-up needs no SDO approval. Label it "8:00 reading, whichever is worse (assumption)".
- Add a `stale-readings` row to the Decisions queue filter, the status bar and `planDivision().decisions`.

### 3. Unapproved and returned decisions already drive the plan, the 3D scene, the KPIs and the checker
`levels()` sets `effective = decided` whatever `d.sdo` says. Reproduced on a 38 °C (Hinga) day:
- A head records HAYO with a reason. Status is `awaiting-sdo`, but `planSchool().mode` is `full`: every section is face-to-face.
- The SDO then **returns** it. `effective` is still HAYO.

The checker uses the same `effective`, so it reports 0 conflicts. As a result, the Division columns, learner-hours kept and "0 rule conflicts" would all show an unapproved, less protective plan as fact. Only the parent message is gated, because it shows "Draft" until official.

**Fix:**
- Add an option such as `levels(school, hi, { officialOnly: true })`, also on `planSchool` and `check`. With it, `decided` counts only when the decision is official, or when it is at least as protective as `recommended`.
- Keep the current default so that `engine.test.mjs` line 141 stays valid, or update that test on purpose.
- The selectors always use `officialOnly`. The school drawer and the Decisions queue can show the *proposed* plan beside it as a second, clearly labelled plan ("If the SDO approves: …").
- On `returned`, the effective level falls back to `recommended`.

### 4. Replay can overwrite the live store, and it is not defined which heat value drives a replay
"Running a replay sets the scene to that date" plus `store.replay` suggests that the live `forecast.hi` gets replaced. Any decision recorded live would then turn stale, and anything typed during a replay would be saved.

The value that drives the replay also matters. On 3 Nov 2026 PAGASA said 43 (HINTO), while calibrated is 36.7 + 3.7 = 40.4 (HINGA). That gives different levels, a different city banner and a different number of request schools. Journey 8 hides this only because both 1 April values are HINGA.

**Fix:**
- Replay runs on a fresh `makeDivision()` (or a deep clone), with its own `hi`, held in memory only.
- It is never persisted, and the live `forecast`, `days` and `decisions` stay untouched (add a test for this).
- Show a persistent "REPLAY: 1 Apr 2024, not live" banner. Disable decision, sign-off, readings and setup inputs, and show an "Exit replay" control.
- The level and plan come from **PAGASA's reported forecast**, labelled "news-reported", matching `REPLAYS[1].precedent`. Show computed and calibrated values (±2 °C, "replay only", `CALIBRATION.basis`) for comparison only.
- State in the plan that `calibrate()` is never applied to a typed forecast.

### 5. Role permissions are not specified or enforced
The role picker sets a mode, but the plan never says who may do what. The data rules need to hold in the store, not only by hiding buttons:

| Action (store function) | Allowed roles |
|---|---|
| `setForecast`, `setCityAuto` | DRRM coordinator |
| `recordDecision` | School head of *that* school only |
| `sdoSignOff` | SDO approver only |
| `setReading` | Teacher on duty or school head of that school, for today's `forDate` only |
| `setWater` | School head |
| `editSetup` (buildings, notes, features, sections, timetable) | Property custodian or school head |

**Fix:**
- Every store action takes the current role and throws if the role is not allowed. Admin roles cannot record a head's decision. School roles cannot sign off.
- `sdoSignOff` is only allowed when the status is `awaiting-sdo` or `official` and the decision is not stale. Approving yesterday's decision or one made under another forecast must be refused, because the engine itself does not check this.
- Pre-fill `by` from the role name, but still record it.
- State that the "Switch role" demo control is the only bypass.
- Add a test for each refusal.

### 6. The plan relies on variables the engine does not have, without saying how they are computed
- **"PAGASA 5 p.m. advisory received" checkbox:** the engine has no such field. Define it as forecast metadata `{ pagasa5pm, at }`. It does not affect levels. When it goes from unchecked to checked with a changed `hi`, decisions are marked "re-confirm" (already covered by the `hi` check). Show it on the Division rail and in each school's status line. Write it to the CSV as `forecast_source` = `"PAGASA 5 p.m."` or `"earlier PAGASA figure"`.
- **Storeys / "rooms as cells on each floor":** buildings only have `rooms` and the `upper_floor` feature. Either add `buildings[].storeys` as a Setup input (provenance: illustrative, derived from the template note "one-/two-/three-storey"), or say that storeys are cosmetic and inferred from the note. Do not let them affect any engine output.
- **Roof rendering:** define the case where neither `roof_no_ceiling` nor `ceiling_or_insulated` is true (a neutral roof).
- **Morning update message:** `index.html` has no such template. Add it to `messages.js`, with a defined trigger: `effective` changed because of readings (issue 2), *or* at least one building is emptied.
  - §4 says "if the level changed", but journey 6 shows it when only Building C is emptied and the school stays HINAY. Pick one rule and update both places.
  - Name its status. It is not gated by SDO approval because it is more protective, but it must name the reading and "whichever is worse (assumption)".
- **Column height, ghost column, emptied building:** define them in `selectors.js` from engine fields:
  - height = `assignments.filter(a => a.room).length`
  - ghost = `request?.filter(a => a.slot !== HOME).length`
  - building emptied = `levels.byBuilding[b] > levels.recommended` (same rule as `roomsOf`)

  With issue 3, these must use the official-only plan.

### 7. The provenance model is too coarse to keep the diagram's four tags
"illustrative / entered" loses:
- **news-reported**: the Iloilo City NHS timetable, with `timetable.source` "late shift reported by GMA Regional TV"
- **real**: school names and locations, water, the typed PAGASA figure
- the per-building feature source (`cached` / `claude` / `keywords`) and Claude's `evidence`, which `index.html` already shows

**Fix:**
- Use one enum `provenance ∈ {real, news-reported, illustrative, entered}` plus `{ by, at }` for entered values.
- Keep the engine's `buildings[].source` and `evidence` separately, as "how features were read".
- Map every diagram input to a field and a screen in a table in the plan, including where it is shown:
  - `DIVISION_FACTS` (display only, real): Division right rail or footer
  - `EO130` status and "who decides" (DM 064 / DO 22): Rules page
  - `CITY` options "40/41/42, reports differ": next to the threshold select
- An input that reverts to its default must go back to "illustrative".

### 8. Some diagram outputs have no screen, or lose it under the cut order
- **School head:**
  - "Rooms to check first at 8:00" (`plan.checkFirst`) is not listed on Today. On Morning check it exists only as a 3D pulse. Add a text list on both screens.
  - "Rule conflicts (must be 0)" is shown in the admin footer only. Add the school's `check()` count (both `check(s,p)` and `check(s,p,{asRequest:true})`) to Today.
- **Division:** "how many schools sent 8:00 readings" (`planDivision().withReadings`) appears only on Data status, which is the first thing cut. Add it to the decision status bar, as `index.html` already does.
- **"Whichever is worse":** §10 says it is labelled but not where. Show it on Morning check, beside each reading's implied level.

### 9. Acceptance scenarios contradict the engine or hard-code computed numbers
- **Journey 1:** "switches the city threshold to 41 → banner appears" at 38 °C. This is false: `cityOverlay(38, 41)` returns `null` (the optional threshold is 40). Use a forecast of 41 or above for that step, or expect "no banner".
- **Journeys 1 and 8:** "22 schools" is right for today's seed, but the browser check must compare against `planDivision(...).tally.request`, not the literal 22. This follows the engine's own rule: "computed, never typed in".
- **Journey 6:** this needs the forecast to be a Hinay value (27–32) for the same `forDate` the head decided the day before. That only works once issue 1 exists. Write the steps out: forecast, decision, next morning's reading.
  - Journey 2 edits Pandac's Building A, and that edit persists. The outcome of journey 6 therefore depends on the order of the journeys. Either reset the store before each journey or chain them explicitly.
- **Missing journeys:**
  - a returned decision, which must fall back to the rule
  - a reading that steps up a decided school (issue 2)
  - the next day with the same forecast (issue 1)
  - a replay that leaves the live store intact (issue 4)

### 10. The tests are too thin to keep the data solid
"Persistence round trip, stale decisions, scene and panels read the same numbers" does not cover the invariants above. Node tests should cover at least:
1. Decision for date D is not used for date D+1, even when `hi` is the same. Readings for D do not affect D+1.
2. Readings recorded after a decision that raise `recommended` give `stale-readings`, `effective` = the worse level, and checker 0 against the new level.
3. With `officialOnly`, an `awaiting-sdo` or `returned` less protective decision does not change mode, KPIs or column heights.
4. Replay leaves the live store's JSON byte-identical. Replay of 3 Nov 2026 gives HINTO from PAGASA 43.
5. Each forbidden role action throws. `sdoSignOff` on a stale decision throws.
6. `selectors` property test: for `hi` ∈ {25, 30, 38, 41.2, 43, 50}, the scene model's per-school level, mode, heights and status equal the panel model's and the CSV row's. Total conflicts = 0 including `asRequest`.
7. Persistence: a wrong `schemaVersion`, or a changed school roster or seed, discards or migrates cleanly and never mixes old school ids with new data.
8. Provenance: editing a block sets `entered`, and reset restores `illustrative`. The Iloilo City NHS timetable starts as `news-reported`.

---

## Non-blocking suggestions

1. **Persistence:** save inputs only (forecast, cityAuto, per-day records, setup edits as overrides keyed by school `id` *and* `name`). Never save derived plans. Regenerate the baseline with `makeDivision()` on load. `id` comes from the index in `SCHOOLS_OSM`, so a change to the roster file silently shifts the ids. Store a roster hash with `schemaVersion`.
2. **Selectors:** call `planDivision` once per change and take per-school plans from `div.plans`, rather than calling `planSchool` again in panels. Memoise on a state version counter. The 3D modules import only the view model, never `engine.js`.
3. **City overlay:** the engine only returns a banner and does not change levels. At 41 or 42 with an automatic suspension, Presko still lists 22 "request" schools. Say in the UI that the request is "subject to the city EO (EO 047-A precedent)", so the screen does not seem to contradict the city order. Label the threshold options "reported as 40/41/42".
4. **One place for each input:** the forecast is entered only on the Division left rail. School mode shows it read-only with its timestamp and the 5 p.m. flag. Sign-off happens only in the Decisions queue. If the school drawer has Approve/Return buttons, say so and send them through the same store action. Rule settings (`FEATURES`, `BAND_RULE`, `HINAY_SLOTS`, the request threshold, `CALIBRATION`) are read-only on the Rules page, with the engine as their owner.
5. **Readings:** label the field "indoor **heat index** at 8:00 (°C)", not temperature. Optionally accept T and RH and compute it with `heatIndexC`; that is the only live use of `heatIndexC` the plan currently implies. Validate a range of 20–60, as `index.html` does.
6. **Decisions queue:** show both `decision.recommended` (the snapshot) and the current `recommended` when they differ. Add `forDate`, `forecast_source` and provenance counts to the CSV.
7. **Hinto KPI:** "No classes anywhere" should come from `tally.stop === schools.length`. An approved override could make it false.
8. **Engine list in §6:** the app also needs `level`, `levelInfo`, `keywordFeatures`, `band`, `buildingPoints`, `FEATURES`, `BAND_RULE`, `HINAY_SLOTS`, `MODES`, `CITY`, `EO130`, `CALIBRATION`, `ILOILO_HEAT`, `REPLAYS`, `DIVISION_FACTS`, `makeDivision`, `schoolSlots`, `slotsFor`, `hhmm` / `parseHHMM` and `DEFAULT_TIMETABLE`. List them, and change "engine.js (unchanged API)" to "engine.js (additive API: `officialOnly`, `stale-readings`, optional `forDate`)".
9. **Water:** "No water tomorrow" is a dated input (issue 1). Show "no water forces at least Hinga" when it is on.
10. **Claude re-read:** save `source` and `evidence` with the features, and show which one is active. After a failed call, fall back to keywords and label it.
