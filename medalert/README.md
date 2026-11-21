# MedAlert (prototype)

**Is this batch on anyone's alert list?** A hospital pharmacist photographs a pack at goods receipt. MedAlert reads it, the pharmacist confirms every field, and a fixed-rule matcher checks the batch against official alerts and the national register. When a new alert lands, it sweeps the stock already received.

Spec and jury reasoning: [../MEDALERT.md](../MEDALERT.md).

## Run

```powershell
cd medalert
npm install
$env:ANTHROPIC_API_KEY = "<your key>"   # optional: without it, demo photos use their saved readings
npm start                               # http://localhost:5175
npm test                                # matcher tests
```

## Demo script (≤90 s)

1. Tap **Quinine tub (WHO alert photo)** → fields appear → **I checked these…** → 🔴 *Matches WHO Medical Product Alert N°1/2020: quarantine*.
2. **Quarantine + report** → pre-filled report.
3. Tap **India: thyroxine from the CDSCO list** (or type `T-639`) → 🔴 citing India's regulator. Same matcher, second regulator.
4. Tap **Registered quinine** → live register lookup → ⚪ *No alert found… not a quality clearance*.
5. **⚡ Simulate today's NAFDAC alert** → banner: Tavanic batch 4MW4C, 1 carton in ward store B → **Quarantine + report**.

## What is real, what is not

| Real (official sources) | Synthetic / modelled |
|---|---|
| WHO Alert N°1/2020 (quinine, batch 44680) and its photo | Received-batches stock log (`data/stock-log.json`) |
| NAFDAC Public Alert 01/2026 (Tavanic, batch 4MW4C) and its photo | Alpaquine batch AQ2508 (the product and its registration B4-6010 are real) |
| NAFDAC Greenbook register: live lookup, cached fallback after 5 s (`data/greenbook-cache.json`) | Report layout: modelled on Med Safety product-quality fields, not the official form |
| CDSCO September 2026 list, 42 central-lab rows (`data/cdsco-nsq-sep2026.json`, via Medical Dialogues; cdsco.gov.in refuses scripts) | "Simulate today's alert" replays a January 2026 alert |

## Design rules

- The AI only reads the pack (`POST /api/extract`, `claude-opus-5-5`, 8 s timeout, then the saved reading for demo photos). **Verdicts come from `shared/match.js`, fixed rules only.**
- GS1 DataMatrix barcode read first (browser `BarcodeDetector`), photo second, typing third.
- Verdicts: 🔴 batch + product match an alert · 🟠 near-miss batch, same batch on a different product, registration not found / inactive / for another product, expired · ⚪ "No alert found… not a quality clearance". Never green, never "safe".
- A short batch code (under 5 characters) only turns red if the product also matches.
