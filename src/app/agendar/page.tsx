import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { barbeiros, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { servicosCobertosDoCliente } from "@/lib/plano";
import { ClienteHeader } from "@/features/cliente/cliente-header";
import { AgendarWizard } from "@/features/agendamento/agendar-wizard";

export const dynamic = "force-dynamic";

export default async function AgendarPage() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const [listaServicos, listaBarbeiros, cobertos] = await Promise.all([
    db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(asc(servicos.nome)),
    db.select().from(barbeiros).where(eq(barbeiros.ativo, true)).orderBy(asc(barbeiros.nome)),
    servicosCobertosDoCliente(profile.id),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <ClienteHeader nomeUsuario={profile.nome} />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Agendar horário</h1>
      <AgendarWizard
        servicos={listaServicos}
        barbeiros={listaBarbeiros}
        servicosCobertos={cobertos}
      />
    </main>
  );
}
