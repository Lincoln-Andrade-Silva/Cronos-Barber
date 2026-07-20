"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, Input, Modal, Toggle } from "@/components/ui";
import type { Servico } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL, formatDuracao } from "@/lib/format";
import { DIAS_SEMANA } from "@/features/barbearia/horario";
import { salvarPlano, type PlanoFormState } from "./actions";

const DIA_CURTO: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export interface PlanoComServicos {
  id: string;
  nome: string;
  valor: string;
  diasValidade: number;
  diasValidos: number[];
  ativo: boolean;
  servicos: { servicoId: string; limite: number | null }[];
}

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function PlanoModal({
  plano,
  servicos,
  onClose,
}: {
  plano: PlanoComServicos | null;
  servicos: Servico[];
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<PlanoFormState, FormData>(salvarPlano, {});
  const [ativo, setAtivo] = useState(plano?.ativo ?? true);
  // Map servicoId -> limite (string). Presença = incluso. "" = ilimitado.
  const [selecionados, setSelecionados] = useState<Map<string, string>>(
    new Map(plano?.servicos.map((s) => [s.servicoId, s.limite?.toString() ?? ""]) ?? []),
  );
  const [dias, setDias] = useState<Set<number>>(
    new Set(plano?.diasValidos ?? [0, 1, 2, 3, 4, 5, 6]),
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  function toggleServico(id: string) {
    setSelecionados((atual) => {
      const nova = new Map(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.set(id, "");
      return nova;
    });
  }

  function setLimite(id: string, valor: string) {
    setSelecionados((atual) => new Map(atual).set(id, valor));
  }

  function toggleDia(dia: number) {
    setDias((atual) => {
      const nova = new Set(atual);
      if (nova.has(dia)) nova.delete(dia);
      else nova.add(dia);
      return nova;
    });
  }

  return (
    <Modal open onClose={onClose} title={plano ? "Editar plano" : "Novo plano"}>
      <form action={formAction} className="mx-auto max-w-md space-y-5">
        {plano && <input type="hidden" name="id" value={plano.id} />}
        <input type="hidden" name="ativo" value={String(ativo)} />
        {Array.from(selecionados.entries()).map(([id, limite]) => (
          <div key={id}>
            <input type="hidden" name="servicoIds" value={id} />
            <input type="hidden" name={`limite_${id}`} value={limite} />
          </div>
        ))}
        {Array.from(dias).map((d) => (
          <input key={d} type="hidden" name="diasValidos" value={d} />
        ))}

        <Field label="Nome" htmlFor="pl-nome">
          <Input
            id="pl-nome"
            name="nome"
            required
            defaultValue={plano?.nome ?? ""}
            placeholder="Ex: Plano Mensal"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor mensal (R$)" htmlFor="pl-valor">
            <Input
              id="pl-valor"
              name="valor"
              type="number"
              min={0}
              step="0.01"
              defaultValue={plano?.valor ?? "0"}
            />
          </Field>
          <Field label="Validade (dias)" htmlFor="pl-dias">
            <Input
              id="pl-dias"
              name="diasValidade"
              type="number"
              min={1}
              defaultValue={plano?.diasValidade ?? 30}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Serviços inclusos e limite de uso
          </p>
          {servicos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {servicos.map((s) => {
                const incluido = selecionados.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition",
                      incluido ? "border-brand/40 bg-surface" : "border-line",
                    )}
                  >
                    <Toggle on={incluido} onClick={() => toggleServico(s.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.nome}</p>
                      <p className="truncate text-xs text-muted">
                        {formatDuracao(s.duracaoMinutos)} · {formatBRL(s.preco)}
                      </p>
                    </div>
                    {incluido && (
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ilimitado"
                        value={selecionados.get(s.id) ?? ""}
                        onChange={(e) => setLimite(s.id, e.target.value)}
                        className="h-10 w-24 shrink-0 py-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">
            Limite = usos por período. Vazio = ilimitado. Depois de atingir, é cobrado avulso.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Dias válidos
          </p>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map(({ dia }) => {
              const incluido = dias.has(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  className={cn(
                    "h-10 w-12 rounded-lg border text-sm font-medium transition",
                    incluido
                      ? "border-brand bg-brand/10 text-brand-light"
                      : "border-line text-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  {DIA_CURTO[dia]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            Fora dos dias válidos, o atendimento é cobrado avulso.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted">Disponível para novas assinaturas.</p>
          </div>
          <Toggle on={ativo} onClick={() => setAtivo(!ativo)} />
        </div>

        {state.error && <FormError>{state.error}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton editando={!!plano} />
        </div>
      </form>
    </Modal>
  );
}
