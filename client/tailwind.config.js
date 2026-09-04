/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#fbf9f6',
          card: '#ffffff',
          border: '#ede8e1',
          'border-light': '#f4efe8',
          orange: '#ff5722',
          'orange-hover': '#f4511e',
          'orange-light': '#fff3ef',
          'orange-border': '#ffcdbc',
          emerald: '#10b981',
          'emerald-light': '#ecfdf5',
          'emerald-border': '#a7f3d0',
          purple: '#8b5cf6',
          'purple-light': '#f5f3ff',
          'purple-border': '#ddd6fe',
          text: '#18181b',
          muted: '#71717a',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
