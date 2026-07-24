// Carregamento das fontes do catálogo via next/font. Só a padrão (Inter) faz
// preload; as outras carregam sob demanda quando o tema as seleciona. Usado só
// no layout raiz — o className junto vai no <html> expondo cada `--font-*`.
import {
  Archivo_Black,
  Bebas_Neue,
  DM_Sans,
  Inter,
  Lora,
  Montserrat,
  Nunito,
  Oswald,
  Playfair_Display,
  Poppins,
  Roboto,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", preload: false, display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", preload: false, display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", preload: false, display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", preload: false, display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", preload: false, display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", preload: false, display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", preload: false, display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", preload: false, display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", preload: false, display: "swap" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas-neue", preload: false, display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", preload: false, display: "swap" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: ["400"], variable: "--font-archivo-black", preload: false, display: "swap" });

export const classesDeFonte = [
  inter,
  dmSans,
  poppins,
  roboto,
  nunito,
  lora,
  sourceSerif,
  spaceGrotesk,
  montserrat,
  oswald,
  bebasNeue,
  playfair,
  archivoBlack,
]
  .map((f) => f.variable)
  .join(" ");
