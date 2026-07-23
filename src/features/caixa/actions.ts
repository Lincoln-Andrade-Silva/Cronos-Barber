"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { movimentacoesCaixa } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { instanteSlot } from "@/lib/disponibilidade";
import { categoriasValidas } from "./categorias";

export interface MovimentacaoFormState {
  ok?: boolean;
  error?: string;
}

const schema = z
  .object({
    tipo: z.enum(["entrada", "saida"], { message: "Selecione o tipo." }),
    categoria: z.string(),
    descricao: z.string().trim().min(2, "Informe a descrição."),
    valor: z.coerce.number({ message: "Valor inválido." }).positive("Valor deve ser maior que zero."),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  })
  .refine((d) => categoriasValidas(d.tipo).includes(d.categoria), {
    message: "Categoria inválida para o tipo.",
    path: ["categoria"],
  });

export interface SalvarMovimentacaoInput {
  id?: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
}

export async function salvarMovimentacao(
  input: SalvarMovimentacaoInput,
): Promise<MovimentacaoFormState> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { tipo, categoria, descricao, valor, data } = parsed.data;
  const valores = {
    tipo,
    categoria,
    descricao,
    valor: valor.toFixed(2),
    data: instanteSlot(data, "12:00"),
  };

  try {
    if (input.id) {
      await db.update(movimentacoesCaixa).set(valores).where(eq(movimentacoesCaixa.id, input.id));
    } else {
      await db.insert(movimentacoesCaixa).values({ ...valores, criadoPorId: admin.id });
    }
  } catch (err) {
    console.error("Falha ao salvar movimentação:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/caixa");
  return { ok: true };
}

export async function excluirMovimentacao(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(movimentacoesCaixa).where(eq(movimentacoesCaixa.id, id));
  revalidatePath("/admin/caixa");
}
