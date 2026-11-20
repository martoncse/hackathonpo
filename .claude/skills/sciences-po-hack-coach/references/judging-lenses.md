# Judging lenses and example angles

There are no tracks this year. Every project competes in one category, but the jury reads it through **one of two lenses**: public policy or business. Pick one. Your spec, deck and Q&A all speak that lens.

Use this file when the team is unsure of its lens, or when you need three concrete angles in Phase 2.

---

## How finalists are judged

**Step 1, preselection:** mentors review every submission and pick 6 finalists. They only see what was submitted, so the prototype link, video and slides must work on their own.

**Step 2, final:** 5-minute pitch + 5 minutes of Q&A, scored on four criteria.

| Weight | Criterion | Public policy lens | Business lens |
|--------|-----------|--------------------|---------------|
| **15%** | Relevance of the problem | Scale of the public issue, population affected, social cost, backed by figures | A real, frequent customer pain, a precise target, market size, evidence (interviews, data) |
| **35%** | Solution fit and deployment | Does it deliver the intended impact? Measurable indicators, anticipated side effects. More cost-effective than existing programmes? Concrete rollout: institutional owner, funding, timeline, legal and data constraints | Market/solution fit, value proposition, differentiation. Who pays, how much, unit economics. Acquisition strategy and scalability |
| **25%** | Prototype functionality | Works end to end on a real case from the target public or the administration | Works end to end and the core value is visible |
| **25%** | Prototype quality | Accessible and simple for the citizen or the public servant | UX, robustness and polish |

What this means for coaching:

- **Half the score is the prototype.** A working slice beats a beautiful deck.
- **The biggest single criterion is deployment.** A team that can't say who adopts it first and who pays loses the most points.
- **The problem is only 15%.** Don't spend half the pitch proving the problem exists. One figure, one person, move on.

---

## Picking a lens

- The first adopter is a **ministry, local authority, public agency, hospital, school, NGO or international organisation** and nobody pays per use → **public policy**.
- Someone **pays for it**: a company, an SME, a professional, a consumer, or a public buyer through a contract → **business**.
- On the boundary (e.g. a startup selling to city halls): pick the lens whose questions the team can answer better. Selling to the public sector is a business lens with a public buyer. Don't claim both.

---

## The AI move: beyond a chatbot

The guide is explicit: a chat window is the most basic use of AI. Every angle should rest on at least one of these:

- **Text:** summarisation, report generation, policy analysis, recommendation, document search, classification, reasoning workflows.
- **Documents and images:** understanding documents, extracting structured information from forms, PDFs or photos.
- **Agentic workflows:** assistants that reason across several steps and take actions, such as automated research, support or process flows.

---

## Example angles

Use these as shape references. Invent new ones for the team's actual problem.

### Public policy lens

- **DossierClair** — a social worker photographs a household's documents; the tool extracts the key fields and flags which benefits the household probably qualifies for but hasn't claimed, with the missing paperwork for each. *AI move: documents and images.* (Worked example in `examples/`.)
- **ConsultLens** — a town hall drops 2,000 free-text answers from a public consultation; the tool clusters them into themes with representative quotes and counts, in minutes instead of weeks. *AI move: text classification and summarisation.*
- **PlanCheck Climat** — a municipal officer uploads the town's climate plan; the tool checks it against the legal obligations and highlights missing measures, with the page reference. *AI move: document analysis.*
- **FieldBrief** — an NGO's field reports arrive in three languages; the tool turns each into a structured incident record and a weekly brief for headquarters. *AI move: extraction plus an agentic summary flow.*

### Business lens

- **TenderMatch** — an SME describes what it does; an agent searches open public tenders, ranks the fits, and produces a checklist of what the response needs. *AI move: agentic workflow.* Who pays: the SME, monthly.
- **LeaseCheck** — a tenant or small landlord uploads a lease; the tool flags clauses that are likely unlawful or unusual and explains why in plain language. *AI move: document analysis.* Who pays: a property manager or insurer, per document.
- **ShiftReady** — a staffing agency uploads a foreign worker's documents; the tool checks the file is complete before the first shift and lists what's missing. *AI move: documents and images.* Who pays: the agency, per file.

---

## Anti-patterns (don't pitch these)

- **A generic chatbot** "that answers citizens' questions": no AI move, no demo moment.
- **Reforming a whole system** in a weekend. Pick one office, one user, one moment.
- **A platform for everyone.** "Citizens" is not a user. "A social worker at a municipal social action centre" is.
- **A dashboard nobody acts on.** Show the decision it changes.
- **Claiming both lenses** to look bigger. It dilutes the pitch and the Q&A.
