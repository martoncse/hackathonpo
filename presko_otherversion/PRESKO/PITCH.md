# Presko — video script and slides

*Sciences Po AI Hackathon 2026 · submit by 16:00 · Lens: public policy*
*Prototype: https://claude.ai/artifact/6EgnVPLGoG67qXwMnvY6bs (republish from `PRESKO/` before submitting; set sharing to public). Local copy: run `node PRESKO/serve.mjs`, open http://localhost:5180 (opening index.html straight from disk fails: browsers block module imports from file://). Tests: `node --test PRESKO/`.*
*Evidence behind every claim: [reports/Presko prototype plan verified.md](../reports/Presko%20prototype%20plan%20verified.md).*

## The line
> **"Since October, DepEd's 4H rule gives every school four heat levels. Someone still has to pick tomorrow's level for 66 schools by 5 p.m., say which rooms to check, and tell parents before the fake 'walang pasok' pages do. Presko does that, and the school head decides."**

*"Presko" is Filipino for "fresh / cool". 4H = Hayo, Hinay, Hinga, Hinto.*

## Opening (3 sentences, under 20 words each)
1. "On 1 April 2024, all 66 public schools in Iloilo City closed classrooms on a 41°C forecast." (17)
2. "Today, DepEd's 4H rule asks each school head to choose one of four heat levels." (15)
3. "Presko makes that call for every school by 5 p.m., with the parent message." (14)

## Demo video (under 2 minutes) — shot list
| # | Screen | Voice-over |
|---|---|---|
| 1 | Title card: "1 April 2024: 66 of 66 Iloilo City public schools closed classrooms" | "In April 2024, heat closed classrooms across the Philippines. Heatwaves disrupted schooling for 171 million students worldwide that year." |
| 2 | Presko at "Hinay · 30°C": orange/amber map, "0 rule conflicts" | "This is the Schools Division of Iloilo City: 69 real schools from OpenStreetMap. Under DepEd's 4H rule, 27 to 32 degrees is Hinay: a shortened day. Presko fits every section into 06:00–10:00 and 14:00–18:00, keeps hot rooms empty, and a separate checker confirms nobody is in class at midday." |
| 3 | Click "Hinga · 38°C": map turns red and blue | "At 33 degrees and above, it's Hinga: no face-to-face. Presko says so for every school, but it also flags 22 schools in blue: their cooler rooms could hold classes on shortened hours. That's grounds to ask the division for face-to-face back. Iloilo did exactly that in 2024 for schools that could handle the heat." |
| 4 | Open Pandac Elementary: two hot buildings, home-based | "Pandac's main building sits under a bare metal roof, facing west. No grounds to ask." |
| 5 | Edit **Building A**'s note: "Ceiling and roof insulation installed last year, windows on both sides, shade trees." → Re-read with Claude | "The coordinator corrects one note. Claude reads it into features, never temperatures. The rule is fixed and visible." |
| 6 | Building turns "cooler"; Pandac turns blue; the face-to-face request for the SDO appears (14 of 22 sections) | "Now Pandac has a request ready for the division: 14 sections in cooler rooms, early and late, nobody at midday." |
| 7 | Message to parents: English → Filipino → Hiligaynon | "And a message for parents in English, Filipino and Hiligaynon, naming the school head, the division and PAGASA's forecast, so parents know it's official." |
| 8 | Click "Replay 1 April 2024" | "1 April 2024. PAGASA forecast 41 degrees; our calibrated heat index says 41.2. All 66 schools closed, which is what 4H would say too. Presko adds the exceptions: which schools could have asked to stay open, and a message ready before 5 p.m. Building data here is illustrative; a division fills in its own." |
| 9 | Click "Hinto · 44°C": all purple | "At 42 and above, Hinto: nothing, not even modules. Presko sends a stay-cool message, not homework." |

**Record from the claude.ai view** (the live Claude re-read needs it). Without Claude, the page says "Keyword fallback (no AI)" and still works; say so.

## Six slides (organisers' sections)
1. **Problem** — 1 Apr 2024: all 66 Iloilo City public schools closed (GMA Regional TV). Nationally, 7,188 of 47,678 schools on alternative delivery by 25 Apr 2024. Heatwaves hit 171M students in 2024 (UNICEF). Now DM 064 s. 2026 (Oct 2026) makes the school head choose a 4H level, in practice from PAGASA's next-day forecast, and inform the SDS: 66 calls every hot afternoon. On 3 Nov 2026, 73,127 Iloilo City learners were sent home on a 43°C forecast. Stakes: 9 in 10 Filipino 10-year-olds can't read a simple text (World Bank, 2019 data, the latest).
2. **Solution** — screenshot at Hinga. Forecast → 4H level per school (fixed rule = PAGASA categories) → plan: shortened day on Hinay, home-based on Hinga, nothing on Hinto → building notes read by Claude flag hot rooms to check at 8:00 and cooler rooms that justify an F2F request → independent "0 rule conflicts" check → official parent message in three languages. "The school head decides, with the SDO."
3. **Scale** — one division: 66 public schools, 75,890 learners, 2,242 classrooms (DepEd via TeacherPH). 47,678 public schools nationally. The engine swaps the rule table for Bangladesh, Cambodia, India and Thailand (UNICEF's April 2024 list).
4. **Impact** — indicators: time from PAGASA's forecast to parent message (target before 17:00); share of schools with a level set the day before; F2F requests filed and approved; on Hinay days, face-to-face learner-hours kept. Side effects: the Hinay day is 4 h, not 6; home-based work assumes modules or a connection (under half of households had home internet in 2024); a wrong building flag could justify a hot room, so the 8:00 indoor reading always wins.
5. **Deployment (owner, funding, pilot)** — Owner: DepEd DRRMS, which also runs **Project LIGTAS+** (launched Aug 2026, school-level hazard decisions). Presko is the heat module that plugs into it. Piloted in SDO Iloilo City; the DRRM coordinator runs it at 16:00. Data: school locations and building notes only, no pupil data. Funding: UNICEF Philippines as *target partner* (hook: its 2025 Climate Landscape Analysis for Children).
6. **Go-to-market / next** — Week 1: division fills in real building notes; one meeting with SDO Iloilo City on the memo text. Month 1: request PAGASA station data (TAMSS) to replace our 4-day calibration; validate building flags against classroom hygrometer readings. Then the 2027 hot season, one region, a second country.

## Q&A — one line each
- **"Isn't this just the 4H table?"** The table is one line of code. The work is 66 calls by 5 p.m., the hot rooms, the exceptions, and an official message: that's what heads do by hand today.
- **"Doesn't LIGTAS+ do this?"** LIGTAS+ is DepEd's multi-hazard platform and its school-level recommendations are still being reviewed. Presko is heat-specific, next-day, mapped to 4H, with parent messages. We'd plug in, not compete.
- **"Are the colours real?"** School locations and heat are real; building notes are illustrative. The division writes its own; that's onboarding.
- **"How do you know a room is hot?"** We don't estimate temperatures. A fixed, published rule turns features into a flag; the 8:00 indoor reading always overrides.
- **"Why AI?"** Notes are free text written by busy staff; Claude turns them into features with quoted evidence. Levels, plans and checks are deterministic.
- **"Heat data?"** On the day, the coordinator types PAGASA's 5 p.m. forecast. For the replay we compute the NWS heat index from Open-Meteo temperature and humidity and add +3.7°C, fitted on 4 PAGASA days. It then matches PAGASA's forecasts for 1, 25 and 30 April within 0.3°C. On 3 Nov 2026 it ran 2.6°C low, which is why PAGASA's figure is the input.
- **"Who decides?"** The school head, with the SDO, informing the Superintendent (DM 064 s. 2026; DO 22 s. 2024). The city can override (EO 24 s. 2025); Presko shows it.
- **"Who pays?"** DepEd DRRMS owns it; UNICEF Philippines as target partner; it costs almost nothing to run.

## Don't claim
- that Presko keeps classrooms open on Hinga or Hinto days, or any "85% of learner-hours" figure
- that the building data is real, or that Presko predicts classroom temperatures
- that DO 37 s. 2022 is current (repealed by DO 22 s. 2024)
- a 40°C automatic trigger under EO 130 s. 2026, or one settled EO 24 threshold
- a sourced learner count for 1 April 2024 (≈76k is an enrolment estimate)
- that Iloilo schools use SMS blasts, or that the Hiligaynon templates are official wording
- that UNICEF, DepEd or LIGTAS+ have agreed to anything
- that Presko is the first school-level suspension tool
- that we read the DM 064 PDF (we relied on reporting)
