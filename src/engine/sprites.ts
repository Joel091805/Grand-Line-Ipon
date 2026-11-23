/**
 * Procedural Hi-Bit Pixel Art Sprites — Grand Line Ipon (Phase 2).
 *
 * All sprites render onto an integer pixel grid (`Math.round` / integer multiples
 * of `PIXEL_SIZE`) with `imageSmoothingEnabled = false`. Zero external image
 * assets are required.
 */

export const PIXEL_SIZE = 2;

export type ChestState = 'closed' | 'opening' | 'open';

export type CrewId =
  | 'luffy'
  | 'nami'
  | 'zoro'
  | 'usopp'
  | 'sanji'
  | 'chopper'
  | 'robin'
  | 'franky'
  | 'brook'
  | 'jinbe';

export interface CrewSpriteSpec {
  id: CrewId;
  name: string;
  /** Offset in unscaled pixel units relative to the ship's deck origin (center-mid deck). */
  deckX: number;
  deckY: number;
  /** Primary silhouette / outfit palette. */
  hatColor: string;
  hairColor: string;
  topColor: string;
  bottomColor: string;
  accentColor: string;
  skinColor: string;
  /** Relative height in hi-bit units (default 10). */
  heightUnits: number;
}

export const HI_BIT_PALETTE = {
  skyTop: '#0B192C',
  skyMid: '#163A5F',
  skyHorizon: '#2E5A88',
  dawnGlow: '#E5A93C',
  dawnCoral: '#D65A38',
  dawnCream: '#FCE5B4',

  waveDeep: '#091525',
  waveDeepCrest: '#132A46',
  waveMid: '#123152',
  waveMidCrest: '#1E4C7A',
  waveFore: '#1A7F8E',
  waveForeShadow: '#125966',
  waveFoam: '#E8F6F8',

  hullRed: '#D63826',
  hullRedDark: '#9E2316',
  hullWhite: '#F8F9FA',
  hullWood: '#8D532B',
  hullWoodDark: '#5E3417',
  hullWoodLight: '#B47140',
  lawnGreen: '#2E9B4F',
  lawnHighlight: '#4AC06E',

  lionGold: '#F5B82E',
  lionPetal: '#D63826',
  lionManeOrange: '#E07A22',
  lionFace: '#F7D27A',

  berryGold: '#E5A93C',
  berryGoldBright: '#FFE37E',
  berryGoldDark: '#A66F18',

  chestWood: '#7A421D',
  chestWoodLight: '#A45E2D',
  chestWoodDark: '#4D270E',
  chestIron: '#2B3442',
  chestIronLight: '#546378',
  chestRuby: '#D63826',
  chestTealGem: '#1A7F8E',
} as const;

/**
 * All 10 Straw Hat crew members in milestone order (matches `CREW_MILESTONES`
 * in `useIponStore.ts`).
 *
 * At ₱26,950 (Joel Jan 1–Nov 22 + Min Claire Jan 1–Aug 1), `crewCount` is 9/10
 * (Luffy through Brook on deck; Jinbe joins at ₱36,500 Laugh Tale).
 */
export const CREW_SPRITE_SPECS: readonly CrewSpriteSpec[] = [
  {
    id: 'luffy',
    name: 'Luffy',
    deckX: 46, // Standing right behind the Lion figurehead at the bow
    deckY: -13,
    hatColor: '#F3C74B',
    hairColor: '#181820',
    topColor: '#D63826',
    bottomColor: '#2962A8',
    accentColor: '#D63826',
    skinColor: '#F2C19E',
    heightUnits: 10,
  },
  {
    id: 'nami',
    name: 'Nami',
    deckX: -12, // Quarterdeck navigator spot
    deckY: -13,
    hatColor: '#E3782B',
    hairColor: '#E3782B',
    topColor: '#1A7F8E',
    bottomColor: '#234778',
    accentColor: '#F3C74B',
    skinColor: '#F5CBA7',
    heightUnits: 10,
  },
  {
    id: 'zoro',
    name: 'Zoro',
    deckX: 14, // Main mast guard position
    deckY: -11,
    hatColor: '#56B86F',
    hairColor: '#56B86F',
    topColor: '#1D5C34',
    bottomColor: '#1E242B',
    accentColor: '#E5E7EB',
    skinColor: '#EAC09B',
    heightUnits: 10,
  },
  {
    id: 'usopp',
    name: 'Usopp',
    deckX: 31, // Foredeck lookout spot
    deckY: -11,
    hatColor: '#6D8C3C',
    hairColor: '#1F1B18',
    topColor: '#996236',
    bottomColor: '#5C3C20',
    accentColor: '#E5A93C',
    skinColor: '#E5B68E',
    heightUnits: 10,
  },
  {
    id: 'sanji',
    name: 'Sanji',
    deckX: -24, // Galley / aft deck
    deckY: -11,
    hatColor: '#F2CA52',
    hairColor: '#F2CA52',
    topColor: '#1D222B',
    bottomColor: '#14181F',
    accentColor: '#3B82F6',
    skinColor: '#F3C7A3',
    heightUnits: 10,
  },
  {
    id: 'chopper',
    name: 'Chopper',
    deckX: 22, // Lawn deck center-front
    deckY: -10,
    hatColor: '#E25B78',
    hairColor: '#8F5632',
    topColor: '#A6693F',
    bottomColor: '#6E2B32',
    accentColor: '#FFFFFF',
    skinColor: '#B87A4B',
    heightUnits: 7,
  },
  {
    id: 'robin',
    name: 'Robin',
    deckX: -3, // Lawn deck mid
    deckY: -11,
    hatColor: '#191926',
    hairColor: '#191926',
    topColor: '#5B3A82',
    bottomColor: '#35224D',
    accentColor: '#E5A93C',
    skinColor: '#F5CBA7',
    heightUnits: 11,
  },
  {
    id: 'franky',
    name: 'Franky',
    deckX: 4, // Center deck shipwright post
    deckY: -11,
    hatColor: '#36A3E0',
    hairColor: '#36A3E0',
    topColor: '#D63826',
    bottomColor: '#1F3A60',
    accentColor: '#36A3E0',
    skinColor: '#E7B691',
    heightUnits: 12,
  },
  {
    id: 'brook',
    name: 'Brook',
    deckX: -34, // Stern deck musician post
    deckY: -13,
    hatColor: '#11141A',
    hairColor: '#11141A',
    topColor: '#202634',
    bottomColor: '#151922',
    accentColor: '#F3C74B',
    skinColor: '#F3F4F6',
    heightUnits: 13,
  },
  {
    id: 'jinbe',
    name: 'Jinbe',
    deckX: -44, // Helmsman stern post (unlocked at 10/10 ₱36,500)
    deckY: -13,
    hatColor: '#1F242D',
    hairColor: '#1F242D',
    topColor: '#D98A2B',
    bottomColor: '#7D3C1D',
    accentColor: '#2B83B8',
    skinColor: '#3B95C8',
    heightUnits: 13,
  },
] as const;

// ---------------------------------------------------------------------------
// Integer pixel-grid primitive helpers
// ---------------------------------------------------------------------------

/** Snap a coordinate to an integer pixel boundary. */
export function snap(v: number, grid: number = PIXEL_SIZE): number {
  return Math.round(v / grid) * grid;
}

/**
 * Draw an integer-aligned rectangle in hi-bit pixel units relative to `(ox, oy)`.
 * `(ux, uy, uw, uh)` are specified in hi-bit grid units (each unit = `scale` CSS px).
 */
export function pxRect(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ux: number,
  uy: number,
  uw: number,
  uh: number,
  color: string,
  scale: number = PIXEL_SIZE,
): void {
  const x = Math.round(ox + ux * scale);
  const y = Math.round(oy + uy * scale);
  const w = Math.max(1, Math.round(uw * scale));
  const h = Math.max(1, Math.round(uh * scale));
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ---------------------------------------------------------------------------
// Straw Hat Crew Sprite Renderer
// ---------------------------------------------------------------------------

export interface DrawCrewMemberOptions {
  /** Base anchor X in canvas CSS coordinates. */
  x: number;
  /** Base anchor Y (feet level) in canvas CSS coordinates. */
  y: number;
  /** Animation time in seconds for idle bobbing / waving. */
  time: number;
  /** Hi-bit pixel unit size (default 2). */
  scale?: number;
  /** Index for phase-offset bobbing. */
  index?: number;
}

/**
 * Draws a single Straw Hat crew silhouette/sprite on an integer pixel grid.
 */
export function drawCrewMember(
  ctx: CanvasRenderingContext2D,
  spec: CrewSpriteSpec,
  options: DrawCrewMemberOptions,
): void {
  const scale = options.scale ?? PIXEL_SIZE;
  const idx = options.index ?? 0;
  // Subtle 1-unit hi-bit idle bounce at ~2Hz
  const bounceUnit = Math.sin(options.time * 4.5 + idx * 0.9) > 0.45 ? -1 : 0;
  const ox = snap(options.x, scale);
  const oy = snap(options.y + bounceUnit * scale, scale);

  // Legs / boots (2 units tall)
  pxRect(ctx, ox, oy, -1, -2, 1, 2, spec.bottomColor, scale);
  pxRect(ctx, ox, oy, 1, -2, 1, 2, spec.bottomColor, scale);

  if (spec.id === 'chopper') {
    // Compact Chopper silhouette with pink hat & antlers
    pxRect(ctx, ox, oy, -1, -4, 3, 2, spec.topColor, scale);
    pxRect(ctx, ox, oy, -1, -6, 3, 2, spec.hatColor, scale);
    pxRect(ctx, ox, oy, -2, -6, 1, 1, '#78492A', scale); // left antler
    pxRect(ctx, ox, oy, 2, -6, 1, 1, '#78492A', scale); // right antler
    pxRect(ctx, ox, oy, 0, -5, 1, 1, spec.accentColor, scale); // X mark on hat
    return;
  }

  if (spec.id === 'brook') {
    // Tall Brook silhouette with giant round afro & cane
    pxRect(ctx, ox, oy, -1, -6, 3, 4, spec.topColor, scale);
    pxRect(ctx, ox, oy, 0, -8, 2, 2, spec.skinColor, scale); // skull face
    pxRect(ctx, ox, oy, -2, -12, 5, 4, spec.hairColor, scale); // giant afro
    pxRect(ctx, ox, oy, -1, -13, 3, 1, spec.accentColor, scale); // crown brim
    pxRect(ctx, ox, oy, 3, -6, 1, 6, '#B8860B', scale); // cane sword
    return;
  }

  if (spec.id === 'franky') {
    // Broad-shouldered Franky with blue cyborg forearms & pompadour
    pxRect(ctx, ox, oy, -2, -6, 5, 4, spec.topColor, scale);
    pxRect(ctx, ox, oy, -3, -6, 1, 3, spec.accentColor, scale); // left cyborg arm
    pxRect(ctx, ox, oy, 3, -6, 1, 3, spec.accentColor, scale); // right cyborg arm
    pxRect(ctx, ox, oy, -1, -8, 3, 2, spec.skinColor, scale);
    pxRect(ctx, ox, oy, -1, -10, 4, 2, spec.hairColor, scale); // pompadour
    return;
  }

  if (spec.id === 'jinbe') {
    // Broad Helmsman Jinbe in ochre kimono
    pxRect(ctx, ox, oy, -2, -7, 5, 5, spec.topColor, scale);
    pxRect(ctx, ox, oy, -1, -6, 3, 3, spec.bottomColor, scale); // kimono pattern
    pxRect(ctx, ox, oy, -1, -9, 3, 2, spec.skinColor, scale);
    pxRect(ctx, ox, oy, 0, -10, 2, 1, spec.hairColor, scale); // topknot
    return;
  }

  // Standard humanoid proportions (Luffy, Nami, Zoro, Usopp, Sanji, Robin)
  // Torso
  pxRect(ctx, ox, oy, -1, -6, 3, 4, spec.topColor, scale);
  // Head
  pxRect(ctx, ox, oy, -1, -8, 3, 2, spec.skinColor, scale);
  // Hair / Hat
  pxRect(ctx, ox, oy, -1, -9, 3, 1, spec.hairColor, scale);

  if (spec.id === 'luffy') {
    // Iconic Straw Hat brim + red ribbon + raised fist
    pxRect(ctx, ox, oy, -2, -9, 5, 1, spec.hatColor, scale);
    pxRect(ctx, ox, oy, -1, -10, 3, 1, spec.hatColor, scale);
    pxRect(ctx, ox, oy, -1, -9, 3, 1, spec.accentColor, scale);
    const armUp = Math.sin(options.time * 5) > 0 ? -9 : -8;
    pxRect(ctx, ox, oy, 2, armUp, 1, 3, spec.skinColor, scale);
  } else if (spec.id === 'zoro') {
    // Haramaki belly band + katana hilt sticking out
    pxRect(ctx, ox, oy, -1, -4, 3, 1, '#56B86F', scale);
    pxRect(ctx, ox, oy, -3, -4, 2, 1, spec.accentColor, scale); // swords at hip
  } else if (spec.id === 'nami') {
    // Long orange hair lock + Clima-Tact blue staff
    pxRect(ctx, ox, oy, -2, -8, 1, 3, spec.hairColor, scale);
    pxRect(ctx, ox, oy, 2, -8, 1, 6, '#38BDF8', scale);
  } else if (spec.id === 'usopp') {
    // Long nose silhouette + sniper goggles accent
    pxRect(ctx, ox, oy, 2, -8, 1, 1, spec.skinColor, scale);
    pxRect(ctx, ox, oy, -1, -9, 3, 1, spec.accentColor, scale);
  } else if (spec.id === 'sanji') {
    // Blue tie accent on black suit
    pxRect(ctx, ox, oy, 0, -5, 1, 2, spec.accentColor, scale);
  } else if (spec.id === 'robin') {
    // Long dark hair + gold belt
    pxRect(ctx, ox, oy, -2, -8, 1, 3, spec.hairColor, scale);
    pxRect(ctx, ox, oy, -1, -3, 3, 1, spec.accentColor, scale);
  }
}

// ---------------------------------------------------------------------------
// Thousand Sunny Sprite Renderer
// ---------------------------------------------------------------------------

export interface DrawThousandSunnyOptions {
  /** Center X of the Thousand Sunny hull in canvas CSS coordinates. */
  x: number;
  /** Waterline Y of the Thousand Sunny in canvas CSS coordinates. */
  y: number;
  /** Elapsed time in seconds for sail billow, flag flutter, and crew idle. */
  time: number;
  /** Number of unlocked Straw Hat crew members to draw on deck (0..10). */
  crewCount: number;
  /** Hi-bit pixel grid scale (default 2). */
  scale?: number;
  /** Whether Coup de Burst stern jets are actively firing. */
  burstActive?: boolean;
  /** Pitch angle in radians or vertical hop offset (snapped to pixel grid). */
  bobOffset?: number;
}

/**
 * Draws the Thousand Sunny brigantine sloop in hi-bit pixel art, complete with:
 * - Crimson & white hull with Soldier Dock System port "1"
 * - Green lawn deck
 * - Main mast with billowing Jolly Roger sail & crow's nest
 * - Lion figurehead (golden petal mane) at the bow
 * - Up to 10 Straw Hat crew members positioned along the deck
 */
export function drawThousandSunny(
  ctx: CanvasRenderingContext2D,
  options: DrawThousandSunnyOptions,
): void {
  const scale = options.scale ?? PIXEL_SIZE;
  const bob = options.bobOffset ?? Math.sin(options.time * 2.6) * 2.5;
  const ox = snap(options.x, scale);
  const oy = snap(options.y + bob, scale);

  // --- 1. Aft & Fore Masts + Main Sail (behind crew & deck rails) -----------
  // Main Mast pole
  pxRect(ctx, ox, oy, -2, -48, 3, 38, HI_BIT_PALETTE.hullWoodDark, scale);
  pxRect(ctx, ox, oy, -1, -48, 1, 38, HI_BIT_PALETTE.hullWoodLight, scale);

  // Fore/Aft yardarms
  pxRect(ctx, ox, oy, -22, -40, 44, 2, HI_BIT_PALETTE.hullWood, scale);
  pxRect(ctx, ox, oy, -18, -22, 38, 2, HI_BIT_PALETTE.hullWood, scale);

  // Billowing Main White Sail (shifts 1 unit right during breeze/burst)
  const billow = options.burstActive ? 2 : Math.sin(options.time * 3.2) > 0 ? 1 : 0;
  pxRect(ctx, ox, oy, -19 + billow, -38, 38, 16, HI_BIT_PALETTE.hullWhite, scale);
  pxRect(ctx, ox, oy, -17 + billow, -39, 34, 18, HI_BIT_PALETTE.hullWhite, scale);
  // Sail shading strip on left edge
  pxRect(ctx, ox, oy, -19 + billow, -38, 3, 16, '#DCE3EC', scale);

  // Straw Hat Jolly Roger emblem on Main Sail
  const jx = billow;
  // Crossbones
  pxRect(ctx, ox, oy, jx - 6, -34, 2, 2, '#1E293B', scale);
  pxRect(ctx, ox, oy, jx + 5, -34, 2, 2, '#1E293B', scale);
  pxRect(ctx, ox, oy, jx - 6, -27, 2, 2, '#1E293B', scale);
  pxRect(ctx, ox, oy, jx + 5, -27, 2, 2, '#1E293B', scale);
  // Skull + Straw Hat dome & red ribbon
  pxRect(ctx, ox, oy, jx - 3, -33, 7, 5, '#1E293B', scale);
  pxRect(ctx, ox, oy, jx - 5, -33, 11, 2, HI_BIT_PALETTE.lionGold, scale);
  pxRect(ctx, ox, oy, jx - 3, -35, 7, 2, HI_BIT_PALETTE.lionGold, scale);
  pxRect(ctx, ox, oy, jx - 3, -33, 7, 1, HI_BIT_PALETTE.hullRed, scale);

  // Crow's Nest / Red-dome Observatory at top of mast
  pxRect(ctx, ox, oy, -5, -52, 9, 4, HI_BIT_PALETTE.hullRed, scale);
  pxRect(ctx, ox, oy, -4, -53, 7, 1, HI_BIT_PALETTE.lionGold, scale);
  // Fluttering pirate pennant at mast peak
  const flagWave = Math.sin(options.time * 8) > 0 ? -1 : 0;
  pxRect(ctx, ox, oy, -1, -56, 1, 3, HI_BIT_PALETTE.hullWoodDark, scale);
  pxRect(ctx, ox, oy, -8, -56 + flagWave, 7, 3, '#111827', scale);
  pxRect(ctx, ox, oy, -5, -55 + flagWave, 2, 1, HI_BIT_PALETTE.hullWhite, scale);

  // --- 2. Quarterdeck Cabin (aft) & Forecastle Structure --------------------
  // Aft cabin wall & red-and-white striped roof
  pxRect(ctx, ox, oy, -46, -21, 24, 10, HI_BIT_PALETTE.hullWhite, scale);
  pxRect(ctx, ox, oy, -48, -24, 27, 3, HI_BIT_PALETTE.hullRed, scale);
  pxRect(ctx, ox, oy, -42, -24, 5, 3, HI_BIT_PALETTE.hullWhite, scale);
  pxRect(ctx, ox, oy, -31, -24, 5, 3, HI_BIT_PALETTE.hullWhite, scale);
  // Porthole window on aft cabin
  pxRect(ctx, ox, oy, -38, -18, 4, 4, HI_BIT_PALETTE.lionGold, scale);
  pxRect(ctx, ox, oy, -37, -17, 2, 2, HI_BIT_PALETTE.skyMid, scale);

  // --- 3. Crew Members on Deck (positioned from `CREW_SPRITE_SPECS`) --------
  const clampedCrew = Math.max(0, Math.min(CREW_SPRITE_SPECS.length, Math.floor(options.crewCount)));
  for (let i = 0; i < clampedCrew; i++) {
    const spec = CREW_SPRITE_SPECS[i];
    drawCrewMember(ctx, spec, {
      x: ox + spec.deckX * scale,
      y: oy + spec.deckY * scale,
      time: options.time,
      scale,
      index: i,
    });
  }

  // --- 4. Lawn Deck Rail & Main Hull ----------------------------------------
  // Lush green lawn turf along main deck
  pxRect(ctx, ox, oy, -36, -12, 82, 3, HI_BIT_PALETTE.lawnGreen, scale);
  pxRect(ctx, ox, oy, -34, -12, 78, 1, HI_BIT_PALETTE.lawnHighlight, scale);

  // Upper white railing & gold trim
  pxRect(ctx, ox, oy, -48, -10, 96, 3, HI_BIT_PALETTE.hullWhite, scale);
  pxRect(ctx, ox, oy, -48, -10, 96, 1, HI_BIT_PALETTE.lionGold, scale);

  // Crimson hull mid-band
  pxRect(ctx, ox, oy, -45, -7, 90, 5, HI_BIT_PALETTE.hullRed, scale);
  pxRect(ctx, ox, oy, -45, -3, 90, 1, HI_BIT_PALETTE.hullRedDark, scale);

  // Lower wooden hull tapering toward keel
  pxRect(ctx, ox, oy, -41, -2, 82, 4, HI_BIT_PALETTE.hullWood, scale);
  pxRect(ctx, ox, oy, -37, 2, 74, 3, HI_BIT_PALETTE.hullWoodDark, scale);

  // Soldier Dock System Round Number "1" Channel Port on side of hull
  pxRect(ctx, ox, oy, -10, -8, 12, 8, HI_BIT_PALETTE.lionGold, scale);
  pxRect(ctx, ox, oy, -9, -7, 10, 6, HI_BIT_PALETTE.hullWhite, scale);
  pxRect(ctx, ox, oy, -5, -6, 2, 4, HI_BIT_PALETTE.hullRed, scale); // "1" numeral

  // Stern Coup de Burst Cola Exhaust Nozzle (left/aft)
  pxRect(ctx, ox, oy, -52, -9, 5, 5, HI_BIT_PALETTE.chestIron, scale);
  pxRect(ctx, ox, oy, -53, -8, 2, 3, HI_BIT_PALETTE.chestIronLight, scale);
  if (options.burstActive) {
    // High-pressure cola-steam jet blast from stern
    pxRect(ctx, ox, oy, -64, -9, 11, 5, HI_BIT_PALETTE.waveFoam, scale);
    pxRect(ctx, ox, oy, -72, -11, 10, 9, '#FFFFFF', scale);
    pxRect(ctx, ox, oy, -60, -8, 7, 3, HI_BIT_PALETTE.berryGoldBright, scale);
  }

  // --- 5. Iconic Lion Figurehead (Bow / Right Side) -------------------------
  const lx = 48;
  const ly = -9;
  // Outer petal mane (alternating gold and crimson petals)
  pxRect(ctx, ox, oy, lx - 5, ly - 8, 14, 14, HI_BIT_PALETTE.lionGold, scale);
  pxRect(ctx, ox, oy, lx - 7, ly - 6, 18, 10, HI_BIT_PALETTE.lionGold, scale);
  // Crimson mane accents
  pxRect(ctx, ox, oy, lx - 3, ly - 9, 4, 2, HI_BIT_PALETTE.lionPetal, scale);
  pxRect(ctx, ox, oy, lx + 3, ly - 9, 4, 2, HI_BIT_PALETTE.lionPetal, scale);
  pxRect(ctx, ox, oy, lx + 9, ly - 4, 3, 3, HI_BIT_PALETTE.lionPetal, scale);
  pxRect(ctx, ox, oy, lx - 3, ly + 5, 4, 2, HI_BIT_PALETTE.lionPetal, scale);
  pxRect(ctx, ox, oy, lx + 3, ly + 5, 4, 2, HI_BIT_PALETTE.lionPetal, scale);

  // Inner lion face
  pxRect(ctx, ox, oy, lx - 2, ly - 5, 10, 8, HI_BIT_PALETTE.lionFace, scale);
  // Eyes & cheerful snout / Gaon cannon mouth
  pxRect(ctx, ox, oy, lx + 1, ly - 3, 2, 2, '#111827', scale);
  pxRect(ctx, ox, oy, lx + 5, ly - 3, 2, 2, '#111827', scale);
  pxRect(ctx, ox, oy, lx + 3, ly, 3, 2, HI_BIT_PALETTE.hullWoodDark, scale);
  pxRect(ctx, ox, oy, lx + 1, ly + 1, 6, 1, '#FFFFFF', scale);

  // Bow water foam splash
  const foamPulse = Math.sin(options.time * 7) > 0 ? 2 : 0;
  pxRect(ctx, ox, oy, 36, 3, 14 + foamPulse, 2, HI_BIT_PALETTE.waveFoam, scale);
  pxRect(ctx, ox, oy, -44, 3, 10, 2, HI_BIT_PALETTE.waveFoam, scale);
}

// ---------------------------------------------------------------------------
// Treasure Chest Sprite Renderer (closed, opening, open with gold glow)
// ---------------------------------------------------------------------------

export interface DrawTreasureChestOptions {
  /** Center X of the chest in canvas CSS coordinates. */
  x: number;
  /** Base Y of the chest in canvas CSS coordinates. */
  y: number;
  /** Current state: `'closed'`, `'opening'`, or `'open'`. */
  state: ChestState;
  /** Transition progress (0 = closed, 1 = fully open). */
  openProgress?: number;
  /** Elapsed time in seconds for glow pulsing & wave bobbing. */
  time: number;
  /** Emergence factor (0 = hidden below foreground wave, 1 = fully surfaced). */
  emergence?: number;
  /** Hi-bit pixel grid scale (default 2). */
  scale?: number;
}

export interface ChestHitBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draws the clickable Grand Line Treasure Chest on the foreground wave.
 * Returns its clickable bounding box in canvas CSS coordinates.
 */
export function drawTreasureChest(
  ctx: CanvasRenderingContext2D,
  options: DrawTreasureChestOptions,
): ChestHitBox {
  const scale = options.scale ?? PIXEL_SIZE;
  const emergence = Math.max(0, Math.min(1, options.emergence ?? 1));
  const openProgress =
    options.state === 'open'
      ? 1
      : options.state === 'closed'
        ? 0
        : Math.max(0, Math.min(1, options.openProgress ?? 0.5));

  const waveBob = Math.sin(options.time * 3.4 + 1.2) * 2;
  const sinkOffset = (1 - emergence) * 24 * scale;
  const ox = snap(options.x, scale);
  const oy = snap(options.y + waveBob + sinkOffset, scale);

  // --- Gold Aura & Sparkle Rays when opening or open ------------------------
  if (options.state === 'opening' || options.state === 'open') {
    const pulse = 0.5 + 0.5 * Math.sin(options.time * 6);
    const glowRadius = Math.round((16 + pulse * 4) * openProgress);

    // Pixelated concentric golden aura behind the chest
    ctx.save();
    ctx.globalAlpha = 0.22 * openProgress * emergence;
    pxRect(
      ctx,
      ox,
      oy,
      -glowRadius,
      -glowRadius - 6,
      glowRadius * 2,
      glowRadius * 1.6,
      HI_BIT_PALETTE.berryGoldBright,
      scale,
    );
    ctx.globalAlpha = 0.38 * openProgress * emergence;
    const innerR = Math.max(6, Math.round(glowRadius * 0.65));
    pxRect(
      ctx,
      ox,
      oy,
      -innerR,
      -innerR - 6,
      innerR * 2,
      innerR * 1.5,
      HI_BIT_PALETTE.berryGold,
      scale,
    );
    ctx.restore();

    // Orbiting hi-bit gold sparkle crosses
    const rays = [
      { dx: -14, dy: -20, phase: 0 },
      { dx: 12, dy: -22, phase: 1.4 },
      { dx: 0, dy: -26, phase: 2.8 },
      { dx: -17, dy: -11, phase: 4.1 },
      { dx: 16, dy: -12, phase: 5.2 },
    ];
    for (const r of rays) {
      const twinkle = Math.sin(options.time * 7 + r.phase);
      if (twinkle > -0.2) {
        const sy = r.dy - Math.round(openProgress * 3);
        pxRect(ctx, ox, oy, r.dx, sy, 1, 3, HI_BIT_PALETTE.berryGoldBright, scale);
        pxRect(ctx, ox, oy, r.dx - 1, sy + 1, 3, 1, '#FFFFFF', scale);
      }
    }
  } else if (emergence > 0.8) {
    // Subtle closed-chest interactive glint so the user knows it's clickable
    const glint = Math.sin(options.time * 4.5);
    if (glint > 0.5) {
      pxRect(ctx, ox, oy, 11, -17, 1, 3, HI_BIT_PALETTE.berryGoldBright, scale);
      pxRect(ctx, ox, oy, 10, -16, 3, 1, '#FFFFFF', scale);
    }
  }

  // --- Chest Base Box (Oak wood + iron straps + gold corners) ---------------
  // Shadow / water cushion
  pxRect(ctx, ox, oy, -14, -1, 28, 2, HI_BIT_PALETTE.waveForeShadow, scale);

  // Lower wooden chest body
  pxRect(ctx, ox, oy, -12, -10, 24, 10, HI_BIT_PALETTE.chestWood, scale);
  pxRect(ctx, ox, oy, -11, -9, 22, 3, HI_BIT_PALETTE.chestWoodLight, scale);
  pxRect(ctx, ox, oy, -12, -3, 24, 3, HI_BIT_PALETTE.chestWoodDark, scale);

  // Iron vertical bands & gold stud trim on base
  pxRect(ctx, ox, oy, -12, -10, 2, 10, HI_BIT_PALETTE.chestIron, scale);
  pxRect(ctx, ox, oy, 10, -10, 2, 10, HI_BIT_PALETTE.chestIron, scale);
  pxRect(ctx, ox, oy, -7, -10, 2, 10, HI_BIT_PALETTE.chestIron, scale);
  pxRect(ctx, ox, oy, 5, -10, 2, 10, HI_BIT_PALETTE.chestIron, scale);

  // --- Overflowing Berry Gold & Gems (visible when opening / open) ----------
  if (openProgress > 0.15) {
    const pileHeight = Math.max(2, Math.round(openProgress * 5));
    // Dark interior cavity
    pxRect(ctx, ox, oy, -10, -10 - pileHeight, 20, pileHeight, '#241205', scale);
    // Mound of glittering Berry coins
    pxRect(ctx, ox, oy, -10, -10 - pileHeight + 1, 20, pileHeight, HI_BIT_PALETTE.berryGold, scale);
    pxRect(
      ctx,
      ox,
      oy,
      -7,
      -11 - pileHeight + 1,
      14,
      pileHeight,
      HI_BIT_PALETTE.berryGoldBright,
      scale,
    );
    // Ruby &Claire-teal jewels inside the treasure pile
    pxRect(ctx, ox, oy, -5, -10 - pileHeight + 2, 2, 2, HI_BIT_PALETTE.chestRuby, scale);
    pxRect(ctx, ox, oy, 3, -10 - pileHeight + 2, 2, 2, HI_BIT_PALETTE.chestTealGem, scale);
    pxRect(ctx, ox, oy, -1, -11 - pileHeight + 2, 2, 1, '#FFFFFF', scale);
  }

  // --- Chest Lid (lifts & tilts back with `openProgress`) -------------------
  const lidLiftUnits = Math.round(openProgress * 6);
  const lidHeightUnits = Math.max(3, 6 - Math.round(openProgress * 2));
  const lidY = -10 - lidLiftUnits - lidHeightUnits;

  // Lid wood arch
  pxRect(ctx, ox, oy, -12, lidY + 1, 24, lidHeightUnits - 1, HI_BIT_PALETTE.chestWoodLight, scale);
  pxRect(ctx, ox, oy, -11, lidY, 22, 1, HI_BIT_PALETTE.berryGold, scale);
  // Lid iron straps
  pxRect(ctx, ox, oy, -12, lidY + 1, 2, lidHeightUnits - 1, HI_BIT_PALETTE.chestIron, scale);
  pxRect(ctx, ox, oy, 10, lidY + 1, 2, lidHeightUnits - 1, HI_BIT_PALETTE.chestIron, scale);
  pxRect(ctx, ox, oy, -7, lidY + 1, 2, lidHeightUnits - 1, HI_BIT_PALETTE.chestIronLight, scale);
  pxRect(ctx, ox, oy, 5, lidY + 1, 2, lidHeightUnits - 1, HI_BIT_PALETTE.chestIronLight, scale);

  // Golden Lock Plate at front center
  const lockY = options.state === 'closed' ? -11 : lidY + lidHeightUnits - 2;
  pxRect(ctx, ox, oy, -2, lockY, 4, 4, HI_BIT_PALETTE.berryGoldBright, scale);
  pxRect(ctx, ox, oy, -1, lockY + 1, 2, 2, HI_BIT_PALETTE.berryGoldDark, scale);

  // Foam ring around chest waterline
  pxRect(ctx, ox, oy, -15, 0, 30, 1, HI_BIT_PALETTE.waveFoam, scale);

  // Return generous 48×48+ hit box around the chest for mobile thumb taps
  const hitW = 32 * scale;
  const hitH = 28 * scale;
  return {
    x: ox - hitW / 2,
    y: oy - hitH + 4 * scale,
    width: hitW,
    height: hitH,
  };
}

// ---------------------------------------------------------------------------
// Flying Berry Coin & Steam Particle Sprites
// ---------------------------------------------------------------------------

/**
 * Draws a spinning hi-bit golden Berry (`฿`) coin along a parabolic deposit arc.
 */
export function drawBerryCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinPhase: number,
  scale: number = PIXEL_SIZE,
): void {
  const ox = snap(x, scale);
  const oy = snap(y, scale);
  // 3-frame width modulation for crisp pixel coin flip illusion
  const cos = Math.abs(Math.cos(spinPhase));
  const wUnits = cos > 0.65 ? 5 : cos > 0.3 ? 3 : 1;
  const halfW = Math.floor(wUnits / 2);

  // Outer gold rim
  pxRect(ctx, ox, oy, -halfW, -3, wUnits, 6, HI_BIT_PALETTE.berryGoldDark, scale);
  pxRect(ctx, ox, oy, -halfW, -2, wUnits, 4, HI_BIT_PALETTE.berryGold, scale);

  if (wUnits >= 3) {
    // Inner face + specular pixel glint
    pxRect(ctx, ox, oy, -halfW + 1, -2, wUnits - 2, 4, HI_BIT_PALETTE.berryGoldBright, scale);
    pxRect(ctx, ox, oy, -halfW + 1, -2, 1, 1, '#FFFFFF', scale);
  }
  if (wUnits === 5) {
    // Berry "B" vertical slash emblem in center
    pxRect(ctx, ox, oy, 0, -2, 1, 4, HI_BIT_PALETTE.berryGoldDark, scale);
  }
}

/**
 * Draws a pixelated steam/cloud puff for the Coup de Burst & wave spray.
 */
export function drawPixelPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusUnits: number,
  alpha: number,
  color: string = '#FFFFFF',
  scale: number = PIXEL_SIZE,
): void {
  if (alpha <= 0.02 || radiusUnits <= 0) return;
  const ox = snap(x, scale);
  const oy = snap(y, scale);
  const r = Math.max(1, Math.round(radiusUnits));

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  pxRect(ctx, ox, oy, -r, -r + 1, r * 2, Math.max(1, r * 2 - 2), color, scale);
  pxRect(ctx, ox, oy, -r + 1, -r, Math.max(1, r * 2 - 2), r * 2, color, scale);
  ctx.restore();
}
