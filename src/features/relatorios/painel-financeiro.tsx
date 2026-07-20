import { and, eq, gte, lt } from "drizzle-orm";
import { Banknote, DollarSign, Receipt, Repeat, Scissors, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { agendamentos, assinaturas, planos, produtos, vendasProdutos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { gerarDias, spYmd } from "./datas";
import { GraficoBarras, KpiGrid, Ranking, Secao } from "./ui";

export async function PainelFinanceiro({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const [finalizados, vendas, ativas] = await Promise.all([
    db
      .select({ dataHora: agendamentos.dataHora, valor: agendamentos.valor, tipo: agendamentos.tipo })
      .from(agendamentos)
      .where(
        and(
          eq(agendamentos.status, "finalizado"),
          gte(agendamentos.dataHora, inicio),
          lt(agendamentos.dataHora, fimExclusivo),
        ),
      ),
    db
      .select({ dataHora: vendasProdutos.dataHora, total: vendasProdutos.total })
      .from(vendasProdutos)
      .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo))),
    db
      .select({ valor: planos.valor })
      .from(assinaturas)
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(eq(assinaturas.status, "ativo")),
  ]);

  const fatServicos = finalizados.reduce((s, r) => s + Number(r.valor), 0);
  const fatProdutos = vendas.reduce((s, r) => s + Number(r.total), 0);
  const fatTotal = fatServicos + fatProdutos;
  const recorrente = ativas.reduce((s, a) => s + Number(a.valor), 0);
  const pagantes = finalizados.filter((r) => r.tipo !== "plano").length;
  const ticket = pagantes > 0 ? fatServicos / pagantes : 0;

  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) porDia.set(spYmd(r.dataHora), (porDia.get(spYmd(r.dataHora)) ?? 0) + Number(r.valor));
  for (const v of vendas) porDia.set(spYmd(v.dataHora), (porDia.get(spYmd(v.dataHora)) ?? 0) + Number(v.total));
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

  const maxComposicao = Math.max(1, fatServicos, fatProdutos, recorrente);

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Faturamento total", valor: formatBRL(fatTotal), icon: DollarSign },
          { label: "Serviços", valor: formatBRL(fatServicos), icon: Scissors },
          { label: "Produtos", valor: formatBRL(fatProdutos), icon: ShoppingBag },
          { label: "Receita recorrente", valor: formatBRL(recorrente), icon: Repeat },
          { label: "Ticket médio", valor: formatBRL(ticket), icon: Receipt },
        ]}
      />

      <Secao titulo="Faturamento por dia">
        <GraficoBarras dados={serie} formato="moeda" />
      </Secao>

      <Secao titulo="Composição do faturamento">
        <Ranking
          vazio="Sem faturamento no período."
          itens={[
            { nome: "Serviços", destaque: formatBRL(fatServicos), proporcao: (fatServicos / maxComposicao) * 100 },
            { nome: "Produtos", destaque: formatBRL(fatProdutos), proporcao: (fatProdutos / maxComposicao) * 100 },
            {
              nome: "Assinaturas (recorrente)",
              destaque: formatBRL(recorrente),
              proporcao: (recorrente / maxComposicao) * 100,
            },
          ]}
        />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted2">
          <Banknote className="h-3.5 w-3.5" />
          Serviços e produtos são do período; a receita recorrente reflete as assinaturas ativas hoje.
        </p>
      </Secao>
    </div>
  );
}
