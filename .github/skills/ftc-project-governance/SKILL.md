---
name: "ftc-project-governance"
description: "Use when scaffolding a new FTC project, setting up project governance, creating product docs, mirroring Jira and Confluence artifacts in the repo, defining status-summary contracts, wiring dashboard tracking, or establishing reusable project documentation templates. Reuses the installed project-management Jira, Confluence, and Atlassian template skills while enforcing FTC repo artifacts, weekly summaries, and portfolio-feed outputs."
---

# FTC Project Governance

Use this skill for every new FTC product or major internal initiative.

This skill does not replace Jira or Confluence. It wraps the existing Atlassian-oriented skills with FTC-specific rules so every project is traceable in three places at once:
- repo-native docs for AI agents and Git history
- reducible weekly summaries for operator review
- machine-readable status artifacts for the shared portfolio dashboard

## Reuse Stack

Always pair this skill with the existing project-management stack when the work calls for it:
- `project-management/jira-expert` for backlog structure, workflow states, dashboards, and reporting
- `project-management/confluence-expert` for page hierarchy, documentation governance, and knowledge architecture
- `project-management/atlassian-templates` for repeatable project charters, PRDs, decision logs, meeting notes, and release notes

## Use When

Invoke this skill when the request includes any of the following:
- new project
- scaffold project
- project foundation
- set up docs
- product documentation
- jira
- confluence
- dashboard tracking
- status summary
- weekly summary
- project governance
- artifact tracking
- launch a new product

## FTC Rules

1. Every project must ship with a repo artifact ladder.
2. Every artifact ladder must be reducible.
3. Every project must define a machine-readable status contract before feature work expands.
4. Every project must have a path into `FTC_MASTER.md` and the portfolio dashboard.
5. Lean projects may shrink the amount of documentation, but they may not skip the reduction contract.

## Artifact Ladder

### Strategy Layer
- product brief
- architecture overview
- ADR index and first ADR
- roadmap
- data model or schema proposal

### Delivery Layer
- epic map
- story/backlog structure
- risk log
- decision log
- release checklist or release log

### Execution Layer
- weekly status summary
- machine-readable status artifact
- health probe definitions
- metrics definition
- test evidence log
- deployment notes
- incident or issue log when applicable

## Reduction Contract

Each project must support this reduction path:

1. Long-form project docs become a short weekly summary.
2. Weekly summary becomes a machine-readable status artifact.
3. Status artifact feeds `FTC_MASTER.md` and the shared portfolio dashboard.

If a project cannot be reduced this way, the documentation structure is incomplete.

## Modes

### Full Mode
Use for flagship, client-visible, or revenue-bound projects.

Required outputs:
- all strategy artifacts
- all delivery artifacts
- all execution artifacts

### Lean Mode
Use for validation-stage products or early R&D.

Minimum outputs:
- product brief
- architecture overview
- first ADR
- roadmap
- weekly summary
- machine-readable status artifact
- health and metrics contract

## Repo Conventions

Reuse these existing patterns:
- `FTC_MASTER.md` for portfolio-level auto snapshots
- `scripts/update-unalabs-status.mjs` as the status-sync reference pattern
- `APPS/una-labs-site/lib/portfolio-status.ts` as the shared dashboard contract pattern

Prefer project docs under either:
- `DOCS/<PROJECT>/...` for cross-project visibility
- `APPS/<project>/ops/...` for project-local machine-readable artifacts and operational files

## Default Outputs For New Projects

Create these files from the templates folder unless equivalent files already exist:
- `TEMPLATE_SELECTION_GUIDE.md` (read first; do not instantiate per project)
- `PROJECT_BRIEF.md`
- `ARCHITECTURE_OVERVIEW.md`
- `ADR.md`
- `ROADMAP.md`
- `RISK_LOG.md`
- `RELEASE_LOG.md`
- `WEEKLY_STATUS.md`
- `STATUS_SUMMARY.json`

Before creating the project artifacts, read `templates/TEMPLATE_SELECTION_GUIDE.md` to avoid generating overlapping documents for the same purpose.

## Verification

Before considering the scaffold complete, confirm:
- required artifact files exist
- a weekly summary file exists
- a machine-readable status file exists
- `FTC_MASTER.md` includes a project snapshot block or placeholder
- the portfolio dashboard integration path is either wired or explicitly documented as pending

## Non-Goals

- Do not require paid tooling to use this skill.
- Do not force heavyweight documentation for tiny validation efforts.
- Do not replace GitHub PR review with project docs.
