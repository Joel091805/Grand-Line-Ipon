/**
 * Grand Line Ipon — 60fps Procedural Hi-Bit `<canvas>` Ocean Engine (Phase 2).
 *
 * Responsibilities:
 * - Crisp integer hi-bit pixel rendering (`imageSmoothingEnabled = false`)
 *   with `devicePixelRatio` scaling tailored for a 390×844 iPhone 13 viewport.
 * - 4.2-second Thousand Sunny Intro Sequence:
 *     0.0s–1.0s (`dawn`)   : 3-layer parallax dawn ocean build
 *     1.0s–2.4s (`enter`)  : Thousand Sunny enters with Luffy, Nami & Zoro on deck
 *     2.4s–3.5s (`burst`)  : Mini Coup de Burst steam boost revealing the clickable
 *                            Treasure Chest emerging from the foreground wave
 *     3.5s–4.2s (`settle`) : Smooth settle into the top 30% ocean viewport
 * - Clickable Treasure Chest (`closed` -> `opening` -> `open` with gold glow).
 * - `spawnBerryArc(fromX, fromY)` flying Berry coin particle emitter for Phase 3/4.
 * - All 60fps frame updates stay inside `requestAnimationFrame` (zero Preact state).
 */

import {
  CREW_SPRITE_SPECS,
  HI_BIT_PALETTE,
  PIXEL_SIZE,
  drawBerryCoin,
  drawPixelPuff,
  drawThousandSunny,
  drawTreasureChest,
  pxRect,
  snap,
  type ChestHitBox,
  type ChestState,
} from './sprites';

export const IPHONE13_WIDTH = 390;
export const IPHONE13_HEIGHT = 844;
export const SETTLED_HEIGHT_RATIO = 0.3;
export const SETTLED_VIEWPORT_HEIGHT = Math.round(IPHONE13_HEIGHT * SETTLED_HEIGHT_RATIO); // 253px

export const INTRO_TIMELINE = {
  DAWN_START: 0.0,
  DAWN_END: 1.0,
  ENTER_END: 2.4,
  BURST_END: 3.5,
  SETTLE_END: 4.2,
} as const;

export type IntroPhase = 'dawn' | 'enter' | 'burst' | 'settle' | 'settled';

export interface BerryCoinParticle {
  id: number;
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  targetX: number;
  targetY: number;
  elapsed: number;
  duration: number;
  spinSpeed: number;
  spinPhase: number;
}

export interface SteamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radiusUnits: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface SpawnBerryOptions {
  /** Number of coins to launch in a staggered burst (default 1). */
  count?: number;
  /** Flight duration in seconds for each coin (default 0.62s). */
  duration?: number;
  /** Whether `(fromX, fromY)` are viewport `clientX/clientY` coords (auto-detected if > canvas height). */
  coordinateSpace?: 'canvas' | 'client' | 'auto';
}

export interface OceanEngineOptions {
  canvas: HTMLCanvasElement;
  /** Optional wrapper element whose height smoothly transitions during 3.5s–4.2s settle. */
  container?: HTMLElement | null;
  /** Initial unlocked Straw Hat crew count (default 9 for ₱26,950). */
  initialCrewCount?: number;
  /** Whether to start directly in the settled post-intro state (default false). */
  skipIntroOnStart?: boolean;
  /** Whether the engine manages container height from 100% -> 30% during settle (default true). */
  manageContainerHeight?: boolean;
  /** Logical viewport width fallback (default 390). */
  baseWidth?: number;
  /** Logical full-screen viewport height fallback (default 844). */
  fullHeight?: number;
  /** Logical settled top-30% height fallback (default 253). */
  settledHeight?: number;
  /** Fired only on discrete intro phase changes (never every frame). */
  onPhaseChange?: (phase: IntroPhase) => void;
  /** Fired once when the 4.2s intro finishes or `skipIntro()` is triggered. */
  onIntroComplete?: () => void;
  /** Fired when the Treasure Chest state changes (`closed` | `opening` | `open`). */
  onChestStateChange?: (state: ChestState) => void;
}

export interface OceanEngineSnapshot {
  elapsed: number;
  phase: IntroPhase;
  isIntroComplete: boolean;
  crewCount: number;
  renderedCrewCount: number;
  chestState: ChestState;
  chestOpenProgress: number;
  chestEmergence: number;
  chestBounds: ChestHitBox;
  activeBerryCoins: number;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
}

// ---------------------------------------------------------------------------
// Easing utilities
// ---------------------------------------------------------------------------

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function easeOutBack(t: number): number {
  const c = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

export function getIntroPhase(elapsed: number): IntroPhase {
  if (elapsed < INTRO_TIMELINE.DAWN_END) return 'dawn';
  if (elapsed < INTRO_TIMELINE.ENTER_END) return 'enter';
  if (elapsed < INTRO_TIMELINE.BURST_END) return 'burst';
  if (elapsed < INTRO_TIMELINE.SETTLE_END) return 'settle';
  return 'settled';
}

// ---------------------------------------------------------------------------
// OceanEngine class
// ---------------------------------------------------------------------------

export class OceanEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly container: HTMLElement | null;
  private readonly manageContainerHeight: boolean;

  private readonly onPhaseChange?: (phase: IntroPhase) => void;
  private readonly onIntroComplete?: () => void;
  private readonly onChestStateChange?: (state: ChestState) => void;

  private width: number;
  private height: number;
  private readonly fullHeight: number;
  private readonly settledHeight: number;
  private dpr: number = 1;

  private elapsed: number = 0;
  private phase: IntroPhase = 'dawn';
  private introCompletedNotified: boolean = false;
  private crewCount: number;

  private chestState: ChestState = 'closed';
  private chestOpenProgress: number = 0;
  private chestAutoCloseTimer: number = 0;
  private chestBounds: ChestHitBox = { x: 295, y: 170, width: 64, height: 56 };

  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private running: boolean = false;

  private nextCoinId: number = 1;
  private readonly berryCoins: BerryCoinParticle[] = [];
  private readonly steamParticles: SteamParticle[] = [];
  private readonly sparkles: SparkleParticle[] = [];
  private burstSteamTimer: number = 0;

  constructor(options: OceanEngineOptions) {
    this.canvas = options.canvas;
    this.ctx =
      typeof options.canvas.getContext === 'function'
        ? options.canvas.getContext('2d', { alpha: false })
        : null;
    this.container = options.container ?? null;
    this.manageContainerHeight = options.manageContainerHeight ?? true;

    this.onPhaseChange = options.onPhaseChange;
    this.onIntroComplete = options.onIntroComplete;
    this.onChestStateChange = options.onChestStateChange;

    this.width = options.baseWidth ?? IPHONE13_WIDTH;
    this.fullHeight = options.fullHeight ?? IPHONE13_HEIGHT;
    this.settledHeight = options.settledHeight ?? SETTLED_VIEWPORT_HEIGHT;
    this.height = options.skipIntroOnStart ? this.settledHeight : this.fullHeight;
    this.crewCount = Math.max(0, Math.min(10, options.initialCrewCount ?? 9));

    if (options.skipIntroOnStart) {
      this.elapsed = INTRO_TIMELINE.SETTLE_END;
      this.phase = 'settled';
      this.introCompletedNotified = true;
    }

    this.configurePixelGrid(this.width, this.height);
    this.renderFrame();
  }

  /**
   * Enforces an integer hi-bit pixel grid with `imageSmoothingEnabled = false`
   * and crisp `devicePixelRatio` backing store scaling.
   */
  public configurePixelGrid(cssWidth?: number, cssHeight?: number, customDpr?: number): void {
    const rawDpr =
      customDpr ?? (typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1);
    // Clamp DPR between 1 and 3 and snap backing dimensions to integers
    this.dpr = Math.max(1, Math.min(3, rawDpr));

    const targetW = Math.max(1, Math.round(cssWidth ?? (this.canvas.clientWidth || IPHONE13_WIDTH)));
    const targetH = Math.max(1, Math.round(cssHeight ?? (this.canvas.clientHeight || this.height)));

    this.width = targetW;
    this.height = targetH;

    const backingW = Math.round(targetW * this.dpr);
    const backingH = Math.round(targetH * this.dpr);

    if (this.canvas.width !== backingW || this.canvas.height !== backingH) {
      this.canvas.width = backingW;
      this.canvas.height = backingH;
    }

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /** Start the 60fps `requestAnimationFrame` loop. */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = null;
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  /** Pause the `requestAnimationFrame` loop. */
  public stop(): void {
    this.running = false;
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
  }

  /** Stop the loop and release references. */
  public destroy(): void {
    this.stop();
    this.berryCoins.length = 0;
    this.steamParticles.length = 0;
    this.sparkles.length = 0;
  }

  /**
   * Immediately jumps to the settled post-intro state (4.2s) and docks
   * into the top 30% ocean viewport.
   */
  public skipIntro(): void {
    const wasSettled = this.phase === 'settled';
    this.elapsed = Math.max(this.elapsed, INTRO_TIMELINE.SETTLE_END);
    this.phase = 'settled';

    if (this.manageContainerHeight && this.container) {
      this.container.style.height = `${this.settledHeight}px`;
    }
    this.configurePixelGrid(this.width, this.settledHeight, this.dpr);

    if (!wasSettled) {
      this.onPhaseChange?.('settled');
    }
    if (!this.introCompletedNotified) {
      this.introCompletedNotified = true;
      this.onIntroComplete?.();
    }
    this.renderFrame();
  }

  /** Update the Straw Hat crew count on deck (`0..10`) without Preact state re-renders. */
  public setCrewCount(count: number): void {
    const next = Math.max(0, Math.min(CREW_SPRITE_SPECS.length, Math.floor(count)));
    if (next !== this.crewCount) {
      this.crewCount = next;
      if (!this.running) this.renderFrame();
    }
  }

  /** Returns the current Treasure Chest state (`closed` | `opening` | `open`). */
  public getChestState(): ChestState {
    return this.chestState;
  }

  /** Explicitly set the Treasure Chest state. */
  public setChestState(next: ChestState): void {
    if (this.chestState === next) return;
    this.chestState = next;
    if (next === 'closed') {
      this.chestOpenProgress = 0;
      this.chestAutoCloseTimer = 0;
    } else if (next === 'open') {
      this.chestOpenProgress = 1;
    }
    this.onChestStateChange?.(next);
    if (!this.running) this.renderFrame();
  }

  /**
   * Toggles / pops open the clickable Treasure Chest with a golden sparkle burst.
   * Can be triggered via canvas tap or accessible button overlay.
   */
  public tapChest(): ChestState {
    // Make sure chest is visible if tapped early
    if (this.elapsed < INTRO_TIMELINE.ENTER_END) {
      this.skipIntro();
    }

    if (this.chestState === 'closed') {
      this.chestState = 'opening';
      this.chestOpenProgress = Math.max(0.15, this.chestOpenProgress);
      this.chestAutoCloseTimer = 0;
      this.spawnChestSparkleBurst(14);
      this.onChestStateChange?.('opening');
    } else if (this.chestState === 'opening') {
      this.chestState = 'open';
      this.chestOpenProgress = 1;
      this.spawnChestSparkleBurst(10);
      this.onChestStateChange?.('open');
    } else {
      this.chestState = 'closed';
      this.chestOpenProgress = 0;
      this.chestAutoCloseTimer = 0;
      this.onChestStateChange?.('closed');
    }

    if (!this.running) this.renderFrame();
    return this.chestState;
  }

  /**
   * Hit-tests a pointer tap (`clientX, clientY` or canvas-relative coordinates).
   * Returns `true` if the tap landed on the Treasure Chest and popped it.
   */
  public handlePointerTap(clientX: number, clientY: number): boolean {
    if (this.getChestEmergence() < 0.25) return false;
    const pt = this.toCanvasCoords(clientX, clientY, 'auto');
    // Expand hit area slightly for comfortable touch ergonomics
    const pad = 10;
    const b = this.chestBounds;
    const hit =
      pt.x >= b.x - pad &&
      pt.x <= b.x + b.width + pad &&
      pt.y >= b.y - pad &&
      pt.y <= b.y + b.height + pad;

    if (hit) {
      this.tapChest();
    }
    return hit;
  }

  /**
   * Spawns a parabolic arc of flying Berry coins from `(fromX, fromY)` into the
   * Treasure Chest on the foreground wave. Phase 3/4 deposit buttons and calendar
   * cells call this method directly when coins are dropped.
   */
  public spawnBerryArc(fromX: number, fromY: number, options: SpawnBerryOptions = {}): void {
    const count = Math.max(1, Math.min(24, Math.floor(options.count ?? 1)));
    const baseDuration = Math.max(0.25, options.duration ?? 0.62);
    const space = options.coordinateSpace ?? 'auto';
    const start = this.toCanvasCoords(fromX, fromY, space);

    const targetX = this.chestBounds.x + this.chestBounds.width * 0.5;
    const targetY = this.chestBounds.y + this.chestBounds.height * 0.45;

    // Pop the chest into `opening` state as coins launch toward it
    if (this.chestState === 'closed') {
      this.chestState = 'opening';
      this.chestOpenProgress = Math.max(0.2, this.chestOpenProgress);
      this.onChestStateChange?.('opening');
    }
    this.chestAutoCloseTimer = 2.4;

    for (let i = 0; i < count; i++) {
      const spreadX = (i - (count - 1) / 2) * 12;
      const sx = start.x + spreadX * 0.35;
      const sy = start.y;
      const midX = (sx + targetX) * 0.5 + spreadX;
      const apexY = Math.min(sy, targetY) - (68 + (i % 3) * 16);

      this.berryCoins.push({
        id: this.nextCoinId++,
        startX: sx,
        startY: sy,
        controlX: midX,
        controlY: apexY,
        targetX,
        targetY,
        elapsed: -i * 0.055, // slight stagger for multi-coin bursts
        duration: baseDuration + (i % 3) * 0.04,
        spinSpeed: 14 + (i % 4) * 2,
        spinPhase: i * 1.1,
      });
    }

    if (!this.running) this.renderFrame();
  }

  /** Advance the simulation deterministically by `dtSeconds` and render a frame. */
  public step(dtSeconds: number): void {
    const dt = Math.max(0, Math.min(0.1, dtSeconds));
    const prevPhase = this.phase;
    this.elapsed += dt;
    const nextPhase = getIntroPhase(this.elapsed);
    this.phase = nextPhase;

    // Dynamically interpolate viewport height during the 3.5s–4.2s settle phase
    if (nextPhase === 'settle') {
      const t = easeInOutCubic(
        (this.elapsed - INTRO_TIMELINE.BURST_END) /
          (INTRO_TIMELINE.SETTLE_END - INTRO_TIMELINE.BURST_END),
      );
      const interpolatedH = Math.round(this.fullHeight + (this.settledHeight - this.fullHeight) * t);
      if (this.manageContainerHeight && this.container) {
        this.container.style.height = `${interpolatedH}px`;
      }
      if (Math.abs(this.height - interpolatedH) >= 1) {
        this.configurePixelGrid(this.width, interpolatedH, this.dpr);
      }
    } else if (nextPhase === 'settled' && prevPhase !== 'settled') {
      if (this.manageContainerHeight && this.container) {
        this.container.style.height = `${this.settledHeight}px`;
      }
      if (this.height !== this.settledHeight) {
        this.configurePixelGrid(this.width, this.settledHeight, this.dpr);
      }
    }

    if (nextPhase !== prevPhase) {
      this.onPhaseChange?.(nextPhase);
    }
    if (nextPhase === 'settled' && !this.introCompletedNotified) {
      this.introCompletedNotified = true;
      this.onIntroComplete?.();
    }

    this.updateChestAnimation(dt);
    this.updateCoupDeBurstSteam(dt);
    this.updateBerryCoins(dt);
    this.updateSparkles(dt);

    this.renderFrame();
  }

  /** Snapshot of the engine's current state (useful for UI badges & unit tests). */
  public getState(): OceanEngineSnapshot {
    return {
      elapsed: this.elapsed,
      phase: this.phase,
      isIntroComplete: this.phase === 'settled',
      crewCount: this.crewCount,
      renderedCrewCount: this.getRenderedCrewCount(),
      chestState: this.chestState,
      chestOpenProgress: this.chestOpenProgress,
      chestEmergence: this.getChestEmergence(),
      chestBounds: { ...this.chestBounds },
      activeBerryCoins: this.berryCoins.length,
      viewportWidth: this.width,
      viewportHeight: this.height,
      dpr: this.dpr,
    };
  }

  // -------------------------------------------------------------------------
  // Internal animation loop & particle updates
  // -------------------------------------------------------------------------

  private readonly loop = (timestamp: number): void => {
    if (!this.running) return;
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.step(dt);

    if (this.running && typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  /**
   * During `1.0s–2.4s` (`enter`), the Thousand Sunny enters with Luffy, Nami,
   * and Zoro on deck (minimum 3 crew). From `2.4s` onward it displays the full
   * unlocked `crewCount` from `useIponStore.ts` (e.g. 9/10 at ₱26,950).
   */
  private getRenderedCrewCount(): number {
    if (this.phase === 'enter') {
      return Math.max(3, this.crewCount);
    }
    return this.crewCount;
  }

  /**
   * Treasure Chest emergence from the foreground wave:
   * - 0.0s–2.4s: hidden below wave (0)
   * - 2.4s–3.5s (`burst`): emerges smoothly with `easeOutBack` as Coup de Burst fires
   * - 3.5s+    : fully surfaced (1)
   */
  private getChestEmergence(): number {
    if (this.elapsed < INTRO_TIMELINE.ENTER_END) return 0;
    if (this.elapsed >= INTRO_TIMELINE.BURST_END) return 1;
    const t =
      (this.elapsed - INTRO_TIMELINE.ENTER_END) /
      (INTRO_TIMELINE.BURST_END - INTRO_TIMELINE.ENTER_END);
    return clamp01(easeOutBack(t));
  }

  private updateChestAnimation(dt: number): void {
    if (this.chestState === 'opening') {
      this.chestOpenProgress = Math.min(1, this.chestOpenProgress + dt * 3.2);
      if (this.chestOpenProgress >= 1) {
        this.chestState = 'open';
        this.chestOpenProgress = 1;
        this.onChestStateChange?.('open');
      }
    }

    if (this.chestAutoCloseTimer > 0 && this.berryCoins.length === 0) {
      this.chestAutoCloseTimer = Math.max(0, this.chestAutoCloseTimer - dt);
    }
  }

  private updateCoupDeBurstSteam(dt: number): void {
    // Emit cola-steam jets from stern during 2.4s–3.5s Coup de Burst
    if (this.phase === 'burst') {
      this.burstSteamTimer += dt;
      while (this.burstSteamTimer >= 0.035) {
        this.burstSteamTimer -= 0.035;
        const shipPos = this.computeShipTransform();
        const sternX = shipPos.x - 54 * PIXEL_SIZE;
        const sternY = shipPos.y - 6 * PIXEL_SIZE;
        const spread = ((this.steamParticles.length % 5) - 2) * 14;
        this.steamParticles.push({
          x: sternX,
          y: sternY + spread * 0.25,
          vx: -115 - (this.steamParticles.length % 3) * 28,
          vy: spread - 12,
          radiusUnits: 3 + (this.steamParticles.length % 3),
          alpha: 0.92,
          life: 0,
          maxLife: 0.55,
          color: this.steamParticles.length % 2 === 0 ? '#FFFFFF' : HI_BIT_PALETTE.waveFoam,
        });
      }
    }

    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.steamParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.radiusUnits += dt * 3.5;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  private updateBerryCoins(dt: number): void {
    const targetX = this.chestBounds.x + this.chestBounds.width * 0.5;
    const targetY = this.chestBounds.y + this.chestBounds.height * 0.42;

    for (let i = this.berryCoins.length - 1; i >= 0; i--) {
      const coin = this.berryCoins[i];
      coin.elapsed += dt;
      if (coin.elapsed < 0) continue;

      // Keep target locked on the bobbing chest
      coin.targetX = targetX;
      coin.targetY = targetY;
      coin.spinPhase += coin.spinSpeed * dt;

      if (coin.elapsed >= coin.duration) {
        this.berryCoins.splice(i, 1);
        // Pop chest open and burst golden sparkles on coin arrival
        if (this.chestState !== 'open') {
          this.chestState = 'open';
          this.chestOpenProgress = 1;
          this.onChestStateChange?.('open');
        }
        this.spawnChestSparkleBurst(8);
      }
    }
  }

  private spawnChestSparkleBurst(count: number): void {
    const cx = this.chestBounds.x + this.chestBounds.width * 0.5;
    const cy = this.chestBounds.y + this.chestBounds.height * 0.35;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI * 0.5;
      const speed = 42 + (i % 3) * 24;
      this.sparkles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 22,
        life: 0,
        maxLife: 0.48 + (i % 3) * 0.1,
        color:
          i % 3 === 0
            ? '#FFFFFF'
            : i % 2 === 0
              ? HI_BIT_PALETTE.berryGoldBright
              : HI_BIT_PALETTE.berryGold,
      });
    }
  }

  private updateSparkles(dt: number): void {
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.sparkles.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 85 * dt; // subtle pixel gravity
    }
  }

  private toCanvasCoords(
    x: number,
    y: number,
    space: 'canvas' | 'client' | 'auto',
  ): { x: number; y: number } {
    if (space === 'canvas') return { x, y };
    if (typeof this.canvas.getBoundingClientRect === 'function') {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (space === 'client' || y > this.height || x < 0 || y < 0) {
          return {
            x: ((x - rect.left) / rect.width) * this.width,
            y: ((y - rect.top) / rect.height) * this.height,
          };
        }
      }
    }
    return { x, y };
  }

  // -------------------------------------------------------------------------
  // Scene layout & 60fps Hi-Bit Renderer
  // -------------------------------------------------------------------------

  private computeShipTransform(): { x: number; y: number; bobOffset: number; burstActive: boolean } {
    const w = this.width;
    const h = this.height;
    const midWaterY = Math.round(h * 0.67);

    // 1.0s–2.4s: Thousand Sunny enters from off-screen left (-110) to cruise X (w * 0.36)
    const enterT = clamp01(
      (this.elapsed - INTRO_TIMELINE.DAWN_END) /
        (INTRO_TIMELINE.ENTER_END - INTRO_TIMELINE.DAWN_END),
    );
    const enterEase = easeOutCubic(enterT);

    // 2.4s–3.5s: Mini Coup de Burst surges ship from w * 0.36 to w * 0.44 with a micro-hop
    const burstT = clamp01(
      (this.elapsed - INTRO_TIMELINE.ENTER_END) /
        (INTRO_TIMELINE.BURST_END - INTRO_TIMELINE.ENTER_END),
    );
    const burstSurge = easeOutBack(burstT);
    const burstHop = this.phase === 'burst' ? -Math.sin(burstT * Math.PI) * 14 : 0;

    const startX = -115;
    const cruiseX = w * 0.34;
    const settledX = w * 0.41;

    const x =
      this.elapsed < INTRO_TIMELINE.DAWN_END
        ? startX
        : this.elapsed < INTRO_TIMELINE.ENTER_END
          ? startX + (cruiseX - startX) * enterEase
          : cruiseX + (settledX - cruiseX) * burstSurge;

    const bobOffset = Math.sin(this.elapsed * 2.8) * 2.5 + burstHop;
    return {
      x: snap(x),
      y: snap(midWaterY),
      bobOffset,
      burstActive: this.phase === 'burst',
    };
  }

  private renderFrame(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    const w = this.width;
    const h = this.height;

    // 0.0s–1.0s: 3-layer parallax dawn ocean build progression
    const dawnProgress =
      this.elapsed >= INTRO_TIMELINE.DAWN_END
        ? 1
        : clamp01(this.elapsed / INTRO_TIMELINE.DAWN_END);

    // --- Sky & Dawn Horizon Band (banded hi-bit pixel gradient) --------------
    this.renderDawnSky(ctx, w, h, dawnProgress);

    // --- Parallax Layer 1: Deep Horizon Ocean Swells -------------------------
    const layer1Build = easeOutCubic(clamp01(dawnProgress / 0.45));
    const layer1Y = Math.round(h * 0.56 + (1 - layer1Build) * 26);
    this.renderWaveLayer(ctx, {
      baseY: layer1Y,
      bottomY: h,
      wavelength: 68,
      amplitude: 3,
      speed: 18,
      phaseOffset: 0.4,
      fillColor: HI_BIT_PALETTE.waveDeep,
      crestColor: HI_BIT_PALETTE.waveDeepCrest,
    });

    // --- Parallax Layer 2: Mid-Ocean Rolling Waves + Thousand Sunny ----------
    const layer2Build = easeOutCubic(clamp01((dawnProgress - 0.2) / 0.5));
    const layer2Y = Math.round(h * 0.67 + (1 - layer2Build) * 32);
    this.renderWaveLayer(ctx, {
      baseY: layer2Y,
      bottomY: h,
      wavelength: 52,
      amplitude: 4,
      speed: 34,
      phaseOffset: 1.7,
      fillColor: HI_BIT_PALETTE.waveMid,
      crestColor: HI_BIT_PALETTE.waveMidCrest,
    });

    // Coup de Burst speed lines & steam behind/around the Thousand Sunny
    if (this.phase === 'burst') {
      this.renderBurstSpeedLines(ctx, w, layer2Y - 28);
    }
    for (const puff of this.steamParticles) {
      drawPixelPuff(ctx, puff.x, puff.y, puff.radiusUnits, puff.alpha, puff.color, PIXEL_SIZE);
    }

    // Thousand Sunny enters at 1.0s (`enter` phase onward)
    if (this.elapsed >= INTRO_TIMELINE.DAWN_END) {
      const ship = this.computeShipTransform();
      drawThousandSunny(ctx, {
        x: ship.x,
        y: ship.y,
        time: this.elapsed,
        crewCount: this.getRenderedCrewCount(),
        scale: PIXEL_SIZE,
        burstActive: ship.burstActive,
        bobOffset: ship.bobOffset,
      });
    }

    // --- Parallax Layer 3: Foreground Cresting Wave + Clickable Chest --------
    const layer3Build = easeOutCubic(clamp01((dawnProgress - 0.4) / 0.6));
    const layer3Y = Math.round(h * 0.8 + (1 - layer3Build) * 40);

    // Emerging clickable Treasure Chest nestled on the foreground wave crest
    const emergence = this.getChestEmergence();
    const chestX = snap(w * 0.81);
    const chestY = snap(layer3Y + 4);
    if (emergence > 0.01) {
      this.chestBounds = drawTreasureChest(ctx, {
        x: chestX,
        y: chestY,
        state: this.chestState,
        openProgress: this.chestOpenProgress,
        time: this.elapsed,
        emergence,
        scale: PIXEL_SIZE,
      });
    } else {
      this.chestBounds = {
        x: chestX - 32,
        y: chestY - 48,
        width: 64,
        height: 56,
      };
    }

    // Foreground wave crest lapping around the ship wake and chest base
    this.renderWaveLayer(ctx, {
      baseY: layer3Y,
      bottomY: h,
      wavelength: 40,
      amplitude: 5,
      speed: 54,
      phaseOffset: 3.1,
      fillColor: HI_BIT_PALETTE.waveFore,
      crestColor: HI_BIT_PALETTE.waveFoam,
    });

    // --- Flying Berry Coin Particles & Sparkle Bursts ------------------------
    for (const coin of this.berryCoins) {
      if (coin.elapsed < 0) continue;
      const t = clamp01(coin.elapsed / coin.duration);
      const inv = 1 - t;
      // Quadratic Bézier parabolic arc into the chest
      const cx =
        inv * inv * coin.startX + 2 * inv * t * coin.controlX + t * t * coin.targetX;
      const cy =
        inv * inv * coin.startY + 2 * inv * t * coin.controlY + t * t * coin.targetY;
      drawBerryCoin(ctx, cx, cy, coin.spinPhase, PIXEL_SIZE);
    }

    for (const sp of this.sparkles) {
      pxRect(ctx, snap(sp.x), snap(sp.y), -1, -1, 2, 2, sp.color, PIXEL_SIZE);
    }
  }

  private renderDawnSky(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dawnProgress: number,
  ): void {
    const horizonY = Math.round(h * 0.58);
    // Deep navy upper sky
    ctx.fillStyle = HI_BIT_PALETTE.skyTop;
    ctx.fillRect(0, 0, w, h);

    // Stepped hi-bit sky bands building with dawnProgress
    const midBandY = Math.round(horizonY * 0.35);
    ctx.fillStyle = HI_BIT_PALETTE.skyMid;
    ctx.fillRect(0, midBandY, w, horizonY - midBandY);

    const lowBandY = Math.round(horizonY * 0.68);
    ctx.fillStyle = HI_BIT_PALETTE.skyHorizon;
    ctx.fillRect(0, lowBandY, w, horizonY - lowBandY);

    // Golden-coral Grand Line dawn glow band along the horizon
    const glowH = Math.max(4, Math.round(22 * dawnProgress));
    ctx.fillStyle = HI_BIT_PALETTE.dawnCoral;
    ctx.fillRect(0, snap(horizonY - glowH), w, glowH);
    ctx.fillStyle = HI_BIT_PALETTE.dawnGlow;
    ctx.fillRect(0, snap(horizonY - Math.round(glowH * 0.55)), w, Math.round(glowH * 0.55));

    // Rising Hi-Bit Dawn Sun on the right horizon
    const sunX = snap(w * 0.78);
    const sunY = snap(horizonY - 12 * dawnProgress + 8 * (1 - dawnProgress));
    pxRect(ctx, sunX, sunY, -9, -9, 18, 18, HI_BIT_PALETTE.dawnGlow, PIXEL_SIZE);
    pxRect(ctx, sunX, sunY, -7, -7, 14, 14, HI_BIT_PALETTE.dawnCream, PIXEL_SIZE);

    // Pixel clouds drifting across the dawn sky
    const cloudDrift1 = ((this.elapsed * 7) % (w + 90)) - 45;
    const cloudDrift2 = ((this.elapsed * 4.5 + 180) % (w + 90)) - 45;
    this.renderPixelCloud(ctx, snap(cloudDrift1), snap(h * 0.18), 1);
    this.renderPixelCloud(ctx, snap(cloudDrift2), snap(h * 0.28), 0.8);

    // Distant Grand Line silhouette stars in upper sky
    const starTwinkle = Math.sin(this.elapsed * 4) > 0;
    pxRect(ctx, 42, 22, 0, 0, 1, 1, '#FFFFFF', PIXEL_SIZE);
    pxRect(ctx, 138, 16, 0, 0, 1, 1, starTwinkle ? '#FFE37E' : '#FFFFFF', PIXEL_SIZE);
    pxRect(ctx, 264, 26, 0, 0, 1, 1, '#FFFFFF', PIXEL_SIZE);
    pxRect(ctx, 342, 18, 0, 0, 1, 1, '#FFE37E', PIXEL_SIZE);
  }

  private renderPixelCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scaleFactor: number,
  ): void {
    const w1 = Math.round(16 * scaleFactor);
    const w2 = Math.round(10 * scaleFactor);
    pxRect(ctx, x, y, -w1 / 2, 0, w1, 3, '#D8E6F2', PIXEL_SIZE);
    pxRect(ctx, x, y, -w2 / 2, -2, w2, 2, '#FFFFFF', PIXEL_SIZE);
    pxRect(ctx, x, y, -w1 / 2, 2, w1, 1, HI_BIT_PALETTE.dawnCream, PIXEL_SIZE);
  }

  private renderWaveLayer(
    ctx: CanvasRenderingContext2D,
    opts: {
      baseY: number;
      bottomY: number;
      wavelength: number;
      amplitude: number;
      speed: number;
      phaseOffset: number;
      fillColor: string;
      crestColor: string;
    },
  ): void {
    const step = PIXEL_SIZE * 2; // 4px horizontal hi-bit columns
    const scroll = this.elapsed * opts.speed;

    for (let x = 0; x < this.width; x += step) {
      const angle = ((x + scroll) / opts.wavelength) * Math.PI * 2 + opts.phaseOffset;
      const offset = Math.round(Math.sin(angle) * opts.amplitude);
      const colY = snap(opts.baseY + offset, PIXEL_SIZE);
      const colH = Math.max(PIXEL_SIZE, opts.bottomY - colY);

      ctx.fillStyle = opts.fillColor;
      ctx.fillRect(x, colY, step, colH);

      // Hi-bit foam/crest cap on top of each wave column
      ctx.fillStyle = opts.crestColor;
      ctx.fillRect(x, colY, step, PIXEL_SIZE);
    }
  }

  private renderBurstSpeedLines(ctx: CanvasRenderingContext2D, w: number, baseY: number): void {
    ctx.fillStyle = HI_BIT_PALETTE.waveFoam;
    const lines = [
      { y: baseY - 22, len: 38, speed: 320, offset: 10 },
      { y: baseY - 8, len: 52, speed: 380, offset: 140 },
      { y: baseY + 12, len: 32, speed: 290, offset: 250 },
    ];
    for (const l of lines) {
      const lx = snap(w - ((this.elapsed * l.speed + l.offset) % (w + l.len)));
      ctx.fillRect(lx, snap(l.y), l.len, PIXEL_SIZE);
    }
  }
}
