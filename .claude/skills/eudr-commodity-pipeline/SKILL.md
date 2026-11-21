---
name: eudr-commodity-pipeline
description: Adapt EUDR-Snap to another EU Deforestation Regulation commodity and producing country (cattle, cocoa, coffee, oil palm, rubber, soya, wood). Runs the full pipeline, from sourced research and a filled per-commodity architecture .md to adapting the app, a two-reviewer impact + feasibility loop until both are satisfied, and tests. Use for "do EUDR-Snap for cocoa in Ghana", "add palm oil", "rerun the pipeline for wood".
---

# EUDR commodity pipeline

One run = **one commodity + one producing country** (e.g. `cocoa-gh`). Work in `eudr-snap/` (the app) and `commodities/<commodity>-<iso2>/` (the docs). Keep every existing commodity working: run the tests before and after.

## Non-negotiables
- **Never invent a figure, rule or field name.** Every number needs a source URL, or the tag `verify`. "Not found" is a valid answer.
- **Synthetic data only** in sample files: invented names, IDs and receipts, labelled synthetic. Coordinates and Whisp results may be real.
- **Coordinates never come from the AI.** Geometry only comes from GPS capture, a map or an import.
- **Legal role:** the EU operator (normally the importer) files the due diligence statement. EUDR-Snap prepares a draft and never claims to file or certify.
- **Spend:** a live Claude or Whisp call costs money or quota. Use recorded or mocked data for UI checks, and say which you used.

## 1. Research → architecture
Copy `references/commodity-template.md` to `commodities/<slug>/ARCHITECTURE.md` and fill every section with sourced facts (web search; primary sources first: EUR-Lex, the EU Information System docs, FAO/Whisp, national agencies). Read `references/commodity-notes.md` for the starting points and traps per commodity; every item there is a lead to verify, not a fact. Leave no placeholder: write "not found" instead.

Stop and ask the user if any of these are true:
- the country is **low risk**, so the simplified routes may make the product unnecessary;
- an existing national system already covers the paper-to-plot gap, as SICA does for Colombian coffee: reposition the product before building;
- the commodity's unit of geolocation isn't a plot (cattle: every establishment where the animals were kept).

## 2. Adapt the app (`eudr-snap/`)
Change only what the architecture justifies. The touchpoints:

| File | What changes per commodity |
|---|---|
| `shared/rules.js` `CONFIG` | Volume ceiling and unit conversion (sourced national yield; threshold ≈ 2× average, labelled "review", never "violation"); the point/polygon rule stays 4 ha (Art 2(28)) |
| `shared/rules.js` `classify` | Which Whisp risk field to read. Today it is hard-coded to `risk_pcrop` (perennial crops). Check Whisp's output fields for this commodity (annual crops, timber, livestock) in its docs or `/api/openapi.json` before changing it |
| `shared/export.js` `HS` | HS heading and description from Annex I of Reg. 2023/1115 (as amended) |
| `whisp.js` | `nationalCodes` (ISO2, lower case), `SEARCH_AREAS`, `FARMERS` demo generator |
| `extract.js` | Document types, field list and local units in the schema and the system prompt |
| `public/sample-farms.json`, `public/sample-receipt.html` | A synthetic cooperative and receipts in the local language and units; declared hectares = mapped area |
| `test/*.test.js` | New cases for the new rules and units; existing tests stay green |
| `README.md`, the hero in `public/index.html` | Positioning and every figure, each with its source |

Then run `npm test` in `eudr-snap/`, and check the demo in the browser. Use the Whisp cache or recorded extractions unless the user provides keys.

## 3. Review loop (until both are SATISFIED)
Spawn two background agents with the briefs in `references/reviewer-briefs.md`: one for **impact and exploitability**, one for **feasibility** (real-world and demo, including a code read and the tests). They review the built files, read-only.
- Apply every fix, then send the changes back to the **same** agents (SendMessage) for another round.
- **SATISFIED** means nothing the team can still fix today would cost points. Structural limits that are stated openly (no live filing, no national-system integration, an unmeasured baseline) don't block.
- No round limit unless the user sets one. Report the score table per round to the user.

## 4. Close
Update `commodities/<slug>/ARCHITECTURE.md` with the final positioning, the review scores and the "verify before a slide" list. Tests green. Commit only if the user asks.
