export type EvidenceDraft = {
  title: string;
  category: string;
  eventDate: string;
  source: string;
  description: string;
  originalFileName: string;
};

export type EvidenceValidationErrors = Partial<Record<keyof EvidenceDraft, string>>;

const isoLikeDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateEvidenceDraft(draft: EvidenceDraft): EvidenceValidationErrors {
  const errors: EvidenceValidationErrors = {};
  const title = draft.title.trim();
  const category = draft.category.trim();
  const eventDate = draft.eventDate.trim();
  const source = draft.source.trim();
  const description = draft.description.trim();
  const originalFileName = draft.originalFileName.trim();

  if (title.length < 4) {
    errors.title = "Add a practical title so this source is recognizable later.";
  }

  if (!category) {
    errors.category = "Choose an evidence category.";
  }

  if (!isoLikeDatePattern.test(eventDate)) {
    errors.eventDate = "Use YYYY-MM-DD so timeline ordering stays reliable.";
  }

  if (source.length < 4) {
    errors.source = "Describe where this synthetic record came from.";
  }

  if (description.length < 8) {
    errors.description = "Add a short factual description.";
  }

  if (!originalFileName) {
    errors.originalFileName = "Keep placeholder metadata for the original file.";
  }

  return errors;
}

export function hasEvidenceValidationErrors(errors: EvidenceValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
