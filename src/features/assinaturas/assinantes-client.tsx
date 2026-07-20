"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal, DataTableServer, UrlSelect } from "@/components/ui";
import { cn } from "@/lib/cn";
import { excluirAssinatura } from "./actions";
import {
  AssinaturaModal,
  type OpcaoCliente,
  type OpcaoPlano,
} from "./assinatura-modal";

export interface AssinanteRow {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteEmail: string;
  dataInicioISO: string;
  planoId: string;
  planoNome: string;
  status: "ativo" | "inativo";
}

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AssinantesClient({
  assinaturas,
  clientes,
  planos,
  page,
  pageCount,
}: {
  assinaturas: AssinanteRow[];
  clientes: OpcaoCliente[];
  planos: OpcaoPlano[];
  page: number;
  pageCount: number;
}) {
  const [modal, setModal] = useState<{ assinatura: AssinanteRow | null } | null>(null);
  const [excluir, setExcluir] = useState<AssinanteRow | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirAssinatura(id);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<AssinanteRow>[] = [
    {
      accessorKey: "clienteNome",
      header: "Cliente",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.clienteNome}</p>
          <p className="text-sm text-muted">{row.original.clienteEmail}</p>
        </div>
      ),
    },
    {
      accessorKey: "planoNome",
      header: "Plano",
      cell: ({ getValue }) => <span>{String(getValue())}</span>,
    },
    {
      accessorKey: "dataInicioISO",
      header: "Desde",
      cell: ({ getValue }) => (
        <span className="text-muted">{formatData(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "ativo" ? (
          <Badge tone="success">Ativa</Badge>
        ) : (
          <Badge tone="muted">Inativa</Badge>
        ),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ assinatura: a })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Excluir"
              onClick={() => setExcluir(a)}
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
        { value: "todos", label: "Todas" },
        { value: "ativos", label: "Ativas" },
        { value: "inativos", label: "Inativas" },
      ]}
    />
  );

  const acoes = (
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ assinatura: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <>
      <DataTableServer
        columns={columns}
        data={assinaturas}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por cliente..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhuma assinatura cadastrada."
      />

      {modal && (
        <AssinaturaModal
          key={modal.assinatura?.id ?? "novo"}
          assinatura={
            modal.assinatura
              ? {
                  id: modal.assinatura.id,
                  clienteId: modal.assinatura.clienteId,
                  clienteNome: modal.assinatura.clienteNome,
                  planoId: modal.assinatura.planoId,
                  status: modal.assinatura.status,
                }
              : null
          }
          clientes={clientes}
          planos={planos}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir assinatura"
        confirmLabel="Excluir"
        message={
          <>
            Excluir a assinatura de{" "}
            <strong className="text-ink">{excluir?.clienteNome}</strong>?
          </>
        }
      />
    </>
  );
}
