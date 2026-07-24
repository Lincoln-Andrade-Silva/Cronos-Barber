import { redirect } from "next/navigation";
import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { barbeiros, categorias, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { servicosCobertosDoCliente } from "@/lib/plano";
import { ClienteHeader } from "@/features/cliente/cliente-header";
import { BloqueioBanner } from "@/features/cliente/bloqueio-banner";
import { AgendarWizard } from "@/features/agendamento/agendar-wizard";

export const dynamic = "force-dynamic";

export default async function AgendarPage() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const [listaServicos, listaBarbeiros, cobertos] = await Promise.all([
    // Serviços com o nome da categoria (só categorias ativas agrupam), ordenados por
    // ordem da categoria, depois ordem do serviço — sem categoria fica por último.
    db
      .select({ ...getTableColumns(servicos), categoriaNome: categorias.nome })
      .from(servicos)
      .leftJoin(categorias, and(eq(servicos.categoriaId, categorias.id), eq(categorias.ativo, true)))
      .where(eq(servicos.ativo, true))
      .orderBy(asc(categorias.ordem), asc(servicos.ordem), asc(servicos.nome)),
    db.select().from(barbeiros).where(eq(barbeiros.ativo, true)).orderBy(asc(barbeiros.nome)),
    servicosCobertosDoCliente(profile.id),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <ClienteHeader nomeUsuario={profile.nome} />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Agendar horário</h1>
      <BloqueioBanner entrada={profile} />
      <AgendarWizard
        servicos={listaServicos}
        barbeiros={listaBarbeiros}
        servicosCobertos={cobertos}
      />
    </main>
  );
}
