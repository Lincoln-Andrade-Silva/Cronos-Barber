import { and, count, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, assinaturas, planos, planoServicos } from "@/db/schema";

function diaSemanaSP(data: string): number {
  return new Date(`${data}T12:00:00-03:00`).getDay();
}

function somarDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);
}

/**
 * Decide se um atendimento é coberto por uma assinatura ativa do cliente.
 * Considera: serviço incluso no plano, dia da semana válido, janela de validade
 * (dataInicio + diasValidade) e limite de usos no período (null = ilimitado).
 * Estourou qualquer condição = cobrado avulso.
 */
export async function servicoCobertoPorPlano(
  clienteId: string,
  servicoId: string,
  data: string,
  inicio: Date,
): Promise<boolean> {
  const dia = diaSemanaSP(data);

  const candidatos = await db
    .select({
      planoId: planos.id,
      dataInicio: assinaturas.dataInicio,
      diasValidade: planos.diasValidade,
      diasValidos: planos.diasValidos,
      limite: planoServicos.limite,
    })
    .from(assinaturas)
    .innerJoin(planos, eq(assinaturas.planoId, planos.id))
    .innerJoin(
      planoServicos,
      and(eq(planoServicos.planoId, planos.id), eq(planoServicos.servicoId, servicoId)),
    )
    .where(
      and(
        eq(assinaturas.clienteId, clienteId),
        eq(assinaturas.status, "ativo"),
        eq(planos.ativo, true),
      ),
    );

  for (const plano of candidatos) {
    if (inicio > somarDias(plano.dataInicio, plano.diasValidade)) continue;
    if (!plano.diasValidos.includes(dia)) continue;

    if (plano.limite !== null) {
      const [{ usados }] = await db
        .select({ usados: count() })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.clienteId, clienteId),
            eq(agendamentos.servicoId, servicoId),
            eq(agendamentos.tipo, "plano"),
            ne(agendamentos.status, "cancelado"),
            gte(agendamentos.dataHora, plano.dataInicio),
          ),
        );
      if (usados >= plano.limite) continue;
    }

    return true;
  }

  return false;
}

/**
 * Serviços atualmente inclusos em alguma assinatura ativa e válida do cliente
 * (dentro da validade e do limite). Ignora o dia da semana, que só é conhecido
 * ao escolher a data; serve para o indicador visual de "incluso no plano".
 */
export async function servicosCobertosDoCliente(clienteId: string): Promise<string[]> {
  const agora = new Date();

  const linhas = await db
    .select({
      servicoId: planoServicos.servicoId,
      dataInicio: assinaturas.dataInicio,
      diasValidade: planos.diasValidade,
      limite: planoServicos.limite,
    })
    .from(assinaturas)
    .innerJoin(planos, eq(assinaturas.planoId, planos.id))
    .innerJoin(planoServicos, eq(planoServicos.planoId, planos.id))
    .where(
      and(
        eq(assinaturas.clienteId, clienteId),
        eq(assinaturas.status, "ativo"),
        eq(planos.ativo, true),
      ),
    );

  const cobertos = new Set<string>();
  for (const linha of linhas) {
    if (cobertos.has(linha.servicoId)) continue;
    if (agora > somarDias(linha.dataInicio, linha.diasValidade)) continue;

    if (linha.limite !== null) {
      const [{ usados }] = await db
        .select({ usados: count() })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.clienteId, clienteId),
            eq(agendamentos.servicoId, linha.servicoId),
            eq(agendamentos.tipo, "plano"),
            ne(agendamentos.status, "cancelado"),
            gte(agendamentos.dataHora, linha.dataInicio),
          ),
        );
      if (usados >= linha.limite) continue;
    }

    cobertos.add(linha.servicoId);
  }

  return [...cobertos];
}
