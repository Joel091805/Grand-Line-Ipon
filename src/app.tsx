import { OceanViewport, spawnBerryArc } from './components/OceanViewport';
import { useIponStore } from './store/useIponStore';

export function App() {
  const store = useIponStore();
  const totals = store.totals.value;
  const crewCount = store.unlockedCrewCount.value;

  const handleLoadExcelBaseline = () => {
    store.applyDefaultImport('merge');
  };

  const handleTestBerryCoin = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const fromX = rect ? rect.left + rect.width / 2 : 195;
    const fromY = rect ? rect.top : 420;
    spawnBerryArc(fromX, fromY, { count: 3, coordinateSpace: 'client' });
  };

  return (
    <div class="min-h-dvh flex flex-col bg-deck-bg text-ink-primary">
      {/* Phase 2: Procedural Hi-Bit <canvas> Ocean Viewport (Top 30% settled) */}
      <OceanViewport store={store} />

      <main class="flex-1 px-4 py-4 max-w-[390px] w-full mx-auto space-y-4 pb-safe-bottom">
        <section class="bg-card-surface border border-border-hairline rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-berry-gold">
                2026 Shared Alkansya
              </p>
              <h1 class="text-lg font-extrabold tracking-tight text-ink-primary">
                Grand Line Ipon
              </h1>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-ocean-deep text-berry-gold">
              {crewCount}/10 Straw Hats
            </span>
          </div>

          <div class="mt-3 flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>Combined Savings</span>
            <span class="text-sm font-extrabold text-ink-primary">
              ₱{totals.combinedTotal.toLocaleString()} / ₱36,500
            </span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-border-hairline p-3">
              <span class="text-xs font-semibold text-joel-crimson">Joel</span>
              <p class="text-lg font-extrabold mt-0.5">
                ₱{totals.joelTotal.toLocaleString()}
              </p>
            </div>
            <div class="rounded-xl border border-border-hairline p-3">
              <span class="text-xs font-semibold text-claire-teal">Min Claire</span>
              <p class="text-lg font-extrabold mt-0.5">
                ₱{totals.claireTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            {totals.combinedTotal === 0 && (
              <button
                type="button"
                onClick={handleLoadExcelBaseline}
                class="flex-1 rounded-xl bg-ocean-deep px-3 py-2 text-xs font-bold text-white"
              >
                Load Excel Baseline (₱26,950 • 9/10 Crew)
              </button>
            )}
            <button
              type="button"
              onClick={handleTestBerryCoin}
              class="flex-1 rounded-xl border border-berry-gold bg-berry-gold/15 px-3 py-2 text-xs font-extrabold text-ink-primary"
            >
              Launch Berry Arc ฿
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
