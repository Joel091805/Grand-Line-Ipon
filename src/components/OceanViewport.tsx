/**
 * Standalone `<OceanViewport />` Preact wrapper for the 60fps Hi-Bit `<canvas>`
 * Ocean Engine (Phase 2).
 *
 * - Keeps all 60fps animation loops strictly inside `OceanEngine` via
 *   `requestAnimationFrame` — Preact state only tracks discrete UI affordances
 *   (`isIntroDone` for the `Skip →` trigger and `chestState` for accessibility).
 * - Syncs `unlockedCrewCount` and deposit/habulin events from `useIponStore`.
 * - Exposes `spawnBerryArc(fromX, fromY)` for Phase 3/4 coin deposit triggers.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  IPHONE13_HEIGHT,
  IPHONE13_WIDTH,
  OceanEngine,
  SETTLED_VIEWPORT_HEIGHT,
  type IntroPhase,
  type SpawnBerryOptions,
} from '../engine/oceanEngine';
import type { ChestState } from '../engine/sprites';
import { useIponStore, type IponStore } from '../store/useIponStore';

let activeOceanEngine: OceanEngine | null = null;

/**
 * Imperative helper that Phase 3/4 components can call directly when a ₱50/₱100
 * deposit or Habulin batch-settle is triggered from any button or calendar cell.
 */
export function spawnBerryArc(
  fromX: number,
  fromY: number,
  options?: SpawnBerryOptions,
): void {
  activeOceanEngine?.spawnBerryArc(fromX, fromY, options);
}

/** Returns the currently mounted `OceanEngine` instance, if any. */
export function getActiveOceanEngine(): OceanEngine | null {
  return activeOceanEngine;
}

export interface OceanViewportProps {
  /** Optional store instance (defaults to app singleton via `useIponStore()`). */
  store?: IponStore;
  /** Optional explicit crew count override (`0..10`). */
  crewCount?: number;
  /** Skip the 4.2s Thousand Sunny intro sequence on mount. */
  skipIntro?: boolean;
  /** Callback fired once when the 4.2s intro settles or is skipped. */
  onIntroComplete?: () => void;
  /** Callback fired when the Treasure Chest is tapped / changes state. */
  onChestToggle?: (state: ChestState) => void;
  /** Callback providing imperative access to the underlying `OceanEngine`. */
  onEngineReady?: (engine: OceanEngine) => void;
  /** Optional CSS class names for the outer viewport container. */
  className?: string;
}

export function OceanViewport({
  store: customStore,
  crewCount: crewCountProp,
  skipIntro = false,
  onIntroComplete,
  onChestToggle,
  onEngineReady,
  className = '',
}: OceanViewportProps) {
  const defaultStore = useIponStore();
  const store = customStore ?? defaultStore;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<OceanEngine | null>(null);

  // Only discrete phase transitions update Preact state (never 60fps frames)
  const [introPhase, setIntroPhase] = useState<IntroPhase>(skipIntro ? 'settled' : 'dawn');
  const [chestState, setChestState] = useState<ChestState>('closed');

  const resolvedCrewCount = crewCountProp ?? store.unlockedCrewCount.value;
  const voyagePercent = store.voyagePercent.value;

  // Mount and start the 60fps imperative canvas engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;

    const measureWidth = () =>
      Math.min(IPHONE13_WIDTH, Math.max(320, container?.clientWidth || IPHONE13_WIDTH));
    const measureFullHeight = () =>
      typeof window !== 'undefined' && window.innerHeight
        ? Math.min(IPHONE13_HEIGHT, Math.max(560, window.innerHeight))
        : IPHONE13_HEIGHT;

    const fullH = measureFullHeight();
    const settledH = Math.round(fullH * 0.3) || SETTLED_VIEWPORT_HEIGHT;

    const engine = new OceanEngine({
      canvas,
      container,
      initialCrewCount: resolvedCrewCount,
      skipIntroOnStart: skipIntro,
      manageContainerHeight: true,
      baseWidth: measureWidth(),
      fullHeight: fullH,
      settledHeight: settledH,
      onPhaseChange: (nextPhase) => {
        setIntroPhase(nextPhase);
      },
      onIntroComplete: () => {
        setIntroPhase('settled');
        onIntroComplete?.();
      },
      onChestStateChange: (nextChestState) => {
        setChestState(nextChestState);
        onChestToggle?.(nextChestState);
      },
    });

    engineRef.current = engine;
    activeOceanEngine = engine;
    onEngineReady?.(engine);
    engine.start();

    const handleResize = () => {
      const w = measureWidth();
      const currentH =
        engine.getState().phase === 'settled'
          ? settledH
          : container?.clientHeight || fullH;
      engine.configurePixelGrid(w, currentH);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      if (activeOceanEngine === engine) {
        activeOceanEngine = null;
      }
      engineRef.current = null;
    };
  }, []);

  // Push crewCount updates into the canvas engine without restarting the RAF loop
  useEffect(() => {
    engineRef.current?.setCrewCount(resolvedCrewCount);
  }, [resolvedCrewCount]);

  // Listen for store deposit / habulin events and launch flying Berry coins
  useEffect(() => {
    const unsubscribe = store.subscribe((event) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (event.type === 'deposit' && event.paid) {
        const snap = engine.getState();
        engine.spawnBerryArc(snap.viewportWidth * 0.5, snap.viewportHeight + 36, {
          count: event.fullDay ? 2 : 1,
          coordinateSpace: 'canvas',
        });
      } else if (event.type === 'habulin' && event.dates.length > 0) {
        const snap = engine.getState();
        engine.spawnBerryArc(snap.viewportWidth * 0.35, snap.viewportHeight + 40, {
          count: Math.min(8, event.dates.length),
          coordinateSpace: 'canvas',
        });
      }
    });
    return unsubscribe;
  }, [store]);

  const handleSkipIntro = (e: MouseEvent) => {
    e.stopPropagation();
    engineRef.current?.skipIntro();
  };

  const handleCanvasPointerDown = (e: PointerEvent) => {
    engineRef.current?.handlePointerTap(e.clientX, e.clientY);
  };

  const handleChestButtonClick = (e: MouseEvent) => {
    e.stopPropagation();
    engineRef.current?.tapChest();
  };

  const isIntroRunning = introPhase !== 'settled';
  const showChestHitTarget =
    introPhase === 'burst' || introPhase === 'settle' || introPhase === 'settled';

  return (
    <div
      ref={containerRef}
      style={{
        height: skipIntro ? `${SETTLED_VIEWPORT_HEIGHT}px` : `${IPHONE13_HEIGHT}px`,
      }}
      class={`relative w-full max-w-[390px] mx-auto overflow-hidden bg-ocean-deep select-none shrink-0 ${className}`.trim()}
      data-testid="ocean-viewport"
      data-intro-phase={introPhase}
      data-chest-state={chestState}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        class="pixelated block w-full h-full cursor-pointer"
        aria-label={`Grand Line Ocean Viewport — Thousand Sunny with ${resolvedCrewCount} of 10 Straw Hat crew on deck`}
      />

      {/* Top HUD Status Pill: Crew Count & Voyage Progress */}
      <div class="pointer-events-none absolute top-3 left-3 flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-ocean-deep/80 border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm">
          <span class="inline-block h-2 w-2 rounded-full bg-berry-gold" />
          <span>{resolvedCrewCount}/10 Crew</span>
          <span class="text-white/50">•</span>
          <span class="text-berry-gold">{voyagePercent.toFixed(1)}%</span>
        </span>
      </div>

      {/* Skip → Trigger (visible during the 4.2s intro sequence) */}
      {isIntroRunning && (
        <button
          type="button"
          onClick={handleSkipIntro}
          class="
            absolute top-3 right-3 z-10
            inline-flex items-center gap-1
            rounded-full bg-ocean-deep/85 hover:bg-ocean-mid active:scale-95
            border border-berry-gold/60
            px-3 py-1.5 min-h-[36px]
            text-xs font-extrabold tracking-wide text-berry-gold
            shadow-md transition-transform
          "
          aria-label="Skip intro animation"
          data-testid="skip-intro-btn"
        >
          Skip <span aria-hidden="true">→</span>
        </button>
      )}

      {/* Clickable Treasure Chest Hit Target & Status Badge on Foreground Wave */}
      {showChestHitTarget && (
        <button
          type="button"
          onClick={handleChestButtonClick}
          class="
            absolute bottom-3 right-4 z-10
            w-16 h-14 rounded-xl
            flex items-end justify-center pb-0.5
            focus:outline-none focus-visible:ring-2 focus-visible:ring-berry-gold
          "
          aria-label={
            chestState === 'open'
              ? 'Treasure Chest open with Berry gold glow — tap to close'
              : 'Treasure Chest — tap to pop open'
          }
          aria-pressed={chestState === 'open' || chestState === 'opening'}
          data-testid="treasure-chest-trigger"
        >
          <span class="px-1.5 py-0.5 rounded bg-ocean-deep/80 border border-berry-gold/50 text-[10px] font-extrabold uppercase tracking-wider text-berry-gold">
            {chestState === 'open' ? 'Open ★' : 'Chest'}
          </span>
        </button>
      )}
    </div>
  );
}

export default OceanViewport;
