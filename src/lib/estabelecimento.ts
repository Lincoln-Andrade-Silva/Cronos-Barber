import { cache } from "react";
import { db } from "@/db";
import { estabelecimentoInfo, type EstabelecimentoInfo } from "@/db/schema";

export const NOME_PADRAO = "Chronoss";

// `cache` dedupe a leitura dentro do mesmo request.
export const getEstabelecimentoInfo = cache(async (): Promise<EstabelecimentoInfo | null> => {
  const [info] = await db.select().from(estabelecimentoInfo).limit(1);
  return info ?? null;
});

export const getEstabelecimentoNome = cache(async (): Promise<string> => {
  const info = await getEstabelecimentoInfo();
  return info?.nome?.trim() || NOME_PADRAO;
});

export interface EstabelecimentoBrand {
  nome: string;
  logoUrl: string | null;
}

export const getEstabelecimentoBrand = cache(async (): Promise<EstabelecimentoBrand> => {
  const info = await getEstabelecimentoInfo();
  return {
    nome: info?.nome?.trim() || NOME_PADRAO,
    logoUrl: info?.logoUrl ?? null,
  };
});
