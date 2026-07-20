"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { planoServicos, planos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface PlanoFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do plano."),
  valor: z.coerce.number({ message: "Valor inválido." }).min(0, "Valor não pode ser negativo."),
  diasValidade: z.coerce
    .number({ message: "Validade inválida." })
    .int()
    .min(1, "Validade mínima é 1 dia.")
    .max(3650, "Validade máxima é 3650 dias."),
  ativo: z.boolean(),
});

export async function salvarPlano(
  _prev: PlanoFormState,
  formData: FormData,
): Promise<PlanoFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    valor: formData.get("valor"),
    diasValidade: formData.get("diasValidade"),
    ativo: formData.get("ativo") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, valor, diasValidade, ativo } = parsed.data;
  const id = formData.get("id");
  const vinculos = formData
    .getAll("servicoIds")
    .map(String)
    .filter((sid) => z.string().uuid().safeParse(sid).success)
    .map((servicoId) => {
      const raw = formData.get(`limite_${servicoId}`);
      const n = raw === null || raw === "" ? null : Number(raw);
      const limite = n !== null && Number.isInteger(n) && n > 0 ? n : null;
      return { servicoId, limite };
    });
  const diasValidos = formData
    .getAll("diasValidos")
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

  try {
    let planoId: string;
    const valores = { nome, valor: valor.toFixed(2), diasValidade, diasValidos, ativo };
    if (typeof id === "string" && id) {
      await db.update(planos).set(valores).where(eq(planos.id, id));
      await db.delete(planoServicos).where(eq(planoServicos.planoId, id));
      planoId = id;
    } else {
      const [novo] = await db.insert(planos).values(valores).returning({ id: planos.id });
      planoId = novo.id;
    }

    if (vinculos.length > 0) {
      await db
        .insert(planoServicos)
        .values(vinculos.map((v) => ({ planoId, servicoId: v.servicoId, limite: v.limite })));
    }
  } catch (err) {
    console.error("Falha ao salvar plano:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function excluirPlano(id: string): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.delete(planos).where(eq(planos.id, id));
  } catch (err) {
    console.error("Falha ao excluir plano:", err);
    return { error: "Não é possível excluir um plano com assinaturas vinculadas." };
  }
  revalidatePath("/admin/cadastros");
  return { ok: true };
}
