import { Card, PageHeader } from "@/components/ui";
import { getBarbeariaInfo } from "@/lib/barbearia";
import { BarbeariaForm } from "@/features/barbearia/barbearia-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const info = await getBarbeariaInfo();

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Identidade e informações da barbearia."
      />
      <Card>
        <BarbeariaForm info={info} />
      </Card>
    </div>
  );
}
