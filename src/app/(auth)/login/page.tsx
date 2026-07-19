import { Suspense } from "react";
import { getBarbeariaBrand } from "@/lib/barbearia";
import { AuthPanel } from "@/features/auth/auth-panel";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { nome, logoUrl } = await getBarbeariaBrand();
  return (
    <Suspense fallback={null}>
      <AuthPanel defaultTab="login" nomeBarbearia={nome} logoUrl={logoUrl} />
    </Suspense>
  );
}
