"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button, Field, FormError, Modal, Segmented, Select, Toggle } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL, formatDuracao } from "@/lib/format";
import { METODO_OPCOES, type MetodoPagamento } from "@/lib/metodo-pagamento";
import { finalizarAtendimento, getCoberturaBloco } from "./actions";

export interface ServicoOpcao {
  id: string;
  nome: string;
  preco: string;
  duracaoMinutos: number;
}
export interface ProdutoOpcao {
  id: string;
  nome: string;
  valor: string;
}
export interface FinalizarBloco {
  id: string;
  clienteNome: string;
  valorTotal: number;
  servicos: { nome: string; valor: string }[];
}

interface ItemProduto {
  produtoId: string;
  quantidade: number;
}

const stepBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40";

export function FinalizarModal({
  bloco,
  servicos,
  produtos,
  onClose,
  onFinalizado,
}: {
  bloco: FinalizarBloco;
  servicos: ServicoOpcao[];
  produtos: ProdutoOpcao[];
  onClose: () => void;
  onFinalizado: () => void;
}) {
  const [servicoIdsExtras, setServicoIdsExtras] = useState<string[]>([]);
  const [itens, setItens] = useState<ItemProduto[]>([]);
  const [cobertos, setCobertos] = useState<Set<string>>(new Set());
  const [metodo, setMetodo] = useState<MetodoPagamento>("dinheiro");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Cobertura do plano do cliente para os serviços (grátis quando incluso no plano no dia).
  useEffect(() => {
    let ativo = true;
    void getCoberturaBloco(
      bloco.id,
      servicos.map((s) => s.id),
    ).then((ids) => {
      if (ativo) setCobertos(new Set(ids));
    });
    return () => {
      ativo = false;
    };
  }, [bloco.id, servicos]);

  function toggleServico(id: string) {
    setServicoIdsExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function adicionarProduto(id: string) {
    if (!id) return;
    setItens((prev) =>
      prev.some((i) => i.produtoId === id) ? prev : [...prev, { produtoId: id, quantidade: 1 }],
    );
  }

  function alterarQtd(produtoId: string, delta: number) {
    setItens((prev) =>
      prev.map((i) =>
        i.produtoId === produtoId ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i,
      ),
    );
  }

  function removerProduto(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  const extrasSelecionados = servicoIdsExtras
    .map((id) => servicos.find((s) => s.id === id))
    .filter((s): s is ServicoOpcao => Boolean(s));
  const totalExtras = extrasSelecionados.reduce(
    (s, x) => s + (cobertos.has(x.id) ? 0 : Number(x.preco)),
    0,
  );
  const totalProdutos = useMemo(
    () =>
      itens.reduce((soma, i) => {
        const p = produtos.find((x) => x.id === i.produtoId);
        return soma + (p ? Number(p.valor) * i.quantidade : 0);
      }, 0),
    [itens, produtos],
  );
  const totalGeral = bloco.valorTotal + totalExtras + totalProdutos;

  const produtosDisponiveis = produtos.filter((p) => !itens.some((i) => i.produtoId === p.id));

  function finalizar() {
    setErro(null);
    startTransition(async () => {
      const res = await finalizarAtendimento({
        id: bloco.id,
        metodoPagamento: metodo,
        servicoIdsExtras,
        produtos: itens,
      });
      if (res.error) {
        setErro(res.error);
        return;
      }
      onFinalizado();
    });
  }

  return (
    <Modal open onClose={onClose} title="Finalizar atendimento">
      <div className="mx-auto max-w-sm space-y-5">
        <div className="rounded-lg border border-line bg-surface/30 p-3">
          <p className="text-sm font-semibold">{bloco.clienteNome}</p>
          {bloco.servicos.map((s, i) => (
            <p key={i} className="text-xs text-muted">
              {s.nome} ·{" "}
              {Number(s.valor) > 0 ? (
                formatBRL(s.valor)
              ) : (
                <span className="text-brand-light">Incluso no plano</span>
              )}
            </p>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Serviços extras
          </p>
          {servicos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="max-h-44 space-y-2 overflow-y-auto pr-0.5">
              {servicos.map((s) => {
                const sel = servicoIdsExtras.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-lg border p-3 transition",
                      sel ? "border-brand/40 bg-surface" : "border-line",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Toggle on={sel} onClick={() => toggleServico(s.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.nome}</p>
                        <p className="truncate text-xs text-muted">
                          {formatDuracao(s.duracaoMinutos)} ·{" "}
                          {cobertos.has(s.id) ? (
                            <span className="text-brand-light">Incluso no plano</span>
                          ) : (
                            formatBRL(s.preco)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Produtos</p>
          <Select
            value=""
            onChange={adicionarProduto}
            options={[
              {
                value: "",
                label: produtosDisponiveis.length ? "Adicionar produto..." : "Nenhum produto disponível",
              },
              ...produtosDisponiveis.map((p) => ({
                value: p.id,
                label: `${p.nome} · ${formatBRL(p.valor)}`,
              })),
            ]}
          />
          {itens.length > 0 && (
            <ul className="mt-2 space-y-2">
              {itens.map((i) => {
                const p = produtos.find((x) => x.id === i.produtoId);
                if (!p) return null;
                return (
                  <li
                    key={i.produtoId}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-muted">{formatBRL(Number(p.valor) * i.quantidade)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => alterarQtd(i.produtoId, -1)}
                        disabled={i.quantidade <= 1}
                        className={stepBtn}
                        title="Diminuir"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {i.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarQtd(i.produtoId, 1)}
                        className={stepBtn}
                        title="Aumentar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerProduto(i.produtoId)}
                        className="ml-0.5 text-muted transition hover:text-red-400"
                        title="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Field label="Método de pagamento">
          <Segmented options={METODO_OPCOES} value={metodo} onChange={setMetodo} />
        </Field>

        {erro && <FormError>{erro}</FormError>}

        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="text-xs text-muted">Total</p>
            <p className="text-xl font-bold text-brand-light">{formatBRL(totalGeral)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending} onClick={finalizar}>
              {pending ? "Finalizando..." : "Finalizar"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
