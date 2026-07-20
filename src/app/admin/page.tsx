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
import { diasAtras, gerarDias, hojeSP, spYmd } from "@/features/relatorios/datas";
import { PeriodoNav } from "@/features/relatorios/periodo-nav";
import { GraficoBarras, KpiGrid, Ranking, Secao } from "@/features/relatorios/ui";

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
      })
      .from(vendasProdutos)
      .innerJoin(produtos, eq(vendasProdutos.produtoId, produtos.id))
      .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo))),
    db
      .select({ valor: planos.valor, planoNome: planos.nome })
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
  const pendentes = atendimentos.filter((r) => r.status === "agendado").length;
  const taxaCancelamento = atendimentos.length > 0 ? (cancelados / atendimentos.length) * 100 : 0;
  const clientesUnicos = new Set(finalizados.map((r) => r.clienteId)).size;

  const fatServicos = finalizados.reduce((s, r) => s + Number(r.valor), 0);
  const fatProdutos = vendas.reduce((s, r) => s + Number(r.total), 0);
  const fatTotal = fatServicos + fatProdutos;
  const pagantes = finalizados.filter((r) => r.tipo !== "plano").length;
  const ticket = pagantes > 0 ? fatServicos / pagantes : 0;
  const recorrente = ativas.reduce((s, a) => s + Number(a.valor), 0);

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
    p.receita += Number(a.valor);
    porPlano.set(a.planoNome, p);
  }
  const planosRank = [...porPlano.entries()].sort((a, b) => b[1].qtd - a[1].qtd);
  const maxPlano = Math.max(1, ...planosRank.map(([, v]) => v.qtd));

  // Status dos atendimentos
  const maxStatus = Math.max(1, finalizados.length, pendentes, cancelados);

  // Por profissional
  const porBarbeiro = new Map<
    string,
    { nome: string; foto: string | null; atend: number; fat: number; pct: number }
  >();
  for (const r of finalizados) {
    const a =
      porBarbeiro.get(r.barbeiroId) ??
      { nome: r.barbeiroNome, foto: r.barbeiroFoto, atend: 0, fat: 0, pct: Number(r.comissao) };
    a.atend += 1;
    a.fat += Number(r.valor);
    porBarbeiro.set(r.barbeiroId, a);
  }
  const profissionais = [...porBarbeiro.values()].sort((a, b) => b.fat - a.fat);
  const comissoes = profissionais.reduce((s, b) => s + (b.fat * b.pct) / 100, 0);
  const maxFatBarbeiro = Math.max(1, ...profissionais.map((b) => b.fat));
  const comissoesRank = profissionais
    .map((b) => ({ nome: b.nome, foto: b.foto, pct: b.pct, valor: (b.fat * b.pct) / 100 }))
    .sort((a, b) => b.valor - a.valor);
  const maxComissao = Math.max(1, ...comissoesRank.map((c) => c.valor));

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

  const maxComposicao = Math.max(1, fatServicos, fatProdutos, recorrente);

  const indicadores = [
    { label: "Taxa de cancelamento", valor: `${taxaCancelamento.toFixed(0)}%` },
    { label: "Pendentes no período", valor: String(pendentes) },
    { label: "Novas assinaturas", valor: String(novas.length) },
    { label: "Receita recorrente", valor: formatBRL(recorrente) },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral da barbearia no período." />

      <div className="mb-6">
        <PeriodoNav de={de} ate={ate} />
      </div>

      <div className="mb-6">
        <KpiGrid
          cards={[
            { label: "Faturamento total", valor: formatBRL(fatTotal), icon: DollarSign },
            { label: "Atendimentos", valor: String(finalizados.length), icon: CalendarCheck },
            { label: "Ticket médio", valor: formatBRL(ticket), icon: Receipt },
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
          <Ranking
            vazio="Nenhum atendimento no período."
            itens={profissionais.map((b) => ({
              nome: b.nome,
              avatarUrl: b.foto,
              destaque: formatBRL(b.fat),
              sub: `${b.atend} atend.`,
              proporcao: (b.fat / maxFatBarbeiro) * 100,
            }))}
          />
        </Secao>

        <Secao titulo="Comissões por profissional">
          <Ranking
            vazio="Nenhum atendimento no período."
            itens={comissoesRank.map((c) => ({
              nome: c.nome,
              avatarUrl: c.foto,
              destaque: formatBRL(c.valor),
              sub: `${c.pct.toFixed(0)}%`,
              proporcao: (c.valor / maxComissao) * 100,
            }))}
          />
        </Secao>
      </div>
    </div>
  );
}
