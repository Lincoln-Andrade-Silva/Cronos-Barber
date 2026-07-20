import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { barbeiros, produtos, servicos } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { CadastrosTabs } from "@/features/cadastros/cadastros-tabs";

export const dynamic = "force-dynamic";

export default async function CadastrosPage() {
  const [listaBarbeiros, listaServicos, listaProdutos] = await Promise.all([
    db.select().from(barbeiros).orderBy(desc(barbeiros.criadoEm)),
    db.select().from(servicos).orderBy(asc(servicos.nome)),
    db.select().from(produtos).orderBy(asc(produtos.nome)),
  ]);

  return (
    <div>
      <PageHeader
        title="Cadastros"
        description="Barbeiros, serviços, produtos e planos da barbearia."
      />
      <CadastrosTabs
        barbeiros={listaBarbeiros}
        servicos={listaServicos}
        produtos={listaProdutos}
      />
    </div>
  );
}
