# EUDR-Snap: Cocoa from Ghana

*Pipeline run of 21 Nov 2026. Every figure has a source link or the tag **verify**. "Not found" is allowed; a guess is not.*

**Status:** research **stopped at step 1**. Two of the skill's stop conditions fired: Ghana is low risk, and a national traceability system exists. The user decides how to continue before any app change.

---

## 1. Legal frame

| Question | Answer | Source |
|---|---|---|
| Annex I products and HS headings in scope | Cocoa beans: HS 1801. Other cocoa headings (1802–1806) to check against Annex I as amended | Reg. 2023/1115 Annex I, *verify the amended list* |
| Application dates | 30 Dec 2026 for large and medium operators; 30 Jun 2027 for micro and small | [Reg. 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj/eng) (already cited in the Colombian run) |
| **Country risk class** | **Low risk.** Ghana is listed under "Low risk countries" in the Annex. (Côte d'Ivoire is not listed, so it is standard risk; the Annex says "A standard level shall be maintained for all countries not listed".) | [Implementing Reg. 2025/1093, Annex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32025R1093), read 21 Nov 2026. The European Parliament objected to the regulation and the Commission plans to amend it in 2026 ([EP resolution](https://data.europarl.europa.eu/distribution/doc/TA-10-2025-0149_en.pdf)), so **verify before a slide** |
| Simplified routes available? | Yes, in principle. Art 13 simplified due diligence applies when all products come from low-risk countries: risk assessment (Art 10) and mitigation (Art 11) are not required, but the Art 9 information, including geolocation, still is. The simplified declaration is for micro and small primary operators established in low-risk countries | [EUDR Art 13](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023R1115); the declaration is described in the Colombian run's architecture report, *verify for Ghana* |
| Who is the operator? | The EU importer. In Ghana, licensed buying companies (LBCs) buy through purchasing clerks and sell to COCOBOD, which markets the exports | [IISD](https://iisd.org/system/files/2024-08/responsible-agricultural-investment-ghana-cocoa.pdf), [Ghana Business News](https://www.ghanabusinessnews.com/?p=43024) |
| Geolocation unit | The farm plot; the 4 ha point/polygon rule applies | Reg. 2023/1115 Art 2(28) |
| Mass-balance rules | Not allowed (FAQ v5 Q1.4–1.5). How COCOBOD's pooled export system segregates EUDR lots: **not found** | Colombian run sources; *verify for Ghana* |

## 2. Supply chain and the paper trail

| Step | Actor | Document | Paper or digital? | Source |
|---|---|---|---|---|
| Farmer sells to a buying centre | Purchasing clerk of an LBC | **Farmer passbook** entry (weight, sale); used as evidence for bonuses and scholarships | Paper | [Ghana Business News](https://www.ghanabusinessnews.com/?p=43024), [MyJoyOnline](https://www.myjoyonline.com/chief-condemns-nefarious-activities-of-cocoa-buyers/) |
| Quality check | Quality Control Company (QCC) | **Cocoa transfer receipt (CTR)** after clearance | Not found | [IISD](https://iisd.org/system/files/2024-08/responsible-agricultural-investment-ghana-cocoa.pdf) |
| Clerk records the purchase | LBC | Digital receipt where mobile payment is used | Digital (partial) | [Better Than Cash Alliance](https://www.betterthancash.org/news/the-cost-of-cash-to-ghanas-cocoa-sector) |

Weighing fraud by clerks is reported ([MyJoyOnline](https://www.myjoyonline.com/chief-condemns-nefarious-activities-of-cocoa-buyers/)). Local units (bags, kg dry beans): **verify**.

## 3. Existing systems: what's already solved

| System | Owner | Covers | Gap it leaves | Source |
|---|---|---|---|---|
| **Ghana Cocoa Traceability System (GCTS)** and its Deforestation Risk Assessment Module | COCOBOD | Farm-to-port tracking: farmer registration, farm mapping, linked to LBC purchase records and export documents; launched for the 2025/26 season | Coverage and verification are not publicly disclosed; a Right to Information request went unanswered | [GBC](https://www.gbcghanaonline.com/general/ghana-positions-cocoa-sector-for-full-compliance-with-eu-deforestation-regulation/2026/5/), [Earth.org](https://earth.org/squeezed-by-eu-rules-and-threat-of-illegal-mining-cocoa-farmers-in-ghana-face-a-turning-point/), [GIZ/INA](https://www.sustainable-supply-chains.org/news/from-pilot-to-national-rollout-ghanas-cocoa-traceability-system/) |
| Farmer registration and mapping | COCOBOD | 792,954 farmers registered and over 1.2 million ha mapped (Oct 2024); later reported as 1.24 million farms on ~1.38 million ha (early 2025) | 2026 totals not found; polygon versus point unknown | Secondary reporting via search; [EFI preparedness check](https://cocoa.efi.int/wp-content/uploads/2026/04/EUDR-Preparedness-check-of-Ghana.pdf), **verify against COCOBOD** |
| Private traceability (exporters, vendors) | Various | Not reviewed in this run | | |

**The gap EUDR-Snap would fill:** unclear. The national system already aims to link registered farms to purchase records, which is the gap EUDR-Snap fills in Colombia.

## 4. Impact

| Figure | Value | Year | Source |
|---|---|---|---|
| Area planted | ~1,364 thousand ha | 2024/25 | [USDA FAS](https://www.fas.usda.gov/data/ghana-ghana-cocoa-sector-overview-2025) |
| Bean exports | ~367 thousand t (one table); a projected 520,000 t in another USDA overview | 2024/25 | USDA FAS, *verify which* |
| Cocoa export earnings, H1 2025 | US$2.17 bn | 2025 | [Food Business MEA](https://www.foodbusinessmea.com/ghanas-cocoa-export-earnings-triple-in-h1-2025-amid-climate-concerns-looming-output-decline/) |
| Share of exports going to the EU | Not found | | |
| National average yield | Not found (FAOSTAT is the source to check) | | |
| Documented exclusion of smallholders | Not found | | |

## 5–9. Rules, legality, intake schema, outputs, data protection

Not started: blocked on the stop decision. Two leads already found:
- **Data protection:** Ghana's Data Protection Act 2012 (Act 843) requires data controllers to register with the Data Protection Commission. Sources disagree on cross-border transfer restrictions (s. 28), so **verify** in the Act ([DPC](https://dataprotection.org.gh/compliance/), [GhaLII](https://ghalii.org/akn/gh/act/2012/843/eng@2012-05-18)).
- **Whisp national layers for Ghana:** not found. Check Whisp's layer list before setting `nationalCodes`.

## 10. Review rounds

Not started.

## 11. Verify before a slide

- Ghana's low-risk status (the Commission is reviewing 2025/1093 in 2026).
- GCTS coverage figures (2024–25 numbers, secondary sources).
- Which USDA export figure applies.

## 12. Open questions

| Question | Why it matters | How to verify |
|---|---|---|
| Does GCTS link every passbook sale to a mapped farm, or only some LBCs and regions? | Decides whether there's a gap at all | COCOBOD, an LBC, the EFI preparedness check |
| How does COCOBOD's pooled export system keep EUDR lots segregated? | Mass balance isn't allowed | COCOBOD, an EU importer |
| What does an EU importer still need under Art 13 that GCTS doesn't hand over? | The only remaining value for EUDR-Snap in a low-risk country | An importer's compliance team |
