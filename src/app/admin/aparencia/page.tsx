import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAparencia, getEstabelecimentoNome } from "@/lib/estabelecimento";
import { AparenciaForm } from "@/features/aparencia/aparencia-form";

export const dynamic = "force-dynamic";

export default async function AparenciaPage() {
  await requireAdmin();
  const [aparencia, nome] = await Promise.all([getAparencia(), getEstabelecimentoNome()]);

  return (
    <div>
      <PageHeader
        title="Aparência"
        description="Tema e fonte do sistema (vitrine e painel). A prévia mostra como fica antes de salvar."
      />
      <AparenciaForm inicial={aparencia} nome={nome} />
    </div>
  );
}
