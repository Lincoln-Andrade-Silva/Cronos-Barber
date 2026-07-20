"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { servicos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface ServicoFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço."),
  descricao: z.string().trim().max(500).optional(),
  preco: z.coerce.number({ message: "Preço inválido." }).min(0, "Preço não pode ser negativo."),
  duracaoMinutos: z.coerce
    .number({ message: "Duração inválida." })
    .int()
    .min(5, "Duração mínima é 5 minutos.")
    .max(600, "Duração máxima é 600 minutos."),
  ativo: z.boolean(),
});

export async function salvarServico(
  _prev: ServicoFormState,
  formData: FormData,
): Promise<ServicoFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    preco: formData.get("preco"),
    duracaoMinutos: formData.get("duracaoMinutos"),
    ativo: formData.get("ativo") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, descricao, preco, duracaoMinutos, ativo } = parsed.data;
  const id = formData.get("id");

  try {
    const valores = {
      nome,
      descricao: descricao?.trim() || null,
      preco: preco.toFixed(2),
      duracaoMinutos,
      ativo,
    };

    if (typeof id === "string" && id) {
      await db.update(servicos).set(valores).where(eq(servicos.id, id));
    } else {
      await db.insert(servicos).values(valores);
    }
  } catch (err) {
    console.error("Falha ao salvar serviço:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function excluirServico(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(servicos).where(eq(servicos.id, id));
  revalidatePath("/admin/cadastros");
}
