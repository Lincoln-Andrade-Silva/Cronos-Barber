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
        // Tokens semânticos via CSS variables: a paleta muda por área (vitrine/admin)
        // conforme o tema escolhido em Aparência. Valores em `globals.css`.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        surface2: "rgb(var(--c-surface2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        line2: "rgb(var(--c-line2) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        muted2: "rgb(var(--c-muted2) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          fg: "rgb(var(--c-brand-fg) / <alpha-value>)",
          light: "rgb(var(--c-brand-light) / <alpha-value>)",
          dark: "rgb(var(--c-brand-dark) / <alpha-value>)",
        },
        // Estados de feedback (erro/sucesso/aviso), com variante legível por tema.
        danger: {
          surface: "var(--fb-danger-surface)",
          line: "var(--fb-danger-line)",
          ink: "var(--fb-danger-ink)",
        },
        success: {
          surface: "var(--fb-success-surface)",
          line: "var(--fb-success-line)",
          ink: "var(--fb-success-ink)",
        },
        warning: {
          surface: "var(--fb-warning-surface)",
          line: "var(--fb-warning-line)",
          ink: "var(--fb-warning-ink)",
        },
      },
      boxShadow: {
        brand: "0 1px 6px rgba(59, 130, 246, 0.06)",
        "brand-lg": "0 2px 10px rgba(59, 130, 246, 0.1)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
