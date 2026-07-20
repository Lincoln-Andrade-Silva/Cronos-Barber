import { and, eq, gte, lt } from "drizzle-orm";
import { Percent, Scissors, Users } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros } from "@/db/schema";
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
      comissao: barbeiros.comissaoPercentual,
    })
    .from(agendamentos)
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .where(
      and(
        eq(agendamentos.status, "finalizado"),
        gte(agendamentos.dataHora, inicio),
        lt(agendamentos.dataHora, fimExclusivo),
      ),
    );

  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const r of finalizados) {
    const c = (Number(r.valor) * Number(r.comissao)) / 100;
    porDia.set(spYmd(r.dataHora), (porDia.get(spYmd(r.dataHora)) ?? 0) + c);
  }
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

  const porBarbeiro = new Map<
    string,
    { nome: string; pct: number; atendimentos: number; faturamento: number }
  >();
  for (const r of finalizados) {
    const a =
      porBarbeiro.get(r.barbeiroId) ??
      { nome: r.barbeiroNome, pct: Number(r.comissao), atendimentos: 0, faturamento: 0 };
    a.atendimentos += 1;
    a.faturamento += Number(r.valor);
    porBarbeiro.set(r.barbeiroId, a);
  }
  const linhas = [...porBarbeiro.values()]
    .map((b) => ({ ...b, comissaoValor: (b.faturamento * b.pct) / 100 }))
    .sort((a, b) => b.comissaoValor - a.comissaoValor);

  const comissoesTotais = linhas.reduce((s, b) => s + b.comissaoValor, 0);
  const faturamentoTotal = linhas.reduce((s, b) => s + b.faturamento, 0);

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Comissões a pagar", valor: formatBRL(comissoesTotais), icon: Percent },
          { label: "Faturamento em serviços", valor: formatBRL(faturamentoTotal), icon: Scissors },
          { label: "Profissionais", valor: String(linhas.length), icon: Users },
        ]}
      />

      <Secao titulo="Comissões por dia">
        <GraficoBarras dados={serie} formato="moeda" />
      </Secao>

      <Secao titulo="Comissão por profissional">
        <Tabela
          cabecalho={["Profissional", "%", "Atend.", "Faturamento", "Comissão"]}
          linhas={linhas.map((b) => [
            b.nome,
            `${b.pct.toFixed(0)}%`,
            String(b.atendimentos),
            formatBRL(b.faturamento),
            formatBRL(b.comissaoValor),
          ])}
          vazio="Nenhum atendimento finalizado no período."
        />
      </Secao>
    </div>
  );
}
