// Catálogo de fontes da tela de Aparência. Dado puro (sem next/font) para poder
// ser importado no client; o carregamento fica em `fontes-google.ts`, só no layout.

export interface OpcaoFonte {
  chave: string;
  nome: string;
  variavel: string;
}

/** Corpo: texto, formulários e números. Precisa aguentar texto pequeno e denso. */
export const FONTES_CORPO: readonly OpcaoFonte[] = [
  { chave: "inter", nome: "Inter (padrão)", variavel: "--font-inter" },
  { chave: "dm-sans", nome: "DM Sans", variavel: "--font-dm-sans" },
  { chave: "poppins", nome: "Poppins", variavel: "--font-poppins" },
  { chave: "roboto", nome: "Roboto", variavel: "--font-roboto" },
  { chave: "nunito", nome: "Nunito", variavel: "--font-nunito" },
  { chave: "lora", nome: "Lora (serifa)", variavel: "--font-lora" },
  { chave: "source-serif", nome: "Source Serif (serifa)", variavel: "--font-source-serif" },
  { chave: "space-grotesk", nome: "Space Grotesk", variavel: "--font-space-grotesk" },
];

/** Títulos, marca e seções: peso alto e presença. */
export const FONTES_TITULO: readonly OpcaoFonte[] = [
  { chave: "inter", nome: "Inter (padrão)", variavel: "--font-inter" },
  { chave: "poppins", nome: "Poppins", variavel: "--font-poppins" },
  { chave: "montserrat", nome: "Montserrat", variavel: "--font-montserrat" },
  { chave: "oswald", nome: "Oswald (condensada)", variavel: "--font-oswald" },
  { chave: "bebas-neue", nome: "Bebas Neue", variavel: "--font-bebas-neue" },
  { chave: "playfair", nome: "Playfair Display (serifa)", variavel: "--font-playfair" },
  { chave: "archivo-black", nome: "Archivo Black", variavel: "--font-archivo-black" },
  { chave: "space-grotesk", nome: "Space Grotesk", variavel: "--font-space-grotesk" },
];

/** Resolve a chave salva para a CSS var; chave fora do catálogo cai na primeira opção. */
export function variavelDaFonte(chave: string, opcoes: readonly OpcaoFonte[]): string {
  const escolhida = opcoes.find((f) => f.chave === chave) ?? opcoes[0];
  return escolhida.variavel;
}
