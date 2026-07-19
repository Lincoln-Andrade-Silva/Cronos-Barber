import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { LogoutButton } from "@/features/auth/logout-button";

export const dynamic = "force-dynamic";

export default async function ClientHome() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
            CB
          </div>
          <span className="font-semibold">Cronos Barber</span>
        </div>
        <LogoutButton />
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
