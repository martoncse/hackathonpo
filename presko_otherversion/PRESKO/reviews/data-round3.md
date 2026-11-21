VERDICT: CHANGES REQUIRED

# Data review, round 3: `PRESKO/WEBAPP-PLAN.md` (v3)

Checked against `PRESKO/data-flow.html`, `PRESKO/engine.js` and `PRESKO/engine.test.mjs`, and probed with the engine itself.

## The three round-2 blocking issues are resolved
- **Two dates.** The §3 date table, together with `date` on every action, settles it. The 08:15 re-confirm is allowed through `recordDecision` with `date ∈ {today, today+1}` and has its own card. Test 9 covers it.
- **Engine extensions.**
  - `withDay` composition keeps the current signatures, so `engine.test.mjs` runs unmodified (test 15).
  - Legacy `"stale"` is kept, `plan.basis` drives `check`, mutators are pure and return decisions, and the status counter has a sum test.
- **`stale-inputs`.**
  - The status order is first-match.
  - The "more protective than both `decision.level` and `decision.recommended`" condition avoids needless re-confirms.
  - The effective level per status is always at least `recommended`. I checked every row: worse(decided, rec) is never less protective than the rule.
  - Water and readings are separate causes, and the sign-off guard covers all stale states.

## Round-2 non-blocking notes: all folded in correctly
Re-confirm creates a new decision id, sign-off goes by id and latest, a roster mismatch also discards `days`, the replay card has its caveat, the 3D fields come from the view model (`flag`, `emptied`, `roofType`, `storeys`, `rooms`, `litSlots`, `planType`, `levelText`), and §7 has rows for `today` and `planDate`.

## Spot checks against the engine
- Slugs are unique across the 69 schools.
- Jibao-an ES is school 1 and is `request` at 38, so the seeded HINAY-over-HINGA override is plausible.
- Pandac goes `home` → `request` after the Building A edit, so "turns blue" is correct.
- At 44, every school is HINTO, so "No classes anywhere" holds once stale decisions fall back to the rule level.

Two blocking issues are left. Both are small spec fixes, and the first one breaks the demo's headline number.

---

## BLOCKING

### 1. On a new day, `withDay` passes `water: undefined`, which silently removes every school's grounds for F2F and makes the CSV crash
§3 says "A new day starts empty", so `days[d].water = {}` and `readings = {}`. A literal `withDay` gives `water: days[d].water[s.id]`, which is `undefined`, and `readings[s.id]`, which is `undefined`. The engine treats these inconsistently. Reproduced:
- `level(hi, { water: undefined })` defaults to water present, so the level stays HINGA. ✓
- But `planSchool` tests `if (school.water && green.length …)`. With `undefined` there is **no request**. Edited Pandac at 38 gives mode `request` with `water: true`, but `home` with `water: undefined`.
- The result: on every fresh day the Hinga KPI ("schools with grounds for F2F") is **0**, and the demo's "Pandac turns blue" shot fails.
- `decisionsCSV` reads `s.readings[b.id]` without `?.`, so it throws ("Cannot read properties of undefined") for any school with no readings record.
- The new CSV columns `sent_level`, `late` and the provenance counts need inputs that `withDay` doesn't provide (`sent[]` and setup provenance), and no rule for `late` is given.

**Fix:** write the `withDay` contract into §4.1 exactly, and add a test.

```
withDay(school, day, setupProv) = { ...school,
  water:    day.water?.[school.id] ?? true,      // missing = water available
  readings: day.readings?.[school.id] ?? {},
  decision: day.decisions?.[school.id] ?? null,
  sent:     day.sent?.[school.id] ?? [],
  provenance: setupProv?.[school.id] ?? defaultProvenance(school) }
```

- Define `late`: `decision.at` is after 17:00 Asia/Manila on the day before `forDate`. Compute every time in Asia/Manila (the deadline, the countdown and `late`); `at` is stored as UTC ISO.
- Add a Node test: on an empty day record at 38, edited Pandac is `request`, and `planDivision(...).tally.request` equals the value with explicit `water: true`. `decisionsCSV` on an empty day doesn't throw and has 70 lines.
- Optionally also harden the engine: use `school.water !== false` in `planSchool`, and `s.readings?.[b.id]` in `decisionsCSV`.

### 2. `hi` and `opts.publishedHi` are two forecast values in one call, so stale status and preview disagree
§4.1 adds `publishedHi` to the options bag. Row 2 of §3 compares `decision.hi` with the **published** `hi`. But `levels()` still sets `decided` only when `d.hi === hi`, the *argument*.

In the admin **Preview** (draft ≠ published) the two disagree. Take the demo's last shot, "Preview draft 44 → every school purple":
- With `publishedHi = 38`, the decisions recorded at 38 count as **not** stale (row 2 compares with 38), so their effective level is `decision.level`, which is HINGA.
- The `hi = 44` used for planning says HINTO.
- Depending on which comparison the implementer wires up, the preview shows decided-at-38 levels, or a mix. "No classes anywhere" may be false.
- The "This marks N decisions re-confirm" count has the same ambiguity.

**Fix:**
- Remove `publishedHi`. One rule: **the `hi` argument is the forecast being evaluated, and every status comparison uses it.**
- Live views pass the published value. The admin Preview passes the draft, inside a separate, unpersisted preview view model labelled "Preview, not published".
- The confirmation count N is the number of decisions whose status under the preview is `stale-forecast` and was not stale before.
- Store the draft as admin view state only: not in `days`, never visible in school mode, the Decisions queue or the CSV.
- Add a test: with published 38 plus 3 official HINGA decisions, the preview at 44 gives all `stale-forecast`, `tally.stop === schools.length`, N = 3 (plus the awaiting one, if counted), and the live view model is unchanged.

---

## Non-blocking notes

1. **The demo seed bypasses the permission model.** Decisions "after Publish" exist for a forecast that isn't published yet, and nobody in a head role recorded them.
   - Write them during Demo reset as a system action: `hi: 38`, `forDate: today+1`, `by: "Demo seed (fictional head)"`, `seeded: true`.
   - Mark them "demo seed" in the CSV and on the Data screen.
   - Before publish, school mode shows "Waiting for the SDO's forecast" and doesn't compute statuses.
   - State that `none` is the status whenever no forecast is published for the date.
2. **Journey 5 contradicts §6 and test 13.**
   - §6 says the correction appears *only* when the last sent level differs from the level in force. In 38 → 39 everything stays HINGA, so no correction should appear. The journey says the head "sees 'Correction ready after you re-confirm'".
   - Either use a forecast change that crosses a band (e.g. 32 → 33, HINAY → HINGA), or add an explicit rule that a changed PAGASA figure also triggers a correction, since the message quotes the figure. Pick one and make the journey and test 13 match.
3. **`stale-inputs` cause needs a snapshot.** The Decision schema stores only `recommended`, not the water or reading state it was based on. Add `inputs: { water, readingsKey }` to the decision, so the cause (`readings` / `water` / both) is computed, not guessed. Alternatively, say the cause comes from `levels().forecast` (water) vs `byBuilding` (readings) compared with the snapshot.
4. **Sign-off "latest" check.** `sdoSignOff(decision, …, { currentStatus })` can't know whether a decision is the latest from the decision alone. Pass `latestId` in opts, or keep that check in the store. Say which.
5. **Store shape.** §9 still lists a global `forDate`. Remove it, or define it as "the last published date", so nothing reads an implicit date (§3).
6. **The "Today" card trigger.** "Only when the status is `stale-inputs` or a morning update" leaves out one case: the readings raise the level and today has **no** decision (status `none`). Show the card there too, with "Record HINGA for today".
7. **Wording.** In §5, "official face-to-face sections tomorrow" should read "…for `planDate`". Define `emptied` as `byBuilding[b] > recommended`, the same rule as `roomsOf`, not the effective level.
8. **Republishing 38 → 39 → 38** silently brings decisions recorded at 38 back to valid. That is acceptable, but have the confirmation dialog say so. Alternatively, store `forecastPublishedAt` in the decision and compare that.
