import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1B2A4A", 50: "#EEF1F7", 100: "#D9DFEC", 700: "#24365E", 900: "#0F172A" },
        cyan: { DEFAULT: "#22D3EE", 600: "#0891B2" },
        gold: { DEFAULT: "#F5B841", 600: "#C98A12" },
        paper: "#FAF8F3",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
