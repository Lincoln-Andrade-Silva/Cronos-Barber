import { PageHeader, UrlTabBar, type TabItem } from "@/components/ui";
import { instanteSlot } from "@/lib/disponibilidade";
import { diasAtras, hojeSP } from "@/features/relatorios/datas";
import { PeriodoNav } from "@/features/relatorios/periodo-nav";
import { PainelFinanceiro } from "@/features/relatorios/painel-financeiro";
import { PainelAtendimentos } from "@/features/relatorios/painel-atendimentos";
import { PainelComissoes } from "@/features/relatorios/painel-comissoes";
import { PainelAssinaturas } from "@/features/relatorios/painel-assinaturas";
import { PainelProdutos } from "@/features/relatorios/painel-produtos";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "financeiro", label: "Financeiro", ready: true },
  { key: "atendimentos", label: "Atendimentos", ready: true },
  { key: "comissoes", label: "Comissões", ready: true },
  { key: "assinaturas", label: "Assinaturas", ready: true },
  { key: "produtos", label: "Produtos", ready: true },
] as const satisfies readonly TabItem[];

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { tab?: string; de?: string; ate?: string };
}) {
  const tab = searchParams.tab ?? "financeiro";
  const ate = searchParams.ate ?? hojeSP();
  const de = searchParams.de ?? diasAtras(ate, 29);
  const inicio = instanteSlot(de, "00:00");
  const fimExclusivo = new Date(instanteSlot(ate, "00:00").getTime() + 24 * 60 * 60 * 1000);

  let painel: React.ReactNode;
  if (tab === "atendimentos") painel = <PainelAtendimentos inicio={inicio} fimExclusivo={fimExclusivo} />;
  else if (tab === "comissoes") painel = <PainelComissoes inicio={inicio} fimExclusivo={fimExclusivo} />;
  else if (tab === "assinaturas") painel = <PainelAssinaturas inicio={inicio} fimExclusivo={fimExclusivo} />;
  else if (tab === "produtos") painel = <PainelProdutos inicio={inicio} fimExclusivo={fimExclusivo} />;
  else painel = <PainelFinanceiro inicio={inicio} fimExclusivo={fimExclusivo} />;

  return (
    <div>
      <PageHeader title="Relatórios" description="Desempenho da barbearia no período." />
      <UrlTabBar tabs={TABS} defaultTab="financeiro" />

      <div className="mb-6">
        <PeriodoNav de={de} ate={ate} />
      </div>

      {painel}
    </div>
  );
}
