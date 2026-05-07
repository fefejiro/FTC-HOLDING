# Client Workflow Implementation Guide

> Use `CLIENT_WORKFLOW_ARCHITECTURE.md` for canonical design decisions and `CLIENT_WORKFLOW_DEPLOYMENT_CHECKLIST.md` for the deployment runbook.
> This file should stay focused on implementation context and the pilot case-study surface.

**Status**: Phase 1 Implementation Ready  
**Date**: 2026-04-23  
**Owner**: Manchi / FTC Holding  
**Target Clients**: Anion (pilot), David Jumbo (next), all future FTC clients

---

## What Just Got Built

A complete, reusable **client delivery workflow** that integrates into Unalabs and automates the journey from intake → scope → approval → build:

1. **Supabase schema** (`project_artifacts`, `project_approvals`, `project_artifacts_changelog`)
2. **Claude concierge service** (TypeScript + Anthropic API) that generates scope from intake
3. **Supabase edge functions** (orchestration + approval gate + webhook dispatch)
4. **Unalabs UI component** for client scope review and approval
5. **GitHub Actions workflow** that scaffolds projects on approval
6. **Reusable skill** (`.github/skills/ftc-client-workflow/`) for future clients

---

## Current Anion State

**In Unalabs Pipeline**: Anion is at "Awaiting_approval" (the green highlighted card in the screenshot you shared)

**Missing pieces** (about to be wired):
- Scope artifact generation (Claude → JSON)
- Scope email to Uby at uby400@gmail.com
- Unalabs scope review UI (`/dashboard/<anion-project-id>/scope`)
- Approval button that triggers build
- GitHub Actions scaffold creation

**What needs to happen next**:
1. Deploy Supabase migration (new tables)
2. Deploy edge functions (scope generation + approval)
3. Add routes to Unalabs for scope review UI
4. Test end-to-end with Anion project

---

## Immediate Implementation Steps (This Week)

### Step 1: Deploy Supabase Migration
```bash
cd "C:\FTC HOLDING"
supabase db push
# or manually execute: supabase/migrations/202604230002_client_workflow_artifacts.sql
```

**Verification**: Check Supabase dashboard → Tables should include `project_artifacts`, `project_approvals`, `project_artifacts_changelog`

### Step 2: Set Supabase Secrets
In Supabase project → Settings → Secrets:
```
ANTHROPIC_API_KEY=sk-ant-[your-key]
RESEND_API_KEY=re_[your-key]
GITHUB_TOKEN=ghp_[your-token]
```

### Step 3: Deploy Edge Functions
```bash
supabase functions deploy generate-project-scope
supabase functions deploy approve-project-scope
```

**Test**:
```bash
curl -X POST "https://[PROJECT_ID].supabase.co/functions/v1/generate-project-scope" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-anion",
    "email": "uby400@gmail.com",
    "projectName": "Anion Class App",
    "planType": "professional",
    "description": "Premium tutoring platform with lesson rooms and marketplace"
  }'
```

Expected response: Scope artifact JSON + artifact ID

### Step 4: Add Unalabs Routes
In `APPS/una-labs-site/app/dashboard/[projectId]/scope/page.tsx`:
```typescript
import ProjectScopeReview from '@/components/project-scope-review';

export default function ScopePage() {
  return <ProjectScopeReview />;
}
```

### Step 5: Wire Initial Scope Generation for Anion
Manually trigger scope generation for existing Anion project:
```bash
# Call edge function with Anion intake data
curl -X POST "https://[PROJECT_ID].supabase.co/functions/v1/generate-project-scope" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "[anion-project-id-from-supabase]",
    "email": "uby400@gmail.com",
    "projectName": "Anion Class App",
    "planType": "professional",
    "description": "Premium online tutoring platform with real-time lesson rooms, tutor marketplace, and integrated payment processing"
  }'
```

**Result**: 
- Scope artifact created in Supabase
- Email sent to uby400@gmail.com with Unalabs review link
- Status updated in `/dashboard/<anion-project-id>/scope`

### Step 6: Test Approval Flow
1. Open Unalabs dashboard as Uby (uby400@gmail.com)
2. Navigate to `/dashboard/<anion-project-id>/scope`
3. Review scope sections (Overview, Phases, Timeline, Risks, Mockups)
4. Click "Approve & Move to Active"
5. Watch GitHub Actions workflow trigger (check `.github/workflows/client-project-build-trigger.yml`)
6. Verify PR created with project scaffold
7. Check email confirmation sent to Uby

---

## Architecture Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workflow trigger | Supabase webhooks + GitHub Actions dispatch | Simpler than custom service, uses existing tooling |
| Scope generation | Scheduled on approval, not real-time | Lower cost, fits async client feedback loop |
| Email delivery | Resend API | Reliable, good deliverability, easy integration |
| Build artifact | Draft PR on feature branch | Safer than auto-merge, allows review before production |
| Scope version control | Supabase `project_artifacts` table | Native audit trail, versioning, feedback tracking |
| Client feedback | Text input + Claude refinement | Simple UX, flexible for scope adjustments |

---

## Data Flow Diagram

```
[Client] (uby400@gmail.com)
    ↓ (visits Unalabs dashboard)
    
[Unalabs UI]
    ├─ /dashboard/[projectId]/scope
    │   ├─ Display scope from project_artifacts
    │   ├─ Client provides feedback
    │   └─ Client clicks "Approve & Move to Active"
    │
    ↓ (approval submitted)
    
[approve-project-scope edge function]
    ├─ Record approval in project_approvals
    ├─ Update projects.workflow_status = 'active'
    ├─ Dispatch GitHub event: client_approved_scope
    └─ Send confirmation email
    
    ↓ (GitHub Actions triggered)
    
[client-project-build-trigger workflow]
    ├─ Checkout main
    ├─ Create feature branch: feat/anion-phase-1-scaffold
    ├─ Scaffold APPS/anion/ structure
    ├─ Create PR with scaffold details
    └─ Update Supabase build_pr_url
    
    ↓ (build started)
    
[Unalabs Delivery Dashboard]
    ├─ /dashboard/[projectId]/delivery
    ├─ Shows PR link, build status
    ├─ Shows phases, timeline, metrics
    └─ Weekly digest emails to client
```

---

## Anion Use Case: From Awaiting_approval to Active

**Today** (before implementation):
- Anion card in Unalabs: "Awaiting_approval" status
- Uby has not seen detailed scope
- No approval mechanism exists
- No build trigger

**After implementation** (one day after deploying):
1. Uby receives email: "Your Anion Scope is Ready for Review"
   - Includes 3-phase breakdown (Auth+Booking, Lesson Room, Admin+Payments)
   - Effort: 12 weeks, $50k, 2 engineers
   - Risks and assumptions listed
   - Mockup descriptions for all screens

2. Uby clicks link → Opens Unalabs scope review UI
   - Tabs: Overview | Phases | Timeline | Risks | Mockups
   - Can see each phase's deliverables and milestones
   - Can see risks (integration complexity, API stability, etc.)

3. Uby reviews and decides to approve
   - (Optional: add feedback or request changes — Claude would refine)
   - Clicks "✓ Approve & Move to Active"

4. **Immediately**:
   - Project status moves to "Active" in Unalabs
   - GitHub Actions workflow fires
   - Feature branch created: `feat/anion-phase-1-scaffold`
   - `APPS/anion/` folder scaffolded with web, mobile, packages structure
   - PR opened with project scaffold
   - Uby receives confirmation email with PR link

5. **In real-time**:
   - Uby sees build status update in `/dashboard/anion/delivery`
   - PR shows in GitHub
   - FTC team reviews, approves, merges scaffold
   - Phase 1 development begins

---

## Testing Checklist

- [ ] Supabase migration applies successfully (`project_artifacts` table exists)
- [ ] Edge functions deploy without errors
- [ ] Scope generation produces valid JSON
- [ ] Email sent to client with correct content
- [ ] Unalabs scope review UI loads (pages render, tabs work)
- [ ] Approval button updates project status in Supabase
- [ ] GitHub Actions workflow triggered on approval
- [ ] Feature branch created correctly
- [ ] PR auto-created with scaffold
- [ ] Build PR URL stored in Supabase
- [ ] Confirmation email sent after approval
- [ ] Client can see approval status in Unalabs

---

## Post-Implementation: Anion Phase 1 Build

Once Anion scaffold PR is merged:
1. FTC team begins Phase 1 dev (auth, directory, booking)
2. Weekly status syncs to `APPS/anion/ops/status-summary.json`
3. `scripts/update-anion-status.mjs` runs nightly
4. Unalabs delivery dashboard auto-updates with progress
5. Weekly digest emails sent to uby400@gmail.com

---

## Reuse for David Jumbo

When David Jumbo's project is ready to onboard:
1. David fills intake form at `/start`
2. Supabase creates `projects` record
3. **Same workflow applies** — no new infrastructure needed
4. Scope auto-generated, email sent, approval flow identical
5. Build scaffold triggers on approval
6. David sees dashboard with progress

**Zero change to code or configuration** — workflow is now templated.

---

## Future Enhancements

### Near-term (Weeks 2-3)
- [ ] Real-time scope chat with Claude (client asks questions in Unalabs UI)
- [ ] Scope comparison view (v1 vs v2 diff highlighting)
- [ ] Integrated design phase (Figma board generation)
- [ ] Weekly digest email automation (pull metrics from status-summary.json)

### Mid-term (Weeks 4-6)
- [ ] Automated Phase 1 implementation (go from scaffold → working auth/API)
- [ ] Client proposal PDF generation (scope + timeline + pricing)
- [ ] Multi-team approval gates (sales, technical, budget approval)
- [ ] Milestone progress tracking (client can check off completed tasks)

### Long-term (Weeks 7+)
- [ ] Client portal (self-serve dashboards, artifact access)
- [ ] Slack/email integration (notifications to client on PR merge, build status)
- [ ] Analytics pipeline (measure scope-to-active time, client satisfaction)
- [ ] Marketplace integration (recommend vendors, tools, templates)

---

## Debugging Tips

**Scope generation failing?**
- Check Anthropic API key in Supabase secrets
- Check Anthropic quota and usage
- Review edge function logs: `supabase functions logs generate-project-scope`

**Email not sent?**
- Check Resend API key and webhook logs
- Verify sender email domain is configured in Resend
- Check spam folder

**GitHub Actions not triggered?**
- Verify GitHub token in Supabase secrets
- Check GitHub Actions workflow file: `.github/workflows/client-project-build-trigger.yml`
- Manually trigger test: `gh workflow dispatch`

**Approval button doesn't work?**
- Check browser console for errors
- Verify Supabase RLS policies on `project_approvals` table
- Test edge function manually with curl

**Build scaffold not created?**
- Check GitHub Actions workflow logs
- Verify branch creation: `git branch -r | grep feat/anion`
- Check PR history in GitHub UI

---

## Key Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/202604230002_client_workflow_artifacts.sql` | Schema for artifacts & approvals | Created ✅ |
| `supabase/functions/generate-project-scope/index.ts` | Claude scope generation | Created ✅ |
| `supabase/functions/approve-project-scope/index.ts` | Approval gate + build trigger | Created ✅ |
| `APPS/una-labs-site/lib/client-scope-generator.ts` | TypeScript client for scope generation | Created ✅ |
| `APPS/una-labs-site/components/project-scope-review.tsx` | Unalabs UI for scope review | Created ✅ |
| `.github/workflows/client-project-build-trigger.yml` | GitHub Actions scaffold workflow | Created ✅ |
| `.github/skills/ftc-client-workflow/SKILL.md` | Reusable workflow skill documentation | Created ✅ |
| `DOCS/CLIENT_WORKFLOW_ARCHITECTURE.md` | High-level architecture & decisions | Created ✅ |

---

## Next Steps (Tomorrow)

1. **Deploy to Supabase** (migration + edge functions + secrets)
2. **Wire Unalabs routes** (add `/dashboard/[projectId]/scope` page)
3. **Trigger initial scope for Anion** (manual edge function call with Anion intake data)
4. **Test end-to-end** (Anion approval → GitHub PR creation)
5. **Get Uby to review** (send scope email, get approval, watch build trigger)
6. **Iterate** (collect feedback, refine Claude prompt, improve UX)

---

## Victory Conditions

✅ **Workflow Complete When**:
- Anion moves from "Awaiting_approval" → "Active" in Unalabs UI
- PR auto-created with project scaffold
- Uby receives confirmation email with PR link
- David Jumbo project can reuse identical workflow
- No manual scaffold work required for future clients

This is the foundation for Unalabs as a **delivery platform**, not just an intake form.
