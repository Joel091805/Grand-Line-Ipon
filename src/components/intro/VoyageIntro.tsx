import { useEffect, useRef } from 'preact/hooks';

export interface VoyageIntroProps {
  onComplete: () => void;
}

const INTRO_DURATION_MS = 2000;
const SUNNY_ART_SRC = `${import.meta.env.BASE_URL}icons/art/Gemini_Generated_Image_lsrs5ylsrs5ylsrs-removebg-preview.png`;

const STARS: ReadonlyArray<{ cx: number; cy: number; r: number; delay: string }> = [
  { cx: 42, cy: 78, r: 1.2, delay: '0ms' },
  { cx: 118, cy: 52, r: 1.5, delay: '320ms' },
  { cx: 196, cy: 96, r: 1.1, delay: '640ms' },
  { cx: 288, cy: 62, r: 1.6, delay: '180ms' },
  { cx: 344, cy: 112, r: 1.2, delay: '480ms' },
  { cx: 74, cy: 162, r: 1.0, delay: '720ms' },
  { cx: 242, cy: 148, r: 1.3, delay: '260ms' },
  { cx: 322, cy: 184, r: 1.1, delay: '540ms' },
  { cx: 152, cy: 204, r: 1.0, delay: '120ms' },
  { cx: 58, cy: 246, r: 1.4, delay: '400ms' },
];

/**
 * Scene 1: Voyage Launch (2.0s)
 * Animates the Thousand Sunny sailing right across layered 2D midnight water lines
 * with smooth bobbing, culminating in a golden Coup de Burst exit off-screen.
 */
export function VoyageIntro({ onComplete }: VoyageIntroProps) {
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    const timer = window.setTimeout(finish, INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-sea-abyss overflow-hidden select-none"
      role="region"
      aria-label="Grand Line Ipon Voyage Launch"
      data-testid="voyage-intro"
    >
      <div class="relative w-full max-w-[390px] h-dvh overflow-hidden bg-gradient-to-b from-sea-abyss via-sea-midnight to-sea-abyss">
        {/* Midnight Starfield & Brass Horizon */}
        <svg
          viewBox="0 0 390 420"
          class="pointer-events-none absolute inset-x-0 top-0 w-full h-[54%]"
          aria-hidden="true"
        >
          {STARS.map((star, idx) => (
            <circle
              key={idx}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="#F5F0E6"
              style={{
                animation: `star-twinkle 1.6s ease-in-out ${star.delay} infinite`,
              }}
            />
          ))}
          {/* Subtle Brass Rhumb / Compass Arc */}
          <circle
            cx="195"
            cy="310"
            r="148"
            fill="none"
            stroke="rgba(229, 169, 60, 0.14)"
            stroke-width="1"
            stroke-dasharray="4 6"
          />
          <circle
            cx="195"
            cy="310"
            r="102"
            fill="none"
            stroke="rgba(229, 169, 60, 0.1)"
            stroke-width="1"
          />
          <line
            x1="0"
            y1="382"
            x2="390"
            y2="382"
            stroke="rgba(229, 169, 60, 0.22)"
            stroke-width="1"
          />
        </svg>

        {/* Ambient Golden Flash during Coup de Burst */}
        <div
          class="pointer-events-none absolute inset-0 animate-coup-flash"
          style={{
            background:
              'radial-gradient(circle at 38% 58%, rgba(229, 169, 60, 0.55) 0%, rgba(229, 169, 60, 0.12) 45%, transparent 72%)',
          }}
          aria-hidden="true"
        />

        {/* Overlay Skip → Button */}
        <button
          type="button"
          onClick={finish}
          aria-label="Skip voyage intro"
          data-testid="skip-intro-btn"
          class="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-30 inline-flex items-center gap-1 rounded-full bg-sea-midnight/85 backdrop-blur-md border border-brass-hairline px-3.5 py-1.5 min-h-[36px] text-xs font-extrabold tracking-wide text-berry-gold shadow-brass-glow active:scale-95 transition-transform"
        >
          <span>Skip</span>
          <span aria-hidden="true">→</span>
        </button>

        {/* Voyage Title Crest */}
        <div class="pointer-events-none absolute inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-20 flex flex-col items-center text-center px-6 animate-fade-in">
          <span class="text-[10px] font-extrabold uppercase tracking-[0.24em] text-berry-gold">
            2026 Shared Voyage
          </span>
          <h1 class="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-ivory">
            Grand Line Ipon
          </h1>
          <p class="mt-1 text-xs font-medium text-ink-mist">
            Joel &amp; Min Claire • ₱36,500 to Laugh Tale
          </p>
        </div>

        {/* Back Water Layer (Slow Undulating Horizon Waves) */}
        <div class="pointer-events-none absolute inset-x-0 bottom-[32%] h-24 overflow-hidden z-10">
          <svg
            viewBox="0 0 780 96"
            preserveAspectRatio="none"
            class="w-[200%] h-full animate-wave-slow"
            aria-hidden="true"
          >
            <path
              d="M0 44 Q 65 24, 130 44 T 260 44 T 390 44 T 520 44 T 650 44 T 780 44 L 780 96 L 0 96 Z"
              fill="#0D1F36"
            />
            <path
              d="M0 44 Q 65 24, 130 44 T 260 44 T 390 44 T 520 44 T 650 44 T 780 44"
              fill="none"
              stroke="rgba(229, 169, 60, 0.22)"
              stroke-width="1.5"
            />
          </svg>
        </div>

        {/* Mid Water Layer */}
        <div class="pointer-events-none absolute inset-x-0 bottom-[22%] h-28 overflow-hidden z-10">
          <svg
            viewBox="0 0 780 112"
            preserveAspectRatio="none"
            class="w-[200%] h-full animate-wave-mid"
            aria-hidden="true"
          >
            <path
              d="M0 42 Q 97.5 18, 195 42 T 390 42 T 585 42 T 780 42 L 780 112 L 0 112 Z"
              fill="#142B47"
            />
            <path
              d="M0 42 Q 97.5 18, 195 42 T 390 42 T 585 42 T 780 42"
              fill="none"
              stroke="rgba(143, 163, 191, 0.35)"
              stroke-width="1.5"
            />
          </svg>
        </div>

        {/* Thousand Sunny + Coup de Burst Golden Blast */}
        <div class="pointer-events-none absolute inset-x-0 bottom-[26%] z-20 flex items-center justify-center">
          <div class="relative w-[228px] h-[176px] animate-sunny-voyage">
            {/* Coup de Burst Stern Golden Blast (emits to the left behind the ship) */}
            <div
              class="absolute -left-24 bottom-5 w-36 h-24 animate-coup-blast origin-right"
              aria-hidden="true"
            >
              <svg viewBox="0 0 160 100" class="w-full h-full overflow-visible">
                <defs>
                  <radialGradient id="coupGold" cx="85%" cy="50%" r="70%">
                    <stop offset="0%" stop-color="#FFF7D6" stop-opacity="1" />
                    <stop offset="38%" stop-color="#E5A93C" stop-opacity="0.92" />
                    <stop offset="75%" stop-color="#E04332" stop-opacity="0.45" />
                    <stop offset="100%" stop-color="#E5A93C" stop-opacity="0" />
                  </radialGradient>
                </defs>
                {/* Golden Blast Cone */}
                <path
                  d="M148 48 L 12 10 Q 0 50, 12 90 Z"
                  fill="url(#coupGold)"
                />
                {/* Shockwave Rings */}
                <ellipse
                  cx="104"
                  cy="50"
                  rx="10"
                  ry="28"
                  fill="none"
                  stroke="#FFF3C4"
                  stroke-width="2.5"
                  opacity="0.85"
                />
                <ellipse
                  cx="62"
                  cy="50"
                  rx="14"
                  ry="38"
                  fill="none"
                  stroke="#E5A93C"
                  stroke-width="2"
                  opacity="0.65"
                />
                {/* Burst Streaks */}
                <line x1="138" y1="38" x2="26" y2="20" stroke="#FFF7D6" stroke-width="2" stroke-linecap="round" />
                <line x1="136" y1="50" x2="4" y2="50" stroke="#FFF7D6" stroke-width="2.5" stroke-linecap="round" />
                <line x1="138" y1="62" x2="26" y2="80" stroke="#E5A93C" stroke-width="2" stroke-linecap="round" />
              </svg>
            </div>

            {/* Thousand Sunny Art (flipped horizontally so bow faces RIGHT while sailing right) */}
            <img
              src={SUNNY_ART_SRC}
              alt="Thousand Sunny sailing across the Grand Line"
              class="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(3,9,18,0.85)]"
              style={{ transform: 'scaleX(-1)' }}
              decoding="sync"
            />
          </div>
        </div>

        {/* Foreground Water Layer (Fast Undulating Deep Crest) */}
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[31%] overflow-hidden z-20">
          <svg
            viewBox="0 0 780 260"
            preserveAspectRatio="none"
            class="w-[200%] h-full animate-wave-fast"
            aria-hidden="true"
          >
            <path
              d="M0 36 Q 65 10, 130 36 T 260 36 T 390 36 T 520 36 T 650 36 T 780 36 L 780 260 L 0 260 Z"
              fill="#07111E"
            />
            <path
              d="M0 36 Q 65 10, 130 36 T 260 36 T 390 36 T 520 36 T 650 36 T 780 36"
              fill="none"
              stroke="rgba(229, 169, 60, 0.36)"
              stroke-width="2"
            />
            <path
              d="M0 78 Q 97.5 60, 195 78 T 390 78 T 585 78 T 780 78"
              fill="none"
              stroke="rgba(143, 163, 191, 0.16)"
              stroke-width="1.2"
            />
            <path
              d="M0 124 Q 65 110, 130 124 T 260 124 T 390 124 T 520 124 T 650 124 T 780 124"
              fill="none"
              stroke="rgba(229, 169, 60, 0.12)"
              stroke-width="1"
            />
          </svg>
        </div>

        {/* Bottom Caption */}
        <div class="pointer-events-none absolute inset-x-0 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-center">
          <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-berry-gold/90">
            Coup de Burst!
          </span>
        </div>
      </div>
    </div>
  );
}
