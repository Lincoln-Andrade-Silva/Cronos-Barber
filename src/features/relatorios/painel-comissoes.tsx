import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { Percent, Scissors, Users } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, profiles, servicos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { gerarDias, spYmd } from "./datas";
import { GraficoBarras, KpiGrid, Secao, Tabela } from "./ui";

export async function PainelComissoes({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const finalizados = await db
    .select({
      dataHora: agendamentos.dataHora,
      valor: agendamentos.valor,
      barbeiroId: agendamentos.barbeiroId,
      barbeiroNome: barbeiros.nome,
      barbeiroFoto: barbeiros.fotoUrl,
      comissao: barbeiros.comissaoPercentual,
      servicoNome: servicos.nome,
      clienteNome: profiles.nome,
    })
    .from(agendamentos)
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(profiles, eq(agendamentos.clienteId, profiles.id))
    .where(
      and(
        eq(agendamentos.status, "finalizado"),
        gte(agendamentos.dataHora, inicio),
        lt(agendamentos.dataHora, fimExclusivo),
      ),
    )
    .orderBy(asc(barbeiros.nome), desc(agendamentos.dataHora));

  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) {
    const c = (Number(r.valor) * Number(r.comissao)) / 100;
    porDia.set(spYmd(r.dataHora), (porDia.get(spYmd(r.dataHora)) ?? 0) + c);
  }
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

  const porBarbeiro = new Map<
    string,
    { nome: string; foto: string | null; pct: number; atendimentos: number; faturamento: number }
  >();
  for (const r of finalizados) {
    const a =
      porBarbeiro.get(r.barbeiroId) ??
      {
        nome: r.barbeiroNome,
        foto: r.barbeiroFoto,
        pct: Number(r.comissao),
        atendimentos: 0,
        faturamento: 0,
      };
    a.atendimentos += 1;
    a.faturamento += Number(r.valor);
    porBarbeiro.set(r.barbeiroId, a);
  }
  const resumo = [...porBarbeiro.values()]
    .map((b) => ({ ...b, comissaoValor: (b.faturamento * b.pct) / 100 }))
    .sort((a, b) => b.comissaoValor - a.comissaoValor);

  const comissoesTotais = resumo.reduce((s, b) => s + b.comissaoValor, 0);
  const faturamentoTotal = resumo.reduce((s, b) => s + b.faturamento, 0);

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Comissões a pagar", valor: formatBRL(comissoesTotais), icon: Percent },
          { label: "Faturamento em serviços", valor: formatBRL(faturamentoTotal), icon: Scissors },
          { label: "Profissionais", valor: String(resumo.length), icon: Users },
        ]}
      />

      <Secao titulo="Comissões por dia">
        <GraficoBarras dados={serie} formato="moeda" />
      </Secao>

      <Secao titulo="Resumo por profissional">
        <Tabela
          cabecalho={["Profissional", "%", "Atend.", "Faturamento", "Comissão"]}
          avatars={resumo.map((b) => b.foto)}
          linhas={resumo.map((b) => [
            b.nome,
            `${b.pct.toFixed(0)}%`,
            String(b.atendimentos),
            formatBRL(b.faturamento),
            formatBRL(b.comissaoValor),
          ])}
          vazio="Nenhum atendimento finalizado no período."
        />
      </Secao>

      <Secao titulo="Detalhamento das comissões">
        <Tabela
          cabecalho={["Profissional", "Serviço", "Cliente", "Valor", "%", "Comissão"]}
          avatars={finalizados.map((r) => r.barbeiroFoto)}
          linhas={finalizados.map((r) => [
            r.barbeiroNome,
            r.servicoNome,
            r.clienteNome,
            formatBRL(r.valor),
            `${Number(r.comissao).toFixed(0)}%`,
            formatBRL((Number(r.valor) * Number(r.comissao)) / 100),
          ])}
          vazio="Nenhum atendimento finalizado no período."
        />
      </Secao>
    </div>
  );
}
