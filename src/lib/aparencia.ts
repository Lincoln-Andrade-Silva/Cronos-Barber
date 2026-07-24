// Sistema de tema do Chronuss (porte adaptado do Hermess): 5 cores-base no modo
// personalizado e o resto derivado; tema único aplicado a vitrine e admin.
import type { Aparencia } from "@/db/schema";

export type { Aparencia };
export type ModoTema = "escuro" | "claro" | "personalizado";

/** As cinco cores editáveis no modo personalizado. O resto sai destas. */
export interface CoresBase {
  bg: string;
  surface: string;
  ink: string;
  line: string;
  brand: string;
}

/** Paleta completa: vira CSS var e alimenta os tokens do Tailwind. */
export interface PaletaTema extends CoresBase {
  panel: string;
  surface2: string;
  line2: string;
  muted: string;
  muted2: string;
  brandFg: string;
  brandLight: string;
  brandDark: string;
}

/** Tema escuro: valores que o sistema sempre teve. Padrão, então declarado (não derivado). */
export const PALETA_ESCURA: PaletaTema = {
  bg: "#0a0a12",
  panel: "#0f0f1c",
  surface: "#141428",
  surface2: "#1a1a30",
  line: "#1e1e38",
  line2: "#252545",
  ink: "#f0f4ff",
  muted: "#6b7280",
  muted2: "#4b5563",
  brand: "#3b82f6",
  brandFg: "#ffffff",
  brandLight: "#60a5fa",
  brandDark: "#1d4ed8",
};

export const PALETA_CLARA: PaletaTema = {
  bg: "#f6f7fa",
  panel: "#ffffff",
  surface: "#f1f3f7",
  surface2: "#e8ebf1",
  line: "#e0e4eb",
  line2: "#cbd1db",
  ink: "#111827",
  muted: "#646c7a",
  muted2: "#8e96a3",
  brand: "#2563eb",
  brandFg: "#ffffff",
  brandLight: "#3b82f6",
  brandDark: "#1e40af",
};

/** Ponto de partida dos seletores ao entrar no personalizado (parte do escuro). */
export const CORES_BASE_ESCURA: CoresBase = {
  bg: PALETA_ESCURA.bg,
  surface: PALETA_ESCURA.surface,
  ink: PALETA_ESCURA.ink,
  line: PALETA_ESCURA.line,
  brand: PALETA_ESCURA.brand,
};

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;

export function hexValido(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && HEX_VALIDO.test(valor);
}

type Rgb = [number, number, number];

function hexParaRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbParaHex([r, g, b]: Rgb): string {
  const canal = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

/** Interpola `de` em direção a `para`; `peso` de 0 a 1. */
function misturar(de: string, para: string, peso: number): string {
  const a = hexParaRgb(de);
  const b = hexParaRgb(para);
  return rgbParaHex([
    a[0] + (b[0] - a[0]) * peso,
    a[1] + (b[1] - a[1]) * peso,
    a[2] + (b[2] - a[2]) * peso,
  ]);
}

/** Luminância relativa da WCAG, de 0 (preto) a 1 (branco). */
export function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexParaRgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste WCAG entre duas cores, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

/** Completa a paleta a partir das cinco cores base, no modo personalizado. */
export function derivarPaleta(base: CoresBase): PaletaTema {
  const { bg, surface, ink, line, brand } = base;
  const fundoClaro = luminancia(bg) > 0.5;
  return {
    ...base,
    panel: fundoClaro ? bg : misturar(bg, ink, 0.05),
    surface2: misturar(surface, ink, 0.05),
    line2: misturar(line, ink, 0.08),
    muted: misturar(ink, bg, 0.29),
    muted2: misturar(ink, bg, 0.43),
    brandFg: contraste(brand, "#ffffff") >= contraste(brand, "#0a0a0a") ? "#ffffff" : "#0a0a0a",
    brandLight: misturar(brand, bg, 0.18),
    brandDark: misturar(brand, fundoClaro ? "#000000" : "#ffffff", 0.2),
  };
}

/** Paleta em uso a partir da aparência salva (resolve modo e campo ausente). */
export function paletaDoTema(aparencia: Aparencia): PaletaTema {
  if (aparencia.tema === "claro") return PALETA_CLARA;
  if (aparencia.tema === "escuro") return PALETA_ESCURA;
  return derivarPaleta({
    bg: hexValido(aparencia.bg) ? aparencia.bg : CORES_BASE_ESCURA.bg,
    surface: hexValido(aparencia.surface) ? aparencia.surface : CORES_BASE_ESCURA.surface,
    ink: hexValido(aparencia.ink) ? aparencia.ink : CORES_BASE_ESCURA.ink,
    line: hexValido(aparencia.line) ? aparencia.line : CORES_BASE_ESCURA.line,
    brand: hexValido(aparencia.brand) ? aparencia.brand : CORES_BASE_ESCURA.brand,
  });
}

/** Paleta correspondente à escolha em edição, para alimentar o preview antes de salvar. */
export function paletaDeSelecao(tema: ModoTema, cores: CoresBase): PaletaTema {
  if (tema === "escuro") return PALETA_ESCURA;
  if (tema === "personalizado") return derivarPaleta(cores);
  return PALETA_CLARA;
}

/** `color-scheme` do tema, para o navegador pintar scrollbar, autofill e controles nativos. */
export function esquemaDeCor(paleta: PaletaTema): "light" | "dark" {
  return luminancia(paleta.bg) < 0.5 ? "dark" : "light";
}

function tripletoRgb(hex: string): string {
  return hexParaRgb(hex).join(" ");
}

const TOKENS: Record<keyof PaletaTema, string> = {
  bg: "--c-bg",
  panel: "--c-panel",
  surface: "--c-surface",
  surface2: "--c-surface2",
  line: "--c-line",
  line2: "--c-line2",
  ink: "--c-ink",
  muted: "--c-muted",
  muted2: "--c-muted2",
  brand: "--c-brand",
  brandFg: "--c-brand-fg",
  brandLight: "--c-brand-light",
  brandDark: "--c-brand-dark",
};

/** Mapa `--c-token` -> tripleto, para style inline (preview) e para o `:root`. */
export function varsDeCor(paleta: PaletaTema): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const token of Object.keys(TOKENS) as (keyof PaletaTema)[]) {
    vars[TOKENS[token]] = tripletoRgb(paleta[token]);
  }
  return vars;
}

export function declaracoesDeCor(paleta: PaletaTema): string {
  return Object.entries(varsDeCor(paleta))
    .map(([nome, valor]) => `${nome}:${valor}`)
    .join(";");
}

/** Cores dos estados de feedback (erro, sucesso, aviso) por esquema. */
const FEEDBACK: Record<"light" | "dark", Record<string, string>> = {
  light: {
    "--fb-danger-surface": "#fef2f2",
    "--fb-danger-line": "#fecaca",
    "--fb-danger-ink": "#b91c1c",
    "--fb-success-surface": "#ecfdf5",
    "--fb-success-line": "#a7f3d0",
    "--fb-success-ink": "#047857",
    "--fb-warning-surface": "#fffbeb",
    "--fb-warning-line": "#fde68a",
    "--fb-warning-ink": "#92400e",
  },
  dark: {
    "--fb-danger-surface": "#2a1618",
    "--fb-danger-line": "#5c2b2f",
    "--fb-danger-ink": "#fca5a5",
    "--fb-success-surface": "#0f241d",
    "--fb-success-line": "#1f4d3c",
    "--fb-success-ink": "#6ee7b7",
    "--fb-warning-surface": "#271d0c",
    "--fb-warning-line": "#4a3a18",
    "--fb-warning-ink": "#fcd34d",
  },
};

export function varsDeFeedback(esquema: "light" | "dark"): Record<string, string> {
  return FEEDBACK[esquema];
}

export function declaracoesDeFeedback(esquema: "light" | "dark"): string {
  return Object.entries(FEEDBACK[esquema])
    .map(([nome, valor]) => `${nome}:${valor}`)
    .join(";");
}

export const APARENCIA_PADRAO: Aparencia = {
  tema: "escuro",
  ...CORES_BASE_ESCURA,
  fonteCorpo: "inter",
  fonteTitulo: "inter",
};

/** Aplica defaults sobre o que veio do banco (tolera null, parcial e formatos antigos). */
export function normalizarAparencia(valor: unknown): Aparencia {
  const v = (valor ?? {}) as Record<string, unknown>;
  const tema: ModoTema =
    v.tema === "claro" || v.tema === "personalizado" ? v.tema : "escuro";
  const cor = (chave: keyof CoresBase, padrao: string) =>
    hexValido(v[chave] as string) ? (v[chave] as string) : padrao;
  return {
    tema,
    bg: cor("bg", CORES_BASE_ESCURA.bg),
    surface: cor("surface", CORES_BASE_ESCURA.surface),
    ink: cor("ink", CORES_BASE_ESCURA.ink),
    line: cor("line", CORES_BASE_ESCURA.line),
    brand: cor("brand", CORES_BASE_ESCURA.brand),
    fonteCorpo: typeof v.fonteCorpo === "string" ? (v.fonteCorpo as string) : "inter",
    fonteTitulo: typeof v.fonteTitulo === "string" ? (v.fonteTitulo as string) : "inter",
  };
}
