import { and, desc, eq, gte, lt } from "drizzle-orm";
import { Boxes, PackageOpen, Receipt, Scissors, ShoppingBag, ShoppingCart } from "lucide-react";
import { db } from "@/db";
import { barbeiros, produtos, profiles, vendasProdutos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { diaCurto, gerarDias, spYmd } from "./datas";
import { RankingExpansivel } from "./ranking-expansivel";
import { GraficoBarras, KpiGrid, Ranking, Secao, Tabela } from "./ui";

const LIMITE_DETALHE = 100;

export async function PainelProdutos({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const vendas = await db
    .select({
      dataHora: vendasProdutos.dataHora,
      produtoNome: produtos.nome,
      barbeiroId: vendasProdutos.barbeiroId,
      barbeiroNome: barbeiros.nome,
      barbeiroFoto: barbeiros.fotoUrl,
      clienteNome: profiles.nome,
      clienteAvulso: vendasProdutos.clienteAvulso,
      quantidade: vendasProdutos.quantidade,
      total: vendasProdutos.total,
      agendamentoId: vendasProdutos.agendamentoId,
    })
    .from(vendasProdutos)
    .innerJoin(produtos, eq(vendasProdutos.produtoId, produtos.id))
    .innerJoin(barbeiros, eq(vendasProdutos.barbeiroId, barbeiros.id))
    .leftJoin(profiles, eq(vendasProdutos.clienteId, profiles.id))
    .where(and(gte(vendasProdutos.dataHora, inicio), lt(vendasProdutos.dataHora, fimExclusivo)))
    .orderBy(desc(vendasProdutos.dataHora));

  const faturamento = vendas.reduce((s, v) => s + Number(v.total), 0);
  const itens = vendas.reduce((s, v) => s + v.quantidade, 0);
  const ticket = vendas.length > 0 ? faturamento / vendas.length : 0;

  // Venda avulsa = fora de um atendimento (sem vínculo com agendamento).
  const vendasAvulsas = vendas.filter((v) => !v.agendamentoId);
  const fatAvulsas = vendasAvulsas.reduce((s, v) => s + Number(v.total), 0);
  const fatNoAtendimento = faturamento - fatAvulsas;

  const porProdutoAvulso = new Map<string, { qtd: number; total: number }>();
  for (const v of vendasAvulsas) {
    const p = porProdutoAvulso.get(v.produtoNome) ?? { qtd: 0, total: 0 };
    p.qtd += v.quantidade;
    p.total += Number(v.total);
    porProdutoAvulso.set(v.produtoNome, p);
  }
  const avulsosRank = [...porProdutoAvulso.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxAvulso = Math.max(1, ...avulsosRank.map(([, v]) => v.total));

  const dias = gerarDias(inicio, fimExclusivo);
  const porDia = new Map<string, number>(dias.map((d) => [d, 0]));
  for (const v of vendas) porDia.set(spYmd(v.dataHora), (porDia.get(spYmd(v.dataHora)) ?? 0) + Number(v.total));
  const serie = dias.map((dia) => ({ dia, valor: porDia.get(dia) ?? 0 }));

  const porProduto = new Map<string, { qtd: number; total: number }>();
  for (const v of vendas) {
    const p = porProduto.get(v.produtoNome) ?? { qtd: 0, total: 0 };
    p.qtd += v.quantidade;
    p.total += Number(v.total);
    porProduto.set(v.produtoNome, p);
  }
  const produtosRank = [...porProduto.entries()].sort((a, b) => b[1].qtd - a[1].qtd);
  const maxProduto = Math.max(1, ...produtosRank.map(([, v]) => v.qtd));

  const porBarbeiro = new Map<
    string,
    { id: string; nome: string; foto: string | null; total: number; produtos: Map<string, { qtd: number; total: number }> }
  >();
  for (const v of vendas) {
    const b =
      porBarbeiro.get(v.barbeiroId) ??
      { id: v.barbeiroId, nome: v.barbeiroNome, foto: v.barbeiroFoto, total: 0, produtos: new Map() };
    b.total += Number(v.total);
    const pr = b.produtos.get(v.produtoNome) ?? { qtd: 0, total: 0 };
    pr.qtd += v.quantidade;
    pr.total += Number(v.total);
    b.produtos.set(v.produtoNome, pr);
    porBarbeiro.set(v.barbeiroId, b);
  }
  const maxBarbeiro = Math.max(1, ...[...porBarbeiro.values()].map((v) => v.total));
  const barbeirosItens = [...porBarbeiro.values()]
    .sort((a, b) => b.total - a.total)
    .map((b) => ({
      id: b.id,
      nome: b.nome,
      foto: b.foto,
      destaque: formatBRL(b.total),
      proporcao: (b.total / maxBarbeiro) * 100,
      colValor: "Total",
      linhas: [...b.produtos.entries()]
        .sort((a, c) => c[1].qtd - a[1].qtd)
        .map(([nome, v]) => ({ nome, qtd: v.qtd, valor: formatBRL(v.total) })),
      totalValor: formatBRL(b.total),
    }));

  const detalhe = vendas.slice(0, LIMITE_DETALHE);

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Faturamento", valor: formatBRL(faturamento), icon: ShoppingBag },
          { label: "Itens vendidos", valor: String(itens), icon: Boxes },
          { label: "Nº de vendas", valor: String(vendas.length), icon: ShoppingCart },
          { label: "Ticket por venda", valor: formatBRL(ticket), icon: Receipt },
          {
            label: "Venda avulsa",
            valor: formatBRL(fatAvulsas),
            icon: PackageOpen,
            sub: `${vendasAvulsas.length} venda(s) fora de atendimento`,
          },
          { label: "No atendimento", valor: formatBRL(fatNoAtendimento), icon: Scissors },
        ]}
      />

      <Secao titulo="Vendas por dia">
        <GraficoBarras dados={serie} formato="moeda" />
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Produtos mais vendidos">
          <Ranking
            vazio="Nenhuma venda no período."
            itens={produtosRank.map(([nome, v]) => ({
              nome,
              destaque: `${v.qtd}x`,
              sub: formatBRL(v.total),
              proporcao: (v.qtd / maxProduto) * 100,
            }))}
          />
        </Secao>

        <Secao titulo="Vendas por profissional">
          <RankingExpansivel itens={barbeirosItens} vazio="Nenhuma venda no período." />
        </Secao>
      </div>

      <Secao titulo={`Produtos vendidos avulsos (fora de atendimento) - ${formatBRL(fatAvulsas)}`}>
        <Ranking
          vazio="Nenhuma venda avulsa no período."
          itens={avulsosRank.map(([nome, v]) => ({
            nome,
            destaque: `${v.qtd}x`,
            sub: formatBRL(v.total),
            proporcao: (v.total / maxAvulso) * 100,
          }))}
        />
      </Secao>

      <Secao titulo={`Vendas${vendas.length > LIMITE_DETALHE ? ` (${LIMITE_DETALHE} mais recentes)` : ""}`}>
        <Tabela
          cabecalho={["Profissional", "Produto", "Qtd", "Cliente", "Origem", "Data", "Total"]}
          avatars={detalhe.map((v) => v.barbeiroFoto)}
          linhas={detalhe.map((v) => [
            v.barbeiroNome,
            v.produtoNome,
            `${v.quantidade}x`,
            v.clienteNome ?? v.clienteAvulso ?? "-",
            v.agendamentoId ? "Atendimento" : "Avulsa",
            diaCurto(spYmd(v.dataHora)),
            formatBRL(v.total),
          ])}
          vazio="Nenhuma venda no período."
        />
      </Secao>
    </div>
  );
}
