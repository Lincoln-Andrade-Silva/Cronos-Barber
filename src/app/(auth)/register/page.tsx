import { Suspense } from "react";
import { getBarbeariaBrand } from "@/lib/barbearia";
import { AuthPanel } from "@/features/auth/auth-panel";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { nome, logoUrl } = await getBarbeariaBrand();
  return (
    <Suspense fallback={null}>
      <AuthPanel defaultTab="cadastro" nomeBarbearia={nome} logoUrl={logoUrl} />
    </Suspense>
  );
}
