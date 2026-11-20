# sciences-po-hack-coach

A Claude skill that coaches a team through scoping, building and pitching a project at the **Sciences Po AI Hackathon 2026** (Centre for Entrepreneurship & Impact Studio, Paris, Friday 20 – Saturday 21 November).

Spec-first. Jury-aware. Demo-obsessed. Built for teams that may never have written code, using Claude Code and Lovable. It won't let you build before a one-page spec exists.

Adapted from [`devcon-hack-coach`](https://github.com/mertpaker/devcon-hack-coach) by Mert Paker, which was written for AI Native DevCon 2026. Event facts come from the official 2026 Participant Guide.

---

## What it does

Four phases, each with a gate you can't skip:

| Phase | Goal | Exit gate |
|-------|------|-----------|
| **1. Interrogate** | team roles and tool, judging lens, one problem | roles + tool, one lens (public policy or business), one problem with a named sufferer |
| **2. Spec it** | a one-page spec | every field filled, demo moment on a real case, sourced figure, adoption plan |
| **3. Plan it** | six ordered checkpoints | named artefact and owner at each: spec locked, smoke test, golden path, feature freeze, video, submitted |
| **4. Pitch it** | opening, 5-minute run of show, video, Q&A | 3 sentences under 20 words, run of show ≤ 5:00, video shot list, 7+ Q&A lines |

Terminal state: *"You have a spec, a plan and a pitch. Stop planning. Go build. Submission closes Saturday 16:00 — no extensions."*

## What changed from the DevCon version

- **No tracks.** The four DevCon tracks are replaced by the guide's two judging lenses (public policy and business) and its weighted criteria: problem 15%, solution fit and deployment 35%, prototype functionality 25%, prototype quality 25%.
- **Team, not stack.** Phase 1 asks about roles (builder, domain expert, storyteller) and picks Lovable or Claude Code, because many participants don't code.
- **No timekeeping.** The 24-hour T+ checkpoints become six ordered checkpoints with no clock times. The coach only mentions the Saturday 16:00 deadline.
- **Three deliverables.** The plan and pitch cover the prototype, the demo video and the six-section slide deck the organisers require.
- **The 5-minute final.** Phase 4 adds a timed run of show weighted toward deployment, a video shot list and Q&A prepared per lens and per juror.
- **New anti-patterns:** chatbot wrappers, boiling the ocean, real personal data in demos, unsourced figures, no adoption story, too long on slides.
- **Logistics answered.** Instead of sending people to a website, the coach answers briefly from `references/event.md`, then steers back.

## Triggers

- *"coach our Sciences Po hack"*
- *"pressure-test our hackathon idea"*
- *"what should we build this weekend"*
- *"scope our hack"* / *"plan our hack"*
- *"plan our deck"* / *"prep our 5-minute pitch"*

## What's in the bundle

```
sciences-po-hack-coach/
├── SKILL.md                     The 4-phase workflow, voice and gates
├── references/
│   ├── event.md                 Programme, rooms, deliverables, prizes, jury, mentors
│   ├── judging-lenses.md        Criteria, the two lenses, example angles, AI capabilities
│   ├── spec-template.md         Fillable one-page spec (Phase 2)
│   ├── pitch-template.md        Opening, run of show, video, Q&A (Phase 4)
│   └── examples/
│       ├── good-spec.md         Worked example spec (DossierClair)
│       └── good-pitch.md        Worked example pitch (DossierClair)
├── evals/                       Five scenarios with weighted checklists
└── README.md
```

References are loaded only when the phase that needs them starts.
