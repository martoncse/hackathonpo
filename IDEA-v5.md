# CatatSekali v5: final idea after the feasibility, impact and novelty reviews

*Three reviewers (feasibility, impact, novelty) iterated on v3 from [HACK-PLAN.md](HACK-PLAN.md) until all three were satisfied (score ≥ 8, no blocking objection). Where this conflicts with v3, v5 wins. The MVP in `mvp/` already implements v3's reconcile flow. The build list below is what changes.*

| Round | Feasibility | Impact | Novelty |
|---|---|---|---|
| 1 (v3) | 6.5 | 6.5 | 6.5 |
| 2 (v4) | 7.5 | 7.5 | 8 ✅ |
| 3 (v5) | **8 ✅** | **8 ✅** | **8.5 ✅** (7 if the cut rule fires, see below) |

---

## The idea in one line

**"Others digitise paper. We check it against what the payer sees, both ways."** Say it at the start and again at the end. Tagline: *"Recovering care that already happened."*

The photo is only the input. The product is **Cek Dua Arah**, a two-way reconciliation between the paper outreach register and BPJS's P-Care.

## Why it's distinct (novelty)

- The photo step itself is commodity. Existing tools already turn photos of forms into data: Shreddr/Captricity (Mali), PATH SnapiForm (DRC, into DHIS2), Smart Paper (The Gambia), PaperEMR, and the KONEKSI/Summit Institute OCR pilot in 4 Indonesian puskesmas (2026). Infokes ePuskesmas already bridges digital records into P-Care.
- All of these move data **one way**. We found no tool that reconciles paper against P-Care, and none that turns the gap into the KBK contact rate, then the rating, then the capitation figure.
- **Competition slide wording:** "We found no tool that reconciles paper against P-Care." Name the four competitors on the slide.

## Demo moment (the Cek Dua Arah screen)

Demo mode (pre-extracted) → 10 visits from one outreach sheet → two columns:

| On paper, not in P-Care | In P-Care, no paper trace |
|---|---|
| **2 → recover** (Rudi, Nur) | **1 → check (not fraud)** |

Other results on the same screen:
- **Matches:** 7 matched, 1 probable (Siti, no card number). A probable entry can't be exported until a nurse adds the card number.
- **Contact rate:** 138.0 → 142.0 per 1,000 (6,000 members, 828 → 852), so the rating goes 1 → 2 and capitation 90% → 95%, *if the other two indicators are at rating 4*.

**Two hero numbers** under the columns:
- **≈ Rp 1.8m/month for this centre.** Footnote: illustrative, 6,000 members × Rp 6,000 × 5 pts. Permenkes 3/2023 sets Rp 3,600–9,000, which gives Rp 1.08–2.7m. At least 60% goes to staff service fees (Perpres 32/2014, check the 46/2021 amendment).
- **2 recovered visits now visible to the next clinician:** 1 child's measles-rubella dose (Nur, 9 months, *synthetic*), for immunisation follow-up, and 1 child's diarrhoea visit (Rudi, 3 years, *synthetic*). Don't use the word "complete".

After that: flag on visit #7 (no age) → download the P-Care entries (with the audit fields) and the FHIR Bundle.

## Answer to "you're gaming the metric"

"We record care that already happened. We don't invent care."
- Recovery requires an **exact card-number match**.
- Every exported entry carries the **photo SHA-256, sheet ID, row, reviewing nurse and timestamp**. "Every recovered contact carries its evidence. BPJS can audit any of them."
- The untraced column gives BPJS a data-quality signal it would want.
- **Named side effect:** fabricated contacts. Indicator: the share of recovered contacts that BPJS spot audits reject.

## Who adopts and pays (deployment, 35%)

- **BPJS Kesehatan: co-owner and payer** of the pilot. It gets a completeness and audit signal on KBK.
- **MoH Digital Transformation Office: standards and sandbox host** (regulatory sandbox, KMK 1280/2023). It gets SATUSEHAT FHIR records from paper-based sites.
- **District health office:** picks the pilot centres and sets the targets.
- **Precondition:** in-country model hosting (PP 28/2024 and the PDP Law). The prototype runs on synthetic data only.

## Impact and indicators

**Problem:** up to 15% of capitation depends on KBK (Peraturan BPJS 7/2019, still listed as in force). Say it in these words: *"a revision adding quality and promotive-preventive indicators has been announced."* Drop "110%".

**Evidence:** the Langkat study found a low P-Care contact rate while the manual records showed many visits, and attributed the gap to data entry (core.ac.uk/download/484014344.pdf, *read it before citing*). There is no national measurement; the month-0 pilot measures it.

**Indicators:**
- P-Care completeness
- contact-rate rating and KBK % per pilot centre
- untraced entries per month
- spot-audit rejection rate
- minutes of data entry per day
- immunisation record completeness for under-2s (pilot only)

**Cost-effectiveness:** running cost per sheet is about **Rp X**. *Fill X from today's real API bill, labelled "estimate". Don't leave it as "Rp X".* Compare it with Rp 1.08–2.7m recovered per centre each month. The alternative, a full EMR rollout with bridging, needs connectivity that 9.45% of centres lack and that 51.1% have only slowly (JMIR 2025).

## Keep out of spoken claims

- **The P-Care back-dated entry window.** Unverified after two searches. Present it as **pilot risk #1**, with a daily (end-of-day) fallback. Don't cite the two-year *claims* limit.
- **The ~10,000 puskesmas count.** Unverified.

---

## Build list (strict order, freeze the code at T-1h)

1. **Deploy `mvp/public` as a static site** (demo mode only). Hide "Read sheet" when `/api/extract` isn't available: use a build flag (`?static=1` or a JSON flag), or a probe with a short timeout, so there is never a spinner.
2. **Commit, and update the README and the `package.json` description.** Both still describe the old three-reports flow.
3. **Client-side timeout on the live photo call**, falling back to demo mode.
4. **Audit fields on each exported P-Care entry**, and block export of probable rows. In demo mode, hash the bundled sample-register asset and label the hash "demo".
5. **Cek Dua Arah untraced column.**
   - Give the whole sheet and its P-Care entries **one session ID** (e.g. `outreach-sheet-A-Nov-wk1`; the sheet covers 03–07/11 across three villages).
   - Seed **exactly one** untraced entry: same session, a card number not on the sheet, a date between 03 and 07/11.
   - Re-run demo mode and confirm the split stays 7/1/2 plus 1 untraced.
6. **Rupiah and patient counters**, from a constant in the JSON, with the word "synthetic" next to the names.
7. **Record the video on the deployed URL.** Freeze the code.

**Cut rule:** if step 5 isn't working by T-2h, it becomes a slide. In that case, drop "both ways" from the hero line **everywhere** (slides, video, pitch) and present the reverse check as "built next".

**Final submission: today, Saturday 16:00.**
