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
        // Paleta primária: azul escuro (navy) — identidade do sistema
        navy: {
          50: "#eef3fb",
          100: "#d5e0f4",
          200: "#aec3e8",
          300: "#7f9dd6",
          400: "#5175bf",
          500: "#3455a3",
          600: "#274284",
          700: "#1e3369",
          800: "#162550",
          900: "#101a3a",
          950: "#0a1026",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
