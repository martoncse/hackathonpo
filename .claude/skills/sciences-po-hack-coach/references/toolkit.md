# The build toolkit: which skill to hand off to, and when

The coach doesn't build. When a team needs a specialist job done, the coach names **one** skill from this file, in one line, with the reason. Then it gets back to coaching.

Rules:
- **Only name a skill that's available in this session.** If it isn't listed among the available skills, skip it without comment. Don't tell the team to install anything during the hackathon.
- **One handoff at a time,** at the moment it's useful. Never paste this whole list.
- **The coach's own gates come first.** No handoff skips a phase. Handoffs that touch code (gstack's `/plan-eng-review`, `/qa`, `/review`) only come after Phase 2 is locked.
- **Mentors beat tools on judgment calls.** A legal or compliance skill gives the team a first pass to bring to the data-protection mentor. It doesn't replace the mentor.
- **Every handoff says what to bring back:** *"Bring back the one figure, then we continue."*

Skills from the **knowledge-work plugins** are written `plugin:skill` (e.g. `design:accessibility-review`). Skills from **gstack** are slash commands (e.g. `/qa`).

---

## Phase 1–2: evidence and the problem

| When | Skill | Why |
|------|-------|-----|
| The team has interview notes or survey answers and can't see the pattern | `product-management:synthesize-research` | Turns raw notes into themes and quotes: Evidence field |
| They need a figure and have a dataset (open data, a CSV) | `data:analyze` or `data:explore-data` | One sourced number for the Problem field |
| Nobody has talked to a real user yet | `design:user-research` | A five-question interview script to run with someone on campus |
| The idea is fuzzy after two loops of Phase 1 and the team wants a hard second opinion | `/office-hours` (gstack, builder mode) | Pushes back on the framing. **Bring back only the problem sentence**, then resume Phase 1 here |
| Personal data, health, minors or immigration show up in Red flags | `legal:compliance-check` | A GDPR first pass to take to the data-protection mentor (Claudia Gestin Vilion) |

## Phase 2–3: scope and the plan

| When | Skill | Why |
|------|-------|-----|
| The spec is locked and the builder uses Claude Code | `/plan-eng-review` (gstack) | Locks the data flow and failure cases before the smoke test. Ask it to hold scope: the spec's three features, nothing more |
| The team still argues about scope after Phase 2 | `/plan-ceo-review` (gstack) in **SCOPE REDUCTION** mode | Proposes the minimum core. Never run it in expansion mode this weekend |
| Lovable team, no designer, the screens look generic | `/design-consultation` (gstack) | A small design system (type, colour, layout) to paste into Lovable |

## The checkpoints

| Checkpoint | Skill | Why |
|------------|-------|-----|
| **Golden path** | `/qa` (gstack) on the live link | Clicks through the demo moment in a real browser and fixes what breaks |
| **Feature freeze** | `design:accessibility-review` | Prototype quality is 25%, and the public-policy lens scores it on being "accessible and simple for the citizen or the public servant" |
| **Feature freeze** | `design:ux-copy` | Plain-language labels and error messages, especially for citizen-facing screens |
| **Feature freeze** | `/design-review` (gstack) | Catches spacing, hierarchy and generic-AI-look problems, then fixes them |
| **Feature freeze** (Claude Code builders) | `/review` (gstack) | Finds the bug that breaks the demo before the jury does |
| **Video in the can** | `marketing:draft-content` | Tightens the voice-over script from the Phase 4 shot list |
| **Submitted** | `/qa-only` (gstack) on the prototype link | Confirms the link opens and works for a stranger, without changing anything |

## Phase 4: the deck and the Q&A

| Slide or question | Skill | Why |
|-------------------|-------|-----|
| "Why not just use [X]?" | `product-management:competitive-brief` | Three alternatives and the one-line difference for each |
| Market, scale or impact slide | `data:create-viz` | One chart, one number, one source line |
| Business model slide (business lens) | `small-business:cash-flow-snapshot` | A sanity check on unit economics: price, cost per user, break-even. Only if the team has real numbers |
| Rollout slide (who owns it, when, with what money) | `/diagram` (gstack) | A simple timeline or flow from owner to pilot to scale-up |
| Pitch rehearsal | `design:design-critique` on the slides | A second pair of eyes on hierarchy and legibility from the back of the room |

---

## Never hand off to these this weekend

- `/ship`, `/land-and-deploy`, `/canary`: there's no PR to ship. Submission is a link through the organisers' form.
- `/autoplan`: runs four long reviews back to back. Too heavy for a weekend build.
- `/plan-ceo-review` in **expansion** mode: the opposite of what a weekend build needs.
- Anything that writes to Slack, email, CRM or another connected tool on the team's behalf.
