# EUDR-Snap: Cocoa from Côte d'Ivoire

*Pipeline run of 21 Nov 2026. Every figure has a source link or the tag **verify**. "Not found" is allowed; a guess is not.*

**Status:** built as a profile (`EUDR_PROFILE=cocoa-ci`). Stop condition 2 fired (a national traceability system exists). The user chose to reposition EUDR-Snap as a **verification layer** on top of it: a volume-plausibility check per producer card, plus the importer's Art 9/10/11 draft. Review loop: pending.

---

## 1. Legal frame

| Question | Answer | Source |
|---|---|---|
| Country risk class | **Standard risk**: Côte d'Ivoire is not listed in the Annex, which says "A standard level shall be maintained for all countries not listed" | [Implementing Reg. 2025/1093](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32025R1093), read 21 Nov 2026 |
| Simplified routes | None: Art 13 and the simplified declaration need low-risk origin. Full due diligence applies (Art 9 information, Art 10 risk assessment, Art 11 mitigation) | Reg. 2023/1115 Art 13 |
| Application dates | 30 Dec 2026 for large and medium operators; 30 Jun 2027 for micro and small | [Reg. 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj/eng) |
| HS heading | Cocoa beans: 1801 | Reg. 2023/1115 Annex I, *verify the amended list* |
| Geolocation | Plot; polygons above 4 ha | [EU cocoa factsheet for Côte d'Ivoire](https://international-partnerships.ec.europa.eu/system/files/2023-06/EUDR%20Cocoa%20factsheet_CDI_EN.pdf) |
| Operator | The EU importer | Reg. 2025/2650 |

## 2. Supply chain and the paper trail

| Step | Actor | Record | Paper or digital? | Source |
|---|---|---|---|---|
| Farmer to cooperative (or buyer) | Cooperative | Farmer lists, delivery receipts, farm locations, harvest quantities | Often paper (vendor source, indicative only) | [TraceX](https://tracextech.com/eudr-compliance/eudr-compliance-cocoa-exporters-cote-divoire/), *verify with a cooperative* |
| Every purchase from 1 Sep 2026 | Buyer | The **producer card** (carte du producteur) is required for all coffee and cocoa sales | Card-based | [Presse Côte d'Ivoire](https://www.pressecotedivoire.fr/24742-cafe-cacao-la-carte-du-producteur-devient-obligatoire-des-le-1er-septembre-2026) |

Verification limit: an EFI case study (2026) says there is no mechanism for verifying compliance at individual smallholder level through documents alone. Excluding a farm on paper doesn't guarantee its cocoa stays out of the physical chain, particularly where volumes per farm are very small ([EFI case study](https://efi.int/sites/default/files/2026-08/eudr_cop_cocoa_coffee_case_studyv2.pdf)).

## 3. Existing systems: what's already solved

| System | Owner | Covers | Gap it leaves | Source |
|---|---|---|---|---|
| **National traceability system (SNT)** | Conseil du Café-Cacao (CCC) | Traces beans from the plantation to the factory; officially launched 12 June 2026 | Coverage and data access for importers: not found | [AIP](https://www.aip.ci/38374/cote-divoire-aip-le-systeme-national-de-tracabilite-permet-de-retrouver-lhistorique-des-feves-de-cacao-et-cerises-de-cafe-depuis-la-plantation-jusqua-lusine-conseil/), [Presse Côte d'Ivoire](https://www.pressecotedivoire.fr/24742-cafe-cacao-la-carte-du-producteur-devient-obligatoire-des-le-1er-septembre-2026) |
| **Producer census and card** | CCC | 993,031 producers counted in 2019–2020 on 3.2 million ha surveyed; 1,040,021 producers identified in 2023; plantations geolocated nationally; the card is mandatory for every sale from 1 Sep 2026 | Plot-level evidence for importers: a vendor source says the card alone isn't enough | [Abidjan.net](https://news.abidjan.net/articles/717835/operationnalisation-de-la-carte-du-producteur-de-cafe-cacao-plus-dun-million-de-producteurs-deja-recenses), [AIP](https://www.aip.ci/38374/cote-divoire-aip-le-systeme-national-de-tracabilite-permet-de-retrouver-lhistorique-des-feves-de-cacao-et-cerises-de-cafe-depuis-la-plantation-jusqua-lusine-conseil/), [TraceX](https://tracextech.com/eudr-cocoa-compliance-cote-divoire/) |

**What may still be open** (to confirm): the SNT and the card tie a sale to a registered producer. Neither, as far as found, checks whether the volume sold is plausible for the producer's plots, and neither produces the importer's Art 10/11 file. EFI's finding that paper exclusion doesn't keep cocoa out of the chain is the problem that a volume-plausibility check addresses.

## 4. Impact

| Figure | Value | Year | Source |
|---|---|---|---|
| Producers | 1,040,021 identified | 2023 | [AIP](https://www.aip.ci/38374/cote-divoire-aip-le-systeme-national-de-tracabilite-permet-de-retrouver-lhistorique-des-feves-de-cacao-et-cerises-de-cafe-depuis-la-plantation-jusqua-lusine-conseil/) |
| Average yield | 435 kg/ha (farm average 4.87 ha); the top 20% of farms ~620 kg/ha, the bottom 20% ~350 kg/ha | 2016 (AFD); 2023 (Barry Callebaut/Agri-Logic) | [AFD](https://afd.fr/sites/default/files/2017-09/24-notes-techniques.pdf), [Barry Callebaut/Agri-Logic](https://www.barry-callebaut.com/system/files/2023-05/Barry%20Callebaut%20Agrilogic%20White%20Paper%202023_1.pdf); **old data, verify** |
| Share of exports going to the EU | Not found | | |

## 5. Rules for the app (leads)

- **Volume ceiling:** with an average of 435 kg/ha and the top fifth at ~620, a review threshold near 2× the average (~870 kg dry beans/ha) would sit well above good farms. Pending current data.
- **Whisp:** the BNETD 2020 land cover map (10 m, with a cocoa class, CC-BY-4.0) and a national cocoa probability layer exist ([Earth Engine catalog](https://developers.google.com/earth-engine/datasets/catalog/BNETD_land_cover_v1)). Whether Whisp uses them through `nationalCodes: ["ci"]`: **not found, verify**.

## 6–9. Legality, intake, outputs (as built)

- **Intake:** plots keyed by producer card (`producer_card`); one card can hold several plots. Deliveries are cooperative purchase records in kg of dry beans, season `2025-26` (main and mid crop pooled). Reading producer cards or SNT records isn't built: no importer data access found.
- **Rules:** `checkProducerVolumes` pools a season's sales per card over the measured area of all its plots; threshold 870 kg/ha (profile `rules.cocoa`). The 4 ha point/polygon rule is unchanged (Art 2(28)). Whisp field: `risk_pcrop` (cocoa is a perennial crop). `nationalCodes` isn't sent.
- **Outputs:** the same pack as Colombia, with `ProducerCountry: CI`, HS 1801 (`180100`), the producer card on each Art 9 plot, and Art 10 rows a, c, d, e, f, h replaced by Ivorian text from `profiles/cocoa-ci/profile.json`.
- **Demo data:** fully synthetic (names, cards, receipts, coordinates near Soubré); not checked with Whisp.

**Data protection:** Law 2013-450, administered by ARTCI. Every processing of personal data needs prior declaration or authorisation, which extends to geolocation systems and transfers abroad. A "third country" means outside ECOWAS. Transfer criteria: **not found** ([ARTCI via CIO Mag](https://cio-mag.com/?p=38189), [Journal officiel](https://cms21.anac.ci/uploads/748534/LOI_2013-450.pdf)).

## 10–12

Not started.
