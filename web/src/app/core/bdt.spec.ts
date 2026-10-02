import { describe, expect, it } from 'vitest';
import { formatBDT } from './bdt';

describe('formatBDT', () => {
  it('uses en-IN-style grouping common in BD', () => {
    expect(formatBDT(120000)).toBe('৳1,20,000');
    expect(formatBDT(34800)).toBe('৳34,800');
    expect(formatBDT(80)).toBe('৳80');
  });
});
