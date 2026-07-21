"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmModal,
  DataTableServer,
  FormError,
  UrlSelect,
} from "@/components/ui";
import type { Servico } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { excluirPlano } from "./actions";
import { PlanoModal, type PlanoComServicos } from "./plano-modal";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

export function PlanosClient({
  planos,
  servicos,
  page,
  pageCount,
}: {
  planos: PlanoComServicos[];
  servicos: Servico[];
  page: number;
  pageCount: number;
}) {
  const [modal, setModal] = useState<{ plano: PlanoComServicos | null } | null>(null);
  const [excluir, setExcluir] = useState<PlanoComServicos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    setErro(null);
    startTransition(async () => {
      const res = await excluirPlano(id);
      if (res.error) setErro(res.error);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<PlanoComServicos>[] = [
    {
      accessorKey: "nome",
      header: "Plano",
      cell: ({ row }) => <span className="font-medium">{row.original.nome}</span>,
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ getValue }) => <span>{formatBRL(String(getValue()))}</span>,
    },
    {
      id: "cobranca",
      header: "Cobrança",
      cell: () => <span className="text-muted">Mensal</span>,
    },
    {
      id: "servicos",
      header: "Serviços",
      cell: ({ row }) => <span className="text-muted">{row.original.servicos.length}</span>,
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
        const p = row.original;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ plano: p })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
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
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ plano: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <div className="space-y-4">
      {erro && <FormError>{erro}</FormError>}

      <DataTableServer
        columns={columns}
        data={planos}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por nome..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhum plano cadastrado."
      />

      {modal && (
        <PlanoModal
          key={modal.plano?.id ?? "novo"}
          plano={modal.plano}
          servicos={servicos}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir plano"
        confirmLabel="Excluir"
        message={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-ink">{excluir?.nome}</strong>? Essa ação não pode ser
            desfeita.
          </>
        }
      />
    </div>
  );
}
