VERDICT: CHANGES REQUIRED

# Data review, round 2: `PRESKO/WEBAPP-PLAN.md` (v2)

Checked against `PRESKO/data-flow.html`, `PRESKO/engine.js` and `PRESKO/engine.test.mjs`. v2 is a large improvement. These round-1 issues are **resolved**:

| Issue | Resolved by |
|---|---|
| D3 (official-only) | Status table and `officialOnly` |
| D4 (replay) | Fresh copy, PAGASA-driven, never saved |
| D5 (permissions) | Enforced in the store |
| D6 (undefined variables) | 5 p.m. flag as `forecast.status`, storeys cosmetic, roof default, column and ghost formulas |
| D7 (provenance) | Four labels and the §7 input table |
| D8 (outputs without a screen) | All four outputs now have a screen |
| D9 (journeys) | Rewritten journeys |

I re-checked the new journeys against the engine:
- Journey 1: `cityOverlay(40.5, 42)` is optional and `cityOverlay(40.5, 40)` is automatic. ✓
- `#school-0` is Pandac Elementary School. ✓
- PAGASA 43 gives HINTO in the 3 Nov replay. ✓

Three issues remain blocking. All three are about specification, and none needs a redesign. D1, D2 and D10 are only partly resolved, because they depend on these fixes.

---

## BLOCKING

### 1. Two dates are live at 08:00, and the plan doesn't say which day each screen and action uses (D1 is only partly resolved)
The store has one global `forDate` ("normally tomorrow"). Readings go to `days[today]`. Take the morning of day D:
- The coordinator may already be drafting D+1, so `forDate = D+1`.
- Morning check writes `days[D].readings`, which is correct.
- The head's **08:15 re-confirm** after `stale-readings` is a decision for **D**. But §2 allows `recordDecision` "only for the published forecast of `forDate`", which is D+1, so the re-confirm the plan requires would be refused.
- It is also undefined which day the Today screen, the Division columns ("official F2F sections **tomorrow**"), the status bar, Chase missing and the CSV show at 08:00.

**Fix:** replace the single global `forDate` with an explicit date for each view and action.
- `#school-<id>-morning`, the morning banner and the `stale-readings` re-confirm always use `today`.
- `#school-<id>` (Today) and `#admin` use `planDate`. It defaults to `forDate` once a forecast for `forDate` is published, and to `today` before that. Show a date chip, plus a toggle "Today (D) / Tomorrow (D+1)".
- `recordDecision(schoolId, date, …)` accepts `date = forDate`. It also accepts `date = today`, but only when `today`'s status is `stale-readings` or the head is re-confirming the morning level.
- `sdoSignOff(schoolId, date, …)` and `setWater(schoolId, date, …)` take the date explicitly.
- Every selector takes `date` and reads only `days[date]`. The CSV exports one `date`, chosen in the Decisions screen.
- **Test:** on D at 08:00 with `days[D+1].forecast` published, an all-36 reading for D gives `stale-readings` on D. Re-confirming for D succeeds, and D+1's plan and statuses are untouched.

### 2. The §4 engine extensions are inconsistent and would break the existing tests and the tally
- **Two API styles.** §4.6 says `levels`, `planSchool`, `planDivision` and `check` take a `day` argument, plus "a wrapper" for the old signatures. §4.1 instead gives `decisionStatus(school, hi, forDate)`. The signatures are never written out.
  - `recordDecision` and `sdoSignOff` currently **mutate `school.decision`**. With per-day records, nothing says where they write.
  - `planDivision` reads `schools[i].decision.override` directly.
- **Renaming `stale` breaks things.**
  - `engine.test.mjs` line 144 asserts `decisionStatus(s, 39) === "stale"`. The plan's "existing tests must stay green" is false unless this is handled.
  - `planDivision` counts statuses with `decisions[p.decision]++` on a fixed key set `{none, stale, returned, awaiting-sdo, official}`. `stale-forecast` and `stale-readings` would turn into `NaN` and disappear from the status bar.
- **`check` and the plan it receives can disagree.** `check` recomputes the level from the school. It must be called with the same `officialOnly` / `proposed` basis as the plan, otherwise test 3 (a clean check on the official plan) cannot pass. This is never stated.
- **CSV without an owner.** The columns listed in §6 (`forDate`, forecast status and time, recommended snapshot and now, provenance counts) are not produced by the current `decisionsCSV`, and §4 doesn't extend it.

**Fix** (write it into §4):
- Keep the engine signatures as they are and **compose** inputs instead of changing them: a pure `withDay(school, dayRecord, schoolId) → { ...school, water, readings, decision }` in `selectors.js` (or in the engine). Then no wrapper is needed, and `day` never reaches the engine.
- Add one options bag to `levels`, `planSchool`, `check`, `planDivision` and `decisionStatus`: `opts = { forDate?, officialOnly?, proposed? }`.
  - `planSchool` returns `plan.basis = "official" | "proposed" | "legacy"`.
  - `check(school, plan)` recomputes the level from the inputs, using `plan.basis`. The level itself is never trusted.
- `recordDecision(school, hi, {…, forDate})` and `sdoSignOff(…)` keep mutating the composed copy and **return** the decision object. The store writes that object into `days[date].decisions[id]`.
- Status names: with no `forDate` option, the engine returns legacy `"stale"`, which keeps test line 144 green. With `forDate` it returns `stale-forecast` / `stale-readings`. Or rename it and update line 144 in the same commit; say which you choose.
- `planDivision().decisions` keys become `{ none, "stale-forecast", "stale-readings", stale, returned, "awaiting-sdo", official, overrides }`. Add a test that the counts sum to `schools.length`.
- Extend `decisionsCSV(schools, hi, { forDate, forecast, provenance })`, or state that `selectors.js` builds the CSV from view-model rows.

### 3. `stale-readings` misattributes water changes, and the status precedence is undefined (D2 is only partly resolved)
- **Water triggers it too.** The §4.2 trigger is "current `recommended` is more protective than `decision.recommended`". Switching off **water** after a decision also raises `recommended` to HINGA. That would show "Re-confirm: 8:00 readings call for HINGA", which is wrong in both cause and wording.
- **No precedence.** Several conditions can hold at once, and the plan doesn't say which status wins:
  - `returned` + readings raised
  - `awaiting-sdo` + readings raised
  - `stale-forecast` + readings
- **The sign-off guard is unclear.** "Throws on a stale decision" doesn't say whether that includes `stale-readings`. It must: otherwise the SDO could approve a less protective decision after the readings moved the rule.
- **Needless re-confirms.** If the head already chose a level at least as protective as the new recommendation (e.g. chose HINGA, readings now call for HINGA), the effective level doesn't change. The trigger as written still demands a re-confirm and a "correction" message.

**Fix:**
- Rename the status to `stale-inputs`, with `cause ∈ {readings, water}`. Wording:
  - "Re-confirm: 8:00 readings call for X"
  - "Re-confirm: no water forces Hinga"
- Trigger it only when `rank(recommendedNow) > rank(decision.level)` *and* `rank(recommendedNow) > rank(decision.recommended)`. In other words, the official effective level would actually change.
- Fixed precedence, as one function: `none` → `stale-forecast` → `stale-inputs` → `returned` → `awaiting-sdo` → `official`.
- Effective level under `officialOnly`:
  - `stale-inputs`: `worse(decision.level, recommendedNow)`
  - `stale-forecast`, `returned`, `awaiting-sdo`: `recommendedNow`
  - `official`: `decision.level`
- `sdoSignOff` throws on `none`, `stale-forecast` and `stale-inputs`.
- **Tests:**
  - Water off after an official HINAY gives `stale-inputs` with cause water.
  - Readings raised on an `awaiting-sdo` decision give `stale-inputs`, and the effective level is the new recommendation.
  - A head who chose HINGA, with readings now calling for HINGA, stays `official` and no correction appears.
  - Sign-off on `stale-inputs` throws.

---

## Non-blocking notes

1. **Approvals and one-tap re-confirm.** State that any re-confirm goes through `recordDecision`, so `sdo` resets to `pending`. An earlier approval never carries across a forecast change. One-tap re-confirm should only be offered for the recommended level. An earlier override needs its reason confirmed again and goes back to Awaiting SDO.
2. **Sign-off targets a decision, not a school.** Pass the decision's `at` (or an id) to `sdoSignOff`, and refuse if it no longer matches. Otherwise an approval landing just after the 17:00 rule-level fallback would attach to the new decision.
3. **Decision snapshot of the forecast.** Store `forecastStatus` and `forecastPublishedAt` in the decision. The CSV can then say which forecast each decision was based on (provisional or final), not just the current one.
4. **Persistence.**
   - A `rosterHash` mismatch should discard `days` as well as `setupOverrides`, because both are keyed by school id.
   - Define the hash input: the `SCHOOLS_OSM` names and order, plus `PRIVATE_EXCLUDED`.
   - On a schema bump, discard with a notice (say so).
   - Never save `replay`.
5. **Replay baseline.** The replay uses a pristine `makeDivision()`, so live setup edits are ignored. After the Pandac edit in demo step 4, live and replay counts will differ (e.g. 23 vs 22). Say so in the replay card ("building data: illustrative baseline").
   - Label rules that were not in force on the replay date: on 1 Apr 2024, neither EO 24 s. 2025 nor DM 064 s. 2026 existed. The card should read "computed with today's rules". Do not show the live `cityAuto` banner as if it applied in 2024.
6. **View-model completeness.** §9 lists `f2fSections`, `requestSections`, `emptiedBuildings`, `roofType` and `storeys`. Because the 3D modules must not import `engine.js`, also include:
   - the building band per building (to tint cells)
   - the official plan's lit slots (for the sun arc)
   - plan type and shape key
   - the level range and "allows" text

   Define `emptiedBuildings` as `byBuilding[b] > recommended`, the same rule as `roomsOf`. It must not depend on the effective level.
7. **Missing rows in the §7 input table.**
   - `today` (Demo settings, demo operator) and `forDate` / `planDate` (Division left rail, coordinator) are inputs and need rows.
   - "fixed by us" is a fifth provenance label. Either add it to the label list, or call it "rule setting (ours)" there.
8. **Water provenance.** The diagram tags water as "Real input". "entered (by head, when)" is consistent with that; keep the "forces at least Hinga" note beside the toggle.
9. **Test 6.** Also assert that the plan-type counts, the decision status counts and the number of CSV rows all come from the same memoised `planDivision` result, so 3D, panels and CSV can't disagree.
