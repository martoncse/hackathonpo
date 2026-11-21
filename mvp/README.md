# CatatSekali MVP

One photo of a community health centre register → structured visits the nurse can correct → three monthly reports filled from the same records → flags wherever the reports disagree.

All data is synthetic. Report layouts are placeholders until the real ministry templates are in.

## Run it

```powershell
cd mvp
npm install
$env:ANTHROPIC_API_KEY = "<your key>"
npm start
```

Open http://localhost:5173.

- **With a key:** photograph [the sample register](public/sample-register.html) (print it, or photograph your screen) and press **Read register**. Claude (`claude-opus-5-5`) extracts the rows.
- **Without a key:** press **Demo mode**. It loads the same register already extracted, with no AI call. Use this as the backup on stage.

## The demo moment

1. Load the register. 10 visits appear.
2. The flag reads: *"Diarrhoea: 3 in the morbidity report, 2 in the child health report. Visit #7 has no age."*
3. Type an age for visit #7 (say 4). The flag disappears and the reports agree.

## Files

- `server.js`: static server plus `POST /api/extract` (image → structured visits, via structured outputs).
- `public/app.js`: editable visits, the three reports, mismatch rules, export.
- `public/sample-register.html` and `public/sample-visits.json`: the synthetic case.

Server-side refusal fallback is turned on (`fallbacks: "default"`): if the main model declines, the API retries on a fallback model in the same call.
