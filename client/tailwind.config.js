/** @type {import('tailwindcss').Config} */

const token = (name) => `hsl(var(--${name}) / <alpha-value>)`

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Paper stock */
        paper: {
          DEFAULT: token('paper'),
          deep: token('paper-deep'),
          raised: token('paper-raised')
        },
        /* Ink */
        ink: {
          DEFAULT: token('ink'),
          secondary: token('ink-secondary'),
          tertiary: token('ink-tertiary'),
          faint: token('ink-faint')
        },
        rule: {
          DEFAULT: token('rule'),
          strong: token('rule-strong')
        },
        /* Antique brass — the one accent, and the creator's own mark. */
        brass: {
          DEFAULT: token('brass'),
          deep: token('brass-deep'),
          soft: token('brass-soft'),
          bright: token('brass-bright')
        },
        /* Emerald — the structural dark for inverted surfaces. Not a second
           accent; never used on small text. */
        emerald: {
          DEFAULT: token('emerald'),
          mid: token('emerald-mid'),
          soft: token('emerald-soft'),
          /* Fixed ivory in both themes — for text ON an emerald surface. */
          ink: token('on-emerald')
        },
        /* The primary action. Emerald on ivory stock, brass on night stock. */
        action: {
          DEFAULT: token('action'),
          ink: token('action-ink')
        },
        /* The model's draft */
        graphite: {
          DEFAULT: token('graphite'),
          soft: token('graphite-soft')
        },
        sage: { DEFAULT: token('sage'), soft: token('sage-soft') },
        ochre: { DEFAULT: token('ochre'), soft: token('ochre-soft') }
      },

      fontFamily: {
        sans: ['Instrument Sans Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces Variable', 'ui-serif', 'Georgia', 'serif'],
        script: ['Newsreader Variable', 'ui-serif', 'Georgia', 'serif']
      },

      /* Tracking tightens as size grows. Oversized type at default tracking is
         the single most common tell of an amateur layout. */
      fontSize: {
        micro: ['11px', { lineHeight: '1.45', letterSpacing: '0.04em' }],
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0.004em' }],
        sm: ['13px', { lineHeight: '1.55', letterSpacing: '0' }],
        base: ['15px', { lineHeight: '1.55', letterSpacing: '-0.005em' }],
        md: ['17px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        lg: ['20px', { lineHeight: '1.4', letterSpacing: '-0.014em' }],
        xl: ['26px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        '2xl': ['34px', { lineHeight: '1.12', letterSpacing: '-0.024em' }],
        '3xl': ['46px', { lineHeight: '1.04', letterSpacing: '-0.028em' }],
        '4xl': ['62px', { lineHeight: '0.98', letterSpacing: '-0.032em' }],
        '5xl': ['86px', { lineHeight: '0.94', letterSpacing: '-0.036em' }],
        '6xl': ['118px', { lineHeight: '0.9', letterSpacing: '-0.04em' }]
      },

      fontWeight: { normal: '400', medium: '500', semibold: '600' },

      /* Print-ish: small radii. Nothing here is a pill except by exception. */
      borderRadius: { sm: '2px', DEFAULT: '3px', md: '5px', lg: '8px', xl: '12px' },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      },

      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      transitionDuration: { DEFAULT: '260ms' },

      maxWidth: { measure: '37rem', shelf: '82rem' }
    }
  },
  plugins: []
}
