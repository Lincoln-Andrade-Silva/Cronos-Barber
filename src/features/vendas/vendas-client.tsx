"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { Button, ConfirmModal, DataTableServer, UrlSelect } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { excluirVenda } from "./actions";
import { VendaModal, type Opcao, type OpcaoProduto } from "./venda-modal";

export interface VendaRow {
  id: string;
  dataHoraISO: string;
  produtoNome: string;
  quantidade: number;
  valorUnitario: string;
  total: string;
  barbeiroId: string;
  barbeiroNome: string;
  clienteNome: string | null;
}

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink";

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VendasClient({
  vendas,
  page,
  pageCount,
  produtos,
  barbeiros,
  clientes,
}: {
  vendas: VendaRow[];
  page: number;
  pageCount: number;
  produtos: OpcaoProduto[];
  barbeiros: Opcao[];
  clientes: Opcao[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [excluir, setExcluir] = useState<VendaRow | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmarExcluir() {
    if (!excluir) return;
    const id = excluir.id;
    startTransition(async () => {
      await excluirVenda(id);
      setExcluir(null);
    });
  }

  const columns: ColumnDef<VendaRow>[] = [
    {
      accessorKey: "dataHoraISO",
      header: "Data",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-muted">{formatDataHora(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: "produtoNome",
      header: "Produto",
      cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
    },
    { accessorKey: "quantidade", header: "Qtd" },
    {
      accessorKey: "valorUnitario",
      header: "V. unit.",
      cell: ({ getValue }) => <span>{formatBRL(String(getValue()))}</span>,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ getValue }) => (
        <span className="font-semibold text-brand-light">{formatBRL(String(getValue()))}</span>
      ),
    },
    { accessorKey: "barbeiroNome", header: "Profissional" },
    {
      accessorKey: "clienteNome",
      header: "Cliente",
      cell: ({ getValue }) => (
        <span className="text-muted">{(getValue() as string | null) ?? "-"}</span>
      ),
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            type="button"
            title="Excluir"
            onClick={() => setExcluir(row.original)}
            className={cn(iconBtn, "hover:text-red-400")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const filtro = (
    <UrlSelect
      param="prof"
      className="w-40 sm:w-48"
      options={[
        { value: "todos", label: "Todos" },
        ...barbeiros.map((b) => ({ value: b.id, label: b.nome })),
      ]}
    />
  );

  const acoes = (
    <Button className="h-11 w-full sm:w-auto" onClick={() => setModalAberto(true)}>
      <Plus className="h-4 w-4" />
      Registrar venda
    </Button>
  );

  return (
    <>
      <DataTableServer
        columns={columns}
        data={vendas}
        page={page}
        pageCount={pageCount}
        searchPlaceholder="Buscar por produto ou cliente..."
        filter={filtro}
        actions={acoes}
        emptyMessage="Nenhuma venda registrada."
      />

      {modalAberto && (
        <VendaModal
          produtos={produtos}
          barbeiros={barbeiros}
          clientes={clientes}
          onClose={() => setModalAberto(false)}
        />
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={pending}
        title="Excluir venda"
        confirmLabel="Excluir"
        message={
          <>
            Excluir a venda de{" "}
            <strong className="text-ink">{excluir?.produtoNome}</strong>
            {excluir ? ` (${formatBRL(excluir.total)})` : ""}? Essa ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
