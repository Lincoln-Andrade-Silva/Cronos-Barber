import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { barbeiros, produtos, servicos } from "@/db/schema";
import { PageHeader, UrlTabBar, type TabItem } from "@/components/ui";
import { PAGE_SIZE, offsetDaPagina, parsePagina, totalPaginas } from "@/lib/pagination";
import { BarbeirosClient } from "@/features/barbeiros/barbeiros-client";
import { ServicosClient } from "@/features/servicos/servicos-client";
import { ProdutosClient } from "@/features/produtos/produtos-client";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "barbeiros", label: "Barbeiros", ready: true },
  { key: "servicos", label: "Serviços", ready: true },
  { key: "produtos", label: "Produtos", ready: true },
] as const satisfies readonly TabItem[];

export default async function CadastrosPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string; status?: string };
}) {
  const tab = searchParams.tab ?? "barbeiros";
  const pagina = parsePagina(searchParams.page);
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "todos";
  const offset = offsetDaPagina(pagina);

  let conteudo: React.ReactNode = null;

  if (tab === "servicos") {
    const cond: SQL[] = [];
    if (q) cond.push(ilike(servicos.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(servicos.ativo, true));
    if (status === "inativos") cond.push(eq(servicos.ativo, false));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows] = await Promise.all([
      db.select({ n: count() }).from(servicos).where(where),
      db.select().from(servicos).where(where).orderBy(asc(servicos.nome)).limit(PAGE_SIZE).offset(offset),
    ]);
    conteudo = (
      <ServicosClient servicos={rows} page={pagina} pageCount={totalPaginas(total[0]?.n ?? 0)} />
    );
  } else if (tab === "produtos") {
    const cond: SQL[] = [];
    if (q) cond.push(ilike(produtos.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(produtos.status, "ativo"));
    if (status === "inativos") cond.push(eq(produtos.status, "inativo"));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows] = await Promise.all([
      db.select({ n: count() }).from(produtos).where(where),
      db.select().from(produtos).where(where).orderBy(asc(produtos.nome)).limit(PAGE_SIZE).offset(offset),
    ]);
    conteudo = (
      <ProdutosClient produtos={rows} page={pagina} pageCount={totalPaginas(total[0]?.n ?? 0)} />
    );
  } else {
    const cond: SQL[] = [];
    if (q) cond.push(ilike(barbeiros.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(barbeiros.ativo, true));
    if (status === "inativos") cond.push(eq(barbeiros.ativo, false));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows] = await Promise.all([
      db.select({ n: count() }).from(barbeiros).where(where),
      db.select().from(barbeiros).where(where).orderBy(asc(barbeiros.nome)).limit(PAGE_SIZE).offset(offset),
    ]);
    conteudo = (
      <BarbeirosClient barbeiros={rows} page={pagina} pageCount={totalPaginas(total[0]?.n ?? 0)} />
    );
  }

  return (
    <div>
      <PageHeader
        title="Cadastros"
        description="Barbeiros, serviços e produtos da barbearia."
      />
      <UrlTabBar tabs={TABS} defaultTab="barbeiros" />
      {conteudo}
    </div>
  );
}
