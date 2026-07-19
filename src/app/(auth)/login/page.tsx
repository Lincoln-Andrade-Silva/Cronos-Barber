import { Suspense } from "react";
import { getBarbeariaNome } from "@/lib/barbearia";
import { AuthPanel } from "@/features/auth/auth-panel";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const nomeBarbearia = await getBarbeariaNome();
  return (
    <Suspense fallback={null}>
      <AuthPanel defaultTab="login" nomeBarbearia={nomeBarbearia} />
    </Suspense>
  );
}
