import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta do sistema (fundo quase preto azulado + acento azul vivo)
        bg: "#0a0a12",
        panel: "#0f0f1c",
        surface: "#141428",
        surface2: "#1a1a30",
        line: "#1e1e38",
        line2: "#252545",
        ink: "#f0f4ff",
        muted: "#6b7280",
        muted2: "#4b5563",
        brand: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          dark: "#1d4ed8",
        },
      },
      boxShadow: {
        brand: "0 4px 20px rgba(59, 130, 246, 0.35)",
        "brand-lg": "0 6px 24px rgba(59, 130, 246, 0.45)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
