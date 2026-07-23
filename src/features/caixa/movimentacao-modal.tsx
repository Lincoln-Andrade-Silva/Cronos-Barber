"use client";

import { useState, useTransition } from "react";
import { Button, Field, FormError, Input, Modal, Segmented, Select } from "@/components/ui";
import { CATEGORIAS, type TipoMovimentacao } from "./categorias";
import { salvarMovimentacao } from "./actions";

export interface MovimentacaoEditavel {
  id: string;
  tipo: TipoMovimentacao;
  categoria: string;
  descricao: string;
  valor: string;
  dataYmd: string;
}

function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function MovimentacaoModal({
  movimentacao,
  onClose,
}: {
  movimentacao: MovimentacaoEditavel | null;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimentacao>(movimentacao?.tipo ?? "saida");
  const [categoria, setCategoria] = useState(movimentacao?.categoria ?? CATEGORIAS.saida[0].value);
  const [descricao, setDescricao] = useState(movimentacao?.descricao ?? "");
  const [valor, setValor] = useState(movimentacao?.valor ?? "");
  const [data, setData] = useState(movimentacao?.dataYmd ?? hojeSP());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function trocarTipo(novo: TipoMovimentacao) {
    setTipo(novo);
    if (!CATEGORIAS[novo].some((c) => c.value === categoria)) {
      setCategoria(CATEGORIAS[novo][0].value);
    }
  }

  function salvar(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    startTransition(async () => {
      const res = await salvarMovimentacao({
        id: movimentacao?.id,
        tipo,
        categoria,
        descricao,
        valor: Number(valor),
        data,
      });
      if (res.error) {
        setErro(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title={movimentacao ? "Editar lançamento" : "Novo lançamento"}>
      <form onSubmit={salvar} className="mx-auto max-w-sm space-y-5">
        <Field label="Tipo">
          <Segmented
            options={[
              { value: "entrada", label: "Entrada" },
              { value: "saida", label: "Saída" },
            ]}
            value={tipo}
            onChange={trocarTipo}
          />
        </Field>

        <Field label="Categoria">
          <Select
            value={categoria}
            onChange={setCategoria}
            options={CATEGORIAS[tipo].map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>

        <Field label="Descrição" htmlFor="mov-desc">
          <Input
            id="mov-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Conta de luz"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" htmlFor="mov-valor">
            <Input
              id="mov-valor"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Data" htmlFor="mov-data">
            <Input
              id="mov-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
        </div>

        {erro && <FormError>{erro}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : movimentacao ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
