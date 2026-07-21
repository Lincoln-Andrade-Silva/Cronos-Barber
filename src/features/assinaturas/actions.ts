"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assinaturas } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface AssinaturaFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  clienteId: z.string().uuid("Selecione um cliente."),
  planoId: z.string().uuid("Selecione um plano."),
  status: z.enum(["ativo", "inativo"]),
});

export async function salvarAssinatura(
  _prev: AssinaturaFormState,
  formData: FormData,
): Promise<AssinaturaFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    clienteId: formData.get("clienteId"),
    planoId: formData.get("planoId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { clienteId, planoId, status } = parsed.data;
  const id = formData.get("id");

  try {
    if (typeof id === "string" && id) {
      await db.update(assinaturas).set({ planoId, status }).where(eq(assinaturas.id, id));
    } else {
      await db
        .insert(assinaturas)
        .values({ clienteId, planoId, status, gratuito: true, metodo: "manual" });
    }
  } catch (err) {
    console.error("Falha ao salvar assinatura:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/assinaturas");
  return { ok: true };
}

export async function excluirAssinatura(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(assinaturas).where(eq(assinaturas.id, id));
  revalidatePath("/admin/assinaturas");
}
