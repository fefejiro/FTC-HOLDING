# Client Workflow Architecture
## Unalabs as the Delivery Platform for Ongoing Client Projects

**Status**: COMPLETE (canonical architecture source)  
**Date**: 2026-04-23  
**Scope**: ATeam-inspired client intake → scope → active → build workflow, reusable for Anion, David Jumbo, and all future FTC clients  
**Owner**: Manchi / FTC Holding  
**Reference**: `/ateam` workflow (proven pattern), `APPS/una-labs-site` (delivery platform), `DOCS/ANION/` (first client case study)

---

Use this file as the canonical source for client workflow architecture and design decisions.
Use `CLIENT_WORKFLOW_DEPLOYMENT_CHECKLIST.md` for deployment steps and `CLIENT_WORKFLOW_IMPLEMENTATION_GUIDE.md` for implementation-specific context.

## Vision

**Unalabs becomes the execution platform, not just the marketing site.** When a client like Uby moves a project from "Scoped" to "Active" approval, Unalabs automatically triggers:

1. **Claude as the concierge service** — refines scope documents, generates mockups, creates implementation artifacts
2. **Automated deliverable packaging** — bundles docs, charts, timelines, evidence into review packages
3. **Client artifact loop** — sends package to client email (uby400@gmail.com), client reviews/approves in Unalabs UI
4. **Build triggering** — once Active, kicks off automated scaffolding, CI/CD, and progress tracking
5. **Ongoing delivery dashboard** — weekly status, metrics, blockers, and handoff artifacts visible to both client and operator

### Why This Matters

- **Anion is the first real client on Unalabs** — workflow must be proven and reusable
- **David Jumbo is coming next** — same workflow should apply with zero new infrastructure
- **Current gap** — Anion is at "Awaiting_approval" in Unalabs pipeline, but there's no concierge service wired, no artifact generation, no build trigger
- **Lean win** — 70% of the patterns already exist in ATeam; we extend and template them

---

## Architecture Overview

### High-Level Flow (Anion Example)

```
[Client Intake] → [Scope Refinement Loop] → [Approval Gate] → [Build Trigger] → [Delivery Dashboard]
   
   Intake Form                Claude Concierge          Client Signs Off     Automated Build    Weekly Status
   (Unalabs /start)           (Artifact Generation)     (Unalabs UI)         (CI/CD Trigger)    (Unalabs + Email)
   
   ↓ Input: Email, Plan       ↓ Input: Scope Doc       ↓ Action: Move       ↓ Action: Scaffold  ↓ Output: Status
   ↓ Output: Project + Link   ↓ Output: Mockups,       ↓ Status→Active      ↓ Repo Update,     ↓ Audience: Client
                              ↓        Docs, Charts                          ↓ PR Opens         ↓ Frequency: Weekly
                              ↓ Sent to: Client Email                        ↓ Dashboard Update
```

### Component Layers

#### Layer 1: Client Intake (Existing, Reuse)
- **Route**: `/start` → form submission → project creation in Supabase
- **Who**: Guest client (e.g., Uby)
- **Output**: Supabase `projects` record + email confirmation
- **Wired**: ✅ Already working (una-labs-site intake form)

#### Layer 2: Scope Refinement Loop (NEW)
- **Route**: `/dashboard/<projectId>/scope` (Unalabs UI) + async Claude service
- **Who**: Client + Claude concierge (agent) + FTC operator (approval)
- **Triggers**:
  - When project created → Claude generates initial scope from intake form
  - When client edits scope in UI → Claude refines and regenerates artifacts
  - On schedule (daily?) → Claude generates weekly digest and packages artifacts
- **Outputs**:
  - Documents: implementation plan, technical spec, timeline breakdown
  - Visual: mockup images, user flow diagrams, architecture charts
  - Structured: JSON summary with phases, milestones, estimated effort
  - Email: package sent to client with approval link
- **Storage**: Supabase `project_artifacts` table + Cloudflare R2 (for images/PDFs)
- **Status**: ❌ Not yet built — this is the critical gap

#### Layer 3: Approval Gate (Partial)
- **Route**: `/dashboard/<projectId>` (client view)
- **Actions**:
  - Client reviews artifacts, asks questions (Unalabs comment thread)
  - FTC operator refines based on feedback → Claude regenerates
  - Client approves scope → clicks "Approve & Move to Active"
- **Automation**: Approval moves project status from "Scoped" → "Active", logs timestamp, triggers Layer 4
- **Storage**: Supabase `project_approvals` record + audit log
- **Status**: 🟡 Partial — UI exists, approval logic needs wiring

#### Layer 4: Build Trigger (NEW)
- **Route**: Webhook listener + GitHub Actions
- **Trigger**: `UPDATE projects SET status = 'active'` (Layer 3 approval)
- **Action**:
  - Creates project scaffold repo (e.g., `anion/` if client is Anion)
  - Runs governance skill to scaffold docs, types, architecture stubs
  - Creates feature branch + PR with initial structure
  - Sends GitHub PR link to client email
  - Updates Unalabs dashboard with build status
- **Status**: ❌ Not yet built — webhook listener and GitHub Actions workflow needed

#### Layer 5: Delivery Dashboard (NEW)
- **Route**: `/dashboard/<projectId>/delivery` (enhanced version of current dashboard)
- **Who**: Client + Operator
- **Displays**:
  - Scope summary (status, phases, timeline)
  - Build status (latest commit, PR list, branch coverage)
  - Metrics (velocity, completion %, blockers)
  - Weekly status snippets (auto-generated from status-summary.json)
  - Artifact history (all previous scopes, approvals, versions)
- **Storage**: Real-time from Supabase + status-summary.json sync
- **Status**: 🟡 Partial — basic dashboard exists, metrics layer needs wiring

---

## Detailed Design: Layer 2 (Scope Refinement Loop) — The Concierge Service

### Workflow: How Claude Stays Connected

```
Client Project Created (Layer 1)
         ↓
    Claude Agent Triggered
         ↓
    [Intake Data] → Analyze Intake Form
         ↓
    Generate Initial Scope:
    - Implementation Plan (phases, milestones)
    - Technical Spec (tech stack, API design)
    - Timeline (weeks, effort estimates)
    - Risk Log (assumptions, dependencies)
    - Mockup/Chart Descriptions (for design system)
         ↓
    Store Artifacts in Supabase
         ↓
    Package for Email + Unalabs Review
         ↓
    Client Reviews in Unalabs UI
         ↓
    Client Requests Changes / Adds Notes
         ↓
    Claude Regenerates (Loop)
         ↓
    Once Approved → Move to Active (Layer 3)
```

### Claude's Concierge Role

**Initial Scope Generation (Post-Intake)**
- Input: Client intake form (from `/start` submission)
- Output: 
  - Phase breakdown with milestones
  - Effort estimate per phase
  - Risk assumptions
  - Technical architecture summary
  - Sample mockup descriptions (e.g., "Listen button with orb animation")
  - Implementation roadmap
- Template: Use Anion Phase 1 docs as reference (`DOCS/ANION/product/ROADMAP.md`, etc.)
- Delivery: JSON artifact stored in Supabase + email to client with Unalabs review link

**Iterative Refinement (On Client Feedback)**
- Input: Client comments/edits in Unalabs UI ("Can you split Phase 1 further?", "Timeline too aggressive?")
- Output: Updated docs + re-generated mockup descriptions + revised estimates
- Loop: Repeat until client clicks "Approve & Move to Active"

**Weekly Digests (During Active Phase)**
- Input: Commits to project repo, GitHub PR activity, status-summary.json
- Output: Weekly snapshot email with progress, blockers, completed artifacts, next week forecast
- Delivery: Auto-email to client, also visible in Unalabs dashboard

### Data Model

**New Supabase Tables**

```sql
-- project_artifacts
CREATE TABLE project_artifacts (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  artifact_type VARCHAR (50),  -- 'scope', 'mockup', 'timeline', 'risk_log', 'spec'
  version INT,
  content JSONB,  -- { phases: [...], milestones: [...], risks: [...] }
  generated_by VARCHAR (50),  -- 'claude', 'client', 'operator'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- project_approvals
CREATE TABLE project_approvals (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  approval_type VARCHAR (50),  -- 'scope_approval', 'pack_approval'
  approved_by VARCHAR (255),  -- email
  artifact_version INT,
  notes TEXT,
  approved_at TIMESTAMP
);

-- project_artifacts_changelog
CREATE TABLE project_artifacts_changelog (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  change_summary TEXT,  -- "Reduced timeline by 1 week per client feedback"
  changed_at TIMESTAMP,
  triggered_by VARCHAR (50)  -- 'client_feedback', 'automation', 'operator_adjustment'
);
```

---

## Detailed Design: Layer 4 (Build Trigger) — Automated Scaffolding

### Trigger Mechanism

```
Client approves scope + clicks "Move to Active"
         ↓
    Supabase UPDATE projects SET status = 'active'
         ↓
    PostgreSQL trigger or webhook listener captures event
         ↓
    Webhook POST to GitHub Actions workflow
         ↓
    GitHub Actions workflow:
      1. Clone starter template (or anion-foundation PR)
      2. Run governance skill to scaffold docs/types/structure
      3. Customize with client name, colors, domain
      4. Create feature branch (feat/anion-phase-1-build or similar)
      5. Open PR with full scaffold
      6. Commit SHA stored in Supabase project record
         ↓
    Email sent to client: "Build started! PR: https://..."
         ↓
    Unalabs dashboard updated with build status
```

### Implementation Path

**Supabase Webhook**
```javascript
// Listen for projects table status change → 'active'
// Post to: https://api.github.com/repos/fefejiro/FTC-HOLDING/dispatches
// Payload: { event_type: 'client_approved_scope', project_id: '...', client_name: 'anion', ... }
```

**GitHub Actions Workflow** (`.github/workflows/client-project-build-trigger.yml`)
```yaml
name: Client Project Build Trigger
on:
  repository_dispatch:
    types: [client_approved_scope]

jobs:
  scaffold:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scaffold Project
        run: |
          PROJECT_NAME=${{ github.event.client_payload.client_name }}
          CLIENT_EMAIL=${{ github.event.client_payload.email }}
          
          # Run governance skill or bootstrap script
          npm run scaffold:project -- --name=$PROJECT_NAME --email=$CLIENT_EMAIL
          
          # Commit and push
          git checkout -b feat/$PROJECT_NAME-phase-1-build
          git add .
          git commit -m "feat($PROJECT_NAME): phase 1 scaffold with governance framework"
          git push -u origin feat/$PROJECT_NAME-phase-1-build
          
      - name: Create Pull Request
        # Use GitHub API to create PR
        run: |
          # POST /repos/.../pulls with title, body, head, base
          echo "PR created for $PROJECT_NAME"
          
      - name: Update Supabase + Send Email
        run: |
          # Update projects.build_pr_url
          # Send email to CLIENT_EMAIL with PR link
```

---

## Detailed Design: Layer 5 (Delivery Dashboard) — Real-Time Client Visibility

### Client Dashboard View

**Route**: `/dashboard/<projectId>/delivery` or tab on existing dashboard

**Sections**:
1. **Scope Summary** (collapsible)
   - Status badge: Intake | Scoped | Active | Complete
   - Phases with estimated timeline (from scope artifacts)
   - Cost/effort breakdown
   - Approval timestamps and comments

2. **Build Status** (live)
   - Latest commit hash + message
   - Open PRs (numbered list with links)
   - Branch coverage (main, develop, feature/*, staging)
   - Last deployment timestamp

3. **Metrics** (real-time from status-summary.json)
   - Velocity (PRs merged per week)
   - Completion % (milestones reached / total)
   - Blocker count (from GitHub Issues or Supabase status_log)
   - QA pass rate (from test-evidence logs)

4. **Weekly Status Digest** (auto-generated)
   - What shipped this week (commits + features)
   - What's next (upcoming milestones)
   - Any blockers or decisions needed
   - Artifact updates (if scope refined)

5. **Artifact History** (timeline view)
   - Scope v1, v2, v3 with approval dates
   - Mockup versions
   - Test evidence snapshots
   - Release notes

### Data Pipeline

```
Project Repo (GitHub)
    ↓ (webhook on push/PR)
status-summary.json (updated by status sync script)
    ↓ (periodic sync, e.g., cron job)
Supabase project_metrics table
    ↓ (real-time query)
Unalabs dashboard frontend
    ↓ (weekly email digest)
Client inbox (uby400@gmail.com)
```

---

## ATeam Pattern Mapping

### How This Reuses ATeam's Proven Workflow

| ATeam Layer | ATeam Behavior | Client Project Adaptation |
|------------|---|---|
| **Intake** | `/ateam` form → project created | `/start` form → project created (already exists) |
| **Analysis** | ATEAM asks follow-up questions | Claude analyzes intake form → generates scope |
| **Brief Approval** | Client approves brief | Client approves scope document in Unalabs |
| **Initiation** | Operator sets up project | Build trigger scaffolds repo automatically |
| **Prototype Pack** | ATEAM generates mockups + docs | Claude generates mockups + implementation docs |
| **Pack Approval** | Client approves pack | Client approves scope artifacts in Unalabs |
| **Handoff** | Work moves to operator layer | Project moves to Active, PRs open, team builds |

### Key Insight

ATeam's workflow is **time-limited** (intake → brief → pack → handoff, then archived).

Client project workflow is **ongoing** (intake → scope → active → build → deliver → close).

The concierge service must **stay connected** through the delivery phase, not just the initial intake.

---

## Implementation Roadmap

### Phase 0: Design & Integration (This Week)
- ✅ Define workflow architecture (this doc)
- Define reusable client workflow skill (similar to ftc-project-governance)
- Map Anion's current state to workflow (where are we in the pipeline?)
- Identify what's buildable vs. what requires new infrastructure

### Phase 1: Scope Refinement Loop (Weeks 1-2)
- Build Supabase tables for artifacts and approvals
- Create Claude service stub that generates initial scope from intake
- Wire Unalabs dashboard to show artifacts
- Email integration: send scope package to client

### Phase 2: Approval Gate Wiring (Week 2-3)
- Add "Move to Active" button in Unalabs UI
- Implement approval logic (project status update)
- Audit trail + email confirmation

### Phase 3: Build Trigger (Week 3-4)
- Implement Supabase webhook listener
- Create GitHub Actions workflow for project scaffolding
- Test with Anion project
- Send PR + status update to client email

### Phase 4: Delivery Dashboard & Metrics (Week 4-5)
- Enhance Unalabs dashboard with build status, metrics, history
- Set up status-summary.json sync for client projects
- Weekly digest email generation

### Phase 5: Reusable Template & David Jumbo (Week 5+)
- Package workflow as a skill (`.github/skills/ftc-client-workflow/`)
- Document for future clients
- Apply to David Jumbo project with zero new infrastructure

---

## Anion Case Study: Current State

**Anion's Position in Workflow**:
- ✅ **Intake**: Complete (uby400@gmail.com submitted via `/start`)
- ✅ **Scoped**: Anion docs created (`DOCS/ANION/`), scope artifacts exist
- 🟡 **Awaiting Approval**: In Unalabs pipeline, but no concierge artifacts packaged yet
- ❌ **Build Trigger**: Awaiting approval → Active gate needs wiring
- ❌ **Active**: Status not yet "Active" in Unalabs projects table
- ❌ **Build Started**: PR hasn't been auto-created yet

**Next Steps for Anion**:
1. Update Supabase `projects` record to include artifact_version, approval_status, etc.
2. Generate initial scope artifact from existing DOCS/ANION/ (mockups, roadmap, timeline)
3. Package and email to Uby at uby400@gmail.com with Unalabs review link
4. Once approved in UI → move to Active (manual for now, or automatic if button is ready)
5. Build trigger fires → scaffolds web/mobile/shared structure in repo
6. PR opens, client sees build status in dashboard

---

## Reusability: David Jumbo Project Template

**Once Anion workflow is proven**, David Jumbo project will follow identical flow:

```
1. David Jumbo fills intake form at /start
2. Supabase creates projects record
3. Claude generates scope artifacts (reusing Anion's templates)
4. Email sent to David Jumbo with Unalabs review link
5. David Jumbo approves scope in Unalabs
6. Build trigger fires, scaffolds David's project repo
7. Weekly delivery dashboard shows progress
8. Same approval gates, same concierge experience, same artifact pipeline
```

**No new infrastructure needed** — workflow is templated.

---

## Success Criteria

### For Anion (Pilot)
- [ ] Scope artifacts generated and packaged
- [ ] Client receives artifact email with Unalabs review link
- [ ] Client approves scope in Unalabs UI
- [ ] Approval triggers build (PR auto-created with scaffold)
- [ ] Build status visible in client dashboard
- [ ] Weekly digest email sent to client

### For David Jumbo (Reuse)
- [ ] Same workflow executes with zero new setup
- [ ] Client workflow skill exists and is documented
- [ ] Intake → Scope → Active → Build flow is proven, repeatable

### For FTC (Platform)
- [ ] Unalabs is now the delivery platform, not just marketing
- [ ] Concierge service is automated and async (Claude)
- [ ] Artifact packaging is templated and reusable
- [ ] Future clients onboard with predictable workflow

---

## Technical Decisions to Confirm

1. **Supabase webhook or serverless trigger?**
   - Supabase webhooks (simpler) vs. serverless function (more control)

2. **GitHub Actions vs. custom workflow service?**
   - GitHub Actions (leverages existing CI/CD) vs. dedicated workflow server (more flexible)

3. **Status artifact refresh frequency?**
   - Real-time (expensive) vs. hourly (current pattern) vs. on-demand

4. **Client notification preference?**
   - Email for artifacts + Unalabs UI for engagement, or alternative?

5. **Build PR approval chain?**
   - Auto-merge scaffold PR or require manual FTC operator review?

---

## Metrics & Observability

**Track for Each Client**:
- Time from intake → approval (days)
- Artifact refinement iterations (count)
- Time from approval → build started (hours)
- Build to first merged PR (days)
- Weekly velocity (PRs merged, tasks completed)
- Blocker frequency and resolution time
- Client feedback sentiment (from Unalabs comments)

**Dashboard**:
- Portfolio-level view: all client projects, statuses, velocity, delivery timeline
- Per-project view: phases, build status, metrics, artifact history, weekly digest

---

## Open Questions for Discussion

1. **Should Claude concierge service be real-time or scheduled?**
   - Real-time on client edits (more responsive) vs. scheduled digests (lower cost)

2. **Who owns the scope approval — client alone or client + FTC operator?**
   - Current design: client approves in Unalabs, triggers build immediately
   - Alternative: FTC operator must also approve before build kicks off

3. **Should build scaffold be auto-merged to main or stay as draft PR?**
   - Auto-merge (faster) vs. draft PR (safer, allows review)

4. **How much of this can reuse existing ATeam infrastructure vs. build new?**
   - ATeam's workflow API vs. Supabase webhooks vs. custom service

5. **Is email the right notification channel for scope artifacts?**
   - Email + Unalabs UI (current design) vs. Slack/Discord (if clients prefer)

---

## References

- ATeam workflow: `DOCS/ATEAM_PUBLIC_OPERATOR_HANDOVER_2026-03-24.md`
- Anion docs: `DOCS/ANION/`
- Governance skill: `.github/skills/ftc-project-governance/SKILL.md`
- Current Unalabs dashboard: `APPS/una-labs-site/lib/portfolio-status.ts`
- Status sync pattern: `scripts/update-unalabs-status.mjs`
