import { Suspense } from "react";
import { getBarbeariaNome } from "@/lib/barbearia";
import { AuthPanel } from "@/features/auth/auth-panel";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const nomeBarbearia = await getBarbeariaNome();
  return (
    <Suspense fallback={null}>
      <AuthPanel defaultTab="cadastro" nomeBarbearia={nomeBarbearia} />
    </Suspense>
  );
}
