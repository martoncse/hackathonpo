VERDICT: CHANGES REQUIRED

# Presko web app plan v2: customer-journey review, round 2

Reviewer: customer-journey agent (UX/UI). I checked `PRESKO/WEBAPP-PLAN.md` v2 against my round-1 blocking issues (UX1–UX8) and against the new flows brought in by the data fixes (D1–D10).

## Round-1 issues: status

| # | Status | Note |
|---|---|---|
| UX1 Phone and lazy 3D | Resolved | Panels come first, 3D is opt-in below 700 px, slow or low-memory devices get 2D, and a script failure falls back to 2D. Journey at 375 px on throttled 3G. Good. |
| UX2 Head path, note ownership | Resolved | One primary Record button. Notes are edited only in Setup, and Setup is its own journey (7). |
| UX3 Draft forecast, waiting state | Resolved | Draft → Publish, Provisional/Final, a confirmation with the count N, and "Waiting for the SDO's forecast". |
| UX4 Draft vs official message | Mostly resolved | Watermark, Copy disabled, verify line and Mark as sent are all in. The new "Send correction" flow is not gated: see B2. |
| UX5 Deadline, fallback, queue | Resolved | Countdown, "Send rule-level message now", default filter Awaiting SDO, return note required. |
| UX6 Morning outcome, teacher vs head | Partly resolved | The outcomes and roles are right, but the head can't find the re-confirm: see B3. |
| UX7 Replay isolation | Resolved | In-memory copy, banner, actions locked, test 4. |
| UX8 Reproducible demo | Partly resolved | Deep links, Demo reset and presets are in, but the seeded state can't play shot 3: see B1. |

The new status vocabulary is not too heavy for a head on a phone, because the head only ever sees one status at a time. The condition is that each status comes with one sentence and one primary button (non-blocking note 1). The publish flow adds about one tap for the coordinator, which is a fair price for not marking 40 schools stale on a typo.

## BLOCKING

### B1. The demo seed can't play the shot list.
§9 Demo reset loads "published 38 °C final, **no decisions**". §11 shot 2 has the head record the recommended level, which is official with no SDO step. Shot 3 is "Switch to SDO → approve an override", but no override exists, so the Awaiting SDO queue is empty on camera. Creating one live (choose a level, type a reason) adds about 15–20 s and a second head pass, which puts the demo at risk of going over 2 minutes.
**Fix:**
- **Seed one awaiting override:** Demo reset also seeds one other school (not Pandac) with a recorded override in Awaiting SDO, for example HINAY chosen over HINGA with the reason "new insulated building", plus 2 or 3 official decisions so the status bar isn't all zeros.
- **Update §11 to match.** Shot 3 approves that seeded row.
- **Optionally open on the publish:** shot 1 starts with the draft field at 38 and the coordinator taps Publish. "Nothing happens until Publish" is the story of the coordinator's 16:00, and it costs one tap.
- **Time the script:** add a stopwatch check to §11 (target 1:50), and add "Demo reset produces the scripted counts" as a Node test.

### B2. "Send correction" isn't gated like the other messages, so an unofficial message can reach parents.
§6 says that when a sent message's status "later goes stale or returned, a Send correction template appears". At that moment the status is, by definition, not Official, so the correction is exactly the unofficial notice the Draft rules exist to stop. The plan also doesn't say what the correction says when the level parents were given and the level now in force are the same (for example, the SDO returns an override after the head already sent the rule-level message). That would be a confusing "correction" that changes nothing.
**Fix:**
- **Gate Copy on the correction too:** it is enabled only when the status is Official again (after the one-tap re-confirm or revision), or through "Send rule-level message now".
- **Before that, show the reason and the next step**, for example "Correction ready after you re-confirm", with the Re-confirm button right there.
- **Base the correction on the level parents already have:** it states "was X, now Y", and it appears only when the last sent level differs from the level now in force. The last sent level is stored in `sent[]`.
- **Add both cases to browser journey 5:** forecast republished after Mark as sent; re-confirm at the same level means no correction, a changed level means the correction becomes Official.

### B3. The 08:15 re-confirm has no visible place, and Today mixes up two dates.
The head's link is `#school-<id>` (Today), and Today shows the decision for `forDate` (tomorrow). At 08:15 tomorrow's forecast usually isn't published, so Today shows "Waiting for the SDO's forecast". But the `stale-readings` re-confirm belongs to *today's* record, `days[today]`, so the head who opens their usual link sees nothing to do. "The head must re-confirm (one tap)" in §6 doesn't say on which screen. The teacher is told the head "is notified", but in this prototype there is no notification channel.
**Fix:**
- **Banner for today's record on Today:** when `days[today]` for this school is `stale-readings`, Today shows a top banner above everything: "Today, {date}: 8:00 readings call for HINGA" with a **Re-confirm** button. After re-confirming, the morning parent update appears there.
- **Date-label every card on Today:** "Plan for tomorrow, Wed 25 Nov" and "Today, Tue 24 Nov".
- **After the teacher saves readings:** show "Tell your school head to open Presko: readings call for HINGA", with a copyable text for the staff chat. Don't claim an automatic notification.
- **Browser journey 6:** the head re-confirms from the Today URL, not only from Morning check.

## Non-blocking notes (priority order)

1. **One sentence and one button per status on the head's phone.**
   - No decision → "Record HINGA"
   - Re-confirm: forecast changed → "Re-confirm at 39 °C"
   - Re-confirm: readings → "Re-confirm HINGA"
   - Awaiting SDO → "Waiting for SDO · Send rule-level message now"
   - Returned → SDO note + "Revise decision"
   - Official → "Copy message"

   Never show two primary buttons at once.
2. **Count the head's path honestly.** Journey 2 is open → Record → Copy → Mark as sent, which is 4 actions, and the name has to be typed the first time (there is no "last decision" yet). Fixes:
   - Pre-fill the name from the role picker.
   - After Copy, show "Mark as sent to: FB page / group chat / radio" inline as one-tap chips.
   - Say "3 actions plus Mark as sent".
3. **Finalising at the same value** (provisional 38 → final 38 at 17:00) must not mark decisions re-confirm and must not ask for confirmation. Say so in §3. It is the most common 17:00 action, and journey 5 only tests a changed value.
4. **The coordinator's preview of the draft.** Should the admin scene show the draft forecast before Publish? Recommended: yes, as a "Preview, not published" ghost state in admin mode only, so the coordinator sees the effect before committing. Schools never see it.
5. **The approver on a phone.** §2 says "laptop or phone", but the Decisions table has 9 columns. Below 700 px, show each row as a card: school, "chosen HINAY · rule HINGA · less protective", the reason, then Approve and Return.
6. **"Near the deadline" isn't defined.** Pick a time (16:45) for showing "Send rule-level message now" prominently. Also say what the countdown shows after 17:00 ("Past 17:00 · N schools without an official message").
7. **The water toggle triggers the wrong label.** Raising the recommendation through "No water tomorrow" would show up as `stale-readings`, labelled "8:00 readings call for X". Label it by cause ("No water: HINGA required"), or make the label read "Re-confirm: conditions changed".
8. **Deep-link ids.** `#school-0` depends on roster order. If the rosterHash changes, the demo link points at a different school. Use a stable slug (`#school-pandac-es`) or check in the demo test that `#school-0` resolves to Pandac.
9. **No decision at 17:00 means no sendable message.** That is right, because the head is the authority, but Chase missing should sort those schools first after 16:45, and the reminder text should say "Parents have no official message yet".
10. **The Hinto shot was dropped** from the demo. That's fine for time, but keep "Hinto: no classes anywhere, stay-cool message" in the voice-over or the Replay 3 Nov 2026 card, so the jury sees all four levels at least once in the legend.
