import type { Metadata, Viewport } from "next";
import { Inter, Lato, Montserrat, Poppins, Roboto } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { estiloDaArea } from "@/lib/aparencia";
import { getAparencia } from "@/lib/estabelecimento";
import "./globals.css";

// Todas as fontes disponíveis em Aparência ficam carregadas como CSS variables;
// cada área escolhe a sua definindo `--font-sans`.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato" });

const fontes = [inter, poppins, roboto, montserrat, lato].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Chronoss",
  description: "Agendamento e gestão para o seu negócio.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a12",
  width: "device-width",
  initialScale: 1,
  // Evita o zoom automático ao focar inputs no mobile.
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O body usa o tema da vitrine; o layout do admin sobrescreve no subtree dele.
  const aparencia = await getAparencia();
  const vitrine = estiloDaArea(aparencia.vitrine);

  return (
    <html lang="pt-BR" className={fontes}>
      <body data-tema={vitrine.dataTema} style={vitrine.style}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
