type RequestLike = {
  notes?: string | null;
};

export function normalizeRequestNotes(notes: string | null | undefined) {
  const trimmed = String(notes || '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function serializeRequest<T extends RequestLike>(request: T) {
  return {
    ...request,
    notes: normalizeRequestNotes(request.notes),
  };
}
