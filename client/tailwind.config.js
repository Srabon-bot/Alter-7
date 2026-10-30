/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#060607',
        ink: '#0D0E10',
        'ink-2': '#141518',
        line: '#1E2024',
        'line-strong': '#2C2F35',
        text: '#E8E6E1',
        'text-dim': '#A0A5AB',
        'text-faint': '#70747B',
        brass: '#B89B5E',
        blood: '#8E1B1B',
      },
      fontFamily: {
        voice: ['"Instrument Serif"', 'Newsreader', 'Georgia', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        display: ['64px', { lineHeight: '64px' }],
        h1: ['36px', { lineHeight: '42px' }],
        h2: ['24px', { lineHeight: '32px' }],
        body: ['16px', { lineHeight: '26px' }],
        small: ['13px', { lineHeight: '20px' }],
        label: ['11px', { lineHeight: '16px', letterSpacing: '0.14em' }],
      },
      maxWidth: {
        chat: '640px',
        dash: '1040px',
      },
      borderRadius: {
        hair: '2px',
      },
      transitionTimingFunction: {
        quiet: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
        24: '96px',
        32: '128px',
      },
    },
  },
  plugins: [],
};
