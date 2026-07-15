export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          app:            '#08090e',
          sidebar:        '#0c0d14',
          base:           '#101219',
          raised:         '#14161f',
          overlay:        '#191c28',
          hover:          '#1e2130',
          active:         '#232638',
          border:         '#1f2235',
          'border-bright':'#2a2f48',
        },
        brand: {
          dim:     '#1e1b4b',
          muted:   '#3730a3',
          DEFAULT: '#4f46e5',
          bright:  '#6366f1',
          light:   '#818cf8',
          pale:    '#c7d2fe',
          glow:    'rgba(99,102,241,0.12)',
        },
        green:  '#10b981',
        yellow: '#f59e0b',
        red:    '#ef4444',
        blue:   '#3b82f6',
        purple: '#8b5cf6',
        text: {
          0: '#e8eaf2',
          1: '#9399b2',
          2: '#5c6280',
          3: '#363a52',
        },
        // ── Legacy aliases so old pages still compile ──
        surface: {
          0: '#08090e',
          1: '#0c0d14',
          2: '#14161f',
          3: '#191c28',
          4: '#1e2130',
          5: '#232638',
        },
        accent: {
          dim:     '#1e1b4b',
          DEFAULT: '#4f46e5',
          bright:  '#6366f1',
          hover:   '#6366f1',
          light:   '#818cf8',
          glow:    'rgba(99,102,241,0.12)',
        },
        ok:      '#10b981',
        warn:    '#f59e0b',
        risk:    '#ef4444',
        info:    '#3b82f6',
        ink: {
          0: '#e8eaf2',
          1: '#9399b2',
          2: '#5c6280',
          3: '#363a52',
        },
        line: {
          DEFAULT: '#1f2235',
          bright:  '#2a2f48',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        border:  '#1f2235',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['13px', { lineHeight: '20px' }],
        'base':['14px', { lineHeight: '22px' }],
        'lg':  ['16px', { lineHeight: '24px' }],
        'xl':  ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-400% 0' },
          '100%': { backgroundPosition: '400% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.4)' },
          '50%':      { boxShadow: '0 0 0 4px rgba(16,185,129,0)' },
        },
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.35s ease both',
        'fade-up-1':  'fade-up 0.35s 0.05s ease both',
        'fade-up-2':  'fade-up 0.35s 0.10s ease both',
        'fade-up-3':  'fade-up 0.35s 0.15s ease both',
        'fade-up-4':  'fade-up 0.35s 0.20s ease both',
        'fade-up-5':  'fade-up 0.35s 0.25s ease both',
        'fade-up-6':  'fade-up 0.35s 0.30s ease both',
        'fade-up-7':  'fade-up 0.35s 0.35s ease both',
        'fade-up-8':  'fade-up 0.35s 0.40s ease both',
        'fade-in':    'fade-in 0.25s ease both',
        'scale-in':   'scale-in 0.2s ease both',
        'slide-right':'slide-right 0.25s ease both',
        'shimmer':    'shimmer 1.8s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease infinite',
        'count-up':   'count-up 0.4s ease both',
        'spin':       'spin 1s linear infinite',
      },
      boxShadow: {
        'card':       '0 1px 2px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        'modal':      '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        'brand':      '0 0 20px rgba(99,102,241,0.25)',
        'green':      '0 0 12px rgba(16,185,129,0.3)',
        'glow':       '0 0 20px rgba(99,102,241,0.2)',
      },
      backdropBlur: {
        xs: '4px',
      },
    }
  },
  plugins: []
}
