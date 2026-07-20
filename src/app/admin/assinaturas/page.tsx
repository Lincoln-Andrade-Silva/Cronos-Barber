import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas, planoServicos, planos, profiles, servicos } from "@/db/schema";
import { PageHeader, UrlTabBar, type TabItem } from "@/components/ui";
import { PAGE_SIZE, offsetDaPagina, parsePagina, totalPaginas } from "@/lib/pagination";
import { AssinantesClient } from "@/features/assinaturas/assinantes-client";
import { PlanosClient } from "@/features/planos/planos-client";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "assinantes", label: "Clientes Assinantes", ready: true },
  { key: "planos", label: "Planos", ready: true },
] as const satisfies readonly TabItem[];

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string; status?: string };
}) {
  const tab = searchParams.tab ?? "assinantes";
  const pagina = parsePagina(searchParams.page);
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "todos";
  const offset = offsetDaPagina(pagina);

  let conteudo: React.ReactNode = null;

  if (tab === "planos") {
    const cond: (SQL | undefined)[] = [];
    if (q) cond.push(ilike(planos.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(planos.ativo, true));
    if (status === "inativos") cond.push(eq(planos.ativo, false));
    const where = cond.length ? and(...cond) : undefined;

    const [total, listaPlanos, listaServicos] = await Promise.all([
      db.select({ n: count() }).from(planos).where(where),
      db.select().from(planos).where(where).orderBy(asc(planos.nome)).limit(PAGE_SIZE).offset(offset),
      db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(asc(servicos.nome)),
    ]);

    const ids = listaPlanos.map((p) => p.id);
    const vinculos = ids.length
      ? await db.select().from(planoServicos).where(inArray(planoServicos.planoId, ids))
      : [];

    const planosCompletos = listaPlanos.map((p) => ({
      id: p.id,
      nome: p.nome,
      valor: p.valor,
      diasValidade: p.diasValidade,
      diasValidos: p.diasValidos,
      ativo: p.ativo,
      servicos: vinculos
        .filter((v) => v.planoId === p.id)
        .map((v) => ({ servicoId: v.servicoId, limite: v.limite })),
    }));

    conteudo = (
      <PlanosClient
        planos={planosCompletos}
        servicos={listaServicos}
        page={pagina}
        pageCount={totalPaginas(total[0]?.n ?? 0)}
      />
    );
  } else {
    const cond: (SQL | undefined)[] = [];
    if (q) cond.push(or(ilike(profiles.nome, `%${q}%`), ilike(profiles.email, `%${q}%`)));
    if (status === "ativos") cond.push(eq(assinaturas.status, "ativo"));
    if (status === "inativos") cond.push(eq(assinaturas.status, "inativo"));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows, clientes, opcoesPlanos] = await Promise.all([
      db
        .select({ n: count() })
        .from(assinaturas)
        .innerJoin(profiles, eq(assinaturas.clienteId, profiles.id))
        .innerJoin(planos, eq(assinaturas.planoId, planos.id))
        .where(where),
      db
        .select({
          id: assinaturas.id,
          clienteId: assinaturas.clienteId,
          clienteNome: profiles.nome,
          clienteEmail: profiles.email,
          dataInicio: assinaturas.dataInicio,
          planoId: assinaturas.planoId,
          planoNome: planos.nome,
          status: assinaturas.status,
        })
        .from(assinaturas)
        .innerJoin(profiles, eq(assinaturas.clienteId, profiles.id))
        .innerJoin(planos, eq(assinaturas.planoId, planos.id))
        .where(where)
        .orderBy(desc(assinaturas.dataInicio))
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ id: profiles.id, nome: profiles.nome })
        .from(profiles)
        .where(eq(profiles.tipo, "cliente"))
        .orderBy(asc(profiles.nome)),
      db
        .select({ id: planos.id, nome: planos.nome })
        .from(planos)
        .where(eq(planos.ativo, true))
        .orderBy(asc(planos.nome)),
    ]);

    const assinantes = rows.map((r) => ({
      id: r.id,
      clienteId: r.clienteId,
      clienteNome: r.clienteNome,
      clienteEmail: r.clienteEmail,
      dataInicioISO: r.dataInicio.toISOString(),
      planoId: r.planoId,
      planoNome: r.planoNome,
      status: r.status,
    }));

    conteudo = (
      <AssinantesClient
        assinaturas={assinantes}
        clientes={clientes}
        planos={opcoesPlanos}
        page={pagina}
        pageCount={totalPaginas(total[0]?.n ?? 0)}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Assinaturas" description="Clientes assinantes e planos da barbearia." />
      <UrlTabBar tabs={TABS} defaultTab="assinantes" />
      {conteudo}
    </div>
  );
}
