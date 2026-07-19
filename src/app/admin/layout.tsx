import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getBarbeariaBrand } from "@/lib/barbearia";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.tipo !== "admin") redirect("/");

  const { nome: nomeBarbearia, logoUrl } = await getBarbeariaBrand();

  return (
    <AdminShell nome={profile.nome} nomeBarbearia={nomeBarbearia} logoUrl={logoUrl}>
      {children}
    </AdminShell>
  );
}
