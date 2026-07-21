import { eq } from "drizzle-orm";
import { db } from "@/db";
import { integracoesPagamento, type IntegracaoPagamento } from "@/db/schema";

/** Config do gateway (linha única). Server-only — nunca expor o access_token no client. */
export async function getIntegracaoPagamento(): Promise<IntegracaoPagamento | null> {
  const [row] = await db
    .select()
    .from(integracoesPagamento)
    .where(eq(integracoesPagamento.id, 1));
  return row ?? null;
}

export async function getMpAccessToken(): Promise<string | null> {
  const cfg = await getIntegracaoPagamento();
  return cfg?.accessToken ?? null;
}
