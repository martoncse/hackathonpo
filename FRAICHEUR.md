# Fraîcheur: the clean-slate idea from the triangle review

*Built only from the hackathon base files (event.md, judging-lenses.md, the templates) plus web research. It doesn't rely on CatatSekali or anything in HACK-PLAN.md.* Three reviewers (feasibility, impact, novelty) each proposed 3 ideas. They cross-scored a shortlist of 4, then iterated on the winner until all three scored it 8 or more with no blocking objection.

## How it was chosen

| Shortlist (round 1) | Feasibility | Impact | Novelty | Total |
|---|---|---|---|---|
| **Fraîcheur** (school heat plan) | 6, or 8 with the deterministic solver | 7 | 8 | **21** |
| Vigie Canicule (CCAS heat call list) | 6 | 8 | 6 | 20 |
| RecoursMDPH (disability appeal letters) | 8 | 6 | 5 | 19 |
| Ginette Test (simulated users on public forms) | 6 | 5 | 7 | 18 |

All three reviewers rejected merging Fraîcheur with Vigie Canicule: it would be bigger, not stronger. Vigie Canicule becomes the roadmap line instead.

**Round 2 (Fraîcheur v1): feasibility 8 ✅ · impact 8 ✅ · novelty 8 ✅.** Every remaining demand is nice-to-have and is folded in below.

**Round 3: the bar was raised to 9, and two upgraded challengers got a fair shot.** All three reviewers picked Fraîcheur.

| Round 3 | Feasibility | Impact | Novelty |
|---|---|---|---|
| Fraîcheur v2 | 9 | 8 | 8 |
| Vigie Canicule v2 | 5 | 8 | 7 |
| RecoursMDPH v2 | 7 | 6 | 6 |

- **Vigie Canicule fails a data check.** INSEE's 200 m grid has counts of people aged 80+ and of one-person households, but never crossed, so "isolated over-75s on this street" can't be stated truthfully.
- **RecoursMDPH has no evidence that appeals succeed.** Its guide-barème check would read as an AI legal opinion that no juror can verify on stage.
- **v3 (this file) adds what impact and novelty asked for to reach 9:**
  - French classroom evidence, the scale line and the price (impact);
  - the real-commune "Replay 1 July 2025" layer (novelty);
  - a live-call fallback, a build gate and a real-school skeleton (feasibility).

**Round 4 (Fraîcheur v3): feasibility 9 ✅ · impact 9 ✅ · novelty 9 ✅.** All three reviewers are satisfied at the raised bar, and their last nice-to-haves are folded in.
- If no commune with published closure orders is found, novelty drops to about 8.5; impact and feasibility stay at 9.
- The build is now about 5 hours, so follow the cut order without debate.

---

## The idea in one line

**When Météo-France turns the département orange at 18:00, Fraîcheur tells the commune which of its schools can stay open tomorrow, in which rooms, and writes to the parents.**

*Lens: public policy.*

## User and moment

The **head of education services of a mid-size commune** (6 primary schools, about 55 classes). It's 18:00 on the day of an orange heat alert for tomorrow. This person prepares the decision the **mayor** has to take, school by school:
- open as normal,
- open with a room plan,
- or close.

Parents need to know before 20:00.

## Problem (15%)

- **2,213 establishments were closed on 1 July 2025, 2,200 of them schools**, almost all primary ([education.gouv.fr](https://www.education.gouv.fr/point-d-etape-des-consequences-de-la-canicule-sur-l-accueil-des-eleves-et-des-personnels-463008)).
- **Who decides:** the mayor or the prefect, under their general police powers (CGCT). The DASEN (the national education authority's head in the département) coordinates ([ministry heatwave plan](https://www.education.gouv.fr/sites/default/files/document/plan-ministeriel-de-gestion-des-vagues-de-chaleur-516767.pdf)). In July 2025 more than 100 communes in Seine-et-Marne issued their own closure orders, and mayors said they were "laissés bien seuls" (left very much alone) ([Maire-info](https://maire-info.com/canicule-les-maires-laisses-bien-seuls-face-au-choix-de-fermer-les-ecoles-article2-29850)). **This is the pitch's human moment.**
- **Harm, French evidence first:**
  - The *Racine* research-action programme put sensors in 15 representative French schools. Readings above 30°C were common even outside official heatwaves, the record was **37°C**, and France has **no legal maximum classroom temperature** ([Banque des Territoires](https://www.banquedesterritoires.fr/lecole-la-lutte-contre-la-canicule-prend-racine)).
  - INRS (France's national occupational-safety research institute) treats anything above 30°C as a health hazard ([AN QE 7993](https://questions.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE7993.pdf)).
  - **Pitch line:** *"37°C measured in a French classroom, and no rule says when to move the class."*
  - Mechanism, as a US proxy: each +1°F of school-year temperature cuts that year's learning by about 1% (Park et al., [AEJ: Policy 2020](https://www.aeaweb.org/doi/10.1257/pol.20180612)).
  - Leave childcare costs out: there is no source for them.
- **Scale, from one day to a season:**
  - The 2,200 schools closed on 1 July 2025 were out of about 45,000 schools in France. *Verify the total in the ministry's "repères et références statistiques".*
  - **About 300,000 pupil-days lost in one day** (an estimate: about 6.4m primary pupils across about 45,000 schools is about 140 per school; × 2,200 schools ≈ 300k). Both totals are unverified, so label it an estimate.
  - Recurrence: the ministry now publishes a heatwave plan every year, the 2026 edition included ([SGEN copy](https://sgen-cfdt.fr/contenu/uploads/2026/05/Plan-canicule-ministere-de-leducation-nationale-2026.pdf)).
- **The gap:** "no diagnostic tool for adapting schools to climate change exists yet" ([Amis de la Terre 2025](https://www.amisdelaterre.org/wp-content/uploads/2025/09/rapport-aes-renovation-bati-scolaire-250905.pdf)).

## What's in (3 features)

1. **A transparent heat band for each room.**
   - The AI extracts features from the commune's free-text building notes, for example "3rd floor, south-facing, skylight, no blinds, prefab": floor, orientation, glazing and shading, building type, fan or cooling.
   - A **fixed, visible rule** turns those features plus tomorrow's forecast high into a heat band at 14:00: blue, amber or red.
   - The AI never invents temperatures. Every band shows the feature tags behind it.
   - **13:00 thermometer slot:** a teacher enters a real reading, for example 31°C in an amber room. The room turns red and the plan re-runs.
2. **A deterministic room plan, with "0 conflicts".**
   - **Room moves:** in each school, the plan moves classes greedily from red rooms to free blue rooms (library, ground-floor rooms, the canteen in the afternoon), within capacity. PE and recess move to before 11:00.
   - **Outcome per school:** open, open with plan, or *closure to consider*. A closure is suggested only when the blue capacity can't hold the red classes, and the screen always says **"the mayor decides"**.
   - **Independent checker:** a separate function re-reads the final plan and shows 0 double-booked rooms and 0 rooms over capacity.
   - **Explanations:** the AI writes a one-line "why" for each move.
   - **Head teacher sheet:** each school gets one sheet addressed to its head teacher, "proposed room plan, confirm by 07:30". The head teacher is a national-education role who runs the classes, while the commune owns the buildings.
3. **Parent messages.**
   - One message per school, in French plus Arabic (shown right-to-left) and Portuguese.
   - One extra sentence for the parents of pupils with a health plan (a PAI, counted per class, never a diagnosis).

## The real-case layer (the round-3 twist that takes it to 9)

- **One real commune.** The schools (names, addresses) come from the public school directory open data (Annuaire de l'éducation). Only the room notes are synthetic, and they're labelled **"illustrative inventory: the commune fills in its own"**.
- **"Replay 1 July 2025" button.** It runs the same solver with that day's real recorded high temperature. Where the commune published its closure orders (pick one of the 100+ in Seine-et-Marne), it shows the counterfactual:
  > *"That day, this commune closed 6 schools. Fraîcheur would plausibly have kept 4 open with a room plan, and 1 would close anyway."*
- **Finding the commune is the policy person's first task.** It runs in parallel with the build and should take 30 minutes or less.
  - **Fallback:** if no commune with public closure orders turns up, replay with the real schools and the real temperature but without the real-closures comparison. The novelty reviewer scores that about 8.5.
- Say "plausibly": the counterfactual is only as good as the illustrative room notes. On screen, label it **"school days potentially saved (illustrative room data)"**.
- **Compute the counterfactual, never type it.** The sentence must be generated from the solver's output on the real commune, so a juror could reproduce it.
- **Time limit on the commune search: about 45 min.** If no published closure orders turn up by then, switch to the fallback and stop looking.
- **Script order:** script the video and pitch to start at step 1. Open with step 0 only once the replay has passed the build gate and been tested on the deployed link.

## Demo moment

0. **Replay 1 July 2025** on the real commune (see above).
1. The juror sees schematic floor plans for 6 schools, generated from the data as a grid of room tiles. Every tile is grey.
2. The juror flips **"Vigilance: orange, 36°C tomorrow"**.
3. The tiles turn red, amber or blue, and classes slide out of the red rooms. The counter shows **"0 conflicts"**.
4. The summary reads: *"6 schools: 4 open with plan, 1 open as normal, 1 closure to consider (École Jaurès: 5 red classes, 2 blue rooms). The mayor decides."*
5. **Live AI moment:** the juror edits one room note, for example adding "blinds installed". The room is re-scored live and one class moves back.
6. The juror enters **37°C** (the Racine record) in the 13:00 slot. That room turns red and the plan re-runs.
7. The juror opens the parent message in Arabic.

## Competition line for the deck

> "Plus Fraîche Ma Ville plans for 2030. Sensors (Vertuoz, Synox) measure today. Fraîcheur decides tomorrow morning."

Plus Fraîche Ma Ville is a state-incubator platform that helps communes plan against urban overheating over the long term. Vertuoz and Synox sell classroom temperature sensors and alerts. We found no tool that makes the next-day open, room-plan or close decision.

## Deployment (35%)

- **Owner:** the commune's education services, which already own the buildings and the room inventory. The decision is the mayor's (or the prefect's). The DASEN and head teachers are kept in the loop through the per-school sheet.
- **Funding:**
  - **Pilot:** the commune pays **about €1–2k per year** (an illustrative price, credible next to Fonds vert's support for refuge rooms).
  - **Validation:** before 16:00, get one quote from a mentor confirming that a commune's education services would use this at 18:00. Ask Christian Bussac (public-sector rollout) or Nicolas Vogtenberger (public policy and impact).
  - **Scale:** the **Fonds vert** (a main funding instrument of the national adaptation plan, PNACC-3) funds summer comfort in public buildings, schools included, and limits cooling to **"pièces refuges"** (refuge rooms) ([Fonds vert 2026](https://www.ecologie.gouv.fr/sites/default/files/documents/2026.06.19_MB_FG_DP_Fonds%20vert_Web.pdf)).
  - **Second use case:** Fraîcheur's red and blue room map is the evidence for the commune's Fonds vert application ("make *this* room the refuge room").
  - **Distribution:** through the mayors' association (AMF) or intercommunalities.
- **Data:** room inventory and class lists only, with no pupil names. PAI pupils appear only as a count per class, which keeps GDPR exposure light.
- **Rollout:** 1 commune for summer 2027, then 10 communes. Roadmap line: *"The same alert-to-action engine, next for nurseries, care homes and the CCAS heatwave register."* Renovation priorities stay a roadmap line too. Don't build them, because they would overlap the ministry's self-diagnosis guide.

## Indicators and side effects

**Indicators:**
- school days kept open per heat alert,
- share of pupils in red rooms at 14:00 on alert days,
- time from the alert to the parent message,
- learning-loss proxy (Park et al.), shown as context, not as a measured outcome.

**Side effects:**
- **False reassurance if a heat band is wrong.** Mitigations: the rule is visible, and the 13:00 thermometer re-runs the plan.
- **Pressure to keep schools open.** Mitigation: a closure is always available, and the mayor decides.

## Build plan (≈4.5h, from the feasibility review)

| Step | Time |
|---|---|
| Synthetic commune as JSON (6 schools, about 60 room notes, about 55 classes), generated then hand-checked | 30 min |
| Feature extraction, run once and cached | 45 min |
| Heat-band rule table, shown in the UI | 20 min |
| Greedy solver plus an **independent** 0-conflicts checker | 45 min |
| Schematic floor plans as a CSS grid per floor, with feature tags in each tile | 45 min |
| Parent messages, with Arabic right-to-left | 30 min |
| 13:00 thermometer slot plus re-run | 20 min |
| Deploy, video, buffer | the rest |

| Real-commune skeleton plus the "Replay 1 July 2025" input (the policy person sources the commune in parallel) | 30 min |

- **Build gate:** the core path must be deployed at a public link before the 13:00 slot, the Arabic right-to-left layout or the replay are started. The core path is: toggle → colours → plan → "0 conflicts". The video needs only the core path, the live edit and the parent message.
- **After the gate, build the replay first**, ahead of the 13:00 slot and Arabic right-to-left, **and put it in the video**. It is what lifts novelty from 8 to 9.
  - The "closed X / kept Y open" figures must come from the commune's real closure orders and the solver's real output. Don't use the example sentence above.
  - Name the commune and the closure order on screen.
- **Cut order if you run late:** first the class-slide animation (a before/after toggle is enough), then the 13:00 slot, then the real-closures comparison.
- Every AI output is pre-computed for demo mode. Exactly **one live AI call** happens on stage: the edited room note. **If it takes more than about 8 s, serve the cached answer.**

**Final submission: today, Saturday 16:00.**
