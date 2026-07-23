"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { rotuloCategoria, type TipoMovimentacao } from "./categorias";
import { excluirMovimentacao } from "./actions";
import { MovimentacaoModal, type MovimentacaoEditavel } from "./movimentacao-modal";

export interface MovimentacaoRow {
  id: string;
  tipo: TipoMovimentacao;
  categoria: string;
  descricao: string;
  valor: string;
  dataISO: string;
  criadoPorNome: string | null;
}

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function paraEditavel(m: MovimentacaoRow): MovimentacaoEditavel {
  return {
    id: m.id,
    tipo: m.tipo,
    categoria: m.categoria,
    descricao: m.descricao,
    valor: m.valor,
    dataYmd: new Date(m.dataISO).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
  };
}

export function MovimentacoesClient({ movimentacoes }: { movimentacoes: MovimentacaoRow[] }) {
  const [modal, setModal] = useState<{ mov: MovimentacaoRow | null } | null>(null);
  const [excluir, setExcluir] = useState<MovimentacaoRow | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarExclusao() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirMovimentacao(id);
      setExcluir(null);
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-panel">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted2">Lançamentos manuais</h3>
        <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ mov: null })}>
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </div>

      {movimentacoes.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Nenhum lançamento manual no período.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {movimentacoes.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{m.descricao}</span>
                  <Badge tone={m.tipo === "entrada" ? "success" : "danger"}>
                    {rotuloCategoria(m.categoria)}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  {formatData(m.dataISO)}
                  {m.criadoPorNome ? ` · ${m.criadoPorNome}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-bold tabular-nums",
                  m.tipo === "entrada" ? "text-emerald-400" : "text-red-400",
                )}
              >
                {m.tipo === "entrada" ? "+" : "−"} {formatBRL(m.valor)}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => setModal({ mov: m })}
                  className={iconBtn}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Excluir"
                  onClick={() => setExcluir(m)}
                  className={cn(iconBtn, "hover:text-red-400")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <MovimentacaoModal
          key={modal.mov?.id ?? "novo"}
          movimentacao={modal.mov ? paraEditavel(modal.mov) : null}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExclusao}
        loading={pending}
        title="Excluir lançamento"
        confirmLabel="Excluir"
        message={
          <>
            Excluir o lançamento <strong className="text-ink">{excluir?.descricao}</strong>
            {excluir ? ` (${formatBRL(excluir.valor)})` : ""}? Essa ação não pode ser desfeita.
          </>
        }
      />
    </div>
  );
}
