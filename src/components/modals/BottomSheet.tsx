import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerBadge?: ComponentChildren;
  children: ComponentChildren;
}

/**
 * Midnight Grand Line slide-up bottom sheet tailored for 390×844 viewports.
 * Handles Escape key, backdrop tap, and body scroll locking.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  headerBadge,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-sea-abyss/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        class="w-full max-w-[390px] max-h-[88dvh] flex flex-col rounded-t-3xl bg-sea-midnight border-t border-x border-brass-hairline shadow-abyss-dock animate-sheet-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brass grab handle */}
        <div class="flex justify-center pt-2.5 pb-1 shrink-0">
          <div class="w-10 h-1 rounded-full bg-brass-hairline" />
        </div>

        {/* Sticky header */}
        <div class="flex items-start justify-between gap-3 px-4 pt-1 pb-3 border-b border-brass-hairline shrink-0">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-extrabold tracking-tight text-ink-ivory truncate">
                {title}
              </h2>
              {headerBadge}
            </div>
            {subtitle && (
              <p class="text-xs font-medium text-ink-mist mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            class="shrink-0 w-8 h-8 rounded-full bg-sea-elevated border border-brass-hairline flex items-center justify-center text-ink-mist hover:text-ink-ivory active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 20 20" fill="none" class="w-4 h-4" aria-hidden="true">
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable sheet body */}
        <div class="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
