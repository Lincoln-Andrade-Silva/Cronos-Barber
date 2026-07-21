"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { ConfirmModal } from "@/components/ui";
import { cancelarAssinaturaCliente } from "./assinar-actions";

export function CancelarButton({ id, planoNome }: { id: string; planoNome: string }) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      await cancelarAssinaturaCliente(id);
      setAberto(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-red-400"
      >
        <X className="h-4 w-4" />
        Cancelar assinatura
      </button>

      <ConfirmModal
        open={aberto}
        onClose={() => setAberto(false)}
        onConfirm={confirmar}
        loading={pending}
        title="Cancelar assinatura"
        confirmLabel="Cancelar assinatura"
        message={
          <>
            Deseja cancelar a assinatura do plano <strong className="text-ink">{planoNome}</strong>?
            As cobranças futuras serão interrompidas.
          </>
        }
      />
    </>
  );
}
