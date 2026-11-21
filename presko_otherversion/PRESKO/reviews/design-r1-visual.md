# Presko visual design, round 1: visual designer's proposal

Scope: look and feel only. Every function in WEBAPP-PLAN.md §5–§6 stays (controls, statuses, legend shapes, 2D fallbacks, the phone-first rules, three.js r128, light and dark). Where I move a control, I name where it goes. Budget is about 1.5 h of CSS and JS changes. No framework swap.

---

## 1. Why it reads as ugly and bland (from the screenshots and code)

1. **There is no hero.** The day's key fact (38 °C → HINGA → 47 schools home-based, 22 with grounds for F2F) is spread across three equal columns at 13–15 px. The HINGA chip is 14 px and sits mid-way down the left rail. Nothing on the screen is bigger than 24 px apart from the wordmark (20 px). Every block has the same weight, so the eye has nowhere to land.
2. **Everything is the same dark teal-grey.** bg `#0e1513`, surface `#16201e` and sunk `#1e2a27` are within about 4 % luminance of each other, and each is outlined by a 1 px `#2b3a36` line. The result is muddy layers, cards that look like holes, and stat tiles that disappear. The teal accent (`#4fb3a7`) is the generic "dashboard teal", and it competes with the heat colours (it sits between Hayo green and Request blue).
3. **Every control looks the same.** Tabs, Today/Tomorrow, camera presets, language, filters, Copy and mark-as-sent are all the same 10 px-radius outlined pill. Selection is only a 2 px inset teal ring. You can't tell navigation from filtering from action. The primary "Publish" button is a dull desaturated teal block that reads as disabled even when it's enabled (1-admin vs 6-preview).
4. **The header is a junk drawer.** Wordmark, person, role, demo tag, forecast sentence, countdown, Switch button, role select and six tabs all sit at the same weight and wrap into two rows on desktop. On the 375 px phone the sticky header wraps to about **225 px, 37 % of the screen** (1-admin-375, 2-head-375). The countdown appears twice on admin (header and right rail) and twice in school mode (header and card).
5. **The 3D scene looks like scattered bottle caps.** Lambert material, two lights, no shadows, no edges. The ground is the same colour as the cards, and its corners cut diagonally through the frame (the camera is too close, so the slab edges show at the bottom-left and right). The home/request schools are a disc plus a torus, which reads as buttons or coins. The ghost "request" columns are tall pale translucent towers, so the most dominant objects in the scene are the *hypothetical* ones. There are no labels and no sense of place (no grid, scale or north). In the Hinto preview, 69 identical purple coins are visually noise.
6. **The legend is tiny and muted** (12.5 px, `--muted`), under the scene, far from the tallies it explains. The right rail repeats the same symbols at a different size.
7. **There is dead space.** At 1280×1400 the admin content ends at about 880 px, with a 500 px empty void below. Decisions with no rows shows "Nothing here." at 16 px on a fully empty black page (3-sdo). The scene is a fixed 520 px whatever the viewport.
8. **The school card is one long undifferentiated list.** Level chip, status ("Official" and "Official: HINGA, by…" said twice), language pills, message, Copy, mark-as-sent, rule note, conflicts, an orphan checkbox, then "Section plan" are all in one card with the same 10 px gaps. The parent message, which is the head's actual job at 16:30, isn't visually the hero. "Show 3D" floats alone, and the sun-arc labels are clipped ("36" instead of "06" at 375 px).
9. **Replay borrows HINTO purple** for its full-width banner (`.banner.replay { background: var(--stop) }`). In a heat app, purple means "no classes anywhere", so the replay banner says the wrong thing in colour.
10. **Type is timid.** Bricolage is only used at 18–22 px. Body text is 15 px Inter with a lot of 12–13 px muted grey (eyebrows, stat labels, notes) that falls under comfortable reading contrast on dark. The numbers that matter (38 °C, 47, 22, 213) aren't set as numbers.

---

## 2. Concept: **"Sunbreaker"**

Iloilo's post-war public buildings and many DepEd schoolhouses are shaded by concrete **brise-soleil**: vertical louvers ("sunbreakers") that cut the sun into stripes. PAGASA's heat-index advisories are colour bands on a temperature scale. Presko ("fresh, cool") is literally the shade. So:

- **Colour means heat. Everything else is shade.** The UI chrome is neutral concrete (light) or night shade (dark), with ink-black actions. Saturated colour appears **only** for 4H levels and plan types. That alone makes the screen stop looking bland, because the heat colours finally pop instead of fighting a teal accent.
- **The heat ruler** is the signature element: a PAGASA-style horizontal band from 20 to 50 °C, split into Hayo, Hinay, Hinga and Hinto, with a marker at the forecast. It appears in the admin forecast strip and at the top of the school plan card. It is functional (it shows how close 38 °C is to the 42 °C Hinto and city-EO line) and it gives the product an identity.
- **The louver motif** is used sparingly: the wordmark is three vertical bars, the replay/preview frames use a vertical-stripe hatch, and the 3D ground carries a fine 1 km grid like a site plan.
- **The bulletin voice:** big numerals, square-cornered tags, mono caps for dates and times, like a posted advisory. No cream, serif, terracotta, purple gradient, emoji or everything-centred layout.

---

## 3. Tokens

### 3.1 Neutrals

| Token | Light ("concrete in sun") | Dark ("night shade") | Use |
|---|---|---|---|
| `--bg` | `#E9ECE8` | `#0A0F0D` | page |
| `--surface` | `#FFFFFF` | `#141C19` | cards |
| `--raised` | `#FFFFFF` | `#1C2622` | tiles, inputs, tooltip |
| `--sunk` | `#DEE3DD` | `#0F1513` | wells, scene backdrop, code-ish blocks |
| `--ink` | `#121C18` | `#ECF1EE` | text, primary buttons |
| `--ink-2` | `#3C4944` | `#BFCBC5` | secondary text (replaces most `--muted` uses) |
| `--muted` | `#5A6762` (5.9:1 on white) | `#8FA19A` (6.8:1 on surface) | eyebrows, captions only |
| `--line` | `#CBD2CC` | `#26312D` | dividers |
| `--line-strong` | `#9AA59F` | `#3A4842` | input borders, focus-adjacent |
| `--on-ink` | `#FFFFFF` | `#0A0F0D` | text on primary buttons |
| `--focus` | `#121C18` | `#FFFFFF` | 3 px focus ring, 2 px offset |

The surface/bg delta is now about 10 % luminance in dark (it was 4 %), so cards read as raised. Light mode cards get no border, just `box-shadow: 0 1px 0 var(--line), 0 1px 3px rgb(18 28 24 / .06)`. Dark mode keeps a 1 px `--line` border and no shadow.

**Primary action = ink.** `button.primary { background: var(--ink); color: var(--on-ink) }`. The teal accent goes away entirely. Links are ink with a 1 px underline at `text-underline-offset: 3px`. Selected toggles are filled ink (inverse), not ringed.

### 3.2 Heat: 4H levels (chips carry the text colour shown; all checked to WCAG AA ≥ 4.5:1)

| Level | Light fill / text | Dark fill / text | Ruler range |
|---|---|---|---|
| HAYO < 27 | `#1E7F4F` / `#FFFFFF` (5.0:1) | `#3DBE7A` / `#04140B` (8.9:1) | 20–27 |
| HINAY 27–32 | `#E8A317` / `#1A1200` (9.6:1) | `#F2B630` / `#1A1200` (10.8:1) | 27–33 |
| HINGA 33–41 | `#D2401F` / `#FFFFFF` (4.7:1) | `#FF6A3D` / `#1A0600` (6.7:1) | 33–42 |
| HINTO ≥ 42 | `#6B3FA0` / `#FFFFFF` (7.1:1) | `#B48CF0` / `#14062A` (7.9:1) | 42–50 |

In dark mode all chips use dark text, which is consistent and easier to scan.

### 3.3 Plans (same hues; the legend shapes don't change)

| Plan | Light fill | Light edge (symbols, 3D outlines, ≥ 3:1 on white) | Dark fill | Chip text |
|---|---|---|---|---|
| `--full` Regular | `#1E7F4F` | `#1E7F4F` | `#3DBE7A` | white / dark |
| `--split` Shortened | `#E8A317` | `#8A5A00` | `#F2B630` | `#1A1200` |
| `--splitPartial` Short + home | `#E87722` | `#9C4A0B` | `#FF9A4D` | `#1A0A00` |
| `--home` Home-based | `#D2401F` | `#D2401F` | `#FF6A3D` | white / dark |
| `--request` Grounds for F2F | `#1F63B8` | `#1F63B8` | `#6AA8FF` | white / dark |
| `--stop` No classes | `#6B3FA0` | `#6B3FA0` | `#B48CF0` | white / dark |

Add `--split-edge` and `--splitPartial-edge` tokens. In light mode the SVG symbols for amber and orange get `stroke: var(--<type>-edge)` at 1.25 px so they pass 3:1 against white. Status colours: `--ok #1A7A47` / `#5FD39A`, `--bad #B3261E` / `#FF8A80`, `--warn #8A5A00` / `#F2C14E` (unchanged in role).

**Replay and preview are not heat**, so they use neutral ink treatments (§5.5) and never purple.

### 3.4 Type (Google Fonts)

- **Display:** Bricolage Grotesque 800, `opsz` 96, `letter-spacing: -0.02em`. Used big: forecast numeral, level name, KPI numbers, h1. This keeps §5.
- **Body:** **Atkinson Hyperlegible Next** 400/600. It was designed for low-vision legibility, it holds up on a cheap phone in bright sun, and it's less "AI-template" than Inter. *Fallback if the usability agent prefers to keep the plan's Inter: keep Inter. The scale below matters more than the family.*
- **Mono:** JetBrains Mono 500/700 for times, countdown, °C values, dates in caps, and the ruler ticks. Set `font-variant-numeric: tabular-nums`.

```
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
```

Scale (1.25 ratio, 16 px base; body goes **up** from 15 px):

| Token | px / line-height | Family | Use |
|---|---|---|---|
| `--t-hero` | 72/0.9 desktop, 56/0.9 phone | Bricolage 800 | forecast "38°" |
| `--t-level` | 40/1 desktop, 34/1 phone | Bricolage 800, caps, +0.01em | "HINGA" in strip and school band |
| `--t-kpi` | 40/1 | Bricolage 800 | 47 / 22 / 213 |
| `--t-h1` | 28/1.1 | Bricolage 800 | page titles |
| `--t-h2` | 20/1.2 | Bricolage 600 | card titles |
| `--t-body` | 16/1.5 | body 400 | text |
| `--t-small` | 14/1.45 | body 400 | notes |
| `--t-cap` | 12/1.2, +0.08em, caps | JetBrains Mono 500 | eyebrows, dates, "PAGASA FINAL · 13:54" |

Rule: no running text under 14 px. Eyebrows are the only 12 px text, and they're mono caps in `--muted`.

### 3.5 Space, radius, elevation, motion

- Spacing: 4-pt steps `4 8 12 16 24 32 48`. Card padding 20 (desktop), 16 (phone). Grid gap 16. Space between sections inside a card is 16, with a `--line` divider between groups, not more cards.
- Radius, crisper than now: `--r-sm 4px` (chips, tags, inputs, buttons), `--r-md 8px` (cards, scene), `--r-pill 999px` only for the segmented-control track. The 10–14 px rounded pills are what make it look like a generic template.
- Elevation: light uses shadow only; dark uses border only (as above). The tooltip uses `--raised` with `0 8px 24px rgb(0 0 0 / .18)`.
- Motion: 400 ms `cubic-bezier(.2,.8,.2,1)` (ease-out-quint-ish). Stagger 12 ms per item, capped at 400 ms total. All of it is off under `prefers-reduced-motion` (the existing rule stays).

---

## 4. Components

- **Level tag** `.lvl`: square-cornered (4 px), `padding 6px 10px`, Bricolage 800 15 px caps, range in mono 12 px after a thin divider (`border-left: 1px solid currentColor; opacity .7; padding-left 8px`). Large variant `.lvl.xl` for the strip and the school band.
- **Plan label** `.plan`: symbol at 18 px (was 14) plus a 600-weight label.
- **Segmented control** for Today/Tomorrow, language, the Decisions filters and Overview/North/South: one `--sunk` track with radius 999, items 36 px high, and the selected item filled `--surface` with shadow (light) or `--raised` (dark). This replaces separate outlined pills and makes "these are alternatives" visible. The filters carry counts: "Awaiting SDO 1".
- **Buttons:** primary = ink fill, 48 px high (52 on phone), 600 weight. Secondary = `--surface` with a 1 px `--line-strong` border. Tertiary/ghost = text with underline. Disabled = `--sunk` background with `--muted` text (no more 50 % opacity teal).
- **Nav tabs:** text tabs with a 3 px ink underline on the current one, no background fill.
- **Status line:** an 8 px dot in the status colour plus one sentence. It replaces the bold coloured text and the duplicate "Official" lines.
- **Stat tile:** no tile background. A big number (`--t-kpi` or 28 px) with a label under it, separated by `--line` dividers in a 3-column grid. Zero values render in `--muted`, so the eye goes to non-zero ones.
- **Heat ruler** (new, about 25 lines of CSS and a small function):

```html
<div class="ruler" style="--at: 60%" aria-label="Forecast 38°C, in HINGA (33–41°C)">
  <i class="HAYO" style="flex:7"></i><i class="HINAY" style="flex:6"></i><i class="HINGA" style="flex:9"></i><i class="HINTO" style="flex:8"></i>
  <b class="mark">38°</b>
  <span class="tick" style="left:73.3%">42 · city EO</span>
</div>
```

`--at` is `(t − 20) / 30`, clamped to 0–100 %. Segments are 10 px high with 2 px gaps and radius 2. Inactive segments are at 35 % opacity and the active one at 100 %. The marker is a 2 px ink line, 22 px tall, with a mono 13 px bubble above. `transition: left 400ms`. When the draft differs from the published value, show the published marker solid and the draft marker hollow and dashed. The city-EO threshold (from the select) is a tick below the band.

---

## 5. Layout per screen

### 5.1 Header (all screens)

- **Desktop, one 56 px row:** `[▮▮▮ Presko]` wordmark (three 3×14 px ink bars plus Bricolage 800 20 px) · context in `--ink-2` 14 px ("SDO Iloilo City" in admin, the school name in school mode) · nav tabs (underline style) · spacer · right cluster: the role `<select>` styled as a compact secondary button with a role icon-less label, "Switch to Pandac head" as a text link, the `demo` tag in mono caps, and a theme toggle (☀/☾ as text glyphs or a 2-state segmented control; `data-theme` already exists).
- **Admin:** the forecast sentence and countdown **leave the header**. They live in the forecast strip and right rail, which removes the duplication.
- **School mode:** the header keeps school + countdown (required by §6), with the countdown as a mono chip at the far right. The forecast moves into the plan card band, which still makes it visible above the fold.
- **Phone:** row 1 (52 px) has the wordmark, a truncated school/role, and the countdown chip. Row 2 (44 px) has the tabs as a horizontally scrollable strip (`overflow-x:auto; scrollbar-width:none`) with no wrapping. The role select and Switch move to the end of the tab strip as "Role ▾". Total sticky height is **96 px, down from about 225**.

### 5.2 Admin · Division (`#admin`)

Replace the three equal columns with **a full-width forecast strip on top of a two-column body**:

```
┌ FORECAST STRIP (card, full width) ─────────────────────────────────────────────┐
│ [Today|Tomorrow]  PAGASA HEAT INDEX · SUN 22 NOV                   3h 05m to 17:00│
│  38°C          ════ HAYO ══ HINAY ══ HINGA ═══▲═══ HINTO ══      [HINGA 33–41°C]   │
│  FINAL · 13:54          20     27     33     38    42 city EO     No face-to-face; │
│                                                                    light home-based│
│ ── Draft [38.0]°C  [Provisional|Final]  ☐ Preview   [ Publish to schools ]  ───── │
│ City EO 24 s.2025 auto at [42°C ▾]  · EO 130 s.2026: guidelines pending           │
└────────────────────────────────────────────────────────────────────────────────┘
┌ MAP (≈ 2fr) ─────────────────────────────┐ ┌ STATUS (≈ 1fr, min 300) ───────────┐
│ [Overview|North|South]        [2D view]  │ │ DECISIONS · SUN 22 NOV             │
│                                          │ │ ▇▇▇░░░░░░░░░░░░░░░░ stacked bar     │
│     3D diorama, height clamp(440,62vh,700)│ │ 3 official · 1 awaiting · 65 none… │
│                                          │ │ 0 returned  0 re-confirm  1 override│
│ legend (inline, on the map's bottom edge)│ │ 8:00 readings 0 · ✓ Rule conflicts 0│
└──────────────────────────────────────────┘ │ PLANS                               │
┌ SCHOOL DRAWER (under map when selected) ─┐ │ ◯ Home-based          47 ████████▌ │
│ band in level colour, name, plan, status │ │ ◉ Grounds for F2F     22 ████       │
└──────────────────────────────────────────┘ │ KPI: 22 schools · 213 / 850 sections│
                                             │ [ Chase missing (65) ]              │
                                             └─────────────────────────────────────┘
```

- The **strip** holds everything from the old left rail, in the same order of meaning: date chip, published value and time, draft, Provisional/Final, preview, Publish, level chip and allows, city threshold and banner, EO 130 line. The confirm-publish banner opens inline under the draft row. The 38° is `--t-hero` and the level is the `.lvl.xl` tag, so the first thing anyone sees is "38° → HINGA".
- The right rail keeps the §6 order: countdown (moved into the strip's top-right, which visually heads the right column; if the usability agent wants it literally in the rail, it is one line), decision status, plan counts, level KPI, chase missing.
  - **Decision status** becomes one stacked horizontal bar (official green, awaiting amber, returned/re-confirm red, none `--line`) with the counts as a text row under it. This is quick to read and still prints every number.
  - **Plan counts** become horizontal bars (symbol, label, mono count, bar width proportional to the count, in the plan colour). Hovering a row highlights those schools in 3D (§7).
  - **KPI** is a 40 px number with a single sentence (in Hinga: "**22** schools · **213** of 850 sections could return face-to-face, shortened hours, cooler rooms").
  - **Chase missing** is a secondary button that expands the list (the copy text is unchanged).
- **The legend moves onto the map** as an overlay pill row at the bottom-left of the scene (`--surface` at 92 %, backdrop-filter blur 6 px, 14 px text, 18 px symbols). It's still printed under the map when 2D is on, on phones.
- **No dead space:** the map takes `clamp(440px, 62vh, 700px)`. The body grid is `minmax(0,2fr) minmax(300px,1fr)`. Below 1100 px it stacks strip → map → status, and on phones it's strip → status → map (panels first, per §5).

### 5.3 Admin · Decisions

- Title row: "Decisions" h1 plus the date as a mono cap eyebrow above it, Today/Tomorrow as a segmented control, and Download CSV as a secondary button with "↓".
- Filters: a segmented control **with counts**. The empty state is a centred-left block inside a card, not a void: a large `--ok` check ring, "**Nothing awaiting sign-off.**", a summary line ("3 official · 65 with no decision yet"), and a text link "See schools with no decision →" that sets the filter. The card is `min-height: 40vh` so the page doesn't look broken.
- Table: level **tags** in the Rule now / Snapshot / Chosen cells (currently plain text). Less-protective rows get a 3 px `--bad` left border plus the tag. Row height is 52 px. Approve is primary ink and Return is secondary. Sticky header row.

### 5.4 School · Today (phone first: the head's 16:30 path)

Split the one long card into **three** stacked cards, so each step is its own block:

1. **Plan card with a level band.** The top 30 % of the card is filled with the level colour (the card's top radius only), holding:
   - mono cap "TOMORROW · SUN 22 NOV";
   - `HINGA` at `--t-level` with "33–41 °C" in mono;
   - the plan label with symbol;
   - "PAGASA 38 °C final · 13:54" (this is where the header forecast moved);
   - the heat ruler (on the band, with an ink marker on light text colours).

   Under the band, on the surface: one status line (dot + sentence, said once), then **one** full-width 52 px ink primary button ("Record HINGA (recommended)" / "Re-confirm" / "Revise"), then "Choose a different level" as a text link. When the status is Official, the button area shows "✓ Official · Ma. Santos · 13:55" in `--ok`.
2. **Message to parents card.** The language segmented control is full width. The message sits on `--raised` with a 4 px left rule in `--ok` (official) or a dashed border with the stripe hatch (draft). It's 16 px body, the largest text block on the page. **Copy** is a full-width secondary-strong button (becomes "Copied ✓"). "Mark as sent" is a 3-up segmented row (FB page / Group chat / Radio) where sent items fill `--ok` with a check. The fixed-template note goes under it in 14 px muted. The correction block uses the same card pattern, with a `--bad` left rule.
3. **Details card** (a collapsible `<details>`, open on desktop): the reason line, flags (with a ⚑ glyph in mono, not an emoji), "Rule conflicts 0" with a check, rooms to check first, the **No water tomorrow** toggle as a proper row (label left, 44×26 CSS switch right, with confirm), and the section plan.
4. **Your buildings card** (2D by default on phones). The "Show 3D" button moves into this card's header as a small segmented control `2D | 3D`. The building legend (cooler / typical / hot / emptied) is inline. The sun arc gets its own labelled row inside the same card, and its viewBox padding is fixed (pad by `-18 … W+36`) so "06" is no longer clipped.

On desktop (≥ 900 px) cards 1–3 sit in a 520 px left column and the buildings card sticks on the right (`position: sticky; top: 72px`).

### 5.5 Replay, Preview, Morning check, Setup

- **Replay:** the banner is **inverse ink** (`--ink` background, `--on-ink` text) with a left block of vertical louver stripes (`repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 6px)`), the date in mono caps "REPLAY · 01 APR 2024", "not tomorrow's plan", and Exit as a white secondary button. The whole `main` gets a 2 px dashed `--ink-2` outline inset, and the 3D ground switches to an "archive" tint (`--sunk`, desaturated). There's no purple anywhere, so HINTO keeps its meaning.
- **Preview:** the forecast strip gets a dashed 2 px ink border and a "PREVIEW · ONLY YOU" mono tag. The ruler shows the hollow draft marker next to the solid published one. In 3D, columns re-tint with 60 % opacity until published.
- **Morning check:** the same card grammar. Each building row is name, a reading input (mono, 72 px wide), and the level tag it implies, updated live. The outcome is a card with a level band if the level is raised.
- **Setup:** each building becomes its own sub-card with the name and rooms as a header row and the provenance tag at right. Feature chips become signed tags: `+2 metal roof, no ceiling` with a `--home` 3 px left rule, and `−1 shade trees` with a `--full` left rule (keep the current semantics, but make them square and 14 px). "Re-read note" is a secondary button aligned right of the textarea label. Timetable times sit in a 2-column grid, so the time pickers don't stagger onto separate lines as they do now (4-setup-375).

---

## 6. The 3D scene: "diorama on a site plan"

Same shapes as the legend. The changes are in materials, light, framing, emphasis and links.

**Backdrop.** The renderer stays `alpha: true`. `.scene` gets a vertical gradient: light `linear-gradient(#F5F6F3, #DCE1DB)`, dark `linear-gradient(#131B18, #090D0C)`. This gives depth without a haze plane.

**Ground slab.**
- `BoxGeometry(W+1.5, 0.25, H+1.5)` with a material array: top `--ground` (light `#E4E8E2`, dark `#18211E`), sides one step darker (light `#C9D0C9`, dark `#0F1513`). It reads as a cut tile, a diorama.
- A `GridHelper` at 1 km spacing (`P.kmPx`-derived), colour `--line`, opacity 0.6, at y = 0.001. This is what makes it read as a site plan.
- An "N" plus a 1 km bar as a small HTML overlay in the corner (mono 11 px), not geometry.

**Lighting.**
- `HemisphereLight(sky #FFFFFF, ground = --ground, 0.65)`.
- `DirectionalLight(#FFE9C7, 0.85)` from high south-west (`(-6, 16, 9)`) with shadows: `renderer.shadowMap.enabled = true; type = PCFSoftShadowMap`, a 1024² map, and an orthographic shadow camera fitted to the slab. Columns `castShadow`, ground `receiveShadow`.
- Soft contact shadows are the single biggest jump in perceived quality, and 69 meshes is trivial.
- Warm sun = heat; the shade falls on the ground. That is the concept.

**Materials.** `MeshStandardMaterial({ roughness: .8, metalness: 0, flatShading: true })` in the plan colour. Add `EdgesGeometry` → `LineSegments` in `--ink` at opacity .22 (light) or `#000` at .5 (dark) on columns, for crisp low-poly edges.

**Shapes** (they still match the §5 legend):
- *Regular:* 12-segment cylinder, r 0.2.
- *Shortened:* the same cylinder with a notch. Cheapest buildable version: `CylinderGeometry(r, r, 1, 12, 1, false, 0.5, 2π − 1.0)` (an open wedge cut, `thetaStart` / `thetaLength`) with an inner-face colour one step darker. It reads as a notch, about 5 min of work. *Short + home* uses the same at half height.
- *Home-based:* a **puck**, not disc plus torus: `CylinderGeometry(.26, .26, .08, 24)` plus a smaller inset darker top (`r .16`, h .085) so it reads as a ring from above, matching the 2D ring.
- *Grounds for F2F:* a puck plus a **ghost scaffold**: the translucent column at opacity .10 with `EdgesGeometry` lines in `--request` at .7. It reads as "proposed" and stops dominating the scene.
- *No classes:* a puck plus two crossed thin boxes (0.36 × 0.03 × 0.06) on top in `--ink`/white. That's the X.

**Framing.**
- FOV 30 (flatter, more map-like).
- Compute `r` so the slab's bounding sphere fits with 8 % margin. The slab corners should never cut the frame edge (1-admin shows them cutting).
- Default `phi .9`.
- Presets **tween** theta, phi and r over 600 ms instead of jumping.
- Zoom range 0.6–1.6×.

**Labels and selection.**
- No permanent labels (69 would be clutter).
- On hover/tap, show an HTML label pinned by projecting the column top to screen: name in 14 px 600, the level tag, the plan label. It's styled as `.tip` on `--raised` with a shadow, offset 12 px up, and it replaces the cursor-following tooltip.
- The selected school gets an ink ring on the ground (torus r .38, flat) and its label persists. Other columns stay untouched.

**Waiting state.** All columns are flat pucks in `--line-strong`, with no shadows.

**Publish moment.** Columns grow from 0.1 to height with a stagger by longitude (west → east, 12 ms per step, 400 ms each). The heat arrives like weather. Reduced motion: instant.

**Hover link.** Hovering a plan row in the right rail or a legend item sets other schools' material opacity to .2 (`transparent: true`), and back on leave. It's a 15-line function on the existing `meshes` Map.

**School scene ("My school").**
- The same slab, light and shadows.
- Room cells keep their flag colours with edges.
- The roof: *bare GI* = thin plate `#D9DDE0` with `metalness .6, roughness .35` (it glints, it's hot); *slab* = thick matte `--ink-2`; *plain* = thin matte.
- Emptied buildings are at .35 opacity with no shadow.
- The sun arc becomes a dashed thin arc (`LineDashedMaterial`) with lit slots as thicker segments in **HINAY amber** (the sun), not the old teal accent, plus a small emissive sphere at the current hour.

---

## 7. Micro-interactions

1. **Ruler marker** slides when the draft changes, and goes hollow and dashed while the draft ≠ published.
2. **Publish** → the strip's level tag cross-fades, columns rise in a wave, and a toast appears bottom-left: "Published 38 °C final to 69 schools · 13:54" (ink, 3 s, `role="status"`).
3. **Countdown chip:** neutral normally; under 30 min the background turns `--HINAY` with dark text; late is `--bad` (as now).
4. **Copy** → the label becomes "Copied ✓" for 1.5 s, and the mark-as-sent row gets a 600 ms soft highlight, which guides the next tap on the 16:30 path.
5. **Mark-as-sent** chip fills `--ok` with a check (already stored per level).
6. **Record / Re-confirm** → the plan card band goes from `--sunk` to the level colour (300 ms), and the status line slides in from 4 px below.
7. **Plan-row / legend hover** → isolates those schools in 3D (§6).
8. **Segmented controls:** the selected thumb slides (`transition: transform 200ms`) instead of jumping.
9. **Focus:** a 3 px `--focus` ring with 2 px offset everywhere. It's visible in both themes now that the teal accent is gone.

---

## 8. The three highest-impact changes

1. **Forecast strip plus heat ruler** (admin top, school plan band). This gives the screen a focal point (38° → HINGA at 72 px / 40 px), a product identity, and makes the 42 °C city/Hinto line visible. It also kills the left rail and the dead space. *≈ 35 min.*
2. **"Colour means heat" token reset.** Concrete/night neutrals with real elevation, ink primary buttons, no teal accent, square 4 px chips, segmented controls instead of identical pills, a 16 px body with a real scale, a one-row header (96 px on phone, down from about 225), replay moved off HINTO purple, and the school card split into plan, message and details. *≈ 30 min (mostly CSS variables and class tweaks in `index.html`, plus small markup changes in `ui.js`).*
3. **3D diorama upgrade.** Shadows from a warm sun, a standard flat-shaded material with edges, a slab with sides and a 1 km grid, pucks instead of coins, wireframe ghost requests, camera fit, tweened presets, a pinned label, and hover isolation from the tallies. *≈ 30 min in `scene3d.js`.*

Light mode should be the **demo default on the projector** (it reads far better in a lit room). Keep auto plus a toggle.

## 9. Constraints honoured / for the usability agent to rule on

- All §5/§6 controls and texts are kept. The legend colour + shape pairs are unchanged (only refined). The 2D fallbacks get the same tokens. 3D stays opt-in under 700 px and on three.js r128.
- **Open points for debate:**
  - (a) The body font swap from Inter to Atkinson Hyperlegible Next (the plan names Inter; I can drop the swap).
  - (b) The countdown sits in the strip's top-right rather than literally first in the right rail.
  - (c) The forecast leaves the admin header (school header keeps it, per §6).
  - (d) Decision status as a stacked bar plus a count row, instead of six tiles (every number is still printed).
