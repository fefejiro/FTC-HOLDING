/**
 * Unit layer
 *
 * Pure-function tests. No network, no fs, no platform calls.
 * Replace samples with real client/server unit tests as code stabilizes.
 */
import { describe, it, expect } from 'vitest';

// Sample target: confidence-bucket classifier (mirrors server logic).
function confidenceBucket(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score == null || isNaN(score)) return 'none';
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

describe('confidenceBucket', () => {
  it('returns none for 0/NaN', () => {
    expect(confidenceBucket(0)).toBe('none');
    expect(confidenceBucket(NaN)).toBe('none');
  });
  it('classifies thresholds', () => {
    expect(confidenceBucket(95)).toBe('high');
    expect(confidenceBucket(80)).toBe('high');
    expect(confidenceBucket(79)).toBe('medium');
    expect(confidenceBucket(50)).toBe('medium');
    expect(confidenceBucket(49)).toBe('low');
    expect(confidenceBucket(1)).toBe('low');
  });
});
