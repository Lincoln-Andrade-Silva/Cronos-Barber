"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Gift } from "lucide-react";
import { Button, Field, FormError, Modal, Select, Toggle } from "@/components/ui";
import { salvarAssinatura, type AssinaturaFormState } from "./actions";

export interface AssinaturaItem {
  id: string;
  clienteId: string;
  clienteNome: string;
  planoId: string;
  status: "ativo" | "inativo";
}

export interface OpcaoCliente {
  id: string;
  nome: string;
}

export interface OpcaoPlano {
  id: string;
  nome: string;
}

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function AssinaturaModal({
  assinatura,
  clientes,
  planos,
  onClose,
}: {
  assinatura: AssinaturaItem | null;
  clientes: OpcaoCliente[];
  planos: OpcaoPlano[];
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<AssinaturaFormState, FormData>(
    salvarAssinatura,
    {},
  );
  const [clienteId, setClienteId] = useState(assinatura?.clienteId ?? "");
  const [planoId, setPlanoId] = useState(assinatura?.planoId ?? "");
  const [ativo, setAtivo] = useState((assinatura?.status ?? "ativo") === "ativo");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={assinatura ? "Editar assinatura" : "Nova assinatura"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {assinatura && <input type="hidden" name="id" value={assinatura.id} />}
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="planoId" value={planoId} />
        <input type="hidden" name="status" value={ativo ? "ativo" : "inativo"} />

        <Field label="Cliente">
          {assinatura ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
              {assinatura.clienteNome}
            </p>
          ) : (
            <Select
              value={clienteId}
              onChange={setClienteId}
              options={[
                { value: "", label: "Selecione o cliente" },
                ...clientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          )}
        </Field>

        <Field label="Plano">
          <Select
            value={planoId}
            onChange={setPlanoId}
            options={[
              { value: "", label: "Selecione o plano" },
              ...planos.map((p) => ({ value: p.id, label: p.nome })),
            ]}
          />
        </Field>

        {!assinatura && (
          <p className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-400">
            <Gift className="mt-0.5 h-4 w-4 shrink-0" />
            Adição manual é cortesia: o cliente recebe o plano sem nenhuma cobrança.
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativa</p>
            <p className="text-xs text-muted">Assinatura em vigor.</p>
          </div>
          <Toggle on={ativo} onClick={() => setAtivo(!ativo)} />
        </div>

        {state.error && <FormError>{state.error}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton editando={!!assinatura} />
        </div>
      </form>
    </Modal>
  );
}
