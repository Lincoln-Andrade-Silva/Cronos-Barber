import { and, desc, eq, gte, lt } from "drizzle-orm";
import { Ban, CalendarCheck, CheckCircle2, Clock, Users } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, profiles, servicos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { diaCurto, gerarDias, spYmd } from "./datas";
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
      barbeiroId: agendamentos.barbeiroId,
      barbeiroNome: barbeiros.nome,
      barbeiroFoto: barbeiros.fotoUrl,
      servicoNome: servicos.nome,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .innerJoin(profiles, eq(agendamentos.clienteId, profiles.id))
    .where(and(gte(agendamentos.dataHora, inicio), lt(agendamentos.dataHora, fimExclusivo)))
    .orderBy(desc(agendamentos.dataHora));

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

  const porBarbeiro = new Map<string, { nome: string; foto: string | null; qtd: number }>();
  for (const r of finalizados) {
    const a = porBarbeiro.get(r.barbeiroId) ?? { nome: r.barbeiroNome, foto: r.barbeiroFoto, qtd: 0 };
    a.qtd += 1;
    porBarbeiro.set(r.barbeiroId, a);
  }
  const barbeirosRank = [...porBarbeiro.values()].sort((a, b) => b.qtd - a.qtd);
  const maxBarbeiro = Math.max(1, ...barbeirosRank.map((v) => v.qtd));

  const detalhe = finalizados.slice(0, LIMITE_DETALHE);

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
            itens={barbeirosRank.map((b) => ({
              nome: b.nome,
              avatarUrl: b.foto,
              destaque: `${b.qtd}x`,
              proporcao: (b.qtd / maxBarbeiro) * 100,
            }))}
          />
        </Secao>
      </div>

      <Secao titulo={`Atendimentos finalizados${finalizados.length > LIMITE_DETALHE ? ` (${LIMITE_DETALHE} mais recentes)` : ""}`}>
        <Tabela
          cabecalho={["Profissional", "Serviço", "Cliente", "Data", "Valor"]}
          avatars={detalhe.map((r) => r.barbeiroFoto)}
          linhas={detalhe.map((r) => [
            r.barbeiroNome,
            r.servicoNome,
            r.clienteNome,
            diaCurto(spYmd(r.dataHora)),
            formatBRL(r.valor),
          ])}
          vazio="Nenhum atendimento finalizado no período."
        />
      </Secao>
    </div>
  );
}
