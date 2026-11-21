VERDICT: CHANGES REQUIRED

# Presko web app plan: customer-journey review, round 1

Reviewer: customer-journey agent (UX/UI). I reviewed `PRESKO/WEBAPP-PLAN.md` (draft v1) against `index.html`, `engine.js`, `data-flow.html` and `PITCH.md`.

Overall: the split into two modes is sound. The rule "3D shows where and what kind, numbers live in flat panels" is right, and so is the single selector feeding both the scene and the panels. What the plan lacks is the realities of the 16:00 to 17:00 window: phones, a forecast that changes, approvals that may not arrive, and messages that may already be out. It also has no defined empty or error states. The items below are ordered by how badly they would hurt a real user or the demo.

## BLOCKING

### 1. School mode is designed for a laptop. The head at 16:30 is on a phone with patchy data.
§4 puts the 3D "My school" scene above the decision card on Today. §9 sets 60 fps on a "mid laptop" and allows about 2 MB of JS. The plan says nothing about phone layout, touch, or what happens when the three.js CDN download fails. A 3 s first-frame timer won't fire if the script never loads. Hover doesn't exist on touch.
**Fix:**
- **Phone layout below 700 px for Today:** level chip with plan type and reason, then the decision card, then the parent message. Flags and the section plan go in a collapsible block. The 3D scene comes last, behind a "Show my school in 3D" button.
- **2D by default when:** the screen is under 700 px, `navigator.connection.saveData` is on, the connection is 2g or 3g, or the device reports 4 GB of memory or less (`deviceMemory`). The 3D scene is opt-in there.
- **Load three.js lazily, only after the panels have rendered.** Fall back to 2D right away if the script fails (`onerror`), not only after 3 s with no frame.
- **Fonts:** use `font-display: swap` with system-font fallbacks, so text never waits on Google Fonts.
- **Touch:** every tap target at least 44 px, and tap replaces hover (tap a column to see name and level, tap again to open the drawer). Inputs use 16 px text so iOS doesn't zoom.
- **Acceptance:** add to §9 "Journey 2 completes at 375 px width on a throttled 3G profile, with 3D off."

### 2. The head's 16:30 path is too long and mixes in a setup task.
Journey 2 has the head editing Building A's note, waiting for Claude, and only then recording. Under deadline that is the wrong job. It needs the network, and it belongs to the custodian or the coordinator. The pitch says "The coordinator corrects one note", while the plan has the head doing it, so ownership is also inconsistent.
**Fix:**
- **Head's critical path at most 3 actions:** open Today, then "Record HINGA" (name pre-filled from the role and remembered), then Copy message. Record the recommended level with one primary button. Choosing a different level opens the select and the reason field.
- **Split journey 2** into "2a Head records" (3 actions) and "2b Note correction" (Setup or the building drawer, done by the custodian or coordinator). Pick one owner for note edits and use it in both the plan and PITCH.md.
- **Returned decisions:** Today shows the SDO's note at the top in the returned state, with "Revise decision" as the primary action.

### 3. The forecast goes live as it is typed, and the school side has no "no forecast yet" state.
In journey 1 the coordinator "types 38" and the division recolours. Typed live, "3" then "38" briefly computes 3 °C. In journey 5 every edit marks all recorded decisions stale, so a typo at 16:50 sends 40 schools into "re-confirm". In school mode the plan never says what the head sees if they open Today before the coordinator has entered anything. With per-browser state it would silently plan on a default value.
**Fix:**
- **Draft, then publish:** the forecast field is a draft until "Publish forecast to schools". After publishing there are two states: "Provisional (PAGASA 4 p.m.)" and "Final (PAGASA 5 p.m. advisory)". That replaces the bare checkbox.
- **Confirm a change after publishing:** show "This will mark N recorded decisions re-confirm", with Cancel.
- **School empty state:** "Waiting for the SDO's forecast for tomorrow (usually by 16:00)". No level and no message until a forecast is published.
- **Re-confirm in one tap:** "Re-confirm HINGA at 39 °C", keeping the name and reason when the level is unchanged.
- Both modes show the forecast value, its status (provisional or final) and its publish time in the header.

### 4. Draft and official messages are not separated well enough to beat fake "walang pasok" pages.
The plan says the message shows "Draft" until official, "with Copy", but doesn't say whether Copy works on a draft. If it does, a draft gets pasted into a group chat and looks official: that is exactly the failure Presko exists to prevent. There is also no path for a message that was already sent and then goes stale because the forecast changed or the SDO returned the decision.
**Fix:**
- **Draft:** Copy is disabled, or the copied text starts with "DRAFT – NOT FOR SENDING". The draft is visually distinct in both modes, for example a dashed border and grey header for draft against a solid border with an "Official" badge.
- **Official text carries:** the decision time, the forecast value with its status, and a "Verify only on [school's official page] / SDO Iloilo City page" line. The current template has a short version of this; keep it in all three languages.
- **Record sending:** add a "Mark as sent" step, which also feeds the admin bar ("messages out: N"). If a sent message later goes stale or is returned, show "Send correction" with a correction template ("Update: tomorrow is now HINGA…"), not just a fall back to Draft.

### 5. The deadline isn't visible, and the plan doesn't say what happens at 17:00 without an approval.
Nothing in either mode shows time left before 5 p.m. A head who overrides at 16:50 to a less protective level sits in "awaiting SDO". If the approver doesn't act, parents get nothing, which is the gap that fake pages fill.
**Fix:**
- **Deadline chip in both headers:** "Parent message due 17:00 · 34 min". At 16:45 it turns amber in admin mode and shows the count of schools with no official message.
- **Rule at 17:00 with no approval:** the rule level stands. Show "Until the SDO approves, the rule level (HINGA) applies" on Today, and let the head send the rule-level message as official.
- **"Chase missing"** gives a list with a copyable reminder text per school or for all of them, not only a list.
- **Approver queue:** opens on "awaiting SDO", sorted by decision time. Each row shows recommended next to chosen, marks "less protective", and shows the reason inline. Approve and Return are one tap each, and the return note is required. Approving is two actions per row with no page change.

### 6. The morning check (08:00) has no defined outcome, and the engine won't do what journey 6 implies.
In `engine.js`, `effective = decided || recommended`, and `decisionStatus` only goes stale when the forecast changes. Once the head has recorded HINAY, 8:00 readings that push every building to HINGA change `recommended` but not the effective level, and the status stays "official". The teacher would see the school "not change level" while every room reads hot. The plan also lets the teacher trigger "Send morning update" to parents, which is the head's decision.
**Fix:**
- **Selectors flag it:** when readings make `recommended` more protective than the recorded decision, mark "readings call for HINGA: head must re-confirm". This is derived state; the engine API can stay as it is.
- **The teacher only records readings.** The screen tells them who is notified. Building greying works as planned.
- **The head re-confirms first:** the head then sees "Re-confirm" plus a morning-update message, and the message becomes official only after that re-confirmation.
- **Validate readings:** accept 20 to 55 °C, warn on anything else ("36, not 360?"). An empty field means "not read", which is not the same as 0.

### 7. Replay can overwrite live state.
"Running a replay sets the scene to that date" means it writes into the same store as today's forecast. That marks today's real decisions stale and can show a 2024 level as tomorrow's.
**Fix:**
- **Separate replay state:** run replay in its own store (`replay` in the app state, not `forecast`).
- **Banner while in replay:** a full-width "REPLAY · 1 April 2024 · not tomorrow's plan" bar with "Exit replay", in both modes.
- **Lock the record controls:** decision, approval and message buttons are disabled during a replay.

### 8. The plan doesn't make the under-2-minute demo reproducible.
The shot list in PITCH.md is built around the single-page desk. With role pickers, hash routes that carry no school or state, orbiting, and localStorage left over from rehearsals, the recording will drift and run long.
**Fix:**
- **Deep links:** `#school/pandac`, `#admin-decisions?filter=awaiting`, `#admin-replay/2024-04-01`.
- **"Demo reset" button:** seeds a known state (for example 16:00, 38 °C published as provisional, 3 decisions already recorded, 1 override awaiting) and clears localStorage.
- **"Switch role" as a one-click toggle in the header** (SDO ↔ Pandac head), not a trip back to the start screen.
- **Fixed camera presets:** the demo never needs a free orbit.
- **Rewrite the shot list in PRESKO/PITCH.md** against the new screens and time it. Suggested beats: Division at Hayo, publish 38, admin recolours, tap Pandac, switch to the head on a phone frame, record, copy Hiligaynon, switch to SDO and approve, the bar goes "official", Replay 2024.

## Non-blocking suggestions (priority order)

1. **One colour legend for both modes.** §3 lists "four 4H colours", but the scenes colour by plan type: full green, split amber, splitPartial orange, home red, request blue and stop purple. That is six colours, and amber and orange are hard to tell apart under flat 3D shading. Define one legend component and use it in the 3D scenes, the 2D fallbacks and the panels. Add a second channel alongside colour: column shape or cap icon (request = ghost or outline, home = disc, stop = flat with a ✕), because Hayo green and Hinga red are the classic colour-blind pair.
2. **Cut the heat "haze" plane.** It repeats the level chip, hides the columns, and gives no information per school. A ground tint or nothing is enough. Keep the Hinga ghost columns: they carry real meaning (what the request would bring back).
3. **Admin 3D on a phone.** 69 columns clustered in a small city area are hard to tap. Default to a near top-down camera, and offer "List" as an equal tab next to "Map", not just as a fallback.
4. **Status vocabulary.** The plan uses "stale" (filter), "re-confirm" (status), "not yet", "none" and "awaiting SDO". Pick one set of user-facing labels: Not yet · Awaiting SDO · Returned · Re-confirm · Official. Use them everywhere, including the CSV `status` column (or document the mapping). Do the same for "F2F" vs "face-to-face": use F2F only in staff screens and spell it out for parents.
5. **"Hinga" and "Hinto" look alike.** Always pair the level name with its number range and colour ("HINGA · 33–41 °C"). Never use the name alone in small text or in the 3D labels.
6. **Chip contrast.** White text on amber (#c98a10) and orange fails AA. Specify the text colour per chip (dark text on amber and orange) in both themes.
7. **Who is signed in, and trust.** There is no login, so anyone can switch to SDO and approve. Keep "(demo)" in the header. Also show "Approved by: SDO (demo, no sign-in)" on approvals, so the jury doesn't read it as real authority.
8. **Language of the interface.** Staff screens in English are fine for DepEd users. Put the Hiligaynon "needs native-speaker check" note on the message tab itself, not in small print. Optionally add a Filipino toggle for the head's Today labels later.
9. **localStorage unavailable** (private mode or blocked): show a one-line banner "This browser won't keep your decisions after closing", and keep working in memory.
10. **Claude re-read failure:** show "Couldn't reach Claude; used keyword reading" inline on the building, and keep the result. Don't let it block Setup.
11. **Water toggle.** "No water tomorrow" forces at least HINGA, so it should ask for confirmation and show its effect ("→ HINGA") before applying, and the admin should see it as a flag on the school.
12. **Custodian setup.** Show progress ("3 of 4 blocks entered") and save per block, so a custodian interrupted in week 1 doesn't lose work. Check the end time is after the start time inline, with no modal.
13. **Reduced motion.** The 08:00 "hot rooms pulse once" also needs a static equivalent (outline) under `prefers-reduced-motion`.
14. **3D canvas accessibility.** Give the canvas `aria-hidden="true"` and put the equivalent list next to it in DOM order, so screen readers skip straight to the list.
