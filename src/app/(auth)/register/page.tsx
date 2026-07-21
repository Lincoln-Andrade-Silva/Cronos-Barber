import { Suspense } from "react";
import { getEstabelecimentoBrand } from "@/lib/estabelecimento";
import { AuthPanel } from "@/features/auth/auth-panel";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { nome, logoUrl } = await getEstabelecimentoBrand();
  return (
    <Suspense fallback={null}>
      <AuthPanel defaultTab="cadastro" nomeEstabelecimento={nome} logoUrl={logoUrl} />
    </Suspense>
  );
}
