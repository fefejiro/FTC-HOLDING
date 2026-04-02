export const SIGNAL_WORKFLOW_STATUSES = [
  'new_signal',
  'heading_there',
  'handled',
  'not_legit_or_not_serviceable',
] as const;

export type SignalWorkflowStatus = (typeof SIGNAL_WORKFLOW_STATUSES)[number];

export const SIGNAL_WORKFLOW_LABELS: Record<SignalWorkflowStatus, string> = {
  new_signal: 'New signal',
  heading_there: 'Heading there',
  handled: 'Handled',
  not_legit_or_not_serviceable: 'Not legit / not serviceable',
};

export const SIGNAL_WORKFLOW_BADGES: Record<SignalWorkflowStatus, string> = {
  new_signal: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  heading_there: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
  handled: 'border-green-500/25 bg-green-500/10 text-green-300',
  not_legit_or_not_serviceable: 'border-slate-600 bg-slate-800/70 text-slate-300',
};

export function normalizeSignalWorkflowStatus(value: string | null | undefined): SignalWorkflowStatus {
  if (value === 'heading_there') return 'heading_there';
  if (value === 'handled') return 'handled';
  if (value === 'not_legit_or_not_serviceable') return 'not_legit_or_not_serviceable';
  return 'new_signal';
}

export function isResolvedSignalWorkflowStatus(status: SignalWorkflowStatus) {
  return status === 'handled' || status === 'not_legit_or_not_serviceable';
}
