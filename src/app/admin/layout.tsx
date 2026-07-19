import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getBarbeariaNome } from "@/lib/barbearia";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile.tipo !== "admin") redirect("/");

  const nomeBarbearia = await getBarbeariaNome();

  return (
    <AdminShell nome={profile.nome} nomeBarbearia={nomeBarbearia}>
      {children}
    </AdminShell>
  );
}
