# EUDR-Snap: Whisp risk check

The red pin is a real FAO Whisp result, not a hard-coded one. Five cooperative farms are sent to [Whisp](https://whisp.openforis.org) (FAO's free EUDR deforestation-risk API). Each farm gets a traffic light, and high-risk plots can be dropped from the shipment.

## Run it

```powershell
cd eudr-snap
npm start
```

Open http://localhost:5174. No `npm install` is needed: there are no dependencies, just Node 20 or newer.

1. **Get a key.** Sign up free at whisp.openforis.org, then generate an API key on your account page.
2. **Paste it** into the *Whisp API key* panel and press **Save key**, then **Test key**. The key stays in the server's memory: it's never written to disk and is gone on restart. You can also set `$env:WHISP_API_KEY` before `npm start`.
3. **One-time setup:** press **Find real plots with Whisp**. This sends about 130 candidate plots in a single job and keeps:
   - 4 that Whisp rates low risk in Huila coffee country
   - 1 that it rates high risk in the Amazon deforestation arc (Meta, Caquetá, Guaviare)

   It writes `public/sample-farms.json` and `public/whisp-cache.json`. You can run the same thing from the terminal with `npm run find-red`.
4. **On stage:** press **Check with FAO Whisp**.

## Where each result comes from

| Status | Source |
|---|---|
| Red, green, or amber from a risk value | Whisp `risk_pcrop` (perennial crops: coffee, cocoa). "high" is red, "low" is green, anything else is amber. |
| Amber "over 4 ha needs a polygon" | EUDR-Snap's own rule (EUDR geolocation requirement). Whisp doesn't do this check. |
| Amber "Needs review: volume" | EUDR-Snap's own rule. One season's deliveries, converted to green coffee (parchment ÷ 1.25), divided by the **measured** boundary area (declared hectares only when there's no boundary). Review threshold: coffee **2,520 kg green/ha**, about 2× the 2025 national average of ~1,260 kg/ha (21 bags; Cenicafé/FNC). Cocoa: **2,000 kg dry beans/ha**. Too much volume for the plot is how produce from other, possibly deforested, plots gets sold under a clean one. Whisp can't see this, because it knows land, not deliveries. It's a **trigger for review, not proof**: a very productive farm can also cross it. |

The demo farm of Luis Alberto Cuéllar measures 2.79 ha (mapped boundary). He delivers 9,300 kg of dry parchment in season 2026-A, which is 7,440 kg green, or **2,667 kg green/ha**. That's above the 2,520 threshold, so Whisp rates his land low risk and EUDR-Snap still sends him to review.

## Positioning (after impact and feasibility review)

- **Complement to the FNC's SICA, not a replacement.** Colombia's coffee federation already holds about 1.8 million coffee lots with coordinates, shared with exporters where the grower consents (habeas data). What's missing is the link from **paper delivery receipts** to those plots, plus a check that the volumes are plausible.
- **Offline field capture already exists** (FAO's Ground app, with Whisp built in). EUDR-Snap's addition is reading the receipt photo and the volume-plausibility review.
- **Who's responsible:** the EU importer (operator) files the due diligence statement and remains responsible. EUDR-Snap prepares a draft. Colombia is **standard risk** (Impl. Reg. 2025/1093), so full due diligence applies.
- **Impact claim:** it *reduces the risk* of smallholders being dropped. We found no documented exclusions yet, only warnings.
- **Export:** `netWeightKg` is left for the importer to fill in. The pack gives `estimatedGreenKgFromDeliveries` as an estimate only.

If you change volumes or hectares in `sample-farms.json`, the saved Whisp result is re-run through the local rules automatically. No new Whisp call is needed.

Farmer names, volumes and hectares are synthetic. Coordinates and risk ratings are real Whisp outputs.

## Stage fallback

Every successful live check of the demo batch overwrites `whisp-cache.json`. If the live call fails (no internet, Whisp slow, bad key), the page shows the saved result. The badge says **"Saved Whisp result from …"**, so it's never passed off as live.

## Whisp API contract (checked against `/api/openapi.json`, 21 Nov 2026)

- `POST https://whisp.openforis.org/api/submit/geojson`, header `x-api-key`
- Body: a FeatureCollection plus `analysisOptions: { async, externalIdColumn, unitType: "ha", nationalCodes: ["co"] }`
- Sync mode returns `{ code: "analysis_completed", data: FeatureCollection }` (up to 500 geometries, 60 s)
- Async mode returns `202 { code: "analysis_queued", data: { token } }`; then poll `GET /api/status/{token}`
- Limits: 30 requests/min, 2 jobs running at once per key

## API for the Lovable frontend

`POST http://localhost:5174/api/risk` with `{ "plots": [{ "id", "hectares", "geometry" }] }` returns `{ source, checked_at, results: [{ id, status, whisp_risk, reasons }] }`. CORS is open.

## Story mode (3D demo for the jury)

`http://localhost:5174/` now opens the 3D story. `classic.html` is the 2D backup, with no 3D or extra tiles.

| Key | Action |
|---|---|
| → / Space / PageDown | Next scene |
| ← / PageUp | Previous scene |
| N | Speaker notes |
| L | Lite mode (no 3D terrain, for slow laptops) |

The **Key** button (top right) holds the Whisp key panel and **Reset demo**, which clears reviewer decisions between rehearsals.

1. **39 days.** A globe with the shipment arc from Huila to Rotterdam.
2. **Intake.** Receipts are read into fields with a confidence score and the exact source text. These are recorded extractions. Coordinates always come from GPS capture, never from the AI. **Place plots** raises them in 3D.
3. **Analyse.** **Scan with FAO Whisp** calls `/api/risk` live, or uses the saved result if the live call fails (the badge says which). The five-stage pipeline lights up, and light beams show each plot's status.
4. **Review.** The camera flies to the flagged plot and shows the Hansen tree-cover-loss layer next to Whisp's indicators (JRC vs IDEAM 2020). The choices are Accept (needs a reason), Mitigate or Exclude. Each decision is saved to `data/decisions.json` and feeds the Art 11 log.
5. **Lots & file.**
   - Delivery flows run to the warehouse. Tapping a sack moves it between the EU and non-EU lots, and one uncleared input taints the EU lot.
   - **Walk the boundary** replaces Buenavista's 6.2 ha point with a polygon. That unblocks export and re-checks the polygon with Whisp if a key is set.
   - **Generate importer pack** produces downloadable files with SHA-256 hashes: GeoJSON (6 decimals), the DDS data pack, Art 9, Art 10 (a)–(n), the Art 11 log and a retention index.

Map tiles need internet: Esri imagery, AWS Terrarium terrain, Hansen loss tiles and MapLibre 5.24.0 from unpkg. If the venue Wi-Fi is weak, use `classic.html` and a screen recording.

### API added for the Lovable frontend

- `GET/POST /api/review`: reviewer decisions.
- `POST /api/lots`: `{ lots: [{ id, market: "EU"|"non-EU", plot_ids }] }` → taint check.
- `POST /api/export`: `{ lot }` → the pack (HTTP 422 with `blocking` if something blocks it).
- `GET /shared/rules.js` and `/shared/export.js`: the same rule code the server runs.

Tests: `npm test` (`node --test`).
