"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { assinarPlano } from "./assinar-actions";

export function AssinarButton({ planoId, ativo }: { planoId: string; ativo: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (ativo) {
    return (
      <span className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 py-2.5 text-sm font-semibold text-emerald-400">
        Plano ativo
      </span>
    );
  }

  function assinar() {
    setErro(null);
    startTransition(async () => {
      const res = await assinarPlano(planoId);
      if (res?.error) setErro(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={pending} onClick={assinar}>
        <CreditCard className="h-4 w-4" />
        {pending ? "Redirecionando..." : "Assinar com cartão"}
      </Button>
      {erro && <FormError>{erro}</FormError>}
    </div>
  );
}
