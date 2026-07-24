export type EvidenceDraft = {
  title: string;
  sourceType: string;
  eventDate: string;
  linkedEvent: string;
  privateNote: string;
};

export type EvidenceValidationErrors = Partial<Record<keyof EvidenceDraft, string>>;

const isoLikeDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateEvidenceDraft(draft: EvidenceDraft): EvidenceValidationErrors {
  const errors: EvidenceValidationErrors = {};
  const title = draft.title.trim();
  const sourceType = draft.sourceType.trim();
  const eventDate = draft.eventDate.trim();
  const linkedEvent = draft.linkedEvent.trim();
  const privateNote = draft.privateNote.trim();

  if (title.length < 4) {
    errors.title = "Add a practical title so this source is recognizable later.";
  }

  if (!sourceType) {
    errors.sourceType = "Choose the type of record being prepared.";
  }

  if (!isoLikeDatePattern.test(eventDate)) {
    errors.eventDate = "Use YYYY-MM-DD so timeline ordering stays reliable.";
  }

  if (linkedEvent.length < 4) {
    errors.linkedEvent = "Link this source to a parenting event, call, visit, or document topic.";
  }

  if (privateNote.length > 240) {
    errors.privateNote = "Keep lab notes short. Longer summaries belong in a reviewed detail screen.";
  }

  return errors;
}

export function hasEvidenceValidationErrors(errors: EvidenceValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
