import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ocean-deep': 'var(--ocean-deep)',
        'ocean-mid': 'var(--ocean-mid)',
        'deck-bg': 'var(--deck-bg)',
        'card-surface': 'var(--card-surface)',
        'border-hairline': 'var(--border-hairline)',
        'ink-primary': 'var(--ink-primary)',
        'ink-muted': 'var(--ink-muted)',
        'joel-crimson': 'var(--joel-crimson)',
        'claire-teal': 'var(--claire-teal)',
        'berry-gold': 'var(--berry-gold)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
} satisfies Config;
