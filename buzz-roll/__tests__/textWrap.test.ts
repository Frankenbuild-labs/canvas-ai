import { describe, it, expect } from 'vitest';
import { computeWrappedLines } from '../utils/textWrap';

// Simple monospace-like width estimator: width = chars * 10
const measure = (t: string) => t.length * 10;

describe('computeWrappedLines', () => {
  it('returns empty result for blank text', () => {
    const res = computeWrappedLines('', 100, measure, 32);
    expect(res.lines).toEqual([]);
    expect(res.totalHeight).toBe(0);
  });

  it('wraps text when line would exceed maxWidth', () => {
    const text = 'hello world from buzz roll feature';
    const res = computeWrappedLines(text, 60, measure, 32); // 6 chars * 10 = 60 threshold
    // Expect splitting into multiple lines
    expect(res.lines.length).toBeGreaterThan(1);
    res.lines.forEach(line => {
      expect(measure(line)).toBeLessThanOrEqual(60 + 50); // allow slight over due to word boundary
    });
  });

  it('keeps single line when under threshold', () => {
    const text = 'short line';
    const res = computeWrappedLines(text, 200, measure, 32);
    expect(res.lines.length).toBe(1);
    expect(res.lines[0]).toBe('short line');
  });
});
