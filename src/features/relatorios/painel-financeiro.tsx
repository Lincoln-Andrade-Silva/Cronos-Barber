import { and, eq, gte, lt } from "drizzle-orm";
import { DollarSign, Receipt, Repeat, Scissors, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { agendamentos, assinaturas, barbeiros, planos, produtos, vendasProdutos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { diaCurto, gerarDias, spYmd } from "./datas";
import { GraficoBarras, KpiGrid, Ranking, Secao, Tabela } from "./ui";

export async function PainelFinanceiro({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const [finalizados, vendas, ativas] = await Promise.all([
    db
      .select({
        dataHora: agendamentos.dataHora,
        valor: agendamentos.valor,
        tipo: agendamentos.tipo,
        barbeiroId: agendamentos.barbeiroId,
        barbeiroNome: barbeiros.nome,
        barbeiroFoto: barbeiros.fotoUrl,
      })
      .from(agendamentos)
      .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
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
  const serv = new Map<string, number>(dias.map((d) => [d, 0]));
  const prod = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) serv.set(spYmd(r.dataHora), (serv.get(spYmd(r.dataHora)) ?? 0) + Number(r.valor));
  for (const v of vendas) prod.set(spYmd(v.dataHora), (prod.get(spYmd(v.dataHora)) ?? 0) + Number(v.total));
  const serie = dias.map((dia) => ({ dia, valor: (serv.get(dia) ?? 0) + (prod.get(dia) ?? 0) }));

  const porBarbeiro = new Map<string, { nome: string; foto: string | null; fat: number }>();
  for (const r of finalizados) {
    const b = porBarbeiro.get(r.barbeiroId) ?? { nome: r.barbeiroNome, foto: r.barbeiroFoto, fat: 0 };
    b.fat += Number(r.valor);
    porBarbeiro.set(r.barbeiroId, b);
  }
  const barbeirosRank = [...porBarbeiro.values()].sort((a, b) => b.fat - a.fat);
  const maxBarbeiro = Math.max(1, ...barbeirosRank.map((v) => v.fat));

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

      <div className="grid gap-6 lg:grid-cols-2">
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
        </Secao>

        <Secao titulo="Faturamento por profissional">
          <Ranking
            vazio="Nenhum atendimento no período."
            itens={barbeirosRank.map((b) => ({
              nome: b.nome,
              avatarUrl: b.foto,
              destaque: formatBRL(b.fat),
              proporcao: (b.fat / maxBarbeiro) * 100,
            }))}
          />
        </Secao>
      </div>

      <Secao titulo="Faturamento por dia (detalhado)">
        <Tabela
          cabecalho={["Data", "Serviços", "Produtos", "Total"]}
          linhas={dias
            .filter((dia) => (serv.get(dia) ?? 0) + (prod.get(dia) ?? 0) > 0)
            .map((dia) => [
              diaCurto(dia),
              formatBRL(serv.get(dia) ?? 0),
              formatBRL(prod.get(dia) ?? 0),
              formatBRL((serv.get(dia) ?? 0) + (prod.get(dia) ?? 0)),
            ])}
          vazio="Sem faturamento no período."
        />
      </Secao>
    </div>
  );
}
