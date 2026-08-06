/** @type {import('tailwindcss').Config} */
module.exports = {
  // Preflight is off on purpose: every other page in this app styles with
  // inline styles and leans on browser defaults, so Tailwind's global
  // reset would silently restyle the dashboard and marketing pages.
  corePlugins: { preflight: false },
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./lib/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#08080A",
          850: "#0B0B0D",
          800: "#101013",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};
