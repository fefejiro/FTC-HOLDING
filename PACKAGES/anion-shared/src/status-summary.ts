import type { AnionStatusSummary } from '@ftc/anion-types';

export const anionStatusSeed: AnionStatusSummary = {
  project: 'anion',
  name: 'Anion Class App',
  updatedAt: '2026-04-23T00:00:00.000Z',
  overall: 'yellow',
  stage: 'foundation',
  summary: 'Foundation scaffold exists and awaits feature implementation.',
  metrics: [],
  checks: [],
  connections: [],
  logs: {
    weeklyStatus: 'APPS/anion/ops/weekly-status.md',
    releaseLog: 'APPS/anion/ops/release-log.md',
    testEvidence: 'DOCS/ANION/status/TEST_EVIDENCE.md',
  },
  nextActions: ['Implement auth', 'Implement bookings', 'Implement live lessons'],
};