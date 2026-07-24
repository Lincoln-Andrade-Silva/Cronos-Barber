"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categorias } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface CategoriaFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria."),
  ordem: z.coerce.number({ message: "Ordem inválida." }).int().min(0).max(9999),
  ativo: z.boolean(),
});

export async function salvarCategoria(
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    ordem: formData.get("ordem"),
    ativo: formData.get("ativo") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { nome, ordem, ativo } = parsed.data;
  const id = formData.get("id");

  try {
    if (typeof id === "string" && id) {
      await db.update(categorias).set({ nome, ordem, ativo }).where(eq(categorias.id, id));
    } else {
      await db.insert(categorias).values({ nome, ordem, ativo });
    }
  } catch (err) {
    console.error("Falha ao salvar categoria:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function alternarStatusCategoria(id: string, ativo: boolean): Promise<void> {
  await requireAdmin();
  await db.update(categorias).set({ ativo }).where(eq(categorias.id, id));
  revalidatePath("/admin/cadastros");
}

export async function excluirCategoria(id: string): Promise<void> {
  await requireAdmin();
  // FK ON DELETE SET NULL: serviços da categoria ficam sem categoria (grupo "Outros").
  await db.delete(categorias).where(eq(categorias.id, id));
  revalidatePath("/admin/cadastros");
}
