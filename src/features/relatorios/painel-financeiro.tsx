import { and, eq, gte, lt } from "drizzle-orm";
import { DollarSign, Receipt, Repeat, Scissors, ShoppingBag, Undo2 } from "lucide-react";
import { db } from "@/db";
import { agendamentos, assinaturas, barbeiros, planos, produtos, servicos, vendasProdutos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { METODOS_PAGAMENTO, rotuloMetodo } from "@/lib/metodo-pagamento";
import { diaCurto, gerarDias, spYmd } from "./datas";
import { RankingExpansivel } from "./ranking-expansivel";
import { GraficoBarras, KpiGrid, Ranking, Secao, Tabela } from "./ui";

export async function PainelFinanceiro({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const [finalizados, vendas, ativas, estornadosRows] = await Promise.all([
    db
      .select({
        dataHora: agendamentos.dataHora,
        valor: agendamentos.valor,
        tipo: agendamentos.tipo,
        formaPagamento: agendamentos.formaPagamento,
        metodoPagamento: agendamentos.metodoPagamento,
        barbeiroId: agendamentos.barbeiroId,
        barbeiroNome: barbeiros.nome,
        barbeiroFoto: barbeiros.fotoUrl,
        servicoNome: servicos.nome,
      })
      .from(agendamentos)
      .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
      .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .where(
        and(
          eq(agendamentos.status, "finalizado"),
          gte(agendamentos.dataHora, inicio),
          lt(agendamentos.dataHora, fimExclusivo),
        ),
      ),
    db
      .select({
        dataHora: vendasProdutos.dataHora,
        total: vendasProdutos.total,
        metodoPagamento: vendasProdutos.metodoPagamento,
      })
      .from(vendasProdutos)
      .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo))),
    db
      .select({
        valor: planos.valor,
        metodo: assinaturas.metodo,
        gratuito: assinaturas.gratuito,
      })
      .from(assinaturas)
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(eq(assinaturas.status, "ativo")),
    db
      .select({ valor: agendamentos.valor, formaPagamento: agendamentos.formaPagamento })
      .from(agendamentos)
      .where(
        and(
          eq(agendamentos.status, "estornado"),
          gte(agendamentos.dataHora, inicio),
          lt(agendamentos.dataHora, fimExclusivo),
        ),
      ),
  ]);

  const fatServicos = finalizados.reduce((s, r) => s + Number(r.valor), 0);
  const fatProdutos = vendas.reduce((s, r) => s + Number(r.total), 0);
  const fatTotal = fatServicos + fatProdutos;
  const recorrente = ativas.reduce((s, a) => s + Number(a.valor), 0);
  const pagantes = finalizados.filter((r) => r.tipo !== "plano").length;
  const ticket = pagantes > 0 ? fatServicos / pagantes : 0;

  // Recebimento por forma e reembolsos.
  const servMP = finalizados
    .filter((r) => r.formaPagamento === "online")
    .reduce((s, r) => s + Number(r.valor), 0);
  const servPresencial = finalizados
    .filter((r) => r.formaPagamento !== "online")
    .reduce((s, r) => s + Number(r.valor), 0);
  const planoMP = ativas
    .filter((a) => a.metodo === "cartao" && !a.gratuito)
    .reduce((s, a) => s + Number(a.valor), 0);
  const planoCortesia = ativas.filter((a) => a.gratuito).length;
  const reembolsos = estornadosRows.reduce((s, r) => s + Number(r.valor), 0);
  const reembolsosMP = estornadosRows
    .filter((r) => r.formaPagamento === "online")
    .reduce((s, r) => s + Number(r.valor), 0);

  // Recebimentos por método (balcão): serviços presenciais finalizados + produtos vendidos.
  const recebPorMetodo = new Map<string, number>();
  for (const r of finalizados) {
    if (r.formaPagamento === "online" || Number(r.valor) <= 0) continue;
    const k = r.metodoPagamento ?? "nao_informado";
    recebPorMetodo.set(k, (recebPorMetodo.get(k) ?? 0) + Number(r.valor));
  }
  for (const v of vendas) {
    const k = v.metodoPagamento ?? "nao_informado";
    recebPorMetodo.set(k, (recebPorMetodo.get(k) ?? 0) + Number(v.total));
  }
  const metodoItens = [...METODOS_PAGAMENTO, "nao_informado"]
    .filter((k) => (recebPorMetodo.get(k) ?? 0) > 0)
    .map((k) => ({ chave: k, total: recebPorMetodo.get(k) ?? 0 }));
  const maxMetodo = Math.max(1, ...metodoItens.map((m) => m.total));

  const dias = gerarDias(inicio, fimExclusivo);
  const serv = new Map<string, number>(dias.map((d) => [d, 0]));
  const prod = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) serv.set(spYmd(r.dataHora), (serv.get(spYmd(r.dataHora)) ?? 0) + Number(r.valor));
  for (const v of vendas) prod.set(spYmd(v.dataHora), (prod.get(spYmd(v.dataHora)) ?? 0) + Number(v.total));
  const serie = dias.map((dia) => ({ dia, valor: (serv.get(dia) ?? 0) + (prod.get(dia) ?? 0) }));

  const porBarbeiro = new Map<
    string,
    { id: string; nome: string; foto: string | null; fat: number; servicos: Map<string, { qtd: number; valor: number }> }
  >();
  for (const r of finalizados) {
    const b =
      porBarbeiro.get(r.barbeiroId) ??
      { id: r.barbeiroId, nome: r.barbeiroNome, foto: r.barbeiroFoto, fat: 0, servicos: new Map() };
    b.fat += Number(r.valor);
    const sv = b.servicos.get(r.servicoNome) ?? { qtd: 0, valor: 0 };
    sv.qtd += 1;
    sv.valor += Number(r.valor);
    b.servicos.set(r.servicoNome, sv);
    porBarbeiro.set(r.barbeiroId, b);
  }
  const maxBarbeiro = Math.max(1, ...[...porBarbeiro.values()].map((v) => v.fat));
  const barbeirosItens = [...porBarbeiro.values()]
    .sort((a, b) => b.fat - a.fat)
    .map((b) => ({
      id: b.id,
      nome: b.nome,
      foto: b.foto,
      destaque: formatBRL(b.fat),
      proporcao: (b.fat / maxBarbeiro) * 100,
      colValor: "Valor",
      linhas: [...b.servicos.entries()]
        .sort((a, c) => c[1].valor - a[1].valor)
        .map(([nome, v]) => ({ nome, qtd: v.qtd, valor: formatBRL(v.valor) })),
      totalValor: formatBRL(b.fat),
    }));

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
          { label: "Reembolsos", valor: formatBRL(reembolsos), icon: Undo2 },
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
          <RankingExpansivel itens={barbeirosItens} vazio="Nenhum atendimento no período." />
        </Secao>
      </div>

      <Secao titulo="Formas de recebimento">
        <Tabela
          cabecalho={["Forma", "Serviços", "Planos", "Total"]}
          linhas={[
            ["Mercado Pago", formatBRL(servMP), formatBRL(planoMP), formatBRL(servMP + planoMP)],
            ["Presencial (balcão)", formatBRL(servPresencial), "—", formatBRL(servPresencial)],
            ...(planoCortesia > 0
              ? [["Cortesia (manual)", "—", `${planoCortesia} plano(s)`, "—"]]
              : []),
            ...(reembolsos > 0
              ? [
                  [
                    "Reembolsos",
                    `-${formatBRL(reembolsos)}`,
                    "",
                    `Mercado Pago -${formatBRL(reembolsosMP)}`,
                  ],
                ]
              : []),
          ]}
          vazio="Sem recebimentos no período."
        />
      </Secao>

      <Secao titulo="Recebimentos por método (balcão)">
        <Ranking
          vazio="Nenhum recebimento presencial no período."
          itens={metodoItens.map((m) => ({
            nome: rotuloMetodo(m.chave === "nao_informado" ? null : m.chave),
            destaque: formatBRL(m.total),
            proporcao: (m.total / maxMetodo) * 100,
          }))}
        />
      </Secao>

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
