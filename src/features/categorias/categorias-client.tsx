"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal, DataTableServer, UrlSelect } from "@/components/ui";
import type { Categoria } from "@/db/schema";
import { cn } from "@/lib/cn";
import { alternarStatusCategoria, excluirCategoria } from "./actions";
import { CategoriaModal } from "./categoria-modal";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

export function CategoriasClient({
  categorias,
  page,
  pageCount,
}: {
  categorias: Categoria[];
  page: number;
  pageCount: number;
}) {
  const [modal, setModal] = useState<{ categoria: Categoria | null } | null>(null);
  const [excluir, setExcluir] = useState<Categoria | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleStatus(c: Categoria) {
    startTransition(() => {
      void alternarStatusCategoria(c.id, !c.ativo);
    });
  }

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirCategoria(id);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<Categoria>[] = [
    {
      accessorKey: "nome",
      header: "Categoria",
      cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>,
    },
    {
      accessorKey: "ordem",
      header: "Ordem",
      cell: ({ getValue }) => <span className="text-muted">{String(getValue())}</span>,
    },
    {
      accessorKey: "ativo",
      header: "Status",
      cell: ({ row }) =>
        row.original.ativo ? (
          <Badge tone="success">Ativa</Badge>
        ) : (
          <Badge tone="muted">Inativa</Badge>
        ),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ categoria: c })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={c.ativo ? "Inativar" : "Ativar"}
              onClick={() => toggleStatus(c)}
              className={iconBtn}
            >
              {c.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title="Excluir"
              onClick={() => setExcluir(c)}
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
    <UrlSelect
      param="status"
      className="w-36 sm:w-44"
      options={[
        { value: "todos", label: "Todos" },
        { value: "ativos", label: "Ativas" },
        { value: "inativos", label: "Inativas" },
      ]}
    />
  );

  const acoes = (
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ categoria: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <>
      <DataTableServer
        columns={columns}
        data={categorias}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por nome..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhuma categoria cadastrada."
      />

      {modal && (
        <CategoriaModal
          key={modal.categoria?.id ?? "novo"}
          categoria={modal.categoria}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir categoria"
        confirmLabel="Excluir"
        message={
          <>
            Excluir <strong className="text-ink">{excluir?.nome}</strong>? Os serviços dela ficam sem
            categoria (grupo &quot;Outros&quot;). Essa ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
