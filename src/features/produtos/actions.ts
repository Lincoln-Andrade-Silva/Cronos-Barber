"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { produtos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface ProdutoFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto."),
  valor: z.coerce.number({ message: "Valor inválido." }).min(0, "Valor não pode ser negativo."),
  status: z.enum(["ativo", "inativo"]),
});

export async function salvarProduto(
  _prev: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    valor: formData.get("valor"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, valor, status } = parsed.data;
  const id = formData.get("id");

  try {
    const valores = { nome, valor: valor.toFixed(2), status };
    if (typeof id === "string" && id) {
      await db.update(produtos).set(valores).where(eq(produtos.id, id));
    } else {
      await db.insert(produtos).values(valores);
    }
  } catch (err) {
    console.error("Falha ao salvar produto:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function alternarStatusProduto(
  id: string,
  status: "ativo" | "inativo",
): Promise<void> {
  await requireAdmin();
  await db.update(produtos).set({ status }).where(eq(produtos.id, id));
  revalidatePath("/admin/cadastros");
}

export async function excluirProduto(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(produtos).where(eq(produtos.id, id));
  revalidatePath("/admin/cadastros");
}
