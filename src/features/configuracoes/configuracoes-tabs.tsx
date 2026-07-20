"use client";

import { useState } from "react";
import { Card, TabBar, type TabItem } from "@/components/ui";
import type { BarbeariaInfo } from "@/db/schema";
import { BarbeariaForm } from "@/features/barbearia/barbearia-form";

const TABS = [
  { key: "barbearia", label: "Barbearia", ready: true },
  { key: "expediente", label: "Expediente", ready: false },
  { key: "usuarios", label: "Usuários", ready: false },
  { key: "comissao", label: "Comissão", ready: false },
] as const satisfies readonly TabItem[];

export function ConfiguracoesTabs({ info }: { info: BarbeariaInfo | null }) {
  const [tab, setTab] = useState<string>("barbearia");

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "barbearia" && (
        <Card>
          <BarbeariaForm info={info} />
        </Card>
      )}
    </div>
  );
}
