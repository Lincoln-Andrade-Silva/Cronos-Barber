import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, barbeiros, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { ClienteHeader } from "@/features/cliente/cliente-header";
import { MeusAgendamentos } from "@/features/agendamento/meus-agendamentos";

export const dynamic = "force-dynamic";

export default async function MeusAgendamentosPage() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const rows = await db
    .select({
      id: agendamentos.id,
      grupoId: agendamentos.grupoId,
      dataHora: agendamentos.dataHora,
      status: agendamentos.status,
      tipo: agendamentos.tipo,
      valor: agendamentos.valor,
      servicoNome: servicos.nome,
      barbeiroNome: barbeiros.nome,
      barbeiroFoto: barbeiros.fotoUrl,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .where(eq(agendamentos.clienteId, profile.id))
    .orderBy(desc(agendamentos.dataHora));

  const items = rows.map((r) => ({
    id: r.id,
    grupoId: r.grupoId,
    dataHoraISO: r.dataHora.toISOString(),
    status: r.status,
    tipo: r.tipo,
    valor: r.valor,
    servicoNome: r.servicoNome,
    barbeiroNome: r.barbeiroNome,
    barbeiroFoto: r.barbeiroFoto,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <ClienteHeader nomeUsuario={profile.nome} />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Meus agendamentos</h1>
      <MeusAgendamentos items={items} />
    </main>
  );
}
