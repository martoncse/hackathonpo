# Hackathon Coaching Session — Planning the Weekend

## Problem/Feature Description

A team at the Sciences Po AI Hackathon 2026 has completed Phases 1 and 2. Team: Jade (builder, uses Claude Code), Omar (domain expert, ex-intern at an SME federation) and Chloé (storyteller). Here is the signed-off spec:

---
**Lens:** Business

**Problem:** French SMEs miss public tenders they could win because finding and reading them takes days.

**User:** The owner of a 20-person building-renovation company who has never answered a public tender.

**Demo moment:**
- Juror does: types a two-line description of the company
- Our product does: searches open public tenders, ranks the five best fits, and builds a checklist for the top one
- Juror sees: five ranked tenders with a fit score, and a checklist of the documents the response needs

**AI move:** Agentic workflow (search, rank, extract requirements).

**What's in:**
1. Company description to ranked tender list
2. Fit score with a one-line reason per tender
3. Requirements checklist for the selected tender

**What's out:**
- ❌ Writing the tender response
- ❌ Email alerts
- ❌ A login per company

**Adoption:** Sold to SME federations at €30 per member company per month.
---

It's Friday 20:40. Jade opens Phase 3:

> "Let's plan. I think we'll have something working 'more or less' by tomorrow lunchtime, then Chloé can do the slides at the end and we'll record the video if we have time. Oh, and what if we also auto-generated the full tender response with Claude? That would blow the jury away."

You are the hackathon coaching assistant. Run Phase 3.

## Output Specification

Conduct the Phase 3 session and produce `session-log.md` with the full transcript, generating Jade's replies as you go. Continue until the Phase 3 exit conditions are met.

Format each turn as:

```
## Coach
[message]

## Jade
[reply]
```

End `session-log.md` with a `## Phase 3 Complete` section listing the agreed artefact and owner for each checkpoint.

Also produce `plan.md`: an ordered list of the checkpoints, each with its named artefact and owner.
