# Presko app: design round 2, usability response to "Sunbreaker"

*Author: usability specialist. Responds point by point to `design-r1-visual.md`, with my round 1 (`design-r1-usability.md`) as the baseline.*
*Stance: I concede where visual quality and jury impact are the stronger argument. I hold firm on accessibility, task clarity and phone use.*

**Summary.** We agree on more than we differ. Both proposals diagnose the same root cause (no hero, everything the same weight, a junk-drawer header, red and teal fighting the heat colours) and reach similar fixes: a hero, a stacked decision bar, the legend on the map, a 16 px base, dark text on chips in dark mode, an empty state for Decisions, and the school card split by step. I accept Sunbreaker as the **visual base** (tokens, type scale, forecast strip, ruler, diorama, replay treatment). My remaining asks are about **one primary action per moment**, **multi-select semantics**, **colour-meaning collisions**, **plan §3 header rules**, and **feedback on saves**.

---

## 1. Accepted as-is

| Sunbreaker § | Point | Why I accept |
|---|---|---|
| 1 | The whole diagnosis (no hero, muddy layers, identical controls, header junk drawer, bottle-cap 3D, dead space, timid type) | Matches my F1–F12. Their "surface/bg 4 % apart" and "teal competes with heat" points are better than mine. |
| 2 | **"Colour means heat, everything else is shade"** | This is the strongest single idea in either file. It frees red and amber to mean something, so my F6 (red overloaded) is fixed at the source. |
| 3.1 | Neutral tokens, light shadows / dark borders, `--ink-2` for secondary text, the 3 px ink/white focus ring | The contrast values hold up (I checked `--muted` on both surfaces). The focus ring is more visible than the teal one. |
| 3.2 | 4H fills with **dark text on all chips in dark mode** | Same fix as mine. I spot-checked HINGA light `#D2401F`/white ≈ 4.7:1, HAYO `#1E7F4F`/white ≈ 5.0:1, request `#1F63B8`/white ≈ 5.9:1. All pass AA. |
| 3.3 | Plan colours, plus the `--split-edge` / `--splitPartial-edge` strokes so amber and orange symbols pass 3:1 on white | Fixes non-text contrast (WCAG 1.4.11), which I missed. |
| 3.4 | Type scale with 16 px body, 14 px minimum running text, and 12 px only for mono-caps eyebrows | Same as my §11. |
| 3.5 | 4-pt spacing, dividers inside cards instead of more cards | Reduces nesting. |
| 4 | Segmented controls for **exclusive** choices (Today/Tomorrow, language, Decisions filters, camera presets), with counts on filters | Makes "these are alternatives" visible. Counts match my §4. |
| 4 | Disabled = `--sunk` + `--muted`, no 50 % opacity | Fixes my F5. |
| 4 | Nav tabs as text with a 3 px underline | Clear difference between navigation and filters. |
| 4 | Stat tiles without backgrounds, with **zero values in `--muted`** | Better than my "collapse zeros into one line": every number stays printed and the eye still skips the zeros. **I withdraw my version.** |
| 5.3 | Decisions: empty state in a card with a summary and a link to set the filter; level tags in cells; less-protective rows get a red left rule plus the tag; Approve primary, Return secondary; sticky header | Same as my §4, executed better. |
| 5.5 | **Replay in inverse ink with louver stripes, no purple** | Better than my contrast-only fix: purple means HINTO, so a purple replay banner said the wrong thing. **Conceded.** |
| 5.5 | Setup: building sub-cards, signed square feature tags, 2-column timetable grid | Same as my §7. |
| 6 | Diorama: gradient backdrop, slab with sides, 1 km grid, N + 1 km scale as an HTML overlay, warm directional light with soft shadows, flat-shaded standard material with edges, pucks instead of coins, ghost requests as wireframe scaffolds at .10 opacity, camera fitted with 8 % margin, FOV 30 | Fixes my F11 (ghost pillars dominate, slab corners cut the frame, no sense of place). The 1 km grid does the job my district labels would have done, and needs no data we don't have. |
| 7.2 | Publish toast in `role="status"` | This is the dedicated live region I asked for (F15). Use the same region for every confirmation and error. |
| 7.4 | Copy → "Copied ✓" and a soft highlight on the mark-as-sent row | Guides the next tap on the 16:30 path. Same intent as my step strip. |
| 8 | **Light mode as the demo default** on the projector, auto + toggle kept | Same goes for phones in sunlight (my F9). |

---

## 2. Accepted with changes

| Sunbreaker § | Point | My change | Reason |
|---|---|---|---|
| 3.1 / 4 | "Selected toggles are filled ink (inverse)" in §3.1, but a `--surface` thumb with shadow in §4 | **Use the §4 version: surface thumb.** Ink fill is reserved for the primary action only. | With ink primaries *and* ink-filled selections, the current filter or language looks as clickable as "Record". One ink object per moment is what makes the primary action findable. |
| 4 | Status line = 8 px dot + one sentence (instead of my outlined pill + icon) | **Accept the dot + sentence** everywhere, including tables. Conditions: the status **words** are always printed next to the dot, and **Awaiting SDO uses `--warn`, not `--bad`**. Red stays for Returned, Re-confirm, Past 17:00 and conflicts > 0. | The words carry the meaning, so colour isn't the only signal. My Unicode icons (◷ ↩) risk missing glyphs on cheap Android phones, so I drop them. |
| 4 / 5.2 | **Heat ruler** | Accept, with these conditions: (1) the level names are printed on or under their segments, and the marker bubble reads "38°C", so the ruler never depends on colour alone; (2) on phones (< 500 px), print only the boundary numbers 27 / 33 / 42 and the marker; drop "city EO" text to a tick under the band, with the meaning in the `aria-label`; (3) clamp the marker at both ends and print the real value in the bubble ("53°C" at the right edge); (4) the whole ruler gets one `aria-label` (as drafted) and `aria-hidden` children. | On a 343 px phone, five range labels plus "42 · city EO" plus a bubble collide. The 42 °C city tick sits exactly on the HINTO boundary, so the two labels overlap. |
| 5.1 | Header | Accept the 56 px desktop row and the 96 px phone header (52 + 44, scrolling tabs, no wrap). Accept **"Role ▾" at the end of the tab strip** (I conceded: it's faster for a demo that changes roles five times). Change: the "Switch to …" link needs a 44 px tap area. On phones it stays in row 1 as a short "⇄ SDO" / "⇄ Head" button, because plan §2 requires a one-click switch in the header and it's the key cut in the video. | Touch target, and the plan rule. |
| 5.1 (c) | Forecast leaves the header | See §4 below: **only on the page whose hero shows it in the first viewport.** | Plan §3. |
| 5.2 | **Forecast strip + two-column body** | Accept over my hero band + three columns. It removes the three-column squeeze I was trying to fix with a breakpoint. Changes: (1) **publish button names the action**: "Publish 44°C (final) to schools". When published and unchanged, show a done line: "✓ Published 38°C final · 13:54", not a disabled button. (2) The legal row (city EO select + EO 130 line) stays one line on desktop. On phones it collapses into `<details>` "Legal context", **open automatically when the city banner is active**. (3) On phones the order is strip → status → map (as drafted), but the draft row with Publish must sit **above** the ruler, so the coordinator's only task on that screen is visible without scrolling. | Error prevention (the value is in the button), done state readability, phone fold. |
| 5.2 | Chase missing as a secondary button | **One primary per moment, in sequence:** before publish, Publish is the ink primary. After publish and before 16:45, no primary. From 16:45, "Copy reminder to N schools" becomes the ink primary (and still expands the list). | At 16:45 chasing is the coordinator's only remaining job. A secondary button there repeats my F4 (main action hidden). |
| 5.2 / 6 | Plan counts as bars in the rail, **and** the legend on the map | Accept both (I conceded the duplication: the bars give counts and hover isolation, the overlay gives the key next to the marks). Change: types absent today are greyed at 40 % in the map legend and omitted from the rail bars. | Without that, six legend entries explain two marks, which was my F10. |
| 5.4 | School Today split into Plan / Message / Details / Buildings cards | Accept the cards. Changes: (1) **number the action cards and show their state** in the card header: "1 · Decision ✓ Official 13:55", "2 · Message to parents", "3 · Mark where you posted it" (step 3 can be the bottom row of card 2). (2) **The current step owns the only ink button**: before recording, "Record HINGA (recommended)". Once official, **Copy becomes the ink primary** (not "secondary-strong"). (3) The status line is said once (agreed). | This keeps my step-strip benefit (the head always sees "am I done?") inside the designer's card layout. It's also what makes the 16:30 beat legible in the video without voice-over. |
| 5.4 / 7.6 | Plan band goes from `--sunk` to the level colour on Record | **Keep the band in the level colour from the start.** Signal "not yet recorded" with the status line and a hatch over the band (the same draft hatch as the message), then animate the hatch away and show the check on Record. | Plan §3: without a decision, the rule level stands. A grey band reads as "no level tomorrow", which is false and is exactly the state a head sees first. |
| 5.4 | Mark-as-sent as a **3-up segmented row** | **Reject the segmented look; keep the 3-up layout** as three independent toggle chips (`aria-pressed`, a gap between them, the check + time when sent). | Segmented controls mean "pick one". Channels are multi-select (FB page **and** group chat **and** radio). A head would think marking radio un-marks FB. |
| 5.4 | No water tomorrow switch in Details (44×26 switch, with confirm) | Accept, and I **withdraw my "move it above Record"** (it's a plan change). Add one line under the Record button only while there's no decision: "No water tomorrow? Set it in Details first." | Keeps plan §6, and the head still learns about it before recording. |
| 5.5 | Morning check: reading input mono, 72 px wide | Make it 96 px wide, 18 px mono, 48 px tall, `inputmode="decimal"`. Keep my two additions: **"Saved ✓ 08:04"** next to each field after a write, and an **inline range error** under the field ("Enter 20 to 55 °C, or leave empty"), linked with `aria-describedby`. | Readings commit on `change`, which fires on blur on mobile. Without feedback, a teacher can't tell whether it saved. Field errors belong at the field, not in a top banner. |
| 5.5 | Preview: dashed strip border + "PREVIEW · ONLY YOU" tag | Accept, but keep plan §3's sentence in the strip: "Preview, not published. Schools still see 38°C." | The tag says who sees it. The sentence says what schools see. Both matter. |
| 6 | Roof: bare GI as a `#D9DDE0` metallic plate that glints | Accept (it's grey now, not the bright white of the current build). Add building name + flag as HTML labels, like the pinned school labels, so 3D is never less informative than 2D. | Plan §5: every 3D fact is also text. |
| 6 | School sun arc lit slots in **HINAY amber** | Use **ink (light) / white (dark)** for lit slots in the 2D arc. Amber is fine for the sun sphere itself. On home-based days, print "No class hours at school tomorrow (home-based)" instead of an empty axis. | "Colour means heat": amber segments would read as "Hinay hours". The empty axis is my F12. |
| 7.3 | Countdown chip turns HINAY amber under 30 min | Use **inverse ink** under 30 min, and `--bad` + "Past 17:00" when late. | Same collision: an amber chip next to a level chip reads as a level. |

---

## 3. Rejected

| Sunbreaker § | Point | Why |
|---|---|---|
| 5.1 | Removing the forecast **and countdown** from the header on **every** admin page | The SDO's main page is Decisions, 16:30–17:00. Without the header countdown, the person signing off sees no deadline. Plan §3 requires both in both headers. Compromise in §4. |
| 5.4 | Message as "the largest text block on the page", i.e. the visual hero | The head's first question is "what level tomorrow?", the second is "is it official?". The message is step 2. The designer's own layout already puts the plan card first, so this is about emphasis: the level band is the hero, the message is the largest *body* text. Probably a wording difference rather than a real disagreement. |
| 5.4 | "Details" card open by default on desktop | Fine on desktop. On phones it must be closed (it holds conflicts, flags, rooms and the section table). The exception: conflicts > 0 forces it open. Noting it here so it's built that way. |

That's all. Everything else is accepted, with or without changes.

---

## 4. Answers to the open points

**(a) Inter → Atkinson Hyperlegible Next. Accept.** It was designed for low-vision legibility, with clearly different 1/l/I and 0/O and open counters. That matters for a tool where 36 vs 38 °C changes the level, on a cheap phone in sun. Conditions: check that the family loads from Google Fonts in the build (keep `Inter, system-ui` as fallback in the stack), and record the change in the plan §5 type line. If it doesn't load cleanly in the first 5 minutes, keep Inter. The scale matters more than the family (agreed).

**(b) Countdown at the top right of the forecast strip. Accept on admin Division.** It visually heads the status column, so the plan's rail order (countdown first) still reads. It's also where my hero band had it.

**(c) Forecast out of the admin header. Accept with a rule:** the header shows a compact forecast + countdown chip ("SUN 22 · 38°C FINAL 13:54 · 3h 05m") on **every page except the one whose hero shows both in the first viewport**:
- admin Division: the strip shows them, so the header drops them;
- school Today: the plan band shows the forecast, so the header keeps only the countdown, as the designer proposes;
- Decisions, Replay, Rules, Data, Morning check (no countdown there, per plan §3), Setup: the header chip stays.

This is a small deviation from plan §3 ("both headers show…"), justified because the information sits right under the header. Log it as a plan amendment.

**(d) Six tiles → stacked decision bar. Accept** (it's what I proposed). Conditions:
- the count row under the bar prints every status word with its dot;
- every non-zero segment is at least 4 px wide, so "1 awaiting" is visible among 69;
- No decision uses `--line-strong`, not `--line` (it has to show against the track);
- each status in the count row links to the filtered Decisions view.

**Ink-black primary buttons, no teal. Accept.** Ink frees colour for heat, and a near-white primary in dark mode is bright and easy to find. Condition: ink is used **only** for the primary action, one per moment (selected thumbs are surface, nav is underline). Focus stays visible with the 3 px ink/white ring.

**4 px radii. Accept.** Neutral for usability. Touch targets are set by height (44–52 px), not by radius. The bulletin look suits the product.

**72 px forecast numeral. Accept on desktop, 56 px on phones.** Two conditions:
- always set it as "38°C", with "PAGASA HEAT INDEX" in the eyebrow, so nobody reads it as air temperature;
- keep "FINAL/PROVISIONAL · time" directly under it.

In school mode the level name is the hero, not the number, which matches the designer's band.

**Heat ruler. Accept** with the §2 conditions (printed labels, phone simplification, clamped marker with the real value, one aria-label). It's the product's signature, and it shows the 42 °C line, which nothing else on screen does.

**3D diorama + publish wave. Accept.**
- **Motion:** 400 ms per column with a 12 ms stagger, capped at 400 ms total, so the whole wave lands in under 1 s. Reduced motion makes it instant (as drafted). The panels and numbers update **immediately**, and the wave is decoration over facts already printed. No auto-rotation.
- **Demo:** the wave is a good 3-second beat for a video under 2 minutes: publish → ruler marker → columns rise → toast. I'd script it as the second shot.
- **Performance:** shadows (1024² map) are fine on a laptop. 3D stays off by default under 700 px, on saveData and on low memory (plan §5), so phones don't pay for it.
- **Budget:** 30 min is optimistic for everything in §6. Build in this order and stop when time runs out: material + light + shadows → ghost scaffolds → camera fit → slab/grid → pinned label → preset tween → hover isolation. Skip the notch wedge, the X geometry and the 3D sun arc if short; the 2D legend still carries the shapes.

---

## 5. Concerns about my own round 1 that their file exposes

1. **My hero band sat on top of the old three columns.** That kept the squeeze I then patched with a breakpoint. Their strip + two columns solves it properly. **Withdrawn.**
2. **I leaned toward 2D as the laptop default.** That was a reaction to the current bottle-cap scene. With the diorama fixes, 3D earns its place and the plan wants it. **Withdrawn**; 3D stays the default on desktop.
3. **District labels** needed a district field we don't have. The 1 km grid + N arrow does the job. **Dropped.**
4. **Pill icons in Unicode** risked missing glyphs, and my outlined pills were heavier than their dot + sentence. **Conceded.**
5. **Hiding the header countdown on school Today below 700 px** contradicted plan §3, the same rule I'm now holding the designer to. **Withdrawn**; the header countdown stays, and the card says "decide by 17:00" as text.
6. **"No water" above Record** was a plan change dressed as a layout tweak. **Withdrawn** in favour of a one-line pointer.
7. **Bottom tab bar** for school mode: their scrolling tab strip is cheaper and good enough with 3 tabs. **Dropped.**
8. **Neither of us fits 1.5 h.** Together it's roughly 2.5 h. Proposed cut order (build top-down, stop when time is up):

| # | Item | Est. |
|---|---|---|
| 1 | Tokens, type, chips, dark-text levels, dot status (Awaiting = warn), disclosure chevrons, segmented controls, `role="status"` region | 25 min |
| 2 | Header (56 / 96 px, page-aware forecast chip, ⇄ switch, Role ▾, theme toggle) | 15 min |
| 3 | Admin forecast strip + ruler + two-column body + stacked bar + one-primary sequence | 30 min |
| 4 | School Today numbered cards, Copy as primary once official, multi-select sent chips, band hatch | 20 min |
| 5 | 3D: material, light, shadows, ghost scaffolds, camera fit (rest only if time) | 15 min |
| 6 | Decisions counts + empty state + Return disabled until a note is typed | 5 min |
| — | **Cut if late:** Morning check "Saved ✓"/inline error (keep if 5 min remain; it's the teacher's only feedback), replay hero numbers, Setup cards, hover isolation, preset tween, 3D sun arc, notch/X geometry | — |

---

## 6. Remaining disagreements (for round 3)

1. **One primary at a time.** Copy becomes the ink primary once the decision is official. Chase becomes the primary from 16:45. Selected toggles are never ink.
2. **Mark-as-sent must look multi-select** (separate toggle chips), not a segmented row.
3. **Header forecast/countdown stays on pages without a hero** (Decisions especially). It's dropped only on Division (forecast + countdown) and school Today (forecast only).
4. **The plan band is in the level colour before a decision** (hatched), not grey.
5. **No amber outside heat meaning:** not on the countdown under 30 min, not on lit class-hour slots.
6. **Morning check save feedback + inline range errors** stay in scope if 5 minutes remain.
