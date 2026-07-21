import { Card, PageHeader, UrlTabBar, type TabItem } from "@/components/ui";
import { getEstabelecimentoInfo } from "@/lib/estabelecimento";
import { getIntegracaoPagamento } from "@/lib/pagamento";
import { EstabelecimentoForm } from "@/features/estabelecimento/estabelecimento-form";
import { PagamentoForm } from "@/features/pagamentos/pagamento-form";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "estabelecimento", label: "Estabelecimento", ready: true },
  { key: "pagamentos", label: "Pagamentos", ready: true },
] as const satisfies readonly TabItem[];

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab ?? "estabelecimento";

  let conteudo: React.ReactNode;
  if (tab === "pagamentos") {
    const cfg = await getIntegracaoPagamento();
    conteudo = (
      <Card>
        <PagamentoForm
          accessToken={cfg?.accessToken ?? null}
          publicKey={cfg?.publicKey ?? null}
          webhookSecret={cfg?.webhookSecret ?? null}
          siteUrl={cfg?.siteUrl ?? null}
        />
      </Card>
    );
  } else {
    const info = await getEstabelecimentoInfo();
    conteudo = (
      <Card>
        <EstabelecimentoForm info={info} />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Identidade, informações e integrações do estabelecimento."
      />
      <UrlTabBar tabs={TABS} defaultTab="estabelecimento" />
      {conteudo}
    </div>
  );
}
