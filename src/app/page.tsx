import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { getBarbeariaNome } from "@/lib/barbearia";
import { LogoutButton } from "@/features/auth/logout-button";

export const dynamic = "force-dynamic";

export default async function ClientHome() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const nomeBarbearia = await getBarbeariaNome();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <span className="text-lg font-extrabold tracking-tight text-white">
          {nomeBarbearia}
        </span>
        <LogoutButton fullWidth={false} />
      </header>

      <Card>
        <h1 className="text-xl font-bold">Olá, {profile.nome}</h1>
        <p className="mt-1 text-sm text-muted">
          Bem-vindo. Em breve você poderá agendar seus horários por aqui.
        </p>
      </Card>
    </main>
  );
}
