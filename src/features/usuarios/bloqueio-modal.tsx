"use client";

import { useState, useTransition } from "react";
import { Button, Field, FormError, Input, Modal, Select, Textarea } from "@/components/ui";
import { bloquearUsuario } from "./actions";
import { MOTIVOS_BLOQUEIO } from "./motivos-bloqueio";
import type { UsuarioRow } from "./usuarios-client";

const OPCOES_MOTIVO = [
  { value: "", label: "Selecione o motivo" },
  ...MOTIVOS_BLOQUEIO.map((m) => ({ value: m, label: m })),
  { value: "outros", label: "Outros" },
];

export function BloqueioModal({
  usuario,
  onClose,
}: {
  usuario: UsuarioRow;
  onClose: () => void;
}) {
  const [motivoSel, setMotivoSel] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [dias, setDias] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const motivo = motivoSel === "outros" ? motivoOutro.trim() : motivoSel;

  function confirmar() {
    setErro(null);
    if (!motivoSel) {
      setErro("Selecione o motivo do bloqueio.");
      return;
    }
    if (motivoSel === "outros" && motivo.length < 3) {
      setErro("Descreva o motivo do bloqueio.");
      return;
    }
    const diasNum = dias.trim() === "" ? null : Number(dias);
    startTransition(async () => {
      const res = await bloquearUsuario(usuario.id, motivo, diasNum);
      if (res.error) {
        setErro(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Bloquear usuário">
      <div className="mx-auto max-w-sm space-y-5">
        <p className="text-sm text-muted">
          <strong className="text-ink">{usuario.nome}</strong> continuará conseguindo entrar, mas
          ficará impedido de agendar serviços e contratar novos planos. Poderá apenas cancelar um
          plano que já tenha.
        </p>

        <Field label="Motivo">
          <Select value={motivoSel} onChange={setMotivoSel} options={OPCOES_MOTIVO} />
          {motivoSel === "outros" && (
            <Textarea
              className="mt-2"
              value={motivoOutro}
              onChange={(e) => setMotivoOutro(e.target.value)}
              placeholder="Descreva o motivo do bloqueio"
            />
          )}
        </Field>

        <Field label="Dias de bloqueio" htmlFor="bloq-dias">
          <Input
            id="bloq-dias"
            type="number"
            min={1}
            inputMode="numeric"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            placeholder="Deixe vazio para bloqueio permanente"
          />
        </Field>

        {erro && <FormError>{erro}</FormError>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={pending} onClick={confirmar}>
            {pending ? "Bloqueando..." : "Bloquear"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
