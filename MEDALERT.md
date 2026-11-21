# MedAlert: the jury-weighted pick (fresh start + re-scored finalists)

*Four reviewers each owned one jury criterion: Problem 15%, Deployment 35%, Functionality 25%, Quality 25%. They re-scored the 5 earlier finalists and proposed 8 fresh international ideas. The problem and functionality reviewers both proposed this idea on their own.*

## How it was chosen

| Round 1 shortlist | Problem | Deployment | Functionality | Quality | **Weighted** |
|---|---|---|---|---|---|
| **MedAlert** (Nigeria) | 9 | 7.5 | 8.5 | 9 | **8.35** |
| TriggerReady (Kenya) | 7.5 | 8 | 8.5 | 6.5 | 7.68 (8.18 with a UX redesign) |
| BrigadaPlan (Brazil, dengue) | 8.5 | 6.5 | 7.5 | 7 | 7.18 |
| Abrigo (Brazil, flood shelters) | 7.5 | 6.5 | 6 | 8.5 | 7.03 |

Earlier finalists, re-scored on jury weights in round 0:

| Finalist | Weighted | Main reason |
|---|---|---|
| Presko | 7.13 | DepEd already runs **Project LIGTAS+**, its own school-level heat-suspension platform |
| HeatDesk | 6.60 | — |
| RioCheck | 6.03 | — |
| GhostCheck | 5.80 | PhilSA, DBM's Project DIME and COA geotagging already check projects by satellite |

**Target:** weighted score of at least 8.5, with no single criterion below 8. Version 2 below addresses Deployment (7.5), which is the gap.

**Rounds 2–3 (this file, v2): ✅ done.**

| Problem | Deployment | Functionality | Quality | **Weighted** |
|---|---|---|---|---|
| 9 | 8.5 | 8.5 | 9 | **8.70** |

All four reviewers are satisfied. What moved Deployment from 7.5 to 8.5:
- positioning MedAlert as the **bridge to NAFDAC's own traceability programme**, with a GS1 scan and a photo fallback;
- sending reports in the **Med Safety App** format;
- the **under-24-hour alert-to-shelf** pilot target.

---

## Breadth (niche penalty) round: widened

- **The team found v2 too niche.** A BREADTH reviewer scored it 5/10, which penalised the final score from 8.70 to 7.80.
- **The penalty rule:** final = weighted − 0.3 × max(0, 8 − breadth).
- **Two new broad ideas, scored by all four jury reviewers:**
  - RTI Desk, for India's right-to-information officers: final 8.08 at best, with Deployment 7.5 below the bar.
  - GrievanceDesk, for India's public complaints system: final 6.05, because DARPG's own AI system, IGMS 2.0, already does it.

**v3 widens MedAlert:**
- **Vision:** *"Every pharmacist, every delivery: is this batch on anyone's alert list?"* It works for any hospital or retail pharmacist, in any country whose regulator publishes batch alerts. The WHO alert feed is already multi-country, and each regulator needs one adapter.
- **India check, live:** the same matcher runs against the monthly list from India's drug regulator (CDSCO). The juror types a real batch number from that list into the typed-batch field on the same screen (see the fixes below).
  - The list is cached locally. If the PDF can't be parsed, fall back to a card labelled **"cached example: India CDSCO, Sep 2026"**. That month, **330 samples failed quality testing and 1 was spurious** ([NewsOnAir](https://newsonair.gov.in/cdsco-flags-330-drug-samples-as-not-of-standard-quality-in-september-2026/)).
  - Present it as samples that failed testing in one month, **not as prevalence**.
  - Pre-download the CDSCO PDF in a browser at build hour 0, because cdsco.gov.in refuses scripted connections.
- **What doesn't change:**
  - **The day-one owner stays narrow on the rollout slide:** one federal teaching hospital, reporting to NAFDAC. "Any pharmacist, any regulator" appears on the **vision slide only**.
  - **The replication line** reads: *"India hospital pharmacy goods receipt + CDSCO monthly list: 2028 target market, no partner yet."*
  - **The hero screen stays the same,** with no country picker and no retail mode.
- **Two fixes after the breadth reviewer's strict re-check.** As first written, v3 scored breadth **7**, which means "broad on the slides, niche in the product".
  1. **Generic labels on the hero screen.**
     - The user label reads "Hospital pharmacist".
     - The registration field is labelled **"Registration no. (NAFDAC)"**, and the part in brackets changes with the regulator.
     - Nigeria stays the case.
  2. **The India check runs live, through the same matcher and the same screen.**
     - The juror types a real batch number from the cached CDSCO list into the typed-batch field. The matcher, which checks WHO, NAFDAC and CDSCO, returns 🔴 citing the CDSCO entry.
     - There's still no country picker.
     - This shows **one matcher working with two regulators**, rather than just claiming it. It costs about 20 min of build time.
     - **In the first 30 minutes,** check that the CDSCO PDF has selectable text (not a scan), and put 20 or more rows into a CSV. If that fails, show the India check as cached and say so on screen.
     - A typed batch skips the camera, so **"Confirm" stays mandatory**, and the verdict cites the matching CDSCO entry.

| v3 | Problem | Deployment | Functionality | Quality | Breadth | **Final** |
|---|---|---|---|---|---|---|
| MedAlert-widened | 9 | 8.5 | 8 | 9 | 8 | **8.58** ✅ |

**Done:** all five reviewers are satisfied.
- The final score is 8.58, above the 8.5 bar.
- Every jury criterion scores 8 or more.
- Breadth scores 8 after the strict re-check: reach 7, 10-second test 9, transferability 8, frequency 9.

## The idea in one line

**When a wholesaler's delivery arrives at a Nigerian hospital pharmacy, the store officer photographs each pack. MedAlert checks the batch against WHO and NAFDAC alerts and the NAFDAC register, and quarantines anything flagged. When a new alert is published, it sweeps the stock already received.**

*Lens: public policy.*

## Problem (15%)

- **Global scale:** at least **1 in 10** medical products in low- and middle-income countries is substandard or falsified. That is about **US$30.5bn a year**, and **72,000–169,000 child pneumonia deaths a year** are *modelled* as linked to them ([WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products)).
- **Nigeria:** in Enugu, 9.2% of 3,024 antimalarial samples were poor quality: 6.8% substandard, 1.3% degraded and 1.2% falsified ([ACT Consortium / LSHTM](https://www.lshtm.ac.uk/node/51661), [PMC4446036](https://pmc.ncbi.nlm.nih.gov/articles/PMC4446036)).
- **Wording rules:**
  - Present Enugu as **one state's** figure, next to WHO's global one. Never say "1 in 10 Nigerian medicines".
  - Label every death figure "modelled".
  - If asked whether the figure is still true, cite WHO's December 2024 fact sheet, which still gives 1 in 10.
- **Nigeria unit of harm:** poor-quality antimalarials are linked to about **12,300 deaths a year among Nigerian children under 5** and about **US$892m a year** (2017 dollars). These figures come from an agent-based model, Beargie et al., *PLOS ONE* 2019 ([PMC6695148](https://pmc.ncbi.nlm.nih.gov/articles/PMC6695148)). Always say "modelled, children under 5". Don't invent a per-patient cost.

## User and moment

**Who:** the **pharmacy store officer at a federal teaching hospital**.

**When:**
- **At goods receipt**, when a wholesaler's carton is opened.
- **The morning a new NAFDAC or WHO alert is published**, to check whether that batch is already on the shelves.

## What's in (3 features)

1. **Read and confirm.**
   - Photograph the pack. Vision extracts the product, strength, batch, manufacturer, expiry and NAFDAC registration number.
   - **The officer confirms or corrects every field before any verdict.**
   - If vision misreads, the officer can type the batch number instead.
2. **Deterministic match.**
   - The confirmed fields are compared with:
     - the cached WHO Medical Product Alerts;
     - the NAFDAC public alerts;
     - the NAFDAC Greenbook register of approved products (*confirm the access route in the first 30 minutes*).
   - The match is plain string and rule matching. The AI makes no decision.
   - **Verdicts:**
     - 🔴 **"Matches WHO Alert N°1/2020: quarantine"**, with the alert quoted.
     - 🟠 **"Registration number not found in the NAFDAC register: hold and verify"**.
     - ⚪ **"No alert found for this batch. This is not a quality clearance; lab testing still applies."** **Never "safe" and never green.**
   - Every red or orange verdict comes with a **pre-filled report to NAFDAC pharmacovigilance**.
3. **Alert sweep.**
   - A new alert is added → MedAlert scans the hospital's received-batches log → *"2 cartons of Batch 44680 received on 3 March, ward store B: quarantine."*
   - This is what MAS can't do: MedAlert reaches stock that is already inside the building.

## Demo moment (real case)

1. **Real alert:** WHO Medical Product Alert N°1/2020 reports **falsified Quinine Sulphate 300mg, Batch 44680, found in Nigeria and Cameroon** ([WHO](https://www.who.int/news/item/09-03-2020-medical-product-alert-n-1-2020-english-version)).
2. The juror holds up a printout of the pack photo from that WHO alert, and the phone camera reads it.
3. The extracted fields appear. The juror taps **Confirm**.
4. 🔴 **"Matches WHO Alert N°1/2020: quarantine."** The alert is quoted, and "Report to NAFDAC" opens a pre-filled form.
5. **Sweep:** the juror adds NAFDAC Public Alert 01/2026 (falsified **Tavanic 500mg, batch 4MW4C**, [NAFDAC](https://nafdac.gov.ng/public-alert-no-01-2026-sale-of-falsified-tavanic-500mg-tablet-in-nigeria/)). The synthetic received-batches log lights up one carton.
6. A genuine registered pack gives ⚪ "No alert found: not a clearance".

## Deployment (35%): what v2 adds to reach 8

**Day-one owner:** **one federal teaching hospital's pharmacy department**, with **NAFDAC's Pharmacovigilance and Post-Marketing Surveillance directorate** receiving its reports.
- NAFDAC already publishes public alerts, so MedAlert carries those alerts to the point of use.

**Competitors and the gap:**
- NAFDAC's **Mobile Authentication Service (MAS)** runs through 5 providers: PharmaSecure, Sproxil, Savanté, Kezzler and mPedigree ([NAFDAC](https://nafdac.gov.ng/?p=2429)).
  - It is **consumer scratch-code authentication**, reportedly covering only antibiotics, antimalarials and diabetes drugs ([Devex](https://www.devex.com/news/how-nigeria-partners-with-tech-companies-to-outwit-drug-counterfeiters-92953)).
  - It doesn't check batches against alerts at intake, and it doesn't sweep stock already received.
- **Deck line:** *"MAS asks 'is this code genuine?'. MedAlert asks 'has anyone flagged this batch, and do we already have it?'"*
- **NAFDAC's own traceability programme** is the big one, and MedAlert has to **bridge to it, not compete with it**.
  - The Pharmaceutical Products (Traceability) Regulations 2024 are **phasing in** a GS1 DataMatrix barcode on packs. Don't present it as fully in force: compliance is still being phased in, with a pilot that started in 2025 ([regulation](https://nafdac.gov.ng/wp-content/uploads/Files/Resources/Regulations/REGULATIONS_2021/NAFDAC-Pharmaceutical-Products-Traceability-Regulations-2024.pdf)).
  - Its scan network covers 400+ facilities, and it traced 100% of a recalled COVID-vaccine batch in under an hour ([GS1 case study](https://www.gs1.org/system/files/gs1dec251002_01_cases_studies_2025_nigeria_final.pdf)).
  - **How MedAlert fits:** it **reads the GS1 DataMatrix barcode when the pack has one, and falls back to the photo when it doesn't.**
  - **Reporting:** red and orange verdicts are pre-filled in the **NAFDAC Med Safety App report format**, the regulator's own reporting channel. NAFDAC's directive of 9 October 2025 extends that app to zonal pharmacovigilance centres and selected health facilities ([directive](https://nafdac.gov.ng/wp-content/uploads/Files/Resources/Regulatory_Directive/2025-2030/Regulatory-Directive-on-Safety-App.pdf)).
  - **Deck line:** *"NAFDAC's traceability is coming pack by pack. MedAlert covers every batch already on the shelf today, and plugs into Med Safety."*
- We found no source showing that NAFDAC or any Nigerian hospital matches batches against alerts at goods receipt. Say "we found none", not "none exists".

**Funding:**
- **Pilot:** the hospital's pharmacy budget, at a small cost per site.
- **Scale:** through **state Drug Management Agencies**, with **USP PQM+** or the **Global Fund's supply-chain support** as *target partners* (unverified, so don't claim them as committed).

**Rollout:**
- **2027:** pilot in one teaching hospital.
- **Next:** the other federal teaching hospitals.
- **Then:** feed WHO's global surveillance system (GSMS), the same engine reused for other countries' regulators. *The WHO alert feed is already multi-country.*

**Legal and data:**
- **No patient data:** only product batches and the hospital's stock log.
- **Rule for alert sources:** official alerts only, never crowd reports.

**Indicators:**
- % of received batches checked against alerts.
- Flagged batches quarantined before dispensing.
- **Time from a NAFDAC alert to stock checked in the hospital**, which is the headline. **2027 pilot target: under 24 hours in one hospital**, against today's baseline of unknown or manual.
- Reports filed with NAFDAC.

**Side effects:**
- **False reassurance:** "no alert" could be read as "safe". Mitigation: the wording is fixed and there is no green state.
- **Vision misreading a batch number.** Mitigation: confirmation is mandatory, with a typed fallback.
- **Over-quarantine causing stock-outs.** Mitigation: orange means hold and verify, not destroy.

## Quality (25%)

- One mobile screen at 375px: camera → confirm fields → verdict card.
- **The sweep gets no second screen.**
  - When an alert arrives, a banner appears on the main screen: *"New NAFDAC alert: Tavanic batch 4MW4C. 1 carton in ward store B. Quarantine?"*
  - It reuses the red verdict card, with one tap to "Quarantine + report".
  - The received-batches log sits in a drawer, not a tab.
- **In the video,** the sweep comes after the red verdict and takes 15 s or less.
  - It's triggered by a "Simulate today's NAFDAC alert" button.
  - The screen carries the label "synthetic stock log".
- Plain words only. Acronyms appear only as tooltips.
- Cached fallback if the vision call takes more than 8 s.
- The video lands the red verdict within 20 s.

## Build plan (≈5h)

| Step | Time |
|---|---|
| Cache the WHO alert pages and NAFDAC alerts as JSON (batch, product, countries); confirm Greenbook access | 45 min |
| Vision extraction plus the confirm screen, with the typed fallback | 60 min |
| Deterministic matcher plus verdict cards with the fixed wording | 45 min |
| Synthetic received-batches log plus the alert sweep | 40 min |
| Pre-filled report in the Med Safety App format | 25 min |
| GS1 DataMatrix scan path (browser barcode library), with photo fallback | 15 min |
| Mobile polish, 8 s fallback, test on throttled 3G | 30 min |
| Deploy, then the ≤90 s video | rest |

**Data (verified by the functionality reviewer):**
- **Greenbook query:** `https://greenbook.nafdac.gov.ng/?draw=1&start=0&length=N&search[value]=quinine`, sent with the header `X-Requested-With: XMLHttpRequest`, returns JSON. Each record has the product, the NAFDAC registration number, the strength and the approval and expiry dates.
  - The register lists 9,048 products; "quinine" returns 12.
  - This is the site's own table feed, not a published API. **By build hour 1, cache the 5–10 demo products locally**, and fall back to that cache if the live lookup fails or takes more than 5 s.
- **Demo printout:** use **the WHO N°1/2020 page's own photos of the Batch 44680 bottles**, credited to WHO. The verdict shows WHO's reasons for flagging next to the photo.
  - Before recording, test that vision reads the batch number off the printout **3 times out of 3**. If it doesn't, lead with the typed-batch fallback.

**Build gate:** deploy the core path (photo → confirm → 🔴 on Batch 44680) at a public link before the sweep.

**Final submission: today, Saturday 16:00.**
