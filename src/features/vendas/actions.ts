"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { produtos, vendasProdutos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function excluirVenda(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(vendasProdutos).where(eq(vendasProdutos.id, id));
  revalidatePath("/admin/vendas");
}

export interface VendaFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  produtoId: z.string().uuid("Selecione um produto."),
  quantidade: z.coerce.number().int().min(1, "Quantidade mínima é 1.").max(999),
  barbeiroId: z.string().uuid("Selecione um profissional."),
  clienteId: z.string().uuid().nullable(),
});

export async function registrarVenda(
  produtoId: string,
  quantidade: number,
  barbeiroId: string,
  clienteId: string | null,
): Promise<VendaFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    produtoId,
    quantidade,
    barbeiroId,
    clienteId: clienteId || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = parsed.data;

  try {
    const [produto] = await db.select().from(produtos).where(eq(produtos.id, dados.produtoId));
    if (!produto) return { error: "Produto não encontrado." };

    const valorUnitario = Number(produto.valor);
    const total = valorUnitario * dados.quantidade;

    await db.insert(vendasProdutos).values({
      produtoId: dados.produtoId,
      quantidade: dados.quantidade,
      valorUnitario: valorUnitario.toFixed(2),
      total: total.toFixed(2),
      barbeiroId: dados.barbeiroId,
      clienteId: dados.clienteId,
    });
  } catch (err) {
    console.error("Falha ao registrar venda:", err);
    return { error: "Não foi possível registrar a venda. Tente novamente." };
  }

  revalidatePath("/admin/vendas");
  return { ok: true };
}
