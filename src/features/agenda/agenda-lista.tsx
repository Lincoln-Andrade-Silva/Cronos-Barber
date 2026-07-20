"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { ConfirmModal } from "@/components/ui";
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
  duracaoMinutos: number;
}

const PX_HORA = 80;

function minutosDoDia(iso: string): number {
  const t = new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const bordaStatus: Record<StatusAg, string> = {
  agendado: "border-line border-l-brand",
  finalizado: "border-line border-l-emerald-500",
  cancelado: "border-red-400/50 border-l-red-400",
};

const acaoBtn =
  "inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-panel text-muted transition disabled:opacity-50";

const TEXTOS: Record<TipoAcao, { titulo: string; verbo: string; label: string }> = {
  finalizar: { titulo: "Finalizar atendimento", verbo: "finalizar", label: "Finalizar" },
  cancelar: { titulo: "Cancelar agendamento", verbo: "cancelar", label: "Cancelar" },
  excluir: { titulo: "Excluir agendamento", verbo: "excluir", label: "Excluir" },
};

export function AgendaLista({ items }: { items: AgendaItem[] }) {
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

  const pendentes = items.filter((i) => i.status === "agendado").length;
  const finalizados = items.filter((i) => i.status === "finalizado").length;
  const cancelados = items.filter((i) => i.status === "cancelado").length;

  const inicios = items.map((i) => minutosDoDia(i.dataHoraISO));
  const fins = items.map((i, idx) => inicios[idx] + i.duracaoMinutos);
  const minInicio = inicios.length ? Math.min(...inicios) : 8 * 60;
  const maxFim = fins.length ? Math.max(...fins) : 19 * 60;
  const inicioGrade = Math.floor(Math.min(8 * 60, minInicio) / 60) * 60;
  const fimGrade = Math.ceil(Math.max(19 * 60, maxFim) / 60) * 60;
  const alturaTotal = ((fimGrade - inicioGrade) / 60) * PX_HORA;

  const linhas: number[] = [];
  for (let m = inicioGrade; m <= fimGrade; m += 60) linhas.push(m);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">{items.length} atend.</span>
        <span className="text-brand-light">{pendentes} pendentes</span>
        <span className="text-emerald-400">{finalizados} finalizados</span>
        <span className="text-muted2">{cancelados} cancelados</span>
      </div>

      <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-line bg-panel">
        <div className="relative" style={{ height: alturaTotal }}>
          {linhas.map((m) => (
            <div
              key={m}
              className="pointer-events-none absolute inset-x-0 flex items-start"
              style={{ top: ((m - inicioGrade) / 60) * PX_HORA }}
            >
              <span className="w-14 shrink-0 -translate-y-2 pl-2 text-[11px] text-muted2">
                {hhmm(m)}
              </span>
              <div className="mt-px flex-1 border-t border-line/70" />
            </div>
          ))}

          {items.length === 0 && (
            <p className="absolute inset-x-0 top-8 text-center text-sm text-muted">
              Nenhum agendamento neste dia.
            </p>
          )}

          {items.map((item) => {
            const inicio = minutosDoDia(item.dataHoraISO);
            const top = ((inicio - inicioGrade) / 60) * PX_HORA;
            const altura = Math.max((item.duracaoMinutos / 60) * PX_HORA, 36);
            return (
              <div
                key={item.id}
                className={cn(
                  "absolute left-14 right-2 overflow-hidden rounded-lg border border-l-4 bg-surface px-2 py-1.5",
                  bordaStatus[item.status],
                )}
                style={{ top: top + 2, height: altura - 4 }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{item.clienteNome}</p>
                    <p className="truncate text-[11px] text-muted">
                      {hhmm(inicio)}-{hhmm(inicio + item.duracaoMinutos)} · {item.servicoNome}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.status === "agendado" && (
                      <>
                        <button
                          type="button"
                          title="Finalizar"
                          disabled={pending}
                          onClick={() => setAcao({ item, tipo: "finalizar" })}
                          className={cn(acaoBtn, "hover:border-emerald-500/40 hover:text-emerald-400")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Cancelar"
                          disabled={pending}
                          onClick={() => setAcao({ item, tipo: "cancelar" })}
                          className={cn(acaoBtn, "hover:border-amber-500/40 hover:text-amber-400")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      title="Excluir"
                      disabled={pending}
                      onClick={() => setAcao({ item, tipo: "excluir" })}
                      className={cn(acaoBtn, "hover:border-red-400 hover:text-red-400")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
              {acao.item.servicoNome}, {formatBRL(acao.item.valor)})?
            </>
          ) : null
        }
      />
    </div>
  );
}
