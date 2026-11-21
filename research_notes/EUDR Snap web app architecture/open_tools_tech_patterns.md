# Open-source building blocks and technical patterns for EUDR-Snap (as of 21 Nov 2026)

Note on method: about 20 searches/fetches. Items marked **(verify)** are from training knowledge or secondary summaries and were not confirmed against a primary page in this session. The canonical URL is given so the writer or team can check.

## 1. Open-source EUDR / traceability software: licence, maturity, pipeline coverage, APIs

### Takeaway
No single open tool covers the whole pipeline. The reusable stack is: **Whisp** (MIT) for risk; the **AgStack Asset Registry / GeoID** for plot identity; **INATrace** (MPL-2.0, now hosted under AgStack) as a reference or fork base for the farmer/cooperative/lot data model; **ODK/Kobo/QField** or GeoRoots/TerraTrac for field capture; **EPCIS 2.0** libraries for events. EUDR-Snap's distinct contribution would be LLM document intake and legal-document drafting, which none of these tools do.

### Cited Findings
- **Whisp (FAO / Forest Data Partnership):** the repo forestdatapartnership/whisp is MIT-licensed Python, and the `openforis-whisp` package is on PyPI under MIT. The hosted Whisp App can be called by API with keys users generate in the app — [ecosyste.ms listing](https://ost.ecosyste.ms/projects/300004), [PyPI](https://pypi.org/project/openforis-whisp/)
- Whisp takes geoIDs from the Asset Registry, one per plot. Its datasets cover tree cover at end-2020, deforestation since 2020 and crop plantations. It is intended for operators, verifiers and authorities — [FAO Whisp overview PDF](https://www.fao.org/fileadmin/user_upload/faoweb/NFM/WhispOverview.pdf), [WRI: Supporting EUDR compliance with Whisp](https://www.wri.org/update/supporting-eudr-compliance-whisp)
- I found no licence for the separate Whisp web-app/API service codebase. One listing points to it as a separate repo — [ecosyste.ms 336979](https://ost.ecosyste.ms/projects/336979) **(verify)**
- **INATrace (GIZ/BMZ):** its repositories moved from github.com/INATrace to the AgStack org: `agstack/inatrace-backend` (Java), `inatrace-frontend` (Angular), `inatrace-mobile`, `inatrace-coffee-network` — [github.com/INATrace](https://github.com/INATrace)
- The INATrace backend is licensed **MPL-2.0**, with copyright held by Anteja ECG, GIZ and Sunesis. It is a Java Spring Boot REST API on MySQL with Docker Compose. It has an OpenAPI definition (docs/api.md, also at docs.agstack.org) and around 1,100 commits. The README says it "supports compliance with regulations like the EUDR" and includes an internal management system for cooperatives. Its TECHNICAL_DOCUMENTATION.md is flagged as outdated — [agstack/inatrace-backend](https://github.com/agstack/inatrace-backend)
- The EFI lists INATrace among the most-used open and free apps for non-technical users — [ICTforAg INATrace](https://learningnetwork.ictforag.com/innovation/inatrace), [EFI: What tools are available to comply with EUDR](https://efi.int/publication/what-tools-are-available-comply-eudr)
- **AgStack Asset Registry:** `agstack/asset-registry` is "AR 1.0, current production", a Flask (Python) service for GeoID registration and resolution, last pushed 2026-05-15. Companion repos are `user-registry` (JWT/API keys) and `asset-registry-fe` (TypeScript). The org page says most projects are Apache-2.0 or EUPL-1.2, and some repos have no licence file. Check each one — [github.com/agstack](https://github.com/agstack)
- An "ar1.5-node" next-generation design (dated 2026-03-02) is reported to plan EU Data Spaces and W3C Verifiable Credentials support. This comes from a search summary only and the repo was not seen — [agstack GitHub](https://github.com/agstack) **(verify)**
- A GeoID is a unique alphanumeric identifier for a field boundary. The registry is a free public registry of "public geoIDs" that are anonymous and "addressable but not discoverable" — [AgStack Asset Registry](https://agstack.github.io/agstack-website/asset_registry), [EFI geolocation insight Dec 2025](https://efi.int/news/geolocation-under-eudr-compliance-requirement-supply-chain-opportunity-2025-12-05)
- **TerraTrac:** a field-mapping app funded by USDA. Its code was donated as open source, and it uses the AgStack Asset Registry to map, register and assess field compliance. It is part of the Forest Data Partnership's open DPI effort with WRI, FAO and TechnoServe (Nov 2024) — [TechnoServe announcement](https://www.technoserve.org/news/the-forest-data-partnership-unites-with-leading-organizations-to-develop-open-source-digital-infrastructure-to-accelerate-supply-chain-traceability-and-eudr-compliance/)
- **GeoRoots / GeoRoots Editor (EFI, Feb 2026):** open-source, browser-based tools for EUDR geodata preparation. All processing happens on the user's device — [EFI GeoRoots](https://efi.int/article/georoots), [GeoRoots Editor news](https://efi.int/news/georoots-editor-accessible-secure-and-eudr-ready-geodata-editing-directly-your-browser-2026-02)
- **Honduras coffee open traceability tool:** the Alliance Bioversity-CIAT built it with BMZ/GIZ support, co-designed with farmers, and it produced the first EUDR-aligned shipment — [Alliance story](https://alliancebioversityciat.org/stories/honduran-coffee-shipment-first-align-europes-upcoming-deforestation-rules-using-open-source), [CGSpace paper](https://cgspace.cgiar.org/items/c129b79f-0c26-48a5-8a74-d6fd3d03873e)
- **Global Forest Watch:** GFW Pro is a separate, commercial-facing portfolio-monitoring platform for the seven EUDR commodities (closed platform, free access tiers). GFW open data can be used for EUDR monitoring — [GFW Pro EUDR](https://pro-news.globalforestwatch.org/news-events/how-gfw-pro-supports-eudr-compliance), [GFW blog](https://www.globalforestwatch.org/blog/data/satellite-data-eu-regulation-deforestation-free-supply-chains/)
- WRI names the ITC Deforestation Free Gateway, GFW Pro and FAO Whisp as risk-screening platforms — [WRI](https://www.wri.org/technical-perspectives/eu-deforestation-regulation-compliance-underway)
- **OpenTraceability:** MIT-licensed .NET library (NuGet, about v1.2.4-beta) with a Java port on Maven Central (io.github.ift-gftc). It maps EPCIS 1.2 XML, EPCIS 2.0 XML and EPCIS 2.0 JSON-LD and has a GDST extension. Its origin is seafood traceability, and no EUDR-specific profile was found — [NuGet](https://www.nuget.org/packages/OpenTraceability/1.2.4-beta77), [Maven](https://central.sonatype.com/artifact/io.github.ift-gftc/opentraceability)
- Other EPCIS options: the **openepcis** GitHub org (Java EPCIS 2.0 tools) and the **epcis2.js** npm package, which suits a Node.js stack — [github.com/openepcis](https://github.com/openepcis), [npm epcis2.js](https://www.npmjs.com/package/epcis2.js), [GS1 EPCIS](https://www.gs1.org/epcis)
- **Field capture apps:** KoboToolbox is fully open source and stores forms and submissions on the device offline until there is coverage. ODK works offline-then-sync but is "not a full GIS editor". QField (QGIS-based, open source) has an EUDR data-collection solution page, and QFieldCloud is subscription-priced — [FOSS4G 2025 talk](https://talks.osgeo.org/foss4g-2025/talk/BXYXV3/), [QField EUDR](https://qfield.org/solutions/eudr-data-collection/), [QField pricing](https://qfield.org/pricing/)
- Mergin Maps also markets EUDR geolocation collection (QGIS-based) — [Mergin Maps EUDR](https://merginmaps.com/industry/eudr-geolocation-data-collection)
- Licences from training knowledge: ODK Collect is Apache-2.0 ([getodk/collect](https://github.com/getodk/collect)), KoboToolbox kpi is AGPL-3.0 ([kobotoolbox/kpi](https://github.com/kobotoolbox/kpi)), QField is GPL-2.0+ ([opengisch/QField](https://github.com/opengisch/QField)), and Mapeo/CoMapeo by Awana Digital is GPL-3.0 and peer-to-peer offline ([digidem](https://github.com/digidem)) **(verify all)**
- An assessment report on crop-area data collection tools for EUDR exists (ALI-SEA) — [ALI-SEA dataset](https://ckan.ali-sea.org/dataset/d4b954a6-e1eb-4ad1-80de-4ad51560a815)
- Open Foris Collect Earth and Arena are FAO open-source tools for land and forest monitoring — [Open Foris](https://www.fao.org/in-action/openforis/overview). I did not confirm their exact licences or EUDR features.

### Inferences
- The simplest reuse path for a Node.js team: call the Whisp API for risk, register plots in the AgStack Asset Registry to get GeoIDs, and borrow the INATrace data model (farmer, plot, purchase/delivery, processing, lot) rather than forking its Java stack. Forking INATrace is the right choice only if the team wants a full cooperative ERP.
- MPL-2.0 (INATrace) is file-level copyleft. Modified INATrace files must stay MPL, but new EUDR-Snap modules can use any licence. That is compatible with an Apache-2.0 or MIT DPG.
- Polygon walking does not need to be built from scratch. Accept GeoJSON exported from ODK, Kobo, QField or TerraTrac, or embed GeoRoots-style client-side editing.

### Gaps
- No primary page was seen for the Whisp API endpoint list or rate limits, the Asset Registry GeoID generation algorithm (an S2-cell-based hash is believed but **verify**), or Meridia (a commercial company, not open source, **verify**).
- No maintained, well-known "EUDR open source" GitHub monorepo turned up beyond the above.
- The EFI tools annex PDF returned 404.

## 2. Data model patterns: farmer, plot, delivery, lot, shipment, DDS; segregation vs mass balance; EPCIS; GeoID

### Takeaway
Model an append-only event chain (EPCIS-style: commission, observe, aggregate, transform, ship) over core entities: Farmer, Plot (versioned geometry plus GeoID), Delivery, Lot, Shipment and Declaration (DDS, or simplified declaration). Each lot must resolve to the set of plot GeoIDs it came from. Under the Commission reading, mass balance cannot blend in unknown or non-compliant material. Mixing compliant-only inputs is allowed if each origin is recorded.

### Cited Findings
- The Commission FAQ position (as quoted by secondary sources) is that mass balance supply chains do not meet EUDR requirements (FAQ 5.3), and commodities must be kept deforestation-free at each step — [Farmerline FAQ deep dive](https://farmerline.co/eudr-faq-deep-divegeolocation-traceability-and-the-end-of-mass-balance/), [Trustrace](https://trustrace.com/knowledge-hub/common-questions-food-beverage-brands-eudr-part-1)
- Mixing is allowed only if all inputs are EUDR-compliant, with due diligence information kept for every product and production site. Fairtrade argues its mass balance can still work, so this point is contested — [Fairtrade Mass balance & EUDR (2026)](https://www.fairtrade.net/content/dam/fairtrade/global/fairthrive/Mass%20balance%20for%20EUDR.pdf)
- There is no exception to the geolocation traceability requirement — [EU Green Forum traceability page](https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/traceability-and-geolocation-commodities-subject-eudr_en)
- The Finnish authority says that after the Dec 2025 amendment, some placements may use mass balance or FIFO without physical separation (forest sector context) — [Ruokavirasto FAQ](https://www.ruokavirasto.fi/en/themes/deforestation-regulation/faq-eudr/) **(verify scope)**
- The latest Commission FAQ is the 5th iteration (Aug 2026) — [FAQ 5th iteration PDF](https://transition-pathways.europa.eu/system/files/media/document/2026-08/FAQ-UPDATE-5th-Iteration-EN.pdf) **(not read; verify mass balance wording)**
- **Regulation (EU) 2025/2650** (adopted 19 Dec 2025, published 23 Dec 2025) did the following:
  - created "micro or small primary operators" in low-risk countries, who file a **one-time simplified declaration** (new Annex III) instead of a DDS and receive a declaration identifier
  - removed the requirement for downstream operators to file their own DDS; they keep the upstream reference number instead
  - moved general application to **30 Dec 2026**; micro/small operators reportedly apply from 30 June 2027 (**verify**)
  — [EUR-Lex 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj/eng), [Commission Access2Markets](https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation), [EY](https://globaltaxnews.ey.com/news/2026-0237), [Völkerrechtsblog](https://voelkerrechtsblog.org/de/?p=28140)
- Smallholder cooperatives in high- or standard-risk producer countries (e.g. Latin American coffee/cocoa) are not "low-risk country" operators. In practice the EU importer is usually the operator, and the cooperative supplies data — inferred from the [EUR-Lex 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj/eng) definition **(verify the country benchmarking of the target country)**
- **DDS geolocation payload (TRACES):** GeoJSON (Feature/FeatureCollection) with Point/MultiPoint/Polygon/MultiPolygon. Properties are `ProductionPlace`, `ProducerName`, `ProducerCountry` (ISO2, required per Feature in multi-producer "Type II" files) and `Area` (ha, numeric, Points only; 4 ha assumed if omitted). Names are case-sensitive and the limit is 25 MB per DDS — [TRACES GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **EPCIS 2.0 / VC:** GS1 describes combining verifiable credentials with EPCIS for end-to-end traceability. The W3C Verifiable Supply Chain CG drafts model EPCIS 2.0 events as VCs (CG draft, not a standard) — [GS1 VC+EPCIS white paper](https://ref.gs1.org/docs/2022/GS1-WhitePaper-VerifiableCredentials-EPCIS-end-to-end-traceability), [W3C VSC requirements](https://w3c-cg.github.io/vsc/specs/vsc-requirements.html)
- GeoIDs give anonymous, consistent identifiers to plot polygons across systems — [EFI geolocation article](https://efi.int/news/geolocation-under-eudr-compliance-requirement-supply-chain-opportunity-2025-12-05)

### Inferences
- Suggested schema (Postgres + PostGIS):
  - `farmer`: id, consent records
  - `plot`: id, farmer_id, geoid
  - `plot_geometry_version`: plot_id, version, geom, source (walk/draw/import/LLM-never), accuracy_m, captured_at, captured_by, valid_from/valid_to, whisp_result_json
  - `harvest_delivery`: farmer_id, plot_ids[], kg, date, receipt_doc_id
  - `lot`: inputs via a `lot_input` join with kg per delivery, enabling a per-lot plot set
  - `shipment`: lots[]
  - `declaration`: type DDS/simplified, reference_no, verification_no, geojson_snapshot_hash, status
  - `event`: an EPCIS-shaped, append-only log
- Use the GeoID as the external plot key shared with importers. Keep farmer PII in cooperative-controlled tables and share only GeoID, geometry and the ProducerName the importer needs.
- Store a frozen GeoJSON snapshot and its hash with each declaration, because geometry versions change after submission.
- A yield plausibility check (kg delivered / plot ha against the national yield benchmark) works naturally as a constraint on `lot_input`.

### Gaps
- The exact TRACES DDS API (SOAP/REST) field list and the Annex III simplified-declaration fields were not fetched.
- No published EUDR-specific EPCIS profile was found.

## 3. Geometry quality: validation, repair, smartphone GPS accuracy, overlaps, area

### Takeaway
Enforce the TRACES rules at intake: WGS84, lon/lat order, 6 decimals, closed rings, no self-intersection, no holes, no LineStrings. Repair with ST_MakeValid, shapely `make_valid` or turf, then simplify. Compute area geodesically. Expect smartphone area errors of about 4–7%, with outliers of 10% or more. Flag overlaps between farmers with a PostGIS spatial index and an intersection-area ratio.

### Cited Findings
- TRACES rejects: self-crossing polygons, internal overlaps/folds, holes (split a doughnut into two halves instead), open rings, LineStrings, redundant points on straight edges, duplicate vertices after rounding to 6 decimals, out-of-range coordinates, bad ISO2 codes and numbers stored as strings. Only EPSG:4326 is accepted, and coordinates are truncated to 6 decimals — [TRACES GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- TRACES recommends a single point (with Area) for plots under 4 ha, to keep file size down — [TRACES GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- Smartphone GPS area error: the mean absolute area error was 4–7% across tests, at least one plot per test was off by 10% or more, and the device-reported accuracy did not predict the actual error — [Seyyedhasani et al. 2016, Trans. ASABE](https://uknowledge.uky.edu/bae_facpub/16)
- The World Bank LSMS study (Ethiopia, Nigeria, Tanzania) found handheld GPS the best-supported method for plot area in household surveys, while farmer self-report is error-prone — [Carletto et al. 2017, Survey Research Methods](https://ojs.ub.uni-konstanz.de/srm/article/view/6791)
- A Ghana smallholder study found GPS area agreed well with aerial imagery — [Wahab 2019, GeoJournal](https://link.springer.com/content/pdf/10.1007/s10708-019-10039-9.pdf)
- Repair tooling (training knowledge, **verify versions**):
  - PostGIS `ST_MakeValid`, `ST_IsValidReason` and `ST_Area(geography)` — [PostGIS docs](https://postgis.net/docs/ST_MakeValid.html)
  - shapely 2.x `make_valid` / `is_valid_reason` — [shapely docs](https://shapely.readthedocs.io/)
  - turf.js `@turf/kinks`, `@turf/area` (geodesic), `@turf/intersect`, `@turf/simplify`, `@turf/boolean-valid` — [turfjs.org](https://turfjs.org/)
  - Note: `ST_MakeValid` can return MultiPolygons or GeometryCollections, which must be filtered to polygonal parts before export.

### Inferences
- Intake pipeline:
  1. Parse
  2. Reproject to 4326
  3. Round to 6 decimals and drop duplicate vertices
  4. Close rings
  5. Check kinks; if found, run make_valid, keep only polygonal parts and fill holes, then show a diff for human confirmation
  6. Simplify (Douglas–Peucker, about 1–2 m tolerance) without moving vertices beyond GPS error
  7. Compute geodesic area and compare it with declared area (flag if over ±15%)
  8. Apply the 4 ha rule: a point is allowed under 4 ha, a polygon is required at or above 4 ha
  9. Check overlaps: `ST_Intersects` plus intersection area / min(area) above a threshold (e.g. 10%) flags a duplicate or neighbour dispute; near-identical geometries (e.g. Hausdorff distance under 5 m) flag duplicate registration
- Because device-reported accuracy is unreliable, record the walk's vertex count and per-point HDOP/accuracy, and require at least N points or a minimum walk duration.
- For small plots, a margin of ±10% on area error is realistic. Avoid hard rejection when 4 ha decisions sit at the boundary (3.6–4.4 ha); route those to review.

### Gaps
- No smallholder-tropical-canopy-specific smartphone polygon accuracy study was found (canopy degrades GNSS; **verify**).

## 4. LLM document extraction best practices

### Takeaway
Use Claude vision with **structured outputs (JSON schema)**. Every field should be nullable and carry per-field confidence plus a source snippet or bounding region. Low-confidence or legally material fields (names, IDs, quantities, dates) go to human review. Coordinates are never accepted from the LLM unless they are read verbatim from the document, and even then they are marked "transcribed, unverified" until checked on the map. Log model ID, prompt hash, input image hash and output for audit.

### Cited Findings
- Claude structured outputs: `output_config.format` with `type: "json_schema"` guarantees valid JSON matching the schema. The beta header (`structured-outputs-2025-11-13`) is no longer needed, and the legacy `output_format` parameter still works during migration — [Claude docs: Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Structured outputs are documented as incompatible with citations on Bedrock (a 400 error) — [AWS Bedrock Claude structured outputs](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-structured-outputs.md) **(verify on Claude API directly)**
- If max_tokens is reached, the JSON can be truncated even with structured outputs on, so check `stop_reason` — [AWS Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.md)
- Anthropic article on structured outputs on the Claude Developer Platform — [claude.com blog](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform)

### Inferences
- Schema design:
  - Every field is `{value, confidence: high|medium|low, evidence: "verbatim text as read", page, illegible: bool}`
  - Add a top-level `document_type`, `language` (es/pt/fr) and `warnings[]`
  - Put explicit instructions in the prompt: "return null if not legible; never infer, compute or estimate coordinates, areas or IDs"
  - Keep `transcribed_coordinates` (verbatim) separate from `geometry` (only from GPS/map, never from the LLM)
- Since citations and structured outputs may not combine, run two calls: (a) a structured extraction, and (b) an optional citation-backed verification pass, or a deterministic check that each `evidence` string exists in an OCR text layer.
- Handwriting and Spanish: keep the original-language value plus a normalised value (e.g. "quintales" converted to kg with the conversion factor shown). Run a deterministic post-check: date formats, cedula/DNI checksum where one exists, and kg within the plot yield plausibility.
- Human-in-the-loop UI: show the image side by side with the fields, highlight low-confidence fields, require a click-to-accept, and store reviewer ID and timestamp. That review record is what makes the data defensible.
- Audit trail: an append-only `extraction_run` table holding image SHA-256, model ID, prompt version, raw JSON, reviewer diffs and final values.

### Gaps
- No 2025–26 benchmark of Claude vision on handwritten Spanish agricultural receipts was found. Run an internal eval on 30–50 real documents.

## 5. Generating legal/compliance text safely

### Takeaway
Fill a fixed template first and use the LLM second. Deterministic code fills every factual field of the DDS data and risk memo from reviewed database records. The LLM only drafts narrative sections (risk assessment reasoning, mitigation measures), retrieving over the EUDR text and the cooperative's evidence, with each claim tied to an evidence ID or article number. A named human signs off. Outputs are versioned and hashed and carry a "decision-support, not legal advice" disclaimer. Evidence from legaltech shows RAG still hallucinates at 17% or more.

### Cited Findings
- Stanford RegLab/HAI found that Lexis+ AI and Ask Practical Law AI hallucinated more than 17% of the time, and Westlaw AI-Assisted Research about 33–34%. RAG reduces but does not eliminate hallucination. A hallucination was defined as an incorrect answer or one that falsely claims a source supports it — [Stanford HAI](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries), [Magesh et al., J. Empirical Legal Studies 2025 / arXiv 2405.20362](https://arxiv.org/abs/2405.20362)
- Lexis+ AI answered 65% of queries accurately and Westlaw 42% — [arXiv 2405.20362](https://arxiv.org/html/2405.20362v1)
- The regulation's base text is on EUR-Lex: Regulation 2023/1115, amended by 2025/2650 — [EUR-Lex 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj/eng)

### Inferences
- Pattern:
  - (1) Templates for the DDS data fields (Annex II), the simplified declaration (Annex III) and the risk memo structure, following the Art. 10 risk criteria and Art. 11 mitigation.
  - (2) Retrieval over a chunked, consolidated EUDR text, the Commission FAQ and guidance, pinned by version and date.
  - (3) The LLM output schema forces `claims[] {text, evidence_ids[], article_refs[]}`, and a validator rejects any claim without a resolvable reference.
  - (4) Deterministic numbers: the LLM never writes kg, ha or coordinates in prose; these are injected from the DB.
  - (5) Sign-off workflow with roles (cooperative manager, importer compliance officer) and a hash plus version on the PDF.
  - (6) Disclaimer, and liability stays with the operator under the EUDR.
- Given the 17%+ error rate even in commercial legal RAG, citation-verification and human sign-off are needed controls, not optional extras.

### Gaps
- No public example was found of an EUDR-specific LLM drafting tool with published accuracy.

## 6. DPG / DPI criteria, open licensing, data sovereignty, verifiable credentials

### Takeaway
To qualify as a Digital Public Good, the project must meet all 9 DPGA indicators. These include an approved open licence, documentation, data privacy (indicator 7, strengthened Sept 2025) and do-no-harm (indicator 9), and AI-system requirements now apply too. Sovereignty pattern: the cooperative is the data controller and shares GeoID-scoped data with importers under consent. Compliance proofs can be shared as W3C VC 2.0 credentials (a W3C Recommendation since 2025) following UN/CEFACT UNTP patterns.

### Cited Findings
- The DPG Standard has 9 indicators, and all must be met. It applies to software, data, AI systems and content. It requires an approved open licence and documentation, and the Standard itself is CC-BY-SA 4.0 — [DPG Standard](https://digitalpublicgoods.net/standard)
- In Sept 2025 the DPGA added a strengthened privacy and data-security framework touching indicators 7 and 9(a), with a best-practice annex — [DPGA blog Sept 2025](https://www.digitalpublicgoods.net/blog/privacy-and-data-security-framework-for-dpg-standard)
- AI-system requirements were updated in 2025 (an AI system's DPG eligibility involves model, data and code openness) — [DPGA: AI systems as DPGs](https://www.digitalpublicgoods.net/blog/ai-systems-as-dpgs)
- The DPGA review covers the core solution, not local deployments — [DPG submission guide](https://digitalpublicgoods.net/digital-public-goods/submission-guide/)
- UNDP links the DPG Standard with the Universal DPI Safeguards Framework — [UNDP blog](https://www.undp.org/digital-innovation/blog/how-dpg-standard-and-universal-dpi-safeguards-framework-are-charting-safe-and-inclusive-digital-future)
- **W3C VC Data Model 2.0 became a W3C Recommendation in 2025**, with companion specs (Bitstring Status List, Data Integrity) — [W3C press release](https://www.w3.org/press-releases/2025/verifiable-credentials-2-0)
- **UNTP (UN/CEFACT)** issues product passports, conformity credentials and traceability events as VC 2.0 credentials (JSON-LD), with did:web and Bitstring Status List — [UNTP spec: VCs](https://spec-untp-fbb45f.opensource.unicc.org/docs/0.6.0/specification/VerifiableCredentials) **(verify current version)**
- The W3C CCG Traceability Interoperability v1.0 report is a Community Group report, not a standard — [W3C CG report](https://w3.org/community/reports/credentials/CG-FINAL-traceability-interop-20241204)
- AgStack GeoIDs are "anonymous, addressable but not discoverable", which supports privacy-preserving plot sharing — [AgStack Asset Registry](https://agstack.github.io/agstack-website/asset_registry)
- Preferred by Nature has published a geospatial data-sharing protocol for deforestation-free chains — [Preferred by Nature](https://www.preferredbynature.org/da/node/9497)

### Inferences
- For Claude-based features under the DPG AI-system rules: a proprietary model API means the AI component itself is not an open AI system. Design the LLM as an optional, swappable adapter (any model that supports JSON schema output), with a fully manual path so the core DPG stays open. **(verify with DPGA how they assess proprietary-API dependencies)**
- Licence choice: Apache-2.0 (permissive, matches the AgStack norm) or EUPL-1.2 (EU-friendly copyleft). Templates and docs go under CC-BY-4.0.
- Sovereignty: tenant per cooperative; consent records per importer (scope: lots, plots/GeoIDs, fields, expiry); share by signed VC (e.g. a "LotOriginCredential" listing GeoIDs + Whisp result hash + reviewer) rather than handing over raw DB access; revocation via Bitstring Status List.

### Gaps
- The full indicator wording was not fetched.
- AgStack ar1.5 VC support could not be confirmed.

## 7. Offline-first / low-bandwidth patterns, hosting and cost

### Takeaway
Use a PWA with a service worker and IndexedDB outbox (with conflict-free append-only events), cache map tiles for the cooperative area, compress photos client-side before upload, and do server-side LLM and Whisp calls on sync. A single small VM with Postgres/PostGIS can serve dozens of cooperatives. LLM cost per document is cents. Field capture can lean on existing offline apps (ODK, Kobo, QField, CoMapeo) and import their GeoJSON.

### Cited Findings
- Kobo and ODK store forms and submissions on the device until connectivity returns — [FOSS4G 2025](https://talks.osgeo.org/foss4g-2025/talk/BXYXV3/)
- GeoRoots Editor processes geodata fully client-side in the browser, which is a precedent for a privacy-preserving PWA — [EFI GeoRoots Editor](https://efi.int/news/georoots-editor-accessible-secure-and-eudr-ready-geodata-editing-directly-your-browser-2026-02)
- The QFieldCloud sync service is subscription-priced — [QField pricing](https://qfield.org/pricing/)
- The TRACES 25 MB limit per DDS, plus point geometry for small plots, keeps payloads small — [TRACES GeoJSON](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)

### Inferences
- Stack proposal:
  - Frontend: Leaflet (already used) or MapLibre GL, plus Workbox service worker and Dexie (IndexedDB) for the outbox
  - Watch-position walk mode records the accuracy for every point
  - Images compressed to about 1600px JPEG (~200–400 KB)
  - Backend: Node.js + Postgres/PostGIS
  - Job queue: pg-boss or BullMQ for Whisp and LLM calls
  - Object storage: S3-compatible (e.g. MinIO) for photos
- Event IDs are generated client-side as UUIDv7 so offline edits merge by append. Geometry edits create new versions and never overwrite.
- Cost estimate (assumption, **verify current prices**): one 2–4 vCPU VM plus managed Postgres comes to about EUR 30–80/month on an EU host (Hetzner/OVH/Scaleway).
- LLM cost, assuming one receipt image is about 1.5k input tokens and the output is about 500 tokens: a mid-tier Claude model costs on the order of EUR 0.01 per document. Check current pricing at [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) **(verify)**.
- Whisp API calls are free with an API key (rate limits not verified).
- Under DPI funding, a hosting per cooperative of under EUR 100/month looks feasible. The main cost is human onboarding and field support.

### Gaps
- No primary benchmark for offline-sync frameworks (PouchDB/CouchDB, RxDB, ElectricSQL, PowerSync) for this use was gathered.
- Hosting and LLM prices are not verified.
