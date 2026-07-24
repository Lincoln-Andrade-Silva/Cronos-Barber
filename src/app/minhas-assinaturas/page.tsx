import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { AlertTriangle, CalendarClock, CreditCard, Gift } from "lucide-react";
import { db } from "@/db";
import { assinaturas, planos } from "@/db/schema";
import { Badge, Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { ClienteHeader } from "@/features/cliente/cliente-header";
import { CancelarButton } from "@/features/planos/cancelar-button";
import { sincronizarAssinatura } from "@/features/planos/sincronizar";

export const dynamic = "force-dynamic";

function dataBR(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function MinhasAssinaturasPage({
  searchParams,
}: {
  searchParams: { preapproval_id?: string };
}) {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  // Ao voltar do checkout do MP, ativa a assinatura na hora (sem depender do webhook).
  if (searchParams.preapproval_id) {
    await sincronizarAssinatura(searchParams.preapproval_id, profile.id);
  }

  const rows = await db
    .select({
      id: assinaturas.id,
      planoId: assinaturas.planoId,
      status: assinaturas.status,
      gratuito: assinaturas.gratuito,
      metodo: assinaturas.metodo,
      proximaCobranca: assinaturas.proximaCobranca,
      gatewayAssinaturaId: assinaturas.gatewayAssinaturaId,
      falhaPagamento: assinaturas.falhaPagamento,
      planoNome: planos.nome,
      valor: planos.valor,
    })
    .from(assinaturas)
    .innerJoin(planos, eq(assinaturas.planoId, planos.id))
    .where(eq(assinaturas.clienteId, profile.id))
    .orderBy(desc(assinaturas.criadoEm));

  // Plano com assinatura ativa não deve exibir aviso de falha de uma tentativa antiga.
  const planosAtivos = new Set(rows.filter((r) => r.status === "ativo").map((r) => r.planoId));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <ClienteHeader nomeUsuario={profile.nome} />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Minhas assinaturas</h1>

      {rows.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-muted">Você ainda não tem assinaturas.</p>
          <Link
            href="/planos"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-brand-fg shadow-brand transition hover:bg-brand-dark"
          >
            <CreditCard className="h-4 w-4" />
            Ver planos
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const ativo = a.status === "ativo";
            const proxima = dataBR(a.proximaCobranca);
            const mostrarFalha = !ativo && a.falhaPagamento && !planosAtivos.has(a.planoId);
            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {a.gratuito ? (
                        <Gift className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <CreditCard className="h-4 w-4 shrink-0 text-brand-light" />
                      )}
                      <span className="truncate">{a.planoNome}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {a.gratuito ? "Cortesia (sem cobrança)" : `${formatBRL(a.valor)} /mês`}
                    </p>
                  </div>
                  {ativo ? (
                    <Badge tone="success">Ativa</Badge>
                  ) : (
                    <Badge tone="muted">Inativa</Badge>
                  )}
                </div>

                {ativo && !a.gratuito && proxima && (
                  <p className="flex items-center gap-1.5 text-xs text-muted2">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Próxima cobrança em {proxima}
                  </p>
                )}

                {mostrarFalha && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="text-xs text-amber-200">
                      <p className="font-semibold">Pagamento não aprovado</p>
                      <p className="mt-0.5 text-amber-200/80">
                        A cobrança mensal falhou e este plano foi cancelado. Para continuar usando,{" "}
                        <Link href="/planos" className="font-semibold underline">
                          assine novamente
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )}

                {ativo && a.gatewayAssinaturaId && (
                  <div className="border-t border-line pt-3">
                    <CancelarButton id={a.id} planoNome={a.planoNome} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
