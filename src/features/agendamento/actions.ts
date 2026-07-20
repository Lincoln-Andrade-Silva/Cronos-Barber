"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, expediente, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { getBarbeariaInfo } from "@/lib/barbearia";
import { servicoCobertoPorPlano } from "@/lib/plano";
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

  const diaSemana = new Date(`${data}T12:00:00${"-03:00"}`).getDay();

  let abre: string;
  let fecha: string;
  let almoco: IntervaloOcupado | null = null;

  const exp = await db.select().from(expediente).where(eq(expediente.barbeiroId, barbeiroId));
  if (exp.length > 0) {
    // Barbeiro com expediente próprio: sem linha no dia = folga.
    const doDia = exp.find((e) => e.diaSemana === diaSemana);
    if (!doDia) return [];
    abre = doDia.horaInicio;
    fecha = doDia.horaFim;
    if (doDia.almocoInicio && doDia.almocoFim) {
      almoco = {
        inicio: instanteSlot(data, doDia.almocoInicio),
        fim: instanteSlot(data, doDia.almocoFim),
      };
    }
  } else {
    // Sem expediente cadastrado: usa o horário geral da barbearia.
    const info = await getBarbeariaInfo();
    const horario = normalizarHorario(info?.horario);
    const dia = horario.find((h) => h.dia === diaSemana);
    if (!dia || !dia.aberto) return [];
    abre = dia.abre;
    fecha = dia.fecha;
  }

  const ocupados = await ocupadosDoDia(barbeiroId, data);
  if (almoco) ocupados.push(almoco);

  return gerarHorariosDisponiveis({
    data,
    abre,
    fecha,
    duracaoMinutos: servico.duracaoMinutos,
    passoMinutos: PASSO_MINUTOS,
    ocupados,
    agora: new Date(),
  });
}

export interface PrecoAgendamento {
  coberto: boolean;
  valor: string;
}

/** Preço efetivo do serviço na data escolhida, considerando cobertura do plano do cliente. */
export async function getPrecoAgendamento(
  servicoId: string,
  data: string,
): Promise<PrecoAgendamento> {
  const profile = await getCurrentProfile();

  const [servico] = await db.select().from(servicos).where(eq(servicos.id, servicoId));
  if (!servico) return { coberto: false, valor: "0" };

  const inicio = instanteSlot(data, "12:00");
  const coberto = await servicoCobertoPorPlano(profile.id, servicoId, data, inicio);
  return { coberto, valor: coberto ? "0" : servico.preco };
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

  const coberto = await servicoCobertoPorPlano(profile.id, servicoId, data, inicio);

  try {
    await db.insert(agendamentos).values({
      clienteId: profile.id,
      barbeiroId,
      servicoId,
      dataHora: inicio,
      valor: coberto ? "0" : servico.preco,
      tipo: coberto ? "plano" : "avulso",
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

export async function cancelarAgendamento(id: string): Promise<CriarAgendamentoResult> {
  const profile = await getCurrentProfile();

  const [ag] = await db.select().from(agendamentos).where(eq(agendamentos.id, id));
  if (!ag || ag.clienteId !== profile.id) {
    return { error: "Agendamento não encontrado." };
  }
  if (ag.status !== "agendado") {
    return { error: "Só é possível cancelar agendamentos ativos." };
  }
  if (new Date(ag.dataHora).getTime() <= Date.now()) {
    return { error: "Não é possível cancelar um horário que já passou." };
  }

  await db.update(agendamentos).set({ status: "cancelado" }).where(eq(agendamentos.id, id));
  revalidatePath("/meus-agendamentos");
  return { ok: true };
}
