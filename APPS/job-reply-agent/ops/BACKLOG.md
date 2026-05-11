# Job Reply Agent Backlog

## M0 Foundation

1. M0-01: Project scaffold and config loader.
2. M0-02: SQLite schema and repository layer.
3. M0-03: Runtime modes and kill switch.
4. M0-04: Red-flag policy engine.

## M1 Intake and Drafting

1. M1-01: Gmail OAuth and inbox label intake.
2. M1-02: Message dedupe and replay safety.
3. M1-03: Deterministic parser and confidence.
4. M1-04: Match scorer reuse from existing job pipeline.
5. M1-05: Resume selector from approved set.
6. M1-06: Draft creator + Gmail status labels.

## M2 Approval-Required Mode

1. M2-01: Approval queue service.
2. M2-02: Approval integrity gates (freshness, unchanged draft, attachment present).
3. M2-03: Send execution with daily caps.
4. M2-04: State transitions and audit logs.

## M3 Reporting and Operator UX

1. M3-01: End-of-day aggregation.
2. M3-02: Self-report Gmail email sender.
3. M3-03: Top opportunities and risk digest.
4. M3-04: Suggested tomorrow actions generator.
5. M3-05: Daily summary reliability and retries.

## M4 Reliability

1. M4-01: Task Scheduler runner and heartbeat.
2. M4-02: Failure digest and recovery notes.
3. M4-03: Optional localhost review dashboard.
