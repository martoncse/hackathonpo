# Presko visual design, round 2: visual designer's response to usability round 1

Responding to `design-r1-usability.md`, point by point. My round 1 is `design-r1-visual.md`.

Short version: we agree on far more than we disagree. Usability's diagnosis is the same as mine (hierarchy first, colour second). Their step strip and their header diet are better than what I proposed for those areas, and I adopt both. I hold firm on four things:
- the heat ruler;
- replay not being purple;
- a legend with stable positions;
- 3D as the laptop default, on the condition that the 3D upgrade lands.

---

## 1. Accepted as-is

| Their point | Note |
|---|---|
| F1–F15 diagnosis | Agreed in full. F6 (Awaiting SDO in alarm red) and F15 (whole-page `aria-live`) are good catches I missed. |
| §1 grammar: **filled = level, outlined pill + icon = status, glyph = plan** | Adopt. It also solves a problem in my palette: my HINGA `#D2401F` and `--bad #B3261E` are near-identical reds. The form (filled block vs outlined pill), not the hue, now separates "heat" from "act now". |
| Red only for "someone must act"; Awaiting SDO → amber `--warn` | Adopt. |
| Dark-mode dark text on level chips; fixes for F8 contrast | Same as my §3.2 values. |
| Visible chevrons on every `<details>` (F4) | Adopt their CSS. |
| §2: role `<select>` leaves the header (to `#start` / `#demo`); one-click `⇄ SDO` stays; Demo becomes a link; Decisions count badge; theme toggle | Adopt. This is a better header diet than mine (I kept the select). |
| §2 row 2: compact forecast line in **both** headers | Adopt, and I withdraw my "forecast leaves the admin header". Plan §3 requires it, and I was wrong to drop it. Phone header target becomes **≤ 112 px** (theirs), not my 96. |
| §3 left rail: Today/Tomorrow segmented; a single "New forecast for Sun 22 (°C)" input; Provisional/Final segmented; **publish button names the value** (`Publish 44°C (final) to schools`); done state `✓ Published 38°C final at 13:54`; preview as a switch plus a dashed frame on the map | Adopt all. The named button is error prevention and it looks better than a dimmed blob. |
| §3: city EO 24 + EO 130 in a "Legal context" `<details>`, forced open when the city overlay is active | Adopt. |
| §3: legend **inside the map** with **counts**, replacing the Plans tile grid | Adopt. It merges with my bars idea; see §2 for how ordering and absent types work. |
| §3 right rail: KPI as a big number + one line; one readings/conflicts line; non-zero statuses as links to filtered Decisions | Adopt. |
| §4 Decisions: counts on filters; the empty state with `Show all 69` + CSV; the row leads with `Rule says [HINGA] → School asks [HINAY]`; **Return disabled until a note**; "Rule when decided" instead of "Snapshot"; CSV as a secondary button; 5 s approve confirmation in `role="status"` | Adopt all. |
| §5 **Step strip** (Record → Copy → Mark sent), with exactly one filled button for the current step, done steps collapsing to `✓ …`, future steps muted | Adopt, and it replaces my "three cards" split for the school page. It is clearer for a low-confidence head and makes the 16:30 beat in the demo self-explanatory. Visually I'll render it as numbered rows with a 2 px vertical connector line in `--line` (filled `--ok` for done steps), and numbers in mono caps. |
| §5: one line `✓ Official · HINGA · Ma. Santos 13:54` replaces both "Official" lines | Adopt. |
| §5: a visible "DRAFT · not for sending" label on the draft message (not just stripes) | Adopt. It's a plan §6 requirement I under-specified. |
| §5: class-hours empty text when there are no lit slots; viewBox padding; 420 px cap; 2D floor-plan sized to content | Adopt. |
| §6 Morning check: large numeric inputs, an inline range error with `aria-describedby`, `Saved 08:04 ✓` per field, a sticky Done | Adopt. |
| §7 Setup: building `<details>` with summary `Building A · 7 rooms · cooler (−3)`; auto-height textareas; one-line timetable grid | Adopt. Compatible with my signed square chips. |
| §8 Replay: **two-number hero** (66 of 66 closed vs 22 could keep 213 sections) at 44 px; the HINGA chip `justify-self:start`; the caveat as a muted note under the hero | Adopt. It's the strongest jury moment in the app. |
| §9 School 3D: tone down the bright roof plate; building name + flag HTML labels | Adopt with a refinement: the bare GI roof keeps a slight metallic sheen (`metalness .4, roughness .5`, colour `#C9CED1`), not white. It should read as "hot roof", not as the brightest object. |
| §10 Start page in day-timeline order (16:00 → 16:30 → 16:45 → 08:00 → week 1) | Adopt. It doubles as the demo script. |
| §11 checkbox size, `role="status"` region, disabled = `--sunk` + reason, 44 px field targets | Adopt. |

## 2. Accepted with changes

| Their point | My change and why |
|---|---|
| **Level tint wash** (14 % mix + a 6 px left bar) as the hero treatment | **Accept, and I drop my solid full-colour band on the school card.** Their file exposed the problem: a large saturated red field on a phone reads as an *error*, which contradicts the new "red = act" rule. Change: tint wash + 6 px bar **plus** the large filled level tag (`.lvl.xl`, Bricolage 800, 34–40 px) **plus the heat ruler** inside the hero. The tint carries the mood and the tag carries the fact. Light-mode tint is 12 %, dark-mode 18 % (needed to show on `#141C19`). |
| **Admin hero band** (level, decision progress, countdown, chase button) | **Accept, merged with my forecast strip.** One full-width band, two rows. Row 1: `38°` at `--t-hero` with `PAGASA FINAL · 13:54` in mono caps, then the **heat ruler**, then `[HINGA 33–41°C]` (xl) and the "allows" sentence. Row 2: their segmented progress bar (status colours + icon labels), the countdown, and the chase button (outlined, filled from 16:45). This answers "what level, why, how close to 42, how many decided" in one glance, which neither proposal did alone. |
| **Layout breakpoints** (three columns ≥ 1280; right rail under the map 1100–1280) | **Change the breakpoint to 1440.** 1280 is the likely demo laptop width, and at 1280 three columns leave the map about 600 px wide (today's squeeze). Proposed: **≥ 1440:** editor 280 / map / rail 320. **1100–1439:** editor 280 / map, with the rail content as a 3-up row under the map (KPI · status list · chase list). **< 1100:** stacked, panels before the map on phones (plan §5). The hero band carries the key numbers, so nothing important falls below the fold at 1280. Map height `clamp(440px, 62vh, 700px)`, as in my r1. |
| **Legend: present types only, sorted by count** | **Change: all six always shown, in fixed `PLAN_ORDER`, absent types at 35 % opacity with count "0".** Reasons: (1) the demo's key transition is publish 38 → preview 44, where the plan mix flips from home/request to all-stop. If entries appear, disappear and re-sort, the legend jumps exactly when the jury is looking at it. Stable positions let the eye track the counts changing. (2) It teaches the full vocabulary once, which plan §5 means by "one legend". Their 18 px glyphs and 14 px labels are adopted. My hover-to-isolate in 3D attaches to legend items (and on tap for touch). |
| **School hero drops the school name on phones** | Accept, but keep the school name in the header row 1 on Today (truncated with ellipsis), so it's always on screen. |
| **Countdown on the school card vs the header** | Keep the **header pill** (strict plan §3), and put plain text `decide by 17:00` in step 1's row, without a second ticking timer. This removes the double and stays compliant. |
| **Status pills with icons** `✓ ◷ ↩ ! –` | Accept. Use text glyphs (no emoji, no icon font), 1.5 px border, radius 999. This is the one place pills stay round, so status is distinguishable from the square level tags by silhouette too. |
| **Body 16 px phones / 15 px ≥ 1100 px; stat labels 13 px** | Accept 16/15. Stat labels at **14 px** (my floor), because the admin is also projected. |
| **Bottom tab bar in school mode** | **Stretch only.** It costs about 20 min plus safe-area work, and the head's path is a single page. In the 1.5 h budget, use the scrollable tab row; add the bottom bar if time remains. |
| **Selected school in 3D: others dim to 60 %** | Accept for selection, as a light dim to 60 % only. Legend-hover isolation dims to 20 %. Two strengths for two intents. |

## 3. Rejected, with reasons

| Their point | Why I reject it |
|---|---|
| **Keep the purple replay banner, fixing contrast** (§8) | Purple **is** HINTO ("no classes anywhere") in the legend, the chips and the 3D. A full-width purple bar on the replay screen tells a coordinator "Hinto" in the app's own colour language, and in the 1 April 2024 replay the computed level is HINGA, so the screen shows two contradictory heat signals. Contrast isn't the problem; meaning is. Keep my r1 treatment: **inverse ink banner** (ink background, `--on-ink` text), a louver-stripe block at the left, `REPLAY · 01 APR 2024 · not tomorrow's plan` in mono caps, white Exit button, and a dashed outline on `main`. It is just as loud and doesn't collide with any level. Plan §8 asks for a banner, not a colour. |
| **District name labels** (§9) | There is no district field in the data (`grep -i district` finds nothing in PRESKO/*.js or *.json). Hand-placing seven labels risks putting wrong labels on a real city map in front of Ilonggo jurors. Instead: a **1 km grid on the ground slab**, a north arrow plus a scale bar, and pinned labels for the hovered/selected school. North/South presets then read as directions on a plan, not as meaningless camera angles. |
| **Legend sorted by count / hiding absent types** | See §2: stability during the demo transition matters more. |

## 4. Their open points

### 4a. 2D or 3D as the laptop default (≥ 1100 px)

**3D default on laptops, with a hard condition and a fallback.** Below 700 px, 2D stays the default per plan §5 (we agree).

- *Why 3D:* it is a plan principle (§5 "minimalist 3D") and the user's explicit constraint. For a policy jury it is the memorable image: on publish, columns rise across the city, and the F2F-request scaffolds show "these 22 schools could reopen" spatially in one glance. A flat dot map is what every dashboard has.
- *The condition:* this only holds if the 3D upgrade from my r1 §6 lands, specifically: translucent wireframe ghosts (which fix their F1), the ground slab with its 1 km grid and the camera fitted so corners don't cut, shadows, and the pinned hover label. The current 3D *does* lose to 2D, and their F11 is right about it.
- *Fallback rule for the build:* if the 3D upgrade isn't done by the cut line, flip the default to 2D on all sizes and keep "3D view" as a button. That's a one-line change in `prefers3D()`.
- *Either way:* the 2D map gets the same grid, scale, overlay legend and selection label, so the two views share one look.

### 4b. No-water toggle above Record before a decision exists

**Accept.** It changes the recommendation the head is about to record, so it belongs before step 1. Rendering: a compact switch row *inside* step 1, above the button, labelled `Before you record · No water supply tomorrow (forces at least HINGA)`, in 16 px with a 44×26 switch. Once a decision is recorded it moves to Details, as they propose. The plan owner should confirm, since plan §6 lists it under Details. It is a placement change only.

## 5. Concerns about my own proposal that their file exposes

1. **Solid red level band = alarm.** Conceded above (tint + tag + ruler instead).
2. **Forecast removed from the admin header** broke plan §3. Withdrawn.
3. **My stacked status bar relied on colour.** It now carries icon + count labels per segment (their grammar), and zeros collapse into a muted line.
4. **HINGA red vs `--bad` red collide** in my palette. Resolved by form (filled vs outlined), plus `--bad` shifted slightly cooler and darker to `#A3201A` light / `#FF8A80` dark, so even side by side they differ.
5. **Hover-only interactions** (isolation, labels) don't exist on touch. Every hover gets a tap equivalent: tap legend item = isolate (tap again to clear), tap column = select + persistent label.
6. **Ink primary in dark mode** is a white button. That's fine for contrast, but one filled button per view (their rule) keeps it from glaring. Step-strip done states stay outlined.
7. **Combined scope exceeds 1.5 h.** Proposed cut order for the build (both proposals merged):
   1. Tokens + grammar + contrast + chevrons + type floor (20 min).
   2. Header diet (20 min).
   3. School hero (tint, xl tag, ruler) + step strip (25 min).
   4. Admin hero band + editor rail + legend-in-map + rail trim + breakpoints (25 min).
   5. 3D upgrade: ghosts, slab + grid, camera fit, shadows, pinned label (25 min). **This is the cut line for keeping 3D as the default.**
   6. Decisions counts + empty state + Return gating (10 min).
   7. If time: replay hero + ink banner, Morning saved ✓, Setup accordions, start timeline, publish wave, legend isolation, bottom tab bar.
8. **Atkinson Hyperlegible Next.** Usability didn't object. I keep it as optional: one `<link>` change, revertible to Inter if load or rendering is off. The scale matters more than the family.
9. **Light default for the demo.** Usability keeps system default plus a toggle, which I accept for users. Additionally, `#demo` sets `data-theme="light"` for the projector (via the toggle state; it doesn't override a later user choice).

## 6. Remaining disagreements (for round 3)

1. **Replay banner colour:** purple with fixed contrast (usability) vs inverse ink (me). I hold: purple = HINTO.
2. **Legend contents:** present types sorted by count (usability) vs all six in fixed order with absent ones dimmed (me). I hold: it must stay stable during the 38 → 44 preview.
3. **Laptop default view:** usability leans 2D. Me: 3D, conditional on the upgrade landing, with an explicit flip-to-2D fallback at the cut line. Usability said they'd accept the designer's call.
4. **Three-column breakpoint:** 1280 (usability) vs 1440 (me), so the map isn't squeezed on the demo laptop.
5. **Minor/stretch:** bottom tab bar in school mode (I say stretch only) and stat-label size 13 vs 14 px.
