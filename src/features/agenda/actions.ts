"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, produtos, servicos, vendasProdutos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { instanteSlot } from "@/lib/disponibilidade";
import { isMetodoPagamento } from "@/lib/metodo-pagamento";
import { servicoCobertoPorPlano } from "@/lib/plano";
import { estornarAgendamento } from "@/features/agendamento/pagamento";

/** Ids do agendamento e, se fizer parte de um grupo (multi-serviço), de todo o grupo. */
async function idsAlvo(id: string): Promise<string[]> {
  const [row] = await db
    .select({ grupoId: agendamentos.grupoId })
    .from(agendamentos)
    .where(eq(agendamentos.id, id));
  if (!row) return [];
  if (!row.grupoId) return [id];
  const linhas = await db
    .select({ id: agendamentos.id })
    .from(agendamentos)
    .where(eq(agendamentos.grupoId, row.grupoId));
  return linhas.map((l) => l.id);
}

/**
 * Dentre os serviços informados, quais estão cobertos pelo plano do cliente do bloco
 * na data do atendimento (respeitando dia da semana e limite). Vazio se cliente avulso.
 */
export async function getCoberturaBloco(id: string, servicoIds: string[]): Promise<string[]> {
  await requireAdmin();
  const [row] = await db
    .select({ clienteId: agendamentos.clienteId, dataHora: agendamentos.dataHora })
    .from(agendamentos)
    .where(eq(agendamentos.id, id));
  if (!row?.clienteId) return [];

  const dataYmd = row.dataHora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const cobertos: string[] = [];
  for (const servicoId of servicoIds) {
    if (await servicoCobertoPorPlano(row.clienteId, servicoId, dataYmd, row.dataHora)) {
      cobertos.push(servicoId);
    }
  }
  return cobertos;
}

export interface ProdutoVendido {
  produtoId: string;
  quantidade: number;
}

export interface FinalizarAtendimentoInput {
  id: string;
  metodoPagamento?: string | null;
  servicoIdsExtras: string[];
  produtos: ProdutoVendido[];
}

/**
 * Finaliza um atendimento de balcão, opcionalmente adicionando serviços extras (no mesmo
 * grupo, com cobertura de plano reavaliada), produtos vendidos e o método de recebimento.
 */
export async function finalizarAtendimento(
  input: FinalizarAtendimentoInput,
): Promise<{ error?: string }> {
  await requireAdmin();
  const ids = await idsAlvo(input.id);
  if (ids.length === 0) return {};

  const linhasBloco = await db.select().from(agendamentos).where(inArray(agendamentos.id, ids));
  const aguardando = linhasBloco.some(
    (l) => l.formaPagamento === "online" && l.pagamentoStatus === "pendente",
  );
  if (aguardando) {
    return { error: "Pagamento online pendente: conclua o pagamento ou cancele o agendamento." };
  }

  const base = linhasBloco[0];
  const metodo = isMetodoPagamento(input.metodoPagamento) ? input.metodoPagamento : null;
  const extrasIds = input.servicoIdsExtras ?? [];
  const produtosVendidos = input.produtos ?? [];

  for (const p of produtosVendidos) {
    if (!Number.isInteger(p.quantidade) || p.quantidade < 1) {
      return { error: "Quantidade de produto inválida." };
    }
  }

  const servsExtra = extrasIds.length
    ? await db.select().from(servicos).where(inArray(servicos.id, extrasIds))
    : [];
  if (servsExtra.length !== new Set(extrasIds).size) return { error: "Serviço não encontrado." };

  const produtosData = produtosVendidos.length
    ? await db.select().from(produtos).where(inArray(produtos.id, produtosVendidos.map((p) => p.produtoId)))
    : [];
  if (produtosData.length !== new Set(produtosVendidos.map((p) => p.produtoId)).size) {
    return { error: "Produto não encontrado." };
  }

  const dataYmd = base.dataHora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  // Serviços extras: reavalia cobertura do plano (grátis se coberto, senão avulso).
  const linhasExtra: {
    clienteId: string | null;
    clienteAvulso: string | null;
    barbeiroId: string;
    servicoId: string;
    dataHora: Date;
    valor: string;
    tipo: "plano" | "avulso";
    status: "finalizado";
  }[] = [];
  let extrasPagavel = 0;
  for (const id of extrasIds) {
    const servico = servsExtra.find((s) => s.id === id);
    if (!servico) return { error: "Serviço não encontrado." };
    const coberto = base.clienteId
      ? await servicoCobertoPorPlano(base.clienteId, servico.id, dataYmd, base.dataHora)
      : false;
    if (!coberto) extrasPagavel += Number(servico.preco);
    linhasExtra.push({
      clienteId: base.clienteId,
      clienteAvulso: base.clienteAvulso,
      barbeiroId: base.barbeiroId,
      servicoId: servico.id,
      dataHora: base.dataHora,
      valor: coberto ? "0" : servico.preco,
      tipo: coberto ? ("plano" as const) : ("avulso" as const),
      status: "finalizado" as const,
    });
  }

  const linhasProduto = produtosVendidos.map((p) => {
    const produto = produtosData.find((x) => x.id === p.produtoId)!;
    const unit = Number(produto.valor);
    return {
      produtoId: produto.id,
      quantidade: p.quantidade,
      valorUnitario: unit.toFixed(2),
      total: (unit * p.quantidade).toFixed(2),
      barbeiroId: base.barbeiroId,
      clienteId: base.clienteId,
      clienteAvulso: base.clienteAvulso,
      metodoPagamento: metodo,
    };
  });

  // Valor a receber no balcão: bloco presencial avulso + extras avulsos + produtos.
  const blocoPagavel = linhasBloco
    .filter((l) => l.tipo !== "plano" && l.formaPagamento !== "online")
    .reduce((s, l) => s + Number(l.valor), 0);
  const produtosTotal = linhasProduto.reduce((s, l) => s + Number(l.total), 0);
  const totalReceber = blocoPagavel + extrasPagavel + produtosTotal;
  if (totalReceber > 0 && !metodo) {
    return { error: "Selecione o método de pagamento." };
  }

  // Se vai adicionar extras a um bloco de serviço único, cria um grupo para mantê-los juntos.
  const novoGrupoId = !base.grupoId && linhasExtra.length > 0 ? crypto.randomUUID() : null;
  const grupoId = base.grupoId ?? novoGrupoId;

  try {
    await db.transaction(async (tx) => {
      if (novoGrupoId) {
        await tx.update(agendamentos).set({ grupoId: novoGrupoId }).where(inArray(agendamentos.id, ids));
      }
      await tx.update(agendamentos).set({ status: "finalizado" }).where(inArray(agendamentos.id, ids));
      if (metodo) {
        // Método só no presencial; o online já foi liquidado no cartão.
        await tx
          .update(agendamentos)
          .set({ metodoPagamento: metodo })
          .where(and(inArray(agendamentos.id, ids), eq(agendamentos.formaPagamento, "presencial")));
      }
      if (linhasExtra.length > 0) {
        await tx.insert(agendamentos).values(
          linhasExtra.map((l) => ({
            ...l,
            grupoId,
            metodoPagamento: l.tipo === "avulso" ? metodo : null,
          })),
        );
      }
      if (linhasProduto.length > 0) {
        await tx.insert(vendasProdutos).values(linhasProduto);
      }
    });
  } catch (err) {
    console.error("Falha ao finalizar atendimento:", err);
    return { error: "Não foi possível finalizar. Tente novamente." };
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/vendas");
  return {};
}

export async function cancelarAgendamentoAdmin(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const ids = await idsAlvo(id);
  if (ids.length === 0) return {};

  const [ag] = await db
    .select({ pagamentoStatus: agendamentos.pagamentoStatus })
    .from(agendamentos)
    .where(eq(agendamentos.id, id));

  // Se foi pago online, cancelar implica estornar: reflete como estornado.
  if (ag?.pagamentoStatus === "pago") {
    try {
      await estornarAgendamento(ids);
    } catch (e) {
      console.error("Falha ao estornar no cancelamento (admin):", e);
      return { error: "Não foi possível estornar o pagamento. Tente novamente." };
    }
  } else {
    await db.update(agendamentos).set({ status: "cancelado" }).where(inArray(agendamentos.id, ids));
  }
  revalidatePath("/admin/agenda");
  return {};
}

/**
 * Estorna um atendimento: online chama o refund do MP; presencial só registra a
 * devolução. Serve para devolver dinheiro de um atendimento já finalizado ou pago.
 */
export async function estornarAgendamentoAdmin(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const ids = await idsAlvo(id);
  if (ids.length === 0) return {};
  try {
    await estornarAgendamento(ids);
  } catch (e) {
    console.error("Falha ao estornar atendimento:", e);
    return { error: "Não foi possível estornar no Mercado Pago. Tente novamente." };
  }
  revalidatePath("/admin/agenda");
  return {};
}

export async function excluirAgendamento(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const ids = await idsAlvo(id);
  if (ids.length === 0) return {};
  await db.delete(agendamentos).where(inArray(agendamentos.id, ids));
  revalidatePath("/admin/agenda");
  return {};
}

export interface NovoAtendimentoResult {
  ok?: boolean;
  error?: string;
}

/** Cria um atendimento pelo admin para um cliente, com um ou mais serviços em sequência. */
export async function criarAtendimentoAdmin(input: {
  barbeiroId: string;
  clienteId?: string;
  clienteAvulso?: string;
  servicoIds: string[];
  data: string;
  hora: string;
}): Promise<NovoAtendimentoResult> {
  await requireAdmin();
  const { barbeiroId, servicoIds, data, hora } = input;
  const clienteId = input.clienteId || null;
  const clienteAvulso = clienteId ? null : input.clienteAvulso?.trim() || null;

  if (!barbeiroId) return { error: "Selecione o profissional." };
  if (servicoIds.length === 0) return { error: "Selecione ao menos um serviço." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) {
    return { error: "Data ou horário inválidos." };
  }

  const servs = await db.select().from(servicos).where(inArray(servicos.id, servicoIds));
  const ordenados = servicoIds.map((id) => servs.find((s) => s.id === id));
  if (ordenados.some((s) => !s)) return { error: "Serviço não encontrado." };
  const servicosOrdenados = ordenados as (typeof servs)[number][];

  const duracaoTotal = servicosOrdenados.reduce((soma, s) => soma + s.duracaoMinutos, 0);
  const inicioBloco = instanteSlot(data, hora);
  const fimBloco = new Date(inicioBloco.getTime() + duracaoTotal * 60_000);

  // Conflito: bloco não pode sobrepor outro atendimento do barbeiro no dia.
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
  const colide = existentes.some((e) => {
    const oInicio = new Date(e.dataHora);
    const oFim = new Date(oInicio.getTime() + e.duracao * 60_000);
    return inicioBloco < oFim && oInicio < fimBloco;
  });
  if (colide) return { error: "Esse horário conflita com outro atendimento do profissional." };

  const grupoId = servicosOrdenados.length > 1 ? crypto.randomUUID() : null;
  const linhas = [];
  let offset = 0;
  for (const servico of servicosOrdenados) {
    const inicio = new Date(inicioBloco.getTime() + offset * 60_000);
    const coberto = clienteId
      ? await servicoCobertoPorPlano(clienteId, servico.id, data, inicio)
      : false;
    linhas.push({
      clienteId,
      clienteAvulso,
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
    console.error("Falha ao criar atendimento:", err);
    return { error: "Não foi possível criar. Tente novamente." };
  }

  revalidatePath("/admin/agenda");
  return { ok: true };
}
