# MasteryPath

> An adaptive learning and mastery assessment platform that transforms lesson content into progressive, skill-aware practice.

**Repository:** `mastery-path`

MasteryPath is a subject-agnostic learning platform designed to help a learner move from first exposure to demonstrated mastery. It combines AI-assisted question-bank creation, human validation, adaptive assessment, skill-level progress tracking, and parent-facing insights.

The first implementation began with mathematics, but the platform is intentionally designed to expand across subjects:

```text
MasteryPath
├── Math Mastery
├── English Mastery
├── Science Mastery
└── Future subject modules
```

## Purpose

MasteryPath exists to answer a more useful question than “How many questions did the learner answer?”:

> What has the learner genuinely understood, where are the remaining gaps, and what should they practise next?

The platform turns lessons into measurable learning outcomes. It is intended to help parents or other trusted reviewers prepare relevant practice content, monitor understanding remotely, identify weak skills, and intervene with greater precision.

## Origin

The project began as a practical way to support a child learning from online lessons. The initial workflow uses a lesson or lecture video as source material, Gemini NotebookLM to generate questions grounded in that material, and a structured CSV file to import approved questions into the application.

This origin shapes a central principle of the project: AI assists with content preparation, but it does not replace human judgment. A parent or qualified reviewer validates generated questions before they become available to the learner.

NotebookLM is the current question-generation tool, not a permanent dependency or the product itself. MasteryPath is the learning engine that consumes validated question banks, selects appropriate practice, records attempts, evaluates mastery, and communicates progress.

## The Problem

Conventional quiz applications often report a score without explaining what the learner understands. They may:

- mix unrelated difficulty levels;
- repeat questions without responding meaningfully to performance;
- treat one high score as proof of mastery;
- hide weakness within individual sub-skills behind an overall average;
- provide parents with activity counts rather than actionable insight; and
- use generic questions that are disconnected from the learner's actual lesson.

MasteryPath addresses these limitations through lesson-grounded question banks, progressive difficulty, skill-aware assessment, and explicit mastery evidence.

## Design Philosophy

- **Mastery before progression:** Advancement should reflect reliable evidence, not a single lucky result.
- **Skills before averages:** Topic-level scores must not conceal an important weak sub-skill.
- **Adaptive learning, not random difficulty:** The next question should respond to demonstrated need.
- **Human-reviewed AI:** Generated educational content is reviewed before publication.
- **Explainable decisions:** The system should be able to state why it promoted, reinforced, or remediated a learner.
- **Subject independence:** Mathematics is the first module, not an architectural constraint.
- **Privacy by design:** A child's learning data should be collected sparingly and protected carefully.

## Learning Structure

The proposed domain hierarchy is:

```text
Learner
└── Subject
    └── Topic
        └── Skill
            └── Difficulty
                └── Question
                    └── Attempt
                        └── Mastery
```

For example:

```text
Learner
└── Mathematics
    └── Fractions
        └── Comparing fractions
            ├── Foundation
            ├── Basic
            ├── Intermediate
            ├── Advanced
            └── Challenge
```

The same structure can support English grammar, science concepts, and future subjects without redesigning the core learning engine.

## Five Difficulty Levels

Each topic is represented across five progressive bands. The topic remains consistent while the cognitive demand increases.

| Level | Name | Intended demand |
|---:|---|---|
| 1 | Foundation | Direct recognition, recall, and simple one-step application |
| 2 | Basic | Familiar application with modest variation and growing independence |
| 3 | Intermediate | Multi-step work, word problems, and the combination of related ideas |
| 4 | Advanced | Harder reasoning, less obvious solution paths, and more demanding application |
| 5 | Challenge | Deep understanding through difficult multi-step or multi-part problems |

Question design should increase reasoning demand rather than merely use larger numbers or more complicated wording. Distractors should be plausible and, where appropriate, reflect common learner mistakes. This can eventually support misconception detection as well as correctness scoring.

## Adaptive Learning Workflow

```text
Lesson or video content
        ↓
AI-assisted question generation (currently NotebookLM)
        ↓
Structured CSV output
        ↓
Parent or qualified reviewer validation and approval
        ↓
Approved question bank
        ↓
Adaptive assessment
        ↓
Attempt and sub-skill analysis
        ↓
Mastery decision
        ↓
Parent dashboard and targeted intervention
```

The initial progression concept uses approximately **80% accuracy** as the signal to move beyond the current difficulty. Once a learner has demonstrated mastery at one level, the engine should reduce or stop routine delivery of questions at that level and begin serving questions from the next level.

However, accuracy alone is not sufficient evidence. A robust mastery rule should combine:

- an accuracy threshold, initially around 80%;
- a configurable minimum number of attempts;
- adequate coverage of the topic's core sub-skills;
- sufficient performance within each required sub-skill; and
- optionally, evidence across more than one session or assessment window.

The precise thresholds remain product rules to validate through use rather than universal educational claims.

### Proposed engine decisions

After a meaningful assessment window, the adaptive engine can make one of three explainable decisions:

- **Promote:** mastery evidence is sufficient; introduce the next difficulty.
- **Reinforce:** overall performance is promising, but one or more skills need targeted practice at the current level.
- **Remediate:** sustained difficulty indicates a need to rebuild a prerequisite or temporarily step down for the affected skill.

This prevents a strong average in one area from hiding a serious gap in another.

## Question-Bank CSV Concept

The current content workflow produces structured question data for review and import. A subject-neutral CSV schema may include fields such as:

```csv
subject,topic,skill,difficulty,question,option_a,option_b,option_c,option_d,correct_answer,explanation,status
```

Possible additional metadata can be introduced only when the product requires it, for example:

- source lesson or content reference;
- grade or learner stage;
- misconception represented by each distractor;
- reviewer and approval timestamp;
- version and retirement status; and
- curriculum or learning-objective reference.

Generated files should pass structural validation before import. Questions should then pass human review for correctness, clarity, age appropriateness, answer uniqueness, difficulty calibration, and alignment with the source lesson. Only approved records should enter the live question bank.

## Key Features

### Content and question-bank management

- Lesson-grounded, AI-assisted question generation
- Structured CSV import workflow
- Human review and approval before learner access
- Questions grouped by subject, topic, skill, and difficulty
- Reusable five-level generation specification
- Support for plausible distractors and future misconception tagging

### Adaptive assessment

- Progressive delivery across five difficulty levels
- Configurable mastery thresholds
- Minimum-attempt and sub-skill coverage requirements
- Targeted reinforcement of weak skills
- Promotion, reinforcement, and remediation decisions
- Reduced repetition of already-mastered material

### Mastery tracking

- Attempt history by learner
- Accuracy by subject, topic, skill, and difficulty
- Coverage and confidence indicators
- Identification of unassessed or under-assessed skills
- Explainable mastery state and progression history

### Parent experience

- Progress and mastery overview
- Skills requiring attention
- Question-bank review and approval
- Recommended areas for reinforcement
- Visibility into why the adaptive engine made a decision

## Subject Structure

### Math Mastery

The first subject module. It can cover topics such as number operations, fractions, geometry, measurement, and word problems while tracking the distinct skills within each topic.

### English Mastery

A future module for reading comprehension, vocabulary, grammar, spelling, writing conventions, and other language skills. Its question formats and mastery evidence may differ from mathematics while using the same platform hierarchy.

### Science Mastery

A future module for foundational or basic science topics, including conceptual understanding, observation, interpretation, and applied reasoning.

### Future subjects

New modules should reuse the common learning and mastery model while allowing subject-specific question types, validation rules, and assessment strategies.

## Proposed Technical Architecture

The implementation technologies have not yet been fixed in this document. The architecture is therefore described by responsibility rather than by an unconfirmed framework or cloud provider.

```text
Content preparation
  Lesson/video sources → AI-assisted generation → CSV validation → approval

Application layer
  Learner experience → assessment service → adaptive decision engine
  Parent experience  → review tools → dashboard and interventions

Data layer
  Subjects and curriculum structure
  Versioned question bank and approval state
  Attempts and answer outcomes
  Skill-level mastery state and decision history

Operational layer
  Authentication and authorization
  Validation, audit logs, monitoring, backup, and recovery
```

Important architectural boundaries include:

- keeping the AI generation provider replaceable;
- separating generated content from approved content;
- separating assessment delivery from mastery calculation;
- recording the evidence behind each mastery decision;
- supporting different parent/reviewer and learner permissions; and
- allowing mastery rules to evolve without rewriting attempt history.

## Privacy and Child Safety

MasteryPath is intended to process children's educational data, so privacy is a core product requirement rather than a later feature.

- Collect only the personal data needed to provide the learning experience.
- Use parent or guardian-controlled accounts and appropriate consent flows.
- Keep learner and reviewer permissions separate.
- Protect data in transit and at rest when the deployment architecture is selected.
- Avoid exposing personal information in exports, logs, analytics, or public repositories.
- Maintain auditable question approval and administrative actions.
- Define retention and deletion controls for learner profiles and attempt history.
- Review applicable child-privacy and education-data requirements before public or commercial deployment.

No real learner data, credentials, private lesson content, or production exports should be committed to this repository. Development and demonstration data should be synthetic or properly anonymized.

## Roadmap

### Phase 1 — Foundation

- [ ] Finalize the subject-neutral domain model
- [ ] Generalize the five-level generation prompt beyond Mathematics
- [ ] Define and validate the question-bank CSV contract
- [ ] Build question import, validation, review, and approval workflows
- [ ] Implement Math Mastery as the first subject module

### Phase 2 — Mastery engine

- [ ] Record attempts at topic, skill, and difficulty level
- [ ] Implement configurable promotion criteria
- [ ] Add minimum-attempt and sub-skill coverage rules
- [ ] Implement promote, reinforce, and remediate decisions
- [ ] Store explainable mastery evidence and decision history

### Phase 3 — Parent insight

- [ ] Build a decision-oriented parent dashboard
- [ ] Highlight weak, unassessed, and review-due skills
- [ ] Recommend targeted reinforcement
- [ ] Add progress and mastery trends over time

### Phase 4 — Expansion

- [ ] Add English Mastery
- [ ] Add Science Mastery
- [ ] Support subject-specific question and response formats
- [ ] Explore misconception detection from distractor patterns
- [ ] Evaluate additional generation providers and deeper workflow automation

### Phase 5 — Product hardening

- [ ] Validate mastery rules through real-world use and educational review
- [ ] Strengthen accessibility and age-appropriate user experience
- [ ] Add security, privacy, retention, backup, and recovery controls
- [ ] Add automated quality checks and operational monitoring
- [ ] Document deployment and contributor workflows once technologies are selected

## Portfolio Significance

MasteryPath demonstrates more than quiz application development. It brings together:

- applied AI workflow design;
- human-in-the-loop content governance;
- scalable domain and data modeling;
- adaptive decision logic;
- learning analytics and explainability;
- parent- and learner-centered product design;
- privacy-aware handling of child data; and
- an extensible architecture that can grow across subjects.

The project's engineering story is:

> A real learning problem was translated into a data-driven system that converts validated lesson content into adaptive assessments, identifies skill gaps, and advances learners based on evidence of mastery.

## Project Status

MasteryPath is under active design and development. This README describes the product direction and proposed architecture; roadmap items and technical choices should be updated as they are implemented and verified.

## Contributing

Contribution guidelines will be added as the implementation and technology choices mature. Until then, proposed changes should preserve the core principles of human-reviewed content, explainable mastery decisions, subject independence, and learner privacy.

## License

No license has been selected yet. Until a license file is added, all rights remain with the project owner.
