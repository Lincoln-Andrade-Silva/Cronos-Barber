"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

export function ExpedienteBarbeiroSelect({
  barbeiros,
  atual,
}: {
  barbeiros: { id: string; nome: string; fotoUrl: string | null }[];
  atual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selecionar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "expediente");
    params.set("barbeiro", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={atual}
      onChange={selecionar}
      withAvatar
      options={barbeiros.map((b) => ({ value: b.id, label: b.nome, avatarUrl: b.fotoUrl }))}
      className="w-full sm:w-64"
    />
  );
}
