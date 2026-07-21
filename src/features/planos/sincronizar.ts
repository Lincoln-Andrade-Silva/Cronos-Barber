import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas } from "@/db/schema";
import { getPreapproval } from "@/lib/mercadopago";

/**
 * Consulta a assinatura no Mercado Pago e reflete o status no banco.
 * Usado no retorno do checkout (não depende do webhook). Só age sobre a
 * assinatura do próprio cliente (valida o external_reference).
 */
export async function sincronizarAssinatura(
  preapprovalId: string,
  clienteId: string,
): Promise<void> {
  const pre = await getPreapproval(preapprovalId).catch(() => null);
  if (!pre) return;

  const [refCliente, planoId] = (pre.external_reference ?? "").split(":");
  if (refCliente !== clienteId || !planoId) return;

  const ativo = pre.status === "authorized";
  const proxima = pre.next_payment_date ? new Date(pre.next_payment_date) : null;

  const [existente] = await db
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.gatewayAssinaturaId, pre.id));

  if (existente) {
    await db
      .update(assinaturas)
      .set({ status: ativo ? "ativo" : "inativo", proximaCobranca: proxima })
      .where(eq(assinaturas.id, existente.id));
  } else if (ativo) {
    await db.insert(assinaturas).values({
      clienteId,
      planoId,
      status: "ativo",
      gratuito: false,
      metodo: "cartao",
      gatewayAssinaturaId: pre.id,
      proximaCobranca: proxima,
    });
  }
}
