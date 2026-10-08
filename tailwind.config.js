// A Tailwind colour scale whose shades read CSS variables (--c-<name>-<shade>)
const themeScale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [
      k,
      `rgb(var(--c-${name}-${k}) / <alpha-value>)`,
    ])
  );

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
        // Theme "Ink & Sky": the purple-* classes are the brand blue scale and
        // yellow-* the warm accent; the colours live in app/theme.css.
        purple: themeScale('p'),
        yellow: themeScale('y'),
        primary: themeScale('p'),
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
