# TriggerReady: international clean-slate idea (triangle review, run 3)

*This was built from the hackathon base files and web research only, by three fresh reviewers: feasibility, impact and novelty. Ideas had to be international, so France was not the premise. The bar was 9/10 on each axis.*

## How it was chosen

**Round 0:** each reviewer proposed 3 ideas in different world regions, 9 in total.
- **Feasibility:** TriggerWatch (Kenya), HeatDesk (India), PlotProof (Peru).
- **Impact:** TriggerReady (Kenya), PlotPass (Peru), FeeCheck (Nepal → Gulf).
- **Novelty:** GhostCheck (Philippines), RioCheck (global / Haiti), HarvestClear (Kenya).

The feasibility and impact reviewers both proposed the Kenya Red Cross early-action idea independently.

**Round 1 (shortlist cross-score, scores out of 10):**

| Idea | Feasibility | Impact | Novelty | Total |
|---|---|---|---|---|
| **TriggerReady** (Kenya Red Cross early action) | 8 | 9 | 6 | **23** |
| HeatDesk (Ahmedabad heat alerts) | 9 | 8 | 5 | 22 |
| RioCheck (mislabelled climate finance) | 8 | 7 | 7 | 22 |
| GhostCheck (Philippine ghost flood works via satellite) | 5 | 8.5 | 8 | 21.5 |

- **GhostCheck:** the project lists have no published coordinates, a vision model can't reliably judge revetments at satellite resolution, and a false "ghost" verdict is defamation risk.
- **HeatDesk:** Ahmedabad already issues colour-coded alerts by SMS.

**Round 2 (v1):** feasibility 8, impact 9 once figures are corrected, novelty 8 (up from 6). Their demands are folded in below as v2.

**Round 3 (v2, this file): feasibility 9 ✅ · impact 9 ✅ · novelty 9 ✅.** All three reviewers are satisfied, with no blocking objections. Their last nice-to-haves are in the build plan.

**What lifted it to 9 across the board:** the protocol-versus-practice gap. Run as written, Kenya's protocol selects the wrong counties. TriggerReady recovers the unwritten "ongoing response" exclusion from IFRC's own activation document and reproduces the real activation.

---

## The idea in one line

**TriggerReady compiles a Red Cross / Red Crescent Early Action Protocol from its PDF into a trigger you can run, and shows where the written protocol and real practice disagree.** It then checks the forecast county by county and drafts the request to release the pre-approved IFRC money.

*Lens: public policy.*

## Problem (15%)

- **Early action pays:** each $1 spent on it brings up to **$7** in avoided losses and added benefits (WFP/FAO/OCHA 2025, [WFP](https://www.wfp.org/publications/2025-saving-lives-time-and-money-evidence-anticipatory-action)). FAO's household surveys give a more cautious figure of up to 3:1.
- **Coverage is thin:** 1 in 3 people worldwide have no early-warning coverage, and 60% in Africa ([UN EW4All](https://www.un.org/sites/un2.un.org/files/climate-change-fast-facts-updates/EarlyWarnings_FastFacts.pdf)).
- **Protocols are multiplying:** 15 new Early Action Protocols (EAPs: pre-agreed plans that release money before a disaster) were approved in January–June 2025 alone ([IFRC DREF mid-year 2025](https://www.ifrc.org/sites/default/files/2025-10/IFRC-DREF%202025%20Mid-year%20Report.pdf)).
- **Each trigger is still bespoke work:** turning one into a running model takes a data team per hazard and per country, as with the 510 / Netherlands Red Cross IBF Portal and OCHA's Centre for Humanitarian Data. Most protocols have no such team.

## User and moment

The **Kenya Red Cross forecast-based-action officer**, on the morning the Kenya Meteorological Department (KMD) publishes its October–December seasonal forecast. The real 2025 forecast was issued on 5 September ([KMD](https://meteo.go.ke/documents/1237/OND_2025_Seasonal_Weather_Forecast.pdf)).

## The real case (golden path)

**The written trigger** is in Kenya drought EAP MDRKE055, §2, p.4 ([EAP](https://www.anticipation-hub.org/Documents/EAPs/MDRKE055_EAP.pdf)):
- the drought index forecast for October–December (SPI) is below −0.98, with at least 33% probability, in at least 3 of the 23 arid and semi-arid counties;
- counties are ranked by risk;
- counties in the NDMA drought warning system's alarm or emergency phase are excluded;
- the top 3 remaining counties are triggered.

**What actually happened** ([activation document](https://go-api.ifrc.org/api/downloadfile/92390/MDRKE055_EAP%20Activation)):
- The trigger was met in most counties shown in its Figure 1b.
- All 23 counties were in NDMA phase "Normal", 9 of them "deteriorating".
- A table ranks 13 counties by INFORM risk.
- The activation went to **Kwale, Kilifi and Kitui** on **12 September 2025** (*read the date off the document*).
- **CHF 367,238** was allocated for **150,000** people targeted. The activation report gives CHF 425,156 and **253,588 people reached** ([report](https://go-api.ifrc.org/api/DownloadFile/94729/MDRKE055%20EAP%20Activation%20Report)).

**The protocol-versus-practice gap (the key demo moment):**
- Applied literally, the written rule picks **Mandera, Garissa, Wajir, Tana River and Marsabit** before Kwale.
- Those counties were left out because they already had a Kenya Red Cross DREF operation or a response in the plan. That exclusion is **not in the EAP text**.
- TriggerReady surfaces this gap: *"The written rule would select Mandera, Garissa, Wajir. Actual practice excluded counties with an ongoing response. Add this rule to the protocol?"*
- The officer confirms the extra rule, which is labelled *"sourced from the activation document p.2, not in the EAP"*. The engine then reproduces the real activation exactly.

## What's in (3 features)

1. **Protocol compiler plus lint.**
   - The AI reads the EAP PDF and fills a **fixed trigger schema**: indicator, threshold, probability, spatial rule, ranking, exclusions, lead time and early actions. Each field links to its page, and the officer confirms it.
   - **Lint** flags problems in the protocol itself: a threshold stated differently in two sections, a missing lead time, an undefined "risk index", or a rule used in practice but missing from the text, as in Kenya above.
2. **Deterministic trigger engine.**
   - The engine works through the counties with no AI involved: met / not met → rank → exclusions → final selection. It shows a **"0 rule violations"** check.
   - **Inputs for Kenya:** whether each county's trigger was met, transcribed from Figure 1b of the activation document; the NDMA phases and INFORM ranking from the same document; and an Open-Meteo cross-check labelled as a proxy. All are cached by build hour 2.
3. **Draft activation request.** It covers the pre-agreed early actions, the budget and the target households from the EAP, with a page citation for each claim. A sign-off screen requires a reason for each trigger.

## Demo moment

1. **Compile.** The juror drops in the real Kenya EAP. The schema fills field by field, each field highlighting its page. Lint raises one amber flag: "risk index undefined".
2. **Run the written rule on September 2025.** The map selects Mandera, Garissa and Wajir, and a red banner reads: *"This does not match the real activation."*
3. **Protocol versus practice.** TriggerReady proposes the missing exclusion, quoting the activation document. The officer confirms it. The engine re-runs and selects **Kwale, Kilifi and Kitui** ✓, matching the IFRC record: *"same counties, same day, 0 violations."*
4. **Timeline:** KMD forecast on 5 September → activation on 12 September → October–December rains, about 3 months of lead time used. This is honest: no days were lost in Kenya.
5. **Live compile of a second protocol.** The juror picks one of 3–4 pre-downloaded EAPs from the Anticipation Hub, for example Bangladesh Red Crescent's Dhaka heatwave EAP. Its trigger is a forecast of 38 °C or more for 2 or more consecutive days, first activated on 21 April 2024 with about CHF 249k ([Anticipation Hub](https://anticipation-hub.org/news/the-bangladesh-red-crescent-society-activates-its-early-action-protocol-for-heatwaves-in-dhaka)).
   - The schema and lint fill **live**. The engine doesn't run on it.
   - A cached result is the fallback.
6. The DREF request draft appears with citations, ready for sign-off.

## Competition (positioning line for the deck)

> "The IBF Portal needs a data team for each hazard. TriggerReady compiles any EAP in minutes, and gives the officer a trigger the IBF team can also use."

- The 510 / Netherlands Red Cross **IBF Portal** is complementary, not a rival.
- **OCHA's Centre for Humanitarian Data** designs triggers for its own frameworks.
- **HDX Signals** sends threshold alerts.
- The **Anticipation Hub trigger database** describes triggers but doesn't run them.
- We found **no public tool** that turns an EAP document into a trigger you can run. Say "no public tool found", not "nobody does this".

## Deployment (35%)

- **Owner on day one:** Kenya Red Cross's forecast-based-action unit.
- **Payer:** IFRC, through DREF's anticipatory pillar and EAP readiness budgets.
- **Scale:** every National Society with an EAP (15 new in H1 2025 alone), with the Anticipation Hub (German Red Cross and the Red Cross Red Crescent Climate Centre) as the distribution partner. The IBF / 510 teams can use the compiled schemas.
- **Money at stake:** each EAP protects a pre-approved budget, CHF 249k in Dhaka and CHF 367–425k in Kenya. **Missing a trigger forfeits that money and the up-to-7× return.**
- **Data:** forecasts and bulletins only, with no personal data.

## Indicators and side effects

**Indicators:**
- protocol-versus-practice gaps and lint issues found per EAP,
- share of activations filed inside the lead-time window,
- triggers flagged that an officer could have missed,
- time from bulletin to signed request.

A "missed activation" counterfactual is **measured going forward**. It isn't claimed for past seasons, because historical county forecasts are image maps and haven't been found.

**Side effects:**
- **False activations, or officers signing without reading.** Mitigations: per-field confirmation, a reason required at sign-off, and lint.
- **Encoding informal practice as rules without the protocol owner's approval.** Mitigation: every inferred rule is flagged "not in EAP" until the National Society amends the protocol.

## Build plan (≈5h)

| Step | Time |
|---|---|
| Download and cache the Kenya EAP, the activation document, the KMD forecast and 3–4 other EAPs; transcribe each county's met / not-met status from Figure 1b | 50 min |
| Schema plus compiler prompt with page links, plus lint rules | 60 min |
| Deterministic engine plus an independent "0 violations" checker | 45 min |
| Kenya county map (HDX boundaries) and the county table | 45 min |
| Protocol-versus-practice diff plus "confirm rule" flow | 30 min |
| Draft DREF request with citations | 30 min |
| Live compile of the second EAP (schema only), with cached fallback | 20 min |
| Deploy and video | rest |

- **Two checks in the first 50 minutes, before scripting:**
  1. While transcribing Figure 1b, confirm that the top-ranked counties really met the SPI trigger. The activation document says it was met in all counties shown "other than 5". If any of Mandera, Garissa or Wajir is among the 5, rewrite demo step 2 to name the counties the written rule actually picks. The gap stays real either way: Kwale ranks 6th.
  2. Confirm that p.2 of the activation document really says those counties were left out because a response was already under way, and **quote that sentence on screen**. If the wording is vaguer, say "the activation document indicates", not "practice excluded".
- **Closing the loop:** each gap found ends with a proposed amendment, sent to whoever validates EAPs at IFRC (*identify the body: unverified*).
- **Live picker:** use **2 pre-tested EAPs**, not 3–4, and run each once before recording the video.
- **Build gate:** the Kenya golden path must be deployed at a public link before the second EAP is touched. That path is: compile → written rule → gap → corrected rule → ✓ match.
- **Cut order if time runs short:** the Open-Meteo cross-check first, then the timeline, then the live second compile (show it cached instead). **If the cached version is shown, say so on screen.** Never present cached output as live.
- **Pitch wording for the Kenya gap:** "found by TriggerReady on IFRC's own documents". It's a gap in the written protocol, **not an error by Kenya Red Cross**.
- **One live AI call on the Kenya path**, with a cached answer served after about 8 s.

**Final submission: today, Saturday 16:00.**
