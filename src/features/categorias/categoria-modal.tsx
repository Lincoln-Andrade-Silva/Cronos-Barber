"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, Input, Modal, Toggle } from "@/components/ui";
import type { Categoria } from "@/db/schema";
import { salvarCategoria, type CategoriaFormState } from "./actions";

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function CategoriaModal({
  categoria,
  onClose,
}: {
  categoria: Categoria | null;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<CategoriaFormState, FormData>(salvarCategoria, {});
  const [ativo, setAtivo] = useState(categoria?.ativo ?? true);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={categoria ? "Editar categoria" : "Nova categoria"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {categoria && <input type="hidden" name="id" value={categoria.id} />}
        <input type="hidden" name="ativo" value={String(ativo)} />

        <Field label="Nome" htmlFor="c-nome">
          <Input
            id="c-nome"
            name="nome"
            required
            defaultValue={categoria?.nome ?? ""}
            placeholder="Ex: Cabelo"
          />
        </Field>

        <Field label="Ordem" htmlFor="c-ordem" hint="(menor aparece primeiro)">
          <Input
            id="c-ordem"
            name="ordem"
            type="number"
            min={0}
            defaultValue={categoria?.ordem ?? 0}
          />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativa</p>
            <p className="text-xs text-muted">Categoria inativa não agrupa serviços no agendamento.</p>
          </div>
          <Toggle on={ativo} onClick={() => setAtivo(!ativo)} />
        </div>

        {state.error && <FormError>{state.error}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton editando={!!categoria} />
        </div>
      </form>
    </Modal>
  );
}
