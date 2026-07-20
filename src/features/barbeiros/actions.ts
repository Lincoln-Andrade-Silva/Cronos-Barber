"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { barbeiros } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { uploadImagem } from "@/lib/storage";

export interface BarbeiroFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do barbeiro."),
  comissao: z.coerce
    .number({ message: "Comissão inválida." })
    .min(0, "Comissão mínima é 0%.")
    .max(100, "Comissão máxima é 100%."),
  ativo: z.boolean(),
});

export async function salvarBarbeiro(
  _prev: BarbeiroFormState,
  formData: FormData,
): Promise<BarbeiroFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    comissao: formData.get("comissao"),
    ativo: formData.get("ativo") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, comissao, ativo } = parsed.data;
  const id = formData.get("id");
  const foto = formData.get("foto");

  try {
    let fotoUrl: string | undefined;
    if (foto instanceof File && foto.size > 0) {
      fotoUrl = await uploadImagem(foto, "barbeiros");
    }

    if (typeof id === "string" && id) {
      await db
        .update(barbeiros)
        .set({
          nome,
          comissaoPercentual: comissao.toFixed(2),
          ativo,
          ...(fotoUrl ? { fotoUrl } : {}),
        })
        .where(eq(barbeiros.id, id));
    } else {
      await db.insert(barbeiros).values({
        nome,
        comissaoPercentual: comissao.toFixed(2),
        ativo,
        fotoUrl: fotoUrl ?? null,
      });
    }
  } catch (err) {
    console.error("Falha ao salvar barbeiro:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function alternarAtivoBarbeiro(id: string, ativo: boolean): Promise<void> {
  await requireAdmin();
  await db.update(barbeiros).set({ ativo }).where(eq(barbeiros.id, id));
  revalidatePath("/admin/cadastros");
}

export async function excluirBarbeiro(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(barbeiros).where(eq(barbeiros.id, id));
  revalidatePath("/admin/cadastros");
}
