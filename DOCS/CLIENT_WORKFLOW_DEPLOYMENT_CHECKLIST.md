# Client Workflow — Deployment Checklist & Validation

> Status: canonical deployment runbook.
>
> Use this file for deployment and validation steps.
> Pair it with `CLIENT_WORKFLOW_ARCHITECTURE.md` for design context.

**Status**: Ready for Deployment  
**Date**: 2026-04-23  
**Target**: Anion Project (Pilot)

---

## Pre-Deployment Validation

### Code Quality
- [ ] All TypeScript files compile without errors
  ```bash
  npx tsc --noEmit APPS/una-labs-site/lib/client-scope-generator.ts
  npx tsc --noEmit APPS/una-labs-site/components/project-scope-review.tsx
  ```

- [ ] Edge functions have valid syntax
  ```bash
  deno fmt supabase/functions/generate-project-scope/index.ts
  deno fmt supabase/functions/approve-project-scope/index.ts
  ```

### Files Checklist
- [ ] `supabase/migrations/202604230002_client_workflow_artifacts.sql` exists
- [ ] `supabase/functions/generate-project-scope/index.ts` exists
- [ ] `supabase/functions/approve-project-scope/index.ts` exists
- [ ] `APPS/una-labs-site/lib/client-scope-generator.ts` exists
- [ ] `APPS/una-labs-site/components/project-scope-review.tsx` exists
- [ ] `.github/workflows/client-project-build-trigger.yml` exists
- [ ] `.github/skills/ftc-client-workflow/SKILL.md` exists
- [ ] `DOCS/CLIENT_WORKFLOW_ARCHITECTURE.md` exists
- [ ] `DOCS/CLIENT_WORKFLOW_IMPLEMENTATION_GUIDE.md` exists

---

## Deployment Steps (Order Matters)

### Phase 1: Database & Secrets (5 min)

#### 1.1 Deploy Supabase Migration
```bash
cd "C:\FTC HOLDING"
supabase db push
```

**Verify**:
```bash
# Check tables exist
supabase db tables list | grep project_artifacts
supabase db tables list | grep project_approvals
supabase db tables list | grep project_artifacts_changelog
```

**Expected output**:
```
project_artifacts
project_approvals
project_artifacts_changelog
```

#### 1.2 Set Supabase Environment Secrets
Go to Supabase dashboard → Project settings → Secrets → Add:

```
Name: ANTHROPIC_API_KEY
Value: sk-ant-[your-anthropic-api-key]
```

```
Name: RESEND_API_KEY
Value: re_[your-resend-api-key]
```

```
Name: GITHUB_TOKEN
Value: ghp_[your-github-personal-access-token]
```

**Verify**:
```bash
supabase secrets list
# Should show all 3 secrets
```

---

### Phase 2: Edge Functions (10 min)

#### 2.1 Deploy generate-project-scope Function
```bash
supabase functions deploy generate-project-scope
```

**Verify**:
```bash
supabase functions list
# Should show: generate-project-scope    deployed
```

#### 2.2 Deploy approve-project-scope Function
```bash
supabase functions deploy approve-project-scope
```

**Verify**:
```bash
supabase functions list
# Should show: approve-project-scope    deployed
```

#### 2.3 Test generate-project-scope Function
```bash
SUPABASE_URL="https://[project-id].supabase.co"
SUPABASE_KEY="[your-anon-key]"

curl -X POST "$SUPABASE_URL/functions/v1/generate-project-scope" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -d '{
    "projectId": "test-123",
    "email": "test@example.com",
    "projectName": "Test Project",
    "planType": "professional",
    "description": "Test project scope generation"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "artifactId": "uuid-...",
  "scope": {
    "phases": [...],
    "tech_stack": {...},
    "effort_estimates": {...},
    ...
  }
}
```

---

### Phase 3: Unalabs Frontend (10 min)

#### 3.1 Add Scope Review Route
Create file: `APPS/una-labs-site/app/dashboard/[projectId]/scope/page.tsx`

```typescript
import ProjectScopeReview from '@/components/project-scope-review';

export default function ScopePage() {
  return <ProjectScopeReview />;
}
```

#### 3.2 Add Scope Link to Dashboard Navigation
In `APPS/una-labs-site/components/dashboard-nav.tsx` (or similar), add link:

```typescript
<a href={`/dashboard/${projectId}/scope`}>
  📋 Scope Review
</a>
```

#### 3.3 Build & Test Unalabs Locally
```bash
cd APPS/una-labs-site
npm run dev
# Navigate to http://localhost:3000/dashboard/test-123/scope
```

**Verify**: Scope review component loads without errors

---

### Phase 4: GitHub Actions Secret (5 min)

#### 4.1 Add GitHub Token
Go to GitHub Repo → Settings → Secrets and variables → Actions → New repository secret:

```
Name: GITHUB_TOKEN
Value: ghp_[your-token-with-repo-dispatch-permission]
```

#### 4.2 Test Workflow Trigger
```bash
# Manually trigger test dispatch
gh workflow run client-project-build-trigger.yml \
  -f project_name=test-project \
  -f client_email=test@example.com \
  -f project_id=test-123
```

Or test via direct GitHub API:
```bash
curl -X POST \
  https://api.github.com/repos/fefejiro/FTC-HOLDING/dispatches \
  -H "Authorization: token ghp_[your-token]" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "event_type": "client_approved_scope",
    "client_payload": {
      "project_id": "test-123",
      "project_name": "test-project",
      "client_email": "test@example.com",
      "timestamp": "2026-04-23T00:00:00Z"
    }
  }'
```

**Verify**: Check GitHub Actions → client-project-build-trigger → see test run

---

### Phase 5: Anion Integration (15 min)

#### 5.1 Get Anion Project ID
```bash
# Query Supabase
supabase db query 'SELECT id, project_name, email FROM projects WHERE project_name = "Anion Class App"'
```

**Expected output**:
```
id                                    | project_name      | email
[anion-uuid-12345...]                 | Anion Class App   | uby400@gmail.com
```

Copy the `id` value → Use as `ANION_PROJECT_ID`

#### 5.2 Trigger Initial Scope Generation for Anion
```bash
SUPABASE_URL="https://[project-id].supabase.co"
SUPABASE_KEY="[your-anon-key]"
ANION_PROJECT_ID="[uuid-from-step-5.1]"

curl -X POST "$SUPABASE_URL/functions/v1/generate-project-scope" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -d "{
    \"projectId\": \"$ANION_PROJECT_ID\",
    \"email\": \"uby400@gmail.com\",
    \"projectName\": \"Anion Class App\",
    \"planType\": \"professional\",
    \"description\": \"Premium online tutoring platform with real-time lesson rooms and marketplace for professional tutors. Features include video call integration, interactive whiteboard, assignment tracking, and integrated payment processing.\"
  }"
```

**Verify**: 
- Response contains `artifactId`
- Check Supabase: `SELECT * FROM project_artifacts WHERE project_id = '[ANION_PROJECT_ID]'` should return 1 record
- Check email: Uby should receive scope email within 60 seconds

---

## End-to-End Test: Anion Approval Flow (30 min)

### 6.1 Uby Reviews Scope (Simulated)
1. Open email: "Your Anion Scope is Ready for Review"
2. Click link or navigate to: `https://unalabs.cloud/dashboard/[ANION_PROJECT_ID]/scope`
3. Review tabs: Overview (12 weeks, $50k), Phases, Timeline, Risks, Mockups
4. Scroll to bottom, verify feedback textarea and approval button visible

### 6.2 Uby Approves Scope
1. (Optional) Add feedback: "Looks good, let's start!"
2. Click "✓ Approve & Move to Active"
3. Watch for success message: "Scope approved! Building is now starting."

**Verify**:
- Page shows green success banner
- Button becomes disabled/loading

### 6.3 Approval Triggers Build
Check these in parallel:

**Supabase**:
```bash
supabase db query 'SELECT workflow_status, approved_at FROM projects WHERE id = "[ANION_PROJECT_ID]"'
# Should show: workflow_status = 'active', approved_at = current timestamp

supabase db query 'SELECT * FROM project_approvals WHERE project_id = "[ANION_PROJECT_ID]" AND approval_type = "scope_approval"'
# Should show 1 record with status = 'approved'
```

**GitHub Actions**:
```bash
gh workflow run client-project-build-trigger.yml
# Wait 30 seconds, then:
gh workflow list
# Should show recent run of 'Client Project Build Trigger'
```

**GitHub Branch**:
```bash
git branch -r | grep feat/anion
# Should show: origin/feat/anion-phase-1-scaffold
```

**GitHub PR**:
```bash
gh pr list --repo fefejiro/FTC-HOLDING
# Should show new PR: "feat(anion): Initial project scaffold"
```

**Folder Structure**:
```bash
ls -la APPS/anion/
# Should show:
# - apps/
#   - web/
#   - mobile/
# - packages/
# - DOCS/
# - README.md
# - package.json
```

**Email**:
- Uby receives: "Anion is Now Active — Building Started!"
- Email contains PR link and dashboard link

### 6.4 Verification Checklist
- [ ] Project status moved to "active" in Supabase
- [ ] Approval recorded in `project_approvals` table
- [ ] GitHub Actions workflow ran successfully
- [ ] Feature branch `feat/anion-phase-1-scaffold` created
- [ ] PR auto-created with scaffold details
- [ ] `APPS/anion/` folder scaffolded with web, mobile, packages, docs
- [ ] Uby received scope generation email
- [ ] Uby received approval confirmation email with PR link
- [ ] Unalabs dashboard shows build status
- [ ] No errors in function logs: `supabase functions logs generate-project-scope`
- [ ] No errors in function logs: `supabase functions logs approve-project-scope`

---

## Troubleshooting During Deployment

### Issue: Supabase migration fails
**Solution**:
```bash
# Check migration status
supabase db list-migrations

# Try manual SQL
psql [connection-string] -f supabase/migrations/202604230002_client_workflow_artifacts.sql

# Check errors in Supabase dashboard → SQL Editor
```

### Issue: Edge function deploy fails
**Solution**:
```bash
# Check syntax
deno check supabase/functions/generate-project-scope/index.ts

# Review logs
supabase functions logs generate-project-scope --limit 50

# Try redeploy
supabase functions delete generate-project-scope
supabase functions deploy generate-project-scope
```

### Issue: Scope generation returns error
**Solution**:
```bash
# Check Anthropic API key
echo $ANTHROPIC_API_KEY | head -20

# Test Claude API directly
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 100, "messages": [{"role": "user", "content": "test"}]}'

# Check function logs for quota/auth errors
supabase functions logs generate-project-scope
```

### Issue: GitHub Actions workflow not triggered
**Solution**:
```bash
# Verify GitHub token is valid and has repo:dispatch permission
gh auth status

# Manually trigger test workflow
gh workflow dispatch client-project-build-trigger.yml

# Check workflow logs
gh workflow list
gh run list -w client-project-build-trigger.yml
```

### Issue: Email not received
**Solution**:
```bash
# Check Resend API key
echo $RESEND_API_KEY | head -20

# Test Resend API directly
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -d '{
    "from": "test@example.com",
    "to": "uby400@gmail.com",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'

# Check Resend dashboard for delivery status
```

---

## Post-Deployment Validation

Once Anion approval flow completes successfully:

- [ ] Create PRs for scope review UI route additions
- [ ] Deploy Unalabs changes to production
- [ ] Get Uby to test approval flow end-to-end
- [ ] Collect feedback and iterate
- [ ] Document any customizations needed for David Jumbo project
- [ ] Plan Phase 1 app development (auth, booking, lesson room)
- [ ] Set up weekly status sync for Anion project

---

## Success Criteria

✅ **Workflow is complete when ALL of these are true**:

1. Anion moves from "Awaiting_approval" to "Active" in Unalabs projects table
2. Approval is recorded with client email and timestamp
3. GitHub Actions workflow completes successfully (no errors)
4. Feature branch and PR are created automatically
5. Uby receives at least 2 emails: scope + confirmation
6. `APPS/anion/` folder exists with full scaffolding
7. No manual intervention needed between approval and PR creation
8. David Jumbo project can follow identical workflow (zero new setup)

---

## Rollback Plan

If deployment goes wrong:

### Option 1: Database Rollback
```bash
# List migrations
supabase db list-migrations

# Revert migration
supabase db reset
# Re-apply migrations excluding the new one
```

### Option 2: Function Rollback
```bash
# Delete edge functions
supabase functions delete generate-project-scope
supabase functions delete approve-project-scope

# Git reset to previous version
git reset --hard origin/main
```

### Option 3: GitHub Actions Rollback
```bash
# Disable workflow
gh workflow disable client-project-build-trigger.yml

# Or delete
gh workflow delete client-project-build-trigger.yml
```

---

## Next: Phase 1 App Development

Once workflow is validated:

1. Scaffold has been created in `APPS/anion/`
2. FTC team begins Phase 1 implementation
3. Weekly status syncs to `APPS/anion/ops/status-summary.json`
4. Unalabs delivery dashboard auto-updates with progress
5. Uby receives weekly status emails

See: `DOCS/CLIENT_WORKFLOW_IMPLEMENTATION_GUIDE.md` → "Post-Implementation: Anion Phase 1 Build"

---

## Support

For questions during deployment:
- Check edge function logs: `supabase functions logs [function-name]`
- Check Supabase SQL error logs in dashboard
- Review GitHub Actions workflow logs
- Consult: `DOCS/CLIENT_WORKFLOW_ARCHITECTURE.md` for design decisions
- Consult: `.github/skills/ftc-client-workflow/SKILL.md` for troubleshooting

---

**Last Updated**: 2026-04-23  
**Status**: Ready for Deployment ✅
