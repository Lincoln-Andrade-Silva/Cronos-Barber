import { and, desc, eq, gte, lt } from "drizzle-orm";
import { Ban, CalendarCheck, CheckCircle2, Clock, Repeat, Users } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, profiles, servicos, vendasProdutos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { formatFrequencia, frequenciaPorCliente, mediaFrequenciaGeral } from "@/lib/frequencia";
import { diaCurto, gerarDias, spYmd } from "./datas";
import { RankingExpansivel } from "./ranking-expansivel";
import { GraficoBarras, KpiGrid, Ranking, Secao, Tabela } from "./ui";

const LIMITE_DETALHE = 100;

export async function PainelAtendimentos({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const rows = await db
    .select({
      dataHora: agendamentos.dataHora,
      status: agendamentos.status,
      valor: agendamentos.valor,
      tipo: agendamentos.tipo,
      clienteId: agendamentos.clienteId,
      clienteNome: profiles.nome,
      clienteAvulso: agendamentos.clienteAvulso,
      barbeiroId: agendamentos.barbeiroId,
      barbeiroNome: barbeiros.nome,
      barbeiroFoto: barbeiros.fotoUrl,
      servicoNome: servicos.nome,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .leftJoin(profiles, eq(agendamentos.clienteId, profiles.id))
    .where(and(gte(agendamentos.dataHora, inicio), lt(agendamentos.dataHora, fimExclusivo)))
    .orderBy(desc(agendamentos.dataHora));

  const vendasRows = await db
    .select({ total: vendasProdutos.total, agendamentoId: vendasProdutos.agendamentoId })
    .from(vendasProdutos)
    .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo)));
  // Só produtos vendidos dentro de um atendimento entram no ticket (avulsa fica de fora).
  const fatProdutosAtendimento = vendasRows
    .filter((r) => r.agendamentoId)
    .reduce((s, r) => s + Number(r.total), 0);

  const finalizados = rows.filter((r) => r.status === "finalizado");
  const cancelados = rows.filter((r) => r.status === "cancelado").length;
  const pendentes = rows.filter((r) => r.status === "agendado").length;
  const taxaCancelamento = rows.length > 0 ? (cancelados / rows.length) * 100 : 0;
  const clientesUnicos = new Set(finalizados.map((r) => r.clienteId)).size;
  const frequenciaMedia = mediaFrequenciaGeral(
    frequenciaPorCliente(
      finalizados
        .filter((r) => r.clienteId)
        .map((r) => ({ clienteId: r.clienteId as string, dataHora: r.dataHora })),
    ),
  );
  const fatServicos = finalizados.reduce((s, r) => s + Number(r.valor), 0);
  const pagantes = finalizados.filter((r) => r.tipo !== "plano").length;
  const ticket = pagantes > 0 ? (fatServicos + fatProdutosAtendimento) / pagantes : 0;

  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) porDia.set(spYmd(r.dataHora), (porDia.get(spYmd(r.dataHora)) ?? 0) + 1);
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

  const porServico = new Map<string, { qtd: number; fat: number }>();
  for (const r of finalizados) {
    const a = porServico.get(r.servicoNome) ?? { qtd: 0, fat: 0 };
    a.qtd += 1;
    a.fat += Number(r.valor);
    porServico.set(r.servicoNome, a);
  }
  const servicosRank = [...porServico.entries()].sort((a, b) => b[1].qtd - a[1].qtd);
  const maxServico = Math.max(1, ...servicosRank.map(([, v]) => v.qtd));

  const porBarbeiro = new Map<
    string,
    { id: string; nome: string; foto: string | null; qtd: number; fat: number; servicos: Map<string, { qtd: number; valor: number }> }
  >();
  for (const r of finalizados) {
    const a =
      porBarbeiro.get(r.barbeiroId) ??
      { id: r.barbeiroId, nome: r.barbeiroNome, foto: r.barbeiroFoto, qtd: 0, fat: 0, servicos: new Map() };
    a.qtd += 1;
    a.fat += Number(r.valor);
    const sv = a.servicos.get(r.servicoNome) ?? { qtd: 0, valor: 0 };
    sv.qtd += 1;
    sv.valor += Number(r.valor);
    a.servicos.set(r.servicoNome, sv);
    porBarbeiro.set(r.barbeiroId, a);
  }
  const maxBarbeiro = Math.max(1, ...[...porBarbeiro.values()].map((v) => v.qtd));
  const barbeirosItens = [...porBarbeiro.values()]
    .sort((a, b) => b.qtd - a.qtd)
    .map((b) => ({
      id: b.id,
      nome: b.nome,
      foto: b.foto,
      destaque: `${b.qtd}x`,
      sub: formatBRL(b.fat),
      proporcao: (b.qtd / maxBarbeiro) * 100,
      colValor: "Valor",
      linhas: [...b.servicos.entries()]
        .sort((a, c) => c[1].qtd - a[1].qtd)
        .map(([nome, v]) => ({ nome, qtd: v.qtd, valor: formatBRL(v.valor) })),
      totalValor: formatBRL(b.fat),
    }));

  const detalhe = finalizados.slice(0, LIMITE_DETALHE);

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Finalizados", valor: String(finalizados.length), icon: CheckCircle2 },
          { label: "Pendentes", valor: String(pendentes), icon: Clock },
          { label: "Cancelados", valor: `${cancelados} (${taxaCancelamento.toFixed(0)}%)`, icon: Ban },
          { label: "Clientes atendidos", valor: String(clientesUnicos), icon: Users },
          { label: "Frequência de retorno", valor: formatFrequencia(frequenciaMedia), icon: Repeat },
          { label: "Ticket médio", valor: formatBRL(ticket), icon: CalendarCheck },
        ]}
      />

      <Secao titulo="Atendimentos por dia">
        <GraficoBarras dados={serie} formato="numero" />
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Secao titulo="Atendimentos por profissional">
          <RankingExpansivel itens={barbeirosItens} vazio="Nenhum atendimento no período." />
        </Secao>
      </div>

      <Secao titulo={`Atendimentos finalizados${finalizados.length > LIMITE_DETALHE ? ` (${LIMITE_DETALHE} mais recentes)` : ""}`}>
        <Tabela
          cabecalho={["Profissional", "Serviço", "Cliente", "Data", "Valor"]}
          avatars={detalhe.map((r) => r.barbeiroFoto)}
          linhas={detalhe.map((r) => [
            r.barbeiroNome,
            r.servicoNome,
            r.clienteNome ?? r.clienteAvulso ?? "Sem cadastro",
            diaCurto(spYmd(r.dataHora)),
            formatBRL(r.valor),
          ])}
          vazio="Nenhum atendimento finalizado no período."
        />
      </Secao>
    </div>
  );
}
