"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, Clock, Scissors, Star, User, X } from "lucide-react";
import { Badge, Button, ConfirmModal } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { cancelarAgendamento } from "./actions";

type StatusAg = "agendado" | "finalizado" | "cancelado";

interface AgendamentoItem {
  id: string;
  dataHoraISO: string;
  status: StatusAg;
  tipo: "avulso" | "plano";
  valor: string;
  servicoNome: string;
  barbeiroNome: string;
}

function formatDataHora(iso: string): string {
  const texto = new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return texto.replace(".", "");
}

function StatusBadge({ status }: { status: StatusAg }) {
  if (status === "agendado") return <Badge tone="brand">Agendado</Badge>;
  if (status === "finalizado") return <Badge tone="success">Finalizado</Badge>;
  return <Badge tone="muted">Cancelado</Badge>;
}

function Cartao({
  item,
  onCancelar,
}: {
  item: AgendamentoItem;
  onCancelar?: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <Scissors className="h-4 w-4 shrink-0 text-brand-light" />
            <span className="truncate">{item.servicoNome}</span>
            {item.tipo === "plano" && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-brand-light text-brand-light" />
            )}
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
            <User className="h-3.5 w-3.5" />
            {item.barbeiroNome}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Clock className="h-3.5 w-3.5" />
            <span className="capitalize">{formatDataHora(item.dataHoraISO)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={item.status} />
          {item.tipo === "plano" ? (
            <span className="text-sm font-semibold text-emerald-400">Grátis (plano)</span>
          ) : (
            <span className="text-sm font-semibold text-brand-light">{formatBRL(item.valor)}</span>
          )}
        </div>
      </div>

      {onCancelar && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-red-400"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export function MeusAgendamentos({ items }: { items: AgendamentoItem[] }) {
  const [cancelar, setCancelar] = useState<AgendamentoItem | null>(null);
  const [pending, startTransition] = useTransition();
  const agora = Date.now();

  const proximos = items.filter(
    (i) => i.status === "agendado" && new Date(i.dataHoraISO).getTime() > agora,
  );
  const historico = items.filter((i) => !proximos.includes(i));

  function confirmarCancelamento() {
    if (!cancelar) return;
    const id = cancelar.id;
    startTransition(async () => {
      await cancelarAgendamento(id);
      setCancelar(null);
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-8 text-center">
        <p className="text-sm text-muted">Você ainda não tem agendamentos.</p>
        <Link
          href="/agendar"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-brand transition hover:bg-brand-dark"
        >
          <CalendarPlus className="h-4 w-4" />
          Agendar horário
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted2">Próximos</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-muted">Nenhum agendamento futuro.</p>
        ) : (
          <div className="space-y-3">
            {proximos.map((item) => (
              <Cartao key={item.id} item={item} onCancelar={() => setCancelar(item)} />
            ))}
          </div>
        )}
      </section>

      {historico.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted2">
            Histórico
          </h2>
          <div className="space-y-3">
            {historico.map((item) => (
              <Cartao key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <ConfirmModal
        open={!!cancelar}
        onClose={() => setCancelar(null)}
        onConfirm={confirmarCancelamento}
        loading={pending}
        title="Cancelar agendamento"
        confirmLabel="Cancelar agendamento"
        message={
          <>
            Deseja cancelar o agendamento de{" "}
            <strong className="text-ink">{cancelar?.servicoNome}</strong>
            {cancelar ? ` em ${formatDataHora(cancelar.dataHoraISO)}` : ""}?
          </>
        }
      />
    </div>
  );
}
