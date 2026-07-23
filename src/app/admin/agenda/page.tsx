import { and, asc, eq, gte, lt } from "drizzle-orm";
import { Ban, CalendarCheck, CheckCircle2, DollarSign, CreditCard, Hourglass } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, produtos, profiles, servicos } from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";
import { instanteSlot } from "@/lib/disponibilidade";
import { formatBRL } from "@/lib/format";
import { DayNav } from "@/features/agenda/day-nav";
import { BarberSelect } from "@/features/agenda/barber-select";
import { NovoAtendimento } from "@/features/agenda/novo-atendimento";
import { AgendaLista, type AgendaItem } from "@/features/agenda/agenda-lista";

export const dynamic = "force-dynamic";

function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { data?: string; barbeiro?: string };
}) {
  const data = searchParams.data ?? hojeSP();
  const inicioTs = instanteSlot(data, "00:00");
  const fimTs = new Date(inicioTs.getTime() + 24 * 60 * 60 * 1000);

  const [rows, listaBarbeiros, listaServicos, listaClientes, listaProdutos] = await Promise.all([
    db
      .select({
        id: agendamentos.id,
        grupoId: agendamentos.grupoId,
        dataHora: agendamentos.dataHora,
        status: agendamentos.status,
        tipo: agendamentos.tipo,
        valor: agendamentos.valor,
        formaPagamento: agendamentos.formaPagamento,
        pagamentoStatus: agendamentos.pagamentoStatus,
        clienteNome: profiles.nome,
        clienteAvulso: agendamentos.clienteAvulso,
        barbeiroId: agendamentos.barbeiroId,
        servicoNome: servicos.nome,
        duracaoMinutos: servicos.duracaoMinutos,
      })
      .from(agendamentos)
      .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
      .leftJoin(profiles, eq(agendamentos.clienteId, profiles.id))
      .where(and(gte(agendamentos.dataHora, inicioTs), lt(agendamentos.dataHora, fimTs)))
      .orderBy(asc(agendamentos.dataHora)),
    db
      .select({ id: barbeiros.id, nome: barbeiros.nome, fotoUrl: barbeiros.fotoUrl })
      .from(barbeiros)
      .where(eq(barbeiros.ativo, true))
      .orderBy(asc(barbeiros.nome)),
    db
      .select({ id: servicos.id, nome: servicos.nome, preco: servicos.preco, duracaoMinutos: servicos.duracaoMinutos })
      .from(servicos)
      .where(eq(servicos.ativo, true))
      .orderBy(asc(servicos.nome)),
    db
      .select({ id: profiles.id, nome: profiles.nome })
      .from(profiles)
      .where(eq(profiles.tipo, "cliente"))
      .orderBy(asc(profiles.nome)),
    db
      .select({ id: produtos.id, nome: produtos.nome, valor: produtos.valor })
      .from(produtos)
      .where(eq(produtos.status, "ativo"))
      .orderBy(asc(produtos.nome)),
  ]);

  const barbeiroSel = searchParams.barbeiro ?? listaBarbeiros[0]?.id ?? "";
  const rowsBarbeiro = rows.filter((r) => r.barbeiroId === barbeiroSel);

  // Estornado e cancelado não geram receita.
  const validos = rowsBarbeiro.filter((r) => r.status !== "cancelado" && r.status !== "estornado");
  const finalizados = rowsBarbeiro.filter((r) => r.status === "finalizado");
  const encerrados = rowsBarbeiro.filter(
    (r) => r.status === "cancelado" || r.status === "estornado",
  );
  // Atendimentos cobertos por plano não geram receita.
  const pagantes = validos.filter((r) => r.tipo !== "plano");
  const total = pagantes.reduce((soma, r) => soma + Number(r.valor), 0);
  // Já recebido online (cartão via MP) e ainda a receber no balcão.
  const recebidoOnline = validos
    .filter((r) => r.formaPagamento === "online" && r.pagamentoStatus === "pago")
    .reduce((soma, r) => soma + Number(r.valor), 0);
  const aReceber = pagantes
    .filter((r) => r.pagamentoStatus !== "pago")
    .reduce((soma, r) => soma + Number(r.valor), 0);
  const taxaCancelamento =
    rowsBarbeiro.length > 0 ? (encerrados.length / rowsBarbeiro.length) * 100 : 0;

  const cards = [
    { label: "Faturamento", valor: formatBRL(total), icon: DollarSign },
    { label: "Recebido online", valor: formatBRL(recebidoOnline), icon: CreditCard },
    { label: "A receber", valor: formatBRL(aReceber), icon: Hourglass },
    { label: "Atendimentos", valor: String(validos.length), icon: CalendarCheck },
    { label: "Finalizados", valor: String(finalizados.length), icon: CheckCircle2 },
    { label: "Cancel./estorn.", valor: `${taxaCancelamento.toFixed(0)}%`, icon: Ban },
  ];

  const barbeiroAtivo = listaBarbeiros.find((b) => b.id === barbeiroSel);

  const items: AgendaItem[] = rowsBarbeiro.map((r) => ({
    id: r.id,
    grupoId: r.grupoId,
    dataHoraISO: r.dataHora.toISOString(),
    status: r.status,
    tipo: r.tipo,
    valor: r.valor,
    formaPagamento: r.formaPagamento as "presencial" | "online",
    pagamentoStatus: r.pagamentoStatus,
    clienteNome: r.clienteNome ?? r.clienteAvulso ?? "Sem cadastro",
    barbeiroId: r.barbeiroId,
    servicoNome: r.servicoNome,
    duracaoMinutos: r.duracaoMinutos,
  }));

  return (
    <div>
      <PageHeader title="Agenda" description="Agendamentos do dia por profissional." />

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <DayNav data={data} />
        {listaBarbeiros.length > 0 && (
          <BarberSelect barbeiros={listaBarbeiros} atual={barbeiroSel} />
        )}
        <div className="sm:ml-auto">
          <NovoAtendimento
            barbeiros={listaBarbeiros}
            clientes={listaClientes}
            servicos={listaServicos}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

      <AgendaLista
        items={items}
        barbeiroNome={barbeiroAtivo?.nome}
        barbeiroFotoUrl={barbeiroAtivo?.fotoUrl}
        servicos={listaServicos}
        produtos={listaProdutos}
      />
    </div>
  );
}
