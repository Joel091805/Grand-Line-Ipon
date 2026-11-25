import { useState } from 'preact/hooks';
import { decodeLedgerHash } from '../../store/backupService';
import { useSyncService, type SyncStatus } from '../../store/syncService';
import type { IponStore } from '../../store/useIponStore';
import {
  COMBINED_YEAR_GOAL,
  PERSON_YEAR_GOAL,
  isValidDateKey,
} from '../../utils/calendar2026';
import { isFullDay, isPaid } from '../../utils/habulinEngine';
import {
  ChopperBadgeIcon,
  DenDenIcon,
  StrawHatIcon,
  TangerineIcon,
} from '../deck/deckIcons';
import { formatPeso, formatShortDate } from '../deck/deckUtils';

export interface HUDProps {
  store: IponStore;
  onOpenSync: () => void;
  onOpenImport: () => void;
  onOpenTodaySheet: () => void;
}

const SYNC_DOT_DARK: Record<SyncStatus, string> = {
  disabled: 'bg-ink-mist/60',
  unpaired: 'bg-ink-mist/60',
  connecting: 'bg-berry-gold animate-pulse',
  offline: 'bg-amber-400',
  syncing: 'bg-claire-teal animate-pulse',
  synced: 'bg-emerald-400',
  error: 'bg-joel-crimson',
};

const SYNC_SHORT_LABEL: Record<SyncStatus, string> = {
  disabled: 'Local',
  unpaired: 'Pair',
  connecting: 'Linking…',
  offline: 'Offline',
  syncing: 'Syncing',
  synced: 'Synced',
  error: 'Error',
};

/**
 * Top Safe-Area HUD & Floating 'Today's Log Pose' Bottom Dock.
 * Displays live combined savings, Joel/Min Claire progress bars, Den Den Mushi
 * pairing status, and a 1-tap bottom quick-deposit action accessible from anywhere.
 */
export function HUD({
  store,
  onOpenSync,
  onOpenImport,
  onOpenTodaySheet,
}: HUDProps) {
  const sync = useSyncService();

  const combinedTotal = store.combinedTotal.value;
  const joelTotal = store.joelTotal.value;
  const claireTotal = store.claireTotal.value;
  const voyagePercent = store.voyagePercent.value;
  const streak = store.currentStreak.value;
  const today = store.today.value;
  const days = store.days.value;
  const arrears = store.habulinArrears.value;

  const syncStatus = sync.status.value;
  const pairedRoom = sync.pairing.value;
  const pendingCount = sync.pendingCount.value;

  const [justDropped, setJustDropped] = useState(false);

  const hasRestoreLink =
    typeof location !== 'undefined' && decodeLedgerHash(location.hash) !== null;

  const joelPct = Math.min(100, Math.round((joelTotal / PERSON_YEAR_GOAL) * 1000) / 10);
  const clairePct = Math.min(100, Math.round((claireTotal / PERSON_YEAR_GOAL) * 1000) / 10);

  const todayIn2026 = isValidDateKey(today);
  const joelTodayPaid = todayIn2026 && isPaid(days, today, 'j');
  const claireTodayPaid = todayIn2026 && isPaid(days, today, 'm');
  const bothTodayPaid = todayIn2026 && isFullDay(days, today);

  const handleQuickDeposit = () => {
    if (!todayIn2026 || bothTodayPaid) {
      onOpenTodaySheet();
      return;
    }
    const ok = store.dropBothToday();
    if (ok) {
      setJustDropped(true);
      window.setTimeout(() => setJustDropped(false), 650);
    }
  };

  return (
    <>
      {/* Top Safe-Area HUD */}
      <header class="sticky top-0 z-30 w-full bg-sea-abyss/90 backdrop-blur-md border-b border-brass-hairline pt-[env(safe-area-inset-top)]">
        <div class="max-w-[390px] w-full mx-auto px-4 py-2.5 space-y-2">
          {/* Row 1: Combined Bounty Readout & Den Den Mushi Status */}
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-baseline gap-1.5">
                <span class="text-lg font-extrabold tracking-tight text-ink-ivory tabular-nums leading-none">
                  {formatPeso(combinedTotal)}
                </span>
                <span class="text-xs font-semibold text-ink-mist tabular-nums">
                  / {formatPeso(COMBINED_YEAR_GOAL)}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] font-extrabold uppercase tracking-[0.1em] text-berry-gold tabular-nums">
                  {voyagePercent.toFixed(1)}% Grand Line
                </span>
                {streak >= 7 && (
                  <span class="inline-flex items-center gap-1 rounded-full bg-sea-elevated border border-brass-hairline px-1.5 py-0.5 text-[10px] font-bold text-ink-ivory tabular-nums">
                    <ChopperBadgeIcon class="w-3 h-3" />
                    {streak}d
                  </span>
                )}
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              {/* Den Den Mushi Pairing Pill */}
              <button
                type="button"
                onClick={onOpenSync}
                aria-label={`Den Den Mushi Sync: ${SYNC_SHORT_LABEL[syncStatus]}`}
                class="inline-flex items-center gap-1.5 rounded-full bg-sea-midnight border border-brass-hairline px-2.5 py-1.5 min-h-[34px] text-[11px] font-bold text-ink-ivory active:scale-95 transition-transform"
              >
                <DenDenIcon class="w-3.5 h-3.5 text-berry-gold shrink-0" />
                <span
                  class={`w-2 h-2 rounded-full shrink-0 ${SYNC_DOT_DARK[syncStatus]}`}
                  aria-hidden="true"
                />
                <span class="max-w-[74px] truncate tabular-nums">
                  {pairedRoom ? pairedRoom.roomCode : SYNC_SHORT_LABEL[syncStatus]}
                </span>
                {pendingCount > 0 && (
                  <span class="px-1 rounded-full bg-berry-gold/25 text-berry-gold text-[10px] font-extrabold tabular-nums">
                    {pendingCount}
                  </span>
                )}
                {hasRestoreLink && (
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-berry-gold shrink-0"
                    title="Restore link ready"
                  />
                )}
              </button>

              {/* Compact Excel 2026 Importer Trigger */}
              <button
                type="button"
                onClick={onOpenImport}
                aria-label="Open 2026 Excel Importer"
                title="Import 2026 Excel Baseline"
                class="w-[34px] h-[34px] rounded-full bg-sea-midnight border border-brass-hairline flex items-center justify-center text-ink-mist hover:text-ink-ivory active:scale-95 transition-transform"
              >
                <svg viewBox="0 0 20 20" fill="none" class="w-4 h-4" aria-hidden="true">
                  <rect
                    x="3.5"
                    y="4.5"
                    width="13"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M3.5 8.5h13M8.5 8.5v7"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Row 2: Joel & Min Claire Individual Progress Bars */}
          <div class="grid grid-cols-2 gap-2.5">
            {/* Joel Progress */}
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] leading-none">
                <span class="inline-flex items-center gap-1 font-bold text-ink-ivory">
                  <StrawHatIcon class="w-3.5 h-3.5 shrink-0" />
                  Joel
                </span>
                <span class="font-bold text-ink-mist tabular-nums">
                  {formatPeso(joelTotal)}
                </span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-sea-elevated overflow-hidden">
                <div
                  class="h-full rounded-full bg-joel-crimson transition-all duration-300"
                  style={{ width: `${joelPct}%` }}
                />
              </div>
            </div>

            {/* Min Claire Progress */}
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] leading-none">
                <span class="inline-flex items-center gap-1 font-bold text-ink-ivory">
                  <TangerineIcon class="w-3.5 h-3.5 shrink-0" />
                  Min Claire
                </span>
                <span class="font-bold text-ink-mist tabular-nums">
                  {formatPeso(claireTotal)}
                </span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-sea-elevated overflow-hidden">
                <div
                  class="h-full rounded-full bg-claire-teal transition-all duration-300"
                  style={{ width: `${clairePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Bottom Thumb-Zone Dock: Today's Log Pose */}
      <div class="fixed bottom-0 inset-x-0 z-30 pointer-events-none px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div class="max-w-[390px] w-full mx-auto pointer-events-auto">
          <div class="rounded-2xl bg-sea-midnight/95 backdrop-blur-md border border-brass-hairline shadow-abyss-dock p-2 flex items-center justify-between gap-2">
            {/* Left: Log Pose Info (Tap to open current island sheet) */}
            <button
              type="button"
              onClick={onOpenTodaySheet}
              class="flex items-center gap-2.5 min-w-0 flex-1 text-left px-1.5 py-1 rounded-xl active:bg-sea-elevated/60 transition-colors"
              aria-label="Open Today's Island Ledger"
            >
              {/* Log Pose Compass Dial */}
              <div class="relative w-10 h-10 rounded-full bg-sea-elevated border border-brass-hairline flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" stroke="#E5A93C" stroke-width="1.4" opacity="0.8" />
                  <circle cx="12" cy="12" r="2" fill="#E5A93C" />
                  <path d="M12 4.5l1.6 5.5L12 12l-1.6-2L12 4.5Z" fill="#E04332" />
                  <path d="M12 19.5l-1.6-5.5L12 12l1.6 2L12 19.5Z" fill="#22A6B8" />
                </svg>
                {arrears.hasArrears && (
                  <span
                    class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-joel-crimson border-2 border-sea-midnight"
                    title={`${arrears.combinedCount} missed deposits`}
                  />
                )}
              </div>

              <div class="min-w-0">
                <p class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-berry-gold truncate">
                  Today&apos;s Log Pose
                </p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-xs font-extrabold text-ink-ivory tabular-nums truncate">
                    {todayIn2026 ? formatShortDate(today) : '2026 Ledger'}
                  </span>
                  {todayIn2026 && (
                    <span class="inline-flex items-center gap-1">
                      <span
                        class={`w-2 h-2 rounded-full ${
                          joelTodayPaid ? 'bg-joel-crimson' : 'bg-sea-elevated border border-ink-mist/40'
                        }`}
                        title={`Joel: ${joelTodayPaid ? 'Paid' : 'Unpaid'}`}
                      />
                      <span
                        class={`w-2 h-2 rounded-full ${
                          claireTodayPaid ? 'bg-claire-teal' : 'bg-sea-elevated border border-ink-mist/40'
                        }`}
                        title={`Min Claire: ${claireTodayPaid ? 'Paid' : 'Unpaid'}`}
                      />
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Right: 1-Tap Quick Deposit CTA */}
            <button
              type="button"
              onClick={handleQuickDeposit}
              class={`shrink-0 min-h-[44px] px-4 rounded-xl text-xs font-extrabold tracking-wide transition-all active:scale-95 tabular-nums flex items-center gap-1.5 ${
                bothTodayPaid
                  ? 'bg-berry-gold/20 border border-berry-gold text-berry-gold'
                  : 'bg-berry-gold text-sea-abyss shadow-brass-glow'
              } ${justDropped ? 'animate-coin-pop' : ''}`}
              aria-label={
                bothTodayPaid
                  ? 'Today is fully deposited — open ledger'
                  : 'Quick deposit ₱100 for both Joel and Min Claire today'
              }
            >
              {bothTodayPaid ? (
                <>
                  <span>₱100 ✓</span>
                </>
              ) : todayIn2026 ? (
                <>
                  <span>+₱100 Both</span>
                </>
              ) : (
                <span>Open Ledger</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
