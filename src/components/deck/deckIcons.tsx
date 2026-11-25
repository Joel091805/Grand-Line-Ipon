/**
 * Crisp 16×16 vector badges for the Clean Modern Deck UI (Phase 3).
 * Kept lightweight and inline so there are zero external asset requests offline.
 */

interface IconProps {
  class?: string;
}

/** Joel's Straw Hat micro-badge */
export function StrawHatIcon({ class: cls = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" class={cls} aria-hidden="true">
      <path d="M5 11.5C5 8.2 7.2 6 10 6s5 2.2 5 5.5H5Z" fill="#F4C95D" stroke="#9A6B16" stroke-width="1.2" />
      <rect x="5" y="9.8" width="10" height="2" rx="0.6" fill="#D63826" />
      <ellipse cx="10" cy="12.4" rx="8" ry="2.2" fill="#F4C95D" stroke="#9A6B16" stroke-width="1.2" />
    </svg>
  );
}

/** Min Claire's Tangerine micro-badge */
export function TangerineIcon({ class: cls = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" class={cls} aria-hidden="true">
      <circle cx="10" cy="11.5" r="5.5" fill="#F59E0B" stroke="#B45309" stroke-width="1.2" />
      <path d="M10 6V4" stroke="#15803D" stroke-width="1.5" stroke-linecap="round" />
      <path d="M10.2 5.2C12 4.2 13.8 4.6 14.3 6C12.7 6.8 11.1 6.5 10.2 5.2Z" fill="#22C55E" />
      <circle cx="8" cy="10" r="1" fill="#FDE68A" />
    </svg>
  );
}

/** Chopper streak badge (contextual cameo at 7+ day streaks) */
export function ChopperBadgeIcon({ class: cls = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" class={cls} aria-hidden="true">
      <rect x="4" y="6" width="12" height="8" rx="3" fill="#EC4899" stroke="#9D174D" stroke-width="1.2" />
      <path d="M2.5 13.5h15" stroke="#9D174D" stroke-width="1.6" stroke-linecap="round" />
      <path d="M8.5 8.5l3 3m0-3l-3 3" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

/** Robin's antique tome icon for Captain's Log */
export function RobinTomeIcon({ class: cls = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" class={cls} aria-hidden="true">
      <path
        d="M4 4.5A1.5 1.5 0 0 1 5.5 3H15v13H5.5A1.5 1.5 0 0 0 4 17.5v-13Z"
        fill="#EDE9FE"
        stroke="#6D28D9"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path d="M4 16.5A1.5 1.5 0 0 1 5.5 15H15v2H5.5A1.5 1.5 0 0 1 4 16.5Z" fill="#DDD6FE" stroke="#6D28D9" stroke-width="1.2" />
      <path d="M7.5 6.8h4.5M7.5 9.5h4.5" stroke="#7C3AED" stroke-width="1.3" stroke-linecap="round" />
    </svg>
  );
}

/** Nami's Berry Coin / Ledger icon */
export function BerryCoinIcon({ class: cls = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" class={cls} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="#E5A93C" stroke="#9A6B16" stroke-width="1.3" />
      <circle cx="10" cy="10" r="5.3" stroke="#FEF3C7" stroke-width="0.9" stroke-dasharray="2 1.5" />
      <path
        d="M8.2 6.8h2.6a1.6 1.6 0 0 1 0 3.2H8.2m0 0h3a1.7 1.7 0 0 1 0 3.4H8.2m0-6.6v6.6m1.5-7.6v8.6"
        stroke="#78350F"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/** Den Den Mushi micro-icon */
export function DenDenIcon({ class: cls = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" class={cls} aria-hidden="true">
      <circle cx="11.5" cy="11.5" r="5" fill="#E5A93C" stroke="currentColor" stroke-width="1.3" />
      <path d="M11.5 11.5a2 2 0 1 1 2-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      <path d="M3.5 15.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      <path d="M5.5 14V8.5M7.5 14V9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      <circle cx="5.5" cy="7.5" r="1.1" fill="currentColor" />
      <circle cx="7.5" cy="8.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

/** Gold Star for cleared islands */
export function GoldStarIcon({ class: cls = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" class={cls} aria-hidden="true">
      <path d="M10 2.2l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.18l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L10 2.2Z" />
    </svg>
  );
}
