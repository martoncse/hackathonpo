# EUDR-Snap pitch: lead with the passport

*5 minutes. Sciences Po AI Hackathon, 21 Nov 2026. The passport is the product, and everything else is how it gets filled. The facts and their sources are in `../reports/MOAT-ANALYSIS.md`, §9 for the strategy. Don't say anything on stage that isn't in that file.*

## The line (open with it, close with it)

> **"One shipment, one passport. The cooperative owns it, and any buyer, bank or inspector can check it in ten seconds."**

## 0:00–0:40 · Why now

- Since **1 Sep 2026**, every Ivorian cocoa sale has to carry a producer card. From **30 Dec 2026**, EU importers carry the EUDR liability, and inspectors want the paper trail behind each shipment. Micro and small importers follow on **30 Jun 2027**.
- In the Dutch pilot inspections, the operators failed on **evidence**, not on filing. *(The 7/20 figure comes from a secondary source. Say "most failed on evidence" unless the NVWA original has been read.)*
- Cooperatives today fill in **a different system for every buyer** (Fern, 2024). The free tools serve only the **~10% that are Fairtrade-certified**.

## 0:40–1:20 · What we built

**A Shipment Evidence Passport.** It's one signed file per shipment, and it holds:
- every purchase receipt, linked to the producer card and **all** that producer's mapped plots
- the deforestation check, from FAO Whisp
- **our volume check**: could 3 tonnes really have come from 2 hectares? Whisp sees land, not deliveries.
- each flagged plot decided by **a named person, with a reason**, in a hash chain
- the importer's Art 9/10/11 files and the GeoJSON for the EU Information System, each pinned by SHA-256

The cooperative signs it, and it stays the cooperative's. Any buyer can check it.

## 1:20–3:20 · Live demo (classic view, Côte d'Ivoire profile)

1. **Record a purchase** from a paper receipt (photo or typed). The volume check re-runs straight away, and a card that sold too much goes to review.
2. **Review:** accept with a written reason, or exclude. The name and time are logged.
3. **Send the lot to an EU buyer.** The passport is issued: *"Passport #1 in this cooperative's history, key XXXX-XXXX-…"* (read the real fingerprint aloud)
4. Click **Open the buyer's check →**. The banner turns green: *"Authentic and complete: signed by the cooperative, all 7 files unchanged."*
5. **The moment:** press **Try to tamper: add 6,000 kg**. The banner turns red and the signature check fails. *"Inflate the shipment after signing, and every buyer sees it."*

Backup if the network fails: everything runs locally (`npm start`), and the passport check runs in the browser with no server call.

## 3:20–4:10 · Why this is a moat, not a feature

- **Every season makes it harder to leave.** Passports chain to each other, and importers must keep this evidence for 5 years. Leaving means abandoning an inspectable history.
- **Every buyer who accepts it makes it worth more to the next cooperative.** "Fill once, every buyer checks it" removes the pain Fern documented.
- **Incumbents have a reason not to follow:**
  - **Traders** want supply locked in, not a record the cooperative can take to a competitor.
  - **Fairtrade's tools** exist to add value to certification.
  - **TraceX and similar software** sell seat licences to buyers.
  - **Meridia/SGS** *verify* evidence, so we're their input. They're a partner.
- **Banks are a third side:** FMO already finances EUDR-compliant cocoa sourcing in Côte d'Ivoire. The same passport can serve as its evidence.

## 4:10–4:40 · Next 6 months

1. **Pilot** with 2–3 non-certified cooperatives near Soubré, through IDH and the EU Forest Institute's Sustainable Cocoa Programme. *Metric:* the share of deliveries covered by passports.
2. **Reach EU SME importers** through LIFE FairTHRIVE (free, EU-funded, open to non-certified) and CBI. *Metric:* **more than 1 importer per cooperative**, which proves the passport is buyer-neutral.
3. **Publish an accuracy test** of receipt reading on 30–50 real receipts.

## 4:40–5:00 · Close

> "Satellites can tell you whether a plot was forest in 2020. They can't tell you whether those beans could have come from that plot, or who decided they could. **One shipment, one passport, owned by the cooperative, checkable by anyone.**"

## Honest answers for Q&A

- **"Isn't this just hashing?"** The hashing is easy. What's hard to copy is a cooperative's years of chained passports, accepted by several buyers.
- **"Who holds the key?"** In the prototype, our server holds it. In production it sits on the cooperative's device or in a key service. The verify page needs only the public key, which travels inside the passport.
- **"Is it a compliance certificate?"** No. It proves who recorded what, and when. The importer files the DDS and remains responsible.
- **"What if the Ivorian traceability system (CCC) builds this?"** We'd offer it to the CCC as the importer-facing layer it doesn't need to build. Its system covers the producer; it has no public importer export today.
- **"Accuracy of reading receipts?"** Not yet measured on real receipts, and we say so. Every legally material field needs a person to accept it.
- **Don't claim:** "the only tool with volume checks", "prevents smallholder exclusion", "works offline", or "AI reads paper" as the novelty.
