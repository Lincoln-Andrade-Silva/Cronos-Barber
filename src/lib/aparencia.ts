import type { CSSProperties } from "react";
import type { Aparencia, TemaArea } from "@/db/schema";

export const FONTES = [
  { value: "inter", label: "Inter (padrão)", variavel: "--font-inter" },
  { value: "poppins", label: "Poppins", variavel: "--font-poppins" },
  { value: "roboto", label: "Roboto", variavel: "--font-roboto" },
  { value: "montserrat", label: "Montserrat", variavel: "--font-montserrat" },
  { value: "lato", label: "Lato", variavel: "--font-lato" },
] as const;

export const TEMAS = [
  { value: "escuro", label: "Escuro" },
  { value: "claro", label: "Claro" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export const COR_PADRAO = "#3b82f6";

export const TEMA_PADRAO: TemaArea = {
  tema: "escuro",
  base: "escuro",
  cor: COR_PADRAO,
  fonte: "inter",
};

export const APARENCIA_PADRAO: Aparencia = {
  vitrine: { ...TEMA_PADRAO },
  admin: { ...TEMA_PADRAO },
};

function normalizarArea(valor: Partial<TemaArea> | undefined): TemaArea {
  const tema = valor?.tema === "claro" || valor?.tema === "personalizado" ? valor.tema : "escuro";
  const base = valor?.base === "claro" ? "claro" : "escuro";
  const fonte = FONTES.some((f) => f.value === valor?.fonte) ? (valor!.fonte as string) : "inter";
  const cor = typeof valor?.cor === "string" && /^#[0-9a-f]{6}$/i.test(valor.cor) ? valor.cor : COR_PADRAO;
  return { tema, base, cor, fonte };
}

/** Aplica os defaults em cima do que veio do banco (tolera null/parcial). */
export function normalizarAparencia(valor: Aparencia | null | undefined): Aparencia {
  return {
    vitrine: normalizarArea(valor?.vitrine),
    admin: normalizarArea(valor?.admin),
  };
}

/** "#3b82f6" -> [59, 130, 246] */
function hexParaCanais(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Mistura a cor com branco (fator > 0) ou preto (fator < 0). */
function ajustar(canais: [number, number, number], fator: number): string {
  const alvo = fator > 0 ? 255 : 0;
  const peso = Math.abs(fator);
  return canais.map((c) => Math.round(c + (alvo - c) * peso)).join(" ");
}

export interface EstiloArea {
  dataTema: "escuro" | "claro";
  style: CSSProperties;
}

/**
 * Resolve o tema de uma área: qual paleta base usar (`data-tema`) e as CSS variables
 * inline (fonte + cor de destaque quando o tema é personalizado).
 */
export function estiloDaArea(area: TemaArea): EstiloArea {
  const dataTema = area.tema === "personalizado" ? area.base : area.tema;
  const fonte = FONTES.find((f) => f.value === area.fonte) ?? FONTES[0];
  const style: Record<string, string> = { "--font-sans": `var(${fonte.variavel})` };

  if (area.tema === "personalizado") {
    const canais = hexParaCanais(area.cor);
    if (canais) {
      style["--c-brand"] = canais.join(" ");
      style["--c-brand-light"] = ajustar(canais, 0.25);
      style["--c-brand-dark"] = ajustar(canais, -0.25);
    }
  }

  return { dataTema, style: style as CSSProperties };
}
