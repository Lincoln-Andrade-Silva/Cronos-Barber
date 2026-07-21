import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getEstabelecimentoBrand } from "@/lib/estabelecimento";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.tipo !== "admin") redirect("/");

  const { nome: nomeEstabelecimento, logoUrl } = await getEstabelecimentoBrand();

  return (
    <AdminShell nome={profile.nome} nomeEstabelecimento={nomeEstabelecimento} logoUrl={logoUrl}>
      {children}
    </AdminShell>
  );
}
