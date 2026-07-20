"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { Badge, Card, ConfirmModal, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import {
  cancelarAgendamentoAdmin,
  excluirAgendamento,
  finalizarAgendamento,
} from "./actions";

type StatusAg = "agendado" | "finalizado" | "cancelado";
type TipoAcao = "finalizar" | "cancelar" | "excluir";

export interface AgendaItem {
  id: string;
  dataHoraISO: string;
  status: StatusAg;
  valor: string;
  clienteNome: string;
  barbeiroId: string;
  servicoNome: string;
}

export interface BarbeiroOpcao {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: StatusAg }) {
  if (status === "finalizado") return <Badge tone="success">Finalizado</Badge>;
  if (status === "cancelado") return <Badge tone="muted">Cancelado</Badge>;
  return <Badge tone="brand">Agendado</Badge>;
}

const btn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition disabled:opacity-50";

function Acoes({
  item,
  disabled,
  onAcao,
}: {
  item: AgendaItem;
  disabled: boolean;
  onAcao: (tipo: TipoAcao) => void;
}) {
  return (
    <div className="flex gap-1">
      {item.status === "agendado" && (
        <>
          <button
            type="button"
            title="Finalizar"
            disabled={disabled}
            onClick={() => onAcao("finalizar")}
            className={cn(btn, "hover:border-emerald-500/40 hover:text-emerald-400")}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Cancelar"
            disabled={disabled}
            onClick={() => onAcao("cancelar")}
            className={cn(btn, "hover:border-amber-500/40 hover:text-amber-400")}
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}
      <button
        type="button"
        title="Excluir"
        disabled={disabled}
        onClick={() => onAcao("excluir")}
        className={cn(btn, "hover:border-red-400 hover:text-red-400")}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

const TEXTOS: Record<TipoAcao, { titulo: string; verbo: string; label: string }> = {
  finalizar: { titulo: "Finalizar atendimento", verbo: "finalizar", label: "Finalizar" },
  cancelar: { titulo: "Cancelar agendamento", verbo: "cancelar", label: "Cancelar" },
  excluir: { titulo: "Excluir agendamento", verbo: "excluir", label: "Excluir" },
};

export function AgendaLista({
  items,
  barbeiros,
}: {
  items: AgendaItem[];
  barbeiros: BarbeiroOpcao[];
}) {
  const [barbeiroId, setBarbeiroId] = useState(barbeiros[0]?.id ?? "");
  const [acao, setAcao] = useState<{ item: AgendaItem; tipo: TipoAcao } | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!acao) return;
    const { item, tipo } = acao;
    startTransition(async () => {
      if (tipo === "finalizar") await finalizarAgendamento(item.id);
      else if (tipo === "cancelar") await cancelarAgendamentoAdmin(item.id);
      else await excluirAgendamento(item.id);
      setAcao(null);
    });
  }

  const textos = acao ? TEXTOS[acao.tipo] : null;

  if (barbeiros.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">Cadastre um barbeiro para ver a agenda.</p>
      </Card>
    );
  }

  const barbeiro = barbeiros.find((b) => b.id === barbeiroId) ?? barbeiros[0];
  const doDia = items.filter((i) => i.barbeiroId === barbeiro.id);
  const pendentes = doDia.filter((i) => i.status === "agendado").length;
  const finalizados = doDia.filter((i) => i.status === "finalizado").length;
  const cancelados = doDia.filter((i) => i.status === "cancelado").length;

  return (
    <div className="space-y-4">
      <Select
        value={barbeiro.id}
        onChange={setBarbeiroId}
        className="w-full sm:w-64"
        options={barbeiros.map((b) => ({ value: b.id, label: b.nome }))}
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {barbeiro.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={barbeiro.fotoUrl}
                alt={barbeiro.nome}
                className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {barbeiro.nome.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-semibold">{barbeiro.nome}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[11px]">
            <span className="text-brand-light">{pendentes} pend.</span>
            <span className="text-emerald-400">{finalizados} finaliz.</span>
            <span className="text-muted2">{cancelados} canc.</span>
          </div>
        </div>

        {doDia.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nenhum agendamento neste dia.
          </p>
        ) : (
          <div className="space-y-2 p-3">
            {doDia.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-line p-3 transition",
                  item.status === "cancelado" && "opacity-55",
                )}
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="font-bold tabular-nums">{hora(item.dataHoraISO)}</p>
                </div>
                <div className="min-w-0 flex-1 border-l border-line pl-3">
                  <p className="truncate text-sm font-medium">{item.clienteNome}</p>
                  <p className="truncate text-xs text-muted">
                    {item.servicoNome} · {formatBRL(item.valor)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={item.status} />
                  <Acoes
                    item={item}
                    disabled={pending}
                    onAcao={(t) => setAcao({ item, tipo: t })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!acao}
        onClose={() => setAcao(null)}
        onConfirm={confirmar}
        loading={pending}
        title={textos?.titulo ?? ""}
        confirmLabel={textos?.label ?? "Confirmar"}
        message={
          acao ? (
            <>
              Deseja {textos?.verbo} o atendimento de{" "}
              <strong className="text-ink">{acao.item.clienteNome}</strong> (
              {acao.item.servicoNome})?
            </>
          ) : null
        }
      />
    </div>
  );
}
