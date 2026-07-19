"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus } from "lucide-react";
import { Button, Field, FormError, FormSuccess, Input } from "@/components/ui";
import type { BarbeariaInfo, HorarioDia } from "@/db/schema";
import { cn } from "@/lib/cn";
import { maskTelefone } from "@/lib/mask";
import { DIAS_SEMANA, normalizarHorario } from "./horario";
import { salvarBarbearia, type BarbeariaFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition",
        on ? "bg-brand" : "bg-line2",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function HorarioEditor({
  value,
  onChange,
}: {
  value: HorarioDia[];
  onChange: (horario: HorarioDia[]) => void;
}) {
  function update(dia: number, patch: Partial<HorarioDia>) {
    onChange(value.map((d) => (d.dia === dia ? { ...d, ...patch } : d)));
  }

  function replicarPrimeiroDia() {
    const base = value.find((d) => d.dia === 1) ?? value[0];
    if (!base) return;
    onChange(value.map((d) => ({ ...d, abre: base.abre, fecha: base.fecha })));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line bg-surface/40 px-3 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted2">
          Dias e horários
        </span>
        <button
          type="button"
          onClick={replicarPrimeiroDia}
          className="text-xs font-medium text-brand-light transition hover:text-brand"
        >
          Replicar horário da segunda
        </button>
      </div>

      <div className="divide-y divide-line">
        {DIAS_SEMANA.map(({ dia, label }) => {
          const item = value.find((d) => d.dia === dia);
          if (!item) return null;
          return (
            <div
              key={dia}
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 transition",
                !item.aberto && "opacity-55",
              )}
            >
              <div className="flex items-center gap-3">
                <Toggle on={item.aberto} onClick={() => update(dia, { aberto: !item.aberto })} />
                <span className="w-32 text-sm font-medium">{label}</span>
              </div>

              {item.aberto ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={item.abre}
                    onChange={(e) => update(dia, { abre: e.target.value })}
                    className="w-32 py-2"
                  />
                  <span className="text-sm text-muted">às</span>
                  <Input
                    type="time"
                    value={item.fecha}
                    onChange={(e) => update(dia, { fecha: e.target.value })}
                    className="w-32 py-2"
                  />
                </div>
              ) : (
                <span className="pr-2 text-sm text-muted2">Fechado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BarbeariaForm({ info }: { info: BarbeariaInfo | null }) {
  const [state, formAction] = useFormState<BarbeariaFormState, FormData>(salvarBarbearia, {});
  const [previewLogo, setPreviewLogo] = useState<string | null>(info?.logoUrl ?? null);
  const [whatsapp, setWhatsapp] = useState(info?.whatsapp ?? "");
  const [horario, setHorario] = useState<HorarioDia[]>(normalizarHorario(info?.horario));

  function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreviewLogo(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Logo */}
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface">
          {previewLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewLogo} alt="Logo da barbearia" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted2" />
          )}
        </div>
        <div>
          <label
            htmlFor="logo"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition hover:bg-surface2"
          >
            <ImagePlus className="h-4 w-4" />
            Trocar logo
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onLogoChange}
            className="hidden"
          />
          <p className="mt-1.5 text-xs text-muted">PNG, JPG, WEBP ou SVG (até 5MB).</p>
        </div>
      </div>

      {/* Dados gerais */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome da barbearia" htmlFor="nome">
          <Input id="nome" name="nome" defaultValue={info?.nome ?? ""} placeholder="Cronos Barber" />
        </Field>

        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input
            id="whatsapp"
            name="whatsapp"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </Field>

        <Field label="Instagram" htmlFor="instagramLink">
          <Input
            id="instagramLink"
            name="instagramLink"
            type="url"
            defaultValue={info?.instagramLink ?? ""}
            placeholder="https://instagram.com/..."
          />
        </Field>

        <Field label="Facebook" htmlFor="facebookLink">
          <Input
            id="facebookLink"
            name="facebookLink"
            type="url"
            defaultValue={info?.facebookLink ?? ""}
            placeholder="https://facebook.com/..."
          />
        </Field>
      </div>

      {/* Endereço */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Endereço</h3>
        <div className="grid gap-5 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <Field label="Rua" htmlFor="enderecoRua">
              <Input id="enderecoRua" name="enderecoRua" defaultValue={info?.enderecoRua ?? ""} placeholder="Av. Principal" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Número" htmlFor="enderecoNumero">
              <Input id="enderecoNumero" name="enderecoNumero" defaultValue={info?.enderecoNumero ?? ""} placeholder="123" />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="Bairro" htmlFor="enderecoBairro">
              <Input id="enderecoBairro" name="enderecoBairro" defaultValue={info?.enderecoBairro ?? ""} placeholder="Centro" />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="Cidade" htmlFor="enderecoCidade">
              <Input id="enderecoCidade" name="enderecoCidade" defaultValue={info?.enderecoCidade ?? ""} placeholder="Sua cidade" />
            </Field>
          </div>
        </div>
      </div>

      {/* Horário de atendimento */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Horário de atendimento</h3>
        <HorarioEditor value={horario} onChange={setHorario} />
        <input type="hidden" name="horario" value={JSON.stringify(horario)} />
      </div>

      {state.error && <FormError>{state.error}</FormError>}
      {state.ok && <FormSuccess>Informações salvas com sucesso.</FormSuccess>}

      <SubmitButton />
    </form>
  );
}
