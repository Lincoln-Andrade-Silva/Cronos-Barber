import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { diaCurto } from "./datas";

export interface Kpi {
  label: string;
  valor: string;
  icon: LucideIcon;
}

export function KpiGrid({ cards }: { cards: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {cards.map(({ label, valor, icon: Icon }) => (
        <Card key={label} className="p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-light">
            <Icon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-xs text-muted">{label}</p>
          <p className="mt-0.5 text-xl font-bold">{valor}</p>
        </Card>
      ))}
    </div>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted2">{titulo}</h3>
      {children}
    </Card>
  );
}

const ALTURA_GRAFICO = 180;

export function GraficoBarras({
  dados,
  formato,
}: {
  dados: { dia: string; valor: number }[];
  formato: "moeda" | "numero";
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const temValor = dados.some((d) => d.valor > 0);

  if (!temValor) {
    return <p className="py-8 text-center text-sm text-muted">Sem dados no período.</p>;
  }

  const moeda = formato === "moeda";
  const compacto = (n: number) => {
    if (Math.abs(n) >= 1000) {
      return `${moeda ? "R$ " : ""}${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")}k`;
    }
    return moeda ? formatBRL(n) : String(Math.round(n));
  };
  const completo = (n: number) => (moeda ? formatBRL(n) : String(n));

  const eixoY = [1, 0.75, 0.5, 0.25, 0].map((f) => compacto(Math.round(max * f)));

  const nTicks = Math.min(dados.length, 6);
  const ticks =
    nTicks <= 1
      ? [dados[0]?.dia ?? ""]
      : Array.from(
          { length: nTicks },
          (_, i) => dados[Math.round((i * (dados.length - 1)) / (nTicks - 1))]?.dia ?? "",
        );

  return (
    <div className="flex gap-3">
      <div
        className="flex flex-col justify-between text-right text-[10px] tabular-nums text-muted2"
        style={{ height: ALTURA_GRAFICO }}
      >
        {eixoY.map((l, i) => (
          <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {l}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: ALTURA_GRAFICO }}>
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} className="absolute inset-x-0 h-px bg-line/30" style={{ top: `${p}%` }} />
          ))}

          <div className="absolute inset-0 flex items-end justify-between gap-[3px]">
            {dados.map((d) => (
              <div
                key={d.dia}
                className="group relative flex h-full min-w-[5px] flex-1 items-end justify-center"
              >
                <div className="absolute inset-0 rounded bg-transparent transition group-hover:bg-surface/40" />
                <div
                  className="relative w-full max-w-[40px] rounded-t bg-gradient-to-t from-brand/50 to-brand-light transition-all group-hover:from-brand"
                  style={{ height: `${Math.max((d.valor / max) * 100, d.valor > 0 ? 2 : 0)}%` }}
                />
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-panel px-2 py-1 text-[10px] shadow-xl group-hover:block">
                  <span className="block text-center text-muted2">{diaCurto(d.dia)}</span>
                  <span className="block text-center font-bold text-ink">{completo(d.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex justify-between border-t border-line pt-1.5 text-[10px] text-muted2">
          {ticks.map((t, i) => (
            <span key={i}>{diaCurto(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface ItemRanking {
  nome: string;
  destaque: string;
  sub?: string;
  proporcao: number;
}

export function Ranking({ itens, vazio }: { itens: ItemRanking[]; vazio: string }) {
  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{vazio}</p>;
  }
  return (
    <div className="space-y-2">
      {itens.map((item, idx) => (
        <div key={`${item.nome}-${idx}`} className="relative overflow-hidden rounded-lg border border-line/60">
          <div
            className="absolute inset-y-0 left-0 bg-brand/10"
            style={{ width: `${Math.max(item.proporcao, 4)}%` }}
          />
          <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-bold text-muted2">
                {idx + 1}
              </span>
              <span className="truncate text-sm font-medium">{item.nome}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-sm font-bold">{item.destaque}</span>
              {item.sub && <span className="ml-2 text-xs text-muted">{item.sub}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Tabela({
  cabecalho,
  linhas,
  vazio,
}: {
  cabecalho: string[];
  linhas: string[][];
  vazio: string;
}) {
  if (linhas.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{vazio}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted2">
            {cabecalho.map((c, i) => (
              <th key={c} className={i === 0 ? "pb-2 font-semibold" : "pb-2 text-right font-semibold"}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {linhas.map((linha, idx) => (
            <tr key={idx} className="transition hover:bg-surface/40">
              {linha.map((celula, i) => (
                <td key={i} className={i === 0 ? "py-2.5 font-medium" : "py-2.5 text-right tabular-nums text-muted"}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
