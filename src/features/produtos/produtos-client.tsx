"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal, DataTable, Select } from "@/components/ui";
import type { Produto } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { alternarStatusProduto, excluirProduto } from "./actions";
import { ProdutoModal } from "./produto-modal";

type StatusFiltro = "todos" | "ativos" | "inativos";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

export function ProdutosClient({ produtos }: { produtos: Produto[] }) {
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [modal, setModal] = useState<{ produto: Produto | null } | null>(null);
  const [excluir, setExcluir] = useState<Produto | null>(null);
  const [pending, startTransition] = useTransition();

  const dados = produtos.filter((p) =>
    status === "todos"
      ? true
      : status === "ativos"
        ? p.status === "ativo"
        : p.status === "inativo",
  );

  function toggleStatus(p: Produto) {
    startTransition(() => {
      void alternarStatusProduto(p.id, p.status === "ativo" ? "inativo" : "ativo");
    });
  }

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirProduto(id);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<Produto>[] = [
    {
      accessorKey: "nome",
      header: "Produto",
      cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>,
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ getValue }) => <span>{formatBRL(String(getValue()))}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "ativo" ? (
          <Badge tone="success">Ativo</Badge>
        ) : (
          <Badge tone="muted">Inativo</Badge>
        ),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              title="Editar"
              onClick={() => setModal({ produto: p })}
              className={iconBtn}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={p.status === "ativo" ? "Inativar" : "Ativar"}
              onClick={() => toggleStatus(p)}
              className={iconBtn}
            >
              {p.status === "ativo" ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              title="Excluir"
              onClick={() => setExcluir(p)}
              className={cn(iconBtn, "hover:text-red-400")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const filtro = (
    <Select
      value={status}
      onChange={(v) => setStatus(v as StatusFiltro)}
      className="w-36 sm:w-44"
      options={[
        { value: "todos", label: "Todos" },
        { value: "ativos", label: "Ativos" },
        { value: "inativos", label: "Inativos" },
      ]}
    />
  );

  const acoes = (
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ produto: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={dados}
        searchPlaceholder="Buscar por nome..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhum produto cadastrado."
      />

      {modal && (
        <ProdutoModal
          key={modal.produto?.id ?? "novo"}
          produto={modal.produto}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir produto"
        confirmLabel="Excluir"
        message={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-ink">{excluir?.nome}</strong>? Essa ação não pode ser
            desfeita.
          </>
        }
      />
    </>
  );
}
