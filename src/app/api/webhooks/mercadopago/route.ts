import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas } from "@/db/schema";
import { getPreapproval, validarWebhook } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// MP às vezes faz GET pra validar a URL do webhook.
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const type =
    (body as { type?: string }).type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId =
    (body as { data?: { id?: string } }).data?.id ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id");

  if (!dataId) return NextResponse.json({ ok: true });

  const valido = await validarWebhook({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId: String(dataId),
  });
  if (!valido) return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });

  // Tratamos apenas eventos de assinatura (preapproval).
  const ehPreapproval = type === "subscription_preapproval" || type === "preapproval";
  if (!ehPreapproval) return NextResponse.json({ ok: true });

  try {
    const pre = await getPreapproval(String(dataId));
    const [clienteId, planoId] = (pre.external_reference ?? "").split(":");
    if (!clienteId || !planoId) return NextResponse.json({ ok: true });

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
  } catch (e) {
    console.error("Webhook Mercado Pago:", e);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
