# EUDR-Snap moat analysis: where we can actually win

*Moat agent, 21 Nov 2026 (Sciences Po AI Hackathon). This builds on, and doesn't repeat, `EU-COMPLIANCE-GAPS.md`, `reports/EUDR Snap web app architecture.md`, `research_notes/.../open_tools_tech_patterns.md` and `commodities/cocoa-ci|cocoa-gh/ARCHITECTURE.md`. Every claim about a competitor has a link. **Unverified** means one of three things: the search found no primary source, the page refused the fetch, or the claim is the vendor's own marketing.*

---

## 0. Bottom line

- **The market is crowded.** It has over-funded SaaS (osapiens reached unicorn status in Jan 2026), free tools built by certifiers (Fairtrade Plot Insights, June 2026), free public tools (Whisp, Ground, GFW Pro for some users) and national systems (CCC SNT, COCOBOD GCTS, FNC SICA). We **can't** win on "satellite risk check", "DDS filing", "free" or "first to digitise paper".
- **What we can defend is narrow.** It's the **evidence layer between the paper receipt and the importer's Art 9–11 file**: receipt → producer → all of that producer's plots → a volume-plausibility flag → a named human decision → a hashed, shipment-level dossier. That layer is buyer-neutral, sits on top of the national systems, and is aimed at importers and cooperatives outside the majors' in-house programmes.
- **Today none of it is a moat.** Each feature can be copied in weeks, and TraceX already advertises plot-to-volume flags and AI document parsing. A moat would only come from **proprietary data** (yield baselines plus labelled real receipts), **an institutional position** (a CCC/COCOBOD/FNC or Competent Authority pilot), and **audit-trail switching costs**.

---

## 1. Regulatory status (checked 21 Nov 2026)

| Item | Status | Source |
|---|---|---|
| Application dates | **30 Dec 2026** for large and medium operators, **30 Jun 2027** for micro and small. No further delay found as of Nov 2026 | [Reg. 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj/eng), [EC Access2Markets](https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation), [Hogan Lovells](https://www.hoganlovells.com/en/publications/eu-deforestation-regulation-commission-publishes-simplification-package-ahead-of-december-2026) |
| Simplification review | Published 4 May 2026. It **did not reopen the text**. The Commission claims about **75% lower** recurring cost. Only the first operator files a DDS, and downstream duties are lighter. A one-off simplified declaration applies to micro and small primary operators in **low-risk** countries. A postal address can stand in for geolocation where it clearly corresponds to the plot | [Arendt](https://www.arendt.com/news-insights/news/eudr-simplification-review-published-what-the-2026-package-means-for-in-scope-companies/), [TraceX summary](https://tracextech.com/eudr-simplification-package-2026/), [COM(2026) 191](https://www.cdep.ro/afaceri_europene/CE/2026/COM_2026_191_1_EN_ACT_part1_v2.pdf) |
| Product-scope delegated act | Adopted 13 Jul 2026. Adds soluble coffee and some palm derivatives, removes hides and retreaded tyres. Scrutiny reportedly ended 13 Sep 2026 without objection (Linklaters, **single source**) | [EC newsroom](https://ec.europa.eu/newsroom/env/items/948164), [Linklaters](https://sustainablefutures.linklaters.com/post/102nbwv/eu-deforestation-regulation-commission-adopts-delegated-act-on-product-scope-and) |
| Country benchmark | Côte d'Ivoire is **standard risk** and Ghana **low risk** (Impl. Reg. 2025/1093). A 2026 review is scheduled. **No revised list found** | [Coolset explainer](https://www.coolset.com/academy/2-eudr-country-risk-classification-review-2026-what-changes-when-the-benchmarks-are-updated), [Impl. Reg. 2025/1093](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32025R1093) |
| Enforcement signal | National authorities' dry-run inspections (DE, BE, NL, FR; Sep 2025) look at **individual shipments** and want a complete paper trail per shipment. "Operators cannot hide behind a general DD-System" | [Mayer Brown, 5 Jun 2026](https://www.mayerbrown.com/en/insights/publications/2026/06/are-companies-ready-for-eudr-enforcement-dry-run-insights) (partial excerpts only) |

**Stale items in our own docs:**
- `cocoa-ci/ARCHITECTURE.md` says the "share of exports to the EU" was not found. Reuters via MyJoyOnline (Sep 2026) and the CCC via Fratmat both say **~70% of Ivorian cocoa goes to Europe** ([MyJoyOnline](https://www.myjoyonline.com/ivory-coast-cocoa-sellers-struggle-to-use-new-traceability-system/), [Fratmat](https://www.fratmat.info/article/2644626/economie/tracabilite-du-cacao-le-conseil-du-cafe-cacao-defend-son-dispositif-face-aux-critiques)). Update the doc and use the figure.
- `EU-COMPLIANCE-GAPS.md` says the paper → register step is "still open". That's **partly stale**: TraceX now markets agentic parsing of scanned supplier documents (see §2).
- Coolset claims that "51% of importing operators qualify for simplified due diligence (Art 13)" ([Coolset](https://www.coolset.com/academy/eudr-reporting-guide-for-smes)). That's **unverified**, but if it's true, our Art 10/11 value applies mainly to standard-risk origins (Côte d'Ivoire, Colombia, Brazil, Indonesia…) and **not to Ghana**.

---

## 2. Competitor map

### 2a. Commercial EUDR SaaS

| Player | Target customer | What it does | Pricing signal | What it does **not** do (for our layer) |
|---|---|---|---|---|
| **osapiens HUB** | Large EU corporates (multi-regulation ESG) | Supplier portal, DDS, ESG reporting; EUDR is one module. $100M Series C, ~$1B+ valuation (Jan 2026) | Enterprise, unpublished | First-mile paper or producer-level volume logic: **not found**. It's a top-down corporate tool ([vestbee](https://vestbee.com/insights/articles/osapiens-secures-100-m), [osapiens cocoa guide](https://osapiens.com/en/resources/guides-studies-checklists/2026/eudr-for-cocoa-connecting-farm-origins-to-due-diligence)) |
| **LiveEO TradeAware** | EU operators, including SMEs (new self-serve tier) | Satellite deforestation checks, supplier questionnaires and uploads, DDS to TRACES. Integrations with SAP Green Token and Coupa. "TradeAware Professional" self-service launched 25 Sep 2026 | **Free** tier. Professional is **€3,990/yr** (5 suppliers, +€15/supplier/month up to 20, 50 DDS/yr). Enterprise on quote | No yield or volume checks listed. Legality is supplier self-upload with no lawyer review below Enterprise ([pricing](https://www.live-eo.com/tradeaware-pricing), [SAP blog](https://www.sap.com/blogs/eudr-update-operational-readiness)) |
| **Coolset** | Dutch/EU SME importers and traders | EUDR module (Sep 2025): supplier data, risk, DDS | Unpublished | Built for the EU importer's desk, with no first-mile capture ([Coolset launch](https://www.coolset.com/academy/coolset-launches-eudr-module)) |
| **TraceX** | Exporters, importers, cooperatives (cocoa CI, coffee) | Farm mapping, polygon validation, per-lot compliance score, **"agentic AI" document parsing** of KYC, land and certification documents, email/OCR parser, **"compare declared plot areas … with procurement volumes … to flag unusual plot-to-volume relationships"** | Free trial, quote-based | Their pages show no paper *delivery receipt* extraction, no published accuracy, and no named-reviewer Art 11 log. **This is our closest overlap, and it weakens our novelty claim** ([plot verification](https://tracextech.com/eudr-plot-data-verification/), [simplification page](https://tracextech.com/eudr-simplification-package-2026/), [email parser](https://tracextech.com/?p=25824)) |
| **Meridia (Verify)** | Exporters, cooperatives, traders, auditors | Field data verification with "50+ tests". **SGS picked Meridia as its EUDR verification technology partner (Sep 2026)**, with "220+ control points". Rabo Foundation subsidises access for 19 cooperatives | Unpublished. Discounted through Rabo Foundation | Not a paper-intake tool, and no public volume-plausibility rule found. **SGS backing gives it the "auditor-grade" trust position we would otherwise want** ([SGS](https://www.sgs.com/en/news/2026/09/sgs-selects-meridia-as-technology-partner-for-eudr-verification), [Rabo](https://www.rabobank.nl/en/about-us/rabofoundation/project/011461151/meridia-and-rabo-foundation-join-forces-to-support-smallholder-farmers-prepare-for-eudr-compliance)) |
| **Satelligence** | Traders and brands; cooperatives through Fairtrade | Satellite monitoring and risk reports, the engine behind Fairtrade Plot Insights | Enterprise | Geospatial-first, not a compliance workflow (competitor's view: [Coolset](https://www.coolset.com/academy/top-5-liveeo-tradeaware-alternatives-for-eudr-compliance)). No delivery data ([Fairtrade](https://www.fairtrade.net/en/get-involved/news/fairtrade-and-satelligence-join-forces-for-farmers-to-meet-eu-deforestation-rules.html)) |
| **Koltiva (KoltiTrace)** | Processors and exporters (Asia, LatAm, Africa) | Field agents, traceability, auto-generated DDS | Unpublished. 2026 funding: **not found** | Agent-led data capture, not reading paper the cooperative already holds ([SDCExec](https://www.sdcexec.com/home/news/22893228/koltiva-eudr-solutions-enable-businesses-to-navigate-eu-regulation-on-deforestation), [PR.com](https://www.pr.com/press-release/926700)) |
| **Sourcemap** | Large brands and traders (e.g. LDC: 15,000 farmer profiles in Côte d'Ivoire) | Supply-chain mapping, EUDR automation. Named by the Dutch CBI agency in its cocoa report | Enterprise, unpublished | Built for the brand end of the chain ([Sourcemap/CBI](https://www.sourcemap.com/company/news/dutch-government-trade-agency-names-sourcemap-a-leading-platform-for-cocoa-traceability-compliance), [Sourcemap market](https://www.sourcemap.com/company/news/sourcemap-recognized-as-a-leader-in-projected-1.8-billion-eudr-compliance-software-market)) |
| **Farmforce** | Agribusinesses, NGO pilots | First-mile farm and plot data, linked to GFW Pro. Ethiopia pilot: 4,500 producers | Unpublished. 2026 funding or pivot: **not found** | Not built around importer documentation ([GFW Pro spotlight](https://pro-news.globalforestwatch.org/news-events/gfw-pro-user-spotlight-farmforce)) |
| **SAP Green Token** | SAP-ERP corporates (Unilever palm pilot) | Tokenised chain of custody, transaction-level traceability, DDS workflows with TradeAware | Enterprise | Irrelevant to non-SAP SMEs and cooperatives ([SAP](https://www.sap.com/products/scm/green-token.html)) |
| **Dimitra** | Cooperatives and unions (Kenya NACCU, coffee) | Farmer app: registration, mapping, risk | Unpublished | Coffee-Kenya focus; no importer dossier found ([FoodBusinessMEA](https://www.foodbusinessmea.com/dimitra-partners-with-naccu-to-digitally-equip-kenyan-coffee-farmers-for-eu-deforestation-free-trade-rules/)) |
| **NGIS TraceMark** | Corporates (Google Cloud) | Spatial traceability, Art 10/11-style risk reports, supplier engagement | Unpublished | Vendor page only (**unverified** beyond marketing) ([NGIS](https://ngis.com.au/Newsroom/What-is-the-EUDR)) |
| **IntegrityNext EUDR Starter** | EU buyers | Supplier questionnaires; free for suppliers | Unpublished | Questionnaire-based ([IntegrityNext](https://integritynext.com/esg-solutions/eudr-deforestation-regulation/eudr-starter)) |
| Picterra, Agridigital, Ecosphere+, Starling/Earthworm, Cropin, eProd, Bext360 | Various | Earth observation, traceability, AI regulation-to-task ([Bext360 via ICC](https://iccwbo.org/news-publications/guest-blog/the-compliance-divide-how-ai-can-close-the-gap-between-policy-and-producers/), [Cropin](https://www.cropin.com/blogs/cocoa-supply-chain-traceability-eudr/), [eProd/GSMA](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/how-eprod-is-facilitating-export-standard-compliance-in-africa/)) | n/a | **Not verified this session**: no current 2026 EUDR status was found for Picterra, Agridigital, Ecosphere+ or Starling |

### 2b. Free, certifier and public tools

| Tool | Who | What | What it doesn't do |
|---|---|---|---|
| **FAO Whisp** | Anyone (API key) | Convergence-of-evidence risk, 2020 cut-off, national layers | Deliveries, documents, decisions. **We depend on it, it's not a rival** ([FAO](https://www.fao.org/transparent-supply-chains/news---events/news/detail/supporting-eudr-compliance-with-whisp/en)) |
| **FAO Ground** | Cooperatives (offline Android, Whisp built in). Used with Ivorian and Kenyan cooperatives (~2,000 Nandi plots, Nov 2026) | Offline plot mapping | Receipts and volumes ([FAO CI story](https://www.fao.org/in-action/forest-data-partnership/home/stories-detail/enhancing-compliance-with-deforestation-free-regulations-and-enabling-local-participation-with-ground--insights-from-user-experiences-in-ivory-coast/en), [FAO Kenya](https://www.fao.org/newsroom/story/coffee-with-coordinates/en)) |
| **Fairtrade Plot Insights** (launched 16 Jun 2026) | **Fairtrade-certified** coffee and cocoa cooperatives, **free** | Plot upload, data-quality feedback, Satelligence risk. Sharing with importers via Fairtrace **from Oct 2026** | Only for Fairtrade cooperatives. No delivery-volume logic found ([Daily Coffee News](https://dailycoffeenews.com/2026/06/16/fairtrade-launches-free-eudr-geolocation-tool-for-coffee-cooperatives/), [factsheet](https://www.fairtrade.net/content/dam/fairtrade/global/why-we-do-it/deforestation/Fairtrade-Plot-Insights-Factsheet-2026.pdf)) |
| **Rainforest Alliance** | Certified partners, no extra cost | EUDR data for IP / Mixed-IP chains | Only certified, identity-preserved chains ([RA](https://www.rainforest-alliance.org/business/certification/how-the-rainforest-alliance-supports-eudr-compliance-from-farm-to-retailer/)) |
| **GFW Pro** | Corporates; free for Peruvian cooperatives | Portfolio risk, near-real-time alerts | No general free tier found ([GFW Pro EUDR](https://pro-news.globalforestwatch.org/news-events/how-gfw-pro-supports-eudr-compliance), [Peru](https://pro-news.globalforestwatch.org/news-events/collaborating-deforestation-free-agricultural-exports)) |
| **Preferred by Nature** | Importers | Free scoping tool (updated Aug 2026), free open-source DD toolkit, Sourcing Hub country risk | Generic templates, not shipment-specific ([PbN](https://www.preferredbynature.org/EUDR-info)) |
| INATrace, TerraTrac, GeoRoots, AgStack | Open-source DPI | Cooperative ERP, mapping, GeoIDs | See `open_tools_tech_patterns.md`. None does LLM document intake |

### 2c. National systems

| System | Status (late 2026) | Gap we can fill | Source |
|---|---|---|---|
| **Côte d'Ivoire CCC SNT and producer card** | Mandatory from 1 Sep 2026. ~26,000 t bought with the card 1–13 Sep. 20,000 payment terminals. Cooperatives and agents struggled with equipment and digital literacy; the CCC says the problems are not serious | Importer-facing evidence and volume plausibility **per card**. Whether the SNT checks volume plausibility: still **not found** | [MyJoyOnline/Reuters](https://www.myjoyonline.com/ivory-coast-cocoa-sellers-struggle-to-use-new-traceability-system/), [Koaci](https://www.koaci.com/article/2026/09/17/cote-divoire/societe/cote-divoire-cacao-26-000-tonnes-deja-tracees-la-cote-divoire-accelere-avant-lecheance-europeenne_200632.html), [Fratmat](https://www.fratmat.info/article/2644626/economie/tracabilite-du-cacao-le-conseil-du-cafe-cacao-defend-son-dispositif-face-aux-critiques) |
| Côte d'Ivoire traceability depth | EFI: **44%** of exports traceable to the cooperative, **22%** to the plot, 56% indirect or untraceable. Trase (May 2026): just under half traceable | Indirect chains are exactly where laundering risk sits | [EFI preparedness check](https://efi.int/sites/default/files/files/flegtredd/Sustainable-cocoa-programme/Cocoa%20insights/EUDR%20preparedness%20check%20CIV_EN.pdf), [Global Canopy/Trase](https://globalcanopy.org/press/gaps-in-tracing-and-disclosure-hide-supply-chains-risks-in-52-of-ivorian-cocoa/) |
| **Ghana COCOBOD GCTS** | Bag-to-farm linking (GPS, barcodes). A $200/t premium sought for EUDR-compliant cocoa. Ghana is **low risk** | Small: Art 13 simplified due diligence removes most of the Art 10/11 work | [dandc.eu](https://dandc.eu/en/article/ghana-has-tested-digital-system-aims-make-cocoa-supply-chains-more-transparent-and-help), [Bloomberg](https://www.bloomberg.com/news/articles/2025-10-22/ghana-plans-to-seek-200-premium-for-eudr-compliant-cocoa) |
| **Colombia FNC SICA** | ~1.8M lots georeferenced; exporter access platform | Receipt → lot link and volume checks (see the existing architecture report) | [Mongabay, Mar 2026](https://news.mongabay.com/2026/03/colombias-coffee-industry-well-placed-but-wary-as-eu-deforestation-rule-looms/) |

### 2d. In-house trader programmes

| Trader | What we found | Implication |
|---|---|---|
| Barry Callebaut | Extending bean traceability to all products. 149,792 farmers delivering (Cocoa Horizons, mid-year 2025/26). Yield caps used in Cameroon (Mighty Earth 2025, cited in our CI doc) | Majors already run volume controls inside their own chains ([Callebaut](https://www.callebaut.com/en/callebaut-and-eudr), [Cocoa Horizons](https://www.cocoahorizons.org/sites/default/files/2026-08/The%20Cocoa%20Snapshot%2025-26%20mid%20year%20EN.pdf)) |
| Cargill | "Collects validated geospatial data from all relevant products"; expects readiness by 30 Dec 2026 | Same ([Cargill](https://www.cargill.com/food-beverage/emea/news/preparing-for-eudr-together-what-the-latest-updates-mean-for-you)) |
| Touton | 6th cocoa and forests report, Aug 2026 (figures not read) | **Unverified** detail ([Confectionery Production](https://www.confectioneryproduction.com/news/59006/exclusive-toutons-cocoa-and-forests-report-delivers-sustainability-gains/)) |
| Nestlé | 85% of cocoa through the Cocoa Plan (2023 figure, stale) | ([FoodNavigator 2024](https://www.foodnavigator.com/Article/2024/06/25/How-is-Nestle-making-cocoa-more-traceable)) |
| ofi, ECOM | Assessed in WWF's 2025 trader basket; 2026 programme specifics **not found** | ([WWF](https://www.wwf.org.uk/sites/default/files/2025-12/WWF-Basket-Deforestation-and-Conversion-free-cocoa-traders%E2%80%99-assessment.pdf)) |

---

## 3. Gaps at our layer: what's real

| Gap | Is it open? | Evidence |
|---|---|---|
| Paper **delivery receipt** → producer → plot link | **Mostly open, but narrowing.** TraceX parses KYC, land and certification documents and email attachments, not delivery receipts as far as we can see | [TraceX](https://tracextech.com/smallholder-farmers-and-eudr/). In Ghana the farmer passbook is paper (our Ghana doc) |
| Volume plausibility / laundering detection | **Recognised best practice, not unique.** Advisers describe "Plot Area → Expected Yield → Reported Volume → Procurement Records" as a standard check. TraceX markets plot-to-volume flags. Majors run yield caps internally. **What's open:** a *transparent, sourced, per-country, per-producer-card pooled* rule that a non-major can run and explain to an authority | [Crowe (via search excerpt)](https://www.crowe.com/pl/en-us/insights/eudr---10-implementation-challenges), [TraceX](https://tracextech.com/eudr-plot-data-verification/) |
| Mid-size and small EU importers outside the majors | **Real.** "EU importers won't be able to get enough compliant cocoa from indirect or third-party shippers" (Debenham). Mapping costs $30–80/t, and EU buyers push back on paying | [TimesLive/Reuters, Aug 2026](https://www.timeslive.co.za/news/2026-08-17-chocolate-could-get-pricier-as-eu-scrutinises-west-african-cocoa/) |
| Independent (non-certified) cooperatives | **Real.** Fairtrade and RA tools only serve certified members. IISD: farmers outside organised chains have weaker documentation | [IISD via DCN, Oct 2026](https://dailycoffeenews.com/2026/10/07/eudr-compliance-gaps-persist-for-smallholders-new-report-finds/) |
| Explainable human-in-the-loop, shipment-level audit trail | **Real and demanded by enforcers** (dry runs focus on shipments and the paper trail). Most tools sell "automated" risk, and TradeAware puts plot review in its Enterprise tier | [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/06/are-companies-ready-for-eudr-enforcement-dry-run-insights), [TradeAware pricing](https://www.live-eo.com/tradeaware-pricing) |
| Full due diligence for standard-risk origins (Art 10/11 file) | **Real for Côte d'Ivoire and Colombia, absent for Ghana** (low risk) | Impl. Reg. 2025/1093 |
| Cost / free tier | **Not a gap.** TradeAware Lite is free, Whisp, Ground and PbN are free, Fairtrade is free for certified cooperatives | Links above |
| Offline / low-literacy capture | **Mostly taken** (Ground, ODK, TerraTrac). Our angle is narrower: *reading the paper people already use* instead of adding a new app. The CCC rollout's literacy problems support this | [MyJoyOnline](https://www.myjoyonline.com/ivory-coast-cocoa-sellers-struggle-to-use-new-traceability-system/) |
| Multi-country profiles | **Thin edge.** Big vendors already cover 50+ origins (Meridia) | [SGS](https://www.sgs.com/en/news/2026/09/sgs-selects-meridia-as-technology-partner-for-eudr-verification) |

---

## 4. Top 5 edges, ranked

Scores are out of 5. **Real** = how much evidence backs the edge today. **Defensible** = how hard it is to copy.

### 1. Receipt-to-dossier chain of evidence per shipment (Real 4 · Defensible 2 now, 4 if deepened)
- **What it is:** each exported plot carries the photo hash, the verbatim text it was read from, the human Accept with a reason, Whisp evidence, the volume test and the Art 11 log, all hashed per shipment. That is exactly the "per-shipment paper trail" the dry-run inspectors asked for ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/06/are-companies-ready-for-eudr-enforcement-dry-run-insights)). Competitors sell risk scores and DDS filing. None we found publicly sells "the evidence for one named decision".
- **Copyable?** The UI, yes, in a month.
- **How to deepen:**
  - Turn the audit trail into **switching costs**: five-year retention (Art 12), with the importer's history living in our vault.
  - Get a **Competent Authority** (NL NVWA, BE, FR) to review one sample dossier and say it is "inspectable". That is a trust asset a startup can win before incumbents bother.

### 2. Transparent, sourced, producer-pooled volume-plausibility rule (Real 4 · Defensible 2 now, 4 with data)
- **What it is:** a per-country threshold with a citation (924 kg/ha for Côte d'Ivoire = 2× the 462 kg/ha average from BC/Agri-Logic), pooled per CCC producer card. It's a review trigger, never an exclusion, and the flag text names the false-positive causes (pruned farms, carried-over stock).
- **Where it stands against rivals:** TraceX flags "unusual plot-to-volume relationships" without saying how. The majors' caps are private. Ours is **open and explainable**, which matters to an authority and to a cooperative that disputes a flag.
- **Honest caveats:**
  - The *idea* is standard practice (Crowe). Only the explainable per-card pooling and open thresholds are ours.
  - 2× the average is a crude threshold.
- **How to deepen:** build a **data network effect**. Every Accept/Exclude decision, with its reason, becomes a labelled example. That calibrates thresholds by region and season and gives a false-positive benchmark no newcomer has. The data stays under the cooperative's governance.

### 3. Buyer-neutral layer for indirect chains and non-certified cooperatives (Real 4 · Defensible 3)
- **What it is:** 56% of Ivorian cocoa is indirect or untraceable ([EFI](https://efi.int/sites/default/files/files/flegtredd/Sustainable-cocoa-programme/Cocoa%20insights/EUDR%20preparedness%20check%20CIV_EN.pdf)). The majors' programmes cover their own chains. Fairtrade and RA cover their certified members. A cooperative that wants to sell to *any* importer needs data it owns and can carry between buyers. The GIZ/INCAS study in our earlier report names lock-in and buyer re-validation as pain points.
- **Defensibility:** neutrality is hard for traders and certifiers to copy, because their business models conflict with it.
- **How to deepen:**
  - Open-source the rules and export formats (a DPG candidate).
  - Make one cooperative's pack readable by two different importers.

### 4. Complement to national systems: built on SNT, SICA and GCTS, not against them (Real 3 · Defensible 3–5)
- **What it is:** the SNT links a sale to a card. We turn card plus plots plus receipts into importer-grade Art 9–11 evidence. The SNT rollout's teething problems show the gap between national data and importer files ([Reuters via MyJoyOnline](https://www.myjoyonline.com/ivory-coast-cocoa-sellers-struggle-to-use-new-traceability-system/)).
- **Caveats:**
  - No importer data access to the SNT has been found.
  - Whether the CCC already runs volume checks is unknown. **Ask before claiming.**
- **Becomes a real moat if:** we get an MoU or pilot with the CCC (or FNC, COCOBOD) to read card or SICA data under consent. Regulator partnerships are the strongest moat in this market and the slowest to win.

### 5. Measured accuracy on real receipts (Real 1 · Defensible 4 if done)
- **Where it stands:** today it's an *unmeasured* claim (README: "Accuracy on real handwritten receipts is not yet measured"). TraceX publishes no accuracy figures either.
- **How to deepen:** a public benchmark (30–50 real Ivorian and Colombian receipts first, then hundreds) with field-level precision and recall for kg, date, name and card number. It would be the first published one in EUDR. A labelled receipt corpus is a genuine data asset. Model calls are commodity, labelled local documents are not.

---

## 5. Weak or fake edges (don't pitch these)

- **"AI reads paper": novelty.** TraceX already markets agentic OCR parsing. Vision LLMs are commodity. Pitch *what happens after the read* (human Accept, evidence chain), not the read itself.
- **"Free / cheap".** TradeAware has a free tier and €3,990/yr Professional. Whisp, Ground, Fairtrade Plot Insights and PbN are free. Price isn't a moat, and we have no price evidence for our own payer (the CI doc says "Price: not found").
- **"We check deforestation".** That's Whisp's result, not ours. Say "powered by FAO Whisp".
- **"Only tool with volume checks".** False: majors' yield caps, TraceX plot-to-volume flags, standard adviser guidance.
- **"Prevents smallholder exclusion".** Exclusion is still **forecast, not observed** (IISD Aug 2026: "leakage" risk, no counts). Say "reduces the risk".
- **"Multi-country".** Two and a half profiles against Meridia's 50+ origins. It shows the architecture is portable; it isn't an edge.
- **Ghana.** Low risk means Art 13 simplified due diligence: no Art 10/11 file is needed, and COCOBOD's GCTS links bags to farms. Our value there is small. Don't lead with Ghana.
- **Offline / low literacy.** Ground and ODK already do offline. We don't have an offline mode, so don't claim one.
- **"Excluding the red plot keeps the lot clean".** EFI says paper exclusion doesn't keep beans out of the physical chain ([EFI case study](https://efi.int/sites/default/files/2026-08/eudr_cop_cocoa_coffee_case_studyv2.pdf)), and mass balance isn't allowed. Present exclusion as a documentation decision that requires physical segregation.

---

## 6. Threats

**Who could crush this:**
- **TraceX.** Closest feature overlap: AI documents plus plot-to-volume flags plus cocoa-CI focus. It could ship "receipt photo → delivery" in weeks.
- **Meridia + SGS.** They own the "verified, auditor-grade" trust position we'd want for edge 1.
- **Fairtrade Plot Insights + Fairtrace** (free, sharing with importers from Oct 2026). If they open it beyond certified cooperatives, they take the "free for cooperatives" story.
- **CCC / COCOBOD.** Either could add volume checks and an importer portal to the SNT or GCTS, which would hollow out edge 4 in its home country. Treat them as partners, not targets.
- **Majors.** If they absorb indirect chains through premiums (Debenham's "two-year squeeze"), the independent mid-market shrinks.
- **LiveEO TradeAware self-serve** (Sep 2026) plus the SAP/Coupa channels capture SME importers before we reach them.

**Regulatory shifts:**
- **Could kill demand:**
  - A benchmark review that moves Côte d'Ivoire or Colombia to low risk would remove most of the Art 10/11 work.
  - Another delay or a "no-risk" category (the Commission declined one in May 2026, but Parliament pressure persists).
  - The postal-address alternative to geolocation, if it's interpreted broadly.
- **Could boost demand:**
  - Enforcement from 30 Dec 2026 with shipment-level checks (dry-run signal).
  - The micro and small importer wave on 30 Jun 2027 (price-sensitive, under-served).
  - Soluble coffee added to scope.
  - The ~70% EU share of Ivorian cocoa.
  - The Forced Labour Regulation (Dec 2027) reusing the same producer register.

---

## 7. Pitch moat line (3 sentences)

> "Satellites can tell you whether a plot was forest in 2020. They can't tell you whether 3 tonnes of beans could really have come from 2 hectares, and no inspector accepts a risk score without the paper behind it. EUDR-Snap is the buyer-neutral evidence layer on top of Côte d'Ivoire's producer card and FAO Whisp: every receipt is read, checked against the producer's mapped land, and decided by a named person, so the importer can hand the authorities a hashed file for each shipment. Every decision our reviewers make trains the yield baselines and receipt benchmark that no newcomer will have."

*(Before saying the last sentence, run at least one real-receipt evaluation so it isn't hollow. Say "powered by FAO Whisp" aloud.)*

---

## 8. To verify before slides
- Coolset's "51% of importers qualify for Art 13" figure (unverified, vendor source).
- Whether the CCC SNT runs per-card volume checks (ask the CCC).
- Mighty Earth's "No more excuses: companies are ready" article ([link](https://mightyearth.org/article/no-more-excuses-companies-are-ready-for-the-eudr/)): the fetch was refused, so the content is unread.
- Picterra, Agridigital, Ecosphere+, Starling: 2026 EUDR status not checked.
- Linklaters' single-source claim that delegated-act scrutiny ended 13 Sep 2026.

---

## 9. Moat strategy: what to build

*Phase 2. §1–8 found no moat today. This section designs one. The three candidates are meant to stack: **A** is the recommended bet, B supplies its trust and distribution, and C is what makes it compound.*

### New evidence behind this section

| Finding | Why it matters | Source |
|---|---|---|
| Dutch NVWA pilot inspections (20 operators, Aug 2025): reportedly only 7 of 20 had enough information behind their DDS, and only 3 of 14 risk assessments were adequate | Importers are failing on **evidence**, not on filing | [interu.io summary](https://www.interu.io/blog/eudr-enforcement-is-here-what-timber-importers-need-to-know-and-do) (**secondary; NVWA original not read**), [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/06/are-companies-ready-for-eudr-enforcement-dry-run-insights), [Sourcemap on NL/DE reviews](https://www.sourcemap.com/blog/how-rigorous-will-eudr-enforcement-be-recent-dutch-german-investigations-reveal-strict-dds-review) |
| Germany's BLE expects documents to be uploadable through its service portal. Authorities want to know **how** geolocation data was produced. Certification "helps but doesn't replace" due diligence | An evidence format has value if it matches what inspectors ask for | [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/06/are-companies-ready-for-eudr-enforcement-dry-run-insights), [EFI CoP certification meeting](https://efi.int/sites/default/files/2026-08/eudr-cop_adhoc_meeting_certificationv2.pdf) |
| Commission guidance notice C/2026/3896 (20 Jul 2026), non-binding | It's the reference to map our file sections against | [EUR-Lex](https://eur-lex.europa.eu/eli/C/2026/3896/oj/eng) (**not read in full**) |
| Cocoa cooperatives say "each company buying cocoa asks the cooperative to fulfil the company's own data requirements", so they keep parallel spreadsheets and tools | The pain a buyer-neutral cooperative-owned file solves | [Fern, Jun 2024](https://www.fern.org/publications-insight/eudr-practical-insights-into-cocoa-cooperatives-challenges-and-costs/) |
| Fairtrade's studied cooperatives come from the **~10% of Ivorian producers who are Fairtrade-certified** | Plot Insights and Fairtrace can't reach the other ~90% | [Fern](https://www.fern.org/publications-insight/eudr-practical-insights-into-cocoa-cooperatives-challenges-and-costs/) |
| About 600 cooperatives traded with the producer card from 1 Sep 2026. Earlier, 113 of 210 coded cooperatives or buyers had the system | The card is now a **national join key** linking receipt, producer and plots, which didn't exist before September | [Koaci](https://www.koaci.com/article/2026/09/17/cote-divoire/societe/cote-divoire-cacao-26-000-tonnes-deja-tracees-la-cote-divoire-accelere-avant-lecheance-europeenne_200632.html) |
| No public CCC API or importer data-sharing policy found. None found for SICA either | Route B starts with consented cooperative exports, not an API | Searches on 21 Nov 2026 ("not found") |
| The EU-funded **LIFE FairTHRIVE** (Fairtrade, 2025–28) trains SMEs for free, **non-licensees included**, and publishes a "digital solutions decision tree" | A free SME distribution channel we can get listed in | [Fairtrade SME page](https://www.fairtrade.net/en/for-business/eudr-support-for-smes.html), [decision tree PDF](https://www.fairtrade.net/content/dam/fairtrade/global/fairthrive/EUDR%20Decision%20tree%20software%20tool.pdf), [FoodNavigator](https://www.foodnavigator.com/Article/2025/06/09/fairtrade-given-grant-to-aid-eudr-compliance/) |
| FMO (Dutch DFI) finances EUDR-compliant cocoa sourcing via SUCDEN-CI, aimed at cooperatives and aggregators. The ZSL bank guide (Apr 2026) treats EUDR as credit risk and lists traceability-linked trade finance | Lenders need **evidence per shipment**, which is a second buyer for the same file | [FMO project](https://www.fmo.nl/project-detail/65210), [ZSL guide](https://cms.zsl.org/sites/default/files/2026-04/ZSL-EU-Deforestation-Regulation-EUDR-Guide-for-Banks-Relationship-Managers-v2.pdf) |
| IDH convenes the CCC, MINEF, ECOM, Cargill, ofi and Ivorian cooperatives on EUDR. It names **data sharing, common standards and data-ownership agreements** as the main bottleneck | The table to get a seat at | [IDH](https://idh.org/news/building-blocks-for-eudr-compliance) |
| EFI's Sustainable Cocoa Programme (EU-funded) publishes country legality tools and runs a cocoa/coffee community of practice with case studies | A neutral, credible pilot host and the Art 10 legality source | [EFI legal frameworks](https://efi.int/partnerships/cocoa/legal-frameworks), [EFI CoP case study](https://efi.int/sites/default/files/2026-08/eudr_cop_cocoa_coffee_case_studyv2.pdf) |

---

### Strategy A (recommended): the cooperative-owned **Shipment Evidence Passport**

**Mechanism:**
- **Switching costs from the audit trail**, plus a **two-sided network** of cooperatives and importers.
- The independent cooperative owns one evidence record. Each EU buyer gets a verifiable, read-only passport per shipment: receipts with photo hashes, the producer card, all of that card's plots, Whisp results, the volume test, named Accept/Exclude decisions and the Art 9/10/11 drafts.

**Why it compounds:**
- **The cooperative side builds history.** Every season adds receipts, decisions and plot versions. Art 12 requires 5-year retention, so leaving means abandoning an inspectable history.
- **Each new importer makes the passport more valuable to every cooperative.** "Fill once, every buyer accepts it" is Fern's pain removed. Each new cooperative makes the format more worth accepting for importers.
- **Lenders reuse it.** FMO-style trade finance can ask for the same file, which adds a third side at no extra build cost.

**Why incumbents won't copy it:**

| Incumbent | Conflict |
|---|---|
| Traders (BC, Cargill, ofi…) | Their programmes exist to *lock in* supply. A passport the cooperative can carry to a competitor works against that |
| Fairtrade Plot Insights / Fairtrace | Built for certified members (~10% of Ivorian producers). Opening it to everyone would undercut the value of certification |
| TraceX, Koltiva, Sourcemap, osapiens | Sold to the buyer or exporter on quote-based enterprise contracts. A free, cooperative-owned record that any rival buyer can read would undercut their seat licences. Possible for them technically, unattractive commercially |
| Meridia / SGS | They're the **verifier**. A passport is their *input*, so the natural relation is partnership. An auditor that also owned the cooperative's data would be conflicted |

**Why now:**
- The producer card became the mandatory national join key on **1 Sep 2026**.
- Enforcement starts **30 Dec 2026**.
- Micro and small importers, the least served segment, follow on **30 Jun 2027**.
- 56% of Ivorian cocoa is still indirect or untraceable ([EFI](https://efi.int/sites/default/files/files/flegtredd/Sustainable-cocoa-programme/Cocoa%20insights/EUDR%20preparedness%20check%20CIV_EN.pdf)).
- That leaves a ~7-month window before the SME wave picks a tool.

**First 3 moves (named targets):**
1. **This weekend:**
   - Publish the passport format (JSON schema + manifest of SHA-256 hashes) and a public **"verify a passport" page** on the Vercel deploy already staged in the repo (`eudr-snap/vercel.json`).
   - Demo: one cooperative pack verified by two different "importers".
   - *Metric:* the jury sees a tampered file fail verification.
2. **Weeks 1–6, find cooperatives:** recruit **2–3 independent (non-certified) cooperatives near Soubré/Nawa** via **IDH's cocoa programme** and the **EFI Sustainable Cocoa Programme** community of practice.
   - Pilot shape: one season, real receipts, data hosted in ECOWAS or authorised by ARTCI (precondition from the Côte d'Ivoire architecture doc).
   - *Metric:* passports issued per cooperative, and the share of the cooperative's deliveries covered.
3. **Months 2–6, find importers:** reach **2+ EU SME importers or bean-to-bar makers** through **LIFE FairTHRIVE** (get listed in its digital-solutions decision tree) and the Dutch **CBI** cocoa programme ([CBI](https://www.cbi.eu/market-information/cocoa-cocoa-products/tips-become-eudr-compliant)). Separately, ask **FMO** whether a passport can serve as evidence for a financed cooperative lot.
   - *Metrics:* **importers per cooperative > 1** (neutrality proven), repeat shipments, and **zero passports abandoned after a season** (switching cost is forming).

**What to add to the repo to start the flywheel (no edits made):**
- **Passport export with a signed manifest.** Extend `shared/export.js`: the pack already hashes its seven files. Add a manifest that lists them with the cooperative's signature (e.g. Ed25519), a schema version and a `consent` block saying which importer it is shared with and until when.
- **Verify endpoint and page.** Add `GET /verify` plus a static page to `server.js` and `public/`. Drop in a pack, recompute the hashes, check the signature and show "intact / altered". This is the artefact that inspectors and banks touch.
- **Append-only, hash-chained decision log.** `data/decisions.json` is plain JSON today. Give each Accept/Exclude its predecessor's hash, the reviewer's ID and the rule version. That turns the Art 11 log into tamper-evident evidence.
- **Cooperative-scoped storage.** Replace the per-profile `data/deliveries[-<profile>].json` with a per-cooperative vault (cooperative ID, retention date ≥ 5 years, revocable share links per importer).
- **Segregation record per EU lot.** Mass balance isn't allowed (FAQ v5), so the passport must state which physical lot excluded plots stayed out of. Add a lot/warehouse field to the `/api/lots` output.

---

### Strategy B: the **"inspectable by design"** evidence format, endorsed by a Competent Authority

**Mechanism:** regulator trust plus a de facto standard. Map every passport section to what inspectors ask for: the Mayer Brown dry-run points, the NVWA deficiency list, BLE portal uploads and Commission notice C/2026/3896. Then get one authority, or the EFI community of practice, to review a sample file.
- **Why it compounds:** once inspectors have seen and accepted the format, importers ask suppliers for it. This is how the GeoJSON spec became TRACES' standard.

**Why incumbents won't do it first:** big vendors optimise for DDS throughput and risk dashboards. Authorities can't endorse vendors, but they *can* comment on a public, open format. An open spec from a neutral party is easier for them to engage with than a SaaS product.

**Evidence the route is open:**
- The NVWA published lessons from its pilot inspections. The BLE shares deficiencies at industry events ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/06/are-companies-ready-for-eudr-enforcement-dry-run-insights)), so they are engaging with industry.
- No authority prescribes a file format ("no pre-set format", FAQ v5 Q5.16, cited in our architecture report). The slot is open.
- **Unverified:** whether any authority will review a third-party sample.

**First 3 moves:**
1. Write an "inspection crosswalk": each NVWA/BLE shortcoming → the passport field that answers it. Include it in the pitch.
2. Submit a synthetic Ivorian sample file to the **EFI EUDR community of practice** as a case study, and ask **Preferred by Nature** (free DD toolkit) to review it against their toolkit.
3. Ask the **NVWA** (English EUDR page: [NVWA](https://english.nvwa.nl/topics/eudr-regulation-on-deforestation-free-products)) and the **BLE** for feedback on the sample at an industry event.

*Metric:* time to answer a simulated "show me shipment X" request (minutes, not days), and any written authority or EFI feedback.

**Repo additions:**
- A `crosswalk` section in the HTML due-diligence report.
- A "how geolocation was produced" field per plot (GPS walk / SICA / declared). Authorities ask for this, and `sample-farms.json` partly holds it.
- Export of the Art 9–11 set as one PDF + ZIP shaped for a portal upload (**BLE format unverified**).

---

### Strategy C: an **open volume-plausibility benchmark** with proprietary calibration data

**Mechanism:** data network effect plus a published benchmark.
- **Open:** the rule (924 kg/ha = 2× the 462 kg/ha average, pooled per card) and its code. Ideally contribute it to the **FAO Forest Data Partnership / Whisp** ecosystem as an optional "deliveries" module.
- **Ours:** the **labelled outcomes**. For each flag, record whether the reviewer accepted (with a reason such as pruned farm or carry-over stock) or excluded it. Add field-level corrections from receipt extraction.
- **Why it compounds:** more cooperatives mean better regional and seasonal thresholds and fewer false positives. That lowers reviewer cost, which attracts more cooperatives. Nobody else publishes flag precision.

**Why incumbents won't do it:**
- Majors keep yield caps private (competitive data).
- TraceX's "plot-to-volume" flags are a black box, and publishing precision would expose them.
- Whisp is land-only by design ("knows land, not deliveries"), so we complement it rather than compete.

**Caveat:** an open rule is copyable by definition. **The moat is only the outcome data and being the reference implementer.** It depends on Strategy A's adoption, so it's a multiplier, not a standalone bet.

**First 3 moves:**
1. Run a 30–50 real-receipt extraction evaluation (the README says accuracy is unmeasured) and publish field-level accuracy.
2. Ask **Agri-Logic / the Barry Callebaut white-paper authors** for regional yield distributions (the source of the 462 kg/ha figure) to replace the single national ×2 threshold.
3. Propose the deliveries module to the Forest Data Partnership (via the Whisp GitHub).

*Metrics:* labelled decisions; **flag precision** (share of flags that end in mitigation or exclusion); extraction accuracy on kg, date and card number.

**Repo additions:**
- Persist the diff between each model-extracted value and the human-accepted value. `extract.js` already returns verbatim text and confidence, but corrections are not stored.
- An `npm run eval` harness over `test/fixtures/receipts-real/` with ground truth.
- A reason code on every decision in addition to free text.
- Versioned thresholds in `profiles/*/profile.json`, with source and calibration date recorded in each pack.

---

### Why A wins

| | TraceX | Meridia / SGS | Fairtrade Plot Insights | **EUDR-Snap passport** |
|---|---|---|---|---|
| Who owns the data | Buyer/exporter customer | Customer / auditor | Certified cooperative | **Any cooperative**, shared per buyer |
| Reach in Côte d'Ivoire | Paid customers | Paid verification | ~10% certified | **The ~90% non-certified, incl. indirect chains** |
| Receipt → card → plots → volume → named decision | Partial (docs + plot-to-volume flags, black box) | Field-data tests, no receipts found | Plots only | **Full chain, open rule, hash-verifiable** |
| Business model conflict with neutrality | Yes (seat licences) | Yes (verifier ≠ data owner) | Yes (certification value) | None, it's the product |
| Best relationship to us | Competitor | **Partner** (we're its input) | Complement (can import its plot data) | n/a |

A is the only bet that turns our weak, copyable features (reading receipts, volume flags, hashes) into something that **gets harder to leave every season and more valuable with every buyer**. It also sits where every incumbent has a structural reason not to follow. B makes A trusted, and C makes A smarter. **Biggest risk to A:** the CCC builds importer-facing exports into the SNT. The mitigation is to pitch the passport *to* the CCC and IDH as the importer-facing layer they don't need to build. If they say no, that's an early, cheap signal.

### Sharper pitch moat line (with "why now")

> "Since 1 September, every Ivorian cocoa sale carries a producer card, and from 30 December EU inspectors will ask importers for the paper trail behind each shipment. Today each buyer makes cooperatives fill in its own system, and the free tools serve only the 10% that are certified. EUDR-Snap gives every other cooperative one evidence passport it owns: receipts read, checked against all the producer's land, decided by a named person, sealed, and verifiable by any buyer, bank or inspector. Every season of history makes it harder to leave, and every buyer who accepts it makes it worth more to the next cooperative."
