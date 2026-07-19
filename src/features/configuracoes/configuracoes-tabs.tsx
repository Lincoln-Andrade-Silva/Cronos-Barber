"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { BarbeariaInfo } from "@/db/schema";
import { BarbeariaForm } from "@/features/barbearia/barbearia-form";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "barbearia", label: "Barbearia", ready: true },
  { key: "servicos", label: "Serviços", ready: false },
  { key: "expediente", label: "Expediente", ready: false },
  { key: "usuarios", label: "Usuários", ready: false },
  { key: "comissao", label: "Comissão", ready: false },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ConfiguracoesTabs({ info }: { info: BarbeariaInfo | null }) {
  const [tab, setTab] = useState<TabKey>("barbearia");

  return (
    <div>
      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              disabled={!t.ready}
              onClick={() => t.ready && setTab(t.key)}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition",
                active ? "border-brand text-ink" : "border-transparent",
                t.ready ? "text-muted hover:text-ink" : "cursor-not-allowed text-muted2",
              )}
            >
              {t.label}
              {!t.ready && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted2">
                  em breve
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "barbearia" && (
        <Card>
          <BarbeariaForm info={info} />
        </Card>
      )}
    </div>
  );
}
