"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas, planos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { getIntegracaoPagamento } from "@/lib/pagamento";
import { cancelarPreapproval, criarPreapproval } from "@/lib/mercadopago";

async function baseUrl(): Promise<string> {
  const cfg = await getIntegracaoPagamento();
  if (cfg?.siteUrl) return cfg.siteUrl;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export interface AssinarResult {
  error?: string;
}

/** Inicia a compra do plano: cria a assinatura recorrente no MP e redireciona ao checkout. */
export async function assinarPlano(planoId: string): Promise<AssinarResult> {
  const profile = await getCurrentProfile();

  const [plano] = await db.select().from(planos).where(eq(planos.id, planoId));
  if (!plano || !plano.ativo) return { error: "Plano indisponível." };

  const [jaAtiva] = await db
    .select({ id: assinaturas.id })
    .from(assinaturas)
    .where(
      and(
        eq(assinaturas.clienteId, profile.id),
        eq(assinaturas.planoId, planoId),
        eq(assinaturas.status, "ativo"),
      ),
    );
  if (jaAtiva) return { error: "Você já tem esse plano ativo." };

  let initPoint: string;
  try {
    const pre = await criarPreapproval({
      planoNome: plano.nome,
      valor: Number(plano.valor),
      payerEmail: profile.email,
      externalReference: `${profile.id}:${plano.id}`,
      baseUrl: await baseUrl(),
    });
    initPoint = pre.initPoint;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Falha ao criar assinatura MP:", msg);
    return { error: `MP: ${msg}`.slice(0, 400) };
  }

  redirect(initPoint);
}

export async function cancelarAssinaturaCliente(id: string): Promise<AssinarResult> {
  const profile = await getCurrentProfile();

  const [assinatura] = await db
    .select()
    .from(assinaturas)
    .where(and(eq(assinaturas.id, id), eq(assinaturas.clienteId, profile.id)));
  if (!assinatura) return { error: "Assinatura não encontrada." };

  if (assinatura.gatewayAssinaturaId) {
    try {
      await cancelarPreapproval(assinatura.gatewayAssinaturaId);
    } catch (e) {
      // Não inativa localmente se o gateway não confirmou: evita cobrança fantasma.
      console.error("Falha ao cancelar no MP:", e);
      return { error: "Não foi possível cancelar agora. Tente novamente em instantes." };
    }
  }

  await db.update(assinaturas).set({ status: "inativo" }).where(eq(assinaturas.id, id));
  revalidatePath("/minhas-assinaturas");
  return {};
}
