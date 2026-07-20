"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, Input, Modal, Textarea, Toggle } from "@/components/ui";
import type { Servico } from "@/db/schema";
import { salvarServico, type ServicoFormState } from "./actions";

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function ServicoModal({
  servico,
  onClose,
}: {
  servico: Servico | null;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<ServicoFormState, FormData>(salvarServico, {});
  const [ativo, setAtivo] = useState(servico?.ativo ?? true);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={servico ? "Editar serviço" : "Novo serviço"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {servico && <input type="hidden" name="id" value={servico.id} />}
        <input type="hidden" name="ativo" value={String(ativo)} />

        <Field label="Nome" htmlFor="s-nome">
          <Input
            id="s-nome"
            name="nome"
            required
            defaultValue={servico?.nome ?? ""}
            placeholder="Ex: Corte masculino"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço (R$)" htmlFor="s-preco">
            <Input
              id="s-preco"
              name="preco"
              type="number"
              min={0}
              step="0.01"
              defaultValue={servico?.preco ?? "0"}
            />
          </Field>
          <Field label="Duração (min)" htmlFor="s-duracao">
            <Input
              id="s-duracao"
              name="duracaoMinutos"
              type="number"
              min={5}
              step={5}
              defaultValue={servico?.duracaoMinutos ?? 30}
            />
          </Field>
        </div>

        <Field label="Descrição" htmlFor="s-descricao" hint="(opcional)">
          <Textarea
            id="s-descricao"
            name="descricao"
            defaultValue={servico?.descricao ?? ""}
            placeholder="Detalhes do serviço"
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
          <SubmitButton editando={!!servico} />
        </div>
      </form>
    </Modal>
  );
}
