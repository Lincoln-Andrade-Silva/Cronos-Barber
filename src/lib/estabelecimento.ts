import { cache } from "react";
import { db } from "@/db";
import { estabelecimentoInfo, type Aparencia, type EstabelecimentoInfo } from "@/db/schema";
import { normalizarAparencia } from "@/lib/aparencia";

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

/**
 * Tema/fonte por área, já com os defaults aplicados. Lida no layout raiz, então nunca
 * pode derrubar o render: se o banco falhar (ex: build sem acesso), cai no tema padrão.
 */
export const getAparencia = cache(async (): Promise<Aparencia> => {
  try {
    const info = await getEstabelecimentoInfo();
    return normalizarAparencia(info?.aparencia);
  } catch (err) {
    console.error("Falha ao ler aparência, usando o tema padrão:", err);
    return normalizarAparencia(null);
  }
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
