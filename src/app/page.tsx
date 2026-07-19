import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { getBarbeariaBrand } from "@/lib/barbearia";
import { LogoutButton } from "@/features/auth/logout-button";

export const dynamic = "force-dynamic";

export default async function ClientHome() {
  const profile = await getCurrentProfile();
  if (profile.tipo === "admin") redirect("/admin");

  const { nome: nomeBarbearia, logoUrl } = await getBarbeariaBrand();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={nomeBarbearia}
              className="h-10 w-10 rounded-full border border-line object-cover"
            />
          )}
          <span className="text-lg font-extrabold tracking-tight text-white">
            {nomeBarbearia}
          </span>
        </div>
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
