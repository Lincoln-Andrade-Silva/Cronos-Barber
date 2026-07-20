"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal, DataTableServer, UrlSelect } from "@/components/ui";
import type { Servico } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL, formatDuracao } from "@/lib/format";
import { excluirServico } from "./actions";
import { ServicoModal } from "./servico-modal";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

export function ServicosClient({
  servicos,
  page,
  pageCount,
}: {
  servicos: Servico[];
  page: number;
  pageCount: number;
}) {
  const [modal, setModal] = useState<{ servico: Servico | null } | null>(null);
  const [excluir, setExcluir] = useState<Servico | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirServico(id);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<Servico>[] = [
    {
      accessorKey: "nome",
      header: "Serviço",
      cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>,
    },
    {
      accessorKey: "duracaoMinutos",
      header: "Duração",
      cell: ({ getValue }) => (
        <span className="text-muted">{formatDuracao(Number(getValue()))}</span>
      ),
    },
    {
      accessorKey: "preco",
      header: "Preço",
      cell: ({ getValue }) => <span>{formatBRL(String(getValue()))}</span>,
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
        const s = row.original;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ servico: s })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Excluir"
              onClick={() => setExcluir(s)}
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
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ servico: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <>
      <DataTableServer
        columns={columns}
        data={servicos}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por nome..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhum serviço cadastrado."
      />

      {modal && (
        <ServicoModal
          key={modal.servico?.id ?? "novo"}
          servico={modal.servico}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir serviço"
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
