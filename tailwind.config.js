/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ecf0ff',
          200: '#d9e0ff',
          300: '#b9c5ff',
          400: '#919dff',
          500: '#6d78ff',
          600: '#5158f5',
          700: '#4340d4',
          800: '#3936ad',
          900: '#312e89',
          950: '#1e1c4d',
        },
        secondary: {
          50: '#f5f8fa',
          100: '#eaf1f5',
          200: '#d5e2ea',
          300: '#b4cbd9',
          400: '#8aadc4',
          500: '#6d92af',
          600: '#507691',
          700: '#405d76',
          800: '#384f64',
          900: '#324455',
          950: '#1f2a36',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}