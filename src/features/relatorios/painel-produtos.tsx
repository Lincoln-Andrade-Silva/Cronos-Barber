import { and, desc, eq, gte, lt } from "drizzle-orm";
import { Boxes, Receipt, ShoppingBag, ShoppingCart } from "lucide-react";
import { db } from "@/db";
import { barbeiros, produtos, profiles, vendasProdutos } from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { diaCurto, gerarDias, spYmd } from "./datas";
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
      quantidade: vendasProdutos.quantidade,
      total: vendasProdutos.total,
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

  const porBarbeiro = new Map<string, { nome: string; foto: string | null; total: number }>();
  for (const v of vendas) {
    const b = porBarbeiro.get(v.barbeiroId) ?? { nome: v.barbeiroNome, foto: v.barbeiroFoto, total: 0 };
    b.total += Number(v.total);
    porBarbeiro.set(v.barbeiroId, b);
  }
  const barbeirosRank = [...porBarbeiro.values()].sort((a, b) => b.total - a.total);
  const maxBarbeiro = Math.max(1, ...barbeirosRank.map((v) => v.total));

  const detalhe = vendas.slice(0, LIMITE_DETALHE);

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Faturamento", valor: formatBRL(faturamento), icon: ShoppingBag },
          { label: "Itens vendidos", valor: String(itens), icon: Boxes },
          { label: "Nº de vendas", valor: String(vendas.length), icon: ShoppingCart },
          { label: "Ticket por venda", valor: formatBRL(ticket), icon: Receipt },
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
          <Ranking
            vazio="Nenhuma venda no período."
            itens={barbeirosRank.map((b) => ({
              nome: b.nome,
              avatarUrl: b.foto,
              destaque: formatBRL(b.total),
              proporcao: (b.total / maxBarbeiro) * 100,
            }))}
          />
        </Secao>
      </div>

      <Secao titulo={`Vendas${vendas.length > LIMITE_DETALHE ? ` (${LIMITE_DETALHE} mais recentes)` : ""}`}>
        <Tabela
          cabecalho={["Profissional", "Produto", "Qtd", "Cliente", "Data", "Total"]}
          avatars={detalhe.map((v) => v.barbeiroFoto)}
          linhas={detalhe.map((v) => [
            v.barbeiroNome,
            v.produtoNome,
            `${v.quantidade}x`,
            v.clienteNome ?? "-",
            diaCurto(spYmd(v.dataHora)),
            formatBRL(v.total),
          ])}
          vazio="Nenhuma venda no período."
        />
      </Secao>
    </div>
  );
}
