# Presko web app: final design spec ("Sunbreaker")

**Status: FINAL, approved by visual designer and usability.**
*Merged from `design-r1-visual.md`, `design-r1-usability.md`, `design-r2-visual.md` and `design-r2-usability.md`. This spec governs the look and layout. Functional requirements stay as in `WEBAPP-PLAN.md`; deviations are logged in §13. Don't edit the plan until this is approved.*

---

## 0. Decisions on the disputed points

| # | Point | Decision | Why |
|---|---|---|---|
| 1 | **One primary action at a time** | Accepted. Ink fill = the single primary action visible at that moment. Selected segment thumbs are `--surface` (never ink), and nav uses an underline. Sequences are given per screen (§8). | It makes the next step findable in one glance: the head in the sun, and the jury in a 2-minute video. |
| 2 | **Mark-as-sent** | Three **independent toggle chips** with gaps between them, `aria-pressed`, and "✓ 16:32" when sent. Not a segmented row. | Channels are multi-select. A segmented look says "pick one". I was wrong in r1. |
| 3 | **Forecast and countdown in the header** | A **page-aware header chip**: forecast + countdown on every page, except where the page's hero shows the same fact in the first viewport. Division drops both from the header (the strip shows them). School Today drops the forecast only (the plan band shows it). Morning check shows the forecast only (no countdown, per plan §3). Logged as amendment A1. | Plan §3's intent (always visible) is kept, without duplicates. The SDO on Decisions keeps the deadline in view. |
| 4 | **Plan band before a decision** | **Level-colour tint from the start, with a diagonal hatch** while the level is only the rule level (not recorded). On Record, the hatch fades out and "✓" appears. No grey band. | Without a decision the rule level stands (plan §3), and a grey band would say "no level". The hatch reuses the draft-message pattern, so "hatch = not yet official" is learned once. |
| 5 | **No amber outside heat meaning** | Accepted. Countdown under 30 min = inverse ink. Late = `--bad`. Lit class-hour slots = ink/white. The amber sun sphere in 3D is allowed (it *is* heat). One exception is documented: `--warn` (dark ochre) for **Awaiting SDO**, as **dot + word text only, never a fill**. | The fill-vs-text form rule keeps it apart from the filled HINAY tag, and Awaiting must not be alarm red (usability F6). |
| 6 | **Morning check feedback** | In scope, above the cut line: "Saved ✓ 08:04" per field and an inline range error under the field (`aria-describedby`). | It's the teacher's only feedback. A change event that fires on blur is invisible without it. |
| 7 | **Replay banner** | **Inverse ink + louver stripes. No purple.** Usability conceded. | Purple = HINTO. |
| 8 | **Legend** | **On the map, all six types in fixed `PLAN_ORDER`, with counts; absent types at 40 % opacity** with "0". The rail **plan bars** show present types only. | A stable legend during the 38→44 preview, plus no noise in the rail. Both sides accepted this. |
| 9 | **Laptop default view** | **3D default where `prefers3D()` is true (≥ 700 px etc.); 2D below 700 px.** Hard fallback: if build step 5 (§12) isn't finished, flip `prefers3D()` to return false, and 3D becomes a button. | Plan principle and jury image. It's honest only once the diorama fixes land. Both sides agree. |
| 10 | **Breakpoint** | Moot. The forecast strip + **two-column body** (map 2fr · rail minmax(300px, 1fr)) replaces the three columns from 1100 px up. | It removes the squeeze at 1280 px, the likely demo width. |
| 11 | **14 px labels** | 14 px minimum for all running text and stat labels. 12 px only for mono-caps eyebrows and the ruler ticks. | Both agreed (projection + phones). |
| 12 | **No-water toggle** (each of us conceded to the other) | **It stays in Details (plan §6).** While there's no decision, step 1 shows one line under Record: "No water tomorrow? **Set it first →**". This is a link that opens Details, scrolls to the switch and focuses it. | It respects the plan without an amendment, the head still meets it *before* recording, and it costs one tap. A switch above Record would be a plan change for a rare case. |
| 13 | **Role picker** (crossed concessions) | **"Role ▾" at the end of the tab strip** (a native `<select>` styled as a tab), **plus** the one-click "⇄ SDO" / "⇄ Head" button in header row 1 (44 px). The role picker also stays on `#start`. | The demo changes role five times, so it must be one tap away. Plan §2 requires the switch in the header. The select stops cluttering row 1. |
| 14 | **Status display** (crossed concessions) | **8 px dot + the status word/sentence**, everywhere including tables. No Unicode icons, except "✓" for done states (widely supported). | The words carry the meaning. It's lighter than outlined pills and has no glyph risk on cheap Android phones. |
| 15 | **Hero on school Today** | The **level band is the hero**. The message is the largest *body* text (16 px), not the hero. | It's the head's first question: "what level tomorrow?" |
| 16 | **Body font** | **Atkinson Hyperlegible Next**, with `Inter, system-ui` fallback. If it doesn't render cleanly in the first 5 minutes of the build, revert to Inter. Logged as amendment A2. | Distinct 1/l/I and 0/O for °C values on cheap phones. |

---

## 1. Concept

**Sunbreaker.** Iloilo's public buildings and schools are shaded by concrete brise-soleil, and PAGASA advisories are colour bands on a temperature scale. **Colour means heat; everything else is shade.** The chrome is neutral concrete (light) or night shade (dark), with ink actions. Saturated colour appears only for 4H levels and plan types. The signature elements are:
- the **heat ruler**;
- big **bulletin numerals**;
- square 4 px tags;
- mono-caps dates;
- a louver-stripe motif used sparingly (the wordmark, replay, preview);
- the 3D city as a **diorama on a site plan**.

Light is the projector/demo default (`#demo` sets `data-theme="light"` unless the viewer has already chosen). Otherwise it follows the system, with a toggle.

---

## 2. Tokens

### 2.1 Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#E9ECE8` | `#0A0F0D` | page |
| `--surface` | `#FFFFFF` | `#141C19` | cards, segment thumb |
| `--raised` | `#FFFFFF` | `#1C2622` | inputs, tooltip, message box |
| `--sunk` | `#DEE3DD` | `#0F1513` | segment track, wells, disabled bg |
| `--ink` | `#121C18` | `#ECF1EE` | text, **primary button fill** |
| `--ink-2` | `#3C4944` | `#BFCBC5` | secondary text |
| `--muted` | `#5A6762` | `#8FA19A` | eyebrows, captions, zero values |
| `--line` | `#CBD2CC` | `#26312D` | dividers, dark-mode card border |
| `--line-strong` | `#9AA59F` | `#3A4842` | input borders, "No decision" segment |
| `--on-ink` | `#FFFFFF` | `#0A0F0D` | text on primary / inverse |
| `--focus` | `#121C18` | `#FFFFFF` | 3 px ring, 2 px offset |
| `--ground` / `--ground-side` | `#E4E8E2` / `#C9D0C9` | `#18211E` / `#0F1513` | 3D slab |
| `--scene-top` / `--scene-bot` | `#F5F6F3` / `#DCE1DB` | `#131B18` / `#090D0C` | scene backdrop gradient |

Cards in light mode have no border, with `box-shadow: 0 1px 0 var(--line), 0 1px 3px rgb(18 28 24 / .06)`. In dark mode they have a 1 px `--line` border and no shadow.

### 2.2 Heat: 4H levels (fill / chip text)

| Level | Light | Dark | Ruler span |
|---|---|---|---|
| HAYO < 27 | `#1E7F4F` / `#FFFFFF` | `#3DBE7A` / `#04140B` | 20–27 |
| HINAY 27–32 | `#E8A317` / `#1A1200` | `#F2B630` / `#1A1200` | 27–33 |
| HINGA 33–41 | `#D2401F` / `#FFFFFF` | `#FF6A3D` / `#1A0600` | 33–42 |
| HINTO ≥ 42 | `#6B3FA0` / `#FFFFFF` | `#B48CF0` / `#14062A` | 42–50 |

### 2.3 Plans (same hues; legend shapes unchanged from plan §5)

| Token | Light fill | Light edge | Dark fill | Chip text L / D |
|---|---|---|---|---|
| `--full` | `#1E7F4F` | `#1E7F4F` | `#3DBE7A` | `#FFF` / `#04140B` |
| `--split` | `#E8A317` | `--split-edge #8A5A00` | `#F2B630` | `#1A1200` both |
| `--splitPartial` | `#E87722` | `--splitPartial-edge #9C4A0B` | `#FF9A4D` | `#1A0A00` both |
| `--home` | `#D2401F` | `#D2401F` | `#FF6A3D` | `#FFF` / `#1A0600` |
| `--request` | `#1F63B8` | `#1F63B8` | `#6AA8FF` | `#FFF` / `#04122A` |
| `--stop` | `#6B3FA0` | `#6B3FA0` | `#B48CF0` | `#FFF` / `#14062A` |

In light mode, SVG symbols for split and splitPartial get a `stroke: var(--*-edge)` of 1.25 px. In dark mode, symbols need no edge.

### 2.4 Status (dot + text only; never a fill, except the late countdown)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--ok` | `#1A7A47` | `#5FD39A` | Official, conflicts 0, sent |
| `--warn` | `#8A5A00` | `#F2C14E` | Awaiting SDO (text + dot only) |
| `--bad` | `#A3201A` | `#FF8A80` | Returned, Re-confirm, Past 17:00, conflicts > 0, less protective |

Status mapping: `official → ok`, `awaiting-sdo → warn`, `returned / stale-forecast / stale-inputs → bad`, `none → --muted` with a hollow dot (1.5 px ring).

### 2.5 Type

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=JetBrains+Mono:wght@500;700&display=swap">
```

```css
--display: "Bricolage Grotesque", "Avenir Next", system-ui, sans-serif;
--body: "Atkinson Hyperlegible Next", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--mono: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
```

| Token | Desktop | Phone (< 700) | Family / weight | Use |
|---|---|---|---|---|
| `--t-hero` | 72/0.9 | 56/0.9 | display 800, −0.02em | "38°C" (always with °C) |
| `--t-level` | 40/1 | 34/1 | display 800 caps | `.lvl.xl` |
| `--t-kpi` | 40/1 | 32/1 | display 800, tabular | KPI, replay hero numbers (44 on replay) |
| `--t-h1` | 28/1.1 | 24/1.1 | display 800 | page titles |
| `--t-h2` | 20/1.2 | 20/1.2 | display 600 | card titles |
| `--t-body` | 15/1.5 (≥ 1100) | 16/1.5 | body 400 | text |
| `--t-small` | 14/1.45 | 14/1.45 | body 400 | notes, stat labels, legend |
| `--t-cap` | 12/1.2, +0.08em caps | same | mono 500 | eyebrows, dates, ruler ticks |

No running text under 14 px. Numbers, times and °C values use mono or tabular display.

### 2.6 Space, radius, size

- Spacing: `4 8 12 16 24 32 48`. Card padding: 20 desktop, 16 phone. Grid gap: 16. Groups inside a card are separated by a `--line` divider with 16 px above and below.
- Radius: `--r-sm 4px` (buttons, inputs, tags, chips), `--r-md 8px` (cards, scene), `999px` (segment track and thumb, dots).
- Targets: everything a school role taps is ≥ 44 px. Primary buttons are 48 px desktop / 52 px phone. Admin desktop toolbars (camera presets, 2D/3D) are 36 px.
- Checkboxes and switches sit inside a 44 px label row. The switch is 44×26.

---

## 3. AA contrast checks (computed, WCAG 2.x relative luminance)

| Pair | Ratio | Req |
|---|---|---|
| `--ink` on `--surface` (L) | ≈ 17:1 | 4.5 ✓ |
| `--ink-2 #3C4944` on white | ≈ 9.6:1 | 4.5 ✓ |
| `--muted #5A6762` on white / on `--bg #E9ECE8` | 5.9 / 5.0 | 4.5 ✓ |
| `--muted #8FA19A` on `#141C19` (D) | ≈ 6.3 | 4.5 ✓ |
| HAYO white on `#1E7F4F` | 5.0 | ✓ |
| HINAY `#1A1200` on `#E8A317` | 9.6 | ✓ |
| HINGA white on `#D2401F` | 4.7 | ✓ (tight: never put the range text below 12 px semibold) |
| HINTO white on `#6B3FA0` | 7.1 | ✓ |
| request white on `#1F63B8` | 5.8 | ✓ |
| splitPartial `#1A0A00` on `#E87722` | ≈ 6.2 | ✓ |
| Dark chips: `#1A0600` on `#FF6A3D` · `#14062A` on `#B48CF0` · `#04140B` on `#3DBE7A` · `#1A1200` on `#F2B630` | 6.7 · 7.9 · 8.9 · 10.8 | ✓ |
| `--ok #1A7A47` / `--warn #8A5A00` / `--bad #A3201A` text on white | 5.4 / 5.9 / 7.5 | ✓ |
| `--ok #5FD39A` / `--warn #F2C14E` / `--bad #FF8A80` on `#141C19` | 9.2 / ≈ 11 / 7.5 | ✓ |
| Late countdown: white on `#A3201A` (L), `#0A0F0D` on `#FF8A80` (D) | 7.5 / ≈ 8 | ✓ |
| Non-text (1.4.11): `--split-edge #8A5A00`, `--splitPartial-edge #9C4A0B` on white | 5.9 / ≈ 6 | 3 ✓ |
| `--line-strong` "No decision" segment vs `--sunk` track (L) | ≈ 2.2 | Decorative: the count row prints the number and word, so the segment colour isn't the only signal |
| Ink text on the level tint (12 % HINGA into white ≈ `#F9E8E4`) | ≈ 15 | ✓ |

Rule: any text placed on the hatch uses `--ink`, and the hatch lines are ≤ 8 % ink, so contrast loss is < 5 %.

---

## 4. Components and states

- **Level tag `.lvl`.** A filled block, radius 4, padding 6×10, display 800 15 px caps, then the range after a 1 px divider in mono 12 px 600. `.lvl.xl` uses `--t-level` with the range in mono 16 px. In a grid it uses `justify-self: start` (it never stretches).
- **Plan label `.plan`.** An 18 px SVG symbol + 600 label.
- **Status `.st`.** `<span class="st st--official"><i></i>Official · Ma. Santos 13:55</span>`. The `i` is an 8 px dot in the status colour (hollow for `none`), and the text is in the status colour at 600 weight. The status sentence is printed **once** per block.
- **Buttons.**
  - Primary: `--ink` background, `--on-ink` text, 600 weight, 48/52 px.
  - Secondary: `--surface` background, 1 px `--line-strong` border, `--ink` text.
  - Link-button: `--ink` text with an underline (offset 3 px).
  - Disabled (any kind): `--sunk` background, `--muted` text, no opacity trick, **plus a reason line** under the button where the reason isn't obvious.
  - Hover: secondary border goes to `--ink`; primary goes to `color-mix(--ink 88%, --surface)`.
  - Pressed: `translateY(1px)`.
  - Focus: 3 px `--focus` outline at 2 px offset.
- **Segmented control `.seg`** (exclusive choices only: Today/Tomorrow, Provisional/Final, language, Decisions filters, camera presets, 2D|3D). The track is `--sunk`, radius 999, padding 3. Items are 36 px admin / 44 px school. The selected thumb is `--surface` with `0 1px 2px rgb(0 0 0 / .12)` (dark: `--raised` plus a 1 px `--line` border), **never ink**. `role="group"` with `aria-pressed` on buttons, as now. Filters show counts ("Awaiting SDO 1"), and zero counts are in `--muted` but still clickable.
- **Toggle chips `.tchip`** (multi-select: mark-as-sent). Three separate 44 px chips with a gap of 8. Off: secondary style. On: `--ok` 1.5 px border, `--ok` text, "✓ FB page · 16:32", `aria-pressed="true"`.
- **Tabs.** Text tabs at 14 px 600. The current one has a 3 px `--ink` underline. 44 px tall. The Decisions tab shows the awaiting count badge (`--warn` text in a 1 px `--warn` ring, mono 12).
- **Heat ruler `.ruler`.**
  - `role="img"` with a single `aria-label` ("PAGASA heat index 38°C, HINGA 33–41°C; city automatic suspension at 42°C"). Children are `aria-hidden`.
  - Four segments as flex 7/6/9/8 (20–50 °C): 10 px tall, 2 px gaps, radius 2. Inactive segments at 35 % opacity, the active one at 100 %.
  - **Level names printed under each segment** (mono 12 caps) on desktop. On phones (< 500 px) only the boundary numbers 27 / 33 / 42 are printed.
  - Marker: a 2 px `--ink` line, 22 px tall, with a bubble "38°C" (mono 13 700, `--ink` background, `--on-ink` text). Its position is `left: clamp(0%, (t−20)/30·100%, 100%)`, and the bubble always prints the real value (e.g. "53°C" at the clamped right edge).
  - City-EO tick: a 1 px `--ink-2` tick *below* the band, with a label "city 42" on desktop only (it can coincide with the HINTO boundary, so the label sits below the boundary number, offset 14 px).
  - Draft ≠ published (admin): the published marker is solid and the draft marker is hollow with a dashed 2 px line and a bubble "44°C draft".
  - Motion: `transition: left 400ms`.
- **Stacked decision bar.** A `--sunk` track 12 px tall, radius 999. Segments go official (`--ok`) → awaiting (`--warn`) → returned + re-confirm (`--bad`) → none (`--line-strong`). Each non-zero segment is at least 4 px wide. Under it is a **count row** that prints every status as dot + count + word, with zeros in `--muted`. Each item links to `#admin-decisions-<filter>`.
- **Stat.** A number in `--t-kpi` (or 28 px) with a 14 px label under it, no tile background. Zeros are in `--muted`.
- **Plan bar row.** Symbol 18, label 14, mono count, and a bar (height 6, plan colour, width ∝ count). Present types only.
- **Legend overlay `.legend-map`.** Bottom-left inside the scene: `color-mix(--surface 92%)` with `backdrop-filter: blur(6px)`, radius 4, padding 8×10. All six types in `PLAN_ORDER`, as symbol 18 + label 14 + mono count. Absent types at `opacity .4`. Each item is a button: tap or hover isolates those schools in 3D (stretch, §12). Below 700 px, or in 2D on phones, the legend renders as a normal block under the map.
- **Card with level tint `.hero`.** `background: color-mix(in srgb, var(--lvl) 12%, var(--surface))` (dark: 18 %), `border-left: 6px solid var(--lvl)`. While unrecorded, `.hero.unrec::after` adds a hatch overlay: `repeating-linear-gradient(-45deg, transparent 0 10px, color-mix(in srgb, var(--ink) 7%, transparent) 10px 12px)`, with `pointer-events: none`. On Record, the hatch overlay fades out (opacity 1 → 0, 300 ms).
- **Message box.** Background `--raised`, 16 px body, padding 14.
  - Official: a 4 px `--ok` left rule.
  - Draft: a 2 px dashed `--line-strong` border, the hatch background, and the top label "DRAFT · NOT FOR SENDING" in mono caps 12 `--muted` (plan §6 watermark). Copy is disabled with the reason "Copy unlocks when the decision is official."
  - Correction: a 4 px `--bad` left rule.
- **`<details>`.** The summary is 44 px, 600 weight, with a `▸` chevron that rotates 90° when open (150 ms). The chevron is in a `::before` (keep `display:flex`, and add `list-style:none` plus the pseudo).
- **Banners.**
  - Info: `--sunk`.
  - Error: `color-mix(--bad 12%, --surface)` with a 4 px `--bad` left rule.
  - **Replay:** inverse ink (`--ink` background, `--on-ink` text), 56 px, with a 28 px louver block on the left (`repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 6px)`) and "REPLAY · 01 APR 2024 · not tomorrow's plan" in mono caps 13 700. Exit is a secondary button (white background, ink text; dark mode inverted).
  - **Preview:** a 2 px dashed `--ink` border on the strip, the tag "PREVIEW · ONLY YOU" in mono caps, and the plan §3 sentence "Preview, not published. Schools still see 38°C."
- **Toast / status region.** A single `<div id="sr-status" role="status" aria-live="polite">`, fixed bottom-left (bottom-centre on phones), inverse ink, radius 4, 3 s. It receives every confirmation and flash. `aria-live` is **removed from `<main>`**.
- **Countdown chip.** Mono 13 700, radius 4, padding 4×8. Normal: `--sunk` background, `--ink` text. Under 30 min: inverse ink. Late: `--bad` background, white (L) / `#0A0F0D` (D) text, reading "Past 17:00".
- **Theme toggle.** A 44 px button with the text glyphs "☀" / "☾" and an `aria-label`. It sets `data-theme` and persists in `localStorage` (try/catch). Toggling remounts the 3D scene so materials re-read the tokens.

---

## 5. Header (all screens)

- **Desktop (≥ 700 px), one 56 px sticky row:**
  - wordmark: three 3×14 px ink bars + "Presko" in display 800 20;
  - context in `--ink-2` 14 ("SDO Iloilo City" in admin; the school name in school mode);
  - `DEMO` tag (mono 11 caps, 1 px `--line-strong` ring);
  - tabs (underline style), ending with **Role ▾** (a select styled as a tab);
  - spacer;
  - **page-aware header chip** (§0 #3), e.g. `SUN 22 · 38°C FINAL 13:54 · 3h 05m`, or with no forecast published `SUN 22 · no forecast yet · 3h 05m`;
  - **⇄ SDO / ⇄ Pandac head** (secondary, 44 px);
  - theme toggle.
- **Phone (< 700 px), 96 px sticky:**
  - Row 1 (52 px): wordmark · header chip in compact form (`38°C · 3h 05m`, or countdown only / forecast only per page; the full text goes in `aria-label`) · ⇄ button. The person's name and school leave the header on phones; the page hero shows the school.
  - Row 2 (44 px): tabs in one horizontally scrolling row (`flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none`), ending with Role ▾ and the theme toggle. No wrapping.
- The **"Demo"** tab becomes the `DEMO` tag, which is a link to `#demo`.
- Header-chip contents by page:

| Page | Forecast in chip | Countdown in chip |
|---|---|---|
| Division | no (strip) | no (strip, top right) |
| Decisions, Replay, Rules, Data | yes | yes |
| School Today | no (plan band) | yes |
| Morning check | yes | no (plan §3) |
| Setup | yes | yes |
| Start | no | no |

---

## 6. Admin · Division (`#admin`)

### 6.1 Forecast strip (full-width card, top)

The desktop grid is `grid-template-columns: minmax(220px, auto) minmax(0, 1fr) minmax(280px, 340px)`, with these zones:

- **Zone A, the fact:**
  - Today/Tomorrow `.seg`;
  - eyebrow "PAGASA HEAT INDEX · SUN 22 NOV";
  - `38°C` in `--t-hero`;
  - under it, mono caps "FINAL · 13:54" (or "Not published yet. Schools see 'Waiting for the SDO's forecast'").
- **Zone B, the meaning:**
  - the heat ruler;
  - under it, `.lvl.xl HINGA 33–41°C` and the "allows" sentence (16 px);
  - the city banner (`vm.city.text`) as an info banner when present.
- **Zone C, the action and deadline:**
  - top right: the countdown chip (this is the head of the status column, per plan rail item 1);
  - then the editor: input "New forecast for Sun 22 (°C)" (mono 18, 120 px wide, pre-filled, validated 20–60), Provisional/Final `.seg`, and the "Preview the draft (only you)" switch row when the draft differs;
  - then **one of**:
    - primary **"Publish 44°C (final) to schools"** when the draft or status differs from published;
    - the done line "✓ Published 38°C final · 13:54" (`--ok` text, no button) when unchanged.
  - The confirm-publish banner opens inline here, with "Publish anyway" (primary) and Cancel (secondary).
  - Non-coordinator roles see "Only the DRRM coordinator publishes the forecast." instead of the editor.
- **Legal row** (the strip's bottom, a full-width divider row, one line on desktop): "Iloilo City EO 24 s. 2025, automatic suspension at [42°C (reported) ▾]" · "EO 130 s. 2026: implementing guidelines pending; heat trigger not confirmed." On phones this becomes `<details>` "Legal context", **open automatically when `vm.city` is set**.

### 6.2 Body (≥ 1100 px): `grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr)`

- **Left, the map:**
  - `.scene`, height `clamp(440px, 62vh, 700px)`;
  - tools at top right: camera `.seg` Overview/North/South (3D only) and a 2D/3D toggle;
  - the legend overlay at bottom left;
  - the N arrow + 1 km scale at bottom right (mono 11);
  - an empty-selection hint *inside* the map at top left: "Tap a school for its plan".
  - The **school drawer** is a card under the map:
    - a level-tint `.hero` header with the name (h2), "Open school view →" link, level tag, plan label and status;
    - then the why line, the F2F request line, and the building notes `<details>`.
- **Right, the status rail** (plan rail order 2–5; item 1, the countdown, heads it from the strip):
  1. Eyebrow "DECISIONS · SUN 22 NOV", the stacked bar, the count row. Overrides go as "· 1 override" at the end of the count row.
  2. One line: "8:00 readings: 0 schools · Rule conflicts 0" (conflicts as an `.st` dot + text, red when > 0).
  3. Eyebrow "PLANS": plan bar rows (present types only).
  4. The level KPI as a stat: Hinga gives "**22** schools · **213** of 850 sections" plus one line "could return face-to-face in cooler rooms on shortened hours" (+ ", subject to the city EO" when automatic). Hayo/Hinay: learner-hours % + hot rooms. Hinto: "No classes anywhere" only when `tally.stop === schools`.
  5. **Chase missing:** the button "Copy reminder to 65 schools" (secondary before 16:45, **primary from 16:45**), plus `<details>` "Show the 65 names" (chevron) with the list and the reminder preview.
- **Primary sequence on Division:** before publish (or when the draft differs) → Publish. After publish and before 16:45 → no ink button on the page. From 16:45 → Copy reminder.
- **1100 px and below:** a single column, strip → rail → map → drawer. On phones the strip order is: date seg → eyebrow → 38°C + status → **editor + Publish** → ruler → level + allows → Legal details. The map is 2D by default.

### 6.3 Preview state

The strip gets the dashed border, the PREVIEW tag and the sentence. The ruler shows both markers. The map frame gets a 2 px dashed `--ink` outline, and 3D columns re-tint at 60 % opacity until published. The rail shows preview numbers (as now), and Chase is hidden (as now).

---

## 7. Admin · Decisions (`#admin-decisions…`)

- **Title row:** the eyebrow "SUN 22 NOV" (mono caps) above h1 "Decisions". At right, the Today/Tomorrow `.seg`.
- **Filter row:** a `.seg` with counts (Awaiting SDO · Returned · Re-confirm · No decision · Official · All), then "↓ Download log (CSV)" as a **secondary** button at the end of the row.
- **Non-SDO banner** (as now) is an info banner.
- **Table (≥ 700 px):** sticky header, row height 52.
  - Columns: School · Rule now (tag) · **Rule when decided** (tag) · Chosen (tag) · Reason (16 px quoted, with "SDO: note" in italics) · By · time (mono) · Status (`.st`) · Actions.
  - Less-protective rows get a 3 px `--bad` left rule and the "less protective" tag (`--bad` ring).
  - Actions:
    - Approve is **primary** (the only ink in the row).
    - The note input sits next to it.
    - Return is secondary, **disabled until the note has text**, with the helper "Add a note to return".
    - Stale rows show "Needs the head to re-confirm" in `--muted`.
- **Cards (< 700 px):**
  - first line: the school name (600);
  - then `Rule says [HINGA] → School asks [HINAY]` with the less-protective tag;
  - then the reason quote at 16 px;
  - then the status line;
  - then the actions as full-width rows.
- **On approve:** a toast in `#sr-status`: "Approved Jibao-an ES · HINAY is official".
- **Empty state:** a card at `min-height: 40vh`, left-aligned:
  - a 32 px `--ok` ring with "✓";
  - h2 "Nothing is waiting for you for Sun 22 Nov.";
  - "3 official · 65 no decision yet";
  - the buttons "Show all 69" (secondary) and "See schools with no decision →" (link).
  - No forecast: "No forecast for this day yet."

---

## 8. School · Today (`#school-<slug>`), phone first

Single column on phones. At ≥ 900 px: a left column of 520 px with cards 1–3, and the right column holding the buildings card sticky at `top: 72px`.

0. **Today card** (only under the plan §6 conditions):
   - `.hero` in today's level colour, eyebrow "TODAY · SAT 21 NOV";
   - an error banner using the fixed status string;
   - for the head, one primary "Re-confirm HINGA";
   - then the morning parent update (the same message block and chips as card 2).
   - While it shows, it owns the page's primary; the tomorrow card's Record becomes secondary until today is resolved.
1. **Card 1, "Plan for tomorrow":**
   - **The band** (`.hero`, with `.unrec` hatch while there's no decision for tomorrow):
     - eyebrow "PLAN FOR TOMORROW · SUN 22 NOV";
     - the school name (h2, 20) on phones as well (it left the header);
     - `.lvl.xl HINGA 33–41°C`;
     - the plan label;
     - mono caps "PAGASA HEAT INDEX 38°C · FINAL · 13:54";
     - the heat ruler;
     - no forecast published: band in `--sunk` with "Waiting for the SDO's forecast for Sun 22." (no level exists yet, so grey is correct here).
   - **Step 1 row** (below the band, on the surface). Header: mono caps "1 · DECISION" and, at right, the state ("✓ Official 13:55" / "decide by 17:00"). Then by status:
     - **No decision:** status line → primary **"Record HINGA (recommended)"** → link "Choose a different level" → the line "No water tomorrow? **Set it first →**" (§0 #12).
     - **Awaiting SDO:** status line (`--warn`) + "Waiting for the SDO. From 16:45 you can send the rule-level message instead." From 16:45 the primary becomes "Send rule-level message now" with its explainer line.
     - **Returned:** an error banner with the SDO note → primary "Revise decision".
     - **Re-confirm:** status line (`--bad`) → primary "Re-confirm HINGA".
     - **Official:** one line `✓ Official · HINGA · Ma. Santos 13:55` (`--ok`), with no button.
     - "Choose a different level" expands an inline `--sunk` well with the level select, the required reason textarea, and primary "Record decision" (the only ink while the well is open).
     - A proposed (awaiting) override shows the plan's "isn't in force until the SDO approves…" note.
2. **Card 2, "Message to parents":**
   - Header: mono caps "2 · MESSAGE TO PARENTS", with the state "✓ Copied" after a copy.
   - The language `.seg` (EN / FIL / HIL), full width, 44 px.
   - The message box (official / draft as in §4).
   - **Copy message**: full width; **primary once the decision is official and before the first copy**. After a copy it turns secondary, reading "Copied ✓" for 1.5 s and then "Copy again". While draft, it's disabled with the reason.
   - The divider and mono caps header "3 · MARK WHERE YOU POSTED IT", then three **toggle chips**: FB page / Group chat / Radio. They get a 600 ms soft highlight (`--sunk` pulse) right after a copy.
   - "Fixed template; have a native speaker check the wording." in 14 `--muted`.
   - **Correction** (plan §6): a sub-block under the chips with a `--bad` rule. Before re-confirm: a banner with "Parents were told X. A correction is ready after you re-confirm." When ready: the h3 "Correction" and a message block whose Copy is primary.
   - **Primary sequence for the head:** Record → Copy → none (the chips are toggles, not ink).
3. **Card 3, Details** (`<details>`: closed on phones, open at ≥ 900 px, **forced open when conflicts > 0**). Summary: "Details · why, rooms, water, sections". Inside:
   - the why line;
   - flags as "⚑ text" (⚑ U+2691 in the mono font, which has the glyph; the fallback is "!");
   - the `.st` "Rule conflicts 0";
   - "Rooms to check first at 8:00: Building A, Building C (12 hot rooms)";
   - **the No water tomorrow switch row** (`id="water"`, "No water supply tomorrow · forces at least HINGA", with confirm);
   - the section plan / draft F2F request (nested `<details>`).
4. **Card 4, "Your buildings":**
   - header h2 + a 2D|3D `.seg` (3D is opt-in on phones);
   - the inline legend: cooler / typical / hot / emptied (8:00) as 14 px swatches;
   - the floor plan or 3D, sized to content (no empty bottom space);
   - divider, the eyebrow "CLASS HOURS TOMORROW", then the sun arc (lit slots in `--ink` light / `#FFFFFF` dark; Hinay 10–14 shaded at `--HINAY` 18 % because that *is* a heat meaning; viewBox padded `-18 … W+36`; max-width 420).
   - No lit slots: "No class hours at school tomorrow (home-based)." instead of the axis.

---

## 9. Other screens

- **Morning check (`#school-<slug>-morning`):**
  - **Hero card:** eyebrow "MORNING CHECK · SAT 21 NOV", today's level tag, "Check these first: Building A, Building C".
  - **One row per building:**
    - name (600) + flag tag on the left;
    - on the right, an input `inputmode="decimal"`, mono 18, **96 px wide, 48 px tall**, labelled "indoor heat index at 8:00 (°C)";
    - under the input: the result tag ("→ HINGA" / "not read") and **"Saved ✓ 08:04"** (`--ok`, 14) after a successful write;
    - an out-of-range value shows "Enter 20 to 55 °C, or leave empty" in `--bad` under the field, with `aria-describedby` and `aria-invalid`.
  - A sticky bottom **Done** button (secondary, full width) blurs the active field to commit.
  - "Whichever is worse (assumption)" in 14 `--ink-2` beside the result.
  - **Outcome card** at the end: `.hero` tinted when the level is raised. Head: Re-confirm via the Today card link. Teacher: primary **"Copy note for the head"** + "Tell your school head to open Presko". Room-move notice for staff when buildings were emptied but the level is unchanged.
- **Setup (`#school-<slug>-setup`):**
  - Each building is a card-styled `<details>` (the first one open) with summary "Building A · 7 rooms · cooler (−3)" and the provenance tag at right.
  - Inside: name, rooms, storeys, the note textarea (rows 3, auto-height), and "Re-read note" (secondary) aligned right of the label.
  - Feature tags are square and 14 px: "+2 metal roof, no ceiling" with a 3 px `--home` left rule, "−1 shade trees" with a `--full` left rule, and the source tag (claude / keywords / cached).
  - Timetable as a grid `auto 1fr auto 1fr`: "Shift 1 [06:00] to [12:00]" on one line.
  - Sections table.
- **Replay (`#admin-replay`):**
  - The ink banner (§4).
  - Then a **two-number hero** card: "What happened: **66 of 66** schools closed face-to-face" | "Presko today: **22** schools could keep **213** sections face-to-face", with the numbers in display 800 44 and computed live.
  - Then the heat line ("PAGASA forecast 41°C (news-reported) drives the replay. Computed 37.5°C, calibrated 41.2°C (+3.7 ±2), shown for comparison only.") + the level tag (`justify-self:start`).
  - Then the body grid, the same as Division: map (archive ground: `--sunk` with grid lines at 40 %) + rail ("Rule conflicts 0", plan bars).
  - The caveat paragraph (plan §8) as a 14 px `--ink-2` note under the hero, and the sources links.
  - `main` gets a 2 px dashed `--ink-2` outline inset while in replay.
  - The replay picker page: cards with h2, a summary and primary "Run replay".
- **Start (`#start`):**
  - h1 "Tomorrow's heat level for 69 schools, decided by 17:00.";
  - a "demo, no sign-in · illustrative buildings" line;
  - role cards in **timeline order**, each 64 px tall, left-aligned: mono time · role (600) · one verb phrase. The order is: 16:00 DRRM coordinator · publish the forecast → 16:30 School head · record and message → 16:45 SDO approver · approve → 08:00 Teacher · morning readings → Week 1 Custodian · buildings.
  - Secondary style, with the hover border in `--ink`.
- **Rules / Data:** tokens only. Tables use level tags and flag tags, the `real` / `news-reported` tags are rings in `--ok` / `--warn`, and h1 + 16 px intro.

---

## 10. 3D treatment (three.js r128)

Ordered by value; build top-down (§12).

1. **Renderer, light and material:**
   - `renderer.shadowMap.enabled = true; shadowMap.type = THREE.PCFSoftShadowMap`.
   - `HemisphereLight(0xffffff, css('--ground'), 0.65)`.
   - `DirectionalLight(0xFFE9C7, 0.85)` at `(-6, 16, 9)`, `castShadow`, `shadow.mapSize 1024²`, with an orthographic shadow camera fitted to the slab bounds ±1.
   - All marks use `MeshStandardMaterial({ color, roughness: .8, metalness: 0, flatShading: true })`, `castShadow = true`.
   - Edges: `new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: css('--ink'), transparent: true, opacity: light ? .22 : .5 }))` added as a child.
2. **Ghost requests:** `MeshBasicMaterial({ color: --request, transparent: true, opacity: .10, depthWrite: false })` with EdgesGeometry lines in `--request` at opacity .7, radius .22. No shadow.
3. **Camera fit:**
   - FOV 30.
   - `r = (boundingRadius(slab) / sin(fov/2)) * 1.08`.
   - Default `phi .9`, `theta π/4`.
   - Zoom clamped to 0.6–1.6 × r.
   - The slab corners never cut the frame.
4. **Slab and grid:**
   - `BoxGeometry(W+1.5, .25, H+1.5)` with a material array: top `--ground`, sides `--ground-side`. `receiveShadow`, top at y = 0.
   - `GridHelper(size, divisions)` with spacing = 1 km in scene units (`12 / W_px * P.kmPx`), colours `--line`, opacity .6, at y = .002.
   - The N arrow and 1 km scale are HTML overlays.
5. **Marks** (match the plan §5 legend):
   - *full:* `CylinderGeometry(.2, .2, 1, 12)`;
   - *split / splitPartial:* the same, with an open wedge (`thetaStart .5, thetaLength 2π−1.0`) and `side: DoubleSide`; splitPartial at half height (stretch: until then keep today's 6-segment proxy);
   - *home:* puck `CylinderGeometry(.26, .26, .08, 24)` plus a darker inset top `CylinderGeometry(.16, .16, .085, 24)` (colour ×0.6);
   - *request:* puck + ghost;
   - *stop:* puck + two crossed `BoxGeometry(.36, .03, .06)` in `--on-ink` on top (stretch).
   - Waiting: all pucks in `--line-strong`, no shadows.
   - Drop the torus rings.
6. **Pinned label:** on hover or tap, project the column top to screen and show an HTML `.tip` above it (offset 12 px) with the name (14 600), level tag and plan label, on `--raised` with `0 8px 24px rgb(0 0 0/.18)`. The selected school gets a flat ink ring (`RingGeometry(.34, .40, 32)` at y .003), a persistent label, and others dimmed to 60 %.
7. **Preset tween:** tween theta, phi and r over 600 ms (ease-out cubic) instead of jumping.
8. **Legend isolation:** tapping or hovering a legend item sets non-matching marks to opacity .2 (`transparent: true`); tap again or leave to clear.
9. **Publish wave:** on a forecast change, the target heights tween 400 ms each with a delay of `rank(lon) × 12 ms`, capped so the whole wave lasts ≤ 1 s. Panels update immediately.
10. **School scene:**
    - the same light, shadows and slab (14 × 6);
    - cells keep their flag colours with edges;
    - roof: *bare GI* `#CDD2D5` with `metalness .4, roughness .5`; *slab* thick matte `--ink-2`; *plain* thin matte `--line-strong`;
    - emptied buildings at .35 opacity with no shadow;
    - building name + flag as HTML labels under each building;
    - sun arc: a dashed thin arc in `--line-strong`, lit segments in `--ink` (L) / `#FFFFFF` (D), and an amber emissive sphere (`--HINAY`) at the current hour.

Theme change → dispose and remount the scene. Reduced motion → no tweens or wave, and presets jump.

---

## 11. Motion

All at 400 ms `cubic-bezier(.2, .8, .2, 1)` unless noted. Everything is disabled under `prefers-reduced-motion` (keep the existing global rule).

| Trigger | Motion |
|---|---|
| Draft value changes | Ruler marker slides (`left`, 400 ms); draft marker goes hollow and dashed |
| Publish | Level tag cross-fade (200 ms), columns rise in a wave (≤ 1 s total), toast "Published 38°C final to 69 schools · 13:54" |
| Record / Re-confirm | Band hatch fades out (300 ms); the status line slides up 4 px with a fade (200 ms) |
| Copy | Button label "Copied ✓" for 1.5 s; the toggle-chip row pulses `--sunk` once (600 ms) |
| Toggle chip on | Border and text to `--ok`, check appears (150 ms) |
| Segmented change | Thumb slides (`transform`, 200 ms) |
| Details | Chevron rotates (150 ms); no height animation |
| Camera preset | Tween 600 ms |
| Countdown under 30 min | Swaps to inverse ink (no pulse) |

No auto-rotation and no looping animation anywhere.

---

## 12. Build order and cut line (≈ 1 h 55 min above the line)

| # | Step | Files | Est. |
|---|---|---|---|
| 1 | Tokens (light/dark/explicit), fonts link, type scale, buttons/disabled, `.seg`, `.tchip`, `.st` dots, `.lvl` dark-text chips, `details` chevrons, banners incl. **ink replay banner**, `#sr-status` toast (remove `aria-live` from main), checkbox/switch rows | index.html, ui.js (`statusHTML`, `flashHTML`, `lvlChip`) | 25 |
| 2 | Header: 56 / 96 px, page-aware chip, ⇄ button, Role ▾ in tabs, DEMO tag link, theme toggle, Decisions badge | ui.js `renderHeader`, CSS | 15 |
| 3 | Heat ruler component + `.hero` tint + `.unrec` hatch | ui.js helper, CSS | 10 |
| 4 | School Today: band, step 1 states (one line Official), card 2 with Copy-as-primary sequence and toggle chips, draft label, Details (closed on phone, forced open), water pointer link, class-hours empty text + viewBox pad, 2D sized to content | ui.js `schoolToday`, `decisionButtons`, `messageBlock`; scenes.js `sunArc`, `renderSchool2D` | 25 |
| 5 | Division: strip (zones A/B/C + legal row), named Publish / done line, two-column body, stacked bar + count row, plan bars, KPI stat, chase sequence, legend overlay with counts (`legendHTML(types, counts)`), drawer header | ui.js `adminDivision`, `drawer`; scenes.js | 25 |
| 6 | 3D core: §10 items 1–4 (light/material/shadows/edges, ghost scaffolds, camera fit, slab + grid), pucks instead of disc + torus | scene3d.js | 15 |
| 7 | Decisions: filter counts, empty state, Return disabled until note, "Rule when decided", tags in cells, approve toast | ui.js `adminDecisions` | 5 |
| 8 | Morning check: "Saved ✓ hh:mm" per field, inline range error, 96 px inputs | ui.js `schoolMorning` | 5 |
| **—** | **CUT LINE.** If step 6 isn't done by here: make `prefers3D()` return false (2D default everywhere, 3D via the button) | | |
| 9 | Replay two-number hero + archive ground + dashed main outline | ui.js `adminReplay` | 10 |
| 10 | Start page timeline cards | ui.js | 5 |
| 11 | 3D pinned label + selection ring + dim | scene3d.js, ui.js | 10 |
| 12 | Setup building `<details>` cards, timetable grid, auto-height textareas | ui.js | 10 |
| 13 | Preset tween, publish wave, legend isolation | scene3d.js | 15 |
| 14 | Notch wedge + stop X geometry, school 3D labels + sun sphere + roof materials | scene3d.js | 15 |

Acceptance for the visual pass:
- the existing tests stay green;
- at 375 px the header is ≤ 96 px and nothing scrolls horizontally;
- Division at 1280×800 shows 38°C, the ruler, the HINGA tag, Publish/done, the countdown and the decision bar without scrolling;
- school Today at 375×812 shows the level band and the current primary button in the first viewport;
- there is exactly one ink-filled button per view state;
- both themes pass §3;
- reduced motion disables all tweens.

---

## 13. Plan amendments to log in WEBAPP-PLAN.md (after approval)

- **A1 (§3 headers):** the header shows forecast + countdown on every page except where the page's hero shows the same fact in the first viewport: Division (both in the strip), school Today (forecast in the plan band; the countdown stays in the header). Morning check keeps the forecast only, as before.
- **A2 (§5 type):** body font is Atkinson Hyperlegible Next (fallback Inter). Display and mono are unchanged.
- **A3 (§6 Division layout):** the left rail becomes a full-width forecast strip, and the body has two columns (map + status rail). The countdown sits at the strip's top right, heading the status column. All rail items and their order are kept. The plan-type counts render as rail bars (present types) plus the on-map legend with counts (all six, absent ones dimmed).
- **A4 (§6 status bar):** the six status tiles become a stacked bar plus a count row that prints every status, including zeros.
- **No change needed:**
  - No-water stays in Details (with a pointer link added in step 1);
  - the role picker stays on `#start` (also added in the tab strip);
  - Copy stays disabled for drafts with the DRAFT label;
  - mark-as-sent chips still store the level;
  - the replay banner and isolation are kept (colour changed only);
  - 3D stays opt-in under 700 px.

---

## 14. Usability sign-off

**Approved** (usability specialist, round 3). All six of my round-2 points are in, applied as agreed. The spec meets my bar:
- **AA:** §3 ratios check out (I re-derived HINGA, HAYO and request). There's a non-text edge for amber/orange, status is shown as dot + words, and there's a single live region.
- **Phones in sun:** 16 px body, 44 px school targets, a 96 px header, and the level band plus the current primary button in the first viewport.
- **Task clarity:** one ink button per moment, with the sequence given per screen.
- **Plan requirements:** kept, with deviations logged as A1–A4.
- **Demo:** the strip, ruler and step cards read without voice-over.

None of the following change the design direction, so they don't block approval. They are **binding build notes**, and where they conflict with the sections above, they win:

1. **Errors don't vanish.** `#sr-status` toasts (3 s) are for confirmations only. Refused actions and validation errors (the old `flashHTML`) stay as a persistent error banner with `role="alert"` until the next successful action or a dismiss. Plan §2 says a refused action "shows a clear error", and a 3 s toast in the sun doesn't do that.
2. **Past 17:00 on the tomorrow card** (plan §3). After 17:00, the step-1 state reads "Past 17:00 · late" in `--bad`, not "decide by 17:00".
3. **Mark-as-sent chips render only when the status is Official** (plan §2 `markSent`). While the message is a draft, step 3 shows "Available once official" in `--muted`.
4. **One-ink rule exception.** On Decisions, each awaiting row has its own ink Approve. The acceptance check "exactly one ink button per view state" excludes per-row actions in that table.
5. **Glyph fallback.** Don't depend on JetBrains Mono for ⚑ (U+2691). Render flags with a CSS/SVG mark, or with the "!" fallback by default.
6. **DEMO tag** carries `aria-label="Demo, no sign-in"` and the tooltip text, so the plan §2 label survives the shortening.
7. **Budget honesty.** The steps above the cut line add up to **≈ 125 min**, not 115, against a 90-minute target. Two checkpoints apply:
   - at **60 min**, steps 1–4 must be done;
   - at **90 min**, if step 6 (3D core) isn't done, apply the `prefers3D()` → false fallback and go to steps 7–8.

   Steps 7–8 (10 min) are cheaper than step 6 and protect the SDO and teacher paths in the demo, so they're kept ahead of step 6 if time is short.
