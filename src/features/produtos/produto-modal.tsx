"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, Input, Modal, Toggle } from "@/components/ui";
import type { Produto } from "@/db/schema";
import { salvarProduto, type ProdutoFormState } from "./actions";

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function ProdutoModal({
  produto,
  onClose,
}: {
  produto: Produto | null;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<ProdutoFormState, FormData>(salvarProduto, {});
  const [ativo, setAtivo] = useState((produto?.status ?? "ativo") === "ativo");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={produto ? "Editar produto" : "Novo produto"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {produto && <input type="hidden" name="id" value={produto.id} />}
        <input type="hidden" name="status" value={ativo ? "ativo" : "inativo"} />

        <Field label="Nome" htmlFor="p-nome">
          <Input
            id="p-nome"
            name="nome"
            required
            defaultValue={produto?.nome ?? ""}
            placeholder="Ex: Pomada modeladora"
          />
        </Field>

        <Field label="Valor (R$)" htmlFor="p-valor">
          <Input
            id="p-valor"
            name="valor"
            type="number"
            min={0}
            step="0.01"
            defaultValue={produto?.valor ?? "0"}
          />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted">Disponível para venda.</p>
          </div>
          <Toggle on={ativo} onClick={() => setAtivo(!ativo)} />
        </div>

        {state.error && <FormError>{state.error}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton editando={!!produto} />
        </div>
      </form>
    </Modal>
  );
}
