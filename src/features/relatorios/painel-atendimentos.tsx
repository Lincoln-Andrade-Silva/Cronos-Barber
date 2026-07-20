import { and, eq, gte, lt } from "drizzle-orm";
import { Ban, CalendarCheck, CheckCircle2, Clock, Users } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, servicos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { gerarDias, spYmd } from "./datas";
import { GraficoBarras, KpiGrid, Ranking, Secao } from "./ui";

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
      barbeiroId: agendamentos.barbeiroId,
      barbeiroNome: barbeiros.nome,
      servicoNome: servicos.nome,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .where(and(gte(agendamentos.dataHora, inicio), lt(agendamentos.dataHora, fimExclusivo)));

  const finalizados = rows.filter((r) => r.status === "finalizado");
  const cancelados = rows.filter((r) => r.status === "cancelado").length;
  const pendentes = rows.filter((r) => r.status === "agendado").length;
  const taxaCancelamento = rows.length > 0 ? (cancelados / rows.length) * 100 : 0;
  const clientesUnicos = new Set(finalizados.map((r) => r.clienteId)).size;
  const fatServicos = finalizados.reduce((s, r) => s + Number(r.valor), 0);
  const pagantes = finalizados.filter((r) => r.tipo !== "plano").length;
  const ticket = pagantes > 0 ? fatServicos / pagantes : 0;

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

  const porBarbeiro = new Map<string, number>();
  for (const r of finalizados) porBarbeiro.set(r.barbeiroNome, (porBarbeiro.get(r.barbeiroNome) ?? 0) + 1);
  const barbeirosRank = [...porBarbeiro.entries()].sort((a, b) => b[1] - a[1]);
  const maxBarbeiro = Math.max(1, ...barbeirosRank.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Finalizados", valor: String(finalizados.length), icon: CheckCircle2 },
          { label: "Pendentes", valor: String(pendentes), icon: Clock },
          { label: "Cancelados", valor: `${cancelados} (${taxaCancelamento.toFixed(0)}%)`, icon: Ban },
          { label: "Clientes atendidos", valor: String(clientesUnicos), icon: Users },
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
          <Ranking
            vazio="Nenhum atendimento no período."
            itens={barbeirosRank.map(([nome, qtd]) => ({
              nome,
              destaque: `${qtd}x`,
              proporcao: (qtd / maxBarbeiro) * 100,
            }))}
          />
        </Secao>
      </div>
    </div>
  );
}
