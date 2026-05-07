# ATEAM Actionable Task Queue

This is the active execution surface for current ATEAM work.

Use `acceptance_tests.md` for detailed validation steps and `current_phase.md` for phase posture.

## Do Now

### Phase 1 Hardening Blockers
- [ ] Complete token verification hardening
- [ ] Complete RBAC enforcement hardening
- [ ] Finalize Supabase repository implementation for capability seams
- [ ] Close parity tests and run the 24-hour soak gate

### Acceptance Gaps (Open)
- [ ] Verify no TTS retry loop on quota exhaustion under manual quota simulation
- [ ] Verify speaker label edits persist after refresh
- [ ] Verify Chapters panel renders from event log after hard refresh
- [ ] Verify chapter click focuses timeline to chapter window
- [ ] Verify speaker analytics sort controls (Turns, Talk Time, Longest Gap)
- [ ] Verify gap and rapid-switch metrics move with wall-clock pacing
- [ ] Verify all-unmeasured sessions keep talk time at `00:00` with clear unmeasured label
- [ ] Verify mixed sessions show measured talk time and unmeasured count
- [ ] Verify label edits update analytics cards immediately without reload
- [ ] Verify analytics dedupe key remains stable across refresh when no new committed turns

## This Week

- [ ] Promote Speech Clarity extraction track after Phase 1 stability gate
- [ ] Convert manual acceptance checks into a repeatable smoke run for active lanes
- [ ] Record release evidence for completed acceptance checks in an ops-ready artifact

## Later

- [ ] Continue capability extraction tracks for Voice Synthesis, Event/Workflow, Context Bundling, and Agent Runtime after parity gates
- [ ] Reduce legacy compatibility paths once capability parity is proven