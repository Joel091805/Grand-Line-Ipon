import { useEffect, useRef, useState } from 'preact/hooks';
import { NOTE_MAX_LENGTH, type IponStore } from '../../store/useIponStore';
import type {
  DateKey,
  MonthKey,
  MonthNumber,
  PersonId,
  SettleCount,
} from '../../types/ipon';
import {
  DAILY_TARGET,
  WEEKDAY_SHORT,
  getIsland,
  getMonthDays,
  getMonthGrid,
  toMonthKey,
} from '../../utils/calendar2026';
import { isFullDay, isPaid, planSettle } from '../../utils/habulinEngine';
import {
  BerryCoinIcon,
  GoldStarIcon,
  RobinTomeIcon,
  StrawHatIcon,
  TangerineIcon,
} from './deckIcons';
import {
  formatFullDate,
  formatMonthYear,
  formatPeso,
  formatShortDate,
  isOlderThanSevenDays,
} from './deckUtils';

export interface IslandLedgerSheetProps {
  open: boolean;
  onClose: () => void;
  store: IponStore;
  activeMonth: MonthNumber;
  selectedDate: DateKey;
  onSelectDate: (key: DateKey) => void;
  onSelectMonth: (month: MonthNumber) => void;
}

type UnmarkTarget = PersonId | 'both';
interface PendingUnmark {
  key: DateKey;
  target: UnmarkTarget;
}

type SettleTarget = 'both' | PersonId;

const TARGET_LABEL: Record<UnmarkTarget, string> = {
  j: 'Joel (₱50)',
  m: 'Min Claire (₱50)',
  both: 'Both (₱100)',
};

const NOTE_DEBOUNCE_MS = 500;
const STAGGER_MS = 55;
const MAX_ARREAR_CHIPS = 8;

/**
 * Scene 4: Island Ledger Sheet (Midnight Grand Line slide-up drawer)
 * Combines:
 * 1. 44px circular Split-Coin 2026 calendar (Joel Crimson left, Min Claire Teal right, Gold Berry ✓ both)
 * 2. Selected day quick-toggle bar with >7-day unmark confirmation guard
 * 3. Nami's Arrears Settlement Panel (+1 Day, +7 Days, Settle All)
 * 4. Robin's debounced Captain's Logbook notes synced to notes/2026-MM
 */
export function IslandLedgerSheet({
  open,
  onClose,
  store,
  activeMonth,
  selectedDate,
  onSelectDate,
  onSelectMonth,
}: IslandLedgerSheetProps) {
  const days = store.days.value;
  const today = store.today.value;
  const arrears = store.habulinArrears.value;

  const island = getIsland(activeMonth);
  const monthKey: MonthKey = toMonthKey(activeMonth);
  const grid = getMonthGrid(activeMonth, 0);
  const monthDays = getMonthDays(activeMonth);
  const persistedNote = store.notes.value[monthKey] ?? '';

  // --- Unmark guard state ---
  const [pendingUnmark, setPendingUnmark] = useState<PendingUnmark | null>(null);

  // --- Nami settlement state ---
  const [settleTarget, setSettleTarget] = useState<SettleTarget>('both');
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleBanner, setSettleBanner] = useState<string | null>(null);
  const [animatingChips, setAnimatingChips] = useState<Set<string>>(() => new Set());
  const settleTimersRef = useRef<number[]>([]);

  // --- Robin debounced notes state ---
  const [draftNote, setDraftNote] = useState(persistedNote);
  const [noteSaveState, setNoteSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const noteTimerRef = useRef<number | null>(null);
  const pendingNoteRef = useRef<{ monthKey: MonthKey; text: string } | null>(null);

  const clearSettleTimers = () => {
    for (const id of settleTimersRef.current) window.clearTimeout(id);
    settleTimersRef.current = [];
  };

  const flushPendingNote = () => {
    if (noteTimerRef.current !== null) {
      window.clearTimeout(noteTimerRef.current);
      noteTimerRef.current = null;
    }
    if (pendingNoteRef.current) {
      const { monthKey: k, text } = pendingNoteRef.current;
      pendingNoteRef.current = null;
      store.setNote(k, text);
    }
  };

  // Lock body scroll & Escape-to-close while open
  useEffect(() => {
    if (!open) {
      clearSettleTimers();
      setAnimatingChips(new Set());
      setSettleBusy(false);
      setSettleBanner(null);
      setPendingUnmark(null);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      clearSettleTimers();
    };
  }, [open, onClose]);

  // Keep settleTarget sensible when arrears change
  useEffect(() => {
    if (arrears.j.count > 0 && arrears.m.count === 0) setSettleTarget('j');
    else if (arrears.m.count > 0 && arrears.j.count === 0) setSettleTarget('m');
    else if (arrears.j.count > 0 && arrears.m.count > 0) setSettleTarget('both');
  }, [arrears.j.count > 0, arrears.m.count > 0]);

  // Flush pending note when switching islands or unmounting
  useEffect(() => {
    setDraftNote(store.notes.peek()[monthKey] ?? '');
    setNoteSaveState('idle');
    setPendingUnmark(null);
    return () => {
      flushPendingNote();
    };
  }, [monthKey, store]);

  // Sync incoming remote note updates when no local edit is pending
  useEffect(() => {
    if (!pendingNoteRef.current && persistedNote !== draftNote) {
      setDraftNote(persistedNote);
    }
  }, [persistedNote]);

  if (!open) return null;

  // --- Month totals ---
  let monthJoel = 0;
  let monthClaire = 0;
  let monthFull = 0;
  for (const d of monthDays) {
    const rec = days[d.key];
    if (rec?.j === 1) monthJoel++;
    if (rec?.m === 1) monthClaire++;
    if (rec?.j === 1 && rec?.m === 1) monthFull++;
  }
  const monthPeso = (monthJoel + monthClaire) * DAILY_TARGET;
  const isMonthCleared = monthFull === island.daysInMonth;

  // --- Calendar & Quick-Day handlers ---
  const handleHalfTap = (key: DateKey, person: PersonId) => {
    onSelectDate(key);
    const currentlyPaid = days[key]?.[person] === 1;
    if (currentlyPaid && isOlderThanSevenDays(key, today)) {
      setPendingUnmark({ key, target: person });
      return;
    }
    setPendingUnmark(null);
    store.setPaid(key, person, !currentlyPaid);
  };

  const selectedJoelPaid = isPaid(days, selectedDate, 'j');
  const selectedClairePaid = isPaid(days, selectedDate, 'm');
  const selectedBothPaid = isFullDay(days, selectedDate);
  const selectedIsOld = isOlderThanSevenDays(selectedDate, today);

  const handleToggleSelectedBoth = () => {
    if (selectedBothPaid && selectedIsOld) {
      setPendingUnmark({ key: selectedDate, target: 'both' });
      return;
    }
    setPendingUnmark(null);
    store.setBoth(selectedDate, !selectedBothPaid);
  };

  const handleConfirmUnmark = () => {
    if (!pendingUnmark) return;
    if (pendingUnmark.target === 'both') {
      store.setBoth(pendingUnmark.key, false);
    } else {
      store.setPaid(pendingUnmark.key, pendingUnmark.target, false);
    }
    setPendingUnmark(null);
  };

  // --- Nami Arrears Settlement handler (+1 Day, +7 Days, Settle All) ---
  const activeArrearsList: Array<{ person: PersonId; date: DateKey }> =
    settleTarget === 'both'
      ? [
          ...arrears.m.dates.slice(0, MAX_ARREAR_CHIPS / 2).map((date) => ({ person: 'm' as const, date })),
          ...arrears.j.dates.slice(0, MAX_ARREAR_CHIPS / 2).map((date) => ({ person: 'j' as const, date })),
        ]
      : arrears[settleTarget].dates
          .slice(0, MAX_ARREAR_CHIPS)
          .map((date) => ({ person: settleTarget, date }));

  const settleOneAmount =
    settleTarget === 'both'
      ? (arrears.j.count > 0 ? DAILY_TARGET : 0) + (arrears.m.count > 0 ? DAILY_TARGET : 0)
      : arrears[settleTarget].count > 0
        ? DAILY_TARGET
        : 0;

  const settleSevenAmount =
    settleTarget === 'both'
      ? (Math.min(7, arrears.j.count) + Math.min(7, arrears.m.count)) * DAILY_TARGET
      : Math.min(7, arrears[settleTarget].count) * DAILY_TARGET;

  const settleAllAmount =
    settleTarget === 'both' ? arrears.combinedAmount : arrears[settleTarget].amount;

  const handleSettle = (count: SettleCount) => {
    if (settleBusy || settleAllAmount === 0) return;

    const previewIds: string[] = [];
    if (settleTarget === 'both') {
      const mPlan = planSettle(days, 'm', count, today);
      const jPlan = planSettle(days, 'j', count, today);
      for (const d of mPlan.dates.slice(0, 6)) previewIds.push(`m:${d}`);
      for (const d of jPlan.dates.slice(0, 6)) previewIds.push(`j:${d}`);
    } else {
      const plan = planSettle(days, settleTarget, count, today);
      for (const d of plan.dates.slice(0, 10)) previewIds.push(`${settleTarget}:${d}`);
    }
    if (previewIds.length === 0) return;

    setSettleBusy(true);
    setSettleBanner(null);
    clearSettleTimers();

    previewIds.forEach((chipId, idx) => {
      const id = window.setTimeout(() => {
        setAnimatingChips((prev) => {
          const next = new Set(prev);
          next.add(chipId);
          return next;
        });
      }, idx * STAGGER_MS);
      settleTimersRef.current.push(id);
    });

    const totalDelay = previewIds.length * STAGGER_MS + 80;
    const doneId = window.setTimeout(() => {
      if (settleTarget === 'both') {
        const res = store.settleOldestForBoth(count);
        const totalDays = res.j.dates.length + res.m.dates.length;
        const totalAmt = res.j.amount + res.m.amount;
        setSettleBanner(`Settled ${totalDays} deposits (${formatPeso(totalAmt)})!`);
      } else {
        const res = store.settleOldest(settleTarget, count);
        const who = settleTarget === 'j' ? 'Joel' : 'Min Claire';
        setSettleBanner(`Settled ${res.dates.length}d (${formatPeso(res.amount)}) for ${who}!`);
      }
      setAnimatingChips(new Set());
      setSettleBusy(false);
    }, totalDelay);
    settleTimersRef.current.push(doneId);
  };

  // --- Robin's Debounced Logbook handlers ---
  const handleNoteInput = (value: string) => {
    const clamped = value.slice(0, NOTE_MAX_LENGTH);
    setDraftNote(clamped);
    setNoteSaveState('saving');
    pendingNoteRef.current = { monthKey, text: clamped };

    if (noteTimerRef.current !== null) window.clearTimeout(noteTimerRef.current);
    noteTimerRef.current = window.setTimeout(() => {
      noteTimerRef.current = null;
      if (pendingNoteRef.current) {
        const { monthKey: k, text } = pendingNoteRef.current;
        pendingNoteRef.current = null;
        store.setNote(k, text);
      }
      setNoteSaveState('saved');
    }, NOTE_DEBOUNCE_MS);
  };

  const handleNoteBlur = () => {
    if (pendingNoteRef.current) {
      flushPendingNote();
      setNoteSaveState('saved');
    }
  };

  const canPrev = activeMonth > 1;
  const canNext = activeMonth < 12;
  const activePending = pendingUnmark && pendingUnmark.key === selectedDate ? pendingUnmark : null;

  return (
    <div
      class="fixed inset-0 z-40 flex items-end justify-center bg-sea-abyss/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${island.name} — ${formatMonthYear(activeMonth)} Ledger`}
      data-testid="scene-island-ledger"
      onClick={onClose}
    >
      <div
        class="w-full max-w-[390px] max-h-[90dvh] flex flex-col rounded-t-3xl bg-sea-midnight border-t border-x border-brass-hairline shadow-abyss-dock animate-sheet-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brass Grab Handle */}
        <div class="flex justify-center pt-2.5 pb-1 shrink-0">
          <div class="w-10 h-1 rounded-full bg-brass-hairline" />
        </div>

        {/* Sticky Island Header */}
        <div class="flex items-start justify-between gap-2 px-4 pt-1 pb-3 border-b border-brass-hairline shrink-0">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-extrabold uppercase tracking-[0.16em] text-berry-gold truncate">
                Island {island.month} • {island.name}
              </span>
              {isMonthCleared && <GoldStarIcon class="w-3.5 h-3.5 text-berry-gold shrink-0" />}
            </div>
            <div class="flex items-baseline gap-2 mt-0.5">
              <h2 class="text-base font-extrabold tracking-tight text-ink-ivory">
                {formatMonthYear(activeMonth)}
              </h2>
              <span class="text-xs font-semibold text-ink-mist tabular-nums">
                {formatPeso(monthPeso)} / {formatPeso(island.combinedTarget)}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => canPrev && onSelectMonth((activeMonth - 1) as MonthNumber)}
              aria-label="Previous island month"
              class="w-8 h-8 rounded-full bg-sea-elevated border border-brass-hairline flex items-center justify-center text-ink-ivory disabled:opacity-30 active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 20 20" fill="none" class="w-4 h-4" aria-hidden="true">
                <path
                  d="M12.5 5.5L8 10l4.5 4.5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => canNext && onSelectMonth((activeMonth + 1) as MonthNumber)}
              aria-label="Next island month"
              class="w-8 h-8 rounded-full bg-sea-elevated border border-brass-hairline flex items-center justify-center text-ink-ivory disabled:opacity-30 active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 20 20" fill="none" class="w-4 h-4" aria-hidden="true">
                <path
                  d="M7.5 5.5L12 10l-4.5 4.5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close island ledger"
              class="w-8 h-8 rounded-full bg-sea-elevated border border-brass-hairline flex items-center justify-center text-ink-mist hover:text-ink-ivory active:scale-95 transition-transform ml-0.5"
            >
              <svg viewBox="0 0 20 20" fill="none" class="w-4 h-4" aria-hidden="true">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div class="flex-1 overflow-y-auto px-4 py-3.5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4">
          {/* 1. 44px Circular Split-Coin Calendar */}
          <div class="space-y-2.5">
            <div class="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_SHORT.map((dayName) => (
                <div
                  key={dayName}
                  class="text-[10px] font-bold uppercase tracking-wider text-ink-mist py-0.5"
                >
                  {dayName}
                </div>
              ))}
            </div>

            <div class="space-y-1.5">
              {grid.map((week, rowIdx) => (
                <div key={rowIdx} class="grid grid-cols-7 gap-1 place-items-center">
                  {week.map((cell, colIdx) => {
                    if (!cell) {
                      return (
                        <div key={`empty-${rowIdx}-${colIdx}`} class="w-11 h-11" aria-hidden="true" />
                      );
                    }

                    const rec = days[cell.key];
                    const joelPaid = rec?.j === 1;
                    const clairePaid = rec?.m === 1;
                    const bothPaid = joelPaid && clairePaid;
                    const isToday = cell.key === today;
                    const isSelected = cell.key === selectedDate;
                    const isFuture = cell.key > today;

                    const ringClass = isSelected
                      ? 'ring-2 ring-ink-ivory ring-offset-2 ring-offset-sea-midnight'
                      : isToday
                        ? 'ring-2 ring-berry-gold/80 ring-offset-1 ring-offset-sea-midnight'
                        : '';

                    return (
                      <div
                        key={cell.key}
                        class={`relative w-11 h-11 rounded-full overflow-hidden select-none transition-transform active:scale-95 ${ringClass} ${
                          bothPaid
                            ? 'bg-berry-gold border border-berry-gold shadow-brass-glow animate-coin-pop'
                            : 'border border-brass-hairline bg-sea-elevated'
                        } ${isFuture && !joelPaid && !clairePaid ? 'opacity-45' : ''}`}
                      >
                        {/* Split-Coin Halves: Joel Crimson (left) & Min Claire Teal (right) */}
                        {!bothPaid && (
                          <>
                            <div
                              class="pointer-events-none absolute inset-y-0 left-0 w-1/2 transition-colors duration-150"
                              style={{
                                backgroundColor: joelPaid ? 'var(--joel-crimson)' : 'var(--sea-elevated)',
                              }}
                            />
                            <div
                              class="pointer-events-none absolute inset-y-0 right-0 w-1/2 transition-colors duration-150"
                              style={{
                                backgroundColor: clairePaid ? 'var(--claire-teal)' : 'var(--sea-elevated)',
                              }}
                            />
                            <div
                              class="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-sea-abyss/60"
                              aria-hidden="true"
                            />
                          </>
                        )}

                        {/* Left Half Touch Zone: Joel */}
                        <button
                          type="button"
                          onClick={() => handleHalfTap(cell.key, 'j')}
                          aria-label={`Joel ₱50 on ${formatShortDate(cell.key)} — ${joelPaid ? 'paid' : 'unpaid'}`}
                          aria-pressed={joelPaid}
                          class="absolute inset-y-0 left-0 w-1/2 h-full z-10 focus:outline-none"
                        />

                        {/* Right Half Touch Zone: Min Claire */}
                        <button
                          type="button"
                          onClick={() => handleHalfTap(cell.key, 'm')}
                          aria-label={`Min Claire ₱50 on ${formatShortDate(cell.key)} — ${clairePaid ? 'paid' : 'unpaid'}`}
                          aria-pressed={clairePaid}
                          class="absolute inset-y-0 right-0 w-1/2 h-full z-10 focus:outline-none"
                        />

                        {/* Center Date Number / Gold Berry Checkmark */}
                        <div class="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center leading-none">
                          {bothPaid ? (
                            <>
                              <span class="text-[11px] font-extrabold text-sea-abyss tabular-nums">
                                {cell.day}
                              </span>
                              <span class="text-[10px] font-black text-sea-abyss leading-none mt-0.5">
                                ✓
                              </span>
                            </>
                          ) : (
                            <span
                              class={`px-1 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                                joelPaid || clairePaid
                                  ? 'bg-sea-abyss/80 text-ink-ivory'
                                  : 'text-ink-ivory'
                              }`}
                            >
                              {cell.day}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Split-Coin Legend */}
            <div class="pt-1.5 border-t border-brass-hairline/70 flex items-center justify-between text-[10px] font-semibold text-ink-mist">
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-joel-crimson inline-block" />
                  Joel (L)
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-claire-teal inline-block" />
                  Claire (R)
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-berry-gold inline-block" />
                  Berry ✓
                </span>
              </div>
              <span class="tabular-nums text-ink-ivory/80">
                {monthFull}/{island.daysInMonth} full
              </span>
            </div>
          </div>

          {/* 2. Selected Day Quick-Toggle Strip + >7-Day Guard */}
          <div class="rounded-2xl bg-sea-elevated/80 border border-brass-hairline p-3 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-extrabold text-ink-ivory truncate">
                {formatFullDate(selectedDate)}
              </span>
              <span class="text-xs font-bold text-berry-gold tabular-nums shrink-0">
                ₱{(selectedJoelPaid ? 50 : 0) + (selectedClairePaid ? 50 : 0)} / ₱100
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleHalfTap(selectedDate, 'j')}
                aria-pressed={selectedJoelPaid}
                class={`min-h-[40px] rounded-xl px-2 py-1.5 text-xs font-bold border transition-all active:scale-95 flex items-center justify-center gap-1 ${
                  selectedJoelPaid
                    ? 'bg-joel-crimson border-joel-crimson text-ink-ivory'
                    : 'bg-sea-midnight border-brass-hairline text-ink-ivory'
                }`}
              >
                <StrawHatIcon class="w-3.5 h-3.5 shrink-0" />
                <span>Joel {selectedJoelPaid ? '✓' : '₱50'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleHalfTap(selectedDate, 'm')}
                aria-pressed={selectedClairePaid}
                class={`min-h-[40px] rounded-xl px-2 py-1.5 text-xs font-bold border transition-all active:scale-95 flex items-center justify-center gap-1 ${
                  selectedClairePaid
                    ? 'bg-claire-teal border-claire-teal text-sea-abyss'
                    : 'bg-sea-midnight border-brass-hairline text-ink-ivory'
                }`}
              >
                <TangerineIcon class="w-3.5 h-3.5 shrink-0" />
                <span>Claire {selectedClairePaid ? '✓' : '₱50'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSelectedBoth}
                aria-pressed={selectedBothPaid}
                class={`min-h-[40px] rounded-xl px-2 py-1.5 text-xs font-extrabold border transition-all active:scale-95 ${
                  selectedBothPaid
                    ? 'bg-berry-gold border-berry-gold text-sea-abyss'
                    : 'bg-sea-midnight border-brass-hairline text-berry-gold'
                }`}
              >
                {selectedBothPaid ? '₱100 ✓' : 'Both ₱100'}
              </button>
            </div>

            {activePending && (
              <div
                role="alert"
                class="rounded-xl bg-joel-crimson/15 border border-joel-crimson/60 p-2.5 space-y-2"
              >
                <p class="text-xs font-semibold text-ink-ivory leading-snug">
                  <span class="font-extrabold text-berry-gold">
                    {formatShortDate(activePending.key)}
                  </span>{' '}
                  is older than 7 days. Un-mark{' '}
                  <span class="font-extrabold">{TARGET_LABEL[activePending.target]}</span>?
                </p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmUnmark}
                    class="flex-1 rounded-lg bg-joel-crimson px-3 py-1.5 text-xs font-extrabold text-ink-ivory active:scale-95 transition-transform"
                  >
                    Confirm Un-mark
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingUnmark(null)}
                    class="flex-1 rounded-lg bg-sea-midnight border border-brass-hairline px-3 py-1.5 text-xs font-bold text-ink-ivory active:scale-95 transition-transform"
                  >
                    Keep Deposit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Nami's Arrears Settlement Panel (+1 Day, +7 Days, Settle All) */}
          <section
            class={`rounded-2xl border p-3.5 space-y-3 ${
              arrears.hasArrears
                ? 'bg-sea-abyss/80 border-berry-gold/45'
                : 'bg-sea-elevated/50 border-brass-hairline'
            }`}
            aria-label="Nami's Arrears Settlement Panel"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <BerryCoinIcon class="w-4 h-4 shrink-0" />
                <h3 class="text-[11px] font-extrabold uppercase tracking-[0.12em] text-berry-gold truncate">
                  Nami&apos;s Arrears Settlement
                </h3>
              </div>
              {arrears.hasArrears ? (
                <span class="text-xs font-extrabold text-joel-crimson tabular-nums shrink-0">
                  {formatPeso(arrears.combinedAmount)} due
                </span>
              ) : (
                <span class="text-[11px] font-bold text-berry-gold">Zero Arrears ✓</span>
              )}
            </div>

            {settleBanner && (
              <p class="rounded-xl bg-berry-gold/15 border border-berry-gold/50 px-3 py-1.5 text-xs font-bold text-berry-gold">
                {settleBanner}
              </p>
            )}

            {arrears.hasArrears && (
              <>
                {/* Person Target Switcher */}
                <div class="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSettleTarget('m')}
                    disabled={arrears.m.count === 0}
                    class={`rounded-xl px-2 py-1.5 text-[11px] font-bold border transition-colors disabled:opacity-35 tabular-nums ${
                      settleTarget === 'm'
                        ? 'bg-claire-teal/25 border-claire-teal text-ink-ivory'
                        : 'bg-sea-midnight border-brass-hairline text-ink-mist'
                    }`}
                  >
                    Claire ({arrears.m.count}d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleTarget('j')}
                    disabled={arrears.j.count === 0}
                    class={`rounded-xl px-2 py-1.5 text-[11px] font-bold border transition-colors disabled:opacity-35 tabular-nums ${
                      settleTarget === 'j'
                        ? 'bg-joel-crimson/25 border-joel-crimson text-ink-ivory'
                        : 'bg-sea-midnight border-brass-hairline text-ink-mist'
                    }`}
                  >
                    Joel ({arrears.j.count}d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleTarget('both')}
                    class={`rounded-xl px-2 py-1.5 text-[11px] font-bold border transition-colors tabular-nums ${
                      settleTarget === 'both'
                        ? 'bg-berry-gold/25 border-berry-gold text-berry-gold'
                        : 'bg-sea-midnight border-brass-hairline text-ink-mist'
                    }`}
                  >
                    Both ({arrears.combinedCount}d)
                  </button>
                </div>

                {/* Oldest Missed Date Chips */}
                {activeArrearsList.length > 0 && (
                  <div class="flex flex-wrap gap-1.5">
                    {activeArrearsList.map(({ person, date }) => {
                      const chipKey = `${person}:${date}`;
                      const popped = animatingChips.has(chipKey);
                      return (
                        <span
                          key={chipKey}
                          class={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border transition-all ${
                            popped
                              ? 'bg-berry-gold border-berry-gold text-sea-abyss animate-coin-pop'
                              : person === 'j'
                                ? 'bg-joel-crimson/15 border-joel-crimson/45 text-ink-ivory'
                                : 'bg-claire-teal/15 border-claire-teal/45 text-ink-ivory'
                          }`}
                        >
                          {person === 'j' ? 'J' : 'C'} • {formatShortDate(date)}
                          {popped ? ' ✓' : ''}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* +1 Day / +7 Days / Settle All */}
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={settleBusy || settleOneAmount === 0}
                    onClick={() => handleSettle(1)}
                    class="min-h-[44px] rounded-xl bg-sea-elevated border border-brass-hairline px-2 py-1.5 text-xs font-bold text-ink-ivory active:scale-95 transition-transform disabled:opacity-40"
                  >
                    +1 Day
                    <span class="block text-[10px] font-semibold text-ink-mist tabular-nums">
                      {formatPeso(settleOneAmount)}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={settleBusy || settleSevenAmount === 0}
                    onClick={() => handleSettle(7)}
                    class="min-h-[44px] rounded-xl bg-sea-elevated border border-brass-hairline px-2 py-1.5 text-xs font-bold text-ink-ivory active:scale-95 transition-transform disabled:opacity-40"
                  >
                    +7 Days
                    <span class="block text-[10px] font-semibold text-ink-mist tabular-nums">
                      {formatPeso(settleSevenAmount)}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={settleBusy || settleAllAmount === 0}
                    onClick={() => handleSettle('all')}
                    class="min-h-[44px] rounded-xl bg-berry-gold px-2 py-1.5 text-xs font-extrabold text-sea-abyss active:scale-95 transition-transform disabled:opacity-40 shadow-brass-glow"
                  >
                    Settle All
                    <span class="block text-[10px] font-bold text-sea-abyss/80 tabular-nums">
                      {formatPeso(settleAllAmount)}
                    </span>
                  </button>
                </div>
              </>
            )}
          </section>

          {/* 4. Robin's Debounced Captain's Logbook Notes */}
          <section
            class="rounded-2xl bg-sea-elevated/70 border border-brass-hairline p-3.5 space-y-2.5"
            aria-label={`Robin's Captain's Logbook for ${island.monthName} 2026`}
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <RobinTomeIcon class="w-4 h-4 shrink-0" />
                <h3 class="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-ivory truncate">
                  Captain&apos;s Logbook • {island.monthAbbr}
                </h3>
              </div>
              <span
                class={`text-[11px] font-bold shrink-0 ${
                  noteSaveState === 'saving'
                    ? 'text-berry-gold'
                    : noteSaveState === 'saved'
                      ? 'text-claire-teal'
                      : 'text-ink-mist'
                }`}
              >
                {noteSaveState === 'saving'
                  ? 'Saving…'
                  : noteSaveState === 'saved'
                    ? 'Saved ✓'
                    : 'Auto-save'}
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              value={draftNote}
              onInput={(e) => handleNoteInput(e.currentTarget.value)}
              onBlur={handleNoteBlur}
              placeholder={`Robin's log for ${island.monthName} 2026 (GCash refs, milestones, notes)…`}
              class="w-full rounded-xl bg-sea-abyss/80 border border-brass-hairline px-3 py-2.5 text-sm font-medium text-ink-ivory placeholder:text-ink-mist/60 focus:outline-none focus:ring-2 focus:ring-berry-gold/70 resize-y min-h-[84px]"
            />

            <div class="flex items-center justify-between text-[10px] font-semibold text-ink-mist tabular-nums">
              <span>Synced to notes/{monthKey}</span>
              <span>
                {draftNote.length} / {NOTE_MAX_LENGTH}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
