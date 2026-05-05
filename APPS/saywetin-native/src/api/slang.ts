const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export type SlangExplanation = {
  phrase: string;
  literal: string;
  cultural: string;
  region: string;
  examples: string[];
  related: string[];
  confidence: number;
};

export async function explainSlang(phrase: string): Promise<SlangExplanation> {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is missing');
  }

  const trimmed = phrase.trim();
  if (trimmed.length < 2) {
    throw new Error('Type at least 2 characters.');
  }

  const response = await fetch(`${apiBaseUrl}/v1/slang/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase: trimmed }),
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Slang decoder returned non-JSON response');
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Could not decode that phrase');
  }

  return {
    phrase: String(payload.phrase || trimmed),
    literal: String(payload.literal || ''),
    cultural: String(payload.cultural || ''),
    region: String(payload.region || 'Nigeria'),
    examples: Array.isArray(payload.examples) ? payload.examples.map(String) : [],
    related: Array.isArray(payload.related) ? payload.related.map(String) : [],
    confidence: Number(payload.confidence) || 0,
  };
}
