import { useEffect, useState } from 'preact/hooks';
import type { IponStore } from '../../store/useIponStore';
import type { DateKey, ImportMode, ImportPlan, PersonId } from '../../types/ipon';
import { YEAR_END, YEAR_START } from '../../utils/calendar2026';
import {
  DEFAULT_IMPORT_PLAN,
  createDefaultImportPlan,
  summarizeImport,
  validateImportPlan,
} from '../../utils/excelImporter';
import { StrawHatIcon, TangerineIcon } from '../deck/deckIcons';
import { formatPeso } from '../deck/deckUtils';
import { BottomSheet } from './BottomSheet';

export interface Import2026ModalProps {
  open: boolean;
  onClose: () => void;
  store: IponStore;
}

export function Import2026Modal({ open, onClose, store }: Import2026ModalProps) {
  const [plan, setPlan] = useState<ImportPlan>(() => createDefaultImportPlan());
  const [mode, setMode] = useState<ImportMode>('merge');
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setResultMsg(null);
    }
  }, [open]);

  const existingDays = store.days.value;
  const validation = validateImportPlan(plan);
  const summary = summarizeImport(plan, existingDays);

  const handleApplyDefaultPreset = () => {
    const preset = createDefaultImportPlan();
    setPlan(preset);
    const applied = store.applyDefaultImport(mode);
    setResultMsg(
      `Excel baseline applied (${mode}): ${applied.totalDays} days (${formatPeso(applied.totalAmount)}), ${applied.totalNewDays} newly added.`,
    );
  };

  const handleApplyCustom = () => {
    if (!validation.valid) return;
    const applied = store.applyImport(plan, mode);
    setResultMsg(
      `Imported ${applied.totalDays} deposits (${formatPeso(applied.totalAmount)}) — ${applied.totalNewDays} new.`,
    );
  };

  const togglePerson = (person: PersonId) => {
    setPlan((prev) => ({
      ...prev,
      [person]: prev[person] ? null : { ...DEFAULT_IMPORT_PLAN[person] },
    }));
    setResultMsg(null);
  };

  const updateDate = (person: PersonId, field: 'start' | 'end', value: string) => {
    setPlan((prev) => {
      const current = prev[person];
      if (!current) return prev;
      return {
        ...prev,
        [person]: { ...current, [field]: value as DateKey },
      };
    });
    setResultMsg(null);
  };

  const renderPersonRange = (person: PersonId) => {
    const isJoel = person === 'j';
    const name = isJoel ? 'Joel' : 'Min Claire';
    const range = plan[person];
    const personSummary = summary[person];
    const personErrors = validation.errors[person];

    return (
      <div
        key={person}
        class="rounded-2xl bg-sea-elevated/70 border border-brass-hairline p-3 space-y-2.5"
      >
        <div class="flex items-center justify-between gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={range !== null}
              onChange={() => togglePerson(person)}
              class="w-4 h-4 rounded accent-berry-gold"
            />
            {isJoel ? <StrawHatIcon class="w-4 h-4" /> : <TangerineIcon class="w-4 h-4" />}
            <span
              class={`text-xs font-extrabold ${isJoel ? 'text-joel-crimson' : 'text-claire-teal'}`}
            >
              {name}
            </span>
          </label>
          <span class="text-xs font-bold text-ink-ivory tabular-nums">
            {personSummary.days}d • {formatPeso(personSummary.amount)}
          </span>
        </div>

        {range && (
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-ink-mist">
                Start
              </span>
              <input
                type="date"
                min={YEAR_START}
                max={YEAR_END}
                value={range.start}
                onInput={(e) => updateDate(person, 'start', e.currentTarget.value)}
                class="w-full rounded-xl bg-sea-abyss border border-brass-hairline px-2.5 py-2 text-xs font-semibold text-ink-ivory tabular-nums focus:outline-none focus:ring-2 focus:ring-berry-gold/70"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-ink-mist">
                End
              </span>
              <input
                type="date"
                min={YEAR_START}
                max={YEAR_END}
                value={range.end}
                onInput={(e) => updateDate(person, 'end', e.currentTarget.value)}
                class="w-full rounded-xl bg-sea-abyss border border-brass-hairline px-2.5 py-2 text-xs font-semibold text-ink-ivory tabular-nums focus:outline-none focus:ring-2 focus:ring-berry-gold/70"
              />
            </label>
          </div>
        )}

        {personErrors.length > 0 && (
          <p class="text-[11px] font-semibold text-joel-crimson">{personErrors[0]}</p>
        )}
      </div>
    );
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="2026 Excel Importer"
      subtitle="Batch-fill deposits from IPON CALENDAR workbook"
    >
      <div class="space-y-4">
        {/* 1-Tap Asymmetric Preset Card */}
        <div class="rounded-2xl bg-sea-abyss border border-berry-gold/50 p-3.5 space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[11px] font-extrabold uppercase tracking-[0.1em] text-berry-gold">
                1-Tap Asymmetric Excel Preset
              </p>
              <p class="text-xs font-semibold text-ink-ivory/90 mt-0.5 tabular-nums">
                Joel: Jan 1 – Nov 22 (326d • ₱16,300)
              </p>
              <p class="text-xs font-semibold text-ink-ivory/90 tabular-nums">
                Min Claire: Jan 1 – Aug 1 (213d • ₱10,650)
              </p>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-berry-gold text-sea-abyss text-xs font-extrabold tabular-nums shrink-0">
              ₱26,950
            </span>
          </div>
          <button
            type="button"
            onClick={handleApplyDefaultPreset}
            class="w-full rounded-xl bg-berry-gold px-3 py-2.5 text-xs font-extrabold text-sea-abyss active:scale-[0.98] transition-transform shadow-brass-glow"
          >
            Load 2026 Excel Baseline (₱26,950)
          </button>
        </div>

        {/* Custom Range Editor */}
        <div class="space-y-2.5">
          <p class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mist">
            Custom Date Ranges
          </p>
          {renderPersonRange('j')}
          {renderPersonRange('m')}
        </div>

        {/* Mode Selector */}
        <div class="space-y-1.5">
          <p class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mist">
            Import Mode
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('merge')}
              aria-pressed={mode === 'merge'}
              class={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${
                mode === 'merge'
                  ? 'bg-claire-teal/25 border-claire-teal text-ink-ivory'
                  : 'bg-sea-elevated/60 border-brass-hairline text-ink-mist'
              }`}
            >
              Merge (Safe)
              <span class="block text-[10px] font-medium opacity-80">Only adds deposits</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              aria-pressed={mode === 'replace'}
              class={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${
                mode === 'replace'
                  ? 'bg-joel-crimson border-joel-crimson text-ink-ivory'
                  : 'bg-sea-elevated/60 border-brass-hairline text-ink-mist'
              }`}
            >
              Replace
              <span class="block text-[10px] font-medium opacity-80">Clears outside range</span>
            </button>
          </div>
        </div>

        {validation.errors.general.length > 0 && (
          <p class="text-xs font-semibold text-joel-crimson">{validation.errors.general[0]}</p>
        )}

        <div class="rounded-xl bg-sea-abyss border border-brass-hairline px-3 py-2.5 flex items-center justify-between text-xs tabular-nums">
          <span class="font-semibold text-ink-mist">
            Range Total ({summary.totalDays}d • {summary.totalNewDays} new)
          </span>
          <span class="font-extrabold text-berry-gold">{formatPeso(summary.totalAmount)}</span>
        </div>

        {resultMsg && (
          <div class="rounded-xl bg-berry-gold/15 border border-berry-gold/50 px-3 py-2 text-xs font-bold text-berry-gold">
            {resultMsg}
          </div>
        )}

        <button
          type="button"
          disabled={!validation.valid}
          onClick={handleApplyCustom}
          class="w-full min-h-[44px] rounded-xl bg-sea-elevated border border-berry-gold/60 px-4 py-2.5 text-xs font-extrabold text-ink-ivory active:scale-[0.98] transition-transform disabled:opacity-45"
        >
          Apply Custom Range ({formatPeso(summary.totalAmount)})
        </button>
      </div>
    </BottomSheet>
  );
}
