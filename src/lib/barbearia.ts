import { cache } from "react";
import { db } from "@/db";
import { barbeariaInfo, type BarbeariaInfo } from "@/db/schema";

export const NOME_PADRAO = "Cronos Barber";

// `cache` dedupe a leitura dentro do mesmo request.
export const getBarbeariaInfo = cache(async (): Promise<BarbeariaInfo | null> => {
  const [info] = await db.select().from(barbeariaInfo).limit(1);
  return info ?? null;
});

export const getBarbeariaNome = cache(async (): Promise<string> => {
  const info = await getBarbeariaInfo();
  return info?.nome?.trim() || NOME_PADRAO;
});

export interface BarbeariaBrand {
  nome: string;
  logoUrl: string | null;
}

export const getBarbeariaBrand = cache(async (): Promise<BarbeariaBrand> => {
  const info = await getBarbeariaInfo();
  return {
    nome: info?.nome?.trim() || NOME_PADRAO,
    logoUrl: info?.logoUrl ?? null,
  };
});
