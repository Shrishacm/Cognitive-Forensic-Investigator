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
          app:            'var(--bg-app)',
          sidebar:        'var(--bg-sidebar)',
          base:           'var(--bg-panel)',
          raised:         'var(--bg-panel-raised)',
          overlay:        'var(--bg-panel-raised)',
          hover:          'var(--bg-hover)',
          active:         'var(--bg-active)',
          border:         'var(--border-base)',
          'border-bright':'var(--border-strong)',
        },
        brand: {
          dim:     'var(--brand-dim)',
          muted:   'var(--brand-muted)',
          DEFAULT: 'var(--brand-primary)',
          bright:  'var(--brand-light)',
          light:   'var(--brand-light)',
          pale:    'var(--brand-pale)',
          glow:    'var(--brand-glow)',
        },
        green:  'var(--success)',
        yellow: 'var(--warning)',
        red:    'var(--danger)',
        blue:   'var(--info)',
        purple: '#8b5cf6',
        text: {
          0: 'var(--text-heading)',
          1: 'var(--text-primary)',
          2: 'var(--text-secondary)',
          3: 'var(--text-muted)',
        },
        // Legacy aliases
        surface: {
          0: 'var(--bg-app)',
          1: 'var(--bg-sidebar)',
          2: 'var(--bg-panel)',
          3: 'var(--bg-panel-raised)',
          4: 'var(--bg-hover)',
          5: 'var(--bg-active)',
        },
        accent: {
          dim:     'var(--brand-dim)',
          DEFAULT: 'var(--brand-primary)',
          bright:  'var(--brand-light)',
          hover:   'var(--brand-light)',
          light:   'var(--brand-light)',
          glow:    'var(--brand-glow)',
        },
        ok:      'var(--success)',
        warn:    'var(--warning)',
        risk:    'var(--danger)',
        info:    'var(--info)',
        ink: {
          0: 'var(--text-heading)',
          1: 'var(--text-primary)',
          2: 'var(--text-secondary)',
          3: 'var(--text-muted)',
        },
        line: {
          DEFAULT: 'var(--border-base)',
          bright:  'var(--border-strong)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger:  'var(--danger)',
        border:  'var(--border-base)',
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
