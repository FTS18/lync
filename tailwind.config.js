/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flat monochrome shades
        vercel: {
          black: "#09090b",
          dark: "#18181b",
          border: {
            dark: "#27272a",
            light: "#e4e4e7"
          },
          light: "#fafafa",
          text: {
            dark: "#fafafa",
            light: "#09090b",
            muted: "#71717a"
          }
        }
      },
      fontFamily: {
        sans: ['var(--font-bricolage-grotesque)', 'sans-serif'],
        mono: ['var(--font-bricolage-grotesque)', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
