"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, ImageUpload, Input, Modal, Toggle } from "@/components/ui";
import type { Barbeiro } from "@/db/schema";
import { salvarBarbeiro, type BarbeiroFormState } from "./actions";

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function BarbeiroModal({
  barbeiro,
  onClose,
}: {
  barbeiro: Barbeiro | null;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<BarbeiroFormState, FormData>(salvarBarbeiro, {});
  const [ativo, setAtivo] = useState(barbeiro?.ativo ?? true);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={barbeiro ? "Editar barbeiro" : "Novo barbeiro"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {barbeiro && <input type="hidden" name="id" value={barbeiro.id} />}
        <input type="hidden" name="ativo" value={String(ativo)} />

        <div className="flex justify-center">
          <ImageUpload name="foto" initialUrl={barbeiro?.fotoUrl} size={104} label="Foto" />
        </div>

        <Field label="Nome" htmlFor="b-nome">
          <Input
            id="b-nome"
            name="nome"
            required
            defaultValue={barbeiro?.nome ?? ""}
            placeholder="Nome do barbeiro"
          />
        </Field>

        <Field label="Comissão (%)" htmlFor="b-comissao" hint="sobre o serviço">
          <Input
            id="b-comissao"
            name="comissao"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={barbeiro?.comissaoPercentual ?? "0"}
          />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted">Disponível para agendamentos.</p>
          </div>
          <Toggle on={ativo} onClick={() => setAtivo(!ativo)} />
        </div>

        {state.error && <FormError>{state.error}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton editando={!!barbeiro} />
        </div>
      </form>
    </Modal>
  );
}
