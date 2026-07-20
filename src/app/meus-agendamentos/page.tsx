import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { agendamentos, barbeiros, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { MeusAgendamentos } from "@/features/agendamento/meus-agendamentos";

export const dynamic = "force-dynamic";

export default async function MeusAgendamentosPage() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const rows = await db
    .select({
      id: agendamentos.id,
      dataHora: agendamentos.dataHora,
      status: agendamentos.status,
      tipo: agendamentos.tipo,
      valor: agendamentos.valor,
      servicoNome: servicos.nome,
      barbeiroNome: barbeiros.nome,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .where(eq(agendamentos.clienteId, profile.id))
    .orderBy(desc(agendamentos.dataHora));

  const items = rows.map((r) => ({
    id: r.id,
    dataHoraISO: r.dataHora.toISOString(),
    status: r.status,
    tipo: r.tipo,
    valor: r.valor,
    servicoNome: r.servicoNome,
    barbeiroNome: r.barbeiroNome,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Início
      </Link>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Meus agendamentos</h1>
      <MeusAgendamentos items={items} />
    </main>
  );
}
