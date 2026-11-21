# EUDR-Snap pitch: for small EU importers, with the evidence arriving with the shipment

*5 minutes. Sciences Po AI Hackathon, 21 Nov 2026. **The customer is the micro or small EU importer** of cocoa from a standard-risk origin. **The product is what that importer receives:** a signed evidence passport for each shipment, issued free by the cooperative.*

*Sources:*
- `../reports/COMPETITORS-SME-PIVOT.md`: customer, competitors, pricing
- `../reports/MOAT-ANALYSIS.md` §9: moat

*Wording was checked by an impact and feasibility review. Don't say anything on stage that isn't in those files.*

## The line (open with it, close with it)

> **"Small EU importers have until June 2027 to show negligible deforestation risk for every cocoa shipment. EUDR-Snap delivers the evidence with the shipment: issued free by the cooperative, checked by the importer in ten seconds, completed and filed by the importer."**

## 0:00–0:50 · The customer's problem

- About 275,000 companies import EUDR products into the EU (Commission, May 2026), and **most are SMEs**. Micro and small importers must do full due diligence from **30 June 2027**, before each shipment goes on the market. One statement can cover several shipments.
- Côte d'Ivoire is **standard risk**, so the importer needs the whole Art 9–11 file: plot geolocation, a risk assessment, and mitigation.
- A self-reported survey of **128** mostly cocoa and coffee SMEs, run by Fairtrade's EU-funded programme, found an average readiness of **32%**. Only **12.6%** collect geolocation, and over half have no risk procedure.
- The Commission prices standard-risk due diligence at about **€10,000 a year** per company.
- Inspectors check the **evidence** behind each statement. The Dutch pilot inspections found most operators short on evidence.

**Persona (synthetic, say so):** a micro importer in Paris buying 20 t of cocoa from a cooperative near Soubré.

## 0:50–1:20 · What we built

**What the importer receives is one signed passport per shipment.** It contains:
- every purchase receipt, linked to the producer card and **all** that producer's mapped plots
- the deforestation check (FAO Whisp)
- **our volume check**: could 3 tonnes really have come from 2 hectares? Whisp sees land, not deliveries.
- every flagged plot decided by **a named person with a reason**, in a hash chain
- the Art 9/10/11 drafts and the GeoJSON in the EU Information System's format, each pinned by SHA-256

The cooperative issues it free and owns it. **Our hypothesis is that the importer pays per verified shipment.**

## 1:20–3:20 · Live demo: start on the importer's side

*Prepare the lot **before** going on stage, because each receipt can go into one lot only. Keep a second lot's link as a backup.*

1. **The importer opens the incoming shipment** (`/buyer.html#…`). Point out the **origin banner**: "Côte d'Ivoire, standard risk, full due diligence". Then go through **"Can I file this shipment?"**:
   - green: what the supplier's evidence covers
   - amber: what the importer completes, by law (net mass, EORI, Art 10 conclusion)
   - red: what to ask the supplier for

   Say: *"A filing checklist, not legal sign-off."*
2. **The evidence:** switch briefly to the cooperative's view (`/classic.html`). Show one receipt, the volume flag, and the named decision that cleared it. That's how the passport was filled.
3. **Verify:** click "Verify it →". The page goes green: signed by the cooperative, all 7 files unchanged.
4. **Tamper:** press "Try to tamper: add 6,000 kg". It goes red: *"Inflate the shipment after signing, and every buyer sees it."*
5. **The importer decides:** back on the buyer page, choose "Accept the evidence for my risk assessment" with a name and reason. The decision is linked to the passport by hash and chained. Then record the DDS reference: **filed**.

Backup if the network fails: everything runs locally (`npm start`). The passport check runs in the browser.

## 3:20–4:00 · Competition, and why we win

> "Importer tools like TradeAware, Coolset and the new Epoch start at the EU desk. They ask suppliers to fill in questionnaires or infer the plots, and their human plot review sits in enterprise tiers. Fairtrade now shares plot data for free, but for certified supply chains, and it doesn't mention deliveries or volumes. We're the missing input: a signed evidence passport per shipment, from any cooperative, with receipts, a volume check against all the producer's land, and named decisions. It comes in the EU Information System's GeoJSON format; importing it into other tools isn't tested yet."

**Moat:**
- **Every season makes it harder to leave.** Passports chain to each other, and importers must keep this evidence for 5 years.
- **Each importer can invite its suppliers for free**, and every cooperative that issues passports makes the format worth more to the next importer.
- **Incumbents have a reason not to follow:**
  - Traders want supply locked in.
  - Fairtrade's tools add value to certification.
  - Importer SaaS sells seats to the buyer.
  - Verifiers such as Meridia/SGS are a partner, because they check evidence like ours.

## 4:00–4:15 · Pricing (say "hypothesis")

> "Free for cooperatives. For importers, our hypothesis is **€49 per verified shipment**. By our own arithmetic, that's under TradeAware's roughly €80 per statement and well under the Commission's roughly €240 cost per shipment."

## 4:15–4:40 · Next 6 weeks to 6 months

1. **3 SME importers through LIFE FairTHRIVE / Max Havelaar France**, with a paid-pilot ask. *Metric:* will they pay per shipment?
2. **Their cooperatives** through IDH and the EU Forest Institute's Sustainable Cocoa Programme. *Metric:* share of deliveries covered by passports.
3. **Ask Fairtrade to pilot us** as a data-sharing tool in FairTHRIVE, importing its plot data as a source.
4. **Accuracy test** of receipt reading on 30–50 real receipts.

## 4:40–5:00 · Close

> "Satellites can tell you whether a plot was forest in 2020. They can't tell a small importer whether those beans could have come from that plot, or who decided they could. **The evidence arrives with the shipment: issued free by the cooperative, checked in ten seconds, completed and filed by the importer.**"

## Honest answers for Q&A

- **"Isn't the SME simplified declaration enough?"** No. It covers only farmers and foresters in **low-risk** countries placing their own produce. An EU importer of Ivorian cocoa still owes the full file.
- **"Ghana?"** It's low risk on the 2025 list, which is under review in 2026. Art 13 simplified due diligence applies, so we're much less needed there. That's why we start with Côte d'Ivoire, and the buyer page shows the right banner for each origin.
- **"Why not Epoch or TradeAware?"** Give the competition answer, then add: our passport is the input they lack, and we'd rather plug into them than replace them.
- **"Isn't this just hashing?"** The hashing is easy. What's hard to copy is a cooperative's years of chained passports, accepted by several buyers.
- **"Who holds the key?"** In the prototype, our server holds it. In production it sits on the cooperative's device or in a key service. Verification needs only the public key, which travels inside the passport.
- **"Is it a compliance certificate?"** No. It proves who recorded what, and when. The importer completes the file, draws the Art 10 conclusion, files, and remains responsible.
- **"How accurate is the receipt reading?"** It isn't measured on real receipts yet. Every legally material field needs a person to accept it.

## Don't claim

- "ready to file": say "completed and filed by the importer"
- "proves deforestation-free": say "shows negligible risk"
- "nine in ten importers are SMEs": the figure is unverified, so say "most"
- a count of cocoa SME importers (none found)
- that SMEs will pay €49 (it's not validated)
- that other tools or TRACES ingest the passport (not tested)
- that Fairtrace "can't" do volumes: say it "doesn't mention deliveries or volumes"
- that the checklist is legal sign-off
- "the only tool with volume checks", "prevents smallholder exclusion", "works offline", or "AI reads paper" as the novelty
