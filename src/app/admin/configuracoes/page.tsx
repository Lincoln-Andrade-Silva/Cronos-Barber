import { PageHeader } from "@/components/ui";
import { getBarbeariaInfo } from "@/lib/barbearia";
import { ConfiguracoesTabs } from "@/features/configuracoes/configuracoes-tabs";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const info = await getBarbeariaInfo();

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Ajustes gerais do sistema e da identidade da barbearia."
      />
      <ConfiguracoesTabs info={info} />
    </div>
  );
}
