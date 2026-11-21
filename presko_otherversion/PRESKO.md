# Presko: the school-heat engine, taken beyond France (Philippines case)

> **Update, 21 Nov 2026: rebuilt around DepEd's 4H levels.** Verified research ([reports/Presko prototype plan verified.md](reports/Presko%20prototype%20plan%20verified.md)) showed that the plan below predates DepEd Memorandum 064 s. 2026. Under that memo, 33–41°C (Hinga) suspends face-to-face classes and 42°C+ (Hinto) stops home-based work too, so "keep a morning shift at 44°C" is no longer allowed.
> The prototype in `PRESKO/` now does the following:
> - Gives each school a 4H level for tomorrow.
> - On Hinay days, plans a 06:00–10:00 / 14:00–18:00 day.
> - Uses building notes as flags: hot rooms to check at 8:00, and cooler rooms that give grounds to ask the SDO for face-to-face back.
> - Computes the replay heat as a calibrated NWS heat index.
> - Replays 1 Apr 2024 (66 of 66 schools) and 3 Nov 2026.
> - Positions Presko as a heat module for DepEd's LIGTAS+.
>
> DO 37 s. 2022 is repealed. The 91% learning-poverty figure is 2019 data. See `PRESKO/PITCH.md` for the current script, slides and "don't claim" list. The rest of this file is kept as the original rationale.

*This is the global version of [FRAICHEUR.md](FRAICHEUR.md), produced after the team asked for less France-centric ideas.*

**How it was chosen (round 5):** each reviewer re-scored the heat engine for a non-French setting and proposed 2 new non-French ideas: EAP Trigger Desk, ClassBack, TriggerWatch, GhostCheck, TenderTell and BasisCheck. **All three reviewers independently picked this one, with the Philippines as the case:**

| Reviewer | Score as written | With the changes below |
|---|---|---|
| Feasibility | 8 | 9 |
| Impact | 8 | 9 |
| Novelty | 8.5 | 9 |

**Round 6 (PRESKO.md as written): feasibility 9 ✅ · impact 9 ✅ · novelty 9 ✅.** All three reviewers are satisfied at the raised bar, and their final nice-to-haves are folded in.
- Novelty drops to about 8.5 if the replay's N can't be sourced from a Division memo.
- Build estimate: about 4h40m plus deploy.

*"Presko" is Filipino for "fresh / cool". The French name is dropped. Explain it once on the title slide.*

---

## The idea in one line

**When the heat index spikes, Presko tells each school in a Schools Division whether tomorrow runs a full day, a morning-only shift, or alternative delivery, and drafts the message to parents.**

*Lens: public policy.*

## Problem (15%)

- **Global:** in 2024, climate hazards disrupted schooling for **at least 242 million students in 85 countries**. Heatwaves were the biggest hazard, affecting 171 million, and 74% of affected students were in low- and lower-middle-income countries (UNICEF, *Learning Interrupted*, Jan 2025: [press release](https://www.unicef.org/press-releases/nearly-quarter-billion-childrens-schooling-was-disrupted-climate-crises-2024-unicef), [report](https://www.unicef.org/reports/learning-interrupted-global-snapshot-2024)). All three reviewers verified these figures.
- **Philippines, April 2024:**
  - By 25 April, **7,188 of 47,678 public schools** had suspended in-person classes ([Manila Bulletin](https://mb.com.ph/2024/4/25/dep-ed-face-to-face-classes-suspended-in-7-188-schools)).
  - On one day, 5,288 schools and more than 3.6 million students were affected ([Dawn/AFP](https://www.dawn.com/news/1825981)).
  - On 29–30 April, DepEd (the Department of Education) suspended in-person classes in **all** public schools nationwide, with a 45°C heat index in Manila ([Rappler](https://www.rappler.com/philippines/department-education-suspends-in-person-classes-extreme-heat-april-29-30-2024/)).
- **The gap:**
  - DepEd Order 037 s.2022 lets **each school head** switch to alternative delivery (modular or online learning) once the heat index reaches about 40°C ([PNA](https://alpha.pna.gov.ph/articles/1222090), [PIA](https://pia.gov.ph/news/2024/04/05/deped-allows-modular-classes-in-calabarzon-schools-due-to-extreme-heat)).
  - In practice the choice is all or nothing: a full day in heat, or a full day lost.
- **Why lost in-person hours matter here:**
  - In 2022, 91% of late-primary-age children were not proficient in reading, up from 69.5% in 2019. The World Bank attributes the rise to the COVID shift to distance learning ([Inquirer](https://newsinfo.inquirer.net/1632864/wb-ph-learning-poverty-among-highest-in-region)).
  - A later 2023 figure of about 67% exists, so give the 2022 figure with its year.
  - **Pitch line:** *"The Philippines has already seen what distance learning costs."*
- **Contrast for Q&A:** Bangladesh closed every school, affecting 33 million children, and a court then extended the closure, exempting only schools with AC ([Save the Children](https://www.savethechildren.net/news/bangladesh-extreme-heat-closes-all-schools-and-forces-33-million-children-out-classrooms)). *"Blanket closures are the alternative to deciding school by school."*

## User and moment

- **User:** the **Schools Division DRRM coordinator** (the division's disaster risk reduction and management officer) at 16:00, the day PAGASA (the national weather service) forecasts a dangerous heat index for tomorrow.
- **What they produce:** a recommendation for each of the division's schools, sent to its school head. Under DO 037 the **school head decides**, so each school head gets a one-screen recommendation to confirm.
- **Who else sees it:** the Schools Division Superintendent gets the division map.

## What's in (3 features)

1. **A heat band for each building, transparent.**
   - The forecast heat index for each school comes from the archive or forecast data.
   - The AI extracts building features from free-text notes: tin roof, makeshift or temporary classroom, ventilation, shade, storeys.
   - A **fixed, visible rule** combines the two into green, amber or red per building. It is anchored on the DO 037 threshold of about 40°C and on PAGASA's heat-index categories (*verify the category cut-offs*).
   - Building notes are labelled **"illustrative: the division fills in its own"**.
2. **A deterministic schedule plan with "0 conflicts".**
   - Rooms are often scarce and schools often run double shifts, so the plan moves **time**, not rooms.
   - Each school gets one of three plans:
     - **Full day.**
     - **Morning-only shift:** both shifts are compressed to roughly 06:00–11:00 where classroom count × time slots fit the sections.
     - **Alternative delivery:** for the red buildings, or where the morning slots can't hold the sections.
   - An **independent checker** shows 0 sections without a slot and 0 rooms double-booked.
   - Room swaps survive only as a drill-down for one school.
   - The AI writes a one-line "why" for each school.
3. **Parent messages.**
   - SMS and a Facebook-group post per school, in **Filipino, the regional language (for example Hiligaynon) and English**.
   - A 30-second **radio script** for the division, as a second channel.

## Demo moment

0. **"Replay April 2024":** one real Schools Division, using real school locations and the real heat from the archive that day. *"That day, N schools in this division went fully to alternative delivery. Presko would plausibly have kept the morning shift in person at M of them."*
   - N comes from DepEd or news reports for that division where available; otherwise it is the count implied by the ≥40°C rule.
   - M is computed by the solver, never typed in.
   - The on-screen label reads "in-person learner-hours potentially kept (illustrative building data)".
1. A Leaflet map of the division, with all schools grey.
2. The juror moves the slider: **"Heat index tomorrow: 44°C"**. Schools turn green, amber or red. The plan reads, for example, *"23 full day · 41 morning shift · 9 alternative delivery · 0 conflicts"*.
3. **The live AI moment:** the juror edits one school's note (for example, "roof insulated last year"). That school is re-scored live and moves from alternative delivery to a morning shift.
4. The juror opens that school head's recommendation, then the SMS in Hiligaynon.

## Real data (feasibility-checked, under 1 hour to wire up)

- **School locations:** the HOT OpenStreetMap export on HDX (GeoJSON, updated monthly): [hotosm_phl_education_facilities](https://data.humdata.org/dataset/hotosm_phl_education_facilities). Filter to one division, about 20 min.
- **Heat:** the Open-Meteo historical archive, free and without a key ([docs](https://open-meteo.com/en/docs/historical-weather-api)). Use `apparent_temperature_max` as a **proxy** for PAGASA's heat index (say so on screen), cached as JSON, about 20 min.
- **Division choice:** a **city** division in Region VI, for example **Iloilo City** (roughly 80–150 schools; *count unverified*), with Hiligaynon as the regional language.
  - The OSM export has no Schools Division field, so filter by the city's bounding box or the `addr:city` tag. A province-wide division would mean more than 1,000 markers plus a boundary join.
  - Fallbacks: a Calabarzon city division, or Quezon City.
- **Heat data:** fetch all coordinates in **one batched Open-Meteo call**. The archive grid is coarse, so nearby schools share a heat value. That's fine: the building notes create the difference between schools.
- **N in the replay:** if no Division memo gives N, label it **"rule-implied"**. The replay then compares the ≥40°C rule with the solver.
- **Classroom counts and building notes:** synthetic, labelled illustrative.

## Competition

- We found **no operational per-school, next-day heat tool**.
- What exists is guidance, risk maps or national plans:
  - CDRI's *Heat Smart Schools* guidance ([PreventionWeb](https://www.preventionweb.net/publication/documents-and-publications/heat-smart-schools-guidance-building-resilience-extreme-heat));
  - UNICEF's 2023 heat-stress technical note;
  - Arup's UHeat, which maps London school risk for planning.
- **Line for the deck:** *"Guides say what to do in heat. Risk maps say where. Presko says what each school does tomorrow morning."*

## Deployment (35%)

- **Owner:** DepEd's Disaster Risk Reduction and Management Service, piloted in one Schools Division. School heads keep the decision under DO 037.
- **Funding and scale:** **UNICEF Philippines**, through its education and climate-resilience programme. *Check that this programme exists and who to name before quoting it. If it can't be confirmed by 16:00, present UNICEF as a **target partner**; DepEd's disaster-risk office stays the owner.*
  - Then the other heat-affected countries in UNICEF's April 2024 list: Bangladesh, Cambodia, India and Thailand.
  - The engine is country-agnostic. Each new country swaps the threshold rule, the languages and the decision-maker.
- **Data:** school locations and building notes only; no pupil data.
- **Rollout:** one division for the 2027 hot season (March–May), then one region, then a second country.

## Indicators and side effects

**Indicators:**
- **In-person learner-hours kept per heat alert.** This is the headline.
- Share of sections in red buildings after 11:00 on alert days.
- Time from the PAGASA forecast to the parent message.

**Side effects:**
- **False reassurance if a heat band is wrong.** Mitigation: the rule is visible, and the school head can always override.
- **Pressure to keep schools open.** Mitigation: alternative delivery is always available, and the school head decides.
- **Unequal reach.** Alternative delivery assumes modules or connectivity at home, so flag it as a cost, not a neutral option.

## Build plan (≈5h)

| Step | Time |
|---|---|
| Pull and cache the HDX schools and Open-Meteo data for one division | 40 min |
| Synthetic building notes plus feature extraction (cached) | 45 min |
| Heat-band rule table, visible | 20 min |
| Schedule solver plus an **independent** checker | 50 min |
| Leaflet map with coloured markers | 45 min |
| Parent SMS, Facebook post and radio script (3 languages, no right-to-left) | 30 min |
| Replay April 2024 | 30 min |
| Deploy, video, buffer | rest |

- **Build gate:** the core path must be deployed at a public link before the replay and the multilingual extras are started. The core path is: slider → colours → plan → "0 conflicts".
- **Replay first:** once the gate is passed, build the replay before any extra, and put it in the video.
  - Take N, the number of schools that switched to alternative delivery, from a **published Division memo** for a real April 2024 date, and show the memo's reference on screen.
  - Without a real N, the novelty score falls to about 8.5.
- **Cut order:** first the radio script, then the room drill-down, then the third language.
- **One live AI call only**, with a cached answer served if it takes more than about 8 s.

## Before 16:00

- Pick the division and confirm its April 2024 alternative-delivery numbers. This is the policy person's job, with a 45-minute limit.
- Verify PAGASA's heat-index category cut-offs.
- Check what UNICEF Philippines' resilience programme is called.
- Get one mentor quote. Florentin Koch or Pierre Noro (GovTech) are good options for an international public-sector rollout.

**Final submission: today, Saturday 16:00.**
