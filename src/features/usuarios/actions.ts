"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { db } from "@/db";
import { bloqueios, profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/config";

export interface UsuarioFormState {
  ok?: boolean;
  error?: string;
}

const baseSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  telefone: z.string().trim().optional(),
  tipo: z.enum(["admin", "cliente"]),
  status: z.enum(["ativo", "inativo"]),
});

const criarSchema = baseSchema.extend({
  email: z.string().trim().email("Email inválido."),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
});

export async function salvarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id");
  const editando = typeof id === "string" && id.length > 0;

  if (editando) {
    const parsed = baseSchema.safeParse({
      nome: formData.get("nome"),
      telefone: formData.get("telefone") || undefined,
      tipo: formData.get("tipo"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

    if (id === admin.id && (parsed.data.tipo !== "admin" || parsed.data.status !== "ativo")) {
      return { error: "Você não pode remover o próprio acesso de admin." };
    }

    try {
      await db
        .update(profiles)
        .set({
          nome: parsed.data.nome,
          telefone: parsed.data.telefone ?? null,
          tipo: parsed.data.tipo,
          status: parsed.data.status,
          atualizadoEm: new Date(),
        })
        .where(eq(profiles.id, id as string));
    } catch (err) {
      console.error("Falha ao atualizar usuário:", err);
      return { error: "Não foi possível salvar. Tente novamente." };
    }

    revalidatePath("/admin/cadastros");
    return { ok: true };
  }

  const parsed = criarSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    telefone: formData.get("telefone") || undefined,
    tipo: formData.get("tipo"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceKey) return { error: "Servidor mal configurado." };

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
    user_metadata: { nome: parsed.data.nome, telefone: parsed.data.telefone ?? null },
  });

  if (error || !data.user) {
    const jaExiste = error?.status === 422 || /already/i.test(error?.message ?? "");
    return { error: jaExiste ? "Email já cadastrado." : "Não foi possível criar o usuário." };
  }

  try {
    // O trigger cria o profile como cliente; garante os campos escolhidos pelo admin.
    await db
      .insert(profiles)
      .values({
        id: data.user.id,
        nome: parsed.data.nome,
        email: parsed.data.email,
        telefone: parsed.data.telefone ?? null,
        tipo: parsed.data.tipo,
        status: parsed.data.status,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          nome: parsed.data.nome,
          telefone: parsed.data.telefone ?? null,
          tipo: parsed.data.tipo,
          status: parsed.data.status,
          atualizadoEm: new Date(),
        },
      });
  } catch (err) {
    console.error("Falha ao criar profile:", err);
    return { error: "Usuário criado, mas houve erro ao salvar o perfil." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function alternarStatusUsuario(
  id: string,
  status: "ativo" | "inativo",
): Promise<void> {
  const admin = await requireAdmin();
  if (id === admin.id) return; // não inativa a si mesmo
  await db
    .update(profiles)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(profiles.id, id));
  revalidatePath("/admin/cadastros");
}

const bloqueioSchema = z.object({
  motivo: z.string().trim().min(3, "Informe o motivo do bloqueio."),
  dias: z
    .union([z.coerce.number().int().min(1, "Dias deve ser um número inteiro maior que zero."), z.null()])
    .optional(),
});

export async function bloquearUsuario(
  id: string,
  motivo: string,
  dias: number | null,
): Promise<UsuarioFormState> {
  const admin = await requireAdmin();
  if (id === admin.id) return { error: "Você não pode bloquear a si mesmo." };

  const parsed = bloqueioSchema.safeParse({ motivo, dias: dias ?? null });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const agora = new Date();
  const diasFinal = parsed.data.dias ?? null;

  try {
    await db.transaction(async (tx) => {
      // Encerra qualquer episódio ainda aberto antes de abrir o novo.
      await tx
        .update(bloqueios)
        .set({ desbloqueadoEm: agora })
        .where(and(eq(bloqueios.usuarioId, id), isNull(bloqueios.desbloqueadoEm)));
      await tx.insert(bloqueios).values({
        usuarioId: id,
        motivo: parsed.data.motivo,
        dias: diasFinal,
        bloqueadoEm: agora,
        criadoPorId: admin.id,
      });
      await tx
        .update(profiles)
        .set({
          bloqueadoEm: agora,
          bloqueioDias: diasFinal,
          bloqueioMotivo: parsed.data.motivo,
          atualizadoEm: agora,
        })
        .where(eq(profiles.id, id));
    });
  } catch (err) {
    console.error("Falha ao bloquear usuário:", err);
    return { error: "Não foi possível bloquear. Tente novamente." };
  }

  revalidatePath("/admin/cadastros");
  return { ok: true };
}

export async function desbloquearUsuario(id: string): Promise<void> {
  await requireAdmin();
  const agora = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(bloqueios)
      .set({ desbloqueadoEm: agora })
      .where(and(eq(bloqueios.usuarioId, id), isNull(bloqueios.desbloqueadoEm)));
    await tx
      .update(profiles)
      .set({ bloqueadoEm: null, bloqueioDias: null, bloqueioMotivo: null, atualizadoEm: agora })
      .where(eq(profiles.id, id));
  });
  revalidatePath("/admin/cadastros");
}

export async function excluirUsuario(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (id === admin.id) return; // não exclui a si mesmo

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  if (supabaseUrl && serviceKey) {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Remove o usuário de autenticação (o profile cai por cascade, se houver).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) console.error("Falha ao excluir usuário de auth:", error);
  }

  await db.delete(profiles).where(eq(profiles.id, id));
  revalidatePath("/admin/cadastros");
}
