"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function finalizarAgendamento(id: string): Promise<void> {
  await requireAdmin();
  await db
    .update(agendamentos)
    .set({ status: "finalizado" })
    .where(eq(agendamentos.id, id));
  revalidatePath("/admin/agenda");
}

export async function cancelarAgendamentoAdmin(id: string): Promise<void> {
  await requireAdmin();
  await db
    .update(agendamentos)
    .set({ status: "cancelado" })
    .where(eq(agendamentos.id, id));
  revalidatePath("/admin/agenda");
}

export async function excluirAgendamento(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(agendamentos).where(eq(agendamentos.id, id));
  revalidatePath("/admin/agenda");
}
