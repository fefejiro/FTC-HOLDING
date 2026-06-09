# Anion Phase 1 Password Evidence

- Base URL: https://anion.unalabs.cloud
- Booking ID: 63404ecd-6b16-4466-bb15-745208cab970
- Generated: 2026-06-09T18:45:48.740Z

| Role | Check | Status | Detail |
| --- | --- | --- | --- |
| parent | dashboard loads authenticated | PASS | https://anion.unalabs.cloud/parent |
| parent | surface text Parent Dashboard | PASS | /parent |
| parent | surface text Linked Students | PASS | /parent |
| tutor | dashboard loads authenticated | PASS | https://anion.unalabs.cloud/tutor |
| tutor | surface text Tutor Dashboard | PASS | /tutor |
| tutor | surface text Teacher Writing Board | PASS | /tutor |
| student | dashboard loads authenticated | PASS | https://anion.unalabs.cloud/student |
| student | surface text Student Dashboard | PASS | /student |
| student | surface text Learning Feed | PASS | /student |
| parent | lesson route denied or not classroom | PASS | https://anion.unalabs.cloud/parent |
| parent | daily token denied | PASS | HTTP 403, code=LESSON_ACCESS_DENIED |
| tutor | daily token API grants assigned role | PASS | HTTP 200, room=anion-63404ecd-6b16-4466-bb15-745208cab970, tokenPresent=true, code= |
| tutor | lesson context renders | PASS | https://anion.unalabs.cloud/lesson/63404ecd-6b16-4466-bb15-745208cab970 |
| tutor | daily iframe connected | FAIL | not connected within evidence window |
| student | daily token API grants assigned role | PASS | HTTP 200, room=anion-63404ecd-6b16-4466-bb15-745208cab970, tokenPresent=true, code= |
| student | lesson context renders | PASS | https://anion.unalabs.cloud/lesson/63404ecd-6b16-4466-bb15-745208cab970 |
| student | daily iframe connected | FAIL | not connected within evidence window |

## Daily Call UI Network Logs

```json
{
  "tutor": [],
  "student": []
}
```

## Screenshots

- ops\evidence\phase1-password-evidence-2026-06-09T1835Z\parent-dashboard.png
- ops\evidence\phase1-password-evidence-2026-06-09T1835Z\tutor-dashboard.png
- ops\evidence\phase1-password-evidence-2026-06-09T1835Z\student-dashboard.png
- ops\evidence\phase1-password-evidence-2026-06-09T1835Z\parent-lesson-denied.png
- ops\evidence\phase1-password-evidence-2026-06-09T1835Z\tutor-lesson.png
- ops\evidence\phase1-password-evidence-2026-06-09T1835Z\student-lesson.png
