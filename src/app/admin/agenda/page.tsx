import { and, asc, eq, gte, lt } from "drizzle-orm";
import { Ban, CalendarCheck, CheckCircle2, DollarSign, Receipt } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, profiles, servicos } from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";
import { instanteSlot } from "@/lib/disponibilidade";
import { formatBRL } from "@/lib/format";
import { DayNav } from "@/features/agenda/day-nav";
import { AgendaLista, type AgendaItem, type BarbeiroOpcao } from "@/features/agenda/agenda-lista";

export const dynamic = "force-dynamic";

function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { data?: string };
}) {
  const data = searchParams.data ?? hojeSP();
  const inicioTs = instanteSlot(data, "00:00");
  const fimTs = new Date(inicioTs.getTime() + 24 * 60 * 60 * 1000);

  const [rows, listaBarbeiros] = await Promise.all([
    db
      .select({
        id: agendamentos.id,
        dataHora: agendamentos.dataHora,
        status: agendamentos.status,
        valor: agendamentos.valor,
        clienteNome: profiles.nome,
        barbeiroId: agendamentos.barbeiroId,
        servicoNome: servicos.nome,
      })
      .from(agendamentos)
      .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .innerJoin(profiles, eq(agendamentos.clienteId, profiles.id))
      .where(and(gte(agendamentos.dataHora, inicioTs), lt(agendamentos.dataHora, fimTs)))
      .orderBy(asc(agendamentos.dataHora)),
    db
      .select({ id: barbeiros.id, nome: barbeiros.nome, fotoUrl: barbeiros.fotoUrl })
      .from(barbeiros)
      .where(eq(barbeiros.ativo, true))
      .orderBy(asc(barbeiros.nome)),
  ]);

  const validos = rows.filter((r) => r.status !== "cancelado");
  const finalizados = rows.filter((r) => r.status === "finalizado");
  const cancelados = rows.filter((r) => r.status === "cancelado");
  const total = validos.reduce((soma, r) => soma + Number(r.valor), 0);
  const ticket = validos.length > 0 ? total / validos.length : 0;
  const taxaCancelamento = rows.length > 0 ? (cancelados.length / rows.length) * 100 : 0;

  const cards = [
    { label: "Faturamento", valor: formatBRL(total), icon: DollarSign },
    { label: "Atendimentos", valor: String(validos.length), icon: CalendarCheck },
    { label: "Finalizados", valor: String(finalizados.length), icon: CheckCircle2 },
    { label: "Taxa de cancelamento", valor: `${taxaCancelamento.toFixed(0)}%`, icon: Ban },
    { label: "Ticket médio", valor: formatBRL(ticket), icon: Receipt },
  ];

  const items: AgendaItem[] = rows.map((r) => ({
    id: r.id,
    dataHoraISO: r.dataHora.toISOString(),
    status: r.status,
    valor: r.valor,
    clienteNome: r.clienteNome,
    barbeiroId: r.barbeiroId,
    servicoNome: r.servicoNome,
  }));

  const opcoesBarbeiros: BarbeiroOpcao[] = listaBarbeiros;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Agendamentos do dia por profissional."
        action={<DayNav data={data} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ label, valor, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">{label}</span>
              <Icon className="h-4 w-4 shrink-0 text-brand-light" />
            </div>
            <p className="mt-3 text-2xl font-bold">{valor}</p>
          </Card>
        ))}
      </div>

      <AgendaLista items={items} barbeiros={opcoesBarbeiros} />
    </div>
  );
}
