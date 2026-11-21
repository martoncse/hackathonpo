VERDICT: APPROVE

# Presko web app plan v4: customer-journey review, round 4 (confirmation)

Reviewer: customer-journey agent (UX/UI). I checked that the v4 changes (my round-3 notes and the data agent's round-3 fixes) don't introduce a blocking UX problem. They don't.

## Round-3 notes: status
- **"Today" card trigger:** fixed. It now covers any non-Official status (when a forecast was published for today), a pending correction, and readings that raise the level.
- **Status strings:** fixed. They are now fixed text ("8:00 readings call for X", "No water: X required").
- **"Send rule-level message now":** fixed. Its confirmation now says it replaces the override.
- **Demo re-read:** fixed. It uses a cached result or the keyword fallback.
- **Demo seed:** fixed. It is a labelled system action run by Publish at 38, so no re-confirm prompt appears. It is marked `system: true` in the CSV, which is also a good trust cue.
- **Morning countdown:** fixed. There is none on the morning screens or the "Today" card.

## Data agent's fixes: UX check
- **Separate preview view model:** good for users. The coordinator's "marks N decisions re-confirm" count is now exact, and schools never see a draft.
- **Journey 5:** 38→39 keeps HINGA, so no correction is offered, which avoids pointless messages to parents. 42 gives "was HINGA, now HINTO", which is the right case for a correction.
- **`late` rule:** shown only on the tomorrow card and in the CSV. It isn't shown in the morning, so it doesn't shame the head at 08:15.
- **38→39→38 restores decisions made at 38:** this protects heads from a coordinator's typo.

## Non-blocking notes
1. **Match the "Today" card's button to the status.** The card lists "One-tap Re-confirm HINGA" for every case, but the button should be:
   - `none` → **Record HINGA**
   - `returned` → **Revise decision**, with the SDO's note shown
   - `stale-forecast` / `stale-inputs` → **Re-confirm HINGA**

   This follows the "one sentence, one button per status" rule already in §6.
2. **The 38→39→38 dialog.** If a head already re-confirmed at 39, that newer decision is the latest one, and at 38 it is stale again. Make the confirmation count ("restores N, marks M re-confirm") reflect this, so the coordinator isn't surprised.
3. **Make the demo seed visible.** In the Decisions queue, show the seeded rows with a small "demo seed" tag, matching the CSV, so a juror doesn't read them as real school input.
