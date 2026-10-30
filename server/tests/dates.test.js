import { describe, expect, it } from 'vitest';
import { addDays, compareDates, datesBetween, partsInTz } from '../src/lib/dates.js';

describe('date helpers', () => {
  it('adds days across month and year', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-29', -1)).toBe('2026-10-28');
  });

  it('lists inclusive ranges', () => {
    expect(datesBetween('2026-01-30', '2026-02-01')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
    ]);
  });

  it('compares iso dates', () => {
    expect(compareDates('2026-10-01', '2026-10-02')).toBe(-1);
    expect(compareDates('2026-10-02', '2026-10-02')).toBe(0);
  });

  it('reads the wall clock of a ritual day in Dhaka', () => {
    const morning = new Date('2026-10-29T03:00:00.000Z');
    expect(partsInTz(morning, 'Asia/Dhaka')).toMatchObject({ date: '2026-10-29', hour: 9 });
    const lateNight = new Date('2026-10-29T19:30:00.000Z');
    expect(partsInTz(lateNight, 'Asia/Dhaka')).toMatchObject({ date: '2026-10-30', hour: 1 });
  });
});
