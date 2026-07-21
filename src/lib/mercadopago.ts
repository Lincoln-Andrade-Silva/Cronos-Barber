import { createHmac } from "crypto";
import { getIntegracaoPagamento } from "./pagamento";

const API = "https://api.mercadopago.com";

async function accessToken(): Promise<string> {
  const cfg = await getIntegracaoPagamento();
  if (!cfg?.accessToken) throw new Error("Mercado Pago não configurado.");
  return cfg.accessToken;
}

export interface Preapproval {
  id: string;
  status: string;
  external_reference?: string;
  next_payment_date?: string;
  init_point?: string;
}

/** Cria uma assinatura recorrente (cartão) e devolve o link de checkout do MP. */
export async function criarPreapproval(input: {
  planoNome: string;
  valor: number;
  payerEmail: string;
  externalReference: string;
  baseUrl: string;
}): Promise<{ id: string; initPoint: string }> {
  const token = await accessToken();
  const res = await fetch(`${API}/preapproval`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: input.planoNome,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: `${input.baseUrl}/minhas-assinaturas`,
      notification_url: `${input.baseUrl}/api/webhooks/mercadopago`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(input.valor.toFixed(2)),
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MP preapproval: ${JSON.stringify(data)}`);
  return { id: data.id, initPoint: data.init_point };
}

export async function getPreapproval(id: string): Promise<Preapproval> {
  const token = await accessToken();
  const res = await fetch(`${API}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MP get preapproval: ${JSON.stringify(data)}`);
  return data;
}

export async function cancelarPreapproval(id: string): Promise<void> {
  const token = await accessToken();
  await fetch(`${API}/preapproval/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/** Valida a assinatura (x-signature) da notificação. Sem segredo configurado, aceita (dev). */
export async function validarWebhook(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): Promise<boolean> {
  // Em dev/local a validação é ignorada (facilita testar sem segredo).
  if (process.env.NODE_ENV !== "production") return true;
  const cfg = await getIntegracaoPagamento();
  const secret = cfg?.webhookSecret;
  if (!secret) return true;
  if (!params.xSignature) return false;

  const partes = Object.fromEntries(
    params.xSignature.split(",").map((p) => {
      const [k, v] = p.trim().split("=");
      return [k, v];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const hmac = createHmac("sha256", secret).update(manifest).digest("hex");
  return hmac === v1;
}
