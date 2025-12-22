import { CaptionStyle } from '../types';

export interface WrapResult {
  lines: string[];
  maxLineWidth: number;
  totalHeight: number;
  lineHeight: number;
}

/**
 * Computes wrapped lines for a caption given a measureText function and max width.
 * Pure logic (no canvas) to enable testing.
 */
export function computeWrappedLines(text: string, maxWidth: number, measure: (t: string) => number, fontSize: number): WrapResult {
  if (!text.trim()) return { lines: [], maxLineWidth: 0, totalHeight: 0, lineHeight: 0 };
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = current + ' ' + words[i];
    if (measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  const lineHeight = fontSize * 1.25;
  const widths = lines.map(l => measure(l));
  const maxLineWidth = widths.reduce((a, b) => Math.max(a, b), 0);
  const totalHeight = lines.length * lineHeight;
  return { lines, maxLineWidth, totalHeight, lineHeight };
}
