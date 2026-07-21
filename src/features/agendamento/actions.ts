"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, expediente, servicos } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { getEstabelecimentoInfo } from "@/lib/estabelecimento";
import { servicoCobertoPorPlano } from "@/lib/plano";
import { normalizarHorario } from "@/features/estabelecimento/horario";
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
  servicoIds: string[],
  data: string,
): Promise<string[]> {
  await getCurrentProfile();

  if (servicoIds.length === 0) return [];
  const servs = await db.select().from(servicos).where(inArray(servicos.id, servicoIds));
  if (servs.length === 0) return [];
  const duracaoTotal = servicoIds.reduce(
    (soma, id) => soma + (servs.find((s) => s.id === id)?.duracaoMinutos ?? 0),
    0,
  );

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
    // Sem expediente cadastrado: usa o horário geral do estabelecimento.
    const info = await getEstabelecimentoInfo();
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
    duracaoMinutos: duracaoTotal,
    passoMinutos: PASSO_MINUTOS,
    ocupados,
    agora: new Date(),
  });
}

export interface ItemPreco {
  servicoId: string;
  coberto: boolean;
  valor: string;
}

/** Preço efetivo de cada serviço na data escolhida, considerando a cobertura do plano. */
export async function getPrecoAgendamento(
  servicoIds: string[],
  data: string,
): Promise<ItemPreco[]> {
  const profile = await getCurrentProfile();
  if (servicoIds.length === 0) return [];

  const servs = await db.select().from(servicos).where(inArray(servicos.id, servicoIds));
  const inicio = instanteSlot(data, "12:00");

  const itens: ItemPreco[] = [];
  for (const id of servicoIds) {
    const servico = servs.find((s) => s.id === id);
    if (!servico) continue;
    const coberto = await servicoCobertoPorPlano(profile.id, id, data, inicio);
    itens.push({ servicoId: id, coberto, valor: coberto ? "0" : servico.preco });
  }
  return itens;
}

export interface CriarAgendamentoResult {
  ok?: boolean;
  error?: string;
}

export async function criarAgendamento(
  barbeiroId: string,
  servicoIds: string[],
  data: string,
  hora: string,
): Promise<CriarAgendamentoResult> {
  const profile = await getCurrentProfile();

  if (servicoIds.length === 0) return { error: "Selecione ao menos um serviço." };
  const servs = await db.select().from(servicos).where(inArray(servicos.id, servicoIds));
  const ordenados = servicoIds.map((id) => servs.find((s) => s.id === id));
  if (ordenados.some((s) => !s)) return { error: "Serviço não encontrado." };
  const servicosOrdenados = ordenados as (typeof servs)[number][];

  const duracaoTotal = servicosOrdenados.reduce((soma, s) => soma + s.duracaoMinutos, 0);
  const inicioBloco = instanteSlot(data, hora);
  const fimBloco = new Date(inicioBloco.getTime() + duracaoTotal * 60_000);

  if (inicioBloco.getTime() <= Date.now()) {
    return { error: "Não é possível agendar em um horário no passado." };
  }

  // Recheck de conflito no servidor: todo o bloco precisa estar livre.
  const ocupados = await ocupadosDoDia(barbeiroId, data);
  const colide = ocupados.some((o) => inicioBloco < o.fim && o.inicio < fimBloco);
  if (colide) {
    return { error: "Esse horário acabou de ser ocupado. Escolha outro." };
  }

  const grupoId = servicosOrdenados.length > 1 ? crypto.randomUUID() : null;
  const linhas = [];
  let offset = 0;
  for (const servico of servicosOrdenados) {
    const inicio = new Date(inicioBloco.getTime() + offset * 60_000);
    const coberto = await servicoCobertoPorPlano(profile.id, servico.id, data, inicio);
    linhas.push({
      clienteId: profile.id,
      barbeiroId,
      servicoId: servico.id,
      grupoId,
      dataHora: inicio,
      valor: coberto ? "0" : servico.preco,
      tipo: coberto ? ("plano" as const) : ("avulso" as const),
      status: "agendado" as const,
    });
    offset += servico.duracaoMinutos;
  }

  try {
    await db.insert(agendamentos).values(linhas);
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

  // Cancela a marcação inteira (todos os serviços do grupo, se houver).
  await db
    .update(agendamentos)
    .set({ status: "cancelado" })
    .where(ag.grupoId ? eq(agendamentos.grupoId, ag.grupoId) : eq(agendamentos.id, id));
  revalidatePath("/meus-agendamentos");
  return { ok: true };
}
