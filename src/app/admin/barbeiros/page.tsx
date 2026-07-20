import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { barbeiros } from "@/db/schema";
import { PageHeader, UrlTabBar, type TabItem } from "@/components/ui";
import { PAGE_SIZE, offsetDaPagina, parsePagina, totalPaginas } from "@/lib/pagination";
import { BarbeirosClient } from "@/features/barbeiros/barbeiros-client";
import { ComissaoForm } from "@/features/comissao/comissao-form";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "cadastro", label: "Cadastro", ready: true },
  { key: "expediente", label: "Expediente", ready: false },
  { key: "comissao", label: "Comissão", ready: true },
] as const satisfies readonly TabItem[];

export default async function BarbeirosPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string; status?: string };
}) {
  const tab = searchParams.tab ?? "cadastro";

  let conteudo: React.ReactNode = null;

  if (tab === "comissao") {
    const lista = await db.select().from(barbeiros).orderBy(asc(barbeiros.nome));
    conteudo = <ComissaoForm barbeiros={lista} />;
  } else {
    const pagina = parsePagina(searchParams.page);
    const q = searchParams.q?.trim() ?? "";
    const status = searchParams.status ?? "todos";
    const offset = offsetDaPagina(pagina);

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
      <PageHeader title="Barbeiros" description="Equipe, expediente e comissão dos profissionais." />
      <UrlTabBar tabs={TABS} defaultTab="cadastro" />
      {conteudo}
    </div>
  );
}
