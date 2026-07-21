"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { integracoesPagamento } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export interface PagamentoFormState {
  ok?: boolean;
  error?: string;
}

export async function salvarIntegracaoPagamento(
  _prev: PagamentoFormState,
  formData: FormData,
): Promise<PagamentoFormState> {
  await requireAdmin();

  const accessToken = String(formData.get("accessToken") ?? "").trim() || null;
  const publicKey = String(formData.get("publicKey") ?? "").trim() || null;
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim() || null;
  const siteUrl = String(formData.get("siteUrl") ?? "").trim().replace(/\/$/, "") || null;

  try {
    await db
      .insert(integracoesPagamento)
      .values({ id: 1, provedor: "mercadopago", accessToken, publicKey, webhookSecret, siteUrl })
      .onConflictDoUpdate({
        target: integracoesPagamento.id,
        set: { accessToken, publicKey, webhookSecret, siteUrl, atualizadoEm: new Date() },
      });
  } catch (err) {
    console.error("Falha ao salvar integração de pagamento:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/configuracoes");
  return { ok: true };
}
