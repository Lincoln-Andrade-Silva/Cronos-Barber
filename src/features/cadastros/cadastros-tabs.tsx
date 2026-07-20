"use client";

import { useState } from "react";
import { Card, TabBar, type TabItem } from "@/components/ui";
import type { Barbeiro, Produto, Servico } from "@/db/schema";
import { BarbeirosClient } from "@/features/barbeiros/barbeiros-client";
import { ServicosClient } from "@/features/servicos/servicos-client";
import { ProdutosClient } from "@/features/produtos/produtos-client";

const TABS = [
  { key: "barbeiros", label: "Barbeiros", ready: true },
  { key: "servicos", label: "Serviços", ready: true },
  { key: "produtos", label: "Produtos", ready: true },
  { key: "planos", label: "Planos", ready: false },
] as const satisfies readonly TabItem[];

export function CadastrosTabs({
  barbeiros,
  servicos,
  produtos,
}: {
  barbeiros: Barbeiro[];
  servicos: Servico[];
  produtos: Produto[];
}) {
  const [tab, setTab] = useState<string>("barbeiros");

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "barbeiros" && <BarbeirosClient barbeiros={barbeiros} />}
      {tab === "servicos" && <ServicosClient servicos={servicos} />}
      {tab === "produtos" && <ProdutosClient produtos={produtos} />}
      {tab === "planos" && (
        <Card>
          <p className="text-sm text-muted">Planos entram na fase de Assinaturas.</p>
        </Card>
      )}
    </div>
  );
}
