"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy } from "lucide-react";
import { Button, FormError, FormSuccess, Input, Toggle } from "@/components/ui";
import type { Expediente } from "@/db/schema";
import { cn } from "@/lib/cn";
import { DIAS_SEMANA } from "@/features/estabelecimento/horario";
import { salvarExpediente, type DiaExpediente, type ExpedienteFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar expediente"}
    </Button>
  );
}

function construirModelo(rows: Expediente[]): DiaExpediente[] {
  return DIAS_SEMANA.map(({ dia }) => {
    const r = rows.find((x) => x.diaSemana === dia);
    return {
      diaSemana: dia,
      trabalha: Boolean(r),
      horaInicio: r?.horaInicio ?? "09:00",
      horaFim: r?.horaFim ?? "19:00",
      almocoInicio: r?.almocoInicio ?? "",
      almocoFim: r?.almocoFim ?? "",
    };
  });
}

export function ExpedienteForm({
  barbeiroId,
  rows,
}: {
  barbeiroId: string;
  rows: Expediente[];
}) {
  const [state, formAction] = useFormState<ExpedienteFormState, FormData>(salvarExpediente, {});
  const [dias, setDias] = useState<DiaExpediente[]>(() => construirModelo(rows));

  function update(diaSemana: number, patch: Partial<DiaExpediente>) {
    setDias((atual) => atual.map((d) => (d.diaSemana === diaSemana ? { ...d, ...patch } : d)));
  }

  function aplicarPrimeiroDia() {
    const base = dias.find((d) => d.trabalha);
    if (!base) return;
    setDias((atual) =>
      atual.map((d) =>
        d.trabalha
          ? {
              ...d,
              horaInicio: base.horaInicio,
              horaFim: base.horaFim,
              almocoInicio: base.almocoInicio,
              almocoFim: base.almocoFim,
            }
          : d,
      ),
    );
  }

  const algumTrabalha = dias.some((d) => d.trabalha);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="barbeiroId" value={barbeiroId} />
      <input type="hidden" name="expediente" value={JSON.stringify(dias)} />

      {algumTrabalha && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={aplicarPrimeiroDia}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand/40 hover:text-brand-light"
          >
            <Copy className="h-3.5 w-3.5" />
            Aplicar 1º dia aos demais
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {DIAS_SEMANA.map(({ dia, label }) => {
          const item = dias.find((d) => d.diaSemana === dia);
          if (!item) return null;
          const abrev = label.slice(0, 3);
          return (
            <div
              key={dia}
              className={cn(
                "overflow-hidden rounded-xl border transition",
                item.trabalha ? "border-line bg-panel" : "border-line/60 bg-panel/40",
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase",
                      item.trabalha ? "bg-brand/15 text-brand-light" : "bg-surface text-muted2",
                    )}
                  >
                    {abrev}
                  </span>
                  <span className={cn("text-sm font-semibold", !item.trabalha && "text-muted2")}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-medium text-muted2">
                    {item.trabalha ? "Trabalha" : "Folga"}
                  </span>
                  <Toggle on={item.trabalha} onClick={() => update(dia, { trabalha: !item.trabalha })} />
                </div>
              </div>

              {item.trabalha && (
                <div className="grid gap-4 border-t border-line bg-surface/20 px-4 py-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted2">
                      Expediente
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={item.horaInicio}
                        onChange={(e) => update(dia, { horaInicio: e.target.value })}
                        className="min-w-0 flex-1 py-2"
                      />
                      <span className="shrink-0 text-sm text-muted">às</span>
                      <Input
                        type="time"
                        value={item.horaFim}
                        onChange={(e) => update(dia, { horaFim: e.target.value })}
                        className="min-w-0 flex-1 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted2">
                      Almoço <span className="normal-case text-muted2/70">(opcional)</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={item.almocoInicio}
                        onChange={(e) => update(dia, { almocoInicio: e.target.value })}
                        className="min-w-0 flex-1 py-2"
                      />
                      <span className="shrink-0 text-sm text-muted">às</span>
                      <Input
                        type="time"
                        value={item.almocoFim}
                        onChange={(e) => update(dia, { almocoFim: e.target.value })}
                        className="min-w-0 flex-1 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {state.error && <FormError>{state.error}</FormError>}
      {state.ok && <FormSuccess>Expediente salvo com sucesso.</FormSuccess>}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
