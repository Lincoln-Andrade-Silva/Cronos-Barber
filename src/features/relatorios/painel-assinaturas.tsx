import { and, eq, gte, lt } from "drizzle-orm";
import { CreditCard, Repeat, Receipt, UserPlus, UserMinus } from "lucide-react";
import { db } from "@/db";
import { assinaturas, planos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { KpiGrid, Ranking, Secao } from "./ui";

export async function PainelAssinaturas({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const [ativas, novas, inativas] = await Promise.all([
    db
      .select({ planoNome: planos.nome, valor: planos.valor })
      .from(assinaturas)
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(eq(assinaturas.status, "ativo")),
    db
      .select({ id: assinaturas.id })
      .from(assinaturas)
      .where(and(gte(assinaturas.dataInicio, inicio), lt(assinaturas.dataInicio, fimExclusivo))),
    db.select({ id: assinaturas.id }).from(assinaturas).where(eq(assinaturas.status, "inativo")),
  ]);

  const recorrente = ativas.reduce((s, a) => s + Number(a.valor), 0);
  const ticket = ativas.length > 0 ? recorrente / ativas.length : 0;

  const porPlano = new Map<string, { qtd: number; receita: number }>();
  for (const a of ativas) {
    const p = porPlano.get(a.planoNome) ?? { qtd: 0, receita: 0 };
    p.qtd += 1;
    p.receita += Number(a.valor);
    porPlano.set(a.planoNome, p);
  }
  const planosRank = [...porPlano.entries()].sort((a, b) => b[1].qtd - a[1].qtd);
  const maxPlano = Math.max(1, ...planosRank.map(([, v]) => v.qtd));

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Assinaturas ativas", valor: String(ativas.length), icon: CreditCard },
          { label: "Receita recorrente", valor: formatBRL(recorrente), icon: Repeat },
          { label: "Ticket médio", valor: formatBRL(ticket), icon: Receipt },
          { label: "Novas no período", valor: String(novas.length), icon: UserPlus },
          { label: "Inativas", valor: String(inativas.length), icon: UserMinus },
        ]}
      />

      <Secao titulo="Planos mais assinados">
        <Ranking
          vazio="Nenhuma assinatura ativa."
          itens={planosRank.map(([nome, v]) => ({
            nome,
            destaque: `${v.qtd}`,
            sub: `${formatBRL(v.receita)}/mês`,
            proporcao: (v.qtd / maxPlano) * 100,
          }))}
        />
      </Secao>
    </div>
  );
}
