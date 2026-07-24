import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAparencia } from "@/lib/estabelecimento";
import { AparenciaForm } from "@/features/aparencia/aparencia-form";

export const dynamic = "force-dynamic";

export default async function AparenciaPage() {
  await requireAdmin();
  const aparencia = await getAparencia();

  return (
    <div>
      <PageHeader
        title="Aparência"
        description="Tema e fonte da vitrine e do painel admin, escolhidos separadamente."
      />
      <AparenciaForm inicial={aparencia} />
    </div>
  );
}
