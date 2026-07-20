"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { getBarbeariaInfo } from "@/lib/barbearia";
import { normalizarHorario } from "@/features/barbearia/horario";
import {
  gerarHorariosDisponiveis,
  instanteSlot,
  type IntervaloOcupado,
} from "@/lib/disponibilidade";

const PASSO_MINUTOS = 30;

async function ocupadosDoDia(barbeiroId: string, data: string): Promise<IntervaloOcupado[]> {
  const inicioDia = instanteSlot(data, "00:00");
  const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const existentes = await db
    .select({ dataHora: agendamentos.dataHora, duracao: servicos.duracaoMinutos })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .where(
      and(
        eq(agendamentos.barbeiroId, barbeiroId),
        ne(agendamentos.status, "cancelado"),
        gte(agendamentos.dataHora, inicioDia),
        lt(agendamentos.dataHora, fimDia),
      ),
    );

  return existentes.map((e) => {
    const inicio = new Date(e.dataHora);
    return { inicio, fim: new Date(inicio.getTime() + e.duracao * 60_000) };
  });
}

export async function getHorariosDisponiveis(
  barbeiroId: string,
  servicoId: string,
  data: string,
): Promise<string[]> {
  await getCurrentProfile();

  const [servico] = await db.select().from(servicos).where(eq(servicos.id, servicoId));
  if (!servico) return [];

  const info = await getBarbeariaInfo();
  const horario = normalizarHorario(info?.horario);
  const diaSemana = new Date(`${data}T12:00:00${"-03:00"}`).getDay();
  const dia = horario.find((h) => h.dia === diaSemana);
  if (!dia || !dia.aberto) return [];

  const ocupados = await ocupadosDoDia(barbeiroId, data);

  return gerarHorariosDisponiveis({
    data,
    abre: dia.abre,
    fecha: dia.fecha,
    duracaoMinutos: servico.duracaoMinutos,
    passoMinutos: PASSO_MINUTOS,
    ocupados,
    agora: new Date(),
  });
}

export interface CriarAgendamentoResult {
  ok?: boolean;
  error?: string;
}

export async function criarAgendamento(
  barbeiroId: string,
  servicoId: string,
  data: string,
  hora: string,
): Promise<CriarAgendamentoResult> {
  const profile = await getCurrentProfile();

  const [servico] = await db.select().from(servicos).where(eq(servicos.id, servicoId));
  if (!servico) return { error: "Serviço não encontrado." };

  const inicio = instanteSlot(data, hora);
  const fim = new Date(inicio.getTime() + servico.duracaoMinutos * 60_000);

  if (inicio.getTime() <= Date.now()) {
    return { error: "Não é possível agendar em um horário no passado." };
  }

  // Recheck de conflito no servidor (evita corrida).
  const ocupados = await ocupadosDoDia(barbeiroId, data);
  const colide = ocupados.some((o) => inicio < o.fim && o.inicio < fim);
  if (colide) {
    return { error: "Esse horário acabou de ser ocupado. Escolha outro." };
  }

  try {
    await db.insert(agendamentos).values({
      clienteId: profile.id,
      barbeiroId,
      servicoId,
      dataHora: inicio,
      valor: servico.preco,
      tipo: "avulso",
      status: "agendado",
    });
  } catch (err) {
    console.error("Falha ao criar agendamento:", err);
    return { error: "Não foi possível agendar. Tente novamente." };
  }

  revalidatePath("/agendar");
  revalidatePath("/meus-agendamentos");
  return { ok: true };
}
