# Worked example: DossierClair (spec)

A fully worked one-page spec, so you can see what "filled in properly" looks like. Lens: **public policy**.

Use it as a sanity check. If your spec is vaguer than this, tighten it. If it's broader, cut.

> Figures in this example are there to show the shape. Any team using a similar problem must check the source itself before putting a number on a slide.

---

## Lens
Public policy.

## Problem
About a third of households eligible for the RSA don't claim it in a given quarter (DREES, 2022), and incomplete paperwork is one of the reasons.

## User
A social worker at a CCAS (municipal social action centre) who sees about eight households a day and has 30 minutes per appointment to work out what they're entitled to.

## Evidence
DREES study on RSA non-take-up (2022). One team member did an internship at a CCAS and has spoken to two social workers; both said the documents check eats most of the appointment. To verify with the public-sector mentors.

## Demo moment
- **Juror does:** uploads phone photos of three documents for a fictional household: a payslip, a tax notice and a rent receipt
- **Our product does:** reads the documents, extracts income, household size and rent, and checks them against the eligibility rules of three benefits (RSA, prime d'activité, housing aid)
- **Juror sees:** a one-page sheet in plain French: "Likely eligible: prime d'activité, housing aid. Missing for RSA: proof of address." Each line shows the document it came from

**Real case used:** a synthetic household built from the official eligibility simulator's examples. No real person's documents.

## AI move
Documents and images: extracting structured fields from photographed forms, then a reasoning step against written eligibility rules.

## What's in (max 3)
1. Upload of three document types, with field extraction shown on screen
2. Eligibility check for three benefits, each result linked to its source document
3. A printable one-page action sheet for the household

## What's out
- ❌ Filing the claim on the household's behalf *(legal and identity issues, and judges will ask anyway)*
- ❌ All 15 national benefits *(three is enough to prove it; the rest go on the "how it grows" slide)*
- ❌ A login for social workers *(mocked: one demo account)*

## Adoption
- **Owner on day one:** one CCAS director willing to run a three-month pilot with five social workers.
- **Funding:** the pilot runs on the CCAS's existing digital budget; scale-up through the department, which funds the RSA.
- **Legal and data:** documents are processed for the appointment and not stored; a GDPR impact assessment is needed before any real use. Question for the data-protection mentor.
- **Indicator:** minutes per appointment spent on the documents check, and number of benefits opened per 100 appointments, before vs during the pilot.

## Done by submission
- [x] The demo moment works end to end on the synthetic household
- [x] Demo video under 2 minutes, recorded
- [x] Deck covering all six sections
- [x] Submitted before the deadline

## Red flags
- ⚠️ Eligibility rules are complex. Encode three benefits from the official rules and say so; don't claim legal accuracy.
- ⚠️ Photo quality: test on blurry phone photos at the golden path, not just before submitting.

---

*Spec locked. Moving to Phase 3.*
