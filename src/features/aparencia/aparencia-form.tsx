"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, FormError, FormSuccess, Segmented, Select } from "@/components/ui";
import { COR_PADRAO, FONTES, TEMAS } from "@/lib/aparencia";
import type { Aparencia, TemaArea } from "@/db/schema";
import { salvarAparencia } from "./actions";

function AreaForm({
  titulo,
  descricao,
  valor,
  onChange,
}: {
  titulo: string;
  descricao: string;
  valor: TemaArea;
  onChange: (v: TemaArea) => void;
}) {
  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted2">{titulo}</h3>
        <p className="mt-1 text-xs text-muted">{descricao}</p>
      </div>

      <Field label="Tema">
        <Segmented
          options={TEMAS.map((t) => ({ value: t.value, label: t.label }))}
          value={valor.tema}
          onChange={(tema) => onChange({ ...valor, tema })}
        />
      </Field>

      {valor.tema === "personalizado" && (
        <>
          <Field label="Base do tema personalizado">
            <Segmented
              options={[
                { value: "escuro", label: "Escura" },
                { value: "claro", label: "Clara" },
              ]}
              value={valor.base}
              onChange={(base) => onChange({ ...valor, base })}
            />
          </Field>

          <Field label="Cor de destaque" htmlFor={`cor-${titulo}`}>
            <div className="flex items-center gap-3">
              <input
                id={`cor-${titulo}`}
                type="color"
                value={valor.cor}
                onChange={(e) => onChange({ ...valor, cor: e.target.value })}
                className="h-11 w-16 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
              />
              <span className="font-mono text-sm text-muted">{valor.cor}</span>
              {valor.cor.toLowerCase() !== COR_PADRAO && (
                <button
                  type="button"
                  onClick={() => onChange({ ...valor, cor: COR_PADRAO })}
                  className="text-xs text-muted underline transition hover:text-ink"
                >
                  restaurar padrão
                </button>
              )}
            </div>
          </Field>
        </>
      )}

      <Field label="Fonte">
        <Select
          value={valor.fonte}
          onChange={(fonte) => onChange({ ...valor, fonte })}
          options={FONTES.map((f) => ({ value: f.value, label: f.label }))}
        />
      </Field>
    </Card>
  );
}

export function AparenciaForm({ inicial }: { inicial: Aparencia }) {
  const router = useRouter();
  const [valor, setValor] = useState<Aparencia>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    setOk(false);
    startTransition(async () => {
      const res = await salvarAparencia(valor);
      if (res.error) {
        setErro(res.error);
        return;
      }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AreaForm
          titulo="Vitrine"
          descricao="Área do cliente: home, agendamento, planos e login."
          valor={valor.vitrine}
          onChange={(vitrine) => setValor((v) => ({ ...v, vitrine }))}
        />
        <AreaForm
          titulo="Painel admin"
          descricao="Área administrativa: dashboard, agenda, relatórios e cadastros."
          valor={valor.admin}
          onChange={(admin) => setValor((v) => ({ ...v, admin }))}
        />
      </div>

      {erro && <FormError>{erro}</FormError>}
      {ok && <FormSuccess>Aparência salva.</FormSuccess>}

      <div className="flex justify-end">
        <Button type="button" className="h-11 w-full sm:w-auto" disabled={pending} onClick={salvar}>
          {pending ? "Salvando..." : "Salvar aparência"}
        </Button>
      </div>
    </div>
  );
}
