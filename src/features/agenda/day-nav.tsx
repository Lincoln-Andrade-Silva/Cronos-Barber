"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui";

function ymd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function DayNav({ data }: { data: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function ir(novaData: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("data", novaData);
    router.push(`${pathname}?${params.toString()}`);
  }

  function deslocar(dias: number) {
    const d = new Date(`${data}T12:00:00-03:00`);
    d.setDate(d.getDate() + dias);
    ir(ymd(d));
  }

  const nav =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink";

  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Dia anterior" onClick={() => deslocar(-1)} className={nav}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <Input
        type="date"
        value={data}
        onChange={(e) => e.target.value && ir(e.target.value)}
        className="h-11 w-auto"
      />
      <button type="button" aria-label="Próximo dia" onClick={() => deslocar(1)} className={nav}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
