# Presko v2.1

School heat decisions for SDO Iloilo City. The DepEd Memo 064 "4H" rules decide what is allowed; Safety Model v2.1 decides which classrooms are safe.

**Live:** https://presko-heat.vercel.app (demo accounts on the sign-in page; no password).

## Run locally

Browsers block module imports from `file://`, so serve the folder:

```bash
python3 -m http.server 5176 --directory presko_v2.1
```

Open http://localhost:5176.

## Tests and backtest

```bash
node --test presko_v2.1/model/plan.test.mjs
node presko_v2.1/model/backtest.mjs
```

## Files

| Path | What it is |
|---|---|
| `rules.js` | 4H levels, DO 22, EO 130, Iloilo City EO 24, with sources |
| `model/safety-model.js` | Indoor heat estimate per building and hour, vetoes, learning from 8/12/14 readings |
| `model/MODEL-CARD.md` | Evidence, assumptions, backtest results and limits |
| `engine.js` | Planner: sections into safe rooms and time slots, plus the independent checker |
| `app.js`, `index.html`, `ui/` | The app: coordinator and principal views. The 3D scenes and design tokens are adapted from `presko_otherversion` |
| `docs/` | Explainer diagrams for the Rule v1 points system and Safety Model v2.1 |

Building data is illustrative. The policy texts come from news reporting, because the primary documents could not be read.
