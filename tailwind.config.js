/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Note: JIT mode is now the default in Tailwind CSS v3+ and doesn't need to be specified
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ui)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // STYLE PREVIEW: palettes come from CSS variables (app/style-preview.css)
        purple: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [
            k,
            `rgb(var(--c-p-${k}) / <alpha-value>)`,
          ])
        ),
        yellow: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [
            k,
            `rgb(var(--c-y-${k}) / <alpha-value>)`,
          ])
        ),
        primary: {
          900: '#4C1D95',
          800: '#5B21B6',
          700: '#6D28D9',
          600: '#7C3AED',
          500: '#8B5CF6',
          400: '#A78BFA',
          300: '#C4B5FD',
          200: '#DDD6FE',
          100: '#EDE9FE',
          50: '#F5F3FF',
        },
      },
    },
  },
  plugins: [],
  // Future flags for optimization
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
  },
}
