"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
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
