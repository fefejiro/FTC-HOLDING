---
name: "ftc-client-workflow"
description: "Use when integrating a new client project (like Anion or David Jumbo) into the Unalabs delivery platform. Automates client intake → scope refinement → approval → build trigger workflow with Claude concierge service, artifact generation, and weekly delivery tracking."
---

# FTC Client Workflow

Use this skill to onboard a new client project into the Unalabs platform with full workflow automation.

This skill orchestrates the end-to-end client experience: intake form submission → Claude-generated scope → client review & approval in Unalabs → automated build trigger → ongoing delivery dashboard.

## Use When

- New client project onboarding (e.g., Anion, David Jumbo)
- Integrating client into Unalabs for scoped delivery
- Need to generate scope artifacts from client intake
- Client approval gate before building
- Automated build trigger on approval
- Weekly status/delivery email to client

## How It Works

### Phase 1: Client Intake (Existing)
Client fills intake form at `/start` → creates `projects` record in Supabase

### Phase 2: Scope Generation (Claude Concierge)
- Trigger: `POST /api/generate-project-scope`
- Claude analyzes intake form (description, plan type, budget, timeline preference)
- Generates scope artifact: phases, tech stack, effort estimates, risks, mockups, timeline
- Creates `project_artifacts` record (version 1)
- Sends scope package email to client with Unalabs review link

### Phase 3: Client Review & Feedback Loop
- Client views scope in `/dashboard/<projectId>/scope`
- Reviews phases, timeline, cost, risks, mockups
- Provides feedback or requests changes
- Feedback stored in `project_artifacts_changelog`
- Loop: Claude refines scope → updates artifact → new email → client re-reviews

### Phase 4: Approval Gate
- Client clicks "Approve & Move to Active" in Unalabs UI
- Project status moves from `scoped` → `awaiting_approval` → `active`
- Approval recorded in `project_approvals` table
- Webhook triggers GitHub Actions workflow

### Phase 5: Automated Build Trigger
- GitHub Actions workflow (`client-project-build-trigger.yml`) fires
- Creates feature branch: `feat/{project-name}-phase-1-scaffold`
- Scaffolds project structure: `APPS/{ProjectName}/`
- Creates PR with initial project structure
- Updates Supabase with `build_pr_url` and `build_started_at`
- Sends confirmation email to client with PR link

### Phase 6: Ongoing Delivery Dashboard
- Client sees real-time build status in `/dashboard/<projectId>/delivery`
- Weekly status digests auto-generated from `status-summary.json`
- Metrics: velocity, completion %, blockers, QA pass rate
- Artifact history: scope versions, approvals, test evidence

---

## Components to Deploy

### 1. Supabase Migration
**File**: `supabase/migrations/202604230002_client_workflow_artifacts.sql`

Creates tables:
- `project_artifacts` — scope docs, mockups, specs
- `project_approvals` — approval gates and audit trail
- `project_artifacts_changelog` — feedback loop history

Extends `projects` table with:
- `workflow_status` (intake → scoped → awaiting_approval → active → building → complete)
- `current_scope_version`, `build_pr_url`, `build_pr_number`, `approved_at`, `active_at`, `build_started_at`

### 2. Supabase Edge Functions
**Files**:
- `supabase/functions/generate-project-scope/index.ts` — Claude scope generation + email
- `supabase/functions/approve-project-scope/index.ts` — Approval gate + build trigger

**Env Vars Required**:
- `ANTHROPIC_API_KEY` — for Claude scope generation
- `RESEND_API_KEY` — for email delivery
- `GITHUB_TOKEN` — for GitHub Actions dispatch
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Deploy**:
```bash
supabase functions deploy generate-project-scope
supabase functions deploy approve-project-scope
```

### 3. Unalabs Components
**Files**:
- `APPS/una-labs-site/lib/client-scope-generator.ts` — Claude service (TypeScript client)
- `APPS/una-labs-site/components/project-scope-review.tsx` — Scope review UI component

**Route**: `/dashboard/<projectId>/scope` — client review interface

### 4. GitHub Actions Workflow
**File**: `.github/workflows/client-project-build-trigger.yml`

Triggered by: `repository_dispatch` event with `client_approved_scope` type

Actions:
- Checks out main branch
- Creates feature branch `feat/{project-name}-phase-1-scaffold`
- Scaffolds project structure under `APPS/{ProjectName}/`
- Creates draft PR with scaffold details
- Posts PR to Supabase and sends email to client

---

## Integration Points

### Trigger: Client Approves Scope
When client clicks "Approve & Move to Active" in Unalabs UI:
1. `ProjectScopeReview` component calls `approve-project-scope` edge function
2. Edge function updates `projects.workflow_status = 'active'`
3. Edge function calls GitHub API to dispatch `client_approved_scope` event
4. GitHub Actions workflow runs, scaffolds project, creates PR
5. PR link sent to client email

### Data Flow: Scope Generation to Client Email
```
Client Intake Form (/start)
    ↓ (new project created)
trigger: generate-project-scope edge function
    ↓ (HTTP call or scheduled job)
Claude analyzes intake → generates scope JSON
    ↓
Create project_artifacts record (version 1)
    ↓
Generate email HTML with scope summary
    ↓
Send via Resend to client.email
    ↓
Client receives email with Unalabs review link
```

### Feedback Loop: Client Changes → Claude Refines
```
Client views scope in Unalabs UI (/dashboard/<projectId>/scope)
    ↓
Client provides feedback in text area (UI component)
    ↓
On client request, trigger Claude refinement:
    "Reduce Phase 1 timeline by 1 week"
    ↓
Claude regenerates scope JSON (version 2)
    ↓
Create new project_artifacts record with version 2
    ↓
Log change in project_artifacts_changelog
    ↓
Send updated email to client
```

---

## Configuration

### Environment Variables (Supabase Secrets)
```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
GITHUB_TOKEN=ghp_...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Email Template Customization
Edit email HTML in:
- `supabase/functions/generate-project-scope/index.ts` → `generateEmailHtml()`
- `supabase/functions/approve-project-scope/index.ts` → `sendApprovalConfirmation()`

### Scope Artifact Schema
Claude generates scope with this structure:
```typescript
{
  phases: [{ name, duration_weeks, objectives[], deliverables[], milestones[] }],
  tech_stack: { frontend[], backend[], infrastructure[], tools[] },
  effort_estimates: { total_weeks, team_size, cost_estimate_usd },
  risks: [{ risk, likelihood, mitigation }],
  assumptions: string[],
  mockup_descriptions: [{ screen_name, description, user_flow }],
  timeline_breakdown: string,
  next_steps: string[]
}
```

Customize Claude prompt in `supabase/functions/generate-project-scope/index.ts` to adjust tone, detail level, or output format.

---

## Workflow States (FSM)

```
intake
  ↓ (form submitted, project created)
scoped
  ↓ (Claude generates scope artifact)
awaiting_approval
  ↓ (client reviews, provides feedback, Claude refines)
scoped → awaiting_approval (loop until approved)
  ↓ (client clicks "Approve & Move to Active")
active
  ↓ (GitHub Actions scaffold triggered)
building
  ↓ (Phase 1 development underway)
complete
```

Track via `projects.workflow_status` in Supabase.

---

## Deployment Checklist

- [ ] Run Supabase migration: `supabase db push` (or manually execute SQL)
- [ ] Deploy edge functions: `supabase functions deploy`
- [ ] Add env vars to Supabase project settings
- [ ] Test scope generation with test intake data
- [ ] Wire Unalabs UI routes: `/dashboard/<projectId>/scope` route added
- [ ] Test approval flow end-to-end (scope → approval → PR created)
- [ ] Add GitHub Actions secret: `GITHUB_TOKEN`
- [ ] Test GitHub workflow trigger (dispatch → branch creation → PR)
- [ ] Verify email delivery (check Resend dashboard)
- [ ] Deploy to production and test with real client (Anion or David Jumbo)

---

## Customization for New Clients

When onboarding a new client (e.g., David Jumbo):

1. **No new infrastructure needed** — workflow is templated and reusable
2. **Customize scope prompt** (optional):
   - Edit Claude prompt in `generate-project-scope/index.ts` for domain-specific guidance
   - Example: for SaaS clients, emphasize user onboarding; for APIs, emphasize scalability
3. **Adjust project structure scaffold** (optional):
   - Edit `.github/workflows/client-project-build-trigger.yml` to create different folder layouts
   - Example: monorepo vs. single-service vs. mobile-first
4. **Customize email templates** (optional):
   - Adjust branding, colors, messaging in email HTML generation functions

---

## Monitoring & Observability

Track workflow health:
- **Scope generation** — measure time from intake → artifact creation
- **Client review cycle** — count refinement rounds, measure time to approval
- **Build trigger latency** — measure time from approval → PR created
- **Email delivery** — use Resend dashboard to track bounces, opens, clicks

Log events to:
- Supabase audit log (via `project_approvals`, `project_artifacts_changelog`)
- GitHub Actions workflow logs
- Resend email delivery dashboard

---

## Limitations & Future Enhancements

### Current Limitations
- Scope feedback loop is manual (client text input + Claude refinement on demand)
- No real-time collaboration on scope (async only)
- Build scaffold is minimal (web + mobile stubs; no actual auth/API code yet)
- No integrated design tools (mockups are text descriptions, not Figma links)

### Future Enhancements
- Real-time scope chat (Claude agent answers client questions in Unalabs UI)
- Integrated design phase (generate Figma board + components library)
- Automated Phase 1 implementation (scaffolded auth, API contracts, CI/CD)
- Client proposal templates (PDF generation with project scope + timeline + pricing)
- Multi-team approval gates (budget approval, technical feasibility, sales review)
- Webhook events for external integrations (Slack notifications, CRM syncs)

---

## Reference Implementations

### Anion (Pilot Client)
- Intake: uby400@gmail.com, Premium plan, tutoring platform
- Scope: Generated via Claude, phases include auth, booking, lesson room, admin
- Approval: In progress (Unalabs scope review UI)
- Build: Awaiting approval (will scaffold web + mobile + shared packages)
- Status: Track at `/dashboard/<project-id>/delivery`

### David Jumbo (Future Client)
- Will follow identical workflow
- Zero new infrastructure required
- Same approval gates, same Claude concierge, same build trigger

---

## Support & Questions

For questions or customizations:
- Check `DOCS/CLIENT_WORKFLOW_ARCHITECTURE.md` for high-level design
- Review edge function code for implementation details
- Check Supabase logs for runtime errors
- Test scope generation locally: `node APPS/una-labs-site/lib/client-scope-generator.ts`
