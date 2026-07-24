"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import type { Aparencia } from "@/db/schema";
import { Button, ColorPicker, Field, FormError, FormSuccess, Segmented, Select } from "@/components/ui";
import { FONTES_CORPO, FONTES_TITULO, variavelDaFonte } from "@/lib/fontes";
import {
  contraste,
  derivarPaleta,
  esquemaDeCor,
  paletaDeSelecao,
  varsDeCor,
  varsDeFeedback,
  type CoresBase,
  type ModoTema,
} from "@/lib/aparencia";
import { salvarAparencia } from "./actions";
import { Preview } from "./preview";

const TEMAS: { value: ModoTema; label: string }[] = [
  { value: "escuro", label: "Escuro" },
  { value: "claro", label: "Claro" },
  { value: "personalizado", label: "Personalizado" },
];

const CAMPOS_DE_COR: { chave: keyof CoresBase; rotulo: string; descricao: string }[] = [
  { chave: "bg", rotulo: "Fundo", descricao: "Fundo das páginas." },
  { chave: "surface", rotulo: "Superfície", descricao: "Campos, cards e áreas destacadas." },
  { chave: "ink", rotulo: "Texto", descricao: "Texto principal e ícones." },
  { chave: "line", rotulo: "Linhas", descricao: "Bordas e divisórias." },
  { chave: "brand", rotulo: "Marca", descricao: "Botão principal e destaques." },
];

const CONTRASTE_MINIMO = 4.5;

function razao(valor: number): string {
  return `${valor.toFixed(1).replace(".", ",")}:1`;
}

export function AparenciaForm({ inicial, nome }: { inicial: Aparencia; nome: string }) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [tema, setTema] = useState<ModoTema>(inicial.tema);
  const [cores, setCores] = useState<CoresBase>({
    bg: inicial.bg,
    surface: inicial.surface,
    ink: inicial.ink,
    line: inicial.line,
    brand: inicial.brand,
  });
  const [fonteCorpo, setFonteCorpo] = useState(inicial.fonteCorpo);
  const [fonteTitulo, setFonteTitulo] = useState(inicial.fonteTitulo);

  const paleta = useMemo(() => paletaDeSelecao(tema, cores), [tema, cores]);
  const esquema = esquemaDeCor(paleta);
  const varsPreview = useMemo(
    () => ({ ...varsDeCor(paleta), ...varsDeFeedback(esquema) }),
    [paleta, esquema],
  );
  const fonteCorpoVar = variavelDaFonte(fonteCorpo, FONTES_CORPO);
  const fonteTituloVar = variavelDaFonte(fonteTitulo, FONTES_TITULO);

  // Aplica a escolha ao vivo no documento (o painel muda na hora); ao sair da tela
  // sem salvar, a limpeza restaura o tema salvo - é o "descarta se sair sem salvar".
  useEffect(() => {
    const root = document.documentElement;
    const overrides: Record<string, string> = {
      ...varsPreview,
      "color-scheme": esquema,
      "--font-sans": `var(${fonteCorpoVar})`,
      "--font-display": `var(${fonteTituloVar})`,
    };
    for (const [prop, valor] of Object.entries(overrides)) root.style.setProperty(prop, valor);
    return () => {
      for (const prop of Object.keys(overrides)) root.style.removeProperty(prop);
    };
  }, [esquema, varsPreview, fonteCorpoVar, fonteTituloVar]);

  function trocarCor(chave: keyof CoresBase, hex: string) {
    setSucesso(false);
    setCores((atual) => ({ ...atual, [chave]: hex }));
  }

  const avisosDeContraste: string[] = [];
  if (tema === "personalizado") {
    const derivada = derivarPaleta(cores);
    const textoPrincipal = contraste(cores.ink, cores.bg);
    const textoSecundario = contraste(derivada.muted, cores.bg);
    if (textoPrincipal < CONTRASTE_MINIMO) {
      avisosDeContraste.push(
        `Texto sobre o fundo está em ${razao(textoPrincipal)} - abaixo de 4,5:1, a leitura fica difícil.`,
      );
    }
    if (textoSecundario < CONTRASTE_MINIMO) {
      avisosDeContraste.push(
        `Textos de apoio ficam em ${razao(textoSecundario)} sobre o fundo - aproxime o Texto do extremo oposto ao Fundo.`,
      );
    }
  }

  function salvar() {
    setErro(null);
    setSucesso(false);
    iniciar(async () => {
      const res = await salvarAparencia({ tema, ...cores, fonteCorpo, fonteTitulo });
      if (res.error) {
        setErro(res.error);
        return;
      }
      setSucesso(true);
      router.refresh();
    });
  }

  const controles = (
    <div className="space-y-6">
      <Field label="Tema">
        <Segmented options={TEMAS} value={tema} onChange={setTema} />
      </Field>

      {tema === "personalizado" && (
        <div className="space-y-3 rounded-xl border border-line p-4">
          <p className="text-xs text-muted">
            As demais cores saem destas cinco - tons de apoio, bordas e o texto sobre a marca são
            calculados para acompanhar a escolha.
          </p>
          {CAMPOS_DE_COR.map(({ chave, rotulo, descricao }) => (
            <div key={chave} className="flex items-center gap-3">
              <ColorPicker
                value={cores[chave]}
                onChange={(hex) => trocarCor(chave, hex)}
                rotulo={rotulo}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{rotulo}</p>
                <p className="text-xs text-muted">{descricao}</p>
              </div>
              <span className="ml-auto font-mono text-xs uppercase text-muted2">{cores[chave]}</span>
            </div>
          ))}
        </div>
      )}

      <Field label="Fonte do corpo">
        <Select
          value={fonteCorpo}
          onChange={(v) => {
            setSucesso(false);
            setFonteCorpo(v);
          }}
          options={FONTES_CORPO.map((f) => ({ value: f.chave, label: f.nome }))}
        />
      </Field>

      <Field label="Fonte dos títulos">
        <Select
          value={fonteTitulo}
          onChange={(v) => {
            setSucesso(false);
            setFonteTitulo(v);
          }}
          options={FONTES_TITULO.map((f) => ({ value: f.chave, label: f.nome }))}
        />
      </Field>

      {avisosDeContraste.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-warning-line bg-warning-surface px-4 py-3">
          {avisosDeContraste.map((aviso) => (
            <p key={aviso} className="flex gap-2 text-sm text-warning-ink">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {aviso}
            </p>
          ))}
        </div>
      )}

      {erro && <FormError>{erro}</FormError>}
      {sucesso && <FormSuccess>Aparência salva.</FormSuccess>}

      <Button type="button" className="h-11 w-full sm:w-auto" disabled={salvando} onClick={salvar}>
        {salvando ? "Salvando..." : "Salvar aparência"}
      </Button>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="max-w-2xl">{controles}</div>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          Prévia do tema
        </p>
        <Preview
          vars={varsPreview}
          fonteCorpoVar={fonteCorpoVar}
          fonteTituloVar={fonteTituloVar}
          nome={nome}
        />
      </div>
    </div>
  );
}
