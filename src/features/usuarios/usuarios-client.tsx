"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { Badge, Button, DataTableServer, UrlSelect } from "@/components/ui";
import { alternarStatusUsuario } from "./actions";
import { UsuarioModal } from "./usuario-modal";

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  tipo: "admin" | "cliente";
  status: "ativo" | "inativo";
}

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

export function UsuariosClient({
  usuarios,
  usuarioAtualId,
  page,
  pageCount,
}: {
  usuarios: UsuarioRow[];
  usuarioAtualId: string;
  page: number;
  pageCount: number;
}) {
  const [modal, setModal] = useState<{ usuario: UsuarioRow | null } | null>(null);
  const [, startTransition] = useTransition();

  function toggleStatus(u: UsuarioRow) {
    startTransition(() => {
      void alternarStatusUsuario(u.id, u.status === "ativo" ? "inativo" : "ativo");
    });
  }

  const columns: ColumnDef<UsuarioRow>[] = [
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block font-medium">{row.original.nome}</span>
          <span className="block truncate text-xs text-muted">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "telefone",
      header: "Telefone",
      cell: ({ getValue }) => <span className="text-muted">{(getValue() as string) || "-"}</span>,
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) =>
        row.original.tipo === "admin" ? (
          <Badge tone="brand">Admin</Badge>
        ) : (
          <Badge tone="muted">Cliente</Badge>
        ),
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
        const u = row.original;
        const ehVoce = u.id === usuarioAtualId;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ usuario: u })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={ehVoce ? "Você não pode inativar a si mesmo" : u.status === "ativo" ? "Inativar" : "Ativar"}
              disabled={ehVoce}
              onClick={() => toggleStatus(u)}
              className={iconBtn}
            >
              {u.status === "ativo" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
        { value: "ativos", label: "Ativo" },
        { value: "inativos", label: "Inativo" },
      ]}
    />
  );

  const acoes = (
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModal({ usuario: null })}>
      <Plus className="h-4 w-4" />
      Adicionar
    </Button>
  );

  return (
    <>
      <DataTableServer
        columns={columns}
        data={usuarios}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por nome ou email..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhum usuário encontrado."
      />

      {modal && (
        <UsuarioModal
          key={modal.usuario?.id ?? "novo"}
          usuario={modal.usuario}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
