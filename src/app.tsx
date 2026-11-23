export function App() {
  return (
    <div class="min-h-dvh flex flex-col bg-deck-bg text-ink-primary">
      <header class="bg-ocean-deep text-white pt-safe-top px-5 pb-6">
        <div class="max-w-md mx-auto pt-4 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-berry-gold">
              2026 Shared Alkansya
            </p>
            <h1 class="text-xl font-extrabold tracking-tight mt-0.5">
              Grand Line Ipon
            </h1>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-ocean-mid text-white/90">
            Phase 0 Ready
          </span>
        </div>
      </header>

      <main class="flex-1 px-4 py-5 max-w-md w-full mx-auto space-y-4 pb-safe-bottom">
        <section class="bg-card-surface border border-border-hairline rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-ink-muted uppercase tracking-[0.08em]">
              Voyage Target
            </span>
            <span class="text-xs font-bold text-berry-gold">₱36,500</span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-border-hairline p-3">
              <span class="text-xs font-semibold text-joel-crimson">Joel</span>
              <p class="text-lg font-extrabold mt-0.5">₱0</p>
            </div>
            <div class="rounded-xl border border-border-hairline p-3">
              <span class="text-xs font-semibold text-claire-teal">Min Claire</span>
              <p class="text-lg font-extrabold mt-0.5">₱0</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
