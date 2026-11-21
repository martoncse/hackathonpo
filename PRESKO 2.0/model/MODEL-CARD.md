# Presko safety model v2.1 (draft): model card

**Question:** is it safe for children to be in school tomorrow, session by session and building by building?

**Files:**
- `safety-model.js`: the model (pure functions).
- `backtest.mjs`: runs it on real weather, the 2024 suspensions and the 3 Nov 2026 closures, then writes `results.json`.
- `data/`: Open-Meteo hourly archive for Iloilo City, March–May 2023–2025 and 20 Oct–19 Nov 2026.

Run it with `node "PRESKO 2.0/model/backtest.mjs"`.

## How the model sits under the rules (21 Nov 2026)

The regulation decides what is allowed; the model decides which rooms are safe. Rules live in `../rules.js`, sourced from reporting on DM 064 s. 2026, DO 22 s. 2024, EO 130 s. 2026 and Iloilo City EO 24 s. 2025. The primary texts returned 403.

| DM 064 level | What the rule allows | What Presko does with the model |
|---|---|---|
| Hayo < 27 °C | Regular face-to-face classes, with precautions | Full day if rooms are safe all day; otherwise a short day or home-based |
| Hinay 27–32 °C | Shortened day (06:00–10:00 / 14:00–18:00), hybrid or home-based | Fits each section into a safe room for one 4-hour slot; nobody at school at midday |
| Hinga 33–41 °C, or no water | No face-to-face; light home-based work | Home-based. If rooms stay below the **caution** line (WBGT 28) in a short-day slot, the school gets "grounds for F2F": a request the SDO can approve |
| Hinto ≥ 42 °C | All academic activity suspended, including home-based | No classes and no homework |

Also enforced:
- The principal chooses the level with the SDO and informs the SDS.
- Any change from the level's default plan needs SDO approval ("the school head cannot just decide to send students home").
- The Iloilo City EO 24 threshold can be set to 40, 41 or 42 °C.
- DO 37 s. 2022 is repealed (by DO 22 s. 2024) and is no longer cited.

**Consequence for the 3 Nov 2026 replay:** at 43 °C (Hinto), the rule closes every school, and Presko agrees. The figures further down ("would keep 38–52 open") describe the model alone, before these rules were applied.

## What changed from v2 (and why)

| New evidence | Change in the model |
|---|---|
| **DepEd Memorandum 064, s. 2026, "4H" tiers:** Hayo < 27, Hinay 27–32, Hinga 33–41, Hinto ≥ 42 °C. Principals decide. | The outdoor tier is reported in DepEd's own terms (`tier4H`). Hinto is the point where the model must justify keeping each school open. |
| **Memo 064 checkpoints:** indoor temperature at 08:00, 12:00 and 14:00. | **The model learns from these readings.** Each building gets a correction = average (measured − estimated), shrunk toward 0 until readings build up (`learnCorrection`). At Hinto, a building with no readings gets a +1 °C safety margin. |
| **EO 130 (28 Oct 2026):** school-level suspensions "to respond to documented, site-specific threats". | Every unsafe session returns `evidence`: the exact building, hour and estimated WBGT, or the commute hour and heat index. |
| **35–50 learners per room**, and **46 % of classrooms have 1–2 fans** (ACT-NCR 2024). | Body heat and moisture scale with the number of learners in the room (40 ≈ +1.0 °C). Fans lower WBGT by 0.6 (one fan) or 0.9 (two or more), but only while indoor air is below 35 °C. |
| **3 Nov 2026:** 65 Iloilo City schools closed at a forecast heat index of 43 °C. | Replayed as a backtest (below). Also a fifth data point for the PAGASA vs Open-Meteo gap. |
| **Record heat index:** 53 °C in 2024 and 60 °C in 2023. | The day veto at 52 °C stays. It is a real scenario, not a theoretical one. |

## Why this is still not a trained classifier

The only real labels are suspension decisions, and those don't track heat:
- The 2024 Iloilo suspension days are no hotter than open days (AUC 0.50).
- 30 open days were hotter than the median suspended day.

What *can* be learned is each building's real behaviour, from the 08:00 / 12:00 / 14:00 readings that Memo 064 already asks schools to take. That is the learning part of v2.1.

## How it works

1. **Outdoor tier (4H):** from the PAGASA forecast heat index. In backtests, Open-Meteo is corrected toward PAGASA.
   - The gap on order days was +3.3, +3.5, +4.2, +4.7 (April 2024) and +6.3 °C (3 Nov 2026).
   - The correction is applied in proportion to how close each hour is to the day's peak, because the forecast is a peak value.
2. **Day veto:** forecast heat index ≥ 52 °C (PAGASA "extreme danger: heat stroke imminent") → no school.
3. **Commute veto:** heat index during arrival and dismissal hours, plus a sun allowance (+4 °C at full sun, with half the walk in sun), ≥ 50 °C → that session is cancelled.
4. **Classroom, per building and per hour:**
   - **Indoor temperature** = outdoor temperature + building offsets + learners' body heat + learned correction (+1 °C margin at Hinto with no readings).
   - **Indoor humidity** comes from outdoor water vapour plus learners' breath and sweat.
   - **WBGT** = 0.7 × wet bulb + 0.3 × globe, minus the fan effect.
5. **Limits for children:**
   - Any hour at WBGT ≥ 31 rules the room out for that session.
   - WBGT 28–31 means the session runs with water and rest breaks.
   - Sources: Japan Ministry of the Environment (stop children's activity at 31); ISO 7243 (about 30 for light work).
6. **School result:** full day if the full-day session is safe; otherwise morning, then afternoon; otherwise closed. Each closure comes with its evidence.

## Building offsets (°C above outdoor)

| Feature | Offset | Evidence |
|---|---|---|
| Metal roof, no ceiling | 0.3 + 2.3 × sun | **Calibrated:** Accra, mean +2.2 (model +2.3) |
| Ceiling under metal roof | −0.6 + 0.5 × sun | **Calibrated:** Accra, mean −0.2 (model −0.2) |
| Makeshift / tent | 0.8 + 2.8 × sun | Assumption |
| Top floor under roof | 0.8 × sun | Assumption |
| Faces west | 0.4 + 1.2 × sun after 13:00 | Assumption |
| Poor / cross ventilation | +0.8 / −0.6 | Assumption |
| Shade trees | −0.8 × sun | Assumption |
| Learners | +0.025 °C per learner | Assumption |
| Fans (indoor < 35 °C only) | WBGT −0.6 / −0.9 | Assumption |
| Air-conditioned | room held at 27 °C, 60 % | Assumption |

All of the assumptions are replaced by each building's learned correction once readings come in.

## Results

**3 Nov 2026 replay** (forecast 43 °C, Hinto; Open-Meteo peak 36.7 °C, corrected +4.85 °C at the peak hour). The building data is illustrative.

| | Full day | One session | Closed (of 70) |
|---|---|---|---|
| No indoor readings (+1 °C margin) | 29 | 9 | 32 |
| Readings that confirm the estimates | 29 | 23 | 18 |

In reality, 65 Iloilo City schools closed. The model would have kept 38–52 of these 70 schools open in some form, and recorded a site-specific reason for each one it closed.

**Pandac ES, 3 Nov 2026:** closed.
- Every building crossed WBGT 31 by 10:00: Building A 32.8, Building B (tent) 33.3, Building C 32.5.
- The commute peaked at a heat index of 46.9, below the veto.

**Learning demo** (simulated readings, real weather). Pandac Building A's records say "metal roof, no ceiling", but suppose a ceiling was fitted after the survey (true temperature about 3 °C below the estimate).
- After 3 readings the learned correction is −1.6 °C; after 30 readings (10 days), −2.8 °C.
- On 3 Nov its morning peak WBGT drops from 32.8 (unsafe) to 30.9 (safe), so the building reopens for the morning.

**2024 hot season (PAGASA-corrected):**
- 30 of 61 school days were Hinto and 31 were Hinga.
- On Hinto days the model kept an average 39.5 of 70 schools open in some form.
- Commute and day vetoes never fired. The worst commute heat index was about 49 °C.

**Sensitivity to the classroom limit (2024):**

| Unsafe at WBGT ≥ | School-days with no safe session | Days most schools not full day | Worst day closed |
|---|---|---|---|
| 30 | 2,211 | 43 | 67 / 70 |
| 31 (chosen) | 1,187 | 28 | 58 / 70 |
| 32 | 549 | 11 | 18 / 70 |

## Limits

- **Building data is illustrative.** The replay shows what the model *would* do, not what was right on 3 Nov.
- **Correcting to a forecast inherits the forecast's error.** On 3 Nov the corrected outdoor peak is 36.3 °C, high for November.
- **Most offsets are assumptions** until readings arrive. The two calibrated ones come from Ghana.
- **The 4H tier actions for Hinga could not be confirmed** from the memo text.
- **EO 130's full text was not read;** its terms here come from news reports.
- **Health outcomes are not modelled** (hydration, illness, uniforms, acclimatisation).

## Sources

- DepEd Memorandum 064 s. 2026, EO 130, and the 3 Nov 2026 closures:
  - https://www.dailyguardian.com.ph/blog/extreme-heat-suspends-classes-in-122-western-visayas-schools
  - https://www.gmanetwork.com/news/topstories/nation/1008199/qc-aligns-heat-related-class-suspension-rules-with-deped-marcos-eo/story/
  - https://tribune.net.ph/2026/09/03/angara-seeks-marcos-approval-for-new-rules-on-class-suspensions
- ACT-NCR teacher survey (heat and fans): https://mb.com.ph/2024/4/1/87-of-metro-manila-teachers-say-classroom-heat-hinders-effective-teaching-learning-survey
- PAGASA on school heads making the final call: https://pagasa.dost.gov.ph/press-release/155
- Amankwaa et al. (2025), roofing and classroom temperatures, Accra: https://journal-buildingscities.org/articles/10.5334/bc.581
- Japan Ministry of the Environment WBGT guidance: https://www.wbgt.env.go.jp/en/wbgt.php
- Japanese study on school heat illness and WBGT (2024): https://link.springer.com/article/10.1007/s00484-024-02812-4
- ISO 7243: https://cdn.standards.iteh.ai/samples/67188/5a4c5553da5945aa872478c36755cded/ISO-7243-2017.pdf
- NWS, full sun adds up to 15 °F: https://www.weather.gov/safety/heat-index
- Iloilo City 2024 suspensions:
  - https://www.gmanetwork.com/regionaltv/news/101176/no-inperson-classes-in-iloilo-city-from-preschool-to-shs-on-april-1-and-2/story/
  - https://mb.com.ph/2024/4/3/classes-on-all-levels-in-iloilo-city-cancelled-due-to-extreme-heat
  - https://www.sunstar.com.ph/iloilo/iloilo-city-extends-suspension-of-face-to-face-classes-for-all-levels-on-april-4-due-to-extreme-heat
  - https://www.manilatimes.net/2024/04/26/regions/classes-halted-anew-in-iloilo-city-schools/1943313
- DepEd nationwide suspension, 29–30 April 2024: https://www.rappler.com/philippines/department-education-suspends-in-person-classes-extreme-heat-april-29-30-2024/
- Weather: Open-Meteo historical archive, https://open-meteo.com/en/docs/historical-weather-api
