/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        'tag-green': '#0ACF83',
        'tag-green-bg': 'rgba(10, 207, 131, 0.1)',
        'bid-orange': '#FF4D00',
        'link-blue': '#007bff',
        'text-primary': '#333',
        'text-secondary': '#666',
        'border-light': '#ccc',
      },
      spacing: {
        '18': '4.5rem',
      },
      maxWidth: {
        'content': '1200px',
      },
      fontSize: {
        'tiny': '10px',
      },
      animation: {
        'shake': 'shake 0.5s',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-1px, 0)' },
          '50%': { transform: 'translate(1px, 0)' },
          '75%': { transform: 'translate(-1px, 0)' },
        }
      },
    },
  },
  plugins: [],
} 