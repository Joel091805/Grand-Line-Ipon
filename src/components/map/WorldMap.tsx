import { useMemo, useState } from 'preact/hooks';
import type { IponStore } from '../../store/useIponStore';
import type { IslandMeta, MonthNumber } from '../../types/ipon';
import {
  DAILY_TARGET,
  ISLANDS_2026,
  getMonthDays,
  isValidDateKey,
  parseDateKey,
} from '../../utils/calendar2026';
import { BerryCoinIcon, GoldStarIcon } from '../deck/deckIcons';
import { formatPeso } from '../deck/deckUtils';

export type MapScene = 'world' | 'grandline';

export interface WorldMapProps {
  store: IponStore;
  scene: MapScene;
  activeMonth: MonthNumber;
  onEnterGrandLine: () => void;
  onReturnToWorld: () => void;
  onSelectIsland: (month: MonthNumber) => void;
}

interface IslandProgress {
  island: IslandMeta;
  joelDays: number;
  claireDays: number;
  fullDays: number;
  earnedPeso: number;
  isCleared: boolean;
  missedCount: number;
  missedAmount: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

/**
 * Scene 2 & Scene 3: Midnight World Chart & Vertical 12-Island Grand Line Journey.
 * - Scene 2 ('world'): 390×844 midnight nautical chart centered on the Red Line.
 *   Tapping the glowing Grand Line band zooms into Scene 3.
 * - Scene 3 ('grandline'): Vertical 12-Island Journey (Jan–Dec) with golden Berry
 *   stamps for cleared months and Nami's alerts for incomplete months with arrears.
 *   Tapping any island node focuses it and slides open Scene 4 (IslandLedgerSheet).
 */
export function WorldMap({
  store,
  scene,
  activeMonth,
  onEnterGrandLine,
  onReturnToWorld,
  onSelectIsland,
}: WorldMapProps) {
  const days = store.days.value;
  const today = store.today.value;
  const voyagePercent = store.voyagePercent.value;
  const crewCount = store.unlockedCrewCount.value;
  const arrears = store.habulinArrears.value;

  const [zoomingToGrandLine, setZoomingToGrandLine] = useState(false);
  const [zoomingMonth, setZoomingMonth] = useState<MonthNumber | null>(null);

  const currentCalendarMonth = isValidDateKey(today) ? parseDateKey(today).month : activeMonth;

  const islandSummaries = useMemo<IslandProgress[]>(() => {
    return ISLANDS_2026.map((island) => {
      const monthDays = getMonthDays(island.month);
      let joelDays = 0;
      let claireDays = 0;
      let fullDays = 0;
      let missedCount = 0;

      for (const d of monthDays) {
        const rec = days[d.key];
        const jPaid = rec?.j === 1;
        const mPaid = rec?.m === 1;
        if (jPaid) joelDays++;
        if (mPaid) claireDays++;
        if (jPaid && mPaid) fullDays++;

        if (d.key < today) {
          if (!jPaid) missedCount++;
          if (!mPaid) missedCount++;
        }
      }

      return {
        island,
        joelDays,
        claireDays,
        fullDays,
        earnedPeso: (joelDays + claireDays) * DAILY_TARGET,
        isCleared: fullDays === island.daysInMonth,
        missedCount,
        missedAmount: missedCount * DAILY_TARGET,
        isCurrentMonth: island.month === currentCalendarMonth,
        isFutureMonth: island.startKey > today,
      };
    });
  }, [days, today, currentCalendarMonth]);

  const clearedCount = islandSummaries.filter((s) => s.isCleared).length;
  const currentIsland = ISLANDS_2026[currentCalendarMonth - 1];

  const handleTapGrandLine = () => {
    if (zoomingToGrandLine) return;
    setZoomingToGrandLine(true);
    window.setTimeout(() => {
      setZoomingToGrandLine(false);
      onEnterGrandLine();
    }, 180);
  };

  const handleTapIslandNode = (month: MonthNumber) => {
    setZoomingMonth(month);
    window.setTimeout(() => {
      setZoomingMonth(null);
      onSelectIsland(month);
    }, 140);
  };

  // Ship x-coordinate along the Grand Line band in Scene 2 (x: 28 -> 332)
  const shipChartX = 28 + Math.round((Math.min(100, Math.max(0, voyagePercent)) / 100) * 304);

  if (scene === 'world') {
    return (
      <section
        class={`flex-1 flex flex-col justify-between px-4 pt-3 pb-28 max-w-[390px] w-full mx-auto animate-map-zoom-out transition-transform duration-200 ${
          zoomingToGrandLine ? 'scale-110 opacity-70' : 'scale-100 opacity-100'
        }`}
        aria-label="Scene 2: Midnight World Chart"
        data-testid="scene-world-map"
      >
        {/* Chart Title Header */}
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div>
            <p class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-berry-gold">
              Midnight World Chart
            </p>
            <h1 class="text-base font-extrabold text-ink-ivory tracking-tight">
              The Red Line &amp; Grand Line
            </h1>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-sea-midnight border border-brass-hairline text-[11px] font-bold text-ink-ivory tabular-nums">
            {clearedCount}/12 Cleared
          </span>
        </div>

        {/* Interactive Red Line / Grand Line World Chart SVG Frame */}
        <div class="relative rounded-3xl bg-sea-midnight border border-brass-hairline overflow-hidden shadow-abyss-dock">
          <svg
            viewBox="0 0 360 430"
            class="block w-full h-auto"
            role="img"
            aria-label="Midnight World Chart centered on the Red Line with the Grand Line band"
          >
            <defs>
              <radialGradient id="worldSea" cx="50%" cy="50%" r="72%">
                <stop offset="0%" stop-color="#142B47" />
                <stop offset="65%" stop-color="#0D1F36" />
                <stop offset="100%" stop-color="#07111E" />
              </radialGradient>
              <linearGradient id="redLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#7F1D1D" stop-opacity="0.88" />
                <stop offset="50%" stop-color="#B93829" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#6B1818" stop-opacity="0.88" />
              </linearGradient>
              <linearGradient id="grandLineBand" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#E5A93C" stop-opacity="0.16" />
                <stop offset="50%" stop-color="#E5A93C" stop-opacity="0.34" />
                <stop offset="100%" stop-color="#E5A93C" stop-opacity="0.18" />
              </linearGradient>
            </defs>

            {/* Abyssal Chart Background */}
            <rect width="360" height="430" fill="url(#worldSea)" />

            {/* Nautical Latitude / Longitude Grid */}
            <g stroke="rgba(229, 169, 60, 0.1)" stroke-width="1">
              <line x1="0" y1="86" x2="360" y2="86" />
              <line x1="0" y1="344" x2="360" y2="344" />
              <line x1="90" y1="0" x2="90" y2="430" />
              <line x1="270" y1="0" x2="270" y2="430" />
              <circle cx="180" cy="215" r="142" fill="none" stroke-dasharray="4 6" />
              <circle cx="180" cy="215" r="94" fill="none" />
            </g>

            {/* Compass Rose Watermark (Top-Left Quadrant) */}
            <g transform="translate(52 54)" opacity="0.55">
              <circle cx="0" cy="0" r="20" fill="none" stroke="#E5A93C" stroke-width="0.9" />
              <path d="M0 -24 L4 -4 L24 0 L4 4 L0 24 L-4 4 L-24 0 L-4 -4 Z" fill="rgba(229,169,60,0.22)" stroke="#E5A93C" stroke-width="0.8" />
              <text x="0" y="-27" text-anchor="middle" fill="#E5A93C" font-size="8" font-weight="800">
                N
              </text>
            </g>

            {/* Four Blues Labels */}
            <g fill="#8FA3BF" font-size="10" font-weight="700" letter-spacing="2.2" opacity="0.72">
              <text x="86" y="108" text-anchor="middle">NORTH BLUE</text>
              <text x="274" y="108" text-anchor="middle">EAST BLUE</text>
              <text x="86" y="334" text-anchor="middle">WEST BLUE</text>
              <text x="274" y="334" text-anchor="middle">SOUTH BLUE</text>
            </g>

            {/* Vertical Red Line Continent centered at x=180 */}
            <path
              d="M162 0 L198 0 L194 115 L201 215 L193 315 L198 430 L162 430 L166 315 L159 215 L167 115 Z"
              fill="url(#redLineGrad)"
              stroke="rgba(229, 169, 60, 0.45)"
              stroke-width="1.2"
            />
            <text
              x="180"
              y="72"
              text-anchor="middle"
              fill="#F5F0E6"
              font-size="9"
              font-weight="800"
              letter-spacing="2.5"
              opacity="0.9"
            >
              RED LINE
            </text>
            <text
              x="180"
              y="378"
              text-anchor="middle"
              fill="#F5F0E6"
              font-size="9"
              font-weight="800"
              letter-spacing="2.5"
              opacity="0.9"
            >
              RED LINE
            </text>

            {/* Calm Belt Boundaries */}
            <line
              x1="0"
              y1="164"
              x2="360"
              y2="164"
              stroke="rgba(229, 169, 60, 0.45)"
              stroke-width="1.2"
              stroke-dasharray="5 5"
            />
            <line
              x1="0"
              y1="266"
              x2="360"
              y2="266"
              stroke="rgba(229, 169, 60, 0.45)"
              stroke-width="1.2"
              stroke-dasharray="5 5"
            />

            {/* Highlighted Grand Line Band (y: 164..266) */}
            <rect x="0" y="164" width="360" height="102" fill="url(#grandLineBand)" />

            {/* Grand Line Sea Route Line + 12 Miniature Island Dots */}
            <path
              d="M 24 215 Q 72 194, 120 215 T 216 215 T 336 215"
              fill="none"
              stroke="#E5A93C"
              stroke-width="2"
              stroke-dasharray="4 4"
              opacity="0.85"
            />

            {islandSummaries.map((item, idx) => {
              const x = 28 + Math.round((idx / 11) * 304);
              const y = idx % 2 === 0 ? 208 : 222;
              const fill = item.isCleared
                ? '#E5A93C'
                : item.missedCount > 0
                  ? '#E04332'
                  : item.isCurrentMonth
                    ? '#22A6B8'
                    : '#142B47';
              return (
                <g key={item.island.monthKey}>
                  <circle
                    cx={x}
                    cy={y}
                    r={item.isCurrentMonth ? 6 : 4.2}
                    fill={fill}
                    stroke="#F5F0E6"
                    stroke-width={item.isCurrentMonth ? 1.8 : 1}
                  />
                </g>
              );
            })}

            {/* Reverse Mountain Crossing Crest */}
            <circle cx="180" cy="215" r="14" fill="#07111E" stroke="#E5A93C" stroke-width="1.8" />
            <text x="180" y="218" text-anchor="middle" fill="#E5A93C" font-size="8" font-weight="800">
              GL
            </text>

            {/* Current Sunny Position Beacon */}
            <g transform={`translate(${shipChartX} 188)`}>
              <circle cx="0" cy="0" r="8" fill="rgba(229, 169, 60, 0.25)" />
              <polygon points="0,-6 6,4 -6,4" fill="#E5A93C" stroke="#07111E" stroke-width="1" />
            </g>

            {/* Calm Belt / Band Labels */}
            <text
              x="180"
              y="156"
              text-anchor="middle"
              fill="#8FA3BF"
              font-size="8"
              font-weight="700"
              letter-spacing="2"
            >
              CALM BELT
            </text>
            <text
              x="180"
              y="280"
              text-anchor="middle"
              fill="#8FA3BF"
              font-size="8"
              font-weight="700"
              letter-spacing="2"
            >
              CALM BELT
            </text>
          </svg>

          {/* Interactive Tap Target Over the Grand Line Band */}
          <button
            type="button"
            onClick={handleTapGrandLine}
            data-testid="enter-grandline-btn"
            aria-label="Tap Grand Line band to zoom into the 12-Island Journey"
            class="absolute inset-x-0 top-[36%] h-[28%] flex flex-col items-center justify-end pb-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-berry-gold"
          >
            <span class="relative inline-flex items-center gap-1.5 rounded-full bg-sea-abyss/90 border border-berry-gold px-4 py-1.5 text-xs font-extrabold tracking-wide text-berry-gold shadow-brass-glow group-active:scale-95 transition-transform">
              <span class="w-2 h-2 rounded-full bg-berry-gold animate-pulse" aria-hidden="true" />
              <span>Enter the Grand Line</span>
              <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>

        {/* Compact Voyage Status Strip */}
        <div class="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleTapGrandLine}
            class="rounded-2xl bg-sea-midnight border border-brass-hairline p-3 text-left active:scale-[0.98] transition-transform"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mist">
              Current Island
            </p>
            <p class="mt-0.5 text-xs font-extrabold text-ink-ivory truncate">
              {currentIsland.monthAbbr} • {currentIsland.name}
            </p>
            <p class="mt-1 text-[11px] font-semibold text-berry-gold tabular-nums">
              {crewCount}/10 Straw Hats on deck
            </p>
          </button>

          <button
            type="button"
            onClick={handleTapGrandLine}
            class={`rounded-2xl border p-3 text-left active:scale-[0.98] transition-transform ${
              arrears.hasArrears
                ? 'bg-joel-crimson/15 border-joel-crimson/55'
                : 'bg-sea-midnight border-brass-hairline'
            }`}
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mist">
              Nami&apos;s Ledger
            </p>
            {arrears.hasArrears ? (
              <>
                <p class="mt-0.5 text-xs font-extrabold text-joel-crimson tabular-nums">
                  {formatPeso(arrears.combinedAmount)} Arrears
                </p>
                <p class="mt-1 text-[11px] font-semibold text-ink-ivory/80 tabular-nums">
                  {arrears.combinedCount} missed deposits
                </p>
              </>
            ) : (
              <>
                <p class="mt-0.5 text-xs font-extrabold text-berry-gold">All Caught Up ✓</p>
                <p class="mt-1 text-[11px] font-semibold text-ink-mist">Smooth sailing</p>
              </>
            )}
          </button>
        </div>
      </section>
    );
  }

  // Scene 3: Vertical 12-Island Grand Line Journey
  return (
    <section
      class="flex-1 px-4 pt-3 pb-28 max-w-[390px] w-full mx-auto animate-map-zoom-in"
      aria-label="Scene 3: 12-Island Grand Line Journey"
      data-testid="scene-grandline-journey"
    >
      {/* Scene 3 Navigation Bar */}
      <div class="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={onReturnToWorld}
          class="inline-flex items-center gap-1.5 rounded-full bg-sea-midnight border border-brass-hairline px-3 py-1.5 min-h-[34px] text-xs font-bold text-ink-ivory active:scale-95 transition-transform"
          aria-label="Zoom back out to Midnight World Chart"
        >
          <span aria-hidden="true">←</span>
          <span>World Chart</span>
        </button>

        <div class="text-right">
          <p class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-berry-gold">
            12-Island Route
          </p>
          <p class="text-[11px] font-bold text-ink-mist tabular-nums">
            {clearedCount}/12 Cleared • {crewCount}/10 Crew
          </p>
        </div>
      </div>

      {/* Vertical 12-Island Spine & Interactive Nodes */}
      <div class="relative pl-6 space-y-3">
        {/* Continuous Vertical Nautical Route Spine */}
        <div
          class="pointer-events-none absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-berry-gold via-brass-hairline to-sea-elevated"
          aria-hidden="true"
        />

        {islandSummaries.map((item) => {
          const { island, fullDays, isCleared, missedCount, missedAmount, isCurrentMonth, isFutureMonth } =
            item;
          const isZooming = zoomingMonth === island.month;
          const pct = Math.round((item.earnedPeso / island.combinedTarget) * 100);
          const hasNamiAlert = !isCleared && missedCount > 0;

          return (
            <button
              key={island.monthKey}
              type="button"
              onClick={() => handleTapIslandNode(island.month)}
              data-testid={`island-node-${island.month}`}
              aria-label={`Island ${island.month}: ${island.name} (${island.monthName} 2026) — ${fullDays} of ${island.daysInMonth} full days${
                hasNamiAlert ? `, ${missedCount} missed deposits` : ''
              }`}
              class={`relative w-full text-left rounded-2xl border p-3.5 transition-all active:scale-[0.98] ${
                isZooming ? 'scale-[1.03] border-berry-gold shadow-brass-glow' : ''
              } ${
                isCleared
                  ? 'bg-sea-midnight/95 border-berry-gold/55'
                  : hasNamiAlert
                    ? 'bg-sea-midnight border-joel-crimson/55'
                    : isCurrentMonth
                      ? 'bg-sea-elevated/90 border-berry-gold/70 shadow-brass-glow'
                      : 'bg-sea-midnight/75 border-brass-hairline'
              } ${isFutureMonth && item.earnedPeso === 0 ? 'opacity-70' : ''}`}
            >
              {/* Route Spine Node Marker */}
              <span
                class={`absolute -left-[25px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isCleared
                    ? 'bg-berry-gold border-sea-abyss text-sea-abyss'
                    : hasNamiAlert
                      ? 'bg-joel-crimson border-sea-abyss text-ink-ivory'
                      : isCurrentMonth
                        ? 'bg-claire-teal border-berry-gold text-sea-abyss'
                        : 'bg-sea-elevated border-brass-hairline'
                }`}
                aria-hidden="true"
              >
                {isCleared ? (
                  <span class="text-[10px] font-black leading-none">✓</span>
                ) : hasNamiAlert ? (
                  <span class="text-[10px] font-black leading-none">!</span>
                ) : isCurrentMonth ? (
                  <span class="w-1.5 h-1.5 rounded-full bg-ink-ivory" />
                ) : null}
              </span>

              <div class="flex items-center justify-between gap-2.5">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-berry-gold tabular-nums">
                      {island.monthAbbr} • #{island.month}
                    </span>
                    {isCurrentMonth && (
                      <span class="px-1.5 py-0.5 rounded bg-claire-teal/20 border border-claire-teal/50 text-[9px] font-extrabold uppercase tracking-wider text-claire-teal">
                        Log Pose
                      </span>
                    )}
                  </div>

                  <h2 class="mt-0.5 text-sm font-extrabold text-ink-ivory truncate">
                    {island.name}
                  </h2>

                  <div class="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-ink-mist tabular-nums">
                    <span>
                      {fullDays}/{island.daysInMonth} full
                    </span>
                    <span>•</span>
                    <span class="text-ink-ivory/90">{formatPeso(item.earnedPeso)}</span>
                  </div>

                  {/* Mini Island Completion Bar */}
                  <div class="mt-2 h-1.5 w-full rounded-full bg-sea-abyss overflow-hidden">
                    <div
                      class={`h-full rounded-full transition-all duration-300 ${
                        isCleared
                          ? 'bg-berry-gold'
                          : hasNamiAlert
                            ? 'bg-gradient-to-r from-joel-crimson to-berry-gold'
                            : 'bg-claire-teal'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {/* Right Visual Stamp: Golden Berry Stamp OR Nami Alert OR Progress % */}
                <div class="shrink-0 flex flex-col items-end justify-center">
                  {isCleared ? (
                    <div
                      class="w-12 h-12 rounded-full bg-berry-gold/20 border-2 border-berry-gold flex flex-col items-center justify-center shadow-brass-glow -rotate-6"
                      title="Island Cleared"
                    >
                      <BerryCoinIcon class="w-5 h-5" />
                      <span class="text-[8px] font-black uppercase tracking-wider text-berry-gold leading-none mt-0.5">
                        Clear
                      </span>
                    </div>
                  ) : hasNamiAlert ? (
                    <div class="flex flex-col items-end gap-1">
                      <span class="inline-flex items-center gap-1 rounded-full bg-joel-crimson/20 border border-joel-crimson px-2 py-0.5 text-[10px] font-extrabold text-joel-crimson tabular-nums">
                        <span>Nami!</span>
                        <span>-{formatPeso(missedAmount)}</span>
                      </span>
                      <span class="text-[10px] font-bold text-ink-mist tabular-nums">
                        {missedCount} missed
                      </span>
                    </div>
                  ) : (
                    <div class="flex flex-col items-end gap-0.5">
                      <span class="inline-flex items-center gap-1 text-xs font-extrabold text-ink-ivory tabular-nums">
                        {pct}%
                        {island.month === 12 && <GoldStarIcon class="w-3.5 h-3.5 text-berry-gold" />}
                      </span>
                      <span class="text-[10px] font-semibold text-ink-mist">
                        {isFutureMonth ? 'Ahead' : 'Open →'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
