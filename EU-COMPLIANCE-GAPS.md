# EU compliance gap analysis (for EUDR-Snap and alternatives)

*Done 21 Nov 2026 during the hack. One pass of desk research. Anything tagged **verify** needs checking before it goes on a slide.*

## 1. First, check the EUDR date

- **30 Dec 2026** still holds for large and medium operators. Regulation (EU) 2025/2650 moved it back one more year. **30 Jun 2027** applies to micro and small operators. As of mid-November 2026 there's no new delay proposal. ([EC Access2Markets](https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation), [Mayer Brown, Feb 2026](https://www.mayerbrown.com/en/insights/publications/2026/02/eu-regulation-on-deforestation-free-products-eudr-what-lies-ahead-in-2026))
- **The "39 days" hook is accurate.** One catch: the obligation falls on the EU importer, not the cooperative. Your pitch should say "cooperatives that can't supply plot data get dropped by importers". Don't say "cooperatives face fines".
- A delegated act adds products to the scope from **30 Dec 2027**. **Verify** which ones. If one of them is a crop your farmers grow, it gives you a second deadline for the scale slide.

## 2. The EUDR tooling space is more crowded than the pasted brief says

The "free digital public infrastructure" angle is already partly taken. Expect a juror to ask "how is this different from X?"

| Already exists | What it does | Free? |
|---|---|---|
| EU Information System (TRACES) | Where due diligence statements (DDS) are filed. It accepts GeoJSON. | Yes |
| FAO **Whisp** | Deforestation risk check on plot geometries, built for EUDR. | Yes, open source |
| Global Forest Watch / JRC forest map | Data on forest cover in 2020 and forest loss since then. | Yes |
| Koltiva, Farmforce, TraceX, Polygon One… | Paid farm-mapping and traceability platforms. | No |

**What's still open inside EUDR:** taking a photo of a **paper** receipt or land title and turning it into a clean farmer register. That's the step before Whisp and TRACES. So pitch EUDR-Snap as *the step from paper to plot data that feeds the free tools*, not as a rival to them. Call Whisp's API for the red pin, or say you will, so you aren't faking the risk check.

## 3. Commodities EUDR doesn't cover

EUDR covers **cattle, cocoa, coffee, oil palm, rubber, soya and wood**. These crops carry real deforestation or ecosystem risk but are **outside** it: **maize, sugarcane, cotton, cashew, avocado, and farmed shrimp** (shrimp farming clears mangroves).

**What this means for the hack:** these are gaps in the **regulation**, not gaps in the **market**. No EU rule means no importer is asking for data, so there's nobody to sell to. They work as a "Scale" slide line (the same pipeline is ready if the EUDR review widens the scope). They don't work as a hack target.

## 4. EU rules that hit small non-EU producers and have little free tooling

Ranked by how well each fits *your* team and build (photo of a paper record → structured data → file for the EU):

| # | Rule | Who it hits | Deadline | Tooling gap | Fit |
|---|---|---|---|---|---|
| 1 | **Organic Regulation (EU) 2018/848: group certification** | Smallholder organic groups exporting to the EU must run an *internal control system* (ICS): member list, plot records, internal inspections, sales and volume checks. Groups are capped at 2,000 members. **Verify** the exact cap and dates. | In force since 2025, with transition periods in some countries. **Verify.** | ICS records are mostly kept on paper and in Excel. | **Best.** Same farmers, plots and receipts as EUDR. Pitch it as "one register, two dossiers: EUDR DDS + organic ICS". This is your strongest extension. |
| 2 | **IUU fishing: CATCH system** | Exporters of fish to the EU. EU importers have had to use CATCH since **10 Jan 2026**. Non-EU countries may keep **paper** certificates, and small vessels have a *simplified* certificate. ([EC, Jan 2026](https://oceans-and-fisheries.ec.europa.eu/news/new-digital-certification-system-tackle-illegal-fishing-2026-01-12_en), [SeafoodSource](https://www.seafoodsource.com/news/environment-sustainability/new-digital-catch-certificate-goes-into-effect-in-eu)) | Live now | Paper from small-scale fleets has to be retyped into CATCH by someone in the EU. | **Good.** The mechanics are the same as EUDR-Snap (photo → JSON). It's a different sector, though, and switching would cost you your demo data. |
| 3 | **CBAM, definitive phase** | Non-EU producers of steel, aluminium, cement, fertiliser and hydrogen. Without verified emissions data, importers apply **punitive default values that rise in 2027 and 2028**, so small exporters lose buyers. ([EC CBAM](https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en), [IISD guide](https://iisd.org/publications/guide/navigating-eu-carbon-border-adjustment-mechanism)) | Live since 1 Jan 2026. First annual declaration in 2027. | Big consultancies serve large plants. Small foundries and fertiliser blenders get almost nothing. | Real gap, but it's B2B industry, not smallholders. Wrong team, wrong story for this pitch. |
| 4 | **Forced Labour Regulation (EU) 2024/3015** | Every product, any size, no threshold. | Applies **14 Dec 2027**. **Verify.** | No standard for what evidence counts yet. Guidance is still being written. | Too early. Maybe one line on the vision slide: "the same farmer register later carries labour evidence". |
| 5 | **Batteries Regulation: due diligence** (cobalt, lithium, nickel, graphite) | Artisanal miners in the DRC and elsewhere. | Pushed back to **2027** by an omnibus. **Verify.** | Hard to reach and politically sensitive. | Skip. |

**Avoid:** CSDDD (scope cut back and delayed by Omnibus I to large EU firms in 2028–29, so no smallholder pull yet).

## 5. Recommendation

Keep **EUDR-Snap** as the build. The deadline is real and dated, and the demo is already designed. Use the gaps for two slides:

- **Positioning:** "The step from paper to plot data that feeds free public tools (Whisp, TRACES)." This closes the "doesn't FAO already do this?" question before anyone asks it.
- **Scale:** "One farmer register, several EU dossiers": EUDR now → **organic ICS** next (same cooperatives) → products added to EUDR in Dec 2027 → forced-labour evidence in Dec 2027. Each step reuses the same photo-to-JSON engine.

Don't switch to fisheries or CBAM today. Both are real gaps, but changing sector this close to 16:00 means rebuilding your sample data and your story.
