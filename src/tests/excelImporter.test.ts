import { describe, expect, it } from 'vitest';
import type { DaysMap } from '../types/ipon';
import {
  DEFAULT_IMPORT_PLAN,
  buildImportDays,
  buildImportFlatUpdates,
  createDefaultImportPlan,
  summarizeImport,
  validateImportPlan,
} from '../utils/excelImporter';

describe('excelImporter', () => {
  it('default preset: Joel 326 days ₱16,300 + Min Claire 213 days ₱10,650 = ₱26,950', () => {
    const summary = summarizeImport(createDefaultImportPlan());
    expect(summary.j).toMatchObject({ days: 326, amount: 16300 });
    expect(summary.m).toMatchObject({ days: 213, amount: 10650 });
    expect(summary.totalDays).toBe(539);
    expect(summary.totalAmount).toBe(26950);
  });

  it('pre-fills an editable copy without touching the frozen preset', () => {
    const plan = createDefaultImportPlan();
    expect(plan).toEqual({
      j: { start: '2026-01-01', end: '2026-11-22' },
      m: { start: '2026-01-01', end: '2026-08-01' },
    });
    plan.m!.end = '2026-09-01';
    expect(DEFAULT_IMPORT_PLAN.m.end).toBe('2026-08-01');
    expect(Object.isFrozen(DEFAULT_IMPORT_PLAN.j)).toBe(true);
  });

  it('applies independent per-person ranges with inclusive boundaries', () => {
    const days = buildImportDays(createDefaultImportPlan(), {}, { ts: 1 });
    expect(days['2026-11-22']).toEqual({ j: 1, m: 0, ts: 1 });
    expect(days['2026-11-23']).toBeUndefined();
    expect(days['2026-08-01']).toEqual({ j: 1, m: 1, ts: 1 });
    expect(days['2026-08-02']).toEqual({ j: 1, m: 0, ts: 1 });
    expect(Object.keys(days)).toHaveLength(326);
  });

  it('leaves a person untouched when their range is null', () => {
    const existing: DaysMap = { '2026-12-01': { j: 0, m: 1, ts: 5 } };
    const days = buildImportDays({ j: { start: '2026-12-01', end: '2026-12-02' }, m: null }, existing, { ts: 9 });
    expect(days['2026-12-01']).toEqual({ j: 1, m: 1, ts: 9 });
    expect(days['2026-12-02']).toEqual({ j: 1, m: 0, ts: 9 });
  });

  it('merge never un-pays; replace clears outside the range', () => {
    const existing: DaysMap = { '2026-12-25': { j: 1, m: 1, ts: 5 } };
    const plan = createDefaultImportPlan();
    expect(buildImportDays(plan, existing)['2026-12-25']).toEqual({ j: 1, m: 1, ts: 5 });
    expect(buildImportDays(plan, existing, { mode: 'replace', ts: 7 })['2026-12-25']).toEqual({ j: 0, m: 0, ts: 7 });
  });

  it('reports newly-added days against an existing ledger', () => {
    const existing = buildImportDays({ j: null, m: { start: '2026-01-01', end: '2026-01-31' } });
    const summary = summarizeImport(createDefaultImportPlan(), existing);
    expect(summary.m.newDays).toBe(213 - 31);
    expect(summary.j.newDays).toBe(326);
  });

  it('validates ranges and refuses to build invalid plans', () => {
    const bad = { j: { start: '2026-05-01', end: '2026-04-01' }, m: { start: '2026-02-30', end: '2026-03-01' } } as const;
    const result = validateImportPlan(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.j).toHaveLength(1);
    expect(result.errors.m).toHaveLength(1);
    expect(validateImportPlan({ j: null, m: null }).errors.general).toHaveLength(1);
    expect(summarizeImport(bad).totalAmount).toBe(0);
    expect(() => buildImportDays(bad)).toThrow(RangeError);
  });

  it('builds a single atomic Firebase update map', () => {
    const updates = buildImportFlatUpdates(createDefaultImportPlan(), 42);
    const personKeys = Object.keys(updates).filter((k) => !k.endsWith('/ts'));
    expect(personKeys).toHaveLength(326 + 213);
    expect(updates['days/2026-08-01/m']).toBe(1);
    expect(updates['days/2026-08-02/m']).toBeUndefined();
  });
});
