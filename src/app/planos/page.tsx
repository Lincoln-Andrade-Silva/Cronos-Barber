import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Check, RefreshCw } from "lucide-react";
import { db } from "@/db";
import { assinaturas, planoServicos, planos, servicos } from "@/db/schema";
import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { ClienteHeader } from "@/features/cliente/cliente-header";
import { AssinarButton } from "@/features/planos/assinar-button";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const listaPlanos = await db
    .select()
    .from(planos)
    .where(eq(planos.ativo, true))
    .orderBy(asc(planos.valor));

  const ids = listaPlanos.map((p) => p.id);
  const [vinculos, ativas] = await Promise.all([
    ids.length
      ? db
          .select({ planoId: planoServicos.planoId, servicoNome: servicos.nome })
          .from(planoServicos)
          .innerJoin(servicos, eq(planoServicos.servicoId, servicos.id))
          .where(inArray(planoServicos.planoId, ids))
      : Promise.resolve([]),
    db
      .select({ planoId: assinaturas.planoId })
      .from(assinaturas)
      .where(and(eq(assinaturas.clienteId, profile.id), eq(assinaturas.status, "ativo"))),
  ]);

  const ativosSet = new Set(ativas.map((a) => a.planoId));

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <ClienteHeader nomeUsuario={profile.nome} />
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Planos</h1>
      <p className="mb-4 text-sm text-muted">Assine e economize nos seus atendimentos.</p>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/10 p-3">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" />
        <p className="text-xs text-muted">
          A cobrança é <strong className="text-ink">mensal e recorrente</strong> no cartão: renova
          automaticamente todo mês até você cancelar. Para cancelar, acesse{" "}
          <Link href="/minhas-assinaturas" className="font-semibold text-brand-light underline">
            Minhas assinaturas
          </Link>{" "}
          a qualquer momento.
        </p>
      </div>

      {listaPlanos.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nenhum plano disponível no momento.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {listaPlanos.map((plano) => {
            const servs = vinculos.filter((v) => v.planoId === plano.id);
            return (
              <Card key={plano.id} className="flex flex-col">
                <p className="text-lg font-bold">{plano.nome}</p>
                <p className="mt-1">
                  <span className="text-2xl font-extrabold text-brand-light">
                    {formatBRL(plano.valor)}
                  </span>
                  <span className="text-sm text-muted"> /mês</span>
                </p>

                <ul className="mt-4 flex-1 space-y-1.5">
                  {servs.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="truncate">{s.servicoNome}</span>
                    </li>
                  ))}
                  {servs.length === 0 && (
                    <li className="text-sm text-muted2">Sem serviços vinculados.</li>
                  )}
                </ul>

                <div className="mt-5">
                  <AssinarButton planoId={plano.id} ativo={ativosSet.has(plano.id)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
