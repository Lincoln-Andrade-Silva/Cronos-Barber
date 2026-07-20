import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { barbeiros, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { servicosCobertosDoCliente } from "@/lib/plano";
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
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Início
      </Link>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Agendar horário</h1>
      <AgendarWizard
        servicos={listaServicos}
        barbeiros={listaBarbeiros}
        servicosCobertos={cobertos}
      />
    </main>
  );
}
