import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "color-bg": "var(--color-bg)",
        "color-bg-subtle": "var(--color-bg-subtle)",
        "color-bg-elevated": "var(--color-bg-elevated)",
        "color-text": "var(--color-text)",
        "color-text-muted": "var(--color-text-muted)",
        "color-text-subtle": "var(--color-text-subtle)",
        "color-rule": "var(--color-rule)",
        "color-rule-strong": "var(--color-rule-strong)",
        "color-accent": "var(--color-accent)",
        "color-accent-bg": "var(--color-accent-bg)",
        "color-warning": "var(--color-warning)",
        "color-success": "var(--color-success)",
        "color-route": "var(--color-route)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "Menlo", "monospace"],
      },
      maxWidth: {
        prose: "65ch",
        content: "1200px",
        map: "1100px",
      },
      fontSize: {
        display: ["clamp(2.25rem, 4.5vw, 3rem)", { lineHeight: "1.05", fontWeight: "600" }],
        "display-sm": ["clamp(1.625rem, 2.8vw, 1.875rem)", { lineHeight: "1.15", fontWeight: "500" }],
      },
      letterSpacing: {
        "widest-data": "0.18em",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.6" },
          "94%": { opacity: "1" },
        },
      },
      animation: {
        flicker: "flicker 6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
