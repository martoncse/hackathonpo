# Hack plan: CatatSekali

*Sciences Po AI Hackathon 2026. Don't use "Palantir" in the product name or the deck.*

> **The CURRENT version is v3 below.** It was revised over three rounds by two reviewers, one on impact and one on feasibility, both working from sourced data. Everything further down is the history of how we got here. **Where it conflicts with v3, v3 wins.**

## v3: CURRENT SPEC AND PITCH

**Review scores (round 3):** impact 7.5/10 · weekend build 7.5/10 · real-world feasibility 6.5/10. Two limits are disclosed openly and can't be fixed by Saturday: in-country model hosting, and no measured baseline for how many visits are missing from P-Care.

**Problem (precise):** Up to 15% of a community health centre's capitation depends on indicators computed from P-Care; visits that never reach P-Care can cost up to 10% on their own.
- Source: Peraturan BPJS Kesehatan 7/2019 ([DJSN](https://jdih.djsn.go.id/assets/file/07-bpjsk-2019.pdf)). Puskesmas capitation is 85/90/95/100% by KBK score. The contact rate (40% weight) = unique **registered** JKN members served in the month, inside or outside the building, ÷ registered members × 1,000. Target ≥150. Ratings: <140 / 140–<145 / 145–<150 / ≥150.
- *Verify:* that 7/2019 is still current (a 2025 article mentions capitation "up to 110%").
- **Why visits go missing:** recording at centres, pustu and posyandu isn't fully digital ([Kemenkes, Dec 2024](https://kemkes.go.id/eng/digitalisasi-permudah-akses-layanan-kesehatan-primer)). Maternal and child care is recorded on paper and electronically at once ([Banjarsengon study](https://jurnal.umla.ac.id/index.php/JOHC/article/download/1548/672/4694)). 9.45% of centres have no internet and 51.1% have slow internet; staff in about one centre in five enter data into more than six programmes ([JMIR 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12407222/)).
- **Open question, said out loud:** nobody has measured how many register visits are missing from P-Care. Measuring it in month 0 is the pilot's first deliverable. "Paper and double entry cause missed contacts" is a hypothesis.

**Who benefits:**
- Connected centres under KBK: recovered contacts → contact-rate rating → capitation %.
- Remote centres exempt from KBK (by BPJS–district agreement where networks are poor): complete data for the district and programmes, not money. Illustration of what bad data costs: stunting was 21.6% in the SSGI survey but 7.7% in e-PPGBM in 2022 ([KPK 2023](https://cms.kpk.go.id/storage/6634/Laporan-Kajian-Stunting-Tahun-2023.pdf)). We don't claim to fix that gap.

**User and moment:** the centre's data officer, at the end of the day or month, recovering visits recorded on paper (outreach, posyandu, pustu, maternal and child care) or missed while offline. The regulation requires real-time entry, so this is **recovering missed entries**, not a sanctioned delay.

**What's in (3):**
1. **Capture:** photo of the paper sheet → visits including the BPJS card number (and NIK if written) → the nurse reviews.
2. **Reconcile against P-Care:** exact match on card number + date. Name + date only = "probable" (amber). Shows the sheet's missing members, the month's total, the contact rate on unique registered members, the rating and the capitation %.
3. **Send:** missing entries prepared for **P-Care bridging** (the route that counts; one national BPJS web service with a cons-ID). The visit record goes to **SATUSEHAT** as a FHIR Bundle (Encounter, Condition, Immunization), "shaped, not validated". ASIK isn't connected in v1.

**Out:** live calls to P-Care or SATUSEHAT · a real offline queue · SIMPUS export input · ASIK · the district dashboard · voice.

**Demo moment:** demo mode (pre-extracted) → 10 visits from an outreach sheet → 7 in P-Care, 1 probable (no card), 2 missing → "This sheet: 2 · This month's 11 other sheets (synthetic): 22 · 24 unique members to recover" → contact rate **138.0 → 142.0** per 1,000 (6,000 members, 828 → 852) → **rating 1 → 2 → 90% → 95% of capitation, if the other two indicators are at rating 4** → flag: visit #7 has no age → download the P-Care entries and the FHIR Bundle. One live photo call only if it takes under ~15 seconds.

**Deployment:**
- Owner: the MoH Digital Transformation Office.
- BPJS: owner of the P-Care bridge and co-beneficiary.
- District health office: agrees KBK exemptions and sets targets.
- Entry route: the ministry's regulatory sandbox for digital health ([KMK 1280/2023](https://jdih.kemkes.go.id/common/dokumen/KMK%20No.%20HK.01.07-MENKES-1280-2023%20ttg%20Pengembangan%20Ekosistem%20Inovasi%20Digital%20Kesehatan%20Melalui%20Regulatory%20Sandbox-signed.pdf), *verify*).
- **Precondition:** in-country model hosting (PP 28/2024 data localisation and PDP Law Art. 56 on cross-border transfer, *verify*). The prototype uses a foreign API on synthetic data only.
- Competitors: EMR vendors (e.g. Infokes ePuskesmas) already bridge P-Care and SATUSEHAT for digital records. Our niche is the paper and offline remainder, plus reconciliation.

**Indicators (baselines measured in month 0, targets set with the district):** P-Care completeness (register visits from registered members found in P-Care ÷ those visits) · contact-rate rating and KBK % per pilot centre · cross-system mismatches per month · minutes per day of data entry.

**Pitch opening:**
1. *Wedge (19 words):* "Indonesian health centres can lose capitation when visits recorded on paper never reach P-Care. Nobody has measured how many."
2. *Move (17 words):* "We built CatatSekali: one photo of the sheet finds the visits P-Care is missing, and prepares them."
3. "Watch this."

**Q&A, updated:**
- "Isn't P-Care bridging already solving this?" → Bridging is one national service that EMR vendors already use for **digital** records. We cover the paper and offline remainder, and we check what actually reached P-Care.
- "You'd send patient data to a US AI company?" → Not in deployment. In-country hosting is a precondition we state up front. The prototype is synthetic only.
- "How many visits are actually missing?" → Nobody knows. That's the pilot's first measurement, in month 0.
- "How do you know visit #3 is the same person?" → We don't, so we mark it 'probable' and the nurse confirms.

**Claims retired (don't use):** "up to six apps" (say: more than six, in about one centre in five) · "P-Care decides capitation" · "bridges are built district by district" · "processing stays on ministry infrastructure" (it's a precondition) · "outputs follow SATUSEHAT FHIR" (it's "shaped, not validated") · missing visits raise the referral ratio (wrong: Peraturan BPJS 7/2019 defines it as non-specialist referrals ÷ all referrals, so visits don't enter it) · the unverified Yogyakarta, Lamongan, Jayapura and "~10 apps" figures.

---

# History (superseded by v3)

---

## 1. Vision (for the "how it grows" slide)

Remote health systems run on transfers. A nurse on an outer island calls, writes or fills in a form. A supervisor at the hub hospital has to decide who flies, who waits and who can be treated locally, with no single view of the cases.

We give that supervisor **one operational picture**: every incoming case with its urgency, transport options and estimated cost, all on one screen.

The AI:
- **reads** messy inputs: free-text nurse notes, referral forms, photos of paper forms
- **extracts** each one into a structured case (symptoms, vitals, history, origin island)
- **ranks** cases by urgency and estimated cost
- **flags** transfers that might be avoidable, such as "consider a teleconsult first", and shows the reason
- **drafts** the transfer order for sign-off

**The clinician or supervisor decides. The AI organises and flags.** That's our answer on liability, and it goes in the pitch.

The vision is broad. The demo isn't (see section 7).

### Target scope (set by the team)

The countries we target **already have health data and reliable power**: electronic records, claims or DHIS2-type reporting. Their problem is that **the systems don't talk to each other, and nobody has time to analyse what's in them**. This rules out the places that need basic infrastructure first.

The problem isn't missing data. It's data that sits in three systems that don't connect, while someone has to make a decision now.

### Ranked candidates (sourced desk research, one pass)

The ranking weighs: (1) a documented integration problem, (2) a sourced cost or impact figure for the problem slide, (3) a public body that would adopt it, (4) how easily the team can build and pitch it (language, size, the jury). Basic capacity (power, coverage) is a pass/fail filter, and all five pass.

| Rank | Place | Basic capacity | Integration problem, with source | Figure for the problem slide | Adopter | Weak point |
|---|---|---|---|---|---|---|
| **1** | **French Polynesia** | Part of the French system | **Not sourced yet.** The data sits at the hospital and the social security fund | 39,000 evacuations to Tahiti in 2024, about €400m ([CESE](https://www.lecese.fr/print/pdf/node/20333)), to verify | Social security fund, territorial health ministry | Need a source showing the systems don't talk |
| **2** | **Philippines** | Electricity 97.5% (2021, [World Bank via macrotrends](https://macrotrends.net/global-metrics/countries/PHL/Brazil/electricity-access-statistics)); UHC index 55 (2019, [WHO via IndexMundi](https://www.indexmundi.com/facts/indicators/SH.UHC.SRVS.CV.XD/rankings)) | "Fragmented and non-standardized health information systems, siloed data repositories" ([PMC 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12915754)); deficiencies in data standards and adoption ([PIDS DP 2025-31](https://www.pids.gov.ph/publication/discussion-papers/strengthening-health-information-systems-policies-gaps-and-a-framework-for-reform)) | No cost figure found | DOH and PhilHealth (National Health Data Repository, [PhilHealth](https://www.philhealth.gov.ph/nhdr/)) | No cost figure |
| **3** | **Indonesia** | Electricity ~100% (2022, [World Bank via macrotrends](https://macrotrends.net/global-metrics/countries/IDN/indonesia/electricity-access-statistics)), to verify | The ministry calls fragmented data across health apps the biggest challenge ([ITU WSIS](https://www.itu.int/net4/wsis/stocktaking/Prizes/2025/Details/16703619237465169)); SATUSEHAT is linking 60,000+ facilities ([Kemenkes](https://kemkes.go.id/eng/ministry-of-health-launches-satusehat-platform-to-integrate-national-health-data)) | No cost figure found | Ministry of Health (SATUSEHAT, FHIR standard) | Language; data mostly in Bahasa |
| **4** | **Brazil** | UHC index ~80 (2021, [WHO TB report 2024](https://www.who.int/teams/global-programme-on-tuberculosis-and-lung-health/tb-reports/global-tuberculosis-report-2024/uhc-and-tb-determinants/5-1-universal-health-coverage-and-tb)) | Expansion of "fragmented and disconnected systems" ([UFRN 2025](https://repositorio.lais.huol.ufrn.br/media/documents/Disserta%C3%A7%C3%A3o_Chander_Oliveira_2025.pdf)); RNDS holds ~5bn records ([Ministry of Health](https://www.gov.br/saude/pt-br/composicao/seidigi/publicacoes/sus-digital-inovacao-e-tecnologia.pdf)) | No cost figure found | Ministry of Health, DATASUS | Language; the integration layer already exists |
| **5** | **France, mainland** | UHC index 84 (2019, [WHO via IndexMundi](https://www.indexmundi.com/facts/indicators/SH.UHC.SRVS.CV.XD/rankings)) | 70% of providers have interoperable software ([ANS Ségur](https://esante.gouv.fr/segur/transparence)); 23m active Mon espace santé users ([ANS](https://esante.gouv.fr/actualites/des-usages-numeriques-en-sante-qui-montent-en-puissance-et-des-jalons-pour-2026)) | Not for integration | ANS, Assurance Maladie | Integration is largely being solved, so the gap is adoption |

**Team decision: Indonesia is the demo case.** It has the clearest public statement of the problem, from the ministry itself, and a national platform (SATUSEHAT, on the FHIR standard) that a tool can sit on top of. That makes the adoption story easy to tell. The cost: there's no cost figure yet, so finding one is the policy expert's first job. Polynesia and the Philippines move to the "how it grows" slide.

*Earlier coach's call, kept for the record:* French Polynesia, because only it has a cost figure. The Philippines is the expansion slide: an archipelago, an English-speaking health system, documented fragmentation and a national data repository to plug into. Before Polynesia goes on a slide, find one source showing the hospital, the island clinics and the social security fund don't share data. If you can't, swap the demo to the Philippines and look for a cost figure there.

---

## 2. Locked so far

| | |
|---|---|
| **Builder** | Prototype. Claude Code (has shipped an app before) |
| **Policy expert** | Evidence, deck, pitch, Q&A |
| **Lens** | Public policy: a health ministry or social security fund adopts it |
| **Main user** | The referral and evacuation supervisor at the hub hospital |

---

## 3. Problem sentence: LOCKED

> Every month, a nurse at an Indonesian community health centre re-types the same patient visits into up to six reporting apps. That's time taken from patients, and the district plans services on numbers that don't add up.

- "Up to six reporting apps": Ministry of Health survey of 2,606 centres, 2022 data ([JMIR Med Inform 2025](https://medinform.jmir.org/2025/1/e68613)). Sourced.
- "Time taken from patients": an inference from the Jayapura study (staff stuck recording, not analysing). **Find a time figure, or say "time spent typing, not treating".**
- "Numbers that don't add up": illustrated by the Yogyakarta early-warning evaluation (system counts didn't match manual reports). A different system, so use it as an illustration only.
- **Impact measures for the spec:** hours given back to each nurse every month, and one consistent set of numbers for the district.

### Earlier drafts (superseded)

> In an Indonesian district, the health office supervisor has each community health centre's data spread across several separate apps, so when a case needs a referral or an outbreak is starting, nobody can see the full picture in time to act.

### Which moment? (analysis)

| | Monthly report (recommended) | Referral | Outbreak alert |
|---|---|---|---|
| **Problem, sourced (15%)** | **Strong.** Average of ~30 health information systems per community health centre; each worker manages up to 6 for reporting (MoH Digital Transformation Office survey of 2,606 centres, [JMIR Med Inform 2025](https://medinform.jmir.org/2025/1/e68613)) | Medium. Over-referral and sequence problems are documented ([PMC8487026](https://pmc.ncbi.nlm.nih.gov/articles/PMC8487026)), but the figures are inconsistent | Weak. Evaluations find the early-warning system mostly **on time** ([JICA 2024](https://www.jica.go.jp/oda/project/1701881/en_news/20240312.html)); the gap is data validation |
| **Deployment (35%)** | **Strong.** Clear owner (the ministry's Digital Transformation Office), fits SATUSEHAT, low clinical risk | Risky. A referral overhaul was announced in Nov 2025 ([Jakarta Post](https://www.thejakartapost.com/indonesia/2025/11/18/planned-overhaul-of-hospital-referral-system-brings-hope-to-patients)), so the target is moving, and there are liability questions | Medium. A clear owner, but it competes with a system that already works |
| **Prototype works (25%)** | **Strong.** One page in, several reports out. Easy to build on synthetic data | Medium. Needs a credible triage logic | Weak. Needs time-series data to show anything |
| **Prototype quality (25%)** | Simple for a health worker | Needs clinical sign-off in the user interface | A dashboard nobody acts on is a risk |

**Coach's call: the monthly report.** It has the strongest sourced figure, the safest owner and the easiest demo. The supervisor's "one picture" view becomes v2 on the growth slide: once every centre's data goes in once, the district view comes almost for free.

**New draft problem sentence (yours to confirm):**

> In Indonesia's community health centres, the same patient data is typed into up to six different reporting apps, so health workers spend their time re-entering numbers instead of caring for patients, and the district never gets one clean picture.

**New demo moment (draft):** the juror photographs one page of a synthetic community health centre register → the tool extracts each visit into structured records → it fills three required report formats at once and flags two inconsistencies between them.

---

## 4. Evidence (sourced, or flagged)

| Place | Figure | Source | Status |
|---|---|---|---|
| French Polynesia | 39,000 evacuations from the islands to Tahiti in 2024, costing €400m | CESEC president, speaking at the CESE ([lecese.fr](https://www.lecese.fr/print/pdf/node/20333)) | **Verify with a mentor.** It's a speech, and it works out to ~€10k per evacuation. Find the social security fund's own figure |
| French Polynesia | 690 evacuations to mainland France in 2022 | The territory's social security fund guide ([cps.pf](https://wwwapi.cps.pf/medias/66513b12782c1689534721.pdf)) | Usable |
| French Polynesia | ~1,200 unplanned emergency air evacuations a year | Assemblée nationale written question ([assemblee-nationale.fr](https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE2586.pdf)) | Usable. It's a different number from the 39,000, so choose which one you mean |
| Solomon Islands | AUD 30,000–60,000 per overseas treatment, airfare not included | Government page, date unknown ([solomons.gov.sb](https://solomons.gov.sb/?p=26542)) | Verify the date |
| Fiji | ~FJ$1m for 106 overseas patients (2018) | Fiji Sun ([pressreader](https://www.pressreader.com/fiji/fiji-sun/20180116/282200831328709)) | Old. Context only |
| Vanuatu | 300,019 people, ~63 inhabited islands, ~78% rural | 2020 census ([vbos.gov.vu](https://vbos.gov.vu/sites/default/files/VANUATU_National.pdf)) | Usable |
| Vanuatu / Solomon Islands | ~0.17 / 0.08–0.19 doctors per 1,000 | WHO via World Bank ([data.worldbank.org](https://data.worldbank.org/indicator/SH.MED.PHYS.ZS)) | Sources disagree. Cite the year |
| Pacific | Overseas referral is a necessary but costly part of Pacific health systems | WHO policy brief ([apo.who.int](https://apo.who.int/publications/i/item/9789290227700)) | Usable as context |

**Rule:** no source, no slide.

---

## 5. Three angles (Phase 2, Step A)

*These replace the earlier referral-board angles, which no longer fit the locked problem.*

### A. Enter once: register to reports (recommended)
- **One line:** the nurse photographs one register page, and every required monthly report fills itself.
- **Demo moment:** the juror photographs a synthetic register page → the tool extracts each visit into structured records → three report formats fill at once, with a counter showing "entries typed: 1 instead of 6".
- **AI move:** reading a document or image (handwritten or printed register) and extracting structured data.
- **Feasibility:** one input and three outputs on synthetic data. A builder who has shipped before can get it working end to end by Saturday.

### B. The reconciler
- **One line:** the same month's exports from three apps go in, and one clean set of numbers comes out.
- **Demo moment:** the juror uploads three synthetic app exports for the same centre and month → the tool matches the records, flags "measles cases: 4 in app A, 6 in app B", explains the likely cause → one reconciled table, ready for the national platform.
- **AI move:** extraction, matching and reasoning across records.
- **Feasibility:** CSV files in, a table out. Simple to build, but the demo is less visual.

### C. Say it once: the reporting agent
- **One line:** the nurse describes a visit in plain Bahasa, and an agent routes it to every programme's format and drafts the monthly summary.
- **Demo moment:** the juror types or speaks a short visit note → the agent structures it → it files it in the maternal, immunisation and morbidity formats → it drafts the head of centre's monthly summary.
- **AI move:** a multi-step agentic workflow on free text.
- **Feasibility:** the riskiest of the three (language, voice). Keep it for v2.

**The coach's call:** A is the product. B's mismatch flag can be A's third feature. C goes on the "how it grows" slide. Pick one, combine two, or reject all three.

---

## SPEC (Phase 2): LOCKED

*Spec locked. Moving to Phase 3. Open homework: the user interview, the real templates, the scale-up funder.*

**Chosen angle:** A (Enter once), with B's mismatch flag. Working name: *to be decided by the team*.

**Lens:** Public policy.

*Sharpened after the ecosystem analysis (see [ECOSYSTEM.md](ECOSYSTEM.md)).*

**Problem:** Every visit at an Indonesian community health centre is typed again into the facility system (SIMPUS/e-Puskesmas), BPJS's P-Care, and often a programme app such as ASIK. Health workers report into up to 6 systems (MoH survey, 2,606 centres, 2022 data). Because P-Care decides the centre's capitation, it gets filled first, and the other systems drift. The district then plans on two versions of the truth.

**User:** The centre's registration or data officer, often a nurse or midwife, **at the end of each day**, with the paper register in front of them and three systems to feed. In centres without a doctor (3.94% nationally, 62.57% in Papua Pegunungan), this falls on whoever is left.

**Evidence:**
- The figure: [JMIR Med Inform 2025](https://medinform.jmir.org/2025/1/e68613), MoH Digital Transformation Office survey, ~30 systems per centre, up to 6 per worker. *To verify with a mentor: 2022 data.*
- Supporting: the Jayapura study (staff stuck recording, not analysing) and the Yogyakarta mismatch finding (section 3).
- **Double entry, named systems:** facilities enter disease data into ~10 apps, and e-Puskesmas and SITB aren't linked ([SITB evaluation 2025](https://link.springer.com/article/10.1186/s13690-025-01507-5)). A Yogyakarta centre typed every visit into both P-Care and SIMPUS, ~200 patients a day (*verify link*).
- **The cause of the drift:** P-Care is tied to capitation, so it gets filled first and its reports differ from the facility system. BPJS responded with district-by-district bridging modules (Lamongan study, *verify link*).
- **District level:** no standard data-quality protocols below national level ([WHO 2023](https://www.who.int/indonesia/news/detail/02-11-2023-enhancing-health-data-quality--strengthening-indonesia-s-data-quality-assurance)).
- Talked to a real user? **No interview recorded yet.** Before the pitch, the policy expert records one conversation with an Indonesian health worker, student or alum: their role, and one sentence on what they confirmed. Until then, the deck says only what the survey says.

**Demo moment:**
> **Juror does:** photographs (or uploads) one page of a synthetic community health centre register, with about 10 handwritten visits.
> **Our product does:** extracts each visit into a structured record, routes it to every system it must reach (facility system, P-Care, ASIK: **simulated**), and checks the systems against each other.
> **Juror sees:** the three destinations side by side, a counter showing "10 visits entered once, instead of 22 separate entries", and one red flag: "Diarrhoea: P-Care records 3 visits, but the facility morbidity report can only place 2 in an age group. Visit #7 has no age."

**Real case used:** a synthetic register page, modelled on a real community health centre register layout, with invented patients. *The policy expert finds the real register and report templates so the synthetic case looks real.*

**AI move:** documents and images. It reads a handwritten or printed register and extracts structured data, then reasons across the outputs to flag mismatches.

**What's in (max 3):**
1. **Read the register:** photo → structured visit records the nurse can correct.
2. **Route to every system:** each record fills what the facility system, P-Care and ASIK need (simulated panels). Field lists to match the real ones (*verify*).
3. **Flag cross-system mismatches:** show where the payer's copy and the facility's copy would disagree, and why, before anything is sent.

**What's out:**
- ❌ A live connection to SATUSEHAT or any real ministry app (show the export as a file instead)
- ❌ The district "one picture" dashboard (v2, on the growth slide)
- ❌ Voice input and the Bahasa reporting agent (angle C, v2)
- ❌ Login, accounts and user roles (mock a single nurse)
- ❌ More than three report formats

**Adoption (policy):**
- **Owner on day one:** the Ministry of Health's Digital Transformation Office, which ran the survey and runs SATUSEHAT.
- **Co-beneficiary:** BPJS Kesehatan. It gets cleaner, on-time P-Care data, with one entry point instead of district-by-district bridges.
- **Mandate:** Law 17/2023 requires every health information system to connect to the national system. CatatSekali feeds the existing pipes; it doesn't replace them. *Verify: Constitutional Court review 182/PUU-XXII/2024.*
- **Funding:** the ministry's digital health budget for the pilot. A development partner for the scale-up. *Which partner: to verify with a mentor, not named yet.*
- **First pilot:** one district, a handful of community health centres, 6 months.
- **Legal and data:** Indonesia's Personal Data Protection Law (2022) treats health data as specific personal data. Processing stays on ministry-approved infrastructure, and outputs follow SATUSEHAT's FHIR standard. *First pass with the data-protection mentor.*
- **Indicators:** minutes spent on monthly reporting per nurse (before and after), and the number of mismatches between reports per month.

**Done by submission:**
- [ ] The demo moment works end to end on the synthetic register page
- [ ] Demo video under 2 minutes, recorded
- [ ] Deck covering all six sections
- [ ] Submitted before the Saturday 16:00 deadline

**Red flags:**
- ⚠️ Handwriting extraction fails on stage. Prepare a clean printed register as a backup, and test with the real camera.
- ⚠️ No real report templates found, so the synthetic outputs look made-up. The policy expert finds them first.
- ⚠️ Personal data. Synthetic only; no real patient names, ever.
- ⚠️ The "up to six apps" figure is from 2022. A juror may ask whether SATUSEHAT has already fixed it. Prepare the answer.

---

## 6. Scope guardrails

- **In (max 3):** see the spec above: read the register, fill three reports, flag mismatches.
- **Out:**
  - Real patient data. Use synthetic cases only, and take GDPR questions to the data-protection mentor.
  - Login and accounts. Mock them.
  - Live connections to real hospital, DHIS2 or social security systems.
  - Training a model. Build on top of Claude.
  - More than one country in the demo.
  - Angle C, the dispatcher.

---

## 7. Open decisions: BLOCKING the spec

1. ~~**One real case for the demo.**~~ **Decided: Indonesia.** Still to do:
   - Find a sourced cost or impact figure for the problem slide (duplicate data entry, referral delays, or outbreak response time). No source, no slide.
   - Build the synthetic cases from Indonesian formats (a community health centre referral, a monthly report). Use synthetic data only, never real patient data.
   - Q&A prep: Indonesia's Personal Data Protection Law (2022) treats health data as specific personal data. Bring this to the data-protection mentor.
2. **Ministry or private supervisor.** Your lens is public policy, so the day-one owner is a public body: the health ministry or the territory's social security fund. Private evacuation operators and insurers go on the funding slide, not the adoption slide.

---

## 8. Naming and the Q&A trap

Don't name it after Palantir. In health, the brand implies surveillance, and the NHS England data-platform contract drew heavy privacy criticism. A juror will ask.

**Answer to prepare:** "Decision support on synthetic or anonymised cases. The data stays with the ministry, and a clinician makes every decision."

---

## 9. Checkpoints (Phase 3: owners to fill in)

*Draft: confirm the owners.*

| # | Checkpoint | What must exist | Owner | Check |
|---|---|---|---|---|
| 1 | Spec locked | The spec above, signed off. The builder owns the prototype; the policy expert owns evidence and the deck | Both | Done |
| 2 | Smoke test | Ugly skeleton at a shareable link: upload a register image → one hard-coded report appears | Builder | — |
| 3 | Golden path | The full demo moment on the synthetic register: 10 visits → 3 reports → the counter → one mismatch flag | Builder (the synthetic register page and the 3 real-looking templates come from the policy expert *before* this) | `/qa` on the live link |
| 4a | Feature freeze: second scenario | A messy register page (bad handwriting, a missing field) is handled: the visit is flagged for the nurse to correct, and the demo doesn't crash | Builder | `/review`, then `design:accessibility-review` |
| 4b | Feature freeze: deck | All 6 sections drafted (problem, solution, scale, impact, funding model, rollout), every figure sourced, interview line added | Policy expert | — |
| 5 | Video in the can | Under 2 minutes: the nurse's month before → photo → three reports → the flag → "1 instead of 6" | Policy expert (script and voice), builder (screen recording) | `marketing:draft-content` on the voice-over |
| 6 | Submitted | Prototype link, video, slides, title and both names sent through the organisers' form | Policy expert | `/qa-only` on the link, as a stranger would see it |

**Final submission: Saturday 16:00. No extensions.**

---

*Owners confirmed by the team.*

---

## PITCH (Phase 4)

Working name: **CatatSekali** ("record once" in Indonesian). The team can change it.

### A. The opening (words counted)

1. **Wedge (16 words):** "Every month, Indonesian community health centre nurses type the same visits into up to six apps."
   - *Sharper alternative (17 words):* "Indonesian health centres type each visit into several systems, and the one that pays gets filled first." *(Source: Lamongan study, verify.)*
2. **Move (15 words):** "We built CatatSekali, which turns one photo of the register into every entry the centre owes."
3. **Moment (2 words):** "Watch this." → the demo moment from the spec, word for word.

### B. The 5-minute run of show

| Time | Slide | What you say |
|---|---|---|
| 0:00–0:30 | 1. Problem | The wedge, with its source: the Ministry of Health survey of 2,606 centres (2022 data). One nurse, one month |
| 0:30–1:45 | 2. Solution | The move → "Watch this" → photo → 10 visits extracted → 3 reports → "1 instead of 6" → the mismatch flag |
| 1:45–2:15 | 2. Solution (cont.) | Today: the same visit typed six times, numbers that disagree. With us: typed once, checked automatically. The nurse confirms every record |
| 2:15–2:45 | 3. Scale | The survey covered about a quarter of all centres, so ~10,000 centres nationally (same source). Later: Philippines, French Polynesia |
| 2:45–3:15 | 4. Impact | Two indicators: minutes of reporting per nurse per month, and mismatches per month. Hours go back to patients, and the district gets one number it can trust |
| 3:15–4:30 | 5–6. Funding + rollout | Owner: the Ministry of Health's Digital Transformation Office. Pilot: one district, a few centres, 6 months, funded from the ministry's digital budget. Outputs in the SATUSEHAT FHIR format. Covered by the 2022 Personal Data Protection Law, health data = specific personal data. Scale-up partner: *to verify* |
| 4:30–5:00 | Close | The ask: one pilot district and an introduction to the Digital Transformation Office. Next: the district view, and a Bahasa voice agent |

Total: 5:00. Deployment gets 75 seconds, the longest block. **If you run over, cut words from the problem, never from the rollout.** Keep the video ready in case the live demo fails. Never debug on stage.

### C. The demo video (under 2 minutes)

| # | Shot | Voice-over |
|---|---|---|
| 1 | Title card: a nurse, a paper register, six app icons | "This is Ibu Sari's month: the same visits, typed into six apps." (a synthetic persona) |
| 2 | Phone photo of the synthetic register page | "With CatatSekali, she takes one photo." |
| 3 | Visits appear as structured records; she corrects one field | "Every visit becomes a record she checks, and corrects if needed." |
| 4 | Three reports filled side by side, with the counter "1 instead of 6" | "Three monthly reports, filled from one entry." |
| 5 | The red mismatch flag, then the export file for the national platform | "When the numbers disagree, it says why. The district gets one set of numbers it can trust." |

Record it in one take, and re-record once at most. Target: about 90 seconds.

### D. Q&A prep

**The policy five:**
1. **Who owns it on day one?** The Ministry of Health's Digital Transformation Office, which ran the survey and runs SATUSEHAT.
2. **How is it funded, and is it cheaper?** The pilot runs on the ministry's digital budget and reuses the existing register and a phone. *A cost comparison with the current setup: to verify. Don't claim one yet.*
3. **What if the AI gets it wrong?** The nurse checks every extracted record before any report fills, unclear fields are flagged, and nothing is submitted automatically.
4. **What about sensitive data?** The demo is all synthetic. In deployment it runs on ministry-approved infrastructure under the 2022 Personal Data Protection Law. *First pass with the data-protection mentor, Claudia Gestin Vilion.*
5. **How do you know it worked?** Minutes of reporting per nurse per month, before and after, and mismatches per month, in the pilot district.

**Jury-specific:**
- **Nour Mikhael (robustness):** "What if the handwriting can't be read?" → Low-confidence fields are flagged for the nurse, never guessed. We tested a messy page (checkpoint 4a).
- **Floriane Fay (responsible AI):** "Does the AI make medical decisions?" → No. It copies and checks numbers. A human confirms every record.
- **Véronique Mathelin (impact):** "Who concretely benefits?" → The nurse gets reporting time back, and the district gets consistent numbers. Both are measured in the pilot.
- **Anyone:** "Doesn't SATUSEHAT already solve this?" → SATUSEHAT is the national exchange. We're the single point of entry at the centre that feeds it. *Check what has changed since the 2022 survey data.*
- ~~**Anyone:** "Isn't BPJS bridging already solving this?"~~ *Retired: the answer was wrong. See the v3 Q&A at the top.*
- **Anyone:** "What does the law require?" → Law 17/2023 requires health information systems to connect to the national system. We help centres comply without adding another app. *Verify the Constitutional Court review first.*

### Dry-run checklist
- [x] Opening sentences under 20 words (16 / 16 / 2)
- [x] The demo in sentence 3 matches the spec's demo moment
- [x] The run of show adds up to 5:00, with 75 s on rollout
- [x] Video shot list, under 2 minutes
- [x] 5 policy questions plus 4 jury-specific ones, each answered in one line
- [ ] **Pitch run out loud once with a timer:** the policy expert does this

---

## 10. Done planning

You have a spec, a plan and a pitch. Stop planning. Go build. **Submission closes Saturday 16:00. No extensions.**

Checks agreed: `/qa` at the golden path, `/review` and `design:accessibility-review` at feature freeze, `/qa-only` before you submit. Stuck while building? Go to a technical mentor, not back to planning.
