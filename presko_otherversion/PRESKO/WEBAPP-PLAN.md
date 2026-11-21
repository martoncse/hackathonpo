# Presko web app prototype: plan

*Status: **final (v4)**. Approved by the customer-journey agent (`reviews/ux-round4.md`) and the data agent (`reviews/data-round4.md`) after four rounds. §13 maps every blocking issue to its fix; §15 lists the reviewers' remaining non-blocking build notes.*

## 1. Goal

Turn the single-page Presko desk (`PRESKO/index.html`) into a two-mode web app prototype:
- **Admin mode** for the Schools Division Office (SDO) of Iloilo City.
- **School mode** for each school.

The design is minimalist interactive 3D, and phone-first in school mode. The engine (`PRESKO/engine.js`) stays the single source of truth. The app collects dated inputs, calls the engine once per change through one view model, and shows outputs. Every variable in `PRESKO/data-flow.html` has exactly one place where it is entered (or a read-only home, for rules) and at least one place where its effect is shown as text (§7).

## 2. Users, modes and permissions

| Mode | Role | Main moment | Device |
|---|---|---|---|
| Admin | DRRM coordinator (SDO) | 16:00–17:00, day before | Laptop |
| Admin | SDO approver (SDS or delegate) | 16:30–17:00 | Laptop or phone |
| School | School head | 16:30, day before; re-confirm at 08:15 if readings change the level | **Phone**, patchy data |
| School | Teacher on duty | 08:00 | Phone |
| School | Property custodian (or head) | Week 1, then after repairs | Laptop or phone |

**Permissions are enforced inside store actions, not only by hiding buttons.** A refused action throws a clear error, and the UI shows it.

| Action (store function) | Allowed role | Extra rule |
|---|---|---|
| `publishForecast(forDate, hi, status)` | Coordinator | Confirms first if it would mark N decisions re-confirm |
| `setCityThreshold(v)` | Coordinator | 40 / 41 / 42, labelled "reported as" |
| `recordDecision(date, schoolId, …)` | That school's head | `date` ∈ {today, today+1}, with a forecast published for that date; refused during a replay |
| `sdoSignOff(date, decisionId, status, note)` | SDO approver | Refused on `none`, `stale-forecast` and `stale-inputs`, and on a decision that isn't the latest; a return needs a note |
| `setReading(date, schoolId, buildingId, v)` | Teacher or head of that school | `date` = today only; 20–55 °C or empty ("not read") |
| `setWater(date, schoolId, bool)` | Head | Asks before forcing HINGA |
| `editSetup(schoolId, …)` | Custodian or head of that school | Buildings, notes, storeys, sections, timetable |
| `markSent(date, schoolId, channel)` | Head | Only when the status is official; stores the level sent |
| Rule settings (`FEATURES`, `BAND_RULE`, `HINAY_SLOTS`, request threshold, `CALIBRATION`) | None (engine-owned) | Read-only on the Rules page |

There is no real login. A role picker (`#start`) asks for the role and the person's name, which pre-fills decisions. A one-click **"Switch: SDO ↔ Pandac head"** in the header changes the role. Everything is labelled "demo, no sign-in".

## 3. Time model: everything has a date

- **Two dates, always explicit.**
  - `today`: the operating day. Demo: fixed, editable in `#demo`.
  - `planDate`: the day a view is showing.
  - **No action or selector uses an implicit date.** Every store action takes `date`, and selectors read only `days[date]`.

  | View / action | Date used |
  |---|---|
  | Admin Division, Decisions, CSV | `planDate`, chosen with a **Today / Tomorrow** chip. Default is Tomorrow, except Today from 00:00 to 12:00. |
  | School Today | Two dated cards: **"Today, {today}"** (shown only when today's record needs action or has a morning update) and **"Plan for tomorrow, {today+1}"** |
  | School Morning check, `setReading` | `today` only |
  | `recordDecision`, `sdoSignOff`, `setWater` | the `date` of the card or row they are in: `today` or `today+1` |
  | `publishForecast` | `today+1` (or `today` for a same-day correction, with a confirmation) |

- **Per-day records.** `days[date] = { forecast, water: {schoolId: bool}, readings: {schoolId: {buildingId: °C}}, decisions: {schoolId: Decision}, sent: {schoolId: [{level, at, channel}]} }`. A new day starts empty. Day D's readings never apply to day D+1.
- **Forecast.** `{ hi, status: "provisional" | "final", source: "PAGASA", publishedAt, by }`.
  - The coordinator types a **draft**. Admin sees "Preview, not published" (the scene recomputes for admin only). Schools see nothing until **Publish to schools**.
  - Republishing a **different value** asks first: "This marks N recorded decisions re-confirm." Finalising at the **same value** (provisional 38 → final 38) asks nothing and keeps decisions valid.
  - Schools see "Waiting for the SDO's forecast for {date}" until a forecast is published.
- **Decision.** `{ id, forDate, hi, level, recommended (snapshot), inputsSnapshot: { water, readings }, override, lessProtective, by, reason, at, sdo, sdoAt, sdoNote, system? }`. A re-confirm always creates a **new** decision with a new `id`, which resets any SDO approval. One-tap re-confirm is offered only for the recommended level; any other level goes back through reason, then SDO if less protective.
- **Status: the first matching row wins.** The same words appear in both modes, the CSV and tests:

| Order | Status (shown as) | Condition | Effective level for the official plan |
|---|---|---|---|
| 1 | `none` ("No decision") | Nothing recorded for this date | rule level (`recommended`) |
| 2 | `stale-forecast` ("Re-confirm: forecast changed") | `decision.hi` ≠ published `hi` for that date | rule level |
| 3 | `stale-inputs` (fixed strings: "8:00 readings call for X" or "No water: X required") | Current `recommended` is more protective than **both** `decision.level` and `decision.recommended`. Cause is computed by comparing today's water and readings with the decision's `inputsSnapshot`. | `worse(decided, recommended)` |
| 4 | `returned` ("Returned by SDO") | `sdo = returned` | rule level |
| 5 | `awaiting-sdo` ("Awaiting SDO") | `lessProtective` and not approved | rule level (the proposed plan is shown separately, labelled) |
| 6 | `official` ("Official") | otherwise | `decision.level` |

  A head who already chose a level at least as protective as the new recommendation is **not** asked to re-confirm (row 3 doesn't match). With no published forecast for the date, the status is `none`, and decisions can't be recorded. Republishing a value that was used before (38 → 39 → 38) makes decisions recorded at 38 valid again. The confirmation dialog says so.
- **17:00 deadline.**
  - Both headers show a countdown to 17:00 and the forecast with its status and time.
  - **From 16:45**, a head whose override is awaiting the SDO sees "Send rule-level message now". Its confirmation reads "This replaces your HINAY request with HINGA (the rule level), official at once."
  - **After 17:00** the countdown on the tomorrow card reads "Past 17:00" in red. Actions still work and are flagged `late`. `late` = the decision's `at` is after 17:00 Asia/Manila on the day before `forDate`. Morning screens and the "Today" card show no countdown.
  - Without a decision, the rule level stands and the message stays a draft until the head records it.

## 4. Engine extensions (additive; existing 17 tests stay green unchanged)

1. **Inputs from a day record, signatures unchanged.**
   - The store builds each school's engine input with `withDay(school, dayRecord)`. Defaults apply to every field:
     - `water: day.water[id] ?? true`
     - `readings: day.readings[id] ?? {}`
     - `decision: day.decisions[id] ?? null`
     - `sent: day.sent[id] ?? []`
     - `provenance` from the setup overrides
   - Today's engine functions keep their signatures.
   - New behaviour comes through **one options bag** `opts = { forDate, officialOnly, proposed }` on `levels`, `planSchool`, `planDivision`, `check`, `decisionStatus` and `decisionsCSV`.
   - **The `hi` argument is always the forecast being evaluated**, and every status comparison (including `stale-forecast`) uses it. There is no second forecast value in a call.
   - **Engine hardening:**
     - `planSchool` checks water with `school.water !== false`, not a truthy test, so undefined means available, matching `level()`.
     - `decisionsCSV` and `levels` read `readings?.[id]`.
   - **Preview:** the admin "Preview, not published" view is a **separate, unsaved view model** computed with `hi = draft`. It is never shown to schools, the Decisions queue or the CSV. The "marks N decisions re-confirm" count = decisions that are `stale-forecast` under the preview.
2. **Status.**
   - `decisionStatus(school, hi, opts)`: with `opts.forDate` it returns the six statuses of §3 in order. Without it, the legacy result stays (`"stale"` etc.), so existing tests pass.
   - `planDivision` builds its status counter from the status list in use. A test checks that the counts sum to the number of schools.
3. **Official / proposed basis.**
   - `levels(..., { officialOnly: true })` sets `effective` from the §3 table.
   - `planSchool(..., { proposed: true })` plans the head's chosen level for display.
   - Every plan carries `plan.basis` (`"official"`, `"proposed"` or `"legacy"`), and `check(school, plan)` derives its level on **the same basis** as `plan.basis`.
   - **The selectors use `officialOnly` for everything except the labelled proposed plan.**
4. **Pure mutators.**
   - `recordDecision(school, hi, { level, by, reason, forDate, at })` and `sdoSignOff(decision, status, note, { currentStatus })` **return** a new decision object. The store writes it to `days[forDate].decisions[schoolId]`. The legacy behaviour of setting `school.decision` is kept only when no `forDate` is passed.
   - `sdoSignOff(decision, status, note, { currentStatus, latestId })` targets a decision by `id`. It throws when `currentStatus` is `none`, `stale-forecast` or `stale-inputs`, when `decision.id !== latestId`, or on a return with no note.
   - `recordDecision` stores `inputsSnapshot` (that day's water and readings for the school) so the cause of `stale-inputs` can be computed later.
5. **Morning change.** `morningChange(schoolWithDay, hi)` → `{ emptied: [buildingIds], levelChange: {from, to} | null, cause }`. `emptied` = buildings whose reading level is above `recommended`, the same rule the engine uses for exclusion.
6. **CSV.** `decisionsCSV(schoolsWithDay, hi, { forDate, forecast })` reads `sent` and `provenance` from the `withDay` input and computes `late` by the rule in §3. It adds these columns: `for_date`, `forecast_status`, `published_at`, `recommended_snapshot`, `recommended_now`, `status`, `cause`, `late`, `sent_level`, and one provenance count per label. The engine owns the CSV as a pure function. The store passes the day context.

New tests (§10) cover each extension. The existing `engine.test.mjs` runs unmodified.

## 5. Design direction: minimalist 3D

- **Principle:** 3D shows where and what kind. Decisions and numbers live in flat panels. Every fact in 3D is also printed as text or a list. **On phones the panels come first, and 3D is opt-in.**
- **Look:**
  - Flat-shaded low-poly geometry, quiet ground (light: off-white green; dark: deep green-grey), one soft directional light, no textures or bloom.
  - Type: Bricolage Grotesque, Inter and JetBrains Mono, with system fallbacks.
  - Level names always print their range ("HINGA 33–41°C").
- **One legend for both modes, the 3D and the 2D fallbacks.** Plan type uses colour **and** shape, so it never depends on colour alone:

| Plan type | Colour | 3D / 2D shape |
|---|---|---|
| Regular day | green | full column / filled circle |
| Shortened day | amber | column with a notch / circle with a gap |
| Shortened + some at home | orange | short notched column / half circle |
| Home-based | red | flat disc / ring |
| Home-based, grounds for F2F | blue | flat disc + ghost column / ring with a dot |
| No classes | purple | flat disc with an X / ring with an X |

  Chips put dark text on amber and orange, which meets WCAG AA.
- **Admin scene, "Division".**
  - Each school sits at its OSM position on a flat tile.
  - **Column height = official face-to-face sections tomorrow** (`assignments` with a real slot in the official plan), so home-based and no-class schools are discs.
  - **Ghost column = sections in the draft F2F request** (`request` assignments with a real slot).
  - No haze plane.
  - Camera: three fixed presets (Overview, North, South) plus a capped orbit. Hover/tap shows the name, level and plan; click opens the school drawer.
- **School scene, "My school".**
  - Buildings as boxes with **`storeys`** (a new Setup field, cosmetic: the rule still uses the note's "upper floor" feature). Rooms are cells, split evenly across storeys.
  - **Roof:** bright thin plate if `roof_no_ceiling`, matte slab if `ceiling_or_insulated`, plain flat roof otherwise.
  - Cells are tinted by flag. Buildings emptied by a reading are greyed and hatched.
  - A sun arc above shows the official plan's slots as lit segments, with 10:00–14:00 shaded on Hinay days.
- **Motion:** 400 ms tweens. `prefers-reduced-motion` turns them off, with no auto-rotation.
- **Loading and fallback:**
  - Panels render first.
  - three.js r160 (UMD, pinned, cdnjs) loads lazily after first paint, and only when 3D is on.
  - 3D is off by default when the viewport is under 700 px, `saveData` is set, `effectiveType` is 2g/3g, or `deviceMemory` is 2 or less.
  - A script or WebGL failure, or no first frame within 3 s, switches to the 2D view: the existing SVG map, or a floor-plan grid. Both use the same legend and taps.

## 6. Screens

Routing uses a plain hash with ASCII letters, digits and hyphens only: `#start`, `#admin`, `#admin-decisions`, `#admin-decisions-awaiting`, `#admin-replay`, `#admin-rules`, `#admin-data`, `#school-<slug>`, `#school-<slug>-morning`, `#school-<slug>-setup`, `#demo`. Deep links carry the school. `slug` is derived from the school name (e.g. `pandac-elementary-school`). A test checks slugs are unique and that `#school-pandac-elementary-school` resolves to Pandac.

### Admin mode (laptop-first, works on phone)
1. **Division (`#admin`)**
   - **Left rail:**
     - **Today / Tomorrow** chip (`planDate`).
     - Forecast draft field (validated 20–60) with an admin-only "Preview, not published" view, Provisional/Final, **Publish to schools**.
     - Published value with time.
     - 4H chip with range and "what it allows".
     - City threshold (EO 24, "reported as 40/41/42"), with a banner from `cityOverlay`.
     - EO 130 status line ("guidelines pending").
   - **Centre:** the 3D or 2D Division view, with the legend.
   - **Right rail**, top to bottom:
     1. Countdown to 17:00.
     2. Decision status bar (Official · Awaiting SDO · Returned · Re-confirm · No decision · overrides), plus **"8:00 readings: N schools"** and **"Rule conflicts: 0"**.
     3. Count per plan type.
     4. The level KPI:
        - Hayo/Hinay: learner-hours kept and hot rooms to check.
        - Hinga: schools and sections with grounds for F2F, "subject to the city EO" when the city banner is automatic.
        - Hinto: "No classes anywhere" only when `tally.stop === schools`.
     5. **Chase missing:** lists schools with No decision first (from 16:45), then Re-confirm, with copyable reminder text.
2. **Decisions (`#admin-decisions`, default filter Awaiting SDO)**
   - Columns: school, forDate, rule level now, decision snapshot, chosen level, **less protective** mark, reason, time, status.
   - Approve is one tap. Return opens a required note.
   - Stale rows show "needs re-confirm" and can't be signed off.
   - Below 700 px, rows become cards (school, chosen vs rule level, reason, Approve / Return).
   - **Download log (CSV)** with `forDate`, forecast value, status and time, readings, recommended (snapshot and now), decided, reason, by, SDO, provenance counts.
3. **Replay (`#admin-replay`)** (§8).
4. **Rules (`#admin-rules`)**
   - Read-only: the 4H table, feature points, flag rule, Hinay hours, request threshold, calibration, and the legal chain with status (EO 130 → DO 22 → DM 064 news-reported; city EO 24, "reports differ").
   - The **"whichever is worse"** assumption is stated here and on Morning check.
5. **Data (`#admin-data`)**
   - Per school: provenance of each input, and whether today's readings arrived.
   - Division totals (66 / 75,890 / 2,242, real, TeacherPH).
   - A notice that saved data stays in this browser.

### School mode (phone-first)
1. **Today (`#school-<slug>`).** Single column on phones, in this order:
   1. **Header:** school, countdown, and the forecast with its status and time.
   2. **"Today, {today}" card**, shown when **any** of these is true for today's record:
      - today's status isn't Official, but only if a forecast was published for today;
      - a correction is pending;
      - readings raise the level, even with no decision.

      What the card holds:
      - One-line banner using the fixed status strings, e.g. "8:00 readings call for HINGA", "No water: HINGA required" or "Returned by SDO".
      - One-tap **Re-confirm HINGA**.
      - After re-confirming, the morning parent update (official) with Copy and Mark-as-sent chips.
   3. **"Plan for tomorrow, {date}" card.** Every block below carries this date label.
      - **Level chip** (with range) and plan type.
      - **Decision card:**
        - One primary button **"Record HINGA (recommended)"**, with the name pre-filled from the role picker.
        - "Choose a different level" expands a select plus a required reason.
        - Status uses the vocabulary in §3: one sentence and one primary button per status.
        - A returned decision shows the SDO's note on top with **"Revise decision"**.
        - From 16:45, an awaiting override offers "Send rule-level message now".
      - **Message to parents** (English / Filipino / Hiligaynon):
        - **Draft:** dashed box, "DRAFT, not for sending" watermark, **Copy disabled**.
        - **Official:** solid box. The text names the head, decision time, PAGASA's figure and status, and ends "Verify only on the school's official page and SDO Iloilo City".
        - **Copy**, then one-tap **Mark as sent** chips (FB page / group chat / radio). Each chip stores the level sent.
      - **Correction:** appears only when the last level sent (`sent[]`) differs from the level now in force.
        - While the status isn't Official, it shows "Correction ready after you re-confirm", with the Re-confirm button.
        - Once Official, a "Correction: was X, now Y" message with Copy.
      - **Details:**
        - Reason line, flags, school conflict count (must be 0).
        - "Rooms to check first at 8:00" as a text list.
        - **No water tomorrow** toggle, with confirmation.
        - Section plan / draft F2F request (collapsed).
   4. **"Show 3D"** toggle, then the school scene. On laptops it sits beside the panels.

   The head's 16:30 path: open the link, tap **Record**, tap **Copy**, tap a **Mark as sent** chip.
2. **Morning check (`#school-<slug>-morning`)**
   - **Readings:** one field per building, "indoor heat index at 8:00 (°C)", 20–55 or empty. Each shows the level it implies.
   - **Rooms to check first:** a text list, plus a single pulse in 3D.
   - Emptied buildings are shown live. The "whichever is worse (assumption)" label sits beside the result.
   - **Outcomes:**
     - No change: "Plan unchanged".
     - Buildings emptied but level unchanged: a **room-move notice for staff** (internal, not a parent message).
     - Level raised: today's status becomes `stale-inputs` (cause: readings). The **head** re-confirms from the "Today" card on their usual link, and the **morning parent update** becomes official.
   - The teacher records readings only. After saving, they see "Tell your school head to open Presko", with copyable text for the staff chat. There are no push notifications in the prototype.
3. **Setup (`#school-<slug>-setup`)**
   - Buildings: name, rooms, storeys, note.
   - The note has **Re-read with Claude**, falling back to keywords if Claude fails or after 8 s. Features show `source` (claude / keywords / cached) and evidence.
   - Sections: grade, learners. Timetable: single/double, times, end after start.
   - Each block carries its provenance (§7).

## 7. Inputs: where each one lives

Provenance labels, the same everywhere: **real**, **news-reported**, **illustrative**, **entered (by whom, when)**.

| Diagram input | Field | Entered / configured where | Owner | Provenance at start |
|---|---|---|---|---|
| Operating day | `today` | `#demo` (fixed in the prototype; the system clock in a pilot) | Demo / system | entered |
| Day shown | `planDate` (view state, not saved) | Today/Tomorrow chip; School Today's two dated cards | Each viewer | n/a |
| Forecast heat index | `days[d].forecast.hi`, `.status`, `.publishedAt` | Admin › Division left rail | Coordinator | entered (real PAGASA figure) |
| PAGASA 5 p.m. advisory received | `forecast.status = "final"` | Same | Coordinator | entered |
| 4H levels | `FOURH` | Rules (read-only) | Engine | news-reported |
| Who decides | text | Rules, decision card | Engine | news-reported |
| City threshold | `cityAuto` | Division left rail | Coordinator | news-reported ("reports differ") |
| EO 130 status | `EO130` | Rules, left rail line | Engine | news-reported |
| School names / locations | `SCHOOLS_OSM` | none (data file) | — | real |
| Division totals | `DIVISION_FACTS` | Data (display) | — | real |
| Replay heat, PAGASA figures | `ILOILO_HEAT`, `REPLAYS` | Replay (read-only) | Engine | real (Open-Meteo) / news-reported (PAGASA) |
| Buildings, rooms, storeys | `buildings[]` | School › Setup | Custodian / head | illustrative |
| Building note → features | `note`, `features`, `source`, `evidence` | School › Setup | Custodian / head | illustrative |
| Sections, learners | `sections[]` | School › Setup | Custodian / head | illustrative |
| Timetable | `timetable` | School › Setup | Custodian / head | illustrative; Iloilo City NHS news-reported |
| Water tomorrow | `days[d].water[s]` | School › Today | Head | entered |
| Decision | `days[d].decisions[s]` | School › Today | Head | entered |
| SDO sign-off | `decision.sdo*` | Admin › Decisions | SDO approver | entered |
| 8:00 readings | `days[today].readings[s][b]` | School › Morning check | Teacher / head | entered |
| Rule settings | `FEATURES`, `BAND_RULE`, `HINAY_SLOTS`, threshold, `CALIBRATION` | Rules (read-only) | Engine | fixed by us |

Building notes are edited only in School › Setup. The admin drawer shows them read-only, with a deep link. The PITCH.md shot list is updated to match (§11).

## 8. Replay: isolated

- Replay runs on a **fresh in-memory copy**, built from `makeDivision()` with no readings or decisions. It is never saved and never touches `days`.
- **Driven by PAGASA's reported figure** (news-reported): 1 Apr 2024 → 41, 3 Nov 2026 → 43. Computed and calibrated values (37.5 → 41.2; 36.7 → 40.4) are shown for comparison only. **Calibration is never applied to a typed forecast.**
- A full-width banner reads "REPLAY · {date} · not tomorrow's plan", with **Exit replay**. Decision, sign-off, reading, message and setup actions are disabled.
- Counts (schools with grounds for F2F, sections) are computed live, never hard-coded.
- The card says: "Today's rules (DM 064 s. 2026) and today's illustrative buildings applied to that day's heat. In April 2024 the city's EO 047 applied; DM 064 and EO 24 didn't exist yet."

## 9. State, view model, persistence

- **Store** (`app/store.js`):
  - `{ schemaVersion, rosterHash, today, days, cityAuto, setupOverrides: {schoolId: {name, buildings?, sections?, timetable?, provenance}}, role, replay }`.
  - Actions enforce §2.
- **View model** (`app/selectors.js`):
  - One `planDivision(..., { officialOnly: true })` per state version, memoised.
  - Per school it yields the plan (basis official), proposed plan (labelled), checker problems, status and cause, `morningChange`, and the 3D/2D fields: `planType`, `levelText` ("HINGA 33–41°C"), `f2fSections`, `requestSections`, and `buildings[]` with `flag`, `emptied`, `roofType`, `storeys`, `rooms`, plus `litSlots` (start/end hours of the official plan's slots).
  - The 3D modules and panels **only** read the view model; neither imports `engine.js`.
- **Persistence:** `localStorage` under `presko:v{schemaVersion}`, saving inputs only (never derived plans).
  - On load, the baseline is rebuilt with `makeDivision()`, and overrides apply by school id **and** name. A `rosterHash` mismatch discards the overrides **and** `days`, with a notice.
  - Every read and write is wrapped in try/catch. If storage fails, a banner says "Changes won't be saved in this browser".
  - **Demo settings** (`#demo`): set `today`, the camera preset, and **Demo reset**, which clears storage and loads the scripted state:
    - A draft of 38 °C for tomorrow, not yet published, with no decisions.
    - Pressing Publish at 38 (no re-confirm prompt, since no decisions exist yet) runs a **labelled system action, "demo seed"**, that records these at `hi = 38`, marked `system: true` in the CSV:
      - Jibao-an ES has an override, HINAY over HINGA, reason "New ceiling fans and cross-ventilation in all rooms", Awaiting SDO.
      - 3 other schools are Official at HINGA.
      - Pandac has no decision.

## 10. Tests and acceptance

**Node tests** (`app/app.test.mjs` plus engine tests; all must pass):
1. **Day isolation:** day-1 readings and decision don't apply on day 2, even with the same `hi`.
2. **Readings after a decision:** all buildings read 36 after an official HINAY → `stale-inputs` (cause readings), effective HINGA, and `check` flags F2F if the old plan is used.
3. **Official-only:** awaiting or returned HAYO at 38 → the official plan is HINGA home-based. The proposed plan is labelled. `check` is clean on the official plan.
4. **Replay isolation:** running a replay leaves the `days` and storage snapshot unchanged.
5. **Roles:** each forbidden action throws (school signs off, admin records a decision, teacher sets setup, sign-off on stale).
6. **View model agreement:** for hi in {25, 30, 38, 41.2, 43, 50}, the 3D fields equal the panel counts, and division conflicts are 0.
7. **Persistence:** round trip, schema bump, roster-hash mismatch, storage throwing.
8. **Provenance:** an edit flips illustrative → entered with who and when; CSV columns are present.
9. **Two dates:** at 08:15 on day D, with D+1's forecast already published, the head can re-confirm D, and D+1's records are unaffected.
10. **Status order and effective level:** each status is reached, including overlaps (returned + raised readings → `stale-inputs`; stale-forecast + readings → `stale-forecast`). Water off after a decision → `stale-inputs` with cause `water`. A head already at a more protective level is not stale.
11. **Status counts:** `planDivision`'s status counts sum to the number of schools for every status set.
12. **Sign-off guard:** it throws on `none`, `stale-forecast`, `stale-inputs` and on a non-latest decision. A re-confirm resets approval.
13. **Correction:** shown only when the last sent level differs from the level in force, and copyable only when Official.
14. **Demo seed:** after Demo reset and Publish, the status counts are 3 official, 1 awaiting, the rest none. Pandac resolves from its slug.
15. **Legacy:** the existing `engine.test.mjs` passes unmodified.
16. **Empty day:** with `withDay` on an empty day record, the F2F-request count equals the count with explicit `water: true`. `decisionsCSV` doesn't throw on missing readings or `sent`.
17. **Preview:** published 38 with 3 official decisions; preview at 44 → those 3 are `stale-forecast` in the preview, every school is "no classes", N = 3, and the live view model, Decisions queue and CSV are unchanged.
18. **Late:** a decision at 17:01 the day before is `late = true`; at 16:59 it is false.
19. **Republish back:** 38 → 39 → 38 makes decisions recorded at 38 Official again.

**Browser journeys** (CDP script, at 1280 px and at **375 px with throttled 3G**). Each runs without console errors, keeps 0 rule conflicts, and asserts counts from the engine, not literals:
1. **Coordinator:** draft 40.5 → nothing changes for schools → Publish (final) → the optional city banner shows → threshold 40 → automatic banner → the Hinga KPI says "subject to the city EO".
2. **Head (phone):** opens `#school-pandac-elementary-school` → Record HINGA (recommended), name pre-filled → Copy enabled → Mark as sent chip.
3. **Head override:** choose HINAY + reason → Awaiting SDO. The official plan stays HINGA and Copy is disabled.
4. **Approver:** `#admin-decisions-awaiting` → Approve → official everywhere. A second school is returned with a note → the head sees the note and "Revise decision".
5. **Forecast republish:** provisional 38 → final 38 changes nothing. 38 → 39 asks for confirmation, and statuses become "Re-confirm: forecast changed" in both modes. 38 → 39 keeps HINGA, so after the one-tap re-confirm **no correction** appears; the original message still holds. Second part: a head who sent at 38 when the coordinator republishes 42 sees "Correction ready after you re-confirm". After re-confirming HINTO, "Correction: was HINGA, now HINTO" becomes copyable.
6. **Morning:** the next day, the coordinator has already published tomorrow's forecast.
   - A teacher enters 36 in one building → room-move notice.
   - Readings in all buildings → today's status becomes `stale-inputs` → the teacher sees "Tell your school head".
   - The head opens `#school-pandac-elementary-school`, re-confirms from the "Today" card, and the morning update becomes official.
   - Tomorrow's card is unchanged.
7. **Setup (2b):** custodian edits Pandac's Building A note → Claude (or keyword) re-read → the flag turns cooler → Today shows grounds for F2F, with the count from the engine.
8. **Replay:** 1 Apr 2024 → banner, PAGASA 41 → HINGA, actions locked → Exit → live state identical.

**Other checks:**
- **Accessibility:** every 3D action has a list or keyboard equivalent, focus is visible, colour is never the only signal (shape legend), and contrast meets AA in both themes. Tap targets are at least 44 px and inputs at least 16 px.
- **Performance:** panels are interactive before three.js loads. 3D is under about 2 MB and falls back to 2D after 3 s.

## 11. Demo (about 1:50, reproducible)

Start from `#demo` → Demo reset. Camera presets are fixed. Times are targets, checked with a stopwatch before recording.

| Time | Screen | Action |
|---|---|---|
| 0:00–0:15 | `#admin`, Overview | Coordinator taps **Publish** (38 °C final). The map turns red and blue. KPI: schools with grounds for F2F (engine count). |
| 0:15–0:40 | Switch → Pandac head, phone width | **Record HINGA** → **Copy** (Hiligaynon tab) → **Mark as sent**. |
| 0:40–0:55 | Switch → SDO, `#admin-decisions-awaiting` | Seeded Jibao-an override: chosen vs rule, reason → **Approve**. Status bar updates. |
| 0:55–1:25 | `#school-pandac-elementary-school-setup` | Edit Building A's note → re-read (the demo uses a cached Claude result or the keyword fallback, so there's no 8 s wait; a live call is optional) → the flag turns cooler → Pandac turns blue (grounds for F2F) in 3D. |
| 1:25–1:40 | `#admin-replay` | 1 Apr 2024: PAGASA 41 → HINGA, banner, actions locked. |
| 1:40–1:50 | `#admin`, Preview draft 44 | Every school purple (HINTO, "No classes anywhere"). Not published. |

PITCH.md's shot list is rewritten to match this table.

## 12. Build order and cut line

1. Engine extensions (§4) and tests 1–3, 5. (45 min)
2. Store, selectors, persistence, router, role switch, demo reset; tests 4, 6–8. (50 min)
3. School Today, phone-first, with 2D floor grid and message states. (50 min)
4. Admin Division with publish flow and 2D map; Decisions queue and CSV. (55 min)
5. Morning check. (25 min)
6. 3D scenes (Division, then School), lazy-loaded. (60 min)
7. Setup, Replay, Rules, Data. (45 min)

**Cut order:** Data screen → Rules (link to the old page) → School 3D (keep the 2D grid) → Division 3D (keep the 2D map). The data model, permissions and message states are never cut.

## 13. Review issues and where they are fixed

| # | Issue | Fixed in |
|---|---|---|
| UX1 | Phone layout, lazy 3D, fallbacks | §5 Loading, §6 School Today order, §10 375 px journey |
| UX2 | Head path too long, note ownership | §6 three-action path, §7 notes in Setup only, journey 7 |
| UX3 | Live forecast, no waiting state | §3 Publish flow, waiting state, confirmation |
| UX4 | Draft vs official message | §6 Draft watermark, Copy disabled, verify line, Mark as sent, correction |
| UX5 | 17:00 deadline, no-approval fallback, approver queue | §3 deadline, rule-level fallback; §6 Decisions default filter, required return note |
| UX6 | Morning outcome, teacher vs head | §4.2, §4.5; §6 Morning outcomes |
| UX7 | Replay overwrites live | §8 |
| UX8 | Reproducible demo | §6 deep links, §9 demo reset, §11 |
| D1 | No date in the model | §3 per-day records, §4.1, test 1 |
| D2 | Decision stays valid after readings | §3 `stale-inputs` (renamed in v3), test 2 |
| D3 | Unapproved decisions drive the plan | §4.3 `officialOnly`, selectors, test 3 |
| D4 | Replay pollution, which heat value | §8 |
| D5 | Permissions | §2 table, enforced in the store; §4.4; test 5 |
| D6 | Undefined variables | §3 forecast status; §5 storeys, roof, column/ghost formulas; §4.5 morning update |
| D7 | Provenance too coarse | §7 labels and input table |
| D8 | Outputs without a screen | §6 rooms-to-check list, school conflicts, readings count in the status bar, "whichever is worse" location |
| D9 | Journeys contradict the engine | §10 journeys rewritten (city banner at 40.5; counts from the engine; new journeys) |
| D10 | Tests too thin | §10 eight Node tests |
| UX-R2 B1 | Demo seed can't play the shot list | §9 seeded state, §11 timed table, test 14 |
| UX-R2 B2 | Correction could be unofficial | §6 correction rules, journey 5, test 13 |
| UX-R2 B3 | 08:15 re-confirm can't be found; mixed dates | §3 date table, §6 "Today" card and dated cards, teacher hand-off text, journey 6 |
| D-R2 1 | Two live dates at 08:00 | §3 date table; all actions take `date`; test 9 |
| D-R2 2 | Engine extensions inconsistent | §4 `withDay`, one options bag, `plan.basis`, pure mutators, legacy `stale`, status counter, CSV owner; tests 11, 15 |
| D-R3 1 | Empty day: `water` undefined removes F2F requests; CSV inputs | §4.1 `withDay` defaults, engine hardening, §3 `late` rule, §4.6; test 16 |
| D-R3 2 | Two forecast values in one call | §4.1 `hi` is the only forecast, separate preview view model; test 17 |
| D-R2 3 | stale-readings misreports water; status order | §3 `stale-inputs` with cause, ordered table, effective levels; §4.4 guard; tests 10, 12 |

## 14. Out of scope / open points

- Real authentication, shared database, audit trail.
- Whether DM 064 binds on the reading or the forecast. We keep "whichever is worse", labelled as an assumption.
- Native-speaker check of the Hiligaynon templates.
- Real building, section and timetable data (illustrative until onboarding).

## 15. Build notes from the final reviews (non-blocking)

Apply these while building. They don't change the approved design.

1. **"Today" card button follows the status:**
   - "Record HINGA" when there is no decision.
   - "Revise decision", with the SDO's note, when returned.
   - "Re-confirm" only for `stale-forecast` or `stale-inputs`.
2. **38→39→38 dialog:** say how many decisions are restored and how many (those re-confirmed at 39) will need re-confirming again.
3. **Demo seed:**
   - Tag seeded rows "demo seed" in the Decisions queue as well as in the CSV.
   - Make the seed a one-shot flag: it runs only on the first Publish at 38.
   - Note the "system: demo seed" exception in the §2 permission table.
   - Add a `system` column to the CSV.
4. **`late` flag:** exempt same-day morning re-confirms by adding `kind: "evening" | "morning"` to decisions, and add a case to test 18.
5. **Hardening:**
   - `explain()` must also treat a missing water value as available. Change it together with `planSchool`.
   - Use `?.` inside `withDay`.
6. **Admin draft forecast:** saved, so a reload mid-demo shows the same preview. It is never visible to schools.
7. **Wording:** in §5 read "planDate" for "tomorrow". In §3 row 2, compare with the forecast passed into the call.
