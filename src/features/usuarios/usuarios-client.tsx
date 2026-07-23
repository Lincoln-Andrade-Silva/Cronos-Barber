"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Ban, History, Pencil, Plus, Power, PowerOff, ShieldCheck, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmModal, DataTableServer, UrlSelect } from "@/components/ui";
import { cn } from "@/lib/cn";
import { estadoBloqueio } from "@/lib/bloqueio";
import { formatFrequencia, formatRecencia } from "@/lib/frequencia";
import { alternarStatusUsuario, desbloquearUsuario, excluirUsuario } from "./actions";
import { UsuarioModal } from "./usuario-modal";
import { BloqueioModal } from "./bloqueio-modal";
import { HistoricoModal } from "./historico-modal";

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  tipo: "admin" | "cliente";
  status: "ativo" | "inativo";
  bloqueadoEm: string | null;
  bloqueioDias: number | null;
  bloqueioMotivo: string | null;
  frequenciaDias: number | null;
  diasSemRetornar: number | null;
}

function bloqueioDaRow(u: UsuarioRow) {
  return estadoBloqueio({
    bloqueadoEm: u.bloqueadoEm ? new Date(u.bloqueadoEm) : null,
    bloqueioDias: u.bloqueioDias,
    bloqueioMotivo: u.bloqueioMotivo,
  });
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
  const [excluir, setExcluir] = useState<UsuarioRow | null>(null);
  const [bloquear, setBloquear] = useState<UsuarioRow | null>(null);
  const [desbloquear, setDesbloquear] = useState<UsuarioRow | null>(null);
  const [historico, setHistorico] = useState<UsuarioRow | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleStatus(u: UsuarioRow) {
    startTransition(() => {
      void alternarStatusUsuario(u.id, u.status === "ativo" ? "inativo" : "ativo");
    });
  }

  function confirmarDesbloqueio() {
    if (!desbloquear) return;
    const id = desbloquear.id;
    startTransition(async () => {
      await desbloquearUsuario(id);
      setDesbloquear(null);
    });
  }

  function confirmarExclusao() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirUsuario(id);
      setExcluir(null);
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
      accessorKey: "frequenciaDias",
      header: "Frequência",
      cell: ({ row }) =>
        row.original.tipo === "cliente" ? (
          <span className="whitespace-nowrap text-muted">
            {formatFrequencia(row.original.frequenciaDias)}
          </span>
        ) : (
          <span className="text-muted2">—</span>
        ),
    },
    {
      accessorKey: "diasSemRetornar",
      header: "Sem retornar",
      cell: ({ row }) =>
        row.original.tipo === "cliente" ? (
          <span className="whitespace-nowrap text-muted">
            {formatRecencia(row.original.diasSemRetornar)}
          </span>
        ) : (
          <span className="text-muted2">—</span>
        ),
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
      cell: ({ row }) => {
        const bloqueio = bloqueioDaRow(row.original);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {row.original.status === "ativo" ? (
              <Badge tone="success">Ativo</Badge>
            ) : (
              <Badge tone="muted">Inativo</Badge>
            )}
            {bloqueio.ativo && (
              <Badge tone="danger">
                {bloqueio.ate ? `Bloqueado até ${bloqueio.ate.toLocaleDateString("pt-BR")}` : "Bloqueado"}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => {
        const u = row.original;
        const ehVoce = u.id === usuarioAtualId;
        const bloqueado = bloqueioDaRow(u).ativo;
        return (
          <div className="flex justify-end gap-1">
            <button type="button" title="Editar" onClick={() => setModal({ usuario: u })} className={iconBtn}>
              <Pencil className="h-4 w-4" />
            </button>
            {u.tipo === "cliente" && (
              <button
                type="button"
                title="Histórico de bloqueios"
                onClick={() => setHistorico(u)}
                className={iconBtn}
              >
                <History className="h-4 w-4" />
              </button>
            )}
            {u.tipo === "cliente" &&
              !ehVoce &&
              (bloqueado ? (
                <button
                  type="button"
                  title="Desbloquear"
                  onClick={() => setDesbloquear(u)}
                  className={cn(iconBtn, "hover:text-emerald-400")}
                >
                  <ShieldCheck className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  title="Bloquear"
                  onClick={() => setBloquear(u)}
                  className={cn(iconBtn, "hover:text-red-400")}
                >
                  <Ban className="h-4 w-4" />
                </button>
              ))}
            <button
              type="button"
              title={ehVoce ? "Você não pode inativar a si mesmo" : u.status === "ativo" ? "Inativar" : "Ativar"}
              disabled={ehVoce}
              onClick={() => toggleStatus(u)}
              className={iconBtn}
            >
              {u.status === "ativo" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title={ehVoce ? "Você não pode excluir a si mesmo" : "Excluir"}
              disabled={ehVoce}
              onClick={() => setExcluir(u)}
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

      {bloquear && (
        <BloqueioModal
          key={bloquear.id}
          usuario={bloquear}
          onClose={() => setBloquear(null)}
        />
      )}

      {historico && (
        <HistoricoModal
          key={historico.id}
          usuario={historico}
          onClose={() => setHistorico(null)}
        />
      )}

      <ConfirmModal
        open={!!desbloquear}
        onClose={() => setDesbloquear(null)}
        onConfirm={confirmarDesbloqueio}
        loading={pending}
        title="Desbloquear usuário"
        confirmLabel="Desbloquear"
        message={
          <>
            Remover o bloqueio de <strong className="text-ink">{desbloquear?.nome}</strong>? Ele
            volta a poder agendar serviços e contratar planos.
          </>
        }
      />

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExclusao}
        loading={pending}
        title="Excluir usuário"
        confirmLabel="Excluir"
        message={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-ink">{excluir?.nome}</strong>? Essa ação remove o acesso e não
            pode ser desfeita.
          </>
        }
      />
    </>
  );
}
