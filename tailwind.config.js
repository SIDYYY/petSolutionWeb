// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        // ↓ from top
        'slide-down': {
          '0%':   { transform: 'translateY(-120%)', opacity: 0 },
          '100%': { transform: 'translateY(0)',     opacity: 1 },
        },
        // ↑ exit to top (optional)
        'slide-up': {
          '0%':   { transform: 'translateY(0)',     opacity: 1 },
          '100%': { transform: 'translateY(-120%)', opacity: 0 },
        },
        // → from right
        'slide-right': {
          '0%':   { transform: 'translateX(120%)', opacity: 0 },
          '100%': { transform: 'translateX(0)',    opacity: 1 },
        },
        // ← from left
        'slide-left': {
          '0%':   { transform: 'translateX(-120%)', opacity: 0 },
          '100%': { transform: 'translateX(0)',     opacity: 1 },
        },
      },
      animation: {
        'slide-down':  'slide-down 0.4s ease-out forwards',
        'slide-up':    'slide-up   0.4s ease-in  forwards',
        'slide-right': 'slide-right 0.4s ease-out forwards',
        'slide-left':  'slide-left 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
