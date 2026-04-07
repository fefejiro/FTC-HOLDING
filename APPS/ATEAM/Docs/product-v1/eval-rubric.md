# Eval Rubric

## Purpose

ATEAM V1 needs a lightweight, inspectable evaluation record for every completed or failed run.

This is not meant to be an overfit scoring system. It is meant to answer:

- Did the output match the request?
- Did the system stay in scope?
- Would a human need to repair a lot?

## Fields

- `intentFidelity`
- `scopeAdherence`
- `artifactCompleteness`
- `assumptionDiscipline`
- `humanCorrectionNeeded`
- `finalStatus`
- `summary`

## Suggested Scoring Model

Use a 1 to 5 scale for the numeric dimensions:

- `intentFidelity`: how closely the artifact matched the user request
- `scopeAdherence`: how well the run stayed inside stated constraints and non-goals
- `artifactCompleteness`: how usable the returned artifact bundle is
- `assumptionDiscipline`: how explicit and controlled the inferred assumptions were

Use short enums or concise text for:

- `humanCorrectionNeeded`: `low`, `medium`, `high`
- `finalStatus`: `completed`, `failed`, `rejected`, `escalated`

## V1 Guidance

- Write an evaluation on completion
- Write an evaluation on rejection/failure too
- Keep the summary inspectable in one paragraph
- Do not treat the rubric as a hidden model score; it is an operator-facing truth layer
