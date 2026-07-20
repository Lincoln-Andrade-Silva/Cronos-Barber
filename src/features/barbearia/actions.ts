"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { barbeariaInfo, type HorarioDia } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { uploadImagem } from "@/lib/storage";

export interface BarbeariaFormState {
  ok?: boolean;
  error?: string;
}

const urlOpcional = z.string().trim().url("Link inválido.").or(z.literal("")).optional();

const schema = z.object({
  nome: z.string().trim().max(120).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  instagramLink: urlOpcional,
  facebookLink: urlOpcional,
  enderecoRua: z.string().trim().max(200).optional(),
  enderecoNumero: z.string().trim().max(20).optional(),
  enderecoBairro: z.string().trim().max(120).optional(),
  enderecoCidade: z.string().trim().max(120).optional(),
});

const horarioSchema = z.array(
  z.object({
    dia: z.number().int().min(0).max(6),
    aberto: z.boolean(),
    abre: z.string().regex(/^\d{2}:\d{2}$/),
    fecha: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

function vazioParaNull(valor: string | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

function parseHorario(raw: FormDataEntryValue | null): HorarioDia[] | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = horarioSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function salvarBarbearia(
  _prev: BarbeariaFormState,
  formData: FormData,
): Promise<BarbeariaFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    nome: formData.get("nome"),
    whatsapp: formData.get("whatsapp"),
    instagramLink: formData.get("instagramLink"),
    facebookLink: formData.get("facebookLink"),
    enderecoRua: formData.get("enderecoRua"),
    enderecoNumero: formData.get("enderecoNumero"),
    enderecoBairro: formData.get("enderecoBairro"),
    enderecoCidade: formData.get("enderecoCidade"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = parsed.data;
  const horario = parseHorario(formData.get("horario"));
  const logo = formData.get("logo");
  let logoUrl: string | undefined;

  try {
    if (logo instanceof File && logo.size > 0) {
      logoUrl = await uploadImagem(logo, "logo");
    }

    await db
      .update(barbeariaInfo)
      .set({
        nome: vazioParaNull(dados.nome),
        whatsapp: vazioParaNull(dados.whatsapp),
        instagramLink: vazioParaNull(dados.instagramLink),
        facebookLink: vazioParaNull(dados.facebookLink),
        enderecoRua: vazioParaNull(dados.enderecoRua),
        enderecoNumero: vazioParaNull(dados.enderecoNumero),
        enderecoBairro: vazioParaNull(dados.enderecoBairro),
        enderecoCidade: vazioParaNull(dados.enderecoCidade),
        horario,
        ...(logoUrl ? { logoUrl } : {}),
        atualizadoEm: new Date(),
      })
      .where(eq(barbeariaInfo.id, 1));
  } catch (err) {
    console.error("Falha ao salvar barbearia:", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  // A marca aparece em todo o layout (login, sidebar, home).
  revalidatePath("/", "layout");
  return { ok: true };
}
