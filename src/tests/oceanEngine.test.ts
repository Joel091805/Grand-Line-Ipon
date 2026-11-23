import { describe, expect, it, vi } from 'vitest';
import {
  INTRO_TIMELINE,
  IPHONE13_HEIGHT,
  IPHONE13_WIDTH,
  OceanEngine,
  SETTLED_VIEWPORT_HEIGHT,
  getIntroPhase,
} from '../engine/oceanEngine';
import {
  CREW_SPRITE_SPECS,
  PIXEL_SIZE,
  drawBerryCoin,
  drawThousandSunny,
  drawTreasureChest,
  snap,
} from '../engine/sprites';
import { createIponStore } from '../store/useIponStore';

function createMockCanvas() {
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '#000000',
    globalAlpha: 1,
    fillRect: vi.fn(),
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: IPHONE13_WIDTH,
    height: IPHONE13_HEIGHT,
    clientWidth: IPHONE13_WIDTH,
    clientHeight: IPHONE13_HEIGHT,
    getContext: vi.fn(() => ctx),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: IPHONE13_WIDTH,
      height: SETTLED_VIEWPORT_HEIGHT,
    })),
  } as unknown as HTMLCanvasElement;

  const container = {
    style: { height: `${IPHONE13_HEIGHT}px` },
  } as unknown as HTMLElement;

  return { canvas, ctx, container };
}

describe('Phase 2: Procedural Hi-Bit <canvas> Engine & Sprites', () => {
  it('snaps coordinates to integer hi-bit pixel grid and enforces imageSmoothingEnabled = false', () => {
    expect(snap(13.3, PIXEL_SIZE)).toBe(14);
    expect(snap(10.1, PIXEL_SIZE)).toBe(10);

    const { canvas, ctx, container } = createMockCanvas();
    const engine = new OceanEngine({
      canvas,
      container,
      initialCrewCount: 9,
    });

    engine.configurePixelGrid(IPHONE13_WIDTH, IPHONE13_HEIGHT, 3);
    expect(canvas.width).toBe(IPHONE13_WIDTH * 3);
    expect(canvas.height).toBe(IPHONE13_HEIGHT * 3);
    expect(ctx.imageSmoothingEnabled).toBe(false);
    expect(ctx.setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 0, 0);
  });

  it('matches all 10 Straw Hat crew specs with useIponStore (9/10 at ₱26,950)', () => {
    expect(CREW_SPRITE_SPECS).toHaveLength(10);
    expect(CREW_SPRITE_SPECS.map((c) => c.id)).toEqual([
      'luffy',
      'nami',
      'zoro',
      'usopp',
      'sanji',
      'chopper',
      'robin',
      'franky',
      'brook',
      'jinbe',
    ]);

    const store = createIponStore({ storage: null, today: () => '2026-11-23' });
    store.applyDefaultImport('merge');
    expect(store.combinedTotal.value).toBe(26_950);
    expect(store.unlockedCrewCount.value).toBe(9);
  });

  it('progresses through the 4.2s Thousand Sunny Intro Sequence phases and settles into top 30%', () => {
    expect(getIntroPhase(0.0)).toBe('dawn');
    expect(getIntroPhase(0.95)).toBe('dawn');
    expect(getIntroPhase(1.0)).toBe('enter');
    expect(getIntroPhase(2.39)).toBe('enter');
    expect(getIntroPhase(2.4)).toBe('burst');
    expect(getIntroPhase(3.49)).toBe('burst');
    expect(getIntroPhase(3.5)).toBe('settle');
    expect(getIntroPhase(4.2)).toBe('settled');

    const phases: string[] = [];
    let completed = false;
    const { canvas, container } = createMockCanvas();

    const engine = new OceanEngine({
      canvas,
      container,
      initialCrewCount: 2, // Even with 2 unlocked, 1.0s-2.4s enters with Luffy, Nami & Zoro (3)
      onPhaseChange: (p) => phases.push(p),
      onIntroComplete: () => {
        completed = true;
      },
    });

    // 0.0s -> 1.0s (dawn ocean build)
    expect(engine.getState().phase).toBe('dawn');
    expect(engine.getState().chestEmergence).toBe(0);

    // Advance into 1.0s–2.4s (Thousand Sunny enters with Luffy, Nami, and Zoro)
    for (let i = 0; i < 15; i++) engine.step(0.1); // 1.5s
    expect(engine.getState().phase).toBe('enter');
    expect(engine.getState().renderedCrewCount).toBe(3);

    // Advance into 2.4s–3.5s (mini Coup de Burst revealing clickable Treasure Chest)
    for (let i = 0; i < 15; i++) engine.step(0.1); // 3.0s
    expect(engine.getState().phase).toBe('burst');
    expect(engine.getState().chestEmergence).toBeGreaterThan(0.5);

    // Update crewCount from store (9/10 at ₱26,950)
    engine.setCrewCount(9);
    expect(engine.getState().renderedCrewCount).toBe(9);

    // Advance through 3.5s–4.2s smooth settle into top 30% (253px)
    for (let i = 0; i < 15; i++) engine.step(0.1); // 4.5s
    expect(engine.getState().phase).toBe('settled');
    expect(engine.getState().isIntroComplete).toBe(true);
    expect(engine.getState().viewportHeight).toBe(SETTLED_VIEWPORT_HEIGHT);
    expect(container.style.height).toBe(`${SETTLED_VIEWPORT_HEIGHT}px`);
    expect(completed).toBe(true);
    expect(phases).toEqual(['enter', 'burst', 'settle', 'settled']);
  });

  it('supports Skip → trigger to jump immediately to the settled top 30% state', () => {
    let completed = false;
    const { canvas, container } = createMockCanvas();
    const engine = new OceanEngine({
      canvas,
      container,
      onIntroComplete: () => {
        completed = true;
      },
    });

    engine.step(0.3);
    expect(engine.getState().phase).toBe('dawn');

    engine.skipIntro();
    const state = engine.getState();
    expect(state.phase).toBe('settled');
    expect(state.elapsed).toBeGreaterThanOrEqual(INTRO_TIMELINE.SETTLE_END);
    expect(state.viewportHeight).toBe(SETTLED_VIEWPORT_HEIGHT);
    expect(container.style.height).toBe(`${SETTLED_VIEWPORT_HEIGHT}px`);
    expect(completed).toBe(true);
  });

  it('pops open the clickable Treasure Chest when tapped and animates flying Berry coins via spawnBerryArc', () => {
    const { canvas } = createMockCanvas();
    const engine = new OceanEngine({
      canvas,
      skipIntroOnStart: true,
      initialCrewCount: 9,
    });

    expect(engine.getChestState()).toBe('closed');

    // Hit-test pointer tap directly on the chest bounds
    const bounds = engine.getState().chestBounds;
    const hit = engine.handlePointerTap(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    expect(hit).toBe(true);
    expect(engine.getChestState()).toBe('opening');

    // Advance animation until chest reaches full open state with gold glow
    for (let i = 0; i < 10; i++) engine.step(0.05);
    expect(engine.getChestState()).toBe('open');
    expect(engine.getState().chestOpenProgress).toBe(1);

    // Tapping again closes it
    engine.tapChest();
    expect(engine.getChestState()).toBe('closed');

    // Spawning a flying Berry coin arc pops the chest open and lands in the chest
    engine.spawnBerryArc(195, 500, { count: 2, duration: 0.4 });
    expect(engine.getState().activeBerryCoins).toBe(2);
    expect(engine.getChestState()).toBe('opening');

    for (let i = 0; i < 12; i++) engine.step(0.05);
    expect(engine.getState().activeBerryCoins).toBe(0);
    expect(engine.getChestState()).toBe('open');
  });

  it('renders Thousand Sunny, Treasure Chest (closed/opening/open), and Berry Coin sprites cleanly', () => {
    const { ctx } = createMockCanvas();

    drawThousandSunny(ctx, {
      x: 160,
      y: 170,
      time: 2.8,
      crewCount: 9,
      burstActive: true,
    });

    const closedBox = drawTreasureChest(ctx, {
      x: 310,
      y: 200,
      state: 'closed',
      time: 3.0,
    });
    const openingBox = drawTreasureChest(ctx, {
      x: 310,
      y: 200,
      state: 'opening',
      openProgress: 0.5,
      time: 3.2,
    });
    const openBox = drawTreasureChest(ctx, {
      x: 310,
      y: 200,
      state: 'open',
      openProgress: 1,
      time: 3.5,
    });

    drawBerryCoin(ctx, 220, 140, 1.2);

    expect(closedBox.width).toBeGreaterThanOrEqual(48);
    expect(openingBox.height).toBeGreaterThanOrEqual(48);
    expect(openBox.width).toBe(closedBox.width);
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
