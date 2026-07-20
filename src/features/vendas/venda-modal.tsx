"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Field, FormError, Input, Modal, Select } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { registrarVenda } from "./actions";

export interface OpcaoProduto {
  id: string;
  nome: string;
  valor: string;
}
export interface Opcao {
  id: string;
  nome: string;
  fotoUrl?: string | null;
}

export function VendaModal({
  produtos,
  barbeiros,
  clientes,
  onClose,
}: {
  produtos: OpcaoProduto[];
  barbeiros: Opcao[];
  clientes: Opcao[];
  onClose: () => void;
}) {
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [barbeiroId, setBarbeiroId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => {
    const produto = produtos.find((p) => p.id === produtoId);
    const qtd = Number(quantidade);
    if (!produto || !Number.isFinite(qtd)) return 0;
    return Number(produto.valor) * qtd;
  }, [produtoId, quantidade, produtos]);

  function registrar(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    startTransition(async () => {
      const res = await registrarVenda(produtoId, Number(quantidade), barbeiroId, clienteId || null);
      if (res.error) {
        setErro(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Registrar venda">
      <form onSubmit={registrar} className="mx-auto max-w-sm space-y-5">
        <Field label="Produto">
          <Select
            value={produtoId}
            onChange={setProdutoId}
            options={[
              { value: "", label: "Selecione o produto" },
              ...produtos.map((p) => ({ value: p.id, label: `${p.nome} · ${formatBRL(p.valor)}` })),
            ]}
          />
        </Field>

        <Field label="Quantidade" htmlFor="v-qtd">
          <Input
            id="v-qtd"
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Field>

        <Field label="Profissional">
          <Select
            value={barbeiroId}
            onChange={setBarbeiroId}
            withAvatar
            options={[
              { value: "", label: "Selecione o profissional" },
              ...barbeiros.map((b) => ({ value: b.id, label: b.nome, avatarUrl: b.fotoUrl })),
            ]}
          />
        </Field>

        <Field label="Cliente (opcional)">
          <Select
            value={clienteId}
            onChange={setClienteId}
            options={[
              { value: "", label: "Sem cliente" },
              ...clientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
        </Field>

        {erro && <FormError>{erro}</FormError>}

        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="text-xs text-muted">Total</p>
            <p className="text-xl font-bold text-brand-light">{formatBRL(total)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !produtoId || !barbeiroId}>
              {pending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
