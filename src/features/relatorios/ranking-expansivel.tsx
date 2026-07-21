"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./ui";

export interface LinhaExpansao {
  nome: string;
  qtd: number;
  valor: string;
  extra?: string;
}

export interface ItemExpansivel {
  id: string;
  nome: string;
  foto: string | null;
  destaque: string;
  sub?: string;
  proporcao: number;
  colValor: string;
  colExtra?: string;
  linhas: LinhaExpansao[];
  totalValor: string;
  totalExtra?: string;
  totalRotulo?: string;
}

export function RankingExpansivel({ itens, vazio }: { itens: ItemExpansivel[]; vazio: string }) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{vazio}</p>;
  }

  return (
    <div className="space-y-2">
      {itens.map((p, idx) => {
        const exp = aberto === p.id;
        return (
          <div
            key={p.id}
            className={cn(
              "overflow-hidden rounded-xl border transition",
              exp ? "border-brand/40" : "border-line/60",
            )}
          >
            <button
              type="button"
              onClick={() => setAberto(exp ? null : p.id)}
              className="relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface/30"
            >
              <div
                className="absolute inset-y-0 left-0 bg-brand/10"
                style={{ width: `${Math.max(p.proporcao, 4)}%` }}
              />
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-bold text-muted2">
                {idx + 1}
              </span>
              <div className="relative flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar url={p.foto} nome={p.nome} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  {p.sub && <p className="truncate text-[11px] text-muted">{p.sub}</p>}
                </div>
              </div>
              <span className="relative shrink-0 text-sm font-bold">{p.destaque}</span>
              <ChevronDown
                className={cn("relative h-4 w-4 shrink-0 text-muted transition", exp && "rotate-180")}
              />
            </button>

            {exp && (
              <div className="border-t border-line bg-surface/20 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted2">
                  <span className="flex-1">Item</span>
                  <span className="w-10 text-right">Qtd</span>
                  <span className="w-20 text-right">{p.colValor}</span>
                  {p.colExtra && <span className="w-20 text-right">{p.colExtra}</span>}
                </div>

                <div className="space-y-0.5">
                  {p.linhas.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-xs transition hover:bg-surface/50"
                    >
                      <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                      <span className="w-10 text-right tabular-nums text-muted2">{l.qtd}x</span>
                      <span className="w-20 text-right tabular-nums text-muted">{l.valor}</span>
                      {p.colExtra && (
                        <span className="w-20 text-right font-medium tabular-nums text-brand-light">
                          {l.extra}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-1.5 flex items-center gap-3 rounded-md bg-surface/60 px-2 py-2 text-xs font-bold">
                  <span className="flex-1">{p.totalRotulo ?? "Total"}</span>
                  <span className="w-10" />
                  <span className="w-20 text-right tabular-nums">{p.totalValor}</span>
                  {p.colExtra && (
                    <span className="w-20 text-right tabular-nums text-brand-light">
                      {p.totalExtra}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
