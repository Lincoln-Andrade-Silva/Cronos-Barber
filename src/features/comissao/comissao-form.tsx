"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Button, Card, FormError, FormSuccess } from "@/components/ui";
import type { Barbeiro } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { salvarComissoes, type ComissaoFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar comissão"}
    </Button>
  );
}

export function ComissaoForm({ barbeiros }: { barbeiros: Barbeiro[] }) {
  const [state, formAction] = useFormState<ComissaoFormState, FormData>(salvarComissoes, {});
  const [valores, setValores] = useState<Record<string, number>>(
    Object.fromEntries(barbeiros.map((b) => [b.id, Math.round(Number(b.comissaoPercentual))])),
  );
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) setAberto(null);
  }, [state.ok]);

  if (barbeiros.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">Cadastre um barbeiro para definir a comissão.</p>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        {barbeiros.map((b) => {
          const pct = valores[b.id] ?? 0;
          const expandido = aberto === b.id;
          return (
            <div key={b.id} className="overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : b.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface/40"
              >
                {b.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.fotoUrl}
                    alt={b.nome}
                    className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {b.nome.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{b.nome}</span>
                <span className="rounded-lg bg-brand/10 px-2.5 py-1 text-sm font-bold text-brand-light">
                  {pct}%
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted transition", expandido && "rotate-180")}
                />
              </button>

              {expandido ? (
                <div className="space-y-4 border-t border-line px-4 py-4">
                  <div>
                    <input
                      type="range"
                      name={`comissao_${b.id}`}
                      min={0}
                      max={100}
                      step={1}
                      value={pct}
                      onChange={(e) =>
                        setValores((v) => ({ ...v, [b.id]: Number(e.target.value) }))
                      }
                      className="w-full accent-brand"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted2">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
                    Com <span className="font-semibold text-ink">{pct}%</span> de comissão, um
                    atendimento de {formatBRL(100)} gera{" "}
                    <span className="font-semibold text-brand-light">{formatBRL(pct)}</span> para o
                    profissional.
                  </div>
                </div>
              ) : (
                <input type="hidden" name={`comissao_${b.id}`} value={pct} />
              )}
            </div>
          );
        })}
      </div>

      {state.error && <FormError>{state.error}</FormError>}
      {state.ok && <FormSuccess>Comissões salvas com sucesso.</FormSuccess>}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
