import { and, asc, eq, gte, lt } from "drizzle-orm";
import { CalendarCheck, DollarSign, Receipt } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, profiles, servicos } from "@/db/schema";
import { Badge, Card, PageHeader } from "@/components/ui";
import { instanteSlot } from "@/lib/disponibilidade";
import { formatBRL } from "@/lib/format";
import { DateNav } from "@/features/agenda/date-nav";

export const dynamic = "force-dynamic";

function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function horaSP(dataHora: Date): string {
  return dataHora.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LinhaAgenda {
  id: string;
  dataHora: Date;
  status: "agendado" | "finalizado" | "cancelado";
  valor: string;
  clienteNome: string;
  barbeiroId: string;
  barbeiroNome: string;
  servicoNome: string;
}

function StatusBadge({ status }: { status: LinhaAgenda["status"] }) {
  if (status === "finalizado") return <Badge tone="success">Finalizado</Badge>;
  if (status === "cancelado") return <Badge tone="muted">Cancelado</Badge>;
  return <Badge tone="brand">Agendado</Badge>;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { data?: string };
}) {
  const data = searchParams.data ?? hojeSP();
  const inicio = instanteSlot(data, "00:00");
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  const rows: LinhaAgenda[] = await db
    .select({
      id: agendamentos.id,
      dataHora: agendamentos.dataHora,
      status: agendamentos.status,
      valor: agendamentos.valor,
      clienteNome: profiles.nome,
      barbeiroId: barbeiros.id,
      barbeiroNome: barbeiros.nome,
      servicoNome: servicos.nome,
    })
    .from(agendamentos)
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(profiles, eq(agendamentos.clienteId, profiles.id))
    .where(and(gte(agendamentos.dataHora, inicio), lt(agendamentos.dataHora, fim)))
    .orderBy(asc(agendamentos.dataHora));

  const validos = rows.filter((r) => r.status !== "cancelado");
  const total = validos.reduce((soma, r) => soma + Number(r.valor), 0);
  const qtd = validos.length;
  const ticket = qtd > 0 ? total / qtd : 0;

  const grupos = new Map<string, { nome: string; itens: LinhaAgenda[] }>();
  for (const r of rows) {
    const grupo = grupos.get(r.barbeiroId) ?? { nome: r.barbeiroNome, itens: [] };
    grupo.itens.push(r);
    grupos.set(r.barbeiroId, grupo);
  }

  const cards = [
    { label: "Faturamento do dia", valor: formatBRL(total), icon: DollarSign },
    { label: "Atendimentos", valor: String(qtd), icon: CalendarCheck },
    { label: "Ticket médio", valor: formatBRL(ticket), icon: Receipt },
  ];

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Agendamentos e faturamento do dia."
        action={<DateNav data={data} />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, valor, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{label}</span>
              <Icon className="h-4 w-4 text-brand-light" />
            </div>
            <p className="mt-3 text-2xl font-bold">{valor}</p>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nenhum agendamento neste dia.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grupos.values()).map((grupo) => (
            <div key={grupo.nome}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted2">
                {grupo.nome}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-line">
                <div className="divide-y divide-line">
                  {grupo.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
                    >
                      <span className="w-14 shrink-0 font-semibold tabular-nums">
                        {horaSP(item.dataHora)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.clienteNome}</p>
                        <p className="text-sm text-muted">{item.servicoNome}</p>
                      </div>
                      <StatusBadge status={item.status} />
                      <span className="w-24 shrink-0 text-right font-semibold text-brand-light">
                        {formatBRL(item.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
