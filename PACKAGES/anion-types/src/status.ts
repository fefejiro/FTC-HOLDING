export type StatusMetricRecord = {
  label: string;
  value: string;
  detail: string;
  status: 'green' | 'yellow' | 'red';
};

export type StatusCheckRecord = {
  name: string;
  status: 'green' | 'yellow' | 'red';
  detail: string;
};

export type StatusConnectionRecord = {
  name: string;
  status: 'green' | 'yellow' | 'red';
  url: string;
  detail: string;
};

export type AnionStatusSummary = {
  project: string;
  name: string;
  updatedAt: string;
  overall: 'green' | 'yellow' | 'red';
  stage: string;
  summary: string;
  metrics: StatusMetricRecord[];
  checks: StatusCheckRecord[];
  connections: StatusConnectionRecord[];
  logs: {
    weeklyStatus: string;
    releaseLog: string;
    testEvidence: string;
  };
  nextActions: string[];
};