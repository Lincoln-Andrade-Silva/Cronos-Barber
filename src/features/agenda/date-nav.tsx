"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui";

export function DateNav({ data }: { data: string }) {
  const router = useRouter();

  function ir(novaData: string) {
    router.push(`/admin/agenda?data=${novaData}`);
  }

  function deslocar(dias: number) {
    const d = new Date(`${data}T12:00:00-03:00`);
    d.setDate(d.getDate() + dias);
    ir(d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Dia anterior"
        onClick={() => deslocar(-1)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <Input
        type="date"
        value={data}
        onChange={(e) => e.target.value && ir(e.target.value)}
        className="h-11 w-auto"
      />
      <button
        type="button"
        aria-label="Próximo dia"
        onClick={() => deslocar(1)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface hover:text-ink"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
