# MasteryPath

> An adaptive learning and mastery-assessment platform that turns lesson content into
> progressive, skill-aware practice — and lets a parent track real understanding from anywhere.

**Live app:** https://ibkwilliams1.github.io/mastery-path/
**Repository:** `mastery-path`

MasteryPath is a subject-agnostic learning platform designed to help a learner move from
first exposure to demonstrated mastery. It combines AI-assisted question-bank creation,
human validation, adaptive assessment, skill-level progress tracking, and parent-facing
insight — all in a single, cloud-backed web app.

It began with mathematics for one child, but the architecture is deliberately built to
expand across subjects:

```text
MasteryPath
├── Mathematics   (live)
├── English       (live)
├── Science       (live)
└── Future subject modules
```

---

## Purpose

MasteryPath exists to answer a more useful question than *"How many questions did the
learner answer?"*:

> What has the learner genuinely understood, where are the remaining gaps, and what should
> they practise next?

The platform turns lessons into measurable learning outcomes. It helps a parent or trusted
reviewer prepare relevant practice content, monitor understanding **remotely**, identify weak
skills, and intervene with greater precision.

---

## Origin & journey

The project started as a practical way to support a child taking online lessons from another
city. The workflow was simple: take a lesson video, use an AI tool (Gemini / NotebookLM) to
generate questions grounded in that lesson, review them, and let the child practise until the
system had real evidence of mastery.

Turning that idea into a working product happened in three honest stages, and the second
stage is where the architecture was decided:

1. **Single-device prototype.** The first version was a self-contained web page that stored
   everything — questions and progress — in the browser's local storage. It proved the
   learning engine worked, but it had a fatal limitation for this use case: the data never
   left the device. A parent in one city could not see a child practising in another, and
   imported questions did not travel between devices.

2. **The realisation that shaped the stack.** The whole point was *remote* monitoring and
   *shared* content. That requires a shared brain in the cloud — a database both people
   connect to, with real logins. This is the moment **Supabase** entered the project (see
   below). The app was rebuilt so questions, attempts, and progress live in the cloud, with
   one family account signing in from any device.

3. **Generalisation and launch.** With cloud data in place, the platform was generalised from
   "Math Mastery" to **MasteryPath** — a subject-agnostic model (Learner → Subject → Topic →
   Skill → Difficulty) — and deployed publicly on GitHub Pages.

A central principle survived every stage: **AI assists with content preparation, but does not
replace human judgment.** A parent validates every generated question before a learner sees it.
NotebookLM is the current generation tool, not a permanent dependency — MasteryPath is the
learning engine that consumes validated question banks.

---

## How Supabase fits in

MasteryPath's frontend is a single static web page. Everything that needs to be *shared,
private, and persistent* is handled by [Supabase](https://supabase.com), which is what makes
remote monitoring possible. Each Supabase capability maps cleanly to a product responsibility:

| Responsibility | Supabase feature | What it enables |
|---|---|---|
| **One family login** | Supabase Auth (email + password) | The same account signs in on the parent's device and the child's device, in different cities. |
| **Shared, durable data** | Postgres database | Questions, attempts, sessions, and settings live in the cloud, so they sync across every device and survive restarts. |
| **Privacy by design** | Row Level Security (RLS) | Every table row is scoped to its owner. An account can only ever read or write *its own* data — which is precisely why the public "publishable" key is safe to ship in a public repository. |
| **Live parent monitoring** | Supabase Realtime | The parent dashboard updates as the child answers, without a manual refresh. |

The database is intentionally small and explainable:

```text
app_settings   one row per family: learner profile, assignments, review schedule, settings
questions      the approved question bank (subject, topic, skill, difficulty, options, answer)
sessions       one row per practice / diagnostic / review session
attempts       one row per answered question — the raw signal the mastery engine reads
```

Because mastery is *computed* from the `attempts` log rather than stored as a frozen number,
the mastery rules can evolve later without rewriting a learner's history.

---

## Implemented architecture

The technologies are now fixed (the earlier draft left them open); this is what actually runs:

```text
Content preparation
  Lesson / video  →  NotebookLM (AI generation)  →  CSV  →  in-app validation & approval

Frontend  (this repository)
  A single self-contained index.html — HTML, CSS, and vanilla JavaScript, no build step.
  Child experience  → subject picker → adaptive quiz
  Parent experience → dashboard, question bank, assignments
  A framework-free mastery engine computes levels, mastery, weak skills, and decisions.

Cloud (Supabase)
  Auth (family login) · Postgres (questions/attempts/sessions/settings) · RLS (privacy) · Realtime (live)

Hosting
  GitHub Pages serves the static app at a public URL. Updating = commit a new index.html.
```

Deliberate architectural boundaries carried over from the original design:

- the AI generation provider stays replaceable (NotebookLM is not baked in);
- generated content is separated from *approved* content (nothing reaches a learner unreviewed);
- assessment delivery is separated from mastery calculation;
- the evidence behind each mastery decision is recorded;
- parent/reviewer and learner permissions are distinct (a PIN guards the parent view);
- mastery rules can change without rewriting attempt history.

---

## Learning structure

```text
Learner
└── Subject
    └── Topic
        └── Skill
            └── Difficulty (5 levels)
                └── Question
                    └── Attempt
                        └── Mastery
```

For example: *Learner → Mathematics → Fractions → Comparing fractions → Foundation … Challenge.*
The same structure supports English grammar, science concepts, and future subjects without
redesigning the core engine.

### Five difficulty levels

| Level | Name | Intended demand |
|---:|---|---|
| 1 | Foundation | Direct recognition, recall, and simple one-step application |
| 2 | Basic | Familiar application with modest variation and growing independence |
| 3 | Intermediate | Multi-step work, word problems, and combining related ideas |
| 4 | Advanced | Harder reasoning, less obvious solution paths, more demanding application |
| 5 | Challenge | Deep understanding through difficult multi-step or multi-part problems |

Question design increases *reasoning demand*, not just number size. Distractors are plausible
and, where possible, reflect common learner mistakes — which can later support misconception
detection as well as correctness scoring.

---

## The adaptive engine

The engine is a set of pure functions over the `attempts` log, so it is transparent and
portable. It is subject-scoped: an English topic and a Maths topic never mix.

- **Adaptive difficulty.** Five levels; promotion after sustained ~80% accuracy over a recent
  window, regression when recent accuracy falls below ~60%.
- **Mastery score.** A weighted blend of recent accuracy, difficulty achieved, consistency,
  retention, and response confidence — tuned as product rules, not universal claims.
- **Skill-aware analysis.** Accuracy is tracked per sub-skill, so a strong topic average can
  never hide a weak sub-skill.
- **Explainable decisions.** After a meaningful window, each topic gets one of three
  plain-language recommendations, shown on the parent dashboard:
  - **Promote** — evidence is sufficient; introduce the next difficulty.
  - **Reinforce** — overall performance is promising, but a specific skill needs targeted
    practice at the current level.
  - **Remediate** — sustained difficulty; step down or rebuild a prerequisite.
- **Spaced repetition.** Mastered topics return for review on widening intervals; poor review
  performance shortens the interval.

All thresholds live in one config block and are meant to be validated through real use.

---

## Content workflow

```text
Lesson / video content
      ↓
AI-assisted generation (currently NotebookLM)
      ↓
Structured CSV
      ↓
Parent validation & approval (in-app)
      ↓
Approved question bank (cloud)
      ↓
Adaptive assessment
      ↓
Attempt & sub-skill analysis
      ↓
Mastery decision (Promote / Reinforce / Remediate)
      ↓
Parent dashboard & targeted intervention
```

**Question CSV schema**

```csv
subject,topic,skill,difficulty,question,option_a,option_b,option_c,option_d,answer,explanation
```

The in-app importer validates structure before anything is saved (missing fields, invalid
difficulty, bad answer letter, duplicates), then a human approves the batch. Only approved
records enter the live bank.

---

## Using it

1. Open the live app and **create one family account** (or sign in).
2. **Parent** area (PIN-guarded) → **Question Bank** → paste a NotebookLM CSV → **Validate** →
   **Approve**. Set starting difficulty per topic under **Assignments**.
3. The learner signs in on their own device with the same account, picks a **subject** and a
   **topic**, and practises. Difficulty adapts automatically.
4. The parent watches the per-subject **dashboard** update live and follows the
   Promote / Reinforce / Remediate guidance.

---

## Privacy & child safety

MasteryPath processes a child's educational data, so privacy is a core requirement, not a
later feature.

- Collect only the data needed to run the learning experience.
- Parent-controlled account; learner and reviewer permissions are separated.
- Row Level Security isolates every family's data at the database level.
- Data is served over HTTPS; the public key exposes nothing without RLS-permitted auth.
- No advertising, no public profiles, no chat.
- No real learner data, credentials, or private lesson content is committed to this repository;
  demonstration data is synthetic.

---

## Roadmap

### Phase 1 — Foundation
- [x] Subject-neutral domain model (Learner → Subject → Topic → Skill → Difficulty)
- [x] Five-level generation specification (subject-agnostic prompts)
- [x] Question-bank CSV contract
- [x] Import, validation, review, and approval workflow
- [x] Math Mastery as the first subject module (plus English & Science)

### Phase 2 — Mastery engine
- [x] Record attempts at topic, skill, and difficulty level
- [x] Configurable promotion / regression criteria
- [x] Weak-skill detection
- [x] Promote / Reinforce / Remediate decisions with explanations
- [ ] Minimum-attempt & full sub-skill coverage gating (partial)
- [ ] Persist decision history over time

### Phase 3 — Parent insight
- [x] Decision-oriented parent dashboard
- [x] Weak-skill and review-due highlighting
- [x] Live monitoring across devices
- [ ] Progress & mastery trends over time (charts)
- [ ] Scheduled progress summaries (e.g. weekly email)

### Phase 4 — Expansion
- [x] Multi-subject support (add a subject just by importing questions)
- [ ] Subject-specific question / response formats
- [ ] Misconception detection from distractor patterns
- [ ] Evaluate additional generation providers

### Phase 5 — Product hardening
- [ ] Validate mastery rules through real-world use
- [ ] Accessibility & age-appropriate UX polish
- [ ] Retention, backup, and recovery controls
- [ ] Automated quality checks & monitoring

---

## Tech stack

- **Frontend:** single-file HTML + CSS + vanilla JavaScript (no build step)
- **Cloud:** Supabase — Postgres, Auth, Row Level Security, Realtime
- **Hosting:** GitHub Pages
- **Content generation:** NotebookLM (external, replaceable) → reviewed CSV import

---

## Portfolio significance

MasteryPath is more than a quiz app. It brings together applied AI-workflow design,
human-in-the-loop content governance, a scalable domain and data model, adaptive decision
logic, learning analytics with explainability, parent- and learner-centred design, and
privacy-aware handling of children's data — deployed as a real, working product.

> A real learning problem was translated into a data-driven system that converts validated
> lesson content into adaptive assessments, identifies skill gaps, and advances a learner
> based on evidence of mastery — reachable by a parent and child in different cities.

---

## Project status

Live and in active development. Mathematics, English, and Science modules are working, backed
by Supabase and deployed on GitHub Pages. Roadmap items and thresholds will be refined through
real-world use.

## License

No license has been selected yet. Until a license file is added, all rights remain with the
project owner.
