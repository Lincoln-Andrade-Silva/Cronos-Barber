"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";
import type { Categoria, Servico } from "@/db/schema";
import { formatBRL } from "@/lib/format";
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
  categorias,
  taxaCartao,
  onClose,
}: {
  servico: Servico | null;
  categorias: Categoria[];
  taxaCartao: number;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<ServicoFormState, FormData>(salvarServico, {});
  const [ativo, setAtivo] = useState(servico?.ativo ?? true);
  const [preco, setPreco] = useState(servico?.preco ?? "0");
  const [categoriaId, setCategoriaId] = useState(servico?.categoriaId ?? "");

  const precoNum = Number(String(preco).replace(",", "."));
  const temPreco = Number.isFinite(precoNum) && precoNum > 0;
  const liquido = temPreco ? precoNum * (1 - taxaCartao / 100) : 0;

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={servico ? "Editar serviço" : "Novo serviço"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {servico && <input type="hidden" name="id" value={servico.id} />}
        <input type="hidden" name="ativo" value={String(ativo)} />
        <input type="hidden" name="categoriaId" value={categoriaId} />

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
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
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
        {temPreco && (
          <p className="-mt-2 text-xs text-muted">
            No pagamento antecipado (cartão via Mercado Pago) você recebe{" "}
            <span className="font-semibold text-emerald-400">{formatBRL(liquido)}</span>, já
            descontada a taxa ({taxaCartao.toString().replace(".", ",")}% = -
            {formatBRL(precoNum - liquido)}). No balcão, o valor é integral.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria">
            <Select
              value={categoriaId}
              onChange={setCategoriaId}
              options={[
                { value: "", label: "Sem categoria" },
                ...categorias.map((c) => ({
                  value: c.id,
                  label: c.ativo ? c.nome : `${c.nome} (inativa)`,
                })),
              ]}
            />
          </Field>
          <Field label="Ordem" htmlFor="s-ordem" hint="(na categoria)">
            <Input id="s-ordem" name="ordem" type="number" min={0} defaultValue={servico?.ordem ?? 0} />
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
