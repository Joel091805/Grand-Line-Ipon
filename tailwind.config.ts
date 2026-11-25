import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Midnight Grand Line palette
        'sea-abyss': 'var(--sea-abyss)',
        'sea-midnight': 'var(--sea-midnight)',
        'sea-elevated': 'var(--sea-elevated)',
        'brass-hairline': 'var(--brass-hairline)',
        'ink-ivory': 'var(--ink-ivory)',
        'ink-mist': 'var(--ink-mist)',
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
      boxShadow: {
        'brass-glow': '0 0 24px rgba(229, 169, 60, 0.22)',
        'abyss-dock': '0 12px 32px rgba(3, 9, 18, 0.75)',
      },
    },
  },
  plugins: [],
} satisfies Config;
