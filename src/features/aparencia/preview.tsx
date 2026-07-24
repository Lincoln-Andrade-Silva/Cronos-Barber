"use client";

import { CalendarCheck, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * Miniatura do painel com o tema em edição. Sobrescreve as CSS vars só no seu
 * container, mostrando o resultado num recorte estável enquanto o painel real
 * muda ao vivo em volta.
 */
export function Preview({
  vars,
  fonteCorpoVar,
  fonteTituloVar,
  nome,
}: {
  vars: Record<string, string>;
  fonteCorpoVar: string;
  fonteTituloVar: string;
  nome: string;
}) {
  const estilo = {
    ...vars,
    "--font-sans": `var(${fonteCorpoVar})`,
    "--font-display": `var(${fonteTituloVar})`,
    fontFamily: "var(--font-sans)",
  } as React.CSSProperties;

  const numeros = [
    { rotulo: "Faturamento", valor: "R$ 1.240" },
    { rotulo: "Atendimentos", valor: "18" },
  ];

  return (
    <div style={estilo} className="overflow-hidden rounded-2xl border border-line bg-bg text-ink">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-fg">
          {nome.charAt(0).toUpperCase()}
        </span>
        <span className="font-display text-base font-extrabold tracking-tight text-ink">Painel</span>
        <button
          type="button"
          disabled
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-fg"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        {numeros.map((item) => (
          <div key={item.rotulo} className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
              {item.rotulo}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink">{item.valor}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 px-4 pb-4">
        {[
          { nome: "Serviço 1", ok: true },
          { nome: "Serviço 2", ok: false },
        ].map((linha) => (
          <div
            key={linha.nome}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
          >
            <CalendarCheck className="h-4 w-4 shrink-0 text-muted2" />
            <span className="text-sm font-medium text-ink">{linha.nome}</span>
            <Star className="h-3.5 w-3.5 fill-brand-light text-brand-light" />
            <span className="ml-auto">
              {linha.ok ? (
                <Badge tone="success">Finalizado</Badge>
              ) : (
                <Badge tone="warning">Agendado</Badge>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
