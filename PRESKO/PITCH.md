# Presko — video script and slides

*Sciences Po AI Hackathon 2026 · submit by 16:00 · Lens: public policy*
*Prototype: https://claude.ai/artifact/6EgnVPLGoG67qXwMnvY6bs (set sharing to public before submitting). Local copy: `presko/` — run `node presko/serve.mjs`, open http://localhost:5180.*

## The line
> **"When the heat index spikes, the Philippines' choice is all or nothing: a full day in a tin-roofed oven, or a whole day lost. Presko gives every school a third option — a plan for tomorrow, room by room — and the school head decides."**

## Opening (3 sentences, under 20 words each)
1. "On 29 and 30 April 2024, every public school in the Philippines closed its classrooms because of heat." (18)
2. "We built Presko, which plans tomorrow for each school in a division, room by room." (15)
3. "Watch: one note about a roof changes a school's whole day." (11)

## Demo video (under 2 minutes) — shot list
| # | Screen | Voice-over |
|---|---|---|
| 1 | Title card: "29–30 April 2024: all public schools suspended in-person classes" | "In April 2024, heat closed classrooms across the Philippines. Heatwaves disrupted schooling for 171 million students worldwide that year." |
| 2 | Presko at "Normal April day · 34°C": map almost all green | "This is the Schools Division of Iloilo City: 70 real public schools from OpenStreetMap. On a normal April day, almost everyone runs a full day." |
| 3 | Click "Danger · 44°C": dots change; summary shows full day / morning / modules / **0 conflicts** | "PAGASA forecasts 44 degrees tomorrow. Instead of closing everything, Presko proposes a plan per school: full day, morning only, or modules for some sections. A separate checker confirms zero conflicts." |
| 4 | Open Pandac Elementary: red building, 12 sections on modules | "Pandac's top floor sits under a bare metal roof, facing west. Twelve sections would lose the day." |
| 5 | Edit the note: "ceiling and roof insulation installed last year, windows on both sides, shade trees" → Re-read with Claude | "The coordinator corrects one note. Claude reads it into features — never temperatures. The rule is fixed and visible." |
| 6 | Building turns green; plan becomes "Morning shift", 0 on modules | "Now every section fits in the morning. Twelve classes keep their teacher tomorrow." |
| 7 | Message to parents: English → Filipino → Hiligaynon (AI draft) | "The school head gets a recommendation and a message to parents in English, Filipino and Hiligaynon — and decides." |
| 8 | Click "Replay 30 April 2024" | "Replay 30 April 2024: at Iloilo's heat that day, Presko would have kept 85% of in-person learner-hours instead of zero. Building data here is illustrative; a division fills in its own." |

**Record from the claude.ai view** (Claude re-read and Hiligaynon need the AI). If Claude isn't available, the page says "keyword fallback" and still works — say so.

## Six slides (organisers' sections)
1. **Problem** — 29–30 Apr 2024 nationwide suspension (Rappler); 7,188 of 47,678 schools suspended by 25 Apr (Manila Bulletin); 171M students hit by heatwaves in 2024 (UNICEF). Learning poverty: 91% of late-primary children not proficient in 2022 (World Bank via Inquirer) — "the Philippines has already seen what distance learning costs."
2. **Solution** — screenshot at 44°C. Three steps: read building notes (Claude) → fixed heat rule (PAGASA categories + building points) → plan per school + independent "0 conflicts" check → message to parents. "The school head decides" (DepEd Order 37, s. 2022).
3. **Scale** — one division = 70 schools mapped (Iloilo City); 47,678 public schools nationally; same engine for Bangladesh, Cambodia, India, Thailand (UNICEF's April 2024 list) by swapping thresholds, languages and decision-maker.
4. **Impact** — headline indicator: **in-person learner-hours kept per heat alert** (85% vs 0% on the 30 Apr replay; illustrative building data). Also: time from PAGASA forecast to parent message. Side effects: morning-only is ≤5 h, not 6; modules assume materials/connection at home; the school head can always choose modules.
5. **Deployment (owner, funding, pilot)** — Owner: DepEd's Disaster Risk Reduction and Management Service, piloted in one Schools Division; the division DRRM coordinator runs it at 16:00. Data: school locations + building notes only, no pupil data. Funding: target partner UNICEF Philippines (education & climate resilience) — *say "target partner"*. Pilot: Iloilo City for the 2027 hot season (March–May).
6. **Go-to-market / next** — Week 1: division fills in real building notes (one form per building). Month 1: validate bands with 20 classroom thermometers (13:00 readings). Then one region, then a second country.

## Q&A — one line each
- **"Are the colours real?"** School locations and heat are real; building notes are illustrative. The division writes its own — that's the onboarding step.
- **"How do you know a room is red?"** We don't estimate temperatures. A fixed, published rule turns features into points; the pilot validates it with classroom thermometers.
- **"Why AI?"** Notes are free text written by busy staff; Claude turns them into features with quoted evidence. Planning and checking are deterministic.
- **"What if the AI is wrong?"** The features and points are on screen; anyone can correct them; the school head decides.
- **"Isn't morning-only bad?"** It's 5 h instead of 6 — far better than 0. We measure learner-hours honestly.
- **"Who pays?"** DepEd DRRMS owns it; UNICEF Philippines as target funding partner for the pilot; it costs almost nothing to run.
- **"Heat data?"** On the day, the coordinator enters PAGASA's forecast. The replay uses Open-Meteo's archive as a proxy, which runs lower than PAGASA's heat index.

## Don't claim
- that the building data is real
- that Presko predicts classroom temperatures
- that UNICEF or DepEd have agreed to anything
- exact Iloilo division school count (we show schools mapped in OpenStreetMap)
