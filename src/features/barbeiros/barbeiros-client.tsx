"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal, DataTableServer, UrlSelect } from "@/components/ui";
import type { Barbeiro } from "@/db/schema";
import { cn } from "@/lib/cn";
import { alternarAtivoBarbeiro, excluirBarbeiro } from "./actions";
import { BarbeiroModal } from "./barbeiro-modal";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

export function BarbeirosClient({
  barbeiros,
  page,
  pageCount,
}: {
  barbeiros: Barbeiro[];
  page: number;
  pageCount: number;
}) {
  const [modal, setModal] = useState<{ barbeiro: Barbeiro | null } | null>(null);
  const [excluir, setExcluir] = useState<Barbeiro | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleAtivo(b: Barbeiro) {
    startTransition(() => {
      void alternarAtivoBarbeiro(b.id, !b.ativo);
    });
  }

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirBarbeiro(id);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<Barbeiro>[] = [
    {
      accessorKey: "nome",
      header: "Barbeiro",
      cell: ({ row }) => {
        const b = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-xs font-semibold text-muted2">
              {b.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.fotoUrl} alt={b.nome} className="h-full w-full object-cover" />
              ) : (
                b.nome.charAt(0).toUpperCase()
              )}
            </div>
            <span className="font-medium">{b.nome}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "comissaoPercentual",
      header: "Comissão",
      cell: ({ getValue }) => <span className="text-muted">{Number(getValue())}%</span>,
    },
    {
      accessorKey: "ativo",
      header: "Status",
      cell: ({ row }) =>
        row.original.ativo ? (
          <Badge tone="success">Ativo</Badge>
        ) : (
          <Badge tone="muted">Inativo</Badge>
        ),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => {
        const b = row.original;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ barbeiro: b })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={b.ativo ? "Desativar" : "Ativar"}
              onClick={() => toggleAtivo(b)}
              className={iconBtn}
            >
              {b.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title="Excluir"
              onClick={() => setExcluir(b)}
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
        { value: "ativos", label: "Ativos" },
        { value: "inativos", label: "Inativos" },
      ]}
    />
  );

  const acoes = (
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ barbeiro: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <>
      <DataTableServer
        columns={columns}
        data={barbeiros}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por nome..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhum barbeiro cadastrado."
      />

      {modal && (
        <BarbeiroModal
          key={modal.barbeiro?.id ?? "novo"}
          barbeiro={modal.barbeiro}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir barbeiro"
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
