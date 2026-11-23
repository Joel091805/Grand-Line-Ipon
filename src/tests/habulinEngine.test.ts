import { describe, expect, it } from 'vitest';
import type { DaysMap } from '../types/ipon';
import { buildImportDays, createDefaultImportPlan } from '../utils/excelImporter';
import {
  buildFlatDayUpdates,
  computeArrears,
  getUnpaidDates,
  planSettle,
  settleOldest,
  settleOldestForBoth,
} from '../utils/habulinEngine';
import { dateRange } from '../utils/calendar2026';

const TODAY = '2026-11-23';
const imported = (): DaysMap => buildImportDays(createDefaultImportPlan(), {}, { ts: 1 });

describe('habulinEngine', () => {
  it('computes unpaid days prior to today independently per person', () => {
    const arrears = computeArrears(imported(), TODAY);
    expect(arrears.j.count).toBe(0);
    expect(arrears.m.count).toBe(113); // 2026-08-02 → 2026-11-22
    expect(arrears.m.amount).toBe(5650);
    expect(arrears.m.oldest).toBe('2026-08-02');
    expect(arrears.m.newest).toBe('2026-11-22');
    expect(arrears.combinedAmount).toBe(5650);
    expect(arrears.hasArrears).toBe(true);
  });

  it('never counts today itself as arrears', () => {
    expect(getUnpaidDates(imported(), 'j', TODAY)).not.toContain(TODAY);
    expect(getUnpaidDates({}, 'j', '2026-01-01')).toEqual([]);
    expect(getUnpaidDates({}, 'j', '2026-01-02')).toEqual(['2026-01-01']);
  });

  it('clamps to 2026 for dates outside the year', () => {
    expect(getUnpaidDates({}, 'm', '2025-12-15')).toEqual([]);
    expect(getUnpaidDates({}, 'm', '2027-01-05')).toHaveLength(365);
  });

  it('lets Min Claire catch up incrementally from 2026-08-02 (1 → 7 → all)', () => {
    let days = imported();

    const one = settleOldest(days, 'm', 1, TODAY, 2);
    expect(one.plan.dates).toEqual(['2026-08-02']);
    expect(one.plan.nextOldest).toBe('2026-08-03');
    days = one.days;

    const seven = settleOldest(days, 'm', 7, TODAY, 3);
    expect(seven.plan.dates).toEqual(dateRange('2026-08-03', '2026-08-09'));
    expect(seven.plan.amount).toBe(350);
    expect(seven.plan.remainingCount).toBe(105);
    days = seven.days;

    const all = settleOldest(days, 'm', 'all', TODAY, 4);
    expect(all.plan.dates[0]).toBe('2026-08-10');
    expect(all.plan.dates).toHaveLength(105);
    expect(all.plan.remainingCount).toBe(0);
    expect(computeArrears(all.days, TODAY).hasArrears).toBe(false);
    expect(all.days['2026-11-23']).toBeUndefined();
  });

  it('settles oldest first even with scattered gaps, without mutating input', () => {
    const days: DaysMap = { '2026-01-02': { j: 0, m: 1, ts: 1 } };
    const before = JSON.stringify(days);
    const { days: next, plan } = settleOldest(days, 'm', 2, '2026-01-05', 9);
    expect(plan.dates).toEqual(['2026-01-01', '2026-01-03']);
    expect(next['2026-01-01']).toEqual({ j: 0, m: 1, ts: 9 });
    expect(JSON.stringify(days)).toBe(before);
  });

  it('settles both people independently from their own oldest gap', () => {
    const days: DaysMap = {
      '2026-01-01': { j: 1, m: 0, ts: 1 },
      '2026-01-02': { j: 1, m: 1, ts: 1 },
    };
    const result = settleOldestForBoth(days, 1, '2026-01-05', 5);
    expect(result.j.dates).toEqual(['2026-01-03']);
    expect(result.m.dates).toEqual(['2026-01-01']);
  });

  it('rejects invalid settle counts and handles empty arrears', () => {
    expect(() => planSettle({}, 'j', 0, TODAY)).toThrow(RangeError);
    expect(planSettle(imported(), 'j', 'all', TODAY).dates).toEqual([]);
  });

  it('builds flat Firebase multi-path updates', () => {
    expect(buildFlatDayUpdates([{ key: '2026-08-02', person: 'm' }], 123)).toEqual({
      'days/2026-08-02/m': 1,
      'days/2026-08-02/ts': 123,
    });
  });
});
