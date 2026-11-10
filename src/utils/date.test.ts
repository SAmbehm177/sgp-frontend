import { describe, expect, it } from 'vitest';
import { getLocalDateString, isBeforeLocalToday } from './date';

describe('local project date handling', () => {
  it('formats the local calendar date without converting through UTC', () => {
    expect(getLocalDateString(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('rejects dates before today but allows today and future dates', () => {
    const today = new Date(2026, 10, 10);

    expect(isBeforeLocalToday('2026-11-09', today)).toBe(true);
    expect(isBeforeLocalToday('2026-11-10', today)).toBe(false);
    expect(isBeforeLocalToday('2026-11-11', today)).toBe(false);
  });
});
