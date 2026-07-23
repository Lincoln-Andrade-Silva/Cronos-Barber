import { and, eq, gte, lt } from "drizzle-orm";
import {
  CalendarCheck,
  CreditCard,
  DollarSign,
  Percent,
  Receipt,
  UserPlus,
  Users,
} from "lucide-react";
import { db } from "@/db";
import {
  agendamentos,
  assinaturas,
  barbeiros,
  planos,
  produtos,
  profiles,
  servicos,
  vendasProdutos,
} from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";
import { instanteSlot } from "@/lib/disponibilidade";
import { formatBRL } from "@/lib/format";
import { formatFrequencia, frequenciaPorCliente, mediaFrequenciaGeral } from "@/lib/frequencia";
import { METODOS_PAGAMENTO, rotuloMetodo } from "@/lib/metodo-pagamento";
import { diasAtras, gerarDias, hojeSP, spYmd } from "@/features/relatorios/datas";
import { PeriodoNav } from "@/features/relatorios/periodo-nav";
import { GraficoBarras, KpiGrid, Ranking, Secao, Tabela } from "@/features/relatorios/ui";
import { RankingExpansivel } from "@/features/relatorios/ranking-expansivel";

export const dynamic = "force-dynamic";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string };
}) {
  const hoje = hojeSP();
  const ate = searchParams.ate ?? hoje;
  const de = searchParams.de ?? diasAtras(ate, 29);
  const inicio = instanteSlot(de, "00:00");
  const fimExclusivo = new Date(instanteSlot(ate, "00:00").getTime() + 24 * 60 * 60 * 1000);

  const [atendimentos, vendas, ativas, novas, novosClientes] = await Promise.all([
    db
      .select({
        dataHora: agendamentos.dataHora,
        status: agendamentos.status,
        valor: agendamentos.valor,
        tipo: agendamentos.tipo,
        formaPagamento: agendamentos.formaPagamento,
        pagamentoStatus: agendamentos.pagamentoStatus,
        metodoPagamento: agendamentos.metodoPagamento,
        clienteId: agendamentos.clienteId,
        barbeiroId: agendamentos.barbeiroId,
        barbeiroNome: barbeiros.nome,
        barbeiroFoto: barbeiros.fotoUrl,
        comissao: barbeiros.comissaoPercentual,
        servicoNome: servicos.nome,
      })
      .from(agendamentos)
      .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
      .where(and(gte(agendamentos.dataHora, inicio), lt(agendamentos.dataHora, fimExclusivo))),
    db
      .select({
        dataHora: vendasProdutos.dataHora,
        produtoNome: produtos.nome,
        quantidade: vendasProdutos.quantidade,
        total: vendasProdutos.total,
        metodoPagamento: vendasProdutos.metodoPagamento,
      })
      .from(vendasProdutos)
      .innerJoin(produtos, eq(vendasProdutos.produtoId, produtos.id))
      .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo))),
    db
      .select({
        valor: planos.valor,
        planoNome: planos.nome,
        metodo: assinaturas.metodo,
        gratuito: assinaturas.gratuito,
      })
      .from(assinaturas)
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(eq(assinaturas.status, "ativo")),
    db
      .select({ id: assinaturas.id })
      .from(assinaturas)
      .where(and(gte(assinaturas.dataInicio, inicio), lt(assinaturas.dataInicio, fimExclusivo))),
    db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.tipo, "cliente"),
          gte(profiles.criadoEm, inicio),
          lt(profiles.criadoEm, fimExclusivo),
        ),
      ),
  ]);

  const finalizados = atendimentos.filter((r) => r.status === "finalizado");
  const cancelados = atendimentos.filter((r) => r.status === "cancelado").length;
  const estornados = atendimentos.filter((r) => r.status === "estornado").length;
  const pendentes = atendimentos.filter((r) => r.status === "agendado").length;
  const taxaCancelamento =
    atendimentos.length > 0 ? ((cancelados + estornados) / atendimentos.length) * 100 : 0;
  const clientesUnicos = new Set(finalizados.map((r) => r.clienteId).filter(Boolean)).size;

  // Frequência de retorno: intervalo médio entre visitas dos clientes no período.
  const frequenciaMedia = mediaFrequenciaGeral(
    frequenciaPorCliente(
      finalizados
        .filter((r) => r.clienteId)
        .map((r) => ({ clienteId: r.clienteId as string, dataHora: r.dataHora })),
    ),
  );

  // Recebido antecipado (cartão via MP) x ainda a receber no balcão, no período.
  const recebidoOnline = atendimentos
    .filter(
      (r) =>
        r.formaPagamento === "online" &&
        r.pagamentoStatus === "pago" &&
        r.status !== "cancelado" &&
        r.status !== "estornado",
    )
    .reduce((s, r) => s + Number(r.valor), 0);
  const aReceber = atendimentos
    .filter(
      (r) => r.status === "agendado" && r.tipo !== "plano" && r.pagamentoStatus !== "pago",
    )
    .reduce((s, r) => s + Number(r.valor), 0);

  // Faturamento por forma de recebimento (serviços finalizados + planos ativos).
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
  const reembolsos = atendimentos
    .filter((r) => r.status === "estornado")
    .reduce((s, r) => s + Number(r.valor), 0);

  const fatServicos = finalizados.reduce((s, r) => s + Number(r.valor), 0);
  const fatProdutos = vendas.reduce((s, r) => s + Number(r.total), 0);
  const fatTotal = fatServicos + fatProdutos;
  const pagantes = finalizados.filter((r) => r.tipo !== "plano").length;
  // Ticket médio = faturamento (serviços + produtos) por atendimento pagante; balão separa só serviços.
  const ticket = pagantes > 0 ? (fatServicos + fatProdutos) / pagantes : 0;
  const ticketServicos = pagantes > 0 ? fatServicos / pagantes : 0;
  // Cortesia (gratuito) não fatura: fora da receita recorrente.
  const recorrente = ativas.filter((a) => !a.gratuito).reduce((s, a) => s + Number(a.valor), 0);

  // Série diária (serviços + produtos)
  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) porDia.set(spYmd(r.dataHora), (porDia.get(spYmd(r.dataHora)) ?? 0) + Number(r.valor));
  for (const v of vendas) porDia.set(spYmd(v.dataHora), (porDia.get(spYmd(v.dataHora)) ?? 0) + Number(v.total));
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

  // Atendimentos finalizados por dia
  const porDiaAtend = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) porDiaAtend.set(spYmd(r.dataHora), (porDiaAtend.get(spYmd(r.dataHora)) ?? 0) + 1);
  const serieAtend = dias.map((dia) => ({ dia, valor: porDiaAtend.get(dia) ?? 0 }));

  // Planos assinados (ativos)
  const porPlano = new Map<string, { qtd: number; receita: number }>();
  for (const a of ativas) {
    const p = porPlano.get(a.planoNome) ?? { qtd: 0, receita: 0 };
    p.qtd += 1;
    p.receita += a.gratuito ? 0 : Number(a.valor);
    porPlano.set(a.planoNome, p);
  }
  const planosRank = [...porPlano.entries()].sort((a, b) => b[1].qtd - a[1].qtd);
  const maxPlano = Math.max(1, ...planosRank.map(([, v]) => v.qtd));

  // Status dos atendimentos
  const maxStatus = Math.max(1, finalizados.length, pendentes, cancelados, estornados);

  // Por profissional
  // Detalhe por profissional (serviços, faturamento e comissão) para os painéis expansíveis
  const detalheBarbeiro = new Map<
    string,
    {
      id: string;
      nome: string;
      foto: string | null;
      pct: number;
      faturamento: number;
      comissao: number;
      servicos: Map<string, { qtd: number; valor: number; comissao: number }>;
    }
  >();
  for (const r of finalizados) {
    const d =
      detalheBarbeiro.get(r.barbeiroId) ??
      {
        id: r.barbeiroId,
        nome: r.barbeiroNome,
        foto: r.barbeiroFoto,
        pct: Number(r.comissao),
        faturamento: 0,
        comissao: 0,
        servicos: new Map<string, { qtd: number; valor: number; comissao: number }>(),
      };
    const c = (Number(r.valor) * Number(r.comissao)) / 100;
    d.faturamento += Number(r.valor);
    d.comissao += c;
    const sv = d.servicos.get(r.servicoNome) ?? { qtd: 0, valor: 0, comissao: 0 };
    sv.qtd += 1;
    sv.valor += Number(r.valor);
    sv.comissao += c;
    d.servicos.set(r.servicoNome, sv);
    detalheBarbeiro.set(r.barbeiroId, d);
  }
  const profissionaisDetalhe = [...detalheBarbeiro.values()].map((d) => ({
    id: d.id,
    nome: d.nome,
    foto: d.foto,
    pct: d.pct,
    faturamento: d.faturamento,
    comissao: d.comissao,
    servicos: [...d.servicos.entries()]
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.valor - a.valor),
  }));
  const comissoes = profissionaisDetalhe.reduce((s, b) => s + b.comissao, 0);
  const maxFatProf = Math.max(1, ...profissionaisDetalhe.map((p) => p.faturamento));
  const maxComProf = Math.max(1, ...profissionaisDetalhe.map((p) => p.comissao));

  const faturamentoProfItens = [...profissionaisDetalhe]
    .sort((a, b) => b.faturamento - a.faturamento)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      foto: p.foto,
      destaque: formatBRL(p.faturamento),
      proporcao: (p.faturamento / maxFatProf) * 100,
      colValor: "Valor",
      linhas: p.servicos.map((s) => ({ nome: s.nome, qtd: s.qtd, valor: formatBRL(s.valor) })),
      totalValor: formatBRL(p.faturamento),
    }));

  const comissaoProfItens = [...profissionaisDetalhe]
    .sort((a, b) => b.comissao - a.comissao)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      foto: p.foto,
      destaque: formatBRL(p.comissao),
      sub: `${p.pct.toFixed(0)}% de comissão`,
      proporcao: (p.comissao / maxComProf) * 100,
      colValor: "Valor",
      colExtra: "Comissão",
      linhas: p.servicos.map((s) => ({
        nome: s.nome,
        qtd: s.qtd,
        valor: formatBRL(s.valor),
        extra: formatBRL(s.comissao),
      })),
      totalValor: formatBRL(p.faturamento),
      totalExtra: formatBRL(p.comissao),
      totalRotulo: `Total (${p.pct.toFixed(0)}%)`,
    }));

  // Top serviços
  const porServico = new Map<string, { qtd: number; fat: number }>();
  for (const r of finalizados) {
    const a = porServico.get(r.servicoNome) ?? { qtd: 0, fat: 0 };
    a.qtd += 1;
    a.fat += Number(r.valor);
    porServico.set(r.servicoNome, a);
  }
  const servicosRank = [...porServico.entries()].sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 6);
  const maxServico = Math.max(1, ...servicosRank.map(([, v]) => v.qtd));

  // Top produtos
  const porProduto = new Map<string, { qtd: number; total: number }>();
  for (const v of vendas) {
    const a = porProduto.get(v.produtoNome) ?? { qtd: 0, total: 0 };
    a.qtd += v.quantidade;
    a.total += Number(v.total);
    porProduto.set(v.produtoNome, a);
  }
  const produtosRank = [...porProduto.entries()].sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 6);
  const maxProduto = Math.max(1, ...produtosRank.map(([, v]) => v.qtd));

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

  const maxComposicao = Math.max(1, fatServicos, fatProdutos, recorrente);

  const indicadores = [
    { label: "Recebido online", valor: formatBRL(recebidoOnline) },
    { label: "A receber (balcão)", valor: formatBRL(aReceber) },
    { label: "Reembolsos", valor: formatBRL(reembolsos) },
    { label: "Cancel./estorno", valor: `${taxaCancelamento.toFixed(0)}%` },
    { label: "Pendentes no período", valor: String(pendentes) },
    { label: "Frequência de retorno", valor: formatFrequencia(frequenciaMedia) },
    { label: "Novas assinaturas", valor: String(novas.length) },
    { label: "Receita recorrente", valor: formatBRL(recorrente) },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do negócio no período." />

      <div className="mb-6">
        <PeriodoNav de={de} ate={ate} />
      </div>

      <div className="mb-6">
        <KpiGrid
          cards={[
            { label: "Faturamento total", valor: formatBRL(fatTotal), icon: DollarSign },
            { label: "Atendimentos", valor: String(finalizados.length), icon: CalendarCheck },
            {
              label: "Ticket médio",
              valor: formatBRL(ticket),
              icon: Receipt,
              sub: `só serviços: ${formatBRL(ticketServicos)}`,
            },
            { label: "Comissões", valor: formatBRL(comissoes), icon: Percent },
            { label: "Clientes atendidos", valor: String(clientesUnicos), icon: Users },
            { label: "Novos clientes", valor: String(novosClientes.length), icon: UserPlus },
            { label: "Assinaturas ativas", valor: String(ativas.length), icon: CreditCard },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted2">
            Faturamento por dia
          </h3>
          <GraficoBarras dados={serie} formato="moeda" />
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted2">
            Atendimentos por dia
          </h3>
          <GraficoBarras dados={serieAtend} formato="numero" />
        </Card>
      </div>

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

        <Secao titulo="Formas de recebimento">
          <Tabela
            cabecalho={["Forma", "Serviços", "Planos", "Total"]}
            linhas={[
              ["Mercado Pago", formatBRL(servMP), formatBRL(planoMP), formatBRL(servMP + planoMP)],
              ["Presencial (balcão)", formatBRL(servPresencial), "—", formatBRL(servPresencial)],
              ...(planoCortesia > 0
                ? [["Cortesia (manual)", "—", `${planoCortesia} plano(s)`, "—"]]
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

        <Secao titulo="Indicadores">
          <div className="space-y-2.5">
            {indicadores.map((i) => (
              <div
                key={i.label}
                className="flex items-center justify-between rounded-lg border border-line bg-surface/30 px-4 py-2.5"
              >
                <span className="text-sm text-muted">{i.label}</span>
                <span className="font-bold">{i.valor}</span>
              </div>
            ))}
          </div>
        </Secao>

        <Secao titulo="Planos assinados">
          <Ranking
            vazio="Nenhuma assinatura ativa."
            itens={planosRank.map(([nome, v]) => ({
              nome,
              destaque: String(v.qtd),
              sub: `${formatBRL(v.receita)}/mês`,
              proporcao: (v.qtd / maxPlano) * 100,
            }))}
          />
        </Secao>

        <Secao titulo="Status dos atendimentos">
          <Ranking
            vazio="Nenhum atendimento no período."
            itens={[
              { nome: "Finalizados", destaque: String(finalizados.length), proporcao: (finalizados.length / maxStatus) * 100 },
              { nome: "Pendentes", destaque: String(pendentes), proporcao: (pendentes / maxStatus) * 100 },
              { nome: "Cancelados", destaque: String(cancelados), proporcao: (cancelados / maxStatus) * 100 },
              { nome: "Estornados", destaque: String(estornados), proporcao: (estornados / maxStatus) * 100 },
            ]}
          />
        </Secao>

        <Secao titulo="Serviços mais realizados">
          <Ranking
            vazio="Nenhum serviço no período."
            itens={servicosRank.map(([nome, v]) => ({
              nome,
              destaque: `${v.qtd}x`,
              sub: formatBRL(v.fat),
              proporcao: (v.qtd / maxServico) * 100,
            }))}
          />
        </Secao>

        <Secao titulo="Produtos mais vendidos">
          <Ranking
            vazio="Nenhuma venda no período."
            itens={produtosRank.map(([nome, v]) => ({
              nome,
              destaque: `${v.qtd}x`,
              sub: formatBRL(v.total),
              proporcao: (v.qtd / maxProduto) * 100,
            }))}
          />
        </Secao>

        <Secao titulo="Faturamento por profissional">
          <RankingExpansivel itens={faturamentoProfItens} vazio="Nenhum atendimento no período." />
        </Secao>

        <Secao titulo="Comissões por profissional">
          <RankingExpansivel itens={comissaoProfItens} vazio="Nenhum atendimento no período." />
        </Secao>
      </div>
    </div>
  );
}
