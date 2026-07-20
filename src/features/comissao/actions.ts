"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { barbeiros } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface ComissaoFormState {
  ok?: boolean;
  error?: string;
}

export async function salvarComissoes(
  _prev: ComissaoFormState,
  formData: FormData,
): Promise<ComissaoFormState> {
  await requireAdmin();

  const updates: { id: string; comissao: number }[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("comissao_")) continue;
    const id = chave.slice("comissao_".length);
    if (!z.string().uuid().safeParse(id).success) continue;
    const n = Number(valor);
    const comissao = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    updates.push({ id, comissao });
  }

  try {
    for (const u of updates) {
      await db
        .update(barbeiros)
        .set({ comissaoPercentual: u.comissao.toFixed(2) })
        .where(eq(barbeiros.id, u.id));
    }
  } catch (err) {
    console.error("Falha ao salvar comissões:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/barbeiros");
  return { ok: true };
}
