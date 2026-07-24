export type BinderDraft = {
  binderName: string;
  childInitials: string;
  supportContact: string;
  selectedSourceTypes: string[];
};

export type BinderValidationErrors = Partial<Record<keyof BinderDraft, string>>;

export function validateBinderDraft(draft: BinderDraft): BinderValidationErrors {
  const errors: BinderValidationErrors = {};
  const binderName = draft.binderName.trim();
  const childInitials = draft.childInitials.trim();

  if (binderName.length < 3) {
    errors.binderName = "Add a practical binder name with at least 3 characters.";
  }

  if (!childInitials) {
    errors.childInitials = "Use initials or a short neutral label instead of a full child name.";
  } else if (childInitials.length > 12) {
    errors.childInitials = "Keep this short for privacy, such as initials or a neutral label.";
  }

  if (draft.selectedSourceTypes.length === 0) {
    errors.selectedSourceTypes = "Choose at least one source type to organize first.";
  }

  return errors;
}

export function hasBinderValidationErrors(errors: BinderValidationErrors) {
  return Object.keys(errors).length > 0;
}
