"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

export interface BarbeiroOpcao {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

const CHAVE_CACHE = "agenda:ultimoBarbeiro";

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

  // Sem barbeiro na URL: usa o último salvo, se ainda existir na lista.
  useEffect(() => {
    if (searchParams.get("barbeiro")) return;
    const salvo = localStorage.getItem(CHAVE_CACHE);
    if (salvo && salvo !== atual && barbeiros.some((b) => b.id === salvo)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("barbeiro", salvo);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, atual, barbeiros, pathname, router]);

  function selecionar(id: string) {
    localStorage.setItem(CHAVE_CACHE, id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("barbeiro", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={atual}
      onChange={selecionar}
      withAvatar
      options={barbeiros.map((b) => ({ value: b.id, label: b.nome, avatarUrl: b.fotoUrl }))}
      className="w-full sm:w-52"
    />
  );
}
