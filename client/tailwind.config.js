/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to a CSS variable defined in index.css, so light and
 * dark are one set of classes rather than two. `<alpha-value>` keeps Tailwind's
 * opacity modifiers working — `bg-accent/10` still does what you expect.
 */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken')
        },
        content: {
          DEFAULT: token('text'),
          secondary: token('text-secondary'),
          tertiary: token('text-tertiary'),
          faint: token('text-faint')
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong')
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          soft: token('accent-soft'),
          text: token('accent-text')
        },
        // Semantic only. Used for authorship, never for decoration.
        ai: { DEFAULT: token('ai'), soft: token('ai-soft') },
        creator: { DEFAULT: token('creator'), soft: token('creator-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') }
      },

      fontFamily: {
        sans: ['Inter Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Newsreader Variable', 'ui-serif', 'Georgia', 'serif']
      },

      // Tracking ramps negative as size grows. Large text set at default
      // tracking is the single most common reason a UI looks amateur.
      fontSize: {
        micro: ['11px', { lineHeight: '1.45', letterSpacing: '0.02em' }],
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0.004em' }],
        sm: ['13px', { lineHeight: '1.54', letterSpacing: '-0.004em' }],
        base: ['14px', { lineHeight: '1.5', letterSpacing: '-0.006em' }],
        md: ['15px', { lineHeight: '1.55', letterSpacing: '-0.008em' }],
        lg: ['17px', { lineHeight: '1.4', letterSpacing: '-0.014em' }],
        xl: ['20px', { lineHeight: '1.3', letterSpacing: '-0.018em' }],
        '2xl': ['26px', { lineHeight: '1.22', letterSpacing: '-0.022em' }],
        '3xl': ['34px', { lineHeight: '1.14', letterSpacing: '-0.026em' }],
        '4xl': ['44px', { lineHeight: '1.06', letterSpacing: '-0.03em' }]
      },

      // Only two weights exist in the UI. Hierarchy is size, colour, space.
      fontWeight: {
        normal: '400',
        medium: '500'
      },

      borderRadius: {
        sm: '5px',
        DEFAULT: '7px',
        md: '9px',
        lg: '12px',
        xl: '16px'
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)'
      },

      transitionTimingFunction: {
        // Decelerating. Things arrive and settle; nothing bounces.
        out: 'cubic-bezier(0.22, 1, 0.36, 1)'
      },

      transitionDuration: {
        DEFAULT: '160ms'
      }
    }
  },
  plugins: []
}
