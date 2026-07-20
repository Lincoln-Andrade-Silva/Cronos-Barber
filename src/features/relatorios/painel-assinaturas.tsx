import { and, desc, eq, gte, lt } from "drizzle-orm";
import { CreditCard, Receipt, Repeat, UserMinus, UserPlus } from "lucide-react";
import { db } from "@/db";
import { assinaturas, planos, profiles } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { diaCurto, gerarDias, spYmd } from "./datas";
import { GraficoBarras, KpiGrid, Ranking, Secao, Tabela } from "./ui";

export async function PainelAssinaturas({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const [ativas, novas, inativas] = await Promise.all([
    db
      .select({
        clienteNome: profiles.nome,
        planoNome: planos.nome,
        valor: planos.valor,
        dataInicio: assinaturas.dataInicio,
      })
      .from(assinaturas)
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .innerJoin(profiles, eq(assinaturas.clienteId, profiles.id))
      .where(eq(assinaturas.status, "ativo"))
      .orderBy(desc(assinaturas.dataInicio)),
    db
      .select({ dataInicio: assinaturas.dataInicio })
      .from(assinaturas)
      .where(and(gte(assinaturas.dataInicio, inicio), lt(assinaturas.dataInicio, fimExclusivo))),
    db.select({ id: assinaturas.id }).from(assinaturas).where(eq(assinaturas.status, "inativo")),
  ]);

  const recorrente = ativas.reduce((s, a) => s + Number(a.valor), 0);
  const ticket = ativas.length > 0 ? recorrente / ativas.length : 0;

  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const n of novas) porDia.set(spYmd(n.dataInicio), (porDia.get(spYmd(n.dataInicio)) ?? 0) + 1);
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

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

      <Secao titulo="Novas assinaturas por dia">
        <GraficoBarras dados={serie} formato="numero" />
      </Secao>

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

      <Secao titulo="Assinantes ativos">
        <Tabela
          cabecalho={["Cliente", "Plano", "Desde", "Valor/mês"]}
          linhas={ativas.map((a) => [
            a.clienteNome,
            a.planoNome,
            diaCurto(spYmd(a.dataInicio)),
            formatBRL(a.valor),
          ])}
          vazio="Nenhuma assinatura ativa."
        />
      </Secao>
    </div>
  );
}
