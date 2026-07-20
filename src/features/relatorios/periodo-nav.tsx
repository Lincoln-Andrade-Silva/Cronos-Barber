"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";
import { cn } from "@/lib/cn";

function ymd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function hojeSP(): string {
  return ymd(new Date());
}

function diasAtras(n: number): string {
  const d = new Date(`${hojeSP()}T12:00:00-03:00`);
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export function PeriodoNav({ de, ate }: { de: string; ate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function aplicar(novoDe: string, novoAte: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("de", novoDe);
    params.set("ate", novoAte);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hoje = hojeSP();
  const atalhos = [
    { label: "Hoje", de: hoje, ate: hoje },
    { label: "7 dias", de: diasAtras(6), ate: hoje },
    { label: "30 dias", de: diasAtras(29), ate: hoje },
    { label: "Este mês", de: `${hoje.slice(0, 7)}-01`, ate: hoje },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={de}
          max={ate}
          onChange={(e) => e.target.value && aplicar(e.target.value, ate)}
          className="h-11 w-auto"
        />
        <span className="text-sm text-muted">até</span>
        <Input
          type="date"
          value={ate}
          min={de}
          max={hoje}
          onChange={(e) => e.target.value && aplicar(de, e.target.value)}
          className="h-11 w-auto"
        />
      </div>

      <div className="flex gap-1.5">
        {atalhos.map((a) => {
          const ativo = a.de === de && a.ate === ate;
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => aplicar(a.de, a.ate)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition sm:flex-none",
                ativo
                  ? "border-brand bg-brand/10 text-brand-light"
                  : "border-line text-muted hover:text-ink",
              )}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
