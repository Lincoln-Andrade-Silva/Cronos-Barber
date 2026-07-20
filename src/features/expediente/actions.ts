"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expediente } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { horaParaMinutos } from "@/lib/disponibilidade";

export interface DiaExpediente {
  diaSemana: number;
  trabalha: boolean;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string;
  almocoFim: string;
}

export interface ExpedienteFormState {
  ok?: boolean;
  error?: string;
}

const HORA = /^\d{2}:\d{2}$/;
const HORA_OU_VAZIO = /^(\d{2}:\d{2})?$/;

const diaSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  trabalha: z.boolean(),
  horaInicio: z.string().regex(HORA),
  horaFim: z.string().regex(HORA),
  almocoInicio: z.string().regex(HORA_OU_VAZIO),
  almocoFim: z.string().regex(HORA_OU_VAZIO),
});

export async function salvarExpediente(
  _prev: ExpedienteFormState,
  formData: FormData,
): Promise<ExpedienteFormState> {
  await requireAdmin();

  const barbeiroId = String(formData.get("barbeiroId") ?? "");
  if (!z.string().uuid().safeParse(barbeiroId).success) {
    return { error: "Barbeiro inválido." };
  }

  const parsed = z
    .array(diaSchema)
    .safeParse(JSON.parse(String(formData.get("expediente") ?? "[]")));
  if (!parsed.success) return { error: "Dados de expediente inválidos." };

  const dias = parsed.data.filter((d) => d.trabalha);
  for (const dia of dias) {
    if (horaParaMinutos(dia.horaFim) <= horaParaMinutos(dia.horaInicio)) {
      return { error: "O horário de término deve ser maior que o de início." };
    }
    const temAlmoco = Boolean(dia.almocoInicio && dia.almocoFim);
    if (Boolean(dia.almocoInicio) !== Boolean(dia.almocoFim)) {
      return { error: "Preencha início e fim do almoço, ou deixe ambos vazios." };
    }
    if (temAlmoco) {
      const ini = horaParaMinutos(dia.almocoInicio);
      const fim = horaParaMinutos(dia.almocoFim);
      if (fim <= ini) return { error: "O almoço deve terminar depois de começar." };
      if (ini < horaParaMinutos(dia.horaInicio) || fim > horaParaMinutos(dia.horaFim)) {
        return { error: "O almoço deve ficar dentro do horário de trabalho." };
      }
    }
  }

  try {
    await db.delete(expediente).where(eq(expediente.barbeiroId, barbeiroId));
    if (dias.length > 0) {
      await db.insert(expediente).values(
        dias.map((d) => {
          const temAlmoco = Boolean(d.almocoInicio && d.almocoFim);
          return {
            barbeiroId,
            diaSemana: d.diaSemana,
            horaInicio: d.horaInicio,
            horaFim: d.horaFim,
            almocoInicio: temAlmoco ? d.almocoInicio : null,
            almocoFim: temAlmoco ? d.almocoFim : null,
          };
        }),
      );
    }
  } catch (err) {
    console.error("Falha ao salvar expediente:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/admin/barbeiros");
  return { ok: true };
}
