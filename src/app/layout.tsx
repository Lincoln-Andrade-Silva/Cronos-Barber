import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { classesDeFonte } from "@/lib/fontes-google";
import { FONTES_CORPO, FONTES_TITULO, variavelDaFonte } from "@/lib/fontes";
import {
  declaracoesDeCor,
  declaracoesDeFeedback,
  esquemaDeCor,
  paletaDoTema,
} from "@/lib/aparencia";
import { getAparencia } from "@/lib/estabelecimento";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronoss",
  description: "Agendamento e gestão para o seu negócio.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Evita o zoom automático ao focar inputs no mobile.
  maximumScale: 1,
};

export async function generateViewport(): Promise<Viewport> {
  const paleta = paletaDoTema(await getAparencia());
  return { themeColor: paleta.bg };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aparencia = await getAparencia();
  const paleta = paletaDoTema(aparencia);
  const esquema = esquemaDeCor(paleta);
  const fonteCorpo = variavelDaFonte(aparencia.fonteCorpo, FONTES_CORPO);
  const fonteTitulo = variavelDaFonte(aparencia.fonteTitulo, FONTES_TITULO);

  // Vars do tema aplicadas no :root a partir de valores fechados (nada cru do usuário).
  const css = [
    ":root{",
    `color-scheme:${esquema};`,
    `${declaracoesDeCor(paleta)};`,
    `${declaracoesDeFeedback(esquema)};`,
    `--font-sans:var(${fonteCorpo});`,
    `--font-display:var(${fonteTitulo});`,
    "}",
  ].join("");

  return (
    <html lang="pt-BR" className={classesDeFonte}>
      <body>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
