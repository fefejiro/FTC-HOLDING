import type { ConnectorCapability, ConnectorStatus } from "./product_domain.js";

export interface SchedulerConnectorStatusSurface {
  connectorStatus: ConnectorStatus;
  schedulerEligible: boolean;
  schedulerGate: `connector_${ConnectorStatus}`;
}

export interface ConnectorStatusSurface {
  source: ConnectorCapability["source"];
  status: ConnectorStatus;
  accountIdentifier: string | null;
  discovery: boolean;
  packageGeneration: boolean;
  assistedSubmission: boolean;
  controlledSubmission: boolean;
  proofReconciliation: boolean;
  certificationEvidenceRecorded: boolean;
  certificationExpiresAt: string | null;
  schedulerEligible: boolean;
}

export function schedulerConnectorStatusSurface(
  status: ConnectorStatus
): SchedulerConnectorStatusSurface {
  return {
    connectorStatus: status,
    schedulerEligible: status === "certified_live" || status === "pilot_only",
    schedulerGate: `connector_${status}`
  };
}

export function connectorStatusSurface(
  connector: ConnectorCapability
): ConnectorStatusSurface {
  return {
    source: connector.source,
    status: connector.status,
    accountIdentifier: connector.accountIdentifier || null,
    discovery: connector.discovery,
    packageGeneration: connector.packageGeneration,
    assistedSubmission: connector.assistedSubmission,
    controlledSubmission: connector.controlledSubmission,
    proofReconciliation: connector.proofReconciliation,
    certificationEvidenceRecorded: Boolean(connector.evidenceReference),
    certificationExpiresAt: connector.expiresAt || null,
    schedulerEligible: schedulerConnectorStatusSurface(connector.status).schedulerEligible
  };
}
