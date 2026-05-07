import { describe, expect, it } from 'vitest';

type TimedLine = {
  startMs: number;
  endMs: number;
};

function resolveActiveLineIndex(lines: TimedLine[], positionMs: number): number {
  if (lines.length === 0) {
    return 0;
  }

  const exact = lines.findIndex((line) => line.startMs <= positionMs && positionMs < line.endMs);
  if (exact >= 0) {
    return exact;
  }

  const nearestPast = lines.reduce((best, line, index) => {
    if (line.startMs <= positionMs) {
      return index;
    }
    return best;
  }, -1);

  return nearestPast >= 0 ? nearestPast : 0;
}

describe('resolveActiveLineIndex', () => {
  const lines: TimedLine[] = [
    { startMs: 0, endMs: 5000 },
    { startMs: 5000, endMs: 10000 },
    { startMs: 10000, endMs: 15000 },
    { startMs: 15000, endMs: 20000 },
  ];

  it('returns exact line when inside a timing window', () => {
    expect(resolveActiveLineIndex(lines, 12500)).toBe(2);
  });

  it('uses nearest previous line when between sparse windows', () => {
    const sparse: TimedLine[] = [
      { startMs: 0, endMs: 5000 },
      { startMs: 9000, endMs: 12000 },
      { startMs: 17000, endMs: 21000 },
    ];

    expect(resolveActiveLineIndex(sparse, 8000)).toBe(0);
    expect(resolveActiveLineIndex(sparse, 15000)).toBe(1);
  });

  it('uses nearest previous line when beyond final lyric line', () => {
    expect(resolveActiveLineIndex(lines, 22000)).toBe(3);
  });

  it('falls back to zero when before the first line', () => {
    expect(resolveActiveLineIndex(lines, -50)).toBe(0);
  });
});
