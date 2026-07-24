import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { estiloDaArea } from "@/lib/aparencia";
import { getAparencia, getEstabelecimentoBrand } from "@/lib/estabelecimento";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.tipo !== "admin") redirect("/");

  const [{ nome: nomeEstabelecimento, logoUrl }, aparencia] = await Promise.all([
    getEstabelecimentoBrand(),
    getAparencia(),
  ]);
  // O painel tem tema próprio: as CSS variables aqui sobrescrevem as do body (vitrine).
  const admin = estiloDaArea(aparencia.admin);

  return (
    <div data-tema={admin.dataTema} style={admin.style} className="min-h-screen bg-bg text-ink">
      <AdminShell nome={profile.nome} nomeEstabelecimento={nomeEstabelecimento} logoUrl={logoUrl}>
        {children}
      </AdminShell>
    </div>
  );
}
