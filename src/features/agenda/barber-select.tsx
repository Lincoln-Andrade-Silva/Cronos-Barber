"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

export interface BarbeiroOpcao {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

export function BarberSelect({
  barbeiros,
  atual,
}: {
  barbeiros: BarbeiroOpcao[];
  atual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selecionar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("barbeiro", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={atual}
      onChange={selecionar}
      options={barbeiros.map((b) => ({ value: b.id, label: b.nome }))}
      className="w-full sm:w-52"
    />
  );
}
