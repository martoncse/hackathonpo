VERDICT: APPROVE

# Data review, round 4: `PRESKO/WEBAPP-PLAN.md` (v4)

Checked against `PRESKO/data-flow.html`, `PRESKO/engine.js` and `PRESKO/engine.test.mjs`.

## Round-3 blocking issues: both resolved
1. **Empty day.**
   - `withDay` now defaults every field (`water ?? true`, `readings ?? {}`, `decision ?? null`, `sent ?? []`, provenance).
   - The engine is hardened: `planSchool` uses `water !== false` and `readings?.`.
   - The CSV gets `sent` and `provenance` from `withDay`, and `late` is defined in Asia/Manila time.
   - Test 16 pins down the exact failure I reproduced (request count on an empty day vs explicit `water: true`, and no CSV crash).
2. **Two forecast values.**
   - `publishedHi` is gone, and the `hi` argument is the only forecast in a call.
   - Preview is a separate, unsaved view model using the draft, and N is counted under the preview.
   - Test 17 checks that the live view model, the Decisions queue and the CSV stay unchanged.
   - The demo's last shot (preview at 44: all `stale-forecast`, so the rule level is HINTO and every school shows "No classes anywhere") now follows from the spec.

## Invariants re-checked end to end
- **Status order and effective level.** Every row except `official` uses the rule level, or the worse of decided and rule. A less protective level counts only when it is official, which means approved.
- **Correction rule vs journey 5.**
  - 38 → 39: the rule level stays HINGA, equal to the level sent, so no correction. ✓
  - 38 → 42: the level in force is HINTO, not the HINGA that was sent, so "Correction ready after you re-confirm" appears. After re-confirming it is official and copyable. ✓
  - Test 13 matches both.
- **Dates.** Water and the decision for tomorrow live in `days[today+1]`, readings in `days[today]`, and the 08:15 re-confirm goes to `days[today]`. `inputsSnapshot` lets the engine compute the cause instead of guessing it. Test 9 covers the D and D+1 split.
- **Sign-off.** It checks `currentStatus` and `latestId`, and a re-confirm creates a new id, which resets approval. Test 12 covers this.
- **Replay, persistence, roster hash, provenance labels and the §7 input table** all still match the diagram. The global `forDate` has been removed from the store.
- **UX additions.** The fixed status strings, the confirmation text for "Send rule-level message now", no countdown on morning screens, and the cached re-read in the demo don't touch any data invariant.

## Non-blocking notes (fix during build)
1. **`late` on morning re-confirms.** By the §3 rule, every 08:15 `stale-inputs` re-confirm for today is `late = true`, because it comes after 17:00 the day before. This makes the CSV look worse than what happened. Either:
   - add `kind: "evening" | "morning-reconfirm"` to the decision and only flag evening decisions, or
   - compute `late` only when the decision isn't a re-confirm caused by `stale-inputs`.

   Add a case to test 18.
2. **Finish the engine hardening.** `explain()` also uses `!school.water` ("No water at school forces at least Hinga"). Change it to `water === false` together with `planSchool`, so a missing value can't produce a false reason line. In `withDay`, use `day.water?.[id]` etc. too, in case a day record has only a forecast.
3. **Demo seed trigger.** Make it a one-shot flag (`demoSeedPending`) that Demo reset sets and the first Publish clears. It should run only at `hi = 38`, so journey 1 (publish 40.5 after a reset) doesn't seed anything. Add the "system: demo seed" exception to the §2 permission table, and add a `system` column to the §4.6 CSV column list. §9 already says the CSV marks it.
4. **Draft storage.** Say whether the admin draft (38 after Demo reset) is saved, for example as `adminDraft` outside `days`, or is view state only. That decides what a reload in the middle of the demo shows.
5. **Wording.** §5 "official face-to-face sections tomorrow" should read "for `planDate`". §3 row 2 should say "≠ the `hi` passed in (the published value in live views)", to match §4.1.
