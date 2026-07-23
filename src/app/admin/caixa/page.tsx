import { and, desc, eq, gte, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { db } from "@/db";
import { agendamentos, assinaturas, movimentacoesCaixa, planos, profiles, vendasProdutos } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { instanteSlot } from "@/lib/disponibilidade";
import { formatBRL } from "@/lib/format";
import { diasAtras, hojeSP } from "@/features/relatorios/datas";
import { PeriodoNav } from "@/features/relatorios/periodo-nav";
import { KpiGrid, Secao, Tabela } from "@/features/relatorios/ui";
import { MovimentacoesClient, type MovimentacaoRow } from "@/features/caixa/movimentacoes-client";
import type { TipoMovimentacao } from "@/features/caixa/categorias";

export const dynamic = "force-dynamic";

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string };
}) {
  const ate = searchParams.ate ?? hojeSP();
  const de = searchParams.de ?? diasAtras(ate, 29);
  const inicio = instanteSlot(de, "00:00");
  const fimExclusivo = new Date(instanteSlot(ate, "00:00").getTime() + 24 * 60 * 60 * 1000);

  const autor = alias(profiles, "autor");

  const [servicosRows, produtosRows, assinaturasRows, estornosRows, manuaisRows] = await Promise.all([
    db
      .select({ valor: agendamentos.valor })
      .from(agendamentos)
      .where(
        and(
          eq(agendamentos.status, "finalizado"),
          gte(agendamentos.dataHora, inicio),
          lt(agendamentos.dataHora, fimExclusivo),
        ),
      ),
    db
      .select({ total: vendasProdutos.total })
      .from(vendasProdutos)
      .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo))),
    db
      .select({ valor: planos.valor })
      .from(assinaturas)
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(
        and(
          eq(assinaturas.gratuito, false),
          gte(assinaturas.dataInicio, inicio),
          lt(assinaturas.dataInicio, fimExclusivo),
        ),
      ),
    db
      .select({ valor: agendamentos.valor })
      .from(agendamentos)
      .where(
        and(
          eq(agendamentos.status, "estornado"),
          gte(agendamentos.dataHora, inicio),
          lt(agendamentos.dataHora, fimExclusivo),
        ),
      ),
    db
      .select({
        id: movimentacoesCaixa.id,
        tipo: movimentacoesCaixa.tipo,
        categoria: movimentacoesCaixa.categoria,
        descricao: movimentacoesCaixa.descricao,
        valor: movimentacoesCaixa.valor,
        data: movimentacoesCaixa.data,
        criadoPorNome: autor.nome,
      })
      .from(movimentacoesCaixa)
      .leftJoin(autor, eq(movimentacoesCaixa.criadoPorId, autor.id))
      .where(and(gte(movimentacoesCaixa.data, inicio), lt(movimentacoesCaixa.data, fimExclusivo)))
      .orderBy(desc(movimentacoesCaixa.data)),
  ]);

  const fatServicos = servicosRows.reduce((s, r) => s + Number(r.valor), 0);
  const fatProdutos = produtosRows.reduce((s, r) => s + Number(r.total), 0);
  const fatAssinaturas = assinaturasRows.reduce((s, r) => s + Number(r.valor), 0);
  const estornos = estornosRows.reduce((s, r) => s + Number(r.valor), 0);

  const manuais: MovimentacaoRow[] = manuaisRows.map((m) => ({
    id: m.id,
    tipo: m.tipo as TipoMovimentacao,
    categoria: m.categoria,
    descricao: m.descricao,
    valor: m.valor,
    dataISO: m.data.toISOString(),
    criadoPorNome: m.criadoPorNome ?? null,
  }));

  const entradaManual = manuais
    .filter((m) => m.tipo === "entrada")
    .reduce((s, m) => s + Number(m.valor), 0);
  const saidaManual = manuais
    .filter((m) => m.tipo === "saida")
    .reduce((s, m) => s + Number(m.valor), 0);

  const entradaAuto = fatServicos + fatProdutos + fatAssinaturas;
  const entradas = entradaAuto + entradaManual;
  const saidas = estornos + saidaManual;
  const saldo = entradas - saidas;

  return (
    <div>
      <PageHeader title="Fluxo de caixa" description="Entradas e saídas do estabelecimento no período." />

      <div className="mb-6">
        <PeriodoNav de={de} ate={ate} />
      </div>

      <div className="mb-6">
        <KpiGrid
          cards={[
            { label: "Entradas", valor: formatBRL(entradas), icon: ArrowUpCircle },
            { label: "Saídas", valor: formatBRL(saidas), icon: ArrowDownCircle },
            { label: "Saldo", valor: formatBRL(saldo), icon: Wallet },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Secao titulo="Entradas automáticas">
          <Tabela
            cabecalho={["Origem", "Valor"]}
            linhas={[
              ["Serviços finalizados", formatBRL(fatServicos)],
              ["Produtos vendidos", formatBRL(fatProdutos)],
              ["Assinaturas iniciadas", formatBRL(fatAssinaturas)],
              ["Total", formatBRL(entradaAuto)],
            ]}
            vazio="Sem entradas automáticas no período."
          />
        </Secao>

        <Secao titulo="Saídas automáticas">
          <Tabela
            cabecalho={["Origem", "Valor"]}
            linhas={estornos > 0 ? [["Estornos / reembolsos", formatBRL(estornos)]] : []}
            vazio="Sem saídas automáticas no período."
          />
        </Secao>
      </div>

      <MovimentacoesClient movimentacoes={manuais} />
    </div>
  );
}
