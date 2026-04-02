export const SIGNAL_WORKFLOW_STATUSES = [
  'new_signal',
  'heading_there',
  'handled',
  'not_legit_or_not_serviceable',
] as const;

export type SignalWorkflowStatus = (typeof SIGNAL_WORKFLOW_STATUSES)[number];

export function normalizeSignalWorkflowStatus(value: string | null | undefined): SignalWorkflowStatus {
  if (value === 'heading_there') return 'heading_there';
  if (value === 'handled') return 'handled';
  if (value === 'not_legit_or_not_serviceable') return 'not_legit_or_not_serviceable';
  return 'new_signal';
}

export function isResolvedSignalWorkflowStatus(status: SignalWorkflowStatus) {
  return status === 'handled' || status === 'not_legit_or_not_serviceable';
}

export function isOpenSignalWorkflowStatus(status: SignalWorkflowStatus) {
  return status === 'new_signal' || status === 'heading_there';
}
