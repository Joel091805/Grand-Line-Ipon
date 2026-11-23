import { describe, expect, it } from 'vitest';
import {
  CALENDAR_2026,
  DATE_KEYS_2026,
  ISLANDS_2026,
  addDays,
  countDaysInclusive,
  dateRange,
  dayOfYear,
  getMonthDays,
  getMonthGrid,
  isValidDateKey,
} from '../utils/calendar2026';

describe('calendar2026', () => {
  it('generates all 365 unique days from 2026-01-01 to 2026-12-31', () => {
    expect(CALENDAR_2026).toHaveLength(365);
    expect(DATE_KEYS_2026[0]).toBe('2026-01-01');
    expect(DATE_KEYS_2026[364]).toBe('2026-12-31');
    expect(new Set(DATE_KEYS_2026).size).toBe(365);
    CALENDAR_2026.forEach((d, i) => expect(d.dayOfYear).toBe(i + 1));
  });

  it('has accurate weekday offsets (Jan 1 = Thursday) for every day', () => {
    expect(CALENDAR_2026[0].weekday).toBe(4);
    expect(CALENDAR_2026[0].weekdayName).toBe('Thu');
    expect(CALENDAR_2026[364].weekday).toBe(4);
    for (const d of CALENDAR_2026) {
      expect(d.weekday).toBe(new Date(Date.UTC(2026, d.month - 1, d.day)).getUTCDay());
    }
    expect(CALENDAR_2026[dayOfYear('2026-11-23') - 1].weekdayName).toBe('Mon');
  });

  it('is not a leap year', () => {
    expect(getMonthDays(2)).toHaveLength(28);
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2025-12-31')).toBe(false);
    expect(isValidDateKey('2026-04-31')).toBe(false);
  });

  it('maps 12 Grand Line islands with correct month metadata', () => {
    expect(ISLANDS_2026).toHaveLength(12);
    expect(ISLANDS_2026.reduce((s, i) => s + i.daysInMonth, 0)).toBe(365);
    expect(new Set(ISLANDS_2026.map((i) => i.name)).size).toBe(12);
    expect(ISLANDS_2026[11].name).toBe('Laugh Tale');
    for (const island of ISLANDS_2026) {
      const days = getMonthDays(island.month);
      expect(days[0].key).toBe(island.startKey);
      expect(days[days.length - 1].key).toBe(island.endKey);
      expect(days[0].weekday).toBe(island.firstWeekday);
      expect(island.personTarget).toBe(island.daysInMonth * 50);
    }
    expect(ISLANDS_2026[10]).toMatchObject({ monthAbbr: 'NOV', daysInMonth: 30, firstWeekday: 0 });
  });

  it('builds 7-column month grids with weekday-aligned padding', () => {
    const jan = getMonthGrid(1);
    expect(jan[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(jan[0][4]?.key).toBe('2026-01-01');
    jan.forEach((row) => expect(row).toHaveLength(7));
    expect(getMonthGrid(1, 1)[0][3]?.key).toBe('2026-01-01');
  });

  it('computes inclusive ranges and offsets', () => {
    expect(dayOfYear('2026-11-22')).toBe(326);
    expect(dayOfYear('2026-08-01')).toBe(213);
    expect(dateRange('2026-01-01', '2026-11-22')).toHaveLength(326);
    expect(countDaysInclusive('2026-01-01', '2026-08-01')).toBe(213);
    expect(countDaysInclusive('2026-05-01', '2026-04-01')).toBe(0);
    expect(addDays('2026-12-31', 1)).toBeNull();
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});
