"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CreditCard } from "lucide-react";
import { Button, Field, FormError, FormSuccess, Input } from "@/components/ui";
import { salvarIntegracaoPagamento, type PagamentoFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar credenciais"}
    </Button>
  );
}

export function PagamentoForm({
  accessToken,
  publicKey,
  webhookSecret,
  siteUrl,
}: {
  accessToken: string | null;
  publicKey: string | null;
  webhookSecret: string | null;
  siteUrl: string | null;
}) {
  const [state, formAction] = useFormState<PagamentoFormState, FormData>(
    salvarIntegracaoPagamento,
    {},
  );

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/40 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-light">
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="text-sm text-muted">
          Credenciais do <span className="font-semibold text-ink">Mercado Pago</span> usadas para
          cobrar as assinaturas por cartão. Pegue em Suas integrações → sua aplicação →
          Credenciais. O Access Token é secreto — não compartilhe.
        </div>
      </div>

      <Field label="URL do site" htmlFor="pg-site">
        <Input
          id="pg-site"
          name="siteUrl"
          type="url"
          autoComplete="off"
          defaultValue={siteUrl ?? ""}
          placeholder="https://seudominio.com"
        />
        <p className="mt-1 text-xs text-muted2">
          URL pública usada no checkout e no webhook. O Mercado Pago não aceita localhost — em
          produção use seu domínio; para testar local, um túnel (ex: ngrok).
        </p>
      </Field>

      <Field label="Access Token" htmlFor="pg-access">
        <Input
          id="pg-access"
          name="accessToken"
          type="password"
          autoComplete="off"
          defaultValue={accessToken ?? ""}
          placeholder="APP_USR-... ou TEST-..."
        />
      </Field>

      <Field label="Public Key" htmlFor="pg-public">
        <Input
          id="pg-public"
          name="publicKey"
          autoComplete="off"
          defaultValue={publicKey ?? ""}
          placeholder="APP_USR-... ou TEST-..."
        />
      </Field>

      <Field label="Segredo do webhook (opcional)" htmlFor="pg-webhook">
        <Input
          id="pg-webhook"
          name="webhookSecret"
          type="password"
          autoComplete="off"
          defaultValue={webhookSecret ?? ""}
          placeholder="Só em produção"
        />
        <p className="mt-1 text-xs text-muted2">
          Usado só em produção para validar as notificações do Mercado Pago. Em teste/local pode
          deixar vazio — a validação é ignorada.
        </p>
      </Field>

      {state.error && <FormError>{state.error}</FormError>}
      {state.ok && <FormSuccess>Credenciais salvas.</FormSuccess>}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
