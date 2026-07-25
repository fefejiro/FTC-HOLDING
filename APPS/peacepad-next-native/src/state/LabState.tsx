import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type LabGoal = "calm-next-message" | "log-parenting-time" | "organize-records";

export type CaseBinder = {
  id: string;
  name: string;
  childLabel: string;
  supportContact?: string;
  sourceTypes: string[];
};

export type OriginalFilePlaceholder = {
  fileName: string;
  mediaType: string;
  sizeLabel: string;
  storageState: "placeholder-only";
};

export type EvidenceReviewStatus = "draft" | "confirmed";

export type EvidenceRecord = {
  id: string;
  binderId: string;
  title: string;
  category: string;
  eventDate: string;
  source: string;
  description: string;
  originalFile: OriginalFilePlaceholder;
  reviewStatus: EvidenceReviewStatus;
};

export type LabTimelineEntry = {
  id: string;
  evidenceId: string;
  eventDate: string;
  title: string;
  description: string;
  sourceLabel: string;
};

export type ExportSelection = {
  evidenceIds: string[];
  timelineEntryIds: string[];
};

export type LabState = {
  selectedGoal: LabGoal;
  binder?: CaseBinder;
  evidence?: EvidenceRecord;
  timelineEntry?: LabTimelineEntry;
  exportSelection: ExportSelection;
};

type LabStateContextValue = LabState & {
  selectGoal: (goal: LabGoal) => void;
  saveBinder: (binder: CaseBinder) => void;
  saveEvidence: (evidence: EvidenceRecord) => void;
  confirmEvidence: () => void;
  setEvidenceSelectedForExport: (selected: boolean) => void;
  setTimelineSelectedForExport: (selected: boolean) => void;
};

export const syntheticFilePlaceholder: OriginalFilePlaceholder = {
  fileName: "weekly-child-call-placeholder.png",
  mediaType: "image/png",
  sizeLabel: "Synthetic placeholder - no file stored",
  storageState: "placeholder-only"
};

export const initialLabState: LabState = {
  selectedGoal: "calm-next-message",
  exportSelection: {
    evidenceIds: [],
    timelineEntryIds: []
  }
};

const LabStateContext = createContext<LabStateContextValue | undefined>(undefined);

export function LabStateProvider({ children, initialState = initialLabState }: { children: ReactNode; initialState?: LabState }) {
  const [state, setState] = useState<LabState>(initialState);

  const value = useMemo<LabStateContextValue>(
    () => ({
      ...state,
      selectGoal: (selectedGoal) => setState((current) => ({ ...current, selectedGoal })),
      saveBinder: (binder) => setState((current) => ({ ...current, binder })),
      saveEvidence: (evidence) => setState((current) => ({ ...current, evidence })),
      confirmEvidence: () =>
        setState((current) => {
          if (!current.evidence) return current;
          const evidence = { ...current.evidence, reviewStatus: "confirmed" as const };
          const timelineEntry: LabTimelineEntry = {
            id: `timeline-${evidence.id}`,
            evidenceId: evidence.id,
            eventDate: evidence.eventDate,
            title: evidence.title,
            description: evidence.description,
            sourceLabel: evidence.source
          };
          return { ...current, evidence, timelineEntry };
        }),
      setEvidenceSelectedForExport: (selected) =>
        setState((current) => {
          if (!current.evidence) return current;
          return {
            ...current,
            exportSelection: {
              ...current.exportSelection,
              evidenceIds: selected ? [current.evidence.id] : []
            }
          };
        }),
      setTimelineSelectedForExport: (selected) =>
        setState((current) => {
          if (!current.timelineEntry) return current;
          return {
            ...current,
            exportSelection: {
              ...current.exportSelection,
              timelineEntryIds: selected ? [current.timelineEntry.id] : []
            }
          };
        })
    }),
    [state]
  );

  return <LabStateContext.Provider value={value}>{children}</LabStateContext.Provider>;
}

export function useLabState(): LabStateContextValue {
  const value = useContext(LabStateContext);
  if (!value) throw new Error("useLabState must be used inside LabStateProvider");
  return value;
}
