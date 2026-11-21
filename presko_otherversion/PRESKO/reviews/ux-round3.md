VERDICT: APPROVE

# Presko web app plan v3: customer-journey review, round 3

Reviewer: customer-journey agent (UX/UI). I checked `PRESKO/WEBAPP-PLAN.md` v3 against my round-2 blocking issues (B1–B3), the folded-in notes, and the renamed status `stale-inputs` with its new order.

## Round-2 blocking issues: status

| # | Status | Where |
|---|---|---|
| B1 Demo seed vs shot list | Resolved | §9 seeds Jibao-an ES with an override awaiting the SDO, 3 schools Official, and Pandac with no decision. §11 is a timed table (about 1:50). Test 14 checks the seeded counts and the Pandac slug. |
| B2 Unofficial correction | Resolved | §6 shows the correction only when the last level sent differs from the level in force. It can be copied only when the decision is Official, and shows "Correction ready after you re-confirm" until then. Journey 5 and test 13 cover it. |
| B3 08:15 re-confirm, two dates | Resolved | §3 has a date table with no implicit dates. Today has two dated cards, and the head re-confirms from the "Today" card on their usual link. The teacher gets "Tell your school head", with no claim of push notifications. Test 9 and journey 6 cover it. |

## New flows

- **Statuses a head sees on a phone:** acceptable. There are six statuses, but the first matching row wins and the head sees one sentence and one button at a time. A head who already chose a more protective level isn't asked to re-confirm, so needless prompts are avoided.
- **Coordinator's publish flow:** about one extra tap, with an admin-only preview. Finalising at the same value asks nothing. Good.
- **Head's path:** stated honestly as Record → Copy → Mark as sent. The name comes from the role picker. Fine.
- **Morning flow:** the teacher records readings, the head re-confirms on the Today card, and the morning update becomes official. Coherent.
- **Demo timing:** the six beats fit in 1:50. Shot 2 doesn't trigger a correction, because the level sent and the level in force are both HINGA. The Hinto preview at the end shows all four levels without publishing.

Nothing blocking remains.

## Non-blocking notes (priority order)

1. **Show the "Today" card for any status on today's record that needs action.** v3 shows it only for `stale-inputs` or a morning update. A same-day forecast correction (`publishForecast(today)`) makes today's records `stale-forecast`, and an SDO return on today's record is possible too. In those cases the head would have no card to act on. The plan still falls back safely to the rule level, but the parents' correction would never be offered. Fix: show the card whenever today's status isn't `official` or a correction is pending.
2. **Status wording on a phone.** The template "Re-confirm: {cause} call for X" gives "readings call for" but "water call for". Use fixed strings: "8:00 readings call for HINGA" and "No water: HINGA required". When both causes apply, show the readings string with "(also no water)".
3. **"Send rule-level message now" withdraws the override.** Say so on the button's confirmation ("This replaces your HINAY request; the SDO won't need to act"). That way the head doesn't think both are pending, and the SDO's queue drops the row instead of showing a stale one.
4. **Wait time for the Claude re-read in the demo.** The 8 s fallback can use up a third of the 0:55–1:25 beat. Rehearse with a cached result, or keep the keyword fallback ready, and say "Keyword fallback (no AI)" on air if it triggers.
5. **Seeded state and the confirmation prompt.** Make sure the Publish in shot 1 doesn't show "This marks N decisions re-confirm". The seeded decisions should be created by the Publish at 38 itself (as §9 implies), not sit beforehand at another value.
6. **The countdown "Past 17:00" in red** should also appear in the morning view as plain "Today's plan" (no countdown), so the 08:15 screen doesn't shout "late".
