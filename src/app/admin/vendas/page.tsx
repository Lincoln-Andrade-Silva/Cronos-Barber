import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { barbeiros, produtos, profiles, vendasProdutos } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { PAGE_SIZE, offsetDaPagina, parsePagina, totalPaginas } from "@/lib/pagination";
import { VendasClient } from "@/features/vendas/vendas-client";

export const dynamic = "force-dynamic";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; prof?: string };
}) {
  const pagina = parsePagina(searchParams.page);
  const q = searchParams.q?.trim() ?? "";
  const prof = searchParams.prof ?? "";

  const condicoes = [];
  if (q) condicoes.push(or(ilike(produtos.nome, `%${q}%`), ilike(profiles.nome, `%${q}%`)));
  if (prof) condicoes.push(eq(vendasProdutos.barbeiroId, prof));
  const where = condicoes.length ? and(...condicoes) : undefined;

  const [listaProdutos, listaBarbeiros, clientes, contagem, vendasRows] = await Promise.all([
    db
      .select({ id: produtos.id, nome: produtos.nome, valor: produtos.valor })
      .from(produtos)
      .where(eq(produtos.status, "ativo"))
      .orderBy(asc(produtos.nome)),
    db
      .select({ id: barbeiros.id, nome: barbeiros.nome, fotoUrl: barbeiros.fotoUrl })
      .from(barbeiros)
      .where(eq(barbeiros.ativo, true))
      .orderBy(asc(barbeiros.nome)),
    db
      .select({ id: profiles.id, nome: profiles.nome })
      .from(profiles)
      .where(eq(profiles.tipo, "cliente"))
      .orderBy(asc(profiles.nome)),
    db
      .select({ total: count() })
      .from(vendasProdutos)
      .innerJoin(produtos, eq(vendasProdutos.produtoId, produtos.id))
      .innerJoin(barbeiros, eq(vendasProdutos.barbeiroId, barbeiros.id))
      .leftJoin(profiles, eq(vendasProdutos.clienteId, profiles.id))
      .where(where),
    db
      .select({
        id: vendasProdutos.id,
        dataHora: vendasProdutos.dataHora,
        produtoNome: produtos.nome,
        quantidade: vendasProdutos.quantidade,
        valorUnitario: vendasProdutos.valorUnitario,
        total: vendasProdutos.total,
        barbeiroId: vendasProdutos.barbeiroId,
        barbeiroNome: barbeiros.nome,
        clienteNome: profiles.nome,
      })
      .from(vendasProdutos)
      .innerJoin(produtos, eq(vendasProdutos.produtoId, produtos.id))
      .innerJoin(barbeiros, eq(vendasProdutos.barbeiroId, barbeiros.id))
      .leftJoin(profiles, eq(vendasProdutos.clienteId, profiles.id))
      .where(where)
      .orderBy(desc(vendasProdutos.dataHora))
      .limit(PAGE_SIZE)
      .offset(offsetDaPagina(pagina)),
  ]);

  const vendas = vendasRows.map((v) => ({
    id: v.id,
    dataHoraISO: v.dataHora.toISOString(),
    produtoNome: v.produtoNome,
    quantidade: v.quantidade,
    valorUnitario: v.valorUnitario,
    total: v.total,
    barbeiroId: v.barbeiroId,
    barbeiroNome: v.barbeiroNome,
    clienteNome: v.clienteNome,
  }));

  return (
    <div>
      <PageHeader title="Vendas" description="Registre e gerencie as vendas de produtos." />
      <VendasClient
        vendas={vendas}
        page={pagina}
        pageCount={totalPaginas(contagem[0]?.total ?? 0)}
        produtos={listaProdutos}
        barbeiros={listaBarbeiros}
        clientes={clientes}
      />
    </div>
  );
}
