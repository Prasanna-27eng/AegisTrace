/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:       "#07080F",
        surface:  "#0F1018",
        card:     "#16171F",
        accent:   "#C0392B",
        accent2:  "#A78BFA",
        border:   "rgba(255,255,255,0.07)",
        primary:  "#F0F0F8",
        muted:    "#71717A",
        success:  "#22C55E",
        warning:  "#EAB308",
        error:    "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
