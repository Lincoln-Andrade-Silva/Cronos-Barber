import { Suspense } from "react";
import { getEstabelecimentoBrand } from "@/lib/estabelecimento";
import { AuthPanel } from "@/features/auth/auth-panel";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  const { nome, logoUrl } = await getEstabelecimentoBrand();
  const aviso =
    searchParams.erro === "inativo"
      ? "Seu acesso está inativo. Fale com o estabelecimento."
      : undefined;
  return (
    <Suspense fallback={null}>
      <AuthPanel defaultTab="login" nomeEstabelecimento={nome} logoUrl={logoUrl} aviso={aviso} />
    </Suspense>
  );
}
