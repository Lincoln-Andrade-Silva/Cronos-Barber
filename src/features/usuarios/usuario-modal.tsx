"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Field, FormError, Input, Modal, Select, Toggle } from "@/components/ui";
import { maskTelefone } from "@/lib/mask";
import { salvarUsuario, type UsuarioFormState } from "./actions";
import type { UsuarioRow } from "./usuarios-client";

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
    </Button>
  );
}

export function UsuarioModal({
  usuario,
  onClose,
}: {
  usuario: UsuarioRow | null;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<UsuarioFormState, FormData>(salvarUsuario, {});
  const [tipo, setTipo] = useState<"admin" | "cliente">(usuario?.tipo ?? "cliente");
  const [ativo, setAtivo] = useState((usuario?.status ?? "ativo") === "ativo");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Modal open onClose={onClose} title={usuario ? "Editar usuário" : "Novo usuário"}>
      <form action={formAction} className="mx-auto max-w-sm space-y-5">
        {usuario && <input type="hidden" name="id" value={usuario.id} />}
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="status" value={ativo ? "ativo" : "inativo"} />

        <Field label="Nome" htmlFor="u-nome">
          <Input id="u-nome" name="nome" required defaultValue={usuario?.nome ?? ""} placeholder="Nome completo" />
        </Field>

        <Field label="Email" htmlFor="u-email">
          <Input
            id="u-email"
            name="email"
            type="email"
            required={!usuario}
            disabled={!!usuario}
            defaultValue={usuario?.email ?? ""}
            placeholder="email@exemplo.com"
          />
        </Field>

        {!usuario && (
          <Field label="Senha" htmlFor="u-senha">
            <Input
              id="u-senha"
              name="senha"
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </Field>
        )}

        <Field label="Telefone" htmlFor="u-tel">
          <Input
            id="u-tel"
            name="telefone"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(maskTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </Field>

        <Field label="Tipo">
          <Select
            value={tipo}
            onChange={(v) => setTipo(v as "admin" | "cliente")}
            options={[
              { value: "cliente", label: "Cliente" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted">Usuários inativos ficam bloqueados.</p>
          </div>
          <Toggle on={ativo} onClick={() => setAtivo(!ativo)} />
        </div>

        {state.error && <FormError>{state.error}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton editando={!!usuario} />
        </div>
      </form>
    </Modal>
  );
}
