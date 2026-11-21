# Presko app: design round 1, usability proposal

*Author: usability specialist. Round 1 (independent proposal), to be reconciled with the visual designer's proposal.*
*Inputs: screenshots `1-admin` … `6-preview` at 1280 and 375 px; `app/index.html`, `app/ui.js`, `app/scenes.js`; `WEBAPP-PLAN.md` §2–§6.*
*Constraint: about 1.5 hours of CSS/JS. Nothing below removes a function the plan requires; where I move something, I say where it goes.*

---

## 0. Diagnosis: why it feels bland and hard to use

"Bland" here is mostly a **hierarchy** problem, not a colour problem. Every block has the same weight: the same dark card, the same 1 px border, the same 15 px text, the same muted grey for anything secondary. Colour appears only in small chips. So the eye has nowhere to land, and the screens look like forms rather than a decision tool.

Concrete findings, worst first:

| # | Finding | Where | Evidence |
|---|---|---|---|
| F1 | **The eye lands on the wrong thing.** Admin: the 3D thicket of grey "ghost" pillars (the least important data: draft requests) is the largest, highest-contrast object. School Today: the bordered parent message is the loudest block, while the level and "what do I do now" are a small chip and a green word. | 1-admin, 2-head | Ghost columns render as solid dark-blue cylinders; message box has a 2 px accent border. |
| F2 | **The header eats a third of the phone screen** (about 265 px of 812): name + role + "demo" tag, forecast line, countdown, Switch button, role select, then tabs that wrap onto two rows ("Data", "Demo" alone on line 2). It is sticky, so it stays that big while scrolling. | all -375 | `renderHeader` puts 5 controls + 6 tabs in one wrapping flex. |
| F3 | **Redundant text.** "Official" then "Official: HINGA, by Ma. Santos at 01:54 PM." The countdown appears 3 times on admin (header, right rail top, and the rail again via "Decisions · Sun, Nov 22" context) and twice on the school card. "Rule conflicts: 0" twice on admin. Plan-type counts appear both as the "Plans" tiles and as the legend under the map. | 1-admin, 2-head | `decisionButtons` prints `statusHTML` + an "Official: …" line; rail repeats `countdown()`. |
| F4 | **Expandable sections don't look expandable.** `details summary { display:flex }` removes the disclosure triangle, so "Section plan (22 sections)", "Building notes (read-only…)" and "Chase missing (65)" look like plain bold headings. "Chase missing" is the coordinator's main 16:45 action and it is hidden. | 1-admin, 2-head | CSS line `details summary { … display: flex }`. |
| F5 | **No clear primary action per screen.** Admin's only filled button ("Publish to schools") is shown at 50 % opacity when already published: it looks like an active teal blob, not a done state. School Today in the Official state has *no* primary button at all; the next step (Copy) is a small outlined button below the fold on a phone. | 1-admin, 2-head | `button:disabled { opacity:.5 }` on `.primary`. |
| F6 | **Status colours alarm the wrong cases.** "Awaiting SDO" (a normal, expected state) is red, the same as "Returned" and "Re-confirm". Status and level share the same visual form (coloured text/chip), so HINGA-red and "problem"-red blur together. | `.status.awaiting-sdo { color: var(--bad) }` | |
| F7 | **Admin density with zero-value noise.** Six equal stat tiles where four are "0" (Returned 0, Re-confirm 0, Overrides…), then a second tile grid ("Plans"), then a KPI paragraph, then a hidden chase list. The two numbers that matter at 16:00 (how many have decided; how many need the SDO) have the same weight as the zeros. Left rail: Today/Tomorrow chips stacked vertically, "Published 38" and "Draft 38" as two competing numbers, legal small print (city EO, EO 130) at the same level as the forecast input. | 1-admin | |
| F8 | **Contrast failures in dark mode (WCAG 1.4.3).** White text on `--HINGA #ef6a60` ≈ 3.0:1 and on `--HINTO #b48be0` ≈ 2.6:1, at 14 px: fails AA (needs 4.5:1). Replay banner: white on `#b48be0` ≈ 2.6:1, fails. The light theme values (`#c0392b`, `#6a3d9a`) pass. | 1-admin chips, 5-replay banner | |
| F9 | **Sunlight and text size.** On a phone outdoors at 16:30, a dark UI with 12–13 px grey text (`.small`, `.eyebrow` 11 px uppercase, legend 12.5 px, stat labels 12 px) is hard to read. There is no theme toggle, so a head whose phone is in dark mode cannot switch to the higher-glare-tolerance light theme. | all -375 | |
| F10 | **Legend comprehension.** Six glyphs at 14 px, listed in a fixed order, all six shown even when only two occur. "Shortened day" vs "Shortened + some at home" are hard to tell apart at that size. The legend sits below the map, far from the marks. | 1-admin | `legendHTML()` always prints `PLAN_ORDER`. |
| F11 | **The 3D scenes add little information as drawn.** Division: no ground reference (no district names, no coastline), so "North/South" presets mean nothing and positions don't read as a city; ghost columns dominate (F1). School: the white roof plates are the brightest object on screen; buildings are unlabelled in 3D, so "A / B / C hot / typical" is only in the 2D view. | 1-admin, 2-head-1280 | |
| F12 | **Broken or empty visuals.** "Class hours tomorrow" on a home-based day draws an empty axis with the first label clipped ("]6") and, at 1280, stretched to full width. School 2D floor plan card has ~120 px of empty space below the buildings. Replay's HINGA chip stretches to the full card width. | 2-head, 5-replay | `sunArc` when `litSlots` is empty; `.card` grid stretches `.lvl`. |
| F13 | **Empty states are dead ends.** SDO Decisions shows "Nothing here." with no counts on the filter chips and no route out ("Show all 69"). | 3-sdo | |
| F14 | **Silent saves on Morning check.** Readings commit on `change` (fires on blur on mobile). A teacher who types "36" and locks the phone may think it saved, or not. No "Saved" confirmation, no out-of-range message at the field. | `schoolMorning` | |
| F15 | **Screen-reader noise.** `<main aria-live="polite">` is re-rendered with `innerHTML` on every action, so a screen reader re-reads the entire page after each tap. | `index.html` | |

---

## 1. One visual grammar (applies everywhere)

This is the cheapest fix for both "bland" and "confusing": make each kind of information always look the same.

| Information | Form | Example |
|---|---|---|
| **Heat level** (4H) | **Filled** block in the level colour, level name + range, always dark-on-light-enough text | `HINGA 33–41°C` |
| **Decision status** | **Outlined pill with an icon**, never filled | `✓ Official` (green), `◷ Awaiting SDO` (amber), `↩ Returned` (red), `! Re-confirm` (red), `– No decision` (grey) |
| **Plan type** | **Glyph** (existing shapes) + label | `○ Home-based` |
| **Date context** | Eyebrow above every dated card (keep, plan §3) | `PLAN FOR TOMORROW · SUN 22 NOV` |

Rules:
- Red is for "someone must act" only (Returned, Re-confirm, Past 17:00, conflicts > 0). Awaiting SDO becomes amber.
- Level colour is used as a **tint wash** on the hero block of each screen (12–15 % mix into the surface, with a 6 px left bar in the full colour). This gives the screens colour that means something, and is the main "less bland" lever I endorse.
- Fix dark-mode chip contrast: dark text (`#1a0b08` or `var(--accent-ink)`-like) on `HINGA`, `HINTO`, `home`, `stop`, `request` fills in dark mode; keep white text in light mode. Replay banner in dark mode: dark text on purple, or a darker purple (`#5b3a8a`) with white.

```css
.pill { display:inline-flex; gap:6px; align-items:center; padding:4px 10px; border-radius:99px; border:1.5px solid currentColor; font-weight:600; font-size:14px }
.pill.official { color: var(--ok) } .pill.awaiting-sdo { color: var(--warn) }
.pill.returned, .pill.stale-forecast, .pill.stale-inputs { color: var(--bad) } .pill.none { color: var(--muted) }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .lvl { color:#1a0b08 } }
:root[data-theme="dark"] .lvl { color:#1a0b08 }
.hero { background: color-mix(in srgb, var(--lvl, var(--accent)) 14%, var(--surface)); border-left: 6px solid var(--lvl, var(--accent)) }
details > summary::before { content:"▸"; margin-right:8px; transition: transform .15s } details[open] > summary::before { transform: rotate(90deg) }
```

---

## 2. Header and navigation (biggest phone win)

**Now:** 5 controls + 6 tabs, wrapping to ~265 px on a phone.
**Target:** ≤ 112 px on a phone, two rows, never wraps further.

Row 1: `Presko` · short role ("Pandac head" / "Coordinator") · countdown pill · `⇄ SDO` (the one-click switch the plan requires, §2).
Row 2: the forecast line, compact: `Tomorrow Sun 22 · 38°C final · 13:54` (plan §3 requires forecast + status + time in both headers; keep, but shorter and in 14 px).
Tabs: a single horizontally scrollable row (`overflow-x:auto; flex-wrap:nowrap`). On phones in **school mode**, a **bottom tab bar** (Today · Morning · Setup) with 56 px targets is better for one-handed use; acceptable fallback is the scroll row.

Cut or move:
- **Role `<select>`** leaves the header. It lives on `#start` and `#demo` (plan §2 only requires the role picker on `#start` and the one-click switch in the header).
- **"Demo" tab** leaves the tab row; it becomes a small link next to the "demo, no sign-in" tag, which itself shrinks to a dot-separated suffix on row 1 at ≥ 700 px and moves into `#demo` on phones (keep the label visible on `#start`).
- **Person's full name** ("Ma. Santos · School head, Pandac Elementary School") shortens to the role on phones; the full name is already on the decision and the message.
- **Decisions tab gets a count badge** (`Decisions 1`) for awaiting-SDO items, so the SDO sees work without opening it.
- **Theme toggle** (sun/moon icon, 44 px) at the end of row 1, persisted in `localStorage` with try/catch. Default stays system; a head in the sun can switch to light.

---

## 3. Admin › Division (coordinator, 16:00, laptop)

**What the user must do:** (1) publish the forecast, (2) watch decisions come in, (3) chase the missing before 17:00.
**What the eye should land on:** a hero band answering "what level, and how many schools have decided".

### Hero band (new, full width, above the three columns)
```
[HINGA 33–41°C]  Tomorrow Sun 22 Nov · PAGASA 38°C final · published 13:54
No face-to-face; light home-based work.
████░░░░░░░░░░░░░░░  3 official · 1 awaiting SDO · 65 no decision        3h 05m to 17:00   [Copy reminder to 65 schools]
```
- Level-tinted (§1). The segmented progress bar uses status colours with the pill icons in the labels (not colour alone).
- The **primary button** is the chase action (from 16:45 it turns filled; before that, outlined). This promotes "Chase missing" out of the hidden `<details>` (F4) without changing what it copies.
- This band **is** the right rail's countdown + status bar (plan §6.1 right rail items 1–2), relocated to the top; the right rail no longer repeats them.

### Left rail: forecast
- Today / Tomorrow as **one segmented control** on one line (not two stacked chips).
- Replace "Published: 38" + "Draft 38" with one input labelled **"New forecast for Sun 22 (°C)"**, pre-filled with the published value, Provisional/Final as a two-option segmented control.
- The publish button **names what it will do**: `Publish 44°C (final) to schools`. When nothing differs, show a done state instead of a dimmed button: `✓ Published 38°C final at 13:54`. (Error prevention: the value is in the button.)
- "Preview the draft (only you)" checkbox becomes a 44 px switch; the dashed "Preview, not published" banner stays (plan §3) and the map frame gets the same dashed border so the preview state is visible where the user is looking.
- Remove the level chip + "what it allows" from the rail (now in the hero).
- **City threshold + EO 130 line → one `<details>` "Legal context (city EO 24, EO 130)"**, closed by default, but the city banner (`vm.city.text`) still shows *open* when the city overlay is active. Nothing is lost; it just stops competing with the forecast.

### Centre: map
- Legend moves **inside the map frame** (bottom-left overlay, semi-opaque surface) and **shows only plan types present, with counts, sorted by count**: `○ Home-based 47 · ⊙ Grounds for F2F 22`. Glyphs 18 px, labels 14 px. This **replaces the "Plans" tile grid** in the right rail (F3). Types not present are omitted (plan only requires one legend shared by both modes, not that every entry always shows; if the designer wants all six, grey the absent ones at 40 %).
- 3D (§9 below): ghost columns translucent and outlined, not solid.
- Default selected school: none. Empty selection shows a one-line hint *inside* the map, not below it.

### Right rail: what remains
1. The level KPI sentence, made a stat: big number + one line. `22 schools · 213 sections` / "could ask for face-to-face back in cooler rooms on shortened hours" (+ "subject to the city EO" when automatic).
2. One line: `8:00 readings: 0 schools · ✓ Rule conflicts 0` (conflicts turns into a red pill only when > 0).
3. Status breakdown as a compact list **showing only non-zero statuses**, each a link to the filtered Decisions view (`#admin-decisions-awaiting` etc.). Zeros collapse into "0 returned, 0 re-confirm" muted line, so the plan's full status bar is still present.
4. Chase list (`<details>` with a visible chevron), first 12 names, Copy reminder (duplicate of the hero button is acceptable here because it shows the names).
5. The school drawer moves here when a school is selected (at ≥ 1100 px), so the map stays in view; below 1100 px it stays under the map.

### Layout
At 1100–1400 px the three columns squeeze the map. Use `grid-template-columns: 300px 1fr 320px` only ≥ 1280 px; between 1100 and 1280, put the right rail below the map (two columns). The hero band carries the key numbers, so nothing important drops below the fold.

---

## 4. Admin › Decisions (SDO approver, 16:30, laptop or phone)

**Must do:** approve or return the few overrides. **Eye should land on:** the awaiting rows, each with Approve.

- Filter chips show **counts**: `Awaiting SDO 1 · Returned 0 · Re-confirm 0 · No decision 65 · Official 3 · All 69`. Zero-count chips are muted but still clickable.
- **Empty state:** "Nothing is waiting for you for Sun 22 Nov. 3 official, 65 no decision yet." + buttons `Show all 69` and `Download log (CSV)`. Never a bare "Nothing here."
- Each awaiting row (table and phone card) leads with the comparison the SDO is judging: `Rule says [HINGA] → School asks [HINAY]  less protective`, then the reason in quotes at 16 px, then actions.
- **Return requires a note:** keep the note input, but `Return` is disabled until the note has text, with helper text "Add a note to return" (prevents the thrown error; the store still enforces it). Approve stays one tap and filled; after approving, show a 5 s inline confirmation "Approved Jibao-an ES · HINAY is official" in a dedicated `role="status"` region.
- Rename the "Snapshot" column to **"Rule when decided"** and "Rule now" stays; most users won't know "snapshot".
- Download log moves to a secondary (outlined) button at the end of the filter row, not the largest button on screen.

---

## 5. School › Today (head, 16:30, phone in the sun, patchy data)

**Must do (plan §6, 16:30 path):** open link → **Record** → **Copy** → **Mark as sent**.
**Eye should land on:** tomorrow's level, then the single next step.

### Hero (level-tinted, full width)
```
PLAN FOR TOMORROW · SUN 22 NOV                     decide by 17:00 · 3h 05m
[HINGA 33–41°C]   ○ Home-based
No face-to-face. All 22 sections on light home-based work.
PAGASA 38°C, final, 13:54
```
- Level chip at 18 px bold; the plain-language sentence at 17 px. The school name is already in the header on this page; drop the H2 school name here on phones (keep at ≥ 700 px if the designer wants).
- The countdown lives here as text on the tomorrow card (plan §3); the header countdown pill can be hidden on this page at < 700 px to avoid the double (both still satisfy "both headers show a countdown" on every other page; if the designer prefers strict reading of §3, keep the header one and make this one plain text "decide by 17:00").

### Step strip (new; the core of the change)
Three numbered steps, each a row with a state icon, done steps collapse to one line:
1. **Record tomorrow's level** → `[Record HINGA (recommended)]` full-width filled button, 52 px tall. "Choose a different level" as a text link below. When done: `✓ Official · HINGA · Ma. Santos 13:54` (this single line **replaces** both "Official" and "Official: HINGA, by …" (F3)). Awaiting/Returned/Re-confirm show their pill + one sentence + one primary button exactly as plan §6 lists.
2. **Copy the parent message** → language segmented control (EN / FIL / HIL), message box, `[Copy message]` full-width filled button once official. While draft: Copy disabled, and the box shows a visible "DRAFT · not for sending" label on top (plan §6 requires the watermark text; currently only stripes).
3. **Mark where you posted it** → three 44 px toggle chips (FB page / Group chat / Radio). Sent = filled green with ✓ and the time, so the state is obvious at a glance.

The primary (filled) button is always the **current step only**; finished steps show ✓, future steps are visible but muted. This gives the head a one-glance answer to "am I done?" and makes the demo video's 16:30 beat self-explanatory.

### Below the steps
- Correction block (plan §6) stays, placed directly under step 2 when present, red pill.
- **No water tomorrow**: a 44 px switch row with the consequence in the label ("No water supply tomorrow · forces at least HINGA"). Place it **above step 1** when no decision is recorded (it changes what you are about to record), and in Details once recorded. The plan lists it under Details; this is a placement change only, flag for the designer/plan owner.
- **Details** (`<details>` with chevron, closed): why line, flags, `Rule conflicts 0`, rooms to check first at 8:00, section plan table. Conflicts > 0 forces Details open with a red pill.
- **Today card** (morning, when needed): same hero + step pattern, red pill banner, one Re-confirm button (plan §6).

### Scene
- "Show 3D" stays opt-in on phones (plan §5). The 2D floor plan card loses its empty bottom space (size SVG to content).
- **Class hours:** when there are no lit slots, replace the empty axis with text: "No class hours at school tomorrow (home-based)." Fix label clipping (pad the viewBox to `-16 … W+32`) and cap the SVG at 420 px wide on desktop.

---

## 6. School › Morning check (teacher, 08:00, phone)

**Must do:** type one reading per building, see the result, tell the head if needed.

- Hero: `MORNING CHECK · SAT 21 NOV` + today's level chip + "Check these first: Building A, Building C".
- One row per building: name + flag pill on the left, a **large numeric input** (20 px text, 120 px wide, `inputmode="decimal"`) on the right, result chip under it (`→ HINGA · no classes here` / `not read`).
- Out-of-range values (outside 20–55) show an inline error under the field ("Enter 20 to 55 °C, or leave empty") with `aria-describedby`, instead of only a flash banner at the top.
- **Explicit save feedback:** keep commit-on-change, but show "Saved 08:04 ✓" next to each field after a successful write, and a sticky `[Done]` button that blurs the field (forces `change` on mobile). No silent saves.
- Outcome block (plan §6 three outcomes) as the visual end of the page, level-tinted when the level is raised; teacher's `[Copy note for the head]` full-width filled.
- "Whichever is worse (assumption)" stays next to the result, 14 px, not 13 px muted.

---

## 7. School › Setup (custodian, week 1)

Low demo priority; small fixes only.
- Each building becomes a `<details>` card, summary = `Building A · 7 rooms · cooler (−3)` so the page is scannable; first one open.
- Textareas: `rows="3"` and auto-height on input, so notes aren't clipped mid-word.
- Feature chips keep the green/red left bar but add the sign in text (already present) and 14 px.
- Timetable: `Shift 1 [06:00] to [12:00]` on one line using a 3-column grid; on phones the "to" no longer dangles.
- Provenance tags (`entered · P. Gonzaga`, `illustrative`) stay top-right of each card (plan §7).

---

## 8. Admin › Replay

**Eye should land on:** the contrast between what happened and what Presko computes.

- Banner: keep the full-width purple "REPLAY · 1 April 2024 · not tomorrow's plan" + Exit replay (plan §8), fixed contrast (§1).
- Replace the two text columns with a **two-number hero**:
  `What happened: 66 of 66 schools closed face-to-face` | `Presko today: 22 schools could keep 213 sections face-to-face`
  big numbers (44 px display font, already defined as `.big`), one line each, computed live (plan §8).
- Heat line and HINGA chip under the hero (chip must not stretch: `justify-self:start`).
- Caveat paragraph ("Today's rules … applied to that day's heat …") stays, required by plan §8, at 14 px in a muted note under the hero, not as the right column's body.
- Sources links stay.

---

## 9. 3D scenes: make them earn their space

- **Division:** ghost columns become translucent (`opacity .25`, `depthWrite:false`) with the request-blue edge outline, so the solid pieces (real F2F columns, discs) read first. Selected school: a ring + label sprite, others dim to 60 %. Add **district name labels** (7 HTML overlays positioned from the centroid of each district's schools, if a district field exists; otherwise skip). Without ground context, consider making **2D the default at all sizes** and 3D an opt-in "3D view" button; the 2D map is clearer and is what a coordinator would actually use. I'd accept the designer's call here, since 3D is a plan principle and good for the video.
- **School:** tone the bright "no ceiling" roof plate down to a light grey with a thin light edge; add building name + flag labels as HTML overlays (same text as 2D), so the 3D isn't less informative than the 2D.
- Every 3D fact is already in text (plan §5); keep it that way.

---

## 10. Start page

- Lead with the story in one line: "Tomorrow's heat level for 69 schools, decided by 17:00."
- Role cards grouped and **ordered by the day's timeline** (which is also the demo script): `16:00 DRRM coordinator · publish forecast` → `16:30 School head · record & message` → `16:45 SDO approver · approve` → `08:00 Teacher · morning readings` → `Week 1 Custodian · buildings`. Each card: time, role, one verb phrase, 64 px tall.
- Keep the "demo, no sign-in" label and the illustrative-data line here (they leave the phone header).

---

## 11. Global readability and accessibility

- Body 16 px on phones (15 px ≥ 1100 px); `.small` minimum 14 px; `.eyebrow` 12 px; legend 14 px; stat labels 13 px.
- Interactive targets: 44 px for everything a head or teacher taps (chips, tabs, checkboxes via a padded label row); 36 px only in the admin desktop toolbars. (WCAG 2.2 AA 2.5.8 needs 24 px; 44 px is the field-use target.)
- Checkboxes `min-height:auto` currently render at ~13 px: wrap in a 44 px label row and enlarge with `inline-size:20px; block-size:20px; accent-color: var(--accent)`.
- Replace `aria-live` on `<main>` with a dedicated `<div role="status" aria-live="polite" class="sr-status">` that receives only the confirmation/flash text (F15).
- Disabled buttons: don't rely on 50 % opacity of the accent; use `var(--sunk)` background + muted text + a reason line.
- `prefers-reduced-motion` already handled; keep.

---

## 12. The 3 highest-impact changes

1. **A hero + next-step on every working screen.** Admin Division: level-tinted band with forecast, a decision progress bar to 17:00, and the chase button. School Today: level-tinted hero + the 3-step strip (Record → Copy → Mark sent) with exactly one filled button for the current step. Cuts the duplicated "Official" lines, the triple countdown, the zero tiles and the Plans grid. Fixes F1, F3, F5, F7, and is what makes the 2-minute video readable.
2. **Header diet.** Two compact rows (brand · role · countdown · ⇄ switch · theme; then the forecast line), role select and Demo moved to `#start`/`#demo`, tabs on one scrollable row (bottom bar in school mode), Decisions badge. Returns ~150 px to the phone viewport. Fixes F2, F9.
3. **One visual grammar + contrast and disclosure fixes.** Filled = level, outlined pill + icon = status (Awaiting SDO amber, not red), glyph = plan; dark text on level chips in dark mode; visible chevrons on every `<details>`; legend inside the map with counts of present types only; 14 px minimum text. Fixes F4, F6, F8, F10.

---

## 13. Build order and time (≈ 1.5 h)

| Step | Change | Files | Est. |
|---|---|---|---|
| 1 | Pills, dark-mode chip contrast, replay banner contrast, `details` chevrons, text sizes, checkbox size, `role="status"` region | index.html CSS, ui.js `statusHTML`, `flashHTML` | 15 min |
| 2 | Header diet + scroll tabs + Decisions badge + theme toggle | ui.js `renderHeader`, CSS | 20 min |
| 3 | School Today hero + step strip; remove duplicate Official line; draft label; class-hours empty text; 2D height | ui.js `schoolToday`, `decisionButtons`, `messageBlock`, scenes.js `sunArc` | 25 min |
| 4 | Admin hero band (level, progress bar, chase button), rail trim (non-zero statuses, KPI stat, Legal context details), publish button label/done state, legend with counts inside map (remove Plans grid) | ui.js `adminDivision`, scenes.js `legendHTML(types, counts)` | 25 min |
| 5 | Decisions: counts on filters, empty state, Return disabled until note | ui.js `adminDecisions` | 10 min |
| 6 | If time: Replay two-number hero; ghost columns translucent; Morning "Saved ✓"; Setup accordions; start-page timeline order | ui.js, scene3d.js | remaining |

## 14. Plan-compliance check

- Dates on every card, countdown in header and tomorrow card and admin status area, forecast + status + time in headers, one-click switch in header, Preview banner, Copy disabled for drafts with a DRAFT label, Mark-as-sent chips storing the level, one legend for both modes with colour + shape, level names with ranges, replay banner and isolation, Rules/Data tabs, every 3D fact as text: **all kept**.
- Moved, not removed: role select (to `#start`/`#demo`), Demo tab (to a link), city threshold + EO 130 (to an open-when-relevant `<details>` in the same rail), Plans counts (into the legend), status bar (into the hero band + compact list).
- One placement change to confirm with the plan owner: the **No water** toggle shown above "Record" before a decision exists (plan lists it under Details).
- Open for the designer: whether 2D becomes the default Division view on laptops too (I lean yes for usability; 3D is a plan principle and helps the video).
