"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { estabelecimentoInfo, type Aparencia } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { normalizarAparencia } from "@/lib/aparencia";

export interface AparenciaFormState {
  ok?: boolean;
  error?: string;
}

export async function salvarAparencia(valor: Aparencia): Promise<AparenciaFormState> {
  await requireAdmin();

  // Normaliza no servidor: nada cru do client vai pro banco.
  const aparencia = normalizarAparencia(valor);
  const agora = new Date();

  try {
    await db
      .insert(estabelecimentoInfo)
      .values({ id: 1, aparencia, atualizadoEm: agora })
      .onConflictDoUpdate({
        target: estabelecimentoInfo.id,
        set: { aparencia, atualizadoEm: agora },
      });
  } catch (err) {
    console.error("Falha ao salvar aparência:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  // O tema vale para o app inteiro (vitrine e admin).
  revalidatePath("/", "layout");
  return { ok: true };
}
