import type { AnionStatusSummary } from '@ftc/anion-types';

export function getPendingStatusSummary(): AnionStatusSummary {
  return {
    project: 'anion',
    name: 'Anion Class App',
    updatedAt: new Date().toISOString(),
    overall: 'yellow',
    stage: 'foundation',
    summary: 'Foundation scaffold exists. Product implementation remains pending.',
    metrics: [],
    checks: [],
    connections: [],
    logs: {
      weeklyStatus: 'APPS/anion/ops/weekly-status.md',
      releaseLog: 'APPS/anion/ops/release-log.md',
      testEvidence: 'DOCS/ANION/status/TEST_EVIDENCE.md',
    },
    nextActions: ['Implement auth', 'Implement tutor discovery', 'Implement booking flow'],
  };
}