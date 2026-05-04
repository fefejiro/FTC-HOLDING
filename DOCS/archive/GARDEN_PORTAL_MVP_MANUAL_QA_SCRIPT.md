# Garden Cleaners Portal MVP Manual QA Script

## 1. Preconditions
- Latest migration applied (`202604290001_garden_cleaners_portal_mvp.sql`)
- Test/QA user profiles seeded (admin, staff, customer)
- QA accounts and credentials available
- Garden Cleaners portal deployed and accessible at the expected URL

---

## 2. Manual Test Steps

### 2.1 Submit Quote
- Go to the public Garden Cleaners portal
- Fill out and submit a new quote request
- **Expected:** Confirmation message, quote appears in admin queue

### 2.2 Login as Admin
- Go to portal login page
- Sign in with admin credentials
- **Expected:** Admin dashboard loads, shows quote and job queue, convert/assign controls visible

### 2.3 Convert Quote to Job
- In admin dashboard, locate the new quote
- Click 'Convert to Job'
- **Expected:** Quote disappears from quote list, new job appears in job queue

### 2.4 Assign Staff
- In admin dashboard, find the new job
- Enter staff profile ID and assign staff
- **Expected:** Job status updates to 'assigned', staff assignment visible

### 2.5 Login as Staff
- Sign out admin, sign in with staff credentials
- **Expected:** Staff dashboard loads, assigned job is visible, admin controls are NOT visible

### 2.6 See Assigned Job
- In staff dashboard, locate assigned job
- **Expected:** Job details visible, status update controls available

### 2.7 Update Status
- Use status update controls to mark job 'in progress' and then 'completed'
- **Expected:** Status updates reflected in UI, no errors

### 2.8 Login as Customer
- Sign out staff, sign in with customer credentials
- **Expected:** Customer dashboard loads, only their own request/job status is visible, no admin/staff controls

### 2.9 See Request/Job Status
- In customer dashboard, locate their request/job
- **Expected:** Status matches updates made by staff, details correct

---

## 3. Failure Capture Format
- Screenshot of failure
- URL where failure occurred
- User role (admin, staff, customer)
- Expected result
- Actual result

---

## 4. PASS/FAIL Checklist
- [ ] Quote submission works
- [ ] Admin sees quote/job queue and controls
- [ ] Admin can convert quote to job
- [ ] Admin can assign staff
- [ ] Staff sees only assigned jobs, no admin controls
- [ ] Staff can update job status
- [ ] Customer sees only their own job/status, no admin/staff controls
- [ ] Status updates propagate correctly

---

## 5. Note
- Playwright rerun is still required for full automation coverage when command output capture is available.
